/* Outlaw County — kingsport.js (v2.9)
 * How Kingsport plays. City police in blue with whistles and call boxes,
 * horse-car trolleys you can ride, two rival gangs with their own turf, and
 * things to do: boxing at the Ironworks, poker at the Royal Flush, the opera,
 * the Herald's tips and smuggling runs for Fingers Malone. Three new heists
 * (Van Doren Jewelers, Ashford Mansion, the rail payroll) join the planner's
 * list, and the Kingsport Trust is a bank like any other.
 */
'use strict';

PAL.police = { hat: '#1a2240', band: '#c8a040', shirt: '#d8d8e0', coat: '#1e2a4a', pants: '#1a2034', skin: '#d8a880', boots: '#141414', hatType: 'helmet', badge: true, mustache: null };
const KP_GANGS = {
  gaslight: { name: 'Gaslight Boys', turf: 'The Flats', pal: { hat: '#2a3a2a', hatType: 'flat', shirt: '#b8b0a0', vest: '#2a4a2a', coat: null, pants: '#3a3a3a', bandana: '#3a7a3a' }, warn: "You're on Gaslight turf. Walk away while you still can." },
  hooks: { name: 'Dockside Hooks', turf: 'The Waterfront', pal: { hat: '#1a1a22', hatType: 'flat', shirt: '#6a6a72', coat: '#22263a', vest: null, pants: '#2a2a30', bandana: '#8a2a2a' }, warn: "These docks belong to the Hooks. Turn around, landlubber." }
};
const KP_CLERKS = { kp_bank: 'Mr. Pellingham', kp_general: 'Miss Whitcombe', kp_market: 'Rosa Bianchi', kp_gunsmith: 'Colonel Dabney', kp_hotel: 'Mr. Fairweather', kp_cardroom: 'Lucky Lou', kp_saloon: 'Big Fergus', kp_dock: 'One-Eyed Maggie', kp_stables: 'Amos the Hostler', kp_station: 'Stationmaster Pratt', gh_general: 'Old Tobias', gh_saloon: 'Barnacle Bess' };
Object.assign(SHOPS, { kp_tailor: { name: 'Delacroix & Sons, Tailors', type: 'tailor' } });
if (typeof TAILORS !== 'undefined') TAILORS.kp_general = ['kp_tailor', 'Monsieur Delacroix'];
if (typeof HEIST_VALUE !== 'undefined') HEIST_VALUE.kp_bank = [2200, 3200];
CRIMES.smuggling = { label: 'Smuggling contraband', bounty: 60, heat: 1 };
const KP_HEADLINES = ['MAYOR VOWS TO CLEAN UP THE FLATS', 'NEW ELECTRIC LIGHTS FOR KINGSPORT AVENUE?', 'GASLIGHT BOYS AND DOCKSIDE HOOKS FEUD AGAIN', 'OPERA SEASON OPENS TO PACKED HOUSE',
  'IRON ISLAND GUARDS FOIL ESCAPE', 'RAILROAD PAYROLL TO TRIPLE BY SPRING', 'STEAMER LOST OFF HARBOR POINT', 'POLICE COMMISSIONER DEMANDS MORE CALL BOXES', 'WHITCOMBE\'S OPENS NEW FLOOR', 'BOXING: "IRON" HANLON UNBEATEN'];

const Kingsport = {
  dressed: new WeakSet(), trolleys: [], was: false, heatWas: 0, tollT: 60, box: null, smuggler: null, promoter: null, dealer: null,

  inCity(x, y) { return x >= (KP.X0 - 4) * TS && x <= (KP.X1 + 50) * TS && y >= (KP.Y0 - 4) * TS && y <= (KP.Y1 + 4) * TS; },
  town(x, y) { const t = World.townAt(x, y); return t && t.kingsport ? t : null; },
  playerIn() { const P = G.player; return !!P && this.inCity(P.x, P.y); },
  stats() { return G.stats; },

  reset() {
    this.dressed = new WeakSet(); this.was = false; this.heatWas = 0; this.tollT = 60; this.box = null;
    this.smuggler = this.promoter = this.dealer = null; this.trolleys = [];
    for (const line of World.kpTrolleys || []) for (let k = 0; k < 2; k++) this.trolleys.push({ line, pos: k ? line.to : line.from, dir: k ? -1 : 1, stopT: 0, x: 0, y: 0, bellT: 0 });
    this.trolleys.forEach(t => this.place(t));
  },

  /* ------------------------------------------------ people */
  dress() {
    for (const a of G.actors) {
      if (this.dressed.has(a) || a.dead) continue;
      const kt = a.town && (KP_NAMES.includes(a.town) || a.town === 'Iron Island' || a.town === 'Gull Harbor');
      if (a.faction === 'law' && (kt || (a.temp && this.inCity(a.x, a.y)))) {
        a.pal = Object.assign({}, PAL.police, Looks.face(), { hatType: 'helmet', mustache: chance(0.5) ? pick(['#2a1a10', '#5a3a20', '#8a8a8a']) : null });
        if (a.shopId === 'kp_police') a.name = 'Chief Inspector Callahan';
        else if (a.shopId === 'kp_prison') a.name = 'Warden Graves';
        else a.name = (a.town === 'Iron Island' ? 'Guard ' : 'Officer ') + pick(LAST);
        if (!a.shopId && !a.mission) a.weapon = a.town === 'Iron Island' ? pick(['repeater', 'shotgun']) : pick(['schofield', 'da', 'sa', 'da', 'shotgun']);
      } else if (a.camp && a.camp.gang) {
        const g = KP_GANGS[a.camp.gang];
        a.pal = Object.assign({}, a.pal, g.pal, Looks.face());
        a.name = pick(['"Knuckles" ', '"Slim" ', '"Red" ', '"Squint" ', '"Dutch" ', '"Lefty" ', '"Muggsy" ', '']) + pick(LAST);
        a.weapon = pick(['sa', 'da', 'sawedoff', 'pump', 'navy', 'knife']);
      } else if (a.kind === 'clerk' && KP_CLERKS[a.shopId] && a.name === 'Clerk') a.name = KP_CLERKS[a.shopId];
      else if (a.kind === 'civilian' && kt && a.pal && !a.pal.dress && a.town !== 'Gull Harbor') {
        const rich = a.town === 'Nob Heights' || a.town === 'Downtown Kingsport';
        a.pal = Object.assign({}, a.pal, { hatType: rich ? pick(['top', 'bowler', 'bowler']) : pick(['flat', 'bowler', 'flat']), hat: pick(['#1a1a1a', '#2a2420', '#3a3030', '#4a4038']), coat: rich ? pick(['#1a1a24', '#2a2a2a', '#3a2a22', '#2a3040']) : a.pal.coat });
      }
      this.dressed.add(a);
    }
  },
  ensureNPCs() {
    const L = World.kpLandmarks; if (!L) return;
    const mk = (key, name, x, y, o) => { let a = G.actors.find(x => x.kpRole === key && !x.dead); if (!a) { a = spawnActor('civilian', x, y, Object.assign({ name, post: { x, y, face: Math.PI / 2 }, home: { x, y }, invuln: true, cash: 0 }, o)); a.kpRole = key; } return a; };
    const mid = b => ({ x: (b.x + b.w / 2) * TS, y: (b.y + 3) * TS });
    const gym = mid(L.kp_gym), card = mid(L.kp_cardroom), pier = World.kpPiers[2] || World.kpPiers[0];
    this.promoter = mk('promoter', 'Mick "The Anvil" Doyle', gym.x - 30, gym.y, { pal: Object.assign({}, CIV_PALS[0], { coat: null, vest: '#5a1a1a', shirt: '#e8e0d0', hatType: 'flat', hat: '#2a2a2a' }), town: 'The Flats' });
    this.dealer = mk('dealer', 'Dealer Vance', card.x + 10, card.y + 20, { pal: Object.assign({}, CIV_PALS[0], { coat: null, vest: '#1a1a1a', shirt: '#f0f0f0', hatType: 'none', hair: '#2a1a10' }), town: 'Downtown Kingsport' });
    this.smuggler = mk('smuggler', 'Fingers Malone', pier.x - 120, pier.y, { pal: Object.assign({}, KP_GANGS.hooks.pal, { skin: '#c89a74', bandana: null }), town: 'The Waterfront' });
    // guards on Iron Island
    if (L.island && G.actors.filter(a => a.kpPrison && !a.dead).length < 4 && dist(G.player.x, G.player.y, L.island.x, L.island.y) > 600) {
      for (const [dx, dy] of [[-6, 2], [6, 2], [-10, -6], [10, -6]]) {
        const x = L.island.x + dx * TS, y = L.island.y + dy * TS;
        const a = spawnActor('lawman', x, y, { town: 'Iron Island', post: { x, y, face: Math.PI / 2 } }); a.kpPrison = true;
      }
    }
  },

  /* ------------------------------------------------ trolleys */
  place(t) { const L = t.line; if (L.axis === 'x') { t.x = t.pos * TS; t.y = L.fixed * TS + 12; } else { t.x = L.fixed * TS + 8; t.y = t.pos * TS; } },
  trolleyUpdate(dt) {
    const P = G.player;
    for (const t of this.trolleys) {
      t.bellT -= dt;
      if (t.stopT > 0) { t.stopT -= dt; continue; }
      const L = t.line, before = t.pos;
      t.pos += t.dir * 2.6 * dt;
      if (t.pos >= L.to || t.pos <= L.from) { t.pos = clamp(t.pos, L.from, L.to); t.dir *= -1; t.stopT = 6; }
      for (const s of L.stops) { const sp = L.axis === 'x' ? s.x : s.y; if ((before - sp) * (t.pos - sp) <= 0 && before !== sp) { t.stopT = 4; if (dist(t.x, t.y, P.x, P.y) < 400) Sound.play('bell', t.x, t.y, 0.25); } }
      this.place(t);
      // anyone standing on the rails gets shoved aside
      const hx = L.axis === 'x' ? 26 : 12, hy = L.axis === 'x' ? 10 : 22;
      if (!P.dead && Math.abs(P.x - t.x) < hx && Math.abs(P.y - (t.y - (L.axis === 'x' ? 4 : 10))) < hy) {
        if (L.axis === 'x') P.y += P.y < t.y - 4 ? -3 : 3; else P.x += P.x < t.x ? -3 : 3;
        if (t.bellT <= 0) { t.bellT = 3; Sound.play('bell', t.x, t.y, 0.6); UI.notify('Clang clang! Mind the trolley.', 'info'); }
      }
    }
  },
  trolleySprite(t) {
    return { y: t.y + 2, draw: ctx => {
      const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), w, h); };
      const x = t.x, y = t.y, green = '#2a5a3a', cream = '#e8dcb8', moving = t.stopT <= 0, bob = moving ? Math.round(Math.sin(Game.t * 14)) : 0;
      Sprites.shadow(ctx, x, y, t.line.axis === 'x' ? 26 : 12, 4);
      if (t.line.axis === 'x') {
        const hx = x + t.dir * 34;   // the horse pulling it
        R('#6a4426', hx - 7, y - 12 + bob, 14, 7); R('#4a2c16', hx + t.dir * 6 - 2, y - 16 + bob, 5, 6); R('#3a2414', hx - 6, y - 5, 2, 5); R('#3a2414', hx + 4, y - 5, 2, 5);
        R('#2a1a10', Math.min(x, hx) + 20 * (t.dir > 0 ? 1 : 0) - (t.dir > 0 ? 0 : -14), y - 10, 8, 1);
        R('#1a1a1a', x - 24, y - 4, 48, 3); R('#2a2a2a', x - 20, y - 2, 6, 3); R('#2a2a2a', x + 14, y - 2, 6, 3);
        R(green, x - 24, y - 26, 48, 22); R(cream, x - 24, y - 19, 48, 4); R('#1e4a2e', x - 24, y - 6, 48, 2);
        for (let i = -20; i < 20; i += 8) { R('#2a3a40', x + i, y - 24, 6, 5); R('#8ab0c0', x + i, y - 24, 2, 2); }
        R('#5a2a1a', x - 26, y - 30, 52, 4); R('#7a3a2a', x - 26, y - 30, 52, 1);
        Sprites.pixelText(ctx, 'KINGSPORT', x - 17, y - 18, '#2a3a2a');
      } else {
        R('#1a1a1a', x - 11, y - 4, 22, 3);
        R(green, x - 11, y - 38, 22, 34); R(cream, x - 11, y - 26, 22, 4); R('#5a2a1a', x - 12, y - 41, 24, 4);
        R('#2a3a40', x - 8, y - 35, 16, 7); R('#8ab0c0', x - 8, y - 35, 3, 2); R('#ffd870', x - 2, y - 12, 4, 3);
        const hy = y + t.dir * 18; R('#6a4426', x - 4, hy - 10 + bob, 8, 12); R('#4a2c16', x - 3, hy + (t.dir > 0 ? 1 : -14) + bob, 6, 5);
      }
    } };
  },
  stops() { const out = []; for (const L of World.kpTrolleys || []) for (const s of L.stops) out.push(Object.assign({ line: L }, s)); return out; },
  stopSprite(s) {
    const x = (s.line.axis === 'x' ? s.x : s.x + 2) * TS + 8, y = (s.line.axis === 'x' ? s.y + 2 : s.y) * TS + 14;
    return { y, draw: ctx => { const R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); }; R('#2a2a2a', x, y - 22, 2, 22); R('#2a5a3a', x - 8, y - 30, 18, 9); R('#e8dcb8', x - 7, y - 29, 16, 7); Sprites.pixelText(ctx, 'STOP', x - 6, y - 28, '#2a3a2a'); } };
  },
  ride(from) {
    const P = G.player;
    const choices = this.stops().filter(s => s !== from && !(s.x === from.x && s.y === from.y)).map(s => ({ label: `${s.name} (${s.line.name})`, value: s })).concat([{ label: 'Never mind', value: null }]);
    UI.dialogue([{ who: 'Conductor', text: 'One dollar, any stop on either line. Hold on to your hat.' }], null, { choices, onChoose: s => {
      if (!s) return;
      if (P.money < 1) { UI.notify('You need $1 for the fare.', 'warn'); return; }
      if (Law.heat > 0) { UI.notify("The conductor won't let a wanted man aboard.", 'warn'); return; }
      P.money -= 1; Sound.play('bell', P.x, P.y, 0.6);
      const sp = World.findOpen((s.line.axis === 'x' ? s.x : s.x + 3) * TS + 8, (s.line.axis === 'x' ? s.y + 3 : s.y) * TS + 8, 8) || { x: s.x * TS, y: s.y * TS };
      P.x = sp.x; P.y = sp.y; G.time += 10; UI.fade(0.8);
      G.stats.kpRides = (G.stats.kpRides || 0) + 1;
      UI.notify(`You ride the horse-car to ${s.name}.`, 'info');
    } });
  },

  /* ------------------------------------------------ law: whistles and call boxes */
  lawUpdate() {
    const P = G.player;
    if (Law.heat > this.heatWas && this.playerIn()) {
      const cop = G.actors.filter(a => a.faction === 'law' && !a.dead).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y))[0];
      Sound.play('whistle', cop ? cop.x : P.x, cop ? cop.y : P.y, 1);
      if (this.heatWas === 0) UI.notify('Police whistles! Officers at the call boxes are summoning help.', 'crime');
    }
    this.heatWas = Law.heat;
  },

  /* ------------------------------------------------ gang tolls */
  tollUpdate(dt) {
    const P = G.player, T = this.town(P.x, P.y);
    for (const a of G.actors) if (a.toll && !a.dead) {
      a.tollT += dt;
      if (a.tollLeave && (dist(a.x, a.y, P.x, P.y) > 700 || a.tollT > 60)) a.removeMe = true;
      if (!a.tollAsked && !a.tollLeave && dist(a.x, a.y, P.x, P.y) < 76 && !UI.dlg) this.askToll(a);
      if (a.tollT > 90 && !a.aggro) a.removeMe = true;
    }
    this.tollT -= dt;
    if (this.tollT > 0) return;
    this.tollT = rand(70, 130);
    if (!T || Law.heat > 0 || MissionSys.active || P.inBuilding || P.dead) return;
    const gk = Object.keys(KP_GANGS).find(k => KP_GANGS[k].turf === T.name); if (!gk) return;
    const camp = World.banditCamps.find(c => c.gang === gk);
    if (!camp || !camp.members.some(a => !a.dead) || G.actors.some(a => a.toll && !a.dead) || !chance(0.55)) return;
    const sp = World.randomOpenNear(P.x, P.y, 200, 300, (x, y) => Game.onScreen(x, y, 10) || World.tileAtPx(x, y) === T.FLOOR); if (!sp) return;
    const g = KP_GANGS[gk], crew = [];
    for (let i = 0; i < 2; i++) {
      const a = spawnActor('rival', sp.x + i * 14, sp.y, { encounter: true, temp: true, weapon: pick(['sa', 'da', 'knife', 'sawedoff']), cash: randi(5, 25), name: pick(LAST) });
      a.pal = Object.assign({}, a.pal, g.pal, Looks.face()); a.preferLaw = true; a.toll = gk; a.tollT = 0; crew.push(a); this.dressed.add(a);
    }
    crew.forEach(a => a.tollCrew = crew);
  },
  askToll(a) {
    const g = KP_GANGS[a.toll], P = G.player, fee = 10 + Math.floor(Progress.level ? Progress.level() * 2 : 0);
    for (const m of a.tollCrew) m.tollAsked = true;
    UI.dialogue([{ who: a.name, text: `${g.warn.split('.')[0]}. Toll's $${fee}, friend. Pay up and walk on.` }], null, { choices: [{ label: `Pay $${fee}`, value: 'pay' }, { label: 'Refuse', value: 'no' }], onChoose: v => {
      if (v === 'pay' && P.money >= fee) { P.money -= fee; Sound.play('coin'); for (const m of a.tollCrew) { m.encounter = false; m.tollLeave = true; m.bark(pick(['Pleasure doing business.', 'Smart.', 'See you around.']), true); } }
      else { for (const m of a.tollCrew) { m.preferLaw = false; m.aggro = true; m.forceHostile = true; } a.bark(v === 'pay' ? "You're short. Wrong answer." : 'Wrong answer!', true); }
    } });
  },

  /* ------------------------------------------------ boxing */
  boxOffer() {
    const P = G.player;
    if (this.box) return;
    UI.dialogue([{ who: this.promoter.name, text: 'Three-minute bouts, bare knuckles, no iron. Knock him silly and the house pays double your stake. Pick up a gun in my ring and you forfeit.' }], null,
      { choices: [10, 25, 50].map(v => ({ label: `Fight for $${v}`, value: v })).concat([{ label: 'Not today', value: null }]), onChoose: v => {
        if (!v) return; if (P.money < v) { UI.notify(`You need $${v}.`, 'warn'); return; }
        P.money -= v; this.startBout(v);
      } });
  },
  startBout(stake) {
    const P = G.player, b = World.kpLandmarks.kp_gym, cx = (b.x + b.w / 2) * TS, cy = (b.y + b.h / 2) * TS;
    const wins = G.stats.kpBouts || 0, tough = Math.min(4, wins);
    const name = ['Kid Mulroney', 'Paddy "Bricks" Byrne', 'Jack Sharkey', 'Battling Nelson', '"Iron" Hanlon'][tough];
    const opp = spawnActor('rival', cx + 26, cy, { name, weapon: 'fists', noRole: true, hp: 110 + tough * 20, temp: true, cash: 0, skill: 0.5 + tough * 0.08 });
    opp.pal = Object.assign({}, opp.pal, { hatType: 'none', hair: pick(['#2a1a10', '#8a4a20', '#1a1a1a']), shirt: opp.pal.skin, coat: null, vest: null, pants: '#2a2a3a', bandana: null });
    opp.preferLaw = true; opp.boxer = true; this.dressed.add(opp);
    P.x = cx - 26; P.y = cy; P.cur = 'fists';
    this.box = { opp, stake, t: 0, started: false };
    UI.notify(`${name} steps into the ring. Fists only!`, 'mission');
  },
  boxUpdate(dt) {
    const B = this.box; if (!B) return;
    const P = G.player, o = B.opp; B.t += dt; o.weapon = 'fists'; o.role = null;
    if (!B.started && B.t > 3) { B.started = true; o.preferLaw = false; o.aggro = true; o.forceHostile = true; Sound.play('bell', P.x, P.y, 0.8); UI.notify('DING! Fight!', 'warn'); }
    const end = (won, msg) => {
      o.aggro = false; o.forceHostile = false; o.preferLaw = true; o.target = null; o.post = { x: o.x, y: o.y, face: Math.PI }; o.boxerDone = true;
      setTimeout(() => { o.removeMe = true; }, 6000);
      if (won) { Economy.addMoney(B.stake * 2); G.stats.kpBouts = (G.stats.kpBouts || 0) + 1; Progress.add(40); }
      UI.notify(msg, won ? 'good' : 'bad'); Sound.play('bell', P.x, P.y, 0.8); this.box = null;
    };
    if (o.dead || o.hp <= o.maxHp * 0.3) { if (o.dead) o.dead = false; o.hp = Math.max(o.hp, 10); end(true, `${o.name} is down for the count! You win $${B.stake * 2}.`); }
    else if (P.hp <= 30 || P.dead) { P.hp = Math.max(P.hp, 30); end(false, `You hit the canvas. ${o.name} takes the purse.`); }
    else if (B.started && P.cur !== 'fists') end(false, 'You pulled a weapon in the ring. Disqualified!');
    else if (dist(P.x, P.y, o.x, o.y) > 400) end(false, 'You ran out of the ring. Forfeit!');
    else if (B.t > 183) end(o.hp / o.maxHp < P.hp / P.maxHp, `Time! The judges ${o.hp / o.maxHp < P.hp / P.maxHp ? `give it to you. You win $${B.stake * 2}` : `give it to ${o.name}`}.`);
  },

  /* ------------------------------------------------ poker (five-card draw, simplified) */
  deck() { const d = []; for (let s = 0; s < 4; s++) for (let r = 2; r <= 14; r++) d.push({ r, s }); for (let i = d.length - 1; i > 0; i--) { const j = randi(0, i); [d[i], d[j]] = [d[j], d[i]]; } return d; },
  cardText(c) { return ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' }[c.r] || String(c.r)) + '♠♥♦♣'[c.s]; },
  score(hand) {
    const rs = hand.map(c => c.r).sort((a, b) => b - a), cnt = {}; rs.forEach(r => cnt[r] = (cnt[r] || 0) + 1);
    const groups = Object.entries(cnt).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
    const flush = hand.every(c => c.s === hand[0].s), uniq = [...new Set(rs)];
    let straight = uniq.length === 5 && rs[0] - rs[4] === 4, top = rs[0];
    if (uniq.length === 5 && rs.join() === '14,5,4,3,2') { straight = true; top = 5; }
    const kick = groups.map(g => g[1]);
    if (straight && flush) return [8, top];
    if (groups[0][0] === 4) return [7, ...kick];
    if (groups[0][0] === 3 && groups[1][0] === 2) return [6, ...kick];
    if (flush) return [5, ...rs];
    if (straight) return [4, top];
    if (groups[0][0] === 3) return [3, ...kick];
    if (groups[0][0] === 2 && groups[1][0] === 2) return [2, ...kick];
    if (groups[0][0] === 2) return [1, ...kick];
    return [0, ...rs];
  },
  cmp(a, b) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const d = (a[i] || 0) - (b[i] || 0); if (d) return d; } return 0; },
  handName(s) { return ['High card', 'A pair', 'Two pair', 'Three of a kind', 'A straight', 'A flush', 'A full house', 'Four of a kind', 'A straight flush'][s[0]]; },
  pokerOffer() {
    const P = G.player;
    UI.dialogue([{ who: this.dealer.name, text: 'Five-card draw, gentlemen\'s rules. Ante up, look at your cards, trade any you like, then call or fold.' }], null,
      { choices: [5, 20, 50].map(v => ({ label: `$${v} ante`, value: v })).concat([{ label: 'Leave the table', value: null }]), onChoose: v => { if (!v) return; if (P.money < v * 2) { UI.notify(`You need $${v * 2} to sit at that table.`, 'warn'); return; } setTimeout(() => this.pokerHand(v), 200); } });
  },
  pokerHand(ante) {
    const P = G.player, d = this.deck(), me = d.splice(0, 5), rivals = ['Colonel Bixby', 'Widow Harrow', 'Slick Eddie'].map(n => ({ n, h: d.splice(0, 5) }));
    P.money -= ante; let pot = ante * 4;
    const show = h => h.map(c => this.cardText(c)).join('  ');
    // the rivals draw: keep pairs or better, else keep the two highest
    for (const r of rivals) { const s = this.score(r.h); if (s[0] < 1) { r.h.sort((a, b) => b.r - a.r); r.h.splice(2, 3, ...d.splice(0, 3)); } else if (s[0] < 4) { const keep = r.h.filter(c => r.h.filter(x => x.r === c.r).length > 1); r.h = keep.concat(d.splice(0, 5 - keep.length)); } }
    const sorted = me.slice().sort((a, b) => b.r - a.r);
    const keepPair = me.filter(c => me.filter(x => x.r === c.r).length > 1);
    UI.dialogue([{ who: 'Your hand', text: `${show(me)}\n${this.handName(this.score(me))}. Which cards do you keep?` }], null, { choices: [
      { label: 'Stand pat (keep all five)', value: 5 }, { label: keepPair.length ? 'Keep the matched cards, draw the rest' : 'Keep the two high cards, draw three', value: 'smart' }, { label: 'Throw them all back, draw five', value: 0 }], onChoose: v => {
      let hand = me;
      if (v === 'smart') { const keep = keepPair.length ? keepPair : sorted.slice(0, 2); hand = keep.concat(d.splice(0, 5 - keep.length)); }
      else if (v === 0) hand = d.splice(0, 5);
      const mine = this.score(hand);
      setTimeout(() => UI.dialogue([{ who: 'Your hand', text: `${show(hand)}\n${this.handName(mine)}. Betting is $${ante * 2}.` }], null, { choices: [{ label: `Call ($${ante * 2})`, value: true }, { label: 'Fold', value: false }], onChoose: call => {
        if (!call) { UI.notify(`You fold and lose your $${ante} ante.`, 'info'); return; }
        P.money -= ante * 2; pot += ante * 2;
        const inHand = rivals.filter(r => this.score(r.h)[0] >= 1 || chance(0.3));
        pot += inHand.length * ante * 2;
        let best = { n: 'You', s: mine };
        for (const r of inHand) { const s = this.score(r.h); if (this.cmp(s, best.s) > 0) best = { n: r.n, s }; }
        const lines = inHand.map(r => `${r.n}: ${show(r.h)} (${this.handName(this.score(r.h)).toLowerCase()})`).join('\n') || 'Everyone else folds.';
        if (best.n === 'You') { Economy.addMoney(pot); G.stats.kpPokerWon = Math.max(G.stats.kpPokerWon || 0, pot); }
        setTimeout(() => UI.dialogue([{ who: this.dealer.name, text: `${lines}\n\n${best.n === 'You' ? `Your ${this.handName(mine).replace(/^A /, '').toLowerCase()} takes the $${pot} pot.` : `${best.n} takes the $${pot} pot with ${this.handName(best.s).toLowerCase()}.`}` }], null,
          { choices: [{ label: 'Deal me in again', value: true }, { label: 'Cash out', value: false }], onChoose: again => { if (again) { if (P.money < ante * 3) UI.notify('You\'re out of chips for that table.', 'warn'); else setTimeout(() => this.pokerHand(ante), 200); } } }), 200);
      } }), 200);
    } });
  },

  /* ------------------------------------------------ opera, newspaper */
  opera() {
    const P = G.player, h = Env.hour();
    if (h < 17 || h > 22.5) { UI.notify('The box office opens at 5 PM. The curtain rises at 7.', 'info'); return; }
    if (P.money < 8) { UI.notify('A seat costs $8.', 'warn'); return; }
    if (Law.heat > 0) { UI.notify('The usher takes one look at you and calls for the police.', 'warn'); return; }
    P.money -= 8; G.time += 170; P.hp = P.maxHp || 100; UI.fade(2);
    G.stats.kpOpera = (G.stats.kpOpera || 0) + 1; Progress.add(15);
    UI.notify(`You take a seat for ${pick(['"The Barber of Seville"', '"La Traviata"', '"The Pirates of Penzance"', '"Carmen"', '"H.M.S. Pinafore"', '"Faust"'])}. It is magnificent. You leave rested.`, 'good');
  },
  newspaper() {
    const P = G.player, day = Math.floor(G.time / 1440);
    if (G.world.kpPaperDay === day) { UI.notify("You've already read today's Herald.", 'info'); return; }
    if (P.money < 1) { UI.notify('The Herald costs a dollar.', 'warn'); return; }
    P.money -= 1; G.world.kpPaperDay = day;
    const r = rand(1), head = pick(KP_HEADLINES);
    if (r < 0.45) { UI.notify(`THE KINGSPORT HERALD: "${head}". In the classifieds, a dying sailor's map...`, 'mission'); Economy.revealTreasure(); }
    else if (r < 0.75) { const tip = pick(['kp_jewel', 'kp_mansion', 'kp_payroll']); G.world.kpTip = tip; UI.notify(`THE KINGSPORT HERALD: "${head}". The society page gives something away: ${({ kp_jewel: 'Van Doren just took delivery of the Duchess diamonds', kp_mansion: 'the Ashfords are away and their silver is not', kp_payroll: 'the railroad doubles this week\'s payroll' })[tip]}. (Next ${({ kp_jewel: 'jewelry', kp_mansion: 'mansion', kp_payroll: 'payroll' })[tip]} heist pays 30% more.)`, 'mission'); }
    else UI.notify(`THE KINGSPORT HERALD: "${head}". Nothing useful today.`, 'info');
  },

  /* ------------------------------------------------ smuggling */
  smuggleOffer() {
    const P = G.player, day = Math.floor(G.time / 1440);
    if (G.world.kpSmuggleDay === day) { UI.notify(`${this.smuggler.name}: "Nothing more today. Come back tomorrow."`, 'info'); return; }
    if (MissionSys.active) { UI.notify('Finish what you are doing first.', 'info'); return; }
    const drops = [['Gull Harbor', World.poi.gullHarbor, 160], ...World.kpFarms.map(f => [f.name, f, 120]), ['Port Harlow', World.townWaypoints['Port Harlow'] && World.townWaypoints['Port Harlow'][2], 220]].filter(d => d[1]);
    const pickd = drops.sort(() => Math.random() - 0.5).slice(0, 3);
    UI.dialogue([{ who: this.smuggler.name, text: 'Crate of French brandy, no tax stamp. The buyer pays on delivery. Coppers see you hauling it, they\'ll want a word, so keep off the main avenues.' }], null,
      { choices: pickd.map(([n, p, pay]) => ({ label: `${n}: $${pay}`, value: [n, p, pay] })).concat([{ label: 'Not my line of work', value: null }]), onChoose: v => { if (v) this.startSmuggle(...v); } });
  },
  startSmuggle(name, p, pay) {
    G.world.kpSmuggleDay = Math.floor(G.time / 1440);
    const id = 'kps_' + Date.now() % 100000, dest = { x: p.x, y: p.y };
    const m = { id, title: `Contraband for ${name}`, giverName: this.smuggler.name, side: true, reward: 0, kpSmuggle: true };
    m.stages = [Object.assign(St.go(`Deliver the crate of brandy to the buyer at ${name}. Stay out of sight of the police.`, dest, 90, { label: 'Buyer' }), { enter: () => { this.carrying = true; UI.notify('You heft the crate onto your shoulder.', 'info'); } })];
    m.onComplete = () => { this.carrying = false; Economy.addMoney(pay); G.stats.kpSmuggled = (G.stats.kpSmuggled || 0) + 1; Progress.add(35); UI.notify(`The buyer counts out $${pay}.`, 'good'); MissionSys.list = MissionSys.list.filter(x => x !== m); MissionSys.completed = MissionSys.completed.filter(x => x !== m.id); G.stats.missions = Math.max(0, G.stats.missions - 1); };
    m.cleanup = () => { this.carrying = false; MissionSys.list = MissionSys.list.filter(x => x !== m); };
    MissionSys.list.push(m); MissionSys.start(id);
  },
  smuggleUpdate() {
    if (!this.carrying) return;
    if (!MissionSys.active || !MissionSys.active.kpSmuggle) { this.carrying = false; return; }
    const P = G.player;
    if (Law.heat > 0) return;
    for (const a of G.actors) if (a.faction === 'law' && !a.dead && !a.inside && dist(a.x, a.y, P.x, P.y) < 150 && World.los(a.x, a.y - 8, P.x, P.y - 8, SOL.VIS)) {
      a.bark('Hey! What\'s in the crate?', true); Law.report('smuggling', P.x, P.y); a.engaged = true; return;
    }
  },

  /* ------------------------------------------------ interactions */
  interactions() {
    const P = G.player, out = [];
    if (!World.kpLandmarks || P.dead) return out;
    const near = (a, r = 34) => a && !a.dead && dist(P.x, P.y, a.x, a.y) < r;
    if (near(this.promoter) && !this.box) out.push({ label: 'Box at the Ironworks', x: this.promoter.x, y: this.promoter.y + 4, r: 34, priority: 4, act: () => this.boxOffer() });
    if (near(this.dealer)) out.push({ label: 'Play poker', x: this.dealer.x, y: this.dealer.y + 4, r: 34, priority: 4, act: () => this.pokerOffer() });
    if (near(this.smuggler)) out.push({ label: `Talk to ${this.smuggler.name}`, x: this.smuggler.x, y: this.smuggler.y + 4, r: 34, priority: 4, act: () => this.smuggleOffer() });
    if (!this.playerIn()) return out;
    const op = World.kpLandmarks.kp_opera; if (op) { const dx = op.door.x * TS + 8, dy = (op.door.y + 1) * TS + 4; if (dist(P.x, P.y, dx, dy) < 30) out.push({ label: 'Buy an opera ticket ($8)', x: dx, y: dy, r: 30, priority: 3, act: () => this.opera() }); }
    if (!this.stands) this.stands = World.props.filter(p => p.t === 'newsstand');
    for (const s of this.stands) if (dist(P.x, P.y, s.x, s.y) < 30) out.push({ label: 'Buy the Kingsport Herald ($1)', x: s.x, y: s.y, r: 30, priority: 3, act: () => this.newspaper() });
    if (!P.mounted) for (const s of this.stops()) { const sx = s.x * TS + 8, sy = s.y * TS + 8; if (dist(P.x, P.y, sx, sy) < 46) out.push({ label: 'Ride the trolley ($1)', x: sx, y: sy, r: 46, priority: 3, act: () => this.ride(s) }); }
    return out;
  },

  update(dt) {
    if (!World.kpLandmarks || !G.player) return;
    const P = G.player;
    this.dress();
    if (!this.promoter || this.promoter.dead || Math.random() < 0.002) this.ensureNPCs();
    this.trolleyUpdate(dt); this.lawUpdate(); this.tollUpdate(dt); this.boxUpdate(dt); this.smuggleUpdate();
    const inside = this.playerIn();
    if (inside !== this.was) {
      if (inside) {
        UI.regionToast('KINGSPORT');
        if (!G.world.discovered.includes('Kingsport')) { G.world.discovered.push('Kingsport'); UI.notify('Kingsport! Cobblestones, gaslights and forty thousand souls. The police here wear blue and carry whistles, and the gangs keep their own turf.', 'mission'); Progress.add(50); }
      }
      this.was = inside;
    }
  },
  sortables() {
    const out = [];
    if (!World.kpTrolleys) return out;
    const c = G.cam, near = (x, y) => x > c.x - 80 && x < c.x + Game.vw + 80 && y > c.y - 40 && y < c.y + Game.vh + 80;
    for (const t of this.trolleys) if (near(t.x, t.y)) out.push(this.trolleySprite(t));
    for (const s of this.stops()) { const sp = this.stopSprite(s); if (near(s.x * TS, s.y * TS)) out.push(sp); }
    return out;
  },
  drawGround(ctx) {
    if (!World.kpTrolleys) return;
    const c = G.cam, R = (col, x, y, w, h) => { ctx.fillStyle = col; ctx.fillRect(x, y, w, h); };
    for (const L of World.kpTrolleys) {
      if (L.axis === 'x') { const y = L.fixed * TS + 8, x0 = Math.max(L.from * TS, c.x - 20), x1 = Math.min(L.to * TS + 16, c.x + Game.vw + 20); if (x1 < x0 || y < c.y - 20 || y > c.y + Game.vh + 20) continue;
        R('#4a4440', x0, y - 5, x1 - x0, 2); R('#4a4440', x0, y + 4, x1 - x0, 2); R('#9a948a', x0, y - 5, x1 - x0, 1); R('#9a948a', x0, y + 4, x1 - x0, 1); }
      else { const x = L.fixed * TS + 8, y0 = Math.max(L.from * TS, c.y - 20), y1 = Math.min(L.to * TS + 16, c.y + Game.vh + 20); if (y1 < y0 || x < c.x - 20 || x > c.x + Game.vw + 20) continue;
        R('#4a4440', x - 5, y0, 2, y1 - y0); R('#4a4440', x + 4, y0, 2, y1 - y0); R('#9a948a', x - 5, y0, 1, y1 - y0); R('#9a948a', x + 4, y0, 1, y1 - y0); }
    }
  }
};

/* ---------------------------------------------------------------- patches */
(function () {
  // boxers only fight you, never the police
  const hostile = npcHostile;
  npcHostile = function (a, b) { if (a.boxer || b.boxer || a.toll && a.preferLaw || b.toll && b.preferLaw) return false; return hostile(a, b); };

  // city gangs warn you off their hideouts in their own words
  const rivalAI = Actor.prototype.rivalAI;
  Actor.prototype.rivalAI = function (dt) {
    const c = this.camp, P = G.player;
    if (c && c.gang && !this.aggro && c.warnAt === undefined && !P.dead && this.canSee(P, 260) && dist(this.x, this.y, P.x, P.y) < 175) {
      c.warnAt = Combat.t; const g = KP_GANGS[c.gang];
      this.bark(g.warn, true); UI.notify(`${c.name}: the ${g.name} are warning you off. Leave, or they'll start shooting.`, 'warn');
    }
    return rivalAI.call(this, dt);
  };

  // police reinforcements come running from the nearest call box, on foot
  const backup = Law.spawnBackup.bind(Law);
  Law.spawnBackup = function () {
    const P = G.player;
    if (!Kingsport.inCity(P.x, P.y) || !World.kpCallboxes) return backup();
    let near = 0;
    for (const a of G.actors) if (a.faction === 'law' && !a.dead && !a.inside && dist(a.x, a.y, P.x, P.y) < 700) near++;
    const max = this.heat + 2 + (G.settings.difficulty === 'hard' ? 1 : 0);
    if (near >= max) return;
    const boxes = World.kpCallboxes.filter(b => dist(b.x, b.y, P.x, P.y) < 700 && !Game.onScreen(b.x, b.y, 10)).sort((a, b) => dist(a.x, a.y, P.x, P.y) - dist(b.x, b.y, P.x, P.y));
    if (!boxes.length) return backup();
    const n = Math.min(max - near, this.heat >= 3 ? 3 : 2);
    for (let i = 0; i < n; i++) {
      const bx = boxes[i % boxes.length], sp = World.findOpen(bx.x, bx.y + 10, 4) || bx;
      const a = spawnActor('lawman', sp.x, sp.y, { temp: true, weapon: this.heat >= 3 ? pick(['repeater', 'shotgun', 'pump']) : pick(['schofield', 'da', 'shotgun']) });
      a.engaged = true;
    }
    Sound.play('whistle', boxes[0].x, boxes[0].y, 0.8);
    if (!this.backupNotified) { this.backupNotified = true; UI.notify('Officers are answering the call boxes!', 'crime'); }
  };

  // the police whistle
  const play = Sound.play.bind(Sound);
  Sound.play = function (name, x, y, vol = 1) {
    if (name === 'whistle') {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const sp = x === undefined ? { g: 1, p: 0 } : this.spatial(x, y); if (sp.g < 0.01) return;
      const o = this.out(sp.g * vol * 0.5, sp.p), t0 = this.ctx.currentTime + 0.01;
      for (let i = 0; i < 9; i++) this.tone(o, t0 + i * 0.07, i % 2 ? 2650 : 2950, 0.075, 0.22, 'square');
      return;
    }
    return play(name, x, y, vol);
  };

  // the custodian helmet worn by the police
  const hat = Sprites.hat.bind(Sprites);
  Sprites.hat = function (ctx, x, y, p, s) {
    if (p.hatType !== 'helmet') return hat(ctx, x, y, p, s);
    const R = (c, a, b, w, h) => { ctx.fillStyle = c; ctx.fillRect(a, b, w, h); };
    R(p.hat, x - 3, y - 14, 7, 1); R(p.hat, x - 2, y - 18, 5, 4); R(p.hat, x - 1, y - 19, 3, 1); R('#c8a040', x, y - 16, 1, 2); R('rgba(255,255,255,.15)', x - 2, y - 18, 1, 3);
  };

  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'kingsport', name: 'Big City', desc: 'Reach Kingsport.', icon: '♜', test: () => G.world.discovered.includes('Kingsport') },
    { id: 'kpdistricts', name: 'Know Your Way Around', desc: 'Visit all six districts of Kingsport.', icon: '♜', prog: () => [KP_NAMES.filter(n => G.world.discovered.includes(n)).length, 6] },
    { id: 'kpbox', name: 'Prizefighter', desc: 'Win 3 bouts at the Ironworks Athletic Club.', icon: '✊', prog: () => [G.stats.kpBouts || 0, 3] },
    { id: 'kppoker', name: 'Card Sharp', desc: 'Win a poker pot of $200 or more.', icon: '♠', prog: () => [Math.min(200, G.stats.kpPokerWon || 0), 200] },
    { id: 'kpopera', name: 'Patron of the Arts', desc: 'See a show at the Kingsport Opera House.', icon: '♪', prog: () => [G.stats.kpOpera || 0, 1] },
    { id: 'kptrolley', name: 'Fare, Please', desc: 'Ride the Kingsport trolley.', icon: '♜', prog: () => [G.stats.kpRides || 0, 1] },
    { id: 'kpsmuggle', name: 'No Tax Stamp', desc: 'Deliver 3 crates for Fingers Malone.', icon: '⚓', prog: () => [G.stats.kpSmuggled || 0, 3] }
  );
})();

/* ---------------------------------------------------------------- city heists */
(function () {
  if (typeof Heists === 'undefined') return;
  const JOBS = { kp_jewel: ['Van Doren Jewelers', 'kp_jeweler', 1400, 2000], kp_mansion: ['Ashford Mansion', 'kp_mansion', 1200, 1800], kp_payroll: ['the Union Rail payroll', 'kp_payroll', 1700, 2500] };
  const plan = Heists.plan.bind(Heists);
  Heists.plan = function (a) {
    if (Law.heat > 0 || !World.kpLandmarks) return plan(a);
    UI.dialogue([{ who: a.name, text: 'Kingsport or the territory? The city\'s fat with money, but there\'s a copper on every corner.' }], null, { choices: [
      { label: 'Out in the territory', value: 'west' },
      ...Object.entries(JOBS).map(([k, [n]]) => ({ label: this.ready(k) ? `Kingsport: ${n}${G.world.kpTip === k ? ' (Herald tip!)' : ''}` : `${n}: lying low ${this.wait(k)}h`, value: k })),
      { label: 'Not today', value: null }], onChoose: v => {
      if (!v) return; if (v === 'west') { setTimeout(() => plan(a), 200); return; }
      if (!this.ready(v)) { UI.notify("Too soon. They're still watching that one.", 'info'); return; }
      this.start(this.kpJob(a, v));
    } });
  };
  Heists.kpJob = function (planner, key) {
    const [title, bid, lo, hi] = JOBS[key], b = World.kpLandmarks[bid], tip = G.world.kpTip === key;
    const door = { x: b.door.x * TS + 8, y: (b.door.y + 1) * TS + 8 }, inner = { x: (b.x + b.w / 2) * TS, y: (b.y + 2) * TS + 8 };
    const crew = this.crew(), id2 = 'hz_' + (++this.n) + '_' + (Date.now() % 100000);
    const m = { id: id2, title: key === 'kp_payroll' ? 'Rob the Rail Payroll' : `Burgle ${title}`, giverName: planner.name, side: true, reward: 0, noEncounters: true, crewN: crew.length, holdsGivers: crew };
    const ride = St.go(`Ride to Kingsport with ${crew.length ? crew.map(c => CAST[c].name.split(' ')[0].replace(/"/g, '')).join(', ') : 'nobody but yourself'}.`, door, 160, { label: title, stage: { enter: () => Story.squad(crew) } });
    const escape = { text: () => Law.heat > 0 ? 'Get out of the city and lose the police!' : 'Get clear!', enter: () => { Law.heat = Math.max(Law.heat, key === 'kp_payroll' ? 4 : 3); Law.searchT = Law.searchTime(); Law.bounty += key === 'kp_payroll' ? 300 : 180; Sound.play('whistle', door.x, door.y, 1); }, done: () => Law.heat === 0 };
    const home = campStage('Ride back to camp and split the take.');
    const watch = n => () => Array.from({ length: n }, (_, i) => Story.enemy('guard', inner.x + (i - n / 2) * 30, inner.y + 12 + (i % 2) * 20, { name: key === 'kp_mansion' ? 'Ashford Footman' : 'Night Watchman', forceHostile: false, aggro: false, weapon: pick(['da', 'shotgun', 'schofield']) })).map(a => { a.post = { x: a.x, y: a.y, face: rand(TAU) }; a.sentry = true; a.preferLaw = true; return a; });
    if (key === 'kp_payroll') {
      m.stages = [ride,
        St.go('Walk into the payroll office.', inner, 40, { label: 'Paymaster' }),
        St.clear('Railroad police storm the office! Hold them off!', door, () => Story.ring(door, randi(5, 7), 'guard', 120, 240, { name: 'Railroad Police', weapon: pick(['repeater', 'shotgun', 'bolt', 'carbine']) }), { enter: () => { Law.commit('train_robbery', door.x, door.y, { reported: true }); Sound.play('whistle', door.x, door.y, 1); } }),
        St.act('Load the payroll strongbox.', inner, 'Load the payroll', 4, { sound: 'pickup' }), escape, home];
    } else {
      m.stages = [ride,
        St.wait('Wait for the city to go to sleep...', 4, { count: true, enter: () => { Story.night(); UI.notify('Past midnight. The gaslights hiss. Watchmen inside.', 'info'); } }),
        St.sneak(`Slip inside ${title} without the ${key === 'kp_mansion' ? 'footmen' : 'watchmen'} seeing you.`, inner, watch(key === 'kp_mansion' ? 3 : 2), { loud: true, r: 26, label: key === 'kp_mansion' ? 'Wall safe' : 'Display safe' }),
        St.act(key === 'kp_mansion' ? 'Crack the wall safe behind the portrait.' : 'Crack the diamond safe.', inner, 'Crack the safe', 7, { sound: 'click' }),
        escape, home];
    }
    this.finishJob(m, key, Math.round(lo * (tip ? 1.3 : 1)), Math.round(hi * (tip ? 1.3 : 1)), key === 'kp_jewel' ? 1 : randi(1, 3));
    const done = m.onComplete; m.onComplete = () => { if (tip) G.world.kpTip = null; done(); };
    return m;
  };
})();

Hooks.add({ key: 'kingsport', reset: () => Kingsport.reset(), update: dt => Kingsport.update(dt), interactions: () => Kingsport.interactions(), sortables: () => Kingsport.sortables(), drawGround: ctx => Kingsport.drawGround(ctx) });
