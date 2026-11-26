/* Outlaw County — guns.js (v2.9)
 * New art for every weapon. Each icon is hand-placed pixel art drawn once
 * into a small canvas and scaled up crisp wherever an icon is shown (HUD,
 * weapon wheel, inventory, shops, website). The revolvers and pistols follow
 * the revolver on the game's skull icon: steel barrel with a light top edge,
 * fluted cylinder, ejector rod, hammer spur, trigger guard and curved grip.
 * The guns in characters' hands are redrawn to match.
 */
'use strict';

const GunArt = (function () {
  const C = { ink: '#1a0e08', steel: '#5c6068', steelL: '#c8ced8', steelM: '#8a9098', steelD: '#2a2c30', blue: '#3a4250', blueL: '#8a98b0', blueM: '#5a6478', nick: '#a8aeb8', nickL: '#eef2f8', nickM: '#c8ccd4',
    brass: '#b8862a', brassL: '#f0c860', brassD: '#7a5418', ivory: '#ece2c8', ivoryD: '#b8a888', wood: '#8a5230', woodL: '#b0703c', woodD: '#5a3418', pearl: '#e8e4f0', pearlD: '#b0a8c8',
    walnut: '#5a3418', walnutL: '#7a4a28', walnutD: '#3a2010', maple: '#b07840', mapleL: '#d8a060', mapleD: '#7a5028', gold: '#f0c860' };
  const icon = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); const P = (col, x, y, ww = 1, hh = 1) => { if (col === 'clear') g.clearRect(x, y, ww, hh); else { g.fillStyle = col; g.fillRect(x, y, ww, hh); } }; draw(P, g); return c; };
  const STEEL = [C.steel, C.steelL, C.steelD, C.steelM], BLUE = [C.blue, C.blueL, C.steelD, C.blueM], NICK = [C.nick, C.nickL, C.steel, C.nickM], BRASS = [C.brass, C.brassL, C.brassD, C.brassL];

  /* ---------------- revolvers ---------------- */
  const GRIPS = { plow: [[10, 4, 8], [11, 4, 8], [12, 3, 7], [13, 3, 7], [14, 2, 7], [15, 2, 6], [16, 1, 6]], bird: [[10, 5, 8], [11, 5, 8], [12, 4, 8], [13, 4, 8], [14, 3, 8], [15, 3, 8], [16, 4, 7]] };
  const gripPal = { ivory: [C.ivory, C.ivoryD, '#fffaf0'], wood: [C.wood, C.woodD, C.woodL], pearl: [C.pearl, C.pearlD, '#ffffff'], walnut: [C.woodD, '#3a2010', C.wood] };
  const drawGrip = (P, spans, kind, checker) => {
    const [f, d, l] = gripPal[kind];
    spans.forEach(([y, a, b], i) => P(C.ink, a - 1, y, b - a + 3, i === spans.length - 1 ? 2 : 1));
    for (const [y, a, b] of spans) { P(f, a, y, b - a + 1, 1); P(d, b, y); }
    spans.slice(0, -1).forEach(([y, a]) => P(l, a + 1, y));
    if (checker) spans.slice(1, -1).forEach(([y, a, b], i) => { for (let x = a + 2 + (i % 2); x < b; x += 2) P(d, x, y); });
    if (kind === 'wood' || kind === 'walnut') { const m = spans[2]; P(C.brassL, m[1] + 2, m[0]); }
  };
  const revolver = o => icon(40, 18, P => {
    const L = o.len || 15, M = o.metal || STEEL, F = o.frame || M, bx = 17;
    P(C.ink, bx - 1, 3, L + 2, 5); P(M[0], bx, 4, L, 3); P(M[1], bx, 4, L, 1); P(M[2], bx, 6, L, 1);
    if (o.octagon) P(M[3], bx, 5, L, 1);
    P(C.ink, bx + L - 2, 2, 2, 1);
    const rl = Math.min(o.rodLen || 9, L - 2);
    if (o.lever) { P(C.ink, bx - 1, 7, rl + 2, 3); P(M[2], bx, 8, rl, 1); P(M[3], bx + rl - 3, 8, 3, 1); P(C.ink, bx + rl - 1, 7, 2, 4); }
    else { P(C.ink, bx - 1, 7, rl + 2, 3); P(M[3], bx, 8, rl, 1); P(M[1], bx + rl - 1, 8); }
    P(C.ink, 6, 2, 12, 9); P(F[0], 7, 3, 10, 7); P(F[1], 7, 3, 10, 1); P(F[2], 7, 9, 10, 1);
    P(C.ink, 9, 3, 8, 7); P(M[0], 10, 4, 6, 5); P(M[1], 10, 4, 6, 1); P(M[2], 11, 5, 1, 4); P(M[2], 13, 5, 1, 4); P(M[2], 15, 5, 1, 4); P(M[1], 12, 5);
    if (o.topbreak) { P(C.ink, 15, 1, 4, 3); P(M[3], 16, 2, 2, 1); }
    if (o.smallHammer) { P(C.ink, 5, 1, 4, 3); P(M[2], 6, 2, 2, 1); }
    else { P(C.ink, 3, 0, 3, 2); P(C.ink, 4, 1, 4, 3); P(M[3], 4, 1); P(M[2], 5, 2, 2, 1); }
    drawGrip(P, GRIPS[o.gripShape || 'plow'], o.grip || 'ivory', o.checker);
    const gx = o.gripShape === 'bird' ? 10 : 9, gw = o.bigGuard ? 8 : 7;
    P(C.ink, gx, 13, gw, 2); P(F[3], gx + 1, 13, gw - 2, 1); P(C.ink, gx + gw - 1, 10, 2, 4); P(F[3], gx + gw - 1, 11, 1, 2);
    P(C.ink, gx + 2, 10, 2, 2); P(M[1], gx + 2, 10); P(C.ink, gx + 3, 12);
    if (o.engraved) { P(C.brassL, 8, 5); P(C.brassL, 8, 7); P(C.brassL, 16, 9); P(C.brassL, 7, 3, 2, 1); }
  });

  /* ---------------- long guns ---------------- */
  const WOOD = { wood: [C.wood, C.woodL, C.woodD], walnut: [C.walnut, C.walnutL, C.walnutD], maple: [C.maple, C.mapleL, C.mapleD] };
  const longgun = o => icon(56, 16, P => {
    const rx = o.rx || 16, rw = o.rw || 8, L = o.len || 24, M = o.metal || STEEL, Rc = o.rec || M, W = WOOD[o.wood || 'wood'], bx = rx + rw;
    const x0 = o.sawn ? rx - 6 : 0;
    for (let x = x0; x < rx; x++) {
      const t = o.sawn ? 1 : x / (rx - 1), top = o.sawn ? 5 : 4 + Math.round(t), bot = o.sawn ? (x < rx - 3 ? 12 : 9) : Math.round(12 - t * 3.6);
      P(C.ink, x, top - 1, 1, bot - top + 3); P(W[0], x, top, 1, bot - top + 1); P(W[1], x, top, 1, 1); P(W[2], x, bot, 1, 1);
    }
    if (!o.sawn) { P(C.ink, 0, 3, 1, 11); P(C.steelD, 1, 4, 1, 9); P(W[1], 4, 7, 5, 1); } else P(C.ink, x0, 4, 1, 10);
    if (o.double) { P(C.ink, bx - 1, 2, L + 2, 6); P(M[0], bx, 3, L, 4); P(M[1], bx, 3, L, 1); P(C.ink, bx, 5, L, 1); P(M[1], bx, 6, L, 1); P(C.brassL, bx + L - 1, 2); }
    else { P(C.ink, bx - 1, 2, L + 2, 5); P(M[0], bx, 3, L, 3); P(M[1], bx, 3, L, 1); P(M[2], bx, 5, L, 1); if (o.octagon) P(M[3], bx, 4, L, 1); P(C.ink, bx + L - 2, 1, 2, 1); }
    if (o.tube) { P(C.ink, bx - 1, 6, o.tube + 2, 3); P(M[3], bx, 7, o.tube, 1); P(M[1], bx + o.tube - 1, 7); }
    if (o.forend) {
      const fl = o.forend, fy = o.double ? 7 : 6, fh = o.tube ? 2 : 3;
      P(C.ink, bx - 1, fy, fl + 2, fh + 1 + (o.pump ? 1 : 0)); P(o.pump ? W[2] : W[0], bx, fy, fl, fh - 1 + (o.pump ? 1 : 0)); P(W[1], bx, fy, fl, 1);
      if (o.band !== false && !o.pump) { P(C.ink, bx + fl, 2, 2, fy + fh - 1); P(o.bandC || M[3], bx + fl, 3, 1, fy + fh - 3); }
    }
    P(C.ink, rx, 2, rw + 1, 9); P(Rc[0], rx + 1, 3, rw - 1, 7); P(Rc[1], rx + 1, 3, rw - 1, 1); P(Rc[2], rx + 1, 9, rw - 1, 1); P(Rc[3], rx + rw - 2, 5);
    if (o.hump) { P(C.ink, rx, 0, rw - 2, 3); P(Rc[0], rx + 1, 1, rw - 4, 2); P(Rc[1], rx + 1, 1, rw - 4, 1); }
    if (o.port) P(C.ink, rx + 2, 5, 3, 1);
    if (o.lever) { P(C.ink, rx + 1, 10, 9, 6); P(o.lever, rx + 2, 11, 7, 4); P('clear', rx + 3, 12, 5, 2); P(C.ink, rx + 4, 11, 1, 2); P(C.ink, rx + 1, 10, 1, 1); }
    else { P(C.ink, rx + 1, 10, 7, 4); P(M[3], rx + 2, 12, 5, 1); P('clear', rx + 2, 10, 5, 2); P(C.ink, rx + 4, 10, 1, 2); P(C.ink, rx + 7, 10, 1, 3); }
    if (o.hammer) { P(C.ink, rx - 1, 0, 3, 2); P(C.ink, rx + 1, 1, 2, 2); P(M[3], rx, 0); }
    if (o.hammers) { P(C.ink, rx - 1, 0, 3, 2); P(C.ink, rx + 1, 1, 2, 2); P(M[3], rx, 0); P(C.ink, rx + 2, 0, 3, 2); P(M[3], rx + 3, 0); }
    if (o.bolt) {   // bolt body along the receiver, handle and round knob dropping behind the trigger
      P(M[3], rx + 1, 5, rw - 1, 1); P(C.ink, rx + 2, 5, 1, 1);
      P(C.ink, rx + 1, 6, 2, 5); P(M[1], rx + 1, 7, 1, 3); P(C.ink, rx - 2, 10, 4, 4); P(M[1], rx - 1, 11, 2, 2); P('#ffffff', rx - 1, 11);
    }
    if (o.ring) { P(C.ink, rx + 2, 4, 3, 3); P(C.brassL, rx + 3, 5); }
    if (o.block) { P(C.ink, rx + 2, 0, 4, 4); P(M[1], rx + 3, 1, 2, 2); P(M[2], rx + 3, 2, 2, 1); }
    if (o.tang) { P(C.ink, rx - 1, 0, 2, 4); P(M[1], rx, 1, 1, 2); }
    if (o.scope) { P(C.ink, rx - 2, 0, 22, 3); P('#202026', rx - 1, 1, 20, 1); P(C.ink, rx - 3, 0, 1, 3); P(C.ink, rx + 19, 0, 3, 3); P('#9ac8ff', rx + 20, 1); P(C.ink, rx + 3, 3, 2, 1); P(C.ink, rx + 12, 3, 2, 1); }
    if (o.pump) { const sx = bx; P(C.ink, sx + 1, 5, 11, 6); P(W[2], sx + 2, 6, 9, 4); P(W[0], sx + 2, 6, 9, 1); for (let i = 3; i < 11; i += 2) P(C.ink, sx + i, 7, 1, 3); }
  });

  const bowBase = (P, g) => { g.lineWidth = 3; g.strokeStyle = C.ink; g.beginPath(); g.arc(3, 12, 11, -1.25, 1.25); g.stroke(); g.lineWidth = 1; g.strokeStyle = C.woodL; g.beginPath(); g.arc(3, 12, 11, -1.2, 1.2); g.stroke(); P('#e8e0d0', 6, 2, 1, 20); };
  const DRAW = {
    fists: () => icon(24, 16, P => { P(C.ink, 3, 2, 12, 11); P('#d9a27a', 4, 3, 10, 9); P('#b07a52', 4, 11, 10, 1); for (let i = 0; i < 3; i++) P(C.ink, 6 + i * 3, 3, 1, 4); P('#f0c8a0', 4, 3, 10, 1); P(C.ink, 1, 6, 4, 6); P('#d9a27a', 2, 7, 2, 4); P(C.ink, 14, 5, 8, 7); P('#8a5a3a', 15, 6, 6, 5); P('#6a4426', 15, 10, 6, 1); }),
    knife: () => icon(32, 12, P => { P(C.ink, 0, 4, 10, 5); P(C.woodD, 1, 5, 8, 3); P(C.woodL, 1, 5, 8, 1); P(C.brass, 3, 6); P(C.brass, 6, 6); P(C.ink, 9, 2, 3, 9); P(C.brass, 10, 3, 1, 7); P(C.ink, 12, 3, 19, 5); P('#d8dde2', 12, 4, 18, 3); P('#ffffff', 13, 4, 15, 1); P('#9aa0a6', 12, 6, 16, 1); P(C.ink, 28, 3, 3, 2); P('#d8dde2', 28, 4, 2, 1); }),
    machete: () => icon(40, 12, P => { P(C.ink, 0, 4, 10, 5); P(C.woodD, 1, 5, 8, 3); P(C.wood, 1, 5, 8, 1); P(C.ink, 9, 3, 2, 7); P(C.ink, 11, 2, 27, 7); P('#c8ccd0', 11, 3, 26, 5); P('#f0f2f4', 12, 3, 24, 1); P('#8a9096', 11, 7, 25, 1); P(C.ink, 37, 3, 2, 5); P('#c8ccd0', 36, 4, 2, 3); }),
    tomahawk: () => icon(36, 16, P => { P(C.ink, 0, 7, 28, 4); P(C.wood, 1, 8, 26, 2); P(C.woodL, 1, 8, 26, 1); P(C.ink, 6, 6, 2, 6); P('#c8321e', 6, 7, 2, 4); P('#e8d8b0', 9, 7, 1, 4); P(C.ink, 24, 1, 9, 14); P('#6a6e76', 25, 2, 6, 12); P('#d8dde2', 30, 2, 2, 12); P('#ffffff', 31, 3, 1, 10); P(C.ink, 20, 5, 5, 6); P('#6a6e76', 21, 6, 3, 4); }),
    sa: () => revolver({ len: 15, grip: 'ivory' }),
    da: () => revolver({ len: 10, grip: 'wood', gripShape: 'bird', checker: true, metal: NICK, rodLen: 7, smallHammer: true, bigGuard: true }),
    navy: () => revolver({ len: 17, grip: 'wood', frame: BRASS, octagon: true, lever: true, rodLen: 10 }),
    schofield: () => revolver({ len: 14, grip: 'walnut', checker: true, metal: BLUE, topbreak: true }),
    cavalry: () => revolver({ len: 21, grip: 'pearl', rodLen: 11, engraved: true }),
    derringer: () => icon(26, 16, P => {
      P(C.ink, 7, 1, 17, 9); P(C.nick, 8, 2, 15, 3); P(C.nickL, 8, 2, 15, 1); P(C.ink, 8, 5, 15, 1); P(C.nick, 8, 6, 15, 3); P(C.nickL, 8, 6, 15, 1); P(C.steel, 8, 8, 15, 1);
      P(C.ink, 21, 0, 2, 1); P(C.steelD, 22, 3); P(C.steelD, 22, 7);
      P(C.ink, 4, 2, 5, 9); P(C.brass, 5, 3, 3, 7); P(C.brassL, 5, 3, 3, 1); P(C.brassD, 5, 9, 3, 1);
      P(C.ink, 2, 0, 3, 2); P(C.ink, 3, 1, 3, 2); P(C.steelM, 3, 1);
      drawGrip(P, [[9, 3, 6], [10, 3, 6], [11, 2, 6], [12, 2, 5], [13, 1, 5]], 'pearl');
      P(C.ink, 9, 10, 2, 3); P(C.steelM, 9, 10);
    }),
    autopistol: () => icon(40, 18, P => {
      P(C.ink, 4, 2, 30, 7); P(C.blue, 5, 3, 28, 5); P(C.blueL, 5, 3, 28, 1); P(C.steelD, 5, 7, 28, 1);
      for (let i = 0; i < 4; i++) P(C.ink, 6 + i * 2, 4, 1, 2);
      P(C.blueM, 19, 5, 13, 1); P(C.ink, 31, 1, 2, 1); P(C.ink, 5, 1, 2, 1);
      P(C.ink, 14, 8, 6, 8); P(C.steelD, 15, 9, 4, 6); P(C.blueM, 15, 9, 4, 1); P(C.blueM, 15, 11, 4, 1); P(C.blueM, 15, 13, 4, 1);
      P(C.ink, 2, 1, 3, 3); P(C.steelD, 3, 2);
      drawGrip(P, [[8, 4, 8], [9, 3, 7], [10, 3, 7], [11, 3, 7], [12, 2, 6], [13, 2, 6], [14, 2, 6], [15, 2, 6]], 'wood', true);
      P(C.ink, 8, 13, 6, 2); P(C.blueM, 9, 13, 4, 1); P(C.ink, 10, 9, 2, 2); P(C.blueL, 10, 9); P(C.ink, 11, 11);
    }),
    lever: () => longgun({ len: 24, lever: C.steelM, tube: 18, forend: 9, hammer: true }),
    repeater: () => longgun({ len: 19, lever: C.steelM, tube: 16, forend: 8, hammer: true, wood: 'walnut', rw: 7, port: true }),
    carbine: () => longgun({ len: 16, lever: C.blueL, forend: 7, hammer: true, ring: true, rw: 7, rx: 15, metal: BLUE }),
    brasslever: () => longgun({ len: 24, lever: C.brassL, tube: 20, forend: 8, hammer: true, rec: BRASS, bandC: C.brass, wood: 'walnut' }),
    bolt: () => longgun({ len: 24, forend: 18, bolt: true, wood: 'walnut', bandC: C.steelL }),
    rolling: () => longgun({ len: 26, forend: 9, block: true, hammer: true, rw: 6, wood: 'maple' }),
    buffalo: () => longgun({ len: 32, forend: 9, octagon: true, tang: true, hammer: true, rw: 7, metal: BLUE, rec: NICK, band: false }),
    scoped: () => longgun({ len: 26, forend: 14, bolt: true, scope: true, wood: 'walnut' }),
    shotgun: () => longgun({ len: 20, double: true, forend: 7, hammers: true, rw: 7 }),
    double: () => longgun({ len: 28, double: true, forend: 8, rw: 7, rec: NICK, wood: 'walnut', band: false }),
    sawedoff: () => longgun({ len: 11, double: true, hammers: true, sawn: true, rx: 9, rw: 7, forend: 5, band: false }),
    pump: () => longgun({ len: 22, tube: 17, forend: 8, pump: true, rw: 8, metal: BLUE }),
    semiauto: () => longgun({ len: 22, tube: 16, forend: 9, hump: true, rw: 10, rec: BLUE, wood: 'maple', band: false }),
    bow: () => icon(40, 24, (P, g) => { bowBase(P, g); P(C.ink, 6, 11, 31, 3); P(C.woodD, 7, 12, 28, 1); P('#c8321e', 7, 10, 4, 1); P('#c8321e', 7, 14, 4, 1); P(C.ink, 34, 9, 5, 7); P('#c8ccd0', 35, 10, 3, 5); P('#ffffff', 37, 12); }),
    firebow: () => icon(40, 24, (P, g) => { bowBase(P, g); P(C.ink, 6, 11, 29, 3); P(C.woodD, 7, 12, 27, 1); P('#c8321e', 7, 10, 4, 1); P('#c8321e', 7, 14, 4, 1); P(C.ink, 30, 9, 4, 7); P('#5a5a5a', 31, 10, 2, 5); P('#ff7020', 33, 7, 4, 9); P('#ffb040', 34, 8, 3, 6); P('#fff0a0', 34, 10, 2, 3); P('#ff4010', 36, 5, 2, 4); P('#ffb040', 37, 3, 1, 3); }),
    tknife: () => icon(32, 20, P => { for (let i = 0; i < 3; i++) { const y = 2 + i * 6, x = i * 3; P(C.ink, x, y, 7, 4); P('#2a2a2a', x + 1, y + 1, 5, 2); P(C.ink, x + 6, y - 1, 2, 6); P(C.ink, x + 8, y, 16, 4); P('#d8dde2', x + 8, y + 1, 15, 2); P('#ffffff', x + 9, y + 1, 12, 1); P(C.ink, x + 23, y + 1, 2, 2); } })
  };
  // where the engraving shows on an engraved gun
  const ENGRAVE = { revolver: [[8, 4], [8, 6], [8, 8], [16, 9], [7, 3], [9, 3]], long: [[18, 4], [19, 6], [21, 5], [22, 7]] };
  const cache = {};
  function get(key, engraved) {
    const id = key + (engraved ? '#e' : '');
    if (cache[id] !== undefined) return cache[id];
    if (!DRAW[key]) return (cache[id] = null);
    const base = engraved ? get(key, false) : DRAW[key]();
    if (!engraved) return (cache[id] = base);
    const c = document.createElement('canvas'); c.width = base.width; c.height = base.height;
    const g = c.getContext('2d'); g.drawImage(base, 0, 0); g.fillStyle = C.gold;
    const spots = ['sa', 'da', 'navy', 'schofield', 'cavalry'].includes(key) ? ENGRAVE.revolver : base.width === 56 ? ENGRAVE.long : [[10, 4], [12, 4], [14, 4]];
    for (const [x, y] of spots) g.fillRect(x, y, 1, 1);
    return (cache[id] = c);
  }
  return { C, get, keys: Object.keys(DRAW) };
})();

(function patchWeaponArt() {
  const prevIcon = Sprites.weaponIcon.bind(Sprites), prevShape = Sprites.weaponShape.bind(Sprites);
  const engraved = key => typeof Arsenal !== 'undefined' && typeof G !== 'undefined' && G.player && Arsenal.has(key, 'engrave');

  /* draw the icon centred in a box; the box defaults to the old 36×12 icon size × sc */
  Sprites.weaponIcon = function (ctx, key, x, y, sc, bw, bh) {
    const c = GunArt.get(key, engraved(key));
    if (!c) return prevIcon(ctx, key, x, y, sc);
    bw = bw || 36 * sc; bh = bh || 12 * sc;
    let s = Math.min(bw / c.width, bh / c.height);
    const fl = Math.floor(s); if (fl >= 1 && fl / s >= 0.8) s = fl;
    const w = Math.round(c.width * s), h = Math.round(c.height * s);
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, Math.round(x + (bw - w) / 2), Math.round(y + (bh - h) / 2), w, h);
    ctx.restore();
  };

  /* the gun in a character's hand, drawn along +x from the hand */
  const C = GunArt.C;
  const SHAPES = {
    knife: R => { R(C.woodD, -1, -1, 2, 2); R(C.brass, 1, -1, 1, 2); R('#d8dde2', 2, -1, 4, 1); R('#9aa0a6', 2, 0, 3, 1); },
    machete: R => { R(C.woodD, -1, -1, 2, 2); R(C.ink, 1, -1, 1, 2); R('#c8ccd0', 2, -1, 8, 2); R('#f0f2f4', 2, -1, 7, 1); },
    tomahawk: R => { R(C.wood, -1, 0, 7, 1); R('#c8321e', 1, 0, 1, 1); R('#6a6e76', 5, -3, 2, 5); R('#d8dde2', 6, -3, 1, 5); },
    sa: R => { R(C.ivory, -1, 0, 2, 2); R(C.steel, 0, -1, 2, 2); R(C.steelD, 1, -1, 1, 1); R(C.steelL, 2, -1, 4, 1); R(C.steelM, 2, 0, 2, 1); },
    da: R => { R(C.wood, -1, 0, 2, 2); R(C.nick, 0, -1, 2, 2); R(C.steel, 1, -1, 1, 1); R(C.nickL, 2, -1, 3, 1); R(C.nickM, 2, 0, 1, 1); },
    navy: R => { R(C.wood, -1, 0, 2, 2); R(C.brass, 0, -1, 2, 2); R(C.steelD, 1, -1, 1, 1); R(C.steelL, 2, -1, 5, 1); R(C.steelD, 2, 0, 3, 1); },
    schofield: R => { R(C.woodD, -1, 0, 2, 2); R(C.blue, 0, -1, 2, 2); R(C.blueL, 1, -2, 1, 1); R(C.blueL, 2, -1, 4, 1); R(C.blueM, 2, 0, 2, 1); },
    cavalry: R => { R(C.pearl, -1, 0, 2, 2); R(C.steel, 0, -1, 2, 2); R(C.brassL, 0, -1, 1, 1); R(C.steelL, 2, -1, 6, 1); R(C.steelM, 2, 0, 3, 1); },
    derringer: R => { R(C.pearl, -1, 0, 2, 2); R(C.brass, 0, -1, 1, 2); R(C.nickL, 1, -1, 3, 1); R(C.nick, 1, 0, 3, 1); },
    autopistol: R => { R(C.wood, -1, 0, 2, 3); R(C.blue, 0, -1, 6, 2); R(C.blueL, 0, -1, 6, 1); R(C.steelD, 2, 1, 2, 2); },
    lever: R => { R(C.wood, -4, -1, 4, 2); R(C.steel, 0, -1, 2, 2); R(C.steelL, 2, -1, 8, 1); R(C.steelM, 2, 0, 6, 1); R(C.wood, 2, 0, 3, 1); R(C.steelM, 0, 1, 2, 1); },
    repeater: R => { R(C.walnut, -4, -1, 4, 2); R(C.steel, 0, -1, 2, 2); R(C.steelL, 2, -1, 7, 1); R(C.steelM, 2, 0, 5, 1); R(C.walnutL, 2, 0, 3, 1); R(C.steelM, 0, 1, 2, 1); },
    carbine: R => { R(C.wood, -4, -1, 4, 2); R(C.blue, 0, -1, 2, 2); R(C.blueL, 2, -1, 5, 1); R(C.wood, 2, 0, 3, 1); R(C.brassL, 1, 0, 1, 1); R(C.blueL, 0, 1, 2, 1); },
    brasslever: R => { R(C.walnut, -4, -1, 4, 2); R(C.brass, 0, -1, 2, 2); R(C.brassL, 0, -1, 2, 1); R(C.steelL, 2, -1, 8, 1); R(C.steelM, 2, 0, 6, 1); R(C.brassL, 0, 1, 2, 1); },
    bolt: R => { R(C.walnut, -4, -1, 4, 2); R(C.steel, 0, -1, 2, 2); R(C.steelL, 2, -1, 9, 1); R(C.walnutL, 2, 0, 6, 1); R(C.steelL, -1, 1, 1, 1); },
    rolling: R => { R(C.maple, -4, -1, 4, 2); R(C.steel, 0, -1, 2, 2); R(C.steelL, 1, -2, 1, 1); R(C.steelL, 2, -1, 10, 1); R(C.maple, 2, 0, 3, 1); },
    buffalo: R => { R(C.wood, -4, -1, 4, 2); R(C.nick, 0, -1, 2, 2); R(C.steelL, -1, -2, 1, 1); R(C.blueL, 2, -1, 12, 1); R(C.wood, 2, 0, 3, 1); },
    scoped: R => { R(C.walnut, -4, -1, 4, 2); R(C.steel, 0, -1, 2, 2); R(C.steelL, 2, -1, 10, 1); R(C.walnutL, 2, 0, 5, 1); R('#202026', -1, -3, 7, 2); R('#9ac8ff', 6, -3, 1, 1); },
    shotgun: R => { R(C.wood, -4, -1, 4, 2); R(C.steel, 0, -1, 2, 2); R(C.steelL, 2, -1, 7, 1); R(C.steelD, 2, 0, 7, 1); R(C.steelD, 0, -2, 2, 1); },
    double: R => { R(C.walnut, -4, -1, 4, 2); R(C.nick, 0, -1, 2, 2); R(C.steelL, 2, -1, 10, 1); R(C.steelD, 2, 0, 10, 1); R(C.brassL, 11, -1, 1, 1); },
    sawedoff: R => { R(C.wood, -2, -1, 2, 2); R(C.steel, 0, -1, 2, 2); R(C.steelL, 2, -1, 4, 1); R(C.steelD, 2, 0, 4, 1); R(C.steelD, 0, -2, 2, 1); },
    pump: R => { R(C.wood, -4, -1, 4, 2); R(C.blue, 0, -1, 2, 2); R(C.blueL, 2, -1, 8, 1); R(C.blueM, 2, 0, 7, 1); R(C.woodD, 3, 0, 3, 1); },
    semiauto: R => { R(C.maple, -4, -1, 4, 2); R(C.blue, 0, -2, 3, 3); R(C.blueL, 0, -2, 3, 1); R(C.steelL, 3, -1, 7, 1); R(C.blueM, 3, 0, 6, 1); },
    bow: (R, ctx, ox) => { ctx.strokeStyle = C.woodL; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, 0, 5, -1.2, 1.2); ctx.stroke(); R('#e8e0d0', 0, -4, 1, 9); R(C.woodD, 0, 0, 6, 1); R('#c8ccd0', 6, 0, 1, 1); },
    firebow: (R, ctx, ox) => { ctx.strokeStyle = C.woodL; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(ox, 0, 5, -1.2, 1.2); ctx.stroke(); R('#e8e0d0', 0, -4, 1, 9); R(C.woodD, 0, 0, 5, 1); R('#ff7020', 5, -1, 2, 2); R('#fff0a0', 6, -1, 1, 1); },
    tknife: R => { R('#2a2a2a', -1, -1, 1, 1); R('#d8dde2', 0, -1, 4, 1); R('#9aa0a6', 0, 0, 3, 1); }
  };
  Sprites.weaponShape = function (ctx, key, ox) {
    const f = SHAPES[key];
    if (!f) return prevShape(ctx, key, ox);
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(ox + x, y, w, h); };
    f(R, ctx, ox);
    if (engraved(key) && G.player.cur === key) R(C.gold, 0, -1, 1, 1);
  };
})();
