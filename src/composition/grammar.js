export function grid(cols, rows, gap, origin = [0, 0, 0]) {
  const pts = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    pts.push([origin[0] + c * gap, origin[1] + r * gap, origin[2]]);
  }
  return pts;
}

export function radial(spokes, radius, center = [0, 0, 0]) {
  const pts = [];
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    pts.push([center[0] + Math.cos(a) * radius, center[1] + Math.sin(a) * radius, center[2]]);
  }
  return pts;
}

export const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
export function goldenOrbit(n, r, center = [0, 0, 0]) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = i * GOLDEN_ANGLE;
    pts.push([center[0] + Math.cos(a) * r, center[1] + Math.sin(a) * r, 0]);
  }
  return pts;
}

