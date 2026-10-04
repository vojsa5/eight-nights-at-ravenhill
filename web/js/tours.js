// The tours of the case folder's tabs, which tour.js plays: for each tab a list of steps, each lighting one part of
// the open tab while a card explains it. A step is
//   head   a short heading
//   at     (body) => an element or a list of them, found in the tab (`body` is #tabbody) or anywhere on the page:
//          what to light, each on its own (or as one, with join: true). The card stands beside the first. A step
//          whose `at` finds nothing is left out, so a tour fits the case as it stands; to explain an empty part of a
//          tab instead, return something that is there and word the text for it.
//   text   one or two plain sentences, or (found) => them, given what `at` found
//   when   optional: () => whether to play the step at all (say, only where the board shows beside the folder)
//   ms     optional: how long it shows, if not the time it takes to read
//   demo   optional: (ctx, found) => a function that puts back whatever it changed. It acts something out with the
//          page's own functions and classes, never a move or a note that stays; ctx (tour.js context) has
//          after(ms, fn), point(el) and press() for a pointer, ghost(el) and glide(ghost, to) for a dragged copy,
//          reveal() to light and show what the demonstration opened, and still (prefers-reduced-motion)
// To give another tab a tour, add its list below under its name in folder.js TABS: the button beside the folder's
// title then shows on that tab too, and nothing in tour.js changes.
import { renderFocus } from "./board.js";
import { closeBook, renderFolder, showBook, toggleRole } from "./folder.js";
import { ui } from "./state.js";
import { markChips } from "./testimony.js";
import { closePicker, showPickedSlip, togglePicker } from "./theory.js";

const all = (body, sel) => [...body.querySelectorAll(sel)];
const wide = () => matchMedia("(min-width: 1101px) and (min-height: 501px)").matches;  // the board shows beside the open folder
const phone = () => matchMedia("(max-width: 700px), (max-height: 500px)").matches;     // the folder fills the screen
const live = () => !ui.S.finished;
const photo = (c) => (c === null || c === undefined ? null : document.querySelector(`#board .card[data-c="${c}"]`));
const todays = (c) => ui.S.advice.find((a) => a.round === ui.S.round && a.speaker === c);

// A witness in the house who advised today, both ways if one did.
function witness(body) {
  const rows = all(body, "tr[data-row]:not(.gone)");
  return rows.find((r) => r.querySelectorAll("td.adv.cur .chip").length === 2) || rows.find((r) => r.querySelector("td.adv.cur .chip"));
}

// The guest in the house that today's testimony names most often.
function mostNamed(body) {
  const n = {};
  all(body, "td.adv.cur .chip[data-c]").forEach((ch) => (n[ch.dataset.c] = (n[ch.dataset.c] || 0) + 1));
  const best = Object.keys(n).filter((c) => ui.S.chars[c].alive).sort((a, b) => n[b] - n[a])[0];
  return best === undefined ? null : +best;
}

const TESTIMONY = [
  {
    head: "The key",
    at: (body) => body.querySelector(".key"),
    text: (found) => `Each chip is one piece of advice: a green ✓ with a number means “clear guest #3”, a red ✕ means “arrest #5”.
      Once a guest's side comes out, the chips about them turn green where the advice proved right and red where it proved wrong.${
      found[0].querySelector(".interview") ? " A dashed chip was given at an Interview." : ""}`,
  },
  {
    head: "The ledger",
    join: true,
    at: (body) => {
      const head = body.querySelector(".grid thead");
      return head && [head, ...all(body, ".grid tbody tr[data-row]").slice(0, 2)];
    },
    text: `A row for every witness and a column for every morning, today's lit gold. Each morning every guest still in the house
      names one guest to clear and one to arrest; the icon over a column is that night's event.`,
  },
  {
    head: "Each witness",
    at: (body) => (body.querySelector("tr[data-row] .rec") || body.querySelector("tr[data-row]"))?.closest("tr").querySelector(".who"),
    text: (found) => (found[0].querySelector(".rec")
      ? `Under the name, the guest's profession, or their role once found. Beside it, their record: how many of their tips
        proved right, and how many wrong. Trust is earned here.`
      : `Under the name, the guest's profession, or their role once you have found it. As guests are revealed, each witness
        gains a record beside it: how many of their tips proved right, and how many wrong.`),
  },
  {
    // the pointer rests on a row, as the mouse would, and the board draws that witness's strings
    head: "Point at a row",
    when: () => wide() && live(),
    at: (body) => {
      const row = witness(body), a = row && todays(+row.dataset.row);
      return row && [row, photo(+row.dataset.row), photo(a?.save), photo(a?.eliminate)];
    },
    text: `Point at a row and the board draws that witness's strings for today: solid for their own advice, dashed for advice
      about them, green to clear and red to arrest.`,
    demo: (ctx, [row]) => {
      const was = ui.hoverRow;
      ctx.after(500, () => ctx.point(row.querySelector(".nm") || row, 0.35, 0.6));
      ctx.after(1500, () => {
        ui.hoverRow = +row.dataset.row;
        renderFocus();
        row.classList.add("tour-hover");
      });
      return () => {
        ui.hoverRow = was;
        renderFocus();
        row.classList.remove("tour-hover");
      };
    },
  },
  {
    // and the other way: the pointer rests on a photograph, and the ledger outlines the chips that name that guest
    head: "Point at a photograph",
    when: () => wide() && live(),
    at: (body) => {
      const c = mostNamed(body), row = c !== null && body.querySelector(`tr[data-row="${c}"]`);
      return row && [row, photo(c), ...all(body, `.grid .chip[data-c="${c}"]`)];
    },
    text: `It works the other way too: point at a photograph and the ledger outlines every chip that names that guest. Click a
      chip to pick that guest on the board, ready to clear or arrest.`,
    demo: (ctx, [row]) => {
      const c = +row.dataset.row, was = ui.hoverChar;
      ctx.after(500, () => ctx.point(photo(c), 0.5, 0.45));
      ctx.after(1500, () => {
        ui.hoverChar = c;
        renderFocus();
        // markChips' own classes, without its scrolling: the tour has brought the row into view already
        all(ctx.body, `.chip[data-c="${c}"], [data-row="${c}"]`).forEach((el) => el.classList.add("hl"));
      });
      return () => {
        ui.hoverChar = was;
        renderFocus();
        markChips();
      };
    },
  },
  {
    head: "Pick from the ledger",
    when: () => !wide() && live(),
    at: (body) => witness(body)?.querySelector("td.adv.cur .chip"),
    text: `Tap a chip and that guest is picked on the board, ready for you to clear or arrest them. Close the folder to see the board.`,
  },
  {
    head: "Cleared or arrested",
    join: true,
    at: (body) => {
      const group = all(body, ".grid tr.group").find((g) => g.nextElementSibling?.matches(".gone"));
      return group && [group, group.nextElementSibling];
    },
    text: `Guests you have sent away move down here, with their role, or only their side after a mistake. They testify no more,
      but their old advice stays in the ledger, and now you know whose word it was.`,
  },
];

const THEORY = [
  {
    head: "The count",
    at: (body) => body.querySelector(".tlead"),
    text: () => (live()
      ? `How many guests are still in the house, and how many of them are guilty. As you sort them, this line says how many
        of the guilty are still hidden, and warns you when your piles hold more than the house can.`
      : `The case is closed: this line says how many of your notes, and of your guesses at roles, proved right.`),
  },
  {
    head: "Three piles",
    at: (body) => {
      const heads = all(body, ".tpile > header");
      const inRow = heads.every((h) => Math.abs(h.offsetTop - heads[0].offsetTop) < 4);  // side by side, or one above another on a phone
      return inRow ? heads : heads[0];
    },
    join: true,
    text: () => (live()
      ? `Your notes from the board, in three piles. Under Guilty and Innocent, a dot for each guest of that side still in the
        house: the dots fill as you mark guests, and turn to red stripes if you mark more than there can be.`
      : `Your notes as they stood when the case closed, in three piles. Every guest now shows who they really were, with a ✓
        where your note was right and a ✕ where it was wrong.`),
    demo: (ctx) => {  // three dots fill, one after another, as three notes would fill them
      const dots = all(ctx.body, ".tpile.guilty .tpips i:not(.on):not(.over)").slice(0, 3);
      dots.forEach((d, i) => ctx.after(1200 + i * 600, () => d.classList.add("on", "tour-dot")));
      return () => dots.forEach((d) => d.classList.remove("on", "tour-dot"));
    },
  },
  {
    // the pointer rests on the slip's switch, then drags a copy of the slip to another pile; nothing moves for real
    head: "Moving a guest",
    at: (body) => {
      const slip = body.querySelector(".tpile.unsure .tslip[data-drag]") || body.querySelector(".tslip[data-drag]");
      const pile = slip && body.querySelector(slip.closest(".tpile.guilty") ? ".tpile.innocent" : ".tpile.guilty");
      return slip && [slip, innerHeight < 560 ? pile.querySelector("header") : pile];  // a short screen: the pile's head, room for the card
    },
    text: `Each slip carries your note from the board: ✕ guilty, ? unsure, ✓ innocent. Press one to move the guest, or drag the
      slip to another pile.`,
    demo: (ctx, [slip, zone]) => {
      const pile = zone.closest(".tpile"), list = pile.querySelector(".tlist") || pile;
      ctx.after(700, () => ctx.point(slip.querySelector(`.tswitch .n${pile.matches(".guilty") ? 1 : 2}`) || slip, 0.5, 0.6));
      const name = slip.querySelector(".tname") || slip;
      ctx.after(2600, () => ctx.point(name, 0.3, 0.6));
      ctx.after(3500, () => {
        const g = ctx.ghost(slip), s = slip.getBoundingClientRect(), n = name.getBoundingClientRect();
        slip.classList.add("dragging");
        pile.classList.add("over");
        // the pointer holds the copy where it took the slip, by the name
        ctx.point(g, (n.left + n.width * 0.3 - s.left) / s.width, (n.top + n.height * 0.6 - s.top) / s.height, true);
        ctx.after(60, () => ctx.glide(g, list, 0, 0));
        ctx.after(ctx.still ? 2200 : 1700, () => g.classList.add("landed"));
      });
      ctx.after(6200, () => {
        slip.classList.remove("dragging");
        pile.classList.remove("over");
      });
      return () => {
        slip.classList.remove("dragging");
        pile.classList.remove("over");
      };
    },
    ms: 12500,
  },
  {
    head: "Fits and clashes",
    at: (body) => body.querySelector(".tfit")?.closest(".tslip"),
    text: `The two numbers on a slip weigh that guest's advice against your theory: green for tips that fit it, red for tips that
      clash. A guest who keeps clashing is mistaken, or lying, or your theory is wrong.`,
  },
  {
    // the pointer rests on “+ role”, then the sheet of roles opens for that guest, and closes again after
    head: "Guessing a role",
    at: (body) => {
      const sheet = body.querySelector(".tpicker");  // on a phone the sheet alone: it fills most of the folder
      return sheet ? [sheet, phone() ? null : body.querySelector(".trole.open")?.closest(".tslip")] : body.querySelector(".tslip .trole");
    },
    text: `Think you know someone's role? Press “+ role” and pick it from this case's roles. The guess is pencilled on their
      photograph, and moves them to the matching pile.`,
    demo: (ctx, [button]) => {
      if (!button.matches(".trole")) return null;
      const c = +button.dataset.pick;
      ctx.after(600, () => ctx.point(button, 0.4, 0.6));
      ctx.after(1800, ctx.press);
      ctx.after(2000, () => {
        togglePicker(c);
        renderFolder();
        ctx.reveal();
        showPickedSlip();  // last, as main.js does: the guest's slip in sight above the sheet
      });
      return () => {
        closePicker();
        renderFolder();
      };
    },
  },
  {
    head: "Starting over",
    at: (body) => body.querySelector(".ttools .treset"),
    text: (found) => `↺ Reset theory sends every guest back to Unsure, here and on the board, and forgets your guesses at roles.
      It asks once more before it does${found[0].disabled ? ", and wakes once you have made a note" : ""}.`,
  },
];

// The role tile to open in the demonstration: one already found, else the first guilty role's.
const showTile = (body) => body.querySelector(".side .roletile.found") || body.querySelector(".side.bad .roletile") || body.querySelector(".side .roletile");

const ROLES = [
  {
    head: "How to read a role",
    at: (body) => body.querySelector(".rolekinds"),
    text: `Every role's card tells you what it does, step by step: 🗝 what it knows from the start, 🌙 its work at night,
      🗣 how it advises you each morning, and 🔍 how it looks to an investigator, where that is not the truth.`,
  },
  {
    head: "This case's roles",
    at: (body) => body.querySelector(".side.good .side-head"),
    text: `The roles in this house, the innocent first and then the guilty. You know which roles are here but not who holds them:
      a pip fills once you have found its guest, is striped for a guest you misjudged, and stays empty while nobody knows.`,
  },
  {
    head: "Sealed",
    at: (body) => body.querySelector(".sealed-row"),
    text: `The guests you misjudged. You know their side, but their roles stay sealed until the case is closed: each of them holds
      one of the roles not yet found on that side.`,
  },
  {
    // the pointer rests on a role, its card opens across its row, and closes again after
    head: "A role's card",
    at: (body) => body.querySelector(".side .rolecard") || showTile(body),
    text: `Click a role to open its card: what it knows, does and says, and for a guilty role, its crime against Lord Edmund.
      Once you have found a role's guest, the role is stamped Found and names them.`,
    demo: (ctx, [tile]) => {
      if (!tile.matches(".roletile")) return null;
      const key = tile.dataset.tile, open = ctx.body.querySelector(".rolecard .rc-close")?.dataset.tile;
      let opened = false;
      ctx.after(600, () => ctx.point(tile.querySelector(".rt-art") || tile, 0.5, 0.5));
      ctx.after(1700, ctx.press);
      ctx.after(1900, () => {
        opened = true;
        toggleRole(key);
        ctx.reveal();
      });
      return () => {
        if (!opened) return;
        toggleRole(open || key);  // the card that was open before, or none
      };
    },
  },
];

// Points at a guest's report or a guest named in a clue, as the mouse would: their photograph lifts on the board
// (main.js data-row), with their strings for today if they are still in the house.
function hoverDemo(ctx, el, c) {
  const was = ui.hoverRow;
  ctx.after(500, () => ctx.point(el, 0.3, 0.55));
  ctx.after(1500, () => {
    ui.hoverRow = c;
    renderFocus();
  });
  return () => {
    ui.hoverRow = was;
    renderFocus();
  };
}

const CASEFILE = [
  {
    head: "The docket",
    at: (body) => body.querySelector(".cf-docket"),
    text: `The case's docket and its running tally: your right decisions, the culprits caught and the innocents cleared, and
      your mistakes. Each side has a pip per guest, filled for a right call and struck through for a mistake.`,
  },
  {
    head: "Night by night",
    join: true,
    at: (body) => {
      const page = body.querySelector(".cf-night");
      return page && [page.querySelector(".cf-date"), page.querySelector(".cf-entry, .cf-blank")];
    },
    text: `The nights are filed as pages, the newest on top, each with its moon and its event. Every guest you send away and every
      clue you are handed goes on the page of its night.`,
  },
  {
    head: "A report",
    at: (body) => {
      const report = body.querySelector(".cf-report:not(.wrong)") || body.querySelector(".cf-report");
      return report && [report, wide() ? photo(+report.dataset.row) : null];
    },
    text: () => `Every guest you clear or arrest gets a report: their photograph and side, their role, the charge against a
      culprit, and the point it earned.${wide() ? " Point at one and the guest's photograph lifts on the board." : ""}`,
    demo: (ctx, [report]) => (wide() ? hoverDemo(ctx, report.querySelector(".cf-name") || report, +report.dataset.row) : null),
  },
  {
    head: "A mistake",
    at: (body) => body.querySelector(".cf-report.wrong"),
    text: (found) => (found[0].querySelector(".cf-sealed")
      ? `A mistake is filed too, without its point. The guest's side is stamped across it, but their role is blacked out,
        sealed until the case is closed.`
      : `A mistake is filed too, without its point. Its role, sealed while the case was open, was unsealed at the thaw.`),
  },
  {
    head: "An exhibit",
    at: (body) => {
      const exhibit = body.querySelector(".cf-exhibit"), who = exhibit && pickWho(exhibit);
      return exhibit && [exhibit, who && wide() ? photo(+who.dataset.c) : null];
    },
    text: () => `The clues you are handed are filed as lettered exhibits: a page from a notebook, or footprints in the snow.
      ${wide() ? "Point at a guest named in one and their photograph lifts on the board; click to pick them." : "Tap a guest named in one to pick them on the board."}`,
    demo: (ctx, [exhibit]) => {
      const who = pickWho(exhibit);
      return wide() && who ? hoverDemo(ctx, who, +who.dataset.c) : null;
    },
  },
];

// The guest named in a clue to point at: one still in the house if there is one.
const pickWho = (exhibit) => all(exhibit, ".cf-who[data-c]").find((w) => ui.S.chars[+w.dataset.c].alive) || exhibit.querySelector(".cf-who[data-c]");

// The Crimes tab (crimes.js): the charges, a crime's card (one still unsolved, with its silhouette), a culprit unmasked
// and their Replay, a culprit who walked free (sealed while the case is open, stamped Got away once it is closed), and
// the innocent guests rightly cleared.
const CRIMES = [
  {
    head: "The charges",
    at: (body) => body.querySelector(".cr-progress"),
    text: () => `Every crime done to Lord Edmund on the night he died, one for each guilty role in the house${
      document.querySelector(".cr-card.murder.pair") ? ", and two culprits share the murder" : ""}. This line counts the crimes you have solved
      and the culprits you have unmasked.`,
  },
  {
    head: "A crime",
    at: (body) => body.querySelector(".cr-polaroid.unknown")?.closest(".cr-card") || body.querySelector(".cr-card"),
    text: (found) => (found[0].querySelector(".cr-polaroid.unknown")
      ? `Each card shows the scene of one crime and what was done there. A silhouette waits for each culprit still unknown,
        and only a right arrest fills it.`
      : `Each card shows the scene of one crime and what was done there, and pinned over the scene, a polaroid of each culprit.`),
  },
  {
    head: "Unmasked",
    at: (body) => {
      const polaroid = body.querySelector(".cr-polaroid.caught");
      return polaroid && [polaroid.closest(".cr-card"), wide() ? photo(+polaroid.dataset.row) : null];
    },
    text: () => `A culprit rightly arrested is pinned to their crime with red string, and a crime whose culprits all are is stamped
      Solved. ▶ Replay plays what they did that night${wide() ? "; point at a photograph and the guest lifts on the board" : ""}.`,
    demo: (ctx, [card]) => {
      const polaroid = card.querySelector(".cr-polaroid.caught");
      return wide() ? hoverDemo(ctx, polaroid, +polaroid.dataset.row) : null;
    },
  },
  {
    head: "Walked free",
    at: (body) => body.querySelector(".cr-sealed"),
    text: `A culprit you cleared by mistake walked free. Their role stays sealed until the thaw, so the board cannot say which
      crime was theirs, and that crime can no longer be solved.`,
  },
  {
    head: "Got away",
    at: (body) => body.querySelector(".cr-polaroid.away")?.closest(".cr-card"),
    text: `At the thaw every culprit is named. Those who walked free are stamped Got away, and their crimes stay unsolved.`,
  },
  {
    head: "Rightly cleared",
    at: (body) => body.querySelector(".cr-alibi") || body.querySelector(".cr-cleared-head"),
    text: (found) => (found[0].matches(".cr-alibi")
      ? `Under the crimes, every innocent guest you cleared rightly, with who they really were. ▶ Replay plays their story.`
      : `Under the crimes, every innocent guest you clear rightly is filed, with who they really were and their story to replay.`),
  },
];

const REWARDS = [
  {
    head: "Your shelf",
    at: (body) => body.querySelector(".rewards .side-head"),
    text: `Every guest has hidden a book in their room, and a right call finds it. The count says how many books you have won,
      how many you lost with your mistakes, and how many still wait in the guests' rooms.`,
  },
  {
    head: "The bookcase",
    join: true,
    at: (body) => all(body, ".shelves > .slot").slice(0, 4),
    text: `A slot for every book in the house, filled in the order of your decisions, with the night under each book. The parcels
      are the books still hidden; they are all wrapped alike, so they give nothing away.`,
  },
  {
    // the pointer presses a book won, it opens large, and closes again after
    head: "A book won",
    join: true,
    at: (body) => {
      const book = body.querySelector(".bookview .bv-book");  // open: on a phone only its page, leaving room for the card
      if (book) return phone() ? book.querySelector(".bv-text") : book;
      return body.querySelector(".shelves .tome:not(.lost)") || body.querySelector(".rewards .noinfo");
    },
    text: (found) => (found[0].matches(".noinfo")
      ? `No books yet. Your first right call finds one: it stands on the shelf face out, and a click opens it large.`
      : `A book you have won stands face out. Click it to open it large, with its line and where you found it; ‹ › or the
        arrow keys turn to the next, and Escape closes it.`),
    demo: (ctx, [tome]) => {
      if (!tome.matches(".tome")) return null;
      let opened = false;
      ctx.after(600, () => ctx.point(tome, 0.5, 0.45));
      ctx.after(1900, ctx.press);
      ctx.after(2100, () => {
        opened = true;
        showBook(+tome.dataset.book);
        ctx.reveal();
      });
      return () => opened && closeBook();
    },
  },
  {
    head: "Lost",
    at: (body) => body.querySelector(".shelves .lost-stamp")?.closest(".slot"),
    text: () => (live()
      ? `A mistake loses that guest's book. Its slot is stamped Lost, and which book it was stays sealed with the guest's role
        until the case is closed.`
      : `A mistake lost that guest's book. Now that the case is closed, you can see which book it was.`),
  },
  {
    head: "Your reading list",
    join: true,
    at: (body) => {
      const list = body.querySelector(".readlist");
      return list && [list.previousElementSibling, ...all(list, "li").slice(0, 2)];
    },
    text: `Every book you have won, with the night and the guest it came from, and the day you finished reading it. Click a line
      to open the book.`,
  },
];

const EVENTS = [
  {
    head: "The eight nights",
    at: (body) => body.querySelector(".nights"),
    text: () => `Every night of the case as a medal, the same eight in every case: its event, its numeral, and under it its kind
      of night.${live() ? " Tonight's glows, and a night still to come has a dashed rim." : ""} Click one to find its card.`,
  },
  {
    head: "The first half",
    join: true,
    at: (body) => all(body, ".nights li").slice(0, 4),
    text: `Each half opens with the guests learning something and ends with the house going quiet. In between, the first half
      hands you two clues of your own: a notebook left open on night II, and footprints in the snow on night III.`,
  },
  {
    head: "The second half",
    join: true,
    at: (body) => all(body, ".nights li").slice(4, 8),
    text: `The Séance opens the second half. Then the testimony changes twice: at the Dinner Party on night VI the guests only say
      whom to clear, at the Inquest on night VII only whom to arrest. Night VIII is the drawing room.`,
  },
  {
    head: "Four kinds of night",
    at: (body) => body.querySelector(".evkinds"),
    text: `What each kind of night does to the case. Below, every event has a card under its kind, with the nights that kind
      falls on.`,
  },
  {
    head: "An event's card",
    at: (body) => body.querySelector(".evcard.now") || body.querySelector(".evcard.future") || body.querySelector(".evcard"),
    text: (found) => `Each card shows the event's scene and mood, and what it means for you. The stamp gives its night${
      found[0].matches(".now") ? ": red for tonight, dashed for a night still to come" : found[0].matches(".future") ? ", dashed while it is still to come" : ""}.`,
  },
];

const RULES = [
  {
    head: "At a glance",
    at: (body) => body.querySelector(".glance"),
    text: `This case in four numbers: the guests in the house, how many are innocent and how many guilty, the nights before the
      thaw, and the best score you can make.`,
  },
  {
    head: "A day at Ravenhill",
    at: (body) => body.querySelector(".dayclock"),
    text: `Every day runs the same way: the night's secret work, its signs at dawn, then the testimony, your clear and your arrest,
      and the search of their rooms.`,
  },
  {
    head: "The eight nights",
    join: true,
    at: (body) => all(body, ".nightgrid"),
    text: () => `The same eight nights in every case, in two halves: First Impressions, the Notebook, the Footprints and the Blackout,
      then the Séance, the Dinner Party, the Inquest and the drawing room. Over the nights, their kinds.${
      live() ? " Tonight is lit gold, and the nights behind you are ticked." : ""}`,
  },
  {
    head: "The drawing room",
    at: (body) => body.querySelector(".showdown"),
    text: `On the last night two guests remain and nobody advises any more. You accuse one and the other goes free; both calls
      still count.`,
  },
  {
    head: "Signs in the night",
    at: (body) => body.querySelector(".signgrid"),
    text: `Each culprit here leaves its own sign on the morning's card while its guest is in the house. When a sign stops, that
      culprit was among the guests you just sent away. The Blackout on night IV hides them all.`,
  },
];

export const TOURS = { testimony: TESTIMONY, theory: THEORY, casefile: CASEFILE, crimes: CRIMES, rewards: REWARDS, roles: ROLES, events: EVENTS,
  rules: RULES };
