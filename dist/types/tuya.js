"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isValidDeviceStatus = isValidDeviceStatus;
function isValidDeviceStatus(data) {
    if (!data || typeof data.dps !== 'object') {
        return false;
    }
    // Optional validation for each DPS value
    if ('20' in data.dps && typeof data.dps['20'] !== 'boolean')
        return false;
    if ('22' in data.dps && typeof data.dps['22'] !== 'number')
        return false;
    if ('51' in data.dps && typeof data.dps['51'] !== 'boolean')
        return false;
    if ('53' in data.dps && typeof data.dps['53'] !== 'number')
        return false;
    return true;
}
//# sourceMappingURL=tuya.js.map