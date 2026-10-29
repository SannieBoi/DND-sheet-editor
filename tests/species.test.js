// Species with their rules from wikidot (species-more.js): the data, the maker's species step (cards, search, the names-only
// warning, natural armor in the AC), a first level with species choices (skills, the ability for a trait's spells, a Kobold
// Legacy's parts), species spells by character level, Hare-Trigger initiative, natural weapons and species switches in the
// roller, species uses on the Rest tab, the Lorwyn-Shadowmoor Elf's lineages, and traits named like class features.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const until = async (cond, n = 3e6) => { for (let i = 0; i < n && !cond(); i++) await yieldTask(); return cond(); };
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).type === 'checkbox' ? inp(n).checked : inp(n).value;
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const errors = [];
addEventListener('error', e => errors.push(e.message));

const W = () => document.getElementById('lvlup'), MK = () => document.getElementById('maker');
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const body = () => W().querySelector('.lu-body');
const step = name => [...W().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const mkStep = name => [...MK().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const cardIn = (root, t) => [...root.querySelectorAll('.lu-card')].find(b => b.querySelector('b')?.firstChild.textContent === t);
const optIn = (root, t) => [...root.querySelectorAll('.lu-opt')].find(b => b.querySelector('b')?.textContent === t);
const feat = name => [...body().querySelectorAll('.lu-feat')].find(s => s.querySelector('.lu-fh b')?.textContent === name);
const pickSpell = (pickId, name) => {
  const b = [...W().querySelectorAll(`[data-pick="${pickId}"] .lu-spell`)].find(x => x.querySelector('b').textContent === name);
  if (b) b.click(); else log(`FAIL no spell button ${name} in ${pickId}`);
};
const apply = async () => { step('Review'); W().querySelector('.lu-apply').click(); await wait(20); btnIn(W().querySelector('.lu-foot'), 'Close').click(); await wait(20); };
async function openLevelUp() {
  document.getElementById('levelUp').click(); await wait(20);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(20);
}
// the next unfilled pick on the page (a list with its count not full, else option cards with nothing chosen)
function fill() {
  for (let guard = 0; guard < 60; guard++) {
    let b = null;
    for (const p of body().querySelectorAll('.lu-pick')) {
      const c = p.querySelector('.lu-count');
      if (!c || c.classList.contains('full')) continue;
      b = [...p.querySelectorAll('button.lu-opt:not(.on), button.lu-spell:not(.on)')].find(x => !x.disabled);
      if (b) break;
    }
    if (!b) for (const cards of body().querySelectorAll('.lu-feat .lu-cards')) {
      if (cards.querySelector('.lu-card.on')) continue;
      b = [...cards.querySelectorAll('.lu-card')].find(x => !x.disabled && !/^(Another subclass|Other feat)/.test(x.textContent.trim()));
      if (b) break;
    }
    if (!b) return;
    b.click();
  }
}
async function levelUpFilled() { await openLevelUp(); step('Features'); fill(); if ([...W().querySelectorAll('.lu-steps button')].some(b => b.textContent.endsWith('Spells'))) { step('Spells'); fill(); } await apply(); }

const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const rpick = () => document.getElementById('rollPick');
const rbtn = text => [...rpick().querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const attackWith = name => { tab('attack'); rpick().querySelector('.back')?.click();
  [...rpick().querySelectorAll('.item')].find(x => x.querySelector('.iname').textContent === name).click(); };
const lastRoll = () => document.querySelector('#rollLog .roll');

async function loadSheet(o) {
  const doc = await PDFLib.PDFDocument.create(), form = doc.getForm(), page = doc.addPage([612, 792]);
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('CharacterName', 20, 750, 150, 'Kin'); add('ClassLevel', 200, 750, 160, o.cls || ''); add('Race ', 380, 750, 120, o.race);
  [['STR', 14], ['DEX', 14], ['CON', 14], ['INT', 14], ['WIS', 12], ['CHA', 12]].forEach(([ab, s], i) => {
    add(ab, 20, 700 - i * 30, 30, String(s)); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 60, 700 - i * 30, 30, '+' + Math.floor((s - 10) / 2));
  });
  add('ProfBonus', 20, 500, 30, o.cls ? '+2' : ''); add('HPMax', 60, 500, 30, o.cls ? '20' : ''); add('HPCurrent', 100, 500, 30, o.cls ? '20' : ''); add('Speed', 140, 500, 30, '30');
  add('Wpn Name', 20, 300, 100, 'Longsword'); add('Wpn1 AtkBonus', 125, 300, 30, '+4'); add('Wpn1 Damage', 160, 300, 90, '1d8+2 slashing');
  add('Features and Traits', 20, 40, 250, o.features || '', true, 220);
  let y = 740, n = 1014;
  [6, 8, 4].forEach((lines, lvl) => {
    if (lvl) { add('SlotsTotal ' + (18 + lvl), 310, y, 30); y -= 22; }
    for (let i = 0; i < lines; i++) { add('Spells ' + n++, 300, y, 150); y -= 20; }
    y -= 8;
  });
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'species.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  await until(() => loaded);
  if (!loaded) throw new Error('sheet did not load');
  await wait(20);
}
const spellLines = () => [...document.querySelectorAll('[data-field^="Spells "]')].map(e => e.value).filter(Boolean);

(async () => { try {
  document.body.prepend(pre);
  const C = window.character;
  // ---- 1. the data: 62 more species with their rules, 100 names only (third-party books and Kithkin)
  const full = DND.species.filter(s => !s.brief), brief = DND.species.filter(s => s.brief);
  ok(DND.species.length === 172 && full.length === 72 && brief.length === 100, `172 species: ${full.length} with rules, ${brief.length} names only`);
  ok(full.every(s => s.size && s.speed && s.features.length && s.features.every(f => f.lvl && f.text)), 'every species with rules has a size, a Speed and its trait texts');
  const WOTC = /Monsters of the Multiverse|Spelljammer|Ravnica|Theros|Strixhaven|Dragonlance|Acquisitions|Sword Coast|Locathah|Grung|Basic Rules|Forge of the Artificer|Ravenloft|D&D Beyond Drops/;
  ok(brief.every(s => !WOTC.test(s.source)) && brief.filter(s => /Lorwyn/.test(s.source)).map(s => s.name).join() === 'Kithkin',
    'names only: no species of a book wikidot has, except Kithkin (no wikidot page)');

  // ---- 2. the maker: the free rules' species as cards, the others by search, natural armor in the AC
  document.getElementById('newSheet').click(); await wait(20);
  mkStep('Class'); cardIn(MK(), 'Fighter').click();
  mkStep('Background'); cardIn(MK(), 'Soldier').click();
  mkStep('Species');
  ok(MK().querySelectorAll('.lu-cards.compact')[0].querySelectorAll('.lu-card').length === 10, 'ten species cards (the free rules and the Aasimar)');
  const search = q => { const s = MK().querySelector('.mk-q'); s.value = q; s.dispatchEvent(new Event('input', { bubbles: true })); };
  search('tortle');
  const tortle = cardIn(MK(), 'Tortle');
  ok(tortle && /Medium or Small · 30 ft · Claws/.test(tortle.textContent), 'search finds the Tortle with its size, Speed and traits');
  tortle.click();
  ok(!/rules aren't in the data/.test(MK().textContent), 'no "write it yourself" warning for the Tortle');
  [...MK().querySelectorAll('.chip')].find(c => c.textContent === 'Medium').click();
  mkStep('Equipment');
  const nums = () => [...MK().querySelectorAll('.num b')].map(b => b.textContent);
  ok(nums()[0] === '17', "Tortle Fighter with Chain Mail: AC 17 (its shell; it can't wear armor): " + nums()[0]);
  mkStep('Species'); search('warforged'); cardIn(MK(), 'Warforged').click();
  [...MK().querySelectorAll('.chip')].find(c => c.textContent === 'Medium').click();
  mkStep('Equipment');
  ok(nums()[0] === '17', 'Warforged Fighter with Chain Mail: AC 16 + 1 (Integrated Protection) = ' + nums()[0]);
  mkStep('Species'); search('Spelljammer');
  ok(['Astral Elf', 'Autognome', 'Giff', 'Hadozee', 'Plasmoid', 'Thri-kreen'].every(n => cardIn(MK(), n)), 'search by book: the six Spelljammer species');
  search('hobbit'); cardIn(MK(), 'Hobbit').click();
  ok(/Names only/.test(cardIn(MK(), 'Hobbit').textContent) && /rules aren't in the data \(its book isn't on wikidot\)/.test(MK().textContent),
    'a third-party species: "Names only" and the warning');
  MK().querySelector('.lu-x').click(); await wait(20);
  btnIn(document.querySelector('.ask'), 'Throw away')?.click(); await wait(20);

  // ---- 3. a Githyanki Fighter's first level: the trait's ability (INT when the class doesn't cast), Mage Hand; Jump at character level 3
  await loadSheet({ race: 'Githyanki' });
  window.levelUp.start({ key: 'fighter' }); await wait(20);
  step('Features');
  const psi = feat('Githyanki Psionics');
  ok(psi && [...psi.querySelectorAll('.chip.on')].map(c => c.textContent).join() === 'INT', 'Githyanki Psionics asks the spellcasting ability, INT to start with (a Fighter casts no spells)');
  ok(feat('Astral Knowledge') && feat('Psychic Resilience'), 'the other Githyanki traits are listed');
  fill(); step('Spells'); fill();
  ok([...body().querySelectorAll('.lu-list li')].some(li => /^Mage Hand · .* · Githyanki$/.test(li.textContent)), 'the Spells step adds Mage Hand (always prepared, Githyanki)');
  await apply();
  ok(/Githyanki Psionics \(Githyanki\): INT \(spellcasting ability\)\. You know Mage Hand/.test(val('Features and Traits')), 'the trait line with the ability');
  ok(/Psychic Resilience \(Githyanki\): Resistance to Psychic damage\./.test(val('Features and Traits')), 'a plain trait line');
  ok(spellLines().includes('Mage Hand'), 'Mage Hand on a spell line');
  await levelUpFilled(); await levelUpFilled();
  ok(/^Fighter 3\b/.test(val('ClassLevel')) && spellLines().includes('Jump') && !spellLines().includes('Misty Step'), 'Fighter 3: Jump is added (Misty Step comes at 5): ' + spellLines().join(', '));
  ok(!C.beyond.length && !errors.length, 'nothing beyond the rules, no errors: ' + errors.join(' | '));

  // ---- 4. a Kobold Sorcerer: Kobold Legacy's parts follow the option
  await loadSheet({ race: 'Kobold' });
  window.levelUp.start({ key: 'sorcerer' }); await wait(20);
  step('Features');
  const legacy = () => feat('Kobold Legacy');
  cardIn(legacy(), 'Craftiness').click();
  ok(optIn(legacy(), 'Arcana') && optIn(legacy(), 'Survival') && !legacy().querySelector('.chips'), 'Craftiness: a skill to pick (Arcana ... Survival)');
  cardIn(legacy(), 'Draconic Sorcery').click();
  ok(!optIn(legacy(), 'Arcana') && legacy().querySelector('[data-pick="sp:Kobold Legacy#2"]') && legacy().querySelector('.chips'),
    'Draconic Sorcery: a Sorcerer cantrip and its ability instead');
  pickSpell('sp:Kobold Legacy#2', 'Fire Bolt');
  [...legacy().querySelectorAll('.chip')].find(c => c.textContent === 'WIS').click();
  fill(); step('Spells'); fill();
  await apply();
  ok(/Kobold Legacy \(Kobold\): Choose one legacy\. Draconic Sorcery: You know a Sorcerer cantrip of your choice; INT, WIS or CHA is its spellcasting ability\. Chosen: Fire Bolt; WIS \(spellcasting ability\)\./.test(val('Features and Traits')),
    'the legacy line with its picks');
  ok(spellLines().includes('Fire Bolt'), 'Fire Bolt on a spell line');
  ok(window.resources.list().some(r => r.name === 'Draconic Cry' && r.max === 2 && r.back === 'long'), 'Rest tab: Draconic Cry, 2 uses (PB) per Long Rest');

  // ---- 5. Hare-Trigger: Initiative + PB; species switches and natural weapons on the attack card
  await loadSheet({ race: 'Harengon', cls: 'Fighter 1' });
  ok(C.initiativeMod === 4, 'Harengon: Initiative = DEX +2 + PB 2 = ' + C.initiativeMod);
  await loadSheet({ race: 'Tabaxi', cls: 'Fighter 1' });
  attackWith('Unarmed Strike');
  forced = [15, 4]; rbtn('Attack').click(); await wait(20);
  ok(lastRoll().querySelector('.dmg .die').classList.contains('d6') && /slashing/i.test(lastRoll().textContent), "Tabaxi: Unarmed Strike with Cat's Claws, 1d6 slashing");
  await loadSheet({ race: 'Bugbear', cls: 'Fighter 1' });
  attackWith('Longsword');
  ok(rbtn('Surprise Attack 2d6') && !rbtn('Surprise Attack 2d6').classList.contains('on'), 'Bugbear: a Surprise Attack 2d6 switch, off to start');
  await loadSheet({ race: 'Giff', cls: 'Fighter 1' });
  attackWith('Longsword');
  ok(!!rbtn('Astral Spark +2 force'), 'Giff: Astral Spark +2 force on a weapon');
  attackWith('Unarmed Strike');
  ok(!rbtn('Astral Spark'), '... but not on an Unarmed Strike');
  await loadSheet({ race: 'Half-Orc', cls: 'Fighter 1' });
  attackWith('Longsword');
  forced = [20, 3, 4, 5]; rbtn('Attack').click(); await wait(20);
  ok(lastRoll().classList.contains('crit') && lastRoll().querySelectorAll('.dmg .die.d8').length === 3, 'Half-Orc Savage Attacks: a crit with a Longsword rolls 3d8');
  await loadSheet({ race: 'Goliath (Fire\'s Burn)', cls: 'Fighter 1' });
  attackWith('Longsword');
  ok(!!rbtn("Fire's Burn 1d10 fire"), "Goliath with Fire's Burn: its 1d10 fire switch");

  // ---- 6. the Rest tab: species uses (from their level), the free-rules ones too
  await loadSheet({ race: 'Eladrin', cls: 'Wizard 1' });
  ok(window.resources.list().some(r => r.name === 'Fey Step' && r.max === 2 && r.back === 'long'), 'Eladrin: Fey Step, 2 uses (PB) per Long Rest');
  await loadSheet({ race: 'Dragonborn (Red)', cls: 'Fighter 3' });
  const names = window.resources.list().map(r => r.name);
  ok(names.includes('Breath Weapon') && !names.includes('Draconic Flight'), 'Dragonborn 3: Breath Weapon, no Draconic Flight yet (level 5): ' + names.join(', '));

  // ---- 7. the Lorwyn-Shadowmoor Elf's lineages; Heroism at character level 3
  await loadSheet({ race: 'Elf (Shadowmoor Elf)', cls: 'Cleric 2' });
  ok(C.speciesData?.name === 'Lorwyn-Shadowmoor Elf' && C.lineage?.name === 'Elven Lineage: Shadowmoor Elf', '"Elf (Shadowmoor Elf)": the Lorwyn-Shadowmoor Elf, Shadowmoor lineage');
  await levelUpFilled();
  ok(spellLines().includes('Heroism'), 'Cleric 3: Heroism is added: ' + spellLines().join(', '));

  // ---- 8. traits named like class features aren't out of reach; a later trait is
  await loadSheet({ race: 'Warforged', cls: 'Fighter 1', features: 'Tireless (Warforged): no Exhaustion from dehydration.\nShape-Shifter: just words.' });
  ok(!C.beyond.some(b => b.name === 'Tireless'), "the Warforged's Tireless isn't the Ranger's (not out of reach)");
  ok(C.beyond.some(b => b.name === 'Shape-Shifter'), "a Warforged with the Transmuter's Shape-Shifter still is");
  const ignore = async () => { await wait(400); document.querySelector('.ask .btn.primary')?.click(); await wait(20); };
  await ignore();
  await loadSheet({ race: 'Simic Hybrid', cls: 'Fighter 3', features: 'Second Animal Enhancement (Simic Hybrid): Carapace.' });
  ok(C.beyond.some(b => b.id === 'feature:secondanimalenhancement' && /level 5/.test(b.why)), 'Simic Hybrid 3: the level 5 enhancement is out of reach');
  await ignore();
  ok(!errors.length, 'no errors: ' + errors.join(' | '));
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
