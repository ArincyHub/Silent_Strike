// ============================================================
// Starts the pages (menu, loadout, guide, settings, game)
// File: src/main.js
// You usually do NOT edit this.
// ============================================================

import { Game } from "./game/engine.js";
import { GUIDE } from "./game/guide.js";
import { CHARACTERS, WEAPONS, PLAYER_PAL, ENEMY_PALS, loadSettings, saveSettings, loadStats, saveStats, isOpen, needText } from "./game/loadout.js";
import { buildSprite } from "./game/sprites.js";
import { Music } from "./game/audio.js";

const settings = loadSettings();
let stats = loadStats();
let game = null;
let loadTab = "char";
const music = new Music();
music.setVolume(settings.volume);

document.querySelectorAll("img.btn-ico").forEach((img) => {
  img.addEventListener("error", () => {
    img.style.display = "none";
  });
});

function show(name) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.remove("on"));
  document.getElementById("screen-" + name).classList.add("on");
  if (name !== "game" && game) {
    game.stop();
    game = null;
  }
  if (name === "game") music.playBattle();
  else music.playMenu();
}

document.querySelectorAll("[data-go]").forEach((b) => {
  b.addEventListener("click", () => {
    const go = b.getAttribute("data-go");
    if (go === "play") startGame();
    else {
      show(go);
      if (go === "loadout") renderLoadout();
      if (go === "guide") renderGuide();
      if (go === "settings") renderSettings();
    }
  });
});

function renderGuide() {
  const box = document.getElementById("guide-box");
  box.innerHTML =
    "<h2>GUIDE</h2>" +
    GUIDE.map((g) => `<div class="h">${g.title}</div><p>${g.text}</p>`).join("") +
    '<button class="pbtn grey full" data-go="menu"><img class="btn-ico" src="/icons/back.png" alt="">BACK</button>';
  box.querySelector("[data-go]").onclick = () => show("menu");
  box.querySelectorAll("img.btn-ico").forEach((img) => {
    img.addEventListener("error", () => { img.style.display = "none"; });
  });
}

function renderSettings() {
  document.getElementById("vol").value = Math.round(settings.volume * 100);
  document.getElementById("vol-num").textContent = Math.round(settings.volume * 100);
  const rip = document.getElementById("ripples");
  rip.textContent = settings.ripples ? "ON" : "OFF";
  rip.className = "pbtn " + (settings.ripples ? "green" : "grey");
  document.querySelectorAll(".diff").forEach((b) => {
    b.className = "pbtn grow diff " + (settings.difficulty === b.dataset.d ? "green" : "grey");
  });
}
document.getElementById("vol").oninput = (e) => {
  settings.volume = Number(e.target.value) / 100;
  document.getElementById("vol-num").textContent = e.target.value;
  saveSettings(settings);
  music.setVolume(settings.volume);
};
document.getElementById("ripples").onclick = () => {
  settings.ripples = !settings.ripples;
  saveSettings(settings);
  renderSettings();
};
document.querySelectorAll(".diff").forEach((b) => {
  b.onclick = () => {
    settings.difficulty = b.dataset.d;
    saveSettings(settings);
    renderSettings();
  };
});

function renderLoadout() {
  stats = loadStats();
  document.getElementById("stats-line").textContent = `KILLS ${stats.kills} - WINS ${stats.wins}`;
  document.getElementById("tab-char").className = "pbtn grow " + (loadTab === "char" ? "green" : "grey");
  document.getElementById("tab-sword").className = "pbtn grow " + (loadTab === "sword" ? "green" : "grey");
  const grid = document.getElementById("loadout-grid");
  const list = loadTab === "char" ? CHARACTERS : WEAPONS;
  grid.innerHTML = "";
  list.forEach((it) => {
    const open = isOpen(it.need, stats);
    const on = (loadTab === "char" ? stats.char : stats.weapon) === it.id;
    const btn = document.createElement("button");
    btn.className = "card" + (open ? "" : " off") + (on ? " on" : "");
    btn.innerHTML = `<div>${it.name}</div><div style="margin-top:6px;color:#9bb89b">${open ? (on ? "ON" : "OPEN") : needText(it.need)}</div>`;
    btn.onclick = () => {
      if (!open) return;
      if (loadTab === "char") stats.char = it.id;
      else stats.weapon = it.id;
      saveStats(stats);
      renderLoadout();
    };
    grid.appendChild(btn);
  });
}
document.getElementById("tab-char").onclick = () => {
  loadTab = "char";
  renderLoadout();
};
document.getElementById("tab-sword").onclick = () => {
  loadTab = "sword";
  renderLoadout();
};

function startGame() {
  if (game) game.stop();
  stats = loadStats();
  show("game");
  document.getElementById("pause-ov").classList.remove("on");
  document.getElementById("end-ov").classList.remove("on");
  document.getElementById("controls").style.display = "";
  const canvas = document.getElementById("game");
  game = new Game(canvas, {
    settings,
    charId: stats.char,
    weaponId: stats.weapon,
    onEnd: (r) => {
      stats = loadStats();
      stats.kills += r.kills;
      if (r.win) stats.wins += 1;
      saveStats(stats);
      document.getElementById("end-title").textContent = r.win ? "YOU WIN" : "YOU DIED";
      document.getElementById("end-title").style.color = r.win ? "#5cc447" : "#e2564c";
      document.getElementById("end-sub").textContent = `KILLS ${r.kills} - TIME ${r.time}`;
      document.getElementById("end-ov").classList.add("on");
      document.getElementById("controls").style.display = "none";
    },
    onPause: () => togglePause(),
  });
  game.start();
  music.playBattle();
}

document.getElementById("btn-fs").onclick = () => {
  const el = document.documentElement;
  if (!document.fullscreenElement) el.requestFullscreen?.() || el.webkitRequestFullscreen?.();
  else document.exitFullscreen?.() || document.webkitExitFullscreen?.();
};

function togglePause(force) {
  if (!game || game.over) return;
  const ov = document.getElementById("pause-ov");
  const p = force === undefined ? !game.paused : force;
  game.setPaused(p);
  ov.classList.toggle("on", p);
  document.getElementById("controls").style.display = p ? "none" : "";
}
document.getElementById("btn-pause").onclick = () => togglePause(true);
document.getElementById("btn-resume").onclick = () => togglePause(false);
document.getElementById("btn-again").onclick = () => startGame();

(function () {
  const stick = document.getElementById("stick"),
    knob = document.getElementById("knob");
  let pid = null;
  function go(x, y) {
    const r = stick.getBoundingClientRect();
    let dx = x - (r.left + r.width / 2),
      dy = y - (r.top + r.height / 2);
    const max = r.width / 2 - 18,
      len = Math.hypot(dx, dy) || 1;
    if (len > max) {
      dx = (dx / len) * max;
      dy = (dy / len) * max;
    }
    knob.style.transform = `translate(${dx}px,${dy}px)`;
    if (game) game.stick = { x: dx / max, y: dy / max };
  }
  stick.onpointerdown = (e) => {
    pid = e.pointerId;
    stick.setPointerCapture(pid);
    go(e.clientX, e.clientY);
  };
  stick.onpointermove = (e) => {
    if (pid === e.pointerId) go(e.clientX, e.clientY);
  };
  const end = (e) => {
    if (pid !== e.pointerId) return;
    pid = null;
    knob.style.transform = "";
    if (game) game.stick = { x: 0, y: 0 };
  };
  stick.onpointerup = end;
  stick.onpointercancel = end;
  const hold = (el, set) => {
    el.onpointerdown = (e) => {
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      set(true);
    };
    el.onpointerup = () => set(false);
    el.onpointercancel = () => set(false);
  };
  hold(document.getElementById("btn-hit"), (v) => {
    if (game) game.attackBtn = v;
  });
  hold(document.getElementById("btn-sneak"), (v) => {
    if (game) game.sneakBtn = v;
  });
  document.getElementById("btn-skill").onpointerdown = (e) => {
    e.preventDefault();
    if (game) game.useItem();
  };
})();

document.addEventListener("touchmove", (e) => e.preventDefault(), { passive: false });
window.addEventListener(
  "pointerdown",
  () => {
    const o = screen.orientation;
    if (o && o.lock) o.lock("landscape").catch(() => {});
    music.playMenu();
  },
  { once: true },
);

(function () {
  const box = document.getElementById("menu-chars");
  [ENEMY_PALS[0], PLAYER_PAL, ENEMY_PALS[0]].forEach((pal, i) => {
    const spr = buildSprite(pal).down[0];
    const c = document.createElement("canvas");
    const sc = i === 1 ? 4 : 3;
    c.width = spr.width * sc;
    c.height = spr.height * sc;
    c.className = "pixelated";
    const g = c.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(spr, 0, 0, c.width, c.height);
    if (i !== 1) c.style.opacity = "0.5";
    box.appendChild(c);
  });
})();
