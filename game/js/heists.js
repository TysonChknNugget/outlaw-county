/* Outlaw County — heists.js (v2.6)
 * Big repeatable jobs planned at camp: hit any bank in the territory (quietly
 * at night, or loud with dynamite) or stop the Frostpeak Express on the
 * tracks. Your crew rides along and takes a cut.
 */
'use strict';

const HEIST_VALUE = { dw_bank: [600, 800], sc_bank: [900, 1200], ph_bank: [1000, 1400] };

const Heists = {
  props: [], n: 0,

  banks() { return World.buildings.filter(b => b.type === 'bank' && SHOPS[b.id]); },
  ready(id) { const cd = (G.world.heistCD || {})[id]; return !cd || G.time >= cd; },
  wait(id) { const cd = (G.world.heistCD || {})[id] || 0; return Math.max(0, Math.ceil((cd - G.time) / 60)); },
  planner() { for (const id of ['mara', 'ezra', 'deacon', 'toby']) if (Story.present(id)) { const a = G.actors.find(x => x.giver === id && !x.dead); if (a) return a; } return null; },
  crew() { return ['wes', 'roz', 'toby', 'deacon', 'ezra', 'mara'].filter(id => Story.present(id) && !(Crew.busy(id))).slice(0, 3); },

  interactions() {
    if (MissionSys.active || !MissionSys.completed.includes('p0')) return [];
    const a = this.planner(), P = G.player;
    if (!a || dist(P.x, P.y, a.x, a.y) > 34) return [];
    return [{ label: `Plan a heist with ${a.name}`, x: a.x, y: a.y + 4, r: 34, priority: 4, act: () => this.plan(a) }];
  },
  plan(a) {
    if (Law.heat > 0) { UI.notify(`${a.name}: "Lose the law first."`, 'info'); return; }
    const choices = this.banks().map(b => ({ label: this.ready(b.id) ? `${SHOPS[b.id].name} (${b.town})` : `${SHOPS[b.id].name}: lying low ${this.wait(b.id)}h`, value: b.id }))
      .concat([{ label: this.ready('train') ? 'Stop the Frostpeak Express' : `The Express: lying low ${this.wait('train')}h`, value: 'train' }, { label: 'Not today', value: null }]);
    UI.dialogue([{ who: a.name, text: "Which score are we after? The banks keep gold in the back vault, and the Express carries the company payroll. Every job makes them jumpy for a few days." }], null,
      { choices, onChoose: v => { if (!v) return; if (!this.ready(v)) { UI.notify('Too soon. They\'re still watching that one.', 'info'); return; } if (v === 'train') this.start(this.trainJob(a)); else setTimeout(() => this.approach(a, v), 250); } });
  },
  approach(a, id) {
    UI.dialogue([{ who: a.name, text: "Quiet or loud? Quiet: we go in at night, slip past the watchmen and crack the vault. Loud: walk in at noon, stick up the teller and blow the vault door. Loud pays the same but every lawman in the county comes running." }], null,
      { choices: [{ label: 'Quiet: crack it at night', value: 'quiet' }, { label: 'Loud: dynamite', value: 'loud' }, { label: 'Never mind', value: null }], onChoose: v => { if (v) this.start(this.bankJob(a, id, v)); } });
  },
  start(m) { MissionSys.list.push(m); MissionSys.start(m.id); },

  /* payouts and cleanup shared by every heist */
  finishJob(m, id, lo, hi, bars) {
    m.onComplete = () => {
      const take = randi(lo, hi), cut = Math.round(take * 0.3 * (m.crewN || 0) / 3), mine = take - cut;
      Economy.addMoney(Math.round(mine * (Crew.intel(id) ? 1.25 : 1))); Economy.addItem('gold_bar', bars);
      if (Crew.intel(id)) Crew.useIntel(id);
      G.world.heistCD = G.world.heistCD || {}; G.world.heistCD[id] = G.time + 3 * 1440;
      G.stats.heists = (G.stats.heists || 0) + 1; Progress.add(150);
      MissionSys.list = MissionSys.list.filter(x => x !== m); MissionSys.completed = MissionSys.completed.filter(x => x !== m.id);
      G.stats.missions = Math.max(0, G.stats.missions - 1);
      UI.notify(`The take: $${take} and ${bars} gold bars.${cut ? ` The crew's cut is $${cut}.` : ''}${Crew.intel(id) ? ' Scouting paid off: +25%.' : ''}`, 'good');
    };
    const base = m.cleanup;
    m.cleanup = success => { if (base) base(success); if (id !== 'train') World.closeVault(id); this.props = []; if (!success) MissionSys.list = MissionSys.list.filter(x => x !== m); };
  },

  bankJob(planner, id, style) {
    const b = World.buildings.find(x => x.id === id), [lo, hi] = HEIST_VALUE[id] || [800, 1100];
    const door = { x: b.door.x * TS + 8, y: (b.door.y + 1) * TS + 8 }, vault = { x: b.vaultDoor.x * TS + 8, y: (b.vaultDoor.y + 1) * TS + 8 };
    const crew = this.crew(), id2 = 'hz_' + (++this.n) + '_' + (Date.now() % 100000);
    const m = { id: id2, title: `${style === 'quiet' ? 'Quiet' : 'Loud'} Job: ${SHOPS[id].name}`, giverName: planner.name, side: true, reward: 0, noEncounters: true, crewN: crew.length, holdsGivers: crew };
    const ride = St.go(`Ride to ${b.town} with ${crew.length ? crew.map(c => CAST[c].name.split(' ')[0].replace(/"/g, '')).join(', ') : 'nobody but yourself'}.`, door, 160, { label: SHOPS[id].name, stage: { enter: () => Story.squad(crew) } });
    const grab = St.act('The vault is open. Load the gold (E).', vault, 'Load the gold', 3, { enter: () => World.openVault(id), done: () => { b.goldTaken = true; } });
    const escape = { text: d => Law.heat > 0 ? 'Get out of town and lose the law!' : 'Get clear!', enter: () => { Law.heat = Math.max(Law.heat, style === 'loud' ? 5 : 3); Law.searchT = Law.searchTime(); Law.bounty += style === 'loud' ? 300 : 150; }, done: () => Law.heat === 0 };
    const home = campStage('Ride back to camp and split the take.');
    if (style === 'quiet') {
      m.stages = [ride,
        St.wait('Wait for the town to go to sleep...', 4, { count: true, enter: () => { Story.night(); UI.notify('Midnight. Lamps out. Two watchmen inside.', 'info'); } }),
        St.sneak('Slip into the bank and reach the vault door without the watchmen seeing you.', vault, () => [Story.enemy('guard', door.x + 10, door.y - 30, { name: 'Night Watchman', forceHostile: false, aggro: false }), Story.enemy('guard', vault.x - 20, vault.y, { name: 'Night Watchman', forceHostile: false, aggro: false })].map(a => { a.post = { x: a.x, y: a.y, face: rand(TAU) }; a.sentry = true; a.preferLaw = true; return a; }), { loud: true, r: 26, label: 'Vault door' }),
        Object.assign(St.act('Crack the vault combination. Listen for the tumblers.', vault, 'Crack the safe', 8, { sound: 'click' }), { enter: () => UI.notify('Stay put while you work the dial. Moving away breaks your count.', 'tip') }),
        grab, escape, home];
    } else {
      m.stages = [ride,
        { text: 'Go in, draw your gun and hold up the teller (E).', marker: () => { const c = Story.clerkOf(id); return c ? { x: c.x, y: c.y - 20, label: 'Teller' } : null; }, enter: () => { delete G.world.robbed[id]; }, done: d => d.events['storeRobbed:' + id] },
        St.survive('Hold the bank while the dynamite on the vault door burns down', door, 30, () => Story.ring(door, 2, 'guard', 120, 220, { name: 'Deputy', weapon: pick(['repeater', 'shotgun', 'schofield']) }), { stay: 220, every: 8, enter: () => { Law.heat = 4; UI.notify('Fuse lit! Thirty seconds!', 'warn'); } }),
        St.do('BOOM.', () => { FX.explosion(vault.x, vault.y - 16); Sound.play('explosion', vault.x, vault.y); }),
        grab, escape, home];
    }
    this.finishJob(m, id, lo, hi, randi(2, 4));
    return m;
  },

  trainJob(planner) {
    const crew = this.crew(), id2 = 'hz_' + (++this.n) + '_' + (Date.now() % 100000);
    const spot = Story.at(pick(['overhang', 'siding', 'eagleGorge']));
    const m = { id: id2, title: 'Stop the Frostpeak Express', giverName: planner.name, side: true, reward: 0, noEncounters: true, crewN: crew.length, holdsGivers: crew };
    m.stages = [
      St.go('Ride out to a lonely stretch of track.', spot, 140, { label: 'The tracks', stage: { enter: () => Story.squad(crew) } }),
      St.act('Pile ties on the rails and set a charge.', spot, 'Block the track', 3, { sound: 'fuse' }),
      St.wait('Here she comes...', 6, { count: true, enter: () => UI.notify('Steam on the horizon. Wait for it.', 'warn') }),
      St.clear('The Express grinds to a stop. Take out the railroad guards!', spot, () => Story.ring(spot, randi(5, 7), 'guard', 30, 120, { name: 'Railroad Guard', weapon: pick(['repeater', 'shotgun', 'bolt', 'carbine']) }), { enter: () => { this.props = [this.trainProp(spot)]; FX.explosion(spot.x + 40, spot.y); } }),
      St.act('Blow the express car safe.', () => ({ x: spot.x - 60, y: spot.y + 20 }), 'Blow the safe', 4, { sound: 'fuse', done: () => FX.explosion(spot.x - 60, spot.y) }),
      { text: d => Law.heat > 0 ? 'Ride! The railroad wired every sheriff on the line.' : 'Get clear!', enter: () => { Law.commit('train_robbery', spot.x, spot.y, { reported: true }); Law.heat = Math.max(Law.heat, 3); }, done: () => Law.heat === 0 },
      campStage('Ride back to camp and split the payroll.')
    ];
    this.finishJob(m, 'train', 900, 1300, randi(1, 3));
    return m;
  },
  trainProp(spot) { const p = { spec: { kind: 'train' }, x: spot.x + 60, y: spot.y + 10, anim: 0, face: 0 }; p.draw = ctx => Scenery.draw(ctx, p); return p; }
};

/* every bank's vault opens, not just Dustwater's */
(function () {
  World.openVault = function (id = 'dw_bank') {
    const b = this.buildings.find(x => x.id === id);
    if (!b || !b.vaultDoor || b.vaultOpen) return;
    b.vaultOpen = true; b.vaultDoor.sol = 0;
    this.solid[this.idx(b.vaultDoor.x, b.vaultDoor.y)] &= ~SOL.ALL;
    this.invalidateChunkAt(b.vaultDoor.x, b.vaultDoor.y);
  };
  World.closeVault = function (id) {
    for (const b of this.buildings) {
      if (id && b.id !== id) continue;
      if (!b.vaultDoor || !b.vaultOpen) continue;
      b.vaultOpen = false; b.vaultDoor.sol = SOL.ALL;
      this.solid[this.idx(b.vaultDoor.x, b.vaultDoor.y)] |= SOL.ALL;
      this.invalidateChunkAt(b.vaultDoor.x, b.vaultDoor.y);
    }
  };
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'heist1', name: 'The Big Score', desc: 'Pull off a heist.', icon: '$', prog: () => [G.stats.heists || 0, 1] },
    { id: 'heist5', name: 'Professional', desc: 'Pull off 5 heists.', icon: '$', prog: () => [G.stats.heists || 0, 5] }
  );
})();

Hooks.add({ key: 'heists', reset: () => { Heists.props = []; }, interactions: () => Heists.interactions(), sortables: () => Heists.props, update: dt => { for (const p of Heists.props) p.anim += dt; } });
