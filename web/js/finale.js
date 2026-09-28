// The last night's summing-up in the drawing room, then the ending: the thaw comes, the magistrate arrives
// and the sealed pages of your file are opened. A short film tells the truth about every guest you
// misjudged, then the closing card shows the whole case.
import { playFilm } from "./film.js";
import { ROMAN } from "./format.js";
import { portrait } from "./portrait.js";
import { CRIMES, TRUTHS, isBadRole, searchArt, title } from "./roles.js";
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
    ? `${word(caught)} ${caught === 1 ? "conspirator" : "conspirators"} already under lock and key` : "not a single conspirator under lock and key"}${
    lastTrace ? `, and ${LAST_TRACE[lastTrace]}` : ""}. Then you turn to <b>${a.name}</b> and name them.`;
  const role = roleOf(accused);
  const verdict = (accused.ok
    ? `<b>${a.name}</b> is on their feet before you have finished, then sits down again very slowly. ${a.name} was
      ${lower(title(role))}, who ${lower(CRIMES[role])}`
    : `<b>${a.name}</b> hears you out in silence and simply shakes their head. Nobody in the doorway will meet your eye: you have
      named the wrong guest.`) + (freed.ok ? ` <b>${f.name}</b> lets out a long breath, free of suspicion at last.`
    : ` Behind you, <b>${f.name}</b> slips quietly out of the room.`);
  playFilm([
    ["finale/drawing-room", "50% 55%", gather, photo(left, "") + photo(right, "right")],
    ["finale/summation", "50% 55%", summing],
    [accused.ok ? searchArt(role) : "finale/drawing-room", accused.ok ? "50% 55%" : "50% 40%", verdict],
  ], { done: showFinale, label: "The drawing room", skip: "Skip to the ending" });
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

function verdictText() {
  const S = ui.S, H = S.history, n = H.length;
  const caught = H.filter((h) => h.action !== "save" && h.ok).length;
  const escaped = H.filter((h) => h.action === "save" && !h.ok).length;
  const wronged = H.filter((h) => h.action !== "save" && !h.ok).length;
  const bad = caught + escaped;
  if (S.score === n) {
    return `The magistrate read your file twice and found nothing to change. All ${word(bad)} conspirators stood trial at York in the
      spring, every innocent guest went home, and Scotland Yard would like a word with you about a promotion.`;
  }
  const trial = caught === bad ? `All ${word(bad)} conspirators stood trial at York in the spring.`
    : `${cap(word(caught))} of the ${word(bad)} conspirators stood trial at York in the spring, and ${word(escaped)} ${escaped === 1 ? "was" : "were"} never seen again.`;
  const cellar = wronged ? ` ${cap(word(wronged))} innocent ${wronged === 1 ? "guest" : "guests"} had spent nights in the cellar for nothing.` : "";
  const close = S.score >= 0.8 * n ? "The Yard calls it a good week's work."
    : S.score >= 0.6 * n ? "The Yard calls it a fair result for a hard case." : "Somewhere in Yorkshire, the conspiracy is raising a glass to you.";
  return `The magistrate read your file twice. Of ${word(n)} decisions, ${word(S.score)} were right. ${trial}${cellar} ${close}`;
}

// Every guest, grouped by how their part in the case ended.
function showClosing() {
  const S = ui.S;
  const entry = (h) => {
    const c = S.chars[h.char], role = roleOf(h);
    return `<div class="verdict">${portrait(role, "", c.art)}<span><b>${c.name}</b><small class="${isBadRole(role) ? "bad" : "good"}">${role}</small></span></div>`;
  };
  const group = (label, cls, pick) => {
    const hs = S.history.filter(pick);
    return `<section class="${cls}"><h3>${label}</h3>${hs.length ? hs.map(entry).join("") : `<p class="none">Nobody.</p>`}</section>`;
  };
  $("modal").innerHTML = `<div class="closing paper" role="dialog" aria-modal="true" aria-label="Case closed">
    <div class="kicker">Case no. 1924/17 · Ravenhill Manor, Yorkshire</div>
    <h2>Case closed</h2>
    <div class="final-score">${S.score}<span>/ ${S.history.length}</span></div>
    <div class="verdicts">
      ${group("Stood trial", "bad", (h) => h.action !== "save" && h.ok)}
      ${group("Walked free", "bad", (h) => h.action === "save" && !h.ok)}
      ${group("Cleared", "good", (h) => h.action === "save" && h.ok)}
      ${group("Held for nothing", "good", (h) => h.action !== "save" && !h.ok)}
    </div>
    <div class="nav">
      <button class="btn" data-action="finale">↺ Watch the ending again</button>
      <span><button class="btn" id="revealOk">Back to the board</button>
      <button class="btn primary" data-action="new-game" id="closingNew">Take another case</button></span>
    </div></div>`;
  $("modal").classList.add("open");
  $("closingNew").focus();
}
