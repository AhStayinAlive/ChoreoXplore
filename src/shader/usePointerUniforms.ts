import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import useStore from "../core/store";

export function usePointerUniforms() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    let last = { x: 0.5, y: 0.5, t: performance.now() };
    function onMove(e: PointerEvent) {
      // normalize to the canvas rect even if pointer is over UI
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1 - (e.clientY - rect.top) / rect.height; // flip Y to UV
      const now = performance.now();
      const dt = Math.max((now - last.t) / 1000, 1e-3);
      const vx = (x - last.x) / dt;
      const vy = (y - last.y) / dt;
      last = { x, y, t: now };
      useStore.getState().setPointer({ x, y, vx, vy });
    }
    // listen on window so overlays can’t block the event
    window.addEventListener("pointermove", onMove, { passive: true } as any);
    return () => window.removeEventListener("pointermove", onMove as any);
  }, [gl]);
}
