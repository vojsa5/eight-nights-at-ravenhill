# Eight Nights at Ravenhill

A single-player detective deduction game (a take on Werewolf). Sixteen guests at Ravenhill Manor
(an heiress, a banker, a surgeon, a butler, a spirit medium…),
eight innocent and eight who each did Lord Edmund Ravenhill a wrong on the night two of them poisoned him,
advise you each round whom to clear and whom to arrest. Seven crimes, eight culprits: the two secret Lovers
share the only murder, and the other six each did their own wrong without knowing about anyone else's. You are
told every crime at the start, but not who did it. You only ever see the guests' advice and the roles of guests
you have cleared or arrested, so you have to work out whose testimony to trust.

In the code the innocent are "good" and the guilty "bad"; clearing a guest is "save" and
arresting is "eliminate".

## Play

```bash
python3 play.py            # then open http://localhost:8000
```

No dependencies beyond Python 3.9+. Fonts load from Google Fonts; offline the page falls back to Georgia.
For testing, `http://localhost:8000/?seed=11` starts a reproducible game (the seed is never shown to the player).

## Play online

The game also runs without the Python server, on GitHub Pages: https://vojsa5.github.io/eight-nights-at-ravenhill/.
There the browser runs the same `ravenhill` package with [Pyodide](https://pyodide.org) in a Web Worker (`web/js/pyengine.js`,
`web/js/pyworker.js`), so the page never freezes while it starts.
The site plays only one case, the shared case below: the plain address and any other link find the gates closed.
The first visit downloads Pyodide (about 10 MB, cached afterwards). Your own pictures in `web/art/custom/` work only
with the local server.

Every push to `main` republishes the site (`.github/workflows/pages.yml`, which runs `tools/build_pages.py`).
To try the static build locally: `python3 -m tools.build_pages && python3 -m http.server -d _site`.

## A shared case

A link with `?case=<name>` plays one case kept online, so it goes on in any browser or on any device that opens the
same link, for example `https://vojsa5.github.io/eight-nights-at-ravenhill/?case=<name>`. Anyone with the link can play
it, so pick a name nobody would guess (letters, digits, `-` and `_`). It is the only case the site plays: the page
keeps the SHA-256 of its name (`CASE_SHA256` in `web/js/shared.js`), so the public source does not give the name
away, and the database takes no second case. A move once made stays made. New case starts the case over as a new
game, once its seal is held down; every device with the link moves on to it, and the games before stay in the
database (the first at the case's own level, each later one under `games/<n>`, with `game` naming the current one).
When the case moves on in another browser, the page catches up (notes too) as soon as you come back to it; a move
made on a board that was out of date is not made, and the page catches up instead.

The case lives in a free Firebase Realtime Database (`web/js/shared.js`). To set one up:

1. At https://console.firebase.google.com, create a project (it needs no Google Analytics).
2. Build → Realtime Database → Create Database: pick a location and start in locked mode.
3. On the Rules tab, paste `database.rules.json` and publish. Anyone who knows the case's name can read it, add moves
   and write its notes and the books read, but nobody can change or delete a move or a book once marked read, save
   anything that is not a move, list the cases, or start a case while one exists. (A move the case cannot take is
   passed over when the case is replayed.)
4. Copy the database's URL from the Data tab (like `https://ravenhill-1234-default-rtdb.europe-west1.firebasedatabase.app`)
   into `DATABASE` in `web/js/shared.js`.
5. Pick the name and put its SHA-256 into `CASE_SHA256` in `web/js/shared.js`:
   `python3 -c "import hashlib, sys; print(hashlib.sha256(sys.argv[1].encode()).hexdigest())" <name>`. Push, and open
   the link: the first visit starts the case.

To start completely afresh, delete the case under `cases/` on the Data tab: the same link then starts a new one. To move to another
name, delete it too and put the new name's SHA-256 in `CASE_SHA256`. To try the static build locally:
`python3 -m tools.build_pages && python3 -m http.server -d _site`, then open `http://localhost:8000/?case=<name>`,
which plays the real case.

## Project layout

```
play.py                  start the web game
ravenhill/               the game engine (Python package)
  rules.py               roster, constants, rule variants (Rules), alignment helpers
  game.py                round flow: night → advice → clear → arrest; the player's tools; the diary of the nights (jot)
  mind.py                a character's private knowledge and beliefs
  abilities.py           night abilities, one function per role
  advice.py              advice policies, one function per style, and the patterns the smart player reads too
  view.py                what the player can see (Advice, View)
  events.py              round events: which round gets which, and what each one allows
  notebook.py            the facts a guest learns at night (what a Notebook shows)
  players/               automated players
    simple.py            random, majority and trust baselines
    calibration.py       how accurate each role's advice is (builds data/calibration.json)
    likelihood.py        the smart player's model of the game
    bayes.py             the smart player (MCMC over role assignments)
  server/                local web server
    app.py               HTTP routes: /api/* and static files
    state.py             game state sent to the browser
    static.py            serving web/ and the custom art folder
web/                     the browser game
  index.html             page markup
  manifest.json, icons/  for adding the game to a phone's home screen
  css/                   base (desk, colours), board (corkboard, polaroids, strings, case note), folder, reveal (cards), responsive,
                         title (the opening screen), tour (the guided tours of the folder's tabs), film (the films' camera,
                         the moving parts of their pictures, the cuts between scenes and the old-film grain), verdict (the
                         story after each decision: the doors, the stamp, the search's torch, the result card's turn),
                         flashback (the moving parts of the crimes, an arrest's hall and cellar stairs, and the flashback after
                         a right call: the look of a memory),
                         reading (the screen that waits while a book is read), minisim (the self-playing case in miniature), howto (How to play's exhibits coming alive, scene by scene), rules (the Rules tab),
                         chapters (the opening's five chapters: their title cards, the chapter bar and each chapter's look),
                         dossier (a guest's dossier once the case is closed)
  js/                    one module per part of the page (main.js is the entry point; prologue.js holds the opening,
                         story.js the story of the birthday night (every crime, every innocent role's story, the opening film),
                         reveal.js the story after each decision, finale.js the ending, film.js plays all three full
                         screen, chapters.js the opening's five chapters (the story, How to play, a case in miniature,
                         the advice and the case papers), each with its title card and the chapter bar,
                         roles.js every role's texts, tips.js the advice for the player, books.js the rewards,
                         shared.js the shared case, title.js the opening screen: the manor at night, shown on every
                         visit while the case loads behind it; tour.js plays the "How this tab works" tour of a folder
                         tab, and tours.js holds each tab's steps; crimes.js the folder's Crimes tab; reading.js the screen
                         that waits while a book is read; minisim.js the case in miniature, the chapter after How to play: a small case that plays itself;
                         guests.js who each guest was to Lord Edmund; dossier.js a guest's dossier once the case is closed)
  art/roles/             one portrait per role (confidant-a / confidant-b, lover-a / lover-b for the two figures of a pair)
  art/guests/            each guest's own sepia portrait (by surname), shown until their role is revealed
  art/events/            one wide scene per event, shown on the round's opening card, where it comes alive (each file
                         styles its own life under .ev-live, which intro.js sets when it inlines the scene)
  art/story/             the opening film's scenes (story.js has their captions and order); in a film a picture is drawn
                         into the page, so its parts marked lf-* move, its data-fx marks add snow, steam and glows, and
                         data-cut on the <svg> picks how the scene comes in (film.js, css/film.css)
  art/truths/            each innocent role's own story, the flashback after a right clear (and the Crimes tab's Replay);
                         a `<g data-fx="guest">` mark too
  art/crimes/            each guilty role's crime that night, done by a figure you never see: the opening film shows them,
                         and a right arrest replays the guest's own as a flashback; a `<g data-fx="guest" data-at="x y">`
                         mark (also in verdict/confront.svg) is where the film lays the guest's photograph (a picture
                         without one, in the middle of the screen)
  art/verdict/           the story after a decision: the morning room (clear), the hall and the cellar stairs and the wine
                         cellar (arrest), and after a mistake the burnt papers (a guilty guest cleared) or the cellar at night
                         (an innocent arrested); door.svg is a leaf of the morning room's double doors, which open at the
                         start of a clear
  art/search/            what the search of each role's room turns up (room.svg for roles without their own); its
                         `<g data-fx="found" data-at="x y" data-r="r">` mark is where the search's torch stops
  art/finale/            the ending: the thaw, and the closed case file
  art/desk/              things on the desk beside the board on wide screens (a reading glass, a pocket watch, a letter)
  art/board/             things pinned in the board's free corners (a newspaper clipping, a ticket, a floor plan, a telegram)
  art/books/             the covers of the books won as rewards (books.js says which role hides which; the README
                         there lists the editions)
  art/custom/            your own pictures, which replace the built-in ones (see README there)
tools/                   simulations and analysis
  simulate.py            play many games and print score statistics
  calibrate.py           rebuild data/calibration.json after rule changes
  build_pages.py         build the static site for GitHub Pages (_site/)
  experiments.py         compare rule variants (defined in variants.py)
  audit.py               count illogical actions by guests
  roles_report.py        per role: how informative, how hidden, how often it misleads
data/calibration.json    generated by tools.calibrate; rebuild after rule changes
results/                 output of tools.experiments
database.rules.json      the Firebase rules for a shared case (see A shared case)
```

## Events

Every round opens with a card announcing its event:

- Round 1 is always **First Impressions**: everyone learns whether one other guest, picked at random, looks innocent or guilty.
- Every night is one of the four kinds in `GROUPS` (`ravenhill/events.py`): the guests learn something, you
  learn something, the testimony changes, the house goes quiet. Each half of the stay opens with the guests
  learning something and ends with the house going quiet, and the schedule is the same in every case: night I
  is First Impressions, II the Notebook, III the Footprints, IV the Blackout, V the Séance, VI the Dinner Party,
  VII the Inquest and VIII the last night.
  The six events of rounds 2–7:
  **Blackout** (no investigations that night), **Dinner Party** (advice names only whom to clear),
  **Inquest** (only whom to arrest), **Séance** (everyone learns how many of the two guests beside them
  look guilty, like a Housekeeper), **Notebook** (you may read one guest's notebook: what they learned
  last night) and **Footprints** (prints in the snow match two guests' boots: at least one of them is guilty).
  The Interview (question one guest again) is kept in the code for rule variants.
- Round 8 is the last night, with no event.

All of this is set in `Rules` (`first_impressions`, `event_rounds`, `event_pool`, `grouped_events`, `night_groups`,
`shuffle_groups`); `tools/variants.py` has versions with fewer or no events, with the clues and the testimony nights in
random order (`shuffled-groups`), and the earlier schedule (`two-cycles`: the four kinds in turn, twice), for comparison.
The Events tab in the case folder shows all eight nights and a card per event (scenes in `web/art/events/`).

## After each decision

Every clear or arrest plays a short story: the decision (the guest's own photograph over the morning room or the
wine cellar), then the search of their room, then the card with the result. An arrest first confronts the guest in the
hall and walks them down the cellar stairs. When you were right, the search shows what gave the guest away (`FOUND` in
`roles.js`, picture in `art/search/`), a flashback in sepia replays what the guest did that night or who they really
were (`CRIME_STORY` and `TRUTH_STORY` in `story.js`; a crime in the picture the opening film used), ending on their own words,
and the card names their role, with the guilty guest's crime (`CRIMES`) or the innocent guest's story (`TRUTHS`). After a mistake you learn only the guest's side:
the server leaves out their role until the case is closed (`sealed()` in `ravenhill/server/state.py`). The ending
then plays the thaw, the truth about every guest you misjudged and the verdict, and closes on the next morning's newspaper
(`showClosing()` in `finale.js`): a headline and a medal that follow the score (`RANKS` in `board.js`), the books, the
eight nights and every culprit with their crime. The engine and the automated players are unaffected: they still
see every revealed role.

## The Crimes tab

The case folder's Crimes tab (`web/js/crimes.js`, styles in `css/folder.css`) is a crime board with a card for every
crime of the case, from night I: one per guilty role in the roster, the Lovers' murder with two culprits. A card shows
the crime's title, what was done (`CRIME_STORY` in `story.js`) and its picture (`art/crimes/`, or the role's search
picture until it has one), with a polaroid per culprit pinned over it: a silhouette while unknown, the guest's own
photograph tied on with red string once they are rightly arrested, and a Solved stamp once all of the crime's culprits
are. A guilty guest cleared by mistake keeps their role sealed, so the tab says only how many culprits walked free, never
which crime was theirs; once the case is closed every crime names its culprits, and those who walked free are stamped
Got away. Under the crimes, every innocent guest rightly cleared, with their role and who they really were (`TRUTH_STORY`
and `TRUTHS`). A right call's Replay button plays its flashback, the film after the decision (`replayFlashbacks()` in
`reveal.js`; the last night's two are seen only here); a mistake has none, as in the story after it. On phones the tab bar shortens the longer names
(`data-short` in `index.html`).

## The dossiers

Once the case is closed, a click on a guest's photograph on the board (or on their name in the Testimony or Crimes tab)
opens their dossier (`web/js/dossier.js`, styles in `css/dossier.css`): what they really did, night by night. Each night
shows what the event taught them, whom they investigated and what they found (true or false, and why: the Forger's ink,
the Grifter's disguise), the night work of the guilty (whom the Forger spoiled, the Paymaster bribed, the Hypnotist
hypnotised and the Eavesdropper listened to, and what they learned from it) and the Lovers' meetings; each morning, what
they advised and whether it proved right, and what bent it (a trance, a bribe, the other Lover, the Séance's spirit); then
how their part ended. ‹ › and ← → turn to the guests beside them. The engine notes all this as it happens in
`Game.diary` (`jot()` in `game.py`, which never draws on the rng, so a stored case replays the same), and
`game_state()` sends it only once the case is closed.

## Rewards

Every role hides a book in its guest's room (`BOOKS` in `web/js/books.js`, covers in `web/art/books/`), picked to suit
the role: Poirot for the Sleuth, the Night Watch for the Constable, a cult for the Hypnotist. A right clear or arrest
finds it: the result card shows the book, and it goes on the shelf in the Rewards tab. A mistake loses that guest's
book, and which book stays sealed with their role until the case is closed. Of a pair, the first guest rightly found
holds the `-a` book. The closing newspaper shows every book won, among them the last night's, which have no card of their
own, and in grey those lost.

Then the case waits while the book is read (`web/js/reading.js`): after the result card a reading screen covers the game
until the player says they have finished it, and confirms by holding a wax seal down until its ring closes, so a stray
click never moves the story on. The last night's books are read before the ending. A book once read stays read, kept
with the case (online for a shared case, else in the browser).

## Each night

Every night's opening card says what the night left behind: ink for the Forger, a glass at the wall for the
Eavesdropper, steamed-open letters for the Mole, banknotes for the Paymaster, whispers in the night while both Lovers
are free (`night_traces()` in `ravenhill/server/state.py` decides which roles worked, `web/js/night.js` has the texts).
Only roles whose night work has an effect leave a trace, so the Grifter and the Lunatic leave none. A click on a trace
tells what its culprit does at night. It names roles, never guests, and a trace stops once its culprit is out of the
house; nothing shows after a Blackout. On the last night the two who remain are gathered in the drawing room: you accuse one, the other goes free,
and a short film of the summing-up (`showDrawingRoom()` in `finale.js`) leads into the ending.

## Command-line tools

```bash
python3 -m tools.simulate --games 300 --workers 8   # statistics for every player strategy
python3 -m tools.simulate --show 7                  # one game, turn by turn, with the smart player's reasoning
python3 -m tools.calibrate                          # rebuild data/calibration.json after any rule change
python3 -m tools.experiments --variants standard no-paymaster --games 150
python3 -m tools.audit --games 2000
python3 -m tools.roles_report --games 150 --workers 12
```

## Adding or changing a role

1. `ravenhill/rules.py`: put it in `GOOD_ROLES` or `BAD_ROLES` (or `SPARE_GOOD` / `SPARE_BAD` to keep it out of the game).
2. `ravenhill/abilities.py`: its night ability, registered in `ABILITIES` (skip if it has none).
3. `ravenhill/advice.py`: a policy function if it advises differently, chosen in `policy_for`.
4. `web/js/roles.js`: its steps in `ROLES` (what it knows from the start, does each night, advises each morning, and
   how investigations see it; the Roles tab shows them) and its reveal text; for a guilty role its crime against Lord Edmund in `CRIMES`
   (the case papers, the reveal card, the ending and the Roles tab show it) and its story in `CRIME_STORY` in
   `story.js`, for an innocent role its story in `TRUTHS` and `TRUTH_STORY`; and what the search of its room turns up in `FOUND`. Optionally the book its guest hides, in `BOOKS` in `books.js`.
5. `web/art/roles/<role>.svg`: its portrait (portrait shape, 200 × 262). Optionally `web/art/search/<role>.svg`
   (360 × 200), added to `SEARCH_ART` in `roles.js`, with a `data-fx="found"` mark on what gave the guest away.
6. If the smart player needs to understand a special pattern, `ravenhill/players/likelihood.py`.
7. Run `python3 -m tools.calibrate`, then `python3 -m tools.audit` and a simulation.
