// The case folder: Testimony (the advice ledger), Theory (your notes in piles), Case file (your decisions and clues), Roles (this case's,
// then the others), Events and Rules. It is closed by default; its tabs stick out of the right edge of the desk.
import { CLUES, factText } from "./clues.js";
import { EVENTS, GROUPS, LAST_NIGHT, eventGroup, groupStepsHtml, nightEvent, nightGroup, plannedEventHtml } from "./events.js";
import { ROMAN, guestRef, moonSvg } from "./format.js";
import { portrait, roleArt } from "./portrait.js";
import { CRIMES, ROLES, SIDE, plannedHtml, stepsHtml, stepsLegendHtml, title } from "./roles.js";
import { $, patch, showInFolder, ui } from "./state.js";
import { RANKS, noteSvg } from "./board.js";
import { TRACES } from "./night.js";
import { markChips, testimonyHtml } from "./testimony.js";
import { theoryHtml } from "./theory.js";

const VIEWS = { testimony: testimonyHtml, theory: theoryHtml, casefile: caseFileHtml, roles: rolesHtml, events: eventsHtml, rules: rulesHtml };
const TITLES = { testimony: "Testimony", theory: "Theory", casefile: "Case file", roles: "Roles", events: "Events", rules: "Rules" };
export const TABS = Object.keys(VIEWS);

let shownTab = null;  // a newly opened tab starts at its top

export function renderFolder() {
  document.querySelectorAll(".folder-tabs button").forEach((t) => t.classList.toggle("active", t.dataset.tab === ui.tab));
  $("desk").classList.toggle("folder-open", ui.folderOpen);
  $("folder-title").textContent = TITLES[ui.tab];
  if (!ui.folderOpen || !ui.S) return;
  patch($("tabbody"), VIEWS[ui.tab]());
  if (shownTab !== ui.tab) $("tabbody").scrollTop = 0;
  shownTab = ui.tab;
  markChips();
}

function caseFileHtml() {
  const S = ui.S;
  const entries = [
    ...S.history.map((x) => ({ round: x.round, html: decisionHtml(x) })),
    ...S.notebooks.map((x) => ({ round: x.round, html: clueHtml("notebook", x.char, x.round,
      (x.older ? "earlier pages: " : "") + (x.facts.length ? x.facts.map(factText).join("; ") : "nothing new in the notebook")) })),
    ...Object.entries(S.footprints || {}).map(([r, [a, b]]) => ({ round: Number(r), html: footprintsHtml(Number(r), a, b) })),
    ...S.interviews.map((x) => ({ round: x.round, html: clueHtml("interview", x.speaker, x.round,
      `questioned again: clear ${guestRef(x.save)}, arrest ${guestRef(x.eliminate)}`) })),
  ];
  if (!entries.length) return `<p class="noinfo">The case file is empty. Your decisions and clues will be recorded here.</p>`;
  return entries.sort((a, b) => b.round - a.round).map((e) => e.html).join("");
}

// After a mistake the role stays sealed until the case is closed; only the guest's side is known.
function decisionHtml(x) {
  const c = ui.S.chars[x.char];
  const was = x.role ? title(x.role).toLowerCase() : `${SIDE[c.bad ? "bad" : "good"]}, the role sealed until the thaw`;
  return `<div class="chron">${portrait(x.role || c.name, "", c.art)}<div><div class="t">Round ${ROMAN[x.round]} · ${x.action === "save" ? "Cleared" : "Arrested"}</div>
    <div><b>${c.name}</b>, the ${c.profession}, was ${was} <span class="${x.ok ? "ok" : "no"}">${x.ok ? "+1" : "0"}</span></div></div></div>`;
}

function footprintsHtml(round, a, b) {
  const [icon, label] = CLUES.footprints;
  return `<div class="chron clue"><span class="clue-mark">${icon}</span><div><div class="t">Round ${ROMAN[round]} · ${label}</div>
    <div>The prints match <b>${guestRef(a)}</b> and <b>${guestRef(b)}</b>: at least one of them is guilty.</div></div></div>`;
}

function clueHtml(tool, c, round, text) {
  const [icon, label] = CLUES[tool];
  return `<div class="chron clue"><span class="clue-mark">${icon}</span><div><div class="t">Round ${ROMAN[round]} · ${label}</div>
    <div><b>${ui.S.chars[c].name}</b>: ${text}</div></div></div>`;
}

// A conspirator's crime against Lord Edmund, under their role's description.
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

// A role's dossier card: its portrait, flavour line, what it does step by step and (for a conspirator) its crime.
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
let openTile = null, spareOpen = false;
export function toggleRole(key) {
  openTile = openTile === key ? null : key;
  if (key.startsWith("x")) spareOpen = true;
  renderFolder();
  const card = $("tabbody").querySelector(".rolecard");
  if (card) showInFolder($("tabbody"), card);
}
$("tabbody").addEventListener("toggle", (e) => e.target.matches("details.spare") && (spareOpen = e.target.open), true);

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

// This case's roles, side by side, then the roles kept for other cases, folded away.
function rolesHtml() {
  const S = ui.S;
  const inGame = new Set(S.roster);
  const spare = (team) => Object.keys(ROLES).filter((r) => !inGame.has(r) && ROLES[r][0] === team);
  const cards = (team) => spare(team).map((r) => roleTile("x" + r, r, roleArt(r))).join("");
  const n = spare("good").length + spare("bad").length;
  return `<div class="rules roles-tab"><p>The roles in this case. You know which roles are in the house, but not who holds them:
    a role is found once you have rightly cleared or arrested its guest, while a mistake keeps it sealed until the case is closed.
    Click a role to see what it does.</p>
    <div class="evkinds rolekinds"><h3>How to read a role</h3>${stepsLegendHtml()}</div>
    ${sideHtml("good")}${sideHtml("bad")}
    <details class="spare"${spareOpen ? " open" : ""}><summary>Not in this case <span>${n} roles kept for future mysteries</span></summary>
      <h4>${SIDE.good}</h4><div class="rolegrid">${cards("good")}</div>
      <h4>${SIDE.bad}</h4><div class="rolegrid">${cards("bad")}</div></details></div>`;
}

// The case's nights as a row of medals, then a card per event: those that have happened in the order
// of their nights, tonight's, the ones still to come, and the last night.
function eventsHtml() {
  const S = ui.S;
  const nightOf = {};
  Object.entries(S.events).forEach(([r, e]) => (nightOf[e] = Number(r)));
  const state = (r) => (r === undefined || (r > S.round && !S.finished) ? "future" : r === S.round && !S.finished ? "now" : "past");
  const stamp = (r) => (r === undefined ? "Still to come" : state(r) === "now" ? "Tonight" : `Night ${ROMAN[r]}`);
  // every night shows its kind (the groups come round in cycles); a night still to come shows its event when the
  // schedule already settles it, else its kind's icon and the events it could be
  const nights = Array.from({ length: S.rounds }, (_, i) => i + 1).map((r) => {
    const g = nightGroup(r), last = r === S.rounds && g.lastNight, e = nightEvent(S, r);
    const icon = e ? EVENTS[e][0] : last ? LAST_NIGHT[0] : g.icon;
    const medal = `<span class="medal">${icon}</span><span class="n">${ROMAN[r]}</span><span class="kind">${g.icon}</span>`;
    const target = e ? EVENTS[e][1] : last ? LAST_NIGHT[1] : null;
    const what = e ? (S.events[r] ? e : `${e}, still to come`) : last ? "the drawing room" : g.events.filter((x) => EVENTS[x]).join(" or ");
    const cls = `${state(r)}${S.events[r] || last ? "" : e ? " expected" : " unknown"}${r > 1 && (r - 1) % GROUPS.length === 0 ? " cycle" : ""}`;
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
  const head = (g) => `<h3 class="evgroup-head"><span class="step-icon">${g.icon}</span>${g.name}</h3>`;
  const sections = groups.map(([g, events]) => `<section class="evgroup">${head(g)}
    <div class="evcards">${events.map(card).join("")}${g.lastNight ? lastCard(g) : ""}</div></section>`).join("");
  return `<div class="rules"><p>The four kinds of night come round twice, always in the same order: the guests learn something,
    you learn something, the testimony changes, and the house goes quiet. Nights I–IV are the first round, nights V–VIII the
    second. Night I is always ${Object.keys(EVENTS)[0]}, night IV the Blackout and night VIII the drawing room; which clue and
    which testimony night come first changes from case to case.</p>
    <ol class="nights">${nights}</ol>
    <div class="evkinds"><h3>${groups.length} kinds of night</h3>${kinds}</div>${sections}</div>`;
}

// An event's card: its scene, name and atmosphere, then what it does as a step under its group's label.
function eventCard(name, [icon, scene, mood, meaning], state, stamp, group) {
  return `<article class="evcard ${state}" id="ev-${scene}">
    <div class="evart"><img src="art/events/${scene}.svg" alt=""><span class="medal">${icon}</span><span class="evstamp">${stamp}</span></div>
    <div class="evtext"><h3>${name}${plannedEventHtml(name)}</h3><p class="mood">${mood}</p>${groupStepsHtml([[group, meaning]])}</div></article>`;
}

// The Rules tab: the case's standing orders, told with this case where it can (its nights, its conspirators'
// signs). The samples reuse the board's own looks (board.css, board.js noteSvg).
function rulesHtml() {
  const S = ui.S;
  const n = S.roster.length, good = S.roster.filter((r) => ROLES[r][0] === "good").length, decisions = 2 * S.rounds;
  const h3 = (num, text) => `<h3><i>${ROMAN[num]}</i>${text}</h3>`;
  const tile = (icon, num, label) => `<div class="tile"><span class="ti">${icon}</span><b>${num}</b><span>${label}</span></div>`;
  const hour = (time, icon, name, text) => `<li><span class="medal">${icon}</span><div><span class="clock">${time}</span><h4>${name}</h4><p>${text}</p></div></li>`;
  const sample = (visual, text) => `<div class="sample"><div class="visual">${visual}</div><p>${text}</p></div>`;
  const house = (icon, name, text) => `<div class="house"><span class="icon">${icon}</span><div><b>${name}</b><p>${text}</p></div></div>`;
  const pins = ["", "good", "bad"].map((c) => `<span class="smp-pin ${c}"></span>`).join("");
  const notes = [1, 2].map((m) => `<span class="smp-polaroid"><span class="scrawl">${noteSvg(m)}</span></span>`).join("");
  const signs = [...new Set(S.roster)].filter((r) => TRACES[r])
    .map((r) => `<div class="signcard"><span class="si">${TRACES[r][0]}</span><b>${TRACES[r][2]}</b><span>${title(r)}</span></div>`).join("");
  return `<div class="rules brief">
    <div class="ruleshero"><img src="art/story/manor.svg" alt=""><div class="rh-text"><span>Case no. 1924/17 · Standing orders</span>
      <h2>The rules of Ravenhill</h2></div><b class="rh-stamp">Scotland Yard</b></div>
    <p class="lede">Lord Edmund Ravenhill lies dead in his library, and the snow has closed the roads. ${n} guests remain in the house:
    ${good} are innocent, and the other ${n - good} killed him together. Before the thaw, clear the innocent and arrest the guilty.</p>
    <div class="glance">${tile("👥", n, "guests")}${tile("⚖", `${good}<i>·</i>${n - good}`, "innocent · guilty")}${tile("🌙", S.rounds, "nights")}${tile("★", decisions, "best score")}</div>

    ${h3(1, "The verdict on you")}
    <p>Every night you clear one guest and arrest one: ${decisions} decisions, and a point for each one you get right.
    When the thaw comes, the Yard reads your score.</p>
    ${ranksHtml(decisions)}

    ${h3(2, "A day at Ravenhill")}
    <ol class="dayclock">
      ${hour("00:00", "🌙", "Night", "The guests investigate in secret, and the conspirators go about their work.")}
      ${hour("06:30", "🌅", "Dawn", "The house wakes to the signs of the night, and on some mornings a clue of your own.")}
      ${hour("09:00", "🗣", "Testimony", "Every guest still in the house names one guest to clear and one to arrest. The guilty lie.")}
      ${hour("12:00", '<b class="ok">✓</b>', "Clear", "Send one guest to the morning room: +1 if they are innocent.")}
      ${hour("15:00", '<b class="no">✕</b>', "Arrest", "Send one guest to the wine cellar: +1 if they are guilty.")}
      ${hour("18:00", "🔍", "The search", "Their rooms are searched. A right call reveals the guest's role; a wrong one only their side, and the role stays sealed until the case is closed. Either way, they give no more testimony.")}
    </ol>

    ${h3(3, "The eight nights")}
    <p>The nights come in two rounds of the four kinds of night. Which clue and which testimony night come first changes from case to case.</p>
    ${nightGridHtml()}
    <div class="showdown"><img src="art/finale/drawing-room.svg" alt=""><div class="sd-text"><span>Night ${ROMAN[S.rounds]} · the last night</span>
      <h4>${LAST_NIGHT[0]} The drawing room</h4><p>Two guests remain, and nobody advises any more. ${LAST_NIGHT[3]}</p></div></div>

    ${signs ? `${h3(4, "Signs in the night")}
    <p>Every morning's card says what the night left behind. A sign shows while its conspirator is in the house and stops once
    they are gone, so when one stops, its conspirator was among the guests you just sent away. A Blackout hides them all.</p>
    <div class="signgrid">${signs}</div>` : ""}

    ${h3(signs ? 5 : 4, "Reading the board")}
    <div class="samples">
      ${sample('<span class="smp-badge"><span class="s"><i>✓</i>3</span><span class="e"><i>✕</i>1</span></span>',
        "Today's testimony about a guest: how many advise clearing them, and how many arresting.")}
      ${sample(`<svg class="smp-strings" viewBox="0 0 92 40" aria-hidden="true"><path class="out e" d="M6 8 Q46 30 86 8"/>
        <path class="out s" d="M6 20 Q46 40 86 20"/><path class="in e" d="M6 32 Q46 46 86 32"/></svg>`,
        "Point at a photograph for its strings: solid for that guest's own advice, dashed for advice about them. Red means arrest, green clear.")}
      ${sample(pins, "Pins: gold while a guest is in the house, green once they are known to be innocent, red once known to be guilty.")}
      ${sample(notes, "Your notes: click the small circle on a photograph to mark the guest guilty, then innocent, then unsure again.")}
      ${sample('<span class="smp-piles"><i class="g">3</i><i class="u">9</i><i class="n">2</i></span>',
        "The Theory tab sorts your notes into piles and counts how many conspirators are still hidden.")}
      ${sample('<span class="smp-polaroid guess"><span>Lover?</span></span>', "Guess a guest's role in the Theory tab, and it is pencilled on their photograph.")}
    </div>

    ${h3(signs ? 6 : 5, "The seating")}
    <div class="seating">${seatingSvg()}<p>The guests sit in a circle, numbered clockwise from the top. On the first night everyone
    sizes up the guest in the previous seat (#5 knows about #4), and at a Séance everyone holds hands with both neighbours (#4 and #6).
    As guests leave, their neighbours close up.</p></div>

    ${h3(signs ? 7 : 6, "House rules")}
    <div class="houserules">
      ${house("👥", "Pairs", "The Confidants know each other and always vouch for each other. The Lovers know each other too, and never name each other.")}
      ${house("😠", "Grudges", "Guests are more suspicious of whoever advised arresting them last round.")}
      ${house("🔒", "Sealed roles", "A guest you misjudged shows only their side until the end, so a mistake teaches you less than a success.")}
      ${house("🔎", "Clues", "A Notebook night opens one guest's notebook for you, and Footprints name two guests, at least one of them guilty. Both clues are on that night's card, on the case note and in the Case file.")}
    </div>
    <p class="aside">The <b>Roles</b> tab explains every role in the house, and <b>Events</b> every night.
    For Inspector Hollis's tips on reading the testimony, press <b>Advice</b> at the top of the page.</p></div>`;
}

// The verdicts of RANKS (board.js) as a ladder, each with the scores that earn it.
function ranksHtml(decisions) {
  const from = (share) => Math.ceil(share * decisions);
  return `<ol class="rankladder">${RANKS.map(([share, line], i) => {
    const lo = from(share), hi = i ? from(RANKS[i - 1][0]) - 1 : decisions;
    return `<li class="r${i}"><b>${lo === hi ? lo : `${lo}–${hi}`}</b><span>${line}</span></li>`;
  }).join("")}</ol>`;
}

// The case's nights by kind: a column per kind of night (events.js GROUPS), a row per round of them, each night with
// its moon and its event, or for a night still to come the events it may bring. Tonight is marked.
function nightGridHtml() {
  const S = ui.S;
  const head = GROUPS.map((g) => `<div class="ng-kind" title="${g.what}"><span>${g.icon}</span><b>${g.name}</b></div>`).join("");
  const cells = Array.from({ length: S.rounds }, (_, i) => i + 1).map((r) => {
    const g = nightGroup(r), last = r === S.rounds;
    const name = nightEvent(S, r) || (last ? "The drawing room" : g.events.join(" or ") || g.name);
    const state = S.finished || r < S.round ? "past" : r === S.round ? "now" : "future";
    return `<div class="ng-night ${state}${last ? " last" : ""}" style="grid-column:${GROUPS.indexOf(g) + 1}">${moonSvg(r / S.rounds)}
      <b>${ROMAN[r]}</b><span>${name}</span>${state === "now" ? "<em>tonight</em>" : ""}</div>`;
  }).join("");
  return `<div class="nightgrid">${head}${cells}</div>`;
}

// The seating as a small ring of 16 seats: #5 sizes up #4 on the first night, and holds hands with #4 and #6 at a Séance.
function seatingSvg() {
  const at = (i, r) => [60 + r * Math.cos(-Math.PI / 2 + (i * Math.PI) / 8), 60 + r * Math.sin(-Math.PI / 2 + (i * Math.PI) / 8)];
  const seats = Array.from({ length: 16 }, (_, i) => {
    const [x, y] = at(i, 47), cls = i === 5 ? "me" : i === 4 || i === 6 ? "hand" : "";
    return `<g class="seat ${cls}"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6.6"/><text x="${x.toFixed(1)}" y="${y.toFixed(1)}">${i}</text></g>`;
  }).join("");
  const [x5, y5] = at(5, 38), [x4, y4] = at(4, 38.5);
  return `<svg class="smp-seating" viewBox="0 0 120 120" aria-hidden="true">
    <defs><marker id="look-tip" viewBox="0 0 6 6" refX="5" refY="3" markerWidth="5" markerHeight="5" orient="auto"><path d="M0 0L6 3L0 6Z"/></marker></defs>
    <circle class="table" cx="60" cy="60" r="27"/>
    <path class="hands" d="${arc(at, 4, 6, 57)}"/>
    <path class="look" marker-end="url(#look-tip)" d="M${x5.toFixed(1)} ${y5.toFixed(1)} Q78 60 ${x4.toFixed(1)} ${y4.toFixed(1)}"/>${seats}</svg>`;
}

const arc = (at, from, to, r) => {
  const [x1, y1] = at(from, r), [x2, y2] = at(to, r);
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} A${r} ${r} 0 0 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
};
