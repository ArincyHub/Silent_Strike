// ============================================================
// Sounds
// File: src/game/audio.js
//
// DROP YOUR AUDIO HERE (keep these names):
//   public/audio/menu.mp3     dashboard / menu
//   public/audio/battle.mp3   while fighting
//   public/audio/swing.mp3    sword swing
//   public/audio/hit.mp3      when you hit someone
//   public/audio/death.mp3    when someone dies
// If a file is missing, a built-in beep plays instead.
// ============================================================

import { clamp } from "./config.js";

function makeAudio(src, loop) {
  const a = new Audio(src);
  a.loop = !!loop;
  a.preload = "auto";
  return a;
}

export class Sfx {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.volume = 0.7;
    this.clips = {
      swing: makeAudio("/audio/swing.mp3"),
      hit: makeAudio("/audio/hit.mp3"),
      death: makeAudio("/audio/death.mp3"),
    };
  }
  ensure() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }
  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }
  close() {
    if (this.ctx) this.ctx.close();
    this.ctx = null;
  }
  chain(pan) {
    const g = this.ctx.createGain();
    const p = this.ctx.createStereoPanner();
    p.pan.value = clamp(pan, -1, 1);
    g.connect(p);
    p.connect(this.master);
    return { g };
  }
  playFile(kind, vol) {
    const src = this.clips[kind];
    if (!src || src.readyState < 2) return false;
    const n = src.cloneNode();
    n.volume = Math.max(0, Math.min(1, this.volume * vol));
    n.play().catch(() => {});
    return true;
  }
  play(kind, vol, pan) {
    if (vol <= 0.01) return;
    this.ensure();
    if (kind === "swing" || kind === "hit" || kind === "death") {
      if (this.playFile(kind, vol)) return;
    }
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (kind === "step") this.burst(vol * 0.5, pan, t, 0.1, 400);
    else if (kind === "swing") this.burst(vol * 0.45, pan, t, 0.2, 1800);
    else if (kind === "hit") this.tone(vol, pan, t, 880, 320, 0.2);
    else if (kind === "hurt") this.tone(vol, pan, t, 220, 70, 0.3);
    else if (kind === "death") this.tone(vol, pan, t, 400, 60, 0.55);
    else if (kind === "boom") this.burst(vol * 0.7, pan, t, 0.4, 200);
    else if (kind === "pickup" || kind === "reveal") this.beep(vol, [740, 988], t);
    else if (kind === "hide") this.beep(vol, [392, 262], t);
  }
  burst(vol, pan, t, dur, freq) {
    const { g } = this.chain(pan);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = freq;
    src.connect(f);
    f.connect(g);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.start(t);
    src.stop(t + dur + 0.02);
  }
  tone(vol, pan, t, a, b, dur) {
    const { g } = this.chain(pan);
    const o = this.ctx.createOscillator();
    o.type = "square";
    o.frequency.setValueAtTime(a, t);
    o.frequency.exponentialRampToValueAtTime(b, t + dur);
    o.connect(g);
    g.gain.setValueAtTime(vol * 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  beep(vol, notes, t) {
    notes.forEach((f, i) => {
      const { g } = this.chain(0);
      const o = this.ctx.createOscillator();
      o.type = "square";
      o.frequency.value = f;
      const s = t + i * 0.12;
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(vol * 0.18, s + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.14);
      o.connect(g);
      o.start(s);
      o.stop(s + 0.16);
    });
  }
}

export class Music {
  constructor() {
    this.menu = makeAudio("/audio/menu.mp3", true);
    this.battle = makeAudio("/audio/battle.mp3", true);
    this.vol = 10;
  }
  setVolume(v) {
    this.vol = Math.max(0, Math.min(1, v * 0.5));
    this.menu.volume = this.vol;
    this.battle.volume = this.vol;
  }
  playMenu() {
    this.battle.pause();
    this.menu.volume = this.vol;
    this.menu.play().catch(() => {});
  }
  playBattle() {
    this.menu.pause();
    this.battle.currentTime = 0;
    this.battle.volume = this.vol;
    this.battle.play().catch(() => {});
  }
  stop() {
    this.menu.pause();
    this.battle.pause();
  }
}
