/* Outlaw County — world-frontier.js
 * The six frontier regions that surround the original county:
 *
 *   ┌──────────┬─────────────────────┬────────────┐
 *   │ Outlaw   │ Frostpeak Mountains │ Harlow     │   rows 0–240
 *   │ County   │ (Silver Crown)      │ Lake       │
 *   ├──────────┴─────────┬───────────┴────────────┤
 *   │ Ranch Country      │ Red Canyonlands        │   rows 240–480
 *   │ (Fort Granger)     │ (Rattlesnake Fortress) │
 *   ├────────────────────┼────────────────────────┤
 *   │ Bonewhite Salt     │ Mesa Badlands          │   rows 480–720
 *   │ Flats (Hollow Crk) │ (Last Water)           │
 *   ├────────────────────┴────────────────────────┤
 *   │ ~~~~~~~~~~~~ Rio Bravo · San Lucero ~~~~~~~~ │   rows 720–960
 *   └─────────────────────────────────────────────┘
 *
 * Runs from World.generate() after the original county is built and before
 * solidity, chunk indexing and lights are computed.
 */
'use strict';

Object.assign(PROP_DEFS, {
  snowpine: { fp: [1, 1], sol: SOL.ALL }, hoodoo: { fp: [1, 1], sol: SOL.ALL },
  arch: { fp: [6, 1], sol: 0 }, cliffruin: { fp: [3, 1], sol: SOL.ALL },
  lighthouse: { fp: [2, 2], sol: SOL.ALL }, steamboat: { fp: [8, 2], sol: SOL.MOVE | SOL.SHOT },
  headframe: { fp: [3, 2], sol: SOL.MOVE | SOL.SHOT }, flagpole: { fp: [1, 1], sol: SOL.MOVE },
  stampmill: { fp: [4, 2], sol: SOL.ALL }, snowdrift: { flat: true }
});

const REGION_GRID = [
  ['county', 'frost', 'frost', 'lake'],
  ['ranch', 'ranch', 'canyon', 'canyon'],
  ['salt', 'salt', 'badlands', 'badlands'],
  ['border', 'border', 'border', 'border']
];
const REGION_NAMES = {
  frost: 'Frostpeak Mountains', lake: 'Harlow Lake', ranch: 'Ranch Country', canyon: 'Red Canyonlands',
  salt: 'Bonewhite Salt Flats', badlands: 'Mesa Badlands', border: 'Rio Bravo'
};

Object.assign(World, {
  /* which frontier region a tile belongs to (borders wander with noise) */
  regionKind(tx, ty) {
    if (tx < this.OW && ty < this.OH) return 'county';
    if (!this.rn1) return 'county';
    const wx = tx + (this.rn1(tx * 0.006, ty * 0.006) - 0.5) * 150 + (this.rn2(tx * 0.03, ty * 0.03) - 0.5) * 24;
    const wy = ty + (this.rn2(tx * 0.006 + 40, ty * 0.006) - 0.5) * 120 + (this.rn1(tx * 0.03 + 9, ty * 0.03) - 0.5) * 20;
    const bx = clamp(Math.floor(wx / 320), 0, 3), by = clamp(Math.floor(wy / 240), 0, 3);
    let r = REGION_GRID[by][bx];
    if (r === 'county') r = ty < this.OH ? 'frost' : 'ranch';
    if (by === 3 || ty > 740) r = 'border';
    return r;
  },
  riverCY(tx) { return 795 + Math.sin(tx * 0.01) * 14 + Math.sin(tx * 0.031) * 5; },

  generateFrontier(seed) {
    const W = this.W, H = this.H, OW = this.OW, OH = this.OH;
    const rng = mulberry32(seed + 77);
    const nA = makeNoise(seed + 11), nB = makeNoise(seed + 12), nC = makeNoise(seed + 13);
    this.rn1 = makeNoise(seed + 14); this.rn2 = makeNoise(seed + 15);
    this.frontierWaypoints = {};
    const tilesSet = (tx, ty, t) => { this.tiles[ty * W + tx] = t; };

    // ---------- 1. terrain by region
    for (let ty = 0; ty < H; ty++) for (let tx = 0; tx < W; tx++) {
      if (tx < OW && ty < OH) continue;
      const r = this.regionKind(tx, ty);
      let t = T.GRASS;
      const e = fbm(nC, tx * 0.05, ty * 0.05, 3);
      switch (r) {
        case 'frost': {
          const ridge = 1 - Math.abs(fbm(nB, tx * 0.02, ty * 0.02, 3) * 2 - 1);
          t = ridge > 0.93 ? T.ROCK : e > 0.6 ? T.SNOWFOREST : T.SNOW;
          break;
        }
        case 'lake': t = e > 0.6 ? T.FOREST : e < 0.36 ? T.SCRUB : T.GRASS; break;
        case 'ranch': t = e > 0.68 ? T.FOREST : (ty > 440 && e < 0.4) ? T.SCRUB : T.PRAIRIE; break;
        case 'canyon': {
          const v = fbm(nB, tx * 0.035, ty * 0.035, 3);
          t = (Math.abs(v - 0.5) < 0.02 || v > 0.74) ? T.ROCK : T.CLAY;
          break;
        }
        case 'salt': t = e > 0.7 ? T.SAND : T.SALT; break;
        case 'badlands': {
          const v = fbm(nB, tx * 0.04, ty * 0.04, 3);
          t = v > 0.68 ? T.ROCK : Math.abs(fbm(nA, tx * 0.02, ty * 0.02, 2) - 0.5) < 0.012 ? T.DRYBED : e > 0.55 ? T.SCRUB : T.SAND;
          break;
        }
        case 'border': {
          const cy = this.riverCY(tx);
          t = ty < cy ? (e > 0.55 ? T.SCRUB : T.SAND) : (e > 0.5 ? T.GRASS : T.SCRUB);
          break;
        }
      }
      // outer map edge is mountains
      const nn = nA(tx * 0.15, ty * 0.15);
      if (tx > W - 5 - nn * 6 || ty > H - 5 - nn * 6 || (ty < 5 + nn * 6 && tx >= OW) || (tx < 4 + nn * 5 && ty >= OH)) t = T.ROCK;
      tilesSet(tx, ty, t);
    }

    // ---------- 2. water: Harlow Lake, frozen ponds, the Rio Bravo
    const LX = 1110, LY = 55;
    for (let ty = 0; ty < 120; ty++) for (let tx = 960; tx < W; tx++) {
      const d = Math.hypot((tx - LX) / 115, (ty - LY) / 44) + (nA(tx * 0.06, ty * 0.06) - 0.5) * 0.18;
      if (d < 1 && this.tile(tx, ty) !== T.ROCK || d < 0.85) tilesSet(tx, ty, T.WATER);
    }
    for (const [px, py, pr] of [[420, 60, 6], [700, 180, 5], [840, 40, 7], [600, 210, 4]]) this.blob(px, py, pr, T.ICE, nB);
    const fords = [150, 420, 900, 1150];
    for (let tx = 0; tx < W; tx++) {
      const cy = this.riverCY(tx), hw = 3.6 + Math.sin(tx * 0.05) * 0.8;
      const ford = fords.some(f => Math.abs(tx - f) <= 3);
      for (let ty = Math.floor(cy - hw - 1); ty <= Math.ceil(cy + hw + 1); ty++) {
        if (Math.abs(ty + 0.5 - cy) < hw) tilesSet(tx, ty, ford ? T.SHALLOW : T.WATER);
        else if (Math.abs(ty + 0.5 - cy) < hw + 1.2 && this.tile(tx, ty) === T.ROCK) tilesSet(tx, ty, T.SAND);
      }
      if (ford) this.reserve(tx, Math.floor(cy - hw - 3), 1, Math.ceil(hw * 2 + 6));
    }

    // ---------- 3. railroad continues east to Port Harlow
    for (let tx = OW - 6; tx < W; tx++) for (let ty = RAIL_ROW - 1; ty <= RAIL_ROW + 1; ty++) {
      tilesSet(tx, ty, this.tile(tx, ty) === T.WATER ? T.BRIDGE : T.GRAVEL);
      this.reserve(tx, ty - 2, 1, 6);
    }

    // ---------- 4. settlements
    const B = (id, type, x, y, w, h, opts = {}) => this.addBuilding(Object.assign({ id, type, x, y, w, h }, opts));
    const P = (t, tx, ty, o) => this.addProp(t, tx, ty, o);
    const wp = (name, pts) => { this.frontierWaypoints[name] = pts.map(([x, y]) => ({ x: x * TS + 8, y: y * TS + 8 })); };
    const newTowns = [];

    // A frontier town on the railroad, laid out like Dustwater: main street on row 120,
    // a back street on row 134, a station whose platform meets the tracks.
    const railTown = (ox, p, name, o) => {
      this.fillRect(ox - 2, 104, 88, 41, T.TOWN, true);
      this.stampLine(ox - 3, 120, ox + 86, 120, 2);
      this.stampLine(ox - 2, 134, ox + 85, 134, 1.6);
      this.stampLine(ox + 28, 134, ox + 28, 144, 1.5);
      this.fillRect(ox + 24, 144, 28, 1, T.BOARD, true);
      const t = { town: name, adobe: !!o.adobe };
      B(p + '_sheriff', 'sheriff', ox + 4, 110, 9, 8, Object.assign({ name: o.sheriffName || "Sheriff's Office", sign: 'SHERIFF', roof: '#5b3a2a' }, t));
      B(p + '_general', 'general', ox + 15, 109, 10, 9, Object.assign({ name: 'General Store', sign: o.storeSign || 'GENERAL STORE', roof: '#6d4b2f' }, t));
      B(p + '_saloon', 'saloon', ox + 27, 107, 13, 11, Object.assign({ name: o.saloonName, sign: 'SALOON', roof: '#7a3b26' }, t));
      B(p + '_bank', 'bank', ox + 50, 108, 11, 10, Object.assign({ name: o.bankName, sign: o.bankSign || 'BANK', roof: '#4d4f57' }, t));
      B(p + '_gunsmith', 'gunsmith', ox + 63, 110, 9, 8, Object.assign({ name: 'Gunsmith', sign: 'GUNS', roof: '#3f3a33' }, t));
      B(p + '_hotel', 'hotel', ox + 74, 107, 10, 11, Object.assign({ name: 'Hotel', sign: 'HOTEL', roof: '#5a2f3a' }, t));
      B(p + '_stables', 'stables', ox + 4, 124, 12, 9, Object.assign({ name: 'Livery & Stables', sign: 'STABLES', roof: '#6b4a2a' }, t));
      const houseX = [ox + 31, ox + 39, ox + 52, ox + 60, ox + 68, ox + 76];
      houseX.forEach((hx, i) => B(`${p}_house${i + 1}`, o.houseType || 'house', hx, 125, 7, 8, Object.assign({ name: o.houseNames ? o.houseNames[i] : 'House', roof: ['#64412b', '#53402f', '#6a4630', '#4e3a2c', '#5f4630', '#6b4a33'][i] }, t)));
      B(p + '_station', 'station', ox + 32, 136, 12, 8, Object.assign({ name: name + ' Station', sign: name.toUpperCase(), roof: '#335048' }, t));
      for (let x = ox + 2; x <= ox + 82; x += 9) P('lamp', x, 122);
      P('well', ox + 44, 113); P('trough', ox + 18, 122); P('hitch', ox + 30, 122); P('barrel', ox + 25, 116); P('crate', ox + 61, 116);
      P('sign', ox - 3, 117, { text: name.toUpperCase() });
      wp(name, [[ox + 2, 120], [ox + 14, 120], [ox + 30, 120], [ox + 44, 120], [ox + 56, 120], [ox + 70, 120], [ox + 82, 120], [ox + 10, 134], [ox + 28, 134], [ox + 48, 134], [ox + 66, 134], [ox + 80, 134], [ox + 44, 128], [ox + 30, 140]]);
      newTowns.push({ name, x0: ox - 3, y0: 102, x1: ox + 86, y1: 146, sheriff: p + '_sheriff', pop: o.pop || 8, law: 2 });
    };

    // Silver Crown — mining boomtown in the Frostpeaks
    railTown(520, 'sc', 'Silver Crown', { saloonName: 'The Bonanza', bankName: 'Silver Crown Assay Office', bankSign: 'ASSAY OFFICE', pop: 9 });
    this.blob(562, 90, 9, T.ROCK, nB);
    this.fillRect(554, 100, 20, 4, T.CANYON, true);
    this.stampLine(564, 118, 564, 102, 1.4);
    P('mine', 558, 101); P('headframe', 566, 103); P('wagon', 570, 108); P('crate', 556, 104); P('barrel', 557, 104);
    this.poi.silverMine = { x: 559 * TS, y: 102 * TS };

    // Port Harlow — lake port
    railTown(990, 'ph', 'Port Harlow', { saloonName: 'The Lucky Anchor', bankName: 'Harlow Savings Bank', houseType: 'house', pop: 11,
      houseNames: ['The Clarion', 'Warehouse 7', 'Warehouse 8', 'Warehouse 9', 'Cannery', 'Ship Chandler'] });
    this.stampLine(1076, 120, 1079, 104, 1.6);
    for (let y = 86; y <= 104; y++) for (let x = 1077; x <= 1080; x++) { this.setTile(x, y, T.BOARD); this.reserve(x, y, 1, 1); }
    for (let y = 92; y <= 95; y++) for (let x = 1081; x <= 1090; x++) this.reserve(x, y, 1, 1);
    P('steamboat', 1081, 95); P('crate', 1078, 103); P('crate', 1079, 103); P('barrel', 1080, 101);
    this.blob(1100, 101, 3, T.GRASS, nA); P('lighthouse', 1099, 101);
    this.poi.harlowDocks = { x: 1078 * TS, y: 100 * TS };

    // Fort Granger — U.S. Army fort in Ranch Country
    const FX = 400, FY = 316, FW = 42, FH = 32;
    this.fillRect(FX - 4, FY - 4, FW + 8, FH + 10, T.TOWN, true);
    for (let x = FX; x < FX + FW; x++) for (const y of [FY, FY + FH - 1]) if (!(y === FY + FH - 1 && Math.abs(x - (FX + 20)) <= 1)) this.setTile(x, y, T.WALL);
    for (let y = FY; y < FY + FH; y++) for (const x of [FX, FX + FW - 1]) this.setTile(x, y, T.WALL);
    const ft = { town: 'Fort Granger' };
    B('fg_barracks1', 'house', FX + 3, FY + 3, 12, 6, Object.assign({ name: 'Barracks', roof: '#4a4a42' }, ft));
    B('fg_barracks2', 'house', FX + 3, FY + 11, 12, 6, Object.assign({ name: 'Barracks', roof: '#4a4a42' }, ft));
    B('fg_officers', 'hotel', FX + 17, FY + 3, 10, 9, Object.assign({ name: "Officers' Quarters", roof: '#3a4a5a' }, ft));
    B('fg_stockade', 'sheriff', FX + 29, FY + 3, 10, 8, Object.assign({ name: 'Stockade', sign: 'STOCKADE', roof: '#3a3a3a' }, ft));
    B('fg_store', 'general', FX + 29, FY + 14, 10, 8, Object.assign({ name: 'Sutler\'s Store', sign: 'SUTLER', roof: '#5a4a3a' }, ft));
    B('fg_stables', 'stables', FX + 3, FY + 19, 12, 9, Object.assign({ name: 'Cavalry Stables', roof: '#5a3a22' }, ft));
    P('flagpole', FX + 21, FY + 20); P('watertower', FX + 1, FY + 2); P('watertower', FX + FW - 3, FY + 2);
    P('hay', FX + 18, FY + 26); P('wagon', FX + 25, FY + 26); P('crate', FX + 34, FY + 25);
    this.stampLine(FX + 20, FY + FH - 1, FX + 20, FY + FH + 5, 1.5);
    wp('Fort Granger', [[FX + 8, FY + 18], [FX + 20, FY + 14], [FX + 20, FY + 24], [FX + 33, FY + 12], [FX + 20, FY + 30], [FX + 10, FY + 29], [FX + 35, FY + 27]]);
    newTowns.push({ name: 'Fort Granger', x0: FX - 4, y0: FY - 4, x1: FX + FW + 4, y1: FY + FH + 6, sheriff: 'fg_stockade', pop: 0, law: 4, soldiers: true });
    this.poi.fortGate = { x: (FX + 20.5) * TS, y: (FY + FH + 2) * TS };

    // Cottonwood Crossing — ranchers' settlement
    const CX = 548, CY = 410;
    this.fillRect(CX - 4, CY - 14, 46, 28, T.TOWN, true);
    this.stampLine(CX - 6, CY, CX + 44, CY, 1.6);
    const ct = { town: 'Cottonwood Crossing' };
    B('cc_grange', 'church', CX, CY - 12, 10, 10, Object.assign({ name: 'Grange Hall', roof: '#7a5a3a' }, ct));
    B('cc_general', 'general', CX + 12, CY - 10, 10, 8, Object.assign({ name: 'Cottonwood Mercantile', sign: 'MERCANTILE', roof: '#6d4b2f' }, ct));
    B('cc_house1', 'house', CX + 24, CY - 9, 7, 7, Object.assign({ roof: '#64412b' }, ct));
    B('cc_house2', 'house', CX + 2, CY + 3, 7, 7, Object.assign({ roof: '#53402f' }, ct));
    B('cc_house3', 'house', CX + 12, CY + 3, 7, 7, Object.assign({ roof: '#6a4630' }, ct));
    P('windmill', CX + 34, CY - 4); P('trough', CX + 22, CY + 3); P('hitch', CX + 28, CY + 3);
    for (let i = 0; i < 5; i++) P('grave', CX - 3 + (i % 3) * 2, CY - 13 + Math.floor(i / 3) * 3);
    wp('Cottonwood Crossing', [[CX - 2, CY], [CX + 10, CY], [CX + 22, CY], [CX + 34, CY], [CX + 40, CY]]);
    newTowns.push({ name: 'Cottonwood Crossing', x0: CX - 6, y0: CY - 15, x1: CX + 44, y1: CY + 13, sheriff: null, pop: 5, law: 0 });

    // ranches scattered across Ranch Country
    const ranches = [[352, 278, 'Delaney Ranch'], [478, 268, 'Hendry Ranch'], [372, 422, 'Hartley Ranch'], [628, 296, 'Coulter Ranch'], [520, 460, 'Bar-T Ranch'], [690, 420, 'Pruitt Ranch']];
    ranches.forEach(([rx, ry, name], i) => {
      this.fillRect(rx - 3, ry - 3, 34, 22, T.TOWN, false);
      this.reserve(rx - 4, ry - 4, 36, 24);
      B(`ranch${i}_house`, 'house', rx, ry, 8, 7, { name, roof: '#5f4630' });
      B(`ranch${i}_barn`, 'stables', rx + 11, ry - 1, 10, 8, { name: name + ' Barn', roof: '#8a2a1e' });
      for (let x = rx; x < rx + 28; x++) { P('fence_h', x, ry + 9); if (Math.abs(x - rx - 14) > 1) P('fence_h', x, ry + 17); }
      for (let y = ry + 10; y < ry + 17; y++) { P('fence_v', rx, y); P('fence_v', rx + 27, y); }
      P('windmill', rx + 24, ry + 4); P('hay', rx + 9, ry + 3); P('trough', rx + 14, ry + 12);
      this.frontierRanches = this.frontierRanches || [];
      this.frontierRanches.push({ x: (rx + 14) * TS, y: (ry + 13) * TS, name });
    });

    // Red Canyonlands — Rattlesnake Fortress in a canyon bowl
    const RX = 862, RY = 330;
    for (let ty = RY - 30; ty <= RY + 30; ty++) for (let tx = RX - 30; tx <= RX + 30; tx++) {
      const d = dist(tx, ty, RX, RY), r = 19 + nA(tx * 0.3, ty * 0.3) * 4;
      if (d < r) this.setTile(tx, ty, T.CANYON); else if (d < r + 7) this.setTile(tx, ty, T.ROCK);
    }
    this.reserve(RX - 22, RY - 22, 45, 45);
    this.stampLine(RX, RY + 10, RX, RY + 34, 1.6);
    B('rf_chapel', 'church', RX - 5, RY - 14, 10, 10, { name: 'Old Mission Chapel', roof: '#c8946a', adobe: true });
    for (const [dx, dy] of [[-12, -4], [6, -6], [10, 4], [-10, 6], [-4, 10], [14, -12]]) P('tent', RX + dx, RY + dy);
    P('campfire', RX, RY + 2); P('campfire', RX - 12, RY + 12, { small: true });
    P('watertower', RX - 15, RY - 12); P('watertower', RX + 13, RY + 12);
    for (const [dx, dy] of [[4, 7], [5, 7], [-6, -2], [9, -1]]) P('crate', RX + dx, RY + dy);
    P('wagon', RX - 3, RY + 15);
    this.banditCamps.push({ name: 'Rattlesnake Fortress', x: RX * TS, y: RY * TS, clearedAt: -99999, members: [], size: 9 });
    this.poi.rattlesnakeFortress = { x: RX * TS, y: (RY + 20) * TS };
    // natural arches and cliff ruins
    for (const [ax, ay] of [[760, 280], [930, 410], [1100, 300], [990, 450], [800, 420], [1180, 380]]) this.placeArch(ax, ay);
    for (const [cx, cy] of [[790, 300], [960, 300], [1060, 360], [880, 440], [1150, 270]]) this.placeCliffRuin(cx, cy);

    // Bonewhite Salt Flats — Hollow Creek ghost town
    const HX = 196, HY = 598;
    this.fillRect(HX - 14, HY - 10, 44, 26, T.SALT, true);
    this.stampLine(HX - 14, HY + 6, HX + 30, HY + 6, 1.4);
    const ht = { ruin: true, town: null };
    B('hc_school', 'house', HX, HY - 2, 8, 7, Object.assign({ name: 'Hollow Creek Schoolhouse', roof: '#e8e2d2', wallTint: '#d9d0bc' }, ht));
    B('hc_church', 'church', HX - 12, HY - 6, 9, 10, Object.assign({ name: 'Hollow Creek Church', roof: '#6a5a4a' }, ht));
    for (let i = 0; i < 5; i++) B(`hc_shack${i}`, 'house', HX + 10 + (i % 3) * 7, HY - 2 + Math.floor(i / 3) * 10, 6, 5, Object.assign({ name: 'Abandoned Shack', roof: '#5a5048' }, ht));
    P('stampmill', HX + 22, HY - 4); P('burntwagon', HX + 4, HY + 10); P('bones', HX - 2, HY + 9);
    for (let i = 0; i < 12; i++) P('grave', HX - 16 + (i % 6) * 2, HY + 12 + Math.floor(i / 6) * 2);
    this.banditCamps.push({ name: 'Hollow Creek Squatters', x: (HX + 18) * TS, y: (HY + 12) * TS, clearedAt: -99999, members: [], size: 3 });
    this.poi.hollowCreek = { x: HX * TS, y: (HY + 6) * TS };
    this.poi.lootCrates.push({ x: (HX + 3) * TS, y: (HY + 2) * TS }, { x: (HX + 14) * TS, y: (HY + 4) * TS });
    P('crate', HX + 3, HY + 1); P('crate', HX + 14, HY + 3);

    // Mesa Badlands — Last Water stage station
    const WX = 822, WY = 560;
    this.fillRect(WX - 8, WY - 6, 24, 16, T.CANYON, true);
    B('lw_station', 'house', WX - 4, WY - 4, 9, 6, { name: 'Last Water Stage Station', roof: '#7a5a3a', ruin: true });
    P('well', WX + 7, WY + 3); for (let x = WX - 6; x < WX + 12; x++) P('fence_h', x, WY + 8);
    this.poi.lastWater = { x: WX * TS, y: (WY + 4) * TS };

    // Rio Bravo — San Lucero on the south bank, with the only bridge for miles
    const SX = 640, rcy = Math.round(this.riverCY(SX)), SY = rcy + 16;
    this.fillRect(SX - 34, rcy + 5, 72, 34, T.TOWN, true);
    this.stampLine(SX + 1, rcy - 14, SX + 1, SY, 1.6);                       // bridge road
    this.stampLine(SX - 36, SY, SX + 38, SY, 1.8);                            // main street
    const st = { town: 'San Lucero', adobe: true };
    B('sl_cantina', 'saloon', SX - 30, SY - 10, 12, 8, Object.assign({ name: 'Cantina La Paloma', sign: 'CANTINA', roof: '#9a5d38' }, st));
    B('sl_general', 'general', SX - 16, SY - 10, 10, 8, Object.assign({ name: 'Mercado Arrieta', sign: 'MERCADO', roof: '#8a5a32' }, st));
    B('sl_sheriff', 'sheriff', SX + 4, SY - 10, 9, 8, Object.assign({ name: 'Casa de la Ley', sign: 'LEY', roof: '#7d5638' }, st));
    B('sl_gunsmith', 'gunsmith', SX + 15, SY - 10, 9, 8, Object.assign({ name: 'Armería Reyes', sign: 'ARMERIA', roof: '#86603a' }, st));
    B('sl_stables', 'stables', SX + 26, SY - 11, 12, 9, Object.assign({ name: 'Caballeriza', roof: '#7a5030' }, st));
    B('sl_mission', 'church', SX - 6, SY + 4, 12, 12, Object.assign({ name: 'Mission of San Lucero', roof: '#e8dcc0', wallTint: '#e8e0cc' }, st));
    for (let i = 0; i < 4; i++) B(`sl_house${i}`, 'house', [SX - 30, SX - 21, SX + 10, SX + 19][i], SY + 4, 7, 7, Object.assign({ roof: ['#a06a40', '#93613b', '#a87447', '#9a6a44'][i] }, st));
    P('well', SX - 5, SY - 3); for (let x = SX - 30; x <= SX + 34; x += 11) P('lamp', x, SY + 2);
    P('sign', SX + 4, rcy - 12, { text: 'SAN LUCERO' });
    wp('San Lucero', [[SX - 30, SY], [SX - 18, SY], [SX - 6, SY], [SX + 8, SY], [SX + 20, SY], [SX + 32, SY], [SX, SY - 3], [SX + 1, rcy + 8]]);
    newTowns.push({ name: 'San Lucero', x0: SX - 36, y0: rcy + 4, x1: SX + 38, y1: rcy + 40, sheriff: 'sl_sheriff', pop: 9, law: 2 });
    this.poi.sanLucero = { x: SX * TS, y: SY * TS };
    this.poi.sanLuceroBridge = { x: (SX + 1) * TS, y: rcy * TS };

    this.towns.push(...newTowns);

    // ---------- 5. roads, routed across the terrain
    const routes = [
      [[284, 124], [518, 120]],               // county east road → Silver Crown
      [[606, 120], [988, 120]],               // Silver Crown → Port Harlow
      [[564, 136], [568, 404]],               // Silver Crown → Cottonwood Crossing
      [[97, 190], [420, 352]],                // homestead road → Fort Granger
      [[421, 352], [544, 410]],               // Fort Granger → Cottonwood
      [[592, 410], [862, 364]],               // Cottonwood → Rattlesnake Fortress
      [[1030, 146], [866, 360]],              // Port Harlow → Canyonlands
      [[420, 352], [208, 604]],               // Fort Granger → Hollow Creek
      [[204, 202], [184, 604]],               // Mesa Flats country → Hollow Creek
      [[226, 604], [SX + 1, rcy - 14]],       // Hollow Creek → San Lucero bridge
      [[568, 416], [822, 556]],               // Cottonwood → Last Water
      [[822, 566], [SX + 1, rcy - 14]],       // Last Water → San Lucero
      [[SX + 38, SY], [1150, Math.round(this.riverCY(1150)) + 6]],       // San Lucero → east ford
      [[SX - 36, SY], [150, Math.round(this.riverCY(150)) + 6]],        // San Lucero → west ford
      [[420, 352], [420, Math.round(this.riverCY(420)) - 6]],   // Fort Granger → middle ford
      [[900, Math.round(this.riverCY(900)) - 6], [866, 360]]    // east-middle ford → Canyonlands
    ];
    for (const [a, b] of routes) this.routeRoad(a, b, nA);
    // ranch lanes join whichever road passes closest
    for (const r of this.frontierRanches) {
      const from = [Math.round(r.x / TS), Math.round(r.y / TS) + 6], to = this.nearestRoadNode(from[0], from[1]);
      if (to) this.routeRoad(from, to, nA);
    }

    // ---------- 6. treasure caches in the new country
    const newCaches = [[700, 56, 'Frostpeak Prospector\'s Cache'], [1000, 400, 'Canyon Bandit Hoard'], [300, 680, 'Salt Flats Strongbox'], [1100, 900, 'Border Smuggler\'s Stash'], [1230, 200, 'Lakeshore Wreck'], [960, 640, 'Badlands Saddlebags']];
    for (const [tx, ty, name] of newCaches) {
      for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (this.tile(x, y) === T.ROCK || this.tile(x, y) === T.WATER) this.setTile(x, y, T.SAND);
      this.reserve(tx - 1, ty - 1, 3, 3);
      P('xmark', tx, ty); P('stones', tx + 1, ty);
      this.treasures.push({ id: this.treasures.length, x: tx * TS + 8, y: ty * TS + 8, name });
    }

    // ---------- 7. vegetation and rocks
    for (let ty = 2; ty < H - 2; ty++) for (let tx = 2; tx < W - 2; tx++) {
      if (tx < OW && ty < OH) continue;
      if (this.reserved[ty * W + tx]) continue;
      const t = this.tiles[ty * W + tx], r = rng();
      switch (t) {
        case T.SNOW: if (r < 0.04) P('snowpine', tx, ty, { v: rng() }); else if (r < 0.046) P('rock', tx, ty); else if (r < 0.07) P('snowdrift', tx, ty); break;
        case T.SNOWFOREST: if (r < 0.15) P('snowpine', tx, ty, { v: rng() }); else if (r < 0.17) P('snowdrift', tx, ty); break;
        case T.FOREST: if (r < 0.12) P('pine', tx, ty, { v: rng() }); else if (r < 0.15) P('bush', tx, ty, { v: rng() }); else if (r < 0.2) P('tuft', tx, ty); break;
        case T.PRAIRIE: if (r < 0.004) P('oak', tx, ty, { v: rng() }); else if (r < 0.011) P('bush', tx, ty, { v: rng() }); else if (r < 0.07) P('tuft', tx, ty); else if (r < 0.1) P('flowers', tx, ty); break;
        case T.GRASS: if (r < 0.008) P('oak', tx, ty, { v: rng() }); else if (r < 0.02) P('bush', tx, ty, { v: rng() }); else if (r < 0.07) P('tuft', tx, ty); break;
        case T.CLAY: if (r < 0.005) P('rock', tx, ty); else if (r < 0.007) P('boulder', tx, ty); else if (r < 0.011) P('cactus', tx, ty, { v: rng() }); else if (r < 0.014) P('hoodoo', tx, ty, { v: rng() }); else if (r < 0.016) P('deadtree', tx, ty); break;
        case T.SALT: if (r < 0.0008) P('bones', tx, ty); else if (r < 0.002) P('stones', tx, ty); break;
        case T.SAND: if (r < 0.007) P('cactus', tx, ty, { v: rng() }); else if (r < 0.012) P('cactus_s', tx, ty); else if (r < 0.016) P('rock', tx, ty); else if (r < 0.019) P('hoodoo', tx, ty, { v: rng() }); else if (r < 0.02) P('boulder', tx, ty); else if (r < 0.022) P('bones', tx, ty); break;
        case T.SCRUB: if (r < 0.012) P('bush', tx, ty, { v: rng() }); else if (r < 0.016) P('deadtree', tx, ty); else if (r < 0.05) P('tuft', tx, ty); else if (r < 0.055) P('cactus_s', tx, ty); break;
        case T.DRYBED: if (r < 0.02) P('stones', tx, ty); break;
      }
    }
  },

  /* A* over a coarse grid (4 tiles per cell), then stamp the route as a road */
  routeRoad(a, b, noise) {
    const S = 4, GW = Math.ceil(this.W / S), GH = Math.ceil(this.H / S);
    const cost = (gx, gy) => {
      const tx = gx * S + 2, ty = gy * S + 2, t = this.tile(tx, ty);
      let c;
      switch (t) {
        case T.ROCK: c = 14; break; case T.WATER: c = 600; break; case T.WALL: case T.FLOOR: c = 900; break;
        case T.ICE: c = 3; break; case T.SNOWFOREST: case T.FOREST: c = 2.2; break; case T.SNOW: c = 1.6; break;
        case T.SHALLOW: c = 2.5; break; case T.BRIDGE: c = 0.6; break; case T.ROAD: c = 0.45; break; case T.TOWN: c = 0.9; break;
        case T.GRAVEL: c = 2; break; default: c = 1.1;
      }
      return c + noise(gx * 0.3, gy * 0.3) * 0.5;
    };
    const sx = Math.floor(a[0] / S), sy = Math.floor(a[1] / S), ex = Math.floor(b[0] / S), ey = Math.floor(b[1] / S);
    const start = sy * GW + sx, goal = ey * GW + ex;
    const g = new Float32Array(GW * GH).fill(Infinity), came = new Int32Array(GW * GH).fill(-1), closed = new Uint8Array(GW * GH);
    const heap = new MinHeap(); g[start] = 0; heap.push(start, 0);
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]];
    let found = false, n = 0;
    while (heap.size && n < 90000) {
      const cur = heap.pop(); if (closed[cur]) continue; closed[cur] = 1; n++;
      if (cur === goal) { found = true; break; }
      const cx = cur % GW, cy = (cur / GW) | 0;
      for (const [dx, dy, dc] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (nx < 1 || ny < 1 || nx >= GW - 1 || ny >= GH - 1) continue;
        const ni = ny * GW + nx, ng = g[cur] + dc * cost(nx, ny);
        if (ng < g[ni]) { g[ni] = ng; came[ni] = cur; heap.push(ni, ng + Math.hypot(nx - ex, ny - ey) * 0.5); }
      }
    }
    if (!found) return;
    const pts = [];
    for (let c = goal; c !== -1; c = came[c]) pts.push([(c % GW) * S + 2, ((c / GW) | 0) * S + 2]);
    pts.reverse();
    pts[0] = a; pts[pts.length - 1] = b;
    // smooth: keep every other cell so roads curve instead of zig-zagging
    const smooth = pts.filter((p, i) => i === 0 || i === pts.length - 1 || i % 2 === 0);
    for (let i = 0; i < smooth.length - 1; i++) this.stampLine(smooth[i][0], smooth[i][1], smooth[i + 1][0], smooth[i + 1][1], 1.4);
  },

  nearestRoadNode(tx, ty) {
    let best = null, bd = 1e9;
    for (let r = 4; r < 90 && !best; r += 4) for (let a = 0; a < TAU; a += 0.2) {
      const x = Math.round(tx + Math.cos(a) * r), y = Math.round(ty + Math.sin(a) * r);
      if (this.tile(x, y) === T.ROAD) { const d = dist(x, y, tx, ty); if (d < bd) { bd = d; best = [x, y]; } }
    }
    return best;
  },

  placeArch(tx, ty) {
    for (let y = ty - 2; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 6; x++) if (this.tile(x, y) === T.ROCK) this.setTile(x, y, T.CLAY);
    this.reserve(tx - 1, ty - 3, 8, 5);
    this.addProp('arch', tx, ty);
    // only the two stone legs block movement
    for (const x of [tx, tx + 5]) this.solid[this.idx(x, ty)] |= SOL.ALL;
  },
  placeCliffRuin(tx, ty) {
    for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 3; x++) if (this.tile(x, y) === T.ROCK) this.setTile(x, y, T.CLAY);
    this.reserve(tx - 1, ty - 2, 5, 4);
    this.addProp('cliffruin', tx, ty);
  },

  frontierRegionName(x, y) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (dist(tx, ty, 862, 330) < 28) return 'Rattlesnake Fortress';
    if (dist(tx, ty, 196, 600) < 24) return 'Hollow Creek';
    if (dist(tx, ty, 822, 560) < 14) return 'Last Water';
    if (dist(tx, ty, 562, 96) < 14) return 'Silver Crown Mine';
    const k = this.regionKind(tx, ty);
    if (k === 'border' && this.tile(tx, ty) === T.SHALLOW) return 'Rio Bravo Ford';
    return REGION_NAMES[k] || null;
  }
});
