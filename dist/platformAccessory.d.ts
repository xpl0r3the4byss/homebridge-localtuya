import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { LocalTuyaPlatform } from './platform';
export declare class TuyaAccessory {
    private readonly platform;
    private readonly accessory;
    private fanService;
    private lightService;
    private device;
    constructor(platform: LocalTuyaPlatform, accessory: PlatformAccessory);
    setFanActive(value: CharacteristicValue): Promise<void>;
    getFanActive(): Promise<CharacteristicValue>;
    setFanSpeed(value: CharacteristicValue): Promise<void>;
    getFanSpeed(): Promise<CharacteristicValue>;
    setLightOn(value: CharacteristicValue): Promise<void>;
    getLightOn(): Promise<CharacteristicValue>;
    setLightBrightness(value: CharacteristicValue): Promise<void>;
    getLightBrightness(): Promise<CharacteristicValue>;
}
