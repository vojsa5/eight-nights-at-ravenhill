// A short illustrated film, played full screen: one scene at a time, the camera slowly moving in, the caption as
// a subtitle over the bottom of the picture, turning to the next scene by itself. The opening story, the story after every clear or arrest and the
// ending use it. A scene is [picture under art/ without .svg, where the camera moves in, caption,
// optional html laid over the picture (a guest's photograph)].
// The picture is drawn into the page rather than shown as an image, so that it moves like a film (css/film.css):
// its parts marked lf-* come alive (snow, flames, lamps, the drop in the brandy), its lf-far and lf-near groups
// move at their own pace as the camera moves in, and its data-fx marks add drifting snow, steam and glows. Each
// scene comes in over the last one with a dissolve, or with the cut its <svg> asks for (data-cut: iris, black,
// leak or pull, at data-cut-at), and the caption comes in phrase by phrase.
import { $ } from "./state.js";

export const sceneMs = (caption) => 3500 + 50 * caption.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").length;  // about the time it takes to read it

// Each picture's SVG, fetched once. A picture that did not load, or has a style or script of its own, stays an image.
const art = new Map();             // picture -> the promise of its text
const drawn = new Map();           // picture -> its text once it has come ("" when it stays an image)
export function loadArt(pic) {
  if (!art.has(pic)) {
    art.set(pic, fetch(`art/${pic}.svg`).then((r) => (r.ok ? r.text() : "")).catch(() => "")
      .then((text) => drawn.set(pic, /<(style|script)\b/i.test(text) ? "" : text)));
  }
  return art.get(pic);
}
export const preloadArt = (pics) => pics.forEach(loadArt);

// The picture as a stack of layers: what is far, the picture, what is near, and the vignette on top. Each layer is
// the whole SVG with only its own parts, its ids made unique (a dissolve shows two scenes at once), followed by
// the effects its data-fx marks ask for. Returns { box, cut, at, ratio, found }, or null while the SVG has not come;
// found is where its data-fx="found" mark is, as fractions of the picture, if it has one.
let ids = 0;
const LAYERS = ["far", "base", "near", "top"];
const layerOf = (el) => (el.classList.contains("lf-far") ? "far" : el.classList.contains("lf-near") ? "near"
  : /^url\(#[\w-]*vig\)$/.test(el.getAttribute("fill") || "") ? "top" : "base");

function drawArt(pic) {
  const text = drawn.get(pic);
  if (!text) return null;
  const parse = (prefix) => {
    const t = document.createElement("template");
    t.innerHTML = text.replace(/(\s)id="/g, `$1id="${prefix}`).replace(/url\(#/g, `url(#${prefix}`).replace(/(\s)href="#/g, `$1href="#${prefix}`);
    return t.content.querySelector("svg");
  };
  const first = parse("");
  if (!first) return null;
  const [, , w = 360, h = 200] = (first.getAttribute("viewBox") || "").split(/[\s,]+/).map(Number);
  const present = new Set([...first.children].filter((el) => el.tagName !== "defs").map(layerOf));
  const box = document.createElement("div");
  box.className = "film-art";
  box.style.aspectRatio = `${w} / ${h}`;
  box.setAttribute("aria-hidden", "true");
  for (const layer of LAYERS.filter((l) => present.has(l))) {
    const svg = parse(`fa${++ids}-`);
    svg.querySelector("title")?.remove();
    for (const el of [...svg.children]) if (el.tagName !== "defs" && layerOf(el) !== layer) el.remove();
    const div = document.createElement("div");
    div.className = `film-layer ${layer}`;
    div.append(svg, ...effects(svg, w, h));
    box.append(div);
  }
  const [fx, fy] = (first.querySelector('[data-fx="found"]')?.dataset.at || "").split(" ").map(Number);
  return { box, cut: first.dataset.cut || "", at: first.dataset.cutAt || "50% 50%", ratio: w / h, found: fx >= 0 && fy >= 0 ? [fx / w, fy / h] : null };
}

// The html effects a picture's empty <g data-fx="kind" data-at="x y" data-r="radius" data-ry="height" data-tone="..."/>
// marks ask for, placed in the picture's own units (an ellipse when data-ry is given); each has a number of particles
// (<i>) with their own pace and drift.
const PARTICLES = { snow: 2, steam: 5, smoke: 6, breath: 2, motes: 7, embers: 6 };
const jitter = (k, salt) => ((Math.sin(k * 12.9898 + salt * 78.233) * 43758.5453) % 1 + 1) % 1;
function effects(svg, w, h) {
  return [...svg.querySelectorAll("[data-fx]")].map((mark) => {
    const { fx, at = "", r, ry, tone } = mark.dataset, [x, y] = at.split(" ").map(Number);
    const el = document.createElement("div");
    el.className = `fx fx-${fx}${tone ? ` tone-${tone}` : ""}`;
    if (at) el.style.cssText = `left:${(100 * x / w).toFixed(2)}%;top:${(100 * y / h).toFixed(2)}%`;
    if (r) el.style.setProperty("--w", `${(200 * r / w).toFixed(2)}%`);
    if (r && ry) el.style.aspectRatio = `${r} / ${ry}`;
    el.innerHTML = Array.from({ length: PARTICLES[fx] || 0 }, (_, k) =>
      `<i style="--k:${k};--x:${jitter(k, 1).toFixed(2)};--y:${jitter(k, 2).toFixed(2)}"></i>`).join("");
    return el;
  });
}

// The scene going out, kept moving to fade over the next one: where its camera and each moving part had got to.
function outgoing() {
  const pan = document.querySelector(".film .film-pan");
  if (!pan) return null;
  const frame = pan.parentElement, cam = getComputedStyle(pan.firstElementChild);
  return { pan, transform: getComputedStyle(pan).transform, vars: ["--scene", "--focus", "--cut-at", "--ratio", "--fx", "--fy"].map((v) => [v, frame.style.getPropertyValue(v)]),
    cam: { transform: cam.transform, transformOrigin: cam.transformOrigin, clipPath: cam.clipPath, opacity: cam.opacity },
    times: pan.getAnimations({ subtree: true }).map((a) => [a.effect.target, a.effect.pseudoElement, a.animationName, a.currentTime]) };
}

function fadeOut(out, frame) {
  const { pan } = out;
  pan.className = "film-ghost";
  pan.style.transform = out.transform;
  out.vars.forEach(([name, value]) => pan.style.setProperty(name, value));
  Object.assign(pan.firstElementChild.style, out.cam);  // halfway through its own cut, it stays where it was
  frame.querySelector(".film-pan").after(pan);
  for (const a of pan.getAnimations({ subtree: true })) {
    const was = out.times.find(([el, pseudo, name]) => el === a.effect.target && pseudo === a.effect.pseudoElement && name === a.animationName);
    if (was) a.currentTime = was[3];
  }
  pan.addEventListener("animationend", (e) => e.target === pan && pan.remove());
  setTimeout(() => pan.remove(), 2000);
}

// The caption comes in phrase by phrase: each word is marked with the number of its phrase (--p), and a phrase
// ends at a comma, a full stop and the like. A heading (.film-title) is typed first. Screen readers get the
// caption whole, from a hidden copy, rather than word by word.
function phrases(el) {
  const said = document.createElement("span");
  said.className = "film-said";
  const copy = el.cloneNode(true);
  copy.querySelectorAll(".film-title").forEach((t) => t.append(". "));  // the heading, then the text, not run together
  said.textContent = copy.textContent.replace(/\s+/g, " ").trim();
  let p = 0, ended = false, typed = 0;
  const walk = (node) => {
    for (const n of [...node.childNodes]) {
      if (n.nodeType === Node.ELEMENT_NODE) {
        if (!n.classList.contains("film-title")) walk(n);
        else {
          typed = n.textContent.length;
          n.classList.add("typed");
          n.style.setProperty("--n", typed);
        }
      } else if (n.nodeType === Node.TEXT_NODE) {
        const words = document.createDocumentFragment();
        for (const word of n.textContent.split(/(\s+)/)) {
          if (!word.trim()) {
            words.append(word);
            continue;
          }
          if (ended) p++;
          const s = document.createElement("span");
          s.className = "ph";
          s.style.setProperty("--p", p);
          s.textContent = word;
          words.append(s);
          ended = /[.,;:!?…—–]["'”’)]?$/.test(word);
        }
        n.replaceWith(words);
      }
    }
  };
  walk(el);
  const seen = document.createElement("span");
  seen.setAttribute("aria-hidden", "true");
  seen.append(...el.childNodes);
  el.append(said, seen);
  el.style.setProperty("--start", `${350 + typed * 45}ms`);
  el.style.setProperty("--step", `${Math.round(Math.min(420, 2800 / (p + 1)))}ms`);
}

// The film fills the screen: its picture covers it, centred on the scene's focus (on what the search found, if the
// picture has a find) as far as the picture reaches (css: --ratio, --fx, --fy on .film-frame).
function crop(picture, focus) {
  const [fx, fy] = picture?.found || focus.split(" ").map((v) => parseFloat(v) / 100);
  return `--ratio:${picture ? picture.ratio.toFixed(4) : 1.8};--fx:${fx.toFixed(3)};--fy:${fy.toFixed(3)}`;
}

// Where the subtitle starts on the picture, so that what is laid over the picture keeps clear of it (css: --sub-top).
const subtitled = new ResizeObserver(() => {
  const el = document.querySelector(".film"), caption = el?.querySelector(".film-caption");
  if (caption) el.style.setProperty("--sub-top", `${Math.round(caption.getBoundingClientRect().top - el.querySelector(".film-frame").getBoundingClientRect().top)}px`);
});

// The buttons show while the pointer moves or a key is pressed, and fade away after a while without either (css:
// .film.idle); Skip stays. A tap on the picture brings them back rather than pressing a button it cannot see.
const IDLE_MS = 2800;
let idle = false, idleTimer = null;
function wake() {
  idle = false;
  document.querySelector(".film.idle")?.classList.remove("idle");
  clearTimeout(idleTimer);
  idleTimer = setTimeout(function rest() {
    if (!filmShowing()) return;
    if (document.querySelector(".film .nav:hover")) idleTimer = setTimeout(rest, IDLE_MS);  // the pointer rests on them
    else {
      idle = true;
      document.querySelector(".film").classList.add("idle");
    }
  }, IDLE_MS);
}
["pointermove", "pointerdown", "keydown"].forEach((type) => document.addEventListener(type, () => filmShowing() && wake(), true));

let film = null;                   // { scenes, done, back, label, skip, cls, bar }
let at = 0;
let shown = 0;                     // counts renders, so a timer from an earlier scene never fires on a later one
let paused = false, timer = null, due = 0, left = 0;

// Play `scenes` from scene `from`; `done` runs after the last one, or when the film is skipped (the Skip button
// says where to: `skip`), and `back` (if given) is where Back from the first scene goes. `cls` marks the film for
// styles and keys ("story" for the opening one); `bar` is html shown over every scene (the opening's chapter bar,
// chapters.js); `resume` turns back into a film just left (from the chapter after it), keeping its pause; any
// other call starts it afresh, also a film that was closed before.
export function playFilm(scenes, { from = 0, done, back, label = "The story", skip = "Skip", cls = "", bar = "", resume = false }) {
  const fresh = !film || film.scenes !== scenes || (!filmShowing() && !resume);
  if (fresh) paused = false;       // a new film starts playing; turning back into the same one keeps the pause
  film = { scenes, done, back, label, skip, cls, bar };
  preloadArt(scenes.map(([pic]) => pic));
  showScene(from, fresh);
}

export const filmShowing = () => !!document.querySelector(".film");

function showScene(n, fresh = false) {
  clearTimeout(timer);
  if (n >= film.scenes.length) return film.done();
  at = Math.max(0, n);
  const run = ++shown, [pic, focus, caption, over = ""] = film.scenes[at], ms = sceneMs(caption), count = film.scenes.length;
  const out = fresh || n < 0 ? null : outgoing(), picture = drawArt(pic);  // ← on the first scene starts it again
  if (fresh || !filmShowing()) wake();  // a film starting, or turned back into, shows its buttons
  $("modal").innerHTML = `<div class="film ${film.cls}${paused ? " paused" : ""}${fresh ? " fresh" : ""}${idle ? " idle" : ""}" role="dialog"
      aria-modal="true" aria-label="${film.label}, scene ${at + 1} of ${count}">
    <div class="film-frame" style="--scene:${ms}ms;--focus:${focus};--cut-at:${picture ? picture.at : "50% 50%"};${crop(picture, focus)}" data-cut="${picture ? picture.cut : ""}">
      <div class="film-pan" style="transform-origin:${focus}"><div class="film-cam">${picture ? "" : `<img src="art/${pic}.svg" alt="">`}</div></div>
      <div class="film-look" aria-hidden="true"><i class="grain"></i><i class="flicker"></i><i class="dust"></i><i class="leak"></i></div>
      ${over}
      <button class="film-skip" data-action="film-skip">${film.skip} ⏭</button>
    </div>
    <div class="film-foot">
      <p class="film-caption">${caption}</p>
      ${film.bar}
      <div class="nav">
        ${at || film.back ? `<button class="btn" data-action="film-back" title="Previous scene (←)">← Back</button>` : "<span></span>"}
        <span class="dots">${count > 1 ? film.scenes.map((_, j) => `<i class="${j === at ? "on" : ""}"></i>`).join("") : ""}</span>
        <span><button class="btn" data-action="film-pause" id="filmPause" title="Pause (space)">❚❚ Pause</button>
        <button class="btn primary" data-action="film-next" id="filmNext" title="Next scene (→)">Next →</button></span>
      </div>
    </div>
    <div class="film-bar" style="--scene:${ms}ms"><i></i></div></div>`;
  const cam = document.querySelector(".film-pan > .film-cam");
  if (picture) cam.append(picture.box);
  else loadArt(pic).then(() => {  // came late: the picture comes alive where it stands
    const late = run === shown && drawArt(pic);
    if (!late) return;
    cam.replaceChildren(late.box);
    cam.closest(".film-frame").style.cssText += `;${crop(late, focus)}`;
  });
  if (out) fadeOut(out, cam.closest(".film-frame"));
  phrases(document.querySelector(".film-caption"));
  subtitled.disconnect();
  document.querySelectorAll(".film-foot, .film-caption").forEach((el) => subtitled.observe(el));
  $("modal").classList.add("open");
  left = ms;
  if (!paused) play(run);
  setPauseLabel();
  $("filmNext").focus({ preventScroll: true });
}

function play(run) {
  due = Date.now() + left;
  timer = setTimeout(() => {
    if (run === shown && filmShowing()) showScene(at + 1);
  }, left);
}

function setPauseLabel() {
  const b = $("filmPause");
  if (b) b.innerHTML = paused ? "▶ Play" : "❚❚ Pause";
}

export function togglePause() {
  const el = document.querySelector(".film");
  if (!el) return;
  paused = !paused;
  el.classList.toggle("paused", paused);
  if (paused) {
    clearTimeout(timer);
    left = Math.max(0, due - Date.now());
  } else {
    play(shown);
  }
  setPauseLabel();
}

export const nextScene = () => showScene(at + 1);
export function previousScene() {
  if (at || !film.back) return showScene(at - 1);
  clearTimeout(timer);
  film.back();
}
export function skipFilm() {
  clearTimeout(timer);
  film.done();
}
