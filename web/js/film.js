// A short illustrated film: one scene at a time, the camera slowly moving in, the caption underneath,
// turning to the next scene by itself. The opening story, the story after every clear or arrest and the
// ending use it. A scene is [picture under art/ without .svg, where the camera moves in, caption,
// optional html laid over the picture (a guest's photograph)].
import { $ } from "./state.js";

const sceneMs = (caption) => 3500 + 50 * caption.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").length;  // about the time it takes to read it

let film = null;                   // { scenes, done, label, skip, cls }
let at = 0;
let shown = 0;                     // counts renders, so a timer from an earlier scene never fires on a later one
let paused = false, timer = null, due = 0, left = 0;

// Play `scenes` from scene `from`; `done` runs after the last one, or when the film is skipped, and `back`
// (if given) is where Back from the first scene goes. `cls` marks the film for styles and keys ("story" for
// the opening one).
export function playFilm(scenes, { from = 0, done, back, label = "The story", skip = "Skip", cls = "" }) {
  const fresh = !film || film.scenes !== scenes;
  if (fresh) paused = false;       // a new film starts playing; turning back into the same one keeps the pause
  film = { scenes, done, back, label, skip, cls };
  showScene(from, fresh);
}

export const filmShowing = () => !!document.querySelector(".film");

function showScene(n, fresh = false) {
  clearTimeout(timer);
  if (n >= film.scenes.length) return film.done();
  at = Math.max(0, n);
  const run = ++shown, [pic, focus, caption, over = ""] = film.scenes[at], ms = sceneMs(caption), count = film.scenes.length;
  $("modal").innerHTML = `<div class="film ${film.cls}${paused ? " paused" : ""}${fresh ? " fresh" : ""}" role="dialog" aria-modal="true"
      aria-label="${film.label}, scene ${at + 1} of ${count}">
    <div class="film-frame" style="--scene:${ms}ms">
      <div class="film-pan" style="transform-origin:${focus}"><img src="art/${pic}.svg" alt=""></div>
      ${over}
      <button class="film-skip" data-action="film-skip" title="${film.skip}">Skip ⏭</button>
      <div class="film-bar"><i></i></div>
    </div>
    <p class="film-caption">${caption}</p>
    <div class="nav">
      ${at || film.back ? `<button class="btn" data-action="film-back" title="Previous scene (←)">← Back</button>` : "<span></span>"}
      <span class="dots">${count > 1 ? film.scenes.map((_, j) => `<i class="${j === at ? "on" : ""}"></i>`).join("") : ""}</span>
      <span><button class="btn" data-action="film-pause" id="filmPause" title="Pause (space)">❚❚ Pause</button>
      <button class="btn primary" data-action="film-next" id="filmNext" title="Next scene (→)">Next →</button></span>
    </div></div>`;
  if (at + 1 < count) new Image().src = `art/${film.scenes[at + 1][0]}.svg`;
  $("modal").classList.add("open");
  left = ms;
  if (!paused) play(run);
  setPauseLabel();
  $("filmNext").focus();
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
