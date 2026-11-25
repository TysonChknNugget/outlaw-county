/* Outlaw County — mexico.js (v2.7)
 * How Mexico plays: rurales keep the peace instead of sheriffs, your American
 * wanted posters mean nothing south of the Rio Bravo, and American bounty
 * hunters won't cross the border after you.
 */
'use strict';

PAL.rural = { hat: '#3a3a3a', band: '#c8a040', shirt: '#d8d0c0', coat: '#5a5a52', pants: '#3a3a3a', skin: '#b07a50', boots: '#1a1410', hatType: 'sombrero', badge: true, mustache: '#14100c' };
const MEX_CLERKS = { sr_general: 'Don Aurelio', sr_saloon: 'Paloma', sr_bank: 'Señor Ybarra', sr_gunsmith: 'Chuy Ortega', sr_stables: 'Nacho', sr_hotel: 'Doña Inés',
  rp_general: 'Fermín Ruiz', rp_saloon: 'La Güera', rp_bank: 'Contador Villa', rp_gunsmith: 'Maestro Galván', rp_stables: 'Beto', rp_hotel: 'Doña Matilde',
  si_general: 'Sargento Pozos', si_saloon: 'Lupe', si_gunsmith: 'Armero Cruz', si_stables: 'Cabo Mena', si_hotel: 'Doña Carmen',
  vo_general: 'Don Esteban', vo_saloon: 'Rosario', vo_bank: 'Licenciado Soto', vo_gunsmith: 'Hernán', vo_stables: 'Pancho', vo_hotel: 'Doña Elena',
  pd_general: 'Capitán Marrero', pd_saloon: 'Marisol', pd_bank: 'Señor Delgado', pd_gunsmith: 'Tomás el Viejo', pd_stables: 'Goyo', pd_hotel: 'Doña Lucía' };
const MEX_CHIEFS = { 'Santa Rosa': 'Capitán Benavides', 'Real de Plata': 'Teniente Olvera', 'Presidio San Isidro': 'Coronel Montaño', 'Valle de Oro': 'Capitán Arce', 'Puerto Dorado': 'Comandante Rivas' };

const Mexico = {
  isIn(y) { return y >= MEX_Y * TS; },
  playerIn() { const P = G.player; return !!P && this.isIn(P.y); },
  dressed: new WeakSet(),

  update() {
    // rurales: Mexican lawmen in Mexican towns
    for (const a of G.actors) {
      if (this.dressed.has(a) || a.dead) continue;
      if (a.kind === 'lawman' && a.town && MEX_TOWNS.includes(a.town)) {
        a.pal = Object.assign({}, PAL.rural, Looks.face(), { hatType: 'sombrero', mustache: chance(0.6) ? '#14100c' : null });
        if (a.shopId) a.name = MEX_CHIEFS[a.town] || 'Capitán'; else a.name = 'Rural ' + pick(['Gómez', 'Herrera', 'Salazar', 'Rojas', 'Peña', 'Vargas', 'Medina', 'Ríos']);
        if (!a.shopId) a.weapon = pick(['carbine', 'repeater', 'schofield']);
      } else if (a.kind === 'clerk' && MEX_CLERKS[a.shopId] && a.name === 'Clerk') a.name = MEX_CLERKS[a.shopId];
      this.dressed.add(a);
    }
    // crossing the border
    const inside = this.playerIn();
    if (inside !== this.was && this.was !== undefined) {
      if (inside) UI.notify(Law.bounty > 0 ? `You crossed into Mexico. Your $${Law.bounty} American bounty means nothing to the rurales here, as long as you behave.` : 'You crossed the Rio Bravo into Mexico. Bienvenido.', 'mission');
      else UI.notify('Back across the Rio Bravo, into the United States.', 'info');
      UI.regionToast && UI.regionToast(inside ? 'MÉXICO' : 'UNITED STATES');
    }
    this.was = inside;
  }
};

/* American posters don't count down south, and American bounty hunters stay home */
(function () {
  const rec = Law.recognize.bind(Law);
  Law.recognize = function (lawman, dt) { if (Mexico.isIn(G.player.y) || Mexico.isIn(lawman.y)) return; return rec(lawman, dt); };
  if (typeof Hunters !== 'undefined') {
    const up = Hunters.update.bind(Hunters);
    Hunters.update = function (dt) {
      if (Mexico.playerIn() && this.group && !this.group.quit) {
        this.group.quit = true;
        for (const a of this.group.members) if (!a.dead) { a.aggro = false; a.forceHostile = false; a.preferLaw = true; a.bark("He's over the border. That's as far as I go.", true); a.post = { x: a.x, y: a.y - 900 }; }
      }
      if (Mexico.playerIn() && !this.group) { this.t = Math.max(this.t, 60); return; }
      return up(dt);
    };
  }
  if (typeof ACHIEVEMENTS !== 'undefined') ACHIEVEMENTS.push(
    { id: 'mexico', name: 'Al Otro Lado', desc: 'Cross the Rio Bravo into Mexico.', icon: '☀', test: () => Mexico.playerIn() },
    { id: 'mexico5', name: 'Gran Viajero', desc: 'Discover all five towns in Mexico.', icon: '☀', prog: () => [MEX_TOWNS.filter(t => G.world.discovered.includes(t)).length, 5] }
  );
})();

Hooks.add({ key: 'mexico', update: () => Mexico.update(), reset: () => { Mexico.was = undefined; Mexico.dressed = new WeakSet(); } });
