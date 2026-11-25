/* Outlaw County — music.js (v2.2)
 * A tune for every region, all synthesized on the fly: guitar plucks in the
 * county, cold bells in the mountains, a waltz by the lake, banjo in ranch
 * country, drones in the canyons, a lonely whistle on the salt, harmonica in
 * the badlands and strummed guitar on the border. Fights and story missions
 * bring in the drums.
 */
'use strict';

const MUSIC_THEMES = {
  county:   { name: 'Dustwater Boom-Chick', bpm: 84, steps: 16, scale: [0, 3, 5, 7, 10, 12, 15, 17], roots: [57, 57, 55, 53, 57, 52, 53, 52], lead: 'pluck', dens: 0.42, bass: 'boom', oct: 12 },
  frost:    { name: 'Frostpeak Bells', bpm: 66, steps: 16, scale: [0, 2, 3, 5, 7, 9, 10, 12, 14], roots: [50, 50, 48, 46, 50, 53, 48, 50], lead: 'bell', dens: 0.26, bass: 'drone', oct: 24 },
  lake:     { name: 'Harlow Waltz', bpm: 104, steps: 12, scale: [0, 2, 4, 5, 7, 9, 11, 12], roots: [55, 55, 60, 62, 55, 52, 60, 62], lead: 'reed', dens: 0.5, bass: 'waltz', oct: 12 },
  ranch:    { name: 'Ranch Country Banjo', bpm: 112, steps: 16, scale: [0, 2, 4, 7, 9, 12, 14, 16], roots: [60, 60, 65, 67, 60, 57, 65, 67], lead: 'banjo', dens: 0.55, bass: 'boom', oct: 12 },
  canyon:   { name: 'Red Rock Drone', bpm: 76, steps: 16, scale: [0, 1, 4, 5, 7, 8, 10, 12], roots: [52, 52, 53, 52, 50, 52, 53, 52], lead: 'pluck', dens: 0.34, bass: 'tom', oct: 12 },
  salt:     { name: 'Bonewhite Whistle', bpm: 58, steps: 16, scale: [0, 3, 5, 6, 7, 10, 12], roots: [54, 54, 54, 52, 54, 54, 57, 54], lead: 'whistle', dens: 0.17, bass: 'drone', oct: 24 },
  badlands: { name: 'Badlands Harp', bpm: 80, steps: 16, scale: [0, 3, 5, 7, 10, 12, 15], roots: [52, 52, 55, 57, 52, 50, 55, 52], lead: 'reed', dens: 0.4, bass: 'boom', oct: 12 },
  mexico:   { name: 'Mariachi del Sur', bpm: 116, steps: 12, scale: [0, 2, 4, 5, 7, 9, 11, 12, 14], roots: [57, 57, 52, 57, 62, 57, 52, 57], lead: 'brass', dens: 0.55, bass: 'waltz', oct: 12 },
  border:   { name: 'Rio Bravo Strum', bpm: 100, steps: 12, scale: [0, 1, 4, 5, 7, 8, 10, 12], roots: [52, 52, 57, 53, 52, 52, 50, 52], lead: 'strum', dens: 0.48, bass: 'waltz', oct: 12 }
};

const Music = {
  theme: 'county', want: 'county', combat: 0, mission: false,
  themeFor(region) {
    const r = region || '';
    if (/Juniper|Dustwater|Mesa Flats|Pinewood|Red Sand|Coyote|Outlaw/.test(r)) return 'county';
    if (/Frost|Silver Crown/.test(r)) return 'frost';
    if (/Harlow|Port/.test(r)) return 'lake';
    if (/Ranch|Granger|Cottonwood|Delaney|Hendry/.test(r)) return 'ranch';
    if (/Canyon|Rattlesnake/.test(r)) return 'canyon';
    if (/Salt|Hollow|Bonewhite/.test(r)) return 'salt';
    if (/Badlands|Last Water/.test(r)) return 'badlands';
    if (/Santa Rosa|Real de Plata|San Isidro|Valle de Oro|Puerto Dorado|Sonora|Sierra Madre|Barranca|Laguna|Costa Dorada|Hacienda|Cortés/.test(r)) return 'mexico';
    if (/Rio|San Lucero|Bravo/.test(r)) return 'border';
    return 'county';
  },
  update(dt) {
    const P = G.player; if (!P) return;
    this.want = this.themeFor(G.region);
    this.mission = !!MissionSys.active;
    // a fight nearby brings in the drums for a while
    let fighting = false;
    for (const a of G.actors) if (!a.dead && a.engaged && a.faction !== 'gang' && a.faction !== 'civ' && Math.abs(a.x - P.x) < 360 && Math.abs(a.y - P.y) < 300) { fighting = true; break; }
    this.combat = fighting ? 6 : Math.max(0, this.combat - dt);
  }
};

(function patchMusic() {
  const S = Sound;
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  const intensity = () => (S.musicState.tension > 0 || Music.combat > 0) ? 2 : Music.mission ? 1 : 0;
  const theme = () => MUSIC_THEMES[Music.theme] || MUSIC_THEMES.county;
  S.updateMusic = function () {
    if (!this.ctx || this.ctx.state !== 'running' || !this.musicState.enabled || this.vol.music <= 0) return;
    const m = this.musicState, c = this.ctx, th = theme(), lvl = intensity();
    const bpm = th.bpm * (lvl === 2 ? 1.45 : lvl === 1 ? 1.1 : 1);
    const stepDur = 60 / bpm / 2;
    if (m.next < c.currentTime) m.next = c.currentTime + 0.05;
    while (m.next < c.currentTime + 0.25) { this.musicStep(m.next, m.step, stepDur); m.step++; m.next += stepDur; }
  };
  const inst = {
    pluck: (o, t, f, v) => S.pluck(o, t, f, 0.7, v),
    banjo: (o, t, f, v) => { S.pluck(o, t, f, 0.32, v * 1.1); S.pluck(o, t, f * 2, 0.18, v * 0.35); },
    bell: (o, t, f, v) => { S.tone(o, t, f, 1.6, v * 0.8, 'sine', f); S.tone(o, t, f * 2.01, 0.9, v * 0.25, 'sine', f * 2.01); },
    reed: (o, t, f, v) => { S.tone(o, t, f, 0.42, v * 0.38, 'square', f * 0.995); S.tone(o, t, f * 1.006, 0.42, v * 0.2, 'triangle', f); },
    whistle: (o, t, f, v) => { S.tone(o, t, f * 0.985, 1.1, v * 0.7, 'sine', f); },
    brass: (o, t, f, v) => { S.tone(o, t, f, 0.32, v * 0.42, 'sawtooth', f); S.tone(o, t + 0.005, f * 1.5, 0.28, v * 0.22, 'square', f * 1.5); S.pluck(o, t, f / 2, 0.4, v * 0.5); },
    strum: (o, t, f, v) => { for (let i = 0; i < 3; i++) S.pluck(o, t + i * 0.018, f * [1, 1.26, 1.5][i], 0.6, v * 0.7); }
  };
  S.musicStep = function (t, step, dur) {
    const m = this.musicState, out = this.music;
    let th = theme();
    const len = th.steps;
    if (step % len === 0) {
      if (Music.want !== Music.theme) { Music.theme = Music.want; th = theme(); }   // change tunes on a phrase boundary
      m.bar = (m.bar || 0) + 1;
      m.bassRoot = th.roots[m.bar % th.roots.length];
      m.phrase = [];
      const lvl = intensity();
      for (let i = 0; i < th.steps; i++) m.phrase.push(Math.random() < th.dens + (lvl ? 0.15 : 0) ? pick(th.scale) : null);
    }
    const i = step % th.steps, lvl = intensity(), root = m.bassRoot || th.roots[0];
    // bass
    if (th.bass === 'boom') {
      if (i % 4 === 0) this.pluck(out, t, midi(root - 24), 0.5, 0.22);
      if (i % 4 === 2) { this.pluck(out, t, midi(root - 17), 0.35, 0.12); this.pluck(out, t, midi(root - 5), 0.2, 0.05); this.pluck(out, t + 0.01, midi(root - 1), 0.2, 0.04); }
    } else if (th.bass === 'waltz') {
      if (i % 6 === 0) this.pluck(out, t, midi(root - 24), 0.55, 0.22);
      if (i % 6 === 2 || i % 6 === 4) { this.pluck(out, t, midi(root - 12), 0.22, 0.06); this.pluck(out, t, midi(root - 8), 0.22, 0.05); this.pluck(out, t, midi(root - 5), 0.22, 0.05); }
    } else if (th.bass === 'drone') {
      if (i === 0) { this.tone(out, t, midi(root - 24), dur * th.steps * 0.95, 0.1, 'triangle', midi(root - 24)); this.tone(out, t, midi(root - 17), dur * th.steps * 0.95, 0.05, 'sine', midi(root - 17)); }
    } else if (th.bass === 'tom') {
      if (i % 8 === 0 || i % 8 === 3) this.tone(out, t, 110, 0.35, 0.22, 'sine', 55);
      if (i % 4 === 0) this.pluck(out, t, midi(root - 24), 0.6, 0.16);
    }
    // melody
    const n = m.phrase[i];
    if (n !== null && n !== undefined) inst[th.lead](out, t, midi(root + n - 12 + (lvl === 2 ? 0 : th.oct)), th.lead === 'bell' || th.lead === 'whistle' ? 0.09 : 0.07);
    // drums for story missions and fights
    if (lvl >= 1) {
      const beat = th.steps === 12 ? 6 : 8;
      if (i % beat === 0) this.tone(out, t, 95, 0.18, lvl === 2 ? 0.32 : 0.18, 'sine', 45);
      if (i % beat === beat / 2) this.noiseBurst(out, t, 0.12, 1700, 0.8, lvl === 2 ? 0.16 : 0.08);
    }
    if (lvl === 2) {
      if (i % 2 === 0) this.noiseBurst(out, t, 0.04, 7000, 1, 0.05, 'highpass');
      if (i % 4 === 0) this.pluck(out, t, midi(root - 12), 0.18, 0.1);
    }
  };
})();

Hooks.add({ key: 'music', update: dt => Music.update(dt) });
