import { useEffect } from "react";
import useStore from "../core/store";

export default function RoutingFlow() {
  const routes = useStore(s => s.routes);
  const setRoutes = useStore(s => s.setRoutes);

  useEffect(() => {
    if (!routes?.length) {
      setRoutes([
        { id: "r1", source: { kind: "audio", key: "rms" }, target: { nodeId: "lnA", path: "transforms.rotate.z" }, mapping: { scale: 25, clamp: [-25, 25] } },
        { id: "r2", source: { kind: "audio", key: "band_low" }, target: { nodeId: "lnB", path: "style.stroke.px" }, mapping: { scale: 8, clamp: [1, 8] } },
      ]);
    }
  }, [routes, setRoutes]);

  return (
    <div style={{ fontSize: 12 }}>
      <div style={{ marginBottom: 8, fontWeight: 600 }}>Routing</div>
      {(routes || []).map((r) => (
        <div key={r.id} style={{ marginBottom: 6, opacity: 0.8 }}>
          <code>{r.source.kind}:{r.source.key}</code> 					 		 					 		 		 		 → <code>{r.target.nodeId}.{r.target.path}</code>
        </div>
      ))}
      <div style={{ marginTop: 8, opacity: 0.6 }}>Drag UI coming next; hardcoded 2 routes for MVP.</div>
    </div>
  );
}

