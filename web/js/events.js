// Round events: the card that opens each round, and what an event leaves of the day's advice.
// The engine's side lives in ravenhill/events.py.
import { ui } from "./state.js";

// name -> [icon, scene in art/events/, line of atmosphere, what it means for you, one-line reminder]
export const EVENTS = {
  "First Impressions": ["🤝", "first-impressions", "The guests arrive at Ravenhill and are shown to their seats at the long table.",
    "Everyone has sized up one other guest, picked at random, and knows whether they look innocent or guilty. Tonight's advice already carries that knowledge.", "Everyone knows whether one random guest looks innocent or guilty."],
  Blackout: ["🕯", "blackout", "A storm takes the lights. Somewhere in the dark, a candle gutters and dies.",
    "Nobody could investigate last night. Today's advice rests only on what the guests already knew, so anyone who suddenly changes their mind deserves a second look.", "Nobody could investigate last night."],
  "Dinner Party": ["🍷", "dinner-party", "Silver, candles and too much claret. Nobody wants to spoil the evening with an accusation.",
    "Everyone only says whom to clear. You still clear one guest and arrest one.", "Advice names only whom to clear."],
  Inquest: ["⚖", "inquest", "The coroner calls every guest to the stand. There is no time for pleasantries.",
    "Everyone only says whom to arrest. You still clear one guest and arrest one.", "Advice names only whom to arrest."],
  "Séance": ["🔮", "seance", "The lamps are dimmed and the guests join hands around the table. Something knocks three times.",
    "Everyone held the hands of the two guests seated beside them, and the spirits told them how many of those two look guilty: none, one or both. Tonight's advice already carries that knowledge, and a guest who knows one neighbour can work out the other.", "Everyone knows how many of their two neighbours look guilty."],
  Notebook: ["📓", "notebook", "A notebook lies open on the library desk. Its owner has stepped out.",
    "Someone has left their notebook open, at what they learned last night about a guest still in the house. Whose notebook it is can tell you as much as what is written in it.", "Read the open notebook: on tonight's card and in the Case file."],
  Footprints: ["👣", "footprints", "Fresh snow under the library window, and a line of footprints leading to the terrace door.",
    "The prints match the boots of two guests. At least one of the two is guilty, perhaps both.", "At least one of the two guests the footprints name is guilty."],
};

// the last round has no event
export const LAST_NIGHT = ["🌕", "last-night", "The last night at Ravenhill. You have asked the two guests who remain to join you in the drawing room.",
  "Name the one you believe is guilty; the other goes free. Both still count: +1 if the accused is guilty, +1 if the one you let go is innocent."];

export const eventOf = (round) => ui.S.events[round];

// The events fall into groups by what they change, each group's events in the order they come. Each group is shown
// like a step on a role card (roles.js stepsHtml): its icon and name as the label, and under it what the group means,
// or what one event does.
export const GROUPS = [
  { icon: "🌙", name: "The guests learn something", what: "At nightfall every guest learns something, so the next testimony is sharper.", events: ["First Impressions", "Séance"] },
  { icon: "🔎", name: "You learn something", what: "You get a clue of your own in the morning: first a notebook left open, then prints in the snow.", events: ["Notebook", "Footprints"] },
  { icon: "💬", name: "The testimony changes", what: "The day's advice names only one side: first only whom to clear, then only whom to arrest.", events: ["Dinner Party", "Inquest"] },
  { icon: "🌑", name: "The house goes quiet", what: "In a Blackout nobody investigates, so the day's advice rests on what the guests already knew. On the last night nobody advises at all, and you decide alone.",
    events: ["Blackout"], lastNight: true },  // the last night has no event, but belongs here
];
const OTHER = { icon: "✦", name: "Other events", what: "", events: [] };
// An event's group; no event (the last night) is in the group marked lastNight, and an event missing from
// GROUPS falls into "Other events".
export const eventGroup = (e) => (e ? GROUPS.find((g) => g.events.includes(e)) || OTHER : GROUPS.find((g) => g.lastNight));

// The kind of night each night is, an index into GROUPS (Rules.night_groups in ravenhill/rules.py): each half of
// the stay opens with the guests learning something and ends with the house going quiet; in between, the first half
// brings you the two clues and the second changes the testimony twice.
export const NIGHTS = [0, 1, 1, 3, 0, 2, 2, 3];
export const HALF = NIGHTS.length / 2;  // nights I–IV, then V–VIII
export const nightGroup = (round) => GROUPS[NIGHTS[(round - 1) % NIGHTS.length]];

// A night's event: the event itself once it has come, and before that the one the fixed schedule gives it (each
// group's nights take its events in order, as in ravenhill/events.py schedule()); null on the last night.
export function nightEvent(S, round) {
  if (S.events[round]) return S.events[round];
  if (round === S.rounds) return null;  // the drawing room
  const g = nightGroup(round);
  const before = Array.from({ length: round - 1 }, (_, i) => i + 1).filter((n) => nightGroup(n) === g).length;
  return g.events[before] || null;
}

// Rows in the role-step style: [group, text] -> the group's icon and name, then the text.
export const groupStepsHtml = (rows) => `<dl class="role-steps ev-steps">${rows.map(([g, text]) =>
  `<div class="step"><span class="step-icon">${g.icon}</span><dt>${g.name}</dt><dd>${text}</dd></div>`).join("")}</dl>`;

// The event on the round's opening card (intro.js; the folder's tabs keep groupStepsHtml): an index card with the
// kind of night as its label, the kind's icon in a medallion, then what the event means, its first sentence as the
// lead. The nights about seats add a small drawing of the table; a worked example in brackets becomes its caption.
export function nightKindHtml(event, meaning) {
  const g = eventGroup(event), fig = FIGURES[event];
  const example = fig && meaning.match(/\s*\(([^)]*)\)/), figure = fig ? fig(example?.[1]) : "";
  const text = example && figure.includes(example[1]) ? meaning.replace(example[0], "") : meaning;
  const [, lead, rest = ""] = text.match(/^(.*?[.!?])(\s.*)?$/s) || [null, text];
  return `<div class="ev-kind"><div class="ev-kind-label"><span class="ev-kind-medal" aria-hidden="true">${g.icon}</span>
    <span class="ev-kind-name">${g.name}</span></div><p class="ev-kind-text"><span class="ev-lead">${lead}</span>${rest}</p>${figure}</div>`;
}

// A place card at the table, and a look along it: a dotted line from one seat to another, an eye on top.
const seatHtml = (n, cls) => `<span class="ev-seat ${cls}">#${n}</span>`;
const GLANCE = `<svg class="ev-glance" viewBox="0 0 94 24" aria-hidden="true"><path class="ev-arc" d="M74 22C70 4 24 4 20 20"/>
  <path class="ev-head" d="M18.6 15.2 20 20 23.5 16.4"/><g class="ev-eye" transform="translate(47 8)"><path d="M-8 0Q0-6 8 0Q0 6-8 0Z"/><circle r="2.3"/></g></svg>`;
const HANDS = `<svg class="ev-hands" viewBox="0 0 150 24" aria-hidden="true"><path d="M72 22C68 6 23 6 19 22M78 22C82 6 127 6 131 22"/>
  <circle cx="45.5" cy="10" r="2.8"/><circle cx="104.5" cy="10" r="2.8"/></svg>`;
const FIGURES = {
  // each guest looks at one other guest, wherever they sit
  "First Impressions": () => `<figure class="ev-fig"><div class="ev-table" aria-hidden="true"><span class="ev-pair">${GLANCE}${seatHtml("?", "seen")}
    ${seatHtml(5, "who")}</span></div><figcaption>#5 knows about one guest, picked at random</figcaption></figure>`,
  // everyone holds the hands of the guests on either side
  "Séance": () => `<figure class="ev-fig" aria-hidden="true"><div class="ev-table"><span class="ev-trio">${HANDS}${seatHtml(4, "seen")}
    ${seatHtml(5, "who")}${seatHtml(6, "seen")}</span></div></figure>`,
};

// Events marked for a planned change (see PLANNED_CHANGES in ravenhill/events.py), stamped on their cards in the Events tab.
export const PLANNED = {};
export const plannedEventHtml = (e) => (PLANNED[e] ? `<span class="planned">${PLANNED[e]}</span>` : "");

// What the round's event leaves of the day's advice.
export const namesClear = (event) => event !== "Inquest";
export const namesArrest = (event) => event !== "Dinner Party";
