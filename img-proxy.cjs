// img-proxy.cjs
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET = 'http://127.0.0.1:8188'; // ComfyUI

const app = express();
app.use(express.json({ limit: '20mb' }));

app.use('/img', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  pathRewrite: { '^/img': '' }, // /img/x -> /x
  onProxyReq(proxyReq, req) {
    // force same-origin so ComfyUI doesn't 403
    proxyReq.setHeader('origin', TARGET);
    proxyReq.setHeader('referer', TARGET + '/');

    // forward JSON body on POST /img/prompt
    if (req.body && typeof req.body === 'object') {
      const body = JSON.stringify(req.body);
      proxyReq.setHeader('content-type', 'application/json');
      proxyReq.setHeader('content-length', Buffer.byteLength(body));
      proxyReq.write(body);
    }
  },
}));

app.listen(5175, () => console.log('IMG proxy on http://127.0.0.1:5175'));

// img-proxy.cjs
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

const TARGET = 'http://127.0.0.1:8188'; // ComfyUI

const app = express();
app.use(express.json({ limit: '20mb' }));

app.use('/img', createProxyMiddleware({
  target: TARGET,
  changeOrigin: true,
  pathRewrite: { '^/img': '' }, // /img/x -> /x
  onProxyReq(proxyReq, req) {
    // Force same-origin headers so ComfyUI doesn't 403 us
    proxyReq.setHeader('origin', TARGET);
    proxyReq.setHeader('referer', TARGET + '/');

    // Ensure JSON body is forwarded (for POST /img/prompt)
    if (req.body && typeof req.body === 'object') {
      const body = JSON.stringify(req.body);
      proxyReq.setHeader('content-type', 'application/json');
      proxyReq.setHeader('content-length', Buffer.byteLength(body));
      proxyReq.write(body);
    }
  },
}));

app.listen(5175, () => console.log('IMG proxy on http://127.0.0.1:5175'));
