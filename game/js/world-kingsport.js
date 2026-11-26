/* Outlaw County — world-kingsport.js (v2.9)
 * Kingsport: a big port city on a new strip of map in the far east.
 *
 *   x 1280 ─────────── 1392 ───────────── 1660 ──────── 1792
 *   │ Kingsport      │ Nob     │ Downtown            │ Harbor  │
 *   │ Outskirts      │ Heights │ (bank, opera, …)    │ Point   │
 *   │ (farms)        ├─────────┴── Union rail yard ──┼─────────┤ row 146
 *   │                │ The     │ Factory   │ Water-  │ Kingsport
 *   │                │ Flats   │ District  │ front   │ Bay  ◇ Iron Island
 *   │                │         ├───────────┤ (piers) │
 *   │                │         │ Riverside │         │
 *   │ ~~~~~~~~~~~~ Kings River and its delta ~~~~~~~~~~~~~~~~~~~ │ row ~372
 *   │ Tidewater Pines                         Gull Harbor  ~sea~ │
 *   └─────────────────────────────────────── Rio Bravo ───────── ┘
 * The city is a grid of cobbled streets: 11 × 15 blocks of 24 × 18 tiles.
 */
'use strict';

const KP = { X0: 1392, Y0: 64, BW: 24, BH: 18, NI: 11, NJ: 15, STRIP: 1284 };
KP.X1 = KP.X0 + KP.NI * KP.BW;          // 1656: the last street ends here, then the boardwalk and the bay
KP.Y1 = KP.Y0 + KP.NJ * KP.BH;          // 334
const KP_DISTRICTS = [
  { name: 'Nob Heights', i: [0, 2], j: [0, 3] },
  { name: 'Downtown Kingsport', i: [3, 10], j: [0, 3] },
  { name: 'The Flats', i: [0, 3], j: [4, 14] },
  { name: 'Factory District', i: [4, 7], j: [4, 9] },
  { name: 'Riverside', i: [4, 7], j: [10, 14] },
  { name: 'The Waterfront', i: [8, 10], j: [4, 14] }
];
const KP_NAMES = KP_DISTRICTS.map(d => d.name);
const KP_RX = /Kingsport|Nob Heights|The Flats|Factory District|Riverside|Waterfront|Iron Island|Gull Harbor|Tidewater|Kings River|Harbor Point/;

Object.assign(PROP_DEFS, {
  callbox: { fp: [1, 1], sol: SOL.MOVE }, smokestack: { fp: [2, 1], sol: SOL.ALL }, hydrant: { fp: [1, 1], sol: SOL.MOVE },
  newsstand: { fp: [2, 1], sol: SOL.MOVE | SOL.SHOT }, statue: { fp: [2, 1], sol: SOL.ALL }, fountain: { fp: [3, 1], sol: SOL.MOVE | SOL.SHOT },
  stopsign: { fp: [1, 1], sol: SOL.MOVE }, bollard: { fp: [1, 1], sol: SOL.MOVE }, ship: { fp: [12, 3], sol: SOL.MOVE | SOL.SHOT },
  boxcar: { fp: [5, 1], sol: SOL.ALL }, hedge: { fp: [1, 1], sol: SOL.MOVE | SOL.VIS }
});

/* shops */
Object.assign(SHOPS, {
  kp_bank: { name: 'Kingsport Trust Company', type: 'bank', till: [400, 700] },
  kp_general: { name: "Whitcombe's Department Store", type: 'general', till: [120, 220] },
  kp_market: { name: 'Riverside Market', type: 'general', till: [60, 120] },
  kp_gunsmith: { name: 'Atlantic Arms Company', type: 'gunsmith', till: [150, 260] },
  kp_hotel: { name: 'The Grand Atlantic Hotel', type: 'hotel', till: [90, 160] },
  kp_cardroom: { name: 'The Royal Flush Card Room', type: 'saloon', till: [120, 240] },
  kp_saloon: { name: 'The Rusty Nail', type: 'saloon', till: [50, 110] },
  kp_dock: { name: 'The Salty Dog', type: 'saloon', till: [60, 120] },
  kp_stables: { name: 'Riverside Livery', type: 'stables', till: [50, 100] },
  kp_police: { name: 'Kingsport Police Headquarters', type: 'sheriff' },
  kp_station: { name: 'Kingsport Union Station', type: 'station', till: [80, 140] },
  gh_general: { name: 'Gull Harbor Chandlery', type: 'general', till: [40, 90] },
  gh_saloon: { name: 'The Drowned Man', type: 'saloon', till: [40, 90] }
});
if (typeof SHOP_STOCK !== 'undefined') SHOP_STOCK.kp_stables = { buy: ['horse:morgan', 'horse:arabian', 'horse:quarter', 'horse:thoroughbred', 'oats', 'service:groom'].filter(s => !s.startsWith('horse:') || typeof HORSE_BREEDS === 'undefined' || HORSE_BREEDS[s.slice(6)]), sells: [] };

Object.assign(World, {
  kpCoastX(ty) { return ty < 150 ? 1738 + Math.sin(ty * 0.05) * 6 : 1722 + Math.sin(ty * 0.013) * 14 + Math.sin(ty * 0.05) * 4; },
  kpRiverY(tx) { return 372 + Math.sin(tx * 0.021) * 9 + Math.sin(tx * 0.057) * 3; },
  kpDistrictAt(tx, ty) {
    const i = Math.floor((tx - KP.X0) / KP.BW), j = Math.floor((ty - KP.Y0) / KP.BH);
    for (const d of KP_DISTRICTS) if (i >= d.i[0] && i <= d.i[1] && j >= d.j[0] && j <= d.j[1]) return d.name;
    return null;
  },

  generateKingsport(seed) {
    const W = this.W, H = this.H, rng = mulberry32(seed + 404), R = n => Math.floor(rng() * n), ri = (a, b) => a + R(b - a + 1);
    const nA = makeNoise(seed + 41), nB = makeNoise(seed + 42), nC = makeNoise(seed + 43);
    const set = (tx, ty, t) => { if (this.inb(tx, ty)) this.tiles[ty * W + tx] = t; };
    const SOUTH = MEX_Y - 8, startX = ty => Math.floor(KP.STRIP + (nA(ty * 0.03, 3) - 0.5) * 16);
    const rail = ty => ty >= RAIL_ROW - 1 && ty <= RAIL_ROW + 1;

    // ---------- 0. wipe what the frontier pass left on the strip
    this.props = this.props.filter(p => !(p.tx >= startX(p.ty) - 1 && p.ty < SOUTH));
    for (let ty = 0; ty < SOUTH; ty++) for (let tx = startX(ty); tx < W; tx++) { if (rail(ty)) continue; this.solid[ty * W + tx] = 0; this.reserved[ty * W + tx] = 0; }

    // ---------- 1. countryside, coast, bay
    for (let ty = 2; ty < SOUTH; ty++) for (let tx = startX(ty); tx < W; tx++) {
      if (rail(ty) && tx < W - 2) continue;                       // keep the railroad running east
      const cx = this.kpCoastX(ty);
      let t;
      if (ty > 760) {                                              // the Rio Bravo country keeps its land; only the sea is new
        if (tx > cx) t = T.WATER; else if (tx > cx - 4) t = T.SAND; else continue;
      } else {
        const e = fbm(nC, tx * 0.045, ty * 0.045, 3), f = fbm(nB, tx * 0.02, ty * 0.02, 3);
        if (ty > 440) t = f > 0.58 ? T.FOREST : e > 0.62 ? T.FOREST : e > 0.4 ? T.GRASS : T.PRAIRIE;          // Tidewater Pines
        else t = f > 0.66 ? T.FOREST : e > 0.55 ? T.GRASS : T.PRAIRIE;                                         // outskirts farmland
        if (tx > cx) t = T.WATER; else if (tx > cx - 4) t = T.SAND;
      }
      if (ty < 5 + nA(tx * 0.15, 2) * 4 || tx >= W - 3) t = tx > this.kpCoastX(ty) ? T.WATER : T.ROCK;
      set(tx, ty, t);
    }
    // Kingsport Bay
    for (let ty = 150; ty < 352; ty++) for (let tx = KP.X1 + 4; tx < W; tx++) {
      if (!rail(ty)) set(tx, ty, ty < 154 || ty > 348 ? T.SHALLOW : T.WATER);
    }
    // the Kings River and its delta
    for (let tx = startX(372); tx < W; tx++) {
      const cy = this.kpRiverY(tx), delta = clamp((tx - 1540) / 140, 0, 1), hw = 2.6 + delta * 10;
      for (let ty = Math.floor(cy - hw - 2); ty <= cy + hw + 2; ty++) {
        const d = Math.abs(ty + 0.5 - cy);
        if (d < hw) set(tx, ty, delta > 0.15 && nB(tx * 0.18, ty * 0.18) > 0.6 - delta * 0.1 ? (nA(tx * 0.3, ty * 0.3) > 0.5 ? T.GRASS : T.SHALLOW) : (d > hw - 1.2 && delta > 0.3 ? T.SHALLOW : T.WATER));
      }
    }

    // ---------- 2. the city grid
    const B = (id, type, x, y, w, h, opts = {}) => this.addBuilding(Object.assign({ id, type, x, y, w, h, city: true }, opts));
    const P = (t, tx, ty, o) => this.addProp(t, tx, ty, o);
    const fill = (x, y, w, h, t) => { for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) if (!rail(ty)) set(tx, ty, t); };
    fill(KP.X0 - 2, KP.Y0 - 2, KP.X1 - KP.X0 + 6, KP.Y1 - KP.Y0 + 6, T.COBBLE);
    this.reserve(KP.X0 - 2, KP.Y0 - 2, KP.X1 - KP.X0 + 8, KP.Y1 - KP.Y0 + 6);
    // the boardwalk along the bay
    for (let ty = KP.Y0; ty < KP.Y1 + 3; ty++) for (let tx = KP.X1; tx < KP.X1 + 4; tx++) if (!rail(ty)) set(tx, ty, ty >= 150 ? T.BOARD : T.PAVE);
    const brick = ['#7a3424', '#8a4030', '#6a2e22', '#94503a', '#7a5040', '#5a3a30', '#8a5a48', '#6a4a3a'];
    const slate = ['#4a4e58', '#3e424a', '#5a5048', '#4a4038', '#55585e', '#3a3a40'];
    const gardenRoof = ['#5a6a7a', '#6a5a7a', '#4a5a6a', '#7a6a5a'];
    const blocks = [];
    this.kpWaypoints = {}; for (const n of KP_NAMES) this.kpWaypoints[n] = [];
    this.kpLandmarks = {};
    for (let j = 0; j < KP.NJ; j++) for (let i = 0; i < KP.NI; i++) {
      const ox = KP.X0 + i * KP.BW, oy = KP.Y0 + j * KP.BH, district = this.kpDistrictAt(ox + 5, oy + 5);
      blocks.push({ i, j, ox, oy, district, lot: { x: ox + 4, y: oy + 4, w: KP.BW - 5, h: KP.BH - 5 } });
      // sidewalk ring
      fill(ox + 3, oy + 3, KP.BW - 3, KP.BH - 3, T.PAVE);
      const wp = this.kpWaypoints[district];
      if (wp) wp.push({ x: (ox + 1) * TS + 8, y: (oy + 1) * TS + 8 }, { x: (ox + 12) * TS + 8, y: (oy + 17) * TS + 8 });
    }
    // the lots themselves
    const lotFill = (b, t) => fill(b.lot.x, b.lot.y, b.lot.w, b.lot.h, t);
    for (const b of blocks) lotFill(b, b.district === 'Nob Heights' ? T.GRASS : b.district === 'Riverside' && (b.i + b.j) % 5 === 0 ? T.GRASS : T.TOWN);

    // buildings in a row along the south side of a lot, doors onto the sidewalk
    const used = new Set();
    const row = (b, list) => {
      let x = b.lot.x;
      for (const o of list) {
        const w = Math.min(o.w, b.lot.x + b.lot.w - x); if (w < 5) break;
        const h = Math.min(o.h, b.lot.h), y = b.lot.y + b.lot.h - h;
        const bb = B(o.id || `kp_${b.i}_${b.j}_${x}`, o.type || 'house', x, y, w, h, Object.assign({ town: b.district, roof: pick(slate), wallTint: pick(brick) }, o.opts || {}));
        if (o.id) this.kpLandmarks[o.id] = bb;
        x += w + (o.gap !== undefined ? o.gap : 1);
      }
      used.add(b.i + ',' + b.j);
      return x;
    };
    const at = (i, j) => blocks.find(b => b.i === i && b.j === j);
    const randomRow = (b, wMin, wMax, hMin, hMax, opts = () => ({})) => {
      const list = []; let room = b.lot.w;
      while (room >= wMin) { const w = Math.min(room, ri(wMin, wMax)); list.push({ w, h: ri(hMin, hMax), opts: opts(list.length) }); room -= w + 1; }
      row(b, list);
    };

    // --- Downtown landmarks
    const L = (i, j, list) => row(at(i, j), list);
    L(3, 0, [{ id: 'kp_hotel', type: 'hotel', w: 12, h: 11, opts: { name: SHOPS.kp_hotel.name, sign: 'GRAND ATLANTIC', roof: '#3a4a5a', wallTint: '#c8b898' } }, { w: 6, h: 9 }]);
    L(4, 0, [{ id: 'kp_opera', type: 'church', w: 19, h: 12, opts: { name: 'Kingsport Opera House', sign: 'OPERA HOUSE', roof: '#5a2a3a', wallTint: '#d8c8a8', opera: true } }]);
    L(5, 0, [{ id: 'kp_cardroom', type: 'saloon', w: 13, h: 10, opts: { name: SHOPS.kp_cardroom.name, sign: 'CARD ROOM', roof: '#2a3a2a', wallTint: '#5a2a2a' } }, { w: 5, h: 8 }]);
    L(4, 1, [{ id: 'kp_cityhall', type: 'church', w: 19, h: 12, opts: { name: 'Kingsport City Hall', sign: 'CITY HALL', roof: '#5a6a5a', wallTint: '#e0d8c8', dome: true } }]);
    L(5, 1, [{ id: 'kp_bank', type: 'bank', w: 13, h: 11, opts: { name: SHOPS.kp_bank.name, sign: 'KINGSPORT TRUST', roof: '#3a3a44', wallTint: '#d8d0c0' } }, { w: 5, h: 9 }]);
    L(6, 1, [{ id: 'kp_herald', type: 'general', w: 10, h: 9, opts: { name: 'The Kingsport Herald', sign: 'HERALD', roof: '#3a3a3a', wallTint: '#6a5a4a' } }, { id: 'kp_jeweler', type: 'general', w: 8, h: 8, opts: { name: 'Van Doren Jewelers', sign: 'JEWELER', roof: '#2a2a3a', wallTint: '#3a3a5a', awning: '#5a3a7a' } }]);
    L(7, 1, [{ id: 'kp_general', type: 'general', w: 19, h: 11, opts: { name: SHOPS.kp_general.name, sign: 'WHITCOMBE\'S', roof: '#4a3a2a', wallTint: '#a8846a', awning: '#2a5a3a' } }]);
    L(6, 2, [{ id: 'kp_police', type: 'sheriff', w: 13, h: 10, opts: { name: SHOPS.kp_police.name, sign: 'POLICE', roof: '#2a3040', wallTint: '#5a5a62' } }, { w: 5, h: 8 }]);
    L(7, 2, [{ id: 'kp_gunsmith', type: 'gunsmith', w: 11, h: 9, opts: { name: SHOPS.kp_gunsmith.name, sign: 'ATLANTIC ARMS', roof: '#3a3a3a', wallTint: '#6a4a3a', awning: '#7a2a20' } }, { w: 7, h: 9 }]);
    // a park with a statue in the middle of downtown
    { const b = at(5, 2); lotFill(b, T.GRASS); fill(b.lot.x + 8, b.lot.y, 3, b.lot.h, T.PAVE); fill(b.lot.x, b.lot.y + 5, b.lot.w, 3, T.PAVE);
      P('statue', b.lot.x + 8, b.lot.y + 6); for (const [dx, dy] of [[2, 2], [15, 2], [2, 10], [15, 11], [5, 12]]) P('oak', b.lot.x + dx, b.lot.y + dy, { v: rng() });
      P('lamp', b.lot.x + 7, b.lot.y + 4); P('lamp', b.lot.x + 11, b.lot.y + 9); used.add('5,2'); this.kpLandmarks.park = { x: (b.lot.x + 9) * TS, y: (b.lot.y + 8) * TS }; }
    // --- Nob Heights: mansions on big green lots
    for (const b of blocks.filter(b => b.district === 'Nob Heights')) {
      const mansion = b.i === 1 && b.j === 1;
      row(b, [{ id: mansion ? 'kp_mansion' : undefined, w: mansion ? 15 : ri(11, 14), h: mansion ? 10 : ri(8, 9), gap: 0, opts: { name: mansion ? 'Ashford Mansion' : pick(['Whitlow', 'Carrington', 'Pemberton', 'Vance', 'Hartwell', 'Sterling', 'Blackwood', 'Sinclair', 'Langley', 'Montague']) + ' House', roof: pick(gardenRoof), wallTint: pick(['#e0d8c8', '#d8ccb8', '#c8c0b0', '#e8e0d0']), mansion: true } }]);
      for (let k = 0; k < 4; k++) P('oak', b.lot.x + b.lot.w - 2 - (k % 2) * 2, b.lot.y + 1 + k * 3, { v: rng() });
      for (let tx = b.lot.x; tx < b.lot.x + b.lot.w; tx += 1) if (tx % 4) P('hedge', tx, b.lot.y);
      P('fountain', b.lot.x + 2, b.lot.y + 2); P('lamp', b.lot.x + b.lot.w - 1, b.lot.y + b.lot.h);
    }
    // --- the rail corridor: Union Station, freight yard and payroll office
    for (const b of blocks.filter(b => b.j === 4)) {
      fill(b.lot.x - 1, b.lot.y - 1, b.lot.w + 2, b.lot.h + 2, T.GRAVEL);
      used.add(b.i + ',4');
    }
    { const b = at(5, 4); B('kp_station', 'station', b.lot.x, RAIL_ROW - 8, 16, 6, { town: 'Factory District', name: SHOPS.kp_station.name, sign: 'UNION STATION', roof: '#2a4a40', wallTint: '#a07a5a', city: true }); fill(b.lot.x - 2, RAIL_ROW - 2, 20, 1, T.BOARD); }
    { const b = at(6, 4); this.kpLandmarks.kp_payroll = B('kp_payroll', 'bank', b.lot.x + 2, RAIL_ROW - 8, 12, 6, { town: 'Factory District', name: 'Union Rail Payroll Office', sign: 'PAYROLL', roof: '#3a3a3a', wallTint: '#6a5040', city: true }); }
    for (const i of [2, 3, 8, 9]) { const b = at(i, 4); P('boxcar', b.lot.x + 2, RAIL_ROW + 5); P('boxcar', b.lot.x + 10, RAIL_ROW + 5); P('crate', b.lot.x + 16, RAIL_ROW - 3); P('barrel', b.lot.x + 17, RAIL_ROW - 3); }
    this.kpLandmarks.yard = { x: (at(3, 4).lot.x + 8) * TS, y: (RAIL_ROW + 3) * TS };
    // --- the Flats: crowded tenements, a saloon, the boxing club, a church
    L(1, 7, [{ id: 'kp_saloon', type: 'saloon', w: 12, h: 9, opts: { name: SHOPS.kp_saloon.name, sign: 'RUSTY NAIL', roof: '#3a3030', wallTint: '#6a4a3a' } }, { w: 6, h: 9 }]);
    L(2, 9, [{ id: 'kp_gym', type: 'house', w: 14, h: 10, opts: { name: 'Ironworks Athletic Club', sign: 'BOXING', roof: '#3a3a3a', wallTint: '#5a4a40', gym: true } }, { w: 4, h: 8 }]);
    L(2, 12, [{ id: 'kp_church', type: 'church', w: 12, h: 12, opts: { name: "St. Brigid's Church", roof: '#4a4a52', wallTint: '#8a8070', steeple: true } }, { w: 6, h: 9 }]);
    // --- Factory District
    const works = [['FOUNDRY', 'Kingsport Iron Foundry'], ['TEXTILE MILL', 'Atlantic Textile Mill'], ['CANNERY', 'Bayside Cannery'], ['BREWERY', 'Kessler Brewing Co.'], ['TANNERY', 'Hobbs Tannery'], ['GASWORKS', 'Kingsport Gas Light Co.'], ['SAWMILL', 'Kings River Sawmill'], ['PRINTWORKS', 'Ledger Printing Works']];
    let wk = 0;
    for (const b of blocks.filter(b => b.district === 'Factory District' && !used.has(b.i + ',' + b.j))) {
      const [sign, name] = works[wk++ % works.length];
      row(b, [{ w: 19, h: 11, opts: { name, sign, roof: pick(slate), wallTint: pick(brick), factory: true } }]);
      P('smokestack', b.lot.x + 15, b.lot.y + 1); P('crate', b.lot.x + 1, b.lot.y + 1); P('barrel', b.lot.x + 3, b.lot.y + 1);
    }
    // --- Riverside: market, livery, park, small houses
    L(5, 11, [{ id: 'kp_market', type: 'general', w: 14, h: 9, opts: { name: SHOPS.kp_market.name, sign: 'MARKET', roof: '#6a5a3a', wallTint: '#8a6a4a', awning: '#a0702a' } }, { w: 4, h: 7 }]);
    L(4, 13, [{ id: 'kp_stables', type: 'stables', w: 13, h: 9, opts: { name: SHOPS.kp_stables.name, roof: '#6a4a2a', wallTint: '#7a5434' } }, { w: 5, h: 8 }]);
    { const b = at(6, 12); lotFill(b, T.GRASS); P('fountain', b.lot.x + 8, b.lot.y + 7); for (let k = 0; k < 7; k++) P('oak', b.lot.x + 1 + R(b.lot.w - 2), b.lot.y + 1 + R(b.lot.h - 2), { v: rng() }); used.add('6,12'); this.kpLandmarks.riverPark = { x: (b.lot.x + 9) * TS, y: (b.lot.y + 8) * TS }; }
    // --- the Waterfront: warehouses, the Salty Dog, fish market
    L(9, 6, [{ id: 'kp_dock', type: 'saloon', w: 12, h: 9, opts: { name: SHOPS.kp_dock.name, sign: 'SALTY DOG', roof: '#3a4a4a', wallTint: '#5a4a3a' } }, { w: 6, h: 8 }]);
    L(10, 8, [{ id: 'kp_harbormaster', type: 'house', w: 10, h: 8, opts: { name: "Harbor Master's Office", sign: 'HARBOR MASTER', roof: '#2a3a4a', wallTint: '#8a7a6a' } }, { w: 8, h: 8, opts: { name: 'Fish Market', sign: 'FISH', roof: '#4a5a5a', wallTint: '#6a6a5a' } }]);
    used.add('0,11'); used.add('9,12'); used.add('3,13');
    let wh = 1;
    for (const b of blocks.filter(b => b.district === 'The Waterfront' && !used.has(b.i + ',' + b.j))) row(b, [{ w: 19, h: ri(9, 11), opts: { name: `Warehouse ${wh}`, sign: `WAREHOUSE ${wh++}`, roof: pick(slate), wallTint: pick(['#6a5a4a', '#5a4a3a', '#7a6a5a']), warehouse: true } }]);

    // --- gang hideouts: open yards behind high fences
    const yard = (i, j, name, gang) => {
      const b = at(i, j);
      lotFill(b, T.TOWN); used.add(i + ',' + j);
      for (let tx = b.lot.x; tx < b.lot.x + b.lot.w; tx++) { if (Math.abs(tx - (b.lot.x + 9)) > 1) { P('fence_h', tx, b.lot.y); P('fence_h', tx, b.lot.y + b.lot.h - 1); } }
      B(`kp_hide_${gang}`, 'house', b.lot.x + 2, b.lot.y + 1, 9, 7, { town: b.district, name: name, roof: '#3a3a3a', wallTint: '#4a3a30', city: true });
      P('campfire', b.lot.x + 13, b.lot.y + 6, { small: true }); P('crate', b.lot.x + 15, b.lot.y + 3); P('crate', b.lot.x + 16, b.lot.y + 3); P('barrel', b.lot.x + 15, b.lot.y + 9); P('barrel', b.lot.x + 3, b.lot.y + 10);
      this.banditCamps.push({ name, x: (b.lot.x + 12) * TS, y: (b.lot.y + 8) * TS, clearedAt: -99999, members: [], size: 6, gang, city: true });
    };
    // --- everything else: rows of brick buildings and tenements
    for (const b of blocks) {
      if (used.has(b.i + ',' + b.j)) continue;
      if (b.district === 'The Flats') { randomRow(b, 5, 7, 8, 11, () => ({ tenement: true, roof: pick(slate), wallTint: pick(brick) })); }
      else if (b.district === 'Riverside') randomRow(b, 6, 8, 7, 9, () => ({ roof: pick(['#6a4a3a', '#5a4a4a', '#7a5a3a', '#4a5a5a']), wallTint: pick(['#a08060', '#8a7a6a', '#b09070', '#7a6a5a']) }));
      else randomRow(b, 7, 10, 8, 11, () => ({ roof: pick(slate), wallTint: pick(brick), office: true }));
    }
    yard(0, 11, 'Gaslight Boys Hideout', 'gaslight');
    yard(9, 12, 'Dockside Hooks Hideout', 'hooks');
    // lamps, call boxes and hydrants at the corners
    this.kpCallboxes = [];
    for (let j = 0; j <= KP.NJ; j++) for (let i = 0; i <= KP.NI; i++) {
      const cx = KP.X0 + i * KP.BW + 3, cy = KP.Y0 + j * KP.BH + 3;
      if (rail(cy) || rail(cy - 1) || cy > KP.Y1 || cx > KP.X1) continue;
      if (this.tile(cx, cy) !== T.PAVE) continue;
      P('lamp', cx, cy);
      if ((i + j) % 3 === 0 && this.tile(cx + 1, cy) === T.PAVE) { P('callbox', cx + 1, cy); this.kpCallboxes.push({ x: (cx + 1.5) * TS, y: (cy + 1) * TS }); }
      else if ((i + j) % 3 === 1 && this.tile(cx + 1, cy) === T.PAVE) P('hydrant', cx + 1, cy);
    }
    for (const b of blocks) if (b.district === 'Downtown Kingsport' && (b.i + b.j) % 2 === 0 && this.tile(b.lot.x + 9, b.lot.y + b.lot.h) === T.PAVE) P('lamp', b.lot.x + 9, b.lot.y + b.lot.h);
    // newsstands
    for (const [i, j] of [[4, 2], [7, 3], [2, 6], [6, 8], [9, 10]]) { const b = at(i, j); if (this.tile(b.lot.x + 2, b.lot.y - 1) === T.PAVE) P('newsstand', b.lot.x + 2, b.lot.y - 1); }

    // ---------- 3. piers, ships, Harbor Point, Iron Island
    this.kpPiers = [];
    for (const py of [170, 196, 222, 290, 316]) {
      if (rail(py) || rail(py + 1) || rail(py + 2)) continue;
      for (let ty = py; ty < py + 3; ty++) for (let tx = KP.X1 + 3; tx < KP.X1 + 48; tx++) { set(tx, ty, T.BOARD); this.reserve(tx, ty, 1, 1); }
      for (let tx = KP.X1 + 6; tx < KP.X1 + 48; tx += 6) { P('bollard', tx, py); }
      P('crate', KP.X1 + 40, py + 2); P('barrel', KP.X1 + 44, py + 2);
      this.kpPiers.push({ x: (KP.X1 + 30) * TS, y: (py + 1) * TS + 8 });
      if (py !== 222) P('ship', KP.X1 + 20 + R(14), py - 2);
    }
    // the causeway out to Iron Island
    const IX = 1734, IY = 258;
    this.blob(IX, IY, 15, T.GRASS, nB); this.blob(IX + 4, IY - 6, 6, T.ROCK, nB);
    for (let tx = KP.X1 + 3; tx < IX - 10; tx++) for (let ty = IY - 1; ty <= IY + 1; ty++) { set(tx, ty, T.BRIDGE); this.reserve(tx, ty, 1, 1); }
    fill(IX - 12, IY - 10, 24, 20, T.GRAVEL);
    for (let tx = IX - 12; tx < IX + 12; tx++) for (const ty of [IY - 10, IY + 9]) { if (Math.abs(tx - IX) > 1 || ty === IY - 10) { set(tx, ty, T.WALL); this.solid[ty * W + tx] |= SOL.ALL; } }
    for (let ty = IY - 10; ty < IY + 10; ty++) for (const tx of [IX - 12, IX + 11]) { if (Math.abs(ty - IY) > 1 || tx === IX + 11) { set(tx, ty, T.WALL); this.solid[ty * W + tx] |= SOL.ALL; } }
    this.reserve(IX - 14, IY - 12, 28, 24);
    this.kpLandmarks.prison = B('kp_prison', 'sheriff', IX - 8, IY - 8, 16, 9, { town: 'Iron Island', name: 'Iron Island Penitentiary', sign: 'PENITENTIARY', roof: '#3a3a40', wallTint: '#6a6a6a', city: true });
    P('watertower', IX + 7, IY + 6); P('flagpole', IX - 9, IY + 6); P('lamp', IX - 3, IY + 3); P('lamp', IX + 3, IY + 3);
    this.kpLandmarks.island = { x: IX * TS, y: (IY + 4) * TS };
    // Harbor Point lighthouse north of the bay
    P('lighthouse', 1718, 132);

    // ---------- 4. Gull Harbor, the fishing village down the coast
    const GX = Math.floor(this.kpCoastX(640)) - 64, GY = 632;
    fill(GX - 2, GY - 12, 40, 26, T.TOWN); this.reserve(GX - 2, GY - 12, 42, 26);
    this.stampLine(GX - 4, GY, GX + 36, GY, 1.6);
    const gt = { town: 'Gull Harbor' };
    B('gh_saloon', 'saloon', GX, GY - 11, 12, 9, Object.assign({ name: SHOPS.gh_saloon.name, sign: 'DROWNED MAN', roof: '#4a5a5a' }, gt));
    B('gh_general', 'general', GX + 14, GY - 11, 10, 9, Object.assign({ name: SHOPS.gh_general.name, sign: 'CHANDLERY', roof: '#5a4a3a' }, gt));
    for (let k = 0; k < 4; k++) B(`gh_house${k}`, 'house', GX + k * 9, GY + 3, 7, 7, Object.assign({ roof: pick(['#5a6a6a', '#6a5a4a', '#4a5a6a', '#7a6a5a']), wallTint: pick(['#c8c0b0', '#a8b0b0', '#b8a890']) }, gt));
    const cxg = Math.floor(this.kpCoastX(GY));
    for (let tx = GX + 36; tx < cxg + 20; tx++) for (let ty = GY - 1; ty <= GY + 1; ty++) { set(tx, ty, T.BOARD); this.reserve(tx, ty, 1, 1); }
    P('steamboat', cxg + 4, GY + 6); P('lighthouse', cxg - 2, GY - 16);
    for (let lx = GX; lx < GX + 36; lx += 9) P('lamp', lx, GY + 2);
    this.frontierWaypoints['Gull Harbor'] = [[GX, GY], [GX + 10, GY], [GX + 20, GY], [GX + 30, GY], [GX + 34, GY]].map(([a, b]) => ({ x: a * TS + 8, y: b * TS + 8 }));
    this.towns.push({ name: 'Gull Harbor', x0: GX - 2, y0: GY - 12, x1: GX + 38, y1: GY + 13, sheriff: 'kp_police', pop: 6, law: 1 });
    this.poi.gullHarbor = { x: (GX + 18) * TS, y: GY * TS };

    // ---------- 5. outskirts farms
    this.kpFarms = [];
    for (const [fx, fy, name] of [[1310, 110, 'Pettigrew Farm'], [1330, 250, 'Kessler Dairy'], [1300, 470, 'Old Mill Farm'], [1450, 520, 'Holloway Orchard']]) {
      fill(fx - 2, fy - 2, 26, 18, T.TOWN); this.reserve(fx - 2, fy - 2, 26, 18);
      B(`kpf_${fx}`, 'house', fx + 2, fy + 1, 9, 7, { name, roof: '#7a3a2a' });
      B(`kpf_barn_${fx}`, 'stables', fx + 13, fy, 9, 8, { name: name + ' Barn', roof: '#9a3a2a' });
      for (let tx = fx - 6; tx < fx + 30; tx++) for (let ty = fy + 17; ty < fy + 27; ty++) if (this.tile(tx, ty) === T.PRAIRIE || this.tile(tx, ty) === T.GRASS) { set(tx, ty, T.DRYBED); if ((tx + ty) % 2 === 0) P('crops', tx, ty); }
      P('hay', fx + 3, fy + 12); P('trough', fx + 15, fy + 12); P('windmill', fx + 22, fy + 3);
      this.kpFarms.push({ name, x: (fx + 6) * TS, y: (fy + 10) * TS });
    }

    // ---------- 6. roads: west to Port Harlow, south to Gull Harbor and the Rio Bravo
    const routes = [[[KP.X0 - 3, KP.Y0 + 3 * KP.BH + 1], [1080, 124]], [[KP.X0 - 3, KP.Y0 + 9 * KP.BH + 1], [1300, 262]], [[KP.X0 + 5 * KP.BW + 1, KP.Y1 + 2], [GX - 4, GY]],
      [[KP.X0 + 1, KP.Y1 + 2], [1310, 480]], [[1310, 480], [1300, 760]], [[1460, 530], [1440, 600]]];
    for (const [a, b] of routes) this.routeRoad(a, b, nA);
    const south = this.nearestRoadNode(1300, 790); if (south) this.routeRoad([1300, 760], south, nA);

    // ---------- 7. plants
    for (let ty = 3; ty < 760; ty++) for (let tx = KP.STRIP - 8; tx < W - 3; tx++) {
      if (this.reserved[ty * W + tx]) continue;
      const t = this.tiles[ty * W + tx], r = rng();
      if (tx >= KP.X0 - 4 && tx <= KP.X1 + 50 && ty >= KP.Y0 - 4 && ty <= KP.Y1 + 4) continue;
      switch (t) {
        case T.FOREST: if (r < 0.13) P(ty > 440 ? 'pine' : 'oak', tx, ty, { v: rng() }); else if (r < 0.17) P('bush', tx, ty, { v: rng() }); break;
        case T.GRASS: if (r < 0.01) P('oak', tx, ty, { v: rng() }); else if (r < 0.025) P('bush', tx, ty, { v: rng() }); else if (r < 0.07) P('tuft', tx, ty); break;
        case T.PRAIRIE: if (r < 0.003) P('oak', tx, ty, { v: rng() }); else if (r < 0.06) P('tuft', tx, ty); else if (r < 0.1) P('flowers', tx, ty); break;
        case T.SAND: if (r < 0.006) P('rock', tx, ty); else if (r < 0.01) P('stones', tx, ty); break;
      }
    }

    // ---------- 8. towns: every district counts as a town of its own
    for (const d of KP_DISTRICTS) {
      const x0 = KP.X0 + d.i[0] * KP.BW, y0 = KP.Y0 + d.j[0] * KP.BH, x1 = KP.X0 + (d.i[1] + 1) * KP.BW - 1 + (d.i[1] === KP.NI - 1 ? 4 : 0), y1 = KP.Y0 + (d.j[1] + 1) * KP.BH - 1 + (d.j[1] === KP.NJ - 1 ? 3 : 0);
      this.frontierWaypoints[d.name] = this.kpWaypoints[d.name];
      this.towns.push({ name: d.name, x0, y0, x1, y1, sheriff: 'kp_police', pop: d.name === 'Downtown Kingsport' ? 14 : d.name === 'Nob Heights' ? 6 : 9, law: d.name === 'Downtown Kingsport' ? 3 : 2, district: true, kingsport: true });
    }
    this.towns.push({ name: 'Iron Island', x0: IX - 14, y0: IY - 12, x1: IX + 14, y1: IY + 12, sheriff: 'kp_prison', pop: 0, law: 0, kingsport: true });
    this.frontierWaypoints['Iron Island'] = [{ x: IX * TS, y: (IY + 4) * TS }];
    this.poi.kingsport = { x: (KP.X0 + 5 * KP.BW + 12) * TS, y: (KP.Y0 + 2 * KP.BH + 17) * TS };
    this.kpTrolleys = this.kpTrolleyLines();
  },

  /* the two horse-car lines: an avenue east–west and a street north–south */
  kpTrolleyLines() {
    const ay = KP.Y0 + 3 * KP.BH + 1, bx = KP.X0 + 6 * KP.BW + 1;
    return [
      { name: 'Kingsport Avenue line', axis: 'x', fixed: ay, from: KP.X0 - 1, to: KP.X1 - 2,
        stops: [[KP.X0 + 1, 'Nob Heights'], [KP.X0 + 4 * KP.BW + 1, 'City Hall'], [KP.X0 + 7 * KP.BW + 1, 'Harbor Street'], [KP.X0 + 10 * KP.BW + 1, 'The Harbor']].map(([x, name]) => ({ x, y: ay, name })) },
      { name: 'Harbor Street line', axis: 'y', fixed: bx, from: KP.Y0 - 1, to: KP.Y1 + 1,
        stops: [[KP.Y0 + 1, 'Opera House'], [KP.Y0 + 5 * KP.BH + 1, 'Union Station'], [KP.Y0 + 9 * KP.BH + 1, 'Factory Gates'], [KP.Y0 + 13 * KP.BH + 1, 'Riverside']].map(([y, name]) => ({ x: bx, y, name })) }
    ];
  }
});

/* region names on the strip */
(function () {
  const base = World.frontierRegionName;
  World.frontierRegionName = function (x, y) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    if (this.rn1 && tx >= KP.STRIP - 6 && ty < MEX_Y - 8) {
      if (this.tile(tx, ty) === T.WATER || this.tile(tx, ty) === T.SHALLOW) {
        if (ty > 340 && ty < 400 && tx < 1700) return 'Kings River';
        if (ty >= 150 && ty < 352 && tx > KP.X1) return 'Kingsport Bay';
        return 'Atlantic Coast';
      }
      if (ty < 150 && tx > KP.X1) return 'Harbor Point';
      if (tx >= KP.X0 - 4 && tx <= KP.X1 + 50 && ty >= KP.Y0 - 4 && ty <= KP.Y1 + 4) return 'Kingsport';
      for (const f of this.kpFarms || []) if (dist(x, y, f.x, f.y) < 20 * TS) return f.name;
      if (ty > 345 && ty < 410) return 'Kings River Delta';
      if (ty > 440 && ty < 760) return 'Tidewater Pines';
      if (ty < 760) return 'Kingsport Outskirts';
    }
    return base.call(this, x, y);
  };
})();
