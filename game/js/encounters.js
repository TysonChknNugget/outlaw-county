/* Outlaw County — encounters.js (v2.6)
 * Things that happen on the road: ambushes, a broken wagon that might be a
 * trap, a stagecoach being robbed, a lynch mob, a lost kid, a snakebit
 * traveler and a traveling peddler.
 */
'use strict';

const Enc = {
  t: 60, list: [], props: [],

  update(dt) {
    const P = G.player; if (!P || P.dead) return;
    for (const e of this.list.slice()) { e.t += dt; if (this[e.type + 'Tick']) this[e.type + 'Tick'](e, dt); if (e.done || dist(e.x, e.y, P.x, P.y) > 1500) this.end(e); }
    for (const p of this.props) p.anim += dt;
    this.t -= dt;
    if (this.t > 0 || MissionSys.active || Law.heat > 0 || this.list.length >= 2) return;
    if (World.townAt(P.x, P.y)) { this.t = 15; return; }
    this.t = rand(70, 130);
    const ahead = P.mounted ? P.mounted.heading : P.face;
    const sp = World.randomOpenNear(P.x + Math.cos(ahead) * 360, P.y + Math.sin(ahead) * 360, 0, 120, (x, y) => !Story.reachable(x, y) || !!World.townAt(x, y) || Game.onScreen(x, y, 20));
    if (!sp) return;
    const kind = pick(['ambush', 'ambush', 'wagon', 'wagon', 'stage', 'lynch', 'kid', 'snakebite', 'peddler', 'peddler']);
    this[kind](sp);
  },
  end(e) {
    this.list = this.list.filter(x => x !== e);
    this.props = this.props.filter(p => p.enc !== e);
    for (const a of e.actors || []) if (!a.dead && !Game.onScreen(a.x, a.y, 40)) a.removeMe = true;
  },
  prop(e, kind, x, y, extra) { const p = Object.assign({ spec: { kind }, x, y, face: 0, anim: 0, enc: e }, extra || {}); p.draw = ctx => Scenery.draw(ctx, p); this.props.push(p); return p; },
  civ(x, y, name, o = {}) { const a = spawnActor('civilian', x, y, Object.assign({ name, temp: true, cash: randi(5, 20) }, o)); a.encNpc = true; return a; },
  bandits(x, y, n, o = {}) {
    const out = [];
    for (let i = 0; i < n; i++) { const sp = World.randomOpenNear(x, y, 10, 70, (px, py) => !Story.reachable(px, py)) || { x: x + rand(-40, 40), y: y + rand(-40, 40) }; out.push(spawnActor('rival', sp.x, sp.y, Object.assign({ temp: true, cash: randi(10, 35) }, o))); }
    return out;
  },

  /* ---- an ambush: they're hiding by the road and wait until you're close */
  ambush(sp) {
    const e = { type: 'ambush', x: sp.x, y: sp.y, t: 0 };
    e.actors = this.bandits(sp.x, sp.y, randi(3, 5), { name: 'Road Agent' });
    for (const a of e.actors) { a.sentry = true; a.preferLaw = true; a.crouch = true; a.post = { x: a.x, y: a.y }; }
    this.prop(e, 'rockfall', sp.x + 20, sp.y - 10);
    this.list.push(e);
  },
  ambushTick(e) {
    const P = G.player;
    if (!e.sprung && dist(P.x, P.y, e.x, e.y) < 150) {
      e.sprung = true;
      for (const a of e.actors) { a.sentry = false; a.preferLaw = false; a.aggro = true; a.forceHostile = true; a.post = null; }
      e.actors[0].bark(pick(['Now, boys!', 'Your money or your life!', 'Get him!']), true);
      UI.notify('Ambush! They were waiting behind the rocks.', 'crime');
    }
    if (e.sprung && e.actors.every(a => a.dead || a.surrendered)) { e.done = true; UI.notify('You came through the ambush. Check the bodies for cash.', 'good'); Progress.add(20); }
  },

  /* ---- a broken-down wagon: a real traveler, or bait */
  wagon(sp) {
    const e = { type: 'wagon', x: sp.x, y: sp.y, t: 0, trap: chance(0.4) };
    this.prop(e, 'wagon', sp.x, sp.y);
    e.driver = this.civ(sp.x - 26, sp.y + 8, `${pick(FIRST)} ${pick(LAST)}`);
    e.driver.post = { x: e.driver.x, y: e.driver.y }; e.actors = [e.driver];
    e.driver.bark('Lost a wheel! Could you lend a hand, friend?', true);
    this.list.push(e);
  },
  wagonInteract(e) {
    if (e.helped || e.driver.dead) return [];
    return [{ label: 'Help fix the wheel', x: e.x, y: e.y, r: 40, act: () => Interact.begin('Fixing the wheel', 3, () => {
      e.helped = true;
      if (e.trap) {
        e.driver.bark('Sucker! Boys, he\'s all yours!', true);
        e.actors.push(...this.bandits(e.x + 40, e.y - 30, 3, { name: 'Wagon Thief', aggro: true, forceHostile: true }));
        e.driver.weapon = 'derringer'; e.driver.faction = 'rival'; e.driver.kind = 'rival'; e.driver.aggro = true; e.driver.forceHostile = true;
        UI.notify('It was a trap! Bandits jump out of the wagon bed.', 'crime');
      } else {
        const pay = randi(15, 35); Economy.addMoney(pay); Progress.add(15);
        e.driver.bark('Bless you, stranger. Here, take this for your trouble.', true);
        UI.notify(`The traveler paid you $${pay} for the help.`, 'good');
        e.done = true;
      }
    }, { sound: 'click', range: 50 }) }];
  },
  wagonTick(e) { if (e.helped && e.trap && e.actors.every(a => a.dead || a.surrendered || a.encNpc && a.faction === 'civ')) { e.done = true; Progress.add(20); } },

  /* ---- someone else robbing a stagecoach */
  stage(sp) {
    const e = { type: 'stage', x: sp.x, y: sp.y, t: 0 };
    this.prop(e, 'wagon', sp.x, sp.y, { stage: true });
    e.pass = [this.civ(sp.x - 20, sp.y + 14, 'Passenger'), this.civ(sp.x + 4, sp.y + 16, 'Passenger')];
    for (const p of e.pass) { p.state = 'handsup'; p.post = { x: p.x, y: p.y }; p.timer = 999; }
    e.robbers = this.bandits(sp.x + 30, sp.y + 10, 3, { name: 'Coach Robber' });
    for (const a of e.robbers) { a.post = { x: a.x, y: a.y }; }
    e.actors = [...e.pass, ...e.robbers];
    UI.notify('Gunshots ahead: somebody is robbing a stagecoach.', 'warn');
    this.list.push(e);
  },
  stageTick(e) {
    for (const p of e.pass) if (!p.dead && !e.saved) { p.state = 'handsup'; }
    if (!e.saved && e.robbers.every(a => a.dead || a.surrendered)) {
      e.saved = true; const pay = randi(40, 80); Economy.addMoney(pay); Progress.add(30);
      const live = e.pass.find(p => !p.dead); if (live) live.bark('You saved us! Please, take this.', true);
      UI.notify(`The passengers gave you $${pay} for running off the robbers.`, 'good'); e.done = true;
    }
  },

  /* ---- a lynch mob */
  lynch(sp) {
    const e = { type: 'lynch', x: sp.x, y: sp.y, t: 0 };
    this.prop(e, 'gallows', sp.x, sp.y - 10);
    e.victim = this.civ(sp.x, sp.y + 6, `${pick(FIRST)} ${pick(LAST)}`); e.victim.state = 'handsup'; e.victim.post = { x: e.victim.x, y: e.victim.y };
    e.mob = this.bandits(sp.x, sp.y + 30, 3, { name: 'Lynch Mob', weapon: pick(['sa', 'shotgun']) });
    for (const a of e.mob) a.post = { x: a.x, y: a.y };
    e.actors = [e.victim, ...e.mob];
    e.victim.bark("I didn't do it! I swear I didn't!", true);
    UI.notify('A lynch mob is about to hang a man without a trial.', 'warn');
    this.list.push(e);
  },
  lynchTick(e) {
    if (!e.victim.dead) e.victim.state = 'handsup';
    if (!e.saved && e.t > 60 && !e.mob.some(a => a.engaged)) { e.done = true; if (!e.victim.dead) { e.victim.hurt(999); } UI.notify('The mob had its hanging.', 'bad'); return; }
    if (!e.saved && e.mob.every(a => a.dead || a.surrendered)) { e.saved = true; e.victim.state = 'idle'; e.victim.bark('Thank you! I owe you my neck!', true); const pay = randi(25, 50); Economy.addMoney(pay); Progress.add(35); UI.notify(`The man you saved gave you everything he had: $${pay}.`, 'good'); e.done = true; }
  },

  /* ---- a lost kid who needs taking to the nearest town */
  kid(sp) {
    const e = { type: 'kid', x: sp.x, y: sp.y, t: 0 };
    e.kid = this.civ(sp.x, sp.y, pick(['Little Sally', 'Tommy', 'Little Joe', 'Ada', 'Billy', 'Rosie']), { pal: Object.assign(Looks.civ(sp.x, sp.y), { hatType: chance(0.5) ? 'none' : 'cap', hat: '#6a5a3a', small: true }) });
    e.kid.post = { x: sp.x, y: sp.y }; e.actors = [e.kid];
    e.kid.bark("I can't find my way home...", true);
    const towns = World.towns.filter(t => !/Hollow/.test(t.name)).map(t => ({ t, c: { x: (t.x0 + t.x1) / 2 * TS, y: (t.y0 + t.y1) / 2 * TS } })).sort((a, b) => dist(a.c.x, a.c.y, sp.x, sp.y) - dist(b.c.x, b.c.y, sp.x, sp.y));
    e.dest = towns[0];
    this.list.push(e);
  },
  kidInteract(e) {
    if (e.leading || e.kid.dead) return [];
    return [{ label: `Take ${e.kid.name} home to ${e.dest.t.name}`, x: e.kid.x, y: e.kid.y, r: 30, act: () => { e.leading = true; e.kid.follow = true; e.kid.post = null; e.kid.faction = 'gang'; e.kid.kind = 'gang'; e.kid.invuln = true; e.kid.bark('You know the way? Thank you, mister!', true); UI.notify(`Take ${e.kid.name} to ${e.dest.t.name}. Ride slow so the kid can keep up.`, 'mission'); } }];
  },
  kidTick(e) {
    if (e.leading && dist(e.kid.x, e.kid.y, e.dest.c.x, e.dest.c.y) < 260) {
      e.kid.follow = false; e.kid.bark('Ma! Ma!', true); const pay = randi(30, 60); Economy.addMoney(pay); Progress.add(40);
      UI.notify(`${e.kid.name}'s mother can't stop thanking you. She presses $${pay} into your hand.`, 'good'); e.done = true; e.kid.removeMe = true;
    }
  },

  /* ---- a snakebit traveler */
  snakebite(sp) {
    const e = { type: 'snakebite', x: sp.x, y: sp.y, t: 0 };
    e.man = this.civ(sp.x, sp.y, `${pick(FIRST)} ${pick(LAST)}`); e.man.state = 'kneel'; e.man.post = { x: sp.x, y: sp.y }; e.actors = [e.man];
    e.man.bark('Rattler got me... please... a bandage...', true);
    this.list.push(e);
  },
  snakebiteInteract(e) {
    if (e.helped || e.man.dead) return [];
    const has = (G.player.inv.bandage || 0) > 0;
    return [{ label: has ? 'Bandage the bite (uses 1 bandage)' : 'You have no bandage', x: e.man.x, y: e.man.y, r: 30, act: () => {
      if (!has) { UI.notify('Buy bandages at any general store.', 'info'); return; }
      Interact.begin('Cutting and binding the bite', 2.5, () => { G.player.inv.bandage--; e.helped = true; e.man.state = 'idle'; const pay = randi(20, 40); Economy.addMoney(pay); Progress.add(25); e.man.bark('I can feel my leg again. God bless you.', true); UI.notify(`He gave you $${pay}. You may well have saved his life.`, 'good'); e.done = true; }, { range: 40 });
    } }];
  },
  snakebiteTick(e) { if (!e.helped && !e.man.dead) e.man.state = 'kneel'; if (!e.helped && e.t > 90) { e.man.hurt(999); e.done = true; } },

  /* ---- a traveling peddler */
  peddler(sp) {
    const e = { type: 'peddler', x: sp.x, y: sp.y, t: 0 };
    this.prop(e, 'wagon', sp.x, sp.y);
    e.man = this.civ(sp.x - 26, sp.y + 8, pick(['Professor Ignatius Bly', 'Madame Zelda', 'Honest Abe Pruitt', 'Cyrus the Peddler']), { pal: Object.assign(Looks.civ(sp.x, sp.y), { hatType: 'top', hat: '#3a1a2a', coat: '#5a2a4a', vest: '#c8a040' }) });
    e.man.post = { x: e.man.x, y: e.man.y }; e.actors = [e.man];
    e.man.bark('Step right up! Wonders from the East!', true);
    this.list.push(e);
  },
  peddlerInteract(e) {
    if (e.man.dead) return [];
    return [{ label: `Browse ${e.man.name}'s wagon`, x: e.man.x, y: e.man.y, r: 34, act: () => UI.openShop('peddler', e.man) }];
  },

  interactions() { const out = []; for (const e of this.list) if (this[e.type + 'Interact']) out.push(...this[e.type + 'Interact'](e)); return out; },
  sortables() { return this.props; },
  markers() { return MissionSys.active ? [] : this.list.filter(e => e.type !== 'ambush').map(e => ({ x: e.x, y: e.y - 30, label: '', small: true, kind: 'stranger' })); }
};

SHOPS.peddler = { name: 'Traveling Peddler', type: 'peddler' };
SHOP_STOCK.peddler = { buy: ['tonic', 'dynamite', 'firebottle', 'ammo:revolver', 'ammo:heavy', 'ammo:firearrow', 'weapon:derringer', 'weapon:tknife'], sells: ['pelt', 'stolen'] };

(function () {
  const base = MissionSys.markers.bind(MissionSys);
  MissionSys.markers = function () { return base().concat(Enc.markers()); };
})();

Hooks.add({ key: 'encounters', reset: () => { Enc.t = 60; Enc.list = []; Enc.props = []; }, update: dt => Enc.update(dt), interactions: () => Enc.interactions(), sortables: () => Enc.sortables() });
