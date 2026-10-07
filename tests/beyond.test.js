// Beyond the rules (beyond.js + script.js featureClaims / findFeats): things a character can't have yet are ignored until
// the player says the DM allowed them; kept ones get "[DM allowed]" on the sheet and a line in the roll log. Also the
// draggable windows opening at the top.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).value;
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
let lastBlob = null;
const realURL = URL.createObjectURL;
URL.createObjectURL = b => { lastBlob = b; return realURL(b); };
HTMLAnchorElement.prototype.click = function () {};
const dialog = () => document.querySelector('.ask');
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const items = () => [...dialog().querySelectorAll('.beyond-q li')];
const item = name => items().find(li => li.querySelector('b').textContent === name);
const ids = () => (character.beyond || []).map(b => b.id).sort();
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const pick = () => document.getElementById('rollPick');
const btn = (text, root = pick()) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const last = () => document.querySelector('#rollLog .roll');
const attackWith = name => { tab('attack'); pick().querySelector('.back')?.click();
  [...pick().querySelectorAll('.item')].find(x => x.querySelector('.iname').textContent === name).click(); };
// typing into a sheet box: focus, type, (leave it)
const typeIn = (n, v, leave = true) => { const el = inp(n); el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); if (leave) el.blur(); };

async function loadSheet(build) {
  const doc = await PDFLib.PDFDocument.create(), form = doc.getForm(), page = doc.addPage([612, 792]);
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  build(add);
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 't.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  if (!loaded) throw new Error('sheet did not load');
}

(async () => { try {
  document.body.prepend(pre);
  // ---- a Fighter 1 (Dragonborn) whose sheet claims things from later levels and other classes
  await loadSheet(add => {
    add('CharacterName', 20, 750, 150, 'Arxen'); add('ClassLevel', 200, 750, 140, 'Fighter 1'); add('Race ', 360, 750, 120, 'Dragonborn');
    add('STR', 20, 700, 30, '+3'); add('STRmod', 60, 700, 30, '16'); add('ProfBonus', 100, 700, 30, '+2');
    add('Wpn Name', 20, 600, 120, 'Greatsword'); add('Wpn1 AtkBonus', 150, 600, 40, '+5'); add('Wpn1 Damage', 200, 600, 120, '2d6+3 slashing');
    add('Features and Traits', 20, 40, 280, ['Second Wind (Fighter 1): Bonus Action heal.', 'Archery (Fighting Style, Fighter 1): +2 ranged.',
      'Indomitable (Fighter 9): reroll a failed save.', 'Sneak Attack: 1d6 extra damage.', 'Extra Attack: attack twice.', 'Expertise: Athletics',
      'Psionic Power (Fighter 3): psi dice.', 'Draconic Flight: wings.'].join('\n'), true, 300);
    add('Feat+Traits', 320, 40, 260, 'Great Weapon Master: +PB damage with Heavy weapons\nAlert', true, 200);
  });
  ok(!character.feats.includes('Great Weapon Master') && character.feats.includes('Alert') && character.feats.includes('Archery'),
    'a level 4 feat on a level 1 sheet does nothing; Alert (Origin) and Archery (Fighter 1 has Fighting Style) count: ' + character.feats.join(', '));
  ok(JSON.stringify(ids()) === JSON.stringify(['feat:Great Weapon Master', 'feature:draconicflight', 'feature:extraattack', 'feature:indomitable',
    'feature:psionicpower', 'feature:sneakattack']), 'out of reach: GWM, Indomitable (Fighter 9), Extra Attack (Fighter 5), Sneak Attack (Rogue), "(Fighter 3)", Draconic Flight (level 5): ' + ids().join(', '));
  const why = id => character.beyond.find(b => b.id === id)?.why || '';
  ok(/level 4 and up; the sheet says level 1/.test(why('feat:Great Weapon Master')) && /^Fighter level 9; the sheet says Fighter 1/.test(why('feature:indomitable'))
    && /^a Rogue feature; no Rogue levels/.test(why('feature:sneakattack')) && /^written as Fighter 3/.test(why('feature:psionicpower'))
    && /Dragonborn trait from level 5/.test(why('feature:draconicflight')), 'each says why');
  ok(!ids().includes('feature:expertise') && !ids().includes('feature:secondwind'), 'Expertise (other things give it too) and Second Wind (Fighter 1) are fine');

  await wait(400);
  ok(/Did your DM allow these\?/.test(dialog()?.textContent || '') && items().length === 6, 'after opening: one question lists all 6');
  ok(/Arxen \(Fighter 1\) can't have these yet/.test(dialog().textContent) && /\[DM allowed\]/.test(dialog().textContent), 'it says who, and what keeping does');
  ok(btnIn(dialog(), 'Ignore all').classList.contains('primary'), '"Ignore all" is the default button');
  item('Great Weapon Master').querySelector('input').checked = true;
  item('Indomitable').querySelector('input').checked = true;
  btnIn(dialog(), 'Keep the ticked ones').click(); await wait(20);
  ok(/^Great Weapon Master \[DM allowed\]: \+PB/.test(val('Feat+Traits')) && /\nIndomitable \[DM allowed\] \(Fighter 9\): reroll/.test(val('Features and Traits')),
    'kept: "[DM allowed]" written right after each name');
  ok(character.feats.includes('Great Weapon Master') && character.beyond.filter(b => b.kept).length === 2, 'Great Weapon Master counts now (kept)');
  ok(JSON.stringify([...window.sheetState.beyondIgnored].sort()) === JSON.stringify(['feature:draconicflight', 'feature:extraattack', 'feature:psionicpower', 'feature:sneakattack']),
    'the unticked ones are remembered as ignored (in the PDF state)');
  await wait(400);
  ok(!dialog(), 'nothing more is asked');

  attackWith('Greatsword');
  ok(!!btn('Great Weapon Master +2'), 'the attack card offers Great Weapon Master');
  forced = [12, 3, 4]; btn('Attack').click(); await wait(20);
  const note = last().querySelector('.note.beyond')?.textContent || '';
  ok(/Beyond the rules, marked "DM allowed" on the sheet: Great Weapon Master \(a feat for level 4 and up/.test(note), 'the roll log says the attack used it: ' + note);
  attackWith('Unarmed Strike');
  forced = [12, 3]; btn('Attack').click(); await wait(20);
  ok(!last().querySelector('.note.beyond'), 'an attack that does not use it: no such line');

  window.sheet.undo(); await wait(400);
  ok(!/\[DM allowed\]/.test(val('Feat+Traits') + val('Features and Traits')) && !window.sheetState.beyondIgnored, 'Undo takes the marks and the ignored list back');
  ok(!dialog() && !character.feats.includes('Great Weapon Master'), 'and does not ask again right away; GWM does nothing again');
  window.sheet.redo(); await wait(400);
  ok(/Great Weapon Master \[DM allowed\]/.test(val('Feat+Traits')) && character.feats.includes('Great Weapon Master') && !dialog(), 'Redo brings it all back');

  // ---- typing a new one: asked once you leave the box
  typeIn('Feat+Traits', val('Feat+Traits') + '\nSentinel', false); await wait(400);
  ok(!dialog(), 'not asked while typing in the box');
  inp('Feat+Traits').blur(); await wait(400);
  ok(/Sentinel: did your DM allow it\?/.test(dialog()?.textContent || '') && !dialog().querySelector('input'), 'leaving the box: asked about Sentinel (one, no tick boxes)');
  btnIn(dialog(), 'Ignore it').click(); await wait(400);
  ok(window.sheetState.beyondIgnored.includes('feat:Sentinel') && !character.feats.includes('Sentinel') && !/Sentinel \[/.test(val('Feat+Traits')) && !dialog(),
    'Ignore it: stays on the sheet as written, does nothing, not asked again');
  typeIn('Feat+Traits', val('Feat+Traits') + '\nMage Slayer'); await wait(400);
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); await wait(20);
  typeIn('CharacterName', 'Arxen the Bold'); await wait(400);
  ok(!dialog() && !character.feats.includes('Mage Slayer') && !window.sheetState.beyondIgnored.includes('feat:Mage Slayer'), 'closed with Escape: ignored for now, not asked again this time');

  // ---- the downloaded PDF keeps the marks and the ignored list
  lastBlob = null; document.getElementById('download').click();
  for (let i = 0; i < 3e5 && !lastBlob; i++) await yieldTask();
  const pdf = await PDFLib.PDFDocument.load(await lastBlob.arrayBuffer());
  ok(/Great Weapon Master \[DM allowed\]/.test(pdf.getForm().getTextField('Feat+Traits').getText()) &&
    /Indomitable \[DM allowed\]/.test(pdf.getForm().getTextField('Features and Traits').getText()), 'the PDF shows "[DM allowed]" in the boxes');

  // ---- reaching the level makes it fine
  typeIn('ClassLevel', 'Fighter 9'); await wait(400);
  ok(JSON.stringify(ids()) === JSON.stringify(['feature:sneakattack']) && !dialog(), 'Fighter 9: only Sneak Attack is still out of reach (and ignored)');

  // ---- Fighting Style feats need the feature: a Paladin gets it at level 2
  await loadSheet(add => {
    add('CharacterName', 20, 750, 150, 'Sera'); add('ClassLevel', 200, 750, 140, 'Paladin 1');
    add('Feat+Traits', 320, 40, 260, 'Dueling (Fighting Style)', true, 200);
  });
  ok(ids().includes('feat:Dueling') && /Fighting Style feature/.test(character.beyond[0].why) && !character.feats.includes('Dueling'), 'Paladin 1 with Dueling: out of reach');
  await wait(400);
  ok(/Dueling: did your DM allow it\?/.test(dialog()?.textContent || ''), 'asked about it on opening');
  btnIn(dialog(), 'Keep it').click(); await wait(20);
  ok(/^Dueling \[DM allowed\] \(Fighting Style\)/.test(val('Feat+Traits')) && character.feats.includes('Dueling'), 'kept: marked, counts');
  typeIn('ClassLevel', 'Paladin 2'); await wait(400);
  ok(!ids().length && character.feats.includes('Dueling'), 'Paladin 2: fine by the rules');

  // ---- no class or level on the sheet: nothing is checked
  await loadSheet(add => { add('CharacterName', 20, 750, 150, 'Nobody'); add('ClassLevel', 200, 750, 140, ''); add('Feat+Traits', 320, 40, 260, 'Great Weapon Master\nIndomitable', true, 200); });
  await wait(400);
  ok(!ids().length && character.feats.includes('Great Weapon Master') && !dialog(), 'unknown class and level: not checked, not asked');

  // ---- the draggable windows open at the top, so their buttons are on screen
  typeIn('ClassLevel', 'Fighter 3'); await wait(400);
  ok(/Did your DM allow these\?/.test(dialog()?.textContent || '') && items().length === 2, 'a class written in later: asked about GWM and Indomitable now');
  btnIn(dialog(), 'Ignore all').click(); await wait(400);
  document.getElementById('levelUp').click(); await wait(20);
  btnIn(dialog(), 'Level up').click(); await wait(20);
  const W = document.getElementById('lvlup');
  ok(W.offsetTop === 12 && W.offsetTop + W.offsetHeight <= innerHeight - 12, `the Level up window opens at the top (${W.offsetTop}px) and fits (${W.offsetHeight} of ${innerHeight})`);
  ok(Math.abs(W.offsetLeft - (innerWidth - W.offsetWidth) / 2) <= 1, 'centred');
  W.querySelector('.lu-x').click(); await wait(20);
  btnIn(dialog(), 'Throw away')?.click(); await wait(20);
  window.resources.openRest('long'); await wait(20);
  ok(document.getElementById('restwin').offsetTop === 12, 'the Rest window too');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
