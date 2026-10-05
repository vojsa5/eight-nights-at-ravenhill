// The game engine's own thread (pyengine.js): Pyodide starts here and runs the ravenhill package, so the page stays
// live meanwhile. Starting Pyodide takes seconds on a phone, and on the page's thread it would freeze the opening
// screen and every tap for as long.
// In: { id, boot: { index, manifest, glue } } once, then { id, fn, args } for a function of the glue. Out: { id, result } or { id, error }.
let py = null;

async function boot({ index, manifest, glue }) {
  importScripts(index + "pyodide.js");
  // the package comes while Pyodide starts; a missing one fails below, once Pyodide is up, as it always did
  const pkg = fetch(manifest, { cache: "no-cache" }).then(async (r) => {
    if (!r.ok) throw new Error("The game engine is not here: open the page from the static build (README.md, Play online).");
    const { zip } = await r.json();
    return (await fetch(new URL(zip, manifest))).arrayBuffer();
  });
  pkg.catch(() => {});
  py = await loadPyodide({ indexURL: index });
  py.unpackArchive(await pkg, "zip");
  py.runPython(glue);
}

onmessage = async ({ data: { id, boot: options, fn, args } }) => {
  try {
    postMessage({ id, result: options ? await boot(options) : py.globals.get(fn)(...args) });
  } catch (e) {
    postMessage({ id, error: String(e.message || e) });
  }
};
