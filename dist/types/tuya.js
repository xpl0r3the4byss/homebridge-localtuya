export function isValidDeviceStatus(data) {
    if (!data || typeof data !== 'object' || !('dps' in data) || typeof data.dps !== 'object') {
        return false;
    }
    // Optional validation for each DPS value
    const typedData = data;
    if ('20' in typedData.dps && typeof typedData.dps['20'] !== 'boolean') {
        return false;
    }
    if ('22' in typedData.dps && typeof typedData.dps['22'] !== 'number') {
        return false;
    }
    if ('51' in typedData.dps && typeof typedData.dps['51'] !== 'boolean') {
        return false;
    }
    if ('53' in typedData.dps && typeof typedData.dps['53'] !== 'number') {
        return false;
    }
    return true;
}
//# sourceMappingURL=tuya.js.map