// The Testimony tab: every guest's advice, one column per round, coloured once targets are revealed;
// the guests still in the house first, then those cleared or arrested.
import { EVENTS } from "./events.js";
import { ROMAN } from "./format.js";
import { portrait } from "./portrait.js";
import { $, showInFolder, ui, verdict } from "./state.js";

// A key made of real chips (the Interview's only in rule variants that have it), then one line of help.
const key = (interviews) => `<div class="key">
  <span><span class="chip s">3</span> clear #3</span><span><span class="chip e">5</span> arrest #5</span>
  <span><span class="chip s right">4</span><span class="chip e wrong">6</span> proved right / wrong</span>
  ${interviews ? `<span><span class="chip s interview">7</span> from an Interview</span>` : ""}</div>
  <p class="key-help">The numbers under a name count how many of their tips proved right and wrong. Point at a row to see its
  strings on the board; click a name or a chip to select that guest.</p>`;

const NOTES = ["", `<span class="mynote n1" title="Your note: guilty">✕</span>`, `<span class="mynote n2" title="Your note: innocent">✓</span>`];

export function testimonyHtml() {
  const S = ui.S;
  const rounds = [...new Set(S.advice.map((a) => a.round))].sort((a, b) => a - b);
  const bySpeaker = {}, interviews = {};
  S.advice.forEach((a) => ((bySpeaker[a.speaker] = bySpeaker[a.speaker] || {})[a.round] = a));
  S.interviews.forEach((a) => ((interviews[a.speaker] = interviews[a.speaker] || {})[a.round] = a));
  const cur = (r) => (r === S.round && !S.finished ? "cur" : "");
  const head = (r) => {
    const e = S.events[r];
    return `<th class="${cur(r)}" title="Round ${r}${e ? " · " + e : ""}${cur(r) ? " · today" : ""}">${ROMAN[r]}${e ? ` <span class="ev">${EVENTS[e][0]}</span>` : ""}</th>`;
  };
  const row = (c) => {
    let right = 0, wrong = 0;
    const chip = (target, kind, extra, action) => {
      if (target === null) return "";
      const v = verdict(target, kind === "e");
      if (v === "right") right++;
      if (v === "wrong") wrong++;
      const says = `${action} ${S.chars[target].name} (#${target})${v ? `, proved ${v}` : ""}${extra ? ", at an Interview" : ""}`;
      return `<span class="chip ${kind} ${v}${extra}" data-c="${target}" title="${says}">${target}</span>`;
    };
    const chips = (a, extra) => chip(a.save, "s", extra, "Clear") + chip(a.eliminate, "e", extra, "Arrest");
    const cells = rounds.map((r) => {
      const a = (bySpeaker[c.id] || {})[r], b = (interviews[c.id] || {})[r];
      if (!a && !b) return S.silenced[r] === c.id ? `<td class="sil">silenced</td>` : `<td></td>`;
      return `<td class="adv ${cur(r)}">${a ? chips(a, "") : ""}${b ? chips(b, " interview") : ""}</td>`;
    }).join("");
    return `<tr class="${c.alive ? "" : "gone"}${ui.selected === c.id ? " picked" : ""}" data-row="${c.id}"><td class="wit">${advisorCell(c, right, wrong)}</td>${cells}</tr>`;
  };
  const inHouse = S.chars.filter((c) => c.alive), gone = S.chars.filter((c) => !c.alive);
  const group = (label, list) => (list.length ? `<tr class="group"><th colspan="${rounds.length + 1}"><span>${label} · ${list.length}</span></th></tr>${list.map(row).join("")}` : "");
  return key(S.interviews.length) + `<table class="grid"><thead><tr><th class="wit">Witness</th>${rounds.map(head).join("")}</tr></thead>
    <tbody>${group("In the house", inHouse)}${group("Cleared or arrested", gone)}</tbody></table>`;
}

// Light up the row (or the Theory tab's slip) of the guest under the mouse on the board, scrolled into
// sight, and outline the chips that name them. Toggling classes is much cheaper than rebuilding the table and its sixteen portraits.
export function markChips() {
  const body = $("tabbody");
  body.querySelectorAll(".chip.hl, [data-row].hl").forEach((el) => el.classList.remove("hl"));
  if (ui.hoverChar === null) return;
  body.querySelectorAll(`.chip[data-c="${ui.hoverChar}"]`).forEach((el) => el.classList.add("hl"));
  const row = body.querySelector(`.cf-report[data-row="${ui.hoverChar}"]`) || body.querySelector(`[data-row="${ui.hoverChar}"]`);  // a Case file report before a clue naming them
  if (!row) return;
  row.classList.add("hl");
  if (ui.folderOpen) showInFolder(body, row, body.querySelector(".grid thead, .cf-date")?.offsetHeight);  // clear of a sticky header
}

function advisorCell(c, right, wrong) {
  const known = c.role !== undefined;
  const tag = known ? `<span class="tag ${c.bad ? "bad" : "good"}">${c.role}</span>`
    : c.bad !== undefined ? `<span class="tag ${c.bad ? "bad" : "good"}" title="A mistake: the role stays sealed until the case is closed">${c.bad ? "guilty" : "innocent"}</span>`
    : `<span class="job">${c.profession}</span>`;
  const rec = right + wrong ? `<span class="rec" title="${right} of their tips proved right, ${wrong} wrong"><span class="right">${right}</span><span class="wrong">${wrong}</span></span>` : "";
  const note = c.alive && !ui.S.finished ? NOTES[ui.marks[c.id] || 0] : "";
  return `<div class="who">${portrait(known ? c.role : c.name, "thumb", c.art)}<span class="nm"><small>${c.id}</small> ${c.name}${note}<span class="sub">${tag}${rec}</span></span></div>`;
}
