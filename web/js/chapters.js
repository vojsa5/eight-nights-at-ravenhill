// The opening comes in four chapters: the story (a film), How to play (a film), Inspector Hollis's advice (a film) and
// the case papers; every case begins with all four (prologue.js). Each chapter opens with a title card, and every scene
// and page shows the chapter bar: where it is among the four, any of which it jumps to. A chapter played on its own (the
// How to play and Advice buttons) shows only itself on the bar. Styles, and each chapter's own look, in css/chapters.css.
import { ROMAN } from "./format.js";
import { $ } from "./state.js";

export const CHAPTERS = ["The story", "How to play", "Inspector Hollis's advice", "The case papers"];
const SHORT = ["Story", "How to play", "Advice", "Case papers"];
const LOOKS = ["story", "howto", "advice", "papers"];  // each chapter's own look in css/chapters.css
const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen",
  "fifteen", "sixteen", "seventeen", "eighteen", "nineteen", "twenty"];
export const word = (n) => WORDS[n] || String(n);

// The bar: the four chapters, the current one marked; `alone`, just the current one, which goes nowhere.
export function chapterBar(current, alone = false) {
  const step = (name, i) => `<b>${i + 1}</b><span>${name}</span>`;
  if (alone) return `<nav class="chapters alone" aria-label="Chapter"><span class="ch-step on">${step(SHORT[current], current)}</span></nav>`;
  return `<nav class="chapters" aria-label="Chapters">${SHORT.map((name, i) => `<button class="ch-step${i === current ? " on" : ""}" data-chapter="${i}"
    ${i === current ? 'aria-current="step"' : ""} aria-label="Chapter ${ROMAN[i + 1]}: ${CHAPTERS[i]}" title="Chapter ${ROMAN[i + 1]}: ${CHAPTERS[i]}">${step(name, i)}</button>`).join("")}</nav>`;
}

// Where a click on the bar (or on anything else marked data-chapter) goes: set by prologue.js, which knows the chapters.
let jump = () => {};
export const onChapter = (fn) => (jump = fn);
document.addEventListener("click", (e) => {
  const to = e.target.closest?.("[data-chapter]");
  if (to && !to.closest(".alone")) jump(+to.dataset.chapter);
});

// A chapter's title card, full screen: its number, its name and a line on what it holds. It goes on to the chapter by
// itself after a moment, or at once on Next (Enter, →, space); ← goes `back` (to the end of the chapter before) and
// Skip skips the chapter (`skipTo`, labelled `skip`), as Escape does on the cards of the two films that end by going on
// (How to play and the advice). main.js turns the keys into chapterNext / chapterBack / chapterEscape.
const CARD_MS = 2800;
let card = null;                   // { i, go, back, skip, timer } while a title card shows
export function showChapterCard(i, { promise, go, back = null, skip = "", skipTo = null, alone = false }) {
  clearTimeout(card?.timer);
  $("modal").innerHTML = `<div class="chapter-card ch-${LOOKS[i]}" role="dialog" aria-modal="true" aria-label="Chapter ${ROMAN[i + 1]}: ${CHAPTERS[i]}">
    ${chapterBar(i, alone)}
    ${skipTo ? `<button class="film-skip" id="chapterSkip">${skip} ⏭</button>` : ""}
    <div class="ch-title"><span class="ch-num">Chapter ${ROMAN[i + 1]}</span><h2>${CHAPTERS[i]}</h2><p>${promise}</p></div>
    <button class="btn primary" id="chapterGo">Next →</button>
    <div class="film-bar" style="--scene:${CARD_MS}ms"><i></i></div></div>`;
  $("modal").classList.add("open");
  const shown = { i, go, back, skip: null, timer: 0 };
  card = shown;
  const leave = (to) => () => {
    if (card !== shown) return;
    clearTimeout(shown.timer);
    card = null;
    to();
  };
  shown.go = leave(go);
  shown.back = back && leave(back);
  shown.timer = setTimeout(() => chapterShowing() && shown.go(), CARD_MS);
  $("chapterGo").onclick = shown.go;
  if (skipTo) $("chapterSkip").onclick = shown.skip = leave(skipTo);
  $("chapterGo").focus({ preventScroll: true });
}

export const chapterShowing = () => !!card && !!document.querySelector("#modal > .chapter-card");
export const chapterNext = () => chapterShowing() && card.go();
export const chapterBack = () => chapterShowing() && card.back?.();
// Escape on a title card: skips How to play or the advice, as Escape does on their films; false elsewhere (the card closes).
export const chapterEscape = () => chapterShowing() && (card.i === 1 || card.i === 2) && !!card.skip && (card.skip(), true);
