# homebridge-localtuya

A Homebridge plugin for controlling Tuya devices locally without cloud dependencies. Currently optimized for fan/light combination devices, specifically Designers Fountain ceiling fans.

## Features

- Local control of Tuya devices without cloud dependency
- Real-time status updates
- Support for fan and light combination devices
- HomeKit integration for:
  - Fan on/off state and speed control
  - Light on/off state and brightness control

## Prerequisites

1. Homebridge installed and running
2. Tuya device(s) set up and connected to your local network
3. Device local keys (see [Obtaining Device Keys](#obtaining-device-keys))

## Installation

```bash
npm install -g homebridge-localtuya@beta
```

## Configuration

Configure through Homebridge UI or by editing `config.json`:

```json
{
  "platforms": [
    {
      "platform": "LocalTuya",
      "devices": [
        {
          "name": "Living Room Fan",
          "id": "device_id",
          "key": "local_key",
          "ip": "device_ip",
          "type": "fanLight"
        }
      ]
    }
  ]
}
```

### Required Device Parameters

- `name`: Display name in HomeKit
- `id`: Device ID from Tuya
- `key`: Local encryption key
- `ip`: Device's local IP address
- `type`: Device type (currently only "fanLight" supported)

## Obtaining Device Keys

### Method 1: Smart Life App (Recommended)

1. Install Smart Life app and add your devices
2. Use third-party tools to extract local keys from the app
3. Note down device IDs and local keys

### Method 2: IoT Platform

1. Create Account:
   - Visit [iot.tuya.com](https://iot.tuya.com)
   - Register for a developer account
   - Select your data center based on location

2. Create Cloud Project:
   - Go to Cloud > Development
   - Create new project
   - Select "Smart Home" industry and development method

3. Configure API Access:
   - Enable required services:
     - Industry Basic Service
     - Smart Home Basic Service
     - Device Status Notification APIs
   - Note your Access ID and Secret

4. Link Devices:
   - Navigate to Cloud > Your Project > Devices
   - Click "Link Tuya App Account"
   - Use Smart Life app to scan QR code
   - Authorize connection

5. Get Device Information:
   - Device IDs and local keys will be visible in the linked devices section
   - Note: IoT platform access to local keys is limited and may not work for all devices

## Supported Devices

Currently optimized for:
- Fan/light combination devices (Designers Fountain ceiling fans)
- Devices using Tuya protocol version 3.3

## Troubleshooting

1. Ensure device is connected to local network
2. Verify device IP address is correct and static
3. Confirm local key is correct
4. Check device is using compatible protocol version (3.3)

## Contributing

This is a beta version focused on fan/light combination devices. Please report issues on GitHub.

## License

MIT

---

For more information about Homebridge, visit the [Homebridge documentation](https://developers.homebridge.io/).