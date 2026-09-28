// After a clear or arrest: a short story in two scenes (the decision, then the search of the guest's room),
// then the card with the result. After a mistake the guest's role stays sealed: the story and the card say
// only that it went wrong, and the ending (finale.js) tells the rest. Also the card for a tool's clue.
import { TOOLS, factText } from "./clues.js";
import { playFilm } from "./film.js";
import { portrait } from "./portrait.js";
import { CRIMES, FOUND, ROLES, SIDE, TRUTHS, isBadRole, searchArt, title } from "./roles.js";
import { $, ui } from "./state.js";

export function showReveal(h) {
  const c = ui.S.chars[h.char];
  playFilm(revealScenes(h, c), { done: () => showRevealCard(h), label: c.name, skip: "Skip to the result" });
}

function revealScenes(h, c) {
  const n = c.name, save = h.action === "save";
  const moment = save
    ? `You tell <b>${n}</b>, the ${c.profession}, that Scotland Yard has no further questions. ${c.bad
      ? `${n} thanks you a little too warmly on the way out.` : `${n} goes to wait out the snow in the morning room.`}`
    : `You take <b>${n}</b>, the ${c.profession}, down to the wine cellar, the one room in Ravenhill with a lock that holds. ${c.bad
      ? `${n} goes without a word.` : `${n} protests all the way down the steps.`}`;
  const photo = `<div class="film-photo">${portrait(n, "", c.portrait)}
    <span class="stamp ${save ? "cleared" : "arrested"}">${save ? "CLEARED" : "ARRESTED"}</span></div>`;
  const search = h.ok ? [searchArt(h.role), "50% 55%", `You search ${n}'s room. ${FOUND[h.role]}`]
    : save ? ["verdict/burnt", "45% 60%", `When you search ${n}'s room, the grate is still warm and full of ash. Whatever was
      there has been burnt, and that alone tells you that you have cleared a conspirator. Who ${n} really was stays sealed in your file until the thaw.`]
    : ["verdict/cellar-night", "50% 55%", `An hour later, three guests swear that ${n} was with them in the drawing room when
      Lord Edmund died. You have locked up an innocent guest, and what ${n} was really doing at Ravenhill stays sealed in your file until the thaw.`];
  return [[save ? "verdict/clear" : "verdict/arrest", "50% 55%", moment, photo], search];
}

export function showRevealCard(h) {
  const S = ui.S, c = S.chars[h.char], save = h.action === "save";
  const team = h.ok ? ROLES[h.role][0] : c.bad ? "bad" : "good";
  let art, body;
  if (h.ok) {
    art = portrait(h.role, "", c.art);
    body = `<h2>${title(h.role)}</h2>
      <span class="team ${team}">${SIDE[team]}</span>
      <p class="flavor">${ROLES[h.role][2]}</p>
      ${isBadRole(h.role) ? `<p class="charge"><b>The charge</b>${CRIMES[h.role]}</p>` : `<p class="charge truth"><b>The truth</b>${TRUTHS[h.role]}</p>`}`;
  } else {
    art = portrait(c.name, "", c.portrait);
    body = `<h2>A mistake</h2>
      <span class="team ${team}">${SIDE[team]}</span>
      <p class="flavor">${save ? "Somewhere upstairs, a conspirator is smiling." : "The cellar is cold, and the door is locked."}</p>
      <p class="charge sealed"><b>Sealed until the thaw</b>Who ${c.name} really was stays in your file until the case is closed.</p>`;
  }
  $("modal").innerHTML = `<div class="reveal paper ${team}" role="dialog" aria-modal="true" aria-label="${h.ok ? "Role revealed" : "A mistake"}">
    <div class="reveal-art"><div class="frame-photo">${art}</div>
      <span class="stamp ${team === "bad" ? "guilty" : "innocent"}">${SIDE[team].toUpperCase()}</span></div>
    <div class="reveal-body">
      <div class="kicker">${save ? "You cleared" : "You arrested"} ${c.name}, the ${c.profession}</div>
      ${body}
      <div class="outcome ${h.ok ? "ok" : "no"}"><b>${h.ok ? "+1" : "0"}</b>${outcomeText(h)}</div>
      ${S.finished ? `<button class="btn primary" data-action="finale" id="finaleGo">Close the case</button>`
                   : `<button class="btn primary" id="revealOk">Continue</button>`}
    </div></div>`;
  $("modal").classList.add("open");
  $("modal").querySelector(".btn.primary").focus();
}

// The result of a tool, in the same card style as a reveal.
export function showClue(tool, c) {
  const S = ui.S, who = S.chars[c], [icon, label] = TOOLS[tool];
  let body;
  if (tool === "notebook") {
    const facts = S.notebooks[S.notebooks.length - 1].facts;
    body = facts.length ? `<p>Last night's entries in ${who.name}'s notebook:</p><ul class="facts">${facts.map((f) => `<li>${factText(f)}</li>`).join("")}</ul>`
      : `<p>${who.name}'s notebook has nothing new from last night.</p>`;
  } else {
    const a = S.interviews[S.interviews.length - 1];
    const pick = (x) => `<b>${S.chars[x].name}</b> (#${x})`;
    body = `<p>Questioned again, ${who.name} adds:</p><ul class="facts"><li>✓ clear ${pick(a.save)}</li><li>✕ arrest ${pick(a.eliminate)}</li></ul>`;
  }
  $("modal").innerHTML = `<div class="reveal paper clue" role="dialog" aria-modal="true" aria-label="${label}">
    <div class="reveal-art"><div class="frame-photo">${portrait(who.name, "", who.portrait)}</div><span class="clue-icon">${icon}</span></div>
    <div class="reveal-body">
      <div class="kicker">${label}</div>
      <h2>${who.name}</h2>
      <div class="kicker">the ${who.profession}</div>
      ${body}
      <p class="flavor">This clue is kept in the ${tool === "notebook" ? "Case file" : "Testimony (dashed chips) and the Case file"}.</p>
      <button class="btn primary" id="revealOk">Continue</button>
    </div></div>`;
  $("modal").classList.add("open");
  $("revealOk").focus();
}

export function closeModal() {
  $("modal").classList.remove("open");
  $("modal").innerHTML = "";
}

function outcomeText(h) {
  if (h.action === "save") return h.ok ? "An innocent guest is free of suspicion." : "You let a conspirator walk free.";
  if (!h.ok) return "An innocent guest spends the night in a cell.";
  return "One conspirator is behind bars.";
}
