import JSZip from "jszip";

const cache = { packs: {}, blueprints: {} };

export async function loadAnglesPack(fileOrUrl) {
  try {
    if (typeof fileOrUrl === "string") {
      // Folder mode: load manifest.json and known component files
      if (fileOrUrl.endsWith("/manifest.json")) {
        const base = fileOrUrl.replace(/manifest\.json$/, "");
        const res = await fetch(fileOrUrl);
        const manifest = await res.json();

        // Fallback file list for the sample pack served from /public
        const files = [
          "components/line.diagonal.json",
          "components/line.curve.json",
          "components/square.basic.json",
          "components/triangle.equi.json",
          "components/circle.basic.json",
          "components/cube.basic.json",
          "components/sphere.basic.json",
          "components/pyramid.tetra.json",
        ];
        const comps = {};
        for (const rel of files) {
          const url = base + rel;
          const r = await fetch(url);
          if (!r.ok) continue;
          const json = await r.json();
          comps[json.id] = json;
          cache.blueprints[json.id] = json;
        }
        cache.packs[manifest.id] = { manifest, comps };
        return cache.packs[manifest.id];
      }

      // Zip mode: fetch zip and parse
      const resp = await fetch(fileOrUrl);
      const buf = await resp.arrayBuffer();
      const zip = new JSZip();
      const z = await zip.loadAsync(buf);
      const manifest = JSON.parse(await z.file("manifest.json").async("string"));
      const comps = {};
      const entries = Object.keys(z.files).filter((p) => p.startsWith("components/") && p.endsWith(".json"));
      for (const p of entries) {
        const json = JSON.parse(await z.file(p).async("string"));
        comps[json.id] = json;
        cache.blueprints[json.id] = json;
      }
      cache.packs[manifest.id] = { manifest, comps };
      return cache.packs[manifest.id];
    }

    // File object mode (zip file)
    const data = await fileOrUrl.arrayBuffer();
    const zip = new JSZip();
    const z = await zip.loadAsync(data);
    const manifest = JSON.parse(await z.file("manifest.json").async("string"));
    const comps = {};
    const entries = Object.keys(z.files).filter((p) => p.startsWith("components/") && p.endsWith(".json"));
    for (const p of entries) {
      const json = JSON.parse(await z.file(p).async("string"));
      comps[json.id] = json;
      cache.blueprints[json.id] = json;
    }
    cache.packs[manifest.id] = { manifest, comps };
    return cache.packs[manifest.id];
  } catch (err) {
    // leave cache as-is on failure; return null to indicate no pack
    return null;
  }
}

export function getBlueprint(id) {
  return cache.blueprints[id];
}

export function listBlueprints(filterFn = () => true) {
  return Object.values(cache.blueprints).filter(filterFn);
}

