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
const state = { tab: 'attack', picks: {}, opts: {}, search: '', count: 1, expr: '', vex: null };
const opt = key => state.opts[key] ||= {};

// ---- Dice ---------------------------------------------------------------------------
// Effects (effects.js: conditions, Killing Marble, your own) that apply to a roll. Advantage and Disadvantage from any
// sources cancel each other out, as the rules say.
// more: other sources of Advantage (War Caster on a concentration save)
function withEffects(roll, chosen, more = []) {
  const fx = window.effects ? window.effects.forRoll(roll) : { mod: 0, parts: [], adv: [], dis: [], autoFail: [], notes: [] };
  const adv = chosen === 'adv' || fx.adv.length > 0 || more.length > 0, dis = chosen === 'dis' || fx.dis.length > 0;
  const mode = adv && dis ? null : adv ? 'adv' : dis ? 'dis' : null, why = [...new Set([...fx.adv, ...more, ...fx.dis])];
  const tag = (adv && dis ? 'Advantage and Disadvantage cancel' : MODES[mode] || '') + (why.length ? ` (${why.join(', ')})` : '');
  return { ...fx, mode, tag: tag || null };
}

// A D20 Test. critOn is only given for attack rolls (checks and saves don't crit). fx: from withEffects().
function d20Test(mode, bonus, extraDice = [], critOn = null, fx = null) {
  if (fx) mode = fx.mode;
  const rolls = mode ? [rnd(20), rnd(20)] : [rnd(20)];
  const kept = mode === 'adv' ? (rolls[1] > rolls[0] ? 1 : 0) : mode === 'dis' ? (rolls[1] < rolls[0] ? 1 : 0) : 0;
  const nat = rolls[kept];
  const extra = extraDice.map(x => ({ ...x, rolls: Array.from({ length: x.n }, () => rnd(x.d)) }));
  return { mode, rolls, kept, nat, bonus, extra, total: nat + bonus + (fx?.mod || 0) + sum(extra.flatMap(x => x.rolls)),
    fxParts: fx?.parts || [], autoFail: fx?.autoFail || [], crit: critOn != null && nat >= critOn, fumble: critOn != null && nat === 1 };
}

// parts: [{ label, n, d, flat, type, gwf (1s and 2s count as 3), savage (roll twice, keep higher), explode (max extra dice),
//          max (every die counts as its highest face: Supreme Healing), critExtra (more dice on a crit: Piercer),
//          reroll1 (a 1 is rolled again: Tavern Brawler), min2 (1s count as 2: Elemental Adept) }]
function rollDamage(parts, crit = false) {
  const out = parts.map(p => {
    const n = p.n * (crit ? 2 : 1) + (crit && p.n && p.critExtra ? p.critExtra : 0);
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
    return { ...p, dice, alt, total: sum(dice.map(x => x.shown)) + p.flat };
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
// Elemental Adept's damage types, from the sheet's text: "Elemental Adept (Fire)", "Elemental Adept: WIS +1; Fire (Wizard 4): ..."
const ADEPT = ['acid', 'cold', 'fire', 'lightning', 'thunder'];
const adeptTypes = () => !hasFeat('Elemental Adept') ? [] : [...Object.values(C).filter(v => typeof v === 'string').join('\n')
  .matchAll(/Elemental Adept\b[:\s(]*([^()\n]*)/g)].flatMap(m => ADEPT.filter(t => new RegExp(`\\b${t}\\b`, 'i').test(m[1])));
// Unarmed Strike die from Unarmed Fighting (d6, d8 with nothing in hand), Tavern Brawler (d4) or Martial Arts: the biggest
function unarmedDie(o) {
  const sides = [hasFeat('Unarmed Fighting') ? (o.bare ?? true ? 8 : 6) : 0, hasFeat('Tavern Brawler') ? 4 : 0, lvlRow('monk')?.martialArtsDie || 0];
  const best = Math.max(...sides);
  return best ? '1d' + best : null;
}
// Cleric level of a Life Domain Cleric (0 otherwise): the subclass or its features are named somewhere on the sheet
function lifeCleric() {
  const c = (C.classes || []).find(x => x.key === 'cleric');
  if (!c || c.level < 3) return 0;
  const text = Object.values(window.fields || {}).filter(v => typeof v === 'string').join('\n');
  return /\b(Life Domain|Disciple of Life)\b/i.test(text) || /\bLife\b/i.test(`${C.classLevel ?? ''} ${C.subclass ?? ''}`) ? c.level : 0;
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
  : `${i ? '+ ' : ''}${diceText(p)}${p.type ? ' ' + p.type : ''}`).join(' ') || '—';

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
  const die = o.shillelagh ? ['1d8', '1d10', '1d12', '2d6'][tier - 1] : w?.unarmed ? unarmedDie(o) : null;
  const a = w && M.weaponAttack(w, item.magic, { twoHanded: o.twoHanded, casting, die });
  const sheetHit = parseHit(item.sheetBonus), sheetDmg = parseDamageText(item.sheetDamage, w?.dmg);
  let toHit, parts, source;
  if (a && (casting || o.twoHanded || sheetHit == null || !sheetDmg)) {
    toHit = a.toHit; parts = parseDamageText(a.damage, a.type) || []; source = 'Worked out from the rules';
  } else {
    toHit = sheetHit ?? 0; parts = sheetDmg || []; source = sheetHit != null || sheetDmg ? 'From your sheet' : 'No numbers on the sheet for this one';
  }
  if (o.shillelagh) for (const p of parts) p.type = 'force';
  const type = parts[0]?.type || w?.dmg || '', ability = a?.ability ?? 'STR';
  const abilityMod = casting ? casting.mod : C.mods?.[ability] ?? 0;
  const melee = w ? w.kind === 'melee' : true;
  if (parts[0]) {
    parts[0].label = item.name;
    if (o.cleave) parts[0].flat -= Math.max(0, abilityMod); // Cleave: the second creature's damage leaves out a positive modifier
    parts[0].gwf = (C.feats || []).includes('Great Weapon Fighting') && melee && !!(w?.props.includes('two-handed') || o.twoHanded);
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
  }
  // Feats. On by default where they nearly always apply (Great Weapon Master, Dueling, Thrown Weapon Fighting when thrown)
  const pb = C.profBonus || 2, heavy = !!w?.props.includes('heavy'), notes = [];
  const featBonus = (id, label, on, part) => { toggle(id, label, { on: o[id] ?? on }); if (o[id] ?? on) extras.push(part); };
  if (heavy && hasFeat('Great Weapon Master')) featBonus('gwm', `Great Weapon Master +${pb}`, true, { label: 'Great Weapon Master', n: 0, d: 0, flat: pb, type });
  if (w && melee && !w.unarmed && !twoHands && hasFeat('Dueling')) featBonus('dueling', 'Dueling +2 (no other weapon)', true, { label: 'Dueling', n: 0, d: 0, flat: 2, type });
  if (w?.props.includes('thrown') && hasFeat('Thrown Weapon Fighting')) featBonus('thrown', 'Thrown +2', w.kind === 'ranged', { label: 'Thrown Weapon Fighting', n: 0, d: 0, flat: 2, type });
  if (w && melee && hasFeat('Charger') && toggle('charge', 'Charge +1d8 (moved 10 ft straight)')) extras.push({ label: 'Charger', n: 1, d: 8, flat: 0, type });
  if (w?.unarmed && hasFeat('Unarmed Fighting')) toggle('bare', 'No weapon or Shield in hand (d8)', { on: o.bare ?? true });
  if (parts[0] && hasFeat('Piercer') && type === 'piercing') parts[0].critExtra = 1;
  if (parts[0] && w?.unarmed && hasFeat('Tavern Brawler')) parts[0].reroll1 = true;
  const note = (feat, text) => { if (hasFeat(feat)) notes.push([feat, text]); };
  if (w?.kind === 'ranged') note('Sharpshooter', 'ignore Half and Three-Quarters Cover; no Disadvantage at long range or with an enemy within 5 ft.');
  if (/crossbow/i.test(w?.name || '')) note('Crossbow Expert', 'ignore Loading; no Disadvantage with an enemy within 5 ft.');
  if (heavy && melee) note('Great Weapon Master', 'after a Critical Hit or dropping a creature to 0 HP, one more attack with this weapon as a Bonus Action.');
  if (type === 'piercing') note('Piercer', 'once per turn reroll one damage die and keep either; a Critical Hit adds one more die (counted in).');
  if (type === 'slashing') note('Slasher', "once per turn a hit cuts the target's Speed by 10 ft; a Critical Hit gives it Disadvantage on attacks until your next turn.");
  if (type === 'bludgeoning') note('Crusher', 'once per turn a hit can push the target 5 ft; after a Critical Hit, attacks against it have Advantage until your next turn.');
  if (w && (['Quarterstaff', 'Spear'].includes(w.name) || heavy && w.props.includes('reach'))) note('Polearm Master', 'after the Attack action, a Bonus Action attack with the other end (1d4 Bludgeoning).');
  if (w?.unarmed) note('Tavern Brawler', 'once per turn a hit can also push the target 5 ft; 1s on the damage die are rolled again.');
  if (w && melee) note('Shield Master', `after a hit, bash with your Shield: STR save DC ${8 + (C.mods?.STR ?? 0) + pb} or pushed 5 ft or knocked Prone.`);
  const rage = lvlRow('barbarian');
  if (rage && ability === 'STR' && toggle('rage', `Rage +${rage.rageDamage}`)) extras.push({ label: 'Rage', n: 0, d: 0, flat: rage.rageDamage, type });
  const rogue = lvlRow('rogue');
  if (rogue && w && (w.props.includes('finesse') || w.kind === 'ranged')) {
    const sa = parseDice(rogue.sneakAttack);
    if (toggle('sneak', `Sneak Attack ${diceText(sa)}`)) extras.push({ label: 'Sneak Attack', ...sa, type });
  }
  const riders = [];
  for (const { spell: s } of C.spells || []) {
    if (!s.rider) continue;
    const slot = Math.max(s.level, o['slot:' + s.name] || s.level);
    if (toggle('rider:' + s.name, s.name, { spell: s, slot })) {
      riders.push({ spell: s, slot });
      for (const p of M.spellRoll(s, slot).parts) extras.push({ label: s.name, ...p });
    }
  }
  if (w && knows('True Strike')) {
    if (toggle('trueStrike', `True Strike (${sc.ability})`) && tier > 1) extras.push({ label: 'True Strike', n: tier - 1, d: 6, flat: 0, type: 'radiant' });
  }
  if (w && ['Club', 'Quarterstaff'].includes(w.name) && knows('Shillelagh')) toggle('shillelagh', `Shillelagh (${sc.ability}, ${['d8', 'd10', 'd12', '2d6'][tier - 1]})`);
  if ((C.feats || []).includes('Savage Attacker')) toggle('savage', 'Savage Attacker');
  if (toggle('bless', 'Bless +1d4')) testDice.push({ label: 'Bless', n: 1, d: 4 });
  toHit += parseInt(o.extraHit, 10) || 0;
  for (const p of parseDamageText(o.extraDmg, type) || []) extras.push({ label: 'Extra', ...p });
  for (const p of window.effects?.forRoll({ kind: 'damage', ability, arms }).parts || []) extras.push({ label: p.name, n: 0, d: 0, flat: p.mod, type });
  return { toHit, parts: [...parts, ...extras], testDice, toggles, ability, abilityMod, source, melee, w, arms, notes, mastery, riders };
}

const knownSpells = () => (C.spells || []).map(x => x.spell);

// ---- Rolling (each call adds a new entry to the log) ---------------------------------
// again: a repeat from the log ("Again"), which uses no slot and no Vex of its own; vex: this roll has Vex's Advantage
function rollAttack(item, mode, o = { ...opt(item.key) }, again = false, vex = !again && !!state.vex) {
  if (vex && !again) state.vex = null; // used up by this attack
  const s = attackSetup(item, o), fx = withEffects({ kind: 'attack', ability: s.ability, arms: s.arms }, mode, vex ? ['Vex'] : []);
  const test = d20Test(mode, s.toHit, s.testDice, C.critRange || 20, fx);
  const node = log({ title: item.name + (o.cleave ? ' (Cleave)' : ''), tag: ['Attack', fx.tag],
    lines: [{ test, damage: s.parts.length && !test.fumble ? rollDamage(s.parts, test.crit) : null }],
    notes: fx.notes, extra: s.mastery ? [masteryNotes(s.mastery, s, test, again, item, o)] : [],
    again: m => rollAttack(item, m, o, true, vex), test: true, mode });
  // a smite toggled on is a spell cast with a slot
  if (!again) for (const r of s.riders) if (castPerHit(r.spell)) slotLine(node, r.spell, r.slot, false);
  if (vex) render();
}

function rollAttackDamage(item, crit, o = { ...opt(item.key) }) {
  const s = attackSetup(item, o);
  log({ title: item.name, tag: [crit ? 'Critical damage' : 'Damage'], lines: [{ damage: rollDamage(s.parts, crit) }],
    again: () => rollAttackDamage(item, crit, o) });
}

const unitOf = s => s.cantrip === 'beams' ? 'Beam' : s.name === 'Magic Missile' ? 'Dart' : 'Ray';

// what: 'cast' | 'heal' | 'damage' | 'crit' (the last two for riders such as Divine Smite) | 'start' (just cast it, no rolls)
function castSpell(s, mode, what = 'cast', o = { ...opt('spell:' + s.name) }) {
  const slot = Math.max(s.level, o.slot || s.level), r = M.spellRoll(s, slot), sc = C.spellcasting;
  const adept = adeptTypes(), parts = r.parts.map(p => ({ ...p, label: s.name, min2: adept.includes(p.type) }));
  if (parts[0] && s.explode) parts[0].explode = Math.max(0, sc.mod);
  if (parts[0] && o.agonizing) parts[0].flat += sc.mod;
  for (const p of parseDamageText(o.extraDmg, parts[0]?.type) || []) parts.push({ label: 'Extra', ...p });
  if (parts.length && what !== 'heal') {
    for (const p of window.effects?.forRoll({ kind: 'damage', ability: sc.ability }).parts || []) parts.push({ label: p.name, n: 0, d: 0, flat: p.mod, type: parts[0].type });
  }
  // Vex from a weapon hit: the next attack roll has Advantage (kept in o, so "Again" repeats it)
  if (s.atk && what === 'cast' && o.vex == null) {
    o = { ...o, vex: !!state.vex };
    if (o.vex) { state.vex = null; queueMicrotask(render); }
  }
  const vex = !!o.vex, fx = withEffects({ kind: 'attack', ability: sc.ability }, mode, vex ? ['Vex'] : []);
  const lines = [], many = r.count > 1, notes = [s.note];
  if (what === 'start') lines.push({});
  else if (what === 'heal') {
    const heal = [{ ...r.heal, type: s.temp ? 'temporary HP' : 'healing', label: s.name }], life = lifeHealing(s, slot);
    if (life && o.disciple !== false) heal.push({ label: 'Disciple of Life', n: 0, d: 0, flat: life.disciple, type: 'healing' });
    if (life?.supreme) heal[0].max = true;
    lines.push({ damage: rollDamage(heal), heal: true });
    if (life?.healer) notes.push(`Blessed Healer: if this healed someone other than you, you regain ${life.healer} HP.`);
    if (life?.supreme) notes.push('Supreme Healing: the healing dice count as their maximum.');
  } else if (s.atk && what === 'cast') {
    for (let i = 1; i <= r.count; i++) {
      const test = d20Test(mode, r.attack, o.bless ? [{ label: 'Bless', n: 1, d: 4 }] : [], 20, fx);
      lines.push({ label: many ? `${unitOf(s)} ${i}` : null, test, damage: parts.length && !test.fumble ? rollDamage(parts, test.crit) : null });
    }
  } else if (parts.length) {
    for (let i = 1; i <= r.count; i++) lines.push({ label: many ? `${unitOf(s)} ${i}` : null, damage: rollDamage(parts, what === 'crit') });
  } else lines.push({});
  const slotTag = s.level ? (slot > s.level ? `Level ${slot} slot` : `Level ${s.level}`) : 'Cantrip';
  return log({ title: s.name, tag: [what === 'heal' ? 'Heal' : what === 'crit' ? 'Critical damage' : s.rider && what === 'damage' ? 'Damage' : 'Cast', slotTag,
      s.atk && what === 'cast' ? fx.tag : null],
    dc: what === 'cast' && r.save ? { save: r.save, dc: r.dc, half: r.half } : null, lines, notes,
    again: m => castSpell(s, m, what, o), test: !!s.atk && what === 'cast', mode });
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
  const prev = fx.concentration(), go = () => { const node = run(); slotLine(node, s, slot, none); return node; };
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
function rollTest(title, kind, mod, mode, extraDice = [], ability = null, skill = null, purpose = null) {
  const more = purpose === 'concentration' && hasFeat('War Caster') ? ['War Caster'] : [];
  const fx = withEffects({ kind: kind === 'Save' ? 'save' : 'check', ability, skill }, mode, more), test = d20Test(mode, mod, extraDice, null, fx);
  log({ title, tag: [kind, fx.tag], lines: [{ test }],
    again: m => rollTest(title, kind, mod, m, extraDice, ability, skill, purpose), test: true, mode });
  document.dispatchEvent(new CustomEvent('test-rolled', { detail: { kind, ability, skill, title, total: test.total, autoFail: test.autoFail.length > 0, purpose } }));
}

function rollExpr(expr) {
  const terms = parseExpr(expr);
  if (!terms) return false;
  const parts = terms.map(t => {
    if (t.flat != null) return { n: 0, d: 0, flat: t.sign * t.flat, dice: [], total: t.sign * t.flat };
    const dice = Array.from({ length: t.n }, () => { const v = rnd(t.d); return { v, d: t.d, shown: v }; });
    if (t.keep) {
      const order = dice.map((x, i) => i).sort((a, b) => t.keep.high ? dice[b].v - dice[a].v : dice[a].v - dice[b].v);
      order.slice(t.keep.k).forEach(i => { dice[i].dropped = true; });
    }
    return { label: `${t.sign < 0 ? '−' : ''}${t.n}d${t.d}${t.keep ? 'k' + (t.keep.high ? 'h' : 'l') + t.keep.k : ''}`, n: t.n, d: t.d, flat: 0,
      dice, sign: t.sign, total: t.sign * sum(dice.filter(x => !x.dropped).map(x => x.v)) };
  });
  log({ title: expr.replace(/\s+/g, ''), tag: ['Dice'], lines: [{ damage: { parts, total: sum(parts.map(p => p.total)), plain: true } }],
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
  const extras = t.extra.flatMap(x => [h('span', { class: 'op' }, '+'), ...x.rolls.map(v => dieChip({ v, d: x.d, shown: v })), h('small', { class: 'xl' }, x.label)]);
  const fxBits = t.fxParts.flatMap(p => [h('span', { class: 'op' }, p.mod < 0 ? '−' : '+'), h('span', { class: 'mod fx' }, Math.abs(p.mod)), h('small', { class: 'xl' }, p.name)]);
  return h('div', { class: 'test' }, faces, h('span', { class: 'op' }, t.bonus < 0 ? '−' : '+'), h('span', { class: 'mod' }, Math.abs(t.bonus)),
    extras, fxBits, h('span', { class: 'op' }, '='), h('span', { class: 'total', 'data-count': t.total }, t.total),
    t.autoFail.length ? h('span', { class: 'flag fumble' }, `Automatic failure (${t.autoFail.join(', ')})`) : t.crit ? h('span', { class: 'flag crit' }, 'Critical hit!') : t.fumble ? h('span', { class: 'flag fumble' }, 'Natural 1 — miss') :
      t.nat === 20 ? h('span', { class: 'flag nat' }, 'Natural 20') : t.nat === 1 ? h('span', { class: 'flag low' }, 'Natural 1') : null);
}

function damageView(dmg, heal) {
  const rows = dmg.parts.map(p => h('div', { class: 'part' + (p.alt ? ' savage' : '') },
    p.label ? h('span', { class: 'pl' }, p.label) : null,
    p.dice.map(dieChip),
    p.alt ? h('span', { class: 'alt', title: 'Savage Attacker: the other roll' }, `(${sum(p.alt.map(x => x.shown))})`) : null,
    p.flat && (!dmg.plain || !p.dice.length) ? h('span', { class: 'flat' }, fmt(p.flat)) : null,
    p.dice.length && (p.flat || dmg.parts.length > 1) ? h('span', { class: 'pt' }, '= ' + p.total) : null,
    p.type ? h('i', { class: 'ty' }, p.type) : null));
  const byType = {};
  for (const p of dmg.parts) byType[p.type || ''] = (byType[p.type || ''] || 0) + p.total;
  const split = Object.keys(byType).length > 1 ? Object.entries(byType).map(([t, v]) => `${v} ${t}`).join(' + ') : '';
  return h('div', { class: 'dmg' + (heal ? ' heal' : '') }, rows,
    h('div', { class: 'dsum' }, h('span', { class: 'total', 'data-count': dmg.total }, dmg.total),
      h('span', { class: 'what' }, dmg.plain ? 'total' : heal ? dmg.parts[0].type : dmg.crit ? 'damage (critical: dice doubled)' : 'damage'), split ? h('small', {}, split) : null));
}

function entryView(e) {
  const tests = e.lines.map(l => l.test).filter(Boolean);
  const crit = tests.some(t => t.crit), fumble = tests.length && tests.every(t => t.fumble);
  const nat = !crit && tests.some(t => t.nat === 20);
  const li = h('li', { class: `roll${crit ? ' crit' : ''}${fumble ? ' fumble' : ''}${nat ? ' natural' : ''}` },
    h('div', { class: 'rhead' }, h('b', {}, e.title), h('span', { class: 'tag' }, e.tag.filter(Boolean).join(' · ')),
      h('time', {}, e.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }))));
  if (e.dc) li.append(h('div', { class: 'dc' }, h('b', {}, `DC ${e.dc.dc}`), ` ${D.rules.abilities[e.dc.save]} save`, e.dc.half ? ' · half damage on a success' : ''));
  for (const l of e.lines) {
    li.append(h('div', { class: 'line' }, l.label ? h('span', { class: 'ln' }, l.label) : null,
      l.test ? testView(l.test) : null, l.damage ? damageView(l.damage, l.heal) : null,
      e.dc?.half && l.damage ? h('div', { class: 'half' }, `On a successful save: ${Math.floor(l.damage.total / 2)}`) : null));
  }
  if (e.lines.length > 1 && e.lines.some(l => l.damage)) {
    li.append(h('div', { class: 'grand' }, tests.length ? 'Total if all hit: ' : 'Total: ', h('b', {}, sum(e.lines.map(l => l.damage?.total ?? 0)))));
  }
  for (const n of e.notes || []) if (n) li.append(h('p', { class: 'note' }, n));
  li.append(...e.extra || []);
  // "Again" repeats the roll exactly; the other buttons switch between normal, Advantage and Disadvantage
  li.append(h('footer', {}, h('button', { onclick: () => e.again(e.mode) }, '↻ Again'),
    e.test ? [[null, 'Normal'], ['adv', 'Advantage'], ['dis', 'Disadvantage']].filter(([m]) => m !== (e.mode || null))
      .map(([m, label]) => h('button', { onclick: () => e.again(m) }, label)) : null));
  return li;
}

function log(e) {
  e.time = new Date();
  const list = $('rollLog'), node = entryView(e);
  list.querySelector('.empty')?.remove();
  list.prepend(node);
  while (list.children.length > 80) list.lastChild.remove();
  list.scrollTop = 0;
  animate(node, e);
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
    effectsNote({ kind: 'attack', ability: s.ability, arms: s.arms }),
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
  if (s.atk) chips.push(chip('Bless +1d4', o.bless, () => { o.bless = !o.bless; render(); }));
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
    s.atk ? effectsNote({ kind: 'attack', ability: sc.ability }) : null,
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
    const flag = [fx.mod ? fmt(fx.mod) : null, fx.mode === 'adv' ? 'Adv' : fx.mode === 'dis' ? 'Dis' : null, fx.autoFail.length ? 'Fails' : null].filter(Boolean).join(' ');
    const roll = m => rollTest(r.label, kind, r.mod, m, extraDice(), r.ability, r.skill);
    return h('div', { class: 'trow' },
      h('button', { class: 'tmain', onclick: () => roll(null) },
        h('span', { class: 'iname' }, r.label, r.sub ? h('small', {}, r.sub) : null),
        flag ? h('span', { class: 'fxflag', title: fx.tag || fx.parts.map(p => p.name).join(', ') || fx.autoFail.join(', ') }, flag) : null,
        h('b', {}, fmt(r.mod))),
      h('button', { class: 'tadv', title: 'Roll with Advantage', onclick: () => roll('adv') }, 'Adv'),
      h('button', { class: 'tdis', title: 'Roll with Disadvantage', onclick: () => roll('dis') }, 'Dis'));
  }));
}

// Under a card: what the active effects do to this roll
function effectsNote(roll) {
  const fx = withEffects(roll, null);
  const bits = [...fx.parts.map(p => `${fmt(p.mod)} (${p.name})`), fx.tag, ...fx.autoFail.map(n => `automatic failure (${n})`), ...fx.notes].filter(Boolean);
  return bits.length ? h('p', { class: 'fxnote' }, h('b', {}, 'Effects: '), bits.join(' · ')) : null;
}

function checkView() {
  const o = opt('check'), mods = C.mods || {};
  const extra = () => o.guidance ? [{ label: 'Guidance', n: 1, d: 4 }] : [];
  return [needSheet(), h('div', { class: 'chips' }, chip('Guidance +1d4', o.guidance, () => { o.guidance = !o.guidance; render(); })),
    h('h4', {}, 'Abilities'),
    testList(Object.entries(D.rules.abilities).map(([ab, full]) => ({ label: full, ability: ab, mod: mods[ab] ?? 0 })), 'Check', extra),
    h('h4', {}, 'Skills'),
    testList((C.skills || []).map(s => ({ label: s.name, sub: s.ability, ability: s.ability, skill: s.name, mod: s.mod })), 'Check', extra)];
}

function saveView() {
  const o = opt('save');
  return [needSheet(), h('div', { class: 'chips' }, chip('Bless +1d4', o.bless, () => { o.bless = !o.bless; render(); })),
    testList((C.saves || []).map(s => ({ label: s.name, sub: s.ability, ability: s.ability, mod: s.mod })), 'Save', () => o.bless ? [{ label: 'Bless', n: 1, d: 4 }] : [])];
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

for (const b of $('rollActions').children) b.addEventListener('click', () => { state.tab = b.dataset.tab; render(); });
$('clearLog').addEventListener('click', () => $('rollLog').replaceChildren(h('li', { class: 'empty' }, 'Your rolls show up here. Roll as often as you like.')));
for (const ev of ['character-change', 'effects-change', 'resources-change', 'sheet-state-change']) document.addEventListener(ev, render);
document.addEventListener('sheet-loaded', () => { state.vex = null; });
// For other scripts, e.g. the Becoming Marble page's "Roll CON save"
window.roller = {
  save(ability, title, purpose = null) {
    const s = (C.saves || []).find(x => x.ability === ability);
    setOpen(true);
    rollTest(title || `${D.rules.abilities[ability]} save`, 'Save', s?.mod ?? 0, null, [], ability, null, purpose);
  }
};
render();
})();
