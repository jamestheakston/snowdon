#!/usr/bin/env node

const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { execSync, spawn } = require('child_process');
const os = require('os');
const readline = require('readline');

// MIME types (defined early for use in all functions)
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

// Parse command line arguments
const args = process.argv.slice(2);
const flags = {
  port: 8000,
  directory: path.join(os.homedir(), 'snowdon'),
  bind: 'localhost'
};

// Load settings from settings.snowdonconfig if it exists
const settingsFile = path.join(os.homedir(), 'snowdon', 'settings.snowdonconfig');
const defaultSettings = {
  defaultPort: 8000,
  defaultDirectory: path.join(os.homedir(), 'snowdon'),
  defaultBind: 'localhost',
  autoOpenBrowser: true,
  showSystemFiles: true,
  autoExtractZip: true,
  injectTitle: true,
  showBranding: true,
  customTitle: '',
  customFavicon: '',
  customCss: '',
  enableDirectoryListing: true,
  enableCors: true,
  enableCompression: true,
  cacheMaxAge: 3600,
  indexPriority: 'file',
  enableFileExtensions: true,
  enableIcons: true,
  enableDarkMode: false,
  defaultMimeType: 'application/octet-stream',
  allowedExtensions: '',
  blockedExtensions: '.exe,.sh,.bat,.cmd',
  maxFileSize: 100,
  enableUploadAuth: false,
  uploadPassword: '',
  enableLogging: true,
  logFilePath: '',
  logLevel: 'info',
  enableIndexHtmlRedirect: true,
  enable404Page: true,
  custom404Path: '',
  enableRobotsTxt: true,
  defaultRobotsTxt: 'User-agent: *\nDisallow: /',
  enableAutoIndex: false,
  indexTemplate: '',
  enableSecurityHeaders: true,
  enableHsts: false,
  enableRangeRequests: true,
  enableEtag: true,
  enableLastModified: true,
  enableXFrameOptions: true,
  xFrameOptions: 'SAMEORIGIN',
  enableContentTypeOptions: true,
  enableXssProtection: true,
  enableReferrerPolicy: true,
  referrerPolicy: 'strict-origin-when-cross-origin',
  enablePermissionsPolicy: true,
  permissionsPolicy: "default-src 'self'",
  strictTransportSecurity: false,
  enableSpdy: false,
  enableHttp2: true,
  enableHttp3: false,
  enableKeepAlive: true,
  keepAliveTimeout: 5,
  maxConnections: 1000,
  enableRateLimiting: false,
  rateLimit: 60,
  enableUploadValidation: true,
  scanForViruses: false,
  enableFileRenaming: true,
  enableFileDeletion: true,
  enableBulkOperations: true,
  enableDragAndDrop: true,
  enablePasteUpload: true,
  enableProgressBars: true
};
let settings = { ...defaultSettings };
if (fs.existsSync(settingsFile)) {
  try {
    const userSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
    settings = { ...defaultSettings, ...userSettings };
    // Apply settings to flags (if not overridden by command line)
    if (settings.defaultPort && !args.includes('-p') && !args.includes('--port')) {
      flags.port = parseInt(settings.defaultPort);
    }
    if (settings.defaultDirectory && !args.includes('-d') && !args.includes('--directory')) {
      flags.directory = settings.defaultDirectory;
    }
    if (settings.defaultBind && !args.includes('-b') && !args.includes('--bind')) {
      flags.bind = settings.defaultBind;
    }
  } catch (err) {
    console.error('Warning: Failed to load settings file:', err.message);
  }
}

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
} else if (args[0] === 'settings') {
  startSettingsMode();
  // Don't exit - startSettingsMode() keeps the process alive
  return; // Prevent regular server from starting
} else if (args[0] === 'escapebubble') {
  console.log('To make your site accessible from the internet:');
  console.log('1. Run snowdon with -b 0.0.0.0 to bind to all network interfaces');
  console.log('2. Forward port 8000 (or your chosen port) in your router');
  console.log('3. Use a service like ngrok or localtunnel for quick testing');
  console.log('4. For permanent hosting, consider cloud providers like Vercel, Netlify, or GitHub Pages');
  process.exit(0);
} else if (args[0] && !args[0].startsWith('-')) {
  // Invalid command (not a flag and not a recognized command)
  console.error(`Error: Command '${args[0]}' doesn't exist.`);
  console.error('Run "snowdon help" to see all available commands (including settings and escapebubble).');
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
    const snowdonPath = process.argv[1];
    const args = process.argv.slice(2).filter(arg => arg !== 'restart');
    spawn('node', [snowdonPath, ...args], {
      detached: true,
      stdio: 'inherit'
    }).unref();
    console.log('✓ Server restarted successfully.');
  }, 500);
}

function openBrowser(port) {
  const url = `http://localhost:${port}/`;
  try {
    if (process.platform === 'darwin') {
      execSync(`open "${url}"`, { stdio: 'ignore' });
    } else if (process.platform === 'win32') {
      execSync(`start "" "${url}"`, { stdio: 'ignore', shell: true });
    } else {
      execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
    }
  } catch (err) {
    // Ignore if browser fails to open
  }
}

function startSettingsMode() {
  const port = 9000;
  const settingsFile = path.join(os.homedir(), 'snowdon', 'settings.snowdonconfig');
  
  console.log(`Starting Snowdon Settings...`);
  console.log(`Settings location: ${settingsFile}`);

  const server = http.createServer((req, res) => {
    const url = req.url;

    // Add CORS headers if enabled
    addCorsHeaders(res);

    if (req.method === 'GET' && (url === '/' || url === '')) {
      // Serve settings GUI
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${settings.customTitle || 'Snowdon Settings'}</title>
  ${settings.customFavicon ? `<link rel="icon" href="${settings.customFavicon}">` : ''}
  ${settings.customCss ? `<link rel="stylesheet" href="${settings.customCss}">` : ''}
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: ${settings.enableDarkMode ? '#1a1a1a' : '#f5f5f5'};
      color: ${settings.enableDarkMode ? '#e0e0e0' : '#333'};
    }
    .container {
      background: ${settings.enableDarkMode ? '#2d2d2d' : 'white'};
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: ${settings.enableDarkMode ? '#e0e0e0' : '#333'};
      margin-bottom: 10px;
    }
    h2 {
      color: ${settings.enableDarkMode ? '#b0b0b0' : '#666'};
      margin-top: 30px;
      margin-bottom: 15px;
      font-size: 18px;
      border-bottom: 2px solid ${settings.enableDarkMode ? '#444' : '#eee'};
      padding-bottom: 10px;
    }
    .setting {
      margin-bottom: 20px;
      padding: 15px;
      background: ${settings.enableDarkMode ? '#3d3d3d' : '#f9f9f9'};
      border-radius: 4px;
    }
    .setting label {
      display: block;
      font-weight: 600;
      margin-bottom: 8px;
      color: ${settings.enableDarkMode ? '#e0e0e0' : '#333'};
    }
    .setting input[type="text"],
    .setting input[type="number"],
    .setting select,
    .setting textarea {
      width: 100%;
      padding: 10px;
      border: 1px solid ${settings.enableDarkMode ? '#555' : '#ddd'};
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
      background: ${settings.enableDarkMode ? '#2d2d2d' : 'white'};
      color: ${settings.enableDarkMode ? '#e0e0e0' : '#333'};
    }
    .setting input[type="checkbox"] {
      margin-right: 10px;
    }
    .setting textarea {
      min-height: 80px;
      resize: vertical;
    }
    .setting .help {
      font-size: 12px;
      color: ${settings.enableDarkMode ? '#999' : '#666'};
      margin-top: 5px;
    }
    button {
      background: #0066cc;
      color: white;
      padding: 12px 30px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 16px;
      margin-top: 20px;
    }
    button:hover {
      background: #0052a3;
    }
    .footer {
      margin-top: 30px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: ${settings.enableDarkMode ? '#999' : '#999'};
      font-size: 14px;
    }
    .footer img {
      width: 30px;
      height: 30px;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${settings.customTitle || 'Snowdon Settings'}</h1>
    <p>Configure your Snowdon server behavior below.</p>
    
    <h2>Server Settings</h2>
    <div class="setting">
      <label>Default Port</label>
      <input type="number" id="defaultPort" value="8000" min="1" max="65535">
      <div class="help">The default port used when no -p flag is specified (1-65535)</div>
    </div>
    <div class="setting">
      <label>Default Directory</label>
      <input type="text" id="defaultDirectory" value="${path.join(os.homedir(), 'snowdon')}">
      <div class="help">The default directory to serve when no -d flag is specified</div>
    </div>
    <div class="setting">
      <label>Default Bind Address</label>
      <select id="defaultBind">
        <option value="localhost">localhost (local only)</option>
        <option value="0.0.0.0">0.0.0.0 (all interfaces)</option>
      </select>
      <div class="help">The default bind address when no -b flag is specified</div>
    </div>
    
    <h2>Browser & UI Settings</h2>
    <div class="setting">
      <label><input type="checkbox" id="autoOpenBrowser" checked> Auto-open browser for file upload GUI</label>
      <div class="help">Automatically opens browser when running snowdon file</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="showSystemFiles" checked> Show system files in file GUI</label>
      <div class="help">Show system files (cli.js, etc.) in the file upload GUI by default</div>
    </div>
    
    <h2>File Handling Settings</h2>
    <div class="setting">
      <label><input type="checkbox" id="autoExtractZip" checked> Auto-extract ZIP files on upload</label>
      <div class="help">Automatically extract ZIP files when uploaded to the server</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="injectTitle" checked> Inject title tag in HTML files</label>
      <div class="help">Automatically add "Snowdon Website Server" as title if HTML file has no title tag</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="showBranding" checked> Show branding footer</label>
      <div class="help">Show "Hosted by Snowdon" with mountain icon on pages</div>
    </div>
    
    <h2>Appearance Settings</h2>
    <div class="setting">
      <label>Custom Page Title</label>
      <input type="text" id="customTitle" placeholder="Snowdon Website Server">
      <div class="help">Custom title to use for directory listing and error pages (empty for default)</div>
    </div>
    <div class="setting">
      <label>Custom Favicon Path</label>
      <input type="text" id="customFavicon" placeholder="/path/to/favicon.ico">
      <div class="help">Path to custom favicon file (empty for default)</div>
    </div>
    <div class="setting">
      <label>Custom CSS Path</label>
      <input type="text" id="customCss" placeholder="/path/to/custom.css">
      <div class="help">Path to custom CSS file to inject into all pages (empty for default)</div>
    </div>
    
    <h2>Advanced Settings</h2>
    <div class="setting">
      <label><input type="checkbox" id="enableDirectoryListing" checked> Enable directory listing</label>
      <div class="help">Show directory listing when no index.html is found</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableCors" checked> Enable CORS headers</label>
      <div class="help">Add CORS headers to allow cross-origin requests</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableCompression" checked> Enable compression</label>
      <div class="help">Compress responses for faster transfers (gzip)</div>
    </div>
    <div class="setting">
      <label>Cache Control Max Age (seconds)</label>
      <input type="number" id="cacheMaxAge" value="3600" min="0">
      <div class="help">How long browsers should cache files (0 to disable caching)</div>
    </div>
    <div class="setting">
      <label>Index HTML Fallback Priority</label>
      <select id="indexPriority">
        <option value="file">File in directory</option>
        <option value="directory">Directory listing</option>
      </select>
      <div class="help">What to show when both index.html and directory listing are available</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableFileExtensions" checked> Show file extensions in directory listing</label>
      <div class="help">Display file extensions (e.g., .html, .css) in directory listings</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableIcons" checked> Show file type icons in directory listing</label>
      <div class="help">Show emoji icons for different file types in directory listings</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableDarkMode"> Enable dark mode for UI</label>
      <div class="help">Use dark theme for settings and file upload GUI</div>
    </div>
    <div class="setting">
      <label>Default MIME type for unknown files</label>
      <input type="text" id="defaultMimeType" value="application/octet-stream">
      <div class="help">MIME type to use for files with unknown extensions</div>
    </div>
    <div class="setting">
      <label>Allowed file extensions (comma-separated)</label>
      <input type="text" id="allowedExtensions" placeholder=".html,.css,.js,.png,.jpg,.gif,.svg,.pdf">
      <div class="help">Only serve files with these extensions (empty to allow all)</div>
    </div>
    <div class="setting">
      <label>Blocked file extensions (comma-separated)</label>
      <input type="text" id="blockedExtensions" placeholder=".exe,.sh,.bat,.cmd">
      <div class="help">Block files with these extensions from being served</div>
    </div>
    <div class="setting">
      <label>Max file size (MB)</label>
      <input type="number" id="maxFileSize" value="100" min="0">
      <div class="help">Maximum file size for uploads in megabytes (0 for unlimited)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableUploadAuth"> Enable upload authentication</label>
      <div class="help">Require password for file uploads</div>
    </div>
    <div class="setting">
      <label>Upload password (required if auth enabled)</label>
      <input type="password" id="uploadPassword">
      <div class="help">Password required for file uploads (if auth is enabled)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableLogging" checked> Enable request logging</label>
      <div class="help">Log all HTTP requests to console or file</div>
    </div>
    <div class="setting">
      <label>Log file path</label>
      <input type="text" id="logFilePath" placeholder="/var/log/snowdon.log">
      <div class="help">Path to log file (empty for console only)</div>
    </div>
    <div class="string">
      <label>Log level</label>
      <select id="logLevel">
        <option value="error">Error only</option>
        <option value="warn">Warnings and errors</option>
        <option value="info" selected>Info, warnings, and errors</option>
        <option value="debug">Debug mode (very verbose)</option>
      </select>
      <div class="help">How much detail to include in logs</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableIndexHtmlRedirect" checked> Enable index.html redirect</label>
      <div class="help">Automatically redirect / to /index.html if it exists</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enable404Page" checked> Show custom 404 page</label>
      <div class="help">Show branded 404 page instead of default browser error</div>
    </div>
    <div class="setting">
      <label>Custom 404 page path</label>
      <input type="text" id="custom404Path" placeholder="/path/to/404.html">
      <div class="help">Path to custom 404 HTML page (empty for default)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableRobotsTxt" checked> Enable robots.txt serving</label>
      <div class="help">Automatically serve robots.txt if it exists in the directory</div>
    </div>
    <div class="setting">
      <label>Default robots.txt content</label>
      <textarea id="defaultRobotsTxt" placeholder="User-agent: *&#10;Disallow: /">User-agent: *
Disallow: /</textarea>
      <div class="help">Default robots.txt content if file doesn't exist</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableAutoIndex" checked> Auto-generate index.html</label>
      <div class="help">Automatically create index.html for directories without one</div>
    </div>
    <div class="setting">
      <label>Index.html template</label>
      <textarea id="indexTemplate" placeholder="Default template for auto-generated index.html">&lt;!DOCTYPE html&gt;
&lt;html&gt;
&lt;head&gt;
  &lt;title&gt;Directory&lt;/title&gt;
&lt;/head&gt;
&lt;body&gt;
  &lt;h1&gt;Directory&lt;/h1&gt;
  &lt;ul&gt;{{FILES}}&lt;/ul&gt;
&lt;/body&gt;
&lt;/html&gt;</textarea>
      <div class="help">Template for auto-generated index.html files (use {{FILES}} placeholder for file list)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableSecurityHeaders" checked> Enable security headers</label>
      <div class="help">Add security headers like X-Content-Type-Options</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableHsts" checked> Enable HSTS header</label>
      <div class="help">Add HTTP Strict Transport Security header (HTTPS only)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableRangeRequests" checked> Enable range requests</label>
      <div class="help">Support partial content requests for large files</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableEtag" checked> Enable ETag support</label>
      <div class="help">Use ETags for cache validation</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableLastModified" checked> Enable Last-Modified header</label>
      <div class="help">Include Last-Modified header in responses</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableXFrameOptions" checked> Enable X-Frame-Options header</label>
      <div class="help">Add X-Frame-Options header to prevent clickjacking</div>
    </div>
    <div class="setting">
      <label>X-Frame-Options value</label>
      <input type="text" id="xFrameOptions" value="SAMEORIGIN">
      <div class="help">Value for X-Frame-Options header (SAMEORIGIN, DENY, ALLOW-FROM, etc.)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableContentTypeOptions" checked> Enable X-Content-Type-Options</label>
      <div class="help">Add X-Content-Type-Options: nosniff header</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableXssProtection" checked> Enable XSS Protection header</div>
      <div class="help">Add X-XSS-Protection header</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableReferrerPolicy" checked> Enable Referrer-Policy header</div>
      <div class="help">Add Referrer-Policy header</div>
    </div>
    <div class="setting">
      <label>Referrer-Policy value</label>
      <input type="text" id="referrerPolicy" value="strict-origin-when-cross-origin">
      <div class="help">Value for Referrer-Policy header</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enablePermissionsPolicy" checked> Enable Permissions-Policy header</label>
      <div class="help">Add Permissions-Policy header</div>
    </div>
    <div class="setting">
      <label>Permissions-Policy value</label>
      <input type="text" id="permissionsPolicy" value="default-src 'self'">
      <div class="help">Value for Permissions-Policy header</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="strictTransportSecurity" checked> Strict Transport Security</label>
      <div class="help">Only allow HTTPS connections (sets HSTS with max-age 31536000)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableSpdy"> Enable SPDY (if server supports it)</label>
      <div class="help">Attempt to use SPDY protocol if available</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableHttp2" checked> Enable HTTP/2 support</label>
      <div class="help">Use HTTP/2 if supported by Node.js</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableHttp3"> Enable HTTP/3 support</label>
      <div class="help">Use HTTP/3 if supported by Node.js</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableKeepAlive" checked> Enable HTTP keep-alive</label>
      <div class="help">Use persistent connections for better performance</div>
    </div>
    <div class="setting">
      <label>Keep-alive timeout (seconds)</label>
      <input type="number" id="keepAliveTimeout" value="5" min="0">
      <div class="help">Timeout for HTTP keep-alive connections</div>
    </div>
    <div class="setting">
      <label>Maximum concurrent connections</label>
      <input type="number" id="maxConnections" value="1000" min="1">
      <div class="help">Maximum number of simultaneous connections</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableRateLimiting"> Enable rate limiting</label>
      <div class="help">Limit requests per IP to prevent abuse</div>
    </div>
    <div class="setting">
      <label>Requests per minute per IP</label>
      <input type="number" id="rateLimit" value="60" min="1">
      <div class="help">Maximum requests per minute per IP address</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableUploadValidation"> Enable upload validation</label>
      <div class="help">Validate uploaded files for security</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="scanForViruses"> Scan uploaded files for viruses</label>
      <div class="help">Basic file validation (not a true virus scanner)</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableFileRenaming" checked> Allow file renaming</label>
      <div class="help">Allow users to rename files through the GUI</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableFileDeletion" checked> Allow file deletion</label>
      <div class="help">Allow users to delete files through the GUI</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableBulkOperations" checked> Enable bulk operations</label>
      <div class="help">Allow selecting and deleting multiple files at once</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableDragAndDrop" checked> Enable drag and drop</label>
      <div class="help">Enable drag and drop file upload in the GUI</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enablePasteUpload" checked> Enable paste upload</label>
      <div class="help">Allow pasting files from clipboard to upload</div>
    </div>
    <div class="setting">
      <label><input type="checkbox" id="enableProgressBars" checked> Show upload progress bars</label>
      <div class="help">Display progress bars during file uploads</div>
    </div>
    <button onclick="saveSettings()">Save Settings</button>
    <div class="footer">
      <img src="/mountain.svg" alt="Snowdon">
      <span>Hosted by Snowdon</span>
    </div>
  </div>
  <script>
    // Load existing settings
    fetch('/settings')
      .then(r => r.json())
      .then(data => {
        Object.keys(data).forEach(key => {
          const el = document.getElementById(key);
          if (el) {
            if (el.type === 'checkbox') {
              el.checked = data[key];
            } else {
              el.value = data[key];
            }
          }
        });
      })
      .catch(err => console.error('Failed to load settings:', err));
    
    function saveSettings() {
      const settings = {};
      const inputs = document.querySelectorAll('input, select, textarea');
      inputs.forEach(input => {
        if (input.type === 'checkbox') {
          settings[input.id] = input.checked;
        } else {
          settings[input.id] = input.value;
        }
      });
      
      fetch('/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          alert('Settings saved successfully!');
        } else {
          alert('Failed to save settings: ' + data.error);
        }
      })
      .catch(err => {
        alert('Failed to save settings: ' + err.message);
      });
    }
  </script>
</body>
</html>`;
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else if (req.method === 'GET' && url === '/settings') {
      // Load existing settings
      const defaultSettings = {
        defaultPort: 8000,
        defaultDirectory: path.join(os.homedir(), 'snowdon'),
        defaultBind: 'localhost',
        autoOpenBrowser: true,
        showSystemFiles: true,
        autoExtractZip: true,
        injectTitle: true,
        showBranding: true,
        customTitle: '',
        customFavicon: '',
        customCss: '',
        enableDirectoryListing: true,
        enableCors: true,
        enableCompression: true,
        cacheMaxAge: 3600,
        indexPriority: 'file',
        enableFileExtensions: true,
        enableIcons: true,
        enableDarkMode: false,
        defaultMimeType: 'application/octet-stream',
        allowedExtensions: '',
        blockedExtensions: '.exe,.sh,.bat,.cmd',
        maxFileSize: 100,
        enableUploadAuth: false,
        uploadPassword: '',
        enableLogging: true,
        logFilePath: '',
        logLevel: 'info',
        enableIndexHtmlRedirect: true,
        enable404Page: true,
        custom404Path: '',
        enableRobotsTxt: true,
        defaultRobotsTxt: 'User-agent: *\\nDisallow: /',
        enableAutoIndex: false,
        indexTemplate: '',
        enableSecurityHeaders: true,
        enableHsts: false,
        enableRangeRequests: true,
        enableEtag: true,
        enableLastModified: true,
        enableXFrameOptions: true,
        xFrameOptions: 'SAMEORIGIN',
        enableContentTypeOptions: true,
        enableXssProtection: true,
        enableReferrerPolicy: true,
        referrerPolicy: 'strict-origin-when-cross-origin',
        enablePermissionsPolicy: true,
        permissionsPolicy: "default-src 'self'",
        strictTransportSecurity: false,
        enableSpdy: false,
        enableHttp2: true,
        enableHttp3: false,
        enableKeepAlive: true,
        keepAliveTimeout: 5,
        maxConnections: 1000,
        enableRateLimiting: false,
        rateLimit: 60,
        enableUploadValidation: true,
        scanForViruses: false,
        enableFileRenaming: true,
        enableFileDeletion: true,
        enableBulkOperations: true,
        enableDragAndDrop: true,
        enablePasteUpload: true,
        enableProgressBars: true
      };
      
      let settings = defaultSettings;
      if (fs.existsSync(settingsFile)) {
        try {
          settings = { ...defaultSettings, ...JSON.parse(fs.readFileSync(settingsFile, 'utf8')) };
        } catch (err) {
          console.error('Error loading settings:', err);
        }
      }
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(settings));
    } else if (req.method === 'POST' && url === '/settings') {
      // Save settings
      let body = '';
      req.on('data', chunk => body += chunk);
      req.on('end', () => {
        try {
          const settings = JSON.parse(body);
          fs.writeFileSync(settingsFile, JSON.stringify(settings, null, 2));
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        } catch (err) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: err.message }));
        }
      });
    } else if (req.method === 'GET' && url === '/mountain.svg') {
      // Serve the mountain icon for settings page
      fs.readFile(path.join(os.homedir(), 'snowdon', 'mountain.svg'), (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end(data);
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(port, 'localhost', () => {
    console.log(`Snowdon Settings started at http://localhost:${port}/`);
    console.log('Press Ctrl+C to stop the settings server.');
    
    // Open browser automatically if setting is enabled
    if (settings.autoOpenBrowser) {
      openBrowser(port);
    }
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${port} is already in use`);
    } else {
      console.error(`Error starting settings server: ${err.message}`);
    }
    process.exit(1);
  });

  // Keep the process alive
  process.on('SIGINT', () => {
    console.log('\nSettings server stopped.');
    process.exit(0);
  });
}

function startFileMode() {
  const port = 8888;
  const uploadDir = path.join(os.homedir(), 'snowdon');

  console.log(`Starting file upload GUI...`);
  console.log(`Upload directory: ${uploadDir}`);

  const server = http.createServer((req, res) => {
    const url = req.url;

    // Add CORS headers if enabled
    addCorsHeaders(res);

    if (req.method === 'GET' && (url === '/' || url === '')) {
      // Serve upload GUI
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${settings.customTitle || 'Snowdon File Upload'}</title>
  ${settings.customFavicon ? `<link rel="icon" href="${settings.customFavicon}">` : ''}
  ${settings.customCss ? `<link rel="stylesheet" href="${settings.customCss}">` : ''}
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
    .file-item input[type="checkbox"] {
      margin-right: 10px;
    }
    .file-name {
      flex: 1;
      color: #0066cc;
      text-decoration: none;
      cursor: pointer;
    }
    .file-name:hover {
      text-decoration: underline;
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
    .system-section {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #eee;
    }
    .empty-files {
      color: #999;
      font-style: italic;
    }
    .tooltip-small {
      position: absolute;
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 5px 10px;
      border-radius: 4px;
      font-size: 11px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transition: opacity 0.2s, visibility 0.2s;
      margin-bottom: 5px;
      z-index: 1000;
    }
    .tooltip-small::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: #333;
    }
    .file-item > div:hover .tooltip-small {
      opacity: 1;
      visibility: visible;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${settings.customTitle || 'Snowdon File Upload'}</h1>
    <p>Upload files to: <code>${uploadDir}</code></p>
    <form action="/upload" method="post" enctype="multipart/form-data">
      <input type="file" name="file" multiple>
      <button type="submit">Upload Files</button>
    </form>
    <div id="results"></div>
    <div class="file-list">
      <h3>Current Files</h3>
      <p style="font-size: 12px; color: #666; margin-bottom: 10px;">System files are hidden by default. Click "Show System Files" to view them.</p>
      <div id="fileList">Loading...</div>
    </div>
    <div class="hint">
      <strong>Tip:</strong> After uploading, press Ctrl+C to stop the upload server, then run <code>snowdon</code> to serve your files. ZIP files are automatically extracted.
    </div>
    <div style="margin-top: 20px; padding: 15px; background: #e7f3ff; border-left: 4px solid #0066cc; border-radius: 4px; font-size: 14px; color: #333;">
      <strong>Note:</strong> You're currently only hosting this site in your Bubble (on your PC or your home network). Run <code>snowdon escapebubble</code> to connect to the internet so you can reach unlimited visitors.
    </div>
    <div style="margin-top: 20px; text-align: center;">
      <button onclick="startServer()" style="background: #28a745; color: white; padding: 12px 30px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px;">Start Server</button>
      <p id="serverStatus" style="margin-top: 10px; color: #666;"></p>
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
    } else if (req.method === 'GET' && url === '/mountain.svg') {
      // Serve the mountain icon for system files tooltip
      fs.readFile(path.join(os.homedir(), 'snowdon', 'mountain.svg'), (err, data) => {
        if (err) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
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
                  
                  // Auto-extract ZIP files if setting is enabled
                  if (settings.autoExtractZip && filename.toLowerCase().endsWith('.zip')) {
                    console.log(`Extracting ${filename}...`);
                    try {
                      if (process.platform === 'win32') {
                        execSync(`powershell -Command "Expand-Archive -Path '${filePath}' -DestinationPath '${uploadDir}' -Force"`, { encoding: 'utf8' });
                      } else {
                        execSync(`unzip -o "${filePath}" -d "${uploadDir}"`, { encoding: 'utf8' });
                      }
                      // Delete the ZIP file after extraction
                      fs.unlinkSync(filePath);
                      console.log(`Extracted and removed ${filename}`);
                    } catch (extractErr) {
                      console.error(`Error extracting ${filename}:`, extractErr.message);
                    }
                  }
                  
                  uploadedCount++;
                  uploadedFilename = filename;
                } catch (err) {
                  console.error(`Error uploading ${filename}:`, err.message);
                }
              }
            }
          }

          pos = partEnd + boundaryBuffer.length;
        }

        const indexExists = fs.existsSync(path.join(uploadDir, 'index.html'));
        const responseData = {
          success: true,
          count: uploadedCount,
          singleFile: uploadedCount === 1,
          filename: uploadedFilename,
          indexExists: indexExists,
          wasZip: uploadedFilename && uploadedFilename.toLowerCase().endsWith('.zip')
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
        res.end(JSON.stringify({ success: true, files: files, showSystemFiles: settings.showSystemFiles }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    } else if (req.method === 'GET' && url.startsWith('/download/')) {
      // Download a file
      const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
      const filename = decodeURIComponent(parsedUrl.pathname.substring('/download/'.length));
      const filePath = path.join(uploadDir, filename);
      
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const mimeType = getMimeType(filePath);
        const stream = fs.createReadStream(filePath);
        
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', mimeType);
        
        stream.on('open', () => {
          stream.pipe(res);
        });
        
        stream.on('error', (err) => {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Internal Server Error');
        });
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('File not found');
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
    
    // Open browser automatically if setting is enabled
    if (settings.autoOpenBrowser) {
      openBrowser(port);
    }
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

    // Copy settings.snowdonconfig if it exists
    const settingsSource = path.join(path.dirname(sourcePath), 'settings.snowdonconfig');
    const settingsTarget = path.join(os.homedir(), 'snowdon', 'settings.snowdonconfig');
    if (fs.existsSync(settingsSource)) {
      if (!fs.existsSync(path.join(os.homedir(), 'snowdon'))) {
        fs.mkdirSync(path.join(os.homedir(), 'snowdon'), { recursive: true });
      }
      fs.copyFileSync(settingsSource, settingsTarget);
    }

    console.log('✓ Snowdon installed successfully!');
    console.log(`✓ Installed to: ${targetPath}`);
    console.log('');
    console.log('Run snowdon help to see all available commands.');
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

    // Delete settings file if it exists
    const settingsFile = path.join(os.homedir(), 'snowdon', 'settings.snowdonconfig');
    if (fs.existsSync(settingsFile)) {
      try {
        fs.unlinkSync(settingsFile);
        console.log(`✓ Deleted settings file: ${settingsFile}`);
      } catch (err) {
        console.error(`Error deleting settings file: ${err.message}`);
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

  // Add CORS headers if enabled
  addCorsHeaders(res);

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
            res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${settings.customTitle || 'Snowdon Website Server'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
      color: #333;
    }
    h1 { color: #666; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    .footer {
      margin-top: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #999;
      font-size: 14px;
    }
    .footer img {
      width: 30px;
      height: 30px;
    }
  </style>
</head>
<body>
  <h1>No files to host</h1>
  <p>Start a file upload server by running <code>snowdon file</code>, upload your files, and then restart this server by running <code>snowdon</code></p>
  <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-left: 4px solid #0066cc; border-radius: 4px; font-size: 14px; color: #333;">
    <strong>Note:</strong> You're currently only hosting this site in your Bubble (on your PC or your home network). Run <code>snowdon escapebubble</code> to connect to the internet so you can reach unlimited visitors.
  </div>
  ${settings.showBranding ? `
  <div class="footer">
    <img src="/mountain.svg" alt="Snowdon">
    <span>Hosted by Snowdon</span>
  </div>
  ` : ''}
</body>
</html>
`);
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
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
      return;
    }
    
    let content = data.toString();
    
    // If serving HTML, check for title tag (if injectTitle setting is enabled)
    if (settings.injectTitle && mimeType === 'text/html') {
      if (!content.includes('<title>') || !content.includes('</title>')) {
        const titleToInject = settings.customTitle || 'Snowdon Website Server';
        // Inject title tag after <head> or at the beginning
        if (content.includes('<head>')) {
          content = content.replace('<head>', `<head>\n  <title>${titleToInject}</title>`);
        } else if (content.includes('<html>')) {
          content = content.replace('<html>', `<html>\n<head>\n  <title>${titleToInject}</title>\n</head>`);
        } else {
          content = `<title>${titleToInject}</title>\n` + content;
        }
      }
    }
    
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(content);
  });
}

function serveDirectoryListing(dirPath, requestPath, res) {
  // Check if directory listing is enabled
  if (!settings.enableDirectoryListing) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Directory listing is disabled');
    return;
  }

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

    // Filter out system files for display
    const systemFiles = ['cli.js', 'file-gui.js', 'about.snowdon', 'package.json', 'README.md', '.gitignore', 'mountain.svg'];
    const userItems = items.filter(item => !systemFiles.includes(item.name));

    // If no user files, show the "no files" message
    if (userItems.length === 0) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${settings.customTitle || 'Snowdon Website Server'}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 600px;
      margin: 100px auto;
      padding: 20px;
      text-align: center;
      color: #333;
    }
    h1 { color: #666; }
    code { background: #f0f0f0; padding: 2px 6px; border-radius: 3px; }
    .footer {
      margin-top: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      color: #999;
      font-size: 14px;
    }
    .footer img {
      width: 30px;
      height: 30px;
    }
  </style>
</head>
<body>
  <h1>No files to host</h1>
  <p>Start a file upload server by running <code>snowdon file</code>, upload your files, and then restart this server by running <code>snowdon</code></p>
  <div style="margin-top: 30px; padding: 15px; background: #e7f3ff; border-left: 4px solid #0066cc; border-radius: 4px; font-size: 14px; color: #333;">
    <strong>Note:</strong> You're currently only hosting this site in your Bubble (on your PC or your home network). Run <code>snowdon escapebubble</code> to connect to the internet so you can reach unlimited visitors.
  </div>
  ${settings.showBranding ? `
  <div class="footer">
    <img src="/mountain.svg" alt="Snowdon">
    <span>Hosted by Snowdon</span>
  </div>
  ` : ''}
</body>
</html>
`);
      return;
    }

    // Sort: directories first, then files
    userItems.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${settings.customTitle || 'Snowdon Website Server'}</title>
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
    ${userItems.map(item => `
      <li>
        <a href="${item.path}${item.isDir ? '/' : ''}">
          ${item.isDir ? '📁 ' : '📄 '}${item.name}${item.isDir ? '/' : ''}
        </a>
      </li>
    `).join('')}
  </ul>
  ${settings.showBranding ? `
  <div style="margin-top: 50px; display: flex; align-items: center; justify-content: center; gap: 10px; color: #999; font-size: 14px;">
    <img src="/mountain.svg" alt="Snowdon" style="width: 30px; height: 30px;">
    <span>Hosted by Snowdon</span>
  </div>
  ` : ''}
</body>
</html>`;

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });
}

// Helper function to add CORS headers if enabled
function addCorsHeaders(res) {
  if (settings.enableCors) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }
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
       snowdon settings
       snowdon escapebubble

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
  settings                  Open settings GUI to configure server behavior
  escapebubble              Show instructions for making your site accessible from the internet

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
