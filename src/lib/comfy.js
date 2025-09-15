const CKPT = import.meta.env.VITE_SDXL_CKPT || 'v1-5-pruned-emaonly.ckpt';

// CPU-friendly SD1.5 workflow, 512x512 by default
function buildWorkflow(prompt, w = 512, h = 512, steps = 12) {
  return {
    "3": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: CKPT } },
    "4": { class_type: "CLIPTextEncode", inputs: { text: prompt, clip: ["3", 1] } },
    "5": { class_type: "CLIPTextEncode", inputs: { text: "", clip: ["3", 1] } },
    "6": { class_type: "EmptyLatentImage", inputs: { width: w, height: h, batch_size: 1 } },
    "7": {
      class_type: "KSampler",
      inputs: {
        seed: Math.floor(Math.random() * 1e9),
        steps, cfg: 7, sampler_name: "euler", scheduler: "normal", denoise: 1.0,
        model: ["3", 0], positive: ["4", 0], negative: ["5", 0], latent_image: ["6", 0],
      }
    },
    "8": { class_type: "VAEDecode", inputs: { samples: ["7", 0], vae: ["3", 2] } },
    "9": { class_type: "SaveImage", inputs: { images: ["8", 0], filename_prefix: "cx_out" } },
  };
}

/**
 * Generate one image via ComfyUI.
 * @param {string} prompt
 * @param {{width?:number,height?:number,steps?:number,onStatus?:(s:string)=>void}} opts
 * @returns {Promise<{url:string, meta:any}>}
 */
export async function generateImageViaComfy(prompt, opts = {}) {
  const { width = 512, height = 512, steps = 12, onStatus } = opts;
  const log = (s) => { onStatus?.(s); console.log('[ComfyUI]', s); };

  log('submit:start');
  const submit = await fetch('/img/prompt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: buildWorkflow(prompt, width, height, steps), client_id: 'cx' }),
  });
  if (!submit.ok) throw new Error(`submit failed: ${submit.status}`);
  const { prompt_id } = await submit.json();
  log(`submit:ok prompt_id=${prompt_id}`);

  // Poll history
  let history;
  let tries = 0;
  while (true) {
    await new Promise(r => setTimeout(r, 1200));
    const h = await fetch(`/img/history/${prompt_id}`);
    if (!h.ok) { tries++; if (tries > 60) throw new Error('history timeout'); continue; }
    history = await h.json();
    log(`poll:${tries}`);
    if (history?.outputs && Object.keys(history.outputs).length) break;
    tries++;
    if (tries > 60) throw new Error('history timeout');
  }

  // Extract first image ref
  const firstNode = history.outputs[Object.keys(history.outputs)[0]];
  const firstImage = firstNode?.images?.[0];
  if (!firstImage) throw new Error('no image in history');

  const params = new URLSearchParams({
    filename: firstImage.filename,
    subfolder: firstImage.subfolder || '',
    type: firstImage.type || 'output',
  }).toString();

  log('download:start');
  const imgRes = await fetch(`/img/view?${params}`);
  if (!imgRes.ok) throw new Error(`download failed: ${imgRes.status}`);
  const blob = await imgRes.blob();
  const url = URL.createObjectURL(blob);
  log('download:ok');

  return { url, meta: { prompt_id, firstImage } };
}

