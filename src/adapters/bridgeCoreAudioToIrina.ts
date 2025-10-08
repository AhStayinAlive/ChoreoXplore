import { useVisStore } from "../state/useVisStore";

export function startCoreAudioBridge(){
  let stop: any;

  (async () => {
    try {
      // @ts-ignore
      const mod = await import("../core/audio");
      // 1) RxJS BehaviorSubject export
      // @ts-ignore
      if (mod.audio$?.subscribe) {
        stop = mod.audio$.subscribe((m:any)=>useVisStore.getState().setMusic(map(m)));
        return;
      }
      // Other shapes skipped for now; no-ops if not found
    } catch {}
  })();

  return ()=>{ try{ stop?.unsubscribe?.() }catch{} try{ stop?.() }catch{} };
}

function map(x:any){
  return {
    rms: x?.rms ?? x?.level ?? 0,
    energy: x?.energy ?? x?.level ?? 0,
    centroid: x?.centroid ?? 0,
    bpmish: x?.bpmish ?? 0,
  };
}

