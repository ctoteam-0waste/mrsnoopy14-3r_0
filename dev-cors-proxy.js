// Dev-only CORS proxy for local web testing.
//
// The deployed backend does not return an `Access-Control-Allow-Origin` header,
// so the browser blocks its responses on localhost (you see "Failed to check
// account"). This proxy forwards every request to the backend and injects the
// missing CORS headers so the web app works during local development.
//
// USE ONLY FOR LOCAL DEV. Production still needs CORS fixed on the backend.
//
// Run:  node dev-cors-proxy.js   (keep it running alongside `npm run web`)

const http = require('http');
const https = require('https');

const TARGET = 'api.karmaverse.earth';
const PORT = 8899; // kept clear of Expo's 8081/8082/8083 range

const server = http.createServer((req, res) => {
  const origin = req.headers.origin || '*';

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      'Access-Control-Allow-Methods': 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': req.headers['access-control-request-headers'] || 'Content-Type,Authorization',
      'Access-Control-Max-Age': '86400',
    });
    res.end();
    return;
  }

  const proxyReq = https.request(
    {
      hostname: TARGET,
      port: 443,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: TARGET },
    },
    (proxyRes) => {
      const headers = { ...proxyRes.headers };
      headers['access-control-allow-origin'] = origin;
      headers['access-control-allow-credentials'] = 'true';
      // These are the backend's own security headers; drop them so they don't
      // interfere with local dev.
      delete headers['content-security-policy'];
      delete headers['cross-origin-resource-policy'];
      delete headers['cross-origin-opener-policy'];
      res.writeHead(proxyRes.statusCode || 502, headers);
      proxyRes.pipe(res);
    }
  );

  proxyReq.on('error', (err) => {
    res.writeHead(502, { 'Access-Control-Allow-Origin': origin, 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Proxy error: ' + err.message }));
  });

  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`Dev CORS proxy running:  http://localhost:${PORT}  ->  https://${TARGET}`);
});
