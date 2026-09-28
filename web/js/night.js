// What happened last night: the traces the conspirators' night work left in the house, shown on each
// night's opening card. The server says which roles worked that night (ravenhill/server/state.py
// night_traces), never who holds them; once a conspirator is out of the house, their trace stops.
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
  Grifter: ["🃏", [
    "A pack of cards was left on the billiard table, every ace on top.",
    "Someone had been through the coats in the cloakroom, and taken nothing at all.",
    "An unfinished letter on the writing desk offered someone in London shares in a gold mine.",
  ], "a stacked deck"],
  Lunatic: ["🌀", [
    "Someone was heard laughing quietly in the east wing long after midnight.",
    "The telephone in the hall had been taken apart again, and the pieces laid out in a neat row.",
    "Every clock on the first floor had been stopped at a quarter past eleven.",
  ], "odd goings-on"],
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

// The traces of night `round`, for its opening card. On the first night everyone is still in the house, so
// the card only says what to look for. `compact` (a card that also carries a clue): many traces in one line,
// each told in full on hover.
export function tracesHtml(round, blackout, compact = false) {
  const roles = (ui.S.traces || {})[round];
  if (!roles) return "";
  if (round === 1) {
    const kinds = Object.keys(TRACES).filter((r) => ui.S.roster.includes(r)).map((r) => `${TRACES[r][0]} ${TRACES[r][2]}`).join(", ");
    return `<div class="traces"><div class="traces-head">Traces of the night</div><p>Every night the conspirators' work leaves
      traces in the house: ${kinds}. Watch for them each morning. When one stops, that conspirator is out of the house.</p></div>`;
  }
  if (compact && roles.length >= 4) {
    const items = roles.map((r) => `<span title="${pick(TRACES[r][1], round, r)}">${TRACES[r][0]} ${TRACES[r][2]}</span>`).join(" · ");
    return `<div class="traces compact"><div class="traces-head">Last night at Ravenhill</div><p>${items}</p></div>`;
  }
  const lines = roles.length ? roles.map((r) => `<li><span class="trace-icon">${TRACES[r][0]}</span>${pick(TRACES[r][1], round, r)}</li>`)
    : [`<li class="quiet">${blackout ? DARK : QUIET}</li>`];
  return `<div class="traces${lines.length >= 4 ? " many" : ""}"><div class="traces-head">Last night at Ravenhill</div><ul>${lines.join("")}</ul></div>`;
}
