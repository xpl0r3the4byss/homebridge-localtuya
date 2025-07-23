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
