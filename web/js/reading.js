// Reading: a book won is read before the case goes on. While a book waits to be finished this screen covers the game,
// and only the player can let it go on: "I have finished it", then holding the seal down until its ring closes, so a
// stray click never does. The book can be put down to look over the case meanwhile, but every decision, a new case and
// a closed case's ending wait for it all the same, and bring the screen back. A book once read stays read, kept with
// the case: online for the shared case (shared.js), else in this browser. Styles: css/reading.css.
import { renderBoard } from "./board.js";
import { BOOKS, coversHtml, slotOf, unreadIn } from "./books.js";
import { ROMAN } from "./format.js";
import { markRead, sharedCase } from "./shared.js";
import { renderFolder } from "./folder.js";
import { $, notice, ui } from "./state.js";
import { loadJSON, store } from "./storage.js";

const HOLD_MS = 1600;
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

// The books won but not read yet, in the order they were won.
export const unread = () => (ui.S ? unreadIn(ui.S, ui.read) : []);

// The books read in this case, when the case is (re)loaded: slot -> when it was finished. Online they come with the
// state, and anyone with the link could write there, so only real slots and times are taken (in this browser too).
export function loadRead(s) {
  const read = sharedCase ? s.read : loadJSON("read-" + s.id, {});
  const real = (t) => typeof t === "number" && t > 1.5e12;  // a time in this century, so its date can be shown
  ui.read = Object.fromEntries(Object.entries(read && typeof read === "object" ? read : {}).filter(([k, t]) => BOOKS[k] && real(t)));
}

let el = null, next = null, aside = null;
export const readingOpen = () => !!el;
// The book put down to look over the case: the screen stays away until a decision or the case note's button brings it
// back (or the page is opened again). It is kept by case and slot, so a book won later, or one left first once this
// one was read in another browser, comes up as usual.
const keyOf = (x) => ui.S.id + " " + slotOf(x.book);
export const readingAside = () => !!unread().length && keyOf(unread()[0]) === aside;
// The case bar's way back to the book, there while one waits.
export function markBookButton() {
  const waiting = unread()[0];
  $("readbook").hidden = !waiting;
  if (waiting) $("readbook").title = `Back to ${waiting.book.title}: the case waits until you have read it`;
}
const behind = () => document.querySelectorAll("body > .casebar, body > .desk, body > #modal");

// The first book waiting to be read; `then` runs once every book is read (at once if none is waiting).
export function showReading(then) {
  next = then;
  aside = null;
  const waiting = unread();
  if (!waiting.length) return close();
  const { h, book } = waiting[0], c = ui.S.chars[h.char], S = ui.S;
  if (!el) {
    el = document.createElement("div");
    el.className = "reading";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");
    el.setAttribute("aria-labelledby", "rd-head");
    document.body.append(el);
    behind().forEach((x) => (x.inert = true));
  }
  el.classList.remove("done");  // the next book comes unstamped
  const more = waiting.slice(1).map((x) => `<i>${x.book.title}</i>`);
  el.innerHTML = `<div class="rd-lamp"></div>
    <div class="rd-card">
      <div class="rd-book">${coversHtml(book)}<span class="rd-ribbon"></span><span class="rd-stamp">Read</span></div>
      <div class="rd-text">
        <div class="rd-kicker">${S.finished ? "Before the thaw" : `Night ${ROMAN[S.round]} of ${ROMAN[S.rounds]}`} · the case waits</div>
        <h2 id="rd-head">Time to read</h2>
        <p class="rd-title"><i>${book.title}</i><span>${book.author}</span></p>
        <p>You found it in ${c.name}'s room, and it is yours. Ravenhill will keep: the snow is going nowhere, and neither are
          the guests. Read it, every page, and come back when you have finished. You may look over the case meanwhile, but
          ${S.finished ? "the ending waits for the book" : "nobody is cleared or arrested until you have read it"}.</p>
        ${more.length ? `<p class="rd-more">After it, ${more.join(" and ")} ${more.length === 1 ? "is" : "are"} waiting too.</p>` : ""}
        <div class="rd-go" id="rd-go"><button class="rd-done" id="rd-done">I have finished it</button>
          <button class="rd-aside" id="rd-aside">Look over the case</button></div>
        <div class="rd-confirm" id="rd-confirm" hidden>
          <p>Every page? Then press the seal and hold it down until the ring closes.</p>
          <button class="rd-seal" id="rd-seal" aria-label="Hold down to confirm that you have finished ${book.title}">
            <svg viewBox="0 0 44 44" aria-hidden="true"><circle class="track" cx="22" cy="22" r="19"/><circle class="ring" cx="22" cy="22" r="19"/></svg>
            <span>R</span></button>
          <button class="rd-notyet" id="rd-notyet">Not yet</button>
        </div>
      </div>
    </div>`;
  $("rd-done").onclick = () => {
    $("rd-go").hidden = true;
    $("rd-confirm").hidden = false;
    $("rd-seal").focus();
  };
  $("rd-notyet").onclick = () => {
    $("rd-confirm").hidden = true;
    $("rd-go").hidden = false;
    $("rd-done").focus();
  };
  $("rd-aside").onclick = putAside;
  holdToConfirm($("rd-seal"), () => finish(slotOf(book)));
  $("rd-done").focus();
}

// Holding the pointer, Enter or Space on the seal for HOLD_MS confirms; letting go sooner starts over.
export function holdToConfirm(seal, done) {
  let timer = 0;
  const start = (e) => {
    if (e.type === "keydown" && ((e.key !== "Enter" && e.key !== " ") || e.repeat)) return;
    e.preventDefault();
    if (timer) return;
    seal.classList.add("holding");
    timer = setTimeout(() => {
      timer = 0;
      seal.classList.remove("holding");
      if (seal.isConnected) done();  // closed meanwhile (Escape, Keep this case): confirms nothing
    }, HOLD_MS);
  };
  const stop = () => {
    clearTimeout(timer);
    timer = 0;
    seal.classList.remove("holding");
  };
  seal.style.setProperty("--hold", HOLD_MS + "ms");
  seal.addEventListener("pointerdown", start);
  seal.addEventListener("keydown", start);
  ["pointerup", "pointerleave", "pointercancel", "keyup", "blur"].forEach((t) => seal.addEventListener(t, stop));
  seal.addEventListener("click", (e) => e.preventDefault());  // a click alone confirms nothing
}

async function finish(slot) {
  const when = Date.now();
  if (sharedCase) {
    try {
      await markRead(ui.S.id, slot, when);  // false when another browser marked it first: read either way
    } catch (e) {
      return notice(e.message);
    }
  } else {
    store("read-" + ui.S.id, JSON.stringify({ ...ui.read, [slot]: when }));
  }
  ui.read = { ...ui.read, [slot]: when };
  renderBoard();  // the case note's button back to the book
  markBookButton();
  renderFolder();  // the Rewards tab's reading list, if open
  if (!el) return;  // marked read in another browser meanwhile, and the screen has gone
  const shown = el;
  el.classList.add("done");
  setTimeout(() => el === shown && showReading(next), reduced() ? 0 : 1300);  // the stamp, then the next book or the case, unless put down meanwhile
}

// The book put down unread: the night's card comes as it would (maybeShowIntro passes the book over now), but a closed
// case's ending does not.
function putAside() {
  const waiting = unread()[0];  // none when the last book was stamped read meanwhile
  aside = waiting ? keyOf(waiting) : null;
  if (ui.S.finished && waiting) next = null;
  close();
}

// Every book is read, or put down: the case goes on.
function close() {
  if (el) {
    el.remove();
    el = null;
    behind().forEach((x) => (x.inert = false));
  }
  const then = next;
  next = null;
  if (then) then();
}

// A book was marked read in another browser of the shared case meanwhile: go on if none is left.
export function readElsewhere() {
  if (el && !unread().length) close();
}
