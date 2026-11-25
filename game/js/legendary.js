/* Outlaw County — legendary.js (v2.6)
 * Six famous outlaws, each holed up somewhere in the territory with a gang
 * and a dirty trick of their own. Take the poster from any sheriff's office.
 * Bring them down dead for the full price, or knock them out with your fists
 * (or make them give up) to bring them in alive for half again more.
 */
'use strict';

const LEGENDS = [
  { id: 'harker', name: '"Mad Dog" Abel Harker', price: 450, where: [300, 200], gang: 4, role: 'brute', weapon: 'double', hp: 520,
    pal: { hatType: 'cowboy', hat: '#2a1a10', band: '#8a1a1a', shirt: '#6a2a1a', vest: '#1a1410', pants: '#2a2622', skin: '#c99470', beard: '#3a2a1a', hair: '#3a2a1a', build: 'wide', boots: '#140e0a' },
    lore: 'Killed four men in a Mesa Flats card game over a two-dollar pot. Charges like a bull with a double-barrel. Keep your distance.' },
  { id: 'widow', name: '"The Widow" Lavinia Cole', price: 600, where: [760, 70], gang: 4, role: 'sharpshooter', weapon: 'scoped', hp: 300,
    pal: { hatType: 'bonnet', hat: '#141414', shirt: '#2a2a2a', dress: '#1a1a1a', skin: '#e8bc96', hair: '#14100c' },
    lore: 'Three husbands, three funerals, three inheritances. Shoots from the high snow with a scoped rifle. Close the gap fast.' },
  { id: 'twohats', name: 'Johnny Two-Hats', price: 550, where: [1060, 160], gang: 5, role: 'gunslinger', weapon: 'autopistol', hp: 340,
    pal: { hatType: 'top', hat: '#3a1a2a', band: '#c8a040', shirt: '#e6e0d0', vest: '#6a2a5a', coat: '#2a2a2e', pants: '#2a2a2e', skin: '#e0b08a', mustache: '#4a2a14', hair: '#4a2a14', boots: '#0e0e0e' },
    lore: 'Robs riverboat gamblers on Harlow Lake and never misses twice. Fires faster than any man alive.' },
  { id: 'preacher', name: '"Brimstone" Gideon Shaw', price: 650, where: [930, 420], gang: 5, role: 'dynamiter', weapon: 'sa', hp: 360,
    pal: { hatType: 'flat', hat: '#141414', shirt: '#e6e0d0', coat: '#141414', pants: '#141414', skin: '#d9a27a', beard: '#8a8a88', hair: '#8a8a88', boots: '#0e0e0e' },
    lore: 'Calls himself a preacher. Blew up a church in Cottonwood with the congregation inside. Watch for lit sticks of dynamite.' },
  { id: 'coyote', name: 'El Coyote', price: 700, where: [880, 735], gang: 6, role: 'gunslinger', weapon: 'cavalry', hp: 380,
    pal: { hatType: 'sombrero', hat: '#3a2a1a', band: '#c8a040', shirt: '#e8e0c8', poncho: '#7a2a1a', pants: '#3a3028', skin: '#a8724a', mustache: '#14100c', hair: '#14100c', boots: '#1a1410' },
    lore: 'Raids both sides of the Rio Bravo and vanishes into the badlands. His men know every gully. Never fight him in the open.' },
  { id: 'frostbite', name: '"Frostbite" Ole Lindqvist', price: 800, where: [1180, 40], gang: 5, role: 'sharpshooter', weapon: 'bolt', hp: 450,
    pal: { hatType: 'cap', hat: '#6a6a6a', shirt: '#8a2a2a', coat: '#4a3a2a', pants: '#3a3a44', skin: '#efc6a0', beard: '#d8c89a', hair: '#d8c89a', build: 'wide', boots: '#1a1410' },
    lore: 'Froze a posse of nine to death by burning their horses. Lives past the end of the Frostpeak line where nobody follows.' }
];

const Legends = {
  done() { return G.world.legendsDone || (G.world.legendsDone = []); },
  open() { return LEGENDS.filter(l => !this.done().includes(l.id)); },

  shopEntries(shopId) {
    const s = SHOPS[shopId]; if (!s || s.type !== 'sheriff') return [];
    if (MissionSys.active) return [];
    return this.open().map(l => ({ name: `LEGEND: ${l.name}`, desc: `${l.lore} $${l.price} dead · $${Math.round(l.price * 1.5)} alive.`, price: 0, noCharge: true, note: 'Wanted', can: true, label: 'Take the poster',
      buy: () => { UI.closeAll(); this.start(l); } }));
  },
  start(l) {
    const p = Story.snap(Story.open(l.where[0], l.where[1], 160));
    const id = 'lg_' + l.id + '_' + (Date.now() % 100000);
    const m = { id, title: `Legendary Bounty: ${l.name}`, giverName: 'the sheriff', side: true, reward: 0, noEncounters: true };
    m.stages = [
      St.go(`Track ${l.name} to the hideout.`, p, 200, { label: l.name }),
      { text: d => d.boss && (d.boss.knockedOut || d.boss.surrendered) ? `${l.name} is down. Finish off the gang!` : `Take down ${l.name} and the gang (${(d.foes || []).filter(a => !a.dead && !a.surrendered && !a.knockedOut).length} left).`,
        enter: d => {
          d.boss = Story.enemy('rattler', p.x, p.y, { name: l.name, pal: Object.assign({}, l.pal), weapon: l.weapon, hp: l.hp, role: l.role, skill: 0.88, cash: randi(60, 140) });
          d.boss.legend = true; d.boss.bark(pick(['You picked the wrong hideout.', 'Another fool with a poster.', 'Come on then!']), true);
          d.foes = [d.boss, ...Story.ring(p, l.gang, 'rattler', 50, 160, { name: `${l.name.split(' ').pop()}'s Gang` })];
          UI.notify(l.lore, 'warn');
        },
        marker: d => (d.foes || []).filter(a => !a.dead && !a.surrendered && !a.knockedOut).map(a => ({ x: a.x, y: a.y - 26, label: a === d.boss ? l.name : '', small: a !== d.boss })),
        done: d => d.st > 0.5 && d.foes.every(a => a.dead || a.surrendered || a.knockedOut) },
      { text: d => `Collect the bounty at any sheriff's office${MissionSys.data.alive ? ' (bring the prisoner)' : ''}.`,
        enter: d => {
          const prev = MissionSys.data, boss = prev.boss;
          d.alive = boss && !boss.dead;
          if (d.alive) { boss.captive = true; boss.escortBy = null; boss.weapon = null; boss.follow = false; boss.surrendered = true; boss.invuln = true; d.boss = boss; UI.notify(`${l.name} is tied up. Lead them to any sheriff.`, 'good'); }
          else UI.notify(`${l.name} is dead. Collect at any sheriff.`, 'good');
          MissionSys.data.alive = d.alive;
        },
        marker: () => { const s = Bounties.nearestSheriff ? Bounties.nearestSheriff() : World.poi.dwSheriffDoor; return s ? { x: s.x, y: s.y - 24, label: 'Sheriff' } : null; },
        done: () => { const s = Bounties.nearestSheriff ? Bounties.nearestSheriff() : World.poi.dwSheriffDoor; return s && nearPlayer(s.x, s.y, 60); } }
    ];
    m.onComplete = () => {
      const alive = MissionSys.data && MissionSys.data.alive, pay = alive ? Math.round(l.price * 1.5) : l.price;
      Economy.addMoney(pay); this.done().push(l.id); Progress.add(200);
      if (MissionSys.data && MissionSys.data.boss) MissionSys.data.boss.removeMe = true;
      MissionSys.list = MissionSys.list.filter(x => x !== m); MissionSys.completed = MissionSys.completed.filter(x => x !== id);
      G.stats.missions = Math.max(0, G.stats.missions - 1);
      UI.banner(l.name, alive ? `BROUGHT IN ALIVE  +$${pay}` : `BOUNTY COLLECTED  +$${pay}`);
    };
    m.cleanup = success => { if (!success) MissionSys.list = MissionSys.list.filter(x => x !== m); };
    MissionSys.list.push(m); MissionSys.start(id);
  }
};

(function () {
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'legend1', name: 'Legend Hunter', desc: 'Bring down a legendary outlaw.', icon: '✪', prog: () => [(G.world.legendsDone || []).length, 1] },
    { id: 'legend6', name: 'Clean Sweep', desc: 'Bring down all six legendary outlaws.', icon: '✪', prog: () => [(G.world.legendsDone || []).length, 6] }
  );
})();

Hooks.add({ key: 'legends', shopEntries: id => Legends.shopEntries(id) });
