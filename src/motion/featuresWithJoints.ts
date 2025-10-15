export type MPPoint = { x: number; y: number; visibility?: number };

const IDX = { nose:0, lSh:11, rSh:12, lEl:13, rEl:14, lWr:15, rWr:16, lHip:23, rHip:24, lKn:25, rKn:26, lAn:27, rAn:28 } as const;

type Picked2D = { x: number; y: number; v: number };
const pick2D = (p?: MPPoint): Picked2D => ({ x: p?.x ?? 0.5, y: p?.y ?? 0.5, v: p?.visibility ?? 0 });

export function featuresWithJoints(
  pose: { landmarks: MPPoint[] },
  dt: number,
  computeMotionFeatures: (pose: any) => any
) {
  const f = computeMotionFeatures(pose);
  const L = (i: number) => pose.landmarks?.[i];

  const joints2D = {
    head: pick2D(L(IDX.nose)),
    shoulders: { l: pick2D(L(IDX.lSh)), r: pick2D(L(IDX.rSh)) },
    elbows:    { l: pick2D(L(IDX.lEl)), r: pick2D(L(IDX.rEl)) },
    hands:     { l: pick2D(L(IDX.lWr)), r: pick2D(L(IDX.rWr)) },
    hips:      { l: pick2D(L(IDX.lHip)), r: pick2D(L(IDX.rHip)) },
    knees:     { l: pick2D(L(IDX.lKn)), r: pick2D(L(IDX.rKn)) },
    ankles:    { l: pick2D(L(IDX.lAn)), r: pick2D(L(IDX.rAn)) },
  };

  return { ...f, joints2D, dt };
}
