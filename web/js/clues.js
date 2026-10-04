// The clues you get: the notebook the Notebook night opens and the Footprints' two names, both handed to you
// in the morning, and the Interview tool (kept for rule variants). The engine's side lives in
// ravenhill/notebook.py, ravenhill/events.py and ravenhill/game.py.
import { guestRef } from "./format.js";

// tool -> [icon, button label, what it does, the event that allows it]
export const TOOLS = {
  interview: ["🗣", "Interview", "Ask the selected guest for another clear and arrest tip.", "Interview"],
};

// How each kind of clue is labelled in the Case file: [icon, label]
export const CLUES = { notebook: ["📓", "Notebook"], footprints: ["👣", "Footprints"], interview: ["🗣", "Interview"] };

// The same clue in one line, for the note on the board ("" on other nights).
export function morningClueLine(S, round) {
  const nb = S.notebooks.find((x) => x.round === round), prints = S.footprints?.[round];
  if (nb) return `${S.chars[nb.char].name}'s notebook lies open: see the Case file.`;
  if (prints) return `The footprints: ${S.chars[prints[0]].name} or ${S.chars[prints[1]].name}. At least one of them is guilty.`;
  return "";
}

// The clue a Notebook or Footprints night hands you, as the round's opening card shows it ("" on other nights).
export function morningClueHtml(S, round) {
  const nb = S.notebooks.find((x) => x.round === round), prints = S.footprints?.[round];
  if (nb) {
    return `<div class="morning-clue"><span class="clue-mark">📓</span><div>The notebook belongs to <b>${guestRef(nb.char)}</b>.
      ${nb.older ? "Nothing new last night, but its earlier pages say:" : "Last night they learned:"}
      <ul class="facts">${nb.facts.map((f) => `<li>${factText(f)}</li>`).join("")}</ul></div></div>`;
  }
  if (prints) {
    return `<div class="morning-clue"><span class="clue-mark">👣</span><div>The prints match the boots of
      <b>${guestRef(prints[0])}</b> and <b>${guestRef(prints[1])}</b>. At least one of the two is guilty.</div></div>`;
  }
  return "";
}

// A notebook entry as a sentence; `ref` names a guest (the Case file makes them chips).
export function factText(f, ref = guestRef) {
  if (f.kind === "side") return `${ref(f.target)} looks <b class="${f.bad ? "no" : "ok"}">${f.bad ? "guilty" : "innocent"}</b>`;
  if (f.kind === "role") return `${ref(f.target)} is the <b>${f.role}</b>`;
  if (f.kind === "count") return `${f.k} of ${f.chars.map((c) => ref(c)).join(" and ")} ${f.k === 1 ? "is" : "are"} guilty`;
  return `${ref(f.a)} and ${ref(f.b)} are on ${f.same ? "the same side" : "different sides"}`;
}
