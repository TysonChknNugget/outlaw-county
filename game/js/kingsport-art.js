/* Outlaw County — kingsport-art.js (v2.9)
 * How Kingsport looks: brick and stone buildings with flat roofs, cornices,
 * upper storeys, awnings and shop windows, plus the city's street furniture
 * (call boxes, hydrants, newsstands, the statue, fountains, smokestacks,
 * boxcars and the tall ships in the bay).
 */
'use strict';

(function () {
  const baseRoof = Sprites.buildingRoof.bind(Sprites), baseProp = Sprites.prop.bind(Sprites);
  const R = (ctx, c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
  const sh = (c, a) => Sprites.shade(c, a);

  Sprites.buildingRoof = function (ctx, b, alpha, night, time) {
    if (!b.city) return baseRoof(ctx, b, alpha, night, time);
    const X = b.x * TS, Y = b.y * TS, Wd = b.w * TS, Hd = b.h * TS, fy = Y + Hd - 16, roofTop = Y - 10;
    const wallC = b.wallTint || '#7a3424', rc = b.roof || '#4a4e58';
    // churches, the opera, city hall, mansions and the station keep pitched roofs
    if (b.type === 'church' || b.mansion || b.type === 'station') {
      baseRoof(ctx, Object.assign({}, b, { city: false }), alpha, night, time);
      if (alpha > 0.01) {
        ctx.globalAlpha = alpha;
        if (b.dome) { const cx = X + Wd / 2; ctx.fillStyle = '#7a9a8a'; ctx.beginPath(); ctx.arc(cx, roofTop + 4, 22, Math.PI, 0); ctx.fill(); R(ctx, '#9abaa8', cx - 14, roofTop - 12, 8, 3); R(ctx, '#c8a040', cx - 1, roofTop - 28, 2, 10); R(ctx, '#e0d8c8', cx - 24, roofTop + 4, 48, 4); }
        if (b.opera) { R(ctx, '#c8a040', X - 3, fy - 4, Wd + 6, 2); for (let i = X + 8; i < X + Wd - 8; i += 24) R(ctx, '#f0d070', i, roofTop + 4, 4, 4); }
        ctx.globalAlpha = 1;
      }
      if (alpha > 0.5 && (b.opera || b.dome || b.mansion)) for (let i = X + 4; i < X + Wd - 4; i += b.mansion ? 20 : 14) { R(ctx, '#f0ece0', i, fy + 1, 4, 15); R(ctx, '#c8c0b0', i + 3, fy + 1, 1, 15); }
      return;
    }
    const tall = b.factory || b.warehouse ? 12 : b.tenement || b.office || b.type === 'hotel' || b.type === 'bank' || b.type === 'sheriff' ? 14 : 10;
    if (alpha > 0.01) {
      ctx.globalAlpha = alpha;
      const top = fy - tall;
      // flat tar roof behind a parapet
      R(ctx, rc, X - 2, roofTop, Wd + 4, top - roofTop);
      R(ctx, sh(rc, 20), X - 2, roofTop, Wd + 4, 2); R(ctx, sh(rc, 10), X - 2, roofTop, 2, top - roofTop); R(ctx, sh(rc, -12), X + Wd, roofTop, 2, top - roofTop);
      for (let yy = roofTop + 6; yy < top - 2; yy += 6) R(ctx, sh(rc, -8), X + 2, yy, Wd - 4, 1);
      const h = hash2(b.x, b.y);
      if (b.factory) { for (let i = X + 6; i < X + Wd - 10; i += 14) { R(ctx, '#6a7a8a', i, roofTop + 5, 9, 6); R(ctx, '#9ab0c0', i, roofTop + 5, 9, 2); } }
      else if (b.warehouse) R(ctx, sh(rc, -20), X + Wd / 2 - 1, roofTop, 2, top - roofTop);
      else {
        R(ctx, '#5a3a30', X + 6, roofTop - 6, 6, 9); R(ctx, '#3a2a22', X + 6, roofTop - 6, 6, 2);
        if (Wd > 120) { R(ctx, '#5a3a30', X + Wd - 14, roofTop - 6, 6, 9); R(ctx, '#3a2a22', X + Wd - 14, roofTop - 6, 6, 2); }
        if (h > 0.6 && Wd > 140) { const tx = X + Wd * 0.55; R(ctx, '#6a4a2a', tx, roofTop - 14, 14, 12); R(ctx, '#4a3018', tx, roofTop - 14, 14, 2); R(ctx, '#4a3018', tx + 2, roofTop - 2, 2, 6); R(ctx, '#4a3018', tx + 10, roofTop - 2, 2, 6); }
      }
      // the upper storey and its cornice
      R(ctx, wallC, X, top, Wd, tall);
      for (let yy = top + 3; yy < fy; yy += 3) R(ctx, sh(wallC, -14), X, yy, Wd, 1);
      R(ctx, sh(wallC, 28), X - 2, top - 2, Wd + 4, 3); R(ctx, sh(wallC, -30), X - 2, top + 1, Wd + 4, 1);
      for (const w of b.windows) {
        R(ctx, '#e8dcc8', w.x - 4, top + 3, 8, 1); R(ctx, '#2a1a10', w.x - 3, top + 4, 6, tall - 6);
        R(ctx, night ? (hash2(w.x, b.y) > 0.4 ? '#ffcf6a' : '#3a3a48') : '#4a6a7a', w.x - 2, top + 5, 4, tall - 8);
        if (!night) R(ctx, '#9ab8c8', w.x - 2, top + 5, 1, 2);
      }
      ctx.globalAlpha = 1;
    }
    // the ground floor, always drawn (cut down while the player is inside)
    const inside = alpha < 0.5, fh = inside ? 4 : 16, fTop = Y + Hd - fh;
    R(ctx, wallC, X, fTop, Wd, fh);
    for (let yy = fTop + 2; yy < fTop + fh; yy += 3) R(ctx, sh(wallC, -14), X, yy, Wd, 1);
    if (inside) return;
    R(ctx, sh(wallC, 24), X, fTop, Wd, 1);
    const dx = b.door.x * TS, shop = b.awning || b.shop || b.type === 'saloon' || b.type === 'general' || b.type === 'gunsmith';
    for (const w of b.windows) {
      if (shop) { R(ctx, '#2a1a10', w.x - 6, fTop + 3, 12, 10); R(ctx, night ? '#ffd88a' : '#5a7a8a', w.x - 5, fTop + 4, 10, 8); if (!night) R(ctx, '#a8c8d8', w.x - 5, fTop + 4, 3, 3); }
      else { R(ctx, '#e8dcc8', w.x - 4, fTop + 2, 8, 1); R(ctx, '#2a1a10', w.x - 3, fTop + 3, 6, 8); R(ctx, night ? '#ffcf6a' : '#5a7a8a', w.x - 2, fTop + 4, 4, 6); }
    }
    R(ctx, '#e8dcc8', dx, fTop + 1, 16, 1); R(ctx, '#1a100a', dx + 2, fTop + 2, 12, 14); R(ctx, b.type === 'bank' ? '#3a3020' : '#4a2c16', dx + 3, fTop + 3, 10, 13); R(ctx, '#c8a040', dx + 10, fTop + 9, 1, 2);
    if (b.awning) for (let i = 0; i < Wd; i += 6) R(ctx, i % 12 ? '#e8dcc0' : b.awning, X + i, fTop - 4, 6, 4);
    if (b.sign) {
      const tw = Sprites.textWidth(b.sign) + 6, sx = Math.round(X + Wd / 2 - tw / 2), sy = fTop - (b.awning ? 15 : 12);
      const dark = b.type === 'bank' || b.type === 'sheriff' || b.type === 'hotel' || b.office;
      R(ctx, '#1a120a', sx - 1, sy - 1, tw + 2, 10); R(ctx, dark ? '#1e2430' : '#e8d8a8', sx, sy, tw, 8);
      Sprites.pixelText(ctx, b.sign, sx + 3, sy + 2, dark ? '#e8c860' : '#5a1a10');
    }
  };

  Sprites.prop = function (ctx, p, time, night) {
    const x = Math.round(p.x), y = Math.round(p.y);
    switch (p.t) {
      case 'callbox':
        Sprites.shadow(ctx, x, y - 1, 4, 2); R(ctx, '#1a2240', x - 1, y - 14, 3, 14); R(ctx, '#2a3a6a', x - 4, y - 24, 9, 11); R(ctx, '#4a5a8a', x - 4, y - 24, 9, 2); R(ctx, '#c8a040', x - 1, y - 20, 3, 2); R(ctx, '#e8e0c0', x - 3, y - 16, 7, 1);
        if (Law.heat > 0 && Kingsport.playerIn() && Math.floor(time * 4) % 2) R(ctx, '#ff4030', x - 1, y - 27, 3, 3);
        break;
      case 'hydrant': Sprites.shadow(ctx, x, y - 1, 4, 2); R(ctx, '#8a2018', x - 3, y - 9, 6, 9); R(ctx, '#b03020', x - 3, y - 9, 2, 9); R(ctx, '#8a2018', x - 5, y - 6, 10, 2); R(ctx, '#6a1810', x - 2, y - 11, 4, 2); break;
      case 'bollard': R(ctx, '#2a2a2a', x - 2, y - 7, 4, 7); R(ctx, '#4a4a4a', x - 2, y - 7, 4, 1); break;
      case 'hedge': R(ctx, '#2a4a22', x - 8, y - 11, 16, 11); R(ctx, '#3a5a2a', x - 8, y - 11, 16, 3); R(ctx, '#4a6a32', x - 5 + (p.tx % 3), y - 10, 3, 2); break;
      case 'newsstand':
        Sprites.shadow(ctx, x, y - 1, 14, 3); R(ctx, '#2a4a2a', x - 14, y - 22, 28, 22); R(ctx, '#3a6a3a', x - 15, y - 25, 30, 4); R(ctx, '#e8e0c8', x - 11, y - 18, 22, 8);
        for (let i = 0; i < 4; i++) R(ctx, '#2a2a2a', x - 10 + i * 6, y - 16, 4, 1);
        Sprites.pixelText(ctx, 'HERALD', x - 12, y - 8, '#e8d8a8');
        break;
      case 'statue':
        Sprites.shadow(ctx, x, y - 1, 14, 4); R(ctx, '#8a8a8a', x - 12, y - 12, 24, 12); R(ctx, '#a8a8a8', x - 12, y - 12, 24, 2); R(ctx, '#6a6a6a', x - 9, y - 18, 18, 6);
        R(ctx, '#4a7a6a', x - 8, y - 30, 16, 8); R(ctx, '#4a7a6a', x - 2, y - 40, 5, 12); R(ctx, '#4a7a6a', x + 6, y - 36, 4, 7); R(ctx, '#5a8a7a', x - 2, y - 44, 4, 4); R(ctx, '#4a7a6a', x + 3, y - 38, 7, 2);
        break;
      case 'fountain': {
        Sprites.shadow(ctx, x, y, 22, 5);
        ctx.fillStyle = '#9a9a9a'; ctx.beginPath(); ctx.ellipse(x, y - 6, 22, 8, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#4a7aa0'; ctx.beginPath(); ctx.ellipse(x, y - 7, 18, 6, 0, 0, TAU); ctx.fill(); R(ctx, '#8a8a8a', x - 2, y - 20, 4, 14);
        const j = Math.sin(time * 6) * 2; R(ctx, '#a8d0f0', x - 1, y - 26 + j, 2, 7); R(ctx, '#c8e8ff', x - 4, y - 22 + j, 2, 3); R(ctx, '#c8e8ff', x + 2, y - 22 - j, 2, 3);
        break;
      }
      case 'smokestack': {
        R(ctx, '#5a3024', x - 6, y - 70, 12, 70); R(ctx, '#7a4434', x - 6, y - 70, 3, 70); for (let yy = y - 64; yy < y; yy += 16) R(ctx, '#3a2018', x - 6, yy, 12, 2);
        R(ctx, '#2a1a14', x - 7, y - 73, 14, 4);
        for (let i = 0; i < 5; i++) { const k = (time * 0.35 + i / 5) % 1; ctx.fillStyle = `rgba(80,76,72,${0.5 * (1 - k)})`; ctx.beginPath(); ctx.arc(x + k * 22 + Math.sin(k * 6 + i) * 3, y - 78 - k * 50, 5 + k * 10, 0, TAU); ctx.fill(); }
        break;
      }
      case 'boxcar':
        Sprites.shadow(ctx, x, y, 40, 4); R(ctx, '#7a3424', x - 40, y - 26, 80, 22); R(ctx, '#8a4030', x - 40, y - 26, 80, 3); R(ctx, '#5a2418', x - 10, y - 22, 20, 18); R(ctx, '#3a1a10', x - 1, y - 22, 2, 18);
        Sprites.pixelText(ctx, 'U.R.R.', x - 34, y - 18, '#e8d8a8'); R(ctx, '#1a1a1a', x - 34, y - 4, 10, 4); R(ctx, '#1a1a1a', x + 24, y - 4, 10, 4);
        break;
      case 'ship': {
        // a three-masted barque riding at anchor
        const s = Math.sin(time * 0.8 + p.tx);
        R(ctx, '#3a2414', x - 90, y - 26 + s, 180, 16); R(ctx, '#5a3a20', x - 90, y - 28 + s, 180, 4); R(ctx, '#1a120a', x - 86, y - 12 + s, 172, 4);
        R(ctx, '#e8dcc0', x - 90, y - 20 + s, 180, 2); R(ctx, '#3a2414', x + 90, y - 30 + s, 14, 6);
        for (const mx of [-50, 0, 46]) { R(ctx, '#4a3018', x + mx, y - 110 + s, 3, 84); for (const yy of [-100, -78, -56]) { R(ctx, '#4a3018', x + mx - 18, y + yy + s, 39, 2); R(ctx, '#e8e0cc', x + mx - 16, y + yy + 2 + s, 35, 4); } }
        ctx.strokeStyle = 'rgba(30,20,10,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x - 50, y - 110 + s); ctx.lineTo(x - 90, y - 28 + s); ctx.moveTo(x + 46, y - 110 + s); ctx.lineTo(x + 100, y - 30 + s); ctx.stroke();
        break;
      }
      default: return baseProp(ctx, p, time, night);
    }
  };
})();
