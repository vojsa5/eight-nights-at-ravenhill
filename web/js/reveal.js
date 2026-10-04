// After a clear or arrest: a short story (the decision, then the search of the guest's room), then the card with the
// result. An arrest first confronts the guest in the hall and walks them down the cellar stairs; a right call ends on a
// flashback of what the guest did that night, or of who they really were, and their own last words (story.js). After a
// mistake the guest's role stays sealed: the story and the card say only that it went wrong, and the ending (finale.js)
// tells the rest. A right call also wins the book hidden in the guest's room (books.js). Also the card for a tool's clue.
import { bookFor, coversHtml } from "./books.js";
import { TOOLS, factText } from "./clues.js";
import { loadArt, playFilm, preloadArt } from "./film.js";
import { portrait } from "./portrait.js";
import { CRIMES, FOUND, ROLES, SIDE, TRUTHS, isBadRole, searchArt, title } from "./roles.js";
import { $, ui } from "./state.js";
import { CRIME_STORY, OPENING, TRUTH_STORY, confrontCaption, walkCaption } from "./story.js";

// The decision's pictures, the hall and the stairs of an arrest, and the morning room's doors, ready before the first
// decision (the search's and the flashback's pictures load while the first scenes play). The scenes' movement is in
// css/verdict.css and css/flashback.css.
preloadArt(["verdict/clear", "verdict/arrest", "verdict/confront", "verdict/stairs"]);
new Image().src = "art/verdict/door.svg";

export function showReveal(h) {
  const c = ui.S.chars[h.char];
  playFilm(revealScenes(h, c), { done: () => showRevealCard(h), label: c.name, skip: "Skip to the result", cls: "verdict" });
}

function revealScenes(h, c) {
  const n = c.name, save = h.action === "save";
  // an arrest's door slams without a word: the hall and the stairs before it have told the rest
  const moment = save
    ? `You tell <b>${n}</b>, the ${c.profession}, that Scotland Yard has no further questions. ${c.bad
      ? `${n} thanks you a little too warmly on the way out.` : `${n} goes to wait out the snow in the morning room.`}` : "";
  // the guest's photograph, stamped; a clear first opens the morning room's double doors onto the daylight
  const act = save ? "cleared" : "arrested";
  const photo = `<div class="film-photo decision ${save ? "clear" : "arrest"}">${portrait(n, "", c.portrait)}
    <i class="ink-puff ${act}"></i><span class="stamp ${act}">${act.toUpperCase()}</span></div>`;
  const doors = save ? `<div class="vfx-doors" aria-hidden="true"><i class="vfx-flood"></i><i class="vfx-door"></i><i class="vfx-door r"></i>
    <i class="vfx-seam"></i></div>` : "";
  const search = h.ok ? [searchArt(h.role), "50% 55%", `You search ${n}'s room. ${FOUND[h.role]}`]
    : save ? ["verdict/burnt", "45% 60%", `When you search ${n}'s room, the grate is still warm and full of ash. Whatever was
      there has been burnt, and that alone tells you that you have cleared one of the guilty. Who ${n} really was stays sealed in your file until the thaw.`]
    : ["verdict/cellar-night", "50% 55%", `An hour later, three guests swear that ${n} was with them in the drawing room when
      Lord Edmund died. You have locked up an innocent guest, and what ${n} was really doing at Ravenhill stays sealed in your file until the thaw.`];
  const decision = [save ? "verdict/clear" : "verdict/arrest", "50% 55%", moment, doors + photo];
  const story = h.ok && (save ? TRUTH_STORY : CRIME_STORY)[h.role];
  const after = story ? flashback(story, h, c) : [];
  if (save) return [decision, search, ...after];
  // an arrest: the guest stands alone in the hall, where the picture's data-fx="guest" mark is, and is walked down
  const accused = `<div class="film-photo at-guest">${portrait(n, "", c.portrait)}</div>`;
  return [["verdict/confront", "50% 50%", confrontCaption(c, c.bad), accused], ["verdict/stairs", "50% 50%", walkCaption(c, c.bad)],
    decision, search, ...after];
}

// After a right call: the guest's own night (a crime in the picture the opening film showed it in, framed the same way)
// in the look of a memory (css/flashback.css), under its title; then their last words, holding the look, as their
// photograph comes through the picture over the figure in it (its data-fx="guest" mark).
const memory = (held) => `<div class="memory${held ? " held" : ""}" aria-hidden="true"><i class="tint"></i><i class="burn"></i><i class="burn r"></i></div>`;
function flashback(story, h, c) {
  const n = c.name, pic = story.scene, focus = OPENING.find(([p]) => p === pic)?.[1] || "50% 55%";
  const words = h.action === "save" ? story.farewell(n) : story.confess(n);
  const recalled = `<div class="film-photo at-guest recalled">${portrait(n, "", c.portrait)}</div>`;
  return [[pic, focus, `<span class="film-title">${story.title}</span>${story.flashback(n)}`, memory(false)],
    [pic, focus, `<span class="film-title">${n}</span>${words}`, memory(true) + recalled]];
}

// The flashbacks of right calls again, one after another, for the Crimes tab's Replay (crimes.js); `done` runs when the
// film ends or is skipped. A mistake has none, as in the story after it. False if there is nothing to play.
export function replayFlashbacks(hs, done) {
  const story = (h) => h.ok && (h.action === "save" ? TRUTH_STORY : CRIME_STORY)[h.role];
  const told = hs.filter(story);
  if (!told.length) return false;
  const seen = new Set(), scenes = told.flatMap((h) => {
    const s = flashback(story(h), h, ui.S.chars[h.char]), again = seen.has(h.role);
    seen.add(h.role);
    return again ? s.slice(0, 1) : s;  // the second Lover: their part, not the same confession again
  });
  // the picture first, so the first scene comes in with its own cut
  loadArt(scenes[0][0]).then(() => playFilm(scenes,
    { done, label: told.map((h) => ui.S.chars[h.char].name).join(" and "), skip: "Back to the folder", cls: "verdict" }));
  return true;
}

export function showRevealCard(h) {
  const S = ui.S, c = S.chars[h.char], save = h.action === "save";
  const team = h.ok ? ROLES[h.role][0] : c.bad ? "bad" : "good";
  let art, body;
  if (h.ok) {  // the guest's own photograph turns over to their role
    art = `<span aria-hidden="true">${portrait(c.name, "front", c.portrait)}</span>${portrait(h.role, "", c.art)}`;
    body = `<h2>${title(h.role)}</h2>
      <span class="team ${team}">${SIDE[team]}</span>
      <p class="flavor">${ROLES[h.role][2]}</p>
      ${isBadRole(h.role) ? `<p class="charge"><b>The charge</b>${CRIMES[h.role]}</p>` : `<p class="charge truth"><b>The truth</b>${TRUTHS[h.role]}</p>`}`;
  } else {
    art = portrait(c.name, "", c.portrait);
    body = `<h2>A mistake</h2>
      <span class="team ${team}">${SIDE[team]}</span>
      <p class="flavor">${save ? "Somewhere upstairs, a guilty guest is smiling." : "The cellar is cold, and the door is locked."}</p>
      <p class="charge sealed"><b>Sealed until the thaw</b>Who ${c.name} really was stays in your file until the case is closed.</p>`;
  }
  $("modal").innerHTML = `<div class="reveal paper ${team}" role="dialog" aria-modal="true" aria-label="${h.ok ? "Role revealed" : "A mistake"}">
    <div class="reveal-art"><div class="frame-photo${h.ok ? " turn" : ""}">${art}</div>
      <i class="ink-puff ${team === "bad" ? "guilty" : "innocent"}"></i><span class="stamp ${team === "bad" ? "guilty" : "innocent"}">${SIDE[team].toUpperCase()}</span></div>
    <div class="reveal-body">
      <div class="kicker">${save ? "You cleared" : "You arrested"} ${c.name}, the ${c.profession}</div>
      ${body}
      <div class="outcome ${h.ok ? "ok" : "no"}"><b>${h.ok ? "+1" : "0"}</b>${outcomeText(h)}</div>
      ${rewardHtml(h, c)}
      ${S.finished ? `<button class="btn primary" data-action="finale" id="finaleGo">Close the case</button>`
                   : `<button class="btn primary" id="revealOk">Continue</button>`}
    </div></div>`;
  $("modal").classList.add("open");
  $("modal").querySelector(".btn.primary").focus({ preventScroll: true });
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
  $("revealOk").focus({ preventScroll: true });
}

export function closeModal() {
  $("modal").classList.remove("open");
  $("modal").innerHTML = "";
}

// The book found in the guest's room, which is now the player's: its brown-paper parcel comes open as the card settles.
function rewardHtml(h, c) {
  const book = h.ok && bookFor(ui.S, h);
  if (!book) return "";
  return `<div class="reward"><span class="gift">${coversHtml(book)}<i class="wrap"></i><i class="wrap right"></i></span><div><b class="t">Your reward</b>
    <span class="title">${book.title}</span><span class="by">${book.author}</span>
    <p>Found in ${c.name}'s room, and yours to keep: you may now read it.</p></div></div>`;
}

function outcomeText(h) {
  if (h.action === "save") return h.ok ? "An innocent guest is free of suspicion." : "You let a culprit walk free.";
  if (!h.ok) return "An innocent guest spends the night in a cell.";
  return "One culprit is behind bars.";
}
