const CKPT = import.meta.env.VITE_SDXL_CKPT || 'v1-5-pruned-emaonly.ckpt';
const DEFAULT_POLL_INTERVAL_MS = Number(import.meta.env.VITE_COMFY_POLL_MS || 1000);
const DEFAULT_MAX_WAIT_MS = Number(import.meta.env.VITE_COMFY_MAX_WAIT_MS || (10 * 60 * 1000));

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function noop() {}

function buildWorkflow(text, { width=512, height=512, steps=12, seed }) {
  const s = seed ?? Math.floor(Math.random() * 1e12);
  return {
    "3": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CKPT } },
    "4": { class_type: "CLIPTextEncode", inputs: { text, clip: ["3", 1] } },
    "5": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["3", 1] } },
    "6": { class_type: "EmptyLatentImage", inputs: { width, height, batch_size: 1 } },
    "7": {
      class_type: "KSampler",
      inputs: {
        seed: s, steps, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1,
        model: ["3", 0], positive: ["4", 0], negative: ["5", 0], latent_image: ["6", 0]
      }
    },
    "8": { class_type: "VAEDecode", inputs: { samples: ["7", 0], vae: ["3", 2] } },
    "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "cx_out" } }
  };
}

export async function generateImageViaComfy(text, opts = {}) {
  const {
    width=512,
    height=512,
    steps=12,
    seed,
    onStatus=noop,
    pollIntervalMs=DEFAULT_POLL_INTERVAL_MS,
    maxWaitMs=DEFAULT_MAX_WAIT_MS,
  } = opts;

  onStatus(`submit:start`);
  const body = { prompt: buildWorkflow(text, { width, height, steps, seed }), client_id: `cx-${Date.now()}` };

  const res = await fetch(`/img/prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`submit: http ${res.status}`);
  const { prompt_id } = await res.json();
  onStatus(`submit:ok:${prompt_id}`);

  // poll history until an image appears
  const maxAttempts = Math.ceil(maxWaitMs / pollIntervalMs);
  let attempt = 0;
  while (attempt++ < maxAttempts) {
    await sleep(pollIntervalMs);
    const histRes = await fetch(`/img/history/${prompt_id}`);
    if (!histRes.ok) continue;
    const hist = await histRes.json();
    onStatus(`poll:${attempt}`);

    // ComfyUI may return either {outputs} or {history: { [id]: { outputs } }} depending on version
    const outputs = hist?.outputs || hist?.history?.[prompt_id]?.outputs || {};
    const nodeIds = Object.keys(outputs);
    if (nodeIds.length) {
      const node = outputs[nodeIds[0]];
      const imgs = node?.images || [];
      if (imgs.length) {
        const { filename, subfolder, type } = imgs[0];
        const url = `/img/view?filename=${encodeURIComponent(filename)}&subfolder=${encodeURIComponent(subfolder || '')}&type=${encodeURIComponent(type || 'output')}`;
        onStatus(`download:start`);
        const ok = await fetch(url, { method: 'HEAD' });
        if (!ok.ok) throw new Error(`download: http ${ok.status}`);
        onStatus(`download:ok`);
        return { url, prompt_id };
      }
    }
  }
  throw new Error('timeout:no_image');
}

