// The prologue: a short illustrated film of how the case began (story.js), then how to play (the How to play film,
// howto.js), a case in miniature (minisim.js), Inspector Hollis's advice (the Advice film, tips.js) and last the case
// papers: the telegram, the guests and the crimes. Five chapters, each opening with its title card and showing the chapter bar (chapters.js). Shown at
// the start of every case, and from the Story button.
import { chapterBar, onChapter, showChapterCard, word } from "./chapters.js";
import { playFilm, preloadArt } from "./film.js";
import { RELATIONS } from "./guests.js";
import { portrait } from "./portrait.js";
import { CRIMES, ROLES } from "./roles.js";
import { CRIME_STORY, OPENING } from "./story.js";
import { $, ui } from "./state.js";
import { load, store } from "./storage.js";
import { showHowTo } from "./howto.js";
import { showMiniCase } from "./minisim.js";
import { showTips } from "./tips.js";

// The film: [picture, where the camera slowly moves in, caption], the birthday night crime by crime (story.js)
const SCENES = OPENING;
preloadArt(SCENES.map(([pic]) => pic));  // while the opening screen shows, so the film opens with its pictures ready

const telegram = () => `<div class="kicker">Case no. 1924/17 · Ravenhill Manor, Yorkshire</div>
    <h2>Eight Nights at Ravenhill</h2>
    <div class="telegram">
      <div class="head"><span>GPO TELEGRAM · URGENT</span><span>RAVENHILL 23:48</span></div>
      TO THE INSPECTOR AT RAVENHILL MANOR STOP LORD EDMUND RAVENHILL FOUND DEAD IN HIS LIBRARY STOP POISON STOP
      NEW WILL MISSING FROM THE SAFE STOP ROADS CLOSED BY SNOW STOP SIXTEEN GUESTS IN THE HOUSE STOP
      SEVEN CRIMES AGAINST HIM IN ONE NIGHT STOP EIGHT OF THE GUESTS GUILTY STOP THAW EXPECTED IN EIGHT NIGHTS STOP
      TRUST NO ONE STOP
      <div class="sig">Hollis, Scotland Yard</div>
    </div>
    <p>Eight of the guests are exactly what they seem. Each of the other eight did Lord Edmund a wrong on his birthday night,
    for reasons of their own and without knowing what the others were about. Only two of them, a pair of secret lovers, meant him
    to die, and they poisoned his nightcap together. When the thaw comes, every guest must either be cleared or held for the
    magistrate.</p>`;

// The sixteen guests, each with who they were to Lord Edmund, all alike: nothing on the page says who is guilty.
function guests() {
  const list = ui.S ? ui.S.chars : [];
  return `<div class="kicker">Ravenhill Manor · the birthday dinner</div>
    <h2>The guests</h2>
    <p>Every guest who sat down to Lord Edmund's birthday dinner is still in the house. Eight are innocent, and eight did him a
    wrong that night. Nothing on this page tells you which.</p>
    <div class="guestlist">${list.map((c) => `<div class="guest"><span class="g-photo">${portrait(c.name, "", c.portrait)}</span>
      <div><b>${c.name}</b><small>the ${c.profession}</small><span class="g-rel">${RELATIONS[c.short] || ""}</span></div></div>`).join("")}</div>`;
}

const cap = (t) => t[0].toUpperCase() + t.slice(1);

// One entry per crime in this case, in the order of the evening (the full list before a case has loaded): its
// title, the role that did it and the charge.
function dossier() {
  const roster = ui.S ? ui.S.roster : Object.keys(ROLES);
  const bad = roster.filter((r) => ROLES[r][0] === "bad");
  const entries = Object.keys(CRIME_STORY).filter((r) => bad.includes(r)).map((r) => {
    const n = bad.filter((x) => x === r).length;
    return `<div class="suspect"><b>${CRIME_STORY[r].title}</b><span class="s-photo">${portrait(r)}</span>
      <p><i>${n > 1 ? `The ${word(n)} ${r}s` : `The ${r}`}:</i> ${CRIMES[r]}</p></div>`;
  });
  return `<div class="kicker">From Inspector Hollis's file</div>
    <h2>The crimes</h2>
    <p>${cap(word(entries.length))} crimes were done against Lord Edmund on his birthday night by guests now snowed in with you, and
    only one of them killed him. You know what was done, but not by whom, and each crime is reason enough to arrest whoever did it.</p>
    <div class="dossier">${entries.join("")}</div>
    <p>Nobody wears their role on their sleeve. You learn who held which one only when you clear or arrest them.</p>`;
}

// The case papers, the last chapter: [page, label of the button that turns to the next one]
const PAPERS = [[telegram, "The guests →"], [guests, "The crimes →"], [dossier, ""]];  // the last one opens the case

let paper = 0;
let finish = () => {};  // what follows the papers, or a skip to the case: the case (the callers pass it)

// Every case opens with the prologue, once: reloading the page in the middle of a case does not replay it.
// Returns whether it is now showing.
export function maybeShowPrologue(done) {
  const key = "story-" + ui.S.id;
  if (ui.S.history.length || load(key)) return false;
  store(key, "1");
  showPrologue(0, done);
  return true;
}

// Page n of the prologue: the film's scenes first, then How to play, the case in miniature, the advice and the papers; `done` opens the case. Each chapter
// opens with its title card, but not when turning back into it.
export function showPrologue(n = 0, done = finish, resume = false) {
  finish = done;
  const story = (from) => playFilm(SCENES, { from, done: () => lesson(), label: "The story", skip: "Skip to How to play", cls: "story", resume,
    bar: chapterBar(0) });
  if (n === 0 && !resume) {
    showChapterCard(0, { promise: "How the case began", go: () => story(0), skip: "Skip to How to play", skipTo: () => lesson() });
  } else if (n < SCENES.length) story(n);
  else showPaper(n - SCENES.length);
}

// The case papers, the last chapter: their title card, then the first page; after the last page, the case.
const start = () => (ui.S?.history.length ? "Back to the case" : "Start the case");
function papers() {
  showChapterCard(4, { promise: "The telegram, the guests and the crimes", go: () => showPaper(0), back: () => advice(true),
    skip: start(), skipTo: () => finish() });
}

function showPaper(i) {
  paper = Math.max(0, Math.min(PAPERS.length - 1, i));
  const [html, label] = PAPERS[paper], next = paper === PAPERS.length - 1 ? `${start()} →` : label;
  const dots = PAPERS.map((_, j) => `<i class="${j === paper ? "on" : ""}"></i>`).join("");
  $("modal").innerHTML = `<div class="prologue paper" role="dialog" aria-modal="true" aria-label="Case briefing">
    <div class="paper-chapters">${chapterBar(4)}<button class="ch-skip" id="paperSkip">${start()} ⏭</button></div>
    ${html()}
    <div class="nav">
      <button class="btn" data-action="prologue-back">← Back</button>
      <span class="dots">${dots}</span>
      <button class="btn primary" data-action="prologue-next" id="prologueNext">${next}</button>
    </div></div>`;
  $("modal").classList.add("open");
  $("paperSkip").onclick = () => finish();
  $("prologueNext").focus({ preventScroll: true });
}

// After the story, the lesson, the case in miniature and then the advice, then the case papers; Back from the first
// scene of any returns to what came before.
function lesson(last = false) {
  showHowTo(() => mini(), { back: () => showPrologue(SCENES.length - 1, finish, true), last, chained: true });
}
const mini = (last = false) => showMiniCase(() => advice(), { back: () => lesson(true), last, chained: true });
const advice = (last = false) => showTips(papers, () => mini(true), { chained: true, skip: "Skip to the case papers", last });

// The chapter bar's jumps: to the start of any chapter, its title card first.
onChapter((i) => [() => showPrologue(0), () => lesson(), () => mini(), () => advice(), papers][i]());

// ← / → on the papers; turning back from the first one returns to the advice's last tip, and on from the last one
// opens the case
export const nextPage = () => (paper === PAPERS.length - 1 ? finish() : showPaper(paper + 1));
export const previousPage = () => (paper ? showPaper(paper - 1) : advice(true));
