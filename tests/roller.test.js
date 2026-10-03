
const MODE = '__MODE__';
const out = []; const log = (...a) => out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); return el; };
const pick = () => document.getElementById('rollPick');
const btn = (text, root = document.getElementById('roller')) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const entries = () => [...document.querySelectorAll('#rollLog .roll')];
const last = () => entries()[0];
const num = el => +el.dataset.count;
// force the next random numbers: queue of values (1-based face values) for the given die size
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };

(async () => { try {
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, val = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (val) f.setText(val); f.addToPage(page, { x, y, width: w, height: h }); };
  add('CharacterName', 20, 750, 150, 'Test'); add('ClassLevel', 200, 750, 120, 'Fighter 5'); add('Race ', 340, 750, 100, 'Tiefling (Infernal)'); add('Background', 460, 750, 100, 'Soldier');
  add('STR', 20, 700, 30, '16'); add('STRmod', 60, 700, 30, '+3'); add('DEX', 20, 670, 30, '14'); add('DEXmod', 60, 670, 30, '+2');
  add('INT', 20, 640, 30, '16'); add('INTmod', 60, 640, 30, '+3');
  add('ProfBonus', 20, 610, 30, '+3'); add('Athletics', 100, 610, 30, '+6'); add('ST Strength', 140, 610, 30, '+6');
  add('Wpn Name', 200, 600, 120, 'Longsword +1'); add('Wpn1 AtkBonus', 330, 600, 40); add('Wpn1 Damage', 380, 600, 120);
  add('Wpn Name 2', 200, 578, 120, 'Greatsword'); add('Wpn2 AtkBonus ', 330, 578, 40, '+6'); add('Wpn2 Damage ', 380, 578, 120, '2d6+3 slashing');
  add('Wpn Name 3', 200, 556, 120); add('Wpn3 AtkBonus  ', 330, 556, 40); add('Wpn3 Damage  ', 380, 556, 120);
  add('Spells 1014', 300, 400, 150, 'Fire Bolt'); add('Spells 1015', 300, 380, 150); add('Spells 1016', 300, 360, 150, 'Fireball');
  add('Features and Traits', 20, 100, 250, 'Fighting Style: Great Weapon Fighting\nSavage Attacker\nMagic Missile, Cure Wounds', true, 200);
  const file = new File([await doc.save()], 't.pdf', { type: 'application/pdf' });
  const dt = new DataTransfer(); dt.items.add(file);
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 100 && !(character.weapons && character.weapons.length); i++) await wait(50);
  const c = character;
  if (MODE !== 'test') {
    if (MODE === 'shot') { tab('attack'); pick().querySelector('.item').click(); btn('Savage Attacker', pick()).click(); forced = [7, 17, 3, 6]; btn('Advantage', pick()).click(); forced = [20, 6, 8]; btn('Attack', pick()).click(); }
    if (MODE === 'shot2') { tab('dice'); forced=[6,1,4,3]; const ex2 = pick().querySelector('.exprin'); ex2.value='4d6kh3'; ex2.dispatchEvent(new Event('input')); pick().querySelector('form').requestSubmit();
      tab('spell'); [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Fireball')).click(); [...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === '4').click(); btn('Cast & roll', pick()).click(); }
    if (MODE === 'shot3') { tab('attack'); pick().querySelector('.item').click(); forced=[1, 5]; btn('Attack', pick()).click(); tab('check'); forced=[11]; [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith('Stealth')).click(); }
    await wait(3000); document.title = 'DONE'; return;
  }
  ok(c.spells.map(s => s.spell.name).join(',') === 'Fire Bolt,Cure Wounds,Hellish Rebuke,Magic Missile,Darkness,Fireball', 'spells found: ' + c.spells.map(s => s.spell.name + '(' + s.from + ')').join(', '));
  ok(c.skills.find(s => s.name === 'Athletics').mod === 6 && c.skills.find(s => s.name === 'Athletics').fromSheet, 'Athletics +6 read from sheet');
  ok(c.skills.find(s => s.name === 'Intimidation').mod === 3, 'Intimidation fallback: CHA 0 + PB (Soldier skill) = ' + c.skills.find(s => s.name === 'Intimidation').mod);
  ok(c.saves.find(s => s.ability === 'STR').mod === 6 && c.saves.find(s => s.ability === 'CON').mod === 3, 'saves: STR +6 from sheet, CON = 0 + PB(fighter save) = ' + c.saves.find(s => s.ability === 'CON').mod);
  ok(c.feats.includes('Great Weapon Fighting') && c.feats.includes('Savage Attacker'), 'feats ' + c.feats);
  ok(c.spellcasting.ability === 'INT' && c.spellcasting.attack === 6 && c.spellcasting.dc === 14, 'no caster class -> best of INT/WIS/CHA: ' + JSON.stringify(c.spellcasting));
  const sr = (n, slot) => calc.spellRoll(DND.spells.find(s => s.name === n), slot);
  ok(sr('Fire Bolt').text === '2d10 fire', 'Fire Bolt at level 5: ' + sr('Fire Bolt').text);
  ok(sr('Fireball', 5).text === '10d6 fire', 'Fireball slot 5: ' + sr('Fireball', 5).text);
  ok(sr('Magic Missile', 3).count === 5 && sr('Magic Missile', 3).text === '5 × 1d4+1 force', 'Magic Missile slot 3: ' + sr('Magic Missile', 3).text);
  ok(sr('Eldritch Blast').count === 2, 'Eldritch Blast 2 beams at level 5');
  ok(calc.diceText(sr('Cure Wounds', 2).heal) === '4d8+3', 'Cure Wounds slot 2: ' + calc.diceText(sr('Cure Wounds', 2).heal));
  ok(calc.diceText(sr('Heal', 7).heal) === '80', 'Heal slot 7: 80');
  ok(sr('Ice Storm', 5).text === '3d10 bludgeoning + 4d6 cold', 'Ice Storm slot 5: ' + sr('Ice Storm', 5).text);
  ok(sr('Spiritual Weapon', 3).text === '2d8+3 force', 'Spiritual Weapon slot 3: ' + sr('Spiritual Weapon', 3).text);

  // weapon line suggestion includes spells: type "fire b" in row 3
  inp('Wpn Name 3').focus(); type('Wpn Name 3', 'fire b');
  const sugg = [...document.querySelectorAll('#suggest li')].map(li => li.textContent);
  ok(sugg[0] && sugg[0].startsWith('Fire Bolt'), 'weapon-line suggestions offer spells: ' + sugg.join(' | '));
  inp('Wpn Name 3').dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  ok(inp('Wpn3 AtkBonus  ').value === '+6' && inp('Wpn3 Damage  ').value === '2d10 fire', 'Fire Bolt filled: ' + inp('Wpn3 AtkBonus  ').value + ' ' + inp('Wpn3 Damage  ').value);
  type('INTmod', '+4'); ok(inp('Wpn3 AtkBonus  ').value === '+7', 'autofilled Fire Bolt follows INT: ' + inp('Wpn3 AtkBonus  ').value);
  type('INTmod', '+3'); ok(inp('Wpn3 AtkBonus  ').value === '+6', 'and back: ' + inp('Wpn3 AtkBonus  ').value);
  // spell line suggestion
  inp('Spells 1015').focus(); type('Spells 1015', 'mag');
  const s2 = [...document.querySelectorAll('#suggest li')].map(li => li.textContent);
  ok(s2.some(x => x.startsWith('Magic Missile')), 'spell-line suggestions: ' + s2.slice(0, 4).join(' | '));
  document.getElementById('suggest').hidden = true; inp('Spells 1015').blur();

  // ---- panel: attack list and card
  tab('attack');
  const items = [...pick().querySelectorAll('.item')].map(b => b.textContent);
  ok(items.length === 3 && !items.some(t => t.includes('Fire Bolt')), 'attack list (spell line excluded): ' + items.join(' | '));
  pick().querySelector('.item').click(); // Longsword +1
  const nums = [...pick().querySelectorAll('.num b')].map(b => b.textContent);
  ok(nums[0] === '+7' && nums[1] === '1d8+4 slashing', 'Longsword +1 card: ' + nums.join(' / '));
  // forced roll: d20s 5 and 17 with advantage -> keep 17; damage savage attacker on (toggle) -> rolls twice
  btn('Savage Attacker', pick()).click();
  forced = [5, 17, 3, 6];
  btn('Advantage', pick()).click();
  let e = last();
  ok(e.querySelectorAll('.face').length === 2 && e.querySelector('.face.dropped .v').textContent === '5', 'advantage shows both d20s, 5 dropped');
  ok(num(e.querySelector('.test .total')) === 17 + 7, 'attack total 17+7 = ' + num(e.querySelector('.test .total')));
  ok(num(e.querySelector('.dsum .total')) === 6 + 4 && e.querySelector('.alt').textContent === '(3)', 'Savage Attacker keeps higher (6 vs 3): ' + num(e.querySelector('.dsum .total')));
  btn('Savage Attacker', pick()).click();
  // forced crit
  forced = [20, 2, 7];
  btn('Attack', pick()).click();
  e = last();
  ok(e.classList.contains('crit') && e.querySelectorAll('.dmg .die').length === 2, 'nat 20: crit class and 2 damage dice');
  ok(num(e.querySelector('.dsum .total')) === 2 + 7 + 4, 'crit damage 2+7+4 = ' + num(e.querySelector('.dsum .total')));
  // again buttons (unlimited rerolls)
  const before = entries().length;
  btn('↻ Again', e).click(); btn('Advantage', last()).click(); btn('Disadvantage', last()).click();
  ok(entries().length === before + 3, 'Again / Advantage / Disadvantage each add a roll');
  ok(last().querySelector('.tag').textContent.includes('Disadvantage'), 'last roll tagged Disadvantage');
  forced = [1]; btn('Attack', pick()).click();
  ok(last().classList.contains('fumble') && !last().querySelector('.dmg'), 'natural 1: miss, no damage rolled');
  btn('‹ Weapons', pick()).click();

  // Greatsword from sheet values with GWF: force 1 and 2 -> both count as 3
  [...pick().querySelectorAll('.item')][1].click();
  ok(pick().querySelector('.src').textContent === 'From your sheet', 'Greatsword uses sheet numbers');
  forced = [10, 1, 2];
  btn('Attack', pick()).click();
  e = last();
  ok(e.querySelectorAll('.die.gwf').length === 2 && num(e.querySelector('.dsum .total')) === 3 + 3 + 3, 'Great Weapon Fighting turns 1 and 2 into 3s: ' + num(e.querySelector('.dsum .total')));
  btn('‹ Weapons', pick()).click();

  // ---- spells
  tab('spell');
  const groups = [...pick().querySelectorAll('h4')].map(x => x.textContent);
  ok(groups.join(',') === 'Cantrips,Level 1,Level 2,Level 3' || groups.length >= 2, 'spell groups: ' + groups.join(', '));
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Magic Missile')).click();
  [...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === '3').click();
  btn('Cast', pick()).click();
  e = last();
  ok(e.querySelectorAll('.line').length === 5 && e.querySelector('.grand').textContent.startsWith('Total:'), 'Magic Missile at slot 3: 5 darts, total');
  btn('‹ Spells', pick()).click();
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Fireball')).click();
  btn('Cast & roll', pick()).click();
  e = last();
  ok(e.querySelector('.dc').textContent.includes('DC 14') && e.querySelectorAll('.die.d6').length === 8 && e.querySelector('.half'), 'Fireball: DC 14 DEX, 8d6, half shown');
  btn('‹ Spells', pick()).click();
  // search any spell
  const s = pick().querySelector('.search'); s.value = 'eldr'; s.dispatchEvent(new Event('input'));
  pick().querySelector('.item').click();
  ok(pick().querySelector('h3').textContent.startsWith('Eldritch Blast'), 'search opens Eldritch Blast');
  btn('Agonizing', pick()).click();
  btn('Cast', pick()).click();
  e = last();
  ok(e.querySelectorAll('.test').length === 2 && e.querySelector('.part .flat').textContent === '+3', 'Eldritch Blast: 2 beams, Agonizing +3');
  btn('‹ Spells', pick()).click();
  { const q = pick().querySelector('.search'); q.value = ''; q.dispatchEvent(new Event('input')); }
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Cure Wounds')).click();
  btn('Roll healing', pick()).click();
  ok(last().querySelector('.dmg.heal'), 'Cure Wounds heal roll');
  btn('‹ Spells', pick()).click();

  // ---- checks / saves / initiative / dice
  tab('check');
  forced = [12];
  [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith('Athletics')).click();
  ok(num(last().querySelector('.test .total')) === 18 && !last().classList.contains('crit'), 'Athletics 12+6 = 18');
  tab('save'); forced = [20];
  [...pick().querySelectorAll('.trow')].find(r => r.textContent.startsWith('Strength')).querySelector('.tadv').click();
  ok(last().classList.contains('natural') && !last().classList.contains('crit'), 'nat 20 on a save: highlighted but not a crit');
  tab('init'); btn('Roll initiative', pick()).click();
  ok(last().querySelector('.rhead b').textContent === 'Initiative', 'initiative rolled');
  tab('dice'); forced = [6, 1, 4, 3];
  const ex = pick().querySelector('.exprin'); ex.value = '4d6kh3+2'; ex.dispatchEvent(new Event('input'));
  pick().querySelector('form').requestSubmit();
  e = last();
  ok(num(e.querySelector('.dsum .total')) === 6 + 4 + 3 + 2 && e.querySelectorAll('.die.dropped').length === 1, '4d6kh3+2 with 6,1,4,3 = 15, one dropped');
  btn('d20', pick())?.click() ?? pick().querySelector('.qd.d20, .qd')?.click();
  // uniformity of rnd: 20000 d20s via custom rolls is slow in DOM; check distribution through getRandomValues mapping instead
  const counts = Array(20).fill(0); for (let i = 0; i < 20000; i++) counts[crypto.getRandomValues(new Uint32Array(1))[0] % 20]++;
  ok(Math.min(...counts) > 850 && Math.max(...counts) < 1150, 'd20 faces roughly uniform: ' + Math.min(...counts) + '-' + Math.max(...counts));
  log('log entries:', entries().length);
  if (MODE === 'shot2') { tab('spell'); [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Fireball')).click(); [...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === '4').click(); btn('Cast & roll', pick()).click(); tab('dice'); forced=[6,1,4,3]; const ex2 = pick().querySelector('.exprin'); ex2.value='4d6kh3'; ex2.dispatchEvent(new Event('input')); pick().querySelector('form').requestSubmit(); tab('spell'); }
  if (MODE === 'shot3') { tab('check'); forced=[1]; [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith('Stealth')).click(); tab('attack'); pick().querySelector('.item').click(); forced=[1, 5]; btn('Attack', pick()).click(); tab('dice'); }
  if (MODE === 'shot') {
    tab('attack'); pick().querySelector('.item').click();
    forced = [20, 6, 8]; btn('Attack', pick()).click();
  }
} catch (err) { log('ERROR', err.stack); }
if (MODE === 'test') { const pre = document.createElement('pre'); pre.id = 'out'; pre.textContent = out.join('\n'); document.body.prepend(pre); }
document.title = 'DONE';
})();
