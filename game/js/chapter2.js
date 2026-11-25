/* Outlaw County — chapter2.js
 * Chapter 2, "The Iron Covenant".
 */
'use strict';

/* ------------------------------------------------------------ 8. Last Water */
MissionSys.register({
  id: 'c2m1', title: 'Last Water', giver: 'mara', giverName: 'Mara Quill', requires: ['c1m7'], reward: 150, noEncounters: true, uses: ['mara', 'roz', 'toby', 'ezra', 'deacon', 'wes'],
  hint: 'Chapter 2. The crew is reeling. Talk to Mara at camp.',
  intro: [
    { who: 'Chapter 2', text: 'THE IRON COVENANT' },
    { who: 'Juniper Canyon', text: 'Ezra did not fire. He lowered the gun, and walked out into the dark, and came back at dawn without a word.' },
    { who: 'Mara Quill', text: "We're the most wanted people in the territory, Nate. Twenty-three dead, and every paper says we did it. We need to move the camp, tonight." },
    { who: 'Toby Fenn', text: "Riders! Torches on the ridge! They found us!" }
  ],
  onStart() { Story.chapter(2, 'The Iron Covenant'); Story.squad(['mara', 'roz', 'toby', 'ezra', 'deacon', 'wes']); Story.night(); },
  stages: [
    St.survive('The Covenant is burning Juniper Canyon! Hold them off while the crew saddles the horses', 'juniper', 45, () => Story.ring('juniper', 3, 'cov', 130, 220, i => ({ mounted: i === 0 })), { stay: 260, every: 9, enter: () => Story.fireRing('juniper', 8, 90) }),
    St.go('Run for the Mesa Badlands, south and east.', 'bishop', 180, { label: 'The Badlands', stage: { enter: () => UI.notify('The wagons are rolling. Ride hard.', 'warn') } }),
    St.clear("A sandstorm, and out of it, Kell's main column at the Bishop's Rock!", 'bishop', () => Story.ring('bishop', 9, 'cov', 60, 160, i => ({ mounted: i < 5 })), { enter: () => Env.setWeather('dust') }),
    St.scene('The column regroups for another charge.', [
      { who: "The Bishop's Rock", text: 'Deacon and Ezra turn their horses back toward the Covenant line, together.' },
      { who: 'Deacon Price', text: "Somebody's got to slow them. Drive, Nate." },
      { who: 'Mara Quill', text: "(grabbing your reins) You go back, they've got three. Keep driving, Nate. Drive." },
      { who: 'Mesa Badlands', text: 'Behind you, in the dust, two men are dragged from their horses and taken alive.' }
    ], { before: () => { Story.set('away_ezra', 'away_deacon'); Story.dismiss(['ezra', 'deacon']); for (const id of ['ezra', 'deacon']) { const a = G.actors.find(x => x.giver === id); if (a) a.removeMe = true; } } }),
    St.go('Drive on through the storm to the old stage station at Last Water.', 'lastWater', 120, { label: 'Last Water' })
  ],
  onComplete() {
    Story.f().camp = 'lastwater'; Story.set('tobyDuster'); Env.setWeather('clear');
    setTimeout(() => UI.dialogue([
      { who: 'Last Water', text: 'Last Water is your camp now. Juniper Canyon is ash.' },
      { who: 'Mara Quill', text: "I recruited you because of Hollow Creek, Nate. I knew who you were before you ever robbed a payroll for me. I'm sorry. That's half of it. You'll get the other half when we're alive enough to argue." },
      { who: 'Toby Fenn', text: "(wearing a black Covenant duster off a dead man) Next time I get one of them, I'm making it slow." }
    ]), 1800);
  }
});

/* ------------------------------------------------------------ 9. The Stockade */
MissionSys.register({
  id: 'c2m2', title: 'The Stockade', giver: 'mara', giverName: 'Mara Quill', requires: ['c2m1'], reward: 200, noEncounters: true, uses: ['roz', 'toby'],
  hint: 'Ezra and Deacon are alive in the Fort Granger stockade. Mara has a plan.',
  intro: [
    { who: 'Mara Quill', text: "Ezra and Deacon are in the Fort Granger stockade, in the Covenant's east yard. They hang them Sunday." },
    { who: 'Roz Vega', text: "I'll blow the north wall at midnight. Loud. You get the key, open the cells, and run everybody to the hole." },
    { who: 'Mara Quill', text: "Go in by day with the cattle the sutler bought. Learn the fort. Then wait for dark." }
  ],
  onStart() { Story.squad(['roz', 'toby']); },
  stages: [
    St.go('Drive the sutler\'s cattle through the gate of Fort Granger and look the place over.', 'fortGate', 90, { label: 'Fort Granger' }),
    St.wait('Wait in the shadows for midnight.', 5, { count: true, enter: () => { Story.night(); UI.notify('Night falls over the fort.', 'info'); } }),
    St.sneak("Steal the key and reach the stockade door unseen. Sentries and dogs everywhere.", 'stockade', () => Story.posted('stockade', 5, 'cov', 110), { failMsg: 'A sentry raised the alarm.', label: 'Stockade', r: 40 }),
    St.act('Unlock the cells.', 'stockade', 'Unlock the cells', 3, { done: () => UI.dialogue([
      { who: 'The Stockade', text: 'A dozen prisoners: ranchers branded rustlers, a Silver Crown miner, and in the last cell, Ezra and Deacon, beaten.' },
      { who: 'Ezra Holloway', text: "(a long look) ...You came back for me." },
      { who: 'Nate', text: "I came back for both of you." },
      { who: 'Deacon Price', text: "Then let's be leaving before the Lord changes His mind." }
    ]) }),
    St.clear('Taps! Roz\'s charge goes off and the fort wakes. Fight to the hole in the north wall', 'stockade', d => { Story.clear('away_ezra', 'away_deacon'); Story.squad(['ezra', 'deacon']); Story.boom('fortWall'); return Story.ring('stockade', 7, 'cov', 70, 160); }),
    St.go('Get the prisoners out through the north wall.', 'fortWall', 70, { label: 'North wall' }),
    St.scene('A man in the gap of the wall.', [
      { who: 'Fort Granger', text: 'Colonel Whitlock steps out of the dark, revolver on your chest. Yours is on his.' },
      { who: 'Colonel Josiah Whitlock', text: "You're Cord." },
      { who: 'Nate', text: "Yes, sir." },
      { who: 'Colonel Josiah Whitlock', text: "Eagle Gorge. Twenty-three dead." },
      { who: 'Nate', text: "We cut the passenger cars loose. We saved them. Kell blew the trestle." },
      { who: 'Colonel Josiah Whitlock', text: "...Go on. I didn't see you. God help me, I haven't seen anything in this fort for a month." }
    ]),
    campStage('Get everyone home to Last Water.')
  ],
  onComplete() { UI.notify('Ezra and Deacon are free. A note from "K." in the duty officer\'s desk mentions a "grass country operation."', 'info'); }
});

/* ------------------------------------------------------------ 10. Burning Grass */
MissionSys.register({
  id: 'c2m3', title: 'Burning Grass', giver: 'roz', giverName: 'Roz Vega', requires: ['c2m2'], reward: 300, noEncounters: true, uses: ['roz', 'toby', 'deacon', 'mara'],
  hint: 'Smoke over Ranch Country. Roz is rallying the crew at camp.',
  intro: [
    { who: 'Roz Vega', text: "Smoke over the Hendry range. Ma Delaney rode in an hour ago with thirty ranchers. They're going whether we come or not." },
    { who: 'Roz Vega', text: "That note from 'K.' said 'grass country operation.' This is it." }
  ],
  onStart() { Story.squad(['roz', 'toby', 'deacon', 'mara']); },
  stages: [
    St.go('Ride with the ranchers to the Hendry ranch.', 'ranchHendry', 140, { label: 'Hendry Ranch' }),
    St.clear('Rattlesnake raiders are torching the Hendry ranch!', 'ranchHendry', () => Story.ring('ranchHendry', 7, 'rattler', 60, 150, i => ({ mounted: i < 3 })), { enter: () => Story.fireRing('ranchHendry', 6, 60) }),
    St.act('A family is trapped in the burning house. Get them out!', 'ranchHendry', 'Break down the door', 3, { sound: 'punch' }),
    St.act('The prairie is on fire and the wind is pushing it at Cottonwood Crossing. Light Roz\'s backfire along the firebreak.', 'cottonwood', 'Light the backfire', 3, { sound: 'fuse', done: () => Story.fireRing('cottonwood', 10, 120) }),
    St.clear('The Covenant appears on the ridge with seizure orders. The Battle of Cottonwood Ridge!', 'ridge', () => Story.ring('ridge', 10, 'cov', 60, 180, i => ({ mounted: i < 5 }))),
    St.clear('Their second charge is coming down the ridge!', 'ridge', () => Story.ring('ridge', 7, 'cov', 100, 200, i => ({ mounted: i < 4 }))),
    St.scene('After the battle, in a burned-out gully.', [
      { who: 'Cottonwood Ridge', text: 'Toby has a wounded Rattlesnake on his knees, hands up, rifle at his head.' },
      { who: 'Toby Fenn', text: "Who told you to burn the Hendry place?" },
      { who: 'Raider', text: "Rattler! Rattler did! He gets paid, I don't know by who, I swear! Same day the Covenant comes with papers, every time!" },
      { who: 'Toby Fenn', text: "Thank you." },
      { who: 'Cottonwood Ridge', text: 'Toby shoots him anyway.' },
      { who: 'Deacon Price', text: "(quietly) There's still a little time to reach that boy, Nate. A little." }
    ]),
    campStage('Ride back to Last Water.')
  ],
  onComplete() { Story.set('militia'); UI.notify("The ranchers are your allies now: the Ranchers' Militia. Cottonwood Crossing is friendly ground.", 'good'); }
});

/* ------------------------------------------------------------ 11. Rattlesnake Fortress */
MissionSys.register({
  id: 'c2m4', title: 'Rattlesnake Fortress', giver: 'mara', giverName: 'Mara Quill', requires: ['c2m3'], reward: 500, noEncounters: true, uses: ['wes', 'roz', 'toby', 'deacon'],
  hint: 'The militia is ready to hit Rattlesnake Fortress. Talk to Mara.',
  intro: [
    { who: 'Mara Quill', text: "Rattler Dunmore knows who's paying him. We take his fortress and we ask him." },
    { who: 'Mara Quill', text: "The militia hits the gate at midnight, loud. You, Wes, Roz, Toby and Deacon come down off the rim into the courtyards." },
    { who: 'Wes Quill', text: "(too quiet) Sounds like a fine plan, sister." }
  ],
  onStart() { Story.squad(['wes', 'roz', 'toby', 'deacon']); Story.night(); },
  stages: [
    St.go('Climb to the rim above Rattlesnake Fortress.', 'fortressRim', 110, { label: 'The rim' }),
    St.wait('Wait for the militia to hit the gate.', 5, { count: true }),
    St.clear('Drop into the fortress!', 'fortress', () => Story.ring('fortress', 9, 'rattler', 40, 150)),
    St.act('Blow the gatehouse from the inside so the militia can storm in.', 'fortress', 'Set the charge on the gatehouse', 3, { sound: 'fuse', done: () => Story.boom('fortress') }),
    St.clear("Rattler's last stand in the old mission chapel", 'fortress', () => Story.ring('fortress', 6, 'rattler', 30, 110, i => i === 0 ? { name: 'Rattler Dunmore', pal: Object.assign({}, NPC_PALS.rattler), hp: 320, weapon: 'brasslever' } : {})),
    St.scene('The bell tower.', [
      { who: 'Rattlesnake Fortress', text: 'A stray shot breaks the rotten yoke and the bell crashes down through the tower. Rattler is on his knees on the crumbling platform, laughing through bloody teeth.' },
      { who: 'Nate', text: "The Preacher. Who is he?" },
      { who: 'Rattler Dunmore', text: "You know him better than me, Cord. He talks about you like a son. The Preacher is—" },
      { who: 'Rattlesnake Fortress', text: 'A shot. Rattler pitches backward off the platform. Wes Quill lowers his revolver.' },
      { who: 'Wes Quill', text: "He was going for a gun." },
      { who: 'Roz Vega', text: "(staring at Wes) He wasn't." }
    ]),
    campStage('Ride home to Last Water with Kell\'s letters and the Rattlesnakes\' gold.')
  ],
  onComplete() { Story.set('fortressTaken'); UI.notify('Rattlesnake Fortress has fallen. You found Kell\'s letters, Crown Consolidated gold coin and land-company papers.', 'good'); Economy.addItem('gold_bar', 1); }
});

/* ------------------------------------------------------------ 12. The Harlow Clarion */
MissionSys.register({
  id: 'c2m5', title: 'The Harlow Clarion', giver: 'mara', giverName: 'Mara Quill', requires: ['c2m4'], reward: 250, noEncounters: true, uses: ['mara', 'roz', 'deacon'], holdsGivers: ['wes'],
  hint: 'Time to print the truth. Mara is waiting at camp.',
  intro: [
    { who: 'Mara Quill', text: "Kell's letters, the gold, the seizure orders. Augusta Pell can print all of it. We carry it into Port Harlow after dark." },
    { who: 'Mara Quill', text: "Wes will have a boat ready at the waterfront in case it goes wrong." }
  ],
  onStart() { Story.squad(['mara', 'roz', 'deacon']); Story.night(); },
  stages: [
    St.go('Bring the evidence through the back alleys to the Clarion in Port Harlow.', 'clarion', 50, { label: 'The Clarion' }),
    St.scene('Inside the Clarion.', [
      { who: 'Augusta Pell', text: "This is it. This is the edition they'll read in Washington. Set the type, Deacon, your hands are steadier than mine." },
      { who: 'Deacon Price', text: "(at the window) Lanterns. Both ends of the street." },
      { who: 'Captain Kell', text: "(through a speaking trumpet) Augusta Pell! By order of the Commissioner, this press is seized for sedition!" }
    ]),
    St.survive("Kell's riders have the Clarion surrounded. Hold the building", 'clarion', 40, () => Story.ring('clarion', 4, 'cov', 90, 170), { stay: 160, every: 8 }),
    St.go('The Clarion is burning. Fight across the rooftops to the docks, where Wes has the boat.', 'phDocks', 90, { label: 'Docks', stage: { enter: () => { Story.fireRing('clarion', 6, 30); Story.ring('phDocks', 4, 'cov', 100, 200); } } }),
    St.clear('The Battle of the Harlow Docks: clear the guns off the pier', 'phDocks', () => Story.ring('phDocks', 8, 'cov', 40, 150)),
    St.scene('In the marsh, out of range.', [
      { who: 'Harlow Lake', text: 'Augusta opens her bundle of saved sheets. Half of it is blank paper. The gold, the seizure orders and most of the edition are gone.' },
      { who: 'Harlow Lake', text: 'Later, Wes counts the people in the boat twice, as if he expected one fewer. In his coat pocket you see the corner of a note: a child\'s drawing of a train, and a line in Kell\'s hand.' },
      { who: 'Wes Quill', text: "They have my boy, Nate. Daniel. Since the spring. I tell them things. Small things. I swear to God, small things." },
      { who: 'Nate', text: "...We'll get him back. Together. Don't tell them anything else." }
    ], { choices: [{ label: 'Protect Wes. Keep his secret.', value: 'protect' }, { label: 'Protect Wes, but tell Mara.', value: 'tell' }], onChoose: v => { Story.f().wesSecret = v; } }),
    campStage('Get back to Last Water.')
  ],
  onComplete() { Story.set('knowsWes'); UI.notify('You told Wes about the Hollow Creek books on the ride home. He needed something to believe in.', 'info'); }
});

/* ------------------------------------------------------------ 13. Hollow Creek */
MissionSys.register({
  id: 'c2m6', title: 'Hollow Creek', giver: 'ezra', giverName: 'Ezra Holloway', requires: ['c2m5'], reward: 200, noEncounters: true, uses: ['ezra', 'roz'],
  hint: 'Ezra Holloway is ready to go to Hollow Creek. So are you.',
  intro: [
    { who: 'Ezra Holloway', text: "Pike said Margaret kept a copy. You said you hid books. Under a floor." },
    { who: 'Nate', text: "Under the schoolhouse floor. The night I... that night." },
    { who: 'Ezra Holloway', text: "Then we go to Hollow Creek. You, me, and Roz. And on the way you tell us all of it." }
  ],
  onStart() { Story.squad(['ezra', 'roz']); },
  stages: [
    St.go('Ride out onto the Bonewhite Salt Flats to the ghost town of Hollow Creek.', 'hollowCreek', 160, { label: 'Hollow Creek' }),
    St.go('Walk to the schoolhouse.', 'school', 30, { label: 'Schoolhouse' }),
    St.scene('The schoolhouse. 1885.', [
      { who: 'Hollow Creek, 1885', text: 'Desks. The stove. On the chalkboard: "The Western Territories. Lesson 9." Smoke under the door to the back room.' },
      { who: 'Hollow Creek, 1885', text: 'A shape in the doorway with a shotgun, and behind it, small voices. Lieutenant Cord fires.' },
      { who: 'Hollow Creek, 1893', text: 'The present comes back. The same doorway. Ezra is standing in it.' },
      { who: 'Nate', text: "She was guarding the children. I didn't see her face. I got them out the window after. Six of them. I hid the books under the floor before the fire reached it, and I ran." }
    ]),
    St.act('Pry up the floorboards in the back room.', 'school', 'Pry up the floorboards', 4),
    St.scene('Under eight years of salt.', [
      { who: 'Hollow Creek', text: 'A rusted tin cash box. Three company ledgers, with Margaret Holloway\'s neat schoolteacher script in the margins. And folded inside, an order in Vane\'s own hand.' },
      { who: 'Ezra Holloway', text: "(reading) 'No one is to leave who has seen them.' A.J.V." },
      { who: 'Nate', text: "(holding out his revolver, grip first) Your call, Ezra." },
      { who: 'Hollow Creek', text: 'A long time. Ezra takes the gun. Then he lowers it.' },
      { who: 'Ezra Holloway', text: "No. You don't get off that easy. You're going to help me hang him with this." }
    ]),
    St.survive('Sunset. Kell and forty riders encircle the ghost town. Hold the ruins', 'hollowCreek', 50, () => Story.ring('hollowCreek', 4, 'cov', 140, 230, i => ({ mounted: i < 2 })), { stay: 260, every: 9 }),
    campStage('Get the books home to Last Water.')
  ],
  onComplete() { Story.set('books'); setTimeout(() => UI.dialogue([{ who: 'Roz Vega', text: "Kell knew exactly where to look, Nate. Somebody told him." }, { who: 'Ezra Holloway', text: "We all know who." }]), 1500); }
});

/* ------------------------------------------------------------ 14. The Night Dustwater Burned */
MissionSys.register({
  id: 'c2m7', title: 'The Night Dustwater Burned', giver: 'mara', giverName: 'Mara Quill', requires: ['c2m6'], reward: 300, noEncounters: true, uses: ['mara', 'wes', 'roz', 'toby', 'deacon'], away: ['ezra'],
  hint: 'One last job before Chapter 2 ends. Mara is waiting.',
  intro: [
    { who: 'Mara Quill', text: "Wes says the Commissioner keeps his real correspondence in the Dustwater courthouse safe. Payments to 'R.D.', orders in Kell's hand." },
    { who: 'Wes Quill', text: "It's real, Nate. I swear it's real." },
    { who: 'Mara Quill', text: "Ezra stays here with the books. Everyone else rides." }
  ],
  onStart() { Story.squad(['mara', 'wes', 'roz', 'toby', 'deacon']); Story.night(); },
  stages: [
    St.go('Ride into Dustwater after midnight. The streets are too empty.', 'dwBank', 120, { label: 'Courthouse' }),
    St.act('Roz blows the courthouse safe. Cover her.', 'dwBank', 'Hold the lantern for Roz', 4, { sound: 'fuse', done: () => Story.boom('dwBank') }),
    St.scene('A voice from the doorway.', [
      { who: 'Dustwater', text: 'Inside the safe: Vane\'s ledgers, the real ones. Everything you need, for one second.' },
      { who: 'Commissioner Abram Vane', text: "(turning a white chess knight in his fingers) Good evening, Nathaniel. Mr. Quill, thank you. You may go to your son." },
      { who: 'Commissioner Abram Vane', text: "This town will burn tonight, and the papers will say who lit it. Goodbye." }
    ], { after: () => { Story.set('away_wes'); const w = G.actors.find(a => a.giver === 'wes'); if (w) { w.follow = false; w.removeMe = true; } } }),
    St.clear('Dustwater is on fire! Fight your way out of the courthouse', 'dwBank', () => Story.ring('dwBank', 8, 'cov', 60, 170), { enter: () => { Story.fireRing('dwBank', 10, 120); Story.fireRing('dwSaloon', 8, 90); } }),
    St.go('Regroup at the Rusty Spur, the last building not fully burning.', 'dwSaloon', 60, { label: 'Rusty Spur' }),
    St.survive('Thirty riders are coming down the burning street. Hold the Rusty Spur while the townspeople get out the back', 'dwSaloon', 45, () => Story.ring('dwSaloon', 4, 'cov', 110, 200, i => ({ mounted: i === 0 })), { stay: 170, every: 8 }),
    St.scene('Fire in the hole.', [
      { who: 'The Rusty Spur', text: 'Roz sits on the bar, bleeding from two wounds, her shotgun empty, a crate of dynamite open beside her.' },
      { who: 'Roz Vega', text: "Get them out, Nate. Get Toby out. I'll hold the door. I'm good at doors." },
      { who: 'Nate', text: "Roz—" },
      { who: 'Roz Vega', text: "Did I ever tell you the one about the heron and the preacher? ...Next time. Go." },
      { who: 'The Rusty Spur', text: 'You are a block away when the Spur goes up. It takes the front of the street with it, and most of the riders.' }
    ], { after: () => { Story.boom('dwSaloon'); Story.set('dead_roz', 'away_mara'); Story.dismiss(['roz', 'mara']); for (const id of ['roz', 'mara']) { const a = G.actors.find(x => x.giver === id); if (a) a.removeMe = true; } } }),
    St.go('Ride south for the Rio Bravo. Do not look back.', 'sanLucero', 160, { label: 'San Lucero' })
  ],
  onComplete() {
    Story.f().camp = 'sanlucero'; Story.set('ch2', 'martialLaw', 'away_toby');
    setTimeout(() => UI.dialogue([
      { who: 'The Territorial Gazette', text: 'DUSTWATER BURNED BY CORD GANG. Commissioner Vane declares martial law across three regions. The outlaw Mara Quill taken alive.' },
      { who: 'The Territorial Gazette', text: 'In the square, before the smoking town, the Commissioner burns a handwritten order. Nobody in the crowd knows what it was.' },
      { who: 'Deacon Price', text: "Toby's gone north. Took a dead man's duster and six boys who lost their homes. Wes is gone. Mara's taken. Roz..." },
      { who: 'Chapter 2', text: 'END OF CHAPTER TWO: "THE IRON COVENANT."' }
    ]), 2000);
  }
});
