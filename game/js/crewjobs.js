/* Outlaw County — crewjobs.js (v2.6)
 * Send your crew out from camp on their own jobs. They're gone for a few
 * in-game hours and their take goes into the camp strongbox, which you
 * collect by the campfire. Scouting a bank makes your next heist there pay
 * 25% more. Jobs can go wrong.
 */
'use strict';

const CREW_JOBS = {
  coach: { name: 'Hit a stagecoach', hours: 2, pay: [60, 120], odds: 0.85, line: 'One coach, one shotgun guard. Easy money.' },
  cattle: { name: 'Rustle cattle', hours: 3, pay: [90, 170], odds: 0.8, line: 'There\'s a herd grazing unwatched by the river. Won\'t be for long.' },
  guns: { name: 'Run guns south', hours: 5, pay: [180, 320], odds: 0.7, line: 'Crates of rifles across the Rio Bravo. Good money, bad roads.' },
  scout: { name: 'Scout a bank', hours: 2, pay: [0, 0], odds: 1, line: 'I\'ll count the guards and learn the shifts. Your next job there pays better.' }
};
const CREW_IDS = ['mara', 'wes', 'roz', 'ezra', 'deacon', 'toby'];

const Crew = {
  st() { return G.world.crew || (G.world.crew = { jobs: {}, pot: 0, intel: {} }); },
  busy(id) { const j = this.st().jobs[id]; return !!j && G.time < j.back; },
  intel(bank) { return !!this.st().intel[bank]; },
  useIntel(bank) { delete this.st().intel[bank]; },
  nextGiver() { const m = MissionSys.nextAvailable(); return m ? m.giver : null; },

  update() {
    const s = this.st();
    for (const [id, j] of Object.entries(s.jobs)) {
      if (G.time < j.back || j.reported) continue;
      j.reported = true;
      const name = CAST[id].name;
      if (j.job === 'hurt') { UI.notify(`${name} is back on their feet.`, 'info'); delete s.jobs[id]; continue; }
      const def = CREW_JOBS[j.job];
      if (j.ok) {
        if (j.job === 'scout') { s.intel[j.bank] = true; UI.notify(`${name} is back from scouting ${SHOPS[j.bank].name}. Your next heist there pays 25% more.`, 'good'); }
        else { s.pot += j.pay; UI.notify(`${name} is back: "${def.name}" went smooth. $${j.pay} went into the camp strongbox.`, 'good'); }
        delete s.jobs[id];
      } else {
        UI.notify(`${name}'s job went bad. They made it back to camp shot up and need to rest half a day.`, 'bad');
        s.jobs[id] = { job: 'hurt', back: G.time + 12 * 60 };
      }
    }
  },
  send(id, job) {
    const def = CREW_JOBS[job], s = this.st(), j = { job, back: G.time + def.hours * 60, ok: chance(def.odds), pay: randi(def.pay[0], def.pay[1]) };
    if (job === 'scout') { const banks = Heists.banks().filter(b => !s.intel[b.id]); if (!banks.length) { UI.notify('Every bank is already scouted.', 'info'); return; } j.bank = pick(banks).id; }
    s.jobs[id] = j;
    const a = G.actors.find(x => x.giver === id); if (a) { a.bark(pick(['Back before you miss me.', 'Keep the coffee warm.', 'See you on the other side.']), true); setTimeout(() => { if (a && !a.follow) a.removeMe = true; }, 1500); }
    UI.notify(`${CAST[id].name} rode out: ${def.name}${j.bank ? ` (${SHOPS[j.bank].name})` : ''}. Back in about ${def.hours} hours.`, 'info');
  },

  interactions() {
    const P = G.player, out = [];
    if (MissionSys.active || !MissionSys.completed.includes('p0')) return out;
    const s = this.st(), camp = Story.campPos();
    if (s.pot > 0 && dist(P.x, P.y, camp.x, camp.y) < 60) out.push({ label: `Collect the camp strongbox ($${s.pot})`, x: camp.x, y: camp.y, r: 60, priority: 6, act: () => { Economy.addMoney(s.pot); UI.notify(`You took $${s.pot} from the strongbox.`, 'good'); s.pot = 0; } });
    for (const id of CREW_IDS) {
      if (!Story.present(id) || this.busy(id)) continue;
      const a = G.actors.find(x => x.giver === id && !x.dead && !x.follow); if (!a || dist(P.x, P.y, a.x, a.y) > 30) continue;
      if (id === this.nextGiver()) continue;   // they're waiting to give you the next story job
      out.push({ label: `Send ${a.name} on a job`, x: a.x, y: a.y + 6, r: 30, priority: 2, act: () => this.menu(id, a) });
    }
    return out;
  },
  menu(id, a) {
    const choices = Object.entries(CREW_JOBS).map(([k, d]) => ({ label: `${d.name} (${d.hours}h${d.pay[1] ? `, $${d.pay[0]}-${d.pay[1]}` : ''}${d.odds < 1 ? `, ${Math.round(d.odds * 100)}% safe` : ''})`, value: k })).concat([{ label: 'Stay in camp', value: null }]);
    UI.dialogue([{ who: a.name, text: "Need something done? I've got a few ideas. Whatever I make goes in the strongbox by the fire." }], null, { choices, onChoose: v => { if (v) this.send(id, v); } });
  }
};

/* busy crew aren't in camp */
(function () {
  const base = MissionSys.placeGivers.bind(MissionSys);
  MissionSys.placeGivers = function () {
    base();
    if (!G.world || !G.world.crew) return;
    for (const id of CREW_IDS) if (Crew.busy(id) && !(this.active && this.active.uses && this.active.uses.includes(id))) {
      const a = G.actors.find(x => x.giver === id && !x.follow);
      if (a && !Game.onScreen(a.x, a.y, 30)) a.removeMe = true;
    }
  };
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'boss', name: 'Running the Show', desc: 'Collect $1,000 from the camp strongbox over time.', icon: '♜', prog: () => [Ach.t.crewTake || 0, 1000] }
  );
  const add = Economy.addMoney.bind(Economy);
  let collecting = false;
  Economy.addMoney = function (n, x, y) { if (collecting && Ach.t) Ach.t.crewTake = (Ach.t.crewTake || 0) + n; return add(n, x, y); };
  Crew.collectWrap = f => { collecting = true; try { f(); } finally { collecting = false; } };
})();

Hooks.add({ key: 'crew', update: () => Crew.update(), interactions: () => Crew.interactions().map(i => i.label.startsWith('Collect') ? Object.assign(i, { act: (f => () => Crew.collectWrap(f))(i.act) }) : i) });
