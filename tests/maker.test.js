// The sheet maker: "...or create a new sheet" -> a new character on the classic sheet (level 1) and on the official 2024
// sheet (level 3: level 1, then two level-ups)
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const until = async (cond, n = 3e6) => { for (let i = 0; i < n && !cond(); i++) await yieldTask(); return cond(); };
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n)?.type === 'checkbox' ? inp(n).checked : inp(n)?.value;
const expect = (label, want) => {
  const bad = Object.entries(want).filter(([n, v]) => v instanceof RegExp ? !v.test(val(n)) : val(n) !== v)
    .map(([n, v]) => `${n}=${JSON.stringify(val(n))} (want ${v instanceof RegExp ? v : JSON.stringify(v)})`);
  log((bad.length ? 'FAIL ' : 'PASS ') + label + (bad.length ? ': ' + bad.join(', ') : ''));
};
const MK = () => document.getElementById('maker'), LU = () => document.getElementById('lvlup');
const btnIn = (root, t) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(t));
const cardIn = (root, t) => [...root.querySelectorAll('.lu-card, .mk-sheet')].find(b => b.querySelector('b')?.textContent.startsWith(t));
const optIn = (root, t) => [...root.querySelectorAll('.lu-opt')].find(b => b.querySelector('b')?.textContent === t);
const step = name => [...MK().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const luStep = name => [...LU().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const choose = (sel, value) => { sel.value = value; sel.dispatchEvent(new Event('change', { bubbles: true })); };
const pickSpell = (pickId, name) => [...LU().querySelectorAll(`[data-pick="${pickId}"] .lu-spell`)].find(x => x.querySelector('b').textContent === name).click();
const feat = name => [...LU().querySelectorAll('.lu-feat')].find(s => s.querySelector('.lu-fh b')?.textContent === name);

(async () => { try {
  document.body.prepend(pre);
  ok(document.getElementById('newSheet') && /create a new sheet/.test(document.getElementById('newSheet').textContent), 'the button under the drop area');
  document.getElementById('newSheet').click();
  ok(MK() && /New character/.test(MK().querySelector('.lu-title').textContent), 'it opens the New character window');
  ok(cardIn(MK(), 'Classic sheet') && cardIn(MK(), 'Official 2024 sheet'), 'step 1 offers the classic and the official 2024 sheet');
  await until(() => MK().querySelectorAll('.mk-thumb img').length === 2, 2e5);
  ok(MK().querySelectorAll('.mk-thumb img').length === 2, 'with a picture of each');

  // ---- an Elf Cleric on the classic sheet
  cardIn(MK(), 'Classic sheet').click();
  step('Class'); cardIn(MK(), 'Cleric').click();
  step('Background'); cardIn(MK(), 'Sage').click();
  step('Species'); cardIn(MK(), 'Elf').click();
  optIn(MK(), 'High Elf').click();
  ok(/Spellcasting ability/.test(MK().textContent), 'Elf: the lineage and its spellcasting ability');
  ok([...MK().querySelectorAll('.chip.on')].some(c => c.textContent === 'WIS'), "it starts on the Cleric's own ability, WIS");
  [...MK().querySelectorAll('.chip')].find(c => c.textContent === 'INT').click();
  step('Abilities');
  const row = ab => [...MK().querySelectorAll('.mk-abs tr')].find(r => r.querySelector('td b')?.textContent === ab);
  ok(row('Wisdom').querySelector('.mk-total').textContent === '17' && row('Constitution').querySelector('.mk-total').textContent === '14',
    'standard array placed for a Cleric, Sage +2 WIS / +1 CON: WIS 17, CON 14');
  choose(row('Strength').querySelector('select'), '3'); // 12 to STR: the 14 goes where the 12 was (CHA)
  ok(row('Strength').querySelector('.mk-total').textContent === '12' && row('Charisma').querySelector('.mk-total').textContent === '14', 'picking a value swaps it: STR 12, CHA 14');
  step('Equipment');
  ok(/Option A/.test(MK().textContent) && /Chain Shirt, Shield, Mace, Holy Symbol, Priest's Pack, and 7 GP/.test(MK().textContent), 'class option A listed');
  const nums = () => [...MK().querySelectorAll('.num b')].map(b => b.textContent);
  ok(nums()[0] === '14' && nums()[1] === '15 GP' && /Mace, Quarterstaff/.test(nums()[2]), 'AC 14 (Chain Shirt 13 −1 DEX... capped, + Shield), 15 GP, attack lines Mace, Quarterstaff: ' + nums().join(' | '));
  step('Details');
  const field = label => [...MK().querySelectorAll('.mk-field')].find(l => l.firstChild.textContent === label).querySelector('input, select, textarea');
  const typeIn = (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
  typeIn(field('Character name'), 'Arxen Two'); typeIn(field('Player name'), 'Kris'); choose(field('Alignment'), 'Neutral Good');
  const langs = MK().querySelectorAll('.lu-pick select'); choose(langs[0], 'Elvish'); choose(langs[1], 'Draconic');
  typeIn(field('Age'), '2'); typeIn(field('Ideals'), 'Knowledge');
  step('Review');
  ok(!MK().querySelector('.mk-bad') && /Arxen Two/.test(MK().textContent) && !btnIn(MK(), 'Create sheet').disabled, 'review: nothing missing, Create sheet on');
  btnIn(MK(), 'Create sheet').click();
  ok(await until(() => LU()), 'Create sheet: the sheet opens and the Level 1 window follows');
  ok(document.querySelectorAll('#pages .page').length === 3 && !MK(), 'the classic sheet (3 pages) is open, the maker closed');
  expect('written to the classic sheet', { 'CharacterName': 'Arxen Two', 'CharacterName 2': 'Arxen Two', 'PlayerName': 'Kris', 'Background': 'Sage',
    'Race ': 'Elf (High Elf)', 'Alignment': 'Neutral Good', 'XP': '0', 'STRmod': '12', 'STR': '+1', 'WISmod': '17', 'WIS': '+3', 'CHamod': '14', 'CHA': '+2',
    'ST Wisdom': '+3', 'Arcana': '+2', 'History ': '+2', 'Insight': '+3', 'AC': '14', 'Speed': '30 ft', 'GP': '15', 'Age': '2', 'Ideals': 'Knowledge',
    'Equipment': /^Chain Shirt\nShield\nMace\nHoly Symbol\nPriest's Pack \(Backpack, Blanket/, 'ProficienciesLang': /Languages: Common, Elvish, Draconic\nTools: Calligrapher's Supplies \(Sage\)/,
    'Wpn Name': 'Mace', 'Wpn1 AtkBonus': '+3', 'Wpn1 Damage': '1d6+1 bludgeoning', 'Wpn Name 2': 'Quarterstaff', 'Wpn2 AtkBonus ': '+3' });
  ok(character.str === 12 && character.mods.STR === 1, 'the app reads the score from the oval and the modifier from the big box');

  // ---- level 1 in the Level up window
  ok(LU().querySelector('.lu-title b').textContent === 'Level 1' && ![...LU().querySelectorAll('.lu-steps button')].some(b => b.textContent.endsWith('Class')), 'Level 1: no Class step (picked in the maker)');
  ok(/highest number, 8/.test(LU().textContent) && /= 10 HP/.test(LU().textContent), 'Hit Points: 8 + CON 2 = 10');
  luStep('Features');
  const prof = feat('Cleric proficiencies');
  ok(prof && /Saving throws: Wisdom and Charisma/.test(prof.textContent), 'a Class proficiencies card with saves, armor, weapons');
  ok(optIn(prof, 'History').disabled, 'History is greyed out: the background gives it');
  optIn(prof, 'Insight').click(); optIn(feat('Cleric proficiencies'), 'Medicine').click();
  cardIn(feat('Divine Order'), 'Thaumaturge').click();
  ok(feat('Origin feat') && feat('Origin feat').querySelector('.lu-card.on b')?.textContent.startsWith('Magic Initiate'), 'the Origin feat card has Magic Initiate (Sage) picked');
  ok(/Wizard list/.test(feat('Origin feat').querySelector('.chip.on')?.textContent || ''), 'with the Wizard list, as the Sage says');
  pickSpell('origin:c', 'Fire Bolt'); pickSpell('origin:c', 'Mage Hand'); pickSpell('origin:1', 'Shield');
  ok(/High Elf, from the Species box/.test(feat('Elven Lineage')?.textContent || '') && feat('Elven Lineage').querySelector('.chip.on')?.textContent === 'INT', 'Elven Lineage: High Elf, INT (from the maker)');
  optIn(feat('Keen Senses'), 'Perception').click();
  luStep('Spells');
  pickSpell('cantrips', 'Guidance'); pickSpell('cantrips', 'Light'); pickSpell('cantrips', 'Sacred Flame'); pickSpell('cantrips', 'Thaumaturgy');
  pickSpell('prepared', 'Bless'); pickSpell('prepared', 'Cure Wounds'); pickSpell('prepared', 'Guiding Bolt'); pickSpell('prepared', 'Healing Word');
  luStep('Review');
  ok(!LU().querySelector('.lu-group.warn'), 'Review: nothing left to choose: ' + (LU().querySelector('.lu-group.warn')?.textContent || ''));
  LU().querySelector('.lu-apply').click(); await wait(20);
  expect('Level 1 applied to the classic sheet', { 'ClassLevel': 'Cleric 1', 'HPMax': '10', 'HPCurrent': '10', 'HDTotal': '1d8', 'HD': '1d8', 'ProfBonus': '+2',
    'ST Wisdom': '+5', 'ST Charisma': '+4', 'Insight': '+5', 'Medicine': '+5', 'Perception ': '+5', 'SlotsTotal 19': '2',
    'Spellcasting Class 2': 'Cleric', 'SpellcastingAbility 2': 'Wisdom', 'SpellSaveDC  2': '13', 'SpellAtkBonus 2': '+5',
    'Feat+Traits': /^Magic Initiate: .*Fire Bolt, Mage Hand.*Shield \(Origin feat, Sage background\)/,
    'Features and Traits': /Divine Order \(Cleric 1\): Thaumaturge[\s\S]*Elven Lineage \(Elf\): High Elf \(spellcasting ability: INT\)/,
    'ProficienciesLang': /(?=[\s\S]*Armor training: Light, Medium, Shields)(?=[\s\S]*Weapons: Simple weapons)/ });
  ok(character.classes[0]?.key === 'cleric' && character.level === 1 && character.spells.some(s => s.spell.name === 'Bless'), 'the app reads a level 1 Cleric with Bless');
  ok(btnIn(LU(), 'Close') && !btnIn(LU(), 'Level 2'), 'starting level 1: just Close');
  btnIn(LU(), 'Close').click();

  // ---- a Human Monk on the official 2024 sheet, starting at level 3
  window.maker.open();
  cardIn(MK(), 'Official 2024 sheet').click();
  step('Class'); cardIn(MK(), 'Monk').click(); btnIn(MK().querySelector('.mk-level'), '+').click(); btnIn(MK().querySelector('.mk-level'), '+').click();
  ok(MK().querySelector('.mk-level b').textContent === '3' && /Level up opens for each level up to 3/.test(MK().textContent), 'starting level 3');
  step('Background'); cardIn(MK(), 'Artisan').click();
  ok(cardIn(MK(), 'Artisan').querySelector('.lu-src')?.textContent === 'PHB', 'a Player\'s Handbook background');
  choose(MK().querySelector('.lu-pick select'), "Smith's Tools");
  step('Species'); cardIn(MK(), 'Human').click();
  btnIn(MK().querySelector('.lu-pick:last-child'), 'Small').click();
  step('Abilities'); btnIn(MK(), 'Point buy').click();
  ok(/Points left: 0 of 27/.test(MK().textContent), 'point buy starts from the Monk array (27 points)');
  const r2 = ab => [...MK().querySelectorAll('.mk-abs tr')].find(r => r.querySelector('td b')?.textContent === ab);
  ok(r2('Dexterity').querySelector('button[aria-label="DEX higher"]').disabled, 'DEX 15 is the most point buy allows');
  r2('Wisdom').querySelector('button[aria-label="WIS lower"]').click();
  ok(/Points left: 2 of 27/.test(MK().textContent), 'WIS 14 → 13 gives 2 points back');
  forced = [6, 6, 6, 1, 5, 5, 4, 1, 3, 3, 3, 3, 2, 2, 2, 2, 6, 5, 4, 3, 1, 1, 1, 1];
  btnIn(MK(), 'Roll 4d6').click();
  ok(MK().querySelectorAll('.mk-roll').length === 6 && MK().querySelector('.mk-roll .drop'), 'Roll 4d6: six rolls, the lowest die dropped');
  ok(r2('Dexterity').querySelector('select').selectedOptions[0].textContent === '18', 'the highest roll (18) goes to the Monk\'s DEX');
  btnIn(MK(), 'Standard array').click();
  btnIn(MK().querySelector('.mk-bonus'), 'DEX')?.click(); // Artisan: STR, DEX, INT: +2 DEX
  step('Equipment');
  ok(/Artisan's Tools or Musical Instrument \(you will be proficient with it\)/.test(MK().textContent), 'the Monk package asks which tool or instrument');
  choose([...MK().querySelectorAll('.lu-pick select')].find(s => /Choose one/.test(s.options[0].textContent)), 'Lute');
  btnIn(MK(), 'Add the extra money')?.click();
  ok(!btnIn(MK(), 'Add the extra money') || /Starting at level 3/.test(MK().textContent), 'starting at level 3: the DM-extra note');
  step('Details');
  const f2 = label => [...MK().querySelectorAll('.mk-field')].find(l => l.firstChild.textContent === label)?.querySelector('input, select, textarea');
  ok(!f2('Player name'), 'the official sheet has no player name box: not asked');
  f2('Character name').value = 'Quiet Fist'; f2('Character name').dispatchEvent(new Event('input', { bubbles: true }));
  f2('Height').value = '160 cm'; f2('Height').dispatchEvent(new Event('input', { bubbles: true }));
  f2('Bonds').value = 'My monastery'; f2('Bonds').dispatchEvent(new Event('input', { bubbles: true }));
  step('Review');
  ok(/Fewer than two languages/.test(MK().querySelector('.mk-warn')?.textContent || '') && !btnIn(MK(), 'Create sheet').disabled, 'no languages: a warning only, Create still works');
  btnIn(MK(), 'Create sheet').click();
  ok(await until(() => LU()), 'the official sheet opens, Level 1 follows');
  expect('written to the official sheet', { 'Text1': 'Quiet Fist', 'Text6': 'Artisan', 'Text8': 'Human', 'Text28': 'Small', 'Text12': '900',
    'Text66': '17', 'Text22': '+3', 'Text65': '14', 'Text13': '15', 'Text27': '30 ft', 'Text98': 'Common', 'Text60': "Smith's Tools (Artisan)",
    'Text96': 'Height: 160 cm', 'Text97': 'Bonds: My monastery', 'Text99': /^Spear\n5 Daggers\nLute\nExplorer's Pack/, 'Check Box37': false,
    'Text69': '+0', 'Text70': '+0', 'Text29': '12', 'Text26': '+3' }); // INT 10: its save and Arcana show +0; Passive Perception, Initiative
  luStep('Features');
  ok(feat('Monk proficiencies').querySelector('.lu-texts input').value === 'Lute', 'the Monk tool comes from the equipment step: Lute');
  optIn(feat('Monk proficiencies'), 'Acrobatics').click(); optIn(feat('Monk proficiencies'), 'Stealth').click();
  optIn(feat('Skillful'), 'Perception').click();
  ok(feat('Origin feat').querySelector('.lu-card.on b')?.textContent.startsWith('Crafter'), 'Artisan: Crafter');
  [...feat('Origin feat').querySelectorAll('.lu-texts input')].forEach((el, i) => { el.value = ["Smith's Tools", "Tinker's Tools", "Mason's Tools"][i]; el.dispatchEvent(new Event('input')); });
  const versatile = feat('Versatile');
  cardIn(versatile, 'Alert').click();
  luStep('Review');
  LU().querySelector('.lu-apply').click(); await wait(20);
  expect('Monk 1 on the official sheet', { 'Text7': 'Monk', 'Text11': '1', 'Text16': '9', 'Text17': '1d8', 'Text19': '+2',
    'Check Box37': true, 'Check Box33': true, 'Check Box34': true, 'Check Box36': true, 'Check Box31': true,
    'Text58': /Crafter[\s\S]*Alert/, 'Text57': /Skillful \(Human\): Perception/, 'Text60': /Lute/ });
  ok(btnIn(LU(), 'Level 2 of 3') && btnIn(LU(), 'Stop here'), 'after level 1: "Level 2 of 3 →"');
  btnIn(LU(), 'Level 2 of 3').click(); await wait(20);
  ok(LU() && LU().querySelector('.lu-title b').textContent === 'Level up' && /Monk 2/.test(LU().querySelector('.lu-sub').textContent), 'it opens Level up for Monk 2 (no question first)');
  [...LU().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith('Review')).click();
  LU().querySelector('.lu-apply').click(); await wait(20);
  btnIn(LU(), 'Level 3 of 3').click(); await wait(20);
  [...LU().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith('Review')).click();
  LU().querySelector('.lu-apply').click(); await wait(20);
  ok(btnIn(LU(), 'Close') && !btnIn(LU(), 'Level 4'), 'level 3 reached: Close');
  expect('Monk 3', { 'Text11': '3', 'Text17': '3d8', 'Text16': /^2\d$/ });
  ok(character.classes[0].level === 3, 'the app reads a Monk 3');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
