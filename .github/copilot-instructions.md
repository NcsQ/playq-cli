# PlayQ CLI Development Guide

## Project Overview
PlayQ CLI is a command-line tool for initializing and managing the PlayQ Test Automation Framework. It's built as an ES module using Node.js with Commander.js for CLI commands.

## Architecture

### Command Structure
- **Entry Point**: `bin/playq.js` - CLI entry with dynamic version from `VERSION` file
- **Command Registration**: `lib/commandLoader.js` - Auto-discovers and registers commands from `lib/commands/`
- **Commands**: Each file in `lib/commands/` exports a default function that registers Commander.js commands

### Key Components
- **Git Operations**: `lib/utils/git.js` - Handles git clone operations with shallow clones (`--depth 1`)
- **Logging**: `lib/utils/logger.js` - Centralized logging with Chalk colors and Ora spinners
- **Base Project**: Clones from `https://github.com/ncsq/playq-base-project.git` to initialize framework structure

## Framework Structure (Generated Projects)

### Configuration Patterns
- **Main Config**: `resources/config.ts` - Central configuration with browser, artifacts, test execution, and addon settings
- **Environment Files**: `environments/*.env` - Environment-specific configurations (e.g., `lambdatest.env`)
- **Version Tracking**: `version.json` files contain version, build, branch, commit, and release metadata

### Test Organization
```
test/
├── features/          # Gherkin BDD feature files
├── pages/             # Page Object Model classes
├── steps/             # Step definitions
├── step_group/        # Reusable step groups
└── _step_group/       # Auto-generated step group files
```

### Resource Structure
```
resources/
├── config.ts          # Main framework configuration
├── api/               # API testing utilities
├── locators/          # Element locators (JSON, TypeScript, patterns)
└── run-configs/       # Test execution configurations
```

## Development Patterns

### Command Implementation
When adding new commands, follow the pattern in `initBase.js`:
- Export default function that receives `program` (Commander instance)
- Use confirmation prompts for destructive operations
- Check working directory context (prevent running in CLI source)
- Use spinner for long operations, structured logging for output

### Error Handling
- Use `ensureGit()` to validate dependencies before operations
- Handle git clone failures gracefully with descriptive messages
- Exit with status 1 on errors after logging

### File Operations
- Use `path.resolve(process.cwd(), opts.dir)` for target directories
- Check if target exists before operations
- Read version info from `version.json` when available

## Key Workflows

### Project Initialization
```bash
playq init base [--dir name] [--version tag]
```
Clones base project template with safety checks and confirmation prompts.

### Adding Commands
1. Create new file in `lib/commands/`
2. Export default function that registers Commander.js commands
3. Follow logging and error handling patterns from existing commands

## Important Conventions

### Version Management
- CLI version from `VERSION` file (plain text)
- Project versions from `version.json` (structured with build info)
- Git branches/tags specified via `--version` option

### Safety Mechanisms
- Working directory validation (prevent running in CLI source)
- User confirmation for destructive operations
- Existence checks before file/directory operations

### Logging Standards
- Use `spinner` for long operations
- Use `log.info/ok/warn/error` for structured output
- Show version metadata after successful operations

## Framework Features (Generated Projects)

### Browser Session Management
- Playwright session control: shared/isolated/perTest/perFile/none
- Cucumber session control: shared/perScenario/perFeature

### Advanced Features
- **PatternIQ**: Smart element recognition with retry logic
- **SmartAI**: AI-enhanced test resolution
- **Addons**: D365 CRM/FinOps integrations
- **Artifacts**: Screenshot/video/trace capture with failure-only options

### Configuration Hierarchy
Environment variables override config.ts settings for runtime flexibility.