// The game engine in the browser, for hosting without the Python server (GitHub Pages): Pyodide runs the
// same ravenhill package, published next to the page by tools/build_pages.py. The routes mirror
// ravenhill/server/app.py. Each case is kept in this browser as its seed and moves, and replayed after a reload.
import { loadJSON, store } from "./storage.js";

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";
const KEEP = 5;  // cases remembered in this browser

// run in Pyodide once the package is unpacked
const GLUE = `
import json, random
from ravenhill.game import Game
from ravenhill.server.state import game_state

GAMES = {}

def start(gid, seed, moves):
    """A case from its seed and moves so far (a new case has none)."""
    g = Game(random.Random(seed))
    for m in json.loads(moves):
        play(g, m)
    GAMES[gid] = g
    return json.dumps(game_state(gid, g))

def play(g, m):
    if m[0] == "act":
        g.act(m[1])
    else:
        {"interview": g.interview}[m[1]](m[2])

def move(gid, m):
    g = GAMES[gid]
    play(g, json.loads(m))
    return json.dumps(game_state(gid, g))

def state(gid):
    return json.dumps(game_state(gid, GAMES[gid]))

def known(gid):
    return gid in GAMES
`;

let ready = null;

function boot() {
  const note = document.createElement("div");
  note.className = "engine-loading";
  note.textContent = "Unpacking the case files…";
  document.body.append(note);
  ready = (async () => {
    const { loadPyodide } = await import(PYODIDE + "pyodide.mjs");
    const py = await loadPyodide({ indexURL: PYODIDE });
    const { zip } = await (await fetch("py/manifest.json", { cache: "no-cache" })).json();
    py.unpackArchive(await (await fetch("py/" + zip)).arrayBuffer(), "zip");
    py.runPython(GLUE);
    return py;
  })().finally(() => note.remove());
  return ready;
}

// Keys start with "ravenhill-": on GitHub Pages every repository of the account shares one origin.
const record = (gid) => loadJSON("ravenhill-case-" + gid, null);

function remember(gid, rec) {
  store("ravenhill-case-" + gid, JSON.stringify(rec));
  const ids = [gid, ...loadJSON("ravenhill-cases", []).filter((x) => x !== gid)];
  ids.slice(KEEP).forEach((old) => { try { localStorage.removeItem("ravenhill-case-" + old); } catch (e) { /* storage unavailable */ } });
  store("ravenhill-cases", JSON.stringify(ids.slice(0, KEEP)));
}

const call = (py, fn, ...args) => JSON.parse(py.globals.get(fn)(...args));
const randomHex = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => b.toString(16).padStart(2, "0")).join("");

// A case this browser knows but the engine has not loaded yet (after a reload): replay it.
function loaded(py, gid) {
  if (py.globals.get("known")(gid)) return true;
  const rec = record(gid);
  if (!rec) return false;
  call(py, "start", gid, rec.seed, JSON.stringify(rec.moves));
  return true;
}

// The API of ravenhill/server/app.py: the same paths and bodies, the same game states back.
export async function pyApi(path, body) {
  const py = await (ready || boot());
  const [route, query] = path.split("?");
  try {
    if (route === "/api/art") return {};  // no custom art without a server to list it
    if (route === "/api/state") {
      const gid = new URLSearchParams(query).get("id");
      if (!loaded(py, gid)) throw new Error("unknown game");
      return call(py, "state", gid);
    }
    if (route === "/api/new") {
      const gid = randomHex(), seed = body.seed ? Number(body.seed) : crypto.getRandomValues(new Uint32Array(1))[0];
      const s = call(py, "start", gid, seed, "[]");
      remember(gid, { seed, moves: [] });
      return s;
    }
    if (route === "/api/act" || route === "/api/tool") {
      if (!loaded(py, body.id)) throw new Error("unknown game");
      const m = route === "/api/act" ? ["act", Number(body.char)] : ["tool", body.tool, Number(body.char)];
      const s = call(py, "move", body.id, JSON.stringify(m));
      const rec = record(body.id) || { seed: null, moves: [] };
      rec.moves.push(m);
      remember(body.id, rec);
      return s;
    }
    throw new Error("not found");
  } catch (e) {
    // a Python error (an invalid move) arrives as a PythonError; keep only its last line
    throw new Error(String(e.message || e).trim().split("\n").pop());
  }
}
