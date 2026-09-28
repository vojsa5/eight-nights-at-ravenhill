// The prologue: a short illustrated film of how the case began, then the telegram and the conspiracy's
// crimes, then how to play (the How to play film, howto.js) and last Inspector Hollis's advice (the Advice
// film, tips.js). Shown at the start of every case, and from the Story button.
import { playFilm } from "./film.js";
import { portrait } from "./portrait.js";
import { CRIMES, ROLES } from "./roles.js";
import { $, ui } from "./state.js";
import { load, store } from "./storage.js";
import { showHowTo } from "./howto.js";
import { showTips } from "./tips.js";

// The film: [picture, where the camera slowly moves in, caption]
const SCENES = [
  ["story/manor", "50% 45%", "Yorkshire, December 1924. Ravenhill Manor stands alone on the moor, and the first snow of the winter is beginning to fall."],
  ["story/ledger", "30% 55%", "For a year Lord Edmund Ravenhill had watched his fortune drain away and his secrets reach the wrong ears. By the autumn he knew: people he had welcomed at his own table were robbing him, lying to him and spying on him."],
  ["story/will", "40% 70%", "He wrote a new will that cut every one of them out, and a letter to Scotland Yard naming them all. Both went into the library safe. His solicitor would witness the will on Monday."],
  ["story/birthday", "50% 40%", "Then he invited them all to Ravenhill for his seventieth birthday. Sixteen guests sat down to dinner: an heiress, a banker, a surgeon, a famous actress, his old butler and cook, a spirit medium, and nine more. Half of them were in it together."],
  ["story/nightcap", "40% 60%", "At eleven his nightcap was carried up to the library. On the way, a gloved hand tipped a small vial into the brandy while someone kept watch at the door."],
  ["story/library", "45% 70%", "At a quarter past eleven the butler found him in his armchair by the fire. The glass had rolled across the rug. The safe stood open, and the new will was gone."],
  ["story/telephone", "40% 65%", "The butler telephoned Scotland Yard. Minutes later the line went dead, and by midnight the snow had closed every road off the moor."],
  ["story/train", "75% 70%", "The Yard had sent you up to see Lord Edmund on Monday. You came early, on the last train before the snow, and arrived an hour too late. Now you are the only detective in the house, and nobody can leave."],
];

const telegram = () => `<div class="kicker">Case no. 1924/17 · Ravenhill Manor, Yorkshire</div>
    <h2>Eight Nights at Ravenhill</h2>
    <div class="telegram">
      <div class="head"><span>GPO TELEGRAM · URGENT</span><span>RAVENHILL 23:48</span></div>
      TO THE INSPECTOR AT RAVENHILL MANOR STOP LORD EDMUND RAVENHILL FOUND DEAD IN HIS LIBRARY STOP POISON STOP
      NEW WILL MISSING FROM THE SAFE STOP ROADS CLOSED BY SNOW STOP SIXTEEN GUESTS IN THE HOUSE STOP
      HALF OF THEM ARE IN IT TOGETHER STOP THAW EXPECTED IN EIGHT NIGHTS STOP TRUST NO ONE STOP
      <div class="sig">Hollis, Scotland Yard</div>
    </div>
    <p>Eight of the guests are exactly what they seem. Each of the other eight did Lord Edmund a wrong, and
    together they killed him. When the thaw comes, every guest must either be cleared or held for the magistrate.</p>`;

// One entry per conspirator role in this case (the full list before a case has loaded).
function dossier() {
  const roster = ui.S ? ui.S.roster : Object.keys(ROLES);
  const bad = roster.filter((r) => ROLES[r][0] === "bad");
  const entries = [...new Set(bad)].map((r) => {
    const n = bad.filter((x) => x === r).length;
    return `<div class="suspect">${portrait(r)}<div><b>${n > 1 ? `The ${r}s (${n})` : `The ${r}`}</b>${CRIMES[r]}</div></div>`;
  });
  return `<div class="kicker">From Inspector Hollis's file</div>
    <h2>The conspiracy</h2>
    <p>The Yard knows what was done to Lord Edmund, but not by whom. Every one of these wrongs was done by a
    guest now snowed in with you, and each of them is reason enough to arrest them.</p>
    <div class="dossier">${entries.join("")}</div>
    <p>Nobody wears their role on their sleeve. You learn who held which one only when you clear or arrest them.</p>`;
}

// The case papers after the film: [page, label of the button that turns to the next one]; the last one
// turns to the lesson
const PAPERS = [[telegram, "The conspiracy →"], [dossier, "How to play →"]];

let paper = 0;
let finish = () => {};  // what follows the advice, when it ends or is skipped: the case (the callers pass it)

// Every case opens with the prologue, once: reloading the page in the middle of a case does not replay it.
// Returns whether it is now showing.
export function maybeShowPrologue(done) {
  const key = "story-" + ui.S.id;
  if (ui.S.history.length || load(key)) return false;
  store(key, "1");
  showPrologue(0, done);
  return true;
}

// Page n of the prologue: the film's scenes first, then the papers, then the advice; `done` opens the case.
export function showPrologue(n = 0, done = finish) {
  finish = done;
  if (n < SCENES.length) playFilm(SCENES, { from: n, done: () => showPaper(0), label: "The story", skip: "Skip to the case papers", cls: "story" });
  else showPaper(n - SCENES.length);
}

function showPaper(i) {
  paper = Math.max(0, Math.min(PAPERS.length - 1, i));
  const [html, next] = PAPERS[paper];
  const dots = PAPERS.map((_, j) => `<i class="${j === paper ? "on" : ""}"></i>`).join("");
  $("modal").innerHTML = `<div class="prologue paper" role="dialog" aria-modal="true" aria-label="Case briefing">
    ${html()}
    <div class="nav">
      <button class="btn" data-action="prologue-back">← Back</button>
      <span class="dots">${dots}</span>
      <button class="btn primary" data-action="prologue-next" id="prologueNext">${next}</button>
    </div></div>`;
  $("modal").classList.add("open");
  $("prologueNext").focus();
}

// After the papers, the lesson and then the advice; Back from the first scene of either returns to what came before.
function lesson(last = false) {
  showHowTo(advice, { back: () => showPaper(PAPERS.length - 1), last });
}
const advice = () => showTips(finish, () => lesson(true));

// ← / → on the papers; turning back from the first one returns to the film's last scene, and on from the
// last one plays the lesson
export const nextPage = () => (paper === PAPERS.length - 1 ? lesson() : showPaper(paper + 1));
export const previousPage = () => (paper ? showPaper(paper - 1) : showPrologue(SCENES.length - 1));
