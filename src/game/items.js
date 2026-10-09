// ============================================================
// EDIT THIS FILE for loot items
// File: src/game/items.js
//
// Put your pictures in:
//   public/sprites/items/bomb.png
//   public/sprites/items/reveal.png
//   public/sprites/items/heal.png
//   public/sprites/items/speed.png
//   public/sprites/items/shield.png
// Magenta (#FF00FF) background gets cut out.
// ============================================================

export const ITEMS = [
  { id: "bomb", name: "BOMB", file: "/sprites/items/bomb.png", color: "#d0483f" },
  { id: "reveal", name: "SIGHT", file: "/sprites/items/reveal.png", color: "#5aa9ff" },
  { id: "heal", name: "HEAL", file: "/sprites/items/heal.png", color: "#e04b4b" },
  { id: "speed", name: "SPEED", file: "/sprites/items/speed.png", color: "#f0c040" },
  { id: "shield", name: "SHIELD", file: "/sprites/items/shield.png", color: "#7ad7e8" },
];

export const LOOT_COUNT = 3;         // max items on the map at once
export const LOOT_START_DELAY = 8;   // seconds before first item
export const LOOT_SPAWN_GAP = 6;     // seconds between extra items
export const LOOT_REFRESH = 12;      // wait after you collect ALL, then spawn again

export const BOMB_RANGE = 52;
export const BOMB_DMG = 1.5;
export const REVEAL_TIME = 10;
export const SPEED_TIME = 8;
export const HEAL_AMT = 2;

export function randomItem() {
  return ITEMS[(Math.random() * ITEMS.length) | 0].id;
}

export function itemIcon(id) {
  const def = ITEMS.find((i) => i.id === id);
  const c = document.createElement("canvas");
  c.width = 12;
  c.height = 12;
  const g = c.getContext("2d");
  g.fillStyle = "#0c0c12";
  g.fillRect(0, 0, 12, 12);
  g.fillStyle = def.color;
  g.fillRect(1, 1, 10, 10);
  return c;
}
