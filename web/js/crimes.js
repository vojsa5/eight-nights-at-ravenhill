// The Crimes tab: every crime done to Lord Edmund on the night he died, one per guilty role in this case (a role held
// by two, the Lovers, shares one crime and has two culprits), as a card on the crime board: the scene as a sepia
// photograph, and pinned over it a polaroid per culprit. A culprit is unmasked once rightly arrested: their photograph
// goes up, tied to the scene with red string, and a crime whose culprits are all unmasked is stamped Solved. A guilty
// guest cleared by mistake keeps their role sealed until the thaw (the server leaves it out), so nothing here may say
// which crime was theirs; once the case is closed every crime names its culprits, and those who walked free are
// stamped Got away. Under the crimes, the innocent guests rightly cleared and who they really were. A right call's
// flashback, the film after it (reveal.js), plays again from its Replay button.
import { ROMAN } from "./format.js";
import { portrait } from "./portrait.js";
import { closeModal, replayFlashbacks } from "./reveal.js";
import { CRIMES, TRUTHS, isBadRole, searchArt, title } from "./roles.js";
import { $, ui } from "./state.js";
import { CRIME_STORY, TRUTH_STORY } from "./story.js";

const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen",
  "Fifteen", "Sixteen"];
const word = (n) => WORDS[n] || String(n);
const plural = (n, one, many = one + "s") => (n === 1 ? one : many);

// The case's crimes, those with two culprits first: { role, no, n culprits, slots, solved }. A slot is a culprit
// rightly arrested { c, h, caught: true } (in the order of the arrests, so the first Lover found holds the first
// slot), after the thaw also one who got away { c, h, caught: false } (h is undefined if they were never sent away),
// or null while unknown.
export function crimeList(S) {
  const arrested = S.history.filter((h) => h.action === "eliminate" && h.ok);
  const roles = [...new Set(S.roster.filter(isBadRole))].map((role) => ({ role, n: S.roster.filter((r) => r === role).length }));
  return roles.sort((a, b) => b.n - a.n).map(({ role, n }, i) => {
    const caught = arrested.filter((h) => h.role === role).map((h) => ({ c: S.chars[h.char], h, caught: true }));
    const away = S.finished ? S.chars.filter((c) => c.role === role && !caught.some((x) => x.c === c))
      .map((c) => ({ c, h: S.history.find((h) => h.char === c.id), caught: false })) : [];
    const slots = [...caught, ...away];
    return { role, no: i + 1, n, slots: [...slots, ...Array(Math.max(0, n - slots.length)).fill(null)], solved: caught.length >= n };
  });
}

export function crimesHtml() {
  const S = ui.S, crimes = crimeList(S), newest = S.history[S.history.length - 1];
  return `<div class="crimes">${headHtml(S, crimes)}<div class="cr-board"><div class="cr-cards">
    ${crimes.map((x) => cardHtml(S, x, newest)).join("")}</div></div>${clearedHtml(S)}</div>`;
}

// Replay: the flashbacks of the right calls on these guests ("1,2": both Lovers, one after the other) over the folder,
// which is as it was when the film ends or is skipped; the keyboard comes back to the button. Nothing in the case changes.
export function replayCalls(ids) {
  const hs = ids.split(",").map((id) => ui.S.history.find((h) => h.char === +id && h.ok)).filter(Boolean);
  replayFlashbacks(hs, () => {
    closeModal();
    setTimeout(() => $("tabbody").querySelector(`[data-replay="${CSS.escape(ids)}"]`)?.focus({ preventScroll: true }));  // once the folder is no longer inert
  });
}

// The button that plays these right calls' flashbacks again (main.js data-replay).
const replayHtml = (hs, what) => `<button class="cr-replay" data-replay="${hs.map((h) => h.char).join(",")}" title="${what}" aria-label="${what}"><b
  aria-hidden="true">▶</b>Replay</button>`;

// The notice at the head of the board: how many crimes and culprits, how many solved and unmasked, and, while the case
// is open, how many culprits walked free with their crime sealed.
function headHtml(S, crimes) {
  const culprits = crimes.reduce((t, x) => t + x.n, 0), solved = crimes.filter((x) => x.solved).length;
  const caught = crimes.reduce((t, x) => t + x.slots.filter((s) => s && s.caught).length, 0);
  const freed = S.history.filter((h) => h.action === "save" && !h.ok).length;  // a guilty guest cleared: a mistake
  const away = S.finished ? culprits - caught : freed;
  const pips = (on, off, n, cls) => `<span class="cr-pips ${cls}" aria-hidden="true">${'<i class="on"></i>'.repeat(on)}${'<i class="off"></i>'.repeat(off)}${
    "<i></i>".repeat(Math.max(0, n - on - off))}</span>`;
  const sealed = !S.finished && freed
    ? `<p class="cr-sealed"><i class="cr-wax" aria-hidden="true"></i>${freed === 1 ? "One culprit walked free; which crime was theirs stays"
      : `${word(freed)} culprits walked free; which crimes were theirs stay`} sealed until the thaw.</p>` : "";
  const closed = S.finished ? `<p class="cr-closed">Closed at the thaw: every culprit named${away ? `, and ${word(away).toLowerCase()} got away` : ""}.</p>` : "";
  const shared = crimes.find((x) => x.role === "Lover" && x.n > 1);  // the murder (story.js)
  return `<header class="cr-head">
    <span class="cr-kicker">${S.finished ? "Case closed" : "Scotland Yard"} · The charges</span>
    <h3><span>${word(crimes.length)} ${plural(crimes.length, "crime")} <i>·</i></span> <span>${word(culprits)} ${plural(culprits, "culprit")}</span></h3>
    <p class="cr-sub">done to Lord Edmund Ravenhill on the night he died.${shared ? ` The ${shared.role}s share one; every other culprit worked alone.` : ""}
      ${S.finished ? "" : "Arrest a culprit and their photograph goes up beside their crime."}</p>
    <p class="cr-progress"><span><span><b>${solved}</b> of ${crimes.length} ${plural(crimes.length, "crime")} solved</span>${pips(solved, 0, crimes.length, "crime")}</span>
      <i>·</i><span><span><b>${caught}</b> of ${culprits} ${plural(culprits, "culprit")} unmasked</span>${pips(caught, away, culprits, "who")}</span></p>
    ${sealed}${closed}</header>`;
}

// Where the polaroids hang on the scene, in its own units (360 × 200, as the photograph's box; folder.css .cr-polaroid
// puts them there): the scene's pin, and the pin of the polaroid k places from the right.
const PIN = [180, 13];
const slotPin = (k) => [305 - 96 * k, 63];

// A crime's card: the scene with its culprits' polaroids and red string, its stamp, then its number, title, text and
// who did it, as the story tells it (story.js CRIME_STORY: title, scene = its picture under art/, told; a role without
// a story there gets a plain title and its charge from roles.js). The crime solved by the latest decision is stamped
// as you look (folder.css .cr-new).
function cardHtml(S, x, newest) {
  const story = CRIME_STORY[x.role] || {};
  const name = story.title || `The ${x.role}'s crime`, text = story.told || CRIMES[x.role] || "";
  const fresh = x.slots.some((s) => s && s.h === newest);
  const strings = x.slots.map((s, i) => {
    const [ax, ay] = PIN, [bx, by] = slotPin(x.n - 1 - i);
    return `<path class="${s && s.caught ? "tied" : "loose"}" d="M${ax} ${ay}Q${(ax + bx) / 2} ${(ay + by) / 2 + 26} ${bx} ${by}"/>`;
  }).join("");
  const stamp = x.solved ? `<b class="cr-stamp solved">Solved</b>` : S.finished ? `<b class="cr-stamp unsolved">Unsolved</b>` : "";
  const caught = x.slots.filter((s) => s && s.caught);
  const replay = caught.length && story.flashback
    ? replayHtml(caught.map((s) => s.h), `Replay what ${caught.map((s) => s.c.name).join(" and ")} did that night`) : "";
  // the crime's scene over the search's picture, which shows until the scene is drawn (or if it never is)
  const scene = [...new Set([story.scene || `crimes/${x.role.toLowerCase()}`, searchArt(x.role)])].map((a) => `url(art/${a}.svg)`).join(", ");
  return `<article class="cr-card${x.n > 1 ? " pair" : ""}${x.role === "Lover" ? " murder" : ""}${x.solved ? " solved" : ""}${fresh ? " cr-new" : ""}" aria-label="Crime no. ${x.no}: ${name}">
    <div class="cr-photo"><i class="cr-scene" style="background-image: ${scene}"></i><i class="cr-pin" aria-hidden="true"></i>
      <svg class="cr-strings" viewBox="0 0 360 200" preserveAspectRatio="none" aria-hidden="true">${strings}</svg>
      ${x.slots.map((s, i) => polaroidHtml(s, x.n - 1 - i, s && s.h === newest)).join("")}${stamp}</div>
    <div class="cr-body"><span class="cr-form">Crime no. ${x.no}${x.n > 1 ? ` · ${word(x.n).toLowerCase()} culprits` : ""}</span>
      <h4>${name}</h4><p class="cr-text">${text}</p>
      <ul class="cr-who">${whoHtml(x)}</ul>${replay}</div></article>`;
}

// A culprit's polaroid on the scene: their own photograph once unmasked (pointing at it lifts it on the board, main.js
// data-row), stamped Got away if they walked free; a silhouette while unknown. Screen readers get the list under the text instead.
function polaroidHtml(s, k, fresh) {
  if (!s) return `<span class="cr-polaroid unknown" style="--k:${k}" aria-hidden="true"><img class="art" src="art/unknown.svg" alt=""><span class="cr-cap">?</span></span>`;
  return `<span class="cr-polaroid ${s.caught ? "caught" : "away"}${fresh ? " fresh" : ""}" style="--k:${k}" data-row="${s.c.id}" aria-hidden="true">${portrait(s.c.name, "", s.c.portrait)}
    <span class="cr-cap">${s.c.short}</span>${s.caught ? "" : `<b class="cr-stamp away">Got away</b>`}</span>`;
}

// Under the text, who did it: each culprit found, with their profession and the night, then those still unknown.
function whoHtml(x) {
  const found = x.slots.filter(Boolean).map(({ c, h, caught }) => {
    const when = caught ? `Arrested · night ${ROMAN[h.round]}` : h ? `Cleared · night ${ROMAN[h.round]} · got away` : "Never caught";
    return `<li class="${caught ? "caught" : "away"}" data-row="${c.id}"><b>${c.name}</b> <small>#${c.id}</small> <em>the ${c.profession}</em>
      <span class="cr-when">${when}</span></li>`;
  });
  const unknown = x.slots.filter((s) => !s).length;
  if (unknown) found.push(`<li class="unknown">${unknown > 1 ? `${word(unknown)} culprits unknown` : found.length ? "The other culprit unknown" : "Culprit unknown"}</li>`);
  return found.join("");
}

// The innocent guests rightly cleared, in the order you cleared them: who each really was (the title of their story in
// story.js TRUTH_STORY, and roles.js TRUTHS), with their story to replay. Only right clears: a mistake's role stays sealed
// until the thaw, and its story is never told as a flashback.
function clearedHtml(S) {
  const cleared = S.history.filter((h) => h.action === "save" && h.ok), innocents = S.roster.filter((r) => !isBadRole(r)).length;
  const items = cleared.map((h) => {
    const c = S.chars[h.char], story = TRUTH_STORY[h.role];
    return `<article class="cr-alibi" data-row="${c.id}">
      <span class="cr-alibi-photo" aria-hidden="true">${portrait(c.name, "", c.portrait)}</span>
      <div class="cr-alibi-body"><span class="cr-form">${h.round === S.rounds ? "Let go · the last night" : `Cleared · night ${ROMAN[h.round]}`}</span>
        <h4><b>${c.name}</b> <small>#${c.id}</small> <em>the ${c.profession}</em></h4>
        <p class="cr-alibi-role"><span>${title(h.role)}</span>${story ? `<i>·</i>${story.title}` : ""}</p>
        <p class="cr-alibi-text">${TRUTHS[h.role] || ""}</p>
        ${story ? replayHtml([h], `Replay who ${c.name} really was`) : ""}</div></article>`;
  }).join("");
  return `<section class="cr-cleared"><header class="cr-cleared-head"><h3>The innocent, rightly cleared</h3>
      <span class="count">${cleared.length} of ${innocents} cleared</span></header>
    ${items ? `<div class="cr-alibis">${items}</div>`
      : `<p class="cr-none">${S.finished ? "Not one innocent guest was rightly cleared."
        : "Nobody yet. Every innocent guest you rightly clear is filed here, with who they really were."}</p>`}</section>`;
}
