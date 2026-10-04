// The card that opens every round: the event's scene, a line of atmosphere, what it means, the traces of
// last night (night.js) and last round's recap.
import { morningClueHtml } from "./clues.js";
import { EVENTS, LAST_NIGHT, nightKindHtml } from "./events.js";
import { ROMAN, moonSvg } from "./format.js";
import { tracesHtml } from "./night.js";
import { maybeShowPrologue } from "./prologue.js";
import { title } from "./roles.js";
import { closeModal } from "./reveal.js";
import { $, ui } from "./state.js";
import { titleOpen } from "./title.js";
import { readingOpen, showReading, unread } from "./reading.js";
import { showFinale } from "./finale.js";
import { load, store } from "./storage.js";

const seenKey = () => "intro-" + ui.S.id;

// Show the current round's card unless it has been shown already (or another card is open). A book won and not yet
// read comes first: the reading screen, and the night's card once it is finished.
export function maybeShowIntro() {
  const S = ui.S;
  if (!S || titleOpen() || readingOpen() || $("modal").classList.contains("open")) return;
  if (unread().length) return showReading(S.finished ? showFinale : maybeShowIntro);  // a closed case: then the ending
  if (S.finished) return;
  if (maybeShowPrologue(openCase)) return;  // the briefing comes before the very first night
  if (Number(load(seenKey()) || 0) >= S.round) return;
  store(seenKey(), S.round);
  showIntro();
}

// after the prologue: the first night's card
function openCase() {
  closeModal();
  maybeShowIntro();
}

export function showIntro() {
  const S = ui.S, event = S.events[S.round];
  const [icon, scene, mood, meaning] = event ? EVENTS[event] : LAST_NIGHT;
  const heading = event || "The drawing room";
  const dawn = STRIKE + numeral(S.round).length * STRIKE_GAP + HOLD;  // the night lifts, and the card comes, once the night is struck
  $("modal").innerHTML = `<div class="intro-backdrop" aria-hidden="true" style="--dawn:${dawn}ms;background-image:url('art/events/${scene}.svg')"></div>
    <div class="intro paper" role="dialog" aria-modal="true" aria-label="Round ${ROMAN[S.round]}: ${heading}" style="--dawn:${dawn}ms">
    <div class="intro-art"><div class="intro-scene">${svgs[scene] || `<img src="art/events/${scene}.svg" alt="">`}</div>
      <span class="intro-medal">${icon}</span></div>
    <div class="intro-body">
      <div class="kicker">${moonSvg(S.round / S.rounds, "intro-moon")}Night ${ROMAN[S.round]} of ${ROMAN[S.rounds]}</div>
      <h2><span class="intro-said">${heading}</span><span aria-hidden="true">${typedHtml(heading)}</span></h2>
      <p class="flavor">${mood}</p>
      ${nightKindHtml(event, meaning)}
      ${morningClueHtml(S, S.round)}
      ${tracesHtml(S.round, event === "Blackout", !!morningClueHtml(S, S.round))}
      ${recap()}
      <button class="btn primary" id="revealOk">${S.round === 1 ? "Begin the investigation" : `Begin night ${ROMAN[S.round]}`}</button>
    </div></div>
    ${nightfallHtml(S.round, S.rounds, dawn)}`;
  $("modal").classList.add("open");
  $("revealOk").focus({ preventScroll: true });
  const card = $("modal").querySelector(".intro");
  choreograph(card, dawn - 100);
  if (!svgs[scene]) fetchScene(scene).then(() => {  // not loaded yet: the plain picture, until it is
    const img = card.querySelector(".intro-scene img");
    if (img?.isConnected && svgs[scene]) img.parentElement.innerHTML = svgs[scene];
  });
}

// The card's arrival, in ms from its opening (reveal.css, "the round's opening card"): over the whole screen the night
// falls and its numeral is struck a stroke at a time, it holds a moment, then the night lifts off the card, the event's
// name is typed a letter at a time and the rest is laid down part by part.
const STRIKE = 250, STRIKE_GAP = 100, HOLD = 520, LETTER = 24, PART = 90, WAX = 550;

const numeral = (round) => ROMAN[round] || String(round);

// The night arriving over the whole screen: its moon waxing to its phase (the shadow drawing back off the lit half,
// then the light spreading over the other), and its numeral struck like a clock; at `dawn` it lifts.
function nightfallHtml(round, rounds, dawn) {
  const f = round / rounds, waning = Math.round(WAX * Math.min(f, 0.5) / f);
  return `<div class="nightfall" aria-hidden="true" style="--dawn:${dawn}ms;--strike:${STRIKE}ms;--gap:${STRIKE_GAP}ms;--shade:${Math.max(0, 1 - 2 * f)};--glow:${Math.max(0, 2 * f - 1)};--t-shade:${waning}ms;--t-glow:${WAX - waning}ms">
    <svg class="nf-moon" viewBox="0 0 16 16"><circle class="disc" cx="8" cy="8" r="6"/><path class="half" d="M8 2A6 6 0 0 1 8 14Z"/>
      <ellipse class="shade" cx="8" cy="8" rx="6.2" ry="6.2"/><ellipse class="glow" cx="8" cy="8" rx="6" ry="6"/><circle class="rim" cx="8" cy="8" r="6"/></svg>
    <div class="nf-numeral">${[...numeral(round)].map((g, i) => `<span style="--i:${i}">${g}</span>`).join("")}</div></div>`;
}

// The event's name as typed letters, each with its turn (--k); words stay whole when the line wraps.
function typedHtml(text) {
  let k = 0;
  return text.split(" ").map((w) => `<span class="tw">${[...w].map((ch) => `<span class="tl" style="--k:${k++}">${ch}</span>`).join("")}</span>`).join(" ");
}

// When each part of the card arrives (--at): the kicker with the first stroke, the name once the numeral is struck,
// then the mood, the event, the clue, the traces, the recap and the button one after another; each trace is told
// after its slip has landed (--i).
function choreograph(card, typeAt) {
  const body = card.querySelector(".intro-body");
  body.style.setProperty("--type", `${typeAt}ms`);
  body.style.setProperty("--letter", `${LETTER}ms`);
  let at = typeAt + body.querySelectorAll("h2 .tl").length * LETTER - 80;
  for (const el of body.children) {
    if (el.classList.contains("kicker")) el.style.setProperty("--at", `${STRIKE - 50}ms`);
    else if (el.tagName !== "H2") {
      el.style.setProperty("--at", `${at}ms`);
      at += PART;
    }
  }
  body.querySelectorAll(".traces li").forEach((el, i) => el.style.setProperty("--i", i));
}

// The arrival still playing: every animation on the card but the scene's own life, which goes on.
function arriving() {
  const modal = $("modal");
  if (!modal.querySelector(":scope > .intro")) return [];
  return modal.getAnimations({ subtree: true }).filter((a) => a.playState === "running" && !a.effect?.target?.closest(".intro-scene")
    && a.effect.getComputedTiming().iterations !== Infinity);
}

// A click on the card or Enter while it arrives completes the arrival at once, rather than going on; the next one
// goes on as usual (main.js).
function hurry(e) {
  if (e.type === "keydown" ? e.key !== "Enter" : !$("modal").contains(e.target)) return;
  const playing = arriving();
  if (!playing.length) return;
  playing.forEach((a) => a.finish());
  e.preventDefault();
  e.stopPropagation();
}
document.addEventListener("keydown", hurry, true);
document.addEventListener("click", hurry, true);

// The scenes, inlined so that they can come alive: each file styles its own life under .ev-live, which an <img> never
// matches. Its ids are kept apart from the page's, its tooltip dropped, and it is cropped to its frame like a picture.
const svgs = {}, fetching = {};
function fetchScene(scene) {
  return (fetching[scene] ||= fetch(`art/events/${scene}.svg`).then((r) => (r.ok ? r.text() : "")).catch(() => "").then((text) => {
    if (!text.includes("<svg")) return;
    svgs[scene] = text.replace(/<\?xml[^>]*>/, "").replace(/<title>[^<]*<\/title>/, "")
      .replace(/\bid="/g, 'id="ev-').replace(/url\(#/g, "url(#ev-").replace(/href="#/g, 'href="#ev-')
      .replace("<svg", `<svg class="ev-live" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid slice"`);
  }));
}
[...Object.values(EVENTS).map((e) => e[1]), LAST_NIGHT[1]].forEach(fetchScene);

function recap() {
  const S = ui.S, last = S.history.filter((h) => h.round === S.round - 1);
  if (!last.length) return "";
  const who = (h) => (h.role ? title(h.role).toLowerCase() : `${S.chars[h.char].bad ? "a guilty guest" : "an innocent guest"}`);
  const line = (h) => `${h.action === "save" ? "cleared" : "arrested"} <b>${S.chars[h.char].name}</b>, ${who(h)}
    <span class="${h.ok ? "ok" : "no"}">${h.ok ? "+1" : "0"}</span>`;
  return `<p class="recap">Last round you ${last.map(line).join(" and ")}.</p>`;
}
