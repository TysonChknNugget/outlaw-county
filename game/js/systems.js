/* Outlaw County — systems.js
 * Environment (time, weather, lighting), the law & bounty system, economy,
 * interactions/robberies, and the population spawner.
 */
'use strict';

/* ============================================================ environment */
const Env = {
  weather: 'clear', weatherT: 240, wind: 0.2, rain: 0, dust: 0, cloud: 0, flash: 0, lightningT: 10,
  target: { wind: 0.2, rain: 0, dust: 0, cloud: 0 },
  glow: null, warm: null,
  init() {
    const mk = (r, stops) => {
      const c = document.createElement('canvas'); c.width = c.height = r * 2;
      const g = c.getContext('2d'), gr = g.createRadialGradient(r, r, 0, r, r, r);
      stops.forEach(([o, col]) => gr.addColorStop(o, col)); g.fillStyle = gr; g.fillRect(0, 0, r * 2, r * 2); return c;
    };
    this.glow = mk(64, [[0, 'rgba(255,255,255,1)'], [0.45, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
    this.warm = mk(64, [[0, 'rgba(255,170,80,0.9)'], [0.5, 'rgba(255,120,40,0.35)'], [1, 'rgba(255,100,20,0)']]);
  },
  hour() { return (G.time / 60) % 24; },
  day() { return Math.floor(G.time / 1440) + 1; },
  isNight() { const h = this.hour(); return h >= 20.5 || h < 5.5; },
  clock() { const h = Math.floor(this.hour()), m = Math.floor(G.time % 60); return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`; },
  darkness() {
    const h = this.hour();
    let d;
    if (h >= 7 && h < 18) d = 0;
    else if (h >= 18 && h < 21) d = (h - 18) / 3;
    else if (h >= 21 || h < 4.5) d = 1;
    else d = 1 - (h - 4.5) / 2.5;
    return clamp(d * 0.74 + this.cloud * 0.12 + this.rain * 0.1 + this.dust * 0.08, 0, 0.82);
  },
  sunset() { const h = this.hour(); if (h > 16.5 && h < 20.5) return Math.sin((h - 16.5) / 4 * Math.PI) * 0.22; if (h > 5 && h < 7.5) return Math.sin((h - 5) / 2.5 * Math.PI) * 0.16; return 0; },
  visionMul() { return (this.isNight() ? 0.62 : 1) * (1 - this.rain * 0.2) * (1 - this.dust * 0.4); },
  setWeather(w) {
    this.weather = w;
    this.target = { clear: { wind: 0.2, rain: 0, dust: 0, cloud: 0 }, cloudy: { wind: 0.4, rain: 0, dust: 0, cloud: 1 }, rain: { wind: 0.5, rain: 1, dust: 0, cloud: 1 }, storm: { wind: 0.8, rain: 1, dust: 0, cloud: 1.3 }, dust: { wind: 1, rain: 0, dust: 1, cloud: 0.3 } }[w];
  },
  update(dt) {
    G.time += dt * G.timeScale;
    this.weatherT -= dt;
    if (this.weatherT <= 0) {
      const r = Math.random();
      this.setWeather(r < 0.5 ? 'clear' : r < 0.68 ? 'cloudy' : r < 0.82 ? 'rain' : r < 0.9 ? 'storm' : 'dust');
      this.weatherT = rand(150, 320);
      if (this.weather !== 'clear') UI.notify({ cloudy: 'Clouds roll in over the county.', rain: 'Rain begins to fall.', storm: 'A thunderstorm is brewing.', dust: 'A dust storm sweeps across the county.' }[this.weather], 'info');
    }
    const k = Math.min(1, dt * 0.15);
    for (const key of ['wind', 'rain', 'dust', 'cloud']) this[key] += (this.target[key] - this[key]) * k;
    // the desert is dry: rain thins out there
    this.flash = Math.max(0, this.flash - dt * 3);
    if (this.weather === 'storm') {
      this.lightningT -= dt;
      if (this.lightningT <= 0) { this.lightningT = rand(6, 16); this.flash = 1; setTimeout(() => Sound.play('thunder'), rand(300, 1500)); }
    }
    Sound.setAmbience(this.wind + this.dust, this.rain);
    if (this.isNight() && chance(dt * 0.02)) Sound.play('howl', G.player.x + rand(-500, 500), G.player.y + rand(-500, 500), 0.6);
  },
  drawWeather(ctx, vw, vh, t) {
    if (this.rain > 0.02) {
      const n = Math.floor(260 * this.rain);
      ctx.strokeStyle = 'rgba(190,205,225,0.45)'; ctx.lineWidth = 1; ctx.beginPath();
      const wx = this.wind * 90;
      for (let i = 0; i < n; i++) {
        const x = ((hash2(i, 1) * (vw + 100) + t * wx) % (vw + 100)) - 50, y = (hash2(i, 2) * vh + t * (360 + hash2(i, 3) * 140)) % vh;
        ctx.moveTo(x, y); ctx.lineTo(x - wx * 0.05, y - 7);
      }
      ctx.stroke();
    }
    if (this.dust > 0.02) {
      ctx.fillStyle = `rgba(170,128,80,${0.32 * this.dust})`; ctx.fillRect(0, 0, vw, vh);
      ctx.fillStyle = `rgba(200,160,110,${0.5 * this.dust})`;
      for (let i = 0; i < 160 * this.dust; i++) {
        const x = (hash2(i, 5) * vw * 1.2 + t * (240 + hash2(i, 6) * 160)) % (vw * 1.2) - vw * 0.1, y = (hash2(i, 7) * vh + Math.sin(t + i) * 6) % vh;
        ctx.fillRect(x, y, 3 + hash2(i, 8) * 5, 1);
      }
    }
    if (this.flash > 0) { ctx.fillStyle = `rgba(230,235,255,${this.flash * 0.45})`; ctx.fillRect(0, 0, vw, vh); }
  },
  drawLighting(ctx, lc, camX, camY, vw, vh, t) {
    const dark = this.darkness();
    const sun = this.sunset();
    if (sun > 0.01) { ctx.globalCompositeOperation = 'soft-light'; ctx.fillStyle = `rgba(255,120,40,${sun * 2.2})`; ctx.fillRect(0, 0, vw, vh); ctx.globalCompositeOperation = 'source-over'; }
    if (dark < 0.02) return;
    const l = lc.getContext('2d');
    if (lc.width !== vw || lc.height !== vh) { lc.width = vw; lc.height = vh; }
    l.globalCompositeOperation = 'source-over';
    l.clearRect(0, 0, vw, vh);
    l.fillStyle = `rgba(10,12,34,${dark})`; l.fillRect(0, 0, vw, vh);
    l.globalCompositeOperation = 'destination-out';
    const hr = this.hour(), lampsOn = hr >= 18.5 || hr < 6.5;
    const warmList = [];
    const put = (x, y, r, a = 1) => { l.globalAlpha = a; l.drawImage(this.glow, x - camX - r, y - camY - r, r * 2, r * 2); };
    for (const L of World.lights) {
      if (L.x < camX - L.r || L.x > camX + vw + L.r || L.y < camY - L.r || L.y > camY + vh + L.r) continue;
      if (L.c === 'fire') { const r = L.r * (1 + Math.sin(t * 13 + L.x) * 0.05 + Math.sin(t * 7.3) * 0.04); put(L.x, L.y, r); warmList.push([L.x, L.y, r * 0.8]); }
      else if (L.c === 'lamp' && lampsOn) { put(L.x, L.y, L.r); warmList.push([L.x, L.y, L.r * 0.6]); }
      else if (L.c === 'window' && lampsOn && (hr < 23.5 && hr > 17 || L.building.type === 'saloon' || L.building.type === 'hotel')) { put(L.x, L.y, L.r, 0.8); }
    }
    for (const tl of G.tempLights) { put(tl.x, tl.y, tl.r, tl.life / tl.max); warmList.push([tl.x, tl.y, tl.r * 0.7]); }
    if (G.train && G.train.state !== 'wait') { put(G.train.x + 40, G.train.y - 10, 90, 0.9); }
    const P = G.player;
    put(P.x, P.y - 8, 70, 0.55);
    l.globalAlpha = 1; l.globalCompositeOperation = 'source-over';
    ctx.drawImage(lc, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    for (const [x, y, r] of warmList) { ctx.globalAlpha = dark * 0.5; ctx.drawImage(this.warm, x - camX - r, y - camY - r, r * 2, r * 2); }
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  }
};

/* ============================================================ law & bounty */
const Law = {
  bounty: 0, heat: 0, lastSeen: { x: 0, y: 0 }, searchT: 0, state: 'calm', backupT: 6, arrest: null,
  recognizeT: 0, seenNow: false, escalate: 0, gunfireCD: 0, backupNotified: false,
  reset() { Object.assign(this, { bounty: 0, heat: 0, searchT: 0, state: 'calm', backupT: 6, arrest: null, recognizeT: 0, seenNow: false, escalate: 0, gunfireCD: 0 }); },
  searchTime() { return 16 + this.heat * 7; },

  commit(type, x, y, o = {}) {
    if (o.reported) { this.report(type, x, y); return; }
    for (const a of G.actors) {
      if (a.faction !== 'law' || a.dead || a.inside || a === o.victim) continue;
      if (dist(a.x, a.y, x, y) < 300 * Env.visionMul() + 40 && World.los(a.x, a.y - 8, x, y - 8, SOL.VIS)) { this.report(type, x, y); return; }
    }
    let witnesses = 0;
    for (const a of G.actors) {
      if (a.faction !== 'civ' || a.dead || a.inside || a === o.victim) continue;
      if (dist(a.x, a.y, x, y) < 230 * Env.visionMul() + 30 && World.los(a.x, a.y - 8, x, y - 8, SOL.VIS)) {
        if (a.kind === 'clerk') { this.report(type, x, y); return; }
        a.witness = { crime: type, x, y, t: rand(7, 12) };
        a.state = 'report'; a.bark(BARKS.civFlee); witnesses++;
      }
    }
    if (witnesses) UI.notify(`${witnesses} witness${witnesses > 1 ? 'es' : ''} saw the ${CRIMES[type].label.toLowerCase()}. Stop them before they reach the law.`, 'warn');
  },

  report(type, x, y) {
    const c = CRIMES[type];
    this.bounty += c.bounty;
    let nh = Math.max(this.heat, c.heat);
    if (this.heat > 0 && c.heat >= 2) { this.escalate++; if (this.escalate >= 3) { this.escalate = 0; nh = Math.min(5, nh + 1); } }
    if (nh > this.heat) { Sound.play('wanted'); if (this.heat === 0) this.backupNotified = false; }
    this.heat = nh;
    this.lastSeen = { x, y }; this.searchT = this.searchTime(); this.state = 'pursuit'; this.backupT = Math.min(this.backupT, 5);
    if (this.arrest && nh >= 2) this.arrest = null;
    UI.notify(`Crime reported: ${c.label} — bounty +$${c.bounty}`, 'crime');
    for (const a of G.actors) if (a.faction === 'law' && !a.dead && dist(a.x, a.y, x, y) < 1100) a.engaged = true;
    G.stats.crimes++;
  },

  spotted() {
    if (this.heat === 0) return;
    this.lastSeen = { x: G.player.x, y: G.player.y };
    this.seenNow = true;
  },

  playerAttacked(v, killed) {
    if (v.faction === 'civ') {
      if (killed) this.commit('murder', v.x, v.y, { victim: v });
      else if (!v.assaulted) { v.assaulted = true; this.commit('assault', v.x, v.y, { victim: v }); if (!v.dead && v.kind !== 'clerk') v.witness = { crime: 'assault', x: v.x, y: v.y, t: rand(8, 12) }; }
    } else if (v.faction === 'law') {
      if (killed) this.commit('kill_law', v.x, v.y, { victim: v });
      else if (!v.assaulted) { v.assaulted = true; this.report('assault_law', v.x, v.y); }
      else if (this.heat > 0) this.lastSeen = { x: G.player.x, y: G.player.y };
    }
  },

  gunfire(x, y, shooter) {
    for (const a of G.actors) {
      if (a === shooter || a.dead) continue;
      const d = dist(a.x, a.y, x, y);
      if (d < 320) a.onGunfire(x, y, d);
    }
    for (const an of G.animals) if (dist(an.x, an.y, x, y) < 320) an.onGunfire(x, y);
    for (const h of G.horses) if (h.owner === 'wild' && !h.rider && dist(h.x, h.y, x, y) < 300) h.fleeT = 4;
    if (shooter === G.player && this.heat === 0 && this.gunfireCD <= 0 && World.townAt(x, y)) {
      const threat = G.actors.some(a => !a.dead && ((a.faction === 'rival' && a.aggro) || a.forceHostile) && dist(a.x, a.y, x, y) < 400);
      if (!threat) { this.gunfireCD = 8; this.commit('gunfire', x, y); }
    }
  },

  recognize(lawman, dt) {
    this.recognizeT += dt;
    if (this.recognizeT > 2.2) {
      this.recognizeT = 0;
      lawman.bark("Hold it! You're the one on the wanted poster!", true);
      this.heat = this.bounty >= 400 ? 2 : 1; this.lastSeen = { x: G.player.x, y: G.player.y }; this.searchT = this.searchTime(); this.state = 'pursuit';
      lawman.engaged = true; Sound.play('wanted');
      UI.notify(`A lawman recognized you from your $${this.bounty} wanted poster!`, 'crime');
    }
  },

  arrestAttempt(lawman, dt) {
    if (this.heat !== 1) return;
    if (!this.arrest) { this.arrest = { by: lawman, t: 0, surrendering: false, sT: 0 }; UI.notify("You're under arrest! Press E to surrender — or run for it.", 'warn'); }
    this.arrest.by = lawman;
  },

  surrender() { if (this.arrest) { this.arrest.surrendering = true; this.arrest.sT = 0; } },

  update(dt) {
    const P = G.player;
    this.gunfireCD -= dt;
    if (this.heat > 0 && !P.dead) {
      if (this.seenNow) { this.state = 'pursuit'; this.searchT = this.searchTime(); }
      else {
        this.state = 'search';
        let rate = 1;
        if (dist(P.x, P.y, this.lastSeen.x, this.lastSeen.y) > 600) rate *= 2;
        if (P.hidden || P.inBuilding) rate *= 1.6;
        this.searchT -= dt * rate;
        if (this.searchT <= 0) this.clearHeat('escaped');
      }
      this.backupT -= dt;
      if (this.backupT <= 0 && this.state === 'pursuit') { this.backupT = Math.max(7, 17 - this.heat * 2); this.spawnBackup(); }
    }
    this.seenNow = false;
    const ar = this.arrest;
    if (ar) {
      const law = ar.by;
      if (!law || law.dead || this.heat !== 1 || P.dead) { this.arrest = null; }
      else {
        const d = dist(law.x, law.y, P.x, P.y);
        ar.t += dt;
        if (ar.surrendering) { ar.sT += dt; if (ar.sT > 1.8) this.doArrest(); }
        else if (d > 110 && ar.t > 1.5) {
          this.arrest = null; law.bark("Stop! You're resisting arrest!", true);
          this.report('resisting', P.x, P.y); this.heat = Math.max(this.heat, 2);
        } else if (d < 34 && ar.t > 7) this.doArrest();
      }
    }
    Sound.setTension(this.heat >= 2 ? 1 : 0);
  },

  doArrest() {
    const P = G.player;
    const paid = Math.min(P.money, this.bounty);
    P.money -= paid;
    const town = World.townAt(P.x, P.y) || World.towns.find(t => t.name === 'Dustwater');
    const door = town.name === 'Mesa Flats' ? World.poi.mfSheriffDoor : World.poi.dwSheriffDoor;
    if (P.mounted) P.dismount(false);
    P.x = door.x; P.y = door.y + 6;
    G.time += 8 * 60;
    this.bounty = 0; this.clearHeat('arrested');
    P.hp = Math.max(P.hp, 60);
    UI.notify(`Arrested! You paid $${paid} toward your bounty and spent the night in jail. Your record is clean.`, 'bad');
    MissionSys.fail('You were arrested.');
    UI.fade(1.2);
  },

  clearHeat(reason) {
    this.heat = 0; this.state = 'calm'; this.arrest = null; this.escalate = 0; this.searchT = 0;
    for (const a of G.actors) if (a.faction === 'law') { a.engaged = false; a.target = null; if (!a.mission) a.forceHostile = false; }
    if (reason === 'escaped') { UI.notify('You lost the law. The search has been called off.', 'good'); MissionSys.event('escaped'); }
  },

  spawnBackup() {
    const P = G.player;
    let near = 0;
    for (const a of G.actors) if (a.faction === 'law' && !a.dead && !a.inside && dist(a.x, a.y, P.x, P.y) < 700) near++;
    const max = this.heat * 2 + 1;
    if (near >= max) return;
    const n = Math.min(max - near, this.heat >= 3 ? 2 : 1);
    const mounted = this.heat >= 3 || !!P.mounted;
    for (let i = 0; i < n; i++) {
      const sp = World.randomOpenNear(P.x, P.y, 280, 420, (x, y) => Game.onScreen(x, y, 10) || World.tileAtPx(x, y) === T.FLOOR);
      if (!sp) continue;
      const kind = this.heat >= 4 ? 'marshal' : 'lawman';
      const a = spawnActor(kind, sp.x, sp.y, { temp: true, weapon: pick(['repeater', 'sa', 'shotgun', 'lever']) });
      a.engaged = true;
      if (mounted) a.mounted = new Horse(pick(['morgan', 'quarter', 'mustang']), sp.x, sp.y, { owner: 'law' });
    }
    if (!this.backupNotified) { this.backupNotified = true; UI.notify(mounted ? 'A posse is riding in!' : 'Lawmen called for reinforcements!', 'crime'); }
  },

  payOff() {
    const P = G.player;
    if (this.bounty <= 0) return 'You have no bounty.';
    if (this.heat > 0) return 'Not while the law is hunting you.';
    if (P.money < this.bounty) return `You need $${this.bounty}.`;
    P.money -= this.bounty;
    UI.notify(`You paid off your $${this.bounty} bounty. Your record is clean.`, 'good');
    this.bounty = 0;
    Sound.play('coin');
    return null;
  }
};

/* ============================================================ economy */
const Economy = {
  addMoney(n, x, y) {
    G.player.money += n;
    if (n > 0) { Sound.play('coin'); Floaters.add(x !== undefined ? x : G.player.x, (y !== undefined ? y : G.player.y) - 24, '+$' + n, '#f0d060'); G.stats.earned += n; }
  },
  addItem(id, n = 1) {
    const inv = G.player.inv;
    inv[id] = (inv[id] || 0) + n;
    Floaters.add(G.player.x, G.player.y - 30, `+${n} ${ITEMS[id].name}`, '#d8e8c0');
    Sound.play('pickup');
  },
  useItem(id) {
    const P = G.player, inv = P.inv, it = ITEMS[id];
    if (!inv[id]) { if (id === 'bandage') Floaters.add(P.x, P.y - 22, 'No bandages', '#ff9a7a'); return false; }
    if (it.horse) {
      const h = P.mounted || (P.horse && !P.horse.dead && dist(P.horse.x, P.horse.y, P.x, P.y) < 50 ? P.horse : null);
      if (!h) { UI.notify('Your horse needs to be close by.', 'info'); return false; }
      h.hp = Math.min(h.maxHp, h.hp + it.horse); h.stamina = h.maxSt; h.exhausted = false;
      Floaters.add(h.x, h.y - 26, h.name + ' is refreshed', '#d8e8c0');
    } else if (it.type === 'use') {
      if (P.hp >= P.maxHp && !it.stamina) { Floaters.add(P.x, P.y - 22, 'Already at full health', '#ffd27a'); return false; }
      P.hp = Math.min(P.maxHp, P.hp + it.heal);
      if (it.stamina) P.stamina = 100;
      Floaters.add(P.x, P.y - 22, '+' + it.heal + ' health', '#9ae08a');
    } else if (it.type === 'map') {
      this.revealTreasure(); inv[id]--; return true;
    } else return false;
    inv[id]--;
    Sound.play('pickup');
    return true;
  },
  revealTreasure() {
    const w = G.world;
    const t = World.treasures.find(t => !w.treasuresFound.includes(t.id) && !w.treasuresRevealed.includes(t.id));
    if (!t) { UI.notify('Every cache in the county is already marked or dug up.', 'info'); return false; }
    w.treasuresRevealed.push(t.id);
    UI.notify(`Treasure marked on your map: ${t.name}.`, 'good');
    return true;
  },
  closed(shop) {
    if (Law.heat > 0 && shop.type !== 'fence') return 'Get out! The law is looking for you!';
    const until = G.world.robbed[shop.id];
    if (until && G.time < until && shop.type !== 'fence' && shop.type !== 'sheriff') return "You've got some nerve coming back here after robbing me!";
    return null;
  },
  entries(shopId) {
    const shop = Object.assign({ id: shopId }, SHOPS[shopId]), stock = SHOP_STOCK[shop.type], P = G.player, out = [];
    for (const s of stock.buy) {
      const [kind, key] = s.includes(':') ? s.split(':') : ['item', s];
      if (kind === 'item') {
        const it = ITEMS[key];
        out.push({ name: it.name, desc: it.desc, price: it.price, note: `Have ${P.inv[key] || 0}`, can: P.money >= it.price, buy: () => { P.money -= it.price; P.inv[key] = (P.inv[key] || 0) + 1; MissionSys.event('bought', key); } });
      } else if (kind === 'ammo') {
        const a = AMMO[key], have = P.ammo[key];
        out.push({ name: `${a.name} (box of ${a.box})`, desc: `Carry up to ${a.max}.`, price: a.price, note: `Have ${have}`, can: P.money >= a.price && have < a.max, reason: have >= a.max ? 'Full' : null, buy: () => { P.money -= a.price; P.ammo[key] = Math.min(a.max, have + a.box); MissionSys.event('bought', 'ammo:' + key); } });
      } else if (kind === 'weapon') {
        const w = WEAPONS[key];
        out.push({ name: w.name, desc: w.desc, price: w.price, weapon: key, note: P.owned[key] ? 'Owned' : `Dmg ${w.dmg}${w.pellets ? '×' + w.pellets : ''} · Cap ${w.cap}`, can: !P.owned[key] && P.money >= w.price, reason: P.owned[key] ? 'Owned' : null,
          buy: () => { P.money -= w.price; P.owned[key] = true; P.mag[key] = w.cap; if (P.ammo[w.ammo] < AMMO[w.ammo].box) P.ammo[w.ammo] = AMMO[w.ammo].box; P.select(key); UI.notify(`Purchased the ${w.name}. Press ${w.slot} to equip.`, 'good'); } });
      } else if (kind === 'horse') {
        const hb = HORSE_BREEDS[key];
        const trade = P.horse && !P.horse.dead ? Math.floor((P.horse.def.price || 30) * 0.4) : 0;
        const cost = Math.max(0, hb.price - trade);
        out.push({ name: hb.name, desc: `Speed ${hb.speed} · Sprint ${hb.sprint} · Stamina ${hb.stamina} · Health ${hb.hp}`, price: cost, note: trade ? `Includes $${trade} trade-in` : '', can: P.money >= cost && !(P.horse && P.horse.breed === key && !P.horse.dead && P.horse.def.price), reason: null,
          buy: () => { P.money -= cost; Economy.giveHorse(key); } });
      } else if (kind === 'service') {
        const sv = SERVICES[key];
        const e = { name: sv.name, desc: sv.desc, price: sv.price, can: P.money >= sv.price, buy: null };
        if (key === 'paybounty') { e.price = Law.bounty; e.note = Law.bounty ? `Bounty $${Law.bounty}` : 'No bounty'; e.can = Law.bounty > 0 && P.money >= Law.bounty; e.buy = () => { const err = Law.payOff(); if (err) UI.notify(err, 'info'); }; e.noCharge = true; }
        if (key === 'meal') e.buy = () => { P.money -= sv.price; P.hp = Math.min(P.maxHp, P.hp + 60); P.stamina = 100; };
        if (key === 'rumor') { e.can = e.can && World.treasures.some(t => !G.world.treasuresFound.includes(t.id) && !G.world.treasuresRevealed.includes(t.id)); e.reason = e.can ? null : 'No new rumors'; e.buy = () => { P.money -= sv.price; UI.notify('"Heard tell of a buried stash out yonder..."', 'info'); Economy.revealTreasure(); }; }
        if (key === 'sleep') e.buy = () => { P.money -= sv.price; UI.closeAll(); Game.sleep(); };
        if (key === 'groom') { e.can = e.can && P.horse && !P.horse.dead; e.reason = P.horse && !P.horse.dead ? null : 'No horse'; e.buy = () => { P.money -= sv.price; const h = P.horse; h.hp = h.maxHp; h.stamina = h.maxSt; if (!h.rider && dist(h.x, h.y, P.x, P.y) > 200) { h.x = World.poi.dwStables.x + 30; h.y = World.poi.dwStables.y + 10; } UI.notify(`${h.name} is groomed and rested.`, 'good'); }; }
        if (key === 'travel') {
          const toMesa = shopId === 'dw_station';
          e.name = `Ticket to ${toMesa ? 'Mesa Flats' : 'Dustwater'}`;
          e.buy = () => { P.money -= sv.price; UI.closeAll(); Game.travel(toMesa ? World.poi.mfStation : World.poi.dwStation); };
        }
        out.push(e);
      }
    }
    return out;
  },
  sellEntries(shopId) {
    const shop = SHOPS[shopId], stock = SHOP_STOCK[shop.type], P = G.player, out = [];
    const mul = stock.peltBonus || (shop.type === 'fence' ? 1 : 1);
    for (const id of ITEM_ORDER) {
      const it = ITEMS[id], n = P.inv[id] || 0;
      if (!n || !it.sell) continue;
      if (!stock.sells.includes(it.type)) continue;
      const price = Math.floor(it.sell * (it.type === 'pelt' ? mul : 1));
      out.push({ name: it.name, have: n, price, sell: () => { P.inv[id]--; P.money += price; G.stats.earned += price; } });
    }
    return out;
  },
  giveHorse(breed) {
    const P = G.player;
    if (P.horse && !P.horse.dead) {
      if (P.mounted === P.horse) P.dismount(false);
      const i = G.horses.indexOf(P.horse); if (i >= 0) G.horses.splice(i, 1);
    }
    const c = World.poi.dwStables;
    const sp = World.findOpen(c.x + 24, c.y + 8);
    const h = new Horse(breed, sp.x, sp.y, { owner: 'player' });
    h.saddle = true;
    G.horses.push(h); P.horse = h;
    UI.notify(`${h.name} the ${h.def.name} is waiting outside the stables. Press F to mount, H to call.`, 'good');
    return h;
  }
};

/* ============================================================ interactions */
const Interact = {
  action: null, prompt: null, fPrompt: null,
  begin(label, dur, onDone, o = {}) {
    const P = G.player;
    this.action = { label, t: 0, dur, x: P.x, y: P.y, onDone, sound: o.sound, soundT: 0, range: o.range || 26, onCancel: o.onCancel };
  },
  cancel() { if (this.action && this.action.onCancel) this.action.onCancel(); this.action = null; },
  update(dt) {
    const P = G.player;
    this.prompt = null; this.fPrompt = null;
    if (P.dead) { this.action = null; return; }
    const a = this.action;
    if (a) {
      a.t += dt;
      if (a.sound) { a.soundT -= dt; if (a.soundT <= 0) { a.soundT = 0.4; Sound.play(a.sound, P.x, P.y, 0.8); } }
      if (dist(P.x, P.y, a.x, a.y) > a.range) { this.cancel(); UI.notify('Interrupted.', 'info'); return; }
      if (a.t >= a.dur) { this.action = null; a.onDone(); }
      return;
    }
    const list = this.gather();
    let best = null, bd = 1e9;
    for (const c of list) { const d = dist(P.x, P.y, c.x, c.y) - (c.priority || 0); if (d < c.r && d < bd) { bd = d; best = c; } }
    this.prompt = best;
    if (!P.mounted) {
      let h = null, hd = 30;
      for (const ho of G.horses) { if (ho.dead || ho.rider) continue; const d = dist(ho.x, ho.y, P.x, P.y); if (d < hd) { hd = d; h = ho; } }
      if (h) this.fPrompt = h.owner === 'shop' ? `${h.def.name} — $${h.def.price} at the stables` : (h.owner === 'town' || h.owner === 'law' ? `Steal ${h.def.name}` : h.owner === 'wild' ? `Break in wild ${h.def.name}` : `Ride ${h.name}`);
    } else this.fPrompt = 'Dismount';
    if (best && Input.hit('KeyE')) best.act();
  },
  gather() {
    const P = G.player, out = [];
    const add = (label, x, y, r, act, priority) => out.push({ label, x, y, r, act, priority });
    if (Law.arrest && !Law.arrest.surrendering) add('Surrender to the law', P.x, P.y, 999, () => Law.surrender(), 500);
    for (const m of MissionSys.interactions()) out.push(m);
    for (const a of G.actors) {
      if (a.inside) continue;
      const d = dist(P.x, P.y, a.x, a.y);
      if (d > 44) continue;
      if (a.dead) {
        if (!a.looted && d < 20) add(`Loot ${a.name}`, a.x, a.y, 20, () => this.lootBody(a));
        continue;
      }
      if (a.downed > 0) continue;
      if (a.shopId && d < 40) {
        const shop = Object.assign({ id: a.shopId }, SHOPS[a.shopId]);
        const robbable = shop.till && P.drawn && P.cur !== 'knife';
        if (robbable) add(shop.type === 'bank' ? 'Hold up the bank teller' : `Rob ${shop.name}`, a.x, a.y, 40, () => this.holdUp(a, shop));
        else if (a.giver && MissionSys.giverPrompt(a)) add(MissionSys.giverPrompt(a), a.x, a.y, 40, () => MissionSys.talk(a), 10);
        else add(`${shop.type === 'sheriff' ? 'Speak with' : 'Shop at'} ${shop.name}`, a.x, a.y, 40, () => { const why = Economy.closed(shop); if (why) { UI.notify(`${a.name}: "${why}"`, 'bad'); Sound.play('deny'); } else UI.openShop(a.shopId, a); });
        continue;
      }
      if (a.giver) { const gp = MissionSys.giverPrompt(a); if (gp) { add(gp, a.x, a.y, 34, () => MissionSys.talk(a), 10); continue; } }
      if (a.faction === 'civ' && a.kind === 'civilian' && d < 30) {
        if (a.state === 'handsup' && P.drawn) add(`Rob ${a.name}`, a.x, a.y, 30, () => this.mug(a));
        else add('Greet', a.x, a.y, 26, () => { a.bark(BARKS.greet, true); a.face = Math.atan2(P.y - a.y, P.x - a.x); });
      }
      if (a.faction === 'gang' && d < 30 && !a.follow) add(`Talk to ${a.name}`, a.x, a.y, 30, () => a.bark(a.talk ? pick(a.talk) : pick(["Keep your powder dry.", "Boone's been askin' after you.", "Quiet night. Too quiet."]), true));
    }
    for (const an of G.animals) if (an.dead && !an.skinned && dist(P.x, P.y, an.x, an.y) < 22) add(`Skin the ${an.kind}`, an.x, an.y, 22, () => this.skin(an));
    const tr = G.train;
    if (tr && tr.state !== 'wait' && tr.speed < 25 && !tr.robbed) {
      const door = tr.expressDoor();
      add('Rob the express car', door.x, door.y, 26, () => this.robTrain(tr));
    }
    for (const c of G.coaches) {
      const d = dist(P.x, P.y, c.x, c.y);
      if (c.state === 'travel' && d < 90 && P.drawn && P.cur !== 'knife') add('Hold up the stagecoach', c.x, c.y, 90, () => { c.halt('holdup'); Sound.play('cock'); });
      else if (c.state !== 'travel' && !c.looted && d < 30) add('Loot the strongbox', c.x, c.y, 30, () => this.lootCoach(c));
    }
    for (const t of World.treasures) if (!G.world.treasuresFound.includes(t.id) && dist(P.x, P.y, t.x, t.y) < 20) add('Dig for treasure', t.x, t.y, 20, () => this.dig(t));
    World.poi.lootCrates.forEach((c, i) => { if (!G.world.cratesLooted.includes(i) && dist(P.x, P.y, c.x, c.y) < 24) add('Search the crate', c.x, c.y, 24, () => this.searchCrate(i)); });
    return out;
  },
  holdUp(clerk, shop) {
    const why = Economy.closed(shop);
    if (G.world.robbed[shop.id] && G.time < G.world.robbed[shop.id]) { UI.notify('The till is empty — they were robbed recently.', 'info'); return; }
    if (why && Law.heat === 0) { UI.notify(why, 'info'); }
    clerk.handsUpT = 6; clerk.bark(BARKS.civHandsUp, true);
    Sound.play('cock');
    this.begin(shop.type === 'bank' ? 'Emptying the teller drawer' : 'Emptying the till', shop.type === 'bank' ? 5 : 4, () => {
      const cash = randi(shop.till[0], shop.till[1]);
      Economy.addMoney(cash, clerk.x, clerk.y);
      if (chance(0.4)) Economy.addItem(shop.type === 'bank' ? 'gold_bar' : 'jewelry');
      G.world.robbed[shop.id] = G.time + 2 * 1440;
      G.stats.robberies++;
      clerk.handsUpT = 0;
      Law.commit(shop.type === 'bank' ? 'bank_robbery' : 'store_robbery', clerk.x, clerk.y, { reported: true });
      MissionSys.event('storeRobbed', shop.id);
    }, { range: 60, onCancel: () => { clerk.handsUpT = 0; Law.commit('store_robbery', clerk.x, clerk.y, { reported: true }); } });
  },
  mug(a) {
    this.begin('Robbing ' + a.name, 1.4, () => {
      Economy.addMoney(a.cash, a.x, a.y); a.cash = 0;
      if (chance(0.3)) Economy.addItem(chance(0.5) ? 'watch' : 'jewelry');
      a.state = 'flee'; a.fleeFrom = G.player; a.timer = 6;
      a.witness = { crime: 'mugging', x: a.x, y: a.y, t: rand(8, 12) };
      Law.commit('mugging', a.x, a.y, { victim: a });
      G.stats.robberies++;
    }, { range: 40 });
  },
  lootBody(a) {
    this.begin('Searching the body', 1.0, () => {
      a.looted = true;
      const P = G.player;
      if (a.cash) Economy.addMoney(a.cash, a.x, a.y);
      if (a.weapon && WEAPONS[a.weapon].ammo) {
        const am = WEAPONS[a.weapon].ammo, n = randi(3, 8);
        P.ammo[am] = Math.min(AMMO[am].max, P.ammo[am] + n);
        Floaters.add(a.x, a.y - 30, `+${n} ${AMMO[am].name}`, '#d8e8c0');
        if (!P.owned[a.weapon] && a.faction !== 'civ' && chance(0.25)) { P.owned[a.weapon] = true; P.mag[a.weapon] = 0; UI.notify(`You picked up a ${WEAPONS[a.weapon].name}.`, 'good'); }
      }
      if (a.faction === 'civ' && chance(0.3)) Economy.addItem(chance(0.6) ? 'watch' : 'jewelry');
      if (a.faction === 'rival' && chance(0.25)) Economy.addItem(chance(0.3) ? 'treasure_map' : 'jewelry');
      if (chance(0.25)) Economy.addItem(pick(['bandage', 'whiskey']));
      if ((a.faction === 'civ' || a.faction === 'law') && Law.heat === 0) Law.commit('looting', a.x, a.y);
    });
  },
  skin(an) {
    this.begin('Skinning the ' + an.kind, 1.8, () => { an.skinned = true; an.dead = true; an.gone = true; Economy.addItem('pelt_' + an.kind); }, { sound: 'dig' });
  },
  dig(t) {
    this.begin('Digging', 3, () => {
      G.world.treasuresFound.push(t.id);
      const cash = randi(90, 220);
      Economy.addMoney(cash);
      Economy.addItem(chance(0.6) ? 'gold_bar' : 'jewelry');
      UI.notify(`You dug up the ${t.name}!`, 'good');
      G.stats.treasures++;
    }, { sound: 'dig' });
  },
  searchCrate(i) {
    this.begin('Searching', 1.2, () => {
      G.world.cratesLooted.push(i);
      Economy.addMoney(randi(10, 35));
      Economy.addItem(pick(['bandage', 'tonic', 'treasure_map']));
      const P = G.player; P.ammo.revolver = Math.min(AMMO.revolver.max, P.ammo.revolver + 12);
    });
  },
  robTrain(tr) {
    Sound.play('cock');
    this.begin('Cracking the express safe', 4, () => {
      tr.robbed = true;
      Economy.addMoney(randi(220, 380), tr.expressDoor().x, tr.expressDoor().y);
      Economy.addItem('gold_bar'); if (chance(0.5)) Economy.addItem('jewelry');
      Law.commit('train_robbery', tr.x, tr.y, { reported: true });
      G.stats.robberies++;
      const d = tr.expressDoor();
      for (let i = 0; i < 2; i++) { const g = spawnActor('guard', d.x - 40 - i * 30, d.y + 8, { name: 'Railroad Guard', weapon: pick(['repeater', 'shotgun']), forceHostile: true, temp: true, cash: randi(10, 30) }); g.bark('Train robbers!'); }
      if (tr.state === 'stop') tr.timer = Math.min(tr.timer, 3);
    }, { range: 30, sound: 'click' });
  },
  lootCoach(c) {
    this.begin('Prying open the strongbox', 2.5, () => {
      c.looted = true;
      Economy.addMoney(c.mission ? randi(150, 220) : randi(90, 170), c.x, c.y);
      Economy.addItem('jewelry'); if (chance(0.5)) Economy.addItem('watch');
      G.stats.robberies++;
      MissionSys.event('coachLooted', c);
    }, { range: 34, sound: 'click' });
  }
};

/* ============================================================ population spawner */
const Spawner = {
  t: 0, encounterT: 90, coachT: 30,
  initWorld() {
    const W = World;
    G.actors = []; G.horses = []; G.animals = []; G.coaches = []; G.targets = [];
    const tile = (tx, ty) => ({ x: tx * TS + 8, y: ty * TS + 8 });
    // clerks
    const clerkNames = { dw_general: 'Mr. Pruitt', dw_gunsmith: 'Hartley', dw_saloon: 'Barkeep Sam', dw_hotel: 'Miss Adeline', dw_stables: 'Cyrus the Stablehand', dw_bank: 'Teller Whitlock', dw_station: 'Station Master Gaines', mf_general: 'Señor Ortega', mf_cantina: 'Rosa', mf_station: 'Telegraph Clerk', cabin_trapper: 'Trapper Jo' };
    for (const b of W.buildings) {
      if (!b.clerk) continue;
      const pos = tile(b.clerk.x, b.clerk.y);
      if (b.type === 'sheriff') {
        const sheriff = spawnActor('lawman', pos.x, pos.y, { name: b.town === 'Dustwater' ? 'Sheriff Tom Brannigan' : 'Deputy Ruiz', pal: b.town === 'Dustwater' ? PAL.sheriff : PAL.lawman, post: { x: pos.x, y: pos.y, face: Math.PI / 2 }, weapon: 'sa', town: b.town });
        sheriff.shopId = b.id; sheriff.home = pos;
        continue;
      }
      const shopId = b.id === 'cabin_trapper' ? 'trapper' : b.shop;
      if (!shopId) continue;
      const pal = b.id === 'cabin_trapper' ? { hat: '#6a4a2a', shirt: '#8a6a4a', vest: '#4a3a2a', pants: '#3a3020', skin: '#c89a74', boots: '#2a1a10', hatType: 'cowboy', band: '#222' } : pick(CIV_PALS.filter(p => !p.dress));
      const c = spawnActor('clerk', pos.x, pos.y, { name: clerkNames[b.id] || 'Clerk', shopId, pal, home: pos, town: b.town, cash: randi(10, 30) });
      c.building = b;
    }
    // townsfolk
    const homesDW = W.buildings.filter(b => b.town === 'Dustwater' && (b.type === 'house' || b.type === 'hotel'));
    const homesMF = W.buildings.filter(b => b.town === 'Mesa Flats' && b.type === 'house');
    for (let i = 0; i < 15; i++) this.spawnCivilian('Dustwater', pick(homesDW));
    for (let i = 0; i < 6; i++) this.spawnCivilian('Mesa Flats', pick(homesMF));
    // lawmen
    this.spawnTownLaw();
    // hideout gang
    this.spawnGang();
    // rival camps
    for (const c of W.banditCamps) this.spawnCamp(c);
    // horses
    const hitch = [[58, 122], [64, 122], [84, 122], [236, 170]];
    hitch.forEach(([tx, ty], i) => G.horses.push(new Horse(i % 2 ? 'mustang' : 'nag', tx * TS + 8 + (i % 2 ? 6 : -6), (ty + 1) * TS + 2, { owner: 'town', face: Math.PI / 2 })));
    ['mustang', 'morgan', 'quarter', 'arabian'].forEach((b, i) => G.horses.push(new Horse(b, (47.5 + (i % 2) * 3) * TS, (126 + Math.floor(i / 2) * 3) * TS, { owner: 'shop', face: 0 })));
    this.spawnHerd(100 * TS, 168 * TS, 3); this.spawnHerd(190 * TS, 188 * TS, 2); this.spawnHerd(30 * TS, 95 * TS, 2);
    G.train = new Train();
    G.train.x = 30 * TS;
  },
  spawnCivilian(town, home) {
    const wps = World.townWaypoints[town], wp = pick(wps);
    const a = spawnActor('civilian', wp.x + rand(-10, 10), wp.y + rand(-8, 8), { town, building: home });
    a.home = { x: wp.x, y: wp.y };
    return a;
  },
  spawnTownLaw() {
    const dw = World.townWaypoints['Dustwater'], mf = World.townWaypoints['Mesa Flats'];
    const route1 = [dw[0], dw[2], dw[3], dw[5], dw[6], dw[11], dw[9], dw[7]];
    const route2 = [dw[6], dw[4], dw[3], dw[12], dw[8], dw[13], dw[14], dw[1]];
    const route3 = [mf[0], mf[2], mf[4], mf[5], mf[6]];
    G.actors.filter(a => a.faction === 'law' && a.patrol && !a.temp && a.dead).forEach(a => a.removeMe = true);
    const have = r => G.actors.some(a => a.patrolName === r && !a.dead);
    const mk = (name, route, town) => { if (have(name)) return; const p = route[0]; const a = spawnActor('lawman', p.x, p.y, { patrol: route, town }); a.patrolName = name; };
    mk('dwA', route1, 'Dustwater'); mk('dwB', route2, 'Dustwater'); mk('dwC', route1.slice().reverse(), 'Dustwater'); mk('mfA', route3, 'Mesa Flats');
  },
  spawnGang() {
    const H = World.poi.hideout, F = World.poi.hideoutFire;
    const posts = [[-2, 2.6, 0], [3, 1.6, Math.PI], [1, 4.2, -Math.PI / 2]];
    const names = ['Dutch Avery', 'Mags Flynn', 'Kid Tolliver'];
    posts.forEach(([dx, dy, f], i) => {
      if (G.actors.some(a => a.name === names[i])) return;
      spawnActor('gang', F.x + dx * TS, F.y + dy * TS, { name: names[i], post: { x: F.x + dx * TS, y: F.y + dy * TS, face: f }, invuln: true, pal: Object.assign({}, PAL.gang, { shirt: ['#4d5a6a', '#6a4a3a', '#5a6a4a'][i], bandana: ['#3a5a8a', '#8a3a3a', '#6a6a2a'][i] }), talk: [["Boone says we ride at dawn.", "Silas pays fair for stolen goods."], ["Ever rob a train? Wait 'til it stops at a station.", "Bury your loot, or spend it. Don't flash it."], ["The Rattlesnakes have camps out in the desert. Loaded with loot.", "Law can't follow you in here."]][i] });
    });
    const fp = World.poi.fence;
    if (!G.actors.some(a => a.shopId === 'camp_fence')) spawnActor('gang', fp.x, fp.y, { name: 'Old Silas', weapon: 'shotgun', invuln: true, post: { x: fp.x, y: fp.y, face: Math.PI / 2 }, pal: Object.assign({}, PAL.gang, { hat: '#8a7a5a', shirt: '#6a6a5a', vest: '#3a2a1a' }) }).shopId = 'camp_fence';
  },
  spawnCamp(c) {
    c.members = [];
    const n = randi(3, 5);
    for (let i = 0; i < n; i++) {
      const sp = World.randomOpenNear(c.x, c.y, 16, 60) || { x: c.x, y: c.y + 20 };
      const a = spawnActor('rival', sp.x, sp.y, { camp: c, home: { x: c.x, y: c.y }, cash: randi(10, 40) });
      c.members.push(a);
    }
  },
  spawnHerd(x, y, n) {
    for (let i = 0; i < n; i++) {
      const sp = World.randomOpenNear(x, y, 0, 60); if (!sp) continue;
      G.horses.push(new Horse(pick(['mustang', 'mustang', 'nag', 'morgan']), sp.x, sp.y, { owner: 'wild' }));
    }
  },
  biomeAnimal(x, y) {
    const t = World.tileAtPx(x, y);
    if (t === T.FOREST) return chance(0.7) ? 'deer' : 'rabbit';
    if (t === T.GRASS) return chance(0.6) ? 'rabbit' : (chance(0.5) ? 'deer' : 'coyote');
    if (t === T.SCRUB) return chance(0.5) ? 'rabbit' : 'coyote';
    if (t === T.SAND || t === T.DRYBED) return chance(0.6) ? 'coyote' : 'rabbit';
    return null;
  },
  update(dt) {
    this.t -= dt;
    if (this.t > 0) return;
    this.t = 1;
    const P = G.player;
    const off = (x, y) => !Game.onScreen(x, y, 40);
    // prune
    G.actors = G.actors.filter(a => {
      if (a.removeMe) return false;
      const d = dist(a.x, a.y, P.x, P.y);
      if (a.dead && (a.temp || a.camp) && a.deadT > 45 && off(a.x, a.y)) return false;
      if (a.dead && a.town && a.deadT > 120 && off(a.x, a.y) && !a.shopId) return false;
      if (a.temp && !a.dead && !a.mission && Law.heat === 0 && d > 500 && off(a.x, a.y)) return false;
      if (a.encounter && d > 1400) return false;
      return true;
    });
    G.animals = G.animals.filter(a => !(a.gone || (dist(a.x, a.y, P.x, P.y) > 1300) || (a.dead && a.deadT > 120 && off(a.x, a.y))));
    G.horses = G.horses.filter(h => !(h.dead && h.deadT > 90 && off(h.x, h.y)) && !(h.owner === 'law' && !h.rider && dist(h.x, h.y, P.x, P.y) > 1200));
    G.coaches = G.coaches.filter(c => !((c.arrived || (c.state !== 'travel' && dist(c.x, c.y, P.x, P.y) > 900)) && off(c.x, c.y) && !c.mission));
    // animals
    if (G.animals.length < 9) {
      const sp = World.randomOpenNear(P.x, P.y, 420, 800, (x, y) => !off(x, y) || World.townAt(x, y));
      if (sp) { const k = this.biomeAnimal(sp.x, sp.y); if (k) { const n = k === 'deer' ? randi(1, 3) : 1; for (let i = 0; i < n; i++) G.animals.push(new Animal(k, sp.x + rand(-15, 15), sp.y + rand(-15, 15))); } }
    }
    // towns repopulate when the player is away
    for (const town of ['Dustwater', 'Mesa Flats']) {
      const alive = G.actors.filter(a => a.kind === 'civilian' && a.town === town && !a.dead).length;
      const want = town === 'Dustwater' ? 15 : 6;
      const t = World.towns.find(x => x.name === town);
      const away = !World.townAt(P.x, P.y) || World.townAt(P.x, P.y) !== t;
      if (alive < want && away && chance(0.2)) this.spawnCivilian(town, pick(World.buildings.filter(b => b.town === town && (b.type === 'house' || b.type === 'hotel'))));
    }
    if (Law.heat === 0 && !World.townAt(P.x, P.y) && chance(0.1)) this.spawnTownLaw();
    // bandit camps respawn
    for (const c of World.banditCamps) {
      const alive = c.members.filter(a => !a.dead).length;
      if (!alive && c.clearedAt < 0) { c.clearedAt = G.time; UI.notify(`${c.name} has been cleared out.`, 'good'); }
      if (!alive && c.clearedAt >= 0 && G.time - c.clearedAt > 1.5 * 1440 && dist(P.x, P.y, c.x, c.y) > 900) { c.clearedAt = -1; this.spawnCamp(c); }
    }
    // wild herds
    if (G.horses.filter(h => h.owner === 'wild' && !h.dead).length < 4 && chance(0.05)) {
      const sp = World.randomOpenNear(P.x, P.y, 500, 900, (x, y) => !off(x, y) || World.townAt(x, y) || World.tileAtPx(x, y) === T.FOREST);
      if (sp) this.spawnHerd(sp.x, sp.y, 2);
    }
    // stagecoach service
    this.coachT -= 1;
    if (this.coachT <= 0 && !G.coaches.some(c => !c.mission)) {
      this.coachT = rand(100, 200);
      const dir = dist(P.x, P.y, World.poi.stageRoute[0].x, World.poi.stageRoute[0].y) > 500 ? 1 : -1;
      const c = new Stagecoach(dir); if (off(c.x, c.y)) G.coaches.push(c);
    }
    // random encounters in the wilderness
    this.encounterT -= 1;
    if (this.encounterT <= 0) {
      this.encounterT = rand(70, 140);
      if (!World.townAt(P.x, P.y) && Law.heat === 0 && !P.dead && dist(P.x, P.y, World.poi.hideout.x, World.poi.hideout.y) > 500 && !(MissionSys.active && MissionSys.active.noEncounters)) this.encounter();
    }
  },
  encounter() {
    const P = G.player, r = Math.random();
    const sp = World.randomOpenNear(P.x, P.y, 340, 440, (x, y) => Game.onScreen(x, y, 10) || World.townAt(x, y));
    if (!sp) return;
    if (r < 0.45) {
      const n = randi(2, 3);
      for (let i = 0; i < n; i++) {
        const a = spawnActor('rival', sp.x + i * 14, sp.y + rand(-10, 10), { encounter: true, temp: true, cash: randi(15, 45) });
        a.mounted = new Horse(pick(['mustang', 'nag', 'morgan']), a.x, a.y, { owner: 'wild' });
      }
      UI.notify('Hoofbeats... Rattlesnake riders are coming for you!', 'warn');
    } else if (r < 0.65) {
      const a = spawnActor('civilian', sp.x, sp.y, { temp: true, cash: randi(10, 40) });
      a.mounted = new Horse('mustang', sp.x, sp.y, { owner: 'town' });
      a.state = 'walk'; a.goal = { x: World.poi.saloonFront.x, y: World.poi.saloonFront.y }; a.timer = 200;
    } else if (r < 0.8) {
      for (let i = 0; i < 2; i++) {
        const a = spawnActor('lawman', sp.x + i * 14, sp.y, { temp: true });
        a.mounted = new Horse('morgan', a.x, a.y, { owner: 'law' });
        a.patrol = [{ x: World.poi.saloonFront.x, y: World.poi.saloonFront.y }];
      }
    } else {
      for (let i = 0; i < 3; i++) G.animals.push(new Animal(chance(0.5) ? 'coyote' : 'deer', sp.x + rand(-20, 20), sp.y + rand(-20, 20)));
    }
  }
};
