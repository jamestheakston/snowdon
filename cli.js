#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { execSync } = require('child_process');
const os = require('os');
const readline = require('readline');

// Parse command line arguments
const args = process.argv.slice(2);
const snowdonDir = path.dirname(__filename);
const flags = {
  port: 8000,
  directory: snowdonDir,
  bind: 'localhost'
};

// Check for subcommands
if (args[0] === 'install') {
  installSnowdon();
  process.exit(0);
} else if (args[0] === 'uninstall') {
  uninstallSnowdon();
  process.exit(0);
} else if (args[0] === 'update') {
  updateSnowdon();
  process.exit(0);
} else if (args[0] === 'stop') {
  stopServer();
  process.exit(0);
} else if (args[0] === 'restart') {
  restartServer();
  process.exit(0);
} else if (args[0] === 'about') {
  showAbout();
  process.exit(0);
} else if (args[0] === 'help') {
  printHelp();
  process.exit(0);
} else if (args[0] === 'file') {
  startFileMode();
  // Don't exit - startFileMode() keeps the process alive
  return; // Prevent regular server from starting
} else if (args[0] && !args[0].startsWith('-')) {
  // Invalid command (not a flag and not a recognized command)
  console.error(`Error: Command '${args[0]}' doesn't exist.`);
  console.error('Run "snowdon help" to see all available commands.');
  process.exit(1);
}

// If no arguments, start server (default behavior)
if (args.length === 0) {
  // Continue to server start below
}

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-p' || arg === '--port') {
    flags.port = parseInt(args[++i]);
  } else if (arg === '-d' || arg === '--directory') {
    flags.directory = args[++i];
  } else if (arg === '-b' || arg === '--bind') {
    flags.bind = args[++i];
  } else if (arg === '-h' || arg === '--help') {
    printHelp();
    process.exit(0);
  } else if (arg.startsWith('-')) {
    // Invalid flag
    console.error(`Error: Unknown option '${arg}'`);
    console.error('Run "snowdon help" to see all available options.');
    process.exit(1);
  }
}

// Validate port
if (isNaN(flags.port) || flags.port < 1 || flags.port > 65535) {
  console.error('Error: Port must be between 1 and 65535');
  process.exit(1);
}

// Resolve directory
let dirPath;
try {
  dirPath = path.resolve(flags.directory);
  if (!fs.existsSync(dirPath)) {
    console.error(`Error: Directory '${dirPath}' does not exist`);
    process.exit(1);
  }
  const stats = fs.statSync(dirPath);
  if (!stats.isDirectory()) {
    console.error(`Error: '${dirPath}' is not a directory`);
    process.exit(1);
  }
} catch (err) {
  console.error(`Error resolving directory: ${err.message}`);
  process.exit(1);
}

// MIME types
const mimeTypes = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.eot': 'application/vnd.ms-fontobject',
  '.txt': 'text/plain',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || 'application/octet-stream';
}

function stopServer() {
  const pidFile = path.join(os.tmpdir(), 'snowdon.pid');

  if (!fs.existsSync(pidFile)) {
    console.log('No running Snowdon server found.');
    return;
  }

  try {
    const pid = parseInt(fs.readFileSync(pidFile, 'utf8'));
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(pidFile);
    console.log('✓ Snowdon server stopped successfully.');
  } catch (err) {
    if (err.code === 'ESRCH') {
      console.log('Server PID file exists but process is not running. Cleaning up...');
      fs.unlinkSync(pidFile);
    } else {
      console.error('Error stopping server:', err.message);
      process.exit(1);
    }
  }
}

function restartServer() {
  stopServer();
  console.log('Restarting server...');
  // Wait a moment for the server to stop
  setTimeout(() => {
    // Spawn a new snowdon process with the original arguments
    const { spawn } = require('child_process');
    const snowdonPath = process.argv[1];
    const args = process.argv.slice(2).filter(arg => arg !== 'restart');
    spawn('node', [snowdonPath, ...args], {
      detached: true,
      stdio: 'inherit'
    }).unref();
    console.log('✓ Server restarted successfully.');
  }, 500);
}

function startFileMode() {
  const port = 8888;
  const uploadDir = path.join(os.homedir(), 'snowdon');

  console.log(`Starting file upload GUI...`);
  console.log(`Upload directory: ${uploadDir}`);

  const server = http.createServer((req, res) => {
    const url = req.url;

    if (req.method === 'GET' && (url === '/' || url === '')) {
      // Serve upload GUI
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Snowdon File Upload</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 50px auto;
      padding: 20px;
      background: #f5f5f5;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333;
      margin-bottom: 10px;
    }
    p {
      color: #666;
      margin-bottom: 20px;
    }
    code {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-size: 14px;
    }
    form {
      margin-bottom: 20px;
    }
    input[type="file"] {
      width: 100%;
      padding: 10px;
      margin-bottom: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }
    button {
      background: #0066cc;
      color: white;
      padding: 12px 30px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover {
      background: #0052a3;
    }
    #results {
      margin-top: 20px;
      padding: 15px;
      border-radius: 4px;
    }
    .success {
      background: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    .hint {
      margin-top: 20px;
      padding: 15px;
      background: #e7f3ff;
      border-left: 4px solid #0066cc;
      border-radius: 4px;
    }
    .hint code {
      background: white;
    }
    .file-list {
      margin-top: 20px;
      border: 1px solid #ddd;
      border-radius: 4px;
      padding: 15px;
    }
    .file-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      border-bottom: 1px solid #eee;
    }
    .file-item:last-child {
      border-bottom: none;
    }
    .file-name {
      flex: 1;
    }
    .delete-btn {
      background: #dc3545;
      color: white;
      padding: 5px 10px;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      font-size: 12px;
    }
    .delete-btn:hover {
      background: #c82333;
    }
    .system-file {
      background: #6c757d;
      color: white;
      padding: 5px 10px;
      border-radius: 3px;
      font-size: 12px;
      cursor: default;
    }
    .empty-files {
      color: #999;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Snowdon File Upload</h1>
    <p>Upload files to: <code>${uploadDir}</code></p>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" multiple>
      <button type="submit">Upload Files</button>
    </form>
    <div id="results"></div>
    <div class="file-list">
      <h3>Current Files</h3>
      <p style="font-size: 12px; color: #666; margin-bottom: 10px;">System files (cli.js, file-gui.js, etc.) cannot be deleted as they are required for Snowdon to function.</p>
      <div id="fileList">Loading...</div>
    </div>
    <div class="hint">
      <strong>Tip:</strong> After uploading, press Ctrl+C to stop the upload server, then run <code>snowdon</code> to serve your files.
    </div>
  </div>
  <script src="/file-gui.js"></script>
</body>
</html>`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.method === 'GET' && url === '/file-gui.js') {
      // Serve the external JavaScript file from the source directory
      fs.readFile(path.join(os.homedir(), 'snowdon', 'file-gui.js'), (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/javascript' });
        res.end(data);
      });
    } else if (req.method === 'POST' && url === '/upload') {
      // Handle file upload
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.startsWith('multipart/form-data')) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Bad Request');
        return;
      }

      const boundary = contentType.split('boundary=')[1];
      const chunks = [];

      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks);
        const boundaryBuffer = Buffer.from(`--${boundary}`);
        let pos = 0;
        let uploadedCount = 0;
        let uploadedFilename = null;

        while (pos < body.length) {
          const boundaryPos = body.indexOf(boundaryBuffer, pos);
          if (boundaryPos === -1) break;

          const partStart = boundaryPos + boundaryBuffer.length;
          const partEnd = body.indexOf(boundaryBuffer, partStart);

          if (partEnd === -1) break;

          const part = body.slice(partStart, partEnd);
          const partStr = part.toString('utf8', 0, Math.min(part.length, 500));

          const filenameMatch = partStr.match(/filename="([^"]+)"/);
          if (filenameMatch && filenameMatch[1]) {
            const filename = filenameMatch[1];
            const headerEnd = partStr.indexOf('\r\n\r\n');
            if (headerEnd !== -1) {
              const headerBytes = Buffer.byteLength(partStr.substring(0, headerEnd + 4), 'utf8');
              const fileData = part.slice(headerBytes, part.length - 2);

              if (fileData.length > 0) {
                const filePath = path.join(uploadDir, filename);
                try {
                  fs.writeFileSync(filePath, fileData);
                  console.log(`Uploaded: ${filename} (${fileData.length} bytes)`);
                  uploadedCount++;
                  uploadedFilename = filename;
                } catch (err) {
                  console.error(`Error uploading ${filename}:`, err.message);
                }
              }
            }
          }

          pos = partEnd;
        }

        const responseData = {
          success: true,
          count: uploadedCount,
          singleFile: uploadedCount === 1,
          filename: uploadedFilename
        };
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(responseData));
      });
    } else if (req.method === 'POST' && url === '/rename') {
      // Handle file rename
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { oldName, newName } = JSON.parse(body);
          const oldPath = path.join(uploadDir, oldName);
          const newPath = path.join(uploadDir, newName);

          if (fs.existsSync(oldPath)) {
            fs.renameSync(oldPath, newPath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'File not found' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    } else if (req.method === 'GET' && url === '/files') {
      // List files in upload directory
      try {
        const files = fs.readdirSync(uploadDir).filter(file => {
          const filePath = path.join(uploadDir, file);
          return fs.statSync(filePath).isFile();
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, files: files }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    } else if (req.method === 'POST' && url === '/delete') {
      // Delete a file
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const { filename } = JSON.parse(body);
          const filePath = path.join(uploadDir, filename);

          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: true }));
          } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: 'File not found' }));
          }
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(port, 'localhost', () => {
    console.log(`File upload GUI started at http://localhost:${port}/`);
    console.log('Press Ctrl+C to stop the file upload server.');
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${port} is already in use`);
    } else {
      console.error(`Error starting file server: ${err.message}`);
    }
    process.exit(1);
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\nFile upload server stopped.');
    process.exit(0);
  });
}

function installSnowdon() {
  const installDir = '/usr/local/bin';
  const targetPath = path.join(installDir, 'snowdon');
  const sourcePath = __filename;

  // Check if running with sudo/admin privileges
  if (process.getuid && process.getuid() !== 0) {
    console.error('Error: Installation requires sudo/admin privileges.');
    console.error('Please run: sudo node cli.js install');
    process.exit(1);
  }

  try {
    // Ensure target directory exists
    if (!fs.existsSync(installDir)) {
      fs.mkdirSync(installDir, { recursive: true });
    }

    // Copy the script
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, '755');

    console.log('✓ Snowdon installed successfully!');
    console.log(`✓ Installed to: ${targetPath}`);
    console.log('');
    console.log('You can now run:');
    console.log('  snowdon                    # Start server on port 8000');
    console.log('  snowdon -p 3000           # Custom port');
    console.log('  snowdon -d /path/to/dir   # Serve specific directory');
    console.log('  snowdon -b 0.0.0.0        # Accessible from network');
    console.log('');
    console.log('To uninstall, run:');
    console.log('  sudo snowdon uninstall');
  } catch (err) {
    console.error('Error during installation:', err.message);
    process.exit(1);
  }
}

function uninstallSnowdon() {
  const installDir = '/usr/local/bin';
  const targetPath = path.join(installDir, 'snowdon');
  const snowdonDir = path.join(os.homedir(), 'snowdon');

  // Check if running with sudo/admin privileges
  if (process.getuid && process.getuid() !== 0) {
    console.error('Error: Uninstallation requires sudo/admin privileges.');
    console.error('Please run: sudo node cli.js uninstall');
    process.exit(1);
  }

  try {
    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      console.log('✓ Snowdon uninstalled successfully!');
      console.log(`✓ Removed from: ${targetPath}`);
    } else {
      console.log('Snowdon is not installed.');
    }

    // Delete the source directory if it exists
    if (fs.existsSync(snowdonDir)) {
      try {
        fs.rmSync(snowdonDir, { recursive: true, force: true });
        console.log(`✓ Deleted source directory: ${snowdonDir}`);
      } catch (err) {
        console.error(`Error deleting source directory: ${err.message}`);
        console.log(`Source directory kept at: ${snowdonDir}`);
      }
    }
  } catch (err) {
    console.error('Error during uninstallation:', err.message);
    process.exit(1);
  }
}

function updateSnowdon() {
  const installDir = '/usr/local/bin';
  const targetPath = path.join(installDir, 'snowdon');
  const snowdonDir = path.join(os.homedir(), 'snowdon');
  const sourcePath = path.join(snowdonDir, 'cli.js');

  // Check if running with sudo/admin privileges
  if (process.getuid && process.getuid() !== 0) {
    console.error('Error: Update requires sudo/admin privileges.');
    console.error('Please run: sudo snowdon update');
    process.exit(1);
  }

  if (!fs.existsSync(targetPath)) {
    console.log('Snowdon is not installed. Use "snowdon install" to install it first.');
    process.exit(1);
  }

  if (!fs.existsSync(snowdonDir)) {
    console.error('Error: Snowdon directory not found at ~/snowdon');
    console.error('Please ensure snowdon is cloned to ~/snowdon');
    process.exit(1);
  }

  try {
    // Git fetch and reset to latest
    console.log('Pulling latest changes from GitHub...');
    const stdout = execSync('cd ~/snowdon && git fetch && git reset --hard origin/main', { encoding: 'utf8' });
    console.log(stdout);

    // Delete the old binary
    console.log('Removing old installation...');
    fs.unlinkSync(targetPath);

    // Copy the updated script
    console.log('Installing new version...');
    fs.copyFileSync(sourcePath, targetPath);
    fs.chmodSync(targetPath, '755');

    console.log('✓ Snowdon updated successfully!');
    console.log(`✓ Updated file at: ${targetPath}`);
  } catch (err) {
    console.error('Error during update:', err.message);
    if (err.message.includes('git')) {
      console.error('Please ensure git is installed and you have internet connection.');
    }
    process.exit(1);
  }
}

function showAbout() {
  const snowdonDir = path.join(os.homedir(), 'snowdon');
  const aboutFile = path.join(snowdonDir, 'about.snowdon');

  if (!fs.existsSync(aboutFile)) {
    console.log('Snowdon - Simple HTTP Server CLI');
    console.log('');
    console.log('Version information not found.');
    console.log('Make sure snowdon is installed at ~/snowdon');
    return;
  }

  try {
    const aboutContent = fs.readFileSync(aboutFile, 'utf8');
    const lines = aboutContent.trim().split('\n');
    
    console.log('Snowdon - Simple HTTP Server CLI');
    console.log('');
    
    lines.forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1);
        console.log(`${formattedKey}: ${value}`);
      }
    });
  } catch (err) {
    console.error('Error reading about file:', err.message);
  }
}

// Create server
const server = http.createServer((req, res) => {
  const parsedUrl = new URL(req.url, `http://${flags.bind}`);
  let filePath = path.join(dirPath, decodeURIComponent(parsedUrl.pathname));

  // Default to index.html if directory
  if (filePath.endsWith(path.sep)) {
    filePath = path.join(filePath, 'index.html');
  }

  // Security: prevent directory traversal
  const normalizedPath = path.normalize(filePath);
  if (!normalizedPath.startsWith(dirPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Try index.html if file not found
        const indexPath = path.join(normalizedPath, 'index.html');
        fs.stat(indexPath, (indexErr, indexStats) => {
          if (!indexErr && !indexStats.isDirectory()) {
            serveFile(indexPath, res);
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        });
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
      return;
    }

    if (stats.isDirectory()) {
      // Serve directory listing or index.html
      const indexPath = path.join(normalizedPath, 'index.html');
      fs.stat(indexPath, (indexErr, indexStats) => {
        if (!indexErr && !indexStats.isDirectory()) {
          serveFile(indexPath, res);
        } else {
          serveDirectoryListing(normalizedPath, parsedUrl.pathname, res);
        }
      });
    } else {
      serveFile(normalizedPath, res);
    }
  });
});

function serveFile(filePath, res) {
  const mimeType = getMimeType(filePath);
  const stream = fs.createReadStream(filePath);

  stream.on('open', () => {
    res.writeHead(200, { 'Content-Type': mimeType });
    stream.pipe(res);
  });

  stream.on('error', (err) => {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  });
}

function serveDirectoryListing(dirPath, requestPath, res) {
  fs.readdir(dirPath, (err, files) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }

    const items = files.map(file => {
      const fullPath = path.join(dirPath, file);
      const stats = fs.statSync(fullPath);
      const isDir = stats.isDirectory();
      return {
        name: file,
        isDir: isDir,
        path: path.join(requestPath, file).replace(/\\/g, '/')
      };
    });

    // Sort: directories first, then files
    items.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Directory listing for ${requestPath}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; }
    h1 { color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin: 8px 0; }
    a { color: #0066cc; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .dir { font-weight: bold; }
    .back { margin-bottom: 20px; }
  </style>
</head>
<body>
  <h1>Directory listing for ${requestPath}</h1>
  ${requestPath !== '/' ? '<p class="back"><a href="../">↑ Parent directory</a></p>' : ''}
  <ul>
    ${items.map(item => `
      <li>
        <a href="${item.path}${item.isDir ? '/' : ''}">
          ${item.isDir ? '📁 ' : '📄 '}${item.name}${item.isDir ? '/' : ''}
        </a>
      </li>
    `).join('')}
  </ul>
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
}

// Start server
server.listen(flags.port, flags.bind, () => {
  console.log(`Serving directory: ${dirPath}`);
  console.log(`Server started at http://${flags.bind}:${flags.port}/`);
  console.log('Press Ctrl+C to stop the server, or run: snowdon stop');

  // Save PID for stop command
  const pidFile = path.join(os.tmpdir(), 'snowdon.pid');
  fs.writeFileSync(pidFile, process.pid.toString());
  console.log(`PID saved to: ${pidFile}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Error: Port ${flags.port} is already in use`);
  } else {
    console.error(`Error starting server: ${err.message}`);
  }
  process.exit(1);
});

function printHelp() {
  console.log(`
Snowdon - Simple HTTP Server

Usage: snowdon [options]
       snowdon install
       snowdon uninstall
       snowdon update
       snowdon stop
       snowdon restart
       snowdon about
       snowdon help
       snowdon file

Server Options:
  -p, --port <number>       Port number (default: 8000)
  -d, --directory <path>    Directory to serve (default: snowdon installation directory)
  -b, --bind <address>      Bind address (default: localhost). Use 0.0.0.0 for all interfaces
  -h, --help                Show this help message

Management Commands:
  install                   Install snowdon system-wide (requires sudo)
  uninstall                 Remove snowdon from system (requires sudo)
  update                    Update snowdon to latest version (requires sudo; automatically pulls from GitHub and reinstalls)
  stop                      Stop the running server
  restart                   Restart the running server
  about                     Show version information (reads from about.snowdon file)
  help                      Show this help message
  file                      Start file upload GUI (uploads to snowdon installation directory)

Examples:
  snowdon                    # Start on port 8000
  snowdon -p 3000           # Custom port
  snowdon -d /path/to/dir   # Serve specific directory
  snowdon -b 0.0.0.0        # Accessible from network
  snowdon stop              # Stop the running server
  snowdon file              # Open file upload GUI
  sudo node cli.js install  # Install system-wide
  sudo snowdon uninstall    # Uninstall
  sudo snowdon update       # Update to latest version
`);
}
