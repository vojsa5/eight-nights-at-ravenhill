// The Theory tab: the guests still in the house in three piles, guilty, unsure and innocent. These are
// your notes on the board (ui.marks), beside how many of each are left to find. A guest moves with the
// switch on their slip or by dragging it to another pile (main.js). You can also guess a guest's role
// (ui.guesses) from a sheet of this case's roles; a guess puts the guest in the matching pile.
import { portrait } from "./portrait.js";
import { ROLES, SIDE, isBadRole } from "./roles.js";
import { $, showInFolder, ui } from "./state.js";

const PILES = [[1, "guilty", "Guilty"], [0, "unsure", "Unsure"], [2, "innocent", "Innocent"]];
const SWITCH = [[1, "✕", "guilty"], [0, "?", "unsure"], [2, "✓", "innocent"]];
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

// The reset button asks once more before it wipes your notes: a first click arms it for a few seconds.
let armedUntil = 0;
export function armReset() {
  const armed = Date.now() < armedUntil;
  armedUntil = armed ? 0 : Date.now() + 4000;
  return armed;
}

// The role sheet at the foot of the folder, open for one guest at a time.
let pickerFor = null;
export const togglePicker = (c) => (pickerFor = pickerFor === c ? null : c);
export function closePicker() {
  const was = pickerFor !== null;
  pickerFor = null;
  return was;
}
// keeps the guest's slip in sight above the sheet
export function showPickedSlip() {
  const body = $("tabbody"), sheet = body.querySelector(".tpicker"), slip = body.querySelector(`.tslip[data-row="${pickerFor}"]`);
  if (sheet && slip) showInFolder(body, slip, 0, sheet.offsetHeight);
}

// This case's roles: how many guests hold each, how many of those are found, and whom you have guessed.
function roleBook() {
  const S = ui.S, book = {};
  S.roster.forEach((r) => ((book[r] = book[r] || { n: 0, found: 0, guessed: [] }).n++));
  S.chars.forEach((c) => book[c.role] && book[c.role].found++);
  S.chars.filter((c) => c.alive && ui.guesses[c.id]).forEach((c) => book[ui.guesses[c.id]]?.guessed.push(c));
  return book;
}
const overGuessed = (b) => b.guessed.length > b.n - b.found;

// What you know (a revealed side) or believe (your note) about a guest: true guilty, false innocent.
const belief = (t) => ui.S.chars[t].bad ?? { 1: true, 2: false }[ui.marks[t] || 0];

// How a guest's tips sit with your theory: advising to clear someone you believe innocent, or to arrest
// someone you believe guilty, fits it; the other way round clashes with it.
function fit(c) {
  let fits = 0, clashes = 0;
  [...ui.S.advice, ...ui.S.interviews].filter((a) => a.speaker === c.id).forEach((a) => {
    for (const [t, bad] of [[a.save, false], [a.eliminate, true]]) {
      const b = t === null || t === c.id ? undefined : belief(t);
      if (b === bad) fits++;
      else if (b !== undefined) clashes++;
    }
  });
  return [fits, clashes];
}

function slip(c, m, book) {
  const S = ui.S, known = c.role !== undefined, guess = ui.guesses[c.id];
  let tail, role;
  if (S.finished) {
    const right = m && (m === 1) === c.bad;
    tail = `<span class="tag ${c.bad ? "bad" : "good"}">${known ? c.role : c.bad ? "guilty" : "innocent"}</span>
      ${m ? `<span class="tverdict ${right ? "right" : "wrong"}" title="Your note was ${right ? "right" : "wrong"}">${right ? "✓" : "✕"}</span>` : ""}`;
    role = guess ? `<span class="tguess ${guess === c.role ? "right" : "wrong"}">you guessed ${guess}</span>` : "";
  } else {
    const over = guess && overGuessed(book[guess]);
    role = `<button class="trole${guess ? ` ${ROLES[guess][0]}${over ? " over" : ""}` : ""}${pickerFor === c.id ? " open" : ""}" data-pick="${c.id}"
      title="${guess ? `${over ? `You have guessed more guests than there are ${guess} roles left to find. ` : ""}Your guess: click to change it` : `Guess ${c.name}'s role`}">${guess ? `${guess}?` : "+ role"}</button>`;
    const [f, x] = fit(c);
    tail = `<span class="tswitch">${SWITCH.map(([k, icon, word]) =>
      `<button class="n${k}${k === m ? " on" : ""}" data-note="${c.id}:${k}" title="Mark ${c.name} ${word}">${icon}</button>`).join("")}</span>
      ${f + x ? `<span class="tfit" title="Of their tips about guests you have judged, ${f} fit your theory and ${x} clash with it"><b>${f}</b><b>${x}</b></span>` : ""}`;
  }
  return `<div class="tslip" data-row="${c.id}"${S.finished ? "" : ` draggable="true" data-drag="${c.id}"`}>
    ${portrait(known ? c.role : c.name, "thumb", c.art)}<span class="tname"><small>${c.id}</small> ${c.name}</span><span class="ttail">${tail}</span>${role}</div>`;
}

// The role sheet: this case's roles on each side, each with how many hold it, and who is found or guessed.
function pickerHtml(book) {
  const c = ui.S.chars[pickerFor], guess = ui.guesses[c.id];
  const chip = (r) => {
    const b = book[r], done = b.found >= b.n, others = b.guessed.filter((g) => g.id !== c.id);
    const note = done ? "found" : others.map((g) => g.short).join(", ");
    return `<button class="rchip ${ROLES[r][0]}${r === guess ? " on" : ""}" data-guess="${c.id}:${r}" ${done ? "disabled" : ""}
      title="${done ? `The ${r} is already found` : `${c.name} is the ${r}${others.length ? `; you have also guessed ${others.map((g) => g.name).join(", ")}` : ""}`}">
      ${portrait(r)}<span class="rc-n">${r}${b.n > 1 ? ` <small>×${b.n}</small>` : ""}</span>${note ? `<span class="rc-on">${note}</span>` : ""}</button>`;
  };
  const side = (team) => `<h4>${SIDE[team]}</h4><div class="rchips">${Object.keys(book).filter((r) => ROLES[r][0] === team).map(chip).join("")}</div>`;
  return `<div class="tpicker" role="dialog" aria-label="Guess ${c.name}'s role">
    <header>${portrait(c.name, "thumb", c.art)}<b>What is ${c.name}?</b><button class="tp-close" data-pick="${c.id}" title="Close" aria-label="Close">×</button></header>
    ${side("good")}${side("bad")}
    <div class="tp-foot"><button class="treset" data-guess="${c.id}:" ${guess ? "" : "disabled"}>No idea</button>
      <span>A guess puts them in the matching pile.</span></div></div>`;
}

// A row of pips: the guests left to find in a pile, filled as you mark them (red past the number left).
const pips = (marked, left) => `<span class="tpips">${Array.from({ length: Math.max(marked, left) },
  (_, i) => `<i class="${i >= left ? "over" : i < marked ? "on" : ""}"></i>`).join("")}</span>`;

export function theoryHtml() {
  const S = ui.S, book = roleBook();
  if (pickerFor !== null && (S.finished || !S.chars[pickerFor].alive)) pickerFor = null;
  const guests = S.finished ? S.chars : S.chars.filter((c) => c.alive);
  const mark = (c) => ui.marks[c.id] || 0;
  const count = (k) => guests.filter((c) => mark(c) === k).length;
  const out = S.chars.filter((c) => !c.alive);
  const leftBad = S.roster.filter(isBadRole).length - out.filter((c) => c.bad).length, left = [leftBad, guests.length - leftBad];
  const [g, i] = [count(1), count(2)];

  let lead;
  if (S.finished) {
    const marked = guests.filter((c) => mark(c)), right = marked.filter((c) => (mark(c) === 1) === c.bad).length;
    const guessed = guests.filter((c) => ui.guesses[c.id]), named = guessed.filter((c) => ui.guesses[c.id] === c.role).length;
    lead = `<p class="tlead">The case is closed. ${marked.length ? `Of your ${plural(marked.length, "note", "notes")}, ${right} ${right === 1 ? "was" : "were"} right` : "You made no notes"}${
      guessed.length ? `, and you named ${named} of the ${plural(guessed.length, "role", "roles")} you guessed` : ""}.</p>`;
  } else {
    const lines = [`<b>${plural(guests.length, "guest", "guests")}</b> in the house, <b>${leftBad} of them guilty</b>.`];
    if (g > leftBad) lines.push(`<span class="twarn">You have marked ${g} guilty, but only ${leftBad} ${leftBad === 1 ? "is" : "are"} left: ${plural(g - leftBad, "of them is", "of them are")} innocent.</span>`);
    else if (g === leftBad && g) lines.push(`You have marked all ${leftBad} guilty: if you are right, everyone else is innocent.`);
    else if (g) lines.push(`You have marked ${g} guilty, so ${plural(leftBad - g, "is", "are")} still hidden.`);
    if (i > left[1]) lines.push(`<span class="twarn">You have marked ${i} innocent, but only ${left[1]} innocent ${left[1] === 1 ? "guest is" : "guests are"} left.</span>`);
    const armed = Date.now() < armedUntil, notes = guests.filter((c) => mark(c)).length;
    lead = `<p class="tlead">${lines.join(" ")}</p><p class="thelp">These are your notes from the board. Move a guest with ✕ ? ✓ or drag them to another
      pile, and guess their role with “+ role”. The two numbers on a guest: how many of their tips fit your theory, and how many clash with it.</p>
      <div class="ttools"><button class="treset${armed ? " armed" : ""}" data-action="reset-notes" ${notes ? "" : "disabled"}
        title="Put every guest back under Unsure, here and on the board">${armed ? "Clear all your notes? Click again" : "↺ Reset theory"}</button></div>`;
  }

  const pile = ([k, cls, name]) => {
    const list = guests.filter((c) => mark(c) === k);
    const tally = S.finished ? `<span class="tcount">${list.length}</span>`
      : k === 0 ? `<span class="tcount">${list.length}</span>` : `${pips(list.length, left[k - 1])}<span class="tcount">${list.length} of ${left[k - 1]}</span>`;
    return `<section class="tpile ${cls}" data-pile="${k}"><header><h3>${name}</h3>${tally}</header>
      <div class="tlist">${list.map((c) => slip(c, k, book)).join("") || `<p class="tempty">${S.finished ? "None" : "Drag guests here"}</p>`}</div></section>`;
  };
  return `<div class="theory">${lead}<div class="tpiles">${PILES.map(pile).join("")}</div>${pickerFor !== null ? pickerHtml(book) : ""}</div>`;
}
