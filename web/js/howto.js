// How to play: the game's mechanics as a film, a scene for each part of a case, each with an exhibit pinned
// over the picture, drawn with the board's own marks. The How to play button plays it, and so does the
// prologue, between the case papers and Inspector Hollis's advice.
import { RANKS, noteSvg } from "./board.js";
import { playFilm } from "./film.js";
import { GROUPS, LAST_NIGHT } from "./events.js";
import { TRACES } from "./night.js";
import { portrait } from "./portrait.js";
import { isBadRole, title } from "./roles.js";
import { ui } from "./state.js";

const scene = (pic, focus, heading, text, exhibit) => [pic, focus, `<span class="film-title">${heading}</span>${text}`, exhibit];
const exhibit = (i, html, cls = "") => `<div class="exhibit ${cls}"><span class="ex-label">Exhibit ${"ABCDEFGHIJK"[i]}</span>${html}</div>`;
const thumb = (c) => `<span class="ex-thumb">${portrait(c.name, "", c.portrait)}</span>`;

function scenes() {
  const S = ui.S, n = S.chars.length, guilty = S.roster.filter(isBadRole).length;
  const signs = [...new Set(S.roster)].filter((r) => TRACES[r]).slice(0, 2)
    .map((r) => `<div class="signcard"><span class="si">${TRACES[r][0]}</span><b>${TRACES[r][2]}</b><span>${title(r)}</span></div>`).join("");
  const nobody = `<span class="ex-thumb">${portrait("A guest", "", "unknown")}</span>`;  // examples name no real guest
  const notes = [1, 2].map((m) => `<span class="smp-polaroid"><span class="scrawl">${noteSvg(m)}</span></span>`).join("");
  const tabs = ["Testimony", "Theory", "Case file", "Roles", "Events", "Rules"].map((t) => `<span>${t}</span>`).join("");
  const ranks = RANKS.map(([share], i) => {
    const lo = Math.ceil(share * 2 * S.rounds), hi = i ? Math.ceil(RANKS[i - 1][0] * 2 * S.rounds) - 1 : 2 * S.rounds;
    return `<li class="r${i}"><b>${lo === hi ? lo : `${lo}–${hi}`}</b></li>`;
  }).join("");
  const ex = [
    `<div class="ex-guests">${S.chars.slice(0, 6).map(thumb).join("")}</div><p><b>${n}</b> guests · <b>${guilty}</b> of them guilty</p>`,
    `<ul class="ex-list"><li><i>🔍</i>looks innocent or guilty?</li><li><i>🎭</i>an exact role</li><li><i>🖋</i>forged, overheard, bought</li></ul>`,
    `${signs}<p class="ex-clue"><i>👣</i>two guests: at least one is guilty</p>`,
    `<div class="ex-row"><span class="smp-badge"><span class="s"><i>✓</i>3</span><span class="e"><i>✕</i>1</span></span>
      <svg class="smp-strings" viewBox="0 0 92 40" aria-hidden="true"><path class="out e" d="M6 8 Q46 30 86 8"/><path class="out s" d="M6 20 Q46 40 86 20"/>
      <path class="in e" d="M6 32 Q46 46 86 32"/></svg></div>`,
    `<div class="ex-stamps"><span class="ex-stamp cleared">Cleared</span><b>+1</b><span class="ex-stamp arrested">Arrested</span><b>+1</b></div>`,
    `<div class="ex-search"><span class="ex-role found">Forger</span><small>a right call</small><span class="ex-role sealed">sealed</span><small>a mistake</small></div>`,
    `<div class="ex-kinds">${GROUPS.map((g) => `<span title="${g.name}">${g.icon}</span>`).join("")}</div><p>nights I–IV, then again V–VIII</p>`,
    `<div class="ex-row">${notes}<span class="smp-piles"><i class="g">3</i><i class="u">9</i><i class="n">2</i></span></div>`,
    `<div class="ex-tabs">${tabs}</div>`,
    `<div class="ex-guests two">${nobody}<b>?</b>${nobody}</div><p>accuse one, free the other</p>`,
    `<ol class="rankladder ex-ranks">${ranks}</ol>`,
  ].map((html, i) => exhibit(i, html));
  return [
    scene("story/birthday", "50% 40%", "Sixteen guests", `${n} guests are snowed in at Ravenhill. ${n - guilty} of them are innocent. The other ${guilty}
      killed Lord Edmund together, and each hides behind a role. Over ${S.rounds} nights you must clear the innocent and arrest the guilty.`, ex[0]),
    scene("story/manor", "50% 45%", "Night", `Every night the guests investigate in secret. Some can tell whether a guest looks guilty, some uncover
      an exact role, while the conspirators forge evidence, listen at keyholes and buy testimony. You never see what anyone learns.`, ex[1]),
    scene("events/footprints", "40% 60%", "Dawn", `At dawn the house shows what the night left behind. A sign stops once its conspirator
      is out of the house. On some mornings you also get a clue of your own: an open notebook, or footprints in the snow.`, ex[2]),
    scene("events/inquest", "50% 50%", "Testimony", `Then every guest still in the house names one guest to clear and one to arrest. It is all
      you have, and the guilty lie. On the board, point at a photograph to see its strings: red to arrest, green to clear.`, ex[3]),
    scene("verdict/clear", "50% 55%", "Clear one, arrest one", `Every day you clear one guest, +1 if they are innocent, and arrest one, +1 if
      they are guilty. The cleared wait in the morning room, the arrested in the wine cellar, and neither testifies again.`, ex[4]),
    scene("search/room", "50% 55%", "The search", `Then their room is searched. After a right call you learn who they really were, and so who
      told you the truth about them. After a mistake you learn only their side, and the role stays sealed until the thaw.`, ex[5]),
    scene("events/seance", "50% 50%", `${S.rounds} nights`, `Every night brings an event, in two rounds of four kinds: the guests learn something,
      you learn something, the testimony changes, the house goes quiet. Each night's card tells you what it brings.`, ex[6]),
    scene("story/ledger", "30% 55%", "Your notes", `Keep track as you go. Click the small circle on a photograph to mark a guest guilty or
      innocent. The Theory tab sorts your notes into piles, counts the conspirators still hidden and lets you guess roles.`, ex[7]),
    scene("story/will", "40% 70%", "The case folder", `The folder at the right edge of the desk holds the case: every tip in Testimony, your
      piles in Theory, your decisions and clues in the Case file, then the Roles in the house, the Events and the Rules.`, ex[8]),
    scene("finale/drawing-room", "50% 50%", "The drawing room", `On the last night two guests remain, and nobody advises any more.
      ${LAST_NIGHT[3]}`, ex[9]),
    scene("finale/thaw", "50% 55%", "The verdict", `When the thaw comes, Scotland Yard reads your score: ${2 * S.rounds} decisions, a point
      for each one you got right. Get all ${2 * S.rounds}, and the Yard would like a word about a job.`, ex[10]),
  ];
}

// `done` runs after the last scene, or on Skip; `back`, if given, is where Back from the first scene goes, and
// `last` starts on the last scene (coming back from what follows).
export function showHowTo(done, { back, last = false } = {}) {
  const list = scenes();
  playFilm(list, { from: last ? list.length - 1 : 0, done, back, label: "How to play", skip: "Skip the lesson", cls: "howto" });
}
