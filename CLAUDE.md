# CRITICAL: READ THIS FIRST

## Project Status (Last Updated: 2025-07-21)

### Current Work
- Working on 'fixes' branch to add auto-discovery feature
- Changed build system from ES modules to CommonJS to fix visibility in Homebridge UI
- Fixed various TypeScript issues
- Currently testing direct installation from GitHub fixes branch

### Installation Methods
1. From npm (stable):
   ```bash
   npm install -g homebridge-localtuya@beta
   ```

2. From GitHub (testing):
   ```bash
   npm install -g github:xpl0r3the4byss/homebridge-localtuya#fixes
   ```

### Known Issues
- GitHub installation method was working until evening of 2025-07-20, then started having issues
- Plugin visibility in Homebridge UI has been inconsistent
- TypeScript checks have been problematic with TuyAPI types

### Working Baseline Version
- Version: 0.0.1-beta.1
- Git commit: 42562da
- Status: **WORKING CORRECTLY**
- Published on npm with beta tag

### Recent Changes
1. Switched from tinytuya to tuyapi library
2. Added device auto-discovery feature
3. Changed from ES modules to CommonJS
4. Removed unnecessary dev dependencies (rimraf)
5. Fixed TypeScript type issues with TuyAPI

## Technical Details

### Architecture
- Uses tuyapi for local device control
- Supports auto-discovery of devices on local network
- Configured through Homebridge UI
- Handles both fan and light controls

### Device Communication
- Fan controls: dps 51 (on/off), dps 53 (speed 1-6)
- Light controls: dps 20 (on/off), dps 22 (brightness 10-1000)
- Uses local network, no cloud dependency
- Supports protocol version 3.3

### Configuration
- Devices can be auto-discovered
- Only needs local key from user
- IPs are auto-updated during discovery
- Default device type is 'fanLight'

## Development Guidelines

### DO NOT
1. Switch back to tinytuya
2. Modify working device communication
3. Change TypeScript configuration unless necessary
4. Add unnecessary dependencies
5. Mess with the module system (keep CommonJS)

### Future Improvements Needed
1. Better error handling for device communication
2. Proper TypeScript types for TuyAPI
3. More robust device discovery
4. Support for different device types

### Branch Strategy
- 'latest' branch contains stable, working version
- 'fixes' branch for testing new features
- Always test changes on 'fixes' before merging to 'latest'
- When merging to 'latest', publish new beta version to npm