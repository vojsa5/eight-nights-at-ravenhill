// The case folder: Testimony (the advice ledger), Theory (your notes in piles), Case file (your decisions and clues), Crimes
// (crimes.js: every crime and its culprits), Rewards (the books won), Roles (this case's, then the others), Events and Rules.
// It is closed by default; its tabs stick out of the right edge of the desk.
import { BOOKS, coversHtml, shelf } from "./books.js";
import { CLUES, factText } from "./clues.js";
import { crimesHtml } from "./crimes.js";
import { EVENTS, GROUPS, HALF, LAST_NIGHT, eventGroup, groupStepsHtml, nightEvent, nightGroup, plannedEventHtml } from "./events.js";
import { ROMAN, moonSvg } from "./format.js";
import { portrait, roleArt } from "./portrait.js";
import { CRIMES, ROLES, SIDE, plannedHtml, stepsHtml, stepsLegendHtml, title } from "./roles.js";
import { sharedCase } from "./shared.js";
import { $, patch, showInFolder, ui } from "./state.js";
import { RANKS, noteSvg } from "./board.js";
import { TRACES } from "./night.js";
import { markChips, testimonyHtml } from "./testimony.js";
import { theoryHtml } from "./theory.js";

const VIEWS = { testimony: testimonyHtml, theory: theoryHtml, casefile: caseFileHtml, crimes: crimesHtml, rewards: rewardsHtml, roles: rolesHtml,
  events: eventsHtml, rules: rulesHtml };
const TITLES = { testimony: "Testimony", theory: "Theory", casefile: "Case file", crimes: "Crimes", rewards: "Rewards", roles: "Roles", events: "Events",
  rules: "Rules" };
export const TABS = Object.keys(VIEWS);

let shownTab = null;  // a newly opened tab starts at its top
let bookOpen = null, bookFrom = ".shelves";  // the book open large over the Rewards tab (its place on the shelf), and what opened it

export function renderFolder() {
  if (!ui.folderOpen || ui.tab !== "rewards") bookOpen = null;  // a book open large closes with its tab
  document.querySelectorAll(".folder-tabs button").forEach((t) => t.classList.toggle("active", t.dataset.tab === ui.tab));
  $("desk").classList.toggle("folder-open", ui.folderOpen);
  $("folder-title").textContent = TITLES[ui.tab];
  if (!ui.folderOpen || !ui.S) return;
  patch($("tabbody"), VIEWS[ui.tab]());
  if (shownTab !== ui.tab) $("tabbody").scrollTop = 0;
  shownTab = ui.tab;
  markChips();
}

// The Case file: a docket with the running tally, then the case's nights as pages, newest on top. A page reads in
// the order things happened: the morning's clue as an exhibit, then a report on each guest cleared or arrested.
// The newest entry is filed with a small flourish (folder.css .cf-new).
function caseFileHtml() {
  const S = ui.S;
  const clues = [
    ...S.notebooks.map((x) => ({ round: x.round, html: (ex) => notebookHtml(x, ex) })),
    ...Object.entries(S.footprints || {}).map(([r, pair]) => ({ round: Number(r), html: (ex) => footprintsHtml(pair, ex) })),
    ...S.interviews.map((x) => ({ round: x.round, html: (ex) => interviewHtml(x, ex) })),
  ].sort((a, b) => a.round - b.round).map((e, i) => ({ round: e.round, order: 0, html: e.html(LETTERS[i % LETTERS.length]) }));
  const reports = S.history.map((h, i) => ({ round: h.round, order: h.action === "save" ? 1 : 2, html: reportHtml(h, i + 1) }));
  const entries = [...clues, ...reports].sort((a, b) => a.round - b.round || a.order - b.order);
  const newest = entries[entries.length - 1];
  const last = S.finished ? Math.max(0, ...entries.map((e) => e.round)) : S.round;  // tonight's page even while empty
  const pages = [];
  for (let r = last; r >= 1; r--) {
    const items = entries.filter((e) => e.round === r).map((e) => `<div class="cf-entry${e === newest ? " cf-new" : ""}">${e.html}</div>`);
    if (items.length || r === last) pages.push(nightPageHtml(r, items.join("")));
  }
  return `<div class="casefile">${docketHtml()}${pages.join("")}</div>`;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

// The docket: the case's number, open or closed, and the running tally. A side's pips are its guests: filled for
// a right call, struck through for a mistake, empty while still in the house.
function docketHtml() {
  const S = ui.S, H = S.history;
  const count = (action, ok) => H.filter((h) => h.action === action && h.ok === ok).length;
  const caught = count("eliminate", true), freed = count("save", false), cleared = count("save", true), held = count("eliminate", false);
  const nBad = S.roster.filter((r) => ROLES[r][0] === "bad").length, nGood = S.roster.length - nBad, left = nBad - caught - freed;
  const pips = (on, off, n) => `<span class="cf-pips">${'<i class="on"></i>'.repeat(on)}${'<i class="off"></i>'.repeat(off)}${"<i></i>".repeat(Math.max(0, n - on - off))}</span>`;
  const of = (a, b) => `${a}<i>of</i>${b}`;
  const tile = (cls, num, label, more, tip) => `<div class="cf-tile ${cls}" title="${tip}"><b>${num}</b><span>${label}</span>${more}</div>`;
  const note = S.finished ? `Closed at the thaw${freed + held ? ": every role unsealed" : ""}.`
    : left ? `${left} culprit${left === 1 ? "" : "s"} still in the house` : "not one culprit left in the house";
  return `<header class="cf-docket">
    <span class="cf-kicker">Metropolitan Police · Criminal Investigation Dept.</span>
    <h3>Case no. 1924/17</h3><span class="cf-place">Ravenhill Manor, Yorkshire · December 1924</span>
    <b class="cf-status${S.finished ? " closed" : ""}">${S.finished ? "Case closed" : "Case open"}</b>
    <div class="cf-tally">
      ${tile("score", H.length ? of(caught + cleared, H.length) : "–", "decisions right", "",
        H.length ? `${caught + cleared} of your ${H.length} decisions were right` : "No decisions yet")}
      ${tile("bad", of(caught, nBad), "culprits caught", pips(caught, freed, nBad), `${caught} arrested, ${freed} walked free, ${left} still in the house`)}
      ${tile("good", of(cleared, nGood), "innocents cleared", pips(cleared, held, nGood), `${cleared} cleared, ${held} held for nothing, ${nGood - cleared - held} still in the house`)}
      ${tile(`wrong${freed + held ? " some" : ""}`, freed + held, freed + held === 1 ? "mistake" : "mistakes", "", `${freed} culprits walked free, ${held} innocents held for nothing`)}
    </div>
    <span class="cf-hand cf-note">${note}</span></header>`;
}

// A night's page: its moon and event, then its entries.
function nightPageHtml(r, items) {
  const S = ui.S, now = r === S.round && !S.finished, e = S.events[r];
  const [icon, name] = e ? [EVENTS[e]?.[0] || "", e] : r === S.rounds ? [LAST_NIGHT[0], "The drawing room"] : ["", ""];
  const blank = S.history.length ? "Nothing filed tonight yet."
    : "Nothing filed yet. Every guest you clear or arrest gets a report here, and every clue you are handed an exhibit, night by night.";
  return `<section class="cf-night${now ? " now" : ""}">
    <header class="cf-date">${moonSvg(r / S.rounds)}<h3>Night ${ROMAN[r]}</h3>${now ? `<span class="cf-tonight">Tonight</span>` : ""}
      ${name ? `<span class="cf-event"><span>${icon}</span>${name}</span>` : ""}</header>
    ${items || `<p class="cf-blank">${blank}</p>`}</section>`;
}

// A report on a guest you cleared or arrested: their photograph clipped on and stamped as on the board, their side
// stamped across, and the point it earned. After a mistake the role stays sealed until the case is closed: only
// the side is known (the server leaves the role out).
function reportHtml(h, no) {
  const c = ui.S.chars[h.char], side = c.bad ? "bad" : "good", act = h.action === "save" ? "Cleared" : "Arrested";
  const where = h.action === "save" ? "sent to the morning room" : "held in the wine cellar";
  const role = h.role ? `<b>${title(h.role)}</b>` : `<span class="cf-sealed" title="Sealed until the case is closed">Sealed</span>`;
  const crime = c.bad && h.role && CRIMES[h.role]
    ? `<p class="cf-charge"><span>${h.action === "eliminate" ? "Charge" : "Crime"}</span>${CRIMES[h.role]}</p>` : "";
  const oops = h.ok ? "" : `my mistake: ${h.role ? "unsealed at the thaw" : "role sealed until the thaw"}`;
  return `<article class="cf-report ${side}${h.ok ? "" : " wrong"}" data-row="${c.id}">
    <div class="cf-photo">${portrait(h.role || c.name, "", c.art)}<span class="cf-stamp ${h.action}">${act}</span></div>
    <div class="cf-body"><span class="cf-form">Report no. ${no} · ${where}</span>
      <h4><span class="cf-name">${c.name}</span> <small>#${c.id}</small> <em>the ${c.profession}</em></h4>
      <p class="cf-role"><span>Role</span>${role}</p>${crime}${oops ? `<p class="cf-hand cf-oops">${oops}</p>` : ""}</div>
    <b class="cf-stamp side ${side}">${SIDE[side]}</b>
    <b class="cf-grade ${h.ok ? "ok" : "no"}" title="${h.ok ? "A right call: +1" : "A mistake: no point"}">${h.ok ? "+1" : "0"}</b></article>`;
}

// A guest named in a clue: pointing at it lifts their photograph on the board (main.js data-row), a click selects
// them (data-c), and it takes their side's colour once that is known.
const whoChip = (c) => {
  const g = ui.S.chars[c], side = g.bad === undefined ? "" : g.bad ? " bad" : " good";
  return `<span class="chip cf-who${side}" data-c="${c}" data-row="${c}">${g.name} <small>#${c}</small></span>`;
};

// The clues you were handed, as exhibits lettered in the order they came.
function notebookHtml(x, ex) {
  const facts = x.facts.length ? x.facts.map((f) => `<li>${factText(f, whoChip)}</li>`).join("") : "<li>nothing new</li>";
  return `<article class="cf-exhibit cf-notebook"><span class="cf-form">Exhibit ${ex} · ${CLUES.notebook[0]} Notebook</span>
    <p class="cf-found">The notebook of ${whoChip(x.char)}, left open on the library desk${x.older ? " at its earlier pages" : ""}:</p>
    <ul class="cf-hand">${facts}</ul></article>`;
}

function footprintsHtml([a, b], ex) {
  const guest = (c) => { const g = ui.S.chars[c]; return `<span class="cf-mini" data-row="${c}">${portrait(g.role || g.name, "", g.art)}${whoChip(c)}</span>`; };
  return `<article class="cf-exhibit cf-prints"><span class="cf-form">Exhibit ${ex} · ${CLUES.footprints[0]} Footprints</span>
    <p class="cf-found">Prints in the snow under the library window match the boots of two guests:</p>
    <div class="cf-pair">${guest(a)}<span class="cf-hand">or</span>${guest(b)}</div>
    <p class="cf-hand cf-oops">at least one of them is guilty</p></article>`;
}

function interviewHtml(x, ex) {
  const who = (c) => (c === null ? "nobody" : whoChip(c));
  return `<article class="cf-exhibit cf-transcript"><span class="cf-form">Exhibit ${ex} · ${CLUES.interview[0]} Interview</span>
    <p>${whoChip(x.speaker)}, questioned again: clear ${who(x.save)}, arrest ${who(x.eliminate)}.</p></article>`;
}

// The Rewards tab: a bookcase with a slot for every book in the house, filled in the order of your decisions. A book
// found stands face out and opens large on a click (bookViewHtml); a mistake's slot holds a parcel stamped Lost, its
// book sealed with the guest's role until the case is closed (then shown greyed); the books still hidden wait as
// wrapped parcels. Under it, the reading list. No cover of a book not yet won shows before the end: it would name a role.
function rewardsHtml() {
  const S = ui.S, { won, lost, mistakes, total } = shelf(S);
  const hidden = S.finished ? 0 : Math.max(0, total - won.length - mistakes);
  const counts = [`${won.length} of ${total} won`, mistakes ? `${mistakes} lost` : "", hidden ? `${hidden} still hidden` : ""].filter(Boolean);
  const slots = [...bookSlots(S, won, lost), ...Array(hidden).fill(null)];
  const last = won[won.length - 1], fresh = last && last.h.round === S.history[S.history.length - 1].round ? last.h.char : null;
  const books = slots.map((x, i) => x && x.book && { ...x, i }).filter(Boolean);  // those that open large
  const list = (xs, head) => (xs.length ? `<h4>${head}</h4><ol class="readlist">${xs.map(readHtml).join("")}</ol>` : "");
  const lostNote = !S.finished && mistakes
    ? `<p class="noinfo">${mistakes === 1 ? "One book was" : `${mistakes} books were`} lost with your mistakes. Which ${mistakes === 1 ? "one stays" : "ones stay"}
      sealed with the guest's role until the case is closed.</p>` : "";
  return `<div class="rules rewards"><div${bookOpen !== null ? " inert" : ""}>
    <p>Every guest has hidden a book in their room. Clear or arrest a guest rightly and you find it:
    the book is yours, and the case waits while you read it. A mistake loses that guest's book${sharedCase ? ", and this case is the only one" : ""}.</p>
    <div class="side-head"><h3>Your shelf</h3><span class="count">${counts.join(" · ")}</span></div>
    <div class="bookcase${total && won.length === total ? " full" : ""}"><span class="bc-plaque" aria-hidden="true">${won.length}<small>of</small>${total}</span>
      <div class="shelves">${slots.map((x, i) => slotHtml(x, i, fresh)).join("")}${'<div class="slot"></div>'.repeat((4 - slots.length % 4) % 4)}</div></div>
    ${won.length ? (won.length === total ? `<p class="bc-note">Every book in the house is yours.</p>` : "")
      : `<p class="noinfo">No books yet. The first right call finds one.</p>`}${lostNote}
    ${list(books.filter((x) => !x.lost), "Your reading list")}${list(books.filter((x) => x.lost), "Lost with your mistakes")}
  </div>${bookViewHtml(books)}</div>`;
}

// The decided slots in the order of the decisions: a book found { h, book }, or one lost { h, book, lost: true }
// whose book is known only once the case is closed.
const bookSlots = (S, won, lost) => S.history.map((h) => {
  const x = (h.ok ? won : lost).find((y) => y.h.char === h.char);
  return x ? { ...x, lost: !h.ok } : !h.ok && !S.finished ? { h, lost: true } : null;
}).filter(Boolean);

const PARCELS = [1, .92, 1.04, .95, .88, 1.02, .94, 1.06];  // the parcels' sizes, by their place on the shelf

// One slot of the bookcase: a book found, face out with its spine; a lost one; or a parcel still in a guest's room.
// The parcels differ only by their place, so they give nothing away.
function slotHtml(x, i, fresh) {
  const lip = x ? `<span class="lip">${ROMAN[x.h.round]}</span>` : "";
  if (!x || !x.book) {
    const tip = x ? `Lost with ${ui.S.chars[x.h.char].name}: which book stays sealed until the case is closed` : "Still hidden in a guest's room";
    return `<div class="slot" role="img" aria-label="${tip}" title="${tip}"><span class="tome-3d parcel${x ? " lost" : ""}" style="--size:${PARCELS[i % PARCELS.length]}">
      <i class="spine"></i><i class="seal">?</i></span>${x ? `<b class="lost-stamp">Lost</b>` : ""}${lip}</div>`;
  }
  const b = x.book, isNew = x.h.char === fresh;
  const tome = (c, k) => `<span class="tome-3d"><i class="spine" style="--cover:url(${new URL(`art/books/${c}.jpg`, document.baseURI).href})"></i><span class="face">
    <img src="art/books/${c}.jpg" alt="" loading="lazy">${isNew && k === b.covers.length - 1 ? `<span class="new-ribbon">New</span>` : ""}</span></span>`;
  return `<div class="slot"><button class="tome${x.lost ? " lost" : ""}${isNew ? " fresh" : ""}${b.covers.length > 1 ? " two" : ""}" style="--size:${b.size || 1}"
    data-book="${i}" title="${b.title}" aria-label="${b.title}, ${b.author}${x.lost ? " (lost)" : ""}">${b.covers.map(tome).join("")}</button>
    ${x.lost ? `<b class="lost-stamp">Lost</b>` : ""}${lip}</div>`;
}

// A line of the reading list; it opens the book like its cover on the shelf.
function readHtml(x) {
  const c = ui.S.chars[x.h.char], read = !x.lost && readOn(x.book);
  return `<li${x.lost ? ` class="lost"` : ""}><button data-book="${x.i}"><span class="rl-night">Night ${ROMAN[x.h.round]}</span>
    <span class="rl-text"><b>${x.book.title}</b> <i>${x.book.author}</i><small>${c.name}, ${lowerFirst(title(x.h.role || c.role))}${read
      ? ` · read ${dayOf(read)}` : ""}</small></span></button></li>`;
}

// When a book won was finished (reading.js keeps it by its BOOKS key), or undefined while it waits to be read.
const readOn = (book) => (ui.read || {})[Object.keys(BOOKS).find((k) => BOOKS[k] === book)];
const dayOf = (t) => new Date(t).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

// The book open large over the tab: its cover as the plate on the left page; on the right its title, its line and where
// it was found, stamped as yours to read, with the day you finished it (or as lost). ‹ › turn to the books beside it.
function bookViewHtml(books) {
  const at = books.findIndex((x) => x.i === bookOpen);
  if (at < 0) return "";
  const { h, book: b, lost: isLost } = books[at], c = ui.S.chars[h.char], who = `${c.name}, ${lowerFirst(title(h.role || c.role))}`;
  const read = !isLost && readOn(b);
  const from = isLost ? `Lost with ${who}, who ${h.action === "save" ? "walked free" : "was held for nothing"} on night ${ROMAN[h.round]}.`
    : `Found in the room of ${who}, ${h.action === "save" ? "cleared" : "arrested"} on night ${ROMAN[h.round]}.`;
  const step = (d, cls, label) => `<button class="bv-step ${cls}" ${books[at + d] ? `data-book="${books[at + d].i}"` : "disabled"}
    aria-label="${label}">${d < 0 ? "‹" : "›"}</button>`;
  return `<div class="bookview" role="dialog" aria-modal="true" aria-label="${b.title}"><div class="bv-backdrop" data-book="-1"></div>
    <article class="bv-book${isLost ? " lost" : ""}">
      <div class="bv-plate">${coversHtml(b)}</div>
      <div class="bv-text"><span class="bv-kicker">${isLost ? "Lost with a mistake" : "Your reward"}</span>
        <h3>${b.title}</h3><span class="by">${b.author}</span><p class="bv-line">${b.line}</p><p class="bv-from">${from}</p>
        <span class="bv-stamp${read ? " read" : ""}">${isLost ? "Lost" : read ? `Read · ${dayOf(read)}` : "You may read it now"}</span></div>
      <i class="bv-ribbon" aria-hidden="true"></i>
      <nav class="bv-nav">${step(-1, "back", "The previous book")}<span>${at + 1} / ${books.length}</span>${step(1, "next", "The next book")}</nav>
      <button class="bv-close" data-book="-1" title="Close the book (Esc)" aria-label="Close the book">×</button>
    </article></div>`;
}

// Opens the book in place `i` of the shelf, or closes it (-1); the keyboard focus goes with it and comes back.
export function showBook(i) {
  const was = bookOpen, turned = document.activeElement?.closest?.(".bv-step");
  if (was === null) bookFrom = document.activeElement?.closest?.(".readlist") ? ".readlist" : ".shelves";
  bookOpen = i >= 0 ? i : null;
  renderFolder();
  const body = $("tabbody");
  const focus = bookOpen === null ? body.querySelector(`${bookFrom} [data-book="${was}"]`)
    : (turned && body.querySelector(`.bv-step.${turned.classList.contains("back") ? "back" : "next"}:not(:disabled)`)) || body.querySelector(".bv-close");
  focus?.focus({ preventScroll: true });
}

export function closeBook() {
  if (bookOpen === null) return false;
  showBook(-1);
  return true;
}

// A book open large, and the folder not covered by another screen (reading.js makes it inert).
const bookLive = () => bookOpen !== null && !$("tabbody").closest("[inert]");

// ← and → while a book is open: the one beside it. False when no book is open.
export function turnBook(d) {
  if (!bookLive()) return false;
  const step = $("tabbody").querySelector(`.bv-step.${d < 0 ? "back" : "next"}[data-book]`);
  if (step) showBook(+step.dataset.book);
  return true;
}

// Tab and Shift+Tab go round the open book's buttons, so the focus stays with it.
export function tabInBook(e) {
  const keys = bookLive() ? [...$("tabbody").querySelectorAll(".bookview button:not(:disabled)")] : [];
  if (!keys.length) return;
  e.preventDefault();
  const i = keys.indexOf(document.activeElement), n = keys.length;
  keys[i < 0 ? (e.shiftKey ? n - 1 : 0) : (i + (e.shiftKey ? n - 1 : 1)) % n].focus();
}

const lowerFirst = (s) => s[0].toLowerCase() + s.slice(1);

// A guilty role's crime against Lord Edmund, under their role's description.
const crimeHtml = (role) => (CRIMES[role] ? `<div class="crime">${CRIMES[role]}</div>` : "");

// One entry per character slot (so two Confidants and two Lovers). A revealed character fills the slot
// of their role, in reveal order, matching the portraits: the first Confidant revealed is confidant-a.
function roleSlots(team) {
  const S = ui.S;
  const found = {};
  const order = [...S.history.map((h) => h.char), ...S.chars.map((c) => c.id)].filter((id) => S.chars[id].role !== undefined);
  [...new Set(order)].forEach((id) => (found[S.chars[id].role] = found[S.chars[id].role] || []).push(S.chars[id]));
  const seen = {};
  return S.roster.filter((r) => ROLES[r][0] === team).map((r) => {
    const i = seen[r] = (seen[r] ?? -1) + 1;
    const pair = S.roster.filter((x) => x === r).length > 1;
    return { role: r, art: roleArt(r, pair ? "ab"[i] : ""), who: (found[r] || [])[i] };
  });
}

// A role's dossier card: its portrait, flavour line, what it does step by step and (for a guilty role) its crime.
// `who` is the guest found holding it, if any. It opens across its row of the grid (roleTile).
function roleCard(role, art, who, key) {
  const side = ROLES[role][0];
  let found = "";
  if (who) {
    const how = who.how === "save" ? `cleared in round ${ROMAN[who.removedRound]}`
      : who.how === "eliminate" ? `arrested in round ${ROMAN[who.removedRound]}` : "still in the house at the end";
    found = `<div class="found-by"><span class="tag ${side}">${who.name}</span> the ${who.profession}, ${how}</div>`;
  }
  return `<article class="rolecard ${side}${who ? " found" : ""}">
    <button class="rc-close" data-tile="${key}" title="Close" aria-label="Close">×</button>
    <div class="rc-art">${portrait(role, "", art)}${who ? `<span class="rc-stamp">Found</span>` : ""}</div>
    <div class="rc-body"><h4>${role}${plannedHtml(role)}</h4>${found}
      <p class="rc-flavor">${ROLES[role][2] || ""}</p>${stepsHtml(role)}${crimeHtml(role)}</div></article>`;
}

// A role in the grid: its portrait and name, and who holds it once found. Click it to open its card.
let openTile = null;
export function toggleRole(key) {
  openTile = openTile === key ? null : key;
  renderFolder();
  const card = $("tabbody").querySelector(".rolecard");
  if (card) showInFolder($("tabbody"), card);
}

function roleTile(key, role, art, who) {
  if (openTile === key) return roleCard(role, art, who, key);
  const side = ROLES[role][0];
  return `<button class="roletile ${side}${who ? " found" : ""}" data-tile="${key}" title="${role}: what the role does">
    <span class="rt-art">${portrait(role, "", art)}${who ? `<span class="rc-stamp">Found</span>` : ""}</span>
    <span class="rt-name">${role}${plannedHtml(role)}</span>${who ? `<span class="rt-who">${who.name}</span>` : ""}</button>`;
}

// One side of this case: a pip per role (found, held by a sealed guest, or unknown), the guests whose
// role stays sealed after a mistake, and a card per role.
function sideHtml(team) {
  const S = ui.S;
  const slots = roleSlots(team), found = slots.filter((s) => s.who).length;
  const sealed = S.chars.filter((c) => c.role === undefined && c.bad === (team === "bad"));
  const unknown = slots.length - found - sealed.length;
  const pips = ["found", "sealed", "unknown"].map((k, i) => `<i class="${k}"></i>`.repeat([found, sealed.length, unknown][i])).join("");
  const counts = [`${found} of ${slots.length} found`, sealed.length ? `${sealed.length} sealed` : "", unknown ? `${unknown} unknown` : ""];
  const guests = sealed.map((c) => `<span class="sealed-guest">${portrait(c.name, "", c.portrait)}<b>${c.name}</b>
    <small>${c.how === "save" ? "cleared" : "arrested"} in round ${ROMAN[c.removedRound]}</small></span>`).join("");
  return `<section class="side ${team}">
    <div class="side-head"><h3>${SIDE[team]}</h3><span class="rolepips" title="${counts.filter(Boolean).join(", ")}">${pips}</span>
      <span class="count">${counts.filter(Boolean).join(" · ")}</span></div>
    ${sealed.length ? `<div class="sealed-row"><p><span class="seal">🔒</span> Misjudged, so their roles stay sealed until the case is closed:
      ${sealed.length === 1 ? "this guest holds one" : `these ${sealed.length} guests hold ${sealed.length}`} of the unfound roles below.</p>${guests}</div>` : ""}
    <div class="rolegrid">${slots.map((sl, i) => roleTile(team + i, sl.role, sl.art, sl.who)).join("")}</div></section>`;
}

// This case's roles, side by side.
function rolesHtml() {
  return `<div class="rules roles-tab"><p>The roles in this case. You know which roles are in the house, but not who holds them:
    a role is found once you have rightly cleared or arrested its guest, while a mistake keeps it sealed until the case is closed.
    Click a role to see what it does.</p>
    <div class="evkinds rolekinds"><h3>How to read a role</h3>${stepsLegendHtml()}</div>
    ${sideHtml("good")}${sideHtml("bad")}</div>`;
}

// The case's nights as a row of medals, then a card per event: those that have happened in the order
// of their nights, tonight's, the ones still to come, and the last night.
function eventsHtml() {
  const S = ui.S;
  const range = Array.from({ length: S.rounds }, (_, i) => i + 1);
  const nightOf = {};  // the schedule is fixed, so every event's night is known from the start
  range.forEach((r) => {
    const e = nightEvent(S, r);
    if (e) nightOf[e] = r;
  });
  const state = (r) => (r === undefined || (r > S.round && !S.finished) ? "future" : r === S.round && !S.finished ? "now" : "past");
  const stamp = (r) => (r === undefined ? "Still to come" : state(r) === "now" ? "Tonight" : `Night ${ROMAN[r]}`);
  // every night shows its event and its kind (events.js NIGHTS); one still to come has a dashed rim
  const nights = range.map((r) => {
    const g = nightGroup(r), last = r === S.rounds && g.lastNight, e = nightEvent(S, r);
    const icon = e ? EVENTS[e][0] : last ? LAST_NIGHT[0] : g.icon;
    const medal = `<span class="medal">${icon}</span><span class="n">${ROMAN[r]}</span><span class="kind">${g.icon}</span>`;
    const target = e ? EVENTS[e][1] : last ? LAST_NIGHT[1] : null;
    const what = e ? (S.events[r] ? e : `${e}, still to come`) : last ? "the drawing room" : g.name;
    const cls = `${state(r)}${S.events[r] || last ? "" : " expected"}${r > 1 && (r - 1) % HALF === 0 ? " half" : ""}`;
    return `<li class="${cls}" title="Night ${ROMAN[r]} · ${g.name}: ${what}">
      ${target ? `<a href="#ev-${target}">${medal}</a>` : medal}</li>`;
  }).join("");
  // the kinds of night, explained like a role's steps; then the cards under their groups (the last night
  // in the group marked lastNight)
  const other = Object.keys(EVENTS).filter((e) => eventGroup(e).events.length === 0);
  const groups = [...GROUPS.map((g) => [g, g.events.filter((e) => EVENTS[e])]), ...(other.length ? [[eventGroup(other[0]), other]] : [])];
  const kinds = groupStepsHtml(groups.map(([g]) => [g, g.what || "Events of their own kind."]));
  const card = (e) => eventCard(e, EVENTS[e], state(nightOf[e]), stamp(nightOf[e]), eventGroup(e));
  const lastCard = (g) => eventCard("The drawing room", LAST_NIGHT, state(S.rounds), `Night ${ROMAN[S.rounds]}`, g);
  const when = (g) => range.filter((r) => nightGroup(r) === g).map((r) => ROMAN[r]);  // the group's nights, the last one's too
  const head = (g, ns = when(g)) => `<h3 class="evgroup-head"><span class="step-icon">${g.icon}</span>${g.name}${ns.length
    ? `<small>${ns.length > 1 ? "nights" : "night"} ${ns.join(" and ")}</small>` : ""}</h3>`;
  const sections = groups.map(([g, events]) => `<section class="evgroup">${head(g)}
    <div class="evcards">${events.map(card).join("")}${g.lastNight ? lastCard(g) : ""}</div></section>`).join("");
  return `<div class="rules"><p>The eight nights run the same in every case, in two halves. Each half opens with the guests learning
    something and ends with the house going quiet: night I is ${Object.keys(EVENTS)[0]}, II the Notebook, III the Footprints and
    IV the Blackout; then V is the Séance, VI the Dinner Party, VII the Inquest and VIII the drawing room.</p>
    <ol class="nights">${nights}</ol>
    <div class="evkinds"><h3>${groups.length} kinds of night</h3>${kinds}</div>${sections}</div>`;
}

// An event's card: its scene, name and atmosphere, then what it does as a step under its group's label.
function eventCard(name, [icon, scene, mood, meaning], state, stamp, group) {
  return `<article class="evcard ${state}" id="ev-${scene}">
    <div class="evart"><img src="art/events/${scene}.svg" alt=""><span class="medal">${icon}</span><span class="evstamp">${stamp}</span></div>
    <div class="evtext"><h3>${name}${plannedEventHtml(name)}</h3><p class="mood">${mood}</p>${groupStepsHtml([[group, meaning]])}</div></article>`;
}

// The Rules tab: the case's standing orders, told with this case where it can (its nights, its culprits' signs). A
// contents card leads to a section per subject, each with a small picture drawn with the board's own marks (board.css,
// board.js noteSvg). Styles in css/rules.css; the tab's tour (tours.js RULES) points at its parts.
function rulesHtml() {
  const S = ui.S;
  const n = S.roster.length, good = S.roster.filter((r) => ROLES[r][0] === "good").length, decisions = 2 * S.rounds;
  const traced = [...new Set(S.roster)].filter((r) => TRACES[r]);
  const parts = [
    ["verdict", "The verdict on you", "a point for every right call", verdictHtml(decisions)],
    ["day", "A day at Ravenhill", "from the night's work to your two calls", dayHtml()],
    ["nights", "The eight nights", "the same in every case", nightsHtml()],
    traced.length && ["signs", "Signs in the night", "what a sign that stops tells you", signsHtml(traced)],
    ["board", "Reading the board", "the marks on the photographs", boardHtml()],
    ["seating", "The seating", "who holds whose hand", seatingHtml()],
    ["house", "House rules", "pairs, grudges, sealed roles, clues", houseHtml()],
  ].filter(Boolean);
  const tile = (icon, num, label, i) => `<div class="tile" style="--i:${i}"><span class="ti">${icon}</span><b>${num}</b><span>${label}</span></div>`;
  const contents = parts.map(([id, head, gist], i) => `<li><a href="#rules-${id}" style="--i:${i}"><i>${ROMAN[i + 1]}</i><b>${head}</b>
    <small>${gist}</small></a></li>`).join("");
  const sections = parts.map(([id, head, , html], i) => `<section class="rsec" id="rules-${id}"><div class="rs-head"><h3><i>${ROMAN[i + 1]}</i>${head}</h3>
    <a class="rs-up" href="#rules-contents" title="Back to the contents" aria-label="Back to the contents">↑</a></div>${html}</section>`).join("");
  return `<div class="rules brief">
    <div class="ruleshero"><img src="art/story/manor.svg" alt=""><div class="rh-text"><span>Case no. 1924/17 · Standing orders</span>
      <h2>The rules of Ravenhill</h2></div><b class="rh-stamp">Scotland Yard</b></div>
    <p class="lede">Lord Edmund Ravenhill lies dead in his library, and the snow has closed the roads. Of the ${n} guests in the house,
    ${good} are innocent. The other ${n - good} wronged him on his birthday night: two secret lovers poisoned him, and each of the rest did
    something of their own, without knowing what the others were about. Now the guilty lie to save their own skin,
    and cover for any other culprit they find out. Before the thaw, clear the innocent and arrest the guilty.</p>
    <div class="glance">${tile("👥", countUp(n), "guests", 0)}${tile("⚖", `${countUp(good)}<i>·</i>${countUp(n - good)}`, "innocent · guilty", 1)}
      ${tile("🌙", countUp(S.rounds), "nights", 2)}${tile("★", countUp(decisions), "best score", 3)}</div>
    <nav class="contents" id="rules-contents" aria-label="Contents"><b class="ct-head" aria-hidden="true">Contents</b>
      <ol style="--rows:${Math.ceil(parts.length / 2)}">${contents}</ol></nav>
    ${sections}${moreHtml()}</div>`;
}

// A number that counts up from nought as the tab opens (rules.css .rl-count).
const countUp = (v) => `<span class="rl-count" style="--n:${v}">${v}</span>`;

// I: a point for each right call, as a table of the four outcomes, then the verdicts.
function verdictHtml(decisions) {
  const cell = (ok) => (ok ? `<td class="pt-ok"><b>+1</b><small>a right call</small></td>` : `<td class="pt-no"><b>0</b><small>a mistake</small></td>`);
  return `<p>Every night you clear one guest and arrest one: ${decisions} calls in all, and a point for each one you get right.</p>
    <table class="pointtable"><thead><tr><td></td><th><span class="smp-pin good"></span>Innocent</th><th><span class="smp-pin bad"></span>Guilty</th></tr></thead>
      <tbody><tr><th><span class="pt-stamp cleared">Cleared</span></th>${cell(true)}${cell(false)}</tr>
      <tr><th><span class="pt-stamp arrested">Arrested</span></th>${cell(false)}${cell(true)}</tr></tbody></table>
    <p>When the thaw comes, the Yard reads your score:</p>${ranksHtml(decisions)}`;
}

// The verdicts of RANKS (board.js) as a ladder, the best at the top: each rung a medal with the scores that earn it and
// the verdict, and under it those scores lit on a row of a pip per call.
function ranksHtml(decisions) {
  const from = (share) => Math.ceil(share * decisions);
  return `<ol class="ranks">${RANKS.map(([share, line], i) => {
    const lo = from(share), hi = i ? from(RANKS[i - 1][0]) - 1 : decisions;
    const pips = Array.from({ length: decisions }, (_, k) => `<i${k + 1 >= lo && k + 1 <= hi ? ` class="on"` : ""}></i>`).join("");
    return `<li class="r${i}"><div class="rk-plaque"><b class="rk-medal">${lo === hi ? lo : `${lo}–${hi}`}</b><span class="rk-line">${line}</span>
      <span class="rk-pips" aria-hidden="true">${pips}</span></div></li>`;
  }).join("")}</ol>`;
}

// II: the hours of a day along the sun's path over a strip of sky, then what each brings: first what the house does,
// then your two calls and what follows them.
const DAY = [
  ["00:00", "🌙", "Night", "The guests investigate in secret, and the guilty go about their work."],
  ["06:30", "🌅", "Dawn", "The morning's card shows the signs of the night; after nights II and III, a clue of your own too."],
  ["09:00", "🗣", "Testimony", "Every guest still in the house names one guest to clear and one to arrest (at a Dinner Party or an Inquest, only one of the two). The guilty lie."],
  ["12:00", `<b class="ok">✓</b>`, "Clear", "Send one guest to the morning room: +1 if they are innocent."],
  ["15:00", `<b class="no">✕</b>`, "Arrest", "Send one guest to the wine cellar: +1 if they are guilty."],
  ["18:00", "🔍", "The search", "Their rooms are searched. A right call shows the guest's role, a mistake only their side. Either way, they give no more testimony."],
];

function dayHtml() {
  const sun = (x) => 88 - 64 * Math.sqrt(Math.max(0, 1 - ((x - 50) / 45) ** 2));  // the path's height at x, both in % of the strip
  const path = Array.from({ length: 91 }, (_, i) => `${i ? "L" : "M"}${i + 5} ${sun(i + 5).toFixed(1)}`).join("");
  const stops = DAY.map(([time, icon, name], i) => {
    const x = 9 + i * 16.4;
    return `<span class="ds-stop" style="--i:${i};--x:${x}%;--y:${sun(x).toFixed(1)}%"><span class="medal">${icon}</span>
      <small>${time}</small><b>${name}</b></span>`;
  }).join("");
  const steps = (from, to) => DAY.slice(from, to).map(([time, icon, name, text], i) => `<li class="ds-${from + i}"><span class="ds-icon">${icon}</span>
    <div><h5>${name}<small>${time}</small></h5><p>${text}</p></div></li>`).join("");
  return `<div class="daysky"><svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path class="arc" d="${path}"/>
      <path class="hills" d="M0 90Q12 84 24 89T50 88T76 87T100 89V100H0Z"/></svg>${stops}</div>
    <div class="daysteps"><div><h4>The house</h4><ol>${steps(0, 3)}</ol></div><div><h4>Your calls</h4><ol start="4">${steps(3)}</ol></div></div>`;
}

// III: the case's nights, then the last one.
function nightsHtml() {
  const S = ui.S;
  return `<p>Every case runs the same eight nights, in two halves. Each half opens with the guests learning something and ends with the house
    going quiet; in between, the first half hands you two clues and the second changes the testimony twice.</p>
    ${nightGridHtml()}
    <div class="showdown"><img src="art/finale/drawing-room.svg" alt=""><div class="sd-text"><span>Night ${ROMAN[S.rounds]} · the last night</span>
      <h4>${LAST_NIGHT[0]} The drawing room</h4><p>Two guests remain, and nobody advises any more. ${LAST_NIGHT[3]}</p></div></div>`;
}

// The case's nights in two halves, a row of four each (events.js NIGHTS): over the nights their kinds, one label
// over two nights of the same kind, and each night with its moon, its event and its icon. Tonight is marked.
function nightGridHtml() {
  const S = ui.S;
  const night = (r) => {
    const g = nightGroup(r), last = r === S.rounds, e = nightEvent(S, r);
    const name = e || (last ? "The drawing room" : g.name), icon = e ? EVENTS[e][0] : last ? LAST_NIGHT[0] : "";
    const tip = e ? EVENTS[e][4] : last ? "Name the one you believe is guilty; the other goes free." : g.what;
    const state = S.finished || r < S.round ? "past" : r === S.round ? "now" : "future";
    return `<div class="ng-night ${state}${last ? " last" : ""}" title="${tip}">${moonSvg(r / S.rounds)}
      <b>${ROMAN[r]}</b><span>${name}</span>${icon ? `<i class="ng-icon">${icon}</i>` : ""}${state === "now" ? "<em>tonight</em>" : ""}</div>`;
  };
  const kind = ([r, n]) => { const g = nightGroup(r); return `<div class="ng-kind" style="grid-column:span ${n}" title="${g.what}"><span>${g.icon}</span><b>${g.name}</b></div>`; };
  const halves = [];
  for (let from = 1; from <= S.rounds; from += HALF) {
    const nights = Array.from({ length: Math.min(HALF, S.rounds - from + 1) }, (_, i) => from + i);
    const runs = [];  // [first night, how many] for each run of nights of one kind
    nights.forEach((r) => (runs.length && nightGroup(r) === nightGroup(r - 1) ? runs[runs.length - 1][1]++ : runs.push([r, 1])));
    const label = `${from === 1 ? "First" : "Second"} half · nights ${ROMAN[from]}–${ROMAN[nights[nights.length - 1]]}`;
    halves.push(`<div class="nightgrid" role="group" aria-label="${label}"><span class="ng-half">${label}</span>${runs.map(kind).join("")}${nights.map(night).join("")}</div>`);
  }
  return halves.join("");
}

// IV: this case's signs, after a small example of one that stops: of two signs one morning, the second is gone the
// next (the Lovers' last, as their whispers stop once either of them leaves).
function signsHtml(traced) {
  const S = ui.S, who = (r) => (r === "Lover" ? "The Lovers" : title(r));
  const [a, b] = [...traced.filter((r) => r !== "Lover"), ...traced.filter((r) => r === "Lover")], gone = b || a;
  const tag = (r, cls = "") => `<li class="sd-tag${cls}"><span>${TRACES[r][0]}</span>${TRACES[r][2]}</li>`;
  const demo = `<figure class="signdemo"><div class="sd-morning"><span class="sd-when">One morning</span><ul>${tag(a)}${b ? tag(b) : ""}</ul></div>
    <span class="sd-arrow" aria-hidden="true">→</span>
    <div class="sd-morning"><span class="sd-when">The next morning</span><ul>${b ? tag(a) : ""}${tag(gone, " gone")}</ul></div>
    <figcaption>${gone === "Lover" ? "The Lovers' sign stopped, so at least one of them was among"
      : `${title(gone)}'s sign stopped, so ${lowerFirst(title(gone))} was one of`} the two guests you sent away the day before.</figcaption></figure>`;
  const cards = traced.map((r) => `<div class="signcard"><span class="si">${TRACES[r][0]}</span><b>${TRACES[r][2]}</b><span>${who(r)}</span></div>`).join("");
  const quiet = [...new Set(S.roster)].filter((r) => ROLES[r][0] === "bad" && !TRACES[r]).map((r, i) => (i ? lowerFirst(title(r)) : title(r)));
  const none = quiet.length ? `${quiet.length > 1 ? `${quiet.slice(0, -1).join(", ")} and ${quiet[quiet.length - 1]} leave` : `${quiet[0]} leaves`} no sign. ` : "";
  return `<p>Every morning's card says what the night left behind. A sign shows while its culprit is in the house, and stops once they are gone.</p>
    ${demo}
    <p>The signs in this case:</p><div class="signgrid">${cards}</div>
    <p class="aside">${traced.includes("Lover") ? "The Lovers whisper only while both of them are in the house. " : ""}${none}In a Blackout
    nobody works, so that morning shows no sign: compare the next one with the morning before it.</p>`;
}

// V: the board's marks, each beside a sample of it.
function boardHtml() {
  const sample = (visual, head, text) => `<div class="sample"><div class="visual">${visual}</div><p><b>${head}</b>${text}</p></div>`;
  const pins = ["", "good", "bad"].map((c) => `<span class="smp-pin ${c}"></span>`).join("");
  const notes = [1, 2].map((m) => `<span class="smp-polaroid"><span class="scrawl">${noteSvg(m)}</span></span>`).join("");
  return `<div class="samples">
    ${sample('<span class="smp-badge"><span class="s"><i>✓</i>3</span><span class="e"><i>✕</i>1</span></span>', "The tally",
      "Today's testimony about a guest: how many advise clearing them, and how many arresting.")}
    ${sample(`<svg class="smp-strings" viewBox="0 0 92 40" aria-hidden="true"><path class="out e" d="M6 8 Q46 30 86 8"/>
      <path class="out s" d="M6 20 Q46 40 86 20"/><path class="in e" d="M6 32 Q46 46 86 32"/></svg>`, "Strings",
      "Point at a photograph (not on a phone): solid strings for that guest's own advice, dashed for advice about them. Red means arrest, green clear.")}
    ${sample(pins, "Pins", "Gold while a guest is in the house, green once they are known to be innocent, red once known to be guilty.")}
    ${sample(notes, "Your notes", "Click the small circle on a photograph to mark the guest guilty, then innocent, then unsure again.")}
    ${sample('<span class="smp-piles"><i class="g">3</i><i class="u">9</i><i class="n">2</i></span>', "Piles",
      "The Theory tab sorts your notes into piles and counts how many of the guilty are still hidden.")}
    ${sample('<span class="smp-polaroid guess"><span>Lover?</span></span>', "Guesses", "Guess a guest's role in the Theory tab, and it is pencilled on their photograph.")}
  </div>`;
}

// VI: the table, and a guest's neighbours closing up once they leave.
function seatingHtml() {
  return `<div class="seating">${seatingSvg()}<div>
    <p>The guests sit in a circle, numbered clockwise from the top (on a phone the board shows them in rows, in the same order). At a Séance
    everyone holds hands with both neighbours: #5 with #4 and #6, and #15 with #14 and #0.</p>
    ${closeUpSvg()}<p>When a guest leaves, their neighbours close up: with #5 gone, #4 and #6 hold hands.</p>
    <p class="aside">First Impressions has nothing to do with the seating: each guest sizes up one other guest, picked at random.</p></div></div>`;
}

// The seating as a small ring of 16 seats: #5 holds hands with #4 and #6 at a Séance.
function seatingSvg() {
  const at = (i, r) => [60 + r * Math.cos(-Math.PI / 2 + (i * Math.PI) / 8), 60 + r * Math.sin(-Math.PI / 2 + (i * Math.PI) / 8)];
  const seats = Array.from({ length: 16 }, (_, i) => {
    const [x, y] = at(i, 47), cls = i === 5 ? "me" : i === 4 || i === 6 ? "hand" : "";
    return `<g class="seat ${cls}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.6"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${i}</text></g>`;
  }).join("");
  return `<svg class="smp-seating" viewBox="0 0 120 120" aria-hidden="true"><circle class="table" cx="60" cy="60" r="27"/>
    <path class="hands" d="${arc(at, 4, 6, 57)}"/>${seats}</svg>`;
}

const arc = (at, from, to, r) => {
  const [x1, y1] = at(from, r), [x2, y2] = at(to, r);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};

// Seats #4, #5 and #6 in a row once #5 has left: its place is empty, and #4 and #6 hold hands across it.
function closeUpSvg() {
  const seat = (x, n, cls) => `<g class="seat ${cls}"><circle cx="${x}" cy="28" r="9"/><text x="${x}" y="28">${n}</text></g>`;
  return `<svg class="smp-closeup" viewBox="0 0 150 52" aria-hidden="true"><path class="hands" d="M28 20Q75 -6 122 20"/>
    ${seat(25, 4, "hand")}${seat(75, 5, "gone")}${seat(125, 6, "hand")}<text class="left" x="75" y="48">gone</text></svg>`;
}

// VII: the rules that hold in every case.
function houseHtml() {
  const house = (icon, name, text) => `<div class="house"><span class="icon">${icon}</span><div><b>${name}</b><p>${text}</p></div></div>`;
  return `<div class="houserules">
    ${house("👥", "Pairs", `The two Confidants spent the night of the murder together, so each knows the other is innocent and advises clearing them.
      The two Lovers know each other too: they never name each other, and on a day with both tips they share at least one. A guest
      who is bribed or hypnotised says what they must, though.`)}
    ${house("😠", "Grudges", "Guests are more suspicious of whoever advised arresting them the day before.")}
    ${house("🔒", "Sealed roles", "A guest you misjudged shows only their side until the case is closed, so a mistake teaches you less than a right call.")}
    ${house("🔎", "Clues", "On night II a notebook is left open for you, and on night III footprints name two guests, at least one of them guilty. Both are on that night's card, on the case note and in the Case file.")}
  </div>`;
}

// Where to read more: the folder's other tabs, and the buttons at the top of the page (a label clicks its button).
function moreHtml() {
  const press = (id, text) => `<label class="rl-key" for="${id}">${text}</label>`;
  return `<footer class="rules-more"><b class="rm-head">Further reading</b>
    <p>In this folder, <b>Roles</b> explains every role in the house and <b>Events</b> every night. At the top of the page, ${press("briefing", "Story")}
    replays the opening's five chapters: the story, how to play, a case in miniature, Inspector Hollis's advice and the case papers.
    ${press("howto", "How to play")}, ${press("minicase", "Mini case")} and ${press("tips", "Advice")} play one chapter each.</p></footer>`;
}
