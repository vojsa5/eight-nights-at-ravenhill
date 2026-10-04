// Advice for the player, as a film with one tip per scene: the Advice button plays it, and so does the end
// of the prologue. [heading, advice, picture under art/ for the film]
import { chapterBar, showChapterCard, word } from "./chapters.js";
import { playFilm } from "./film.js";

export const TIPS = [
  ["Know the roles", "Every role gives itself away in its own way. Read the Roles tab carefully: what each one knows from the start, does each night and says each morning.", "story/birthday"],
  ["Catch some on the first morning", "Read the very first testimony closely. A guest who advises clearing and arresting the same guest can only be the Lunatic: arrest them on night I. Two guests who clear each other are usually the two Confidants, each the other's alibi, though now and then they are two guilty guests covering for each other.", "search/lunatic"],
  ["Keep your best witnesses", "Clearing a guest takes them out of the inquiry, and their testimony goes with them. Once you trust a guest who can investigate, keep them in the house and clear them late.", "search/sleuth"],
  ["Arrest the dangerous ones early", "Some of the guilty do harm every night they stay in the house. The sooner they are in the cellar, the cleaner the testimony gets.", "verdict/arrest"],
  ["Read the night's traces", "Every morning's card lists what the night left behind: ink for the Forger, a glass at the wall for the Eavesdropper, a sleepwalker for the Hypnotist, banknotes for the Paymaster, a stacked deck for the Grifter, odd goings-on for the Lunatic, whispers in the night while both Lovers are free.", "story/library"],
];

// Every tip as a scene of its own, after the chapter's title card; `done` runs after the last one, or on Skip, and
// `back` (if given) is where Back from the first tip goes. `chained` when it is the third of the prologue's chapters
// (chapters.js), whose Skip says where it goes (`skip`).
export function showTips(done, back, { chained = false, skip = "Close the advice", last = false } = {}) {
  const scenes = TIPS.map(([h, t, pic]) => [pic, "50% 55%", `<span class="film-title">${h}</span>${t}`]);
  const play = () => playFilm(scenes, { from: last ? scenes.length - 1 : 0, done, back, label: "Advice", skip, cls: "tips-film",
    bar: chapterBar(2, !chained) });
  if (last) return play();  // turning back into the advice from the case papers
  showChapterCard(2, { promise: `${word(TIPS.length)[0].toUpperCase()}${word(TIPS.length).slice(1)} tips, one at a time`, go: play, back, skip, skipTo: done,
    alone: !chained });
}
