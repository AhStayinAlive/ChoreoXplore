import useStore from "../core/store";

export function snapAngle(deg) {
  const { constraints: { allowedAngles } } = useStore.getState();
  return allowedAngles.reduce((best, a) => Math.abs(a - deg) < Math.abs(best - deg) ? a : best, allowedAngles[0]);
}

export function clampStroke(px) {
  const { constraints: { strokePx: [min, max] } } = useStore.getState();
  return Math.max(min, Math.min(max, px));
}

