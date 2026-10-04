/* Resources and rests. The roller's Rest tab (roller.js draws resources.view()) shows spell slots, class features with
   limited uses and Hit Point Dice as pips: click a full one to use it, an empty one to get it back. The Rest button in the
   header (or the tab's buttons) opens a Short or Long Rest window you can drag: roll Hit Point Dice, then every change is
   listed with a tick box, and nothing happens until Apply (one step for Undo).
   Where things are kept:
   - Spell slots: the total is the sheet's slots box for that level, else the class tables (calc.slotsFor). Used = the
     number in the sheet's "Slots Expended" box (classic sheet: "SlotsRemaining 19"), else the official sheet's
     "expended" checkboxes plus sheetState.slotsUsed[level] (on sheets with neither, all of it is there).
   - Class features: sheetState.used[id] = uses spent; the most you have comes from the class table (RESOURCES).
   - Hit Point Dice: the total comes from your class levels (else the sheet's Hit Dice text). Spent = the official sheet's
     "spent" box, else sheetState.hitDiceSpent ({ die: count }).
   Rules (2024): a Short Rest lets you spend Hit Point Dice (each heals the die + CON modifier, at least 1); a Long Rest
   brings back all HP, all Hit Point Dice and all spell slots, takes 1 Exhaustion level away, and Temporary HP are gone. */
(() => {
'use strict';
const D = window.DND, C = window.character, S = window.sheet, $ = id => document.getElementById(id);
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
const sum = a => a.reduce((t, x) => t + x, 0);
const numIn = v => { const m = String(v ?? '').match(/([+-]?)\s*(\d+)/); return m ? (m[1] === '-' ? -1 : 1) * +m[2] : null; };
const fmt = window.calc.fmt;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const st = () => window.sheetState;
const changed = () => document.dispatchEvent(new CustomEvent('resources-change'));
const classLevel = key => (C.classes || []).find(c => c.key === key)?.level || 0;
const mod = ab => C.mods?.[ab] ?? 0;

// ---- Spell slots ------------------------------------------------------------------------------------
const expended = l => (S.map?.slots?.[l]?.expended || []).filter(b => S.get(b) !== undefined);
const usedBox = l => S.field('slotsExpended' + l); // the classic sheet's "Slots Expended" box (a number)
function slotTotal(l) {
  const v = C['slots' + l];
  return typeof v === 'number' ? Math.max(0, v) : window.calc.slotsFor(C.classes || [])[l - 1] || 0;
}
const slotUsed = l => usedBox(l) ? Math.max(0, numIn(S.get(usedBox(l))) ?? 0)
  : expended(l).filter(b => S.get(b)).length + (st().slotsUsed?.[l] || 0);
const slotsLeft = l => Math.max(0, slotTotal(l) - slotUsed(l));
const slots = () => Array.from({ length: 9 }, (_, i) => i + 1).map(l => ({ level: l, total: slotTotal(l), used: slotUsed(l), left: slotsLeft(l) }))
  .filter(s => s.total || s.used);
// Warlock Pact Magic: { level, slots } (back on a Short Rest)
function pact() {
  const w = classLevel('warlock'), p = w && D.classes.warlock.levels[w - 1].spells.pact;
  return p ? { level: p.slotLevel, slots: p.slots } : null;
}

// Set how many slots of a level are used: in the sheet's "Slots Expended" box (empty for 0), else the official sheet's
// checkboxes first (in order) and the rest in sheetState
function writeSlotUsed(l, n) {
  n = Math.max(0, n);
  const box = usedBox(l), boxes = box ? [] : expended(l);
  if (box && String(S.get(box) ?? '').trim() !== (n ? String(n) : '')) S.set(box, n ? String(n) : '');
  boxes.forEach((b, i) => { if (!!S.get(b) !== i < n) S.set(b, i < n); });
  const extra = box ? 0 : n - boxes.length, u = st().slotsUsed;
  if (extra > 0) (st().slotsUsed ||= {})[l] = extra;
  else if (u && l in u) { delete u[l]; if (!Object.keys(u).length) delete st().slotsUsed; }
}
function setSlotUsed(l, n, label = `Level ${l} spell slot`) {
  n = Math.max(0, Math.min(slotTotal(l), n));
  if (n === slotUsed(l)) return false;
  S.transaction(label, () => writeSlotUsed(l, n));
  changed();
  return true;
}
const useSlot = l => slotsLeft(l) > 0 && setSlotUsed(l, slotUsed(l) + 1);
const restoreSlot = l => slotUsed(l) > 0 && setSlotUsed(l, slotUsed(l) - 1);

// ---- Class features with limited uses ------------------------------------------------------------------
// max(class level, class table row) = uses; from = the class level it starts at; back: 'short' (all back on a Short or
// Long Rest), 'short1' (one back on a Short Rest, all on a Long Rest), 'long'; pool: counted in points (Lay On Hands).
const RESOURCES = [
  { id: 'rage', cls: 'barbarian', name: 'Rage', max: (l, r) => r.rages, back: 'short1' },
  { id: 'persistentRage', cls: 'barbarian', name: 'Persistent Rage', from: 15, max: () => 1, back: 'long', note: 'all Rages back when you roll Initiative' },
  { id: 'bardicInspiration', cls: 'bard', name: 'Bardic Inspiration', max: () => Math.max(1, mod('CHA')), back: l => l >= 5 ? 'short' : 'long',
    note: (l, r) => 'd' + r.bardicInspirationDie },
  { id: 'channelCleric', cls: 'cleric', name: 'Channel Divinity', from: 2, max: (l, r) => r.channelDivinityUses, back: 'short1' },
  { id: 'divineIntervention', cls: 'cleric', name: 'Divine Intervention', from: 10, max: () => 1, back: 'long' },
  { id: 'wildShape', cls: 'druid', name: 'Wild Shape', from: 2, max: (l, r) => r.wildShapeUses, back: 'short1' },
  { id: 'secondWind', cls: 'fighter', name: 'Second Wind', max: (l, r) => r.secondWindUses, back: 'short1', note: l => `1d10 + ${l} HP` },
  { id: 'actionSurge', cls: 'fighter', name: 'Action Surge', from: 2, max: (l, r) => r.actionSurgeUses, back: 'short' },
  { id: 'indomitable', cls: 'fighter', name: 'Indomitable', from: 9, max: (l, r) => r.indomitableUses, back: 'long' },
  { id: 'focus', cls: 'monk', name: 'Focus Points', from: 2, max: (l, r) => r.focusPoints, back: 'short' },
  { id: 'uncannyMetabolism', cls: 'monk', name: 'Uncanny Metabolism', from: 2, max: () => 1, back: 'long' },
  { id: 'layOnHands', cls: 'paladin', name: 'Lay On Hands', max: l => 5 * l, back: 'long', pool: true, note: 'HP in the pool' },
  { id: 'channelPaladin', cls: 'paladin', name: 'Channel Divinity', from: 3, max: (l, r) => r.channelDivinityUses, back: 'short1' },
  { id: 'favoredEnemy', cls: 'ranger', name: 'Favored Enemy', max: (l, r) => r.favoredEnemies, back: 'long', note: "Hunter's Mark without a slot" },
  { id: 'strokeOfLuck', cls: 'rogue', name: 'Stroke of Luck', from: 20, max: () => 1, back: 'short' },
  { id: 'innateSorcery', cls: 'sorcerer', name: 'Innate Sorcery', max: () => 2, back: 'long' },
  { id: 'sorceryPoints', cls: 'sorcerer', name: 'Sorcery Points', from: 2, max: (l, r) => r.sorceryPoints, back: 'long' },
  { id: 'sorcerousRestoration', cls: 'sorcerer', name: 'Sorcerous Restoration', from: 5, max: () => 1, back: 'long', note: 'used on a Short Rest' },
  { id: 'magicalCunning', cls: 'warlock', name: 'Magical Cunning', from: 2, max: () => 1, back: 'long', note: 'half your Pact slots back' },
  { id: 'arcaneRecovery', cls: 'wizard', name: 'Arcane Recovery', max: () => 1, back: 'long', note: 'used on a Short Rest' },
  { id: 'lucky', feat: 'Lucky', name: 'Luck Points', max: () => C.profBonus || 2, back: 'long' }
];
const BACK = { short: 'back on a Short or Long Rest', short1: '1 back on a Short Rest, all on a Long Rest', long: 'back on a Long Rest' };

function resources() {
  const out = [], two = id => ['channelCleric', 'channelPaladin'].every(x => RESOURCES.find(r => r.id === x && classLevel(r.cls) >= r.from));
  for (const r of RESOURCES) {
    let lvl = 0, row = {};
    if (r.cls) {
      lvl = classLevel(r.cls);
      if (lvl < (r.from || 1)) continue;
      row = D.classes[r.cls].levels[lvl - 1];
    } else if (!(C.feats || []).includes(r.feat)) continue;
    const max = r.max(lvl, row);
    if (!(max > 0)) continue;
    const used = Math.min(max, st().used?.[r.id] || 0), note = typeof r.note === 'function' ? r.note(lvl, row) : r.note;
    out.push({ ...r, name: r.id.startsWith('channel') && two() ? `${r.name} (${D.classes[r.cls].name})` : r.name,
      lvl, max, used, left: max - used, note, back: typeof r.back === 'function' ? r.back(lvl) : r.back });
  }
  return out;
}
function writeUsed(id, n) {
  const u = st().used ||= {};
  if (n > 0) u[id] = n; else delete u[id];
  if (!Object.keys(u).length) delete st().used;
}
function setUsed(id, n) {
  const r = resources().find(x => x.id === id);
  if (!r) return false;
  n = Math.max(0, Math.min(r.max, n));
  if (n === r.used) return false;
  S.transaction(r.name, () => writeUsed(id, n));
  changed();
  return true;
}

// ---- Hit Point Dice -----------------------------------------------------------------------------------
// Where the sheet keeps them: the official sheet has a "spent" box (a count); the classic sheet has "Total" above the big
// Hit Dice box, which then holds the dice you have left ("3d8", "3d8 + 2d6" or "3"). Other sheets: sheetState only.
const diceIn = t => { const m = {}; for (const [, n, d] of String(t ?? '').matchAll(/(\d+)\s*d\s*(\d+)/gi)) m[d] = (m[d] || 0) + +n; return m; };
const leftBox = () => S.field('hitDiceTotal') && S.field('hitDice') && !S.field('hitDiceSpent') ? S.field('hitDice') : null;
// n spent dice spread over the dice types, the biggest first (the box only says how many)
const spread = (n, order, total) => { const out = {}; for (const d of order) { const k = Math.min(n, total[d]); if (k > 0) out[d] = k; n -= k; } return out; };
// The dice left as written in the classic Hit Dice box: { die: count }, or null when it doesn't say (empty, "d8", other dice)
function leftInBox(order, total) {
  const box = leftBox(), t = String(box ? S.get(box) ?? '' : '').trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) {
    const all = sum(order.map(d => total[d])), spent = spread(Math.max(0, all - +t), order, total);
    return Object.fromEntries(order.map(d => [d, total[d] - (spent[d] || 0)]));
  }
  const m = diceIn(t);
  return Object.keys(m).length && Object.keys(m).every(d => d in total) ? m : null;
}

// -> { dice: [{ die, total, spent, left }] (biggest die first), spent, box (the official sheet's spent box) }
function hitDice() {
  const total = {};
  for (const c of C.classes || []) { const d = D.classes[c.key].hitDie; total[d] = (total[d] || 0) + c.level; }
  if (!Object.keys(total).length) Object.assign(total, diceIn(C.hitDiceTotal || C.hitDice));
  const order = Object.keys(total).map(Number).sort((a, b) => b - a), box = S.field('hitDiceSpent'), inBox = leftInBox(order, total);
  let spent = { ...st().hitDiceSpent };
  if (box) { // the box holds a count; which dice were spent is kept in sheetState, else the biggest are assumed
    const n = numIn(S.get(box)) ?? 0;
    if (sum(Object.values(spent)) !== n) spent = spread(n, order, total);
  } else if (inBox) spent = Object.fromEntries(order.map(d => [d, Math.max(0, total[d] - (inBox[d] || 0))]));
  const dice = order.map(d => { const s = Math.min(total[d], spent[d] || 0); return { die: d, total: total[d], spent: s, left: total[d] - s }; });
  return { dice, spent: sum(dice.map(d => d.spent)), box };
}
function writeHitDiceSpent(map) {
  const clean = Object.fromEntries(Object.entries(map).filter(([, n]) => n > 0));
  const box = S.field('hitDiceSpent'), lb = leftBox(), hd = hitDice();
  const total = Object.fromEntries(hd.dice.map(d => [d.die, d.total])), order = hd.dice.map(d => d.die);
  if (lb && !box && (leftInBox(order, total) || !String(S.get(lb) ?? '').trim())) {
    // the classic Hit Dice box: write the dice left, in the box's own style ("3" stays a number)
    const left = order.map(d => [d, total[d] - (clean[d] || 0)]), plain = /^\d+$/.test(String(S.get(lb) ?? '').trim());
    const text = plain ? String(sum(left.map(x => x[1]))) : left.filter(x => x[1] > 0).map(([d, n]) => `${n}d${d}`).join(' + ') || `0d${order[0]}`;
    if (String(S.get(lb) ?? '').trim() !== text) S.set(lb, text);
    delete st().hitDiceSpent;
    return;
  }
  if (Object.keys(clean).length) st().hitDiceSpent = clean; else delete st().hitDiceSpent;
  if (box) {
    const n = sum(Object.values(clean)), cur = numIn(S.get(box));
    if (cur !== n && !(cur == null && n === 0)) S.set(box, String(n));
  }
}
function setHitDieLeft(die, left) {
  const hd = hitDice(), d = hd.dice.find(x => x.die === die);
  if (!d) return;
  left = Math.max(0, Math.min(d.total, left));
  if (left === d.left) return;
  S.transaction('Hit Point Dice', () => writeHitDiceSpent({ ...Object.fromEntries(hd.dice.map(x => [x.die, x.spent])), [die]: d.total - left }));
  changed();
}

// ---- The Rest tab in the roller --------------------------------------------------------------------------
// A row of pips (or a number for big pools): click a full pip to use one, an empty one to get it back
function counter(label, left, max, setLeft, sub) {
  const ctl = max <= 12
    ? h('span', { class: 'pips' }, Array.from({ length: max }, (_, i) => h('button', { class: 'pip' + (i < left ? ' on' : ''),
      title: i < left ? 'Use one' : 'Get one back', 'aria-label': `${label}: ${i < left ? 'use one' : 'get one back'}`,
      onclick: () => setLeft(i < left ? left - 1 : left + 1) })))
    : h('span', { class: 'pool' }, h('button', { class: 'pstep', 'aria-label': `${label}: one less`, onclick: () => setLeft(left - 1) }, '−'),
      h('input', { type: 'number', min: 0, max, value: left, 'aria-label': label, onchange: e => setLeft(Math.round(+e.target.value || 0)) }),
      h('button', { class: 'pstep', 'aria-label': `${label}: one more`, onclick: () => setLeft(left + 1) }, '+'));
  return h('div', { class: 'res' + (left ? '' : ' empty') }, h('span', { class: 'rname' }, h('b', {}, label), sub ? h('small', {}, sub) : null),
    ctl, h('span', { class: 'rleft' }, `${left}/${max}`));
}

function slotRows() {
  const p = pact();
  return slots().map(s => counter(`Level ${s.level}`, s.left, s.total, left => setSlotUsed(s.level, s.total - left),
    p && p.level === s.level ? `${plural(p.slots, 'Pact Magic slot')} come back on a Short Rest` : null));
}

// The spell slots in a short strip (the Spell tab shows it above the spell list)
function slotStrip() {
  const list = S.loaded ? slots() : [];
  if (!list.length) return null;
  return h('div', { class: 'slotstrip', title: 'Spell slots left: click a full one to use it, an empty one to get it back' },
    list.map(s => h('span', { class: 'ss' + (s.left ? '' : ' empty') }, h('small', {}, s.level),
      Array.from({ length: s.total }, (_, i) => h('button', { class: 'pip' + (i < s.left ? ' on' : ''), 'aria-label': `Level ${s.level} slot: ${i < s.left ? 'use one' : 'get one back'}`,
        onclick: () => setSlotUsed(s.level, s.used + (i < s.left ? 1 : -1)) })))));
}

function view() {
  if (!S.loaded) return h('p', { class: 'hint' }, 'Load a character sheet to keep track of its spell slots, class features and Hit Point Dice.');
  const sl = slotRows(), rs = resources(), hd = hitDice();
  return [
    h('div', { class: 'rollbtns two restbtns' },
      h('button', { onclick: () => openRest('short') }, h('b', {}, 'Short Rest'), h('small', {}, '1 hour')),
      h('button', { class: 'go', onclick: () => openRest('long') }, h('b', {}, 'Long Rest'), h('small', {}, '8 hours'))),
    sl.length ? [h('h4', {}, 'Spell slots'), h('div', { class: 'reslist' }, sl)] : null,
    rs.length ? [h('h4', {}, 'Class features'), h('div', { class: 'reslist' }, rs.map(r =>
      counter(r.name, r.left, r.max, left => setUsed(r.id, r.max - left), [r.note, BACK[r.back]].filter(Boolean).join(' · '))))] : null,
    hd.dice.length ? [h('h4', {}, 'Hit Point Dice'), h('div', { class: 'reslist' }, hd.dice.map(d =>
      counter('d' + d.die, d.left, d.total, left => setHitDieLeft(d.die, left), 'spend them on a Short Rest')))] : null,
    !sl.length && !rs.length && !hd.dice.length ? h('p', { class: 'hint' }, 'No spell slots, limited-use class features or Hit Point Dice found. Write your class and level in the Class box.') : null
  ];
}

// ---- Short and Long Rest window ----------------------------------------------------------------------------
let R = null, win = null; // R: { kind: 'short' | 'long', rolls: [{ die, v, con, total }], off: unticked row ids, seen: row ids shown so far, applied }
const F = key => S.field(key);
const hpNow = () => numIn(S.get(F('hp'))), hpMax = () => numIn(S.get(F('hpMax')));
const own = () => st().effects || [];
const exhaustion = () => own().find(e => e.name === 'Exhaustion');
const conc = () => window.effects?.concentration();
// Hours a concentration spell lasts ("up to 10 minutes" -> 1/6), null when unknown
const hoursOf = text => { const m = String(text ?? '').match(/(\d+)\s*(minute|hour|day)/i); return m ? +m[1] * { minute: 1 / 60, hour: 1, day: 24 }[m[2].toLowerCase()] : null; };

// Arcane Recovery: spent slots worth up to half your Wizard level (rounded up), none of level 6+, the biggest first
function arcanePlan(used) {
  let budget = Math.ceil(classLevel('wizard') / 2);
  const out = [];
  for (let l = 5; l >= 1; l--) {
    for (let k = 0; k < used[l] && l <= budget; k++) { out.push(l); budget -= l; }
  }
  return out;
}

// Every change the rest makes: { group, id, label, from, to, note, apply (none = a note only), off (unticked at first) }
const GROUPS = ['Hit Points', 'Spell slots', 'Class features', 'Conditions', 'Good to know'];
function changes() {
  const rows = [], add = (group, r) => rows.push({ group, ...r }), long = R.kind === 'long';
  const hp = hpNow(), max = hpMax(), hd = hitDice(), res = resources();
  const usedNow = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, slotUsed(i + 1)]));
  if (long) {
    if (max != null && (hp == null || hp < max)) add('Hit Points', { id: 'hp', label: 'Current HP', from: hp ?? '—', to: max, apply: () => S.set(F('hp'), String(hpMax())) });
    else if (max == null) add('Hit Points', { label: 'Current HP', note: 'Back to your Hit Point maximum (no Max HP on the sheet to copy).' });
    const temp = numIn(S.get(F('hpTemp')));
    if (temp) add('Hit Points', { id: 'temp', label: 'Temporary HP', from: temp, to: '—', note: 'they last until a Long Rest', apply: () => S.set(F('hpTemp'), '') });
    if (hd.spent) add('Hit Points', { id: 'hd', label: 'Hit Point Dice spent', from: hd.spent, to: 0, note: 'a Long Rest brings all of them back', apply: () => writeHitDiceSpent({}) });
    const levels = Object.entries(usedNow).filter(([, n]) => n > 0);
    if (levels.length) add('Spell slots', { id: 'slots', label: 'Spell slots', from: levels.map(([l, n]) => `level ${l} ×${n} used`).join(', '), to: 'all back',
      apply: () => { for (const [l] of levels) writeSlotUsed(+l, 0); } });
    for (const r of res) if (r.used) add('Class features', { id: 'res:' + r.id, label: r.name, from: `${r.left}/${r.max}`, to: `${r.max}/${r.max}`, apply: () => writeUsed(r.id, 0) });
    const ex = exhaustion();
    if (ex) {
      const lvl = Math.max(1, Math.min(6, +ex.level || 1));
      add('Conditions', { id: 'exhaustion', label: 'Exhaustion', from: `level ${lvl}`, to: lvl > 1 ? `level ${lvl - 1}` : 'gone', note: 'a Long Rest takes one level away',
        apply: () => { const e = exhaustion(); if (!e) return; if (lvl > 1) e.level = lvl - 1; else own().splice(own().indexOf(e), 1); window.effects?.changed(); } });
    }
    const ds = S.map?.checks ? [...S.map.checks.deathSuccesses, ...S.map.checks.deathFailures].filter(b => S.get(b)) : [];
    if (ds.length) add('Conditions', { id: 'death', label: 'Death Saving Throws', from: `${ds.length} ticked`, to: 'cleared', apply: () => { for (const b of ds) S.set(b, false); } });
    const c = conc();
    if (c) {
      const hrs = hoursOf(c.duration);
      add('Conditions', { id: 'conc', label: `End concentration on ${c.name}`, off: !(hrs != null && hrs <= 8),
        note: hrs != null ? (hrs <= 8 ? `it lasts ${c.duration}, so it ran out during the rest` : `it lasts ${c.duration}: untick to keep it`) : 'untick it if the spell still lasts',
        apply: () => window.effects.concentrate(null) });
    }
    if (hp != null && hp < 1) add('Good to know', { label: 'At 0 HP', note: 'You need at least 1 Hit Point to start a Long Rest (your DM may still allow it).' });
  } else {
    const rolled = sum(R.rolls.map(r => r.total));
    if (R.rolls.length) {
      if (hp != null) add('Hit Points', { id: 'hp', label: 'Current HP', from: hp, to: max != null ? Math.min(max, hp + rolled) : hp + rolled,
        note: `+${rolled} from ${R.rolls.length} Hit Point ${R.rolls.length === 1 ? 'Die' : 'Dice'}${max != null && hp + rolled > max ? ` (capped at your maximum, ${max})` : ''}`,
        apply: () => { const n = hpNow() ?? 0, m = hpMax(); S.set(F('hp'), String(m != null ? Math.min(m, n + rolled) : n + rolled)); } });
      else add('Hit Points', { label: `+${rolled} HP`, note: 'No number in the Current HP box: add it yourself.' });
      const spend = { ...Object.fromEntries(hd.dice.map(d => [d.die, d.spent])) };
      for (const r of R.rolls) spend[r.die] = (spend[r.die] || 0) + 1;
      add('Hit Points', { id: 'hd', label: 'Hit Point Dice spent', from: hd.spent, to: hd.spent + R.rolls.length,
        note: R.rolls.map(r => 'd' + r.die).join(', '), apply: () => writeHitDiceSpent(spend) });
    }
    const p = pact(), after = { ...usedNow };
    if (p && usedNow[p.level]) {
      const back = Math.min(usedNow[p.level], p.slots);
      after[p.level] -= back;
      add('Spell slots', { id: 'pact', label: `Pact Magic slots (level ${p.level})`, from: `${slotsLeft(p.level)} left`, to: `${slotsLeft(p.level) + back} left`,
        apply: () => writeSlotUsed(p.level, slotUsed(p.level) - back) });
    }
    const ar = res.find(r => r.id === 'arcaneRecovery'), plan = ar?.left ? arcanePlan(after) : [];
    if (plan.length) {
      add('Spell slots', { id: 'arcane', label: 'Arcane Recovery', off: true, to: plan.map(l => `level ${l}`).join(', '),
        note: `once per Long Rest: slots worth up to ${Math.ceil(classLevel('wizard') / 2)} levels. Tick it to use it now.`,
        apply: () => { for (const l of plan) writeSlotUsed(l, slotUsed(l) - 1); writeUsed('arcaneRecovery', 1); } });
    }
    const sp = res.find(r => r.id === 'sorceryPoints'), sr = res.find(r => r.id === 'sorcerousRestoration');
    if (sp?.used && sr?.left) {
      const back = Math.min(sp.used, Math.floor(classLevel('sorcerer') / 2));
      add('Class features', { id: 'restoration', label: 'Sorcerous Restoration', off: true, from: `${sp.left}/${sp.max} Sorcery Points`, to: `${sp.left + back}/${sp.max}`,
        note: 'once per Long Rest. Tick it to use it now.', apply: () => { writeUsed('sorceryPoints', sp.used - back); writeUsed('sorcerousRestoration', 1); } });
    }
    for (const r of res) {
      if (!r.used || r.back === 'long') continue;
      const used = r.back === 'short' ? 0 : r.used - 1;
      add('Class features', { id: 'res:' + r.id, label: r.name, from: `${r.left}/${r.max}`, to: `${r.max - used}/${r.max}`, note: BACK[r.back], apply: () => writeUsed(r.id, used) });
    }
  }
  if (st().mode === 'marble') add('Good to know', { label: 'Killing Marble', note: `This rest takes ${long ? '8 hours' : '1 hour'}. The marble isn't changed here: use "An hour passes" on the Becoming Marble page for each hour.` });
  if (!rows.some(r => r.apply)) add('Good to know', { label: 'Nothing to get back', note: long ? 'You are rested already: full HP, every slot and feature.' : 'Roll Hit Point Dice above to heal; your features that come back on a Short Rest are all there.' });
  return rows;
}

// Unticked rows: the ones you unticked, and optional ones (off) until you tick them
const ticked = r => !R.off.has(r.id) && !(r.off && !R.seen.has(r.id));
function apply() {
  const rows = changes(), todo = rows.filter(r => r.apply && ticked(r));
  S.transaction(R.kind === 'long' ? 'Long Rest' : 'Short Rest', () => {
    for (const r of todo) {
      try { r.apply(); r.done = true; } catch (err) { console.error('Rest: could not apply', r.label, err); r.failed = true; }
    }
  });
  R.applied = { rows };
  changed();
  window.effects?.changed();
  render();
}

// Short Rest: roll Hit Point Dice (as many as you like and have); each one can be taken back before Apply
function diceSection() {
  const hd = hitDice(), con = mod('CON'), hp = hpNow(), max = hpMax();
  if (!hd.dice.length) return h('p', { class: 'lu-note' }, 'No Hit Point Dice found: write your class and level in the Class box.');
  const rolledOf = d => R.rolls.filter(r => r.die === d).length, healed = sum(R.rolls.map(r => r.total));
  const roll = d => { const v = rnd(d); R.rolls.push({ die: d, v, con, total: Math.max(1, v + con), fresh: true }); render(); };
  return h('div', { class: 'lu-pick rest-dice' },
    h('div', { class: 'lu-pickhead' }, h('b', {}, 'Spend Hit Point Dice'), h('span', { class: 'lu-count' }, `CON ${fmt(con)}`)),
    h('div', { class: 'rest-roll' }, hd.dice.map(d => {
      const left = d.left - rolledOf(d.die);
      return h('button', { class: 'btn', disabled: left <= 0, onclick: () => roll(d.die) }, `Roll a d${d.die}`, h('small', {}, ` ${left} left`));
    })),
    R.rolls.length ? h('div', { class: 'rest-rolls' }, R.rolls.map((r, i) => h('span', { class: 'rest-chip' },
      h('b', { class: 'lu-die mini' + (r.fresh ? ' landed' : ''), 'data-d': r.die }, r.v),
      h('span', {}, `${con ? ` ${fmt(con)}` : ''} = ${r.total}`),
      h('button', { class: 'rest-x', title: "Don't spend this one", 'aria-label': 'Take this roll back', onclick: () => { R.rolls.splice(i, 1); render(); } }, '×')))) : null,
    h('p', { class: 'lu-note' }, R.rolls.length ? `+${healed} HP` + (hp != null ? `: Current HP ${hp} → ${max != null ? Math.min(max, hp + healed) : hp + healed}${max != null ? ` of ${max}` : ''}` : '')
      : hp != null && max != null && hp >= max ? 'You are at full HP.' : 'Each die heals what it shows + your CON modifier (at least 1). Roll as many as you want to spend.'));
}

function reviewList() {
  const done = R.applied, rows = done ? done.rows : changes();
  for (const r of rows) if (r.id && !R.seen.has(r.id)) { R.seen.add(r.id); if (r.off) R.off.add(r.id); } // optional rows start unticked
  return GROUPS.map(g => {
    const list = rows.filter(r => r.group === g);
    if (!list.length) return null;
    return h('section', { class: 'lu-group' }, h('h4', {}, g), h('ul', {}, list.map(r => {
      const on = !R.off.has(r.id);
      const tick = r.apply ? done ? h('span', { class: 'lu-state ' + (r.done ? 'ok' : r.failed ? 'bad' : 'skip') }, r.done ? '✓' : r.failed ? '!' : '–')
        : h('input', { type: 'checkbox', checked: on, 'aria-label': r.label, onchange: e => { e.target.checked ? R.off.delete(r.id) : R.off.add(r.id); } })
        : h('span', { class: 'lu-state info' }, '•');
      return h('li', { class: r.apply ? '' : 'info' }, h('label', {}, tick,
        h('span', { class: 'lu-row' }, h('b', {}, r.label),
          r.from != null || r.to != null ? h('span', { class: 'lu-ft' }, r.from != null ? h('s', {}, String(r.from)) : null, r.from != null ? ' → ' : '', h('em', {}, String(r.to ?? ''))) : null,
          r.note ? h('small', { class: 'lu-n' }, r.note) : null)));
    })));
  });
}

function render() {
  if (!R || !win) return;
  const long = R.kind === 'long', body = win.querySelector('.lu-body'), keep = body.scrollTop;
  win.querySelector('.lu-title b').textContent = long ? 'Long Rest' : 'Short Rest';
  win.querySelector('.lu-sub').textContent = `${String(C.name ?? '').trim() || 'Your character'} · ${long ? '8 hours' : '1 hour'}`;
  body.replaceChildren(...[
    R.applied ? h('p', { class: 'lu-lead' }, `${long ? 'Long' : 'Short'} Rest done: the ticked changes are on the sheet (Ctrl+Z takes them back). Download the PDF to keep them.`)
      : h('p', { class: 'lu-lead' }, long ? 'Everything a Long Rest brings back. Untick anything you don\'t want, then Apply. Nothing has changed yet.'
        : 'Spend Hit Point Dice if you want to heal, check the list, then Apply. Nothing has changed yet.'),
    !long && !R.applied ? diceSection() : null,
    reviewList()
  ].flat(Infinity).filter(Boolean));
  body.scrollTop = keep;
  for (const r of R.rolls) r.fresh = false;
  win.querySelector('.lu-foot').replaceChildren(...(R.applied
    ? [h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: close }, 'Close')]
    : [h('button', { class: 'btn', onclick: cancel }, 'Cancel'), h('span', { class: 'grow' }),
      h('button', { class: 'btn primary rest-apply', onclick: apply }, `Apply ${long ? 'Long' : 'Short'} Rest`)]));
}

function openRest(kind) {
  if (win) {
    if (R.kind === kind || R.rolls.length) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); return; }
    close();
  }
  R = { kind, rolls: [], off: new Set(), seen: new Set(), applied: null };
  win = h('section', { id: 'restwin', class: 'lu', role: 'dialog', 'aria-label': 'Rest' },
    h('div', { class: 'lu-bar', title: 'Drag to move' },
      h('span', { class: 'lu-icon rest-icon', 'aria-hidden': 'true' }, '☾'), h('div', { class: 'lu-title' }, h('b', {}), h('span', { class: 'lu-sub' })),
      h('button', { class: 'lu-x', title: 'Close', 'aria-label': 'Close', onclick: () => R.applied ? close() : cancel() }, '✕')),
    h('div', { class: 'lu-body' }), h('div', { class: 'lu-foot' }));
  document.body.append(win);
  const w = Math.min(520, innerWidth - 24);
  window.draggable(win, win.querySelector('.lu-bar'))((innerWidth - w) / 2, 80);
  render();
}
function close() { win?.remove(); win = null; R = null; }
async function cancel() {
  if (!R.rolls.length) return close();
  const yes = await window.ask({ title: 'Cancel the rest?', text: 'The Hit Point Dice you rolled are not spent and nothing on the sheet changes.',
    buttons: [{ label: 'Keep resting', value: false }, { label: 'Cancel the rest', value: true, primary: true }] });
  if (yes) close();
}

$('rest').addEventListener('click', async () => {
  if (win) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); return; }
  const a = await window.ask({ title: 'Take a rest?', text: 'A Short Rest is 1 hour: spend Hit Point Dice to heal, and some features come back. ' +
    'A Long Rest is 8 hours: HP, Hit Point Dice, spell slots and features all come back. You see every change before it happens.',
  buttons: [{ label: 'Cancel', value: null }, { label: 'Short Rest', value: 'short' }, { label: 'Long Rest', value: 'long', primary: true }] });
  if (a) openRest(a);
});
document.addEventListener('sheet-loaded', () => { close(); $('rest').disabled = false; });
// keep the window up to date when the sheet changes (not while applying, not after)
for (const ev of ['character-change', 'resources-change', 'effects-change', 'sheet-state-change']) {
  document.addEventListener(ev, () => { if (R && !R.applied && !win.contains(document.activeElement)) render(); });
}

window.resources = { slots, slotsLeft, slotTotal, useSlot, restoreSlot, list: resources, setUsed, hitDice, view, slotStrip, openRest };
})();
