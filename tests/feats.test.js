// More feats and species (data/feats-more.js, data/species-more.js): data, reading them off the sheet, the level up
// and the roller.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); };
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };

const W = () => document.getElementById('lvlup');
const btnIn = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const body = () => W().querySelector('.lu-body');
const next = () => W().querySelector('.lu-next').click();
const card = name => [...body().querySelectorAll('.lu-card')].find(b => b.querySelector('b').firstChild.textContent === name);
async function openLevelUp() {
  document.getElementById('levelUp').click(); await wait(20);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(20);
}
async function cancelLevelUp() {
  W().querySelector('.lu-foot .btn').click(); await wait(20);
  const a = document.querySelector('.ask');
  if (a) { btnIn(a, 'Throw away').click(); await wait(20); }
}
// roller
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const pick = () => document.getElementById('rollPick');
const btn = (text, root = pick()) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const last = () => document.querySelector('#rollLog .roll');
const attackWith = name => { tab('attack'); pick().querySelector('.back')?.click();
  [...pick().querySelectorAll('.item')].find(x => x.querySelector('.iname').textContent === name).click(); };
const partLabels = e => [...e.querySelectorAll('.dmg .part .pl')].map(x => x.textContent);

async function loadSheet(build) {
  const doc = await PDFLib.PDFDocument.create(), form = doc.getForm(), page = doc.addPage([612, 792]);
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  const box = (name, x, y, on) => { const f = form.createCheckBox(name); f.addToPage(page, { x, y: y + 3, width: 10, height: 10 }); if (on) f.check(); };
  build(add, box);
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 't.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  if (!loaded) throw new Error('sheet did not load');
  await wait(20);
}

(async () => { try {
  document.body.prepend(pre);
  // ---- 1. the data
  const F = DND.feats, by = src => F.filter(f => (f.source || 'free') === src).length;
  ok(F.length === 140 && new Set(F.map(f => f.name)).size === 140, `140 feats, all names different (${F.length})`);
  ok(by('free') + by("Player's Handbook (2024)") === 75, "the free rules + the Player's Handbook = its 75 feats");
  ok(by('Forgotten Realms: Heroes of Faerûn') === 34 && by('Eberron: Forge of the Artificer') === 29 && by('Lorwyn: First Light') === 2, 'Heroes of Faerûn 34, Forge of the Artificer 29, Lorwyn 2');
  ok(F.every(f => f.summary && f.type && (f.prerequisite === null || typeof f.prerequisite === 'object')), 'every feat has a type, a summary and a prerequisite (or null)');
  ok(F.filter(f => f.source && f.source !== "Player's Handbook (2024)").every(f => f.brief && /see /.test(f.summary)), 'feats from the other books say to see the book');
  const sname = n => n.toLowerCase().replace(/^the /, '');
  ok(DND.species.length === 172 && new Set(DND.species.map(s => sname(s.name))).size === 172, `172 species, one per name (${DND.species.length})`);
  ok(['Aarakocra', 'Arisen', 'Dhampir', 'Lupin', 'Owlin', 'Yuan-ti', 'Half-Elf'].every(n => DND.species.some(s => s.name === n)), 'Aarakocra, Arisen, Dhampir, Lupin, Owlin, Yuan-ti, Half-Elf are there');
  ok(DND.species.find(s => s.name === 'Dhampir').source === 'Ravenloft: The Horrors Within' && DND.species.find(s => s.name === 'Aarakocra').source === 'Mordenkainen Presents: Monsters of the Multiverse',
    'same name in several books: the 2024 or newest official version is kept');
  ok(!DND.species.some(s => ['Yuan-ti Pureblood', 'Gith', 'Genasi', 'The Disembodied'].includes(s.name)), 'replaced older names and look-alike duplicates are left out');
  ok(DND.species.every(s => s.traits.every(t => !/^[+-]\d|(Strength|Dexterity|Constitution|Intelligence|Wisdom|Charisma) [+-]\d/.test(t))), 'no old-style ability bonuses in trait lists');
  ok(DND.species.find(s => s.name === 'Aasimar').features.length === 5 && !DND.species.find(s => s.name === 'Aasimar').brief, 'Aasimar in full: 5 traits');

  // ---- 2. a sheet: feats in the text, and text that only looks like a feat
  await loadSheet((add, box) => {
    add('CharacterName', 20, 750, 150, 'Brann'); add('ClassLevel', 200, 750, 140, 'Fighter 8'); add('Race ', 360, 750, 120, 'Lorwyn Changeling');
    [['STR', '18', '+4'], ['DEX', '14', '+2'], ['CON', '14', '+2'], ['INT', '10', '+0'], ['WIS', '12', '+1'], ['CHA', '8', '-1']].forEach(([ab, s, m], i) => {
      add(ab, 20, 700 - i * 30, 30, s); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 60, 700 - i * 30, 30, m); });
    add('ProfBonus', 20, 500, 30, '+3'); add('HPMax', 60, 500, 30, '60'); add('HPCurrent', 100, 500, 30, '60'); add('Speed', 140, 500, 30, '30');
    add('ST Constitution', 95, 460, 30, '+5');
    add('Wpn Name', 300, 600, 120, 'Greatsword'); add('Wpn1 AtkBonus', 430, 600, 40); add('Wpn1 Damage', 480, 600, 110);
    add('Wpn Name 2', 300, 578, 120, 'Longsword'); add('Wpn2 AtkBonus ', 430, 578, 40); add('Wpn2 Damage ', 480, 578, 110);
    add('Wpn Name 3', 300, 556, 120, 'Rapier'); add('Wpn3 AtkBonus  ', 430, 556, 40); add('Wpn3 Damage  ', 480, 556, 110);
    add('Spells 1014', 300, 400, 150, 'Fire Bolt');
    add('Features and Traits', 20, 40, 260, ['Great Weapon Master', 'Fighting Style: Dueling', 'Piercer', 'Elemental Adept (Fire)', 'War Caster',
      'Tavern Brawler', 'Unarmored Defense', 'Blessed Healer (from a friend)', 'Protection from Evil and Good', "Healer's Kit"].join('\n'), true, 180);
  });
  const c = character;
  ok(['Great Weapon Master', 'Dueling', 'Piercer', 'Elemental Adept', 'War Caster', 'Tavern Brawler'].every(n => c.feats.includes(n)), 'feats read: ' + c.feats.join(', '));
  ok(!['Weapon Master', 'Healer', 'Protection', 'Defense'].some(n => c.feats.includes(n)),
    '"Great Weapon Master" is not Weapon Master; "Blessed Healer", "Healer\'s Kit", "Protection from", "Unarmored Defense" are not feats');
  ok(c.speciesData?.name === 'Lorwyn Changeling', 'race "Lorwyn Changeling" -> ' + c.speciesData?.name);
  for (const [race, want] of [['Changeling', 'Changeling'], ['Aasimar', 'Aasimar'], ["Ghaal'dar", "Dhakaani Ghaal'dar"], ['Kalamer Landwalker (Merfolk)', 'Kalamer Landwalker'],
    ['Aarakocra', 'Aarakocra'], ['Yuan-ti Pureblood', 'Yuan-ti'], ['Half-Elf', 'Half-Elf'], ['High Elf', 'Elf'], ['Sea Elf', 'Sea Elf'], ['Fire Genasi', 'Fire Genasi'], ['Manyhorn', 'The Manyhorn']]) {
    type('Race ', race); await wait(10);
    ok(character.speciesData?.name === want, `race "${race}" -> ${character.speciesData?.name}`);
  }

  // ---- 3. the roller
  document.getElementById('rollerTab').click(); await wait(20);
  attackWith('Greatsword');
  ok(!!btn('Great Weapon Master +3') && !btn('Dueling'), 'Greatsword (Heavy, two-handed): Great Weapon Master +3, no Dueling');
  forced = [15, 4, 5]; btn('Attack').click(); await wait(20);
  ok(partLabels(last()).includes('Great Weapon Master') && +last().querySelector('.dsum .total').dataset.count === 4 + 5 + 4 + 3, 'GWM adds PB to the damage: 4+5+4+3 = ' + last().querySelector('.dsum .total').dataset.count);
  ok(/Great Weapon Master: after a Critical Hit/.test(pick().textContent), 'the card notes the Bonus Action attack');
  btn('Great Weapon Master').click(); await wait(10);
  forced = [15, 4, 5]; btn('Attack').click(); await wait(20);
  ok(!partLabels(last()).includes('Great Weapon Master'), 'turning it off leaves it out');
  attackWith('Longsword');
  ok(!!btn('Dueling +2') && !btn('Great Weapon Master'), 'Longsword in one hand: Dueling +2, no GWM');
  forced = [15, 6]; btn('Attack').click(); await wait(20);
  ok(+last().querySelector('.dsum .total').dataset.count === 6 + 4 + 2, 'Dueling: 6 + 4 + 2 = ' + last().querySelector('.dsum .total').dataset.count);
  attackWith('Rapier');
  forced = [20, 3, 4, 5]; btn('Attack').click(); await wait(20);
  ok(last().classList.contains('crit') && last().querySelectorAll('.dmg .die.d8').length === 3, 'Piercer: a crit with a Rapier rolls 3d8 (2 + 1 more): ' + last().querySelectorAll('.dmg .die.d8').length);
  attackWith('Unarmed Strike');
  forced = [15, 1, 3]; btn('Attack').click(); await wait(20);
  const ud = last().querySelector('.dmg .die');
  ok(ud.classList.contains('d4') && ud.dataset.final === '3', 'Tavern Brawler: Unarmed Strike 1d4, the 1 rolled again (3)');
  // Elemental Adept (Fire): Fire Bolt's 1s count as 2
  tab('spell'); [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Fire Bolt')).click();
  forced = [15, 1, 6]; btn('Cast').click(); await wait(20);
  ok([...last().querySelectorAll('.dmg .die')].map(d => d.dataset.final).join(',') === '2,6', 'Elemental Adept (Fire): Fire Bolt 1 counts as 2');
  // War Caster: concentration saves have Advantage
  forced = [4, 17]; roller.save('CON', 'Concentration: Bless (DC 10)', 'concentration'); await wait(20);
  ok(last().querySelectorAll('.test .face').length === 2 && /War Caster/.test(last().textContent), 'War Caster: the concentration save rolls with Advantage');
  forced = [4]; roller.save('CON', 'Constitution save'); await wait(20);
  ok(last().querySelectorAll('.test .face').length === 1, 'an ordinary CON save does not');

  // ---- 4. the level up: Human Fighter 3 -> 4 picking new feats
  await loadSheet((add, box) => {
    add('CharacterName', 20, 750, 150, 'Kadar'); add('ClassLevel', 200, 750, 140, 'Fighter 3'); add('Race ', 360, 750, 100, 'Human');
    [['STR', '16', '+3'], ['DEX', '14', '+2'], ['CON', '14', '+2'], ['INT', '10', '+0'], ['WIS', '12', '+1'], ['CHA', '8', '-1']].forEach(([ab, s, m], i) => {
      add(ab, 20, 700 - i * 30, 30, s); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 60, 700 - i * 30, 30, m); });
    add('ProfBonus', 20, 500, 30, '+2'); add('HPMax', 60, 500, 30, '28'); add('HPCurrent', 100, 500, 30, '28'); add('Speed', 140, 500, 30, '30');
    box('Check Box 20', 80, 460, true); add('ST Strength', 95, 460, 30, '+5');
    box('Check Box 21', 80, 440, false); add('ST Wisdom', 95, 440, 30, '+1');
    add('Spells 1014', 300, 400, 150); add('Spells 1015', 300, 380, 150);
    add('Features and Traits', 20, 40, 250, 'Second Wind', true, 150);
  });
  await openLevelUp(); next(); next();
  ok(/Player's Handbook/.test(body().textContent) && !!body().querySelector('.lu-find select'), 'feat cards show their book; a book filter and search are there');
  ok(card('Keen Mind')?.disabled && /needs INT 13/.test(card('Keen Mind').textContent), 'Keen Mind is greyed out with INT 10');
  ok(card('Heavy Armor Master') && !card('Heavy Armor Master').disabled, 'Heavy Armor Master is open to a Fighter (Heavy armor training)');
  ok(card('Mark of Healing') && /Forge of the Artificer/.test(card('Mark of Healing').textContent), 'Dragonmark feats can be taken too');
  const search = body().querySelector('.lu-find .lu-search');
  search.value = 'sharp'; search.dispatchEvent(new Event('input')); await wait(10);
  ok(card('Sharpshooter') && !card('Great Weapon Master'), 'search "sharp" shows Sharpshooter, hides the rest');
  search.value = ''; search.dispatchEvent(new Event('input')); await wait(10);
  card('Tough').click(); await wait(10);
  next();
  ok(/Max HP\s*28\s*→\s*44/.test(body().textContent), 'Tough: Max HP 28 → 44 (8 for the level + 2 × 4)');
  W().querySelector('.lu-apply').click(); await wait(20);
  ok(inp('HPMax').value === '44' && /Tough \(Fighter 4\)/.test(inp('Features and Traits').value), 'applied: Max HP 44, Tough on the sheet');
  btnIn(W().querySelector('.lu-foot'), 'Close').click(); await wait(10);
  ok(character.feats.includes('Tough'), 'the sheet now has Tough');
  // Fighter 4 -> 5 has no feat; 5 -> 6 does (Fighter 6 ASI). Look at more feats there without applying.
  type('ClassLevel', 'Fighter 5'); await wait(10);
  await openLevelUp(); next();
  ok(/Tough \+2/.test(body().textContent), 'Tough on the sheet: +2 HP this level');
  next();
  card('Resilient').click(); await wait(10);
  ok(![...body().querySelectorAll('.lu-ab small')].some(s => s.textContent === 'STR'), 'Resilient offers only saves you lack (no STR)');
  [...body().querySelectorAll('.lu-ab')].find(b => b.querySelector('small').textContent === 'WIS').click(); await wait(10);
  next();
  ok(/Wisdom saving throws/.test(body().textContent) && /Wisdom\s*12\s*→\s*13/.test(body().textContent), 'Resilient (WIS): WIS 12 → 13 and Wisdom save proficiency');
  W().querySelector('.lu-steps button:nth-child(3)').click(); await wait(10);
  card('Speedy').click(); await wait(10);
  next();
  ok(/Speed\s*30\s*→\s*40/.test(body().textContent), 'Speedy: Speed 30 → 40');
  W().querySelector('.lu-steps button:nth-child(3)').click(); await wait(10);
  card('Fey Touched').click(); await wait(10);
  ok(/Always prepared: Misty Step/.test(body().textContent), 'Fey Touched: Misty Step always prepared');
  const fs = body().querySelector('[data-pick$=":fs"]');
  const schools = new Set([...fs.querySelectorAll('.lu-spell span')].map(s => s.textContent.split(' · ')[1]));
  ok(schools.size === 2 && schools.has('Divination') && schools.has('Enchantment'), 'its spell list: level 1 Divination and Enchantment only (' + [...schools] + ')');
  [...fs.querySelectorAll('.lu-spell')].find(b => b.querySelector('b').textContent === 'Bless').click(); await wait(10);
  next();
  ok(/Misty Step/.test(body().textContent) && /Bless/.test(body().textContent), 'review: Misty Step and Bless are written to spell lines');
  W().querySelector('.lu-steps button:nth-child(3)').click(); await wait(10);
  card('Mythal Touched').click(); await wait(10);
  ok(/check the book/.test(body().textContent), "a feat whose scores the list doesn't name says so");
  await cancelLevelUp();
  ok(!W(), 'cancelled');
} catch (e) { log('ERROR ' + e.message + ' ' + e.stack); } })();
