/* Effects tray (bottom left): everything that currently changes your rolls or speed - conditions, debuffs you add
   yourself, and sources such as Killing Marble (marble.js). roller.js asks effects.forRoll() before every roll.
   Your own effects are saved inside the PDF (window.sheetState.effects), and so is concentration (sheetState.concentration).
   Concentration: one spell at a time, shown first in the tray. Anything that would end it (another concentration spell,
   an Incapacitating condition, Rage, damage, 0 HP) asks first and leaves the choice to you: you may only be trying things out.

   An effect: { name, detail, source: 'condition' | 'custom' | <source name>, removable, rules: [rule] }
   A rule:    { on: ['attack', 'damage', 'check', 'save'] (default: the three d20 rolls), ability: 'DEX', skill: 'Stealth', arm: 'left' | 'right',
                mod: -2, adv: true, dis: true, autoFail: true, nullifyDex: true (numeric DEX penalties stop counting),
                speed: { add: -10, half: true, zero: true }, unusable: true } */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const D = window.DND;
const D20 = ['attack', 'check', 'save'];
const fmt = n => (n < 0 ? '−' : '+') + Math.abs(n);
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
  const [label, base] = TARGETS[x.target] || TARGETS.all, v = +x.value || 0;
  const rule = x.kind === 'dis' ? { ...base, dis: true } : x.kind === 'adv' ? { ...base, adv: true }
    : x.kind === 'mod' ? { ...base, mod: v } : x.kind === 'speed' ? { speed: { add: v } } : null;
  const what = x.kind === 'note' ? '' : x.kind === 'speed' ? `Speed ${fmt(v)} ft` : x.kind === 'mod' ? `${fmt(v)} to ${label}` : `${KINDS[x.kind]} ${label}`;
  return { name: x.name, detail: [what, x.detail].filter(Boolean).join(' · '), source: 'custom', removable: true, saved: x,
    buff: x.kind === 'adv' || x.kind === 'mod' && v > 0, rules: rule ? [rule] : [] };
}

const active = () => [...providers.flatMap(p => p() || []), ...own().map(compile)];

// What applies to one roll: { kind: 'attack' | 'damage' | 'check' | 'save', ability, skill, arms: ['right', 'left'] }
function forRoll(roll) {
  const res = { mod: 0, parts: [], adv: [], dis: [], autoFail: [], notes: [] };
  const applies = r => !r.speed && (r.on || D20).includes(roll.kind) && (!r.ability || r.ability === roll.ability) &&
    (!r.skill || r.skill === roll.skill) && (!r.arm || (roll.arms || []).includes(r.arm));
  const fx = active();
  const nullify = fx.some(e => e.rules.some(r => r.nullifyDex && applies(r)));
  for (const e of fx) {
    for (const r of e.rules) {
      if (!applies(r)) continue;
      if (r.mod && !(nullify && r.ability === 'DEX' && r.mod < 0)) { res.mod += r.mod; res.parts.push({ name: e.name, mod: r.mod }); }
      if (r.adv) res.adv.push(e.name);
      if (r.dis) res.dis.push(e.name);
      if (r.autoFail) res.autoFail.push(e.name);
      if (r.unusable) res.notes.push(`${e.name}: this arm can't be used`);
    }
  }
  return res;
}

// Speed after effects: halved first, then added to, 0 wins
function speed(base) {
  const rules = active().flatMap(e => e.rules.filter(r => r.speed).map(r => ({ ...r.speed, name: e.name })));
  if (!rules.length || typeof base !== 'number') return { value: base, changed: rules.length > 0, by: rules.map(r => r.name) };
  let v = rules.some(r => r.half) ? Math.floor(base / 2) : base;
  v += rules.reduce((t, r) => t + (r.add || 0), 0);
  if (rules.some(r => r.zero)) v = 0;
  return { value: Math.max(0, v), changed: true, by: [...new Set(rules.map(r => r.name))] };
}

// ---- Concentration ----------------------------------------------------------------
const conc = () => window.sheetState.concentration || null;
const concSpell = name => D.spells.find(s => s.conc && s.name.toLowerCase() === String(name ?? '').trim().toLowerCase());
let lastCheck = null, check = null; // the last concentration save { total, dc, kept }; the save being rolled { name, dc }

// Start concentrating on a spell (or any name), or stop with null. Stored as { name, slot, duration }
function concentrate(name, slot = null) {
  const s = name && concSpell(name);
  window.sheetState.concentration = name ? { name: s ? s.name : name, slot, duration: s ? s.duration.replace(/^Concentration, /, '') : null } : null;
  lastCheck = null;
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
let open = true, adding = false, draft = { kind: 'dis', target: 'all', value: -1 };

function changed() {
  render();
  document.dispatchEvent(new CustomEvent('effects-change'));
}

function render() {
  const fx = active(), c = window.character || {}, con = conc();
  const sp = speed(typeof c.speed === 'number' ? c.speed : null);
  tray.classList.toggle('open', open);
  tray.replaceChildren(...[
    h('div', { class: 'fx-head' },
      h('button', { class: 'fx-fold', 'aria-expanded': String(open), onclick: () => { open = !open; render(); } },
        h('b', {}, 'Effects'), h('span', { class: 'fx-count' + (fx.length || con ? ' some' : '') }, fx.length + !!con)),
      h('button', { class: 'fx-addbtn', onclick: () => { adding = !adding; open = true; render(); } }, adding ? 'Close' : '+ Add')),
    open ? [
      adding ? form() : null,
      fx.length || con ? h('ul', { class: 'fx-list' }, con ? concItem(con) : null, fx.map(e => h('li', { class: `fx ${e.source}${e.buff ? ' buff' : ''}` },
        h('span', { class: 'fx-dot', 'aria-hidden': 'true' }),
        h('div', { class: 'fx-text', onclick: e.focus ? () => e.focus() : null, title: e.focus ? 'Show on the sheet' : null },
          h('b', {}, e.name), e.detail ? h('small', {}, e.detail) : null),
        e.removable ? h('button', { class: 'fx-x', title: 'Remove', 'aria-label': 'Remove ' + e.name,
          onclick: () => { own().splice(own().indexOf(e.saved), 1); changed(); } }, '×') : null)))
        : !adding ? h('p', { class: 'fx-empty' }, 'No effects. Add a condition, your own debuff or a spell you concentrate on.') : null,
      sp.changed && sp.value != null ? h('p', { class: 'fx-speed' }, 'Speed ', h('s', {}, c.speed + ' ft'), ' → ', h('b', {}, sp.value + ' ft')) : null
    ] : null].flat(Infinity).filter(Boolean));
}

function concItem(con) {
  const save = lastCheck && `CON save ${lastCheck.total} vs DC ${lastCheck.dc}: ${lastCheck.kept ? 'kept' : 'failed'}`;
  return h('li', { class: 'fx conc' + (lastCheck && !lastCheck.kept ? ' failed' : '') },
    h('span', { class: 'fx-ring', 'aria-hidden': 'true' }),
    h('div', { class: 'fx-text' }, h('b', {}, h('em', {}, 'Concentrating'), ' ', con.name),
      h('small', {}, [con.slot ? `Level ${con.slot} slot` : '', con.duration, save].filter(Boolean).join(' · '))),
    h('button', { class: 'fx-x', title: 'End concentration', 'aria-label': 'End concentration on ' + con.name, onclick: () => concentrate(null) }, '×'));
}

function form() {
  const cond = CONDITIONS[draft.name], spell = !cond && concSpell(draft.name);
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
  const shape = n => CONDITIONS[n] ? 'condition' : concSpell(n) ? 'spell' : 'custom';
  // Rebuild the form only when its shape changes (a condition was picked, another kind of effect), keeping the caret
  const set = k => e => {
    const was = shape(draft.name);
    draft[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (k === 'value' || k === 'level' || k === 'name' && was === shape(draft.name)) return;
    render();
    const el = tray.querySelector(`[name="${k}"]`);
    if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch { /* not a text box */ } }
  };
  return h('form', { class: 'fx-form', onsubmit: commit },
    h('label', {}, 'Name or condition', h('input', { name: 'name', list: 'fx-conditions', value: draft.name || '', placeholder: 'e.g. Poisoned, Cursed…',
      autocomplete: 'off', oninput: set('name') })),
    h('datalist', { id: 'fx-conditions' }, Object.keys(CONDITIONS).map(n => h('option', { value: n })),
      concSpells().map(s => h('option', { value: s.name, label: 'Concentration spell' }))),
    spell ? h('p', { class: 'fx-hint' }, `Concentration spell (${spell.duration.replace(/^Concentration, /, '')}): adding it means you are concentrating on it.`)
    : cond ? [h('p', { class: 'fx-hint' }, cond.detail),
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

window.effects = { forRoll, speed, active, conditions: CONDITIONS, register: p => { providers.push(p); }, changed,
  concentration: conc, concentrate, interrupt, askEnd };
document.addEventListener('sheet-loaded', () => { lastCheck = check = null; render(); });
document.addEventListener('sheet-state-change', render); // Undo / Redo put sheetState back
document.addEventListener('character-change', () => { if (!tray.contains(document.activeElement)) render(); });
render();
})();
