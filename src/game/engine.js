// ============================================================
// The match itself (move, swing, AI, loot, draw)
// File: src/game/engine.js
// You usually do NOT edit this unless you change how fighting works.
// Timers / damage / unlocks = config.js, items.js, loadout.js
// ============================================================

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, HIDDEN_TIME, VISIBLE_TIME, SWING_TIME, BODY_R, SPRITE_W, SPRITE_H, SWORD_SIZE, DIFF, rnd, clamp } from "./config.js";
import { ITEMS, LOOT_COUNT, LOOT_START_DELAY, LOOT_SPAWN_GAP, LOOT_REFRESH, BOMB_RANGE, BOMB_DMG, REVEAL_TIME, SPEED_TIME, HEAL_AMT, itemIcon } from "./items.js";
import { CHARACTERS, WEAPONS, ENEMY_PALS, ENEMY_TINTS } from "./loadout.js";
import { buildSprite, buildSword, loadArt, tint } from "./sprites.js";
import { Sfx } from "./audio.js";
import { drawText, textW } from "./font.js";

const hypot = (x, y) => Math.hypot(x, y);

export class Game {
  constructor(canvas, opts) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.imageSmoothingEnabled = false;
    this.settings = opts.settings;
    this.onEnd = opts.onEnd;
    this.onPause = opts.onPause;
    this.charId = opts.charId || 0;
    this.weaponId = opts.weaponId || 0;
    this.sfx = new Sfx();
    this.sfx.setVolume(this.settings.volume);
    const wep = WEAPONS[this.weaponId] || WEAPONS[0];
    this.hitRange = wep.range;
    this.swordSpr = buildSword(wep);
    this.swordArt = null;
    if (wep.id === 0) loadArt("/sprites/sword.png", (c) => (this.swordArt = c));
    loadArt(wep.file, (c) => (this.swordArt = c));
    this.itemArt = {};
    this.itemIcon = {};
    ITEMS.forEach((it) => {
      this.itemIcon[it.id] = itemIcon(it.id);
      loadArt(it.file, (c) => (this.itemArt[it.id] = c));
    });
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.attackBtn = false;
    this.sneakBtn = false;
    this.mouse = { x: VIEW_W / 2, y: VIEW_H / 2, down: false };
    this.running = false;
    this.paused = false;
    this.over = false;
    this.time = 0;
    this.phase = "visible";
    this.phaseLeft = VISIBLE_TIME;
    this.flashScreen = 0;
    this.shake = 0;
    this.camX = 0;
    this.camY = 0;
    this.held = null;
    this.itemReveal = 0;
    this.loot = [];
    this.booms = [];
    this.ripples = [];
    this.corpses = [];
    this.lootWait = LOOT_START_DELAY;
    this.bg = this.buildWorld();
    this.spawnFighters();
  }

  buildWorld() {
    const c = document.createElement("canvas");
    c.width = WORLD_W;
    c.height = WORLD_H;
    const g = c.getContext("2d");
    g.fillStyle = "#4e9e3e";
    g.fillRect(0, 0, WORLD_W, WORLD_H);
    for (let y = 0; y < WORLD_H; y += 16)
      for (let x = 0; x < WORLD_W; x += 16)
        if ((((x / 16 + y / 16) | 0) % 2) === 0) {
          g.fillStyle = "#4a9739";
          g.fillRect(x, y, 16, 16);
        }
    this.obstacles = [
      { x: 90, y: 78, w: 72, h: 12 }, { x: 318, y: 78, w: 72, h: 12 },
      { x: 78, y: 130, w: 12, h: 64 }, { x: 390, y: 130, w: 12, h: 64 },
      { x: 200, y: 196, w: 80, h: 12 }, { x: 110, y: 250, w: 64, h: 12 }, { x: 306, y: 250, w: 64, h: 12 },
      { x: 160, y: 40, w: 28, h: 20 }, { x: 292, y: 40, w: 28, h: 20 }, { x: 230, y: 108, w: 24, h: 18 },
      { x: 170, y: 158, w: 16, h: 12 }, { x: 300, y: 148, w: 16, h: 12 },
    ];
    this.obstacles.forEach((o) => {
      g.fillStyle = "#0c0c12";
      g.fillRect(o.x - 1, o.y - 1, o.w + 2, o.h + 2);
      g.fillStyle = o.h <= 12 && o.w > 20 ? "#8a8f98" : o.w > 20 ? "#2f6f2a" : "#8b9099";
      g.fillRect(o.x, o.y, o.w, o.h);
    });
    g.fillStyle = "#7b7f86";
    g.fillRect(0, 0, WORLD_W, 12);
    g.fillRect(0, WORLD_H - 12, WORLD_W, 12);
    g.fillRect(0, 0, 12, WORLD_H);
    g.fillRect(WORLD_W - 12, 0, 12, WORLD_H);
    return c;
  }

  makeFighter(id, player, x, y) {
    const d = DIFF[this.settings.difficulty];
    const ch = CHARACTERS[this.charId] || CHARACTERS[0];
    const pal = player ? ch.palette : ENEMY_PALS[(id - 1) % ENEMY_PALS.length];
    const f = {
      id, player, x, y, vx: 0, vy: 0, dir: Math.PI / 2, hp: player ? 4 : 3, maxHp: player ? 4 : 3, alive: true,
      speed: player ? 58 : d.speed + rnd(-3, 3), sneak: false, cooldown: 0, swing: 0, swung: false, walkT: 0, stepT: 0,
      flash: 0, reveal: 0, kills: 0, shield: false, boost: 0, sprite: buildSprite(pal), art: null,
      think: 0, wander: null, known: null, hearing: d.hearing, sight: d.sight, nerve: d.aggro,
    };
    if (player) {
      loadArt("/sprites/player.png", (c) => { if (!f.art) f.art = c; });
      loadArt(ch.file, (c) => (f.art = c));
    } else {
      loadArt("/sprites/enemy1.png", (c) => (f.art = id === 1 ? c : tint(c, ENEMY_TINTS[id % ENEMY_TINTS.length])));
    }
    return f;
  }

  spawnFighters() {
    this.fighters = [this.makeFighter(0, true, WORLD_W / 2, WORLD_H / 2 + 8)];
    [{ x: 40, y: 44 }, { x: WORLD_W - 40, y: 44 }, { x: 40, y: WORLD_H - 36 }, { x: WORLD_W - 40, y: WORLD_H - 36 }]
      .forEach((s, i) => this.fighters.push(this.makeFighter(i + 1, false, s.x, s.y)));
  }

  spawnOneLoot() {
    for (let n = 0; n < 24; n++) {
      const x = rnd(28, WORLD_W - 28), y = rnd(32, WORLD_H - 28);
      let hit = false;
      for (const o of this.obstacles) if (x > o.x - 10 && x < o.x + o.w + 10 && y > o.y - 10 && y < o.y + o.h + 10) hit = true;
      if (hit) continue;
      this.loot.push({ x, y, id: ITEMS[(Math.random() * ITEMS.length) | 0].id });
      return;
    }
    this.loot.push({ x: WORLD_W / 2, y: 80, id: "bomb" });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.kd = (e) => {
      this.sfx.ensure();
      if (e.key === "Escape") { this.onPause(); return; }
      const k = e.key.toLowerCase();
      if (k === "e" || k === "q" || k === "f") this.useItem();
      this.keys.add(k);
      if ([" ", "arrowup", "arrowdown", "arrowleft", "arrowright"].includes(k) || e.key === " ") e.preventDefault();
    };
    this.ku = (e) => this.keys.delete(e.key.toLowerCase());
    this.mm = (e) => {
      const r = this.canvas.getBoundingClientRect();
      this.mouse.x = ((e.clientX - r.left) / r.width) * VIEW_W;
      this.mouse.y = ((e.clientY - r.top) / r.height) * VIEW_H;
    };
    this.md = () => { this.sfx.ensure(); this.mouse.down = true; };
    this.mu = () => { this.mouse.down = false; };
    window.addEventListener("keydown", this.kd);
    window.addEventListener("keyup", this.ku);
    this.canvas.addEventListener("mousemove", this.mm);
    this.canvas.addEventListener("mousedown", this.md);
    window.addEventListener("mouseup", this.mu);
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener("keydown", this.kd);
    window.removeEventListener("keyup", this.ku);
    this.canvas.removeEventListener("mousemove", this.mm);
    this.canvas.removeEventListener("mousedown", this.md);
    window.removeEventListener("mouseup", this.mu);
    this.sfx.close();
  }

  setPaused(p) {
    this.paused = p;
    this.keys.clear();
    this.stick = { x: 0, y: 0 };
    this.attackBtn = false;
    if (!p) this.last = performance.now();
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused && !this.over) this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.time += dt;
    this.flashScreen = Math.max(0, this.flashScreen - dt * 4);
    this.shake = Math.max(0, this.shake - dt * 12);
    this.phaseLeft -= dt;
    if (this.phaseLeft <= 0) {
      if (this.phase === "visible") { this.phase = "hidden"; this.phaseLeft = HIDDEN_TIME; this.sfx.play("hide", 0.9, 0); }
      else { this.phase = "visible"; this.phaseLeft = VISIBLE_TIME; this.flashScreen = 1; this.sfx.play("reveal", 0.9, 0); }
    }
    const p = this.fighters[0];
    this.itemReveal = Math.max(0, this.itemReveal - dt);
    if (p.alive) this.control(p);
    for (const f of this.fighters) {
      if (!f.alive) continue;
      if (!f.player) this.ai(f, dt);
      this.move(f, dt);
      this.updateSwing(f, dt);
      f.flash = Math.max(0, f.flash - dt);
      f.reveal = Math.max(0, f.reveal - dt);
      f.boost = Math.max(0, f.boost - dt);
      if (f.cooldown > 0) f.cooldown -= dt;
    }
    if (p.alive) {
      for (let i = this.loot.length - 1; i >= 0; i--) {
        const L = this.loot[i];
        if (hypot(L.x - p.x, L.y - p.y) < 12) {
          this.held = L.id;
          this.loot.splice(i, 1);
          this.sfx.play("pickup", 0.7, 0);
          if (!this.loot.length) this.lootWait = LOOT_REFRESH;
        }
      }
    }
    if (this.loot.length < LOOT_COUNT) {
      this.lootWait -= dt;
      if (this.lootWait <= 0) {
        this.spawnOneLoot();
        this.lootWait = this.loot.length === 0 ? LOOT_REFRESH : LOOT_SPAWN_GAP;
      }
    }
    this.ripples = this.ripples.filter((r) => { r.r += dt * 90; return r.r <= r.max; });
    this.booms = this.booms.filter((b) => { b.r += dt * 140; b.life -= dt; return b.life > 0; });
  }

  control(p) {
    const k = this.keys;
    let dx = this.stick.x, dy = this.stick.y;
    if (k.has("a") || k.has("arrowleft")) dx -= 1;
    if (k.has("d") || k.has("arrowright")) dx += 1;
    if (k.has("w") || k.has("arrowup")) dy -= 1;
    if (k.has("s") || k.has("arrowdown")) dy += 1;
    const len = hypot(dx, dy);
    p.sneak = k.has("shift") || this.sneakBtn;
    const sp = p.speed * (p.sneak ? 0.5 : 1) * (p.boost > 0 ? 1.45 : 1);
    if (len > 0.18) { p.vx = (dx / len) * sp; p.vy = (dy / len) * sp; p.dir = Math.atan2(dy, dx); }
    else { p.vx = 0; p.vy = 0; p.dir = Math.atan2(this.camY + this.mouse.y - p.y, this.camX + this.mouse.x - p.x); }
    if (this.mouse.down || k.has(" ") || this.attackBtn) this.attack(p);
  }

  ai(f, dt) {
    f.think -= dt;
    if (this.phase === "visible" && f.think <= 0) {
      f.think = 0.2;
      let best = null, bestD = f.sight;
      for (const o of this.fighters) {
        if (o === f || !o.alive) continue;
        const d = hypot(o.x - f.x, o.y - f.y);
        if (d < bestD) { bestD = d; best = o; }
      }
      if (best) f.known = { x: best.x, y: best.y, t: this.time };
    }
    const mem = f.known && this.time - f.known.t < 5 ? f.known : null;
    let tx, ty, chasing = false;
    if (mem) { tx = mem.x; ty = mem.y; chasing = true; }
    else {
      if (!f.wander || hypot(f.wander.x - f.x, f.wander.y - f.y) < 14)
        f.wander = { x: clamp(f.x + rnd(-140, 140), 30, WORLD_W - 30), y: clamp(f.y + rnd(-140, 140), 30, WORLD_H - 30) };
      tx = f.wander.x; ty = f.wander.y;
    }
    const dx = tx - f.x, dy = ty - f.y, dist = hypot(dx, dy) || 1;
    f.dir = Math.atan2(dy, dx);
    f.sneak = !chasing;
    const sp = f.speed * (chasing ? 1 : 0.55);
    if (chasing && dist < this.hitRange - 6) { f.vx = 0; f.vy = 0; this.attack(f); }
    else {
      f.vx = (dx / dist) * sp; f.vy = (dy / dist) * sp;
      if (chasing && dist < this.hitRange + 14 && Math.random() < 0.35 * f.nerve * dt * 10) this.attack(f);
    }
  }

  move(f, dt) {
    const moving = Math.abs(f.vx) + Math.abs(f.vy) > 1;
    if (moving) {
      f.walkT += dt * (f.sneak ? 4 : 8);
      f.stepT -= dt;
      if (f.stepT <= 0) { f.stepT = f.sneak ? 0.55 : 0.34; this.emit("step", f, f.sneak ? 0.45 : 1); }
    } else f.walkT = 0;
    let nx = clamp(f.x + f.vx * dt, 18, WORLD_W - 18), ny = clamp(f.y + f.vy * dt, 24, WORLD_H - 16);
    for (const o of this.obstacles) {
      const cx = clamp(nx, o.x, o.x + o.w), cy = clamp(ny, o.y, o.y + o.h);
      const ddx = nx - cx, ddy = ny - cy, d = hypot(ddx, ddy);
      if (d < BODY_R) { if (d === 0) ny = o.y - BODY_R; else { nx = cx + (ddx / d) * BODY_R; ny = cy + (ddy / d) * BODY_R; } }
    }
    for (const o of this.fighters) {
      if (o === f || !o.alive) continue;
      const ddx = nx - o.x, ddy = ny - o.y, d = hypot(ddx, ddy);
      if (d > 0 && d < 9) { nx = o.x + (ddx / d) * 9; ny = o.y + (ddy / d) * 9; }
    }
    f.x = nx; f.y = ny;
  }

  attack(f) {
    if (f.cooldown > 0 || f.swing > 0) return;
    f.swing = SWING_TIME; f.swung = false; f.cooldown = 0.62; this.emit("swing", f, 1);
  }

  updateSwing(f, dt) {
    if (f.swing <= 0) return;
    f.swing -= dt;
    if (!f.swung && f.swing <= SWING_TIME * 0.5) {
      f.swung = true;
      for (const o of this.fighters) {
        if (o === f || !o.alive) continue;
        if (hypot(o.x - f.x, o.y - f.y) <= this.hitRange + BODY_R) this.damage(o, f, 1);
      }
    }
    if (f.swing < 0) f.swing = 0;
  }

  useItem() {
    const p = this.fighters[0];
    if (!p || !p.alive || !this.held || this.over || this.paused) return;
    const id = this.held;
    this.held = null;
    if (id === "bomb") {
      this.booms.push({ x: p.x, y: p.y, r: 6, max: BOMB_RANGE, life: 0.35 });
      this.sfx.play("boom", 0.9, 0);
      for (const o of this.fighters) {
        if (o === p || !o.alive) continue;
        if (hypot(o.x - p.x, o.y - p.y) <= BOMB_RANGE) this.damage(o, p, BOMB_DMG);
      }
    } else if (id === "reveal") { this.itemReveal = REVEAL_TIME; this.sfx.play("reveal", 0.9, 0); }
    else if (id === "heal") { p.hp = Math.min(p.maxHp, p.hp + HEAL_AMT); this.sfx.play("pickup", 0.8, 0); }
    else if (id === "speed") { p.boost = SPEED_TIME; this.sfx.play("pickup", 0.8, 0); }
    else if (id === "shield") { p.shield = true; this.sfx.play("pickup", 0.8, 0); }
  }

  damage(t, from, amt = 1) {
    if (t.shield) { t.shield = false; t.flash = 0.18; this.emit("hit", t, 0.7); return; }
    t.hp -= amt; t.flash = 0.22; t.reveal = 0.55;
    const a = Math.atan2(t.y - from.y, t.x - from.x);
    t.x = clamp(t.x + Math.cos(a) * 9, 18, WORLD_W - 18);
    t.y = clamp(t.y + Math.sin(a) * 9, 24, WORLD_H - 16);
    this.emit("hit", t, 1);
    if (t.player) { this.shake = 1; this.sfx.play("hurt", 0.8, 0); from.reveal = Math.max(from.reveal, 0.5); }
    if (t.hp <= 0) this.kill(t, from);
  }

  kill(t, from) {
    t.alive = false; from.kills += 1;
    this.corpses.push({ x: t.x, y: t.y, sprite: t.sprite });
    this.emit("death", t, 1);
    const alive = this.fighters.filter((f) => f.alive);
    if (!this.fighters[0].alive) this.finish(false);
    else if (alive.length === 1) this.finish(true);
  }

  finish(win) {
    if (this.over) return;
    this.over = true;
    this.onEnd({ win, kills: this.fighters[0].kills, time: Math.floor(this.time) });
  }

  emit(kind, src, str) {
    const range = { step: 110, swing: 155, hit: 200, death: 240, boom: 240, pickup: 80, reveal: 999, hide: 999, hurt: 999 }[kind] * str;
    const p = this.fighters[0];
    if (src.player) this.sfx.play(kind, 0.55 * str, 0);
    else {
      const d = hypot(src.x - p.x, src.y - p.y);
      if (d < range) {
        const vol = Math.pow(1 - d / range, 1.5);
        this.sfx.play(kind, vol, clamp((src.x - p.x) / 140, -1, 1));
        if (this.settings.ripples) this.ripples.push({ x: src.x, y: src.y, r: 3, max: 10 + 26 * vol, color: kind === "step" ? "#fff" : kind === "swing" ? "#7ad7e8" : "#ff7070" });
      }
    }
    for (const f of this.fighters) {
      if (f === src || !f.alive || f.player) continue;
      const d = hypot(src.x - f.x, src.y - f.y);
      if (d < Math.min(range, f.hearing * str)) f.known = { x: src.x + rnd(-10, 10), y: src.y + rnd(-10, 10), t: this.time };
    }
  }

  render() {
    const ctx = this.ctx, p = this.fighters[0];
    ctx.imageSmoothingEnabled = false;
    let camX = clamp(p.x - VIEW_W / 2, 0, WORLD_W - VIEW_W), camY = clamp(p.y - VIEW_H / 2, 0, WORLD_H - VIEW_H);
    if (this.shake > 0) { camX += rnd(-2, 2) * this.shake; camY += rnd(-2, 2) * this.shake; }
    this.camX = Math.round(camX); this.camY = Math.round(camY);
    ctx.clearRect(0, 0, VIEW_W, VIEW_H);
    ctx.drawImage(this.bg, this.camX, this.camY, VIEW_W, VIEW_H, 0, 0, VIEW_W, VIEW_H);
    for (const c of this.corpses) {
      ctx.globalAlpha = 0.8; ctx.save(); ctx.translate(c.x - this.camX, c.y - this.camY); ctx.rotate(Math.PI / 2);
      ctx.drawImage(c.sprite.ghost, -SPRITE_W / 2, -SPRITE_H / 2, SPRITE_W, SPRITE_H); ctx.restore(); ctx.globalAlpha = 1;
    }
    for (const L of this.loot) {
      const art = this.itemArt[L.id] || this.itemIcon[L.id];
      ctx.drawImage(art, Math.round(L.x - this.camX - 6), Math.round(L.y - this.camY - 6 + Math.sin(this.time * 6)), 12, 12);
    }
    this.fighters.filter((f) => f.alive).sort((a, b) => a.y - b.y).forEach((f) => this.drawFighter(f));
    for (const r of this.ripples) {
      ctx.strokeStyle = r.color; ctx.globalAlpha = clamp(1 - r.r / r.max, 0, 1) * 0.55;
      ctx.beginPath(); ctx.arc(r.x - this.camX, r.y - this.camY, r.r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    for (const b of this.booms) {
      ctx.strokeStyle = "#ffb070"; ctx.globalAlpha = clamp(b.life / 0.35, 0, 1);
      ctx.beginPath(); ctx.arc(b.x - this.camX, b.y - this.camY, b.r, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1;
    }
    if (this.phase === "hidden") { ctx.fillStyle = "rgba(10,16,30,0.3)"; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    if (this.flashScreen > 0) { ctx.fillStyle = `rgba(255,255,255,${this.flashScreen * 0.5})`; ctx.fillRect(0, 0, VIEW_W, VIEW_H); }
    this.drawHud();
  }

  drawFighter(f) {
    const vis = f.player || this.phase === "visible" || f.reveal > 0 || this.itemReveal > 0;
    if (!vis) return;
    const ctx = this.ctx;
    const sx = Math.round(f.x - this.camX - SPRITE_W / 2), sy = Math.round(f.y - this.camY - SPRITE_H + 4);
    ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(sx + 4, sy + SPRITE_H - 2, SPRITE_W - 8, 2);
    const ghost = f.player && this.phase === "hidden";
    ctx.globalAlpha = ghost ? 0.45 : 1;
    const img = f.art || f.sprite.down[Math.abs(f.vx) + Math.abs(f.vy) > 1 && Math.floor(f.walkT) % 2 ? 1 : 0];
    const flip = Math.cos(f.dir) < -0.15;
    if (flip) { ctx.save(); ctx.translate(sx + SPRITE_W, sy); ctx.scale(-1, 1); ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, SPRITE_W, SPRITE_H); ctx.restore(); }
    else ctx.drawImage(img, 0, 0, img.width, img.height, sx, sy, SPRITE_W, SPRITE_H);
    if (f.flash > 0) { ctx.globalAlpha = 0.85; ctx.drawImage(f.sprite.flash, sx, sy, SPRITE_W, SPRITE_H); }
    ctx.globalAlpha = 1;
    this.drawSword(f, ghost ? 0.45 : 1);
    if (f.shield) { ctx.strokeStyle = "#7ad7e8"; ctx.beginPath(); ctx.arc(f.x - this.camX, f.y - this.camY - 4, 12, 0, Math.PI * 2); ctx.stroke(); }
  }

  drawSword(f, alpha) {
    const ctx = this.ctx;
    const p = f.swing > 0 ? 1 - f.swing / SWING_TIME : 0;
    const angle = f.swing > 0 ? f.dir + p * Math.PI * 2 : f.dir + 0.55;
    const hx = f.x - this.camX + Math.cos(f.dir) * 4, hy = f.y - this.camY - 6;
    const spr = this.swordArt || this.swordSpr;
    const w = SWORD_SIZE, h = w * (spr.height / spr.width);
    if (f.swing > 0) {
      ctx.save(); ctx.globalAlpha = alpha * 0.45; ctx.strokeStyle = "#c4f6ff"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(hx, hy, SWORD_SIZE * 0.95, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
    }
    ctx.save(); ctx.globalAlpha = alpha; ctx.translate(hx, hy); ctx.rotate(angle + (this.swordArt ? -0.7 : 0));
    ctx.drawImage(spr, 2, -h / 2, w, h); ctx.restore();
  }

  drawHud() {
    const ctx = this.ctx, p = this.fighters[0];
    for (let i = 0; i < p.maxHp; i++) {
      this.drawHeart(6 + i * 10, 4, p.hp >= i + 1, !!(p.hp >= i + 0.5 && p.hp < i + 1));
    }
    const total = this.phase === "hidden" ? HIDDEN_TIME : VISIBLE_TIME, pct = clamp(this.phaseLeft / total, 0, 1);
    const bw = 90, bx = (VIEW_W - bw) / 2 | 0;
    ctx.fillStyle = "#0c0c12"; ctx.fillRect(bx - 2, 4, bw + 4, 9);
    ctx.fillStyle = "#23262e"; ctx.fillRect(bx, 6, bw, 5);
    ctx.fillStyle = this.phase === "hidden" ? "#5aa9ff" : "#6ddf5a"; ctx.fillRect(bx, 6, bw * pct | 0, 5);
    const label = (this.phase === "hidden" ? "HIDDEN " : "VISIBLE ") + Math.ceil(this.phaseLeft);
    drawText(ctx, label, (VIEW_W - textW(label)) / 2 | 0, 16, "#e8f2e8");
    const at = "ALIVE " + this.fighters.filter((f) => f.alive).length;
    drawText(ctx, at, VIEW_W - 8 - textW(at), 22, "#e8f2e8");
    if (this.held) {
      const ic = this.itemArt[this.held] || this.itemIcon[this.held];
      ctx.fillStyle = "#0c0c12"; ctx.fillRect(6, 16, 12, 12); ctx.drawImage(ic, 6, 16, 12, 12);
    }
  }

  drawHeart(x, y, full, half) {
    const ctx = this.ctx;
    const map = [" ## ## ", "#######", "#######", " ##### ", "  ###  ", "   #   "];
    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < 7; col++) {
        if (map[row][col] !== "#") continue;
        if (half && col >= 4) {
          ctx.fillStyle = "#3a3a46";
        } else {
          ctx.fillStyle = full || half ? "#e04b4b" : "#3a3a46";
        }
        ctx.fillRect(x + col, y + row, 1, 1);
      }
    }
  }
}
