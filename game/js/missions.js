/* Outlaw County — missions.js
 * Data-driven mission framework. The campaign lives in story.js and chapter1-3.js.
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
    UI.notify('Objective: ' + (typeof s.text === 'function' ? s.text(this.data) : s.text), 'mission');
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

  /* bring Hollister gang members along on a job */
  crew(names) {
    const P = G.player, out = [];
    for (const n of names) {
      const a = G.actors.find(x => x.name === n && !x.dead && x.faction === 'gang');
      if (!a) continue;
      if (!a.homePost && a.post) a.homePost = a.post;
      a.post = null; a.follow = true; a.crew = true; a.path = null;
      if (!Game.onScreen(a.x, a.y, 30)) { const sp = World.randomOpenNear(P.x, P.y, 30, 70, (x, y) => World.tileAtPx(x, y) === T.FLOOR); if (sp) { a.x = sp.x; a.y = sp.y; } }
      out.push(a);
    }
    this.data.crew = out;
    if (out.length) UI.notify(`${out.map(a => a.name).join(' and ')} ${out.length > 1 ? 'ride' : 'rides'} with you on this job.`, 'info');
    return out;
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
    Progress.add(100);
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
    for (const a of this.data.crew || []) { a.follow = false; a.crew = false; a.mounted = null; a.ownHorse = null; if (a.homePost) a.post = a.homePost; }
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
    // gang members home from a job walk back into camp off-screen
    for (const a of G.actors) {
      if (a.faction !== 'gang' || a.follow || !a.homePost || a.giver) continue;
      if (dist(a.x, a.y, a.homePost.x, a.homePost.y) > 400 && !Game.onScreen(a.x, a.y, 30) && !Game.onScreen(a.homePost.x, a.homePost.y, 30)) { a.x = a.homePost.x; a.y = a.homePost.y; a.path = null; a.post = a.homePost; }
    }
  }
};

const nearPlayer = (x, y, r) => !G.player.dead && dist(G.player.x, G.player.y, x, y) < r;
const hideoutMarker = () => ({ x: World.poi.hideoutFire.x, y: World.poi.hideoutFire.y, label: Story.campName() });

/* The story missions are registered in chapter1.js, chapter2.js and chapter3.js. */
