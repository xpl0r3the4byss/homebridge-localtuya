import TuyAPI from 'tuyapi';
function isValidResponse(response) {
    if (!response || typeof response !== 'object') {
        return false;
    }
    const dps = response.dps;
    if (!dps || typeof dps !== 'object') {
        return false;
    }
    // Check if any of our expected properties exist
    return '51' in dps || '53' in dps || '20' in dps || '22' in dps;
}
function parseDpsValue(dps, key, defaultValue) {
    if (!(key in dps)) {
        return defaultValue;
    }
    const value = dps[key];
    switch (key) {
        case '51': // Fan active
        case '20': // Light on
            return value === true;
        case '53': // Fan speed
            return typeof value === 'number' ? Math.max(1, Math.min(6, value)) : 1;
        case '22': // Light brightness
            return typeof value === 'number' ? Math.max(10, Math.min(1000, value)) : 10;
        default:
            return defaultValue;
    }
}
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY = 5000; // 5 seconds initial delay
const REFRESH_INTERVAL = 10000; // 10 seconds between refreshes
const MAX_RETRY_DELAY = 300000; // 5 minutes maximum retry delay
const OPERATION_TIMEOUT = 1000; // 1 second timeout for device operations
export class TuyaAccessory {
    platform;
    accessory;
    fanService;
    lightService;
    device;
    state = {
        fanActive: false,
        fanSpeed: 0,
        lightOn: false,
        lightBrightness: 0,
        lastUpdate: 0,
        isOnline: true,
        retryCount: 0
    };
    cacheTimeout = 500; // Cache timeout in milliseconds
    refreshInterval;
    retryTimeout = null;
    constructor(platform, accessory) {
        this.platform = platform;
        this.accessory = accessory;
        const deviceInfo = accessory.context.device;
        // Initialize Tuya device
        this.device = new TuyAPI({
            id: deviceInfo.id,
            ip: deviceInfo.ip,
            key: deviceInfo.key,
            version: 3.3,
        });
        // Set up event handlers
        this.device.on('error', this.handleDeviceError.bind(this));
        this.device.on('connected', this.handleDeviceConnected.bind(this));
        this.device.on('disconnected', this.handleDeviceDisconnected.bind(this));
        // Start periodic state refresh
        this.refreshInterval = setInterval(this.refreshState.bind(this), REFRESH_INTERVAL);
        // Set up status reporting characteristic
        this.accessory.getService(this.platform.Service.AccessoryInformation)
            .addCharacteristic(this.platform.Characteristic.StatusActive)
            .onGet(() => this.state.isOnline);
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
    // Fan control methods
    async setFanActive(value) {
        try {
            await this.safeDeviceOperation(async () => {
                await this.device.set({ dps: 51, set: value === 1 }); // Toggle fan
                this.state.fanActive = value === 1;
                this.state.lastUpdate = Date.now();
                this.platform.log.debug('Set Fan Active ->', value);
            }, undefined);
        }
        catch (error) {
            // Update state anyway to maintain consistency with HomeKit
            this.state.fanActive = value === 1;
            throw error;
        }
    }
    async getFanActive() {
        // Always check cache first
        if (this.isCacheValid() || !this.state.isOnline) {
            return this.state.fanActive ? 1 : 0;
        }
        const result = await this.safeDeviceOperation(async () => {
            await this.refreshState();
            return this.state.fanActive ? 1 : 0;
        }, this.state.fanActive ? 1 : 0);
        return result;
    }
    async setFanSpeed(value) {
        try {
            await this.safeDeviceOperation(async () => {
                // Convert 0-100 to 1-6 range
                const speed = Math.round((value / 100) * 5) + 1;
                await this.device.set({ dps: 53, set: speed }); // Set fan speed
                this.state.fanSpeed = value;
                this.state.lastUpdate = Date.now();
                this.platform.log.debug('Set Fan Speed ->', value, 'Tuya Speed ->', speed);
            }, undefined);
        }
        catch (error) {
            // Update state anyway to maintain consistency with HomeKit
            this.state.fanSpeed = value;
            throw error;
        }
    }
    async getFanSpeed() {
        // Always check cache first
        if (this.isCacheValid() || !this.state.isOnline) {
            return this.state.fanSpeed;
        }
        const result = await this.safeDeviceOperation(async () => {
            await this.refreshState();
            return this.state.fanSpeed;
        }, this.state.fanSpeed);
        return result;
    }
    // Light control methods
    async setLightOn(value) {
        try {
            await this.safeDeviceOperation(async () => {
                await this.device.set({ dps: 20, set: value }); // Toggle light
                this.state.lightOn = value;
                this.state.lastUpdate = Date.now();
                this.platform.log.debug('Set Light On ->', value);
            }, undefined);
        }
        catch (error) {
            // Update state anyway to maintain consistency with HomeKit
            this.state.lightOn = value;
            throw error;
        }
    }
    async getLightOn() {
        // Always check cache first
        if (this.isCacheValid() || !this.state.isOnline) {
            return this.state.lightOn;
        }
        const result = await this.safeDeviceOperation(async () => {
            await this.refreshState();
            return this.state.lightOn;
        }, this.state.lightOn);
        return result;
    }
    async setLightBrightness(value) {
        try {
            await this.safeDeviceOperation(async () => {
                // Convert 0-100 to 10-1000 range
                const brightness = Math.round((value / 100) * 990) + 10;
                await this.device.set({ dps: 22, set: brightness }); // Set brightness
                this.state.lightBrightness = value;
                this.state.lastUpdate = Date.now();
                this.platform.log.debug('Set Light Brightness ->', value, 'Tuya Brightness ->', brightness);
            }, undefined);
        }
        catch (error) {
            // Update state anyway to maintain consistency with HomeKit
            this.state.lightBrightness = value;
            throw error;
        }
    }
    async getLightBrightness() {
        // Always check cache first
        if (this.isCacheValid() || !this.state.isOnline) {
            return this.state.lightBrightness;
        }
        const result = await this.safeDeviceOperation(async () => {
            await this.refreshState();
            return this.state.lightBrightness;
        }, this.state.lightBrightness);
        return result;
    }
    handleDeviceError(error) {
        if (this.platform.config.debug || (!error.message.includes('EHOSTUNREACH') && !error.message.includes('ETIMEDOUT'))) {
            this.platform.log.error(`Device ${this.accessory.displayName} error:`, error.message);
        }
        if (error.message.includes('EHOSTUNREACH') || error.message.includes('ETIMEDOUT') || error.message.includes('ECONNREFUSED')) {
            this.handleDeviceDisconnected();
        }
    }
    handleDeviceConnected() {
        if (!this.state.isOnline) {
            this.platform.log.info(`Device ${this.accessory.displayName} is back online`);
            this.state.isOnline = true;
            this.state.retryCount = 0;
            // Update HomeKit status
            this.accessory.getService(this.platform.Service.AccessoryInformation)
                .updateCharacteristic(this.platform.Characteristic.StatusActive, true);
            if (this.retryTimeout) {
                clearTimeout(this.retryTimeout);
                this.retryTimeout = null;
            }
        }
    }
    handleDeviceDisconnected() {
        if (this.state.isOnline) {
            this.platform.log.warn(`Device ${this.accessory.displayName} is offline`);
            this.state.isOnline = false;
            // Update HomeKit status
            this.accessory.getService(this.platform.Service.AccessoryInformation)
                .updateCharacteristic(this.platform.Characteristic.StatusActive, false);
            this.scheduleRetry();
        }
    }
    isCacheValid() {
        return Date.now() - this.state.lastUpdate < this.cacheTimeout;
    }
    scheduleRetry() {
        if (this.state.retryCount >= MAX_RETRIES) {
            this.platform.log.warn(`Device ${this.accessory.displayName} offline - will retry in 5 minutes`);
            // Reset retry count and schedule a retry with maximum delay
            this.state.retryCount = 0;
            if (this.retryTimeout) {
                clearTimeout(this.retryTimeout);
            }
            this.retryTimeout = setTimeout(() => this.refreshState(), MAX_RETRY_DELAY);
            return;
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
        // Calculate exponential backoff delay
        const delay = Math.min(BASE_RETRY_DELAY * Math.pow(2, this.state.retryCount), MAX_RETRY_DELAY);
        this.retryTimeout = setTimeout(async () => {
            try {
                this.state.retryCount++;
                if (this.platform.config.debug) {
                    this.platform.log.debug(`Attempting to reconnect to ${this.accessory.displayName} (attempt ${this.state.retryCount})`);
                }
                await this.refreshState();
            }
            catch (error) {
                if (this.platform.config.debug) {
                    this.platform.log.debug(`Retry attempt ${this.state.retryCount} failed:`, error);
                }
                if (this.state.retryCount < MAX_RETRIES) {
                    this.scheduleRetry();
                }
            }
        }, delay);
    }
    async safeDeviceOperation(operation, defaultValue) {
        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Operation timed out'));
            }, OPERATION_TIMEOUT);
        });
        // If device is offline, return default value immediately
        if (!this.state.isOnline) {
            return defaultValue;
        }
        try {
            // Race between the operation and the timeout
            return await Promise.race([
                operation(),
                timeoutPromise
            ]);
        }
        catch (error) {
            this.platform.log.debug(`Operation timed out or failed: ${error}`);
            this.handleDeviceError(error);
            return defaultValue;
        }
    }
    async refreshState() {
        // Skip refresh if device is offline and max retries reached
        if (!this.state.isOnline && this.state.retryCount >= MAX_RETRIES) {
            return;
        }
        // Skip refresh if cache is still valid
        if (this.isCacheValid()) {
            return;
        }
        try {
            const response = await this.device.get({ schema: true });
            if (!isValidResponse(response)) {
                if (this.platform.config.debug) {
                    this.platform.log.debug(`Invalid device response: ${JSON.stringify(response)}`);
                }
                throw new Error('Invalid device response format');
            }
            const dps = response.dps;
            // Safely parse each value with validation
            const fanSpeed = parseDpsValue(dps, '53', this.state.fanSpeed === 0 ? 1 : Math.round((this.state.fanSpeed / 100) * 5) + 1);
            const brightness = parseDpsValue(dps, '22', this.state.lightBrightness === 0 ? 10 : Math.round((this.state.lightBrightness / 100) * 990) + 10);
            this.state = {
                ...this.state,
                fanActive: parseDpsValue(dps, '51', this.state.fanActive),
                fanSpeed: ((fanSpeed - 1) / 5) * 100,
                lightOn: parseDpsValue(dps, '20', this.state.lightOn),
                lightBrightness: ((brightness - 10) / 990) * 100,
                lastUpdate: Date.now(),
                isOnline: true,
                retryCount: 0,
                lastError: undefined
            };
            this.handleDeviceConnected();
            if (this.platform.config.debug) {
                this.platform.log.debug('State refreshed:', this.state);
            }
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('Unknown error');
            this.state.lastError = err.message;
            this.handleDeviceError(err);
        }
    }
    // Cleanup method
    destroy() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
        }
        if (this.retryTimeout) {
            clearTimeout(this.retryTimeout);
        }
    }
}
//# sourceMappingURL=platformAccessory.js.map