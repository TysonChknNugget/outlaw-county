/* Outlaw County — wild.js (v2.10)
 * Honest work out in the wild: trapping, logging, herb gathering (and
 * brewing tonics at a campfire), the wildlife journal, historic treasure
 * maps, wild horse wrangling for the army, and guiding travelers.
 */
'use strict';

Object.assign(ITEMS, {
  trap: { name: 'Steel Trap', type: 'tool', price: 6, sell: 2, desc: 'Set it by water or in the woods (E). Check back in a few hours.' },
  axe: { name: 'Felling Axe', type: 'tool', price: 14, sell: 5, desc: 'Chop down trees (E). Sell the logs at a sawmill or general store.' },
  log: { name: 'Timber Log', type: 'timber', sell: 3, desc: 'The Kings River Sawmill in Kingsport pays double.' },
  pelt_beaver: { name: 'Beaver Pelt', type: 'pelt', sell: 12, desc: 'Prized by Kingsport hatters.' },
  pelt_fox: { name: 'Red Fox Pelt', type: 'pelt', sell: 11, desc: 'Bright and soft.' },
  pelt_mink: { name: 'Mink Pelt', type: 'pelt', sell: 16, desc: 'Small, glossy and valuable.' },
  pelt_wolf: { name: 'Wolf Pelt', type: 'pelt', sell: 20, desc: 'Thick grey fur.' },
  pelt_ermine: { name: 'Ermine Pelt', type: 'pelt', sell: 22, desc: 'Snow-white winter coat.' },
  pelt_silverfox: { name: 'Silver Fox Pelt', type: 'pelt', sell: 45, desc: 'Rare. Furriers fight over these.' },
  herb_sage: { name: 'Desert Sage', type: 'herb', sell: 2, desc: 'Grows on sand and scrub.' },
  herb_yarrow: { name: 'Yarrow', type: 'herb', sell: 3, desc: 'Prairie flower that stops bleeding.' },
  herb_mint: { name: 'Wild Mint', type: 'herb', sell: 3, desc: 'Grows beside water.' },
  herb_marigold: { name: 'Desert Marigold', type: 'herb', sell: 4, desc: 'Bright yellow, among the red rocks.' },
  herb_arnica: { name: 'Mountain Arnica', type: 'herb', sell: 6, desc: 'Only in the snowy high country.' },
  herb_ginseng: { name: 'Wild Ginseng', type: 'herb', sell: 8, desc: 'A precious root of the eastern woods.' },
  tonic_heal: { name: 'Healing Draught', type: 'use', price: 0, sell: 10, heal: 60, desc: 'Restores 60 health.' },
  tonic_wake: { name: 'Mint Pick-Me-Up', type: 'use', price: 0, sell: 8, heal: 15, stamina: 100, desc: 'Restores 15 health and all stamina.' },
  tonic_nerve: { name: 'Arnica Balm', type: 'use', price: 0, sell: 12, heal: 35, stamina: 100, desc: 'Restores 35 health and all stamina.' }
});
ITEM_ORDER.push('trap', 'axe', 'log', 'pelt_beaver', 'pelt_fox', 'pelt_mink', 'pelt_wolf', 'pelt_ermine', 'pelt_silverfox', 'herb_sage', 'herb_yarrow', 'herb_mint', 'herb_marigold', 'herb_arnica', 'herb_ginseng', 'tonic_heal', 'tonic_wake', 'tonic_nerve');
SHOP_STOCK.general.buy.push('trap', 'axe');
SHOP_STOCK.general.sells.push('herb', 'timber');
if (SHOP_STOCK.trapper) SHOP_STOCK.trapper.buy.push('trap');

const HERBS = { sage: [T.SAND, T.SCRUB], yarrow: [T.PRAIRIE, T.GRASS], mint: [], marigold: [T.CLAY, T.CANYON, T.DRYBED], arnica: [T.SNOW, T.SNOWFOREST], ginseng: [T.FOREST] };
const HERB_COL = { sage: '#9aa88a', yarrow: '#f0ece0', mint: '#4aa04a', marigold: '#f0c020', arnica: '#f8d040', ginseng: '#c83a2a' };
const RECIPES = [['tonic_heal', { herb_yarrow: 2, herb_sage: 1 }], ['tonic_wake', { herb_mint: 2, herb_ginseng: 1 }], ['tonic_nerve', { herb_arnica: 2, herb_marigold: 1 }]];
const JOURNAL = ['rabbit', 'coyote', 'deer', 'elk', 'cougar', 'bear', 'cow', 'horse'].concat(typeof FISH !== 'undefined' ? Object.keys(FISH).map(k => 'fish:' + k) : []);
const HISTORIC = [
  { id: 'seahawk', name: "The Sea Hawk's Chest", price: 40, pay: 260, at: () => [Math.floor(World.kpCoastX ? World.kpCoastX(700) : 1700) - 2, 700], riddle: 'The brig Sea Hawk broke up south of Gull Harbor. Her captain buried the strongbox in the dunes, a short walk down the beach from the village.' },
  { id: 'mission', name: 'Mission Bells of San Isidro', price: 50, pay: 320, at: () => [302, 1262], riddle: 'When the presidio fell, the padres hid the silver bells outside its eastern wall, among the first scrub past the gate.' },
  { id: 'motherlode', name: 'The Silver Crown Mother Lode', price: 35, pay: 220, at: () => [585, 80], riddle: 'Old Ezekiel struck it rich east of the Silver Crown workings, then buried his nuggets on the mountainside above the camp.' },
  { id: 'cavalry', name: 'Payroll of the 5th Cavalry', price: 45, pay: 280, at: () => [440, 360], riddle: 'Raiders took the payroll wagon a day out of Fort Granger and cached the coin southeast of the fort, in sight of its walls.' },
  { id: 'rourke', name: "Black Jack Rourke's Hoard", price: 60, pay: 380, at: () => [1712, 136], riddle: 'The pirate Rourke kept a light to guide him home. His last chest lies at the foot of the Harbor Point lighthouse.' },
  { id: 'sundisk', name: 'The Sun Disk of the Sierra', price: 55, pay: 340, at: () => [1050, 1232], riddle: 'Below Real de Plata, where the mule road leaves the town going south, the old ones buried a disk of gold.' }
];

const Wild = {
  nodes: null, trees: null,
  w() { const w = G.world; w.traps = w.traps || []; w.felled = w.felled || {}; w.herbsPicked = w.herbsPicked || {}; w.journal = w.journal || {}; w.hmaps = w.hmaps || {}; return w; },

  /* ---------------- herbs: fixed spots generated once per world */
  herbNodes() {
    if (this.nodes) return this.nodes;
    const rng = mulberry32(777), out = [];
    for (let i = 0; i < 9000 && out.length < 900; i++) {
      const tx = 4 + Math.floor(rng() * (World.W - 8)), ty = 4 + Math.floor(rng() * (World.H - 8)), t = World.tile(tx, ty);
      if (World.reserved[ty * World.W + tx] || (World.sol(tx, ty) & SOL.MOVE)) continue;
      let k = null;
      const wet = [[3, 0], [-3, 0], [0, 3], [0, -3]].some(([dx, dy]) => World.tile(tx + dx, ty + dy) === T.WATER);
      if (wet && (t === T.GRASS || t === T.PRAIRIE)) k = 'mint';
      else if (t === T.FOREST) k = tx > 1280 || rng() < 0.35 ? 'ginseng' : null;
      else for (const [h, ts] of Object.entries(HERBS)) if (ts.includes(t)) { k = h; break; }
      if (k) out.push({ i: out.length, k, x: tx * TS + 8, y: ty * TS + 10 });
    }
    return (this.nodes = out);
  },
  herbReady(n) { const t = this.w().herbsPicked[n.i]; return !t || G.time - t > 1440; },

  /* ---------------- trees */
  treeList() { if (!this.trees) this.trees = World.props.map((p, i) => ({ p, i })).filter(o => o.p.t === 'pine' || o.p.t === 'oak' || o.p.t === 'snowpine'); return this.trees; },
  fell(o, felled = true) {
    const p = o.p, def = PROP_DEFS[p.t];
    p.felled = felled;
    if (felled) World.solid[World.idx(p.tx, p.ty)] &= ~def.sol; else World.solid[World.idx(p.tx, p.ty)] |= def.sol;
  },
  applyFelled() {
    const w = this.w();
    for (const o of this.treeList()) { const t = w.felled[o.i]; const down = t !== undefined && G.time - t < 3 * 1440; if (!down && t !== undefined) delete w.felled[o.i]; if (!!o.p.felled !== down) this.fell(o, down); }
  },
  chop(o) {
    const P = G.player;
    if ((P.inv.log || 0) >= (P.mounted ? 20 : 10)) { UI.notify(`You can't carry more than ${P.mounted ? 20 : 10} logs. Sell some first.`, 'info'); return; }
    Interact.begin('Chopping', 3.2, () => {
      this.w().felled[o.i] = G.time; this.fell(o, true); Sound.play('punch', P.x, P.y, 0.7);
      P.inv.log = (P.inv.log || 0) + (o.p.t === 'oak' ? 2 : 1);
      const j = Honest.job('logger'); j.xp += 4; j.done++;
      G.stats.hwLogs = (G.stats.hwLogs || 0) + (o.p.t === 'oak' ? 2 : 1);
      Floaters.add(P.x, P.y - 24, `+${o.p.t === 'oak' ? 2 : 1} log`, '#e8d0a0');
    }, { sound: 'dig', range: 30 });
  },
  sellLogs(rate, where) {
    const P = G.player, n = P.inv.log || 0; if (!n) return;
    P.inv.log = 0; Honest.reward('logger', n * rate, n, `${where} buys ${n} log${n > 1 ? 's' : ''} for $${Math.round(n * rate * Honest.mult('logger'))}.`);
  },

  /* ---------------- traps */
  trapCatch(tr) {
    const tx = Math.floor(tr.x / TS), ty = Math.floor(tr.y / TS), t = World.tile(tx, ty);
    const wet = [[3, 0], [-3, 0], [0, 3], [0, -3], [5, 0], [-5, 0]].some(([dx, dy]) => { const u = World.tile(tx + dx, ty + dy); return u === T.WATER || u === T.SHALLOW; });
    const roll = pool => { let n = Math.random() * pool.reduce((a, b) => a + b[1], 0); for (const [k, w] of pool) if ((n -= w) <= 0) return k; return pool[0][0]; };
    if (chance(0.08)) return 'bear';
    if (wet) return roll([['pelt_beaver', 45], ['pelt_mink', 30], ['pelt_rabbit', 20], ['pelt_silverfox', 5]]);
    if (t === T.SNOW || t === T.SNOWFOREST) return roll([['pelt_ermine', 40], ['pelt_wolf', 30], ['pelt_fox', 25], ['pelt_silverfox', 5]]);
    if (t === T.FOREST) return roll([['pelt_fox', 40], ['pelt_rabbit', 25], ['pelt_wolf', 25], ['pelt_silverfox', 6], ['pelt_coyote', 4]]);
    return roll([['pelt_rabbit', 45], ['pelt_coyote', 30], ['pelt_fox', 22], ['pelt_silverfox', 3]]);
  },
  checkTrap(tr) {
    const P = G.player, w = this.w(), k = tr.catch || (tr.catch = this.trapCatch(tr));
    w.traps = w.traps.filter(x => x !== tr);
    if (k === 'bear') { UI.notify('A bear got here first. The trap is mangled and empty.', 'warn'); return; }
    P.inv.trap = (P.inv.trap || 0) + 1; P.inv[k] = (P.inv[k] || 0) + 1;
    const j = Honest.job('trapper'); j.xp += 8; j.done++; G.stats.hwTrapped = (G.stats.hwTrapped || 0) + 1;
    Sound.play('pickup'); UI.notify(`Your trap caught something: ${ITEMS[k].name}.${k === 'pelt_silverfox' ? ' A rare one!' : ''}`, 'good');
  },

  /* ---------------- journal */
  record(kind) {
    const w = this.w(), key = JOURNAL.includes(kind) ? kind : null; if (!key || w.journal[key]) return;
    w.journal[key] = G.time; const n = Object.keys(w.journal).length;
    const j = Honest.job('naturalist'); j.xp += 15; j.done++;
    const label = key.startsWith('fish:') ? (FISH[key.slice(5)] || {}).name : key;
    UI.notify(`Wildlife journal: ${label} recorded (${n}/${JOURNAL.length}).`, 'good'); Sound.play('pickup');
    if (n % 5 === 0) Honest.reward('naturalist', 25, 10, `A naturalist society pays $${Math.round(25 * Honest.mult('naturalist'))} for your notes (${n} entries).`);
    if (n === JOURNAL.length) { Honest.reward('naturalist', 500, 50, 'Your journal is complete! The Kingsport museum buys it for $500.'); Ach.event && Ach.event('naturalist'); }
  },

  /* ---------------- historic treasure maps */
  mapSpot(h) { if (!h.pos) { const [x, y] = h.at(); const sp = World.findOpen(x * TS + 8, y * TS + 8, 14) || { x: x * TS + 8, y: y * TS + 8 }; h.pos = sp; } return h.pos; },
  dealer: null,
  ensureDealer() {
    const L = World.kpLandmarks; if (!L || !L.kp_herald) return;
    if (this.dealer && !this.dealer.dead && G.actors.includes(this.dealer)) return;
    const b = L.kp_herald, x = (b.x + b.w + 1) * TS, y = (b.y + b.h + 1) * TS + 8;
    this.dealer = spawnActor('civilian', x, y, { name: 'Professor Barnaby Finch', post: { x, y, face: Math.PI / 2 }, home: { x, y }, invuln: true, cash: 0, town: 'Downtown Kingsport', pal: Object.assign({}, CIV_PALS[0], { coat: '#4a3a2a', hatType: 'top', hat: '#1a1a1a', shirt: '#e8e0d0' }) });
    this.dealer.kpRole = 'mapdealer';
  },
  mapShop() {
    const P = G.player, w = this.w();
    const list = HISTORIC.filter(h => !w.hmaps[h.id]);
    if (!list.length) { UI.notify('Professor Finch: "You\'ve bought every map I own, my friend."', 'info'); return; }
    UI.dialogue([{ who: this.dealer.name, text: 'Genuine historic charts, every one! No marks, mind you. You read the old words and find the spot yourself. Whatever you dig up is yours, all perfectly legal.' }], null,
      { choices: list.map(h => ({ label: `${h.name} ($${h.price})`, value: h })).concat([{ label: 'Just browsing', value: null }]), onChoose: h => {
        if (!h) return; if (P.money < h.price) { UI.notify(`You need $${h.price}.`, 'warn'); return; }
        P.money -= h.price; w.hmaps[h.id] = 'owned'; Sound.play('buy');
        setTimeout(() => UI.dialogue([{ who: h.name, text: h.riddle + '\n\n(A rough circle on your map shows the area. Dig with E when you find the spot.)' }]), 200);
      } });
  },
  hintMarker(h) { const p = this.mapSpot(h); const a = hash2(h.price, h.pay) * TAU, r = 10 * TS; return { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r, kind: 'stranger', label: h.name }; },

  /* ---------------- wild horses for the army */
  buyers() { return G.actors.filter(a => !a.dead && (a.shopId === 'fg_stables' || a.shopId === 'kp_police')); },
  sellHorse(buyer) {
    const P = G.player, h = P.horse; if (!h) return;
    const price = Math.round(((HORSE_BREEDS[h.breed] || {}).price || 80) * 0.8 + 50);
    UI.dialogue([{ who: buyer.name, text: `${buyer.shopId === 'kp_police' ? 'The mounted police' : 'The army'} needs broken horses. I'll give $${Math.round(price * Honest.mult('wrangler'))} for ${h.name}. Bring me three this season and there's a bonus.` }], null,
      { choices: [{ label: `Sell ${h.name}`, value: true }, { label: 'Keep him', value: false }], onChoose: v => {
        if (!v) return;
        if (P.mounted === h) P.dismount(false);
        h.dead = true; h.deadT = 999; h.owner = 'law'; G.horses = G.horses.filter(x => x !== h); P.horse = null;
        Honest.reward('wrangler', price, 20, null);
        const w = this.w(); w.wrangled = (w.wrangled || 0) + 1; G.stats.hwHorses = (G.stats.hwHorses || 0) + 1;
        if (w.wrangled % 3 === 0) Honest.reward('wrangler', 75, 10, 'Contract filled: a $75 bonus for three good horses.');
      } });
  },

  /* ---------------- guiding travelers */
  guideOffer(clerk) {
    const P = G.player;
    if (MissionSys.active) { UI.notify('Finish what you are doing first.', 'info'); return; }
    const dests = World.towns.filter(t => !t.district && t.name !== World.townAt(P.x, P.y)?.name && (t.pop || t.kingsport)).map(t => ({ t, d: dist((t.x0 + t.x1) / 2 * TS, (t.y0 + t.y1) / 2 * TS, P.x, P.y) })).filter(o => o.d > 120 * TS && o.d < 520 * TS).sort(() => Math.random() - 0.5).slice(0, 3);
    if (!dests.length) { UI.notify('Nobody needs a guide today.', 'info'); return; }
    const party = pick([['settlers', 'A family of settlers'], ['hunters', 'A pair of Eastern hunters'], ['surveyors', 'Railroad surveyors']]);
    UI.dialogue([{ who: clerk.name, text: `${party[1]} are looking for a guide. They pay when everyone arrives safe.` }], null,
      { choices: dests.map(o => ({ label: `${o.t.name}: $${Math.round(30 + o.d / TS * 0.12)}`, value: o })).concat([{ label: 'Not now', value: null }]), onChoose: o => { if (o) this.startGuide(o.t, o.d, party[0]); } });
  },
  startGuide(town, d, kind) {
    const P = G.player, n = kind === 'settlers' ? 3 : 2, clients = [];
    const dest = { x: (town.x0 + town.x1) / 2 * TS, y: (town.y0 + town.y1) / 2 * TS };
    for (let i = 0; i < n; i++) {
      const sp = World.randomOpenNear(P.x, P.y, 16, 50) || P;
      const pal = Object.assign({}, pick(CIV_PALS), Looks.face(), kind === 'surveyors' ? { hatType: 'bowler', coat: '#4a4a3a' } : kind === 'hunters' ? { hatType: 'flat', coat: '#5a4a2a', vest: '#3a5a2a' } : {});
      const a = spawnActor('gang', sp.x, sp.y, { name: pick(FIRST) + ' ' + pick(LAST), pal, weapon: kind === 'hunters' ? 'lever' : null, hp: 70, temp: true });
      a.follow = true; a.crew = true; a.guided = true; a.ownHorse = new Horse(pick(['morgan', 'mustang', 'mule']), a.x, a.y, { owner: 'law' });
      clients.push(a);
    }
    const id = 'guide_' + Date.now() % 100000, pay = 30 + d / TS * 0.12;
    const m = { id, title: `Guide travelers to ${town.name}`, giverName: 'Hotel clerk', side: true, reward: 0 };
    m.stages = [{
      text: () => `Lead the ${kind} safely to ${town.name}. (${clients.filter(a => !a.dead).length}/${n} with you)`,
      marker: () => ({ x: dest.x, y: dest.y - 24, label: town.name }),
      enter: dd => { dd.trouble = false; },
      fail: () => clients.some(a => a.dead) ? 'One of your travelers was killed. The rest want their money back.' : null,
      done: dd => {
        if (!dd.trouble && dd.st > 25 && chance(0.003)) { dd.trouble = true; UI.notify('Trouble on the trail! Protect your travelers.', 'warn'); Story.ring({ x: P.x, y: P.y }, randi(2, 3), 'rattler', 240, 340, { name: 'Road Agent', encounter: true }); }
        return nearPlayer(dest.x, dest.y, 140) && clients.every(a => dist(a.x, a.y, dest.x, dest.y) < 360);
      }
    }];
    const done = () => { for (const a of clients) { a.follow = false; a.crew = false; setTimeout(() => { a.removeMe = true; }, 4000); } };
    m.onComplete = () => { done(); Honest.reward('guide', pay, 18, `The ${kind} pay you $${Math.round(pay * Honest.mult('guide'))} and thank you for the safe trip.`); G.stats.hwGuide = (G.stats.hwGuide || 0) + 1; MissionSys.list = MissionSys.list.filter(x => x !== m); MissionSys.completed = MissionSys.completed.filter(x => x !== m.id); G.stats.missions = Math.max(0, G.stats.missions - 1); };
    m.cleanup = () => { done(); MissionSys.list = MissionSys.list.filter(x => x !== m); };
    MissionSys.list.push(m); MissionSys.start(id);
    UI.notify(`Your ${kind} mount up and fall in behind you. Head for ${town.name}.`, 'mission');
  },

  /* ---------------- interactions */
  interactions() {
    const P = G.player, out = [], w = this.w(); if (!P || P.dead || Honest.busy()) return out;
    const near = (x, y, r) => dist(P.x, P.y, x, y) < r;
    const town = World.townAt(P.x, P.y);
    // traps
    for (const tr of w.traps) if (near(tr.x, tr.y, 26)) {
      const ready = G.time - tr.t > 180;
      out.push({ label: ready ? 'Check the trap' : `Trap set (${Math.ceil((180 - (G.time - tr.t)) / 60)}h to go)`, x: tr.x, y: tr.y, r: 26, priority: 3, act: () => { if (ready) this.checkTrap(tr); else { w.traps = w.traps.filter(x => x !== tr); P.inv.trap = (P.inv.trap || 0) + 1; UI.notify('You pick the trap back up.', 'info'); } } });
    }
    if (!P.mounted && P.inv.trap && !town && w.traps.length < 6 && !w.traps.some(tr => near(tr.x, tr.y, 60))) {
      const t = World.tileAtPx(P.x, P.y);
      if ([T.GRASS, T.PRAIRIE, T.FOREST, T.SNOWFOREST, T.SNOW, T.SCRUB].includes(t)) out.push({ label: `Set a trap (${P.inv.trap} left)`, x: P.x, y: P.y, r: 999, priority: -60, act: () => { P.inv.trap--; w.traps.push({ x: P.x, y: P.y + 4, t: G.time }); Sound.play('click'); UI.notify('Trap set. Come back in a few hours.', 'info'); } });
    }
    // trees
    if (P.inv.axe && !P.mounted) for (const o of this.treeList()) { const p = o.p; if (!p.felled && Math.abs(p.x - P.x) < 18 && p.y - P.y < 20 && p.y - P.y > -14) { out.push({ label: 'Chop down the tree', x: p.x, y: p.y, r: 30, priority: -10, act: () => this.chop(o) }); break; } }
    // selling timber
    if (P.inv.log) {
      const mill = World.buildings.find(b => b.sign === 'SAWMILL');
      if (mill && near(mill.door.x * TS + 8, (mill.door.y + 1) * TS + 8, 50)) out.push({ label: `Sell ${P.inv.log} logs to the sawmill`, x: mill.door.x * TS + 8, y: (mill.door.y + 1) * TS, r: 50, priority: 6, act: () => this.sellLogs(6, 'The Kings River Sawmill') });
      if (World.regionAt(P.x, P.y) === 'Kings River' || (P.y > 350 * TS && P.y < 400 * TS && P.x > KP.STRIP * TS && P.x < 1560 * TS && [[0, 3], [0, -3], [3, 0], [-3, 0]].some(([dx, dy]) => World.tileAtPx(P.x + dx * TS, P.y + dy * TS) === T.WATER)))
        out.push({ label: `Float ${P.inv.log} logs down to the sawmill`, x: P.x, y: P.y, r: 999, priority: 2, act: () => this.sellLogs(7.5, 'Floated downriver, the sawmill') });
    }
    // herbs
    if (!P.mounted) for (const n of this.herbNodes()) if (Math.abs(n.x - P.x) < 18 && Math.abs(n.y - P.y) < 18 && this.herbReady(n)) {
      out.push({ label: `Pick ${ITEMS['herb_' + n.k].name}`, x: n.x, y: n.y, r: 20, priority: 1, act: () => { w.herbsPicked[n.i] = G.time; P.inv['herb_' + n.k] = (P.inv['herb_' + n.k] || 0) + 1; const j = Honest.job('herbs'); j.xp += 3; j.done++; G.stats.hwHerbs = (G.stats.hwHerbs || 0) + 1; Sound.play('pickup'); Floaters.add(P.x, P.y - 22, '+1 ' + ITEMS['herb_' + n.k].name, '#c8e0a0'); } });
      break;
    }
    // tonics at any campfire
    const fire = World.props.find(p => p.t === 'campfire' && Math.abs(p.x - P.x) < 40 && Math.abs(p.y - P.y) < 40);
    if (fire && RECIPES.some(([, need]) => Object.entries(need).every(([k, n]) => (P.inv[k] || 0) >= n))) out.push({ label: 'Brew tonics', x: fire.x, y: fire.y, r: 40, priority: 2, act: () => this.brew() });
    // the journal: study animals up close
    if (!P.mounted) for (const an of G.animals) if (!an.dead && !w.journal[an.kind] && JOURNAL.includes(an.kind) && near(an.x, an.y, 110)) { out.push({ label: `Sketch the ${an.kind} for your journal`, x: P.x, y: P.y, r: 999, priority: -40, act: () => Interact.begin('Sketching', 2.5, () => { if (!an.dead && dist(an.x, an.y, P.x, P.y) < 180) this.record(an.kind); else UI.notify('It got away before you finished.', 'info'); }, { range: 40 }) }); break; }
    for (const h of G.horses) if (!h.dead && h.owner === 'wild' && !w.journal.horse && near(h.x, h.y, 120) && !P.mounted) { out.push({ label: 'Sketch the wild horses for your journal', x: P.x, y: P.y, r: 999, priority: -40, act: () => Interact.begin('Sketching', 2.5, () => this.record('horse'), { range: 40 }) }); break; }
    // historic maps
    if (this.dealer && !this.dealer.dead && near(this.dealer.x, this.dealer.y, 36)) out.push({ label: 'Browse old treasure maps', x: this.dealer.x, y: this.dealer.y + 4, r: 36, priority: 4, act: () => this.mapShop() });
    for (const h of HISTORIC) if (w.hmaps[h.id] === 'owned') { const p = this.mapSpot(h); if (near(p.x, p.y, 34)) out.push({ label: `Dig for ${h.name}`, x: p.x, y: p.y, r: 34, priority: 7, act: () => Interact.begin('Digging', 4, () => { w.hmaps[h.id] = 'found'; Honest.reward('maps', h.pay, 40, `You unearth ${h.name}! It's worth $${Math.round(h.pay * Honest.mult('maps'))}.`); G.stats.hwMaps = (G.stats.hwMaps || 0) + 1; FX.dust && FX.dust(p.x, p.y, 6); }, { sound: 'dig', range: 30 }) }); }
    // wild horses to the army
    if (P.horse && P.horse.wildCaught && !P.horse.dead && P.horse.breed !== 'ghost') for (const b of this.buyers()) if (near(b.x, b.y, 60) && dist(P.horse.x, P.horse.y, b.x, b.y) < 200) out.push({ label: `Sell ${P.horse.name} to the ${b.shopId === 'kp_police' ? 'mounted police' : 'army'}`, x: b.x, y: b.y + 4, r: 60, priority: 3, act: () => this.sellHorse(b) });
    // guiding
    if (!MissionSys.active) for (const c of Honest.clerks('hotel')) if (Honest.near(c, 40)) out.push({ label: 'Guide travelers', x: c.x, y: c.y + 4, r: 40, priority: -5, act: () => this.guideOffer(c) });
    return out;
  },
  brew() {
    const P = G.player, can = RECIPES.filter(([, need]) => Object.entries(need).every(([k, n]) => (P.inv[k] || 0) >= n));
    UI.dialogue([{ who: 'Campfire', text: 'You set a pot over the fire. What will you brew?' }], null, {
      choices: can.map(([id, need]) => ({ label: `${ITEMS[id].name} (${Object.entries(need).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(' + ')})`, value: id })).concat([{ label: 'Nothing', value: null }]), onChoose: id => {
        if (!id) return; const need = RECIPES.find(r => r[0] === id)[1];
        for (const [k, n] of Object.entries(need)) P.inv[k] -= n;
        P.inv[id] = (P.inv[id] || 0) + 1; const j = Honest.job('herbs'); j.xp += 6; Sound.play('pickup'); UI.notify(`You brew a ${ITEMS[id].name}.`, 'good');
      } });
  },

  drawGround(ctx) {
    const c = G.cam, x0 = c.x - 20, x1 = c.x + Game.vw + 20, y0 = c.y - 20, y1 = c.y + Game.vh + 30, R = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    for (const n of this.herbNodes()) {
      if (n.x < x0 || n.x > x1 || n.y < y0 || n.y > y1 || !this.herbReady(n)) continue;
      R('#3a6a2a', n.x - 1, n.y - 6, 2, 6); R('#4a8a3a', n.x - 4, n.y - 4, 3, 2); R('#4a8a3a', n.x + 1, n.y - 5, 3, 2); R(HERB_COL[n.k], n.x - 1, n.y - 8, 3, 3);
    }
    for (const tr of this.w().traps) {
      if (tr.x < x0 || tr.x > x1 || tr.y < y0 || tr.y > y1) continue;
      R('#5a5a5e', tr.x - 5, tr.y - 2, 10, 3); R('#8a8a90', tr.x - 5, tr.y - 2, 10, 1); R('#3a3a3e', tr.x - 1, tr.y - 4, 2, 2);
      if (G.time - tr.t > 180) { R('#8a6a4a', tr.x - 6, tr.y - 6, 9, 4); R('#6a4a2a', tr.x + 2, tr.y - 7, 3, 3); }
    }
  }
};

/* felled trees draw as stumps */
(function () {
  const prop = Sprites.prop.bind(Sprites);
  Sprites.prop = function (ctx, p, time, night) {
    if (!p.felled) return prop(ctx, p, time, night);
    const x = Math.round(p.x), y = Math.round(p.y);
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 3, y - 4, 6, 4); ctx.fillStyle = '#c8a070'; ctx.fillRect(x - 3, y - 5, 6, 2); ctx.fillStyle = '#8a6a40'; ctx.fillRect(x - 1, y - 5, 2, 1);
  };
  // remember which horses you broke yourself
  const mount = Player.prototype.mount;
  Player.prototype.mount = function (h) { const wild = h && h.owner === 'wild'; mount.call(this, h); if (wild && h.owner === 'player') h.wildCaught = true; };
  // fish you land go in the journal
  if (typeof Fishing !== 'undefined') { const land = Fishing.land.bind(Fishing); Fishing.land = function (s, ok) { land(s, ok); if (ok) Wild.record('fish:' + s.kind); }; }
  // treasure-map hints on the map
  const base = allMarkers;
  allMarkers = function () { const out = base(); const w = G.world; if (w && w.hmaps) for (const h of HISTORIC) if (w.hmaps[h.id] === 'owned') out.push(Wild.hintMarker(h)); return out; };
})();

/* ---------------------------------------------------------------- the Honest Work page in the saddlebags */
(function () {
  const render = UI.renderInventory.bind(UI);
  UI.renderInventory = function () {
    render();
    const host = $('inv-items'); if (!host) return;
    let el = $('inv-honest'); if (!el) { el = document.createElement('div'); el.id = 'inv-honest'; host.after(el); }
    const d = Honest.data(), w = Wild.w();
    const rows = Object.entries(HONEST_JOBS).map(([k, n]) => { const j = d[k]; return j && j.done ? `<div class="row"><div class="r-main"><div><b>${n}</b><small>Level ${Honest.level(k)} · ${j.done} done · $${j.earned} earned</small></div></div></div>` : ''; }).join('');
    const jn = Object.keys(w.journal).length, maps = HISTORIC.filter(h => w.hmaps[h.id] === 'owned');
    el.innerHTML = `<h3>Honest Work</h3><div class="list">${rows || '<div class="muted small">Tend bar, work a forge, carry the mail, trap, chop timber, pick herbs... ask around town.</div>'}</div>` +
      `<h3>Wildlife Journal</h3><div class="muted small">${jn}/${JOURNAL.length} recorded. Sketch animals up close (E), photograph them, or land a fish. Missing: ${JOURNAL.filter(k => !w.journal[k]).map(k => k.startsWith('fish:') ? FISH[k.slice(5)].name : k).slice(0, 8).join(', ') || 'nothing!'}</div>` +
      (maps.length ? `<h3>Old Maps</h3>${maps.map(h => `<p class="small"><b>${h.name}:</b> ${h.riddle}</p>`).join('')}` : '');
  };
})();

if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
  { id: 'hw_bar', name: 'Barkeep', desc: 'Tend bar for 5 shifts.', icon: '♨', prog: () => [G.stats.hwBar || 0, 5] },
  { id: 'hw_smith', name: 'Village Smithy', desc: 'Finish 10 jobs at the forge.', icon: '⚒', prog: () => [G.stats.hwSmith || 0, 10] },
  { id: 'hw_doc', name: 'Doc', desc: 'Treat 5 patients.', icon: '✚', prog: () => [G.stats.hwDoc || 0, 5] },
  { id: 'hw_wire', name: 'Sparky', desc: 'Work 5 shifts on the telegraph.', icon: '⚡', prog: () => [G.stats.hwWire || 0, 5] },
  { id: 'hw_photo', name: 'Scoop', desc: 'Sell 3 photographs to the Herald.', icon: '◉', prog: () => [G.stats.hwPhoto || 0, 3] },
  { id: 'hw_graves', name: 'Six Feet Under', desc: 'Bury 5 bodies.', icon: '✝', prog: () => [G.stats.hwGraves || 0, 5] },
  { id: 'pianist', name: 'Ivory Tickler', desc: 'Score 90% or better at a saloon piano.', icon: '♫', ev: 'pianist' },
  { id: 'hw_mail', name: 'Postmaster', desc: 'Deliver 5 mail bags.', icon: '✉', prog: () => [G.stats.hwMail || 0, 5] },
  { id: 'hw_trap', name: 'Trapper', desc: 'Collect 10 pelts from your traps.', icon: '⚙', prog: () => [G.stats.hwTrapped || 0, 10] },
  { id: 'hw_logs', name: 'Lumberjack', desc: 'Cut 25 logs.', icon: '♣', prog: () => [G.stats.hwLogs || 0, 25] },
  { id: 'hw_herbs', name: 'Herbalist', desc: 'Pick 20 herbs.', icon: '❦', prog: () => [G.stats.hwHerbs || 0, 20] },
  { id: 'naturalist', name: 'Naturalist', desc: 'Complete the wildlife journal.', icon: '✎', ev: 'naturalist' },
  { id: 'hw_maps', name: 'Historian', desc: 'Dig up 3 historic treasures.', icon: '✕', prog: () => [G.stats.hwMaps || 0, 3] },
  { id: 'hw_horses', name: 'Wrangler', desc: 'Sell 3 wild horses to the army.', icon: '♞', prog: () => [G.stats.hwHorses || 0, 3] },
  { id: 'hw_guide', name: 'Trail Boss', desc: 'Guide 3 parties of travelers.', icon: '⛺', prog: () => [G.stats.hwGuide || 0, 3] }
);

Hooks.add({
  key: 'wild',
  reset: () => { Wild.trees = null; Wild.dealer = null; },
  update: () => { if (!G.player) return; if (Math.random() < 0.02) Wild.applyFelled(); if (Math.random() < 0.01) Wild.ensureDealer(); },
  interactions: () => Wild.interactions(),
  drawGround: ctx => Wild.drawGround(ctx)
});
