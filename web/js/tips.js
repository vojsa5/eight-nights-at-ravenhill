// Advice for the player, as a film with one tip per scene: the Advice button plays it, and so does the end
// of the prologue. [heading, advice, picture under art/ for the film]
import { playFilm } from "./film.js";

export const TIPS = [
  ["Know the roles", "Every role gives itself away in its own way. Read the Roles tab carefully: what each one knows from the start, does each night and says each morning.", "story/birthday"],
  ["Keep your best witnesses", "Clearing a guest takes them out of the inquiry, and their testimony goes with them. Once you trust a guest who can investigate, keep them in the house and clear them late.", "search/sleuth"],
  ["Arrest the dangerous ones early", "Some conspirators do harm every night they stay in the house. The sooner they are in the cellar, the cleaner the testimony gets.", "verdict/arrest"],
  ["Read the night's traces", "Every morning's card lists what the night left behind: ink for the Forger, a glass at the wall for the Eavesdropper, a sleepwalker for the Hypnotist, banknotes for the Paymaster, a stacked deck for the Grifter, odd goings-on for the Lunatic, whispers in the night while both Lovers are free.", "story/library"],
];

// Every tip as a scene of its own; `done` runs after the last one, or on Skip, and `back` (if given) is where
// Back from the first tip goes.
export function showTips(done, back) {
  const scenes = TIPS.map(([h, t, pic]) => [pic, "50% 55%", `<span class="film-title">${h}</span>${t}`]);
  playFilm(scenes, { done, back, label: "Advice", skip: "Close the advice", cls: "tips-film" });
}
