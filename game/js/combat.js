/* Outlaw County — combat.js
 * Fair-fight rules (attack turns, reaction time, aim falloff), enemy types
 * (sharpshooter, brute, dynamiter, gunslinger), flanking, retreating and
 * surrendering, throwables (dynamite, fire bottles), Steady Nerves slow
 * motion, cover, and hit feedback. Loaded after entities.js: it extends Actor.
 */
'use strict';

const ROLE_NAMES = { sharpshooter: 'Sharpshooter', brute: 'Brute', dynamiter: 'Dynamiter', gunslinger: 'Gunslinger' };

const Combat = {
  t: 0, tokens: new Map(), projectiles: [], hazards: [], nervesOn: false,
  hit: { t: 0, kill: false, crit: false }, lastCrit: false,

  reset() { this.tokens.clear(); this.projectiles = []; this.hazards = []; this.nervesOn = false; this.hit.t = 0; },

  /* ---------------- fair fights ---------------- */
  maxTokens() { return { easy: 1, normal: 2, hard: 3 }[G.settings.difficulty] || 2; },
  reaction() { const r = { easy: [0.8, 1.3], normal: [0.55, 1.0], hard: [0.35, 0.7] }[G.settings.difficulty] || [0.55, 1]; return rand(r[0], r[1]); },
  /* only a few enemies may shoot at the player at once; the rest flank, reload or hide */
  canShootPlayer(a) {
    const tok = this.tokens.get(a);
    if (tok && tok > this.t) return true;
    if ((a.tokenCD || 0) > this.t) return false;
    if (this.tokens.size < this.maxTokens()) { this.tokens.set(a, this.t + rand(2.5, 4)); return true; }
    return false;
  },
  release(a, cd = 1.5) { if (this.tokens.delete(a)) a.tokenCD = this.t + cd; },

  assignRole(a) {
    if (a.role || a.giver || a.shopId || a.noRole) return;
    const r = Math.random();
    let role = null;
    if (a.kind === 'rival') role = r < 0.15 ? 'sharpshooter' : r < 0.29 ? 'brute' : r < 0.41 ? 'dynamiter' : r < 0.54 ? 'gunslinger' : null;
    else if (a.kind === 'marshal') role = r < 0.2 ? 'sharpshooter' : r < 0.32 ? 'dynamiter' : r < 0.45 ? 'brute' : null;
    else if (a.kind === 'lawman') role = r < 0.16 ? 'sharpshooter' : r < 0.28 ? 'brute' : r < 0.4 ? 'gunslinger' : null;
    if (role) this.applyRole(a, role);
  },
  applyRole(a, role) {
    a.role = role;
    if (role === 'sharpshooter') { a.weapon = 'lever'; a.skill = 0.9; a.pal = Object.assign({}, a.pal, { hat: '#4a4a36', coat: '#5a5040' }); }
    if (role === 'brute') { a.weapon = 'shotgun'; a.maxHp = a.hp = Math.round(a.maxHp * 1.7); a.speedRun += 8; a.pal = Object.assign({}, a.pal, { shirt: '#3a2a22', vest: '#1a1410' }); }
    if (role === 'dynamiter') { a.weapon = 'sa'; a.throwCD = rand(2, 4); a.pal = Object.assign({}, a.pal, { bandana: '#c84a1a', band: '#c84a1a' }); }
    if (role === 'gunslinger') { a.weapon = 'da'; a.skill = 0.6; a.pal = Object.assign({}, a.pal, { poncho: '#6a3a5a' }); }
    a.mag = WEAPONS[a.weapon].cap;
  },

  /* ---------------- player feedback ---------------- */
  onPlayerHit(e, killed) {
    const crit = this.lastCrit;
    this.hit.t = 0.22; this.hit.kill = killed; this.hit.crit = crit;
    Sound.play(killed ? 'killmark' : 'hitmark', undefined, undefined, 0.7);
    if (crit) Floaters.add(e.x, e.y - 26, 'Precise!', '#ffd76a');
    const P = G.player;
    this.addNerve((killed ? 14 : 6) + (crit ? 4 : 0));
    if (killed) {
      if (e instanceof Animal) Progress.add(5);
      else if (e.faction === 'rival' || (e.faction === 'law' && (Law.heat >= 2 || e.forceHostile))) Progress.add(e.role ? 20 : 10);
    }
  },

  /* ---------------- Steady Nerves (slow motion) ---------------- */
  addNerve(n) { const P = G.player; P.nerve = Math.min(100, P.nerve + n * (Progress.has('nerves') ? 1.5 : 1)); },
  toggleNerves() {
    const P = G.player;
    if (this.nervesOn) { this.nervesOn = false; Sound.play('nervesOff'); return; }
    if (P.nerve < 20 || P.dead) { Floaters.add(P.x, P.y - 24, 'Not enough nerve', '#9ab8d8'); return; }
    this.nervesOn = true; Sound.play('nervesOn');
  },
  worldScale() { return this.nervesOn ? 0.35 : 1; },
  updateNerves(dt) {
    const P = G.player;
    if (!this.nervesOn) return;
    P.nerve -= 24 * dt;
    if (P.nerve <= 0 || P.dead) { P.nerve = Math.max(0, P.nerve); this.nervesOn = false; Sound.play('nervesOff'); }
  },

  /* ---------------- cover ---------------- */
  coverNear(x, y) {
    for (const [dx, dy] of [[12, 0], [-12, 0], [0, 10], [0, -12], [9, 9], [-9, 9], [9, -9], [-9, -9]]) if (World.blockedPx(x + dx, y + dy, SOL.SHOT)) return true;
    return false;
  },
  /* a crouching player behind something solid is shielded from that side */
  coverBlocks(b) {
    const P = G.player;
    if (!P.crouch) return false;
    const sp = Math.hypot(b.vx, b.vy) || 1, ux = b.vx / sp, uy = b.vy / sp;
    for (const k of [6, 11, 16, 20]) for (const o of [0, 5, -5]) {
      if (World.blockedPx(P.x - ux * k - uy * o, P.y - uy * k + ux * o, SOL.SHOT)) return true;
    }
    return false;
  },

  /* ---------------- throwables ---------------- */
  landingPoint(x, y, tx, ty) {
    const d = dist(x, y, tx, ty), n = Math.max(1, Math.ceil(d / 6));
    let lx = x, ly = y;
    for (let i = 1; i <= n; i++) {
      const px = lerp(x, tx, i / n), py = lerp(y, ty, i / n);
      if (World.blockedPx(px, py, SOL.SHOT)) break;
      lx = px; ly = py;
    }
    return { x: lx, y: ly };
  },
  throwFrom(owner, tx, ty, kind) {
    const maxR = 210, d = dist(owner.x, owner.y, tx, ty);
    if (d > maxR) { tx = owner.x + (tx - owner.x) / d * maxR; ty = owner.y + (ty - owner.y) / d * maxR; }
    const land = this.landingPoint(owner.x, owner.y - 2, tx, ty);
    const dd = dist(owner.x, owner.y, land.x, land.y);
    this.projectiles.push({ x0: owner.x, y0: owner.y - 8, x1: land.x, y1: land.y, t: 0, dur: 0.35 + dd / 300, h: 10 + dd * 0.18, kind, owner });
    Sound.play('throw', owner.x, owner.y);
    if (owner === G.player) G.player.drawnT = 1;
  },
  playerThrow() {
    const P = G.player;
    if (P.dead || P.rollT > 0) return;
    let kind = P.throwSel;
    if (!P.inv[kind]) kind = THROWABLES.find(k => P.inv[k] > 0);
    if (!kind) { Floaters.add(P.x, P.y - 22, 'Nothing to throw — buy dynamite or fire bottles', '#ff9a7a'); return; }
    if ((P.throwCD || 0) > 0) return;
    P.inv[kind]--; P.throwSel = kind; P.throwCD = 0.6;
    this.throwFrom(P, G.mouseWorld.x, G.mouseWorld.y, kind);
  },
  cycleThrowable() {
    const P = G.player, i = THROWABLES.indexOf(P.throwSel);
    P.throwSel = THROWABLES[(i + 1) % THROWABLES.length];
    Floaters.add(P.x, P.y - 22, `${ITEMS[P.throwSel].name} ×${P.inv[P.throwSel] || 0}`, '#ffd27a');
    Sound.play('click');
  },
  explode(x, y, owner, r = 56, dmg = 95) {
    FX.explosion(x, y);
    this.damageArea(x, y, r, dmg, owner, true);
    Law.gunfire(x, y, owner);
    for (const a of G.actors) if (!a.dead && dist(a.x, a.y, x, y) < r * 1.4 && a.faction === 'rival') a.aggro = true;
  },
  damageArea(x, y, r, dmg, owner, falloff) {
    const hitE = e => {
      if (!e || e.dead || e.inside) return;
      const d = dist(x, y, e.x, e.y);
      if (d > r) return;
      const k = falloff ? 1 - (d / r) * 0.6 : 1;
      if (e === G.player && e.rollT > 0.1) return;
      // enemy explosives follow the difficulty setting like their bullets do
      const mul = e === G.player && owner !== G.player ? Game.npcDamageMul() * 1.4 : 1;
      e.hurt(dmg * k * mul, owner, Math.atan2(e.y - y, e.x - x));
    };
    hitE(G.player);
    for (const a of G.actors) hitE(a);
    for (const h of G.horses) if (!h.rider) hitE(h);
    for (const an of G.animals) hitE(an);
  },

  update(dt) {
    this.t += dt;
    this.hit.t = Math.max(0, this.hit.t - dt);
    for (const [a, until] of this.tokens) if (a.dead || a.surrendered || until < this.t || a.target !== G.player) { this.tokens.delete(a); a.tokenCD = this.t + rand(1.2, 2.2); }
    const P = G.player;
    P.throwCD = Math.max(0, (P.throwCD || 0) - dt);
    for (const p of this.projectiles) {
      p.t += dt;
      if (p.t >= p.dur) {
        p.done = true;
        if (p.kind === 'dynamite') { this.hazards.push({ x: p.x1, y: p.y1, kind: 'fuse', life: p.owner === P ? 1.2 : 1.5, max: 1.5, r: 56, owner: p.owner }); Sound.play('fuse', p.x1, p.y1); }
        else {
          FX.impact(p.x1, p.y1, 'glass', 0); Sound.play('glass', p.x1, p.y1);
          this.hazards.push({ x: p.x1, y: p.y1, kind: 'fire', life: 6, max: 6, r: 30, owner: p.owner, tick: 0 });
          Law.gunfire(p.x1, p.y1, p.owner);
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.done);
    for (const h of this.hazards) {
      h.life -= dt;
      if (h.kind === 'fuse') {
        if (chance(dt * 30)) FX.spawn(h.x + rand(-2, 2), h.y - 3, rand(-20, 20), -rand(20, 40), 0.25, 1, pick(['#ffd04a', '#fff']), 'fade', 80, 2);
        if (h.life <= 0) { h.done = true; this.explode(h.x, h.y, h.owner, h.r); }
      } else {
        h.tick -= dt;
        if (h.tick <= 0) { h.tick = 0.5; this.damageArea(h.x, h.y, h.r, 9, h.owner, false); }
        if (Game.onScreen(h.x, h.y, 40)) for (let i = 0; i < 3; i++) {
          const a = rand(TAU), rr = rand(h.r * 0.85);
          FX.spawn(h.x + Math.cos(a) * rr, h.y + Math.sin(a) * rr * 0.6, rand(-5, 5), -rand(15, 35), rand(0.3, 0.6), rand(1.5, 2.5), pick(['#ff8a2a', '#ffd04a', '#e8641a']), 'fade', -20, 1);
        }
        if (chance(dt * 4)) FX.spawn(h.x + rand(-10, 10), h.y - 6, rand(-4, 4), -rand(10, 20), 1.6, 3, '#4a4440', 'smoke', -4, 1);
        if (h.life <= 0) h.done = true;
      }
    }
    this.hazards = this.hazards.filter(h => !h.done);
    for (const h of this.hazards) if (h.kind === 'fire') G.tempLights.push({ x: h.x, y: h.y, r: 70, life: 0.05, max: 0.05 });
  },

  draw(ctx, t) {
    // sharpshooter aim warnings
    const P = G.player;
    for (const a of G.actors) {
      if (a.dead || a.role !== 'sharpshooter' || !(a.aimT > 0) || !a.target) continue;
      const tg = a.target, k = 1 - a.aimT / 0.9;
      ctx.strokeStyle = `rgba(255,${Math.round(80 - k * 60)},40,${0.25 + k * 0.6})`; ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(a.x, a.y - 8); ctx.lineTo(tg.x, tg.y - 6); ctx.stroke(); ctx.setLineDash([]);
    }
    for (const h of this.hazards) {
      if (h.kind === 'fuse') {
        const pulse = 0.5 + Math.sin(t * 18) * 0.5, k = 1 - Math.max(0, h.life) / h.max;
        ctx.strokeStyle = `rgba(255,60,30,${0.4 + pulse * 0.4})`; ctx.fillStyle = `rgba(255,60,30,${0.08 + k * 0.15})`; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.6, 0, 0, TAU); ctx.fill(); ctx.stroke();
        Sprites.R(ctx, '#b8281a', h.x - 1, h.y - 5, 3, 5); Sprites.R(ctx, '#ffd04a', h.x, h.y - 7, 1, 2);
      } else {
        const a = Math.min(1, h.life) * 0.35;
        ctx.fillStyle = `rgba(255,110,30,${a})`; ctx.beginPath(); ctx.ellipse(h.x, h.y, h.r, h.r * 0.6, 0, 0, TAU); ctx.fill();
      }
    }
    for (const p of this.projectiles) {
      const k = p.t / p.dur, x = lerp(p.x0, p.x1, k), y = lerp(p.y0, p.y1, k) - Math.sin(k * Math.PI) * p.h;
      Sprites.shadow(ctx, lerp(p.x0, p.x1, k), lerp(p.y0, p.y1, k), 2, 1, 0.3);
      ctx.save(); ctx.translate(x, y); ctx.rotate(p.t * 14);
      if (p.kind === 'dynamite') { Sprites.R(ctx, '#b8281a', -1, -3, 3, 6); Sprites.R(ctx, '#ffd04a', 0, -5, 1, 2); }
      else { Sprites.R(ctx, '#5a8a5a', -1, -3, 3, 5); Sprites.R(ctx, '#ff8a2a', 0, -5, 1, 2); }
      ctx.restore();
    }
  }
};

/* ============================================================ Actor combat (replaces the basic version) */
const uxOf = (a, t) => (t.x - a.x) / (dist(a.x, a.y, t.x, t.y) || 1);
const uyOf = (a, t) => (t.y - a.y) / (dist(a.x, a.y, t.x, t.y) || 1);
Actor.prototype.shoot = function (tgt, errMul = 1, dmgMul = 1) {
  const w = WEAPONS[this.weapon];
  if (!w) return;
  if (w.melee) { meleeAttack(this, w.dmg * 0.5, w.range, this.face); return; }
  this.mag--;
  const P = G.player, d = dist(this.x, this.y, tgt.x, tgt.y);
  const lead = 0.12;
  const tx = tgt.x + (tgt.vx || 0) * lead * (tgt.moving ? 1 : 0), ty = tgt.y + (tgt.vy || 0) * lead * (tgt.moving ? 1 : 0);
  const hy = this.mounted ? 16 : 8;
  const a = Math.atan2(ty - (this.y - 2), tx - this.x);
  let err = (1 - this.skill) * 0.2 + (tgt.moving ? 0.06 : 0) + (tgt === P && P.sprinting ? 0.06 : 0) + (tgt.mounted ? 0.05 : 0);
  err += (d / w.range) * 0.16;                 // aim falls off with distance
  if (tgt === P && P.crouch) err += 0.05;      // smaller target when crouched
  if (tgt === P && P.rollT > 0) err += 0.15;
  err *= errMul;
  const mx = this.x + Math.cos(a) * (5 + w.len), my = this.y - hy + Math.sin(a) * (5 + w.len);
  const dm = (tgt === P ? Game.npcDamageMul() : 0.8) * dmgMul;
  const n = w.pellets || 1;
  for (let i = 0; i < n; i++) Bullets.fire(mx, my + (hy - 8), a + rand(-1, 1) * (w.spread + err), this.weapon, this, this.faction, dm);
  FX.muzzle(mx, my, a, n > 1 || w.ammo === 'rifle');
  Sound.play(w.sound, this.x, this.y, 0.85);
  this.recoil = 1;
  Law.gunfire(this.x, this.y, this);
};

Actor.prototype.combat = function (dt, tgt) {
  const w = WEAPONS[this.weapon];
  if (!w || this.surrendered) return;
  const P = G.player, vsPlayer = tgt === P;
  if (this.target !== tgt) { this.target = tgt; this.reactT = Combat.reaction(); this.aimT = 0; if (vsPlayer) this.alertT = 1.1; }
  this.drawn = true;
  this.reactT -= dt; this.alertT = Math.max(0, (this.alertT || 0) - dt);
  const d = dist(this.x, this.y, tgt.x, tgt.y);
  const see = this.canSee(tgt, 520);
  const run = this.mounted ? 130 : this.speedRun * 0.75;
  if (this.reloadT <= 0 && this.mag <= 0) {
    this.reloadT = w.reload === 'single' ? Math.min(3, w.reloadTime * w.cap * 0.55) : w.reloadTime;
    if (this.role === 'gunslinger') this.reloadT = 1.8;
    if (chance(0.5)) this.bark('Reloading!');
    this.burst = 0; if (vsPlayer) Combat.release(this, 0.8);
  }
  if (vsPlayer && this.maybeSurrender()) return;
  if (!this.retreated && this.hp < this.maxHp * 0.35 && this.role !== 'brute') {
    this.retreated = true;
    const c = this.findCover(tgt);
    if (c) { this.coverPos = c; this.coverT = rand(2.5, 4); this.bark('Fall back!'); if (vsPlayer) Combat.release(this); }
  }
  if (this.coverT > 0) {
    this.coverT -= dt; this.aimT = 0;
    if (this.coverPos && this.navigate(this.coverPos.x, this.coverPos.y, run, dt, 6)) this.coverPos = null;
    this.face = Math.atan2(tgt.y - this.y, tgt.x - this.x);
    return;
  }
  if (!see) {
    this.aimT = 0;
    if (vsPlayer) Combat.release(this, 0.5);
    // the player ducked behind cover: hold position for a while, then advance carefully
    if (vsPlayer && P.crouch && d > 50) {
      this.lostT = (this.lostT || 0) + dt;
      if (this.lostT < 5) { this.strafeT -= dt; if (this.strafeT <= 0) { this.strafe = pick([-1, 1, 0]); this.strafeT = rand(1, 2); } this.moveDir(-uyOf(this, tgt) * this.strafe, uxOf(this, tgt) * this.strafe, this.speedWalk * 0.6, dt); return; }
      this.navigate(tgt.x, tgt.y, this.speedWalk, dt, 30);
      return;
    }
    this.navigate(tgt.x, tgt.y, run, dt, 30);
    return;
  }
  this.lostT = 0;
  this.face = Math.atan2(tgt.y - this.y, tgt.x - this.x);
  const ux = (tgt.x - this.x) / (d || 1), uy = (tgt.y - this.y) / (d || 1);
  const mayFire = this.reactT <= 0 && (!vsPlayer || Combat.canShootPlayer(this));
  let pref = clamp(w.range * 0.5, 50, 200);
  if (this.role === 'sharpshooter') pref = clamp(w.range * 0.6, 170, 290);
  if (this.role === 'brute') pref = 24;
  // ---- movement
  if (this.role === 'sharpshooter' && this.aimT > 0) { /* hold still while lining up the shot */ }
  else if (this.role === 'brute') { if (d > pref) this.moveDir(ux, uy, this.speedRun * 0.85, dt); }
  else if (vsPlayer && !mayFire) {
    // waiting for a turn to shoot: work around to the player's side
    if (!this.flankSide || chance(dt * 0.25)) { this.flankSide = pick([-1, 1]); if (chance(0.3)) this.bark('Flank him!'); }
    const fa = Math.atan2(this.y - tgt.y, this.x - tgt.x) + this.flankSide * 0.9;
    this.moveDir(tgt.x + Math.cos(fa) * pref - this.x, tgt.y + Math.sin(fa) * pref - this.y, run * 0.65, dt);
  } else {
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafe = pick([-1, 1, 0, 1, -1]); this.strafeT = rand(0.7, 1.8); }
    let mx = -uy * this.strafe * 0.8, my = ux * this.strafe * 0.8;
    if (d > pref * 1.2) { mx += ux; my += uy; } else if (d < pref * 0.45) { mx -= ux; my -= uy; }
    this.moveDir(mx, my, this.mounted ? 110 : this.speedRun * 0.5, dt);
  }
  // ---- attacks
  if (this.reloadT > 0) return;
  if (this.role === 'dynamiter') {
    this.throwCD -= dt;
    if (mayFire && this.throwCD <= 0 && d > 60 && d < 230) {
      Combat.throwFrom(this, tgt.x + (tgt.vx || 0) * 0.5, tgt.y + (tgt.vy || 0) * 0.5, 'dynamite');
      this.throwCD = rand(5, 8); this.fireCD = 1; this.bark('Fire in the hole!');
      return;
    }
  }
  if (!mayFire || this.mag <= 0 || d > w.range * 0.95) { if (!mayFire) this.aimT = 0; return; }
  if (this.role === 'sharpshooter') {
    if (this.fireCD > 0) return;
    if (!(this.aimT > 0)) { this.aimT = 0.9; return; }
    this.aimT -= dt;
    if (this.aimT > 0) return;
    this.aimT = 0; this.shoot(tgt, 0.3); this.fireCD = w.rate + rand(1.2, 2);
    return;
  }
  if (this.fireCD > 0) return;
  if (this.role === 'gunslinger') {
    this.shoot(tgt, 1.5, 0.7);
    this.burst = (this.burst || 0) + 1;
    if (!this.burstN) this.burstN = randi(3, 4);
    if (this.burst >= this.burstN) { this.burst = 0; this.burstN = 0; this.fireCD = rand(1.2, 2); } else this.fireCD = 0.14;
    return;
  }
  const brute = this.role === 'brute';
  this.shoot(tgt, 1, brute ? 0.6 : 1);
  this.fireCD = w.rate + rand(0.45, 1.2) * (1.25 - this.skill) + (brute ? 1.1 : 0);
  if (this.role !== 'brute' && (chance(dt * 0.07) || (this.hp < this.maxHp * 0.55 && chance(dt * 0.5)))) {
    const c = this.findCover(tgt);
    if (c) { this.coverPos = c; this.coverT = rand(1.4, 2.8); if (vsPlayer) Combat.release(this); }
  }
};

/* the last man standing may throw his hands up */
Actor.prototype.maybeSurrender = function () {
  if (this.surrenderChecked || this.hp > this.maxHp * 0.45 || this.invuln || this.downed > 0) return false;
  const lawOk = this.faction === 'law' && Law.heat <= 3 && this.kind !== 'marshal' && !this.mission;
  if (!(this.faction === 'rival' || lawOk)) return false;
  const allies = G.actors.some(a => a !== this && !a.dead && !a.surrendered && a.downed <= 0 && a.faction === this.faction && dist(a.x, a.y, this.x, this.y) < 350 && (a.aggro || a.engaged || a.forceHostile || a.target));
  if (allies) return false;
  this.surrenderChecked = true;
  if (!chance(this.bountyTarget ? 0.85 : 0.5)) return false;
  this.surrender();
  return true;
};

Actor.prototype.surrender = function () {
  this.surrendered = true; this.state = 'handsup'; this.droppedWeapon = this.weapon; this.weapon = null;
  this.drawn = false; this.aggro = false; this.engaged = false; this.forceHostile = false; this.target = null; this.aimT = 0;
  if (this.mounted) { const h = this.mounted; h.rider = null; h.owner = this.faction === 'law' ? 'law' : 'wild'; h.x = this.x + 10; h.home = { x: h.x, y: h.y }; if (!G.horses.includes(h)) G.horses.push(h); this.mounted = null; this.ownHorse = null; }
  Combat.release(this);
  this.bark("Don't shoot! I give up!", true);
  UI.notify(`${this.name} surrendered. Rob them, ${this.bountyTarget ? 'hogtie them for the bounty' : 'or let them go'}.`, 'info');
  Progress.add(5);
};

/* surrendered and captive NPCs */
Combat.passiveAI = function (a, dt) {
  const P = G.player;
  if (a.captive) {
    a.state = 'handsup';
    a.followPlayer(dt, true);
    return;
  }
  a.state = 'handsup';
  if (a.escortBy && !a.escortBy.dead) {   // a prisoner being led along by lawmen
    const g = a.escortBy;
    if (dist(a.x, a.y, g.x, g.y) > 22) a.navigate(g.x, g.y, a.speedWalk * 1.3, dt, 18);
    return;
  }
  a.face = Math.atan2(P.y - a.y, P.x - a.x);
  if (a.released) {
    const ang = Math.atan2(a.y - P.y, a.x - P.x);
    a.steer(a.x + Math.cos(ang) * 60, a.y + Math.sin(ang) * 60, a.speedRun, dt);
    if (dist(a.x, a.y, P.x, P.y) > 500) a.removeMe = true;
  } else if (dist(a.x, a.y, P.x, P.y) > 600) { a.released = true; }
};

/* follow the player on foot or on a horse (gang companions and captives) */
Actor.prototype.followPlayer = function (dt, slow) {
  const P = G.player;
  if (P.dead) return;
  if (P.mounted && !this.mounted) { if (!this.ownHorse) this.ownHorse = new Horse(pick(['morgan', 'mustang', 'quarter']), this.x, this.y, { owner: 'law' }); this.mounted = this.ownHorse; }
  if (!P.mounted && this.mounted && dist(this.x, this.y, P.x, P.y) < 60) this.mounted = null;
  const d = dist(this.x, this.y, P.x, P.y);
  if (d > 900) { const sp = World.randomOpenNear(P.x, P.y, 30, 70, (x, y) => World.tileAtPx(x, y) === T.FLOOR); if (sp) { this.x = sp.x; this.y = sp.y; this.path = null; } }
  const spd = this.mounted ? (P.mounted ? Math.max(120, P.mounted.speed * 1.05) : 120) : (P.sprinting || P.mounted ? this.speedRun * (slow ? 1 : 1.1) : this.speedWalk * 1.6);
  // each follower keeps its own spot in a loose fan behind the player, so they don't stack up
  const crew = G.actors.filter(a => a.follow && !a.dead && !a.captive);
  const i = Math.max(0, crew.indexOf(this)), n = Math.max(1, crew.length);
  // the player's direction of travel, sampled whenever they've moved a few pixels
  const T0 = Combat.trail || (Combat.trail = { x: P.x, y: P.y, h: P.face });
  if (dist(P.x, P.y, T0.x, T0.y) > 6) { T0.h = Math.atan2(P.y - T0.y, P.x - T0.x); T0.x = P.x; T0.y = P.y; }
  const spread = n > 1 ? (i / (n - 1) - 0.5) * Math.min(2.4, 0.7 * n) : 0;
  const back = (this.mounted ? 34 : 24) + Math.floor(i / 4) * (this.mounted ? 22 : 14);
  const ang = T0.h + Math.PI + spread;
  let gx = P.x + Math.cos(ang) * back, gy = P.y + Math.sin(ang) * back;
  if (this.blocked(gx, gy)) { gx = P.x; gy = P.y; }
  const dg = dist(this.x, this.y, gx, gy);
  if (d > (this.mounted ? 50 : 34) || dg > 12) this.navigate(gx, gy, dg < 30 && d < 80 ? spd * 0.6 : spd, dt, 8);
  // gentle push apart from other followers and the player
  const minD = this.mounted ? 20 : 14;
  for (const o of crew.concat([P])) {
    if (o === this) continue;
    const ox = this.x - o.x, oy = this.y - o.y, od = Math.hypot(ox, oy);
    const lim = o === P ? (P.mounted || this.mounted ? 18 : 10) : (o.mounted || this.mounted ? 20 : minD);
    if (od < lim) { const k = (lim - od) * Math.min(1, dt * 8) / (od || 1); this.move((od ? ox : rand(-1, 1)) * k, (od ? oy : rand(-1, 1)) * k); }
  }
};
