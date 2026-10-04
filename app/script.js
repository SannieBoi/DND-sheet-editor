(() => {
'use strict';
// The worker script is loaded by a <script> tag in index.html, so pdf.js runs fine from file://
pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
const { PDFDocument, StandardFonts, rgb } = PDFLib;
const $ = id => document.getElementById(id);
const SCALE = 1.5;
let bytes, fileName = 'character-sheet', edits = {}, notes = [], addMode = false;
let zoom = 1; // 1 = 100%

// ---- Character data ---------------------------------------------------------
// Each key lists the PDF field names it can be stored under. Matching ignores case, spaces and punctuation,
// so "HPMax", "HP Max" and "hp_max" all match. If a stat comes out missing for your sheet, add its field name here
// (the console lists every field name in the PDF after you upload).
const FIELD_MAP = {
  name: ['CharacterName', 'Character Name'], classLevel: ['ClassLevel', 'Class & Level', 'Class'],
  race: ['Race', 'Species'], background: ['Background'], alignment: ['Alignment'], xp: ['XP', 'Experience Points'],
  str: ['STR', 'Strength'], dex: ['DEX', 'Dexterity'], con: ['CON', 'Constitution'],
  int: ['INT', 'Intelligence'], wis: ['WIS', 'Wisdom'], cha: ['CHA', 'Charisma'],
  strMod: ['STRmod', 'Strength Mod'], dexMod: ['DEXmod', 'Dexterity Mod'], conMod: ['CONmod', 'Constitution Mod'],
  intMod: ['INTmod', 'Intelligence Mod'], wisMod: ['WISmod', 'Wisdom Mod'], chaMod: ['CHamod', 'Charisma Mod'],
  hp: ['HPCurrent', 'Current HP', 'HP'], hpMax: ['HPMax', 'Max HP'], hpTemp: ['HPTemp', 'Temp HP'],
  ac: ['AC', 'Armor Class'], initiative: ['Initiative'], speed: ['Speed'],
  profBonus: ['ProfBonus', 'Proficiency Bonus'], passivePerception: ['Passive', 'Passive Perception'],
  inspiration: ['Inspiration'], hitDice: ['HD', 'Hit Dice'], hitDiceTotal: ['HDTotal', 'Hit Dice Total', 'Total Hit Dice'],
  hitDiceSpent: ['HDSpent', 'Hit Dice Spent', 'Spent Hit Dice'],
  level: ['Level', 'Character Level'], subclass: ['Subclass'],
  spellAbility: ['SpellcastingAbility', 'SpellcastingAbility 2', 'Spellcasting Ability'],
  spellDC: ['SpellSaveDC', 'SpellSaveDC 2', 'Spell Save DC'], spellAttack: ['SpellAtkBonus', 'SpellAtkBonus 2', 'Spell Attack Bonus'],
  features: ['Features and Traits', 'FeaturesTraits', 'Features'], proficiencies: ['ProficienciesLang', 'Proficiencies'],
  equipment: ['Equipment'], attacksText: ['AttacksSpellcasting', 'Attacks & Spellcasting'],
  cp: ['CP'], sp: ['SP'], ep: ['EP'], gp: ['GP'], pp: ['PP']
};
// Spell slot totals per level: "SlotsTotal 19" is level 1 on the classic fillable sheet. The box printed "Slots Expended"
// next to it is named "SlotsRemaining 19" there; it holds the slots used.
for (let l = 1; l <= 9; l++) {
  FIELD_MAP['slots' + l] = ['SlotsTotal ' + (18 + l), 'Slots ' + l, 'Spell Slots ' + l, `Level ${l} Slots`];
  FIELD_MAP['slotsExpended' + l] = ['SlotsRemaining ' + (18 + l), 'Slots Expended ' + l, 'Spell Slots Expended ' + l, `Level ${l} Expended`, 'Slots Used ' + l];
}
const TEXT_KEYS = new Set(['name', 'classLevel', 'race', 'background', 'alignment', 'hitDice', 'hitDiceTotal', 'spellAbility',
  'features', 'proficiencies', 'equipment', 'attacksText', 'subclass', 'size', 'features2', 'speciesTraits', 'featsText',
  'weaponProficiencies', 'toolProficiencies', 'appearance', 'backstory', 'languages']);
const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const fields = {};             // every PDF field by name, e.g. fields['HPCurrent'] (also window.fields)
const character = {};          // live stats: character.hp, character.str, ... (also window.character)
let raw = {}, els = {}, fieldOf = {}; // PDF field name -> value / overlay inputs; stat key -> PDF field name
let meta = {};                 // PDF field name -> { page, x, y, w, h, text, multi, check } (position on the rendered page)
let weaponRows = [];           // [{ name, bonus, damage }] PDF field names of each weapon line on the sheet
let writing = false;           // true while code (not the user) is changing a field
let sheetMap = null;           // a known sheet from DND.sheets (sheets.js) whose field names say nothing, e.g. Text1
const currentValue = name => (name in edits ? edits[name].value : raw[name]);

const detectSheet = pages => (window.DND.sheets || []).find(s => s.detect.pages === pages && s.detect.fields.every(f => f in raw)) || null;

function resolveFields() {
  fieldOf = {};
  for (const k in fields) delete fields[k];
  if (sheetMap) { // known sheet: its own map instead of matching names
    const put = (key, f) => { if (f in raw) fieldOf[key] = f; };
    for (const [key, f] of Object.entries(sheetMap.fields)) put(key, f);
    for (const [ab, f] of Object.entries(sheetMap.saves)) put('save:' + ab, f);
    for (const [sk, f] of Object.entries(sheetMap.skills)) put('skill:' + sk, f);
    for (const [l, s] of Object.entries(sheetMap.slots)) put('slots' + l, s.total);
    return;
  }
  const byNorm = {};
  for (const n of Object.keys(raw)) { byNorm[norm(n.split('.').pop())] ??= n; byNorm[norm(n)] = n; }
  for (const [key, aliases] of Object.entries(FIELD_MAP)) {
    const hit = aliases.map(a => byNorm[norm(a)]).find(Boolean);
    if (hit) fieldOf[key] = hit;
  }
}

// Sheets disagree on which box holds the score and which the modifier (some name them the other way round),
// so check the numbers: a score of 14 goes with a modifier of +2.
function sortAbilities() {
  for (const k of ['str', 'dex', 'con', 'int', 'wis', 'cha']) {
    const a = fieldOf[k], b = fieldOf[k + 'Mod'];
    if (a && b && Math.floor((parseFloat(currentValue(b)) - 10) / 2) === parseFloat(currentValue(a))) {
      [fieldOf[k], fieldOf[k + 'Mod']] = [b, a];
    }
  }
}

function refreshCharacter() {
  sortAbilities();
  for (const k in character) delete character[k];
  for (const n in raw) fields[n] = currentValue(n);
  for (const [key, name] of Object.entries(fieldOf)) {
    const v = currentValue(name), n = parseFloat(v);
    character[key] = TEXT_KEYS.has(key) || Number.isNaN(n) ? v : n;
  }
  const stats = Object.keys(character).length;
  readGameData();
  const prev = snap;
  snap = takeSnapshot(prev);
  if (prev && propagate(prev, snap)) return refreshCharacter(); // boxes were updated: read the sheet again
  document.dispatchEvent(new CustomEvent('character-change', { detail: character }));
  return stats;
}

// Change a field from code (a checkbox takes true/false). The field's own listener records the edit (for the download
// and for Undo).
function writeField(name, value) {
  const list = els[name];
  if (!list) return false;
  writing = true;
  for (const el of list) {
    if (el.type === 'checkbox') { el.checked = !!value; el.dispatchEvent(new Event('change', { bubbles: true })); }
    else { el.value = value; el.dispatchEvent(new Event('input', { bubbles: true })); }
  }
  writing = false;
  return true;
}

// Change a stat from code, e.g. setStat('hp', 12). Updates the sheet and the download.
function setStat(key, value) {
  const ok = writeField(fieldOf[key], value);
  if (ok) refreshCharacter();
  return ok;
}

// ---- Game data: match the sheet's text to window.DND (rules data files) ------------
const D = window.DND;
const WEAPONS = [...D.weapons, { name: 'Unarmed Strike', category: 'simple', kind: 'melee', dice: '1',
  dmg: D.rules.unarmedStrike.dmg, props: [], unarmed: true }];
const fmt = n => (n < 0 ? '' : '+') + n;
const words = s => String(s ?? '').toLowerCase().match(/[a-z0-9']+/g) || [];
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');

// Skill and saving throw boxes, e.g. "Acrobatics", "SleightofHand", "ST Wisdom" -> character['skill:Acrobatics'], ['save:WIS']
for (const s of D.rules.skills) FIELD_MAP['skill:' + s.name] = [s.name, s.name.split(' ')[0]];
for (const [ab, full] of Object.entries(D.rules.abilities)) {
  FIELD_MAP['save:' + ab] = ['ST ' + full, full + ' Save', ab + ' Save', 'Save ' + ab, full + ' Saving Throw'];
}

// Spells: a field holding exactly a spell's name counts, and so does the name inside longer text, except for names
// that are also everyday rules words ("Light Armor", "Shield", "Fly Speed", the Slow mastery ...).
const SPELL_BY_NORM = new Map(D.spells.map(s => [norm(s.name), s]));
const AMBIGUOUS = new Set(['Light', 'Shield', 'Fly', 'Slow', 'Haste', 'Command', 'Message', 'Heal', 'Harm', 'Sleep', 'Wish',
  'Resistance', 'Mending', 'Silence', 'Alarm', 'Symbol', 'Teleport', 'Dream', 'Weird', 'Confusion', 'Guidance', 'Darkness']);
const SPELL_RES = D.spells.filter(s => !AMBIGUOUS.has(s.name)).map(s => [s, new RegExp('\\b' + escapeRe(s.name) + '\\b')]);
const spellNamed = text => SPELL_BY_NORM.get(norm(String(text ?? '').replace(/\(.*?\)/g, ''))) || null;

// "2d6+3" -> { n: 2, d: 6, flat: 3 }; "5" -> { n: 0, d: 0, flat: 5 }
const parseDice = s => {
  const m = String(s).replace(/\s/g, '').match(/^(\d+)d(\d+)([+-]\d+)?$/);
  return m ? { n: +m[1], d: +m[2], flat: +(m[3] || 0) } : { n: 0, d: 0, flat: parseInt(s, 10) || 0 };
};
const diceText = ({ n, d, flat }) => n ? `${n}d${d}${flat ? fmt(flat) : ''}` : String(flat);
const cantripTier = lvl => lvl >= 17 ? 4 : lvl >= 11 ? 3 : lvl >= 5 ? 2 : 1;

// The longest entry whose name words all appear in the text, so "Crossbow, light", "Longsword +1"
// and "2 Daggers" still find Light Crossbow, Longsword and Dagger.
// nameOf may give several names (aliases); the longest name that matches wins ("Lorwyn Changeling" over "Changeling")
function findEntry(text, list, nameOf = e => e.name) {
  const have = words(text), has = w => have.some(h => h === w || h === w + 's' || h === w + 'es');
  let best = null, bestLen = 0;
  for (const e of list) {
    for (const name of [].concat(nameOf(e))) {
      const need = words(name), len = need.join(' ').length;
      if (len > bestLen && need.every(has)) { best = e; bestLen = len; }
    }
  }
  return best;
}
const speciesNames = s => [s.name, ...s.aliases || []];

// Feats named anywhere in the sheet's text. Text that holds a feat's name without being that feat is skipped: a longer
// feat name ("Great Weapon Master" is not "Weapon Master") and the feat's own `unless` ("Blessed Healer", "Healer's Kit").
const escRe = t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function findFeats(allText) {
  return D.feats.filter(f => {
    const skip = [...D.feats.filter(o => o.name !== f.name && o.name.includes(f.name)).map(o => escRe(o.name)), f.unless].filter(Boolean).join('|');
    return new RegExp('\\b' + escRe(f.name) + '\\b').test(skip ? allText.replace(new RegExp(skip, 'g'), '') : allText);
  }).map(f => f.name);
}

// "Fighter 5", "Rogue 3 / Wizard 2", "Level 4 Cleric" -> [{ key, name, level }]
function parseClasses(text, fallbackLevel) {
  const out = [];
  for (const part of String(text ?? '').split(/[/,;&+]|\band\b/i)) {
    const key = Object.keys(D.classes).find(k => new RegExp('\\b' + k + '\\b', 'i').test(part));
    const n = part.match(/\d+/);
    if (key) out.push({ key, name: D.classes[key].name, level: n ? Math.min(20, Math.max(1, +n[0])) : null });
  }
  for (const c of out) c.level ??= out.length === 1 && fallbackLevel || 1;
  return out;
}

const abilityMod = ab => {
  const m = character[ab + 'Mod'], s = character[ab];
  return typeof m === 'number' ? m : typeof s === 'number' ? Math.floor((s - 10) / 2) : 0;
};

function isProficient(w) {
  if (w.unarmed || !character.classes.length) return true; // unknown class: assume the usual case
  return character.classes.some(({ key }) => {
    const p = D.classes[key].weaponProficiency;
    if (w.category === 'simple') return p.simple;
    return p.martial === 'all' || p.martial === 'light' && w.props.includes('light') ||
      p.martial === 'finesse-or-light' && (w.props.includes('light') || w.props.includes('finesse'));
  });
}

// To-hit and damage for a weapon, following DND.rules.weaponAttack. Situational extras (Rage, Sneak Attack,
// Smites) are left out because they don't belong in the sheet's damage box.
// opts: twoHanded (use the Versatile die), casting ({ ability, mod } for True Strike / Shillelagh), die (replaces the damage die)
function weaponAttack(w, magic = 0, { twoHanded = false, casting = null, die = null } = {}) {
  const str = abilityMod('str'), dex = abilityMod('dex');
  const monk = character.classes.find(c => c.key === 'monk');
  const monkWeapon = monk && w.kind === 'melee' && (w.category === 'simple' || w.props.includes('light'));
  const either = w.props.includes('finesse') || monkWeapon;
  const useDex = either ? dex > str : w.kind === 'ranged';
  const mod = casting ? casting.mod : useDex ? dex : str, proficient = isProficient(w);
  const archery = w.kind === 'ranged' && character.feats.includes('Archery') ? 2 : 0;
  let dice = die || (twoHanded && w.versatile) || w.dice;
  if (monkWeapon && !die) {
    const mDie = D.classes.monk.levels[monk.level - 1].martialArtsDie, cur = dice.match(/^1d(\d+)$/);
    if (dice === '1' || cur && +cur[1] < mDie) dice = '1d' + mDie;
  }
  const dmgMod = mod + magic, type = w.dmg;
  const damage = /^\d+$/.test(dice) ? String(Math.max(0, +dice + dmgMod)) : dice + (dmgMod ? fmt(dmgMod) : '');
  const toHit = mod + (proficient ? character.profBonus : 0) + magic + archery;
  return {
    ability: casting ? casting.ability : useDex ? 'DEX' : 'STR', proficient, toHit, bonusText: fmt(toHit),
    damage, type, text: `${damage} ${type}`, versatile: w.versatile && w.versatile + (dmgMod ? fmt(dmgMod) : '')
  };
}

// Spell attack bonus and save DC. The sheet's own boxes win; otherwise the first spellcasting class decides, and a
// character without one (species spells) uses the best of INT/WIS/CHA, as the species rules allow.
function spellcasting() {
  const c = character, caster = c.classes.find(x => D.classes[x.key].spellcasting);
  const named = Object.entries(D.rules.abilities).find(([ab, full]) => new RegExp(`^(${ab}|${full})$`, 'i').test(String(c.spellAbility ?? '').trim()));
  const ability = named ? named[0] : caster ? D.classes[caster.key].spellcasting.ability
    : ['INT', 'WIS', 'CHA'].reduce((a, b) => abilityMod(b.toLowerCase()) > abilityMod(a.toLowerCase()) ? b : a);
  const mod = abilityMod(ability.toLowerCase());
  return { class: caster?.name ?? null, ability, mod,
    attack: typeof c.spellAttack === 'number' ? c.spellAttack : mod + c.profBonus,
    dc: typeof c.spellDC === 'number' ? c.spellDC : 8 + mod + c.profBonus };
}

// What a spell rolls when cast with a given slot: cantrips scale with character level, leveled spells with the slot.
// -> { attack, dc, save, half, parts [{ n, d, flat, type }], heal { n, d, flat } | null, count, bonusText, text }
function spellRoll(s, slot = s.level) {
  const sc = character.spellcasting, extra = Math.max(0, slot - s.level), tier = cantripTier(character.level || 1);
  const ups = [].concat(s.up ?? []);
  const parts = (s.dmg || []).map(([dice, type], i) => {
    const p = { ...parseDice(dice), type }, up = ups[i] && parseDice(ups[i]);
    if (s.level === 0 && s.cantrip !== 'beams') p.n *= tier;
    if (up && extra) { p.n += up.n * extra; p.flat += up.flat * extra; }
    if (i === 0 && s.mod) p.flat += sc.mod;
    return p;
  });
  let heal = null;
  if (s.heal) {
    heal = parseDice(s.heal);
    const up = s.up && parseDice(ups[0]);
    if (up && extra) { heal.n += up.n * extra; heal.flat += up.flat * extra; }
    if (s.healMod) heal.flat += sc.mod;
  }
  const count = s.level === 0 && s.cantrip === 'beams' ? tier : (s.count || 1) + (s.upCount || 0) * extra;
  const bonusText = s.atk ? fmt(sc.attack) : s.save ? `DC ${sc.dc}` : '';
  const text = parts.map(p => `${diceText(p)} ${p.type}`).join(' + ') || (heal ? `${diceText(heal)} healing` : '');
  return { attack: s.atk ? sc.attack : null, dc: s.save ? sc.dc : null, save: s.save || null, half: !!s.half,
    parts, heal, count, bonusText, text: (count > 1 ? count + ' × ' : '') + text };
}

// Champion Fighters score a critical hit on 19 (level 3) or 18 (level 15)
function critRange() {
  const f = character.classes.find(x => x.key === 'fighter');
  if (!f || !/champion/i.test(`${character.classLevel ?? ''} ${character.subclass ?? ''}`)) return 20;
  return f.level >= 15 ? 18 : f.level >= 3 ? 19 : 20;
}

// Spell slots per level (index 0 = level 1) of a set of classes [{ key, level }]: one class uses its own table, two or more
// casters add up their caster levels (half casters round up); Warlock Pact Magic slots are added on top at their level.
function slotsFor(classes) {
  const casters = classes.filter(c => D.classes[c.key].spellcasting && D.classes[c.key].spellcasting.type !== 'pact');
  let slots = Array(9).fill(0);
  if (casters.length === 1) slots = [...D.classes[casters[0].key].levels[casters[0].level - 1].spells.slots];
  else if (casters.length > 1) {
    const cl = casters.reduce((t, c) => t + (D.classes[c.key].spellcasting.type === 'half' ? Math.ceil(c.level / 2) : c.level), 0);
    slots = [...D.rules.multiclass.slotsByCasterLevel[Math.min(20, cl) - 1]];
  }
  const w = classes.find(c => D.classes[c.key].spellcasting?.type === 'pact'), pact = w && D.classes[w.key].levels[w.level - 1].spells.pact;
  if (pact) slots[pact.slotLevel - 1] += pact.slots;
  return slots;
}

function findSpells(allText) {
  const found = new Map(), add = (spell, from) => { if (spell && !found.has(spell.name)) found.set(spell.name, { spell, from }); };
  for (const v of Object.values(fields)) if (typeof v === 'string' && v.length < 40) add(spellNamed(v), 'sheet');
  for (const [s, re] of SPELL_RES) if (re.test(allText)) add(s, 'sheet');
  const lineage = character.lineage;
  for (const t of lineage?.traits || []) if (t.lvl <= (character.level || 1)) add(spellNamed(t.name), character.speciesData.name);
  return [...found.values()].sort((a, b) => a.spell.level - b.spell.level || a.spell.name.localeCompare(b.spell.name));
}

// Adds the parts of the character that need the rules data: classes, level, feats, species, weapons, spellcasting.
function readGameData() {
  const c = character;
  c.classes = parseClasses(c.classLevel, c.level);
  c.level = c.classes.reduce((t, x) => t + x.level, 0) || (typeof c.level === 'number' ? c.level : null);
  if (typeof c.profBonus !== 'number') c.profBonus = D.rules.proficiencyBonusByLevel[Math.min(20, c.level || 1) - 1];
  const allText = Object.values(fields).filter(v => typeof v === 'string').join('\n');
  c.feats = findFeats(allText);
  c.speciesData = findEntry(c.race, D.species, speciesNames);
  c.lineage = c.speciesData && findEntry(c.race, c.speciesData.subspecies, s => s.name.split(': ').pop());
  c.backgroundData = findEntry(c.background, D.backgrounds);
  c.mods = Object.fromEntries(Object.keys(D.rules.abilities).map(ab => [ab, abilityMod(ab.toLowerCase())]));
  c.spellcasting = spellcasting();
  c.critRange = critRange();
  // A weapon line can also hold a spell (e.g. "Fire Bolt  +5  1d10 fire")
  c.weapons = weaponRows.map(r => {
    const name = String(currentValue(r.name) ?? '').trim();
    if (!name) return null;
    const spell = spellNamed(name), weapon = spell ? null : findEntry(name, WEAPONS);
    const magic = +(name.match(/\+\s*([1-3])\b/)?.[1] ?? 0);
    return { name, bonus: currentValue(r.bonus), damage: currentValue(r.damage), weapon, spell, magic,
      calc: weapon ? weaponAttack(weapon, magic) : spell ? spellRoll(spell) : null, fields: r };
  }).filter(Boolean);
  c.spells = findSpells(allText);
  const bgSkills = c.backgroundData?.proficiencies ?? [];
  c.skills = D.rules.skills.map(s => {
    const v = c['skill:' + s.name], sheet = typeof v === 'number';
    return { name: s.name, ability: s.ability, fromSheet: sheet,
      mod: sheet ? v : c.mods[s.ability] + (bgSkills.includes('Skill: ' + s.name) ? c.profBonus : 0) };
  });
  const saveProfs = c.classes[0] ? D.classes[c.classes[0].key].saves : [];
  c.saves = Object.entries(D.rules.abilities).map(([ab, full]) => {
    const v = c['save:' + ab], sheet = typeof v === 'number';
    return { ability: ab, name: full, fromSheet: sheet, mod: sheet ? v : c.mods[ab] + (saveProfs.includes(ab) ? c.profBonus : 0) };
  });
  c.initiativeMod = typeof c.initiative === 'number' ? c.initiative : c.mods.DEX + (c.feats.includes('Alert') ? c.profBonus : 0);
}

// Weapon lines: a text field whose name mentions a weapon/attack is the weapon's name, and the boxes to its right
// on the same line are its attack bonus and damage (by their names when they say so, otherwise left to right).
const WEAPONISH = /wpn|weapon|attack|atk/;
const roleOf = n => /atk|bonus|hit/.test(n) ? 'bonus' : /dam|dmg/.test(n) ? 'damage'
  : /notes|range|prop|type|weight|ammo|mastery/.test(n) ? null : 'name';
function findWeaponRows() {
  const single = Object.keys(meta).filter(n => meta[n].text && !meta[n].multi);
  const rows = [];
  for (const n of single.filter(n => WEAPONISH.test(norm(n)) && roleOf(norm(n)) === 'name')) {
    const m = meta[n], cy = m.y + m.h / 2;
    const line = single.filter(o => o !== n && meta[o].page === m.page && meta[o].x > m.x &&
      Math.abs(meta[o].y + meta[o].h / 2 - cy) < m.h * .6).sort((a, b) => meta[a].x - meta[b].x);
    const byName = role => line.find(o => WEAPONISH.test(norm(o)) && roleOf(norm(o)) === role);
    const rest = line.filter(o => !WEAPONISH.test(norm(o)));
    const bonus = byName('bonus') ?? rest.shift(), damage = byName('damage') ?? rest.shift();
    rows.push({ name: n, bonus, damage });
  }
  return rows.sort((a, b) => meta[a.name].page - meta[b.name].page || meta[a.name].y - meta[b.name].y);
}

// ---- Stats flow into the boxes that depend on them -----------------------------------------
// Each box worked out from other stats gets a rule: Stealth = DEX modifier + PB (if proficient), AC = armor + DEX, ...
// When a stat changes, the box moves by however much its rule moved, so anything else in it (expertise, a magic item,
// a feat) is kept. An ability score sets its modifier box outright; an empty box is filled in.
const ABILITIES = Object.keys(D.rules.abilities);
const numIn = v => { const m = String(v ?? '').match(/([+-]?)\s*(\d+)/); return m ? (m[1] === '-' ? -1 : 1) * +m[2] : null; };
const withPB = (k, pb) => k === .5 ? Math.floor(pb / 2) : k * pb;
// "+4" by 1 -> "+5", "DC 13" -> "DC 14", "12" by -1 -> "11"
const shiftNumber = (text, delta) => String(text).replace(/([+-]?)\s*(\d+)/, (m, sign, n) => {
  const v = (sign === '-' ? -1 : 1) * +n + delta;
  return sign || v < 0 ? fmt(v) : String(v);
});
// "1d8+3 slashing" by 1 -> "1d8+4 slashing": the number after the first dice (or the first number if there are no dice)
const shiftFlat = (text, delta) => /\d+d\d+/.test(text)
  ? String(text).replace(/(\d+d\d+)(?:\s*([+-])\s*(\d+)(?![\dd]))?/, (m, dice, sign, n) => {
    const v = (sign === '-' ? -1 : 1) * (+n || 0) + delta;
    return dice + (v ? fmt(v) : '');
  })
  : shiftNumber(text, delta);

// The proficiency checkbox printed just left of a skill or save box, on the same line (cached per sheet)
let profBoxes = {};
function profBoxOf(field) {
  if (field in profBoxes) return profBoxes[field];
  const m = meta[field], cy = m && m.y + m.h / 2;
  let best = null, gap = m ? m.h * 3 : 0;
  for (const [n, c] of Object.entries(meta)) {
    if (!c.check || c.page !== m.page || Math.abs(c.y + c.h / 2 - cy) > m.h * .6) continue;
    const g = m.x - (c.x + c.w);
    if (g >= -2 && g < gap) { best = n; gap = g; }
  }
  return profBoxes[field] = best;
}
const PROF_KEYS = [...D.rules.skills.map(s => 'skill:' + s.name), ...ABILITIES.map(ab => 'save:' + ab)];

function currentStats() {
  const c = character, profs = {};
  for (const key of PROF_KEYS) {
    const f = fieldOf[key], box = f && meta[f] && profBoxOf(f);
    if (box) profs[f] = !!currentValue(box);
  }
  return { scores: Object.fromEntries(ABILITIES.map(ab => [ab, c[ab.toLowerCase()]])), mods: { ...c.mods }, pb: c.profBonus,
    level: c.level || 1, levelPB: D.rules.proficiencyBonusByLevel[Math.min(20, c.level || 1) - 1], cast: c.spellcasting.ability, profs };
}

// How DEX (and CON or WIS for Unarmored Defense) count toward AC. Only used when the AC box fits the armor named on the
// sheet (or no armor) plus at most a Shield and Defense, so a wrong guess never touches AC.
function acRule(s) {
  const c = character, ac = numIn(c.ac);
  if (ac == null) return null;
  const text = Object.values(fields).filter(v => typeof v === 'string').join('\n');
  const worn = D.armor.filter(a => new RegExp('\\b' + escapeRe(a.name.replace(/ Armor$/, '')) + '\\b', 'i').test(text))
    .sort((a, b) => b.name.length - a.name.length);
  const barbarian = c.classes.some(x => x.key === 'barbarian'), monk = c.classes.some(x => x.key === 'monk');
  const options = [...worn.map(a => [a.ac, a.dex === 'full' ? t => t.mods.DEX : a.dex === 'max2' ? t => Math.min(t.mods.DEX, 2) : () => 0]),
    [10, t => t.mods.DEX + (barbarian ? t.mods.CON : 0) + (monk ? t.mods.WIS : 0)]];
  const fit = options.find(([base, part]) => ac - base - part(s) >= 0 && ac - base - part(s) <= 3);
  return fit ? fit[1] : null;
}

// The rules for the boxes on this sheet. k (how many times PB counts: 0, ½ for Jack of All Trades, 1, 2 for Expertise)
// comes from the proficiency checkbox when there is one, otherwise from the number already in the box.
function rulesFor(s) {
  const c = character, out = [];
  const bard = c.classes.some(x => x.key === 'bard' && x.level >= 2);
  const add = (key, base, { prof = true, half = false, kDefault = 0, fill = true, signed = true, profField } = {}) => {
    const field = fieldOf[key];
    if (!field || !els[field]) return;
    const pf = profField ?? field, box = pf in s.profs, v = numIn(currentValue(field)), diff = v == null ? null : v - base(s);
    const kFromValue = d => d === s.pb ? 1 : d === 2 * s.pb ? 2 : half && d === Math.floor(s.pb / 2) ? .5 : 0;
    let k = 0;
    if (prof && box) k = diff == null ? +s.profs[pf] : s.profs[pf] ? (diff >= 2 * s.pb ? 2 : 1) : kFromValue(diff) === .5 ? .5 : 0;
    else if (prof) k = diff == null ? kDefault : kFromValue(diff);
    const f = box ? t => base(t) + withPB(t.profs[pf] ? Math.max(k, 1) : k === .5 ? .5 : 0, t.pb) : t => base(t) + withPB(k, t.pb);
    out.push({ field, f, fill, signed });
  };
  const bgSkills = c.backgroundData?.proficiencies ?? [], saveProfs = c.classes[0] ? D.classes[c.classes[0].key].saves : [];
  for (const sk of D.rules.skills) add('skill:' + sk.name, t => t.mods[sk.ability], { half: bard, kDefault: +bgSkills.includes('Skill: ' + sk.name) });
  for (const ab of ABILITIES) add('save:' + ab, t => t.mods[ab], { kDefault: +saveProfs.includes(ab) });
  add('initiative', t => t.mods.DEX, { half: bard, kDefault: +c.feats.includes('Alert') });
  add('passivePerception', t => 10 + t.mods.WIS, { half: bard, signed: false, profField: fieldOf['skill:Perception'],
    kDefault: +bgSkills.includes('Skill: Perception') });
  const caster = c.classes.some(x => D.classes[x.key].spellcasting);
  add('spellAttack', t => t.mods[t.cast], { kDefault: 1, fill: caster });
  add('spellDC', t => 8 + t.mods[t.cast], { kDefault: 1, fill: caster, signed: false });
  if (c.level) add('profBonus', t => t.levelPB, { prof: false });
  const level = s.level;
  add('hpMax', t => t.mods.CON * level, { prof: false, fill: false, signed: false }); // CON counts once per level
  const ac = acRule(s);
  if (ac) add('ac', ac, { prof: false, fill: false, signed: false });
  return out;
}

let snap = null; // stats, rules and weapon lines as of the previous refresh
function takeSnapshot(prev) {
  const stats = currentStats(), changed = !!prev && JSON.stringify(prev.stats) !== JSON.stringify(stats);
  // While stats are changing the rules from before stay (their k must not be re-read from half-updated boxes);
  // once things settle they are read again, which also picks up boxes the user typed into.
  return { stats, changed, rules: changed ? prev.rules : rulesFor(stats),
    weapons: character.weapons.map(w => ({ name: w.name, fields: w.fields, calc: w.calc })) };
}

function propagate(prev, now) {
  let wrote = false;
  const write = (f, v) => { if (v !== currentValue(f)) { writeField(f, v); wrote = true; } };
  for (const ab of ABILITIES) {
    const score = now.stats.scores[ab], f = fieldOf[ab.toLowerCase() + 'Mod'];
    if (f && typeof score === 'number' && score !== prev.stats.scores[ab]) write(f, fmt(Math.floor((score - 10) / 2)));
  }
  if (now.changed) {
    for (const r of prev.rules) {
      const delta = r.f(now.stats) - r.f(prev.stats);
      if (!delta) continue;
      const cur = currentValue(r.field);
      if (numIn(cur) != null) write(r.field, shiftNumber(cur, delta));
      else if (r.fill) write(r.field, r.signed ? fmt(r.f(now.stats)) : String(r.f(now.stats)));
    }
  }
  // Weapon lines: the same weapon (or spell) worked out again
  const hit = x => x.toHit ?? x.attack ?? x.dc, flat = x => x.parts ? x.parts[0]?.flat ?? 0 : parseDice(x.damage).flat;
  for (const w of prev.weapons) {
    const n = now.weapons.find(x => x.fields.name === w.fields.name);
    if (!n || n.name !== w.name || !n.calc || !w.calc) continue;
    const { bonus, damage } = w.fields;
    if (bonus && hit(n.calc) !== hit(w.calc)) {
      const cur = currentValue(bonus);
      write(bonus, numIn(cur) == null ? n.calc.bonusText : shiftNumber(cur, hit(n.calc) - hit(w.calc)));
    }
    if (damage && n.calc.text !== w.calc.text) {
      const cur = String(currentValue(damage) ?? '');
      if (!cur.trim() || cur === w.calc.text) write(damage, n.calc.text);
      else if (flat(n.calc) !== flat(w.calc)) write(damage, shiftFlat(cur, flat(n.calc) - flat(w.calc)));
    }
  }
  return wrote;
}

// After picking a weapon (or an attack spell) for a weapon line, fill its attack bonus and damage boxes
function fillWeapon(row, calc) {
  for (const [f, v] of [[row.bonus, calc.bonusText], [row.damage, calc.text]]) {
    if (f) writeField(f, v);
  }
  refreshCharacter();
}

// Spell list lines: single-line text fields named like "Spells 1014" (not the DC / attack / slot boxes)
const isSpellField = n => meta[n].text && !meta[n].multi && /spell/.test(norm(n)) &&
  !/ability|dc|save|atk|attack|bonus|class|slot|total|remain|expend|level|prep|header|mod/.test(norm(n));

// Every spell line in sheet order with the spell level it is for: { field, level (0 = cantrips, null = any), row }.
// The official 2024 sheet is one table with a level column (row = its other boxes). Named sheets list spells in a block
// per level under that level's slots box, so a line's level is the slots box nearest above it in its column (none = cantrips).
function spellLines() {
  if (sheetMap) return sheetMap.spellRows.filter(r => r.name in raw).map(r => ({ field: r.name, level: null, row: r }));
  const heads = [];
  for (let l = 1; l <= 9; l++) { const f = fieldOf['slots' + l]; if (f && meta[f]) heads.push({ l, m: meta[f] }); }
  return Object.keys(meta).filter(isSpellField).map(n => {
    const m = meta[n], cx = h => h.m.x + h.m.w / 2;
    const above = heads.filter(h => h.m.page === m.page && h.m.y < m.y && cx(h) > m.x - m.w * .3 && cx(h) < m.x + m.w)
      .sort((a, b) => b.m.y - a.m.y)[0];
    return { field: n, level: heads.length ? above?.l ?? 0 : null };
  }).sort((a, b) => meta[a.field].page - meta[b.field].page || meta[a.field].x - meta[b.field].x || meta[a.field].y - meta[b.field].y);
}

// Write a spell on a spell line; on the official sheet also its level, casting time, range and C / R / M boxes
function writeSpellLine(line, s) {
  writeField(line.field, s.name);
  const r = line.row;
  if (r) {
    for (const [f, v] of [[r.level, String(s.level)], [r.time, s.time.split(/,| or /)[0]], [r.range, s.range.replace(/ feet\b/, ' ft')],
      [r.conc, !!s.conc], [r.ritual, !!s.ritual || /Ritual/.test(s.time)], [r.material, /\bM\b/.test(s.components)]]) {
      if (f) writeField(f, v);
    }
  }
}

const spellHint = s => {
  const r = spellRoll(s);
  return [s.level ? 'Level ' + s.level : 'Cantrip', r.bonusText, r.text].filter(Boolean).join(' · ');
};
// The character's own class spells first
function spellItems(filter = () => true) {
  const mine = new Set(character.classes.map(x => D.classes[x.key].name));
  return D.spells.filter(filter).map(s => ({ label: s.name, data: s, hint: spellHint(s), mine: s.classes.some(c => mine.has(c)) }))
    .sort((a, b) => b.mine - a.mine);
}

// ---- Suggestions while typing --------------------------------------------------
// source: { list() -> [{ label, hint, data }], token (complete only the part after the last "/" or ","), after(item) }
const box = Object.assign(document.createElement('ul'), { id: 'suggest', hidden: true });
document.body.appendChild(box);
let sug = null;

const rank = (label, q) => {
  const l = label.toLowerCase();
  return l.startsWith(q) ? 0 : l.split(/[\s(]+/).some(w => w.startsWith(q)) ? 1 : l.includes(q) ? 2 : -1;
};

function openSuggest(el, source) {
  const cut = source.token ? el.value.search(/[^/,;&+]*$/) : 0, q = el.value.slice(cut).trim().toLowerCase();
  const items = q ? source.list().map(it => ({ it, r: rank(it.label, q) })).filter(x => x.r >= 0)
    .sort((a, b) => a.r - b.r).slice(0, 8).map(x => x.it) : [];
  if (!items.length || items.length === 1 && items[0].label.toLowerCase() === q) return closeSuggest();
  sug = { el, source, items, cut, active: 0 };
  const r = el.getBoundingClientRect();
  Object.assign(box.style, { left: r.left + scrollX + 'px', top: r.bottom + scrollY + 2 + 'px', minWidth: Math.max(r.width, 200) + 'px' });
  renderSuggest();
  box.hidden = false;
}

function renderSuggest() {
  box.replaceChildren(...sug.items.map((it, i) => {
    const li = document.createElement('li'), b = document.createElement('b'), s = document.createElement('span');
    b.textContent = it.label; s.textContent = it.hint || '';
    li.append(b, s);
    li.classList.toggle('on', i === sug.active);
    li.addEventListener('mousedown', e => { e.preventDefault(); acceptSuggest(i); });
    li.addEventListener('mousemove', () => { if (sug.active !== i) { sug.active = i; renderSuggest(); } });
    return li;
  }));
}

function acceptSuggest(i) {
  const { el, source, items, cut } = sug, it = items[i];
  const before = el.value.slice(0, cut);
  closeSuggest();
  writeField(el.dataset.field, source.token ? before + (cut ? ' ' : '') + it.label + ' ' : it.label);
  refreshCharacter();
  source.after?.(it);
}

function closeSuggest() { sug = null; box.hidden = true; }

function suggestKey(e) {
  if (!sug || sug.el !== e.target) return;
  const n = sug.items.length;
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { sug.active = (sug.active + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; renderSuggest(); }
  else if (e.key === 'Enter' || e.key === 'Tab') acceptSuggest(sug.active);
  else if (e.key === 'Escape') closeSuggest();
  else return;
  e.preventDefault();
}

function attachSuggest(name, source) {
  for (const el of els[name] || []) {
    if (el.tagName !== 'INPUT' || el.type !== 'text') continue;
    el.autocomplete = 'off';
    el.addEventListener('input', () => { if (!writing) openSuggest(el, source); });
    el.addEventListener('keydown', suggestKey);
    el.addEventListener('blur', closeSuggest);
  }
}

function attachSuggesters() {
  // Weapons first, then spells that can go on an attack line (attack or save spells that deal damage)
  const weaponItems = () => [...WEAPONS.map(w => {
    const a = weaponAttack(w);
    return { label: w.name, calc: () => weaponAttack(w), hint: `${fmt(a.toHit)} · ${a.text}${a.proficient ? '' : ' (not proficient)'}` };
  }), ...spellItems(s => s.dmg && (s.atk || s.save) && !s.rider).map(it => ({ ...it, calc: () => spellRoll(it.data) }))];
  for (const row of weaponRows) attachSuggest(row.name, { list: weaponItems, after: it => fillWeapon(row, it.calc()) });
  for (const line of spellLines()) {
    attachSuggest(line.field, { list: () => spellItems(), after: it => { if (line.row) { writeSpellLine(line, it.data); refreshCharacter(); } } });
  }
  attachSuggest(fieldOf.classLevel, { token: true,
    list: () => Object.values(D.classes).map(c => ({ label: c.name, hint: `d${c.hitDie} · ${c.primaryAbility}` })) });
  attachSuggest(fieldOf.race, { list: () => D.species.flatMap(s => [
    { label: s.name, hint: s.brief ? s.source : `${s.size} · ${s.speed} ft${s.source ? ' · ' + s.source : ''}` },
    ...s.subspecies.map(l => ({ label: `${s.name} (${l.name.split(': ').pop()})`, hint: l.name.split(': ')[0] }))]) });
  attachSuggest(fieldOf.background, { list: () => D.backgrounds.map(b => ({ label: b.name, hint: `${b.abilityScores.join('/')} · ${b.feat}` })) });
}
// ---- end character data ----

// Extra things saved inside the PDF's metadata (the sheet mode, Killing Marble scores, your own effects ...).
// Other scripts read and change window.sheetState; 'sheet-loaded' fires once a PDF is open.
const STATE_KEY = 'DndSheetViewerState';
const sheetState = {};
// Scripts that add pages to the download (e.g. the Becoming Marble page): async (doc, PDFLib) => pages added at the end.
// Those pages are skipped when the PDF is opened again and replaced on the next download.
const pdfHooks = [];
let extraPages = 0;

const say = t => { $('status').textContent = t; };
const clean = s => s.replace(/[^\x20-\x7E\xA0-\xFF\n]/g, '?'); // Helvetica can only draw Latin-1

// ---- Undo / redo (Ctrl+Z, Ctrl+Y or Ctrl+Shift+Z) -------------------------------------
// One step = one thing you did: typing in one box (until you leave it) or a click on a checkbox, together with every box
// that followed it; or one action from code (level up, a rest, a spell slot: transaction()). A step holds each field's
// value before and after, and window.sheetState before and after when that changed. Changes to sheetState made outside a
// step (the effects tray, Killing Marble scores, concentration) become steps of their own, so the history stays in order:
// undoing a rest never throws away an effect added after it.
const history = { undo: [], redo: [] };
let step = null, replaying = false, stateMark = '{}'; // sheetState as of the last step
const fieldText = name => { const v = currentValue(name); return Array.isArray(v) ? v.join('\n') : v ?? ''; };
const changedStep = s => s.state || [...s.changes.values()].some(c => c.before !== c.after);
const stateJSON = () => JSON.stringify({ ...sheetState, extraPages: undefined }); // extraPages only matters to the download
const STATE_LABELS = { marble: 'Killing Marble', mode: 'Sheet mode', effects: 'Effects', concentration: 'Concentration',
  used: 'Class features', slotsUsed: 'Spell slots', hitDiceSpent: 'Hit Point Dice' };

function newStep(s) {
  history.undo.push(s);
  if (history.undo.length > 200) history.undo.shift();
  history.redo = [];
  return s;
}

// A change to sheetState since the last step becomes its own step (named after what changed)
function syncState() {
  if (replaying || step?.tx) return;
  const now = stateJSON();
  if (now === stateMark) return;
  const a = JSON.parse(stateMark), b = JSON.parse(now);
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])].filter(k => JSON.stringify(a[k]) !== JSON.stringify(b[k]));
  closeStep();
  newStep({ label: [...new Set(keys.map(k => STATE_LABELS[k] || k))].join(', '), changes: new Map(), state: { before: stateMark, after: now } });
  stateMark = now;
  undoButtons();
}

function record(name, before, after) {
  if (replaying || before === after) return;
  // your edit in another box starts a new step; boxes that follow it (written by code) join the step that is open
  if (!step || !writing && !step.tx && step.field !== name) {
    syncState();
    closeStep();
    step = newStep({ field: writing ? null : name, changes: new Map() });
    if (writing) { const s = step; queueMicrotask(() => { if (step === s) closeStep(); }); } // a write from code: its own step
  }
  const c = step.changes.get(name);
  if (c) c.after = after; else step.changes.set(name, { before, after });
  undoButtons();
}

function closeStep() {
  if (!step) return;
  if (!changedStep(step) && history.undo.includes(step)) history.undo.splice(history.undo.indexOf(step), 1);
  step = null;
  undoButtons();
}

// Group everything fn writes (to the sheet and to sheetState) into one step called label
function transaction(label, fn) {
  if (step?.tx) return fn(); // already inside one
  syncState();
  closeStep();
  const s = step = newStep({ tx: true, label, changes: new Map() }), before = stateJSON();
  try { return fn(); } finally {
    const after = stateJSON();
    if (after !== before) s.state = { before, after };
    stateMark = after;
    if (step === s) closeStep();
  }
}

// Put a step's values back (which = 'before' to undo, 'after' to redo). The boxes are set as they were, so nothing follows.
function replay(s, which) {
  replaying = true;
  for (const [name, c] of s.changes) writeField(name, c[which]);
  if (s.state) {
    const st = JSON.parse(s.state[which]);
    for (const k in sheetState) if (k !== 'extraPages') delete sheetState[k];
    Object.assign(sheetState, st);
    document.dispatchEvent(new CustomEvent('sheet-state-change'));
    window.effects?.changed();
    stateMark = stateJSON(); // after the redraws, which may fill in defaults
  }
  replaying = false;
  snap = null;
  refreshCharacter();
  undoButtons();
}

// What a step is called: "Level up", "STR", "Stealth" (by its stat key), else the field's own name
const KEY_LABELS = { hp: 'Current HP', hpMax: 'Max HP', hpTemp: 'Temp HP', classLevel: 'Class', ac: 'AC', profBonus: 'Proficiency Bonus',
  passivePerception: 'Passive Perception', hitDice: 'Hit Dice', hitDiceSpent: 'Hit Dice spent', race: 'Species', name: 'Name' };
function stepLabel(s) {
  if (s.label) return s.label;
  if (!s.field) return 'a change';
  const key = Object.keys(fieldOf).find(k => fieldOf[k] === s.field);
  if (!key) return s.field;
  return KEY_LABELS[key] || (/^(str|dex|con|int|wis|cha)$/.test(key) ? key.toUpperCase() : key.replace(/^skill:/, '').replace(/^save:(\w+)/, '$1 save'));
}
const stepText = s => {
  const more = s.changes.size - (s.field ? 1 : 0);
  return stepLabel(s) + (s.field && more > 0 ? ` (and ${more} box${more > 1 ? 'es' : ''} that followed)` : '');
};

function undo() {
  syncState();
  closeStep();
  const s = history.undo.pop();
  if (!s) return say('Nothing to undo.');
  replay(s, 'before');
  history.redo.push(s);
  say('Undone: ' + stepText(s) + '. Ctrl+Y brings it back.');
}
function redo() {
  if (stateJSON() !== stateMark) return syncState(); // something changed since: that is the newest step now, nothing to redo
  closeStep();
  const s = history.redo.pop();
  if (!s) return say('Nothing to redo.');
  replay(s, 'after');
  history.undo.push(s);
  say('Redone: ' + stepText(s) + '.');
}
function undoButtons() {
  const u = history.undo.findLast(changedStep), r = history.redo.at(-1);
  $('undo').disabled = !u; $('redo').disabled = !r;
  $('undo').title = u ? `Undo: ${stepLabel(u)} (Ctrl+Z)` : 'Undo (Ctrl+Z)';
  $('redo').title = r ? `Redo: ${stepLabel(r)} (Ctrl+Y)` : 'Redo (Ctrl+Y)';
  markUnsaved();
}

// ---- Unsaved changes: the Download button shows a dot, and closing the tab asks first -------------------------
let savedStamp = '';
const sameValue = (a, b) => String(Array.isArray(a) ? a.join('\n') : a ?? '') === String(Array.isArray(b) ? b.join('\n') : b ?? '');
const stamp = () => JSON.stringify([Object.entries(edits).filter(([n, e]) => !sameValue(e.value, raw[n])).map(([n, e]) => [n, e.value]),
  notes.filter(n => n.text.trim()).map(n => [n.page, n.x, n.y, n.text]), { ...sheetState, extraPages: 0 }]);
const unsaved = () => !!bytes && stamp() !== savedStamp;
function markUnsaved() {
  const u = unsaved();
  $('download').classList.toggle('unsaved', u);
  $('download').title = u ? 'You have changes that are not in a downloaded PDF yet' : '';
}

async function load(file) {
  if (!file || !/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') return say('Please choose a PDF file.');
  fileName = file.name.replace(/\.pdf$/i, '');
  bytes = new Uint8Array(await file.arrayBuffer());
  edits = {}; notes = []; setAddMode(false);
  $('pages').innerHTML = ''; raw = {}; els = {}; meta = {}; profBoxes = {}; snap = null; weaponRows = []; closeSuggest();
  history.undo = []; history.redo = []; step = null;
  say('Loading…');
  try {
    const pdf = await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    const info = await pdf.getMetadata().catch(() => null);
    let saved = {};
    try { saved = JSON.parse(info?.info?.Custom?.[STATE_KEY] || '{}'); } catch { /* not ours */ }
    for (const k in sheetState) delete sheetState[k];
    Object.assign(sheetState, saved);
    extraPages = Math.max(0, Math.min(+saved.extraPages || 0, pdf.numPages - 1));
    let fields = 0;
    for (let n = 1; n <= pdf.numPages - extraPages; n++) fields += await renderPage(await pdf.getPage(n), n - 1);
    sheetMap = detectSheet(pdf.numPages - extraPages);
    resolveFields();
    if (sheetMap) {
      for (const [key, box] of Object.entries(sheetMap.profChecks)) if (fieldOf[key]) profBoxes[fieldOf[key]] = box;
      weaponRows = sheetMap.weapons.filter(r => r[0] in raw).map(([name, bonus, damage]) => ({ name, bonus, damage }));
    } else weaponRows = findWeaponRows();
    attachSuggesters();
    const stats = refreshCharacter();
    console.log('PDF field names:', Object.keys(raw));
    console.log('Weapon lines (name / attack bonus / damage fields):', weaponRows);
    console.table(character);
    $('download').disabled = $('addText').disabled = false;
    document.dispatchEvent(new CustomEvent('sheet-loaded'));
    history.undo = []; history.redo = []; step = null; // boxes filled in while opening are not something to undo
    stateMark = stateJSON();
    savedStamp = stamp();
    undoButtons();
    say(fields ? `${sheetMap ? sheetMap.name.replace(/ \(.*/, '') + ': ' : ''}${fields} editable fields found, ${stats} stats and ${weaponRows.length} weapon lines read into "character". Click a field to change it.`
               : 'No form fields in this PDF. Use "+ Add text" to type anywhere on the sheet.');
  } catch (err) { console.error(err); say('Could not open that PDF: ' + err.message); }
}

async function renderPage(page, idx) {
  const vp = page.getViewport({ scale: SCALE }), dpr = Math.min((window.devicePixelRatio || 1) * 2, 3); // extra pixels keep it sharp when zoomed in
  const wrap = document.createElement('div'), canvas = document.createElement('canvas');
  wrap.className = 'page'; wrap.style.width = vp.width + 'px'; wrap.style.height = vp.height + 'px';
  canvas.width = vp.width * dpr; canvas.height = vp.height * dpr;
  canvas.style.width = vp.width + 'px'; canvas.style.height = vp.height + 'px';
  wrap.appendChild(canvas); $('pages').appendChild(wrap);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp,
    transform: [dpr, 0, 0, dpr, 0, 0], annotationMode: pdfjsLib.AnnotationMode.ENABLE_FORMS }).promise;

  let count = 0;
  for (const a of await page.getAnnotations()) {
    if (a.subtype === 'Widget' && a.fieldName) raw[a.fieldName] = a.checkBox ? !!a.fieldValue && a.fieldValue !== 'Off' : a.fieldValue;
    if (a.subtype !== 'Widget' || a.readOnly || a.pushButton || !a.fieldName) continue;
    const el = makeField(a); if (!el) continue;
    const [x1, y1, x2, y2] = vp.convertToViewportRectangle(a.rect), h = Math.abs(y2 - y1);
    const da = a.defaultAppearanceData && a.defaultAppearanceData.fontSize;
    el.className = 'field';
    el.style.cssText = `left:${Math.min(x1, x2)}px;top:${Math.min(y1, y2)}px;width:${Math.abs(x2 - x1)}px;height:${h}px;` +
      `font-size:${a.multiLine ? (da > 0 ? da * SCALE : 13) : Math.max(9, Math.min(da > 0 ? da * SCALE : h * .62, h * .85, 18))}px;` +
      `text-align:${['left', 'center', 'right'][a.textAlignment || 0]}`;
    el.dataset.field = a.fieldName;
    wrap.appendChild(el); count++;
    (els[a.fieldName] ||= []).push(el);
    meta[a.fieldName] ??= { page: idx, x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h,
      text: a.fieldType === 'Tx', multi: !!a.multiLine, check: !!a.checkBox };
  }
  wrap.addEventListener('click', e => {
    if (addMode && !e.target.closest('.field,.note')) addNote(wrap, idx, vp, e);
  });
  return count;
}

function makeField(a) {
  const name = a.fieldName, v = a.fieldValue;
  let el;
  if (a.fieldType === 'Tx') {
    el = document.createElement(a.multiLine ? 'textarea' : 'input');
    el.value = Array.isArray(v) ? v.join('\n') : (v ?? '');
    if (a.maxLen) el.maxLength = a.maxLen;
    el.addEventListener('input', () => { const before = fieldText(name); edits[name] = { type: 'text', value: el.value }; record(name, before, el.value); });
  } else if (a.fieldType === 'Btn' && a.checkBox) {
    el = document.createElement('input'); el.type = 'checkbox';
    el.checked = !!v && v !== 'Off';
    el.addEventListener('change', () => { const before = !!currentValue(name); edits[name] = { type: 'check', value: el.checked }; record(name, before, el.checked); });
  } else if (a.fieldType === 'Btn' && a.radioButton) {
    el = document.createElement('input'); el.type = 'radio'; el.name = name;
    el.checked = v === a.buttonValue;
    el.addEventListener('change', () => { if (el.checked) edits[name] = { type: 'choice', value: a.buttonValue }; });
  } else if (a.fieldType === 'Ch' && !a.multiSelect) {
    el = document.createElement('select');
    for (const o of a.options || []) el.add(new Option(o.displayValue, o.exportValue));
    el.value = Array.isArray(v) ? v[0] : (v ?? '');
    el.addEventListener('change', () => { edits[name] = { type: 'choice', value: el.value }; });
  }
  return el;
}

// Free text for flat PDFs or anything without a field
function addNote(wrap, idx, vp, e) {
  const r = wrap.getBoundingClientRect(), left = (e.clientX - r.left) / zoom, top = (e.clientY - r.top) / zoom - 10;
  const n = { page: idx, text: '', size: 11 };
  [n.x, n.y] = vp.convertToPdfPoint(left + 3, top + 16);
  const el = document.createElement('input');
  el.className = 'note';
  el.style.cssText = `left:${left}px;top:${top}px;font-size:${n.size * SCALE}px`;
  el.addEventListener('input', () => { n.text = el.value; el.style.width = Math.max(60, el.value.length * n.size * SCALE * .6 + 10) + 'px'; });
  el.addEventListener('blur', () => { if (!el.value.trim()) { el.remove(); notes = notes.filter(x => x !== n); } });
  wrap.appendChild(el); notes.push(n); el.focus(); setAddMode(false);
}

// Zoom: pages use the CSS --zoom value; keep the middle of the screen in place while it changes
function setZoom(pct) {
  const root = document.documentElement;
  const fx = (scrollX + innerWidth / 2) / (root.scrollWidth || 1), fy = (scrollY + innerHeight / 2) / (root.scrollHeight || 1);
  zoom = pct / 100;
  closeSuggest();
  root.style.setProperty('--zoom', zoom);
  $('zoom').value = pct;
  $('zoom').style.setProperty('--fill', (pct - 50) / 150);
  $('zoomPct').textContent = pct + '%';
  scrollTo(fx * root.scrollWidth - innerWidth / 2, fy * root.scrollHeight - innerHeight / 2);
}

function setAddMode(on) {
  addMode = on;
  $('addText').classList.toggle('on', on);
  $('pages').classList.toggle('adding', on);
  if (on) say('Click on the sheet where you want to type.');
}

async function download() {
  say('Building your PDF…');
  try {
    const doc = await PDFDocument.load(bytes, { ignoreEncryption: true }), form = doc.getForm();
    for (let i = 0; i < extraPages; i++) doc.removePage(doc.getPageCount() - 1); // added last time, rebuilt below
    let skipped = 0;
    for (const [name, ed] of Object.entries(edits)) {
      const apply = val => {
        const f = form.getField(name);
        if (ed.type === 'text') f.setText(val || undefined);
        else if (ed.type === 'check') ed.value ? f.check() : f.uncheck();
        else f.select(val);
      };
      try { apply(ed.value); }
      catch { try { apply(typeof ed.value === 'string' ? clean(ed.value) : ed.value); } catch (err) { skipped++; console.warn('Skipped', name, err); } }
    }
    const font = await doc.embedFont(StandardFonts.Helvetica), pages = doc.getPages();
    for (const n of notes) {
      if (n.text.trim()) pages[n.page].drawText(clean(n.text), { x: n.x, y: n.y, size: n.size, font, color: rgb(0, 0, 0) });
    }
    let added = 0;
    for (const hook of pdfHooks) added += (await hook(doc, PDFLib)) || 0;
    sheetState.extraPages = added;
    doc.getInfoDict().set(PDFLib.PDFName.of(STATE_KEY), PDFLib.PDFHexString.fromText(JSON.stringify(sheetState)));
    const out = await doc.save();
    savedStamp = stamp();
    markUnsaved();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([out], { type: 'application/pdf' }));
    a.download = fileName + '-edited.pdf';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    say(skipped ? `Downloaded, but ${skipped} field(s) couldn't be saved.` : 'Downloaded. Keep editing and download again any time.');
  } catch (err) { console.error(err); say('Could not save: ' + err.message); }
}

$('pages').addEventListener('input', () => { if (!writing) refreshCharacter(); });
$('pages').addEventListener('change', () => { if (!writing) refreshCharacter(); });
// leaving a box ends its undo step (typing in it again later is a new step)
$('pages').addEventListener('focusout', e => { if (step && !step.tx && step.field === e.target.dataset?.field) closeStep(); });
addEventListener('resize', closeSuggest);
// Ctrl+Z / Ctrl+Y on the sheet. Other text boxes (the roller, level up, the effects tray) keep their own undo.
addEventListener('keydown', e => {
  if (!(e.ctrlKey || e.metaKey) || e.altKey || !bytes) return;
  const k = e.key.toLowerCase(), back = k === 'z' && !e.shiftKey, fwd = k === 'y' || k === 'z' && e.shiftKey;
  if (!back && !fwd) return;
  const t = e.target;
  if (t.matches?.('input, textarea, select, [contenteditable]') && !t.classList.contains('field')) return;
  if (document.querySelector('.ask-back')) return; // a question is open
  e.preventDefault();
  back ? undo() : redo();
});
$('undo').addEventListener('click', undo);
$('redo').addEventListener('click', redo);
for (const ev of ['effects-change', 'resources-change', 'sheet-state-change']) document.addEventListener(ev, () => { syncState(); markUnsaved(); });
addEventListener('beforeunload', e => { if (unsaved()) { e.preventDefault(); e.returnValue = ''; } });
Object.assign(window, { character, fields, setStat, getField: currentValue, sheetState, pdfHooks,
  calc: { weaponAttack, spellRoll, parseDice, diceText, cantripTier, fmt, WEAPONS, slotsFor } }); // used by roller.js
// Reading and writing the sheet by stat key, for levelup.js. set() refreshes "character" (and the boxes that follow).
window.sheet = {
  get map() { return sheetMap; },
  get loaded() { return !!bytes; },
  transaction, undo, redo,
  field: key => fieldOf[key] ?? null,
  get: currentValue,
  set(name, value) { const ok = writeField(name, value); if (ok) refreshCharacter(); return ok; },
  profBox: key => fieldOf[key] && meta[fieldOf[key]] ? profBoxOf(fieldOf[key]) : null,
  multiline: name => !!meta[name]?.multi,
  spellLines,
  writeSpell(line, s) { writeSpellLine(line, s); refreshCharacter(); },
  spellNamed
};
$('file').addEventListener('change', e => { load(e.target.files[0]); e.target.value = ''; });
$('addText').addEventListener('click', () => setAddMode(!addMode));
$('zoom').addEventListener('input', e => setZoom(+e.target.value));
$('zoomPct').addEventListener('click', () => setZoom(100));
const zoomBy = step => setZoom(Math.max(50, Math.min(200, Math.round(zoom * 20 + step) * 5)));
$('zoomIn').addEventListener('click', () => zoomBy(2));
$('zoomOut').addEventListener('click', () => zoomBy(-2));
// Ctrl + mouse wheel zooms the sheet instead of the whole page
addEventListener('wheel', e => {
  if (!e.ctrlKey || !document.querySelector('.page')) return;
  e.preventDefault();
  zoomBy(e.deltaY < 0 ? 1 : -1);
}, { passive: false });
$('download').addEventListener('click', download);
addEventListener('dragover', e => { e.preventDefault(); document.body.classList.add('drag'); });
addEventListener('dragleave', e => { if (!e.relatedTarget) document.body.classList.remove('drag'); });
addEventListener('drop', e => { e.preventDefault(); document.body.classList.remove('drag'); load(e.dataTransfer.files[0]); });
refreshCharacter(); // an empty character, so the roller works before a sheet is loaded
})();