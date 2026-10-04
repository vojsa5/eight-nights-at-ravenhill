// The last night's summing-up in the drawing room, then the ending: the thaw comes, the magistrate arrives
// and the sealed pages of your file are opened. A short film tells the truth about every guest you
// misjudged, then the closing card, the next morning's newspaper, shows the whole case and the books won.
import { RANKS } from "./board.js";
import { coversHtml, shelf } from "./books.js";
import { playFilm } from "./film.js";
import { showReading, unread } from "./reading.js";
import { closeModal } from "./reveal.js";
import { ROMAN, moonSvg } from "./format.js";
import { portrait } from "./portrait.js";
import { CRIMES, TRUTHS, isBadRole, searchArt, title } from "./roles.js";
import { sharedCase } from "./shared.js";
import { $, ui } from "./state.js";

const WORDS = ["no", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen"];
const word = (n) => WORDS[n] || String(n);
const cap = (s) => s[0].toUpperCase() + s.slice(1);
const lower = (s) => s[0].toLowerCase() + s.slice(1);
const roleOf = (h) => h.role || ui.S.chars[h.char].role;

// On the last night the final clue is often that night's trace, which the summing-up recalls.
const LAST_TRACE = {
  Forger: "the ink still wet on the library desk this morning",
  Eavesdropper: "the chair drawn up to the library door again last night",
  Hypnotist: "a sleepwalker on the east corridor in the night",
  Paymaster: "one more banknote found under a door this morning",
  Grifter: "the stacked deck on the billiard table",
  Lunatic: "the stopped clocks on the first floor",
  Mole: "one more letter steamed open in the night",
  Lover: "the whispering on the back stairs before dawn",
};

// The last night: the two who remain, the summing-up, the verdict on both; then the ending.
export function showDrawingRoom() {
  const S = ui.S, [freed, accused] = S.history.slice(-2);
  if (!S.finished || !freed || !accused || freed.round !== S.rounds) return showFinale();
  const f = S.chars[freed.char], a = S.chars[accused.char], [left, right] = [f, a].sort((x, y) => x.id - y.id);
  const photo = (c, side) => `<div class="film-photo ${side}">${portrait(c.name, "", c.portrait)}</div>`;
  const gather = `On the last evening you gather the two who remain in the drawing room: <b>${left.name}</b>, the ${left.profession},
    and <b>${right.name}</b>, the ${right.profession}. The guests you cleared crowd the doorway to listen, and nobody touches the brandy.`;
  const caught = S.history.filter((h) => h.round < S.rounds && h.action !== "save" && h.ok).length;
  const lastTrace = ((S.traces || {})[S.rounds] || []).find((r) => LAST_TRACE[r]);
  const summing = `You go through the case night by night: the testimony, the notebooks, ${caught
    ? `${word(caught)} ${caught === 1 ? "culprit" : "culprits"} already under lock and key` : "not a single culprit under lock and key"}${
    lastTrace ? `, and ${LAST_TRACE[lastTrace]}` : ""}. Then you turn to <b>${a.name}</b> and name them.`;
  const role = roleOf(accused);
  const unmasked = accused.ok ? `<b>${a.name}</b> is on their feet before you have finished, then sits down again very slowly. ${a.name} was
      ${lower(title(role))}, who ${lower(CRIMES[role])}` : "";  // only the guilty have a crime
  const denied = `<b>${a.name}</b> hears you out in silence and simply shakes their head.`;
  // Usually one of the two is guilty, but after an earlier mistake both can be innocent, or both guilty.
  const missed = S.history.filter((h) => h.round < S.rounds && h.action === "save" && !h.ok).length;
  const verdict = accused.ok && freed.ok ? `${unmasked} <b>${f.name}</b> lets out a long breath, free of suspicion at last.`
    : accused.ok ? `${unmasked} But the drawing room held two of the guilty, not one: while every eye is on ${a.name}, <b>${f.name}</b>
      slips quietly out of the room.`
    : freed.ok ? `${denied} They are right: neither of the two ever did Lord Edmund a wrong. ${missed === 1
      ? "The one culprit you missed was cleared on an earlier night" : `The ${word(missed)} culprits you missed were cleared on
      earlier nights`}, so whoever you named tonight, you would have locked up an innocent guest. <b>${f.name}</b> at least goes free,
      as they should.`
    : `${denied} Nobody in the doorway will meet your eye: you have named the wrong guest. Behind you, <b>${f.name}</b> slips quietly
      out of the room.`;
  playFilm([
    ["finale/drawing-room", "50% 55%", gather, photo(left, "") + photo(right, "right")],
    ["finale/summation", "50% 55%", summing],
    [accused.ok ? searchArt(role) : "finale/drawing-room", accused.ok ? "50% 55%" : "50% 40%", verdict],
  ], { done: () => (unread().length ? (closeModal(), showReading(showFinale)) : showFinale()), label: "The drawing room", skip: "Skip to the ending" });  // the last books are read before the thaw
}

export function showFinale() {
  if (!ui.S || !ui.S.finished) return;
  playFilm(finaleScenes(), { done: showClosing, label: "The thaw", skip: "Skip to the verdict" });
}

function finaleScenes() {
  const mistakes = ui.S.history.filter((h) => !h.ok);
  const thaw = `On the ninth morning the thaw came. By noon the magistrate's motor car was labouring up the drive, and ${mistakes.length
    ? "the sealed pages of your file could be opened at last." : "there was not a single sealed page in your file."}`;
  return [["finale/thaw", "60% 60%", thaw], ...mistakes.map(mistakeScene), ["finale/epilogue", "45% 60%", verdictText()]];
}

function mistakeScene(h) {
  const c = ui.S.chars[h.char], n = c.name, role = roleOf(h), was = `${n} was ${lower(title(role))}`;
  const caption = h.action === "save"
    ? `By the time the magistrate's men reached the station, <b>${n}</b>, the ${c.profession}, was long gone, but in the room
      you had cleared on night ${ROMAN[h.round]} they found what the fire had missed. ${was}, who ${lower(CRIMES[role])}`
    : `The magistrate unlocked the cellar and let <b>${n}</b>, the ${c.profession}, out before lunch, with an apology. You
      had arrested ${n} on night ${ROMAN[h.round]}. ${was}. ${TRUTHS[role]}`;
  return [searchArt(role), "50% 55%", caption];
}

// The case in numbers: the guilty arrested (caught) and cleared (escaped), and innocent guests arrested (wronged).
function tally(S) {
  const count = (save, ok) => S.history.filter((h) => (h.action === "save") === save && h.ok === ok).length;
  return { caught: count(false, true), escaped: count(true, false), wronged: count(false, false) };
}

function verdictText() {
  const S = ui.S, n = S.history.length, { caught, escaped, wronged } = tally(S), bad = caught + escaped;
  if (S.score === n) {
    return `The magistrate read your file twice and found nothing to change. All ${word(bad)} culprits stood trial at York in the
      spring, every innocent guest went home, and Scotland Yard would like a word with you about a promotion.`;
  }
  const trial = caught === bad ? `All ${word(bad)} culprits stood trial at York in the spring.`
    : caught ? `${cap(word(caught))} of the ${word(bad)} culprits stood trial at York in the spring, and ${word(escaped)} ${escaped === 1 ? "was" : "were"} never seen again.`
    : `Not one of the ${word(bad)} culprits stood trial: all of them were long gone.`;
  const cellar = wronged ? ` ${cap(word(wronged))} innocent ${wronged === 1 ? "guest" : "guests"} had spent nights in the cellar for nothing.` : "";
  const close = S.score >= 0.8 * n ? "The Yard calls it a good week's work."
    : S.score >= 0.6 * n ? "The Yard calls it a fair result for a hard case." : "Somewhere in Yorkshire, the guilty are raising a glass to you.";
  const right = !S.score ? "not one was" : `${word(S.score)} ${S.score === 1 ? "was" : "were"}`;
  return `The magistrate read your file twice. Of ${word(n)} decisions, ${right} right. ${trial}${cellar} ${close}`;
}

// The closing card: the next morning's newspaper. Its headline, and Inspector Hollis's verdict on the medal of the
// score, follow RANKS (board.js); under them the books won, the nights and the culprits with their crimes.
// One per rank of RANKS, best first.
const HEADLINES = ["Ravenhill case cracked", "Ravenhill culprits in the dock", "Holes in the Ravenhill net", "Fiasco at Ravenhill"];
const CLOSES = ["Scotland Yard is said to be considering a promotion.", "At the Yard they are calling it a good week's work.",
  "At the Yard they are calling it a fair result for a hard case.", "In certain houses in the county, they are drinking the inspector's health."];

function showClosing() {
  const S = ui.S, t = tally(S), rank = RANKS.findIndex(([share]) => S.score >= share * S.history.length);
  $("modal").innerHTML = `<div class="closing r${rank}" role="dialog" aria-modal="true" aria-label="Case closed">
    <div class="news">
      <div class="masthead"><span class="news-ear">Case no. 1924/17<br>Closed</span><div class="paper-name">The Moorland Herald</div>
        <span class="news-ear">Late edition<br>One penny</span></div>
      <div class="dateline"><span>York, December 1924</span><span>The Ravenhill affair</span><span>The thaw at last</span></div>
      <h2 class="headline">${HEADLINES[rank]}</h2>
      <div class="news-top">
        <p class="news-deck">${deckText(t)}</p>
        <figure class="news-photo"><img src="art/finale/thaw.svg" alt=""><figcaption>Yesterday at Ravenhill: the magistrate's motor car
          comes up the drive as the thaw sets in.</figcaption></figure>
        <div class="news-lead"><p class="news-byline">From our own correspondent</p><p class="news-story">${storyText(t, rank)}</p></div>
        ${verdictHtml(rank)}
      </div>
      ${booksHtml()}
      ${nightsHtml()}
      ${unmaskedHtml(t)}
    </div>
    <div class="nav">
      <button class="btn" data-action="finale">↺ Watch the ending again</button>
      <span><button class="btn${sharedCase ? " primary" : ""}" id="revealOk">Back to the board</button>
      ${sharedCase ? "" : `<button class="btn primary" data-action="new-game">Take another case</button>`}</span>
    </div></div>`;
  $("modal").classList.add("open");
  $("modal").querySelector(".btn.primary").focus();
}

// Under the headline: who stands trial, who got away, who was held for nothing.
function deckText({ caught, escaped, wronged }) {
  const bad = caught + escaped;
  return [caught === bad ? `All ${word(bad)} culprits to stand trial`
    : caught ? `${word(caught)} of ${word(bad)} culprits to stand trial` : "Not one culprit to stand trial",
  escaped && (escaped === bad ? `all ${word(bad)} at large` : `${word(escaped)} at large`),
  wronged ? `${word(wronged)} innocent ${wronged === 1 ? "guest" : "guests"} held for nothing` : "not one innocent guest held"]
    .filter(Boolean).map(cap).join(" · ");
}

// The front page's story of the case.
function storyText({ caught, escaped, wronged }, rank) {
  const S = ui.S, n = S.history.length, bad = caught + escaped;
  const right = S.score === n ? `every one of its ${word(n)} decisions` : S.score ? `${word(S.score)} of its ${word(n)} decisions`
    : `not one of its ${word(n)} decisions`;
  const gone = escaped === 1 ? "the other one, cleared in error, was" : `the other ${word(escaped)}, cleared in error, were`;
  const trial = caught === bad ? `All ${word(bad)} culprits will stand trial at the York Assizes in the spring.`
    : caught ? `${cap(word(caught))} of the ${word(bad)} culprits will stand trial at the York Assizes in the spring; ${gone} gone
      before the magistrate's men reached the station.`
    : `Not one of the ${word(bad)} culprits will stand trial: every one of them was cleared, and gone before the magistrate's men
      reached the station.`;
  const cellar = wronged ? `${cap(word(wronged))} innocent ${wronged === 1 ? "guest was" : "guests were"} let out of the wine cellar with an apology.`
    : "Not one innocent guest spent a night in the cellar.";
  // the Lovers, the only ones who meant him to die: how many of them face the murder charge
  const lovers = S.history.filter((h) => roleOf(h) === "Lover"), held = lovers.filter((h) => h.ok).length;
  const murder = !lovers.length ? "" : held === lovers.length ? " Both of the guests who poisoned his nightcap will answer for it."
    : held ? " Of the two who poisoned his nightcap, one will answer for it; the other is still at large."
    : " The two who poisoned his nightcap are still at large.";
  return `The thaw reached Ravenhill Manor yesterday, after ${word(S.rounds)} nights in which the snow held ${word(S.chars.length)} guests
    in the house where Lord Edmund Ravenhill was poisoned on his seventieth birthday. The inspector from Scotland Yard has handed the
    magistrate a file on every guest, and ${right} proved right. ${trial}${murder} ${cellar} ${CLOSES[rank]}`;
}

// The score on a medal of the rank's metal, and Inspector Hollis's word on it.
function verdictHtml(rank) {
  const S = ui.S, n = S.history.length;
  return `<section class="yard"><h3>The Yard's verdict</h3>
    <div class="rank-medal" role="img" aria-label="${S.score} of ${n} decisions right"><i class="ribbon"></i><span class="face"><b>${S.score}</b><small>of ${n}</small></span></div>
    <p class="hollis">${RANKS[rank][1]}<span>Hollis</span></p></section>`;
}

// How a decision reads in the paper: "Arrested on night III", and on the last night "Accused on the last night".
const decided = (h) => (h.round === ui.S.rounds ? `${h.action === "save" ? "Let go" : "Accused"} on the last night`
  : `${h.action === "save" ? "Cleared" : "Arrested"} on night ${ROMAN[h.round]}`);

// The nights, the moon waxing to full: whom you cleared and whom you arrested each night, and whether you were right.
function nightsHtml() {
  const S = ui.S;
  const call = (h) => {
    if (!h) return `<span class="night-call"></span>`;
    const c = S.chars[h.char], role = roleOf(h);
    return `<span class="night-call ${h.ok ? "hit" : "miss"}" title="${decided(h)}: ${c.name}, ${lower(title(role))}. ${h.ok ? "Right." : "A mistake."}">
      <b>${c.short}</b><small class="${isBadRole(role) ? "bad" : "good"}">${role}</small><i aria-hidden="true">${h.ok ? "✓" : "✗"}</i></span>`;
  };
  const night = (r) => {
    const hs = S.history.filter((h) => h.round === r);
    return `<div class="night-col${r === S.rounds ? " last" : ""}" style="--i:${r}"><span class="night-moon">${moonSvg(r / S.rounds)}<b>${ROMAN[r]}</b>
      <em>${r === S.rounds ? "The drawing room" : S.events[r] || ""}</em></span>
      ${call(hs.find((h) => h.action === "save"))}${call(hs.find((h) => h.action !== "save"))}</div>`;
  };
  return `<section class="news-nights"><h3>Night by night</h3><div class="night-grid" style="--n:${S.rounds}">
    <div class="night-col night-labels" aria-hidden="true"><span class="night-moon"></span><span class="night-call">Cleared</span><span class="night-call">Arrested</span></div>
    ${Array.from({ length: S.rounds }, (_, i) => night(i + 1)).join("")}</div></section>`;
}

// The culprits, those for trial first: each with the crime, and how their part ended.
function unmaskedHtml({ caught, escaped }) {
  const S = ui.S, bad = S.history.filter((h) => isBadRole(roleOf(h))).sort((a, b) => b.ok - a.ok);
  const mug = (h) => {
    const c = S.chars[h.char], role = roleOf(h);
    return `<div class="mug${h.ok ? "" : " miss"}"><div class="mugshot">${portrait(role, "", c.art)}${h.ok ? "" : `<span class="fate">At large</span>`}</div>
      <b>${c.name}</b><small>${title(role)}</small><p>${CRIMES[role] || ""}</p><em>${decided(h)} · ${h.ok ? "for trial" : "<span>at large</span>"}</em></div>`;
  };
  return `<section class="unmasked"><h3>The guilty unmasked<span>${caught} of ${caught + escaped} to stand trial</span></h3>
    <div class="mugs">${bad.map(mug).join("")}</div></section>`;
}

// The books won, on a shelf, and after them in grey those lost with a mistake. The last night's are named: no card of
// their own announced them.
function booksHtml() {
  const S = ui.S, { won, lost, total } = shelf(S);
  if (!total) return "";
  const last = won.filter((x) => x.h.round === S.rounds).map((x) => `<i>${x.book.title}</i>`);
  const line = (!won.length ? "Not one of the books hidden in the house is yours. Somewhere, one of the guilty is reading them."
    : `${last.length ? `On the last night you found ${last.join(" and ")}. ` : ""}${won.length === 1 ? "The book is yours"
      : won.length === 2 ? "Both are yours" : `All ${word(won.length)} are yours`}, and you have read ${won.length === 1 ? "it" : won.length === 2 ? "them both" : "every one"}.`)
    + (lost.length && won.length ? ` The ${lost.length === 1 ? "one" : word(lost.length)} in grey ${lost.length === 1 ? "was" : "were"} lost with your mistakes.` : "");
  const book = (x, cls) => `<span class="shelved ${cls}" title="${cls === "lost" ? "Lost: " : ""}${x.book.title}, ${x.book.author}">${coversHtml(x.book)}${
    cls === "lost" ? `<b class="lost-mark">Lost</b>` : ""}</span>`;
  return `<section class="closing-books"><h3>Found in the house<span>${won.length} of ${total} books</span></h3>
    <div class="mini-shelf">${won.map((x) => book(x, x.h.round === S.rounds ? "fresh" : "")).join("")}${lost.map((x) => book(x, "lost")).join("")}</div>
    <p>${line}</p></section>`;
}
