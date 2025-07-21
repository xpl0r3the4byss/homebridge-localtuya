export interface TuyaDeviceStatus {
  dps: {
    '20'?: boolean;  // Light on/off
    '22'?: number;   // Light brightness (10-1000)
    '51'?: boolean;  // Fan on/off
    '53'?: number;   // Fan speed (1-6)
  };
}

export function isValidDeviceStatus(data: any): data is TuyaDeviceStatus {
  if (!data || typeof data.dps !== 'object') {
    return false;
  }

  // Optional validation for each DPS value
  if ('20' in data.dps && typeof data.dps['20'] !== 'boolean') return false;
  if ('22' in data.dps && typeof data.dps['22'] !== 'number') return false;
  if ('51' in data.dps && typeof data.dps['51'] !== 'boolean') return false;
  if ('53' in data.dps && typeof data.dps['53'] !== 'number') return false;

  return true;
}