/* Outlaw County — bountyhunters.js (v2.5)
 * Carry a bounty out in the open country and professional bounty hunters
 * come looking for you: a named leader and his riders, more of them the
 * higher your price. Pay the bounty off and they give up the chase.
 */
'use strict';

const HUNTER_LEADERS = ['Hank "Iron" Delacroix', 'Mother Ruth Calloway', 'Abel Stroud', 'The Tolliver Brothers', 'Josiah "Bloodhound" Pike', 'Ned Varga', 'Clement Hask', 'Big Lou Marchetti', 'Cyrus Wynn'];
const HUNTER_PAL = { hat: '#3a3226', band: '#8a6a3a', shirt: '#6a6a5a', coat: '#5a4a36', pants: '#3a3430', skin: '#d6a07a', boots: '#1a1410', hatType: 'flat' };

const Hunters = {
  t: 150, group: null,

  update(dt) {
    const P = G.player; if (!P || P.dead) return;
    const g = this.group;
    if (g) {
      const alive = g.members.filter(a => !a.dead && !a.removeMe);
      // paid off: they ride away
      if (Law.bounty <= 0 && !g.quit) { g.quit = true; for (const a of alive) { a.aggro = false; a.forceHostile = false; a.preferLaw = true; a.bark('Bounty\'s paid. No money in you now.', true); a.post = { x: a.x + rand(-900, 900), y: a.y + rand(-900, 900) }; } }
      if (g.quit) { for (const a of alive) if (!Game.onScreen(a.x, a.y, 60)) a.removeMe = true; if (!alive.length) this.group = null; return; }
      if (!alive.length) {
        this.group = null; this.t = this.interval();
        Ach.t && (Ach.t.huntersBeat = (Ach.t.huntersBeat || 0) + 1);
        UI.notify(`You fought off ${g.leader}'s posse. There'll be others while that bounty stands.`, 'good');
        Progress.add(40);
        return;
      }
      // lost you: they give up after a long chase
      if (alive.every(a => dist(a.x, a.y, P.x, P.y) > 1600)) { for (const a of alive) a.removeMe = true; this.group = null; this.t = this.interval(); UI.notify('The bounty hunters lost your trail. For now.', 'info'); }
      return;
    }
    if (Law.bounty < 40 || MissionSys.active || Law.heat > 0) { this.t = Math.max(this.t, 60); return; }
    this.t -= dt;
    if (this.t > 0) return;
    if (World.townAt(P.x, P.y) || P.inBuilding) { this.t = 20; return; }   // they wait for you outside town
    this.spawn();
  },
  interval() { return clamp(540 - Law.bounty * 0.35, 150, 540) * rand(0.8, 1.2); },

  spawn() {
    const P = G.player, b = Law.bounty;
    const n = clamp(2 + Math.floor(b / 150), 2, 6), leader = pick(HUNTER_LEADERS);
    const sp = World.randomOpenNear(P.x, P.y, 420, 620, (x, y) => !Story.reachable(x, y) || !!World.townAt(x, y));
    if (!sp) { this.t = 30; return; }
    const members = [];
    for (let i = 0; i < n; i++) {
      const s2 = World.randomOpenNear(sp.x, sp.y, 0, 50, (x, y) => !Story.reachable(x, y)) || sp;
      const lead = i === 0;
      const a = spawnActor('rival', s2.x, s2.y, {
        name: lead ? leader : 'Bounty Hunter', temp: true, forceHostile: true, aggro: true, noRole: false,
        pal: Object.assign({}, HUNTER_PAL, Looks.face(), lead ? { coat: '#2a2420', hat: '#1a1a1a', band: '#c8a040' } : { coat: pick(['#5a4a36', '#4a4a3e', '#6a5038']) }),
        weapon: lead ? pick(['bolt', 'cavalry', 'pump']) : pick(['lever', 'repeater', 'shotgun', 'carbine', 'schofield']),
        hp: lead ? 180 : 100, skill: lead ? 0.82 : 0.7, cash: lead ? randi(40, 90) : randi(10, 30)
      });
      a.covenant = true;          // they don't pick fights with town lawmen
      a.hunter = true;
      a.mounted = new Horse(pick(['morgan', 'quarter', 'walker', 'foxtrotter']), a.x, a.y, { owner: 'law' });
      members.push(a);
    }
    members[0].bark(`There's $${b} on your head, and I aim to collect it!`, true);
    this.group = { leader, members, quit: false };
    Sound.play('wanted');
    UI.notify(`Bounty hunters! ${leader} and ${n - 1} riders are coming for the $${b} on your head. Fight, run, or pay off your bounty at a sheriff or station.`, 'crime');
  },
  markers() {
    const g = this.group; if (!g || g.quit) return [];
    return g.members.filter(a => !a.dead).map(a => ({ x: a.x, y: a.y - 26, label: a === g.members[0] ? g.leader : '', small: a !== g.members[0] }));
  }
};

(function () {
  const base = MissionSys.markers.bind(MissionSys);
  MissionSys.markers = function () { return base().concat(Hunters.markers()); };
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'hunted', name: 'Hunted Man', desc: 'Fight off 3 posses of bounty hunters.', icon: '☠', prog: () => [Ach.t.huntersBeat || 0, 3] }
  );
})();

Hooks.add({
  key: 'hunters',
  reset: () => { Hunters.t = 150; Hunters.group = null; },
  update: dt => Hunters.update(dt)
});
