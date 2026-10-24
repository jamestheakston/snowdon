# Snowdon - Simple HTTP Server CLI

A cross-platform CLI tool to start a web server for serving static files. Works on macOS, Linux, and Windows.

## Features

- Serve any directory as a static website
- Customizable port
- Bind to specific network interfaces
- Cross-platform (macOS, Linux, Windows)
- Directory listing with index.html fallback
- No external dependencies (uses Node.js)
- Built-in file upload GUI
- Stop running server with command

## Requirements

- Node.js 14 or higher

## Installation

### Download from GitHub

Clone the repository:

```bash
git clone https://github.com/jamestheakston/snowdon.git
cd snowdon
```

Then follow the installation instructions below.

### Quick Install (macOS/Linux)

### Quick Install (macOS/Linux)

Run the following command to install system-wide:

```bash
sudo node cli.js install
```

This installs `snowdon` to `/usr/local/bin`. After installation, you can run:

```bash
snowdon
```

### Once installed, you can also use:

```bash
sudo snowdon install      # Reinstall
sudo snowdon uninstall    # Remove from system
```

### Manual Install (macOS/Linux)

```bash
# Copy the script to a directory in your PATH
sudo cp cli.js /usr/local/bin/snowdon
sudo chmod +x /usr/local/bin/snowdon
```

### Windows Installation

```bash
# Copy cli.js to a directory in your PATH, or create a batch file
copy cli.js C:\Windows\snowdon.js
```

Then create a batch file `snowdon.bat`:
```batch
@echo off
node C:\Windows\snowdon.js %*
```

Or add an alias in PowerShell:
```powershell
Set-Alias snowdon node "C:\path\to\cli.js"
```

### Using npm (global install)

```bash
npm install -g .
```

## Usage

### Basic usage (serves current directory on port 8000)
```bash
snowdon
```

### Specify a custom port
```bash
snowdon -p 3000
```

### Serve a specific directory
```bash
snowdon -d /path/to/your/files
```

### Bind to all network interfaces (accessible from other devices)
```bash
snowdon -b 0.0.0.0
```

### Combine options
```bash
snowdon -p 8080 -d ./public -b 0.0.0.0
```

### Management commands
```bash
snowdon stop              # Stop the running server
snowdon help              # Show help message
snowdon file              # Open file upload GUI
```

## Command-line Options

- `-p, --port`: Port number (default: 8000)
- `-d, --directory`: Directory to serve (default: snowdon installation directory)
- `-b, --bind`: Bind address (default: localhost). Use `0.0.0.0` to accept connections from any IP.
- `-h, --help`: Show help message

## Management Commands

- `stop`: Stop the running server
- `help`: Show help message
- `file`: Start file upload GUI (uploads to snowdon installation directory)

## Examples

### Serve snowdon installation directory (default)
```bash
snowdon
# Server starts at http://localhost:8000/
# Serves files from where snowdon is installed
```

### Serve a specific folder on port 3000
```bash
snowdon -p 3000 -d ./my-website
# Server starts at http://localhost:3000/
```

### Make server accessible from other devices on your network
```bash
snowdon -b 0.0.0.0
# Server starts at http://0.0.0.0:8000/
# Access from other devices using your computer's IP address
```

### File Upload GUI
```bash
snowdon file
# Opens a simple web-based file upload interface at http://localhost:8888/
# Upload files, then run 'snowdon' to serve them
```

## Stopping the Server

You can stop the server in two ways:
1. Press `Ctrl+C` in the terminal where the server is running
2. Run `snowdon stop` from any terminal (uses PID tracking)

## Uninstallation

### macOS/Linux
```bash
sudo snowdon uninstall
```

Or manually:
```bash
sudo rm /usr/local/bin/snowdon
```

### Windows
Delete the files you installed.

## Troubleshooting

### Port already in use
If you see "Error: Port X is already in use", either:
- Stop the other process using that port
- Use a different port with `-p`

### Command not found
If `snowdon` command is not found after installation:
- Ensure `/usr/local/bin` is in your PATH
- Try running with full path: `/usr/local/bin/snowdon`
- Restart your terminal after installation

### Permission denied
- On Unix-like systems (macOS/Linux), you may need to use ports above 1024 unless running with sudo
- The installation step requires sudo to write to `/usr/local/bin`

### Node.js not found
- Install Node.js from [nodejs.org](https://nodejs.org)
- Verify installation with `node --version`

## Development

### Testing locally without installation
```bash
node cli.js -p 8888
```

### Testing install/uninstall locally
```bash
node cli.js install      # Test installation (requires sudo)
node cli.js uninstall    # Test uninstallation (requires sudo)
```

### Using npm script
```bash
npm start
```

## License

MIT
