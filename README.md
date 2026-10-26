# Snowdon

A simple cross-platform CLI for serving static files over HTTP. Inspired by nginx. No dependencies beyond Node.js.

## Features

- Serve any directory as a static website
- Custom port and bind address
- Directory listing with `index.html` fallback
- Built-in file upload GUI and settings GUI
- Works on macOS, Linux, and Windows

## Requirements

- Node.js 14+
- Git

## Installation

```bash
git clone https://github.com/jamestheakston/snowdon.git ~/snowdon
cd ~/snowdon
sudo node cli.js install
```

This installs `snowdon` to `/usr/local/bin`, so you can run it from any directory.

**Alternative (npm):** `npm install -g .`

**Windows:** copy `cli.js` somewhere on your PATH and run it with `node cli.js`, or create an alias:

```powershell
Set-Alias snowdon node "C:\path\to\cli.js"
```

## Usage

```bash
snowdon                              # Serve the current setup on http://localhost:8000
snowdon -p 3000                      # Custom port
snowdon -d ./public                  # Serve a specific directory
snowdon -b 0.0.0.0                   # Accessible from other devices on your network
snowdon -p 8080 -d ./public -b 0.0.0.0
```

### Options

| Option | Description | Default |
|---|---|---|
| `-p, --port` | Port number | `8000` |
| `-d, --directory` | Directory to serve | snowdon install directory |
| `-b, --bind` | Bind address | `localhost` |
| `-h, --help` | Show help | |

### Commands

| Command | Description |
|---|---|
| `snowdon stop` | Stop the running server (or press `Ctrl+C`) |
| `snowdon restart` | Restart with the same settings |
| `snowdon file` | Open the file upload GUI (`localhost:8888`) |
| `snowdon settings` | Open the settings GUI (`localhost:9000`) |
| `snowdon escapebubble` | Show options for hosting on the internet |
| `snowdon about` | Show version info |
| `snowdon help` | Show help |
| `sudo snowdon update` | Pull the latest version from GitHub and reinstall |
| `sudo snowdon uninstall` | Remove snowdon from your system |

Settings are saved to `~/snowdon/settings.snowdonconfig`.

## Troubleshooting

- **Port already in use:** stop the other process or pick a different port with `-p`.
- **Command not found:** make sure `/usr/local/bin` is in your PATH, then restart your terminal.
- **Permission denied:** ports below 1024 need sudo, and installing requires sudo.
- **Node.js not found:** install it from [nodejs.org](https://nodejs.org) and check with `node --version`.

## Development

```bash
node cli.js -p 8888   # Run locally without installing
npm start
```

## Credits

Inspired by nginx.

Mountains by Franco Mateo from [Noun Project](https://thenounproject.com/browse/icons/term/mountains/) (CC BY 3.0)

## License

MIT
