/* Outlaw County — sidejobs.js (v2.0)
 * Strangers in every town with replayable jobs: claim jumpers, deliveries,
 * escorts, lost horses, man-eaters and bad debts.
 */
'use strict';

const STRANGERS = [
  { town: 'Dustwater', name: 'Widow Abernathy', pal: { hatType: 'bonnet', hat: '#2a2a2a', shirt: '#3a3a3a', dress: '#1a1a1a', skin: '#e8bc96', hair: '#8a8a88' } },
  { town: 'Mesa Flats', name: 'Old Man Pruitt', pal: { hatType: 'flat', hat: '#7a6a5a', shirt: '#b8a080', vest: '#4a3a2a', pants: '#4a4036', skin: '#c08a60', hair: '#c8c8c0', beard: '#c8c8c0', boots: '#2a1a10' } },
  { town: 'Silver Crown', name: 'Cornish Jack', pal: { hatType: 'cap', hat: '#3a3a3a', lamp: true, shirt: '#8a2a2a', pants: '#3a3a44', skin: '#e0b08a', hair: '#4a2a14', mustache: '#4a2a14', dirt: true, boots: '#1a1410' } },
  { town: 'Port Harlow', name: 'Captain Ostrander', pal: { hatType: 'cap', hat: '#2a3456', shirt: '#e6e0d0', coat: '#2a3456', pants: '#2a2a2e', skin: '#d9a27a', hair: '#c8c8c0', beard: '#c8c8c0', boots: '#0e0e0e' } },
  { town: 'Fort Granger', name: 'Sutler Bram', pal: { hatType: 'bowler', hat: '#3a2a1a', shirt: '#d8c8a8', vest: '#5a3a2a', pants: '#4a4036', skin: '#d9a27a', hair: '#6a3a1a', mustache: '#6a3a1a', build: 'wide', boots: '#2a1a10' } },
  { town: 'Cottonwood Crossing', name: 'Hattie Lowell', pal: { hatType: 'none', shirt: '#c9b48a', dress: '#3a5a4a', apron: '#e8e0d0', skin: '#c99470', hair: '#8a5a2a' } },
  { town: 'San Lucero', name: 'Padre Anselmo', pal: { hatType: 'flat', hat: '#141414', shirt: '#4a3a2a', coat: '#3a2a1a', pants: '#3a2a1a', skin: '#b07a50', hair: '#8a8a88', boots: '#1a1410' } }
];

const JOB_TEMPLATES = [
  { kind: 'jumpers', title: 'Claim Jumpers', pitch: (s, p) => `Men are squatting on ${pick(['my late husband\'s claim', 'my brother\'s homestead', 'the church\'s pasture', 'a widow\'s water rights'])} out ${p}. Run them off. Permanently, if they insist.` },
  { kind: 'delivery', title: 'Special Delivery', pitch: (s, p, t) => `This parcel has to reach ${t} before sundown. Don't open it, don't lose it, and don't let anyone take it off you.` },
  { kind: 'horse', title: 'The Runaway', pitch: (s, p) => `My mare bolted in the storm and she's out ${p}. She won't come to anybody she doesn't trust. Calm her and bring her home.` },
  { kind: 'beast', title: 'Man-Eater', pitch: (s, p) => `Something's been taking stock out ${p}. Took a herd boy last week. Find it and kill it.` },
  { kind: 'debt', title: 'A Bad Debt', pitch: (s, p) => `A man named ${pick(FIRST)} ${pick(LAST)} owes me two hundred dollars and laughs about it. He's camped out ${p}. Persuade him. I don't need to know how.` },
  { kind: 'escort', title: 'Safe Passage', pitch: (s, p, t) => `My nephew needs to get to ${t} in one piece, and the roads aren't what they were. Ride with him.` }
];

const SideJobs = {
  n: 0, done: 0, cooldown: {},

  dirWord(from, to) {
    const a = Math.atan2(to.y - from.y, to.x - from.x), d = ['east', 'southeast', 'south', 'southwest', 'west', 'northwest', 'north', 'northeast'][((Math.round(a / (Math.PI / 4)) % 8) + 8) % 8];
    return `${Math.round(dist(from.x, from.y, to.x, to.y) / TS * 2 / 100) * 100 || 100} yards ${d} of town`;
  },
  townCenter(name) { const t = World.towns.find(t => t.name === name); return t ? { x: (t.x0 + t.x1) / 2 * TS, y: (t.y0 + t.y1) / 2 * TS } : null; },

  spawn() {
    for (const s of STRANGERS) {
      if (G.actors.some(a => a.stranger === s.name)) continue;
      const c = this.townCenter(s.town); if (!c) continue;
      const sp = World.randomOpenNear(c.x, c.y, 20, 80, (x, y) => World.tileAtPx(x, y) === T.FLOOR || !Story.reachable(x, y)) || Story.snap(c);
      const a = spawnActor('gang', sp.x, sp.y, { name: s.name, pal: Object.assign({}, s.pal), weapon: null, invuln: true, post: { x: sp.x, y: sp.y, face: Math.PI / 2 } });
      a.stranger = s.name; a.strangerTown = s.town; a.faction = 'civ';
    }
  },
  ready(a) { return !MissionSys.active && !(this.cooldown[a.stranger] > G.time); },
  jobFor(a) {
    const i = (this.done + STRANGERS.findIndex(s => s.name === a.stranger)) % JOB_TEMPLATES.length;
    return JOB_TEMPLATES[i];
  },

  interactions() {
    const P = G.player, out = [];
    for (const a of G.actors) {
      if (!a.stranger || a.dead || dist(P.x, P.y, a.x, a.y) > 30) continue;
      if (!this.ready(a)) { out.push({ label: `Talk to ${a.name}`, x: a.x, y: a.y, r: 30, act: () => a.bark(MissionSys.active ? "You look busy. Come back after." : "Nothing more today. Thank you kindly.", true) }); continue; }
      out.push({ label: `Talk to ${a.name}  ★ Stranger job`, x: a.x, y: a.y, r: 30, act: () => this.offer(a) });
    }
    return out;
  },

  offer(a) {
    if (Law.heat > 0) { UI.notify(`${a.name}: "Not with the law on your heels."`, 'info'); return; }
    const tpl = this.jobFor(a), home = this.townCenter(a.strangerTown) || { x: a.x, y: a.y };
    const spot = World.randomOpenNear(home.x, home.y, 350, 800, (x, y) => { const t = World.tileAtPx(x, y); return t === T.WATER || t === T.FLOOR || t === T.TOWN || !Story.reachable(x, y); }) || Story.snap({ x: home.x + 400, y: home.y });
    const others = World.towns.filter(t => t.name !== a.strangerTown && t.pop).map(t => ({ name: t.name, c: this.townCenter(t.name) })).sort((p, q) => dist(home.x, home.y, p.c.x, p.c.y) - dist(home.x, home.y, q.c.x, q.c.y));
    const dest = others[Math.min(others.length - 1, randi(0, 1))] || { name: 'Dustwater', c: World.poi.dwStation };
    const where = this.dirWord(home, spot);
    const m = this.build(tpl, a, spot, dest, where);
    UI.dialogue([{ who: a.name, text: tpl.pitch(a, where, dest.name) }, { who: a.name, text: `I can pay ${formatMoney(m.reward)}.` }], () => { MissionSys.list.push(m); MissionSys.start(m.id); }, { accept: `Take the job: ${tpl.title}` });
  },

  build(tpl, giver, spot, dest, where) {
    const id = 'sj_' + (++this.n) + '_' + Date.now() % 100000, home = { x: giver.x, y: giver.y }, back = St.go(`Return to ${giver.name} in ${giver.strangerTown}.`, () => ({ x: giver.x, y: giver.y }), 40, { label: giver.name });
    const m = { id, title: tpl.title, giverName: giver.name, side: true, reward: 0, noEncounters: false, stages: [] };
    const lvl = Math.min(4, 1 + Math.floor(this.done / 3));
    switch (tpl.kind) {
      case 'jumpers':
        m.reward = 60 + lvl * 25;
        m.stages = [St.go(`Ride out ${where} to the jumped claim.`, spot, 160, { label: 'Claim' }), St.clear('Run off the claim jumpers', spot, () => Story.ring(spot, 2 + lvl, 'rattler', 30, 120, { name: 'Claim Jumper' })), back];
        break;
      case 'delivery':
        m.reward = 40 + Math.round(dist(home.x, home.y, dest.c.x, dest.c.y) / TS / 6);
        m.stages = [St.go(`Deliver the parcel to ${dest.name}. Bandits may try to take it.`, dest.c, 120, { label: dest.name, stage: { enter: () => { if (chance(0.6)) setTimeout(() => { if (MissionSys.active && MissionSys.active.id === id) Story.ring(() => G.player, 2 + Math.floor(lvl / 2), 'rattler', 160, 240, { name: 'Road Agent', mounted: true }); }, 20000); } } })];
        break;
      case 'horse':
        m.reward = 50 + lvl * 15;
        m.stages = [St.go(`Find the runaway mare ${where}.`, spot, 90, { label: 'Mare', stage: { enter: d => { const h = new Horse('arabian', spot.x, spot.y, { owner: 'wild', name: 'Juniper' }); G.horses.push(h); d.mare = h; MissionSys.data.mare = h; } } }),
          St.act('Calm the frightened mare (E).', () => MissionSys.data.mare || spot, 'Calm the mare', 3),
          { text: `Ride the mare home to ${giver.name} (press F to mount her).`, enter: () => { const h = MissionSys.data.mare; if (h) { h.owner = 'player'; h.saddle = true; } },
            marker: () => { const h = MissionSys.data.mare; return G.player.mounted === h ? { x: giver.x, y: giver.y - 24, label: giver.name } : h ? { x: h.x, y: h.y - 26, label: 'Mare' } : null; },
            fail: () => { const h = MissionSys.data.mare; return h && h.dead ? 'The mare was killed.' : null; },
            done: () => G.player.mounted === MissionSys.data.mare && nearPlayer(giver.x, giver.y, 90) }];
        m.cleanup = () => { const h = MissionSys.data.mare; if (h && G.player.mounted !== h) { const i = G.horses.indexOf(h); if (i >= 0) G.horses.splice(i, 1); } else if (h) h.owner = 'wild'; };
        break;
      case 'beast': {
        m.reward = 70 + lvl * 20;
        const kind = /Silver|Harlow|Frost/.test(giver.strangerTown) ? 'bear' : 'cougar';
        m.stages = [St.go(`Track the man-eater ${where}.`, spot, 140, { label: 'Tracks' }),
          { text: `Kill the ${kind}.`, enter: d => { const an = new Animal(kind, spot.x, spot.y); an.hp *= 1.6; an.state = 'hunt'; G.animals.push(an); d.beast = an; },
            marker: d => d.beast && !d.beast.dead ? { x: d.beast.x, y: d.beast.y - 20, label: kind === 'bear' ? 'Grizzly' : 'Cougar' } : null, done: d => d.beast.dead }, back];
        break;
      }
      case 'debt':
        m.reward = 80 + lvl * 20;
        m.stages = [St.go(`Find the debtor's camp ${where}.`, spot, 120, { label: 'Debtor' }),
          St.clear(d => 'Persuade the debtor: knock him down or make him surrender (his friends may object)', spot, d => { const deb = Story.enemy('rattler', spot.x, spot.y, { name: 'The Debtor', weapon: 'sa', hp: 120, cash: 200 }); return [deb, ...Story.ring(spot, lvl - 1, 'rattler', 30, 80, { name: 'Hanger-on' })]; }), back];
        break;
      case 'escort':
        m.reward = 45 + Math.round(dist(home.x, home.y, dest.c.x, dest.c.y) / TS / 7);
        m.stages = [St.bring(`Ride with the nephew to ${dest.name}.`, d => { const n = spawnActor('gang', giver.x + 14, giver.y + 6, { name: 'The Nephew', pal: Looks.civ(giver.x, giver.y, giver.strangerTown), weapon: 'derringer', hp: 120, invuln: false, mission: id }); n.ownHorse = new Horse('mustang', n.x, n.y, { owner: 'law' }); MissionSys.data.spawned.push(n); return n; }, dest.c, { r: 140, label: dest.name,
          enter: () => setTimeout(() => { if (MissionSys.active && MissionSys.active.id === id) Story.ring(() => G.player, 2 + Math.floor(lvl / 2), 'rattler', 160, 240, { name: 'Road Agent', mounted: true }); }, 25000) })];
        break;
    }
    m.onComplete = () => {
      this.done++; this.cooldown[giver.stranger] = G.time + 60;
      MissionSys.list = MissionSys.list.filter(x => x !== m); MissionSys.completed = MissionSys.completed.filter(x => x !== id);
      G.stats.missions = Math.max(0, G.stats.missions - 1); G.stats.sideJobs = (G.stats.sideJobs || 0) + 1;
      Progress.add(40);
    };
    const baseCleanup = m.cleanup;
    m.cleanup = success => { if (baseCleanup) baseCleanup(success); if (!success) MissionSys.list = MissionSys.list.filter(x => x !== m); };
    return m;
  },

  markers() {
    if (MissionSys.active) return [];
    return G.actors.filter(a => a.stranger && !a.dead && this.ready(a)).map(a => ({ x: a.x, y: a.y - 24, label: a.name, kind: 'stranger', small: false }));
  }
};

/* strangers show on the map and compass while you're free */
(function () {
  const base = MissionSys.markers.bind(MissionSys);
  MissionSys.markers = function () { return base().concat(SideJobs.markers()); };
  const baseFail = MissionSys.fail.bind(MissionSys);
  MissionSys.fail = function (reason) { const m = this.active; baseFail(reason); if (m && m.side) UI.notify('Stranger jobs can be picked up again from the same stranger.', 'info'); };
  const baseNext = MissionSys.nextAvailable.bind(MissionSys);
  MissionSys.nextAvailable = function () { return this.list.find(m => !m.side && this.available(m)); };
})();

Hooks.add({
  key: 'sidejobs',
  reset: () => { SideJobs.spawned = false; SideJobs.cooldown = {}; SideJobs.done = 0; },
  update: () => { if (!SideJobs.spawned && G.actors && G.actors.length) { SideJobs.spawned = true; SideJobs.spawn(); } },
  interactions: () => SideJobs.interactions(),
  save: () => ({ done: SideJobs.done, cooldown: SideJobs.cooldown }),
  load: ext => { if (ext) { SideJobs.done = ext.done || 0; SideJobs.cooldown = ext.cooldown || {}; } }
});
