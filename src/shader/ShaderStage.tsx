import { useThree, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";

export default function ShaderStage() {
  const { gl, size } = useThree();
  const matRef = useRef<THREE.ShaderMaterial | null>(null);
  const pointer = useRef({ x: 0.5, y: 0.5, vx: 0, vy: 0, t: performance.now() });

  useEffect(() => {
    const el = gl.domElement;
    function onMove(e: PointerEvent) {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width;
      const y = 1 - (e.clientY - r.top) / r.height;
      const now = performance.now();
      const dt = Math.max((now - pointer.current.t) / 1000, 1e-3);
      const vx = (x - pointer.current.x) / dt;
      const vy = (y - pointer.current.y) / dt;
      pointer.current = { x, y, vx, vy, t: now };
    }
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, [gl]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0.5, 0.5) },
      uPointerVel: { value: new THREE.Vector2(0, 0) },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
    }),
    [size]
  );

  const vertexShader = `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `;

  const fragmentShader = `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime;
    uniform vec2  uPointer;
    uniform vec2  uPointerVel;
    void main() {
      float d = distance(vUv, uPointer);
      float ring = 1.0 - smoothstep(0.20, 0.22, d);
      float vel  = clamp(length(uPointerVel) * 0.05, 0.0, 1.0);
      vec3  col  = mix(vec3(0.1,0.2,0.6), vec3(1.0), ring);
      col += vel * 0.35;
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  useFrame((_, dt) => {
    uniforms.uTime.value += dt;
    uniforms.uPointer.value.set(pointer.current.x, pointer.current.y);
    uniforms.uPointerVel.value.set(pointer.current.vx, pointer.current.vy);
  });

  return (
    <mesh renderOrder={9999} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={matRef as any}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms as any}
        depthTest={false}
        depthWrite={false}
        transparent
        side={THREE.DoubleSide}
        toneMapped={false}
        fog={false}
      />
    </mesh>
  );
}
