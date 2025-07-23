import type { CharacteristicValue, PlatformAccessory } from 'homebridge';
import type { LocalTuyaPlatform } from './platform.js';
export declare class TuyaAccessory {
    private readonly platform;
    private readonly accessory;
    private fanService;
    private lightService;
    private device;
    private state;
    private readonly cacheTimeout;
    private refreshInterval;
    constructor(platform: LocalTuyaPlatform, accessory: PlatformAccessory);
    private refreshState;
    private isCacheValid;
    setFanActive(value: CharacteristicValue): Promise<void>;
    getFanActive(): Promise<CharacteristicValue>;
    setFanSpeed(value: CharacteristicValue): Promise<void>;
    getFanSpeed(): Promise<CharacteristicValue>;
    setLightOn(value: CharacteristicValue): Promise<void>;
    getLightOn(): Promise<CharacteristicValue>;
    setLightBrightness(value: CharacteristicValue): Promise<void>;
    getLightBrightness(): Promise<CharacteristicValue>;
    destroy(): void;
}
