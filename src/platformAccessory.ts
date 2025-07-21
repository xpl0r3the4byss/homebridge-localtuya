import type { CharacteristicValue, PlatformAccessory, Service } from 'homebridge';
import type { LocalTuyaPlatform } from './platform.js';
import TuyAPI from 'tuyapi';

export class TuyaAccessory {
  private fanService: Service;
  private lightService: Service;
  private device: TuyAPI;

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
    try {
      await this.device.set({dps: '51', set: value === 1});
      this.platform.log.debug('Set Fan Active ->', value);
    } catch (error) {
      this.platform.log.error('Error setting fan state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getFanActive(): Promise<CharacteristicValue> {
    try {
      const status = await this.device.get();
      const isActive = status.dps['51'] === true ? 1 : 0;
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
      await this.device.set({dps: '53', set: speed});
      this.platform.log.debug('Set Fan Speed ->', value, 'Tuya Speed ->', speed);
    } catch (error) {
      this.platform.log.error('Error setting fan speed:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getFanSpeed(): Promise<CharacteristicValue> {
    try {
      const status = await this.device.get();
      // Convert 1-6 range to 0-100
      const speed = ((status.dps['53'] - 1) / 5) * 100;
      this.platform.log.debug('Get Fan Speed ->', speed);
      return speed;
    } catch (error) {
      this.platform.log.error('Error getting fan speed:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  // Light control methods
  async setLightOn(value: CharacteristicValue) {
    try {
      await this.device.set({dps: '20', set: value as boolean});
      this.platform.log.debug('Set Light On ->', value);
    } catch (error) {
      this.platform.log.error('Error setting light state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightOn(): Promise<CharacteristicValue> {
    try {
      const status = await this.device.get();
      const isOn = status.dps['20'];
      this.platform.log.debug('Get Light On ->', isOn);
      return isOn;
    } catch (error) {
      this.platform.log.error('Error getting light state:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async setLightBrightness(value: CharacteristicValue) {
    try {
      // Convert 0-100 to 10-1000 range
      const brightness = Math.round(((value as number) / 100) * 990) + 10;
      await this.device.set({dps: '22', set: brightness});
      this.platform.log.debug('Set Light Brightness ->', value, 'Tuya Brightness ->', brightness);
    } catch (error) {
      this.platform.log.error('Error setting brightness:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }

  async getLightBrightness(): Promise<CharacteristicValue> {
    try {
      const status = await this.device.get();
      // Convert 10-1000 range to 0-100
      const brightness = ((status.dps['22'] - 10) / 990) * 100;
      this.platform.log.debug('Get Light Brightness ->', brightness);
      return brightness;
    } catch (error) {
      this.platform.log.error('Error getting brightness:', error);
      throw new this.platform.api.hap.HapStatusError(this.platform.api.hap.HAPStatus.SERVICE_COMMUNICATION_FAILURE);
    }
  }
}