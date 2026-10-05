// The game engine in the browser, for hosting without the Python server (GitHub Pages): Pyodide runs the
// same ravenhill package, published next to the page by tools/build_pages.py, in a worker of its own (pyworker.js),
// so the page stays live while it starts. The routes mirror ravenhill/server/app.py. It plays only the shared case
// (shared.js), which is kept online.
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

let worker = null, ready = null, noted = null, calls = 0;
const waiting = new Map();  // call id -> its promise's { ok, fail, timer }
const LOST = "The game engine could not start. Try again in a moment.";
const STOPPED = "The game engine stopped. Try again in a moment.";
const PATIENCE = 30000;  // a game call answers in well under a second; one that does not, the worker is gone (a phone short of memory)

// The worker failed or went quiet: drop it and everything it was asked. The next call starts a new one, which
// replays the case from the record online.
function reset(message) {
  worker?.terminate();
  worker = ready = null;
  played = null;
  waiting.forEach((call) => { clearTimeout(call.timer); call.fail(new Error(message)); });
  waiting.clear();
}

// One message to the worker; resolves to its answer. Starting Pyodide may take long on a slow line, so only the
// game's own calls have a time limit.
function send(message) {
  if (!worker) return Promise.reject(new Error(STOPPED));
  const id = ++calls;
  return new Promise((ok, fail) => {
    const timer = message.boot ? 0 : setTimeout(() => reset(STOPPED), PATIENCE);
    waiting.set(id, { ok, fail, timer });
    worker.postMessage({ id, ...message });
  });
}

function boot() {
  worker = new Worker(new URL("pyworker.js", import.meta.url));
  worker.onmessage = ({ data: { id, result, error } }) => {
    const call = waiting.get(id);
    if (!call) return;  // asked of a worker since reset
    clearTimeout(call.timer);
    waiting.delete(id);
    if (error === undefined) call.ok(result);
    else call.fail(new Error(error));
  };
  worker.onerror = (e) => {  // the worker itself failed (did not load, or broke): it answers nothing any more
    e.preventDefault();
    console.error("game engine:", e.message);
    reset(LOST);
  };
  ready = send({ boot: { index: PYODIDE, manifest: new URL("py/manifest.json", document.baseURI).href, glue: GLUE } });
  return ready;
}

// A shared case's link starts the engine as the page opens (index.html), while the rest of the page is still coming.
export const warmUp = () => theCase().then((yes) => yes && !ready && boot().catch(() => {}));  // a failure shows on the first call

// The engine, started if it was not; a note at the foot of the page says so while it starts (again, after a reset).
function engine() {
  if (!ready) boot();
  if (noted !== ready) {
    noted = ready;
    const note = document.createElement("div");
    note.className = "engine-loading";
    note.textContent = "Unpacking the case files…";
    document.body.append(note);
    ready.finally(() => note.remove()).catch(() => {});
  }
  return ready;
}

const call = async (fn, ...args) => JSON.parse(await send({ fn, args }));
const randomSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
// The moves of a request: one, or on the last night two (the guest who goes free, then the accused).
const asMoves = (route, body) => (route === "/api/act" ? (body.chars || [body.char]).map((c) => ["act", Number(c)])
  : [["tool", body.tool, Number(body.char)]]);

// The API of ravenhill/server/app.py: the same paths and bodies, the same game states back.
export async function pyApi(path, body) {
  const [route] = path.split("?");
  if (route === "/api/art") return {};  // no custom art without a server to list it
  if (!(await theCase())) throw new Error(CLOSED);  // the shared case is the only one
  await engine();
  try {
    return await sharedApi(route, body);
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

async function replay(rec) {
  await call("start", sharedCase, rec.seed, JSON.stringify(rec.moves));
  played = key(rec.seed, rec.moves);
}

async function sync() {
  let rec = await readCase();
  if (!rec) {
    await startCase(randomSeed());  // false when another browser started the case first: its seed is the one
    rec = await readCase();
    if (!rec) throw new Error("Could not open the shared case. Try again in a moment.");
  }
  if (key(rec.seed, rec.moves) !== played) await replay(rec);
  return rec;
}

const withNotes = (s, rec) => ({ ...s, notes: rec.notes, read: rec.read });

function sharedApi(route, body) {
  const run = queue.then(() => sharedCall(route, body));
  queue = run.catch(() => {});  // the caller sees the error; the next call still runs
  return run;
}

async function sharedCall(route, body) {
  if (route === "/api/state") {
    const rec = await sync();
    return withNotes(await call("state", sharedCase), rec);
  }
  if (route === "/api/act" || route === "/api/tool") {
    const rec = await sync(), now = await call("state", sharedCase);
    if (body.n !== count(now)) return { ...withNotes(now, rec), stale: true };
    const ms = asMoves(route, body);
    let s, saved;
    try {
      for (const m of ms) s = await call("move", sharedCase, JSON.stringify(m));  // an invalid move fails here, before anything is saved
      saved = await addMoves(rec.next, ms);
    } catch (e) {
      await replay(rec);  // not saved: take the moves back
      throw e;
    }
    if (!saved) {  // another browser saved a move first
      played = null;  // the engine has made these moves: replay what is saved instead
      const later = await sync();
      if (later.next === rec.next) throw new Error("The case file refused the move: check the database rules (README.md, A shared case).");
      return { ...withNotes(await call("state", sharedCase), later), stale: true };
    }
    played = key(rec.seed, [...rec.moves, ...ms]);
    return s;
  }
  throw new Error("The shared case is the only case: it cannot be started again.");
}
