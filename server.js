// Static file server + WebSocket server (one process, one port) for Render.
const http = require('http'), fs = require('fs'), path = require('path');
const { WebSocketServer } = require('ws');
const rooms = require('./rooms.js');
const ROOT = __dirname;
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };

const server = http.createServer((req, res) => {
  let u = req.url.split('?')[0];
  if (u === '/health') { res.end('ok'); return; }
  if (u === '/') u = '/index.html';
  const PRIVATE = ['/server.js', '/rooms.js'];
  if (PRIVATE.includes(u) || !/^\/[\w-]+\.(html|css|js)$/.test(u)) { res.writeHead(404); res.end('Not found'); return; }
  fs.readFile(path.join(ROOT, u), (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(u)] || 'text/plain', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, maxPayload: 1024 });
wss.on('connection', ws => {
  ws.isAlive = true; ws.on('pong', () => ws.isAlive = true);
  ws.on('message', d => { let m; try { m = JSON.parse(d); } catch (_) { return; } rooms.handle(ws, m); });
  ws.on('close', () => rooms.leave(ws));
  ws.on('error', () => {});
});
setInterval(() => wss.clients.forEach(ws => { if (!ws.isAlive) return ws.terminate(); ws.isAlive = false; ws.ping(); }), 25000);

server.listen(process.env.PORT || 3000, () => console.log('Fight Arena running on', process.env.PORT || 3000));
