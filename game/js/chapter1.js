/* Outlaw County — chapter1.js
 * Prologue and Chapter 1, "A Name Buried".
 */
'use strict';

const campStage = (text = 'Ride back to camp.') => ({ text, marker: () => Story.campMarker(), done: () => { const c = Story.campPos(); return nearPlayer(c.x, c.y, 150) && Law.heat === 0; } });
Story.night = () => { const day = Math.floor(G.time / 1440) * 1440, h = (G.time % 1440) / 60; G.time = h >= 22 ? G.time : h < 4 ? G.time : day + 22.5 * 60; };
Story.boom = where => { const p = Story.at(where); FX.explosion(p.x, p.y); Sound.play('explosion', p.x, p.y); };
Story.fireRing = (where, n, r) => { const c = Story.at(where); for (let i = 0; i < n; i++) { const a = i / n * TAU; Combat.hazards.push({ x: c.x + Math.cos(a) * r * rand(0.6, 1.1), y: c.y + Math.sin(a) * r * rand(0.6, 1.1), kind: 'fire', life: 25, max: 25, r: 26, owner: null, tick: 0 }); } };

/* ------------------------------------------------------------ Prologue */
MissionSys.register({
  id: 'p0', title: 'Coming Home', giver: 'wes', giverName: 'Wes Quill', reward: 40, uses: ['wes'],
  hint: 'Wes Quill is waiting for you inside the Rusty Spur Saloon in Dustwater.',
  intro: [
    { who: 'Wes Quill', text: "There he is. The Professor. You look like a man who slept in a ditch, Calder, which is a compliment out here." },
    { who: 'Wes Quill', text: "My sister wants us back at Juniper Canyon tonight. Big job in the mountains tomorrow, and you're carrying an empty gun. That won't do." },
    { who: 'Wes Quill', text: "Fifteen dollars. Cartridges at the general store. Then we ride." }
  ],
  onStart() { Economy.addMoney(15); },
  stages: [
    { text: 'Buy a box of revolver cartridges at the General Store (E at the counter).',
      marker: () => { const c = Story.clerkOf('dw_general'); return c ? { x: c.x, y: c.y - 20, label: 'General Store' } : null; },
      done: d => d.events['bought:ammo:revolver'] || d.events['bought'] },
    { text: 'Mount your horse at the saloon hitching post (press F).',
      enter: d => {
        const P = G.player;
        if (!P.horse || P.horse.dead) { const h = new Horse('mustang', 61 * TS + 8, 123 * TS + 9, { owner: 'player', name: 'Biscuit', face: 0 }); h.saddle = true; G.horses.push(h); P.horse = h; }
        d.horse = P.horse; Story.squad(['wes']);
        UI.notify('Tip: WASD steers your horse, Shift gallops. Watch its stamina.', 'tip');
      },
      marker: d => d.horse && !d.horse.dead ? { x: d.horse.x, y: d.horse.y - 26, label: d.horse.name } : null,
      done: () => !!G.player.mounted },
    { text: 'Ride with Wes to Juniper Canyon Camp in the northeast.', enter: () => UI.notify('Tip: press M for the map. Scroll to zoom and click to set a waypoint.', 'tip'),
      marker: () => Story.campMarker(), done: () => nearPlayer(World.poi.hideoutFire.x, World.poi.hideoutFire.y, 170) },
    { text: d => `Toby bet Wes you can't hit four bottles. Prove him wrong (${G.targets.filter(t => t.hit).length}/4).`,
      enter: () => { const b = World.poi.bottleFence; G.targets = [0, 1, 2, 3].map(i => new Target(b.x - 40 + i * 22, b.y)); UI.notify('Tip: hold right mouse to steady your aim. 1–5 switch weapons; hold T for the weapon wheel.', 'tip'); },
      marker: () => ({ x: World.poi.bottleFence.x - 10, y: World.poi.bottleFence.y - 24, label: 'Bottles' }),
      done: () => G.targets.length && G.targets.every(t => t.hit) },
    St.talk('mara', 'Talk to Mara Quill by the fire.', [
      { who: 'Mara Quill', text: "You're late, and Wes owes Toby a dollar. Sit down." },
      { who: 'Mara Quill', text: "The Crown Consolidated payroll comes over the Frostpeak pass tomorrow. Twenty-four hundred dollars and one tired escort." },
      { who: 'Ezra Holloway', text: "Burned your hand somewhere, Mr. Calder? Looks old." },
      { who: 'Nate', text: "Stove. A long time ago." },
      { who: 'Mara Quill', text: "Rest up. Old Silas buys anything we bring home, June patches holes, and Little cooks. Come find me when you're ready to ride." }
    ])
  ],
  onComplete() { Story.set('hideout'); UI.notify('Juniper Canyon Camp is your home: a place to heal, save, and sell stolen goods to Old Silas.', 'good'); }
});

/* ------------------------------------------------------------ 1. Iron on the Pass */
MissionSys.register({
  id: 'c1m1', title: 'Iron on the Pass', giver: 'mara', giverName: 'Mara Quill', requires: ['p0'], reward: 600, noEncounters: true, uses: ['wes', 'toby', 'roz'],
  hint: 'Mara Quill has the Frostpeak payroll job ready. Find her at camp.',
  intro: [
    { who: 'Mara Quill', text: "The Widow's Switchback, up in the Frostpeak Mountains. The payroll wagon crawls on the ice there." },
    { who: 'Mara Quill', text: "Wes, Toby and Roz ride with you. Hit the escort hard, keep the wagon on the mountain, and bring me that strongbox." },
    { who: 'Roz Vega', text: "And nobody touches my dynamite but me." }
  ],
  onStart() { Story.squad(['wes', 'toby', 'roz']); Env.setWeather('cloudy'); },
  stages: [
    St.go("Ride north into the Frostpeak Mountains to the Widow's Switchback.", 'widowPass', 120, { label: "Widow's Switchback" }),
    St.scene('Take your position above the bend.', [
      { who: 'Wes Quill', text: "Hold your aim steady, Professor. Right click until the sight goes gold. You'll want the first shot to count." },
      { who: 'Wes Quill', text: "And crouch (C) behind something. Those Covenant boys can't shoot what they can't see." },
      { who: 'Toby Fenn', text: "Covenant? I thought this was a company payroll." },
      { who: 'Nate', text: "...It is. Here they come." }
    ]),
    St.clear('Ambush the payroll escort!', 'widowPass', () => [...Story.ring('widowPass', 4, 'cov', 70, 140), ...Story.ring('widowPass', 2, 'cov', 90, 150, { mounted: true })]),
    Object.assign(St.act('The wounded mules panic and the wagon slides toward the edge! Get on the brake (E)!', 'widowPass', 'Haul on the brake', 3, { mark: 'Wagon' }),
      { fail: d => d.st > 16 && !d.acted ? 'The payroll wagon went over the cliff.' : null }),
    St.act('Roz blows the strongbox. Grab what is inside (E).', 'widowPass', 'Take the strongbox contents', 2, { enter: () => Story.boom('widowPass'),
      done: () => { UI.notify('Banded notes, and a sealed oilcloth dispatch case with the Covenant iron-ring seal. You pocket the case without opening it.', 'info'); } }),
    St.go('Lead the mule string across the frozen river. Go slow.', 'iceRiver', 90, { label: 'Ice crossing' }),
    St.clear('Two Covenant riders rode around the long way!', 'iceRiver', () => Story.ring('iceRiver', 3, 'cov', 90, 160, { mounted: true })),
    campStage('Bring the money home to Juniper Canyon.')
  ],
  onComplete() {
    setTimeout(() => UI.dialogue([
      { who: 'Juniper Canyon, that night', text: 'The money is counted. The crew is warm. Alone by the creek, Nate finally opens the dispatch case.' },
      { who: 'Wanted circular', text: 'NATHANIEL CORD. DESERTER AND FUGITIVE. LAST SEEN HOLLOW CREEK, BONEWHITE SALT FLATS, 1885. BY ORDER OF THE IRON COVENANT.' },
      { who: 'Wanted circular', text: 'Below it, a routing slip: Major Abram Vane is coming to Outlaw County as Territorial Commissioner of Public Safety.' },
      { who: 'Nate', text: "...He knows the name." }
    ]), 1800);
  }
});

/* ------------------------------------------------------------ 2. The Gallows at Dustwater */
MissionSys.register({
  id: 'c1m2', title: 'The Gallows at Dustwater', giver: 'mara', giverName: 'Mara Quill', requires: ['c1m1'], reward: 150, noEncounters: true, uses: ['toby'],
  hint: 'Mara wants you in Dustwater for the Commissioner\'s hanging day. Talk to her at camp.',
  intro: [
    { who: 'Mara Quill', text: "The new Commissioner is hanging three 'rustlers' in Dustwater today. Two of them are the Ortiz brothers. They never stole a cow in their lives." },
    { who: 'Mara Quill', text: "Sam at the Rusty Spur knows where the Covenant stores what it confiscates. Get to him through the crowd, quietly. Take Toby." }
  ],
  onStart() { Story.squad(['toby']); },
  stages: [
    St.go('Ride to Dustwater. The whole town has come out for the hanging.', 'dwSaloon', 220, { label: 'Dustwater' }),
    St.sneak('Move through the crowd into the Rusty Spur without a Covenant rider getting a good look at you.', () => Story.inside('dw_saloon') || Story.at('dwSaloon'),
      () => Story.posted('dwSaloon', 5, 'cov', 130), { failMsg: 'A Covenant rider got a good look at your face.', r: 40, label: 'Rusty Spur' }),
    St.scene('Speak with Sam the barkeep.', [
      { who: 'Sam', text: "Keep your voice down. The Covenant's storing 'rustler goods' in a warehouse at Port Harlow. Something goes out on a lake barge every Thursday." },
      { who: 'Sam', text: "And those two at the end of the bar have been pawing my girl all morning. Covenant. Drunk." }
    ]),
    St.clear('Deal with the two drunk Covenant riders (fists keep it quiet).', 'dwSaloon', () => { const c = Story.inside('dw_saloon') || Story.at('dwSaloon'); return [Story.enemy('cov', c.x + 20, c.y, { weapon: 'sa' }), Story.enemy('cov', c.x - 20, c.y, { weapon: 'sa' })]; }),
    St.go("Sheriff Brannigan is 'arresting' you and Toby. Walk to his office.", 'dwSheriff', 40, { label: "Sheriff's Office" }),
    St.scene('Have coffee with Sheriff Brannigan.', [
      { who: 'Sheriff Tom Brannigan', text: "Sit. I'm not locking anybody up. I just wanted you out of the Commissioner's sight." },
      { who: 'Sheriff Tom Brannigan', text: "Eleven days, Calder. Eleven days and I hang up this badge. I'd like the boy here to still be alive when I do." },
      { who: 'Toby Fenn', text: "You've known me since I was six, Tom. I can look after myself." },
      { who: 'Sheriff Tom Brannigan', text: "That's what worries me. Out the back. Go." }
    ]),
    St.clear('Captain Kell and his riders are waiting out back!', 'dwSheriff', d => {
      const p = Story.at('dwSheriff'); d.kell = Story.npc('kell', 'Captain Ambrose Kell', p.x + 70, p.y + 30, { kind: 'rival', weapon: 'bolt', forceHostile: false });
      d.kell.bark('...Well. I\'ll be damned in a church. That hand.', true);
      return Story.ring('dwSheriff', 4, 'cov', 50, 110);
    }, { enter: () => {} }),
    St.scene('Ride out past the gallows.', [
      { who: 'Dustwater', text: 'Abram Vane stands alone beside the gallows, hat in hand, looking up at the three bodies with what looks like real sorrow. He turns as you pass.' },
      { who: 'Commissioner Abram Vane', text: "Hello, Nathaniel." },
      { who: 'Commissioner Abram Vane', text: "No. Ride on. We'll talk when you're ready. You always did need time to come home." }
    ], { before: d => { if (d.kell) d.kell.removeMe = true; } }),
    campStage()
  ],
  onComplete() { setTimeout(() => UI.dialogue([{ who: 'Mara Quill', text: "Toby says the Commissioner called you Nathaniel. You told me that case held 'old company papers.' We'll talk about that, Nate. Not tonight." }]), 1800); }
});

/* ------------------------------------------------------------ 3. Lanterns on Harlow Lake */
MissionSys.register({
  id: 'c1m3', title: 'Lanterns on Harlow Lake', giver: 'mara', giverName: 'Mara Quill', requires: ['c1m2'], reward: 200, noEncounters: true, holdsGivers: ['wes'], uses: ['wes'],
  hint: 'Mara has a plan for the Covenant warehouse in Port Harlow. Talk to her at camp.',
  intro: [
    { who: 'Mara Quill', text: "Warehouse Nine on the Port Harlow waterfront. Wes keeps the gate guards busy at cards. You go in through the fog off the water." },
    { who: 'Wes Quill', text: "I'll lose slowly. It's an art." },
    { who: 'Mara Quill', text: "Find the shipping manifests. Then take them to Augusta Pell at the Clarion. She's the only honest printer in the territory." }
  ],
  onStart() { Story.night(); Env.setWeather('cloudy'); },
  stages: [
    St.go('Ride to the Port Harlow waterfront after dark.', 'phDocks', 140, { label: 'Waterfront' }),
    St.sneak('Slip along the pilings to Warehouse Nine. Stay out of the lantern light.', 'phWarehouse', () => Story.posted('phDocks', 5, 'cov', 110), { loud: true, label: 'Warehouse 9', r: 36 }),
    St.act('Search the warehouse office for the shipping manifests.', 'phWarehouse', 'Search the office', 3),
    St.act('Pry open one of the crates.', 'phWarehouse', 'Pry open a crate', 2, { done: () => UI.dialogue([{ who: 'Nate', text: "New repeating rifles, still in the grease. And under them, a bundle of hat bands. Rattlesnake skin." }, { who: 'Nate', text: "Covenant rifles shipping out with Rattlesnake gang colors. Now why would that be?" }]) }),
    St.go('Get the manifest book to Augusta Pell at the Clarion. The alarm bell is ringing!', 'clarion', 40, { label: 'The Clarion', stage: { enter: () => Story.ring('phWarehouse', 4, 'cov', 60, 140) } }),
    St.scene('Hand the manifests to Augusta Pell.', [
      { who: 'Augusta Pell', text: "Shipping weapons under 'confiscated goods'? Oh, I can do something with this. Carefully. The Commissioner reads my paper with his coffee." },
      { who: 'Augusta Pell', text: "Now get out of my print shop before they break the door down." }
    ]),
    St.survive('Wes has been made at the card table! Meet him at the docks and hold off the Covenant launches', 'phDocks', 35, () => Story.ring('phDocks', 3, 'cov', 90, 170), { stay: 220, every: 8, enter: () => { const w = Story.ensure('wes'); w.follow = true; w.post = null; MissionSys.data.crew = [w]; } }),
    campStage()
  ],
  onComplete() { setTimeout(() => UI.dialogue([{ who: 'Harlow Lake', text: 'Dripping in the reeds, Wes is laughing. On the shore road a Covenant rider stops, raises his lantern, and looks right at Wes\'s face. He does not shoot. He just rides away.' }]), 1500); }
});

/* ------------------------------------------------------------ 4. Delaney Range */
MissionSys.register({
  id: 'c1m4', title: 'Delaney Range', giver: 'toby', giverName: 'Toby Fenn', requires: ['c1m3'], reward: 250, noEncounters: true, uses: ['toby', 'roz', 'deacon'],
  hint: 'Toby Fenn wants help for a ranch family. Find him at camp.',
  intro: [
    { who: 'Toby Fenn', text: "Ma Delaney's got till the end of the month to pay the land company, or the Covenant seizes her place as a 'rustler ranch.'" },
    { who: 'Toby Fenn', text: "She's got a herd and Kansas buyers waiting at Coulter's Siding. She just needs hands. Will you come?" },
    { who: 'Deacon Price', text: "Honest work. I may faint." }
  ],
  onStart() { Story.squad(['toby', 'roz', 'deacon']); },
  stages: [
    St.go('Ride to the Delaney ranch in Ranch Country.', 'ranchDelaney', 120, { label: 'Delaney Ranch' }),
    St.scene('Meet Ma Delaney.', [
      { who: 'Ma Delaney', text: "You're the outlaws Toby talks about. Well, you look like you can sit a horse, and that's all I care about today." },
      { who: 'Ma Delaney', text: "The cattle are scattered across the east pasture. Bring 'em to the pen." }
    ]),
    St.herd('Round up the Delaney cattle and drive them into the pen', 'roundup', 'ranchDelaney', 9, 6),
    St.go("The hands take the herd up the trail. Ride along to Coulter's Siding.", 'siding', 120, { label: "Coulter's Siding" }),
    St.scene('The sale.', [
      { who: "Coulter's Siding", text: 'The Kansas buyers count out nine thousand two hundred dollars. Ma Delaney sits down in the dirt and puts her face in her hands.' },
      { who: 'Ruth Delaney', text: "Thank you, Toby Fenn." },
      { who: 'Deacon Price', text: "Blessed are the cattle, for they have paid the mortgage." }
    ]),
    St.clear("Captain Kell's riders hit you on the road home! Protect Ma Delaney's wagon", 'siding', () => Story.ring('siding', 7, 'cov', 120, 200, i => ({ mounted: i < 4 }))),
    St.go('Get back to the Delaney ranch.', 'ranchDelaney', 120, { label: 'Delaney Ranch' }),
    St.scene('At the ranch house.', [
      { who: 'Delaney Ranch', text: 'As the Covenant pulls back, one shot comes from the tree line. Ruth Delaney falls on the porch. Toby gets to her first.' },
      { who: 'June Pettibone', text: "Through the shoulder. She'll live." },
      { who: 'Colonel Josiah Whitlock', text: "Army. Fort Granger. I heard shooting. Who fired on a civilian house?" },
      { who: 'Ma Delaney', text: "Ask the Commissioner's men, Colonel. The land's paid for. And we'll have to leave it anyway." }
    ]),
    campStage()
  ],
  onComplete() { Story.set('tobyMare'); UI.notify('Ma Delaney gave Toby a paint mare. Ranch Country is open, and the Delaneys will remember you.', 'good'); }
});

/* ------------------------------------------------------------ 5. Snakes in the Rock */
MissionSys.register({
  id: 'c1m5', title: 'Snakes in the Rock', giver: 'mara', giverName: 'Mara Quill', requires: ['c1m4'], reward: 300, noEncounters: true, uses: ['mara', 'wes', 'roz'],
  hint: 'Rattler Dunmore wants to buy guns. Mara is setting up the meeting at camp.',
  intro: [
    { who: 'Mara Quill', text: "Rattler Dunmore wants to buy two wagons of rifles, and he's paying in gold. We meet his people in the Red Canyonlands." },
    { who: 'Mara Quill', text: "He asked for you by name, Nate. Or rather, by your hand. 'The burned-hand man.' Do you want to tell me why?" },
    { who: 'Nate', text: "No." }
  ],
  onStart() { Story.squad(['mara', 'wes', 'roz']); },
  stages: [
    St.go('Drive the wagons into the Red Canyonlands.', 'canyonMouth', 140, { label: 'Red Canyonlands' }),
    St.go('Take the wagons through the Narrows.', 'narrows', 90, { label: 'The Narrows' }),
    St.clear("Rockfall! It's a trap. Rattlesnakes on the rim!", 'narrows', () => Story.ring('narrows', 7, 'rattler', 70, 160), { enter: () => Story.boom('narrows') }),
    St.survive('Cover Roz while she climbs the rockfall with her satchel', 'narrows', 30, () => Story.ring('narrows', 2, 'rattler', 110, 180), { stay: 180, every: 7 }),
    St.scene('"Fire in the hole, and I mean the whole hole."', [{ who: 'Roz Vega', text: "Fire in the hole! And I mean the whole hole!" }], { after: () => Story.boom('narrows') }),
    St.clear('The whole Rattlesnake band comes down off the rim on horseback!', 'narrows', () => Story.ring('narrows', 8, 'rattler', 120, 220, i => ({ mounted: i < 5 }))),
    St.scene('At the canyon mouth.', [
      { who: 'Red Canyonlands', text: 'A Rattlesnake rides out of the dust right on top of you, gun leveled. A shot. He falls. Wes lowers his revolver.' },
      { who: 'Wes Quill', text: "That's one for the ledger, Professor. You owe me a life." },
      { who: 'Red Canyonlands', text: 'A wounded Rattlesnake lies trapped under his dead horse.' },
      { who: 'Rattlesnake', text: "Rattler wanted the burned-hand man alive. For the Preacher. Preacher pays in gold coin and new rifles. I don't know who he is, I swear!" }
    ]),
    campStage()
  ],
  onComplete() { setTimeout(() => UI.dialogue([{ who: 'Roz Vega', text: "New rifles. Like the ones in that warehouse. You were Covenant, weren't you, Nate? Don't lie. Not to me." }, { who: 'Nate', text: "I was. I'll tell you the rest. I promise." }]), 1500); }
});

/* ------------------------------------------------------------ 6. The Assayer of Silver Crown */
MissionSys.register({
  id: 'c1m6', title: 'The Assayer of Silver Crown', giver: 'ezra', giverName: 'Ezra Holloway', requires: ['c1m5'], reward: 250, noEncounters: true, uses: ['ezra', 'toby'],
  hint: 'Ezra Holloway has questions about the Silver Crown. Find him at camp.',
  intro: [
    { who: 'Ezra Holloway', text: "Augusta Pell printed a line about the Silver Crown assays. Lyman Pike signed every one of them. He drinks himself stupid in Silver Crown." },
    { who: 'Ezra Holloway', text: "My wife used to write to a Mr. Pike, years ago. I'd like to meet him. Toby and I will come." }
  ],
  onStart() { Story.squad(['ezra', 'toby']); Env.setWeather('cloudy'); },
  stages: [
    St.go('Ride to Silver Crown and find the assayer, Lyman Pike.', 'scTown', 160, { label: 'Silver Crown' }),
    St.scene('Ask around town.', [
      { who: 'Company clerk', text: "Pike? Drinks at the Bonanza every night. But a Covenant fellow asked after him an hour ago and went up to his boarding house." },
      { who: 'Ezra Holloway', text: "Then we're late." }
    ]),
    St.sneak("Get up the back stairs into Pike's boarding house.", 'scPike', () => Story.posted('scPike', 4, 'cov', 90), { loud: true, label: "Pike's room", r: 36 }),
    St.act('Pike is on the floor, stabbed, still breathing. Kneel beside him.', 'scPike', 'Kneel beside Pike', 2, { done: () => UI.dialogue([
      { who: 'Lyman Pike', text: "...The Major's boy. I know you. You were there." },
      { who: 'Lyman Pike', text: "The King's Drift. Go look at the King's Drift. And Mrs. Holloway's copy... she kept a copy..." },
      { who: 'Silver Crown', text: 'Lyman Pike dies. Ezra Holloway has gone very quiet.' }
    ]) }),
    St.go('The killers are running for the Silver Crown Mine. Chase them!', 'scMine', 90, { label: 'Silver Crown Mine' }),
    St.clear('Fight through the timbered mine tunnels.', 'scMine', () => Story.ring('scMine', 6, 'cov', 40, 120)),
    St.act('The sealed King\'s Drift. Scrape the gleaming silver vein with your knife.', 'scMine', 'Scrape the vein', 2, { done: () => UI.dialogue([
      { who: 'Nate', text: "It comes off on the blade. It's paint. Silver paint and lacquer over plain rock." },
      { who: 'Ezra Holloway', text: "The richest mine in the territory. Painted on." }
    ]) }),
    St.clear('The killers make their stand in the glittering tunnel!', 'scMine', () => Story.ring('scMine', 4, 'cov', 50, 110)),
    St.scene('Ride the ore cage back up the shaft.', [
      { who: 'Ezra Holloway', text: "Pike knew you. 'The Major's boy.' What did he mean, Mr. Calder?" },
      { who: 'Nate', text: "Ezra. I need to tell you something about—" },
      { who: 'Silver Crown Mine', text: 'The cage reaches the surface. Daylight. Toby is shouting for the horses. The moment is gone.' }
    ]),
    campStage()
  ],
  onComplete() { Story.set('paintedVein'); UI.notify('Augusta Pell prints: "QUESTIONS AT SILVER CROWN. Assayer Found Dead."', 'info'); }
});

/* ------------------------------------------------------------ 7. The Frostpeak Express */
MissionSys.register({
  id: 'c1m7', title: 'The Frostpeak Express', giver: 'mara', giverName: 'Mara Quill', requires: ['c1m6'], reward: 400, noEncounters: true, uses: ['mara', 'wes', 'roz', 'toby', 'ezra', 'deacon'],
  hint: 'Mara has the biggest job yet. The whole crew is gathering at camp.',
  intro: [
    { who: 'Mara Quill', text: "The Covenant arrested Sheriff Brannigan for 'aiding fugitives.' They're moving him to Port Harlow on the Frostpeak Express, with the company's record office in the express car." },
    { who: 'Mara Quill', text: "We stop the train on the grade, take the records, and take Tom Brannigan home. Everybody rides." },
    { who: 'Toby Fenn', text: "Eleven days. He was eleven days from quitting." }
  ],
  onStart() { Story.squad(['mara', 'wes', 'roz', 'toby', 'ezra', 'deacon']); Env.setWeather('cloudy'); },
  stages: [
    St.go('Ride into the Frostpeak pines with the whole crew.', 'overhang', 120, { label: 'The grade' }),
    St.act('Help Roz plant the charges on the overhang above the tracks.', 'overhang', 'Plant the charges', 3, { sound: 'fuse' }),
    St.wait('The Frostpeak Express is climbing the grade...', 6, { count: true, enter: () => UI.notify('Steam on the mountain. Here she comes.', 'warn') }),
    St.clear('Roz drops the rocks. Board the crawling train and take out the guards!', 'overhang', () => Story.ring('overhang', 6, 'cov', 40, 120), { enter: d => { Story.boom('overhang'); const p = Story.at('overhang'); d.bran = Story.npc('brannigan', 'Sheriff Tom Brannigan', p.x + 30, p.y + 10); d.bran.follow = true; d.bran.post = null; } }),
    St.act('Breach the express car.', 'overhang', 'Breach the express car', 2, { done: () => UI.dialogue([
      { who: 'Express car', text: 'The strongboxes are empty. Straw. And chained to the floor, a crate of dynamite with a long fuse already burning.' },
      { who: 'Wes Quill', text: "It's a setup! There's no record office! There never was!" }
    ]) }),
    Object.assign(St.act('Cut the passenger cars loose before the fuse burns down!', 'overhang', 'Pull the coupling pin', 3, { sound: 'fuse' }), { text: d => `Cut the passenger cars loose before the fuse burns down! (${Math.max(0, Math.ceil(20 - d.st))}s)`, fail: d => d.st > 20 && !d.acted ? 'The dynamite went off.' : null }),
    St.survive("Eagle Gorge! Kell's riflemen are dug in at the far end of the trestle", 'eagleGorge', 40, () => Story.ring('eagleGorge', 3, 'cov', 100, 180), { stay: 240, every: 8,
      enter: d => { const p = Story.at('eagleGorge'); d.kell = Story.npc('kell', 'Captain Ambrose Kell', p.x + 140, p.y, { kind: 'rival', weapon: 'bolt' }); d.kell.bark('Light it.', true); } }),
    St.scene('The trestle.', [
      { who: 'Eagle Gorge', text: 'The charge goes off under the trestle. The last car tips. Brannigan is hanging from the coupling and his hand is in yours.' },
      { who: 'Sheriff Tom Brannigan', text: "Calder. Eleven days. Would you credit it." },
      { who: 'Nate', text: "Hold on." },
      { who: 'Sheriff Tom Brannigan', text: "Tell the boy..." },
      { who: 'Eagle Gorge', text: 'The coupling snaps. His hand slides out of yours.' }
    ], { before: d => { if (d.bran) d.bran.removeMe = true; if (d.kell) d.kell.removeMe = true; Story.set('dead_brannigan'); } }),
    St.clear('Covenant riders are closing in. Break out!', 'eagleGorge', () => Story.ring('eagleGorge', 6, 'cov', 120, 200, i => ({ mounted: i < 4 }))),
    campStage('Get everyone back to Juniper Canyon.')
  ],
  onComplete() {
    Story.set('ch1');
    setTimeout(() => UI.dialogue([
      { who: 'The Territorial Gazette', text: 'EAGLE GORGE MASSACRE. QUILL GANG BLOWS TRESTLE. TWENTY-THREE DEAD. Commissioner Vane names the gang\'s leader: NATHANIEL CORD, Covenant deserter, present at the Hollow Creek killings of 1885.' },
      { who: 'Juniper Canyon, that night', text: 'You wake. Ezra Holloway is standing over your bed with his revolver cocked.' },
      { who: 'Ezra Holloway', text: "Margaret Holloway. The schoolteacher. My wife. Was it you, at the door?" },
      { who: 'Nate', text: "...Yes." },
      { who: 'Chapter 1', text: 'END OF CHAPTER ONE: "A NAME BURIED."' }
    ]), 2000);
  }
});

/* Wes waits in the saloon until the prologue is done */
(function () {
  const base = MissionSys.placeGivers.bind(MissionSys);
  MissionSys.placeGivers = function () {
    base();
    if (!this.completed.includes('p0') && !(this.active && this.active.id === 'p0' && this.stage >= 1)) {
      const w = G.actors.find(a => a.giver === 'wes');
      if (w && !w.follow) { const post = { x: 61 * TS + 8, y: 114 * TS + 8, face: 0 }; w.post = post; if (dist(w.x, w.y, post.x, post.y) > 200 && !Game.onScreen(w.x, w.y, 30)) { w.x = post.x; w.y = post.y; w.path = null; } }
    }
  };
})();
