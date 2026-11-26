/* Outlaw County — honest.js (v2.10)
 * Honest work in town. Every job can be repeated, each has its own little
 * game, and you get better (and better paid) the more you do it:
 *   bartender (any saloon), blacksmith (any stables), doctor (patients in
 *   town), telegraph operator (any station), newspaper photographer (the
 *   Kingsport Herald), undertaker (bodies in town, graves at any church),
 *   saloon pianist and Pony Express mail rider (any station).
 * Mini-games run in one shared overlay, Mini. wild.js adds the outdoor jobs.
 */
'use strict';

/* ---------------------------------------------------------------- items */
Object.assign(ITEMS, {
  medbag: { name: "Doctor's Bag", type: 'tool', price: 30, sell: 10, desc: 'Lets you treat the sick and wounded in town.' },
  camera: { name: 'Box Camera', type: 'tool', price: 40, sell: 15, desc: 'For newspaper photographs and your wildlife journal.' }
});
ITEM_ORDER.push('medbag', 'camera');
SHOP_STOCK.general.buy.push('medbag');

const HONEST_JOBS = {
  bartender: 'Bartender', smith: 'Blacksmith', doctor: 'Doctor', telegraph: 'Telegraph Operator', reporter: 'Photographer', undertaker: 'Undertaker', piano: 'Pianist', mail: 'Mail Rider',
  trapper: 'Trapper', logger: 'Lumberjack', herbs: 'Herbalist', naturalist: 'Naturalist', maps: 'Treasure Hunter', wrangler: 'Wrangler', guide: 'Trail Guide'
};

const Honest = {
  data() { const w = G.world; if (!w.jobs) w.jobs = {}; return w.jobs; },
  job(k) { const d = this.data(); return d[k] || (d[k] = { xp: 0, done: 0, earned: 0 }); },
  level(k) { return Math.min(10, Math.floor(Math.sqrt(this.job(k).xp / 30))); },
  mult(k) { return 1 + this.level(k) * 0.1; },
  /* finish a job: pay, count, grow */
  reward(k, base, xp = 10, note) {
    const j = this.job(k), lv = this.level(k), pay = Math.max(0, Math.round(base * this.mult(k)));
    if (pay) Economy.addMoney(pay);
    j.done++; j.earned += pay; j.xp += xp;
    if (this.level(k) > lv) { UI.notify(`${HONEST_JOBS[k]} level ${this.level(k)}! You're paid ${Math.round(this.mult(k) * 100 - 100)}% more now.`, 'good'); Sound.play('mission'); }
    if (note !== false) UI.notify(note || `${HONEST_JOBS[k]}: you earned $${pay}.`, 'good');
    Progress.add(Math.round(xp * 1.5));
    return pay;
  },
  clerks(type) { return G.actors.filter(a => a.kind === 'clerk' && !a.dead && a.shopId && SHOPS[a.shopId] && SHOPS[a.shopId].type === type); },
  near(a, r = 34) { const P = G.player; return a && dist(P.x, P.y, a.x, a.y) < r; },
  busy() { return !!(Mini.s || UI.modal || UI.dlg); }
};

/* ---------------------------------------------------------------- the mini-game overlay */
const Mini = {
  s: null, def: null,
  open(def) {
    this.def = def;
    const s = this.s = { t: 0, done: false, msg: '', keys: {}, mx: 0, my: 0, down: false };
    if (def.init) def.init(s);
    $('mini-title').textContent = def.title; $('mini-hint').textContent = def.hint || 'Esc to stop';
    UI.show('minigame'); UI.modal = 'minigame';
    this.last = performance.now(); requestAnimationFrame(() => this.loop());
  },
  loop() {
    const s = this.s; if (!s) return;
    if (UI.modal !== 'minigame') { this.s = null; if (this.def.cancel) this.def.cancel(s); return; }
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    s.t += dt; if (!s.done) this.def.step(s, dt); else s.doneT = (s.doneT || 0) + dt;
    const cv = $('mini-canvas'), g = cv.getContext('2d'), W = cv.width, H = cv.height;
    g.clearRect(0, 0, W, H); this.def.draw(g, s, W, H);
    if (s.done) {
      g.fillStyle = 'rgba(10,6,3,.72)'; g.fillRect(0, H / 2 - 44, W, 88);
      g.textAlign = 'center'; g.font = 'bold 22px Georgia, serif'; g.fillStyle = s.good === false ? '#ffb0a0' : '#ffe39a'; g.fillText(s.msg, W / 2, H / 2 + 2);
      g.font = '13px Georgia, serif'; g.fillStyle = '#f0e0b8'; g.fillText('Click or press E to continue', W / 2, H / 2 + 28);
    }
    if (this.s) requestAnimationFrame(() => this.loop());
  },
  end(s, msg, good = true) { if (s.done) return; s.done = true; s.msg = msg; s.good = good; s.doneT = 0; },
  close() { const s = this.s, def = this.def; this.s = null; if (UI.modal === 'minigame') UI.closeAll(); if (s && def.finish) def.finish(s); },
  input(type, e) {
    const s = this.s; if (!s) return;
    if (type === 'key') {
      if (e.repeat) return;
      if (s.done) { if (e.type === 'keydown' && (e.code === 'KeyE' || e.code === 'Space' || e.code === 'Enter') && s.doneT > 0.4) this.close(); return; }
      s.keys[e.code] = e.type === 'keydown';
      if (this.def.key) this.def.key(s, e.code, e.type === 'keydown');
      if (['Space', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'KeyD', 'KeyF', 'KeyJ', 'KeyK', 'Enter'].includes(e.code)) e.preventDefault();
    } else {
      const cv = $('mini-canvas'), r = cv.getBoundingClientRect();
      s.mx = (e.clientX - r.left) * cv.width / r.width; s.my = (e.clientY - r.top) * cv.height / r.height;
      if (type === 'move') return;
      if (s.done) { if (type === 'down' && s.doneT > 0.4) this.close(); return; }
      s.down = type === 'down';
      if (this.def.mouse) this.def.mouse(s, s.mx, s.my, s.down);
    }
  },
  /* shared drawing helpers */
  panel(g, W, H, top = '#3a2414', bot = '#1a0e06') { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); g.fillStyle = gr; g.fillRect(0, 0, W, H); },
  text(g, t, x, y, size = 14, col = '#f0e0b8', align = 'center', bold = false) { g.font = `${bold ? 'bold ' : ''}${size}px Georgia, serif`; g.fillStyle = col; g.textAlign = align; g.fillText(t, x, y); },
  bar(g, x, y, w, h, v, col, back = 'rgba(0,0,0,.5)') { g.fillStyle = back; g.fillRect(x, y, w, h); g.fillStyle = col; g.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * clamp(v, 0, 1)), h - 2); }
};
(function () {
  const el = document.createElement('div'); el.id = 'minigame'; el.className = 'screen hidden';
  el.innerHTML = '<div class="fish-box mini-box"><div id="mini-title" class="mini-title"></div><canvas id="mini-canvas" width="640" height="320"></canvas><div id="mini-hint" class="muted small"></div></div>';
  const st = document.createElement('style');
  st.textContent = '#minigame{align-items:center;justify-content:center;background:rgba(8,5,3,.5)}#minigame canvas{display:block;border-radius:6px;max-width:92vw;cursor:crosshair}.mini-title{font:bold 18px Georgia,serif;color:#ffe39a;margin:2px 0 8px;letter-spacing:.04em}';
  const add = () => {
    document.head.append(st); document.body.append(el);
    const cv = el.querySelector('canvas');
    cv.addEventListener('mousedown', e => { Mini.input('down', e); e.preventDefault(); });
    addEventListener('mouseup', e => Mini.input('up', e));
    cv.addEventListener('mousemove', e => Mini.input('move', e));
    addEventListener('keydown', e => { if (Mini.s) Mini.input('key', e); });
    addEventListener('keyup', e => { if (Mini.s) Mini.input('key', e); });
  };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
})();

/* ---------------------------------------------------------------- 1. bartender */
const DRINKS = [['Whiskey', '#c8862a'], ['Beer', '#e8c040'], ['Rye', '#a0522d'], ['Sarsaparilla', '#5a2a1a']];
const Bartender = {
  start(clerk) {
    const lv = Honest.level('bartender');
    Mini.open({ title: `Tending bar at ${SHOPS[clerk.shopId].name}`, hint: 'Press 1-4 (or click a bottle) to pour what the customer at the bar wants. Mash Space to throw out a troublemaker.',
      init: s => { s.queue = []; s.served = 0; s.tips = 0; s.total = 8; s.spawned = 0; s.spawnT = 0.5; s.lost = 0; s.flash = 0; },
      step: (s, dt) => {
        s.spawnT -= dt; s.flash = Math.max(0, s.flash - dt);
        if (s.spawnT <= 0 && s.spawned < s.total && s.queue.length < 4) { s.spawned++; s.spawnT = rand(1.2, 2.6); s.queue.push({ want: randi(0, 3), pat: 1, max: 7.5 - lv * 0.25, rowdy: chance(0.14), mash: 0, hue: pick(['#6a4a3a', '#3a4a5a', '#5a5a3a', '#4a3a4a', '#7a5a3a']), hat: pick(['#2a2a2a', '#5a3a20', '#8a7a5a']) }); }
        const c = s.queue[0];
        if (c) { c.pat -= dt / c.max; if (c.pat <= 0) { s.queue.shift(); s.lost++; s.say = c.rowdy ? 'He smashes a chair on his way out!' : 'Too slow! The customer storms off.'; s.flash = 1; } }
        if (s.spawned >= s.total && !s.queue.length) Mini.end(s, `Shift over: ${s.served} served, $${Math.round(s.tips)} in tips.`, s.served >= 4);
      },
      key: (s, code, down) => {
        if (!down) return; const c = s.queue[0]; if (!c) return;
        if (c.rowdy) { if (code === 'Space') { c.mash++; if (c.mash >= 7) { s.queue.shift(); s.tips += 3; s.served++; s.say = 'You toss the troublemaker into the street. The room cheers.'; Sound.play('punch'); s.flash = 1; } } return; }
        const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3 }[code]; if (n === undefined) return;
        this.pour(s, n);
      },
      mouse: (s, x, y, down) => { if (!down) return; const n = Math.floor((x - 40) / 140); if (y > 250 && n >= 0 && n < 4) this.pour(s, n); },
      draw: (g, s, W, H) => {
        Mini.panel(g, W, H, '#4a2c16', '#24140a');
        // back shelf and mirror
        g.fillStyle = '#2a1a0e'; g.fillRect(0, 0, W, 70); g.fillStyle = '#1a0e06'; g.fillRect(0, 0, W, 22); g.fillStyle = 'rgba(160,190,200,.12)'; g.fillRect(180, 8, 280, 54);
        for (let i = 0; i < 16; i++) { g.fillStyle = DRINKS[i % 4][1]; g.fillRect(14 + i * 40, 34, 10, 26); g.fillRect(17 + i * 40, 27, 4, 8); }
        // customers
        s.queue.forEach((c, i) => {
          const x = 420 - i * 110, y = 160;
          g.fillStyle = c.hue; g.fillRect(x - 22, y - 30, 44, 60); g.fillStyle = '#d8a880'; g.fillRect(x - 12, y - 58, 24, 26); g.fillStyle = c.hat; g.fillRect(x - 20, y - 62, 40, 6); g.fillRect(x - 12, y - 76, 24, 15);
          if (c.rowdy && i === 0) { g.fillStyle = '#ff4030'; g.fillRect(x - 8, y - 46, 16, 3); }
          if (i === 0) {
            g.fillStyle = '#f0e4c8'; g.fillRect(x + 34, y - 86, 160, 40); g.beginPath(); g.moveTo(x + 34, y - 56); g.lineTo(x + 20, y - 50); g.lineTo(x + 40, y - 60); g.fill();
            Mini.text(g, c.rowdy ? '"Who you lookin\' at?!"' : `"${DRINKS[c.want][0]}, barkeep."`, x + 114, y - 61, 14, '#3a1a0a');
            Mini.bar(g, x - 30, y + 36, 60, 7, c.pat, c.pat > 0.4 ? '#7ad06a' : '#e05a3a');
            if (c.rowdy) Mini.text(g, `Mash SPACE! ${c.mash}/7`, x, y + 60, 14, '#ffb0a0', 'center', true);
          }
        });
        // the bar and the bottles you pour from
        g.fillStyle = '#5a3418'; g.fillRect(0, 230, W, 90); g.fillStyle = '#8a5230'; g.fillRect(0, 230, W, 8);
        DRINKS.forEach(([n, col], i) => { const x = 40 + i * 140; g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(x, 252, 120, 56); g.fillStyle = col; g.fillRect(x + 50, 258, 20, 34); g.fillRect(x + 56, 250, 8, 10); Mini.text(g, `${i + 1}  ${n}`, x + 60, 304, 13); });
        Mini.text(g, `Served ${s.served}/${s.total}   Tips $${Math.round(s.tips)}`, W - 12, 17, 14, '#ffe39a', 'right', true);
        if (s.say && s.flash > 0) Mini.text(g, s.say, W / 2, 222, 14, '#ffd0a0');
      },
      finish: s => { if (s.served) { Honest.reward('bartender', 5 + s.tips, 6 + s.served * 2, `You hang up your apron. $${Math.round((5 + s.tips) * Honest.mult('bartender'))} for the shift.`); G.stats.hwBar = (G.stats.hwBar || 0) + 1; } }
    });
  },
  pour(s, n) {
    const c = s.queue[0]; if (!c || c.rowdy) return;
    if (n === c.want) { s.tips += 1 + c.pat * 3; s.served++; s.queue.shift(); Sound.play('coin'); }
    else { c.pat -= 0.25; s.say = '"That ain\'t what I ordered!"'; s.flash = 1; Sound.play('click'); }
  }
};

/* ---------------------------------------------------------------- 2. blacksmith */
const Smith = {
  start(clerk) {
    const lv = Honest.level('smith'), task = pick(['Shoe a horse', 'Mend a wagon wheel', 'Forge a hinge', 'Straighten a plow blade']);
    Mini.open({ title: `${task} at ${SHOPS[clerk.shopId].name}`, hint: 'Strike (Space or click) while the hammer mark is inside the glowing zone. Ten strikes before the iron cools.',
      init: s => { s.pos = 0; s.dir = 1; s.speed = 0.9; s.hits = 0; s.strikes = 0; s.zone = 0.2 + lv * 0.006; s.heat = 1; s.spark = 0; s.last = ''; },
      step: (s, dt) => {
        s.pos += s.dir * s.speed * dt; if (s.pos > 1) { s.pos = 1; s.dir = -1; } if (s.pos < 0) { s.pos = 0; s.dir = 1; }
        s.heat -= dt / 18; s.spark = Math.max(0, s.spark - dt * 3);
        if (s.strikes >= 10 || s.heat <= 0) Mini.end(s, s.hits >= 9 ? `Perfect work! ${s.hits}/10 clean strikes.` : `${s.hits}/10 clean strikes.`, s.hits >= 5);
      },
      key: (s, code, down) => { if (down && code === 'Space') this.strike(s); },
      mouse: (s, x, y, down) => { if (down) this.strike(s); },
      draw: (g, s, W, H) => {
        Mini.panel(g, W, H, '#2a1a12', '#0e0806');
        const glow = g.createRadialGradient(W / 2, 190, 10, W / 2, 190, 220); glow.addColorStop(0, `rgba(255,120,30,${0.35 * s.heat})`); glow.addColorStop(1, 'rgba(255,120,30,0)'); g.fillStyle = glow; g.fillRect(0, 0, W, H);
        // anvil and the hot iron
        g.fillStyle = '#3a3a40'; g.fillRect(W / 2 - 110, 200, 220, 30); g.fillRect(W / 2 - 50, 230, 100, 50); g.fillStyle = '#5a5a62'; g.fillRect(W / 2 - 110, 200, 220, 5);
        const hc = s.heat > 0.6 ? '#ffd060' : s.heat > 0.3 ? '#ff8030' : '#a03018'; g.fillStyle = hc; g.fillRect(W / 2 - 70, 188, 140, 12);
        for (let i = 0; i < 8; i++) if (s.spark > 0) { g.fillStyle = '#ffe080'; g.fillRect(W / 2 + Math.cos(i) * 60 * (1.2 - s.spark), 188 - Math.abs(Math.sin(i * 3)) * 70 * (1.2 - s.spark), 3, 3); }
        // the timing track
        const tx = 120, tw = W - 240, ty = 70, zc = 0.5;
        g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(tx, ty, tw, 26);
        g.fillStyle = `rgba(255,${140 + 80 * s.heat},40,.75)`; g.fillRect(tx + tw * (zc - s.zone / 2), ty, tw * s.zone, 26);
        g.fillStyle = '#f0f0f0'; g.fillRect(tx + tw * s.pos - 2, ty - 6, 4, 38);
        // hammer
        const hy = s.spark > 0 ? 160 : 110; g.fillStyle = '#6a4426'; g.fillRect(W / 2 + 60, hy - 50, 8, 60); g.fillStyle = '#2a2a2e'; g.fillRect(W / 2 + 46, hy, 36, 18);
        Mini.text(g, `Strikes ${s.strikes}/10   Clean ${s.hits}`, 20, 30, 15, '#ffe39a', 'left', true);
        Mini.text(g, 'Heat', W - 120, 30, 13, '#f0e0b8', 'right'); Mini.bar(g, W - 110, 20, 90, 12, s.heat, hc);
        if (s.last) Mini.text(g, s.last, W / 2, 130, 16, s.last === 'CLANG!' ? '#ffe39a' : '#ffb0a0', 'center', true);
      },
      finish: s => {
        if (!s.strikes) return;
        Honest.reward('smith', 3 + s.hits * 0.9, 4 + s.hits, null);
        G.stats.hwSmith = (G.stats.hwSmith || 0) + 1;
        const h = G.player.horse;
        if (s.hits >= 9 && h && !h.dead && task === 'Shoe a horse') { h.shodUntil = G.time + 1440; if (!h.def.shod) h.def = Object.assign({}, h.def, { speed: h.def.speed * 1.08, sprint: h.def.sprint * 1.08, shod: true }); UI.notify(`The smith lets you use the leftover shoes: ${h.name} runs 8% faster for a day.`, 'good'); }
      }
    });
  },
  strike(s) {
    if (s.done) return;
    s.strikes++; const ok = Math.abs(s.pos - 0.5) < s.zone / 2;
    if (ok) { s.hits++; s.spark = 1; s.last = 'CLANG!'; Sound.play('punch'); s.zone = Math.max(0.08, s.zone - 0.012); s.speed += 0.12; } else { s.last = 'Missed the mark'; Sound.play('click'); }
  }
};

/* ---------------------------------------------------------------- 3. doctor */
const AILMENTS = {
  gunshot: { name: 'Bullet in the shoulder', cure: 'extract', pay: 22, hand: true },
  broken: { name: 'Broken arm', cure: 'splint', pay: 14 },
  snake: { name: 'Snakebite, swelling fast', cure: 'antidote', pay: 16 },
  cut: { name: 'Deep knife cut', cure: 'stitch', pay: 15, hand: true },
  fever: { name: 'Fever and chills', cure: 'quinine', pay: 12 }
};
const CURES = [['extract', 'Extract the bullet'], ['splint', 'Set and splint'], ['antidote', 'Snakebite antidote'], ['stitch', 'Clean and stitch'], ['quinine', 'Quinine powder']];
const Doctor = {
  t: 40,
  update(dt) {
    const P = G.player; this.t -= dt;
    for (const a of G.actors) if (a.patient && (a.dead || a.removeMe)) a.patient = null;
    if (this.t > 0 || !P.inv.medbag) return;
    this.t = rand(60, 120);
    const town = World.townAt(P.x, P.y);
    if (!town || G.actors.some(a => a.patient && !a.dead)) return;
    const c = G.actors.filter(a => a.kind === 'civilian' && !a.dead && !a.inside && a.town === town.name && !a.kpRole && dist(a.x, a.y, P.x, P.y) < 600);
    if (!c.length) return;
    const a = pick(c); a.patient = pick(Object.keys(AILMENTS)); a.post = { x: a.x, y: a.y, face: 0 };
    a.bark(pick(['Somebody fetch a doctor!', 'Ohh... help me...', 'Is there a doctor in this town?']), true);
    UI.notify(`Someone in ${town.name} needs a doctor. (${AILMENTS[a.patient].name})`, 'mission');
  },
  start(a) {
    const ail = AILMENTS[a.patient], lv = Honest.level('doctor');
    Mini.open({ title: `Treating ${a.name}`, hint: 'Pick the treatment (1-5). For delicate work, keep the pointer on the wound inside the ring until the bar fills.',
      init: s => { s.phase = 'pick'; s.prog = 0; s.tx = 320; s.ty = 170; s.vx = 0; s.vy = 0; s.slip = 0; },
      step: (s, dt) => {
        if (s.phase !== 'hand') return;
        // the wound twitches as the patient flinches
        s.vx += rand(-1, 1) * (260 - lv * 12) * dt; s.vy += rand(-1, 1) * (260 - lv * 12) * dt; s.vx *= 0.96; s.vy *= 0.96;
        s.tx = clamp(s.tx + s.vx * dt, 200, 440); s.ty = clamp(s.ty + s.vy * dt, 100, 240);
        const on = dist(s.mx, s.my, s.tx, s.ty) < 22 && s.down !== undefined;
        s.on = on; if (on) s.prog += dt / 5; else s.slip += dt;
        if (s.prog >= 1) Mini.end(s, `${a.name} will pull through.`, true);
        else if (s.slip > 9) Mini.end(s, 'Your hand slipped. The patient needs a real surgeon now.', false);
      },
      key: (s, code, down) => { if (down && s.phase === 'pick') { const n = { Digit1: 0, Digit2: 1, Digit3: 2, Digit4: 3, Digit5: 4 }[code]; if (n !== undefined) this.choose(s, ail, n); } },
      mouse: (s, x, y, down) => { if (down && s.phase === 'pick' && y > 236) { const n = Math.floor((x - 10) / 124); if (n >= 0 && n < 5) this.choose(s, ail, n); } },
      draw: (g, s, W, H) => {
        Mini.panel(g, W, H, '#e8dcc0', '#c8b890');
        Mini.text(g, `Patient: ${a.name}`, 20, 30, 16, '#3a1a0a', 'left', true); Mini.text(g, `Complaint: ${ail.name}`, 20, 52, 14, '#5a2a1a', 'left');
        if (s.phase === 'pick') {
          g.fillStyle = '#d8a880'; g.fillRect(220, 90, 200, 110); g.fillStyle = '#a03020'; g.beginPath(); g.arc(320, 145, 14, 0, TAU); g.fill();
          CURES.forEach(([k, n], i) => { const x = 10 + i * 124; g.fillStyle = '#5a3a20'; g.fillRect(x, 240, 118, 60); Mini.text(g, `${i + 1}`, x + 59, 262, 16, '#ffe39a', 'center', true); Mini.text(g, n, x + 59, 286, 12, '#f0e0b8'); });
          if (s.wrong) Mini.text(g, s.wrong, W / 2, 226, 14, '#a02010', 'center', true);
        } else {
          g.fillStyle = '#d8a880'; g.fillRect(140, 80, 360, 190); g.fillStyle = '#b07858'; g.fillRect(140, 80, 360, 6);
          g.strokeStyle = s.on ? '#2a8a2a' : '#8a2a1a'; g.lineWidth = 3; g.beginPath(); g.arc(s.tx, s.ty, 22, 0, TAU); g.stroke();
          g.fillStyle = '#8a1a10'; g.beginPath(); g.arc(s.tx, s.ty, 7, 0, TAU); g.fill();
          g.strokeStyle = '#c8ccd0'; g.lineWidth = 2; g.beginPath(); g.moveTo(s.mx, s.my); g.lineTo(s.mx + 26, s.my - 26); g.stroke();
          Mini.text(g, ail.cure === 'extract' ? 'Ease the forceps in... steady...' : 'Stitch... steady...', W / 2, 300, 14, '#3a1a0a', 'center', true);
          Mini.bar(g, 520, 90, 18, 170, 0, '#000', 'rgba(0,0,0,.2)'); g.fillStyle = '#2a8a2a'; g.fillRect(521, 259 - 168 * s.prog, 16, 168 * s.prog);
        }
      },
      finish: s => {
        if (s.good === undefined) return;
        if (s.good) { Honest.reward('doctor', ail.pay, 14, `${a.name} pays the doctor $${Math.round(ail.pay * Honest.mult('doctor'))}.`); a.bark('Bless you, doc!', true); G.stats.hwDoc = (G.stats.hwDoc || 0) + 1; }
        else { a.bark(s.wrongCure ? 'That... made it worse...' : 'Ow!', true); }
        a.patient = null; a.post = null;
      }
    });
  },
  choose(s, ail, n) {
    const k = CURES[n][0];
    if (k !== ail.cure) { s.wrongCure = true; s.wrong = `${CURES[n][1]}? That's not what's wrong.`; Mini.end(s, 'Wrong treatment. The patient groans and limps off.', false); return; }
    if (ail.hand) { s.phase = 'hand'; s.mx = s.tx; s.my = s.ty; Sound.play('click'); }
    else Mini.end(s, 'Right treatment. The patient feels better already.', true);
  }
};

/* ---------------------------------------------------------------- 4. telegraph */
const MORSE = { A: '.-', B: '-...', C: '-.-.', D: '-..', E: '.', F: '..-.', G: '--.', H: '....', I: '..', J: '.---', K: '-.-', L: '.-..', M: '--', N: '-.', O: '---', P: '.--.', Q: '--.-', R: '.-.', S: '...', T: '-', U: '..-', V: '...-', W: '.--', X: '-..-', Y: '-.--', Z: '--..' };
const WIRE_WORDS = ['GOLD', 'STAGE', 'TRAIN', 'HELP', 'SHERIFF', 'CATTLE', 'RAIN', 'NORTH', 'WEDDING', 'SOLD', 'MINE', 'BANK', 'DOCTOR', 'BABY', 'FIRE', 'HORSE', 'RIVER', 'POSSE', 'WIRE', 'SAFE'];
const Telegraph = {
  start(clerk) {
    Mini.open({ title: `Telegraph key at ${SHOPS[clerk.shopId].name}`, hint: 'Tap Space for a dot, hold it for a dash. A pause sends the letter (or press Enter).',
      init: s => { s.words = [pick(WIRE_WORDS), pick(WIRE_WORDS), pick(WIRE_WORDS)]; s.wi = 0; s.li = 0; s.cur = ''; s.pressT = -1; s.idle = 0; s.clean = 0; s.bad = 0; s.ok = 0; s.flash = ''; s.lit = false; },
      step: (s, dt) => {
        if (s.pressT >= 0) s.pressT += dt; else if (s.cur) { s.idle += dt; if (s.idle > 0.9) this.send(s); }
        if (s.wi >= s.words.length) Mini.end(s, `Sent ${s.clean} letters clean, ${s.bad} fumbled.`, s.clean > s.bad);
      },
      key: (s, code, down) => {
        if (code === 'Space') {
          if (down) { s.pressT = 0; s.lit = true; this.beep(true); }
          else if (s.pressT >= 0) { s.cur += s.pressT < 0.22 ? '.' : '-'; s.pressT = -1; s.idle = 0; s.lit = false; this.beep(false); }
        } else if (code === 'Enter' && down && s.cur) this.send(s);
      },
      mouse: (s, x, y, down) => this.def().key(s, 'Space', down),
      draw: (g, s, W, H) => {
        Mini.panel(g, W, H, '#3a2a1a', '#1a120a');
        const word = s.words[Math.min(s.wi, s.words.length - 1)], letter = word[s.li] || '';
        Mini.text(g, `Message ${Math.min(s.wi + 1, 3)} of 3`, 20, 28, 13, '#c8b890', 'left');
        g.font = 'bold 40px Georgia, serif'; g.textAlign = 'left'; let x = W / 2 - word.length * 15;
        for (let i = 0; i < word.length; i++) { g.fillStyle = i < s.li ? '#7ad06a' : i === s.li ? '#ffe39a' : '#8a7a60'; g.fillText(word[i], x + i * 30, 90); }
        if (letter) { Mini.text(g, `${letter} = ${MORSE[letter].replace(/\./g, '•').replace(/-/g, '—')}`, W / 2, 140, 22, '#f0e0b8', 'center', true); }
        Mini.text(g, s.cur.replace(/\./g, '•').replace(/-/g, '—') || ' ', W / 2, 186, 30, '#ffe39a', 'center', true);
        // the brass key
        g.fillStyle = '#4a3020'; g.fillRect(W / 2 - 90, 240, 180, 40); g.fillStyle = '#c8a040'; g.fillRect(W / 2 - 70, s.lit ? 232 : 226, 140, 8); g.fillStyle = '#1a1a1a'; g.beginPath(); g.arc(W / 2 + 60, s.lit ? 228 : 222, 10, 0, TAU); g.fill();
        g.fillStyle = s.lit ? '#ffd040' : '#4a3a20'; g.beginPath(); g.arc(W - 40, 40, 10, 0, TAU); g.fill();
        if (s.flash) Mini.text(g, s.flash, W / 2, 214, 14, s.flash.startsWith('Good') ? '#7ad06a' : '#ffb0a0');
        // cheat sheet
        g.font = '11px monospace'; g.textAlign = 'left'; g.fillStyle = 'rgba(240,224,184,.45)';
        Object.entries(MORSE).forEach(([k, v], i) => g.fillText(`${k} ${v}`, 12 + Math.floor(i / 13) * 70, 210 + (i % 13) * 8));
      },
      finish: s => {
        if (!s.clean) return;
        Honest.reward('telegraph', s.clean * 0.7, 3 + s.clean, null);
        G.stats.hwWire = (G.stats.hwWire || 0) + 1;
        if (chance(0.25)) { UI.notify('One of the wires mentioned an old cache. You make a note of where.', 'mission'); Economy.revealTreasure(); }
      }
    });
  },
  def() { return Mini.def; },
  beep(on) { if (!Sound.ctx || Sound.ctx.state !== 'running') return; if (on) { const o = Sound.out(0.12, 0); this.osc = Sound.ctx.createOscillator(); this.osc.frequency.value = 760; this.osc.type = 'square'; this.osc.connect(o); this.osc.start(); } else if (this.osc) { try { this.osc.stop(); } catch (e) { } this.osc = null; } },
  send(s) {
    const word = s.words[s.wi], letter = word[s.li];
    if (s.cur === MORSE[letter]) { s.clean++; s.li++; s.flash = `Good: ${letter}`; if (s.li >= word.length) { s.wi++; s.li = 0; Sound.play('click'); } }
    else { s.bad++; s.flash = `That spelled ${Object.keys(MORSE).find(k => MORSE[k] === s.cur) || 'nothing'}. Try ${letter} again.`; }
    s.cur = ''; s.idle = 0;
  }
};

/* ---------------------------------------------------------------- 5. newspaper photographer */
const ASSIGNMENTS = [
  { k: 'animal:bear', name: 'a grizzly bear', pay: 60 }, { k: 'animal:cougar', name: 'a mountain lion', pay: 50 }, { k: 'animal:elk', name: 'a bull elk', pay: 35 },
  { k: 'train', name: 'the Frostpeak Express under steam', pay: 30 }, { k: 'ship', name: 'a tall ship in Kingsport Bay', pay: 25 },
  { k: 'place:Rattlesnake Fortress', name: 'the Rattlesnake Fortress', pay: 45 }, { k: 'place:Iron Island', name: 'the Iron Island Penitentiary', pay: 30 },
  { k: 'place:Hollow Creek', name: 'the ghost town of Hollow Creek', pay: 35 }, { k: 'place:Silver Crown Mine', name: 'the Silver Crown Mine', pay: 30 },
  { k: 'place:Puerto Dorado', name: 'the harbor at Puerto Dorado', pay: 45 }, { k: 'place:Fort Granger', name: 'the cavalry at Fort Granger', pay: 30 },
  { k: 'fight', name: 'the aftermath of a gunfight', pay: 40 }
];
const Reporter = {
  editor: null,
  ensure() {
    const b = World.kpLandmarks && World.kpLandmarks.kp_herald; if (!b) return;
    if (this.editor && !this.editor.dead && G.actors.includes(this.editor)) return;
    const x = (b.x + 4) * TS, y = (b.y + 3) * TS;
    this.editor = spawnActor('civilian', x, y, { name: 'Editor Hal Brennan', post: { x, y, face: Math.PI / 2 }, home: { x, y }, invuln: true, cash: 0, town: 'Downtown Kingsport', pal: Object.assign({}, CIV_PALS[0], { coat: null, vest: '#3a3a4a', shirt: '#f0ece0', hatType: 'none', hair: '#8a8a8a' }) });
    this.editor.kpRole = 'editor';
  },
  talk() {
    const P = G.player, w = G.world, a = w.photoJob;
    if (!P.inv.camera) {
      UI.dialogue([{ who: this.editor.name, text: 'A photographer? You\'ll need a camera. I\'ll sell you a box camera for $40, plates included. Bring me pictures the city has never seen.' }], null,
        { choices: [{ label: 'Buy the camera ($40)', value: true }, { label: 'Not now', value: false }], onChoose: v => { if (!v) return; if (P.money < 40) { UI.notify('You need $40.', 'warn'); return; } P.money -= 40; P.inv.camera = 1; Sound.play('buy'); setTimeout(() => this.talk(), 200); } });
      return;
    }
    if (a && w.photo && w.photo.k === a.k) {
      const q = w.photo.q, pay = a.pay * (0.5 + q * 0.7);
      Honest.reward('reporter', pay, 16, `"Front page!" Brennan pays $${Math.round(pay * Honest.mult('reporter'))} for your photograph of ${a.name}.`);
      w.photoJob = null; w.photo = null; G.stats.hwPhoto = (G.stats.hwPhoto || 0) + 1; return;
    }
    if (a) { UI.dialogue([{ who: this.editor.name, text: `Still waiting on that photograph of ${a.name}. Get close: the clearer the picture, the more I pay.` }], null, { choices: [{ label: 'I\'m on it', value: 1 }, { label: 'Give me a different story', value: 2 }], onChoose: v => { if (v === 2) { w.photoJob = null; this.talk(); } } }); return; }
    const job = pick(ASSIGNMENTS); w.photoJob = job;
    UI.dialogue([{ who: this.editor.name, text: `Here's your assignment: bring me a photograph of ${job.name}. Pays up to $${Math.round(job.pay * 1.2)}. Press E with your camera to take a picture.` }]);
  },
  snap() {
    const P = G.player, w = G.world, job = w.photoJob;
    Sound.play('click'); const fl = $('dmg-flash'); if (fl) { fl.style.background = 'rgba(255,255,255,.9)'; fl.style.opacity = 1; setTimeout(() => { fl.style.opacity = 0; setTimeout(() => fl.style.background = '', 400); }, 90); }
    // the wildlife journal records any animal in the frame
    const an = G.animals.filter(a => !a.dead && Game.onScreen(a.x, a.y, -20)).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
    if (an && typeof Wild !== 'undefined') Wild.record(an.kind);
    if (!job) { UI.notify(an ? 'A fine picture for your journal.' : 'A nice picture, but nobody\'s buying it.', 'info'); return; }
    let q = 0;
    const [type, arg] = job.k.split(':');
    if (type === 'animal') { const a = G.animals.find(a => a.kind === arg && !a.dead && dist(a.x, a.y, P.x, P.y) < 260); if (a) q = 1 - dist(a.x, a.y, P.x, P.y) / 260; }
    else if (type === 'train') { const t = G.train; if (t && t.state !== 'wait' && dist(t.x, t.y, P.x, P.y) < 320) q = 1 - dist(t.x, t.y, P.x, P.y) / 320; }
    else if (type === 'ship') { const s = World.props.filter(p => p.t === 'ship').map(p => dist(p.x, p.y, P.x, P.y)).sort((a, b) => a - b)[0]; if (s < 360) q = 1 - s / 360; }
    else if (type === 'place') { const r = World.regionAt(P.x, P.y); if (r === arg || (World.townAt(P.x, P.y) || {}).name === arg) q = 0.85; }
    else if (type === 'fight') { const d = G.actors.filter(a => a.dead && a.faction !== 'civ' && dist(a.x, a.y, P.x, P.y) < 200); if (d.length) q = Math.min(1, 0.4 + d.length * 0.2); }
    if (q > 0) { q = clamp(q + 0.15, 0.2, 1); if (!w.photo || w.photo.k !== job.k || w.photo.q < q) w.photo = { k: job.k, q }; UI.notify(`Got it! ${q > 0.75 ? 'A sharp picture.' : q > 0.45 ? 'A decent picture.' : 'A blurry picture: get closer for more pay.'} Take it to the Herald.`, 'good'); }
    else UI.notify(`That's not ${job.name}.`, 'info');
  }
};

/* ---------------------------------------------------------------- 6. undertaker */
const Undertaker = {
  carry: null,
  churchDoors() { return World.buildings.filter(b => b.type === 'church').map(b => ({ x: b.door.x * TS + 8, y: (b.door.y + 1) * TS + 8, b })); },
  pick(a) { this.carry = { name: a.name }; a.removeMe = true; a.dead = true; UI.notify('You heft the body over your shoulder. Take it to a church for burial.', 'info'); },
  bury() {
    const name = this.carry.name;
    Mini.open({ title: `Burying ${name}`, hint: 'Hold Space (or the mouse) to drive the shovel in, release when the bar is in the green. Five good shovelfuls.',
      init: s => { s.power = 0; s.holding = false; s.dug = 0; s.tries = 0; s.msg2 = ''; },
      step: (s, dt) => { if (s.holding) { s.power += dt * 0.9; if (s.power > 1) s.power = 0; } if (s.dug >= 5) Mini.end(s, `${name} is laid to rest.`, true); else if (s.tries >= 12) Mini.end(s, 'The grave is shallow and crooked, but it will do.', true); },
      key: (s, code, down) => { if (code === 'Space') this.press(s, down); },
      mouse: (s, x, y, down) => this.press(s, down),
      draw: (g, s, W, H) => {
        Mini.panel(g, W, H, '#5a6a78', '#2a2a2a');
        g.fillStyle = '#5a4026'; g.fillRect(0, 210, W, 110); g.fillStyle = '#3a2814'; g.fillRect(200, 210, 240, 10 + s.dug * 14);
        g.fillStyle = '#d8d0c0'; g.fillRect(470, 150, 30, 60); g.fillRect(455, 165, 60, 10);
        Mini.bar(g, 60, 60, 30, 140, 0, '#000'); g.fillStyle = 'rgba(80,200,80,.6)'; g.fillRect(61, 60 + 140 * 0.15, 28, 140 * 0.2); g.fillStyle = '#ffe39a'; g.fillRect(61, 199 - 138 * s.power, 28, 4);
        Mini.text(g, `Shovelfuls ${s.dug}/5`, W - 20, 30, 15, '#f0e0b8', 'right', true); if (s.msg2) Mini.text(g, s.msg2, W / 2, 120, 15, '#f0e0b8');
      },
      finish: s => { this.carry = null; if (s.good) { Honest.reward('undertaker', 6 + s.dug, 10, `The parson pays $${Math.round((6 + s.dug) * Honest.mult('undertaker'))} for the burial.`); G.stats.hwGraves = (G.stats.hwGraves || 0) + 1; } }
    });
  },
  press(s, down) {
    if (down) { s.holding = true; s.power = 0; return; }
    if (!s.holding) return; s.holding = false; s.tries++;
    if (s.power >= 0.65 && s.power <= 0.85) { s.dug++; s.msg2 = 'Good shovelful.'; Sound.play('dig'); } else s.msg2 = s.power < 0.65 ? 'Barely scratched it.' : 'Too hard: the dirt slides back.';
  },
  drawWorld(ctx) {
    if (!this.carry) return; const P = G.player, R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
    R('#5a5048', P.x - 7, P.y - 24, 14, 5); R('#3a3430', P.x - 7, P.y - 20, 14, 1); R('#c89a74', P.x + 6, P.y - 24, 3, 3);
  }
};

/* ---------------------------------------------------------------- 7. pianist */
const Piano = {
  played: {},
  start(b) {
    const lanes = ['KeyD', 'KeyF', 'KeyJ', 'KeyK'], notes = [], bpm = 112 + randi(0, 30), beat = 60 / bpm;
    let tt = 1.6; for (let i = 0; i < 40; i++) { notes.push({ t: tt, lane: (i % 7 === 0) ? randi(0, 3) : (notes.length ? (notes[notes.length - 1].lane + pick([-1, 1, 2, -2]) + 4) % 4 : 0), hit: 0 }); tt += beat * pick([0.5, 1, 1, 1, 0.5, 1.5]); }
    const FREQ = [261.6, 329.6, 392, 523.3];
    Mini.open({ title: `Playing the piano at ${b.name}`, hint: 'Press D F J K as the notes reach the keys. Keep the crowd happy.',
      init: s => { s.notes = notes; s.score = 0; s.combo = 0; s.mood = 0.6; s.flash = []; },
      step: (s, dt) => {
        for (const n of s.notes) if (!n.hit && s.t - n.t > 0.18) { n.hit = -1; s.combo = 0; s.mood -= 0.05; }
        s.mood = clamp(s.mood, 0, 1);
        if (s.t > s.notes[s.notes.length - 1].t + 1) { const pct = Math.round(s.score / (s.notes.length * 2) * 100); s.pct = pct; Mini.end(s, pct >= 80 ? `A standing ovation! (${pct}%)` : pct >= 50 ? `Polite applause. (${pct}%)` : `Somebody throws a boot. (${pct}%)`, pct >= 50); }
      },
      key: (s, code, down) => {
        if (!down) return; const lane = lanes.indexOf(code); if (lane < 0) return;
        const n = s.notes.find(n => !n.hit && n.lane === lane && Math.abs(n.t - s.t) < 0.18);
        if (n) { const perfect = Math.abs(n.t - s.t) < 0.07; n.hit = perfect ? 2 : 1; s.score += n.hit; s.combo++; s.mood += perfect ? 0.04 : 0.02; s.flash.push({ lane, t: s.t, txt: perfect ? 'Perfect' : 'Good' }); this.tone(FREQ[lane] * (s.combo % 8 === 7 ? 2 : 1)); }
        else { s.combo = 0; s.mood -= 0.03; this.tone(FREQ[lane] * 0.94, 0.05); }
      },
      draw: (g, s, W, H) => {
        Mini.panel(g, W, H, '#2a1a0e', '#120a04');
        const lx = W / 2 - 140, hitY = 250;
        for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? 'rgba(255,255,255,.05)' : 'rgba(255,255,255,.08)'; g.fillRect(lx + i * 70, 0, 66, H); }
        g.fillStyle = '#e8e0d0'; g.fillRect(lx, hitY, 278, 34); for (let i = 0; i < 4; i++) { g.fillStyle = '#1a1a1a'; g.fillRect(lx + i * 70 + 66, hitY, 4, 34); Mini.text(g, 'DFJK'[i], lx + i * 70 + 33, hitY + 23, 16, '#3a2a1a', 'center', true); }
        for (const n of s.notes) { if (n.hit) continue; const y = hitY - (n.t - s.t) * 260; if (y < -20 || y > H) continue; g.fillStyle = '#ffe39a'; g.fillRect(lx + n.lane * 70 + 8, y - 8, 50, 14); g.fillStyle = '#c8a040'; g.fillRect(lx + n.lane * 70 + 8, y + 4, 50, 2); }
        for (const f of s.flash) if (s.t - f.t < 0.4) Mini.text(g, f.txt, lx + f.lane * 70 + 33, hitY - 12 - (s.t - f.t) * 60, 13, '#7ad06a', 'center', true);
        Mini.text(g, 'Crowd', 20, 30, 13, '#f0e0b8', 'left'); Mini.bar(g, 70, 20, 120, 12, s.mood, s.mood > 0.5 ? '#7ad06a' : '#e0a040');
        Mini.text(g, `Combo ${s.combo}`, W - 20, 30, 14, '#ffe39a', 'right', true);
      },
      finish: s => {
        if (s.pct === undefined) return;
        this.played[b.id] = G.time;
        const tips = Math.round(s.pct * 0.22);
        if (s.pct >= 50) Honest.reward('piano', tips, 6 + Math.round(s.pct / 10), `The crowd tosses $${Math.round(tips * Honest.mult('piano'))} into the jar.`); else UI.notify('Not a cent. Practice makes perfect.', 'info');
        if (s.pct >= 90) Ach.event && Ach.event('pianist');
        G.stats.hwPiano = (G.stats.hwPiano || 0) + 1;
      }
    });
  },
  tone(f, v = 0.18) {
    if (!Sound.ctx || Sound.ctx.state !== 'running') return;
    const o = Sound.out(v, 0), t = Sound.ctx.currentTime;
    Sound.tone(o, t, f, 0.5, 0.5, 'triangle'); Sound.tone(o, t, f * 2, 0.3, 0.12, 'sine');
  }
};

/* ---------------------------------------------------------------- 8. Pony Express mail */
const Mail = {
  offer(clerk) {
    const P = G.player, here = clerk.building || World.buildingAt(clerk.x, clerk.y);
    if (MissionSys.active) { UI.notify('Finish what you are doing first.', 'info'); return; }
    const offices = World.buildings.filter(b => (b.type === 'station' || b.type === 'sheriff') && b.town && b !== here && !/Iron Island/.test(b.town));
    const pickTowns = []; const seen = new Set();
    for (const b of offices.sort(() => Math.random() - 0.5)) { const d = dist(b.door.x * TS, b.door.y * TS, P.x, P.y); if (d < 260 * TS && d > 50 * TS && !seen.has(b.town)) { seen.add(b.town); pickTowns.push([b, d]); } if (pickTowns.length >= 3) break; }
    if (!pickTowns.length) { UI.notify('No mail going out from here today.', 'info'); return; }
    UI.dialogue([{ who: clerk.name, text: 'Mail bag needs to ride, and fast. You\'re paid for every minute you beat the clock. Lose the bag and you pay for it.' }], null,
      { choices: pickTowns.map(([b, d]) => { const secs = Math.round(d / 165 + 25); return { label: `${b.town}: ${secs}s, $${Math.round(12 + d / TS * 0.18)}`, value: [b, d, secs] }; }).concat([{ label: 'Not now', value: null }]), onChoose: v => { if (v) this.start(...v); } });
  },
  start(b, d, secs) {
    const door = { x: b.door.x * TS + 8, y: (b.door.y + 1) * TS + 8 }, id = 'mail_' + Date.now() % 100000, pay = 12 + d / TS * 0.18;
    const m = { id, title: `Mail for ${b.town}`, giverName: 'Postmaster', side: true, reward: 0 };
    m.stages = [{
      text: dd => `Ride the mail to ${b.town}. ${Math.max(0, Math.ceil(secs - dd.st))}s left.`,
      marker: () => ({ x: door.x, y: door.y - 24, label: b.town }),
      enter: dd => { dd.bandits = false; },
      fail: dd => dd.st > secs + 0.5 ? 'The mail is late. The postmaster docks your pay.' : null,
      done: (dd) => {
        const P = G.player;
        if (!dd.bandits && dd.st > secs * 0.35 && chance(0.004)) { dd.bandits = true; UI.notify('Road agents! They want the mail bag.', 'warn'); Story.ring({ x: P.x, y: P.y }, 2, 'rattler', 260, 360, { name: 'Road Agent', encounter: true }); }
        if (nearPlayer(door.x, door.y, 90)) { dd.left = secs - dd.st; return true; }
        return false;
      }
    }];
    m.onComplete = () => {
      const dd = MissionSys.data, bonus = Math.max(0, (dd.left || 0) * 0.25);
      Honest.reward('mail', pay + bonus, 12, `The postmaster in ${b.town} signs for the bag: $${Math.round((pay + bonus) * Honest.mult('mail'))}.`);
      G.stats.hwMail = (G.stats.hwMail || 0) + 1;
      MissionSys.list = MissionSys.list.filter(x => x !== m); MissionSys.completed = MissionSys.completed.filter(x => x !== m.id); G.stats.missions = Math.max(0, G.stats.missions - 1);
    };
    m.cleanup = () => { MissionSys.list = MissionSys.list.filter(x => x !== m); };
    MissionSys.list.push(m); MissionSys.start(id);
    UI.notify(`You sling the mail bag over the saddle. ${secs} seconds to ${b.town}. Ride!`, 'mission');
  }
};

/* ---------------------------------------------------------------- interactions & hooks */
Honest.interactions = function () {
  const P = G.player, out = []; if (!P || P.dead || this.busy()) return out;
  const near = (x, y, r = 34) => dist(P.x, P.y, x, y) < r;
  const free = !MissionSys.active || MissionSys.active.side;
  if (!P.mounted && free) {
    for (const c of this.clerks('saloon')) if (this.near(c, 40)) out.push({ label: 'Tend bar for a shift', x: c.x, y: c.y + 4, r: 40, priority: -5, act: () => Bartender.start(c) });
    for (const c of this.clerks('stables')) if (this.near(c, 40)) out.push({ label: 'Work at the forge', x: c.x, y: c.y + 4, r: 40, priority: -5, act: () => Smith.start(c) });
    for (const c of this.clerks('station')) if (this.near(c, 40)) { out.push({ label: 'Send telegrams', x: c.x, y: c.y + 4, r: 40, priority: -5, act: () => Telegraph.start(c) }); if (!MissionSys.active) out.push({ label: 'Carry the mail', x: c.x, y: c.y + 4, r: 40, priority: -6, act: () => Mail.offer(c) }); }
    for (const b of World.buildings) if (b.type === 'saloon') { const pf = b.furniture.find(f => f.k === 'piano'); if (pf) { const x = pf.x * TS + 8, y = (pf.y + 2) * TS + 4; if (near(x, y, 30)) { const last = Piano.played[b.id]; out.push({ label: last && G.time - last < 60 ? 'The crowd wants a break from piano' : 'Play the piano', x, y, r: 30, priority: -4, act: () => { if (!(last && G.time - last < 60)) Piano.start(b); } }); } } }
    for (const a of G.actors) if (a.patient && !a.dead && this.near(a, 36)) out.push({ label: P.inv.medbag ? `Treat ${a.name}` : 'Needs a doctor (buy a doctor\'s bag)', x: a.x, y: a.y + 4, r: 36, priority: 5, act: () => { if (P.inv.medbag) Doctor.start(a); } });
    if (Reporter.editor && this.near(Reporter.editor, 36)) out.push({ label: 'Talk to the editor', x: Reporter.editor.x, y: Reporter.editor.y + 4, r: 36, priority: 4, act: () => Reporter.talk() });
    if (!Undertaker.carry) { for (const a of G.actors) if (a.dead && !a.removeMe && a.deadT > 2 && !a.mission && World.townAt(a.x, a.y) && this.near(a, 22)) { out.push({ label: 'Carry the body to the undertaker', x: a.x, y: a.y, r: 22, priority: -8, act: () => Undertaker.pick(a) }); break; } }
    else for (const d of Undertaker.churchDoors()) if (near(d.x, d.y, 40)) out.push({ label: 'Dig a grave', x: d.x, y: d.y, r: 40, priority: 6, act: () => Undertaker.bury() });
  }
  if (P.inv.camera && !P.mounted) out.push({ label: 'Take a photograph', x: P.x, y: P.y, r: 999, priority: -70, act: () => Reporter.snap() });
  return out;
};
/* patients show on the map and minimap */
(function () {
  const base = allMarkers;
  allMarkers = function () { const out = base(); for (const a of G.actors) if (a.patient && !a.dead) out.push({ x: a.x, y: a.y, kind: 'stranger', label: 'Patient' }); return out; };
})();

Hooks.add({
  key: 'honest',
  reset: () => { Undertaker.carry = null; Doctor.t = 40; Piano.played = {}; Reporter.editor = null; if (Mini.s) Mini.s = null; },
  update: dt => {
    if (!G.player) return;
    Doctor.update(dt); if (Math.random() < 0.01) Reporter.ensure();
    const h = G.player.horse; if (h && h.shodUntil && G.time > h.shodUntil) { h.shodUntil = 0; if (HORSE_BREEDS[h.breed]) h.def = HORSE_BREEDS[h.breed]; }
  },
  interactions: () => Honest.interactions(),
  drawWorld: ctx => Undertaker.drawWorld(ctx)
});
