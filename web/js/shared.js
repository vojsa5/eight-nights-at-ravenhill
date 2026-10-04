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

// The case so far, or null before its first visit: { seed, moves, next, notes }. The moves come in the order they
// were saved, without any that is not a move at all; `next` is where the next one goes.
export async function readCase() {
  const rec = await request("");
  if (!rec || rec.seed === undefined) return null;
  const saved = Array.isArray(rec.moves) ? rec.moves.map((m, i) => [i, m]) : Object.entries(rec.moves || {}).map(([k, m]) => [Number(k), m]);
  saved.sort((a, b) => a[0] - b[0]);
  const moves = saved.map(([, m]) => (typeof m === "string" ? parse(m) : null)).filter(Array.isArray);
  const next = Array.isArray(rec.moves) ? rec.moves.length : saved.length ? saved[saved.length - 1][0] + 1 : 0;
  return { seed: rec.seed, moves, next, notes: rec.notes, read: rec.read };
}

// Each returns false when another browser got there first. The moves of one decision are saved together, or not at all.
export const startCase = (seed) => request("/seed", "PUT", seed).then((r) => r !== false);
export const addMoves = (n, ms) => request("", "PATCH", Object.fromEntries(ms.map((m, i) => [`moves/${n + i}`, JSON.stringify(m)])))
  .then((r) => r !== false);

// A book won and finished (reading.js): when, by book slot. False when another browser marked it first.
export const markRead = (slot, when) => request(`/read/${slot}`, "PUT", when).then((r) => r !== false);

// The notes change a click at a time: they are saved once the clicking stops, or at once when the page is left.
let pending = null, timer = null;
const send = (keepalive) => {
  clearTimeout(timer);
  const text = pending;
  pending = null;
  if (text !== null) request("/notes", "PUT", text, keepalive).catch(() => {});  // they stay in this browser either way
};
export function saveNotes(text) {
  pending = text;
  clearTimeout(timer);
  timer = setTimeout(() => send(false), 800);
}
export const flushNotes = () => send(true);
export const notesPending = () => pending !== null;
