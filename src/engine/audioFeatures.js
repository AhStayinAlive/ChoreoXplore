import Meyda from 'meyda';
import { BehaviorSubject } from 'rxjs';

export const audio$ = new BehaviorSubject({ rms: 0, energy: 0, centroid: 0, bpmish: 0 });

export async function attachAudio(el) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  const ctx = new Ctx();
  const src = el instanceof HTMLMediaElement ? ctx.createMediaElementSource(el)
                                           : ctx.createMediaStreamSource(el);
  let raf;
  
  const analyser = Meyda.createMeydaAnalyzer({
    audioContext: ctx, 
    source: src, 
    bufferSize: 1024,
    featureExtractors: ['rms', 'spectralCentroid'],
    callback: ({ rms, spectralCentroid }) => {
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const prev = audio$.value;
        const energy = prev.energy * 0.85 + (rms ?? 0) * 0.15;
        audio$.next({
          rms: rms ?? 0, 
          energy, 
          centroid: spectralCentroid ?? 0,
          bpmish: prev.bpmish * 0.98 + ((energy > prev.energy) ? 1 : 0) * 0.02
        });
      });
    }
  });
  
  analyser.start();
  
  return () => { 
    try { analyser.stop(); } catch {}
    if (raf) cancelAnimationFrame(raf); 
    try { ctx.close(); } catch {}
  };
}
