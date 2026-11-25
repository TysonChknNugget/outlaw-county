/* Outlaw County — horses.js (v2.3)
 * Each town's stables sells its own breeds and shows them outside, wild
 * herds match the land they run on, and a legendary white horse haunts the
 * Bonewhite Salt Flats.
 */
'use strict';

const STABLE_BREEDS = {
  dw_stables: ['mustang', 'morgan', 'quarter', 'walker', 'arabian'],
  sc_stables: ['mule', 'draft', 'appaloosa', 'morgan'],
  ph_stables: ['walker', 'morgan', 'thoroughbred', 'arabian'],
  fg_stables: ['morgan', 'quarter', 'foxtrotter', 'draft'],
  sl_stables: ['mule', 'mustang', 'quarter', 'andalusian']
};
for (const [id, breeds] of Object.entries(STABLE_BREEDS)) SHOP_STOCK[id] = { buy: breeds.map(b => 'horse:' + b).concat(['oats', 'service:groom']), sells: [] };

const Horses = {
  shown: false, ghostT: 0,

  /* a few of each stable's breeds waiting at the rail outside */
  showStock() {
    for (const [id, breeds] of Object.entries(STABLE_BREEDS)) {
      if (id === 'dw_stables') continue;   // Dustwater has its own corral
      const b = World.buildings.find(x => x.id === id); if (!b) continue;
      const door = { x: b.door.x * TS + 8, y: (b.door.y + 2) * TS + 8 };
      breeds.slice(0, 3).forEach((br, i) => {
        const sp = World.randomOpenNear(door.x + (i - 1) * 28, door.y + 10, 0, 26, (x, y) => World.tileAtPx(x, y) === T.FLOOR) || { x: door.x + (i - 1) * 28, y: door.y + 12 };
        G.horses.push(new Horse(br, sp.x, sp.y, { owner: 'shop', face: 0 }));
      });
    }
  },
  breedFor(x, y) {
    const r = World.regionAt(x, y) || '';
    if (/Ranch|Granger|Cottonwood/.test(r)) return pick(['nokota', 'nokota', 'mustang', 'quarter']);
    if (/Frost|Silver/.test(r)) return pick(['appaloosa', 'mustang', 'nag']);
    if (/Salt|Hollow|Badlands|Last Water/.test(r)) return pick(['mustang', 'mustang', 'nag', 'appaloosa']);
    if (/Rio|San Lucero/.test(r)) return pick(['mustang', 'mule', 'andalusian', 'mustang']);
    if (/Canyon|Rattlesnake/.test(r)) return pick(['mustang', 'appaloosa', 'nag']);
    return pick(['mustang', 'mustang', 'nag', 'morgan']);
  },

  /* the Bonewhite Ghost: shows up on the salt now and then while she isn't yours.
     She can't be killed, and if you ever let her go she returns to the salt. */
  updateGhost(dt) {
    const P = G.player, w = G.world;
    if (P.horse && P.horse.breed === 'ghost' && !P.horse.dead) {
      if (!w.ghostTamed) {
        w.ghostTamed = true; Ach.event('ghost');
        UI.banner('The Bonewhite Ghost', 'LEGENDARY HORSE BROKEN'); Sound.play('mission');
        UI.notify('She is a ghost: bullets, falls and fangs pass right through her.', 'good');
      }
      return;
    }
    const g = G.horses.find(h => h.breed === 'ghost' && !h.dead && h.owner === 'wild');
    const onSalt = /Salt|Bonewhite|Hollow/.test(G.region || '');
    if (g) {
      const d = dist(g.x, g.y, P.x, P.y);
      if (d > 1800) { G.horses.splice(G.horses.indexOf(g), 1); return; }
      // she bolts from anyone who isn't creeping up on foot
      if (d < 130 && (P.mounted || (P.moving && !P.crouch))) g.fleeT = 3;
      return;
    }
    if (!onSalt) return;
    this.ghostT -= dt;
    if (this.ghostT > 0) return;
    this.ghostT = 90;
    if (!chance(0.5)) return;
    const sp = World.randomOpenNear(P.x, P.y, 380, 620, (x, y) => !/Salt|Bonewhite|Hollow/.test(World.regionAt(x, y) || '') || !Story.reachable(x, y));
    if (!sp) return;
    const h = new Horse('ghost', sp.x, sp.y, { owner: 'wild', name: 'Ghost' });
    G.horses.push(h);
    UI.notify('Something white moves out on the salt: a horse, running alone. Get off your horse and crouch (C) to creep close enough to catch her.', 'mission');
  },
  markers() {
    const g = G.horses.find(h => h.breed === 'ghost' && !h.dead && h.owner === 'wild');
    return g && !MissionSys.active ? [{ x: g.x, y: g.y - 26, label: 'Bonewhite Ghost', kind: 'stranger', small: true }] : [];
  }
};

/* the Ghost can't be hurt */
(function () {
  const hurt = Horse.prototype.hurt;
  Horse.prototype.hurt = function (dmg, src) {
    if (this.def.legendary) {
      this.hp = this.maxHp; this.hurtT = 0.15;
      if (!this.ghostMsgT || this.ghostMsgT < Combat.t) { this.ghostMsgT = Combat.t + 2; Floaters.add(this.x, this.y - 28, 'passes right through her', '#e8f0ff'); }
      if (this.owner === 'wild' && !this.rider) this.fleeT = 4;
      return;
    }
    return hurt.call(this, dmg, src);
  };
})();

/* wild herds fit the region */
Spawner.spawnHerd = function (x, y, n) {
  for (let i = 0; i < n; i++) {
    const sp = World.randomOpenNear(x, y, 0, 60); if (!sp) continue;
    G.horses.push(new Horse(Horses.breedFor(sp.x, sp.y), sp.x, sp.y, { owner: 'wild' }));
  }
};

(function () {
  const base = MissionSys.markers.bind(MissionSys);
  MissionSys.markers = function () { return base().concat(Horses.markers()); };
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'ghost', name: 'Ghost Rider', desc: 'Catch and break the Bonewhite Ghost.', icon: '♘', ev: 'ghost' },
    { id: 'breeds', name: 'Horse Trader', desc: 'Ride 6 different breeds.', icon: '♞', prog: () => [(Ach.t.breeds || []).length, 6] }
  );
})();

Hooks.add({
  key: 'horses',
  reset: () => { Horses.shown = false; Horses.ghostT = 20; },
  update: dt => {
    if (!Horses.shown && G.actors && G.actors.length) { Horses.shown = true; Horses.showStock(); }
    Horses.updateGhost(dt);
    const P = G.player;
    if (P && P.mounted && Ach.t) { Ach.t.breeds = Ach.t.breeds || []; if (!Ach.t.breeds.includes(P.mounted.breed)) Ach.t.breeds.push(P.mounted.breed); }
  }
});
