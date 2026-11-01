/* The turn bar, docked at the bottom of the sheet: what is left of your turn (movement and attacks) with "New turn", and a
   button for each feature you have that changes them: Dash and the features that Dash (Cunning Action, Step of the Wind
   ...), Feline Agility, Steady Aim, Difficult Terrain, standing up from Prone; Action Surge, Flurry of Blows, a Light
   weapon's extra attack ... (FEATURES). Nothing here is saved: "New turn" fills it up again and ends what lasts until your
   next turn (effects.startTurn). roller.js counts each new weapon attack (turn.attacked); rest.js's feature buttons add
   attacks, Dashes and movement (turn.add); effects.js gives the Speed (spells, conditions) and attacks per Attack action. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
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
const fx = () => window.effects;
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* private window */ } } };
const confirm = (title, text, yes) => window.ask({ title, text, buttons: [{ label: 'Cancel', value: false }, { label: yes, value: true, primary: true }] });

// What the character has
const C = () => window.character || {};
const lvl = key => (C().classes || []).find(c => c.key === key)?.level || 0;
const sub = key => (C().classes || []).find(c => c.key === key)?.sub?.name;
const trait = name => (C().speciesData?.features || []).some(f => f.name === name && f.lvl <= (C().level || 1));
const feat = name => (C().feats || []).includes(name);
const named = name => new RegExp(`\\b${name}\\b`, 'i').test(Object.values(window.fields || {}).filter(v => typeof v === 'string').join('\n'));
const button = (id, name) => (window.resources?.actions(id) || []).includes(name);
const lightWeapons = () => (C().weapons || []).filter(w => w.weapon?.props.includes('light')).length;
const prone = () => !!fx().hasState('Prone');
const roving = () => named('Roving Aim'); // Infiltration Expertise: Steady Aim doesn't stop you

// The buttons, for the features you have (has; use: you have that Rest tab button). seg: 'move' or 'attack'.
//   dash: it is a Dash (a Bonus Action one ...): on / off for this turn; attack: one more attack this turn, on / off;
//   on: a switch for this turn (press() knows what Feline Agility and Steady Aim do); use: [resource id, button name] =
//   the Rest tab's button (rest.js: spends its uses, logs it; pressed again it is taken back with that Undo);
//   state: what it puts in the Effects tray (pressed again: it ends). tip: what it does (else the Rest tab's text).
const FEATURES = [
  { name: 'Cunning Action', seg: 'move', dash: true, has: () => lvl('rogue') >= 2, tip: 'Bonus Action: Dash (or Disengage, or Hide).' },
  { name: 'Step of the Wind', seg: 'move', use: ['focus', 'Step of the Wind'] },
  { name: 'Adrenaline Rush', seg: 'move', use: ['sp:Adrenaline Rush', 'Adrenaline Rush'] },
  { name: 'Expeditious Retreat', seg: 'move', dash: true, tip: 'The spell: Dash as a Bonus Action on each of your turns.',
    has: () => fx().spellOn('Expeditious Retreat') || fx().concentration()?.name === 'Expeditious Retreat' },
  { name: 'Battlerager Charge', seg: 'move', dash: true, tip: 'While raging: Dash as a Bonus Action.',
    has: () => sub('barbarian') === 'Path of the Battlerager' && lvl('barbarian') >= 10 && fx().hasState('Raging') },
  { name: 'Feline Agility', seg: 'move', on: true, label: 'Feline Agility ×2', has: () => trait('Feline Agility'),
    tip: 'Your Speed is doubled until the end of the turn (Dashes too); then not again until you move 0 ft on one of your turns.' },
  { name: "Ambusher's Leap", seg: 'move', on: true, label: "Ambusher's Leap +10", has: () => sub('ranger') === 'Gloom Stalker' && lvl('ranger') >= 3,
    tip: 'Dread Ambusher: +10 ft Speed on your first turn of each combat.' },
  { name: 'Rabbit Hop', seg: 'move', use: ['sp:Rabbit Hop', 'Rabbit Hop'] },
  { name: 'Large Form', seg: 'move', use: ['sp:Large Form', 'Large Form'], state: 'Large Form' },
  { name: 'Steady Aim', seg: 'move', on: true, has: () => lvl('rogue') >= 3,
    tip: () => "Bonus Action, if you haven't moved this turn: Advantage on your next attack roll this turn" +
      (roving() ? ' (Roving Aim: your Speed stays).' : '; your Speed is 0 until the end of the turn.') },
  { name: 'Difficult terrain', seg: 'move', on: true, has: () => true,
    tip: 'Each foot of movement costs 1 extra foot: the − / + buttons count it. Not after a Dash with Speedy, nor with Freedom of Movement on you.' },

  { name: 'Action Surge', seg: 'attack', use: ['actionSurge', 'Action Surge'] },
  { name: 'Flurry of Blows', seg: 'attack', use: ['focus', 'Flurry of Blows'] },
  { name: 'Martial Arts', seg: 'attack', attack: true, has: () => lvl('monk') >= 1,
    tip: 'Bonus Action: one Unarmed Strike (not as well as Flurry of Blows: both take your Bonus Action).' },
  { name: 'War Priest', seg: 'attack', use: ['warPriest', 'Bonus Action attack'] },
  { name: 'Light weapon', seg: 'attack', attack: true, has: () => lightWeapons() >= 2 || lightWeapons() >= 1 && feat('Dual Wielder'),
    tip: 'After attacking with a Light weapon: one attack with a different Light weapon as a Bonus Action (Nick: as part of the Attack action instead). No ability modifier to its damage unless it is negative (Two-Weapon Fighting adds it).' },
  { name: 'Pole Strike', seg: 'attack', attack: true, has: () => feat('Polearm Master'),
    tip: 'Polearm Master: after the Attack action with a Quarterstaff, Spear or Heavy Reach weapon, a Bonus Action attack with its other end (1d4 Bludgeoning).' },
  { name: 'Hew', seg: 'attack', attack: true, has: () => feat('Great Weapon Master'),
    tip: 'Great Weapon Master: right after a Critical Hit or dropping a creature to 0 HP with a melee weapon, one attack with it as a Bonus Action.' },
  { name: 'Horde Breaker', seg: 'attack', attack: true, has: () => named('Horde Breaker'),
    tip: 'Once per turn: another attack with the same weapon against a different creature within 5 ft of the first target.' },
  { name: 'Psychic Blades', seg: 'attack', attack: true, label: 'Second Psychic Blade', has: () => sub('rogue') === 'Soulknife',
    tip: 'After an attack with a Psychic Blade: one attack with a second blade as a Bonus Action.' },
  { name: 'Goring Rush', seg: 'attack', attack: true, has: () => trait('Goring Rush'),
    tip: 'Right after you Dash and move 20 ft or more: one melee attack with your Horns as a Bonus Action.' },
  { name: 'Charge', seg: 'attack', attack: true, label: 'Charge (Hooves)', has: () => trait('Charge'),
    tip: 'After moving 30 ft straight toward a target and hitting it with a melee weapon: attack it with your Hooves as a Bonus Action.' }
];

// ---- This turn ----------------------------------------------------------------------------------------------------------
// moved: feet used (typing a bigger number than the total makes it negative); dashes: Dash clicks; used: attacks made (the
// roller counts each new weapon attack roll); extra: attacks added by hand ("+1"); adds / dashFrom / feet: what a feature
// added, by name ({ 'Flurry of Blows': 3 }); on: this turn's switches (Feline Agility ...); undo: how to take back a
// Rest tab button's use, by name; stood: feet spent standing up. id: which turn it is (an Undo from an earlier turn's
// log entry leaves this one alone).
const T = {};
let id = 0, felineSpent = false; // Feline Agility used: back after one of your turns in which you don't move
const reset = () => { id++; Object.assign(T, { moved: 0, dashes: 0, used: 0, extra: 0, adds: {}, dashFrom: {}, feet: {}, on: {}, undo: {}, stood: 0, felineWas: false }); };
reset();

// Moving 5 ft costs 5 more in Difficult Terrain (not after a Dash with Speedy, nor with Freedom of Movement on you) and 5
// more while crawling (Prone)
const difficult = dashes => !!T.on['Difficult terrain'] && !(feat('Speedy') && dashes > 0) && !fx().spellOn('Freedom of Movement');
const stepOf = dashes => 5 * (1 + difficult(dashes) + prone());

// Your Speed this turn: the sheet's, + Ambusher's Leap, after effects (Haste, Slow, conditions: effects.speed), then
// Feline Agility doubles it and Steady Aim makes it 0. Each Dash adds it again (+10 ft with Charger); features add feet.
function now() {
  const c = C(), base = typeof c.speed === 'number' ? c.speed : null;
  const sp = fx().speed(base == null ? null : base + (T.on["Ambusher's Leap"] ? 10 : 0));
  let v = sp.value;
  if (v != null && T.on['Feline Agility']) v *= 2;
  if (v != null && T.on['Steady Aim'] && !roving()) v = 0;
  const dashes = T.dashes + sum(Object.values(T.dashFrom)), charger = v && feat('Charger') ? 10 : 0;
  const moveTotal = v == null ? null : v + dashes * (v + charger) + sum(Object.values(T.feet));
  const at = fx().attacks(), attacks = at.value + T.extra + sum(Object.values(T.adds));
  return { speed: v, base: sp.value, speedBy: sp.by, moveTotal, moveLeft: moveTotal == null ? null : Math.max(0, moveTotal - T.moved), moved: T.moved,
    dashes, charger, step: stepOf(dashes), perAction: at.base, by: at.by, adds: { ...T.adds }, dashFrom: { ...T.dashFrom }, feet: { ...T.feet },
    on: Object.keys(T.on), attacks, attacksLeft: Math.max(0, attacks - T.used) };
}

// "New turn": all movement and attacks back; Feline Agility comes back after a turn in which you didn't move
function newTurn() {
  if (felineSpent && !T.on['Feline Agility'] && T.moved <= 0) felineSpent = false;
  reset();
  fx().startTurn();
  render();
}
// An attack made (roller.js), or one given back
function attacked(n = 1) {
  const total = now().attacks;
  T.used = Math.max(0, Math.min(total, Math.min(T.used, total) + n));
  render();
}
// A feature adds attacks, Dashes or feet of movement (feet 'half' = half your Speed) to this turn; negative numbers take
// them back. undo: how to take back the whole use (the bar's button calls it). -> { feet, id }
function add({ name, attacks = 0, dashes = 0, feet = 0, undo, id: turn }) {
  if (turn != null && turn !== id) return { feet: 0, id: turn };
  if (feet === 'half') feet = Math.floor((now().speed || 0) / 2);
  const bump = (map, n) => { if (!n) return; map[name] = (map[name] || 0) + n; if (map[name] <= 0) delete map[name]; };
  bump(T.adds, attacks); bump(T.dashFrom, dashes); bump(T.feet, feet);
  if (undo) T.undo[name] = undo;
  else if (!(name in T.adds || name in T.dashFrom || name in T.feet)) delete T.undo[name];
  render();
  return { feet, id };
}

const keyOf = f => f.use ? f.use[1] : f.name;
const isOn = f => {
  const k = keyOf(f);
  return f.state ? fx().hasState(f.state) : f.use ? !!(T.adds[k] || T.dashFrom[k] || T.feet[k]) : f.dash ? !!T.dashFrom[k] : f.attack ? !!T.adds[k] : !!T.on[k];
};
const flip = (map, k) => { if (map[k]) delete map[k]; else map[k] = 1; };

// A feature's button: on, or off again
async function press(f) {
  const on = isOn(f), k = keyOf(f);
  if (f.use) {
    if (on && f.state) return fx().setState(f.state, false); // it ends (the roll log's Undo gives the use back)
    if (on) return T.undo[k] ? T.undo[k]() : add({ name: k, attacks: -(T.adds[k] || 0), dashes: -(T.dashFrom[k] || 0), feet: -(T.feet[k] || 0) });
    return window.resources.use(...f.use);
  }
  if (f.dash) flip(T.dashFrom, k);
  else if (f.attack) flip(T.adds, k);
  else if (k === 'Feline Agility') {
    if (on) felineSpent = T.felineWas;
    else {
      if (felineSpent && !await confirm(k, 'Feline Agility comes back after one of your turns in which you move 0 ft. Use it anyway?', 'Use anyway')) return;
      T.felineWas = felineSpent;
      felineSpent = true;
    }
    flip(T.on, k);
  } else if (k === 'Steady Aim') {
    if (!on && T.moved > 0 && !await confirm(k, "Steady Aim needs you not to have moved this turn. Use it anyway?", 'Use anyway')) return;
    flip(T.on, k);
    fx().setState('Steady Aim', !on);
  } else flip(T.on, k);
  render();
}

// Standing up from Prone costs half your Speed
async function standUp() {
  const t = now(), half = Math.floor((t.speed || 0) / 2);
  if (!t.speed || half > t.moveLeft) {
    const why = !t.speed ? "Your Speed is 0, so you can't stand up." : `Standing up costs half your Speed (${half} ft) and you have ${t.moveLeft} ft left.`;
    if (!await confirm('Stand up', why + ' Stand up anyway?', 'Stand up anyway')) return;
  }
  T.moved += half;
  T.stood += half;
  fx().setState('Prone', false);
  render();
}

// ---- The bar ---------------------------------------------------------------------------------------------------------------
const bar = $('turnbar');
let folded = store.get('turnbar-folded') === '1';

function render() {
  if (!window.sheet?.loaded) return bar.replaceChildren();
  const t = now(), mine = FEATURES.filter(f => f.use ? button(...f.use) : f.has());
  bar.classList.toggle('folded', folded);
  bar.replaceChildren(
    h('div', { class: 'tb-head' },
      h('span', { class: 'tb-title' }, h('b', {}, 'Turn'),
        h('button', { class: 'tb-fold', title: folded ? 'Show the feature buttons' : 'Hide the feature buttons', 'aria-label': folded ? 'Show the feature buttons' : 'Hide the feature buttons',
          'aria-expanded': String(!folded), onclick: () => { folded = !folded; store.set('turnbar-folded', folded ? '1' : '0'); render(); } }, folded ? '▴' : '▾')),
      h('button', { class: 'tb-new', onclick: newTurn, title: 'Your turn starts: all your movement and attacks back, and what lasts until your next turn ends' }, '↻ New turn')),
    h('div', { class: 'tb-segs' }, moveSeg(t, mine.filter(f => f.seg === 'move')), attackSeg(t, mine.filter(f => f.seg === 'attack'))));
}

function chip(f) {
  const on = isOn(f), info = f.use ? window.resources.action(...f.use) : null, tip = typeof f.tip === 'function' ? f.tip() : f.tip;
  const spent = f.name === 'Feline Agility' && felineSpent && !on;
  const title = [info ? `${info.time}: ${info.text}` : tip, info ? `${info.resource}: ${info.left} of ${info.max} left.` : null,
    spent ? 'Used: it comes back after a turn in which you move 0 ft.' : null,
    on ? (f.state ? 'Click to end it.' : info ? 'Click to take it back (the use comes back).' : 'Click to take it back.') : null].filter(Boolean).join(' ');
  return h('button', { class: 'tb-chip' + (on ? ' on' : '') + (spent || info && !on && info.left < 1 ? ' spent' : ''), title, 'aria-pressed': String(on), onclick: () => press(f) },
    f.label || f.name, info ? h('small', {}, String(info.left)) : null);
}

// Movement left: − / + (what 5 ft costs), type it; Dash; the features
function moveSeg(t, feats) {
  const step = d => h('button', { class: 'tb-btn', 'aria-label': d < 0 ? 'Moved 5 feet' : 'Give back 5 feet',
    title: (d < 0 ? 'Moved 5 ft' : 'Give back 5 ft') + (t.step > 5 ? ` (it costs ${t.step} ft: ${costWhy(t)})` : ''),
    disabled: d < 0 ? t.moveLeft <= 0 : T.moved <= 0, onclick: () => { T.moved = d < 0 ? T.moved + t.step : Math.max(0, T.moved - t.step); render(); } }, (d < 0 ? '−' : '+') + t.step);
  const half = Math.floor((t.speed || 0) / 2);
  return h('div', { class: 'tb-seg tb-move' },
    h('div', { class: 'tb-main' }, h('span', { class: 'tb-lbl' }, 'Move'),
      t.moveTotal == null ? h('small', { class: 'tb-of' }, 'No Speed on the sheet') : [
        step(-1),
        h('input', { class: 'tb-num', type: 'number', min: 0, step: 5, value: t.moveLeft, style: `--fill: ${t.moveTotal ? t.moveLeft / t.moveTotal : 0}`,
          'aria-label': 'Feet of movement left', title: 'Feet left: type it, or use − / +',
          onchange: e => { const v = parseInt(e.target.value, 10); if (v >= 0) T.moved = t.moveTotal - v; render(); } }),
        step(1),
        h('span', { class: 'tb-of' }, `/ ${t.moveTotal} ft`),
        h('span', { class: 'tb-chips' },
          // − (greyed out with no Dash to take back) | Dash ×N (every Dash this turn, the same width for any N) | + (a Dash).
          // A feature's Dash (Cunning Action, Step of the Wind ...) is counted too, and taken back with its own button.
          h('span', { class: 'tb-pair' },
            h('button', { class: 'tb-chip', 'aria-label': 'Take back a Dash', disabled: !T.dashes, onclick: () => { T.dashes--; render(); },
              title: T.dashes || !t.dashes ? 'Take back a Dash' : "This turn's Dash came from a feature: press its button to take it back" }, '−'),
            h('span', { class: 'tb-chip tb-dash' + (t.dashes ? ' on' : ''), role: 'status',
              title: 'Dashes this turn: each adds your Speed once more' + (t.charger ? ' (Charger: +10 ft)' : '') + '. + adds one, − takes one back.' }, `Dash ×${t.dashes}`),
            h('button', { class: 'tb-chip on', title: 'Dash: your Speed once more this turn', 'aria-label': 'Dash', onclick: () => { T.dashes++; render(); } }, '+')),
          prone() ? h('button', { class: 'tb-chip stand', title: `Standing up costs half your Speed (${half} ft), and you are no longer Prone. While Prone, moving costs double (crawling).`,
            onclick: standUp }, `Stand up −${half}`) : null,
          feats.map(chip))]),
    h('small', { class: 'tb-why' }, t.moveTotal == null ? null : whyMove(t)));
}
const costWhy = t => [difficult(t.dashes) ? 'Difficult Terrain' : null, prone() ? 'crawling' : null].filter(Boolean).join(' and ');
function whyMove(t) {
  const from = Object.entries(T.dashFrom).map(([n, k]) => k > 1 ? `${n} ×${k}` : n);
  return [`Speed ${t.base} ft` + (t.speedBy.length ? ` (${t.speedBy.join(', ')})` : ''),
    T.on["Ambusher's Leap"] ? "Ambusher's Leap +10 ft" : null,
    T.on['Feline Agility'] ? 'Feline Agility ×2' : null,
    T.on['Steady Aim'] && !roving() ? 'Steady Aim: Speed 0' : null,
    t.dashes ? `Dash ×${t.dashes}` + (from.length ? ` (${from.join(', ')})` : '') + (t.charger ? ', Charger +10 ft each' : '') : null,
    ...Object.entries(T.feet).map(([n, k]) => `${n} +${k} ft`),
    T.stood ? `stood up −${T.stood} ft` : null,
    t.step > 5 ? `5 ft costs ${t.step} (${costWhy(t)})` : null,
    felineSpent && !T.on['Feline Agility'] && trait('Feline Agility') ? 'Feline Agility used' : null].filter(Boolean).join(' · ');
}

// Attacks left: a pip each (click one to use it or give it back), −1 / +1, the features
function attackSeg(t, feats) {
  const why = [`${t.perAction} per Attack action`, ...t.by, ...Object.entries(t.adds).map(([n, k]) => `${n} +${k}`), T.extra ? `+${T.extra} added` : null];
  return h('div', { class: 'tb-seg tb-attacks' },
    h('div', { class: 'tb-main' }, h('span', { class: 'tb-lbl', title: 'Each weapon attack you roll in the roller uses one' }, 'Attacks'),
      h('span', { class: 'tb-pips' }, Array.from({ length: t.attacks }, (_, i) => {
        const on = i < t.attacksLeft;
        return h('button', { class: 'tb-pip' + (on ? ' on' : ''), title: on ? 'Use an attack' : 'Give an attack back', 'aria-label': on ? 'Use an attack' : 'Give an attack back',
          onclick: () => attacked(on ? 1 : -1) });
      })),
      h('span', { class: 'tb-of' }, `${t.attacksLeft} of ${t.attacks}`),
      h('span', { class: 'tb-chips' },
        h('span', { class: 'tb-pair' },
          T.extra ? h('button', { class: 'tb-btn', title: 'Take back an added attack', 'aria-label': 'Take back an added attack', onclick: () => { T.extra--; render(); } }, '−1') : null,
          h('button', { class: 'tb-btn', title: 'One more attack this turn (another action, a feature without a button …)', onclick: () => { T.extra++; render(); } }, '+1')),
        feats.map(chip))),
    h('small', { class: 'tb-why' }, why.filter(Boolean).join(' · ')));
}

// The sheet keeps clear of the bar (styles.css reads --turnbar)
new ResizeObserver(() => document.documentElement.style.setProperty('--turnbar', bar.offsetHeight + 'px')).observe(bar);

// Redraw once after a burst of changes (a level up writes many boxes, each one a character-change)
let queued = false;
const later = () => { if (!queued) { queued = true; queueMicrotask(() => { queued = false; render(); }); } };

window.turn = { now, newTurn, attacked, add, features: FEATURES };
document.addEventListener('sheet-loaded', () => { reset(); felineSpent = false; render(); });
for (const ev of ['effects-change', 'resources-change', 'sheet-state-change']) document.addEventListener(ev, later);
document.addEventListener('character-change', () => { if (!document.activeElement?.closest?.('#turnbar input')) later(); });
render();
})();
