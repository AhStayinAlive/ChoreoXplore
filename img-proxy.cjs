const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET = 'http://127.0.0.1:8188';

const app = express();
app.use(express.json({ limit: '20mb' }));

app.use('/img', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  pathRewrite: { '^/img': '' },

  onProxyReq(proxyReq, req) {
    // keep Comfy happy with same-origin headers
    proxyReq.setHeader('origin', TARGET);
    proxyReq.setHeader('referer', TARGET + '/');

    // Forward JSON body produced by express.json()
    if (req.body && typeof req.body === 'object') {
      const body = JSON.stringify(req.body);
      proxyReq.setHeader('content-type', 'application/json');
      proxyReq.setHeader('content-length', Buffer.byteLength(body));
      proxyReq.write(body);
      proxyReq.end();                // <<< THIS WAS MISSING
    }
  },

  onProxyRes(proxyRes, req) {
    console.log(`[img-proxy] RES ${req.method} ${req.url} -> ${proxyRes.statusCode}`);
  },
}));

app.listen(5175, () => console.log('IMG proxy on http://127.0.0.1:5175'));
