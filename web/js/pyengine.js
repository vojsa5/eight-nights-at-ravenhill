// The game engine in the browser, for hosting without the Python server (GitHub Pages): Pyodide runs the
// same ravenhill package, published next to the page by tools/build_pages.py. The routes mirror
// ravenhill/server/app.py. It plays only the shared case (shared.js), which is kept online.
import { CLOSED, addMoves, readCase, sharedCase, startCase, theCase } from "./shared.js";

const PYODIDE = "https://cdn.jsdelivr.net/pyodide/v0.29.5/full/";

// run in Pyodide once the package is unpacked
const GLUE = `
import json, random
from ravenhill.game import Game
from ravenhill.server.state import game_state

GAMES = {}

def start(gid, seed, moves):
    """A case from its seed and moves so far (a new case has none). A move the case cannot take, which only
    someone writing into a shared case by hand could have saved, is passed over."""
    g = Game(random.Random(seed))
    for m in json.loads(moves):
        try:
            play(g, m)
        except (ValueError, KeyError, TypeError, IndexError):
            pass
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
    const manifest = await fetch("py/manifest.json", { cache: "no-cache" });
    if (!manifest.ok) throw new Error("The game engine is not here: open the page from the static build (README.md, Play online).");
    const { zip } = await manifest.json();
    py.unpackArchive(await (await fetch("py/" + zip)).arrayBuffer(), "zip");
    py.runPython(GLUE);
    return py;
  })().finally(() => note.remove());
  return ready;
}

const call = (py, fn, ...args) => JSON.parse(py.globals.get(fn)(...args));
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
// The moves of a request: one, or on the last night two (the guest who goes free, then the accused).
const asMoves = (route, body) => (route === "/api/act" ? (body.chars || [body.char]).map((c) => ["act", Number(c)])
  : [["tool", body.tool, Number(body.char)]]);

// The API of ravenhill/server/app.py: the same paths and bodies, the same game states back.
export async function pyApi(path, body) {
  const [route] = path.split("?");
  if (route === "/api/art") return {};  // no custom art without a server to list it
  if (!(await theCase())) throw new Error(CLOSED);  // the shared case is the only one
  const py = await (ready || boot());
  try {
    return await sharedApi(py, route, body);
  } catch (e) {
    // a Python error (an invalid move) arrives as a PythonError; keep only its last line
    throw new Error(String(e.message || e).trim().split("\n").pop());
  }
}

// The shared case: the record online is the truth. Whenever it has moved on (played in another browser) the engine
// replays it, and a move counts only once it is saved there. The page sends how many moves it has seen (`n`): when that
// is not the case as saved, the state comes back with `stale` and the move asked for is not made. Calls run one at a
// time, so the engine never holds a move that is not saved yet. The state also brings the notes saved with the case.
let played = null;  // the record the engine last replayed, as JSON
let queue = Promise.resolve();

const key = (seed, moves) => JSON.stringify([seed, moves]);
const count = (s) => s.history.length + s.interviews.length;

function replay(py, rec) {
  call(py, "start", sharedCase, rec.seed, JSON.stringify(rec.moves));
  played = key(rec.seed, rec.moves);
}

async function sync(py) {
  let rec = await readCase();
  if (!rec) {
    await startCase(randomSeed());  // false when another browser started the case first: its seed is the one
    rec = await readCase();
    if (!rec) throw new Error("Could not open the shared case. Try again in a moment.");
  }
  if (key(rec.seed, rec.moves) !== played) replay(py, rec);
  return rec;
}

const withNotes = (s, rec) => ({ ...s, notes: rec.notes, read: rec.read });

function sharedApi(py, route, body) {
  const run = queue.then(() => sharedCall(py, route, body));
  queue = run.catch(() => {});  // the caller sees the error; the next call still runs
  return run;
}

async function sharedCall(py, route, body) {
  if (route === "/api/state") {
    const rec = await sync(py);
    return withNotes(call(py, "state", sharedCase), rec);
  }
  if (route === "/api/act" || route === "/api/tool") {
    const rec = await sync(py), now = call(py, "state", sharedCase);
    if (body.n !== count(now)) return { ...withNotes(now, rec), stale: true };
    const ms = asMoves(route, body);
    let s, saved;
    try {
      for (const m of ms) s = call(py, "move", sharedCase, JSON.stringify(m));  // an invalid move fails here, before anything is saved
      saved = await addMoves(rec.next, ms);
    } catch (e) {
      replay(py, rec);  // not saved: take the moves back
      throw e;
    }
    if (!saved) {  // another browser saved a move first
      played = null;  // the engine has made these moves: replay what is saved instead
      const later = await sync(py);
      if (later.next === rec.next) throw new Error("The case file refused the move: check the database rules (README.md, A shared case).");
      return { ...withNotes(call(py, "state", sharedCase), later), stale: true };
    }
    played = key(rec.seed, [...rec.moves, ...ms]);
    return s;
  }
  throw new Error("The shared case is the only case: it cannot be started again.");
}
