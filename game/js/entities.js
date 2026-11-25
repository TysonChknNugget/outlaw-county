/* Outlaw County — entities.js
 * Particles, bullets, the player, NPC actors with AI, horses, wildlife,
 * the train, stagecoaches and shooting targets.
 */
'use strict';

/* ============================================================ particles */
const FX = {
  pool: [], idx: 0,
  init() { this.pool = []; for (let i = 0; i < 1400; i++) this.pool.push({ on: false }); this.idx = 0; },
  spawn(x, y, vx, vy, life, size, color, type = 'fade', grav = 0, drag = 0) {
    const p = this.pool[this.idx]; this.idx = (this.idx + 1) % this.pool.length;
    p.on = true; p.x = x; p.y = y; p.vx = vx; p.vy = vy; p.life = p.max = life; p.size = size; p.color = color;
    p.type = type; p.grav = grav; p.drag = drag; p.z = 0; p.vz = 0;
    return p;
  },
  update(dt) {
    for (const p of this.pool) {
      if (!p.on) continue;
      p.life -= dt; if (p.life <= 0) { p.on = false; continue; }
      const dr = Math.max(0, 1 - p.drag * dt);
      p.vx *= dr; p.vy *= dr; p.vy += p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.type === 'shell') { p.vz -= 260 * dt; p.z += p.vz * dt; if (p.z < 0) { p.z = 0; p.vz = -p.vz * 0.35; p.vx *= 0.5; p.vy *= 0.5; } }
      if (p.type === 'smoke') p.size += dt * 6;
    }
  },
  draw(ctx, x0, y0, x1, y1) {
    for (const p of this.pool) {
      if (!p.on || p.x < x0 - 20 || p.x > x1 + 20 || p.y < y0 - 20 || p.y > y1 + 20) continue;
      const a = p.life / p.max;
      ctx.fillStyle = p.color;
      if (p.type === 'smoke') { ctx.globalAlpha = a * 0.45; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill(); }
      else if (p.type === 'flash') { ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(p.x, p.y, p.size * (0.6 + a * 0.6), 0, TAU); ctx.fill(); }
      else if (p.type === 'shell') { ctx.globalAlpha = Math.min(1, a * 3); ctx.fillRect(p.x | 0, (p.y - p.z) | 0, 2, 1); }
      else { ctx.globalAlpha = p.type === 'solid' ? 1 : a; ctx.fillRect((p.x - p.size / 2) | 0, (p.y - p.size / 2) | 0, Math.ceil(p.size), Math.ceil(p.size)); }
    }
    ctx.globalAlpha = 1;
  },
  muzzle(x, y, a, big) {
    this.spawn(x + Math.cos(a) * 2, y + Math.sin(a) * 2, 0, 0, 0.06, big ? 6 : 4, '#fff2b0', 'flash');
    this.spawn(x + Math.cos(a) * 4, y + Math.sin(a) * 4, 0, 0, 0.05, big ? 4 : 3, '#ff9a2a', 'flash');
    for (let i = 0; i < (big ? 7 : 4); i++) {
      const s = rand(60, 160), aa = a + rand(-0.35, 0.35);
      this.spawn(x, y, Math.cos(aa) * s, Math.sin(aa) * s, rand(0.05, 0.14), 1, pick(['#ffd04a', '#ff8a2a', '#fff']), 'fade', 0, 6);
    }
    for (let i = 0; i < (big ? 6 : 3); i++) this.spawn(x + Math.cos(a) * 3, y + Math.sin(a) * 3, Math.cos(a) * rand(8, 30) + rand(-6, 6), Math.sin(a) * rand(8, 30) - rand(4, 12), rand(0.7, 1.4), rand(2, 3.5), '#d8d4cc', 'smoke', -4, 2);
    G.tempLights.push({ x, y, r: big ? 90 : 65, life: 0.07, max: 0.07 });
  },
  impact(x, y, kind, a = 0) {
    const cols = { dust: ['#b89a72', '#9a7e5a', '#d8c09a'], spark: ['#ffe08a', '#fff', '#ffb040'], wood: ['#8a5a32', '#c09060', '#6a4426'], water: ['#cfe8f8', '#8ab8d8', '#fff'], blood: ['#8a1010', '#b01818', '#600808'], glass: ['#cfe8d8', '#fff', '#8ac0a0'] }[kind] || ['#999'];
    const n = kind === 'blood' ? 7 : 6;
    for (let i = 0; i < n; i++) {
      const aa = a + Math.PI + rand(-1.1, 1.1), s = rand(20, kind === 'spark' ? 120 : 70);
      this.spawn(x, y, Math.cos(aa) * s, Math.sin(aa) * s, rand(0.15, 0.45), kind === 'spark' ? 1 : rand(1, 2), pick(cols), 'fade', kind === 'blood' ? 120 : 40, 4);
    }
    if (kind === 'dust') this.spawn(x, y, rand(-5, 5), -rand(4, 10), 0.8, 2.5, '#c8b498', 'smoke', 0, 2);
  },
  shell(x, y, face) {
    const a = face + (Math.cos(face) > 0 ? -1.9 : 1.9);
    const p = this.spawn(x, y, Math.cos(a) * rand(25, 45), Math.sin(a) * rand(10, 25), 2.2, 1, '#d8a83a', 'shell', 0, 1.5);
    p.vz = rand(40, 70); Sound.play('brass', x, y, 0.6);
  },
  dust(x, y, n = 2, col = '#c8b498') {
    for (let i = 0; i < n; i++) this.spawn(x + rand(-3, 3), y + rand(-1, 1), rand(-12, 12), -rand(2, 10), rand(0.4, 0.8), rand(1.5, 3), col, 'smoke', 0, 3);
  },
  explosion(x, y) {
    for (let i = 0; i < 40; i++) { const a = rand(TAU), s = rand(30, 180); this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, rand(0.2, 0.6), rand(1, 3), pick(['#ffd04a', '#ff8a2a', '#ff4a1a', '#fff']), 'fade', 60, 3); }
    for (let i = 0; i < 18; i++) { const a = rand(TAU), s = rand(10, 50); this.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s - 10, rand(1.2, 2.6), rand(4, 8), pick(['#4a4440', '#6a625a', '#8a827a']), 'smoke', -6, 1.2); }
    this.spawn(x, y, 0, 0, 0.18, 26, '#fff2b0', 'flash');
    G.tempLights.push({ x, y, r: 220, life: 0.35, max: 0.35 });
    G.cam.shake = Math.max(G.cam.shake, 9);
    Sound.play('explosion', x, y);
  }
};

const Floaters = {
  add(x, y, text, color = '#fff') { G.floaters.push({ x, y, text, color, life: 1.6 }); if (G.floaters.length > 30) G.floaters.shift(); }
};

/* ============================================================ base entity */
class Ent {
  constructor(x, y) { this.x = x; this.y = y; this.vx = 0; this.vy = 0; this.r = 5; this.face = 0; this.animT = 0; this.hurtT = 0; this.dead = false; this.moving = false; }
  blocked(x, y) { return World.circleBlocked(x, y, this.r) || Vehicles.blocks(x, y, this.r, this); }
  move(dx, dy) {
    let moved = false;
    // something already overlapping a wall (spawned or pushed into it) may move freely until it is clear
    const stuck = this.blocked(this.x, this.y);
    if (dx) { const nx = this.x + dx; if (stuck || !this.blocked(nx, this.y)) { this.x = nx; moved = true; } }
    if (dy) { const ny = this.y + dy; if (stuck || !this.blocked(this.x, ny)) { this.y = ny; moved = true; } }
    this.x = clamp(this.x, 8, World.W * TS - 8); this.y = clamp(this.y, 8, World.H * TS - 8);
    return moved;
  }
  /* local obstacle-avoiding steering toward a point */
  steer(gx, gy, speed, dt) {
    const base = Math.atan2(gy - this.y, gx - this.x);
    for (const off of [0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3]) {
      const a = base + off * (this.steerSide || 1);
      const lx = this.x + Math.cos(a) * 10, ly = this.y + Math.sin(a) * 10;
      if (!this.blocked(lx, ly)) {
        const ox = this.x, oy = this.y;
        this.move(Math.cos(a) * speed * dt, Math.sin(a) * speed * dt);
        this.moveAngle = a;
        return dist(ox, oy, this.x, this.y) > 0.01;
      }
    }
    this.steerSide = -(this.steerSide || 1);
    return false;
  }
}

/* ============================================================ bullets */
const Bullets = {
  pool: [],
  init() { this.pool = []; for (let i = 0; i < 320; i++) this.pool.push({ on: false }); },
  fire(x, y, a, wkey, owner, fac, dmgMul = 1, crit = false) {
    const w = WEAPONS[wkey];
    const b = this.pool.find(p => !p.on); if (!b) return;
    b.on = true; b.x = x; b.y = y; b.px = x; b.py = y; b.vx = Math.cos(a) * w.speed; b.vy = Math.sin(a) * w.speed;
    b.a = a; b.d = 0; b.range = w.range * rand(0.9, 1.05); b.dmg = w.dmg * dmgMul; b.owner = owner; b.fac = fac; b.w = wkey; b.crit = crit;
  },
  canHit(b, e) {
    if (e === b.owner || e.dead || e.inside) return false;
    if (b.fac === 'player') return e.faction !== 'gang' || !e.invuln;
    if (e === G.player) return b.fac !== 'gang';
    if (b.fac === e.faction) return false;
    return true;
  },
  update(dt) {
    const P = G.player;
    for (const b of this.pool) {
      if (!b.on) continue;
      const total = Math.hypot(b.vx, b.vy) * dt, steps = Math.max(1, Math.ceil(total / 4));
      b.px = b.x; b.py = b.y;
      for (let s = 0; s < steps && b.on; s++) {
        const ox = b.x, oy = b.y;
        b.x += b.vx * dt / steps; b.y += b.vy * dt / steps; b.d += total / steps;
        const tx = Math.floor(b.x / TS), ty = Math.floor((b.y + 6) / TS);
        if (World.sol(tx, ty) & SOL.SHOT) {
          const t = World.tile(tx, ty);
          FX.impact(b.x, b.y, t === T.WALL ? 'wood' : t === T.ROCK ? (chance(0.5) ? 'spark' : 'dust') : 'wood', b.a);
          if (t === T.ROCK && chance(0.25)) Sound.play('ricochet', b.x, b.y, 0.6);
          b.on = false; break;
        }
        // entity hits
        const hit = this.testHit(b, ox, oy);
        if (hit === 'cover') { FX.impact(b.x, b.y, chance(0.5) ? 'wood' : 'dust', b.a); if (chance(0.3)) Sound.play('ricochet', b.x, b.y, 0.5); b.on = false; break; }
        if (hit) { this.applyHit(b, hit); b.on = false; break; }
        if (b.d > b.range) {
          const t = World.tileAtPx(b.x, b.y + 6);
          FX.impact(b.x, b.y + 6, t === T.WATER ? 'water' : 'dust', b.a);
          b.on = false;
        }
      }
    }
  },
  segHit(ax, ay, bx, by, cx, cy, r) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
    const t = clamp(((cx - ax) * dx + (cy - ay) * dy) / l2, 0, 1);
    return dist2(ax + dx * t, ay + dy * t, cx, cy) < r * r;
  },
  testHit(b, ox, oy) {
    const P = G.player;
    if (P !== b.owner && !P.dead && this.canHit(b, P) && Math.abs(P.x - b.x) < 24) {
      if (this.segHit(ox, oy, b.x, b.y, P.x, P.y - (P.mounted ? 14 : P.crouch ? 3 : 6), P.mounted ? 7 : P.crouch ? 4.5 : 5.5)) {
        if (P.rollT > 0.1) return null;          // rolled through it
        return Combat.coverBlocks(b) ? 'cover' : P;
      }
    }
    for (const a of G.actors) {
      if (Math.abs(a.x - b.x) > 24 || Math.abs(a.y - b.y) > 30 || !this.canHit(b, a)) continue;
      if (this.segHit(ox, oy, b.x, b.y, a.x, a.y - (a.mounted ? 14 : 6), a.mounted ? 7 : 5.5)) return a;
    }
    for (const h of G.horses) {
      if (h.dead || h.rider === b.owner || Math.abs(h.x - b.x) > 24 || Math.abs(h.y - b.y) > 30) continue;
      if (this.segHit(ox, oy, b.x, b.y, h.x, h.y - 9, 8)) return h;
    }
    for (const an of G.animals) {
      if (an.dead || Math.abs(an.x - b.x) > 20 || Math.abs(an.y - b.y) > 20) continue;
      if (this.segHit(ox, oy, b.x, b.y, an.x, an.y - 4, an.kind === 'rabbit' ? 4 : 6)) return an;
    }
    for (const c of G.coaches) {
      if (c === b.owner || Math.abs(c.x - b.x) > 40 || Math.abs(c.y - b.y) > 30) continue;
      if (this.segHit(ox, oy, b.x, b.y, c.x, c.y - 12, 16)) return c;
    }
    for (const tg of G.targets) {
      if (tg.hit) continue;
      if (this.segHit(ox, oy, b.x, b.y, tg.x, tg.y - 6, 4)) return tg;
    }
    return null;
  },
  applyHit(b, e) {
    if (e instanceof Target) { e.shatter(); return; }
    if (e instanceof Stagecoach) { e.hurt(b.dmg, b.owner, b.x, b.y); return; }
    Combat.lastCrit = !!b.crit;
    e.hurt(b.dmg, b.owner, b.a);
    Combat.lastCrit = false;
  },
  draw(ctx) {
    for (const b of this.pool) {
      if (!b.on) continue;
      const tl = b.w === 'shotgun' ? 4 : 9;
      const sp = Math.hypot(b.vx, b.vy);
      ctx.strokeStyle = 'rgba(255,236,170,0.85)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(b.x - b.vx / sp * tl, b.y - b.vy / sp * tl); ctx.lineTo(b.x, b.y); ctx.stroke();
      ctx.fillStyle = '#fff'; ctx.fillRect(b.x | 0, b.y | 0, 1, 1);
    }
  }
};

function meleeAttack(att, dmg, range, face, nonlethal) {
  const hx = att.x + Math.cos(face) * 8, hy = att.y - 6 + Math.sin(face) * 8;
  let hit = null, best = 1e9;
  const test = e => {
    if (e === att || e.dead || e.inside) return;
    const d = dist(hx, hy, e.x, e.y - 6);
    if (d < range + 6 && d < best) { best = d; hit = e; }
  };
  for (const a of G.actors) if (!(att === G.player && a.faction === 'gang' && a.invuln)) test(a);
  for (const a of G.animals) test(a);
  if (att !== G.player) test(G.player);
  if (hit) {
    hit.hurt(dmg, att, face, { nonlethal });
    Sound.play('punch', hx, hy);
    FX.impact(hx, hy, nonlethal ? 'dust' : 'blood', face + Math.PI);
  }
  return hit;
}

/* ============================================================ player */
class Player extends Ent {
  constructor() { super(0, 0); this.reset(); }
  reset() {
    const s = World.poi.start;
    this.x = s.x; this.y = s.y; this.r = 5;
    this.hp = this.maxHp = 100; this.stamina = 100; this.money = 25;
    this.owned = { fists: true, knife: true, sa: true };
    this.nerve = 0; this.steady = 0; this.rollT = 0; this.rollCD = 0; this.crouch = false; this.lastHurt = 99; this.lastFire = 99;
    this.xp = 0; this.level = 1; this.perkPoints = 0; this.perks = {}; this.throwSel = 'dynamite'; this.throwCD = 0;
    this.mag = { sa: 6, da: 6, lever: 10, shotgun: 2, repeater: 7 };
    this.ammo = { revolver: 24, rifle: 0, shells: 0 };
    this.cur = 'sa'; this.lastRevolver = 'sa';
    this.inv = { bandage: 2, whiskey: 1 };
    this.horse = null; this.mounted = null;
    this.fireCD = 0; this.reload = null; this.recoil = 0; this.cockT = 0; this.leverT = 0; this.swingT = 0; this.drawnT = 0;
    this.dead = false; this.deathT = 0; this.invuln = 0; this.staminaDelay = 0; this.hidden = false; this.stepT = 0;
    this.faction = 'player'; this.sprinting = false; this.inBuilding = null;
  }
  get drawn() { return this.drawnT > 0 || Input.mouse.rdown || !!this.reload || this.swingT > 0; }

  update(dt) {
    this.hurtT = Math.max(0, this.hurtT - dt); this.invuln = Math.max(0, this.invuln - dt);
    if (this.dead) { this.deathT += dt; return; }
    this.fireCD -= dt; this.recoil = Math.max(0, this.recoil - dt * 6); this.swingT = Math.max(0, this.swingT - dt); this.drawnT -= dt;
    this.lastHurt += dt; this.lastFire += dt; this.rollCD -= dt;
    const mw = G.mouseWorld;
    this.face = Math.atan2(mw.y - (this.y - (this.mounted ? 16 : 8)), mw.x - this.x);
    let ix = (Input.down('KeyD') || Input.down('ArrowRight') ? 1 : 0) - (Input.down('KeyA') || Input.down('ArrowLeft') ? 1 : 0);
    let iy = (Input.down('KeyS') || Input.down('ArrowDown') ? 1 : 0) - (Input.down('KeyW') || Input.down('ArrowUp') ? 1 : 0);
    const shift = Input.down('ShiftLeft') || Input.down('ShiftRight');
    if (Law.arrest && Law.arrest.surrendering) { ix = iy = 0; }
    // health slowly comes back out of combat
    if (this.lastHurt > 6 && this.lastFire > 4) {
      const medic = Progress.has('medic'), cap = this.maxHp * (medic ? 0.75 : 0.5);
      if (this.hp < cap) this.hp = Math.min(cap, this.hp + (medic ? 6 : 4) * dt);
    }
    // precise shots: hold steady aim until the crosshair settles
    if (Input.mouse.rdown && !this.sprinting && this.rollT <= 0 && !WEAPONS[this.cur].melee) this.steady = Math.min(1, this.steady + dt / (0.65 * (Progress.has('steadyhand') ? 0.6 : 1)) * (this.moving ? 0.5 : 1));
    else this.steady = Math.max(0, this.steady - dt * 3);
    if (Input.hit('KeyC') && !this.mounted) { this.crouch = !this.crouch; Sound.play('step', this.x, this.y); }
    if (Input.hit('KeyG')) Combat.playerThrow();
    if (Input.hit('KeyX')) Combat.cycleThrowable();
    if (Input.hit('KeyV')) Combat.toggleNerves();
    // dodge roll
    const rollCost = Progress.has('sprinter') ? 15 : 25;
    if (Input.hit('Space') && !this.mounted && this.rollT <= 0 && this.rollCD <= 0 && !(Law.arrest && Law.arrest.surrendering)) {
      if (this.stamina >= rollCost) {
        const l = Math.hypot(ix, iy);
        this.rollA = l ? Math.atan2(iy, ix) : this.face;
        this.rollT = 0.36; this.rollCD = 0.5; this.stamina -= rollCost; this.staminaDelay = 1; this.crouch = false;
        this.reload = null; Sound.play('roll', this.x, this.y); FX.dust(this.x, this.y, 4);
      } else Floaters.add(this.x, this.y - 22, 'Too tired to roll', '#ffd27a');
    }
    if (this.rollT > 0) {
      this.rollT -= dt;
      this.move(Math.cos(this.rollA) * 205 * dt, Math.sin(this.rollA) * 205 * dt);
      this.vx = Math.cos(this.rollA) * 60; this.vy = Math.sin(this.rollA) * 60;
      this.moving = true; this.animT += dt * 2;
      this.inBuilding = World.buildingAt(this.x, this.y);
      return;
    }
    if (this.mounted) {
      const h = this.mounted;
      h.control(ix, iy, shift, dt);
      this.x = h.x; this.y = h.y; this.moving = h.speed > 5; this.sprinting = shift && h.speed > h.def.speed;
      this.animT += dt;
      if (!h.dead && h.hp <= 0) this.dismount(true);
    } else {
      const len = Math.hypot(ix, iy); if (len) { ix /= len; iy /= len; }
      this.sprinting = shift && len > 0 && this.stamina > 1 && !(Input.mouse.rdown);
      if (this.sprinting) this.crouch = false;
      const spd = (this.sprinting ? 102 : this.crouch ? 30 : Input.mouse.rdown ? 44 : 58) * World.terrainMul(this.x, this.y);
      const k = Math.min(1, dt * 12);
      this.vx += (ix * spd - this.vx) * k; this.vy += (iy * spd - this.vy) * k;
      const ox = this.x, oy = this.y;
      this.move(this.vx * dt, this.vy * dt);
      const moved = dist(ox, oy, this.x, this.y);
      this.moving = moved > 0.15 * dt * 60;
      this.animT += moved / 58;
      if (this.sprinting) { this.stamina = Math.max(0, this.stamina - 15 * dt * (Progress.has('sprinter') ? 0.65 : 1)); this.staminaDelay = 1; }
      else if (this.staminaDelay > 0) this.staminaDelay -= dt;
      else this.stamina = Math.min(100, this.stamina + 16 * dt);
      if (this.moving) {
        this.stepT -= dt;
        if (this.stepT <= 0) {
          this.stepT = this.sprinting ? 0.24 : 0.36;
          const t = World.tileAtPx(this.x, this.y);
          if (t === T.SAND || t === T.ROAD || t === T.DRYBED || t === T.TOWN || t === T.CANYON || t === T.CLAY) FX.dust(this.x, this.y, 1);
          else if (t === T.SHALLOW) FX.impact(this.x, this.y, 'water', -Math.PI / 2);
          Sound.play('step', this.x, this.y, t === T.FLOOR || t === T.BOARD || t === T.BRIDGE ? 1.4 : 0.6);
        }
      }
    }
    const tx = Math.floor(this.x / TS), ty = Math.floor(this.y / TS);
    this.hidden = !this.mounted && (World.sol(tx, ty) & SOL.VIS) !== 0;
    this.inBuilding = World.buildingAt(this.x, this.y);

    // weapon selection
    if (Input.hit('Digit1')) this.select(this.cur === 'fists' ? 'knife' : 'fists');
    if (Input.hit('Digit2')) {
      if ((this.cur === 'sa' || this.cur === 'da') && this.owned.sa && this.owned.da) this.select(this.cur === 'sa' ? 'da' : 'sa');
      else this.select(this.owned[this.lastRevolver] ? this.lastRevolver : (this.owned.sa ? 'sa' : 'da'));
    }
    if (Input.hit('Digit3')) this.select('lever');
    if (Input.hit('Digit4')) this.select('shotgun');
    if (Input.hit('Digit5')) this.select('repeater');
    if (Input.wheel) {
      const list = WEAPON_ORDER.filter(k => this.owned[k]);
      const i = list.indexOf(this.cur);
      this.select(list[(i + (Input.wheel > 0 ? 1 : -1) + list.length) % list.length]);
    }
    if (Input.hit('KeyR')) this.startReload();
    if (Input.hit('KeyQ')) Economy.useItem('bandage');
    if (Input.hit('KeyH')) this.whistle();
    if (Input.hit('KeyF')) this.toggleMount();
    if (Input.mouse.down && !Interact.action && !(Law.arrest && Law.arrest.surrendering)) this.tryFire();
    this.updateReload(dt);
    if (this.cockT > 0) { const b = this.cockT; this.cockT -= dt; if (b > 0.16 && this.cockT <= 0.16) Sound.play('cock', this.x, this.y, 0.8); }
    if (this.leverT > 0) { const b = this.leverT; this.leverT -= dt; if (b > 0.3 && this.leverT <= 0.3) { Sound.play('lever', this.x, this.y, 0.8); FX.shell(this.x, this.y - 8, this.face); } }
  }

  select(key) {
    if (!this.owned[key] || this.cur === key) return;
    this.cur = key; this.reload = null; this.drawnT = 1.2; this.fireCD = Math.max(this.fireCD, 0.25);
    if (key === 'sa' || key === 'da') this.lastRevolver = key;
    Sound.play('click', this.x, this.y, 0.7);
  }

  tryFire() {
    const w = WEAPONS[this.cur];
    if (this.fireCD > 0) return;
    if (w.melee) {
      this.swingT = 0.25; this.fireCD = w.rate; this.drawnT = 2; this.lastFire = 0;
      Sound.play(w.nonlethal ? 'punch' : 'knife', this.x, this.y, w.nonlethal ? 0.5 : 1);
      meleeAttack(this, w.dmg, w.range, this.face, w.nonlethal);
      return;
    }
    if (this.mag[this.cur] <= 0) {
      Sound.play('empty', this.x, this.y); this.fireCD = 0.3;
      if (this.ammo[w.ammo] > 0) this.startReload(); else Floaters.add(this.x, this.y - 22, 'Out of ammo', '#ff9a7a');
      return;
    }
    if (this.reload) { if (w.reload === 'single') this.reload = null; else return; }
    this.mag[this.cur]--;
    const a = this.face;
    let sm = 1;
    if (this.moving) sm *= 1.5; if (this.mounted) sm *= 1.35; if (this.sprinting) sm *= 1.5; if (Input.mouse.rdown) sm *= 0.55;
    if (Combat.nervesOn) sm *= 0.4;
    const crit = this.steady >= 1;
    if (crit) sm *= 0.3;
    const dmgMul = (crit ? 1.8 : 1) * (Progress.has('gunfighter') ? 1.15 : 1);
    const hy = this.mounted ? 16 : 8;
    const mx = this.x + Math.cos(a) * (5 + w.len), my = this.y - hy + Math.sin(a) * (5 + w.len);
    const n = w.pellets || 1;
    for (let i = 0; i < n; i++) Bullets.fire(mx, my + (hy - 8), a + rand(-1, 1) * w.spread * sm, this.cur, this, 'player', dmgMul, crit);
    this.steady = 0; this.lastFire = 0;
    FX.muzzle(mx, my, a, n > 1 || w.ammo === 'rifle');
    Sound.play(w.sound, this.x, this.y);
    this.fireCD = w.rate; this.recoil = 1; this.drawnT = 3;
    if (G.settings.shake) G.cam.shake = Math.max(G.cam.shake, w.recoil * 0.9);
    G.cam.kick = w.recoil;
    if (w.cock) this.cockT = 0.34;
    if (w.lever) this.leverT = 0.45;
    if (this.cur === 'repeater') FX.shell(this.x, this.y - 8, a);
    G.stats.shots++;
    Law.gunfire(this.x, this.y, this);
  }

  startReload() {
    const w = WEAPONS[this.cur];
    if (w.melee || this.reload || this.mag[this.cur] >= w.cap) return;
    if (this.ammo[w.ammo] <= 0) { Floaters.add(this.x, this.y - 22, 'No ' + AMMO[w.ammo].name, '#ff9a7a'); Sound.play('empty', this.x, this.y); return; }
    this.reload = { t: (w.reloadTime + (w.reload === 'single' ? 0.25 : 0)) * this.reloadMul(), key: this.cur };
    this.drawnT = 2;
    if (this.cur === 'sa' || this.cur === 'da') {
      Sound.play('cylinder', this.x, this.y);
      for (let i = this.mag[this.cur]; i < w.cap; i++) FX.shell(this.x, this.y - 8, this.face + rand(-0.4, 0.4));
    } else if (this.cur === 'shotgun') {
      Sound.play('click', this.x, this.y);
      for (let i = this.mag.shotgun; i < 2; i++) FX.shell(this.x, this.y - 8, this.face);
    } else Sound.play('click', this.x, this.y, 0.6);
  }

  updateReload(dt) {
    const r = this.reload; if (!r) return;
    if (r.key !== this.cur) { this.reload = null; return; }
    const w = WEAPONS[this.cur];
    r.t -= dt;
    if (r.t > 0) return;
    if (w.reload === 'single') {
      if (this.ammo[w.ammo] > 0 && this.mag[this.cur] < w.cap) { this.mag[this.cur]++; this.ammo[w.ammo]--; Sound.play('shellIn', this.x, this.y, 0.8); }
      if (this.mag[this.cur] < w.cap && this.ammo[w.ammo] > 0) r.t = w.reloadTime * this.reloadMul();
      else { this.reload = null; Sound.play(w.lever ? 'lever' : 'cock', this.x, this.y, 0.7); }
    } else {
      const n = Math.min(w.cap - this.mag[this.cur], this.ammo[w.ammo]);
      this.mag[this.cur] += n; this.ammo[w.ammo] -= n; this.reload = null;
      Sound.play(this.cur === 'shotgun' ? 'cock' : 'lever', this.x, this.y);
    }
  }

  reloadMul() { return Progress.has('quickhands') ? 0.7 : 1; }

  hurt(dmg, src, angle) {
    if (this.invuln > 0 || this.dead) return;
    if (this.rollT > 0.1 && src !== null) return;
    if (this.mounted && chance(0.3)) { this.mounted.hurt(dmg, src); return; }
    this.hp -= dmg; this.hurtT = 0.3; this.lastHurt = 0;
    if (angle !== undefined && !this.mounted) { this.move(Math.cos(angle) * 3, Math.sin(angle) * 3); }
    FX.impact(this.x, this.y - 6, 'blood', angle || 0);
    Sound.play('hurt', this.x, this.y);
    UI.flashDamage(Math.min(1, dmg / 40));
    if (G.settings.shake) G.cam.shake = Math.max(G.cam.shake, 3);
    if (this.hp <= 0) this.die();
  }

  die() {
    this.hp = 0; this.dead = true; this.deathT = 0;
    if (this.mounted) this.dismount(true);
    Interact.cancel();
    Sound.play('die', this.x, this.y);
    G.stats.deaths++;
    Game.onPlayerDeath();
  }

  whistle() {
    Sound.play('whistle', this.x, this.y);
    const h = this.horse;
    if (!h || h.dead) { Floaters.add(this.x, this.y - 22, 'You have no horse', '#ffd27a'); return; }
    if (h.rider) return;
    if (dist(h.x, h.y, this.x, this.y) > 2200) { Floaters.add(this.x, this.y - 22, h.name + ' is too far away', '#ffd27a'); return; }
    h.whistled = true; h.whistleT = 25;
    Sound.play('neigh', h.x, h.y);
  }

  toggleMount() {
    if (this.dead) return;
    if (this.mounted) { this.dismount(false); return; }
    let best = null, bd = 30;
    for (const h of G.horses) {
      if (h.dead || h.rider || h.owner === 'shop') continue;
      const d = dist(h.x, h.y, this.x, this.y);
      if (d < bd) { bd = d; best = h; }
    }
    if (!best) {
      const shopH = G.horses.find(h => h.owner === 'shop' && dist(h.x, h.y, this.x, this.y) < 30);
      if (shopH) Floaters.add(this.x, this.y - 22, 'Buy horses from the stable keeper', '#ffd27a');
      return;
    }
    this.mount(best);
  }

  mount(h) {
    if (h.owner === 'town' || h.owner === 'law') {
      Law.commit(h.owner === 'law' ? 'horse_theft' : 'horse_theft', h.x, h.y);
      UI.notify('You stole a horse.', 'crime');
    }
    if (h.owner !== 'player') {
      if (this.horse && this.horse !== h && !this.horse.dead) { this.horse.owner = 'wild'; this.horse.home = { x: this.horse.x, y: this.horse.y }; UI.notify(this.horse.name + ' wandered off.', 'info'); }
      const wasWild = h.owner === 'wild';
      h.owner = 'player'; h.saddle = true; this.horse = h;
      UI.notify(wasWild ? `You broke in a wild ${h.def.name}. You named it ${h.name}.` : `${h.name} the ${h.def.name} is yours now.`, 'good');
    }
    h.rider = this; h.whistled = false; this.mounted = h; this.reload = null;
    this.x = h.x; this.y = h.y; h.heading = h.face;
    Sound.play('neigh', h.x, h.y, 0.7);
  }

  dismount(forced) {
    const h = this.mounted; if (!h) return;
    h.rider = null; this.mounted = null; h.speed = forced ? 0 : h.speed * 0.2;
    const side = h.heading + Math.PI / 2;
    const spots = [[Math.cos(side) * 14, Math.sin(side) * 14], [-Math.cos(side) * 14, -Math.sin(side) * 14], [0, 14], [0, -14], [14, 0], [-14, 0]];
    for (const [dx, dy] of spots) if (!World.circleBlocked(h.x + dx, h.y + dy, this.r) && !Vehicles.blocks(h.x + dx, h.y + dy, this.r)) { this.x = h.x + dx; this.y = h.y + dy; break; }
    if (forced && !this.dead) { this.hurt(8); UI.notify('You were thrown from your horse!', 'bad'); }
  }

  drawOpts(mounted) {
    return {
      face: this.face, moving: this.moving && !mounted, animT: this.animT, pal: PAL.player, weapon: this.cur, drawn: this.drawn,
      recoil: this.recoil, reload: this.reload ? (this.reload.t + 0.01) : 0, swing: this.swingT > 0 ? this.swingT / 0.25 : 0,
      holster: this.cur !== 'knife', longgun: this.owned.lever || this.owned.repeater, mounted, hurt: this.hurtT,
      state: this.dead ? 'dead' : (Law.arrest && Law.arrest.surrendering ? 'handsup' : (this.crouch && !mounted ? 'kneel' : 'normal')), deadT: this.deathT, masked: Law.heat > 0
    };
  }
  draw(ctx) {
    if (this.mounted) return; // drawn by the horse
    if (this.hidden) ctx.globalAlpha = 0.75;
    if (this.rollT > 0 && !this.dead) {
      // tumble: spin the figure around its middle
      const k = 1 - this.rollT / 0.36, s = Math.cos(this.rollA) < 0 ? -1 : 1;
      Sprites.shadow(ctx, this.x, this.y, 5, 2);
      ctx.save(); ctx.translate(this.x, this.y - 5); ctx.rotate(k * TAU * s); ctx.translate(-this.x, -(this.y - 5));
      const o = this.drawOpts(false); o.drawn = false; o.moving = false;
      Sprites.human(ctx, this.x, this.y + 3, o);
      ctx.restore();
    } else Sprites.human(ctx, this.x, this.y, this.drawOpts(false));
    ctx.globalAlpha = 1;
  }
  drawMounted(ctx, x, y) { Sprites.human(ctx, x - Math.cos(this.mounted.heading) * 1, y - 9, this.drawOpts(true)); }
}

/* ============================================================ actors (NPCs) */
let ACTOR_ID = 1;
const FIRST = ['Amos', 'Cyrus', 'Eli', 'Hank', 'Jeb', 'Luther', 'Moses', 'Otis', 'Silas', 'Wade', 'Clem', 'Rufus', 'Abel', 'Virgil', 'Ezra', 'Mae', 'Clara', 'Hattie', 'Ida', 'Josie', 'Ada', 'Nell', 'Pearl'];
const LAST = ['Calloway', 'Dunn', 'Pruitt', 'Hale', 'McCrae', 'Whitlock', 'Bramble', 'Tolliver', 'Gaines', 'Holt', 'Varner', 'Sutter', 'Crowe'];
const BARKS = {
  lawSpot: ["There he is!", "Stop right there!", "Outlaw! Over here!", "Take him down!"],
  lawArrest: ["Hands where I can see 'em!", "You're under arrest!", "Easy now... drop it."],
  lawSearch: ["Where'd he go?", "Spread out!", "Check behind the buildings!"],
  civFlee: ["Lord have mercy!", "Help! Sheriff!", "Don't shoot!", "Run!"],
  civHandsUp: ["Don't shoot, mister!", "Take it! Just take it!"],
  rival: ["Get him, boys!", "Rattlesnakes, ride!", "Fill him with lead!"],
  gang: ["I got your back!", "Give 'em hell!", "Keep your head down!"],
  greet: ["Mornin'.", "Hot one today.", "Watch yourself, stranger.", "Howdy.", "Evenin'.", "Mind your manners in Dustwater."]
};

function npcHostile(a, b) {
  const fa = a.faction, fb = b.faction;
  if (a.surrendered || b.surrendered || a.captive || b.captive || a.downed > 0 || b.downed > 0) return false;
  if ((a.raider && fb === 'civ') || (b.raider && fa === 'civ')) return true;
  if (fa === fb || fa === 'civ' || fb === 'civ') return false;
  if ((fa === 'law' && fb === 'rival') || (fa === 'rival' && fb === 'law')) return true;
  if ((fa === 'gang' && fb === 'rival') || (fa === 'rival' && fb === 'gang')) return a.aggro || b.aggro || fa === 'gang';
  if ((fa === 'gang' && fb === 'law') || (fa === 'law' && fb === 'gang')) { const l = fa === 'law' ? a : b; return Law.heat >= 2 || l.forceHostile; }
  return false;
}

class Actor extends Ent {
  constructor(kind, x, y, o = {}) {
    super(x, y);
    this.id = ACTOR_ID++; this.kind = kind;
    this.faction = { civilian: 'civ', clerk: 'civ', lawman: 'law', guard: 'law', marshal: 'law', rival: 'rival', gang: 'gang', prisoner: 'gang' }[kind];
    const defPal = { civilian: () => pick(CIV_PALS), clerk: () => CIV_PALS[0], lawman: () => PAL.lawman, guard: () => PAL.guard, marshal: () => PAL.marshal, rival: () => PAL.rival, gang: () => PAL.gang, prisoner: () => PAL.gang };
    this.pal = o.pal || defPal[kind]();
    this.name = o.name || (pick(FIRST) + ' ' + pick(LAST));
    this.maxHp = this.hp = o.hp || { civ: 45, law: 100, rival: 80, gang: 150 }[this.faction];
    const defW = { civ: null, law: pick(['sa', 'sa', 'repeater', 'shotgun', 'lever']), rival: pick(['sa', 'da', 'shotgun', 'lever', 'repeater']), gang: pick(['sa', 'repeater']) };
    this.weapon = o.weapon !== undefined ? o.weapon : defW[this.faction];
    this.mag = this.weapon ? WEAPONS[this.weapon].cap : 0;
    this.skill = o.skill || { law: 0.68, rival: 0.55, gang: 0.8, civ: 0 }[this.faction];
    this.state = o.state || 'idle'; this.timer = rand(0.5, 3);
    this.home = o.home || { x, y }; this.town = o.town || null; this.building = o.building || null;
    this.path = null; this.pathT = 0; this.pathGoal = null; this.stuckT = 0;
    this.target = null; this.fireCD = rand(0.6, 1.4); this.reloadT = 0; this.recoil = 0;
    this.inside = false; this.insideT = 0; this.witness = null; this.mounted = o.mounted || null;
    this.invuln = !!o.invuln; this.downed = 0; this.mission = o.mission || null; this.temp = !!o.temp;
    this.deadT = 0; this.looted = false;
    this.cash = o.cash !== undefined ? o.cash : { law: randi(4, 18), rival: randi(8, 28), civ: randi(1, 14), gang: 0 }[this.faction];
    this.speedWalk = 34 + rand(10); this.speedRun = 86 + rand(12);
    this.forceHostile = !!o.forceHostile; this.aggro = !!o.aggro; this.follow = !!o.follow;
    this.coverT = 0; this.coverPos = null; this.strafe = 1; this.strafeT = 0;
    this.patrol = o.patrol || null; this.patrolI = randi(0, 10); this.post = o.post || null;
    this.shopId = o.shopId || null; this.handsUpT = 0; this.barkText = null; this.barkT = 0;
    this.camp = o.camp || null; this.drawn = false; this.engaged = false; this.fleeFrom = null;
    this.encounter = !!o.encounter; this.role = o.role || null; this.aimAtT = 0; this.talk = o.talk || null;
    this.lod = 0; this.giver = o.giver || null; this.ownHorse = o.ownHorse || null;
    this.face = rand(TAU); this.lastPos = { x, y };
    this.kx = 0; this.ky = 0; this.reactT = 0; this.alertT = 0; this.aimT = 0;
    this.raider = !!o.raider; this.bountyTarget = !!o.bountyTarget; this.noRole = !!o.noRole;
    const role = this.role; this.role = null;
    if (role) Combat.applyRole(this, role); else Combat.assignRole(this);
  }

  bark(list, force) {
    if (this.barkT > 0 && !force) return;
    this.barkText = Array.isArray(list) ? pick(list) : list; this.barkT = 2.2;
  }

  canSee(e, range = 260) {
    if (!e || e.dead || e.inside) return false;
    let r = range * Env.visionMul();
    if (e === G.player && G.player.hidden) r = 34;
    const d = dist(this.x, this.y, e.x, e.y);
    if (d > r) return false;
    // a player crouched behind cover can't be seen past it
    if (e === G.player && e.crouch && d > 40) return World.los(this.x, this.y - 8, e.x, e.y - 3, SOL.VIS | SOL.SHOT) && World.los(this.x, this.y - 8, e.x, e.y + 4, SOL.VIS | SOL.SHOT);
    return World.los(this.x, this.y - 8, e.x, e.y - 8, SOL.VIS);
  }

  update(dt) {
    this.barkT -= dt; this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.dead) { this.deadT += dt; return; }
    this.fireCD -= dt; this.recoil = Math.max(0, this.recoil - dt * 6);
    if (this.kx || this.ky) {   // knockback from hits
      this.move(this.kx * dt, this.ky * dt);
      const k = Math.max(0, 1 - dt * 12); this.kx *= k; this.ky *= k;
      if (Math.abs(this.kx) + Math.abs(this.ky) < 2) this.kx = this.ky = 0;
    }
    if (this.downed > 0) {
      this.downed -= dt;
      if (this.downed <= 0) { this.hp = this.maxHp * 0.5; this.knockedOut = false; this.bark(this.invuln ? "I'm back up!" : 'Ugh... my head...'); }
      return;
    }
    if (this.inside) { this.updateInside(dt); return; }
    const ox = this.x, oy = this.y;
    if (this.reloadT > 0 && this.weapon) { this.reloadT -= dt; if (this.reloadT <= 0) this.mag = WEAPONS[this.weapon].cap; }
    if (this.surrendered || this.captive) Combat.passiveAI(this, dt);
    else switch (this.faction) {
      case 'civ': this.civAI(dt); break;
      case 'law': this.lawAI(dt); break;
      case 'rival': this.rivalAI(dt); break;
      case 'gang': this.gangAI(dt); break;
    }
    const md = dist(ox, oy, this.x, this.y);
    this.moving = md > 0.05;
    this.animT += md / 50;
    if (this.mounted) {
      const h = this.mounted; h.x = this.x; h.y = this.y; h.animT += dt;
      h.speed = md / Math.max(dt, 0.001);
      if (this.moving) h.heading = h.face = Math.atan2(this.y - oy, this.x - ox);
      if (!this.target && this.moving) this.face = h.heading;
      if (h.speed > 60) { h.hoofD = (h.hoofD || 0) + md; if (h.hoofD > 20) { h.hoofD = 0; Sound.play('hoof', h.x, h.y, 0.5); } }
    } else if (this.moving && !this.drawn && !this.target) this.face = Math.atan2(this.y - oy, this.x - ox);
  }

  /* path-following navigation; returns true when arrived */
  navigate(gx, gy, speed, dt, arrive = 8) {
    const d = dist(this.x, this.y, gx, gy);
    if (d < arrive) { this.path = null; return true; }
    const near = dist(this.x, this.y, G.player.x, G.player.y) < 900;
    if (!near) { this.steer(gx, gy, speed, dt); return false; }
    this.pathT -= dt;
    if (!this.path || this.pathT <= 0 || !this.pathGoal || dist(gx, gy, this.pathGoal.x, this.pathGoal.y) > 24) {
      this.pathGoal = { x: gx, y: gy }; this.pathT = rand(1.0, 1.6);
      if (World.los(this.x, this.y, gx, gy, SOL.MOVE) && d < 200) this.path = [{ x: gx, y: gy }];
      else this.path = World.findPath(this.x, this.y, gx, gy, 2200) || [{ x: gx, y: gy }];
    }
    let wp = this.path[0];
    while (wp && dist(this.x, this.y, wp.x, wp.y) < 5 && this.path.length > 1) { this.path.shift(); wp = this.path[0]; }
    if (!wp) return true;
    const a = Math.atan2(wp.y - this.y, wp.x - this.x);
    const ox = this.x, oy = this.y;
    this.move(Math.cos(a) * speed * dt, Math.sin(a) * speed * dt);
    if (dist(ox, oy, this.x, this.y) < speed * dt * 0.25) {
      this.stuckT += dt;
      if (this.stuckT > 0.4) { this.steer(wp.x, wp.y, speed, dt); }
      if (this.stuckT > 1.2) { this.path = null; this.stuckT = 0; }
    } else this.stuckT = 0;
    return false;
  }

  moveDir(mx, my, speed, dt) {
    const l = Math.hypot(mx, my); if (l < 0.01) return;
    const ox = this.x, oy = this.y;
    this.move(mx / l * speed * dt, my / l * speed * dt);
    if (dist(ox, oy, this.x, this.y) < 0.01) this.strafe = -this.strafe;
  }

  findHostileNPC(range) {
    let best = null, bd = range;
    for (const a of G.actors) {
      if (a === this || a.dead || a.inside || a.downed > 0 || !npcHostile(this, a)) continue;
      const d = dist(this.x, this.y, a.x, a.y);
      if (d < bd && this.canSee(a, range)) { bd = d; best = a; }
    }
    return best;
  }

  findCover(target) {
    let best = null, bd = 1e9;
    for (let i = 0; i < 12; i++) {
      const a = rand(TAU), r = rand(24, 90), px = this.x + Math.cos(a) * r, py = this.y + Math.sin(a) * r;
      if (World.circleBlocked(px, py, this.r + 1)) continue;
      if (World.los(target.x, target.y - 8, px, py - 8, SOL.SHOT)) continue;
      const d = dist(this.x, this.y, px, py) + dist(px, py, target.x, target.y) * 0.2;
      if (d < bd) { bd = d; best = { x: px, y: py }; }
    }
    return best;
  }

  combat(dt, tgt) {
    const w = WEAPONS[this.weapon];
    if (!w) return;
    this.drawn = true; this.target = tgt;
    const d = dist(this.x, this.y, tgt.x, tgt.y);
    const see = this.canSee(tgt, 520);
    const runSpd = this.mounted ? 130 : this.speedRun * 0.75;
    if (this.reloadT <= 0 && this.mag <= 0) this.reloadT = w.reload === 'single' ? Math.min(3, w.reloadTime * w.cap * 0.55) : w.reloadTime;
    if (this.coverT > 0) {
      this.coverT -= dt;
      if (this.coverPos && this.navigate(this.coverPos.x, this.coverPos.y, runSpd, dt, 6)) this.coverPos = null;
      this.face = Math.atan2(tgt.y - this.y, tgt.x - this.x);
      return;
    }
    if (!see) {
      this.navigate(tgt.x, tgt.y, runSpd, dt, 30);
      return;
    }
    this.face = Math.atan2(tgt.y - this.y, tgt.x - this.x);
    const pref = clamp(w.range * 0.5, 50, 200);
    this.strafeT -= dt;
    if (this.strafeT <= 0) { this.strafe = pick([-1, 1, 0, 1, -1]); this.strafeT = rand(0.7, 1.8); }
    const ux = (tgt.x - this.x) / (d || 1), uy = (tgt.y - this.y) / (d || 1);
    let mx = -uy * this.strafe * 0.8, my = ux * this.strafe * 0.8;
    if (d > pref * 1.2) { mx += ux; my += uy; } else if (d < pref * 0.45) { mx -= ux; my -= uy; }
    this.moveDir(mx, my, this.mounted ? 110 : this.speedRun * 0.5, dt);
    if (this.reloadT <= 0 && this.mag > 0 && this.fireCD <= 0 && d < w.range * 0.95) {
      this.shoot(tgt);
      this.fireCD = w.rate + rand(0.35, 1.1) * (1.25 - this.skill);
    }
    if ((this.hp < this.maxHp * 0.55 && chance(dt * 0.6)) || chance(dt * 0.07) || (this.reloadT > 0 && chance(dt * 2))) {
      const c = this.findCover(tgt);
      if (c) { this.coverPos = c; this.coverT = rand(1.4, 2.8); }
    }
  }

  shoot(tgt) {
    const w = WEAPONS[this.weapon];
    if (w.melee) { meleeAttack(this, w.dmg * 0.5, w.range, this.face); return; }
    this.mag--;
    const lead = 0.12;
    const tx = tgt.x + (tgt.vx || 0) * lead * (tgt.moving ? 1 : 0), ty = tgt.y + (tgt.vy || 0) * lead * (tgt.moving ? 1 : 0);
    const hy = this.mounted ? 16 : 8;
    const a = Math.atan2(ty - (this.y - 2), tx - this.x);
    const err = (1 - this.skill) * 0.2 + (tgt.moving ? 0.06 : 0) + (tgt === G.player && G.player.sprinting ? 0.06 : 0) + (tgt.mounted ? 0.05 : 0);
    const mx = this.x + Math.cos(a) * (5 + w.len), my = this.y - hy + Math.sin(a) * (5 + w.len);
    const dm = tgt === G.player ? Game.npcDamageMul() : 0.8;
    const n = w.pellets || 1;
    for (let i = 0; i < n; i++) Bullets.fire(mx, my + (hy - 8), a + rand(-1, 1) * (w.spread + err), this.weapon, this, this.faction, dm);
    FX.muzzle(mx, my, a, n > 1 || w.ammo === 'rifle');
    Sound.play(w.sound, this.x, this.y, 0.85);
    this.recoil = 1;
    Law.gunfire(this.x, this.y, this);
  }

  /* ---------------- civilians ---------------- */
  civAI(dt) {
    const P = G.player, hour = Env.hour();
    this.drawn = false;
    if (this.kind === 'clerk') return this.clerkAI(dt);
    // fear: being aimed at closely
    const d = dist(this.x, this.y, P.x, P.y);
    if (!P.dead && P.drawn && d < 70 && Math.abs(angleDiff(P.face, Math.atan2(this.y - P.y, this.x - P.x))) < 0.35 && this.state !== 'flee' && this.state !== 'report') {
      this.aimAtT += dt;
      if (this.aimAtT > 0.5 && this.state !== 'handsup') { this.state = 'handsup'; this.timer = 4; this.bark(BARKS.civHandsUp); }
    } else this.aimAtT = 0;
    this.timer -= dt;
    switch (this.state) {
      case 'handsup':
        this.face = Math.atan2(P.y - this.y, P.x - this.x);
        if (this.timer <= 0) { this.state = 'flee'; this.fleeFrom = { x: P.x, y: P.y }; this.timer = rand(5, 8); }
        return;
      case 'flee': {
        const f = this.fleeFrom || P;
        const a = Math.atan2(this.y - f.y, this.x - f.x);
        this.steer(this.x + Math.cos(a) * 60, this.y + Math.sin(a) * 60, this.speedRun, dt);
        if (this.timer <= 0) { this.state = this.witness ? 'report' : 'idle'; this.timer = rand(1, 3); }
        return;
      }
      case 'report': {
        if (!this.witness) { this.state = 'idle'; return; }
        let law = null, bd = 1e9;
        for (const a of G.actors) if (a.faction === 'law' && !a.dead && !a.inside) { const dd = dist(this.x, this.y, a.x, a.y); if (dd < bd) { bd = dd; law = a; } }
        const town = this.town ? World.towns.find(t => t.name === this.town) : null;
        const sheriffB = town ? World.buildings.find(b => b.id === town.sheriff) : null;
        const goal = law && bd < 700 ? law : sheriffB ? { x: (sheriffB.door.x + 0.5) * TS, y: (sheriffB.door.y + 1.5) * TS } : null;
        this.witness.t -= dt;
        if (this.witness.t <= 0 || !goal || dist(this.x, this.y, goal.x, goal.y) < 26) {
          Law.report(this.witness.crime, this.witness.x, this.witness.y, this);
          this.witness = null; this.state = 'flee'; this.timer = 3;
          return;
        }
        this.bark("Sheriff! Sheriff!");
        this.navigate(goal.x, goal.y, this.speedRun, dt, 20);
        return;
      }
      case 'walk':
        if (this.navigate(this.goal.x, this.goal.y, this.speedWalk, dt, 10) || this.timer <= 0) {
          if (this.enterB) { this.enterBuilding(this.enterB); this.enterB = null; }
          else { this.state = 'idle'; this.timer = rand(2, 7); }
        }
        return;
      case 'home':
        if (this.navigate(this.goal.x, this.goal.y, this.speedWalk, dt, 10) || this.timer <= 0) { this.enterBuilding(this.building); }
        return;
      default: { // idle — decide the next routine step
        if (this.talk && !P.dead && d < 40) this.face = Math.atan2(P.y - this.y, P.x - this.x);
        if (this.timer > 0) return;
        if (!this.town) { this.goal = World.randomOpenNear(this.home.x, this.home.y, 10, 60) || this.home; this.state = 'walk'; this.timer = 12; return; }
        const night = hour >= 21 || hour < 6;
        if (night && this.building) { const b = this.building; this.goal = { x: (b.door.x + 0.5) * TS, y: (b.door.y + 1.5) * TS }; this.state = 'home'; this.timer = 40; return; }
        const r = Math.random(), wps = World.townWaypoints[this.town];
        if (r < 0.28) {
          const shops = World.buildings.filter(b => b.town === this.town && b.type !== 'house' && b.type !== 'sheriff');
          const b = pick(shops); this.enterB = b; this.goal = { x: (b.door.x + 0.5) * TS, y: (b.door.y + 1.5) * TS }; this.state = 'walk'; this.timer = 40;
        } else if (r < 0.85) {
          const wp = pick(wps); this.goal = { x: wp.x + rand(-12, 12), y: wp.y + rand(-10, 10) }; this.state = 'walk'; this.timer = 40;
        } else { this.state = 'idle'; this.timer = rand(3, 8); }
      }
    }
  }

  enterBuilding(b) {
    if (!b) { this.state = 'idle'; this.timer = 2; return; }
    this.inside = true; this.insideB = b; this.state = 'inside';
    const night = Env.hour() >= 21 || Env.hour() < 6;
    this.insideT = night && b === this.building ? 9999 : rand(10, 35);
    this.x = (b.door.x + 0.5) * TS; this.y = (b.door.y + 0.5) * TS;
  }

  updateInside(dt) {
    this.insideT -= dt;
    const hour = Env.hour(), night = hour >= 21 || hour < 6;
    if (this.insideT > 1000 && !night) this.insideT = rand(0, 20);
    if (this.insideT <= 0) {
      const b = this.insideB;
      this.inside = false; this.x = (b.door.x + 0.5) * TS; this.y = (b.door.y + 1.6) * TS;
      this.state = 'idle'; this.timer = rand(0.5, 2);
      if (dist(this.x, this.y, G.player.x, G.player.y) < 300) Sound.play('door', this.x, this.y, 0.5);
    }
  }

  clerkAI(dt) {
    const P = G.player;
    this.face = Math.atan2(P.y - this.y, P.x - this.x);
    if (this.handsUpT > 0) { this.handsUpT -= dt; this.state = 'handsup'; } else if (this.state === 'handsup') this.state = 'idle';
    if (this.home && dist(this.x, this.y, this.home.x, this.home.y) > 3) this.navigate(this.home.x, this.home.y, this.speedWalk, dt, 2);
  }

  onGunfire(x, y, d) {
    if (this.faction === 'civ') {
      if (this.kind === 'clerk') { if (d < 120) { this.handsUpT = 4; } return; }
      if (this.state === 'report' || this.inside) return;
      if (d < 70 && chance(0.35)) { this.state = 'handsup'; this.timer = rand(2, 4); this.bark(BARKS.civHandsUp); }
      else { this.state = 'flee'; this.fleeFrom = { x, y }; this.timer = rand(5, 9); if (chance(0.5)) this.bark(BARKS.civFlee); }
    }
  }

  /* ---------------- lawmen ---------------- */
  lawAI(dt) {
    const P = G.player, heat = Law.heat;
    if (heat === 0 && !this.forceHostile) { this.engaged = false; }
    if (heat > 0 && !this.engaged && (dist(this.x, this.y, Law.lastSeen.x, Law.lastSeen.y) < 1000 || this.temp)) this.engaged = true;
    let tgt = null;
    if (!P.dead && (this.engaged || this.forceHostile)) {
      if (this.canSee(P, 300)) {
        Law.spotted(this);
        if (heat >= 2 || this.forceHostile) { if (!this.target) this.bark(BARKS.lawSpot); tgt = P; }
        else { this.drawn = true; this.face = Math.atan2(P.y - this.y, P.x - this.x); this.bark(BARKS.lawArrest); if (this.navigate(P.x, P.y, this.speedRun * 0.8, dt, 22)) Law.arrestAttempt(this, dt); return; }
      } else if (heat > 0 && this.engaged) {
        this.target = null; this.drawn = true;
        if (!this.searchPt || this.timer <= 0 || this.navigate(this.searchPt.x, this.searchPt.y, this.mounted ? 120 : this.speedRun * 0.7, dt, 14)) {
          this.searchPt = { x: Law.lastSeen.x + rand(-130, 130), y: Law.lastSeen.y + rand(-130, 130) };
          this.timer = rand(4, 8);
          if (chance(0.3)) this.bark(BARKS.lawSearch);
        }
        this.timer -= dt;
        return;
      }
    }
    if (!tgt) tgt = this.findHostileNPC(260);
    if (tgt) { this.combat(dt, tgt); return; }
    this.target = null; this.drawn = false;
    if (heat === 0 && Law.bounty >= 60 && !P.dead && this.canSee(P, 120)) Law.recognize(this, dt);
    // peaceful routines
    if (this.temp && heat === 0) { this.despawnWhenUnseen = true; }
    if (this.post) { if (this.navigate(this.post.x, this.post.y, this.speedWalk, dt, 6)) { this.face = this.post.face !== undefined ? this.post.face : this.face; } return; }
    if (this.patrol) {
      const wp = this.patrol[this.patrolI % this.patrol.length];
      if (this.navigate(wp.x, wp.y, this.speedWalk, dt, 12)) { this.timer -= dt; if (this.timer <= 0) { this.patrolI++; this.timer = rand(1, 5); } }
      return;
    }
    this.wander(dt, 80);
  }

  wander(dt, radius) {
    this.timer -= dt;
    if (this.state !== 'wander' || !this.goal) { this.state = 'wander'; this.goal = null; }
    if (!this.goal && this.timer <= 0) { this.goal = World.randomOpenNear(this.home.x, this.home.y, 0, radius); this.timer = rand(3, 8); }
    if (this.goal && this.navigate(this.goal.x, this.goal.y, this.speedWalk, dt, 8)) { this.goal = null; this.timer = rand(2, 7); }
    if (this.goal && this.timer < -10) this.goal = null;
  }

  /* ---------------- rival outlaws ---------------- */
  rivalAI(dt) {
    const P = G.player;
    const dP = dist(this.x, this.y, P.x, P.y);
    const goAggro = () => {
      this.aggro = true; this.bark(BARKS.rival);
      for (const a of G.actors) if (a !== this && a.faction === 'rival' && !a.dead && !a.surrendered && dist(a.x, a.y, this.x, this.y) < 260) a.aggro = true;
    };
    if (!P.dead && !this.aggro && !this.preferLaw && this.canSee(P, 260)) {
      if (this.encounter || this.raider) { if (dP < 260) goAggro(); }
      else if (this.camp) {
        // camps warn strangers off before they start shooting
        const c = this.camp;
        if (dP < 175 && c.warnAt === undefined) { c.warnAt = Combat.t; this.bark('Turn around, stranger. This is Rattlesnake land!', true); UI.notify(`${c.name}: the Rattlesnakes are warning you off. Leave, or they'll start shooting.`, 'warn'); }
        if (c.warnAt !== undefined && (dP < 75 || (Combat.t - c.warnAt > 6 && dP < 175))) goAggro();
        if (c.warnAt !== undefined && dP > 320 && Combat.t - c.warnAt > 10) c.warnAt = undefined;
      } else if (dP < 150) goAggro();
    }
    if (this.aggro && (P.dead || dP > 700)) this.aggro = false;
    let tgt = this.aggro && !P.dead ? P : null;
    const alt = this.findHostileNPC(this.preferLaw ? 320 : 240);
    if (alt && (!tgt || this.preferLaw || dist(this.x, this.y, alt.x, alt.y) < dP * 0.7)) tgt = alt;
    if (tgt) { this.combat(dt, tgt); return; }
    this.drawn = false; this.target = null;
    if (this.encounter) { this.navigate(P.x, P.y, this.mounted ? 125 : this.speedRun * 0.7, dt, 60); return; }
    this.wander(dt, 70);
  }

  /* ---------------- Hollister gang ---------------- */
  gangAI(dt) {
    const P = G.player;
    let tgt = this.findHostileNPC(280);
    if (!tgt && this.follow && Law.heat >= 2) {
      for (const a of G.actors) if (a.faction === 'law' && !a.dead && !a.inside && a.engaged && dist(a.x, a.y, this.x, this.y) < 260 && this.canSee(a)) { tgt = a; break; }
    }
    if (tgt && this.weapon) { if (!this.target) this.bark(BARKS.gang); this.combat(dt, tgt); return; }
    this.target = null; this.drawn = false;
    if (this.follow && !P.dead) { this.followPlayer(dt); return; }
    if (this.post) { if (this.navigate(this.post.x, this.post.y, this.speedWalk, dt, 5)) { if (this.post.face !== undefined) this.face = this.post.face; } return; }
    this.wander(dt, 50);
  }

  hurt(dmg, src, angle, o = {}) {
    if (this.dead || this.inside || this.downed > 0) return;
    this.hp -= dmg; this.hurtT = 0.25;
    if (!o.nonlethal) FX.impact(this.x, this.y - 6, 'blood', angle || 0);
    Sound.play('hit', this.x, this.y, 0.8);
    if (angle !== undefined && !this.mounted) { const kb = o.nonlethal ? 90 : 55; this.kx = Math.cos(angle) * kb; this.ky = Math.sin(angle) * kb; }
    const byPlayer = src === G.player;
    let killed = false;
    if (this.hp <= 0) {
      if (this.invuln) { this.hp = 1; this.downed = 7; this.bark("Argh! I'm hit!", true); }
      else if (o.nonlethal) { this.hp = 1; this.downed = 10; this.knockedOut = true; this.surrendered = false; Combat.release(this); this.bark('Oof...', true); }
      else { killed = true; this.die(src); }
    }
    if (!killed) {
      if (this.faction === 'rival' && !this.surrendered) this.aggro = true;
      if (this.faction === 'civ' && this.kind !== 'clerk' && !this.knockedOut) { this.state = 'flee'; this.fleeFrom = src || this; this.timer = rand(6, 10); this.bark(BARKS.civFlee); }
      if (this.faction === 'law' && byPlayer) this.engaged = true;
      if (this.target && chance(0.25)) this.bark("I'm hit!");
    }
    if (byPlayer) { G.stats.hits++; Combat.onPlayerHit(this, killed); Law.playerAttacked(this, killed); }
  }

  die(src) {
    this.dead = true; this.deadT = 0; this.drawn = false; this.hp = 0; this.witness = null;
    Combat.release(this);
    Sound.play('die', this.x, this.y, 0.7);
    if (this.mounted) {
      const h = this.mounted; h.rider = null; h.owner = this.faction === 'law' ? 'law' : 'wild'; h.home = { x: h.x, y: h.y };
      h.x = this.x + 10; h.y = this.y; if (!G.horses.includes(h)) G.horses.push(h);
      this.mounted = null; this.ownHorse = null;
    }
    if (src === G.player) G.stats.kills++;
    MissionSys.onActorDeath(this);
  }

  draw(ctx) {
    if (this.inside) return;
    const o = {
      face: this.face, moving: this.moving, animT: this.animT, pal: this.pal, weapon: this.weapon, drawn: this.drawn && !!this.weapon,
      recoil: this.recoil, reload: this.reloadT > 0 ? this.reloadT : 0, holster: !!this.weapon && this.weapon !== 'knife',
      state: this.dead ? 'dead' : this.downed > 0 ? 'kneel' : (this.state === 'handsup' ? 'handsup' : 'normal'),
      mounted: !!this.mounted, hurt: this.hurtT, deadT: this.deadT, masked: this.faction === 'rival'
    };
    const big = this.role === 'brute' && !this.dead;
    if (big) { ctx.save(); ctx.translate(this.x, this.y); ctx.scale(1.25, 1.25); ctx.translate(-this.x, -this.y); }
    if (this.mounted) {
      const h = this.mounted;
      Sprites.horse(ctx, this.x, this.y, { face: h.heading, animT: h.animT, speed: Math.min(1, h.speed / 200), coat: h.coat, mane: h.mane, saddle: true, pinto: h.pinto });
      Sprites.human(ctx, this.x - Math.cos(h.heading), this.y - 9, o);
    } else if (this.knockedOut) {
      // out cold: lying down without the blood pool
      const s = Math.cos(this.face) < 0 ? -1 : 1, p = this.pal;
      Sprites.R(ctx, p.pants || p.dress || '#333', this.x - 7 * s - (s < 0 ? 3 : 0), this.y - 3, 4, 3);
      Sprites.R(ctx, p.coat || p.shirt, this.x - 3, this.y - 4, 7, 4);
      Sprites.R(ctx, p.skin, this.x + 4 * s - (s < 0 ? 3 : 0), this.y - 4, 4, 3);
    } else Sprites.human(ctx, this.x, this.y, o);
    if (big) ctx.restore();
    ctx.globalAlpha = 1;
  }
}

/* ============================================================ horses */
class Horse extends Ent {
  constructor(breed, x, y, o = {}) {
    super(x, y);
    this.r = 6; this.breed = breed; this.def = HORSE_BREEDS[breed];
    this.name = o.name || pick(HORSE_NAMES); this.coat = o.coat || pick(this.def.coats);
    this.mane = Sprites.shade(this.coat, -70);
    this.pinto = o.pinto !== undefined ? o.pinto : (breed === 'mustang' && this.coat !== '#e8dcc8' && chance(0.7));
    this.owner = o.owner || 'wild'; this.maxHp = this.hp = this.def.hp; this.maxSt = this.stamina = this.def.stamina;
    this.heading = this.face = o.face !== undefined ? o.face : rand(TAU); this.speed = 0;
    this.rider = null; this.saddle = this.owner !== 'wild'; this.home = { x, y };
    this.timer = rand(2, 6); this.deadT = 0; this.whistled = false; this.whistleT = 0; this.exhausted = false; this.hoofD = 0; this.fleeT = 0;
    this.goal = null;
  }
  blocked(x, y) {
    const t = World.tileAtPx(x, y);
    return t === T.FLOOR || t === T.WALL || super.blocked(x, y);
  }
  control(ix, iy, sprint, dt) {
    const len = Math.hypot(ix, iy), d = this.def;
    let target = 0;
    if (len) {
      const want = Math.atan2(iy, ix), diff = angleDiff(this.heading, want);
      const turn = d.turn * (this.speed > d.speed ? 0.75 : 1) * (this.speed < 30 ? 2 : 1);
      if (Math.abs(diff) > 2.5 && this.speed > 50) target = 0;
      else target = sprint && !this.exhausted ? d.sprint : d.speed;
      this.heading += clamp(diff, -turn * dt, turn * dt);
    }
    const acc = target > this.speed ? d.accel : 240;
    this.speed += clamp(target - this.speed, -acc * dt, acc * dt);
    if (sprint && len && target === d.sprint) this.stamina -= 20 * dt * (this.rider === G.player && Progress.has('horseman') ? 0.6 : 1);
    else this.stamina += (this.speed < 10 ? 16 : 8) * dt;
    this.stamina = clamp(this.stamina, 0, this.maxSt);
    if (this.stamina <= 0 && !this.exhausted) { this.exhausted = true; Sound.play('neigh', this.x, this.y, 0.6); Floaters.add(this.x, this.y - 26, this.name + ' is winded', '#ffd27a'); }
    if (this.exhausted && this.stamina > this.maxSt * 0.35) this.exhausted = false;
    this.runPhysics(dt);
  }
  runPhysics(dt) {
    const tm = World.terrainMul(this.x, this.y), vx = Math.cos(this.heading) * this.speed * tm, vy = Math.sin(this.heading) * this.speed * tm;
    const ox = this.x, oy = this.y;
    this.move(vx * dt, vy * dt);
    const md = dist(ox, oy, this.x, this.y);
    if (this.speed > 20 && md < this.speed * tm * dt * 0.4) this.speed *= 0.6;
    this.vx = vx; this.vy = vy; this.face = this.heading;
    this.animT += dt;
    this.hoofD += md;
    if (this.hoofD > (this.speed > 160 ? 22 : 16)) {
      this.hoofD = 0; Sound.play('hoof', this.x, this.y, this.rider === G.player ? 0.7 : 0.4);
      const t = World.tileAtPx(this.x, this.y);
      if (this.speed > 90 && (t === T.SAND || t === T.ROAD || t === T.DRYBED || t === T.TOWN || t === T.CANYON || t === T.SCRUB)) FX.dust(this.x - Math.cos(this.heading) * 8, this.y, 2);
    }
  }
  update(dt) {
    this.hurtT = Math.max(0, this.hurtT - dt);
    if (this.dead) { this.deadT += dt; return; }
    if (this.rider) return;
    this.speed *= Math.max(0, 1 - dt * 3);
    this.stamina = Math.min(this.maxSt, this.stamina + 12 * dt);
    const P = G.player;
    const dP = dist(this.x, this.y, P.x, P.y);
    let goal = null, spd = 0;
    if (this.owner === 'player') {
      if (this.whistled) {
        this.whistleT -= dt;
        goal = P; spd = dP > 200 ? this.def.sprint * 0.8 : this.def.speed * 0.8;
        if (dP < 36 || this.whistleT <= 0) this.whistled = false;
        if (dP > 700 && this.whistleT < 18 && !this.onScreen()) { // catch up off-screen
          const sp = World.randomOpenNear(P.x, P.y, 320, 420, (x, y) => Game.onScreen(x, y, 10));
          if (sp && !World.buildingAt(sp.x, sp.y)) { this.x = sp.x; this.y = sp.y; }
        }
      } else if (!P.mounted && !P.dead && dP < 240 && dP > 46 && !P.inBuilding) { goal = P; spd = dP > 130 ? 110 : 45; }
    } else if (this.owner === 'wild') {
      this.fleeT -= dt;
      if ((P.sprinting && dP < 80) || (P.mounted && P.mounted.speed > 150 && dP < 90)) this.fleeT = 3;
      if (this.fleeT > 0) { const a = Math.atan2(this.y - P.y, this.x - P.x); goal = { x: this.x + Math.cos(a) * 60, y: this.y + Math.sin(a) * 60 }; spd = this.def.sprint * 0.7; }
      else {
        this.timer -= dt;
        if (this.timer <= 0) { this.goal = World.randomOpenNear(this.home.x, this.home.y, 0, 100); this.timer = rand(4, 10); }
        if (this.goal) { goal = this.goal; spd = 22; if (dist(this.x, this.y, goal.x, goal.y) < 6) this.goal = null; }
      }
    }
    if (goal) {
      const a = Math.atan2(goal.y - this.y, goal.x - this.x);
      this.heading += clamp(angleDiff(this.heading, a), -4 * dt, 4 * dt);
      this.speed = lerp(this.speed, spd, Math.min(1, dt * 3));
      const ox = this.x, oy = this.y;
      this.steer(this.x + Math.cos(this.heading) * 20, this.y + Math.sin(this.heading) * 20, this.speed, dt);
      const md = dist(ox, oy, this.x, this.y);
      this.animT += dt; this.face = this.heading;
      this.hoofD += md; if (this.hoofD > 18) { this.hoofD = 0; Sound.play('hoof', this.x, this.y, 0.35); }
    } else { this.speed = 0; this.animT += dt * 0.3; }
  }
  onScreen() { return Game.onScreen(this.x, this.y, 20); }
  hurt(dmg, src) {
    if (this.dead) return;
    this.hp -= dmg; this.hurtT = 0.25;
    FX.impact(this.x, this.y - 9, 'blood', 0);
    if (chance(0.5)) Sound.play('neigh', this.x, this.y, 0.7);
    if (this.owner === 'wild' && !this.rider) this.fleeT = 4;
    if (this.hp <= 0) {
      this.dead = true; this.hp = 0; this.deadT = 0;
      if (this.rider === G.player) { G.player.dismount(true); UI.notify(this.name + ' was killed!', 'bad'); }
      if (this.owner === 'player' && G.player.horse === this) { G.player.horse = null; if (this.rider !== G.player) UI.notify('Your horse ' + this.name + ' died.', 'bad'); }
      this.rider = null;
    }
  }
  draw(ctx) {
    Sprites.horse(ctx, this.x, this.y, { face: this.heading, animT: this.animT, speed: Math.min(1, this.speed / 200), coat: this.coat, mane: this.mane, saddle: this.saddle, pinto: this.pinto, dead: this.dead, hurt: this.hurtT });
    if (this.rider === G.player && !this.dead) G.player.drawMounted(ctx, this.x, this.y);
  }
}

/* ============================================================ wildlife */
class Animal extends Ent {
  constructor(kind, x, y) {
    super(x, y);
    this.kind = kind; this.r = kind === 'rabbit' ? 3 : kind === 'bear' ? 7 : 5;
    this.hp = { rabbit: 8, deer: 40, coyote: 35, elk: 60, cougar: 70, bear: 140, cow: 50 }[kind];
    this.speed = { rabbit: 115, deer: 120, coyote: 105, elk: 122, cougar: 128, bear: 96, cow: 62 }[kind];
    this.predator = kind === 'coyote' || kind === 'cougar' || kind === 'bear';
    this.bite = { coyote: 7, cougar: 11, bear: 16 }[kind] || 0;
    this.state = 'graze'; this.timer = rand(1, 4); this.goal = null; this.buck = kind === 'deer' && chance(0.4);
    this.face = rand(TAU); this.skinned = false; this.deadT = 0; this.biteCD = 0; this.home = { x, y };
  }
  update(dt) {
    if (this.dead) { this.deadT += dt; return; }
    const P = G.player, dP = dist(this.x, this.y, P.x, P.y);
    this.timer -= dt; this.biteCD -= dt;
    const ox = this.x, oy = this.y;
    const night = Env.isNight();
    const sense = this.kind === 'bear' ? 55 : this.kind === 'cougar' ? (night ? 170 : 90) : (night ? 140 : 70);
    if (this.predator && !P.dead && (this.state === 'hunt' || (dP < sense && (!P.mounted || this.kind !== 'coyote') && chance(dt * 2)))) {
      if (this.state !== 'hunt' && this.kind !== 'coyote') Sound.play(this.kind === 'bear' ? 'punch' : 'hitmark', this.x, this.y, 0.6);
      this.state = 'hunt';
      if (dP > 300) this.state = 'graze';
      else if (dP < (this.kind === 'bear' ? 15 : 12)) { if (this.biteCD <= 0) { P.hurt(this.bite, this, Math.atan2(P.y - this.y, P.x - this.x)); this.biteCD = this.kind === 'bear' ? 1.4 : 1.1; Sound.play('punch', this.x, this.y); } }
      else this.steer(P.x, P.y, this.speed * 0.9, dt);
    } else if (this.state === 'flee' || (dP < (this.kind === 'cow' ? 30 : P.sprinting || P.mounted ? 110 : 60) && !P.dead)) {
      if (this.state !== 'flee') this.timer = rand(2, 4);
      this.state = 'flee';
      const a = Math.atan2(this.y - P.y, this.x - P.x);
      this.steer(this.x + Math.cos(a) * 50, this.y + Math.sin(a) * 50, this.speed, dt);
      if (this.timer <= 0 || (this.kind === 'cow' && dP > 70)) this.state = 'graze';
    } else {
      if (this.timer <= 0) { this.goal = chance(0.5) ? World.randomOpenNear(this.home.x, this.home.y, 0, 90) : null; this.timer = rand(2, 6); }
      if (this.goal && this.steer(this.goal.x, this.goal.y, 22, dt) === false) this.goal = null;
      if (this.goal && dist(this.x, this.y, this.goal.x, this.goal.y) < 5) this.goal = null;
    }
    const md = dist(ox, oy, this.x, this.y);
    this.moving = md > 0.05; this.animT += dt;
    if (this.moving) this.face = Math.atan2(this.y - oy, this.x - ox);
  }
  onGunfire(x, y) { if (!this.dead && !this.predator) { this.state = 'flee'; this.timer = rand(3, 5); } }
  hurt(dmg, src, angle) {
    if (this.dead) return;
    this.hp -= dmg; FX.impact(this.x, this.y - 4, 'blood', angle || 0);
    if (this.predator && src === G.player && !(this.kind === 'coyote' && this.hp < 12)) this.state = 'hunt'; else { this.state = 'flee'; this.timer = 4; }
    if (this.hp <= 0) { this.dead = true; this.deadT = 0; if (src === G.player) G.stats.hunted++; }
    if (src === G.player) Combat.onPlayerHit(this, this.dead);
  }
  draw(ctx) { Sprites.animal(ctx, this); }
}

/* ============================================================ shooting targets */
class Target {
  constructor(x, y) { this.x = x; this.y = y; this.hit = false; this.col = pick(['#4a8a5a', '#8a5a2a', '#3a6a8a']); }
  shatter() { this.hit = true; FX.impact(this.x, this.y - 10, 'glass', -Math.PI / 2); Sound.play('glass', this.x, this.y); MissionSys.event('bottle'); }
  draw(ctx) {
    if (this.hit) return;
    const x = Math.round(this.x), y = Math.round(this.y);
    Sprites.R(ctx, this.col, x - 1, y - 14, 3, 5); Sprites.R(ctx, this.col, x, y - 16, 1, 2); Sprites.R(ctx, 'rgba(255,255,255,.5)', x - 1, y - 13, 1, 2);
  }
}

/* ============================================================ train */
class Train {
  constructor() {
    this.cars = [{ k: 'loco', len: 44 }, { k: 'tender', len: 24 }, { k: 'passenger', len: 40 }, { k: 'passenger', len: 40 }, { k: 'express', len: 40 }, { k: 'caboose', len: 28 }];
    let off = 0;
    for (const c of this.cars) { off += c.len; c.off = off; off += 2; }
    this.totalLen = off;
    this.express = this.cars[4];
    this.y = RAIL_ROW * TS + 13;
    this.stops = (World.poi.stationDoors || [World.poi.dwStationDoor, World.poi.mfStationDoor]).map(d => d.x).map(dx => dx - 19 + this.express.off).sort((a, b) => a - b);
    this.reset(-this.totalLen - 200);
    this.state = 'run'; this.speed = 140;
    this.anim = 0; this.chugD = 0; this.smokeT = 0; this.robbed = false; this.timer = 0; this.nextStop = 0; this.hornT = 0;
  }
  reset(x) { this.x = x; this.state = 'run'; this.speed = 140; this.robbed = false; this.nextStop = 0; }
  get rect() { return { x0: this.x - this.totalLen, x1: this.x, y0: this.y - 22, y1: this.y + 4 }; }
  update(dt) {
    const cruise = 150, decel = 55;
    if (this.state === 'wait') { this.timer -= dt; if (this.timer <= 0) this.reset(-this.totalLen - 20); return; }
    const stopX = this.stops[this.nextStop];
    if (this.state === 'run') {
      this.speed = Math.min(cruise, this.speed + 30 * dt);
      if (stopX !== undefined) {
        const dd = stopX - this.x;
        if (dd < 600 && this.hornT <= 0) { Sound.play('trainHorn', this.x, this.y); this.hornT = 30; }
        if (dd > 0 && dd <= this.speed * this.speed / (2 * decel) + 2) this.state = 'brake';
      }
    } else if (this.state === 'brake') {
      const dd = Math.max(0.5, stopX - this.x);
      this.speed = Math.max(6, Math.sqrt(2 * decel * dd));
      if (stopX - this.x <= 1) { this.x = stopX; this.speed = 0; this.state = 'stop'; this.timer = 20; Sound.play('bell', this.x, this.y); }
    } else if (this.state === 'stop') {
      this.timer -= dt;
      if (this.timer <= 0) { this.state = 'run'; this.nextStop++; Sound.play('trainHorn', this.x, this.y); this.hornT = 30; }
    }
    this.hornT -= dt;
    this.x += this.speed * dt;
    this.anim += this.speed * dt / 5;
    this.chugD += this.speed * dt;
    if (this.chugD > 30 && this.speed > 5) { this.chugD = 0; Sound.play('chug', this.x, this.y, 0.6); }
    this.smokeT -= dt;
    if (this.smokeT <= 0 && Game.onScreen(this.x, this.y, 200)) {
      this.smokeT = this.speed > 5 ? 0.06 : 0.3;
      FX.spawn(this.x - 10, this.y - 42, -this.speed * 0.5 + rand(-8, 8), -rand(15, 30), rand(1.5, 2.6), rand(4, 6), pick(['#5a5450', '#6a6460', '#4a4440']), 'smoke', -3, 0.6);
    }
    if (this.x - this.totalLen > World.W * TS + 40) { this.state = 'wait'; this.timer = 40; }
    // knock aside anything standing on the tracks
    const r = this.rect;
    const hitE = (e, isPlayer) => {
      if (e.dead || e.inside || e.x < r.x0 - 4 || e.x > r.x1 + 4 || e.y < r.y0 + 8 || e.y > r.y1 + 6) return;
      const up = e.y < this.y - 8;
      const ny = up ? r.y0 + 6 : r.y1 + 8;
      if (this.speed > 30) {
        if (isPlayer) { if (e.mounted) e.dismount(true); e.hurt(45, this, up ? -Math.PI / 2 : Math.PI / 2); }
        else if (e.hurt) e.hurt(200, this, 0);
      }
      e.y = ny;
    };
    hitE(G.player, true);
    for (const a of G.actors) hitE(a, false);
    for (const h of G.horses) if (!h.rider) hitE(h, false);
    for (const a of G.animals) hitE(a, false);
  }
  blocks(x, y, rad) {
    if (this.state === 'wait') return false;
    const r = this.rect;
    return x + rad > r.x0 && x - rad < r.x1 && y > r.y0 + 8 && y < r.y1 + 6;
  }
  expressDoor() { return { x: this.x - this.express.off + 19, y: this.y + 8 }; }
  draw(ctx, night, x0, x1) {
    if (this.state === 'wait') return;
    for (const c of this.cars) {
      const cx = this.x - c.off;
      if (cx + c.len < x0 - 10 || cx > x1 + 10) continue;
      Sprites.trainCar(ctx, c.k, cx, this.y, this.anim, night, this.robbed);
    }
  }
}

/* ============================================================ stagecoach */
class Stagecoach {
  constructor(dir, o = {}) {
    this.route = World.poi.stageRoute; this.dir = dir;
    this.i = dir > 0 ? 0 : this.route.length - 1;
    const p = this.route[this.i]; this.x = p.x; this.y = p.y;
    this.face = dir > 0 ? 0 : Math.PI; this.speed = 0; this.maxSpeed = 78;
    this.state = 'travel'; this.driverOn = true; this.guardOn = true; this.horsesAlive = true;
    this.horseHp = 90; this.guardHp = 70; this.looted = false; this.animT = 0; this.mission = o.mission || null;
    this.waitT = 0; this.arrived = false; this.faction = 'civ'; this.hoofD = 0; this.robbedReported = false;
  }
  get rect() { return { x0: this.x - 16, x1: this.x + 16, y0: this.y - 6, y1: this.y + 4 }; }
  blocks(x, y, rad) {
    const s = Math.cos(this.face) < 0 ? -1 : 1;
    const x0 = Math.min(this.x - 14, this.x + s * 34), x1 = Math.max(this.x + 12, this.x + s * 34);
    return x + rad > x0 && x - rad < x1 && y + rad > this.y - 6 && y - rad < this.y + 3;
  }
  update(dt) {
    this.animT += dt;
    if (this.state !== 'travel') { this.speed = Math.max(0, this.speed - 120 * dt); return; }
    const P = G.player;
    // halt if the player stands in the road ahead
    const ahead = { x: this.x + Math.cos(this.face) * 40, y: this.y + Math.sin(this.face) * 40 };
    const blocked = !P.dead && dist(ahead.x, ahead.y, P.x, P.y) < 26;
    const tgt = this.route[this.i + this.dir];
    if (!tgt) { this.arrived = true; this.speed = 0; return; }
    const target = blocked ? 0 : this.maxSpeed;
    this.speed += clamp(target - this.speed, -150 * dt, 60 * dt);
    const a = Math.atan2(tgt.y - this.y, tgt.x - this.x);
    this.face = a;
    const step = this.speed * dt, d = dist(this.x, this.y, tgt.x, tgt.y);
    if (step >= d) { this.x = tgt.x; this.y = tgt.y; this.i += this.dir; }
    else { this.x += Math.cos(a) * step; this.y += Math.sin(a) * step; }
    this.hoofD += step;
    if (this.hoofD > 14) { this.hoofD = 0; Sound.play('hoof', this.x, this.y, 0.45); if (this.speed > 50) FX.dust(this.x + Math.cos(a) * 22, this.y, 1); }
    if (this.speed > 20) {
      const r = { x0: this.x - 16, x1: this.x + 16 };
      for (const e of [P, ...G.actors]) if (!e.dead && !e.inside && Math.abs(e.y - this.y) < 7 && e.x > Math.min(this.x, ahead.x) - 6 && e.x < Math.max(this.x, ahead.x) + 6) e.y += e.y < this.y ? -3 : 3;
    }
  }
  halt(reason) {
    if (this.state !== 'travel') return;
    this.state = 'stopped';
    const P = G.player;
    if (this.driverOn) {
      this.driverOn = false;
      const d = spawnActor('civilian', this.x + 10, this.y + 10, { pal: CIV_PALS[1], name: 'Coach Driver', temp: true, cash: randi(5, 15) });
      d.state = 'handsup'; d.timer = 3; d.witness = { crime: 'stage_robbery', x: this.x, y: this.y, t: 8 };
    }
    if (this.guardOn) {
      this.guardOn = false;
      const gd = spawnActor('guard', this.x - 10, this.y + 10, { name: 'Shotgun Guard', weapon: 'shotgun', forceHostile: true, temp: true, hp: Math.max(20, this.guardHp), cash: randi(10, 25), mission: this.mission });
      gd.bark("Stick-up! Cover the box!");
    }
    if (reason === 'holdup' || reason === 'shot') { Law.commit('stage_robbery', this.x, this.y, { reported: !!this.mission }); }
    MissionSys.event('coachStopped', this);
  }
  hurt(dmg, src, bx, by) {
    FX.impact(bx, by, 'wood', 0);
    const s = Math.cos(this.face) < 0 ? -1 : 1;
    const onHorses = (bx - this.x) * s > 14;
    if (this.guardOn && !onHorses && by < this.y - 12) {
      this.guardHp -= dmg;
      if (this.guardHp <= 0) {
        this.guardOn = false;
        const gd = spawnActor('guard', this.x - 6, this.y + 8, { name: 'Shotgun Guard', weapon: 'shotgun', temp: true, mission: this.mission });
        gd.die(src); if (src === G.player) Law.playerAttacked(gd, true);
      }
    } else if (this.horsesAlive && onHorses) {
      this.horseHp -= dmg; FX.impact(bx, by, 'blood', 0); Sound.play('neigh', this.x, this.y, 0.6);
      if (this.horseHp <= 0) this.horsesAlive = false;
    }
    if (src === G.player) this.halt('shot');
  }
  draw(ctx, night) { Sprites.coach(ctx, this, night); }
}

/* vehicles as moving obstacles */
const Vehicles = {
  blocks(x, y, r, self) {
    if (G.train && G.train.blocks(x, y, r)) return true;
    for (const c of G.coaches) if (c.blocks(x, y, r)) return true;
    return false;
  }
};

function spawnActor(kind, x, y, o) {
  const a = new Actor(kind, x, y, o);
  G.actors.push(a);
  return a;
}
