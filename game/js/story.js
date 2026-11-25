/* Outlaw County — story.js (v2.0)
 * "What the Ground Remembers": the cast, the crew's camp, stage builders,
 * and the helpers every chapter uses. The missions themselves live in
 * chapter1.js, chapter2.js and chapter3.js.
 */
'use strict';

/* ---------------------------------------------------------------- cast */
const COV_PAL = { hat: '#141414', band: '#5a5e66', shirt: '#3a3a3a', coat: '#1a1a1c', pants: '#2a2a2e', skin: '#d6a07a', boots: '#0e0e0e', hatType: 'flat' };
const RATTLER_PAL = { hat: '#3a2a1a', band: '#c8a040', shirt: '#6a4a2a', poncho: '#5a3a1a', pants: '#3a3028', skin: '#c48c64', boots: '#1a1410', hatType: 'cowboy', bandana: '#c8a040' };
const RAIDER_PAL = { hat: '#c8b080', band: '#a03020', shirt: '#e8e0c8', poncho: '#7a3a2a', pants: '#3a3028', skin: '#d6a07a', boots: '#1a1410', hatType: 'sombrero', bandana: '#3a2a1a' };

const CAST = {
  mara: { name: 'Mara Quill', weapon: 'schofield', pal: { hatType: 'flat', hat: '#4a2a1a', band: '#c8a040', shirt: '#d8c8a8', coat: '#7a2a1a', pants: '#3a3030', skin: '#e0b08a', hair: '#8a3a1a', boots: '#2a1a10' } },
  wes: { name: 'Wes Quill', weapon: 'da', pal: { hatType: 'bowler', hat: '#2a2a2a', band: '#6a2a2a', shirt: '#e6e0d0', vest: '#8a6a2a', pants: '#4a4a52', skin: '#e0b08a', hair: '#8a3a1a', mustache: '#8a3a1a', boots: '#1a1410' } },
  roz: { name: 'Roz Vega', weapon: 'double', pal: { hatType: 'cowboy', hat: '#8a6a4a', band: '#a04a2a', shirt: '#c9b48a', vest: '#5a3a2a', pants: '#3a3028', skin: '#c08a60', hair: '#14100c', bandana: '#a04a2a', boots: '#2a1a10' } },
  ezra: { name: 'Ezra Holloway', weapon: 'navy', pal: { hatType: 'flat', hat: '#5a5048', band: '#2a2a2a', shirt: '#d8d0c0', vest: '#3a3a3a', pants: '#4a4036', skin: '#d9a27a', hair: '#c8c8c0', beard: '#c8c8c0', boots: '#2a1a10' } },
  deacon: { name: 'Deacon Price', weapon: 'rolling', pal: { hatType: 'flat', hat: '#141414', band: '#3a3a3a', shirt: '#e6e0d0', coat: '#1a1a1a', pants: '#1a1a1a', skin: '#6e4630', hair: '#14100c', beard: '#8a8a88', boots: '#0e0e0e' } },
  toby: { name: 'Toby Fenn', weapon: 'carbine', pal: { hatType: 'cap', hat: '#6a5a3a', shirt: '#8a2a2a', pants: '#3a3a44', skin: '#efc6a0', hair: '#b8884a', boots: '#2a1a10' } },
  little: { name: '"Little" Ruiz', weapon: 'shotgun', pal: { hatType: 'sombrero', hat: '#c8b080', band: '#2a6a4a', shirt: '#e8e0c8', pants: '#5a4a3a', skin: '#b07a50', hair: '#14100c', mustache: '#14100c', build: 'wide', apron: '#e8e0d0', boots: '#2a1a10' } },
  june: { name: 'June Pettibone', weapon: null, pal: { hatType: 'bonnet', hat: '#d8c8a0', shirt: '#e6e0d0', dress: '#4a5a6a', apron: '#e8e0d0', skin: '#e8bc96', hair: '#8a5a2a' } }
};
const NPC_PALS = {
  vane: { hatType: 'none', hat: null, hair: '#c8c8c0', shirt: '#e6e0d0', coat: '#141414', pants: '#141414', skin: '#e0b08a', boots: '#0e0e0e' },
  kell: Object.assign({}, COV_PAL, { beard: '#a04a1a', hair: '#a04a1a', band: '#c8a040' }),
  brannigan: { hat: '#e0d6c0', band: '#3a2a1a', shirt: '#5e3c2a', vest: '#1f1a16', pants: '#3a3530', skin: '#c99470', boots: '#1a1410', badge: true, hatType: 'cowboy', mustache: '#c8c8c0', hair: '#c8c8c0' },
  whitlock: Object.assign({}, PAL.soldier, { hatType: 'flat', band: '#e0b840', mustache: '#c8c8c0', hair: '#c8c8c0', coat: '#2a3456' }),
  augusta: { hatType: 'bonnet', hat: '#3a3a3a', shirt: '#e6e0d0', dress: '#2a2a3a', skin: '#e8bc96', hair: '#4a2a14' },
  ma: { hatType: 'bonnet', hat: '#c8b080', shirt: '#b8a080', dress: '#5a4a3a', apron: '#e8e0d0', skin: '#d9a27a', hair: '#8a8a88' },
  rattler: Object.assign({}, RATTLER_PAL, { hat: '#1a1a1a', coat: '#4a3a2a', beard: '#3a2a1a', hair: '#3a2a1a' }),
  luz: { hatType: 'none', hat: null, shirt: '#e8e0c8', dress: '#8a2a2a', shawl: '#2a1a1a', skin: '#b07a50', hair: '#14100c' },
  pike: { hatType: 'none', hat: null, shirt: '#d8d0c0', vest: '#5a4a3a', pants: '#4a4036', skin: '#e0b08a', hair: '#8a8a88', mustache: '#8a8a88', boots: '#2a1a10' }
};

/* ---------------------------------------------------------------- story state */
const Story = {
  placesCache: null,
  f() { return MissionSys.flags; },
  alive(id) { return !this.f()['dead_' + id]; },
  present(id) { const f = this.f(); return !!f['join_' + id] && !f['dead_' + id] && !f['away_' + id]; },
  set(...keys) { for (const k of keys) MissionSys.flags[k] = true; },
  clear(...keys) { for (const k of keys) delete MissionSys.flags[k]; },
  camp() { return this.f().camp || 'canyon'; },
  campName() { return { canyon: 'Juniper Canyon Camp', lastwater: 'Last Water Camp', sanlucero: 'San Lucero' }[this.camp()]; },
  campPos() {
    const c = this.camp();
    if (c === 'lastwater') return { x: World.poi.lastWater.x + 2 * TS, y: World.poi.lastWater.y + TS };
    if (c === 'sanlucero') return { x: World.poi.sanLucero.x - 3 * TS, y: World.poi.sanLucero.y + TS };
    return { x: World.poi.hideoutFire.x, y: World.poi.hideoutFire.y };
  },
  campMarker() { const p = this.campPos(); return { x: p.x, y: p.y, label: this.campName() }; },

  /* ------------------------------------------------ places */
  /* every tile you can walk or ride to from Dustwater (computed once per world) */
  reachGrid() {
    if (this.reachCache && this.reachCache.w === World.W && this.reachCache.gen === World.buildings.length) return this.reachCache.g;
    const W = World.W, H = World.H, g = new Uint8Array(W * H), q = new Int32Array(W * H), s = World.poi.start;
    let h = 0, t = 0; const s0 = Math.floor(s.y / TS) * W + Math.floor(s.x / TS); q[t++] = s0; g[s0] = 1;
    while (h < t) {
      const i = q[h++], x = i % W, y = (i / W) | 0;
      if (x > 0 && !g[i - 1] && !(World.sol(x - 1, y) & SOL.MOVE)) { g[i - 1] = 1; q[t++] = i - 1; }
      if (x < W - 1 && !g[i + 1] && !(World.sol(x + 1, y) & SOL.MOVE)) { g[i + 1] = 1; q[t++] = i + 1; }
      if (y > 0 && !g[i - W] && !(World.sol(x, y - 1) & SOL.MOVE)) { g[i - W] = 1; q[t++] = i - W; }
      if (y < H - 1 && !g[i + W] && !(World.sol(x, y + 1) & SOL.MOVE)) { g[i + W] = 1; q[t++] = i + W; }
    }
    this.reachCache = { w: W, gen: World.buildings.length, g };
    return g;
  },
  reachable(x, y) { const tx = Math.floor(x / TS), ty = Math.floor(y / TS); return tx >= 0 && ty >= 0 && tx < World.W && ty < World.H && !!this.reachGrid()[ty * World.W + tx]; },
  /* the nearest reachable spot, searching outward ring by ring */
  snap(p) {
    if (!p || this.reachable(p.x, p.y)) return p;
    const g = this.reachGrid(), W = World.W, cx = Math.floor(p.x / TS), cy = Math.floor(p.y / TS);
    for (let r = 1; r < 90; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const x = cx + dx, y = cy + dy;
      if (x >= 0 && y >= 0 && x < W && y < World.H && g[y * W + x]) return Object.assign({}, p, { x: x * TS + 8, y: y * TS + 8 });
    }
    return p;
  },
  open(tx, ty, r = 120) {
    const p = World.randomOpenNear(tx * TS, ty * TS, 0, r, (x, y) => { const t = World.tileAtPx(x, y); return t === T.WATER || t === T.FLOOR || !this.reachable(x, y); });
    return p || { x: tx * TS + 8, y: ty * TS + 8 };
  },
  door(id, dy = 1) { const b = World.buildings.find(b => b.id === id); return b ? { x: b.door.x * TS + 8, y: (b.door.y + dy) * TS + 8, b } : null; },
  inside(id) { const b = World.buildings.find(b => b.id === id); return b ? { x: (b.x + b.w / 2) * TS, y: (b.y + b.h / 2) * TS, b } : null; },
  clerkOf(shopId) { return G.actors.find(a => a.shopId === shopId); },
  places() {
    if (this.placesCache && this.placesCache.seed === World.seed) return this.placesCache;
    const o = (x, y, r) => this.open(x, y, r), R = World.frontierRanches || [];
    const pl = {
      seed: World.seed,
      dwSaloon: World.poi.saloonFront, dwSheriff: World.poi.dwSheriffDoor, dwBank: World.poi.dwBank,
      widowPass: o(700, 40, 200), iceRiver: o(820, 34, 200), frostCamp: o(760, 72, 200),
      scTown: o(562, 132, 60), scMine: World.poi.silverMine, scPike: this.door('sc_hotel') || o(540, 118, 60), scJail: this.door('sc_sheriff') || o(580, 118, 60),
      eagleGorge: o(860, 140, 120), overhang: o(820, 128, 120),
      phTown: o(1030, 132, 60), phDocks: World.poi.harlowDocks || o(1075, 100, 60), phWarehouse: o(1068, 112, 60), clarion: this.door('ph_hotel') || o(1010, 118, 60),
      ranchDelaney: R[0] || o(330, 350, 80), ranchHendry: R[1] || o(260, 420, 80), ranchMirror: R[2] || o(470, 470, 80),
      roundup: o(((R[0] || {}).x || 330 * TS) / TS + 30, ((R[0] || {}).y || 350 * TS) / TS + 10, 120),
      siding: o(430, 150, 80), fortGate: World.poi.fortGate || o(420, 345, 60), cottonwood: o(560, 420, 80), ridge: o(590, 395, 120),
      stockade: this.door('fg_stockade') || o(410, 330, 40), fortWall: o(420, 312, 60),
      narrows: o(1010, 268, 140), canyonMouth: o(930, 250, 120), fortress: World.poi.rattlesnakeFortress, fortressRim: o(870, 316, 100),
      lastWater: World.poi.lastWater, bishop: o(740, 520, 150), juniper: World.poi.hideoutFire,
      hollowCreek: World.poi.hollowCreek, school: this.door('hc_school') || World.poi.hollowCreek, hcChurch: this.door('hc_church') || World.poi.hollowCreek,
      graves: { x: (196 - 12) * TS, y: (598 + 13) * TS },
      sanLucero: World.poi.sanLucero, slBridge: World.poi.sanLuceroBridge, slMission: this.door('sl_mission') || World.poi.sanLucero,
      ford1: o(420, World.riverCY ? World.riverCY(420) : 795, 30), ford2: o(900, World.riverCY ? World.riverCY(900) : 795, 30),
      heronGrove: o(470, (World.riverCY ? World.riverCY(470) : 795) - 40, 100), northBluff: o(640, (World.riverCY ? World.riverCY(640) : 795) - 30, 60),
      waterTower: o(440, 150, 80), crossroads: o(380, 380, 120), fenceHouse: R[3] || o(520, 470, 80),
      fgPrisonGate: World.poi.fortGate || o(420, 345, 60), dwGraves: o(80, 128, 80)
    };
    for (const k in pl) if (pl[k] && typeof pl[k] === 'object' && pl[k].x !== undefined) pl[k] = this.snap(pl[k]);
    this.placesCache = pl; return pl;
  },
  at(key) { const p = typeof key === 'function' ? key() : typeof key === 'string' ? this.places()[key] : key; return p || World.poi.start; },

  /* ------------------------------------------------ actors */
  ensure(id, near) {
    let a = G.actors.find(x => x.giver === id && !x.dead);
    if (!a) {
      const c = CAST[id], p = near || this.campPos();
      a = spawnActor('gang', p.x, p.y, { name: c.name, pal: Object.assign({}, c.pal), weapon: c.weapon, giver: id, invuln: true, hp: 220, post: { x: p.x, y: p.y, face: 0 } });
    }
    if (id === 'toby') a.pal = Object.assign({}, CAST.toby.pal, this.f().tobyDuster ? { coat: '#1a1a1c', hatType: 'flat', hat: '#141414' } : {});
    return a;
  },
  npc(key, name, x, y, o = {}) {
    const a = spawnActor(o.kind || 'gang', x, y, Object.assign({ name, pal: Object.assign({}, NPC_PALS[key] || PAL.gang), weapon: null, invuln: true, mission: MissionSys.active && MissionSys.active.id, post: { x, y, face: o.face || Math.PI / 2 } }, o));
    if (MissionSys.active) MissionSys.data.spawned.push(a);
    return a;
  },
  squad(ids) {
    const P = G.player, out = [];
    for (const id of ids) {
      if (!this.alive(id)) continue;
      const a = this.ensure(id);
      if (!a.homePost && a.post) a.homePost = a.post;
      a.post = null; a.follow = true; a.crew = true; a.path = null; a.invuln = true;
      a.ownHorse = a.ownHorse || new Horse(id === 'toby' && this.f().tobyMare ? 'mustang' : 'morgan', a.x, a.y, { owner: 'law' });
      if (!Game.onScreen(a.x, a.y, 30) || dist(a.x, a.y, P.x, P.y) > 400) { const sp = World.randomOpenNear(P.x, P.y, 20, 60) || P; a.x = sp.x; a.y = sp.y; }
      out.push(a);
    }
    MissionSys.data.crew = (MissionSys.data.crew || []).concat(out);
    return out;
  },
  dismiss(ids) { for (const id of ids) { const a = G.actors.find(x => x.giver === id); if (a) { a.follow = false; a.crew = false; a.mounted = null; a.ownHorse = null; if (a.homePost) a.post = a.homePost; } } },

  enemy(type, x, y, o = {}) {
    const base = {
      cov: { name: 'Covenant Rider', pal: COV_PAL, weapon: Arsenal.npcWeapon('covenant'), hp: 95, cash: randi(12, 30) },
      rattler: { name: 'Rattlesnake', pal: RATTLER_PAL, weapon: Arsenal.npcWeapon('rattler'), hp: 80, cash: randi(8, 24) },
      raider: { name: '"Raider"', pal: RAIDER_PAL, weapon: Arsenal.npcWeapon('covenant'), hp: 95, cash: randi(10, 25) },
      guard: { name: 'Company Guard', pal: Object.assign({}, PAL.guard), weapon: pick(['repeater', 'shotgun', 'carbine']), hp: 90, cash: randi(10, 25) }
    }[type];
    const pal = Object.assign({}, base.pal, Looks.face());
    const a = spawnActor('rival', x, y, Object.assign({ forceHostile: true, aggro: true, temp: true, noRole: false }, base, { pal }, o));
    if (o.mounted) a.mounted = new Horse(pick(['morgan', 'quarter', 'mustang']), a.x, a.y, { owner: 'law' });
    if (type === 'cov' || type === 'guard') a.covenant = true;
    if (MissionSys.active) { a.mission = MissionSys.active.id; MissionSys.data.spawned.push(a); }
    return a;
  },
  ring(where, n, type, r0 = 80, r1 = 160, o = {}) {
    const c = this.at(where), out = [];
    for (let i = 0; i < n; i++) {
      const sp = World.randomOpenNear(c.x, c.y, r0, r1, (x, y) => !this.reachable(x, y)) || World.randomOpenNear(c.x, c.y, 0, r1 + 80, (x, y) => !this.reachable(x, y)) || this.snap({ x: c.x, y: c.y });
      out.push(this.enemy(type, sp.x, sp.y, typeof o === 'function' ? o(i) : o));
    }
    return out;
  },
  /* guards who stand at posts and only fight once they spot you */
  posted(where, n, type, r = 90, o = {}) {
    return this.ring(where, n, type, 10, r, Object.assign({ forceHostile: false, aggro: false }, o)).map(a => { a.post = { x: a.x, y: a.y, face: rand(TAU) }; a.sentry = true; a.preferLaw = true; return a; });
  },
  alarm(list) { for (const a of list) if (!a.dead) { a.forceHostile = true; a.aggro = true; a.post = null; a.sentry = false; a.preferLaw = false; } }
};

/* the Covenant wears the law's authority: it doesn't fight town lawmen, and
   unalerted sentries don't start fights with anyone */
(function () {
  const base = npcHostile;
  npcHostile = function (a, b) {
    if (a.sentry || b.sentry) return false;
    if ((a.covenant && b.faction === 'law') || (b.covenant && a.faction === 'law')) return false;
    return base(a, b);
  };
})();

/* ---------------------------------------------------------------- stage builders */
const St = {
  go(text, where, r = 110, o = {}) {
    return Object.assign({ text, marker: () => { const p = Story.at(where); return { x: p.x, y: p.y - 24, label: o.label || '' }; },
      done: () => { const p = Story.at(where); return nearPlayer(p.x, p.y, r); } }, o.stage || {});
  },
  scene(text, lines, o = {}) {
    const finish = d => { if (d.sceneDone) return; d.sceneDone = true; if (o.choices && d.choice === undefined) { d.choice = o.choices[0].value; if (o.onChoose) o.onChoose(d.choice, d); } if (o.after) o.after(d); };
    return { text, enter: d => {
        d.sceneDone = false; d.opened = false; if (o.before) o.before(d);
        setTimeout(() => { d.opened = true; UI.dialogue(typeof lines === 'function' ? lines(d) : lines, () => finish(d), o.choices ? { choices: o.choices, onChoose: v => { d.choice = v; if (o.onChoose) o.onChoose(v, d); } } : {}); }, o.delay || 300);
      },
      // if the scene's dialogue was closed some other way, still finish the scene
      done: d => { if (!d.sceneDone && d.opened && d.st > 1 && !UI.dlg) finish(d); return d.sceneDone && d.st > 0.4; },
      fail: o.fail, cleanupScene: finish };
  },
  talk(id, text, lines) {
    return { text, talk: id, lines, marker: () => { const a = MissionSys.giver(id); return a ? { x: a.x, y: a.y - 24, label: CAST[id] ? CAST[id].name.split(' ')[0].replace(/"/g, '') : '' } : null; }, done: d => d.events['talk:' + id] };
  },
  clear(text, where, spawn, o = {}) {
    return { text: typeof text === 'function' ? text : d => `${text} (${(d.foes || []).filter(a => !a.dead).length} left)`,
      enter: d => { d.foes = spawn(d); if (o.enter) o.enter(d); },
      marker: d => (d.foes || []).filter(a => !a.dead).slice(0, 12).map(a => ({ x: a.x, y: a.y - 26, label: '', small: true })),
      fail: o.fail, done: d => d.st > 0.5 && d.foes.every(a => a.dead || a.surrendered || a.knockedOut) };
  },
  survive(text, where, secs, wave, o = {}) {
    const R = o.stay || 300, here = () => { const p = Story.at(where); return nearPlayer(p.x, p.y, R); };
    return { text: d => d.arrived ? `${text} (${Math.max(0, Math.ceil(secs - d.held))}s)` : `Get into position. ${text}`,
      enter: d => { d.foes = []; d.waveT = 0; d.held = 0; d.arrived = false; if (o.enter) o.enter(d); },
      marker: d => { const p = Story.at(where); return [{ x: p.x, y: p.y - 24, label: o.label || '' }, ...d.foes.filter(a => !a.dead).slice(0, 8).map(a => ({ x: a.x, y: a.y - 26, label: '', small: true }))]; },
      fail: d => (o.fail && o.fail(d)) || (o.stay && d.arrived && !here() ? o.stayMsg || 'You abandoned your post.' : null),
      done: (d, dt) => {
        if (!d.arrived) { if (!here()) return false; d.arrived = true; }
        d.held += dt; d.waveT -= dt;
        if (d.waveT <= 0 && d.held < secs - 4) { d.waveT = o.every || 9; d.foes.push(...wave(d)); }
        return d.held >= secs && (!o.clearAfter || d.foes.every(a => a.dead));
      } };
  },
  act(text, where, label, dur, o = {}) {
    return { text, marker: () => { const p = Story.at(where); return { x: p.x, y: p.y - 20, label: o.mark || label }; },
      interact: d => { if (d.acted) return []; const p = Story.at(where); return [{ label, x: p.x, y: p.y, r: o.r || 30, act: () => Interact.begin(label, dur, () => { d.acted = true; if (o.done) o.done(d); MissionSys.event('acted'); }, { sound: o.sound || 'click', range: 60 }) }]; },
      enter: o.enter, fail: o.fail, done: d => d.acted };
  },
  wait(text, secs, o = {}) { return { text: d => `${text}${o.count ? ` (${Math.max(0, Math.ceil(secs - d.st))}s)` : ''}`, enter: o.enter, marker: o.marker, fail: o.fail, done: d => d.st >= secs }; },
  /* get from A to B without being seen */
  sneak(text, goal, guards, o = {}) {
    return { text: d => `${text}${d.spot > 0.05 ? `  — ${d.spot > 0.7 ? 'THEY ARE ONTO YOU' : 'careful, you are being noticed'}` : ''}`,
      enter: d => { d.spot = 0; d.guards = guards(d); UI.notify('Stealth: crouch (C), stay out of sight lines, and knock guards out from behind with your fists.', 'tip'); },
      marker: () => { const p = Story.at(goal); return { x: p.x, y: p.y - 22, label: o.label || '' }; },
      fail: d => d.spotted && !o.loud ? (o.failMsg || 'You were spotted.') : null,
      done: (d, dt) => {
        const P = G.player;
        let seen = false;
        for (const a of d.guards) if (!a.dead && !a.knockedOut && a.canSee(P, P.crouch ? 70 : 115)) seen = true;
        d.spot = clamp(d.spot + (seen ? dt * (P.crouch ? 0.7 : 1.4) : -dt * 0.5), 0, 1);
        if (d.spot >= 1 && !d.spotted) { d.spotted = true; if (o.loud) { Story.alarm(d.guards); UI.notify('You were spotted! Fight your way through.', 'crime'); } }
        const p = Story.at(goal); return nearPlayer(p.x, p.y, o.r || 34);
      } };
  },
  /* drive loose cattle into a pen */
  herd(text, where, pen, n, need) {
    return { text: d => `${text} (${d.herd ? d.herd.filter(c => !c.dead && dist(c.x, c.y, Story.at(pen).x, Story.at(pen).y) < 70).length : 0}/${need})`,
      enter: d => {
        const c = Story.at(where); d.herd = [];
        for (let i = 0; i < n; i++) { const sp = World.randomOpenNear(c.x, c.y, 10, 90, (x, y) => !Story.reachable(x, y)) || c; const cow = new Animal('cow', sp.x, sp.y); cow.herd = true; G.animals.push(cow); d.herd.push(cow); }
        UI.notify('Ride up behind the cattle to push them. They move away from you.', 'tip');
      },
      marker: d => { const p = Story.at(pen); return [{ x: p.x, y: p.y - 24, label: 'Pen' }, ...d.herd.filter(c => !c.dead && dist(c.x, c.y, p.x, p.y) >= 70).map(c => ({ x: c.x, y: c.y - 16, label: '', small: true }))]; },
      fail: d => d.herd.filter(c => !c.dead).length < need ? 'Too many cattle were lost.' : null,
      done: d => { const p = Story.at(pen); return d.herd.filter(c => !c.dead && dist(c.x, c.y, p.x, p.y) < 70).length >= need; } };
  },
  /* someone must reach a place, with the player alongside */
  bring(text, who, where, o = {}) {
    return { text, enter: d => { const a = typeof who === 'function' ? who(d) : Story.ensure(who); d.carry = a; a.follow = true; a.post = null; if (o.enter) o.enter(d); },
      marker: d => { const p = Story.at(where); return [{ x: p.x, y: p.y - 24, label: o.label || '' }, { x: d.carry.x, y: d.carry.y - 26, label: '', small: true }]; },
      fail: d => d.carry.dead ? `${d.carry.name} was killed.` : (o.fail ? o.fail(d) : null),
      done: d => { const p = Story.at(where); return nearPlayer(p.x, p.y, o.r || 120) && dist(d.carry.x, d.carry.y, p.x, p.y) < (o.r || 120) + 60; } };
  },
  do(text, fn) { return { text, enter: d => fn(d), done: () => true }; }
};

/* dialogue choices, and a queue so two dialogues never overwrite each other */
(function patchDialogue() {
  const baseDlg = UI.dialogue.bind(UI), baseEnd = UI.endDialogue.bind(UI);
  UI.dlgQueue = [];
  UI.dialogue = function (lines, onDone, opts = {}) {
    if (this.dlg) { this.dlgQueue.push([lines, onDone, opts]); return; }
    baseDlg(lines, onDone, opts);
  };
  UI.endDialogue = function (ok) {
    baseEnd(ok);
    if (!this.dlg && this.dlgQueue.length) { const q = this.dlgQueue.shift(); setTimeout(() => UI.dialogue(...q), 250); }
  };
  const base = UI.renderDialogue.bind(UI);
  UI.renderDialogue = function () {
    const d = this.dlg, last = d.i === d.lines.length - 1;
    if (!(last && d.opts.choices)) return base();
    const l = d.lines[d.i];
    $('dlg-who').textContent = l.who; $('dlg-text').textContent = l.text;
    const act = $('dlg-actions'); act.innerHTML = '';
    for (const c of d.opts.choices) {
      const b = document.createElement('button'); b.className = 'btn'; b.textContent = c.label;
      b.onclick = e => { e.stopPropagation(); d.opts.onChoose(c.value); this.endDialogue(true); };
      act.append(b);
    }
  };
  const adv = UI.advanceDialogue.bind(UI);
  UI.advanceDialogue = function () { const d = this.dlg; if (d && d.i === d.lines.length - 1 && d.opts.choices) return; return adv(); };
})();

/* ---------------------------------------------------------------- camp & cast placement */
MissionSys.placeGivers = function () {
  const f = Story.f(), camp = Story.campPos(), act = this.active;
  const order = ['mara', 'wes', 'roz', 'ezra', 'deacon', 'toby', 'little', 'june'];
  const offs = [[-4, -1, 0], [5, 3, Math.PI], [-1, -4, Math.PI / 2], [3, -3, Math.PI / 2], [-5, 3, 0], [6, -1, Math.PI], [-3, 5, -Math.PI / 2], [2, 5, -Math.PI / 2]];
  if (!f.join_mara) Story.set('join_mara', 'join_wes', 'join_roz', 'join_ezra', 'join_deacon', 'join_toby', 'join_little', 'join_june');
  order.forEach((id, i) => {
    const there = Story.present(id) && !(act && act.away && act.away.includes(id));
    let a = G.actors.find(x => x.giver === id);
    if (!there) { if (a && !a.follow && !(act && act.uses && act.uses.includes(id))) { const k = G.actors.indexOf(a); if (k >= 0) G.actors.splice(k, 1); } return; }
    if (!a) a = Story.ensure(id, { x: camp.x + offs[i][0] * TS, y: camp.y + offs[i][1] * TS });
    if (a.follow || (act && act.holdsGivers && act.holdsGivers.includes(id))) return;
    const post = { x: camp.x + offs[i][0] * TS, y: camp.y + offs[i][1] * TS, face: offs[i][2] };
    a.post = post; a.homePost = post;
    if (dist(a.x, a.y, post.x, post.y) > 300 && !Game.onScreen(a.x, a.y, 30) && !Game.onScreen(post.x, post.y, 30)) { a.x = post.x; a.y = post.y; a.path = null; }
  });
  // the camp follows the story; Brannigan's office passes on after Eagle Gorge
  if (f.dead_brannigan) { const s = G.actors.find(a => a.name === 'Sheriff Tom Brannigan'); if (s) s.name = 'Sheriff Will Tate'; }
};

/* the old Hollister hands are gone; the camp fence and the cook stay */
Spawner.spawnGang = function () {
  const fp = World.poi.fence;
  if (!G.actors.some(a => a.shopId === 'camp_fence')) spawnActor('gang', fp.x, fp.y, { name: 'Old Silas', weapon: 'shotgun', invuln: true, post: { x: fp.x, y: fp.y, face: Math.PI / 2 }, pal: Object.assign({}, PAL.gang, { hat: '#3a3a3a', shirt: '#6a6a5a', beard: '#c8c8c0', hair: '#c8c8c0' }), shopId: 'camp_fence' });
};

Story.opening = () => [
  { who: 'Hollow Creek, 1885', text: 'Smoke over the salt flats. A schoolhouse door. A shape with a shotgun, and six children behind it. One shot.' },
  { who: 'Hollow Creek, 1885', text: 'A young lieutenant of the Iron Covenant gets the children out, hides a set of account books under the schoolhouse floor, and rides into the salt. He never goes back.' },
  { who: 'Outlaw County, 1893', text: 'Eight years later he calls himself Nate Calder. He robs payrolls with Mara Quill\'s crew and does not talk about the past.' },
  { who: 'Controls', text: 'WASD move · Shift sprint · Mouse aim · Left click shoot · Right click steady aim · R reload · E interact · F mount · 1–5 or hold T for the weapon wheel · Tab saddlebags · M map · Esc pause.' },
  { who: 'Gunfighting', text: 'Space dodge-rolls · C crouches behind cover · G throws dynamite · V slows time with Steady Nerves · Hold right click until the crosshair turns gold for a precise shot.' }
];

/* save migration: the five Hollister missions became the prologue */
Story.migrate = function () {
  const done = MissionSys.completed, old = ['intro', 'store', 'coach', 'rescue', 'bank'];
  if (done.some(id => old.includes(id))) {
    MissionSys.completed = done.filter(id => !old.includes(id));
    if (!MissionSys.completed.includes('p0')) MissionSys.completed.push('p0');
    Story.set('hideout', 'oldSave');
    setTimeout(() => UI.notify('The story has been rewritten for v2.0. Your money, guns and gear carry over. Find Mara Quill at Juniper Canyon Camp to begin Chapter 1.', 'mission'), 2500);
  }
};

Hooks.add({ key: 'story', reset: () => { Story.placesCache = null; UI.dlgQueue = []; if (UI.dlg) { UI.dlg = null; $('dialogue').classList.add('hidden'); } }, load: () => Story.migrate(), update: () => {} });

/* chapter title cards */
Story.chapter = (n, title, lines) => { UI.banner(title, `CHAPTER ${n}`); Sound.play('mission'); if (lines) setTimeout(() => UI.dialogue(lines), 2200); };
