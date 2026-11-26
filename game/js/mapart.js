/* Outlaw County — mapart.js (v2.10)
 * The big map (M) as a hand-drawn surveyor's map on parchment: inked
 * coastlines and wave marks, little mountain peaks, tree symbols for forests,
 * grass tufts, the railroad with its ties, every building, and a compass
 * rose. The fog of war is gone: the whole territory is drawn from the start.
 */
'use strict';

const MapArt = {
  S: 2, cv: null,
  canvas() { if (!this.cv || this.cv.w !== World.W || this.cv.seed !== World.buildings.length) this.build(); return this.cv; },

  build() {
    const W = World.W, H = World.H, S = this.S, tiles = World.tiles;
    const PAL = {
      [T.GRASS]: [214, 210, 160], [T.PRAIRIE]: [222, 214, 162], [T.FOREST]: [200, 204, 154], [T.SNOWFOREST]: [218, 220, 204], [T.SNOW]: [242, 238, 226], [T.ICE]: [212, 226, 226],
      [T.SAND]: [238, 220, 174], [T.SCRUB]: [228, 214, 168], [T.DRYBED]: [232, 216, 178], [T.CLAY]: [232, 198, 158], [T.CANYON]: [226, 190, 150], [T.ROCK]: [216, 196, 160], [T.SALT]: [244, 240, 228],
      [T.WATER]: [158, 190, 190], [T.SHALLOW]: [182, 206, 198], [T.ROAD]: [146, 100, 60], [T.BRIDGE]: [112, 78, 48], [T.BOARD]: [150, 112, 72], [T.GRAVEL]: [96, 84, 74],
      [T.TOWN]: [216, 194, 154], [T.COBBLE]: [196, 182, 160], [T.PAVE]: [208, 196, 174], [T.FLOOR]: [214, 194, 154], [T.WALL]: [214, 194, 154]
    };
    // 1. washed colours, one pixel per tile
    const b = document.createElement('canvas'); b.width = W; b.height = H;
    const bg = b.getContext('2d'), img = bg.createImageData(W, H), d = img.data;
    const water = t => t === T.WATER || t === T.SHALLOW;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, t = tiles[i];
      let [r, g, bl] = PAL[t] || [220, 205, 170];
      const n = (hash2(x >> 3, y >> 3) - 0.5) * 10 + (hash2(x, y) - 0.5) * 5 + (hash2(x >> 5, y >> 5) - 0.5) * 8;
      r += n; g += n; bl += n * 0.8;
      if (t === T.WATER) {   // deeper away from the shore, an inked coastline at the edge
        const shore = !water(World.tile(x - 1, y)) || !water(World.tile(x + 1, y)) || !water(World.tile(x, y - 1)) || !water(World.tile(x, y + 1));
        if (shore) { r = 70; g = 96; bl = 104; }
        else if (water(World.tile(x - 3, y)) && water(World.tile(x + 3, y)) && water(World.tile(x, y - 3)) && water(World.tile(x, y + 3))) { r -= 14; g -= 8; bl -= 2; }
      } else if (!water(t) && (water(World.tile(x - 1, y)) || water(World.tile(x + 1, y)) || water(World.tile(x, y - 1)) || water(World.tile(x, y + 1)))) { r -= 18; g -= 18; bl -= 20; }
      const o = i * 4; d[o] = r; d[o + 1] = g; d[o + 2] = bl; d[o + 3] = 255;
    }
    bg.putImageData(img, 0, 0);
    const c = document.createElement('canvas'); c.width = W * S; c.height = H * S;
    const g = c.getContext('2d'); g.imageSmoothingEnabled = true; g.drawImage(b, 0, 0, W * S, H * S);
    const tile = (x, y) => World.tile(x, y), jit = (x, y, k) => (hash2(x * 7 + k, y * 13 - k) - 0.5);
    // 2. wave marks on open water
    g.strokeStyle = 'rgba(60,92,104,.45)'; g.lineWidth = 1;
    for (let y = 4; y < H; y += 7) for (let x = (y * 3) % 11; x < W; x += 11) {
      if (tile(x, y) !== T.WATER || tile(x - 3, y) !== T.WATER || tile(x + 3, y) !== T.WATER || tile(x, y - 2) !== T.WATER || tile(x, y + 2) !== T.WATER) continue;
      const px = x * S, py = y * S; g.beginPath(); g.moveTo(px - 5, py); g.quadraticCurveTo(px - 2.5, py - 3, px, py); g.quadraticCurveTo(px + 2.5, py + 3, px + 5, py); g.stroke();
    }
    // 3. grass tufts and desert dots
    for (let y = 3; y < H; y += 6) for (let x = (y % 12) / 2; x < W; x += 7) {
      const t = tile(x, y), px = x * S + jit(x, y, 1) * 6, py = y * S + jit(x, y, 2) * 6;
      if (t === T.PRAIRIE || t === T.GRASS) { g.strokeStyle = 'rgba(110,124,64,.55)'; g.beginPath(); g.moveTo(px - 2, py - 2); g.lineTo(px, py + 1); g.lineTo(px + 2, py - 2); g.stroke(); }
      else if ((t === T.SAND || t === T.SCRUB) && hash2(x, y) > 0.55) { g.fillStyle = 'rgba(150,120,70,.45)'; g.fillRect(px, py, 1.5, 1.5); }
      else if (t === T.CANYON || t === T.CLAY) { if (hash2(x, y) > 0.6) { g.strokeStyle = 'rgba(150,80,50,.4)'; g.beginPath(); g.moveTo(px - 3, py); g.lineTo(px + 3, py); g.stroke(); } }
    }
    // 4. forests: round trees in the lowlands, pines in the high country and the east
    for (let y = 2; y < H; y += 3) for (let x = (y % 6) / 2; x < W; x += 3) {
      const t = tile(x, y); if (t !== T.FOREST && t !== T.SNOWFOREST) continue;
      if (hash2(x, y) < 0.25) continue;
      const px = x * S + jit(x, y, 3) * 4, py = y * S + jit(x, y, 4) * 4;
      const pine = t === T.SNOWFOREST || y < 240 && x > 320 || x > 1280 && y > 440 || (y > 852 && World.mexKind && World.mexKind(x, y) === 'sierra');
      if (pine) { g.fillStyle = t === T.SNOWFOREST ? '#6a8070' : '#4a6a48'; g.beginPath(); g.moveTo(px, py - 5); g.lineTo(px - 3, py + 2); g.lineTo(px + 3, py + 2); g.fill(); g.fillStyle = '#5a3a24'; g.fillRect(px - 0.5, py + 2, 1, 1.5); }
      else { g.fillStyle = '#5a3a24'; g.fillRect(px - 0.5, py, 1, 2.5); g.fillStyle = '#6e8c50'; g.beginPath(); g.arc(px, py - 1, 2.6, 0, TAU); g.fill(); g.strokeStyle = 'rgba(50,70,36,.7)'; g.stroke(); }
    }
    // 5. mountains: little shaded peaks wherever the rock is thick
    for (let y = 3; y < H; y += 5) for (let x = 3 + (y % 10 ? 2 : 0); x < W; x += 5) {
      if (tile(x, y) !== T.ROCK) continue;
      let n = 0; for (let yy = -2; yy <= 2; yy++) for (let xx = -2; xx <= 2; xx++) if (tile(x + xx, y + yy) === T.ROCK) n++;
      if (n < 13 || x < 3 || y < 3 || x > W - 4 || y > H - 4) continue;
      const px = x * S + jit(x, y, 5) * 4, py = y * S + jit(x, y, 6) * 4, h = 7 + hash2(x, y) * 5, w = 6 + hash2(y, x) * 3;
      const snowy = y < 240 && x > 320 && x < 960;
      g.fillStyle = snowy ? '#f4f0e6' : '#ead6b0'; g.beginPath(); g.moveTo(px - w, py + 3); g.lineTo(px, py - h); g.lineTo(px + w, py + 3); g.fill();
      g.fillStyle = snowy ? '#b8c0c4' : '#a8865e'; g.beginPath(); g.moveTo(px, py - h); g.lineTo(px + w, py + 3); g.lineTo(px + 1, py + 3); g.fill();
      g.strokeStyle = '#6a5038'; g.lineWidth = 1; g.beginPath(); g.moveTo(px - w, py + 3); g.lineTo(px, py - h); g.lineTo(px + w, py + 3); g.stroke();
    }
    // 6. the railroad with its ties
    g.fillStyle = '#2a2420';
    for (let x = 0; x < W; x++) if (tile(x, RAIL_ROW) === T.GRAVEL || tile(x, RAIL_ROW) === T.BRIDGE) { g.fillRect(x * S, RAIL_ROW * S + 0.5, S, 1.4); if (x % 3 === 0) g.fillRect(x * S, RAIL_ROW * S - 1.5, 1, 5); }
    // 7. buildings, inked
    for (const bd of World.buildings) {
      const x = bd.x * S, y = bd.y * S, w = bd.w * S, h = bd.h * S;
      g.fillStyle = bd.city ? '#8a7a6a' : bd.adobe ? '#b88a5a' : '#9a6440'; g.fillRect(x, y, w, h);
      g.strokeStyle = '#3a2418'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    }
    // 8. foxing: a few age spots on the paper
    for (let i = 0; i < 260; i++) { const x = hash2(i, 3) * W * S, y = hash2(7, i) * H * S, r = 4 + hash2(i, i) * 22; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(150,110,60,.10)'); gr.addColorStop(1, 'rgba(150,110,60,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
    c.w = W; c.seed = World.buildings.length; this.cv = c;
  },

  /* compass rose, scale bar and a ruled border, drawn on top of the map view */
  decorate(cv, z) {
    const g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.save();
    // vignette, like old paper
    const v = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
    v.addColorStop(0, 'rgba(90,60,30,0)'); v.addColorStop(1, 'rgba(90,60,30,.35)'); g.fillStyle = v; g.fillRect(0, 0, W, H);
    g.strokeStyle = '#4a2e18'; g.lineWidth = 2; g.strokeRect(6, 6, W - 12, H - 12); g.lineWidth = 1; g.strokeRect(11, 11, W - 22, H - 22);
    // compass rose
    const cx = W - 70, cy = H - 78, R = 42;
    g.fillStyle = 'rgba(240,226,190,.85)'; g.beginPath(); g.arc(cx, cy, R + 8, 0, TAU); g.fill();
    g.strokeStyle = '#4a2e18'; g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, R + 4, 0, TAU); g.stroke(); g.beginPath(); g.arc(cx, cy, R - 6, 0, TAU); g.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 - Math.PI / 2, len = i % 2 ? R * 0.6 : R, s = i % 2 ? 5 : 8;
      const tx = cx + Math.cos(a) * len, ty = cy + Math.sin(a) * len;
      for (const side of [-1, 1]) {
        g.fillStyle = side > 0 ? '#4a2e18' : '#c8a060'; g.beginPath(); g.moveTo(cx, cy); g.lineTo(tx, ty);
        g.lineTo(cx + Math.cos(a + side * Math.PI / 2) * s, cy + Math.sin(a + side * Math.PI / 2) * s); g.closePath(); g.fill();
      }
    }
    g.fillStyle = '#4a2e18'; g.font = 'bold 15px Georgia, serif'; g.textAlign = 'center'; g.fillText('N', cx, cy - R - 12);
    // scale bar: 100 tiles
    const len = 100 * z, sx = 26, sy = H - 30;
    if (len > 30 && len < W / 2) {
      g.fillStyle = 'rgba(240,226,190,.85)'; g.fillRect(sx - 6, sy - 20, len + 12, 30);
      for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f0e4c8' : '#4a2e18'; g.fillRect(sx + i * len / 4, sy - 4, len / 4, 5); }
      g.strokeStyle = '#4a2e18'; g.strokeRect(sx, sy - 4, len, 5);
      g.fillStyle = '#4a2e18'; g.font = 'italic 11px Georgia, serif'; g.textAlign = 'left'; g.fillText('100 yards', sx, sy - 8);
    }
    g.restore();
  }
};

/* no fog of war: everything is known; exploring still counts for the Cartographer achievement */
Discovery.seenAt = () => true;
(function () {
  const base = UI.renderMap.bind(UI);
  UI.renderMap = function () { base(); MapArt.decorate($('map-canvas'), this.mapV.z); };
})();
