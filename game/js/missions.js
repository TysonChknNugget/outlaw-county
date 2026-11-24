/* Outlaw County — missions.js
 * Data-driven mission framework plus the five story missions.
 * To add a mission: MissionSys.register({ id, title, giver, requires, intro, stages:[...], reward })
 * Each stage: { text, marker(d), enter(d), done(d,dt), fail(d), interact(d) }.
 */
'use strict';

const MissionSys = {
  list: [], active: null, stage: -1, data: {}, completed: [], flags: {},

  register(m) { this.list.push(m); },
  byId(id) { return this.list.find(m => m.id === id); },
  giver(id) { return G.actors.find(a => a.giver === id && !a.dead); },
  available(m) { return !this.completed.includes(m.id) && (m.requires || []).every(r => this.completed.includes(r)); },
  nextAvailable() { return this.list.find(m => this.available(m)); },
  cur() { return this.active ? this.active.stages[this.stage] : null; },

  reset() { this.active = null; this.stage = -1; this.data = {}; this.completed = []; this.flags = {}; },

  giverPrompt(a) {
    if (this.active) {
      const s = this.cur();
      return s && s.talk === a.giver ? `Talk to ${a.name}` : null;
    }
    const m = this.list.find(m => m.giver === a.giver && this.available(m));
    return m ? `Talk to ${a.name}  ★ ${m.title}` : null;
  },

  talk(a) {
    if (this.active) {
      const s = this.cur();
      if (s && s.talk === a.giver) {
        if (s.lines) UI.dialogue(s.lines, () => this.event('talk', a.giver)); else this.event('talk', a.giver);
      }
      return;
    }
    const m = this.list.find(m => m.giver === a.giver && this.available(m));
    if (!m) return;
    if (Law.heat > 0) { UI.notify(`${a.name}: "Shake the law first. I ain't talkin' business with a posse on your tail."`, 'info'); return; }
    UI.dialogue(m.intro, () => this.start(m.id), { accept: `Start: ${m.title}` });
  },

  start(id) {
    const m = this.byId(id);
    this.active = m; this.stage = -1; this.data = { events: {}, t: 0, spawned: [] };
    UI.banner(m.title, 'MISSION STARTED');
    Sound.play('mission');
    if (m.onStart) m.onStart(this.data);
    this.next();
  },

  next() {
    this.stage++;
    const m = this.active;
    if (this.stage >= m.stages.length) { this.complete(); return; }
    const s = this.cur();
    this.data.events = {}; this.data.st = 0;
    if (s.enter) s.enter(this.data);
    UI.notify('Objective: ' + s.text, 'mission');
  },

  update(dt) {
    if (!this.active) { this.placeGivers(); return; }
    const s = this.cur(); if (!s) return;
    this.data.t += dt; this.data.st += dt;
    const reason = (s.fail && s.fail(this.data)) || (this.active.fail && this.active.fail(this.data));
    if (reason) { this.fail(reason); return; }
    if (s.done && s.done(this.data, dt)) this.next();
    this.placeGivers();
  },

  event(name, arg) {
    if (!this.active) return;
    const ev = this.data.events;
    ev[name] = ev[name] ? ev[name] + 1 : 1;
    ev[name + ':arg'] = arg;
    if (typeof arg === 'string') ev[name + ':' + arg] = true;
  },

  spawn(kind, x, y, o = {}) {
    const a = spawnActor(kind, x, y, Object.assign({ mission: this.active.id }, o));
    this.data.spawned.push(a);
    return a;
  },

  fail(reason) {
    if (!this.active) return;
    const m = this.active;
    Sound.play('fail');
    UI.banner(reason, 'MISSION FAILED', true);
    this.cleanup(m, false);
    this.active = null;
    UI.notify(`Mission failed. Find ${m.giverName} to try "${m.title}" again.`, 'bad');
  },

  complete() {
    const m = this.active;
    this.completed.push(m.id);
    this.active = null;
    this.cleanup(m, true);
    if (m.reward) Economy.addMoney(m.reward);
    if (m.onComplete) m.onComplete();
    Sound.play('mission');
    UI.banner(m.title, `MISSION COMPLETE  +$${m.reward || 0}`);
    G.stats.missions++;
    setTimeout(() => Game.autosave('Mission complete'), 600);
  },

  cleanup(m, success) {
    for (const a of this.data.spawned || []) { a.mission = null; a.temp = true; a.forceHostile = a.faction === 'law' && !a.dead && Law.heat > 0; if (a.follow && !a.giver) { a.follow = false; } }
    for (const c of G.coaches) if (c.mission === m.id) c.mission = null;
    G.targets = [];
    for (const a of G.actors) if (a.giver) { a.follow = false; a.mounted = null; a.forceHostile = false; }
    if (m.cleanup) m.cleanup(success);
  },

  onActorDeath(a) { if (this.active && a.mission === this.active.id) this.event('death', a); },
  onPlayerDeath() { if (this.active) this.fail('You died.'); },

  markers() {
    const out = [];
    if (this.active) {
      const s = this.cur();
      if (s && s.marker) { const mk = s.marker(this.data); if (mk) (Array.isArray(mk) ? mk : [mk]).forEach(x => x && out.push(Object.assign({ kind: 'objective' }, x))); }
    } else {
      const m = this.nextAvailable();
      if (m) { const g = this.giver(m.giver); if (g) out.push({ x: g.x, y: g.y - 24, label: m.giverName, kind: 'giver' }); }
    }
    return out;
  },

  objectiveText() {
    if (this.active) { const s = this.cur(); return { title: this.active.title, text: s ? (typeof s.text === 'function' ? s.text(this.data) : s.text) : '' }; }
    const m = this.nextAvailable();
    if (m) return { title: 'Next Job', text: m.hint };
    return { title: 'Free Roam', text: 'The county is yours. Rob, hunt, and stay ahead of the law.' };
  },

  interactions() {
    if (!this.active) return [];
    const s = this.cur();
    return s && s.interact ? s.interact(this.data) || [] : [];
  },

  /* keep story characters where the story needs them */
  placeGivers() {
    const F = World.poi.hideoutFire;
    const want = {
      boone: { name: 'Boone Hollister', pal: { hat: '#161616', band: '#8a6a3a', shirt: '#8a3a2a', vest: '#2a2018', pants: '#2a2622', skin: '#c99470', boots: '#140e0a', hatType: 'cowboy', coat: '#3a2a20' }, weapon: 'sa' },
      lettie: { name: 'Lettie Crane', pal: { hat: '#6a3a2a', band: '#d8b050', shirt: '#d8c8a8', vest: '#5a2a3a', pants: '#3a3030', skin: '#e0b08a', boots: '#2a1a10', hatType: 'cowboy', bandana: '#5a2a3a' }, weapon: 'repeater' },
      eli: { name: 'Eli Reyes', pal: { hat: '#c8b080', band: '#7a2a1a', shirt: '#6a7a5a', poncho: '#7a5a3a', pants: '#3a3428', skin: '#b07a50', boots: '#2a1a10', hatType: 'cowboy' }, weapon: 'lever' }
    };
    const inSaloon = !this.completed.includes('intro') && !(this.active && this.active.id === 'intro' && this.stage >= 3);
    const posts = {
      boone: inSaloon ? { x: 61 * TS + 8, y: 114 * TS + 8, face: 0 } : { x: F.x - 4 * TS, y: F.y - TS, face: 0 },
      lettie: { x: F.x + 5 * TS, y: F.y + 3 * TS, face: Math.PI },
      eli: { x: F.x - 1 * TS, y: F.y - 4 * TS, face: Math.PI / 2 }
    };
    for (const id of ['boone', 'lettie', 'eli']) {
      if (id === 'eli' && !this.flags.eli) continue;
      let a = G.actors.find(x => x.giver === id);
      if (!a) {
        const p = posts[id], w = want[id];
        a = spawnActor('gang', p.x, p.y, { name: w.name, pal: w.pal, weapon: w.weapon, giver: id, invuln: true, post: p, hp: 200 });
      }
      if (a.follow || (this.active && this.active.holdsGivers && this.active.holdsGivers.includes(id))) continue;
      a.post = posts[id];
      if (dist(a.x, a.y, a.post.x, a.post.y) > 400 && !Game.onScreen(a.x, a.y, 30) && !Game.onScreen(a.post.x, a.post.y, 30)) { a.x = a.post.x; a.y = a.post.y; a.path = null; }
    }
  }
};

const nearPlayer = (x, y, r) => !G.player.dead && dist(G.player.x, G.player.y, x, y) < r;
const hideoutMarker = () => ({ x: World.poi.hideoutFire.x, y: World.poi.hideoutFire.y, label: 'Hollister Camp' });

/* ------------------------------------------------------------ 1. Outlaw Introduction */
MissionSys.register({
  id: 'intro', title: 'Outlaw Introduction', giver: 'boone', giverName: 'Boone Hollister', reward: 40,
  hint: 'Meet Boone Hollister inside the Rusty Spur Saloon in Dustwater.',
  intro: [
    { who: 'Boone Hollister', text: "So you're the one who wired me from Abilene. Sit. Keep your hat low — Sheriff Brannigan's got eyes on every stranger off that train." },
    { who: 'Boone Hollister', text: "I run the Hollister outfit. We take from the railroad, the bank and anybody who leans on folks out here. You want in? Prove you can follow a plan." },
    { who: 'Boone Hollister', text: "First things first: that iron on your hip is near empty. Here's fifteen dollars. Go buy cartridges at the general store." }
  ],
  onStart() { Economy.addMoney(15); },
  stages: [
    {
      text: 'Buy a box of revolver cartridges at the General Store (E at the counter).',
      marker: () => { const c = G.actors.find(a => a.shopId === 'dw_general'); return c ? { x: c.x, y: c.y - 20, label: 'General Store' } : null; },
      done: d => d.events['bought:ammo:revolver'] || d.events['bought']
    },
    {
      text: 'Mount the horse Boone left at the saloon hitching post (press F).',
      enter: d => {
        const P = G.player;
        if (!P.horse || P.horse.dead) {
          const h = new Horse('mustang', 61 * TS + 8, 123 * TS + 4, { owner: 'player', name: 'Biscuit', face: 0 });
          h.saddle = true; G.horses.push(h); P.horse = h; d.horse = h;
        } else d.horse = P.horse;
        UI.notify('Tip: WASD steers your horse, Shift gallops. Watch its stamina.', 'tip');
      },
      marker: d => d.horse && !d.horse.dead ? { x: d.horse.x, y: d.horse.y - 26, label: d.horse.name } : null,
      done: () => !!G.player.mounted
    },
    {
      text: 'Ride to the Hollister camp in the northeast canyon.',
      enter: () => UI.notify('Tip: press M for the county map. Follow the road east, then north at the crossroads.', 'tip'),
      marker: hideoutMarker,
      done: () => nearPlayer(World.poi.hideoutFire.x, World.poi.hideoutFire.y, 170)
    },
    {
      text: d => `Shoot the bottles lined up on the fence (${G.targets.filter(t => t.hit).length}/4).`,
      enter: d => {
        const b = World.poi.bottleFence;
        G.targets = [0, 1, 2, 3].map(i => new Target(b.x - 40 + i * 22, b.y));
        UI.notify('Tip: hold right mouse to steady your aim. R reloads, 1–5 switch weapons.', 'tip');
      },
      marker: () => ({ x: World.poi.bottleFence.x - 10, y: World.poi.bottleFence.y - 24, label: 'Bottles' }),
      done: () => G.targets.length && G.targets.every(t => t.hit)
    },
    {
      text: 'Talk to Boone by the campfire.', talk: 'boone',
      lines: [
        { who: 'Boone Hollister', text: "Not bad. Not bad at all. Welcome to the Hollister camp, partner." },
        { who: 'Boone Hollister', text: "This canyon's yours now. Rest here when you're shot up, and Old Silas will buy anything you 'liberate' — no questions." },
        { who: 'Boone Hollister', text: "Come see me when you want real work." }
      ],
      marker: () => { const b = MissionSys.giver('boone'); return b ? { x: b.x, y: b.y - 24, label: 'Boone' } : null; },
      done: d => d.events['talk:boone']
    }
  ],
  onComplete() { MissionSys.flags.hideout = true; UI.notify('The Hollister camp is now your hideout: a respawn point, a fence for stolen goods, and a safe place to save.', 'good'); }
});

/* ------------------------------------------------------------ 2. General Store Robbery */
MissionSys.register({
  id: 'store', title: 'General Store Robbery', giver: 'boone', giverName: 'Boone Hollister', requires: ['intro'], reward: 100,
  hint: 'Boone Hollister has a job for you at the Hollister camp.',
  intro: [
    { who: 'Boone Hollister', text: "Ortega down at the Mesa Flats Trading Post has been selling us out to the marshals. Time he paid his dues." },
    { who: 'Boone Hollister', text: "Ride in, draw on him, empty the till. Don't kill him — dead men don't open tills. Then lose the law and ride home." }
  ],
  stages: [
    { text: 'Ride to the Mesa Flats Trading Post.', marker: () => ({ x: World.poi.mfStore.x, y: World.poi.mfStore.y - 30, label: 'Trading Post' }), done: () => nearPlayer(World.poi.mfStore.x, World.poi.mfStore.y, 110),
      enter: () => { delete G.world.robbed.mf_general; } },
    {
      text: 'Go inside, draw your gun (hold right mouse) and press E to hold up the clerk.',
      marker: () => { const c = G.actors.find(a => a.shopId === 'mf_general'); return c ? { x: c.x, y: c.y - 20, label: 'Clerk' } : null; },
      fail: () => { const c = G.actors.find(a => a.shopId === 'mf_general'); return (!c || c.dead) ? 'You killed the clerk before he opened the till.' : null; },
      done: d => d.events['storeRobbed:mf_general']
    },
    { text: d => Law.heat > 0 ? 'Escape the law! Break line of sight and stay hidden until the search is called off.' : 'Escape the law!', done: () => Law.heat === 0 },
    { text: 'Return to the Hollister camp.', marker: hideoutMarker, done: () => nearPlayer(World.poi.hideoutFire.x, World.poi.hideoutFire.y, 140) && Law.heat === 0 }
  ]
});

/* ------------------------------------------------------------ 3. Stagecoach Ambush */
MissionSys.register({
  id: 'coach', title: 'Stagecoach Ambush', giver: 'lettie', giverName: 'Lettie Crane', requires: ['store'], reward: 150, noEncounters: true,
  hint: 'Lettie Crane is planning a stagecoach job. Find her at the Hollister camp.',
  intro: [
    { who: 'Lettie Crane', text: "The Frontier Express runs a payroll box from Mesa Flats to Dustwater today. One shotgun guard on the box, outriders behind." },
    { who: 'Lettie Crane', text: "Wait at Buzzard Bend. When the coach comes through, stop it however you like — hold it up or drop the team. Then crack that box." }
  ],
  stages: [
    { text: 'Ride to Buzzard Bend and wait in ambush.', marker: () => ({ x: World.poi.ambush.x, y: World.poi.ambush.y - 20, label: 'Buzzard Bend' }), done: () => nearPlayer(World.poi.ambush.x, World.poi.ambush.y, 90) },
    {
      text: 'The stagecoach is coming! Stop it — hold it up (gun drawn, E) or shoot the horses.',
      enter: d => {
        const c = new Stagecoach(-1, { mission: 'coach' });
        // start the coach a short ride east of the ambush point
        c.i = 5; c.x = World.poi.stageRoute[5].x; c.y = World.poi.stageRoute[5].y;
        G.coaches.push(c); d.coach = c;
        UI.notify('Dust on the road... the coach is coming from the east.', 'warn');
      },
      marker: d => d.coach ? { x: d.coach.x, y: d.coach.y - 34, label: 'Stagecoach' } : null,
      fail: d => d.coach && (d.coach.arrived || d.coach.x < 60 * TS) && d.coach.state === 'travel' ? 'The stagecoach got away.' : null,
      done: d => d.coach.state !== 'travel'
    },
    {
      text: 'Outriders! Deal with the guards.',
      enter: d => {
        const c = d.coach;
        for (let i = 0; i < 2; i++) {
          const sp = World.randomOpenNear(c.x + 160, c.y, 0, 50) || { x: c.x + 160, y: c.y + 20 };
          const a = MissionSys.spawn('guard', sp.x, sp.y, { name: 'Outrider', weapon: pick(['repeater', 'lever']), forceHostile: true, temp: true, cash: randi(15, 30) });
          a.mounted = new Horse('morgan', a.x, a.y, { owner: 'law' });
        }
        for (const a of G.actors) if (a.name === 'Shotgun Guard' && !a.dead) { a.mission = 'coach'; MissionSys.data.spawned.push(a); }
      },
      marker: d => d.spawned.filter(a => !a.dead && a.faction === 'law').map(a => ({ x: a.x, y: a.y - 26, label: '', small: true })),
      done: d => d.st > 1 && d.spawned.filter(a => a.faction === 'law').every(a => a.dead)
    },
    { text: 'Loot the strongbox (E at the coach).', marker: d => ({ x: d.coach.x, y: d.coach.y - 34, label: 'Strongbox' }), done: d => d.coach.looted },
    { text: 'Return to the Hollister camp.', marker: hideoutMarker, done: () => nearPlayer(World.poi.hideoutFire.x, World.poi.hideoutFire.y, 140) }
  ]
});

/* ------------------------------------------------------------ 4. Prisoner Rescue */
MissionSys.register({
  id: 'rescue', title: 'Prisoner Rescue', giver: 'boone', giverName: 'Boone Hollister', requires: ['coach'], reward: 250, noEncounters: true,
  hint: 'Boone has bad news. Talk to him at the Hollister camp.',
  intro: [
    { who: 'Boone Hollister', text: "The marshals took Eli Reyes outside Mesa Flats. They're holding him in a cage wagon at Red Rock, waiting on the judge's train." },
    { who: 'Boone Hollister', text: "Eli rode with me eight years. We don't leave our own. Five marshals, maybe more. Get him out and bring him home alive." }
  ],
  holdsGivers: [],
  stages: [
    {
      text: "Ride to the Marshal's camp at Red Rock.",
      enter: d => {
        const M = World.poi.marshalCamp, C = World.poi.cageWagon;
        const posts = [[-5, 3], [4, 4], [6, -2], [-6, -5], [1, -6]];
        d.marshals = posts.map(([dx, dy]) => MissionSys.spawn('marshal', M.x + dx * TS, M.y + dy * TS, { weapon: pick(['repeater', 'sa', 'shotgun', 'lever']), post: { x: M.x + dx * TS, y: M.y + dy * TS }, cash: randi(15, 35) }));
        d.eli = MissionSys.spawn('prisoner', C.x, C.y + 18, { name: 'Eli Reyes', weapon: null, hp: 160, invuln: true, pal: { hat: '#c8b080', band: '#7a2a1a', shirt: '#6a7a5a', poncho: '#7a5a3a', pants: '#3a3428', skin: '#b07a50', boots: '#2a1a10', hatType: 'cowboy' }, post: { x: C.x, y: C.y + 18, face: Math.PI / 2 } });
        d.eli.state = 'handsup';
      },
      marker: () => ({ x: World.poi.marshalCamp.x, y: World.poi.marshalCamp.y - 30, label: "Marshal's Camp" }),
      fail: d => d.eli.dead ? 'Eli Reyes was killed.' : null,
      done: d => nearPlayer(World.poi.marshalCamp.x, World.poi.marshalCamp.y, 250) || d.marshals.some(m => m.hurtT > 0 || m.dead)
    },
    {
      text: d => `Kill the marshals guarding Eli (${d.marshals.filter(m => !m.dead).length} left).`,
      enter: d => { for (const m of d.marshals) { m.forceHostile = true; m.post = null; } d.marshals[0].bark("It's the Hollister gang! Guard the prisoner!", true); },
      marker: d => d.marshals.filter(m => !m.dead).map(m => ({ x: m.x, y: m.y - 26, label: '', small: true })),
      fail: d => d.eli.dead ? 'Eli Reyes was killed.' : null,
      done: d => d.marshals.every(m => m.dead)
    },
    {
      text: 'Free Eli from his shackles (E).',
      marker: d => ({ x: d.eli.x, y: d.eli.y - 24, label: 'Eli' }),
      interact: d => [{ label: 'Free Eli Reyes', x: d.eli.x, y: d.eli.y, r: 26, act: () => Interact.begin('Breaking the shackles', 2, () => MissionSys.event('freed')) }],
      fail: d => d.eli.dead ? 'Eli Reyes was killed.' : null,
      done: d => d.events.freed
    },
    {
      text: 'Escort Eli back to the Hollister camp. Keep him alive!',
      enter: d => {
        const e = d.eli;
        e.state = 'idle'; e.weapon = 'lever'; e.mag = 10; e.follow = true; e.post = null; e.hp = e.maxHp; e.invuln = false;
        e.ownHorse = new Horse('morgan', e.x, e.y, { owner: 'law' });
        e.bark("About time! Let's ride!", true);
        Law.commit('jailbreak', e.x, e.y, { reported: true });
      },
      marker: d => [hideoutMarker(), { x: d.eli.x, y: d.eli.y - 26, label: '', small: true }],
      fail: d => d.eli.dead ? 'Eli Reyes was killed.' : null,
      done: d => nearPlayer(World.poi.hideoutFire.x, World.poi.hideoutFire.y, 170) && dist(d.eli.x, d.eli.y, World.poi.hideoutFire.x, World.poi.hideoutFire.y) < 260
    }
  ],
  cleanup(success) {
    const e = MissionSys.data.eli;
    if (!e) return;
    if (success && !e.dead) {
      // the rescued Eli becomes the camp's Eli
      Object.assign(e, { giver: 'eli', invuln: true, temp: false, follow: false, mounted: null, ownHorse: null, mission: null, kind: 'gang' });
    } else {
      const i = G.actors.indexOf(e); if (i >= 0) G.actors.splice(i, 1);
    }
  },
  onComplete() { MissionSys.flags.eli = true; UI.notify('Eli Reyes has joined the Hollister camp.', 'good'); }
});

/* ------------------------------------------------------------ 5. County Bank Robbery */
MissionSys.register({
  id: 'bank', title: 'County Bank Robbery', giver: 'boone', giverName: 'Boone Hollister', requires: ['rescue'], reward: 400, noEncounters: true,
  holdsGivers: ['boone', 'lettie', 'eli'],
  hint: 'Boone is ready for the big one. Talk to him at the Hollister camp.',
  intro: [
    { who: 'Boone Hollister', text: "Dustwater County Bank. The railroad keeps its gold there till the end of the month. That's today." },
    { who: 'Boone Hollister', text: "Lettie blows the vault. Eli and I hold the door. You keep the teller quiet and carry the gold." },
    { who: 'Boone Hollister', text: "Every lawman in the county will come down on us. Don't stop riding till you're clear. Meet us east of town by the river." }
  ],
  stages: [
    {
      text: 'Meet the gang east of Dustwater, near the river bridge.',
      enter: d => {
        const m = World.poi.bankMeet;
        delete G.world.robbed.dw_bank;
        for (const id of ['boone', 'lettie', 'eli']) {
          const a = MissionSys.giver(id); if (!a) continue;
          const sp = World.randomOpenNear(m.x, m.y, 10, 40) || m;
          if (!Game.onScreen(a.x, a.y, 30)) { a.x = sp.x; a.y = sp.y; }
          a.post = { x: sp.x, y: sp.y }; a.path = null;
        }
      },
      marker: () => ({ x: World.poi.bankMeet.x, y: World.poi.bankMeet.y - 24, label: 'Gang' }),
      done: () => nearPlayer(World.poi.bankMeet.x, World.poi.bankMeet.y, 90)
    },
    {
      text: 'Enter the bank, draw your gun and hold up the teller (E).',
      enter: d => {
        UI.dialogue([{ who: 'Boone Hollister', text: "Masks up. Nobody fires first unless they have to. Go." }]);
        for (const id of ['boone', 'lettie', 'eli']) { const a = MissionSys.giver(id); if (a) { a.follow = true; a.post = null; a.ownHorse = new Horse('quarter', a.x, a.y, { owner: 'law' }); } }
      },
      marker: () => { const c = G.actors.find(a => a.shopId === 'dw_bank'); return c ? { x: c.x, y: c.y - 20, label: 'Teller' } : null; },
      done: d => d.events['storeRobbed:dw_bank']
    },
    {
      text: d => `Hold off the law while Lettie sets the dynamite (${Math.max(0, Math.ceil(30 - d.st))}s).`,
      enter: d => {
        const b = World.buildings.find(x => x.id === 'dw_bank');
        const lt = MissionSys.giver('lettie');
        if (lt) { lt.follow = false; lt.post = { x: (b.vaultDoor.x - 1) * TS + 8, y: (b.vaultDoor.y) * TS + 8, face: 0 }; }
        const bo = MissionSys.giver('boone'); if (bo) { bo.follow = false; bo.post = { x: (b.door.x) * TS + 8, y: (b.door.y - 1) * TS + 8, face: Math.PI / 2 }; }
        d.fuse = 0;
        UI.notify('Lettie: "Keep them off me! Thirty seconds!"', 'warn');
      },
      done: (d, dt) => {
        d.fuse -= dt; if (d.fuse <= 0) { d.fuse = 0.6; if (d.st > 25) Sound.play('fuse'); }
        if (d.st >= 30) {
          const b = World.buildings.find(x => x.id === 'dw_bank');
          FX.explosion((b.vaultDoor.x + 0.5) * TS, (b.vaultDoor.y + 0.5) * TS);
          World.openVault();
          const P = G.player;
          if (dist(P.x, P.y, (b.vaultDoor.x + 0.5) * TS, (b.vaultDoor.y + 0.5) * TS) < 30) P.hurt(25, null);
          return true;
        }
        return false;
      }
    },
    {
      text: 'The vault is open! Grab the gold (E).',
      marker: () => { const b = World.buildings.find(x => x.id === 'dw_bank'); return { x: b.vault.x, y: b.vault.y - 10, label: 'Gold' }; },
      interact: () => { const b = World.buildings.find(x => x.id === 'dw_bank'); return [{ label: 'Grab the gold', x: b.vault.x, y: b.vault.y, r: 30, act: () => Interact.begin('Loading gold bars', 3, () => { b.goldTaken = true; Economy.addItem('gold_bar', 3); Economy.addMoney(randi(550, 700)); MissionSys.event('gold'); }, { sound: 'click' }) }]; },
      done: d => d.events.gold
    },
    {
      text: 'Escape! Ride out of Dustwater and lose the law.',
      enter: () => {
        for (const id of ['boone', 'lettie', 'eli']) { const a = MissionSys.giver(id); if (a) { a.follow = true; a.post = null; if (!a.ownHorse) a.ownHorse = new Horse('quarter', a.x, a.y, { owner: 'law' }); } }
        Law.heat = 5; Law.searchT = Law.searchTime();
        UI.notify('Boone: "Every gun in the county is coming! RIDE!"', 'crime');
      },
      done: () => Law.heat === 0
    },
    { text: 'Return to the Hollister camp and split the take.', marker: hideoutMarker, done: () => nearPlayer(World.poi.hideoutFire.x, World.poi.hideoutFire.y, 160) }
  ],
  cleanup(success) {
    World.closeVault();
    const b = World.buildings.find(x => x.id === 'dw_bank'); if (b && !success) b.goldTaken = false;
    for (const id of ['boone', 'lettie', 'eli']) { const a = MissionSys.giver(id); if (a) { a.follow = false; a.mounted = null; a.ownHorse = null; } }
  },
  onComplete() {
    MissionSys.flags.legend = true;
    const b = World.buildings.find(x => x.id === 'dw_bank'); if (b) b.goldTaken = false;
    setTimeout(() => UI.dialogue([
      { who: 'Boone Hollister', text: "Ha! The biggest score this county's ever seen. They'll be singing about this one in every saloon from here to El Paso." },
      { who: 'Lettie Crane', text: "Your cut's in the saddlebags. Spend it slow." },
      { who: 'Boone Hollister', text: "You're the most wanted outlaw in Outlaw County now, partner. The county's yours — just keep riding." }
    ]), 2500);
  }
});
