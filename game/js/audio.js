/* Outlaw County — audio.js
 * Every sound is synthesized with the Web Audio API: gunshots, hooves, trains,
 * ambience and a small adaptive frontier score. No audio files are needed.
 */
'use strict';

const Sound = {
  ctx: null, master: null, sfx: null, music: null, amb: null, noise: null,
  vol: { master: 0.8, sfx: 0.9, music: 0.45 },
  listener: { x: 0, y: 0 },
  windNode: null, windGain: null, rainGain: null,
  musicState: { next: 0, step: 0, tension: 0, phrase: [], bassRoot: 0, enabled: true },
  lastPlay: Object.create(null),

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const c = this.ctx = new AC();
    this.master = c.createGain(); this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
    comp.connect(this.master);
    this.sfx = c.createGain(); this.sfx.connect(comp);
    this.music = c.createGain(); this.music.connect(comp);
    this.amb = c.createGain(); this.amb.connect(comp);
    const len = c.sampleRate * 2, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    this.noise = buf;
    this.applyVolumes();
    this.startAmbience();
  },

  applyVolumes() {
    if (!this.ctx) return;
    this.master.gain.value = this.vol.master;
    this.sfx.gain.value = this.vol.sfx;
    this.music.gain.value = this.vol.music;
    this.amb.gain.value = this.vol.sfx * 0.7;
  },

  startAmbience() {
    const c = this.ctx;
    const mk = (freq, q) => {
      const src = c.createBufferSource(); src.buffer = this.noise; src.loop = true;
      const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(f); f.connect(g); g.connect(this.amb); src.start();
      return { g, f };
    };
    const w = mk(400, 0.6); this.windGain = w.g; this.windNode = w.f;
    const r = mk(2500, 0.3); this.rainGain = r.g;
  },

  setAmbience(wind, rain) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(0.05 + wind * 0.35, t, 0.8);
    this.windNode.frequency.setTargetAtTime(300 + wind * 500 + Math.sin(t * 0.3) * 120, t, 1);
    this.rainGain.gain.setTargetAtTime(rain * 0.35, t, 1);
  },

  /* positional helper: returns gain multiplier and pan for a world position */
  spatial(x, y) {
    if (x === undefined) return { g: 1, p: 0 };
    const d = dist(x, y, this.listener.x, this.listener.y);
    const g = clamp(1 - d / 900, 0, 1);
    return { g: g * g, p: clamp((x - this.listener.x) / 400, -1, 1) };
  },

  out(gainValue, pan) {
    const c = this.ctx, g = c.createGain(); g.gain.value = gainValue;
    if (c.createStereoPanner) { const p = c.createStereoPanner(); p.pan.value = pan || 0; g.connect(p); p.connect(this.sfx); }
    else g.connect(this.sfx);
    return g;
  },

  noiseBurst(dest, t, dur, freq, q, vol, type = 'lowpass', attack = 0.002) {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
    return f;
  },

  tone(dest, t, freq, dur, vol, type = 'sine', slideTo, attack = 0.005) {
    const c = this.ctx, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
  },

  play(name, x, y, volMul = 1) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const sp = this.spatial(x, y);
    if (sp.g < 0.01) return;
    const now = this.ctx.currentTime;
    // throttle identical sounds so crowds of NPCs do not clip
    if (this.lastPlay[name] && now - this.lastPlay[name] < 0.025) return;
    this.lastPlay[name] = now;
    const t = now + 0.005, o = this.out(sp.g * volMul, sp.p);
    switch (name) {
      case 'revolver':
        this.noiseBurst(o, t, 0.5, 1800, 0.7, 1.0); this.noiseBurst(o, t, 0.12, 5000, 0.5, 0.6, 'highpass');
        this.tone(o, t, 140, 0.18, 0.7, 'triangle', 45); break;
      case 'revolver2':
        this.noiseBurst(o, t, 0.4, 2300, 0.7, 0.85); this.noiseBurst(o, t, 0.1, 6000, 0.5, 0.5, 'highpass');
        this.tone(o, t, 170, 0.14, 0.55, 'triangle', 55); break;
      case 'rifle':
        this.noiseBurst(o, t, 0.85, 1200, 0.8, 1.1); this.noiseBurst(o, t, 0.15, 4200, 0.6, 0.7, 'highpass');
        this.tone(o, t, 110, 0.3, 0.8, 'triangle', 35); break;
      case 'repeater':
        this.noiseBurst(o, t, 0.6, 1500, 0.8, 1.0); this.noiseBurst(o, t, 0.12, 4800, 0.6, 0.6, 'highpass');
        this.tone(o, t, 125, 0.22, 0.7, 'triangle', 40); break;
      case 'shotgun':
        this.noiseBurst(o, t, 0.9, 900, 0.5, 1.3); this.noiseBurst(o, t, 0.25, 3000, 0.4, 0.8);
        this.tone(o, t, 80, 0.35, 0.9, 'triangle', 30); break;
      case 'knife':
        this.noiseBurst(o, t, 0.12, 3000, 2, 0.4, 'bandpass', 0.03); break;
      case 'cock':
        this.noiseBurst(o, t, 0.03, 4000, 4, 0.5, 'bandpass'); this.noiseBurst(o, t + 0.08, 0.04, 2600, 5, 0.6, 'bandpass'); break;
      case 'lever':
        this.noiseBurst(o, t, 0.05, 2000, 3, 0.6, 'bandpass'); this.noiseBurst(o, t + 0.16, 0.06, 1500, 3, 0.7, 'bandpass'); break;
      case 'click':
        this.noiseBurst(o, t, 0.03, 3500, 5, 0.45, 'bandpass'); break;
      case 'empty':
        this.noiseBurst(o, t, 0.025, 5000, 6, 0.4, 'bandpass'); break;
      case 'shellIn':
        this.tone(o, t, 2400, 0.05, 0.12, 'square', 1800); this.noiseBurst(o, t, 0.03, 3000, 5, 0.3, 'bandpass'); break;
      case 'cylinder':
        for (let i = 0; i < 3; i++) this.noiseBurst(o, t + i * 0.045, 0.03, 3800, 6, 0.3, 'bandpass'); break;
      case 'brass':
        this.tone(o, t + 0.25, 3200 + Math.random() * 600, 0.06, 0.05, 'sine'); break;
      case 'hit':
        this.noiseBurst(o, t, 0.12, 600, 1, 0.7); this.tone(o, t, 90, 0.1, 0.4, 'sine', 50); break;
      case 'hurt':
        this.tone(o, t, 260, 0.25, 0.25, 'sawtooth', 140); this.noiseBurst(o, t, 0.15, 900, 1, 0.3); break;
      case 'die':
        this.tone(o, t, 220, 0.6, 0.25, 'sawtooth', 70); break;
      case 'ricochet':
        this.tone(o, t, 2600 + Math.random() * 900, 0.35, 0.12, 'sine', 900); break;
      case 'thud':
        this.noiseBurst(o, t, 0.1, 400, 1, 0.5); break;
      case 'step':
        this.noiseBurst(o, t, 0.05, 700, 1, 0.12); break;
      case 'hoof':
        this.noiseBurst(o, t, 0.07, 450, 2, 0.4); this.tone(o, t, 120, 0.05, 0.25, 'sine', 70); break;
      case 'neigh':
        this.tone(o, t, 600, 0.6, 0.18, 'sawtooth', 380); this.tone(o, t + 0.05, 900, 0.45, 0.08, 'square', 520); break;
      case 'whistle':
        this.tone(o, t, 1500, 0.18, 0.25, 'sine', 2300); this.tone(o, t + 0.22, 1700, 0.35, 0.25, 'sine', 2600); break;
      case 'coin':
        this.tone(o, t, 1320, 0.12, 0.25, 'square'); this.tone(o, t + 0.08, 1980, 0.3, 0.2, 'square'); break;
      case 'buy':
        this.tone(o, t, 880, 0.08, 0.2, 'triangle'); this.tone(o, t + 0.07, 1320, 0.2, 0.2, 'triangle'); break;
      case 'deny':
        this.tone(o, t, 180, 0.25, 0.25, 'square', 120); break;
      case 'ui':
        this.tone(o, t, 660, 0.06, 0.12, 'triangle'); break;
      case 'door':
        this.noiseBurst(o, t, 0.25, 500, 3, 0.25, 'bandpass', 0.05); this.tone(o, t, 320, 0.2, 0.06, 'sawtooth', 260); break;
      case 'glass':
        for (let i = 0; i < 5; i++) this.tone(o, t + i * 0.025, 2500 + Math.random() * 3000, 0.15, 0.08, 'sine');
        this.noiseBurst(o, t, 0.15, 6000, 1, 0.3, 'highpass'); break;
      case 'explosion':
        this.noiseBurst(o, t, 1.8, 500, 0.5, 1.6); this.noiseBurst(o, t, 0.4, 2000, 0.5, 0.8);
        this.tone(o, t, 60, 1.0, 1, 'sine', 25); break;
      case 'fuse':
        this.noiseBurst(o, t, 0.5, 5000, 1, 0.15, 'highpass', 0.1); break;
      case 'trainHorn':
        this.tone(o, t, 311, 1.4, 0.15, 'sawtooth', 300, 0.1); this.tone(o, t, 392, 1.4, 0.12, 'sawtooth', 380, 0.1);
        this.tone(o, t, 466, 1.4, 0.1, 'sawtooth', 455, 0.1); break;
      case 'chug':
        this.noiseBurst(o, t, 0.18, 300, 1, 0.35); break;
      case 'bell':
        this.tone(o, t, 1046, 0.8, 0.12, 'sine'); this.tone(o, t, 2093, 0.4, 0.05, 'sine'); break;
      case 'dig':
        this.noiseBurst(o, t, 0.18, 800, 1, 0.4, 'lowpass', 0.03); break;
      case 'pickup':
        this.tone(o, t, 520, 0.08, 0.15, 'triangle'); this.tone(o, t + 0.06, 780, 0.12, 0.15, 'triangle'); break;
      case 'mission':
        [392, 494, 587, 784].forEach((f, i) => this.tone(o, t + i * 0.12, f, 0.6, 0.18, 'triangle'));
        this.tone(o, t + 0.5, 196, 1.2, 0.15, 'sawtooth'); break;
      case 'fail':
        [392, 370, 349, 262].forEach((f, i) => this.tone(o, t + i * 0.2, f, 0.5, 0.18, 'triangle')); break;
      case 'wanted':
        this.tone(o, t, 880, 0.15, 0.15, 'square'); this.tone(o, t + 0.18, 660, 0.25, 0.15, 'square'); break;
      case 'howl':
        this.tone(o, t, 500, 0.6, 0.08, 'sine', 900, 0.2); this.tone(o, t + 0.6, 900, 1.2, 0.08, 'sine', 600, 0.05); break;
      case 'thunder':
        this.noiseBurst(o, t, 3.0, 220, 0.4, 1.0, 'lowpass', 0.3); break;
      case 'punch':
        this.noiseBurst(o, t, 0.08, 500, 1, 0.6); break;
      case 'hitmark':
        this.tone(o, t, 1900, 0.05, 0.12, 'square', 1500); break;
      case 'killmark':
        this.tone(o, t, 1400, 0.08, 0.15, 'square', 900); this.tone(o, t + 0.06, 700, 0.18, 0.12, 'triangle', 350); break;
      case 'roll':
        this.noiseBurst(o, t, 0.28, 600, 1, 0.35, 'lowpass', 0.04); break;
      case 'throw':
        this.noiseBurst(o, t, 0.22, 1500, 2, 0.3, 'bandpass', 0.06); break;
      case 'nervesOn':
        this.tone(o, t, 220, 0.9, 0.18, 'sine', 110, 0.05); this.tone(o, t, 440, 0.6, 0.06, 'triangle', 220); break;
      case 'nervesOff':
        this.tone(o, t, 110, 0.5, 0.15, 'sine', 240, 0.02); break;
      case 'crow':
        this.tone(o, t, 900, 0.18, 0.06, 'sawtooth', 600); this.tone(o, t + 0.22, 850, 0.18, 0.06, 'sawtooth', 560); break;
    }
  },

  /* ---------- adaptive frontier music ---------- */
  setTension(v) { this.musicState.tension = v; },

  updateMusic() {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicState.enabled || this.vol.music <= 0) return;
    const m = this.musicState, c = this.ctx;
    const bpm = m.tension > 0 ? 132 : 84;
    const stepDur = 60 / bpm / 2;
    if (m.next < c.currentTime) m.next = c.currentTime + 0.05;
    while (m.next < c.currentTime + 0.25) {
      this.musicStep(m.next, m.step, stepDur);
      m.step++; m.next += stepDur;
    }
  },

  musicStep(t, step, dur) {
    const m = this.musicState, out = this.music;
    // A minor / E Phrygian flavoured frontier scale
    const scale = [0, 3, 5, 7, 10, 12, 15, 17];
    const roots = [57, 57, 55, 53, 57, 52, 53, 52];
    if (step % 16 === 0) {
      m.bassRoot = roots[(step / 16) % roots.length | 0];
      m.phrase = [];
      for (let i = 0; i < 16; i++) m.phrase.push(Math.random() < (m.tension > 0 ? 0.6 : 0.42) ? pick(scale) : null);
    }
    const midi = n => 440 * Math.pow(2, (n - 69) / 12);
    const i = step % 16;
    // bass: "boom-chick" on beats
    if (i % 4 === 0) this.pluck(out, t, midi(m.bassRoot - 24), 0.5, 0.22);
    if (i % 4 === 2) this.pluck(out, t, midi(m.bassRoot - 17), 0.35, 0.12);
    if (i % 4 === 2) { this.pluck(out, t, midi(m.bassRoot - 5), 0.2, 0.05); this.pluck(out, t + 0.01, midi(m.bassRoot - 1), 0.2, 0.04); }
    const n = m.phrase[i];
    if (n !== null && n !== undefined) this.pluck(out, t, midi(m.bassRoot + n - 12 + (m.tension > 0 ? 0 : 12)), 0.7, 0.07);
    if (m.tension > 0) {
      if (i % 2 === 0) this.noiseBurst(out, t, 0.05, 6000, 1, 0.04, 'highpass');
      if (i % 8 === 4) this.noiseBurst(out, t, 0.2, 180, 1, 0.25);
    }
  },

  pluck(out, t, f, dur, vol) {
    const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator();
    o.type = 'triangle'; o2.type = 'sawtooth';
    o.frequency.value = f; o2.frequency.value = f * 1.003;
    const filt = c.createBiquadFilter(); filt.type = 'lowpass';
    filt.frequency.setValueAtTime(f * 8, t); filt.frequency.exponentialRampToValueAtTime(f * 1.5, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0005, t + dur);
    const g2 = c.createGain(); g2.gain.value = 0.25;
    o.connect(filt); o2.connect(g2); g2.connect(filt); filt.connect(g); g.connect(out);
    o.start(t); o2.start(t); o.stop(t + dur + 0.05); o2.stop(t + dur + 0.05);
  }
};
