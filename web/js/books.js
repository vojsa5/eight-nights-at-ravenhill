// The rewards: every role in the house hides a book in its guest's room (the covers are in web/art/books/), and
// a right clear or arrest wins it. A mistake loses that guest's book, and which book stays sealed with their role
// until the case is closed. Of a pair, the first guest rightly found holds the first book (confidant-a, lover-a).
// `size` is how large a book stands on the Rewards shelf beside the others (1 when left out): manga small, hardbacks large.

export const BOOKS = {
  sleuth: { title: "The Mysterious Affair at Styles", author: "Agatha Christie", covers: ["the-mysterious-affair-at-styles"],
    line: "Poirot's first case: poison at an English country house." },
  witness: { title: "Trace: Vzpomínky forenzního specialisty 1", author: "Kei Koga", covers: ["trace-1"], size: .88,
    line: "A forensic scientist reads the traces nobody else noticed." },
  reporter: { title: "Butter", author: "Asako Yuzuki", covers: ["butter"],
    line: "A journalist, a woman convicted of murder, and the recipes between them." },
  constable: { title: "Guards! Guards!", author: "Terry Pratchett", covers: ["guards-guards"],
    line: "The Night Watch of Ankh-Morpork against a secret brotherhood and its dragon." },
  colonel: { title: "The Song of Achilles", author: "Madeline Miller", covers: ["the-song-of-achilles"],
    line: "Troy, Achilles and Patroclus. Achilles never forgot an insult either." },
  "confidant-a": { title: "Ella Minnow Pea", author: "Mark Dunn", covers: ["ella-minnow-pea"],
    line: "A novel in letters, written while an island bans the alphabet one letter at a time." },
  "confidant-b": { title: "We Burned So Bright", author: "TJ Klune", covers: ["we-burned-so-bright"],
    line: "Where will the end of the world take you?" },
  possessed: { title: "We Mostly Come Out at Night", author: "edited by Rob Costello", covers: ["we-mostly-come-out-at-night"],
    line: "Fifteen queer tales of monsters, angels and other creatures." },
  "lover-a": { title: "Queer Villains of Myth and Legend", author: "Dan Jones", covers: ["queer-villains-of-myth-and-legend"], size: 1.1,
    line: "A revelry of queer rogues and outlaws through the ages." },
  "lover-b": { title: "Bury Your Gays", author: "Chuck Tingle", covers: ["bury-your-gays"],
    line: "You can't make a killing in Hollywood." },
  eavesdropper: { title: "Strange Houses", author: "Uketsu", covers: ["strange-houses"],
    line: "A floor plan with a room that should not be there." },
  paymaster: { title: "Raising Steam", author: "Terry Pratchett", covers: ["raising-steam"],
    line: "The railway comes to Ankh-Morpork, and somebody has to pay for it." },
  grifter: { title: "Better the Devil", author: "Erik J. Brown", covers: ["better-the-devil"],
    line: "Steal his name. Solve his murder?" },
  forger: { title: "Hazelthorn", author: "C.G. Drews", covers: ["hazelthorn"],
    line: "There's something at the bottom of the garden." },
  hypnotist: { title: "It's Not a Cult", author: "Joey Batey", covers: ["its-not-a-cult"], size: 1.08,
    line: "They'd die for you. They'd kill for you." },
  lunatic: { title: "Noc oživlých koček 1 and Gannibal 5", author: "Hawkman and Mecha-Roots; Masaaki Ninomija",
    covers: ["noc-ozivlych-kocek-1", "gannibal-5"], size: .88,
    line: "Two at once, as befits the Lunatic: a night when everyone turns into a cat, and a village with an appetite." },
};

// The book of each role's slot in this case, handed out in the order `roles` come: a pair's first guest gets -a.
function slotter(S) {
  const used = {};
  return (role) => {
    const i = used[role] = (used[role] ?? -1) + 1;
    const pair = S.roster.filter((r) => r === role).length > 1;
    return BOOKS[role.toLowerCase() + (pair ? "-" + "ab"[i] : "")];
  };
}

// This case's books: those won (in the order they were won), those lost (known once the case is closed), how many
// were lost to mistakes so far and how many the house holds in all.
export function shelf(S) {
  const book = slotter(S);
  const won = S.history.filter((h) => h.ok).map((h) => ({ h, book: book(h.role) })).filter((x) => x.book);
  const lost = S.finished ? S.history.filter((h) => !h.ok).map((h) => ({ h, book: book(S.chars[h.char].role) })).filter((x) => x.book) : [];
  const all = slotter(S);
  return { won, lost, mistakes: S.history.filter((h) => !h.ok).length, total: S.roster.filter((r) => all(r)).length };
}

// The book a decision won, if any.
export const bookFor = (S, h) => (shelf(S).won.find((x) => x.h.char === h.char) || {}).book;

export const coversHtml = (book) => `<span class="covers${book.covers.length > 1 ? " two" : ""}">${book.covers
  .map((c) => `<img src="art/books/${c}.jpg" alt="" loading="lazy">`).join("")}</span>`;
