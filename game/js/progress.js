/* Outlaw County — progress.js
 * Reputation (XP, levels, perks), bounty hunting and random world events.
 */
'use strict';

/* ============================================================ reputation & perks */
const Progress = {
  has(id) { const P = G.player; return !!(P && P.perks && P.perks[id]); },
  need(level) { return Math.round(100 * Math.pow(level, 1.35)); },
  add(n) {
    const P = G.player;
    if (!P || P.dead || n <= 0) return;
    P.xp += n;
    if (n >= 10) Floaters.add(P.x, P.y - 36, `+${n} rep`, '#9ad0ff');
    while (P.xp >= this.need(P.level)) {
      P.xp -= this.need(P.level); P.level++; P.perkPoints++;
      UI.banner(`Level ${P.level}`, 'REPUTATION UP');
      UI.notify('Your reputation grows. Choose a new perk in your Saddlebags (Tab).', 'mission');
      Sound.play('mission');
    }
  },
  choose(id) {
    const P = G.player;
    if (!PERKS[id] || P.perkPoints <= 0 || P.perks[id]) return;
    P.perks[id] = true; P.perkPoints--;
    this.apply();
    UI.notify(`Perk learned: ${PERKS[id].name}.`, 'good');
    Sound.play('buy');
  },
  apply() { const P = G.player; P.maxHp = 100 + (this.has('tough') ? 30 : 0); P.hp = Math.min(P.hp, P.maxHp); },
  ammoMax(type) { return Math.round(AMMO[type].max * (this.has('packmule') ? 1.5 : 1)); },
  priceMul() { return this.has('haggler') ? 0.85 : 1; }
};

/* ============================================================ bounty hunting */
const BOUNTY_NICKS = ['Snake-Eye', 'Two-Gun', 'Mad Dog', 'Whiskey', 'Coyote', 'Smiling', 'Lucky', 'Rattler', 'Kid', 'Gravedigger', 'Sixkiller', 'Slim'];
const BOUNTY_CRIMES = ['cattle rustling', 'horse theft', 'murder', 'robbing the mail', 'arson', 'claim jumping', 'train wrecking', 'bank fraud'];
const BOUNTY_SPOTS = [[150, 186], [272, 190], [30, 96], [200, 64], [118, 214], [296, 150], [62, 30], [176, 106], [250, 122], [88, 168], [20, 180], [240, 230],
  // frontier
  [470, 60], [660, 200], [760, 90], [1180, 160], [1240, 60], [360, 380], [500, 300], [660, 460], [760, 300], [980, 380], [1150, 440], [120, 520], [300, 640], [700, 560], [940, 620], [1200, 600], [300, 870], [800, 880], [1100, 860]];

const Bounties = {
  board: [], active: null, day: -1, nextId: 1,

  reset() { this.board = []; this.active = null; this.day = -1; this.nextId = 1; },
  makePosting() {
    const P = G.player, near = BOUNTY_SPOTS.filter(([x, y]) => x < World.W && y < World.H && dist(x * TS, y * TS, P.x, P.y) < 300 * TS);
    const [tx, ty] = pick(near.length >= 3 ? near : BOUNTY_SPOTS.filter(([x, y]) => x < World.W && y < World.H)), sp = World.findOpen(tx * TS + 8, ty * TS + 8, 6);
    const alive = randi(12, 26) * 10;
    return {
      id: this.nextId++, name: `${pick(FIRST.slice(0, 15))} "${pick(BOUNTY_NICKS)}" ${pick(LAST)}`, crime: pick(BOUNTY_CRIMES),
      alive, dead: Math.round(alive * 0.55 / 5) * 5, x: sp.x, y: sp.y, guards: randi(1, 3), role: pick(['sharpshooter', 'brute', 'gunslinger', 'dynamiter', null])
    };
  },
  refresh() {
    if (this.day === Env.day()) return;
    this.day = Env.day();
    this.board = [0, 1, 2].map(() => this.makePosting());
  },
  accept(post) {
    if (this.active) { UI.notify('You are already hunting a bounty.', 'info'); return; }
    this.active = Object.assign({}, post, { state: 'hunting', actor: null });
    this.board = this.board.filter(b => b.id !== post.id);
    UI.notify(`Bounty accepted: ${post.name}, wanted for ${post.crime}. Bring them in alive for $${post.alive} (knock them out or make them surrender, then hogtie), or dead for $${post.dead}.`, 'mission');
    Sound.play('mission');
  },
  abandon() { const a = this.active; if (!a) return; if (a.actor && !a.actor.dead) a.actor.removeMe = true; this.active = null; UI.notify('Bounty abandoned.', 'info'); },
  nearestSheriff() {
    const P = G.player, doors = World.poi.sheriffDoors || [World.poi.dwSheriffDoor, World.poi.mfSheriffDoor];
    return doors.reduce((best, d) => dist(P.x, P.y, d.x, d.y) < dist(P.x, P.y, best.x, best.y) ? d : best);
  },
  update() {
    const A = this.active, P = G.player;
    if (!A || P.dead) return;
    if (A.state === 'hunting') {
      if (!A.actor && dist(P.x, P.y, A.x, A.y) < 750) {
        const t = spawnActor('rival', A.x, A.y, { name: A.name, bountyTarget: true, hp: 140, cash: randi(20, 50), role: A.role || undefined, home: { x: A.x, y: A.y }, noRole: !A.role });
        A.actor = t;
        for (let i = 0; i < A.guards; i++) { const sp = World.randomOpenNear(A.x, A.y, 20, 60) || { x: A.x + 20, y: A.y }; spawnActor('rival', sp.x, sp.y, { temp: true, home: { x: A.x, y: A.y }, cash: randi(8, 25) }); }
      }
      const t = A.actor;
      if (t) {
        if (t.dead) { A.state = 'killed'; UI.notify(`${A.name} is dead. Collect $${A.dead} at any sheriff's office.`, 'good'); }
        else if (t.captive) A.state = 'captive';
        else if (t.removeMe) { A.actor = null; }
      }
    } else if (A.state === 'captive') {
      const t = A.actor;
      if (!t || t.dead) { A.state = 'killed'; UI.notify(`Your prisoner died. You can still collect the $${A.dead} dead reward.`, 'warn'); }
    }
  },
  markers() {
    const A = this.active, P = G.player;
    if (!A) return [];
    if (A.state === 'hunting') {
      const t = A.actor;
      if (t && !t.dead && dist(P.x, P.y, t.x, t.y) < 260) return [{ x: t.x, y: t.y - 26, label: A.name }];
      return [{ x: A.x, y: A.y - 20, label: `Bounty: ${A.name}` }];
    }
    const s = this.nearestSheriff();
    return [{ x: s.x, y: s.y - 30, label: 'Turn in bounty' }];
  },
  interactions() {
    const A = this.active, P = G.player, out = [];
    if (!A || A.state !== 'hunting' || !A.actor) return out;
    const t = A.actor;
    if (!t.dead && !t.captive && (t.surrendered || t.knockedOut) && dist(P.x, P.y, t.x, t.y) < 28) {
      out.push({ label: `Hogtie ${t.name}`, x: t.x, y: t.y, r: 28, priority: 20, act: () => Interact.begin('Tying up ' + t.name, 2, () => {
        Object.assign(t, { captive: true, surrendered: true, knockedOut: false, downed: 0, weapon: null, aggro: false, target: null });
        t.hp = Math.max(t.hp, 40);
        UI.notify(`${t.name} is tied up and will follow you. Take them to a sheriff's office.`, 'good');
        Sound.play('click');
      }) });
    }
    return out;
  },
  /* entries shown at a sheriff's office */
  shopEntries() {
    this.refresh();
    const A = this.active, P = G.player, out = [];
    if (A) {
      if (A.state === 'captive' && A.actor && !A.actor.dead && dist(A.actor.x, A.actor.y, P.x, P.y) < 160) {
        out.push({ name: `Turn in ${A.name} (alive)`, desc: `Wanted for ${A.crime}.`, price: A.alive, label: 'Turn in', noCharge: true, can: true, buy: () => this.turnIn(true) });
      } else if (A.state === 'killed') {
        out.push({ name: `Collect bounty: ${A.name} (dead)`, desc: `Wanted for ${A.crime}.`, price: A.dead, label: 'Collect', noCharge: true, can: true, buy: () => this.turnIn(false) });
      } else {
        out.push({ name: `Hunting: ${A.name}`, desc: A.state === 'captive' ? 'Bring your prisoner inside the office to turn them in.' : `Last seen out in the county. $${A.alive} alive, $${A.dead} dead.`, price: 0, label: 'Abandon', noCharge: true, can: true, buy: () => this.abandon() });
      }
    }
    for (const b of this.board) {
      out.push({ name: `WANTED: ${b.name}`, desc: `For ${b.crime}. ${b.guards} accomplice${b.guards > 1 ? 's' : ''}.${b.role ? ' Known ' + ROLE_NAMES[b.role].toLowerCase() + '.' : ''}`, price: b.alive, note: `$${b.dead} dead`, label: 'Accept', noCharge: true, can: !A, reason: A ? 'Busy' : null, buy: () => this.accept(b) });
    }
    if (!this.board.length && !A) out.push({ name: 'No new posters today', desc: 'Check back tomorrow.', price: 0, noCharge: true, can: false, reason: '—', buy: () => {} });
    return out;
  },
  turnIn(alive) {
    const A = this.active; if (!A) return;
    const pay = alive ? A.alive : A.dead;
    Economy.addMoney(pay);
    Progress.add(alive ? 120 : 80);
    if (alive && A.actor) A.actor.removeMe = true;
    UI.notify(`The sheriff pays you $${pay} for ${A.name}${alive ? ', who is locked up in a cell' : ''}.`, 'good');
    G.stats.bounties = (G.stats.bounties || 0) + 1;
    this.active = null;
  },
  save() { const A = this.active; return { board: this.board, day: this.day, nextId: this.nextId, active: A ? Object.assign({}, A, { actor: null, state: A.state === 'killed' ? 'killed' : 'hunting' }) : null }; },
  load(s) { this.reset(); if (!s) return; this.board = s.board || []; this.day = s.day; this.nextId = s.nextId || 1; this.active = s.active || null; }
};

/* ============================================================ random events */
const Events = {
  active: [],
  reset() { this.active = []; },
  nearMesaJail() { const j = World.poi.mfSheriffDoor; return dist(G.player.x, G.player.y, j.x, j.y) < 900; },
  trigger() {
    const P = G.player;
    const avoid = (x, y) => Game.onScreen(x, y, 10) || World.townAt(x, y);
    if (this.nearMesaJail() && !this.active.some(e => e.type === 'jailbreak') && chance(0.35)) return this.jailbreak();
    if (World.townAt(P.x, P.y)) return;
    const sp = World.randomOpenNear(P.x, P.y, 340, 440, avoid);
    if (!sp) return;
    const r = Math.random();
    if (r < 0.3) this.riders(sp);
    else if (r < 0.58) this.settlers(sp);
    else if (r < 0.8) this.escort(sp);
    else if (r < 0.92) this.patrol(sp);
    else for (let i = 0; i < 3; i++) G.animals.push(new Animal(chance(0.5) ? 'coyote' : 'deer', sp.x + rand(-20, 20), sp.y + rand(-20, 20)));
  },
  riders(sp) {
    const n = randi(2, 3);
    for (let i = 0; i < n; i++) {
      const a = spawnActor('rival', sp.x + i * 14, sp.y + rand(-10, 10), { encounter: true, temp: true, cash: randi(15, 45) });
      a.mounted = new Horse(pick(['mustang', 'nag', 'morgan']), a.x, a.y, { owner: 'wild' });
    }
    UI.notify('Hoofbeats... Rattlesnake riders are coming for you!', 'warn');
  },
  patrol(sp) {
    for (let i = 0; i < 2; i++) {
      const a = spawnActor('lawman', sp.x + i * 14, sp.y, { temp: true });
      a.mounted = new Horse('morgan', a.x, a.y, { owner: 'law' });
      a.patrol = [{ x: World.poi.saloonFront.x, y: World.poi.saloonFront.y }];
    }
  },
  settlers(sp) {
    const e = { type: 'settlers', x: sp.x, y: sp.y, settlers: [], raiders: [], t: 0 };
    for (let i = 0; i < 2; i++) { const s = spawnActor('civilian', sp.x + i * 12, sp.y, { temp: true, cash: randi(10, 30), name: pick(FIRST) + ' ' + pick(LAST) }); s.state = 'handsup'; s.timer = 30; e.settlers.push(s); }
    for (let i = 0; i < 3; i++) { const r = World.randomOpenNear(sp.x, sp.y, 50, 90) || { x: sp.x + 60, y: sp.y }; e.raiders.push(spawnActor('rival', r.x, r.y, { raider: true, temp: true, cash: randi(10, 30) })); }
    e.settlers[0].bark('Help! Bandits!', true);
    UI.notify('Gunfire nearby — settlers are being attacked by bandits!', 'warn');
    this.active.push(e);
  },
  escort(sp) {
    const e = { type: 'escort', x: sp.x, y: sp.y, guards: [], t: 0 };
    for (let i = 0; i < 2; i++) {
      const g = spawnActor('lawman', sp.x + i * 16, sp.y, { temp: true, noRole: true });
      g.mounted = new Horse('morgan', g.x, g.y, { owner: 'law' });
      g.patrol = [World.poi.dwSheriffDoor]; e.guards.push(g);
    }
    const p = spawnActor('rival', sp.x - 18, sp.y, { temp: true, name: `${pick(FIRST)} ${pick(LAST)}`, cash: 0, noRole: true });
    p.surrendered = true; p.weapon = null; p.escortBy = e.guards[0]; e.prisoner = p;
    UI.notify('Two deputies are escorting a prisoner along the road.', 'info');
    this.active.push(e);
  },
  jailbreak() {
    const j = World.poi.mfSheriffDoor;
    const e = { type: 'jailbreak', x: j.x, y: j.y, raiders: [], t: 0 };
    for (let i = 0; i < 3; i++) { const r = World.randomOpenNear(j.x, j.y + 60, 30, 90) || { x: j.x + 40, y: j.y + 60 }; const a = spawnActor('rival', r.x, r.y, { temp: true, cash: randi(10, 30), home: { x: j.x, y: j.y + 12 } }); a.preferLaw = true; e.raiders.push(a); }
    for (let i = 0; i < 2; i++) { const r = World.randomOpenNear(j.x, j.y + 20, 0, 30) || j; spawnActor('lawman', r.x, r.y, { temp: true, post: { x: r.x, y: r.y } }); }
    UI.notify('Gunshots at the Mesa Flats jail — the Rattlesnakes are trying to break someone out!', 'warn');
    this.active.push(e);
  },
  markers() {
    const out = [];
    for (const e of this.active) {
      if (e.done) continue;
      if (e.type === 'escort' && e.prisoner && e.freeable) out.push({ x: e.prisoner.x, y: e.prisoner.y - 26, label: 'Prisoner', small: false });
      else if (e.type !== 'escort') out.push({ x: e.x, y: e.y - 20, label: e.type === 'settlers' ? 'Settlers attacked' : 'Jailbreak', small: false });
    }
    return out;
  },
  interactions() {
    const out = [], P = G.player;
    for (const e of this.active) {
      if (e.type === 'escort' && e.freeable && !e.done && e.prisoner && !e.prisoner.dead && dist(P.x, P.y, e.prisoner.x, e.prisoner.y) < 28) {
        const p = e.prisoner;
        out.push({ label: `Cut ${p.name} loose`, x: p.x, y: p.y, r: 28, priority: 20, act: () => Interact.begin('Cutting the ropes', 1.5, () => {
          e.done = true; p.escortBy = null; p.released = true;
          p.bark('Much obliged, friend! Here — I buried this a while back.', true);
          Economy.addMoney(randi(40, 80)); Economy.addItem('treasure_map'); Progress.add(40);
        }) });
      }
    }
    return out;
  },
  update(dt) {
    const P = G.player;
    for (const e of this.active) {
      if (e.done) continue;
      e.t += dt;
      const far = dist(P.x, P.y, e.x, e.y) > 1400;
      if (e.type === 'settlers') {
        const raidersLeft = e.raiders.some(r => !r.dead && !r.surrendered && !r.knockedOut);
        const alive = e.settlers.filter(s => !s.dead);
        if (!raidersLeft) {
          e.done = true;
          if (alive.length && dist(P.x, P.y, e.x, e.y) < 500) {
            alive[0].bark('Bless you, stranger! Take this for your trouble.', true);
            Economy.addMoney(randi(25, 55)); Progress.add(40);
            UI.notify('You saved the settlers.', 'good');
          }
        } else if (!alive.length) { e.done = true; UI.notify('The settlers were killed by the bandits.', 'bad'); }
      } else if (e.type === 'escort') {
        const p = e.prisoner;
        if (!p || p.dead) e.done = true;
        else if (e.guards.every(g => g.dead || g.surrendered || g.knockedOut)) {
          if (!e.freeable) { e.freeable = true; p.escortBy = null; p.bark('Cut me loose, would ya?', true); }
        } else if (p.escortBy && p.escortBy.dead) p.escortBy = e.guards.find(g => !g.dead) || null;
        if (e.guards.every(g => !g.dead) && dist(e.guards[0].x, e.guards[0].y, World.poi.dwSheriffDoor.x, World.poi.dwSheriffDoor.y) < 60) { e.done = true; p.removeMe = true; }
      } else if (e.type === 'jailbreak') {
        if (e.raiders.every(r => r.dead || r.surrendered || r.knockedOut)) {
          e.done = true;
          if (dist(P.x, P.y, e.x, e.y) < 450 && Law.heat === 0) {
            if (Law.bounty > 0) { const cut = Math.ceil(Law.bounty / 2); Law.bounty -= cut; UI.notify(`The deputies thank you for stopping the jailbreak and knock $${cut} off your bounty.`, 'good'); }
            else { Economy.addMoney(40); UI.notify('The deputies pay you $40 for stopping the jailbreak.', 'good'); }
            Progress.add(50);
          }
        }
      }
      if (far && e.t > 20) e.done = true;
    }
    this.active = this.active.filter(e => !e.done);
  }
};

/* ============================================================ discovery & waypoints
 * The map starts hidden outside the original county. Riding around uncovers it in
 * 8×8-tile cells; the first visit to a settlement announces it. */
const Discovery = {
  CW: 160, CHh: 120, CELL: 8, t: 0, fog: null, dirty: true,
  fresh() {
    const a = new Uint8Array(this.CW * this.CHh);
    for (let y = 0; y < 30; y++) for (let x = 0; x < 40; x++) a[y * this.CW + x] = 1;   // the home county is known
    return a;
  },
  encode(a) {
    let s = '';
    for (let i = 0; i < a.length; i += 8) { let b = 0; for (let j = 0; j < 8; j++) if (a[i + j]) b |= 1 << j; s += String.fromCharCode(b); }
    return btoa(s);
  },
  decode(str) {
    const a = this.fresh();
    try { const s = atob(str); for (let i = 0; i < s.length; i++) { const b = s.charCodeAt(i); for (let j = 0; j < 8; j++) if (b & (1 << j)) a[i * 8 + j] = 1; } } catch (e) { /* corrupt: keep defaults */ }
    return a;
  },
  ensure() {
    const w = G.world;
    if (!(w.explored instanceof Uint8Array)) { w.explored = typeof w.explored === 'string' ? this.decode(w.explored) : this.fresh(); this.dirty = true; }
    if (!w.discovered) w.discovered = ['Dustwater', 'Mesa Flats'];
    if (w.waypoint === undefined) w.waypoint = null;
  },
  seenAt(x, y) {
    this.ensure();
    const cx = Math.floor(x / TS / this.CELL), cy = Math.floor(y / TS / this.CELL);
    return cx >= 0 && cy >= 0 && cx < this.CW && cy < this.CHh && !!G.world.explored[cy * this.CW + cx];
  },
  reveal(x, y, r) {
    const e = G.world.explored, c0x = x / TS / this.CELL, c0y = y / TS / this.CELL;
    for (let cy = Math.floor(c0y - r); cy <= c0y + r; cy++) for (let cx = Math.floor(c0x - r); cx <= c0x + r; cx++) {
      if (cx < 0 || cy < 0 || cx >= this.CW || cy >= this.CHh) continue;
      const i = cy * this.CW + cx;
      if (!e[i] && dist(cx + 0.5, cy + 0.5, c0x, c0y) <= r) { e[i] = 1; this.dirty = true; }
    }
  },
  update(dt) {
    this.t -= dt; if (this.t > 0) return; this.t = 0.4;
    this.ensure();
    const P = G.player; if (!P) return;
    this.reveal(P.x, P.y, P.mounted ? 5.5 : 4.5);
    const town = World.townAt(P.x, P.y);
    if (town && !G.world.discovered.includes(town.name)) {
      G.world.discovered.push(town.name);
      UI.notify(`Discovered ${town.name}.`, 'good'); Sound.play('bell', P.x, P.y, 0.5); Progress.add(25);
    }
    const wp = G.world.waypoint;
    if (wp && dist(P.x, P.y, wp.x, wp.y) < 48) { G.world.waypoint = null; UI.notify('Waypoint reached.', 'info'); }
  },
  /* a W/8 × H/8 canvas: parchment where unexplored, clear where seen */
  fogCanvas() {
    this.ensure();
    if (!this.fog || this.fog.width !== this.CW) { this.fog = document.createElement('canvas'); this.fog.width = this.CW; this.fog.height = this.CHh; this.dirty = true; }
    if (this.dirty) {
      const g = this.fog.getContext('2d'), img = g.createImageData(this.CW, this.CHh), e = G.world.explored;
      for (let i = 0; i < e.length; i++) { const o = i * 4; img.data[o] = 214; img.data[o + 1] = 196; img.data[o + 2] = 156; img.data[o + 3] = e[i] ? 0 : 242; }
      g.putImageData(img, 0, 0); this.dirty = false;
    }
    return this.fog;
  },
  setWaypoint(x, y) {
    if (x < 0 || y < 0 || x >= World.W * TS || y >= World.H * TS) return;
    G.world.waypoint = { x, y }; Sound.play('click', G.player.x, G.player.y, 0.6);
  },
  clearWaypoint() { G.world.waypoint = null; }
};

function markerColor(m) { return m.kind === 'waypoint' ? '#c890ff' : m.kind === 'giver' ? '#ffcf40' : m.kind === 'stranger' ? '#8ad0ff' : '#f8e050'; }

/* every marker the HUD, minimap and map should show */
function allMarkers() {
  const out = MissionSys.markers().concat(Bounties.markers(), Events.markers());
  const wp = G.world && G.world.waypoint;
  if (wp) out.push({ x: wp.x, y: wp.y, kind: 'waypoint', label: 'Waypoint' });
  return out;
}
