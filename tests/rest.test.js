// Spell slots (used from the log, the Rest tab, "Cast anyway"), class features, Short and Long Rests, Undo / Redo,
// and the unsaved-changes dot on Download
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).value;
const type = (n, v) => { const el = inp(n); el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.blur(); };
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
let lastBlob = null;
const realURL = URL.createObjectURL;
URL.createObjectURL = b => { lastBlob = b; return realURL(b); };
HTMLAnchorElement.prototype.click = function () {};
const pick = () => document.getElementById('rollPick');
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const entries = () => [...document.querySelectorAll('#rollLog .roll')];
const last = () => entries()[0];
const dialog = () => document.querySelector('.ask');
const answer = async text => { const b = btnIn(dialog(), text); if (!b) log('FAIL no dialog button ' + text + ' in ' + (dialog()?.textContent || 'no dialog')); else b.click(); await wait(20); };
const RW = () => document.getElementById('restwin');
const rows = () => [...RW().querySelectorAll('.lu-group li')].map(li => li.textContent.replace(/\s+/g, ' ').trim());
const row = label => [...RW().querySelectorAll('.lu-group li')].find(li => li.querySelector('b')?.textContent.startsWith(label));
const R = () => window.resources;
const left = l => R().slotsLeft(l);
const resRow = name => [...pick().querySelectorAll('.res')].find(r => r.querySelector('.rname b').textContent === name);
async function openSpell(name) {
  tab('spell'); btnIn(pick(), '‹')?.click();
  const s = pick().querySelector('.search'); s.value = name; s.dispatchEvent(new Event('input', { bubbles: true }));
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith(name)).click();
  await wait(10);
}
const castBtn = () => [...pick().querySelectorAll('button.go')][0];

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '') => { const f = form.createTextField(name); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: 16 }); };
  add('CharacterName', 20, 750, 140, 'Rest Test'); add('ClassLevel', 180, 750, 140, 'Wizard 5'); add('ProfBonus', 340, 750, 30, '+3');
  add('STR', 20, 720, 30, '10'); add('STRmod', 60, 720, 30, '+0'); add('Athletics', 100, 720, 30, '+0');
  add('CON', 20, 700, 30, '14'); add('CONmod', 60, 700, 30, '+2'); add('INT', 20, 680, 30, '16'); add('INTmod', 60, 680, 30, '+3');
  add('HPMax', 20, 640, 30, '27'); add('HPCurrent', 60, 640, 30, '10'); add('HPTemp', 100, 640, 30, ''); add('HD', 140, 640, 60, '5d6');
  add('SlotsTotal 19', 20, 560, 30, '4'); add('SlotsTotal 20', 60, 560, 30, '3'); add('SlotsTotal 21', 100, 560, 30, '2');
  add('Spells 1014', 300, 500, 150, 'Magic Missile'); add('Spells 1015', 300, 480, 150, 'Fireball'); add('Spells 1016', 300, 460, 150, 'Fly');
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'rest.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  ok(!document.getElementById('download').classList.contains('unsaved'), 'just opened: no unsaved-changes dot');

  // ---- spell slots: the totals come from the sheet's boxes
  ok(left(1) === 4 && left(2) === 3 && left(3) === 2, 'slots read from the sheet: 4 / 3 / 2');
  tab('spell');
  ok(pick().querySelectorAll('.slotstrip .ss').length === 3 && pick().querySelectorAll('.slotstrip .pip.on').length === 9, 'the Spell tab shows a slots strip (9 slots)');
  await openSpell('Magic Missile');
  ok(/Level 1 slots: 4 of 4 left/.test(pick().textContent), 'the card says how many level 1 slots are left');
  castBtn().click(); await wait(20);
  ok(!dialog() && /Use a level 1 slot \(4 left\)/.test(last().querySelector('.slot-line')?.textContent || ''), 'cast: no question, the log offers "Use a level 1 slot (4 left)"');
  btnIn(last().querySelector('.slot-line'), 'Use a level 1 slot').click(); await wait(10);
  ok(left(1) === 3 && window.sheetState.slotsUsed?.[1] === 1 && /Used a level 1 slot · 3 left/.test(last().querySelector('.slot-line').textContent), 'Use: 3 left (kept in the PDF state)');
  btnIn(last().querySelector('.slot-line'), 'Undo').click(); await wait(10);
  ok(left(1) === 4 && !window.sheetState.slotsUsed, 'its Undo gives the slot back');
  btnIn(last().querySelector('.slot-line'), 'Use a level 1 slot').click(); await wait(10);
  ok(left(1) === 3, 'used again');
  forced = [3, 4, 5]; btnIn(last(), '↻ Again').click(); await wait(20);
  ok(!last().querySelector('.slot-line'), '"Again" in the log is a reroll: no slot line');

  await openSpell('Fireball');
  for (let i = 0; i < 2; i++) { castBtn().click(); await wait(20); btnIn(last().querySelector('.slot-line'), 'Use a level 3 slot').click(); await wait(10); }
  ok(left(3) === 0 && /Level 3 slots: 0 of 2 left/.test(pick().textContent), 'two Fireballs: no level 3 slots left');
  ok([...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === '3').classList.contains('none'), 'the level 3 slot button is marked empty');
  const n0 = entries().length;
  castBtn().click(); await wait(20);
  ok(/No level 3 slots left/.test(dialog()?.textContent || '') && /All 2 of your level 3 slots are used/.test(dialog().textContent), 'a third Fireball asks first: no slots left, cast anyway?');
  await answer('Cancel');
  ok(entries().length === n0, 'Cancel: nothing cast');
  castBtn().click(); await wait(20); await answer('Cast anyway');
  ok(entries().length === n0 + 1 && /No level 3 slot left: cast anyway/.test(last().querySelector('.slot-line').textContent), 'Cast anyway: cast, the log says without a slot');
  [...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === '4').click(); await wait(10);
  castBtn().click(); await wait(20);
  ok(/Your sheet shows no level 4 spell slots/.test(dialog()?.textContent || ''), 'upcasting to level 4 (none on the sheet) asks too');
  await answer('Cancel');

  // ---- the Rest tab: pips
  tab('rest');
  ok(resRow('Level 1') && resRow('Level 1').querySelectorAll('.pip.on').length === 3, 'Rest tab: level 1 shows 3 of 4');
  resRow('Level 1').querySelector('.pip.on').click(); await wait(10);
  ok(left(1) === 2 && resRow('Level 1').querySelector('.rleft').textContent === '2/4', 'clicking a full pip uses a slot: 2/4');
  resRow('Level 1').querySelector('.pip:not(.on)').click(); await wait(10);
  ok(left(1) === 3, 'clicking an empty pip gives it back: 3/4');
  ok(resRow('Arcane Recovery')?.querySelector('.rleft').textContent === '1/1' && resRow('d6')?.querySelector('.rleft').textContent === '5/5',
    'class features: Arcane Recovery 1/1; Hit Point Dice d6 5/5');

  // ---- Short Rest: roll a Hit Point Die, Arcane Recovery
  btnIn(pick(), 'Short Rest').click(); await wait(20);
  ok(RW() && /Short Rest/.test(RW().querySelector('.lu-title').textContent), 'the Short Rest window opens');
  forced = [4]; btnIn(RW(), 'Roll a d6').click(); await wait(10);
  ok(/\+6 HP: Current HP 10 → 16 of 27/.test(RW().textContent), 'a d6 roll of 4 + CON 2 = 6: HP 10 → 16');
  ok(row('Current HP') && /10 → 16/.test(row('Current HP').textContent) && /0 → 1/.test(row('Hit Point Dice spent').textContent), 'rows: Current HP 10 → 16, Hit Point Dice spent 0 → 1');
  const ar = row('Arcane Recovery');
  ok(ar && !ar.querySelector('input').checked && /level 3/.test(ar.textContent), 'Arcane Recovery offered (a level 3 slot), unticked: ' + ar?.textContent.trim());
  ar.querySelector('input').click();
  ok(val('HPCurrent') === '10' && left(3) === 0, 'nothing written before Apply');
  btnIn(RW(), 'Apply Short Rest').click(); await wait(20);
  ok(val('HPCurrent') === '16' && left(3) === 1 && R().list().find(r => r.id === 'arcaneRecovery').left === 0 && R().hitDice().spent === 1,
    'applied: HP 16, one level 3 slot back, Arcane Recovery used, 1 Hit Point Die spent');
  ok(/Short Rest done/.test(RW().textContent) && RW().querySelectorAll('.lu-state.ok').length === 3, 'the window stays as a note with 3 ticks');
  btnIn(RW(), 'Close').click();

  // ---- Undo / Redo of the whole rest
  window.sheet.undo(); await wait(10);
  ok(val('HPCurrent') === '10' && left(3) === 0 && R().list().find(r => r.id === 'arcaneRecovery').left === 1 && R().hitDice().spent === 0,
    'Undo takes the whole Short Rest back');
  ok(/Undone: Short Rest/.test(document.getElementById('status').textContent), 'status: ' + document.getElementById('status').textContent);
  window.sheet.redo(); await wait(10);
  ok(val('HPCurrent') === '16' && left(3) === 1 && R().hitDice().spent === 1, 'Redo puts it back');

  // ---- Long Rest from the header button
  window.sheetState.effects = [{ name: 'Exhaustion', level: 2 }]; window.effects.changed();
  window.effects.concentrate('Fly', 3);
  document.getElementById('rest').click(); await wait(20);
  await answer('Long Rest');
  ok(/16 → 27/.test(row('Current HP')?.textContent || '') && /1 → 0/.test(row('Hit Point Dice spent')?.textContent || ''), 'Long Rest: HP 16 → 27, Hit Point Dice all back');
  ok(/level 1 ×1 used, level 3 ×1 used/.test(row('Spell slots')?.textContent || ''), 'Long Rest: spell slots all back: ' + row('Spell slots')?.textContent.trim());
  ok(/0\/1 → 1\/1/.test(row('Arcane Recovery')?.textContent || ''), 'Long Rest: Arcane Recovery back');
  ok(/level 2 → level 1/.test(row('Exhaustion')?.textContent || ''), 'Long Rest: Exhaustion 2 → 1');
  ok(row('End concentration on Fly')?.querySelector('input').checked, 'Long Rest: ending concentration on Fly (10 minutes) is ticked');
  btnIn(RW(), 'Apply Long Rest').click(); await wait(20);
  ok(val('HPCurrent') === '27' && left(1) === 4 && left(3) === 2 && R().hitDice().spent === 0 && !window.sheetState.used, 'applied: full HP, all slots, all Hit Point Dice, Arcane Recovery');
  ok(window.sheetState.effects[0].level === 1 && !window.effects.concentration(), 'Exhaustion 1, concentration ended');
  btnIn(RW(), 'Close').click();
  window.sheet.undo(); await wait(10);
  ok(window.sheetState.effects[0].level === 2 && window.effects.concentration()?.name === 'Fly' && val('HPCurrent') === '16', 'Undo: Exhaustion 2, Fly and HP 16 are back');
  window.sheet.redo(); await wait(10);

  // a change in the effects tray after a rest is its own step: undoing it leaves the rest alone
  window.sheetState.effects.push({ name: 'Poisoned' }); window.effects.changed();
  window.sheet.undo(); await wait(10);
  ok(!window.sheetState.effects.some(e => e.name === 'Poisoned') && val('HPCurrent') === '27', 'Undo after adding Poisoned removes Poisoned only (the Long Rest stays)');

  // ---- Undo groups a stat change with the boxes that follow it
  type('STR', '16');
  ok(val('STRmod') === '+3' && val('Athletics') === '+3', 'STR 16: modifier and Athletics follow');
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true, cancelable: true })); await wait(10);
  ok(val('STR') === '10' && val('STRmod') === '+0' && val('Athletics') === '+0', 'Ctrl+Z: STR, its modifier and Athletics back in one step');
  ok(/Undone: STR \(and 2 boxes that followed\)/.test(document.getElementById('status').textContent), 'status: ' + document.getElementById('status').textContent);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'y', ctrlKey: true, bubbles: true, cancelable: true })); await wait(10);
  ok(val('STR') === '16' && val('STRmod') === '+3' && val('Athletics') === '+3', 'Ctrl+Y: back to 16');
  ok(!document.getElementById('undo').disabled && document.getElementById('redo').disabled, 'header buttons: Undo on, Redo off');

  // ---- a Fighter / Wizard: class features with Short Rest recovery
  type('ClassLevel', 'Fighter 5 / Wizard 5');
  tab('rest');
  ok(resRow('Second Wind')?.querySelector('.rleft').textContent === '3/3' && resRow('Action Surge')?.querySelector('.rleft').textContent === '1/1',
    'Fighter 5: Second Wind 3/3, Action Surge 1/1');
  ok(resRow('d10') && resRow('d6'), 'two kinds of Hit Point Dice: d10 and d6');
  resRow('Action Surge').querySelector('.pip.on').click(); await wait(10);
  resRow('Second Wind').querySelector('.pip.on').click(); await wait(10);
  resRow('Second Wind').querySelector('.pip.on').click(); await wait(10);
  ok(resRow('Second Wind').querySelector('.rleft').textContent === '1/3', 'two Second Winds used: 1/3');
  window.resources.openRest('short'); await wait(20);
  ok(/0\/1 → 1\/1/.test(row('Action Surge')?.textContent || '') && /1\/3 → 2\/3/.test(row('Second Wind')?.textContent || ''),
    'Short Rest: Action Surge all back, Second Wind one back');
  ok(btnIn(RW(), 'Roll a d10') && btnIn(RW(), 'Roll a d6'), 'roll buttons for both kinds of die');
  forced = [1]; btnIn(RW(), 'Roll a d10').click(); await wait(10);
  ok(/1 \+2 = 3/.test(RW().querySelector('.rest-chip').textContent.replace(/\s+/g, ' ')), 'a d10 roll of 1 + 2 = 3');
  btnIn(RW(), 'Cancel').click(); await wait(20); await answer('Cancel the rest');
  ok(!RW() && resRow('Second Wind').querySelector('.rleft').textContent === '1/3', 'Cancel: nothing changed');

  // ---- unsaved-changes dot
  ok(document.getElementById('download').classList.contains('unsaved'), 'after changes: the Download button has the unsaved dot');
  lastBlob = null; document.getElementById('download').click();
  for (let i = 0; i < 100 && !lastBlob; i++) await wait(50);
  ok(lastBlob && !document.getElementById('download').classList.contains('unsaved'), 'after downloading: no dot');

  // ---- the classic sheet: its "Slots Expended" boxes (named SlotsRemaining 19-27) are read and written
  const doc2 = await PDFLib.PDFDocument.create(), page2 = doc2.addPage([612, 792]), form2 = doc2.getForm();
  const add2 = (name, x, y, w, v = '') => { const f = form2.createTextField(name); if (v) f.setText(v); f.addToPage(page2, { x, y, width: w, height: 16 }); };
  add2('ClassLevel', 20, 750, 140, 'Cleric 5'); add2('HPMax', 20, 700, 30, '38'); add2('HPCurrent', 60, 700, 30, '38');
  add2('SlotsTotal 19', 20, 600, 30, '4'); add2('SlotsRemaining 19', 60, 600, 30, '1');
  add2('SlotsTotal 20', 120, 600, 30, '3'); add2('SlotsRemaining 20', 160, 600, 30, '');
  add2('SlotsTotal 21', 220, 600, 30, '2'); add2('SlotsRemaining 21', 260, 600, 30, '2');
  add2('Spells 1014', 20, 560, 150, 'Bless');
  add2('HDTotal', 20, 660, 40, '5d8'); add2('HD', 70, 660, 40, '5d8'); // the classic sheet: Total above the Hit Dice box
  add2('Wpn Name', 200, 520, 100, 'Quarterstaf'); add2('Wpn1 AtkBonus', 310, 520, 40, '+1'); add2('Wpn1 Damage', 360, 520, 100, '1d6/8 -1');
  const dt2 = new DataTransfer(); dt2.items.add(new File([await doc2.save()], 'classic.pdf', { type: 'application/pdf' }));
  loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt2, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  ok(left(1) === 3 && left(2) === 3 && left(3) === 0, 'Slots Expended read from the sheet: 1 of 4, 0 of 3, 2 of 2 used');
  type('SlotsRemaining 20', '2');
  ok(left(2) === 1, 'typing 2 into the level 2 box: 1 left');
  tab('spell'); btnIn(pick(), '‹')?.click();
  { const q = pick().querySelector('.search'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); }
  ok(pick().querySelectorAll('.slotstrip .pip.on').length === 3 + 1 + 0, 'the slots strip follows what is typed on the sheet: ' + pick().querySelectorAll('.slotstrip .pip.on').length);
  R().useSlot(1);
  ok(val('SlotsRemaining 19') === '2' && !window.sheetState.slotsUsed, 'using a slot writes 2 into the level 1 box (nothing kept elsewhere)');
  // the classic Hit Dice box holds the dice left
  ok(R().hitDice().spent === 0, 'Hit Dice 5d8 of Total 5d8: none spent');
  type('HD', '3d8');
  ok(R().hitDice().spent === 2 && R().hitDice().dice[0].left === 3, 'typing 3d8 in the Hit Dice box: 3 left, 2 spent');
  window.resources.openRest('short'); await wait(20);
  forced = [5]; btnIn(RW(), 'Roll a d8').click(); await wait(10);
  ok(/2 left/.test(btnIn(RW(), 'Roll a d8').textContent), 'the roll button counts down from the box: 2 left');
  btnIn(RW(), 'Apply Short Rest').click(); await wait(20);
  ok(val('HD') === '2d8' && !window.sheetState.hitDiceSpent, 'Short Rest writes 2d8 into the Hit Dice box');
  btnIn(RW(), 'Close').click();
  window.resources.openRest('long'); await wait(20);
  btnIn(RW(), 'Apply Long Rest').click(); await wait(20);
  ok(['19', '20', '21'].every(n => val('SlotsRemaining ' + n) === ''), 'Long Rest empties the Slots Expended boxes');
  ok(val('HD') === '5d8', 'Long Rest: Hit Dice box back to 5d8');
  // a versatile weapon written "1d6/8 -1": the /8 is the two-handed die, not +8
  tab('attack'); btnIn(pick(), '‹')?.click();
  ok(/^\+1 · 1d6-1/.test(pick().querySelector('.item .imeta')?.textContent || ''), 'damage "1d6/8 -1" rolls as 1d6-1: ' + pick().querySelector('.item .imeta')?.textContent);
  btnIn(RW(), 'Close').click();
  window.sheet.undo();
  ok(val('SlotsRemaining 19') === '2' && val('SlotsRemaining 21') === '2', 'Undo puts the numbers back');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
