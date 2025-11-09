# PlayQ CLI

Command-line interface for the PlayQ Test Automation Framework.

## Installation

### Using npx (Recommended)
```bash
npx @playq/cli init base
```

### Global Installation
```bash
npm install -g @playq/cli
playq init base
```

## Usage

### Initialize PlayQ Base Project
```bash
# Initialize in current directory
npx @playq/cli init base

# Initialize in specific directory
npx @playq/cli init base --dir my-project

# Install specific version
npx @playq/cli init base --release 1.0.0

# Use offline zip file
npx @playq/cli init base --offline ./playq-base.zip

# List available releases
npx @playq/cli init base --list-releases
```

### Update Existing Project
```bash
# Update to latest version
npx @playq/cli update

# Update to specific version
npx @playq/cli update --release 1.0.1
```

## Commands

- `init base` - Initialize PlayQ Base Project structure
- `update` - Update existing PlayQ project to newer version
- `--version` - Show CLI version
- `--help` - Show help information

## Options

- `--dir <name>` - Target directory name (default: current directory)
- `--release <version>` - Specific version to install (default: latest)
- `--offline <path>` - Path to local PlayQ Base zip file
- `--list-releases` - List all available releases

## Requirements

- Node.js 16.0.0 or higher

## License

MIT

## Author

PlayQ Architect - Renish Kozhithottathil