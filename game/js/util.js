/* Outlaw County — util.js
 * Math helpers, seeded random, value noise, binary heap, input handling.
 * All game scripts are classic scripts sharing one global scope so the game
 * runs from file:// (browser or Electron) without a server.
 */
'use strict';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
const smooth = t => t * t * (3 - 2 * t);
const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const randi = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const chance = p => Math.random() < p;

function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y) {
  let h = (x | 0) * 374761393 + (y | 0) * 668265263;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function makeNoise(seed) {
  const r = mulberry32(seed);
  const size = 256, vals = new Float32Array(size * size);
  for (let i = 0; i < vals.length; i++) vals[i] = r();
  const at = (x, y) => vals[((y & 255) << 8) | (x & 255)];
  return function (x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const fx = smooth(x - xi), fy = smooth(y - yi);
    const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
    return lerp(lerp(a, b, fx), lerp(c, d, fx), fy);
  };
}

function fbm(noise, x, y, oct = 4) {
  let v = 0, amp = 0.5, f = 1, norm = 0;
  for (let i = 0; i < oct; i++) { v += noise(x * f, y * f) * amp; norm += amp; amp *= 0.5; f *= 2; }
  return v / norm;
}

function formatMoney(n) { return '$' + Math.floor(n).toLocaleString('en-US'); }

/* Minimal binary heap used by A* path finding. */
class MinHeap {
  constructor() { this.k = []; this.v = []; }
  get size() { return this.k.length; }
  push(val, key) {
    const k = this.k, v = this.v; let i = k.length; k.push(key); v.push(val);
    while (i > 0) {
      const p = (i - 1) >> 1; if (k[p] <= k[i]) break;
      [k[p], k[i]] = [k[i], k[p]]; [v[p], v[i]] = [v[i], v[p]]; i = p;
    }
  }
  pop() {
    const k = this.k, v = this.v, top = v[0], lk = k.pop(), lv = v.pop();
    if (k.length) {
      k[0] = lk; v[0] = lv; let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < k.length && k[l] < k[m]) m = l;
        if (r < k.length && k[r] < k[m]) m = r;
        if (m === i) break;
        [k[m], k[i]] = [k[i], k[m]]; [v[m], v[i]] = [v[i], v[m]]; i = m;
      }
    }
    return top;
  }
}

/* ---------------- Input ---------------- */
const Input = {
  keys: Object.create(null),
  pressed: Object.create(null),
  mouse: { x: 0, y: 0, down: false, clicked: false, rdown: false, rclicked: false },
  wheel: 0,
  enabled: true,
  init(target) {
    const block = new Set(['Tab', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'F1']);
    window.addEventListener('keydown', e => {
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
      if (block.has(e.code)) e.preventDefault();
      if (!this.keys[e.code]) this.pressed[e.code] = true;
      this.keys[e.code] = true;
    });
    window.addEventListener('keyup', e => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = Object.create(null); this.mouse.down = false; this.mouse.rdown = false; });
    window.addEventListener('mousemove', e => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; });
    target.addEventListener('mousedown', e => {
      if (e.button === 0) { this.mouse.down = true; this.mouse.clicked = true; }
      if (e.button === 2) { this.mouse.rdown = true; this.mouse.rclicked = true; }
    });
    window.addEventListener('mouseup', e => {
      if (e.button === 0) this.mouse.down = false;
      if (e.button === 2) this.mouse.rdown = false;
    });
    target.addEventListener('contextmenu', e => e.preventDefault());
    target.addEventListener('wheel', e => { this.wheel += Math.sign(e.deltaY); e.preventDefault(); }, { passive: false });
  },
  down(code) { return !!this.keys[code]; },
  hit(code) { return !!this.pressed[code]; },
  endFrame() {
    this.pressed = Object.create(null);
    this.mouse.clicked = false; this.mouse.rclicked = false; this.wheel = 0;
  }
};

/* ---------------- Hooks: lets add-on systems (arsenal, looks, story, side jobs) plug into the core loop ---------------- */
const Hooks = {
  list: [],
  add(h) { this.list.push(h); },
  run(name, ...args) { for (const h of this.list) if (h[name]) h[name](...args); },
  collect(name, ...args) { const out = []; for (const h of this.list) if (h[name]) { const r = h[name](...args); if (r) out.push(...r); } return out; },
  save() { const o = {}; this.list.forEach((h, i) => { if (h.save) o[h.key || i] = h.save(); }); return o; },
  load(ext, s) { this.list.forEach((h, i) => { if (h.load) h.load((ext || {})[h.key || i], s); }); }
};
