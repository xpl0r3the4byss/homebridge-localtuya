export interface TuyaDeviceStatus {
  dps: {
    '20'?: boolean;  // Light on/off
    '22'?: number;   // Light brightness (10-1000)
    '51'?: boolean;  // Fan on/off
    '53'?: number;   // Fan speed (1-6)
  };
}

export function isValidDeviceStatus(data: unknown): data is TuyaDeviceStatus {
  if (!data || typeof data !== 'object' || !('dps' in data) || typeof (data as { dps: unknown }).dps !== 'object') {
    return false;
  }

  // Optional validation for each DPS value
  const typedData = data as { dps: Record<string, unknown> };
  if ('20' in typedData.dps && typeof typedData.dps['20'] !== 'boolean') { return false; }
  if ('22' in typedData.dps && typeof typedData.dps['22'] !== 'number') { return false; }
  if ('51' in typedData.dps && typeof typedData.dps['51'] !== 'boolean') { return false; }
  if ('53' in typedData.dps && typeof typedData.dps['53'] !== 'number') { return false; }

  return true;
}