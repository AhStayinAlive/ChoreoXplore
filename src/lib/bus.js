const subs = new Set();

export function emitPreview(url) {
  for (const fn of subs) fn(url);
}

export function onPreview(fn) {
  subs.add(fn);
  return () => subs.delete(fn);
}

