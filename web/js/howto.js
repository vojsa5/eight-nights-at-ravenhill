// How to play: the game's mechanics as a film, a scene for each part of a case, each with an exhibit pinned
// over the picture, drawn with the board's own marks. The How to play button plays it, and so does the
// prologue, between the story and the case in miniature (minisim.js).
import { RANKS, noteSvg } from "./board.js";
import { chapterBar, showChapterCard } from "./chapters.js";
import { playFilm } from "./film.js";
import { EVENTS, HALF, LAST_NIGHT, nightEvent } from "./events.js";
import { TRACES } from "./night.js";
import { portrait } from "./portrait.js";
import { isBadRole, title } from "./roles.js";
import { ui } from "./state.js";

const scene = (pic, focus, heading, text, exhibit) => [pic, focus, `<span class="film-title">${heading}</span>${text}`, exhibit];
export const exhibit = (i, html, cls = "") => `<div class="exhibit ${cls}"><span class="ex-label">Exhibit ${"ABCDEFGHIJK"[i]}</span>${html}</div>`;
const thumb = (c, i) => `<span class="ex-thumb" style="--i:${i}">${portrait(c.name, "", c.portrait)}</span>`;
// a number that counts up from nought as it comes in (howto.css .ex-count)
const count = (v, tag = "b", cls = "") => `<${tag} class="ex-count ${cls}" style="--n:${v}">${v}</${tag}>`;

function scenes() {
  const S = ui.S, n = S.chars.length, guilty = S.roster.filter(isBadRole).length;
  const signs = [...new Set(S.roster)].filter((r) => TRACES[r]).slice(0, 2)
    .map((r) => `<div class="signcard"><span class="si">${TRACES[r][0]}</span><b>${TRACES[r][2]}</b><span>${title(r)}</span></div>`).join("");
  const notes = [1, 2].map((m) => `<span class="smp-polaroid"><span class="scrawl">${noteSvg(m)}</span></span>`).join("");
  const nightIcon = (r, e = nightEvent(S, r)) => (e ? `<span title="${e}" style="--i:${r - 1}">${EVENTS[e][0]}</span>`
    : `<span title="The drawing room" style="--i:${r - 1}">${LAST_NIGHT[0]}</span>`);
  const tabs =["Testimony", "Theory", "Case file", "Rewards", "Roles", "Events", "Rules"].map((t, i) => `<span style="--i:${i}">${t}</span>`).join("");
  const ranks = RANKS.map(([share], i) => {
    const lo = Math.ceil(share * 2 * S.rounds), hi = i ? Math.ceil(RANKS[i - 1][0] * 2 * S.rounds) - 1 : 2 * S.rounds;
    return `<li class="r${i}"><b>${lo === hi ? lo : `${lo}–${hi}`}</b></li>`;
  }).join("");
  const ex = [
    `<div class="ex-guests">${S.chars.slice(0, 6).map(thumb).join("")}</div><p>${count(n)} guests · <span class="ex-guilty"><b>${guilty}</b> of them guilty</span></p>`,
    `<ul class="ex-list"><li><i>🔍</i>looks innocent or guilty?</li><li><i>🎭</i>an exact role</li><li><i>🖋</i>forged, overheard, bought</li></ul>`,
    `${signs}<p class="ex-clue"><i>👣</i>two guests: at least one is guilty</p>`,
    `<div class="ex-row"><span class="smp-badge"><span class="s"><i>✓</i>3</span><span class="e"><i>✕</i>1</span></span>
      <svg class="smp-strings" viewBox="0 0 92 40" aria-hidden="true"><path class="out e" d="M6 8 Q46 30 86 8"/><path class="out s" d="M6 20 Q46 40 86 20"/>
      <path class="in e" d="M6 32 Q46 46 86 32"/></svg></div>`,
    `${[1, HALF + 1].map((from) => `<div class="ex-kinds">${Array.from({ length: HALF }, (_, i) => nightIcon(from + i)).join("")}</div>`)
      .join("")}<p>a different event every day</p>`,
    `<div class="ex-tabs">${tabs}</div>`,
    `<div class="ex-row">${notes}<span class="smp-piles">${count(3, "i", "g")}${count(9, "i", "u")}${count(2, "i", "n")}</span></div>`,
    `<ol class="rankladder ex-ranks">${ranks}</ol>`,
  ].map((html, i) => exhibit(i, html));
  return [
    scene("story/birthday", "50% 40%", "Sixteen guests", `${n} guests are snowed in at Ravenhill. ${n - guilty} of them are innocent. Each of the other ${guilty}
      did Lord Edmund a wrong on the night he died, and each hides behind a role. Over ${S.rounds} nights you must clear the innocent and arrest the guilty.`, ex[0]),
    scene("story/manor", "50% 45%", "Night", `Every night some of the guests investigate in secret. You never see what they learn.`, ex[1]),
    scene("events/footprints", "40% 60%", "Dawn", `At dawn the house shows what the night left behind. A sign stops once its culprit
      is out of the house. Some mornings you also get a clue of your own, such as an open notebook or footprints in the snow.`, ex[2]),
    scene("events/inquest", "50% 50%", "Testimony", `Each morning, every guest still in the house tells you whom they would clear and whom they
      would arrest. What they say depends on their role, though in general you can trust the innocent more. This testimony is most of your evidence. Point at a
      photograph on the board to see it as strings: green for clear, red for arrest.`, ex[3]),
    scene("events/seance", "50% 50%", `${S.rounds} days`, `Every day brings an event of its own, and the day's card tells you what it brings.`, ex[4]),
    scene("story/will", "40% 70%", "The case folder", `The folder at the right edge of the desk holds the case: every tip in Testimony, your
      piles in Theory, your decisions and clues in the Case file, the books you have found in Rewards, then the Roles in
      the house, the Events and the Rules.`, ex[5]),
    scene("story/ledger", "30% 55%", "Your notes", `Keep track as you go. Click the small circle on a photograph to mark a guest guilty or
      innocent. The Theory tab sorts your notes into piles, counts the guilty still hidden and lets you guess roles.`, ex[6]),
    scene("finale/thaw", "50% 55%", "The verdict", `When the thaw comes, Scotland Yard reads your score: ${2 * S.rounds} decisions, a point
      for each one you got right. Get all ${2 * S.rounds}, and the Yard would like a word about a job.`, ex[7]),
  ];
}

// `done` runs after the last scene, or on Skip; `back`, if given, is where Back from the first scene goes, and
// `last` starts on the last scene (coming back from what follows), without the chapter's title card; `chained`
// when it is the second of the prologue's chapters (chapters.js), which go on to the case in miniature.
export function showHowTo(done, { back, last = false, chained = false } = {}) {
  const list = scenes(), skip = chained ? "Skip to the mini case" : "Skip the lesson";
  const play = () => playFilm(list, { from: last ? list.length - 1 : 0, done, back, label: "How to play", skip, cls: "howto", bar: chapterBar(1, !chained) });
  if (last) play();
  else showChapterCard(1, { promise: "How the game works", go: play, back, skip, skipTo: done, alone: !chained });
}
