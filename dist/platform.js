"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalTuyaPlatform = void 0;
const platformAccessory_1 = require("./platformAccessory");
const settings_1 = require("./settings");
const tuyapi_1 = __importDefault(require("tuyapi"));
// This is only required when using Custom Services and Characteristics not support by HomeKit
const EveHomeKitTypes_1 = require("homebridge-lib/EveHomeKitTypes");
/**
 * HomebridgePlatform
 * This class is the main constructor for your plugin, this is where you should
 * parse the user config and discover/register accessories with Homebridge.
 */
class LocalTuyaPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config;
        this.api = api;
        // this is used to track restored cached accessories
        this.accessories = new Map();
        this.discoveredCacheUUIDs = [];
        this.Service = api.hap.Service;
        this.Characteristic = api.hap.Characteristic;
        // This is only required when using Custom Services and Characteristics not support by HomeKit
        this.CustomServices = new EveHomeKitTypes_1.EveHomeKitTypes(this.api).Services;
        this.CustomCharacteristics = new EveHomeKitTypes_1.EveHomeKitTypes(this.api).Characteristics;
        this.log.debug('Finished initializing platform:', this.config.name);
        // When this event is fired it means Homebridge has restored all cached accessories from disk.
        // Dynamic Platform plugins should only register new accessories after this event was fired,
        // in order to ensure they weren't added to homebridge already. This event can also be used
        // to start discovery of new accessories.
        this.api.on('didFinishLaunching', () => {
            log.debug('Executed didFinishLaunching callback');
            // run the method to discover / register your devices as accessories
            this.discoverDevices();
        });
    }
    /**
     * This function is invoked when homebridge restores cached accessories from disk at startup.
     * It should be used to set up event handlers for characteristics and update respective values.
     */
    configureAccessory(accessory) {
        this.log.info('Loading accessory from cache:', accessory.displayName);
        // add the restored accessory to the accessories cache, so we can track if it has already been registered
        this.accessories.set(accessory.UUID, accessory);
    }
    /**
     * This is an example method showing how to register discovered accessories.
     * Accessories must only be registered once, previously created accessories
     * must not be registered again to prevent "duplicate UUID" errors.
     */
    async findTuyaDevices() {
        const timeout = (this.config.discoveryTimeout || 10) * 1000; // Convert to milliseconds
        const discoveredDevices = [];
        try {
            // Create a dummy device for scanning
            const scanner = new tuyapi_1.default({
                id: '00000000000000000000',
                key: '0000000000000000',
            });
            // Listen for device discoveries
            scanner.on('device', (device) => {
                this.log.debug('Found device:', device);
                discoveredDevices.push({
                    id: device.id,
                    ip: device.ip,
                    name: `Tuya Device ${device.id.substring(0, 8)}`,
                    type: 'fanLight', // Default type
                });
            });
            // Start scanning
            await scanner.find({ timeout });
            return discoveredDevices;
        }
        catch (error) {
            this.log.error('Error during device discovery:', error);
            return [];
        }
    }
    async discoverDevices() {
        // Get devices from config and discover new ones
        const configDevices = this.config.devices || [];
        const discoveredDevices = await this.findTuyaDevices();
        // Merge discovered devices with config devices
        for (const device of discoveredDevices) {
            const existingDevice = configDevices.find((d) => d.id === device.id);
            if (existingDevice) {
                // Update IP of existing device
                existingDevice.ip = device.ip;
            }
            else {
                // Add new device to config if we have its key
                if (device.key) {
                    configDevices.push({
                        name: device.name || `Tuya Device ${device.id.substring(0, 8)}`,
                        id: device.id,
                        key: device.key,
                        ip: device.ip,
                        type: 'fanLight',
                    });
                }
                else {
                    this.log.info('Found new device but missing key:', device.id);
                }
            }
        }
        // Store updated devices in config
        this.config.devices = configDevices;
        // loop over the discovered devices and register each one if it has not already been registered
        for (const device of configDevices) {
            // generate a unique id for the accessory this should be generated from
            // something globally unique, but constant, for example, the device serial
            // number or MAC address
            const uuid = this.api.hap.uuid.generate(device.id);
            // see if an accessory with the same uuid has already been registered and restored from
            // the cached devices we stored in the `configureAccessory` method above
            const existingAccessory = this.accessories.get(uuid);
            if (existingAccessory) {
                // the accessory already exists
                this.log.info('Restoring existing accessory from cache:', existingAccessory.displayName);
                // if you need to update the accessory.context then you should run `api.updatePlatformAccessories`. e.g.:
                // existingAccessory.context.device = device;
                // this.api.updatePlatformAccessories([existingAccessory]);
                // create the accessory handler for the restored accessory
                // this is imported from `platformAccessory.ts`
                new platformAccessory_1.TuyaAccessory(this, existingAccessory);
                // it is possible to remove platform accessories at any time using `api.unregisterPlatformAccessories`, e.g.:
                // remove platform accessories when no longer present
                // this.api.unregisterPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [existingAccessory]);
                // this.log.info('Removing existing accessory from cache:', existingAccessory.displayName);
            }
            else {
                // the accessory does not yet exist, so we need to create it
                this.log.info('Adding new accessory:', device.name);
                // create a new accessory
                const accessory = new this.api.platformAccessory(device.name, uuid);
                // store a copy of the device object in the `accessory.context`
                // the `context` property can be used to store any data about the accessory you may need
                accessory.context.device = device;
                // create the accessory handler for the newly create accessory
                // this is imported from `platformAccessory.ts`
                new platformAccessory_1.TuyaAccessory(this, accessory);
                // link the accessory to your platform
                this.api.registerPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
            }
            // push into discoveredCacheUUIDs
            this.discoveredCacheUUIDs.push(uuid);
        }
        // you can also deal with accessories from the cache which are no longer present by removing them from Homebridge
        // for example, if your plugin logs into a cloud account to retrieve a device list, and a user has previously removed a device
        // from this cloud account, then this device will no longer be present in the device list but will still be in the Homebridge cache
        for (const [uuid, accessory] of this.accessories) {
            if (!this.discoveredCacheUUIDs.includes(uuid)) {
                this.log.info('Removing existing accessory from cache:', accessory.displayName);
                this.api.unregisterPlatformAccessories(settings_1.PLUGIN_NAME, settings_1.PLATFORM_NAME, [accessory]);
            }
        }
    }
}
exports.LocalTuyaPlatform = LocalTuyaPlatform;
//# sourceMappingURL=platform.js.map