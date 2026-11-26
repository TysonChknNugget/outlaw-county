/* Outlaw County — arsenal.js (v2.0 "The Arsenal")
 * New weapons and ammo, weapon slots and the weapon wheel (hold T),
 * gunsmith upgrades, bows and throwing knives, fire arrows and the
 * crank guns mounted at Fort Granger.
 */
'use strict';

/* ---------------------------------------------------------------- data */
Object.assign(AMMO, {
  heavy: { name: 'Large-Bore Cartridges', box: 10, price: 12, max: 40 },
  arrow: { name: 'Arrows', box: 12, price: 6, max: 36 },
  firearrow: { name: 'Fire Arrows', box: 6, price: 11, max: 18 },
  tknife: { name: 'Throwing Knives', box: 5, price: 8, max: 15 },
  none: { name: 'Belt-fed', box: 0, price: 0, max: 0 }
});

WEAPONS.repeater.slot = 3;
Object.assign(WEAPONS.sa, { art: 'pistol', eject: 'cyl' });
Object.assign(WEAPONS.da, { art: 'pistol', eject: 'cyl' });
Object.assign(WEAPONS.lever, { art: 'lever' });
Object.assign(WEAPONS.repeater, { art: 'carbine', eject: 'each' });
Object.assign(WEAPONS.shotgun, { art: 'shotgun', eject: 'break' });
Object.assign(WEAPONS.knife, { art: 'knife' });
Object.assign(WEAPONS.fists, { art: 'fists' });

Object.assign(WEAPONS, {
  machete: { name: 'Cane Machete', slot: 1, melee: true, dmg: 58, rate: 0.5, range: 22, accuracy: 1, price: 30, len: 6, art: 'machete',
    desc: 'A long, heavy blade. Slower than a knife, but it hits like a mule.' },
  tomahawk: { name: 'Trade Tomahawk', slot: 1, melee: true, dmg: 66, rate: 0.6, range: 20, accuracy: 1, price: 45, len: 5, art: 'tomahawk',
    desc: 'An iron trade axe. The hardest-hitting thing you can swing.' },
  derringer: { name: 'Vest-Pocket Derringer', slot: 2, dmg: 40, rate: 0.3, cap: 2, ammo: 'revolver', reload: 'full', reloadTime: 1.0, spread: 0.06,
    range: 150, speed: 480, recoil: 2, sound: 'revolver2', price: 45, len: 3, accuracy: 0.6, art: 'pocket',
    desc: 'Two shots that fit in a vest pocket. Ugly at range, deadly across a card table.' },
  navy: { name: 'Navy Cap-and-Ball', slot: 2, dmg: 32, rate: 0.5, cap: 6, ammo: 'revolver', reload: 'full', reloadTime: 2.6, spread: 0.04,
    range: 270, speed: 520, recoil: 2.2, cock: true, sound: 'revolver', price: 70, len: 6, accuracy: 0.85, art: 'pistol',
    desc: 'An old war revolver. You swap the whole loaded cylinder, which takes a while.' },
  schofield: { name: 'Top-Break Army', slot: 2, dmg: 34, rate: 0.42, cap: 6, ammo: 'revolver', reload: 'full', reloadTime: 1.1, spread: 0.035,
    range: 290, speed: 540, recoil: 2.4, cock: true, sound: 'revolver', price: 160, len: 5, accuracy: 0.9, art: 'pistol', eject: 'cyl',
    desc: 'Break it open and every empty flies out at once. The fastest-reloading six-gun.' },
  cavalry: { name: 'Long-Barrel Cavalry', slot: 2, dmg: 46, rate: 0.62, cap: 6, ammo: 'revolver', reload: 'single', reloadTime: 0.45, spread: 0.015,
    range: 360, speed: 600, recoil: 3, cock: true, sound: 'revolver', price: 240, len: 7, accuracy: 0.95, art: 'longpistol', eject: 'cyl',
    desc: 'A seven-and-a-half-inch barrel. Shoots almost like a carbine.' },
  autopistol: { name: 'Self-Loading Pistol', slot: 2, dmg: 28, rate: 0.16, cap: 10, ammo: 'revolver', reload: 'full', reloadTime: 1.3, spread: 0.05,
    range: 280, speed: 560, recoil: 1.8, sound: 'revolver2', price: 420, len: 5, accuracy: 0.75, art: 'auto', eject: 'each',
    desc: 'A newfangled automatic from overseas. Ten shots, stripper-clip reload.' },
  brasslever: { name: 'Brass-Frame Lever Rifle', slot: 3, dmg: 46, rate: 0.5, cap: 15, ammo: 'rifle', reload: 'single', reloadTime: 0.45, spread: 0.02,
    range: 500, speed: 760, recoil: 2.8, lever: true, sound: 'rifle', price: 260, len: 9, accuracy: 0.93, art: 'brass',
    desc: 'Fifteen in the tube and a gleaming brass receiver. Load it Sunday, shoot it all week.' },
  carbine: { name: 'Saddle Carbine', slot: 3, dmg: 44, rate: 0.55, cap: 8, ammo: 'rifle', reload: 'single', reloadTime: 0.4, spread: 0.025,
    range: 470, speed: 740, recoil: 2.6, lever: true, sound: 'repeater', price: 180, len: 7, accuracy: 0.9, art: 'carbine', mountedSteady: true,
    desc: 'Short and light. Loses less accuracy when you shoot from the saddle.' },
  buffalo: { name: 'Buffalo Rifle', slot: 3, dmg: 120, rate: 1.2, cap: 1, ammo: 'heavy', reload: 'full', reloadTime: 1.4, spread: 0.004,
    range: 760, speed: 900, recoil: 6, sound: 'rifle', price: 360, len: 11, accuracy: 1, art: 'bigrifle', eject: 'break',
    desc: 'A single-shot hunting cannon. Drops a bear, or a man behind a fence post.' },
  rolling: { name: 'Rolling-Block Rifle', slot: 3, dmg: 95, rate: 1.0, cap: 1, ammo: 'heavy', reload: 'full', reloadTime: 0.9, spread: 0.006,
    range: 700, speed: 880, recoil: 5, cock: true, sound: 'rifle', price: 300, len: 10, accuracy: 1, art: 'bigrifle', eject: 'break',
    desc: 'Roll the block back, drop a round in, fire. Quicker than a buffalo gun.' },
  bolt: { name: 'Bolt-Action Rifle', slot: 3, dmg: 70, rate: 0.8, cap: 5, ammo: 'rifle', reload: 'full', reloadTime: 1.8, spread: 0.006,
    range: 640, speed: 860, recoil: 3.8, cock: true, sound: 'rifle', price: 480, len: 10, accuracy: 0.98, art: 'bolt', eject: 'each',
    desc: 'A modern military rifle. Five rounds, flat shooting, hard hitting.' },
  double: { name: 'Double-Barrel Fowler', slot: 4, dmg: 15, pellets: 8, rate: 0.3, cap: 2, ammo: 'shells', reload: 'full', reloadTime: 1.4, spread: 0.16,
    range: 210, speed: 480, recoil: 5.5, sound: 'shotgun', price: 210, len: 10, accuracy: 0.5, art: 'shotgun', eject: 'break',
    desc: 'Long barrels and a tighter pattern than a coach gun. Reaches farther.' },
  sawedoff: { name: 'Sawed-Off Shotgun', slot: 4, dmg: 14, pellets: 9, rate: 0.25, cap: 2, ammo: 'shells', reload: 'full', reloadTime: 1.0, spread: 0.34,
    range: 120, speed: 440, recoil: 6, sound: 'shotgun', price: 120, len: 5, accuracy: 0.3, art: 'sawn', eject: 'break',
    desc: 'Both barrels cut down to a hand-span. Terrifying in a doorway, useless across the street.' },
  pump: { name: 'Pump Shotgun', slot: 4, dmg: 12, pellets: 8, rate: 0.55, cap: 5, ammo: 'shells', reload: 'single', reloadTime: 0.5, spread: 0.22,
    range: 175, speed: 470, recoil: 5, cock: true, sound: 'shotgun', price: 380, len: 9, accuracy: 0.45, art: 'pump', eject: 'each',
    desc: 'Rack the slide and fire again. Five shells in the tube.' },
  semiauto: { name: 'Semi-Auto Shotgun', slot: 4, dmg: 11, pellets: 8, rate: 0.28, cap: 4, ammo: 'shells', reload: 'single', reloadTime: 0.45, spread: 0.24,
    range: 165, speed: 470, recoil: 4.6, sound: 'shotgun', price: 520, len: 9, accuracy: 0.42, art: 'pump', eject: 'each',
    desc: 'Fires as fast as you pull. The newest thing out of the East.' },
  scoped: { name: 'Scoped Long Rifle', slot: 5, dmg: 110, rate: 1.3, cap: 5, ammo: 'heavy', reload: 'full', reloadTime: 2.2, spread: 0.002,
    range: 900, speed: 950, recoil: 5, cock: true, sound: 'rifle', price: 620, len: 11, accuracy: 1, art: 'scoped', eject: 'each', zoom: true,
    desc: 'Hold right click to look far down the scope. The longest reach in the territory.' },
  bow: { name: 'Hunting Bow', slot: 5, dmg: 70, rate: 0.9, cap: 1, ammo: 'arrow', reload: 'full', reloadTime: 0.55, spread: 0.015,
    range: 420, speed: 380, recoil: 0.6, sound: 'bow', price: 90, len: 4, accuracy: 0.95, art: 'bow', silent: true, proj: 'arrow',
    desc: 'Silent. Nobody hears an arrow. Kills game without spoiling the pelt.' },
  firebow: { name: 'Bow (Fire Arrows)', slot: 5, dmg: 45, rate: 0.9, cap: 1, ammo: 'firearrow', reload: 'full', reloadTime: 0.7, spread: 0.015,
    range: 400, speed: 360, recoil: 0.6, sound: 'bow', price: 0, len: 4, accuracy: 0.95, art: 'bow', proj: 'arrow', fire: true, withBow: true,
    desc: 'Pitch-soaked arrows that start a fire wherever they land. Comes with the bow.' },
  tknife: { name: 'Throwing Knives', slot: 5, dmg: 55, rate: 0.45, cap: 1, ammo: 'tknife', reload: 'full', reloadTime: 0.25, spread: 0.02,
    range: 180, speed: 420, recoil: 0.4, sound: 'throw', price: 40, len: 3, accuracy: 0.9, art: 'tknife', silent: true, proj: 'knife',
    desc: 'Balanced blades. Quiet, quick, and you can pick a few back up.' },
  crank: { name: 'Crank Gun', slot: 0, dmg: 30, rate: 0.075, cap: 999, ammo: 'none', reload: 'full', reloadTime: 1, spread: 0.06,
    range: 520, speed: 700, recoil: 1.6, sound: 'repeater', price: 0, len: 0, accuracy: 0.7, art: 'none', noOwn: true, eject: 'each',
    desc: 'A mounted, hand-cranked battery gun. Press E at one to man it.' }
});

WEAPON_ORDER.length = 0;
WEAPON_ORDER.push('fists', 'knife', 'machete', 'tomahawk',
  'sa', 'da', 'derringer', 'navy', 'schofield', 'cavalry', 'autopistol',
  'lever', 'repeater', 'carbine', 'brasslever', 'bolt', 'rolling', 'buffalo',
  'shotgun', 'sawedoff', 'double', 'pump', 'semiauto',
  'bow', 'firebow', 'tknife', 'scoped');

/* who sells what: smaller towns carry less */
SHOP_STOCK.gunsmith.buy = ['weapon:machete', 'weapon:tomahawk', 'weapon:derringer', 'weapon:navy', 'weapon:da', 'weapon:schofield', 'weapon:cavalry', 'weapon:autopistol',
  'weapon:lever', 'weapon:repeater', 'weapon:carbine', 'weapon:brasslever', 'weapon:bolt', 'weapon:rolling', 'weapon:buffalo', 'weapon:scoped',
  'weapon:shotgun', 'weapon:sawedoff', 'weapon:double', 'weapon:pump', 'weapon:semiauto', 'weapon:bow', 'weapon:tknife',
  'ammo:revolver', 'ammo:rifle', 'ammo:shells', 'ammo:heavy', 'ammo:arrow', 'ammo:firearrow', 'ammo:tknife', 'dynamite'];
SHOP_STOCK.trapper.buy = ['weapon:bow', 'weapon:tomahawk', 'weapon:buffalo', 'ammo:arrow', 'ammo:firearrow', 'ammo:heavy', 'ammo:rifle', 'bandage'];
SHOP_STOCK.general.buy.push('weapon:machete', 'ammo:arrow');
SHOP_STOCK.fence.buy.push('weapon:sawedoff', 'weapon:derringer', 'ammo:shells', 'ammo:tknife');

const GUN_MODS = {
  barrel: { name: 'Rifled Barrel', price: 60, desc: '+15% damage and range.' },
  grip: { name: 'Custom Grip', price: 45, desc: '30% less recoil and 20% faster reloads.' },
  sights: { name: 'Fine Sights', price: 50, desc: '35% tighter shots.' },
  engrave: { name: 'Gold Engraving', price: 80, desc: 'Gold-inlaid scrollwork. Pure vanity, and worth it.' }
};

/* ---------------------------------------------------------------- arsenal */
const Arsenal = {
  wheel: null, turrets: [], slotMem: {},

  reset() { this.wheel = null; this.slotMem = {}; this.placeTurrets(); },
  mods(key) { const P = G.player; P.mods = P.mods || {}; return P.mods[key] || (P.mods[key] = {}); },
  has(key, m) { const P = typeof G !== 'undefined' && G.player; return !!(P && P.mods && P.mods[key] && P.mods[key][m]); },
  dmgMul(key) { return this.has(key, 'barrel') ? 1.15 : 1; },
  spreadMul(key) { return this.has(key, 'sights') ? 0.65 : 1; },
  recoilMul(key) { return this.has(key, 'grip') ? 0.7 : 1; },
  reloadMul(key) { return this.has(key, 'grip') ? 0.8 : 1; },

  ensure(P) {
    P.mods = P.mods || {};
    for (const k of WEAPON_ORDER) if (P.mag[k] === undefined) P.mag[k] = 0;
    for (const a in AMMO) if (P.ammo[a] === undefined) P.ammo[a] = 0;
    if (P.owned.bow) P.owned.firebow = true;
  },

  /* number keys: cycle through the owned weapons in that slot */
  slotKey(n) {
    const P = G.player;
    const list = WEAPON_ORDER.filter(k => WEAPONS[k].slot === n && P.owned[k]);
    if (!list.length) return;
    let next;
    if (WEAPONS[P.cur].slot === n) next = list[(list.indexOf(P.cur) + 1) % list.length];
    else next = list.includes(this.slotMem[n]) ? this.slotMem[n] : list[0];
    P.select(next);
  },
  onSelect(key) { const s = WEAPONS[key].slot; if (s) this.slotMem[s] = key; },

  /* ------------------------------------------------ weapon wheel */
  updateWheel() {
    const P = G.player, hold = Input.down('KeyT') && !UI.modal && !P.dead && !P.turret;
    if (hold && !this.wheel) {
      const list = WEAPON_ORDER.filter(k => P.owned[k]);
      this.wheel = { list, sel: list.indexOf(P.cur) };
      $('wheel').classList.remove('hidden');
    }
    if (!this.wheel) return;
    if (!hold) {
      const k = this.wheel.list[this.wheel.sel];
      $('wheel').classList.add('hidden'); this.wheel = null;
      if (k && k !== P.cur) P.select(k);
      return;
    }
    const c = $('wheel-canvas'), r = c.getBoundingClientRect();
    const mx = Input.mouse.x, my = Input.mouse.y;
    const dx = mx - (r.left + r.width / 2), dy = my - (r.top + r.height / 2);
    const n = this.wheel.list.length;
    if (Math.hypot(dx, dy) > 30 && n) {
      let a = Math.atan2(dy, dx) + Math.PI / 2; if (a < 0) a += TAU;
      this.wheel.sel = Math.floor(a / TAU * n + 0.5) % n;
    }
    this.drawWheel();
  },
  drawWheel() {
    const c = $('wheel-canvas'), g = c.getContext('2d'), W = c.width, cx = W / 2, cy = W / 2, P = G.player;
    const list = this.wheel.list, n = list.length, R1 = 90, R2 = 205;
    g.clearRect(0, 0, W, W);
    g.beginPath(); g.arc(cx, cy, R1 - 2, 0, TAU); g.fillStyle = 'rgba(20,12,6,.88)'; g.fill();
    for (let i = 0; i < n; i++) {
      const a0 = (i - 0.5) / n * TAU - Math.PI / 2, a1 = (i + 0.5) / n * TAU - Math.PI / 2, sel = i === this.wheel.sel;
      g.beginPath(); g.arc(cx, cy, R2, a0, a1); g.arc(cx, cy, R1, a1, a0, true); g.closePath();
      g.fillStyle = sel ? 'rgba(200,150,60,.85)' : 'rgba(30,20,12,.78)'; g.fill();
      g.strokeStyle = 'rgba(240,220,170,.35)'; g.lineWidth = 1.5; g.stroke();
      const am = (i / n) * TAU - Math.PI / 2, rr = (R1 + R2) / 2;
      const ix = cx + Math.cos(am) * rr, iy = cy + Math.sin(am) * rr;
      const sc = n > 22 ? 1 : n > 10 ? 1.5 : 2;
      Sprites.weaponIcon(g, list[i], ix - 28 * sc, iy - 9 * sc, sc, 56 * sc, 18 * sc);
    }
    const k = list[this.wheel.sel], w = k && WEAPONS[k];
    g.textAlign = 'center'; g.fillStyle = '#f0e0b8'; g.font = 'bold 15px Georgia, serif';
    if (w) {
      g.fillText(w.name, cx, cy - 6);
      g.font = '12px Georgia, serif'; g.fillStyle = '#c8b890';
      g.fillText(w.melee ? 'Melee' : `${P.mag[k]}/${w.cap} · ${P.ammo[w.ammo] || 0} spare`, cx, cy + 12);
      const ms = Object.keys(GUN_MODS).filter(m => this.has(k, m)).map(m => GUN_MODS[m].name.split(' ').pop());
      if (ms.length) g.fillText(ms.join(' · '), cx, cy + 28);
    }
  },

  /* ------------------------------------------------ gunsmith upgrades */
  shopEntries(shopId) {
    const shop = SHOPS[shopId]; if (!shop || shop.type !== 'gunsmith') return [];
    const P = G.player, key = P.cur, w = WEAPONS[key], out = [];
    if (!w || w.melee || w.noOwn) return [{ name: 'Gun upgrades', desc: 'Equip the gun you want to upgrade first.', price: 0, note: '', can: false, reason: 'Equip a gun', buy: () => {} }];
    for (const [m, d] of Object.entries(GUN_MODS)) {
      const has = this.has(key, m), price = Math.round(d.price * Progress.priceMul());
      out.push({ name: `${d.name}: ${w.name}`, desc: d.desc, price, note: has ? 'Installed' : '', can: !has && P.money >= price, reason: has ? 'Installed' : null,
        buy: () => { P.money -= price; this.mods(key)[m] = true; Sound.play('click'); UI.notify(`${d.name} fitted to your ${w.name}.`, 'good'); } });
    }
    return out;
  },

  /* ------------------------------------------------ crank guns */
  placeTurrets() {
    this.turrets = [];
    const f = World.poi.fortGate;
    if (f) { this.turrets.push({ x: f.x - 3 * TS, y: f.y - 3 * TS, face: Math.PI / 2, id: 'fg1' }, { x: f.x + 3 * TS, y: f.y - 3 * TS, face: Math.PI / 2, id: 'fg2' }); }
  },
  addTurret(x, y, face, id) { const t = { x, y, face: face || 0, id: id || 'm' + this.turrets.length, temp: true }; this.turrets.push(t); return t; },
  removeTemp() { this.turrets = this.turrets.filter(t => !t.temp); },
  interactions() {
    const P = G.player, out = [];
    if (P.turret) return out;
    for (const t of this.turrets) if (!t.manned) out.push({ label: 'Man the crank gun', x: t.x, y: t.y, r: 22, act: () => this.man(t) });
    return out;
  },
  man(t) {
    const P = G.player;
    if (P.mounted) return;
    P.turret = t; P.prevWeapon = P.cur; P.owned.crank = true; P.mag.crank = 999; P.cur = 'crank'; P.reload = null;
    P.x = t.x; P.y = t.y + 6;
    UI.notify('Crank gun manned. Hold left click to fire · press E or F to step off.', 'tip');
  },
  leave() {
    const P = G.player, t = P.turret; if (!t) return;
    P.turret = null; delete P.owned.crank; P.cur = P.prevWeapon && P.owned[P.prevWeapon] ? P.prevWeapon : 'sa';
    P.y = t.y + 14;
  },
  update(dt) {
    const P = G.player;
    if (!P) return;
    this.updateWheel();
    if (P.turret) {
      const t = P.turret;
      P.x = t.x; P.y = t.y + 6; P.mag.crank = 999; t.face = P.face;
      if (P.dead || ((Input.hit('KeyE') || Input.hit('KeyF')) && t.mannedT > 0.3)) { this.leave(); return; }
      t.mannedT = (t.mannedT || 0) + dt;
    } else for (const t of this.turrets) t.mannedT = 0;
    // NPC crank gunners turn the barrel toward their target
    for (const t of this.turrets) {
      const a = G.actors.find(x => x.turretId === t.id && !x.dead);
      t.manned = !!a || P.turret === t;
      if (a) { a.x = t.x; a.y = t.y + 6; t.face = a.face; }
    }
  },
  drawWorld(ctx) {
    for (const t of this.turrets) Sprites.crankGun(ctx, t.x, t.y, t.face);
  }
};

/* ---------------------------------------------------------------- projectiles */
if (typeof Bullets !== 'undefined') (function patchBullets() {
  const baseFire = Bullets.fire.bind(Bullets), baseUpdate = Bullets.update.bind(Bullets);
  Bullets.fire = function (x, y, a, wkey, owner, fac, dmgMul = 1, crit = false) {
    if (owner === G.player) { dmgMul *= Arsenal.dmgMul(wkey); }
    baseFire(x, y, a, wkey, owner, fac, dmgMul, crit);
    const b = this.pool.find(p => p.on && p.w === wkey && p.owner === owner && p.d === 0 && p.x === x);
    if (b) { b.proj = WEAPONS[wkey].proj || null; b.fire = !!WEAPONS[wkey].fire; if (owner === G.player && Arsenal.has(wkey, 'barrel')) b.range *= 1.15; }
  };
  Bullets.update = function (dt) {
    const live = this.pool.filter(b => b.on && (b.fire || b.proj === 'knife'));
    baseUpdate(dt);
    for (const b of live) if (!b.on) {
      if (b.fire) { Combat.hazards.push({ x: b.x, y: b.y, kind: 'fire', life: 5, max: 5, r: 24, owner: b.owner, tick: 0 }); Sound.play('fire', b.x, b.y, 0.6); }
      if (b.proj === 'knife' && b.owner === G.player && chance(0.6)) G.pickups = (G.pickups || []).concat([{ x: b.x, y: b.y, kind: 'tknife', t: 60 }]);
    }
  };
  Bullets.draw = function (ctx) {
    for (const b of this.pool) {
      if (!b.on) continue;
      const sp = Math.hypot(b.vx, b.vy), ux = b.vx / sp, uy = b.vy / sp;
      if (b.proj === 'arrow') {
        ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(b.x - ux * 10, b.y - uy * 10); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = '#e8e0d0'; ctx.fillRect((b.x - ux * 10) | 0, (b.y - uy * 10) | 0, 2, 1);
        ctx.fillStyle = b.fire ? '#ffb030' : '#c8ccd0'; ctx.fillRect(b.x | 0, b.y | 0, b.fire ? 2 : 1, b.fire ? 2 : 1);
        if (b.fire) G.tempLights.push({ x: b.x, y: b.y, r: 30, life: 0.03, max: 0.03 });
      } else if (b.proj === 'knife') {
        const a = b.d * 0.4;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(a);
        ctx.fillStyle = '#d8dde2'; ctx.fillRect(-3, -0.5, 4, 1); ctx.fillStyle = '#5a3a22'; ctx.fillRect(1, -0.5, 2, 1); ctx.restore();
      } else {
        const tl = WEAPONS[b.w] && WEAPONS[b.w].pellets ? 4 : WEAPONS[b.w] && WEAPONS[b.w].dmg > 80 ? 14 : 9;
        ctx.strokeStyle = 'rgba(255,236,170,0.85)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(b.x - ux * tl, b.y - uy * tl); ctx.lineTo(b.x, b.y); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.fillRect(b.x | 0, b.y | 0, 1, 1);
      }
    }
    // thrown knives lying on the ground
    for (const p of G.pickups || []) if (p.kind === 'tknife') { ctx.fillStyle = '#c8ccd0'; ctx.fillRect(p.x - 2, p.y, 4, 1); ctx.fillStyle = '#5a3a22'; ctx.fillRect(p.x + 2, p.y, 2, 1); }
  };
})();

Arsenal.pickupUpdate = function (dt) {
  const P = G.player; if (!G.pickups || !P) return;
  for (const p of G.pickups) {
    p.t -= dt;
    if (dist(P.x, P.y, p.x, p.y) < 14 && p.kind === 'tknife' && P.ammo.tknife < Progress.ammoMax('tknife')) { P.ammo.tknife++; p.t = 0; Sound.play('click', P.x, P.y, 0.5); }
  }
  G.pickups = G.pickups.filter(p => p.t > 0);
};

/* ---------------------------------------------------------------- art */
(function patchArt() {
  const baseShape = Sprites.weaponShape.bind(Sprites), baseIcon = Sprites.weaponIcon.bind(Sprites);
  const gold = '#e0b840';
  Sprites.weaponShape = function (ctx, key, ox) {
    const w = WEAPONS[key], R = (c, x, y, ww, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, ww, h); };
    if (!w) return;
    const eng = typeof G !== 'undefined' && G.player && G.player.cur === key && Arsenal.has(key, 'engrave');
    switch (w.art) {
      case 'fists': case 'knife': baseShape(ctx, key, ox); return;
      case 'machete': R('#3a2a1a', ox - 1, -1, 2, 2); R('#c8ccd0', ox + 1, -1, 7, 1); R('#9aa0a6', ox + 1, 0, 6, 1); return;
      case 'tomahawk': R('#6b4423', ox - 1, 0, 6, 1); R('#8a9096', ox + 4, -2, 2, 3); return;
      case 'pistol': baseShape(ctx, key === 'da' ? 'da' : 'sa', ox); break;
      case 'pocket': R('#6b4423', ox - 1, 0, 2, 2); R('#8a8e96', ox, -1, 3, 1); break;
      case 'longpistol': baseShape(ctx, 'sa', ox); R('#4a4e54', ox + 5, -1, 3, 1); break;
      case 'auto': R('#4a2c16', ox - 1, 0, 2, 3); R('#2e3136', ox, -1, 6, 2); R('#5c6066', ox + 1, -2, 3, 1); break;
      case 'lever': baseShape(ctx, 'lever', ox); break;
      case 'carbine': baseShape(ctx, 'repeater', ox); break;
      case 'brass': baseShape(ctx, 'lever', ox); R('#c8a040', ox, -1, 3, 2); break;
      case 'bigrifle': R('#7a4a26', ox - 4, -1, 4, 2); R('#2a2d32', ox, -1, 11, 1); R('#6b4423', ox + 1, 0, 3, 1); break;
      case 'bolt': R('#6a4022', ox - 4, -1, 4, 2); R('#3a3d42', ox, -1, 10, 1); R('#6b4423', ox + 1, 0, 6, 1); R('#8a8e96', ox + 1, -2, 1, 1); break;
      case 'scoped': R('#6a4022', ox - 4, -1, 4, 2); R('#3a3d42', ox, -1, 11, 1); R('#1a1a1a', ox + 1, -3, 6, 2); R('#6b4423', ox + 1, 0, 4, 1); break;
      case 'shotgun': baseShape(ctx, 'shotgun', ox); if (key === 'double') R('#33363a', ox + 8, -1, 2, 2); break;
      case 'sawn': R('#7a4a26', ox - 2, -1, 3, 2); R('#33363a', ox, -1, 4, 1); R('#45484e', ox, 0, 4, 1); break;
      case 'pump': baseShape(ctx, 'shotgun', ox); R('#5a3a1e', ox + 3, 0, 3, 1); break;
      case 'bow': ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, 0, 5, -1.2, 1.2); ctx.stroke(); R('#d8d0c0', ox, -4, 1, 9); return;
      case 'tknife': R('#d8dde2', ox, -1, 3, 1); R('#5a3a22', ox - 1, -1, 1, 1); return;
      default: return;
    }
    if (eng) R(gold, ox, -1, 2, 1);
  };
  Sprites.weaponIcon = function (ctx, key, x, y, sc) {
    const w = WEAPONS[key]; if (!w) return;
    const P = (c, px, py, ww = 1, h = 1) => { ctx.fillStyle = c; ctx.fillRect(x + px * sc, y + py * sc, ww * sc, h * sc); };
    const metal = '#4a4e56', dark = '#26282c', wood = '#7a4a26', woodD = '#5a3418', hi = '#9aa0aa', brass = '#c8a040', steel = '#d8dde2';
    switch (w.art) {
      case 'fists': case 'knife': baseIcon(ctx, key, x, y, sc); break;
      case 'pistol': baseIcon(ctx, key === 'da' ? 'da' : 'sa', x, y, sc);
        if (key === 'navy') { P(brass, 4, 3, 3, 4); P(dark, 9, 5, 10, 1); } if (key === 'schofield') { P(hi, 6, 2, 2, 1); P(dark, 4, 7, 2, 1); } break;
      case 'longpistol': baseIcon(ctx, 'sa', x, y, sc); P(metal, 21, 3, 7, 2); P(hi, 21, 3, 7, 1); break;
      case 'pocket': P(wood, 2, 5, 4, 5); P(woodD, 2, 9, 4, 1); P(brass, 5, 3, 4, 3); P(metal, 9, 3, 6, 1); P(dark, 9, 4, 6, 1); P(dark, 6, 6, 2, 2); break;
      case 'auto': P(woodD, 3, 5, 4, 7); P(wood, 3, 5, 4, 1); P(dark, 2, 2, 16, 3); P(metal, 7, 3, 5, 4); P(hi, 2, 2, 16, 1); P(dark, 8, 7, 3, 1); break;
      case 'lever': baseIcon(ctx, 'lever', x, y, sc); break;
      case 'carbine': baseIcon(ctx, 'repeater', x, y, sc); break;
      case 'brass': baseIcon(ctx, 'lever', x, y, sc); P(brass, 10, 3, 7, 4); P('#f0d070', 10, 3, 7, 1); break;
      case 'bigrifle': P(wood, 0, 4, 11, 3); P(woodD, 0, 6, 10, 2); P(metal, 11, 3, 5, 4); P(dark, 16, 3, 24, 2); P(hi, 16, 3, 24, 1); P(wood, 16, 5, 9, 2);
        if (key === 'rolling') P(hi, 12, 2, 2, 2); else P(dark, 12, 7, 1, 2); break;
      case 'bolt': P(wood, 0, 4, 11, 3); P(woodD, 0, 6, 10, 2); P(metal, 11, 3, 7, 3); P(dark, 18, 3, 18, 2); P(hi, 18, 3, 18, 1); P(wood, 16, 5, 14, 2); P(hi, 15, 6, 1, 2); P(hi, 15, 8, 2, 1); break;
      case 'scoped': P(wood, 0, 4, 11, 3); P(woodD, 0, 6, 10, 2); P(metal, 11, 3, 7, 3); P(dark, 18, 3, 20, 2); P(hi, 18, 3, 20, 1); P(wood, 16, 5, 12, 2);
        P('#1a1a1a', 11, 0, 14, 2); P('#3a3a3a', 10, 0, 1, 2); P('#6a8ab0', 25, 0, 1, 2); break;
      case 'shotgun': baseIcon(ctx, 'shotgun', x, y, sc); if (key === 'double') { P(dark, 31, 3, 6, 2); P(hi, 31, 3, 6, 1); } break;
      case 'sawn': P(wood, 0, 5, 6, 4); P(woodD, 0, 8, 5, 1); P(metal, 6, 3, 4, 4); P(dark, 10, 3, 9, 2); P('#3a3d42', 10, 5, 9, 1); P(hi, 10, 3, 9, 1); break;
      case 'pump': P(wood, 0, 4, 10, 3); P(woodD, 0, 6, 9, 2); P(metal, 10, 3, 5, 4); P(dark, 15, 3, 18, 2); P(dark, 15, 5, 16, 1); P(hi, 15, 3, 18, 1); P(woodD, 18, 5, 6, 2);
        if (key === 'semiauto') P(brass, 11, 4, 2, 1); break;
      case 'machete': P(woodD, 0, 4, 6, 3); P(wood, 0, 4, 6, 1); P(dark, 6, 3, 1, 5); P(steel, 7, 3, 19, 3); P('#aab0b6', 7, 6, 17, 1); P('#fff', 8, 3, 16, 1); break;
      case 'tomahawk': P(wood, 0, 5, 20, 2); P(woodD, 0, 6, 20, 1); P(metal, 18, 1, 4, 9); P(steel, 21, 1, 2, 9); P('#d8c8a8', 4, 4, 2, 4); break;
      case 'bow': ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2 * sc; ctx.beginPath(); ctx.arc(x + 4 * sc, y + 6 * sc, 9 * sc, -1.25, 1.25); ctx.stroke();
        P('#e8e0d0', 7, -2, 1, 16); P(woodD, 0, 5, 24, 1); P(key === 'firebow' ? '#ff9a30' : steel, 24, 4, 3, 3); P('#c84a2a', 0, 4, 3, 3); break;
      case 'tknife': for (let i = 0; i < 3; i++) { P(steel, 4 + i * 2, 1 + i * 3, 12, 2); P(woodD, i * 2, 1 + i * 3, 4, 2); } break;
      default: P(dark, 0, 4, 30, 4);
    }
    if (Arsenal.has(key, 'engrave')) { P('#e0b840', 4, 4, 4, 1); P('#e0b840', 9, 3, 3, 1); }
  };
  Sprites.crankGun = function (ctx, x, y, face) {
    const R = (c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(px, py, w, h); };
    x = Math.round(x); y = Math.round(y);
    this.shadow(ctx, x, y + 2, 9, 3);
    R('#4a3018', x - 7, y - 2, 2, 4); R('#4a3018', x + 5, y - 2, 2, 4); R('#3a2414', x - 6, y - 4, 12, 3);
    R('#2a1a0e', x - 8, y, 4, 4); R('#2a1a0e', x + 4, y, 4, 4);
    ctx.save(); ctx.translate(x, y - 7); ctx.rotate(face || 0); if (Math.cos(face || 0) < 0) ctx.scale(1, -1);
    R('#3a3d42', -4, -2, 8, 4); R('#c8a040', -4, -2, 8, 1); R('#26282c', 4, -2, 9, 3); R('#5a5e66', 4, -2, 9, 1); R('#26282c', -6, 1, 2, 3);
    ctx.restore();
  };
})();

/* ---------------------------------------------------------------- sounds */
if (typeof Sound !== 'undefined' && Sound.spatial) (function patchSound() {
  const base = Sound.play.bind(Sound);
  Sound.play = function (name, x, y, vol = 1) {
    if (name === 'bow' || name === 'throw') {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const sp = this.spatial(x, y); if (sp.g < 0.01) return;
      const t = this.ctx.currentTime + 0.005, o = this.out(sp.g * vol, sp.p);
      if (name === 'bow') { this.noiseBurst(o, t, 0.08, 900, 2, 0.5, 'bandpass'); this.tone(o, t, 220, 0.12, 0.25, 'triangle', 90); }
      else this.noiseBurst(o, t, 0.1, 2600, 2, 0.35, 'bandpass', 0.03);
      return;
    }
    if (name === 'fire') { if (!this.ctx || this.ctx.state !== 'running') return; const sp = this.spatial(x, y); if (sp.g < 0.01) return; this.noiseBurst(this.out(sp.g * vol, sp.p), this.ctx.currentTime, 0.4, 700, 0.6, 0.5); return; }
    return base(name, x, y, vol);
  };
})();

/* NPCs carry some of the new guns too */
Arsenal.npcWeapon = faction => faction === 'covenant' ? pick(['bolt', 'repeater', 'schofield', 'pump', 'carbine'])
  : faction === 'rattler' ? pick(['sa', 'sawedoff', 'brasslever', 'navy', 'double', 'lever'])
  : faction === 'soldier' ? pick(['carbine', 'bolt', 'schofield']) : pick(['sa', 'lever', 'shotgun']);

if (typeof Player !== 'undefined') (function () { const r = Player.prototype.reset; Player.prototype.reset = function () { r.call(this); this.turret = null; Arsenal.ensure(this); }; })();

Hooks.add({
  key: 'arsenal',
  reset: () => Arsenal.reset(),
  update: dt => { Arsenal.update(dt); Arsenal.pickupUpdate(dt); },
  interactions: () => Arsenal.interactions(),
  drawWorld: ctx => Arsenal.drawWorld(ctx),
  shopEntries: id => Arsenal.shopEntries(id),
  save: () => ({ mods: G.player.mods || {} }),
  load: ext => { const P = G.player; P.mods = (ext && ext.mods) || {}; Arsenal.ensure(P); }
});
