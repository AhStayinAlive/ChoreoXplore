import { GOLDEN_ANGLE } from "./grammar";

export function placeGoldenOrbit(group, i, r, center = [0, 0, 0]) {
  const a = i * GOLDEN_ANGLE;
  group.position.set(center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r, 0);
}

export function placeGrid(group, i, cols = 6, gap = 140, origin = [-350, -220, 0]) {
  const r = Math.floor(i / cols), c = i % cols;
  group.position.set(origin[0] + c * gap, origin[1] + r * gap, origin[2]);
}

export function placeRadial(group, i, spokes = 12, radius = 260, center = [0, 0, 0]) {
  const a = (i % spokes) / spokes * Math.PI * 2;
  group.position.set(center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius, 0);
  group.rotation.z = a;
}

