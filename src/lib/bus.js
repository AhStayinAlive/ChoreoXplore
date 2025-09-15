export function emitPreview(url) {
  window.dispatchEvent(new CustomEvent('cx:preview', { detail: { url } }));
}

export function onPreview(handler) {
  const fn = (e) => handler(e.detail.url);
  window.addEventListener('cx:preview', fn);
  return () => window.removeEventListener('cx:preview', fn);
}

