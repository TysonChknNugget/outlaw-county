/* Outlaw County — duel.js (v2.4)
 * Hotheads in town insult you and call you out. Accept, and the game cuts to
 * a shot over your shoulder down the street. Keep your hand steady on him,
 * don't touch iron until the bell, then draw and put one where it counts.
 */
'use strict';

const INSULTS = [
  "That's a fine hat. Shame about the face under it.",
  "I've seen scarecrows with more sand than you, stranger.",
  "You ride like a sack of flour tied to a mule.",
  "Folks say you're quick. Folks say a lot of dumb things.",
  "Your mother should've drowned you in the horse trough.",
  "Smell that? That's yellow. It's coming off you.",
  "I'd call you a coward, but cowards at least know when to leave town.",
  "You walk like a man who's never been shot. Let's fix that."
];
const DUELIST_NAMES = ['"Quick" Jack Corley', 'Silas "Snake" Pruett', 'Dutch Ammon', 'Billy Two-Guns', 'Ike Varnum', 'Red Mattingly', 'Cole Harlan', 'Johnny Sixkiller', 'Lefty Brannock', 'Doc Wyeth', 'Wade "Sundown" Ellis', 'Tom Carvey'];

const Duel = {
  cool: 120, challenger: null, active: null,

  /* ------------------------------------------------ the insult */
  update(dt) {
    const P = G.player; if (!P || P.dead) return;
    const c = this.challenger;
    if (c) {
      if (c.dead || c.removeMe) { this.challenger = null; return; }
      c.face = Math.atan2(P.y - c.y, P.x - c.x);
      if (c.leaving) { if (!Game.onScreen(c.x, c.y, 40) || c.leaveT-- < -600) c.removeMe = true; return; }
      c.waitT -= dt;
      if (c.waitT < 12 && !c.taunted) { c.taunted = true; c.bark('Well? You deaf, or just yellow?', true); }
      if (c.waitT <= 0 || dist(c.x, c.y, P.x, P.y) > 260 || MissionSys.active || Law.heat > 0) this.walkOff(c, 'Ha! Thought so.');
      return;
    }
    this.cool -= dt;
    if (this.cool > 0 || MissionSys.active || Law.heat > 0 || P.mounted || UI.modal || P.inBuilding) return;
    const town = World.townAt(P.x, P.y);
    if (!town || /Hollow/.test(town.name)) { this.cool = 15; return; }
    this.cool = rand(150, 300);
    if (!chance(0.65)) return;
    const sp = World.randomOpenNear(P.x, P.y, 50, 90, (x, y) => World.tileAtPx(x, y) === T.FLOOR || !Story.reachable(x, y));
    if (!sp) return;
    const lvl = Math.min(4, Math.floor(((G.stats.duelsWon || 0) + (P.level || 1)) / 2));
    const a = spawnActor('gang', sp.x, sp.y, { name: pick(DUELIST_NAMES), weapon: pick(['sa', 'da', 'schofield', 'cavalry']), hp: 80, post: { x: sp.x, y: sp.y }, cash: randi(15, 40) });
    a.faction = 'civ'; a.duelist = true; a.waitT = 30; a.temp = true;
    a.skill = clamp(0.38 + lvl * 0.09 + rand(-0.05, 0.05), 0.3, 0.85);   // higher is faster
    a.bet = [10, 20, 30, 50, 80][lvl];
    a.bark(pick(INSULTS), true);
    UI.notify(`${a.name} is calling you out. Walk over and press E to accept the duel ($${a.bet} on it), or walk away.`, 'warn');
    this.challenger = a;
  },
  walkOff(c, line) {
    c.leaving = true; c.leaveT = 0; if (line) c.bark(line, true);
    const P = G.player, a = Math.atan2(c.y - P.y, c.x - P.x);
    c.post = { x: c.x + Math.cos(a) * 600, y: c.y + Math.sin(a) * 600 };
    if (this.challenger === c) this.challenger = null;
  },
  interactions() {
    const c = this.challenger, P = G.player;
    if (!c || c.leaving || dist(P.x, P.y, c.x, c.y) > 46) return [];
    return [{ label: `Accept ${c.name}'s duel ($${c.bet})`, x: c.x, y: c.y, r: 46, priority: 10, act: () => this.begin(c) }];
  },

  /* ------------------------------------------------ the duel itself */
  begin(c) {
    const P = G.player;
    if (P.money < c.bet) { c.bark("Can't even cover the bet? Get out of my sight.", true); this.walkOff(c); return; }
    this.challenger = null;
    const cv = $('duel-canvas');
    cv.width = innerWidth; cv.height = innerHeight;
    this.active = {
      foe: c, phase: 'intro', t: 0, drawAt: rand(2.2, 4.8), steady: 0, mx: cv.width / 2, my: cv.height / 2,
      foeDraw: 0.95 - c.skill * 0.6, shots: [], drawnT: -1, result: null, flash: 0, foeFired: false, wind: rand(-1, 1)
    };
    UI.show('duel'); UI.modal = 'duel';
    Sound.play('mission');
    this.last = performance.now();
    requestAnimationFrame(() => this.loop());
  },
  loop() {
    const d = this.active; if (!d) return;
    if (UI.modal !== 'duel') { this.finish('forfeit'); return; }
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    d.t += dt; d.flash = Math.max(0, d.flash - dt * 3);
    this.step(d, dt);
    this.draw(d);
    if (this.active) requestAnimationFrame(() => this.loop());
  },
  geom(d) {
    const cv = $('duel-canvas'), W = cv.width, H = cv.height;
    const k = Math.max(4, Math.round(H / 115));            // opponent scale
    return { W, H, k, ox: W * 0.56, oy: H * 0.62 };
  },
  /* where on the opponent the bullet lands */
  hitPart(d, x, y) {
    const g = this.geom(d), lx = (x - g.ox) / g.k, ly = (y - g.oy) / g.k;
    if (d.phase !== 'stand' && lx >= -0.5 && lx <= 3.5 && ly >= -6.5 && ly <= -1) return 'hand';
    if (lx >= -2.5 && lx <= 2.5 && ly >= -15.5 && ly <= -10.5) return 'head';
    if (lx >= -3.5 && lx <= 4 && ly >= -11 && ly <= -4) return 'body';
    if (lx >= -3 && lx <= 3.5 && ly >= -4 && ly <= 0) return 'legs';
    return null;
  },
  aim(d) {
    // your sight drifts with your nerves; holding it on him steadies it
    const wob = (1 - d.steady) * 26 + 4, t = d.t;
    return { x: d.mx + Math.sin(t * 2.1) * wob + Math.sin(t * 5.3 + 1) * wob * 0.4, y: d.my + Math.cos(t * 1.7) * wob * 0.8 + Math.sin(t * 4.1) * wob * 0.3 };
  },
  step(d, dt) {
    const g = this.geom(d);
    if (d.phase === 'intro' && d.t > 2.2) { d.phase = 'stand'; d.t0 = d.t; }
    if (d.phase === 'stand') {
      const a = this.aim(d), on = Math.hypot(a.x - g.ox, a.y - (g.oy - 9 * g.k)) < g.k * 9;
      d.steady = clamp(d.steady + (on ? dt * 0.45 : -dt * 0.3), 0, 1);
      if (Math.random() < dt * 0.6) Sound.play('step', undefined, undefined, 0.15);
      if (d.t - d.t0 > d.drawAt) { d.phase = 'draw'; d.drawnT = d.t; Sound.play('wanted'); }
    }
    if (d.phase === 'draw') {
      if (!d.foeFired && d.t - d.drawnT > d.foeDraw) {
        d.foeFired = true; d.flash = 1; Sound.play('revolver');
        // he can miss, more often if you've already winged him
        if (chance(0.82 * (d.foeHurt ? 0.4 : 1))) { this.end(d, 'lose'); return; }
        else { d.msg = 'He missed!'; d.foeDraw += 0.7; d.foeFired = false; }
      }
    }
    if (d.phase === 'end' && d.t - d.endT > 2.6) this.finish(d.result);
  },
  click(e) {
    const d = this.active; if (!d) return;
    if (d.phase === 'intro') return;
    if (d.phase === 'end') { if (d.t - d.endT > 0.8) this.finish(d.result); return; }
    if (d.phase === 'stand') {   // touched iron before the bell
      d.msg = 'You drew early!'; Sound.play('revolver'); d.flash = 1;
      d.foeFired = true; setTimeout(() => this.active && this.end(this.active, 'early'), 450); d.phase = 'early'; return;
    }
    if (d.phase !== 'draw') return;
    const a = this.aim(d), part = this.hitPart(d, a.x, a.y);
    d.shots.push({ x: a.x, y: a.y, t: d.t }); Sound.play('revolver'); d.kick = 1;
    d.react = d.react || (d.t - d.drawnT);
    if (part === 'hand') { this.end(d, 'disarm'); return; }
    if (part === 'head' || part === 'body') { this.end(d, 'win'); return; }
    if (part === 'legs') { d.foeHurt = true; d.msg = 'Winged him!'; d.foeDraw += 0.35; return; }
    d.msg = 'Missed!';
  },
  move(e) { const d = this.active; if (!d) return; const r = $('duel-canvas').getBoundingClientRect(); d.mx = (e.clientX - r.left) * $('duel-canvas').width / r.width; d.my = (e.clientY - r.top) * $('duel-canvas').height / r.height; },
  end(d, result) { d.phase = 'end'; d.result = result; d.endT = d.t; if (result === 'win' || result === 'disarm') Sound.play('mission'); },

  finish(result) {
    const d = this.active; if (!d) return;
    this.active = null;
    if (UI.modal === 'duel') UI.closeAll();
    const P = G.player, c = d.foe, bet = c.bet;
    G.stats.duels = (G.stats.duels || 0) + 1;
    if (result === 'win' || result === 'disarm') {
      Economy.addMoney(bet, c.x, c.y); G.stats.duelsWon = (G.stats.duelsWon || 0) + 1; Progress.add(30 + bet / 2);
      const r = d.react ? ` Drawn in ${d.react.toFixed(2)}s.` : '';
      if (result === 'disarm') {
        Ach.event('disarm'); c.weapon = null; c.bark("My hand! All right, all right, you win!", true); this.walkOff(c);
        UI.notify(`You shot the iron clean out of ${c.name}'s hand and took his $${bet}.${r}`, 'good');
      } else {
        c.hp = 0; c.dead = true; c.deadT = 0; c.state = 'dead'; G.stats.kills++;
        UI.notify(`${c.name} lies in the street. A fair fight in front of witnesses: no crime. You took his $${bet}.${r}`, 'good');
      }
    } else if (result === 'forfeit') {
      UI.notify(`You walked away from ${c.name}. He keeps his bet and his grin.`, 'info'); this.walkOff(c, 'Coward!');
    } else {
      P.money = Math.max(0, P.money - bet); P.hp = Math.max(8, Math.min(P.hp, 22)); P.hurtT = 0.5;
      UI.notify(result === 'early' ? `You drew before the bell. ${c.name} shot you for it and took your $${bet}. The crowd saw it all.` : `${c.name} was faster. You're bleeding in the street and $${bet} poorer.`, 'bad');
      c.bark(result === 'early' ? "Cheat! Should've killed you." : "Get yourself a doctor, slowpoke.", true); this.walkOff(c);
    }
  },

  /* ------------------------------------------------ the shot over your shoulder */
  draw(d) {
    const cv = $('duel-canvas'), ctx = cv.getContext('2d'), g = this.geom(d), { W, H, k, ox, oy } = g;
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
    const night = Env.isNight(), hor = H * 0.42;
    // sky, sun and mesas
    const sky = ctx.createLinearGradient(0, 0, 0, hor);
    sky.addColorStop(0, night ? '#0e1430' : '#e8794a'); sky.addColorStop(1, night ? '#3a3050' : '#f8d898');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, hor + 2);
    ctx.fillStyle = night ? '#e8e8f0' : '#fff2c0'; ctx.beginPath(); ctx.arc(W * 0.5, hor - H * 0.03, H * 0.06, 0, TAU); ctx.fill();
    ctx.fillStyle = night ? '#2a2236' : '#a0583a';
    ctx.beginPath(); ctx.moveTo(0, hor); ctx.lineTo(W * 0.08, hor - H * 0.05); ctx.lineTo(W * 0.2, hor - H * 0.05); ctx.lineTo(W * 0.24, hor); ctx.lineTo(W * 0.7, hor); ctx.lineTo(W * 0.74, hor - H * 0.07); ctx.lineTo(W * 0.9, hor - H * 0.07); ctx.lineTo(W * 0.95, hor); ctx.lineTo(W, hor); ctx.fill();
    // the street, running away from you
    const gr = ctx.createLinearGradient(0, hor, 0, H);
    gr.addColorStop(0, night ? '#4a3e34' : '#c8a070'); gr.addColorStop(1, night ? '#2a2018' : '#8a6a44');
    ctx.fillStyle = gr; ctx.fillRect(0, hor, W, H - hor);
    ctx.strokeStyle = 'rgba(80,50,20,.25)'; ctx.lineWidth = 2;
    for (let i = -6; i <= 6; i++) { ctx.beginPath(); ctx.moveTo(W / 2 + i * 10, hor); ctx.lineTo(W / 2 + i * W * 0.22, H); ctx.stroke(); }
    // false-front buildings on both sides, in perspective
    const colors = ['#7a4a2a', '#6a5a4a', '#8a5a34', '#5a4232', '#7a6248'];
    for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
      const z0 = i / 5, z1 = (i + 1) / 5, x0 = W / 2 + side * (W * 0.12 + z0 * z0 * W * 0.55), x1 = W / 2 + side * (W * 0.12 + z1 * z1 * W * 0.55);
      const top0 = hor - H * (0.08 + z0 * z0 * 0.5), top1 = hor - H * (0.08 + z1 * z1 * 0.5), bot0 = hor + H * (0.01 + z0 * z0 * 0.4), bot1 = hor + H * (0.01 + z1 * z1 * 0.4);
      ctx.fillStyle = colors[(i + (side > 0 ? 2 : 0)) % colors.length];
      ctx.beginPath(); ctx.moveTo(x0, top0); ctx.lineTo(x1, top1); ctx.lineTo(x1, bot1); ctx.lineTo(x0, bot0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(Math.min(x0, x1), (bot0 + bot1) / 2 - H * 0.02 * (1 + z1 * 3), Math.abs(x1 - x0), H * 0.006 * (1 + z1 * 4));
      ctx.fillStyle = night ? 'rgba(255,200,100,.5)' : 'rgba(30,20,10,.55)';
      ctx.fillRect((x0 + x1) / 2 - Math.abs(x1 - x0) * 0.15, (top0 + bot0) / 2, Math.abs(x1 - x0) * 0.3, (bot1 - top1) * 0.18);
    }
    // a tumbleweed
    const tw = ((d.t * 60 * (d.wind > 0 ? 1 : -1)) % (W + 200) + W + 200) % (W + 200) - 100;
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(tw, hor + H * 0.12 + Math.abs(Math.sin(d.t * 5)) * -10, H * 0.02, 0, TAU); ctx.stroke();
    // him
    const foeDrawn = d.phase === 'draw' && d.t - d.drawnT > d.foeDraw * 0.6 || d.phase === 'end' && d.result !== 'win' && d.result !== 'disarm';
    ctx.save(); ctx.translate(ox, oy); ctx.scale(k, k);
    if (d.phase === 'end' && d.result === 'win') Sprites.human(ctx, 0, 0, { face: Math.PI / 2, pal: d.foe.pal, state: 'dead', deadT: Math.min(0.34, (d.t - d.endT) * 0.6) });
    else Sprites.human(ctx, 0, 0, { face: Math.PI / 2, pal: d.foe.pal, weapon: d.result === 'disarm' ? null : d.foe.weapon, drawn: foeDrawn, holster: true, state: d.result === 'disarm' ? 'handsup' : 'idle' });
    ctx.restore();
    if (d.foeFired && d.flash > 0.5) { ctx.fillStyle = 'rgba(255,230,140,.9)'; ctx.beginPath(); ctx.arc(ox + 2 * k, oy - 2 * k, k * 2.5 * d.flash, 0, TAU); ctx.fill(); }
    // you, from behind
    const pk = Math.round(k * 3.4), px = W * 0.22, py = H + pk * 3;
    ctx.save(); ctx.translate(px, py); ctx.scale(pk, pk);
    Sprites.human(ctx, 0, 0, { face: -Math.PI / 2 + 0.25, pal: Looks.playerPal(), weapon: G.player.cur, drawn: d.phase === 'draw' || d.phase === 'end', holster: true, recoil: d.kick || 0 });
    ctx.restore();
    d.kick = Math.max(0, (d.kick || 0) - 0.08);
    // letterbox and dust
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H * 0.07); ctx.fillRect(0, H * 0.93, W, H * 0.07);
    ctx.fillStyle = 'rgba(240,210,160,.08)'; for (let i = 0; i < 30; i++) ctx.fillRect((i * 97 + d.t * 40) % W, (i * 53 + Math.sin(d.t + i) * 20) % H, 2, 2);
    // bullet holes and your sight
    for (const s of d.shots) { ctx.fillStyle = 'rgba(20,10,5,.8)'; ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, TAU); ctx.fill(); }
    if (d.phase === 'stand' || d.phase === 'draw') {
      const a = this.aim(d), r = 14 + (1 - d.steady) * 10, hot = d.phase === 'draw';
      ctx.strokeStyle = hot ? '#ff5a3a' : 'rgba(255,240,200,.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(a.x, a.y, r, 0, TAU); ctx.moveTo(a.x - r - 6, a.y); ctx.lineTo(a.x - r + 4, a.y); ctx.moveTo(a.x + r - 4, a.y); ctx.lineTo(a.x + r + 6, a.y);
      ctx.moveTo(a.x, a.y - r - 6); ctx.lineTo(a.x, a.y - r + 4); ctx.moveTo(a.x, a.y + r - 4); ctx.lineTo(a.x, a.y + r + 6); ctx.stroke();
    }
    if (d.flash > 0 && d.foeFired) { ctx.fillStyle = `rgba(255,255,255,${d.flash * 0.25})`; ctx.fillRect(0, 0, W, H); }
    // words
    ctx.textAlign = 'center';
    const big = (t, y, col, size = Math.round(H * 0.09)) => { ctx.font = `bold ${size}px Georgia, serif`; ctx.fillStyle = '#000'; ctx.fillText(t, W / 2 + 3, y + 3); ctx.fillStyle = col; ctx.fillText(t, W / 2, y); };
    const small = (t, y) => { ctx.font = `${Math.round(H * 0.028)}px Georgia, serif`; ctx.fillStyle = '#f0dcb0'; ctx.fillText(t, W / 2, y); };
    if (d.phase === 'intro') { big(d.foe.name, H * 0.2, '#ffe39a', Math.round(H * 0.06)); small(`$${d.foe.bet} on it. Keep your sight on him to steady your hand. Don't click until the bell.`, H * 0.27); }
    if (d.phase === 'stand') { small('Steady...  keep your sight on him', H * 0.12); this.meter(ctx, W, H, d.steady); }
    if (d.phase === 'draw') { if (d.t - d.drawnT < 0.9) big('DRAW!', H * 0.22, '#ff5a3a', Math.round(H * 0.14)); if (d.msg) small(d.msg, H * 0.29); }
    if (d.phase === 'early') big('TOO EARLY!', H * 0.22, '#ff5a3a');
    if (d.phase === 'end') {
      const txt = { win: 'YOU WIN', disarm: 'DISARMED HIM', lose: 'TOO SLOW', early: 'TOO EARLY', forfeit: '' }[d.result];
      big(txt, H * 0.22, d.result === 'win' || d.result === 'disarm' ? '#ffe39a' : '#ff5a3a');
      if (d.react) small(`Your draw: ${d.react.toFixed(2)}s · his: ${d.foeDraw.toFixed(2)}s`, H * 0.29);
      small('Click to continue', H * 0.89);
    }
  },
  meter(ctx, W, H, v) {
    const w = W * 0.22, x = (W - w) / 2, y = H * 0.14;
    ctx.fillStyle = 'rgba(0,0,0,.55)'; ctx.fillRect(x - 2, y - 2, w + 4, 12);
    ctx.fillStyle = v > 0.75 ? '#ffe39a' : '#c8a040'; ctx.fillRect(x, y, w * v, 8);
  }
};

/* the duel screen (built once) */
(function () {
  const el = document.createElement('div'); el.id = 'duel'; el.className = 'screen hidden';
  el.innerHTML = '<canvas id="duel-canvas"></canvas>';
  const add = () => {
    document.body.append(el);
    const cv = $('duel-canvas');
    cv.addEventListener('mousedown', e => { if (e.button === 0) Duel.click(e); });
    cv.addEventListener('mousemove', e => Duel.move(e));
  };
  if (document.body) add(); else addEventListener('DOMContentLoaded', add);
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'duel1', name: 'Called Out', desc: 'Win a duel.', icon: '⚔', prog: () => [G.stats.duelsWon || 0, 1] },
    { id: 'duel10', name: 'Fastest Hand in the Territory', desc: 'Win 10 duels.', icon: '⚔', prog: () => [G.stats.duelsWon || 0, 10] },
    { id: 'disarm', name: 'Trick Shot', desc: 'Win a duel by shooting the gun out of his hand.', icon: '☞', ev: 'disarm' }
  );
})();

Hooks.add({
  key: 'duel',
  reset: () => { Duel.cool = 120; Duel.challenger = null; Duel.active = null; },
  update: dt => Duel.update(dt),
  interactions: () => Duel.interactions()
});
