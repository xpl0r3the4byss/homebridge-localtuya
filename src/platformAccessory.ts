import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { LocalTuyaPlatform } from './platform.js';
import TuyAPI from 'tuyapi';

interface DeviceState {
  fanActive: boolean;
  fanSpeed: number;
  lightOn: boolean;
  lightBrightness: number;
  lastUpdate: number;
  isOnline: boolean;
  retryCount: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds between retries

export class TuyaAccessory {
  private fanService: Service;
  private lightService: Service;
  private device: TuyAPI;
  private state: DeviceState = {
    fanActive: false,
    fanSpeed: 0,
    lightOn: false,
    lightBrightness: 0,
    lastUpdate: 0,
    isOnline: true,
    retryCount: 0
  };
  private readonly cacheTimeout = 500; // Cache timeout in milliseconds
  private refreshInterval: NodeJS.Timeout;
  private retryTimeout: NodeJS.Timeout | null = null;

  constructor(
    private readonly platform: LocalTuyaPlatform,
    private readonly accessory: PlatformAccessory,
  ) {
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
    this.refreshInterval = setInterval(this.refreshState.bind(this), 1000);

    // Set up status reporting characteristic
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .addCharacteristic(this.platform.Characteristic.StatusActive)
      .onGet(() => this.state.isOnline);

    // Set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
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
  async setFanActive(value: CharacteristicValue) {
    await this.safeDeviceOperation(async () => {
      await this.device.set({ dps: 51, set: value === 1 }); // Toggle fan
      this.state.fanActive = value === 1;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Fan Active ->', value);
    }, undefined);
  }

  async getFanActive(): Promise<CharacteristicValue> {
    if (!this.state.isOnline) {
      return this.state.fanActive ? 1 : 0;
    }
    if (this.isCacheValid()) {
      return this.state.fanActive ? 1 : 0;
    }
    return await this.safeDeviceOperation(async () => {
      await this.refreshState();
      return this.state.fanActive ? 1 : 0;
    }, 0);
  }

  async setFanSpeed(value: CharacteristicValue) {
    await this.safeDeviceOperation(async () => {
      // Convert 0-100 to 1-6 range
      const speed = Math.round((value as number / 100) * 5) + 1;
      await this.device.set({ dps: 53, set: speed }); // Set fan speed
      this.state.fanSpeed = value as number;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Fan Speed ->', value, 'Tuya Speed ->', speed);
    }, undefined);
  }

  async getFanSpeed(): Promise<CharacteristicValue> {
    if (!this.state.isOnline) {
      return this.state.fanSpeed;
    }
    if (this.isCacheValid()) {
      return this.state.fanSpeed;
    }
    return await this.safeDeviceOperation(async () => {
      await this.refreshState();
      return this.state.fanSpeed;
    }, 0);
  }

  // Light control methods
  async setLightOn(value: CharacteristicValue) {
    await this.safeDeviceOperation(async () => {
      await this.device.set({ dps: 20, set: value as boolean }); // Toggle light
      this.state.lightOn = value as boolean;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Light On ->', value);
    }, undefined);
  }

  async getLightOn(): Promise<CharacteristicValue> {
    if (!this.state.isOnline) {
      return this.state.lightOn;
    }
    if (this.isCacheValid()) {
      return this.state.lightOn;
    }
    return await this.safeDeviceOperation(async () => {
      await this.refreshState();
      return this.state.lightOn;
    }, false);
  }

  async setLightBrightness(value: CharacteristicValue) {
    await this.safeDeviceOperation(async () => {
      // Convert 0-100 to 10-1000 range
      const brightness = Math.round(((value as number) / 100) * 990) + 10;
      await this.device.set({ dps: 22, set: brightness }); // Set brightness
      this.state.lightBrightness = value as number;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Light Brightness ->', value, 'Tuya Brightness ->', brightness);
    }, undefined);
  }

  async getLightBrightness(): Promise<CharacteristicValue> {
    if (!this.state.isOnline) {
      return this.state.lightBrightness;
    }
    if (this.isCacheValid()) {
      return this.state.lightBrightness;
    }
    return await this.safeDeviceOperation(async () => {
      await this.refreshState();
      return this.state.lightBrightness;
    }, 0);
  }

  private handleDeviceError(error: Error) {
    this.platform.log.error(`Device ${this.accessory.displayName} error:`, error.message);
    if (error.message.includes('EHOSTUNREACH') || error.message.includes('ETIMEDOUT')) {
      this.handleDeviceDisconnected();
    }
  }

  private handleDeviceConnected() {
    if (!this.state.isOnline) {
      this.platform.log.info(`Device ${this.accessory.displayName} is back online`);
      this.state.isOnline = true;
      this.state.retryCount = 0;
      // Update HomeKit status
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .updateCharacteristic(this.platform.Characteristic.StatusActive, true);
      if (this.retryTimeout) {
        clearTimeout(this.retryTimeout);
        this.retryTimeout = null;
      }
    }
  }

  private handleDeviceDisconnected() {
    if (this.state.isOnline) {
      this.platform.log.warn(`Device ${this.accessory.displayName} is offline`);
      this.state.isOnline = false;
      // Update HomeKit status
      this.accessory.getService(this.platform.Service.AccessoryInformation)!
        .updateCharacteristic(this.platform.Characteristic.StatusActive, false);
      this.scheduleRetry();
    }
  }

  private isCacheValid(): boolean {
    return Date.now() - this.state.lastUpdate < this.cacheTimeout;
  }

  private scheduleRetry() {
    if (this.state.retryCount >= MAX_RETRIES) {
      this.platform.log.error(`Device ${this.accessory.displayName} failed to reconnect after ${MAX_RETRIES} attempts`);
      return;
    }

    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }

    this.retryTimeout = setTimeout(async () => {
      try {
        this.state.retryCount++;
        this.platform.log.debug(`Attempting to reconnect to ${this.accessory.displayName} (attempt ${this.state.retryCount})`);
        await this.refreshState();
      } catch (error) {
        this.platform.log.error(`Retry attempt ${this.state.retryCount} failed:`, error);
        if (this.state.retryCount < MAX_RETRIES) {
          this.scheduleRetry();
        }
      }
    }, RETRY_DELAY);
  }

  private async safeDeviceOperation<T>(operation: () => Promise<T>, defaultValue: T): Promise<T> {
    if (!this.state.isOnline) {
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }

    try {
      return await operation();
    } catch (error) {
      this.platform.log.error('Device operation failed:', error);
      this.handleDeviceError(error as Error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  private async refreshState() {
    if (!this.state.isOnline && this.state.retryCount >= MAX_RETRIES) {
      return;
    }

    try {
      const status = await this.device.get({ schema: true }) as { dps: Record<string, any> };
      
      this.state = {
        ...this.state,
        fanActive: status.dps['51'] === true,
        fanSpeed: ((status.dps['53'] - 1) / 5) * 100,
        lightOn: status.dps['20'] === true,
        lightBrightness: ((status.dps['22'] - 10) / 990) * 100,
        lastUpdate: Date.now(),
        isOnline: true,
        retryCount: 0
      };

      this.handleDeviceConnected();
      this.platform.log.debug('State refreshed:', this.state);
    } catch (error) {
      this.handleDeviceError(error as Error);
    }
  }

  // Cleanup method
  public destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }
}