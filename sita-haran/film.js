// Sita Haran — an isometric infographic film. One board, one camera, render(t) is a pure function of time.
import { Iso, PAL, tri, pin, inset, ring, cutLine, haloText, iconGrid, clamp, lerp, seg, ss, eo, eio, back, hash, TAU, C30, mix, hex } from './engine.js';

PAL.ink = '#2A2230';
const INK = PAL.ink, BG = '#F1E9DA', PAPER = '#FBF4E6';
PAL.paper = PAPER; PAL.bg = BG;
export const C = {
  sita: '#E8822F', rama: '#4450A8', lak: '#8E5CB5', rav: '#C23A3A', gold: '#E2B53E', water: '#4FA8B5',
  leaf: '#6FA05A', hut: '#B98E5E', thatch: '#8F6B42', clear: '#DCC79F', stone: '#B8B2A6', vult: '#6E6A72', monkey: '#A9784A',
  ashoka: '#3F7A4E', wall: '#EFE3CC',
};
const T = {}; for (const k in C) T[k] = tri(C[k]);
const SOIL = [tri('#A77850'), tri('#8A5B3A'), tri('#6A432A')];
export const DUR = 70;
const S = 170;

// ---------------------------------------------------------------- narration (start times; durations come from voices/dur.json)
export const LINES = [
  ['l01', 1.0, 'How was Sita taken?'],
  ['l02', 4.5, 'In the forest of Panchavati, three exiles share a small hut by the river.'],
  ['l03', 9.8, 'Thirteen years of exile are behind them. One is left.'],
  ['l04', 13.9, 'Across the sea, Ravana, the ten-headed king of Lanka, wants Sita. Two brothers stand in his way.'],
  ['l05', 21.2, 'Trick one: a golden deer. Sita asks for it, and Rama gives chase.'],
  ['l06', 26.5, 'Trick two: a cry for help, in Rama’s voice.'],
  ['l07', 30.0, 'Lakshmana draws a line around the hut, and goes to find his brother.'],
  ['l08', 34.8, 'Trick three: a holy man, begging for alms.'],
  ['l09', 38.1, 'Sita steps across the line.'],
  ['l10', 40.5, 'Ravana throws off his disguise, and carries her into the sky.'],
  ['l11', 45.0, 'The old vulture, Jatayu, fights him, and falls.'],
  ['l12', 48.6, 'Over a hill of monkeys, Sita drops her jewels. A trail for Rama.'],
  ['l13', 53.6, 'Across the sea, she is held in a grove in Lanka.'],
  ['l14', 57.4, 'At Panchavati, the hut stands empty. The search begins.'],
];
let SUBS = [];
export function init(dur) {
  SUBS = LINES.map(([id, t0, text], i) => {
    const d = dur[id] || 2, next = LINES[i + 1] ? LINES[i + 1][1] - .25 : DUR - 1;
    return { id, t0, t1: Math.min(next, t0 + Math.max(1.8, d + .6)), text, d };
  });
}
export const subs = () => SUBS;

// ---------------------------------------------------------------- key times
const K = {
  title: .4, names: 5.4, cal: 9.7, inset0: 13.7, heads: 15.4, inset1: 20.6, brothers: 18.3, hud: 18.4,
  deer: 21.9, point: 23.2, chase: 24.4, ramaOut: 26.0, cry: 27.0, line0: 30.2, line1: 32.2, lakGo: 32.4, lakOut: 34.0,
  monk: 33.8, desat0: 35.6, hush: 37.6, step: 38.8, snap: 39.5, reveal: 40.6, drop: 41.0, lift: 42.0,
  jat: 44.4, struck: 46.6, jewel: 50.0, land: 56.0, back: 56.6, quest: 59.0, pull: 61.4, legend: 64.0,
};

// ---------------------------------------------------------------- interpolation
function mono(keys, t) { // monotone cubic through [t, v...] keys (no overshoot at holds)
  const n = keys.length;
  if (t <= keys[0][0]) return keys[0].slice(1);
  if (t >= keys[n - 1][0]) return keys[n - 1].slice(1);
  let i = 0; while (keys[i + 1][0] < t) i++;
  const a = keys[i], b = keys[i + 1], h = b[0] - a[0], u = (t - a[0]) / h, out = [];
  const sec = (j, d) => (keys[j + 1][d] - keys[j][d]) / (keys[j + 1][0] - keys[j][0]);
  const tan = (j, d) => { if (j === 0 || j === n - 1) return 0; const s0 = sec(j - 1, d), s1 = sec(j, d); return s0 * s1 <= 0 ? 0 : 2 / (1 / s0 + 1 / s1); };
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u, h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2;
  for (let d = 1; d < a.length; d++) out.push(h00 * a[d] + h10 * h * tan(i, d) + h01 * b[d] + h11 * h * tan(i + 1, d));
  return out;
}
const L2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2] ?? 0, b[2] ?? 0, t)];
const step12 = t => Math.floor(t * 12) / 12;   // characters move on twos (12 fps)

// ---------------------------------------------------------------- the world: geometry
const HUT = [24, 30.5], LINE_R = 6.5;
const COAST = [[S, 48], [150, 68], [140, 84], [128, 96], [118, 104], [106, 112], [94, 124], [80, 140], [66, 156], [60, S]];
const LAND = [[0, 0], [S, 0], ...COAST, [0, S]];
const LANKA = (() => { const p = []; for (let i = 0; i < 28; i++) { const a = i / 28 * TAU, w = 1 + .1 * Math.sin(a * 3 + 1) + .06 * Math.sin(a * 7); p.push([141 + Math.cos(a) * 17 * w, 140 + Math.sin(a) * 14 * w]); } return p; })();
const HILL = [84, 93];
const riverY = x => 13 + 2.2 * Math.sin(x / 10) + x * .05;
const CHASE = [[29, 37], [40, 44], [52, 51], [66, 60]];
const MPATH = [[8, 70], [15, 56], [21, 46], [24, 40]];
function inPoly(x, y, P) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const [xi, yi] = P[i], [xj, yj] = P[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
function dSeg(px, py, a, b) { const dx = b[0] - a[0], dy = b[1] - a[1], u = clamp(((px - a[0]) * dx + (py - a[1]) * dy) / (dx * dx + dy * dy)); return Math.hypot(px - a[0] - u * dx, py - a[1] - u * dy); }
const dPoly = (x, y, P) => Math.min(...P.slice(1).map((b, i) => dSeg(x, y, P[i], b)));
function along(P, u) { // point at fraction u of a polyline
  let L = 0; const d = P.slice(1).map((b, i) => { const l = Math.hypot(b[0] - P[i][0], b[1] - P[i][1]); L += l; return l; });
  let r = clamp(u) * L; for (let i = 0; i < d.length; i++) { if (r <= d[i] || i === d.length - 1) { const f = d[i] ? clamp(r / d[i]) : 0; return [lerp(P[i][0], P[i + 1][0], f), lerp(P[i][1], P[i + 1][1], f)]; } r -= d[i]; }
}
const bandPoly = (P, w) => { // a ribbon around a polyline
  const L = [], R = [];
  P.forEach((p, i) => { const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; L.push([p[0] + nx, p[1] + ny]); R.unshift([p[0] - nx, p[1] - ny]); });
  return [...L, ...R];
};
const RIVER = (() => { const p = []; for (let x = 0; x <= S; x += 4) p.push([x, riverY(x)]); return bandPoly(p, 2.6); })();
const TITLE_BOX = [39, 14, 49, 72];  // x0, y0, x1, y1 kept clear until the title leaves

// trees: fixed, seeded
const TREES = [];
for (let i = 0; i < 4000 && TREES.length < 560; i++) {
  const x = 1.5 + hash(i * 3.17 + .3) * (S - 3), y = 1.5 + hash(i * 7.71 + 2.1) * (S - 3);
  if (!inPoly(x, y, LAND) || !inPoly(x + 4, y + 4, LAND)) continue;
  if (Math.hypot(x - HUT[0], y - HUT[1] - 2) < 12.5) continue;
  if (Math.abs(y - riverY(x)) < 2.9) continue;
  if (dPoly(x, y, CHASE) < 2.6 || dPoly(x, y, MPATH) < 2.6) continue;
  if (Math.hypot(x - HILL[0], y - HILL[1]) < 8.5) continue;
  if (TREES.some(t => Math.hypot(t.x - x, t.y - y) < 2.3)) continue;
  const inTitle = x > TITLE_BOX[0] && x < TITLE_BOX[2] && y > TITLE_BOX[1] && y < TITLE_BOX[3];
  const d = Math.hypot(x - 30, y - 36);
  TREES.push({ x, y, s: .8 + hash(i * 1.3) * .55, v: (hash(i * 9.1) * 3) | 0, pop: inTitle ? 4.7 + hash(i) * .5 : 2.3 + clamp(d / 70) * 1.9 + hash(i * 2.2) * .35 });
}
const LEAF = [tri('#6FA05A'), tri('#5E9150'), tri('#7EAD63')];
const CITY = [[146, 128, 3.2], [150, 133, 2.4], [152, 139, 3.6], [145, 134, 6.2], [140, 130, 2.2], [147, 143, 2.6], [154, 128, 2], [137, 136, 2.0]];
const GROVE = [[131, 145], [134, 149], [129, 150], [137, 152], [125, 146], [132, 154]];
const MONKEYS = [[81, 90, 1], [87, 91, -1], [83, 96, 1], [86, 95.5, -1]];
const JEWEL_AT = [[82.6, 92.2], [85.4, 92.6], [84.2, 94.6], [82.8, 94.4], [85.6, 94.8]];

// ---------------------------------------------------------------- the flight
const FLY = [
  [42.0, 31, 39, .6], [43.6, 38, 47, 11], [45.4, 50, 58, 14], [46.8, 55, 62, 14.5], [48.0, 60, 68, 14.5],
  [49.6, 78, 88, 13], [51.6, 90, 98, 13], [53.4, 110, 113, 11], [55.2, 130, 136, 6], [56.0, 136, 141, 1.2],
];
function chariot(t) { // position, heading
  if (t < K.drop) return null;
  if (t < K.lift) { const u = eo(seg(t, K.drop, K.drop + .6)); return { p: [31, 39, lerp(10, .6, u)], rot: Math.atan2(6, 9), land: seg(t, K.drop + .5, K.drop + .75) }; }
  const p = mono(FLY, t), q = mono(FLY, t + .05);
  let rot = Math.atan2(q[1] - p[1], q[0] - p[0]); if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 1e-3) rot = Math.atan2(5, 6);
  return { p, rot };
}
const FLY_PTS = (() => { const r = []; for (let t = K.lift; t <= K.land + 1e-6; t += .1) r.push([t, ...mono(FLY, t)]); return r; })();

// ---------------------------------------------------------------- characters' positions
function sitaPos(t) {
  if (t < K.step) return { p: [24, 35, 0], face: t > K.point - .2 && t < K.chase + 1.5 ? 1 : -1, walk: 0 };
  if (t < K.step + .7) { const u = seg(t, K.step, K.step + .7); return { p: [24, lerp(35, 38.6, u), 0], face: -1, walk: step12(t) * 9 }; }
  if (t < K.drop + .6) return { p: [24, 38.6, 0], face: -1, walk: 0 };
  return null; // on the chariot / in Lanka (drawn there)
}
function ramaPos(t) {
  if (t < K.chase) return { p: [19.5, 35.5, 0], face: t > K.deer ? 1 : 1, arm: t > K.point ? .5 : .15 };
  if (t < K.chase + 2.6) { const u = ss(seg(t, K.chase, K.chase + 2.6)); const q = along(CHASE.slice(0).reverse().reverse(), u); const st = along([[19.5, 35.5], [29, 37]], 1); const P = u < .12 ? along([[19.5, 35.5], st], u / .12) : along(CHASE, (u - .12) / .88); return { p: [P[0], P[1], 0], face: 1, walk: step12(t) * 11, arm: 1.2 }; }
  if (t > K.back + 1.4 && t < K.back + 3.8) { const u = ss(seg(t, K.back + 1.4, K.back + 3.6)); const P = along([[44, 46], [33, 40], [20.5, 38.5]], u); return { p: [P[0], P[1], 0], face: -1, walk: u < 1 ? step12(t) * 10 : 0, arm: .2 }; }
  if (t >= K.back + 3.8) return { p: [20.5, 38.5, 0], face: 1, arm: .2 };
  return null;
}
function lakPos(t) {
  const c = HUT, a0 = Math.atan2(35 - c[1], 28.5 - c[0]);
  if (t < K.line0) return { p: [28.5, 35, 0], face: -1, arm: .15 };
  if (t < K.line1) { const u = eio(seg(t, K.line0, K.line1)), a = a0 + u * TAU; return { p: [c[0] + Math.cos(a) * LINE_R, c[1] + Math.sin(a) * LINE_R, 0], face: Math.sin(a) > 0 ? -1 : 1, walk: step12(t) * 10, arm: .9 }; }
  if (t < K.lakGo) return { p: [c[0] + Math.cos(a0) * LINE_R, c[1] + Math.sin(a0) * LINE_R, 0], face: 1, arm: .15 };
  if (t < K.lakGo + 2.4) { const u = seg(t, K.lakGo, K.lakGo + 2.4); const P = along([[c[0] + Math.cos(a0) * LINE_R, c[1] + Math.sin(a0) * LINE_R], [33, 40], ...CHASE.slice(1)], u); return { p: [P[0], P[1], 0], face: 1, walk: step12(t) * 10, arm: .2 }; }
  return null;
}
function monkPos(t) {
  if (t < K.monk) return null;
  if (t < K.monk + 3) { const u = ss(seg(t, K.monk, K.monk + 3)); const P = along(MPATH, u); return { p: [P[0], P[1] + (u >= 1 ? .4 : 0), 0], walk: step12(t) * 8 }; }
  if (t < K.drop + .6) return { p: [24, 40.4, 0], walk: 0 };
  return null;
}
function deerPos(t) {
  if (t < K.deer) return null;
  if (t < K.chase - .4) return { p: [37, 45, 0], hop: Math.max(0, Math.sin(seg(t, K.deer, K.deer + .5) * Math.PI)) * 1.2, run: 0, face: -1 };
  if (t < K.chase + 2.2) { const u = seg(t, K.chase - .4, K.chase + 2.2); const P = along([[37, 45], [52, 51], [70, 64]], ss(u)); return { p: [P[0], P[1], 0], run: step12(t) * 14, hop: Math.abs(Math.sin(step12(t) * 7)) * .5, face: 1 }; }
  return null;
}
function jatayu(t) {
  if (t < K.jat || t > 80) return null;
  const ch = chariot(t);
  if (t < K.jat + 1) { const u = eo(seg(t, K.jat, K.jat + 1)); const p = L2([36, 72, 20], [ch.p[0] - 3, ch.p[1] + 2, ch.p[2] + 1.5], u); return { p, flap: t * 9, face: 1 }; }
  if (t < K.struck) { const w = t - K.jat - 1; return { p: [ch.p[0] - 2.4 + Math.sin(w * 5) * 1.4, ch.p[1] + 2.2 - Math.sin(w * 3) * 1.2, ch.p[2] + 1.2 + Math.cos(w * 6) * .9], flap: t * 13, face: Math.sin(w * 5) > -.3 ? 1 : -1, atk: 1 }; }
  const p0 = jatayu.p0 || (jatayu.p0 = null);
  const s = mono(FLY, K.struck), from = [s[0] - 2.4 + Math.sin((K.struck - K.jat - 1) * 5) * 1.4, s[1] + 2.2 - Math.sin((K.struck - K.jat - 1) * 3) * 1.2, s[2] + 1.2 + Math.cos((K.struck - K.jat - 1) * 6) * .9];
  if (t < K.struck + .2) return { p: from, flap: 0, face: 1, cut: seg(t, K.struck, K.struck + .2) };
  const u = seg(t, K.struck + .2, K.struck + 1.4); const p = [lerp(from[0], 54, u), lerp(from[1], 66, u), lerp(from[2], .3, u * u)];
  return { p, flap: u < 1 ? .9 + Math.sin(t * 20) * .2 : 1.4, face: 1, cut: 1, fall: u, down: u >= 1 };
}

// ---------------------------------------------------------------- figures (billboards, unit = world units, feet at 0,0)
function fig(g, o) {
  const h = o.h || 2.6, B = tri(o.body), sk = o.skin || '#B97A52', f = o.face || 1, ph = o.walk ? Math.sin(o.walk * Math.PI) : 0;
  g.save(); g.scale(f, 1); g.translate(0, -(o.bob || 0));
  if (o.hair === 'long') { g.fillStyle = '#2A1E24'; g.beginPath(); g.moveTo(-.14 * h, -.8 * h); g.quadraticCurveTo(-.24 * h, -.52 * h, -.15 * h, -.34 * h); g.lineTo(-.03 * h, -.52 * h); g.lineTo(-.02 * h, -.82 * h); g.closePath(); g.fill(); }
  g.fillStyle = o.legs || '#3E3036'; const lw = .11 * h, sw = .06 * h * ph;
  if (!o.dress) { g.fillRect(-.15 * h + sw, -.27 * h, lw, .27 * h); g.fillRect(.04 * h - sw, -.27 * h, lw, .27 * h); }
  else { g.fillRect(-.12 * h + sw, -.08 * h, lw * .8, .08 * h); g.fillRect(.04 * h - sw, -.08 * h, lw * .8, .08 * h); }
  const bot = o.dress ? -.06 * h : -.22 * h, wid = o.dress ? .29 * h : .25 * h, top = -.66 * h, sh = o.hunch ? .05 * h : 0;
  g.beginPath(); g.moveTo(-wid, bot); g.lineTo(-.15 * h + sh, top + sh); g.lineTo(.15 * h + sh, top + sh); g.lineTo(wid, bot); g.closePath(); g.fillStyle = B[1]; g.fill();
  g.beginPath(); g.moveTo(.02 * h, bot); g.lineTo(.02 * h + sh, top + sh); g.lineTo(.15 * h + sh, top + sh); g.lineTo(wid, bot); g.closePath(); g.fillStyle = B[2]; g.fill();
  if (o.sash) { g.strokeStyle = o.sash; g.lineWidth = .05 * h; g.beginPath(); g.moveTo(-.14 * h, top + .04 * h); g.lineTo(.18 * h, bot - .04 * h); g.stroke(); }
  if (o.bow) { g.strokeStyle = '#6A4A2E'; g.lineWidth = .035 * h; g.beginPath(); g.arc(-.2 * h, -.5 * h, .26 * h, -1.25, 1.25); g.stroke(); g.lineWidth = .012 * h; g.beginPath(); g.moveTo(-.2 * h + Math.cos(-1.25) * .26 * h, -.5 * h + Math.sin(-1.25) * .26 * h); g.lineTo(-.2 * h + Math.cos(1.25) * .26 * h, -.5 * h + Math.sin(1.25) * .26 * h); g.stroke(); }
  const arm = o.arm ?? .15, ax = .12 * h + sh, ay = -.6 * h + sh, al = .34 * h, ex = ax + Math.sin(arm) * al, ey = ay + Math.cos(arm) * al;
  g.strokeStyle = B[2]; g.lineCap = 'round'; g.lineWidth = .09 * h; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ex, ey); g.stroke();
  g.beginPath(); g.arc(ex, ey, .05 * h, 0, TAU); g.fillStyle = sk; g.fill();
  if (o.staff) { g.strokeStyle = '#7A6248'; g.lineWidth = .035 * h; g.beginPath(); g.moveTo(ex, ey - .3 * h); g.lineTo(ex + .02 * h, 0); g.stroke(); }
  if (o.bowl) { g.fillStyle = '#7A6248'; g.beginPath(); g.ellipse(ex + .05 * h, ey - .03 * h, .08 * h, .035 * h, 0, 0, Math.PI); g.fill(); }
  const hx = sh * 1.5, hy = -.78 * h + sh * 1.4, hr = .12 * h;
  const head = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, TAU); g.fillStyle = sk; g.fill(); g.beginPath(); g.arc(x + .4 * r, y + .15 * r, r * .82, -1.2, 1.9); g.fillStyle = hex(mix(sk, '#231A2C', .2)); g.fill(); };
  if (o.heads) { // ten heads, popping in from the centre outward; n visible
    const n = o.heads, xs = []; for (let i = 0; i < 10; i++) xs.push((i - 4.5) * .12 * h);
    const order = xs.map((x, i) => [Math.abs(x), i]).sort((a, b) => a[0] - b[0]);
    const vis = order.slice(0, Math.ceil(n)).map(([, i], j) => [i, j]).sort((a, b) => Math.abs(xs[b[0]]) - Math.abs(xs[a[0]]));
    for (const [i, j] of vis) { const p = j === Math.ceil(n) - 1 ? back(clamp(n - j), 2.2) : 1, x = xs[i], y = hy - (1 - Math.abs(x) / (.8 * h)) * .02 * h; head(x, y, hr * .82 * p); g.fillStyle = C.gold; g.beginPath(); g.moveTo(x - .07 * h * p, y - .07 * h * p); g.lineTo(x, y - .2 * h * p); g.lineTo(x + .07 * h * p, y - .07 * h * p); g.closePath(); g.fill(); }
  } else head(hx, hy, hr);
  if (o.hair === 'knot' || o.hair === 'long') { g.fillStyle = '#2A1E24'; g.beginPath(); g.arc(hx, hy - .02 * h, hr * 1.04, Math.PI * 1.02, TAU * .99); g.fill(); if (o.hair === 'knot') { g.beginPath(); g.arc(hx - .02 * h, hy - .15 * h, .055 * h, 0, TAU); g.fill(); } }
  if (o.hair === 'hood') { g.fillStyle = hex(mix(o.body, '#231A2C', .15)); g.beginPath(); g.arc(hx, hy, hr * 1.2, Math.PI * .92, TAU * 1.04); g.lineTo(hx + hr * 1.1, hy + hr * .9); g.lineTo(hx - hr * 1.2, hy + hr * .9); g.closePath(); g.fill(); }
  g.restore();
}
function deerFig(g, o) {
  const T3 = tri(C.gold), ph = o.run ? Math.sin(o.run * Math.PI) : 0;
  g.save(); g.scale(o.face || 1, 1); g.translate(0, -(o.hop || 0));
  g.strokeStyle = T3[2]; g.lineWidth = .12; g.lineCap = 'round';
  for (const [x, s] of [[-.55, 1], [-.35, -1], [.4, -1], [.6, 1]]) { g.beginPath(); g.moveTo(x, -.95); g.lineTo(x + ph * s * .3, 0); g.stroke(); }
  g.fillStyle = T3[1]; g.beginPath(); g.ellipse(0, -1.05, .9, .38, 0, 0, TAU); g.fill();
  g.save(); g.clip(); g.fillStyle = T3[0]; g.beginPath(); g.ellipse(-.1, -1.28, .95, .3, 0, 0, TAU); g.fill(); g.fillStyle = T3[2]; g.beginPath(); g.ellipse(.1, -.68, .9, .2, 0, 0, TAU); g.fill(); g.restore();
  g.fillStyle = '#F6EFDD'; for (const [x, y] of [[-.4, -1.12], [-.1, -1.2], [.2, -1.1], [-.25, -.98], [.05, -.95], [.42, -1.0]]) { g.beginPath(); g.arc(x, y, .055, 0, TAU); g.fill(); }
  g.fillStyle = T3[1]; g.beginPath(); g.moveTo(.55, -1.2); g.lineTo(.85, -1.85); g.lineTo(1.05, -1.75); g.lineTo(.85, -1.0); g.closePath(); g.fill();
  g.fillStyle = T3[0]; g.beginPath(); g.ellipse(1.05, -1.85, .27, .14, -.2, 0, TAU); g.fill();
  g.strokeStyle = '#B0832A'; g.lineWidth = .06; g.beginPath(); g.moveTo(.95, -1.95); g.lineTo(.8, -2.5); g.moveTo(.86, -2.25); g.lineTo(.62, -2.4); g.moveTo(1.05, -1.97); g.lineTo(1.1, -2.5); g.moveTo(1.08, -2.25); g.lineTo(1.3, -2.38); g.stroke();
  g.fillStyle = T3[2]; g.beginPath(); g.ellipse(-.92, -1.2, .12, .07, -.6, 0, TAU); g.fill();
  g.restore();
}
function birdFig(g, o) {
  const B = tri(C.vult), a = o.down ? .2 : Math.sin(o.flap || 0);
  g.save(); g.scale(o.face || 1, 1); g.rotate(o.fall ? o.fall * 1.2 : 0);
  const wing = (s, col, cut) => { const tipY = -1.6 * a * s, tip = cut ? .45 : 1; g.beginPath(); g.moveTo(-.3, -.05); g.quadraticCurveTo(-.5 * tip, tipY * .6 * tip - .2, -1.1 * tip, tipY * tip); g.lineTo(.1 * tip, tipY * .7 * tip); g.lineTo(.35, -.05); g.closePath(); g.fillStyle = col; g.fill(); };
  wing(1, B[2], false);
  g.fillStyle = B[1]; g.beginPath(); g.ellipse(0, 0, .75, .3, 0, 0, TAU); g.fill(); g.fillStyle = B[0]; g.beginPath(); g.ellipse(-.05, -.12, .6, .14, 0, 0, TAU); g.fill();
  g.fillStyle = '#EDE6DA'; g.beginPath(); g.arc(.8, -.18, .2, 0, TAU); g.fill(); g.fillStyle = '#5A4E44'; g.beginPath(); g.moveTo(.95, -.22); g.lineTo(1.18, -.1); g.lineTo(.95, -.08); g.closePath(); g.fill();
  g.fillStyle = B[2]; g.beginPath(); g.moveTo(-.7, -.05); g.lineTo(-1.15, -.2); g.lineTo(-1.1, .15); g.closePath(); g.fill();
  wing(-1, B[0], o.cut > .5);
  if (o.cut > 0) { g.strokeStyle = INK; g.lineWidth = .06; g.setLineDash([.14, .1]); g.beginPath(); g.moveTo(-.9, 1.1 * a * 0 + .1); g.lineTo(.3, -.9); g.stroke(); g.setLineDash([]); }
  g.restore();
}
function monkeyFig(g, o) {
  g.save(); g.scale(o.face || 1, 1); g.translate(0, -(o.hop || 0));
  g.strokeStyle = '#7E5532'; g.lineWidth = .1; g.lineCap = 'round'; g.beginPath(); g.moveTo(-.25, -.35); g.quadraticCurveTo(-.75, -.4, -.6, -.95); g.stroke();
  fig(g, { body: C.monkey, skin: '#D9B48A', h: 1.35, arm: o.arm ?? .3, legs: '#7E5532' });
  g.restore();
}
function treeAt(iso, x, y, s, v, pop) {
  if (pop <= 0) return;
  const p = back(clamp(pop), 2.2) * s;
  iso.box(x - .14 * p, y - .14 * p, 0, .28 * p, .28 * p, 1.0 * p, SOIL[1]);
  iso.sphere(x, y, 2.0 * p, 1.15 * p, LEAF[v]);
}

// ---------------------------------------------------------------- the world: draw
function drawWorld(iso, t, opt = {}) {
  const k = iso.cam.k;
  // board strata
  iso.box(0, 0, -7, S, S, 2, SOIL[2], { layer: 0, cull: false }); iso.box(0, 0, -5, S, S, 2, SOIL[1], { layer: 0, cull: false }); iso.box(0, 0, -3, S, S, 2, SOIL[0], { layer: 0, cull: false });
  iso.box(0, 0, -1, S, S, .6, T.water, { layer: .1, cull: false });
  iso.prism(LAND, -1, 1, tri('#8DB86E'), { layer: .2, cull: false, sideColor: undefined });
  iso.prism(LANKA, -1, 1.6, tri('#8DB86E'), { layer: .2, cull: false });
  // sea waves
  for (let i = 0; i < 26; i++) {
    const x0 = 70 + hash(i * 3.3) * 100, y0 = 70 + hash(i * 5.7) * 100; if (inPoly(x0, y0, LAND) || inPoly(x0, y0, LANKA) || x0 > S - 3 || y0 > S - 3) continue;
    const ph = (t * .25 + hash(i)) % 1, a = Math.sin(ph * Math.PI);
    iso.line3([[x0, y0 - 1.5, -.38], [x0 + .6, y0, -.38], [x0, y0 + 1.5, -.38]], '#E6F2F0', 2, { layer: .35, a: a * .8 });
  }
  iso.flat(RIVER, .02, C.water, { layer: .3 });
  iso.flat(bandPoly(CHASE, 1.6), .015, C.clear, { layer: .29 });
  iso.flat(bandPoly(MPATH, 1.6), .015, C.clear, { layer: .29 });
  const cl = []; for (let i = 0; i < 24; i++) { const a = i / 24 * TAU; cl.push([HUT[0] + Math.cos(a) * 10.5, HUT[1] + 2 + Math.sin(a) * 9.5]); }
  iso.flat(cl, .01, C.clear, { layer: .28 });
  // Lakshmana's line
  drawLine(iso, t);
  // the hut
  iso.box(21, 28, 0, 6, 5, 3, T.hut, { decal: I => { I.face3([[22.6, 33.01, 0], [24.4, 33.01, 0], [24.4, 33.01, 1.9], [22.6, 33.01, 1.9]], null, { color: '#4A3428', out: [0, 1, 0] }); } });
  iso.roof(20.4, 27.4, 3, 7.2, 6.2, 2.5, T.thatch, { ridge: 'x', over: 0, gable: T.hut, bias: .5 });
  iso.cyl(29.5, 27.2, 0, .7, .5, tri('#9C8F80'), { n: 10 });  // a hearth
  // trees
  for (const tr of TREES) if (iso.vis(tr.x, tr.y, 1.5, 3)) treeAt(iso, tr.x, tr.y, tr.s, tr.v, opt.noPop ? 1 : (t - tr.pop) / .45);
  // Rishyamuka hill
  const hp = (r, z, h, c) => { const p = []; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; p.push([HILL[0] + Math.cos(a) * r, HILL[1] + Math.sin(a) * r * .9]); } iso.prism(p, z, h, c, { bias: z * .01 }); };
  iso.add(HILL[0] + HILL[1] + 1, () => { iso.sub(() => { hp(7, 0, 1.6, T.stone); }); }, 1);
  iso.add(HILL[0] + HILL[1] + 2.2, () => { iso.sub(() => { hp(5.2, 1.6, 1.4, tri('#C4BEB2')); }); }, 1);
  iso.add(HILL[0] + HILL[1] + 3.3, () => { iso.sub(() => { hp(3.6, 3.0, 1.2, tri('#CFCABF')); }); }, 1);
  for (const [x, y, f] of MONKEYS) { const look = t > K.jewel ? 1 : 0, hop = Math.max(0, Math.sin((t - K.jewel - hash(x) * .5) * 9)) * .25 * seg(t, K.jewel, K.jewel + .3) * (1 - seg(t, K.jewel + 2.5, K.jewel + 3)); iso.bill(x, y, 4.2, g => monkeyFig(g, { face: f, arm: look ? 2.6 : .3, hop }), { bias: 3 }); }
  // jewels resting on the hill
  for (let i = 0; i < 5; i++) { const t0 = K.jewel + i * .3; if (t > t0 + .8) { const [x, y] = JEWEL_AT[i]; iso.bill(x, y, 4.2, g => jewelIcon(g, 0, -.2, .55), { bias: 3.5 }); } }
  // Lanka: city + grove
  for (const [x, y, h] of CITY) { iso.box(x - 1.4, y - 1.4, .6, 2.8, 2.8, h, h > 5 ? T.rav : T.wall); if (h < 5) iso.cone(x, y, .6 + h, 1.9, 1.4, T.gold, { n: 4, rot: Math.PI / 4 }); else iso.box(x - 1.4, y - 1.4, .6 + h, 2.8, .25, .4, T.gold); }
  for (const [x, y] of GROVE) { iso.box(x - .14, y - .14, .6, .28, .28, 1.1, SOIL[1]); iso.sphere(x, y, 2.7, 1.25, T.ashoka); iso.bill(x, y, 2.7, g => { g.fillStyle = C.rav; for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(Math.cos(i * 2.1) * .7, Math.sin(i * 2.7) * .55 - .2, .1, 0, TAU); g.fill(); } }, { bias: 1.4 }); }
  // characters
  const sp = sitaPos(t);
  if (sp) { iso.keep = true; iso.bill(...sp.p, g => fig(g, { body: C.sita, hair: 'long', dress: 1, h: 2.45, face: sp.face, walk: sp.walk, arm: t > K.point && t < K.chase + .8 ? 2.2 : .15 }), { bias: .2 }); iso.keep = false; }
  const rp = ramaPos(t); if (rp) iso.bill(...rp.p, g => fig(g, { body: C.rama, hair: 'knot', h: 2.7, face: rp.face, walk: rp.walk, arm: rp.arm, bow: 1, skin: '#6F7FB8' }));
  const lp = lakPos(t); if (lp) iso.bill(...lp.p, g => fig(g, { body: C.lak, hair: 'knot', h: 2.65, face: lp.face, walk: lp.walk, arm: lp.arm, bow: 1 }));
  const dp = deerPos(t); if (dp) iso.bill(...dp.p, g => { g.scale(1.3, 1.3); deerFig(g, dp); });
  const mp = monkPos(t);
  if (mp) {
    const r = seg(t, K.reveal, K.reveal + .5);
    iso.bill(...mp.p, g => {
      if (r < 1) { g.save(); g.scale(1 - r * .3, 1 - r); fig(g, { body: C.stone, hair: 'hood', h: 2.4, face: 1, walk: mp.walk, hunch: 1, staff: t < K.snap, bowl: t >= K.snap, arm: t > K.monk + 3 ? .9 : .2 }); g.restore(); }
      if (r > 0) { const s = back(r, 1.8); g.save(); g.scale(s, s); fig(g, { body: C.rav, h: 3.1, face: 1, heads: 10, arm: 1.6, sash: C.gold }); g.restore(); }
    });
  }
  // Ravana at home in Lanka (seen in the inset)
  if (t < K.monk) iso.bill(145, 134, 6.8, g => fig(g, { body: C.rav, h: 2.6, face: -1, heads: t < K.heads ? 1 : 1 + 9 * seg(t, K.heads, K.heads + 1.2) + 1e-6, arm: .4, sash: C.gold }), { bias: 4 });
  // the chariot
  const ch = chariot(t);
  if (ch) {
    const sq = ch.land ? 1 - Math.sin(ch.land * Math.PI) * .18 : 1;
    iso.push(ch.p[0], ch.p[1], ch.p[2], ch.rot, 1);
    iso.prism([[-2.3, -.9], [1.5, -.9], [2.7, 0], [1.5, .9], [-2.3, .9]], 0, .75 * sq, T.rav);
    iso.prism([[-2.1, -.75], [1.4, -.75], [2.4, 0], [1.4, .75], [-2.1, .75]], .75 * sq, .14, T.gold);
    for (const [x, y] of [[-1.7, -.6], [-1.7, .6], [.3, -.6], [.3, .6]]) iso.box(x - .07, y - .07, .89, .14, .14, 2.2, T.gold);
    iso.cone(-.7, 0, 3.05, 1.6, 1.1, T.gold, { n: 4, rot: Math.PI / 4, bias: 2 });
    iso.box(-1.75, -.7, 3.0, 2.1, 1.4, .1, T.rav, { bias: 1.5 });
    const boarded = t > K.drop + .8;
    if (boarded) {
      iso.bill(-1.1, -.25, .85, g => fig(g, { body: C.rav, h: 2.5, face: 1, heads: 10, arm: t > K.jewel - 1 && t < K.land ? .4 : 1.0, sash: C.gold }), { bias: .3 });
      if (t < K.land) { iso.keep = true; iso.bill(-.1, .3, .85, g => fig(g, { body: C.sita, hair: 'long', dress: 1, h: 2.2, face: 1, arm: t > K.jewel - .3 && t < K.jewel + 1.6 ? 2.4 : .3 }), { bias: .5 }); iso.keep = false; }
    }
    iso.pop();
  }
  // Sita set down in the grove
  if (t >= K.land) { iso.keep = true; const u = seg(t, K.land, K.land + .6); iso.bill(lerp(136, 133.5, u), lerp(141, 147.5, u), .6, g => fig(g, { body: C.sita, hair: 'long', dress: 1, h: 2.45, face: -1, walk: u < 1 ? step12(t) * 9 : 0, arm: .1 }), { bias: .2 }); iso.keep = false; }
  // falling jewels
  for (let i = 0; i < 5; i++) {
    const t0 = K.jewel + i * .3; if (t < t0 || t > t0 + .8) continue;
    const s0 = chariot(t0).p, u = (t - t0) / .8, [x, y] = JEWEL_AT[i];
    const p = [lerp(s0[0], x, u), lerp(s0[1], y, u), lerp(s0[2], 4.2, u * u)];
    iso.keep = true; iso.bill(...p, g => jewelIcon(g, 0, -.2, .55), { bias: 5 }); iso.keep = false;
  }
  // Jatayu
  const jt = jatayu(t); if (jt) iso.bill(...jt.p, g => { g.scale(1.7, 1.7); birdFig(g, jt); }, { bias: 3, r: 6 });
  // the route line, drawn just ahead of the chariot
  if (t > K.lift) {
    const tE = Math.min(K.land, t + .5), pts = FLY_PTS.filter(r => r[0] <= tE).map(r => r.slice(1));
    if (pts.length > 1) iso.line3(pts, INK, 2, { layer: 2, dash: [8, 7], a: .85 });
  }
}
function jewelIcon(g, x, y, s) {
  const T3 = T.sita; g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(0, -s * .5); g.lineTo(s * .4, 0); g.lineTo(0, s * .5); g.lineTo(-s * .4, 0); g.closePath(); g.fillStyle = T3[1]; g.fill();
  g.beginPath(); g.moveTo(0, -s * .5); g.lineTo(s * .4, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = T3[0]; g.fill();
  g.beginPath(); g.moveTo(0, s * .5); g.lineTo(s * .4, 0); g.lineTo(0, 0); g.closePath(); g.fillStyle = T3[2]; g.fill();
  g.restore();
}
function linePts(a0, a1, n = 48) { const p = []; for (let i = 0; i <= n; i++) { const a = lerp(a0, a1, i / n); p.push([HUT[0] + Math.cos(a) * LINE_R, HUT[1] + Math.sin(a) * LINE_R, .06]); } return p; }
function drawLine(iso, t) {
  if (t < K.line0) return;
  const a0 = Math.atan2(35 - HUT[1], 28.5 - HUT[0]), p = eio(seg(t, K.line0, K.line1));
  const w = .26, opt = { world: true, layer: .4 };
  iso.keep = true;
  if (t < K.snap) { if (p > 0) iso.line3(linePts(a0, a0 + p * TAU), C.lak, w, opt); }
  else { // broken where Sita crossed (angle pi/2), the gap opens
    const g = .08 + .32 * eo(seg(t, K.snap, K.snap + .5)), ac = Math.PI / 2;
    iso.line3(linePts(ac + g, ac + TAU - g), C.lak, w, opt);
    const fly = seg(t, K.snap, K.snap + .8);
    if (fly < 1) for (let i = 0; i < 6; i++) { const a = ac + (i - 2.5) * .09, r = LINE_R + (i % 2 ? -1 : 1) * fly * (.8 + (i % 3) * .5), z = .06; iso.line3([[HUT[0] + Math.cos(a) * r, HUT[1] + Math.sin(a) * r, z], [HUT[0] + Math.cos(a + .05) * r, HUT[1] + Math.sin(a + .05) * r, z]], C.lak, w * .8, { world: true, layer: .45, a: 1 - fly }); }
  }
  iso.keep = false;
}

// ---------------------------------------------------------------- camera
const CAM0 = [ // t, x, y, z, ln k
  [0.0, 36, 44, 0, 14], [2.8, 35, 43, 0, 15], [4.6, 28, 34, 1, 18], [8.8, 24, 33, 2, 30], [13.0, 25, 34, 2, 28], [13.8, 25, 34, 2, 26],
  [20.6, 27, 36, 2, 24], [22.0, 31, 40, 1.5, 24], [25.0, 36, 44, 1, 20], [27.4, 42, 46, 1, 18], [29.6, 40, 44, 1, 19],
  [30.6, 24, 32.5, 1.5, 34], [32.6, 24, 33, 1.5, 34], [34.4, 24, 37, 1.5, 30], [37.0, 24, 37.5, 1.5, 54], [38.6, 24, 37.6, 1.4, 80],
  [39.8, 24.5, 38.5, 1.4, 76], [41.0, 26.5, 39.5, 2, 56], [42.0, 28.5, 39.5, 2, 46],
].map(r => [r[0], r[1], r[2], r[3], Math.log(r[4])]);
const KFOL = [[42.0, 46], [43.8, 26], [45.4, 42], [48.0, 36], [49.6, 32], [52.0, 30], [53.8, 18], [55.6, 30], [56.6, 30]].map(r => [r[0], Math.log(r[1])]);
const CAM2 = [[56.6, 136, 141, .9, 30], [57.6, 82, 86, 0, 7], [58.6, 23, 35, 1.5, 34], [61.2, 23, 35.5, 1.5, 36], [64.6, 70, 100, 0, 4.8], [70, 70, 100, 0, 4.75]].map(r => [r[0], r[1], r[2], r[3], Math.log(r[4])]);
export function camAt(t, Q) {
  if (Q && Q.has('k')) return { x: +Q.get('cx'), y: +Q.get('cy'), z: +(Q.get('cz') || 0), k: +Q.get('k') };
  let c;
  if (t < K.lift) c = mono(CAM0, t);
  else if (t < K.back) {
    const ch = mono(FLY, t), w = ss(seg(t, K.lift, K.lift + 1.2)), base = CAM0[CAM0.length - 1];
    c = [lerp(base[1], ch[0], w), lerp(base[2], ch[1], w), lerp(base[3], ch[2] * .78, w), mono(KFOL, t)[0]];
  } else c = mono(CAM2, t);
  return { x: c[0], y: c[1], z: c[2], k: Math.exp(c[3]) };
}

// ---------------------------------------------------------------- overlays (screen space)
const F = (w, s) => `${w} ${s}px Jost`;
let TXT = [];
const addText = (id, text, x0, y0, x1, y1, pass) => TXT.push({ id, text, x0, y0, x1, y1, pass });
function card(g, x, y, w, h, a = 1) { g.save(); g.globalAlpha = a; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fillStyle = PAPER; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); g.restore(); }
function cube(g, x, y, s, col) { const t3 = tri(col); const P = (a, b, c) => [x + (a - b) * C30 * s, y + ((a + b) * .5 - c) * s]; const f = (pts, c) => { g.beginPath(); pts.forEach((p, i) => { const q = P(...p); i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); }); g.closePath(); g.fillStyle = c; g.fill(); }; f([[0, 1, 0], [1, 1, 0], [1, 1, 1], [0, 1, 1]], t3[1]); f([[1, 0, 0], [1, 1, 0], [1, 1, 1], [1, 0, 1]], t3[2]); f([[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], t3[0]); }
function wrap(g, s, maxW) { const w = s.split(' '), out = []; let cur = ''; for (const x of w) { const n = cur ? cur + ' ' + x : x; if (g.measureText(n).width > maxW && cur) { out.push(cur); cur = x; } else cur = n; } out.push(cur); return out; }
function drawSub(g, t) {
  const s = SUBS.find(s => t >= s.t0 && t < s.t1); if (!s) return;
  const ain = seg(t, s.t0, s.t0 + .2), wipe = seg(t, s.t0 + .1, s.t0 + .5), out = seg(t, s.t1 - .25, s.t1);
  g.save(); g.font = F(500, 42); const lines = wrap(g, s.text, 1380);
  const tw = Math.max(...lines.map(l => g.measureText(l).width)), w = tw + 110, h = 34 + lines.length * 52, x = 960 - w / 2, y = 1080 - 64 - h + out * 8;
  g.globalAlpha = 1 - out;
  g.beginPath(); g.roundRect(x, y, w, h, 10); g.fillStyle = PAPER; g.fill();
  g.save(); g.beginPath(); g.roundRect(x, y, w, h, 10); g.setLineDash([2 * (w + h) * ain, 9999]); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); g.restore();
  cube(g, x + 24, y + h / 2 - 12, 14, C.sita);
  g.save(); g.beginPath(); g.rect(x + 60, y, (w - 60) * ss(wipe), h); g.clip();
  g.fillStyle = INK; g.textBaseline = 'middle'; lines.forEach((l, i) => g.fillText(l, x + 70, y + 17 + 26 + i * 52));
  g.restore(); g.restore();
}
function tag(g, x, y, top, big, a, align = 'right', id = 'tag') {
  if (a <= 0) return;
  g.save(); g.font = F(600, 20); g.letterSpacing = '4px'; const w1 = g.measureText(top).width; g.font = F(600, 34); g.letterSpacing = '4px'; const w2 = g.measureText(big).width; g.restore();
  const w = Math.max(w1, w2) + 90, h = 104, X = align === 'right' ? x - w : x, s = back(clamp(a), 1.6);
  g.save(); g.translate(X + w / 2, y + h / 2); g.scale(s, s); g.translate(-(X + w / 2), -(y + h / 2));
  card(g, X, y, w, h); cube(g, X + 26, y + 40, 15, C.rav);
  haloText(g, top, X + 64, y + 38, { font: F(600, 20), track: 4, halo: false, color: '#6B5F70' });
  haloText(g, big, X + 64, y + 80, { font: F(600, 34), track: 4, halo: false });
  g.restore();
  if (a >= 1) addText(id, top + ' ' + big, X, y, X + w, y + h);
}
const SLOTS = [['RAMA', C.rama, 'p'], ['LAKSHMANA', C.lak, 'p'], ['THE LINE', C.lak, 'l']];
function hud(g, t) {
  const a = seg(t, K.hud, K.hud + .5) * (1 - seg(t, K.drop + .4, K.drop + .9)); if (a <= 0) return;
  const lineIn = t >= K.line1, here = [t < K.ramaOut, t < K.lakOut, lineIn && t < K.snap], shown = lineIn ? 3 : 2;
  const n = here.filter(Boolean).length, x = 48, y = 44, w = 520, h = 230, s = back(a, 1.6);
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y);
  card(g, x, y, w, h);
  haloText(g, 'BETWEEN RAVANA AND SITA', x + 26, y + 40, { font: F(600, 20), track: 3.5, halo: false });
  haloText(g, String(n), x + 26, y + 130, { font: F(400, 72), halo: false });
  for (let i = 0; i < shown; i++) {
    const cx = x + 150 + i * 125, cy = y + 104, on = here[i], pop = i === 2 ? back(seg(t, K.line1, K.line1 + .4), 2.2) : 1, col = on ? SLOTS[i][1] : '#D3C9B8';
    g.save(); g.translate(cx, cy); g.scale(pop, pop);
    if (SLOTS[i][2] === 'p') { g.translate(0, 44); g.scale(30, 30); fig(g, { body: col, hair: 'knot', h: 2.1, skin: on ? '#B97A52' : '#D3C9B8', bow: on }); }
    else { g.beginPath(); g.ellipse(0, 14, 44, 22, 0, 0, TAU); g.lineWidth = 7; g.strokeStyle = col; g.stroke(); }
    g.restore();
    if (!on) { g.save(); g.strokeStyle = INK; g.lineWidth = 2.5; g.beginPath(); g.moveTo(cx - 34, cy + 44); g.lineTo(cx + 34, cy - 30); g.stroke(); g.restore(); }
    haloText(g, SLOTS[i][0], cx, y + 204, { font: F(600, 16), track: 2, align: 'center', halo: false, color: on ? INK : '#9C9284' });
  }
  g.restore();
  if (a >= 1) { addText('hud', 'BETWEEN RAVANA AND SITA', x, y, x + w, y + 60); addText('hudn', String(n), x, y + 60, x + 100, y + 130); addText('huds', SLOTS.slice(0, shown).map(s => s[0]).join(' '), x + 100, y + 184, x + w, y + h); }
}
function pinT(iso, id, x, y, z, o, show = true) { pin(iso, x, y, z, o); if (!show || (o.a ?? 1) < .99) return; const [sx, sy] = iso.P(x, y, z), up = o.up ?? 130, dir = o.dir ?? 1, len = o.len ?? 60, tx = sx + dir * (len + 12), ty = sy - up; const g = iso.g; g.save(); g.font = F(600, o.ts || 25); g.letterSpacing = '3.5px'; let w = g.measureText(o.title || '').width; g.font = F(400, o.ns || 44); if (o.num) w = Math.max(w, g.measureText(o.num + ' ' + (o.unit || '')).width); g.restore(); addText(id, [o.title, o.num, o.unit].filter(Boolean).join(' '), dir > 0 ? tx : tx - w, ty - 34, dir > 0 ? tx + w : tx, ty + (o.num ? (o.ns || 44) + 8 : 6)); }
function overlays(g, iso, t, Q) {
  // name pins
  if (t > K.names && t < 10) {
    const f = 1 - seg(t, 9.3, 9.7);
    const s = sitaPos(t), r = ramaPos(t), l = lakPos(t);
    pinT(iso, 'pr', r.p[0], r.p[1], 2.9, { title: 'RAMA', dir: -1, up: 120, len: 50, a: seg(t, K.names, K.names + .8), fade: f, dot: C.rama }, f >= 1);
    pinT(iso, 'ps', s.p[0], s.p[1], 2.7, { title: 'SITA', dir: -1, up: 250, len: 50, a: seg(t, K.names + .3, K.names + 1.1), fade: f, dot: C.sita }, f >= 1);
    pinT(iso, 'pl', l.p[0], l.p[1], 2.85, { title: 'LAKSHMANA', dir: 1, up: 140, len: 50, a: seg(t, K.names + .6, K.names + 1.4), fade: f, dot: C.lak }, f >= 1);
  }
  // exile calendar
  if (t > K.cal && t < 13.9) {
    const f = 1 - seg(t, 13.4, 13.8), m = 13 * seg(t, K.cal + .6, K.cal + 2.2);
    pinT(iso, 'cal', 27, 28, 5.2, { title: 'YEARS OF EXILE', num: '13 of 14', a: seg(t, K.cal, K.cal + .9), fade: f, dir: 1, up: 210, len: 60, icons: (g, x, y) => iconGrid(g, x, y + 4, 14, m, 7, 34, (g, px, py, s, lit) => sunIcon(g, px, py, s, lit)) }, f >= 1);
  }
  // Rama and Lakshmana: two brothers in his way
  if (t > K.brothers && t < K.inset1 + .4) {
    const a = seg(t, K.brothers, K.brothers + .5) * (1 - seg(t, K.inset1, K.inset1 + .4));
    for (const P of [ramaPos(t), lakPos(t)]) { const [sx, sy] = iso.P(P.p[0], P.p[1], 1.4); ring(g, sx, sy, 2.2 * iso.cam.k, a, t); }
  }
  // the inset: Lanka, far to the south
  const ia = Math.min(seg(t, K.inset0, K.inset0 + 1), 1 - seg(t, K.inset1 - .6, K.inset1));
  if (ia > 0) {
    const ax = 960, ay = 840, cx = 1460, cy = 410, R = 300;
    inset(iso, ax, ay, cx, cy, R, ia, (g, X, Y, r, c) => {
      const I = new Iso(g, 2 * X, 2 * Y); I.cam = { x: 145, y: 134, z: 8.4, k: 72 * Math.max(.3, c) };
      drawWorld(I, t, { noPop: 1 }); I.flush();
      const n = t < K.heads ? 1 : Math.min(10, Math.floor(1 + 9 * seg(t, K.heads, K.heads + 1.2) + 1e-6));
      haloText(g, 'RAVANA, KING OF LANKA', X, Y + r * .62, { font: F(600, 24), track: 3.5, align: 'center' });
      haloText(g, n + (n === 1 ? ' HEAD' : ' HEADS'), X, Y + r * .62 + 50, { font: F(400, 40), align: 'center' });
    });
    if (ia >= 1) { addText('ins1', 'RAVANA, KING OF LANKA', cx - 170, cy + 160, cx + 170, cy + 196); addText('ins2', 'HEADS', cx - 100, cy + 205, cx + 100, cy + 245, true); }
    // a south arrow at the anchor
    g.save(); g.globalAlpha = clamp(ia * 2); haloText(g, 'LANKA, ACROSS THE SEA', ax + 18, ay + 8, { font: F(600, 18), track: 3 }); g.restore();
    if (ia >= 1) addText('south', 'LANKA, ACROSS THE SEA', ax + 18, ay - 12, ax + 300, ay + 12);
  }
  // trick tags
  const tricks = [[21.0, 26.3, 'TRICK 1 OF 3', 'A DECOY'], [26.4, 34.6, 'TRICK 2 OF 3', 'A FALSE ALARM'], [34.7, 39.6, 'TRICK 3 OF 3', 'A DISGUISE']];
  for (const [a0, a1, top, big] of tricks) if (t > a0 && t < a1) tag(g, 1872, 44, top, big, Math.min(seg(t, a0, a0 + .45), 1 - seg(t, a1 - .2, a1)), 'right', 'trick' + a0);
  hud(g, t);
  // the cry
  if (t > K.cry && t < 30.6) {
    const [sx, sy] = iso.P(66, 60, 1.5), a = 1 - seg(t, 30.2, 30.6);
    g.save(); g.strokeStyle = INK; g.lineWidth = 2;
    for (let i = 0; i < 6; i++) { const u = (t - K.cry - i * .5); if (u < 0 || u > 1.4) continue; g.globalAlpha = a * (1 - u / 1.4); g.beginPath(); g.ellipse(sx, sy, 30 + u * 160, (30 + u * 160) * .5, 0, 0, TAU); g.stroke(); }
    g.restore();
    const ly = Math.min(sy - 190, 700), lx = Math.min(sx, 1500), la = seg(t, K.cry, K.cry + .35) * a;
    if (la > 0) { g.save(); g.globalAlpha = la; g.strokeStyle = INK; g.lineWidth = 2; g.beginPath(); g.moveTo(sx, sy); g.lineTo(lx, ly + 14); g.stroke(); haloText(g, '“HA SITA! HA LAKSHMANA!”', lx, ly, { font: F(600, 30), track: 3, align: 'center' }); g.restore(); }
    if (la >= 1) addText('cry', 'HA SITA! HA LAKSHMANA!', lx - 260, ly - 30, lx + 260, ly + 10);
  }
  // tracked subject
  if (t > K.lift + .4 && t < K.land + 1.2) {
    const ch = chariot(t), a = seg(t, K.lift + .4, K.lift + 1) * (1 - seg(t, K.land + .8, K.land + 1.2));
    let p;
    if (t < K.land) { const c = Math.cos(ch.rot), s = Math.sin(ch.rot); p = [ch.p[0] + (-.1 * c - .3 * s), ch.p[1] + (-.1 * s + .3 * c), ch.p[2] + 2]; }
    else { const u = seg(t, K.land, K.land + .6); p = [lerp(136, 133.5, u), lerp(141, 147.5, u), 1.8]; }
    const [sx, sy] = iso.P(...p); ring(g, sx, sy, 2.1 * iso.cam.k, a, t, 'SITA', { ang: -.75 });
    if (a >= 1) addText('ring', 'SITA', sx + 40, sy - 90, sx + 200, sy - 40);
  }
  // Jatayu
  if (t > 45.5 && t < 48.6) { const j = jatayu(t); const a = Math.min(seg(t, 45.5, 46.1), 1 - seg(t, 48.2, 48.6)); pinT(iso, 'jat', j.p[0], j.p[1], j.p[2] + .4, { title: 'JATAYU', a, dir: -1, up: 120, len: 50 }); }
  if (t > K.jewel + .1 && t < 53.6) { const a = Math.min(seg(t, K.jewel + .1, K.jewel + .8), 1 - seg(t, 53.3, 53.6)); pinT(iso, 'trail', HILL[0] + 1, HILL[1] + 3, 4.4, { title: 'A TRAIL FOR RAMA', a, dir: -1, up: -110, len: 50, icons: (g, x, y) => { for (let i = 0; i < 5; i++) jewelIcon(g, x - 18 - i * 30, y + 12, 26); } }); }
  if (t > 53.8 && t < 57.0) { const a = Math.min(seg(t, 53.8, 54.5), 1 - seg(t, 56.7, 57.0)); pinT(iso, 'lanka', 146, 134, 7.6, { title: 'LANKA', a, dir: 1, up: 120, len: 50 }); }
  // the empty hut
  if (t > K.back + 1.2 && t < K.pull + 1.2) {
    const a = seg(t, K.back + 1.4, K.back + 1.9), q = back(seg(t, K.quest, K.quest + .45), 2.4) * (1 - seg(t, K.pull + .6, K.pull + 1.2));
    const pts = []; for (let i = 0; i <= 40; i++) { const an = i / 40 * TAU; pts.push(iso.P(24 + Math.cos(an) * 1.1, 35 + Math.sin(an) * 1.1, .05)); }
    g.save(); g.globalAlpha = a; g.beginPath(); pts.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fillStyle = 'rgba(251,244,230,.85)'; g.fill(); g.setLineDash([8, 6]); g.strokeStyle = INK; g.lineWidth = 2; g.stroke(); g.restore();
    if (q > 0) { const [sx, sy] = iso.P(24, 35, 0); g.save(); g.translate(sx, sy - 1.6 * iso.cam.k); g.scale(q, q); haloText(g, '?', 0, 0, { font: F(500, 2.4 * iso.cam.k), align: 'center', base: 'middle', hw: 10 }); g.restore(); }
  }
  // scale reveal: the route, station by station
  if (t > K.pull + .2) {
    const st = [[24, 30.5, 5.6, 'PANCHAVATI', -1, 90], [54, 66, .8, 'JATAYU FALLS', 1, 70], [84, 93, 4.4, 'RISHYAMUKA HILL', 1, 80], [141, 140, 1.4, 'LANKA', -1, 70]];
    const prog = seg(t, K.pull + .3, K.pull + 2.6);
    const sub = FLY_PTS.map(r => r.slice(1)); const pts = [[24, 35, .1], [31, 39, .6], ...sub.slice(0, Math.max(2, Math.round(prog * sub.length)))];
    iso.line3(pts, C.sita, 5, { now: true, a: 1 });
    st.forEach(([x, y, z, name, dir, up], i) => pinT(iso, 'st' + i, x, y, z, { title: name, a: seg(t, K.pull + .4 + i * .6, K.pull + 1.2 + i * .6), dir, up, len: 40, ts: 21, dot: i === 3 ? C.rav : C.sita }));
  }
  if (t > K.legend) legend(g, t);
}
function sunIcon(g, x, y, s, lit) { g.save(); g.translate(x, y); const c = lit ? '#E4A93A' : '#D8CCB6'; g.strokeStyle = c; g.lineWidth = s * .09; g.lineCap = 'round'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; g.beginPath(); g.moveTo(Math.cos(a) * s * .3, Math.sin(a) * s * .3); g.lineTo(Math.cos(a) * s * .44, Math.sin(a) * s * .44); g.stroke(); } g.beginPath(); g.arc(0, 0, s * .22, 0, TAU); g.fillStyle = c; g.fill(); g.restore(); }
function legend(g, t) {
  const a = seg(t, K.legend, K.legend + .6), x = 48, y = 44, w = 600, h = 322, s = back(a, 1.5);
  g.save(); g.translate(x, y); g.scale(s, s); g.translate(-x, -y);
  card(g, x, y, w, h);
  haloText(g, 'SITA HARAN', x + 30, y + 68, { font: F(600, 50), track: 6, halo: false });
  haloText(g, 'THE ABDUCTION OF SITA', x + 30, y + 104, { font: F(600, 17), track: 3, halo: false, color: '#6B5F70' });
  haloText(g, 'RAMAYANA · ARANYA KANDA', x + 30, y + 128, { font: F(600, 17), track: 3, halo: false, color: '#6B5F70' });
  const key = [['SITA', C.sita], ['RAMA', C.rama], ['LAKSHMANA & HIS LINE', C.lak], ['RAVANA & HIS GOLD', C.rav], ['WATER', C.water], ['FOREST', C.leaf]];
  key.forEach(([n, c], i) => { const kx = x + 34 + (i % 2) * 290, ky = y + 166 + ((i / 3 | 0) * 0) + (i >> 1) * 40; const pa = back(seg(t, K.legend + .3 + i * .12, K.legend + .6 + i * .12), 2.2); g.save(); g.translate(kx + 10, ky); g.scale(pa, pa); cube(g, -10, -10, 14, c); g.restore(); haloText(g, n, kx + 34, ky + 7, { font: F(600, 17), track: 2, halo: false }); });
  haloText(g, 'NOT TO SCALE', x + 30, y + h - 28, { font: F(600, 15), track: 4, halo: false, color: '#6B5F70' });
  g.restore();
  if (a >= 1) { addText('lg1', 'SITA HARAN', x, y, x + w, y + 80); addText('lg2', 'THE ABDUCTION OF SITA RAMAYANA ARANYA KANDA', x, y + 84, x + w, y + 136); addText('lg3', key.map(k => k[0]).join(' '), x, y + 140, x + w, y + 270); addText('lg4', 'NOT TO SCALE', x, y + h - 50, x + w, y + h); }
}

// ---------------------------------------------------------------- background + title
function background(g, iso) {
  g.fillStyle = BG; g.fillRect(0, 0, 1920, 1080);
  // faint isometric dot lattice on a plane far below the board
  const k = iso.cam.k, sp = k > 30 ? 2 : k > 12 ? 5 : 10, z = -14;
  const c = [iso.unP(0, 0, z), iso.unP(1920, 0, z), iso.unP(0, 1080, z), iso.unP(1920, 1080, z)];
  const x0 = Math.floor(Math.min(...c.map(p => p[0])) / sp) * sp, x1 = Math.max(...c.map(p => p[0])), y0 = Math.floor(Math.min(...c.map(p => p[1])) / sp) * sp, y1 = Math.max(...c.map(p => p[1]));
  g.fillStyle = 'rgba(42,34,48,.12)';
  if ((x1 - x0) / sp * (y1 - y0) / sp < 20000) for (let x = x0; x <= x1; x += sp) for (let y = y0; y <= y1; y += sp) { const [sx, sy] = iso.P(x, y, z); if (sx > -4 && sx < 1924 && sy > -4 && sy < 1084) g.fillRect(sx - 1.2, sy - 1.2, 2.4, 2.4); }
  // the board's soft shadow
  const sh = [[0, 0], [S, 0], [S, S], [0, S]].map(p => iso.P(p[0] + 4, p[1] + 4, -9));
  g.save(); g.shadowColor = 'rgba(42,34,48,.28)'; g.shadowBlur = Math.min(80, 6 * k); g.beginPath(); sh.forEach((p, i) => i ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fillStyle = 'rgba(42,34,48,.12)'; g.fill(); g.restore();
}
function title(iso, g, t) {
  if (t > 5.0) return;
  const words = [['HOW', T.wall], ['WAS', T.wall], ['SITA', T.sita], ['TAKEN?', T.wall]], size = 4.6, ex = .8;
  g.save(); g.font = F(700, 100); g.letterSpacing = '12px'; const ws = words.map(w => g.measureText(w[0] + ' ').width / 100 * size); g.restore();
  let y = 69;
  words.forEach(([w, c], i) => {
    const t0 = K.title + i * .3125, a = seg(t, t0, t0 + .35), out = seg(t, 4.3 + i * .08, 4.65 + i * .08);
    if (a > 0 && out < 1) { const z = (1 - eo(a)) * 6 + .05, sc = 1 - eo(out); iso.text3(w, 42.5, y, z, { plane: 'xy', size: size * sc, extrude: ex * sc, tri: c, track: 12, depth: 42 + y + 50 }); }
    y -= ws[i];
  });
  if (t > 1.65 && t < 4.3) { const P = [iso.P(41, 69, 0), iso.P(47.5, 69, 0), iso.P(41, 69 - ws.reduce((a, b) => a + b, 0), 0), iso.P(47.5, 69 - ws.reduce((a, b) => a + b, 0), 0)]; addText('title', 'HOW WAS SITA TAKEN?', Math.min(...P.map(p => p[0])), Math.min(...P.map(p => p[1])), Math.max(...P.map(p => p[0])), Math.max(...P.map(p => p[1]))); }
}

// ---------------------------------------------------------------- frame
export function render(g, t, Q) {
  TXT = [];
  const iso = new Iso(g); iso.cam = camAt(t, Q);
  background(g, iso);
  iso.desat = Math.min(eio(seg(t, K.desat0, K.desat0 + 1.6)), 1 - eio(seg(t, K.snap, K.snap + .6)));
  drawWorld(iso, t);
  title(iso, g, t);
  iso.flush();
  iso.desat = 0;
  overlays(g, iso, t, Q);
  if (!(Q && Q.has('nosub'))) drawSub(g, t);
  return TXT;
}
export const texts = () => TXT;

// ---------------------------------------------------------------- sound events (for the mix)
export function events() {
  const E = [];
  const e = (t, type, x = {}) => E.push({ t: +t.toFixed(3), type, ...x });
  for (let i = 0; i < 4; i++) e(K.title + i * .3125 + .3, 'thunk', { v: i === 2 ? 1 : .7 });
  for (let i = 0; i < 24; i++) e(2.4 + i * .085, 'pop', { v: .25 + .2 * hash(i), p: .8 + hash(i * 3) * .6 });
  for (let i = 0; i < 4; i++) e(4.3 + i * .08, 'pip', { v: .4 });
  for (let i = 0; i < 3; i++) e(K.names + .2 + i * .3, 'tick', { v: .5 });
  for (let i = 0; i < 13; i++) e(K.cal + .6 + i * (1.6 / 13), 'tick', { v: .45, p: 1 + i * .04 });
  e(K.inset0 + .2, 'whoosh', { v: .5 });
  for (let i = 0; i < 9; i++) e(K.heads + (i + 1) * (1.2 / 9), 'pop', { v: .6, p: .7 + i * .05 });
  e(K.brothers, 'tick', { v: .5 }); e(K.hud, 'thunk', { v: .5 });
  e(21.0, 'card'); e(26.4, 'card'); e(34.7, 'card');
  e(K.deer + .1, 'chime', { v: .7 }); e(K.deer + .45, 'hoof', { v: .6 });
  for (let i = 0; i < 16; i++) e(K.chase - .4 + i * .16, 'hoof', { v: .45 * (1 - i / 18) });
  for (let i = 0; i < 12; i++) e(K.chase + .1 + i * .21, 'step', { v: .35 * (1 - i / 14) });
  e(K.ramaOut, 'out');
  for (let i = 0; i < 6; i++) e(K.cry + i * .5, 'cry', { v: 1 - i * .12 });
  e(K.line0, 'scratch', { d: K.line1 - K.line0 }); e(K.line1, 'in');
  for (let i = 0; i < 10; i++) e(K.lakGo + .1 + i * .22, 'step', { v: .3 * (1 - i / 11) });
  e(K.lakOut, 'out');
  for (let i = 0; i < 12; i++) e(K.monk + .3 + i * .23, 'step', { v: .14 + i * .02 });
  e(K.step + .15, 'step', { v: .5 }); e(K.step + .5, 'step', { v: .55 });
  e(K.snap, 'snap', { v: 1 });
  e(K.reveal, 'reveal', { v: .9 });
  for (let i = 0; i < 9; i++) e(K.reveal + .12 + i * .05, 'pop', { v: .5, p: .6 + i * .06 });
  e(K.drop, 'whoosh', { v: .7 }); e(K.drop + .6, 'thud', { v: .8 }); e(K.lift, 'lift', { v: 1 });
  e(K.jat, 'cawl', { v: .8 });
  for (let i = 0; i < 9; i++) e(K.jat + .8 + i * .26, 'flap', { v: .6 });
  e(K.struck, 'slash', { v: 1 }); e(K.struck + 1.4, 'thud', { v: .9, f: 55 });
  for (let i = 0; i < 5; i++) { e(K.jewel + i * .3, 'ping', { p: [1, 1.122, 1.335, 1.498, 1.682][i] }); e(K.jewel + i * .3 + .8, 'tick', { v: .4 }); }
  e(K.land - .6, 'whoosh', { v: .5 }); e(K.land, 'thud', { v: .5 });
  e(K.back, 'whoosh', { v: .8 }); e(K.back + 1.0, 'whoosh', { v: .5 });
  e(K.quest, 'pip', { v: .7 });
  for (let i = 0; i < 4; i++) e(K.pull + .6 + i * .6, 'station', { i });
  e(K.legend, 'thunk', { v: .6 });
  // sections for the score
  for (const s of SUBS) e(s.t0, 'line', { id: s.id, d: s.d, t1: s.t1, text: s.text });
  return E.sort((a, b) => a.t - b.t);
}
export { K };
