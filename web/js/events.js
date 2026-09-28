// Round events: the card that opens each round, and what an event leaves of the day's advice.
// The engine's side lives in ravenhill/events.py.
import { ui } from "./state.js";

// name -> [icon, scene in art/events/, line of atmosphere, what it means for you, one-line reminder]
export const EVENTS = {
  "First Impressions": ["🤝", "first-impressions", "The guests arrive at Ravenhill and are shown to their seats at the long table.",
    "Everyone has sized up the guest in the previous seat and knows whether they look innocent or guilty (#5 knows about #4, #0 about #15). Tonight's advice already carries that knowledge.", "Everyone knows whether the previous seat looks innocent or guilty."],
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

// The events fall into groups by what they change. Each group is shown like a step on a role card (roles.js
// stepsHtml): its icon and name as the label, and under it what the group means, or what one event does.
export const GROUPS = [
  { icon: "🌙", name: "The guests learn something", what: "At nightfall every guest learns something, so the next testimony is sharper.", events: ["First Impressions", "Séance"] },
  { icon: "🔎", name: "You learn something", what: "You get a clue of your own in the morning: a notebook left open, or prints in the snow.", events: ["Notebook", "Footprints"] },
  { icon: "💬", name: "The testimony changes", what: "The day's advice names only one side: only whom to clear, or only whom to arrest.", events: ["Dinner Party", "Inquest"] },
  { icon: "🌑", name: "The house goes quiet", what: "In a Blackout nobody investigates, so the day's advice rests on what the guests already knew. On the last night nobody advises at all, and you decide alone.",
    events: ["Blackout"], lastNight: true },  // the last night has no event, but belongs here
];
const OTHER = { icon: "✦", name: "Other events", what: "", events: [] };
// An event's group; no event (the last night) is in the group marked lastNight, and an event missing from
// GROUPS falls into "Other events".
export const eventGroup = (e) => (e ? GROUPS.find((g) => g.events.includes(e)) || OTHER : GROUPS.find((g) => g.lastNight));

// The kind of night each night is: the groups come round in cycles, in their order (ravenhill/events.py schedule()).
export const nightGroup = (round) => GROUPS[(round - 1) % GROUPS.length];

// A night's event as far as it can be known: the event itself once it has come, or else the only one of its
// group's events still to come when that group has only one night left; null while it could be either.
export function nightEvent(S, round) {
  if (S.events[round]) return S.events[round];
  const g = nightGroup(round), used = new Set(Object.values(S.events));
  const eventNight = (n) => !(n === S.rounds && g.lastNight);  // the last group's last night is the drawing room
  if (!eventNight(round)) return null;
  const left = g.events.filter((e) => EVENTS[e] && !used.has(e));
  const nightsLeft = Array.from({ length: S.rounds }, (_, i) => i + 1)
    .filter((n) => n > S.round && nightGroup(n) === g && !S.events[n] && eventNight(n));
  return left.length === 1 && nightsLeft.length === 1 ? left[0] : null;
}

// Rows in the role-step style: [group, text] -> the group's icon and name, then the text.
export const groupStepsHtml = (rows) => `<dl class="role-steps ev-steps">${rows.map(([g, text]) =>
  `<div class="step"><span class="step-icon">${g.icon}</span><dt>${g.name}</dt><dd>${text}</dd></div>`).join("")}</dl>`;

// Events marked for a planned change (see PLANNED_CHANGES in ravenhill/events.py), stamped on their cards in the Events tab.
export const PLANNED = {};
export const plannedEventHtml = (e) => (PLANNED[e] ? `<span class="planned">${PLANNED[e]}</span>` : "");

// What the round's event leaves of the day's advice.
export const namesClear = (event) => event !== "Inquest";
export const namesArrest = (event) => event !== "Dinner Party";
