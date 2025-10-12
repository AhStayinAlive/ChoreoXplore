import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import useStore from "../core/store";

export function usePointerUniforms() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const el = gl.domElement;
    let last = { x: 0.5, y: 0.5, t: performance.now() };
    function onMove(e: PointerEvent) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height; // flip Y for shader UV
      const t = performance.now();
      const dt = Math.max((t - last.t) / 1000, 1e-3);
      const vx = (x - last.x) / dt;
      const vy = (y - last.y) / dt;
      last = { x, y, t };
      useStore.getState().setPointer({ x, y, vx, vy });
    }
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [gl]);
}
