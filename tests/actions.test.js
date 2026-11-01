// Spending a feature's uses from the roller's Rest tab (rest.js ACTIONS): Flurry of Blows and the other Monk buttons, the
// turn tracker, states in the Effects tray, rolls and HP buttons in the log, Undo, "use anyway", Stunning Strike and a
// rider's Superiority Die after an attack, Second Wind, Action Surge, Indomitable, Rage, Lay On Hands, Font of Magic,
// Metamagic, Divine Spark, Turn Undead, Hunter's Mark
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
const first = () => entries()[0];
const dialog = () => document.querySelector('.ask');
const answer = async text => { const b = btnIn(dialog(), text); if (!b) log('FAIL no dialog button ' + text + ' in ' + (dialog()?.textContent || 'no dialog')); else b.click(); await wait(20); };
const T = () => window.turn.now();
const bar = () => document.getElementById('turnbar');
const res = id => window.resources.list().find(r => r.id === id);
const act = name => [...pick().querySelectorAll('.ract')].find(b => b.firstChild.textContent === name);
const use = async name => { tab('rest'); const b = act(name); if (!b) log('FAIL no button ' + name); else b.click(); await wait(20); };
const lineOf = e => [...e.querySelectorAll('.slot-line')].map(p => p.textContent).join(' | ');
const dmgTotal = (e, i = 0) => +e.querySelectorAll('.dsum .total')[i]?.dataset.count;
const states = () => [...tray().querySelectorAll('.fx.feature b')].map(b => b.textContent);
const get = n => inp(n).value;

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('ClassLevel', 20, 750, 140, 'Monk 10'); add('AC', 180, 750, 30, '16'); add('Speed', 220, 750, 30, '40');
  add('STR', 20, 720, 30, '10'); add('STRmod', 60, 720, 30, '+0'); add('ST Strength', 100, 720, 30, '+4');
  add('DEX', 20, 700, 30, '16'); add('DEXmod', 60, 700, 30, '+3'); add('ST Dexterity', 100, 700, 30, '+7');
  add('CON', 20, 680, 30, '14'); add('CONmod', 60, 680, 30, '+2'); add('ProfBonus', 20, 650, 30, '+4');
  add('WIS', 140, 680, 30, '16'); add('WISmod', 180, 680, 30, '+3'); add('ST Wisdom', 220, 680, 30, '+3');
  add('CHA', 140, 660, 30, '16'); add('CHAmod', 180, 660, 30, '+3');
  add('HPMax', 20, 620, 30, '70'); add('HPCurrent', 60, 620, 30, '50'); add('HPTemp', 100, 620, 30, '');
  add('Wpn Name', 200, 600, 120, 'Longsword'); add('Wpn1 AtkBonus', 330, 600, 40, '+6'); add('Wpn1 Damage', 380, 600, 120, '1d8+3 slashing');
  add('Features and Traits', 20, 100, 250, '', true, 200);
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 't.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  await wait(20);

  // ---- Monk 10: the Focus Points buttons ---------------------------------------------------------------------------
  tab('rest');
  ok(JSON.stringify(window.resources.actions('focus')) === JSON.stringify(['Flurry of Blows', 'Patient Defense', 'Step of the Wind', 'Stunning Strike', 'Deflect Attacks', 'Redirect']),
    'Monk 10: Focus Points buttons ' + window.resources.actions('focus').join(', '));
  ok(act('Flurry of Blows')?.querySelector('small')?.textContent === '1' && act('Deflect Attacks')?.querySelector('small')?.textContent === 'free',
    'buttons show their cost (1, free)');
  ok(window.resources.actions('uncannyMetabolism').join() === 'Uncanny Metabolism', 'Uncanny Metabolism has its button');

  await use('Flurry of Blows');
  ok(res('focus').left === 9 && T().attacks === 5 && /Flurry of Blows \+3/.test(bar().querySelector('.tb-attacks .tb-why').textContent),
    'Flurry of Blows (Monk 10): 1 Focus Point, three more attacks this turn (2 + 3)');
  ok(first().querySelector('.rhead b').textContent === 'Flurry of Blows' && /Focus Points −1 · Bonus Action/.test(first().querySelector('.tag').textContent) &&
    /Focus Points: 1 used, 9 of 10 left\. \+3 attacks this turn\./.test(lineOf(first())), 'log entry: cost, time, what it did');
  ok(!btnIn(first(), '↻ Again'), 'no "Again" without dice');
  btnIn(first().querySelector('.slot-line'), 'Undo').click(); await wait(20);
  ok(res('focus').left === 10 && T().attacks === 2 && /\(undone\)/.test(lineOf(first())), 'Undo in the log: the point and the attacks are back');

  await use('Step of the Wind');
  ok(T().dashes === 1 && T().moveTotal === 80 && res('focus').left === 9, 'Step of the Wind: a Dash (80 ft this turn), 1 point');

  forced = [5, 6];
  await use('Patient Defense');
  ok(states().includes('Dodging') && dmgTotal(first()) === 11 && /temporary HP/.test(first().querySelector('.dsum').textContent),
    'Patient Defense: Dodging in the tray; Heightened Focus Temp HP 2d8 = 11');
  const tempBtn = btnIn(first(), 'Set your Temp HP to 11');
  ok(!!tempBtn && get('HPTemp') === '', 'the Temp HP are a button, the sheet is untouched');
  tempBtn.click(); await wait(20);
  ok(get('HPTemp') === '11' && /Temp HP 0 → 11/.test(lineOf(first())), 'clicked: Temp HP box 11');
  tab('save');
  ok(/Adv/.test([...pick().querySelectorAll('.trow')].find(r => /Dexterity/.test(r.textContent))?.querySelector('.fxflag')?.textContent || ''),
    'Dodging: Advantage on DEX saves');
  btnIn(bar(), '↻ New turn').click(); await wait(20);
  ok(!states().includes('Dodging') && T().dashes === 0, 'New turn ends Dodging (it lasts until your next turn)');

  // Stunning Strike from the attack log
  tab('attack');
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Unarmed Strike')).click();
  forced = [12, 4]; btnIn(pick(), 'Attack').click(); await wait(20);
  const stun = btnIn(first(), 'Stunning Strike');
  ok(!!stun && /1 of 8 Focus Points/.test(stun.textContent), 'an Unarmed Strike: "Stunning Strike (1 of 8 Focus Points)"');
  stun.click(); await wait(20);
  ok(res('focus').left === 7 && /DC 15 CON save: Stunned/.test(lineOf(first())), 'spent: 7 left, DC 15 (8 + WIS 3 + PB 4)');
  btnIn(first().querySelector('.slot-line'), 'Undo').click(); await wait(20);
  ok(res('focus').left === 8, 'its Undo gives the point back');
  ok(T().attacksLeft === 1, 'the attack counted in this turn');

  // not enough: asks, "Use anyway" keeps the count
  window.resources.setUsed('focus', 10); await wait(10);
  tab('rest');
  ok(act('Flurry of Blows').classList.contains('short'), 'no points left: the button is dimmed');
  act('Flurry of Blows').click(); await wait(20);
  ok(/Not enough Focus Points/.test(dialog()?.textContent || ''), 'asks first');
  await answer('Use anyway');
  ok(res('focus').left === 0 && T().adds['Flurry of Blows'] === 3 && /used anyway/.test(lineOf(first())), 'used anyway: attacks added, count unchanged');

  // Uncanny Metabolism: all points back and healing
  forced = [4];
  await use('Uncanny Metabolism');
  ok(res('focus').left === 10 && res('uncannyMetabolism').left === 0 && dmgTotal(first()) === 14, 'Uncanny Metabolism: all Focus Points back, heals 1d8 + 10 = 14');
  btnIn(first(), 'Heal yourself').click(); await wait(20);
  ok(get('HPCurrent') === '64', 'Heal yourself: HP 50 → 64');
  window.sheet.undo(); await wait(20);
  window.sheet.undo(); await wait(20);
  ok(get('HPCurrent') === '50' && res('focus').used === 10 && res('uncannyMetabolism').left === 1, 'Ctrl+Z twice (sheet Undo): the healing, then the whole use');
  window.sheet.redo(); window.sheet.redo(); await wait(20);
  ok(get('HPCurrent') === '64' && res('focus').used === 0, 'Ctrl+Y twice: back again');
  btnIn(first().querySelectorAll('.slot-line')[0], 'Undo').click(); await wait(20);
  ok(get('HPCurrent') === '50', "the healing line's Undo puts 50 back");

  // ---- Fighter ------------------------------------------------------------------------------------------------------
  type('ClassLevel', 'Fighter 9'); await wait(20);
  forced = [7];
  await use('Second Wind');
  ok(dmgTotal(first()) === 16 && res('secondWind').used === 1 && /Tactical Shift/.test(first().textContent), 'Second Wind: 1d10 + 9 = 16, Tactical Shift noted');
  btnIn(first(), 'Heal yourself').click(); await wait(20);
  ok(get('HPCurrent') === '66', 'HP 50 → 66');
  await use('Action Surge');
  ok(/Attack \(\+2 attacks\)/.test(dialog()?.textContent || ''), 'Action Surge asks which action');
  await answer('Attack');
  ok(T().adds['Action Surge'] === 2 && first().querySelector('.rhead b').textContent === 'Action Surge: Attack (+2 attacks)', 'Attack: +2 attacks this turn');
  await use('Indomitable');
  await answer('Wisdom');
  forced = [5];
  ok(/Indomitable: Wisdom save/.test(first().querySelector('.rhead b').textContent) && first().querySelector('.test .mod').textContent === '12' &&
    /Indomitable: 1 used/.test(lineOf(first())), 'Indomitable: the save again with +9 (WIS +3, Fighter 9)');
  forced = [];

  // Battle Master: a maneuver, and the Superiority Die rider after an attack
  type('ClassLevel', 'Fighter 9 (Battle Master)'); type('Features and Traits', 'Trip Attack: ...\nRiposte: ...'); await wait(20);
  ok(window.resources.actions('superiority').join() === 'Maneuver', 'Battle Master: Maneuver');
  await use('Maneuver');
  ok(!!btnIn(dialog(), 'Trip Attack') && !btnIn(dialog(), 'Parry'), 'the maneuvers on the sheet are offered');
  forced = [6];
  await answer('Trip Attack');
  ok(dmgTotal(first()) === 6 && /Save DC 15/.test(first().textContent) && res('superiority').used === 1, 'Trip Attack: d10 rolled (6), save DC 8 + 3 + 4');
  tab('attack'); btnIn(pick(), '‹')?.click();
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Longsword')).click(); await wait(10);
  btnIn(pick().querySelector('.chips'), 'Superiority Die').click(); await wait(10);
  btnIn(pick(), 'Attack').click(); await wait(20);
  const sup = btnIn(first(), 'Superiority Die');
  ok(!!sup && /1 of 4 Superiority Dice/.test(sup.textContent), 'the Superiority Die rider offers to spend a die');
  sup.click(); await wait(20);
  ok(res('superiority').used === 2, 'spent');

  // ---- Barbarian: Rage ----------------------------------------------------------------------------------------------
  type('ClassLevel', 'Barbarian 5'); type('STR', '18'); type('STRmod', '+4'); await wait(20);
  window.effects.concentrate('Bless');
  await use('Rage');
  ok(/can't concentrate/.test(dialog()?.textContent || ''), 'Rage while concentrating: asks');
  await answer('Cancel');
  ok(!states().includes('Raging') && res('rage').used === 0, 'Cancel: nothing happens');
  await use('Rage');
  await answer('Rage, end Bless');
  ok(states().includes('Raging') && res('rage').used === 1 && !window.effects.concentration(), 'Rage: Raging in the tray, a use spent, Bless ended');
  tab('attack'); btnIn(pick(), '‹')?.click();
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Longsword')).click(); await wait(10);
  ok(btnIn(pick().querySelector('.chips'), 'Rage +2')?.classList.contains('on'), 'the attack card switches Rage on while Raging');
  tab('check');
  ok(/Adv/.test([...pick().querySelectorAll('.trow')].find(r => /Strength/.test(r.textContent))?.querySelector('.fxflag')?.textContent || ''), 'Advantage on STR checks');
  btnIn(first().querySelector('.slot-line'), 'Undo').click(); await wait(20);
  ok(!states().includes('Raging') && res('rage').used === 0, 'Undo: no longer Raging, the use is back');

  // ---- Paladin: Lay On Hands ----------------------------------------------------------------------------------------
  type('ClassLevel', 'Paladin 5'); await wait(20);
  await use('Lay On Hands');
  const box = dialog()?.querySelector('input');
  ok(box?.value === '4', 'Lay On Hands: the amount starts at the HP you are missing (66 of 70)');
  box.value = '9';
  await answer('Restore');
  ok(res('layOnHands').left === 16 && first().querySelector('.rhead b').textContent === 'Lay On Hands: 9 HP' && !!btnIn(first(), 'Heal yourself: HP 66 → 70'),
    '9 HP: 16 of 25 left, healing yourself is capped at your maximum');

  // ---- Sorcerer: Metamagic, Font of Magic ---------------------------------------------------------------------------
  type('ClassLevel', 'Sorcerer 5'); await wait(20);
  await use('Metamagic');
  ok(dialog()?.querySelectorAll('button').length === 11, 'Metamagic: all ten options when the sheet names none');
  await answer('Quickened Spell');
  ok(res('sorceryPoints').left === 3 && /Bonus Action/.test(first().textContent), 'Quickened Spell: 2 points (3 of 5 left)');
  await use('Slot to points');
  await answer('Level 2');
  ok(res('sorceryPoints').left === 5 && window.resources.slotsLeft(2) === 2, 'level 2 slot to points: 5 of 5, 2 level 2 slots left');
  await use('Create a spell slot');
  await answer('Level 2');
  ok(res('sorceryPoints').left === 2 && window.resources.slotsLeft(2) === 3, 'a level 2 slot for 3 points: the slot is back');
  await use('Create a spell slot');
  await answer('Level 1');
  ok(/None of your level 1 slots are spent/.test(dialog()?.textContent || ''), 'creating a slot above the maximum asks');
  await answer('Cancel');
  await use('Innate Sorcery');
  ok(states().includes('Innate Sorcery'), 'Innate Sorcery in the tray');
  tab('spell');
  const search = pick().querySelector('.search'); search.value = 'Fire Bolt'; search.dispatchEvent(new Event('input', { bubbles: true }));
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Fire Bolt')).click(); await wait(10);
  ok(/Advantage \(Innate Sorcery\)/.test(pick().querySelector('.fxnote')?.textContent || ''), 'Innate Sorcery: spell attacks have Advantage');
  tab('attack'); btnIn(pick(), '‹')?.click();
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Longsword')).click(); await wait(10);
  ok(!/Innate Sorcery/.test(pick().textContent), '... weapon attacks don\'t');

  // ---- Cleric: Divine Spark, Turn Undead ----------------------------------------------------------------------------
  type('ClassLevel', 'Cleric 7'); await wait(20);
  await use('Divine Spark');
  forced = [3, 5];
  await answer('Radiant');
  ok(dmgTotal(first()) === 11 && /DC \d+/.test(first().querySelector('.dc')?.textContent || '') && /half/.test(first().querySelector('.dc').textContent),
    'Divine Spark (Cleric 7): 2d8 + 3 = 11 Radiant, CON save for half');
  forced = [2, 2, 2];
  await use('Turn Undead');
  ok(/Wisdom save/.test(first().querySelector('.dc')?.textContent || '') && dmgTotal(first()) === 6 && /Sear Undead/.test(first().textContent), 'Turn Undead with Sear Undead (3d8)');
  btnIn(first(), '↻ Again').click(); await wait(20);
  ok(res('channelCleric').used === 2, '"Again" rolls again without spending');

  // ---- Ranger: Hunter's Mark without a slot -------------------------------------------------------------------------
  type('ClassLevel', 'Ranger 2'); await wait(20);
  await use("Hunter's Mark");
  ok(window.effects.concentration()?.name === "Hunter's Mark" && res('favoredEnemy').used === 1 && /Concentrating on Hunter's Mark now/.test(lineOf(first())),
    "Favored Enemy: Hunter's Mark, concentrating");
  btnIn(first().querySelector('.slot-line'), 'Undo').click(); await wait(20);
  ok(!window.effects.concentration() && res('favoredEnemy').used === 0, 'Undo: concentration and the use back');
  ok(!document.querySelector('.ask'), 'no question left open');
} catch (e) { log('ERROR ' + e.message + '\n' + e.stack); } })();
