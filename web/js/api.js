// Calls to the game engine: the local Python server (ravenhill/server/app.py) when the page comes from it,
// otherwise the same engine running in the browser (pyengine.js), as on GitHub Pages.

let backend = null;  // resolves to "server" or "browser"

function detect() {
  backend = backend || fetch("/api/art")
    .then((r) => (r.ok && (r.headers.get("Content-Type") || "").includes("json") ? "server" : "browser"))
    .catch(() => "browser");
  return backend;
}

export async function api(path, body) {
  if ((await detect()) === "browser") return (await import("./pyengine.js")).pyApi(path, body || {});
  const opts = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : {};
  const j = await (await fetch(path, opts)).json();
  if (j.error) throw new Error(j.error);
  return j;
}
