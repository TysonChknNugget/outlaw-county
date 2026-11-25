/* Outlaw County — looks.js (v2.0 "Looks & the Tailor")
 * Varied townsfolk (faces, hair, beards, builds, regional clothes),
 * new hat styles, a falling-death animation, the tailor shops,
 * saved outfits and disguises.
 */
'use strict';

const SKINS = ['#efc6a0', '#e8bc96', '#e0b08a', '#d9a27a', '#c99470', '#c08a60', '#b07a50', '#a8724a', '#8a5a3a', '#6e4630'];
const HAIRS = ['#14100c', '#2a1a10', '#4a2a14', '#6a3a1a', '#8a5a2a', '#b8884a', '#d8c89a', '#8a8a88', '#c8c8c0', '#8a3a1a'];
const CLOTH = {
  earth: ['#6a4a2a', '#8a6a4a', '#5a4a3a', '#7a5a3a', '#4a3a2a', '#9a8a6a', '#3a3028'],
  bright: ['#8a2a2a', '#2a4a7a', '#3a6a4a', '#8a6a2a', '#6a2a5a', '#2a6a6a', '#a04a2a'],
  shirt: ['#e6e0d0', '#c9b48a', '#b8a080', '#d8c8a8', '#8a8a6a', '#6a7a8a', '#9a4a3a', '#5a6a7a', '#a8a090', '#7a3a2a'],
  dark: ['#1a1a1a', '#2a2a2e', '#2a2420', '#3a2a1a', '#1f1a16', '#2e2c34', '#3a3530'],
  dress: ['#7a3a4a', '#4a5a8a', '#6a5a3a', '#3a5a4a', '#8a6a7a', '#5a3a2a', '#a08a6a', '#4a4a5a']
};
const TAILOR_COLORS = ['#e6e0d0', '#c9b48a', '#9a8a6a', '#7a5a3a', '#4a3020', '#2a1a10', '#141414', '#4a4a52', '#2a3456', '#3a5a8a', '#3a6a4a', '#5a6a3a', '#8a2a2a', '#9c2a2a', '#6a2a5a', '#c8a040', '#d8d0c0', '#a04a2a'];
const HAT_STYLES = { cowboy: 'Cattleman', flat: 'Flat Brim', bowler: 'Bowler', top: 'Top Hat', sombrero: 'Sombrero', cap: 'Wool Cap', none: 'No Hat' };
const OUTFIT_PIECES = [
  ['hat', 'Hat color', 4], ['band', 'Hat band', 2], ['shirt', 'Shirt', 6], ['vest', 'Vest', 8], ['coat', 'Coat / duster', 22],
  ['poncho', 'Poncho', 12], ['pants', 'Pants', 6], ['boots', 'Boots', 8], ['bandana', 'Bandana', 3], ['hair', 'Hair (barber)', 2], ['beard', 'Beard (barber)', 2]
];
const OPTIONAL = { vest: 1, coat: 1, poncho: 1, bandana: 1, beard: 1 };

const Looks = {
  face(r = Math.random) {
    const pickR = a => a[Math.floor(r() * a.length)];
    const hair = pickR(HAIRS), o = { skin: pickR(SKINS), hair };
    const bd = r();
    if (bd < 0.25) o.beard = hair; else if (bd < 0.45) o.mustache = hair;
    if (r() < 0.22) o.build = 'wide';
    return o;
  },
  /* a townsperson dressed for where they live */
  civ(x, y, town) {
    const reg = town || World.regionAt(x, y) || '';
    const woman = chance(0.38), f = this.face();
    const style = /Silver Crown|Frostpeak/.test(reg) ? 'miner' : /Harlow/.test(reg) ? 'port' : /Granger|Cottonwood|Ranch/.test(reg) ? 'ranch'
      : /San Lucero|Rio Bravo/.test(reg) ? 'border' : /Hollow|Salt|Last Water|Badlands/.test(reg) ? 'drifter' : 'town';
    if (woman) {
      const p = { skin: f.skin, hair: f.hair, shirt: pick(CLOTH.shirt), dress: pick(CLOTH.dress), hatType: chance(0.5) ? 'bonnet' : 'none', hat: pick(['#e8dcc0', '#4a6a8a', '#8a6a7a', '#d8c8a0']) };
      if (style === 'border') { p.hatType = 'none'; p.dress = pick(['#a04a2a', '#c8a040', '#3a6a4a', '#e6e0d0']); p.shawl = pick(CLOTH.bright); }
      if (style === 'port' && chance(0.4)) { p.hatType = 'bonnet'; p.dress = pick(['#2a3456', '#4a4a5a', '#6a2a5a']); }
      if (chance(0.3)) p.apron = '#e8e0d0';
      return p;
    }
    const p = Object.assign({ shirt: pick(CLOTH.shirt), pants: pick(CLOTH.earth), boots: pick(['#1a1410', '#2a1a10', '#3a2414']), band: pick(['#222', '#5a3a20', '#8a1c1c', '#a08040']) }, f);
    switch (style) {
      case 'miner':
        Object.assign(p, { hatType: chance(0.6) ? 'cap' : 'flat', hat: pick(['#4a4036', '#3a3a3a', '#5a4a3a']), shirt: pick(['#8a2a2a', '#6a6a6a', '#7a3a2a', '#5a5a4a']), vest: pick(['#2a2a2a', '#3a2a1a', null]),
          pants: pick(['#3a3a44', '#4a4036', '#2e2c34']), dirt: true, lamp: chance(0.5) });
        if (chance(0.3)) p.coat = pick(['#4a3a2a', '#3a3a3a']);
        break;
      case 'port':
        if (chance(0.45)) Object.assign(p, { hatType: pick(['top', 'bowler']), hat: pick(CLOTH.dark), shirt: '#e6e0d0', vest: pick(['#8a2a4a', '#2a5a4a', '#6a4a8a', '#8a6a2a']), coat: pick(CLOTH.dark), pants: pick(CLOTH.dark) });
        else Object.assign(p, { hatType: 'cap', hat: pick(['#2a3456', '#3a3a3a', '#4a4a52']), shirt: pick(['#d8d0c0', '#5a6a8a', '#e6e0d0']), stripes: chance(0.5), pants: pick(['#2a3456', '#3a3a44']) });
        break;
      case 'ranch':
        Object.assign(p, { hatType: pick(['cowboy', 'cowboy', 'flat']), hat: pick(['#c8b080', '#8a6a4a', '#5a4030', '#d8c8a0']), vest: chance(0.5) ? pick(CLOTH.earth) : null,
          bandana: chance(0.6) ? pick(CLOTH.bright) : null, chaps: chance(0.45) ? pick(['#6a4a2a', '#5a3a1a', '#8a6a4a']) : null });
        break;
      case 'border':
        Object.assign(p, { hatType: chance(0.75) ? 'sombrero' : 'flat', hat: pick(['#d8c8a0', '#c8b080', '#8a6a4a', '#3a2a1a']), band: pick(['#a03020', '#2a6a4a', '#c8a040']),
          shirt: pick(['#e8e0c8', '#d8d0c0', '#c9b48a']), pants: pick(['#e8e0c8', '#5a4a3a', '#3a3028']), poncho: chance(0.5) ? pick(['#b85a2a', '#6a3a5a', '#2a5a4a', '#a04a2a']) : null });
        break;
      case 'drifter':
        Object.assign(p, { hatType: pick(['cowboy', 'flat', 'none']), hat: pick(['#5a4a3a', '#7a6a5a']), coat: chance(0.5) ? pick(['#7a6a5a', '#5a4a3a', '#8a7a6a']) : null, dirt: true });
        break;
      default:
        Object.assign(p, { hatType: pick(['cowboy', 'cowboy', 'bowler', 'flat', 'none']), hat: pick(['#2a2a2a', '#c8b080', '#5a4a3a', '#3b2a1c', '#e8dcc0']), vest: chance(0.55) ? pick(CLOTH.earth.concat(CLOTH.dark)) : null });
        if (chance(0.2)) p.coat = pick(CLOTH.dark.concat(['#4a3a2a']));
    }
    return p;
  },

  /* ------------------------------------------------ the player's outfit */
  defaultOutfit() { return Object.assign({}, PAL.player, { hair: '#3a2a1e', beard: '#3a2a1e', coat: '#6a4a2a', vest: null, hatType: 'flat', hat: '#3b2a1c' }); },
  playerPal() {
    const P = G.player; if (!P) return PAL.player;
    if (!P.outfit) P.outfit = this.defaultOutfit();
    return P.outfit;
  },
  disguised() { const w = G.world; return w && w.disguiseAt !== undefined && w.disguiseAt !== null && Law.bounty > 0 && Law.bounty <= w.disguiseAt; },

  /* ------------------------------------------------ the tailor */
  draft: null, openId: null,
  open(shopId, clerk) {
    const P = G.player;
    this.openId = shopId;
    this.draft = Object.assign({}, this.playerPal());
    UI.show('tailor'); UI.modal = 'tailor';
    $('tailor-title').textContent = SHOPS[shopId].name;
    $('tailor-clerk').textContent = clerk ? clerk.name : '';
    Sound.play('door');
    this.render();
  },
  cost() {
    const cur = this.playerPal(), d = this.draft; let c = 0;
    if (d.hatType !== cur.hatType) c += 15;
    for (const [k, , pr] of OUTFIT_PIECES) if ((d[k] || null) !== (cur[k] || null)) c += pr;
    return Math.round(c * Progress.priceMul());
  },
  render() {
    const P = G.player, d = this.draft;
    $('tailor-money').textContent = formatMoney(P.money);
    const c = $('tailor-preview'), g = c.getContext('2d');
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = '#e8d8b0'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    for (const [i, f] of [[0, 0.3], [1, Math.PI - 0.3], [2, Math.PI / 2]]) {
      g.setTransform(6, 0, 0, 6, 0, 0);
      Sprites.human(g, 9 + i * 15, 30, { face: f, moving: false, animT: 0, pal: d, weapon: null, holster: true });
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
    const box = $('tailor-opts'); box.innerHTML = '';
    const row = (label, inner) => { const r = document.createElement('div'); r.className = 'tl-row'; r.innerHTML = `<span class="tl-lab">${esc(label)}</span>`; const w = document.createElement('div'); w.className = 'tl-sw'; inner(w); r.append(w); box.append(r); };
    row('Hat style', w => {
      for (const [k, n] of Object.entries(HAT_STYLES)) {
        const b = document.createElement('button'); b.className = 'btn tiny' + (d.hatType === k ? ' on' : ''); b.textContent = n;
        b.onclick = () => { d.hatType = k; this.render(); }; w.append(b);
      }
    });
    for (const [k, label] of OUTFIT_PIECES) row(label, w => {
      if (OPTIONAL[k]) { const b = document.createElement('button'); b.className = 'sw none' + (!d[k] ? ' on' : ''); b.title = 'None'; b.textContent = '∅'; b.onclick = () => { d[k] = null; this.render(); }; w.append(b); }
      const cols = k === 'hair' || k === 'beard' ? HAIRS : TAILOR_COLORS;
      for (const col of cols) {
        const b = document.createElement('button'); b.className = 'sw' + (d[k] === col ? ' on' : ''); b.style.background = col; b.title = col;
        b.onclick = () => { d[k] = col; this.render(); }; w.append(b);
      }
    });
    const cost = this.cost();
    $('tailor-cost').textContent = cost ? `New outfit: ${formatMoney(cost)}` : 'No changes';
    const buy = $('tailor-buy'); buy.disabled = !cost || P.money < cost;
    buy.textContent = P.money < cost ? 'Not enough money' : 'Buy & wear';
    buy.onclick = () => this.buy();
    $('tailor-reset').onclick = () => { this.draft = Object.assign({}, this.playerPal()); this.render(); };
    const sv = $('tailor-saved'); sv.innerHTML = '';
    P.outfits = P.outfits || [null, null, null];
    P.outfits.forEach((o, i) => {
      const cell = document.createElement('div'); cell.className = 'tl-slot';
      const cv = document.createElement('canvas'); cv.width = 54; cv.height = 72;
      const cg = cv.getContext('2d'); cg.imageSmoothingEnabled = false; cg.setTransform(3, 0, 0, 3, 0, 0);
      if (o) Sprites.human(cg, 9, 22, { face: 0.3, pal: o, holster: true }); else { cg.setTransform(1, 0, 0, 1, 0, 0); cg.fillStyle = '#8a7a5a'; cg.font = '11px Georgia'; cg.fillText('empty', 12, 40); }
      const save = document.createElement('button'); save.className = 'btn tiny'; save.textContent = 'Save current';
      save.onclick = () => { P.outfits[i] = Object.assign({}, this.playerPal()); this.render(); };
      const wear = document.createElement('button'); wear.className = 'btn tiny'; wear.textContent = 'Wear'; wear.disabled = !o;
      wear.onclick = () => { this.wear(Object.assign({}, o)); this.draft = Object.assign({}, o); this.render(); };
      cell.append(cv, save, wear); sv.append(cell);
    });
  },
  wear(o) {
    const P = G.player, before = JSON.stringify(this.playerPal());
    P.outfit = o;
    if (JSON.stringify(o) !== before && Law.bounty > 0) {
      G.world.disguiseAt = Law.bounty;
      UI.notify('New clothes. Lawmen will have a much harder time matching you to your wanted poster, until your bounty goes up.', 'good');
    }
  },
  buy() {
    const P = G.player, c = this.cost();
    if (!c || P.money < c) return;
    P.money -= c; this.wear(Object.assign({}, this.draft)); Sound.play('buy');
    UI.notify('You look like a new man.', 'good');
    this.render();
  }
};

/* tailors work out of the general stores of four towns */
Object.assign(SHOPS, {
  dw_tailor: { name: "Madame Fontaine's Tailoring", type: 'tailor' },
  sc_tailor: { name: 'Crown Clothiers', type: 'tailor' },
  ph_tailor: { name: 'Harbor Haberdashery', type: 'tailor' },
  sl_tailor: { name: 'Sastrería Morales', type: 'tailor' }
});
SHOP_STOCK.tailor = { buy: [], sells: [] };
const TAILORS = { dw_general: ['dw_tailor', 'Madame Fontaine'], sc_general: ['sc_tailor', 'Wendell Pryce'], ph_general: ['ph_tailor', 'Mr. Abernathy'], sl_general: ['sl_tailor', 'Doña Morales'] };

Looks.spawnTailors = function () {
  for (const [gen, [id, name]] of Object.entries(TAILORS)) {
    if (G.actors.some(a => a.shopId === id)) continue;
    const c = G.actors.find(a => a.shopId === gen); if (!c) continue;
    let spot = null;
    for (const [dx, dy] of [[2, 0], [-2, 0], [3, 0], [-3, 0], [2, 1], [-2, 1]]) {
      const tx = Math.floor(c.x / TS) + dx, ty = Math.floor(c.y / TS) + dy;
      if (World.tile(tx, ty) === T.FLOOR && !(World.sol(tx, ty) & SOL.MOVE)) { spot = { x: tx * TS + 8, y: ty * TS + 8 }; break; }
    }
    if (!spot) spot = { x: c.x + 20, y: c.y };
    const pal = Object.assign(Looks.civ(spot.x, spot.y, c.town), { coat: null, vest: '#6a2a5a', shirt: '#e6e0d0', tape: true });
    const t = spawnActor('clerk', spot.x, spot.y, { name, shopId: id, pal, home: spot, town: c.town, cash: randi(10, 30) });
    t.building = c.building;
  }
};

/* ---------------------------------------------------------------- sprite upgrades */
(function patchSprites() {
  const baseHat = Sprites.hat.bind(Sprites), baseHuman = Sprites.human.bind(Sprites);
  Sprites.hat = function (ctx, x, y, p, s) {
    const R = (c, px, py, w, h) => { ctx.fillStyle = c; ctx.fillRect(px, py, w, h); }, t = p.hatType;
    if (t === 'flat') { R(p.hat, x - 4, y - 14, 9, 1); R(p.hat, x - 2, y - 16, 5, 2); R(p.band || '#222', x - 2, y - 15, 5, 1); R('rgba(0,0,0,.25)', x - 4, y - 13, 9, 1); return; }
    if (t === 'top') { R(p.hat, x - 3, y - 14, 7, 1); R(p.hat, x - 2, y - 19, 5, 5); R(p.band || '#444', x - 2, y - 15, 5, 1); R('rgba(255,255,255,.12)', x - 2, y - 19, 1, 4); return; }
    if (t === 'cap') { R(p.hat, x - 3, y - 16, 6, 3); R(p.hat, x + (s > 0 ? 1 : -4), y - 14, 3, 1); if (p.lamp) { R('#c8a040', x - 1, y - 16, 2, 2); R('#fff8c0', x, y - 16, 1, 1); } return; }
    return baseHat(ctx, x, y, p, s);
  };
  Sprites.human = function (ctx, x, y, o) {
    if (o.state === 'dead' && (o.deadT || 0) < 0.35) {
      const k = (o.deadT || 0) / 0.35, s = Math.cos(o.face || 0) < 0 ? -1 : 1;
      ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.rotate(-s * k * Math.PI / 2);
      baseHuman(ctx, 0, 0, Object.assign({}, o, { state: 'idle', drawn: false, moving: false, mounted: false }));
      ctx.restore(); return;
    }
    return baseHuman(ctx, x, y, o);
  };
})();

/* every new non-story NPC gets a face of their own */
(function patchSpawn() {
  const base = spawnActor;
  spawnActor = function (kind, x, y, o = {}) {
    if (!o.pal) {
      if (kind === 'civilian') o.pal = Looks.civ(x, y, o.town);
      else if (kind === 'clerk') o.pal = Object.assign(Looks.civ(x, y, o.town), { dress: null, hatType: pick(['none', 'bowler', 'flat']), apron: chance(0.5) ? '#e8e0d0' : null, pants: '#2e2e36' });
      else if (kind === 'lawman' || kind === 'guard' || kind === 'marshal' || kind === 'rival') {
        const def = { lawman: PAL.lawman, guard: PAL.guard, marshal: PAL.marshal, rival: PAL.rival }[kind];
        o.pal = Object.assign({}, def, Looks.face());
        if (kind === 'rival') Object.assign(o.pal, { shirt: pick(['#7a2e22', '#5a4a3a', '#6a5a3a', '#3a3a3a']), poncho: chance(0.4) ? pick(['#8a5a2a', '#5a3a2a', '#6a6a4a']) : null, hat: pick(['#1d1b1b', '#5a4030', '#3a2a1a']) });
      }
    } else if (o.pal && kind === 'lawman' && !o.pal.skin2) o.pal = Object.assign({}, o.pal, Looks.face(), { skin2: true });
    return base(kind, x, y, o);
  };
})();

/* disguises: a changed outfit makes your wanted poster much harder to match */
(function patchLaw() {
  const base = Law.recognize.bind(Law);
  Law.recognize = function (lawman, dt) {
    if (Looks.disguised()) { if (Law.bounty < 250 || chance(0.6)) return; dt *= 0.35; }
    return base(lawman, dt);
  };
  const baseOpen = UI.openShop.bind(UI);
  UI.openShop = function (shopId, clerk) { if (SHOPS[shopId] && SHOPS[shopId].type === 'tailor') return Looks.open(shopId, clerk); return baseOpen(shopId, clerk); };
})();

/* tailor screen (built once) */
(function buildTailorUI() {
  const el = document.createElement('div');
  el.id = 'tailor'; el.className = 'screen hidden';
  el.innerHTML = `<div class="panel-box wide paper-box tailor-box">
    <div class="shop-head"><div><h2 id="tailor-title">Tailor</h2><div id="tailor-clerk" class="muted"></div></div><div class="purse">Purse <b id="tailor-money">$0</b></div></div>
    <div class="tl-main"><div class="tl-left"><canvas id="tailor-preview" width="270" height="200"></canvas>
      <div id="tailor-cost" class="tl-cost"></div><div class="row-buttons"><button class="btn" id="tailor-buy">Buy &amp; wear</button><button class="btn ghost" id="tailor-reset">Undo changes</button></div>
      <h3>Saved outfits</h3><div id="tailor-saved" class="tl-saved"></div>
      <p class="muted small">Changing clothes while you have a bounty is a disguise: lawmen rarely recognize you until your bounty rises again.</p></div>
      <div id="tailor-opts" class="tl-opts"></div></div>
    <div class="menu-buttons row-buttons"><button class="btn ghost" data-act="close">Leave (Esc)</button></div></div>`;
  const add = () => document.body.append(el);
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
})();

Hooks.add({
  key: 'looks',
  update: () => { if (!Looks.spawned) { Looks.spawned = true; Looks.spawnTailors(); } },
  reset: () => { Looks.spawned = false; },
  save: () => ({ outfit: G.player.outfit || null, outfits: G.player.outfits || [null, null, null] }),
  load: ext => { const P = G.player; if (ext) { P.outfit = ext.outfit || null; P.outfits = ext.outfits || [null, null, null]; } }
});
