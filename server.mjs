import express from 'express';
import https from 'https';
import { readFileSync, statSync, existsSync } from 'fs';
import { join } from 'path';
import chokidar from 'chokidar';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const certDir = join(__dirname, 'cert');
const PORT = process.env.PORT || 3443;

// Parse CLI args for root directory
const args = process.argv.slice(2);
const rootArg = args.find(arg => arg.startsWith('--root='));
const publicDir = rootArg
  ? join(__dirname, rootArg.split('=')[1])
  : join(__dirname, 'public');

console.log(`📂 Serving static files from: ${publicDir}`);

// HTTPS setup
const sslOptions = {
  key: readFileSync(join(certDir, 'key.pem')),
  cert: readFileSync(join(certDir, 'cert.pem')),
};

const app = express();

// Inject WebSocket script into HTML responses
app.use((req, res, next) => {
  if (req.accepts('html')) {
    const filePath = join(publicDir, req.path === '/' ? '/index.html' : req.path);
    if (existsSync(filePath) && statSync(filePath).isFile() && filePath.endsWith('.html')) {
      let raw = readFileSync(filePath, 'utf8');
      const injected = raw.replace(
        '</body>',
        `<script>
          const ws = new WebSocket('wss://' + location.host);
          ws.onmessage = () => location.reload();
        </script></body>`
      );
      return res.send(injected);
    }
  }
  next();
});
app.use(express.static(publicDir));

// Start HTTPS server
const server = https.createServer(sslOptions, app);
const wss = new WebSocketServer({ server });

// Debounced reload sender
let reloadTimeout = null;
const debounceTime = 300; // milliseconds

const triggerReload = () => {
  if (reloadTimeout) clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    wss.clients.forEach(client => {
      if (client.readyState === 1) client.send('reload');
    });
    console.log('♻️  Reload triggered');
  }, debounceTime);
};

// Watch for file changes
chokidar.watch(publicDir, { ignoreInitial: true }).on('all', triggerReload);

// Launch
server.listen(PORT, () => {
  console.log(`🔐 HTTPS server running at https://localhost:${PORT}`);
});
