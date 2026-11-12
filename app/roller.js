/* Dice roller panel: attacks, spells, checks, saves, initiative and free dice.
   Reads window.character (script.js keeps it up to date and fires 'character-change') and uses window.calc for the
   weapon and spell math. There is no limit on rolls: every button rolls again, because the DM can call for
   Advantage, Disadvantage or a reroll at any time. */
(() => {
'use strict';
const D = window.DND, C = window.character, M = window.calc, $ = id => document.getElementById(id);
const { fmt, parseDice, diceText } = M;

// h('div', { class: 'x', onclick: fn }, child, 'text', [more]) -> element
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else if (k === 'html') e.innerHTML = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return e;
};
const rnd = d => crypto.getRandomValues(new Uint32Array(1))[0] % d + 1;
const sum = a => a.reduce((t, x) => t + x, 0);
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const MODES = { adv: 'Advantage', dis: 'Disadvantage' };
const DMG_TYPES = D.rules.damageTypes.map(t => t.toLowerCase());

// vex: { name } after a hit with a Vex weapon: your next attack roll has Advantage (Weapon Mastery)
// guide: the "What do I need to roll?" switch is on (see "What to roll" below)
const state = { tab: 'attack', picks: {}, opts: {}, search: '', count: 1, expr: '', vex: null, guide: false };
const opt = key => state.opts[key] ||= {};

// ---- Dice ---------------------------------------------------------------------------
// Effects (effects.js: conditions, Killing Marble, your own) that apply to a roll. Advantage and Disadvantage from any
// sources cancel each other out, as the rules say.
// more: other sources of Advantage (War Caster on a concentration save)
function withEffects(roll, chosen, more = []) {
  const fx = window.effects ? window.effects.forRoll(roll) : { mod: 0, parts: [], dice: [], adv: [], dis: [], autoFail: [], notes: [] };
  const adv = chosen === 'adv' || fx.adv.length > 0 || more.length > 0, dis = chosen === 'dis' || fx.dis.length > 0;
  const mode = adv && dis ? null : adv ? 'adv' : dis ? 'dis' : null, why = [...new Set([...fx.adv, ...more, ...fx.dis])];
  const tag = (adv && dis ? 'Advantage and Disadvantage cancel' : MODES[mode] || '') + (why.length ? ` (${why.join(', ')})` : '');
  // advBy / disBy: where each comes from (the log entry's "?")
  const advBy = [chosen === 'adv' ? 'you chose it' : null, ...fx.adv, ...more].filter(Boolean), disBy = [chosen === 'dis' ? 'you chose it' : null, ...fx.dis].filter(Boolean);
  return { ...fx, mode, tag: tag || null, advBy, disBy };
}

// A D20 Test. critOn is only given for attack rolls (checks and saves don't crit). fx: from withEffects() (its dice: Bless,
// Bane, Guidance on you; sign -1 subtracts them).
function d20Test(mode, bonus, extraDice = [], critOn = null, fx = null) {
  if (fx) mode = fx.mode;
  const more = [...extraDice, ...(fx?.dice || []).map(x => ({ label: x.name, n: x.n, d: x.d, sign: x.sign }))];
  if (state.guide) return { mode, rolls: [], kept: 0, nat: null, bonus, extra: more.map(x => ({ ...x, rolls: [] })), total: null, // nothing rolled
    fxParts: fx?.parts || [], autoFail: fx?.autoFail || [], critOn, crit: false, fumble: false, need: true };
  const rolls = mode ? [rnd(20), rnd(20)] : [rnd(20)];
  const kept = mode === 'adv' ? (rolls[1] > rolls[0] ? 1 : 0) : mode === 'dis' ? (rolls[1] < rolls[0] ? 1 : 0) : 0;
  const nat = rolls[kept];
  const extra = more.map(x => ({ ...x, rolls: Array.from({ length: x.n }, () => rnd(x.d)) }));
  return { mode, rolls, kept, nat, bonus, extra, total: nat + bonus + (fx?.mod || 0) + sum(extra.map(x => (x.sign || 1) * sum(x.rolls))),
    fxParts: fx?.parts || [], autoFail: fx?.autoFail || [], critOn, crit: critOn != null && nat >= critOn, fumble: critOn != null && nat === 1 };
}

// parts: [{ label, n, d, flat, type, gwf (1s and 2s count as 3), savage (roll twice, keep higher), explode (max extra dice),
//          max (every die counts as its highest face: Supreme Healing), critExtra (more dice on a crit: Piercer),
//          reroll1 (a 1 is rolled again: Tavern Brawler), min2 (1s count as 2: Elemental Adept), sign (-1: the dice are
//          taken off: Reduce, Ray of Enfeeblement) }]
const diceCount = (p, crit) => p.n * (crit ? 2 : 1) + (crit && p.n && p.critExtra ? p.critExtra : 0);
function rollDamage(parts, crit = false) {
  if (state.guide) return { parts: parts.map(p => ({ ...p, dice: [], alt: null, total: null })), total: null, crit, need: true }; // nothing rolled
  const out = parts.map(p => {
    const n = diceCount(p, crit);
    const once = () => Array.from({ length: n }, () => {
      let v = p.max ? p.d : rnd(p.d), re = false;
      if (p.reroll1 && v === 1) { v = rnd(p.d); re = true; }
      const gwf = p.gwf && v < 3, min2 = !gwf && p.min2 && v < 2;
      return { v, d: p.d, shown: gwf ? 3 : min2 ? 2 : v, gwf, min2, re };
    });
    let dice = once(), alt = null;
    if (p.savage && n) {
      alt = once();
      if (sum(alt.map(x => x.shown)) > sum(dice.map(x => x.shown))) [dice, alt] = [alt, dice];
    }
    for (let i = 0, extra = 0; p.explode && i < dice.length && extra < p.explode; i++) {
      if (dice[i].v === p.d) { const v = rnd(p.d); dice.push({ v, d: p.d, shown: v, boom: true }); extra++; }
    }
    return { ...p, dice, alt, total: (p.sign || 1) * sum(dice.map(x => x.shown)) + p.flat };
  });
  return { parts: out, total: Math.max(0, sum(out.map(p => p.total))), crit }; // penalties can't push damage below 0
}

// "4d6kh3 + 1d8 - 2" -> terms, or null if it isn't a dice expression
function parseExpr(s) {
  const re = /([+-]?)\s*(?:(\d*)d(\d+|%)(?:k([hl])(\d+))?|(\d+))/gi, terms = [];
  if (s.replace(re, '').trim()) return null;
  for (const m of s.matchAll(re)) {
    const sign = m[1] === '-' ? -1 : 1;
    if (m[3]) terms.push({ sign, n: Math.min(+m[2] || 1, 100), d: m[3] === '%' ? 100 : Math.min(+m[3], 1000), keep: m[4] && { high: m[4].toLowerCase() === 'h', k: +m[5] } });
    else terms.push({ sign, flat: +m[6] });
  }
  return terms.length && terms.every(t => t.flat != null || t.d >= 1) ? terms : null;
}

// ---- What the character can do ---------------------------------------------------------------
const lvlRow = key => { const c = (C.classes || []).find(x => x.key === key); return c && D.classes[key].levels[c.level - 1]; };
const hasClass = key => (C.classes || []).some(x => x.key === key);
const knows = name => (C.spells || []).some(x => x.spell.name === name);
const hasFeat = name => (C.feats || []).includes(name);
// Feats kept beyond the rules ("[DM allowed]" on the sheet, see beyond.js): a roll that uses one says so in the log, so
// the DM can see it. names: the feats this roll used.
function beyondLine(names) {
  const list = (C.beyond || []).filter(b => b.kept && b.kind === 'feat' && names.includes(b.name));
  return list.length ? h('p', { class: 'note beyond' }, `⚠ Beyond the rules, marked "DM allowed" on the sheet: ${list.map(b => `${b.name} (${b.why})`).join('; ')}.`) : null;
}
// Elemental Adept's damage types, from the sheet's text: "Elemental Adept (Fire)", "Elemental Adept: WIS +1; Fire (Wizard 4): ..."
const ADEPT = ['acid', 'cold', 'fire', 'lightning', 'thunder'];
const adeptTypes = () => !hasFeat('Elemental Adept') ? [] : [...Object.values(C).filter(v => typeof v === 'string').join('\n')
  .matchAll(/Elemental Adept\b[:\s(]*([^()\n]*)/g)].flatMap(m => ADEPT.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(m[1])));
// Unarmed Strike die from Unarmed Fighting (d6, d8 with nothing in hand), Tavern Brawler (d4), Martial Arts or a species'
// natural weapon (Talons, Claws, Horns ...): the biggest -> { die: '1d8', why: where it comes from } or null
function unarmedDie(o) {
  const lycan = (C.classes || []).find(x => x.key === 'bloodhunter' && x.sub?.name === 'Order of the Lycan'); // hybrid form: Predatory Strikes
  const bare = o.bare ?? true, monk = (C.classes || []).find(x => x.key === 'monk');
  const sides = [[hasFeat('Unarmed Fighting') ? (bare ? 8 : 6) : 0, `Unarmed Fighting (Fighting Style feat): d${bare ? '8 with no weapon or Shield in hand' : '6 while holding a weapon or Shield'}`],
    [hasFeat('Tavern Brawler') ? 4 : 0, 'Tavern Brawler (feat): a d4 for your Unarmed Strike'],
    [lvlRow('monk')?.martialArtsDie || 0, `Martial Arts die (Monk ${monk?.level})`],
    [lycan && o['rider:Hybrid form'] ? (lycan.level >= 11 ? 8 : 6) : 0, `Predatory Strikes (Order of the Lycan ${lycan?.level}, hybrid form)`],
    [C.speciesData?.unarmed?.die || 0, `your natural weapons (${C.speciesData?.name})`]];
  const best = sides.reduce((b, x) => x[0] > b[0] ? x : b, [0]);
  return best[0] ? { die: '1d' + best[0], why: best[1] } : null;
}
// Cleric level of a Life Domain Cleric (0 otherwise): the sheet names the subclass (script.js subclassOf) or its features
function lifeCleric() {
  const c = (C.classes || []).find(x => x.key === 'cleric');
  if (!c || c.level < 3) return 0;
  const text = Object.values(window.fields || {}).filter(v => typeof v === 'string').join('\n');
  return c.sub?.name === 'Life Domain' || !c.sub && /\b(Life Domain|Disciple of Life)\b/i.test(text) ? c.level : 0;
}
// Extra damage on a hit that a subclass gives (subclasses.js riders), for the classes the character has at that level:
// [{ id, name, part (a damage part), on (on by default), note }]. dice: by class level, or 'martialArts'; mod: an ability
// modifier added; level: that part of the class level added; flat: a number by class level.
function subRiders(w, melee) {
  const out = [];
  for (const c of C.classes || []) {
    for (const r of c.sub?.riders || []) {
      if (c.level < (r.from || 3) || r.unarmed && !w?.unarmed || r.melee && !melee) continue;
      const die = r.dice === 'martialArts' ? '1d' + (lvlRow('monk')?.martialArtsDie || 6) : typeof r.dice === 'object' ? byLevel(r.dice, c.level) : r.dice;
      const p = die ? parseDice(die) : { n: 0, d: 0, flat: 0 }, by = `${c.sub.name}, ${c.name} ${c.level}`;
      // what is added, for the log's "?": [value, what]
      const flat = [[p.flat, r.name], [r.mod ? C.mods?.[r.mod] ?? 0 : 0, `${r.mod} modifier`],
        [r.level ? Math.floor(c.level * r.level) : 0, r.level === 1 ? `your ${c.name} level` : `${r.level === .5 ? 'half' : 'part of'} your ${c.name} level${r.level < 1 ? ' (rounded down)' : ''}`],
        [typeof r.flat === 'object' ? byLevel(r.flat, c.level) : r.flat || 0, `${r.name} at ${c.name} ${c.level}`], [r.pb ? C.profBonus || 2 : 0, 'Proficiency Bonus']]; // Hexblade's Curse, Genie's Wrath
      p.flat = sum(flat.map(x => x[0]));
      const why = { dice: r.dice === 'martialArts' ? `${r.name}: your Martial Arts die (${by})` : `${r.name} (${by})`, sub: r.note, flat: flat.map(([v, t]) => [v, t, by]) };
      out.push({ id: 'rider:' + r.name, name: r.name, on: !!r.on, note: r.note, part: { label: r.name, ...p, type: r.type, why } });
    }
  }
  // the species' (Surprise Attack, Astral Spark, Fury of the Small, a Goliath's Fire's Burn ...), from their character level
  for (const r of C.speciesData?.riders || []) {
    if ((C.level || 1) < (r.from || 1) || r.lineage && !C.lineage?.name.endsWith(r.lineage) || r.melee && !melee || r.weapon && (!w || w.unarmed)) continue;
    const p = r.dice ? parseDice(r.dice) : { n: 0, d: 0, flat: 0 }, by = C.speciesData.name;
    const flat = [[p.flat, r.name, by], [r.pb ? C.profBonus || 2 : 0, `${r.name}: your Proficiency Bonus`, by]];
    p.flat = sum(flat.map(x => x[0]));
    out.push({ id: 'rider:' + r.name, name: r.name, on: !!r.on, note: r.note, part: { label: r.name, ...p, type: r.type, why: { dice: `${r.name} (${by})`, sub: r.note, flat } } });
  }
  return out;
}
const byLevel = (map, l) => Object.entries(map).reduce((v, [k, x]) => +k <= l ? x : v, null);
// Blood Hunter Crimson Rites the sheet names ("Rite of the Flame" ...), each with its damage type; the Ghostslayer's Rite
// of the Dawn comes with the order
const RITES = { Flame: 'fire', Frozen: 'cold', Storm: 'lightning', Dead: 'necrotic', Oracle: 'psychic', Roar: 'thunder', Dawn: 'radiant' };
function rites() {
  const bh = (C.classes || []).find(x => x.key === 'bloodhunter');
  if (!bh || bh.level < 2) return [];
  const text = sheetText();
  return Object.entries(RITES).filter(([n]) => new RegExp(`\\bRite of the ${n}\\b`, 'i').test(text) || n === 'Dawn' && bh.sub?.name === 'Order of the Ghostslayer')
    .map(([n, type]) => ({ name: 'Rite of the ' + n, type }));
}
// Life Domain healing with a spell slot (not temporary HP): Disciple of Life adds 2 + the slot's level (level 3),
// Supreme Healing makes the healing dice count as their maximum (level 17)
const lifeHealing = (s, slot) => {
  const lvl = !s.temp && s.level > 0 ? lifeCleric() : 0;
  return lvl ? { disciple: 2 + slot, healer: lvl >= 6 ? 2 + slot : 0, supreme: lvl >= 17 } : null;
};
const spellNamed = name => D.spells.find(s => s.name === name);
const sheetText = () => Object.values(window.fields || {}).filter(v => typeof v === 'string').join('\n');
// Weapon Mastery: from a class that has it or the Weapon Master feat. The weapons named on a sheet line that mentions
// mastery ("Weapon Mastery (Fighter 1): Longsword, Greatsword") are the ones mastered; with no such list, any weapon.
const hasMastery = () => (C.classes || []).some(x => D.classes[x.key].weaponMastery) || hasFeat('Weapon Master');
function masteredByDefault(w) {
  const lines = sheetText().split('\n').filter(l => /master/i.test(l));
  const named = D.weapons.filter(x => lines.some(l => new RegExp(`\\b${x.name}s?\\b`, 'i').test(l)));
  return !named.length || named.includes(w);
}
// What a mastery property does after this attack (a line for the log, with a button for Vex and Cleave).
// s = attackSetup(); s.abilityMod = the ability modifier used for the attack.
function masteryNotes(m, s, test, again, item, o) {
  const ab = s.abilityMod, type = s.parts[0]?.type || s.w.dmg, pb = C.profBonus || 2, hit = test.fumble ? null : test;
  const notes = {
    graze: test.fumble ? `the attack missed, but the target still takes ${Math.max(0, ab)} ${type} damage.`
      : `if this misses, the target still takes ${Math.max(0, ab)} ${type} damage (your ${s.ability} modifier).`,
    topple: `on a hit, the target makes a DC ${8 + ab + pb} Constitution save or falls Prone.`,
    sap: 'on a hit, the target has Disadvantage on its next attack roll before your next turn.',
    slow: "on a hit that deals damage, the target's Speed drops by 10 ft until your next turn.",
    push: 'on a hit, you can push a Large or smaller target up to 10 ft straight away from you.',
    vex: 'on a hit that deals damage, your next attack roll against it before the end of your next turn has Advantage.',
    cleave: 'on a hit, make one more melee attack against a second creature within 5 ft of the first (once per turn). Its damage leaves out your ability modifier.',
    nick: "the Light property's extra attack can be part of the Attack action instead of a Bonus Action (once per turn)."
  };
  const btn = !hit || again ? null
    : m === 'vex' ? h('button', { onclick: e => { state.vex = { name: item.name }; e.target.replaceWith('Your next attack has Advantage.'); render(); } }, 'It hit: Advantage next')
    : m === 'cleave' && !o.cleave ? h('button', { onclick: () => rollAttack(item, null, { ...o, cleave: true }) }, 'Cleave: attack a 2nd creature') : null;
  return h('p', { class: 'mastery-line' }, h('b', {}, `${cap(m)}: `), notes[m], btn ? ' ' : null, btn);
}

// Damage text from the sheet, e.g. "1d8+4 slashing" -> parts (null if there are no numbers). A versatile weapon written
// "1d6/8 -1" or "1d6/1d8" uses its first die (the "/8" is the two-handed die, not +8).
function parseDamageText(text, fallbackType = '') {
  const s = String(text ?? '').toLowerCase().replace(/(\d+\s*d\s*\d+)\s*\/\s*(?:\d*\s*d\s*)?\d+/g, '$1');
  const type = DMG_TYPES.find(t => s.includes(t)) || fallbackType;
  const parts = [];
  let flat = 0;
  for (const m of s.split(/\(|[a-ce-z]{2,}/)[0].matchAll(/([+-]?)\s*(\d+)(?:d(\d+))?/g)) {
    if (m[3]) parts.push({ n: +m[2], d: +m[3], flat: 0, type });
    else flat += (m[1] === '-' ? -1 : 1) * +m[2];
  }
  if (!parts.length && !flat) return null;
  if (!parts.length) parts.push({ n: 0, d: 0, flat: 0, type });
  parts[0].flat += flat;
  return parts;
}
const parseHit = text => { const m = String(text ?? '').match(/^\s*([+-]?)\s*(\d+)/); return m ? (m[1] === '-' ? -1 : 1) * +m[2] : null; };
// "1d8+4 slashing + 1d6 radiant +2 Rage" (flat extras show their name instead of the damage type)
const partsText = parts => parts.map((p, i) => i && !p.n ? `${fmt(p.flat)} ${p.label || ''}`.trim()
  : `${i ? (p.sign < 0 ? '− ' : '+ ') : ''}${diceText(p)}${p.type ? ' ' + p.type : ''}`).join(' ') || '—';

function attackItems() {
  const list = (C.weapons || []).filter(w => !w.spell).map(w => ({ key: 'row:' + w.name, name: w.name, weapon: w.weapon,
    magic: w.magic, sheetBonus: w.bonus, sheetDamage: w.damage }));
  const add = w => list.push({ key: 'w:' + w.name, name: w.name, weapon: w, magic: 0 });
  if (!list.some(x => x.weapon?.unarmed)) add(M.WEAPONS.find(w => w.unarmed));
  const picked = state.picks.attack;
  if (picked?.startsWith('w:') && !list.some(x => x.key === picked)) {
    const w = M.WEAPONS.find(x => 'w:' + x.name === picked);
    if (w) add(w);
  }
  return list;
}

// Everything needed to roll one attack with the options (toggles) chosen on its card
function attackSetup(item, o) {
  const w = item.weapon, sc = C.spellcasting, tier = M.cantripTier(C.level || 1);
  const casting = o.trueStrike || o.shillelagh ? { ability: sc.ability, mod: sc.mod } : null;
  const unarmed = w?.unarmed && !o.shillelagh ? unarmedDie(o) : null;
  const die = o.shillelagh ? ['1d8', '1d10', '1d12', '2d6'][tier - 1] : unarmed?.die ?? null;
  const a = w && M.weaponAttack(w, item.magic, { twoHanded: o.twoHanded, casting, die, type: w.unarmed ? C.speciesData?.unarmed?.type : null });
  const sheetHit = parseHit(item.sheetBonus), sheetDmg = parseDamageText(item.sheetDamage, w?.dmg);
  let toHit, parts, source;
  const used = []; // the feats this attack uses (beyondLine)
  // where the numbers come from (the log entry's "?"): the attack bonus's rows, the first damage part's why, notes
  const ruled = a && attackRules(w, a, item, o, unarmed, tier);
  let hitRows, hitNotes = [], dmgNotes = [];
  if (a && (casting || o.twoHanded || sheetHit == null || !sheetDmg)) {
    toHit = a.toHit; parts = parseDamageText(a.damage, a.type) || []; source = 'Worked out from the rules';
    hitRows = ruled.hit;
    if (parts[0]) parts[0].why = ruled.dmg;
    hitNotes.push(casting ? `${o.trueStrike ? 'True Strike' : 'Shillelagh'} changes the attack, so it is worked out from the rules.`
      : o.twoHanded ? 'Two-handed: worked out from the rules (the numbers on your sheet are for one hand).'
        : `Your sheet has no ${sheetHit == null && !sheetDmg ? 'attack bonus or damage' : sheetHit == null ? 'attack bonus' : 'damage'} for this one, so both are worked out from the rules.`);
  } else {
    toHit = sheetHit ?? 0; parts = sheetDmg || []; source = sheetHit != null || sheetDmg ? 'From your sheet' : 'No numbers on the sheet for this one';
    const hit = sheetOr(toHit, ruled && { value: a.toHit, rows: ruled.hit }, 'the attack bonus');
    hitRows = sheetHit == null ? [] : hit.rows;
    hitNotes.push(sheetHit == null ? 'There is no attack bonus on your sheet for this one: +0.' : hit.note);
    const rp = ruled && parseDamageText(a.damage, a.type)?.[0], sp = sheetDmg?.[0];
    if (rp && sp && sheetDmg.length === 1 && rp.n === sp.n && rp.d === sp.d && rp.flat === sp.flat) {
      sp.why = ruled.dmg;
      dmgNotes.push(`This matches the damage written on your sheet (${String(item.sheetDamage).trim()}).`);
    } else {
      for (const p of parts) p.why = { dice: 'written on your sheet', flat: [[p.flat, 'written on your sheet']] };
      if (sheetDmg) dmgNotes.push(ruled ? `By the rules it would be ${a.damage} (${ruled.dmgText}). The sheet's damage is different: a magic weapon, a feature, or a mistake?`
        : "The rules data doesn't know this weapon, so the app can't say what the sheet's damage is made of.");
    }
    if (!a) hitNotes.push("The rules data doesn't know this weapon, so the app can't say what the number is made of.");
  }
  if (o.shillelagh) for (const p of parts) p.type = 'force';
  const type = parts[0]?.type || w?.dmg || '', ability = a?.ability ?? 'STR';
  const abilityMod = casting ? casting.mod : C.mods?.[ability] ?? 0;
  const melee = w ? w.kind === 'melee' : true;
  if (parts[0]) {
    parts[0].label = item.name;
    if (o.cleave) { // Cleave: the second creature's damage leaves out a positive modifier
      parts[0].flat -= Math.max(0, abilityMod);
      parts[0].why = { ...parts[0].why, flat: [...parts[0].why?.flat || [], [-Math.max(0, abilityMod), 'Cleave: no ability modifier for the second creature']] };
    }
    parts[0].gwf = (C.feats || []).includes('Great Weapon Fighting') && melee && !!(w?.props.includes('two-handed') || o.twoHanded);
    if (parts[0].gwf) used.push('Great Weapon Fighting');
    parts[0].savage = !!o.savage;
  }
  const toggles = [], extras = [], testDice = [];
  const toggle = (id, label, extra) => { toggles.push({ id, label, ...extra }); return !!o[id]; };
  // Killing Marble: which arm(s) the attack uses (two-handed weapons use both)
  const twoHands = !!(w?.props.includes('two-handed') || o.twoHanded);
  const arms = ['right', 'left'].filter(a => o['arm:' + a] ?? (a === 'right' || twoHands));
  if (window.sheetState?.mode === 'marble') for (const a of ['left', 'right']) toggle('arm:' + a, `${cap(a)} arm`, { on: arms.includes(a) });
  if (w?.versatile) toggle('twoHanded', `Two-handed (${w.versatile})`); // weaponAttack switches the die
  // Weapon Mastery: on when the weapon is one you master (see masteredByDefault)
  let mastery = null;
  if (w?.mastery && hasMastery()) {
    const on = o.mastery ?? masteredByDefault(w);
    toggle('mastery', `Mastery: ${cap(w.mastery)}`, { on });
    if (on) mastery = w.mastery;
    if (on && !(C.classes || []).some(x => D.classes[x.key].weaponMastery)) used.push('Weapon Master');
  }
  if (a && toHit === a.toHit && w?.kind === 'ranged' && hasFeat('Archery')) used.push('Archery'); // in the worked-out bonus
  // Feats. On by default where they nearly always apply (Great Weapon Master, Dueling, Thrown Weapon Fighting when thrown)
  const pb = C.profBonus || 2, heavy = !!w?.props.includes('heavy'), notes = [];
  const featBonus = (id, label, on, part) => { toggle(id, label, { on: o[id] ?? on }); if (o[id] ?? on) { extras.push(part); used.push(part.label); } };
  const flatWhy = (v, text, sub) => ({ flat: [[v, text, sub]] });
  if (heavy && hasFeat('Great Weapon Master')) featBonus('gwm', `Great Weapon Master +${pb}`, true, { label: 'Great Weapon Master', n: 0, d: 0, flat: pb, type,
    why: flatWhy(pb, 'Great Weapon Master (feat): your Proficiency Bonus', 'with a Heavy weapon, once per turn on a hit') });
  if (w && melee && !w.unarmed && !twoHands && hasFeat('Dueling')) featBonus('dueling', 'Dueling +2 (no other weapon)', true, { label: 'Dueling', n: 0, d: 0, flat: 2, type,
    why: flatWhy(2, 'Dueling (Fighting Style feat)', 'a melee weapon in one hand and no other weapon') });
  if (w?.props.includes('thrown') && hasFeat('Thrown Weapon Fighting')) featBonus('thrown', 'Thrown +2', w.kind === 'ranged', { label: 'Thrown Weapon Fighting', n: 0, d: 0, flat: 2, type,
    why: flatWhy(2, 'Thrown Weapon Fighting (Fighting Style feat)', 'a ranged attack with a Thrown weapon') });
  if (w && melee && hasFeat('Charger') && toggle('charge', 'Charge +1d8 (moved 10 ft straight)')) {
    extras.push({ label: 'Charger', n: 1, d: 8, flat: 0, type, why: { dice: 'Charger (feat)', sub: 'you moved 10 ft or more straight toward the target first' } }); used.push('Charger');
  }
  if (w?.unarmed && hasFeat('Unarmed Fighting')) { toggle('bare', 'No weapon or Shield in hand (d8)', { on: o.bare ?? true }); used.push('Unarmed Fighting'); }
  if (parts[0] && hasFeat('Piercer') && type === 'piercing') { parts[0].critExtra = 1; parts[0].critWhy = 'Piercer'; }
  if (parts[0] && w && melee && !w.unarmed && C.speciesData?.critExtraMelee) { // Savage Attacks
    parts[0].critExtra = (parts[0].critExtra || 0) + C.speciesData.critExtraMelee;
    parts[0].critWhy = [parts[0].critWhy, `Savage Attacks (${C.speciesData.name})`].filter(Boolean).join(', ');
  }
  if (parts[0] && w?.unarmed && hasFeat('Tavern Brawler')) parts[0].reroll1 = true;
  const note = (feat, text) => { if (hasFeat(feat)) { notes.push([feat, text]); used.push(feat); } };
  if (w?.kind === 'ranged') note('Sharpshooter', 'ignore Half and Three-Quarters Cover; no Disadvantage at long range or with an enemy within 5 ft.');
  if (/crossbow/i.test(w?.name || '')) note('Crossbow Expert', 'ignore Loading; no Disadvantage with an enemy within 5 ft.');
  if (heavy && melee) note('Great Weapon Master', 'after a Critical Hit or dropping a creature to 0 HP, one more attack with this weapon as a Bonus Action.');
  if (type === 'piercing') note('Piercer', 'once per turn reroll one damage die and keep either; a Critical Hit adds one more die (counted in).');
  if (type === 'slashing') note('Slasher', "once per turn a hit cuts the target's Speed by 10 ft; a Critical Hit gives it Disadvantage on attacks until your next turn.");
  if (type === 'bludgeoning') note('Crusher', 'once per turn a hit can push the target 5 ft; after a Critical Hit, attacks against it have Advantage until your next turn.');
  if (w && (['Quarterstaff', 'Spear'].includes(w.name) || heavy && w.props.includes('reach'))) note('Polearm Master', 'after the Attack action, a Bonus Action attack with the other end (1d4 Bludgeoning).');
  if (w?.unarmed) note('Tavern Brawler', 'once per turn a hit can also push the target 5 ft; 1s on the damage die are rolled again.');
  if (w && melee) note('Shield Master', `after a hit, bash with your Shield: STR save DC ${8 + (C.mods?.STR ?? 0) + pb} or pushed 5 ft or knocked Prone.`);
  const rage = lvlRow('barbarian'), raging = o.rage ?? !!window.effects?.hasState('Raging'); // on while Raging is in the Effects tray
  const lvlOf = key => (C.classes || []).find(x => x.key === key)?.level;
  if (rage && ability === 'STR') {
    toggle('rage', `Rage +${rage.rageDamage}`, { on: raging });
    if (raging) extras.push({ label: 'Rage', n: 0, d: 0, flat: rage.rageDamage, type,
      why: flatWhy(rage.rageDamage, `Rage Damage (Barbarian ${lvlOf('barbarian')})`, 'a STR attack while you rage: +2 at levels 1–8, +3 at 9–15, +4 at 16–20') });
  }
  const rogue = lvlRow('rogue');
  if (rogue && w && (w.props.includes('finesse') || w.kind === 'ranged')) {
    const sa = parseDice(rogue.sneakAttack);
    if (toggle('sneak', `Sneak Attack ${diceText(sa)}`)) extras.push({ label: 'Sneak Attack', ...sa, type,
      why: { dice: `Sneak Attack (Rogue ${lvlOf('rogue')})`, sub: 'once per turn, Finesse or ranged weapon, with Advantage or an ally next to the target; 1d6 more every odd Rogue level' } });
  }
  // Blood Hunter: a Crimson Rite on the weapon adds a hemocraft die of its type; Brand of Sundering (Ghostslayer 11) one
  // more, Rite of the Dawn one more against Undead, Blood Curse of the Marked one more this turn
  const bh = (C.classes || []).find(x => x.key === 'bloodhunter'), hemo = lvlRow('bloodhunter')?.hemocraftDie;
  let riteOn = false;
  for (const r of rites()) {
    if (!toggle('rite:' + r.name, `${r.name} +1d${hemo} ${r.type}`)) continue;
    riteOn = true;
    const sunder = bh.sub?.name === 'Order of the Ghostslayer' && bh.level >= 11, hd = `your hemocraft die (Blood Hunter ${bh.level})`;
    extras.push({ label: r.name, n: sunder ? 2 : 1, d: hemo, flat: 0, type: r.type, why: { dice: `${r.name}: ${hd}`, sub: sunder ? 'Brand of Sundering (Ghostslayer 11) adds one more die' : 'Crimson Rite on your weapon' } });
    if (r.name === 'Rite of the Dawn' && toggle('dawnUndead', `Against Undead +1d${hemo}`)) extras.push({ label: 'Rite of the Dawn (Undead)', n: 1, d: hemo, flat: 0, type: r.type,
      why: { dice: `Rite of the Dawn against Undead: ${hd}` } });
  }
  if (riteOn && /Blood Curse of the Marked/i.test(sheetText()) && toggle('marked', `Marked target +1d${hemo}`)) extras.push({ label: 'Blood Curse of the Marked', n: 1, d: hemo, flat: 0, type: '',
    why: { dice: 'Blood Curse of the Marked: your hemocraft die', sub: 'the target is marked this turn' } });
  // subclass riders (Divine Fury, Psionic Strike, Dreadful Strike ...); the Lycan's hybrid form adds to unarmed attack rolls too
  for (const r of subRiders(w, melee)) {
    const on = o[r.id] ?? r.on;
    toggle(r.id, `${r.name} ${r.part.n ? diceText(r.part) : fmt(r.part.flat)}${r.part.type ? ' ' + r.part.type : ''}`, { on, title: r.note });
    if (on) extras.push({ ...r.part, type: r.part.type || type });
  }
  if (bh?.sub?.name === 'Order of the Lycan' && bh.level >= 7 && w?.unarmed && o['rider:Hybrid form']) {
    const plus = byLevel({ 7: 1, 11: 2, 18: 3 }, bh.level);
    toHit += plus;
    hitRows.push(num(plus, 'Hybrid form (Order of the Lycan)', `Blood Hunter ${bh.level}: +1 at 7, +2 at 11, +3 at 18`));
  }
  const riders = [];
  for (const { spell: s } of C.spells || []) {
    if (!s.rider) continue;
    const slot = Math.max(s.level, o['slot:' + s.name] || s.level);
    if (toggle('rider:' + s.name, s.name, { spell: s, slot })) {
      riders.push({ spell: s, slot });
      M.spellRoll(s, slot).parts.forEach((p, i) => extras.push({ label: s.name, ...p, why: spellPartWhy(s, slot, i) }));
    }
  }
  if (w && knows('True Strike')) {
    if (toggle('trueStrike', `True Strike (${sc.ability})`) && tier > 1) extras.push({ label: 'True Strike', n: tier - 1, d: 6, flat: 0, type: 'radiant',
      why: { dice: `True Strike: extra Radiant damage at character level ${C.level}`, sub: '1d6 at level 5, 2d6 at 11, 3d6 at 17' } });
  }
  if (w && ['Club', 'Quarterstaff'].includes(w.name) && knows('Shillelagh')) toggle('shillelagh', `Shillelagh (${sc.ability}, ${['d8', 'd10', 'd12', '2d6'][tier - 1]})`);
  if ((C.feats || []).includes('Savage Attacker')) toggle('savage', 'Savage Attacker');
  if (!onMe('Bless') && toggle('bless', 'Bless +1d4')) testDice.push({ label: 'Bless', n: 1, d: 4 }); // Bless on you: the effects add it
  const extraHit = parseInt(o.extraHit, 10) || 0;
  toHit += extraHit;
  if (extraHit) hitRows.push(num(extraHit, 'Extra to hit', 'typed on the attack card'));
  for (const p of parseDamageText(o.extraDmg, type) || []) extras.push({ label: 'Extra', ...p, why: { dice: 'Extra damage', sub: 'typed on the attack card', flat: [[p.flat, 'Extra damage', 'typed on the attack card']] } });
  extras.push(...fxDamage({ kind: 'damage', ability, arms, weapon: !!w }, type));
  const crit = C.critRange || 20;
  hitNotes.push(crit < 20 ? `A natural ${crit}–20 is a Critical Hit: ${crit === 19 ? 'Improved Critical (Champion, Fighter 3)' : 'Superior Critical (Champion, Fighter 15)'}. A natural 1 always misses.`
    : 'A natural 20 is a Critical Hit (damage dice doubled); a natural 1 always misses.');
  const why = { test: { head: 'Attack roll', rows: hitRows, notes: hitNotes }, damage: { notes: dmgNotes } };
  return { toHit, parts: [...parts, ...extras], testDice, toggles, ability, abilityMod, source, melee, w, arms, notes, mastery, riders, used, why };
}

// The attack bonus and the weapon's damage worked out from the rules, as rows for the log's "?":
// -> { hit: [rows], dmg: a damage part's why, dmgText: "Longsword's d8, STR +3" }
const ABILITY_WHY = { casting: 'your spellcasting ability, from the spell', finesse: 'Finesse: the better of STR and DEX',
  monk: 'Martial Arts: Monk weapons and Unarmed Strikes use the better of STR and DEX',
  ranged: 'ranged weapons use DEX', melee: 'melee weapons use STR' };
function attackRules(w, a, item, o, unarmed, tier) {
  const x = a.how, monk = (C.classes || []).find(c => c.key === 'monk');
  const hit = [abRow(a.ability, ABILITY_WHY[x.why]),
    x.prof ? pbRow(`proficient with ${w.unarmed ? 'your Unarmed Strike' : `${w.category === 'simple' ? 'Simple' : 'Martial'} weapons`}`) : null,
    x.magic ? num(x.magic, `+${x.magic} weapon`, `the +${x.magic} in "${item.name}"`) : null,
    x.archery ? num(x.archery, 'Archery (Fighting Style feat)', 'ranged weapon attacks') : null].filter(Boolean);
  if (!x.prof) hit.push(row('+0', 'no Proficiency Bonus', `none of your classes is proficient with ${w.category === 'simple' ? 'Simple' : 'Martial'} weapons like this one`));
  const dieWhy = o.shillelagh ? `Shillelagh's die at character level ${C.level || 1}` + (tier < 4 ? ' (it grows at 5, 11 and 17)' : '')
    : x.dieFrom === 'given' ? unarmed?.why || 'Unarmed Strike'
      : x.dieFrom === 'martialArts' ? `Martial Arts die (Monk ${monk?.level}): bigger than the weapon's own ${w.dice === '1' ? '1' : w.dice}`
        : x.dieFrom === 'versatile' ? `${w.name}, held in two hands (Versatile)` : `${w.name}'s damage die`;
  const base = /^\d+$/.test(x.dice) ? +x.dice : 0;
  const dmg = { dice: dieWhy, flat: [[base, 'Unarmed Strike: 1 damage'], [x.mod, `${a.ability} modifier`], [x.magic, `+${x.magic} weapon`]] };
  const dmgText = [base ? `${base} for the Unarmed Strike` : `${x.dice}: ${dieWhy}`, x.mod ? `${a.ability} ${sgn(x.mod)}` : null,
    x.magic ? `${sgn(x.magic)} weapon` : null].filter(Boolean).join(', ');
  return { hit, dmg, dmgText };
}

const knownSpells = () => (C.spells || []).map(x => x.spell);
// A spell on you (the Effects tray's "Spells on you")
const onMe = name => !!window.effects?.spellOn(name);
// Damage parts from effects: flat bonuses and dice (Enlarge +1d4, Crusader's Mantle, Ray of Enfeeblement −1d8)
const fxDamage = (roll, type) => {
  const fx = window.effects?.forRoll(roll) || { parts: [], dice: [] };
  return [...fx.parts.map(p => ({ label: p.name, n: 0, d: 0, flat: p.mod, type, why: { flat: [[p.mod, p.name, 'in the Effects tray']] } })),
    ...fx.dice.map(x => ({ label: x.name, n: x.n, d: x.d, flat: 0, type: x.type || type, sign: x.sign, why: { dice: x.name, sub: 'in the Effects tray' } }))];
};

// ---- Rolling (each call adds a new entry to the log) ---------------------------------
// again: a repeat from the log ("Again"), which uses no slot and no Vex of its own; vex: this roll has Vex's Advantage
function rollAttack(item, mode, o = { ...opt(item.key) }, again = false, vex = !again && !!state.vex) {
  if (vex && !again) state.vex = null; // used up by this attack
  const s = attackSetup(item, o), fx = withEffects({ kind: 'attack', ability: s.ability, arms: s.arms, weapon: !!s.w }, mode, vex ? ['Vex'] : []);
  const test = d20Test(mode, s.toHit, s.testDice, C.critRange || 20, fx);
  const node = log({ title: item.name + (o.cleave ? ' (Cleave)' : ''), tag: ['Attack', fx.tag],
    lines: [{ test, damage: s.parts.length && !test.fumble ? rollDamage(s.parts, test.crit) : null }],
    notes: [...fx.notes, beyondLine(s.used)], extra: s.mastery ? [masteryNotes(s.mastery, s, test, again, item, o)] : [],
    explain: { test: { ...s.why.test, fx }, damage: s.why.damage }, again: m => rollAttack(item, m, o, true, vex), test: true, mode });
  // a smite toggled on is a spell cast with a slot; a rider that spends a feature's uses (Superiority Die ...) offers to
  // spend them; a Monk's hit can be a Stunning Strike
  if (!again) for (const r of s.riders) if (castPerHit(r.spell)) slotLine(node, r.spell, r.slot, false);
  if (!again) for (const t of s.toggles) { const u = RIDER_USES[t.id.replace(/^rider:/, '')]; if (u && (t.on ?? o[t.id])) useLine(node, ...u, t.id.slice(6)); }
  if (!again && !test.fumble && stunning(s.w)) useLine(node, 'focus', 1, 'Stunning Strike',
    `DC ${monkDC()} CON save: Stunned until the start of your next turn; on a success its Speed is halved and the next attack against it has Advantage.`);
  // one of this turn's attacks (the turn bar); a repeat or Cleave's extra attack isn't. It uses up Steady Aim.
  if (!again && !o.cleave) window.turn?.attacked();
  if (!again) window.effects?.rolled('attack');
  if (vex) render();
}

function rollAttackDamage(item, crit, o = { ...opt(item.key) }) {
  const s = attackSetup(item, o);
  log({ title: item.name, tag: [crit ? 'Critical damage' : 'Damage'], lines: [{ damage: rollDamage(s.parts, crit) }], notes: [beyondLine(s.used)],
    explain: { damage: s.why.damage }, again: () => rollAttackDamage(item, crit, o) });
}

const unitOf = s => s.cantrip === 'beams' ? 'Beam' : s.name === 'Magic Missile' ? 'Dart' : 'Ray';

// what: 'cast' | 'heal' | 'damage' | 'crit' (the last two for riders such as Divine Smite) | 'start' (just cast it, no rolls)
function castSpell(s, mode, what = 'cast', o = { ...opt('spell:' + s.name) }) {
  const slot = Math.max(s.level, o.slot || s.level), r = M.spellRoll(s, slot), sc = C.spellcasting;
  const adept = adeptTypes(), parts = r.parts.map((p, i) => ({ ...p, label: s.name, min2: adept.includes(p.type), why: spellPartWhy(s, slot, i) }));
  if (parts[0] && s.explode) parts[0].explode = Math.max(0, sc.mod);
  if (parts[0] && o.agonizing) {
    parts[0].flat += sc.mod;
    parts[0].why.flat.push([sc.mod, 'Agonizing Blast (Eldritch Invocation)', `your ${sc.ability} modifier, on each beam`]);
  }
  for (const p of parseDamageText(o.extraDmg, parts[0]?.type) || []) parts.push({ label: 'Extra', ...p, why: { dice: 'Extra damage', sub: 'typed on the spell card', flat: [[p.flat, 'Extra damage', 'typed on the spell card']] } });
  if (parts.length && what !== 'heal') parts.push(...fxDamage({ kind: 'damage', ability: sc.ability }, parts[0].type));
  // Vex from a weapon hit: the next attack roll has Advantage (kept in o, so "Again" repeats it); the roll uses up Steady Aim
  if (s.atk && what === 'cast' && o.vex == null) {
    o = { ...o, vex: !!state.vex };
    if (o.vex) { state.vex = null; queueMicrotask(render); }
    queueMicrotask(() => window.effects?.rolled('attack'));
  }
  const vex = !!o.vex, fx = withEffects({ kind: 'attack', ability: sc.ability, spell: true }, mode, vex ? ['Vex'] : []);
  const lines = [], notes = [s.note, what !== 'heal' && parts.some(p => p.min2) ? beyondLine(['Elemental Adept']) : null];
  // several beams / rays / darts: one line each, or (What to roll) one line for all of them
  const count = state.guide ? Math.min(1, r.count) : r.count, many = r.count > 1;
  const label = i => !many ? null : state.guide ? `Each of the ${r.count} ${unitOf(s).toLowerCase()}s` : `${unitOf(s)} ${i}`;
  if (what === 'start') lines.push({});
  else if (what === 'heal') {
    const heal = [{ ...r.heal, type: s.temp ? 'temporary HP' : 'healing', label: s.name, why: spellPartWhy(s, slot, 'heal') }], life = lifeHealing(s, slot);
    if (life && o.disciple !== false) heal.push({ label: 'Disciple of Life', n: 0, d: 0, flat: life.disciple, type: 'healing',
      why: { flat: [[life.disciple, 'Disciple of Life (Life Domain)', `2 + the slot's level (${slot})`]] } });
    if (life?.supreme) heal[0].max = true;
    lines.push({ damage: rollDamage(heal), heal: true });
    if (life?.healer) notes.push(`Blessed Healer: if this healed someone other than you, you regain ${life.healer} HP.`);
    if (life?.supreme) notes.push('Supreme Healing: the healing dice count as their maximum.');
  } else if (s.atk && what === 'cast') {
    for (let i = 1; i <= count; i++) {
      const test = d20Test(mode, r.attack, o.bless && !onMe('Bless') ? [{ label: 'Bless', n: 1, d: 4 }] : [], 20, fx);
      lines.push({ label: label(i), test, damage: parts.length && !test.fumble ? rollDamage(parts, test.crit) : null });
    }
  } else if (parts.length) {
    for (let i = 1; i <= count; i++) lines.push({ label: label(i), damage: rollDamage(parts, what === 'crit') });
  } else lines.push({});
  const slotTag = s.level ? (slot > s.level ? `Level ${slot} slot` : `Level ${s.level}`) : 'Cantrip';
  const atk = castingRows('attack');
  return log({ title: s.name, tag: [what === 'heal' ? 'Heal' : what === 'crit' ? 'Critical damage' : s.rider && what === 'damage' ? 'Damage' : 'Cast', slotTag,
      s.atk && what === 'cast' ? fx.tag : null],
    dc: what === 'cast' && r.save ? { save: r.save, dc: r.dc, half: r.half, from: 'spell' } : null, lines, notes,
    explain: { test: { head: 'Spell attack', rows: atk.rows, fx, notes: [atk.note, 'A natural 20 is a Critical Hit (damage dice doubled); a natural 1 always misses.'] },
      notes: [many ? countWhy(s, slot, r.count) : null] },
    again: m => castSpell(s, m, what, o), test: !!s.atk && what === 'cast', mode });
}

// ---- Where the numbers come from (the "?" on a log entry) ------------------------------------------------------
// A section: { head, sum (the formula), rows: [{ v (shown), n (the number, when it adds up to the bonus), text, sub, ty }],
// notes }. The roll functions pass what only they know (explain: { test: { head, rows, notes, fx }, damage: { notes },
// notes }); damage parts carry `why` ({ dice: what the dice are, sub, flat: [[value, what, sub]] }); explain() puts it
// together when the entry is logged (so it shows the character as it was at that roll).
const sgn = n => (n < 0 ? '−' : '+') + Math.abs(n);
const row = (v, text, sub, n) => ({ v, text, sub: sub || null, n });
const num = (n, text, sub, plain = false) => row(plain ? String(n) : sgn(n), text, sub, n);
// An ability modifier: the sheet's modifier box, or worked out from the score
function abRow(ab, why) {
  const low = ab.toLowerCase(), score = C[low], box = C[low + 'Mod'];
  const from = typeof box === 'number' ? typeof score === 'number' ? `score ${score}` : 'from your sheet'
    : typeof score === 'number' ? `score ${score}: (${score} − 10) ÷ 2, rounded down` : 'no score on your sheet';
  return num(C.mods?.[ab] ?? 0, `${ab} modifier`, [why, from].filter(Boolean).join(' · '));
}
// The Proficiency Bonus (value: twice it for Expertise, half for Jack of All Trades)
function pbRow(why, value = C.profBonus || 2, text = 'Proficiency Bonus') {
  const pb = C.profBonus || 2, lvl = C.level;
  const from = lvl && D.rules.proficiencyBonusByLevel[Math.min(20, lvl) - 1] === pb ? `+${pb} at character level ${lvl}` : `+${pb} on your sheet`;
  return num(value, text, [why, from].filter(Boolean).join(' · '));
}
// A number written on the sheet next to what the rules give (rules: { value, rows } or null) -> { rows, note }: the rules'
// rows when they agree; otherwise the sheet's number, and the note says what the rules would give
function sheetOr(value, rules, what, plain = false) {
  const show = n => plain ? String(n) : sgn(n);
  if (value == null) return { rows: rules ? rules.rows : [], note: null };
  if (!rules) return { rows: [num(value, `${cap(what)} written on your sheet`, null, plain)], note: null };
  if (value === rules.value) return { rows: rules.rows, note: `This matches ${what} written on your sheet (${show(value)}).` };
  const diff = value - rules.value;
  return { rows: [num(value, `${cap(what)} written on your sheet`, null, plain)],
    note: `By the rules it would be ${show(rules.value)} (${rules.rows.map(r => `${r.text} ${r.v}`).join(', ')}). Your sheet's is ${Math.abs(diff)} ${diff > 0 ? 'higher' : 'lower'}: ` +
      'a magic item, a feat or feature, or a mistake?' };
}
// Why the spellcasting ability is that one
function castWhy() {
  const sc = C.spellcasting;
  if (new RegExp(`^(${sc.ability}|${D.rules.abilities[sc.ability]})$`, 'i').test(String(C.spellAbility ?? '').trim())) return 'the spellcasting ability on your sheet';
  return sc.class ? `${sc.class}s cast with ${sc.ability}` : 'the best of INT, WIS and CHA (no spellcasting class)';
}
// The spell attack bonus or the spell save DC -> { rows, note }
function castingRows(kind) {
  const sc = C.spellcasting, dc = kind === 'dc', value = dc ? C.spellDC : C.spellAttack;
  const rows = [dc ? num(8, 'every save DC starts at 8', null, true) : null, abRow(sc.ability, castWhy()), pbRow()].filter(Boolean);
  return sheetOr(typeof value === 'number' ? value : null, { value: (dc ? 8 : 0) + sc.mod + (C.profBonus || 2), rows }, dc ? 'the spell save DC' : 'the spell attack bonus', dc);
}
// A spell's damage part i (or 'heal'), as spellRoll works it out: the spell's dice, a cantrip's growth, a higher slot, the modifier
function spellPartWhy(s, slot, i) {
  const heal = i === 'heal', dice = heal ? s.heal : s.dmg[i][0], base = parseDice(dice), sc = C.spellcasting;
  const up = [].concat(s.up ?? [])[heal ? 0 : i], extra = Math.max(0, slot - s.level), upP = up && extra ? parseDice(up) : null;
  const tier = !heal && s.level === 0 && s.cantrip !== 'beams' ? M.cantripTier(C.level || 1) : 1;
  const sub = [`${dice} in the spell`,
    tier > 1 ? `× ${tier}: a cantrip's dice grow at character levels 5, 11 and 17 (you are ${C.level})` : null,
    upP?.n ? `+${up} for each slot level above ${s.level}: +${upP.n * extra}d${upP.d} with a level ${slot} slot` : null].filter(Boolean).join(' · ');
  const mod = heal ? s.healMod : i === 0 && s.mod;
  return { dice: s.name, sub, flat: [[base.flat, s.name], [upP ? upP.flat * extra : 0, `${s.name}: a higher slot`], [mod ? sc.mod : 0, `${sc.ability} modifier`, castWhy()]] };
}
// How many beams / rays / darts
function countWhy(s, slot, count) {
  if (s.cantrip === 'beams') return `${count} ${unitOf(s).toLowerCase()}s: one at first, one more at character levels 5, 11 and 17 (you are ${C.level || 1}).`;
  const extra = Math.max(0, slot - s.level);
  return `${count} ${unitOf(s).toLowerCase()}s: ${s.count || 1}${s.upCount && extra ? `, +${s.upCount} for each slot level above ${s.level} (+${s.upCount * extra} with a level ${slot} slot)` : ''}.`;
}

// What a check, save or Initiative is made of -> { rows, notes }. plus: { value, text } added on top (Indomitable).
function testRows(kind, ability, skill) {
  const full = D.rules.abilities[ability] || ability;
  if (kind === 'Initiative') {
    const by = hasFeat('Alert') ? 'Alert (feat)' : C.speciesData?.features?.some(f => f.grants?.initiativeBonus === 'PB') ? `Hare-Trigger (${C.speciesData.name})` : null;
    if (typeof C.initiative === 'number') return inferred(C.initiative, 'DEX', 'Initiative', by || 'Alert (feat)?', true);
    return { rows: [abRow('DEX', 'Initiative is a DEX check'), by ? pbRow(by) : null].filter(Boolean), notes: ['Your sheet has no Initiative number, so it is worked out.'] };
  }
  if (skill) {
    const s = (C.skills || []).find(x => x.name === skill);
    if (s?.fromSheet) return inferred(s.mod, ability, skill, 'proficient in it', true);
    const bg = C.backgroundData?.proficiencies?.includes('Skill: ' + skill);
    return { rows: [abRow(ability, `${skill} uses ${ability}`), bg ? pbRow(`proficient from your background (${C.backgroundData.name})`) : null].filter(Boolean),
      notes: [`Your sheet has no number in the ${skill} box, so it is worked out${bg ? '' : ' (no proficiency counted)'}.`] };
  }
  if (kind === 'Save') {
    const s = (C.saves || []).find(x => x.ability === ability);
    if (s?.fromSheet) return inferred(s.mod, ability, `${full} saving throw`, 'proficient in this save', false);
    const cls = C.classes?.[0], prof = cls && D.classes[cls.key].saves.includes(ability);
    return { rows: [abRow(ability), prof ? pbRow(`${cls.name}s are proficient in ${full} saves`) : null].filter(Boolean),
      notes: [`Your sheet has no number for this save, so it is worked out${cls ? '' : ' (no class read, no proficiency counted)'}.`] };
  }
  return { rows: [abRow(ability)], notes: [] }; // a plain ability check
}
// A number written on the sheet, taken apart: the ability modifier, then the Proficiency Bonus as many times as fits
// (proficient, Expertise, Jack of All Trades for checks); what's left is "something else"
function inferred(value, ab, name, pbWhy, check) {
  const pb = C.profBonus || 2, rest = value - (C.mods?.[ab] ?? 0), rows = [abRow(ab)];
  const jack = check && (C.classes || []).some(c => c.key === 'bard' && c.level >= 2);
  const fits = [[pb, () => pbRow(pbWhy)], [2 * pb, () => pbRow('Expertise: twice your Proficiency Bonus', 2 * pb, 'Expertise')],
    jack ? [Math.floor(pb / 2), () => pbRow('Jack of All Trades (Bard 2): half of it, rounded down', Math.floor(pb / 2), 'Half your Proficiency Bonus')] : null].filter(Boolean);
  const exact = fits.find(f => f[0] === rest);
  if (exact) rows.push(exact[1]());
  else if (rest) {
    if (rest > pb) rows.push(pbRow(pbWhy));
    rows.push(num(rest > pb ? rest - pb : rest, 'something else', 'not from the rules the app knows: an item, a feature, or a mistake?'));
  }
  return { rows, notes: [`${sgn(value)} is written in your sheet's ${name} box; this is how it adds up.`, rest ? null : 'No Proficiency Bonus in it: not proficient.'] };
}

// The D20 Test's section: the d20 (Advantage / Disadvantage and why), the bonus, extra dice, effects. lines: the entry's
// lines with this test (one section for all: the same bonus); each: "each beam" when there are several
function testWhy(x, lines, guide, each) {
  const t = lines[0].test, fx = x.fx || {}, one = lines.length === 1 && !guide, adv = fx.advBy || [], dis = fx.disBy || [];
  const seen = one ? t.rolls.length > 1 ? `rolled ${t.rolls.join(' and ')}: ${t.nat} counts` : `rolled ${t.nat}` : null;
  const rows = [adv.length && dis.length ? row('d20', 'one d20: Advantage and Disadvantage cancel out', [`Advantage: ${adv.join(', ')}`, `Disadvantage: ${dis.join(', ')}`, seen].filter(Boolean).join(' · '))
    : t.mode ? row('2d20', `${MODES[t.mode]}: roll two d20s, keep the ${t.mode === 'adv' ? 'higher' : 'lower'}`, [(t.mode === 'adv' ? adv : dis).join(', '), seen].filter(Boolean).join(' · '))
      : row('d20', 'your d20 roll', seen)];
  rows.push(...x.rows);
  const traced = sum(x.rows.filter(r => typeof r.n === 'number').map(r => r.n));
  if (traced !== t.bonus) rows.push(num(t.bonus - traced, 'something else', 'the app could not trace this part'));
  const fromFx = (fx.dice || []).length, chips = t.extra.length - fromFx;
  t.extra.forEach((d, i) => rows.push(row(`${d.sign < 0 ? '−' : '+'}${d.n}d${d.d}`, d.label,
    [i < chips ? 'switched on for this roll' : 'in the Effects tray', one && d.rolls.length ? `rolled ${d.rolls.join(', ')}` : null].filter(Boolean).join(' · '))));
  for (const p of t.fxParts) rows.push(num(p.mod, p.name, 'in the Effects tray'));
  const bits = [`d20 ${t.bonus < 0 ? '−' : '+'} ${Math.abs(t.bonus)}`, ...t.extra.map(d => ` ${d.sign < 0 ? '−' : '+'} ${d.n}d${d.d}`), ...t.fxParts.map(p => ` ${p.mod < 0 ? '−' : '+'} ${Math.abs(p.mod)}`)];
  return { head: x.head + (each ? ` (${each})` : ''), sum: bits.join(''), rows,
    notes: [...x.notes || [], t.autoFail.length ? `Automatic failure: ${t.autoFail.join(', ')} (in the Effects tray).` : null] };
}

// A save DC on the entry (a spell's, a feature's): the target rolls against it
function dcWhy(dc) {
  const full = D.rules.abilities[dc.save];
  const r = dc.from === 'focus' ? { rows: [num(8, 'every save DC starts at 8', null, true), abRow('WIS', 'a Monk\'s Focus save DC uses WIS'), pbRow()], note: null } : castingRows('dc');
  return { head: `Save DC ${dc.dc}`, sum: `${full} save`, rows: r.rows,
    notes: [r.note, `The target rolls a ${full} saving throw and needs ${dc.dc} or more to succeed${dc.half ? ' (it then takes half damage)' : ''}.`] };
}

// Damage or healing: one section for lines with the same parts (several beams); x: { notes }
function damageWhy(lines, x, guide, each) {
  const l = lines[0], dmg = l.damage, one = lines.length === 1 && !guide;
  let head = l.what ? cap(l.what) : dmg.plain ? 'Dice' : l.heal ? (dmg.parts[0]?.type === 'temporary HP' ? 'Temporary HP' : 'Healing') : dmg.crit ? 'Damage (Critical Hit)' : 'Damage';
  if (each) head += ` (${each})`;
  else if (l.label && l.label !== head) head = `${l.label}: ${head.charAt(0).toLowerCase()}${head.slice(1)}`;
  const rows = [];
  for (const p of dmg.parts) {
    const w = p.why || {}, n = diceCount(p, dmg.crit), minus = p.sign < 0 ? '−' : '';
    if (p.n && p.d) {
      const crit = dmg.crit ? `${p.n}d${p.d} doubled for the Critical Hit` + (n > 2 * p.n ? `, +${n - 2 * p.n} (${p.critWhy || 'one more die'})` : '') : null;
      const seen = one && p.dice?.length ? `rolled ${p.dice.map(d => d.dropped ? `(${d.v})` : d.shown).join(', ')}` : null;
      rows.push({ ...row(`${minus}${n}${dieName(p.d)}`, w.dice || (dmg.plain ? 'typed in the Dice tab' : p.label || 'dice'), [w.sub, crit, partHints(p), seen].filter(Boolean).join(' · ')), ty: p.type });
    }
    const flats = (w.flat || (p.flat ? [[p.flat, dmg.plain ? 'typed in the Dice tab' : p.label || 'added']] : [])).filter(f => f[0]);
    for (const [v, text, sub] of flats) rows.push({ ...num(v, text, sub), ty: p.n ? null : p.type });
    const left = p.flat - sum(flats.map(f => f[0]));
    if (left) rows.push(num(left, 'something else', 'the app could not trace this part'));
  }
  return { head, sum: formula(dmg.parts, dmg.crit), rows,
    notes: [...x?.notes || [], dmg.crit ? 'Critical Hit: every damage die is rolled twice; the numbers added are not doubled.' : null] };
}

// All sections of a log entry (e.explain: what the roll function knew)
function explain(e) {
  const x = e.explain || {}, out = [], tests = e.lines.filter(l => l.test);
  const each = ls => { if (ls.length < 2) return null; const m = ls[0].label?.match(/^(\w+) \d+$/); return m ? `each ${m[1].toLowerCase()}` : 'each'; };
  if (tests.length && x.test) out.push(testWhy(x.test, tests, e.guide, each(tests)));
  if (e.dc?.from) out.push(dcWhy(e.dc));
  const groups = [];
  for (const l of e.lines.filter(l => l.damage)) {
    const key = JSON.stringify([l.damage.crit, l.heal, l.what, l.damage.parts.map(p => [p.label, p.n, p.d, p.flat, p.sign])]), g = groups.find(g => g.key === key);
    if (g) g.lines.push(l); else groups.push({ key, lines: [l] });
  }
  groups.forEach((g, i) => out.push(damageWhy(g.lines, i ? null : x.damage, e.guide, each(g.lines))));
  if (out.length && x.notes?.some(Boolean)) out.push({ head: null, rows: [], notes: x.notes });
  return out;
}

function whyView(sections) {
  return sections.map(s => h('section', {},
    s.head ? h('h5', {}, s.head, s.sum ? h('span', { class: 'wsum' }, s.sum) : null) : null,
    s.rows.length ? h('ul', {}, s.rows.map(r => h('li', {}, h('b', { class: 'wv' }, r.v),
      h('span', { class: 'wt' }, r.text, r.ty ? h('i', {}, ' ' + r.ty) : null, r.sub ? h('small', {}, r.sub) : null)))) : null,
    (s.notes || []).filter(Boolean).map(n => h('p', {}, n))));
}

// Smites are cast each time they add their damage (right after a hit); Hex, Hunter's Mark, Divine Favor are cast once
const castPerHit = s => s.level > 0 && /immediately after hitting/i.test(s.time);

// After a cast with a spell slot: a line in the log entry with a button that marks the slot as used (and an Undo).
// none: there was no slot left and you cast it anyway. Slots are kept by rest.js (window.resources).
function slotLine(node, s, slot, none) {
  const R = window.resources;
  if (!R || !window.sheet?.loaded || !s.level || !node) return;
  const p = h('p', { class: 'slot-line' });
  const show = () => {
    const left = R.slotsLeft(slot);
    p.replaceChildren(none ? `No level ${slot} slot left: cast anyway.`
      : left ? h('button', { class: 'use', onclick: () => {
        if (!R.useSlot(slot)) return show();
        p.replaceChildren(`Used a level ${slot} slot · ${R.slotsLeft(slot)} left `, h('button', { onclick: () => { R.restoreSlot(slot); show(); } }, 'Undo'));
      } }, `Use a level ${slot} slot`, h('small', {}, ` (${left} left)`)) : `No level ${slot} slots left.`);
  };
  show();
  node.querySelector('footer').before(p);
}

// Attack riders that spend a feature's uses (rest.js resource ids): [id, how many]
const RIDER_USES = { 'Superiority Die': ['superiority', 1], 'Psionic Strike': ['psiFighter', 1], 'Despairing Strike': ['despairingStrike', 1],
  'Hand of Harm': ['focus', 1], 'Deft Strike': ['focus', 1], 'Dreadful Strike': ['dreadfulStrike', 1], 'Psychic Blades': ['bardicInspiration', 1],
  'Touch of Death': ['channelCleric', 1], 'Arcane Jolt': ['arcaneJolt', 1] };
const monkDC = () => 8 + (C.mods?.WIS ?? 0) + (C.profBonus || 2);
// Stunning Strike (Monk 5): a hit with an Unarmed Strike or a Monk weapon (Simple melee, or Martial melee and Light)
const stunning = w => (lvlRow('monk')?.lvl || 0) >= 5 && !!w && (w.unarmed || w.kind === 'melee' && (w.category === 'simple' || w.props.includes('light')));

// After an attack: a line that spends uses of a feature (rest.js) for what it did, with an Undo; after: what it does
function useLine(node, id, n, what, after = '') {
  const R = window.resources, res = () => R?.list().find(x => x.id === id);
  if (!node || !window.sheet?.loaded || !res()) return;
  const p = h('p', { class: 'slot-line' });
  const show = () => {
    const r = res();
    p.replaceChildren(r.left >= n ? h('button', { class: 'use', onclick: () => {
      const before = res().used;
      R.setUsed(id, before + n);
      p.replaceChildren(`${what}: ${n} ${r.name} used · ${res().left} left. ${after} `, h('button', { onclick: () => { R.setUsed(id, before); show(); } }, 'Undo'));
    } }, what, h('small', {}, ` (${n} of ${r.left} ${r.name})`)) : `${what}: no ${r.name} left.`);
  };
  show();
  node.querySelector('footer').before(p);
}

// After casting a spell that helps whoever it's on (Haste, Bless, Longstrider ...): a button that puts it in the Effects
// tray's "Spells on you", for when you are one of its targets
function onMeLine(node, s) {
  const t = window.effects?.spells[s.name];
  if (!node || !window.sheet?.loaded || !t || !(typeof t.buff === 'function' ? t.buff() : t.buff)) return;
  const b = h('button', { onclick: () => {
    b.replaceWith(window.effects.castOnSelf(s.name) ? `${s.name} is on you now (Effects tray).` : 'Choose the rest in the Effects tray.');
  } }, "It's on me too");
  node.querySelector('footer').before(h('p', { class: 'self-line' }, b));
}

// Casting from a spell card. A spell with a level needs a slot: with none left it asks first ("Cast anyway"); the log
// entry then has a button to mark the slot used. A concentration spell starts concentration (the log entry can undo it).
// If you are concentrating on another spell it asks first: switch, or cast and keep the old one (maybe you're only trying it out).
async function cast(s, slot, run) {
  const fx = window.effects, R = window.resources;
  let none = false;
  if (s.level > 0 && R && window.sheet?.loaded && R.slotsLeft(slot) <= 0) {
    const total = R.slotTotal(slot);
    const yes = await window.ask({ title: total ? `No level ${slot} slots left` : `No level ${slot} spell slots`,
      text: `${total ? `All ${total} of your level ${slot} slots are used.` : `Your sheet shows no level ${slot} spell slots.`} Cast ${s.name} anyway? ` +
        '(For example as a Ritual, or for free from a feat or your species.)',
      buttons: [{ label: 'Cancel', value: false }, { label: 'Cast anyway', value: true, primary: true }] });
    if (!yes) return;
    none = true;
  }
  const prev = fx.concentration(), go = () => { const node = run(); slotLine(node, s, slot, none); onMeLine(node, s); return node; };
  if (!s.conc) return go();
  if (prev && prev.name !== s.name) {
    const a = await fx.interrupt('Cast', `${s.name} needs concentration too, so casting it ends ${prev.name}.`, `Cast, switch to ${s.name}`);
    if (!a) return;
    if (a === 'keep') return go().querySelector('footer').before(h('p', { class: 'conc-line' }, `Still concentrating on ${prev.name}.`));
  }
  const node = go();
  fx.concentrate(s.name, s.level ? slot : null);
  const undo = h('button', { onclick: () => { fx.concentrate(prev?.name ?? null, prev?.slot ?? null); undo.replaceWith('(undone)'); } }, 'Undo');
  node.querySelector('footer').before(h('p', { class: 'conc-line' }, `Concentrating on ${s.name} now. `, undo));
}

// kind: 'Check' | 'Save' | 'Initiative' (a DEX check). Other scripts hear about it through the 'test-rolled' event
// (e.g. the Becoming Marble page compares a CON save with its spread DCs).
// plus: { value, text } already in mod, added on top of the save (Indomitable: your Fighter level)
function rollTest(title, kind, mod, mode, extraDice = [], ability = null, skill = null, purpose = null, plus = null) {
  const more = purpose === 'concentration' && hasFeat('War Caster') ? ['War Caster'] : [];
  const fx = withEffects({ kind: kind === 'Save' ? 'save' : 'check', ability, skill }, mode, more), test = d20Test(mode, mod, extraDice, null, fx);
  const full = D.rules.abilities[ability] || ability, how = ability ? testRows(kind, ability, skill) : { rows: [], notes: [] };
  if (plus?.value) how.rows.push(num(plus.value, plus.text));
  const node = log({ title, tag: [kind, fx.tag], lines: [{ test }], notes: [beyondLine(more)],
    explain: { test: { head: kind === 'Initiative' ? 'Initiative (a DEX check)' : skill ? `${skill} check (${ability})` : `${full} ${kind === 'Save' ? 'saving throw' : 'check'}`,
      rows: how.rows, fx, notes: [...how.notes, more.length ? 'War Caster (feat): Advantage on saves to keep concentrating.' : null] } },
    again: m => rollTest(title, kind, mod, m, extraDice, ability, skill, purpose, plus), test: true, mode });
  const report = total => document.dispatchEvent(new CustomEvent('test-rolled', { detail: { kind, ability, skill, title, total, autoFail: test.autoFail.length > 0, purpose } }));
  if (!state.guide) report(test.total);
  // What to roll: nothing was rolled. A save the app compares with a DC (concentration: effects.js; the marble's spread:
  // marble.js) asks for your total and reports that.
  else if (purpose === 'concentration' || kind === 'Save' && ability === 'CON' && window.sheetState?.mode === 'marble') {
    node.querySelector('footer').before(totalBox('Your total', n => { report(n); return `You rolled ${n}.`; }));
  }
  return node;
}

function rollExpr(expr) {
  const terms = parseExpr(expr);
  if (!terms) return false;
  const parts = terms.map(t => {
    if (t.flat != null) return { n: 0, d: 0, flat: t.sign * t.flat, dice: [], total: t.sign * t.flat };
    const part = { label: `${t.sign < 0 ? '−' : ''}${t.n}d${t.d}${t.keep ? 'k' + (t.keep.high ? 'h' : 'l') + t.keep.k : ''}`, n: t.n, d: t.d, flat: 0,
      sign: t.sign, keep: t.keep || null };
    if (state.guide) return { ...part, dice: [], total: null }; // What to roll: nothing rolled
    const dice = Array.from({ length: t.n }, () => { const v = rnd(t.d); return { v, d: t.d, shown: v }; });
    if (t.keep) {
      const order = dice.map((x, i) => i).sort((a, b) => t.keep.high ? dice[b].v - dice[a].v : dice[a].v - dice[b].v);
      order.slice(t.keep.k).forEach(i => { dice[i].dropped = true; });
    }
    return { ...part, dice, total: t.sign * sum(dice.filter(x => !x.dropped).map(x => x.v)) };
  });
  log({ title: expr.replace(/\s+/g, ''), tag: ['Dice'], lines: [{ damage: { parts, total: state.guide ? null : sum(parts.map(p => p.total)), plain: true } }],
    again: () => rollExpr(expr) });
  return true;
}

// ---- Log ------------------------------------------------------------------------------
const calm = matchMedia('(prefers-reduced-motion: reduce)');

function d20Face(v, cls) {
  return h('span', { class: 'face ' + cls, 'data-final': v, 'data-d': 20,
    html: '<svg viewBox="0 0 100 100" aria-hidden="true"><polygon class="f" points="50,3 93,27 93,73 50,97 7,73 7,27"/>' +
      '<path class="e" d="M50 22 78 68 22 68Z M50 3 50 22 M93 27 50 22 M93 27 78 68 M93 73 78 68 M50 97 78 68 M50 97 22 68 M7 73 22 68 M7 27 22 68 M7 27 50 22"/></svg>' },
  h('b', { class: 'v' }, v));
}
const dieChip = x => h('span', { class: `die d${x.d}${x.dropped ? ' dropped' : ''}${x.gwf || x.min2 ? ' gwf' : ''}${x.boom ? ' boom' : ''}`,
  'data-final': x.shown, 'data-d': x.d, title: x.gwf ? `Rolled ${x.v}: Great Weapon Fighting counts it as 3` : x.min2 ? 'Rolled 1: Elemental Adept counts it as 2'
    : x.re ? 'Rolled a 1 and rolled again (Tavern Brawler)' : x.boom ? 'Extra die from rolling an 8' : null },
h('b', { class: 'v' }, x.shown));

function testView(t) {
  const faces = t.rolls.map((v, i) => d20Face(v, (i !== t.kept ? 'dropped ' : '') + (v === 20 ? 'nat20' : v === 1 ? 'nat1' : '')));
  const extras = t.extra.flatMap(x => [h('span', { class: 'op' }, x.sign < 0 ? '−' : '+'), ...x.rolls.map(v => dieChip({ v, d: x.d, shown: v })), h('small', { class: 'xl' }, x.label)]);
  const fxBits = t.fxParts.flatMap(p => [h('span', { class: 'op' }, p.mod < 0 ? '−' : '+'), h('span', { class: 'mod fx' }, Math.abs(p.mod)), h('small', { class: 'xl' }, p.name)]);
  return h('div', { class: 'test' }, faces, h('span', { class: 'op' }, t.bonus < 0 ? '−' : '+'), h('span', { class: 'mod' }, Math.abs(t.bonus)),
    extras, fxBits, h('span', { class: 'op' }, '='), h('span', { class: 'total', 'data-count': t.total }, t.total),
    t.autoFail.length ? h('span', { class: 'flag fumble' }, `Automatic failure (${t.autoFail.join(', ')})`) : t.crit ? h('span', { class: 'flag crit' }, 'Critical hit!') : t.fumble ? h('span', { class: 'flag fumble' }, 'Natural 1 — miss') :
      t.nat === 20 ? h('span', { class: 'flag nat' }, 'Natural 20') : t.nat === 1 ? h('span', { class: 'flag low' }, 'Natural 1') : null);
}

// what: what the total is, when it isn't damage or healing ("damage taken off" ...)
function damageView(dmg, heal, what) {
  const rows = dmg.parts.map(p => h('div', { class: 'part' + (p.alt ? ' savage' : '') },
    p.label ? h('span', { class: 'pl' }, p.label) : null,
    p.sign < 0 ? h('span', { class: 'flat' }, '−') : null,
    p.dice.map(dieChip),
    p.alt ? h('span', { class: 'alt', title: 'Savage Attacker: the other roll' }, `(${sum(p.alt.map(x => x.shown))})`) : null,
    p.flat && (!dmg.plain || !p.dice.length) ? h('span', { class: 'flat' }, fmt(p.flat)) : null,
    p.dice.length && (p.flat || dmg.parts.length > 1) ? h('span', { class: 'pt' }, '= ' + (p.total < 0 ? '−' + -p.total : p.total)) : null,
    p.type ? h('i', { class: 'ty' }, p.type) : null));
  const byType = {};
  for (const p of dmg.parts) byType[p.type || ''] = (byType[p.type || ''] || 0) + p.total;
  const split = Object.keys(byType).length > 1 ? Object.entries(byType).map(([t, v]) => `${v} ${t}`).join(' + ') : '';
  return h('div', { class: 'dmg' + (heal ? ' heal' : '') }, rows,
    h('div', { class: 'dsum' }, h('span', { class: 'total', 'data-count': dmg.total }, dmg.total),
      h('span', { class: 'what' }, what || (dmg.plain ? 'total' : heal ? dmg.parts[0].type : dmg.crit ? 'damage (critical: dice doubled)' : 'damage')), split ? h('small', {}, split) : null));
}

// ---- What to roll ("What do I need to roll?" at the top of the panel) ----------------------------------------
// With the switch on, the buttons roll nothing (d20Test and rollDamage hold no numbers then: total null, so nothing can
// act on a roll that wasn't made). The log entry shows the dice to roll and what to add, in the same places. A roll the
// app compares with something (a concentration or marble CON save, healing for your HP) gets a box for your total.
const dieName = d => d === 100 ? 'd%' : 'd' + d;
function needFace() { // the red d20 of the log, with "d20" on it (no data-d: animate() leaves it alone)
  const f = d20Face(dieName(20), 'need');
  f.removeAttribute('data-d'); f.removeAttribute('data-final');
  return f;
}
const diceNeed = (n, d) => h('span', { class: 'dneed' }, n > 1 ? h('b', { class: 'cnt' }, n + '×') : null,
  d === 20 ? needFace() : h('span', { class: `die d${d}` }, h('b', {}, dieName(d))));
const signOp = v => h('span', { class: 'op' }, v < 0 ? '−' : '+');

// "2d8 + 3d6 + 4": every part's dice (the same die added up) and the flat numbers; crit: dice doubled
function formula(parts, crit) {
  const dice = [];
  let flat = 0;
  for (const p of parts) {
    const n = diceCount(p, crit), sign = p.sign < 0 ? -1 : 1;
    flat += p.flat || 0;
    if (!n || !p.d) continue;
    if (p.max) { flat += sign * n * p.d; continue; } // Supreme Healing: no need to roll them
    const same = !p.keep && dice.find(x => x.d === p.d && x.sign === sign && !x.keep);
    if (same) same.n += n; else dice.push({ n, d: p.d, sign, keep: p.keep });
  }
  const terms = dice.map((x, i) => `${i ? (x.sign < 0 ? ' − ' : ' + ') : x.sign < 0 ? '−' : ''}${x.n}${dieName(x.d)}${x.keep ? (x.keep.high ? 'kh' : 'kl') + x.keep.k : ''}`);
  if (flat || !terms.length) terms.push(terms.length ? ` ${flat < 0 ? '−' : '+'} ${Math.abs(flat)}` : String(flat));
  return terms.join('');
}

// What changes how a part's dice count (rollDamage's flags)
const partHints = p => [p.keep && `keep the ${p.keep.high ? 'highest' : 'lowest'} ${p.keep.k}`,
  p.gwf && '1s and 2s count as 3 (Great Weapon Fighting)', p.min2 && '1s count as 2 (Elemental Adept)',
  p.reroll1 && 'roll a 1 again, once (Tavern Brawler)', p.savage && 'roll these dice twice and keep the higher (Savage Attacker)',
  p.explode && `each ${p.d} rolled adds another ${dieName(p.d)} (up to ${p.explode})`,
  p.max && `${dieName(p.d)}s at their maximum (Supreme Healing)`].filter(Boolean).join('; ');

function testNeed(t) {
  const crit = t.critOn != null && `Natural ${t.critOn < 20 ? `${t.critOn}–20` : '20'}: a Critical Hit (damage dice doubled). Natural 1: a miss.`;
  return [h('div', { class: 'test need' }, diceNeed(t.mode ? 2 : 1, 20),
    t.mode ? h('small', { class: 'xl' }, t.mode === 'adv' ? 'keep the higher' : 'keep the lower') : null,
    signOp(t.bonus), h('span', { class: 'mod' }, Math.abs(t.bonus)),
    t.extra.flatMap(x => [signOp(x.sign || 1), diceNeed(x.n, x.d), h('small', { class: 'xl' }, x.label)]),
    t.fxParts.flatMap(p => [signOp(p.mod), h('span', { class: 'mod fx' }, Math.abs(p.mod)), h('small', { class: 'xl' }, p.name)]),
    t.autoFail.length ? h('span', { class: 'flag fumble' }, `Automatic failure (${t.autoFail.join(', ')})`) : null),
  crit ? h('p', { class: 'how' }, crit) : null];
}

// attack: the line's attack roll (also shows the Critical Hit's dice); half: half damage on a successful save
function damageNeed(dmg, heal, what, half, attack) {
  const rows = dmg.parts.map((p, i) => {
    const n = diceCount(p, dmg.crit), hint = partHints(p);
    return h('div', { class: 'part' }, p.label && !dmg.plain ? h('span', { class: 'pl' }, p.label) : null,
      p.sign < 0 ? h('span', { class: 'flat' }, '−') : null,
      n && p.d ? p.max ? h('span', { class: 'flat' }, n * p.d) : diceNeed(n, p.d) : null,
      p.flat || !n ? h('span', { class: 'flat' }, n || i ? fmt(p.flat) : p.flat) : null,
      p.type ? h('i', { class: 'ty' }, p.type) : null,
      hint ? h('small', { class: 'xl' }, hint) : null);
  });
  const rolls = dmg.parts.some(p => p.n && p.d && !p.max);
  return h('div', { class: 'dmg need' + (heal ? ' heal' : '') }, rows,
    h('div', { class: 'dsum' }, h('span', { class: 'formula' }, formula(dmg.parts, dmg.crit)),
      h('span', { class: 'what' }, (what || (dmg.plain ? 'total' : heal ? dmg.parts[0].type : dmg.crit ? 'damage (Critical Hit: dice doubled)'
        : attack ? 'damage on a hit' : 'damage')) + (half ? ', half on a successful save' : '')),
      attack && !dmg.crit && rolls ? h('small', {}, `Critical Hit: ${formula(dmg.parts, true)}`) : null));
}

// A box for the total you rolled. done(n) -> what to show instead (text or an element), or null: the number won't do.
function totalBox(label, done) {
  const box = h('div', { class: 'slot-line total-in' });
  const show = (v = '') => {
    const input = h('input', { type: 'number', value: v, placeholder: '?', 'aria-label': label, oninput: () => input.classList.remove('bad') });
    box.replaceChildren(h('form', { onsubmit: ev => {
      ev.preventDefault();
      const n = parseInt(input.value, 10), got = Number.isNaN(n) ? null : done(n);
      if (got == null) return input.classList.add('bad');
      box.replaceChildren(got, ' ', h('button', { type: 'button', onclick: () => show(n) }, 'Change'));
    } }, h('label', {}, label + ' ', input), ' ', h('button', { class: 'use' }, 'OK')));
  };
  show();
  return box;
}

function entryView(e) {
  const tests = e.guide ? [] : e.lines.map(l => l.test).filter(Boolean);
  const crit = tests.some(t => t.crit), fumble = tests.length && tests.every(t => t.fumble);
  const nat = !crit && tests.some(t => t.nat === 20);
  // "?": the entry opens a box saying where each number comes from (drawn the first time it opens)
  const box = e.why?.length ? h('div', { class: 'whybox', hidden: true }) : null;
  const ask = box && h('button', { class: 'whybtn', type: 'button', title: 'Where do these numbers come from?', 'aria-label': 'Where do these numbers come from?',
    'aria-expanded': 'false', onclick: () => {
      if (!box.childElementCount) box.append(...whyView(e.why));
      box.hidden = !box.hidden;
      ask.setAttribute('aria-expanded', String(!box.hidden));
      ask.classList.toggle('on', !box.hidden);
    } }, '?');
  const li = h('li', { class: e.guide ? 'roll guide' : `roll${crit ? ' crit' : ''}${fumble ? ' fumble' : ''}${nat ? ' natural' : ''}` },
    h('div', { class: 'rhead' }, h('b', {}, e.title), h('span', { class: 'tag' }, [...e.tag, e.guide ? 'What to roll' : null].filter(Boolean).join(' · ')),
      h('time', {}, e.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })), ask));
  if (e.dc) li.append(h('div', { class: 'dc' }, h('b', {}, `DC ${e.dc.dc}`), ` ${D.rules.abilities[e.dc.save]} save`, e.dc.half ? ' · half damage on a success' : ''));
  for (const l of e.lines) {
    li.append(h('div', { class: 'line' }, l.label ? h('span', { class: 'ln' }, l.label) : null,
      e.guide ? [l.test ? testNeed(l.test) : null, l.damage ? damageNeed(l.damage, l.heal, l.what, e.dc?.half, l.test?.critOn != null) : null]
        : [l.test ? testView(l.test) : null, l.damage ? damageView(l.damage, l.heal, l.what) : null,
          e.dc?.half && l.damage ? h('div', { class: 'half' }, `On a successful save: ${Math.floor(l.damage.total / 2)}`) : null]));
  }
  if (!e.guide && e.lines.length > 1 && e.lines.some(l => l.damage) && !e.noTotal) {
    li.append(h('div', { class: 'grand' }, tests.length ? 'Total if all hit: ' : 'Total: ', h('b', {}, sum(e.lines.map(l => l.damage?.total ?? 0)))));
  }
  if (box) li.append(box);
  for (const n of e.notes || []) if (n) li.append(n instanceof Node ? n : h('p', { class: 'note' }, n));
  li.append(...e.extra || []);
  // "Again" repeats the roll exactly (not on What to roll: it would say the same); the other buttons switch between
  // normal, Advantage and Disadvantage
  li.append(h('footer', {}, e.again && !e.guide ? h('button', { onclick: () => e.again(e.mode) }, '↻ Again') : null,
    e.test ? [[null, 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']].filter(([m]) => m !== (e.mode || null))
      .map(([m, label]) => h('button', { onclick: () => e.again(m) }, label)) : null));
  return li;
}

function log(e) {
  e.time = new Date();
  e.guide ??= state.guide && e.lines.some(l => l.test || l.damage); // What to roll (an entry with nothing to roll stays as it is)
  try { e.why = explain(e); } catch (err) { console.error(err); e.why = null; } // the "?" never stops a roll from showing
  const list = $('rollLog'), node = entryView(e);
  list.querySelector('.empty')?.remove();
  list.prepend(node);
  while (list.children.length > 80) list.lastChild.remove();
  list.scrollTop = 0;
  if (!e.guide) animate(node, e);
  return node;
}

// Dice tumble and show random faces for a moment, totals count up, crits burst
function animate(node, e) {
  if (calm.matches) return;
  node.classList.add('rolling');
  const faces = [...node.querySelectorAll('[data-d]')], totals = [...node.querySelectorAll('[data-count]')];
  let tick = 0;
  const timer = setInterval(() => {
    const done = ++tick >= 9;
    for (const f of faces) f.querySelector('.v').textContent = done ? f.dataset.final : rnd(+f.dataset.d);
    for (const t of totals) t.textContent = done ? t.dataset.count : Math.round(t.dataset.count * tick / 9);
    if (!done) return;
    clearInterval(timer);
    node.classList.remove('rolling');
    node.classList.add('landed');
    if (node.classList.contains('crit')) {
      const burst = h('span', { class: 'burst', 'aria-hidden': 'true' });
      for (let i = 0; i < 14; i++) burst.append(h('i', { style: `--a:${i * 360 / 14}deg;--r:${50 + rnd(40)}px` }));
      node.querySelector('.test')?.append(burst);
      setTimeout(() => burst.remove(), 1200);
    }
  }, 55);
}

// ---- Panel views ------------------------------------------------------------------------
const chip = (label, on, onclick, title) => h('button', { class: 'chip' + (on ? ' on' : ''), 'aria-pressed': String(!!on), onclick, title }, label);
const rollButtons = (fn, label = 'Roll') => h('div', { class: 'rollbtns' },
  h('button', { class: 'go', onclick: () => fn() }, label),
  h('button', { class: 'adv', onclick: () => fn('adv') }, 'Advantage'),
  h('button', { class: 'dis', onclick: () => fn('dis') }, 'Disadvantage'));
const back = (label, tab) => h('button', { class: 'back', onclick: () => { state.picks[tab] = null; render(); } }, '‹ ' + label);
const numBox = (label, value, small) => h('div', { class: 'num' }, h('small', {}, label), h('b', {}, value), small ? h('span', {}, small) : null);
const field = (label, key, o, placeholder, width) => h('label', { class: 'xfield' }, label,
  h('input', { value: o[key] ?? '', placeholder, 'data-keep': key, style: width ? `width:${width}` : null,
    oninput: e => { o[key] = e.target.value; render(); } }));
const needSheet = () => !Object.keys(C).some(k => ['name', 'classLevel', 'str', 'dex'].includes(k))
  ? h('p', { class: 'hint' }, 'Load a character sheet to use its numbers. Until then everything rolls with +0.') : null;

function attackView() {
  const items = attackItems(), picked = items.find(x => x.key === state.picks.attack);
  if (!picked) {
    const select = h('select', { onchange: e => { if (e.target.value) { state.picks.attack = e.target.value; render(); } } },
      h('option', { value: '' }, 'Attack with any other weapon…'),
      ['simple', 'martial'].map(cat => h('optgroup', { label: cap(cat) + ' weapons' },
        M.WEAPONS.filter(w => w.category === cat && !w.unarmed).map(w => h('option', { value: 'w:' + w.name }, w.name)))));
    return [needSheet(), h('p', { class: 'lead' }, 'What are you attacking with?'),
      h('div', { class: 'items' }, items.map(it => {
        const s = attackSetup(it, opt(it.key));
        return h('button', { class: 'item', onclick: () => { state.picks.attack = it.key; render(); } },
          h('span', { class: 'iname' }, it.name), h('span', { class: 'imeta' }, `${fmt(s.toHit)} · ${partsText(s.parts.slice(0, 1))}`));
      })), select];
  }
  const o = opt(picked.key), s = attackSetup(picked, o), w = picked.weapon;
  const mastery = w?.mastery && (C.classes || []).some(x => D.classes[x.key].weaponMastery);
  return h('div', { class: 'card' }, back('Weapons', 'attack'),
    h('h3', {}, picked.name),
    w ? h('p', { class: 'sub' }, [cap(w.category), w.kind, ...w.props.map(p => p === 'thrown' && w.thrown ? `thrown ${w.thrown.join('/')}` : p),
      w.range ? `range ${w.range.join('/')}` : null].filter(Boolean).join(' · ')) : null,
    h('div', { class: 'nums' }, numBox('To hit', fmt(s.toHit), s.ability), numBox('Damage', partsText(s.parts), C.critRange < 20 ? `crit on ${C.critRange}–20` : null)),
    h('p', { class: 'src' }, s.source),
    mastery ? h('p', { class: 'mastery' }, h('b', {}, `Mastery: ${cap(w.mastery)}. `), D.masteryProperties[w.mastery],
      s.mastery ? null : h('i', {}, ' (switched off below)')) : null,
    s.notes.map(([feat, text]) => h('p', { class: 'mastery' }, h('b', {}, `${feat}: `), text)),
    effectsNote({ kind: 'attack', ability: s.ability, arms: s.arms, weapon: !!s.w }),
    vexNote(),
    h('div', { class: 'chips' }, s.toggles.map(t => [chip(t.label, t.on ?? o[t.id], async () => {
      const on = !(t.on ?? o[t.id]);
      if (on && t.id === 'rage' && !await window.effects.interrupt('Rage', "While you rage you can't concentrate on spells.")) return;
      o[t.id] = on; render();
    }),
      t.spell?.up && o[t.id] ? h('select', { class: 'slot', title: 'Spell slot level', onchange: e => { o['slot:' + t.spell.name] = +e.target.value; render(); } },
        Array.from({ length: 10 - t.spell.level }, (_, i) => t.spell.level + i).map(l => h('option', { value: l, selected: l === t.slot }, `Slot ${l}`))) : null])),
    h('div', { class: 'extras' }, field('Extra to hit', 'extraHit', o, '+0', '4.5em'), field('Extra damage', 'extraDmg', o, 'e.g. 1d6 fire', '8em')),
    rollButtons(m => rollAttack(picked, m), 'Attack'),
    h('div', { class: 'rollbtns two' },
      h('button', { onclick: () => rollAttackDamage(picked, false) }, 'Damage only'),
      h('button', { onclick: () => rollAttackDamage(picked, true) }, 'Critical damage')));
}

// Vex waiting for your next attack roll (any weapon or spell attack), with a button to drop it
const vexNote = () => state.vex ? h('p', { class: 'fxnote conc' }, h('b', {}, 'Vex: '), `your next attack roll has Advantage (from your ${state.vex.name} hit). `,
  h('button', { class: 'linkbtn', onclick: () => { state.vex = null; render(); } }, 'Drop it')) : null;

function spellMeta(s) {
  const r = M.spellRoll(s);
  return [r.bonusText, r.text].filter(Boolean).join(' · ') || (s.rider ? 'adds to a weapon hit' : s.heal ? 'healing' : '');
}

function spellRow(s) {
  return h('button', { class: 'item', onclick: () => { state.picks.spell = s.name; render(); } },
    h('span', { class: 'iname' }, s.name, s.conc ? h('em', { class: 'badge', title: 'Concentration' }, 'C') : null, s.ritual ? h('em', { class: 'badge', title: 'Ritual' }, 'R') : null),
    h('span', { class: 'imeta' }, spellMeta(s)));
}

function spellView() {
  const s = state.picks.spell && spellNamed(state.picks.spell);
  if (!s) {
    const q = state.search.trim().toLowerCase();
    const search = h('input', { type: 'search', class: 'search', placeholder: 'Search all spells…', value: state.search, 'data-keep': 'spellsearch',
      oninput: e => { state.search = e.target.value; render(); } });
    if (q) {
      const rank = n => { n = n.toLowerCase(); return n.startsWith(q) ? 0 : n.split(/[\s/]+/).some(w => w.startsWith(q)) ? 1 : n.includes(q) ? 2 : -1; };
      const found = D.spells.map(sp => [sp, rank(sp.name)]).filter(x => x[1] >= 0).sort((a, b) => a[1] - b[1]).slice(0, 20).map(x => x[0]);
      return [search, found.length ? h('div', { class: 'items' }, found.map(spellRow)) : h('p', { class: 'hint' }, 'No spell by that name in the rules data.')];
    }
    const known = knownSpells(), groups = {};
    for (const sp of known) (groups[sp.level] ||= []).push(sp);
    return [search, window.resources?.slotStrip(), needSheet(),
      known.length ? Object.entries(groups).map(([lvl, list]) => [h('h4', {}, +lvl ? `Level ${lvl}` : 'Cantrips'), h('div', { class: 'items' }, list.map(spellRow))])
        : h('p', { class: 'hint' }, 'No spells found on the sheet. Search above to cast any spell.')];
  }
  const o = opt('spell:' + s.name), slot = Math.max(s.level, o.slot || s.level), r = M.spellRoll(s, slot), sc = C.spellcasting;
  const scales = s.level > 0 && (s.up || s.upCount);
  const sub = [s.level ? `Level ${s.level} ${s.school}` : `${s.school} cantrip`, s.time, s.range, s.duration].join(' · ');
  const btns = [], RS = window.sheet?.loaded && window.resources;
  if (s.rider && castPerHit(s)) { // a smite: each extra damage roll is a cast
    btns.push(h('div', { class: 'rollbtns two' }, h('button', { class: 'go', onclick: () => cast(s, slot, () => castSpell(s, null, 'damage')) }, 'Roll extra damage'),
      h('button', { onclick: () => cast(s, slot, () => castSpell(s, null, 'crit')) }, 'Critical damage')));
  } else if (s.rider) {
    btns.push(h('div', { class: 'rollbtns one' }, h('button', { class: 'go', onclick: () => cast(s, slot, () => castSpell(s, null, 'start')) }, s.conc ? 'Cast (concentrate)' : 'Cast')));
    btns.push(h('div', { class: 'rollbtns two' }, h('button', { onclick: () => castSpell(s, null, 'damage') }, 'Roll extra damage'),
      h('button', { onclick: () => castSpell(s, null, 'crit') }, 'Critical damage')));
  } else if (s.atk) btns.push(rollButtons(m => cast(s, slot, () => castSpell(s, m)), r.count > 1 ? `Cast (${r.count} ${unitOf(s).toLowerCase()}s)` : 'Cast'));
  else if (s.dmg || !s.heal) btns.push(h('div', { class: 'rollbtns one' }, h('button', { class: 'go', onclick: () => cast(s, slot, () => castSpell(s)) }, s.dmg ? 'Cast & roll damage' : 'Cast')));
  if (s.heal) btns.push(h('div', { class: 'rollbtns one' }, h('button', { class: 'go heal', onclick: () => cast(s, slot, () => castSpell(s, null, 'heal')) }, s.temp ? 'Roll temporary HP' : 'Roll healing')));
  const cur = window.effects?.concentration();
  const concNote = s.conc && cur && h('p', { class: 'fxnote conc' }, cur.name === s.name ? h('b', {}, `You are concentrating on ${s.name}.`)
    : [h('b', {}, `Concentrating on ${cur.name}: `), `casting ${s.name} would end it (you'll be asked first).`]);
  const chips = [];
  if (s.atk && !onMe('Bless')) chips.push(chip('Bless +1d4', o.bless, () => { o.bless = !o.bless; render(); }));
  if (s.name === 'Eldritch Blast') chips.push(chip(`Agonizing Blast (+${sc.mod})`, o.agonizing, () => { o.agonizing = !o.agonizing; render(); }, 'Eldritch Invocation: add your spellcasting modifier to the damage'));
  // Life Domain: on by default, since it applies to every healing spell cast with a slot
  const life = s.heal && lifeHealing(s, slot), disciple = life && o.disciple !== false ? life.disciple : 0;
  if (life) chips.push(chip(`Disciple of Life +${life.disciple}`, !!disciple, () => { o.disciple = !disciple; render(); }, 'Life Domain: healing spells cast with a slot restore 2 + the slot\'s level more'));
  const healText = r.heal && (life?.supreme ? `${r.heal.n * r.heal.d + r.heal.flat + disciple}` : diceText({ ...r.heal, flat: r.heal.flat + disciple }));
  const healSub = r.heal && [s.healMod ? `${fmt(sc.mod)} ${sc.ability}` : '', disciple ? `+${disciple} Disciple of Life` : '', life?.supreme ? 'dice at maximum' : ''].filter(Boolean).join(', ');
  return h('div', { class: 'card' }, back('Spells', 'spell'),
    h('h3', {}, s.name, s.conc ? h('em', { class: 'badge' }, 'Concentration') : null, s.ritual ? h('em', { class: 'badge' }, 'Ritual') : null),
    h('p', { class: 'sub' }, sub),
    h('div', { class: 'nums' },
      s.atk ? numBox('Spell attack', fmt(r.attack), sc.ability) : null,
      s.save ? numBox(`${s.save} save`, `DC ${r.dc}`, s.half ? 'half on success' : null) : null,
      r.parts.length ? numBox(s.rider ? 'Extra damage' : 'Damage', r.text) : null,
      r.heal ? numBox(s.temp ? 'Temp HP' : 'Healing', healText, healSub) : null),
    // slot levels: every spell with a level can use a higher slot (it only gets stronger if it scales)
    scales || (s.level > 0 && s.heal && s.up) || (s.level > 0 && RS) ? h('div', { class: 'slots' }, h('small', {}, 'Slot'),
      Array.from({ length: 10 - s.level }, (_, i) => s.level + i).map(l => {
        const left = RS ? RS.slotsLeft(l) : null;
        return h('button', { class: 'slotbtn' + (l === slot ? ' on' : '') + (left === 0 ? ' none' : ''), title: left == null ? null : `${left} level ${l} slot${left === 1 ? '' : 's'} left`,
          onclick: () => { o.slot = l; render(); } }, l);
      })) : null,
    s.level > 0 && RS ? h('p', { class: 'slotleft' + (RS.slotsLeft(slot) ? '' : ' none') },
      RS.slotTotal(slot) ? `Level ${slot} slots: ${RS.slotsLeft(slot)} of ${RS.slotTotal(slot)} left` : `No level ${slot} slots on your sheet`,
      s.level < slot && !scales && !(s.heal && s.up) ? ' (a higher slot does nothing more for this spell)' : '') : null,
    s.atk ? effectsNote({ kind: 'attack', ability: sc.ability, spell: true }) : null,
    concNote,
    chips.length ? h('div', { class: 'chips' }, chips) : null,
    s.dmg ? h('div', { class: 'extras' }, field('Extra damage', 'extraDmg', o, 'e.g. 1d6', '8em')) : null,
    btns,
    s.note ? h('p', { class: 'note' }, s.note) : null,
    h('details', { class: 'spelltext' }, h('summary', {}, 'Spell text'), spellText(s.text)));
}

// The SRD text uses a little Markdown: **bold**, _italic_, tables
function spellText(text) {
  const esc = t => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const inline = t => esc(t).replace(/\*\*_?(.+?)_?\*\*/g, '<b>$1</b>').replace(/(^|[\s(])[_*]([^_*]+?)[_*](?=[\s.,;:)]|$)/g, '$1<i>$2</i>');
  return h('div', {}, text.split(/\n{2,}/).map(block => {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length && lines.every(l => l.startsWith('|'))) {
      return h('table', {}, lines.filter(l => !/^[|:\s-]+$/.test(l)).map(l =>
        h('tr', {}, l.replace(/^\||\|$/g, '').split('|').map(c => h('td', { html: inline(c.trim()) })))));
    }
    return h('p', { html: lines.map(inline).join('<br>') });
  }));
}

function testList(rows, kind, extraDice) {
  return h('div', { class: 'tests' }, rows.map(r => {
    const fx = withEffects({ kind: kind === 'Save' ? 'save' : 'check', ability: r.ability, skill: r.skill }, null);
    const flag = [fx.mod ? fmt(fx.mod) : null, ...fx.dice.map(diceBit), fx.mode === 'adv' ? 'Adv' : fx.mode === 'dis' ? 'Dis' : null,
      fx.autoFail.length ? 'Fails' : null].filter(Boolean).join(' ');
    const roll = m => rollTest(r.label, kind, r.mod, m, extraDice(), r.ability, r.skill);
    return h('div', { class: 'trow' },
      h('button', { class: 'tmain', onclick: () => roll(null) },
        h('span', { class: 'iname' }, r.label, r.sub ? h('small', {}, r.sub) : null),
        flag ? h('span', { class: 'fxflag', title: fx.tag || [...fx.parts, ...fx.dice].map(p => p.name).join(', ') || fx.autoFail.join(', ') }, flag) : null,
        h('b', {}, fmt(r.mod))),
      h('button', { class: 'tadv', title: 'Roll with Advantage', onclick: () => roll('adv') }, 'Adv'),
      h('button', { class: 'tdis', title: 'Roll with Disadvantage', onclick: () => roll('dis') }, 'Dis'));
  }));
}

// Under a card: what the active effects do to this roll
const diceBit = x => `${x.sign < 0 ? '−' : '+'}${x.n}d${x.d}`;
function effectsNote(roll) {
  const fx = withEffects(roll, null);
  const bits = [...fx.parts.map(p => `${fmt(p.mod)} (${p.name})`), ...fx.dice.map(x => `${diceBit(x)} (${x.name})`), fx.tag,
    ...fx.autoFail.map(n => `automatic failure (${n})`), ...fx.notes].filter(Boolean);
  return bits.length ? h('p', { class: 'fxnote' }, h('b', {}, 'Effects: '), bits.join(' · ')) : null;
}

function checkView() {
  // Guidance on you (Effects tray) adds its die to its own skill, so the chip goes
  const o = opt('check'), mods = C.mods || {}, guided = onMe('Guidance');
  const extra = () => o.guidance && !guided ? [{ label: 'Guidance', n: 1, d: 4 }] : [];
  return [needSheet(), guided ? null : h('div', { class: 'chips' }, chip('Guidance +1d4', o.guidance, () => { o.guidance = !o.guidance; render(); })),
    h('h4', {}, 'Abilities'),
    testList(Object.entries(D.rules.abilities).map(([ab, full]) => ({ label: full, ability: ab, mod: mods[ab] ?? 0 })), 'Check', extra),
    h('h4', {}, 'Skills'),
    testList((C.skills || []).map(s => ({ label: s.name, sub: s.ability, ability: s.ability, skill: s.name, mod: s.mod })), 'Check', extra)];
}

function saveView() {
  const o = opt('save'), blessed = onMe('Bless');
  return [needSheet(), blessed ? null : h('div', { class: 'chips' }, chip('Bless +1d4', o.bless, () => { o.bless = !o.bless; render(); })),
    testList((C.saves || []).map(s => ({ label: s.name, sub: s.ability, ability: s.ability, mod: s.mod })), 'Save', () => o.bless && !blessed ? [{ label: 'Bless', n: 1, d: 4 }] : [])];
}

function initView() {
  const mod = C.initiativeMod ?? 0;
  return h('div', { class: 'card' }, needSheet(), h('div', { class: 'nums' }, numBox('Initiative', fmt(mod), typeof C.initiative === 'number' ? 'from your sheet' : 'DEX modifier')),
    effectsNote({ kind: 'check', ability: 'DEX' }),
    rollButtons(m => rollTest('Initiative', 'Initiative', mod, m, [], 'DEX'), 'Roll initiative'));
}

function diceView() {
  const quick = [4, 6, 8, 10, 12, 20, 100];
  const go = () => { if (!rollExpr(state.expr)) $('rollPick').querySelector('.exprin')?.classList.add('bad'); };
  return h('div', { class: 'card' },
    h('div', { class: 'counter' }, h('small', {}, 'How many'),
      h('button', { onclick: () => { state.count = Math.max(1, state.count - 1); render(); }, 'aria-label': 'Fewer dice' }, '−'),
      h('b', {}, state.count),
      h('button', { onclick: () => { state.count = Math.min(20, state.count + 1); render(); }, 'aria-label': 'More dice' }, '+')),
    h('div', { class: 'quick' }, quick.map(d => h('button', { class: 'qd', onclick: () => rollExpr(`${state.count}d${d}`), 'aria-label': `Roll ${state.count}d${d}` }, h('span', { class: `die d${d}` }, h('b', {}, `d${d}`))))),
    h('form', { class: 'expr', onsubmit: e => { e.preventDefault(); go(); } },
      h('input', { class: 'exprin', value: state.expr, placeholder: '2d6+3, 4d6kh3, 1d20-1…', 'data-keep': 'expr', 'aria-label': 'Dice to roll',
        oninput: e => { state.expr = e.target.value; e.target.classList.remove('bad'); } }),
      h('button', { class: 'go' }, 'Roll')),
    h('p', { class: 'hint' }, 'kh3 keeps the highest 3 dice, kl1 the lowest.'));
}

const VIEWS = { attack: attackView, spell: spellView, check: checkView, save: saveView, init: initView, dice: diceView,
  rest: () => window.resources?.view() }; // rest.js: spell slots, class features, Hit Point Dice, rests

function render() {
  for (const b of $('rollActions').children) b.classList.toggle('on', b.dataset.tab === state.tab);
  // keep typing focus when the view is rebuilt
  const a = document.activeElement, keep = a && $('rollPick').contains(a) ? a.dataset.keep : null, pos = keep && a.selectionStart;
  $('rollPick').replaceChildren(...[VIEWS[state.tab]()].flat(Infinity).filter(Boolean));
  if (keep) {
    const n = $('rollPick').querySelector(`[data-keep="${keep}"]`);
    if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* not a text input */ } }
  }
}

// ---- Panel open / closed ---------------------------------------------------------------
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* storage blocked */ } } };
function setOpen(open) {
  document.body.classList.toggle('roller-open', open);
  $('rollerTab').setAttribute('aria-expanded', String(open));
  store.set('roller-open', open ? '1' : '0');
}
const saved = store.get('roller-open');
setOpen(saved ? saved === '1' : innerWidth >= 900);
$('rollerTab').addEventListener('click', () => setOpen(!document.body.classList.contains('roller-open')));

// The panel sits under the header, whose height changes when it wraps
new ResizeObserver(([e]) => document.documentElement.style.setProperty('--head', e.target.offsetHeight + 'px'))
  .observe(document.querySelector('header'));

// The rolls: drag the line above them (#logGrip) to make them taller or shorter, or show them in their own column left of
// the buttons (#logSide: body.roll-side, the panel gets wider; the grip is then the panel's left edge and sets the
// column's width). Double-click the grip: the default size. Arrow keys on the grip work too. Remembered in this browser.
const grip = $('logGrip'), sideBtn = $('logSide'), narrow = matchMedia('(max-width: 760px)');
const isSide = () => document.body.classList.contains('roll-side') && !narrow.matches;
function setSide(on) {
  document.body.classList.toggle('roll-side', on);
  sideBtn.setAttribute('aria-pressed', String(on));
  sideBtn.title = on ? 'Put the rolls back under the buttons' : 'Show the rolls in a column left of the buttons';
  grip.setAttribute('aria-orientation', isSide() ? 'vertical' : 'horizontal');
  store.set('roll-side', on ? '1' : '0');
}
// size: the rolls' height, or the column's width (kept to what fits); null: back to the default. save: remember it.
function sizeLog(size, save = true) {
  const roller = $('roller');
  let px = null;
  if (isSide()) {
    if (size != null) px = Math.round(Math.max(240, Math.min(size, innerWidth - $('rollPick').offsetWidth - 280)));
    if (px == null) document.documentElement.style.removeProperty('--log-w'); else document.documentElement.style.setProperty('--log-w', px + 'px');
    if (save) store.set('roll-log-w', px ?? '');
  } else {
    if (size != null) {
      const room = roller.clientHeight - $('rollGuide').offsetHeight - $('rollActions').offsetHeight - $('logHead').offsetHeight - 60;
      px = Math.round(Math.max(80, Math.min(size, room)));
      roller.style.setProperty('--log-h', px + 'px');
    }
    roller.classList.toggle('log-sized', px != null);
    if (save) store.set('roll-log-h', px ?? '');
  }
}
const logSize = () => isSide() ? $('rollLog').offsetWidth : $('rollLog').offsetHeight;
grip.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault();
  const side = isSide(), at = p => side ? p.clientX : p.clientY, from = at(e), size0 = logSize();
  let last = null;
  try { grip.setPointerCapture(e.pointerId); } catch { /* not a live pointer: the moves still reach the grip while over it */ }
  grip.classList.add('drag');
  document.body.classList.add('log-dragging');
  const move = ev => { last = size0 + from - at(ev); sizeLog(last, false); }; // up (or left, in the column) = bigger
  const end = () => {
    grip.removeEventListener('pointermove', move);
    grip.removeEventListener('pointerup', end);
    grip.removeEventListener('pointercancel', end);
    grip.classList.remove('drag');
    document.body.classList.remove('log-dragging');
    if (last != null) sizeLog(last);
  };
  grip.addEventListener('pointermove', move);
  grip.addEventListener('pointerup', end);
  grip.addEventListener('pointercancel', end);
});
grip.addEventListener('dblclick', () => sizeLog(null));
grip.addEventListener('keydown', e => {
  const side = isSide(), step = e.shiftKey ? 60 : 20;
  const d = side ? { ArrowLeft: step, ArrowRight: -step }[e.key] : { ArrowUp: step, ArrowDown: -step }[e.key];
  if (e.key === 'Home') { e.preventDefault(); return sizeLog(null); }
  if (!d) return;
  e.preventDefault();
  sizeLog(logSize() + d);
});
sideBtn.addEventListener('click', () => setSide(!document.body.classList.contains('roll-side')));
narrow.addEventListener('change', () => grip.setAttribute('aria-orientation', isSide() ? 'vertical' : 'horizontal'));
{
  const w = +store.get('roll-log-w'), hgt = +store.get('roll-log-h');
  if (w) document.documentElement.style.setProperty('--log-w', w + 'px');
  if (hgt) { $('roller').style.setProperty('--log-h', hgt + 'px'); $('roller').classList.add('log-sized'); }
  setSide(store.get('roll-side') === '1');
}

// "What do I need to roll?" (the switch above the tabs): the buttons keep their names but show what to roll instead of
// rolling. Remembered in this browser.
const guideBox = $('rollGuideBox');
function setGuide(on) {
  state.guide = on;
  guideBox.checked = on;
  $('roller').classList.toggle('guide', on);
  store.set('roll-guide', on ? '1' : '0');
}
setGuide(store.get('roll-guide') === '1');
guideBox.addEventListener('change', () => setGuide(guideBox.checked));

for (const b of $('rollActions').children) b.addEventListener('click', () => { state.tab = b.dataset.tab; render(); });
$('clearLog').addEventListener('click', () => $('rollLog').replaceChildren(h('li', { class: 'empty' }, 'Your rolls show up here. Roll as often as you like.')));
for (const ev of ['character-change', 'effects-change', 'resources-change', 'sheet-state-change']) document.addEventListener(ev, render);
document.addEventListener('sheet-loaded', () => { state.vex = null; });
// For other scripts, e.g. the Becoming Marble page's "Roll CON save" (bonus: added to the save, Indomitable), and the
// Rest tab's feature buttons (rest.js): log(entry) adds a log entry and returns its element; rollDamage(parts) rolls dice
// (with "What do I need to roll?" on it rolls nothing: total null); totalBox(label, done) asks for the total you rolled.
window.roller = {
  // bonusWhy: what the bonus is, for the log entry's "?"
  save(ability, title, purpose = null, bonus = 0, bonusWhy = 'bonus') {
    const s = (C.saves || []).find(x => x.ability === ability);
    setOpen(true);
    return rollTest(title || `${D.rules.abilities[ability]} save`, 'Save', (s?.mod ?? 0) + bonus, null, [], ability, null, purpose, { value: bonus, text: bonusWhy });
  },
  log: e => { setOpen(true); return log(e); },
  rollDamage,
  totalBox,
  get guide() { return state.guide; },
  setGuide
};
render();
})();
