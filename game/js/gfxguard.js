/* Outlaw County — gfxguard.js (v2.6.1)
 * If the graphics driver resets (the screen flashes black), the browser wipes
 * every canvas the game drew ahead of time: the ground, the map and the
 * minimap. The game would then keep drawing sprites over a blank, smeared
 * screen. This notices the wipe and redraws everything.
 */
'use strict';

const GfxGuard = {
  lost() {
    if (Game.ctx && Game.ctx.isContextLost && Game.ctx.isContextLost()) return true;
    const m = World.minimap; if (!m) return false;
    try {
      const g = m.getContext('2d');
      if (g.isContextLost && g.isContextLost()) return true;
      // the minimap is solid terrain everywhere; a see-through pixel means it was wiped
      return g.getImageData(m.width >> 1, m.height >> 1, 1, 1).data[3] === 0 && g.getImageData(m.width >> 2, m.height >> 2, 1, 1).data[3] === 0;
    } catch (e) { return false; }
  },
  recover() {
    try {
      World.chunkCache.clear();
      World.buildMinimap();
      Discovery.fog = null; Discovery.dirty = true;
      Game.resize();
      if (UI.modal === 'map' && UI.renderMap) UI.renderMap();
      console.info('Graphics were reset by the system; redrew the world.');
    } catch (e) { console.warn('Graphics recovery failed', e); }
  },
  start() {
    if (this.started) return; this.started = true;
    const cv = Game.ctx && Game.ctx.canvas;
    if (cv) cv.addEventListener('contextrestored', () => this.recover());
    setInterval(() => { if (G.state === 'play' || G.state === 'menu') if (this.lost()) this.recover(); }, 1500);
  }
};

Hooks.add({ key: 'gfx', update: () => GfxGuard.start() });
