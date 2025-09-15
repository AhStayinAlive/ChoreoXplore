import { useState } from 'react';

// NOTE: Set this to the exact filename found in ComfyUI/models/checkpoints
const SDXL_CKPT = import.meta.env.VITE_SDXL_CKPT || 'sd_xl_base_1.0.safetensors';

function buildWorkflow(prompt, width = 1024, height = 1024) {
  return {
    '3': {
      class_type: 'CheckpointLoaderSimple',
      inputs: { ckpt_name: SDXL_CKPT },
    },
    '4': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['3', 1] } },
    '5': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['3', 1] } },
    '6': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '7': {
      class_type: 'KSampler',
      inputs: {
        seed: Math.floor(Math.random() * 1e9),
        steps: 25,
        cfg: 6.5,
        sampler_name: 'euler',
        scheduler: 'normal',
        denoise: 1.0,
        model: ['3', 0],
        positive: ['4', 0],
        negative: ['5', 0],
        latent_image: ['6', 0],
      },
    },
    '8': { class_type: 'VAEDecode', inputs: { samples: ['7', 0], vae: ['3', 2] } },
    '9': { class_type: 'SaveImage', inputs: { images: ['8', 0], filename_prefix: 'cx_out' } },
  };
}

export default function ImageGen() {
  const [prompt, setPrompt] = useState(
    'a dramatic silhouette of a dancer with flowing fabric, volumetric light, high contrast'
  );
  const [imgUrl, setImgUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [size, setSize] = useState({ w: 1024, h: 1024 });

  const generate = async () => {
    setBusy(true);
    setImgUrl('');
    try {
      // 1) Send workflow
      const wf = buildWorkflow(prompt, size.w, size.h);
      const r = await fetch('/img/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: wf, client_id: 'choreox' }),
      });
      const { prompt_id } = await r.json();

      // 2) Poll history
      let history, tries = 0;
      do {
        await new Promise(res => setTimeout(res, 1200));
        const h = await fetch(`/img/history/${prompt_id}`);
        history = await h.json();
        tries++;
        if (tries > 60) throw new Error('Timeout waiting for image');
      } while (!history?.outputs || Object.keys(history.outputs).length === 0);

      // 3) Extract first image info
      const firstNode = history.outputs[Object.keys(history.outputs)[0]];
      const firstImage = firstNode.images?.[0];
      if (!firstImage) throw new Error('No image in history');

      // 4) Fetch image via /img/view
      const q = new URLSearchParams({
        filename: firstImage.filename,
        subfolder: firstImage.subfolder || '',
        type: firstImage.type || 'output',
      }).toString();

      const imgRes = await fetch(`/img/view?${q}`);
      const blob = await imgRes.blob();
      const url = URL.createObjectURL(blob);
      setImgUrl(url);
    } catch (e) {
      console.error(e);
      alert(e.message || 'Image generation failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={4}
        placeholder="Describe the visual you want…"
        style={{ width: '100%', padding: 8, borderRadius: 8 }}
      />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>W:
          <input type="number" value={size.w} onChange={e => setSize(s => ({...s, w: +e.target.value}))} style={{ width: 90, marginLeft: 6 }}/>
        </label>
        <label>H:
          <input type="number" value={size.h} onChange={e => setSize(s => ({...s, h: +e.target.value}))} style={{ width: 90, marginLeft: 6 }}/>
        </label>
        <button onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate Image'}</button>
      </div>
      {imgUrl && <img src={imgUrl} alt="generated" style={{ maxWidth: '100%', borderRadius: 8 }} />}
    </div>
  );
}

