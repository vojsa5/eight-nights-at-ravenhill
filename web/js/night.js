// What happened last night: the traces the night work of the guilty left in the house, shown on each
// night's opening card. The server says which roles worked that night (ravenhill/server/state.py
// night_traces), never who holds them; once a culprit is out of the house, their trace stops.
import { ROLES, title } from "./roles.js";
import { ui } from "./state.js";

// role -> [icon, the traces, one of which is told each night, the trace in a word or two]
export const TRACES = {
  Forger: ["🖋", [
    "A bottle of ink stood uncorked on the library desk, and the blotter was still damp.",
    "The wastepaper basket in the study was full of torn drafts, all in the same careful hand.",
    "The candle in the writing room had burnt down to nothing. Someone had sat at the desk half the night.",
  ], "ink"],
  Eavesdropper: ["🥛", [
    "A drinking glass was missing from the pantry, and there was a damp ring on the wallpaper of the east corridor.",
    "The maid found a chair drawn up to the library door, facing the keyhole.",
    "Someone was heard on the back stairs, stopping outside every door in turn.",
  ], "a glass at the wall"],
  Hypnotist: ["🕰", [
    "Someone was seen walking the east corridor at three in the morning, eyes wide open and seeing nothing.",
    "A silver pocket watch on a long chain was found hanging from the newel post at the foot of the stairs.",
    "One of the guests came down to breakfast unable to remember a single thing about the night.",
  ], "a sleepwalker"],
  Mole: ["✉", [
    "Two letters in the morning post had been steamed open and sealed again.",
    "A thin knife lay on the hall table beside a stick of sealing wax, still warm.",
    "Someone had been through the letters in the study drawer and put them back in the wrong order.",
  ], "steamed-open letters"],
  Paymaster: ["💷", [
    "A folded banknote was found under a door on the east corridor.",
    "The butler found a five-pound note in the umbrella stand, and nobody would claim it.",
    "The paper band from a bundle of banknotes lay on the billiard-room floor.",
  ], "banknotes"],
  Lover: ["🌹", [
    "Two voices were heard whispering on the back stairs at three in the morning, and then a laugh cut short.",
    "Low voices were heard in the conservatory long after midnight, and then a door closing softly.",
    "A single red rose was found on the stairs, though there are no roses in the house in December.",
  ], "whispers in the night"],
};

const QUIET = "The house was quiet last night. No ink, no banknotes, no whispers in the night.";
const DARK = "In the dark, nothing stirred that anyone could see.";

// the same trace every time a night's card is shown, but a different one from night to night and case to case
function pick(list, round, role) {
  const key = `${ui.S.id}|${round}|${role}`;
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

// A trace as an evidence tag: its icon and its name, and the night's trace in full on hover. Every trace is a button
// that tells what its culprit does at night, under the traces (WHAT).
const tagHtml = (r, told = "") => `<li class="trace-tag" data-trace="${r}"><button type="button" class="trace-btn" aria-expanded="false"${told
  && ` title="${told}"`}><span class="trace-icon">${TRACES[r][0]}</span>${TRACES[r][2]}</button></li>`;
const WHAT = '<p class="trace-what" hidden></p>';

// The traces of night `round`, for its opening card. On the first night everyone is still in the house, so
// the card only says what to look for, each kind of trace as a tag. Later nights lay down a slip per trace;
// `compact` (a card that also carries a clue): many traces as tags, each told in full on hover.
export function tracesHtml(round, blackout, compact = false) {
  const roles = (ui.S.traces || {})[round];
  if (!roles) return "";
  if (round === 1) {
    const kinds = Object.keys(TRACES).filter((r) => ui.S.roster.includes(r)).map((r) => tagHtml(r)).join("");
    return `<div class="traces first"><div class="traces-head">Traces of the night</div><p>Every night some of the guilty go about their
      business, and it leaves traces in the house. Click one to see what was done:</p><ul class="trace-tags">${kinds}</ul>${WHAT}
      <p class="traces-note">Watch for them each morning. When one stops, that culprit is out of the house.</p></div>`;
  }
  if (compact && roles.length >= 4) {
    const tags = roles.map((r) => tagHtml(r, pick(TRACES[r][1], round, r))).join("");
    return `<div class="traces compact"><div class="traces-head">Last night at Ravenhill</div><ul class="trace-tags">${tags}</ul>${WHAT}</div>`;
  }
  const lines = roles.length ? roles.map((r) => `<li class="trace-slip" data-trace="${r}"><button type="button" class="trace-btn" aria-expanded="false">
      <span class="trace-icon">${TRACES[r][0]}</span><span class="trace-told"><b class="trace-name">${TRACES[r][2]}</b> ${pick(TRACES[r][1], round, r)}</span>
      </button></li>`)
    : [`<li class="quiet">${blackout ? DARK : QUIET}</li>`];
  return `<div class="traces${lines.length >= 4 ? " many" : ""}"><div class="traces-head">Last night at Ravenhill</div>
    <ul class="trace-slips">${lines.join("")}</ul>${roles.length ? WHAT : ""}</div>`;
}

// What a trace's culprit does at night: the Roles tab's words; the Lovers' trace is the two of them meeting.
const LOVERS = "Together they check one guest a night, guilty or not, then tell each other everything they know and agree on what to say in the morning. A Lover left alone no longer investigates.";
const doneAtNight = (r) => `<b class="trace-name">${r === "Lover" ? "The Lovers" : title(r)}</b> ${r === "Lover" ? LOVERS : ROLES[r][1].night}`;

// A click on a trace tells what was done under the traces; a second click on it puts that away.
document.addEventListener("click", (e) => {
  const tag = e.target.closest?.(".traces [data-trace]");
  if (!tag) return;
  const box = tag.closest(".traces"), what = box.querySelector(".trace-what"), r = tag.dataset.trace;
  const open = what.hidden || what.dataset.role !== r;
  box.querySelectorAll("[data-trace]").forEach((t) => {
    t.classList.toggle("on", open && t === tag);
    t.querySelector(".trace-btn").setAttribute("aria-expanded", String(open && t === tag));
  });
  what.hidden = !open;
  what.dataset.role = r;
  what.innerHTML = doneAtNight(r);
});
