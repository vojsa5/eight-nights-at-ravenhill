// Things the player does: start a game, confirm a decision, use a tool. Each re-renders the page.
import { api } from "./api.js";
import { renderBoard } from "./board.js";
import { renderFolder } from "./folder.js";
import { armReset, closePicker } from "./theory.js";
import { ROLES, isBadRole } from "./roles.js";
import { ROMAN, moonSvg } from "./format.js";
import { nightEvent } from "./events.js";
import { maybeShowIntro } from "./intro.js";
import { showDrawingRoom } from "./finale.js";
import { closeModal, showClue, showReveal } from "./reveal.js";
import { notesPending, saveNotes as saveSharedNotes, sharedCase } from "./shared.js";
import { $, notice, patch, ui } from "./state.js";
import { showTitle, titleFailed, titleOpen, titleReady } from "./title.js";
import { holdToConfirm, loadRead, readElsewhere, showReading, unread } from "./reading.js";
import { loadJSON, store } from "./storage.js";

export function render() {
  const S = ui.S;
  if (!S) return;
  patch($("pips"), Array.from({ length: S.rounds }, (_, i) => moon(i + 1)).join(""));
  $("score").textContent = `${S.score} / ${S.history.length}`;
  renderBoard();
  renderFolder();
}

// The nights in the case bar as a moon waxing to full on the last night, each named (the schedule is the same every case).
function moon(r) {
  const S = ui.S, state = S.finished || r < S.round ? "done" : r === S.round ? "now" : "";
  const name = nightEvent(S, r) || (r === S.rounds ? "The drawing room" : "");
  return moonSvg(r / S.rounds, state, `Night ${ROMAN[r]}${name ? " · " + name : ""}`);
}

let busy = false;      // a decision is on its way: another click would be made on the board as it was before
let notesSeen = null;  // the shared case's notes as last read or saved here

const count = (S) => S.history.length + S.interviews.length;  // the moves made so far
const sameCase = (a, b) => JSON.stringify([a.id, a.history, a.advice, a.interviews]) === JSON.stringify([b.id, b.history, b.advice, b.interviews]);

export function setGame(s) {
  ui.S = s;
  ui.selected = null;
  ui.marks = loadJSON("marks-" + s.id, {});
  ui.guesses = loadJSON("guesses-" + s.id, {});
  if (sharedCase) takeNotes(s);
  else store("current-game", s.id);
  loadRead(s);
  titleReady(s);
}

// The notes saved with the shared case, if any. Anyone with its link can write them, so only real notes are taken.
function takeNotes(s) {
  notesSeen = s.notes ?? null;
  let n = null;
  try { n = JSON.parse(s.notes); } catch (e) { /* none, or not notes */ }
  if (!n || typeof n !== "object") return;
  const pick = (o, ok) => Object.fromEntries(Object.entries(o && typeof o === "object" ? o : {})
    .filter(([c, v]) => /^\d+$/.test(c) && Number(c) < s.chars.length && ok(v)));
  ui.marks = pick(n.marks, (v) => v === 0 || v === 1 || v === 2);
  ui.guesses = pick(n.guesses, (v) => typeof v === "string" && Object.prototype.hasOwnProperty.call(ROLES, v));
}

// The shared case moved on in another browser: show it as it is now. `s` came back instead of the move asked for.
function catchUp(s) {
  const fresh = s.id !== ui.S?.id;  // a new case, started in another browser
  closeModal();
  setGame(s);
  readElsewhere();
  render();
  notice(fresh ? "A new case was started in another browser. This is it."
    : "This case was played on in another browser meanwhile. The board is up to date again.");
  maybeShowIntro();
}

// Back to a page left open while the shared case was played elsewhere: catch up, notes and all.
export function refresh() {
  if (!sharedCase || !ui.S || busy) return;
  api("/api/state?id=" + sharedCase).then((s) => {
    if (!sameCase(s, ui.S)) return catchUp(s);
    if ((s.notes ?? null) !== notesSeen && !notesPending()) {
      takeNotes(s);
      render();
    }
    loadRead(s);
    readElsewhere();
  }).catch(() => {});  // the next move catches up anyway
}

// A decision, sent with the number of moves the page has seen: the shared case refuses it (`stale`) if it moved on.
function send(path, body) {
  busy = true;
  return api(path, { id: ui.S.id, n: count(ui.S), ...body }).finally(() => (busy = false));
}

// Does a state hold exactly the moves asked for on top of the board shown? In a shared case it can, though the
// answer said otherwise: the moves were saved, but the answer got lost.
const madeHere = (s, chars) => s.id === ui.S.id && count(s) === count(ui.S) + chars.length
  && chars.every((c, i) => (s.history[ui.S.history.length + i] || {}).char === c);

// The answer to a decision: `done` it, or catch up when the case moved on instead.
const answer = (chars, done) => (s) => (s.stale && !(chars && madeHere(s, chars)) ? catchUp(s) : done(s));

// A decision went wrong. In a shared case it may have been saved all the same, or the case moved on meanwhile: the
// case as saved decides.
const failed = (chars, done) => (e) => {
  if (!sharedCase) return showError(e);
  api("/api/state?id=" + sharedCase)
    .then((s) => (chars && madeHere(s, chars) ? done(s) : !sameCase(s, ui.S) ? catchUp(s) : showError(e)))
    .catch(() => showError(e));
};

// The case bar's New case: an open case is only given up once the seal is held down until its ring closes, as a book
// is marked read (reading.js), so a stray click or tap never throws it away.
export function askNewGame() {
  const S = ui.S;
  if (!S) return sharedCase ? undefined : newGame();  // the shared case is still opening: there is nothing to start over yet
  if (S.finished) return newGame();  // a closed case is in the files already
  $("modal").innerHTML = `<div class="restart" role="dialog" aria-modal="true" aria-labelledby="rs-head">
    <div class="rd-kicker">Night ${ROMAN[S.round]} of ${ROMAN[S.rounds]} · score ${S.score} of ${S.history.length}</div>
    <h2 id="rs-head">Start a new case?</h2>
    <p>This one goes into the files for good, unfinished${sharedCase ? ", and the new case opens on every device with your link" : ""}.
      If you are sure, press the seal and hold it down until the ring closes.</p>
    <button class="rd-seal" id="rs-seal" aria-label="Hold down to give up this case and start a new one">
      <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19"/><circle class="ring" cx="22" cy="22" r="19"/></svg>
      <span>N</span></button>
    <button class="btn" id="rs-keep">Keep this case</button></div>`;
  $("modal").classList.add("open");
  $("rs-keep").onclick = closeModal;
  holdToConfirm($("rs-seal"), newGame);
  $("rs-keep").focus();
}

// A new case opens on the opening screen, while it loads behind it. A shared case moves on to a new game of its own.
export function newGame() {
  closeModal();
  if (!titleOpen()) showTitle(maybeShowIntro);
  const seed = new URLSearchParams(location.search).get("seed");  // for tests only; never shown
  // the shared case starts over only from the game shown: if it moved on meanwhile, this page catches up instead
  api("/api/new", { seed, id: ui.S?.id }).then((s) => {
    if (s.stale) return catchUp(s);
    setGame(s);
    ui.folderOpen = false;  // a new case starts with the folder closed
    store("folder", "");
    render();
    maybeShowIntro();
  }).catch(showError);
}

// No decision while a book won waits to be read: the reading screen comes back instead.
const reading = () => unread().length > 0 && (showReading(maybeShowIntro), true);

export function act() {
  if (busy || ui.selected === null || reading()) return;
  const before = ui.S.history.length, c = ui.selected;
  const done = (s) => {
    ui.S = s;
    ui.selected = null;
    render();
    if (s.history[before]) showReveal(s.history[before]);
  };
  send("/api/act", { char: c }).then(answer([c], done), failed([c], done));
}

// The last night: the other guest goes free, the accused is arrested, then the summing-up in the drawing room.
// Both are one request, so a shared case never saves half the verdict.
export function accuse() {
  if (busy || ui.selected === null || reading()) return;
  const accused = ui.selected, freed = ui.S.chars.find((c) => c.alive && c.id !== accused).id;
  const done = (s) => {
    ui.S = s;
    ui.selected = null;
    render();
    showDrawingRoom();
  };
  send("/api/act", { chars: [freed, accused] }).then(answer([freed, accused], done), failed([freed, accused], done));
}

// Notebook or Interview on the selected guest.
export function useTool(tool) {
  if (busy || ui.selected === null || reading()) return;
  const c = ui.selected;
  const done = (s) => {
    ui.S = s;
    render();
    showClue(tool, c);
  };
  send("/api/tool", { tool, char: c }).then(answer(null, done), failed(null, done));
}

function saveNotes() {
  store("marks-" + ui.S.id, JSON.stringify(ui.marks));
  store("guesses-" + ui.S.id, JSON.stringify(ui.guesses));
  if (!sharedCase) return;
  notesSeen = JSON.stringify({ marks: ui.marks, guesses: ui.guesses });
  saveSharedNotes(ui.S.id, notesSeen);
}

// Your note on a guest: 0 unsure, 1 guilty, 2 innocent. The board's button cycles through them. A role
// guess from the other side (or with no side at all) goes.
export function setNote(c, m) {
  ui.marks[c] = m;
  const guess = ui.guesses[c];
  if (guess && (m === 0 || (m === 1) !== isBadRole(guess))) delete ui.guesses[c];
  saveNotes();
  render();  // the board, the Testimony tab's note beside the name and the Theory tab's piles
}
export const toggleNote = (c) => setNote(c, ((ui.marks[c] || 0) + 1) % 3);

// Your guess of a guest's role (the Theory tab), or none; a guess puts them in the matching pile.
export function setGuess(c, role) {
  if (role) {
    ui.guesses[c] = role;
    ui.marks[c] = isBadRole(role) ? 1 : 2;
  } else {
    delete ui.guesses[c];
  }
  closePicker();
  saveNotes();
  render();
}

// The Theory tab's reset: the first click arms it, a second one within a few seconds clears every note.
export function resetNotes() {
  if (armReset()) {
    ui.marks = {};
    ui.guesses = {};
    saveNotes();
  } else {
    setTimeout(render, 4100);  // shows the button disarmed again
  }
  render();
}

function showError(e) {
  patch($("tabbody"), `<p class="err">${e.message}</p>`);
  if (!titleFailed(e.message)) notice(e.message);  // on the opening screen, the error goes in its status line
}
