// Role texts shown in the game: side, what the role does step by step, and a line of flavour for the reveal.
// The steps: `start` (what they know from the start of the case), `night` (their night's work), `day` (how they
// advise each morning) and `seen` (how investigations see them, only where it differs from the truth); the
// Roles tab shows them on each role's card (stepsHtml). The engine's behaviour lives in ravenhill/abilities.py
// and ravenhill/advice.py; keep the steps in line with it.
// "good" is shown as innocent, "bad" as guilty (one of the culprits of the birthday night).

export const ROLES = {
  Sleuth: ["good", { night: "Checks one guest: do they look innocent or guilty? Starts with whoever accused them.", day: "Honest: clears whoever they trust most, arrests whoever they suspect most." },
    "Nothing escapes a patient eye."],
  Witness: ["good", { start: "Saw one of the guilty slip past the library door on the birthday night, and knows who.", day: "Too frightened to accuse anyone they suspect: advises clearing the guest they trust most, and arresting the next one they trust, someone they believe is innocent." },
    "Saw too much. Says too little."],
  Housekeeper: ["good", { night: "Learns how many of the two guests seated beside them look guilty: none, one or both.", day: "Honest: clears whoever they trust most, arrests whoever they suspect most." },
    "The walls are thin, and the housekeeper hears everything."],
  Reporter: ["good", { night: "Uncovers one guest's exact role. Not even the Grifter's disguise fools them.", day: "Honest: clears whoever they trust most, arrests whoever they suspect most." },
    "Every story has a source. Every source has a price."],
  Photographer: ["good", { night: "Learns whether two guests are on the same side.", day: "Honest: clears whoever they trust most, arrests whoever they suspect most." },
    "The camera never lies. Mostly."],
  Confidant: ["good", { start: "Spent the whole night of the murder with the other Confidant, so knows who they are, and that they are innocent.",
    day: "Vouches for that alibi: advises clearing the other Confidant, and never arresting them. Otherwise honest. A bribed or hypnotised Confidant says what they must, though." },
    "One long game of chess, one alibi for two."],
  Colonel: ["good", { day: "Repays yesterday's favours and slights: advises clearing whoever advised clearing them, and arresting whoever advised arresting them. With nothing to repay, honest." },
    "A gentleman never forgets a debt, or an insult."],
  Constable: ["good", { night: "Checks one guest, innocent or guilty, and passes the result on to the guest they trust most. Early on, that may be the wrong person.", day: "Honest: clears whoever they trust most, arrests whoever they suspect most." },
    "Evidence travels. So do mistakes."],
  Novelist: ["good", { day: "Hungry for drama: advises clearing whoever was most accused the day before, and arresting someone at random." },
    "The best plots need a villain. Any villain will do."],
  Possessed: ["good", { day: "Honest until the Séance. From the Séance on, Lord Edmund's restless spirit speaks through them, and the dead speak backwards: they advise clearing whoever they suspect most and arresting whoever they trust most." },
    "Something came back from the Séance with them."],
  Guest: ["good", { night: "Learns nothing.", day: "Honest, but with nothing to go on it is mostly guesswork." },
    "Here for the champagne, not the mystery."],
  Amateur: ["good", { start: "Believes they are the Sleuth.", night: "Checks one guest, like the Sleuth, but every result is a coin toss.", day: "Honest about those findings." },
    "Has read every detective novel. It shows."],
  Recluse: ["good", { day: "Honest: clears whoever they trust most, arrests whoever they suspect most.", seen: "Looks guilty to every investigation, so is often wrongly accused." },
    "Kept to the east wing for twenty years. Everyone assumes the worst."],
  Thug: ["bad", { night: "Checks one guest: guilty or not? That is how the guilty find out who else has something to hide.", day: "Lies to save their own skin: accuses whoever looks innocent, above all their own accusers, and clears any guest they know to be guilty." },
    "Does the heavy lifting and asks no questions."],
  Eavesdropper: ["bad", { night: "Listens at the door of whoever's advice has looked most reliable, and learns whatever they learned that night, even a forged result.", day: "Lies to save their own skin: accuses whoever looks innocent, above all their own accusers, and clears any guest they know to be guilty." },
    "Every keyhole tells a story."],
  Lover: ["bad", { start: "Knows who the other Lover is.", night: "Checks one guest: guilty or not? The two Lovers tell each other everything they learn and agree on what to say in the morning.", day: "Lies like any guilty guest, but never names the other Lover, to clear or to arrest. On a day with both tips, the two Lovers share at least one. A bribed or hypnotised Lover says what they must, though." },
    "A secret affair is the best alibi."],
  Paymaster: ["bad", { night: "From night II, bribes one guest: whoever accused the Paymaster the day before, otherwise whoever looks most reliable.", day: "Lies. And the guest they bribed advises clearing the Paymaster next morning." },
    "Every man has his price. Most come cheap."],
  Grifter: ["bad", { day: "Lies to save their own skin: accuses whoever looks innocent, above all their own accusers, and clears any guest they know to be guilty.", seen: "Looks innocent to the innocent and like a fellow culprit to the guilty. Only the Reporter sees the truth, though the Witness may have seen them on the birthday night." },
    "Everyone's old friend. Nobody's."],
  Copycat: ["bad", { night: "Checks one guest: guilty or not?", day: "Repeats yesterday's advice of whoever looks most reliable, but clears a guest it knows to be guilty instead when it knows one, and never accuses one." },
    "Imitation is the sincerest form of deception."],
  Mastermind: ["bad", { night: "Checks one guest: guilty or not?", day: "Lies to save their own skin: accuses whoever looks innocent, above all their own accusers, and clears any guest they know to be guilty.", seen: "Looks innocent to the Sleuth." },
    "Always three moves ahead."],
  Forger: ["bad", { night: "Spoils one guest's investigation, so it gives a false result: whoever accused the Forger, otherwise whoever looks most reliable.", day: "Lies to save their own skin: accuses whoever looks innocent, above all their own accusers, and clears any guest they know to be guilty." },
    "A steady hand can rewrite the truth."],
  Hypnotist: ["bad", { night: "From night II, hypnotises one guest: whoever accused them, otherwise whoever looks most reliable, but never one of the two they named the day before. Learns everything that guest knows.", day: "Lies. And the hypnotised guest repeats, word for word, what the Hypnotist advised the day before. Nobody sees the trance." },
    "Look into my eyes. Now say what I said."],
  Mole: ["bad", { night: "Uncovers one guest's exact role.", day: "Honest on nights I–IV to win your trust, never betraying a guest it knows to be guilty. From night V, lies." },
    "Four nights a friend. On the fifth, the knife."],
  Framer: ["bad", { night: "Picks an innocent guest to frame, and a new one once they are gone.", day: "Advises arresting the framed guest every round, and clearing someone at random." },
    "Every crime needs a culprit. The Framer brings one."],
  Blackmailer: ["bad", { night: "Silences one guest, who gives no advice the next day: whoever accused the Blackmailer, otherwise whoever looks most reliable.", day: "Lies to save their own skin: accuses whoever looks innocent, above all their own accusers, and clears any guest they know to be guilty." },
    "Everybody has a secret worth keeping quiet about."],
  Lunatic: ["bad", { day: "Advises clearing and arresting the same guest, every round." },
    "Yes and no in the same breath."],
};

// What each guilty role did to Lord Edmund on his birthday night: the charge they are arrested for. Every crime
// is its own, done without knowing about the others; only the Lovers' killed him. Each reads after "who" (the
// ending writes "X was the Forger, who forged ..."). Shown in the case papers, on the reveal card, in the Roles tab and
// in the ending; story.js tells each one at length.
export const CRIMES = {
  Lover: "Poisoned Lord Edmund's nightcap with the other Lover, and of all that night's crimes only theirs killed him: one tipped the vial into the brandy at the library door while the other kept watch. He had found them out, and each swears the other was at their side all evening.",
  Eavesdropper: "Learnt the combination of Lord Edmund's safe by listening at the library door, and slipped away from the birthday dinner to burn the letter to Scotland Yard that named them, still sealed, and to empty his purse of gold sovereigns.",
  Paymaster: "Owed Lord Edmund more than they could ever repay. On the birthday night they paid the footman fifty pounds to look the other way at the study door, and cut from Lord Edmund's ledger every page of their debts.",
  Copycat: "Telephoned Lord Edmund's solicitor on the birthday night and, in Lord Edmund's own voice, called off Monday's signing of the new will.",
  Grifter: "Swindled Lord Edmund out of a fortune with shares in the Matabele Reef Gold Company, a Rhodesian mine that does not exist, and over the birthday port sold him ten thousand pounds' worth more.",
  Forger: "Forged a will in Lord Edmund's hand that leaves Ravenhill to them, and at ten past eleven crept into the library to swap it for the new one. They took the new will from beside a man they thought asleep, and fled at a step on the stairs with the forgery still in their pocket.",
  Hypnotist: "Put Lord Edmund into a trance after dinner with a swinging silver watch, and walked him down to the strongroom, where he handed over his late wife's pearls with his own hands. He came back to his guests remembering nothing.",
  Mole: "Opened Lord Edmund's letters for a year while he trusted them with everything, and on the birthday night lifted the seals on the letters he had left for the morning post and copied every word.",
  Lunatic: "Cut the telephone wire with the garden shears minutes after Scotland Yard was telephoned, sure that the wire was carrying tales of them to the asylum Lord Edmund had threatened them with. They have not told the same story twice since.",
  Thug: "Caught Lord Edmund alone on the terrace before his birthday dinner and knocked him down with a leather cosh, to settle an old score. Lord Edmund told his guests he had slipped on the ice.",
  Mastermind: "Planned the birthday night to the minute, and at a quarter to eleven swapped the Gainsborough in the long gallery for a copy. Nobody has noticed yet.",
  Framer: "Slipped the signet ring from Lord Edmund's finger with a warm handshake at the birthday toast, to plant it on a guest they hated.",
  Blackmailer: "Bled Lord Edmund for years over the letters he wrote as a young man, and at the birthday dinner slipped a note under his plate asking for five thousand pounds more.",
};

// Who each innocent role really is, shown on the reveal card and in the ending. Any guest can hold any role,
// so these never name a profession (the guest already has one).
export const TRUTHS = {
  Sleuth: "Lord Edmund took them into his confidence a month ago and asked them to keep an eye on his guests. Every night since the murder the Sleuth has gone on doing the job, a tick or a cross at a time.",
  Witness: "Was on the back stairs at a quarter past eleven and saw one of the guilty slip past the library door in the dark. Too frightened to say so, and right to be: whoever it was may well have seen them too.",
  Possessed: "Has always felt more in old houses than other people do. Perfectly sensible until the Séance; from then on Lord Edmund's restless spirit speaks through them, and every word comes out the wrong way round. Innocent all along, and they remember none of it.",
  Housekeeper: "Missed nothing at the long table, and heard every word said by the guests on either side.",
  Reporter: "Was writing up the birthday for the Yorkshire Post's society page, and found the story of the decade instead. Every secret in the house is in that notebook.",
  Photographer: "The camera went everywhere, and it saw who kept company with whom.",
  Confidant: "Played chess with the other Confidant in the smoking room from ten until the dawn, and neither left the other's sight all night: each is the other's alibi. They vouched for each other from the first morning, and they were right to.",
  Colonel: "Served beside Lord Edmund in South Africa long ago and once carried him, wounded, to a field hospital, and never forgets a favour or a slight. Gave advice accordingly, for better and for worse.",
  Constable: "Sworn in as a special constable by Lord Edmund himself a week before his birthday, and quietly passed every finding to the guest they trusted most.",
  Novelist: "Innocent, but unable to resist a good villain: always took the side of whoever stood most accused, just to see what would happen.",
  Guest: "Came for the birthday and the champagne, and has been guessing ever since.",
  Amateur: "Believed every hunch and thought themselves the Sleuth, but every clue in that notebook was guesswork.",
  Recluse: "Has not left the east wing in twenty years, which is exactly why every inquiry pointed at the Recluse.",
};

// What the search of each guest's room turns up (the picture is web/art/search/<role>.svg). The story
// after a correct clear or arrest shows it before the card names the role, and the ending shows it for
// the mistakes.
export const FOUND = {
  Sleuth: "Under the pillow lies a pocketbook: every guest's name in neat columns, and against each one a tick or a cross.",
  Witness: "Inside a shoe is a page torn from a diary: 'A quarter past eleven, on the back stairs. I saw who it was. God help me if they saw me.'",
  Hypnotist: "Across a playbill for 'The Great Marvello, Mesmerism Nightly' lies a silver pocket watch on a long chain.",
  Possessed: "On the dressing table lies a planchette from the Séance, its pointer snapped off, and the mirror beside it has been turned to face the wall.",
  Paymaster: "Inside a hollowed-out Bible lies a bundle of banknotes, and beside it a list of guests' names with a sum pencilled against each.",
  Housekeeper: "On the dressing table lies the seating plan for dinner, with the places on either side of this guest ringed in pencil, night after night.",
  Reporter: "In the suitcase are a portable typewriter, a press card from the Yorkshire Post and a notebook of names with a role written beside each.",
  Photographer: "In a hatbox are a folding camera and a stack of prints of guests together in corners where they thought nobody was looking.",
  Confidant: "On the dressing table lies a chess scoresheet in two hands, every move with the time beside it, from ten at night until the dawn.",
  Colonel: "In the top drawer are a campaign medal from South Africa and a small ledger of every kindness and every insult of the past week.",
  Constable: "In a coat pocket are a police whistle, a warrant card from the North Riding Constabulary and a letter from Lord Edmund asking for discretion.",
  Novelist: "On the desk sits a half-finished manuscript in which every guest at Ravenhill is murdered at least once.",
  Guest: "The room holds nothing but evening clothes and an empty bottle of Lord Edmund's champagne.",
  Amateur: "By the bed stands a pile of detective novels, heavily underlined, and a notebook of confident deductions, most of them wrong.",
  Recluse: "On the nightstand lie the key to the east wing and a candle burnt almost to nothing.",
  Thug: "In the toe of a riding boot is a leather cosh.",
  Eavesdropper: "On the nightstand, pressed to the wall, stands a drinking glass for listening through it, and on a cigarette paper beside it is the combination of Lord Edmund's safe.",
  Lover: "In the lining of a coat are a love letter signed with a single initial and an empty glass vial wrapped in a lace handkerchief.",
  Grifter: "Under the false bottom of a trunk lies a bundle of share certificates in the Matabele Reef Gold Company, the ink barely dry.",
  Copycat: "On the writing desk lie the solicitor's telephone number and pages of Lord Edmund's favourite phrases, written out again and again as if to learn them by heart.",
  Mastermind: "In a locked writing case is a timetable of the night of the murder, correct to the minute.",
  Forger: "Under the blotter lies sheet after sheet of Lord Edmund's signature, each one closer to the real thing than the last.",
  Mole: "In the writing case are a thin knife for lifting wax seals and copies of every letter Lord Edmund wrote this year.",
  Framer: "Sewn into the hem of a dressing gown is Lord Edmund's signet ring.",
  Blackmailer: "In a biscuit tin are a bundle of letters Lord Edmund wrote as a young man and a bank book full of his payments.",
  Lunatic: "On the windowsill lies a pair of garden shears with a length of telephone wire still caught in the blades.",
};

// Roles that have their own picture in web/art/search/; the others use search/room.
const SEARCH_ART = new Set(["Sleuth", "Witness", "Hypnotist", "Housekeeper", "Reporter", "Constable", "Colonel", "Confidant", "Possessed", "Novelist",
  "Lover", "Eavesdropper", "Paymaster", "Copycat", "Grifter", "Forger", "Mole", "Lunatic"]);
export const searchArt = (r) => `search/${SEARCH_ART.has(r) ? r.toLowerCase() : "room"}`;

export const SIDE = { good: "innocent", bad: "guilty" };

const MANY = new Set(["Thug", "Confidant", "Guest", "Lover"]);

export const isBadRole = (r) => ROLES[r][0] === "bad";
export const title = (r) => `${MANY.has(r) ? "A" : "The"} ${r}`;

// Roles marked for a planned change (see PLANNED_CHANGES in ravenhill/rules.py), stamped on their cards in the Roles tab.
export const PLANNED = {};
// A role's steps as a small timeline: [key, icon, label]
// [key, icon, label, what the step means, for the explanation at the top of the Roles tab]
const STEPS = [
  ["start", "🗝", "From the start", "What the role knows before the first night, besides its own role. Most know nothing more; the Confidants and the Lovers know each other, and the Witness knows one of the guilty."],
  ["night", "🌙", "Each night", "What the role does in secret after dark: investigating, spoiling an investigation, bribing, listening at doors. What they learn shapes their testimony next morning. In a Blackout nobody does anything."],
  ["day", "🗣", "Each morning", "How the role advises you whom to clear and whom to arrest. Honest guests say what they believe, right or wrong; the guilty lie to save their own skins, and cover for any other culprit they find out."],
  ["seen", "🔍", "To investigators", "Shown only for a role that looks like something else when another guest investigates it, such as the Grifter."],
];
// The steps explained, one row each: the box at the top of the Roles tab.
export const stepsLegendHtml = () => `<dl class="role-steps">${STEPS.map(([k, icon, label, what]) =>
  `<div class="step ${k}"><span class="step-icon">${icon}</span><dt>${label}</dt><dd>${what}</dd></div>`).join("")}</dl>`;
export const stepsHtml = (r) => `<dl class="role-steps">${STEPS.filter(([k]) => ROLES[r][1][k]).map(([k, icon, label]) =>
  `<div class="step ${k}"><span class="step-icon">${icon}</span><dt>${label}</dt><dd>${ROLES[r][1][k]}</dd></div>`).join("")}</dl>`;

export const plannedHtml = (r) => (PLANNED[r] ? `<span class="planned">${PLANNED[r]}</span>` : "");
