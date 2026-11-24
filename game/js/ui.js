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
      btn.textContent = e.reason || (e.noCharge ? 'Pay' : 'Buy'); btn.disabled = !e.can;
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
    $('inv-ammo').innerHTML = Object.keys(AMMO).map(a => `<div><b>${P.ammo[a]}</b> ${AMMO[a].name} <small>(max ${AMMO[a].max})</small></div>`).join('');
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
      ['Accuracy', s.shots ? Math.round(s.hits / s.shots * 100) + '%' : '—'], ['Animals hunted', s.hunted], ['Treasures', `${G.world.treasuresFound.length}/${World.treasures.length}`], ['Money earned', formatMoney(s.earned)], ['Deaths', s.deaths]
    ].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('');
    $('inv-missions').innerHTML = MissionSys.list.map(m => `<li class="${MissionSys.completed.includes(m.id) ? 'done' : (MissionSys.active === m ? 'active' : '')}">${esc(m.title)}</li>`).join('');
  },

  /* ---------------- map ---------------- */
  toggleMap() {
    if (this.modal === 'map') { this.closeAll(); return; }
    if (this.modal) return;
    this.show('mapview'); this.modal = 'map'; this.renderMap();
  },
  renderMap() {
    const c = $('map-canvas'), W = World.W, H = World.H;
    const sc = Math.max(1, Math.floor(Math.min((innerWidth - 120) / W, (innerHeight - 200) / H) * 2) / 2);
    c.width = W * sc; c.height = H * sc;
    const g = c.getContext('2d');
    g.imageSmoothingEnabled = false;
    g.drawImage(World.minimap, 0, 0, W * sc, H * sc);
    g.fillStyle = 'rgba(230,205,160,0.18)'; g.fillRect(0, 0, c.width, c.height);
    const P = G.player, px = v => v / TS * sc;
    g.font = `bold ${Math.max(10, sc * 4)}px Georgia, serif`; g.textAlign = 'center';
    const label = (t, x, y, col = '#2a1a0e') => { g.fillStyle = 'rgba(240,225,190,.75)'; const w = g.measureText(t).width; g.fillRect(x - w / 2 - 3, y - sc * 4, w + 6, sc * 5); g.fillStyle = col; g.fillText(t, x, y); };
    for (const t of World.towns) label(t.name, px((t.x0 + t.x1) / 2 * TS), px(t.y0 * TS) - 4);
    if (MissionSys.flags.hideout) label('Hollister Camp', px(World.poi.hideout.x), px(World.poi.hideout.y) - sc * 22);
    label("Marshal's Camp", px(World.poi.marshalCamp.x), px(World.poi.marshalCamp.y) - sc * 9, '#4a2a1a');
    for (const cp of World.banditCamps) { g.fillStyle = '#8a1a1a'; g.beginPath(); g.arc(px(cp.x), px(cp.y), sc * 2.5, 0, TAU); g.fill(); label(cp.name, px(cp.x), px(cp.y) - sc * 4, '#7a1a1a'); }
    label('Pinewood Forest', px(60 * TS), px(30 * TS), '#2a3a1a'); label('Red Sand Desert', px(220 * TS), px(200 * TS), '#6a3a1a'); label('Coyote Plains', px(60 * TS), px(180 * TS), '#3a3a1a');
    for (const t of World.treasures) {
      if (!G.world.treasuresRevealed.includes(t.id) || G.world.treasuresFound.includes(t.id)) continue;
      g.strokeStyle = '#a01010'; g.lineWidth = Math.max(2, sc); const x = px(t.x), y = px(t.y), r = sc * 3;
      g.beginPath(); g.moveTo(x - r, y - r); g.lineTo(x + r, y + r); g.moveTo(x + r, y - r); g.lineTo(x - r, y + r); g.stroke();
    }
    for (const m of MissionSys.markers()) { g.fillStyle = m.kind === 'giver' ? '#e8b830' : '#f0d040'; g.strokeStyle = '#2a1a0e'; g.lineWidth = 2; g.beginPath(); g.arc(px(m.x), px(m.y), sc * 3, 0, TAU); g.fill(); g.stroke(); }
    if (P.horse && !P.horse.dead && !P.horse.rider) { g.fillStyle = '#6a3a1a'; g.fillRect(px(P.horse.x) - sc * 1.5, px(P.horse.y) - sc * 1.5, sc * 3, sc * 3); }
    g.save(); g.translate(px(P.x), px(P.y)); g.rotate(P.face); g.fillStyle = '#fff'; g.strokeStyle = '#000'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(sc * 5, 0); g.lineTo(-sc * 3, -sc * 3); g.lineTo(-sc * 1.5, 0); g.lineTo(-sc * 3, sc * 3); g.closePath(); g.fill(); g.stroke(); g.restore();
    $('map-info').textContent = `${G.region} · Day ${Env.day()} · ${Env.clock()}`;
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
      row.innerHTML = `<div class="r-main"><div><b>${s.slot === 'auto' ? 'Autosave' : 'Slot ' + s.slot}</b><small>${m ? `Day ${m.day} · ${esc(m.region)} · ${formatMoney(m.money)} · ${m.missions}/5 missions · ${new Date(m.savedAt).toLocaleString()}` : 'Empty'}</small></div></div>`;
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
    for (const m of MissionSys.markers()) {
      let [x, y] = toM(m.x, m.y);
      const out = x < 6 || y < 6 || x > S - 6 || y > S - 6;
      x = clamp(x, 6, S - 6); y = clamp(y, 6, S - 6);
      g.fillStyle = m.kind === 'giver' ? '#ffcf40' : '#f8e050'; g.strokeStyle = '#2a1a0a'; g.lineWidth = 1.5;
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
      if (a.downed > 0) { o.fillStyle = '#ffb04a'; o.fillText('WOUNDED', sx(a.x), sy(a.y - 18)); }
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
    for (const m of MissionSys.markers()) {
      const on = Game.onScreen(m.x, m.y, -10);
      if (on) {
        const bob = Math.sin(t * 4) * 3 * dpr, x = sx(m.x), y = sy(m.y) + bob;
        const r = (m.small ? 5 : 8) * dpr;
        o.fillStyle = m.kind === 'giver' ? '#ffcf40' : '#f8e050'; o.strokeStyle = '#2a1608'; o.lineWidth = 2 * dpr;
        o.beginPath(); o.moveTo(x, y - r); o.lineTo(x + r * 0.8, y); o.lineTo(x, y + r); o.lineTo(x - r * 0.8, y); o.closePath(); o.fill(); o.stroke();
        if (m.kind === 'giver') { o.fillStyle = '#2a1608'; o.font = `bold ${Math.round(11 * dpr)}px Georgia`; o.fillText('!', x, y + 5 * dpr); }
        if (m.label && !(m.kind === 'giver' && dist(m.x, m.y, G.player.x, G.player.y) < 100)) { o.font = `bold ${Math.round(12 * dpr)}px Georgia, serif`; o.fillStyle = 'rgba(0,0,0,.7)'; o.fillText(m.label, x + dpr, y - r - 3 * dpr + dpr); o.fillStyle = '#ffe9a8'; o.fillText(m.label, x, y - r - 3 * dpr); }
      } else if (!m.small) {
        const cx = W / 2, cy = H / 2, a = Math.atan2(sy(m.y) - cy, sx(m.x) - cx);
        const ex = cx + Math.cos(a) * (W / 2 - 40 * dpr), ey = cy + Math.sin(a) * (H / 2 - 40 * dpr);
        const px = clamp(ex, 40 * dpr, W - 40 * dpr), py = clamp(ey, 90 * dpr, H - 120 * dpr);
        o.save(); o.translate(px, py); o.rotate(a);
        o.fillStyle = m.kind === 'giver' ? '#ffcf40' : '#f8e050'; o.strokeStyle = '#2a1608'; o.lineWidth = 2 * dpr;
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
      spread = spread * dpr + G.cam.kick * 3 * dpr;
      o.strokeStyle = P.reload ? 'rgba(255,200,120,.9)' : 'rgba(255,245,220,.95)'; o.lineWidth = 2 * dpr;
      o.shadowColor = 'rgba(0,0,0,.8)'; o.shadowBlur = 3 * dpr;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; o.beginPath(); o.moveTo(mx + Math.cos(a) * spread, my + Math.sin(a) * spread); o.lineTo(mx + Math.cos(a) * (spread + 7 * dpr), my + Math.sin(a) * (spread + 7 * dpr)); o.stroke(); }
      o.fillStyle = '#fff'; o.fillRect(mx - dpr, my - dpr, 2 * dpr, 2 * dpr);
      o.shadowBlur = 0;
      if (P.reload) { const r = P.reload, rw = WEAPONS[r.key]; o.strokeStyle = '#ffcf6a'; o.lineWidth = 3 * dpr; o.beginPath(); o.arc(mx, my, 16 * dpr, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - r.t / (rw.reloadTime + 0.25))); o.stroke(); }
    }
    // arrest countdown
    const ar = Law.arrest;
    if (ar && ar.by && !ar.by.dead) { o.font = `bold ${Math.round(14 * dpr)}px Georgia`; o.fillStyle = '#ffcf6a'; o.fillText('UNDER ARREST', sx(P.x), sy(P.y - 30)); }
  },

  roundRect(o, x, y, w, h, r) { o.beginPath(); o.moveTo(x + r, y); o.arcTo(x + w, y, x + w, y + h, r); o.arcTo(x + w, y + h, x, y + h, r); o.arcTo(x, y + h, x, y, r); o.arcTo(x, y, x + w, y, r); o.closePath(); }
};
