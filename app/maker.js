/* Sheet maker: "…or create a new sheet" under the drop area. A window (the level-up kind, drag it by its title bar) walks
   through a new character: the blank sheet (the classic 2014 one or the official 2024 one), class and starting level,
   background, species, ability scores, starting equipment and details, then a review. "Create sheet" opens the blank
   sheet, writes all of it (one step for Undo) and hands over to Level up for level 1 (class skills, features, the Origin
   feat, spells, Hit Points); Level up then offers each next level up to the starting level.
   Rules data: DND.creation (data/creation.js), classes' startingEquipment, backgrounds' equipment, DND.species.
   The blank PDFs are data/sheet-2014.js and data/sheet-2024.js (base64), loaded when the window opens. */
(() => {
'use strict';
const D = window.DND, CR = D.creation, C = window.character, S = window.sheet, $ = id => document.getElementById(id);
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
const fmt = window.calc.fmt;
const ABS = Object.keys(D.rules.abilities);
const modOf = s => Math.floor((s - 10) / 2);
const text = v => String(v ?? '').trim();
const short = name => name.split(': ').pop(); // "Elven Lineage: High Elf" -> "High Elf"
const HERE = document.currentScript?.src || location.href; // for the blank sheets' script files

// ---- The blank sheets ----------------------------------------------------------------------------------
const SHEETS = {
  classic: { name: 'Classic sheet (2014)', file: '../data/sheet-2014.js', pages: 3, attackLines: 3,
    text: 'The classic Wizards of the Coast sheet: 3 pages (stats, details and a spell page with a list per spell level, Slots Total and Slots Expended).' },
  official2024: { name: 'Official 2024 sheet', file: '../data/sheet-2024.js', pages: 2, attackLines: 6,
    text: 'The 2024 Wizards of the Coast sheet: 2 pages, one spell table, boxes for armor training, weapon and tool proficiencies, feats and species traits.' }
};
const loading = {};
function loadScript(src) {
  return loading[src] ||= new Promise((res, rej) => {
    const s = h('script', { src: new URL(src, HERE).href });
    s.onload = res;
    s.onerror = () => { delete loading[src]; rej(new Error('Could not load ' + src)); };
    document.head.append(s);
  });
}
async function blankBytes(key) {
  await loadScript(SHEETS[key].file);
  return Uint8Array.from(atob(window.BLANK_SHEETS[key].replace(/\s/g, '')), c => c.charCodeAt(0));
}
// A picture of the sheet's first page (rendered once)
const thumbs = {};
async function thumb(key) {
  if (thumbs[key]) return thumbs[key];
  const pdf = await pdfjsLib.getDocument({ data: await blankBytes(key) }).promise, page = await pdf.getPage(1);
  const vp = page.getViewport({ scale: 220 / page.getViewport({ scale: 1 }).width }), canvas = h('canvas');
  canvas.width = vp.width; canvas.height = vp.height;
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise;
  return thumbs[key] = canvas.toDataURL('image/png');
}

// ---- The new character ----------------------------------------------------------------------------------
let M = null, win = null;
const cls = () => D.classes[M.cls];
const bg = () => D.backgrounds.find(b => b.name === M.bg);
const species = () => D.species.find(s => s.name === M.species);
// The class's order of importance (from Standard Array by Class), used to place rolled scores
const priority = key => ABS.map((ab, i) => [ab, CR.standardArrayByClass[key][i]]).sort((a, b) => b[1] - a[1]).map(x => x[0]);
const lineageFeature = () => (species()?.features || []).find(f => f.choice?.type === 'lineage');

function fresh() {
  return { step: 0, sheet: 'classic', cls: null, level: 1, bg: null, bgTool: '', species: null, lineage: '', size: '', spellAbility: '',
    method: 'array', assign: {}, rolls: null, buy: null, manual: null, bonus: { mode: 2, plus2: null, plus1: null },
    eq: { cls: 0, bg: 0, picks: {} }, extraGold: null,
    d: { name: '', player: '', alignment: '', xp: '', langs: ['', ''], age: '', height: '', weight: '', eyes: '', skin: '', hair: '',
      personality: '', ideals: '', bonds: '', flaws: '', backstory: '' } };
}

// Ability scores before the background: by method
function baseScores() {
  if (M.method === 'manual') return { ...M.manual };
  if (M.method === 'buy') return { ...M.buy };
  const pool = M.method === 'roll' ? (M.rolls || []).map(r => r.total) : CR.standardArray;
  return Object.fromEntries(ABS.map(ab => [ab, pool[M.assign[ab]] ?? null]));
}
// The background's increase: +2 and +1, or +1 to all three of its abilities (none above 20)
function bonuses() {
  const b = bg(), out = Object.fromEntries(ABS.map(ab => [ab, 0]));
  if (!b) return out;
  if (M.bonus.mode === 1) for (const ab of b.abilityScores) out[ab] = 1;
  else { if (M.bonus.plus2) out[M.bonus.plus2] += 2; if (M.bonus.plus1) out[M.bonus.plus1] += 1; }
  return out;
}
const finalScores = () => { const base = baseScores(), b = bonuses(); return Object.fromEntries(ABS.map(ab => [ab, base[ab] == null ? null : Math.min(20, base[ab] + b[ab])])); };
// Placing a pool of numbers (standard array or rolls): the class's most important ability gets the biggest
function autoAssign(values) {
  const order = values.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
  M.assign = Object.fromEntries(priority(M.cls || 'fighter').map((ab, i) => [ab, order[i]]));
}
function defaultBonus() {
  const b = bg();
  if (!b) return;
  const prio = priority(M.cls || 'fighter'), mine = b.abilityScores;
  const by = prio.filter(ab => mine.includes(ab));
  M.bonus = { mode: 2, plus2: by[0], plus1: by[1] };
}

// ---- Starting equipment --------------------------------------------------------------------------------
// An item: "4 Handaxes", "Druidic Focus (Quarterstaff)", { choose: [kinds], proficiency } or { same: true } (the background's tool)
function itemText(it, key) {
  if (typeof it === 'string') return it;
  if (it.same) return M.bgTool || bg()?.toolChoice?.from[0] || 'tool';
  return M.eq.picks[key] || it.choose.join(' or ');
}
function packageItems(opt, prefix) {
  return (opt?.items || []).map((it, i) => ({ raw: it, key: `${prefix}${i}`, text: itemText(it, `${prefix}${i}`) }));
}
function chosenItems() {
  const c = cls(), b = bg();
  return [...packageItems(c?.startingEquipment?.[M.eq.cls], 'c'), ...packageItems(b?.equipment?.[M.eq.bg], 'b')];
}
function gold() {
  return (cls()?.startingEquipment?.[M.eq.cls]?.gp || 0) + (bg()?.equipment?.[M.eq.bg]?.gp || 0) + (M.extraGold || 0);
}
// Weapons, armor and a Shield among the items (a count in front or a plural is fine; "Arcane Focus (Quarterstaff)" is one)
const has = (txt, name) => new RegExp(`\\b${name}s?\\b`, 'i').test(txt);
function weaponsIn(items) {
  const out = [];
  for (const it of items) for (const w of D.weapons) if (has(it.text, w.name) && !out.includes(w)) out.push(w);
  return out.filter(w => !out.some(o => o !== w && o.name.includes(w.name))); // "Light Crossbow", not also "Crossbow"
}
const armorIn = items => D.armor.filter(a => items.some(it => has(it.text, a.name))).sort((a, b) => b.ac - a.ac)[0] || null;
const shieldIn = items => items.some(it => /^shield$/i.test(it.text));
function armorClass(items, scores) {
  const a = armorIn(items), dex = modOf(scores.DEX ?? 10), shield = shieldIn(items) ? 2 : 0;
  if (a) return { ac: a.ac + (a.dex === 'full' ? dex : a.dex === 'max2' ? Math.min(dex, 2) : 0) + shield, how: `${a.name}${shield ? ' + Shield' : ''}` };
  if (M.cls === 'barbarian') return { ac: 10 + dex + modOf(scores.CON ?? 10) + shield, how: 'Unarmored Defense (10 + DEX + CON)' + (shield ? ' + Shield' : '') };
  if (M.cls === 'monk' && !shield) return { ac: 10 + dex + modOf(scores.WIS ?? 10), how: 'Unarmored Defense (10 + DEX + WIS)' };
  return { ac: 10 + dex + shield, how: 'no armor (10 + DEX)' + (shield ? ' + Shield' : '') };
}
// "Priest's Pack" -> "Priest's Pack (Backpack, Blanket, ...)"
const withPack = t => CR.packs[t] ? `${t} (${CR.packs[t].join(', ')})` : t;

// ---- Steps ------------------------------------------------------------------------------------------
const pickHead = (title, extra) => h('div', { class: 'lu-pickhead' }, h('b', {}, title), extra || null);
const card = (on, onclick, title, sub, tag) => h('button', { class: 'lu-card' + (on ? ' on' : ''), onclick },
  h('b', {}, title, tag ? h('small', { class: 'lu-src' }, tag) : null), sub ? h('span', {}, sub) : null);
const chip = (label, on, onclick, title) => h('button', { class: 'chip' + (on ? ' on' : ''), onclick, title }, label);
const set = (fn) => () => { fn(); render(); };

function sheetStep() {
  return [h('p', { class: 'lu-lead' }, 'Which character sheet do you want to fill in?'),
    h('div', { class: 'mk-sheets' }, Object.entries(SHEETS).map(([key, s]) => h('button', { class: 'mk-sheet' + (M.sheet === key ? ' on' : ''), onclick: set(() => { M.sheet = key; }) },
      h('span', { class: 'mk-thumb', 'data-thumb': key }, thumbs[key] ? h('img', { src: thumbs[key], alt: s.name }) : h('i', {}, 'Loading…')),
      h('b', {}, s.name), h('span', {}, s.text))))];
}

function classStep() {
  const keys = Object.keys(D.classes);
  return [h('p', { class: 'lu-lead' }, 'Choose a class.'),
    h('div', { class: 'lu-cards compact' }, keys.map(k => {
      const c = D.classes[k];
      return card(M.cls === k, set(() => { if (M.cls !== k) { M.cls = k; M.eq.cls = 0; autoAssign(M.method === 'roll' && M.rolls ? M.rolls.map(r => r.total) : CR.standardArray); if (M.method === 'buy') M.buy = arrayScores(); defaultBonus(); } }),
        c.name, `d${c.hitDie} Hit Die · ${c.primaryAbility} · saves ${c.saves.join(', ')} · armor: ${(c.armorTraining || []).join(', ') || 'none'}`);
    })),
    h('div', { class: 'lu-pick' }, pickHead('Starting level'),
      h('div', { class: 'mk-level' },
        h('button', { class: 'pstep', 'aria-label': 'Lower level', onclick: set(() => { M.level = Math.max(1, M.level - 1); }) }, '−'),
        h('b', {}, M.level),
        h('button', { class: 'pstep', 'aria-label': 'Higher level', onclick: set(() => { M.level = Math.min(20, M.level + 1); }) }, '+')),
      h('p', { class: 'lu-note' }, M.level > 1 ? `The sheet starts at level 1; then Level up opens for each level up to ${M.level}, so you make every level's choices.`
        : 'Most groups start at level 1 (or 3 with experienced players). Your DM decides.'))];
}
const arrayScores = () => { const a = CR.standardArrayByClass[M.cls || 'fighter']; return Object.fromEntries(ABS.map((ab, i) => [ab, a[i]])); };

function backgroundStep() {
  const b = bg(), tools = b?.toolChoice && CR.toolKinds[b.toolChoice.from[0]];
  return [h('p', { class: 'lu-lead' }, 'Choose a background: where your character comes from. It raises three ability scores, gives an Origin feat, two skills and a tool.'),
    h('div', { class: 'lu-cards compact' }, D.backgrounds.map(x => {
      const skills = x.proficiencies.filter(p => p.startsWith('Skill: ')).map(p => p.slice(7)).join(', ');
      const tool = x.proficiencies.find(p => p.startsWith('Tool: '))?.slice(6) || (x.toolChoice ? `one ${x.toolChoice.from[0]}` : '');
      return card(M.bg === x.name, set(() => { if (M.bg !== x.name) { M.bg = x.name; M.bgTool = ''; M.eq.bg = 0; defaultBonus(); } }), x.name,
        `${x.abilityScores.join(', ')} · ${x.feat}${x.featList ? ` (${x.featList[0].toUpperCase() + x.featList.slice(1)})` : ''} · ${skills}${tool ? ' · ' + tool : ''}`,
        x.source ? 'PHB' : null);
    })),
    tools ? h('div', { class: 'lu-pick' }, pickHead(`Your ${b.toolChoice.from[0]}`),
      h('select', { class: 'lu-wide', onchange: e => { M.bgTool = e.target.value; render(); } },
        h('option', { value: '' }, `Choose one…`), tools.map(t => h('option', { value: t, selected: M.bgTool === t }, t)))) : null];
}

function speciesStep() {
  const full = D.species.filter(s => !s.brief), more = D.species.filter(s => s.brief), sp = species();
  const q = (M.q || '').trim().toLowerCase();
  const found = q ? more.filter(s => s.name.toLowerCase().includes(q)).slice(0, 12) : [];
  const lf = lineageFeature(), subs = sp?.subspecies || [];
  const pick = s => set(() => { if (M.species !== s.name) { M.species = s.name; M.lineage = ''; M.size = /or/.test(s.size || '') ? '' : s.size || 'Medium'; M.spellAbility = ''; } });
  return [h('p', { class: 'lu-lead' }, 'Choose a species.'),
    h('div', { class: 'lu-cards compact' }, full.map(s => card(M.species === s.name, pick(s), s.name, `${s.size} · ${s.speed} ft · ${s.traits.join(', ')}`, s.source ? 'PHB' : null))),
    h('div', { class: 'lu-pick' }, pickHead('More species (names and trait names only)'),
      h('input', { type: 'search', class: 'lu-wide mk-q', placeholder: 'Search 160+ more species', value: M.q || '', 'data-keep': 'q',
        oninput: e => { M.q = e.target.value; render(); } }),
      found.length ? h('div', { class: 'lu-cards compact' }, found.map(s => card(M.species === s.name, pick(s), s.name, s.traits.join(', '), s.source))) : null,
      sp?.brief && !found.includes(sp) ? h('div', { class: 'lu-cards compact' }, card(true, null, sp.name, sp.traits.join(', '), sp.source)) : null),
    sp?.brief ? h('p', { class: 'lu-warn' }, `${sp.name}'s rules aren't in the free rules data: its traits are named, but write what they do (and its size and speed) yourself.`) : null,
    subs.length ? h('div', { class: 'lu-pick' }, pickHead(lf?.name || 'Lineage'), h('p', { class: 'lu-note' }, lf?.text || ''),
      h('div', { class: 'lu-opts' }, subs.map(x => h('button', { class: 'lu-opt' + (M.lineage === short(x.name) ? ' on' : ''), onclick: set(() => { M.lineage = short(x.name); }) },
        h('b', {}, short(x.name)), h('small', {}, x.traits.map(t => t.lvl > 1 ? `${short(t.name)} (level ${t.lvl})` : short(t.name)).join(', ')))))) : null,
    lf?.choice?.ability ? h('div', { class: 'lu-pick' }, pickHead('Spellcasting ability for these spells'),
      h('div', { class: 'chips' }, lf.choice.ability.map(ab => chip(ab, (M.spellAbility || defaultSpellAbility(lf)) === ab, set(() => { M.spellAbility = ab; }))))) : null,
    sp && /or/.test(sp.size || '') ? h('div', { class: 'lu-pick' }, pickHead('Size'),
      h('div', { class: 'chips' }, sp.size.split(' or ').map(sz => chip(sz, M.size === sz, set(() => { M.size = sz; }))))) : null];
}
const defaultSpellAbility = lf => lf.choice.ability.find(ab => ab === D.classes[M.cls]?.spellcasting?.ability) || lf.choice.ability[0];

function abilitiesStep() {
  const b = bg(), base = baseScores(), bon = bonuses(), fin = finalScores();
  const methods = [['array', 'Standard array'], ['buy', 'Point buy'], ['roll', 'Roll 4d6'], ['manual', 'Type them']];
  const pool = M.method === 'roll' ? (M.rolls || []).map(r => r.total) : CR.standardArray;
  const setMethod = m => set(() => {
    M.method = m;
    if (m === 'array') autoAssign(CR.standardArray);
    if (m === 'buy' && !M.buy) M.buy = arrayScores();
    if (m === 'manual' && !M.manual) M.manual = Object.fromEntries(ABS.map(ab => [ab, finalScoresBase(ab)]));
    if (m === 'roll' && !M.rolls) rollAll();
  });
  const finalScoresBase = ab => base[ab] ?? 10;
  const spent = M.method === 'buy' ? sum(ABS.map(ab => CR.pointBuy.cost[M.buy[ab]])) : 0, left = CR.pointBuy.budget - spent;
  const control = ab => {
    if (M.method === 'buy') {
      const v = M.buy[ab], up = CR.pointBuy.cost[v + 1];
      return h('span', { class: 'pool' }, h('button', { class: 'pstep', disabled: v <= 8, onclick: set(() => { M.buy[ab] = v - 1; }), 'aria-label': `${ab} lower` }, '−'),
        h('b', { class: 'mk-v' }, v), h('button', { class: 'pstep', disabled: v >= 15 || up - CR.pointBuy.cost[v] > left, onclick: set(() => { M.buy[ab] = v + 1; }), 'aria-label': `${ab} higher` }, '+'));
    }
    if (M.method === 'manual') return h('input', { type: 'number', min: 1, max: 30, value: M.manual[ab], class: 'mk-num', 'data-keep': 'm' + ab,
      oninput: e => { M.manual[ab] = Math.max(1, Math.min(30, Math.round(+e.target.value || 0))); render(); } });
    return h('select', { class: 'mk-sel', onchange: e => { // pick a value; the ability that had it gets this one's
      const i = +e.target.value, other = ABS.find(x => M.assign[x] === i);
      if (other) M.assign[other] = M.assign[ab];
      M.assign[ab] = i; render();
    } }, pool.map((v, i) => h('option', { value: i, selected: M.assign[ab] === i }, v)));
  };
  const prio = M.cls ? priority(M.cls).slice(0, 2) : [];
  return [h('p', { class: 'lu-lead' }, 'Ability scores: pick a method, place the numbers, then add your background\'s increase.'),
    h('div', { class: 'chips' }, methods.map(([m, label]) => chip(label, M.method === m, setMethod(m)))),
    M.method === 'roll' ? h('div', { class: 'mk-rolls' }, h('button', { class: 'btn', onclick: set(rollAll) }, '↻ Roll all six again'),
      (M.rolls || []).map(r => h('span', { class: 'mk-roll' }, r.dice.map((d, i) => h('i', { class: i === r.drop ? 'drop' : '' }, d)), h('b', {}, r.total)))) : null,
    M.method === 'buy' ? h('p', { class: 'lu-note' + (left < 0 ? ' bad' : '') }, `Points left: ${left} of ${CR.pointBuy.budget} (scores 8 to 15).`) : null,
    h('table', { class: 'mk-abs' }, h('tr', {}, h('th', {}, ''), h('th', {}, 'Score'), h('th', {}, b ? 'Background' : ''), h('th', {}, 'Total'), h('th', {}, 'Mod')),
      ABS.map(ab => h('tr', { class: prio.includes(ab) ? 'main' : '' }, h('td', {}, h('b', {}, D.rules.abilities[ab]), prio.includes(ab) ? h('small', {}, ` ${D.classes[M.cls].name}`) : null),
        h('td', {}, control(ab)), h('td', { class: 'mk-plus' }, bon[ab] ? `+${bon[ab]}` : ''), h('td', { class: 'mk-total' }, fin[ab] ?? '—'),
        h('td', {}, fin[ab] == null ? '' : fmt(modOf(fin[ab])))))),
    b ? h('div', { class: 'lu-pick' }, pickHead(`${b.name}: ${b.abilityScores.join(', ')}`),
      h('div', { class: 'chips' }, chip('+2 and +1', M.bonus.mode === 2, set(() => { M.bonus.mode = 2; })), chip('+1 to all three', M.bonus.mode === 1, set(() => { M.bonus.mode = 1; }))),
      M.bonus.mode === 2 ? h('div', { class: 'mk-bonus' },
        [['plus2', '+2'], ['plus1', '+1']].map(([k, label]) => h('div', {}, h('small', {}, label),
          b.abilityScores.map(ab => chip(ab, M.bonus[k] === ab, set(() => {
            const o = k === 'plus2' ? 'plus1' : 'plus2';
            if (M.bonus[o] === ab) M.bonus[o] = M.bonus[k];
            M.bonus[k] = ab;
          })))))) : null,
      h('p', { class: 'lu-note' }, 'No score can go above 20.')) : h('p', { class: 'lu-note' }, 'Choose a background to add its increase.')];
}
function rollAll() {
  M.rolls = Array.from({ length: 6 }, () => {
    const dice = Array.from({ length: 4 }, () => rnd(6)), drop = dice.indexOf(Math.min(...dice));
    return { dice, drop, total: sum(dice) - dice[drop] };
  });
  autoAssign(M.rolls.map(r => r.total));
}

function equipmentStep() {
  const c = cls(), b = bg(), fin = finalScores();
  const option = (opt, i, prefix, on, pickIt) => card(on, set(pickIt), `Option ${'ABC'[i]}`,
    opt.items ? `${packageItems(opt, prefix).map(x => x.text).join(', ')}, and ${opt.gp} GP` : `${opt.gp} GP to buy your own gear`);
  const choices = (opt, prefix) => packageItems(opt, prefix).filter(x => typeof x.raw === 'object' && x.raw.choose).map(x => h('div', { class: 'lu-pick' },
    pickHead(x.raw.choose.join(' or ') + (x.raw.proficiency ? ' (you will be proficient with it)' : '')),
    h('select', { class: 'lu-wide', onchange: e => { M.eq.picks[x.key] = e.target.value; render(); } },
      h('option', { value: '' }, 'Choose one…'), x.raw.choose.map(kind => h('optgroup', { label: kind }, CR.toolKinds[kind].map(t => h('option', { value: t, selected: M.eq.picks[x.key] === t }, t)))))));
  const items = chosenItems(), ac = armorClass(items, fin), weapons = weaponsIn(items);
  const tier = [...CR.higherLevels].reverse().find(t => M.level >= t.from), room = SHEETS[M.sheet].attackLines;
  return [h('p', { class: 'lu-lead' }, 'Starting equipment: your class and your background each offer a package or gold to buy your own.'),
    c ? [h('h4', { class: 'mk-h' }, `From your class (${c.name})`), h('div', { class: 'lu-cards' }, c.startingEquipment.map((o, i) => option(o, i, 'c', M.eq.cls === i, () => { M.eq.cls = i; }))),
      choices(c.startingEquipment[M.eq.cls], 'c')] : h('p', { class: 'lu-note' }, 'Choose a class first.'),
    b ? [h('h4', { class: 'mk-h' }, `From your background (${b.name})`), h('div', { class: 'lu-cards' }, b.equipment.map((o, i) => option(o, i, 'b', M.eq.bg === i, () => { M.eq.bg = i; }))),
      choices(b.equipment[M.eq.bg], 'b')] : h('p', { class: 'lu-note' }, 'Choose a background first.'),
    tier ? h('div', { class: 'lu-pick' }, pickHead(`Starting at level ${M.level}`),
      h('p', { class: 'lu-note' }, `Your DM may give more: ${tier.gp ? `${tier.gp.toLocaleString()} GP + ${tier.dice} × ${tier.per} GP` : 'no extra money'}, and magic items (${tier.items}).`),
      tier.gp ? h('div', { class: 'chips' }, chip(M.extraGold ? `+${M.extraGold.toLocaleString()} GP (click to drop it)` : 'Add the extra money', !!M.extraGold,
        set(() => { M.extraGold = M.extraGold ? null : tier.gp + rnd(10) * tier.per; })),
      M.extraGold ? chip('↻ Roll it again', false, set(() => { M.extraGold = tier.gp + rnd(10) * tier.per; })) : null) : null) : null,
    h('div', { class: 'nums' },
      h('div', { class: 'num' }, h('small', {}, 'Armor Class'), h('b', {}, ac.ac), h('span', {}, ac.how)),
      h('div', { class: 'num' }, h('small', {}, 'Gold'), h('b', {}, `${gold().toLocaleString()} GP`)),
      h('div', { class: 'num' }, h('small', {}, 'Attack lines'), h('b', { class: 'mk-small' }, weapons.slice(0, room).map(w => w.name).join(', ') || '—'),
        weapons.length > room ? h('span', {}, `the sheet has ${room} lines; ${weapons.slice(room).map(w => w.name).join(', ')} only in Equipment`) : null))];
}

function detailsStep() {
  const d = M.d, classic = M.sheet === 'classic', input = (key, label, ph, type = 'text') => h('label', { class: 'mk-field' }, label,
    h('input', { type, value: d[key], placeholder: ph || '', 'data-keep': key, oninput: e => { d[key] = e.target.value; } }));
  const area = (key, label, ph) => h('label', { class: 'mk-field wide' }, label,
    h('textarea', { rows: 2, placeholder: ph || '', 'data-keep': key, oninput: e => { d[key] = e.target.value; } }, d[key]));
  const langs = CR.languages, used = d.langs.filter(Boolean);
  return [h('p', { class: 'lu-lead' }, 'Last details. Everything here can also be typed on the sheet later.'),
    h('div', { class: 'mk-grid' }, input('name', 'Character name', 'e.g. Arxen'), classic ? input('player', 'Player name') : null,
      h('label', { class: 'mk-field' }, 'Alignment', h('select', { onchange: e => { d.alignment = e.target.value; } },
        h('option', { value: '' }, '—'), CR.alignments.map(a => h('option', { value: a, selected: d.alignment === a }, a)))),
      input('xp', 'Experience points', String(D.rules.xpByLevel[M.level - 1]), 'number')),
    h('div', { class: 'lu-pick' }, pickHead(`Languages: Common and ${langs.count} more`),
      h('div', { class: 'mk-grid' }, d.langs.map((v, i) => h('select', { onchange: e => { d.langs[i] = e.target.value; render(); } },
        h('option', { value: '' }, 'Choose a language…'),
        h('optgroup', { label: 'Standard' }, langs.standard.map(l => h('option', { value: l, selected: v === l, disabled: v !== l && used.includes(l) }, l))),
        h('optgroup', { label: 'Rare (if your DM allows)' }, langs.rare.map(l => h('option', { value: l, selected: v === l, disabled: v !== l && used.includes(l) }, l))))))),
    h('div', { class: 'lu-pick' }, pickHead('Appearance'),
      h('div', { class: 'mk-grid six' }, input('age', 'Age'), input('height', 'Height'), input('weight', 'Weight'), input('eyes', 'Eyes'), input('skin', 'Skin'), input('hair', 'Hair'))),
    h('div', { class: 'lu-pick' }, pickHead('Personality'),
      h('div', { class: 'mk-grid' }, area('personality', 'Personality traits'), area('ideals', 'Ideals'), area('bonds', 'Bonds'), area('flaws', 'Flaws')),
      area('backstory', 'Backstory'))];
}

// Everything that will be written, and what is still missing
function problems() {
  const out = [], sp = species();
  if (!M.cls) out.push('Choose a class.');
  if (!M.bg) out.push('Choose a background.');
  if (!M.species) out.push('Choose a species.');
  if (bg()?.toolChoice && !M.bgTool) out.push(`Choose your ${bg().toolChoice.from[0]} (Background).`);
  if (sp?.subspecies?.length && !M.lineage) out.push(`Choose a ${(lineageFeature()?.name || 'lineage').toLowerCase()} (Species).`);
  if (sp && /or/.test(sp.size || '') && !M.size) out.push('Choose a size (Species).');
  if (ABS.some(ab => finalScores()[ab] == null)) out.push('Place all six ability scores (Abilities).');
  if (M.method === 'buy' && sum(ABS.map(ab => CR.pointBuy.cost[M.buy[ab]])) > CR.pointBuy.budget) out.push('Point buy: more than 27 points spent (Abilities).');
  if (bg() && M.bonus.mode === 2 && (!M.bonus.plus2 || !M.bonus.plus1)) out.push('Choose the +2 and +1 of your background (Abilities).');
  for (const x of chosenItems()) if (typeof x.raw === 'object' && x.raw.choose && !M.eq.picks[x.key]) out.push(`Choose the ${x.raw.choose.join(' or ')} (Equipment).`);
  return out;
}
const warnings = () => [!text(M.d.name) ? 'No character name yet (Details).' : null,
  M.d.langs.filter(Boolean).length < CR.languages.count ? 'Fewer than two languages besides Common (Details).' : null].filter(Boolean);

function reviewStep() {
  const fin = finalScores(), items = chosenItems(), sp = species(), ac = armorClass(items, fin), b = bg();
  const row = (label, value) => h('li', {}, h('b', {}, label), h('span', {}, value));
  const bad = problems(), warn = warnings();
  return [h('p', { class: 'lu-lead' }, bad.length ? 'A few things are still missing:' : `Ready. "Create sheet" fills in the ${SHEETS[M.sheet].name.toLowerCase()}; then the Level 1 window picks your class skills, features, Origin feat details, spells and Hit Points.`),
    bad.length ? h('ul', { class: 'mk-bad' }, bad.map(t => h('li', {}, t))) : null,
    warn.length ? h('ul', { class: 'mk-warn' }, warn.map(t => h('li', {}, t))) : null,
    h('ul', { class: 'mk-review' },
      row('Sheet', SHEETS[M.sheet].name),
      row('Class', M.cls ? `${cls().name}, starting at level ${M.level}` : '—'),
      row('Background', b ? `${b.name}${M.bgTool ? ` (${M.bgTool})` : ''}: ${b.proficiencies.map(p => p.replace(/^\w+: /, '')).join(', ')}; ${b.feat}` : '—'),
      row('Species', sp ? `${sp.name}${M.lineage ? ` (${M.lineage})` : ''}${M.size ? `, ${M.size}` : ''}` : '—'),
      row('Abilities', ABS.map(ab => `${ab} ${fin[ab] ?? '—'}`).join(' · ')),
      row('Armor Class', `${ac.ac} (${ac.how})`),
      row('Equipment', `${items.map(x => x.text).join(', ') || 'gold only'}; ${gold().toLocaleString()} GP`),
      row('Languages', ['Common', ...M.d.langs.filter(Boolean)].join(', ')),
      row('Name', text(M.d.name) || '—'))];
}

// ---- Writing the sheet ---------------------------------------------------------------------------------
function write() {
  const F = S.field, fin = finalScores(), items = chosenItems(), sp = species(), b = bg(), d = M.d, classic = M.sheet === 'classic';
  const pairs = [], put = (key, v) => { if (F(key) && text(v)) pairs.push([F(key), String(v)]); };
  // Scores: the classic sheet shows the modifier in the big box (named STR) and the score in the oval (STRmod)
  for (const ab of ABS) {
    const k = ab.toLowerCase(), sc = fin[ab];
    if (classic) pairs.push([F(k), fmt(modOf(sc))], [F(k + 'Mod'), String(sc)]);
    else pairs.push([F(k), String(sc)], [F(k + 'Mod'), fmt(modOf(sc))]);
  }
  const name = text(d.name);
  put('name', name); put('name2', name); put('playerName', d.player);
  put('background', b.name); put('race', `${sp.name}${M.lineage ? ` (${M.lineage})` : ''}`); put('alignment', d.alignment);
  put('xp', text(d.xp) || String(D.rules.xpByLevel[M.level - 1]));
  const speed = (sp.speed || 30) + ((sp.subspecies || []).find(x => short(x.name) === M.lineage)?.traits.some(t => /Speed Increase/i.test(t.name)) ? 5 : 0);
  put('speed', `${speed} ft`); put('size', M.size || sp.size || '');
  put('ac', armorClass(items, fin).ac);
  put('equipment', items.map(x => withPack(x.text)).join('\n'));
  put('gp', gold() || '');
  // Languages and the background's tool: the official sheet has boxes for them, the classic one a Proficiencies box
  const langs = ['Common', ...d.langs.filter(Boolean)], tool = b.proficiencies.find(p => p.startsWith('Tool: '))?.slice(6) || M.bgTool;
  if (F('languages')) { put('languages', langs.join(', ')); put('toolProficiencies', tool ? `${tool} (${b.name})` : ''); }
  else put('proficiencies', [`Languages: ${langs.join(', ')}`, tool ? `Tools: ${tool} (${b.name})` : ''].filter(Boolean).join('\n'));
  // Details: the classic sheet has a box for each; the official one an Appearance box and a Backstory & Personality box
  const look = [['Age', d.age], ['Height', d.height], ['Weight', d.weight], ['Eyes', d.eyes], ['Skin', d.skin], ['Hair', d.hair]].filter(([, v]) => text(v));
  const mind = [['Personality', d.personality], ['Ideals', d.ideals], ['Bonds', d.bonds], ['Flaws', d.flaws]].filter(([, v]) => text(v));
  if (classic) {
    for (const k of ['age', 'height', 'weight', 'eyes', 'skin', 'hair', 'personality', 'ideals', 'bonds', 'flaws', 'backstory']) put(k, d[k]);
  } else {
    put('appearance', look.map(([k, v]) => `${k}: ${text(v)}`).join('\n'));
    put('backstory', [...mind.map(([k, v]) => `${k}: ${text(v)}`), text(d.backstory)].filter(Boolean).join('\n\n'));
  }
  S.setMany(pairs); // one refresh: the modifiers, saves, skills, initiative and passive Perception follow
  // The background's skills: tick their boxes (the boxes then gain the Proficiency Bonus)
  const ticks = [];
  for (const p of b.proficiencies.filter(p => p.startsWith('Skill: '))) { const box = S.profBox('skill:' + p.slice(7)); if (box) ticks.push([box, true]); }
  if (ticks.length) S.setMany(ticks);
  // Boxes still empty (a +0 doesn't change anything on a blank sheet): saves, skills, Initiative, Passive Perception
  const empty = key => F(key) && !text(S.get(F(key))), fill = [];
  for (const s of C.saves) if (empty('save:' + s.ability)) fill.push([F('save:' + s.ability), fmt(s.mod)]);
  for (const s of C.skills) if (empty('skill:' + s.name)) fill.push([F('skill:' + s.name), fmt(s.mod)]);
  if (empty('initiative')) fill.push([F('initiative'), fmt(C.initiativeMod)]);
  if (empty('passivePerception')) fill.push([F('passivePerception'), String(10 + (C.skills.find(s => s.name === 'Perception')?.mod ?? 0))]);
  if (fill.length) S.setMany(fill);
  // Attack lines for the weapons
  const rows = S.weaponRows(), w = weaponsIn(items).slice(0, rows.length), lines = [];
  w.forEach((wp, i) => {
    const a = window.calc.weaponAttack(wp);
    lines.push([rows[i].name, wp.name], [rows[i].bonus, a.bonusText], [rows[i].damage, a.text]);
  });
  if (lines.length) S.setMany(lines);
}

async function create() {
  if (problems().length) { M.step = STEPS.length - 1; return render(); }
  const btn = win.querySelector('.mk-create');
  btn.disabled = true; btn.textContent = 'Creating…';
  const bytes = await blankBytes(M.sheet), name = text(M.d.name).replace(/[\\/:*?"<>|]+/g, '') || 'New character';
  const opts = { key: M.cls, target: M.level, picks: {} }, lf = lineageFeature();
  if (lf) opts.picks['sp:' + lf.name] = { name: M.lineage, ability: lf.choice.ability ? M.spellAbility || defaultSpellAbility(lf) : null };
  const prof = chosenItems().find(x => typeof x.raw === 'object' && x.raw.proficiency);
  if (prof && M.eq.picks[prof.key]) opts.picks['mc:tools'] = [M.eq.picks[prof.key]];
  const state = M;
  close();
  M = state; // kept while the sheet opens (write reads it)
  await window.openPdf(new File([bytes], name + '.pdf', { type: 'application/pdf' }));
  S.transaction('New character', write);
  M = null;
  window.levelUp.start(opts);
}

// ---- The window -------------------------------------------------------------------------------------
const STEPS = [
  { id: 'sheet', name: 'Sheet', view: sheetStep },
  { id: 'class', name: 'Class', view: classStep },
  { id: 'background', name: 'Background', view: backgroundStep },
  { id: 'species', name: 'Species', view: speciesStep },
  { id: 'abilities', name: 'Abilities', view: abilitiesStep },
  { id: 'equipment', name: 'Equipment', view: equipmentStep },
  { id: 'details', name: 'Details', view: detailsStep },
  { id: 'review', name: 'Review', view: reviewStep }
];

function render() {
  if (!M || !win) return;
  const i = M.step, body = win.querySelector('.lu-body'), keep = M.shown === i ? body.scrollTop : 0;
  const a = document.activeElement, keepKey = a && body.contains(a) ? a.dataset.keep : null, pos = keepKey && a.selectionStart;
  win.querySelector('.lu-sub').textContent = [M.cls && cls().name, M.species, M.bg].filter(Boolean).join(' · ') || 'A new character, step by step';
  win.querySelector('.lu-steps').replaceChildren(...STEPS.map((s, n) => h('button', { class: n === i ? 'on' : n < i ? 'done' : '', onclick: () => { M.step = n; render(); } },
    h('i', {}, n + 1), s.name)));
  body.replaceChildren(...[STEPS[i].view()].flat(Infinity).filter(Boolean));
  body.scrollTop = keep;
  M.shown = i;
  if (keepKey) { const n = body.querySelector(`[data-keep="${keepKey}"]`); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch { /* not text */ } } }
  const last = i === STEPS.length - 1, go = d => { M.step = i + d; render(); };
  win.querySelector('.lu-foot').replaceChildren(...[h('button', { class: 'btn', onclick: cancel }, 'Cancel'), h('span', { class: 'grow' }),
    i > 0 ? h('button', { class: 'btn', onclick: () => go(-1) }, '← Back') : null,
    last ? h('button', { class: 'btn primary mk-create', disabled: problems().length > 0, onclick: create }, 'Create sheet')
      : h('button', { class: 'btn primary mk-next', onclick: () => go(1) }, 'Next →')].filter(Boolean));
  if (STEPS[i].id === 'sheet') for (const key in SHEETS) if (!thumbs[key]) thumb(key).then(() => { if (M?.step === 0) render(); }).catch(err => console.warn(err));
}

function open() {
  if (win) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); return; }
  M = fresh();
  autoAssign(CR.standardArray);
  win = h('section', { id: 'maker', class: 'lu', role: 'dialog', 'aria-label': 'New character' },
    h('div', { class: 'lu-bar', title: 'Drag to move' },
      h('span', { class: 'lu-icon mk-icon', 'aria-hidden': 'true' }, '✦'), h('div', { class: 'lu-title' }, h('b', {}, 'New character'), h('span', { class: 'lu-sub' })),
      h('button', { class: 'lu-x', title: 'Close', 'aria-label': 'Close', onclick: cancel }, '✕')),
    h('nav', { class: 'lu-steps' }), h('div', { class: 'lu-body' }), h('div', { class: 'lu-foot' }));
  document.body.append(win);
  const w = Math.min(600, innerWidth - 24);
  window.draggable(win, win.querySelector('.lu-bar'))((innerWidth - w) / 2, 60);
  render();
}
function close() { win?.remove(); win = null; M = null; }
async function cancel() {
  if (!M || M.step === 0 && !M.cls) return close();
  const yes = await window.ask({ title: 'Stop making this character?', text: 'Your choices are thrown away.',
    buttons: [{ label: 'Keep going', value: false }, { label: 'Throw away', value: true, primary: true }] });
  if (yes) close();
}

$('newSheet')?.addEventListener('click', open);
// another PDF opened meanwhile: this window has nothing left to do
document.addEventListener('sheet-loaded', () => { if (win) close(); });
window.maker = { open, get state() { return M; } };
})();
