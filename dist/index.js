import { LocalTuyaPlatform } from './platform.js';
import { PLATFORM_NAME, PLUGIN_NAME } from './settings.js';
/**
 * This method registers the platform with Homebridge
 */
export default (api) => {
    api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, LocalTuyaPlatform);
};
//# sourceMappingURL=index.js.map