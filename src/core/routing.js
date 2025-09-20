import useStore from "./store";
import { clamp } from "./signals";

export function applyRoutes({ audio, pose }) {
  const { routes, sceneNodes, reactivity } = useStore.getState();
  if (!reactivity?.enabled) return;
  routes.forEach((r) => {
    let val = pickSourceValue(r.source, { audio, pose });
    if (r.source.kind === "audio") val *= reactivity.audioGain ?? 1;
    if (r.source.kind === "pose") val *= reactivity.poseGain ?? 1;
    const mapped = applyMapping(val, r.mapping);
    setNodePath(sceneNodes, r.target.nodeId, r.target.path, mapped);
  });
}

function pickSourceValue(src, { audio, pose }) {
  if (src.kind === "audio") {
    if (src.key === "rms") return audio.rms;
    if (src.key === "onset") return audio.onset ? 1 : 0;
    if (src.key === "spectral_centroid") return audio.centroid;
    if (src.key === "band_low") return audio.bands[0];
    if (src.key === "band_mid") return audio.bands[1];
    if (src.key === "band_hi") return audio.bands[2];
  }
  if (src.kind === "pose") {
    if (src.key === "shoulder_axis_deg") return (pose.shoulderAxisDeg + 30) / 60;
    if (src.key === "bbox_area_norm") return pose.bboxArea;
    if (src.key === "wrist_y") return 1 - (pose.wrists?.y ?? 0.5);
  }
  return 0;
}

function applyMapping(v, m) {
  const scale = m?.scale ?? 1;
  let x = v * scale + (m?.offset ?? 0);
  if (m?.clamp) x = clamp(x, m.clamp[0], m.clamp[1]);
  return x;
}

function setNodePath(nodes, id, path, value) {
  const node = nodes.find((n) => n.id === id);
  if (node?.apply) node.apply(path, value);
}

