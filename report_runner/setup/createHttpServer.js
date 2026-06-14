// HTTP server: /health for liveness, /metrics for monitoring. Everything
// else 404. Socket.io attaches to the same httpServer for upgrades.

const http = require('http');
const metrics = require('./metrics');

function createHttpServer() {
  return http.createServer((req, res) => {
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
    if (req.url === '/metrics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(metrics.snapshot()));
      return;
    }
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'NOT_FOUND' }));
  });
}

module.exports = { createHttpServer };
