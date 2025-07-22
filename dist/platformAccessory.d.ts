import { CharacteristicValue, PlatformAccessory } from 'homebridge';
import { LocalTuyaPlatform } from './platform.js';
export declare class TuyaAccessory {
    private readonly platform;
    private readonly accessory;
    private fanService;
    private lightService;
    private device;
    private isConnected;
    private connectionRetries;
    private maxRetries;
    private pollingInterval?;
    constructor(platform: LocalTuyaPlatform, accessory: PlatformAccessory);
    private handleError;
    private startPolling;
    private updateCharacteristics;
    private connect;
    private scheduleReconnect;
    destroy(): void;
    setFanActive(value: CharacteristicValue): Promise<void>;
    getFanActive(): Promise<CharacteristicValue>;
    setFanSpeed(value: CharacteristicValue): Promise<void>;
    getFanSpeed(): Promise<CharacteristicValue>;
    setLightOn(value: CharacteristicValue): Promise<void>;
    getLightOn(): Promise<CharacteristicValue>;
    setLightBrightness(value: CharacteristicValue): Promise<void>;
    getLightBrightness(): Promise<CharacteristicValue>;
}
