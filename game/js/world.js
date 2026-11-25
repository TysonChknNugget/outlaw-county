/* Outlaw County — world.js
 * Deterministic procedural county: terrain, river, railroad, roads, two towns,
 * the Hollister hideout, bandit camps, props, buildings with interiors,
 * collision grid, line-of-sight, A* path finding and chunked ground rendering.
 */
'use strict';

const T = { GRASS: 0, SAND: 1, ROAD: 2, FOREST: 3, WATER: 4, ROCK: 5, FLOOR: 6, WALL: 7, BRIDGE: 8, DRYBED: 9, SCRUB: 10, TOWN: 11, GRAVEL: 12, BOARD: 13, CANYON: 14,
  SNOW: 15, ICE: 16, CLAY: 17, SALT: 18, SHALLOW: 19, PRAIRIE: 20, SNOWFOREST: 21 };
const SOL = { MOVE: 1, SHOT: 2, VIS: 4, ALL: 7 };
const NATURAL = new Set([T.GRASS, T.SAND, T.FOREST, T.SCRUB, T.DRYBED, T.TOWN, T.ROAD, T.CANYON, T.WATER, T.SNOW, T.ICE, T.CLAY, T.SALT, T.SHALLOW, T.PRAIRIE, T.SNOWFOREST]);
const RAIL_ROW = 146;

/* Prop definitions: fp = footprint [w,h] in tiles anchored at bottom-left tile,
 * sol = solidity bits, flat = baked into the ground chunk instead of y-sorted. */
const PROP_DEFS = {
  pine: { fp: [1, 1], sol: SOL.ALL }, oak: { fp: [1, 1], sol: SOL.ALL }, deadtree: { fp: [1, 1], sol: SOL.MOVE | SOL.SHOT },
  cactus: { fp: [1, 1], sol: SOL.MOVE | SOL.SHOT }, cactus_s: { fp: [1, 1], sol: SOL.MOVE },
  boulder: { fp: [2, 1], sol: SOL.ALL }, rock: { fp: [1, 1], sol: SOL.MOVE | SOL.SHOT },
  bush: { fp: [1, 1], sol: SOL.VIS }, barrel: { fp: [1, 1], sol: SOL.MOVE | SOL.SHOT }, crate: { fp: [1, 1], sol: SOL.MOVE | SOL.SHOT },
  lamp: { fp: [1, 1], sol: SOL.MOVE }, well: { fp: [2, 1], sol: SOL.MOVE | SOL.SHOT }, watertower: { fp: [2, 2], sol: SOL.ALL },
  windmill: { fp: [1, 1], sol: SOL.MOVE }, tent: { fp: [2, 1], sol: SOL.MOVE | SOL.VIS }, campfire: { fp: [1, 1], sol: SOL.MOVE },
  wagon: { fp: [3, 1], sol: SOL.MOVE | SOL.SHOT }, cagewagon: { fp: [3, 1], sol: SOL.MOVE | SOL.SHOT }, burntwagon: { fp: [3, 1], sol: SOL.MOVE },
  fence_h: { fp: [1, 1], sol: SOL.MOVE }, fence_v: { fp: [1, 1], sol: SOL.MOVE }, hitch: { fp: [2, 1], sol: SOL.MOVE },
  sign: { fp: [1, 1], sol: SOL.MOVE }, grave: { fp: [1, 1], sol: SOL.MOVE }, mine: { fp: [2, 1], sol: 0 },
  hay: { fp: [1, 1], sol: SOL.MOVE | SOL.SHOT }, trough: { fp: [2, 1], sol: SOL.MOVE }, pole: { fp: [1, 1], sol: SOL.MOVE },
  sandbags: { fp: [2, 1], sol: SOL.MOVE | SOL.SHOT },
  stones: { flat: true }, tuft: { flat: true }, flowers: { flat: true }, bones: { flat: true }, xmark: { flat: true },
  crops: { flat: true }, ashes: { flat: true }, tracks: { flat: true }
};

const World = {
  W: 320, H: 240, CH: 16, // chunk size in tiles
  tiles: null, solid: null, reserved: null,
  props: [], propsByChunk: [], buildings: [], towns: [], lights: [],
  chunkCache: new Map(), poi: {}, treasures: [], banditCamps: [], townWaypoints: {},
  minimap: null, ready: false,

  idx(tx, ty) { return ty * this.W + tx; },
  inb(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.W && ty < this.H; },
  tile(tx, ty) { return this.inb(tx, ty) ? this.tiles[ty * this.W + tx] : T.ROCK; },
  setTile(tx, ty, t) { if (this.inb(tx, ty)) this.tiles[ty * this.W + tx] = t; },
  sol(tx, ty) { return this.inb(tx, ty) ? this.solid[ty * this.W + tx] : SOL.ALL; },
  tileAtPx(x, y) { return this.tile(Math.floor(x / TS), Math.floor(y / TS)); },
  blockedPx(x, y, mask = SOL.MOVE) { return (this.sol(Math.floor(x / TS), Math.floor(y / TS)) & mask) !== 0; },

  /* ------------------------------------------------------------ generation */
  /* opts.lite = only the original 320x240 county (used by the website previews) */
  generate(seed = 1889, opts = {}) {
    const lite = !!opts.lite, OW = 320, OH = 240;
    this.W = lite ? OW : 1280; this.H = lite ? OH : 960;
    this.OW = OW; this.OH = OH; this.lite = lite;
    const W = this.W, H = this.H;
    this.props = []; this.buildings = []; this.chunkCache = new Map();
    this.tiles = new Uint8Array(W * H);
    this.solid = new Uint8Array(W * H);
    this.reserved = new Uint8Array(W * H);
    const rng = mulberry32(seed);
    const n1 = makeNoise(seed + 1), n2 = makeNoise(seed + 2), n3 = makeNoise(seed + 3);
    this.noise = n1;

    // 1. biomes (original county; the frontier regions are generated separately)
    for (let ty = 0; ty < OH; ty++) for (let tx = 0; tx < OW; tx++) {
      const a = fbm(n1, tx * 0.04, ty * 0.04, 3), b = fbm(n2, tx * 0.05, ty * 0.05, 3);
      const d1 = clamp((tx - 138 + (a - 0.5) * 60) / 26, 0, 1);
      const d2 = clamp((ty - 198 + (a - 0.5) * 34) / 18, 0, 1) * clamp((tx - 30) / 30, 0, 1);
      const d = Math.max(d1, d2);
      const f = clamp((92 - ty + (b - 0.5) * 44) / 16, 0, 1) * clamp((150 - tx + (b - 0.5) * 36) / 16, 0, 1);
      let t;
      if (d > 0.55) t = T.SAND;
      else if (d > 0.33) t = T.SCRUB;
      else if (f > 0.5) t = T.FOREST;
      else t = (fbm(n3, tx * 0.09, ty * 0.09, 2) > 0.63) ? T.SCRUB : T.GRASS;
      this.tiles[ty * W + tx] = t;
    }

    // 2. mountain borders, north-east range and desert mesas
    for (let ty = 0; ty < OH; ty++) for (let tx = 0; tx < OW; tx++) {
      const nn = n3(tx * 0.15, ty * 0.15);
      const border = tx < 3 + nn * 5 || ty < 7 + nn * 7 || tx > OW - 5 - nn * 8 || ty > OH - 5 - nn * 7;
      const range = tx > 272 && ty > 8 && ty < 105 && fbm(n2, tx * 0.08, ty * 0.08, 3) > 0.52;
      if (border || range) this.tiles[ty * W + tx] = T.ROCK;
    }
    const mesas = [[176, 172, 5], [266, 100, 5], [196, 112, 3], [290, 172, 7], [160, 214, 5], [246, 214, 6], [300, 130, 4], [150, 60, 3], [12, 150, 4], [20, 220, 5]];
    for (const [mx, my, mr] of mesas) this.blob(mx, my, mr, T.ROCK, n1);

    // 3. river (wet in the north, a dry wash south of the railroad) and a forest pond
    this.riverX = ty => 124 + Math.sin(ty * 0.045) * 7 + Math.sin(ty * 0.11 + 1) * 2.5;
    for (let ty = 0; ty < OH; ty++) {
      const rx = this.riverX(ty), wet = ty <= 147, w = wet ? 1.9 : 2.8;
      for (let tx = Math.floor(rx - 4); tx <= Math.ceil(rx + 4); tx++) {
        if (Math.abs(tx + 0.5 - rx) < w && this.tile(tx, ty) !== T.ROCK || (wet && Math.abs(tx + 0.5 - rx) < w)) this.setTile(tx, ty, wet ? T.WATER : T.DRYBED);
      }
    }
    this.blob(70, 45, 5, T.WATER, n2);
    this.blob(196, 60, 2.5, T.WATER, n2); // desert spring

    // 4. railroad (rows 145-147)
    for (let tx = 0; tx < W; tx++) for (let ty = RAIL_ROW - 1; ty <= RAIL_ROW + 1; ty++) {
      this.setTile(tx, ty, this.tile(tx, ty) === T.WATER ? T.BRIDGE : T.GRAVEL);
      this.reserve(tx, ty - 2, 1, 6);
    }

    // 5. towns ground
    this.fillRect(28, 104, 85, 42, T.TOWN, true);  // Dustwater
    this.fillRect(204, 150, 53, 31, T.TOWN, true); // Mesa Flats
    this.fillRect(54, 144, 28, 1, T.BOARD, true);  // Dustwater platform
    this.fillRect(216, 144, 20, 1, T.BOARD, true); // Mesa Flats platform

    // 6. Hollister canyon hideout
    const HX = 255, HY = 50;
    for (let ty = HY - 26; ty <= HY + 26; ty++) for (let tx = HX - 26; tx <= HX + 26; tx++) {
      const d = dist(tx, ty, HX, HY), r = 14 + n1(tx * 0.3, ty * 0.3) * 4;
      if (d < r) this.setTile(tx, ty, T.CANYON);
      else if (d < r + 6) this.setTile(tx, ty, T.ROCK);
    }
    this.reserve(HX - 16, HY - 16, 33, 33);

    // 7. roads
    const roads = [
      { pts: [[2, 120], [110, 120], [150, 120], [185, 128], [210, 145], [226, 152], [226, 167]], r: 2 },          // county road
      { pts: [[204, 168], [256, 168]], r: 1.6 },                                                                      // Mesa Flats street
      { pts: [[28, 134], [112, 134]], r: 1.6 },                                                                       // Dustwater 2nd street
      { pts: [[58, 134], [58, 144]], r: 1.5 },                                                                        // to Dustwater platform
      { pts: [[226, 152], [226, 145]], r: 1.4 },                                                                      // to Mesa Flats platform
      { pts: [[73, 118], [73, 86], [60, 62], [44, 34]], r: 1.4 },                                                     // north forest road to mine
      { pts: [[62, 72], [30, 71]], r: 1.1 }, { pts: [[66, 66], [97, 57]], r: 1.1 },                                   // cabin trails
      { pts: [[185, 128], [205, 100], [240, 78], [252, 66], [255, 54]], r: 1.4 },                                     // hideout road
      { pts: [[160, 122], [152, 96]], r: 1.1 },                                                                       // marshal camp trail
      { pts: [[98, 134], [98, 150], [97, 188]], r: 1.3 },                                                             // homestead road
      { pts: [[226, 168], [222, 182], [204, 202]], r: 1.1 },                                                          // to desert bandit camp
      { pts: [[250, 168], [284, 128]], r: 1.1 }                                                                       // to east bandit camp
    ];
    this.roads = roads;
    for (const rd of roads) for (let i = 0; i < rd.pts.length - 1; i++) {
      const [x0, y0] = rd.pts[i], [x1, y1] = rd.pts[i + 1];
      this.stampLine(x0, y0, x1, y1, rd.r);
    }

    // 8. buildings
    this.buildings = [];
    const B = (id, type, x, y, w, h, opts = {}) => this.addBuilding(Object.assign({ id, type, x, y, w, h }, opts));
    // Dustwater north row (doors face the main street)
    B('dw_sheriff', 'sheriff', 32, 110, 9, 8, { name: "Sheriff's Office", sign: 'SHERIFF', roof: '#5b3a2a', town: 'Dustwater' });
    B('dw_general', 'general', 43, 109, 10, 9, { name: 'General Store', sign: 'GENERAL STORE', roof: '#6d4b2f', town: 'Dustwater' });
    B('dw_saloon', 'saloon', 55, 107, 13, 11, { name: 'The Rusty Spur Saloon', sign: 'SALOON', roof: '#7a3b26', town: 'Dustwater' });
    B('dw_bank', 'bank', 78, 108, 11, 10, { name: 'Dustwater County Bank', sign: 'BANK', roof: '#4d4f57', town: 'Dustwater' });
    B('dw_gunsmith', 'gunsmith', 91, 110, 9, 8, { name: "Hartley's Gunsmith", sign: 'GUNS', roof: '#3f3a33', town: 'Dustwater' });
    B('dw_hotel', 'hotel', 101, 107, 10, 11, { name: 'Grand Frontier Hotel', sign: 'HOTEL', roof: '#5a2f3a', town: 'Dustwater' });
    // Dustwater south row (doors face 2nd street)
    B('dw_stables', 'stables', 33, 124, 12, 9, { name: 'Livery & Stables', sign: 'STABLES', roof: '#6b4a2a', town: 'Dustwater' });
    B('dw_house1', 'house', 56, 125, 7, 8, { roof: '#64412b', town: 'Dustwater' });
    B('dw_house2', 'house', 64, 125, 7, 8, { roof: '#53402f', town: 'Dustwater' });
    B('dw_house3', 'house', 80, 125, 7, 8, { roof: '#6a4630', town: 'Dustwater' });
    B('dw_house4', 'house', 89, 125, 7, 8, { roof: '#4e3a2c', town: 'Dustwater' });
    B('dw_church', 'church', 98, 123, 10, 10, { name: 'Chapel', roof: '#e8e2d2', wallTint: '#d9d0bc', town: 'Dustwater' });
    B('dw_station', 'station', 62, 136, 12, 8, { name: 'Dustwater Station', sign: 'DUSTWATER', roof: '#335048', town: 'Dustwater' });
    // Mesa Flats
    B('mf_general', 'general', 210, 159, 10, 8, { name: 'Trading Post', sign: 'TRADING POST', roof: '#8a5a32', town: 'Mesa Flats', adobe: true });
    B('mf_cantina', 'saloon', 231, 157, 12, 10, { name: 'Cantina del Sol', sign: 'CANTINA', roof: '#9a5d38', town: 'Mesa Flats', adobe: true });
    B('mf_sheriff', 'sheriff', 244, 159, 9, 8, { name: 'Jailhouse', sign: 'JAIL', roof: '#7d5638', town: 'Mesa Flats', adobe: true });
    B('mf_house1', 'house', 212, 171, 7, 7, { roof: '#a06a40', town: 'Mesa Flats', adobe: true });
    B('mf_house2', 'house', 222, 171, 7, 7, { roof: '#93613b', town: 'Mesa Flats', adobe: true });
    B('mf_house3', 'house', 236, 171, 8, 7, { roof: '#a87447', town: 'Mesa Flats', adobe: true });
    B('mf_station', 'station', 220, 137, 11, 7, { name: 'Mesa Flats Station', sign: 'MESA FLATS', roof: '#4a5a40', town: 'Mesa Flats' });
    // wilderness buildings
    B('cabin_trapper', 'cabin', 26, 64, 7, 6, { name: "Trapper Jo's Cabin", roof: '#4b3523' });
    B('cabin_pine', 'cabin', 93, 50, 7, 6, { name: 'Abandoned Cabin', roof: '#3e2d20' });
    B('homestead', 'house', 92, 189, 8, 7, { name: 'Homestead', roof: '#5f4630' });

    // 9. towns, lights and props in town
    this.towns = [
      { name: 'Dustwater', x0: 26, y0: 102, x1: 114, y1: 146, sheriff: 'dw_sheriff' },
      { name: 'Mesa Flats', x0: 202, y0: 135, x1: 258, y1: 181, sheriff: 'mf_sheriff' }
    ];
    const P = (t, tx, ty, o) => this.addProp(t, tx, ty, o);
    for (let x = 34; x <= 108; x += 9) { P('lamp', x, 117 + 5); }
    for (let x = 208; x <= 252; x += 11) P('lamp', x, 170);
    P('well', 73, 113); P('trough', 70, 122); P('trough', 41, 122); P('hitch', 58, 122); P('hitch', 64, 122);
    P('hitch', 84, 122); P('barrel', 53, 116); P('barrel', 54, 116); P('crate', 89, 116); P('barrel', 100, 117);
    P('watertower', 77, 141); P('windmill', 110, 129); P('sign', 26, 121, { text: 'DUSTWATER' }); P('sign', 114, 118, { text: 'MESA FLATS >' });
    for (let x = 46; x <= 53; x++) { P('fence_h', x, 124); P('fence_h', x, 132); }
    for (let y = 125; y <= 131; y++) { P('fence_v', 53, y); }
    P('hay', 47, 126); P('trough', 49, 130);
    for (let i = 0; i < 6; i++) P('grave', 109 + (i % 3) * 2, 138 + Math.floor(i / 3) * 3);
    P('watertower', 250, 177); P('barrel', 220, 166); P('barrel', 243, 166); P('hitch', 236, 170); P('trough', 216, 170);
    P('sign', 203, 167, { text: 'MESA FLATS' });
    P('crate', 80, 143); P('crate', 81, 143); P('barrel', 56, 143); P('crate', 233, 143);
    // telegraph poles along the railroad
    for (let x = 4; x < W - 4; x += 12) if (!(this.sol(x, RAIL_ROW - 3) & SOL.MOVE) && this.tile(x, RAIL_ROW - 3) !== T.WATER && this.tile(x, RAIL_ROW - 3) !== T.ROCK) P('pole', x, RAIL_ROW - 3);

    // hideout dressing
    this.poi.hideout = { x: HX * TS, y: HY * TS };
    P('campfire', HX, HY); P('tent', HX - 8, HY - 5); P('tent', HX + 5, HY - 7); P('tent', HX - 3, HY - 10); P('tent', HX + 8, HY + 1);
    P('wagon', HX - 11, HY + 3); P('crate', HX + 3, HY + 6); P('crate', HX + 4, HY + 6); P('barrel', HX - 6, HY + 7);
    P('hitch', HX - 3, HY + 9); P('campfire', HX + 9, HY - 10, { small: true });
    for (let x = HX + 4; x <= HX + 10; x++) P('fence_h', x, HY + 11);
    this.poi.hideoutFire = { x: (HX + 0.5) * TS, y: (HY + 2) * TS };
    this.poi.bottleFence = { x: (HX + 7) * TS, y: (HY + 11) * TS };
    this.poi.fence = { x: (HX + 4) * TS, y: (HY + 5) * TS };
    this.poi.hideoutHitch = { x: (HX - 2) * TS, y: (HY + 11) * TS };

    // marshal camp
    const MX = 152, MY = 92;
    this.reserve(MX - 8, MY - 8, 17, 16);
    for (let ty = MY - 8; ty <= MY + 8; ty++) for (let tx = MX - 9; tx <= MX + 9; tx++) {
      const d = Math.hypot((tx - MX) / 1.15, ty - MY) + (n2(tx * 0.4, ty * 0.4) - 0.5) * 3;
      if (d < 7 && this.tile(tx, ty) !== T.WATER && this.tile(tx, ty) !== T.ROCK) this.setTile(tx, ty, T.TOWN);
    }
    P('cagewagon', MX - 1, MY - 2); P('campfire', MX + 3, MY + 2); P('tent', MX - 6, MY + 2); P('tent', MX + 4, MY - 5);
    P('sandbags', MX - 3, MY + 5); P('sandbags', MX + 2, MY + 6); P('crate', MX + 6, MY + 1); P('hitch', MX - 6, MY - 4);
    this.poi.marshalCamp = { x: MX * TS, y: MY * TS };
    this.poi.cageWagon = { x: (MX + 0.5) * TS, y: (MY - 1) * TS };

    // bandit camps (rival Rattlesnake gang)
    this.banditCamps = [];
    const camp = (cx, cy, name) => {
      this.reserve(cx - 7, cy - 7, 15, 15);
      for (let ty = cy - 7; ty <= cy + 7; ty++) for (let tx = cx - 8; tx <= cx + 8; tx++) {
        const d = Math.hypot((tx - cx) / 1.2, ty - cy) + (n1(tx * 0.4, ty * 0.4) - 0.5) * 3;
        if (d < 5.5 && this.tile(tx, ty) !== T.ROCK && this.tile(tx, ty) !== T.WATER) this.setTile(tx, ty, T.CANYON);
      }
      P('campfire', cx, cy); P('tent', cx - 4, cy - 2); P('tent', cx + 2, cy - 4); P('crate', cx + 4, cy + 2); P('barrel', cx - 3, cy + 3);
      this.banditCamps.push({ name, x: cx * TS, y: cy * TS, clearedAt: -99999, members: [] });
    };
    // abandoned mine in the forest
    this.fillRect(34, 22, 13, 6, T.ROCK, false);
    P('mine', 39, 27); P('crate', 43, 29); P('wagon', 34, 31);
    camp(204, 204, 'Rattlesnake Camp'); camp(284, 124, 'Coyote Ridge'); camp(41, 33, 'Old Silverline Mine');

    // abandoned camps and loot
    this.reserve(144, 184, 14, 12); P('burntwagon', 148, 190); P('ashes', 151, 187); P('bones', 145, 192); P('crate', 153, 191);
    this.reserve(268, 190, 14, 12); P('burntwagon', 272, 196); P('tent', 276, 192); P('bones', 270, 193); P('ashes', 274, 194);
    this.poi.lootCrates = [{ x: 153 * TS + 8, y: 191 * TS }, { x: 43 * TS + 8, y: 29 * TS }, { x: 276 * TS, y: 193 * TS }];

    // homestead
    for (let x = 88; x <= 104; x++) { if (x < 96 || x > 97) P('fence_h', x, 186); P('crops', x, 198); P('crops', x, 199); }
    P('windmill', 103, 192); P('hay', 90, 197);

    // treasure caches
    this.treasures = [[15, 205], [301, 218], [140, 22], [232, 96], [170, 224], [112, 176]].map(([tx, ty], i) => {
      this.reserve(tx - 1, ty - 1, 3, 3);
      for (let y = ty - 1; y <= ty + 1; y++) for (let x = tx - 1; x <= tx + 1; x++) if (this.tile(x, y) === T.ROCK || this.tile(x, y) === T.WATER) this.setTile(x, y, T.SAND);
      P('xmark', tx, ty); P('stones', tx + 1, ty);
      return { id: i, x: tx * TS + 8, y: ty * TS + 8, name: ['Lone Cactus Cache', 'Badlands Strongbox', 'Northern Ridge Hoard', 'Mesa Top Stash', 'Southern Wash Cache', 'Prairie Saddlebag'][i] };
    });

    // 10. scatter vegetation & rocks
    for (let ty = 1; ty < OH - 1; ty++) for (let tx = 1; tx < OW - 1; tx++) {
      if (this.reserved[ty * W + tx]) continue;
      const t = this.tiles[ty * W + tx], r = rng();
      if (t === T.FOREST) {
        if (r < 0.13) P('pine', tx, ty, { v: rng() }); else if (r < 0.16) P('bush', tx, ty, { v: rng() }); else if (r < 0.22) P('tuft', tx, ty);
        else if (r < 0.225) P('rock', tx, ty);
      } else if (t === T.GRASS) {
        if (r < 0.006) P('oak', tx, ty, { v: rng() }); else if (r < 0.02) P('bush', tx, ty, { v: rng() }); else if (r < 0.08) P('tuft', tx, ty);
        else if (r < 0.095) P('flowers', tx, ty); else if (r < 0.098) P('rock', tx, ty);
      } else if (t === T.SCRUB) {
        if (r < 0.012) P('bush', tx, ty, { v: rng() }); else if (r < 0.017) P('deadtree', tx, ty); else if (r < 0.06) P('tuft', tx, ty);
        else if (r < 0.065) P('rock', tx, ty);
      } else if (t === T.SAND) {
        if (r < 0.009) P('cactus', tx, ty, { v: rng() }); else if (r < 0.016) P('cactus_s', tx, ty); else if (r < 0.021) P('rock', tx, ty);
        else if (r < 0.0225) P('boulder', tx, ty); else if (r < 0.025) P('deadtree', tx, ty); else if (r < 0.03) P('stones', tx, ty);
        else if (r < 0.0315) P('bones', tx, ty);
      } else if (t === T.DRYBED) {
        if (r < 0.02) P('stones', tx, ty);
      } else if (t === T.CANYON) {
        if (r < 0.01) P('rock', tx, ty); else if (r < 0.03) P('stones', tx, ty);
      }
    }

    // the six frontier regions around the original county (world-frontier.js)
    if (!lite) this.generateFrontier(seed);

    // 11. solidity from tiles
    for (let i = 0; i < W * H; i++) {
      const t = this.tiles[i];
      if (t === T.ROCK || t === T.WALL) this.solid[i] |= SOL.ALL;
      else if (t === T.WATER) this.solid[i] |= SOL.MOVE;
    }
    // v2.5 open country: the mountain ridges and cliff walls (rock) no longer fence you in.
    // You can ride over them anywhere (a little slower); only the map's outer edge blocks.
    // Rock still stops bullets and blocks sight, so it keeps working as cover.
    for (let i = 0; i < W * H; i++) if (this.tiles[i] === T.ROCK) this.solid[i] &= ~SOL.MOVE;
    const EDGE = 2;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x < EDGE || y < EDGE || x >= W - EDGE || y >= H - EDGE) this.solid[y * W + x] |= SOL.ALL;
    // re-apply building furniture solidity (walls set above)
    for (const b of this.buildings) for (const f of b.furniture) if (f.sol) for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) this.solid[this.idx(x, y)] |= f.sol;

    // 12. index props per chunk for culling
    const CW = Math.ceil(W / this.CH), CHh = Math.ceil(H / this.CH);
    this.propsByChunk = Array.from({ length: CW * CHh }, () => []);
    this.tallByChunk = Array.from({ length: CW * CHh }, () => []);
    for (const p of this.props) {
      const ci = Math.floor(p.tx / this.CH) + Math.floor(p.ty / this.CH) * CW;
      this.propsByChunk[ci].push(p);
      if (!PROP_DEFS[p.t].flat) this.tallByChunk[ci].push(p);
    }
    this.CW = CW; this.CHh = CHh;

    // 13. light sources
    this.lights = [];
    for (const p of this.props) {
      if (p.t === 'lamp') this.lights.push({ x: p.x, y: p.y - 18, r: 70, c: 'lamp', prop: p });
      if (p.t === 'campfire') this.lights.push({ x: p.x, y: p.y - 4, r: p.small ? 70 : 110, c: 'fire', prop: p });
    }
    for (const b of this.buildings) if (!b.ruin && (b.type !== 'cabin' || b.id === 'cabin_trapper')) {
      for (const w of b.windows) this.lights.push({ x: w.x, y: w.y + 6, r: 34, c: 'window', building: b });
    }

    // 14. named points
    const bc = id => this.buildings.find(b => b.id === id);
    const doorPx = b => ({ x: (b.door.x + 0.5) * TS, y: (b.door.y + 1.6) * TS });
    this.poi.dwStation = { x: 68 * TS, y: 145 * TS - 4 };
    this.poi.mfStation = { x: 225.5 * TS, y: 145 * TS - 4 };
    this.poi.dwStationDoor = doorPx(bc('dw_station'));
    this.poi.mfStationDoor = doorPx(bc('mf_station'));
    this.poi.sheriffDoors = this.buildings.filter(b => b.type === 'sheriff').map(doorPx);
    this.poi.stationDoors = this.buildings.filter(b => b.type === 'station').map(doorPx);
    this.poi.start = { x: 66 * TS, y: 144.5 * TS };
    this.poi.saloonFront = { x: 61.5 * TS, y: 122 * TS };
    this.poi.dwSheriffDoor = doorPx(bc('dw_sheriff'));
    this.poi.mfSheriffDoor = doorPx(bc('mf_sheriff'));
    this.poi.mfStore = doorPx(bc('mf_general'));
    this.poi.dwBank = doorPx(bc('dw_bank'));
    this.poi.dwStables = doorPx(bc('dw_stables'));
    this.poi.corral = { x: 49.5 * TS, y: 128 * TS };
    this.poi.ambush = { x: 168 * TS, y: 124 * TS };
    this.poi.bankMeet = { x: 116 * TS, y: 115 * TS };
    this.poi.dwHotelDoor = doorPx(bc('dw_hotel'));
    this.poi.stageRoute = [[20, 120], [60, 120], [110, 120], [150, 120], [185, 128], [210, 145], [226, 152], [226, 165], [216, 168]].map(([x, y]) => ({ x: x * TS + 8, y: y * TS + 8 }));

    // town waypoints used by civilian routines
    this.townWaypoints = {
      'Dustwater': [[36, 120], [48, 120], [62, 120], [73, 120], [84, 120], [96, 120], [106, 120], [40, 134], [60, 134], [76, 134], [92, 134], [104, 134], [73, 128], [58, 140], [66, 145], [76, 116]].map(([x, y]) => ({ x: x * TS + 8, y: y * TS + 8 })),
      'Mesa Flats': [[208, 168], [218, 168], [228, 168], [240, 168], [250, 168], [226, 160], [226, 150], [224, 145]].map(([x, y]) => ({ x: x * TS + 8, y: y * TS + 8 }))
    };
    if (this.frontierWaypoints) Object.assign(this.townWaypoints, this.frontierWaypoints);

    this.buildMinimap();
    this.ready = true;
  },

  blob(cx, cy, r, t, noise) {
    for (let ty = Math.floor(cy - r - 3); ty <= cy + r + 3; ty++) for (let tx = Math.floor(cx - r - 3); tx <= cx + r + 3; tx++) {
      const d = dist(tx, ty, cx, cy);
      if (d < r + (noise(tx * 0.35, ty * 0.35) - 0.5) * 3) this.setTile(tx, ty, t);
    }
  },

  fillRect(x, y, w, h, t, reserve) {
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) { this.setTile(tx, ty, t); if (reserve) this.reserve(tx, ty, 1, 1); }
  },

  reserve(x, y, w, h) {
    for (let ty = y; ty < y + h; ty++) for (let tx = x; tx < x + w; tx++) if (this.inb(tx, ty)) this.reserved[ty * this.W + tx] = 1;
  },

  stampLine(x0, y0, x1, y1, r) {
    const minx = Math.floor(Math.min(x0, x1) - r - 1), maxx = Math.ceil(Math.max(x0, x1) + r + 1);
    const miny = Math.floor(Math.min(y0, y1) - r - 1), maxy = Math.ceil(Math.max(y0, y1) + r + 1);
    const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy || 1;
    for (let ty = miny; ty <= maxy; ty++) for (let tx = minx; tx <= maxx; tx++) {
      const px = tx + 0.5, py = ty + 0.5;
      const t = clamp(((px - x0) * dx + (py - y0) * dy) / l2, 0, 1);
      const d = dist(px, py, x0 + dx * t, y0 + dy * t);
      if (d < r + 1.5) this.reserve(tx, ty, 1, 1);
      if (d < r) {
        const cur = this.tile(tx, ty);
        if (cur === T.WATER || cur === T.BRIDGE) this.setTile(tx, ty, T.BRIDGE);
        else if (cur === T.GRAVEL || cur === T.BOARD) { /* level crossing: keep rail bed */ }
        else if (cur === T.WALL || cur === T.FLOOR) { /* never cut through a building */ }
        else this.setTile(tx, ty, T.ROAD);
      }
    }
  },

  addProp(t, tx, ty, o = {}) {
    const def = PROP_DEFS[t]; if (!def) return null;
    const fw = def.fp ? def.fp[0] : 1, fh = def.fp ? def.fp[1] : 1;
    const p = Object.assign({ t, tx, ty, x: (tx + fw / 2) * TS, y: (ty + 1) * TS, v: 0.5, fw, fh }, o);
    this.props.push(p);
    if (def.sol) for (let y = ty - fh + 1; y <= ty; y++) for (let x = tx; x < tx + fw; x++) if (this.inb(x, y)) this.solid[this.idx(x, y)] |= def.sol;
    if (!def.flat) this.reserve(tx - 1, ty - fh, fw + 2, fh + 2);
    return p;
  },

  addBuilding(b) {
    b.name = b.name || (b.type === 'house' ? 'House' : b.type);
    b.door = { x: b.x + Math.floor(b.w / 2), y: b.y + b.h - 1 };
    b.furniture = []; b.windows = []; b.inside = 1;
    b.shop = SHOPS[b.id] ? b.id : null;
    for (let ty = b.y; ty < b.y + b.h; ty++) for (let tx = b.x; tx < b.x + b.w; tx++) {
      const edge = tx === b.x || ty === b.y || tx === b.x + b.w - 1 || ty === b.y + b.h - 1;
      const isDoor = tx === b.door.x && ty === b.door.y;
      this.setTile(tx, ty, edge && !isDoor ? T.WALL : T.FLOOR);
      if (edge && !isDoor) this.solid[this.idx(tx, ty)] |= SOL.ALL;
    }
    this.reserve(b.x - 1, b.y - 2, b.w + 2, b.h + 4);
    // windows on the facade
    for (let tx = b.x + 1; tx < b.x + b.w - 1; tx += 3) if (Math.abs(tx - b.door.x) > 1) b.windows.push({ x: (tx + 0.5) * TS, y: (b.y + b.h - 1) * TS - 6 });
    const F = (k, x, y, w = 1, h = 1, sol = SOL.MOVE) => { const f = { k, x: b.x + x, y: b.y + y, w, h, sol }; b.furniture.push(f); return f; };
    const iw = b.w - 2;
    switch (b.type) {
      case 'saloon':
        F('counter', 2, 3, iw - 5, 1); F('shelf', 1, 1, iw - 4, 1); F('piano', b.w - 3, 1, 1, 2);
        F('table', 3, 6, 2, 1); F('table', 7, 6, 2, 1); F('table', 3, b.h - 3, 2, 1); if (b.w > 12) F('table', 9, b.h - 4, 2, 1);
        b.clerk = { x: b.x + 4, y: b.y + 2 }; break;
      case 'general':
        F('counter', 2, 3, iw - 3, 1); F('shelf', 1, 1, iw, 1); F('barrel', iw, b.h - 3); F('crate', 1, b.h - 3);
        b.clerk = { x: b.x + 4, y: b.y + 2 }; break;
      case 'gunsmith':
        F('counter', 2, 3, iw - 3, 1); F('rack', 1, 1, iw, 1); F('crate', iw, b.h - 3);
        b.clerk = { x: b.x + 4, y: b.y + 2 }; break;
      case 'bank':
        F('counter', 1, 4, 6, 1, SOL.MOVE); F('desk', 2, 1, 2, 1);
        // vault room in the back corner; its door faces straight out into the lobby
        F('vaultwall', 7, 1, 1, 5, SOL.ALL); F('vaultwall', 9, 5, 1, 1, SOL.ALL);
        b.vaultDoor = F('vaultdoor', 8, 5, 1, 1, SOL.ALL);
        F('gold', 8, 2, 2, 1, 0);
        b.vault = { x: (b.x + 9) * TS, y: (b.y + 3) * TS };   // centre of the vault room, next to the gold
        b.clerk = { x: b.x + 4, y: b.y + 3 }; break;
      case 'sheriff':
        F('desk', 2, 3, 2, 1); F('bars', 5, 3, b.w - 6, 1); F('cot', b.w - 3, 1); F('rack', 1, 1, 2, 1);
        b.clerk = { x: b.x + 2, y: b.y + 2 }; break;
      case 'hotel':
        F('counter', 2, b.h - 5, 4, 1); F('bed', 1, 1, 1, 2); F('bed', 3, 1, 1, 2); F('bed', 6, 1, 1, 2); F('bed', 8, 1, 1, 2); F('table', 6, 5, 2, 1);
        b.clerk = { x: b.x + 3, y: b.y + b.h - 6 }; break;
      case 'stables':
        for (let i = 0; i < 4; i++) F('stall', 1 + i * 2 + (i > 1 ? 2 : 0), 1, 1, 3); F('hay', b.w - 3, 1); F('counter', 2, b.h - 4, 3, 1);
        b.clerk = { x: b.x + 3, y: b.y + b.h - 5 }; break;
      case 'station':
        F('counter', 2, 3, 4, 1); F('bench', 7, 2, 3, 1); F('bench', 7, 5, 3, 1);
        b.clerk = { x: b.x + 3, y: b.y + 2 }; break;
      case 'church':
        for (let r = 0; r < 3; r++) { F('bench', 1, 3 + r * 2, 3, 1); F('bench', b.w - 4, 3 + r * 2, 3, 1); } F('altar', 4, 1, 2, 1); break;
      case 'cabin':
        F('bed', 1, 1, 1, 2); F('table', 3, 2, 2, 1); F('stove', b.w - 2, 1);
        if (b.id === 'cabin_trapper') { b.clerk = { x: b.x + 4, y: b.y + 3 }; b.shop = 'trapper'; }
        break;
      default:
        F('bed', 1, 1, 1, 2); F('table', 3, 3, 2, 1); F('stove', b.w - 2, 1);
    }
    this.buildings.push(b);
    return b;
  },

  openVault() {
    const b = this.buildings.find(x => x.id === 'dw_bank');
    if (!b || !b.vaultDoor || b.vaultOpen) return;
    b.vaultOpen = true; b.vaultDoor.sol = 0;
    this.solid[this.idx(b.vaultDoor.x, b.vaultDoor.y)] &= ~SOL.ALL;
    this.invalidateChunkAt(b.vaultDoor.x, b.vaultDoor.y);
  },
  closeVault() {
    const b = this.buildings.find(x => x.id === 'dw_bank');
    if (!b || !b.vaultOpen) return;
    b.vaultOpen = false; b.vaultDoor.sol = SOL.ALL;
    this.solid[this.idx(b.vaultDoor.x, b.vaultDoor.y)] |= SOL.ALL;
  },

  buildingAt(x, y) {
    const tx = Math.floor(x / TS), ty = Math.floor(y / TS);
    for (const b of this.buildings) if (tx > b.x && tx < b.x + b.w - 1 && ty > b.y && ty <= b.y + b.h - 1) return b;
    return null;
  },
  townAt(x, y) {
    const tx = x / TS, ty = y / TS;
    for (const t of this.towns) if (tx >= t.x0 && tx <= t.x1 && ty >= t.y0 && ty <= t.y1) return t;
    return null;
  },
  regionAt(x, y) {
    const town = this.townAt(x, y); if (town) return town.name;
    const tx = x / TS, ty = y / TS;
    if (dist(tx, ty, 255, 50) < 24) return 'Juniper Canyon';
    if (dist(tx, ty, 152, 92) < 10) return "Marshal's Camp";
    for (const c of this.banditCamps) if (dist(x, y, c.x, c.y) < 140) return c.name;
    if (Math.abs(ty - RAIL_ROW) < 4) return 'Iron Horse Railroad';
    if (tx >= this.OW || ty >= this.OH) { const n = this.frontierRegionName && this.frontierRegionName(x, y); if (n) return n; }
    const t = this.tileAtPx(x, y);
    if (t === T.FOREST) return 'Pinewood Forest';
    if (t === T.DRYBED) return 'Bone Dry Wash';
    if (tx > 268 && ty < 110) return 'Broken Teeth Mountains';
    if (t === T.SAND || t === T.CANYON) return 'Red Sand Desert';
    if (t === T.WATER || t === T.BRIDGE) return 'Sweetwater River';
    return 'Coyote Plains';
  },

  /* ------------------------------------------------------------ queries */
  /* line of sight using the given solidity mask (VIS by default) */
  los(ax, ay, bx, by, mask = SOL.VIS) {
    const d = dist(ax, ay, bx, by), steps = Math.ceil(d / 6);
    const sx = (bx - ax) / steps, sy = (by - ay) / steps;
    let lastI = -1;
    for (let i = 1; i < steps; i++) {
      const x = ax + sx * i, y = ay + sy * i, tx = Math.floor(x / TS), ty = Math.floor(y / TS), id = ty * this.W + tx;
      if (id === lastI) continue; lastI = id;
      if (this.sol(tx, ty) & mask) return false;
    }
    return true;
  },

  /* true if a circle of radius r at x,y overlaps a tile with the mask */
  circleBlocked(x, y, r, mask = SOL.MOVE) {
    const x0 = Math.floor((x - r) / TS), x1 = Math.floor((x + r) / TS), y0 = Math.floor((y - r) / TS), y1 = Math.floor((y + r) / TS);
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (this.sol(tx, ty) & mask) return true;
    return false;
  },

  /* nearest walkable pixel position around x,y */
  findOpen(x, y, maxR = 12) {
    const tx0 = Math.floor(x / TS), ty0 = Math.floor(y / TS);
    for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      const tx = tx0 + dx, ty = ty0 + dy;
      if (this.inb(tx, ty) && !(this.sol(tx, ty) & SOL.MOVE) && this.tile(tx, ty) !== T.WATER) return { x: tx * TS + 8, y: ty * TS + 8 };
    }
    return { x, y };
  },

  /* A* path on the tile grid. Returns array of pixel waypoints or null. */
  findPath(sx, sy, ex, ey, maxNodes = 2500) {
    const W = this.W, stx = Math.floor(sx / TS), sty = Math.floor(sy / TS);
    let etx = Math.floor(ex / TS), ety = Math.floor(ey / TS);
    if (this.sol(etx, ety) & SOL.MOVE) { const o = this.findOpen(ex, ey, 3); etx = Math.floor(o.x / TS); ety = Math.floor(o.y / TS); }
    if (stx === etx && sty === ety) return [{ x: ex, y: ey }];
    const start = sty * W + stx, goal = ety * W + etx;
    const g = new Map(), came = new Map(), closed = new Set();
    const heap = new MinHeap();
    g.set(start, 0); heap.push(start, 0);
    let n = 0, best = start, bestH = Infinity;
    const dirs = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.41], [1, -1, 1.41], [-1, 1, 1.41], [-1, -1, 1.41]];
    while (heap.size && n < maxNodes) {
      const cur = heap.pop();
      if (closed.has(cur)) continue;
      closed.add(cur); n++;
      if (cur === goal) { best = cur; break; }
      const cx = cur % W, cy = (cur / W) | 0;
      const h = Math.abs(cx - etx) + Math.abs(cy - ety);
      if (h < bestH) { bestH = h; best = cur; }
      for (const [dx, dy, c] of dirs) {
        const nx = cx + dx, ny = cy + dy;
        if (!this.inb(nx, ny) || (this.solid[ny * W + nx] & SOL.MOVE)) continue;
        if (dx && dy && ((this.solid[cy * W + nx] & SOL.MOVE) || (this.solid[ny * W + cx] & SOL.MOVE))) continue;
        const ni = ny * W + nx, nt = this.tiles[ni], ng = g.get(cur) + c * (nt === T.WATER ? 6 : nt === T.ROCK ? 3 : 1);   // NPCs prefer to go around lakes and cliffs
        if (ng < (g.has(ni) ? g.get(ni) : Infinity)) {
          g.set(ni, ng); came.set(ni, cur);
          heap.push(ni, ng + Math.hypot(nx - etx, ny - ety) * 1.1);
        }
      }
    }
    const path = [];
    let c = best;
    while (c !== start && c !== undefined) { path.push({ x: (c % W) * TS + 8, y: ((c / W) | 0) * TS + 8 }); c = came.get(c); }
    path.reverse();
    if (best === goal && path.length) path[path.length - 1] = { x: ex, y: ey };
    return path.length ? path : null;
  },

  randomOpenNear(x, y, rmin, rmax, avoidView) {
    for (let i = 0; i < 30; i++) {
      const a = rand(TAU), r = rand(rmin, rmax), px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      const tx = Math.floor(px / TS), ty = Math.floor(py / TS);
      if (!this.inb(tx, ty) || (this.sol(tx, ty) & SOL.MOVE) || this.circleBlocked(px, py, 6) || this.tiles[ty * this.W + tx] === T.WATER || this.tiles[ty * this.W + tx] === T.ROCK) continue;
      if (this.buildingAt(px, py)) continue;
      if (avoidView && avoidView(px, py)) continue;
      return { x: px, y: py };
    }
    return null;
  },

  /* ------------------------------------------------------------ rendering */
  buildMinimap() {
    const c = document.createElement('canvas'); c.width = this.W; c.height = this.H;
    const g = c.getContext('2d'), img = g.createImageData(this.W, this.H);
    const col = {
      [T.GRASS]: [104, 120, 60], [T.SAND]: [205, 168, 110], [T.ROAD]: [150, 108, 70], [T.FOREST]: [46, 70, 38], [T.WATER]: [60, 110, 140],
      [T.ROCK]: [110, 84, 70], [T.FLOOR]: [70, 46, 30], [T.WALL]: [60, 38, 24], [T.BRIDGE]: [130, 92, 56], [T.DRYBED]: [184, 156, 118],
      [T.SCRUB]: [150, 136, 84], [T.TOWN]: [170, 134, 92], [T.GRAVEL]: [90, 82, 76], [T.BOARD]: [130, 92, 56], [T.CANYON]: [168, 102, 66],
      [T.SNOW]: [228, 232, 238], [T.ICE]: [176, 210, 228], [T.CLAY]: [176, 86, 54], [T.SALT]: [238, 234, 224], [T.SHALLOW]: [112, 152, 160], [T.PRAIRIE]: [112, 140, 64], [T.SNOWFOREST]: [72, 98, 86]
    };
    for (let i = 0; i < this.W * this.H; i++) {
      const cc = col[this.tiles[i]] || [0, 0, 0], o = i * 4;
      img.data[o] = cc[0]; img.data[o + 1] = cc[1]; img.data[o + 2] = cc[2]; img.data[o + 3] = 255;
    }
    for (const p of this.props) if (p.t === 'pine' || p.t === 'oak') { const o = (p.ty * this.W + p.tx) * 4; img.data[o] = 30; img.data[o + 1] = 52; img.data[o + 2] = 28; }
    g.putImageData(img, 0, 0);
    for (const b of this.buildings) { g.fillStyle = b.roof || '#5a3a2a'; g.fillRect(b.x, b.y, b.w, b.h); }
    g.fillStyle = '#3a3030'; g.fillRect(0, RAIL_ROW, this.W, 1);
    this.minimap = c;
  },

  pixelColor(t, px, py, tx, ty, out) {
    const n = hash2(px, py), nb = hash2(px >> 2, py >> 2), nc = hash2(px >> 3, py >> 3);
    let r, g, b;
    switch (t) {
      case T.GRASS: {
        r = 98; g = 118; b = 54;
        const v = (nb - 0.5) * 16 + (n - 0.5) * 12 + (nc - 0.5) * 10; r += v; g += v * 1.1; b += v * 0.6;
        if (n > 0.94) { r += 34; g += 26; b += 6; } else if (n < 0.05) { r -= 18; g -= 14; b -= 10; }
        break;
      }
      case T.SCRUB: { r = 156; g = 140; b = 84; const v = (nb - 0.5) * 18 + (n - 0.5) * 14; r += v; g += v; b += v * 0.7; if (n > 0.93) { r -= 30; g -= 18; b -= 20; } break; }
      case T.SAND: {
        r = 216; g = 178; b = 118;
        const rip = Math.sin(px * 0.25 + py * 0.9 + nc * 4) * 5;
        const v = (nb - 0.5) * 12 + (n - 0.5) * 10 + rip; r += v; g += v * 0.9; b += v * 0.7;
        if (n > 0.97) { r -= 40; g -= 40; b -= 30; }
        break;
      }
      case T.FOREST: { r = 58; g = 78; b = 42; const v = (nb - 0.5) * 14 + (n - 0.5) * 12; r += v * 0.8; g += v; b += v * 0.6; if (n > 0.9) { r += 30; g += 14; b -= 4; } break; }
      case T.WATER: {
        r = 44; g = 88; b = 118;
        const land = (dx, dy) => { const nt = this.tile(tx + dx, ty + dy); return nt !== T.WATER && nt !== T.BRIDGE; };
        const lx = px % TS, ly = py % TS;
        let e = 99;
        if (land(-1, 0)) e = Math.min(e, lx); if (land(1, 0)) e = Math.min(e, TS - 1 - lx);
        if (land(0, -1)) e = Math.min(e, ly); if (land(0, 1)) e = Math.min(e, TS - 1 - ly);
        const v = (nb - 0.5) * 10; r += v; g += v; b += v;
        const ew = e + (hash2(px >> 1, py >> 1) - 0.5) * 3;
        if (ew < 2) { r += 60; g += 58; b += 44; } else if (ew < 6) { r += 18; g += 24; b += 16; }
        break;
      }
      case T.ROCK: {
        r = 132; g = 102; b = 82;
        const ly = py % TS, below = this.tile(tx, ty + 1), above = this.tile(tx, ty - 1);
        const v = (nb - 0.5) * 18 + (n - 0.5) * 12; r += v; g += v * 0.9; b += v * 0.8;
        if (below !== T.ROCK && ly >= 5) { r = 92 + (hash2(px, 0) - 0.5) * 22 - ly; g = 66 - ly * 0.8 + (hash2(px, 1) - 0.5) * 14; b = 52 - ly * 0.6; }
        else if (above !== T.ROCK && ly < 2) { r += 30; g += 26; b += 20; }
        if (this.tile(tx - 1, ty) !== T.ROCK && px % TS < 2) { r -= 18; g -= 16; b -= 14; }
        break;
      }
      case T.FLOOR: {
        r = 116; g = 78; b = 46;
        const row = py >> 2, seamV = ((px + row * 7) % 14) === 0;
        if ((py & 3) === 0 || seamV) { r -= 26; g -= 20; b -= 14; }
        const v = (hash2(px >> 3, row) - 0.5) * 16 + (n - 0.5) * 6; r += v; g += v * 0.8; b += v * 0.6;
        break;
      }
      case T.WALL: { r = 74; g = 48; b = 30; if ((py & 3) === 0) { r -= 20; g -= 14; b -= 10; } const v = (n - 0.5) * 8; r += v; g += v; b += v; break; }
      case T.BRIDGE: case T.BOARD: {
        r = 132; g = 94; b = 58;
        const vertical = t === T.BRIDGE && this.tile(tx, ty - 1) !== T.GRAVEL && this.tile(tx, ty + 1) !== T.GRAVEL && (this.tile(tx, ty - 1) === T.BRIDGE || this.tile(tx, ty + 1) === T.BRIDGE) && this.tile(tx - 1, ty) !== T.BRIDGE;
        const a = vertical ? py : px, bb = vertical ? px : py;
        if ((a & 3) === 0) { r -= 34; g -= 26; b -= 18; }
        if (((bb + (a >> 2) * 5) % 13) === 0) { r -= 20; g -= 16; b -= 10; }
        const v = (hash2(a >> 2, 7) - 0.5) * 18; r += v; g += v * 0.8; b += v * 0.6;
        break;
      }
      case T.DRYBED: {
        r = 188; g = 158; b = 118;
        const v = (nb - 0.5) * 10 + (n - 0.5) * 8; r += v; g += v; b += v;
        const ck = Math.abs(Math.sin(px * 0.31 + Math.cos(py * 0.23) * 2.3) * Math.sin(py * 0.27 + Math.sin(px * 0.19) * 2));
        if (ck < 0.05) { r -= 50; g -= 44; b -= 34; }
        break;
      }
      case T.TOWN: { r = 166; g = 130; b = 88; const v = (nb - 0.5) * 12 + (n - 0.5) * 12; r += v; g += v * 0.9; b += v * 0.8; if (n > 0.96) { r += 20; g += 18; b += 14; } break; }
      case T.ROAD: {
        r = 146; g = 108; b = 70;
        const v = (nb - 0.5) * 10 + (n - 0.5) * 14; r += v; g += v * 0.9; b += v * 0.8;
        if (n > 0.97) { r -= 30; g -= 26; b -= 20; }
        break;
      }
      case T.GRAVEL: { r = 118; g = 106; b = 96; const v = (n - 0.5) * 34; r += v; g += v; b += v; break; }
      case T.CANYON: { r = 172; g = 106; b = 70; const v = (nb - 0.5) * 14 + (n - 0.5) * 12; r += v; g += v * 0.8; b += v * 0.7; break; }
      case T.SNOW: {
        r = 228; g = 232; b = 240;
        const v = (nb - 0.5) * 10 + (n - 0.5) * 6 + (nc - 0.5) * 8; r += v; g += v; b += v * 0.6;
        if (n > 0.985) { r = g = b = 255; } else if (nc < 0.3) { r -= 14; g -= 10; b -= 2; }
        break;
      }
      case T.SNOWFOREST: {
        r = 76; g = 100; b = 86;
        const v = (nb - 0.5) * 14 + (n - 0.5) * 10; r += v; g += v; b += v;
        if (nc > 0.62 || n > 0.9) { r = 214 + v; g = 222 + v; b = 230 + v; }
        break;
      }
      case T.ICE: {
        r = 172; g = 206; b = 226;
        const v = (nb - 0.5) * 10; r += v; g += v; b += v;
        const ck = Math.abs(Math.sin(px * 0.21 + Math.cos(py * 0.17) * 3) * Math.sin(py * 0.19 + Math.sin(px * 0.13) * 2));
        if (ck < 0.035) { r += 50; g += 40; b += 26; }
        if (n > 0.97) { r = g = b = 250; }
        break;
      }
      case T.CLAY: {
        r = 180; g = 88; b = 56;
        const v = (nb - 0.5) * 16 + (n - 0.5) * 12; r += v; g += v * 0.7; b += v * 0.6;
        if (Math.sin(py * 0.5 + nc * 6) > 0.92) { r -= 22; g -= 12; b -= 8; }
        if (n > 0.97) { r += 30; g += 24; b += 18; }
        break;
      }
      case T.SALT: {
        r = 238; g = 234; b = 224;
        const v = (nb - 0.5) * 6 + (n - 0.5) * 6; r += v; g += v; b += v;
        const ck = Math.abs(Math.sin(px * 0.13 + Math.cos(py * 0.11) * 2.7) * Math.sin(py * 0.12 + Math.sin(px * 0.09) * 2.1));
        if (ck < 0.03) { r -= 40; g -= 36; b -= 30; }
        break;
      }
      case T.SHALLOW: {
        r = 104; g = 146; b = 154;
        const v = (nb - 0.5) * 10; r += v; g += v; b += v;
        if (Math.sin(px * 0.6 + py * 0.25 + nc * 5) > 0.85) { r += 40; g += 40; b += 34; }
        if (n > 0.95) { r = 150; g = 130; b = 100; }
        break;
      }
      case T.PRAIRIE: {
        r = 104; g = 138; b = 58;
        const v = (nb - 0.5) * 16 + (n - 0.5) * 12 + (nc - 0.5) * 10; r += v; g += v * 1.1; b += v * 0.6;
        if (n > 0.95) { r += 40; g += 30; b -= 4; } else if (n < 0.04) { r -= 20; g -= 16; b -= 10; }
        break;
      }
      default: r = g = b = 255;
    }
    out[0] = r; out[1] = g; out[2] = b;
  },

  renderChunk(cx, cy) {
    const S = this.CH * TS, c = document.createElement('canvas'); c.width = S; c.height = S;
    const g = c.getContext('2d'), img = g.createImageData(S, S), d = img.data, col = [0, 0, 0];
    const ox = cx * S, oy = cy * S;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const px = ox + x, py = oy + y;
      let tx = Math.floor(px / TS), ty = Math.floor(py / TS), t = this.tile(tx, ty);
      if (NATURAL.has(t)) {
        const jx = (hash2(px >> 1, (py >> 1) + 999) - 0.5) * 7, jy = (hash2((px >> 1) + 555, py >> 1) - 0.5) * 7;
        const jtx = Math.floor((px + jx) / TS), jty = Math.floor((py + jy) / TS), jt = this.tile(jtx, jty);
        // jitter borders between natural ground types, but never across a water edge
        if (NATURAL.has(jt) && (jt === T.WATER) === (t === T.WATER)) { t = jt; tx = jtx; ty = jty; }
      }
      this.pixelColor(t, px, py, tx, ty, col);
      const o = (y * S + x) * 4;
      d[o] = col[0]; d[o + 1] = col[1]; d[o + 2] = col[2]; d[o + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    g.save(); g.translate(-ox, -oy);
    // railroad ties and rails
    if (oy <= (RAIL_ROW + 1) * TS && oy + S >= (RAIL_ROW - 1) * TS) {
      const ry = RAIL_ROW * TS;
      for (let x = ox; x < ox + S; x += 6) { g.fillStyle = (x / 6) % 3 === 0 ? '#4a3424' : '#5a3e2a'; g.fillRect(x, ry + 1, 3, 14); }
      g.fillStyle = '#8a8a90'; g.fillRect(ox, ry + 3, S, 2); g.fillRect(ox, ry + 11, S, 2);
      g.fillStyle = '#c8c8d0'; g.fillRect(ox, ry + 3, S, 1); g.fillRect(ox, ry + 11, S, 1);
    }
    // flat props
    const list = this.propsByChunk[cx + cy * this.CW] || [];
    for (const p of list) if (PROP_DEFS[p.t].flat) Sprites.flatProp(g, p);
    g.restore();
    return c;
  },

  invalidateChunkAt(tx, ty) {
    const key = Math.floor(tx / this.CH) + ',' + Math.floor(ty / this.CH);
    this.chunkCache.delete(key);
  },

  getChunk(cx, cy) {
    const key = cx + ',' + cy;
    let c = this.chunkCache.get(key);
    if (c) { this.chunkCache.delete(key); this.chunkCache.set(key, c); return c; } // LRU touch
    c = this.renderChunk(cx, cy);
    this.chunkCache.set(key, c);
    if (this.chunkCache.size > 70) this.chunkCache.delete(this.chunkCache.keys().next().value);
    return c;
  },

  drawGround(ctx, camX, camY, vw, vh, time) {
    const S = this.CH * TS;
    const cx0 = Math.max(0, Math.floor(camX / S)), cy0 = Math.max(0, Math.floor(camY / S));
    const cx1 = Math.min(this.CW - 1, Math.floor((camX + vw) / S)), cy1 = Math.min(this.CHh - 1, Math.floor((camY + vh) / S));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) ctx.drawImage(this.getChunk(cx, cy), cx * S, cy * S);
    // animated water glints
    const tx0 = Math.max(0, Math.floor(camX / TS)), ty0 = Math.max(0, Math.floor(camY / TS));
    const tx1 = Math.min(this.W - 1, Math.floor((camX + vw) / TS)), ty1 = Math.min(this.H - 1, Math.floor((camY + vh) / TS));
    ctx.fillStyle = 'rgba(190,225,240,0.55)';
    for (let ty = ty0; ty <= ty1; ty++) for (let tx = tx0; tx <= tx1; tx++) {
      if (this.tiles[ty * this.W + tx] !== T.WATER) continue;
      const h = hash2(tx, ty);
      for (let k = 0; k < 2; k++) {
        const ph = (time * (0.6 + h * 0.5) + h * 10 + k * 0.5) % 1;
        const gx = tx * TS + ((h * 37 + k * 7) % 13) + Math.sin(time * 2 + h * 6) * 1.5, gy = ty * TS + ((ph * 16 + k * 8) % 15);
        if (Math.sin(time * 3 + h * 20 + k) > 0.1) ctx.fillRect(gx | 0, gy | 0, 3, 1);
      }
    }
  },

  /* movement multiplier for the ground at a pixel (fords, deep snow) */
  terrainMul(x, y) {
    const t = this.tileAtPx(x, y);
    return t === T.SHALLOW ? 0.55 : t === T.ROCK ? 0.8 : t === T.SNOWFOREST ? 0.8 : t === T.SNOW ? 0.88 : 1;
  },

  /* collect tall props intersecting a rect for y-sorted drawing */
  tallPropsIn(x0, y0, x1, y1, out) {
    const S = this.CH * TS;
    const cx0 = Math.max(0, Math.floor((x0 - 72) / S)), cy0 = Math.max(0, Math.floor(y0 / S));
    const cx1 = Math.min(this.CW - 1, Math.floor((x1 + 72) / S)), cy1 = Math.min(this.CHh - 1, Math.floor((y1 + 80) / S));
    for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++) {
      for (const p of this.tallByChunk[cx + cy * this.CW]) if (p.x > x0 - 72 && p.x < x1 + 72 && p.y > y0 && p.y < y1 + 80) out.push(p);
    }
    return out;
  }
};
