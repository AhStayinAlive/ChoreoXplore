ChoreoXplore – Handover & Runbook

This repo is a Vite + React app that:

Chats with LM Studio via /api/chat.

Generates images through ComfyUI (Stable Diffusion 1.5) via /img/*.

Pushes the generated image into the Preview pane and logs all steps in the Jobs panel.

The notes below are everything your teammates need to get it running reliably on Windows (CPU). If you have an NVIDIA GPU and a CUDA build of PyTorch, it will be faster, but CPU works.

0) Requirements

Windows 10/11

Python 3.11.x (installed on PATH)

Node.js ≥ 18 + npm

LM Studio (optional but recommended; for text chat)

ComfyUI (source) checked out to
C:\Users\<you>\Documents\ComfyUI-src

Tip: if you used ComfyUI’s “electron” build already, you can still run the source build in a separate folder for API access.

1) Install & Start ComfyUI (CPU)

Open PowerShell and create/activate a venv:

cd $env:USERPROFILE\Documents\ComfyUI-src
python -m venv .venv
.\.venv\Scripts\Activate.ps1


Install Python deps:

.\.venv\Scripts\python.exe -m pip install --upgrade pip
.\.venv\Scripts\python.exe -m pip install -r requirements.txt


Download an SD-1.5 model in .safetensors format (do not use .ckpt):

Example filename: v1-5-pruned-emaonly.safetensors

Place it at:

C:\Users\<you>\Documents\ComfyUI-src\models\checkpoints\v1-5-pruned-emaonly.safetensors


Start ComfyUI (CPU + CORS enabled):

.\.venv\Scripts\python.exe main.py --listen 127.0.0.1 --port 8188 --cpu --enable-cors-header


Leave this window open. You should see:

To see the GUI go to: http://127.0.0.1:8188


Why .safetensors? New PyTorch blocks unsafe pickle .ckpt models by default, which causes “weights_only load failed” and no images. .safetensors avoids that.

2) LM Studio (for “Ask AI”)

Open LM Studio → Server tab → start the local server at http://127.0.0.1:1234
.

Load a model (e.g., meta-llama-3.1-8b-instruct) and make it available to the server.

3) App Setup

In the project root, create .env.local with:

# LM Studio (chat)
AI_PROVIDER=local
AI_BASE_URL=http://127.0.0.1:1234/v1
AI_API_KEY=lm-studio
AI_MODEL=meta-llama-3.1-8b-instruct

# SD1.5 checkpoint filename (exactly as in models/checkpoints)
VITE_SDXL_CKPT=v1-5-pruned-emaonly.safetensors


vite.config.js already proxies both LM Studio and ComfyUI:

// /api/* -> LM Studio 127.0.0.1:1234
// /img/* -> ComfyUI 127.0.0.1:8188 (rewrite /img -> /)
server: {
  proxy: {
    '/api/chat': { target: 'http://127.0.0.1:1234', changeOrigin: true, rewrite: () => '/v1/chat/completions' },
    '/api/models': { target: 'http://127.0.0.1:1234', changeOrigin: true, rewrite: () => '/v1/models' },
    '/img':       { target: 'http://127.0.0.1:8188', changeOrigin: true, rewrite: p => p.replace(/^\/img/, '') },
  }
}


We rely on the CORS-enabled ComfyUI you started above, so we can proxy directly to 8188 and avoid 403s.

Install and start the app:

npm install
npm run dev


Visit http://localhost:5173

If you need a standalone helper proxy, img-proxy.cjs exists; but when ComfyUI is started with --enable-cors-header, the Vite proxy alone is enough.

4) How to Use

In the app, the right sidebar Jobs has an Image Generator section.

Type a prompt (e.g., “dreamy sunny warm”), keep 512×512 at first.

Click Generate.

Watch the job log:

submit:start → submit:ok → poll:n → download:start → download:ok

When done, the image becomes the Preview background.

CPU note: The first generation is slow (model load + warm-up). We allow long polling by default. For quick tests, try 256×256 / 4–6 steps.