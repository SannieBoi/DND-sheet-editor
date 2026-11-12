// "What do I need to roll?" (roller.js): the switch at the top of the roller, then every roll button shows the dice to
// roll and what to add instead of rolling (attack + damage + crit, Advantage, Damage only / Critical damage, Great Weapon
// Fighting's hint, a save spell, Magic Missile's darts, a check, the Dice tab), the side effects stay (attacks this turn),
// a concentration save asks for your total and reports it, a Rest tab heal asks for the total and then "Heal yourself",
// and switched off it rolls again.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const pick = () => document.getElementById('rollPick');
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const entries = () => [...document.querySelectorAll('#rollLog .roll')];
const first = () => entries()[0];
const dialog = () => document.querySelector('.ask');
const answer = async text => { const b = btnIn(dialog(), text); if (!b) log('FAIL no dialog button ' + text + ' in ' + (dialog()?.textContent || 'no dialog')); else b.click(); await wait(20); };
const item = name => [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith(name));
const txt = (e, sel) => e.querySelector(sel)?.textContent;
const T = () => window.turn.now();
const act = name => [...pick().querySelectorAll('.ract')].find(b => b.firstChild.textContent === name);
(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('ClassLevel', 20, 750, 140, 'Fighter 5'); add('Speed', 220, 750, 30, '30');
  add('STR', 20, 720, 30, '16'); add('STRmod', 60, 720, 30, '+3'); add('ST Strength', 100, 720, 30, '+6'); add('Athletics', 140, 720, 30, '+6');
  add('DEX', 20, 700, 30, '14'); add('DEXmod', 60, 700, 30, '+2');
  add('CON', 20, 680, 30, '14'); add('CONmod', 60, 680, 30, '+2'); add('ProfBonus', 20, 650, 30, '+3');
  add('INT', 140, 680, 30, '16'); add('INTmod', 180, 680, 30, '+3');
  add('HPMax', 20, 620, 30, '44'); add('HPCurrent', 60, 620, 30, '30'); add('HPTemp', 100, 620, 30, '');
  add('Wpn Name', 200, 600, 120, 'Longsword +1'); add('Wpn1 AtkBonus', 330, 600, 40); add('Wpn1 Damage', 380, 600, 120);
  add('Wpn Name 2', 200, 578, 120, 'Greatsword'); add('Wpn2 AtkBonus ', 330, 578, 40); add('Wpn2 Damage ', 380, 578, 120);
  add('Spells 1014', 300, 400, 150, 'Fireball'); add('Spells 1015', 300, 380, 150, 'Magic Missile');
  add('Features and Traits', 20, 100, 250, 'Fighting Style: Great Weapon Fighting', true, 200);
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 't.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  await wait(20);

  // ---- the switch -------------------------------------------------------------------------------------------------
  const sw = document.getElementById('rollGuide'), box = document.getElementById('rollGuideBox');
  ok(sw && sw.nextElementSibling === document.getElementById('rollActions') && sw.textContent.trim() === 'What do I need to roll?' && !box.checked && !window.roller.guide,
    'the switch sits at the top of the roller, above the tabs, off');
  box.click();
  ok(window.roller.guide && document.getElementById('roller').classList.contains('guide') && localStorage.getItem('roll-guide') === '1', 'switched on (remembered)');

  // ---- an attack -----------------------------------------------------------------------------------------------------
  tab('attack'); item('Longsword').click();
  ok(btnIn(pick(), 'Attack') && btnIn(pick(), 'Damage only') && btnIn(pick(), 'Critical damage'), 'the buttons keep their names');
  const n0 = T().attacksLeft;
  forced = [5, 6];
  btnIn(pick(), 'Attack').click();
  let e = first();
  ok(forced.length === 2, 'nothing was rolled');
  ok(e.classList.contains('guide') && !e.querySelector('[data-count]') && /What to roll/.test(txt(e, '.tag')), 'the entry shows what to roll, no results: ' + txt(e, '.tag'));
  ok(txt(e, '.need .face') === 'd20' && txt(e, '.test .op') === '+' && txt(e, '.test .mod') === '7' && !e.querySelector('.test .cnt'), 'attack: d20 + 7');
  ok(txt(e, '.formula') === '1d8 + 4' && /damage on a hit/.test(txt(e, '.dsum .what')) && txt(e, '.dsum small') === 'Critical Hit: 2d8 + 4',
    'damage on a hit and on a Critical Hit: ' + txt(e, '.formula') + ' / ' + txt(e, '.dsum small'));
  ok(/Natural 20: a Critical Hit/.test(txt(e, '.how')), 'when it crits: ' + txt(e, '.how'));
  ok(T().attacksLeft === n0 - 1, 'it still counts as an attack this turn (' + n0 + ' -> ' + T().attacksLeft + ')');
  ok(!btnIn(e, '↻ Again') && btnIn(e, 'Advantage') && btnIn(e, 'Disadvantage'), 'no "Again" (it would say the same), Advantage / Disadvantage stay');
  btnIn(e, 'Advantage').click(); e = first();
  ok(txt(e, '.test .cnt') === '2×' && /keep the higher/.test(txt(e, '.test')) && /Advantage/.test(txt(e, '.tag')) && T().attacksLeft === n0 - 1,
    'Advantage: 2× d20, keep the higher (not another attack)');
  btnIn(e, 'Disadvantage').click();
  ok(/keep the lower/.test(txt(first(), '.test')), 'Disadvantage: keep the lower');
  btnIn(pick(), 'Damage only').click();
  ok(txt(first(), '.formula') === '1d8 + 4' && !first().querySelector('.test') && !first().querySelector('.dsum small'), 'Damage only: 1d8 + 4');
  btnIn(pick(), 'Critical damage').click();
  ok(txt(first(), '.formula') === '2d8 + 4' && /Critical Hit: dice doubled/.test(txt(first(), '.dsum .what')), 'Critical damage: 2d8 + 4');
  btnIn(pick(), '‹ Weapons').click(); item('Greatsword').click();
  btnIn(pick(), 'Attack').click(); e = first();
  ok(txt(e, '.formula') === '2d6 + 3' && txt(e, '.part .cnt') === '2×' && /1s and 2s count as 3 \(Great Weapon Fighting\)/.test(txt(e, '.part .xl')),
    'Greatsword: 2× d6 + 3, Great Weapon Fighting told: ' + txt(e, '.part .xl'));
  forced = [];

  // ---- spells ----------------------------------------------------------------------------------------------------------
  tab('spell'); item('Fireball').click();
  btnIn(pick(), 'Cast & roll').click(); await wait(20); await answer('Cast anyway');
  e = first();
  ok(/DC 14/.test(txt(e, '.dc')) && txt(e, '.formula') === '8d6' && /half on a successful save/.test(txt(e, '.dsum .what')) && !e.querySelector('.half'),
    'Fireball: DC 14 DEX save, 8d6, half on a success');
  ok(/Use a level 3 slot|No level 3 slot/.test(e.textContent), 'the slot line is still there');
  btnIn(pick(), '‹ Spells').click(); item('Magic Missile').click();
  [...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === '3').click();
  btnIn(pick(), 'Cast').click(); await wait(20); await answer('Cast anyway');
  e = first();
  ok(e.querySelectorAll('.line').length === 1 && txt(e, '.ln') === 'Each of the 5 darts' && txt(e, '.formula') === '1d4 + 1' && !e.querySelector('.grand'),
    'Magic Missile at level 3: one line for each of the 5 darts: ' + txt(e, '.ln') + ', ' + txt(e, '.formula'));

  // ---- checks, saves, dice ------------------------------------------------------------------------------------------------
  const fired = [];
  document.addEventListener('test-rolled', ev => fired.push(ev.detail));
  tab('check');
  [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith('Athletics')).click();
  ok(txt(first(), '.test .mod') === '6' && txt(first(), '.need .face') === 'd20' && !first().querySelector('.total-in') && !fired.length, 'Athletics: d20 + 6, nothing reported');
  tab('save');
  [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith('Strength')).click();
  ok(txt(first(), '.test .mod') === '6' && !first().querySelector('.total-in') && !fired.length, 'Strength save: d20 + 6, no box for the total');
  window.roller.save('CON', 'Concentration: Bless (DC 10)', 'concentration');
  e = first();
  const tb = e.querySelector('.total-in');
  ok(tb && txt(e, '.test .mod') === '5' && !fired.length, 'a concentration save asks for your total: d20 + 5');
  tb.querySelector('form').requestSubmit();
  ok(tb.querySelector('input').classList.contains('bad') && !fired.length, 'an empty total is not taken');
  tb.querySelector('input').value = '7'; tb.querySelector('form').requestSubmit();
  ok(fired.length === 1 && fired[0].total === 7 && fired[0].purpose === 'concentration' && /You rolled 7\./.test(tb.textContent), 'the total you typed is reported: 7');
  btnIn(tb, 'Change').click();
  ok(tb.querySelector('input')?.value === '7', '"Change" brings the box back');
  tab('dice');
  const ex = pick().querySelector('.exprin'); ex.value = '4d6kh3+2'; ex.dispatchEvent(new Event('input'));
  pick().querySelector('form').requestSubmit();
  e = first();
  ok(txt(e, '.formula') === '4d6kh3 + 2' && txt(e, '.part .cnt') === '4×' && /keep the highest 3/.test(e.textContent), 'Dice: 4d6kh3+2 = roll 4× d6, keep the highest 3, + 2');

  // ---- the Rest tab: Second Wind -------------------------------------------------------------------------------------
  tab('rest'); act('Second Wind').click(); await wait(20);
  e = first();
  const heal = e.querySelector('.total-in');
  ok(txt(e, '.formula') === '1d10 + 5' && e.querySelector('.dmg.heal') && heal && /Healing you rolled/.test(heal.textContent), 'Second Wind: 1d10 + 5 healing, asks what you rolled');
  heal.querySelector('input').value = '8'; heal.querySelector('form').requestSubmit();
  ok(/Heal yourself: HP 30 → 38/.test(heal.textContent), 'then: Heal yourself: HP 30 → 38');
  btnIn(heal, 'Heal yourself').click(); await wait(20);
  ok(inp('HPCurrent').value === '38', 'HP 38 on the sheet');

  // ---- off again -------------------------------------------------------------------------------------------------------
  box.click();
  ok(!window.roller.guide && !document.getElementById('roller').classList.contains('guide') && localStorage.getItem('roll-guide') === '0', 'switched off');
  tab('attack'); forced = [12, 3, 4];
  btnIn(pick(), 'Attack').click();
  e = first();
  ok(!e.classList.contains('guide') && +e.querySelector('.test .total').dataset.count === 18 && +e.querySelector('.dsum .total').dataset.count === 10,
    'off: the Greatsword rolls again: 12 + 6 = 18, 3 + 4 + 3 = 10');
  ok(!document.querySelector('.ask'), 'no question left open');
} catch (e) { log('ERROR ' + e.message + '\n' + e.stack); } })();
