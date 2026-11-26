/* Outlaw County — online.js (v2.11)
 * Ride Online: a party of up to 6 friends in one world, peer to peer.
 *
 * One player hosts and gets a code (RATTLER-42). Friends type the code to
 * join. PeerJS (js/lib/peerjs.min.js, MIT) uses its free public service only
 * to introduce the players; after that the games talk to each other directly
 * over WebRTC. The host's game is the referee: it relays everyone's position,
 * decides hits, deaths, bounties, arrests and duels, and pays rewards.
 *
 * Online there's no story. You pick a role: outlaw (crimes put a bounty on
 * you that the party can see), lawman (arrest or stop outlaws, lose the badge
 * for shooting an innocent) or bounty hunter (collect on outlaws). Walk up to
 * a player to challenge them to a duel. B opens the callouts, P the party.
 * Your online character (money, guns, role) is saved apart from story saves.
 */
'use strict';

const ONLINE_VERSION = '2.11.0';
const ONLINE_MAX = 6;
const ONLINE_WORDS = ['RATTLER', 'MUSTANG', 'COYOTE', 'BANDIT', 'SHERIFF', 'CANYON', 'BRONCO', 'LASSO', 'SPUR', 'MESA', 'CACTUS', 'BUCKSHOT', 'DESPERADO', 'POSSE', 'DEPUTY', 'STAMPEDE', 'GOLDRUSH', 'TUMBLEWEED'];
const ROLES = { outlaw: { name: 'Outlaw', icon: '☠', col: '#e05a3a' }, lawman: { name: 'Lawman', icon: '★', col: '#e8c860' }, hunter: { name: 'Bounty Hunter', icon: '⌖', col: '#8ad0ff' } };
const CALLOUTS = ['Draw!', 'Need backup!', 'Nice shot!', 'Surrender?', 'Follow me!', 'Ha!', 'Run!', 'Truce?'];

const Online = {
  active: false, host: false, peer: null, conns: {}, hostConn: null, code: '', myId: '', players: {}, ghosts: {}, sendT: 0, payT: 0, duel: null, freeze: 0, last: {},

  /* ---------------- the character you play online */
  char() {
    let c = null; try { c = JSON.parse(localStorage.getItem('oc-online-char') || 'null'); } catch (e) { /* fresh */ }
    return c || { name: 'Stranger', role: 'outlaw', money: 50, owned: ['fists', 'knife', 'sa'], ammo: { revolver: 48 } };
  },
  saveChar() {
    const P = G.player; if (!this.active || !P) return;
    const c = this.char(), me = this.players[this.myId];
    c.money = P.money; c.owned = Object.keys(P.owned).filter(k => P.owned[k]); c.ammo = Object.assign({}, P.ammo); if (me) c.role = me.role;
    localStorage.setItem('oc-online-char', JSON.stringify(c));
  },
  setName(n) { const c = this.char(); c.name = String(n || '').replace(/[^\w .'-]/g, '').slice(0, 16) || 'Stranger'; localStorage.setItem('oc-online-char', JSON.stringify(c)); return c.name; },

  /* ---------------- connecting */
  makeCode() { return pick(ONLINE_WORDS) + '-' + randi(10, 99); },
  peerId(code) { return 'outlawcounty-' + code.toLowerCase().replace(/[^a-z0-9-]/g, ''); },
  status(t, bad) { const el = $('ol-status'); if (el) { el.textContent = t; el.style.color = bad ? '#ffb0a0' : '#f0e0b8'; } },

  hostParty(tries = 0) {
    if (typeof Peer === 'undefined') { this.status('Online play is unavailable (the network library did not load).', true); return; }
    const code = this.makeCode();
    this.status('Opening your party...');
    const peer = new Peer(this.peerId(code), { debug: 0 });
    peer.on('open', id => { this.peer = peer; this.code = code; this.host = true; this.myId = id; this.begin(); });
    peer.on('connection', conn => this.accept(conn));
    peer.on('error', e => {
      if (e.type === 'unavailable-id' && tries < 5) { peer.destroy(); this.hostParty(tries + 1); return; }
      if (!this.active) this.status(this.netError(e), true); else UI.notify('Network trouble: ' + this.netError(e), 'warn');
    });
    peer.on('disconnected', () => { if (this.active && !peer.destroyed) peer.reconnect(); });
  },
  joinParty(code) {
    if (typeof Peer === 'undefined') { this.status('Online play is unavailable (the network library did not load).', true); return; }
    code = String(code || '').trim().toUpperCase(); if (!/^[A-Z]+-\d\d$/.test(code)) { this.status('Codes look like RATTLER-42.', true); return; }
    this.status(`Looking for party ${code}...`);
    const peer = new Peer({ debug: 0 });
    peer.on('open', id => {
      this.peer = peer; this.myId = id; this.code = code;
      const conn = peer.connect(this.peerId(code), { reliable: true });
      const t = setTimeout(() => { if (!this.active) { this.status(`No party called ${code}. Check the code, or the host's game may be closed.`, true); peer.destroy(); } }, 12000);
      conn.on('open', () => { clearTimeout(t); this.hostConn = conn; const c = this.char(); conn.send({ t: 'hello', ver: ONLINE_VERSION, name: c.name, role: c.role, pal: Looks.playerPal ? Looks.playerPal() : null }); });
      conn.on('data', m => this.onData(m, 'host'));
      conn.on('close', () => this.lost('The host closed the party.'));
      conn.on('error', () => this.lost('Lost the connection to the host.'));
    });
    peer.on('error', e => { if (e.type === 'peer-unavailable') this.status(`No party called ${code}. Check the code, or the host's game may be closed.`, true); else this.status(this.netError(e), true); });
  },
  netError(e) { return e && e.type === 'network' || e && e.type === 'server-error' ? 'Could not reach the matchmaking service. Check your internet connection.' : e && e.type === 'browser-incompatible' ? 'This computer can\'t make direct connections.' : 'Connection failed (' + (e && e.type || 'unknown') + ').'; },

  /* host: a friend knocks */
  accept(conn) {
    conn.on('data', m => {
      if (m.t === 'hello') {
        if (m.ver !== ONLINE_VERSION) { conn.send({ t: 'refused', why: `Your game is version ${m.ver}, the host has ${ONLINE_VERSION}. Update with "Reload & update" first.` }); setTimeout(() => conn.close(), 500); return; }
        if (Object.keys(this.players).length >= ONLINE_MAX) { conn.send({ t: 'refused', why: 'The party is full.' }); setTimeout(() => conn.close(), 500); return; }
        this.conns[conn.peer] = conn;
        this.players[conn.peer] = { id: conn.peer, name: this.uniqueName(m.name), role: ROLES[m.role] ? m.role : 'outlaw', bounty: 0, pal: m.pal, st: null };
        conn.send({ t: 'welcome', id: conn.peer, players: this.roster(), time: G.time, code: this.code });
        this.broadcast({ t: 'roster', players: this.roster() });
        this.event(`${this.players[conn.peer].name} rode into the party.`);
        return;
      }
      this.handle(m, conn.peer);
    });
    conn.on('close', () => this.dropPlayer(conn.peer, 'left the party'));
    conn.on('error', () => this.dropPlayer(conn.peer, 'lost connection'));
  },
  uniqueName(n) { let name = String(n || 'Stranger').slice(0, 16), k = 2; while (Object.values(this.players).some(p => p.name === name)) name = `${n} ${k++}`; return name; },
  dropPlayer(id, why) {
    const p = this.players[id]; if (!p) return;
    delete this.players[id]; delete this.conns[id];
    if (this.duel && (this.duel.a === id || this.duel.b === id)) this.endDuel(null, 'The duel is off.');
    this.broadcast({ t: 'roster', players: this.roster() }); this.event(`${p.name} ${why}.`);
  },
  roster() { return Object.values(this.players).map(p => ({ id: p.id, name: p.name, role: p.role, bounty: p.bounty, pal: p.pal })); },

  /* ---------------- starting and leaving the online world */
  async begin() {
    this.active = true; this.players = this.players || {}; this.ghosts = {};
    const c = this.char();
    if (this.host) this.players[this.myId] = { id: this.myId, name: c.name, role: ROLES[c.role] ? c.role : 'outlaw', bounty: 0, pal: Looks.playerPal ? Looks.playerPal() : null };
    await Game.withLoading('Riding into Kingsport...', () => {
      Game.resetState(); Spawner.initWorld(); G.player = new Player();
      const P = G.player, sp = World.findOpen(World.poi.kingsport.x + rand(-60, 60), World.poi.kingsport.y + 40, 12) || World.poi.kingsport;
      P.x = sp.x; P.y = sp.y; P.money = c.money;
      for (const k of Object.keys(P.owned)) P.owned[k] = false; for (const k of c.owned) if (WEAPONS[k]) P.owned[k] = true; P.owned.fists = true;
      Object.assign(P.ammo, c.ammo || {}); if (!P.owned[P.cur]) P.cur = 'sa';
      G.world.discovered.push('Kingsport'); Game.snapCamera();
    });
    G.state = 'play'; Game.snapCamera(); UI.enterGame(); UI.fade(1.2);
    G.region = World.regionAt(G.player.x, G.player.y);
    this.applyRole();
    UI.notify(this.host ? `Your party is open. Give your friends the code ${this.code}.` : `You joined party ${this.code}.`, 'mission');
    UI.notify('Online: B for callouts, P for the party. Walk up to a player to challenge them to a duel.', 'tip');
    this.renderParty(true);
  },
  leave(msg) {
    if (!this.active && !this.peer) return;
    this.saveChar();
    try { if (this.hostConn) this.hostConn.close(); for (const c of Object.values(this.conns)) c.close(); if (this.peer) this.peer.destroy(); } catch (e) { /* closing anyway */ }
    for (const g of Object.values(this.ghosts)) g.removeMe = true;
    Object.assign(this, { active: false, host: false, peer: null, conns: {}, hostConn: null, players: {}, ghosts: {}, duel: null, freeze: 0, code: '' });
    $('ol-party').classList.add('hidden');
  },
  lost(msg) { if (!this.active) return; this.leave(); Game.toTitle(); this.openMenu(); this.status(msg, true); },

  /* ---------------- messages */
  send(m) { if (this.host) this.handle(m, this.myId); else if (this.hostConn && this.hostConn.open) this.hostConn.send(m); },
  broadcast(m, except) { for (const [id, c] of Object.entries(this.conns)) if (id !== except && c.open) c.send(m); if (except !== this.myId) this.onData(m, 'host'); },
  to(id, m) { if (id === this.myId) this.onData(m, 'host'); else if (this.conns[id] && this.conns[id].open) this.conns[id].send(m); },
  event(text) { this.broadcast({ t: 'event', text }); },

  /* host: the referee */
  handle(m, from) {
    const p = this.players[from]; if (!p) return;
    switch (m.t) {
      case 'st': p.st = m.s; break;
      case 'shot': this.broadcast(Object.assign({}, m, { from }), from); break;
      case 'call': this.broadcast({ t: 'call', from, text: CALLOUTS[m.i] || '...' }); break;
      case 'role': {
        if (!ROLES[m.role] || (m.role !== 'outlaw' && p.bounty > 0)) break;
        p.role = m.role; this.broadcast({ t: 'roster', players: this.roster() }); this.event(`${p.name} is now ${m.role === 'outlaw' ? 'an outlaw' : m.role === 'lawman' ? 'a lawman' : 'a bounty hunter'}.`); break;
      }
      case 'crime': {
        const amt = clamp(m.amt | 0, 0, 500); if (!amt) break;
        if (p.role === 'lawman') { p.role = 'outlaw'; this.to(from, { t: 'badge' }); this.event(`${p.name} broke the law and lost the badge!`); }
        p.bounty += amt; this.broadcast({ t: 'roster', players: this.roster() }); break;
      }
      case 'paybounty': { p.bounty = 0; this.broadcast({ t: 'roster', players: this.roster() }); break; }
      case 'hit': {
        const tgt = this.players[m.to]; if (!tgt || !p.st || !tgt.st) break;
        if (dist(p.st.x, p.st.y, tgt.st.x, tgt.st.y) > 1000) break;                       // can't hit what's that far away
        if (this.duel && this.duel.stage === 'draw' && ((this.duel.a === from && this.duel.b === m.to) || (this.duel.b === from && this.duel.a === m.to))) { this.endDuel(from, null); break; }
        if (this.duel && (this.duel.a === m.to || this.duel.b === m.to || this.duel.a === from || this.duel.b === from)) break;   // duelists can't be shot by others
        this.to(m.to, { t: 'hurt', dmg: clamp(+m.dmg || 0, 0, 400), from, role: p.role });
        break;
      }
      case 'died': this.settleDeath(from, m.by, false); break;
      case 'arrest': {
        const tgt = this.players[m.to]; if (!tgt || !tgt.st || !tgt.st.dn || p.role === 'outlaw') break;
        this.to(m.to, { t: 'arrested', by: p.name }); this.settleDeath(m.to, from, true); break;
      }
      case 'duelAsk': { const tgt = this.players[m.to]; if (!tgt || this.duel) { this.to(from, { t: 'event', text: 'They can\'t duel right now.' }); break; } this.to(m.to, { t: 'duelAsk', from, name: p.name, bet: clamp(m.bet | 0, 0, 100) }); break; }
      case 'duelReply': {
        const ch = this.players[m.to]; if (!ch || this.duel) break;
        if (!m.ok) { this.to(m.to, { t: 'event', text: `${p.name} won't duel.` }); break; }
        const a = ch.st, b = p.st; if (!a || !b) break;
        const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, sp = World.findOpen(cx, cy, 10) || { x: cx, y: cy };
        const pa = World.findOpen(sp.x - 90, sp.y, 6) || { x: sp.x - 90, y: sp.y }, pb = World.findOpen(sp.x + 90, sp.y, 6) || { x: sp.x + 90, y: sp.y };
        this.duel = { a: m.to, b: from, bet: m.bet | 0, stage: 'wait', t0: performance.now() };
        const msg = { t: 'duel', stage: 'wait', a: m.to, b: from, pa, pb, bet: m.bet | 0, na: ch.name, nb: p.name };
        this.to(m.to, msg); this.to(from, msg); this.event(`${ch.name} and ${p.name} are about to duel!`);
        const d = this.duel;
        setTimeout(() => { if (this.duel === d) { d.stage = 'draw'; this.to(d.a, { t: 'duel', stage: 'draw' }); this.to(d.b, { t: 'duel', stage: 'draw' }); } }, 3000 + Math.random() * 2500);
        setTimeout(() => { if (this.duel === d) this.endDuel(null, 'Nobody fired. The duel is a draw.'); }, 30000);
        break;
      }
      case 'foul': if (this.duel && this.duel.stage === 'wait' && (this.duel.a === from || this.duel.b === from)) this.endDuel(this.duel.a === from ? this.duel.b : this.duel.a, `${p.name} drew early. Foul!`); break;
    }
  },
  /* who gets paid when somebody goes down */
  settleDeath(victimId, killerId, arrested) {
    const v = this.players[victimId], k = this.players[killerId]; if (!v) return;
    if (!k || killerId === victimId) { if (!arrested) this.event(`${v.name} died.`); return; }
    if (v.bounty > 0 && k.role !== 'outlaw') {
      const pay = Math.round(v.bounty * (arrested ? 1.5 : 1));
      this.to(killerId, { t: 'pay', amt: pay, msg: `${arrested ? 'Arrested' : 'Brought down'} ${v.name}: $${pay} reward.` });
      this.to(victimId, { t: 'fine', pct: arrested ? 0.15 : 0.1 });
      this.event(`${k.name} ${arrested ? 'arrested' : 'brought down'} ${v.name} for the $${v.bounty} bounty.`);
      v.bounty = 0;
    } else {
      if (k.role === 'lawman') { k.role = 'outlaw'; this.to(killerId, { t: 'badge' }); this.event(`${k.name} shot an innocent and lost the badge!`); }
      k.bounty += 100; this.event(`${k.name} killed ${v.name}. $100 added to ${k.name}'s bounty.`);
    }
    this.broadcast({ t: 'roster', players: this.roster() });
  },
  endDuel(winner, text) {
    const d = this.duel; if (!d) return; this.duel = null;
    const loser = winner === d.a ? d.b : winner === d.b ? d.a : null, wn = winner && this.players[winner], ln = loser && this.players[loser];
    for (const id of [d.a, d.b]) this.to(id, { t: 'duel', stage: 'end', winner, bet: d.bet, text: text || (wn ? `${wn.name} wins the duel${d.bet ? ` and $${d.bet}` : ''}!` : 'The duel is over.') });
    if (wn) this.event(text ? `${text} ${wn.name} wins.` : `${wn.name} beat ${ln ? ln.name : 'their opponent'} in a duel.`);
  },

  /* everyone: messages from the host */
  onData(m, src) {
    const P = G.player;
    switch (m.t) {
      case 'refused': this.status(m.why, true); if (this.peer) this.peer.destroy(); this.peer = null; break;
      case 'welcome': this.myId = m.id; this.players = {}; for (const p of m.players) this.players[p.id] = p; this.begin().then(() => { G.time = m.time; }); break;
      case 'roster': {
        const old = this.players; this.players = {};
        for (const p of m.players) this.players[p.id] = Object.assign(old[p.id] || {}, p);
        for (const id of Object.keys(this.ghosts)) if (!this.players[id]) { this.ghosts[id].removeMe = true; delete this.ghosts[id]; }
        this.applyRole(); this.renderParty(); break;
      }
      case 'snap': if (!this.active) break; for (const [id, s] of Object.entries(m.p)) if (id !== this.myId && this.players[id]) { this.players[id].st = s; this.ghost(id); } if (m.time && !this.host && Math.abs(G.time - m.time) > 5) G.time = m.time; break;
      case 'shot': { const g = this.ghosts[m.from]; if (!g) break; const w = WEAPONS[m.w] || WEAPONS.sa; for (let i = 0; i < (m.n || 1); i++) Bullets.fire(m.x, m.y, m.a + rand(-1, 1) * (w.spread || 0), m.w, g, 'fx'); if (!w.silent) { FX.muzzle(m.x, m.y, m.a, (m.n || 1) > 1); Sound.play(w.sound, m.x, m.y); } g.drawnT = 3; g.recoil = 1; break; }
      case 'hurt': { if (!P || P.dead) break; this.lastAttacker = m.from; this.lastAttackerRole = m.role; P.hurt(m.dmg, null); break; }
      case 'pay': Economy.addMoney(m.amt); UI.notify(m.msg, 'good'); Sound.play('coin'); this.saveChar(); break;
      case 'fine': { const f = Math.round(P.money * m.pct); P.money -= f; if (f) UI.notify(`You paid a $${f} fine.`, 'bad'); this.saveChar(); break; }
      case 'badge': UI.notify('You lost your badge. You\'re an outlaw now.', 'crime'); break;
      case 'arrested': {
        P.downedT = 0; P.hp = P.maxHp; this.freeze = 0;
        const door = World.kpLandmarks && World.kpLandmarks.kp_police; const pos = door ? { x: door.door.x * TS + 8, y: (door.door.y + 2) * TS } : World.poi.kingsport;
        P.x = pos.x; P.y = pos.y; G.time += 120; Law.clearHeat('arrested'); Law.bounty = 0; UI.fade(1.2); Game.snapCamera();
        UI.notify(`${m.by} put you in irons. You spent a few hours in the Kingsport lockup.`, 'bad'); break;
      }
      case 'event': UI.notify(m.text, 'info'); break;
      case 'call': { const g = m.from === this.myId ? P : this.ghosts[m.from]; const who = (this.players[m.from] || {}).name || '?'; if (g && g.bark) g.bark(m.text, true); else if (g === P) Floaters.add(P.x, P.y - 30, m.text, '#ffe39a'); UI.notify(`${who}: "${m.text}"`, 'info'); break; }
      case 'duelAsk': UI.dialogue([{ who: m.name, text: `${m.name} calls you out to a duel${m.bet ? ` for $${m.bet}` : ''}. Wait for the bell, then draw. Fire early and you lose.` }], null, { choices: [{ label: 'Accept', value: true }, { label: 'Decline', value: false }], onChoose: ok => { if (ok && m.bet && P.money < m.bet) { UI.notify(`You don't have $${m.bet}.`, 'warn'); ok = false; } this.send({ t: 'duelReply', to: m.from, ok, bet: m.bet }); } }); break;
      case 'duel': this.duelMsg(m); break;
    }
  },

  /* ---------------- duels on this side */
  duelMsg(m) {
    const P = G.player;
    if (m.stage === 'wait') {
      const me = m.a === this.myId ? 'a' : 'b', pos = me === 'a' ? m.pa : m.pb, other = me === 'a' ? m.pb : m.pa;
      if (P.mounted) P.dismount(false);
      P.x = pos.x; P.y = pos.y; P.face = Math.atan2(other.y - pos.y, other.x - pos.x); Game.snapCamera();
      this.myDuel = { stage: 'wait', bet: m.bet, opp: me === 'a' ? m.b : m.a }; this.freeze = 999;
      UI.notify(`Duel with ${me === 'a' ? m.nb : m.na}${m.bet ? ` for $${m.bet}` : ''}. Hands off your gun... wait for the bell.`, 'warn');
    } else if (m.stage === 'draw') {
      if (!this.myDuel) return; this.myDuel.stage = 'draw'; this.freeze = 0; Sound.play('bell', P.x, P.y, 1); UI.notify('DRAW!', 'crime'); UI.regionToast && UI.regionToast('DRAW!');
    } else if (m.stage === 'end') {
      const d = this.myDuel; this.myDuel = null; this.freeze = 0; if (!d) return;
      UI.notify(m.text, m.winner === this.myId ? 'good' : 'bad');
      if (m.bet && m.winner) { if (m.winner === this.myId) Economy.addMoney(m.bet); else if (d.opp === m.winner) P.money = Math.max(0, P.money - m.bet); }
      if (m.winner && m.winner !== this.myId) { P.hp = Math.max(1, Math.min(P.hp, 20)); }
      this.saveChar();
    }
  },

  /* ---------------- other players in your world */
  ghost(id) {
    const s = this.players[id].st; if (!s) return;
    let g = this.ghosts[id];
    if (!g || g.removeMe || !G.actors.includes(g)) {
      const p = this.players[id];
      g = spawnActor('civilian', s.x, s.y, { name: p.name, pal: Object.assign({}, PAL.player || {}, p.pal || {}), invuln: false, cash: 0, hp: 100 });
      g.kind = 'remote'; g.faction = 'remote'; g.remoteId = id; g.tx = s.x; g.ty = s.y; g.drawnT = 0;
      g.update = function (dt) {
        const k = Math.min(1, dt * 12); this.moving = dist(this.x, this.y, this.tx, this.ty) > 0.6;
        this.x += (this.tx - this.x) * k; this.y += (this.ty - this.y) * k; this.animT += dt; this.hurtT = Math.max(0, this.hurtT - dt); this.recoil = Math.max(0, (this.recoil || 0) - dt * 6); this.drawnT -= dt; this.barkT -= dt;
        if (this.mounted) { this.mounted.animT += dt * (this.moving ? 1 : 0); this.mounted.x = this.x; this.mounted.y = this.y; }
      };
      g.hurt = function (dmg, src, angle) { FX.impact(this.x, this.y - 6, 'blood', angle || 0); this.hurtT = 0.3; if (src === G.player) Online.send({ t: 'hit', to: this.remoteId, dmg }); };
      this.ghosts[id] = g;
    }
    g.tx = s.x; g.ty = s.y; g.face = s.f; g.weapon = s.w; g.drawn = s.d || g.drawnT > 0; g.dead = !!s.dead; g.deadT = s.dead ? 5 : 0; g.downed = s.dn ? 1 : 0; g.hp = s.dead ? 0 : 100;
    if (s.dead) g.state = 'dead'; else if (g.state === 'dead') g.state = 'idle';
    if (Math.abs(g.x - s.x) > 400 || Math.abs(g.y - s.y) > 400) { g.x = s.x; g.y = s.y; }
    if (s.m) { if (!g.mounted || g.mounted.breed !== s.m.b) g.mounted = new Horse(s.m.b, s.x, s.y, { owner: 'law' }); const h = g.mounted; h.heading = s.m.h; h.speed = s.m.s; if (s.m.c) h.coat = s.m.c; }
    else g.mounted = null;
    const p = this.players[id]; g.name = p.name; g.pal.badge = p.role === 'lawman';
  },
  myState() {
    const P = G.player, h = P.mounted;
    return { x: Math.round(P.x), y: Math.round(P.y), f: +P.face.toFixed(2), w: P.cur, d: P.drawnT > 0 || !!Input.mouse.rdown, dead: P.dead, dn: P.downedT > 0, m: h ? { b: h.breed, h: +h.heading.toFixed(2), s: Math.round(h.speed), c: h.coat } : null };
  },

  /* ---------------- each frame */
  update(dt) {
    if (!this.active || !G.player) return;
    const P = G.player;
    this.sendT -= dt;
    if (this.sendT <= 0) {
      this.sendT = 1 / 15;
      const s = this.myState();
      if (this.host) {
        this.players[this.myId].st = s;
        const snap = {}; for (const [id, p] of Object.entries(this.players)) if (p.st) snap[id] = p.st;
        this.broadcast({ t: 'snap', p: snap, time: G.time });
      } else this.send({ t: 'st', s });
    }
    // knocked down outlaws can be cuffed for a while before they bleed out
    if (P.downedT > 0) { P.downedT -= dt; this.freeze = Math.max(this.freeze, 0.1); if (P.downedT <= 0) { P.downedT = 0; P.hp = 0; P.die(); } }
    if (this.freeze > 0 && this.freeze < 900) this.freeze -= dt;
    // lawmen draw a salary while on duty
    const me = this.players[this.myId];
    this.payT += dt; if (this.payT > 300) { this.payT = 0; if (me && me.role === 'lawman') { Economy.addMoney(15); UI.notify('Your lawman\'s pay: $15.', 'good'); } this.saveChar(); }
    if (P.dead) this.duelForfeit();
  },
  duelForfeit() { if (this.myDuel && this.myDuel.stage) { /* the host settles it when the shot lands */ } },
  applyRole() {
    const me = this.players[this.myId], P = G.player; if (!me || !P) return;
    if (me.bounty > 0 && Law.bounty < me.bounty) Law.bounty = me.bounty;
  },

  /* ---------------- interactions with other players */
  interactions() {
    if (!this.active) return [];
    const P = G.player, out = [], me = this.players[this.myId]; if (!me || P.dead || P.downedT > 0) return out;
    for (const [id, g] of Object.entries(this.ghosts)) {
      if (g.removeMe || dist(P.x, P.y, g.x, g.y) > 40) continue;
      const p = this.players[id];
      if (g.downed && me.role !== 'outlaw' && p.bounty > 0) out.push({ label: `Cuff ${p.name} ($${Math.round(p.bounty * 1.5)})`, x: g.x, y: g.y, r: 40, priority: 9, act: () => Interact.begin('Cuffing', 2, () => this.send({ t: 'arrest', to: id }), { range: 50 }) });
      else if (!g.dead && !g.downed && !this.myDuel) out.push({ label: `Challenge ${p.name} to a duel`, x: g.x, y: g.y, r: 40, priority: 5, act: () => this.challenge(id) });
    }
    for (const c of G.actors) if (c.kind === 'lawman' && c.shopId && !c.dead && dist(P.x, P.y, c.x, c.y) < 40) { out.push({ label: 'Change your online role', x: c.x, y: c.y + 4, r: 40, priority: 3, act: () => this.roleMenu() }); break; }
    return out;
  },
  challenge(id) {
    const p = this.players[id], P = G.player;
    UI.dialogue([{ who: 'Duel', text: `Call out ${p.name}? You both stand off in the street. Wait for the bell, then draw. Firing early loses.` }], null,
      { choices: [0, 10, 25, 50].filter(b => b <= P.money).map(b => ({ label: b ? `Duel for $${b}` : 'Duel for honor', value: b })).concat([{ label: 'Never mind', value: null }]), onChoose: b => { if (b === null) return; this.send({ t: 'duelAsk', to: id, bet: b }); UI.notify(`You called out ${p.name}.`, 'info'); } });
  },
  roleMenu() {
    const me = this.players[this.myId];
    const choices = Object.entries(ROLES).filter(([k]) => k !== me.role).map(([k, r]) => ({ label: `Become ${k === 'outlaw' ? 'an outlaw' : k === 'lawman' ? 'a lawman' : 'a bounty hunter'}`, value: k }));
    if (me.bounty > 0) choices.unshift({ label: `Pay off your $${me.bounty} bounty`, value: 'pay' });
    UI.dialogue([{ who: 'Sheriff', text: me.bounty > 0 && me.role === 'outlaw' ? 'Nobody wears a badge or carries a hunter\'s license with a price on their head. Pay it off first.' : `You're ${ROLES[me.role].name.toLowerCase() === 'outlaw' ? 'an outlaw' : 'a ' + ROLES[me.role].name.toLowerCase()} right now. Want to change that?` }], null,
      { choices: choices.concat([{ label: 'Leave it', value: null }]), onChoose: v => {
        if (!v) return; const P = G.player;
        if (v === 'pay') { if (P.money < me.bounty) { UI.notify(`You need $${me.bounty}.`, 'warn'); return; } P.money -= me.bounty; Law.bounty = 0; this.send({ t: 'paybounty' }); UI.notify('Bounty paid. Your record is clean.', 'good'); return; }
        if (v !== 'outlaw' && me.bounty > 0) { UI.notify('Pay off your bounty first.', 'warn'); return; }
        this.send({ t: 'role', role: v });
      } });
  },
  callouts() {
    if (!this.active || UI.modal) return;
    UI.dialogue([{ who: 'Callout', text: 'Shout to the party:' }], null, { choices: CALLOUTS.map((c, i) => ({ label: c, value: i })).concat([{ label: 'Cancel', value: null }]), onChoose: i => { if (i !== null) this.send({ t: 'call', i }); } });
  },

  /* ---------------- party panel (P) */
  renderParty(show) {
    const el = $('ol-party'); if (!el) return;
    if (!this.active) { el.classList.add('hidden'); return; }
    if (show !== undefined) el.classList.toggle('hidden', !show);
    const list = Object.values(this.players).map(p => `<div class="ol-row"><span style="color:${ROLES[p.role].col}">${ROLES[p.role].icon}</span> <b>${esc(p.name)}</b>${p.id === this.myId ? ' (you)' : ''}<small>${ROLES[p.role].name}${p.bounty ? ` · <span style="color:#ff9a7a">$${p.bounty} bounty</span>` : ''}</small>${this.host && p.id !== this.myId ? `<button class="btn small" data-kick="${p.id}">Kick</button>` : ''}</div>`).join('');
    el.innerHTML = `<div class="ol-head">Party <b>${this.code}</b> <span class="muted small">${Object.keys(this.players).length}/${ONLINE_MAX}</span></div>${list}<div class="muted small">P hide · B callouts · walk up to a player to duel</div>`;
    el.querySelectorAll('[data-kick]').forEach(b => b.onclick = () => { const c = this.conns[b.dataset.kick]; if (c) { c.send({ t: 'refused', why: 'The host removed you from the party.' }); setTimeout(() => c.close(), 300); } });
  },

  /* ---------------- the Ride Online screen */
  openMenu() {
    const c = this.char();
    UI.show('ol-menu'); UI.modal = 'ol-menu';
    $('ol-name').value = c.name; this.status('Host a party and send the code to your friends, or type a friend\'s code to join.');
  }
};

/* ---------------------------------------------------------------- DOM */
(function () {
  const add = () => {
    const st = document.createElement('style');
    st.textContent = `#ol-menu .panel-box{max-width:520px}#ol-menu input{font:16px Georgia,serif;padding:8px 10px;border-radius:6px;border:1px solid #7a5418;background:#f0e4c8;color:#2a1608;width:100%;box-sizing:border-box;margin:6px 0 12px}
#ol-menu .ol-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px}#ol-status{min-height:40px;margin:10px 0;font-style:italic}
#ol-party{position:fixed;right:14px;top:130px;z-index:40;background:rgba(30,18,8,.88);border:2px solid #7a5418;border-radius:8px;padding:10px 12px;color:#f0e0b8;font:13px Georgia,serif;min-width:220px}
#ol-party .ol-head{font-size:15px;margin-bottom:6px;color:#ffe39a}#ol-party .ol-row{display:flex;align-items:center;gap:6px;margin:4px 0;flex-wrap:wrap}#ol-party .ol-row small{opacity:.8;margin-left:auto}#ol-party .btn.small{padding:1px 6px;font-size:11px}`;
    document.head.append(st);
    const m = document.createElement('div'); m.id = 'ol-menu'; m.className = 'screen hidden';
    m.innerHTML = `<div class="panel-box"><h2>Ride Online</h2>
      <p class="muted small">Play with up to ${ONLINE_MAX - 1} friends. No story online: be an outlaw, a lawman or a bounty hunter, and duel each other. Only share your code with people you know: players in a party connect directly to each other.</p>
      <label>Your name<input id="ol-name" maxlength="16"></label>
      <div class="ol-cols"><div><button class="btn big" id="ol-host">Host a party</button></div><div><input id="ol-code" placeholder="RATTLER-42" maxlength="16"><button class="btn" id="ol-join">Join with code</button></div></div>
      <div id="ol-status"></div><button class="btn" id="ol-back">Back</button></div>`;
    document.body.append(m);
    const p = document.createElement('div'); p.id = 'ol-party'; p.className = 'hidden'; document.body.append(p);
    $('ol-host').onclick = () => { Sound.init(); Online.setName($('ol-name').value); Online.hostParty(); };
    $('ol-join').onclick = () => { Sound.init(); Online.setName($('ol-name').value); Online.joinParty($('ol-code').value); };
    $('ol-code').addEventListener('keydown', e => { if (e.key === 'Enter') $('ol-join').click(); e.stopPropagation(); });
    $('ol-name').addEventListener('keydown', e => e.stopPropagation());
    $('ol-back').onclick = () => { if (Online.peer && !Online.active) { Online.peer.destroy(); Online.peer = null; } UI.showMainMenu(); };
    // the main menu button
    const nb = document.querySelector('[data-act="new"]');
    if (nb) { const b = document.createElement('button'); b.className = 'btn big'; b.textContent = 'Ride Online'; b.addEventListener('click', () => { Sound.init(); Sound.play('ui'); Online.openMenu(); }); nb.after(b); }
    addEventListener('keydown', e => {
      if (!Online.active || G.state !== 'play' || e.repeat) return;
      if (e.code === 'KeyP' && !UI.modal) { const el = $('ol-party'); Online.renderParty(el.classList.contains('hidden')); }
      if (e.code === 'KeyB') Online.callouts();
    });
  };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
})();

/* ---------------------------------------------------------------- hooking the single-player game */
(function () {
  // no story, heists or camp crew online
  const OFF = new Set(['story', 'heists', 'crew']);
  const run = Hooks.run.bind(Hooks), collect = Hooks.collect.bind(Hooks);
  Hooks.run = function (name, ...a) { if (!Online.active) return run(name, ...a); for (const h of this.list) if (h[name] && !OFF.has(h.key)) h[name](...a); };
  Hooks.collect = function (name, ...a) { if (!Online.active) return collect(name, ...a); const out = []; for (const h of this.list) if (h[name] && !OFF.has(h.key)) { const r = h[name](...a); if (r) out.push(...r); } return out; };
  const next = MissionSys.nextAvailable.bind(MissionSys);
  MissionSys.nextAvailable = function () { return Online.active ? null : next(); };
  const obj = MissionSys.objectiveText.bind(MissionSys);
  MissionSys.objectiveText = function () {
    if (!Online.active || this.active) return obj();
    const me = Online.players[Online.myId] || { role: 'outlaw', bounty: 0 };
    return { title: `Online · ${ROLES[me.role].name}`, text: `Party ${Online.code} · ${Object.keys(Online.players).length} riding${me.bounty ? ` · your bounty $${me.bounty}` : ''}. P: party, B: callouts.` };
  };
  // online characters never touch story saves
  const save = SaveSys.save.bind(SaveSys);
  SaveSys.save = function (slot) { if (Online.active) { Online.saveChar(); return 'Your online character saves by itself.'; } return save(slot); };
  // quitting to the title leaves the party
  const toTitle = Game.toTitle.bind(Game);
  Game.toTitle = function () { if (Online.active) Online.leave(); return toTitle(); };
  // crimes add to your bounty in the party
  const report = Law.report.bind(Law);
  Law.report = function (type, x, y) { report(type, x, y); if (Online.active && CRIMES[type]) Online.send({ t: 'crime', amt: CRIMES[type].bounty }); };
  // lawmen and hunters can fire in town; NPC arrests and paid-off bounties clear your party bounty too
  const commit = Law.commit.bind(Law);
  Law.commit = function (type, x, y, o) { const me = Online.active && Online.players[Online.myId]; if (me && me.role !== 'outlaw' && (type === 'gunfire' || type === 'assault')) return; return commit(type, x, y, o); };
  const doArrest = Law.doArrest.bind(Law);
  Law.doArrest = function () { doArrest(); if (Online.active) Online.send({ t: 'paybounty' }); };
  const payOff = Law.payOff.bind(Law);
  Law.payOff = function () { const r = payOff(); if (!r && Online.active) Online.send({ t: 'paybounty' }); return r; };
  // shots fired show up in everyone's world
  const fire = Player.prototype.tryFire;
  Player.prototype.tryFire = function () {
    if (Online.active && Online.freeze > 0) { if (Online.myDuel && Online.myDuel.stage === 'wait') { Online.send({ t: 'foul' }); Online.myDuel.stage = 'fouled'; } return; }
    const before = this.mag[this.cur], cd = this.fireCD;
    fire.call(this);
    if (Online.active && cd <= 0 && this.mag[this.cur] < before) {
      const w = WEAPONS[this.cur], hy = this.mounted ? 16 : 8;
      Online.send({ t: 'shot', x: Math.round(this.x + Math.cos(this.face) * (5 + w.len)), y: Math.round(this.y - hy + Math.sin(this.face) * (5 + w.len) + (hy - 8)), a: +this.face.toFixed(3), w: this.cur, n: w.pellets || 1 });
    }
  };
  // other players' bullets in your world are only for show: the shooter's game decides hits
  const canHit = Bullets.canHit.bind(Bullets);
  Bullets.canHit = function (b, e) { if (b.fac === 'fx') return false; return canHit(b, e); };
  // frozen for a duel countdown or while knocked down
  const upd = Player.prototype.update;
  Player.prototype.update = function (dt) {
    if (Online.active && Online.freeze > 0 && !this.dead) { this.hurtT = Math.max(0, this.hurtT - dt); this.invuln = Math.max(0, this.invuln - dt); this.vx = this.vy = 0; this.moving = false; const mw = G.mouseWorld; if (!(this.downedT > 0)) this.face = Math.atan2(mw.y - (this.y - 8), mw.x - this.x); return; }
    return upd.call(this, dt);
  };
  // wanted outlaws shot down by the law are knocked out first, so they can be cuffed
  const hurt = Player.prototype.hurt;
  Player.prototype.hurt = function (dmg, src, angle) {
    const me = Online.active && Online.players[Online.myId];
    if (me && src === null && this.hp - dmg <= 0 && !(this.downedT > 0) && me.bounty > 0 && Online.lastAttackerRole && Online.lastAttackerRole !== 'outlaw' && !Online.myDuel) {
      this.hp = 1; this.downedT = 10; UI.notify('You\'re down! The law can cuff you now. Hold on...', 'crime'); FX.impact(this.x, this.y - 6, 'blood', angle || 0); return;
    }
    if (this.downedT > 0) return;   // knocked down: nobody can finish you off, but you can be cuffed
    return hurt.call(this, dmg, src, angle);
  };
  // dying online: tell the referee who did it, then get back up in Kingsport
  const death = Game.onPlayerDeath.bind(Game);
  Game.onPlayerDeath = function () {
    if (!Online.active) return death();
    Online.send({ t: 'died', by: Online.lastAttacker || null }); Online.lastAttacker = null;
    const P = G.player; P.downedT = 0;
    UI.notify('You were killed. Back on your feet in a few seconds...', 'bad');
    setTimeout(() => {
      if (!Online.active || !P.dead) return;
      const sp = World.findOpen(World.poi.kingsport.x + rand(-200, 200), World.poi.kingsport.y + rand(-100, 100), 12) || World.poi.kingsport;
      P.x = sp.x; P.y = sp.y; P.dead = false; P.hp = P.maxHp; P.stamina = 100; P.invuln = 3; P.reload = null; Law.clearHeat('died');
      if (P.ammo.revolver < 12) P.ammo.revolver = 12; Game.snapCamera(); UI.fade(1);
    }, 5000);
  };
  // other players on the map and minimap
  const base = allMarkers;
  allMarkers = function () { const out = base(); if (Online.active) for (const [id, g] of Object.entries(Online.ghosts)) if (!g.removeMe) out.push({ x: g.x, y: g.y - 20, kind: 'giver', label: (Online.players[id] || {}).name || '' }); return out; };
  // a downed player kneels
  const dOpts = Player.prototype.drawOpts;
  Player.prototype.drawOpts = function (m) { const o = dOpts.call(this, m); if (Online.active) { if (this.downedT > 0) o.state = 'kneel'; const me = Online.players[Online.myId]; if (me && o.pal) o.pal = Object.assign({}, o.pal, { badge: me.role === 'lawman' }); } return o; };
  addEventListener('beforeunload', () => { if (Online.active) Online.leave(); });
})();

Hooks.add({ key: 'online', update: dt => Online.update(dt), interactions: () => Online.interactions(), reset: () => { if (!Online.active) Online.ghosts = {}; } });
