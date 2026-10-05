// Entry point: wires up clicks, hovers and keys, then loads or starts a game.
import { accuse, act, askNewGame, newGame, refresh, render, resetNotes, setGame, setGuess, setNote, toggleNote, useTool } from "./actions.js";
import { api, closed } from "./api.js";
import { renderFocus } from "./board.js";
import { chapterBack, chapterEscape, chapterNext, chapterShowing } from "./chapters.js";
import { replayCalls } from "./crimes.js";
import { filmShowing, nextScene, previousScene, skipFilm, togglePause } from "./film.js";
import { showFinale } from "./finale.js";
import { TABS, closeBook, renderFolder, showBook, tabInBook, toggleRole, turnBook } from "./folder.js";
import { maybeShowIntro, showIntro } from "./intro.js";
import { nextPage, previousPage, showPrologue } from "./prologue.js";
import { closeModal } from "./reveal.js";
import { CLOSED, flushNotes, sharedCase, sharedProblem } from "./shared.js";
import { $, notice, ui } from "./state.js";
import { load, store } from "./storage.js";
import { markChips } from "./testimony.js";
import { closePicker, showPickedSlip, togglePicker } from "./theory.js";
import { showHowTo } from "./howto.js";
import { showMiniCase } from "./minisim.js";
import { showTips } from "./tips.js";
import { closeTitle, showTitle, titleClosed, titleFailed, titleOpen } from "./title.js";
import { readingOpen } from "./reading.js";
import { tourKey } from "./tour.js";

const ACTIONS = {
  "new-game": newGame, act, accuse, "reset-notes": resetNotes, intro: showIntro, interview: () => useTool("interview"),
  "prologue-next": nextPage, "prologue-back": previousPage, finale: showFinale,
  "film-next": nextScene, "film-back": previousScene, "film-pause": togglePause, "film-skip": skipFilm,
};

// closing any card may reveal the next one: a round's opening card waits until the reveal is dismissed
function dismiss() {
  closeModal();
  maybeShowIntro();
}

function select(c) {
  if (!ui.S || ui.S.finished || !ui.S.chars[c].alive) return;
  ui.selected = ui.selected === c ? null : c;
  render();
}

function openFolder(tab) {
  closePicker();
  const wasOpen = ui.folderOpen;
  ui.folderOpen = !(ui.folderOpen && ui.tab === tab);  // clicking the open tab closes the folder
  ui.tab = tab;
  store("folder", ui.folderOpen ? tab : "");
  if (wasOpen === ui.folderOpen) renderFolder();
  else glideBoard(renderFolder);
}

// The folder slides in on its own layer; the board jumps to its new place at once and is animated from
// the old one with a transform, so the browser never has to lay out and repaint it frame by frame.
function glideBoard(change) {
  const board = $("board"), before = board.getBoundingClientRect();
  change();
  const after = board.getBoundingClientRect();
  const dx = before.left - after.left, scale = before.width / after.width;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || (Math.abs(dx) < 1 && Math.abs(scale - 1) < 0.005)) return;
  board.animate([{ transform: `translateX(${dx}px) scale(${scale})`, transformOrigin: "0 0" }, { transform: "none", transformOrigin: "0 0" }],
    { duration: 300, easing: "ease" });
}

document.addEventListener("click", (e) => {
  const button = e.target.closest("[data-action]");
  if (button) ACTIONS[button.dataset.action]();
});
document.addEventListener("keydown", (e) => {
  if (tourKey(e)) return;  // a tour of a folder tab plays (tour.js); it ends when anything below opens over it
  if (titleOpen()) {  // the opening screen: Enter or Space presses its button (in, or try again), Escape goes in
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!e.repeat) $("ts-enter")?.click();  // a key still held from the seal (New case) does not go in at once
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeTitle();
    }
    return;
  }
  if (readingOpen()) return;  // the reading screen: its buttons take the keys, and Escape does not close it
  if ($("modal").classList.contains("open")) {
    // in a film and on the prologue's papers ← / → turn the pages and space pauses the film; on a chapter's title
    // card → and space go on into the chapter (space presses another focused button) and ← back; Enter presses the
    // focused button, or the card's main one; Escape skips a film to what follows it and closes a card (the opening film
    // and papers close altogether; on the title card of How to play, the case in miniature or the advice it skips the chapter, as on its film)
    const film = filmShowing(), paper = document.querySelector(".prologue");
    const inPrologue = paper || (film && document.querySelector(".film.story"));
    const otherButton = document.activeElement?.closest?.("button") && document.activeElement.id !== "chapterGo";
    if (chapterShowing() && (e.key === "ArrowRight" || e.key === "ArrowLeft" || (e.key === " " && !otherButton))) {
      e.preventDefault();
      (e.key === "ArrowLeft" ? chapterBack : chapterNext)();
    } else if ((film || paper) && (e.key === "ArrowRight" || e.key === "ArrowLeft")) {
      e.preventDefault();
      if (film) (e.key === "ArrowRight" ? nextScene : previousScene)();
      else (e.key === "ArrowRight" ? nextPage : previousPage)();
    } else if (film && e.key === " ") {
      e.preventDefault();
      togglePause();
    } else if (e.key === "Escape") {
      e.preventDefault();
      if (film && !inPrologue) skipFilm();
      else if (!chapterEscape()) dismiss();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const focused = $("modal").contains(document.activeElement) && document.activeElement.closest("button");
      const button = focused || $("modal").querySelector(".btn.primary");
      if (button) button.click();
      else dismiss();
    }
  } else if (e.key === "Escape" && ui.folderOpen) {
    if (closePicker()) renderFolder();  // the Theory tab's role sheet first, a book open in the Rewards tab, then the folder
    else if (!closeBook()) openFolder(ui.tab);
  } else if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && ui.folderOpen && turnBook(e.key === "ArrowRight" ? 1 : -1)) {
    e.preventDefault();  // ← → turn to the next book while one is open
  } else if (e.key === "Tab" && ui.folderOpen) {
    tabInBook(e);
  }
});
// While a card or film is open, the page behind it is out of the keyboard's reach (a polaroid or the case note's button
// must not take a key meant for the card).
new MutationObserver(() => {
  const open = $("modal").classList.contains("open");
  document.querySelectorAll("body > .casebar, body > .desk").forEach((x) => (x.inert = open || titleOpen() || readingOpen()));
}).observe($("modal"), { attributes: true, attributeFilter: ["class"] });
$("modal").addEventListener("click", (e) => {
  if (e.target.id === "revealOk") dismiss();
  else if (e.target.id === "modal") (filmShowing() && !document.querySelector(".film.story") ? skipFilm : dismiss)();  // a click beside a card
});

$("board").addEventListener("click", (e) => {
  const note = e.target.closest("[data-mark]");
  if (note) return toggleNote(+note.dataset.mark);
  const card = e.target.closest(".card");
  if (card) select(+card.dataset.c);
});
// the keyboard: Enter or Space on a polaroid picks the guest, as a click does
$("board").addEventListener("keydown", (e) => {
  const card = e.target.closest?.(".card");
  if (card && e.target === card && (e.key === "Enter" || e.key === " ")) {
    e.preventDefault();
    select(+card.dataset.c);
  }
});
$("board").addEventListener("mouseover", (e) => {
  const card = e.target.closest(".card");
  const c = card ? +card.dataset.c : null;
  if (c !== ui.hoverChar) {
    ui.hoverChar = c;
    renderFocus();  // the hovered guest's strings
    markChips();
  }
});
$("board").addEventListener("mouseleave", () => {
  ui.hoverChar = null;
  renderFocus();
  markChips();
});

$("tabbody").addEventListener("click", (e) => {
  const book = e.target.closest("[data-book]");  // the Rewards tab: a book to open large, or -1 to close it
  if (book) return showBook(+book.dataset.book);
  const tile = e.target.closest("[data-tile]");
  if (tile) return toggleRole(tile.dataset.tile);
  const replay = e.target.closest("[data-replay]");  // the Crimes tab: a right call's flashback again
  if (replay) return replayCalls(replay.dataset.replay);
  const note = e.target.closest("[data-note]");
  if (note) return setNote(...note.dataset.note.split(":").map(Number));
  const pick = e.target.closest("[data-pick]");
  if (pick) {
    togglePicker(+pick.dataset.pick);
    renderFolder();
    return showPickedSlip();
  }
  const guess = e.target.closest("[data-guess]");
  if (guess) {
    const [c, role] = guess.dataset.guess.split(":");
    return setGuess(+c, role);
  }
  const chip = e.target.closest("[data-c]");
  if (chip && ui.S.chars[+chip.dataset.c].alive && ui.selected !== +chip.dataset.c) return select(+chip.dataset.c);
  const witness = e.target.closest("td.wit")?.closest("[data-row]");  // a witness's own name in the Testimony picks them too
  if (witness && ui.S.chars[+witness.dataset.row].alive && ui.selected !== +witness.dataset.row) select(+witness.dataset.row);
});
$("tabbody").addEventListener("mouseover", (e) => {
  const row = e.target.closest("[data-row]");
  const c = row ? +row.dataset.row : null;
  if (c !== ui.hoverRow) {
    ui.hoverRow = c;
    renderFocus();
  }
});
$("tabbody").addEventListener("mouseleave", () => {
  ui.hoverRow = null;
  renderFocus();
});
// the Theory tab: drag a guest's slip to another pile
const pileAt = (e) => e.target.closest?.("[data-pile]");
$("tabbody").addEventListener("dragstart", (e) => {
  const drag = e.target.closest?.("[data-drag]");
  if (!drag) return;
  e.dataTransfer.setData("text/plain", drag.dataset.drag);
  e.dataTransfer.effectAllowed = "move";
  drag.classList.add("dragging");
});
$("tabbody").addEventListener("dragend", (e) => e.target.closest?.("[data-drag]")?.classList.remove("dragging"));
$("tabbody").addEventListener("dragover", (e) => {
  const pile = pileAt(e);
  if (!pile) return;
  e.preventDefault();
  document.querySelectorAll("[data-pile].over").forEach((el) => el !== pile && el.classList.remove("over"));
  pile.classList.add("over");
});
$("tabbody").addEventListener("dragleave", (e) => {
  const pile = pileAt(e);
  if (pile && !pile.contains(e.relatedTarget)) pile.classList.remove("over");
});
$("tabbody").addEventListener("drop", (e) => {
  const pile = pileAt(e), c = e.dataTransfer.getData("text/plain");
  if (!pile) return;
  e.preventDefault();
  pile.classList.remove("over");
  if (/^\d+$/.test(c) && ui.S.chars[+c]?.alive) setNote(+c, +pile.dataset.pile);
});
document.querySelectorAll(".folder-tabs button").forEach((t) => (t.onclick = () => openFolder(t.dataset.tab)));
$("folder-close").onclick = () => openFolder(ui.tab);

$("newgame").onclick = askNewGame;
$("briefing").onclick = () => showPrologue(0, dismiss);
$("howto").onclick = () => showHowTo(dismiss);
$("minicase").onclick = () => showMiniCase(dismiss);
$("tips").onclick = () => showTips(dismiss);
$("theme").onclick = () => {
  const next = document.documentElement.dataset.theme === "light" ? "dark" : "light";
  document.documentElement.dataset.theme = next;
  store("theme", next);
};

// boot: the opening screen first, while the case loads behind it; going in opens the night's card or the story
showTitle(maybeShowIntro);
if (load("theme") === "light") document.documentElement.dataset.theme = "light";
const folder = load("folder");
if (TABS.includes(folder)) ui.tab = folder;  // ignores tab names from older versions
const reopenFolder = (s) => (ui.folderOpen = TABS.includes(folder) && s.history.length > 0);  // a new case starts with it closed
renderFolder();
api("/api/art").then((files) => { ui.customArt = files; render(); }).catch(() => {});
const resume = load("current-game");
const open = (s) => { setGame(s); reopenFolder(s); render(); maybeShowIntro(); };
function start() {
  if (sharedCase) {
    const openShared = () => api("/api/state?id=" + sharedCase)
      .then((s) => { document.querySelector(".notice")?.remove(); open(s); }).catch((e) => titleFailed(e.message) || notice(e.message, 0));
    if (sharedProblem()) titleFailed(sharedProblem()) || notice(sharedProblem(), 0);
    else openShared();
    // coming back to the page catches up with moves made elsewhere (or tries again to open the case); leaving it saves the notes
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") flushNotes();
      else if (!sharedProblem()) (ui.S ? refresh() : openShared());
    });
  } else if (resume) api("/api/state?id=" + resume).then(open).catch(newGame);
  else newGame();
}
// on GitHub Pages any link but the shared case's finds the gates closed
closed().then((shut) => {
  if (!shut) return start();
  $("newgame").style.display = "none";
  titleClosed(CLOSED) || notice(CLOSED, 0);
});
