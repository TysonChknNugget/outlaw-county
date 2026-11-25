/* Outlaw County — ui.js
 * HUD, notifications, dialogue, shops, inventory, map, menus, settings,
 * save slots and the high-resolution overlay (markers, barks, crosshair).
 */
'use strict';

const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const UI = {
  modal: null, dlg: null, hudT: 0, shopId: null, shopClerk: null, regionT: 0, mapCanvas: null, slotMode: 'load', settingsFrom: 'menu',

  init() {
    this.mm = $('minimap').getContext('2d');
    this.wi = $('weapon-icon').getContext('2d');
    document.querySelectorAll('[data-act]').forEach(b => b.addEventListener('click', e => { Sound.init(); Sound.play('ui'); this.action(b.dataset.act, b); }));
    $('dialogue').addEventListener('click', () => this.advanceDialogue());
    // settings controls
    for (const id of ['set-master', 'set-sfx', 'set-music']) $(id).addEventListener('input', () => this.readSettings());
    for (const id of ['set-diff', 'set-zoom', 'set-shake', 'set-fps', 'set-minimap']) $(id).addEventListener('change', () => this.readSettings());
    if (window.ocDesktop) document.body.classList.add('desktop');
    Updates.init();
    document.addEventListener('fullscreenchange', () => Game.resize());
  },

  action(act, el) {
    switch (act) {
      case 'new': if (SaveSys.latest() && !confirm('Start a new game? Your saves stay in their slots.')) return; this.closeAll(); Game.newGame(); break;
      case 'continue': { const s = SaveSys.latest(); if (s) { this.closeAll(); Game.load(s.slot); } break; }
      case 'load': this.openSlots('load'); break;
      case 'save': this.openSlots('save'); break;
      case 'settings': this.settingsFrom = this.modal === 'pause' ? 'pause' : 'menu'; this.show('settings'); this.modal = 'settings'; break;
      case 'controls': this.controlsFrom = this.modal === 'pause' ? 'pause' : 'menu'; this.show('controls'); this.modal = 'controls'; break;
      case 'resume': this.closeAll(); break;
      case 'fullscreen': Game.toggleFullscreen(); break;
      case 'title': if (confirm('Quit to the title screen? Unsaved progress since your last save will be lost.')) Game.toTitle(); break;
      case 'quit': if (window.ocDesktop) window.ocDesktop.quit(); break;
      case 'back':
        if (this.modal === 'settings' || this.modal === 'controls' || this.modal === 'slots') {
          const from = this.modal === 'settings' ? this.settingsFrom : this.modal === 'controls' ? this.controlsFrom : this.slotsFrom;
          this.hideAllPanels();
          if (G.state === 'menu') { this.show('menu'); this.modal = 'menu'; } else if (from === 'pause') { this.show('pause'); this.modal = 'pause'; } else this.closeAll();
        } else this.closeAll();
        break;
      case 'close': this.closeAll(); break;
      case 'respawn': Game.respawn(); break;
    }
  },

  show(id) { this.hideAllPanels(); $(id).classList.remove('hidden'); },
  hideAllPanels() { document.querySelectorAll('.screen').forEach(e => e.classList.add('hidden')); },
  closeAll() {
    this.hideAllPanels();
    $('dialogue').classList.add('hidden');
    this.dlg = null;
    if (G.state === 'menu') { this.show('menu'); this.modal = 'menu'; return; }
    this.modal = null;
  },
  blocking() { return !!this.modal; },

  showMainMenu() {
    G.state = 'menu';
    $('hud').classList.add('hidden');
    this.show('menu'); this.modal = 'menu';
    const latest = SaveSys.latest();
    $('btn-continue').disabled = !latest;
    $('btn-continue').title = latest ? `Day ${latest.meta.day} · ${latest.meta.region}` : 'No saved game';
    $('btn-loadgame').disabled = !SaveSys.list().some(s => s.meta);
  },
  enterGame() { $('hud').classList.remove('hidden'); this.closeAll(); },

  togglePause() {
    if (this.modal === 'pause') { this.closeAll(); return; }
    if (this.modal) { if (this.modal === 'dialogue') return; this.closeAll(); return; }
    this.show('pause'); this.modal = 'pause';
    $('pause-info').textContent = `Day ${Env.day()} · ${Env.clock()} · ${G.region || ''}`;
  },

  /* ---------------- notifications & banners ---------------- */
  notify(text, kind = 'info') {
    const box = $('notes');
    const el = document.createElement('div');
    el.className = 'note ' + kind; el.textContent = text;
    box.prepend(el);
    while (box.children.length > 6) box.lastChild.remove();
    setTimeout(() => el.classList.add('fade'), kind === 'tip' ? 7500 : 5500);
    setTimeout(() => el.remove(), kind === 'tip' ? 8500 : 6500);
  },
  banner(title, sub, bad) {
    const b = $('banner');
    b.querySelector('.b-sub').textContent = sub; b.querySelector('.b-title').textContent = title;
    b.className = bad ? 'show bad' : 'show';
    clearTimeout(this.bannerT); this.bannerT = setTimeout(() => b.className = '', 3600);
  },
  flashDamage(a) { const f = $('dmg-flash'); f.style.transition = 'none'; f.style.opacity = 0.25 + a * 0.45; requestAnimationFrame(() => { f.style.transition = 'opacity .6s'; f.style.opacity = 0; }); },
  fade(sec) { const f = $('fade'); f.style.transition = 'none'; f.style.opacity = 1; setTimeout(() => { f.style.transition = `opacity ${sec}s`; f.style.opacity = 0; }, 60); },
  regionToast(name) { const r = $('region-toast'); r.textContent = name; r.classList.remove('show'); void r.offsetWidth; r.classList.add('show'); },

  /* ---------------- dialogue ---------------- */
  dialogue(lines, onDone, opts = {}) {
    this.dlg = { lines, i: 0, onDone, opts };
    this.modal = 'dialogue';
    $('dialogue').classList.remove('hidden');
    this.renderDialogue();
  },
  renderDialogue() {
    const d = this.dlg, l = d.lines[d.i], last = d.i === d.lines.length - 1;
    $('dlg-who').textContent = l.who; $('dlg-text').textContent = l.text;
    const act = $('dlg-actions'); act.innerHTML = '';
    if (last && d.opts.accept) {
      const a = document.createElement('button'); a.className = 'btn'; a.textContent = d.opts.accept;
      a.onclick = e => { e.stopPropagation(); this.endDialogue(true); };
      const n = document.createElement('button'); n.className = 'btn ghost'; n.textContent = 'Not now';
      n.onclick = e => { e.stopPropagation(); this.endDialogue(false); };
      act.append(a, n);
    } else { const h = document.createElement('span'); h.className = 'hint'; h.textContent = last ? '[E] Close' : '[E] Continue'; act.append(h); }
  },
  advanceDialogue() {
    const d = this.dlg; if (!d) return;
    if (d.i === d.lines.length - 1) { if (!d.opts.accept) this.endDialogue(true); return; }
    d.i++; Sound.play('ui'); this.renderDialogue();
  },
  endDialogue(ok) {
    const d = this.dlg; this.dlg = null;
    if (!d) return;
    $('dialogue').classList.add('hidden'); this.modal = null;
    if (ok && d.onDone) d.onDone();
  },

  /* ---------------- shop ---------------- */
  openShop(shopId, clerk) {
    this.shopId = shopId; this.shopClerk = clerk;
    this.show('shop'); this.modal = 'shop';
    this.renderShop();
    Sound.play('door');
  },
  renderShop() {
    const shop = SHOPS[this.shopId], P = G.player;
    $('shop-title').textContent = shop.name;
    $('shop-clerk').textContent = this.shopClerk ? this.shopClerk.name : '';
    $('shop-money').textContent = formatMoney(P.money);
    const buy = $('shop-buy'); buy.innerHTML = '';
    for (const e of Economy.entries(this.shopId)) {
      const row = document.createElement('div'); row.className = 'row';
      let icon = '';
      if (e.weapon) icon = `<canvas width="72" height="24" data-w="${e.weapon}"></canvas>`;
      row.innerHTML = `<div class="r-main">${icon}<div><b>${esc(e.name)}</b><small>${esc(e.desc || '')}</small></div></div><div class="r-note">${esc(e.note || '')}</div><div class="r-price">${e.noCharge && !e.price ? '' : formatMoney(e.price)}</div>`;
      const btn = document.createElement('button'); btn.className = 'btn small';
      btn.textContent = e.reason || e.label || (e.noCharge ? 'Pay' : 'Buy'); btn.disabled = !e.can;
      btn.onclick = () => { e.buy(); Sound.play('buy'); if (this.modal === 'shop') this.renderShop(); };
      row.append(btn); buy.append(row);
    }
    buy.querySelectorAll('canvas[data-w]').forEach(c => Sprites.weaponIcon(c.getContext('2d'), c.dataset.w, 0, 0, 2));
    const sells = Economy.sellEntries(this.shopId), sell = $('shop-sell');
    $('shop-sell-wrap').classList.toggle('hidden', !SHOP_STOCK[shop.type].sells.length);
    sell.innerHTML = sells.length ? '' : '<p class="muted">Nothing they want to buy.</p>';
    for (const s of sells) {
      const row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<div class="r-main"><div><b>${esc(s.name)}</b><small>You have ${s.have}</small></div></div><div class="r-price">${formatMoney(s.price)}</div>`;
      const btn = document.createElement('button'); btn.className = 'btn small'; btn.textContent = 'Sell';
      btn.onclick = () => { s.sell(); Sound.play('coin'); this.renderShop(); };
      const all = document.createElement('button'); all.className = 'btn small ghost'; all.textContent = 'Sell all';
      all.onclick = () => { for (let i = 0; i < s.have; i++) s.sell(); Sound.play('coin'); this.renderShop(); };
      row.append(btn, all); sell.append(row);
    }
  },

  /* ---------------- inventory ---------------- */
  toggleInventory() {
    if (this.modal === 'inventory') { this.closeAll(); return; }
    if (this.modal) return;
    this.show('inventory'); this.modal = 'inventory'; this.renderInventory();
  },
  renderInventory() {
    const P = G.player;
    $('inv-money').textContent = formatMoney(P.money);
    $('inv-bounty').textContent = Law.bounty ? `Wanted: ${formatMoney(Law.bounty)}` : 'No bounty';
    const wg = $('inv-weapons'); wg.innerHTML = '';
    for (const k of WEAPON_ORDER) {
      const w = WEAPONS[k], owned = P.owned[k];
      const card = document.createElement('div'); card.className = 'wcard' + (owned ? '' : ' locked') + (P.cur === k ? ' active' : '');
      card.innerHTML = `<canvas width="84" height="28"></canvas><b>${esc(w.name)}</b><small>${owned ? (w.melee ? 'Melee' : `${P.mag[k]}/${w.cap} · ${P.ammo[w.ammo]} spare`) : `Gunsmith ${formatMoney(w.price)}`}</small><span class="slot">${w.slot}</span>`;
      Sprites.weaponIcon(card.querySelector('canvas').getContext('2d'), k, 0, 0, 2);
      if (owned) card.onclick = () => { P.select(k); this.renderInventory(); };
      wg.append(card);
    }
    $('inv-ammo').innerHTML = Object.keys(AMMO).map(a => `<div><b>${P.ammo[a]}</b> ${AMMO[a].name} <small>(max ${Progress.ammoMax(a)})</small></div>`).join('') +
      THROWABLES.map(k => `<div><b>${P.inv[k] || 0}</b> ${ITEMS[k].name} <small>${P.throwSel === k ? '(selected — G to throw)' : '(X to select)'}</small></div>`).join('');
    // reputation & perks
    const need = Progress.need(P.level);
    let rep = `<div class="rep-head"><b>Level ${P.level}</b><span>${Math.floor(P.xp)}/${need} reputation</span></div><div class="mini-bar"><span style="width:${P.xp / need * 100}%;background:#9ad0ff"></span></div>`;
    rep += P.perkPoints ? `<p class="perk-pts">★ ${P.perkPoints} perk point${P.perkPoints > 1 ? 's' : ''} to spend — pick below</p>` : '<p class="muted small">Earn reputation from fights, robberies, bounties and jobs to unlock perks.</p>';
    rep += '<div class="perks">' + Object.entries(PERKS).map(([id, p]) => {
      const has = P.perks[id];
      return `<div class="perk ${has ? 'has' : ''}"><div><b>${esc(p.name)}</b><small>${esc(p.desc)}</small></div>${has ? '<span class="tick">✔</span>' : P.perkPoints ? `<button class="btn small" data-perk="${id}">Learn</button>` : ''}</div>`;
    }).join('') + '</div>';
    const A = Bounties.active;
    rep += `<h3>Bounty</h3>` + (A ? `<p><b>${esc(A.name)}</b> — ${A.state === 'hunting' ? `hunting ($${A.alive} alive / $${A.dead} dead)` : A.state === 'captive' ? 'tied up — take them to a sheriff' : 'dead — collect at a sheriff'}</p>` : '<p class="muted small">No bounty. Check the wanted posters at a sheriff\'s office.</p>');
    $('inv-rep').innerHTML = rep;
    $('inv-rep').querySelectorAll('[data-perk]').forEach(b => b.onclick = () => { Progress.choose(b.dataset.perk); this.renderInventory(); });
    const items = $('inv-items'); items.innerHTML = '';
    let any = false;
    for (const id of ITEM_ORDER) {
      const n = P.inv[id] || 0; if (!n) continue; any = true;
      const it = ITEMS[id], row = document.createElement('div'); row.className = 'row';
      row.innerHTML = `<div class="r-main"><div><b>${esc(it.name)} ×${n}</b><small>${esc(it.desc)}${it.type === 'stolen' ? ' Sell to the fence.' : it.type === 'pelt' ? ' Sell at a general store or trapper.' : ''}</small></div></div>`;
      if (it.type === 'use' || it.type === 'map') { const b = document.createElement('button'); b.className = 'btn small'; b.textContent = 'Use'; b.onclick = () => { Economy.useItem(id); this.renderInventory(); }; row.append(b); }
      items.append(row);
    }
    if (!any) items.innerHTML = '<p class="muted">Your saddlebags are empty.</p>';
    const h = P.horse;
    $('inv-horse').innerHTML = h && !h.dead
      ? `<b>${esc(h.name)}</b> — ${esc(h.def.name)}<div class="mini-bar"><span style="width:${h.hp / h.maxHp * 100}%;background:#b8402e"></span></div><small>Health ${Math.ceil(h.hp)}/${h.maxHp} · Stamina ${Math.ceil(h.stamina)}/${h.maxSt} · Speed ${h.def.speed}/${h.def.sprint}</small><small>Press H to whistle, F to mount. Feed oats from the Items list.</small>`
      : '<p class="muted">You have no horse. Buy one at the Dustwater stables, break a wild one, or steal one (it\'s a crime).</p>';
    const s = G.stats;
    $('inv-stats').innerHTML = [
      ['Day', Env.day()], ['Missions', `${MissionSys.completed.length}/${MissionSys.list.length}`], ['Robberies', s.robberies], ['Kills', s.kills],
      ['Accuracy', s.shots ? Math.round(s.hits / s.shots * 100) + '%' : '—'], ['Animals hunted', s.hunted], ['Bounties', s.bounties || 0], ['Treasures', `${G.world.treasuresFound.length}/${World.treasures.length}`], ['Money earned', formatMoney(s.earned)], ['Deaths', s.deaths]
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    $('inv-missions').innerHTML = MissionSys.list.map(m => `<li class="${MissionSys.completed.includes(m.id) ? 'done' : (MissionSys.active === m ? 'active' : '')}">${esc(m.title)}</li>`).join('');
  },

  /* ---------------- map ---------------- */
  toggleMap() {
    if (this.modal === 'map') { this.closeAll(); return; }
    if (this.modal) return;
    this.show('mapview'); this.modal = 'map';
    const c = $('map-canvas');
    c.width = Math.max(320, Math.floor(innerWidth - 110)); c.height = Math.max(200, Math.floor(innerHeight - 290));
    const fit = Math.min(c.width / World.W, c.height / World.H);
    this.mapV = { cx: G.player.x / TS, cy: G.player.y / TS, z: Math.max(fit, Math.min(3, fit * 3)) };
    this.bindMap();
    this.renderMap();
  },
  bindMap() {
    if (this.mapBound) return; this.mapBound = true;
    const c = $('map-canvas');
    const clampV = () => {
      const v = this.mapV, fit = Math.min(c.width / World.W, c.height / World.H);
      v.z = clamp(v.z, fit, 10);
      const hw = c.width / 2 / v.z, hh = c.height / 2 / v.z;
      v.cx = World.W <= hw * 2 ? World.W / 2 : clamp(v.cx, hw, World.W - hw);
      v.cy = World.H <= hh * 2 ? World.H / 2 : clamp(v.cy, hh, World.H - hh);
    };
    const toTile = e => {
      const r = c.getBoundingClientRect(), v = this.mapV;
      const mx = (e.clientX - r.left) * c.width / r.width, my = (e.clientY - r.top) * c.height / r.height;
      return { x: v.cx + (mx - c.width / 2) / v.z, y: v.cy + (my - c.height / 2) / v.z };
    };
    c.addEventListener('wheel', e => {
      e.preventDefault();
      const v = this.mapV, before = toTile(e);
      v.z *= e.deltaY < 0 ? 1.25 : 0.8; clampV();
      const after = toTile(e); v.cx += before.x - after.x; v.cy += before.y - after.y; clampV();
      this.renderMap();
    }, { passive: false });
    let drag = null;
    c.addEventListener('mousedown', e => { drag = { x: e.clientX, y: e.clientY, cx: this.mapV.cx, cy: this.mapV.cy, moved: false, b: e.button }; e.preventDefault(); e.stopPropagation(); });
    addEventListener('mousemove', e => {
      if (!drag || this.modal !== 'map') return;
      const r = c.getBoundingClientRect(), k = c.width / r.width / this.mapV.z;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;
      if (drag.moved) { this.mapV.cx = drag.cx - dx * k; this.mapV.cy = drag.cy - dy * k; clampV(); this.renderMap(); }
    });
    addEventListener('mouseup', e => {
      if (!drag || this.modal !== 'map') { drag = null; return; }
      const d = drag; drag = null;
      if (d.moved) return;
      if (d.b === 2) { Discovery.clearWaypoint(); this.renderMap(); return; }
      if (d.b === 0) { const t = toTile(e); Discovery.setWaypoint(t.x * TS, t.y * TS); this.renderMap(); }
    });
    c.addEventListener('contextmenu', e => e.preventDefault());
    this.mapClamp = clampV;
  },
  renderMap() {
    const c = $('map-canvas'), g = c.getContext('2d'), v = this.mapV;
    if (this.mapClamp) this.mapClamp();
    const z = v.z, ox = c.width / 2 - v.cx * z, oy = c.height / 2 - v.cy * z;
    const px = wx => wx / TS * z + ox, py = wy => wy / TS * z + oy;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#d6c49c'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = false;
    g.drawImage(World.minimap, ox, oy, World.W * z, World.H * z);
    g.fillStyle = 'rgba(230,205,160,0.16)'; g.fillRect(0, 0, c.width, c.height);
    g.imageSmoothingEnabled = true;
    g.drawImage(Discovery.fogCanvas(), ox, oy, World.W * z, World.H * z);
    const P = G.player, seen = (x, y) => Discovery.seenAt(x, y), fs = clamp(Math.round(9 + z * 1.6), 11, 18);
    g.textAlign = 'center';
    const label = (t, x, y, col = '#2a1a0e', size = fs) => {
      g.font = `bold ${size}px Georgia, serif`;
      g.fillStyle = 'rgba(240,225,190,.78)'; const w = g.measureText(t).width; g.fillRect(x - w / 2 - 3, y - size, w + 6, size + 4); g.fillStyle = col; g.fillText(t, x, y);
    };
    // region names
    const regions = [['Frostpeak Mountains', 800, 30], ['Harlow Lake', 1110, 18], ['Ranch Country', 420, 270], ['Red Canyonlands', 1000, 260], ['Bonewhite Salt Flats', 330, 540], ['Mesa Badlands', 960, 520], ['Rio Bravo', 1000, 772],
      ['Pinewood Forest', 60, 30], ['Red Sand Desert', 220, 200], ['Coyote Plains', 60, 180]].concat(World.H > 1000 ? [['Desierto de Sonora', 300, 1000], ['Sierra Madre', 1000, 1100], ['Barranca del Diablo', 260, 1180], ['Valle de Oro', 520, 1460], ['Laguna Verde', 1120, 1480], ['Costa Dorada', 700, 1760], ['Mar de Cortés', 700, 1880]] : []);
    if (World.H > 1000) {   // the border, and which country is which
      const by = py(MEX_Y * TS);
      g.strokeStyle = 'rgba(120,30,20,.55)'; g.lineWidth = 2; g.setLineDash([10, 6]); g.beginPath(); g.moveTo(Math.max(0, px(0)), by); g.lineTo(Math.min(c.width, px(World.W * TS)), by); g.stroke(); g.setLineDash([]);
      g.font = `bold ${Math.round(fs * 1.8)}px Georgia, serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(60,30,20,.45)';
      const mx = px(World.W * TS * 0.25); g.fillText('UNITED STATES', mx, by - 12); g.fillText('MÉXICO', mx, by + Math.round(fs * 1.8) + 8);
    }
    const close = z >= 1.2;
    for (const [n, tx, ty] of regions.slice(0, close ? 10 : 7)) if (seen(tx * TS, ty * TS)) label(n, px(tx * TS), py(ty * TS), '#4a3a22', Math.round(fs * 1.1));
    for (const t of World.towns) if (G.world.discovered.includes(t.name) || seen((t.x0 + t.x1) / 2 * TS, (t.y0 + t.y1) / 2 * TS)) label(t.name, px((t.x0 + t.x1) / 2 * TS), py(t.y0 * TS) - 4);
    if (MissionSys.flags.hideout) { const cp = Story.campPos(); label(Story.campName(), px(cp.x), py(cp.y) - 22); }
    if (close) label("Marshal's Camp", px(World.poi.marshalCamp.x), py(World.poi.marshalCamp.y) - 10, '#4a2a1a');
    for (const [n, poi] of [['Hollow Creek', World.poi.hollowCreek], ['Last Water', World.poi.lastWater], ['Silver Crown Mine', World.poi.silverMine]]) if (close && poi && seen(poi.x, poi.y)) label(n, px(poi.x), py(poi.y) - 12, '#3a2a2a');
    for (const cp of World.banditCamps) if (seen(cp.x, cp.y)) { g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(px(cp.x), py(cp.y), 5, 0, TAU); g.fill(); if (close) label(cp.name, px(cp.x), py(cp.y) - 8, '#7a1a1a'); }
    for (const t of World.treasures) {
      if (!G.world.treasuresRevealed.includes(t.id) || G.world.treasuresFound.includes(t.id)) continue;
      g.strokeStyle = '#a01010'; g.lineWidth = 3; const x = px(t.x), y = py(t.y), r = 6;
      g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke();
    }
    const wp = G.world.waypoint;
    if (wp) { g.strokeStyle = 'rgba(160,90,220,.8)'; g.lineWidth = 2; g.setLineDash([6, 6]); g.beginPath(); g.moveTo(px(P.x), py(P.y)); g.lineTo(px(wp.x), py(wp.y)); g.stroke(); g.setLineDash([]); }
    for (const m of allMarkers()) {
      const x = px(m.x), y = py(m.y);
      g.fillStyle = markerColor(m); g.strokeStyle = '#2a1a0e'; g.lineWidth = 2;
      if (m.kind === 'waypoint') { g.beginPath(); g.moveTo(x, y); g.lineTo(x - 6, y - 14); g.lineTo(x + 6, y - 14); g.closePath(); g.fill(); g.stroke(); g.beginPath(); g.arc(x, y - 15, 6, 0, TAU); g.fill(); g.stroke(); }
      else { g.beginPath(); g.arc(x, y, 6, 0, TAU); g.fill(); g.stroke(); }
    }
    if (P.horse && !P.horse.dead && !P.horse.rider) { g.fillStyle = '#6a3a1a'; g.fillRect(px(P.horse.x) - 4, py(P.horse.y) - 4, 8, 8); }
    g.save(); g.translate(px(P.x), py(P.y)); g.rotate(P.face); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(11, 0); g.lineTo(-7, -7); g.lineTo(-3, 0); g.lineTo(-7, 7); g.closePath(); g.fill(); g.stroke(); g.restore();
    const wd = wp ? ` · Waypoint ${Math.round(dist(P.x, P.y, wp.x, wp.y) / TS * 2)} yd` : '';
    const pct = Math.round(G.world.explored.reduce((a, b) => a + b, 0) / G.world.explored.length * 100);
    $('map-info').textContent = `${G.region} · Day ${Env.day()} · ${Env.clock()} · ${pct}% explored${wd}`;
  },

  /* ---------------- save slots ---------------- */
  openSlots(mode) {
    this.slotMode = mode; this.slotsFrom = this.modal === 'pause' ? 'pause' : 'menu';
    this.show('slots'); this.modal = 'slots';
    $('slots-title').textContent = mode === 'save' ? 'Save Game' : 'Load Game';
    const box = $('slot-list'); box.innerHTML = '';
    for (const s of SaveSys.list()) {
      if (mode === 'save' && s.slot === 'auto') continue;
      const row = document.createElement('div'); row.className = 'row slot';
      const m = s.meta;
      row.innerHTML = `<div class="r-main"><div><b>${s.slot === 'auto' ? 'Autosave' : 'Slot ' + s.slot}</b><small>${m ? `Day ${m.day} · ${esc(m.region)} · ${formatMoney(m.money)} · ${m.missions}/23 missions · ${new Date(m.savedAt).toLocaleString()}` : 'Empty'}</small></div></div>`;
      const b = document.createElement('button'); b.className = 'btn small';
      if (mode === 'save') {
        b.textContent = m ? 'Overwrite' : 'Save';
        b.onclick = () => { const err = SaveSys.save(s.slot); if (err) { this.notify(err, 'bad'); Sound.play('deny'); } else { this.notify('Game saved.', 'good'); this.openSlots('save'); } };
      } else {
        b.textContent = 'Load'; b.disabled = !m;
        b.onclick = () => { this.closeAll(); Game.load(s.slot); };
      }
      row.append(b);
      if (m) { const del = document.createElement('button'); del.className = 'btn small ghost'; del.textContent = 'Delete'; del.onclick = () => { if (confirm('Delete this save?')) { SaveSys.remove(s.slot); this.openSlots(mode); } }; row.append(del); }
      box.append(row);
    }
    $('slots-note').textContent = mode === 'save' ? (Law.heat > 0 ? 'You cannot save while the law is hunting you.' : MissionSys.active ? 'You cannot save during a mission.' : 'Progress is stored in this browser (or app) on this computer.') : '';
  },

  /* ---------------- settings ---------------- */
  syncSettings() {
    const s = G.settings;
    $('set-master').value = s.master; $('set-sfx').value = s.sfx; $('set-music').value = s.music;
    $('set-diff').value = s.difficulty; $('set-zoom').value = s.zoom; $('set-shake').checked = s.shake; $('set-fps').checked = s.fps; $('set-minimap').checked = s.minimap;
  },
  readSettings() {
    const s = G.settings;
    s.master = +$('set-master').value; s.sfx = +$('set-sfx').value; s.music = +$('set-music').value;
    s.difficulty = $('set-diff').value; s.zoom = $('set-zoom').value; s.shake = $('set-shake').checked; s.fps = $('set-fps').checked; s.minimap = $('set-minimap').checked;
    Game.applySettings(); Game.saveSettings();
  },

  /* ---------------- death ---------------- */
  showDeath(lost) {
    $('death').classList.remove('hidden');
    $('death-sub').textContent = lost ? `The undertaker took ${formatMoney(lost)} for your trouble.` : 'The county claims another soul.';
  },
  hideDeath() { $('death').classList.add('hidden'); },

  /* ---------------- HUD ---------------- */
  update(dt) {
    const P = G.player;
    if (G.state !== 'play' || !P) return;
    $('hp-fill').style.width = (P.hp / P.maxHp * 100) + '%';
    $('st-fill').style.width = P.stamina + '%';
    $('nv-fill').style.width = P.nerve + '%';
    $('nv-fill').parentElement.classList.toggle('ready', P.nerve >= 20 || Combat.nervesOn);
    const stance = P.rollT > 0 ? 'ROLLING' : Combat.nervesOn ? 'STEADY NERVES' : P.crouch ? (Combat.coverNear(P.x, P.y) ? 'IN COVER' : 'CROUCHED') : (P.steady >= 1 ? 'PRECISE SHOT READY' : '');
    if ($('stance').textContent !== stance) $('stance').textContent = stance;
    const h = P.mounted || (P.horse && !P.horse.dead ? P.horse : null);
    $('horse-row').classList.toggle('hidden', !h);
    if (h) { $('hh-fill').style.width = (h.hp / h.maxHp * 100) + '%'; $('hs-fill').style.width = (h.stamina / h.maxSt * 100) + '%'; $('horse-name').textContent = h.name; }
    // action progress
    const a = Interact.action;
    $('progress').classList.toggle('hidden', !a);
    if (a) { $('progress-label').textContent = a.label; $('progress-fill').style.width = Math.min(100, a.t / a.dur * 100) + '%'; }
    const ar = Law.arrest;
    // prompt
    let prompt = '';
    if (!a && !P.dead && !this.modal) {
      if (Interact.prompt) prompt += `<span><kbd>E</kbd> ${esc(Interact.prompt.label)}</span>`;
      if (Interact.fPrompt) prompt += `<span><kbd>F</kbd> ${esc(Interact.fPrompt)}</span>`;
    }
    if (ar) prompt = ar.surrendering ? '<span class="warn">Surrendering...</span>' : `<span class="warn"><kbd>E</kbd> Surrender — or get clear to resist arrest</span>`;
    const pe = $('prompt'); if (pe.innerHTML !== prompt) pe.innerHTML = prompt;
    this.hudT -= dt;
    this.drawMinimap();
    if (this.hudT > 0) return;
    this.hudT = 0.1;
    $('money').textContent = formatMoney(P.money);
    $('lvl').textContent = P.level; $('xp-fill').style.width = Math.min(100, P.xp / Progress.need(P.level) * 100) + '%';
    $('perk-alert').classList.toggle('hidden', !P.perkPoints);
    const ts = P.inv[P.throwSel] ? P.throwSel : (THROWABLES.find(k => P.inv[k] > 0) || P.throwSel);
    $('throwable').innerHTML = `<kbd>G</kbd> ${ITEMS[ts].name} <b>×${P.inv[ts] || 0}</b>`;
    $('clock').textContent = `${Env.clock()} · Day ${Env.day()}`;
    $('weather').textContent = { clear: 'Clear', cloudy: 'Overcast', rain: 'Rain', storm: 'Thunderstorm', dust: 'Dust storm' }[Env.weather];
    const stars = $('stars').children;
    for (let i = 0; i < 5; i++) stars[i].classList.toggle('on', i < Law.heat);
    $('wanted').classList.toggle('hot', Law.heat > 0);
    $('wanted').classList.toggle('flash', Law.heat > 0 && Law.state === 'pursuit');
    $('bounty').textContent = Law.bounty ? `Bounty ${formatMoney(Law.bounty)}` : 'No bounty';
    $('law-state').textContent = Law.heat === 0 ? '' : Law.state === 'pursuit' ? 'SPOTTED — lawmen in pursuit' : `Searching... ${Math.ceil(Law.searchT)}s`;
    // weapon panel
    const w = WEAPONS[P.cur];
    $('weapon-name').textContent = w.name;
    $('mag').textContent = w.melee ? '—' : P.mag[P.cur];
    $('reserve').textContent = w.melee ? '∞' : P.ammo[w.ammo];
    $('ammo').classList.toggle('low', !w.melee && P.mag[P.cur] === 0);
    if (this.lastIcon !== P.cur) { this.lastIcon = P.cur; const g = this.wi; g.clearRect(0, 0, 120, 40); Sprites.weaponIcon(g, P.cur, 10, 4, 3); }
    $('reload-state').textContent = P.reload ? 'Reloading...' : (P.cockT > 0 ? 'Cocking...' : P.leverT > 0 ? 'Working lever...' : '');
    const slots = $('weapon-slots');
    const html = [1, 2, 3, 4, 5].map(n => {
      const keys = WEAPON_ORDER.filter(k => WEAPONS[k].slot === n), owned = keys.some(k => P.owned[k]), act = keys.includes(P.cur);
      return `<span class="${owned ? 'own' : ''} ${act ? 'act' : ''}">${n}</span>`;
    }).join('');
    if (slots.innerHTML !== html) slots.innerHTML = html;
    const ob = MissionSys.objectiveText();
    $('obj-title').textContent = ob.title; $('obj-text').textContent = ob.text;
    $('fps').textContent = G.settings.fps ? `${Game.fps | 0} fps` : '';
    $('minimap-wrap').classList.toggle('hidden', !G.settings.minimap);
  },

  drawMinimap() {
    if (!G.settings.minimap) return;
    const g = this.mm, P = G.player, S = 160, span = 90;
    const tx = P.x / TS, ty = P.y / TS;
    g.imageSmoothingEnabled = false;
    g.fillStyle = '#1a120a'; g.fillRect(0, 0, S, S);
    g.drawImage(World.minimap, tx - span / 2, ty - span / 2, span, span, 0, 0, S, S);
    const k = S / span, toM = (x, y) => [(x / TS - tx + span / 2) * k, (y / TS - ty + span / 2) * k];
    if (Law.heat > 0) {
      const [lx, ly] = toM(Law.lastSeen.x, Law.lastSeen.y);
      if (Law.state === 'search') { g.strokeStyle = 'rgba(220,40,30,.8)'; g.fillStyle = 'rgba(220,40,30,.15)'; g.beginPath(); g.arc(lx, ly, 160 / TS * k, 0, TAU); g.fill(); g.stroke(); }
      for (const a of G.actors) {
        if (a.faction !== 'law' || a.dead || a.inside) continue;
        const [x, y] = toM(a.x, a.y);
        if (x < 0 || y < 0 || x > S || y > S) continue;
        g.fillStyle = (Math.floor(performance.now() / 250) % 2) ? '#ff3a2a' : '#3a6aff'; g.fillRect(x - 2, y - 2, 4, 4);
      }
    }
    for (const a of G.actors) if (!a.dead && a.faction === 'rival' && a.aggro) { const [x, y] = toM(a.x, a.y); g.fillStyle = '#e04020'; g.fillRect(x - 1.5, y - 1.5, 3, 3); }
    if (P.horse && !P.horse.dead && !P.horse.rider) { const [x, y] = toM(P.horse.x, P.horse.y); g.fillStyle = '#c8803a'; g.fillRect(x - 2, y - 2, 4, 4); g.strokeStyle = '#000'; g.strokeRect(x - 2, y - 2, 4, 4); }
    for (const t of World.treasures) if (G.world.treasuresRevealed.includes(t.id) && !G.world.treasuresFound.includes(t.id)) { const [x, y] = toM(t.x, t.y); g.strokeStyle = '#c01010'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - 3, y - 3); g.lineTo(x + 3, y + 3); g.moveTo(x + 3, y - 3); g.lineTo(x - 3, y + 3); g.stroke(); }
    for (const m of allMarkers()) {
      let [x, y] = toM(m.x, m.y);
      const out = x < 6 || y < 6 || x > S - 6 || y > S - 6;
      x = clamp(x, 6, S - 6); y = clamp(y, 6, S - 6);
      g.fillStyle = markerColor(m); g.strokeStyle = '#2a1a0a'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(x, y, m.small ? 2.5 : out ? 4 : 5, 0, TAU); g.fill(); g.stroke();
    }
    g.save(); g.translate(S / 2, S / 2); g.rotate(P.face); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1;
    g.beginPath(); g.moveTo(6, 0); g.lineTo(-4, -4); g.lineTo(-2, 0); g.lineTo(-4, 4); g.closePath(); g.fill(); g.stroke(); g.restore();
  },

  /* ---------------- world-space overlay (crisp text) ---------------- */
  drawOverlay(o, scale, camX, camY, t) {
    const W = o.canvas.width, H = o.canvas.height;
    o.clearRect(0, 0, W, H);
    if (G.state !== 'play') return;
    const dpr = Game.dpr, s = scale * dpr;
    const sx = x => (x - camX) * s, sy = y => (y - camY) * s;
    o.textAlign = 'center'; o.textBaseline = 'bottom';
    // barks
    o.font = `${Math.round(12 * dpr)}px Georgia, serif`;
    for (const a of G.actors) {
      if (a.dead || a.inside || a.barkT <= 0 || !a.barkText || !Game.onScreen(a.x, a.y, 0)) continue;
      const x = sx(a.x), y = sy(a.y - (a.mounted ? 34 : 24));
      const w = o.measureText(a.barkText).width + 12 * dpr;
      o.globalAlpha = Math.min(1, a.barkT * 2);
      o.fillStyle = 'rgba(245,232,200,0.92)'; o.strokeStyle = '#3a2210'; o.lineWidth = dpr;
      this.roundRect(o, x - w / 2, y - 20 * dpr, w, 18 * dpr, 4 * dpr); o.fill(); o.stroke();
      o.fillStyle = '#2a1608'; o.fillText(a.barkText, x, y - 5 * dpr);
      o.globalAlpha = 1;
    }
    // names over story characters & health over wounded enemies
    o.font = `bold ${Math.round(11 * dpr)}px Georgia, serif`;
    for (const a of G.actors) {
      if (a.dead || a.inside || !Game.onScreen(a.x, a.y, 0)) continue;
      const d = dist(a.x, a.y, G.player.x, G.player.y);
      if ((a.giver || a.shopId) && d < 90) { o.fillStyle = 'rgba(0,0,0,.6)'; o.fillText(a.name, sx(a.x) + dpr, sy(a.y - 21) + dpr); o.fillStyle = a.giver ? '#ffd76a' : '#f0e0c0'; o.fillText(a.name, sx(a.x), sy(a.y - 21)); }
      if (a.hp < a.maxHp && a.faction !== 'civ' && a.downed <= 0) {
        const bw = 22 * dpr * scale / 3, x = sx(a.x) - bw / 2, y = sy(a.y - (a.mounted ? 30 : 22));
        o.fillStyle = 'rgba(0,0,0,.6)'; o.fillRect(x - 1, y - 1, bw + 2, 4 * dpr);
        o.fillStyle = a.faction === 'gang' ? '#5ab05a' : '#d84a3a'; o.fillRect(x, y, bw * Math.max(0, a.hp / a.maxHp), 2 * dpr);
      }
      if (a.downed > 0) { o.fillStyle = '#ffb04a'; o.fillText(a.knockedOut ? 'KNOCKED OUT' : 'WOUNDED', sx(a.x), sy(a.y - 18)); }
      else if (a.captive) { o.fillStyle = '#9ad0ff'; o.fillText('PRISONER', sx(a.x), sy(a.y - 24)); }
      else if (a.surrendered && !a.escortBy) { o.fillStyle = '#e8e0d0'; o.fillText('SURRENDERED', sx(a.x), sy(a.y - 24)); }
      else if (a.target === G.player && a.drawn) {
        // spotted-you warning, then the enemy type while fighting
        if (a.alertT > 0) {
          const x = sx(a.x), y = sy(a.y - (a.mounted ? 38 : 30)) - Math.sin(t * 12) * dpr;
          o.font = `900 ${Math.round(18 * dpr)}px Georgia`; o.fillStyle = '#000'; o.fillText('!', x + dpr, y + dpr); o.fillStyle = '#ffd23a'; o.fillText('!', x, y);
          o.font = `bold ${Math.round(11 * dpr)}px Georgia, serif`;
        } else if (a.role && d < 260) { o.fillStyle = 'rgba(0,0,0,.6)'; o.fillText(ROLE_NAMES[a.role], sx(a.x) + dpr, sy(a.y - (a.mounted ? 34 : 26)) + dpr); o.fillStyle = '#ff9a7a'; o.fillText(ROLE_NAMES[a.role], sx(a.x), sy(a.y - (a.mounted ? 34 : 26))); }
      }
    }
    // floaters
    o.font = `bold ${Math.round(13 * dpr)}px Georgia, serif`;
    for (const f of G.floaters) {
      const k = f.life / 1.6, y = sy(f.y - (1 - k) * 18);
      o.globalAlpha = Math.min(1, k * 2);
      o.fillStyle = 'rgba(0,0,0,.7)'; o.fillText(f.text, sx(f.x) + dpr, y + dpr);
      o.fillStyle = f.color; o.fillText(f.text, sx(f.x), y);
    }
    o.globalAlpha = 1;
    // mission markers + edge arrows
    for (const m of allMarkers()) {
      if (m.kind === 'stranger' && dist(m.x, m.y, G.player.x, G.player.y) > 420) continue;
      const on = Game.onScreen(m.x, m.y, -10);
      if (on) {
        const bob = Math.sin(t * 4) * 3 * dpr, x = sx(m.x), y = sy(m.y) + bob;
        const r = (m.small ? 5 : 8) * dpr;
        o.fillStyle = markerColor(m); o.strokeStyle = '#2a1608'; o.lineWidth = 2 * dpr;
        o.beginPath(); o.moveTo(x, y - r); o.lineTo(x + r * 0.8, y); o.lineTo(x, y + r); o.lineTo(x - r * 0.8, y); o.closePath(); o.fill(); o.stroke();
        if (m.kind === 'giver') { o.fillStyle = '#2a1608'; o.font = `bold ${Math.round(11 * dpr)}px Georgia`; o.fillText('!', x, y + 5 * dpr); }
        if (m.label && !(m.kind === 'giver' && dist(m.x, m.y, G.player.x, G.player.y) < 100)) { o.font = `bold ${Math.round(12 * dpr)}px Georgia, serif`; o.fillStyle = 'rgba(0,0,0,.7)'; o.fillText(m.label, x + dpr, y - r - 3 * dpr + dpr); o.fillStyle = '#ffe9a8'; o.fillText(m.label, x, y - r - 3 * dpr); }
      } else if (!m.small) {
        const cx = W / 2, cy = H / 2, a = Math.atan2(sy(m.y) - cy, sx(m.x) - cx);
        const ex = cx + Math.cos(a) * (W / 2 - 40 * dpr), ey = cy + Math.sin(a) * (H / 2 - 40 * dpr);
        const px = clamp(ex, 40 * dpr, W - 40 * dpr), py = clamp(ey, 90 * dpr, H - 120 * dpr);
        o.save(); o.translate(px, py); o.rotate(a);
        o.fillStyle = markerColor(m); o.strokeStyle = '#2a1608'; o.lineWidth = 2 * dpr;
        o.beginPath(); o.moveTo(14 * dpr, 0); o.lineTo(-8 * dpr, -9 * dpr); o.lineTo(-3 * dpr, 0); o.lineTo(-8 * dpr, 9 * dpr); o.closePath(); o.fill(); o.stroke();
        o.restore();
        const dm = Math.round(dist(G.player.x, G.player.y, m.x, m.y) / TS * 2);
        o.font = `bold ${Math.round(11 * dpr)}px Georgia`; o.fillStyle = 'rgba(0,0,0,.7)'; o.fillText(`${dm} yd`, px + dpr, py + 24 * dpr); o.fillStyle = '#ffe9a8'; o.fillText(`${dm} yd`, px, py + 23 * dpr);
      }
    }
    // revealed treasure markers in world
    for (const tr of World.treasures) if (G.world.treasuresRevealed.includes(tr.id) && !G.world.treasuresFound.includes(tr.id) && Game.onScreen(tr.x, tr.y, 0)) {
      o.strokeStyle = '#c01010'; o.lineWidth = 3 * dpr; const x = sx(tr.x), y = sy(tr.y - 12) + Math.sin(t * 3) * 2 * dpr, r = 6 * dpr;
      o.beginPath(); o.moveTo(x - r, y - r); o.lineTo(x + r, y + r); o.moveTo(x + r, y - r); o.lineTo(x - r, y + r); o.stroke();
    }
    // crosshair
    const P = G.player;
    if (!this.modal && !P.dead) {
      const mx = Input.mouse.x * dpr, my = Input.mouse.y * dpr, w = WEAPONS[P.cur];
      let spread = w.melee ? 3 : (w.spread * 220 + 4);
      if (P.moving) spread *= 1.5; if (P.mounted) spread *= 1.3; if (Input.mouse.rdown) spread *= 0.55;
      if (Combat.nervesOn) spread *= 0.4;
      spread *= 1 - P.steady * 0.6;                      // tightens as a precise shot lines up
      spread = spread * dpr + G.cam.kick * 3 * dpr;
      const precise = P.steady >= 1;
      o.strokeStyle = P.reload ? 'rgba(255,200,120,.9)' : precise ? '#ffd23a' : 'rgba(255,245,220,.95)'; o.lineWidth = (precise ? 3 : 2) * dpr;
      o.shadowColor = 'rgba(0,0,0,.8)'; o.shadowBlur = 3 * dpr;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; o.beginPath(); o.moveTo(mx + Math.cos(a) * spread, my + Math.sin(a) * spread); o.lineTo(mx + Math.cos(a) * (spread + 7 * dpr), my + Math.sin(a) * (spread + 7 * dpr)); o.stroke(); }
      o.fillStyle = precise ? '#ffd23a' : '#fff'; o.fillRect(mx - dpr, my - dpr, 2 * dpr, 2 * dpr);
      if (P.steady > 0 && !precise && !w.melee) { o.strokeStyle = 'rgba(255,210,58,.6)'; o.lineWidth = 2 * dpr; o.beginPath(); o.arc(mx, my, 22 * dpr, -Math.PI / 2, -Math.PI / 2 + TAU * P.steady); o.stroke(); }
      o.shadowBlur = 0;
      // hit marker
      const hm = Combat.hit;
      if (hm.t > 0) {
        const k = hm.t / 0.22, r1 = 6 * dpr, r2 = (12 + (1 - k) * 4) * dpr;
        o.strokeStyle = hm.kill ? `rgba(255,60,40,${k})` : hm.crit ? `rgba(255,210,58,${k})` : `rgba(255,255,255,${k})`; o.lineWidth = (hm.kill ? 3 : 2) * dpr;
        for (let i = 0; i < 4; i++) { const a = Math.PI / 4 + i * Math.PI / 2; o.beginPath(); o.moveTo(mx + Math.cos(a) * r1, my + Math.sin(a) * r1); o.lineTo(mx + Math.cos(a) * r2, my + Math.sin(a) * r2); o.stroke(); }
      }
      if (P.reload) { const r = P.reload, rw = WEAPONS[r.key]; o.strokeStyle = '#ffcf6a'; o.lineWidth = 3 * dpr; o.beginPath(); o.arc(mx, my, 16 * dpr, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - r.t / ((rw.reloadTime + 0.25) * P.reloadMul()))); o.stroke(); }
    }
    // arrest countdown
    const ar = Law.arrest;
    if (ar && ar.by && !ar.by.dead) { o.font = `bold ${Math.round(14 * dpr)}px Georgia`; o.fillStyle = '#ffcf6a'; o.fillText('UNDER ARREST', sx(P.x), sy(P.y - 30)); }
  },

  roundRect(o, x, y, w, h, r) { o.beginPath(); o.moveTo(x + r, y); o.arcTo(x + w, y, x + w, y + h, r); o.arcTo(x + w, y + h, x, y + h, r); o.arcTo(x, y + h, x, y, r); o.arcTo(x, y, x + w, y, r); o.closePath(); }
};

/* ---------------- desktop app updates ----------------
 * The Electron app checks GitHub for a newer version, downloads it in the
 * background and tells the player here. Clicking "Restart & update" saves
 * (when allowed) and installs it; "Later" installs it the next time they quit. */
const Updates = {
  state: null, dismissed: null, announced: null,
  init() {
    const d = window.ocDesktop;
    if (!d || !d.onUpdate) return;
    d.getVersion().then(v => { $('version').textContent = 'v' + v; });
    d.getUpdate().then(s => { if (s) this.show(s); });
    d.onUpdate(s => this.show(s));
  },
  show(s) {
    this.state = s;
    const el = $('update'), key = s.state + s.version;
    if (this.dismissed === key || (s.state === 'downloading' && this.dismissed === 'downloading' + s.version)) return;
    el.classList.remove('hidden');
    el.classList.toggle('ready', s.state === 'ready');
    const bar = el.querySelector('.upd-bar'), act = $('upd-actions');
    act.innerHTML = '';
    bar.classList.toggle('hidden', s.state !== 'downloading');
    const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = 'btn small ' + cls; b.textContent = label; b.onclick = e => { e.stopPropagation(); Sound.play('ui'); fn(); }; act.append(b); };
    if (s.state === 'downloading') {
      $('upd-text').innerHTML = `<b>Update v${esc(s.version)}</b> found — downloading in the background… ${s.percent || 0}%`;
      $('upd-fill').style.width = (s.percent || 0) + '%';
      btn('Hide', 'ghost', () => { this.dismissed = 'downloading' + s.version; el.classList.add('hidden'); });
    } else if (s.state === 'ready') {
      $('upd-text').innerHTML = `<b>Update v${esc(s.version)} is ready!</b><br>Restart the game to install it. Your saves are kept.`;
      btn('Restart & update', '', () => this.install());
      btn('Later', 'ghost', () => { this.dismissed = key; el.classList.add('hidden'); UI.notify('The update will install the next time you quit the game.', 'info'); });
      if (this.announced !== s.version && G.state === 'play') { this.announced = s.version; UI.notify(`Update v${s.version} is ready — restart to install it.`, 'mission'); }
    } else if (s.state === 'available') {
      $('upd-text').innerHTML = `<b>Update v${esc(s.version)} is available.</b><br>This portable copy can't update itself — get the new version from the website.`;
      btn('Get the update', '', () => window.ocDesktop.openDownloadPage());
      btn('Later', 'ghost', () => { this.dismissed = key; el.classList.add('hidden'); });
    } else if (s.state === 'error') {
      $('upd-text').innerHTML = `<b>Update v${esc(s.version)}</b> couldn't finish downloading. It will try again later.`;
      btn('OK', 'ghost', () => { this.dismissed = key; el.classList.add('hidden'); });
    }
  },
  install() {
    if (G.state === 'play') {
      const err = SaveSys.save('auto');
      if (err && !confirm(`${err}\nUpdate anyway? Progress since your last save will be lost.`)) return;
    }
    $('upd-text').innerHTML = '<b>Installing the update…</b> The game will reopen in a moment.';
    $('upd-actions').innerHTML = '';
    window.ocDesktop.installUpdate();
  }
};
