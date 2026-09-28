// Calls to the local game server (ravenhill/server/app.py).

export function api(path, body) {
  const opts = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  return fetch(path, opts).then((r) => r.json()).then((j) => {
    if (j.error) throw new Error(j.error);
    return j;
  });
}
