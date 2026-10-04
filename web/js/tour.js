// A guided tour of a folder tab: the page dims, a soft light falls on one part of the open tab at a time, and a paper
// card beside it says what that part is and how to use it. Some steps act out a little demonstration (a pointer
// resting on a row, a slip dragged to another pile) and put everything back afterwards: a tour never changes the
// case or your notes. It plays like the films (film.js): a bar for the time left, Play/Pause, Back / Next and Skip,
// with ← → space and Escape (main.js passes keys here first). The tours themselves, a list of steps per tab, are in
// tours.js; the button beside the folder's title shows on every tab that has one.
import { closeBook, renderFolder, showBook } from "./folder.js";
import { $, ui } from "./state.js";
import { closePicker, togglePicker } from "./theory.js";
import { titleOpen } from "./title.js";
import { TOURS } from "./tours.js";

const PAD = 10;   // the light reaches this far past what it shows
const GAP = 16;   // between the light and the card
const EDGE = 12;  // the card keeps this far from the window's edges

const phone = () => matchMedia("(max-width: 700px), (max-height: 500px)").matches;  // the phone layout (responsive.css)
const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// a card or film over the page, or a screen over all of it (the opening screen, the reading screen: they make the page
// behind them inert, #modal too, which a tour never does)
const covered = () => titleOpen() || $("modal").classList.contains("open") || $("modal").inert;
const stepMs = (text) => 4000 + 50 * text.replace(/<[^>]*>/g, "").length;  // about the time it takes to read it, and to look
const list = (x) => (Array.isArray(x) ? x : [x]).filter((el) => el && el.isConnected);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

let T = null;  // the tour playing

export function startTour() {
  const steps = TOURS[ui.tab], body = $("tabbody"), from = document.activeElement;
  if (T || !steps || !ui.S || !ui.folderOpen || covered() || $("desk").inert) return;
  document.querySelectorAll(".tour").forEach((el) => el.remove());  // the last tour, still fading
  const restore = snapshot();
  if (closePicker()) renderFolder();  // the Theory tab's role sheet and a book open large close first, as Escape would close them
  closeBook();
  const playable = steps.filter((s) => (!s.when || s.when()) && list(s.at(body)).length);
  if (!playable.length) return restore();
  T = { tab: ui.tab, steps: playable, at: 0, paused: still(), holes: [], timers: [], fresh: true, from, restore };
  build();
  // keyboard and screen readers stay with the card; the page behind is only lit, never used
  T.inert = [...document.querySelectorAll("body > .casebar, body > .desk")].filter((el) => !el.inert);
  T.inert.forEach((el) => (el.inert = true));
  show(0);
  T.raf = requestAnimationFrame(frame);
}

export function endTour() {
  if (!T) return;
  const t = T;
  leave();
  T = null;
  cancelAnimationFrame(t.raf);
  clearTimeout(t.timer);
  if (!titleOpen() && !$("modal").inert) t.inert.forEach((el) => (el.inert = false));  // not under a screen that wants them
  // the layer fades, and keeps catching clicks meanwhile: a double click's second half never reaches the page
  t.layer.classList.add("leaving");
  setTimeout(() => t.layer.remove(), 300);
  if (covered()) return;
  const back = t.from?.isConnected && !t.from.hidden && !t.from.closest("[inert]") ? t.from : $("tour-btn");
  back?.focus({ preventScroll: true });
  t.restore();
}

// How the tab stood when the tour began, as a function that puts it back: its scroll, and a role sheet or a book open
// large (which the tour closes first).
function snapshot() {
  const body = $("tabbody"), tab = ui.tab, top = body.scrollTop;
  const pick = body.querySelector(".trole.open")?.dataset.pick, book = body.querySelector(".bookview")?.getAttribute("aria-label");
  return () => {
    if (ui.tab !== tab || !ui.folderOpen) return;
    if (pick !== undefined && !body.querySelector(".tpicker")) {
      togglePicker(+pick);
      renderFolder();
    }
    const tome = book && [...body.querySelectorAll(".shelves [data-book]")].find((x) => x.title === book);
    if (tome) showBook(+tome.dataset.book);
    body.scrollTo({ top, behavior: still() ? "auto" : "smooth" });
  };
}

// The keys while a tour plays: ← → step, space pauses, Escape ends it. True when the tour took the key; nothing
// else on the page answers keys meanwhile (Tab and Enter work the card's buttons as usual).
export function tourKey(e) {
  if (!T) return false;
  if (covered()) {
    endTour();
    return false;
  }
  const act = { ArrowRight: next, ArrowLeft: back, " ": togglePause, Escape: endTour }[e.key];
  if (act) {
    e.preventDefault();
    act();
  }
  return true;
}

// The layer over the page: the dimming with its holes (an SVG mask, the holes blurred for a soft edge), what the
// demonstrations float above it, and the card.
function build() {
  const layer = document.createElement("div");
  layer.className = `tour${still() ? "" : " fresh"}`;
  layer.innerHTML = `<svg class="tour-dim" aria-hidden="true"><defs>
      <filter id="tour-soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
      <mask id="tour-mask"><rect width="100%" height="100%" fill="#fff"/><g class="tour-holes" fill="#000"></g></mask></defs>
      <rect class="tour-shade" width="100%" height="100%" mask="url(#tour-mask)"/></svg>
    <div class="tour-floats" aria-hidden="true"><svg class="tour-pointer" viewBox="0 0 24 24"><path d="M4 2.5v17l4.4-4.2 3.1 6.8 3-1.4-3-6.6h6.1z"/></svg></div>
    <div class="tour-card" role="dialog" aria-modal="true" aria-describedby="tour-text"></div>
    <p class="tour-said" aria-live="polite"></p>`;
  document.body.append(layer);
  Object.assign(T, { layer, holeG: layer.querySelector(".tour-holes"), floats: layer.querySelector(".tour-floats"),
    pointer: layer.querySelector(".tour-pointer"), card: layer.querySelector(".tour-card"), said: layer.querySelector(".tour-said") });
  const ACT = { back, next, pause: togglePause, skip: endTour };
  layer.addEventListener("click", (e) => {
    if (!T || T.layer !== layer) return;  // fading out
    const b = e.target.closest("[data-tour]");
    if (b) ACT[b.dataset.tour]();
    else if (!e.target.closest(".tour-card")) endTour();  // a click beside the card skips the tour, as beside a film
  });
  // the tour moves the tab itself: the wheel and a finger leave it be (the card scrolls, if it must)
  layer.addEventListener("wheel", (e) => e.target.closest(".tour-card") || e.preventDefault(), { passive: false });
  layer.addEventListener("touchmove", (e) => e.target.closest(".tour-card") || e.preventDefault(), { passive: false });
  layer.addEventListener("keyup", (e) => e.key === " " && e.preventDefault());  // space pauses, and never also presses a button
}

const next = () => (T.at + 1 < T.steps.length ? show(T.at + 1) : endTour());
const back = () => T.at && show(T.at - 1);

function show(n) {
  leave();
  T.at = n;
  const step = T.steps[n], body = $("tabbody"), count = T.steps.length, last = n === count - 1;
  T.els = list(step.at(body));
  if (!T.els.length) return n + 1 < count ? show(n + 1) : endTour();  // gone since the tour began
  const text = typeof step.text === "function" ? step.text(T.els) : step.text;
  T.ms = step.ms || stepMs(text);
  T.card.className = `tour-card${T.paused ? " paused" : ""}`;
  T.card.setAttribute("aria-label", `How this tab works, step ${n + 1} of ${count}: ${step.head}`);
  T.card.innerHTML = `<div class="tour-bar"><i style="--step:${T.ms}ms"></i></div><div class="tour-in">
    <div class="tour-top"><span class="tour-kicker">${$("folder-title").textContent} · ${n + 1} of ${count}</span>
      <button class="tour-skip" data-tour="skip" title="End the tour (Esc)">Skip ⏭</button></div>
    <h3 id="tour-head">${step.head}</h3>
    <p class="tour-text" id="tour-text">${text}</p>
    <div class="tour-nav">${n ? `<button class="btn" data-tour="back" title="Previous step (←)">← Back</button>` : "<span></span>"}
      <span class="dots">${count > 1 ? T.steps.map((_, j) => `<i class="${j === n ? "on" : ""}"></i>`).join("") : ""}</span>
      <span><button class="btn" data-tour="pause" title="Pause (space)"></button>
      <button class="btn primary" data-tour="next" title="${last ? "End the tour (→)" : "Next step (→)"}">${last ? "Done" : "Next →"}</button></span></div></div>`;
  T.said.textContent = `${step.head}. ${T.card.querySelector(".tour-text").textContent.replace(/\s+/g, " ")}`;  // read out once
  T.point = null;
  T.pointer.classList.remove("on");
  if (step.demo) T.undo = safely(() => step.demo(context(step), T.els)) || null;
  const now = list(step.at(body));
  if (now.length) T.els = now;  // what the demonstration opened, if anything
  reveal();
  T.left = T.ms;
  if (!T.paused) play();
  setPauseLabel();
  T.card.querySelector('[data-tour="next"]').focus({ preventScroll: true });
}

// Ends the step: its demonstration is put back and its timers stopped.
function leave() {
  clearTimeout(T.timer);
  T.timers.forEach(clearTimeout);
  T.timers = [];
  T.floats.querySelectorAll(".tour-ghost").forEach((g) => g.remove());
  const undo = T.undo;
  T.undo = null;
  if (undo) safely(undo);
}

// A demonstration that fails is left out, and never leaves the page locked behind the tour.
function safely(fn) {
  try {
    return fn();
  } catch (e) {
    console.error(e);
    return null;
  }
}

// The time left on a step, as film.js keeps it; the bar under the card fills meanwhile.
function play() {
  const run = T.run = (T.run || 0) + 1;
  T.due = Date.now() + T.left;
  T.timer = setTimeout(() => T && T.run === run && next(), T.left);
}

function togglePause() {
  T.paused = !T.paused;
  T.card.classList.toggle("paused", T.paused);
  if (T.paused) {
    clearTimeout(T.timer);
    T.left = Math.max(0, T.due - Date.now());
  } else {
    play();
  }
  setPauseLabel();
}

const setPauseLabel = () => (T.card.querySelector('[data-tour="pause"]').textContent = T.paused ? "▶ Play" : "❚❚ Pause");

// What a step's demonstration may use: the tab, timers that stop with the step, the pointer, floating copies.
function context(step) {
  return {
    body: $("tabbody"),
    still: still(),
    after: (ms, fn) => T.timers.push(setTimeout(() => T && fn(), ms)),
    point,
    press,
    ghost,
    glide,
    reveal: () => {  // after the demonstration opened something: light it and bring it into view
      T.els = list(step.at($("tabbody")));
      reveal();
    },
  };
}

// The pointer, resting on `el` (fx, fy across it); it follows the element if the tab scrolls. Held, it moves with
// the element at once (a dragged copy) instead of gliding after it.
function point(el, fx = 0.5, fy = 0.55, held = false) {
  const p = T.pointer, r = el.getBoundingClientRect();
  p.classList.toggle("held", held);
  if (!p.classList.contains("on")) {  // it comes in from below
    p.style.transition = "none";
    p.style.transform = `translate(${r.left + r.width * fx + 40}px, ${r.top + r.height * fy + 70}px)`;
    p.getBoundingClientRect();
    p.style.transition = "";
    p.classList.add("on");
  }
  T.point = { el, fx, fy };
  T.px = null;
}

// The pointer presses where it rests: a ring spreads from its tip. Only a picture of a click: the step itself opens
// whatever the click would.
function press() {
  if (!T.point || T.px === null) return;
  const ring = document.createElement("i");
  ring.className = "tour-tap";
  ring.style.transform = `translate(${T.px}px, ${T.py}px)`;
  T.floats.append(ring);
  T.pointer.classList.add("press");
  setTimeout(() => {
    ring.remove();
    T?.pointer.classList.remove("press");
  }, 500);
}

// A copy of `el` floating over the dimming where `el` is (a dragged slip); custom colours come along.
function ghost(el) {
  const r = el.getBoundingClientRect(), cs = getComputedStyle(el), g = el.cloneNode(true);
  g.removeAttribute("id");
  g.inert = true;  // only a picture: its buttons take no focus
  g.classList.add("tour-ghost");
  for (const v of ["--c", "--ink", "--muted", "--line", "--guilty", "--innocent", "--unsure", "--good", "--bad", "--soft-good", "--soft-bad", "--side"]) {
    g.style.setProperty(v, cs.getPropertyValue(v));
  }
  Object.assign(g.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, color: cs.color });
  g._from = r;
  T.floats.append(g);
  return g;
}

// Moves a ghost over `to` (its top left corner to the point fx, fy across it).
function glide(g, to, fx = 0, fy = 0) {
  const r = to.getBoundingClientRect();
  g.style.transform = `translate(${r.left + r.width * fx - g._from.left}px, ${r.top + r.height * fy - g._from.top}px) rotate(-2deg)`;
}

// Scrolls the tab, smoothly and only if need be, to show what the step lights, below any sticky table head; on a
// phone with room left above or below it for the card.
function reveal() {
  const body = $("tabbody"), els = T.els.filter((el) => body.contains(el) && !pinned(el, body));
  if (!els.length) return;
  const box = body.getBoundingClientRect(), rs = els.map((el) => el.getBoundingClientRect());
  const top = Math.min(...rs.map((r) => r.top)), bottom = Math.max(...rs.map((r) => r.bottom));
  const from = box.top + stickyHead(els[0], body) + PAD, to = box.bottom - PAD;
  const room = phone() ? T.card.offsetHeight + GAP + PAD : 0;
  const roomy = !room || innerHeight - EDGE - bottom >= room || top - EDGE >= room;
  if (top >= from && bottom <= to && roomy) return;
  const by = top - from - (phone() ? 2 : clamp((to - from - (bottom - top)) / 3, 4, 70));
  body.scrollTo({ top: body.scrollTop + by, behavior: still() ? "auto" : "smooth" });
}

// Is `el` in a part of the tab that does not scroll with it (the Theory tab's role sheet, a book open large: placed
// against the folder itself)?
function pinned(el, body) {
  for (let p = el; p && p !== body; p = p.parentElement) {
    const pos = getComputedStyle(p).position;
    if ((pos === "absolute" || pos === "fixed") && !body.contains(p.offsetParent)) return true;
  }
  return false;
}

// The height of a head that sticks to the top of the tab over `el`'s part of it: a table's head (its cells stick), or a
// sticky header beside `el` or one of its ancestors (a night's page in the Case file).
function stickyHead(el, body) {
  const sticks = (x) => getComputedStyle(x).position === "sticky";
  for (let p = el.parentElement, from = el; p && p !== body; from = p, p = p.parentElement) {
    if (p.tagName === "TABLE" && p.tHead && from !== p.tHead && [...p.tHead.querySelectorAll("th")].some(sticks)) return p.tHead.offsetHeight;
    const head = [...p.children].find((x) => x !== from && x.compareDocumentPosition(from) & Node.DOCUMENT_POSITION_FOLLOWING && sticks(x));
    if (head) return head.offsetHeight;
  }
  return 0;
}

// Every frame while the tour plays: follow what the step lights (the tab may scroll or be redrawn), ease the holes
// and the card towards it, and end the tour if something else takes over the page.
function frame(now) {
  if (!T) return;
  T.raf = requestAnimationFrame(frame);
  if (covered() || !ui.folderOpen || ui.tab !== T.tab) return endTour();
  const dt = Math.min(64, now - (T.last || now));
  T.last = now;
  const k = T.fresh || still() ? 1 : 1 - Math.exp(-dt / 90);
  if (T.els.some((el) => !el.isConnected)) {  // the tab was redrawn
    const els = list(T.steps[T.at].at($("tabbody")));
    if (els.length) T.els = els;
  }
  const targets = lights();
  easeHoles(targets, k);
  drawHoles();
  placeCard(targets, k);
  movePointer();
  T.fresh = false;
}

// The rectangles to light, in px of the window: each element padded, and kept inside the tab if it is in it.
function lights() {
  const body = $("tabbody"), box = body.getBoundingClientRect(), step = T.steps[T.at];
  const rects = T.els.filter((el) => el.isConnected).map((el) => {
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return null;
    const c = body.contains(el) ? box : { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const x1 = Math.max(r.left - PAD, c.left), y1 = Math.max(r.top - PAD, c.top);
    const x2 = Math.min(r.right + PAD, c.right), y2 = Math.min(r.bottom + PAD, c.bottom);
    return x2 - x1 > 6 && y2 - y1 > 6 ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : null;
  }).filter(Boolean);
  if (!step.join || rects.length < 2) return rects;
  const x1 = Math.min(...rects.map((r) => r.x)), y1 = Math.min(...rects.map((r) => r.y));
  const x2 = Math.max(...rects.map((r) => r.x + r.w)), y2 = Math.max(...rects.map((r) => r.y + r.h));
  return [{ x: x1, y: y1, w: x2 - x1, h: y2 - y1 }];
}

// A hole glides to its new place; a new one opens from its centre, and one no longer needed closes into its own.
function easeHoles(targets, k) {
  const holes = T.holes;
  targets.forEach((t, i) => {
    const h = holes[i] || (holes[i] = { x: t.x + t.w / 2, y: t.y + t.h / 2, w: 0, h: 0 });
    for (const key of ["x", "y", "w", "h"]) h[key] += (t[key] - h[key]) * k;
  });
  for (let i = targets.length; i < holes.length; i++) {
    const h = holes[i], w = h.w * (1 - k), hh = h.h * (1 - k);
    Object.assign(h, { x: h.x + (h.w - w) / 2, y: h.y + (h.h - hh) / 2, w, h: hh });
  }
  while (holes.length > targets.length && holes[holes.length - 1].w < 1) holes.pop();
}

function drawHoles() {
  const g = T.holeG;
  while (g.childElementCount < T.holes.length) {
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("filter", "url(#tour-soft)");  // each hole blurred on its own: a small area to blur
    g.append(rect);
  }
  [...g.children].forEach((rect, i) => {
    const h = T.holes[i] || { x: 0, y: 0, w: 0, h: 0 };
    const attrs = { x: h.x.toFixed(1), y: h.y.toFixed(1), width: h.w.toFixed(1), height: h.h.toFixed(1), rx: Math.min(12, h.w / 2, h.h / 2).toFixed(1) };
    for (const [a, v] of Object.entries(attrs)) if (rect.getAttribute(a) !== v) rect.setAttribute(a, v);
  });
}

// The card beside the first thing lit: next to it, below or above it, wherever it covers none of the lights and stays
// nearest (on a phone below or above first); a notch on its edge points at the light.
function placeCard(targets, k) {
  const card = T.card, w = card.offsetWidth, h = card.offsetHeight, vw = innerWidth, vh = innerHeight;
  const p = targets[0];
  let best;
  if (!p) {
    best = T.pos ? { ...T.pos, side: "" } : { x: (vw - w) / 2, y: (vh - h) / 2, side: "" };
  } else {
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2, fitX = (x) => clamp(x, EDGE, vw - w - EDGE), fitY = (y) => clamp(y, EDGE, vh - h - EDGE);
    const spots = [];
    const add = (side, x, y, cost) => {
      const r = { x, y, w, h };
      const over = targets.reduce((sum, t) => sum + overlap(r, t, 6), 0);
      spots.push({ side, x, y, score: over * 50 + Math.hypot(x + w / 2 - cx, y + h / 2 - cy) + cost });
    };
    const ys = [cy - h / 2, p.y, p.y + p.h - h, ...[-1, 1].flatMap((d) => [1, 2, 3, 4, 6, 8].map((s) => cy - h / 2 + d * s * 50))];
    const xs = [cx - w / 2, p.x, p.x + p.w - w];
    // beside it where there is room (on a phone only on its side: upright, the card is as wide as the window)
    if (p.x - GAP - w >= EDGE) ys.forEach((y) => add("left", p.x - GAP - w, fitY(y), phone() ? 40 : 0));
    if (p.x + p.w + GAP + w <= vw - EDGE) ys.forEach((y) => add("right", p.x + p.w + GAP, fitY(y), phone() ? 40 : 120));
    if (p.y + p.h + GAP + h <= vh - EDGE) xs.forEach((x) => add("below", fitX(x), p.y + p.h + GAP, phone() ? 0 : 60));
    if (p.y - GAP - h >= EDGE) xs.forEach((x) => add("above", fitX(x), p.y - GAP - h, phone() ? 10 : 70));
    // no room beside it at all (it fills the window): over its lower or upper edge
    add("", fitX(cx - w / 2), vh - h - EDGE, 400);
    add("", fitX(cx - w / 2), EDGE, 420);
    best = spots.reduce((a, b) => (b.score < a.score ? b : a));
  }
  if (!T.pos || k === 1) T.pos = { x: best.x, y: best.y };
  else {
    T.pos.x += (best.x - T.pos.x) * k;
    T.pos.y += (best.y - T.pos.y) * k;
  }
  const x = Math.round(T.pos.x), y = Math.round(T.pos.y);
  const tf = `translate(${x}px, ${y}px)`;
  if (card.style.transform !== tf) card.style.transform = tf;
  if (card.dataset.side !== best.side) card.dataset.side = best.side;
  if (p && best.side) {
    const along = best.side === "left" || best.side === "right" ? clamp(p.y + p.h / 2 - y, 22, h - 22) : clamp(p.x + p.w / 2 - x, 22, w - 22);
    card.style.setProperty("--notch", `${Math.round(along)}px`);
  }
}

const overlap = (a, b, m) => Math.max(0, Math.min(a.x + a.w, b.x + b.w - m) - Math.max(a.x, b.x + m))
  * Math.max(0, Math.min(a.y + a.h, b.y + b.h - m) - Math.max(a.y, b.y + m));

function movePointer() {
  const pt = T.point;
  if (!pt) return;
  if (!pt.el.isConnected) {  // what it pressed was redrawn: it leaves
    T.pointer.classList.remove("on");
    T.point = null;
    return;
  }
  const r = pt.el.getBoundingClientRect(), x = r.left + r.width * pt.fx, y = r.top + r.height * pt.fy;
  if (T.px !== null && Math.abs(x - T.px) < 0.5 && Math.abs(y - T.py) < 0.5) return;
  T.px = x;
  T.py = y;
  T.pointer.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
}

// The button beside the folder's title: shown on the tabs that have a tour. It follows the title, which the folder
// sets on every render (folder.js renderFolder).
const button = $("tour-btn");
if (button) {
  const sync = () => (button.hidden = !TOURS[ui.tab] || !ui.S);
  new MutationObserver(sync).observe($("folder-title"), { childList: true, characterData: true, subtree: true });
  sync();
  button.onclick = startTour;
}
