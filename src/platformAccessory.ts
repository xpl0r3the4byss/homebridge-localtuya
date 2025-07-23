import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { LocalTuyaPlatform } from './platform.js';
import TuyAPI from 'tuyapi';

interface DeviceState {
  fanActive: boolean;
  fanSpeed: number;
  lightOn: boolean;
  lightBrightness: number;
  lastUpdate: number;
}

export class TuyaAccessory {
  private fanService: Service;
  private lightService: Service;
  private device: TuyAPI;
  private state: DeviceState = {
    fanActive: false,
    fanSpeed: 0,
    lightOn: false,
    lightBrightness: 0,
    lastUpdate: 0
  };
  private readonly cacheTimeout = 500; // Cache timeout in milliseconds
  private refreshInterval: NodeJS.Timeout;


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

    // Start periodic state refresh
    this.refreshInterval = setInterval(this.refreshState.bind(this), 1000);

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

  private async refreshState() {
    try {
      const status = await this.device.get({ schema: true }) as { dps: Record<string, any> };
      
      this.state = {
        fanActive: status.dps['51'] === true,
        fanSpeed: ((status.dps['53'] - 1) / 5) * 100,
        lightOn: status.dps['20'] === true,
        lightBrightness: ((status.dps['22'] - 10) / 990) * 100,
        lastUpdate: Date.now()
      };

      this.platform.log.debug('State refreshed:', this.state);
    } catch (error) {
      this.platform.log.error('Error refreshing state:', error);
    }
  }

  private isCacheValid(): boolean {
    return Date.now() - this.state.lastUpdate < this.cacheTimeout;
  }

  // Fan control methods
  async setFanActive(value: CharacteristicValue) {
    try {
      await this.device.set({ dps: 51, set: value === 1 }); // Toggle fan
      this.state.fanActive = value === 1;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Fan Active ->', value);
    } catch (error) {
      this.platform.log.error('Error setting fan state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getFanActive(): Promise<CharacteristicValue> {
    try {
      if (!this.isCacheValid()) {
        await this.refreshState();
      }
      const isActive = this.state.fanActive ? 1 : 0;
      this.platform.log.debug('Get Fan Active ->', isActive);
      return isActive;
    } catch (error) {
      this.platform.log.error('Error getting fan state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async setFanSpeed(value: CharacteristicValue) {
    try {
      // Convert 0-100 to 1-6 range
      const speed = Math.round((value as number / 100) * 5) + 1;
      await this.device.set({ dps: 53, set: speed }); // Set fan speed
      this.state.fanSpeed = value as number;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Fan Speed ->', value, 'Tuya Speed ->', speed);
    } catch (error) {
      this.platform.log.error('Error setting fan speed:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getFanSpeed(): Promise<CharacteristicValue> {
    try {
      if (!this.isCacheValid()) {
        await this.refreshState();
      }
      this.platform.log.debug('Get Fan Speed ->', this.state.fanSpeed);
      return this.state.fanSpeed;
    } catch (error) {
      this.platform.log.error('Error getting fan speed:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  // Light control methods
  async setLightOn(value: CharacteristicValue) {
    try {
      await this.device.set({ dps: 20, set: value as boolean }); // Toggle light
      this.state.lightOn = value as boolean;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Light On ->', value);
    } catch (error) {
      this.platform.log.error('Error setting light state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightOn(): Promise<CharacteristicValue> {
    try {
      if (!this.isCacheValid()) {
        await this.refreshState();
      }
      this.platform.log.debug('Get Light On ->', this.state.lightOn);
      return this.state.lightOn;
    } catch (error) {
      this.platform.log.error('Error getting light state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async setLightBrightness(value: CharacteristicValue) {
    try {
      // Convert 0-100 to 10-1000 range
      const brightness = Math.round(((value as number) / 100) * 990) + 10;
      await this.device.set({ dps: 22, set: brightness }); // Set brightness
      this.state.lightBrightness = value as number;
      this.state.lastUpdate = Date.now();
      this.platform.log.debug('Set Light Brightness ->', value, 'Tuya Brightness ->', brightness);
    } catch (error) {
      this.platform.log.error('Error setting brightness:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightBrightness(): Promise<CharacteristicValue> {
    try {
      if (!this.isCacheValid()) {
        await this.refreshState();
      }
      this.platform.log.debug('Get Light Brightness ->', this.state.lightBrightness);
      return this.state.lightBrightness;
    } catch (error) {
      this.platform.log.error('Error getting brightness:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  // Cleanup method to clear the refresh interval
  public destroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
}