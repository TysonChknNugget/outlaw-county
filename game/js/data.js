/* Outlaw County — data.js
 * Game balance tables: weapons, ammo, items, horses, crimes and shops.
 * The website loads this same file for its weapon showcase.
 */
'use strict';

const TS = 16; // world tile size in pixels

/* Weapon stats. Distances are world pixels (1 tile = 16px), times in seconds.
 * reload: 'single' loads one round at a time (interruptible by firing),
 *         'full' swaps the whole load at once. */
const WEAPONS = {
  fists: {
    name: 'Fists', slot: 1, melee: true, nonlethal: true, dmg: 17, rate: 0.36, range: 16, accuracy: 1,
    price: 0, desc: 'Knocks a man cold instead of killing him. Perfect for bringing bounties in alive.', len: 2
  },
  knife: {
    name: 'Bowie Knife', slot: 1, melee: true, dmg: 48, rate: 0.42, range: 20, accuracy: 1,
    price: 0, desc: 'Quiet and fast. Never runs dry.', len: 4
  },
  sa: {
    name: 'Cattleman Single-Action', slot: 2, dmg: 36, rate: 0.55, cap: 6, ammo: 'revolver',
    reload: 'single', reloadTime: 0.42, spread: 0.025, range: 300, speed: 560, recoil: 2.5,
    cock: true, sound: 'revolver', price: 0, len: 5, accuracy: 0.92,
    desc: 'Thumb the hammer, squeeze the trigger. Heavy, honest and deadly accurate.'
  },
  da: {
    name: 'Lightning Double-Action', slot: 2, dmg: 25, rate: 0.19, cap: 6, ammo: 'revolver',
    reload: 'single', reloadTime: 0.33, spread: 0.075, range: 260, speed: 520, recoil: 1.6,
    sound: 'revolver2', price: 120, len: 5, accuracy: 0.72,
    desc: 'Pull and fire as fast as your finger moves. Wild at range.'
  },
  lever: {
    name: 'Lever-Action Rifle', slot: 3, dmg: 54, rate: 0.72, cap: 10, ammo: 'rifle',
    reload: 'single', reloadTime: 0.5, spread: 0.01, range: 560, speed: 780, recoil: 3.2,
    lever: true, sound: 'rifle', price: 210, len: 9, accuracy: 0.97,
    desc: 'Work the lever between shots. Reaches across the whole street.'
  },
  shotgun: {
    name: 'Coach Gun', slot: 4, dmg: 13, pellets: 8, rate: 0.28, cap: 2, ammo: 'shells',
    reload: 'full', reloadTime: 1.55, spread: 0.24, range: 165, speed: 470, recoil: 5.5,
    sound: 'shotgun', price: 165, len: 8, accuracy: 0.4,
    desc: 'Two barrels of buckshot. Clears a saloon doorway in one breath.'
  },
  repeater: {
    name: 'Carbine Repeater', slot: 5, dmg: 41, rate: 0.36, cap: 7, ammo: 'rifle',
    reload: 'full', reloadTime: 2.1, spread: 0.03, range: 500, speed: 720, recoil: 2.6,
    sound: 'repeater', price: 290, len: 8, accuracy: 0.88,
    desc: 'Seven-shot tube magazine. Fast follow-ups at rifle range.'
  }
};
const WEAPON_ORDER = ['fists', 'knife', 'sa', 'da', 'lever', 'shotgun', 'repeater'];

const AMMO = {
  revolver: { name: 'Revolver Cartridges', box: 24, price: 6, max: 120 },
  rifle: { name: 'Rifle Cartridges', box: 20, price: 9, max: 100 },
  shells: { name: 'Buckshot Shells', box: 12, price: 8, max: 48 }
};

/* type: use = consumable, pelt = legal trade good, stolen = only the fence buys */
const ITEMS = {
  bandage: { name: 'Bandage', type: 'use', price: 8, sell: 3, heal: 35, desc: 'Restores 35 health.' },
  tonic: { name: 'Snake Oil Tonic', type: 'use', price: 16, sell: 6, heal: 20, stamina: 100, desc: 'Restores 20 health and all stamina.' },
  whiskey: { name: 'Whiskey', type: 'use', price: 4, sell: 1, heal: 12, desc: 'Restores 12 health. Steadies the nerves.' },
  oats: { name: 'Horse Oats', type: 'use', price: 5, sell: 2, horse: 60, desc: 'Restores 60 health and full stamina to your horse.' },
  dynamite: { name: 'Dynamite', type: 'throw', price: 14, sell: 4, desc: 'Press G to throw. Short fuse, big bang.' },
  firebottle: { name: 'Fire Bottle', type: 'throw', price: 9, sell: 3, desc: 'Press G to throw. Leaves a patch of fire for a few seconds.' },
  pelt_rabbit: { name: 'Rabbit Pelt', type: 'pelt', sell: 4, desc: 'Soft and small.' },
  pelt_coyote: { name: 'Coyote Pelt', type: 'pelt', sell: 9, desc: 'Mangy but sellable.' },
  pelt_deer: { name: 'Deer Hide', type: 'pelt', sell: 14, desc: 'A fine hide.' },
  pelt_cougar: { name: 'Cougar Pelt', type: 'pelt', sell: 24, desc: 'Tawny and heavy. Trappers pay well.' },
  pelt_bear: { name: 'Bear Hide', type: 'pelt', sell: 32, desc: 'A mountain grizzly. Worth the trouble.' },
  pelt_elk: { name: 'Elk Hide', type: 'pelt', sell: 18, desc: 'Thick winter hide from the high country.' },
  jewelry: { name: 'Jewelry', type: 'stolen', sell: 28, desc: 'Rings and brooches. Hot property.' },
  watch: { name: 'Pocket Watch', type: 'stolen', sell: 16, desc: 'Engraved to somebody else.' },
  gold_bar: { name: 'Gold Bar', type: 'stolen', sell: 140, desc: 'Stamped by the county bank.' },
  treasure_map: { name: 'Treasure Map', type: 'map', sell: 0, desc: 'Marks a buried cache on your map.' }
};
const ITEM_ORDER = ['bandage', 'tonic', 'whiskey', 'oats', 'pelt_rabbit', 'pelt_coyote', 'pelt_deer', 'pelt_elk', 'pelt_cougar', 'pelt_bear', 'jewelry', 'watch', 'gold_bar', 'treasure_map', 'dynamite', 'firebottle'];
const THROWABLES = ['dynamite', 'firebottle'];

/* Reputation perks: one is chosen each time the player levels up. */
const PERKS = {
  gunfighter: { name: 'Gunfighter', desc: 'Your bullets do 15% more damage.' },
  quickhands: { name: 'Quick Hands', desc: 'Reload 30% faster.' },
  steadyhand: { name: 'Steady Hand', desc: 'Precise shots line up 40% faster.' },
  tough: { name: 'Tough as Leather', desc: '+30 maximum health.' },
  medic: { name: 'Sawbones', desc: 'Health recovers faster and up to 75% on its own.' },
  sprinter: { name: 'Fleet Foot', desc: 'Sprinting and dodge rolls use less stamina.' },
  nerves: { name: 'Nerves of Steel', desc: 'Steady Nerves fills 50% faster.' },
  horseman: { name: 'Horseman', desc: 'Your horse tires 40% slower when galloping.' },
  packmule: { name: 'Pack Mule', desc: 'Carry 50% more ammunition.' },
  haggler: { name: 'Silver Tongue', desc: 'Shop prices are 15% lower.' },
  fence: { name: 'Fence Friend', desc: 'Stolen goods sell for 25% more.' },
  ghost: { name: 'Ghost', desc: 'Witnesses take longer to report and the law gives up its search sooner.' }
};

/* speeds are px/s; walk is ~58 and running ~100 for comparison */
const HORSE_BREEDS = {
  nag: { name: 'Swayback Nag', speed: 120, sprint: 180, stamina: 80, hp: 90, accel: 120, turn: 3.2, price: 0, coats: ['#7a5a3a', '#5e4630', '#8c7b68'] },
  mustang: { name: 'Pinto Mustang', speed: 140, sprint: 225, stamina: 110, hp: 120, accel: 170, turn: 3.6, price: 75, coats: ['#8b5a2b', '#e8dcc8', '#6b3e1f'] },
  morgan: { name: 'Morgan', speed: 150, sprint: 240, stamina: 140, hp: 160, accel: 160, turn: 3.2, price: 150, coats: ['#3b2416', '#5a3418'] },
  quarter: { name: 'Quarter Horse', speed: 165, sprint: 270, stamina: 125, hp: 140, accel: 220, turn: 3.8, price: 260, coats: ['#a0522d', '#c08040'] },
  arabian: { name: 'Arabian', speed: 175, sprint: 300, stamina: 170, hp: 130, accel: 200, turn: 4.2, price: 450, coats: ['#e6e1d8', '#2a2a2a'], patterns: ['dapple', null] },
  // v2.3
  mule: { name: 'Mule', speed: 125, sprint: 185, stamina: 220, hp: 150, accel: 140, turn: 3.4, price: 60, coats: ['#6a5848', '#4a3a2e', '#8a7a66'], surefoot: true, mule: true,
    trait: 'Sure-footed: snow and river fords never slow it down.' },
  draft: { name: 'Shire Draft', speed: 120, sprint: 195, stamina: 200, hp: 260, accel: 110, turn: 2.6, price: 220, coats: ['#2a1a10', '#5a3418', '#1a1a1a'], brave: true, big: true, socks: 0.9,
    trait: 'Brave and enormous: takes 40% less damage.' },
  walker: { name: 'Tennessee Walker', speed: 158, sprint: 248, stamina: 180, hp: 140, accel: 170, turn: 3.8, price: 280, coats: ['#3a2416', '#7a4a26', '#1a1410'], smooth: true, socks: 0.4,
    trait: 'Smooth gait: your aim stays steadier in the saddle.' },
  appaloosa: { name: 'Appaloosa', speed: 155, sprint: 255, stamina: 150, hp: 145, accel: 190, turn: 4.0, price: 320, coats: ['#e8dcc8', '#8a5a3a', '#5a4030'], patterns: ['blanket'], surefoot: true,
    trait: 'Sure-footed: snow and river fords never slow it down.' },
  foxtrotter: { name: 'Missouri Fox Trotter', speed: 160, sprint: 252, stamina: 190, hp: 135, accel: 180, turn: 3.9, price: 340, coats: ['#a0522d', '#6a3a1a', '#c8a070'], tireless: true, patterns: ['blaze', null],
    trait: 'Tireless: galloping drains 35% less stamina.' },
  thoroughbred: { name: 'Thoroughbred', speed: 182, sprint: 322, stamina: 115, hp: 110, accel: 235, turn: 3.6, price: 600, coats: ['#5a2a14', '#2a1a10', '#8a4a20'], patterns: ['blaze'], socks: 0.6,
    trait: 'The fastest horse money can buy, but it tires quickly.' },
  andalusian: { name: 'Andalusian', speed: 172, sprint: 290, stamina: 165, hp: 175, accel: 210, turn: 4.4, price: 700, coats: ['#d8d4cc', '#9a9a9a', '#2a2a2a'], patterns: ['dapple'], brave: true,
    trait: 'Fast, nimble and brave: takes 40% less damage.' },
  nokota: { name: 'Nokota', speed: 162, sprint: 272, stamina: 170, hp: 160, accel: 200, turn: 4.0, price: 0, wildOnly: true, coats: ['#6a6a78', '#4a3a2e', '#8a7a66'], patterns: ['roan'], surefoot: true, socks: 0.5,
    trait: 'A wild breed of Ranch Country. Can only be caught and broken.' },
  ghost: { name: 'The Bonewhite Ghost', speed: 192, sprint: 335, stamina: 230, hp: 220, accel: 240, turn: 4.5, price: 0, wildOnly: true, legendary: true, coats: ['#f4f0e8'], patterns: ['dapple'], surefoot: true, tireless: true, brave: true,
    trait: 'A legend of the salt flats. Fast, tireless, sure-footed and brave.' }
};
const HORSE_NAMES = ['Dusty', 'Buck', 'Whiskey', 'Ghost', 'Ranger', 'Pepper', 'Sable', 'Cinder', 'Copper', 'Blaze', 'Shiloh', 'Jasper', 'Duke', 'Maverick'];

const CRIMES = {
  gunfire: { label: 'Discharging a firearm in town', bounty: 5, heat: 1 },
  mugging: { label: 'Armed robbery of a citizen', bounty: 20, heat: 1 },
  assault: { label: 'Assault', bounty: 15, heat: 1 },
  murder: { label: 'Murder', bounty: 60, heat: 3 },
  assault_law: { label: 'Assaulting a lawman', bounty: 40, heat: 2 },
  kill_law: { label: 'Killing a lawman', bounty: 110, heat: 3 },
  horse_theft: { label: 'Horse theft', bounty: 35, heat: 1 },
  store_robbery: { label: 'Store robbery', bounty: 80, heat: 2 },
  stage_robbery: { label: 'Stagecoach robbery', bounty: 120, heat: 2 },
  train_robbery: { label: 'Train robbery', bounty: 240, heat: 3 },
  bank_robbery: { label: 'Bank robbery', bounty: 500, heat: 5 },
  jailbreak: { label: 'Aiding a jailbreak', bounty: 180, heat: 3 },
  resisting: { label: 'Resisting arrest', bounty: 20, heat: 2 },
  looting: { label: 'Looting the dead', bounty: 10, heat: 1 }
};

/* Shop definitions; `building` links to a building id in world.js */
const SHOPS = {
  dw_general: { name: 'Dustwater General Store', type: 'general', till: [60, 120] },
  dw_gunsmith: { name: "Hartley's Gunsmith", type: 'gunsmith', till: [80, 150] },
  dw_saloon: { name: 'The Rusty Spur Saloon', type: 'saloon', till: [50, 110] },
  dw_hotel: { name: 'Grand Frontier Hotel', type: 'hotel', till: [40, 80] },
  dw_stables: { name: 'Dustwater Livery & Stables', type: 'stables', till: [40, 90] },
  dw_bank: { name: 'Dustwater County Bank', type: 'bank', till: [160, 260] },
  dw_station: { name: 'Dustwater Station', type: 'station', till: [40, 70] },
  dw_sheriff: { name: "Sheriff's Office", type: 'sheriff' },
  mf_general: { name: 'Mesa Flats Trading Post', type: 'general', till: [80, 140] },
  mf_cantina: { name: 'Cantina del Sol', type: 'saloon', till: [40, 90] },
  mf_station: { name: 'Mesa Flats Station', type: 'station', till: [30, 60] },
  mf_sheriff: { name: 'Mesa Flats Jailhouse', type: 'sheriff' },
  camp_fence: { name: "Old Silas the Fence", type: 'fence' },
  // frontier towns (v1.3)
  sc_general: { name: 'Crown Outfitters', type: 'general', till: [70, 130] },
  sc_saloon: { name: 'The Bonanza', type: 'saloon', till: [60, 120] },
  sc_bank: { name: 'Silver Crown Assay Office', type: 'bank', till: [200, 320] },
  sc_gunsmith: { name: 'Lode Gunworks', type: 'gunsmith', till: [80, 150] },
  sc_hotel: { name: "The Miners' Rest", type: 'hotel', till: [40, 80] },
  sc_stables: { name: 'Silver Crown Livery', type: 'stables', till: [40, 90] },
  sc_station: { name: 'Silver Crown Depot', type: 'depot', till: [30, 60] },
  sc_sheriff: { name: 'Silver Crown Jail', type: 'sheriff' },
  ph_general: { name: 'Harlow Ship Chandlery', type: 'general', till: [80, 150] },
  ph_saloon: { name: 'The Lucky Anchor', type: 'saloon', till: [60, 120] },
  ph_bank: { name: 'Harlow Savings Bank', type: 'bank', till: [220, 360] },
  ph_gunsmith: { name: 'Dockside Arms', type: 'gunsmith', till: [80, 150] },
  ph_hotel: { name: 'Lakeview Hotel', type: 'hotel', till: [50, 90] },
  ph_stables: { name: 'Port Harlow Livery', type: 'stables', till: [40, 90] },
  ph_station: { name: 'Port Harlow Terminal', type: 'depot', till: [40, 70] },
  ph_sheriff: { name: 'Harbor Constable', type: 'sheriff' },
  fg_store: { name: "Sutler's Store", type: 'general', till: [60, 110] },
  fg_stockade: { name: 'Fort Granger Stockade', type: 'sheriff' },
  fg_stables: { name: 'Cavalry Remount', type: 'stables', till: [30, 60] },
  cc_general: { name: 'Cottonwood Mercantile', type: 'general', till: [40, 90] },
  sl_cantina: { name: 'Cantina La Paloma', type: 'saloon', till: [40, 90] },
  sl_general: { name: 'Mercado Arrieta', type: 'general', till: [50, 100] },
  sl_gunsmith: { name: 'Armería Reyes', type: 'gunsmith', till: [70, 130] },
  sl_stables: { name: 'Caballeriza San Lucero', type: 'stables', till: [30, 70] },
  sl_sheriff: { name: 'Casa de la Ley', type: 'sheriff' },
  trapper: { name: "Trapper Jo's Cabin", type: 'trapper' }
};

const SHOP_STOCK = {
  general: { buy: ['bandage', 'tonic', 'oats', 'firebottle', 'ammo:revolver', 'ammo:shells'], sells: ['pelt'] },
  gunsmith: { buy: ['weapon:da', 'weapon:lever', 'weapon:shotgun', 'weapon:repeater', 'ammo:revolver', 'ammo:rifle', 'ammo:shells', 'dynamite'], sells: [] },
  saloon: { buy: ['whiskey', 'service:meal', 'service:rumor'], sells: [] },
  hotel: { buy: ['service:sleep'], sells: [] },
  stables: { buy: ['horse:mustang', 'horse:morgan', 'horse:quarter', 'horse:arabian', 'oats', 'service:groom'], sells: [] },
  station: { buy: ['service:travel', 'service:paybounty'], sells: [] },
  depot: { buy: ['service:paybounty', 'oats', 'bandage'], sells: ['pelt'] },
  sheriff: { buy: ['service:paybounty', 'bounties'], sells: [] },
  fence: { buy: ['ammo:revolver', 'ammo:rifle', 'bandage', 'dynamite'], sells: ['stolen', 'pelt'] },
  trapper: { buy: ['ammo:rifle', 'bandage'], sells: ['pelt'], peltBonus: 1.25 },
  bank: { buy: [], sells: [] }
};

const SERVICES = {
  meal: { name: 'Hot Meal & Coffee', price: 6, desc: 'Restores 60 health and all stamina.' },
  rumor: { name: 'Buy a Round (hear rumors)', price: 12, desc: 'Loose lips reveal a buried cache on your map.' },
  sleep: { name: 'Rent a Room (sleep & save)', price: 10, desc: 'Sleep until morning, heal fully and save the game.' },
  groom: { name: 'Stable & Groom Your Horse', price: 8, desc: 'Fully heals your horse and brings it to the stables.' },
  travel: { name: 'Train Ticket', price: 8, desc: 'Ride the rails to the other station.' },
  paybounty: { name: 'Pay Off Bounty', price: 0, desc: 'Clear your bounty with the county.' }
};
