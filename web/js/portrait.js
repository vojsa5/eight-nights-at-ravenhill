// A picture: the player's own file from web/art/custom/ if there is one, else web/art/<art>.svg.
// `art` defaults to the role's portrait ("roles/sleuth"); each Confidant and each Lover has its own
// ("roles/confidant-a", "roles/confidant-b"), and every guest has a sepia portrait ("guests/ashby") shown
// until their role is revealed. The server sends the right one for each guest (ravenhill/server/state.py).
import { ui } from "./state.js";

export function portrait(role, cls = "", art = roleArt(role)) {
  return `<img class="art ${cls}" src="${artSrc(role, art)}" alt="${role}">`;
}

export const roleArt = (role, variant = "") => `roles/${role.toLowerCase()}${variant && "-" + variant}`;

export function artSrc(role, art = roleArt(role)) {
  const custom = ui.customArt[art.split("/").pop()] || ui.customArt[role.toLowerCase()];
  return custom ? `art/custom/${encodeURIComponent(custom)}` : `art/${art}.svg`;
}
