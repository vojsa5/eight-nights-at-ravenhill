// Shared UI state and small helpers over the game state received from the server.
import { unreadIn } from "./books.js";

export const ui = {
  game: null,        // game state from the server
  get S() { return shown(this.game, this.read); },  // the game as the page shows it
  selected: null,    // character picked for the current decision
  hoverRow: null,    // testimony row under the mouse
  hoverChar: null,   // portrait under the mouse
  marks: {},         // the player's own notes: char -> 0 (?), 1 (bad), 2 (good)
  guesses: {},       // the player's guess of a guest's role (the Theory tab): char -> role
  tab: "testimony",  // the case folder's open tab (folder.js)
  folderOpen: false, // the case folder at the right edge
  customArt: {},     // role (lower case) -> picture in web/art/custom/
  read: {},          // the books won and read in this case: book slot -> when it was finished (reading.js)
};

export const $ = (id) => document.getElementById(id);

// The game as shown. While a book won by the decision that ended the last night waits to be read (reading.js), that
// night is not over for the player: what the next one brought (its advice, clues and traces) stays out of sight, and
// the page shows the last night as it ended, with `held` set. Worked out again only when the game or the books read change.
let shownFor = [], view = null;
function shown(game, read) {
  if (shownFor[0] !== game || shownFor[1] !== read) {
    shownFor = [game, read];
    view = game && !game.finished && unreadIn(game, read).some((x) => x.h.round < game.round) ? heldBack(game, game.round - 1) : game;
  }
  return view;
}
const upTo = (byRound, r) => Object.fromEntries(Object.entries(byRound || {}).filter(([k]) => Number(k) <= r));
const heldBack = (g, r) => ({ ...g, round: r, held: true, advice: g.advice.filter((a) => a.round <= r),
  interviews: g.interviews.filter((a) => a.round <= r), notebooks: g.notebooks.filter((x) => x.round <= r),
  events: upTo(g.events, r), footprints: upTo(g.footprints, r), traces: upTo(g.traces, r), silenced: upTo(g.silenced, r) });

// A slip at the foot of the page, gone after `ms` (or staying, with 0).
export function notice(text, ms = 6000) {
  document.querySelector(".notice")?.remove();
  const el = document.createElement("div");
  el.className = "engine-loading notice";
  el.textContent = text;
  document.body.append(el);
  if (ms) setTimeout(() => el.remove(), ms);
}

// The last night: two guests remain in the drawing room, and one choice decides both. You name the guilty
// one, who is arrested; the other goes free (actions.js accuse).
export const inDrawingRoom = () => {
  const S = ui.S;
  return !!S && !S.finished && S.round === S.rounds && S.phase === "save" && S.chars.filter((c) => c.alive).length === 2;
};

// Replace an element's content only when it changed, so unchanged pictures are not redrawn.
export function patch(el, html) {
  if (el._html === html) return;
  el._html = html;
  el.innerHTML = html;
}

// This round's advice counts per guest: { s: advised to clear, e: advised to arrest }
export function currentVotes() {
  const v = {};
  ui.S.advice.filter((a) => a.round === ui.S.round).forEach((a) => {
    if (a.save !== null) (v[a.save] = v[a.save] || { s: 0, e: 0 }).s++;
    if (a.eliminate !== null) (v[a.eliminate] = v[a.eliminate] || { s: 0, e: 0 }).e++;
  });
  return v;
}

// Was a piece of advice right, given what has been revealed? "" while unknown. (After a mistake only the
// guest's side is known, which is enough.)
export function verdict(target, wantsBad) {
  const t = ui.S.chars[target];
  if (!t || t.bad === undefined) return "";
  return t.bad === wantsBad ? "right" : "wrong";
}

// Scroll the folder (only the folder, and smoothly) just far enough to show `el`, clear of `head` px of
// sticky headers at its top and `foot` px of a sheet over its foot.
export function showInFolder(body, el, head = 0, foot = 0) {
  const r = el.getBoundingClientRect(), b = body.getBoundingClientRect(), bottom = b.bottom - foot;
  const by = r.top < b.top + head ? r.top - b.top - head - 8 : r.bottom > bottom ? Math.min(r.bottom - bottom + 8, r.top - b.top - head - 8) : 0;
  if (by) body.scrollTo({ top: body.scrollTop + by, behavior: "smooth" });
}
