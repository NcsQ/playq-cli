# PlayQ CLI

Command-line interface for the PlayQ Test Automation Framework.

## Installation

### Using npx (Recommended)
```bash
npx @playq/cli install
```

### Global Installation
```bash
npm install -g @playq/cli
playq install
```

## Usage

### Install PlayQ Framework
```bash
# Install base framework (default)
npx @playq/cli install

# Install in specific directory
npx @playq/cli install --dir my-project

# Install specific version
npx @playq/cli install --release 1.0.0

# Use offline zip file
npx @playq/cli install --offline ./playq-base.zip

# List available releases
npx @playq/cli install --list-releases

# Install specific components (coming soon)
npx @playq/cli install base      # Base framework (explicit)
npx @playq/cli install core      # Core framework
npx @playq/cli install examples  # Example projects
```

### Update Existing Project
```bash
# Update to latest version
npx @playq/cli update

# Update to specific version
npx @playq/cli update --to 1.0.1
```

## Commands

- `install [component]` - Install PlayQ frameworks (default: base)
- `update` - Update existing PlayQ project to newer version
- `--version` - Show CLI version
- `--help` - Show help information

## Install Options

- `--dir <name>` - Target directory name (default: current directory)
- `--release <version>` - Specific version to install (default: latest)
- `--offline <path>` - Path to local PlayQ zip file
- `--list-releases` - List all available releases

## Components

- `base` - PlayQ Base Project framework (default)
- `core` - PlayQ Core framework *(coming soon)*
- `examples` - PlayQ Example projects *(coming soon)*
- `patterniq` - PatternIQ smart element recognition *(coming soon)*
- `smartai` - SmartAI test resolution *(coming soon)*

## Requirements

- Node.js 16.0.0 or higher

## License

MIT

## Author

PlayQ Architect - Renish Kozhithottathil