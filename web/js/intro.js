// The card that opens every round: the event's scene, a line of atmosphere, what it means, the traces of
// last night (night.js) and last round's recap.
import { morningClueHtml } from "./clues.js";
import { EVENTS, LAST_NIGHT, eventGroup, groupStepsHtml } from "./events.js";
import { ROMAN } from "./format.js";
import { tracesHtml } from "./night.js";
import { maybeShowPrologue } from "./prologue.js";
import { title } from "./roles.js";
import { closeModal } from "./reveal.js";
import { $, ui } from "./state.js";
import { load, store } from "./storage.js";

const seenKey = () => "intro-" + ui.S.id;

// Show the current round's card unless it has been shown already (or another card is open).
export function maybeShowIntro() {
  const S = ui.S;
  if (!S || S.finished || $("modal").classList.contains("open")) return;
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
  $("modal").innerHTML = `<div class="intro paper" role="dialog" aria-modal="true" aria-label="Round ${ROMAN[S.round]}: ${heading}">
    <div class="intro-art"><img src="art/events/${scene}.svg" alt=""><span class="intro-medal">${icon}</span></div>
    <div class="intro-body">
      <div class="kicker">Night ${ROMAN[S.round]} of ${ROMAN[S.rounds]}</div>
      <h2>${heading}</h2>
      <p class="flavor">${mood}</p>
      ${groupStepsHtml([[eventGroup(event), meaning]])}
      ${morningClueHtml(S, S.round)}
      ${tracesHtml(S.round, event === "Blackout", !!morningClueHtml(S, S.round))}
      ${recap()}
      <button class="btn primary" id="revealOk">${S.round === 1 ? "Begin the investigation" : `Begin night ${ROMAN[S.round]}`}</button>
    </div></div>`;
  $("modal").classList.add("open");
  $("revealOk").focus();
}

function recap() {
  const S = ui.S, last = S.history.filter((h) => h.round === S.round - 1);
  if (!last.length) return "";
  const who = (h) => (h.role ? title(h.role).toLowerCase() : `${S.chars[h.char].bad ? "a conspirator" : "an innocent guest"}`);
  const line = (h) => `${h.action === "save" ? "cleared" : "arrested"} <b>${S.chars[h.char].name}</b>, ${who(h)}
    <span class="${h.ok ? "ok" : "no"}">${h.ok ? "+1" : "0"}</span>`;
  return `<p class="recap">Last round you ${last.map(line).join(" and ")}.</p>`;
}
