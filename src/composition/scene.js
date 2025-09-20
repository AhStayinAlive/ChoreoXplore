import { clampStroke } from "./constraints";

export function buildScene(api) {
  const nodes = [];

  function mkLine(id, { length = 360, angle = 45, color = "#EDEEF2", stroke = 2, pos = [0, 0, 0] }) {
    const obj = api.addLine({ length, angle, color, stroke, pos });
    const node = {
      id,
      apply(path, value) {
        if (path === "style.stroke.px") {
          const child = obj.children[0];
          if (child) {
            const base = child.userData?.baseHeight || 1;
            const target = clampStroke(value);
            child.scale.y = Math.max(0.0001, target / base);
          }
        }
        if (path === "transforms.rotate.z") {
          obj.rotation.z = value * Math.PI / 180;
        }
      },
    };
    nodes.push(node);
  }

  mkLine("lnA", { length: 420, angle: 45, color: "#EDEEF2", stroke: 2, pos: [-200, 0, 0] });
  mkLine("lnB", { length: 420, angle: -45, color: "#5FA8FF", stroke: 2, pos: [200, 0, 0] });

  return nodes;
}

