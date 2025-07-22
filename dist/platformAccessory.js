import TuyAPI from 'tuyapi';
import { isValidDeviceStatus } from './types/tuya.js';
export class TuyaAccessory {
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        this.isConnected = false;
        this.connectionRetries = 0;
        this.maxRetries = 3;
        const deviceInfo = accessory.context.device;
        // Initialize Tuya device
        this.device = new TuyAPI({
            id: deviceInfo.id,
            ip: deviceInfo.ip,
            key: deviceInfo.key,
            version: 3.3,
        });
        this.connect();
        // Set up event listeners
        this.device.on('connected', () => {
            this.platform.log.debug(`Device ${this.accessory.displayName} connected`);
            this.isConnected = true;
            this.connectionRetries = 0;
        });
        this.device.on('disconnected', () => {
            this.platform.log.debug(`Device ${this.accessory.displayName} disconnected`);
            this.isConnected = false;
            this.scheduleReconnect();
        });
        this.device.on('data', (data) => {
            if (isValidDeviceStatus(data)) {
                this.updateCharacteristics(data);
            }
        });
        this.startPolling();
        // Set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Designers Fountain')
            .setCharacteristic(this.platform.Characteristic.Model, 'Ceiling Fan DF')
            .setCharacteristic(this.platform.Characteristic.SerialNumber, deviceInfo.id);
        // Fan service
        this.fanService = this.accessory.getService(this.platform.Service.Fanv2) ||
            this.accessory.addService(this.platform.Service.Fanv2);
        // Light service
        this.lightService = this.accessory.getService(this.platform.Service.Lightbulb) ||
            this.accessory.addService(this.platform.Service.Lightbulb);
        // Set service names
        this.fanService.setCharacteristic(this.platform.Characteristic.Name, deviceInfo.name + ' Fan');
        this.lightService.setCharacteristic(this.platform.Characteristic.Name, deviceInfo.name + ' Light');
        // Fan characteristics
        this.fanService.getCharacteristic(this.platform.Characteristic.Active)
            .onSet(this.setFanActive.bind(this))
            .onGet(this.getFanActive.bind(this));
        this.fanService.getCharacteristic(this.platform.Characteristic.RotationSpeed)
            .onSet(this.setFanSpeed.bind(this))
            .onGet(this.getFanSpeed.bind(this));
        // Light characteristics
        this.lightService.getCharacteristic(this.platform.Characteristic.On)
            .onSet(this.setLightOn.bind(this))
            .onGet(this.getLightOn.bind(this));
        this.lightService.getCharacteristic(this.platform.Characteristic.Brightness)
            .onSet(this.setLightBrightness.bind(this))
            .onGet(this.getLightBrightness.bind(this));
    }
    handleError(error, operation) {
        if (error.message.includes('timeout')) {
            this.platform.log.error(`Timeout during ${operation} for ${this.accessory.displayName}`);
            return new this.platform.api.hap.HapStatusError(-70408 /* this.platform.api.hap.HAPStatus.OPERATION_TIMED_OUT */);
        }
        if (error.message.includes('ECONNREFUSED')) {
            this.platform.log.error(`Device offline during ${operation} for ${this.accessory.displayName}`);
            return new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        if (error.message.includes('Invalid device status')) {
            this.platform.log.error(`Invalid response during ${operation} for ${this.accessory.displayName}`);
            return new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
        }
        // Default
        this.platform.log.error(`Unknown error during ${operation} for ${this.accessory.displayName}:`, error);
        return new this.platform.api.hap.HapStatusError(-70402 /* this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE */);
    }
    startPolling() {
        const interval = this.platform.config.pollingInterval || 30;
        this.pollingInterval = setInterval(async () => {
            if (this.isConnected) {
                try {
                    const status = await this.device.get({ schema: true });
                    if (isValidDeviceStatus(status)) {
                        this.updateCharacteristics(status);
                    }
                }
                catch (error) {
                    const operation = 'polling';
                    this.platform.log.debug(`Error during ${operation}:`, error);
                }
            }
        }, interval * 1000);
    }
    updateCharacteristics(data) {
        if (data.dps['51'] !== undefined) {
            this.fanService.updateCharacteristic(this.platform.Characteristic.Active, data.dps['51'] === true ? 1 : 0);
        }
        if (data.dps['53'] !== undefined) {
            const speed = ((data.dps['53'] - 1) / 5) * 100;
            this.fanService.updateCharacteristic(this.platform.Characteristic.RotationSpeed, speed);
        }
        if (data.dps['20'] !== undefined) {
            this.lightService.updateCharacteristic(this.platform.Characteristic.On, data.dps['20']);
        }
        if (data.dps['22'] !== undefined) {
            const brightness = ((data.dps['22'] - 10) / 990) * 100;
            this.lightService.updateCharacteristic(this.platform.Characteristic.Brightness, brightness);
        }
    }
    async connect() {
        if (this.isConnected) {
            return;
        }
        try {
            await this.device.connect();
            this.isConnected = true;
            this.connectionRetries = 0;
        }
        catch (error) {
            this.platform.log.error(`Failed to connect to ${this.accessory.displayName}:`, error);
            this.scheduleReconnect();
        }
    }
    scheduleReconnect() {
        if (this.connectionRetries < this.maxRetries) {
            const delay = Math.pow(2, this.connectionRetries) * 1000; // Exponential backoff
            this.connectionRetries++;
            setTimeout(() => this.connect(), delay);
        }
    }
    destroy() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }
        this.device.removeAllListeners();
        if (this.isConnected) {
            this.device.disconnect();
        }
    }
    // Fan control methods
    async setFanActive(value) {
        try {
            await this.device.set({ dps: 51, set: value === 1 });
            this.platform.log.debug('Set Fan Active ->', value);
        }
        catch (error) {
            const operation = 'fan state set';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
    async getFanActive() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const response = await this.device.get({ schema: true });
            if (!isValidDeviceStatus(response)) {
                throw new Error('Invalid device status');
            }
            const isActive = response.dps['51'] === true ? 1 : 0;
            this.platform.log.debug('Get Fan Active ->', isActive);
            return isActive;
        }
        catch (error) {
            const operation = 'fan state get';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
    async setFanSpeed(value) {
        try {
            // Convert 0-100 to 1-6 range
            const speed = Math.round((value / 100) * 5) + 1;
            await this.device.set({ dps: 53, set: speed });
            this.platform.log.debug('Set Fan Speed ->', value, 'Tuya Speed ->', speed);
        }
        catch (error) {
            const operation = 'fan speed set';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
    async getFanSpeed() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const response = await this.device.get({ schema: true });
            if (!isValidDeviceStatus(response)) {
                throw new Error('Invalid device status');
            }
            // Convert 1-6 range to 0-100
            const speed = response.dps['53'] !== undefined ? ((response.dps['53'] - 1) / 5) * 100 : 0;
            this.platform.log.debug('Get Fan Speed ->', speed);
            return speed;
        }
        catch (error) {
            const operation = 'fan speed get';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
    // Light control methods
    async setLightOn(value) {
        try {
            await this.device.set({ dps: 20, set: value });
            this.platform.log.debug('Set Light On ->', value);
        }
        catch (error) {
            const operation = 'light state set';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
    async getLightOn() {
        var _a;
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const response = await this.device.get({ schema: true });
            if (!isValidDeviceStatus(response)) {
                throw new Error('Invalid device status');
            }
            const isOn = (_a = response.dps['20']) !== null && _a !== void 0 ? _a : false;
            this.platform.log.debug('Get Light On ->', isOn);
            return isOn;
        }
        catch (error) {
            const operation = 'light state get';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
    async setLightBrightness(value) {
        try {
            // Convert 0-100 to 10-1000 range
            const brightness = Math.round((value / 100) * 990) + 10;
            await this.device.set({ dps: 22, set: brightness });
            this.platform.log.debug('Set Light Brightness ->', value, 'Tuya Brightness ->', brightness);
        }
        catch (error) {
            const operation = 'light brightness set';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
    async getLightBrightness() {
        try {
            if (!this.isConnected) {
                await this.connect();
            }
            const response = await this.device.get({ schema: true });
            if (!isValidDeviceStatus(response)) {
                throw new Error('Invalid device status');
            }
            // Convert 10-1000 range to 0-100
            const brightness = response.dps['22'] !== undefined ? ((response.dps['22'] - 10) / 990) * 100 : 0;
            this.platform.log.debug('Get Light Brightness ->', brightness);
            return brightness;
        }
        catch (error) {
            const operation = 'light brightness get';
            this.platform.log.error(`Error during ${operation}:`, error);
            throw this.handleError(error, operation);
        }
    }
}
//# sourceMappingURL=platformAccessory.js.map