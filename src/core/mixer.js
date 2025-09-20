import * as THREE from "three";
import useStore from "./store";
import { createPool } from "./pool";
import { listBlueprints, getBlueprint } from "./assets";
import { placeGoldenOrbit, placeGrid, placeRadial } from "../composition/recipes";

const WEIGHTS = {
  low:   ["line.diagonal","square.basic","angle.right"],
  mid:   ["triangle.equi","circle.basic","line.curve"],
  high:  ["cube.basic","sphere.basic","pyramid.tetra"],
};

function pickByBand(bands) {
  const [L, M, H] = bands;
  const arr = (H > M && H > L) ? WEIGHTS.high : (M > L ? WEIGHTS.mid : WEIGHTS.low);
  const candidates = listBlueprints((b) => arr.includes(b.typeId || b.id));
  return candidates.length ? candidates[Math.floor(Math.random() * candidates.length)].id : null;
}

export function createMixer(api) {
  const pool = createPool(
    () => {
      const g = new THREE.Group();
      g.userData = { life: 1, decay: 0.2, type: "line" };
      api.root.add(g);
      return g;
    },
    (g) => { g.visible = false; g.userData.life = 1; g.clear(); }
  );

  let spawnIndex = 0;

  function modLen(base, signal) {
    const n = base * (0.7 + signal.rms * 0.8);
    return THREE.MathUtils.clamp(n, 24, 1920);
  }

  function pickColor() {
    const pal = useStore.getState().palette || ["#EDEEF2", "#5FA8FF", "#FF5136"];
    const i = Math.floor(Math.random() * pal.length);
    return new THREE.Color(pal[i]);
  }

  function makeVisualFromBlueprint(id, signal) {
    const bp = getBlueprint(id);
    if (!bp) return null;
    const g = pool.acquire();
    g.visible = true;
    g.clear();

    if (bp.type === "line") {
      const len = modLen(bp.params?.length_px ?? 360, signal);
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-len / 2, 0, 0),
        new THREE.Vector3(len / 2, 0, 0),
      ]);
      const stroke = 2 + (signal.bands[0] * 6);
      const mat = new THREE.LineBasicMaterial({ color: pickColor(), linewidth: stroke });
      g.add(new THREE.Line(geo, mat));
      g.rotation.z = (bp.params?.angle_deg ?? 45) * Math.PI / 180;
      g.userData.type = "line";
    } else if (bp.type === "square" || bp.type === "triangle" || bp.type === "circle") {
      const size = modLen((bp.params?.side_px || bp.params?.radius_px || 140), signal);
      let geom;
      if (bp.type === "square") geom = new THREE.PlaneGeometry(size, size);
      if (bp.type === "triangle") geom = new THREE.CircleGeometry(size, 3);
      if (bp.type === "circle") geom = new THREE.CircleGeometry(size, 64);
      const mat = new THREE.MeshBasicMaterial({ color: pickColor(), transparent: true, opacity: 0.9 });
      g.add(new THREE.Mesh(geom, mat));
      g.userData.type = "shape";
    } else {
      const size = modLen((bp.params?.size_px || bp.params?.radius_px || 90), signal) / 100;
      let geom;
      if (bp.type === "cube") geom = new THREE.BoxGeometry(size, size, size);
      if (bp.type === "sphere") geom = new THREE.SphereGeometry(size, 16, 12);
      if (bp.type === "pyramid") geom = new THREE.ConeGeometry(size, size * 1.3, 4);
      const mat = new THREE.MeshBasicMaterial({ color: pickColor(), wireframe: true, opacity: 0.9, transparent: true });
      g.add(new THREE.Mesh(geom, mat));
      g.userData.type = "mesh";
    }

    const c = signal.centroid;
    const pose = signal.pose;
    const bboxScale = Math.min(1, (pose?.bboxArea || 0.2) * 4);
    const recipe = c < 0.33 ? "grid" : c < 0.66 ? "radial" : "golden";

    if (recipe === "grid") placeGrid(g, spawnIndex, 6, 120 * (0.6 + bboxScale * 0.6));
    if (recipe === "radial") placeRadial(g, spawnIndex, 12, 200 * (0.7 + bboxScale * 0.5));
    if (recipe === "golden") placeGoldenOrbit(g, spawnIndex, 260 * (0.7 + bboxScale * 0.6));
    spawnIndex++;

    const axis = (pose?.shoulderAxisDeg ?? 0);
    g.rotation.z += THREE.MathUtils.degToRad(axis * 0.3);

    g.userData.life = 1.0;
    g.userData.decay = 0.15 + signal.rms * 0.8;
    return g;
  }

  return {
    trySpawn(signal) {
      if (!signal.onset) return;
      const id = pickByBand(signal.bands);
      if (!id) return;
      makeVisualFromBlueprint(id, signal);
    },
    update(dt, signal) {
      const hi = signal?.bands?.[2] ?? 0;
      pool.forEach((g) => {
        g.userData.life -= g.userData.decay * dt;
        const alive = g.userData.life > 0;
        if (!alive) return pool.release(g);
        g.rotation.z += dt * (0.2 * hi * 0.5);
        g.traverse((o) => {
          if (o.material && "opacity" in o.material) {
            o.material.opacity = Math.max(0, Math.min(1, g.userData.life));
            o.material.transparent = true;
            o.material.needsUpdate = true;
          }
        });
      });
    },
  };
}

