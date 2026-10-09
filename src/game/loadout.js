// ============================================================
// EDIT THIS FILE for characters, swords, and unlocks
// File: src/game/loadout.js
//
// Put your pictures in:
//   public/sprites/chars/char1.png ... char5.png
//   public/sprites/weapons/weapon1.png ... weapon5.png
//   public/sprites/player.png   (starter look)
//   public/sprites/enemy1.png
//   public/sprites/sword.png    (starter sword)
// Magenta (#FF00FF) background gets cut out.
//
// Change need: { kills: 10, wins: 0 } to lock / unlock
// ============================================================

export const PLAYER_PAL = {
  outline: "#0c0c12",
  hair: "#a86b3c",
  skin: "#eab991",
  eyes: "#0c0c12",
  body: "#1a1a22",
  shirt: "#f0f0f0",
  accent: "#d0342c",
  pants: "#24242e",
};

export const ENEMY_PALS = [
  { ...PLAYER_PAL, hair: "#15151c", body: "#5d7694", accent: "#3f6fd8", pants: "#3f6fd8" },
  { ...PLAYER_PAL, hair: "#2b1d12", body: "#7a5f8f", accent: "#4a3c78", pants: "#4a3c78" },
  { ...PLAYER_PAL, hair: "#15151c", body: "#8f5b4a", accent: "#5a3a2e", pants: "#5a3a2e" },
  { ...PLAYER_PAL, hair: "#5c5c66", body: "#4d7a5a", accent: "#2f4a38", pants: "#2f4a38" },
];

export const ENEMY_TINTS = ["#ffffff", "#b070e0", "#70c070", "#d0a040"];

export const CHARACTERS = [
  { id: 0, name: "SUIT", file: "/sprites/chars/char1.png", palette: PLAYER_PAL, need: { kills: 0, wins: 0 } },
  { id: 1, name: "BLUE", file: "/sprites/chars/char2.png", palette: { ...PLAYER_PAL, hair: "#15151c", body: "#5d7694", accent: "#3f6fd8", pants: "#3f6fd8" }, need: { kills: 5, wins: 0 } },
  { id: 2, name: "CRIMSON", file: "/sprites/chars/char3.png", palette: { ...PLAYER_PAL, hair: "#3a1a12", body: "#7a2a28", accent: "#e04b4b", pants: "#4a1c1c" }, need: { kills: 15, wins: 0 } },
  { id: 3, name: "MOSS", file: "/sprites/chars/char4.png", palette: { ...PLAYER_PAL, hair: "#2b1d12", body: "#3d6a38", accent: "#6ddf5a", pants: "#2f4a38" }, need: { kills: 25, wins: 0 } },
  { id: 4, name: "GOLD", file: "/sprites/chars/char5.png", palette: { ...PLAYER_PAL, hair: "#e8b43c", body: "#c9a227", accent: "#fff0a8", pants: "#6a5420" }, need: { kills: 40, wins: 1 } },
];

export const WEAPONS = [
  { id: 0, name: "CYAN", file: "/sprites/weapons/weapon1.png", need: { kills: 0, wins: 0 }, range: 42, handle: "#6a2f9e", blade: "#7ad7e8", pommel: "#e8b43c" },
  { id: 1, name: "CRIMSON", file: "/sprites/weapons/weapon2.png", need: { kills: 10, wins: 0 }, range: 46, handle: "#5a2018", blade: "#e04b4b", pommel: "#f0c040" },
  { id: 2, name: "JADE", file: "/sprites/weapons/weapon3.png", need: { kills: 20, wins: 0 }, range: 48, handle: "#2f4a38", blade: "#6ddf5a", pommel: "#c9a227" },
  { id: 3, name: "GOLD", file: "/sprites/weapons/weapon4.png", need: { kills: 0, wins: 3 }, range: 50, handle: "#6a5420", blade: "#f0c040", pommel: "#fff0a8" },
  { id: 4, name: "VOID", file: "/sprites/weapons/weapon5.png", need: { kills: 50, wins: 0 }, range: 54, handle: "#1a1a22", blade: "#d0d4e0", pommel: "#8d55c8" },
];

function loadJSON(key, def) {
  try {
    return { ...def, ...JSON.parse(localStorage.getItem(key) || "null") };
  } catch {
    return { ...def };
  }
}
function saveJSON(key, v) {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export function loadSettings() {
  return loadJSON("silentstrike.settings", { volume: 0.7, ripples: true, difficulty: "normal" });
}
export function saveSettings(s) {
  saveJSON("silentstrike.settings", s);
}
export function loadStats() {
  return loadJSON("silentstrike.stats", { kills: 0, wins: 0, char: 0, weapon: 0 });
}
export function saveStats(s) {
  saveJSON("silentstrike.stats", s);
}
export function isOpen(need, st) {
  return st.kills >= need.kills && st.wins >= need.wins;
}
export function needText(n) {
  if (n.kills <= 0 && n.wins <= 0) return "FREE";
  const b = [];
  if (n.kills > 0) b.push("KILL " + n.kills);
  if (n.wins > 0) b.push("WIN " + n.wins);
  return b.join(" + ");
}
