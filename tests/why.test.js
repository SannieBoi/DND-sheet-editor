// The "?" on a roll log entry (roller.js explain / whyView): it opens a box in the entry saying where each number comes
// from. A Barbarian 5: Greataxe numbers on the sheet that match the rules (+ Rage from the Rest tab), a Handaxe whose
// attack bonus doesn't, a Longsword +1 with no numbers (worked out), Advantage from the log, Poisoned + Raging cancelling,
// What to roll, skills written on the sheet (proficient, Expertise, something else), a worked-out save, a save spell's DC
// and a higher slot, a cantrip's growth, the Dice tab; then a Fighter 5's Second Wind and Indomitable's bonus. An entry
// with nothing to explain (Rage) has no "?".
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const pick = () => document.getElementById('rollPick');
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const first = () => document.querySelector('#rollLog .roll');
const dialog = () => document.querySelector('.ask');
const answer = async text => { const b = btnIn(dialog(), text); if (!b) log('FAIL no dialog button ' + text + ' in ' + (dialog()?.textContent || 'no dialog')); else b.click(); await wait(20); };
const item = name => [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith(name));
const act = name => [...pick().querySelectorAll('.ract')].find(b => b.firstChild.textContent === name);
const testBtn = name => [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith(name));
// the "?" of the newest entry, opened: [{ head, sum, rows: [[value, text, sub]], notes }]
function why(e = first()) {
  const q = e.querySelector('.rhead .whybtn');
  if (!q) return null;
  if (q.getAttribute('aria-expanded') !== 'true') q.click();
  return [...e.querySelectorAll('.whybox section')].map(s => ({
    head: s.querySelector('h5')?.firstChild?.textContent || '', sum: s.querySelector('.wsum')?.textContent || '',
    rows: [...s.querySelectorAll('li')].map(li => [li.querySelector('.wv').textContent, li.querySelector('.wt').firstChild.textContent, li.querySelector('.wt small')?.textContent || '']),
    notes: [...s.querySelectorAll(':scope > p')].map(p => p.textContent) }));
}
const sec = (w, head) => w?.find(s => s.head.startsWith(head));
const has = (s, v, text) => !!s?.rows.some(r => r[0] === v && r[1].includes(text));
const sub = (s, v, text) => s?.rows.find(r => r[0] === v && r[1].includes(text))?.[2] || '';
const show = s => s ? s.head + ' [' + s.sum + '] ' + s.rows.map(r => r.join(' / ')).join(' | ') + ' || ' + s.notes.join(' ') : 'none';
(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('ClassLevel', 20, 750, 140, 'Barbarian 5'); add('Speed', 220, 750, 30, '30');
  add('STR', 20, 720, 30, '18'); add('STRmod', 60, 720, 30, '+4'); add('Athletics', 140, 720, 30, '+7');
  add('DEX', 20, 700, 30, '14'); add('DEXmod', 60, 700, 30, '+2'); add('Stealth', 140, 700, 30, '+8');
  add('CON', 20, 680, 30, '16'); add('CONmod', 60, 680, 30, '+3');
  add('WIS', 20, 660, 30, '10'); add('WISmod', 60, 660, 30, '+0'); add('Perception', 140, 660, 30, '+4');
  add('ProfBonus', 20, 640, 30, '+3');
  add('HPMax', 20, 620, 30, '55'); add('HPCurrent', 60, 620, 30, '40'); add('HPTemp', 100, 620, 30, '');
  add('Wpn Name', 200, 600, 120, 'Greataxe'); add('Wpn1 AtkBonus', 330, 600, 40, '+7'); add('Wpn1 Damage', 380, 600, 120, '1d12+4 slashing');
  add('Wpn Name 2', 200, 578, 120, 'Handaxe'); add('Wpn2 AtkBonus ', 330, 578, 40, '+9'); add('Wpn2 Damage ', 380, 578, 120, '1d6+4 slashing');
  add('Wpn Name 3', 200, 556, 120, 'Longsword +1'); add('Wpn3 AtkBonus  ', 330, 556, 40); add('Wpn3 Damage  ', 380, 556, 120);
  add('Spells 1014', 300, 400, 150, 'Fireball'); add('Spells 1015', 300, 380, 150, 'Fire Bolt');
  add('Features and Traits', 20, 100, 250, '', true, 200);
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 't.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  await wait(20);
  if (window.roller.guide) window.roller.setGuide(false);

  // ---- nothing to explain: Rage from the Rest tab -----------------------------------------------------------------
  tab('rest'); act('Rage').click(); await wait(20);
  ok(/Rage/.test(first()?.textContent) && !first().querySelector('.whybtn'), 'Rage (nothing rolled): no "?"');
  ok(window.effects.hasState('Raging'), 'Raging is on');

  // ---- Greataxe: the sheet's numbers match the rules; Rage adds its damage ---------------------------------------
  tab('attack'); item('Greataxe').click();
  forced = [15, 7];
  btnIn(pick(), 'Attack').click();
  let e = first(), q = e.querySelector('.rhead .whybtn');
  ok(q && q.textContent === '?' && q.getAttribute('aria-expanded') === 'false' && e.querySelector('.whybox')?.hidden, 'a "?" in the entry\'s head, its box closed');
  let w = why(e), a = sec(w, 'Attack roll'), d = sec(w, 'Damage');
  ok(!e.querySelector('.whybox').hidden && q.classList.contains('on') && q.getAttribute('aria-expanded') === 'true', '"?" opens the box in the entry');
  ok(a && a.sum === 'd20 + 7' && has(a, 'd20', 'your d20 roll') && /rolled 15/.test(sub(a, 'd20', 'your d20 roll')), 'attack roll: d20 + 7, rolled 15: ' + show(a));
  ok(has(a, '+4', 'STR modifier') && /melee weapons use STR · score 18/.test(sub(a, '+4', 'STR modifier')), 'STR +4: melee weapons use STR, score 18');
  ok(has(a, '+3', 'Proficiency Bonus') && /proficient with Martial weapons · \+3 at character level 5/.test(sub(a, '+3', 'Proficiency Bonus')), 'Proficiency Bonus +3: Martial weapons, level 5');
  ok(a.notes.some(n => /matches the attack bonus written on your sheet \(\+7\)/.test(n)) && a.notes.some(n => /natural 20 is a Critical Hit/.test(n)), 'matches the sheet; crit range told');
  ok(d && d.sum === '1d12 + 6' && has(d, '1d12', "Greataxe's damage die") && /rolled 7/.test(sub(d, '1d12', 'Greataxe')), 'damage: 1d12 + 6, the Greataxe\'s die, rolled 7: ' + show(d));
  ok(has(d, '+4', 'STR modifier') && has(d, '+2', 'Rage Damage (Barbarian 5)') && d.notes.some(n => /matches the damage written on your sheet/.test(n)), 'STR +4, Rage Damage +2 (Barbarian 5), matches the sheet');
  ok(!e.querySelector('[data-count] .whybox') && e.querySelector('.whybox').previousElementSibling.classList.contains('line'), 'the box sits right under the numbers');
  q.click();
  ok(e.querySelector('.whybox').hidden && !q.classList.contains('on') && q.getAttribute('aria-expanded') === 'false', 'clicked again: closed');
  btnIn(e, 'Advantage').click();
  a = sec(why(), 'Attack roll');
  ok(has(a, '2d20', 'Advantage: roll two d20s, keep the higher') && /you chose it/.test(sub(a, '2d20', 'Advantage')), 'Advantage from the log: 2d20, you chose it: ' + show(a));

  // ---- Handaxe: the sheet says more than the rules -------------------------------------------------------------------
  btnIn(pick(), '‹ Weapons').click(); item('Handaxe').click();
  forced = [10, 3];
  btnIn(pick(), 'Attack').click();
  a = sec(why(), 'Attack roll');
  ok(has(a, '+9', 'The attack bonus written on your sheet') && a.rows.length === 2, 'Handaxe: +9 from the sheet: ' + show(a));
  ok(a.notes.some(n => /By the rules it would be \+7 \(STR modifier \+4, Proficiency Bonus \+3\)\. Your sheet's is 2 higher/.test(n)), 'what the rules would give, 2 higher');

  // ---- Longsword +1: no numbers on the sheet ----------------------------------------------------------------------------
  btnIn(pick(), '‹ Weapons').click(); item('Longsword').click();
  forced = [12, 5];
  btnIn(pick(), 'Attack').click();
  w = why(); a = sec(w, 'Attack roll'); d = sec(w, 'Damage');
  ok(a.sum === 'd20 + 8' && has(a, '+1', '+1 weapon') && /"Longsword \+1"/.test(sub(a, '+1', '+1 weapon')) && a.notes.some(n => /no attack bonus or damage for this one/.test(n)),
    'Longsword +1: worked out, +1 weapon from its name: ' + show(a));
  ok(d.sum === '1d8 + 7' && has(d, '1d8', "Longsword's damage die") && has(d, '+1', '+1 weapon') && has(d, '+2', 'Rage'), 'damage 1d8 + 7: die, STR, +1, Rage: ' + show(d));

  // ---- Poisoned and Raging: Advantage and Disadvantage cancel (a STR check) --------------------------------------------
  window.effects.setState('Poisoned', true);
  tab('check'); forced = [9]; testBtn('Athletics').click();
  a = why()[0];
  ok(a.head === 'Athletics check (STR)' && has(a, 'd20', 'cancel out') && /Advantage: Raging · Disadvantage: Poisoned/.test(sub(a, 'd20', 'cancel')), 'Raging + Poisoned cancel out: ' + show(a));
  ok(has(a, '+4', 'STR modifier') && has(a, '+3', 'Proficiency Bonus') && /proficient in it/.test(sub(a, '+3', 'Proficiency')) && a.notes.some(n => /\+7 is written in your sheet's Athletics box/.test(n)),
    'Athletics +7 taken apart: STR +4, Proficiency +3');
  window.effects.setState('Poisoned', false);
  testBtn('Stealth').click();
  a = why()[0];
  ok(has(a, '+2', 'DEX modifier') && has(a, '+6', 'Expertise'), 'Stealth +8: DEX +2, Expertise +6: ' + show(a));
  testBtn('Perception').click();
  a = why()[0];
  ok(has(a, '+0', 'WIS modifier') && has(a, '+3', 'Proficiency Bonus') && has(a, '+1', 'something else'), 'Perception +4: WIS +0, Proficiency +3, something else +1: ' + show(a));
  tab('save'); testBtn('Strength').click();
  a = why()[0];
  ok(a.head === 'Strength saving throw' && a.sum === 'd20 + 7' && has(a, '2d20', 'Advantage') && /Raging/.test(sub(a, '2d20', 'Advantage')) &&
    /Barbarians are proficient in Strength saves/.test(sub(a, '+3', 'Proficiency')) && a.notes.some(n => /no number for this save, so it is worked out/.test(n)),
    'Strength save worked out: Raging Advantage, STR +4, Barbarian proficiency: ' + show(a));

  // ---- What to roll: the same explanation, nothing rolled ---------------------------------------------------------------
  window.roller.setGuide(true);
  tab('attack'); btnIn(pick(), '‹ Weapons')?.click(); item('Greataxe').click(); btnIn(pick(), 'Attack').click();
  e = first(); w = why(e); a = sec(w, 'Attack roll'); d = sec(w, 'Damage');
  ok(e.classList.contains('guide') && a.sum === 'd20 + 7' && has(a, 'd20', 'your d20 roll') && !sub(a, 'd20', 'your d20 roll') && has(a, '+4', 'STR'), 'What to roll: "?" there, d20 + 7, nothing "rolled"');
  ok(d && has(d, '1d12', 'Greataxe') && !/rolled/.test(sub(d, '1d12', 'Greataxe')) && has(d, '+2', 'Rage'), 'What to roll: damage explained too');
  window.roller.setGuide(false);

  // ---- spells ------------------------------------------------------------------------------------------------------------
  tab('spell'); item('Fireball').click();
  [...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === '5').click();
  btnIn(pick(), 'Cast & roll').click(); await wait(20); await answer('Cast anyway');
  w = why(); const dc = sec(w, 'Save DC'); d = sec(w, 'Damage');
  ok(dc && dc.head === 'Save DC 11' && dc.sum === 'Dexterity save' && has(dc, '8', 'every save DC starts at 8') && has(dc, '+0', 'INT modifier') && has(dc, '+3', 'Proficiency'),
    'Fireball DC 11 = 8 + INT +0 + Proficiency +3: ' + show(dc));
  ok(/best of INT, WIS and CHA/.test(sub(dc, '+0', 'INT')) && dc.notes.some(n => /needs 11 or more.*half damage/.test(n)), 'no spellcasting class: the best of INT, WIS and CHA; what the target needs');
  ok(d && d.sum === '10d6' && has(d, '10d6', 'Fireball') && /8d6 in the spell · \+1d6 for each slot level above 3: \+2d6 with a level 5 slot/.test(sub(d, '10d6', 'Fireball')), 'level 5 slot: 10d6 = 8d6 + 2d6: ' + show(d));
  btnIn(pick(), '‹ Spells').click(); item('Fire Bolt').click();
  forced = [14, 4, 6];
  btnIn(pick(), 'Cast').click(); await wait(20);
  w = why(); a = sec(w, 'Spell attack'); d = sec(w, 'Damage');
  ok(a && a.sum === 'd20 + 3' && has(a, '+0', 'INT modifier') && has(a, '+3', 'Proficiency'), 'Fire Bolt: spell attack d20 + 3: ' + show(a));
  ok(d && has(d, '2d10', 'Fire Bolt') && /1d10 in the spell · × 2: a cantrip's dice grow at character levels 5, 11 and 17 \(you are 5\)/.test(sub(d, '2d10', 'Fire Bolt')), 'cantrip at level 5: 2d10: ' + show(d));

  // ---- the Dice tab ------------------------------------------------------------------------------------------------------
  tab('dice');
  const ex = pick().querySelector('.exprin'); ex.value = '4d6kh3+2'; ex.dispatchEvent(new Event('input'));
  pick().querySelector('form').requestSubmit();
  d = why()[0];
  ok(d.head === 'Dice' && has(d, '4d6', 'typed in the Dice tab') && /keep the highest 3/.test(sub(d, '4d6', 'typed')) && has(d, '+2', 'typed'), 'Dice: 4d6 keep the highest 3, +2: ' + show(d));

  // ---- a Fighter 5: Second Wind, Indomitable's bonus ------------------------------------------------------------------
  window.effects.setState('Raging', false);
  window.sheet.set('ClassLevel', 'Fighter 5'); await wait(20);
  tab('rest'); forced = [6]; act('Second Wind').click(); await wait(20);
  d = why()[0];
  ok(d && d.head === 'Healing' && d.sum === '1d10 + 5' && has(d, '1d10', 'Second Wind') && has(d, '+5', 'your Fighter level'), 'Second Wind: 1d10 + your Fighter level 5: ' + show(d));
  window.roller.save('WIS', 'Indomitable: Wisdom save', null, 5, 'Indomitable: your Fighter level');
  a = why()[0];
  ok(a.sum === 'd20 + 5' && has(a, '+0', 'WIS modifier') && has(a, '+5', 'Indomitable: your Fighter level') && !has(a, '+3', 'Proficiency'), 'Indomitable: WIS +0, +5 Fighter level: ' + show(a));
  ok(!document.querySelector('.ask'), 'no question left open');
} catch (e) { log('ERROR ' + e.message + '\n' + e.stack); } })();
