/* Outlaw County — chapter3.js
 * Chapter 3, "Across the River", and the epilogue.
 */
'use strict';

/* ------------------------------------------------------------ 15. The Fords */
MissionSys.register({
  id: 'c3m1', title: 'The Fords', giver: 'deacon', giverName: 'Deacon Price', requires: ['c2m7'], reward: 250, noEncounters: true, uses: ['deacon', 'little'],
  hint: 'Chapter 3. San Lucero took you in. Deacon has a job at the river.',
  intro: [
    { who: 'Chapter 3', text: 'ACROSS THE RIVER' },
    { who: 'San Lucero', text: 'The south bank of the Rio Bravo. Luz Arrieta\'s town took the survivors in without asking what the papers said. Ezra arrived on a raft two days later, with the ledgers wrapped in oilcloth.' },
    { who: 'Deacon Price', text: "Luz says the Covenant's been riding patrols on the north bank, closer every night. Her people have nothing to fight with." },
    { who: 'Deacon Price', text: "Mara buried a cache of rifles at Paso de las Garzas, on the north side, back when we ran guns. The river's in flood. Little and I will come." }
  ],
  onStart() { Story.chapter(3, 'Across the River'); Story.squad(['deacon', 'little']); },
  stages: [
    St.go('Cross the flooded Rio Bravo at the ford. Watch for deep water.', 'ford1', 70, { label: 'Lower ford' }),
    St.go('Find the old heron rookery at Paso de las Garzas.', 'heronGrove', 80, { label: 'Paso de las Garzas' }),
    St.act('Dig out the crates under the collapsed adobe and load the wagon.', 'heronGrove', 'Dig out the rifle crates', 4, { sound: 'dig' }),
    St.clear('A Covenant river patrol spotted the wagon!', 'heronGrove', () => Story.ring('heronGrove', 5, 'cov', 100, 180, i => ({ mounted: i < 2 }))),
    St.survive('Battle in the ford! Get the wagon back across under the flares', 'ford1', 35, () => Story.ring('northBluff', 3, 'cov', 0, 120), { stay: 220, every: 8, enter: () => Story.night() }),
    St.scene('The south bank.', [
      { who: 'Rio Bravo', text: 'Upstream the Covenant blows an old weir. The flood wave comes down out of the dark. The wagon makes the bank with seconds to spare.' },
      { who: 'Rio Bravo', text: 'On the north bluff, a Covenant rider raises a lantern on a pole and waves it slowly. Far downstream, on the south bank, in the San Lucero hills, a lantern answers.' },
      { who: 'Deacon Price', text: "Someone in San Lucero is talking to them." },
      { who: 'Little Ruiz', text: "And look what floated over in that patrol's saddlebags. Sombreros. Ponchos. Dozens of them. What does the Covenant want with Mexican clothes?" }
    ]),
    St.go('Bring the rifles to San Lucero.', 'sanLucero', 120, { label: 'San Lucero' })
  ],
  onComplete() { Story.set('armedSL'); UI.notify('San Lucero is armed, and it is your home now: rest, save and resupply here.', 'good'); }
});

/* ------------------------------------------------------------ 16. The Brother */
MissionSys.register({
  id: 'c3m2', title: 'The Brother', giver: 'deacon', giverName: 'Deacon Price', requires: ['c3m1'], reward: 250, noEncounters: true, uses: ['deacon'],
  hint: 'Luz\'s vaqueros caught the man with the lantern. It is Wes Quill.',
  intro: [
    { who: 'Deacon Price', text: "The man with the lantern. Luz's vaqueros caught him on the hill last night." },
    { who: 'Deacon Price', text: "It's Wes, Nate. He's in the sacristy, tied to a chair. He asked for you." }
  ],
  onStart() { Story.squad(['deacon']); },
  stages: [
    St.go('Go to the mission sacristy.', 'slMission', 40, { label: 'Mission' }),
    St.scene('Wes, tied to a chair.', [
      { who: 'Wes Quill', text: "They gave me Daniel back. After Dustwater. He's six, Nate. He drew me a train." },
      { who: 'Wes Quill', text: "Then Kell told me what the Commissioner is building and I couldn't sleep. So I came south to signal them false. Wrong fords, wrong nights. I'm trying to undo it." },
      { who: 'Wes Quill', text: "Kell leaves orders for his informers in a tin box under the water tower at Coulter's Siding. Look for yourself." },
      { who: 'Courtyard', text: 'Tomás wants him hanged. Deacon wants him given a chance. Ezra says nothing. Everyone looks at you.' }
    ], { choices: [{ label: 'Trust him. He rides with us.', value: 'trust' }, { label: 'Keep him under guard for now.', value: 'guard' }], onChoose: v => { Story.f().wesChoice = v; Story.clear('away_wes'); } }),
    St.go("Ride north with Deacon to the water tower at Coulter's Siding. Martial law: checkpoints everywhere.", 'waterTower', 140, { label: 'Water tower' }),
    St.sneak('Slip past the Covenant checkpoint to the foot of the water tower.', 'waterTower', () => Story.posted('waterTower', 4, 'cov', 100), { loud: true, label: 'Tin box', r: 34 }),
    St.act("Find Kell's tin box under the tower.", 'waterTower', 'Open the tin box', 2, { done: () => UI.dialogue([
      { who: 'Kell\'s orders', text: '"Raiding party to assemble at the Rio Bravo fords in Mexican dress. Strike Fort Granger on the night of the harvest moon. Leave the dead where the Army will find them."' },
      { who: 'Nate', text: "He's starting a war. Fake raiders hit the fort, the Army marches south, and the Covenant rides in behind them and takes San Lucero's silver." },
      { who: 'Deacon Price', text: "Real silver to bury the painted kind. And nobody ever audits a war." }
    ]) }),
    St.go('Gunfire at the crossroads on the way back!', 'crossroads', 130, { label: 'Crossroads' }),
    St.clear("A Covenant convoy is under attack. It's Fenn's Riders. Help them", 'crossroads', () => Story.ring('crossroads', 6, 'cov', 60, 150)),
    St.scene('Toby lines the surrendered guards up against a wagon.', [
      { who: 'Toby Fenn', text: "(in the black duster) Look who it is. Come to tell me how it's done, Nathaniel?" },
      { who: 'Nate', text: "They surrendered, Toby. Brannigan wouldn't want this." },
      { who: 'Toby Fenn', text: "Don't. Don't you say his name." },
      { who: 'Crossroads', text: 'A long moment. Toby lowers the rifle, barely. He tosses you a letter off a Covenant courier and rides off with his boys.' },
      { who: 'Letter, Vane to Kell', text: '"The Quill woman is being stubborn about the schoolteacher\'s own copy. Hold her at Silver Crown. And begin demolition of the King\'s Drift."' }
    ]),
    St.go('Ride home to San Lucero.', 'sanLucero', 120, { label: 'San Lucero' })
  ],
  onComplete() { UI.notify(Story.f().wesChoice === 'trust' ? 'Wes rides with the crew again.' : 'Wes stays under guard in the sacristy.', 'info'); }
});

/* ------------------------------------------------------------ 17. Silver Crown Collapse */
MissionSys.register({
  id: 'c3m3', title: 'Silver Crown Collapse', giver: 'ezra', giverName: 'Ezra Holloway', requires: ['c3m2'], reward: 400, noEncounters: true, uses: ['ezra', 'deacon'],
  hint: 'Mara is held in Silver Crown, and the mine is about to be destroyed. Ezra has a plan.',
  intro: [
    { who: 'Ezra Holloway', text: "Two jobs, one night. You get Mara out of the company jail. Deacon, Augusta and I go into the King's Drift and photograph that painted vein before they blow it." },
    { who: 'Ezra Holloway', text: "I worked those tunnels before Hollow Creek. I know the old ore-car runs. The miners are striking tonight. That's our cover." }
  ],
  onStart() { Story.night(); },
  stages: [
    St.go('Ride to Silver Crown. The miners are rioting in the street.', 'scTown', 160, { label: 'Silver Crown' }),
    St.clear('Help the striking miners against the Covenant riflemen', 'scTown', () => Story.ring('scTown', 6, 'cov', 60, 160)),
    St.sneak('Sneak into the company jail.', 'scJail', () => Story.posted('scJail', 4, 'cov', 90), { loud: true, label: 'Company jail', r: 36 }),
    St.act("Pick the lock on Mara's cell.", 'scJail', 'Pick the lock', 3, { done: () => UI.dialogue([
      { who: 'Mara Quill', text: "You came. Of course you came. Nate, I have to tell you the other half before you're kind to me." },
      { who: 'Mara Quill', text: "I always meant to sell those books to Vane. For the Port Harlow shipping concession. And in here, he offered it to me. And I nearly said yes." },
      { who: 'Mara Quill', text: "I told him one thing. Margaret wrote to my father once. She said she kept her own measurements, in a child's lesson book." },
      { who: 'Nate', text: "...Let's go tell Ezra." }
    ]) }),
    St.go('Meet Ezra, Deacon and Augusta at the old ore-train loading platform.', 'scMine', 90, { label: 'Silver Crown Mine', stage: { enter: () => { Story.clear('away_mara'); Story.squad(['mara', 'ezra', 'deacon']); } } }),
    St.scene('The loading platform.', [
      { who: 'Mara Quill', text: "Her own measurements, in a child's lesson book. That's what she wrote." },
      { who: 'Ezra Holloway', text: "(very still) ...A lesson book. A marbled composition book. She took it everywhere." },
      { who: 'Ezra Holloway', text: "I buried it with her. I put it in her hands. God forgive me, I buried the proof with my wife." }
    ]),
    St.act("Hold the lantern while Augusta photographs the painted vein in the King's Drift.", 'scMine', 'Hold the lantern steady', 4, { mark: "King's Drift" }),
    St.survive('The demolition charges are going off early! Get out of the collapsing mine', 'scMine', 25, d => { Story.boom(() => ({ x: Story.at('scMine').x + rand(-90, 90), y: Story.at('scMine').y + rand(-60, 60) })); return Story.ring('scMine', 2, 'cov', 60, 130); }, { every: 5 }),
    St.scene('On the ridge above the ruined mine.', [
      { who: 'Silver Crown', text: 'Through the field glass: Vane on the company office balcony, watching the mountain fall in, perfectly calm. Kell, half his face scarred from Dustwater, salutes and rides out fast, south and east.' },
      { who: 'Ezra Holloway', text: "Toward the Bonewhite. Toward her grave." }
    ]),
    St.go('Get everyone home to San Lucero.', 'sanLucero', 120, { label: 'San Lucero' })
  ],
  onComplete() { Story.set('photos'); UI.notify('The photographs of the painted vein exist. The Silver Crown Mine is gone.', 'good'); }
});

/* ------------------------------------------------------------ 18. The Colonel's Choice */
MissionSys.register({
  id: 'c3m4', title: "The Colonel's Choice", giver: 'mara', giverName: 'Mara Quill', requires: ['c3m3'], reward: 400, noEncounters: true, uses: ['mara', 'wes'],
  hint: 'The harvest moon is tonight. Mara knows where the fake raiders will strike.',
  intro: [
    { who: 'Mara Quill', text: "Harvest moon. Tonight Kell's 'raiders' hit Fort Granger. If Whitlock believes them, the Army is across the river by Sunday." },
    { who: 'Mara Quill', text: "We go in through your old hole in the north wall, and we make the Colonel see it with his own eyes." },
    { who: 'Wes Quill', text: "Agnes and Daniel are in that fort. In the Covenant's 'relocated families' barracks. I'm coming." }
  ],
  onStart() { Story.squad(['mara', 'wes']); Story.night(); },
  stages: [
    St.go('Slip into Fort Granger through the old breach in the north wall.', 'fortWall', 70, { label: 'North wall' }),
    St.sneak("Reach Colonel Whitlock's quarters. Covenant 'liaisons' are cutting the telegraph wire.", 'fortGate', () => Story.posted('fortGate', 4, 'cov', 100), { failMsg: 'The Covenant spotted you before you reached the Colonel.', label: 'Officers\' row', r: 50 }),
    St.scene("Colonel Whitlock's quarters.", [
      { who: 'Colonel Josiah Whitlock', text: "Cord. Again. You have one minute before I call the guard." },
      { who: 'Nate', text: "In ten minutes you'll be attacked by Mexican raiders. They aren't Mexican. Catch one, Colonel. Look under the poncho." }
    ]),
    St.survive('The "raiders" are pouring through the gate shouting Spanish with American accents!', 'fortGate', 35, () => Story.ring('fortGate', 4, 'raider', 60, 150), { every: 8, stay: 220 }),
    St.clear(d => `Take one raider alive: knock him down with your fists or make him surrender, in front of the Colonel (${(d.foes || []).filter(a => !a.dead).length} raiders here)`, 'fortGate',
      () => Story.ring('fortGate', 3, 'raider', 40, 100), { }),
    St.scene('On the wall, in front of the officers.', [
      { who: 'Fort Granger', text: 'You tear the poncho away. Under it: a black Covenant duster, and an iron ring on a chain.' },
      { who: 'Colonel Josiah Whitlock', text: "...Bugler. Sound to arms. Every man to the east yard. The Covenant is the enemy of this fort." }
    ]),
    St.survive("Kell has turned a crank gun on the families' barracks! Hold the east yard while Wes gets them out", 'fortGate', 30, () => Story.ring('fortGate', 3, 'cov', 90, 170), { every: 8,
      enter: d => { const p = Story.at('fortGate'); const t = Arsenal.addTurret(p.x + 60, p.y - 40, Math.PI, 'kellgun'); d.gun = Story.enemy('cov', t.x, t.y + 6, { weapon: 'crank', name: 'Covenant Gunner', turretId: t.id, hp: 160 }); d.gun.post = { x: t.x, y: t.y + 6 }; } }),
    St.scene('The Professional.', [
      { who: 'Fort Granger', text: 'The crank gun swings toward the water wagon where Agnes and Daniel are hiding. Wes shoves them behind it, draws his revolver, and walks toward the gun, firing, drawing it onto himself.' },
      { who: 'Fort Granger', text: 'He is hit once, twice, and keeps walking. The gunner falls. So does Wes.' },
      { who: 'Wes Quill', text: "Put it in the ledger, Professor. We're square." },
      { who: 'Mara Quill', text: "(holding Daniel) He was a professional. Put that on the stone." }
    ], { before: d => { Arsenal.removeTemp(); if (d.gun && !d.gun.dead) d.gun.hurt(999, G.player); }, after: () => { Story.set('dead_wes'); const w = G.actors.find(a => a.giver === 'wes'); if (w) w.removeMe = true; } }),
    St.go('Ride back to San Lucero. Whitlock is wiring Washington.', 'sanLucero', 120, { label: 'San Lucero' })
  ],
  cleanup() { Arsenal.removeTemp(); },
  onComplete() { Story.set('armyAlly'); UI.notify('The false-flag war is exposed. Colonel Whitlock and the Army have turned against the Covenant.', 'good'); }
});

/* ------------------------------------------------------------ 19. Mirror */
MissionSys.register({
  id: 'c3m5', title: 'Mirror', giver: 'ezra', giverName: 'Ezra Holloway', requires: ['c3m4'], reward: 100, noEncounters: true, uses: ['ezra'],
  hint: "Fenn's Riders have Covenant families trapped in a farmhouse. Ezra found out where.",
  intro: [
    { who: 'Ezra Holloway', text: "Fenn's Riders have a farmhouse surrounded in Ranch Country. Covenant families inside. Wives. Children. Toby's boys have kerosene." },
    { who: 'Ezra Holloway', text: "Go. Don't take a rifle. Take yourself." }
  ],
  onStart() { Story.squad(['ezra']); },
  stages: [
    St.go("Ride to the farmhouse where Fenn's Riders have the families trapped.", 'fenceHouse', 140, { label: 'Farmhouse' }),
    St.scene('The ride down.', [
      { who: 'Farmhouse', text: 'Rifles swing toward you. "That\'s far enough, Cord!" "Toby, it\'s him, what do we do?"' },
      { who: 'Toby Fenn', text: "Let him come. Let him watch." }
    ], { after: d => { d.shots0 = G.stats.shots; } }),
    Object.assign(St.act("Walk to the door and stand in it, your back to the families. Don't draw.", 'fenceHouse', 'Stand in the doorway', 8, { mark: 'The door', sound: 'step' }),
      { fail: d => (d.shots0 === undefined ? (d.shots0 = G.stats.shots, null) : G.stats.shots > d.shots0 ? 'You fired. Everything after that was blood.' : null) }),
    St.scene('The doorway.', [
      { who: 'Nate', text: "A woman stood in a door like this once, Toby, with children behind her. I shot through it. I've been running from that door for eight years." },
      { who: 'Nate', text: "If you light this house, you'll be running from it for the rest of your life. I'm not moving." },
      { who: 'Farmhouse', text: 'A long silence. Toby lowers his rifle.' },
      { who: 'Farmhouse', text: 'As the families\' wagons leave, a girl in a blue dress leans out and throws something to Toby: a wildflower. He stares at it. He picks it up.' },
      { who: 'Farmhouse', text: 'That night, Toby burns the black duster.' }
    ], { after: () => { Story.clear('away_toby', 'tobyDuster'); } }),
    St.go("Ride home to San Lucero. Fenn's Riders are coming with you.", 'sanLucero', 120, { label: 'San Lucero' })
  ],
  onComplete() { UI.notify("Toby is back, and Fenn's Riders will fight for San Lucero.", 'good'); }
});

/* ------------------------------------------------------------ 20. The Battle of San Lucero */
MissionSys.register({
  id: 'c3m6', title: 'The Battle of San Lucero', giver: 'mara', giverName: 'Mara Quill', requires: ['c3m5'], reward: 600, noEncounters: true, uses: ['mara', 'toby', 'deacon', 'ezra', 'little'],
  hint: 'Kell is coming with everything the Covenant has left. Talk to Mara.',
  intro: [
    { who: 'Mara Quill', text: "Kell has a hundred and fifty men and nothing left to lose. He's coming for San Lucero tonight. The Army is a day away." },
    { who: 'Luz Arrieta', text: "Then we hold for a day. My people built this town with their hands. They will not give it to a man in a black coat." },
    { who: 'Deacon Price', text: "I'll be at the bridge. Bridges and I have an understanding." }
  ],
  onStart() { Story.squad(['mara', 'toby', 'deacon', 'ezra', 'little']); Story.night(); },
  stages: [
    St.go('Take your position on the south bank by the bridge.', 'slBridge', 80, { label: 'Bridge' }),
    St.survive("Kell's first wave hits the ford under the flares!", 'slBridge', 40, () => Story.ring('northBluff', 4, 'cov', 0, 140, i => ({ mounted: i < 2 })), { every: 8, stay: 240 }),
    St.survive('The main assault: eighty riders charge the bridge, and a crank gun sweeps the south end', 'slBridge', 40, () => Story.ring('northBluff', 5, 'cov', 0, 120, i => ({ mounted: i < 3 })), { every: 7, stay: 240,
      enter: d => { const p = Story.at('northBluff'); const t = Arsenal.addTurret(p.x, p.y, Math.PI / 2, 'bridgegun'); d.gun = Story.enemy('cov', t.x, t.y + 6, { weapon: 'crank', name: 'Covenant Gunner', turretId: t.id, hp: 160 }); d.gun.post = { x: t.x, y: t.y + 6 }; } }),
    St.clear('Swim the ford and take the crank gun on the north bank!', 'northBluff', d => { const g = G.actors.filter(a => a.turretId === 'bridgegun' && !a.dead); return g.length ? g : Story.ring('northBluff', 2, 'cov', 20, 60); }),
    St.scene('Greater Love.', [
      { who: 'The Bridge, dawn', text: 'Forty Covenant riders form up for a last charge across the bridge. The south end is held by a handful of wounded. The townspeople are still coming down the hill.' },
      { who: 'The Bridge, dawn', text: 'Deacon Price walks out to the middle of the bridge with Roz\'s last crate of dynamite and sits down on it.' },
      { who: 'Deacon Price', text: "Greater love hath no man than this. Go on, Nate. Get to the town." },
      { who: 'The Bridge, dawn', text: 'The charge reaches the middle of the bridge.' }
    ], { before: () => Arsenal.removeTemp(), after: () => { Story.boom('slBridge'); Story.set('dead_deacon'); const a = G.actors.find(x => x.giver === 'deacon'); if (a) a.removeMe = true; } }),
    St.clear('House to house up the hill through San Lucero!', 'sanLucero', () => Story.ring('sanLucero', 8, 'cov', 40, 160)),
    St.clear('Captain Kell is in the mission bell tower. End it.', 'slMission', () => [Story.enemy('cov', Story.at('slMission').x, Story.at('slMission').y - 30, { name: 'Captain Ambrose Kell', pal: Object.assign({}, NPC_PALS.kell), weapon: 'bolt', hp: 380 }), ...Story.ring('slMission', 3, 'cov', 30, 90)]),
    St.scene('Sunrise over the plaza.', [
      { who: 'San Lucero', text: 'Kell falls from the tower as the bell tolls. Then a bugle: on the north bluff, two troops of U.S. cavalry sweep down on the last Covenant men. Colonel Whitlock rides at their head.' },
      { who: 'San Lucero', text: 'A courier comes through the smoke with a letter for Nathaniel Cord. Inside is one page torn from a marbled composition book, in a schoolteacher\'s hand.' },
      { who: 'Ezra Holloway', text: "(very quiet) That's from her book. He's opened her grave." },
      { who: 'Note in Vane\'s hand', text: '"Hollow Creek. Come home, Nathaniel. Come alone, or I will finish what the fire started."' }
    ])
  ],
  cleanup() { Arsenal.removeTemp(); },
  onComplete() { Story.set('kellDead'); }
});

/* ------------------------------------------------------------ 21. Where It Started */
MissionSys.register({
  id: 'c3m7', title: 'Where It Started', giver: 'ezra', giverName: 'Ezra Holloway', requires: ['c3m6'], reward: 0, noEncounters: true, holdsGivers: ['ezra'],
  hint: 'Vane is waiting for you at Hollow Creek. Tell Ezra you are going.',
  intro: [
    { who: 'Ezra Holloway', text: "He said come alone." },
    { who: 'Nate', text: "He did." },
    { who: 'Ezra Holloway', text: "Then go alone. I'll be wherever I'm needed." }
  ],
  stages: [
    { text: 'Ride north alone, through the Badlands and out onto the salt flats at sunset.', marker: () => { const p = Story.at('hollowCreek'); return { x: p.x, y: p.y - 24, label: 'Hollow Creek' }; },
      enter: d => { d.echo = 0; },
      done: (d, dt) => {
        const lines = ['"Hold your aim steady, Professor." — Wes', '"Eleven days. Would you credit it." — Brannigan', '"Fire in the hole, and I mean the whole hole." — Roz', '"Greater love hath no man than this." — Deacon', '"Your call, Ezra."'];
        if (d.st > 12 + d.echo * 14 && d.echo < lines.length) { UI.notify(lines[d.echo], 'info'); d.echo++; }
        const p = Story.at('hollowCreek'); return nearPlayer(p.x, p.y, 240);
      } },
    St.clear("Vane's last guard holds Hollow Creek, lanterns on every building", 'hollowCreek', () => Story.ring('hollowCreek', 10, 'cov', 40, 200), { enter: () => Story.night() }),
    St.go('Go to the schoolhouse. There is candlelight inside.', 'school', 28, { label: 'Schoolhouse' }),
    St.scene('The schoolhouse.', [
      { who: 'Hollow Creek', text: 'Vane sits at the teacher\'s desk reading a marbled composition book by candlelight, spectacles on. A chessboard is set up on a child\'s desk. Above him, the old chalk: "The Western Territories."' },
      { who: 'Abram Vane', text: "Nathaniel. Sit. I've been reading her. She was a fine teacher. Exacting." },
      { who: 'Abram Vane', text: "Here is my last offer. Come home. Be my son again. Testify that the ledgers are forgeries, and this book goes into the stove. You walk away clean. I make you somebody." },
      { who: 'Nate', text: "You already made me somebody. Look behind me." },
      { who: 'Hollow Creek', text: 'Ezra Holloway is standing in the doorway, exactly where Margaret stood.' },
      { who: 'Hollow Creek', text: 'Vane moves the book toward the candle. You knock it out of his hand. Ezra fires once.' },
      { who: 'Ezra Holloway', text: "That was for the six children. And for her." }
    ], { before: () => { const e = Story.ensure('ezra'); const s = Story.at('school'); e.x = s.x; e.y = s.y + 10; e.post = { x: s.x, y: s.y + 10 }; } }),
    St.act("Rebury Margaret Holloway, with her tintype, in the graveyard at dawn.", 'graves', 'Rebury Margaret', 5, { sound: 'dig', enter: () => { G.time = Math.floor(G.time / 1440) * 1440 + 1440 + 6 * 60; } }),
    St.scene('Dawn.', [
      { who: 'Ezra Holloway', text: "Here are my terms, Nathaniel Cord. Not forgiveness. Terms." },
      { who: 'Ezra Holloway', text: "You will stand up in Port Harlow, under oath, in your own name, and you will say what you did. You'll pay what they ask." },
      { who: 'Ezra Holloway', text: "And I'll be waiting at the gate when you come out." },
      { who: 'Nate', text: "...Yes, sir." }
    ])
  ],
  onComplete() { Story.set('vaneDead'); UI.notify('Margaret Holloway\'s composition book is safe. The epilogue waits in Port Harlow.', 'mission'); }
});

/* ------------------------------------------------------------ Epilogue */
MissionSys.register({
  id: 'e1', title: 'Testimony', giver: 'ezra', giverName: 'Ezra Holloway', requires: ['c3m7'], reward: 0, noEncounters: true, uses: ['ezra', 'mara'],
  hint: 'The statehood hearing is in Port Harlow. Ezra will ride with you.',
  intro: [{ who: 'Ezra Holloway', text: "The hearing starts at nine. Augusta has the morning edition ready. Let's not be late." }],
  onStart() { Story.squad(['ezra', 'mara']); },
  stages: [
    St.go('Ride to the territorial hearing in Port Harlow.', () => Story.door('ph_sheriff') || Story.at('phTown'), 50, { label: 'Hearing' }),
    St.scene('The hearing.', [
      { who: 'Port Harlow', text: 'Whitlock testifies. Augusta Pell testifies, and the Clarion is on every chair. The Silver Crown miners testify. Luz Arrieta. Mara Quill, against Vane and against herself. Ezra Holloway lays his wife\'s composition book on the table.' },
      { who: 'Judge', text: "Call Nathaniel Cord." },
      { who: 'Nathaniel Cord', text: "My name is Nathaniel Cord. In 1885 I was a lieutenant of the Iron Covenant. At Hollow Creek, on Major Vane's order, I shot and killed Margaret Holloway through the schoolhouse door. That is the truth, and it's mine to carry." },
      { who: 'Port Harlow', text: 'Statehood is suspended. Crown Consolidated collapses. The Covenant is dissolved. San Lucero\'s silver is confirmed to its owners.' },
      { who: 'Judge', text: "Twelve years. Fort Granger territorial prison." }
    ])
  ]
});

MissionSys.register({
  id: 'e2', title: 'Six Years', giver: 'ezra', giverName: 'Ezra Holloway', requires: ['e1'], reward: 0, noEncounters: true, uses: ['ezra'],
  hint: 'Six years later. Someone is waiting at the prison gate.',
  intro: [{ who: 'Fort Granger, 1899', text: 'Six years later, the gate of the territorial prison opens. By the road there is a folding table, a chessboard, two horses, and an old man.' }, { who: 'Ezra Holloway', text: "You're late. Sit. White moves first." }],
  onStart() {
    const P = G.player, g = Story.at('fgPrisonGate');
    if (P.mounted) P.dismount && P.dismount();
    P.x = g.x; P.y = g.y + 40; Game.snapCamera(); G.time = Math.floor(G.time / 1440) * 1440 + 1440 + 9 * 60;
    Law.bounty = 0; Law.heat = 0; Story.squad(['ezra']);
  },
  stages: [
    St.go("Ride with Ezra to Dustwater. They've rebuilt it.", 'dwSaloon', 160, { label: 'Dustwater' }),
    St.go("Walk to Roz Vega's grave behind the new saloon, The Heron.", 'dwGraves', 60, { label: 'Roz\'s grave' }),
    St.act("Leave the fuse cap you've carried for six years on her stone.", 'dwGraves', 'Leave the fuse cap', 3),
    St.scene('"FIRE IN THE HOLE."', [
      { who: 'Nate', text: "You never told me how the one about the heron and the preacher ended, Roz. I've had six years to guess. None of them were funny." },
      { who: 'Ezra Holloway', text: "Come on. It's a long way south, and you still owe me a game." },
      { who: 'Outlaw County', text: 'THE END. "What the Ground Remembers."' }
    ])
  ],
  onComplete() { Story.set('finished'); UI.banner('What the Ground Remembers', 'THE END'); setTimeout(() => UI.notify('Thank you for playing. The territory is yours: stranger jobs, bounties, hunting and treasure are still out there.', 'mission'), 3000); }
});
