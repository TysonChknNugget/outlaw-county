/* Outlaw County — scenery.js (v2.2)
 * The things the story talks about, drawn in the world while a mission
 * needs them: pack mules that follow you, wagons, the payroll wagon, the
 * Frostpeak Express, gallows, crates, boats, rockfalls, the trestle and more.
 */
'use strict';

/* For each mission: what to show, where, and during which stages.
 *   at: a Story place, dx/dy: offset in tiles, from/to: stage range (inclusive),
 *   follow: n — trails behind the player (n = place in line). */
const MISSION_SCENERY = {
  c1m1: [
    { kind: 'payroll', at: 'widowPass', dx: 3, dy: 1, from: 1, to: 4 },
    { kind: 'strongbox', at: 'widowPass', dx: -1, dy: 2, from: 4, to: 4 },
    { kind: 'mule', follow: 1, from: 5, to: 7 }, { kind: 'mule', follow: 2, from: 5, to: 7 }, { kind: 'mule', follow: 3, from: 5, to: 7 },
    { kind: 'ice', at: 'iceRiver', dx: 0, dy: 0, from: 5, to: 6 }
  ],
  c1m2: [
    { kind: 'gallows', at: 'dwSaloon', dx: 7, dy: 4, from: 0, to: 7 },
    { kind: 'crowd', at: 'dwSaloon', dx: 7, dy: 7, from: 0, to: 1 }
  ],
  c1m3: [
    { kind: 'rowboat', at: 'phDocks', dx: 2, dy: 2, from: 0, to: 2 },
    { kind: 'crates', at: 'phWarehouse', dx: 2, dy: 0, from: 1, to: 4 },
    { kind: 'launch', at: 'phDocks', dx: 4, dy: 3, from: 6, to: 7 }
  ],
  c1m4: [
    { kind: 'pen', at: 'ranchDelaney', dx: 0, dy: 0, from: 1, to: 2 },
    { kind: 'wagon', at: 'ranchDelaney', dx: -4, dy: 3, from: 0, to: 2 },
    { kind: 'wagon', follow: 2, from: 3, to: 6 }
  ],
  c1m5: [
    { kind: 'wagon', follow: 2, from: 0, to: 6, cargo: 'rifles' }, { kind: 'wagon', follow: 5, from: 0, to: 6, cargo: 'rifles' },
    { kind: 'rockfall', at: 'narrows', dx: 6, dy: 0, from: 2, to: 4 }, { kind: 'rockfall', at: 'narrows', dx: -6, dy: 1, from: 2, to: 5 }
  ],
  c1m6: [
    { kind: 'orecart', at: 'scMine', dx: 3, dy: 2, from: 4, to: 8 }, { kind: 'orecart', at: 'scMine', dx: -3, dy: 3, from: 4, to: 8 },
    { kind: 'vein', at: 'scMine', dx: 0, dy: -2, from: 6, to: 8 }
  ],
  c1m7: [
    { kind: 'dynamite', at: 'overhang', dx: -2, dy: -1, from: 1, to: 2 },
    { kind: 'train', at: 'overhang', dx: -14, dy: 3, from: 3, to: 5 },
    { kind: 'trestle', at: 'eagleGorge', dx: 0, dy: 0, from: 6, to: 8 }
  ],
  c2m1: [{ kind: 'wagon', follow: 2, from: 1, to: 4 }, { kind: 'wagon', follow: 5, from: 1, to: 4 }],
  c2m2: [{ kind: 'herd', at: 'fortGate', dx: -4, dy: 3, from: 0, to: 0 }],
  c2m4: [{ kind: 'bell', at: 'fortress', dx: 2, dy: -3, from: 4, to: 5 }],
  c2m5: [{ kind: 'press', at: 'clarion', dx: 1, dy: -2, from: 1, to: 2 }, { kind: 'rowboat', at: 'phDocks', dx: 2, dy: 2, from: 3, to: 5 }],
  c2m6: [{ kind: 'tinbox', at: 'school', dx: 0, dy: -2, from: 4, to: 5 }, { kind: 'chalk', at: 'school', dx: 0, dy: -4, from: 1, to: 5 }],
  c3m1: [
    { kind: 'raft', at: 'ford1', dx: 2, dy: 1, from: 0, to: 1 },
    { kind: 'crates', at: 'heronGrove', dx: 1, dy: 1, from: 1, to: 2 },
    { kind: 'wagon', follow: 2, from: 3, to: 6, cargo: 'rifles' }
  ],
  c3m3: [{ kind: 'tripod', at: 'scMine', dx: 2, dy: -1, from: 5, to: 6 }, { kind: 'orecart', at: 'scMine', dx: -3, dy: 2, from: 4, to: 7 }, { kind: 'vein', at: 'scMine', dx: 0, dy: -2, from: 5, to: 6 }],
  c3m6: [{ kind: 'dynamite', at: 'slBridge', dx: 0, dy: -1, from: 1, to: 4 }],
  c3m7: [{ kind: 'chess', at: 'school', dx: 1, dy: -3, from: 2, to: 3 }, { kind: 'chalk', at: 'school', dx: 0, dy: -5, from: 2, to: 3 }, { kind: 'grave', at: 'graves', dx: 0, dy: 0, from: 4, to: 5, text: 'M.H.' }],
  e2: [{ kind: 'chess', at: 'fgPrisonGate', dx: 3, dy: 3, from: 0, to: 0 }, { kind: 'grave', at: 'dwGraves', dx: 0, dy: 0, from: 1, to: 3, text: 'R.V.' }]
};

const Scenery = {
  trail: [], items: [],

  /* the player's recent path, so followers walk the same route */
  record() {
    const P = G.player, t = this.trail, last = t[0];
    if (last && dist(last.x, last.y, P.x, P.y) > 120) t.length = 0;   // a respawn or fast travel: start a new trail
    if (!t[0] || dist(t[0].x, t[0].y, P.x, P.y) > 3) { t.unshift({ x: P.x, y: P.y }); if (t.length > 600) t.length = 600; }
  },
  trailPoint(n) {
    const gap = 12 + n * 9, t = this.trail;     // n-th follower sits about gap*3 px back
    let acc = 0;
    for (let i = 1; i < t.length; i++) { acc += dist(t[i].x, t[i].y, t[i - 1].x, t[i - 1].y); if (acc >= gap * 3) return { x: t[i].x, y: t[i].y, face: Math.atan2(t[i - 1].y - t[i].y, t[i - 1].x - t[i].x) }; }
    // not enough trail yet: line up straight behind the player
    const P = G.player, back = gap * 3 - acc, e = t[t.length - 1] || P, f = P.face || 0;
    return { x: e.x - Math.cos(f) * back, y: e.y - Math.sin(f) * back + 4, face: f };
  },

  update(dt) {
    const P = G.player, m = MissionSys.active;
    if (!P) return;
    this.record();
    const want = m && MISSION_SCENERY[m.id] ? MISSION_SCENERY[m.id].filter(s => MissionSys.stage >= s.from && MissionSys.stage <= s.to) : [];
    // keep items that are still wanted, make the new ones
    this.items = this.items.filter(it => want.includes(it.spec) && it.mission === (m && m.id));
    for (const s of want) if (!this.items.some(it => it.spec === s)) this.items.push(this.make(s, m.id));
    for (const it of this.items) {
      it.anim += dt;
      if (it.spec.follow) {
        const tp = this.trailPoint(it.spec.follow * (it.spec.kind === 'wagon' ? 2.2 : 1));
        const d = dist(it.x, it.y, tp.x, tp.y);
        if (d > 300) { it.x = tp.x; it.y = tp.y; }
        else { const k = Math.min(1, dt * 6); it.x += (tp.x - it.x) * k; it.y += (tp.y - it.y) * k; }
        it.moving = d > 1.5; if (it.moving) it.face = Math.atan2(tp.y - it.y, tp.x - it.x) || it.face;
      }
    }
  },
  make(s, mid) {
    let x, y;
    if (s.follow) { const tp = this.trailPoint(s.follow); x = tp.x; y = tp.y; }
    else { const p = Story.at(s.at); x = p.x + (s.dx || 0) * TS; y = p.y + (s.dy || 0) * TS; }
    const it = { spec: s, mission: mid, x, y, face: 0, anim: Math.random() * 10, moving: false };
    it.draw = ctx => this.draw(ctx, it);
    return it;
  },
  sortables() {
    const c = G.cam, out = [];
    for (const it of this.items) {
      if (it.x < c.x - 260 || it.x > c.x + Game.vw + 260 || it.y < c.y - 120 || it.y > c.y + Game.vh + 160) continue;
      if (it.spec.kind === 'ice' || it.spec.kind === 'pen' || it.spec.kind === 'trestle' || it.spec.kind === 'chalk') continue;  // ground layer
      out.push(it);
    }
    return out;
  },
  drawGround(ctx) {
    for (const it of this.items) if (['ice', 'pen', 'trestle', 'chalk'].includes(it.spec.kind)) this.draw(ctx, it);
  },

  /* ------------------------------------------------ drawing */
  draw(ctx, it) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    const x = Math.round(it.x), y = Math.round(it.y), night = Env.isNight && Env.isNight();
    switch (it.spec.kind) {
      case 'mule': this.mule(ctx, x, y, it.face, it.anim, it.moving, true); break;
      case 'payroll': {
        this.mule(ctx, x + 34, y + 1, 0, it.anim, false, false); this.mule(ctx, x + 34, y - 7, 0, it.anim + 1, false, false);
        Sprites.shadow(ctx, x, y - 1, 22, 3);
        R('#4a3a2a', x - 20, y - 18, 40, 12); R('#2a2018', x - 20, y - 18, 40, 2); R('#6a5a44', x - 18, y - 15, 36, 1);
        R('#1a1a1a', x - 8, y - 26, 14, 8); R('#c8a040', x - 2, y - 23, 2, 2);         // the strongbox on the bed
        Sprites.pixelText(ctx, 'CROWN', x - 12, y - 14, '#e0c890');
        for (const wx of [-13, 13]) { ctx.strokeStyle = '#2a1a0e'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + wx, y - 5, 5, 0, TAU); ctx.stroke(); }
        R('#5a3a20', x + 20, y - 9, 12, 1);
        break;
      }
      case 'strongbox': Sprites.shadow(ctx, x, y, 7, 2); R('#2a2a2e', x - 6, y - 8, 12, 8); R('#4a4a52', x - 6, y - 8, 12, 2); R('#c8a040', x - 1, y - 5, 2, 3); R('#6a2a1a', x - 6, y - 4, 12, 1); break;
      case 'wagon': {
        const s = Math.cos(it.face) < 0 ? -1 : 1;
        this.mule(ctx, x + 30 * s, y + 1, it.face, it.anim, it.moving, false); this.mule(ctx, x + 30 * s, y - 6, it.face, it.anim + 0.7, it.moving, false);
        R('#5a3a20', x + 18 * s - (s < 0 ? 12 : 0), y - 8, 12, 1);
        Sprites.prop(ctx, { t: 'wagon', x, y: y + (it.moving ? Math.round(Math.sin(it.anim * 12) * 0.6) : 0) }, 0, night);
        if (it.spec.cargo === 'rifles') { R('#6a4a2a', x - 10, y - 16, 8, 4); R('#6a4a2a', x + 2, y - 16, 8, 4); }
        break;
      }
      case 'gallows':
        Sprites.shadow(ctx, x, y, 26, 4);
        R('#5a3e24', x - 24, y - 10, 48, 10); R('#3a2614', x - 24, y - 10, 48, 2);       // platform
        for (let i = 0; i < 4; i++) R('#4a2e18', x + 14 + i * 3, y - 2 - i * 3, 6, 2);    // steps
        R('#4a2e18', x - 22, y - 46, 3, 36); R('#4a2e18', x + 19, y - 46, 3, 36); R('#5a3e24', x - 24, y - 48, 48, 3);
        for (const rx of [-12, 0, 12]) { R('#c8b080', x + rx, y - 45, 1, 14); ctx.strokeStyle = '#c8b080'; ctx.beginPath(); ctx.arc(x + rx, y - 29, 2, 0, TAU); ctx.stroke(); }
        break;
      case 'crowd':
        for (let i = 0; i < 9; i++) {
          const px = x - 34 + (i % 5) * 16 + (i > 4 ? 8 : 0), py = y + (i > 4 ? 10 : 0);
          Sprites.human(ctx, px, py, { face: -Math.PI / 2 + (i % 3 - 1) * 0.2, pal: CIV_PALS[i % CIV_PALS.length], moving: false });
        }
        break;
      case 'crates':
        for (const [cx, cy] of [[-10, 0], [2, 0], [-4, -9], [14, 2]]) Sprites.prop(ctx, { t: 'crate', x: x + cx, y: y + cy }, 0, night);
        Sprites.pixelText(ctx, 'ICC', x - 12, y - 8, '#2a1608');
        break;
      case 'rowboat': this.boat(ctx, x, y, it.anim, false); break;
      case 'launch': this.boat(ctx, x, y, it.anim, true); break;
      case 'raft':
        R('#7a5a32', x - 14, y - 6, 28, 8); for (let i = -12; i < 14; i += 4) R('#5a3e20', x + i, y - 6, 1, 8);
        R('#2a2a2a', x - 4, y - 12, 8, 6); R('rgba(255,255,255,.35)', x - 16, y + 2 + Math.sin(it.anim * 2), 32, 1);
        break;
      case 'rockfall':
        for (const [bx, by, r] of [[-10, 0, 8], [4, -3, 10], [14, 2, 6], [-2, 6, 7], [-16, 6, 5]]) {
          ctx.fillStyle = '#6a5a4e'; ctx.beginPath(); ctx.ellipse(x + bx, y + by - r / 2, r, r * 0.75, 0, 0, TAU); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.ellipse(x + bx - r / 3, y + by - r * 0.8, r / 2.5, r / 4, 0, 0, TAU); ctx.fill();
        }
        break;
      case 'orecart':
        Sprites.shadow(ctx, x, y, 10, 2); R('#3a3a3e', x - 11, y - 1, 22, 1);
        R('#5a4a3a', x - 8, y - 10, 16, 8); R('#3a2a1a', x - 8, y - 10, 16, 1); R('#8a8a90', x - 6, y - 13, 12, 3); R('#c8c8d0', x - 3, y - 13, 2, 1);
        R('#1a1a1a', x - 6, y - 2, 3, 3); R('#1a1a1a', x + 3, y - 2, 3, 3);
        break;
      case 'vein':
        for (let i = 0; i < 6; i++) R(i % 2 ? '#e8ecf0' : '#b8c0c8', x - 18 + i * 6, y - 14 + Math.sin(i) * 3, 7, 2);
        R('rgba(255,255,255,.6)', x - 4, y - 15, 2, 1);
        R('#e0a030', x + 22, y - 18, 3, 4); G.tempLights && G.tempLights.push({ x: x + 22, y: y - 16, r: 50, life: 0.03, max: 0.03 });
        break;
      case 'dynamite':
        Sprites.prop(ctx, { t: 'crate', x, y }, 0, night);
        for (let i = 0; i < 4; i++) R('#c0281a', x - 5 + i * 3, y - 14, 2, 5);
        R('#e8d8a0', x - 1, y - 18, 1, 4); if (Math.sin(it.anim * 20) > 0) R('#ffd040', x - 1, y - 19, 1, 1);
        Sprites.pixelText(ctx, 'TNT', x - 5, y - 8, '#f0e0b0');
        break;
      case 'train': {
        const cars = [['loco', 44], ['tender', 24], ['passenger', 40], ['passenger', 40], ['express', 40], ['caboose', 28]];
        let cx = x;
        for (const [k, len] of cars) { Sprites.trainCar(ctx, k, cx, y, it.anim * 0.2, night, false); cx -= len + 2; }
        if (Math.sin(it.anim * 3) > 0) { ctx.fillStyle = 'rgba(230,230,230,.45)'; ctx.beginPath(); ctx.arc(x + 34, y - 40 - (it.anim * 20 % 20), 6, 0, TAU); ctx.fill(); }
        break;
      }
      case 'trestle':
        for (let i = -80; i <= 80; i += 16) { R('#4a2e18', x + i, y - 2, 3, 18); R('#3a2414', x + i - 6, y + 6, 15, 1); }
        R('#5a3e24', x - 88, y - 4, 176, 5); R('#2a2a2e', x - 88, y - 4, 176, 1); R('#2a2a2e', x - 88, y, 176, 1);
        for (let i = -86; i < 88; i += 5) R('#3a2614', x + i, y - 4, 2, 5);
        break;
      case 'herd':
        for (let i = 0; i < 6; i++) Sprites.animal(ctx, { kind: 'cow', x: x + (i % 3) * 16 - 16, y: y + Math.floor(i / 3) * 10, face: 0, animT: it.anim + i, moving: true, dead: false });
        break;
      case 'bell':
        R('#4a2e18', x - 12, y - 30, 24, 3); ctx.fillStyle = '#9a7a3a'; ctx.beginPath(); ctx.moveTo(x - 7, y - 10); ctx.quadraticCurveTo(x - 6, y - 27, x, y - 27); ctx.quadraticCurveTo(x + 6, y - 27, x + 7, y - 10); ctx.closePath(); ctx.fill();
        R('#6a5020', x - 8, y - 11, 16, 2); R('#3a2a10', x - 1, y - 9, 2, 3);
        break;
      case 'press':
        Sprites.shadow(ctx, x, y, 12, 3); R('#2a2a2e', x - 10, y - 18, 20, 18); R('#4a4a52', x - 10, y - 18, 20, 3); R('#1a1a1e', x - 6, y - 26, 12, 8);
        R('#e8e0d0', x - 7, y - 9, 14, 3); R('#8a6a3a', x + 10, y - 14, 6, 2);
        break;
      case 'tinbox': R('#3a2a1a', x - 12, y - 4, 24, 6); R('#7a7a80', x - 5, y - 6, 10, 6); R('#9a9aa0', x - 5, y - 6, 10, 1); R('#c8b080', x - 3, y - 4, 6, 1); break;
      case 'chalk': R('#2a3a2e', x - 22, y - 10, 44, 14); R('#5a3e24', x - 23, y - 11, 46, 1); Sprites.pixelText(ctx, 'LESSON 9', x - 16, y - 7, '#e8e8e0'); break;
      case 'chess':
        Sprites.shadow(ctx, x, y, 9, 2); R('#5a3e24', x - 9, y - 8, 18, 2); R('#3a2614', x - 8, y - 6, 1, 6); R('#3a2614', x + 7, y - 6, 1, 6);
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) R((i + j) % 2 ? '#1a1a1a' : '#e8e0d0', x - 6 + i * 3, y - 11 + j * 2, 3, 2);
        R('#f0f0e8', x - 4, y - 14, 1, 3); R('#141414', x + 3, y - 14, 1, 3);
        break;
      case 'grave':
        R('#6a6a66', x - 5, y - 14, 10, 14); R('#8a8a86', x - 5, y - 14, 10, 2); R('#4a3a2a', x - 7, y, 14, 4);
        Sprites.pixelText(ctx, it.spec.text || '', x - 5, y - 10, '#2a2a2a');
        break;
      case 'tripod':
        R('#3a2a1a', x - 5, y - 10, 1, 10); R('#3a2a1a', x + 4, y - 10, 1, 10); R('#3a2a1a', x, y - 10, 1, 11);
        R('#1a1a1a', x - 5, y - 18, 10, 8); R('#6a4a2a', x - 3, y - 20, 6, 2); R('#8ab0d0', x + 5, y - 15, 2, 3);
        break;
      case 'ice':
        ctx.fillStyle = 'rgba(200,225,240,.55)'; ctx.beginPath(); ctx.ellipse(x, y, 90, 26, 0, 0, TAU); ctx.fill();
        ctx.strokeStyle = 'rgba(120,150,180,.6)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let i = 0; i < 7; i++) { const sx = x - 60 + i * 20; ctx.moveTo(sx, y - 6 + (i % 3) * 4); ctx.lineTo(sx + 12, y + 2 - (i % 2) * 6); }
        ctx.stroke();
        break;
      case 'pen':
        for (let i = -3; i <= 3; i++) { Sprites.prop(ctx, { t: 'fence_h', x: x + i * 16, y: y - 44 }, 0, night); if (Math.abs(i) > 0) Sprites.prop(ctx, { t: 'fence_h', x: x + i * 16, y: y + 44 }, 0, night); }
        for (let j = -2; j <= 2; j++) { Sprites.prop(ctx, { t: 'fence_v', x: x - 56, y: y + j * 18 }, 0, night); Sprites.prop(ctx, { t: 'fence_v', x: x + 56, y: y + j * 18 }, 0, night); }
        break;
    }
  },
  /* a pack mule: a small horse with long ears and loaded panniers */
  mule(ctx, x, y, face, anim, moving, packs) {
    const s = Math.cos(face || 0) < 0 ? -1 : 1;
    ctx.save(); ctx.translate(x, y); ctx.scale(0.82, 0.82);
    Sprites.horse(ctx, 0, 0, { face, animT: anim, speed: moving ? 0.25 : 0, coat: '#6a5848', mane: '#2a2018' });
    const R = (c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(px, py, w, h); };
    R('#4a3a2e', s * 11 - (s < 0 ? 1 : 0), -24, 1, 4); R('#4a3a2e', s * 13 - (s < 0 ? 1 : 0), -24, 1, 4);   // long ears
    if (packs) { R('#7a5a32', -7, -20, 12, 6); R('#5a3e20', -7, -20, 12, 1); R('#c8b080', -2, -22, 3, 2); R('#3a2a1a', -8, -15, 14, 1); }
    ctx.restore();
  },
  boat(ctx, x, y, anim, steam) {
    const bob = Math.round(Math.sin(anim * 2) * 1);
    ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x - 22, y + 3 + bob, 44, 1);
    ctx.fillStyle = steam ? '#2a2a2e' : '#6a4426'; ctx.beginPath(); ctx.moveTo(x - 20, y - 6 + bob); ctx.lineTo(x + 22, y - 6 + bob); ctx.lineTo(x + 16, y + 2 + bob); ctx.lineTo(x - 16, y + 2 + bob); ctx.closePath(); ctx.fill();
    ctx.fillStyle = steam ? '#c8a040' : '#8a6a3a'; ctx.fillRect(x - 20, y - 7 + bob, 42, 2);
    if (steam) {
      ctx.fillStyle = '#e8e0d0'; ctx.fillRect(x - 8, y - 15 + bob, 16, 8); ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x + 2, y - 24 + bob, 4, 9);
      ctx.fillStyle = 'rgba(220,220,220,.4)'; ctx.beginPath(); ctx.arc(x + 4, y - 28 + bob - (anim * 15 % 12), 4, 0, TAU); ctx.fill();
    } else { ctx.fillStyle = '#4a2e18'; ctx.fillRect(x - 2, y - 12 + bob, 2, 6); ctx.fillRect(x - 12, y - 8 + bob, 24, 1); }
  }
};

Hooks.add({
  key: 'scenery',
  reset: () => { Scenery.items = []; Scenery.trail = []; },
  update: dt => Scenery.update(dt),
  sortables: () => Scenery.sortables(),
  drawGround: ctx => Scenery.drawGround(ctx)
});
