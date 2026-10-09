// ============================================================
// Sprites  -  draws fallback pixels + loads YOUR png files
// File: src/game/sprites.js
// You usually do NOT edit this. Just drop pngs in public/sprites/
// ============================================================

export function buildSprite(pal) {
  const HEAD = [
    "....KKKKKKKK....", "....KHHHHHHK....", "....KHHHHHHK....", "....KHSSSSHK....",
    "....KHESSEHK....", "....KHSSSSHK....", "....KSSSSSSK....", "....KKSSSSKK....",
    "..KBBBBBBBBBBK..", "..KBBBWWWWBBBK..", "..KBBBWRRWBBBK..", "..KBBBBRRBBBBK..",
    "..KBBBBRRBBBBK..", "..KBBBBBBBBBBK..",
  ];
  const LEG0 = ["..KPPPPKKPPPPK..", "..KPPPPKKPPPPK..", "..KPPPPKKPPPPK..", "..KKKKK..KKKKK.."];
  const LEG1 = ["..KPPPPKKPPPPK..", "..KPPPPKKPPPPK..", ".KPPPPK..KPPPPK.", ".KKKKKK..KKKKKK."];
  const COL = { K: "outline", H: "hair", S: "skin", E: "eyes", B: "body", W: "shirt", R: "accent", P: "pants" };
  const draw = (rows) => {
    const c = document.createElement("canvas");
    c.width = rows[0].length;
    c.height = rows.length;
    const g = c.getContext("2d");
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const k = COL[row[x]];
        if (!k) continue;
        g.fillStyle = pal[k];
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  };
  const sil = (src, color) => {
    const c = document.createElement("canvas");
    c.width = src.width;
    c.height = src.height;
    const g = c.getContext("2d");
    g.drawImage(src, 0, 0);
    g.globalCompositeOperation = "source-in";
    g.fillStyle = color;
    g.fillRect(0, 0, c.width, c.height);
    return c;
  };
  const d0 = draw([...HEAD, ...LEG0]);
  const d1 = draw([...HEAD, ...LEG1]);
  return { down: [d0, d1], flash: sil(d0, "#ffffff"), ghost: sil(d0, "#2a2a33") };
}

export function buildSword(col) {
  const c = document.createElement("canvas");
  c.width = 36;
  c.height = 14;
  const g = c.getContext("2d");
  const px = (x, y, w, h, k) => {
    g.fillStyle = k;
    g.fillRect(x, y, w, h);
  };
  px(0, 3, 35, 8, "#0c0c12");
  px(1, 4, 4, 6, col.pommel);
  px(5, 4, 9, 6, col.handle);
  px(14, 2, 4, 10, col.blade);
  px(18, 4, 15, 6, col.blade);
  px(18, 4, 15, 2, "#ffffff");
  px(33, 5, 2, 4, "#fff6a8");
  return c;
}

export function loadArt(url, cb) {
  const img = new Image();
  img.onload = () => {
    const src = document.createElement("canvas");
    src.width = img.width;
    src.height = img.height;
    const g = src.getContext("2d");
    g.drawImage(img, 0, 0);
    const data = g.getImageData(0, 0, src.width, src.height);
    const d = data.data;
    let minX = src.width, minY = src.height, maxX = 0, maxY = 0;
    for (let y = 0; y < src.height; y++) {
      for (let x = 0; x < src.width; x++) {
        const i = (y * src.width + x) * 4;
        if (d[i] > 150 && d[i + 2] > 120 && d[i + 1] < 120 && d[i] > d[i + 1] + 40) d[i + 3] = 0;
        if (d[i + 3] > 12) {
          if (x < minX) minX = x;
          if (y < minY) minY = y;
          if (x > maxX) maxX = x;
          if (y > maxY) maxY = y;
        }
      }
    }
    g.putImageData(data, 0, 0);
    if (maxX <= minX) { cb(src); return; }
    minX = Math.max(0, minX - 2);
    minY = Math.max(0, minY - 2);
    maxX = Math.min(src.width - 1, maxX + 2);
    maxY = Math.min(src.height - 1, maxY + 2);
    const out = document.createElement("canvas");
    out.width = maxX - minX + 1;
    out.height = maxY - minY + 1;
    out.getContext("2d").drawImage(src, minX, minY, out.width, out.height, 0, 0, out.width, out.height);
    cb(out);
  };
  img.onerror = () => {};
  img.src = url;
}

export function tint(src, color) {
  const c = document.createElement("canvas");
  c.width = src.width;
  c.height = src.height;
  const g = c.getContext("2d");
  g.drawImage(src, 0, 0);
  if (color === "#ffffff") return c;
  g.globalCompositeOperation = "source-atop";
  g.globalAlpha = 0.38;
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return c;
}
