/* Outlaw County — website script
 * Cinematic hero scene, live world previews drawn with the game's own
 * renderer, the weapon showcase from the game's data, and the download button.
 */
'use strict';

(function () {
  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- nav & reveal ---------------- */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  $('#year').textContent = new Date().getFullYear();
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.15 });
  $$('.feature, .shot, .weapon, .poster, .map-frame, .how, .spec').forEach(el => { el.classList.add('reveal'); io.observe(el); });

  /* ---------------- download button ---------------- */
  const dl = (window.OC_DOWNLOADS || {}).windows;
  const dialog = $('#dl-dialog');
  const buttons = [$('#download-win'), ...$$('[data-download]')];
  const showHelp = e => { e.preventDefault(); if (dialog.showModal) dialog.showModal(); else alert('The Windows installer has not been built yet. See README.md: run "npm install" then "npm run dist".'); };
  if (dl && dl.file) {
    const external = /^https?:\/\//.test(dl.file);
    const href = external ? dl.file : 'downloads/' + dl.file;
    buttons.forEach(b => { b.href = href; if (!external) b.setAttribute('download', dl.file); });
    $('#dl-sub').textContent = `v${dl.version} · ${dl.size} · Windows 64-bit`;
    if (!external && location.protocol.startsWith('http')) {
      fetch(href, { method: 'HEAD' }).then(r => { if (!r.ok) throw 0; }).catch(() => {
        buttons.forEach(b => { b.removeAttribute('download'); b.href = '#'; b.addEventListener('click', showHelp); });
      });
    }
  } else buttons.forEach(b => b.addEventListener('click', showHelp));

  /* ---------------- hero scene ---------------- */
  const hero = $('#hero-canvas'), hx = hero.getContext('2d');
  let HW = 0, HH = 0, mouseX = 0.5;
  const mesaNoise = makeNoise(77);
  const layers = [
    { col: '#5a2438', h: 0.44, amp: 0.13, freq: 0.006, speed: 2, mesa: true },
    { col: '#3a1626', h: 0.36, amp: 0.10, freq: 0.01, speed: 5, mesa: true },
    { col: '#1d0c10', h: 0.24, amp: 0.035, freq: 0.02, speed: 14, mesa: false }
  ];
  const dust = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 0.6 + 0.4 }));
  const birds = Array.from({ length: 3 }, (_, i) => ({ a: i * 2.1, r: 18 + i * 6, cx: 0.22 + i * 0.05, cy: 0.22 + i * 0.03 }));
  const silPal = { hat: '#140806', band: '#140806', shirt: '#140806', vest: '#140806', pants: '#140806', skin: '#140806', boots: '#140806', bandana: '#140806', hatType: 'cowboy' };
  function heroResize() {
    const scale = innerWidth > 1400 ? 4 : 3;
    HW = Math.ceil(innerWidth / scale); HH = Math.ceil(hero.clientHeight / scale);
    hero.width = HW; hero.height = HH;
  }
  addEventListener('resize', heroResize); heroResize();
  addEventListener('mousemove', e => { mouseX = e.clientX / innerWidth; }, { passive: true });

  function ridge(layer, x, t) {
    const n = fbm(mesaNoise, (x + t * layer.speed) * layer.freq, layer.freq * 50, 3);
    let v = n;
    if (layer.mesa) v = n > 0.55 ? 0.55 + (n - 0.55) * 0.25 : n; // flat-topped mesas
    return HH * (1 - layer.h) - v * HH * layer.amp * 3 + HH * layer.amp;
  }

  function drawHero(t) {
    const g = hx, W = HW, H = HH, horizon = H * 0.62;
    // banded sky
    const sky = ['#1e0f2a', '#2e1434', '#4a1a3a', '#6e2238', '#962e30', '#bc4a2c', '#d8702e', '#ecA040', '#f6c868'];
    const bandH = horizon / sky.length;
    for (let i = 0; i < sky.length; i++) {
      g.fillStyle = sky[i]; g.fillRect(0, Math.floor(i * bandH), W, Math.ceil(bandH) + 1);
      if (i < sky.length - 1) { g.fillStyle = sky[i + 1]; for (let x = (i % 2) * 2; x < W; x += 4) g.fillRect(x, Math.floor((i + 1) * bandH) - 1, 2, 1); }
    }
    g.fillStyle = sky[sky.length - 1]; g.fillRect(0, horizon - 2, W, H - horizon + 2);
    // stars in the upper sky
    g.fillStyle = 'rgba(255,240,220,.7)';
    for (let i = 0; i < 40; i++) { const sx = hash2(i, 3) * W, sy = hash2(i, 4) * horizon * 0.35; if (Math.sin(t * 2 + i) > -0.3) g.fillRect(sx | 0, sy | 0, 1, 1); }
    // sun with retro bands
    const sx = W * 0.68 - (mouseX - 0.5) * 6, sy = horizon - H * 0.1, sr = Math.min(W, H) * 0.13;
    g.fillStyle = 'rgba(255,200,120,.18)'; g.beginPath(); g.arc(sx, sy, sr * 1.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd77a'; g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffb048'; g.beginPath(); g.arc(sx, sy, sr, 0.15, Math.PI - 0.15); g.fill();
    for (let i = 0; i < 5; i++) { const by = sy + sr * 0.15 + i * sr * 0.17; g.fillStyle = sky[sky.length - 2 - (i > 2 ? 1 : 0)]; g.fillRect(sx - sr, by, sr * 2, 1 + i * 0.6); }
    // birds circling
    g.fillStyle = '#2a0e14';
    for (const b of birds) { const a = t * 0.4 + b.a, bx = W * b.cx + Math.cos(a) * b.r, by = H * b.cy + Math.sin(a) * b.r * 0.4, f = Math.sin(t * 6 + b.a) > 0 ? 1 : 0; g.fillRect(bx - 3, by - f, 3, 1); g.fillRect(bx + 1, by - f, 3, 1); g.fillRect(bx, by, 1, 1); }
    // mesa layers
    layers.forEach((L, li) => {
      g.fillStyle = L.col;
      const par = (mouseX - 0.5) * (li + 1) * 6;
      for (let x = 0; x < W; x++) { const y = ridge(L, x + par, t); g.fillRect(x, y, 1, H - y); }
      if (li === 1) {
        // distant train on the middle layer
        const ty = horizon + H * 0.075, tx = ((t * 14) % (W + 160)) - 120;
        g.fillStyle = '#2a0f1a';
        g.fillRect(tx, ty - 6, 16, 6); g.fillRect(tx + 12, ty - 10, 3, 4); g.fillRect(tx - 2, ty - 9, 5, 9);
        for (let c = 1; c <= 5; c++) g.fillRect(tx - c * 19, ty - 7, 17, 7);
        g.fillStyle = 'rgba(230,200,190,.35)';
        for (let p = 0; p < 7; p++) { const px = tx + 13 - p * 7 - (t * 3 % 7), py = ty - 13 - p * 2.2 + Math.sin(p + t) * 1.2; g.beginPath(); g.arc(px, py, 2 + p * 0.8, 0, Math.PI * 2); g.fill(); }
      }
    });
    // foreground props: cacti and telegraph poles
    g.fillStyle = '#120608';
    const fgPar = (mouseX - 0.5) * 22;
    for (let i = 0; i < 9; i++) {
      const x = ((hash2(i, 9) * W * 1.3 - t * 14 - fgPar) % (W * 1.3) + W * 1.3) % (W * 1.3) - W * 0.15;
      const base = ridge(layers[2], x + fgPar, t) + 2, hgt = 14 + hash2(i, 10) * 14;
      if (hash2(i, 11) > 0.45) { g.fillRect(x, base - hgt, 3, hgt); g.fillRect(x - 4, base - hgt * 0.65, 4, 2); g.fillRect(x - 4, base - hgt * 0.95, 2, hgt * 0.32); g.fillRect(x + 3, base - hgt * 0.5, 3, 2); g.fillRect(x + 5, base - hgt * 0.8, 2, hgt * 0.32); }
      else { g.fillRect(x, base - hgt - 10, 1, hgt + 10); g.fillRect(x - 4, base - hgt - 8, 9, 1); }
    }
    // the rider, drawn with the game's own sprites as a silhouette
    const rx = W * 0.76 + Math.sin(t * 0.3) * W * 0.05 + fgPar * 0.4, ry = ridge(layers[2], rx + fgPar, t) + 3;
    hx.save();
    Sprites.horse(g, rx, ry, { face: 0, animT: t, speed: 0.9, coat: '#140806', mane: '#140806', saddle: false });
    Sprites.human(g, rx - 1, ry - 9, { face: -0.2, pal: silPal, mounted: true, weapon: 'lever', drawn: false, longgun: true });
    hx.restore();
    // drifting dust
    g.fillStyle = 'rgba(250,210,160,.35)';
    for (const d of dust) { const x = ((d.x * W + t * 18 * d.s) % W), y = H * 0.55 + d.y * H * 0.45 + Math.sin(t + d.x * 20) * 3; g.fillRect(x | 0, y | 0, 1 + d.s, 1); }
  }

  /* ---------------- game world previews ---------------- */
  let worldReady = false;
  const views = {
    dustwater: { cx: 66 * TS, cy: 118 * TS, hour: 12 },
    camp: { cx: 255 * TS, cy: 51 * TS, hour: 22 },
    railroad: { cx: 66 * TS, cy: 144.5 * TS, hour: 17.8 },
    desert: { cx: 204 * TS, cy: 203 * TS, hour: 14 },
    forest: { cx: 66 * TS, cy: 48 * TS, hour: 9 },
    mesa: { cx: 224 * TS, cy: 167 * TS, hour: 15.5 }
  };
  const glow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.5, 'rgba(255,255,255,.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return c;
  })();

  function extrasFor(name, t) {
    const out = [], H = (x, y, pal, o = {}) => out.push({ y, d: g => Sprites.human(g, x, y, Object.assign({ face: 0, pal, animT: t, holster: true }, o)) });
    const Ho = (x, y, coat, o = {}) => out.push({ y, d: g => Sprites.horse(g, x, y, Object.assign({ face: 0, animT: t, coat, mane: Sprites.shade(coat, -70), saddle: true }, o)) });
    const walk = (x0, y, span, speed, pal, ph = 0) => { const p = ((t * speed + ph) % (span * 2)); const x = p < span ? x0 + p : x0 + span * 2 - p; H(x, y, pal, { face: p < span ? 0 : Math.PI, moving: true }); };
    if (name === 'dustwater') {
      walk(52 * TS, 119.6 * TS, 120, 22, CIV_PALS[0]); walk(70 * TS, 120.8 * TS, 90, 16, CIV_PALS[2], 40); walk(58 * TS, 134.5 * TS, 160, 20, CIV_PALS[5], 80);
      H(75 * TS, 121 * TS, PAL.sheriff, { face: Math.PI }); H(77 * TS, 121.2 * TS, PAL.lawman, { face: Math.PI }); H(64 * TS, 118.6 * TS, PAL.player, { face: 0.3, weapon: 'sa' });
      Ho(58.5 * TS, 123.1 * TS, '#8b5a2b', { face: Math.PI / 2, pinto: true }); Ho(64.5 * TS, 123.1 * TS, '#3b2416', { face: Math.PI / 2 });
    } else if (name === 'camp') {
      H(252 * TS, 51.5 * TS, PAL.gang); H(258 * TS, 51.5 * TS, PAL.gang, { face: Math.PI }); H(255 * TS, 54.3 * TS, Object.assign({}, PAL.gang, { shirt: '#8a3a2a', coat: '#3a2a20' }), { face: -1.4 });
      H(256.5 * TS, 47.6 * TS, PAL.player, { face: 1.4 }); Ho(250 * TS, 58.5 * TS, '#6b3e1f');
    } else if (name === 'railroad') {
      const front = 68 * TS + 8 - 19 + 196; // express car door lined up with the station door
      const cars = [['loco', 44], ['tender', 24], ['passenger', 40], ['passenger', 40], ['express', 40], ['caboose', 28]];
      let off = 0; const ty = RAIL_ROW * TS + 13;
      for (const [k, len] of cars) { off += len; const x = front - off; out.push({ y: ty, d: g => Sprites.trainCar(g, k, x, ty, t * 0.5, false, false) }); off += 2; }
      H(66 * TS, 144.6 * TS, CIV_PALS[0], { face: Math.PI / 2 }); H(70 * TS, 144.7 * TS, PAL.player, { face: Math.PI / 2, weapon: 'sa', drawn: true }); H(73 * TS, 144.5 * TS, CIV_PALS[3]);
    } else if (name === 'desert') {
      const sh = [[200, 203, PAL.rival, 0.4], [206, 207, PAL.rival, 2.6], [209, 201, PAL.rival, 3], [196, 208, PAL.player, -0.4]];
      for (const [x, y, p, f] of sh) H(x * TS, y * TS, p, { face: f, weapon: p === PAL.player ? 'repeater' : 'sa', drawn: true, recoil: Math.sin(t * 7 + x) > 0.8 ? 1 : 0 });
      out.push({ y: 1e9, d: g => {
        const tr = (ax, ay, bx, by, ph) => { const k = ((t * 1.6 + ph) % 1); g.strokeStyle = 'rgba(255,236,170,.9)'; g.beginPath(); g.moveTo(lerp(ax, bx, k), lerp(ay, by, k)); g.lineTo(lerp(ax, bx, Math.min(1, k + 0.08)), lerp(ay, by, Math.min(1, k + 0.08))); g.stroke(); };
        tr(196 * TS + 8, 208 * TS - 8, 206 * TS, 207 * TS - 8, 0); tr(209 * TS, 201 * TS - 8, 196 * TS + 8, 208 * TS - 8, 0.5);
      } });
    } else if (name === 'forest') {
      const dx = 60 * TS + Math.sin(t * 0.3) * 20;
      out.push({ y: 53 * TS, d: g => Sprites.animal(g, { kind: 'deer', x: dx, y: 53 * TS, face: Math.cos(t * 0.3) > 0 ? 0 : Math.PI, moving: true, animT: t, buck: true }) });
      out.push({ y: 54 * TS, d: g => Sprites.animal(g, { kind: 'deer', x: 63 * TS, y: 54 * TS, face: Math.PI, moving: false, animT: t }) });
      H(58 * TS, 46 * TS, PAL.player, { face: 0.6, weapon: 'lever', drawn: true });
    } else if (name === 'mesa') {
      walk(214 * TS, 168.6 * TS, 150, 18, CIV_PALS[6]); walk(232 * TS, 167.5 * TS, 90, 14, CIV_PALS[8], 30);
      H(226 * TS, 160 * TS, PAL.lawman, { face: Math.PI / 2 }); Ho(236.5 * TS, 171.2 * TS, '#a0522d', { face: Math.PI / 2 });
    }
    return out;
  }

  function renderView(canvas, name, t) {
    const v = views[name], g = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    const x0 = Math.round(v.cx - w / 2), y0 = Math.round(v.cy - h / 2), x1 = x0 + w, y1 = y0 + h;
    const night = v.hour > 20 || v.hour < 5;
    g.setTransform(1, 0, 0, 1, -x0, -y0); g.imageSmoothingEnabled = false;
    World.drawGround(g, x0, y0, w, h, t);
    const list = World.tallPropsIn(x0, y0, x1, y1, []).map(p => ({ y: p.y, d: gg => Sprites.prop(gg, p, t, night) }));
    for (const b of World.buildings) {
      const bx = b.x * TS, by = b.y * TS;
      if (bx > x1 + 20 || bx + b.w * TS < x0 - 20 || by > y1 + 20 || by + b.h * TS < y0 - 30) continue;
      list.push({ y: (b.y + b.h) * TS, d: gg => Sprites.buildingRoof(gg, b, 1, night, t) });
    }
    list.push(...extrasFor(name, t));
    list.sort((a, b) => a.y - b.y).forEach(e => e.d(g));
    g.setTransform(1, 0, 0, 1, 0, 0);
    // time-of-day grading
    if (v.hour > 16.5 && v.hour < 20.5) { g.globalCompositeOperation = 'soft-light'; g.fillStyle = 'rgba(255,120,40,.45)'; g.fillRect(0, 0, w, h); g.globalCompositeOperation = 'source-over'; }
    if (night) {
      const lc = canvas._light || (canvas._light = document.createElement('canvas'));
      lc.width = w; lc.height = h; const l = lc.getContext('2d');
      l.fillStyle = 'rgba(10,12,34,.72)'; l.fillRect(0, 0, w, h);
      l.globalCompositeOperation = 'destination-out';
      for (const L of World.lights) {
        if (L.x < x0 - L.r || L.x > x1 + L.r || L.y < y0 - L.r || L.y > y1 + L.r) continue;
        const r = L.r * (L.c === 'fire' ? 1 + Math.sin(t * 13 + L.x) * 0.05 : 1);
        l.drawImage(glow, L.x - x0 - r, L.y - y0 - r, r * 2, r * 2);
      }
      g.drawImage(lc, 0, 0);
      g.globalCompositeOperation = 'lighter'; g.globalAlpha = 0.35;
      for (const L of World.lights) if (L.c === 'fire' && L.x > x0 - 100 && L.x < x1 + 100 && L.y > y0 - 100 && L.y < y1 + 100) { g.drawImage(glow, L.x - x0 - 60, L.y - y0 - 60, 120, 120); }
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      g.fillStyle = 'rgba(255,150,60,.06)'; g.fillRect(0, 0, w, h);
    }
  }

  const shots = $$('.shot');
  const visible = new Set();
  const shotIO = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)), { rootMargin: '100px' });

  function initWorld() {
    World.generate(1889);
    worldReady = true;
    for (const s of shots) {
      const c = s.querySelector('canvas');
      c.width = s.classList.contains('big') ? 400 : 240; c.height = Math.round(c.width * 9 / 16);
      renderView(c, s.dataset.view, 1);
      shotIO.observe(s);
    }
    // county map
    const mc = $('#county-map'), sc = 1; mc.width = World.W * sc; mc.height = World.H * sc;
    const g = mc.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(World.minimap, 0, 0, mc.width, mc.height);
    g.fillStyle = 'rgba(234,217,178,.12)'; g.fillRect(0, 0, mc.width, mc.height);
    g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center';
    const lab = (t, x, y, c = '#2a1608') => { const w = g.measureText(t).width; g.fillStyle = 'rgba(240,225,190,.88)'; g.fillRect(x - w / 2 - 7, y - 28, w + 14, 37); g.fillStyle = c; g.fillText(t, x, y); };
    for (const t of World.towns) if (t.name !== 'Cottonwood Crossing') lab(t.name, (t.x0 + t.x1) / 2 * sc, (t.y0 - 3) * sc);
    lab('Hollow Creek', 196 * sc, 590 * sc, '#3a2a2a');
    lab('Frostpeak Mountains', 800 * sc, 36 * sc, '#2a3a44'); lab('Harlow Lake', 1110 * sc, 30 * sc, '#1a3a5a'); lab('Ranch Country', 330 * sc, 450 * sc, '#2a3a10');
    lab('Red Canyonlands', 1010 * sc, 270 * sc, '#6a2a10'); lab('Bonewhite Salt Flats', 330 * sc, 540 * sc, '#4a4a4a'); lab('Mesa Badlands', 980 * sc, 520 * sc, '#6a4a1a');
    lab('Rio Bravo', 1000 * sc, 770 * sc, '#1a3a5a'); lab('Outlaw County', 160 * sc, 226 * sc, '#2a1608');
    for (const c of World.banditCamps) { g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(c.x / TS * sc, c.y / TS * sc, 9, 0, Math.PI * 2); g.fill(); }
    // wanted poster portrait
    const pc = $('#poster-canvas'), pg = pc.getContext('2d');
    pg.imageSmoothingEnabled = false; pg.fillStyle = '#d8bf8a'; pg.fillRect(0, 0, 96, 72);
    pg.setTransform(3, 0, 0, 3, 0, 0);
    Sprites.human(pg, 16, 22, { face: 0.15, pal: PAL.player, weapon: 'sa', drawn: true, masked: true, holster: true });
    pg.setTransform(1, 0, 0, 1, 0, 0);
  }

  /* ---------------- arsenal ---------------- */
  function buildArsenal() {
    const grid = $('#weapon-grid');
    const reloadFull = w => w.melee ? 0 : (w.reload === 'single' ? w.reloadTime * w.cap : w.reloadTime);
    for (const k of WEAPON_ORDER) {
      const w = WEAPONS[k];
      const dmg = w.dmg * (w.pellets || 1);
      const stats = [
        ['Damage', Math.min(1, dmg / 110), w.pellets ? `${w.dmg}×${w.pellets}` : dmg],
        ['Fire rate', Math.min(1, (1 / w.rate) / 5.5), (1 / w.rate).toFixed(1) + '/s'],
        ['Range', w.melee ? 0.05 : w.range / 560, w.melee ? 'melee' : Math.round(w.range / TS * 2) + 'yd'],
        ['Accuracy', w.accuracy, Math.round(w.accuracy * 100) + '%'],
        ['Reload', w.melee ? 1 : 1 - Math.min(1, reloadFull(w) / 5.5), w.melee ? '—' : reloadFull(w).toFixed(1) + 's'],
        ['Capacity', w.melee ? 1 : w.cap / 10, w.melee ? '∞' : w.cap]
      ];
      const card = document.createElement('article'); card.className = 'weapon';
      card.innerHTML = `<canvas width="180" height="60"></canvas><h3>${w.name}</h3><p>${w.desc}</p>` +
        stats.map(([n, v, t]) => `<div class="stat"><span>${n}</span><span class="track"><span class="fill" data-v="${v}"></span></span><span class="val">${t}</span></div>`).join('') +
        `<span class="price-tag">${w.price ? '$' + w.price + ' at the gunsmith' : (k === 'knife' ? 'Starting gear' : 'Your starting sidearm')}</span>`;
      Sprites.weaponIcon(card.querySelector('canvas').getContext('2d'), k, 0, 0, 5);
      grid.append(card);
      new IntersectionObserver((es, ob) => es.forEach(e => { if (e.isIntersecting) { card.querySelectorAll('.fill').forEach(f => f.style.width = (+f.dataset.v * 100) + '%'); ob.disconnect(); } }), { threshold: 0.3 }).observe(card);
      io.observe(card); card.classList.add('reveal');
    }
  }
  buildArsenal();

  /* ---------------- animation loop ---------------- */
  let last = 0, previewT = 0;
  function frame(ts) {
    const t = ts / 1000;
    if (hero.getBoundingClientRect().bottom > 0) drawHero(reduced ? 0 : t);
    if (worldReady && !reduced && ts - previewT > 90) {
      previewT = ts;
      for (const s of visible) renderView(s.querySelector('canvas'), s.dataset.view, t);
    }
    last = ts;
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  (window.requestIdleCallback || (f => setTimeout(f, 200)))(initWorld);
})();
