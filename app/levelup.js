/* Level up: the "Level up" button in the header asks first, then opens a window (drag it by its title bar) that walks
   through the new level: which class gets it (multiclassing allowed), Hit Points (fixed value or a roll), the new
   features with the choices they ask for, then new spells. Nothing touches the sheet until Apply on the last page, which
   lists every change with a tick box each; afterwards the window stays open as a note of what changed.
   Writes go through window.sheet (script.js), so the boxes that follow a stat (PB, modifiers, skills, HP from CON ...)
   move by themselves. Rules data: DND.classes / feats / species (the classes.js header explains choice and grants). */
(() => {
'use strict';
const D = window.DND, C = window.character, S = window.sheet, $ = id => document.getElementById(id);
const { fmt } = window.calc;

// h('div', { class: 'x', onclick: fn }, child, 'text', [more]) -> element
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
const rnd = d => crypto.getRandomValues(new Uint32Array(1))[0] % d + 1;
const ABS = Object.keys(D.rules.abilities), SKILLS = D.rules.skills;
const numIn = v => { const m = String(v ?? '').match(/([+-]?)\s*(\d+)/); return m ? (m[1] === '-' ? -1 : 1) * +m[2] : null; };
// "+4" by 1 -> "+5", "30 ft" by 10 -> "40 ft"
const shift = (text, d) => String(text).replace(/([+-]?)\s*(\d+)/, (m, sign, n) => {
  const v = (sign === '-' ? -1 : 1) * +n + d;
  return sign || v < 0 ? fmt(v) : String(v);
});
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const modOf = s => Math.floor((s - 10) / 2);
const pbAt = lvl => D.rules.proficiencyBonusByLevel[Math.min(20, Math.max(1, lvl)) - 1];
const sum = a => a.reduce((t, x) => t + x, 0);
const toggle = (arr, x) => { const i = arr.indexOf(x); if (i < 0) arr.push(x); else arr.splice(i, 1); };
const textOf = v => String(v ?? '').trim();

let L = null;   // the level-up in progress, null while the window is closed
let win = null; // the window

// ---- The character before and after -----------------------------------------------------
const cls = () => D.classes[L.key];
const total = () => C.classes.reduce((t, c) => t + c.level, 0);
const classLevel = () => L.isNew ? 1 : C.classes.find(c => c.key === L.key).level + 1;
const charLevel = () => total() + 1;
const tableRow = lvl => cls().levels[lvl - 1];
const newClasses = () => L.isNew ? [...C.classes, { key: L.key, name: cls().name, level: 1 }]
  : C.classes.map(c => c.key === L.key ? { ...c, level: c.level + 1 } : c);
const score = ab => typeof C[ab.toLowerCase()] === 'number' ? C[ab.toLowerCase()] : null;
const who = () => textOf(C.name) || 'Your character';
const primaryOf = key => ABS.find(ab => D.rules.abilities[ab] === D.classes[key].primaryAbility.split(/ or | and /)[0]) || 'STR';

// Multiclassing needs 13+ in the main ability of the new class and of every class you already have
function missingFor(key) {
  return [...C.classes.map(c => c.key), key].flatMap(k => {
    const m = D.classes[k].multiclass, ok = a => (score(a) ?? 0) >= 13;
    return (m.requiresAny ? m.requires.some(ok) : m.requires.every(ok)) ? []
      : [`${m.requires.join(m.requiresAny ? ' or ' : ' and ')} 13 for ${D.classes[k].name}`];
  });
}

// 0 = not proficient, 1 = proficient, 2 = Expertise: from the box's checkbox or the number in it
function profLevel(key, ab) {
  const v = C[key], pb = C.profBonus, box = S.profBox(key), diff = typeof v === 'number' ? v - C.mods[ab] : null;
  if (box) return S.get(box) ? (diff != null && diff >= 2 * pb ? 2 : 1) : 0;
  if (diff != null) return diff >= 2 * pb ? 2 : diff >= pb ? 1 : 0;
  return key.startsWith('skill:') && (C.backgroundData?.proficiencies ?? []).includes('Skill: ' + key.slice(6)) ? 1 : 0;
}
const skillAb = name => SKILLS.find(s => s.name === name).ability;

// ---- Subclass ------------------------------------------------------------------------------
// The free rules have one subclass per class. Its short name is looked for in the Class and Subclass boxes, the full
// name anywhere in the features text.
const SUB_WORD = { barbarian: 'Berserker', bard: 'Lore', cleric: 'Life', druid: 'Land', fighter: 'Champion', monk: 'Open Hand',
  paladin: 'Devotion', ranger: 'Hunter', rogue: 'Thief', sorcerer: 'Draconic', warlock: 'Fiend', wizard: 'Evoker|Evocation' };
const subclassOnSheet = key => new RegExp(`\\b(${SUB_WORD[key]})\\b`, 'i').test(`${C.classLevel ?? ''} ${C.subclass ?? ''}`) ||
  `${C.features ?? ''}\n${C.features2 ?? ''}`.toLowerCase().includes(D.classes[key].subclass.name.toLowerCase());

// -> { none } before the subclass level, else { data (it's the free-rules one), name, choosing, ask, here (a subclass feature at this level) }
function subclass() {
  const c = cls(), lvl = classLevel(), at = c.features.find(f => f.choice?.type === 'subclass')?.lvl ?? 3;
  if (lvl < at) return { none: true };
  const here = tableRow(lvl).features.includes(`${c.name} Subclass`);
  if (lvl === at) {
    const p = L.picks.subclass ||= { data: true, name: '' };
    return { choosing: true, data: p.data, name: p.data ? c.subclass.name : textOf(p.name), here };
  }
  if (subclassOnSheet(L.key)) return { data: true, name: c.subclass.name, here };
  const data = L.picks.subHave ?? true;
  return { data, name: data ? c.subclass.name : textOf(C.subclass), here, ask: here };
}

// ---- What the level brings ---------------------------------------------------------------
// Feature cards: class and subclass features at the new class level, table counts that go up without a feature of their
// own (Weapon Mastery, Eldritch Invocations), and species traits at the new character level.
function gains() {
  const c = cls(), lvl = classLevel(), src = `${c.name} ${lvl}`, out = [];
  for (const f of c.features.filter(f => f.lvl === lvl)) out.push({ ...f, id: `c${lvl}:${f.name}`, src, kind: 'feature' });
  const sub = subclass();
  if (sub.data && sub.here) {
    for (const f of c.subclass.features.filter(f => f.lvl === lvl)) out.push({ ...f, id: `s${lvl}:${f.name}`, src: c.subclass.name, kind: 'feature' });
  } else if (sub.here && !sub.none) {
    out.push({ id: 'subOther', name: `${sub.name || 'Subclass'} feature`, src, kind: 'feature', manual: true,
      text: `Your subclass gives a feature at ${c.name} level ${lvl}. It isn't in the free rules, so add it to the sheet yourself.` });
  }
  const now = tableRow(lvl), before = L.isNew ? {} : tableRow(lvl - 1), more = k => (now[k] || 0) - (before[k] || 0);
  if (masteryMore() > 0 && !out.some(f => f.choice?.type === 'weaponMastery')) {
    out.push({ id: `wm${lvl}`, name: 'Weapon Mastery', src, kind: 'feature', choice: { type: 'weaponMastery' },
      text: `You can use the mastery property of ${plural(masteryMore(), 'more kind')} of weapon.` });
  }
  if (more('eldritchInvocations') > 0 && !out.some(f => f.choice?.type === 'invocations')) {
    out.push({ id: `ei${lvl}`, name: 'Eldritch Invocations', src, kind: 'feature', choice: { type: 'invocations' },
      text: `You learn ${plural(more('eldritchInvocations'), 'more invocation')}.` });
  }
  const sp = C.speciesData, lv = charLevel();
  for (const f of sp?.features || []) if (f.lvl === lv) out.push({ ...f, id: `sp:${f.name}`, src: sp.name, kind: 'species' });
  return out;
}
// Weapon kinds to master gained at this level (every class with Weapon Mastery has its count per level)
const masteryMore = () => {
  const by = cls().weaponMastery?.countByLevel, lvl = classLevel();
  return by ? by[lvl - 1] - (L.isNew ? 0 : by[lvl - 2]) : 0;
};
// How many picks a table-driven choice gets at this level
const countOf = f => {
  if (f.choice.type === 'weaponMastery') return masteryMore();
  if (f.choice.type !== 'invocations') return f.choice.count || 1;
  const now = tableRow(classLevel()), before = L.isNew ? {} : tableRow(classLevel() - 1);
  return (now.eldritchInvocations || 0) - (before.eldritchInvocations || 0);
};

// The numbers in the class table that change ("Rages 3 -> 4")
const NUMBERS = { attacks: 'Attacks per Attack action', rages: 'Rages', rageDamage: 'Rage Damage', weaponMastery: 'Weapon Mastery kinds',
  bardicInspirationDie: 'Bardic Inspiration die', channelDivinityUses: 'Channel Divinity uses', wildShapeUses: 'Wild Shape uses',
  secondWindUses: 'Second Wind uses', actionSurgeUses: 'Action Surge uses', indomitableUses: 'Indomitable uses',
  martialArtsDie: 'Martial Arts die', focusPoints: 'Focus Points', unarmoredMovement: 'Unarmored Movement', favoredEnemies: 'Favored Enemy uses',
  sneakAttack: 'Sneak Attack', sorceryPoints: 'Sorcery Points', metamagic: 'Metamagic options', eldritchInvocations: 'Eldritch Invocations',
  arcanum: 'Mystic Arcanum', spellbook: 'Spells in your spellbook' };
const numText = (k, v) => v == null || v === 0 || (Array.isArray(v) && !v.length) ? '—' : /Die$/.test(k) ? 'd' + v
  : k === 'unarmoredMovement' ? `+${v} ft` : k === 'rageDamage' ? fmt(v) : Array.isArray(v) ? v.map(l => 'level ' + l).join(', ') : String(v);
function numbers() {
  const now = tableRow(classLevel()), before = L.isNew ? {} : tableRow(classLevel() - 1);
  return Object.keys(NUMBERS).filter(k => k in now && JSON.stringify(now[k]) !== JSON.stringify(before[k]) && !(L.isNew && k === 'attacks' && now[k] === 1))
    .map(k => ({ label: NUMBERS[k], from: numText(k, before[k]), to: numText(k, now[k]) }));
}

// ---- Feats -----------------------------------------------------------------------------------
// The feats a feat choice can take: Ability Score Improvement and General feats also allow Origin feats (no prerequisite)
// (Dragonmark feats count as feats you can take at those levels too.)
const FEAT_CATS = { general: ['general', 'origin', 'dragonmark'], 'epic-boon': ['epic-boon', 'general', 'origin', 'dragonmark'],
  'fighting-style': ['fighting-style'], origin: ['origin'] };
const featOf = f => f.choice?.type === 'feat' && D.feats.find(x => x.name === L.picks[f.id]?.name) || null;
// Armor training: the official sheet's armor boxes, else your classes (the first class's full training, later classes'
// multiclass training), armor feats on the sheet and the Proficiencies text. Without a class it can't tell, so it says yes.
function hasArmor(a) {
  const box = S.map?.checks?.['armor' + a];
  if (box) return !!S.get(box);
  const [first, ...rest] = newClasses(), word = a === 'Shields' ? 'Shield' : a;
  if (!first) return true;
  return (D.classes[first.key].armorTraining || []).some(t => t.startsWith(word)) || rest.some(c => (D.classes[c.key].multiclass.armor || []).includes(a))
    || C.feats.some(n => D.feats.find(x => x.name === n)?.grants?.armor?.includes(a))
    || new RegExp(`\\b${a === 'Shields' ? 'shields?' : a + ' armor'}\\b`, 'i').test(textOf(C.proficiencies));
}
function blocked(f) {
  if (C.feats.includes(f.name) && !f.repeatable) return 'already taken';
  const p = f.prerequisite;
  if (!p) return null;
  if (p.minimum_level > charLevel()) return `level ${p.minimum_level}+`;
  if (p.ability) {
    const abs = Object.keys(p.ability).filter(k => k !== 'any'), ok = a => (score(a) ?? 0) >= p.ability[a];
    if (!(p.ability.any ? abs.some(ok) : abs.every(ok))) return `needs ${abs.map(a => `${a} ${p.ability[a]}`).join(p.ability.any ? ' or ' : ' and ')}`;
  }
  if (p.feature_named === 'Spellcasting' && !newClasses().some(c => D.classes[c.key].spellcasting)) return 'needs Spellcasting';
  if (p.armor && !hasArmor(p.armor)) return `needs ${p.armor === 'Shields' ? 'Shield' : p.armor + ' armor'} training`;
  return null;
}
const featsFor = category => FEAT_CATS[category].flatMap(t => D.feats.filter(f => f.type === t));

// ---- Choices: one picker per choice type ----------------------------------------------------
const pickHead = (title, n, of) => h('div', { class: 'lu-pickhead' }, h('b', {}, title),
  of != null ? h('span', { class: 'lu-count' + (n >= of ? ' full' : '') }, `${n} / ${of}`) : null);

// Several of a list: items [{ name, note, off (why it can't be picked) }]
function multiPick(id, count, items, title) {
  const chosen = L.picks[id] ||= [];
  return h('div', { class: 'lu-pick' }, pickHead(title, chosen.length, count),
    h('div', { class: 'lu-opts' }, items.map(it => {
      const on = chosen.includes(it.name);
      return h('button', { class: 'lu-opt' + (on ? ' on' : ''), disabled: !on && (!!it.off || chosen.length >= count), title: it.title,
        onclick: () => { toggle(chosen, it.name); render(); } }, h('b', {}, it.name), it.off || it.note ? h('small', {}, it.off || it.note) : null);
    })));
}

// One of a list, as cards with their text: items [{ name, text, off }]. after: shown right under the chosen card
// (its own choices); compact: the cards not chosen show one line of their text.
function onePick(get, set, items, { after = null, compact = false } = {}) {
  return h('div', { class: 'lu-cards' + (compact ? ' compact' : '') }, items.map(it => {
    const on = get() === it.name;
    return [h('button', { class: 'lu-card' + (on ? ' on' : ''), disabled: !!it.off, title: compact && !on ? it.text : null,
      onclick: () => { set(it.name); render(); } }, h('b', {}, it.name, it.tag ? h('small', { class: 'lu-src' }, it.tag) : null), h('span', {}, it.off ? `Can't take it: ${it.off}` : it.text)),
    on && after?.length ? h('div', { class: 'lu-after' }, after) : null];
  }));
}

// A few short texts (languages, tools)
function textsPick(id, count, label, placeholder = '') {
  const vals = L.picks[id] ||= [];
  return h('div', { class: 'lu-pick' }, pickHead(`${plural(count, label)}`),
    h('div', { class: 'lu-texts' }, Array.from({ length: count }, (_, i) => h('input', { type: 'text', value: vals[i] || '', placeholder: placeholder || label,
      oninput: e => { vals[i] = e.target.value; } }))));
}

// The picks that hold new skill proficiencies: skills choices, Skilled, the multiclass skill
const skillPickIds = () => [...gains().flatMap(f => f.choice?.type === 'skills' ? [f.id]
  : ['skillsOrTools', 'skillExpert'].includes(featOf(f)?.choice?.type) ? [f.id + ':sk'] : []), ...L.isNew ? ['mc:sk'] : []];

// Skill proficiencies: the ones you have already (or picked elsewhere this level) are greyed out
function skillPick(id, count, from, title = 'Skill proficiencies') {
  const taken = new Set(skillPickIds().filter(k => k !== id).flatMap(k => L.picks[k] || []));
  return multiPick(id, count, from.map(name => ({ name, off: profLevel('skill:' + name, skillAb(name)) ? 'have it' : taken.has(name) ? 'picked elsewhere' : null })), title);
}

// Expertise: skills you are proficient in (or get this level) and don't have Expertise in yet
function expertisePick(f) {
  return [multiPick(f.id, f.choice.count, expertiseItems(f.choice.from), 'Expertise'), f.choice.languages ? textsPick(f.id + ':lang', f.choice.languages, 'language') : null];
}
// allSkills: proficient in everything anyway (Boon of Skill)
function expertiseItems(from = SKILLS.map(s => s.name), allSkills = false) {
  const gained = new Set(skillPickIds().flatMap(id => L.picks[id] || []));
  return from.map(name => {
    const lvl = profLevel('skill:' + name, skillAb(name));
    return { name, off: lvl >= 2 ? 'has Expertise' : lvl < 1 && !gained.has(name) && !allSkills ? 'not proficient' : null };
  }).sort((a, b) => !!a.off - !!b.off);
}

// Ability score buttons: "STR 16 -> 18". sel: the chosen abilities, n: how much each goes up
function abilityGrid(choose, sel, n, max, onPick) {
  return h('div', { class: 'lu-abs' }, ABS.filter(ab => !choose || choose === 'any' || choose.includes(ab)).map(ab => {
    const s = score(ab), on = sel.includes(ab), full = s != null && s >= max;
    return h('button', { class: 'lu-ab' + (on ? ' on' : ''), disabled: full && !on, onclick: () => { onPick(ab); render(); },
      title: full ? `Already ${max}, the most this can raise it to` : null },
    h('small', {}, ab), h('b', {}, s ?? '?'), on && s != null ? h('span', {}, '→ ' + Math.min(max, s + n)) : null);
  }));
}

// Ability Score Improvement: +2 to one score or +1 to two
function asiPick(p, max) {
  const a = p.asi ||= { mode: 2, sel: [primaryOf(L.key)] };
  return h('div', { class: 'lu-pick' },
    h('div', { class: 'chips' }, [[2, '+2 to one score'], [1, '+1 to two scores']].map(([m, t]) =>
      h('button', { class: 'chip' + (a.mode === m ? ' on' : ''), onclick: () => { a.mode = m; a.sel = a.sel.slice(0, m === 2 ? 1 : 2); render(); } }, t))),
    abilityGrid('any', a.sel, a.mode, max, ab => {
      if (a.mode === 2) a.sel = [ab];
      else if (a.sel.includes(ab)) toggle(a.sel, ab);
      else { a.sel.push(ab); if (a.sel.length > 2) a.sel.shift(); }
    }));
}

const FREE = 'Free rules';
const bookOf = x => x.source || FREE;
function featPick(f) {
  const ch = f.choice, p = L.picks[f.id] ||= { name: ch.category === 'general' ? 'Ability Score Improvement' : '' };
  const ui = L.ui[f.id] ||= { q: '', book: '' }, all = featsFor(ch.category);
  const items = all.map(x => ({ name: x.name, text: x.summary, off: blocked(x), tag: x.source ? bookOf(x).replace(/ \(2024\)$/, '') : null, book: bookOf(x) }));
  if (ch.or) items.push({ name: ch.or.name, text: `Instead of a feat: learn ${ch.or.cantrips} ${cap(ch.or.list)} cantrips; they count as ${cls().name} spells.` });
  items.push({ name: 'Other feat', text: 'A feat from another book: type its name below and add what it does yourself.' });
  const feat = D.feats.find(x => x.name === p.name), ai = feat?.abilityIncrease, fc = feat?.choice, extra = [];
  if (p.name === 'Other feat') extra.push(h('input', { type: 'text', class: 'lu-wide', value: p.other || '', placeholder: 'Feat name', oninput: e => { p.other = e.target.value; } }));
  if (ai?.options) extra.push(asiPick(p, ai.max));
  else if (ai?.amount) {
    p.ab ||= [];
    const choose = ai.choose === 'noSaveProf' ? ABS.filter(ab => !profLevel('save:' + ab, ab) || p.ab.includes(ab)) : ai.choose;
    extra.push(h('div', { class: 'lu-pick' }, pickHead(`+${ai.amount} to one score (max ${ai.max})${ai.unsure ? ": the feat list doesn't say which, check the book" : ai.choose === 'noSaveProf' ? ' whose save you lack' : ''}`),
      abilityGrid(choose, p.ab, ai.amount, ai.max, ab => { p.ab = [ab]; })));
  }
  if (fc?.type === 'tools') extra.push(textsPick(f.id + ':tools', fc.count, fc.kind.replace(/s$/, '')));
  if (fc?.type === 'featSpells') {
    if (fc.fixed.length) extra.push(h('p', { class: 'lu-note' }, `Always prepared: ${fc.fixed.join(', ')}.`));
    const n = featSpellCount(fc);
    if (n) extra.push(spellPick(f.id + ':fs', { count: n, levels: fc.levels, lists: null, schools: fc.schools, ritual: fc.ritual,
      title: `${fc.ritual ? 'Ritual' : (fc.schools || []).join(' or ')} spell${n > 1 ? 's' : ''} (level ${fc.levels.join(', ')})` }));
  }
  if (fc?.type === 'skillOrExpertise') {
    extra.push(multiPick(f.id + ':sx', fc.count, fc.from.map(name => {
      const lvl = profLevel('skill:' + name, skillAb(name));
      return { name, note: lvl === 1 ? 'Expertise' : lvl ? null : 'proficiency', off: lvl >= 2 ? 'has Expertise' : null };
    }), 'Proficiency (Expertise if you have it)'));
  }
  if (fc?.type === 'skillExpert') {
    extra.push(skillPick(f.id + ':sk', 1, SKILLS.map(s => s.name), 'Skill proficiency'), multiPick(f.id + ':ex', 1, expertiseItems(), 'Expertise'));
  }
  if (fc?.type === 'allSkills') extra.push(h('p', { class: 'lu-note' }, 'Proficiency in every skill you lack.'), multiPick(f.id + ':ex', 1, expertiseItems(undefined, true), 'Expertise'));
  if (fc?.type === 'damageType') extra.push(multiPick(f.id + ':dt', fc.count, fc.from.map(name => ({ name })), fc.count > 1 ? 'Damage types' : 'Damage type'));
  if (fc?.type === 'weaponMastery') extra.push(multiPick(f.id + ':wm', fc.count, weaponItems(), 'Weapon kind to master'));
  if (feat?.choice?.type === 'skillsOrTools') {
    extra.push(skillPick(f.id + ':sk', feat.choice.count, SKILLS.map(s => s.name), 'Skills (or tools, below)'),
      textsPick(f.id + ':tools', 1, 'tool', 'Tools instead of skills (optional)'));
  }
  if (feat?.choice?.type === 'magicInitiate') {
    p.list ||= feat.choice.lists.includes(C.backgroundData?.featList) ? C.backgroundData.featList : feat.choice.lists[0];
    const list = cap(p.list);
    extra.push(h('div', { class: 'chips' }, feat.choice.lists.map(l => h('button', { class: 'chip' + (p.list === l ? ' on' : ''),
      onclick: () => { p.list = l; L.spells[f.id + ':c'] = []; L.spells[f.id + ':1'] = []; render(); } }, cap(l) + ' list'))),
    spellPick(f.id + ':c', { count: feat.choice.cantrips, levels: [0], lists: [list], title: `${list} cantrips` }),
    spellPick(f.id + ':1', { count: feat.choice.level1, levels: [1], lists: [list], title: `Level 1 ${list} spell` }));
  }
  if (ch.or && p.name === ch.or.name) {
    extra.push(spellPick(f.id + ':or', { count: ch.or.cantrips, levels: [0], lists: [cap(ch.or.list)], title: `${cap(ch.or.list)} cantrips` }));
  }
  // A long list: filter by book and search. The chosen feat always stays in view.
  const books = [...new Set(all.map(bookOf))], box = h('div');
  const fill = () => {
    const q = ui.q.trim().toLowerCase();
    const shown = items.filter(it => it.name === p.name || !it.book || (!ui.book || it.book === ui.book) && (!q || `${it.name} ${it.text}`.toLowerCase().includes(q)));
    box.replaceChildren(onePick(() => p.name, n => { if (n !== p.name) dropSubPicks(f.id); p.name = n; }, shown, { after: extra, compact: true }));
  };
  fill();
  return [books.length > 1 || all.length > 12 ? h('div', { class: 'lu-find' },
    h('input', { type: 'search', class: 'lu-search', placeholder: 'Search feats', value: ui.q, oninput: e => { ui.q = e.target.value; fill(); } }),
    books.length > 1 ? h('select', { onchange: e => { ui.book = e.target.value; fill(); } },
      h('option', { value: '' }, 'All books'), books.map(b => h('option', { value: b, selected: ui.book === b }, b))) : null) : null, box];
}
const featSpellCount = fc => fc.count === 'pb' ? pbAt(charLevel()) : fc.count;
// A different feat: forget the spells and skills picked for the old one
function dropSubPicks(id) {
  for (const k of Object.keys(L.spells)) if (k.startsWith(id + ':')) delete L.spells[k];
  for (const k of Object.keys(L.picks)) if (k.startsWith(id + ':')) delete L.picks[k];
}
// The spell picks that belong to a feature as it is chosen now
function spellIdsOf(f) {
  const t = f.choice?.type, p = L.picks[f.id];
  if (['spell', 'spells', 'spellbook'].includes(t)) return [f.id];
  if (t !== 'feat' || !p?.name) return [];
  if (p.name === 'Magic Initiate') return [f.id + ':c', f.id + ':1'];
  if (featOf(f)?.choice?.type === 'featSpells') return [f.id + ':fs'];
  return f.choice.or && p.name === f.choice.or.name ? [f.id + ':or'] : [];
}

function subclassPick() {
  const c = cls(), p = L.picks.subclass;
  return onePick(() => p.data ? c.subclass.name : 'Another subclass', n => { p.data = n === c.subclass.name; }, [
    { name: c.subclass.name, text: 'The subclass in the free rules: its features are added for you, now and at later levels.' },
    { name: 'Another subclass', text: 'From the Player\'s Handbook or elsewhere: type its name; add its features yourself.' }],
  { after: [h('input', { type: 'text', class: 'lu-wide', value: p.name, placeholder: 'Subclass name', oninput: e => { p.name = e.target.value; } })].filter(() => !p.data) });
}

const weaponItems = () => {
  const elig = cls().weaponMastery?.eligible || '', melee = /Melee/.test(elig), mine = /proficient/.test(elig);
  const prof = w => w.category === 'simple' || newClasses().some(({ key }) => {
    const m = D.classes[key].weaponProficiency.martial;
    return m === 'all' || m === 'light' && w.props.includes('light') || m === 'finesse-or-light' && (w.props.includes('light') || w.props.includes('finesse'));
  });
  return D.weapons.filter(w => (!melee || w.kind === 'melee') && (!mine || prof(w))).map(w => ({ name: w.name, note: cap(w.mastery) }));
};

// The picker for a feature's choice
function choiceUI(f) {
  const ch = f.choice, n = countOf(f), spells = (levels, lists, school) => spellPick(f.id, { count: n, levels, lists, school, title: `Choose ${plural(n, 'spell')}` });
  switch (ch.type) {
    case 'subclass': return subclassPick();
    case 'feat': return featPick(f);
    case 'skills': return skillPick(f.id, n, ch.from === 'class' ? cls().skills.from : SKILLS.map(s => s.name));
    case 'expertise': return expertisePick(f);
    case 'languages': return textsPick(f.id, n, 'language');
    case 'weaponMastery': return multiPick(f.id, n, weaponItems(), 'Weapon kinds to master');
    case 'invocations': {
      const known = `${C.features ?? ''}\n${C.features2 ?? ''}`;
      return multiPick(f.id, n, D.classes.warlock.invocations.map(i => ({ name: i.name, title: i.text,
        note: i.text.length > 90 ? i.text.slice(0, 88) + '…' : i.text,
        off: i.level > classLevel() ? `Warlock level ${i.level}+` : !i.repeatable && known.includes(i.name) ? 'on your sheet' : null })), 'Invocations');
    }
    case 'metamagic': return multiPick(f.id, n, D.classes.sorcerer.metamagic.map(m => ({ name: m.name, note: `${plural(m.cost, 'point')} · ${m.text}`,
      off: `${C.features ?? ''}`.includes(m.name) ? 'on your sheet' : null })), 'Metamagic options');
    case 'spell': return spells([ch.level], [cap(ch.list)]);
    case 'spells': return spells(ch.levels || range(0, maxSpellLevel()), (ch.lists || [L.key]).map(cap), null);
    case 'spellbook': return spells(range(1, ch.maxLevel || maxSpellLevel()), ['Wizard'], ch.school);
    case 'option': return onePick(() => L.picks[f.id], v => { L.picks[f.id] = v; }, ch.options);
  }
  return null;
}
const range = (a, b) => Array.from({ length: Math.max(0, b - a + 1) }, (_, i) => a + i);

// What a feature's pick says, for the sheet and the review ("Archery", "STR +2", "Longsword, Greatsword")
function pickText(f) {
  const ch = f.choice, p = L.picks[f.id];
  if (!ch) return '';
  const names = id => [...(Array.isArray(L.picks[id]) ? L.picks[id] : []), ...(L.spells[id] || [])].filter(textOf).join(', ');
  switch (ch.type) {
    case 'subclass': return subclass().name;
    case 'feat': {
      if (!p?.name) return '';
      if (p.name === 'Other feat') return textOf(p.other);
      const fixed = featOf(f)?.choice?.fixed?.join(', ');
      const bits = [featScores(f).map(x => `${x.ab} +${x.n}`).join(', '), ...[':sk', ':sx', ':ex', ':dt', ':wm', ':tools'].map(k => names(f.id + k)), fixed,
        ...spellIdsOf(f).map(names)].filter(Boolean);
      return p.name + (bits.length ? ': ' + bits.join('; ') : '');
    }
    case 'option': return p || '';
    case 'expertise': return [names(f.id), names(f.id + ':lang')].filter(Boolean).join('; ');
    default: return names(f.id);
  }
}
// The line a feature adds to the sheet, e.g. "Extra Attack (Fighter 5): Attack twice ...",
// "Archery (Fighting Style, Fighter 1): +2 bonus to attack rolls ...", "Ability Score Improvement: STR +2 (Fighter 4)"
function featureLine(f) {
  if (!f.choice) return `${f.name} (${f.src}): ${f.text}`;
  const pt = pickText(f), p = L.picks[f.id];
  if (f.choice.type === 'feat') {
    const feat = D.feats.find(x => x.name === p?.name), where = f.name === p?.name || f.name === 'Ability Score Improvement' ? f.src : `${f.name}, ${f.src}`;
    return `${pt} (${where})${feat && !feat.abilityIncrease?.options ? ': ' + feat.summary : ''}`;
  }
  const opt = f.choice.type === 'option' && f.choice.options.find(o => o.name === p);
  return `${f.name} (${f.src}): ${pt}${opt ? ' - ' + opt.text : ''}`;
}
// The ability increases a feat pick gives: [{ ab, n, max }]
function featScores(f) {
  const p = L.picks[f.id], feat = D.feats.find(x => x.name === p?.name), ai = feat?.abilityIncrease;
  if (ai?.options && p.asi) return p.asi.sel.map(ab => ({ ab, n: p.asi.mode, max: ai.max }));
  if (ai?.amount && p.ab?.length) return [{ ab: p.ab[0], n: ai.amount, max: ai.max }];
  return [];
}
// How many picks a feature's choice still needs (0 = done), for the warnings on the Review page
function missing(f) {
  const ch = f.choice, got = id => (L.picks[id] || L.spells[id] || []).filter(textOf).length;
  if (!ch) return 0;
  if (['skills', 'expertise', 'weaponMastery', 'invocations', 'metamagic', 'spell', 'spells', 'spellbook', 'languages'].includes(ch.type)) {
    return Math.max(0, countOf(f) - got(f.id));
  }
  return unpicked(f) ? 1 : 0;
}
// A feature's choice that isn't made at all
function unpicked(f) {
  const ch = f.choice;
  if (!ch || ch.type === 'subclass' && L.picks.subclass?.data) return false;
  if (ch.type === 'feat') return !L.picks[f.id]?.name || L.picks[f.id].name === 'Other feat' && !textOf(L.picks[f.id].other);
  return !pickText(f);
}

// ---- Spells ----------------------------------------------------------------------------------
const maxSpellLevel = () => {
  const s = tableRow(classLevel()).spells;
  return !s ? 0 : s.pact ? s.pact.slotLevel : s.slots.reduce((m, n, i) => n ? i + 1 : m, 0);
};
// Spell slots of a set of classes (script.js): multiclass caster levels add up, Pact Magic slots on top
const slotsFor = window.calc.slotsFor;

const known = () => new Set(C.spells.map(x => x.spell.name));
// New cantrips / prepared spells / spellbook spells this level, spells that come prepared, and the slots before and after
function spellPlan() {
  const c = cls(), lvl = classLevel(), now = tableRow(lvl), before = L.isNew ? null : tableRow(lvl - 1);
  const plan = { caster: !!c.spellcasting, cantrips: 0, prepared: 0, book: 0, lists: [c.name], always: [] };
  if (c.spellcasting) {
    plan.cantrips = now.spells.cantrips - (before?.spells.cantrips ?? 0);
    plan.prepared = now.spells.prepared - (before?.spells.prepared ?? 0);
    if (L.key === 'bard' && lvl >= 10) plan.lists.push('Cleric', 'Druid', 'Wizard'); // Magical Secrets
    if (L.key === 'wizard') plan.book = (now.spellbook || 0) - (before?.spellbook || 0);
  }
  const have = known(), add = (name, why) => {
    const s = D.spells.find(x => x.name === name);
    if (s && !have.has(name) && !plan.always.some(a => a.spell === s)) plan.always.push({ spell: s, why });
  };
  for (const f of gains()) {
    const o = f.choice?.type === 'option' && f.choice.options.find(o => o.name === L.picks[f.id]);
    if (o?.grants?.cantrips) plan.cantrips += o.grants.cantrips; // Magician, Thaumaturge: one more cantrip
    for (const n of f.grants?.alwaysPrepared || []) add(n, f.name);
  }
  const sub = subclass(), subSpells = c.subclass.spells;
  if (sub.data && subSpells && !subSpells.arid) for (const n of subSpells[lvl] || []) add(n, c.subclass.name);
  plan.land = sub.data && subSpells?.arid && subSpells.arid[lvl] ? true : false;
  for (const t of C.lineage?.traits || []) if (t.lvl === charLevel()) add(S.spellNamed(t.name)?.name, C.lineage.name.split(': ').pop());
  plan.slots = { before: slotsFor(C.classes), after: slotsFor(newClasses()) };
  plan.slotsChange = plan.slots.before.some((n, i) => n !== plan.slots.after[i]);
  plan.any = plan.caster || plan.cantrips > 0 || plan.always.length > 0 || plan.slotsChange;
  return plan;
}

// Every spell picked anywhere in the level-up (but one picker), so the same spell can't be picked twice. A Wizard
// prepares spells from the spellbook, so a spell can be both new in the book and newly prepared.
const pickedSpells = except => new Set(Object.entries(L.spells)
  .filter(([k]) => k !== except && !(except === 'prepared' && k === 'book' || except === 'book' && k === 'prepared')).flatMap(([, v]) => v));

// Pick spells: the chosen ones as chips, then a list to search. o: { count, levels, lists (class names), school, title }
function spellPick(id, o) {
  const chosen = L.spells[id] ||= [], ui = L.ui[id] ||= { q: '', lvl: null };
  const have = known(), other = pickedSpells(id);
  const pool = D.spells.filter(s => o.levels.includes(s.level) && (!o.lists || s.classes.some(c => o.lists.includes(c))) && (!o.school || s.school === o.school)
    && (!o.schools || o.schools.includes(s.school)) && (!o.ritual || s.ritual));
  const levels = [...new Set(pool.map(s => s.level))].sort((a, b) => a - b);
  const listEl = h('ul', { class: 'lu-spells' });
  const fill = () => {
    const q = ui.q.trim().toLowerCase();
    const items = pool.filter(s => (ui.lvl == null || s.level === ui.lvl) && (!q || s.name.toLowerCase().includes(q)))
      .sort((a, b) => chosen.includes(b.name) - chosen.includes(a.name) || a.level - b.level || a.name.localeCompare(b.name));
    listEl.replaceChildren(...items.map(s => {
      const on = chosen.includes(s.name), why = have.has(s.name) ? 'on your sheet' : other.has(s.name) ? 'picked elsewhere' : null;
      return h('li', {}, h('button', { class: 'lu-spell' + (on ? ' on' : ''), disabled: !on && (!!why || chosen.length >= o.count),
        title: s.text.replace(/\*+_?|_?\*+/g, '').slice(0, 500), onclick: () => { toggle(chosen, s.name); render(); } },
      h('b', {}, s.name), h('span', {}, spellHint(s) + (why ? ' · ' + why : ''))));
    }));
    if (!items.length) listEl.append(h('li', { class: 'lu-none' }, 'No spells match.'));
  };
  fill();
  return h('div', { class: 'lu-pick', 'data-pick': id }, pickHead(o.title, chosen.length, o.count),
    chosen.length ? h('div', { class: 'chips' }, chosen.map(n => h('button', { class: 'chip on', title: 'Remove',
      onclick: () => { toggle(chosen, n); render(); } }, n, ' ✕'))) : null,
    h('div', { class: 'lu-find' },
      h('input', { type: 'search', class: 'lu-search', placeholder: 'Search', value: ui.q, oninput: e => { ui.q = e.target.value; fill(); } }),
      levels.length > 1 ? h('select', { onchange: e => { ui.lvl = e.target.value === '' ? null : +e.target.value; fill(); } },
        h('option', { value: '' }, 'All levels'), levels.map(l => h('option', { value: l, selected: ui.lvl === l }, l ? 'Level ' + l : 'Cantrips'))) : null),
    listEl);
}
const spellHint = s => {
  const r = (s.dmg || s.heal) && window.calc.spellRoll(s);
  return [s.level ? 'Level ' + s.level : 'Cantrip', s.school, s.atk ? 'attack' : s.save ? s.save + ' save' : '', r ? r.text : '', s.conc ? 'Conc.' : '']
    .filter(Boolean).join(' · ');
};

// ---- Everything the level changes, collected from the picks ------------------------------------
function collect() {
  const out = { scores: [], skills: [], expertise: [], saves: [], languages: [], tools: [], weapons: [], armor: [], speed: 0, jack: false, spells: [] };
  const grants = (g, f) => {
    if (g.speed) out.speed += g.speed;
    if (g.saves) out.saves.push(...g.saves);
    if (g.abilityScores) for (const [ab, n] of Object.entries(g.abilityScores)) out.scores.push({ ab, n, max: g.max || 20 });
    if (g.weapons) out.weapons.push(...g.weapons);
    if (g.armor) out.armor.push(...g.armor);
    if (g.languages) out.languages.push(...g.languages);
    if (g.tools) out.tools.push(...g.tools);
    if (g.jackOfAllTrades) out.jack = f;
  };
  for (const f of gains()) {
    if (f.grants) grants(f.grants, f);
    const ch = f.choice, p = L.picks[f.id];
    if (!ch) continue;
    if (ch.type === 'skills') out.skills.push(...p || []);
    if (ch.type === 'expertise') { out.expertise.push(...p || []); out.languages.push(...(L.picks[f.id + ':lang'] || []).filter(textOf)); }
    if (ch.type === 'languages') out.languages.push(...(p || []).filter(textOf));
    if (ch.type === 'option') { const o = ch.options.find(o => o.name === p); if (o?.grants) grants(o.grants, f); }
    if (ch.type === 'feat') {
      const feat = featOf(f);
      out.scores.push(...featScores(f));
      out.skills.push(...L.picks[f.id + ':sk'] || []);
      out.tools.push(...(L.picks[f.id + ':tools'] || []).filter(textOf));
      if (feat?.grants) grants(feat.grants, f);
      if (feat?.grants?.saveForIncrease) out.saves.push(...featScores(f).map(x => x.ab));
      for (const n of L.picks[f.id + ':sx'] || []) (profLevel('skill:' + n, skillAb(n)) ? out.expertise : out.skills).push(n);
      out.expertise.push(...L.picks[f.id + ':ex'] || []);
      if (feat?.choice?.type === 'allSkills') out.skills.push(...SKILLS.filter(x => !profLevel('skill:' + x.name, x.ability)).map(x => x.name));
    }
  }
  if (L.isNew) {
    const m = cls().multiclass;
    out.weapons.push(...m.weapons || []);
    out.armor.push(...m.armor || []);
    out.skills.push(...L.picks['mc:sk'] || []);
    out.tools.push(...Array.isArray(m.tools) ? m.tools : (L.picks['mc:tools'] || []).filter(textOf));
  }
  const um = tableRow(classLevel()).unarmoredMovement, um0 = L.isNew ? 0 : tableRow(classLevel() - 1).unarmoredMovement;
  if (um != null && um !== (um0 || 0)) out.speed += um - (um0 || 0); // Monk
  return out;
}

// Ability scores after the level (each increase stops at its own maximum)
function finalScores(out) {
  const res = Object.fromEntries(ABS.map(ab => [ab, score(ab)]));
  for (const s of out.scores) if (res[s.ab] != null) res[s.ab] = Math.max(res[s.ab], Math.min(s.max, res[s.ab] + s.n));
  return res;
}

// Hit Points: the fixed value (or the roll) + CON modifier, at least 1, plus Dwarven Toughness / Draconic Resilience
function hpGain() {
  const die = cls().hitDie, con = C.mods.CON ?? 0, rolled = L.hp.mode === 'roll' && L.hp.roll != null;
  const base = rolled ? L.hp.roll : D.rules.hitPoints.fixedByDie[die], extras = [];
  for (const f of C.speciesData?.features || []) if (f.grants?.hpPerLevel) extras.push([f.name, f.grants.hpPerLevel]);
  for (const n of C.feats) { const g = D.feats.find(x => x.name === n)?.grants; if (g?.hpPerLevel) extras.push([n, g.hpPerLevel]); }
  for (const f of gains()) { // a feat taken now: Tough counts every level so far, Boon of Fortitude adds 40
    const g = featOf(f)?.grants;
    if (g?.hpPerLevel && !C.feats.includes(L.picks[f.id].name)) extras.push([L.picks[f.id].name, g.hpPerLevel * charLevel()]);
    if (g?.hpMax) extras.push([L.picks[f.id].name, g.hpMax]);
  }
  const lvl = classLevel(), sub = subclass();
  if (sub.data) {
    for (const f of cls().subclass.features) {
      const n = f.grants?.hpPerClassLevel;
      if (n && f.lvl <= lvl) extras.push([f.name, f.lvl === lvl ? lvl * n : n]);
    }
  }
  const main = Math.max(D.rules.hitPoints.minimumGain, base + con);
  return { die, base, con, rolled, extras, main, total: main + sum(extras.map(x => x[1])) };
}

// Hit Dice text: "4d10" -> "5d10", "3d10 + 2d6" with a d6 -> "3d10 + 3d6", a plain count -> +1
function bumpDice(text, die) {
  const t = textOf(text), re = new RegExp(`(\\d+)\\s*d\\s*${die}\\b`, 'i');
  if (re.test(t)) return t.replace(re, (m, n) => `${+n + 1}d${die}`);
  if (/\d+\s*d\s*\d+/i.test(t)) return `${t} + 1d${die}`;
  if (/^\d+$/.test(t)) return String(+t + 1);
  return null;
}
const diceOf = classes => {
  const by = {};
  for (const c of classes) by[D.classes[c.key].hitDie] = (by[D.classes[c.key].hitDie] || 0) + c.level;
  return Object.entries(by).sort((a, b) => b[0] - a[0]).map(([d, n]) => `${n}d${d}`).join(' + ');
};

// The Class box after the level: "Fighter 4" -> "Fighter 5", or "Fighter 4 / Wizard 1"; "(Champion)" goes after the
// class when a subclass is picked and the sheet has no Subclass box. A class without a number (the level is in its own box) stays.
function classTextAfter(subName) {
  const text = textOf(C.classLevel), parts = text.split(/([/,;&+]|\band\b)/i), c = cls();
  const partOf = key => parts.findIndex((p, i) => i % 2 === 0 && new RegExp(`\\b${key}\\b`, 'i').test(p));
  const tag = subName && !S.field('subclass') ? ` (${subName})` : '';
  if (L.isNew) {
    const numbered = C.classes.every(x => partOf(x.key) >= 0 && /\d/.test(parts[partOf(x.key)]));
    return `${numbered ? text : C.classes.map(x => `${x.name} ${x.level}`).join(' / ')} / ${c.name} 1${tag}`;
  }
  const at = partOf(L.key);
  if (at < 0) return text;
  let p = parts[at];
  if (/\d+/.test(p)) p = p.replace(/\d+/, n => +n + 1);
  else if (!(S.field('level') && C.classes.length === 1)) p = p.replace(new RegExp(`\\b${L.key}\\b`, 'i'), m => `${m} ${classLevel()}`);
  parts[at] = tag ? p.replace(/\s*$/, s => tag + s) : p;
  return parts.join('');
}

// Where a line of text goes: the official sheet has its own boxes for feats, species traits and proficiencies
const TEXT_TARGET = { feature: ['features', 'features2'], feat: ['featsText', 'features'], species: ['speciesTraits', 'features'],
  weapons: ['weaponProficiencies', 'proficiencies'], tools: ['toolProficiencies', 'proficiencies'], languages: ['languages', 'proficiencies'],
  armor: ['proficiencies'] };
const targetOf = kind => TEXT_TARGET[kind].map(S.field).find(Boolean) || null;
const boxName = key => ({ features: 'Features', features2: 'Features', featsText: 'Feats', speciesTraits: 'Species Traits', proficiencies: 'Proficiencies',
  weaponProficiencies: 'Weapons', toolProficiencies: 'Tools', languages: 'Languages' })[key];
const targetName = kind => boxName(TEXT_TARGET[kind].find(S.field)) || '';
function appendText(field, line) {
  const cur = String(S.get(field) ?? '').replace(/\s+$/, '');
  S.set(field, cur ? cur + (S.multiline(field) ? '\n' : '; ') + line : line);
}

// Proficiency (want 1) or Expertise (want 2) in a skill or save: tick its box (its rule adds PB) and/or raise the number
function addProf(key, want, ab) {
  const f = S.field(key), box = S.profBox(key), have = profLevel(key, ab);
  if (!f || have >= want) return;
  let more = want - have;
  if (box && !S.get(box)) { S.set(box, true); more--; }
  if (more > 0) {
    const v = S.get(f);
    S.set(f, numIn(v) != null ? shift(v, more * C.profBonus) : fmt(C.mods[ab] + want * C.profBonus));
  }
}

// ---- The list of changes (Review page) --------------------------------------------------------
// Rows: { group, id, label, from, to, note, apply(ctx) (none = a note only), order (apply order) }
const GROUPS = ['Level', 'Hit Points', 'Ability Scores', 'Proficiencies', 'Spells', 'Features', 'Class numbers', 'Still to choose'];
function changes() {
  const rows = [], add = (group, order, r) => rows.push({ group, order, ...r });
  const F = S.field, c = cls(), lvl = classLevel(), lv = charLevel(), out = collect(), sub = subclass();
  const subName = sub.choosing ? sub.name : '';

  // Level, class, subclass
  const ct = classTextAfter(subName);
  if (F('classLevel') && ct !== textOf(C.classLevel)) add('Level', 10, { id: 'class', label: 'Class', from: textOf(C.classLevel) || '—', to: ct, apply: () => S.set(F('classLevel'), ct) });
  if (F('level')) add('Level', 11, { id: 'level', label: 'Level', from: total(), to: lv, apply: () => S.set(F('level'), String(lv)) });
  if (!F('classLevel') && !F('level')) add('Level', 10, { label: `${c.name} ${lvl}, level ${lv}`, note: 'No class or level box found on this sheet: write it in yourself.' });
  if (subName && F('subclass')) {
    const cur = textOf(C.subclass), to = cur && !cur.toLowerCase().includes(subName.toLowerCase()) ? `${cur} / ${subName}` : subName;
    add('Level', 12, { id: 'subclass', label: 'Subclass', from: cur || '—', to, apply: () => S.set(F('subclass'), to) });
  }
  if (pbAt(lv) !== pbAt(lv - 1)) add('Level', 13, { label: 'Proficiency Bonus', from: fmt(pbAt(lv - 1)), to: fmt(pbAt(lv)),
    note: 'Comes with the new level: proficient skills, saves, attacks and spell DC on the sheet move with it.' });
  const xp = numIn(C.xp), need = D.rules.xpByLevel[lv - 1];
  if (xp != null && xp < need) add('Level', 14, { label: 'Experience', note: `${xp.toLocaleString()} XP; level ${lv} normally needs ${need.toLocaleString()} (fine if your DM uses milestones).` });

  // Hit Points
  const hp = hpGain(), scores = finalScores(out), con0 = score('CON'), conUp = con0 != null ? (modOf(scores.CON) - modOf(con0)) * lv : 0;
  const max0 = numIn(C.hpMax), hpNote = [`${hp.rolled ? 'rolled' : 'fixed'} ${hp.base} on the d${hp.die}`, `CON ${fmt(hp.con)}`,
    ...hp.extras.map(([n, v]) => `${n} +${v}`)].join(', ') + (conUp ? `; CON modifier ${fmt(conUp / lv)} adds ${conUp} more (1 per level)` : '');
  if (F('hpMax') && max0 != null) {
    add('Hit Points', 20, { id: 'hpMax', label: 'Max HP', from: max0, to: max0 + hp.total + conUp, note: `+${hp.total}: ${hpNote}`,
      apply: () => S.set(F('hpMax'), String(numIn(S.get(F('hpMax'))) + hp.total)) });
  } else add('Hit Points', 20, { label: `Max HP +${hp.total + conUp}`, note: `${hpNote}. ${F('hpMax') ? 'The Max HP box is empty' : 'No Max HP box found'}: add it yourself.` });
  const hp0 = numIn(C.hp);
  if (F('hp') && hp0 != null && max0 != null) {
    add('Hit Points', 60, { id: 'hp', label: 'Current HP', from: hp0, to: hp0 + hp.total + conUp, note: 'Goes up as much as your Max HP.',
      apply: ctx => S.set(F('hp'), String(numIn(S.get(F('hp'))) + numIn(S.get(F('hpMax'))) - ctx.max0)) });
  }
  const diceKeys = ['hitDiceTotal', 'hitDice'].filter(F);
  diceKeys.forEach((key, i) => {
    const cur = textOf(C[key]), to = cur ? bumpDice(cur, hp.die) : i === 0 ? diceOf(newClasses()) : null;
    const label = diceKeys.length > 1 ? (key === 'hitDice' ? 'Hit Dice (current)' : 'Hit Dice (total)') : 'Hit Dice';
    if (to) add('Hit Points', 25, { id: key, label, from: cur || '—', to, apply: () => S.set(F(key), to) });
    else if (cur) add('Hit Points', 25, { label, note: `Add one d${hp.die} to "${cur}" yourself.` });
  });
  if (!diceKeys.length) add('Hit Points', 25, { label: 'Hit Dice', note: `You gain one d${hp.die} Hit Die (now ${diceOf(newClasses())}).` });

  // Ability scores
  for (const ab of ABS) {
    const from = score(ab), to = scores[ab];
    if (from == null || to === from) continue;
    const md = modOf(to) !== modOf(from) ? `modifier ${fmt(modOf(from))} → ${fmt(modOf(to))}; the boxes that use it follow` : 'modifier stays the same';
    add('Ability Scores', 30, { id: 'ab:' + ab, label: D.rules.abilities[ab], from, to, note: md, apply: () => S.set(F(ab.toLowerCase()), String(to)) });
  }
  for (const s of out.scores) if (score(s.ab) == null) add('Ability Scores', 30, { label: `${D.rules.abilities[s.ab]} +${s.n}`, note: 'The score box is empty: add it yourself.' });

  // Skills, saves, speed, other proficiencies
  const profRow = (key, label, want, ab) => {
    const f = F(key), box = S.profBox(key);
    if (!f && !box) return add('Proficiencies', 40, { label, note: 'No box for it on this sheet: note it yourself.' });
    add('Proficiencies', want === 2 ? 41 : 40, { id: 'p:' + key + want, label, note: box ? (want === 2 ? `ticks its box and adds your Proficiency Bonus once more` : 'ticks its box; the bonus follows')
      : `adds your Proficiency Bonus to the number`, apply: () => addProf(key, want, ab) });
  };
  for (const n of new Set(out.skills)) profRow('skill:' + n, `${n} proficiency`, 1, skillAb(n));
  for (const n of new Set(out.expertise)) profRow('skill:' + n, `${n} Expertise`, 2, skillAb(n));
  for (const ab of new Set(out.saves)) if (!profLevel('save:' + ab, ab)) profRow('save:' + ab, `${D.rules.abilities[ab]} saving throws`, 1, ab);
  if (out.jack) {
    const half = Math.floor(pbAt(lv) / 2), list = SKILLS.filter(s => F('skill:' + s.name) && !profLevel('skill:' + s.name, s.ability) && !out.skills.includes(s.name));
    add('Proficiencies', 42, { id: 'jack', label: 'Jack of All Trades', note: `+${half} on the ${plural(list.length, 'skill')} you aren't proficient in`,
      apply: () => { for (const s of list) { const f = F('skill:' + s.name), v = S.get(f); S.set(f, numIn(v) != null ? shift(v, half) : fmt(C.mods[s.ability] + half)); } } });
  }
  if (out.speed) {
    const sp = textOf(C.speed);
    if (F('speed') && numIn(sp) != null) add('Proficiencies', 45, { id: 'speed', label: 'Speed', from: sp, to: shift(sp, out.speed),
      note: 'without heavy armor (or any armor for a Monk)', apply: () => S.set(F('speed'), shift(S.get(F('speed')), out.speed)) });
    else add('Proficiencies', 45, { label: `Speed +${out.speed} ft`, note: 'Add it to your Speed yourself.' });
  }
  const textRow = (kind, label, items, fmtItem = x => x) => {
    if (!items.length) return;
    const line = `${label}: ${[...new Set(items)].map(fmtItem).join(', ')}`, f = targetOf(kind);
    add('Proficiencies', 70, f ? { id: 't:' + kind, label, to: [...new Set(items)].map(fmtItem).join(', '), note: `added to ${targetName(kind)}`, apply: () => appendText(f, line) }
      : { label, to: [...new Set(items)].map(fmtItem).join(', '), note: 'No box for it found: note it yourself.' });
  };
  textRow('weapons', 'Weapons', out.weapons, w => w === 'Martial' ? 'Martial weapons' : w);
  const armorChecks = S.map?.checks;
  if (armorChecks && out.armor.length) {
    for (const a of new Set(out.armor)) {
      const box = armorChecks['armor' + a];
      add('Proficiencies', 70, { id: 'armor:' + a, label: 'Armor training', to: a, note: 'ticks its box', apply: () => S.set(box, true) });
    }
  } else textRow('armor', 'Armor training', out.armor);
  textRow('tools', 'Tools', out.tools);
  textRow('languages', 'Languages', out.languages);

  // Spells
  const plan = spellPlan(), picked = [];
  const pushSpells = (id, why, max = Infinity) => { for (const n of (L.spells[id] || []).slice(0, max)) picked.push({ spell: D.spells.find(s => s.name === n), why }); };
  pushSpells('cantrips', 'new cantrip', plan.cantrips);
  pushSpells('prepared', 'new prepared spell', plan.prepared);
  pushSpells('book', 'added to your spellbook', plan.book);
  for (const f of gains()) for (const id of spellIdsOf(f)) pushSpells(id, f.choice.type === 'feat' ? L.picks[f.id].name : f.name);
  for (const f of gains()) for (const n of featOf(f)?.choice?.fixed || []) picked.push({ spell: D.spells.find(s => s.name === n), why: L.picks[f.id].name });
  for (const a of plan.always) picked.push({ spell: a.spell, why: `always prepared (${a.why})` });
  const seen = new Set(), lines = placeSpells(picked.filter(p => p.spell && !seen.has(p.spell.name) && seen.add(p.spell.name)));
  for (const { spell: s, why, line } of lines) {
    const label = s.name, note = `${s.level ? 'Level ' + s.level : 'Cantrip'} · ${why}`;
    add('Spells', 80, line ? { id: 'sp:' + s.name, label, note, apply: () => S.writeSpell(line, s) }
      : { label, note: `${note}. No free spell line${S.spellLines().length ? ` for ${s.level ? 'level ' + s.level : 'cantrips'}` : ''} on the sheet: write it in yourself.` });
  }
  for (const k of ['swap0', 'swap1']) {
    const sw = L.swap[k], to = (L.spells[k] || [])[0];
    if (!sw.from || !to) continue;
    const line = S.spellLines().find(l => S.spellNamed(S.get(l.field))?.name === sw.from), s = D.spells.find(x => x.name === to);
    add('Spells', 81, line ? { id: 'swap:' + k, label: `${sw.from} → ${to}`, note: 'replaces it on its line', apply: () => S.writeSpell(line, s) }
      : { label: `${sw.from} → ${to}`, note: `${sw.from} isn't on a spell line: swap it yourself.` });
  }
  if (plan.land) add('Spells', 82, { label: 'Circle of the Land spells', note: 'More land spells: they follow the land you pick after each Long Rest, so they are not written in.' });
  plan.slots.after.forEach((to, i) => {
    const from = plan.slots.before[i];
    if (to === from) return;
    const f = F('slots' + (i + 1)), cur = f ? textOf(S.get(f)) : '';
    const write = numIn(cur) != null ? String(numIn(cur) + to - from) : to ? String(to) : '';
    add('Spells', 85, f ? { id: 'slot' + i, label: `Level ${i + 1} slots`, from: cur || '—', to: write || '—', apply: () => S.set(f, write) }
      : { label: `Level ${i + 1} slots`, from, to, note: 'No slots box for this level found: write it in yourself.' });
  });
  if (c.spellcasting && !C.classes.some(x => D.classes[x.key].spellcasting)) { // first spellcasting class: fill the empty spellcasting boxes
    const ab = c.spellcasting.ability, pb = pbAt(lv), m = modOf(scores[ab] ?? 10);
    for (const [key, v] of [['spellAbility', D.rules.abilities[ab]], ['spellMod', fmt(m)], ['spellDC', String(8 + m + pb)], ['spellAttack', fmt(m + pb)]]) {
      if (F(key) && !textOf(C[key])) add('Spells', 86, { id: key, label: { spellAbility: 'Spellcasting ability', spellMod: 'Spellcasting modifier', spellDC: 'Spell save DC', spellAttack: 'Spell attack bonus' }[key],
        to: v, apply: () => S.set(F(key), v) });
    }
  }

  // Features, feats and species traits as lines of text
  for (const f of gains()) {
    if (f.choice?.type === 'subclass' || f.manual) { if (f.manual) add('Features', 90, { label: f.name, note: f.text }); continue; }
    const kind = f.choice?.type === 'feat' && L.picks[f.id]?.name ? 'feat' : f.kind, t = targetOf(kind), line = featureLine(f);
    // under a picked feat its summary (none for Ability Score Improvement, the pick says it all), under other choices the feature's text
    const feat = kind === 'feat' && D.feats.find(x => x.name === L.picks[f.id].name);
    const note = f.choice ? pickText(f) || 'not chosen yet' : f.text, more = !f.choice ? null : kind === 'feat' ? (feat && !feat.abilityIncrease?.options ? feat.summary : null) : f.text;
    if (f.choice && unpicked(f)) add('Features', 90, { label: f.name, src: f.src, note: 'Not chosen yet, so nothing is written: add it to the sheet once you decide.', more });
    else add('Features', 90, t ? { id: 'f:' + f.id, label: f.name, src: f.src, note, more, apply: () => appendText(t, line), where: targetName(kind) }
      : { label: f.name, src: f.src, note: note + '. No Features box found: note it yourself.', more });
  }
  if (L.isNew) add('Features', 89, { label: `${c.name} multiclass`, note: c.multiclass.text });
  for (const n of numbers()) add('Class numbers', 99, n);
  if ([5, 11, 17].includes(lv) && C.spells.some(x => x.spell.level === 0 && x.spell.dmg)) {
    add('Class numbers', 99, { label: 'Damage cantrips', from: `${[1, 5, 11, 17].indexOf(lv)} dice`, to: `${[1, 5, 11, 17].indexOf(lv) + 1} dice`,
      note: 'Character level ' + lv + ': attack lines with cantrips update by themselves.' });
  }
  const todo = (label, n, got, page) => add('Still to choose', 100, { label,
    note: `${got ? `${got} of ${n} picked` : 'Nothing picked yet'}: go back to ${page}, or choose later.` });
  for (const f of gains()) {
    const m = missing(f), n = f.choice && ['feat', 'option', 'subclass'].includes(f.choice.type) ? 1 : f.choice ? countOf(f) : 0;
    if (m) todo(f.name, n, n - m, 'Features');
  }
  if (L.isNew) {
    const m = c.multiclass, sk = (L.picks['mc:sk'] || []).length, tl = (L.picks['mc:tools'] || []).filter(textOf).length;
    if (m.skills && sk < m.skills.count) todo('Multiclass skill', m.skills.count, sk, 'Features');
    if (m.tools?.count && tl < m.tools.count) todo(`Multiclass ${m.tools.from}`, m.tools.count, tl, 'Features');
  }
  for (const [id, n, label] of [['cantrips', plan.cantrips, 'New cantrips'], ['prepared', plan.prepared, 'New prepared spells'], ['book', plan.book, 'Spellbook spells']]) {
    const got = Math.min(n, (L.spells[id] || []).length);
    if (n > 0 && got < n) todo(label, n, got, 'Spells');
  }
  return rows;
}

// Give each new spell a free line on the sheet: one in its level's block, else any free line
function placeSpells(list) {
  const free = S.spellLines().filter(l => !textOf(S.get(l.field)));
  return list.map(p => {
    let i = free.findIndex(l => l.level === p.spell.level);
    if (i < 0) i = free.findIndex(l => l.level == null);
    return { ...p, line: i < 0 ? null : free.splice(i, 1)[0] };
  });
}

// Apply the ticked changes in a safe order: the level first (PB follows), then HP, scores (HP from CON follows), skills ...
function apply() {
  const rows = changes(), todo = rows.filter(r => r.apply && !L.off.has(r.id)).sort((a, b) => a.order - b.order);
  // what the note shows afterwards is fixed now: the character is a level higher once the writes are done
  const ctx = { max0: numIn(S.get(S.field('hpMax'))) }, done = { rows, level: charLevel(), title: `${cls().name} ${classLevel()}`, steps: steps() };
  L.applying = true;
  S.transaction(`Level up (${done.title})`, () => { // one step for Undo
    for (const r of todo) {
      try { r.apply(ctx); r.done = true; } catch (err) { console.error('Level up: could not apply', r.label, err); r.failed = true; }
    }
  });
  L.applying = false;
  L.applied = done;
  L.stepId = 'review';
  render();
}

// ---- Steps ------------------------------------------------------------------------------------
const STEPS = [
  { id: 'class', name: 'Class', show: () => true, view: classStep },
  { id: 'hp', name: 'Hit Points', show: () => true, view: hpStep },
  { id: 'features', name: 'Features', show: () => true, view: featuresStep },
  { id: 'spells', name: 'Spells', show: () => spellPlan().any, view: spellsStep },
  { id: 'review', name: 'Review', show: () => true, view: reviewStep }
];
const steps = () => STEPS.filter(s => s.show());

function classStep() {
  const choose = (key, isNew) => { if (L.key !== key || L.isNew !== isNew) { Object.assign(L, { key, isNew, picks: {}, spells: {}, ui: {}, hp: { mode: 'fixed', roll: null } }); resetSwap(); } render(); };
  const preview = (key, lvl) => {
    const c = D.classes[key], names = c.levels[lvl - 1].features;
    return `d${c.hitDie} Hit Die · ${names.length ? names.join(', ') : 'no new features'}`;
  };
  const others = Object.keys(D.classes).filter(k => !C.classes.some(c => c.key === k));
  const mc = L.isNew ? missingFor(L.key) : [];
  return [
    h('p', { class: 'lu-lead' }, `${who()} is level ${total()} (${C.classes.map(c => `${c.name} ${c.level}`).join(' / ')}). Which class gets level ${charLevel()}?`),
    h('div', { class: 'lu-cards' }, C.classes.map(c => h('button', { class: 'lu-card' + (!L.isNew && L.key === c.key ? ' on' : ''), disabled: c.level >= 20,
      onclick: () => choose(c.key, false) }, h('b', {}, `${c.name} ${c.level} → ${c.level + 1}`), h('span', {}, preview(c.key, c.level + 1)))),
    h('button', { class: 'lu-card' + (L.isNew ? ' on' : ''), onclick: () => choose(L.isNew ? L.key : others.find(k => !missingFor(k).length) || others[0], true) },
      h('b', {}, 'A new class (multiclass)'), h('span', {}, 'Level 1 in another class: its Hit Die, some of its proficiencies and its level 1 features.'))),
    L.isNew ? h('div', { class: 'lu-pick' }, pickHead('New class'),
      h('div', { class: 'lu-opts' }, others.map(k => {
        const miss = missingFor(k);
        return h('button', { class: 'lu-opt' + (L.key === k ? ' on' : ''), onclick: () => choose(k, true), title: miss.join('; ') || null },
          h('b', {}, D.classes[k].name), h('small', {}, miss.length ? 'needs ' + D.classes[k].multiclass.requires.join(D.classes[k].multiclass.requiresAny ? '/' : '+') + ' 13' : `d${D.classes[k].hitDie}`));
      })),
      h('p', { class: 'lu-note' }, cls().multiclass.text),
      mc.length ? h('p', { class: 'lu-warn' }, `Multiclassing rules: you need ${mc.join(', ')}. You can still go ahead if your DM allows it.`) : null) : null
  ];
}

function hpStep() {
  const g = hpGain(), fixed = D.rules.hitPoints.fixedByDie[g.die];
  const pickRoll = () => {
    L.hp.roll = rnd(g.die); L.hp.mode = 'roll'; L.hp.anim = true;
    render();
  };
  const max0 = numIn(C.hpMax), hp0 = numIn(C.hp), cur = textOf(C.hitDiceTotal) || textOf(C.hitDice);
  return [
    h('p', { class: 'lu-lead' }, `${cls().name} Hit Die: d${g.die}. Take the fixed value or roll for it.`),
    h('div', { class: 'lu-hp' },
      h('button', { class: 'lu-hpopt' + (L.hp.mode === 'fixed' ? ' on' : ''), onclick: () => { L.hp.mode = 'fixed'; render(); } },
        h('small', {}, 'Fixed'), h('b', { class: 'lu-big' }, fixed), h('span', {}, `the usual value for a d${g.die}`)),
      h('button', { class: 'lu-hpopt' + (L.hp.mode === 'roll' ? ' on' : ''), onclick: () => L.hp.roll == null ? pickRoll() : (L.hp.mode = 'roll', render()) },
        h('small', {}, 'Roll'), h('b', { class: 'lu-die', 'data-d': g.die, 'data-final': L.hp.roll ?? '' }, L.hp.roll ?? `d${g.die}`),
        h('span', {}, L.hp.roll == null ? `click to roll 1d${g.die}` : `rolled ${L.hp.roll}`))),
    L.hp.roll != null ? h('button', { class: 'lu-link', onclick: pickRoll }, '↻ Roll again') : null,
    h('div', { class: 'lu-sum' },
      h('span', {}, `${g.rolled ? 'Roll' : 'Fixed'} ${g.base}`), h('span', {}, `CON ${fmt(g.con)}`),
      g.base + g.con < 1 ? h('span', {}, 'at least 1') : null,
      g.extras.map(([n, v]) => h('span', {}, `${n} +${v}`)),
      h('b', {}, `= +${g.total} HP`)),
    h('div', { class: 'nums' },
      h('div', { class: 'num' }, h('small', {}, 'Max HP'), h('b', {}, max0 != null ? `${max0} → ${max0 + g.total}` : `+${g.total}`)),
      h('div', { class: 'num' }, h('small', {}, 'Current HP'), h('b', {}, hp0 != null && max0 != null ? `${hp0} → ${hp0 + g.total}` : `+${g.total}`)),
      h('div', { class: 'num' }, h('small', {}, 'Hit Dice'), h('b', {}, cur ? bumpDice(cur, g.die) || `+1d${g.die}` : diceOf(newClasses())))),
    h('p', { class: 'lu-note' }, 'A higher CON modifier from this level\'s choices adds 1 HP per level on top (shown on the Review page).')
  ];
}

function featuresStep() {
  const list = gains(), nums = numbers(), sub = subclass();
  const cards = [];
  if (L.isNew) {
    const m = cls().multiclass;
    cards.push(h('section', { class: 'lu-feat' }, h('div', { class: 'lu-fh' }, h('b', {}, 'Multiclass proficiencies'), h('small', {}, cls().name + ' 1')),
      h('p', {}, m.text),
      m.skills ? skillPick('mc:sk', m.skills.count, m.skills.from === 'class' ? cls().skills.from : SKILLS.map(s => s.name)) : null,
      m.tools && !Array.isArray(m.tools) ? textsPick('mc:tools', m.tools.count, 'tool', m.tools.from) : null));
  }
  if (sub.ask) {
    cards.push(h('section', { class: 'lu-feat' }, h('div', { class: 'lu-fh' }, h('b', {}, 'Your subclass'), h('small', {}, cls().name)),
      h('p', {}, `Your ${cls().name} subclass gets a feature at this level, but the sheet doesn't say which subclass you have.`),
      onePick(() => L.picks.subHave ?? true ? cls().subclass.name : 'Another subclass', n => { L.picks.subHave = n === cls().subclass.name; }, [
        { name: cls().subclass.name, text: 'Its features are added for you.' }, { name: 'Another subclass', text: 'Add its features yourself.' }])));
  }
  for (const f of list) {
    const ui = f.choice ? choiceUI(f) : null; // sets the default pick, so before unpicked()
    cards.push(h('section', { class: 'lu-feat' + (f.choice ? ' choice' : '') + (missing(f) ? ' todo' : '') },
      h('div', { class: 'lu-fh' }, h('b', {}, f.name), h('small', {}, f.src)), h('p', {}, f.text), ui));
  }
  if (!cards.length) cards.push(h('p', { class: 'lu-lead' }, `No new features at ${cls().name} level ${classLevel()}.`));
  return [
    ...cards,
    nums.length ? h('section', { class: 'lu-feat' }, h('div', { class: 'lu-fh' }, h('b', {}, 'Numbers that go up'), h('small', {}, cls().name + ' table')),
      h('div', { class: 'nums' }, nums.map(n => h('div', { class: 'num' }, h('small', {}, n.label), h('b', {}, `${n.from} → ${n.to}`))))) : null
  ];
}

function resetSwap() { L.swap = { swap0: { from: '' }, swap1: { from: '' } }; delete L.spells.swap0; delete L.spells.swap1; }
function spellsStep() {
  const plan = spellPlan(), c = cls(), max = maxSpellLevel(), out = [];
  const lists = plan.lists, tbl = tableRow(classLevel()).spells;
  if (plan.caster) {
    out.push(h('p', { class: 'lu-lead' }, `${c.name} spells at ${c.name} level ${classLevel()}: ${tbl.cantrips} cantrips, ${tbl.prepared} prepared spells, up to level ${max}` +
      (lists.length > 1 ? ` (Magical Secrets: also ${lists.slice(1).join(', ')} spells).` : '.')));
  }
  if (plan.cantrips > 0) out.push(spellPick('cantrips', { count: plan.cantrips, levels: [0], lists, title: `New ${plural(plan.cantrips, 'cantrip')}` }));
  if (plan.book > 0) out.push(spellPick('book', { count: plan.book, levels: range(1, max), lists: ['Wizard'], title: `Add ${plural(plan.book, 'spell')} to your spellbook` }));
  if (plan.prepared > 0) out.push(spellPick('prepared', { count: plan.prepared, levels: range(1, max), lists, title: `${plural(plan.prepared, 'more prepared spell')}` }));
  if (plan.always.length) {
    out.push(h('div', { class: 'lu-pick' }, pickHead('Always prepared (added for you)'),
      h('ul', { class: 'lu-list' }, plan.always.map(a => h('li', {}, h('b', {}, a.spell.name), ` · ${spellHint(a.spell)} · ${a.why}`)))));
  }
  if (plan.caster && !L.isNew) { // each level you may swap one cantrip and one spell
    const mine = lvl0 => C.spells.filter(x => x.from === 'sheet' && (x.spell.level === 0) === lvl0 && x.spell.classes.some(n => lists.includes(n))).map(x => x.spell.name);
    for (const [k, lvl0, what] of [['swap0', true, 'cantrip'], ['swap1', false, 'spell']]) {
      const have = mine(lvl0), sw = L.swap[k];
      if (!have.length) continue;
      out.push(h('div', { class: 'lu-pick' }, pickHead(`Replace a ${what} (optional)`),
        h('select', { class: 'lu-wide', onchange: e => { sw.from = e.target.value; L.spells[k] = []; render(); } },
          h('option', { value: '' }, `Keep all my ${what}s`), have.map(n => h('option', { value: n, selected: sw.from === n }, n))),
        sw.from ? spellPick(k, { count: 1, levels: lvl0 ? [0] : range(1, max), lists, title: `Instead of ${sw.from}` }) : null));
    }
  }
  if (plan.slotsChange) {
    out.push(h('div', { class: 'lu-pick' }, pickHead('Spell slots'), h('div', { class: 'nums' }, plan.slots.after.map((n, i) => n === plan.slots.before[i] ? null
      : h('div', { class: 'num' }, h('small', {}, `Level ${i + 1}`), h('b', {}, `${plan.slots.before[i]} → ${n}`))))));
  }
  return out;
}

function reviewStep() {
  const done = L.applied, rows = done ? done.rows : changes();
  const head = done
    ? h('p', { class: 'lu-lead' }, `Level ${done.level} applied (${done.title}). Ticked changes are on the sheet now; download the PDF to keep them. This note stays open until you close it.`)
    : h('p', { class: 'lu-lead' }, 'Everything this level changes. Untick anything you don\'t want, then Apply. Nothing has been written yet.');
  return [head, GROUPS.map(g => {
    const list = rows.filter(r => r.group === g);
    if (!list.length) return null;
    return h('section', { class: 'lu-group' + (g === 'Still to choose' ? ' warn' : '') }, h('h4', {}, g), h('ul', {}, list.map(r => {
      const tick = r.apply ? done ? h('span', { class: 'lu-state ' + (r.done ? 'ok' : r.failed ? 'bad' : 'skip') }, r.done ? '✓' : r.failed ? '!' : '–')
        : h('input', { type: 'checkbox', checked: !L.off.has(r.id), 'aria-label': r.label, onchange: e => { e.target.checked ? L.off.delete(r.id) : L.off.add(r.id); } })
        : h('span', { class: 'lu-state info' }, '•');
      return h('li', { class: r.apply ? '' : 'info' }, h('label', {}, tick,
        h('span', { class: 'lu-row' }, h('span', {}, h('b', {}, r.label), r.src ? h('small', { class: 'lu-src' }, ` · ${r.src}`) : null),
          r.from != null || r.to != null ? h('span', { class: 'lu-ft' }, r.from != null ? h('s', {}, String(r.from)) : null, r.from != null ? ' → ' : '', h('em', {}, String(r.to ?? ''))) : null,
          r.note ? h('small', { class: 'lu-n' }, r.note) : null,
          r.more ? h('small', { class: 'lu-n dim' }, r.more) : null,
          r.where && !done ? h('small', { class: 'lu-n dim' }, `→ ${r.where} box`) : null)));
    })));
  })];
}

// ---- The window ---------------------------------------------------------------------------------
function render() {
  if (!L || !win) return;
  const list = L.applied ? L.applied.steps : steps();
  let i = list.findIndex(s => s.id === L.stepId);
  if (i < 0) { i = Math.min(L.stepIndex ?? 0, list.length - 1); L.stepId = list[i].id; }
  L.stepIndex = i;
  const body = win.querySelector('.lu-body'), keep = L.shown === L.stepId ? body.scrollTop : 0;
  win.querySelector('.lu-sub').textContent = L.applied ? `${who()} · level ${L.applied.level}` : `${who()} · ${cls().name} ${classLevel()} · level ${charLevel()}`;
  win.querySelector('.lu-steps').replaceChildren(...list.map((s, n) => h('button', { class: (n === i ? 'on' : n < i ? 'done' : ''), disabled: !!L.applied,
    onclick: () => { L.stepId = s.id; render(); } }, h('i', {}, n + 1), s.name)));
  body.replaceChildren(...[list[i].view()].flat(Infinity).filter(Boolean));
  body.scrollTop = keep;
  L.shown = L.stepId;
  const last = i === list.length - 1, go = d => { L.stepId = list[i + d].id; render(); };
  win.querySelector('.lu-foot').replaceChildren(...(L.applied
    ? [h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: close }, 'Close')]
    : [h('button', { class: 'btn', onclick: () => cancel() }, 'Cancel'), h('span', { class: 'grow' }),
      i > 0 ? h('button', { class: 'btn', onclick: () => go(-1) }, '← Back') : null,
      last ? h('button', { class: 'btn primary lu-apply', onclick: apply }, 'Apply to sheet') : h('button', { class: 'btn primary lu-next', onclick: () => go(1) }, 'Next →')]
  ).filter(Boolean));
  if (L.hp.anim) { L.hp.anim = false; tumble(win.querySelector('.lu-die')); }
}

// The Hit Die tumbles through random faces before it lands
function tumble(el) {
  if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let t = 0;
  el.classList.add('rolling');
  const timer = setInterval(() => {
    const done = ++t >= 9;
    el.textContent = done ? el.dataset.final : rnd(+el.dataset.d);
    if (done) { clearInterval(timer); el.classList.remove('rolling'); el.classList.add('landed'); }
  }, 45);
}

function openWindow() {
  win = h('section', { id: 'lvlup', class: 'lu', role: 'dialog', 'aria-label': 'Level up' },
    h('div', { class: 'lu-bar', title: 'Drag to move' },
      h('span', { class: 'lu-icon', 'aria-hidden': 'true' }, '⬆'), h('div', { class: 'lu-title' }, h('b', {}, 'Level up'), h('span', { class: 'lu-sub' })),
      h('button', { class: 'lu-x', title: 'Close', 'aria-label': 'Close', onclick: () => L.applied ? close() : cancel() }, '✕')),
    h('nav', { class: 'lu-steps' }), h('div', { class: 'lu-body' }), h('div', { class: 'lu-foot' }));
  document.body.append(win);
  const w = Math.min(560, innerWidth - 24);
  window.draggable(win, win.querySelector('.lu-bar'))((innerWidth - w) / 2, 70); // dialog.js
  render();
}

function close() { win?.remove(); win = null; L = null; }
function cancel() {
  if (!L.dirty()) return close();
  confirmBox('Cancel the level up?', 'Your choices are thrown away and the sheet stays as it is.', 'Throw away', close, 'Keep going');
}

// A question (dialog.js). Without onOk it is just a message.
function confirmBox(title, text, okLabel, onOk, noLabel = 'Not now') {
  const ok = { label: okLabel, value: true, primary: true };
  window.ask({ title, text, buttons: onOk ? [{ label: noLabel, value: false }, ok] : [ok] }).then(yes => { if (yes) onOk?.(); });
}

function start() {
  const first = C.classes[0];
  L = { key: first.key, isNew: false, picks: {}, spells: {}, ui: {}, hp: { mode: 'fixed', roll: null }, off: new Set(), stepId: 'class',
    dirty() { return this.stepId !== 'class' || Object.keys(this.picks).length > 0 || this.isNew || this.hp.roll != null; } };
  resetSwap();
  openWindow();
}

$('levelUp').addEventListener('click', () => {
  if (win) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); return; }
  if (!C.classes?.length) return confirmBox('No class on the sheet', 'Write your class and level in the Class box first (for example "Fighter 3"), then level up.', 'OK');
  if (total() >= 20) return confirmBox('Level 20', `${who()} is level 20 already, the highest level there is.`, 'OK');
  confirmBox('Level up?', `Take ${who()} from level ${total()} to level ${total() + 1}? A window walks you through it, and nothing on the sheet changes until you apply it at the end.`,
    'Level up', start);
});
document.addEventListener('sheet-loaded', () => { close(); $('levelUp').disabled = false; });
// Keep the window up to date when the sheet is edited by hand (but not while typing in it, or while applying)
document.addEventListener('character-change', () => {
  const typing = win?.contains(document.activeElement) && document.activeElement.matches('input, select');
  if (L && !L.applying && !L.applied && !typing) render();
});
})();
