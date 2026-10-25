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
- Escape bubble to host from internet

## Requirements

- Node.js 14 or higher (includes npm package manager)
- Git (for downloading from GitHub)

## Installation

### Download from GitHub

Clone the repository:

```bash
cd ~
git clone https://github.com/jamestheakston/snowdon.git
cd snowdon
```

Then follow the installation instructions below.

### Quick Install (macOS/Linux)

Run the following command to install system-wide:

```bash
sudo node cli.js install
```

This installs `snowdon` to `/usr/local/bin` which is in your system PATH. After installation, you can run `snowdon` from **any directory**:

```bash
snowdon                    # Works from anywhere
cd /some/other/folder
snowdon                    # Still works!
```

Run `snowdon help` to see all available commands.

### Once installed, you can also use:

```bash
sudo snowdon install      # Reinstall
sudo snowdon update       # Update to latest version
sudo snowdon uninstall    # Remove from system
```

### Manual Install (macOS/Linux)

```bash
# Copy the script to a directory in your PATH
sudo cp cli.js /usr/local/bin/snowdon
sudo chmod +x /usr/local/bin/snowdon
```

After this, you can run `snowdon` from any directory since `/usr/local/bin` is in your PATH.

### Windows Installation

```bash
# Copy cli.js to a directory in your PATH, or create a batch file
copy cli.js C:\Windows\snowdon.js
```

Then create a batch file `snowdon.bat` and add it to your PATH:
```batch
@echo off
node C:\Windows\snowdon.js %*
```

After adding to PATH, you can run `snowdon` from any directory.

Or add an alias in PowerShell:
```powershell
Set-Alias snowdon node "C:\path\to\cli.js"
```

### Using npm (global install)

```bash
npm install -g .
```

This installs snowdon globally, making it available from any directory.

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
snowdon restart           # Restart the running server
snowdon about             # Show version information
snowdon help              # Show help message
snowdon file              # Open file upload GUI
snowdon settings          # Open settings GUI
```

## Command-line Options

- `-p, --port`: Port number (default: 8000)
- `-d, --directory`: Directory to serve (default: snowdon installation directory)
- `-b, --bind`: Bind address (default: localhost). Use `0.0.0.0` to accept connections from any IP.
- `-h, --help`: Show help message

## Management Commands

- `stop`: Stop the running server
- `restart`: Restart the running server
- `about`: Show version information (reads version from about.snowdon file)
- `help`: Show help message
- `file`: Start file upload GUI (uploads to snowdon installation directory)
- `settings`: Open settings GUI to configure server behavior
- `update`: Update snowdon to the latest version (requires sudo; automatically pulls from GitHub and reinstalls)

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
# Opens a web-based file upload interface at http://localhost:8888/
# Opens in your default browser automatically
# Upload files to the snowdon installation directory
# View and delete existing files
# Then run 'snowdon' from any directory to serve them
```

### Escape Bubble (Make accessible from internet)
```bash
snowdon escapebubble
# Shows instructions for making your site accessible from the internet
# Explains options like port forwarding, ngrok, cloud hosting, etc.
```

### Settings GUI
```bash
snowdon settings
# Opens a web-based settings interface at http://localhost:9000/
# Opens in your default browser automatically
# Configure server behavior, appearance, security, and more
# Settings are saved to ~/snowdon/settings.json
```

Available settings include:
- **Server Settings**: Default port, directory, bind address
- **Browser & UI Settings**: Auto-open browser, show system files
- **File Handling Settings**: Auto-extract ZIP, title injection, branding
- **Appearance Settings**: Custom title, favicon, CSS, dark mode
- **Advanced Settings**: Directory listing, CORS, compression, caching
- **Security Settings**: Security headers, rate limiting, upload authentication
- **Performance Settings**: Keep-alive, max connections, HTTP/2 support
- **File Management Settings**: Rename, delete, bulk operations, drag & drop

### Update Snowdon
```bash
sudo snowdon update
```

This command automatically:
1. Changes to the snowdon directory
2. Pulls the latest changes from GitHub (requires internet)
3. Updates the installed binary

## Stopping the Server

You can stop the server in two ways:
1. Press `Ctrl+C` in the terminal where the server is running
2. Run `snowdon stop` from any terminal (uses PID tracking)

## Restarting the Server

To restart the server:
```bash
snowdon restart
```

This stops the current server and starts a new one with the same settings.

## Uninstallation

### macOS/Linux
```bash
sudo snowdon uninstall
```

This will:
1. Remove the snowdon binary from `/usr/local/bin`
2. Delete the snowdon source directory from `~/snowdon`

Or manually:
```bash
sudo rm /usr/local/bin/snowdon
rm -rf ~/snowdon
```

### Windows
Delete the files you installed manually (the batch file or copied script from your PATH).

## Updating

To update snowdon to the latest version, simply run:

```bash
sudo snowdon update
```

This command automatically:
1. Changes to the snowdon directory (`~/snowdon`)
2. Pulls the latest changes from GitHub (requires internet)
3. Deletes the old binary
4. Installs the new version

Make sure the snowdon directory exists at `~/snowdon` and git is installed.

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

## Credits

Mountains by Franco Mateo from [Noun Project](https://thenounproject.com/browse/icons/term/mountains/) (CC BY 3.0)

## License

MIT
