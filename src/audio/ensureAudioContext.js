export function ensureAudioContext() {
  if (!window.__AUDIO_CTX__) {
    window.__AUDIO_CTX__ = new (window.AudioContext || window.webkitAudioContext)();
  }
  return window.__AUDIO_CTX__;
}
