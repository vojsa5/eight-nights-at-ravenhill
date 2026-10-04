// The opening screen: Ravenhill Manor at night in the snow, the case's eight moons and the title. It shows on every
// visit and for every new case, over everything, while the case loads behind it; entering dives towards the front
// door. Styles: css/title.css.
import { shelf } from "./books.js";
import { unread } from "./reading.js";
import { ROMAN, moonSvg } from "./format.js";
import { $ } from "./state.js";

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
let el = null, onClose = null, stopSnow = () => {};

// warm windows: [x, y, width, height, how it burns (""; "flicker"; "dim"; "slow": goes out and back)]
const WINDOWS = [
  [640, 546, 18, 28, "flicker"], [680, 546, 18, 28, ""], [720, 546, 18, 28, "dim"], [862, 546, 18, 28, ""], [902, 546, 18, 28, "slow"],
  [942, 546, 18, 28, "flicker"], [640, 604, 18, 30, ""], [720, 604, 18, 30, "flicker"], [862, 604, 18, 30, "dim"], [902, 604, 18, 30, ""],
  [942, 604, 18, 30, "flicker"], [500, 596, 16, 26, ""], [540, 596, 16, 26, "dim"], [580, 596, 16, 26, "flicker"], [1004, 596, 16, 26, "slow"],
  [1044, 596, 16, 26, ""], [1084, 596, 16, 26, "dim"], [792, 414, 16, 34, "flicker"],
];

// The library window, where someone crosses the lamp now and then.
const LIBRARY = [676, 602, 26, 34];

function windowsSvg() {
  const lit = WINDOWS.map(([x, y, w, h, how], i) => `<rect class="ts-win ${how}" x="${x}" y="${y}" width="${w}" height="${h}" rx="1"
    style="--d:${(i * 0.37) % 3}s"/>`).join("");
  const [x, y, w, h] = LIBRARY;
  return `<g filter="url(#ts-glow)">${lit}<rect class="ts-win" x="${x}" y="${y}" width="${w}" height="${h}" rx="2"/></g>
    <clipPath id="ts-libclip"><rect x="${x}" y="${y}" width="${w}" height="${h}"/></clipPath>
    <g clip-path="url(#ts-libclip)"><path class="ts-passer" fill="#120a04" d="M${x - 14} ${y + h} v-12 c0 -6 3 -9 7 -10 a5 5 0 1 1 6 0
      c4 1 7 4 7 10 v12z"/></g>`;
}

// The light the ground-floor windows throw on the snow.
const spillSvg = () => WINDOWS.filter(([, y]) => y > 590).concat([LIBRARY]).map(([x, y, w]) =>
  `<path d="M${x} 662 L${x + w} 662 L${x + w + 26} 700 L${x - 26} 700Z"/>`).join("");

// Footprints up the drive to the front door, smaller as they go.
function footprintsSvg() {
  let out = "";
  for (let i = 0; i < 22; i++) {
    const t = i / 21, y = 890 - t * 222, x = 800 + Math.sin(t * 2.4) * 30 * (1 - t) + (i % 2 ? 1 : -1) * (7 - 5 * t), s = 1 - 0.75 * t;
    out += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(3.4 * s).toFixed(2)}" ry="${(6 * s).toFixed(2)}"/>`;
  }
  return out;
}

// Iron railings either side of the gate.
function railingsSvg() {
  let out = "";
  for (let x = 6; x < 1600; x += 22) {
    if (x > 512 && x < 1088) continue;
    out += `<path d="M${x} 884 V806 l-4 -9 h8 l-4 9"/>`;
  }
  return out + `<rect x="0" y="816" width="520" height="5"/><rect x="1080" y="816" width="520" height="5"/>
    <rect x="0" y="866" width="520" height="5"/><rect x="1080" y="866" width="520" height="5"/>`;
}

const gatepost = (x) => `<g class="ts-post"><rect x="${x}" y="742" width="52" height="158"/><rect x="${x - 8}" y="730" width="68" height="14"/>
  <rect x="${x + 12}" y="702" width="28" height="30"/><path d="M${x + 8} 704 L${x + 26} 688 L${x + 44} 704Z"/>
  <rect class="ts-lamp" x="${x + 16}" y="706" width="20" height="22"/></g>
  <circle class="ts-lampglow" cx="${x + 26}" cy="717" r="95" fill="url(#ts-lampglow)"/>`;

const RAVEN = "M-42 -9 L-24 -18 C-15 -28 -2 -33 9 -37 C13 -44 21 -47 27 -43 L39 -38 L27 -35 C24 -30 21 -26 17 -20 C13 -11 5 -6 -3 -6 L0 0 L-3 0 L-6 -6 C-16 -6 -28 -7 -42 -9Z";

const SCENE = `
<svg class="ts-scene" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
  <defs>
    <radialGradient id="ts-halo"><stop offset="0" stop-color="#dfe6f5" stop-opacity=".42"/><stop offset=".35" stop-color="#9fb0d4" stop-opacity=".13"/><stop offset="1" stop-color="#9fb0d4" stop-opacity="0"/></radialGradient>
    <radialGradient id="ts-moonface" cx="42%" cy="40%"><stop offset="0" stop-color="#fbfaf2"/><stop offset=".7" stop-color="#e3e1d4"/><stop offset="1" stop-color="#c9c9be"/></radialGradient>
    <radialGradient id="ts-lampglow"><stop offset="0" stop-color="#ffcf7a" stop-opacity=".55"/><stop offset=".4" stop-color="#ffb04a" stop-opacity=".16"/><stop offset="1" stop-color="#ffb04a" stop-opacity="0"/></radialGradient>
    <linearGradient id="ts-snowfield" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7d89a8"/><stop offset=".45" stop-color="#4a5574"/><stop offset="1" stop-color="#1c2236"/></linearGradient>
    <linearGradient id="ts-drive" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9aa6c2"/><stop offset="1" stop-color="#5b6684"/></linearGradient>
    <linearGradient id="ts-shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#03040a" stop-opacity="0"/><stop offset=".6" stop-color="#03040a" stop-opacity=".62"/><stop offset="1" stop-color="#03040a" stop-opacity=".88"/></linearGradient>
    <linearGradient id="ts-spill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffc46b" stop-opacity=".45"/><stop offset="1" stop-color="#ffc46b" stop-opacity="0"/></linearGradient>
    <filter id="ts-glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="ts-blur" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
    <filter id="ts-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="5"/></filter>
  </defs>

  <g class="ts-far">
    <circle cx="1370" cy="168" r="330" fill="url(#ts-halo)"/>
    <circle cx="1370" cy="168" r="60" fill="url(#ts-moonface)"/>
    <g fill="#b9b8ac" opacity=".35"><circle cx="1349" cy="151" r="10"/><circle cx="1386" cy="191" r="14"/><circle cx="1390" cy="146" r="6"/><circle cx="1356" cy="193" r="5"/></g>
    <g class="ts-clouds" fill="#252e48" filter="url(#ts-blur)" opacity=".85">
      <ellipse cx="1210" cy="190" rx="190" ry="20"/><ellipse cx="1430" cy="214" rx="150" ry="16"/><ellipse cx="400" cy="150" rx="220" ry="22"/>
    </g>
    <g class="ts-birds" fill="none" stroke="#0a0d16" stroke-width="3.2" stroke-linecap="round">
      <path d="M0 0 Q 11 -9 22 0 Q 33 -9 44 0"><animate attributeName="d" dur=".55s" repeatCount="indefinite" values="M0 0 Q 11 -9 22 0 Q 33 -9 44 0;M0 0 Q 11 7 22 0 Q 33 7 44 0;M0 0 Q 11 -9 22 0 Q 33 -9 44 0"/></path>
      <path transform="translate(-70 26) scale(.7)" d="M0 0 Q 11 -9 22 0 Q 33 -9 44 0"><animate attributeName="d" dur=".62s" repeatCount="indefinite" values="M0 0 Q 11 7 22 0 Q 33 7 44 0;M0 0 Q 11 -9 22 0 Q 33 -9 44 0;M0 0 Q 11 7 22 0 Q 33 7 44 0"/></path>
    </g>
    <path d="M0 640 C160 600 330 596 520 618 C700 640 820 604 1010 600 C1200 596 1380 622 1600 596 L1600 700 L0 700Z" fill="#141b2d"/>
    <path d="M0 662 C220 640 420 652 640 646 C900 640 1100 656 1340 644 C1450 640 1540 646 1600 642 L1600 720 L0 720Z" fill="#1b2338"/>
  </g>

  <g class="ts-house"><g transform="translate(800 668) scale(.86) translate(-800 -668)">
    <g class="ts-smoke" fill="#4a5470" filter="url(#ts-soft)"><circle cx="667" cy="452" r="9"/><circle cx="667" cy="452" r="9"/><circle cx="667" cy="452" r="9"/></g>
    <g fill="#06080e">
      <rect x="620" y="522" width="360" height="146"/>
      <path d="M604 526 L660 478 L940 478 L996 526Z"/>
      <rect x="660" y="458" width="14" height="40"/><rect x="926" y="462" width="14" height="36"/>
      <rect x="480" y="566" width="146" height="102"/><path d="M468 570 L553 504 L638 570Z"/><rect x="514" y="510" width="12" height="40"/>
      <rect x="974" y="566" width="146" height="102"/><path d="M962 570 L1047 504 L1132 570Z"/><rect x="1074" y="512" width="12" height="38"/>
      <rect x="604" y="500" width="34" height="168"/><path d="M598 504 L621 448 L644 504Z"/>
      <rect x="962" y="500" width="34" height="168"/><path d="M956 504 L979 448 L1002 504Z"/>
      <rect x="762" y="382" width="76" height="286"/><path d="M754 386 L800 286 L846 386Z"/>
      <path d="M800 286 V256" stroke="#06080e" stroke-width="3"/>
      <path d="M786 258 L814 258 M800 248 L800 268" stroke="#06080e" stroke-width="2"/>
      <path d="M770 668 V620 a30 30 0 0 1 60 0 V668Z"/>
    </g>
    <circle cx="800" cy="476" r="11" fill="#c99a52" opacity=".55" filter="url(#ts-glow)"/>
    ${windowsSvg()}
    <path d="M788 668 V630 a12 12 0 0 1 24 0 V668Z" fill="#ffbe5c" filter="url(#ts-glow)" class="ts-door"/>
  </g></g>

  <path d="M0 668 C260 656 520 674 800 664 C1080 654 1340 672 1600 660 L1600 900 L0 900Z" fill="url(#ts-snowfield)"/>
  <g class="ts-house"><g transform="translate(800 668) scale(.86) translate(-800 -668)" fill="url(#ts-spill)" filter="url(#ts-soft)">${spillSvg()}</g></g>
  <path d="M786 664 C780 730 720 810 610 900 L990 900 C880 810 820 730 814 664Z" fill="url(#ts-drive)" opacity=".7"/>
  <g fill="#2a3149" opacity=".75">${footprintsSvg()}</g>
  <g class="ts-fog" fill="#c8d2e8" filter="url(#ts-blur)"><ellipse cx="420" cy="690" rx="520" ry="26" opacity=".14"/><ellipse cx="1180" cy="700" rx="560" ry="22" opacity=".12"/></g>

  <rect x="0" y="690" width="1600" height="210" fill="url(#ts-shade)"/>
  <g class="ts-near">
    <g fill="#04060a" stroke="#04060a">${railingsSvg()}</g>
    <g fill="#04060a">${gatepost(520)}${gatepost(1028)}</g>
    <g fill="none" stroke="#04060a" stroke-linecap="round">
      <path d="M118 900 C138 800 150 720 190 640" stroke-width="36"/>
      <path d="M190 640 C206 590 240 548 300 516" stroke-width="18"/>
      <path d="M300 516 C330 502 372 500 420 492" stroke-width="9"/>
      <path d="M420 492 C446 488 470 478 492 462" stroke-width="4"/>
      <path d="M192 652 C160 604 112 578 50 566" stroke-width="14"/>
      <path d="M186 618 C192 560 182 500 206 430" stroke-width="12"/>
      <path d="M206 430 C218 392 246 368 276 350" stroke-width="6"/>
      <path d="M203 470 C182 440 156 424 124 418" stroke-width="5"/>
      <path d="M112 576 C88 548 76 522 66 490" stroke-width="5"/>
      <path d="M276 350 C290 338 300 320 302 300 M246 372 C256 352 254 334 246 316 M156 424 C140 404 134 386 136 368" stroke-width="3"/>
      <path d="M66 490 C58 470 58 452 64 434 M372 500 C384 482 404 470 426 466 M300 516 C306 494 320 480 340 470" stroke-width="2.5"/>
      <path d="M1520 900 C1500 790 1470 700 1440 640" stroke-width="30"/>
      <path d="M1440 640 C1420 590 1380 556 1330 536" stroke-width="13"/>
      <path d="M1450 662 C1490 616 1540 594 1600 588" stroke-width="12"/>
      <path d="M1442 622 C1446 560 1460 500 1446 440" stroke-width="9"/>
      <path d="M1446 440 C1440 404 1418 380 1392 366 M1330 536 C1300 524 1270 524 1240 530 M1449 500 C1470 474 1500 462 1530 460" stroke-width="4"/>
      <path d="M1392 366 C1380 350 1376 332 1380 316 M1240 530 C1222 520 1212 506 1208 490 M1530 460 C1548 446 1560 430 1566 412" stroke-width="2.5"/>
    </g>
    <g class="ts-raven" fill="#04060a" transform="translate(372 504)"><path d="${RAVEN}"/></g>
  </g>
</svg>`;

// The case's eight nights as moons in an arc, waxing to full.
const moonsHtml = () => `<div class="ts-moons" aria-hidden="true">${Array.from({ length: 8 }, (_, i) => {
  const arc = Math.round(18 * Math.pow((i - 3.5) / 3.5, 2));
  return `<span style="--i:${i};--arc:${arc}px">${moonSvg((i + 1) / 8)}</span>`;
}).join("")}</div>`;

// The page behind the opening screen: out of reach of the mouse, the keyboard and screen readers until you go in.
const behind = () => document.querySelectorAll("body > .casebar, body > .desk, body > #modal");

export function showTitle(close) {
  onClose = close;
  try {
    show();
  } catch (e) {  // the scene is decoration: without it the game goes on as before
    hide();
  }
}

function show() {
  el = $("title");
  el.hidden = false;
  behind().forEach((x) => (x.inert = true));
  el.removeAttribute("aria-hidden");
  el.setAttribute("role", "dialog");
  el.setAttribute("aria-modal", "true");
  el.setAttribute("aria-labelledby", "ts-name");
  el.innerHTML = `<div class="ts-stars"></div>${SCENE}<canvas class="ts-snow"></canvas>
    <div class="ts-text">
      <div class="ts-kicker">Scotland Yard · Case no. 1924/17</div>
      ${moonsHtml()}
      <h1 class="ts-name" id="ts-name"><span class="big eight">Eight Nights</span><span class="at">at</span><span class="big raven">Ravenhill</span></h1>
      <div class="ts-gap"></div>
      <button class="ts-enter" id="ts-enter">Enter Ravenhill</button>
      <div class="ts-status loading" id="ts-status" role="status">Unpacking the case files</div>
    </div>`;
  document.body.classList.add("title-open");
  $("ts-enter").onclick = closeTitle;
  $("ts-enter").focus({ preventScroll: true });
  if (!reduced()) {
    stopSnow = snow(el.querySelector(".ts-snow"));
    el.addEventListener("pointermove", parallax);
  }
}

export const titleOpen = () => !!el;

// The case could not be loaded: say why, and offer to try again.
let failed = false;
export function titleFailed(message) {
  if (!el || el.classList.contains("leaving")) return false;
  failed = true;
  const status = $("ts-status"), button = $("ts-enter");
  status.classList.remove("loading");
  status.textContent = message;
  button.textContent = "Try again";
  button.onclick = () => location.reload();
  return true;
}

// No case behind this link: say so, with no way in. False when the opening screen has gone already.
export function titleClosed(message) {
  if (!titleFailed(message)) return false;
  $("ts-enter").remove();
  return true;
}

// The case is loaded: say what is waiting behind the door.
export function titleReady(S) {
  if (!el || el.classList.contains("leaving")) return;
  const status = $("ts-status"), books = shelf(S).won.length;
  status.classList.remove("loading");
  $("ts-enter").onclick = closeTitle;  // after a failed try, the case came after all
  failed = false;
  if (!S.history.length) {
    $("ts-enter").textContent = "Open the case";
    status.textContent = "";  // a new case: the button says it all
  } else {
    $("ts-enter").textContent = "Return to Ravenhill";
    const reading = unread()[0];
    status.textContent = `${S.finished ? "The case is closed" : `Night ${ROMAN[S.round]} of ${ROMAN[S.rounds]}`} · ${reading
      ? `reading ${reading.book.title}` : `${books} ${books === 1 ? "book" : "books"} found`}`;
  }
}

export function closeTitle() {
  if (!el || el.classList.contains("leaving") || failed) return;  // without a case there is nothing behind the door
  el.classList.add("leaving");
  const done = () => {
    hide();
    onClose();
  };
  if (reduced()) done();
  else setTimeout(done, 1400);
}

// Put the screen away until the next new case, and give the page back.
function hide() {
  stopSnow();
  stopSnow = () => {};
  const t = $("title");
  t.hidden = true;
  t.innerHTML = "";
  t.className = "title-screen";
  t.setAttribute("aria-hidden", "true");
  el = null;
  behind().forEach((x) => (x.inert = false));
  document.body.classList.remove("title-open");
}

// The scene shifts a little with the pointer: the moon least, the trees and the gate most.
let frame = 0;
function parallax(e) {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    if (!el) return;
    el.style.setProperty("--mx", ((e.clientX / innerWidth) * 2 - 1).toFixed(3));
    el.style.setProperty("--my", ((e.clientY / innerHeight) * 2 - 1).toFixed(3));
  });
}

// Snow over the whole screen: near flakes larger and faster, all drifting on a light wind. Returns how to stop it.
function snow(canvas) {
  const ctx = canvas.getContext("2d");
  let w = 0, h = 0, flakes = [], raf = 0, last = performance.now();
  const flake = (top) => {
    const z = Math.random();
    return { x: Math.random() * (w + 200) - 200, y: top ? -10 : Math.random() * h, r: 0.6 + z * 2.4, v: 16 + z * 60, s: Math.random() * 6.3, a: 0.3 + z * 0.6 };
  };
  const resize = () => {
    w = canvas.clientWidth;  // one canvas pixel per CSS pixel: soft dots need no more, and the snow is most of the screen's cost
    h = canvas.clientHeight;
    canvas.width = w;
    canvas.height = h;
    flakes = Array.from({ length: Math.min(280, Math.round((w * h) / 6500)) }, () => flake(false));
  };
  const step = (t) => {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#fff";
    for (const f of flakes) {
      f.s += dt;
      f.y += f.v * dt;
      f.x += (Math.sin(f.s) * 12 + 14) * dt;
      if (f.y > h + 8 || f.x > w + 8) Object.assign(f, flake(true));
      ctx.globalAlpha = f.a;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, 6.2832);
      ctx.fill();
    }
    raf = requestAnimationFrame(step);
  };
  resize();
  addEventListener("resize", resize);
  raf = requestAnimationFrame(step);
  return () => {
    cancelAnimationFrame(raf);
    removeEventListener("resize", resize);
  };
}
