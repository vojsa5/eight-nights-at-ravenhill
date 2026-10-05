// The shared case: a link with ?case=<name> plays the one case kept online under that name, in a Firebase
// Realtime Database, so it goes on from any browser or device that opens the link. Without the Python server it is
// the only case there is: any other link finds the gates closed. Setting it up: README.md, "A shared case"; the
// database rules: database.rules.json.
// The case online is its seed, its moves (each saved once, never changed), the books read and the player's notes.

const DATABASE = "https://ravenhill-701c1-default-rtdb.europe-west1.firebasedatabase.app";  // e.g. "https://ravenhill-1234-default-rtdb.europe-west1.firebasedatabase.app"

// The SHA-256 of the case's name: the source is public, the name is not.
const CASE_SHA256 = "ab0ad7c98c7c13b11938bd5017ff662a75a3ede710ec9851c63818cc224a3d9d";

const param = new URLSearchParams(location.search).get("case");
export const sharedCase = param && /^[A-Za-z0-9_-]{1,64}$/.test(param) ? param : null;

export const CLOSED = "The gates of Ravenhill are closed.";

const sha256 = async (text) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))),
  (b) => b.toString(16).padStart(2, "0")).join("");

// Is the link the one case? (crypto.subtle needs https or localhost; without it, no.)
let checked = null;
export const theCase = () => (checked = checked
  || (sharedCase ? sha256(sharedCase).then((h) => h === CASE_SHA256, () => false) : Promise.resolve(false)));

// Why the shared case cannot be played here, if it cannot.
export const sharedProblem = () => (DATABASE ? "" : "The shared case has no database yet (README.md, A shared case).");

async function request(path, method = "GET", body, keepalive = false) {
  if (!DATABASE) throw new Error(sharedProblem());
  let r;
  try {
    r = await fetch(`${DATABASE}/cases/${sharedCase}${path}.json`,
      body === undefined ? { cache: "no-store" } : { method, body: JSON.stringify(body), keepalive });
  } catch (e) {
    throw new Error("Could not reach the case file. Check the connection and try again.");
  }
  if (r.status === 401 || r.status === 403) return false;  // the rules refuse: that move or seed is already saved
  if (!r.ok) throw new Error(`The case file did not answer (${r.status}). Try again in a moment.`);
  return r.json();
}

const parse = (m) => { try { return JSON.parse(m); } catch (e) { return null; } };

// A case can be started over (New case): its first game is kept at the case's own level, each later one under
// games/<n>, and `game` says which one the case is on. Only the game in progress is kept: starting over replaces the
// whole case with the new game, so a page still showing the old one finds nothing left to add its moves to.
const gameAt = (game) => (game ? `games/${game}/` : "");
// where the game shown keeps its notes and books, from its id (pyengine.js names a later game <case>-g<k>)
const gameOf = (id) => (id && id.startsWith(sharedCase + "-g") ? gameAt(Number(id.slice(sharedCase.length + 2))) : "");

// The case so far, or null before its first visit: { game, seed, moves, next, notes, read }. The moves come in the order
// they were saved, without any that is not a move at all; `next` is where the next one goes.
export async function readCase() {
  const rec = await request("");
  const game = Number.isInteger(rec?.game) && rec.game > 0 ? rec.game : 0;
  if (!rec || (rec.seed === undefined && !game)) return null;  // once started over, only the game in progress is left
  const g = game ? (rec.games || {})[game] : rec;
  if (!g || g.seed === undefined) throw new Error("The case file has lost its current game. Try again in a moment.");
  const saved = Array.isArray(g.moves) ? g.moves.map((m, i) => [i, m]) : Object.entries(g.moves || {}).map(([k, m]) => [Number(k), m]);
  saved.sort((a, b) => a[0] - b[0]);
  const moves = saved.map(([, m]) => (typeof m === "string" ? parse(m) : null)).filter(Array.isArray);
  const next = Array.isArray(g.moves) ? g.moves.length : saved.length ? saved[saved.length - 1][0] + 1 : 0;
  return { game, seed: g.seed, moves, next, notes: g.notes, read: g.read };
}

// Each returns false when another browser got there first. The moves of one decision are saved together, or not at all.
export const startCase = (seed) => request("/seed", "PUT", seed).then((r) => r !== false);
export const addMoves = (rec, ms) => request("", "PATCH", Object.fromEntries(ms.map((m, i) => [`${gameAt(rec.game)}moves/${rec.next + i}`,
  JSON.stringify(m)]))).then((r) => r !== false);
// New case: the case is replaced by its next game, with nothing but its seed. False when another browser started one first.
export const startOver = (rec, seed) => request("", "PUT", { game: rec.game + 1, games: { [rec.game + 1]: { seed } } })
  .then((r) => r !== false);

// A book won and finished (reading.js) in the game shown (`id`): when, by book slot. False when another browser marked it first.
export const markRead = (id, slot, when) => request(`/${gameOf(id)}read/${slot}`, "PUT", when).then((r) => r !== false);

// The notes change a click at a time: they are saved once the clicking stops, or at once when the page is left, with
// the game they were made in.
let pending = null, timer = null;
const send = (keepalive) => {
  clearTimeout(timer);
  const p = pending;
  pending = null;
  if (p) request(`/${p.at}notes`, "PUT", p.text, keepalive).catch(() => {});  // they stay in this browser either way
};
export function saveNotes(id, text) {
  pending = { text, at: gameOf(id) };
  clearTimeout(timer);
  timer = setTimeout(() => send(false), 800);
}
export const flushNotes = () => send(true);
export const notesPending = () => pending !== null;
