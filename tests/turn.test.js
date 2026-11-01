// The turn bar (movement and attacks left, New turn, the feature buttons: Feline Agility, Cunning Action, Steady Aim,
// Difficult terrain, standing up, Charger, Speedy, Flurry of Blows, Rage's Instinctive Pounce, Adrenaline Rush, Large Form
// ...) and the spells on you in the Effects tray (Haste, Bless, Slow ...)
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new FocusEvent('focusout', { bubbles: true })); };
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const tray = () => document.getElementById('effects');
const pick = () => document.getElementById('rollPick');
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const entries = () => [...document.querySelectorAll('#rollLog .roll')];
const total = e => +e.querySelector('.test .total').dataset.count;
const dialog = () => document.querySelector('.ask');
const answer = async text => { const b = btnIn(dialog(), text); if (!b) log('FAIL no dialog button ' + text + ' in ' + (dialog()?.textContent || 'no dialog')); else b.click(); await wait(20); };
const conc = () => window.effects.concentration()?.name ?? null;
const T = () => window.turn.now();
const bar = () => document.getElementById('turnbar');
const turnText = () => bar().textContent;
const turnBtn = text => btnIn(bar(), text);
const chip = name => [...bar().querySelectorAll('.tb-chip')].find(b => b.textContent.startsWith(name));
const stepBtn = sign => bar().querySelector(`[aria-label="${sign < 0 ? 'Moved 5 feet' : 'Give back 5 feet'}"]`);
const moveWhy = () => bar().querySelector('.tb-move .tb-why')?.textContent || '';
const moreDash = () => bar().querySelector('[aria-label="Dash"]'); // the + next to the Dash count
const res = id => window.resources.list().find(r => r.id === id);
const spellNames = () => [...tray().querySelectorAll('.fx.spell b')].map(b => b.textContent);
const spellItem = name => [...tray().querySelectorAll('.fx.spell')].find(li => li.querySelector('b').textContent.startsWith(name));
const row = (text) => [...pick().querySelectorAll('.trow')].find(r => r.querySelector('.iname').textContent.startsWith(text));
async function addSpell(name, { by, choice, mine } = {}) {
  if (!tray().querySelector('.fx-form')) btnIn(tray(), '+ Add').click();
  btnIn(tray().querySelector('.fx-tabs'), 'Spell on you').click();
  const n = tray().querySelector('[name="name"]'); n.value = name; n.dispatchEvent(new Event('input', { bubbles: true }));
  if (choice) { const s = tray().querySelector('[name="pick"]'); s.value = choice; s.dispatchEvent(new Event('change', { bubbles: true })); }
  if (mine) { const b = tray().querySelector('[name="mine"]'); b.checked = true; b.dispatchEvent(new Event('change', { bubbles: true })); }
  if (by) { const b = tray().querySelector('[name="by"]'); b.value = by; b.dispatchEvent(new Event('input', { bubbles: true })); }
  tray().querySelector('.fx-save').click(); await wait(20);
}
const removeSpell = async name => { spellItem(name).querySelector('.fx-x').click(); await wait(10); };
async function openSpell(name) {
  tab('spell');
  btnIn(pick(), '‹')?.click();
  const search = pick().querySelector('.search'); search.value = name; search.dispatchEvent(new Event('input', { bubbles: true }));
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith(name)).click();
  await wait(10);
}
function openWeapon(name) {
  tab('attack');
  btnIn(pick(), '‹')?.click();
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith(name)).click();
}

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('ClassLevel', 20, 750, 140, 'Fighter 5'); add('AC', 180, 750, 30, '16'); add('Speed', 220, 750, 30, '30'); add('Race', 270, 750, 120, '');
  add('STR', 20, 720, 30, '16'); add('STRmod', 60, 720, 30, '+3'); add('ST Strength', 100, 720, 30, '+6');
  add('DEX', 20, 700, 30, '14'); add('DEXmod', 60, 700, 30, '+2'); add('ST Dexterity', 100, 700, 30, '+2');
  add('Stealth', 140, 700, 30, '+2'); add('Athletics', 180, 700, 30, '+6');
  add('CON', 20, 680, 30, '14'); add('CONmod', 60, 680, 30, '+2'); add('ProfBonus', 20, 650, 30, '+3');
  add('HPMax', 20, 620, 30, '44'); add('HPCurrent', 60, 620, 30, '44');
  add('Wpn Name', 200, 600, 120, 'Longsword'); add('Wpn1 AtkBonus', 330, 600, 40, '+6'); add('Wpn1 Damage', 380, 600, 120, '1d8+3 slashing');
  add('Wpn Name 2', 200, 580, 120, '');
  add('Features and Traits', 20, 100, 250, '', true, 200);
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 't.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  await wait(20);

  // ---- This turn: movement --------------------------------------------------------------
  ok(/Turn/.test(turnText()) && !tray().querySelector('.tb-move, .fx-turn') && T().moveTotal === 30 && T().moveLeft === 30 && bar().querySelector('.tb-num').value === '30',
    'the turn bar (not in the Effects tray): 30 of 30 ft');
  ok(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--turnbar'), 10) === bar().offsetHeight && bar().offsetHeight > 30,
    'the page keeps clear of the bar (--turnbar = its height)');
  turnBtn('−5').click(); turnBtn('−5').click();
  ok(T().moveLeft === 20 && bar().querySelector('.tb-num').value === '20', '−5 twice: 20 ft left');
  const box = bar().querySelector('.tb-num'); box.value = '7'; box.dispatchEvent(new Event('change', { bubbles: true }));
  ok(T().moveLeft === 7, 'typed 7 ft left');
  turnBtn('+5').click();
  ok(T().moveLeft === 12, '+5: 12 ft');
  const count = () => bar().querySelector('.tb-dash'), undash = () => bar().querySelector('[aria-label="Take back a Dash"]');
  ok(count()?.textContent === 'Dash ×0' && count().tagName === 'SPAN' && undash()?.disabled && moreDash()?.classList.contains('on') &&
    moreDash().previousElementSibling === count() && count().previousElementSibling === undash() && !moreDash().nextElementSibling,
    '− | Dash ×0 | +: the − greyed out, the count in the middle (not a button), the + lit');
  const w0 = count().offsetWidth;
  moreDash().click();
  ok(T().moveTotal === 60 && T().moveLeft === 42 && /\/ 60 ft/.test(turnText()) && count().textContent === 'Dash ×1' && count().classList.contains('on') && !undash().disabled,
    '+: a Dash, 42 of 60 ft, "Dash ×1" lit, the − usable');
  moreDash().click();
  ok(T().moveTotal === 90 && count().textContent === 'Dash ×2', '+ again: ×2, 90 ft');
  for (let i = 0; i < 10; i++) moreDash().click();
  ok(count().textContent === 'Dash ×12' && count().offsetWidth === w0, 'the count keeps its width (×0 ... ×12): ' + w0 + ' / ' + count().offsetWidth);
  for (let i = 0; i < 10; i++) undash().click();
  undash().click();
  ok(T().moveTotal === 60 && T().dashes === 1 && count().textContent === 'Dash ×1', '− takes a Dash back: 60 ft');
  undash().click();
  ok(T().moveTotal === 30 && T().moveLeft === 12 && undash()?.disabled && !count().classList.contains('on') && count().textContent === 'Dash ×0',
    'take back the last one: 30 ft, 12 left, ×0, the − greyed out');
  moreDash().click(); moreDash().click();
  for (let i = 0; i < 25; i++) turnBtn('−5').click();
  ok(T().moveLeft === 0 && turnBtn('−5').disabled, 'never below 0 ft; −5 greyed out');

  // ---- This turn: attacks (Fighter 5: Extra Attack) --------------------------------------
  ok(T().perAction === 2 && T().attacks === 2 && bar().querySelectorAll('.tb-pip.on').length === 2 && /2 per Attack action/.test(turnText()),
    'Fighter 5: 2 attacks, two gold pips');
  openWeapon('Longsword');
  const n0 = entries().length;
  btnIn(pick(), 'Attack').click(); await wait(10);
  ok(T().attacksLeft === 1 && /1 of 2/.test(turnText()), 'an attack rolled in the roller uses one: 1 of 2');
  btnIn(entries()[0], '↻ Again').click(); await wait(10);
  btnIn(pick(), 'Damage only').click(); await wait(10);
  ok(T().attacksLeft === 1, '"Again" and "Damage only" don\'t count');
  btnIn(pick(), 'Attack').click(); btnIn(pick(), 'Attack').click(); await wait(10);
  ok(T().attacksLeft === 0 && !bar().querySelector('.tb-pip.on') && entries().length === n0 + 5, 'past the last attack: 0 left, the roll still happens');
  bar().querySelector('.tb-pip').click();
  ok(T().attacksLeft === 1, 'clicking an empty pip gives one back');
  bar().querySelector('.tb-pip.on').click();
  ok(T().attacksLeft === 0, 'clicking a gold one uses it');
  turnBtn('+1').click();
  ok(T().attacks === 3 && T().attacksLeft === 1 && /\+1 added/.test(turnText()), '+1: one more attack this turn');
  turnBtn('−1').click();
  ok(T().attacks === 2 && T().attacksLeft === 0 && !/added/.test(turnText()) && !turnBtn('−1'), '−1 takes the added attack back');
  turnBtn('↻ New turn').click();
  ok(T().moveLeft === 30 && T().moveTotal === 30 && T().dashes === 0 && T().attacks === 2 && T().attacksLeft === 2, 'New turn: 30 ft and 2 attacks again');

  // other classes: Thirsting Blade, a Valor Bard; no Speed box
  type('ClassLevel', 'Warlock 5'); await wait(10);
  ok(T().perAction === 1, 'Warlock 5: 1 attack');
  type('Features and Traits', 'Pact of the Blade\nThirsting Blade'); await wait(10);
  ok(T().perAction === 2, 'Warlock 5 with Thirsting Blade on the sheet: 2');
  type('Features and Traits', ''); type('ClassLevel', 'Bard 6 (College of Valor)'); await wait(10);
  ok(T().perAction === 2, 'Bard 6 (College of Valor): Extra Attack from the subclass');
  type('ClassLevel', 'Fighter 5'); type('Speed', ''); await wait(10);
  ok(T().moveTotal === null && /No Speed on the sheet/.test(turnText()), 'no Speed on the sheet: said so');
  type('Speed', '30'); await wait(10);
  if (dialog()) await answer('Ignore');

  // ---- Spells on you ---------------------------------------------------------------------
  await addSpell('Haste', { by: 'Mira' });
  ok(spellNames().join() === 'Haste' && /Spells on you/.test(tray().textContent), 'Haste is listed under "Spells on you"');
  ok(/From Mira · Concentration, up to 1 minute/.test(spellItem('Haste').textContent), 'who cast it and how long: ' + spellItem('Haste').querySelector('.fx-meta')?.textContent);
  ok(T().moveTotal === 60 && T().attacks === 3 && /Haste \+1/.test(turnText()), 'Haste: 60 ft, 3 attacks (Haste +1)');
  ok(/Speed\s*30 ft\s*→\s*60 ft/.test(tray().textContent) && /AC\s*16\s*→\s*18/.test(tray().textContent), 'the tray: Speed 30 → 60 ft, AC 16 → 18');
  ok(conc() === null, "someone else's Haste: you aren't concentrating");
  tab('save');
  ok(/Adv/.test(row('Dexterity').querySelector('.fxflag')?.textContent || ''), 'Save tab: DEX shows Adv');
  forced = [3, 15]; row('Dexterity').querySelector('.tmain').click(); await wait(10);
  ok(/Advantage \(Haste\)/.test(entries()[0].textContent) && total(entries()[0]) === 17, 'DEX save with Advantage (Haste): 15 + 2 = 17');
  await addSpell('Longstrider');
  ok(T().speed === 80, 'Longstrider and Haste: (30 + 10) × 2 = 80 ft');
  await addSpell('Slow');
  ok(T().speed === 40 && T().attacks === 1 && /Slow: only 1/.test(turnText()), 'Slow too: halved to 40 ft, only 1 attack');
  ok(!/AC\s*16\s*→/.test(tray().textContent), 'Haste +2 and Slow −2: no AC line');
  await addSpell('Freedom of Movement');
  ok(T().speed === 80, "Freedom of Movement: Slow can't lower the Speed");
  for (const n of ['Freedom', 'Slow', 'Longstrider', 'Haste']) await removeSpell(n);
  ok(!tray().querySelector('.fx.spell') && T().speed === 30 && T().attacks === 2, '× takes them off: 30 ft, 2 attacks');
  ok(!('spellsOn' in window.sheetState), 'no empty list left in the saved state');

  // the same spell twice: the new casting replaces the old one
  await addSpell('Haste', { by: 'Mira' }); await addSpell('haste', { by: 'Orin' });
  ok(spellNames().join() === 'Haste' && /From Orin/.test(spellItem('Haste').textContent), 'Haste from Orin replaces Mira\'s');
  window.sheet.undo(); await wait(10);
  ok(/From Mira/.test(spellItem('Haste')?.textContent || ''), 'Undo: Mira\'s Haste again');
  window.sheet.undo(); await wait(10);
  ok(!spellItem('Haste'), 'Undo again: no Haste');
  window.sheet.redo(); await wait(10);
  ok(/From Mira/.test(spellItem('Haste')?.textContent || ''), 'Redo brings it back');
  await removeSpell('Haste');

  // Bless and Bane: dice on attack rolls and saves; the roller's own Bless chip goes while Bless is on you
  await addSpell('Bless', { by: 'Brother Tam' });
  openWeapon('Longsword');
  ok(!btnIn(pick(), 'Bless') && /\+1d4 \(Bless\)/.test(pick().querySelector('.fxnote')?.textContent || ''), 'Longsword card: no Bless chip, "+1d4 (Bless)" instead');
  forced = [10, 3]; btnIn(pick(), 'Attack').click(); await wait(10);
  ok(total(entries()[0]) === 19 && /Bless/.test(entries()[0].querySelector('.test').textContent), 'attack: 10 + 6 + 3 (Bless) = 19');
  await addSpell('Bane');
  tab('save');
  ok(!btnIn(pick(), 'Bless') && /\+1d4 −1d4/.test(row('Dexterity').querySelector('.fxflag')?.textContent || ''), 'Save tab: no Bless chip; DEX shows +1d4 −1d4');
  forced = [10, 3, 2]; row('Dexterity').querySelector('.tmain').click(); await wait(10);
  ok(total(entries()[0]) === 13 && /−/.test(entries()[0].querySelector('.test').textContent), 'DEX save: 10 + 2 + 3 (Bless) − 2 (Bane) = 13');
  await removeSpell('Bane'); await removeSpell('Bless');
  ok(btnIn(pick(), 'Bless +1d4'), 'Bless gone: the chip is back');

  // a choice: Guidance on one skill
  await addSpell('Guidance', { choice: 'Stealth' });
  ok(spellNames().join() === 'Guidance (Stealth)', 'Guidance (Stealth)');
  tab('check');
  ok(!btnIn(pick(), 'Guidance') && /\+1d4/.test(row('Stealth').querySelector('.fxflag')?.textContent || '') && !row('Athletics').querySelector('.fxflag'),
    'Check tab: no Guidance chip; +1d4 on Stealth only');
  forced = [10, 4]; row('Stealth').querySelector('.tmain').click(); await wait(10);
  ok(total(entries()[0]) === 16, 'Stealth: 10 + 2 + 4 = 16');
  await removeSpell('Guidance');

  // Reduce: 1d4 less weapon damage, Disadvantage on STR checks
  await addSpell('Enlarge/Reduce', { choice: 'Reduce' });
  openWeapon('Longsword');
  ok(/1d8\+3 slashing − 1d4 slashing/.test(pick().textContent), 'Reduce: Longsword damage 1d8+3 − 1d4');
  forced = [10, 6, 3]; btnIn(pick(), 'Attack').click(); await wait(10);
  ok(+entries()[0].querySelector('.dsum .total').dataset.count === 6, 'damage 6 + 3 − 3 = 6');
  tab('check');
  ok(/Dis/.test(row('Athletics').querySelector('.fxflag')?.textContent || ''), 'STR (Athletics) check: Dis');
  await removeSpell('Enlarge');

  // Hold Person while you concentrate: asks first (Paralyzed is Incapacitated)
  window.effects.concentrate('Bless', 1);
  await addSpell('Hold Person');
  ok(/Hold Person makes you Incapacitated, which ends concentration/.test(dialog()?.textContent || ''), 'Hold Person while concentrating asks first');
  await answer('Add Hold Person, keep Bless');
  ok(spellNames().includes('Hold Person') && T().speed === 0 && conc() === 'Bless', 'kept: Paralyzed, Speed 0, still concentrating');
  tab('save');
  ok(/Fails/.test(row('Strength').querySelector('.fxflag')?.textContent || ''), 'STR save fails automatically');
  await removeSpell('Hold Person');
  window.effects.concentrate(null);

  // reminders: a spell without automatic effects, and a name outside the data
  await addSpell('Water Walk');
  ok(spellItem('Water Walk').classList.contains('plain') && /No automatic effect/.test(spellItem('Water Walk').textContent), 'Water Walk: a reminder (violet star)');
  await addSpell('Homebrew Ward', { by: 'the DM' });
  ok(/From the DM/.test(spellItem('Homebrew Ward').textContent), 'a name outside the data, from the DM');
  await removeSpell('Water Walk'); await removeSpell('Homebrew Ward');

  // the Effect tab sends a concentration spell typed there to "Spell on you"
  btnIn(tray(), '+ Add').click();
  btnIn(tray().querySelector('.fx-tabs'), 'Effect or condition').click();
  const nm = tray().querySelector('[name="name"]'); nm.value = 'Haste'; nm.dispatchEvent(new Event('input', { bubbles: true }));
  btnIn(tray(), 'Someone else cast it on you?').click();
  ok(tray().querySelector('.fx-tabs .on')?.textContent === 'Spell on you' && tray().querySelector('[name="name"]').value === 'Haste', '"Someone else cast it on you?" switches tabs, keeps the name');
  btnIn(tray(), 'Close').click();

  // you cast it on yourself: it lasts while you concentrate
  await addSpell('Bless', { mine: true });
  ok(conc() === 'Bless' && /Cast by you, while you concentrate/.test(spellItem('Bless').textContent), '"I cast it on myself": concentrating on Bless, Bless on you');
  window.effects.concentrate('Haste', 3);
  ok(!spellItem('Bless'), 'concentrating on something else: your Bless is gone');
  window.effects.concentrate(null);
  await openSpell('Haste');
  btnIn(pick(), 'Cast').click(); await wait(20);
  if (dialog()) await answer('Cast anyway'); // a Fighter has no spell slots
  ok(conc() === 'Haste', 'cast Haste from the roller: concentrating');
  btnIn(entries()[0].querySelector('.self-line'), "It's on me too").click(); await wait(10);
  ok(/Cast by you/.test(spellItem('Haste')?.textContent || '') && T().attacks === 3 && /is on you now/.test(entries()[0].textContent), '"It\'s on me too": Haste on you, 3 attacks');
  tray().querySelector('.fx.conc .fx-x').click(); await wait(10);
  ok(!spellItem('Haste') && T().attacks === 2, 'ending concentration ends Haste on you');
  await openSpell('Enhance Ability');
  btnIn(pick(), 'Cast').click(); await wait(20);
  if (dialog()) await answer('Cast anyway');
  btnIn(entries()[0].querySelector('.self-line'), "It's on me too").click(); await wait(10);
  ok(tray().querySelector('[name="pick"]') && tray().querySelector('[name="name"]').value === 'Enhance Ability' && tray().querySelector('[name="mine"]').checked,
    'a spell with a choice: the tray form opens filled in');
  const sel = tray().querySelector('[name="pick"]'); sel.value = 'DEX'; sel.dispatchEvent(new Event('change', { bubbles: true }));
  tray().querySelector('.fx-save').click(); await wait(20);
  ok(spellNames().join() === 'Enhance Ability (Dexterity)' && conc() === 'Enhance Ability', 'Enhance Ability (Dexterity) on you');
  window.effects.concentrate(null);

  // ---- Feature buttons on the turn bar ---------------------------------------------------
  turnBtn('↻ New turn').click();
  ok(!chip('Feline') && !chip('Cunning') && !!chip('Action Surge') && !!chip('Difficult terrain'), 'Fighter 5: Action Surge and Difficult terrain, no Rogue or Tabaxi buttons');
  chip('Action Surge').click(); await wait(20);
  await answer('Attack');
  ok(T().attacks === 4 && chip('Action Surge').classList.contains('on') && res('actionSurge').used === 1, 'Action Surge from the bar: the Rest tab button (asks, +2 attacks, a use spent)');
  chip('Action Surge').click(); await wait(20);
  ok(T().attacks === 2 && res('actionSurge').used === 0 && /\(undone\)/.test(entries()[0].textContent), 'pressed again: taken back with the log\'s Undo');

  // a Tabaxi Rogue: Feline Agility, Cunning Action, Steady Aim
  type('Race', 'Tabaxi'); type('ClassLevel', 'Rogue 5'); await wait(10);
  ok(!!chip('Feline Agility') && !!chip('Cunning Action') && !!chip('Steady Aim') && !chip('Action Surge'), 'Tabaxi Rogue 5: Feline Agility, Cunning Action, Steady Aim');
  chip('Feline Agility').click(); await wait(10);
  ok(T().speed === 60 && T().moveTotal === 60 && chip('Feline Agility').classList.contains('on') && /Feline Agility ×2/.test(moveWhy()), 'Feline Agility: Speed 30 → 60 this turn');
  chip('Cunning Action').click(); await wait(10);
  ok(T().moveTotal === 120 && /Dash ×1 \(Cunning Action\)/.test(moveWhy()), 'Cunning Action: a Dash of the doubled Speed (120 ft)');
  ok(count().textContent === 'Dash ×1' && count().classList.contains('on') && undash().disabled && /press its button/.test(undash().title),
    "the count has the feature's Dash too; the − leaves it to Cunning Action's own button");
  chip('Cunning Action').click(); await wait(10);
  ok(T().moveTotal === 60, 'pressed again: no Dash');
  stepBtn(-1).click();
  turnBtn('↻ New turn').click();
  ok(T().speed === 30 && chip('Feline Agility').classList.contains('spent'), 'next turn: 30 ft again; Feline Agility is used (dimmed)');
  chip('Feline Agility').click(); await wait(10);
  ok(/comes back after one of your turns in which you move 0 ft/.test(dialog()?.textContent || ''), 'using it again asks');
  await answer('Cancel');
  ok(T().speed === 30, 'Cancel: still 30 ft');
  turnBtn('↻ New turn').click(); // a turn without moving
  ok(!chip('Feline Agility').classList.contains('spent'), 'after a turn without moving it is back');

  chip('Steady Aim').click(); await wait(10);
  ok(T().moveTotal === 0 && window.effects.hasState('Steady Aim'), 'Steady Aim: Speed 0, and "Steady Aim" in the Effects tray');
  openWeapon('Longsword');
  ok(/Advantage \(Steady Aim\)/.test(pick().querySelector('.fxnote')?.textContent || ''), 'the attack card: Advantage (Steady Aim)');
  forced = [5, 15, 4]; btnIn(pick(), 'Attack').click(); await wait(10);
  ok(/Advantage \(Steady Aim\)/.test(entries()[0].textContent) && /^5\s*15/.test(entries()[0].querySelector('.test').textContent) && !window.effects.hasState('Steady Aim') && T().moveTotal === 0,
    'the attack had Advantage (5, 15) and used it up; the Speed stays 0 this turn');
  btnIn(entries()[0], '↻ Again').click(); await wait(10);
  ok(!window.effects.hasState('Steady Aim') && T().attacksLeft === 0, '"Again" changes nothing');
  turnBtn('↻ New turn').click();
  stepBtn(-1).click();
  chip('Steady Aim').click(); await wait(10);
  ok(/needs you not to have moved/.test(dialog()?.textContent || ''), 'after moving: asks first');
  await answer('Cancel');

  // Difficult terrain, crawling, standing up
  turnBtn('↻ New turn').click();
  chip('Difficult terrain').click(); await wait(10);
  ok(stepBtn(-1).textContent === '−10', 'Difficult terrain: 5 ft costs 10');
  stepBtn(-1).click();
  ok(T().moveLeft === 20, '30 − 10 = 20 ft left');
  window.effects.setState('Prone', true); await wait(10);
  ok(stepBtn(-1).textContent === '−15' && !!chip('Stand up −15') && /crawling/.test(moveWhy()), 'Prone in Difficult terrain: crawling costs 15; "Stand up −15"');
  chip('Stand up').click(); await wait(10);
  ok(T().moveLeft === 5 && !window.effects.hasState('Prone') && stepBtn(-1).textContent === '−10', 'stood up: half the Speed (15 ft), no longer Prone');
  chip('Stand up') && log('FAIL the Stand up button stayed');

  // Charger: +10 ft per Dash; Speedy: no Difficult terrain cost after a Dash
  type('Features and Traits', 'Charger\nSpeedy'); await wait(10);
  if (dialog()) await answer('Ignore');
  turnBtn('↻ New turn').click();
  ok(T().speed === 30 && stepBtn(-1).textContent === '−5' && !chip('Difficult terrain').classList.contains('on'), 'New turn: Difficult terrain is off again');
  chip('Difficult terrain').click(); moreDash().click(); await wait(10);
  ok(T().moveTotal === 70 && stepBtn(-1).textContent === '−5' && /Charger \+10 ft each/.test(moveWhy()), 'Charger: Dash adds 40 ft (70); Speedy: Difficult terrain costs nothing extra after a Dash');
  type('Features and Traits', ''); await wait(10);

  // two Light weapons: one more attack
  turnBtn('↻ New turn').click();
  ok(!chip('Light weapon'), 'a Longsword alone: no Light weapon button');
  type('Wpn Name', 'Dagger'); type('Wpn Name 2', 'Shortsword'); await wait(10);
  chip('Light weapon').click(); await wait(10);
  ok(T().attacks === 2 && /Light weapon \+1/.test(turnText()), 'Dagger and Shortsword: "Light weapon" adds an attack');
  type('Wpn Name', 'Longsword'); type('Wpn Name 2', ''); await wait(10);

  // Gloom Stalker: Ambusher's Leap
  type('Race', ''); type('ClassLevel', 'Ranger 3 (Gloom Stalker)'); await wait(10);
  turnBtn('↻ New turn').click();
  chip("Ambusher's Leap").click(); await wait(10);
  ok(T().speed === 40 && /Ambusher's Leap \+10 ft/.test(moveWhy()), "Ambusher's Leap: 40 ft on the first turn");
  turnBtn('↻ New turn').click();
  ok(T().speed === 30, '... and 30 ft after it');

  // a Monk: Martial Arts; Flurry of Blows spends a Focus Point, pressed again it is taken back
  type('ClassLevel', 'Monk 5'); await wait(10);
  chip('Martial Arts').click(); await wait(10);
  ok(T().attacks === 3 && chip('Martial Arts').classList.contains('on'), 'Monk 5: Martial Arts, one more attack (2 + 1)');
  chip('Martial Arts').click(); await wait(10);
  ok(chip('Flurry of Blows')?.querySelector('small')?.textContent === '5', 'Flurry of Blows shows the Focus Points left (5)');
  chip('Flurry of Blows').click(); await wait(20);
  ok(T().attacks === 4 && res('focus').used === 1 && chip('Flurry of Blows').classList.contains('on'), 'Flurry of Blows: +2 attacks, a Focus Point');
  chip('Flurry of Blows').click(); await wait(20);
  ok(T().attacks === 2 && res('focus').used === 0, 'pressed again: the point and the attacks are back');
  chip('Step of the Wind').click(); await wait(20);
  ok(T().moveTotal === 60 && chip('Step of the Wind').classList.contains('on'), 'Step of the Wind from the bar: a Dash');
  turnBtn('↻ New turn').click();
  ok(T().moveTotal === 30 && !chip('Step of the Wind').classList.contains('on') && res('focus').used === 1, 'New turn: the Dash is gone, the point stays spent');
  window.resources.setUsed('focus', 0);

  // Instinctive Pounce (Barbarian 7): Rage adds half your Speed
  type('ClassLevel', 'Barbarian 7'); await wait(10);
  await window.resources.use('rage', 'Rage'); await wait(20);
  ok(T().feet['Instinctive Pounce'] === 15 && T().moveTotal === 45 && /Instinctive Pounce: you can move 15 ft more/.test(entries()[0].textContent),
    'Rage at Barbarian 7: Instinctive Pounce +15 ft (45)');
  btnIn(entries()[0].querySelector('.slot-line'), 'Undo').click(); await wait(20);
  ok(T().moveTotal === 30 && !window.effects.hasState('Raging'), 'its Undo: 30 ft, not Raging');

  // species: an Orc's Adrenaline Rush, a Goliath's Large Form
  type('ClassLevel', 'Fighter 5'); type('Race', 'Orc'); await wait(10);
  chip('Adrenaline Rush').click(); await wait(20);
  ok(T().moveTotal === 60 && res('sp:Adrenaline Rush').used === 1 && /Temporary HP: 3\./.test(entries()[0].textContent), 'Orc: Adrenaline Rush = a Dash and 3 Temp HP');
  chip('Adrenaline Rush').click(); await wait(20);
  ok(T().moveTotal === 30 && res('sp:Adrenaline Rush').used === 0, 'pressed again: taken back');
  type('Race', 'Goliath'); await wait(10);
  chip('Large Form').click(); await wait(20);
  ok(T().speed === 40 && window.effects.hasState('Large Form') && res('sp:Large Form').used === 1, 'Goliath 5: Large Form, Speed +10 ft');
  chip('Large Form').click(); await wait(20);
  ok(T().speed === 30 && !window.effects.hasState('Large Form') && res('sp:Large Form').used === 1, 'pressed again: it ends (the use stays spent)');
  type('Race', ''); await wait(10);

  // Expeditious Retreat: a Bonus Action Dash while you concentrate on it
  ok(!chip('Expeditious Retreat'), 'no Expeditious Retreat button without the spell');
  window.effects.concentrate('Expeditious Retreat'); await wait(10);
  chip('Expeditious Retreat').click(); await wait(10);
  ok(T().moveTotal === 60, 'concentrating on Expeditious Retreat: its Dash');
  window.effects.concentrate(null);

  // folded: only the counters
  turnBtn('↻ New turn').click();
  bar().querySelector('.tb-fold').click(); await wait(10);
  ok(bar().classList.contains('folded') && getComputedStyle(chip('Action Surge')).display === 'none' && getComputedStyle(bar().querySelector('.tb-dash')).display !== 'none',
    'folded: the feature buttons are hidden, Dash and the counters stay');
  bar().querySelector('.tb-fold').click(); await wait(10);

  ok(!document.querySelector('.ask'), 'no question left open');
} catch (e) { log('ERROR ' + e.message + '\n' + e.stack); } })();
