// The real official 2024 sheet (tests/official-2024-sheet.pdf, blank): read through its field map in sheets.js, then a
// Wizard 4 -> 5 level-up writes into its own boxes and spell table.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).type === 'checkbox' ? inp(n).checked : inp(n).value;
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const expect = (label, want) => {
  const bad = Object.entries(want).filter(([n, v]) => v instanceof RegExp ? !v.test(val(n)) : val(n) !== v)
    .map(([n, v]) => `${n}=${JSON.stringify(val(n))} (want ${v instanceof RegExp ? v : JSON.stringify(v)})`);
  log((bad.length ? 'FAIL ' : 'PASS ') + label + (bad.length ? ': ' + bad.join(', ') : ''));
};
// Headless virtual time races ahead while the browser does real work, so wait with messages, not timers
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const W = () => document.getElementById('lvlup');
const btnIn = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const pickSpell = (pickId, name) => [...W().querySelectorAll(`[data-pick="${pickId}"] .lu-spell`)].find(x => x.querySelector('b').textContent === name).click();

(async () => { try {
  document.body.prepend(pre);
  const bytes = await new Promise((res, rej) => {
    const x = new XMLHttpRequest(); x.open('GET', '../official-2024-sheet.pdf'); x.responseType = 'arraybuffer';
    x.onload = () => res(x.response); x.onerror = () => rej(new Error('could not read the PDF')); x.send();
  });
  const dt = new DataTransfer(); dt.items.add(new File([bytes], 'official.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 2e7 && !loaded; i++) await yieldTask();
  ok(loaded, 'the official sheet loads');
  ok(/^D&D 2024 character sheet:/.test(document.getElementById('status').textContent), 'recognised: ' + document.getElementById('status').textContent.slice(0, 70));
  ok(sheet.field('hpMax') === 'Text16' && sheet.field('skill:Stealth') === 'Text90' && sheet.profBox('skill:Stealth') === 'Check Box36',
    'stats, skills and proficiency boxes come from the field map');
  ok(sheet.spellLines().length === 30 && sheet.spellLines()[0].row?.level === 'Text105.0', '30 spell table rows');

  // a Wizard 4
  type('Text1', 'Mira'); type('Text7', 'Wizard'); type('Text11', '4');
  type('Text64', '8'); type('Text66', '14'); type('Text67', '14'); type('Text63', '16'); type('Text65', '12'); type('Text68', '10');
  type('Text19', '+2'); type('Text16', '22'); type('Text14', '22'); type('Text17', '4d6'); type('Text112', '4'); type('Text113', '3');
  type('Text106.0', 'Magic Missile');
  ok(character.classes[0]?.key === 'wizard' && character.level === 4 && character.mods.INT === 3 && val('Text20') === '+3',
    'typed in: Wizard 4, INT 16 (+3 written to its modifier box)');
  ok(character.weapons.length === 0 && weaponsOk(), 'weapon rows map to the six attack lines');

  document.getElementById('levelUp').click(); await wait(20);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(20);
  [...W().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith('Spells')).click();
  pickSpell('prepared', 'Fireball'); pickSpell('prepared', 'Counterspell');
  pickSpell('book', 'Fly'); pickSpell('book', 'Fireball');
  [...W().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith('Review')).click();
  W().querySelector('.lu-apply').click(); await wait(20);
  expect('Wizard 5 applied to the official sheet', { 'Text11': '5', 'Text7': 'Wizard', 'Text16': '28', 'Text14': '28', 'Text17': '5d6', 'Text19': '+3',
    'Text114': '2', 'Text112': '4', 'Text113': '3',
    'Text106.0': 'Magic Missile', 'Text106.1': 'Fireball', 'Text105.1': '3', 'Text107.1': 'Action', 'Text109.1': '150 ft', 'Check Box252.1': false,
    'Text106.2': 'Counterspell', 'Text107.2': 'Reaction', 'Text106.3': 'Fly', 'Check Box252.3': true, 'Check Box254.0.3': true,
    'Text54': /^Memorize Spell \(Wizard 5\): / });
  btnIn(W(), 'Close').click();

  // spell slots tick the sheet's own "expended" boxes
  document.querySelector('#rollActions [data-tab="spell"]').click();
  [...document.querySelectorAll('#rollPick .item')].find(b => b.textContent.startsWith('Fireball')).click();
  btnIn(document.getElementById('rollPick'), 'Cast & roll').click(); await wait(20);
  btnIn(document.querySelector('#rollLog .slot-line'), 'Use a level 3 slot').click(); await wait(10);
  expect('a level 3 slot used: its first expended box is ticked', { 'Check Box234': true, 'Check Box235': false });
  ok(resources.slotsLeft(3) === 1, 'one level 3 slot left');
  // a Short Rest writes the spent Hit Point Dice into the sheet's box
  resources.openRest('short'); await wait(20);
  btnIn(document.getElementById('restwin'), 'Roll a d6').click(); await wait(10);
  btnIn(document.getElementById('restwin'), 'Apply Short Rest').click(); await wait(20);
  expect('Short Rest: 1 Hit Point Die spent, in its box', { 'Text18': '1', 'Text14': '28' });
  btnIn(document.getElementById('restwin'), 'Close').click();
  resources.openRest('long'); await wait(20);
  btnIn(document.getElementById('restwin'), 'Apply Long Rest').click(); await wait(20);
  expect('Long Rest: the slot box is cleared, no Hit Point Dice spent', { 'Check Box234': false, 'Text18': '0' });
  btnIn(document.getElementById('restwin'), 'Close').click();
  // Undo takes back the rests, the slot and the whole level up, one step at a time
  for (let i = 0; i < 4; i++) sheet.undo();
  expect('four Undos: back to Wizard 4 before the level up', { 'Text11': '4', 'Text16': '22', 'Text17': '4d6', 'Text19': '+2', 'Text106.1': '', 'Check Box234': false, 'Text18': '' });
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
function weaponsOk() { return DND.sheets[0].weapons.every(r => inp(r[0])); }
