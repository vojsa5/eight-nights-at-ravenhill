// A case in miniature (How to play, howto.js): five anonymous guests on one small board, played by itself over five
// scenes: the morning's testimony, a clear, the search, an arrest, then a mistake. Each scene draws the board as the
// last one left it and animates its own step, timed to the scene's length (minisim.css).
import { sceneMs } from "./film.js";
import { portrait } from "./portrait.js";

const NAMES = "ABCDE";
const AT = [[50, 15], [83, 34], [70, 65], [30, 65], [17, 34]];  // photographs' centres on a 100 × 80 board
const ROLES = ["Sleuth", "Forger"];                            // A and B, the two right calls; C's role stays sealed
// [from, to, "s" clear | "e" arrest]: A, the Sleuth, tells the truth; B, the Forger, lies; C, guilty, tells the truth to
// look honest; D and E, innocent, believe what they say
const ADVICE = [[0, 4, "s"], [0, 1, "e"], [1, 3, "s"], [1, 0, "e"], [2, 0, "s"], [2, 1, "e"], [3, 2, "s"], [3, 4, "e"], [4, 0, "s"], [4, 3, "e"]];
const SCORES = ["0 of 0", "0 of 0", "1 of 1", "2 of 2", "2 of 3"];
const PICKS = [null, 0, null, 1, 2];     // whom each step clears or arrests
const REVEALS = [null, null, 0, 1, null];  // whose search is a right call, +1

// a string from one photograph to another, bowed to its left so that the two strings of a pair never overlap
function stringPath([f, t]) {
  const [x1, y1] = AT[f], [x2, y2] = AT[t], bow = 0.14;
  return `M${x1} ${y1} Q${(x1 + x2) / 2 + (y2 - y1) * bow} ${(y1 + y2) / 2 - (x2 - x1) * bow} ${x2} ${y2}`;
}

const d = (s) => `--d:${s.toFixed(2)}s`;
const now = (t) => (t === undefined ? "" : " now");
const at = (t) => (t === undefined ? "" : d(t));

// The board after `step` (0 testimony … 4 the mistake), animating what that step does: `t` maps each change to the
// second it happens at in the scene.
function board(step, t) {
  const strings = ADVICE.map((a, i) => {
    const lit = step >= 2 && a[0] === 0, lie = step >= 3 && a[0] === 1;
    const when = step === 0 ? t.string[i] : step === 2 && lit ? t.lit : step === 3 && lie ? t.lie : undefined;
    return `<path class="${a[2]}${lit ? " lit" : ""}${lie ? " lie" : ""}${now(when)}" style="${at(when)}" pathLength="1" d="${stringPath(a)}"/>`;
  }).join("");
  const counts = [0, 1, 2, 3, 4].map((g) => ["s", "e"].map((k) => ADVICE.filter((a) => a[1] === g && a[2] === k).length));
  const cards = AT.map(([x, y], g) => {
    const name = NAMES[g], cls = [], parts = [];
    let style = `left:${x}%;top:${y * 1.25}%;--r:${[-3, 4, -2, 3, -4][g]}deg`;
    if (step === 0) {
      cls.push("speak now");
      style += `;${d(t.speak[g])};--len:${t.len.toFixed(2)}s`;
    }
    const pick = PICKS[step];
    if (pick === g) {
      cls.push("pick now");
      style += `;${d(t.pick)}`;
    }
    // after the Sleuth's search: E, whom A cleared, is known innocent, and B, whom A accused, suspicious until arrested
    if ((g === 4 && step >= 2) || (g === 1 && step === 2)) cls.push((g === 4 ? "ok" : "sus") + (step === 2 ? " now" : ""));
    if (step === 2 && (g === 4 || g === 1)) style += `;${d(g === 4 ? t.ok : t.sus)}`;
    if (g === 1 && step >= 3) cls.push("bad");
    const badge = `<span class="badge${now(t.badge?.[g])}" style="${at(t.badge?.[g])}"><span class="s"><i>✓</i>${counts[g][0]}</span><span class="e"><i>✕</i>${counts[g][1]}</span></span>`;
    const turned = (g === 0 && step >= 2) || (g === 1 && step >= 3);
    const turnAt = (g === 0 && step === 2) || (g === 1 && step === 3) ? t.turn : undefined;
    const back = g < 2 ? `<span class="ms-face back">${portrait(ROLES[g])}<span class="rl">${ROLES[g]}</span></span>` : "";
    parts.push(`<span class="photo"><span class="ms-flip${turned ? " turned" : ""}${now(turnAt)}" style="${at(turnAt)}">
      <span class="ms-face">${portrait("A guest", "", "unknown")}</span>${back}</span>${badge}</span><b class="ms-nm">${name}</b>`);
    const stamped = [[0, 1], [1, 3], [2, 4]].find(([who, from]) => who === g && step >= from);
    if (stamped) {
      const when = stamped[1] === step ? t.stamp : undefined;
      parts.push(`<span class="stamp ${g === 1 ? "arrested" : "cleared"}${now(when)}" style="${at(when)}">${g === 1 ? "Arrested" : "Cleared"}</span>`);
    }
    if (g === 2 && step === 4) parts.push(`<span class="ms-sealed now" style="${d(t.seal)}"><b>Guilty</b><span>role sealed</span></span>`);
    if (t.plus !== undefined && g === REVEALS[step]) parts.push(`<span class="ms-plus now" style="${d(t.plus)}">+1</span>`);
    return `<span class="ms-card${cls.length ? " " + cls.join(" ") : ""}" style="${style}">${parts.join("")}</span>`;
  }).join("");
  const hand = t.pick === undefined ? "" : (() => {
    const [x, y] = AT[PICKS[step]];
    return `<img class="ms-hand now" style="left:${x}%;top:${y * 1.25}%;${d(t.pick - 1.2)}" src="art/desk/magnifier.svg" alt="">`;
  })();
  const score = t.tick === undefined ? `<b>${SCORES[step]}</b>`
    : `<span class="ms-tick"><b class="was now" style="${d(t.tick)}">${SCORES[step - 1]}</b><b class="is now" style="${d(t.tick)}">${SCORES[step]}</b></span>`;
  return `<div class="ms-board"><svg class="ms-strings" viewBox="0 0 100 80" aria-hidden="true">${strings}</svg>${cards}${hand}</div>
    <div class="ms-foot"><span>${step === 4 ? "Day II" : "Day I"}</span><span>Score ${score}</span></div>`;
}

// Each step's moments, in seconds into a scene of `s` seconds.
function timeline(step, s) {
  if (step === 0) {
    const start = 1.3, end = Math.max(start + 5, s * 0.62), gap = (end - start) / ADVICE.length;
    return { string: ADVICE.map((_, i) => start + i * gap), speak: [0, 1, 2, 3, 4].map((g) => start + 2 * g * gap - 0.15),
      len: 2 * gap + 0.3, badge: [0, 1, 2, 3, 4].map((g) => end + 0.4 + g * 0.18) };
  }
  if (step === 1) return { pick: 1.9, stamp: 2.5 };
  if (step === 2) return { turn: 1.2, plus: 2.3, tick: 2.5, lit: 3.6, ok: 4.6, sus: 5.2 };
  if (step === 3) return { pick: 1.9, stamp: 2.5, turn: 3.6, plus: 4.7, tick: 4.9, lie: Math.min(6.2, s - 3) };
  return { pick: 1.9, stamp: 2.5, seal: 4.2, tick: 4.6 };
}

const CAPTIONS = [
  ["A case in miniature", `Watch a small case play itself: five guests, two of them guilty. In the morning each one tells you whom
    to clear and whom to arrest, and the strings go up: green for clear, red for arrest. The counts add them up.`],
  ["Clear one", `Each day you clear one guest. A has the most voices for them, so A is cleared: +1 if A is innocent. The
    cleared wait in the morning room and testify no more.`],
  ["The search", `Then A's room is searched. A right call shows who they really were: A was the Sleuth, innocent, +1. So A told
    you the truth: E is innocent, and B, whom A accused, is suspicious.`],
  ["Arrest one", `Each day you also arrest one guest, +1 if they are guilty: here B, on the Sleuth's word. The arrested go down
    to the wine cellar and testify no more. B was the Forger, so every string B pinned up was a lie.`],
  ["A mistake", `Next day you clear C, whom nobody accused. But C was guilty: the guilty tell the truth when it suits them. After a
    mistake you learn only their side, the role stays sealed until the thaw, and no point: 2 of 3.`],
];
const PICTURES = [["events/interview", "50% 50%"], ["verdict/clear", "50% 55%"], ["search/room", "50% 55%"],
  ["verdict/arrest", "50% 55%"], ["verdict/door", "50% 50%"]];

// The five scenes, as howto.js's [picture, focus, caption, exhibit]; `exhibit(html, cls)` pins the board up as one
// of How to play's exhibits.
export function miniCase(exhibit) {
  return CAPTIONS.map(([heading, text], step) => {
    const caption = `<span class="film-title">${heading}</span>${text}`;
    const html = board(step, timeline(step, sceneMs(caption) / 1000));
    return [...PICTURES[step], caption, exhibit(html, `minisim${step ? " cont" : ""}`)];
  });
}
