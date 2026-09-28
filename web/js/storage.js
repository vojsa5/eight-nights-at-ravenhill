// Per-browser conveniences (theme, notes, the current game). Storage can be unavailable, so never throw.

export function store(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { /* storage unavailable */ }
}

export function load(key) {
  try { return localStorage.getItem(key); } catch (e) { return null; }
}

export function loadJSON(key, fallback) {
  try { return JSON.parse(load(key)) || fallback; } catch (e) { return fallback; }
}
