export function computeMotionFeatures(pose) {
  if (!pose || !pose.landmarks || pose.landmarks.length < 29) {
    return { elbowL: 0, elbowR: 0, kneeL: 0, kneeR: 0, armSpan: 0, speed: 0, sharpness: 0 };
  }

  const S = (i) => pose.landmarks[i];
  const L = { shoulder: S(11), elbow: S(13), wrist: S(15), hip: S(23), knee: S(25), ankle: S(27) };
  const R = { shoulder: S(12), elbow: S(14), wrist: S(16), hip: S(24), knee: S(26), ankle: S(28) };

  // Calculate angles
  const angle = (a, b, c) => {
    const ab = { x: b.x - a.x, y: b.y - a.y };
    const cb = { x: b.x - c.x, y: b.y - c.y };
    const dot = ab.x * cb.x + ab.y * cb.y;
    const magAB = Math.hypot(ab.x, ab.y);
    const magCB = Math.hypot(cb.x, cb.y);
    const cosAngle = dot / (magAB * magCB + 1e-6);
    return Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  };

  const elbowL = angle(L.shoulder, L.elbow, L.wrist);
  const elbowR = angle(R.shoulder, R.elbow, R.wrist);
  const kneeL = angle(L.hip, L.knee, L.ankle);
  const kneeR = angle(R.hip, R.knee, R.ankle);

  // Calculate arm span
  const shoulderSpan = Math.hypot(R.shoulder.x - L.shoulder.x, R.shoulder.y - L.shoulder.y);
  const bodyHeight = Math.hypot(
    ((L.hip.x + R.hip.x) / 2 - (L.shoulder.x + R.shoulder.x) / 2),
    ((L.hip.y + R.hip.y) / 2 - (L.shoulder.y + R.shoulder.y) / 2)
  ) + 1e-6;
  const wristSpan = Math.hypot(R.wrist.x - L.wrist.x, R.wrist.y - L.wrist.y);
  const armSpan = (wristSpan + shoulderSpan) / (2 * bodyHeight);

  // Calculate sharpness (how close angles are to 180 degrees)
  const joints = [elbowL, elbowR, kneeL, kneeR];
  const sharpness = joints
    .map(a => 1 - Math.min(1, Math.abs(Math.PI - a) / Math.PI))
    .reduce((s, v) => s + v, 0) / joints.length;

  return { elbowL, elbowR, kneeL, kneeR, armSpan, speed: 0, sharpness };
}
