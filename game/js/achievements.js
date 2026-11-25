/* Outlaw County — achievements.js (v2.2)
 * Achievements (kept across every save on this computer) and the Records
 * page: this save's stats plus the full achievement list with progress.
 */
'use strict';

const MILE_PX = 1760 / 2 * TS;   // 1 tile = 2 yards
const done = id => MissionSys.completed.includes(id);
const ACHIEVEMENTS = [
  { id: 'firstblood', name: 'First Blood', desc: 'Win your first gunfight.', icon: '✦', prog: () => [G.stats.kills, 1] },
  { id: 'gunhand', name: 'Hired Gun', desc: 'Put down 100 enemies.', icon: '✦', prog: () => [G.stats.kills, 100] },
  { id: 'sharp', name: 'Dead Eye', desc: 'Hit 60% of your shots after firing at least 200.', icon: '◎', prog: () => [G.stats.shots >= 200 ? Math.round(G.stats.hits / G.stats.shots * 100) : 0, 60] },
  { id: 'stickup', name: 'Stick \'Em Up', desc: 'Pull off 5 robberies.', icon: '$', prog: () => [G.stats.robberies, 5] },
  { id: 'wanted', name: 'Most Wanted', desc: 'Have a $1,000 bounty on your head.', icon: '★', prog: () => [Ach.t.maxBounty, 1000] },
  { id: 'clean', name: 'Clean Slate', desc: 'Pay off a bounty of $200 or more.', icon: '⚖', ev: 'paidBig' },
  { id: 'hunter', name: 'Hunter', desc: 'Hunt 25 animals.', icon: '❧', prog: () => [G.stats.hunted, 25] },
  { id: 'bear', name: 'Grizzly', desc: 'Kill a bear.', icon: '❧', ev: 'kill_bear' },
  { id: 'silent', name: 'Silent Arrow', desc: 'Take down an enemy with the bow.', icon: '➶', ev: 'bowKill' },
  { id: 'treasure', name: 'Treasure Hunter', desc: 'Dig up 3 buried caches.', icon: '✕', prog: () => [G.stats.treasures, 3] },
  { id: 'saddle', name: 'Saddle Sore', desc: 'Ride 10 miles on horseback.', icon: '♞', prog: () => [Math.floor(Ach.t.ridden / MILE_PX * 10) / 10, 10] },
  { id: 'walker', name: 'Shoe Leather', desc: 'Walk 3 miles on foot.', icon: '≈', prog: () => [Math.floor(Ach.t.walked / MILE_PX * 10) / 10, 3] },
  { id: 'arabian', name: 'Fine Horseflesh', desc: 'Own an Arabian.', icon: '♞', test: () => G.player.horse && !G.player.horse.dead && G.player.horse.breed === 'arabian' },
  { id: 'towns', name: 'Grand Tour', desc: 'Discover every town in the territory.', icon: '⌂', prog: () => [World.towns.filter(t => G.world.discovered.includes(t.name)).length, World.towns.length] },
  { id: 'regions', name: 'Wide Open Country', desc: 'Set foot in 10 different regions.', icon: '⛰', prog: () => [Ach.t.regions.length, 10] },
  { id: 'map', name: 'Cartographer', desc: 'Explore half of the territory map.', icon: '⌖', prog: () => [Math.round(G.world.explored.reduce((a, b) => a + b, 0) / G.world.explored.length * 100), 50] },
  { id: 'arsenal', name: 'Collector', desc: 'Own 15 different weapons.', icon: '⚔', prog: () => [WEAPON_ORDER.filter(k => G.player.owned[k]).length, 15] },
  { id: 'modded', name: 'Custom Iron', desc: 'Fit all four gunsmith upgrades to one gun.', icon: '⚙', test: () => Object.values(G.player.mods || {}).some(m => m.barrel && m.grip && m.sights && m.engrave) },
  { id: 'crank', name: 'Turn the Crank', desc: 'Man a crank gun.', icon: '⚙', test: () => !!G.player.turret },
  { id: 'dressed', name: 'Dressed to Kill', desc: 'Buy a new outfit from a tailor.', icon: '♛', ev: 'tailor' },
  { id: 'disguise', name: 'Master of Disguise', desc: 'Change clothes while you have a bounty.', icon: '◐', test: () => Looks.disguised() },
  { id: 'strangers', name: 'Friend to Strangers', desc: 'Finish 10 stranger jobs.', icon: '?', prog: () => [G.stats.sideJobs || 0, 10] },
  { id: 'ch1', name: 'A Name Buried', desc: 'Finish Chapter 1.', icon: 'I', test: () => done('c1m7') },
  { id: 'ch2', name: 'The Iron Covenant', desc: 'Finish Chapter 2.', icon: 'II', test: () => done('c2m7') },
  { id: 'ch3', name: 'Across the River', desc: 'Finish Chapter 3.', icon: 'III', test: () => done('c3m7') },
  { id: 'mirror', name: 'Stand in the Door', desc: 'Finish "Mirror" without drawing on anyone.', icon: '⚑', test: () => done('c3m5') },
  { id: 'end', name: 'What the Ground Remembers', desc: 'See the story through to the very end.', icon: '❦', test: () => done('e2') },
  { id: 'deaths', name: 'Back From the Dead', desc: 'Die 10 times. It happens.', icon: '☠', prog: () => [G.stats.deaths, 10] },
  { id: 'rich', name: 'Silver Baron', desc: 'Carry $5,000 at once.', icon: '$', prog: () => [Math.floor(G.player.money), 5000] }
];

const Ach = {
  KEY: 'outlawcounty.achievements',
  got: {}, t: null, queue: [], showT: 0, checkT: 0, last: null,

  loadGlobal() { try { this.got = JSON.parse(localStorage.getItem(this.KEY) || '{}'); } catch (e) { this.got = {}; } },
  saveGlobal() { try { localStorage.setItem(this.KEY, JSON.stringify(this.got)); } catch (e) {} },
  fresh() { return { ridden: 0, walked: 0, maxBounty: 0, regions: [], ev: {} }; },
  has(id) { return !!this.got[id]; },

  unlock(id) {
    if (this.got[id]) return;
    const a = ACHIEVEMENTS.find(x => x.id === id); if (!a) return;
    this.got[id] = Date.now(); this.saveGlobal();
    this.queue.push(a);
  },
  event(name) { if (!this.t) return; this.t.ev[name] = true; for (const a of ACHIEVEMENTS) if (a.ev === name) this.unlock(a.id); },

  update(dt) {
    const P = G.player; if (!P || !this.t || G.state !== 'play') return;
    if (!this.last) this.last = { x: P.x, y: P.y };
    const d = dist(P.x, P.y, this.last.x, this.last.y);
    if (d < 200) { if (P.mounted) this.t.ridden += d; else this.t.walked += d; }
    this.last = { x: P.x, y: P.y };
    this.t.maxBounty = Math.max(this.t.maxBounty, Law.bounty);
    if (G.region && !this.t.regions.includes(G.region) && !/^\s*$/.test(G.region)) this.t.regions.push(G.region);
    this.checkT -= dt;
    if (this.checkT <= 0) {
      this.checkT = 1;
      for (const a of ACHIEVEMENTS) {
        if (this.got[a.id]) continue;
        try {
          if (a.test && a.test()) this.unlock(a.id);
          else if (a.prog) { const [v, need] = a.prog(); if (v >= need) this.unlock(a.id); }
          else if (a.ev && this.t.ev[a.ev]) this.unlock(a.id);
        } catch (e) { /* stats not ready yet */ }
      }
    }
    this.showToast(dt);
  },

  showToast(dt) {
    const el = $('ach-toast');
    this.showT -= dt;
    if (this.showT <= 0) {
      el.classList.remove('show');
      if (this.queue.length && this.showT < -0.6) {
        const a = this.queue.shift();
        el.innerHTML = `<div class="ach-ico">${a.icon}</div><div><small>Achievement unlocked</small><b>${esc(a.name)}</b><span>${esc(a.desc)}</span></div>`;
        el.classList.add('show'); this.showT = 4.5; Sound.play('mission');
      }
    }
  },

  /* ------------------------------------------------ the Records page */
  open() {
    UI.show('records'); UI.modal = 'records';
    const S = G.stats, P = G.player, n = Object.keys(this.got).length;
    const miles = v => (v / MILE_PX).toFixed(1) + ' mi';
    const rows = [
      ['Story missions', `${MissionSys.completed.filter(id => !id.startsWith('sj_')).length} / ${MissionSys.list.filter(m => !m.side).length}`],
      ['Stranger jobs', S.sideJobs || 0], ['Enemies put down', S.kills], ['Shots fired', S.shots],
      ['Accuracy', S.shots ? Math.round(S.hits / S.shots * 100) + '%' : '—'], ['Robberies', S.robberies], ['Crimes', S.crimes],
      ['Money earned', formatMoney(S.earned || 0)], ['Animals hunted', S.hunted], ['Treasures found', S.treasures], ['Deaths', S.deaths],
      ['Highest bounty', formatMoney(this.t ? this.t.maxBounty : 0)], ['Ridden', miles(this.t ? this.t.ridden : 0)], ['Walked', miles(this.t ? this.t.walked : 0)],
      ['Regions visited', this.t ? this.t.regions.length : 0], ['Towns found', `${G.world.discovered.length} / ${World.towns.length}`],
      ['Weapons owned', WEAPON_ORDER.filter(k => P.owned[k]).length], ['Days on the frontier', Env.day()]
    ];
    $('rec-stats').innerHTML = rows.map(([k, v]) => `<div><span>${esc(k)}</span><b>${esc(String(v))}</b></div>`).join('');
    $('rec-count').textContent = `${n} of ${ACHIEVEMENTS.length} unlocked`;
    $('rec-fill').style.width = (n / ACHIEVEMENTS.length * 100) + '%';
    $('rec-ach').innerHTML = ACHIEVEMENTS.map(a => {
      const got = this.got[a.id];
      let prog = '';
      if (!got && a.prog) { try { const [v, need] = a.prog(); prog = `<em><i style="width:${Math.min(100, v / need * 100)}%"></i></em><small>${Math.min(v, need)} / ${need}</small>`; } catch (e) {} }
      return `<div class="ach ${got ? 'got' : ''}"><div class="ach-ico">${a.icon}</div><div class="ach-body"><b>${esc(a.name)}</b><span>${esc(a.desc)}</span>${got ? `<small>Unlocked ${new Date(got).toLocaleDateString()}</small>` : prog}</div></div>`;
    }).join('');
  }
};
Ach.loadGlobal();

/* events the checks can't see on their own */
(function patches() {
  const pay = Law.payOff.bind(Law);
  Law.payOff = function () { const b = this.bounty, r = pay(); if (!r && b >= 200 && this.bounty === 0) Ach.event('paidBig'); return r; };
  const ahurt = Animal.prototype.hurt;
  Animal.prototype.hurt = function (dmg, src, angle) { const was = this.dead; ahurt.call(this, dmg, src, angle); if (!was && this.dead && src === G.player) Ach.event('kill_' + this.kind); };
  const apply = Bullets.applyHit.bind(Bullets);
  Bullets.applyHit = function (b, e) { const was = e.dead; apply(b, e); if (!was && e.dead && b.owner === G.player && (b.w === 'bow' || b.w === 'firebow') && e instanceof Actor) Ach.event('bowKill'); };
  const buy = Looks.buy.bind(Looks);
  Looks.buy = function () { const c = this.cost(); buy(); if (c && G.player.money >= 0) Ach.event('tailor'); };
  const act = UI.action.bind(UI);
  UI.action = function (a, el) { if (a === 'records') return Ach.open(); if (a === 'records-back') { UI.show('pause'); UI.modal = 'pause'; return; } return act(a, el); };
})();

/* the Records screen and the toast (built once) */
(function buildUI() {
  const el = document.createElement('div');
  el.id = 'records'; el.className = 'screen hidden';
  el.innerHTML = `<div class="panel-box xwide records-box">
    <h2>Records</h2>
    <div class="rec-main">
      <div class="rec-left"><h3>This save</h3><div id="rec-stats" class="rec-stats"></div></div>
      <div class="rec-right"><h3>Achievements <span id="rec-count" class="muted"></span></h3><div class="rec-bar"><span id="rec-fill"></span></div><div id="rec-ach" class="rec-ach"></div></div>
    </div>
    <div class="menu-buttons row-buttons"><button class="btn ghost" data-act="records-back">Back</button></div></div>`;
  const toast = document.createElement('div'); toast.id = 'ach-toast';
  const add = () => { document.body.append(el, toast); };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
})();

Hooks.add({
  key: 'achievements',
  reset: () => { Ach.t = Ach.fresh(); Ach.last = null; },
  update: dt => Ach.update(dt),
  save: () => Ach.t,
  load: ext => { Ach.t = Object.assign(Ach.fresh(), ext || {}); Ach.last = null; }
});
