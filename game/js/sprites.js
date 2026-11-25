/* Outlaw County — sprites.js
 * Procedural pixel-art drawing for every character, animal, vehicle, prop and
 * building. Everything is drawn with Canvas primitives at world-pixel scale.
 */
'use strict';

const FONT3x5 = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110', E: '111100110100111', F: '111100110100100',
  G: '011100101101011', H: '101101111101101', I: '111010010010111', J: '001001001101010', K: '101101110101101', L: '100100100100111',
  M: '101111111101101', N: '110101101101101', O: '010101101101010', P: '110101110100100', Q: '010101101110011', R: '110101110101101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010', W: '101101111111101', X: '101101010101101',
  Y: '101101010010010', Z: '111001010100111', 0: '111101101101111', 1: '010110010010111', 2: '110001010100111', 3: '110001010001110',
  4: '101101111001001', 5: '111100110001110', 6: '011100111101111', 7: '111001010010010', 8: '111101111101111', 9: '111101111001110',
  "'": '010010000000000', '&': '010101010101011', '.': '000000000000010', '-': '000000111000000', '>': '100010001010100', '<': '001010100010001', ' ': '000000000000000'
};

const PAL = {
  player: { hat: '#3b2a1c', band: '#8a1c1c', shirt: '#c9b48a', vest: '#4a3020', pants: '#3d3a4a', skin: '#d9a27a', boots: '#2a1a10', bandana: '#9c2a2a', hatType: 'cowboy' },
  lawman: { hat: '#2a2420', band: '#151210', shirt: '#7d776a', vest: '#2f2b26', pants: '#3a3530', skin: '#d6a07a', boots: '#1a1410', badge: true, hatType: 'cowboy' },
  sheriff: { hat: '#e0d6c0', band: '#3a2a1a', shirt: '#5e3c2a', vest: '#1f1a16', pants: '#3a3530', skin: '#c99470', boots: '#1a1410', badge: true, hatType: 'cowboy' },
  marshal: { hat: '#141414', band: '#6a5a3a', shirt: '#4a4a52', vest: '#1a1a1e', pants: '#2a2a2e', skin: '#d6a07a', boots: '#111', badge: true, hatType: 'cowboy', coat: '#2a2a30' },
  rival: { hat: '#1d1b1b', band: '#a08040', shirt: '#7a2e22', vest: null, pants: '#2f2a26', skin: '#c48c64', boots: '#1a1410', bandana: '#111', hatType: 'cowboy', poncho: '#8a5a2a' },
  gang: { hat: '#5a4030', band: '#222', shirt: '#4d5a6a', vest: '#2e2418', pants: '#2e2c34', skin: '#d0a07c', boots: '#24180e', bandana: '#3a5a8a', hatType: 'cowboy' },
  guard: { hat: '#3a3226', band: '#111', shirt: '#4a5a42', vest: '#2a2a22', pants: '#33302a', skin: '#d6a07a', boots: '#1a1410', hatType: 'cowboy' },
  soldier: { hat: '#2a3450', band: '#c8a040', shirt: '#3a4a7a', vest: '#2a3456', pants: '#5a6a8a', skin: '#d6a07a', boots: '#1a1410', badge: false, hatType: 'cowboy' },
};

const CIV_PALS = [
  { hat: '#2a2a2a', shirt: '#e6e0d0', vest: '#3a3a44', pants: '#2e2e36', skin: '#e0b08a', boots: '#1a1410', hatType: 'bowler' },
  { hat: '#c8b080', shirt: '#6a7a8a', vest: null, pants: '#5a4a3a', skin: '#c08a60', boots: '#2a1a10', hatType: 'cowboy', band: '#5a3a20' },
  { hat: '#e8dcc0', shirt: '#9a4a5a', dress: '#7a3a4a', skin: '#e8bc96', hatType: 'bonnet' },
  { hat: '#4a6a8a', shirt: '#d8d0e0', dress: '#4a5a8a', skin: '#d8a882', hatType: 'bonnet' },
  { hat: null, shirt: '#b8a080', vest: '#6a4a2a', pants: '#3a3a3a', skin: '#a87450', boots: '#1a1410', hatType: 'none', hair: '#2a1a10' },
  { hat: '#5a4a3a', shirt: '#8a8a6a', vest: '#3a2a1a', pants: '#4a4036', skin: '#dcae88', boots: '#20160e', hatType: 'cowboy', band: '#222' },
  { hat: '#d8c8a0', shirt: '#e8e0c8', vest: null, pants: '#e8e0c8', skin: '#a8724a', boots: '#3a2a1a', hatType: 'sombrero', band: '#a03020', poncho: '#b85a2a' },
  { hat: '#222', shirt: '#2a2a2a', vest: '#111', pants: '#1a1a1a', skin: '#e4b894', boots: '#0e0e0e', hatType: 'bowler' },
  { hat: null, shirt: '#d8c8a8', dress: '#6a5a3a', skin: '#c89a74', hatType: 'none', hair: '#6a3a1a', apron: '#e8e0d0' }
];

const Sprites = {
  R(ctx, c, x, y, w, h) { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); },

  pixelText(ctx, text, x, y, color, scale = 1) {
    ctx.fillStyle = color;
    text = String(text).toUpperCase();
    for (let i = 0; i < text.length; i++) {
      const g = FONT3x5[text[i]] || FONT3x5[' '];
      for (let k = 0; k < 15; k++) if (g[k] === '1') ctx.fillRect(x + i * 4 * scale + (k % 3) * scale, y + Math.floor(k / 3) * scale, scale, scale);
    }
  },
  textWidth(text, scale = 1) { return String(text).length * 4 * scale - scale; },

  shadow(ctx, x, y, w, h, a = 0.28) {
    ctx.fillStyle = `rgba(20,10,5,${a})`;
    ctx.beginPath(); ctx.ellipse(x, y, w, h, 0, 0, TAU); ctx.fill();
  },

  /* weapon drawn along +x from the hand origin */
  weaponShape(ctx, key, ox) {
    const R = this.R.bind(this);
    switch (key) {
      case 'knife': R(ctx, '#5a3a22', ox - 1, -1, 2, 2); R(ctx, '#d8dde2', ox + 1, -1, 4, 1); R(ctx, '#9aa0a6', ox + 1, 0, 3, 1); break;
      case 'sa': case 'da':
        R(ctx, '#6b4423', ox - 1, 0, 2, 2); R(ctx, '#4a4e54', ox, -1, 5, 1); R(ctx, '#2e3136', ox + 1, -1, 2, 2);
        R(ctx, key === 'da' ? '#8a8e96' : '#5c6066', ox + 3, -1, 2, 1); break;
      case 'lever': case 'repeater':
        R(ctx, '#7a4a26', ox - 4, -1, 4, 2); R(ctx, '#3a3d42', ox, -1, 9, 1); R(ctx, '#6b4423', ox + 1, 0, 4, 1);
        if (key === 'lever') R(ctx, '#2a2a2a', ox, 1, 2, 1); else R(ctx, '#2a2a2a', ox + 2, 1, 1, 1); break;
      case 'shotgun':
        R(ctx, '#7a4a26', ox - 4, -1, 4, 2); R(ctx, '#33363a', ox, -1, 8, 1); R(ctx, '#45484e', ox, 0, 8, 1); R(ctx, '#6b4423', ox + 1, 0, 2, 1); break;
    }
  },

  hat(ctx, x, y, p, s) {
    const R = this.R.bind(this), t = p.hatType;
    if (t === 'cowboy') {
      R(ctx, p.hat, x - 4, y - 14, 9, 1); R(ctx, p.hat, x - 2, y - 17, 5, 3);
      R(ctx, 'rgba(0,0,0,.25)', x - 4, y - 13, 9, 1);
      R(ctx, p.band || '#222', x - 2, y - 15, 5, 1);
      R(ctx, 'rgba(255,255,255,.12)', x - 2, y - 17, 5, 1);
    } else if (t === 'bowler') {
      R(ctx, p.hat, x - 3, y - 14, 7, 1); R(ctx, p.hat, x - 2, y - 17, 5, 3); R(ctx, 'rgba(255,255,255,.15)', x - 1, y - 17, 2, 1);
    } else if (t === 'sombrero') {
      R(ctx, p.hat, x - 6, y - 14, 13, 2); R(ctx, p.hat, x - 2, y - 18, 5, 4); R(ctx, p.band || '#a03020', x - 2, y - 15, 5, 1);
    } else if (t === 'bonnet') {
      R(ctx, p.hat, x - 3, y - 16, 7, 4); R(ctx, p.hat, x - 3 + (s > 0 ? 3 : -1), y - 14, 4, 3);
    } else {
      R(ctx, p.hair || '#2a1a10', x - 2, y - 15, 5, 2);
    }
  },

  /* Characters. o: {face, moving, animT, pal, weapon, drawn, recoil, reload, swing, state, mounted, hidden, flash, hurt} */
  human(ctx, x, y, o) {
    x = Math.round(x); y = Math.round(y);
    const R = this.R.bind(this), p = o.pal, face = o.face || 0;
    const s = Math.cos(face) < 0 ? -1 : 1;
    if (o.state === 'dead') return this.corpse(ctx, x, y, p, s, o);
    if (!o.mounted) this.shadow(ctx, x, y, 5, 2);
    const walk = o.moving ? Math.sin(o.animT * 13) : 0;
    const clock = typeof Game !== 'undefined' && Game.t ? Game.t : performance.now() / 1000;
    const bob = o.moving ? (Math.abs(walk) > 0.7 ? -1 : 0) : (!o.mounted && o.state !== 'kneel' && Math.sin(clock * 2.3 + x * 0.37) > 0.8 ? -1 : 0);
    if (o.hurt > 0.12) x -= s;
    const up = Math.sin(face) < -0.55;
    if (o.state === 'kneel') y += 3;
    const drawArmGun = () => {
      if (!o.weapon || !o.drawn) return;
      ctx.save();
      ctx.translate(x + s, y - 8 + bob);
      let a = face;
      if (o.reload > 0) a = (s > 0 ? -1 : -Math.PI + 1) + Math.sin(o.reload * 10) * 0.15;
      if (o.swing > 0) a = face + (o.swing - 0.5) * 2.4 * s;
      ctx.rotate(a);
      const rc = o.recoil > 0 ? -Math.round(o.recoil * 2) : 0;
      const flip = Math.cos(a) < 0;
      if (flip) ctx.scale(1, -1);
      R(ctx, p.coat || p.shirt, rc, -1, 3, 2); R(ctx, p.skin, rc + 3, -1, 2, 2);
      this.weaponShape(ctx, o.weapon, rc + 4);
      ctx.restore();
    };
    if (up) drawArmGun();
    // legs / skirt
    if (!o.mounted) {
      if (p.dress) {
        R(ctx, p.dress, x - 3, y - 6, 7, 5); R(ctx, p.dress, x - 4, y - 3, 9, 2);
        if (p.apron) R(ctx, p.apron, x - 2, y - 6, 4, 4);
        R(ctx, '#1a1410', x - 2 + (walk > 0 ? 1 : 0), y - 1, 2, 1); R(ctx, '#1a1410', x + 1 - (walk > 0 ? 1 : 0), y - 1, 2, 1);
      } else {
        const l = walk > 0 ? 1 : 0, r = walk < 0 ? 1 : 0;
        R(ctx, p.pants, x - 2 - l * s, y - 5 - l, 2, 4 + l); R(ctx, p.pants, x + 1 + r * s, y - 5 - r, 2, 4 + r);
        if (p.chaps) { R(ctx, p.chaps, x - 3 - l * s, y - 5 - l, 1, 3); R(ctx, p.chaps, x + 3 + r * s, y - 5 - r, 1, 3); }
        if (p.dirt) { R(ctx, 'rgba(90,70,40,.45)', x - 2 - l * s, y - 3 - l, 2, 1); R(ctx, 'rgba(90,70,40,.45)', x + 1 + r * s, y - 3 - r, 2, 1); }
        R(ctx, p.boots, x - 2 - l * s, y - 2 - l, 2, 2); R(ctx, p.boots, x + 1 + r * s, y - 2 - r, 2, 2);
      }
    } else {
      R(ctx, p.pants || '#333', x - 1 - s, y - 5, 2, 3); R(ctx, p.boots || '#111', x - 1 - s, y - 3, 2, 2);
    }
    const ty = y - 11 + bob;
    // torso
    if (p.build === 'wide' && !p.dress) R(ctx, p.coat || p.shirt, x - 4, ty, 9, 3);
    if (p.coat) { R(ctx, p.coat, x - 3, ty, 7, 7); R(ctx, p.shirt, x - 1, ty, 2, 4); if (p.vest) R(ctx, p.vest, x - 1 + (s > 0 ? 1 : 0), ty + 1, 1, 3); }
    else {
      R(ctx, p.shirt, x - 3, ty, 7, 6);
      if (p.stripes) { R(ctx, 'rgba(30,40,80,.5)', x - 3, ty + 1, 7, 1); R(ctx, 'rgba(30,40,80,.5)', x - 3, ty + 3, 7, 1); }
      if (p.shawl) { R(ctx, p.shawl, x - 3, ty, 7, 2); R(ctx, p.shawl, x - 3, ty + 2, 1, 2); }
      if (p.tape) R(ctx, '#d8c050', x - 3 + (s > 0 ? 5 : 1), ty, 1, 4);
      if (p.vest) { R(ctx, p.vest, x - 3, ty + 1, 2, 5); R(ctx, p.vest, x + 2, ty + 1, 2, 5); }
      if (p.poncho) { R(ctx, p.poncho, x - 4, ty + 1, 9, 4); R(ctx, '#e8d8b0', x - 4, ty + 3, 9, 1); }
    }
    if (!p.dress) R(ctx, '#3a2414', x - 3, ty + 5, 7, 1); // belt
    if (p.badge) { R(ctx, '#e8c050', x + (s > 0 ? 1 : -2), ty + 2, 2, 2); R(ctx, '#fff2b0', x + (s > 0 ? 1 : -2), ty + 2, 1, 1); }
    if (o.holster && !o.drawn && !p.dress) { R(ctx, '#4a2c16', x + (s > 0 ? 3 : -4), ty + 5, 2, 3); R(ctx, '#6b4423', x + (s > 0 ? 3 : -4), ty + 4, 1, 2); }
    if (o.longgun && !p.dress) { ctx.save(); ctx.translate(x - s * 2, ty + 3); ctx.rotate(-0.9 * s); R(ctx, '#3a2a1a', -6, 0, 12, 1); ctx.restore(); }
    if (p.bandana) R(ctx, p.bandana, x - 2, ty - 1, 5, 2);
    // head
    R(ctx, p.skin, x - 2, ty - 4, 5, 4);
    if (!up) {
      const front = Math.sin(face) > 0.6;
      if (p.hair && p.hatType !== 'none' && p.hatType !== 'bonnet') R(ctx, p.hair, front ? x - 2 : x + (s > 0 ? -2 : 2), ty - 3, 1, 2);
      if (p.hair && p.hatType === 'none') R(ctx, p.hair, x - 2, ty - 4, 5, 1);
      if (front) { R(ctx, '#2a1a10', x - 1, ty - 3, 1, 1); R(ctx, '#2a1a10', x + 1, ty - 3, 1, 1); }
      else R(ctx, '#2a1a10', x + (s > 0 ? 1 : -1), ty - 3, 1, 1);
      if (p.beard) { R(ctx, p.beard, x - 2, ty - 1, 5, 1); R(ctx, p.beard, front ? x - 1 : x + (s > 0 ? 0 : -2), ty - 2, front ? 3 : 3, 1); }
      else if (p.mustache) R(ctx, p.mustache, front ? x - 1 : x + (s > 0 ? 0 : -2), ty - 2, 3, 1);
      if (o.masked) R(ctx, p.bandana || '#222', x - 2, ty - 2, 5, 2);
    }
    else R(ctx, p.hair || '#3a2414', x - 2, ty - 4, 5, 3);
    this.hat(ctx, x, ty + 11, p, s);
    // arms
    if (o.state === 'handsup') {
      R(ctx, p.shirt, x - 4, ty - 5, 1, 5); R(ctx, p.shirt, x + 4, ty - 5, 1, 5); R(ctx, p.skin, x - 4, ty - 7, 1, 2); R(ctx, p.skin, x + 4, ty - 7, 1, 2);
    } else if (!(o.weapon && o.drawn)) {
      const sw = Math.round(walk * 1.5);
      R(ctx, p.coat || p.shirt, x - 4, ty + 1 + sw, 1, 4); R(ctx, p.coat || p.shirt, x + 4, ty + 1 - sw, 1, 4);
      R(ctx, p.skin, x - 4, ty + 5 + sw, 1, 1); R(ctx, p.skin, x + 4, ty + 5 - sw, 1, 1);
    } else {
      R(ctx, p.coat || p.shirt, x - s * 4, ty + 1, 1, 4); R(ctx, p.skin, x - s * 4, ty + 5, 1, 1);
    }
    if (!up) drawArmGun();
    if (o.hurt > 0) { ctx.globalAlpha = Math.min(1, o.hurt * 4) * 0.6; R(ctx, '#ff2020', x - 3, ty - 4, 7, 14); ctx.globalAlpha = 1; }
  },

  corpse(ctx, x, y, p, s, o) {
    const R = this.R.bind(this);
    ctx.fillStyle = 'rgba(110,10,10,0.55)';
    ctx.beginPath(); ctx.ellipse(x + 1, y - 1, 7 + Math.min(4, (o.deadT || 0) * 2), 3, 0, 0, TAU); ctx.fill();
    R(ctx, p.pants || p.dress || '#333', x - 7 * s - (s < 0 ? 3 : 0), y - 3, 4, 3);
    R(ctx, p.coat || p.shirt, x - 3, y - 4, 7, 4);
    R(ctx, p.skin, x + 4 * s - (s < 0 ? 3 : 0), y - 4, 4, 3);
    if (p.hatType !== 'none' && p.hat) R(ctx, p.hat, x + 9 * s - 3, y - 2, 6, 2);
  },

  /* side-view horse; o: {face, animT, speed (0..1), coat, mane, saddle, pinto, dead, rearing, hurt} */
  horse(ctx, x, y, o) {
    x = Math.round(x); y = Math.round(y);
    const R = this.R.bind(this), s = Math.cos(o.face || 0) < 0 ? -1 : 1, c = o.coat, dark = o.mane || '#2a1a10';
    if (o.dead) {
      ctx.fillStyle = 'rgba(110,10,10,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, 13, 4, 0, 0, TAU); ctx.fill();
      ctx.save(); ctx.translate(x, y); ctx.scale(s, 1);
      R(ctx, c, -10, -6, 18, 6); R(ctx, c, 7, -5, 6, 3); R(ctx, dark, -12, -4, 3, 2);
      R(ctx, c, -6, -1, 6, 2); R(ctx, c, 2, -1, 6, 2);
      ctx.restore(); return;
    }
    this.shadow(ctx, x, y, 12, 3);
    ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.big ? 1.15 : 1), o.big ? 1.15 : 1);
    const sp = o.speed || 0, ph = o.animT * (6 + sp * 10);
    const legs = [[-8, 0], [-5, 1.6], [5, 3.1], [8, 4.7]];
    for (const [lx, off] of legs) {
      const sw = sp > 0.02 ? Math.sin(ph + off) * (1 + sp * 2.5) : 0;
      const lift = sp > 0.02 ? Math.max(0, Math.cos(ph + off)) * (1 + sp * 2) : 0;
      R(ctx, lx < 0 ? this.shade(c, -20) : c, Math.round(lx + sw), -7, 2, 7 - Math.round(lift));
      if (o.socks) R(ctx, '#efe8dc', Math.round(lx + sw), -3 - Math.round(lift), 2, 2);
      R(ctx, '#1a1410', Math.round(lx + sw), -1 - Math.round(lift), 2, 1);
    }
    const bob = sp > 0.3 ? Math.round(Math.sin(ph * 2) * 0.8) : 0;
    // tail
    const tw = Math.sin(o.animT * 3) * 1.5 + sp * 3;
    R(ctx, dark, -12, -12 + bob, 2, 2); R(ctx, dark, -13 - Math.round(tw * 0.5), -10 + bob, 2, 5);
    // body
    R(ctx, c, -10, -13 + bob, 19, 7); R(ctx, this.shade(c, -25), -9, -7 + bob, 17, 1); R(ctx, this.shade(c, 18), -9, -13 + bob, 17, 1);
    if (o.pinto) { R(ctx, '#efe6d8', -6, -12 + bob, 5, 4); R(ctx, '#efe6d8', 2, -10 + bob, 4, 3); }
    if (o.pattern === 'blanket') { R(ctx, '#f0e8dc', -10, -13 + bob, 8, 6); for (const [px, py] of [[-9, -12], [-6, -10], [-4, -12], [-8, -9], [-3, -9]]) R(ctx, '#3a2a1a', px, py + bob, 1, 1); }
    if (o.pattern === 'dapple') for (const [px, py] of [[-8, -11], [-5, -12], [-2, -10], [1, -12], [4, -11], [-6, -9], [2, -9]]) R(ctx, this.shade(c, 22), px, py + bob, 2, 1);
    if (o.pattern === 'roan') for (let px = -9; px < 8; px += 2) R(ctx, this.shade(c, 35), px, -12 + bob + (px & 2 ? 2 : 0), 1, 1);
    // neck & head
    const hb = sp > 0.3 ? Math.round(Math.sin(ph * 2 + 1)) : Math.round(Math.sin(o.animT * 0.8) * 0.5);
    R(ctx, c, 6, -17 + bob, 4, 6); R(ctx, c, 8, -20 + bob + hb, 4, 4); R(ctx, c, 11, -19 + bob + hb, 4, 3);
    R(ctx, this.shade(c, -30), 14, -18 + bob + hb, 2, 2); R(ctx, '#111', 10, -19 + bob + hb, 1, 1);
    R(ctx, c, 8, -21 + bob + hb, 1, 1); R(ctx, dark, 5, -18 + bob, 2, 6); R(ctx, dark, 6, -20 + bob + hb, 2, 2);
    if (o.pattern === 'blaze') R(ctx, '#f0e8dc', 12, -19 + bob + hb, 2, 1);
    if (o.mule) { R(ctx, this.shade(c, -20), 8, -24 + bob + hb, 1, 4); R(ctx, this.shade(c, -20), 10, -24 + bob + hb, 1, 4); }
    if (o.saddle) {
      R(ctx, '#8a2a20', -4, -13 + bob, 7, 3); R(ctx, '#5a3418', -3, -14 + bob, 5, 2); R(ctx, '#3a2010', 1, -16 + bob, 1, 2);
      R(ctx, '#5a3418', -6, -12 + bob, 2, 4);
    }
    ctx.restore();
    if (o.hurt > 0) { ctx.globalAlpha = Math.min(1, o.hurt * 4) * 0.5; this.R(ctx, '#ff2020', x - 10, y - 20, 20, 14); ctx.globalAlpha = 1; }
  },

  shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const r = clamp((n >> 16) + amt, 0, 255), g = clamp(((n >> 8) & 255) + amt, 0, 255), b = clamp((n & 255) + amt, 0, 255);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  },

  /* elk, bear, cougar and cattle share one quadruped body with different proportions */
  bigAnimal(ctx, a, x, y, s) {
    const R = this.R.bind(this);
    if (a.v === undefined) a.v = Math.random();
    const K = {
      elk: { col: '#7a5432', len: 15, lh: 7, bh: 5 }, bear: { col: '#4a3222', len: 15, lh: 4, bh: 8 },
      cougar: { col: '#b88a58', len: 15, lh: 4, bh: 4 }, cow: { col: a.v > 0.5 ? '#6a3a22' : '#e8e2d8', len: 14, lh: 5, bh: 6 }
    }[a.kind];
    const { col, len, lh, bh } = K;
    if (a.dead) {
      ctx.fillStyle = 'rgba(110,10,10,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, len / 2 + 2, 2.5, 0, 0, TAU); ctx.fill();
      R(ctx, col, x - len / 2, y - bh, len, bh); R(ctx, col, x + (s > 0 ? len / 2 : -len / 2 - 4), y - 4, 4, 3); return;
    }
    this.shadow(ctx, x, y, len / 2 + 1, 2.4);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, 1);
    const h0 = -lh - bh, l = -Math.floor(len / 2);
    for (const [lx, off] of [[l + 1, 0], [l + 3, 1], [l + len - 4, 2], [l + len - 2, 3]]) R(ctx, this.shade(col, -25), lx + Math.round(a.moving ? Math.sin(a.animT * 14 + off) * 1.5 : 0), -lh, 2, lh);
    R(ctx, col, l, h0, len, bh); R(ctx, this.shade(col, 22), l + 1, h0, len - 2, 1);
    switch (a.kind) {
      case 'elk':
        R(ctx, this.shade(col, -30), l + len - 4, h0 - 1, 4, bh + 1);                 // dark neck mane
        R(ctx, col, l + len - 2, h0 - 6, 3, 6); R(ctx, col, l + len - 1, h0 - 7, 5, 3); R(ctx, '#111', l + len + 2, h0 - 6, 1, 1);
        R(ctx, '#e8d8b8', l - 1, h0 + 1, 2, 3);
        R(ctx, '#d8c8a0', l + len - 2, h0 - 13, 1, 6); R(ctx, '#d8c8a0', l + len + 1, h0 - 13, 1, 6); R(ctx, '#d8c8a0', l + len - 4, h0 - 12, 3, 1); R(ctx, '#d8c8a0', l + len + 1, h0 - 11, 3, 1);
        break;
      case 'bear':
        R(ctx, col, l + 3, h0 - 2, 6, 3);                                                  // shoulder hump
        R(ctx, col, l + len - 2, h0 + 1, 5, 5); R(ctx, '#8a6a4a', l + len + 2, h0 + 3, 2, 2); R(ctx, '#111', l + len + 1, h0 + 2, 1, 1);
        R(ctx, col, l + len - 1, h0, 1, 1); R(ctx, col, l + len + 1, h0, 1, 1);
        if (a.state === 'hunt') R(ctx, '#e8e0d0', l + len + 2, h0 + 5, 2, 1);
        break;
      case 'cougar':
        R(ctx, col, l + len - 1, h0 - 2, 4, 4); R(ctx, '#e8d8c0', l + len + 1, h0, 2, 2); R(ctx, '#111', l + len + 1, h0 - 1, 1, 1); R(ctx, col, l + len - 1, h0 - 3, 1, 1);
        R(ctx, col, l - 5, h0 + 1, 5, 1); R(ctx, this.shade(col, -40), l - 7, h0, 2, 1);   // long tail
        break;
      case 'cow':
        if (a.v <= 0.5) { R(ctx, '#2a2420', l + 3, h0 + 1, 4, 3); R(ctx, '#2a2420', l + 9, h0 + 2, 3, 3); }
        R(ctx, a.v > 0.5 ? '#e8e2d8' : col, l + len - 1, h0 - 1, 4, 5); R(ctx, '#d8a090', l + len + 2, h0 + 2, 2, 2); R(ctx, '#111', l + len + 1, h0, 1, 1);
        R(ctx, '#e8e0c8', l + len - 2, h0 - 3, 1, 2); R(ctx, '#e8e0c8', l + len + 2, h0 - 3, 1, 2);
        R(ctx, col, l - 1, h0 + 1, 1, 4);
        break;
    }
    ctx.restore();
  },

  animal(ctx, a) {
    const x = Math.round(a.x), y = Math.round(a.y), R = this.R.bind(this), s = Math.cos(a.face) < 0 ? -1 : 1;
    const sp = a.moving ? Math.sin(a.animT * 18) : 0;
    if (a.kind === 'rabbit') {
      if (a.dead) { R(ctx, '#7a6a5a', x - 3, y - 2, 6, 2); return; }
      this.shadow(ctx, x, y, 3, 1);
      ctx.save(); ctx.translate(x, y - (a.moving ? Math.abs(sp) * 2 : 0)); ctx.scale(s, 1);
      R(ctx, '#8a7a68', -3, -4, 6, 3); R(ctx, '#8a7a68', 2, -6, 2, 3); R(ctx, '#6a5a48', 2, -8, 1, 3); R(ctx, '#fff', -4, -4, 1, 1);
      ctx.restore(); return;
    }
    if (a.kind !== 'deer' && a.kind !== 'coyote') return this.bigAnimal(ctx, a, x, y, s);
    const deer = a.kind === 'deer', col = deer ? '#8a5a34' : '#a08a62', len = deer ? 12 : 10;
    if (a.dead) {
      ctx.fillStyle = 'rgba(110,10,10,0.5)'; ctx.beginPath(); ctx.ellipse(x, y, 7, 2, 0, 0, TAU); ctx.fill();
      R(ctx, col, x - len / 2, y - 4, len, 4); R(ctx, col, x + (s > 0 ? len / 2 : -len / 2 - 3), y - 3, 3, 2); return;
    }
    this.shadow(ctx, x, y, 7, 2);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, 1);
    const lh = deer ? 6 : 4;
    for (const [lx, off] of [[-5, 0], [-3, 1], [3, 2], [5, 3]]) R(ctx, this.shade(col, -20), lx + Math.round(a.moving ? Math.sin(a.animT * 16 + off) * 1.5 : 0), -lh, 1, lh);
    R(ctx, col, -6, -lh - 4, len, 4); R(ctx, this.shade(col, 25), -5, -lh - 1, len - 2, 1);
    if (deer) {
      R(ctx, col, 4, -lh - 8, 2, 5); R(ctx, col, 5, -lh - 9, 4, 3); R(ctx, '#111', 8, -lh - 8, 1, 1); R(ctx, '#f0e8d8', -7, -lh - 4, 2, 2);
      if (a.buck) { R(ctx, '#d8c8a0', 4, -lh - 13, 1, 4); R(ctx, '#d8c8a0', 6, -lh - 13, 1, 4); R(ctx, '#d8c8a0', 3, -lh - 13, 2, 1); R(ctx, '#d8c8a0', 6, -lh - 13, 2, 1); }
    } else {
      R(ctx, col, 3, -lh - 7, 4, 4); R(ctx, col, 6, -lh - 5, 3, 2); R(ctx, '#111', 8, -lh - 5, 1, 1); R(ctx, col, 3, -lh - 9, 1, 2); R(ctx, col, 5, -lh - 9, 1, 2);
      R(ctx, this.shade(col, -30), -9, -lh - 4, 3, 2);
    }
    ctx.restore();
  },

  /* ---------------- train ---------------- */
  trainCar(ctx, kind, x, y, anim, night, robbed) {
    const R = this.R.bind(this);
    x = Math.round(x); y = Math.round(y);
    const wheel = (wx, r) => {
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(wx, y - r, r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#6a6a6a'; ctx.fillRect(wx + Math.cos(anim) * (r - 1) - 0.5, y - r + Math.sin(anim) * (r - 1) - 0.5, 1, 1);
    };
    this.shadow(ctx, x + (kind === 'loco' ? 22 : 18), y + 1, kind === 'loco' ? 24 : 20, 3, 0.35);
    if (kind === 'loco') {
      R(ctx, '#1e1e22', x + 12, y - 19, 26, 11); R(ctx, '#34343a', x + 12, y - 19, 26, 2);
      R(ctx, '#b08a3a', x + 20, y - 19, 1, 11); R(ctx, '#b08a3a', x + 30, y - 19, 1, 11);
      R(ctx, '#2a2a2e', x + 31, y - 27, 5, 8); R(ctx, '#2a2a2e', x + 30, y - 29, 7, 2);
      R(ctx, '#b08a3a', x + 24, y - 22, 3, 3); R(ctx, '#e8d070', x + 37, y - 18, 3, 3);
      R(ctx, '#7a1e18', x, y - 25, 13, 17); R(ctx, '#5a1410', x - 1, y - 27, 15, 2); R(ctx, night ? '#ffd27a' : '#9ab8c8', x + 3, y - 22, 6, 5);
      ctx.fillStyle = '#3a3a3a'; ctx.beginPath(); ctx.moveTo(x + 38, y - 8); ctx.lineTo(x + 44, y - 1); ctx.lineTo(x + 38, y - 1); ctx.fill();
      wheel(x + 16, 5); wheel(x + 27, 5); wheel(x + 6, 3); wheel(x + 36, 3);
      R(ctx, '#8a8a8a', x + 16 + Math.cos(anim) * 3, y - 6 + Math.sin(anim) * 3, 12, 1);
    } else if (kind === 'tender') {
      R(ctx, '#2a2a2e', x + 1, y - 16, 22, 10); R(ctx, '#111', x + 2, y - 18, 20, 3); R(ctx, '#3a3a40', x + 1, y - 16, 22, 1);
      wheel(x + 6, 3); wheel(x + 18, 3);
    } else {
      const body = kind === 'express' ? '#4a1e18' : kind === 'caboose' ? '#9a2a1e' : '#2e4a3a';
      const L = kind === 'caboose' ? 26 : 38;
      R(ctx, body, x + 1, y - 22, L, 16); R(ctx, '#2a1a12', x - 1, y - 24, L + 4, 2); R(ctx, this.shade(body, 25), x + 1, y - 22, L, 1);
      if (kind === 'passenger') for (let i = 0; i < 6; i++) R(ctx, night ? '#ffd27a' : '#a8c0c8', x + 4 + i * 6, y - 19, 4, 5);
      if (kind === 'express') {
        R(ctx, '#c8a040', x + 1, y - 12, L, 1); this.pixelText(ctx, 'EXPRESS', x + 6, y - 19, robbed ? '#6a5a3a' : '#e0c060');
        R(ctx, robbed ? '#111' : '#2a120e', x + 16, y - 20, 7, 13);
      }
      if (kind === 'caboose') { R(ctx, body, x + 8, y - 29, 10, 5); R(ctx, '#2a1a12', x + 7, y - 30, 12, 1); R(ctx, night ? '#ffd27a' : '#a8c0c8', x + 10, y - 28, 6, 2); R(ctx, '#ffd27a', x + 4, y - 18, 4, 4); }
      wheel(x + 7, 3); wheel(x + L - 6, 3);
    }
  },

  /* stagecoach, side view, x/y = coach centre on the ground */
  coach(ctx, c, night) {
    const x = Math.round(c.x), y = Math.round(c.y), s = Math.cos(c.face) < 0 ? -1 : 1, R = this.R.bind(this);
    this.shadow(ctx, x + s * 10, y + 1, 26, 4, 0.3);
    ctx.save(); ctx.translate(x, y); ctx.scale(s, 1);
    const moving = c.speed > 5;
    if (c.horsesAlive) {
      this.horse(ctx, 26, 2, { face: 0, animT: c.animT, speed: moving ? 0.6 : 0, coat: '#4a2c18', mane: '#1a1008' });
      this.horse(ctx, 22, -2, { face: 0, animT: c.animT + 0.4, speed: moving ? 0.6 : 0, coat: '#6a3e20', mane: '#1a1008' });
    } else {
      this.horse(ctx, 24, 0, { face: 0, dead: true, coat: '#4a2c18', mane: '#1a1008' });
    }
    R(ctx, '#3a2414', 8, -8, 10, 1);
    R(ctx, '#5a1a14', -12, -22, 22, 15); R(ctx, '#3a100c', -13, -24, 24, 2); R(ctx, '#c8a040', -12, -10, 22, 1);
    R(ctx, night ? '#ffd27a' : '#9ab0b8', -8, -19, 6, 5); R(ctx, '#2a0e0a', 1, -20, 5, 10);
    R(ctx, '#3a2414', -11, -27, 18, 3); if (!c.looted) { R(ctx, '#7a5228', -6, -30, 7, 3); R(ctx, '#c8a040', -3, -30, 1, 3); }
    R(ctx, '#3a2414', 8, -20, 4, 2);
    const wheel = (wx, r) => {
      ctx.strokeStyle = '#d8b050'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(wx, -r, r, 0, TAU); ctx.stroke();
      const a = c.animT * (moving ? 8 : 0);
      ctx.beginPath(); ctx.moveTo(wx + Math.cos(a) * r, -r + Math.sin(a) * r); ctx.lineTo(wx - Math.cos(a) * r, -r - Math.sin(a) * r);
      ctx.moveTo(wx + Math.cos(a + 1.57) * r, -r + Math.sin(a + 1.57) * r); ctx.lineTo(wx - Math.cos(a + 1.57) * r, -r - Math.sin(a + 1.57) * r); ctx.stroke();
    };
    wheel(-8, 5); wheel(6, 4);
    ctx.restore();
    if (c.driverOn) this.human(ctx, x + s * 9, y - 14, { face: c.face, pal: CIV_PALS[1], mounted: true });
    if (c.guardOn) this.human(ctx, x + s * 4, y - 15, { face: c.face, pal: PAL.guard, mounted: true, longgun: true });
  },

  /* ---------------- props ---------------- */
  flatProp(g, p) {
    const R = this.R.bind(this), x = p.tx * TS, y = p.ty * TS, h = hash2(p.tx, p.ty);
    switch (p.t) {
      case 'stones': for (let i = 0; i < 4; i++) { const a = hash2(p.tx * 7 + i, p.ty); R(g, i % 2 ? '#8a8078' : '#6e665e', x + 2 + (a * 11) | 0, y + 3 + (hash2(i, p.tx) * 10) | 0, 2 + (a > 0.5), 2); } break;
      case 'tuft': for (let i = 0; i < 5; i++) { const ox = x + 4 + ((h * 50 + i * 3) % 8) | 0, oy = y + 6 + (i % 3) * 2; R(g, i % 2 ? '#7a8a3a' : '#5a6a2a', ox, oy - 3, 1, 3); R(g, '#9aa04a', ox + 1, oy - 2, 1, 2); } break;
      case 'flowers': for (let i = 0; i < 4; i++) R(g, ['#e8d040', '#d86a8a', '#e8e8f0', '#b070d0'][(h * 4 + i) % 4 | 0], x + 3 + ((h * 30 + i * 4) % 10 | 0), y + 4 + (i * 3) % 9, 1, 1); break;
      case 'bones': R(g, '#e8e0d0', x + 3, y + 7, 8, 1); R(g, '#e8e0d0', x + 4, y + 5, 1, 5); R(g, '#e8e0d0', x + 7, y + 5, 1, 5); R(g, '#d8d0c0', x + 11, y + 6, 3, 3); break;
      case 'xmark':
        for (let i = 0; i < 6; i++) { R(g, '#7a4a3a', x + 3 + i * 2, y + 3 + i * 2, 2, 2); R(g, '#7a4a3a', x + 13 - i * 2, y + 3 + i * 2, 2, 2); }
        break;
      case 'crops': for (let i = 0; i < 4; i++) { R(g, '#5a4a2a', x, y + i * 4 + 2, 16, 1); R(g, '#6a8a2a', x + (i * 5) % 16, y + i * 4, 2, 2); R(g, '#8aa03a', x + (i * 5 + 8) % 16, y + i * 4, 2, 2); } break;
      case 'ashes': g.fillStyle = 'rgba(30,25,20,.6)'; g.beginPath(); g.ellipse(x + 8, y + 8, 9, 5, 0, 0, TAU); g.fill(); R(g, '#555', x + 6, y + 7, 3, 1); break;
      case 'snowdrift': g.fillStyle = 'rgba(255,255,255,.55)'; g.beginPath(); g.ellipse(x + 8, y + 9, 7 + h * 4, 3, 0, 0, TAU); g.fill(); g.fillStyle = 'rgba(190,210,225,.5)'; g.fillRect(x + 4, y + 11, 9, 1); break;
    }
  },

  prop(ctx, p, time, night) {
    const R = this.R.bind(this), x = Math.round(p.x), y = Math.round(p.y), v = p.v || 0.5;
    switch (p.t) {
      case 'pine': {
        const sc = 0.85 + v * 0.4, hgt = Math.round(26 * sc), w = Math.round(9 * sc);
        this.shadow(ctx, x + 2, y - 1, w + 2, 3, 0.3);
        R(ctx, '#4a3020', x - 1, y - 5, 3, 5);
        const tiers = 3;
        for (let i = 0; i < tiers; i++) {
          const ty = y - 4 - i * Math.round(hgt / 4), tw = w - i * 2;
          ctx.fillStyle = i % 2 ? '#2e4a2a' : '#26402a';
          ctx.beginPath(); ctx.moveTo(x - tw, ty); ctx.lineTo(x + tw + 1, ty); ctx.lineTo(x + 0.5, ty - Math.round(hgt / 2.4)); ctx.fill();
          R(ctx, '#3a5a34', x - tw + 2, ty - 2, Math.max(1, tw - 2), 1);
        }
        break;
      }
      case 'oak': {
        this.shadow(ctx, x + 2, y - 1, 11, 4, 0.3);
        R(ctx, '#5a3a22', x - 1, y - 9, 3, 9);
        const blobs = [[0, -16, 8], [-5, -12, 6], [5, -12, 6], [0, -10, 6]];
        for (const [bx, by, br] of blobs) { ctx.fillStyle = '#3e5a2a'; ctx.beginPath(); ctx.arc(x + bx, y + by, br, 0, TAU); ctx.fill(); }
        ctx.fillStyle = '#56763a'; ctx.beginPath(); ctx.arc(x - 2, y - 18, 4, 0, TAU); ctx.fill();
        break;
      }
      case 'deadtree': {
        this.shadow(ctx, x + 1, y - 1, 5, 2, 0.25);
        ctx.strokeStyle = '#6a5440'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 16); ctx.stroke();
        ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 10); ctx.lineTo(x - 6, y - 16); ctx.moveTo(x, y - 13); ctx.lineTo(x + 5, y - 19); ctx.moveTo(x - 3, y - 13); ctx.lineTo(x - 4, y - 20); ctx.stroke();
        break;
      }
      case 'cactus': {
        this.shadow(ctx, x + 1, y - 1, 5, 2, 0.25);
        const hgt = 14 + Math.round(v * 8);
        R(ctx, '#3e7a3a', x - 2, y - hgt, 4, hgt); R(ctx, '#5a9a4a', x - 1, y - hgt, 1, hgt - 1); R(ctx, '#2e5a2a', x + 1, y - hgt + 1, 1, hgt - 1);
        R(ctx, '#3e7a3a', x - 6, y - hgt + 6, 3, 2); R(ctx, '#3e7a3a', x - 6, y - hgt + 1, 2, 6);
        if (v > 0.4) { R(ctx, '#3e7a3a', x + 2, y - hgt + 9, 3, 2); R(ctx, '#3e7a3a', x + 4, y - hgt + 4, 2, 7); }
        if (v > 0.8) R(ctx, '#e86a8a', x - 1, y - hgt - 1, 2, 1);
        break;
      }
      case 'cactus_s': this.shadow(ctx, x, y - 1, 4, 1.5, 0.25); R(ctx, '#4a8a3a', x - 3, y - 6, 4, 5); R(ctx, '#4a8a3a', x, y - 9, 4, 5); R(ctx, '#6aa04a', x + 1, y - 8, 1, 2); R(ctx, '#d8c040', x + 2, y - 10, 1, 1); break;
      case 'boulder':
        this.shadow(ctx, x + 2, y - 2, 15, 4, 0.3);
        ctx.fillStyle = '#7a6a5e'; ctx.beginPath(); ctx.ellipse(x, y - 8, 14, 9, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#928276'; ctx.beginPath(); ctx.ellipse(x - 3, y - 11, 9, 5, 0, 0, TAU); ctx.fill();
        R(ctx, '#5a4e46', x + 2, y - 5, 8, 1); break;
      case 'rock':
        this.shadow(ctx, x + 1, y - 1, 6, 2, 0.3);
        ctx.fillStyle = '#7e7064'; ctx.beginPath(); ctx.ellipse(x, y - 4, 6, 4, 0, 0, TAU); ctx.fill(); R(ctx, '#9a8c80', x - 3, y - 7, 4, 1); break;
      case 'bush': {
        const c1 = p.ty * TS > 140 * TS || p.tx > 140 ? '#6a6a3a' : '#3a5a2e';
        this.shadow(ctx, x, y - 1, 8, 2, 0.25);
        ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(x - 3, y - 5, 5, 4, 0, 0, TAU); ctx.ellipse(x + 3, y - 5, 5, 4, 0, 0, TAU); ctx.ellipse(x, y - 8, 5, 4, 0, 0, TAU); ctx.fill();
        R(ctx, 'rgba(255,255,255,.12)', x - 3, y - 11, 4, 1); if (v > 0.7) { R(ctx, '#a02a3a', x - 2, y - 6, 1, 1); R(ctx, '#a02a3a', x + 3, y - 8, 1, 1); }
        break;
      }
      case 'barrel': this.shadow(ctx, x, y - 1, 5, 2); R(ctx, '#6a4426', x - 4, y - 11, 8, 10); R(ctx, '#3a2a1a', x - 4, y - 9, 8, 1); R(ctx, '#3a2a1a', x - 4, y - 4, 8, 1); R(ctx, '#8a5a32', x - 3, y - 12, 6, 1); break;
      case 'crate': this.shadow(ctx, x, y - 1, 6, 2); R(ctx, '#8a6a3a', x - 5, y - 10, 10, 9); R(ctx, '#5a4222', x - 5, y - 10, 10, 1); R(ctx, '#5a4222', x - 5, y - 2, 10, 1); R(ctx, '#6a5028', x - 4, y - 9, 1, 7); R(ctx, '#6a5028', x + 3, y - 9, 1, 7); R(ctx, '#6a5028', x - 4, y - 6, 8, 1); break;
      case 'lamp':
        this.shadow(ctx, x, y - 1, 3, 1); R(ctx, '#2a2420', x - 1, y - 22, 2, 22); R(ctx, '#2a2420', x - 3, y - 24, 6, 2);
        R(ctx, night ? '#ffe08a' : '#8a8a70', x - 2, y - 22, 4, 4); break;
      case 'well':
        this.shadow(ctx, x, y - 2, 11, 3); R(ctx, '#7a7068', x - 9, y - 9, 18, 8); R(ctx, '#2a3a4a', x - 7, y - 9, 14, 3); R(ctx, '#5a4a40', x - 9, y - 9, 18, 1);
        R(ctx, '#4a3020', x - 8, y - 22, 2, 14); R(ctx, '#4a3020', x + 6, y - 22, 2, 14); R(ctx, '#6a3a22', x - 11, y - 25, 22, 4); break;
      case 'watertower':
        this.shadow(ctx, x, y - 2, 16, 4); for (const lx of [-12, -4, 4, 11]) R(ctx, '#4a3420', x + lx, y - 22, 2, 22);
        R(ctx, '#4a3420', x - 12, y - 14, 25, 1); R(ctx, '#7a5432', x - 14, y - 42, 29, 20); for (let i = 0; i < 4; i++) R(ctx, '#3a2a1a', x - 14, y - 39 + i * 5, 29, 1);
        ctx.fillStyle = '#5a3a22'; ctx.beginPath(); ctx.moveTo(x - 16, y - 42); ctx.lineTo(x + 17, y - 42); ctx.lineTo(x, y - 50); ctx.fill(); break;
      case 'windmill': {
        this.shadow(ctx, x, y - 1, 6, 2); R(ctx, '#5a4a3a', x - 4, y - 30, 1, 30); R(ctx, '#5a4a3a', x + 3, y - 30, 1, 30); for (let i = 0; i < 5; i++) R(ctx, '#5a4a3a', x - 4, y - 6 - i * 6, 8, 1);
        const a = time * 2 + v * 6; ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) { const aa = a + i * TAU / 6; ctx.beginPath(); ctx.moveTo(x, y - 33); ctx.lineTo(x + Math.cos(aa) * 9, y - 33 + Math.sin(aa) * 9); ctx.stroke(); }
        R(ctx, '#7a3a2a', x + 2, y - 34, 7, 2); break;
      }
      case 'tent':
        this.shadow(ctx, x, y - 1, 15, 3);
        ctx.fillStyle = '#c8b898'; ctx.beginPath(); ctx.moveTo(x - 15, y); ctx.lineTo(x + 15, y); ctx.lineTo(x + 4, y - 16); ctx.lineTo(x - 4, y - 16); ctx.fill();
        ctx.fillStyle = '#a89878'; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x + 4, y); ctx.lineTo(x, y - 14); ctx.fill();
        R(ctx, '#3a2a1a', x - 1, y - 7, 2, 7); R(ctx, '#5a4a30', x - 5, y - 17, 10, 1); break;
      case 'campfire': {
        R(ctx, '#5a5048', x - 6, y - 3, 12, 3); R(ctx, '#4a2a14', x - 5, y - 4, 10, 2);
        for (let i = 0; i < 4; i++) {
          const fh = 5 + Math.sin(time * 14 + i * 2.1) * 2 + (p.small ? 0 : 3), fx = x - 3 + i * 2;
          R(ctx, '#e8641a', fx, y - 4 - fh, 2, fh); R(ctx, '#ffd04a', fx, y - 4 - fh * 0.6, 1, fh * 0.6);
        }
        break;
      }
      case 'wagon': case 'cagewagon': case 'burntwagon': {
        const burnt = p.t === 'burntwagon';
        this.shadow(ctx, x, y - 1, 22, 3);
        R(ctx, burnt ? '#2a2420' : '#6a4426', x - 20, y - 12, 40, 6); R(ctx, burnt ? '#1a1410' : '#4a2c16', x - 20, y - 7, 40, 1);
        if (p.t === 'wagon') { ctx.fillStyle = '#e0d8c4'; ctx.beginPath(); ctx.moveTo(x - 18, y - 12); ctx.quadraticCurveTo(x, y - 30, x + 18, y - 12); ctx.fill(); for (let i = -12; i <= 12; i += 8) R(ctx, '#c0b8a4', x + i, y - 24 + Math.abs(i) / 2, 1, 10 - Math.abs(i) / 3); }
        if (p.t === 'cagewagon') { R(ctx, '#3a2a1a', x - 18, y - 26, 36, 2); for (let i = -18; i <= 18; i += 4) R(ctx, '#2a2a2a', x + i, y - 26, 1, 14); }
        if (burnt) { R(ctx, '#111', x - 14, y - 20, 2, 8); R(ctx, '#111', x + 10, y - 18, 2, 6); }
        for (const wx of [-13, 13]) { ctx.strokeStyle = burnt ? '#222' : '#3a2414'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + wx, y - 5, 5, 0, TAU); ctx.stroke(); R(ctx, '#3a2414', x + wx, y - 5, 1, 1); }
        break;
      }
      case 'fence_h': R(ctx, '#6a4a2a', x - 7, y - 9, 1, 9); R(ctx, '#7a5a32', x - 8, y - 8, 16, 1); R(ctx, '#7a5a32', x - 8, y - 4, 16, 1); break;
      case 'fence_v': R(ctx, '#6a4a2a', x - 1, y - 16, 2, 16); R(ctx, '#7a5a32', x, y - 18, 1, 18); break;
      case 'hitch': R(ctx, '#5a3a20', x - 13, y - 8, 1, 8); R(ctx, '#5a3a20', x + 12, y - 8, 1, 8); R(ctx, '#7a5230', x - 14, y - 9, 28, 2); break;
      case 'sign': {
        R(ctx, '#5a3a20', x - 1, y - 14, 2, 14);
        const tw = this.textWidth(p.text || '') + 6;
        R(ctx, '#7a5230', x - tw / 2, y - 22, tw, 9); R(ctx, '#4a2c16', x - tw / 2, y - 14, tw, 1);
        this.pixelText(ctx, p.text || '', x - tw / 2 + 3, y - 20, '#f0e0b0'); break;
      }
      case 'grave': R(ctx, '#6a5a4a', x - 1, y - 11, 2, 11); R(ctx, '#6a5a4a', x - 4, y - 8, 8, 2); R(ctx, '#8a6a4a', x - 3, y - 1, 7, 2); break;
      case 'mine':
        R(ctx, '#0e0a08', x - 10, y - 18, 20, 18); R(ctx, '#5a3a1e', x - 12, y - 20, 24, 3); R(ctx, '#5a3a1e', x - 12, y - 18, 3, 18); R(ctx, '#5a3a1e', x + 9, y - 18, 3, 18);
        R(ctx, '#6a6a6a', x - 6, y - 1, 12, 1); break;
      case 'hay': this.shadow(ctx, x, y - 1, 7, 2); R(ctx, '#c8a850', x - 7, y - 10, 14, 9); R(ctx, '#a88838', x - 7, y - 6, 14, 1); R(ctx, '#e0c870', x - 6, y - 10, 12, 1); break;
      case 'trough': R(ctx, '#5a3a20', x - 12, y - 7, 24, 6); R(ctx, '#3a6a8a', x - 11, y - 7, 22, 2); break;
      case 'pole': R(ctx, '#5a4430', x - 1, y - 34, 2, 34); R(ctx, '#5a4430', x - 6, y - 32, 12, 1); R(ctx, '#ccc', x - 6, y - 33, 1, 1); R(ctx, '#ccc', x + 5, y - 33, 1, 1); break;
      case 'sandbags': for (let i = 0; i < 4; i++) R(ctx, '#b8a478', x - 15 + i * 8, y - 6, 7, 4); for (let i = 0; i < 3; i++) R(ctx, '#a8946a', x - 11 + i * 8, y - 9, 7, 3); break;
      case 'snowpine': {
        const sc = 0.85 + v * 0.45, hgt = Math.round(28 * sc), w = Math.round(9 * sc);
        this.shadow(ctx, x + 2, y - 1, w + 2, 3, 0.25);
        R(ctx, '#4a3020', x - 1, y - 5, 3, 5);
        for (let i = 0; i < 3; i++) {
          const ty = y - 4 - i * Math.round(hgt / 4), tw = w - i * 2;
          ctx.fillStyle = i % 2 ? '#2a4238' : '#22382f';
          ctx.beginPath(); ctx.moveTo(x - tw, ty); ctx.lineTo(x + tw + 1, ty); ctx.lineTo(x + 0.5, ty - Math.round(hgt / 2.4)); ctx.fill();
          R(ctx, '#eef3f6', x - tw + 1, ty - 2, tw * 2, 2); R(ctx, '#d4e0e8', x - tw + 3, ty - 4, Math.max(1, tw - 2), 1);
        }
        R(ctx, '#f4f8fa', x - 1, y - 4 - hgt + 1, 3, 2);
        break;
      }
      case 'hoodoo': {
        const hgt = 16 + Math.round(v * 14);
        this.shadow(ctx, x + 3, y - 1, 6, 2.5, 0.3);
        R(ctx, '#a8582e', x - 4, y - hgt, 8, hgt); R(ctx, '#c46e3e', x - 4, y - hgt, 3, hgt);
        for (let i = 4; i < hgt; i += 6) R(ctx, '#8e4626', x - 4, y - i, 8, 1);
        R(ctx, '#d8b48a', x - 6, y - hgt - 4, 12, 5); R(ctx, '#b89470', x - 6, y - hgt, 12, 1);
        break;
      }
      case 'arch': {
        this.shadow(ctx, x, y + 2, 46, 4, 0.25);
        const l = x - 48;
        R(ctx, '#a8582e', l, y - 30, 14, 30); R(ctx, '#a8582e', l + 82, y - 30, 14, 30);
        R(ctx, '#c46e3e', l, y - 30, 5, 30); R(ctx, '#c46e3e', l + 82, y - 30, 5, 30);
        ctx.fillStyle = '#b4623a'; ctx.beginPath(); ctx.moveTo(l, y - 30); ctx.quadraticCurveTo(x, y - 74, l + 96, y - 30);
        ctx.lineTo(l + 82, y - 30); ctx.quadraticCurveTo(x, y - 56, l + 14, y - 30); ctx.fill();
        ctx.strokeStyle = '#d27e4c'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(l + 2, y - 32); ctx.quadraticCurveTo(x, y - 72, l + 94, y - 32); ctx.stroke();
        break;
      }
      case 'cliffruin': {
        this.shadow(ctx, x, y - 1, 22, 3, 0.3);
        R(ctx, '#9c5a34', x - 24, y - 26, 48, 26); R(ctx, '#b46a40', x - 24, y - 26, 48, 3);
        for (const [dx, dy, w, h] of [[-20, -20, 12, 14], [-5, -22, 10, 16], [8, -18, 13, 12]]) {
          R(ctx, '#c89870', x + dx, y + dy, w, h); R(ctx, '#d8aa80', x + dx, y + dy, w, 2);
          R(ctx, '#2a1810', x + dx + Math.floor(w / 2) - 2, y + dy + h - 7, 4, 7);
          R(ctx, '#2a1810', x + dx + 2, y + dy + 4, 2, 2);
        }
        R(ctx, '#6a4a2a', x + 2, y - 10, 1, 10); R(ctx, '#6a4a2a', x + 6, y - 10, 1, 10); for (let i = 0; i < 4; i++) R(ctx, '#6a4a2a', x + 2, y - 9 + i * 3, 5, 1);
        break;
      }
      case 'lighthouse': {
        this.shadow(ctx, x + 4, y - 1, 12, 3, 0.35);
        R(ctx, '#6a6a6a', x - 10, y - 8, 20, 8);
        ctx.fillStyle = '#e8e4dc'; ctx.beginPath(); ctx.moveTo(x - 8, y - 8); ctx.lineTo(x + 8, y - 8); ctx.lineTo(x + 5, y - 52); ctx.lineTo(x - 5, y - 52); ctx.fill();
        R(ctx, '#b83a2a', x - 7, y - 24, 14, 6); R(ctx, '#b83a2a', x - 6, y - 40, 12, 6);
        R(ctx, '#2a2a2a', x - 7, y - 54, 14, 2); R(ctx, night ? '#ffe9a0' : '#9ab8c8', x - 4, y - 61, 8, 7); R(ctx, '#2a2a2a', x - 5, y - 64, 10, 3);
        if (night) { ctx.fillStyle = 'rgba(255,230,150,.18)'; const a = time * 0.8; ctx.beginPath(); ctx.moveTo(x, y - 58); ctx.lineTo(x + Math.cos(a) * 140, y - 58 + Math.sin(a) * 50 - 10); ctx.lineTo(x + Math.cos(a) * 140, y - 58 + Math.sin(a) * 50 + 10); ctx.fill(); }
        break;
      }
      case 'steamboat': {
        const bob = Math.round(Math.sin(time * 1.3) * 1);
        const yy = y + bob, l = x - 64;
        ctx.fillStyle = 'rgba(20,40,60,.35)'; ctx.beginPath(); ctx.ellipse(x, y + 1, 66, 6, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.moveTo(l, yy - 12); ctx.lineTo(l + 120, yy - 12); ctx.lineTo(l + 128, yy - 18); ctx.lineTo(l + 124, yy - 2); ctx.lineTo(l + 6, yy - 2); ctx.fill();
        R(ctx, '#f0ece0', l + 10, yy - 26, 92, 14); R(ctx, '#d8d0c0', l + 10, yy - 14, 92, 2);
        for (let i = 0; i < 11; i++) R(ctx, '#3a5a6a', l + 14 + i * 8, yy - 23, 4, 5);
        R(ctx, '#f0ece0', l + 24, yy - 36, 60, 10); R(ctx, '#8a2a20', l + 22, yy - 38, 64, 2);
        R(ctx, '#2a2a2a', l + 40, yy - 58, 5, 22); R(ctx, '#2a2a2a', l + 60, yy - 58, 5, 22); R(ctx, '#c8a040', l + 39, yy - 60, 7, 2); R(ctx, '#c8a040', l + 59, yy - 60, 7, 2);
        R(ctx, '#8a2a20', l + 104, yy - 24, 14, 20); for (let i = 0; i < 5; i++) R(ctx, '#5a1a10', l + 105, yy - 23 + i * 4, 12, 1);
        R(ctx, '#e8e0d0', l + 34, yy - 33, 40, 4); ctx.fillStyle = '#2a2a2a'; ctx.font = '4px monospace'; ctx.fillText('HARLOW BELLE', l + 36, yy - 30);
        break;
      }
      case 'headframe': {
        this.shadow(ctx, x, y - 1, 22, 3, 0.3);
        ctx.strokeStyle = '#5a3a20'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x - 20, y - 2); ctx.lineTo(x - 4, y - 50); ctx.lineTo(x + 4, y - 50); ctx.lineTo(x + 20, y - 2);
        ctx.moveTo(x - 14, y - 20); ctx.lineTo(x + 14, y - 20); ctx.moveTo(x - 10, y - 34); ctx.lineTo(x + 10, y - 34);
        ctx.moveTo(x - 14, y - 20); ctx.lineTo(x + 10, y - 34); ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = '#2a2a2a'; ctx.beginPath(); ctx.arc(x, y - 50, 5, 0, TAU); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(x + 5, y - 50); ctx.lineTo(x + 5, y - 10); ctx.stroke();
        R(ctx, '#6a6a6a', x + 2, y - 12, 7, 6); R(ctx, '#3a2a1a', x - 22, y - 4, 44, 3);
        break;
      }
      case 'flagpole': {
        R(ctx, '#8a8a8a', x - 1, y - 48, 2, 48); R(ctx, '#c8a040', x - 2, y - 50, 4, 2);
        const wv = Math.sin(time * 4) * 1.5;
        for (let i = 0; i < 7; i++) R(ctx, i % 2 ? '#e8e4dc' : '#b83a2a', x + 1, y - 46 + i * 2 + Math.round(wv * (i % 2)), 16, 2);
        R(ctx, '#2a3a6a', x + 1, y - 46, 7, 7);
        break;
      }
      case 'stampmill': {
        this.shadow(ctx, x, y - 1, 30, 3, 0.3);
        R(ctx, '#5a4a3a', x - 32, y - 30, 64, 30); R(ctx, '#4a3a2a', x - 32, y - 30, 64, 3);
        for (let i = 0; i < 8; i++) R(ctx, i % 3 ? '#4a3a2a' : '#3a2a1a', x - 30 + i * 8, y - 27, 1, 27);
        ctx.fillStyle = '#3a2a20'; ctx.beginPath(); ctx.moveTo(x - 34, y - 30); ctx.lineTo(x - 10, y - 44); ctx.lineTo(x + 22, y - 38); ctx.lineTo(x + 34, y - 30); ctx.fill();
        R(ctx, '#1a1410', x - 8, y - 18, 8, 18); R(ctx, '#1a1410', x + 14, y - 22, 6, 6); R(ctx, '#2a1e14', x + 18, y - 44, 6, 14);
        break;
      }
    }
  },

  /* interior furniture, drawn on the ground layer */
  buildingBase(ctx, b, time) {
    const R = this.R.bind(this);
    for (const f of b.furniture) {
      const x = f.x * TS, y = f.y * TS, w = f.w * TS, h = f.h * TS;
      switch (f.k) {
        case 'counter': R(ctx, '#5a3820', x, y + 2, w, h - 2); R(ctx, '#8a5a32', x, y, w, 4); R(ctx, '#a07040', x, y, w, 1); break;
        case 'shelf': R(ctx, '#4a2c18', x, y, w, h - 4); for (let i = 0; i < f.w * 3; i++) R(ctx, ['#c84a3a', '#d8c050', '#4a8ab0', '#e8e0d0', '#6a9a4a'][(i * 7 + f.x) % 5], x + 2 + i * 5, y + 3 + (i % 2) * 4, 3, 3); break;
        case 'rack': R(ctx, '#4a2c18', x, y, w, h - 4); for (let i = 0; i < f.w * 2; i++) { R(ctx, '#2a2a2a', x + 3 + i * 7, y + 1, 1, 10); R(ctx, '#6b4423', x + 3 + i * 7, y + 8, 2, 3); } break;
        case 'table': R(ctx, 'rgba(0,0,0,.25)', x + 1, y + 4, w, h - 2); R(ctx, '#7a4e2c', x + 2, y + 2, w - 4, h - 6); R(ctx, '#9a6a3a', x + 2, y + 2, w - 4, 1);
          R(ctx, '#5a3a20', x - 2, y + 5, 3, 4); R(ctx, '#5a3a20', x + w - 1, y + 5, 3, 4); if (hash2(f.x, f.y) > 0.5) { R(ctx, '#d8e0e8', x + 6, y + 4, 2, 3); R(ctx, '#8a4a1a', x + 12, y + 4, 2, 3); } break;
        case 'piano': R(ctx, '#2a1810', x, y, w, h - 2); R(ctx, '#e8e0d0', x + 1, y + h - 8, w - 2, 3); R(ctx, '#111', x + 3, y + h - 8, 1, 2); break;
        case 'bed': R(ctx, '#5a3a20', x + 1, y + 1, w - 2, h - 2); R(ctx, '#e8e0d0', x + 2, y + 2, w - 4, 6); R(ctx, '#8a2a2a', x + 2, y + 9, w - 4, h - 12); break;
        case 'cot': R(ctx, '#6a6a5a', x + 2, y + 2, w - 4, h - 4); break;
        case 'desk': R(ctx, '#6a4224', x, y + 2, w, h - 4); R(ctx, '#e8e0d0', x + 4, y + 4, 6, 4); R(ctx, '#2a2a2a', x + w - 8, y + 4, 3, 3); break;
        case 'bars': for (let i = 0; i < w; i += 3) R(ctx, '#2a2a2e', x + i, y, 1, h); R(ctx, '#3a3a3e', x, y + 3, w, 1); R(ctx, '#3a3a3e', x, y + h - 4, w, 1); break;
        case 'stall': R(ctx, '#6a4a2a', x, y, 2, h); R(ctx, '#c8a850', x + 3, y + h - 8, 10, 6); break;
        case 'hay': R(ctx, '#c8a850', x + 1, y + 2, w - 2, h - 3); break;
        case 'bench': R(ctx, '#6a4224', x + 1, y + 4, w - 2, 6); R(ctx, '#8a5a32', x + 1, y + 4, w - 2, 1); break;
        case 'altar': R(ctx, '#e8e0d0', x, y + 2, w, 10); R(ctx, '#c8a040', x + w / 2 - 1, y - 4, 2, 8); R(ctx, '#c8a040', x + w / 2 - 3, y - 2, 6, 2); break;
        case 'stove': R(ctx, '#1e1e1e', x + 2, y + 2, 12, 11); R(ctx, '#e8641a', x + 5, y + 8, 6, 2); R(ctx, '#2a2a2a', x + 6, y - 6, 3, 8); break;
        case 'barrel': R(ctx, '#6a4426', x + 3, y + 2, 10, 12); R(ctx, '#3a2a1a', x + 3, y + 6, 10, 1); break;
        case 'crate': R(ctx, '#8a6a3a', x + 2, y + 2, 12, 12); R(ctx, '#5a4222', x + 2, y + 7, 12, 1); break;
        case 'vaultwall': R(ctx, '#6a6a70', x, y, w, h); for (let i = 0; i < h; i += 4) R(ctx, '#55555a', x, y + i, w, 1); break;
        case 'vaultdoor':
          if (b.vaultOpen) { R(ctx, '#2a2a2e', x, y, w, h); R(ctx, '#7a7a82', x - 8, y + 2, 8, 12); }
          else { R(ctx, '#8a8a92', x, y, w, h); ctx.fillStyle = '#5a5a62'; ctx.beginPath(); ctx.arc(x + 8, y + 8, 6, 0, TAU); ctx.fill(); R(ctx, '#c8c8d0', x + 7, y + 3, 2, 10); R(ctx, '#c8c8d0', x + 3, y + 7, 10, 2); }
          break;
        case 'gold':
          if (!b.goldTaken) for (let i = 0; i < 6; i++) { R(ctx, '#c89a2a', x + 3 + (i % 3) * 8, y + 4 + Math.floor(i / 3) * 5, 7, 4); R(ctx, '#f0d060', x + 3 + (i % 3) * 8, y + 4 + Math.floor(i / 3) * 5, 7, 1); }
          break;
      }
    }
  },

  /* roof + facade, y-sorted with entities by the building's front edge */
  buildingRoof(ctx, b, alpha, night, time) {
    const R = this.R.bind(this);
    const X = b.x * TS, Y = b.y * TS, Wd = b.w * TS, Hd = b.h * TS;
    const fy = Y + Hd - 16, roofTop = Y - 10;
    if (alpha > 0.01) {
      ctx.globalAlpha = alpha;
      if (b.adobe) {
        R(ctx, b.roof, X - 2, roofTop, Wd + 4, fy - roofTop + 2);
        R(ctx, this.shade(b.roof, 22), X - 2, roofTop, Wd + 4, 3); R(ctx, this.shade(b.roof, -18), X - 2, fy, Wd + 4, 2);
        for (let i = X + 4; i < X + Wd - 4; i += 9) R(ctx, '#4a2c16', i, fy + 2, 2, 2);
        R(ctx, this.shade(b.roof, -10), X + 4, roofTop + 6, Wd - 8, fy - roofTop - 12);
      } else {
        const rc = b.roof || '#5a3a2a', mid = roofTop + (fy - roofTop) * 0.45;
        R(ctx, this.shade(rc, 14), X - 3, roofTop, Wd + 6, mid - roofTop);
        R(ctx, rc, X - 3, mid, Wd + 6, fy - mid + 3);
        for (let yy = roofTop + 3; yy < fy; yy += 4) R(ctx, this.shade(rc, -22), X - 3, yy, Wd + 6, 1);
        for (let yy = roofTop; yy < fy; yy += 4) for (let xx = X - 3 + ((yy >> 2) % 2) * 4; xx < X + Wd + 3; xx += 8) R(ctx, this.shade(rc, -12), xx, yy, 1, 4);
        R(ctx, this.shade(rc, 35), X - 3, mid - 1, Wd + 6, 2);
        R(ctx, this.shade(rc, -40), X - 3, fy + 2, Wd + 6, 1);
        if (b.type === 'church') { R(ctx, '#e8e2d2', X + Wd / 2 - 4, roofTop - 18, 8, 18); R(ctx, '#5a4a3a', X + Wd / 2 - 1, roofTop - 28, 2, 10); R(ctx, '#5a4a3a', X + Wd / 2 - 4, roofTop - 25, 8, 2); }
        if (b.type === 'saloon' || b.type === 'hotel' || b.type === 'bank' || b.type === 'general') {
          // false-front facade top
          R(ctx, b.adobe ? '#c8946a' : '#8a6038', X - 1, fy - 12, Wd + 2, 12); R(ctx, '#5a3a20', X - 1, fy - 12, Wd + 2, 1);
        }
        if (b.type !== 'station' && b.type !== 'church' && b.type !== 'cabin' && b.type !== 'house') {
          // chimney
          R(ctx, '#6a4a3a', X + Wd - 14, roofTop - 4, 5, 9);
        }
      }
      if (b.ruin) {
        // caved-in holes and loose boards on abandoned buildings
        for (let i = 0; i < 3; i++) {
          const hx = X + 6 + Math.floor(hash2(b.x * 3 + i, b.y) * (Wd - 26)), hy = roofTop + 6 + Math.floor(hash2(b.y + i * 7, b.x) * Math.max(4, fy - roofTop - 20));
          const hw = 8 + Math.floor(hash2(i, b.x + b.y) * 10), hh = 6 + Math.floor(hash2(b.x, i + 5) * 6);
          R(ctx, '#1a120c', hx, hy, hw, hh); R(ctx, '#2a1e14', hx + 2, hy + hh, hw - 3, 2);
          R(ctx, this.shade(b.roof || '#5a3a2a', -30), hx - 3, hy + 2, hw + 6, 2);
        }
        R(ctx, 'rgba(200,190,170,.18)', X - 3, roofTop, Wd + 6, fy - roofTop + 3);
      }
      ctx.globalAlpha = 1;
    }
    // facade (always visible, shortened when the player is inside)
    const inside = alpha < 0.5;
    const wallC = b.adobe ? '#c89a6a' : (b.wallTint || '#7a5434');
    const fh = inside ? 4 : 16, fTop = Y + Hd - fh;
    R(ctx, wallC, X, fTop, Wd, fh);
    if (!b.adobe) for (let xx = X; xx < X + Wd; xx += 4) R(ctx, this.shade(wallC, -18), xx, fTop, 1, fh);
    else R(ctx, this.shade(wallC, 16), X, fTop, Wd, 1);
    if (!inside) {
      // porch overhang & posts
      if (!b.adobe && b.type !== 'cabin' && b.type !== 'church') { R(ctx, '#4a2c16', X - 2, fTop - 2, Wd + 4, 3); R(ctx, '#3a2414', X, fTop + 1, 2, 15); R(ctx, '#3a2414', X + Wd - 2, fTop + 1, 2, 15); }
      for (const w of b.windows) {
        R(ctx, '#2a1a10', w.x - 4, fTop + 3, 8, 7);
        R(ctx, night ? '#ffcf6a' : '#5a7a8a', w.x - 3, fTop + 4, 6, 5);
        if (!night) R(ctx, '#9ab8c8', w.x - 3, fTop + 4, 2, 2);
        R(ctx, '#2a1a10', w.x, fTop + 4, 1, 5);
      }
      const dx = b.door.x * TS;
      R(ctx, '#1a100a', dx + 1, fTop + 2, 14, 14);
      if (b.type === 'saloon') { const sw = Math.sin(time * 2) * 0.5; R(ctx, '#8a5a32', dx + 2, fTop + 5, 5 + sw, 7); R(ctx, '#8a5a32', dx + 9 - sw, fTop + 5, 5 + sw, 7); }
      else R(ctx, '#4a2c16', dx + 2, fTop + 3, 3, 13);
      if (b.sign) {
        const tw = this.textWidth(b.sign) + 6, sx = Math.round(X + Wd / 2 - tw / 2), sy = fTop - 12;
        R(ctx, '#2a1a10', sx - 1, sy - 1, tw + 2, 10); R(ctx, b.adobe ? '#e8d8b8' : '#e8d8a8', sx, sy, tw, 8);
        this.pixelText(ctx, b.sign, sx + 3, sy + 2, '#5a1a10');
      }
    }
  },

  /* weapon icon for HUD/menus/website: pixel art scaled up */
  weaponIcon(ctx, key, x, y, sc) {
    const P = (c, px, py, w = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x + px * sc, y + py * sc, w * sc, h * sc); };
    const metal = '#4a4e56', dark = '#26282c', wood = '#7a4a26', woodD = '#5a3418', hi = '#9aa0aa', brass = '#c8a040';
    switch (key) {
      case 'fists': {
        const sk = '#d9a27a', skD = '#b07a52';
        P(sk, 4, 2, 9, 8); P(skD, 4, 9, 9, 1); P(skD, 6, 2, 1, 4); P(skD, 9, 2, 1, 4); P(sk, 2, 5, 3, 4); P('#8a5a3a', 13, 4, 6, 5); P('#6a4426', 13, 8, 6, 1);
        break;
      }
      case 'knife':
        P(woodD, 0, 4, 6, 3); P(wood, 0, 4, 6, 1); P(brass, 6, 3, 1, 5); P('#d8dde2', 7, 4, 13, 2); P('#aab0b6', 7, 6, 11, 1); P('#fff', 8, 4, 10, 1); P('#d8dde2', 20, 5, 1, 1); break;
      case 'sa': case 'da':
        P(wood, 0, 6, 4, 6); P(woodD, 0, 10, 4, 2); P(metal, 3, 3, 4, 4); P(dark, 4, 4, 5, 3); P(metal, 8, 3, 13, 2);
        P(hi, 8, 3, 13, 1); P(dark, 6, 7, 3, 2); P(dark, 2, 2, 2, 1); if (key === 'da') { P('#b0b6c0', 9, 3, 12, 1); P(dark, 5, 7, 1, 2); } else P(dark, 3, 1, 2, 2);
        P(brass, 5, 4, 1, 1); break;
      case 'lever': case 'repeater':
        P(wood, 0, 4, 10, 3); P(woodD, 0, 6, 9, 2); P(metal, 10, 3, 7, 4); P(dark, 17, 3, 18, 2); P(hi, 17, 3, 18, 1); P(wood, 17, 5, 10, 2);
        if (key === 'lever') { P(dark, 11, 7, 1, 3); P(dark, 11, 9, 5, 1); P(dark, 15, 7, 1, 3); P(brass, 12, 4, 3, 1); }
        else { P(dark, 13, 7, 2, 2); P(dark, 0, 5, 1, 1); P(metal, 27, 5, 6, 1); }
        break;
      case 'shotgun':
        P(wood, 0, 4, 10, 3); P(woodD, 0, 6, 9, 2); P(metal, 10, 3, 4, 4); P(dark, 14, 3, 17, 2); P('#3a3d42', 14, 5, 17, 1); P(hi, 14, 3, 17, 1);
        P(wood, 14, 5, 7, 2); P(dark, 12, 7, 1, 2); break;
    }
  }
};
