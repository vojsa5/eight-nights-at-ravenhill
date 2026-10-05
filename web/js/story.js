// The story of the birthday night: what each guilty role did to Lord Edmund (CRIME_STORY), who each innocent
// role really was (TRUTH_STORY), the opening film (OPENING) and the captions of the arrest film's hall and stairs.
// Seven crimes, eight culprits: the two Lovers share the only murder, and the others each did their own wrong
// that night without knowing about anyone else's. The short charge on cards and in the ending is CRIMES in roles.js.
import { searchArt } from "./roles.js";

// role -> { title, scene (picture under art/), told (the opening film, culprit unknown),
//           flashback(name) (the arrest film, culprit named), confess(name) (their words when arrested) }
// The standard seven come in the order of the evening.
export const CRIME_STORY = {
  Eavesdropper: {
    title: "The burnt letter",
    scene: "crimes/eavesdropper",
    told: `Between the soup and the fish, someone slipped away from the table. Weeks of listening at the library door had
      given them the combination of the safe, and told them that Lord Edmund's letter to Scotland Yard bore their name.
      They took the letter out and burnt it in the grate, still sealed, and before closing the safe they emptied his purse
      of gold sovereigns into their pockets.`,
    flashback: (name) => `Between the soup and the fish it was <b>${name}</b> who slipped away from the table, opened the
      safe with the combination learnt at the library door, burnt Lord Edmund's letter to the Yard without breaking the seal,
      and pocketed his purse of gold sovereigns.`,
    confess: () => `"I never read the other names, Inspector. I burnt it sealed. The sovereigns? They were just lying there."`,
  },
  Grifter: {
    title: "The gold-mine shares",
    scene: "crimes/grifter",
    told: `Over the port, someone passed a lump of gleaming ore around the table and sold Lord Edmund ten thousand pounds
      more of shares in the Matabele Reef Gold Company. There is no such mine in Rhodesia, and there never was: all year
      he had been paying good money for paper.`,
    flashback: (name) => `It was <b>${name}</b> who passed the lump of ore around the table over the port, and pocketed
      Lord Edmund's cheque for ten thousand pounds of shares in a mine that never was.`,
    confess: () => `"The mine is perfectly real, Inspector. I could let you have a few shares myself, between friends."`,
  },
  Paymaster: {
    title: "The missing pages",
    scene: "crimes/paymaster",
    told: `At ten o'clock someone pressed fifty pounds into the footman's hand to look the other way at the door of Lord
      Edmund's study. Inside, with a penknife, they cut from his ledger every page that recorded what they owed him.`,
    flashback: (name) => `It was <b>${name}</b> who bought the footman's blind eye for fifty pounds at ten o'clock, and cut
      from Lord Edmund's ledger every page of their debts.`,
    confess: () => `"Name your price, Inspector. Everyone else in this house had one."`,
  },
  Hypnotist: {
    title: "The Ravenhill pearls",
    scene: "crimes/hypnotist",
    told: `At half past ten someone drew Lord Edmund aside to show him a trick with a silver watch. In a trance he walked
      down to the strongroom, handed over his late wife's pearls with his own hands, and came back to his guests
      remembering nothing.`,
    flashback: (name) => `It was <b>${name}</b> who swung the silver watch at half past ten, and walked Lord Edmund down
      to the strongroom in a trance to hand over his late wife's pearls.`,
    confess: () => `"Look into my eyes, Inspector. No? A pity. You would have enjoyed forgetting all this."`,
  },
  Lover: {
    title: "The poisoned nightcap",
    scene: "crimes/lover",
    told: `At eleven the butler carried Lord Edmund's nightcap up to the library, and for a minute the tray stood alone
      outside the door. In that minute a gloved hand tipped a small vial into the brandy, while a second figure held the
      door ajar and kept watch.`,
    flashback: (name) => `<b>${name}</b> was one of the two at the library door at eleven: one Lover tipped the vial into
      Lord Edmund's brandy while the other held the door and kept watch. Of everything done to him that night, only this killed him.`,
    confess: () => `"He found us out, and on Monday he would have told the world. I regret nothing, and you will never
      have the other name from me."`,
  },
  Forger: {
    title: "The stolen will",
    scene: "crimes/forger",
    told: `At ten past eleven someone crept into the library with a forged will in their pocket, one that left
      Ravenhill to them. Lord Edmund seemed asleep in his armchair, the safe open and the new will at his elbow. They took it,
      heard a step on the stairs, and fled before they could leave the forgery in its place.`,
    flashback: (name) => `It was <b>${name}</b> who crept into the library at ten past eleven, took the new will from
      beside a man they believed asleep, and fled with it at a step on the stairs, the forgery still in their pocket.`,
    confess: () => `"Ravenhill should have been mine. I only wrote down what he ought to have written himself."`,
  },
  Lunatic: {
    title: "The cut wire",
    scene: "crimes/lunatic",
    told: `The butler telephoned Scotland Yard from the hall. Minutes later someone went out into the snow with the garden
      shears and cut the wire, and by midnight the snow had closed every road off the moor.`,
    flashback: (name) => `It was <b>${name}</b> who went out into the snow with the garden shears, minutes after the Yard
      was telephoned, sure the wire was carrying tales of them to the asylum, and cut it.`,
    confess: () => `"The wire was talking about me, Inspector. Somebody had to stop it, and nobody else would."`,
  },
  // the spare roles, for rule variants: their search picture stands in for a scene of their own
  Mole: {
    title: "The opened letters",
    scene: searchArt("Mole"),
    told: `Late that evening someone took the letters Lord Edmund had left on the hall table for the morning post, lifted
      every seal with a knife warmed in a candle flame, and copied each one before sealing it again.`,
    flashback: (name) => `It was <b>${name}</b>, the friend he trusted with everything, who warmed the knife in the
      candle that night and copied every letter he had left for the morning post.`,
    confess: () => `"He trusted me with everything. That was his mistake, Inspector, not mine."`,
  },
  Copycat: {
    title: "The voice on the telephone",
    scene: searchArt("Copycat"),
    told: `At ten o'clock someone telephoned Lord Edmund's solicitor in York and, in Lord Edmund's own voice, called off
      Monday's signing of the new will.`,
    flashback: (name) => `It was <b>${name}</b> at the telephone at ten o'clock, speaking in Lord Edmund's voice to the
      life, who called off Monday's signing.`,
    confess: () => `"You should have heard the solicitor, Inspector: 'Of course, Lord Edmund. Whatever you say, Lord Edmund.'"`,
  },
  Thug: {
    title: "The ambush on the terrace",
    scene: searchArt("Thug"),
    told: `Before dinner someone caught Lord Edmund alone on the terrace and knocked him down with a leather cosh. Lord Edmund
      came in to his own birthday dinner with a cut lip, and told his guests he had slipped on the ice.`,
    flashback: (name) => `It was <b>${name}</b> waiting on the dark terrace before dinner with a leather cosh, to settle
      an old score with Lord Edmund.`,
    confess: () => `"He had it coming for years. I'll go quietly, Inspector. This time."`,
  },
  Mastermind: {
    title: "The missing Gainsborough",
    scene: searchArt("Mastermind"),
    told: `At a quarter to eleven, exactly as planned, someone lifted the Gainsborough from the wall of the long gallery
      and hung a copy in its place. Nobody has noticed yet.`,
    flashback: (name) => `It was <b>${name}</b> who planned the night to the minute, and at a quarter to eleven swapped
      the Gainsborough in the long gallery for a copy.`,
    confess: () => `"You are an hour late and three moves behind, Inspector. The real one is already in London."`,
  },
  Framer: {
    title: "The signet ring",
    scene: searchArt("Framer"),
    told: `At the birthday toast someone shook Lord Edmund warmly by the hand, and slipped the signet ring from his finger
      to plant on a guest they hated.`,
    flashback: (name) => `It was <b>${name}</b> who shook Lord Edmund's hand at the toast, and walked away with his
      signet ring to hide in somebody else's luggage.`,
    confess: () => `"It was meant for another guest's pocket. Look harder at the ones you have cleared, Inspector."`,
  },
  Blackmailer: {
    title: "The note under the plate",
    scene: searchArt("Blackmailer"),
    told: `Between the soup and the fish, Lord Edmund found a note under his plate: five thousand pounds more, or the
      letters he wrote as a young man would go to the newspapers.`,
    flashback: (name) => `It was <b>${name}</b> who had bled Lord Edmund for years over the letters of his youth, and
      slipped the note under his plate at dinner.`,
    confess: () => `"Everybody has a secret, Inspector. I wonder what yours is."`,
  },
};

// role -> { title, scene, story (who they really were), flashback(name) (the clearing film, guest named),
//           farewell(name) (their words when cleared) }. Any guest can hold any role, so none of it names a profession.
export const TRUTH_STORY = {
  Sleuth: {
    title: "The watcher in the house",
    scene: "truths/sleuth",
    story: `A month before the birthday, Lord Edmund took this guest aside and asked a favour: to watch the people at his
      table and tell him whom he could trust. They came too late to save him. Every night since, they have gone on with the
      job, one guest at a time, starting with whoever accused them, and kept the answers in a pocketbook: a tick for
      innocent, a cross for guilty.`,
    flashback: (name) => `A month before the birthday, Lord Edmund drew <b>${name}</b> into his study and asked them to
      keep an eye on his guests. Every night since his death, by lamplight, ${name} has added another tick or cross to the pocketbook.`,
    farewell: () => `"He asked me to watch them, Inspector. I only wish I had been watching the stairs that night."`,
  },
  Witness: {
    title: "The one who saw",
    scene: "truths/witness",
    story: `At a quarter past eleven on the birthday night this guest was on the back stairs, and saw one of the guilty
      slip past the library door in the dark, close enough to know the face. They wrote it in their diary, tore out the page and hid it in the toe
      of a shoe. Too frightened to accuse anyone, they only ever named guests they trusted, even when you asked whom to
      arrest. They were right to be careful: whoever they saw may well have seen them too.`,
    flashback: (name) => `At a quarter past eleven, <b>${name}</b> stood frozen on the back stairs as one of the guilty
      slipped past the library door in the dark. ${name} wrote it down, tore out the page and hid it in a shoe.`,
    farewell: () => `"I know what I saw on the stairs that night, Inspector. Lock your door tonight, and I shall lock mine."`,
  },
  Reporter: {
    title: "The story of the decade",
    scene: "truths/reporter",
    story: `This guest was writing up the birthday for the society page of the Yorkshire Post: a lord's seventieth,
      champagne, and who sat next to whom. By midnight it was the story of the decade. Every night since, they have prised one guest's true
      part out of the house, and not even the Grifter's disguise has fooled them. It is all in the notebook, in shorthand,
      and the typewriter in their room has not stopped since the snow came.`,
    flashback: (name) => `<b>${name}</b> was writing up the birthday for the Yorkshire Post's society page, and found a murder instead. Every
      night since, by candlelight, ${name} has filled the notebook in shorthand, one guest's true part at a time.`,
    farewell: () => `"Thank you, Inspector. You shall have the front page, and I'll spell your name right."`,
  },
  Constable: {
    title: "Sworn in by Lord Edmund",
    scene: "truths/constable",
    story: `A week before his birthday, Lord Edmund, a magistrate of the North Riding, quietly swore this guest in as a
      special constable, with a warrant card, a whistle and a letter asking for discretion. Since the murder they have done
      their duty by night: each night checking one guest, and passing the finding on to the guest they trust most. Early
      on, that was sometimes the wrong person. Evidence travels, and so do mistakes.`,
    flashback: (name) => `A week before the birthday, in the library, Lord Edmund swore <b>${name}</b> in as a special
      constable. Every night since his death, ${name} has checked one guest and quietly passed the finding on.`,
    farewell: () => `"I did my duty as well as I could, Inspector. If you need another pair of hands, I still have the whistle."`,
  },
  Colonel: {
    title: "An old soldier's accounts",
    scene: "truths/colonel",
    story: `Long ago in South Africa this guest served beside Edmund Ravenhill, and once carried him, wounded, two miles to
      a field hospital. They have not missed one of his birthdays since. They keep a small ledger of every kindness and every insult, and settle each one in kind.
      At Ravenhill they kept the same accounts: whoever spoke up for them one morning, they spoke up for the next, and
      whoever accused them, they accused back.`,
    flashback: (name) => `Long ago on the veldt, <b>${name}</b> carried a wounded Edmund Ravenhill two
      miles to a field hospital. ${name} has kept a ledger of favours and slights ever since, and paid every one back.`,
    farewell: () => `"Much obliged, Inspector. I shall enter it in the book: one kindness, to be repaid."`,
  },
  Confidant: {
    title: "One long game of chess",
    scene: "truths/confidant",
    story: `At dinner on the birthday night this guest sat next to a guest they had barely met, and found they both played
      chess. At ten the two of them sat down to a game by the fire in the smoking room, and wrote down every move with the time
      beside it. When the butler's cry went up at a quarter past eleven they went out to the hall together, and after that
      nobody slept: they went back to the board and played on until the dawn. Neither was out of the other's sight all night, so each knew
      for certain that the other had done nothing. From the first morning they vouched for each other, and they were right to.`,
    flashback: (name) => `On the birthday night <b>${name}</b> sat over a chessboard in the smoking room with another guest
      from ten until the dawn, every move written down with the time. Neither left the other's sight: each is the other's alibi.`,
    farewell: () => `"I was at that chessboard from ten until the dawn, Inspector, and so was my partner. Look after them."`,
  },
  Possessed: {
    title: "The voice from the Séance",
    scene: "truths/possessed",
    story: `This guest has always felt more in old houses than other people do, and on the night Lord Edmund died they felt
      something come into Ravenhill. Until the Séance they are perfectly sensible and perfectly honest. From the Séance on,
      Lord Edmund's restless spirit speaks through them, and the dead speak backwards: they clear the guest they suspect
      and accuse the one they trust, and remember none of it.`,
    flashback: (name) => `Something came into Ravenhill on the night Lord Edmund died, and it chose <b>${name}</b>. When the
      lamps go down at the Séance and the hands are joined, it speaks through ${name}, and the dead speak backwards.`,
    farewell: () => `"Since the night he died I have felt him in this house, Inspector. I'm glad to be going where he isn't."`,
  },
  // the spare roles, for rule variants
  Housekeeper: {
    title: "Ears at the long table",
    scene: searchArt("Housekeeper"),
    story: `This guest sat in the same place at the long table every night, between the same two neighbours, and missed
      nothing either of them said or left unsaid. They read people by the way they pass the salt. Every night they worked
      out how many of those two had something to hide, none, one or both, and ringed the places on the seating plan in pencil.`,
    flashback: (name) => `Night after night at the long table, <b>${name}</b> listened to the guests on either side and
      ringed their places on the seating plan in pencil.`,
    farewell: () => `"Do watch the two I sat between, Inspector. One of them never once passed the salt."`,
  },
  Novelist: {
    title: "A plot in need of a villain",
    scene: searchArt("Novelist"),
    story: `This guest has been writing a country-house murder for years, and could hardly believe their luck when a real
      one fell into their lap. Innocent, but unable to resist a twist: every morning they stood up for whoever was most
      accused, and named someone at random for the cellar, just to see what would happen. The manuscript on their desk has
      killed every guest at Ravenhill at least once.`,
    flashback: (name) => `When a real murder came, <b>${name}</b> sat up all night at the typewriter and killed off every
      guest in the house, at least once each.`,
    farewell: () => `"Cleared? How disappointing. I should have made a splendid suspect."`,
  },
  Photographer: {
    title: "The camera's eye",
    scene: searchArt("Photographer"),
    story: `This guest is never without a folding camera, and within an hour of arriving everyone had stopped noticing it.
      Every night they developed the day's pictures and learnt from them whether two guests were on the same side. The
      hatbox in their room is full of prints of guests together in corners where they thought nobody was looking.`,
    flashback: (name) => `Every night, under a red lamp, <b>${name}</b> developed the day's pictures and studied who stood
      close to whom.`,
    farewell: () => `"Smile, Inspector. No? I'll send you a print all the same."`,
  },
  Guest: {
    title: "Here for the champagne",
    scene: searchArt("Guest"),
    story: `This guest came up for the birthday and the champagne, and found themselves in a murder case without the
      faintest idea what to do about it. They guessed honestly every morning, and were right about as often as a tossed coin.
      The only thing in their room that might interest Scotland Yard is an empty bottle of Lord Edmund's best.`,
    flashback: (name) => `<b>${name}</b> came to Ravenhill for the birthday and the champagne, and has been guessing ever since.`,
    farewell: () => `"Splendid. Is there any of that champagne left, do you suppose?"`,
  },
  Recluse: {
    title: "The east wing",
    scene: searchArt("Recluse"),
    story: `Whenever this guest stays at Ravenhill they keep to the east wing with the door locked, and they have done so
      for twenty years. They came down for the birthday dinner and went straight back up. Honest in every word, yet every
      inquiry in the house took them for guilty, simply because nobody knows what they do up there. Mostly, they read.`,
    flashback: (name) => `For twenty years, whenever <b>${name}</b> stays at Ravenhill, a candle burns in the east wing
      until dawn. Every inquiry pointed at the locked door, and behind it ${name} was reading.`,
    farewell: () => `"May I go back to the east wing now? Nobody accuses anybody up there."`,
  },
  Amateur: {
    title: "The would-be detective",
    scene: searchArt("Amateur"),
    story: `This guest has read every detective novel ever printed, and believes with all their heart that they are the
      Sleuth Lord Edmund confided in. Every night they checked one guest with great confidence, and every result was a coin
      toss. They reported their findings honestly, which only made it worse.`,
    flashback: (name) => `By the light of a candle, <b>${name}</b> underlined another detective novel and wrote down another
      confident deduction, most of them wrong.`,
    farewell: () => `"Elementary, Inspector. I cleared myself on the first night, of course."`,
  },
};

// The opening film, the birthday night scene by scene: [picture, where the camera slowly moves in, caption].
const crime = (role, focus = "50% 55%") => [CRIME_STORY[role].scene, focus, CRIME_STORY[role].told];
export const OPENING = [
  ["story/manor", "50% 45%", "Yorkshire, December 1924. Ravenhill Manor stands alone on the moor, and the first snow of the winter is beginning to fall."],
  ["story/ledger", "30% 55%", `For a year Lord Edmund Ravenhill had watched his fortune drain away and his secrets reach the wrong ears. By the
    autumn he knew that people he had welcomed at his own table were robbing him, cheating him and spying on him, each in their own way.`],
  ["story/will", "40% 70%", `He wrote a new will that cut every one of them out, and a letter to Scotland Yard that named them all, and locked
    both in the library safe. His solicitor would witness the will on Monday. Until then, every night, he took it out and read it over by the fire.`],
  ["story/birthday", "50% 40%", `Then he invited them all to Ravenhill for his seventieth birthday. Sixteen guests sat down to dinner, every one of
    them bound to him by blood, money, work or old friendship. Before the night was out, eight of them would do him a wrong.`],
  crime("Eavesdropper"),
  crime("Grifter"),
  crime("Paymaster"),
  crime("Hypnotist"),
  crime("Lover"),
  crime("Forger"),
  ["story/library", "45% 70%", `At a quarter past eleven the butler found him dead in his armchair by the fire, the glass rolled across the rug.
    Of everything done to him that night, only the nightcap had killed him. The safe stood open, and the new will was gone.`],
  crime("Lunatic"),
  ["story/train", "75% 70%", `The Yard had sent you up to see Lord Edmund on Monday. You came early, on the last train before the snow, and
    arrived an hour too late. Seven crimes, and nobody can leave: you know what was done that night, but not by whom.`],
];

// The arrest film's two new scenes. The same guest always reacts the same way (picked by their seat), and what
// they were doing in the hall follows their profession.
const HALL = {
  heiress: "pouring tea from a silver pot", banker: "going through a pocket ledger",
  surgeon: "polishing a pair of spectacles", actress: "by the great mirror, as if waiting for a cue",
  botanist: "with soil from the glasshouses still on their cuffs", explorer: "at the window, glaring at the snow as at an old enemy",
  "art collector": "studying the portraits on the walls", archaeologist: "turning a Roman coin over and over",
  violinist: "tuning a violin", butler: "setting out the morning's post",
  cook: "up from the kitchen to see what the fuss is about", chemist: "holding a brandy glass up to the light",
  "spirit medium": "laying out cards on a side table", jockey: "pulling on riding boots by the door",
  aviator: "tapping the glass of the barometer", barrister: "reading yesterday's Times by the fire",
};
const pick = (list, k) => list[((k % list.length) + list.length) % list.length];

// Confronting the guest in the great hall, with the house standing round in a ring.
export function confrontCaption(c, guilty) {
  const n = c.name, doing = HALL[c.profession] ? ` ${HALL[c.profession]},` : "";
  const reaction = guilty ? pick([
    `${n} goes white to the lips, and for a long moment says nothing at all.`,
    `${n} blusters, laughs too loudly and appeals to the ring of faces, but not one of them looks back.`,
    `${n} only nods, as if expecting you all week, and goes quietly.`,
    `${n} glances once at the front door, where the snow lies deep to the sills, and lets the thought go.`,
  ], c.id) : pick([
    `${n} protests at once: "I never did Lord Edmund a moment's harm, and half the house can tell you so."`,
    `${n} stares at you, then round the ring, and asks in a small voice, "What on earth am I supposed to have done?"`,
    `${n} demands to know on whose word, and promises that Scotland Yard will hear about this.`,
    `${n} laughs, sure it must be a joke, and stops laughing when you do not.`,
  ], c.id);
  return `In the great hall, with the whole house standing back in a ring to watch, you find <b>${n}</b>, the ${c.profession},${doing} and say
    the words every guest has dreaded: "You are under arrest." ${reaction}`;
}

// The walk down the cellar stairs.
export function walkCaption(c, guilty) {
  const n = c.name, k = c.id + Math.floor(c.id / 4);  // a different turn of the list from the hall's
  return guilty ? pick([
    `The cellar stairs are steep and dark. ${n} goes down them without a word, one hand on the cold wall.`,
    `Halfway down the cellar stairs ${n} stops and turns, as if to tell you something, then thinks better of it and goes on.`,
    `${n} counts the cellar steps aloud on the way down, very calmly, as if it were somebody else's arrest.`,
    `On the cellar stairs ${n} laughs once, quietly, and says you will never prove a thing.`,
  ], k) : pick([
    `${n} protests all the way down the cellar stairs, and goes on protesting through the door.`,
    `On the cellar stairs ${n} grips your arm: "I never did him any harm, Inspector. Never."`,
    `${n} goes down the cellar stairs in silence, white and bewildered, and flinches when the lock turns.`,
    `"You are making a terrible mistake," ${n} says on every step of the cellar stairs, and the lock turns all the same.`,
  ], k);
}
