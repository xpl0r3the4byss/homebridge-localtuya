export interface TuyaDeviceStatus {
    dps: {
        '20'?: boolean;
        '22'?: number;
        '51'?: boolean;
        '53'?: number;
    };
}
export declare function isValidDeviceStatus(data: unknown): data is TuyaDeviceStatus;
