// Things the player does: start a game, confirm a decision, use a tool. Each re-renders the page.
import { api } from "./api.js";
import { renderBoard } from "./board.js";
import { renderFolder } from "./folder.js";
import { armReset, closePicker } from "./theory.js";
import { isBadRole } from "./roles.js";
import { ROMAN, moonSvg } from "./format.js";
import { maybeShowIntro } from "./intro.js";
import { showDrawingRoom } from "./finale.js";
import { closeModal, showClue, showReveal } from "./reveal.js";
import { $, patch, ui } from "./state.js";
import { loadJSON, store } from "./storage.js";

export function render() {
  const S = ui.S;
  if (!S) return;
  patch($("pips"), Array.from({ length: S.rounds }, (_, i) => moon(i + 1)).join(""));
  $("score").textContent = `${S.score} / ${S.history.length}`;
  renderBoard();
  renderFolder();
}

// The nights in the case bar as a moon waxing to full on the last night, named once they have come.
function moon(r) {
  const S = ui.S, state = S.finished || r < S.round ? "done" : r === S.round ? "now" : "";
  const name = r > S.round && !S.finished ? "" : S.events[r] || (r === S.rounds ? "The drawing room" : "");
  return moonSvg(r / S.rounds, state, `Night ${ROMAN[r]}${name ? " · " + name : ""}`);
}

export function setGame(s) {
  ui.S = s;
  ui.selected = null;
  ui.marks = loadJSON("marks-" + s.id, {});
  ui.guesses = loadJSON("guesses-" + s.id, {});
  store("current-game", s.id);
}

export function newGame() {
  closeModal();
  const seed = new URLSearchParams(location.search).get("seed");  // for tests only; never shown
  api("/api/new", { seed }).then((s) => {
    setGame(s);
    ui.folderOpen = false;  // a new case starts with the folder closed
    store("folder", "");
    render();
    maybeShowIntro();
  }).catch(showError);
}

export function act() {
  if (ui.selected === null) return;
  const before = ui.S.history.length;
  api("/api/act", { id: ui.S.id, char: ui.selected }).then((s) => {
    ui.S = s;
    ui.selected = null;
    render();
    if (s.history[before]) showReveal(s.history[before]);
  }).catch(showError);
}

// The last night: the other guest goes free, the accused is arrested, then the summing-up in the drawing room.
export function accuse() {
  if (ui.selected === null) return;
  const S = ui.S, accused = ui.selected, freed = S.chars.find((c) => c.alive && c.id !== accused).id;
  api("/api/act", { id: S.id, char: freed })
    .then(() => api("/api/act", { id: S.id, char: accused }))
    .then((s) => {
      ui.S = s;
      ui.selected = null;
      render();
      showDrawingRoom();
    }).catch(showError);
}

// Notebook or Interview on the selected guest.
export function useTool(tool) {
  if (ui.selected === null) return;
  const c = ui.selected;
  api("/api/tool", { id: ui.S.id, tool, char: c }).then((s) => {
    ui.S = s;
    render();
    showClue(tool, c);
  }).catch(showError);
}

function saveNotes() {
  store("marks-" + ui.S.id, JSON.stringify(ui.marks));
  store("guesses-" + ui.S.id, JSON.stringify(ui.guesses));
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
}
