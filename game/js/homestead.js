/* Outlaw County — homestead.js (v2.12)
 * Your own homestead. Buy one of three plots from a land agent (Kingsport
 * City Hall, Silver Crown, San Lucero), pick a brand, then build everything
 * yourself: open the building plans at your gate, walk the outline to where
 * you want it, haul in logs, planks, nails and stone, and hammer it up stage
 * by stage. Farm fields (till, plant, water, harvest), chickens, cattle in the
 * barn, a corral for your horses, hired hands from the bunkhouse, a
 * watchtower, and rustlers who come for the herd.
 *
 * Ride Online: each player gets a house and a farm on a quarter of a plot
 * (cabin or ranch house, fields, chicken coop, well). You start and respawn
 * there, the party sees it on the map, and nobody can be hurt on their own
 * land. Friends can help hammer. Cattle, hands and raids stay single-player.
 */
'use strict';

/* ---------------------------------------------------------------- items */
Object.assign(ITEMS, {
  plank: { name: 'Planks', type: 'material', price: 3, sell: 1, desc: 'Sawn lumber for building. Saw your own logs at the Kings River Sawmill.' },
  nails: { name: 'Box of Nails', type: 'material', price: 2, sell: 1, desc: 'For building.' },
  stone: { name: 'Stone', type: 'material', sell: 1, desc: 'Chip it from rocks and boulders with a pick.' },
  hoe: { name: 'Hoe', type: 'tool', price: 8, sell: 3, desc: 'Till soil in your fields.' },
  pick: { name: 'Pick', type: 'tool', price: 10, sell: 4, desc: 'Break rocks and boulders for stone.' },
  wcan: { name: 'Watering Can', type: 'tool', price: 6, sell: 2, desc: 'Fill it at a well or any water, then water your crops.' },
  hammer: { name: "Builder's Hammer", type: 'tool', price: 5, sell: 2, desc: 'For building on your land.' },
  seed_corn: { name: 'Corn Seed', type: 'seed', price: 2, sell: 0, desc: 'Ready in 2 days.' },
  seed_beans: { name: 'Bean Seed', type: 'seed', price: 2, sell: 0, desc: 'Ready in 1 day.' },
  seed_squash: { name: 'Squash Seed', type: 'seed', price: 3, sell: 0, desc: 'Ready in a day and a half.' },
  seed_potato: { name: 'Seed Potatoes', type: 'seed', price: 2, sell: 0, desc: 'Ready in 1 day.' },
  seed_tobacco: { name: 'Tobacco Seed', type: 'seed', price: 4, sell: 0, desc: 'Ready in 3 days. Sells high.' },
  crop_corn: { name: 'Corn', type: 'produce', sell: 6, desc: 'Fresh ears of corn.' },
  crop_beans: { name: 'Beans', type: 'produce', sell: 4, desc: 'A sack of beans.' },
  crop_squash: { name: 'Squash', type: 'produce', sell: 6, desc: 'Big and orange.' },
  crop_potato: { name: 'Potatoes', type: 'produce', sell: 4, desc: 'Good eating.' },
  crop_tobacco: { name: 'Tobacco Leaf', type: 'produce', sell: 14, desc: 'Dried and bundled.' },
  egg: { name: 'Eggs', type: 'produce', sell: 2, desc: 'Fresh from your coop.' },
  meal_stew: { name: 'Ranch Stew', type: 'use', price: 0, sell: 8, heal: 80, stamina: 100, desc: 'Restores 80 health and all stamina.' },
  meal_breakfast: { name: 'Ranch Breakfast', type: 'use', price: 0, sell: 6, heal: 50, stamina: 100, desc: 'Restores 50 health and all stamina.' }
});
ITEM_ORDER.push('plank', 'nails', 'stone', 'hammer', 'hoe', 'pick', 'wcan', 'seed_corn', 'seed_beans', 'seed_squash', 'seed_potato', 'seed_tobacco', 'crop_corn', 'crop_beans', 'crop_squash', 'crop_potato', 'crop_tobacco', 'egg', 'meal_stew', 'meal_breakfast');
SHOP_STOCK.general.buy.push('plank', 'nails', 'hammer', 'hoe', 'pick', 'wcan', 'seed_corn', 'seed_beans', 'seed_squash', 'seed_potato', 'seed_tobacco');
SHOP_STOCK.general.sells.push('produce');

const PLOTS = [
  { id: 'cottonwood', name: 'Cottonwood Claim', price: 400, near: [470, 330], ground: T.GRASS, perk: 'Good grass: cattle grow faster.' },
  { id: 'kingsriver', name: 'Kings River Farm', price: 650, near: [1330, 330], ground: T.PRAIRIE, perk: 'Rich soil: crops grow faster. Close to Kingsport buyers.' },
  { id: 'riobravo', name: 'Rio Bravo Rancho', price: 500, near: [720, 815], ground: T.SCRUB, perk: 'Cheap and wild, but rustlers raid more often.' }
];
const ONLINE_PLOT_PRICE = 150;
const BRANDS = ['Lazy S', 'Bar B', 'Circle T', 'Rocking R', 'Double Diamond', 'Flying W', 'Broken Arrow', 'Lone Star'];
const HS_TYPES = {
  tent: { name: 'Tent', w: 3, h: 2, stages: 0, need: {} },
  cabin: { name: 'Cabin', w: 7, h: 5, stages: 4, need: { log: 6, plank: 20, nails: 2, stone: 4 }, wall: '#8a5a32', roof: '#5a3a22', fh: 22, desc: 'Sleep, save and respawn here.' },
  house: { name: 'Ranch House', w: 11, h: 7, stages: 8, need: { log: 10, plank: 50, nails: 6, stone: 12 }, req: 'cabin', wall: '#c8b08a', roof: '#6a3a2a', fh: 28, desc: 'Replaces the cabin. A trophy wall and a kitchen.' },
  barn: { name: 'Barn', w: 9, h: 7, stages: 5, need: { log: 8, plank: 30, nails: 4 }, sp: true, wall: '#8a2a1e', roof: '#4a2a22', fh: 32, desc: 'Keeps up to 6 cattle.' },
  corral: { name: 'Corral', w: 10, h: 7, stages: 2, need: { log: 10, nails: 2 }, sp: true, desc: 'Stable up to 4 horses.' },
  coop: { name: 'Chicken Coop', w: 4, h: 3, stages: 2, need: { log: 2, plank: 8, nails: 1 }, wall: '#a07a4a', roof: '#6a4a2a', fh: 14, desc: 'Up to 6 hens. Eggs every morning.' },
  well: { name: 'Well', w: 2, h: 2, stages: 2, need: { stone: 8, log: 1 }, desc: 'Fill your watering can.' },
  field: { name: 'Field', w: 6, h: 4, stages: 0, need: {}, max: 3, omax: 2, desc: 'Till it, plant it, water it, harvest it.' },
  bunkhouse: { name: 'Bunkhouse', w: 8, h: 5, stages: 4, need: { log: 6, plank: 24, nails: 3 }, sp: true, wall: '#7a5434', roof: '#4a3a2a', fh: 22, desc: 'Hire up to 3 ranch hands.' },
  tower: { name: 'Watchtower', w: 3, h: 3, stages: 3, need: { log: 8, plank: 10, nails: 2 }, sp: true, desc: 'Spots rustlers early and helps your guards.' }
};
const CROPS = { corn: { t: 2880, c: '#e8c840' }, beans: { t: 1440, c: '#5a9a3a' }, squash: { t: 2160, c: '#e8842a' }, potato: { t: 1440, c: '#a08050' }, tobacco: { t: 4320, c: '#7a9a3a' } };
const MATERIAL_NAMES = { log: 'logs', plank: 'planks', nails: 'boxes of nails', stone: 'stone' };

/* ---------------------------------------------------------------- the plots, laid out with the world */
Object.assign(World, {
  plotFree(x, y, w, h) {
    const bad = new Set([T.WATER, T.SHALLOW, T.ROCK, T.WALL, T.FLOOR, T.ROAD, T.BRIDGE, T.GRAVEL, T.BOARD, T.TOWN, T.COBBLE, T.PAVE, T.ICE, T.SNOW]);
    for (let ty = y - 2; ty < y + h + 3; ty++) for (let tx = x - 2; tx < x + w + 2; tx++) {
      if (!this.inb(tx, ty) || tx < 4 || ty < 4 || tx > this.W - 5 || ty > this.H - 5) return false;
      if (bad.has(this.tiles[ty * this.W + tx])) return false;
    }
    for (const t of this.towns) if (x < t.x1 + 4 && x + w > t.x0 - 4 && y < t.y1 + 4 && y + h > t.y0 - 4) return false;
    for (const b of this.buildings) if (x < b.x + b.w + 3 && x + w > b.x - 3 && y < b.y + b.h + 3 && y + h > b.y - 3) return false;
    for (const c of this.banditCamps) if (dist(c.x / TS, c.y / TS, x + w / 2, y + h / 2) < 40) return false;
    return true;
  },
  generateHomesteads() {
    this.plots = [];
    for (const d of PLOTS) {
      const W = 40, H = 30; let spot = null;
      for (let r = 0; r < 200 && !spot; r += 3) for (let a = 0; a < TAU && !spot; a += r ? 3 / r : TAU) {
        const x = Math.round(d.near[0] + Math.cos(a) * r - W / 2), y = Math.round(d.near[1] + Math.sin(a) * r - H / 2);
        if (this.plotFree(x, y, W, H)) spot = { x, y };
      }
      if (!spot) continue;
      const { x, y } = spot;
      this.props = this.props.filter(p => !(p.tx >= x - 1 && p.tx <= x + W && p.ty >= y - 1 && p.ty <= y + H));
      for (let ty = y; ty < y + H; ty++) for (let tx = x; tx < x + W; tx++) { const i = ty * this.W + tx; this.tiles[i] = d.ground; this.solid[i] = 0; }
      const gx = x + Math.floor(W / 2) - 2;
      for (let tx = x; tx < x + W; tx++) { this.addProp('fence_h', tx, y); if (tx < gx || tx > gx + 3) this.addProp('fence_h', tx, y + H - 1); }
      for (let ty = y + 1; ty < y + H - 1; ty++) { this.addProp('fence_v', x, ty); this.addProp('fence_v', x + W - 1, ty); }
      this.addProp('sign', gx - 2, y + H, { text: d.name.toUpperCase() });
      this.reserve(x - 1, y - 1, W + 2, H + 3);
      this.plots.push({ id: d.id, name: d.name, x, y, w: W, h: H, gate: { x: gx + 2, y: y + H } });
    }
  }
});

/* ---------------------------------------------------------------- the homestead */
const Homestead = {
  placing: null, applied: new Map(), appliedKey: '', agents: [], hands: [], raid: null, lastT: null, rocks: null,

  online() { return typeof Online !== 'undefined' && Online.active; },
  home() { return this.online() ? Online.homeData : (G.world && G.world.home) || null; },
  setHome(h) { if (this.online()) { Online.homeData = h; Online.saveChar(); this.syncOnline(); } else G.world.home = h; this.dirty(); },
  plot(id) { return (World.plots || []).find(p => p.id === id); },
  /* the land you own: the whole plot, or a quarter of it online */
  rect(h) {
    h = h || this.home(); if (!h) return null; const p = this.plot(h.plot); if (!p) return null;
    if (h.quad === undefined || h.quad < 0) return { x: p.x + 1, y: p.y + 1, w: p.w - 2, h: p.h - 2 };
    const qw = Math.floor((p.w - 2) / 2), qh = Math.floor((p.h - 2) / 2);
    return { x: p.x + 1 + (h.quad % 2) * qw, y: p.y + 1 + Math.floor(h.quad / 2) * qh, w: qw, h: qh };
  },
  board(h) { const r = this.rect(h); return r && { x: (r.x + Math.floor(r.w / 2)) * TS + 8, y: (r.y + r.h - 2) * TS + 8 }; },
  built(type, h) { h = h || this.home(); return h && h.structs.find(s => s.type === type && s.stage >= HS_TYPES[type].stages); },
  homeBuilding(h) { return this.built('house', h) || this.built('cabin', h); },
  doorOf(s) { return { x: (s.x + Math.floor(HS_TYPES[s.type].w / 2)) * TS + 8, y: (s.y + HS_TYPES[s.type].h) * TS + 10 }; },
  spawnPoint() { const h = this.home(), b = h && this.homeBuilding(h); return b ? this.doorOf(b) : null; },
  brandName(h) { return `${(h || this.home()).brand} Ranch`; },
  dirty() { this.appliedKey = ''; },

  /* ---------------- land agents */
  ensureAgents() {
    const spots = [];
    const L = World.kpLandmarks; if (L && L.kp_cityhall) { const b = L.kp_cityhall; spots.push(['kp', { x: (b.door.x + 3) * TS + 8, y: (b.door.y + 2) * TS }, 'Downtown Kingsport']); }
    for (const [k, town] of [['sc', 'Silver Crown'], ['sl', 'San Lucero']]) { const wp = World.townWaypoints && World.townWaypoints[town]; if (wp && wp[2]) spots.push([k, { x: wp[2].x + 20, y: wp[2].y }, town]); }
    for (const [k, p, town] of spots) {
      if (G.actors.some(a => a.landAgent === k && !a.dead)) continue;
      const sp = World.findOpen(p.x, p.y, 6) || p;
      const a = spawnActor('civilian', sp.x, sp.y, { name: { kp: 'Land Agent Pruett', sc: 'Land Agent Hobbs', sl: 'Agente Morales' }[k], post: { x: sp.x, y: sp.y, face: Math.PI / 2 }, home: sp, invuln: true, cash: 0, town, pal: Object.assign({}, CIV_PALS[0], { coat: '#3a3a2a', vest: '#6a5a3a', hatType: 'bowler', hat: '#2a2a2a', shirt: '#e8e0d0' }) });
      a.landAgent = k; a.kpRole = 'land';
    }
  },
  agentTalk(a) {
    const P = G.player, h = this.home(), on = this.online();
    if (h) {
      const p = this.plot(h.plot), choices = [{ label: 'Where is my land?', value: 'where' }];
      if (!on && this.built('barn')) choices.push({ label: `Buy a calf ($25) · ${h.cattle.length}/6 head`, value: 'calf' });
      UI.dialogue([{ who: a.name, text: `Howdy, partner. The ${this.brandName(h)} sits on ${p.name}. Building supplies are at any general store, and the sawmill in Kingsport turns your logs into planks.` }], null,
        { choices: choices.concat([{ label: 'Good day', value: null }]), onChoose: v => {
          if (v === 'where') { const b = this.board(h); G.world.waypoint = { x: b.x, y: b.y }; UI.notify(`Waypoint set to the ${this.brandName(h)}.`, 'info'); }
          if (v === 'calf') this.buyCalf();
        } });
      return;
    }
    UI.dialogue([{ who: a.name, text: on ? `Land for a homestead? I can give you a quarter of any of these claims for $${ONLINE_PLOT_PRICE}: room for a house, a farm, a coop and a well. You build it all yourself.` : 'Three claims for sale, fenced and surveyed. You get the land and a tent. Everything else, you build with your own two hands.' }], null,
      { choices: PLOTS.filter(d => this.plot(d.id)).map(d => ({ label: `${d.name}: $${on ? ONLINE_PLOT_PRICE : d.price}. ${d.perk}`, value: d })).concat([{ label: 'Just looking', value: null }]), onChoose: d => {
        if (!d) return; const price = on ? ONLINE_PLOT_PRICE : d.price;
        if (P.money < price) { UI.notify(`You need $${price}.`, 'warn'); return; }
        setTimeout(() => UI.dialogue([{ who: a.name, text: 'Every ranch needs a brand. Which one goes on your gate?' }], null, { choices: BRANDS.map(b => ({ label: b, value: b })), onChoose: brand => this.buy(d, brand || BRANDS[0], price) }), 200);
      } });
  },
  buy(d, brand, price) {
    const P = G.player, on = this.online();
    let quad = -1;
    if (on) { const used = Object.values(Online.players).filter(p => p.id !== Online.myId && p.home && p.home.plot === d.id).map(p => p.home.quad); quad = [0, 1, 2, 3].find(q => !used.includes(q)); if (quad === undefined) { UI.notify('That claim is full in this party. Pick another.', 'warn'); return; } }
    P.money -= price; Sound.play('buy');
    const h = { plot: d.id, quad, brand, structs: [], fields: {}, chickens: 0, eggs: 0, eggDay: Math.floor(G.time / 1440), cattle: [], hands: { ranch: 0, guard: 0, farmer: 0 }, raids: 0, nextRaid: G.time + 2 * 1440, can: 0, horses: [], stolen: null, seq: 1 };
    const r = this.rect(h);
    h.structs.push({ id: h.seq++, type: 'tent', x: r.x + 2, y: r.y + r.h - 5, stage: 0, have: {} });
    this.setHome(h);
    if (!P.inv.hammer) P.inv.hammer = 1;
    const b = this.board(h); G.world.waypoint = { x: b.x, y: b.y };
    UI.notify(`The ${this.brandName(h)} is yours! You get a tent and a builder's hammer. Ride out and open the building plans at your gate (waypoint set).`, 'mission');
    G.stats.hsBought = 1;
  },

  /* ---------------- building */
  count(type, h) { return (h || this.home()).structs.filter(s => s.type === type).length; },
  plans() {
    const h = this.home(), on = this.online();
    if (this.placing) { this.placing = null; UI.notify('You roll up the plans.', 'info'); return; }
    const opts = Object.entries(HS_TYPES).filter(([k, t]) => k !== 'tent' && !(on && t.sp)).filter(([k, t]) => {
      if (t.req && !this.built(t.req)) return false;
      if (k === 'cabin' && this.count('house')) return false;
      const max = on ? (t.omax || t.max || 1) : (t.max || 1); return this.count(k) < max;
    });
    UI.dialogue([{ who: 'Building plans', text: opts.length ? 'Pick something to build. Then walk the outline to where you want it and press E to stake it out.' : 'You\'ve built everything there is to build. Fine work.' }], null,
      { choices: opts.map(([k, t]) => ({ label: `${t.name}: ${Object.entries(t.need).map(([m, n]) => `${n} ${MATERIAL_NAMES[m]}`).join(', ') || 'no materials'}. ${t.desc}`, value: k })).concat([{ label: 'Close the plans', value: null }]), onChoose: k => { if (k) { this.placing = { type: k }; UI.notify(`Walk to where the ${HS_TYPES[k].name.toLowerCase()} should go, then press E. Open the plans again to cancel.`, 'tip'); } } });
  },
  ghostRect() {
    const P = G.player, t = HS_TYPES[this.placing.type];
    return { x: Math.floor(P.x / TS) - Math.floor(t.w / 2), y: Math.floor(P.y / TS) - t.h - 1, w: t.w, h: t.h };
  },
  canPlace(g) {
    const r = this.rect(); if (!r) return false;
    if (g.x < r.x || g.y < r.y || g.x + g.w > r.x + r.w || g.y + g.h > r.y + r.h) return false;
    for (const s of this.home().structs) { const t = HS_TYPES[s.type]; if (this.placing.type === 'house' && s.type === 'cabin') continue; if (g.x < s.x + t.w + 1 && g.x + g.w + 1 > s.x && g.y < s.y + t.h + 1 && g.y + g.h + 1 > s.y) return false; }
    return true;
  },
  place() {
    const h = this.home(), g = this.ghostRect(), type = this.placing.type;
    if (!this.canPlace(g)) { UI.notify('It won\'t fit there. Keep it inside your fence and clear of other buildings.', 'warn'); return; }
    h.structs.push({ id: h.seq++, type, x: g.x, y: g.y, stage: 0, have: {} });
    this.placing = null; Sound.play('dig');
    UI.notify(HS_TYPES[type].stages ? `Staked out. Bring the materials, then hammer it together.` : 'Field marked out. Till it with a hoe.', 'info');
    this.setHome(h);
  },
  missing(s) { const t = HS_TYPES[s.type]; return Object.entries(t.need).map(([m, n]) => [m, n - (s.have[m] || 0)]).filter(([, n]) => n > 0); },
  deliver(s) {
    const P = G.player; let moved = 0;
    for (const [m, n] of this.missing(s)) { const give = Math.min(n, P.inv[m] || 0); if (give) { P.inv[m] -= give; s.have[m] = (s.have[m] || 0) + give; moved += give; } }
    if (!moved) { UI.notify(`You don't have any of what's still needed: ${this.missing(s).map(([m, n]) => `${n} ${MATERIAL_NAMES[m]}`).join(', ')}.`, 'warn'); return; }
    Sound.play('pickup'); const left = this.missing(s);
    UI.notify(left.length ? `Materials dropped off. Still needed: ${left.map(([m, n]) => `${n} ${MATERIAL_NAMES[m]}`).join(', ')}.` : 'All the materials are here. Time to build!', left.length ? 'info' : 'good');
    this.setHome(this.home());
  },
  hammer(s, helpFor) {
    const t = HS_TYPES[s.type], need = (!helpFor && this.home() && this.home().hands && this.home().hands.ranch) ? 4 : 5;
    if (!G.player.inv.hammer) { UI.notify('You need a builder\'s hammer (general store).', 'warn'); return; }
    const stageNames = ['the foundation', 'the frame', 'the frame', 'the walls', 'the walls', 'the roof', 'the roof', 'the finishing touches'];
    const name = stageNames[Math.min(7, Math.floor(s.stage / t.stages * 8))];
    Mini.open({ title: `${helpFor ? `Helping ${helpFor.owner} build` : 'Building'}: ${t.name} (stage ${s.stage + 1}/${t.stages})`, hint: `Strike (Space or click) when the nail lines up with the hammer. ${need} clean strikes finishes ${name}.`,
      init: m => { m.pos = 0; m.dir = 1; m.speed = 1.1; m.hits = 0; m.swings = 0; m.say = ''; m.flash = 0; m.zone = 0.18; },
      step: (m, dt) => {
        m.pos += m.dir * m.speed * dt; if (m.pos > 1) { m.pos = 1; m.dir = -1; } if (m.pos < 0) { m.pos = 0; m.dir = 1; } m.flash = Math.max(0, m.flash - dt * 3);
        if (m.hits >= need) Mini.end(m, `You finished ${name}.`, true); else if (m.swings >= 12) Mini.end(m, 'You bent too many nails. Catch your breath and try again.', false);
      },
      key: (m, code, down) => { if (down && code === 'Space') this.strike(m); },
      mouse: (m, x, y, down) => { if (down) this.strike(m); },
      draw: (g, m, W, H) => {
        Mini.panel(g, W, H, '#6a8aa8', '#3a4a3a');
        g.fillStyle = '#5a4026'; g.fillRect(0, 230, W, 90);
        // the board and the nail
        g.fillStyle = '#b07a44'; g.fillRect(140, 170, 360, 40); g.fillStyle = '#8a5a30'; g.fillRect(140, 170, 360, 4);
        for (let i = 0; i < need; i++) { g.fillStyle = i < m.hits ? '#3a3a40' : '#8a8a90'; g.fillRect(170 + i * 70, i < m.hits ? 168 : 150, 4, i < m.hits ? 4 : 22); }
        const tx = 120, tw = W - 240; g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(tx, 70, tw, 24); g.fillStyle = 'rgba(120,220,120,.7)'; g.fillRect(tx + tw * (0.5 - m.zone / 2), 70, tw * m.zone, 24);
        g.fillStyle = '#fff'; g.fillRect(tx + tw * m.pos - 2, 64, 4, 36);
        g.fillStyle = '#6a4426'; g.fillRect(W / 2 + 40, m.flash > 0 ? 110 : 60, 8, 60); g.fillStyle = '#2a2a2e'; g.fillRect(W / 2 + 28, m.flash > 0 ? 160 : 110, 32, 14);
        Mini.text(g, `Clean strikes ${m.hits}/${need}   Swings ${m.swings}/12`, 20, 30, 15, '#fff', 'left', true); if (m.say) Mini.text(g, m.say, W / 2, 135, 15, '#ffe39a', 'center', true);
      },
      finish: m => {
        if (!m.hits || m.hits < need) return;
        if (helpFor) { Online.send({ t: 'help', to: helpFor.id, sid: s.id }); UI.notify(`You helped ${helpFor.owner} build. They'll thank you.`, 'good'); return; }
        this.advance(s);
      }
    });
  },
  strike(m) {
    if (m.done) return; m.swings++;
    if (Math.abs(m.pos - 0.5) < m.zone / 2) { m.hits++; m.say = 'BANG!'; m.flash = 1; Sound.play('punch'); m.speed += 0.12; }
    else { m.say = 'Bent nail.'; Sound.play('click'); }
  },
  advance(s, by) {
    const t = HS_TYPES[s.type], h = this.home();
    s.stage = Math.min(t.stages, s.stage + 1);
    if (s.stage >= t.stages) {
      UI.notify(`${by ? `With ${by}'s help, the` : 'The'} ${t.name.toLowerCase()} is finished!`, 'mission'); Sound.play('mission');
      if (s.type === 'house') { h.structs = h.structs.filter(x => x.type !== 'cabin'); G.stats.hsHouse = 1; }
      if (s.type === 'cabin') G.stats.hsCabin = 1;
      if (s.type === 'cabin' || s.type === 'house') h.structs = h.structs.filter(x => x.type !== 'tent');
      G.stats.hsBuilt = (G.stats.hsBuilt || 0) + 1; Progress.add(60);
    } else UI.notify(`${t.name}: stage ${s.stage}/${t.stages} done.`, 'good');
    this.setHome(h);
  },
  onHelp(m) {
    const h = this.home(); if (!h) return; const s = h.structs.find(x => x.id === m.sid);
    if (!s || s.stage >= HS_TYPES[s.type].stages || this.missing(s).length) return;
    this.advance(s, m.name);
    Online.send({ t: 'payto', to: m.from, amt: 5, msg: `${Online.players[Online.myId].name} paid you $5 for helping build.` });
  },

  /* ---------------- solid buildings */
  applySolids() {
    const h = this.home(), key = h ? JSON.stringify([h.plot, h.quad, h.structs.map(s => [s.type, s.x, s.y, s.stage])]) : '';
    if (key === this.appliedKey) return;
    for (const [i, v] of this.applied) World.solid[i] = v;
    this.applied = new Map(); this.appliedKey = key; if (!h) return;
    const set = (tx, ty, bits) => { const i = World.idx(tx, ty); if (!this.applied.has(i)) this.applied.set(i, World.solid[i]); World.solid[i] |= bits; };
    for (const s of h.structs) {
      const t = HS_TYPES[s.type]; if (!t.stages || s.stage < Math.ceil(t.stages / 2)) continue;
      if (s.type === 'corral') { for (let x = s.x; x < s.x + t.w; x++) { set(x, s.y, SOL.MOVE); if (Math.abs(x - (s.x + t.w / 2)) > 1.5) set(x, s.y + t.h - 1, SOL.MOVE); } for (let y = s.y; y < s.y + t.h; y++) { set(s.x, y, SOL.MOVE); set(s.x + t.w - 1, y, SOL.MOVE); } continue; }
      for (let y = s.y; y < s.y + t.h; y++) for (let x = s.x; x < s.x + t.w; x++) set(x, y, s.type === 'well' ? SOL.MOVE | SOL.SHOT : SOL.ALL);
    }
  },

  /* ---------------- farming */
  fieldAt(tx, ty, h) { h = h || this.home(); return h && h.structs.find(s => s.type === 'field' && tx >= s.x && tx < s.x + 6 && ty >= s.y && ty < s.y + 4); },
  growth(dtMin) {
    const h = this.home(); if (!h || dtMin <= 0) return;
    const fast = h.plot === 'kingsriver' ? 1.3 : 1, wet = Env.rain > 0.3;
    for (const f of Object.values(h.fields)) {
      if (!f.crop || f.grow >= CROPS[f.crop].t) continue;
      // only the part of the time that falls inside the 24 hours after watering counts
      const watered = wet ? dtMin : clamp(1440 - (G.time - dtMin - (f.wet === null || f.wet === undefined ? -1e9 : f.wet)), 0, dtMin);
      if (watered > 0) f.grow = Math.min(CROPS[f.crop].t, f.grow + watered * fast);
    }
  },
  fieldAct(tx, ty) {
    const P = G.player, h = this.home(), k = tx + ',' + ty, f = h.fields[k];
    if (!f) { if (!P.inv.hoe) return { label: 'Till the soil (needs a hoe)', act: () => UI.notify('Buy a hoe at a general store.', 'info') }; return { label: 'Till the soil', act: () => Interact.begin('Tilling', 1.2, () => { h.fields[k] = { tilled: true }; this.dirty(); this.save(); }, { sound: 'dig', range: 20 }) }; }
    if (!f.crop) {
      const seeds = Object.keys(CROPS).filter(c => P.inv['seed_' + c] > 0);
      if (!seeds.length) return { label: 'Plant (buy seeds at a general store)', act: () => UI.notify('You have no seeds. General stores sell them.', 'info') };
      return { label: `Plant ${ITEMS['seed_' + seeds[0]].name}${seeds.length > 1 ? ' (or choose)' : ''}`, act: () => {
        const plant = c => { P.inv['seed_' + c]--; f.crop = c; f.grow = 0; f.wet = null; Sound.play('pickup'); this.save(); };
        if (seeds.length === 1) plant(seeds[0]); else UI.dialogue([{ who: 'Planting', text: 'What will you plant here?' }], null, { choices: seeds.map(c => ({ label: `${ITEMS['seed_' + c].name} (${P.inv['seed_' + c]})`, value: c })), onChoose: c => c && plant(c) });
      } };
    }
    if (f.grow >= CROPS[f.crop].t) return { label: `Harvest the ${f.crop}`, act: () => { const n = f.crop === 'corn' || f.crop === 'potato' ? 2 : 1; P.inv['crop_' + f.crop] = (P.inv['crop_' + f.crop] || 0) + n; Floaters.add(P.x, P.y - 22, `+${n} ${ITEMS['crop_' + f.crop].name}`, '#c8e0a0'); delete h.fields[k]; h.fields[k] = { tilled: true }; G.stats.hsHarvest = (G.stats.hsHarvest || 0) + n; Sound.play('pickup'); this.save(); } };
    const dry = G.time - (f.wet || -1e9) >= 1440 && Env.rain <= 0.3;
    if (dry) return { label: h.can > 0 ? `Water the ${f.crop} (${h.can} left in the can)` : (P.inv.wcan ? 'Water (fill your can at a well or water first)' : 'Water (needs a watering can)'), act: () => { if (!P.inv.wcan) { UI.notify('Buy a watering can at a general store.', 'info'); return; } if (h.can <= 0) { UI.notify('Your watering can is empty. Fill it at your well or any water.', 'info'); return; } h.can--; f.wet = G.time; Sound.play('pickup'); this.save(); } };
    return { label: `${ITEMS['crop_' + f.crop].name}: ${Math.round(f.grow / CROPS[f.crop].t * 100)}% grown`, act: () => { } };
  },
  save() { if (this.online()) Online.saveChar(); },

  /* ---------------- animals */
  buyCalf() {
    const h = this.home(), P = G.player;
    if (!this.built('barn')) { UI.notify('Build a barn first.', 'warn'); return; }
    if (h.cattle.length >= 6) { UI.notify('Your barn is full.', 'warn'); return; }
    if (P.money < 25) { UI.notify('A calf costs $25.', 'warn'); return; }
    P.money -= 25; h.cattle.push({ born: G.time }); Sound.play('buy'); UI.notify(`A calf for the ${this.brandName(h)}. It'll be a steer in about two days.`, 'good');
  },
  grown(c, h) { const days = (h.plot === 'cottonwood' ? 1.4 : 2) * (h.hands.ranch ? 0.75 : 1); return G.time - c.born >= days * 1440; },
  sellSteers(price, where) {
    const h = this.home(), P = G.player, ready = h.cattle.filter(c => this.grown(c, h)); if (!ready.length) return;
    h.cattle = h.cattle.filter(c => !ready.includes(c)); Economy.addMoney(ready.length * price);
    G.stats.hsSteers = (G.stats.hsSteers || 0) + ready.length; UI.notify(`${where} buys ${ready.length} steer${ready.length > 1 ? 's' : ''} for $${ready.length * price}.`, 'good'); Sound.play('coin');
  },
  stableHorse() {
    const h = this.home(), P = G.player, hr = P.horse;
    if (!hr || hr.dead) return;
    if (h.horses.length >= 4) { UI.notify('Your corral holds 4 horses.', 'warn'); return; }
    if (P.mounted === hr) P.dismount(false);
    h.horses.push({ breed: hr.breed, name: hr.name, coat: hr.coat, mane: hr.mane, pinto: hr.pinto, pattern: hr.pattern, socks: hr.socks, wild: !!hr.wildCaught });
    G.horses = G.horses.filter(x => x !== hr); P.horse = null; UI.notify(`${hr.name} is turned out in your corral.`, 'good');
  },
  takeHorse(i) {
    const h = this.home(), P = G.player, d = h.horses[i]; if (!d) return;
    if (P.horse && !P.horse.dead) this.stableHorse();
    h.horses.splice(h.horses.indexOf(d), 1);
    const c = this.corralSpot(), hr = new Horse(d.breed, c.x, c.y + 20, { owner: 'player', name: d.name, coat: d.coat, mane: d.mane, pinto: d.pinto, pattern: d.pattern, socks: d.socks });
    hr.wildCaught = d.wild; G.horses.push(hr); P.horse = hr; UI.notify(`You saddle up ${d.name}.`, 'good');
  },
  corralSpot() { const s = this.built('corral'); return s ? { x: (s.x + 5) * TS, y: (s.y + 3) * TS } : G.player; },

  /* ---------------- hired hands (single-player) */
  hire(role) {
    const h = this.home(), n = h.hands.ranch + h.hands.guard + h.hands.farmer;
    if (n >= 3) { UI.notify('The bunkhouse sleeps three.', 'warn'); return; }
    h.hands[role]++; UI.notify(`You hired a ${role === 'ranch' ? 'ranch hand' : role}. $10 a day, paid each morning.`, 'good'); this.handsT = 0;
  },
  ensureHands() {
    const h = this.home(); this.hands = this.hands.filter(a => !a.dead && G.actors.includes(a));
    if (this.online() || !h) { for (const a of this.hands) a.removeMe = true; this.hands = []; return; }
    const want = []; for (const r of ['ranch', 'guard', 'farmer']) for (let i = 0; i < h.hands[r]; i++) want.push(r + i);
    for (const a of this.hands) if (!want.includes(a.handKey)) a.removeMe = true;
    this.hands = this.hands.filter(a => !a.removeMe);
    const b = this.built('bunkhouse') || h.structs[0]; if (!b) return;
    for (const key of want) {
      if (this.hands.some(a => a.handKey === key)) continue;
      const role = key.replace(/\d/, ''), x = (b.x + 2 + this.hands.length * 2) * TS, y = (b.y + HS_TYPES[b.type].h + 2) * TS;
      const pal = Object.assign({}, CIV_PALS[1] || CIV_PALS[0], { hatType: 'cowboy', hat: pick(['#6a4a2a', '#8a7a5a', '#3a2a1a']), shirt: pick(['#8a3a2a', '#4a5a7a', '#b8a888']) });
      const a = role === 'guard' ? spawnActor('gang', x, y, { name: 'Guard ' + pick(LAST), pal, weapon: 'lever', post: { x, y, face: Math.PI / 2 }, hp: 120 }) : spawnActor('civilian', x, y, { name: (role === 'ranch' ? 'Hand ' : 'Farmer ') + pick(LAST), pal, post: { x, y, face: Math.PI / 2 }, home: { x, y }, invuln: true, cash: 0 });
      a.handKey = key; this.hands.push(a);
    }
  },

  /* ---------------- daily chores, rustlers */
  newDay(h, day) {
    const P = G.player;
    h.eggs = Math.min(36, h.eggs + h.chickens * (day - h.eggDay)); h.eggDay = day;
    if (this.online()) return;
    const n = h.hands.ranch + h.hands.guard + h.hands.farmer;
    if (n) { const wage = n * 10; if (P.money >= wage) { P.money -= wage; UI.notify(`You paid your hands $${wage}.`, 'info'); } else { h.hands = { ranch: 0, guard: 0, farmer: 0 }; UI.notify('You couldn\'t pay your hands, so they quit.', 'warn'); } }
    if (h.hands.farmer) for (const f of Object.values(h.fields)) if (f.crop) f.wet = G.time;
  },
  raidCheck(h) {
    if (this.online() || !h.cattle.length || G.time < h.nextRaid || this.raid || MissionSys.active) return;
    h.nextRaid = G.time + rand(2, 4) * 1440 * (h.plot === 'riobravo' ? 0.6 : 1);
    const P = G.player, b = this.board(h);
    if (dist(P.x, P.y, b.x, b.y) < 900) {
      const sp = World.randomOpenNear(b.x, b.y, 260, 360) || { x: b.x + 300, y: b.y };
      const foes = []; for (let i = 0; i < randi(3, 4) - (this.built('tower') ? 1 : 0); i++) foes.push(Story.enemy('rattler', sp.x + i * 18, sp.y, { name: 'Rustler', encounter: true }));
      this.raid = { foes }; UI.notify(`Rustlers are coming for the ${this.brandName(h)} herd!${this.built('tower') ? ' Your watchtower spotted them early.' : ''}`, 'crime'); Sound.play('wanted');
      return;
    }
    const lose = clamp(0.65 - h.hands.guard * 0.25 - (this.built('tower') ? 0.2 : 0), 0.05, 1);
    if (chance(lose)) {
      const n = Math.min(h.cattle.length, randi(1, 3)); h.cattle.splice(0, n);
      const t = World.randomOpenNear(b.x, b.y, 2200, 3200) || { x: b.x + 2500, y: b.y };
      h.stolen = { n, x: t.x, y: t.y, spawned: false };
      UI.notify(`Rustlers hit your ranch while you were away and drove off ${n} head! Their trail is marked on your map.`, 'crime');
    } else { h.raids++; UI.notify(`Rustlers tried your ranch while you were away. ${h.hands.guard ? 'Your guards' : 'Your watchtower'} drove them off.`, 'good'); }
  },
  raidUpdate(h) {
    const P = G.player;
    if (this.raid) { if (this.raid.foes.every(a => a.dead || a.surrendered)) { this.raid = null; h.raids++; UI.notify('You fought off the rustlers. The herd is safe.', 'good'); Progress.add(50); } else if (dist(P.x, P.y, this.board(h).x, this.board(h).y) > 1400) { const n = Math.min(h.cattle.length, 2); h.cattle.splice(0, n); this.raid = null; UI.notify(`You left the rustlers to it. They got away with ${n} head.`, 'bad'); } }
    const st = h.stolen;
    if (st && !st.spawned && dist(P.x, P.y, st.x, st.y) < 500) { st.spawned = true; st.foes = []; for (let i = 0; i < 3; i++) st.foes.push(Story.enemy('rattler', st.x + i * 20, st.y, { name: 'Rustler' })); UI.notify('There\'s your stolen herd, and the rustlers holding it.', 'warn'); }
    if (st && st.spawned && st.foes && st.foes.every(a => a.dead || a.surrendered)) { for (let i = 0; i < st.n && h.cattle.length < 6; i++) h.cattle.push({ born: G.time - 3 * 1440 }); UI.notify(`You took back ${st.n} head of cattle!`, 'good'); h.stolen = null; h.raids++; Progress.add(60); }
  },

  /* ---------------- online */
  summary() { const h = this.home(); return h ? { plot: h.plot, quad: h.quad, brand: h.brand, s: h.structs.map(s => ({ id: s.id, t: s.type, x: s.x, y: s.y, g: s.stage, r: !this.missing(s).length })) } : null; },
  syncOnline() { if (this.online()) Online.send({ t: 'home', h: this.summary() }); },
  safeAt(p) {
    if (!p.home || !p.st) return false; const r = this.rect(p.home); if (!r) return false;
    const tx = p.st.x / TS, ty = p.st.y / TS; return tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;
  },

  /* ---------------- interactions */
  interactions() {
    const P = G.player, out = []; if (!P || P.dead || (typeof Honest !== 'undefined' && Honest.busy())) return out;
    const near = (x, y, r) => dist(P.x, P.y, x, y) < r;
    for (const a of G.actors) if (a.landAgent && !a.dead && near(a.x, a.y, 36)) out.push({ label: this.home() ? 'Talk to the land agent' : 'Buy land for a homestead', x: a.x, y: a.y + 4, r: 36, priority: 5, act: () => this.agentTalk(a) });
    // the sawmill saws logs into planks
    if (P.inv.log) { const mill = World.buildings.find(b => b.sign === 'SAWMILL'); if (mill && near(mill.door.x * TS + 8, (mill.door.y + 1) * TS + 8, 50)) out.push({ label: `Saw ${P.inv.log} logs into ${P.inv.log * 3} planks ($${P.inv.log})`, x: mill.door.x * TS + 8, y: (mill.door.y + 1) * TS, r: 50, priority: 7, act: () => { const n = P.inv.log; if (P.money < n) { UI.notify(`You need $${n}.`, 'warn'); return; } P.money -= n; P.inv.log = 0; P.inv.plank = (P.inv.plank || 0) + n * 3; Sound.play('pickup'); UI.notify(`The sawmill cuts your logs into ${n * 3} planks.`, 'good'); } }); }
    // stone from rocks
    if (P.inv.pick && !P.mounted) {
      if (!this.rocks) this.rocks = World.props.filter(p => p.t === 'rock' || p.t === 'boulder');
      for (const p of this.rocks) if (Math.abs(p.x - P.x) < 22 && Math.abs(p.y - P.y) < 18) { out.push({ label: 'Break rock for stone', x: p.x, y: p.y, r: 30, priority: -9, act: () => Interact.begin('Breaking rock', 2.2, () => { const n = p.t === 'boulder' ? 3 : 2; P.inv.stone = (P.inv.stone || 0) + n; Floaters.add(P.x, P.y - 22, `+${n} stone`, '#d0d0d0'); Sound.play('punch'); }, { sound: 'dig', range: 30 }) }); break; }
    }
    // fill the watering can at any water
    const h = this.home();
    if (h && P.inv.wcan && h.can < 10 && [[0, 2], [0, -2], [2, 0], [-2, 0], [0, 1], [1, 0], [-1, 0], [0, -1]].some(([dx, dy]) => World.tileAtPx(P.x + dx * TS, P.y + dy * TS) === T.WATER)) out.push({ label: 'Fill the watering can', x: P.x, y: P.y, r: 999, priority: 1, act: () => { h.can = 10; Sound.play('pickup'); UI.notify('Your watering can is full (10 waterings).', 'info'); this.save(); } });
    // steers to the Kingsport stockyards pay best
    if (h && !this.online() && h.cattle.some(c => this.grown(c, h))) for (const c of Honest.clerks('stables')) if (near(c.x, c.y, 40)) { const kp = c.shopId === 'kp_stables'; out.push({ label: `Sell grown steers ($${kp ? 90 : 70} each${kp ? ', stockyard price' : ''})`, x: c.x, y: c.y + 4, r: 40, priority: 4, act: () => this.sellSteers(kp ? 90 : 70, kp ? 'The Kingsport stockyards' : c.name) }); }
    // other players' unfinished buildings (online): lend a hand
    if (this.online()) for (const p of Object.values(Online.players)) if (p.id !== Online.myId && p.home) for (const s of p.home.s || []) { const t = HS_TYPES[s.t]; if (!t || !t.stages || s.g >= t.stages || !s.r) continue; const cx = (s.x + t.w / 2) * TS, cy = (s.y + t.h) * TS + 8; if (near(cx, cy, 40)) out.push({ label: `Help ${p.name} build the ${t.name.toLowerCase()}`, x: cx, y: cy, r: 40, priority: 4, act: () => this.hammer({ id: s.id, type: s.t, stage: s.g, have: {} }, { id: p.id, owner: p.name }) }); }
    if (!h) return out;
    const r = this.rect(h), b = this.board(h);
    if (near(b.x, b.y, 34)) out.push({ label: this.placing ? 'Put the plans away' : 'Open the building plans', x: b.x, y: b.y, r: 34, priority: 6, act: () => this.plans() });
    if (this.placing) { const g = this.ghostRect(); out.push({ label: this.canPlace(g) ? `Stake out the ${HS_TYPES[this.placing.type].name.toLowerCase()} here` : 'Doesn\'t fit here', x: P.x, y: P.y, r: 999, priority: 20, act: () => this.place() }); return out; }
    const tx = Math.floor(P.x / TS), ty = Math.floor(P.y / TS);
    if (this.fieldAt(tx, ty)) { const a = this.fieldAct(tx, ty); if (a) out.push(Object.assign({ x: P.x, y: P.y, r: 999, priority: 8 }, a)); }
    for (const s of h.structs) {
      const t = HS_TYPES[s.type]; if (!t.stages) continue;
      const door = this.doorOf(s), site = { x: (s.x + t.w / 2) * TS, y: (s.y + t.h) * TS + 8 };
      if (s.stage < t.stages) {
        if (!near(site.x, site.y, 44)) continue;
        const miss = this.missing(s);
        if (miss.length) out.push({ label: `Drop off materials (needs ${miss.map(([m, n]) => `${n} ${MATERIAL_NAMES[m]}`).join(', ')})`, x: site.x, y: site.y, r: 44, priority: 7, act: () => this.deliver(s) });
        else out.push({ label: `Build the ${t.name.toLowerCase()} (stage ${s.stage + 1}/${t.stages})`, x: site.x, y: site.y, r: 44, priority: 7, act: () => this.hammer(s) });
        continue;
      }
      if (!near(door.x, door.y, 36)) continue;
      if (s.type === 'cabin' || s.type === 'house') {
        if (!this.online()) out.push({ label: 'Sleep in your own bed (save)', x: door.x, y: door.y, r: 36, priority: 6, act: () => Game.sleep() });
        out.push({ label: 'Cook a meal', x: door.x, y: door.y, r: 36, priority: 3, act: () => this.cook() });
        if (s.type === 'house') out.push({ label: 'Look at your trophy wall', x: door.x, y: door.y, r: 36, priority: 2, act: () => this.trophies() });
      }
      if (s.type === 'coop') {
        if (h.eggs) out.push({ label: `Collect ${h.eggs} eggs`, x: door.x, y: door.y, r: 36, priority: 6, act: () => { P.inv.egg = (P.inv.egg || 0) + h.eggs; G.stats.hsEggs = (G.stats.hsEggs || 0) + h.eggs; Floaters.add(P.x, P.y - 22, `+${h.eggs} eggs`, '#f0ece0'); h.eggs = 0; Sound.play('pickup'); this.save(); } });
        if (h.chickens < 6) out.push({ label: `Buy a hen ($5) · ${h.chickens}/6`, x: door.x, y: door.y, r: 36, priority: 3, act: () => { if (P.money < 5) { UI.notify('A hen costs $5.', 'warn'); return; } P.money -= 5; h.chickens++; Sound.play('buy'); this.save(); } });
      }
      if (s.type === 'well' && P.inv.wcan && h.can < 10) out.push({ label: 'Fill the watering can at your well', x: door.x, y: door.y, r: 36, priority: 6, act: () => { h.can = 10; Sound.play('pickup'); this.save(); } });
      if (s.type === 'barn') {
        if (h.cattle.length < 6) out.push({ label: `Buy a calf ($25) · ${h.cattle.length}/6 head`, x: door.x, y: door.y, r: 36, priority: 3, act: () => this.buyCalf() });
        if (h.cattle.some(c => this.grown(c, h))) out.push({ label: 'Sell grown steers to a passing buyer ($60 each)', x: door.x, y: door.y, r: 36, priority: 4, act: () => this.sellSteers(60, 'A cattle buyer') });
      }
      if (s.type === 'corral') {
        if (P.horse && !P.horse.dead && h.horses.length < 4 && dist(P.horse.x, P.horse.y, door.x, door.y) < 160) out.push({ label: `Turn ${P.horse.name} out in the corral`, x: door.x, y: door.y, r: 36, priority: 4, act: () => this.stableHorse() });
        if (h.horses.length) out.push({ label: `Saddle a horse from the corral (${h.horses.length})`, x: door.x, y: door.y, r: 36, priority: 3, act: () => UI.dialogue([{ who: 'Corral', text: 'Which horse?' }], null, { choices: h.horses.map((d, i) => ({ label: `${d.name} (${HORSE_BREEDS[d.breed].name})`, value: i })).concat([{ label: 'None', value: null }]), onChoose: i => i !== null && this.takeHorse(i) }) });
      }
      if (s.type === 'bunkhouse') {
        const n = h.hands.ranch + h.hands.guard + h.hands.farmer;
        out.push({ label: `Hire or let go of hands (${n}/3)`, x: door.x, y: door.y, r: 36, priority: 4, act: () => UI.dialogue([{ who: 'Bunkhouse', text: `Ranch hands feed the stock, help you build and fatten cattle faster. Guards fight rustlers. Farmers water your fields every day. $10 a day each. You have ${h.hands.ranch} hands, ${h.hands.guard} guards and ${h.hands.farmer} farmers.` }], null,
          { choices: [{ label: 'Hire a ranch hand', value: 'ranch' }, { label: 'Hire a guard', value: 'guard' }, { label: 'Hire a farmer', value: 'farmer' }, { label: 'Let everyone go', value: 'none' }, { label: 'Never mind', value: null }], onChoose: v => { if (v === 'none') { h.hands = { ranch: 0, guard: 0, farmer: 0 }; UI.notify('You paid off your hands.', 'info'); } else if (v) this.hire(v); } }) });
      }
    }
    return out;
  },
  cook() {
    const P = G.player, rec = [['meal_stew', { crop_beans: 1, crop_corn: 1, crop_potato: 1 }], ['meal_breakfast', { egg: 2, crop_potato: 1 }]];
    const can = rec.filter(([, need]) => Object.entries(need).every(([k, n]) => (P.inv[k] || 0) >= n));
    if (!can.length) { UI.notify('Ranch Stew: beans, corn and potatoes. Ranch Breakfast: 2 eggs and a potato.', 'info'); return; }
    UI.dialogue([{ who: 'Kitchen', text: 'What\'s cooking?' }], null, { choices: can.map(([id, need]) => ({ label: `${ITEMS[id].name} (${Object.entries(need).map(([k, n]) => `${n} ${ITEMS[k].name}`).join(', ')})`, value: id })).concat([{ label: 'Nothing', value: null }]), onChoose: id => {
      if (!id) return; const need = rec.find(r => r[0] === id)[1]; for (const [k, n] of Object.entries(need)) P.inv[k] -= n; P.inv[id] = (P.inv[id] || 0) + 1; Sound.play('pickup'); UI.notify(`You cook a ${ITEMS[id].name}.`, 'good');
    } });
  },
  trophies() {
    const P = G.player, legendFish = typeof FISH !== 'undefined' ? Object.keys(FISH).filter(k => FISH[k].legend && G.world.journal && G.world.journal['fish:' + k]).map(k => FISH[k].name) : [];
    const lines = [legendFish.length ? `Mounted: ${legendFish.join(', ')}.` : 'A bare plank waits for a legendary fish.', P.inv.pelt_silverfox ? `A silver fox pelt hangs by the door.` : 'No rare pelts yet.', `Heists pulled: ${G.stats.heists || 0}. Bounties collected: ${G.stats.bounties || 0}. Journal: ${Object.keys(G.world.journal || {}).length} entries.`];
    UI.dialogue([{ who: 'Trophy wall', text: lines.join('\n') }]);
  },

  /* ---------------- every frame */
  update() {
    if (!G.player || !World.plots) return;
    const h = this.home();
    if (Math.random() < 0.01) this.ensureAgents();
    if (this.lastT === null || G.time < this.lastT) this.lastT = G.time;
    const dtMin = G.time - this.lastT; this.lastT = G.time;
    this.applySolids();
    if (!h) { if (this.hands.length) this.ensureHands(); return; }
    this.growth(dtMin);
    const day = Math.floor(G.time / 1440); if (day > h.eggDay) this.newDay(h, day);
    if (Math.random() < 0.02) this.ensureHands();
    this.raidCheck(h); this.raidUpdate(h);
  },

  /* ---------------- drawing */
  drawGround(ctx) {
    const R = (c, x, y, w, hh) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, hh); };
    const h = this.home(), c = G.cam;
    const view = (x, y) => x > c.x - 200 && x < c.x + Game.vw + 200 && y > c.y - 200 && y < c.y + Game.vh + 200;
    if (h) for (const s of h.structs) if (s.type === 'field') {
      if (!view(s.x * TS, s.y * TS)) continue;
      R('rgba(90,60,30,.25)', s.x * TS - 2, s.y * TS - 2, 6 * TS + 4, 4 * TS + 4);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 6; x++) {
        const f = h.fields[(s.x + x) + ',' + (s.y + y)], px = (s.x + x) * TS, py = (s.y + y) * TS;
        if (!f) { R('rgba(120,90,50,.25)', px + 1, py + 1, 14, 14); continue; }
        R(f.wet && G.time - f.wet < 1440 ? '#4a3018' : '#6a4424', px, py, 16, 16); for (let k = 3; k < 16; k += 5) R('#3a2410', px, py + k, 16, 1);
        if (f.crop) { const g = f.grow / CROPS[f.crop].t, hh = 2 + Math.round(g * 9); for (const ox of [3, 10]) { R('#4a8a3a', px + ox, py + 13 - hh, 2, hh); R('#5aa04a', px + ox - 2, py + 12 - hh, 6, 2); if (g >= 1) R(CROPS[f.crop].c, px + ox - 1, py + 11 - hh, 4, 4); } }
      }
    }
    if (this.placing && h) { const g = this.ghostRect(), ok = this.canPlace(g); ctx.strokeStyle = ok ? 'rgba(120,240,120,.9)' : 'rgba(240,90,70,.9)'; ctx.setLineDash([6, 4]); ctx.lineWidth = 2; ctx.strokeRect(g.x * TS, g.y * TS, g.w * TS, g.h * TS); ctx.setLineDash([]); ctx.fillStyle = ok ? 'rgba(120,240,120,.15)' : 'rgba(240,90,70,.15)'; ctx.fillRect(g.x * TS, g.y * TS, g.w * TS, g.h * TS); }
  },
  sortables() {
    const out = [], c = G.cam, view = (x, y) => x > c.x - 260 && x < c.x + Game.vw + 260 && y > c.y - 120 && y < c.y + Game.vh + 260;
    const add = (h, own, owner) => {
      if (!h || !this.plot(h.plot)) return;
      const list = own ? h.structs : (h.s || []).map(s => ({ id: s.id, type: s.t, x: s.x, y: s.y, stage: s.g, ready: s.r }));
      for (const s of list) { const t = HS_TYPES[s.type]; if (!t || s.type === 'field' || !view(s.x * TS, s.y * TS)) continue; out.push({ y: (s.y + t.h) * TS, draw: ctx => this.drawStruct(ctx, s, t, own ? !this.missing(s).length : s.ready) }); }
      const b = this.board(h); if (view(b.x, b.y)) out.push({ y: b.y + 4, draw: ctx => this.drawBoard(ctx, b, h.brand, owner) });
      if (own) { this.drawAnimals(out, h, view); }
    };
    add(this.home(), true, null);
    if (this.online()) for (const p of Object.values(Online.players)) if (p.id !== Online.myId && p.home) add(p.home, false, p.name);
    return out;
  },
  drawBoard(ctx, b, brand, owner) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    R('#4a2c16', b.x - 12, b.y - 22, 2, 22); R('#4a2c16', b.x + 10, b.y - 22, 2, 22); R('#6a4426', b.x - 14, b.y - 32, 28, 14); R('#e8dcc0', b.x - 12, b.y - 30, 24, 10);
    const t = (owner ? owner.toUpperCase() + ' · ' : '') + brand.toUpperCase(); const w = Sprites.textWidth(t) + 6;
    R('#2a1a0e', b.x - w / 2 - 1, b.y - 45, w + 2, 11); R('#c8a060', b.x - w / 2, b.y - 44, w, 9); Sprites.pixelText(ctx, t, Math.round(b.x - w / 2 + 3), b.y - 42, '#2a1608');
    R('#3a5a8a', b.x - 8, b.y - 28, 6, 5); R('#3a5a8a', b.x + 1, b.y - 27, 7, 4);
  },
  drawStruct(ctx, s, t, ready) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.max(0, Math.round(w)), Math.max(0, Math.round(h))); };
    const X = s.x * TS, Y = s.y * TS, Wd = t.w * TS, Hd = t.h * TS, B = Y + Hd, f = t.stages ? s.stage / t.stages : 1, done = !t.stages || s.stage >= t.stages;
    if (s.type === 'tent') { Sprites.shadow(ctx, X + Wd / 2, B - 2, 22, 4); ctx.fillStyle = '#d8ccb0'; ctx.beginPath(); ctx.moveTo(X + 4, B - 2); ctx.lineTo(X + Wd / 2, B - 26); ctx.lineTo(X + Wd - 4, B - 2); ctx.fill(); ctx.fillStyle = '#b8aa8a'; ctx.beginPath(); ctx.moveTo(X + Wd / 2, B - 26); ctx.lineTo(X + Wd - 4, B - 2); ctx.lineTo(X + Wd / 2 + 4, B - 2); ctx.fill(); R('#3a2a1a', X + Wd / 2 - 3, B - 12, 6, 10); return; }
    // stakes and rope before the first stage, and the materials pile while building
    if (!done) {
      if (s.stage === 0) { ctx.strokeStyle = 'rgba(230,210,160,.8)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1; ctx.strokeRect(X + 0.5, Y + 0.5, Wd - 1, Hd - 1); ctx.setLineDash([]); for (const [px, py] of [[X, Y], [X + Wd, Y], [X, B], [X + Wd, B]]) R('#8a5a30', px - 1, py - 6, 2, 7); }
      const px = X + Wd + 4, py = B - 2;
      R('#8a5a30', px, py - 4, 14, 4); R('#6a4022', px + 2, py - 8, 12, 4); if (ready) { R('#c8a06a', px - 2, py - 12, 16, 3); R('#8a8a8a', px + 4, py - 15, 6, 3); }
      if (s.stage === 0) return;
    }
    if (s.type === 'well') { Sprites.shadow(ctx, X + 16, B - 2, 14, 4); R('#8a8478', X + 2, B - 14, 28, 12); R('#a8a498', X + 2, B - 14, 28, 3); R('#2a3a4a', X + 7, B - 12, 18, 4); if (done) { R('#5a3a22', X + 3, B - 34, 3, 22); R('#5a3a22', X + 26, B - 34, 3, 22); R('#6a3a2a', X, B - 38, 32, 5); R('#5a4a3a', X + 14, B - 30, 4, 6); } return; }
    if (s.type === 'tower') { const top = B - 18 - Math.round(f * 40); for (const lx of [X + 6, X + Wd - 9]) R('#6a4426', lx, top, 3, B - top); if (f >= 0.66) { R('#8a5a30', X, top - 6, Wd, 6); R('#6a3a2a', X - 2, top - 18, Wd + 4, 6); R('#5a3a22', X + 2, top - 14, 2, 8); R('#5a3a22', X + Wd - 4, top - 14, 2, 8); } return; }
    if (s.type === 'corral') {
      for (let x = X; x <= X + Wd; x += 16) for (const y of [Y + 6, B]) R('#5a3a22', x - 1, y - 10, 3, 10);
      for (let y = Y + 16; y < B; y += 16) for (const x of [X, X + Wd]) R('#5a3a22', x - 1, y - 10, 3, 10);
      if (f >= 1) { R('#8a5a30', X, Y - 1, Wd, 2); R('#8a5a30', X, Y + 3, Wd, 2); R('#8a5a30', X, B - 8, Wd / 2 - 16, 2); R('#8a5a30', X + Wd / 2 + 16, B - 8, Wd / 2 - 16, 2); R('#8a5a30', X - 1, Y, 2, Hd); R('#8a5a30', X + Wd - 1, Y, 2, Hd); }
      return;
    }
    // houses, barns, coops, bunkhouses
    const fh = t.fh || 20, wallTop = B - fh, roofTop = Y - 6;
    Sprites.shadow(ctx, X + Wd / 2, B, Wd / 2 + 2, 4);
    R('#8a8478', X - 1, B - 4, Wd + 2, 4); R('#6a645a', X - 1, B - 1, Wd + 2, 1);
    if (s.stage >= 2 || f >= 0.25) { for (let x = X; x <= X + Wd; x += 16) R('#8a6a40', x - 1, wallTop - (f >= 0.75 ? 0 : 8), 3, fh + (f >= 0.75 ? 0 : 8)); R('#8a6a40', X, wallTop - 2, Wd, 3); }
    if (f >= 0.5) {
      const wh = Math.round(fh * Math.min(1, (f - 0.375) / 0.375));
      R(t.wall, X, B - 4 - wh, Wd, wh);
      if (s.type === 'cabin' || s.type === 'house') for (let y = B - 8; y > B - 4 - wh; y -= 4) R(Sprites.shade(t.wall, -22), X, y, Wd, 1);
      else for (let x = X + 3; x < X + Wd; x += 4) R(Sprites.shade(t.wall, -16), x, B - 4 - wh, 1, wh);
    }
    if (f >= 0.75) {
      const rf = Math.min(1, (f - 0.625) / 0.375), rt = wallTop - Math.round((wallTop - roofTop) * rf);
      R(t.roof, X - 4, rt, Wd + 8, wallTop - rt); for (let y = rt + 3; y < wallTop; y += 4) R(Sprites.shade(t.roof, -18), X - 4, y, Wd + 8, 1);
      R(Sprites.shade(t.roof, 25), X - 4, rt, Wd + 8, 2); R(Sprites.shade(t.roof, -35), X - 4, wallTop - 1, Wd + 8, 2);
    }
    if (done) {
      const dx = X + Wd / 2 - 7;
      if (s.type === 'barn') { R('#5a1a12', dx - 6, B - 26, 26, 22); ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(dx - 6, B - 26); ctx.lineTo(dx + 20, B - 4); ctx.moveTo(dx + 20, B - 26); ctx.lineTo(dx - 6, B - 4); ctx.stroke(); R('#e8dcc0', dx - 6, B - 27, 26, 2); R('#c8b890', X + Wd / 2 - 6, wallTop - 12, 12, 9); }
      else if (s.type === 'coop') { R('#3a2a1a', X + Wd / 2 - 4, B - 12, 8, 8); R('#8a6a40', X + Wd / 2 - 2, B - 4, 10, 2); }
      else { R('#3a2414', dx, B - 20, 14, 16); R('#c8a040', dx + 10, B - 12, 2, 2); for (const wx of [X + 10, X + Wd - 22]) { R('#2a1a10', wx, B - 18, 12, 9); R(Env.isNight() ? '#ffcf6a' : '#6a8a9a', wx + 1, B - 17, 10, 7); R('#2a1a10', wx + 5, B - 17, 1, 7); } }
      if (s.type === 'cabin' || s.type === 'house') { const cx = X + Wd - 18; R('#7a7468', cx, roofTop - 14, 10, 20); R('#5a544a', cx, roofTop - 14, 10, 3); R('#6a645a', cx, roofTop - 2, 10, 2); if (Math.sin(Game.t * 2 + s.id) > -0.5) { ctx.fillStyle = 'rgba(200,200,200,.35)'; ctx.beginPath(); ctx.arc(cx + 5 + Math.sin(Game.t) * 3, roofTop - 22 - (Game.t * 8 % 14), 4, 0, TAU); ctx.fill(); } }
      if (s.type === 'house') { R('#5a3a22', X + 4, B - 6, Wd - 8, 2); for (let x = X + 6; x < X + Wd - 6; x += 22) R('#5a3a22', x, wallTop + 6, 3, fh - 10); }
    } else {
      const label = `${t.name.toUpperCase()} ${s.stage}/${t.stages}`, w = Sprites.textWidth(label) + 6;
      R('rgba(30,20,10,.75)', X + Wd / 2 - w / 2, Y - 18, w, 10); Sprites.pixelText(ctx, label, Math.round(X + Wd / 2 - w / 2 + 3), Y - 16, '#ffe39a');
    }
  },
  drawAnimals(out, h, view) {
    const coop = this.built('coop', h);
    if (coop && h.chickens) for (let i = 0; i < h.chickens; i++) {
      const t = Game.t * 0.4 + i * 1.7, x = (coop.x + 2) * TS + Math.sin(t) * 26 + (i - 3) * 6, y = (coop.y + 4) * TS + Math.cos(t * 0.7) * 10 + i * 2;
      if (!view(x, y)) continue;
      out.push({ y, draw: ctx => { const peck = Math.sin(Game.t * 6 + i) > 0.7 ? 2 : 0, R = (c, a, b, w, hh) => { ctx.fillStyle = c; ctx.fillRect(Math.round(a), Math.round(b), w, hh); }; R('#f4f0e6', x - 3, y - 5, 6, 4); R('#f4f0e6', x + 2, y - 7 + peck, 3, 3); R('#d83a2a', x + 3, y - 8 + peck, 2, 1); R('#e8a030', x + 5, y - 6 + peck, 1, 1); R('#c8a040', x - 1, y - 1, 1, 2); R('#c8a040', x + 1, y - 1, 1, 2); } });
    }
    const barn = this.built('barn', h);
    if (barn) h.cattle.forEach((c, i) => {
      const t = Game.t * 0.15 + i * 2.3, x = (barn.x + 1 + (i % 3) * 3) * TS + Math.sin(t) * 14, y = (barn.y + HS_TYPES.barn.h + 3 + Math.floor(i / 3) * 2) * TS + Math.cos(t * 1.3) * 6;
      if (!view(x, y)) return;
      const a = { kind: 'cow', x, y, face: Math.cos(t) > 0 ? 0 : Math.PI, moving: Math.abs(Math.cos(t)) > 0.8, animT: Game.t, dead: false, hurtT: 0 }, small = !this.grown(c, h);
      out.push({ y, draw: ctx => { if (small) { ctx.save(); ctx.translate(x, y); ctx.scale(0.7, 0.7); ctx.translate(-x, -y); Sprites.animal(ctx, a); ctx.restore(); } else Sprites.animal(ctx, a); } });
    });
    const cor = this.built('corral', h);
    if (cor) h.horses.forEach((d, i) => {
      const t = Game.t * 0.2 + i * 1.9, x = (cor.x + 2 + i * 2) * TS + Math.sin(t) * 10, y = (cor.y + 3 + (i % 2) * 2) * TS;
      if (!view(x, y)) return;
      out.push({ y, draw: ctx => Sprites.horse(ctx, x, y, { face: Math.cos(t) > 0 ? 0 : Math.PI, animT: Game.t, speed: 0, coat: d.coat, mane: d.mane, saddle: false, pinto: d.pinto, pattern: d.pattern, socks: d.socks }) });
    });
  }
};

/* ---------------------------------------------------------------- hooks into the game */
(function () {
  // wake up at home after a bad day (single-player)
  const respawn = Game.respawn.bind(Game);
  Game.respawn = function () {
    respawn();
    if (Homestead.online()) return;
    const sp = Homestead.spawnPoint(); if (!sp) return;
    const P = G.player; P.x = sp.x; P.y = sp.y; Game.snapCamera(); UI.notify(`You came to at the ${Homestead.brandName()}, in your own bed.`, 'info');
  };
  // your ranch and the land offices on the map
  const base = allMarkers;
  allMarkers = function () {
    const out = base(), h = Homestead.home();
    if (h) { const b = Homestead.board(h); if (b) out.push({ x: b.x, y: b.y - 20, kind: 'giver', label: Homestead.brandName(h) }); if (h.stolen) out.push({ x: h.stolen.x, y: h.stolen.y, kind: 'objective', label: 'Stolen herd' }); }
    else for (const a of G.actors) if (a.landAgent && !a.dead) out.push({ x: a.x, y: a.y - 20, kind: 'stranger', label: 'Land Office' });
    return out;
  };
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'hs_cabin', name: 'Homesteader', desc: 'Build a cabin on your own land.', icon: '⌂', prog: () => [G.stats.hsCabin ? 1 : 0, 1] },
    { id: 'hs_house', name: 'Full House', desc: 'Build a ranch house.', icon: '⌂', prog: () => [G.stats.hsHouse ? 1 : 0, 1] },
    { id: 'hs_cattle', name: 'Cattle Baron', desc: 'Sell 12 steers.', icon: '♉', prog: () => [G.stats.hsSteers || 0, 12] },
    { id: 'hs_eggs', name: 'Fresh Eggs', desc: 'Collect 20 eggs.', icon: '◖', prog: () => [G.stats.hsEggs || 0, 20] },
    { id: 'hs_raids', name: 'Rustler\'s Bane', desc: 'Beat 3 rustler raids.', icon: '✕', prog: () => [(Homestead.home() && Homestead.home().raids) || 0, 3] },
    { id: 'hs_farm', name: 'Green Thumb', desc: 'Harvest 30 crops.', icon: '❀', prog: () => [G.stats.hsHarvest || 0, 30] }
  );
})();

Hooks.add({
  key: 'homestead',
  reset: () => { Homestead.placing = null; Homestead.raid = null; Homestead.lastT = null; Homestead.rocks = null; Homestead.hands = []; Homestead.dirty(); },
  update: () => Homestead.update(),
  interactions: () => Homestead.interactions(),
  sortables: () => Homestead.sortables(),
  drawGround: ctx => Homestead.drawGround(ctx)
});
