export function ema(prev, curr, alpha = 0.25) { return prev + alpha * (curr - prev); }
export function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
export function map01(v, outMin, outMax) { return outMin + clamp(v, 0, 1) * (outMax - outMin); }
export function hysteresis(flag, lastAt, minGapMs) { const now = performance.now(); return flag && (now - lastAt > minGapMs); }

