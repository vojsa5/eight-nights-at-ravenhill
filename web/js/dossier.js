// A guest's dossier, once the case is closed: what they really did, night by night. Each night what the event taught
// them, their own night's work (whom they checked and what they found, true or false, and why), what the guilty did with
// them (the Forger's ink, the Paymaster's money, the Hypnotist's watch, the Eavesdropper's glass) and the Lovers'
// meetings; each morning what they advised and whether it proved right, and what bent it; then how their part ended. The
// engine keeps it all in its diary (Game.jot) and sends it only once the case is closed (ravenhill/server/state.py
// diary_json). A click on a guest's photograph on the board, or on their name in the Testimony or Crimes tab or in another
// dossier, opens it over the board (css/dossier.css); ‹ › and ← → turn to the guests beside them.
import { EVENTS, LAST_NIGHT } from "./events.js";
import { ROMAN, moonSvg } from "./format.js";
import { TRACES } from "./night.js";
import { portrait } from "./portrait.js";
import { SIDE, title } from "./roles.js";
import { $, ui, verdict } from "./state.js";

let opener = null;  // what opened the dossier: the keyboard goes back to it when the dossier closes

// A guest's name that opens their dossier (the Testimony and Crimes tabs, once the case is closed).
export const dossierLink = (c, html = c.name) =>
  `<button class="dz-link" data-dossier="${c.id}" title="${c.name}'s dossier: what they did, night by night">${html}</button>`;

const lower = (s) => s[0].toLowerCase() + s.slice(1);
const roleOf = (x) => lower(title(ui.S.chars[x].role));  // "the Sleuth", "a Lover"
const isBad = (x) => ui.S.chars[x].bad;

// A guest named in a dossier, in their side's ink; a click opens their own.
const who = (x) => {
  const g = ui.S.chars[x];
  return `<button class="dz-who ${g.bad ? "bad" : "good"}" data-dossier="${x}" title="${g.name}, ${roleOf(x)}: their dossier">${g.name}</button>`;
};
const looks = (bad) => `looked <b class="${bad ? "bad" : "good"}">${bad ? "guilty" : "innocent"}</b>`;

// Facts as the notebooks hold them (ravenhill/notebook.py), marked true or false now that every role is known.
function factHtml(f) {
  if (f.kind === "side") return `${who(f.target)} ${looks(f.bad)}`;
  if (f.kind === "role") return `${who(f.target)} was ${lower(title(f.role))}`;
  if (f.kind === "count") return `${f.k} of ${f.chars.map(who).join(" and ")} looked guilty`;
  return `${who(f.a)} and ${who(f.b)} were on ${f.same ? "the same side" : "different sides"}`;
}

const targets = (f) => (f.kind === "count" ? f.chars : f.kind === "same" ? [f.a, f.b] : [f.target]);

function factTrue(f) {
  if (f.kind === "side") return f.bad === isBad(f.target);
  if (f.kind === "role") return f.role === ui.S.chars[f.target].role;
  if (f.kind === "count") return f.k === f.chars.filter(isBad).length;
  return f.same === (isBad(f.a) === isBad(f.b));
}

// Why a finding was false: the Forger's ink, a disguise, or guesswork ("" for a falsehood passed on from another night).
// The Reporter and the Mole see through a disguise.
function falseWhy(f, e) {
  const roles = f.kind === "role" ? [] : targets(f).map((x) => ui.S.chars[x].role), actor = ui.S.chars[e.char].role;
  if (e.what === "ability" && actor === "Amateur") return "a guess";
  const forger = forgedBy(f, e);
  if (forger !== null) return `forged by ${who(forger)}`;
  if (roles.includes("Grifter")) return "the Grifter's disguise";
  if (roles.includes("Recluse")) return "the Recluse always looks guilty";
  if (e.what === "ability" && actor === "Sleuth" && roles.includes("Mastermind")) return "the Mastermind's cover";
  return "";
}

// The Forger whose ink is on a finding, or null: on the guest's own work tonight (or the Constable's tip), or on the work
// of the guest they had it from tonight (the door listened at, the other Lover, the hypnotised guest).
function forgedBy(f, e) {
  const E = ui.S.diary.filter((x) => x.round === e.round), forger = E.find((x) => x.what === "forge");
  const inked = (x) => x.forged && x.facts.some((y) => JSON.stringify(y) === JSON.stringify(f));
  if (!forger) return null;
  if (inked(e)) return forger.char;
  const from = e.what === "meet" ? e.partner : e.what === "told" ? e.by
    : e.what === "ability" ? E.find((x) => x.what === "follow" && x.char === e.char)?.target : undefined;
  const theirs = (x) => (x.what === "ability" && x.char === from) || (x.what === "tip" && x.to === from);
  return from !== undefined && E.some((x) => theirs(x) && inked(x)) ? forger.char : null;
}

const mark = (ok, yes, no, why = "") => `<span class="dz-mark ${ok ? "hit" : "miss"}">${ok ? `✓ ${yes}` : `✗ ${no}${why ? `: ${why}` : ""}`}</span>`;
const factMark = (f, e) => mark(factTrue(f), "true", "false", factTrue(f) ? "" : falseWhy(f, e));

// What a note says was learned: one fact on its line, several as a list.
function learnedHtml(e) {
  const one = (f) => `${factHtml(f)} ${factMark(f, e)}`;
  if (!e.facts.length) return "nothing new";
  return e.facts.length === 1 ? one(e.facts[0]) : `<ul class="dz-facts">${e.facts.map((f) => `<li>${one(f)}</li>`).join("")}</ul>`;
}

const line = (icon, html, cls = "") => `<li class="dz-line${cls ? " " + cls : ""}"><span class="dz-icon" aria-hidden="true">${icon}</span><div>${html}</div></li>`;
const part = (label, lines) => `<li class="dz-part">${label}</li>${lines.join("")}`;
const ICON = { forge: TRACES.Forger[0], bribe: TRACES.Paymaster[0], hypnotise: TRACES.Hypnotist[0], follow: TRACES.Eavesdropper[0],
  meet: TRACES.Lover[0], silence: "🤐", look: "🔎", tip: "📨", start: "🗝", advice: "🗣", blackout: EVENTS.Blackout[0] };

// One night's own work, as its role does it: a check, a role uncovered, a count, a photograph, a victim, a hunch.
function abilityHtml(e) {
  const role = ui.S.chars[e.char].role, f = e.facts[0];
  if (!f) return "";  // nobody left to look into
  if (role === "Framer") return `<b>Picked</b> ${who(f.target)} to frame.`;
  if (role === "Guest") return `<b>Had a hunch:</b> ${factHtml(f)} ${factMark(f, e)}`;
  const one = (f) => f.kind === "side" ? `<b>Investigated</b> ${who(f.target)}: ${looks(f.bad)} ${factMark(f, e)}`
    : f.kind === "role" ? `<b>Uncovered</b> ${who(f.target)}'s role: ${lower(title(f.role))} ${factMark(f, e)}`
    : f.kind === "count" ? `<b>Counted</b> the guests beside them: ${factHtml(f)} ${factMark(f, e)}`
    : `<b>Photographed</b> ${who(f.a)} and ${who(f.b)} together: ${f.same ? "the same side" : "different sides"} ${factMark(f, e)}`;
  return e.facts.map(one).join("<br>");
}

// What a guest did and learned on night r, then what was done to them.
function nightLines(c, r) {
  const S = ui.S, E = S.diary.filter((e) => e.round === r);
  const mine = (what) => E.filter((e) => e.char === c && e.what === what);
  const at = (what, key = "target") => E.filter((e) => e.what === what && e[key] === c);
  const lines = [];
  if (S.events[r] === "Blackout") lines.push(line(ICON.blackout, `<b>Blackout:</b> the lights failed, and nobody could investigate.`));
  mine("impression").forEach((e) => lines.push(line(EVENTS["First Impressions"][0], `<b>First impressions:</b> ${learnedHtml(e)}`)));
  mine("seance").forEach((e) => lines.push(line(EVENTS["Séance"][0], `<b>At the Séance</b>, hand in hand with the guests beside them: ${learnedHtml(e)}`)));
  mine("forge").forEach((e) => {
    const t = e.target, work = E.find((x) => x.what === "ability" && x.char === t);
    lines.push(line(ICON.forge, E.some((x) => x.what === "follow" && x.char === t) ? `<b>Spoiled</b> ${who(t)}'s listening: they heard nothing tonight.`
      : `<b>Forged</b> ${who(t)}'s findings${!work ? `, but it came to nothing: ${who(t)} does not investigate.`
      : !work.facts.length ? `, but it came to nothing: ${who(t)} found nothing tonight.`
      : ui.S.chars[t].role === "Amateur" ? ", but it came to nothing: the Amateur's findings are guesses anyway."
      : work.facts.every((f) => !factTrue(f)) ? ": what they learned tonight was false." : ", but what they learned came out true all the same."}`));
  });
  mine("silence").forEach((e) => lines.push(line(ICON.silence, `<b>Silenced</b> ${who(e.target)}, who could give no advice next morning.`)));
  mine("bribe").forEach((e) => lines.push(line(ICON.bribe, `<b>Bribed</b> ${who(e.target)} to advise clearing them next morning${
    !E.some((x) => x.what === "bribed" && x.char === e.target) ? `, but it came to nothing: ${who(e.target)} ${
      E.some((x) => x.what === "hypnotised" && x.char === e.target) ? "was in a trance" : "gave no advice"}.`
    : S.events[r] === "Inquest" ? ", but it came to nothing: the Inquest asked only whom to arrest." : "."}`)));
  mine("hypnotise").forEach((e) => {
    const t = e.target, told = mine("told").find((x) => x.by === t);
    lines.push(line(ICON.hypnotise, `<b>Hypnotised</b> ${who(t)}${E.some((x) => x.what === "hypnotised" && x.char === t)
      ? ", who next morning repeated, word for word, what the Hypnotist had meant to advise the day before" : `, though next morning ${who(t)} gave no advice`}.
      In the trance ${who(t)} told them everything they knew${told && told.facts.length ? `: ${learnedHtml(told)}` : ", but nothing they did not know already."}`));
  });
  mine("follow").forEach((e) => {
    const t = e.target, heard = mine("ability")[0], forger = E.find((x) => x.what === "forge");
    const theirs = E.some((x) => (x.what === "ability" && x.char === t && x.facts.length) || (x.what === "tip" && x.to === t));  // before the Eavesdropper's turn
    lines.push(line(ICON.follow, `<b>Listened</b> at ${who(t)}'s door${heard && heard.forged ? `, but ${forger ? `the Forger, ${who(forger.char)},` : "the Forger"} spoiled it: they heard nothing.`
      : heard && heard.facts.length ? ` and copied what ${who(t)} learned tonight: ${learnedHtml(heard)}`
      : theirs ? ` and heard what ${who(t)} learned tonight, but nothing they did not know already.` : `, but ${who(t)} learned nothing tonight.`}`));
  });
  if (!mine("follow").length) {
    mine("ability").forEach((e) => {
      const passed = mine("tip")[0], html = abilityHtml(e);
      if (html) lines.push(line(ICON.look, html + (passed ? ` <span class="dz-then">Passed it on to ${who(passed.to)}, the guest they trusted most.</span>` : "")));
    });
  }
  at("tip", "to").forEach((e) => lines.push(line(ICON.tip, `<b>A tip</b> from ${who(e.char)}, ${roleOf(e.char)}: ${learnedHtml(e)}`)));
  at("follow").forEach((e) => lines.push(line(ICON.follow, `${who(e.char)}, ${roleOf(e.char)}, <b>listened at their door</b>.`)));
  at("hypnotise").forEach((e) => lines.push(line(ICON.hypnotise, `<b>Hypnotised</b> by ${who(e.char)}, ${roleOf(e.char)}, and told them everything they knew.`)));
  mine("meet").forEach((e) => lines.push(line(ICON.meet, `<b>Met</b> ${who(e.partner)}, the other Lover, in secret, and they told each other everything.
    ${e.facts.length ? `Learned from ${who(e.partner)}: ${learnedHtml(e)}` : `${who(e.partner)} had nothing new for them.`}`)));
  return lines;
}

// A tip on a morning: whom it named, and whether that proved right.
const tipHtml = (x, arrest) => `${arrest ? "arresting" : "clearing"} ${who(x)} ${mark(verdict(x, arrest) === "right", "right", "wrong")}`;
const tipsHtml = (a) => [[a.save, false], [a.eliminate, true]].filter(([x]) => x !== null).map(([x, arrest]) => tipHtml(x, arrest)).join(" and ");

// What a guest said on morning r, and what bent it: a trance, a bribe, the other Lover, the spirit.
function dayLines(c, r) {
  const S = ui.S, g = S.chars[c], E = S.diary.filter((e) => e.round === r), lines = [];
  const prints = S.footprints?.[r], book = S.notebooks.find((x) => x.round === r && x.char === c);
  if (prints && prints.includes(c)) lines.push(line("👣", `<b>Their boots matched</b> the footprints under the library window, and so did
    ${who(prints.find((x) => x !== c))}'s: at least one of the two was guilty.`));
  if (book) lines.push(line("📓", `<b>You read their notebook</b>${book.older ? ", at its earlier pages" : ""}.`));
  if (S.silenced[r] === c) lines.push(line(ICON.silence, `<b>Silenced:</b> they gave no advice.`));
  const a = S.advice.find((x) => x.round === r && x.speaker === c);
  if (a) {
    const why = [], mine = E.find((e) => e.char === c && ["hypnotised", "bribed"].includes(e.what));
    const trance = mine && mine.what === "hypnotised";
    if (trance) why.push(`In a trance: they repeated, word for word, what ${who(mine.by)}, ${roleOf(mine.by)}, had meant to advise the day before.`);
    if (mine && mine.what === "bribed") {
      why.push(`Bribed by ${who(mine.by)}, ${roleOf(mine.by)}, to advise clearing them${S.events[r] === "Inquest" ? ", but the Inquest asked only whom to arrest" : ""}.`);
    }
    const pact = E.find((e) => e.what === "agree" && (e.char === c || e.partner === c));
    if (pact) why.push(agreedHtml(c, pact, a));
    const own = !trance && !(mine && a.eliminate === null);  // a bought clear is the Paymaster's, not the spirit's
    if (g.role === "Possessed" && own && Object.entries(S.events).some(([n, e]) => e === "Séance" && +n <= r)) {
      why.push("Since the Séance Lord Edmund's spirit spoke through them, and it said everything backwards.");
    }
    lines.push(line(ICON.advice, `<b>Advised</b> ${tipsHtml(a)}.${why.length ? `<span class="dz-why">${why.join(" ")}</span>` : ""}`));
  } else if (r === S.rounds && S.silenced[r] !== c) lines.push(line(ICON.advice, "Nobody advised on the last night.", "quiet"));
  S.interviews.filter((x) => x.round === r && x.speaker === c).forEach((x) => lines.push(line(ICON.advice, `<b>Questioned again</b>, advised ${tipsHtml(x)}.`)));
  return lines;
}

// The Lovers' story for the morning: the tip they shared, and what the second Lover dropped to match the first.
function agreedHtml(c, pact, a) {
  const other = pact.char === c ? pact.partner : pact.char, b = ui.S.advice.find((x) => x.round === a.round && x.speaker === other);
  const shared = b ? [[a.save === b.save, a.save, false], [a.eliminate === b.eliminate, a.eliminate, true]].filter(([same, x]) => same && x !== null) : [];
  const dropped = pact.char === c ? [[pact.meant[0], a.save, false], [pact.meant[1], a.eliminate, true]].filter(([was, now]) => was !== now) : [];
  return `Agreed their story with ${who(other)}, the other Lover${shared.length ? `: both advised ${shared.map(([, x, arrest]) =>
    `${arrest ? "arresting" : "clearing"} ${who(x)}`).join(" and ")}` : ""}.${dropped.length ? ` Alone, they would have advised ${dropped.map(([was, , arrest]) =>
    `${arrest ? "arresting" : "clearing"} ${who(was)}`).join(" and ")}.` : ""}`;
}

// How their part ended, stamped as on the board.
function fateHtml(h) {
  const S = ui.S, save = h.action === "save", last = h.round === S.rounds;
  const act = last ? (save ? "Let go in the drawing room" : "Accused in the drawing room") : save ? "Cleared by you" : "Arrested by you";
  const how = h.ok ? `rightly, they were ${save ? "innocent" : "guilty"}.`
    : save ? "a mistake. They were guilty, and walked free." : "a mistake. They were innocent, and held for nothing.";
  return `<li class="dz-fate ${h.ok ? "hit" : "miss"}"><span class="dz-stamp ${save ? "save" : "eliminate"}">${save ? "Cleared" : "Arrested"}</span>
    <div><b>${act}</b>: ${how} <span class="dz-grade" title="${h.ok ? "A right call" : "A mistake"}">${h.ok ? "+1" : "0"}</span></div></li>`;
}

// Before the first night: the other of a pair, or the guilty guest the Witness saw.
function startLines(c) {
  const S = ui.S, g = S.chars[c], lines = [];
  const pair = ["Lover", "Confidant"].includes(g.role) && S.chars.find((x) => x.id !== c && x.role === g.role);
  if (pair) lines.push(line(ICON.start, g.role === "Lover" ? `<b>Knew</b> the other Lover, ${who(pair.id)}.`
    : `<b>Knew</b> the other Confidant, ${who(pair.id)}: they spent the night of the murder together.`));
  S.diary.filter((e) => e.round === 0 && e.char === c && e.what === "saw").forEach((e) => lines.push(line(ICON.start,
    `<b>Saw</b> ${who(e.facts[0].target)} slip past the library door on the birthday night: one of the guilty.`)));
  return lines.length ? `<section class="dz-night start"><header class="dz-date"><h3>From the start</h3></header><ul>${lines.join("")}</ul></section>` : "";
}

function nightHtml(c, r, h) {
  const S = ui.S, e = S.events[r], night = nightLines(c, r), day = dayLines(c, r);
  const [icon, name] = e ? [EVENTS[e]?.[0] || "", e] : r === S.rounds ? [LAST_NIGHT[0], "The drawing room"] : ["", ""];
  return `<section class="dz-night"><header class="dz-date">${moonSvg(r / S.rounds)}<h3>Night ${ROMAN[r]}</h3>
      ${name ? `<span class="dz-event"><span>${icon}</span>${name}</span>` : ""}</header>
    <ul>${part("At night", night.length ? night : [line("·", "Nothing to report.", "quiet")])}${day.length ? part("In the morning", day) : ""}
      ${h && h.round === r ? fateHtml(h) : ""}</ul></section>`;
}

// The guest's advice as it proved: right and wrong tips.
function record(c) {
  let right = 0, wrong = 0;
  ui.S.advice.filter((a) => a.speaker === c).forEach((a) => [[a.save, false], [a.eliminate, true]].forEach(([x, arrest]) => {
    if (x !== null) verdict(x, arrest) === "right" ? right++ : wrong++;
  }));
  return { right, wrong };
}

// Opens guest c's dossier over the board; `from` is what opened it, where the keyboard goes back to (none: turned to
// from another dossier, which keeps the first one's).
export function showDossier(c, from) {
  const S = ui.S, g = S?.chars[c];
  if (!S || !S.finished || !S.diary || !g) return;
  if (from) opener = from;
  const turned = !from && document.activeElement?.closest?.(".dz-step");  // ‹ or ›: the keyboard stays on it
  const h = S.history.find((x) => x.char === c), side = g.bad ? "bad" : "good", { right, wrong } = record(c), n = S.chars.length;
  const nights = Array.from({ length: h ? h.round : S.round }, (_, i) => nightHtml(c, i + 1, h)).join("");
  const fate = !h ? "Still in the house when the case closed"
    : `${h.action === "save" ? (h.round === S.rounds ? "Let go" : "Cleared") : h.round === S.rounds ? "Accused" : "Arrested"} on night ${ROMAN[h.round]} · ${h.ok ? "a right call" : "a mistake"}`;
  const step = (d, cls, sign) => {
    const x = S.chars[(c + d + n) % n];
    return `<button class="btn dz-step ${cls}" data-dossier="${x.id}" aria-label="${d < 0 ? "Previous" : "Next"} guest: ${x.name}">${d < 0 ? sign : ""}<span>${x.short}</span>${d > 0 ? sign : ""}</button>`;
  };
  $("modal").innerHTML = `<div class="dz-card paper ${side}" role="dialog" aria-modal="true" aria-label="Dossier: ${g.name}">
    <header class="dz-head">
      <div class="dz-photo">${portrait(g.role, "", g.art)}<span class="stamp ${g.bad ? "guilty" : "innocent"}">${SIDE[side].toUpperCase()}</span></div>
      <div class="dz-id"><span class="dz-kicker">Dossier · case no. 1924/17 · closed</span>
        <h2>${g.name} <small>#${g.id}</small></h2><span class="dz-job">the ${g.profession}</span>
        <p class="dz-role"><b>${title(g.role)}</b><span class="team ${side}">${SIDE[side]}</span></p>
        <p class="dz-sum"><span class="dz-fate-sum${h && !h.ok ? " miss" : ""}">${fate}</span>${right + wrong
          ? `<span>Their tips: <b class="hit">${right}</b> proved right, <b class="miss">${wrong}</b> wrong</span>` : ""}</p></div>
    </header>
    <div class="dz-body" tabindex="0" role="region" aria-label="${g.name}, night by night">${startLines(c)}${nights}</div>
    <nav class="dz-nav">${step(-1, "back", "‹")}<button class="btn primary" id="revealOk">Close the dossier</button>${step(1, "next", "›")}</nav></div>`;
  $("modal").classList.add("open");
  ($("modal").querySelector(turned ? `.dz-step.${turned.classList.contains("back") ? "back" : "next"}` : "#revealOk")).focus({ preventScroll: true });
}

const dossierOpen = () => $("modal").classList.contains("open") && !!$("modal").querySelector(".dz-card");

// The guest beside this one, d = ±1 (← →, as ‹ › on the dossier).
function turn(d) {
  const step = $("modal").querySelector(`.dz-step.${d < 0 ? "back" : "next"}`);
  if (step) showDossier(+step.dataset.dossier);
}

// A name marked data-dossier opens that guest's dossier; inside a dossier it turns to them, keeping what opened the first.
// A photograph in the Crimes tab takes no focus, so the keyboard goes back to the guest's name instead.
document.addEventListener("click", (e) => {
  const link = e.target.closest?.("[data-dossier]");
  if (!link || !ui.S?.finished) return;
  const c = +link.dataset.dossier, from = link.matches("button") ? link : $("tabbody").querySelector(`.dz-link[data-dossier="${c}"]`) || link;
  showDossier(c, dossierOpen() ? undefined : from);
});
document.addEventListener("keydown", (e) => {
  if ((e.key === "ArrowLeft" || e.key === "ArrowRight") && !(e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) && dossierOpen()) {
    e.preventDefault();
    turn(e.key === "ArrowRight" ? 1 : -1);
  }
});
// Enter held down repeats: it must not close the dossier it just opened (main.js presses the focused button).
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && e.repeat && dossierOpen()) {
    e.preventDefault();
    e.stopPropagation();
  }
}, true);
// In a closed case a polaroid on the board opens its guest's dossier: a click, Enter, or Space once let go (main.js still
// picks with them while the case is open). Enter goes no further, or the card it opens would take it as its own; Space
// opens on its release, which then cannot land on the card's buttons.
$("board").addEventListener("click", (e) => {
  const card = ui.S?.finished && e.target.closest(".card");
  if (card) showDossier(+card.dataset.c, card);
});
const boardCard = (e) => ui.S?.finished && e.target === e.target.closest?.(".card") && e.target;
$("board").addEventListener("keydown", (e) => {
  const card = boardCard(e);
  if (!card || (e.key !== "Enter" && e.key !== " ")) return;
  e.preventDefault();
  e.stopPropagation();
  if (e.key === "Enter" && !e.repeat) showDossier(+card.dataset.c, card);
});
$("board").addEventListener("keyup", (e) => {
  const card = boardCard(e);
  if (card && e.key === " ") showDossier(+card.dataset.c, card);
});
// A closed case's polaroid says what it opens (board.js names the guest; the card outlives the case).
$("board").addEventListener("focusin", (e) => {
  const card = e.target.closest?.(".card"), g = card && ui.S?.chars[+card.dataset.c];
  if (g) card.setAttribute("aria-label", `${g.name}, the ${g.profession}${ui.S.finished ? ": open their dossier" : ""}`);
});
// The chalk under a closed case's note (css/dossier.css) only where the cork below it is free: board.js keeps the polaroids
// clear of the note alone, and in a short window the nearest come right up under it. On phones it stays on the note.
function chalk() {
  const note = $("board").querySelector(".note");
  if (!note) return;
  if (!ui.S?.finished || matchMedia("(max-width: 700px), (max-height: 500px)").matches) return note.classList.remove("chalk");
  // where they are laid out, each centred on its point (board.css): a polaroid's transform may still be easing in
  const x = note.offsetLeft, top = note.offsetTop + note.offsetHeight / 2;
  note.classList.toggle("chalk", ![...$("board").querySelectorAll(".card")].some((card) => {
    const w = card.offsetWidth / 2, h = card.offsetHeight / 2;
    return card.offsetLeft - w < x + 140 && card.offsetLeft + w > x - 140 && card.offsetTop - h < top + 32 && card.offsetTop + h > top;
  }));
}
new ResizeObserver(chalk).observe($("board"));
new MutationObserver(chalk).observe($("board"), { childList: true, subtree: true });  // the board built, the case closed

// Closed, the keyboard goes back to what opened it, once the page behind is no longer inert (main.js).
new MutationObserver(() => {
  if ($("modal").classList.contains("open") || !opener) return;
  const back = opener;
  opener = null;
  setTimeout(() => back.isConnected && back.focus({ preventScroll: true }));
}).observe($("modal"), { attributes: true, attributeFilter: ["class"] });
