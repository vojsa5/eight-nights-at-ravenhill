// Small text helpers shared by several parts of the page.
import { ui } from "./state.js";

export const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

// The moon `f` of the way to full: the nights of a case wax to a full moon on the last one (the case bar,
// the Rules tab). A disc and its lit part, 16 × 16.
export function moonSvg(f, cls = "", title = "") {
  const rx = (6 * Math.abs(1 - 2 * f)).toFixed(2);
  const lit = f >= 1 ? `<circle class="lit" cx="8" cy="8" r="6"/>` : `<path class="lit" d="M8 2A6 6 0 0 1 8 14A${rx} 6 0 0 ${f > 0.5 ? 1 : 0} 8 2Z"/>`;
  return `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="${title ? "false" : "true"}">${title ? `<title>${title}</title>` : ""}
    <circle class="disc" cx="8" cy="8" r="6"/>${lit}</svg>`;
}

// A guest as clues and the case file name them: "Lady Ashby (#0)".
export const guestRef = (c) => `${ui.S.chars[c].name} (#${c})`;
