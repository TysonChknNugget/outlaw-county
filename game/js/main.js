/* Outlaw County — main.js
 * Game state, main loop, camera, y-sorted renderer, save system and the
 * glue that ties every system together.
 */
'use strict';

const G = {
  state: 'menu', time: 8 * 60, timeScale: 1,
  player: null, actors: [], horses: [], animals: [], coaches: [], targets: [], train: null,
  cam: { x: 0, y: 0, shake: 0, kick: 0 }, mouseWorld: { x: 0, y: 0 },
  floaters: [], tempLights: [], region: '',
  settings: { master: 0.8, sfx: 0.9, music: 0.45, difficulty: 'normal', zoom: 'normal', shake: true, fps: false, minimap: true },
  world: null, stats: null
};

const SaveSys = {
  SLOTS: ['auto', '1', '2', '3'],
  key: s => 'outlawcounty.save.' + s,
  serialize() {
    const P = G.player, h = P.horse && !P.horse.dead ? P.horse : null;
    return {
      version: 1,
      meta: { savedAt: Date.now(), day: Env.day(), region: G.region || World.regionAt(P.x, P.y), money: P.money, missions: MissionSys.completed.length },
      time: G.time, weather: Env.weather,
      player: { x: P.x, y: P.y, hp: P.hp, money: P.money, owned: P.owned, mag: P.mag, ammo: P.ammo, cur: P.cur, inv: P.inv, mounted: !!P.mounted,
        xp: P.xp, level: P.level, perkPoints: P.perkPoints, perks: P.perks, nerve: P.nerve, throwSel: P.throwSel },
      bounties: Bounties.save(),
      horse: h ? { breed: h.breed, name: h.name, coat: h.coat, pinto: h.pinto, hp: h.hp, x: h.x, y: h.y } : null,
      law: { bounty: Law.bounty },
      missions: { completed: MissionSys.completed, flags: MissionSys.flags },
      world: Object.assign({}, G.world, { explored: Discovery.encode(G.world.explored || Discovery.fresh()), camps: World.banditCamps.map(c => c.members.length && c.members.every(m => m.dead) ? (c.clearedAt >= 0 ? c.clearedAt : G.time) : -1) }),
      stats: G.stats
    };
  },
  save(slot) {
    if (!G.player || G.player.dead) return 'You cannot save right now.';
    if (Law.heat > 0) return 'You cannot save while the law is hunting you.';
    if (MissionSys.active) return 'You cannot save during a mission.';
    try { localStorage.setItem(this.key(slot), JSON.stringify(this.serialize())); return null; }
    catch (e) { return 'Saving failed: ' + e.message; }
  },
  read(slot) { try { const s = localStorage.getItem(this.key(slot)); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  remove(slot) { localStorage.removeItem(this.key(slot)); },
  list() { return this.SLOTS.map(slot => { const d = this.read(slot); return { slot, meta: d && d.meta }; }); },
  latest() { return this.list().filter(s => s.meta).sort((a, b) => b.meta.savedAt - a.meta.savedAt)[0] || null; }
};

/* ---------------- loading screen ---------------- */
const LOADING_TIPS = [
  'Crimes need witnesses. Stop a civilian before they reach the sheriff and the crime never happened.',
  'Break line of sight — hide in brush or indoors — and the law will eventually call off the search.',
  'Pay off your bounty at a train station or sheriff\'s office when nobody is chasing you.',
  'Hold right mouse to steady your aim and draw your gun. You need it drawn to rob a clerk.',
  'Trains stop at every station. That\'s your chance to crack the express car.',
  'Press H to whistle and your horse will come running.',
  'Galloping drains your horse\'s stamina. Feed it oats to keep it fresh.',
  'Old Silas at the Hollister camp buys stolen goods, no questions asked.',
  'Buy a round at the saloon and someone might let slip where treasure is buried.',
  'The single-action hits hard but you have to thumb the hammer between shots.',
  'Pelts sell best at Trapper Jo\'s cabin in Pinewood Forest.',
  'Rent a hotel room to sleep until morning, heal up and save your game.',
  'Rattlesnake gang camps are dangerous, but their loot is worth the risk.',
  'At one wanted star, lawmen try to arrest you. Press E to surrender, or run.'
];

const Loading = {
  show(status) {
    const el = $('loading');
    el.classList.remove('hidden', 'out');
    $('ld-continue').classList.add('hidden');
    $('ld-tip').textContent = pick(LOADING_TIPS);
    this.set(0, status);
  },
  set(p, status) {
    $('ld-fill').style.width = Math.round(p * 100) + '%';
    if (status) $('ld-status').textContent = status;
    const n = Math.floor(p * 6 + 0.001);
    Array.from($('loading').querySelectorAll('.ld-cylinder i')).forEach((c, i) => c.classList.toggle('on', i < n));
  },
  tick() { return new Promise(r => setTimeout(r, 30)); },
  /* render the terrain chunks around a point ahead of time so the first frames are smooth */
  async prewarm(x, y, from, to, status) {
    const S = World.CH * TS, mx = Game.vw / 2 + S, my = Game.vh / 2 + S;
    const list = [];
    for (let cy = Math.max(0, Math.floor((y - my) / S)); cy <= Math.min(World.CHh - 1, Math.floor((y + my) / S)); cy++)
      for (let cx = Math.max(0, Math.floor((x - mx) / S)); cx <= Math.min(World.CW - 1, Math.floor((x + mx) / S)); cx++) list.push([cx, cy]);
    for (let i = 0; i < list.length; i++) {
      World.getChunk(list[i][0], list[i][1]);
      if (i % 3 === 2) { this.set(from + (to - from) * (i + 1) / list.length, status); await this.tick(); }
    }
    this.set(to, status);
  },
  waitForContinue() {
    $('ld-continue').classList.remove('hidden');
    return new Promise(res => {
      const go = () => { window.removeEventListener('pointerdown', go); window.removeEventListener('keydown', go); res(); };
      window.addEventListener('pointerdown', go); window.addEventListener('keydown', go);
    });
  },
  hide() {
    const el = $('loading');
    el.classList.add('out');
    setTimeout(() => { if (el.classList.contains('out')) el.classList.add('hidden'); }, 650);
  }
};

const Game = {
  canvas: null, ctx: null, overlay: null, octx: null, light: null,
  zoom: 3, vw: 640, vh: 360, dpr: 1, last: 0, fps: 60, fpsAcc: 0, fpsN: 0, t: 0,
  autosaveT: 180, drawList: [], menuCam: { x: 0, y: 0, a: 0 },

  async init() {
    this.canvas = $('view'); this.ctx = this.canvas.getContext('2d');
    this.overlay = $('overlay'); this.octx = this.overlay.getContext('2d');
    this.light = document.createElement('canvas');
    this.loadSettings();
    this.resize();
    Loading.show('Surveying the county...');
    await Loading.tick();
    World.generate(1889);
    Loading.set(0.35, 'Raising Dustwater...');
    await Loading.tick();
    Env.init(); FX.init(); Bullets.init();
    Input.init(this.overlay);
    UI.init(); UI.syncSettings();
    Loading.set(0.45, 'Rounding up the townsfolk...');
    await Loading.tick();
    this.resetState();
    Spawner.initWorld();
    G.player = new Player();
    MissionSys.placeGivers();
    this.menuCam = { x: 40 * TS, y: 112 * TS, a: 0 };
    window.addEventListener('resize', () => this.resize());
    window.addEventListener('beforeunload', () => { if (G.state === 'play') this.autosave(); });
    this.applySettings();
    await Loading.prewarm(this.menuCam.x, 118 * TS, 0.55, 1, 'Painting the frontier...');
    Loading.set(1, 'Ready.');
    UI.showMainMenu();
    const unlock = () => { Sound.init(); Sound.applyVolumes(); };
    window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
    requestAnimationFrame(ts => this.loop(ts));
    await Loading.waitForContinue(); // the first click also unlocks game audio
    Loading.hide();
  },

  /* run a world (re)build behind the loading screen */
  async withLoading(status, build) {
    if (this.busy) return;
    this.busy = true;
    const t0 = performance.now();
    Loading.show(status);
    await Loading.tick();
    try {
      if (build() === false) { Loading.hide(); return; }
      Loading.set(0.4, 'Saddling your horse...');
      await Loading.tick();
      await Loading.prewarm(G.player.x, G.player.y, 0.4, 1, 'Riding out...');
      const wait = 1300 - (performance.now() - t0);
      if (wait > 0) await new Promise(r => setTimeout(r, wait));
    } finally { this.busy = false; }
    Loading.set(1, 'Ready.');
    Loading.hide();
  },

  resetState() {
    G.time = 8 * 60; G.floaters = []; G.tempLights = []; G.region = '';
    G.world = { robbed: {}, treasuresFound: [], treasuresRevealed: [], cratesLooted: [], explored: Discovery.fresh(), discovered: ['Dustwater', 'Mesa Flats'], waypoint: null };
    Discovery.dirty = true;
    G.stats = { kills: 0, deaths: 0, shots: 0, hits: 0, robberies: 0, crimes: 0, earned: 0, hunted: 0, treasures: 0, missions: 0 };
    Law.reset(); MissionSys.reset(); Interact.action = null;
    Combat.reset(); Bounties.reset(); Events.reset();
    World.closeVault();
    for (const b of World.buildings) b.goldTaken = false;
    for (const c of World.banditCamps) c.clearedAt = -99999;
    Env.setWeather('clear'); Env.weatherT = 240;
    Spawner.encounterT = 90; Spawner.coachT = 30;
  },

  async newGame() {
    if (this.busy) return;
    await this.withLoading('Riding into Dustwater...', () => {
      this.resetState();
      Spawner.initWorld();
      G.player = new Player();
      MissionSys.placeGivers();
      this.snapCamera();
    });
    G.state = 'play'; this.snapCamera(); UI.enterGame(); UI.fade(1.5);
    G.region = World.regionAt(G.player.x, G.player.y);
    setTimeout(() => UI.dialogue([
      { who: 'Dustwater, 1893', text: "The 4:10 from Abilene hisses to a stop. You step onto the platform with a near-empty revolver, twenty-five dollars, and a telegram." },
      { who: 'Telegram', text: "COME TO DUSTWATER STOP ASK FOR BOONE AT THE RUSTY SPUR SALOON STOP WORK FOR A STEADY HAND STOP" },
      { who: 'Controls', text: "WASD move · Shift sprint · Mouse aim · Left click shoot · Right click steady aim · R reload · E interact · F mount · Tab inventory · M map · Esc pause." },
      { who: 'Gunfighting', text: "Space dodge-rolls · C crouches behind cover · G throws dynamite · V slows time with Steady Nerves · Hold right click until the crosshair turns gold for a precise shot." }
    ]), 900);
  },

  async load(slot) {
    const s = SaveSys.read(slot);
    if (!s) { UI.notify('That save could not be read.', 'bad'); return; }
    if (this.busy) return;
    await this.withLoading('Loading your saved game...', () => this.applySave(s));
    G.state = 'play'; this.snapCamera(); UI.enterGame(); UI.fade(1.2);
    G.region = World.regionAt(G.player.x, G.player.y);
    UI.notify(`Loaded ${slot === 'auto' ? 'autosave' : 'slot ' + slot}. Day ${Env.day()}, ${Env.clock()}.`, 'good');
  },

  applySave(s) {
    this.resetState();
    Spawner.initWorld();
    G.player = new Player();
    const P = G.player, sp = s.player;
    G.time = s.time;
    Object.assign(P, { x: sp.x, y: sp.y, hp: sp.hp, money: sp.money, owned: sp.owned, mag: sp.mag, ammo: sp.ammo, cur: sp.cur, inv: sp.inv });
    Law.bounty = s.law.bounty || 0;
    MissionSys.completed = s.missions.completed.slice(); MissionSys.flags = Object.assign({}, s.missions.flags);
    G.world = Object.assign({ robbed: {}, treasuresFound: [], treasuresRevealed: [], cratesLooted: [] }, s.world);
    delete G.world.camps;
    G.world.explored = typeof s.world.explored === 'string' ? Discovery.decode(s.world.explored) : Discovery.fresh(); Discovery.dirty = true; Discovery.ensure();
    G.stats = Object.assign(G.stats, s.stats);
    // version 1.2 additions (older saves get defaults)
    P.owned.fists = true;
    Object.assign(P, { xp: sp.xp || 0, level: sp.level || 1, perkPoints: sp.perkPoints || 0, perks: sp.perks || {}, nerve: sp.nerve || 0, throwSel: sp.throwSel || 'dynamite' });
    Progress.apply(); P.hp = Math.min(sp.hp, P.maxHp);
    Bounties.load(s.bounties);
    if (s.horse) {
      const h = new Horse(s.horse.breed, s.horse.x, s.horse.y, { owner: 'player', name: s.horse.name, coat: s.horse.coat, pinto: s.horse.pinto });
      h.hp = s.horse.hp; h.saddle = true; G.horses.push(h); P.horse = h;
      if (sp.mounted) { h.x = P.x; h.y = P.y; P.mount(h); }
    }
    if (s.world.camps) s.world.camps.forEach((v, i) => { if (v >= 0 && World.banditCamps[i]) { World.banditCamps[i].members.forEach(m => { m.dead = true; m.removeMe = true; }); World.banditCamps[i].clearedAt = v; } });
    if (s.weather) Env.setWeather(s.weather);
    MissionSys.placeGivers();
    this.snapCamera();
  },

  autosave(label) {
    if (G.state !== 'play') return;
    const err = SaveSys.save('auto');
    if (!err && label) UI.notify('Autosaved.', 'info');
  },

  toTitle() {
    G.state = 'menu'; UI.hideDeath(); Interact.action = null;
    this.resetState(); Spawner.initWorld(); G.player = new Player(); MissionSys.placeGivers();
    UI.showMainMenu();
  },

  /* ---------------- settings ---------------- */
  loadSettings() { try { Object.assign(G.settings, JSON.parse(localStorage.getItem('outlawcounty.settings') || '{}')); } catch (e) { /* defaults */ } },
  saveSettings() { try { localStorage.setItem('outlawcounty.settings', JSON.stringify(G.settings)); } catch (e) { /* storage unavailable */ } },
  applySettings() {
    const s = G.settings;
    Sound.vol.master = s.master; Sound.vol.sfx = s.sfx; Sound.vol.music = s.music; Sound.applyVolumes();
    this.resize();
  },
  npcDamageMul() { return { easy: 0.22, normal: 0.35, hard: 0.55 }[G.settings.difficulty] || 0.35; },

  toggleFullscreen() {
    if (window.ocDesktop) { window.ocDesktop.toggleFullscreen(); return; }
    if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => UI.notify('Fullscreen is not available here.', 'info'));
    else document.exitFullscreen();
  },

  resize() {
    const target = { close: 290, normal: 360, far: 450 }[G.settings.zoom] || 360;
    this.zoom = Math.max(1, Math.round(innerHeight / target));
    this.vw = Math.ceil(innerWidth / this.zoom); this.vh = Math.ceil(innerHeight / this.zoom);
    this.canvas.width = this.vw; this.canvas.height = this.vh;
    this.canvas.style.width = this.vw * this.zoom + 'px'; this.canvas.style.height = this.vh * this.zoom + 'px';
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.overlay.width = innerWidth * this.dpr; this.overlay.height = innerHeight * this.dpr;
    this.ctx.imageSmoothingEnabled = false;
  },

  onScreen(x, y, m = 0) {
    const c = G.cam;
    return x > c.x - m && x < c.x + this.vw + m && y > c.y - m && y < c.y + this.vh + m;
  },

  snapCamera() { const P = G.player; G.cam.x = P.x - this.vw / 2; G.cam.y = P.y - this.vh / 2; },

  /* ---------------- player death / services ---------------- */
  onPlayerDeath() {
    const P = G.player;
    const lost = Math.floor(P.money * 0.1);
    P.money -= lost;
    this.deathLost = lost;
    MissionSys.onPlayerDeath();
    setTimeout(() => { if (P.dead) UI.showDeath(lost); }, 1200);
  },
  respawn() {
    const P = G.player;
    if (!P.dead) return;
    UI.hideDeath();
    const hide = MissionSys.flags.hideout;
    const pos = hide ? { x: World.poi.hideoutFire.x + 30, y: World.poi.hideoutFire.y + 20 } : World.poi.dwHotelDoor;
    P.x = pos.x; P.y = pos.y + 4; P.dead = false; P.hp = P.maxHp; P.stamina = 100; P.invuln = 3; P.vx = P.vy = 0; P.reload = null;
    if (P.ammo.revolver < 12) P.ammo.revolver = 12;
    Law.clearHeat('died');
    for (const a of G.actors) if (a.faction === 'rival') a.aggro = false;
    G.time += 120;
    this.snapCamera(); UI.fade(1.2);
    UI.notify(hide ? 'You came to at the Hollister camp, patched up by Mags.' : 'You woke up at the Grand Frontier Hotel, patched up by the town doctor.', 'info');
  },
  sleep() {
    const h = Env.hour(), add = ((24 - h + 7) % 24 || 24) * 60;
    G.time += add;
    const P = G.player; P.hp = P.maxHp; P.stamina = 100;
    if (P.horse && !P.horse.dead) { P.horse.hp = P.horse.maxHp; P.horse.stamina = P.horse.maxSt; }
    UI.fade(2.2);
    setTimeout(() => { const err = SaveSys.save('auto'); UI.notify(err ? 'You slept until morning.' : 'You slept until morning. Game saved.', 'good'); }, 300);
  },
  travel(dest) {
    const P = G.player, h = P.horse;
    if (P.mounted) P.dismount(false);
    const bring = h && !h.dead && dist(h.x, h.y, P.x, P.y) < 400;
    P.x = dest.x; P.y = dest.y + 6;
    if (bring) { const sp = World.findOpen(dest.x + 30, dest.y + 30); h.x = sp.x; h.y = sp.y; h.speed = 0; h.whistled = false; }
    G.time += 60;
    this.snapCamera(); UI.fade(1.8);
    UI.notify(`The train pulls into ${World.regionAt(P.x, P.y)}.${bring ? ` ${h.name} rode along in the stock car.` : ''}`, 'info');
    Sound.play('trainHorn');
  },

  /* ---------------- main loop ---------------- */
  loop(ts) {
    const dt = Math.min(0.05, (ts - (this.last || ts)) / 1000);
    this.last = ts; this.t += dt;
    this.fpsAcc += dt; this.fpsN++;
    if (this.fpsAcc > 0.5) { this.fps = this.fpsN / this.fpsAcc; this.fpsAcc = 0; this.fpsN = 0; }
    try {
      if (G.state === 'play') this.playFrame(dt);
      else this.menuFrame(dt);
    } catch (e) { console.error(e); }
    Input.endFrame();
    requestAnimationFrame(t => this.loop(t));
  },

  handleKeys() {
    if (Input.hit('Escape')) { if (UI.modal === 'dialogue') UI.endDialogue(false); else UI.togglePause(); }
    if (UI.modal === 'dialogue' && (Input.hit('KeyE') || Input.hit('Space') || Input.hit('Enter'))) UI.advanceDialogue();
    if (Input.hit('Tab')) UI.toggleInventory();
    if (Input.hit('KeyM')) UI.toggleMap();
    if (Input.hit('F11') && window.ocDesktop) this.toggleFullscreen();
  },

  playFrame(dt) {
    const P = G.player;
    const wasModal = UI.modal;
    this.handleKeys();
    if (!UI.modal && !wasModal) this.update(dt); // any open menu pauses the world
    UI.update(dt);
    this.render(dt);
    if (P.dead && P.deathT > 6) this.respawn();
  },

  update(dt) {
    const P = G.player;
    Env.update(dt);
    Law.update(dt);
    Interact.update(dt);
    // Steady Nerves slows the world down; the player slows a little less
    Combat.updateNerves(dt);
    const ws = Combat.worldScale(), wdt = dt * ws;
    P.update(ws < 1 ? dt * 0.75 : dt);
    for (const a of G.actors) {
      if (!a.dead && !a.mission && !a.engaged && !a.follow && !a.captive && dist(a.x, a.y, P.x, P.y) > 1500) { a.lod = (a.lod || 0) + wdt; if (a.lod < 0.25) continue; a.update(a.lod); a.lod = 0; }
      else a.update(wdt);
    }
    for (const h of G.horses) h.update(wdt);
    for (const an of G.animals) an.update(wdt);
    if (G.train) G.train.update(wdt);
    for (const c of G.coaches) c.update(wdt);
    Bullets.update(wdt);
    Combat.update(wdt);
    FX.update(wdt);
    for (const f of G.floaters) f.life -= dt;
    G.floaters = G.floaters.filter(f => f.life > 0);
    for (const l of G.tempLights) l.life -= wdt;
    G.tempLights = G.tempLights.filter(l => l.life > 0);
    MissionSys.update(dt);
    Bounties.update(dt);
    Events.update(dt);
    Discovery.update(dt);
    Spawner.update(dt);
    // camera
    const c = G.cam, mw = G.mouseWorld;
    const look = P.dead ? 0 : (Input.mouse.rdown ? 0.35 : 0.18);
    const tx = P.x - this.vw / 2 + clamp((mw.x - P.x) * look, -90, 90), ty = P.y - 8 - this.vh / 2 + clamp((mw.y - P.y) * look, -60, 60);
    const k = 1 - Math.exp(-dt * (P.mounted ? 7 : 5));
    c.x += (tx - c.x) * k; c.y += (ty - c.y) * k;
    c.x = clamp(c.x, 0, World.W * TS - this.vw); c.y = clamp(c.y, 0, World.H * TS - this.vh);
    c.shake = Math.max(0, c.shake - dt * 18); c.kick = Math.max(0, c.kick - dt * 10);
    // region
    const reg = World.regionAt(P.x, P.y);
    if (reg !== G.region) { G.region = reg; this.regionCD = (this.regionCD || 0); if (this.t > this.regionCD) { UI.regionToast(reg); this.regionCD = this.t + 4; } }
    Sound.listener.x = P.x; Sound.listener.y = P.y;
    Sound.updateMusic();
    this.autosaveT -= dt;
    if (this.autosaveT <= 0) { this.autosaveT = 180; if (Law.heat === 0 && !MissionSys.active && !P.dead) this.autosave(); }
  },

  menuFrame(dt) {
    if (UI.modal === 'settings' || UI.modal === 'controls' || UI.modal === 'slots') { if (Input.hit('Escape')) UI.action('back'); }
    const m = this.menuCam;
    m.a += dt * 0.04;
    m.x += dt * 22;
    if (m.x > 115 * TS) m.x = 25 * TS;
    G.cam.x = m.x - this.vw / 2; G.cam.y = 118 * TS - this.vh / 2 + Math.sin(m.a) * 30;
    G.cam.x = clamp(G.cam.x, 0, World.W * TS - this.vw); G.cam.y = clamp(G.cam.y, 0, World.H * TS - this.vh);
    for (const a of G.actors) if (!a.dead && a.faction === 'civ') a.update(dt);
    if (G.train) G.train.update(dt);
    FX.update(dt);
    for (const l of G.tempLights) l.life -= dt;
    G.tempLights = G.tempLights.filter(l => l.life > 0);
    this.render(dt, true);
  },

  /* ---------------- rendering ---------------- */
  render(dt, menu) {
    const ctx = this.ctx, vw = this.vw, vh = this.vh, c = G.cam, P = G.player;
    let sx = 0, sy = 0;
    if (c.shake > 0 && G.settings.shake) { sx = rand(-c.shake, c.shake) * 0.5; sy = rand(-c.shake, c.shake) * 0.5; }
    const camX = Math.round(c.x + sx), camY = Math.round(c.y + sy);
    const x0 = camX, y0 = camY, x1 = camX + vw, y1 = camY + vh;
    const t = this.t, night = Env.darkness() > 0.35;
    ctx.setTransform(1, 0, 0, 1, -camX, -camY);
    ctx.imageSmoothingEnabled = false;
    World.drawGround(ctx, camX, camY, vw, vh, t);
    // building interiors & roof fade
    const visB = [];
    for (const b of World.buildings) {
      const bx = b.x * TS, by = b.y * TS;
      const target = !menu && P.inBuilding === b ? 0 : 1;
      b.inside += (target - b.inside) * Math.min(1, dt * 8);
      if (Math.abs(target - b.inside) < 0.01) b.inside = target;
      if (bx > x1 + 20 || bx + b.w * TS < x0 - 20 || by > y1 + 20 || by + b.h * TS < y0 - 30) continue;
      if (b.inside < 0.99) Sprites.buildingBase(ctx, b, t);
      visB.push(b);
    }
    // corpses & carcasses on the ground layer
    for (const a of G.actors) if (a.dead && a.x > x0 - 20 && a.x < x1 + 20 && a.y > y0 - 10 && a.y < y1 + 20) a.draw(ctx);
    for (const an of G.animals) if (an.dead && !an.gone && an.x > x0 - 20 && an.x < x1 + 20 && an.y > y0 && an.y < y1 + 20) an.draw(ctx);
    for (const h of G.horses) if (h.dead && h.x > x0 - 30 && h.x < x1 + 30 && h.y > y0 && h.y < y1 + 20) h.draw(ctx);
    // y-sorted pass
    const L = this.drawList; L.length = 0;
    const props = World.tallPropsIn(x0, y0, x1, y1, []);
    for (const p of props) L.push({ y: p.y, k: 0, r: p });
    for (const b of visB) L.push({ y: (b.y + b.h) * TS, k: 1, r: b });
    for (const a of G.actors) if (!a.dead && !a.inside && a.x > x0 - 30 && a.x < x1 + 30 && a.y > y0 - 10 && a.y < y1 + 40) L.push({ y: a.y, k: 2, r: a });
    for (const h of G.horses) if (!h.dead && h.x > x0 - 30 && h.x < x1 + 30 && h.y > y0 - 10 && h.y < y1 + 40) L.push({ y: h.y, k: 2, r: h });
    for (const an of G.animals) if (!an.dead && an.x > x0 - 20 && an.x < x1 + 20 && an.y > y0 - 10 && an.y < y1 + 30) L.push({ y: an.y, k: 2, r: an });
    for (const cc of G.coaches) if (cc.x > x0 - 60 && cc.x < x1 + 60 && cc.y > y0 - 10 && cc.y < y1 + 50) L.push({ y: cc.y, k: 3, r: cc });
    for (const tg of G.targets) L.push({ y: tg.y + 1, k: 2, r: tg });
    if (!menu && !P.mounted) L.push({ y: P.y, k: 2, r: P });
    if (G.train && G.train.state !== 'wait' && G.train.y > y0 - 10 && G.train.y < y1 + 40) L.push({ y: G.train.y, k: 4, r: G.train });
    L.sort((a, b) => a.y - b.y);
    for (const e of L) {
      switch (e.k) {
        case 0: {
          const p = e.r;
          if (p.t === 'bush' && !menu && Math.abs(p.x - P.x) < 12 && P.y < p.y + 4 && P.y > p.y - 14) { ctx.globalAlpha = 0.55; Sprites.prop(ctx, p, t, night); ctx.globalAlpha = 1; }
          else Sprites.prop(ctx, p, t, night);
          break;
        }
        case 1: Sprites.buildingRoof(ctx, e.r, e.r.inside, night, t); break;
        case 2: e.r.draw(ctx); break;
        case 3: e.r.draw(ctx, night); break;
        case 4: e.r.draw(ctx, night, x0, x1); break;
      }
    }
    Combat.draw(ctx, t);
    Bullets.draw(ctx);
    FX.draw(ctx, x0, y0, x1, y1);
    // screen-space lighting and weather
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    Env.drawLighting(ctx, this.light, camX, camY, vw, vh, t);
    Env.drawWeather(ctx, vw, vh, t);
    if (!menu && Combat.nervesOn) {
      ctx.globalCompositeOperation = 'saturation'; ctx.fillStyle = 'rgba(128,128,128,0.65)'; ctx.fillRect(0, 0, vw, vh);
      ctx.globalCompositeOperation = 'source-over';
      const gr = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.25, vw / 2, vh / 2, vh * 0.8);
      gr.addColorStop(0, 'rgba(40,60,90,0)'); gr.addColorStop(1, 'rgba(20,30,60,0.45)');
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
    }
    if (!menu && P.hp < 35 && !P.dead) {
      const a = (1 - P.hp / 35) * (0.35 + Math.sin(t * 6) * 0.1);
      const gr = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.8);
      gr.addColorStop(0, 'rgba(120,0,0,0)'); gr.addColorStop(1, `rgba(120,0,0,${a})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, vw, vh);
    }
    if (!menu && P.dead) { ctx.fillStyle = `rgba(30,0,0,${Math.min(0.6, P.deathT * 0.25)})`; ctx.fillRect(0, 0, vw, vh); }
    // overlay canvas
    G.mouseWorld.x = c.x + Input.mouse.x / this.zoom; G.mouseWorld.y = c.y + Input.mouse.y / this.zoom;
    UI.drawOverlay(this.octx, this.zoom, camX, camY, t);
  }
};

window.addEventListener('load', () => Game.init());
