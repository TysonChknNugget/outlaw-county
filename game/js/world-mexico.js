/* Outlaw County — world-mexico.js (v2.7)
 * Mexico: everything south of San Lucero and the Rio Bravo. The map is twice
 * as tall now; the top half is the United States, the bottom half is this.
 *
 *   ┌──────────── Rio Bravo · San Lucero ──────────────┐  ~ row 850
 *   │  Desierto de Sonora      │     Sierra Madre        │
 *   │   Santa Rosa             │      Real de Plata      │
 *   │  Barranca del Diablo     │     (pine mountains)    │
 *   │   Presidio San Isidro    │                         │
 *   │  Valle de Oro                        │ Laguna Verde │
 *   │   Hacienda town Valle de Oro         │              │
 *   │  Costa Dorada · Puerto Dorado on the sea            │
 *   └─────────────────────────────────────────────────────┘  row 1920
 */
'use strict';

const MEX_Y = 852;
const MEX_NAMES = { sonora: 'Desierto de Sonora', sierra: 'Sierra Madre', barranca: 'Barranca del Diablo', valle: 'Valle de Oro', laguna: 'Laguna Verde', costa: 'Costa Dorada' };
const MEX_TOWNS = ['Santa Rosa', 'Real de Plata', 'Presidio San Isidro', 'Valle de Oro', 'Puerto Dorado'];
const MEX_RX = /Santa Rosa|Real de Plata|San Isidro|Valle de Oro|Puerto Dorado|Sonora|Sierra Madre|Barranca|Laguna|Costa Dorada|Mexico/;

/* shops for the Mexican towns */
(function () {
  const S = (p, town, o) => {
    SHOPS[p + '_general'] = { name: o.mercado || `Mercado de ${town}`, type: 'general', till: [50, 110] };
    SHOPS[p + '_saloon'] = { name: o.cantina, type: 'saloon', till: [40, 100] };
    SHOPS[p + '_sheriff'] = { name: o.jail || 'Cuartel de Rurales', type: 'sheriff' };
    SHOPS[p + '_gunsmith'] = { name: o.armeria || `Armería ${town}`, type: 'gunsmith', till: [70, 130] };
    SHOPS[p + '_stables'] = { name: `Caballeriza ${town}`, type: 'stables', till: [30, 70] };
    SHOPS[p + '_hotel'] = { name: o.posada || `Posada ${town}`, type: 'hotel', till: [30, 70] };
    if (o.bank) SHOPS[p + '_bank'] = { name: o.bank, type: 'bank', till: [180, 300] };
    if (typeof SHOP_STOCK !== 'undefined') SHOP_STOCK[p + '_stables'] = { buy: ['horse:andalusian', 'horse:mustang', 'horse:mule', 'horse:quarter', 'oats', 'service:groom'], sells: [] };
  };
  S('sr', 'Santa Rosa', { cantina: 'Cantina El Nopal', bank: 'Banco de Santa Rosa' });
  S('rp', 'Real de Plata', { cantina: 'La Mina de Oro', bank: 'Casa de Moneda', armeria: 'Armería del Cerro' });
  S('si', 'San Isidro', { cantina: 'Cantina del Presidio', jail: 'Presidio de los Rurales' });
  S('vo', 'Valle de Oro', { cantina: 'Cantina La Cosecha', bank: 'Banco del Valle' });
  S('pd', 'Puerto Dorado', { cantina: 'La Sirena', bank: 'Banco del Puerto', posada: 'Hotel del Mar' });
})();

Object.assign(World, {
  mexKind(tx, ty) {
    const wx = tx + (this.rn1(tx * 0.007, ty * 0.007 + 50) - 0.5) * 130, wy = ty + (this.rn2(tx * 0.007 + 30, ty * 0.007) - 0.5) * 110;
    if (wy > 1690) return 'costa';
    if (wy > 1390) return wx > 960 ? 'laguna' : 'valle';
    if (wy > 1120) return wx > 640 ? 'sierra' : 'barranca';
    return wx > 680 ? 'sierra' : 'sonora';
  },
  coastY(tx) { return 1852 + Math.sin(tx * 0.008) * 16 + Math.sin(tx * 0.027) * 6; },

  generateMexico(seed) {
    const W = this.W, H = this.H, rng = mulberry32(seed + 151);
    const nA = makeNoise(seed + 21), nB = makeNoise(seed + 22), nC = makeNoise(seed + 23);
    const set = (tx, ty, t) => { this.tiles[ty * W + tx] = t; };
    const edge = (tx, ty) => MEX_Y + (nA(tx * 0.03, 7) - 0.5) * 16;

    // ---------- clear whatever the frontier pass left down here
    this.props = this.props.filter(p => p.ty < MEX_Y - 8);
    for (let ty = MEX_Y - 8; ty < H; ty++) for (let tx = 0; tx < W; tx++) { this.solid[ty * W + tx] = 0; this.reserved[ty * W + tx] = 0; }

    // ---------- 1. terrain
    for (let ty = MEX_Y - 8; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      if (ty < edge(tx, ty)) continue;
      const k = this.mexKind(tx, ty), e = fbm(nC, tx * 0.05, ty * 0.05, 3);
      let t = T.SAND;
      switch (k) {
        case 'sonora': t = e > 0.62 ? T.SCRUB : e < 0.3 ? T.DRYBED : T.SAND; break;
        case 'sierra': { const ridge = 1 - Math.abs(fbm(nB, tx * 0.02, ty * 0.02, 3) * 2 - 1); t = ridge > 0.9 ? T.ROCK : e > 0.5 ? T.FOREST : e > 0.32 ? T.GRASS : T.SCRUB; break; }
        case 'barranca': { const v = fbm(nB, tx * 0.03, ty * 0.03, 3); t = (Math.abs(v - 0.5) < 0.025 || v > 0.76) ? T.ROCK : v < 0.3 ? T.CANYON : T.CLAY; break; }
        case 'valle': t = e > 0.72 ? T.FOREST : e > 0.45 ? T.PRAIRIE : T.GRASS; break;
        case 'laguna': t = e < 0.28 ? T.SHALLOW : e < 0.34 ? T.WATER : e > 0.6 ? T.FOREST : T.GRASS; break;
        case 'costa': t = e > 0.6 ? T.SCRUB : T.SAND; break;
      }
      if (ty > this.coastY(tx)) t = T.WATER;                                      // the sea
      else if (ty > this.coastY(tx) - 5) t = T.SAND;                              // the beach
      const nn = nA(tx * 0.15, ty * 0.15);
      if (tx > W - 5 - nn * 6 || tx < 4 + nn * 5 || ty > H - 3) t = ty > this.coastY(tx) ? T.WATER : T.ROCK;
      set(tx, ty, t);
    }
    // a river winding down through the barranca to the sea
    for (let ty = 1080; ty < 1860; ty++) {
      const cx = 300 + Math.sin(ty * 0.012) * 40 + Math.sin(ty * 0.041) * 9, hw = 2.4 + Math.sin(ty * 0.03) * 0.6;
      for (let tx = Math.floor(cx - hw - 1); tx <= Math.ceil(cx + hw + 1); tx++) if (Math.abs(tx + 0.5 - cx) < hw) set(tx, ty, (ty % 160 < 6) ? T.SHALLOW : T.WATER);
    }

    // ---------- 2. towns around a plaza
    const B = (id, type, x, y, w, h, opts = {}) => this.addBuilding(Object.assign({ id, type, x, y, w, h }, opts));
    const P = (t, tx, ty, o) => this.addProp(t, tx, ty, o);
    const towns = [];
    const roofs = ['#a06a40', '#93613b', '#a87447', '#9a6a44', '#8a5a32', '#b07a4a'];
    const town = (cx, cy, p, name, o = {}) => {
      this.fillRect(cx - 40, cy - 24, 80, 50, T.TOWN, true);
      this.stampLine(cx - 42, cy, cx + 42, cy, 2); this.stampLine(cx, cy - 26, cx, cy + 27, 1.8);
      const st = { town: name, adobe: true };
      // north side of the plaza
      let x = cx - 37;
      for (const [id, type, w, h, label, sign] of [['saloon', 'saloon', 12, 8, SHOPS[p + '_saloon'].name, 'CANTINA'], ['general', 'general', 10, 8, SHOPS[p + '_general'].name, 'MERCADO'],
        ['sheriff', 'sheriff', 9, 8, SHOPS[p + '_sheriff'].name, o.fort ? 'PRESIDIO' : 'RURALES'], ['gunsmith', 'gunsmith', 9, 8, SHOPS[p + '_gunsmith'].name, 'ARMERIA']]) {
        B(`${p}_${id}`, type, x, cy - 13, w, h, Object.assign({ name: label, sign, roof: roofs[Math.floor(rng() * roofs.length)] }, st)); x += w + 2;
      }
      if (SHOPS[p + '_bank']) B(`${p}_bank`, 'bank', x, cy - 15, 11, 10, Object.assign({ name: SHOPS[p + '_bank'].name, sign: 'BANCO', roof: '#7a6a5a' }, st));
      // south side
      B(`${p}_church`, 'church', cx - 6, cy + 4, 12, 12, Object.assign({ name: o.church || `Iglesia de ${name}`, roof: '#e8dcc0', wallTint: '#e8e0cc' }, st));
      B(`${p}_stables`, 'stables', cx + 10, cy + 4, 12, 9, Object.assign({ name: SHOPS[p + '_stables'].name, roof: '#7a5030' }, st));
      B(`${p}_hotel`, 'hotel', cx + 24, cy + 4, 10, 10, Object.assign({ name: SHOPS[p + '_hotel'].name, sign: 'POSADA', roof: '#8a4a3a' }, st));
      for (let i = 0; i < 4; i++) B(`${p}_house${i}`, 'house', [cx - 38, cx - 29, cx - 20, cx - 38][i], i < 3 ? cy + 4 : cy + 14, 7, 7, Object.assign({ roof: roofs[i] }, st));
      P('well', cx - 2, cy - 3); for (let lx = cx - 36; lx <= cx + 36; lx += 12) P('lamp', lx, cy + 2);
      P('sign', cx - 42, cy - 2, { text: name.toUpperCase() });
      if (o.fort) { for (let fx = cx - 40; fx <= cx + 40; fx += 2) if (Math.abs(fx - cx) > 3) { P('fence_h', fx, cy - 24); P('fence_h', fx, cy + 25); } P('flagpole', cx + 4, cy - 2); }
      this.frontierWaypoints[name] = [[cx - 34, cy], [cx - 20, cy], [cx - 6, cy], [cx + 8, cy], [cx + 22, cy], [cx + 36, cy], [cx, cy - 18], [cx, cy + 20], [cx - 30, cy + 2], [cx + 30, cy + 2]].map(([a, b]) => ({ x: a * TS + 8, y: b * TS + 8 }));
      towns.push({ name, x0: cx - 42, y0: cy - 26, x1: cx + 42, y1: cy + 27, sheriff: p + '_sheriff', pop: o.pop || 8, law: 2, mexico: true, cx, cy });
    };
    town(420, 930, 'sr', 'Santa Rosa', { pop: 9 });
    town(1010, 1190, 'rp', 'Real de Plata', { pop: 8 });
    town(250, 1260, 'si', 'Presidio San Isidro', { pop: 6, fort: true });
    town(560, 1510, 'vo', 'Valle de Oro', { pop: 9 });
    town(900, 1790, 'pd', 'Puerto Dorado', { pop: 10 });

    // the silver workings above Real de Plata, and the port's pier and ship
    this.blob(1010, 1150, 8, T.ROCK, nB); this.fillRect(1002, 1158, 18, 4, T.CANYON, true);
    P('mine', 1006, 1160); P('headframe', 1014, 1162); P('wagon', 1020, 1166);
    const pierX = 900, cyc = Math.round(this.coastY(pierX));
    this.fillRect(pierX - 1, cyc - 6, 4, 30, T.BOARD, true);
    P('steamboat', pierX + 6, cyc + 14); P('lighthouse', pierX + 60, cyc - 4);
    // haciendas in the valley
    this.mexHaciendas = [];
    for (const [hx, hy, name] of [[420, 1440, 'Hacienda Los Álamos'], [700, 1580, 'Hacienda San Gabriel'], [330, 1620, 'Hacienda La Paloma']]) {
      this.fillRect(hx - 2, hy - 2, 30, 22, T.TOWN, true);
      B(`hac_${hx}`, 'house', hx + 6, hy + 2, 14, 10, { name, roof: '#a06a40', adobe: true });
      for (let fx = hx - 2; fx < hx + 28; fx++) { if (fx < hx + 11 || fx > hx + 15) { P('fence_h', fx, hy - 2); P('fence_h', fx, hy + 19); } }
      P('well', hx + 2, hy + 14); P('hay', hx + 22, hy + 14); P('trough', hx + 24, hy + 4);
      this.mexHaciendas.push({ x: (hx + 13) * TS, y: (hy + 14) * TS, name });
    }
    // roads: San Lucero's south road on into Mexico, and between the towns
    const sl = this.poi.sanLucero ? [Math.round(this.poi.sanLucero.x / TS), Math.round(this.poi.sanLucero.y / TS) + 6] : [640, 845];
    const routes = [[sl, [420, 905]], [[460, 930], [968, 1190]], [[420, 955], [250, 1236]], [[250, 1286], [520, 1510]], [[1010, 1216], [600, 1510]],
      [[560, 1536], [900, 1766]], [[1052, 1190], [930, 1766]], [[900, 1700], [1200, 1500]]];
    for (const [a, b] of routes) this.routeRoad(a, b, nA);
    for (const h of this.mexHaciendas) { const from = [Math.round(h.x / TS), Math.round(h.y / TS) + 6], to = this.nearestRoadNode(from[0], from[1]); if (to) this.routeRoad(from, to, nA); }

    // ---------- 3. outlaws and buried loot
    for (const [cx, cy, name, size] of [[760, 1010, 'Los Lobos Camp', 5], [180, 1150, 'El Tigre\'s Hideout', 6], [1150, 1380, 'Sierra Bandidos', 5], [760, 1700, 'Smugglers\' Cove', 5]]) {
      this.fillRect(cx - 6, cy - 4, 14, 10, T.DRYBED, true);
      P('campfire', cx, cy); P('tent', cx - 4, cy - 2); P('tent', cx + 4, cy - 2); P('crate', cx + 6, cy + 3);
      this.banditCamps.push({ name, x: cx * TS, y: cy * TS, clearedAt: -99999, members: [], size });
    }
    for (const [tx, ty, name] of [[120, 1000, 'Sonoran Prospector\'s Gold'], [1180, 1080, 'Sierra Silver Stash'], [150, 1400, 'Barranca Bandit Hoard'], [1150, 1820, 'Shipwreck Doubloons']]) {
      for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (this.tile(x, y) === T.ROCK || this.tile(x, y) === T.WATER) this.setTile(x, y, T.SAND);
      this.reserve(tx - 1, ty - 1, 3, 3); P('xmark', tx, ty); P('stones', tx + 1, ty);
      this.treasures.push({ id: this.treasures.length, x: tx * TS + 8, y: ty * TS + 8, name });
    }
    // anything from the frontier pass that now lies in Mexico gets its marker back
    for (const t of this.treasures) if (t.y / TS >= MEX_Y - 8 && !this.props.some(p => p.t === 'xmark' && p.tx === Math.floor(t.x / TS) && p.ty === Math.floor(t.y / TS))) P('xmark', Math.floor(t.x / TS), Math.floor(t.y / TS));

    // ---------- 4. plants and rocks
    for (let ty = MEX_Y - 8; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      if (this.reserved[ty * W + tx] || ty < edge(tx, ty)) continue;
      const t = this.tiles[ty * W + tx], r = rng();
      switch (t) {
        case T.SAND: if (r < 0.012) P('cactus', tx, ty, { v: rng() }); else if (r < 0.02) P('cactus_s', tx, ty); else if (r < 0.023) P('rock', tx, ty); break;
        case T.SCRUB: if (r < 0.012) P('bush', tx, ty, { v: rng() }); else if (r < 0.018) P('cactus_s', tx, ty); else if (r < 0.05) P('tuft', tx, ty); break;
        case T.FOREST: if (r < 0.12) P('pine', tx, ty, { v: rng() }); else if (r < 0.16) P('bush', tx, ty, { v: rng() }); break;
        case T.GRASS: if (r < 0.008) P('oak', tx, ty, { v: rng() }); else if (r < 0.02) P('bush', tx, ty, { v: rng() }); else if (r < 0.06) P('tuft', tx, ty); break;
        case T.PRAIRIE: if (r < 0.004) P('oak', tx, ty, { v: rng() }); else if (r < 0.07) P('tuft', tx, ty); else if (r < 0.1) P('flowers', tx, ty); break;
        case T.CLAY: if (r < 0.006) P('rock', tx, ty); else if (r < 0.009) P('cactus', tx, ty, { v: rng() }); else if (r < 0.012) P('hoodoo', tx, ty, { v: rng() }); break;
        case T.CANYON: if (r < 0.006) P('boulder', tx, ty); else if (r < 0.01) P('deadtree', tx, ty); break;
        case T.DRYBED: if (r < 0.02) P('stones', tx, ty); break;
      }
    }
    this.towns.push(...towns);
    this.poi.santaRosa = { x: 420 * TS, y: 930 * TS }; this.poi.puertoDorado = { x: 900 * TS, y: 1790 * TS };
  }
});

/* region names down south */
(function () {
  const base = World.frontierRegionName;
  World.frontierRegionName = function (x, y) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (ty >= MEX_Y + 6 && this.rn1) {
      if (dist(tx, ty, 1010, 1158) < 12) return 'Mina Real de Plata';
      for (const h of this.mexHaciendas || []) if (dist(x, y, h.x, h.y) < 18 * TS) return h.name;
      if (this.tile(tx, ty) === T.WATER && ty > this.coastY(tx)) return 'Mar de Cortés';
      return MEX_NAMES[this.mexKind(tx, ty)];
    }
    return base.call(this, x, y);
  };
})();
