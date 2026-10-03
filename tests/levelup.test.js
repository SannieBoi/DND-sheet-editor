// the log is written into the page as it goes, so a test that stalls still shows how far it got
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).type === 'checkbox' ? inp(n).checked : inp(n).value;
const expect = (label, want) => {
  const bad = Object.entries(want).filter(([n, v]) => v instanceof RegExp ? !v.test(val(n)) : val(n) !== v)
    .map(([n, v]) => `${n.trim()}=${JSON.stringify(val(n))} (want ${v instanceof RegExp ? v : JSON.stringify(v)})`);
  log((bad.length ? 'FAIL ' : 'PASS ') + label + (bad.length ? ': ' + bad.join(', ') : ''));
};
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };

// ---- driving the level-up window
const W = () => document.getElementById('lvlup');
const btnIn = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const body = () => W().querySelector('.lu-body');
async function openLevelUp() {
  document.getElementById('levelUp').click(); await wait(20);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(20);
}
const next = () => W().querySelector('.lu-next').click();
const step = name => [...W().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const stepNames = () => [...W().querySelectorAll('.lu-steps button')].map(b => b.textContent.replace(/^\d+/, ''));
const option = text => btnIn(body(), text).click();
const pickSpell = (pickId, name) => {
  const root = W().querySelector(`[data-pick="${pickId}"]`);
  const b = root && [...root.querySelectorAll('.lu-spell')].find(x => x.querySelector('b').textContent === name);
  if (!b) return log(`FAIL no spell button ${name} in ${pickId}`);
  b.click();
};
const reviewText = () => body().textContent;
const untick = label => {
  const box = [...body().querySelectorAll('input[type=checkbox]')].find(c => c.getAttribute('aria-label') === label);
  box.checked = false; box.dispatchEvent(new Event('change', { bubbles: true }));
};
const apply = () => W().querySelector('.lu-apply').click();

// Build a fillable PDF, drop it in and wait until it's read
async function loadSheet(build, pages = 1) {
  const doc = await PDFLib.PDFDocument.create(), form = doc.getForm();
  const ps = Array.from({ length: pages }, () => doc.addPage([612, 792]));
  const add = (name, x, y, w, v = '', multi = false, h = 16, p = 0) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(ps[p], { x, y, width: w, height: h }); };
  const box = (name, x, y, on, p = 0) => { const f = form.createCheckBox(name); f.addToPage(ps[p], { x, y: y + 3, width: 10, height: 10 }); if (on) f.check(); };
  build(add, box);
  const file = new File([await doc.save()], 't.pdf', { type: 'application/pdf' });
  const dt = new DataTransfer(); dt.items.add(file);
  // Headless virtual time races ahead while the browser waits for real work (reading the file, pdf.js), so waiting
  // with timers runs out early. Yield with messages instead: they keep the page busy and cost no virtual time.
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  if (!loaded) throw new Error('sheet did not load: ' + document.getElementById('status').textContent);
  await wait(20);
}

// A classic-style sheet: scores, skills with proficiency checkboxes, HP, one weapon line
function basics(add, box, o) {
  add('CharacterName', 20, 750, 150, o.name || 'Kadar'); add('ClassLevel', 200, 750, 140, o.cls); add('Race ', 360, 750, 100, o.race || 'Human');
  const sc = o.scores || {};
  [['STR', 16], ['DEX', 14], ['CON', 14], ['INT', 10], ['WIS', 12], ['CHA', 8]].forEach(([ab, def], i) => {
    const s = sc[ab] ?? def;
    add(ab, 20, 700 - i * 30, 30, String(s)); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 60, 700 - i * 30, 30, (s >= 10 ? '+' : '') + Math.floor((s - 10) / 2));
  });
  add('ProfBonus', 20, 500, 30, o.pb || '+2'); add('HPMax', 60, 500, 30, o.hpMax); add('HPCurrent', 100, 500, 30, o.hp); add('Speed', 140, 500, 30, '30');
  if (o.hd) { add('HDTotal', 180, 500, 40, o.hd); add('HD', 230, 500, 40, o.hd); }
  const skills = o.skills || [];
  skills.forEach(([n, on, v], i) => { box('Check Box ' + (20 + i), 80, 460 - i * 20, on); add(n, 95, 460 - i * 20, 30, v); });
  add('Features and Traits', 20, 40, 250, o.features || '', true, 150);
}
// Spell blocks like the classic spell page: cantrip lines, then each level's slots box with its lines underneath
function spellBlocks(add, blocks) {
  let y = 740, n = 1014;
  blocks.forEach((spells, lvl) => {
    if (lvl) { add('SlotsTotal ' + (18 + lvl), 310, y, 30, spells.slots || ''); y -= 22; }
    for (const s of spells.lines) { add('Spells ' + n++, 300, y, 150, s); y -= 20; }
    y -= 8;
  });
}

(async () => { try {
  document.body.prepend(pre);
  // ---- 1. Dwarf Fighter 3 -> 4: Ability Score Improvement, a new weapon mastery, fixed HP with Dwarven Toughness
  await loadSheet((add, box) => {
    basics(add, box, { cls: 'Fighter 3 (Champion)', race: 'Dwarf', hpMax: '28', hp: '20', hd: '3d10', features: 'Second Wind',
      skills: [['Athletics', true, '+5'], ['Perception ', false, '+1'], ['ST Strength', true, '+5']] });
    add('Wpn Name', 300, 600, 120, 'Longsword'); add('Wpn1 AtkBonus', 430, 600, 40, '+5'); add('Wpn1 Damage', 480, 600, 110, '1d8+3 slashing');
  });
  ok(!document.getElementById('levelUp').disabled, 'Level up button enabled once a sheet is loaded');
  document.getElementById('levelUp').click(); await wait(20);
  ok(/level 3 to level 4/.test(document.querySelector('.ask').textContent), 'asks first: ' + document.querySelector('.ask p').textContent.slice(0, 60));
  btnIn(document.querySelector('.ask'), 'Not now').click(); await wait(20);
  ok(!W() && !document.querySelector('.ask'), '"Not now" opens nothing');
  await openLevelUp();
  ok(!!W(), 'the window opens after confirming');
  ok(stepNames().join(',') === 'Class,Hit Points,Features,Review', 'steps for a Fighter: ' + stepNames().join(','));
  ok(/Fighter 3 → 4/.test(body().textContent), 'class step offers Fighter 3 → 4');
  next();
  ok(/= \+9 HP/.test(body().textContent), 'HP: fixed 6 + CON 2 + Dwarven Toughness 1 = +9 (' + body().querySelector('.lu-sum').textContent + ')');
  next();
  ok(/Ability Score Improvement/.test(body().textContent) && /Weapon Mastery/.test(body().textContent), 'features: ASI and one more weapon mastery');
  option('Greatsword');
  ok(body().querySelector('.lu-ab.on small').textContent === 'STR', 'ASI defaults to +2 in the class\'s main ability (STR)');
  next();
  ok(/Max HP\s*28\s*→\s*37/.test(reviewText()), 'review: Max HP 28 → 37');
  ok(!/Still to choose/.test(reviewText()), 'review: nothing left to choose');
  // the window can be dragged by its title bar
  const bar = W().querySelector('.lu-bar'), x0 = W().offsetLeft, y0 = W().offsetTop;
  bar.dispatchEvent(new PointerEvent('pointerdown', { button: 0, clientX: x0 + 100, clientY: y0 + 10, pointerId: 1, bubbles: true }));
  bar.dispatchEvent(new PointerEvent('pointermove', { clientX: x0 + 40, clientY: y0 + 110, pointerId: 1, bubbles: true }));
  bar.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, bubbles: true }));
  ok(W().offsetLeft - x0 === -60 && W().offsetTop - y0 === 100, `drag moves the window (${W().offsetLeft - x0}, ${W().offsetTop - y0})`);
  apply(); await wait(20);
  expect('Fighter 4 applied', { 'ClassLevel': 'Fighter 4 (Champion)', 'HPMax': '37', 'HPCurrent': '29', 'HDTotal': '4d10', 'HD': '4d10',
    'STR': '18', 'STRmod': '+4', 'Athletics': '+6', 'ST Strength': '+6', 'Perception ': '+1', 'ProfBonus': '+2',
    'Wpn1 AtkBonus': '+6', 'Wpn1 Damage': '1d8+4 slashing',
    'Features and Traits': /^Second Wind\nAbility Score Improvement: STR \+2 \(Fighter 4\)\nWeapon Mastery \(Fighter 4\): Greatsword$/ });
  ok(!!W() && /Level 4 applied/.test(body().textContent) && body().querySelectorAll('.lu-state.ok').length >= 8, 'the window stays open as a note of what changed');
  ok(btnIn(W().querySelector('.lu-foot'), 'Close') && !W().querySelector('.lu-apply'), 'after applying only Close is left');
  btnIn(W().querySelector('.lu-foot'), 'Close').click();
  ok(!W(), 'Close shuts the window');

  // ---- 2. Fighter 4 -> 5: rolled HP, PB goes up, one change unticked
  await openLevelUp();
  next();
  forced = [9];
  btnIn(body(), 'Roll').click(); await wait(500);
  ok(/rolled 9/.test(body().textContent) && /= \+12 HP/.test(body().textContent), 'HP roll: 9 + CON 2 + Dwarf 1 = +12');
  forced = [2];
  btnIn(body(), '↻ Roll again').click(); await wait(500);
  ok(/= \+5 HP/.test(body().textContent), 'rolling again: 2 + 2 + 1 = +5');
  btnIn(body(), 'Fixed').click();
  forced = [9]; btnIn(body(), 'Roll').click(); await wait(500); // picks the roll card again (keeps the 2? no: the card re-selects the last roll)
  ok(/= \+5 HP/.test(body().textContent) && forced.length === 1, 'clicking the roll card again just selects the earlier roll');
  forced = [];
  step('Review');
  ok(/Proficiency Bonus/.test(reviewText()) && /Extra Attack/.test(reviewText()) && /Attacks per Attack action/.test(reviewText()), 'review: PB, Extra Attack, attacks 1 → 2');
  untick('Current HP');
  apply(); await wait(20);
  expect('Fighter 5 applied (current HP left alone)', { 'ClassLevel': 'Fighter 5 (Champion)', 'HPMax': '42', 'HPCurrent': '29', 'HDTotal': '5d10',
    'ProfBonus': '+3', 'Athletics': '+7', 'ST Strength': '+7', 'Perception ': '+1', 'Wpn1 AtkBonus': '+7' });
  ok(body().querySelector('.lu-state.skip') != null, 'the unticked change shows as skipped');
  btnIn(W().querySelector('.lu-foot'), 'Close').click();

  // ---- 3. Wizard 4 -> 5: new prepared and spellbook spells go into the level 3 block, slots, a cantrip swapped
  await loadSheet((add, box) => {
    basics(add, box, { cls: 'Wizard 4', scores: { STR: 8, INT: 16, CON: 14 }, hpMax: '22', hp: '22' });
    add('SpellcastingAbility 2', 300, 20, 60, 'INT'); add('SpellSaveDC  2', 370, 20, 40, '13'); add('SpellAtkBonus 2', 420, 20, 40, '+5');
    spellBlocks(add, [{ lines: ['Fire Bolt', 'Light', 'Mage Hand', 'Prestidigitation'] },
      { slots: '4', lines: ['Magic Missile', 'Shield', 'Detect Magic', 'Burning Hands', ''] },
      { slots: '3', lines: ['Misty Step', 'Hold Person', ''] }, { lines: ['', '', '', ''] }]);
  });
  await openLevelUp();
  ok(stepNames().includes('Spells'), 'a Wizard gets a Spells step');
  step('Spells');
  ok(/9 prepared spells, up to level 3/.test(body().textContent), 'spells step: 9 prepared, up to level 3');
  pickSpell('prepared', 'Fireball'); pickSpell('prepared', 'Counterspell');
  pickSpell('book', 'Lightning Bolt'); pickSpell('book', 'Fireball'); pickSpell('book', 'Fly');
  ok(W().querySelector('[data-pick="book"] .lu-count').textContent === '2 / 2', 'spellbook: 2 of 2 picked (Fireball counts for both)');
  const haste = [...W().querySelectorAll('[data-pick="book"] .lu-spell')].find(b => b.querySelector('b').textContent === 'Haste');
  ok(haste && haste.disabled, 'a full picker greys out the rest');
  const sel = body().querySelector('select.lu-wide');
  sel.value = 'Light'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  pickSpell('swap0', 'Ray of Frost');
  step('Review');
  ok(/Level 3 slots/.test(reviewText()) && /Light → Ray of Frost/.test(reviewText()), 'review: level 3 slots and the swap');
  apply(); await wait(20);
  expect('Wizard 5 applied', { 'ClassLevel': 'Wizard 5', 'HPMax': '28', 'SpellSaveDC  2': '14', 'SpellAtkBonus 2': '+6',
    'Spells 1015': 'Ray of Frost', 'Spells 1026': 'Fireball', 'Spells 1027': 'Counterspell', 'Spells 1028': 'Lightning Bolt', 'Spells 1029': '',
    'SlotsTotal 21': '2', 'SlotsTotal 19': '4', 'SlotsTotal 20': '3', 'Spells 1022': '' });
  ok(character.spells.some(x => x.spell.name === 'Fireball'), 'the new spells are read back into character.spells');
  btnIn(W().querySelector('.lu-foot'), 'Close').click();

  // ---- 4. Multiclass: Fighter 4 -> Fighter 4 / Wizard 1
  await loadSheet((add, box) => {
    basics(add, box, { cls: 'Fighter 4', scores: { INT: 13, WIS: 10 }, hpMax: '36', hp: '30', hd: '4d10' });
    add('SpellcastingAbility 2', 300, 20, 60); add('SpellSaveDC  2', 370, 20, 40); add('SpellAtkBonus 2', 420, 20, 40);
    spellBlocks(add, [{ lines: ['', '', ''] }, { slots: '', lines: ['', '', '', '', '', ''] }]);
  });
  await openLevelUp();
  option('A new class');
  option('Wizard');
  ok(/Fighter 4 · level 5|Wizard 1 · level 5/.test(W().querySelector('.lu-sub').textContent), 'title shows Wizard 1, level 5: ' + W().querySelector('.lu-sub').textContent);
  ok(!body().querySelector('.lu-warn'), 'no multiclass warning with STR 16 and INT 13');
  option('Bard');
  ok(/CHA 13 for Bard/.test(body().querySelector('.lu-warn')?.textContent || ''), 'Bard needs CHA 13: warned');
  option('Wizard');
  next();
  ok(/= \+6 HP/.test(body().textContent), 'Wizard Hit Die: fixed 4 + CON 2 = +6');
  step('Spells');
  for (const s of ['Fire Bolt', 'Light', 'Mage Hand']) pickSpell('cantrips', s);
  for (const s of ['Magic Missile', 'Shield', 'Detect Magic', 'Sleep', 'Burning Hands', 'Find Familiar']) pickSpell('book', s);
  for (const s of ['Magic Missile', 'Shield', 'Sleep', 'Detect Magic']) pickSpell('prepared', s);
  step('Review');
  apply(); await wait(20);
  expect('Fighter 4 / Wizard 1 applied', { 'ClassLevel': 'Fighter 4 / Wizard 1', 'HPMax': '42', 'HPCurrent': '36', 'HDTotal': '4d10 + 1d6', 'ProfBonus': '+3',
    'SpellcastingAbility 2': 'Intelligence', 'SpellSaveDC  2': '12', 'SpellAtkBonus 2': '+4', 'SlotsTotal 19': '2',
    'Spells 1014': 'Fire Bolt', 'Spells 1016': 'Mage Hand', 'Spells 1017': 'Magic Missile', 'Spells 1022': 'Find Familiar' });
  ok(character.classes.map(c => c.name + c.level).join() === 'Fighter4,Wizard1' && character.level === 5, 'character reads Fighter 4 / Wizard 1, level 5');
  btnIn(W().querySelector('.lu-foot'), 'Close').click();

  // ---- 5. Cancel throws everything away
  await openLevelUp();
  next(); next();
  W().querySelector('.lu-foot .btn').click(); await wait(20); // Cancel
  ok(/Cancel the level up/.test(document.querySelector('.ask')?.textContent || ''), 'Cancel asks first once you have started');
  btnIn(document.querySelector('.ask'), 'Throw away').click(); await wait(20);
  ok(!W() && val('ClassLevel') === 'Fighter 4 / Wizard 1' && val('HPMax') === '42', 'cancelled: window gone, sheet unchanged');

  // ---- 6. The official 2024 sheet (field names Text1 ...): read through sheets.js and levelled
  await loadSheet((add, box) => {
    add('Text1', 20, 750, 150, 'Vex'); add('Text7', 200, 750, 100, 'Rogue'); add('Text8', 320, 750, 80, 'Halfling'); add('Text9', 420, 750, 100, 'Thief');
    add('Text11', 540, 750, 30, '4'); add('Text16', 20, 700, 30, '27'); add('Text14', 60, 700, 30, '20'); add('Text17', 100, 700, 40, '4d8');
    add('Text19', 150, 700, 30, '+2'); add('Text27', 190, 700, 30, '30');
    add('Text64', 20, 650, 30, '10'); add('Text21', 60, 650, 30, '+0'); add('Text66', 20, 620, 30, '16'); add('Text22', 60, 620, 30, '+3');
    add('Text67', 20, 590, 30, '14'); add('Text24', 60, 590, 30, '+2');
    box('Check Box36', 100, 620, true); add('Text90', 115, 620, 30, '+7');  // Stealth (Expertise)
    box('Check Box34', 100, 600, true); add('Text88', 115, 600, 30, '+5');  // Acrobatics
    add('Text54', 20, 300, 250, 'Sneak Attack', true, 150); add('Text58', 300, 300, 250, '', true, 100);
    add('Text106.0', 300, 100, 150, '', false, 16, 1); add('Text270', 300, 80, 40, '', false, 16, 1); box('Check Box252.0', 280, 100, false, 1);
  }, 2);
  ok(character.classes[0]?.key === 'rogue' && character.level === 4 && character.hpMax === 27 && character.subclass === 'Thief',
    'official sheet read through its field map: Rogue 4, HP 27, subclass Thief');
  await openLevelUp();
  step('Review');
  ok(/Sneak Attack\s*2d6\s*→\s*3d6/.test(reviewText()), 'review: Sneak Attack 2d6 → 3d6');
  apply(); await wait(20);
  expect('official sheet: Rogue 5 applied', { 'Text11': '5', 'Text7': 'Rogue', 'Text16': '34', 'Text14': '27', 'Text17': '5d8', 'Text19': '+3',
    'Text90': '+9', 'Text88': '+6', 'Text54': /^Sneak Attack\nCunning Strike \(Rogue 5\): .+\nUncanny Dodge \(Rogue 5\): / });
  btnIn(W().querySelector('.lu-foot'), 'Close').click();

  // ---- 7. Fighter 4 -> Rogue 1: the multiclass skill, Expertise, Thieves' Cant, two weapon masteries
  await loadSheet((add, box) => {
    basics(add, box, { cls: 'Fighter 4', hpMax: '36', hp: '36', hd: '4d10',
      skills: [['Athletics', true, '+5'], ['Stealth ', false, '+2'], ['Perception ', false, '+1']] });
    add('ProficienciesLang', 300, 300, 250, 'Languages: Common', true, 100);
  });
  await openLevelUp();
  option('A new class'); option('Rogue');
  step('Features');
  ok(/Weapon kinds to master\s*0 \/ 2/.test(body().textContent), 'Rogue 1 masters 2 kinds of weapons');
  const inPick = (title, name) => {
    const pick = [...body().querySelectorAll('.lu-pick')].find(p => p.querySelector('.lu-pickhead b')?.textContent.startsWith(title));
    btnIn(pick, name).click();
  };
  inPick('Skill proficiencies', 'Stealth');
  inPick('Expertise', 'Stealth'); inPick('Expertise', 'Athletics');
  inPick('Weapon kinds', 'Dagger'); inPick('Weapon kinds', 'Shortbow');
  const lang = body().querySelector('.lu-texts input');
  lang.value = 'Elvish'; lang.dispatchEvent(new Event('input', { bubbles: true }));
  step('Review');
  ok(!/Still to choose/.test(reviewText()), 'everything picked: ' + (reviewText().match(/Still to choose.*/)?.[0] || '').slice(0, 80));
  apply(); await wait(20);
  expect('Fighter 4 / Rogue 1 applied', { 'ClassLevel': 'Fighter 4 / Rogue 1', 'HPMax': '43', 'HDTotal': '4d10 + 1d8', 'ProfBonus': '+3',
    'Stealth ': '+8', 'Athletics': '+9', 'Perception ': '+1',
    'ProficienciesLang': 'Languages: Common\nArmor training: Light\nTools: Thieves\' Tools\nLanguages: Thieves\' Cant, Elvish',
    'Features and Traits': /Expertise \(Rogue 1\): Stealth, Athletics\nSneak Attack \(Rogue 1\): .*\nThieves' Cant \(Rogue 1\): Elvish\nWeapon Mastery \(Rogue 1\): Dagger, Shortbow$/ });
  ok(val('Check Box 21') === true, 'Stealth\'s proficiency box is ticked');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
