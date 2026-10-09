// ============================================================
// EDIT THIS FILE to change game feel / map / timers
// File: src/game/config.js
// ============================================================

export const VIEW_W = 320;
export const VIEW_H = 180;
export const WORLD_W = 480;
export const WORLD_H = 320;

export const HIDDEN_TIME = 20;   // seconds invisible
export const VISIBLE_TIME = 5;   // seconds visible
export const SWING_TIME = 0.5;   // 360 swing length
export const BODY_R = 6;
export const SPRITE_W = 22;
export const SPRITE_H = 26;
export const SWORD_SIZE = 34;

export const DIFF = {
  easy: { speed: 42, hearing: 90, sight: 120, aggro: 0.8 },
  normal: { speed: 50, hearing: 115, sight: 140, aggro: 1 },
  hard: { speed: 58, hearing: 140, sight: 165, aggro: 1.25 },
};

export function rnd(a, b) { return a + Math.random() * (b - a); }
export function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
