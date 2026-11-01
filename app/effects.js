/* Effects tray (bottom left): everything that currently changes your rolls, Speed or AC - conditions, spells on you (cast
   by someone else, or by you on yourself), debuffs you add yourself, and sources such as Killing Marble (marble.js).
   roller.js asks effects.forRoll() before every roll; the turn bar (turn.js) asks speed() and attacks().
   Your own effects and the spells on you are saved inside the PDF (window.sheetState.effects / .spellsOn), and so is
   concentration (sheetState.concentration).
   Concentration: one spell at a time, shown first in the tray. Anything that would end it (another concentration spell,
   an Incapacitating condition, Rage, damage, 0 HP) asks first and leaves the choice to you: you may only be trying things out.

   An effect: { name, detail, source: 'condition' | 'spell' | 'custom' | <source name>, removable, rules: [rule] }
   A rule:    { on: ['attack', 'damage', 'check', 'save'] (default: the three d20 rolls), ability: 'DEX', skill: 'Stealth', arm: 'left' | 'right',
                weapon: true (only attacks with a weapon or Unarmed Strike), spell: true (only spell attacks),
                mod: -2, dice: { n: 1, d: 4, sign: -1, type } (Bless, Bane),
                adv: true, dis: true, autoFail: true, nullifyDex: true (numeric DEX penalties stop counting),
                speed: { add: -10, half: true, double: true, zero: true, free: true (spells can't lower it) },
                ac: { add: 2, base: 13 (+ DEX, if higher: Mage Armor), min: 17 }, attacks: { add: 1, max: 1 }, unusable: true } */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const D = window.DND;
const D20 = ['attack', 'check', 'save'];
const ABILITIES = Object.keys(D.rules.abilities);
const fmt = n => (n < 0 ? '−' : '+') + Math.abs(n);
const sum = a => a.reduce((t, x) => t + x, 0);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return e;
};

// The 2024 conditions, with the parts that change your own rolls and speed
const CONDITIONS = {
  Blinded: { detail: "You can't see. Your attack rolls have Disadvantage; attacks against you have Advantage.", rules: [{ on: ['attack'], dis: true }] },
  Charmed: { detail: "You can't attack the charmer, who has Advantage on social checks against you.", rules: [] },
  Deafened: { detail: "You can't hear.", rules: [] },
  Exhaustion: { level: true, detail: 'D20 Tests −2 per level, Speed −5 ft per level. Level 6: you die.',
    rules: lvl => [{ mod: -2 * lvl }, { speed: { add: -5 * lvl } }] },
  Frightened: { detail: "Disadvantage on ability checks and attack rolls while the source is in sight; you can't move closer to it.", rules: [{ on: ['check', 'attack'], dis: true }] },
  Grappled: { detail: 'Speed 0. Disadvantage on attacks against anyone but the grappler.', rules: [{ speed: { zero: true } }] },
  Incapacitated: { incap: true, detail: "You can't take actions, Bonus Actions or Reactions, and can't concentrate.", rules: [] },
  Invisible: { detail: 'Advantage on Initiative and attack rolls; attacks against you have Disadvantage.', buff: true, rules: [{ on: ['attack'], adv: true }] },
  Paralyzed: { incap: true, detail: 'Incapacitated, Speed 0. You fail STR and DEX saves; hits from within 5 ft are critical hits.',
    rules: [{ speed: { zero: true } }, { on: ['save'], ability: 'STR', autoFail: true }, { on: ['save'], ability: 'DEX', autoFail: true }] },
  Petrified: { incap: true, detail: 'Turned to stone: Incapacitated, Speed 0, Resistance to all damage. You fail STR and DEX saves.',
    rules: [{ speed: { zero: true } }, { on: ['save'], ability: 'STR', autoFail: true }, { on: ['save'], ability: 'DEX', autoFail: true }] },
  Poisoned: { detail: 'Disadvantage on attack rolls and ability checks.', rules: [{ on: ['attack', 'check'], dis: true }] },
  Prone: { detail: 'Disadvantage on attack rolls; attacks from within 5 ft have Advantage against you.', rules: [{ on: ['attack'], dis: true }] },
  Restrained: { detail: 'Speed 0. Disadvantage on attack rolls and DEX saves.',
    rules: [{ speed: { zero: true } }, { on: ['attack'], dis: true }, { on: ['save'], ability: 'DEX', dis: true }] },
  Stunned: { incap: true, detail: 'Incapacitated. You fail STR and DEX saves; attacks against you have Advantage.',
    rules: [{ on: ['save'], ability: 'STR', autoFail: true }, { on: ['save'], ability: 'DEX', autoFail: true }] },
  Unconscious: { incap: true, detail: 'Incapacitated, Prone, Speed 0. You fail STR and DEX saves; hits from within 5 ft are critical hits.',
    rules: [{ speed: { zero: true } }, { on: ['save'], ability: 'STR', autoFail: true }, { on: ['save'], ability: 'DEX', autoFail: true }] }
};

// Class features that last a while (started with the roller's Rest tab buttons, rest.js, the turn bar, or added here by
// name). detail and rules may be functions (they read the sheet's modifiers). turn: it lasts until your next turn, so "New
// turn" ends it; once: 'attack' = your next attack roll uses it up.
const modOf = ab => Math.max(1, window.character?.mods?.[ab] ?? 0);
const STATES = {
  Raging: { buff: true, detail: 'Resistance to Bludgeoning, Piercing and Slashing damage; your Rage Damage on STR attacks (the attack cards switch it on); Advantage on STR checks and saves. No spells, no concentration.',
    rules: [{ on: ['check', 'save'], ability: 'STR', adv: true }] },
  Dodging: { buff: true, turn: true, detail: 'Until your next turn: attack rolls against you have Disadvantage, and you have Advantage on DEX saves.',
    rules: [{ on: ['save'], ability: 'DEX', adv: true }] },
  'Fighting Spirit': { buff: true, turn: true, detail: 'Advantage on weapon attack rolls this turn.', rules: [{ on: ['attack'], weapon: true, adv: true }] },
  'Steady Aim': { buff: true, turn: true, once: 'attack', detail: 'Advantage on your next attack roll this turn (it is used up by that roll).', rules: [{ on: ['attack'], adv: true }] },
  'Large Form': { buff: true, detail: '10 minutes: you are Large, have Advantage on STR checks, and your Speed is 10 ft higher.',
    rules: [{ on: ['check'], ability: 'STR', adv: true }, { speed: { add: 10 } }] },
  'Innate Sorcery': { buff: true, detail: '1 minute: your Sorcerer spell save DC is 1 higher, and your Sorcerer spell attack rolls have Advantage.',
    rules: [{ on: ['attack'], spell: true, adv: true }] },
  'Sacred Weapon': { buff: true, detail: () => `10 minutes: +${modOf('CHA')} to attack rolls with the melee weapon (CHA), which can deal Radiant damage and sheds Bright Light 20 ft.`,
    rules: () => [{ on: ['attack'], weapon: true, mod: modOf('CHA') }] },
  'Peerless Athlete': { buff: true, detail: '1 hour: Advantage on Athletics and Acrobatics checks; your jumps go 10 ft farther.',
    rules: [{ on: ['check'], skill: 'Athletics', adv: true }, { on: ['check'], skill: 'Acrobatics', adv: true }] },
  Bladesong: { buff: true, detail: () => `1 minute: +${modOf('INT')} AC, +10 ft Speed, Advantage on Acrobatics checks; INT for weapon attacks and damage, +INT to Concentration saves.`,
    rules: () => [{ ac: { add: modOf('INT') } }, { speed: { add: 10 } }, { on: ['check'], skill: 'Acrobatics', adv: true }] },
  'Wild Shape': { detail: "In a Beast form: its game statistics, your own HP and mind. You can't cast spells.", rules: [] },
  'Starry Form': { buff: true, detail: '10 minutes: Archer, Chalice or Dragon constellation (see your sheet).', rules: [] },
  'Superior Defense': { buff: true, detail: '1 minute: Resistance to all damage except Force.', rules: [] },
  'Vow of Enmity': { buff: true, detail: '1 minute: Advantage on attack rolls against the creature you vowed against.', rules: [] },
  'Elemental Attunement': { buff: true, detail: '10 minutes: Unarmed Strikes reach 10 ft farther and can deal Acid, Cold, Fire, Lightning or Thunder damage (STR save or moved 10 ft).', rules: [] }
};

// Spells on you (2024 rules, in our own words): what they do to your rolls, Speed, AC and attacks. pick: what the caster
// chooses ('ability', 'skill' or a list; ask = its label, labels = how list values read), given to detail / rules / buff
// when those are functions. incap: it makes you Incapacitated (asks about your concentration first). Any other spell
// can be added too, as a reminder.
const asCondition = (n, more = '') => ({ incap: CONDITIONS[n].incap, rules: CONDITIONS[n].rules, detail: `${n}: ${CONDITIONS[n].detail}${more}` });
const SAVE_ENDS = ab => ` ${ab} save at the end of each of your turns ends it.`;
const SPELLS_ON = {
  Aid: { buff: true, detail: 'Hit Point maximum and current Hit Points +5 (+5 more per slot level above 2): change the HP boxes yourself.' },
  Bane: { detail: '−1d4 on attack rolls and saving throws.', rules: [{ on: ['attack', 'save'], dice: { n: 1, d: 4, sign: -1 } }] },
  Barkskin: { buff: true, detail: 'Your AC is at least 17.', rules: [{ ac: { min: 17 } }] },
  'Beacon of Hope': { buff: true, detail: 'Advantage on WIS saves and Death Saving Throws; healing you get is the most it can be.',
    rules: [{ on: ['save'], ability: 'WIS', adv: true }] },
  'Bestow Curse': { pick: [...ABILITIES, 'attacks', 'dodge', 'damage'], ask: 'Curse',
    labels: { attacks: 'Attacks on the caster', dodge: 'Dodge each turn', damage: 'Extra damage' },
    detail: p => ({ attacks: 'Disadvantage on attack rolls against the caster.', dodge: 'At the start of each of your turns: WIS save, or you take the Dodge action.',
      damage: "The caster's attack rolls and spells that damage you deal an extra 1d8 Necrotic." })[p] ||
      `Disadvantage on ${D.rules.abilities[p]} checks and saving throws.`,
    rules: p => ABILITIES.includes(p) ? [{ on: ['check', 'save'], ability: p, dis: true }] : [] },
  'Blindness/Deafness': { pick: ['Blinded', 'Deafened'], ask: 'Condition', detail: p => asCondition(p, SAVE_ENDS('CON')).detail, rules: p => CONDITIONS[p].rules },
  Bless: { buff: true, detail: '+1d4 on attack rolls and saving throws.', rules: [{ on: ['attack', 'save'], dice: { n: 1, d: 4 } }] },
  Blur: { buff: true, detail: 'Attack rolls against you have Disadvantage (not from Blindsight or Truesight).' },
  'Charm Person': { detail: "Charmed: the caster is Friendly to you, until it ends or the caster's side damages you." },
  'Chill Touch': { detail: "You can't regain Hit Points until the end of the caster's next turn." },
  'Compelled Duel': { detail: 'Disadvantage on attack rolls against anyone but the caster; a WIS save to move more than 30 ft away from the caster.' },
  "Crusader's Mantle": { buff: true, detail: 'Your weapon and Unarmed Strike hits deal an extra 1d4 Radiant damage (while in the aura).',
    rules: [{ on: ['damage'], weapon: true, dice: { n: 1, d: 4, type: 'radiant' } }] },
  Darkvision: { buff: true, detail: 'Darkvision 150 ft.' },
  'Death Ward': { buff: true, detail: 'The first time you would drop to 0 Hit Points you drop to 1 instead, and an effect that would kill you outright without damage fails. Either ends it.' },
  'Enhance Ability': { buff: true, pick: ABILITIES.filter(a => a !== 'CON'), ask: 'Ability', detail: p => `Advantage on ${D.rules.abilities[p]} checks.`,
    rules: p => [{ on: ['check'], ability: p, adv: true }] },
  'Enlarge/Reduce': { pick: ['Enlarge', 'Reduce'], ask: 'Which', buff: p => p !== 'Reduce',
    detail: p => p === 'Reduce' ? 'One size smaller. Disadvantage on STR checks and saves; your weapon and Unarmed Strike hits deal 1d4 less damage (at least 1).'
      : 'One size larger. Advantage on STR checks and saves; your weapon and Unarmed Strike hits deal 1d4 more damage.',
    rules: p => [{ on: ['check', 'save'], ability: 'STR', [p === 'Reduce' ? 'dis' : 'adv']: true },
      { on: ['damage'], weapon: true, dice: { n: 1, d: 4, sign: p === 'Reduce' ? -1 : 1 } }] },
  Entangle: asCondition('Restrained', ' An action and a STR (Athletics) check against the spell save DC frees you.'),
  'Expeditious Retreat': { buff: true, detail: 'You can take the Dash action as a Bonus Action.' },
  'Faerie Fire': { detail: "Attack rolls against you have Advantage if the attacker can see you; you can't be Invisible." },
  Fear: asCondition('Frightened', ' On your turns you Dash away from the caster.'),
  'Feather Fall': { buff: true, detail: 'You fall 60 ft per round and take no damage from the fall.' },
  Fly: { buff: true, detail: 'Fly Speed 60 ft; you can hover. When it ends you fall if you are still in the air.' },
  Foresight: { buff: true, detail: 'Advantage on D20 Tests; attack rolls against you have Disadvantage.', rules: [{ adv: true }] },
  'Freedom of Movement': { buff: true, rules: [{ speed: { free: true } }],
    detail: "Difficult Terrain costs no extra movement; magic can't lower your Speed or make you Paralyzed or Restrained; Swim Speed equal to your Speed; 5 ft of movement frees you from nonmagical restraints or a grapple." },
  'Greater Invisibility': { buff: true, ...asCondition('Invisible') },
  Guidance: { buff: true, pick: 'skill', ask: 'Skill', detail: p => `+1d4 on ${p} checks.`, rules: p => [{ on: ['check'], skill: p, dice: { n: 1, d: 4 } }] },
  Haste: { buff: true, rules: [{ speed: { double: true } }, { ac: { add: 2 } }, { on: ['save'], ability: 'DEX', adv: true }, { attacks: { add: 1 } }],
    detail: 'Speed doubled, +2 AC, Advantage on DEX saves, and one more action on each of your turns (one weapon attack, Dash, Disengage, Hide or Utilize). When it ends: Incapacitated and Speed 0 until the end of your next turn.' },
  'Heat Metal': { detail: "While you keep holding or wearing the hot metal: Disadvantage on attack rolls and ability checks until the start of the caster's next turn.",
    rules: [{ on: ['attack', 'check'], dis: true }] },
  Heroism: { buff: true, detail: "Immune to Frightened; Temp HP equal to the caster's spellcasting modifier at the start of each of your turns." },
  "Heroes' Feast": { buff: true, detail: 'For 24 hours: Resistance to Poison damage, immune to Frightened and Poisoned, Hit Point maximum and current HP +2d10 (change the HP boxes yourself).' },
  Hex: { pick: 'ability', ask: 'Ability', detail: p => `Disadvantage on ${D.rules.abilities[p]} checks; the caster's hits deal you an extra 1d6 Necrotic.`,
    rules: p => [{ on: ['check'], ability: p, dis: true }] },
  'Hideous Laughter': { incap: true, rules: CONDITIONS.Prone.rules,
    detail: "Prone and Incapacitated with laughter; you can't stand up. A WIS save at the end of each of your turns, and when you take damage (with Advantage), ends it." },
  'Hold Monster': asCondition('Paralyzed', SAVE_ENDS('WIS')),
  'Hold Person': asCondition('Paralyzed', SAVE_ENDS('WIS')),
  'Holy Aura': { buff: true, detail: 'Advantage on saving throws; attack rolls against you have Disadvantage (while in the aura).', rules: [{ on: ['save'], adv: true }] },
  Invisibility: { buff: true, ...asCondition('Invisible', ' It ends right after you make an attack roll, deal damage or cast a spell.') },
  Jump: { buff: true, detail: 'Once on each of your turns you can jump up to 30 ft for 10 ft of movement.' },
  Longstrider: { buff: true, detail: 'Speed +10 ft.', rules: [{ speed: { add: 10 } }] },
  'Mage Armor': { buff: true, detail: 'Base AC 13 + DEX while you wear no armor (it ends if you put armor on).', rules: [{ ac: { base: 13 } }] },
  'Mind Blank': { buff: true, detail: "Immune to Psychic damage and Charmed; magic can't read your thoughts, find you, watch you or control your mind." },
  'Pass without Trace': { buff: true, detail: '+10 to DEX (Stealth) checks and no tracks, while in the aura.', rules: [{ on: ['check'], skill: 'Stealth', mod: 10 }] },
  'Protection from Energy': { buff: true, pick: ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'], ask: 'Damage type', detail: p => `Resistance to ${p} damage.` },
  'Protection from Evil and Good': { buff: true,
    detail: "Aberrations, Celestials, Elementals, Fey, Fiends and Undead have Disadvantage on attack rolls against you and can't Charm, Frighten or possess you." },
  'Protection from Poison': { buff: true, detail: 'Advantage on saves to avoid or end Poisoned; Resistance to Poison damage.' },
  'Ray of Enfeeblement': { detail: 'Disadvantage on STR checks, saves and attack rolls; −1d8 on your damage rolls.' + SAVE_ENDS('CON'),
    rules: [{ ability: 'STR', dis: true }, { on: ['damage'], dice: { n: 1, d: 8, sign: -1 } }] },
  'Ray of Frost': { detail: "Speed −10 ft until the start of the caster's next turn.", rules: [{ speed: { add: -10 } }] },
  Resistance: { buff: true, pick: ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Radiant', 'Slashing', 'Thunder'],
    ask: 'Damage type', detail: p => `${p} damage you take is 1d4 less (once per turn).` },
  Sanctuary: { buff: true, detail: 'Whoever targets you with an attack or a damaging spell makes a WIS save or must pick another target. It ends if you attack, cast a spell or deal damage.' },
  'See Invisibility': { buff: true, detail: 'You see Invisible creatures and objects, and into the Ethereal Plane.' },
  Shield: { buff: true, detail: '+5 AC until the start of your next turn; no damage from Magic Missile.', rules: [{ ac: { add: 5 } }] },
  'Shield of Faith': { buff: true, detail: '+2 AC.', rules: [{ ac: { add: 2 } }] },
  Sleep: { incap: true, detail: 'Incapacitated until the end of your next turn, then a WIS save or Unconscious. Taking damage, or someone shaking you, ends it.' },
  Slow: { rules: [{ speed: { half: true } }, { ac: { add: -2 } }, { on: ['save'], ability: 'DEX', mod: -2 }, { attacks: { max: 1 } }],
    detail: 'Speed halved, −2 AC and DEX saves, no Reactions; an action or a Bonus Action on your turn (not both) and only one attack with the Attack action; a spell with a Somatic component may fail (25%).' + SAVE_ENDS('WIS') },
  'Spider Climb': { buff: true, detail: 'Climb Speed equal to your Speed; you can move on walls and ceilings with your hands free.' },
  Stoneskin: { buff: true, detail: 'Resistance to Bludgeoning, Piercing and Slashing damage.' },
  'Warding Bond': { buff: true, rules: [{ ac: { add: 1 } }, { on: ['save'], mod: 1 }],
    detail: '+1 AC and saving throws and Resistance to all damage within 60 ft of the caster, who takes the same damage you take.' },
  'Water Breathing': { buff: true, detail: 'You can breathe underwater.' },
  Web: asCondition('Restrained', ' An action and a STR (Athletics) check against the spell save DC frees you.')
};
const picksOf = t => t?.pick === 'ability' ? ABILITIES : t?.pick === 'skill' ? D.rules.skills.map(s => s.name) : t?.pick || null;
const pickLabel = (t, p) => t?.labels?.[p] || D.rules.abilities[p] || p;
const allSpells = () => [...D.spells, ...D.spellListOnly || []];
const spellData = name => { const n = String(name ?? '').trim().toLowerCase(); return allSpells().find(s => s.name.toLowerCase() === n || (s.aliases || []).some(a => a.toLowerCase() === n)); };
// The name as the data has it ("tasha's hideous laughter" -> Hideous Laughter), else as typed
const canonical = name => { const t = String(name ?? '').trim(); return Object.keys(SPELLS_ON).find(k => k.toLowerCase() === t.toLowerCase()) || spellData(t)?.name || t; };
const isConc = name => !!spellData(name)?.conc;

// What your own effects can do: target -> rule base
const TARGETS = {
  all: ['all d20 rolls', { on: D20 }], attack: ['attack rolls', { on: ['attack'] }], damage: ['damage rolls', { on: ['damage'] }],
  check: ['ability checks', { on: ['check'] }], save: ['saving throws', { on: ['save'] }],
  ...Object.fromEntries(['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].map(ab => [ab, [ab + ' rolls', { on: ['check', 'save'], ability: ab }]]))
};
const KINDS = { note: 'Just a reminder', dis: 'Disadvantage on', adv: 'Advantage on', mod: 'Bonus or penalty to', speed: 'Speed change (ft)' };

const providers = [];             // functions returning computed effects, e.g. Killing Marble
const own = () => (window.sheetState.effects ||= []);

// A saved effect ({ name, kind, target, value, level }) -> an effect with rules
function compile(x) {
  const c = CONDITIONS[x.name];
  if (c) {
    const lvl = Math.max(1, Math.min(6, +x.level || 1));
    return { name: c.level ? `${x.name} ${lvl}` : x.name, detail: c.detail, source: 'condition', removable: true, saved: x, buff: c.buff,
      rules: typeof c.rules === 'function' ? c.rules(lvl) : c.rules };
  }
  const f = STATES[x.name], of = v => typeof v === 'function' ? v() : v;
  if (f) return { name: x.name, detail: of(f.detail) + (f.turn ? ' (New turn ends it.)' : ''), source: 'feature', removable: true, saved: x, buff: f.buff, rules: of(f.rules) };
  const [label, base] = TARGETS[x.target] || TARGETS.all, v = +x.value || 0;
  const rule = x.kind === 'dis' ? { ...base, dis: true } : x.kind === 'adv' ? { ...base, adv: true }
    : x.kind === 'mod' ? { ...base, mod: v } : x.kind === 'speed' ? { speed: { add: v } } : null;
  const what = x.kind === 'note' ? '' : x.kind === 'speed' ? `Speed ${fmt(v)} ft` : x.kind === 'mod' ? `${fmt(v)} to ${label}` : `${KINDS[x.kind]} ${label}`;
  return { name: x.name, detail: [what, x.detail].filter(Boolean).join(' · '), source: 'custom', removable: true, saved: x,
    buff: x.kind === 'adv' || x.kind === 'mod' && v > 0, rules: rule ? [rule] : [] };
}

// The spells on you: { name, by (who cast it), pick, mine (you cast it) }. One you cast and concentrate on lasts as long
// as your concentration (concentrate() drops it, and it isn't counted meanwhile).
const spellsOn = () => window.sheetState.spellsOn || [];
const setSpellsOn = list => { if (list.length) window.sheetState.spellsOn = list; else delete window.sheetState.spellsOn; };
const lasting = x => !(x.mine && isConc(x.name)) || conc()?.name === x.name;
function compileSpell(x) {
  const t = SPELLS_ON[x.name], s = spellData(x.name), of = v => typeof v === 'function' ? v(x.pick) : v;
  const by = x.mine ? (isConc(x.name) ? 'Cast by you, while you concentrate' : 'Cast by you') : x.by ? `From ${x.by}` : null;
  return { name: x.pick != null ? `${x.name} (${pickLabel(t, x.pick)})` : x.name, meta: [by, s?.duration || (s?.conc ? 'Concentration' : null)].filter(Boolean).join(' · '),
    detail: t ? of(t.detail) : 'No automatic effect: listed as a reminder.', source: 'spell', plain: !t, removable: true, saved: x,
    buff: !!of(t?.buff), incap: !!t?.incap, rules: of(t?.rules) || [] };
}

const active = () => [...providers.flatMap(p => p() || []), ...spellsOn().filter(lasting).map(compileSpell), ...own().map(compile)];
const spellOn = name => spellsOn().some(x => x.name === name && lasting(x));

// What applies to one roll: { kind: 'attack' | 'damage' | 'check' | 'save', ability, skill, arms: ['right', 'left'], weapon: true }
function forRoll(roll) {
  const res = { mod: 0, parts: [], dice: [], adv: [], dis: [], autoFail: [], notes: [] };
  const applies = r => !r.speed && !r.ac && !r.attacks && (r.on || D20).includes(roll.kind) && (!r.ability || r.ability === roll.ability) &&
    (!r.skill || r.skill === roll.skill) && (!r.arm || (roll.arms || []).includes(r.arm)) && (!r.weapon || roll.weapon) && (!r.spell || roll.spell);
  const fx = active();
  const nullify = fx.some(e => e.rules.some(r => r.nullifyDex && applies(r)));
  for (const e of fx) {
    for (const r of e.rules) {
      if (!applies(r)) continue;
      if (r.mod && !(nullify && r.ability === 'DEX' && r.mod < 0)) { res.mod += r.mod; res.parts.push({ name: e.name, mod: r.mod }); }
      if (r.dice) res.dice.push({ name: e.name, n: r.dice.n, d: r.dice.d, sign: r.dice.sign || 1, type: r.dice.type });
      if (r.adv) res.adv.push(e.name);
      if (r.dis) res.dis.push(e.name);
      if (r.autoFail) res.autoFail.push(e.name);
      if (r.unusable) res.notes.push(`${e.name}: this arm can't be used`);
    }
  }
  return res;
}

// Speed after effects: plain additions first (Longstrider, Exhaustion), then halved or doubled (Slow, Haste: once each),
// then the additions that come with a halving (Killing Marble legs: "halved and −10 ft"); 0 wins. Freedom of Movement:
// spells can't lower it.
function speed(base) {
  let rules = active().flatMap(e => e.rules.filter(r => r.speed).map(r => ({ ...r.speed, name: e.name, magic: e.source === 'spell' })));
  if (rules.some(r => r.free)) rules = rules.filter(r => !r.free && !(r.magic && (r.half || r.zero || r.add < 0)));
  const by = [...new Set(rules.map(r => r.name))];
  if (!rules.length || typeof base !== 'number') return { value: base, changed: rules.length > 0, by };
  const scaled = r => r.half || r.double;
  let v = base + sum(rules.filter(r => !scaled(r)).map(r => r.add || 0));
  v = Math.floor(v * (rules.some(r => r.double) ? 2 : 1) / (rules.some(r => r.half) ? 2 : 1));
  v += sum(rules.filter(scaled).map(r => r.add || 0));
  if (rules.some(r => r.zero)) v = 0;
  return { value: Math.max(0, v), changed: true, by };
}

// AC after effects: Mage Armor's 13 + DEX if that is more than the sheet's, then bonuses (Shield of Faith, Haste, Slow),
// then a floor (Barkskin)
function ac(base) {
  const rules = active().flatMap(e => e.rules.filter(r => r.ac).map(r => ({ ...r.ac, name: e.name })));
  const by = [...new Set(rules.map(r => r.name))];
  if (!rules.length || typeof base !== 'number') return { value: base, changed: rules.length > 0, by };
  const dex = window.character?.mods?.DEX ?? 0;
  let v = Math.max(base, ...rules.filter(r => r.base != null).map(r => r.base + dex));
  v += sum(rules.map(r => r.add || 0));
  v = Math.max(v, ...rules.filter(r => r.min != null).map(r => r.min));
  return { value: v, changed: true, by };
}

// Attacks per Attack action: Extra Attack from any class or subclass (they don't stack), the Fighter's Two / Three Extra
// Attacks, a Warlock's Thirsting Blade (Devouring Blade at 12) named on the sheet; then effects (Haste +1, Slow: one)
function attacks() {
  const c = window.character || {};
  let base = 1;
  for (const cl of c.classes || []) {
    const data = D.classes[cl.key];
    if (!data) continue;
    base = Math.max(base, data.levels?.[cl.level - 1]?.attacks || 1);
    if ([...data.features || [], ...cl.sub?.features || []].some(f => f.name === 'Extra Attack' && f.lvl <= cl.level)) base = Math.max(base, 2);
  }
  const lock = (c.classes || []).find(x => x.key === 'warlock');
  if (lock?.level >= 5 && base < 3) {
    const text = Object.values(window.fields || {}).filter(v => typeof v === 'string').join('\n');
    if (lock.level >= 12 && /\bDevouring Blade\b/i.test(text)) base = 3;
    else if (/\bThirsting Blade\b/i.test(text)) base = Math.max(base, 2);
  }
  const rules = active().flatMap(e => e.rules.filter(r => r.attacks).map(r => ({ ...r.attacks, name: e.name })));
  let v = base + sum(rules.map(r => r.add || 0));
  const caps = rules.filter(r => r.max != null).map(r => r.max);
  if (caps.length) v = Math.min(v, ...caps);
  return { base, value: v, by: rules.map(r => r.max != null ? `${r.name}: only ${r.max}` : `${r.name} ${fmt(r.add)}`) };
}

// Class feature states (STATES), and conditions by name: on or off
const hasState = name => own().some(x => x.name === name);
function setState(name, on) {
  if (on === hasState(name)) return;
  if (on) own().push({ name }); else window.sheetState.effects = own().filter(x => x.name !== name);
  if (!own().length) delete window.sheetState.effects;
  changed();
}
// Drop the states that end now: at the start of your turn ("New turn" in turn.js: Dodging ...), or after the roll that
// uses them up (roller.js, rolled('attack'): Steady Aim)
function endStates(test) {
  const gone = own().filter(x => STATES[x.name] && test(STATES[x.name]));
  if (!gone.length) return;
  window.sheetState.effects = own().filter(x => !gone.includes(x));
  if (!own().length) delete window.sheetState.effects;
  changed();
}
const startTurn = () => endStates(s => s.turn);
const rolled = kind => endStates(s => s.once === kind);

// ---- Concentration ----------------------------------------------------------------
const conc = () => window.sheetState.concentration || null;
const concSpell = name => D.spells.find(s => s.conc && s.name.toLowerCase() === String(name ?? '').trim().toLowerCase());
let lastCheck = null, check = null; // the last concentration save { total, dc, kept }; the save being rolled { name, dc }

// Start concentrating on a spell (or any name), or stop with null. Stored as { name, slot, duration }
function concentrate(name, slot = null) {
  const s = name && concSpell(name);
  window.sheetState.concentration = name ? { name: s ? s.name : name, slot, duration: s ? s.duration.replace(/^Concentration, /, '') : null } : null;
  lastCheck = null;
  setSpellsOn(spellsOn().filter(lasting)); // a spell you cast on yourself ends with your concentration on it
  changed();
}

// Before doing something that ends concentration: Cancel (null), do it and keep concentrating ('keep'), or do it and end
// concentration ('end', ended here). 'none' when you aren't concentrating.
async function interrupt(doing, why, endLabel) {
  const c = conc();
  if (!c) return 'none';
  const a = await window.ask({ title: `Concentrating on ${c.name}`, text: why,
    buttons: [{ label: 'Cancel', value: null }, { label: `${doing}, keep ${c.name}`, value: 'keep' },
      { label: endLabel || `${doing}, end ${c.name}`, value: 'end', primary: true }] });
  if (a === 'end') concentrate(null);
  return a;
}

// After something that ends concentration by the rules has happened: end it, or keep it anyway
async function askEnd(title, why) {
  const c = conc();
  if (!c) return;
  const a = await window.ask({ title, text: `${why} That ends concentration on ${c.name}.`,
    buttons: [{ label: `Keep ${c.name}`, value: 'keep' }, { label: 'End concentration', value: 'end', primary: true }] });
  if (a === 'end' && conc() === c) concentrate(null);
}

// Damage while concentrating: lowering Current or Temp HP on the sheet offers the CON save (DC 10 or half the damage,
// up to 30). Compared with the value when the box got focus, so typing a number digit by digit doesn't count.
const hpBefore = {};
const hpField = el => {
  const f = el?.dataset?.field;
  return f && window.sheet && [window.sheet.field('hp'), window.sheet.field('hpTemp')].includes(f) ? f : null;
};
document.addEventListener('focusin', e => { const f = hpField(e.target); if (f) hpBefore[f] = parseInt(e.target.value, 10); });
document.addEventListener('change', e => {
  const f = hpField(e.target);
  if (!f) return;
  const before = hpBefore[f], now = parseInt(e.target.value, 10);
  hpBefore[f] = now;
  if (conc() && before > now) damaged(before - now, f === window.sheet.field('hp') && now <= 0);
});

async function damaged(dmg, down) {
  const c = conc();
  if (down) return askEnd(`Concentrating on ${c.name}`, 'At 0 Hit Points you fall Unconscious.');
  const input = h('input', { type: 'number', min: 1, value: dmg }), dcText = h('b');
  const dcOf = () => Math.min(30, Math.max(10, Math.floor((+input.value || 0) / 2)));
  const update = () => { dcText.textContent = 'DC ' + dcOf(); };
  input.addEventListener('input', update);
  update();
  const a = await window.ask({ title: `Concentrating on ${c.name}`, text: 'You took damage, so you make a Constitution save to keep concentrating.',
    body: h('div', { class: 'ask-body' }, h('label', {}, 'Damage taken', input),
      h('p', {}, 'Constitution save ', dcText, ': 10, or half the damage if that is more. A hit that went partly through Temp HP is one hit: put all of its damage here.')),
    buttons: [{ label: 'Not now', value: null }, { label: 'Roll CON save', value: 'roll', primary: true }] });
  if (a !== 'roll') return;
  check = { name: c.name, dc: dcOf() };
  window.roller.save('CON', `Concentration: ${c.name} (DC ${check.dc})`, 'concentration');
}

// The concentration save (and any "Again" of it in the log): a failure asks whether to end concentration
document.addEventListener('test-rolled', ({ detail: r }) => {
  if (r.purpose !== 'concentration' || !check) return;
  const failed = r.autoFail || r.total < check.dc, c = conc();
  lastCheck = { total: r.total, dc: check.dc, kept: !failed };
  render();
  if (failed && c?.name === check.name) askEnd('Concentration save failed', `You rolled ${r.total} against DC ${check.dc}.`);
});

// ---- Tray -------------------------------------------------------------------------
const tray = $('effects');
// tab: which kind of thing the "+ Add" form adds ('effect' or 'spell'); sdraft: the spell being added
let open = true, adding = false, tab = 'effect', draft = { kind: 'dis', target: 'all', value: -1 }, sdraft = {};

function changed() {
  render();
  document.dispatchEvent(new CustomEvent('effects-change'));
}

function render() {
  const fx = active(), c = window.character || {}, con = conc();
  const sp = speed(typeof c.speed === 'number' ? c.speed : null), armor = ac(typeof c.ac === 'number' ? c.ac : null);
  const spells = fx.filter(e => e.source === 'spell'), rest = fx.filter(e => e.source !== 'spell');
  tray.classList.toggle('open', open);
  tray.replaceChildren(...[
    h('div', { class: 'fx-head' },
      h('button', { class: 'fx-fold', 'aria-expanded': String(open), onclick: () => { open = !open; render(); } },
        h('b', {}, 'Effects'), h('span', { class: 'fx-count' + (fx.length || con ? ' some' : '') }, fx.length + !!con)),
      h('button', { class: 'fx-addbtn', onclick: () => { adding = !adding; open = true; render(); } }, adding ? 'Close' : '+ Add')),
    open ? [
      adding ? form() : null,
      fx.length || con ? h('ul', { class: 'fx-list' }, con ? concItem(con) : null,
        spells.length ? [h('li', { class: 'fx-sub' }, 'Spells on you'), spells.map(item)] : null,
        spells.length && rest.length ? h('li', { class: 'fx-sub' }, 'Other effects') : null, rest.map(item))
        : !adding ? h('p', { class: 'fx-empty' }, 'No effects. Add a condition, a spell on you, your own debuff or a spell you concentrate on.') : null,
      sp.changed && sp.value != null ? h('p', { class: 'fx-speed' }, 'Speed ', h('s', {}, c.speed + ' ft'), ' → ', h('b', {}, sp.value + ' ft')) : null,
      armor.changed && armor.value != null && armor.value !== c.ac ? h('p', { class: 'fx-speed' }, 'AC ', h('s', {}, c.ac), ' → ', h('b', {}, armor.value),
        h('small', {}, ` (${armor.by.join(', ')})`)) : null
    ] : null].flat(Infinity).filter(Boolean));
}

// A spell's text shows two lines until you click it (spells named in `unfolded` show all of it)
const unfolded = new Set();
const unfold = e => () => { unfolded.has(e.name) ? unfolded.delete(e.name) : unfolded.add(e.name); render(); };
const item = e => h('li', { class: `fx ${e.source}${e.buff ? ' buff' : ''}${e.plain ? ' plain' : ''}${unfolded.has(e.name) ? ' full' : ''}` },
  h('span', { class: 'fx-dot', 'aria-hidden': 'true' }),
  h('div', { class: 'fx-text', onclick: e.focus ? () => e.focus() : e.source === 'spell' ? unfold(e) : null,
    title: e.focus ? 'Show on the sheet' : e.source === 'spell' ? (unfolded.has(e.name) ? 'Show less' : 'Show all of it') : null },
    h('b', {}, e.name), e.meta ? h('small', { class: 'fx-meta' }, e.meta) : null, e.detail ? h('small', {}, e.detail) : null),
  e.removable ? h('button', { class: 'fx-x', title: 'Remove', 'aria-label': 'Remove ' + e.name, onclick: () => {
    if (e.source === 'spell') setSpellsOn(spellsOn().filter(x => x !== e.saved));
    else own().splice(own().indexOf(e.saved), 1);
    changed();
  } }, '×') : null);

function concItem(con) {
  const save = lastCheck && `CON save ${lastCheck.total} vs DC ${lastCheck.dc}: ${lastCheck.kept ? 'kept' : 'failed'}`;
  return h('li', { class: 'fx conc' + (lastCheck && !lastCheck.kept ? ' failed' : '') },
    h('span', { class: 'fx-ring', 'aria-hidden': 'true' }),
    h('div', { class: 'fx-text' }, h('b', {}, h('em', {}, 'Concentrating'), ' ', con.name),
      h('small', {}, [con.slot ? `Level ${con.slot} slot` : '', con.duration, save].filter(Boolean).join(' · '))),
    h('button', { class: 'fx-x', title: 'End concentration', 'aria-label': 'End concentration on ' + con.name, onclick: () => concentrate(null) }, '×'));
}

// After a rebuild, put the caret back in the box named k
function refocus(k) {
  const el = tray.querySelector(`[name="${k}"]`);
  if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* not a text box */ } }
}

function form() {
  const tabs = h('div', { class: 'fx-tabs', role: 'tablist' }, [['effect', 'Effect or condition'], ['spell', 'Spell on you']].map(([k, label]) =>
    h('button', { type: 'button', role: 'tab', class: tab === k ? 'on' : null, 'aria-selected': String(tab === k), onclick: () => { tab = k; render(); } }, label)));
  return [tabs, tab === 'spell' ? spellForm() : effectForm()];
}

// A spell on you: any spell (or a name outside the data, as a reminder), who cast it, what they chose
function spellForm() {
  const name = canonical(sdraft.name), t = SPELLS_ON[name], s = spellData(name), picks = picksOf(t);
  if (picks && !picks.includes(sdraft.pick)) sdraft.pick = picks[0];
  const mineBox = s?.conc;
  const commit = async e => {
    e.preventDefault();
    if (!name) return;
    const mine = !!(mineBox && sdraft.mine), cur = conc();
    if (mine && cur && cur.name !== name) {
      const yes = await window.ask({ title: `Concentrating on ${cur.name}`, text: `You can concentrate on one spell at a time: starting ${name} ends ${cur.name}.`,
        buttons: [{ label: 'Cancel', value: false }, { label: `Concentrate on ${name} instead`, value: true, primary: true }] });
      if (!yes) return;
    }
    if (!mine && t?.incap && cur && !await interrupt(`Add ${name}`, `${name} makes you Incapacitated, which ends concentration.`)) return;
    putOn(name, { by: mine ? null : sdraft.by, pick: picks ? sdraft.pick : null, mine });
    sdraft = {};
    adding = false;
    if (mine && cur?.name !== name) concentrate(name); else changed();
  };
  const set = k => e => {
    const was = canonical(sdraft.name);
    sdraft[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'by' || k === 'name' && was === canonical(sdraft.name)) return;
    render();
    refocus(k);
  };
  const of = v => typeof v === 'function' ? v(sdraft.pick) : v;
  const known = new Set(Object.keys(SPELLS_ON));
  return h('form', { class: 'fx-form', onsubmit: commit },
    h('label', {}, 'Spell', h('input', { name: 'name', list: 'fx-spells', value: sdraft.name || '', placeholder: 'e.g. Haste, Longstrider, Bane…',
      autocomplete: 'off', oninput: set('name') })),
    h('datalist', { id: 'fx-spells' }, [...known].sort().map(n => h('option', { value: n })),
      allSpells().filter(x => !known.has(x.name)).map(x => h('option', { value: x.name, label: 'Reminder only' }))),
    name ? h('p', { class: 'fx-hint' }, t ? of(t.detail) : s ? 'No automatic effect: it is listed as a reminder (see the spell text in the roller).'
      : 'Not in the rules data: it is listed as a reminder.', s?.duration ? h('i', {}, ` ${s.duration}.`) : null) : null,
    picks ? h('label', {}, t.ask || 'Which', h('select', { name: 'pick', onchange: set('pick') },
      picks.map(p => h('option', { value: p, selected: sdraft.pick === p }, pickLabel(t, p))))) : null,
    mineBox && sdraft.mine ? null : h('label', {}, 'Cast by (optional)', h('input', { name: 'by', value: sdraft.by || '', placeholder: 'e.g. Mira the cleric', oninput: set('by') })),
    mineBox ? h('label', { class: 'fx-check' }, h('input', { type: 'checkbox', name: 'mine', checked: !!sdraft.mine, onchange: set('mine') }),
      'I cast it on myself and concentrate on it') : null,
    h('button', { class: 'fx-save' }, 'Add spell'));
}

// Put a spell on you: { by, pick, mine }. The same spell doesn't add up with itself, so a new casting replaces the old one.
function putOn(name, { by, pick, mine } = {}) {
  name = canonical(name);
  setSpellsOn([...spellsOn().filter(x => x.name !== name),
    { name, by: String(by ?? '').trim() || undefined, pick: pick ?? undefined, mine: mine || undefined }]);
}

// The roller's "It's on me too" after casting a buff: added at once, or (when the caster chooses something: Guidance's
// skill ...) the tray's form opens with it filled in. Returns true when it was added.
function castOnSelf(name) {
  const t = SPELLS_ON[name], mine = !isConc(name) || conc()?.name === name;
  if (picksOf(t)) {
    sdraft = { name, mine };
    tab = 'spell'; adding = open = true;
    render();
    tray.querySelector('[name="pick"]')?.focus();
    return false;
  }
  putOn(name, { mine });
  changed();
  return true;
}

function effectForm() {
  const cond = CONDITIONS[draft.name] || STATES[draft.name], spell = !cond && concSpell(draft.name);
  const commit = async e => {
    e.preventDefault();
    const name = (draft.name || '').trim();
    if (!name) return;
    const cur = conc();
    if (spell || draft.conc && !cond) {
      if (cur && cur.name.toLowerCase() !== name.toLowerCase()) {
        const yes = await window.ask({ title: `Concentrating on ${cur.name}`, text: `You can concentrate on one spell at a time: starting ${name} ends ${cur.name}.`,
          buttons: [{ label: 'Cancel', value: false }, { label: `Concentrate on ${name} instead`, value: true, primary: true }] });
        if (!yes) return;
      }
      draft = { kind: 'dis', target: 'all', value: -1 };
      adding = false;
      return concentrate(name);
    }
    if (cond?.incap && cur && !await interrupt(`Add ${name}`, `${name === 'Incapacitated' ? 'Being Incapacitated' : `${name} includes Incapacitated, which`} ends concentration.`)) return;
    own().push(cond ? { name, level: cond.level ? draft.level || 1 : undefined } : { name, kind: draft.kind, target: draft.target, value: draft.value, detail: draft.detail });
    draft = { kind: 'dis', target: 'all', value: -1 };
    adding = false;
    changed();
  };
  const shape = n => CONDITIONS[n] || STATES[n] ? 'condition' : concSpell(n) ? 'spell' : 'custom';
  // Rebuild the form only when its shape changes (a condition was picked, another kind of effect), keeping the caret
  const set = k => e => {
    const was = shape(draft.name);
    draft[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'value' || k === 'level' || k === 'name' && was === shape(draft.name)) return;
    render();
    refocus(k);
  };
  return h('form', { class: 'fx-form', onsubmit: commit },
    h('label', {}, 'Name or condition', h('input', { name: 'name', list: 'fx-conditions', value: draft.name || '', placeholder: 'e.g. Poisoned, Cursed…',
      autocomplete: 'off', oninput: set('name') })),
    h('datalist', { id: 'fx-conditions' }, Object.keys(CONDITIONS).map(n => h('option', { value: n })),
      Object.keys(STATES).map(n => h('option', { value: n, label: 'Class feature' })),
      concSpells().map(s => h('option', { value: s.name, label: 'Concentration spell' }))),
    spell ? h('p', { class: 'fx-hint' }, `Concentration spell (${spell.duration.replace(/^Concentration, /, '')}): adding it means you are concentrating on it. `,
      h('button', { type: 'button', class: 'fx-link', onclick: () => { sdraft = { name: spell.name }; tab = 'spell'; render(); refocus('name'); } },
        'Someone else cast it on you?'))
    : cond ? [h('p', { class: 'fx-hint' }, typeof cond.detail === 'function' ? cond.detail() : cond.detail),
      cond.level ? h('label', {}, 'Level', h('input', { name: 'level', type: 'number', min: 1, max: 6, value: draft.level || 1, oninput: set('level') })) : null]
      : [h('label', {}, 'What it does', h('select', { name: 'kind', onchange: set('kind') },
          Object.entries(KINDS).map(([k, v]) => h('option', { value: k, selected: draft.kind === k }, v)))),
        ['dis', 'adv', 'mod'].includes(draft.kind) ? h('label', {}, 'On', h('select', { name: 'target', onchange: set('target') },
          Object.entries(TARGETS).map(([k, [v]]) => h('option', { value: k, selected: draft.target === k }, v)))) : null,
        ['mod', 'speed'].includes(draft.kind) ? h('label', {}, draft.kind === 'speed' ? 'Feet' : 'Amount',
          h('input', { name: 'value', type: 'number', step: draft.kind === 'speed' ? 5 : 1, value: draft.value, oninput: set('value') })) : null,
        h('label', {}, 'Note (optional)', h('input', { name: 'detail', value: draft.detail || '', oninput: e => { draft.detail = e.target.value; } })),
        h('label', { class: 'fx-check' }, h('input', { type: 'checkbox', name: 'conc', checked: !!draft.conc, onchange: set('conc') }), 'A spell I concentrate on')],
    h('button', { class: 'fx-save' }, spell || draft.conc && !cond ? 'Concentrate' : 'Add effect'));
}
// The concentration spells for the name box: yours first, then the rest
function concSpells() {
  const mine = new Set((window.character?.spells || []).map(x => x.spell.name));
  return D.spells.filter(s => s.conc).sort((a, b) => mine.has(b.name) - mine.has(a.name) || a.name.localeCompare(b.name));
}

window.effects = { forRoll, speed, ac, attacks, active, conditions: CONDITIONS, spells: SPELLS_ON, register: p => { providers.push(p); }, changed,
  concentration: conc, concentrate, interrupt, askEnd, spellOn, putOn: (name, opts) => { putOn(name, opts); changed(); }, castOnSelf,
  states: STATES, hasState, setState, startTurn, rolled };
document.addEventListener('sheet-loaded', () => { lastCheck = check = null; render(); });
document.addEventListener('sheet-state-change', render); // Undo / Redo put sheetState back
document.addEventListener('character-change', () => { if (!tray.contains(document.activeElement)) render(); });
render();
})();
