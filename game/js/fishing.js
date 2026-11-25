/* Outlaw County — fishing.js (v2.6)
 * Buy a rod at any general store, stand at the water's edge and press E.
 * Wait for the bite, hook it, then keep the fish inside your green zone
 * (hold the mouse button or Space to lift the zone) until it's landed.
 */
'use strict';

const FISH = {
  bluegill: { name: 'Bluegill', sell: 4, diff: 0.2, color: '#7a9ab0' },
  bass: { name: 'Largemouth Bass', sell: 11, diff: 0.5, color: '#5a7a3a' },
  trout: { name: 'Brook Trout', sell: 8, diff: 0.35, color: '#9a7a5a' },
  char: { name: 'Arctic Char', sell: 12, diff: 0.5, color: '#c86a4a' },
  goldtrout: { name: 'Golden Trout', sell: 60, diff: 0.85, color: '#e8c040', legend: true },
  perch: { name: 'Yellow Perch', sell: 5, diff: 0.25, color: '#c8b040' },
  pike: { name: 'Lake Pike', sell: 14, diff: 0.55, color: '#6a7a4a' },
  sturgeon: { name: 'Harlow Sturgeon', sell: 90, diff: 0.9, color: '#5a5a6a', legend: true },
  catfish: { name: 'Channel Catfish', sell: 10, diff: 0.45, color: '#6a5a4a' },
  gar: { name: 'Longnose Gar', sell: 13, diff: 0.6, color: '#8a8a5a' },
  leviathan: { name: 'Old Whiskers (giant catfish)', sell: 80, diff: 0.92, color: '#3a3a2a', legend: true },
  snapper: { name: 'Red Snapper', sell: 12, diff: 0.4, color: '#d85a4a' },
  dorado: { name: 'Dorado', sell: 18, diff: 0.62, color: '#c8d040' },
  marlin: { name: 'El Rey (blue marlin)', sell: 140, diff: 0.95, color: '#2a5a9a', legend: true }
};
ITEMS.rod = { name: 'Fishing Rod', type: 'tool', price: 25, sell: 6, desc: 'Stand at the water and press E to fish.' };
for (const [k, f] of Object.entries(FISH)) { ITEMS['fish_' + k] = { name: f.name, type: 'pelt', sell: f.sell, desc: f.legend ? 'A legendary catch. Worth a fortune.' : 'Fresh fish. General stores and trappers buy it.' }; ITEM_ORDER.push('fish_' + k); }
ITEM_ORDER.push('rod');
SHOP_STOCK.general.buy.push('rod');

const Fishing = {
  s: null,
  waterNear() {
    const P = G.player, tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const t = World.tile(tx + dx, ty + dy); if (t === T.WATER || t === T.SHALLOW) return { x: (tx + dx) * TS + 8, y: (ty + dy) * TS + 8 }; }
    return null;
  },
  pool(x, y) {
    const r = World.regionAt(x, y) || '';
    if (/Frost|Silver/.test(r)) return [['trout', 60], ['char', 36], ['goldtrout', 4]];
    if (/Harlow|Port/.test(r)) return [['perch', 55], ['pike', 42], ['sturgeon', 3]];
    if (/Cortés|Costa|Puerto/.test(r) || (typeof MEX_Y !== 'undefined' && y > 1780 * TS)) return [['snapper', 55], ['dorado', 42], ['marlin', 3]];
    if (/Laguna/.test(r)) return [['bass', 50], ['catfish', 47], ['leviathan', 3]];
    if (/Rio|San Lucero|Badlands|Barranca/.test(r) || y > 760 * TS) return [['catfish', 55], ['gar', 42], ['leviathan', 3]];
    return [['bluegill', 60], ['bass', 40]];
  },
  roll(pool) { let n = Math.random() * pool.reduce((a, b) => a + b[1], 0); for (const [k, w] of pool) { if ((n -= w) <= 0) return k; } return pool[0][0]; },

  interactions() {
    const P = G.player;
    if (P.mounted || MissionSys.active && !MissionSys.active.side || !P.inv.rod) return [];
    const w = this.waterNear(); if (!w) return [];
    return [{ label: 'Fish', x: P.x, y: P.y, r: 999, priority: -50, act: () => this.begin(w) }];
  },

  begin(w) {
    const P = G.player;
    const kind = this.roll(this.pool(w.x, w.y)), f = FISH[kind];
    this.s = { phase: 'cast', t: 0, kind, f, wait: rand(2.2, 7), zone: 0.3, zv: 0, fish: 0.5, fv: 0, fishT: 0, prog: 0.3, hold: false, msg: '' };
    P.face = Math.atan2(w.y - P.y, w.x - P.x);
    UI.show('fishing'); UI.modal = 'fishing';
    this.last = performance.now(); requestAnimationFrame(() => this.loop());
  },
  loop() {
    const s = this.s; if (!s) return;
    if (UI.modal !== 'fishing') { this.s = null; return; }
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    s.t += dt; this.step(s, dt); this.draw(s);
    if (this.s) requestAnimationFrame(() => this.loop());
  },
  press(down) {
    const s = this.s; if (!s) return;
    if (!down) { s.hold = false; return; }
    if (s.phase === 'wait') { s.msg = 'Too soon! You spooked it.'; s.phase = 'cast'; s.t = 0; s.wait = rand(2.5, 6); return; }
    if (s.phase === 'bite') { s.phase = 'reel'; s.t = 0; Sound.play('click'); return; }
    if (s.phase === 'reel') s.hold = true;
    if (s.phase === 'done' && s.t > 0.6) this.close();
  },
  step(s, dt) {
    if (s.phase === 'cast' && s.t > 0.7) { s.phase = 'wait'; s.t = 0; }
    if (s.phase === 'wait' && s.t > s.wait) { s.phase = 'bite'; s.t = 0; Sound.play('splash'); }
    if (s.phase === 'bite' && s.t > 0.9) { s.msg = 'It got away. Too slow!'; s.phase = 'cast'; s.t = 0; s.wait = rand(2.5, 6); }
    if (s.phase === 'reel') {
      const d = s.f.diff, zw = 0.34 - d * 0.12;
      // the fish darts around, harder fish more often and farther
      s.fishT -= dt;
      if (s.fishT <= 0) { s.fishT = rand(0.35, 1.2) * (1.2 - d); s.fv = rand(-1, 1) * (0.35 + d * 1.15); }
      s.fish = clamp(s.fish + s.fv * dt, 0, 1); if (s.fish === 0 || s.fish === 1) s.fv *= -1;
      s.zv += (s.hold ? 2.4 : -2.0) * dt; s.zv = clamp(s.zv, -1.2, 1.2);
      s.zone = clamp(s.zone + s.zv * dt, 0, 1 - zw); if (s.zone === 0 || s.zone === 1 - zw) s.zv *= -0.3;
      const inZone = s.fish >= s.zone && s.fish <= s.zone + zw;
      s.prog = clamp(s.prog + (inZone ? 0.27 : -0.13 - d * 0.13) * dt, 0, 1);
      s.zw = zw; s.inZone = inZone;
      if (s.prog >= 1) this.land(s, true);
      else if (s.prog <= 0) this.land(s, false);
    }
  },
  land(s, ok) {
    s.phase = 'done'; s.t = 0; s.ok = ok;
    if (ok) {
      const P = G.player; P.inv['fish_' + s.kind] = (P.inv['fish_' + s.kind] || 0) + 1;
      G.stats.fish = (G.stats.fish || 0) + 1; Progress.add(s.f.legend ? 80 : 8);
      if (s.f.legend) { Ach.event('legendfish'); Sound.play('mission'); }
      s.msg = `You landed a ${s.f.name}!${s.f.legend ? ' A LEGEND!' : ''}`;
    } else s.msg = 'The line went slack. It got away.';
  },
  close() { this.s = null; if (UI.modal === 'fishing') UI.closeAll(); },

  draw(s) {
    const cv = $('fish-canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H);
    // water scene
    const wg = g.createLinearGradient(0, 0, 0, H); wg.addColorStop(0, '#3a6a8a'); wg.addColorStop(1, '#1a3a52');
    g.fillStyle = wg; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.15)'; for (let i = 0; i < 6; i++) { g.beginPath(); const y = 20 + i * 22 + Math.sin(s.t * 1.5 + i) * 3; g.moveTo(0, y); for (let x = 0; x <= W; x += 20) g.lineTo(x, y + Math.sin(x * 0.05 + s.t * 2 + i) * 2); g.stroke(); }
    g.textAlign = 'center'; g.fillStyle = '#f0e0b8'; g.font = 'bold 15px Georgia, serif';
    if (s.phase === 'cast' || s.phase === 'wait' || s.phase === 'bite') {
      const bob = s.phase === 'bite' ? Math.sin(s.t * 40) * 6 + 6 : Math.sin(s.t * 3) * 2;
      g.strokeStyle = 'rgba(230,230,230,.6)'; g.beginPath(); g.moveTo(W * 0.15, 0); g.quadraticCurveTo(W * 0.35, H * 0.2, W / 2, H / 2 + bob); g.stroke();
      g.fillStyle = '#e83a2a'; g.beginPath(); g.arc(W / 2, H / 2 + bob, 6, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.fillRect(W / 2 - 5, H / 2 + bob - 2, 10, 2);
      g.fillStyle = '#f0e0b8';
      if (s.phase === 'bite') { g.font = 'bold 38px Georgia, serif'; g.fillStyle = '#ffe39a'; g.fillText('! BITE !  click now', W / 2, 42); }
      else g.fillText(s.phase === 'cast' ? 'Casting...' : 'Wait for the bite... don\'t click yet', W / 2, 26);
      if (s.msg) { g.font = '13px Georgia, serif'; g.fillStyle = '#ffb0a0'; g.fillText(s.msg, W / 2, H - 14); }
    }
    if (s.phase === 'reel') {
      const bx = W * 0.5 - 18, by = 14, bh = H - 28;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(bx, by, 36, bh);
      g.fillStyle = s.inZone ? 'rgba(110,220,110,.75)' : 'rgba(110,220,110,.4)';
      g.fillRect(bx + 3, by + bh * (1 - s.zone - s.zw), 30, bh * s.zw);
      const fy = by + bh * (1 - s.fish);
      g.fillStyle = s.f.color; g.beginPath(); g.ellipse(bx + 18, fy, 11, 6, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(bx + 28, fy); g.lineTo(bx + 34, fy - 5); g.lineTo(bx + 34, fy + 5); g.fill();
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(bx + 48, by, 12, bh);
      g.fillStyle = s.prog > 0.75 ? '#ffe39a' : '#c8a040'; g.fillRect(bx + 50, by + bh * (1 - s.prog), 8, bh * s.prog);
      g.textAlign = 'left'; g.fillStyle = '#f0e0b8'; g.font = '13px Georgia, serif';
      g.fillText('Hold click (or Space)', 14, 28); g.fillText('to lift the green zone.', 14, 46); g.fillText('Keep the fish inside it', 14, 70); g.fillText('until the bar fills.', 14, 88);
      g.textAlign = 'right'; g.fillText(s.f.legend ? 'Something HUGE...' : 'Something\'s on!', W - 14, 28);
    }
    if (s.phase === 'done') {
      g.font = 'bold 22px Georgia, serif'; g.fillStyle = s.ok ? '#ffe39a' : '#ffb0a0'; g.fillText(s.msg, W / 2, H / 2);
      if (s.ok) { g.fillStyle = s.f.color; g.beginPath(); g.ellipse(W / 2, H / 2 + 34, 26, 11, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(W / 2 + 24, H / 2 + 34); g.lineTo(W / 2 + 38, H / 2 + 24); g.lineTo(W / 2 + 38, H / 2 + 44); g.fill(); }
      g.font = '13px Georgia, serif'; g.fillStyle = '#f0e0b8'; g.fillText('Click to continue', W / 2, H - 12);
    }
  }
};

(function () {
  const el = document.createElement('div'); el.id = 'fishing'; el.className = 'screen hidden';
  el.innerHTML = '<div class="fish-box"><canvas id="fish-canvas" width="520" height="180"></canvas><div class="muted small">Esc to reel in and stop</div></div>';
  const add = () => {
    document.body.append(el);
    el.addEventListener('mousedown', e => { if (e.button === 0) Fishing.press(true); });
    addEventListener('mouseup', () => Fishing.press(false));
    addEventListener('keydown', e => { if (Fishing.s && (e.code === 'Space' || e.code === 'KeyE')) { if (!e.repeat) Fishing.press(true); } });
    addEventListener('keyup', e => { if (Fishing.s && (e.code === 'Space' || e.code === 'KeyE')) Fishing.press(false); });
  };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'angler', name: 'Angler', desc: 'Catch 10 fish.', icon: '≋', prog: () => [G.stats.fish || 0, 10] },
    { id: 'legendfish', name: 'The One That Didn\'t Get Away', desc: 'Land a legendary fish.', icon: '≋', ev: 'legendfish' }
  );
})();

Hooks.add({ key: 'fishing', interactions: () => Fishing.interactions(), reset: () => { Fishing.s = null; } });
