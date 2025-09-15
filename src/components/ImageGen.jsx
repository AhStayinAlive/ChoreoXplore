import { useState } from 'react'

const MODEL_CKPT = import.meta.env.VITE_SDXL_CKPT || 'v1-5-pruned-emaonly.ckpt'

function buildWorkflow(prompt, width = 512, height = 512) {
  return {
    '3': { class_type: 'CheckpointLoaderSimple', inputs: { ckpt_name: MODEL_CKPT } },
    '4': { class_type: 'CLIPTextEncode', inputs: { text: prompt, clip: ['3', 1] } },
    '5': { class_type: 'CLIPTextEncode', inputs: { text: '', clip: ['3', 1] } },
    '6': { class_type: 'EmptyLatentImage', inputs: { width, height, batch_size: 1 } },
    '7': { class_type: 'KSampler', inputs: {
      seed: Math.floor(Math.random()*1e9), steps: 12, cfg: 7, sampler_name: 'euler',
      scheduler: 'normal', denoise: 1, model: ['3',0], positive: ['4',0], negative: ['5',0], latent_image: ['6',0]
    }},
    '8': { class_type: 'VAEDecode', inputs: { samples: ['7',0], vae: ['3',2] } },
    '9': { class_type: 'SaveImage', inputs: { images: ['8',0], filename_prefix: 'cx_out' } },
  }
}

export default function ImageGen() {
  const [prompt, setPrompt] = useState('a dramatic silhouette of a dancer with flowing fabric, volumetric light, high contrast')
  const [imgUrl, setImgUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [size, setSize] = useState({ w: 512, h: 512 })
  const [log, setLog] = useState('')

  const generate = async () => {
    setBusy(true); setImgUrl(''); setLog('submit:start')
    try {
      const wf = buildWorkflow(prompt, size.w, size.h)
      const r = await fetch('/img/prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: wf, client_id: 'imagegen-panel' }),
      })
      if (!r.ok) throw new Error(`submit http ${r.status}`)
      const { prompt_id } = await r.json()
      setLog(`submit:ok ${prompt_id}`)

      let attempt = 0
      while (attempt++ < 120) {
        await new Promise(res => setTimeout(res, 1000))
        const h = await fetch(`/img/history/${prompt_id}`)
        if (!h.ok) throw new Error(`history http ${h.status}`)
        const hist = await h.json()
        setLog(`poll:${attempt}`)

        const run = hist?.history?.[prompt_id]
        const outputs = run?.outputs || {}
        const firstNodeId = Object.keys(outputs)[0]
        const images = firstNodeId ? (outputs[firstNodeId]?.images || []) : []

        if (images.length) {
          const { filename, subfolder = '', type = 'output' } = images[0]
          const qs = new URLSearchParams({ filename, subfolder, type }).toString()
          const url = `/img/view?${qs}`
          const head = await fetch(url, { method: 'HEAD' })
          if (!head.ok) throw new Error(`view http ${head.status}`)
          const blob = await (await fetch(url)).blob()
          setImgUrl(URL.createObjectURL(blob))
          setLog('done')
          return
        }
      }
      throw new Error('timeout:no_image')
    } catch (e) {
      setLog(String(e?.message || e))
      console.error(e)
      alert(e?.message || 'Image generation failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={4} />
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <label>W:<input type="number" value={size.w} onChange={e => setSize(s => ({...s, w:+e.target.value}))} style={{ width: 90, marginLeft: 6 }}/></label>
        <label>H:<input type="number" value={size.h} onChange={e => setSize(s => ({...s, h:+e.target.value}))} style={{ width: 90, marginLeft: 6 }}/></label>
        <button onClick={generate} disabled={busy}>{busy ? 'Generating…' : 'Generate Image'}</button>
      </div>
      {imgUrl && <img src={imgUrl} alt="generated" style={{ maxWidth: '100%', borderRadius: 8 }} />}
      {log && <div style={{ fontSize: 12, opacity: 0.7 }}>log: {log}</div>}
    </div>
  )
}
