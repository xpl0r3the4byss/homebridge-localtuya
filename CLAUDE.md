# CRITICAL: READ THIS FIRST

## Working Baseline Version
- Version: 0.0.1-beta.1
- Git commit: 42562da
- Status: **WORKING CORRECTLY**
- Published on npm with beta tag

## WARNING
DO NOT FUCK WITH THIS WORKING VERSION. Previous attempts to "fix" or "improve" minor issues resulted in completely breaking the plugin. Unless explicitly asked to make specific changes, maintain this working baseline.

## Key Details
- Using tuyapi instead of tinytuya
- TypeScript checks temporarily disabled for publishing
- Successfully shows up in Homebridge UI plugin search

## Critical Changes That Led to Working Version
1. Changed from tinytuya to tuyapi
2. Set version to 0.0.1-beta.1
3. Disabled TypeScript checks in package.json prepublishOnly script
4. Published with beta tag

## Next Time
If asked to work on this project:
1. Check this commit is still the baseline
2. Do NOT attempt to "fix" TypeScript issues unless specifically requested
3. Do NOT modify any working functionality unless specifically requested
4. If changes are needed, create a new branch from this working version
5. NEVER add the dist directory to .gitignore - compiled files MUST be committed

## Version Management

Use these npm scripts to manage versions:

```bash
npm run version:beta    # Bump beta version (0.0.1-beta.1 -> 0.0.1-beta.2)
npm run version:patch   # Patch version for bug fixes
npm run version:minor   # Minor version for new features
npm run version:major   # Major version for breaking changes
```

### When to Use Each Version Type

#### Patch Version (0.0.X)
- Bug fixes that don't change functionality
- Performance improvements
- Error handling improvements
- Log message changes
- Documentation updates

#### Minor Version (0.X.0)
- New features that maintain backward compatibility
- New device type support
- New configuration options
- Dependency updates that don't require code changes
- Deprecation notices for future breaking changes

#### Major Version (X.0.0)
- Breaking changes to configuration format
- Removal of deprecated features
- Major dependency updates requiring code changes
- Changes that require users to modify their setup

#### Beta Version (X.Y.Z-beta.N)
- All changes during beta development
- Increment beta number for each published beta
- Move to stable version when thoroughly tested

## State of the Project (2025-07-23)

### Current Version
- Version: 0.0.1-beta.2
- Branch: latest
- Status: Working but unreleased

### Core Features
- Local control of Tuya devices (no cloud dependency)
- Fan/light combination device support
- Device state caching and validation
- Offline device handling
- HomeKit status integration

### Recent Improvements
1. Error Handling
   - Better offline device detection
   - Exponential backoff for retries
   - Graceful handling of wall switch power-off
   - Device state validation and safe parsing

2. Performance
   - State caching with 500ms timeout
   - Operation timeouts (1s)
   - Reduced refresh frequency (10s)
   - Batched operations where possible

3. Stability
   - Proper cleanup of resources
   - Better handling of reconnection
   - HomeKit state consistency
   - Initialization DPS code handling

### Known Limitations
1. Device Types
   - Currently only supports fan/light combo devices
   - Specifically tested with Designers Fountain ceiling fans
   - Limited to Tuya protocol version 3.3

2. Configuration
   - Requires manual entry of device IDs and local keys
   - IP addresses must be static or DHCP reserved
   - Wall switches must stay on for device control

### Next Steps
1. Finish publishing 0.0.1-beta.2 with:
   - Fixed linting errors
   - Improved type safety
   - Better error handling

2. Consider future improvements:
   - Support for more device types
   - Automatic device discovery
   - More configuration options
   - Improved error reporting
