// The case board: guests pinned up as polaroids in their seating order, red string for the hovered
// guest's testimony, and the case note in the middle. The polaroids are built once and then patched:
// rebuilding them made the browser redraw all sixteen portraits on every mouse move.
import { TOOLS, morningClueLine } from "./clues.js";
import { EVENTS, eventOf, namesArrest, namesClear } from "./events.js";
import { ROMAN } from "./format.js";
import { artSrc, portrait } from "./portrait.js";
import { $, currentVotes, inDrawingRoom, patch, ui } from "./state.js";

const NOTE_ICONS = ["?", "✕", "✓"];
const SEATS = 16;
const CARD_H = 1.47;              // a polaroid's height in widths
const PIN_DY = -0.684;            // from a polaroid's centre up to its pin, in widths
const GAP_PX = 6, EDGE_PX = 8, MAX_CARD_PX = 130;

// Board units: the board is 100 wide and geo.h tall, whatever shape the CSS gives it. The polaroids sit
// along a rounded ring and are made as large as the board allows (geo.card, in % of its width).
let geo = { h: 114, card: 9.8, seats: [] };
const seat = (id) => geo.seats[id];
const tilt = (id) => ((id * 37) % 7) - 3;

// Your notes, scrawled over the polaroid in grease pencil, in a 128 × 173 box around its 100 × 147 frame:
// guilty is a red ring round the whole polaroid, innocent a big green tick, each with a wash over the photo.
const RING = "M12.9 52.5C14.0 49.0 16.2 37.5 19.4 31.5C22.6 25.5 27.4 21.0 31.8 16.8C36.3 12.6 41.1 8.9 46.2 6.3C51.2 3.7 56.8 0.9 62.1 1.2C67.3 1.4 72.8 4.8 77.6 7.8C82.4 10.8 86.5 15.2 90.9 19.0C95.2 22.8 99.9 25.8 103.6 30.6C107.3 35.5 110.6 41.6 113.0 48.0C115.5 54.3 116.8 61.5 118.4 68.6C119.9 75.8 122.0 83.3 122.2 90.8C122.4 98.2 121.5 106.7 119.5 113.5C117.4 120.3 113.1 126.1 109.7 131.7C106.2 137.2 102.8 142.4 98.8 146.9C94.9 151.3 90.7 155.9 86.2 158.4C81.6 161.0 76.5 161.3 71.6 162.2C66.7 163.0 61.9 163.8 56.9 163.8C51.9 163.8 46.2 164.5 41.4 162.1C36.7 159.8 32.1 154.8 28.4 149.8C24.7 144.8 21.9 138.3 19.2 132.1C16.5 126.0 13.5 119.7 12.2 112.9C10.8 106.1 10.7 98.3 11.1 91.3C11.4 84.3 13.3 77.7 14.3 71.0C15.4 64.2 15.8 57.2 17.5 50.7C19.2 44.1 21.5 37.1 24.7 31.8C27.9 26.6 32.5 22.8 36.8 19.2C41.0 15.5 48.0 11.4 50.2 9.9";
const TICK = "M58 96C64 104 71 113 77 126C89 99 103 78 125 54";  // over the photo, clear of the name
const WASH = `<rect class="wash" x="19" y="18.2" width="90" height="117.9"/>`;
const pencil = (d, dx, dy) => `<path class="ink" pathLength="1" d="${d}"/><path class="ink thin" pathLength="1" d="${d}" transform="translate(${dx} ${dy})"/>`;
const SCRAWLS = { 1: WASH + pencil(RING, 1.5, -1.2), 2: WASH + pencil(TICK, -1.2, 1.4) };

// 16 seats clockwise from the top along a rounded rectangle (a superellipse), spaced evenly in polaroid
// sizes: a step down counts CARD_H times less than a step across, as the polaroids are that much taller.
function ring(rx, ry, h) {
  const n = 720, pts = [], len = [0];
  for (let k = 0; k <= n; k++) {
    const a = -Math.PI / 2 + (k * 2 * Math.PI) / n, c = Math.cos(a), s = Math.sin(a);
    pts.push([50 + rx * Math.sign(c) * Math.sqrt(Math.abs(c)), h / 2 + ry * Math.sign(s) * Math.sqrt(Math.abs(s))]);
    if (k) len.push(len[k - 1] + Math.max(Math.abs(pts[k][0] - pts[k - 1][0]), Math.abs(pts[k][1] - pts[k - 1][1]) / CARD_H));
  }
  const seats = [];
  for (let i = 0, k = 0; i < SEATS; i++) {
    const at = (i * len[n]) / SEATS;
    while (len[k + 1] < at) k++;
    const t = (at - len[k]) / (len[k + 1] - len[k]);
    seats.push([pts[k][0] + t * (pts[k + 1][0] - pts[k][0]), pts[k][1] + t * (pts[k + 1][1] - pts[k][1])]);
  }
  return seats;
}

// note = [width, height] in px of the room the case note needs in the middle
function layout(width, height, note) {
  const h = (100 * height) / width, px = width / 100;
  const noteW = note[0] / px, noteH = note[1] / px, gap = GAP_PX / px, edge = EDGE_PX / px;
  const seatsFor = (w) => ring(50 - w / 2 - edge, h / 2 - (w * CARD_H) / 2 - edge, h);
  const fits = (seats, w) => seats.every(([x, y], i) =>
    (Math.abs(x - 50) >= (w + noteW) / 2 + gap || Math.abs(y - h / 2) >= (w * CARD_H + noteH) / 2 + gap)
    && seats.every(([x2, y2], j) => j <= i || Math.abs(x - x2) >= w + gap || Math.abs(y - y2) >= w * CARD_H + gap));
  let lo = 4, hi = Math.min(20, MAX_CARD_PX / px);
  for (let k = 0; k < 20; k++) {
    const w = (lo + hi) / 2;
    if (fits(seatsFor(w), w)) lo = w;
    else hi = w;
  }
  return { h, card: lo, seats: seatsFor(lo) };
}

let note = null, strings = null, cards = [];  // cards[id] = { el, img, over, cap }

function build() {
  const board = $("board");
  board.innerHTML = `<div class="note"></div><svg class="strings" preserveAspectRatio="none" aria-hidden="true"></svg>`
    + ui.S.chars.map((c) => `<div class="card" data-c="${c.id}" style="--tilt:${tilt(c.id)}deg">
        <div class="frame"><span class="pin"></span><div class="photo"><img class="art" alt=""><span class="over"></span></div>
        <div class="cap"></div><span class="scrawl"></span></div></div>`).join("");
  note = board.querySelector(".note");
  strings = board.querySelector(".strings");
  cards = [...board.querySelectorAll(".card")].map((el) => ({ el, img: el.querySelector("img"), over: el.querySelector(".over"),
    cap: el.querySelector(".cap"), scrawl: el.querySelector(".scrawl") }));
  place();
}

// Lays the seats out for the board's current size; the board only changes size with the window.
function place() {
  const board = $("board");
  const room = parseFloat(getComputedStyle(note).getPropertyValue("--note-room")) || 280;
  geo = layout(board.clientWidth || 500, board.clientHeight || 570, [note.offsetWidth, room]);
  board.style.setProperty("--card", `${geo.card}%`);
  strings.setAttribute("viewBox", `0 0 100 ${geo.h}`);
  cards.forEach(({ el }, id) => {
    el.style.left = `${geo.seats[id][0]}%`;
    el.style.top = `${(geo.seats[id][1] / geo.h) * 100}%`;
  });
}

new ResizeObserver(() => {
  if (!cards.length) return;
  place();
  renderFocus();
}).observe($("board"));

export function renderBoard() {
  const S = ui.S;
  if (cards.length !== S.chars.length) build();
  patch(note, noteHtml());
  const votes = S.finished ? {} : currentVotes();
  S.chars.forEach((c) => {
    const card = cards[c.id], known = c.role !== undefined;
    const src = artSrc(known ? c.role : c.name, c.art), alt = known ? c.role : c.name;
    if (card.img.getAttribute("src") !== src) card.img.src = src;
    if (card.img.alt !== alt) card.img.alt = alt;
    patch(card.over, overlayHtml(c, votes));
    patch(card.cap, `<span class="nm" title="${c.name}, ${c.profession}"><small>${c.id}</small>${c.short}</span>`);
    patch(card.scrawl, scrawlHtml(c));  // its own element, so the drawing plays only when the note changes
  });
  renderFocus();
}

// Only what follows the mouse: the focused guest's strings and the polaroids they name.
export function renderFocus() {
  const S = ui.S;
  if (!S || !cards.length) return;
  const focus = ui.hoverRow ?? ui.hoverChar ?? ui.selected;
  const focusAdvice = focus !== null && !S.finished ? S.advice.find((a) => a.round === S.round && a.speaker === focus) : null;
  patch(strings, stringsSvg(focus));
  S.chars.forEach((c) => {
    const cls = cardClasses(c, focusAdvice);
    if (cards[c.id].el.className !== cls) cards[c.id].el.className = cls;
  });
}

// The focused guest's advice this round (solid) and advice about them (dashed): red to arrest, green to clear.
// Each string gets a darker copy underneath as its shadow (much cheaper to draw than a CSS drop-shadow).
function stringsSvg(focus) {
  const S = ui.S;
  if (focus === null || S.finished) return "";
  const today = [...S.advice, ...S.interviews].filter((a) => a.round === S.round);
  const lines = [];
  today.forEach((a) => {
    for (const [target, kind] of [[a.save, "s"], [a.eliminate, "e"]]) {
      if (target === null) continue;
      if (a.speaker === focus) lines.push([focus, target, `out ${kind}`]);
      else if (target === focus) lines.push([a.speaker, focus, `in ${kind}`]);
    }
  });
  const paths = lines.map(([from, to, cls]) => {
    const [x1, y1] = seat(from), [x2, y2] = seat(to);
    const dy = PIN_DY * geo.card, p1 = [x1, y1 + dy], p2 = [x2, y2 + dy];
    const sag = 3 + Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) * 0.08;
    const mx = (p1[0] + p2[0]) / 2, my = (p1[1] + p2[1]) / 2 + sag;
    return `<path class="${cls}" d="M${p1[0]} ${p1[1]} Q${mx} ${my} ${p2[0]} ${p2[1]}"/>`;
  }).join("");
  return paths && `<g class="shade" transform="translate(0 .45)">${paths}</g>${paths}`;
}

function cardClasses(c, focusAdvice) {
  const S = ui.S;
  const known = c.role !== undefined, live = c.alive && !S.finished;
  return ["card", live ? "alive" : "gone", c.alive || S.finished ? "" : "out", known || c.bad !== undefined ? (c.bad ? "bad" : "good") : "",  // a sealed guest's side is known
    live && S.silenced[S.round] === c.id ? "silenced" : "",
    ui.selected === c.id ? "selected" : "", ui.hoverRow === c.id ? "hl" : "",
    focusAdvice && focusAdvice.save === c.id ? "hl-save" : "",
    focusAdvice && focusAdvice.eliminate === c.id ? "hl-elim" : ""].join(" ");
}

// Everything drawn over the photo: advice counts, your note, the ink stamp and the role label.
function overlayHtml(c, votes) {
  const S = ui.S;
  const known = c.role !== undefined, live = c.alive && !S.finished;
  let photo = "";
  if (live) {
    const event = eventOf(S.round);
    if (S.silenced[S.round] === c.id) {
      photo += `<span class="badge silenced" title="Silenced tonight: gives no advice this round">SILENCED</span>`;
    } else {
      const v = votes[c.id] || { s: 0, e: 0 };
      const s = namesClear(event) ? `<span class="s"><i>✓</i>${v.s}</span>` : "";
      const e = namesArrest(event) ? `<span class="e"><i>✕</i>${v.e}</span>` : "";
      photo += `<span class="badge" title="This round: ${v.s} advise clearing, ${v.e} advise arresting">${s}${e}</span>`;
    }
    const m = ui.marks[c.id] || 0;
    photo += `<button class="mark m${m}" data-mark="${c.id}" title="Your note: click to cycle ? / guilty / innocent">${NOTE_ICONS[m]}</button>`;
  } else if (c.how) {
    const how = c.how === "save" ? "CLEARED" : "ARRESTED";
    photo += `<span class="stamp ${c.how === "save" ? "cleared" : "arrested"}" title="${how.toLowerCase()} in round ${ROMAN[c.removedRound]}">${how}</span>`;
  }
  if (known) photo += `<span class="rl">${c.role}</span>`;
  else if (c.bad !== undefined) photo += `<span class="rl sealed" title="A mistake: the role stays sealed until the case is closed">sealed</span>`;
  else if (live && ui.guesses[c.id]) photo += `<span class="rl guess" title="Your guess (the Theory tab)">${ui.guesses[c.id]}?</span>`;
  return photo;
}

// A note's drawing (1 guilty, 2 innocent) for a .scrawl box; the Rules tab shows them too.
export const noteSvg = (m) => `<svg class="m${m}" viewBox="0 0 128 173" preserveAspectRatio="none" aria-hidden="true">${SCRAWLS[m]}</svg>`;

function scrawlHtml(c) {
  const m = c.alive && !ui.S.finished ? ui.marks[c.id] || 0 : 0;
  return m ? noteSvg(m) : "";
}

// How a closed case is judged: [the share of decisions you must get right, the verdict]. The Rules tab shows them too.
export const RANKS = [[1, "Flawless. Scotland Yard would like a word about a job."], [0.8, "A keen judge of character."],
  [0.6, "Not bad, but some conspirators are still smiling."], [0, "The conspirators raise a glass to you."]];

function noteHtml() {
  const S = ui.S;
  if (S.finished) {
    const n = S.history.length, s = S.score;
    const line = RANKS.find(([share]) => s >= share * n)[1];
    return `<div class="closed">Case closed</div><div class="final">${s}<span>/ ${n}</span></div>
      <div class="prompt">${line}</div><button class="btn primary" data-action="new-game">Take another case</button>
      <button class="btn" data-action="finale">Watch the ending</button>`;
  }
  const a = S.phase, event = eventOf(S.round), accuse = inDrawingRoom();
  let h = `<div class="kicker">Night ${ROMAN[S.round]} of ${ROMAN[S.rounds]}</div>`;
  if (event) h += `<button class="event" data-action="intro" title="${EVENTS[event][3]}"><span>${EVENTS[event][0]}</span> ${event}</button>`;
  if (accuse) h += `<button class="event" data-action="intro" title="Name the guilty one; the other goes free."><span>🌕</span> The drawing room</button>`;
  h += `<div class="phase ${accuse ? "eliminate" : a}">${accuse ? "Accuse" : a === "save" ? "Clear" : "Arrest"}</div>`;
  if (accuse && ui.selected === null) {
    h += `<div class="prompt">Two remain, and nobody advises any more.<br>Name the one you believe is guilty; the other goes free.
      +1 for each you judge right.<br><small>Point at a photograph to choose.</small></div>`;
  } else if (accuse) {
    const c = S.chars[ui.selected];
    h += `<div class="pick">${portrait(c.name, "mini", c.portrait)}<div><div class="pick-name">${c.name}</div>
      <div class="pick-job">${c.profession}</div></div></div>
      <button class="btn eliminate" data-action="accuse">Accuse ${c.name}</button>`;
  } else if (ui.selected === null) {
    const quiet = !S.advice.some((x) => x.round === S.round);
    const alive = S.chars.filter((c) => c.alive).length;
    const hint = alive === 1 ? "Only one remains."
      : event ? morningClueLine(S, S.round) || EVENTS[event][4]
      : quiet ? "Only two remain, and no one can advise any more." : "";
    const goal = a === "save" ? "Clear one guest of suspicion. +1 if they are innocent." : "Make an arrest. +1 if they are guilty.";
    h += `<div class="prompt">${hint ? hint + "<br>" : ""}${goal}<br><small>Point at a photograph to see its string.</small></div>`;
  } else {
    const c = S.chars[ui.selected], v = currentVotes()[ui.selected] || { s: 0, e: 0 };
    h += `<div class="pick">${portrait(c.name, "mini", c.portrait)}<div><div class="pick-name">${c.name}</div>
      <div class="pick-job">${c.profession}</div>
      <div class="prompt">${v.s} advise clearing · ${v.e} advise arresting</div></div></div>
      <button class="btn ${a}" data-action="act">${a === "save" ? "Clear" : "Arrest"} ${c.name}</button>
      ${Object.keys(TOOLS).filter((t) => TOOLS[t][3] === event).map((t) => `<div class="tools">${toolButton(t)}</div>`).join("")}`;
  }
  return h;
}

function toolButton(tool) {
  const [icon, label, help] = TOOLS[tool], ok = ui.S.toolReady[tool];
  return `<button class="btn tool" data-action="${tool}" ${ok ? "" : "disabled"} title="${ok ? help : "Already used this round."}">${icon} ${label}</button>`;
}
