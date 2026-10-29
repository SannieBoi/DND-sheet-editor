// Every subclass in the data, the Artificer and the Blood Hunter: picking a subclass in Level up (cards, lists such as
// Battle Master maneuvers, a skill with Expertise, a Wizard savant spell), third casters (Eldritch Knight slots and
// spells), the Profane Soul's Pact Magic, spells that follow an option (Vestige Spells), the Blood Hunter's Fighting Style
// and Crimson Rite (level up and the roller), reading "Blood Hunter 3 (Ghostslayer)", subclass resources and riders.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).type === 'checkbox' ? inp(n).checked : inp(n).value;
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const errors = [];
addEventListener('error', e => errors.push(e.message));

// ---- the level-up window
const W = () => document.getElementById('lvlup');
const btnIn = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const body = () => W().querySelector('.lu-body');
async function openLevelUp() {
  document.getElementById('levelUp').click(); await wait(20);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(20);
}
const step = name => [...W().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const stepNames = () => [...W().querySelectorAll('.lu-steps button')].map(b => b.textContent.replace(/^\d+/, ''));
// a card (subclass, option, feat) by its exact name; a list or skill button by the start of its text
const card = name => [...body().querySelectorAll('.lu-card')].find(b => b.querySelector('b').firstChild.textContent === name);
const opt = name => [...body().querySelectorAll('.lu-opt')].find(b => b.querySelector('b').textContent === name);
const pickSpell = (pickId, name) => {
  const root = W().querySelector(`[data-pick="${pickId}"]`), b = root && [...root.querySelectorAll('.lu-spell')].find(x => x.querySelector('b').textContent === name);
  if (b) b.click(); else log(`FAIL no spell button ${name} in ${pickId}`);
};
const apply = async () => { step('Review'); W().querySelector('.lu-apply').click(); await wait(20); btnIn(W().querySelector('.lu-foot'), 'Close').click(); await wait(20); };
const cancel = async () => { W().querySelector('.lu-x').click(); await wait(20); const a = document.querySelector('.ask'); if (a) btnIn(a, 'Throw away').click(); await wait(20); };

// ---- the roller
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const rpick = () => document.getElementById('rollPick');
const rbtn = text => [...rpick().querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const attackWith = name => { tab('attack'); rpick().querySelector('.back')?.click();
  [...rpick().querySelectorAll('.item')].find(x => x.querySelector('.iname').textContent === name).click(); };
const lastRoll = () => document.querySelector('#rollLog .roll');

async function loadSheet(build) {
  const doc = await PDFLib.PDFDocument.create(), form = doc.getForm(), page = doc.addPage([612, 792]);
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  const box = (name, x, y, on) => { const f = form.createCheckBox(name); f.addToPage(page, { x, y: y + 3, width: 10, height: 10 }); if (on) f.check(); };
  build(add, box);
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 't.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  if (!loaded) throw new Error('sheet did not load');
  await wait(20);
}
// scores, skills with checkboxes, HP, a weapon line, features, and optionally spell blocks (cantrips, level 1, level 2)
function basics(add, box, o) {
  add('CharacterName', 20, 750, 150, 'Vex'); add('ClassLevel', 200, 750, 160, o.cls); add('Race ', 380, 750, 100, 'Human');
  const sc = o.scores || {};
  [['STR', 16], ['DEX', 14], ['CON', 14], ['INT', 14], ['WIS', 12], ['CHA', 10]].forEach(([ab, def], i) => {
    const s = sc[ab] ?? def;
    add(ab, 20, 700 - i * 30, 30, String(s)); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 60, 700 - i * 30, 30, (s >= 10 ? '+' : '') + Math.floor((s - 10) / 2));
  });
  add('ProfBonus', 20, 500, 30, '+2'); add('HPMax', 60, 500, 30, o.hp ?? '20'); add('HPCurrent', 100, 500, 30, o.hp ?? '20'); add('Speed', 140, 500, 30, '30');
  (o.skills || []).forEach(([n, on, v], i) => { box('Check Box ' + (20 + i), 80, 460 - i * 20, on); add(n, 95, 460 - i * 20, 30, v); });
  add('Wpn Name', 20, 300, 100, 'Longsword'); add('Wpn1 AtkBonus', 125, 300, 30, '+5'); add('Wpn1 Damage', 160, 300, 90, '1d8+3 slashing');
  add('Features and Traits', 20, 40, 250, o.features || '', true, 220);
  if (o.spells) {
    let y = 740, n = 1014;
    [3, 4, 3].forEach((lines, lvl) => {
      if (lvl) { add('SlotsTotal ' + (18 + lvl), 310, y, 30); y -= 22; }
      for (let i = 0; i < lines; i++) { add('Spells ' + n++, 300, y, 150); y -= 20; }
      y -= 8;
    });
  }
}
const spellLines = () => [...document.querySelectorAll('[data-field^="Spells "]')].map(e => e.value).filter(Boolean);

(async () => { try {
  document.body.prepend(pre);
  const C = window.character;
  ok(Object.values(DND.classes).every(c => c.subclasses?.length >= 4) && DND.classes.fighter.subclasses.length === 7 && DND.classes.wizard.subclasses.length === 9,
    'every class has its subclasses: ' + Object.entries(DND.classes).map(([k, c]) => `${k} ${c.subclasses.length}`).join(', '));

  // ---- 1. Fighter 2 -> 3: the subclass cards, Battle Master with three maneuvers and Student of War
  await loadSheet((add, box) => basics(add, box, { cls: 'Fighter 2', skills: [['Athletics', false, '+3'], ['History', false, '+2']] }));
  await openLevelUp(); step('Features');
  const names = [...body().querySelectorAll('.lu-card b')].map(b => b.firstChild.textContent);
  ok(['Champion', 'Battle Master', 'Eldritch Knight', 'Psi Warrior', 'Banneret', 'Arcane Archer', 'Sorrow Knight', 'Another subclass'].every(n => names.includes(n)),
    'every Fighter subclass is a card, plus "Another subclass": ' + names.join(', '));
  ok([...body().querySelectorAll('.lu-find select option')].some(o => o.textContent === 'Arcana Unleashed'), 'a book filter lists the books');
  card('Battle Master').click(); await wait(10);
  ok(/Combat Superiority/.test(body().textContent) && /Maneuvers0 \/ 3/.test(body().textContent), 'Battle Master: Combat Superiority asks for 3 maneuvers');
  opt('Trip Attack').click(); opt('Riposte').click(); opt('Parry').click(); opt('Ambush').click();
  ok(!opt('Ambush').classList.contains('on'), 'no fourth maneuver');
  opt('Athletics') ? ok(opt('Athletics').disabled === false, 'Student of War offers Fighter skills') : log('FAIL no Athletics button');
  opt('History').click();
  await apply();
  ok(val('ClassLevel') === 'Fighter 3 (Battle Master)' && C.classes[0].sub?.name === 'Battle Master', 'the subclass goes in the Class box and reads back: ' + val('ClassLevel'));
  ok(/Combat Superiority \(Battle Master\): Learn 3 maneuvers/.test(val('Features and Traits')) && /\nTrip Attack: On a hit/.test(val('Features and Traits'))
    && /\nParry: Reaction/.test(val('Features and Traits')), 'the feature line, then each maneuver with what it does');
  ok(/Student of War \(Battle Master\): History\. Proficiency with one Artisan's Tools/.test(val('Features and Traits')) && inp('Check Box 21').checked,
    'Student of War: the skill ticked, its text written');
  const sup = window.resources.list().find(r => r.name === 'Superiority Dice');
  ok(sup && sup.max === 4 && sup.note === 'd8' && sup.back === 'short', 'Rest tab: 4 Superiority Dice, d8, back on a Short Rest');
  ok(!C.beyond.length, 'nothing written is beyond the rules');
  // Fighter 6 -> 7: two more maneuvers, the ones on the sheet greyed out
  type('ClassLevel', 'Fighter 6 (Battle Master)');
  await openLevelUp(); step('Features');
  ok(/Maneuvers0 \/ 2/.test(body().textContent) && opt('Trip Attack').disabled && /on your sheet/.test(opt('Trip Attack').textContent), 'Fighter 7: 2 more maneuvers, known ones greyed out');
  opt('Ambush').click(); opt('Rally').click();
  await apply();
  ok(/Maneuvers \(Battle Master\):\nAmbush: Add/.test(val('Features and Traits')) && window.resources.list().find(r => r.name === 'Superiority Dice').max === 5,
    'the new maneuvers are written; 5 Superiority Dice at Fighter 7');
  type('ClassLevel', 'Fighter 3 (Champion)'); ok(C.critRange === 19, 'Champion read from the Class box: crit on 19');
  type('ClassLevel', 'Fighter 3 (Battle Master)'); ok(C.critRange === 20, 'Battle Master: crit on 20');

  // ---- 2. Eldritch Knight: a third caster's spells and slots
  await loadSheet((add, box) => basics(add, box, { cls: 'Fighter 2', spells: true }));
  await openLevelUp(); step('Features'); card('Eldritch Knight').click(); await wait(10);
  ok(stepNames().includes('Spells'), 'Eldritch Knight: a Spells page');
  step('Spells');
  ok(/Wizard \(Eldritch Knight\) spells at Fighter level 3: 2 cantrips, 3 prepared spells, up to level 1/.test(body().textContent), 'the third-caster table: ' + body().querySelector('.lu-lead')?.textContent);
  pickSpell('cantrips', 'Fire Bolt'); pickSpell('cantrips', 'Ray of Frost');
  pickSpell('prepared', 'Shield'); pickSpell('prepared', 'Magic Missile'); pickSpell('prepared', 'Burning Hands');
  await apply();
  ok(val('SlotsTotal 19') === '2' && ['Fire Bolt', 'Ray of Frost', 'Shield', 'Magic Missile', 'Burning Hands'].every(n => spellLines().includes(n)),
    'two level 1 slots and the five spells written: ' + spellLines().join(', '));
  ok(JSON.stringify(window.calc.slotsFor(C.classes).slice(0, 2)) === '[2,0]' && C.spellcasting.ability === 'INT', 'slots and spellcasting (INT) read back');
  await openLevelUp(); step('Spells');
  ok(/1 more prepared spell/.test(body().textContent), 'Fighter 4: one more prepared spell');
  pickSpell('prepared', 'Sleep');
  await apply();
  ok(val('SlotsTotal 19') === '3' && spellLines().includes('Sleep'), 'Fighter 4: three level 1 slots');
  const ek = DND.classes.fighter.subclasses.find(s => s.name === 'Eldritch Knight'), ps = DND.classes.bloodhunter.subclasses.find(s => s.name === 'Order of the Profane Soul');
  ok(JSON.stringify(window.calc.slotsFor([{ key: 'fighter', level: 6, sub: ek }, { key: 'wizard', level: 1 }]).slice(0, 3)) === '[4,2,0]',
    'multiclass: Eldritch Knight 6 + Wizard 1 = caster level 3');
  const pact = window.calc.pactOf([{ key: 'bloodhunter', level: 6, sub: ps }, { key: 'warlock', level: 1 }]);
  ok(pact.slots === 2 && pact.slotLevel === 2 && window.calc.pactOf([{ key: 'bloodhunter', level: 7, sub: ps }]).slotLevel === 2,
    'Profane Soul 6 + Warlock 1: Pact slots as Warlock 3; Profane Soul 7 alone: level 2 slots');

  // ---- 3. Reading classes and subclasses
  type('ClassLevel', 'Ranger 5 (Hunter) / Blood Hunter 3 (Ghostslayer)');
  ok(C.classes.map(c => `${c.key} ${c.level} ${c.sub?.name}`).join('; ') === 'ranger 5 Hunter; bloodhunter 3 Order of the Ghostslayer',
    '"Blood Hunter 3 (Ghostslayer)" next to a Hunter Ranger: ' + C.classes.map(c => `${c.key} ${c.level} ${c.sub?.name}`).join('; '));
  type('ClassLevel', 'Bloodhunter 2'); ok(C.classes[0]?.key === 'bloodhunter' && C.classes[0].level === 2, '"Bloodhunter 2" reads as a Blood Hunter');

  // ---- 4. Blood Hunter 1 -> 2: Fighting Style (four styles) and Crimson Rite; the rite in the roller
  await loadSheet((add, box) => basics(add, box, { cls: 'Blood Hunter 1', features: "Hunter's Bane (Blood Hunter 1): Advantage on tracking." }));
  await openLevelUp(); step('Features');
  const styles = [...body().querySelectorAll('.lu-card b')].map(b => b.firstChild.textContent);
  ok(['Archery', 'Dueling', 'Great Weapon Fighting', 'Two-Weapon Fighting'].every(n => styles.includes(n)) && !styles.includes('Defense') && !styles.includes('Other feat'),
    'Fighting Style: only Archery, Dueling, Great Weapon Fighting, Two-Weapon Fighting: ' + styles.join(', '));
  ok(!opt('Rite of the Flame').disabled && opt('Rite of the Dead').disabled && /Blood Hunter level 14\+/.test(opt('Rite of the Dead').textContent), 'rites of level 14 are greyed out');
  card('Dueling').click(); await wait(10); opt('Rite of the Flame').click();
  await apply();
  ok(/Dueling \(Fighting Style, Blood Hunter 2\)/.test(val('Features and Traits')) && /Crimson Rite \(Blood Hunter 2\): Bonus Action/.test(val('Features and Traits'))
    && /\nRite of the Flame: Fire damage\./.test(val('Features and Traits')), 'the style and the rite are written');
  ok(C.feats.includes('Dueling') && !C.beyond.length, 'Dueling counts (a Blood Hunter 2 has Fighting Style)');
  attackWith('Longsword');
  ok(!!rbtn('Rite of the Flame +1d4 fire'), 'the attack card offers the rite: +1d4 fire');
  rbtn('Rite of the Flame').click(); await wait(10);
  forced = [15, 5, 3]; rbtn('Attack').click(); await wait(20);
  ok(/Rite of the Flame/.test(lastRoll().textContent) && /fire/.test(lastRoll().textContent), 'the attack rolls the rite\'s fire die');
  const bm = window.resources.list().find(r => r.name === 'Blood Maledict');
  ok(bm && bm.max === 1 && bm.back === 'short' && /1d4 Necrotic/.test(bm.note), 'Rest tab: Blood Maledict, 1 use per Short Rest');
  // Blood Hunter 2 -> 3: Order of the Profane Soul, Pact Magic from the Warlock list
  await openLevelUp(); step('Features'); card('Order of the Profane Soul').click(); await wait(10);
  card('Fiend').click(); await wait(10);
  step('Spells');
  ok(/Warlock \(Order of the Profane Soul\) spells at Blood Hunter level 3: 2 cantrips, 2 prepared spells, up to level 1/.test(body().textContent), 'Profane Soul: 2 Warlock cantrips and 2 spells');
  pickSpell('cantrips', 'Eldritch Blast'); pickSpell('cantrips', 'Chill Touch'); pickSpell('prepared', 'Charm Person'); pickSpell('prepared', 'Protection from Evil and Good');
  await apply();
  ok(val('ClassLevel') === 'Blood Hunter 3 (Order of the Profane Soul)' && JSON.stringify(window.calc.slotsFor(C.classes).slice(0, 2)) === '[1,0]',
    'one Pact slot of level 1: ' + val('ClassLevel'));
  ok(/Otherworldly Patron \(Order of the Profane Soul\): Fiend/.test(val('Features and Traits')), 'the patron is written');

  // ---- 5. Vestige Patron: a Cleric domain's spells, picked now and read back later
  await loadSheet((add, box) => basics(add, box, { cls: 'Warlock 2', scores: { CHA: 16 }, spells: true }));
  await openLevelUp(); step('Features'); card('Vestige Patron').click(); await wait(10);
  card('War').click(); await wait(10);
  step('Spells');
  ok(['Guiding Bolt', 'Magic Weapon', 'Shield of Faith', 'Spiritual Weapon'].every(n => body().textContent.includes(n)), 'War: its level 3 domain spells are always prepared');
  await apply();
  type('ClassLevel', 'Warlock 4 (Vestige Patron)');
  await openLevelUp(); step('Spells');
  ok(/Spirit Guardians/.test(body().textContent) && /Crusader's Mantle/.test(body().textContent), 'Warlock 5: the War spells of level 5, read from the sheet');
  await cancel();

  // ---- 6. A new Artificer at level 1, then Replicate Magic Item at level 2
  await loadSheet((add, box) => basics(add, box, { cls: '', spells: true }));
  document.getElementById('levelUp').click(); await wait(20);
  btnIn(document.querySelector('.ask'), 'Start at level 1').click(); await wait(20);
  card('Artificer').click(); await wait(10);
  step('Features'); opt('Arcana').click(); opt('History').click();
  step('Spells');
  ok(/Mending/.test(body().textContent), 'Mending comes always prepared');
  pickSpell('cantrips', 'Fire Bolt'); pickSpell('cantrips', 'Light'); pickSpell('prepared', 'Cure Wounds'); pickSpell('prepared', 'Grease');
  await apply();
  ok(val('ClassLevel') === 'Artificer 1' && C.classes[0]?.key === 'artificer' && ['Mending', 'Fire Bolt', 'Cure Wounds'].every(n => spellLines().includes(n)),
    'Artificer 1 with its spells: ' + spellLines().join(', '));
  await openLevelUp(); step('Features');
  ok(/Magic item plans0 \/ 4/.test(body().textContent) && !opt('Bag of Holding').disabled && opt('Armor +1').disabled, 'Artificer 2: 4 plans, level 6 plans greyed out');
  await cancel();

  // ---- 7. Knowledge Domain: two skills with Expertise; a Wizard savant at a new slot level
  await loadSheet((add, box) => basics(add, box, { cls: 'Cleric 2', scores: { INT: 10 }, skills: [['Arcana', false, '+0'], ['History', false, '+0'], ['Religion', true, '+2']] }));
  await openLevelUp(); step('Features'); card('Knowledge Domain').click(); await wait(10);
  opt('Arcana').click(); opt('History').click();
  await apply();
  ok(val('Arcana') === '+4' && val('History') === '+4' && inp('Check Box 20').checked, 'Blessings of Knowledge: proficiency and Expertise (+4)');
  await loadSheet((add, box) => basics(add, box, { cls: 'Wizard 4 (Abjurer)', scores: { INT: 16 } }));
  await openLevelUp(); step('Features');
  ok(/Abjuration Savant/.test(body().textContent) && /Choose 1 spell/.test(body().textContent), 'Wizard 5 (Abjurer): one free Abjuration spell for the new slot level');
  await cancel();

  // ---- 8. Riders and resources: Psi Warrior
  await loadSheet((add, box) => basics(add, box, { cls: 'Fighter 3 (Psi Warrior)' }));
  attackWith('Longsword');
  ok(!!rbtn('Psionic Strike 1d6+2 force'), 'the attack card offers Psionic Strike (1d6 + INT)');
  const psi = window.resources.list().find(r => r.name === 'Psionic Energy Dice');
  ok(psi && psi.max === 4 && psi.note === 'd6' && psi.back === 'short1', 'Rest tab: 4 Psionic Energy Dice (d6), one back on a Short Rest');
  // multiclassing: the Blood Hunter needs STR or DEX 13 and INT 13
  await openLevelUp(); btnIn(body(), 'A new class').click(); await wait(10);
  const bhOpt = [...body().querySelectorAll('.lu-opt')].find(b => b.querySelector('b').textContent === 'Blood Hunter');
  ok(bhOpt && /d10/.test(bhOpt.textContent), 'Fighter with STR 16 / INT 14: Blood Hunter can be taken (d10)');
  await cancel();

  // ---- 9. A new Blood Hunter at level 1, as the sheet maker starts it
  await loadSheet((add, box) => basics(add, box, { cls: '', hp: '' }));
  window.levelUp.start({ key: 'bloodhunter' }); await wait(20);
  ok(!stepNames().includes('Class') && !stepNames().includes('Spells'), 'Blood Hunter level 1: no Class step, no Spells step: ' + stepNames().join(', '));
  step('Features');
  ok(/Blood Hunter skills0 \/ 3/.test(body().textContent) && /Blood curses0 \/ 1/.test(body().textContent), 'three skills and one blood curse to pick');
  opt('Arcana').click(); opt('Athletics').click(); opt('Survival').click(); opt('Blood Curse of Binding').click();
  await apply();
  ok(val('ClassLevel') === 'Blood Hunter 1' && val('HPMax') === '12', 'Blood Hunter 1 with 12 HP (d10 + CON): ' + val('HPMax'));
  ok(/Blood Maledict \(Blood Hunter 1\): You know 1 blood curse/.test(val('Features and Traits')) && /\nBlood Curse of Binding: Bonus Action/.test(val('Features and Traits')),
    'Blood Maledict and the curse are written');
  ok(!C.beyond.length && !errors.length, 'nothing beyond the rules, no errors: ' + errors.join(' | '));
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
