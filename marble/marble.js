/* Killing Marble mode ("Becoming Marble" rules): an extra page after the sheet where each body part slowly turns to
   marble (0-10, the torso 0-20). The debuffs from the rules go to the effects tray and into rolls (effects.js), and the
   page is added to the downloaded PDF. Scores are saved in window.sheetState.marble. */
(() => {
'use strict';
const $ = id => document.getElementById(id);
const IMG = window.MARBLE_BODY;
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElementNS(tag === 'svg' || tag === 'line' ? 'http://www.w3.org/2000/svg' : 'http://www.w3.org/1999/xhtml', tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.setAttribute('class', v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return e;
};

// Body parts. at = the point on the outline, as fractions of the image. Sides are named as you see them (Left arm is on
// your left), which reads easier than the figure's own left. adj = parts the marble spreads to.
const PARTS = {
  head: { name: 'Head', max: 10, at: [.496, .1], adj: ['torso'] },
  torso: { name: 'Torso', max: 20, at: [.497, .3], adj: ['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'tail'] },
  leftArm: { name: 'Left arm', max: 10, at: [.371, .353], adj: ['torso'], lose: true },
  rightArm: { name: 'Right arm', max: 10, at: [.62, .353], adj: ['torso'], lose: true },
  leftLeg: { name: 'Left leg', short: 'Left', max: 10, at: [.434, .712], adj: ['torso'], lose: true },
  rightLeg: { name: 'Right leg', short: 'Right', max: 10, at: [.561, .712], adj: ['torso'], lose: true },
  tail: { name: 'Tail', max: 10, at: [.784, .668], adj: ['torso'], lose: true }
};
const ARM = [[2, '−1 to hit and damage with this arm'], [5, '−2 to hit and damage with this arm'], [7, '−3 to hit and damage, −1 to DEX rolls'], [10, 'Unusable']];
// The boxes on the page, at fractions of the page; rules = [score needed, what happens]
const CARDS = [
  { id: 'head', parts: ['head'], pos: [.03, .115], rules: [[5, 'Disadvantage on all rolls'], [10, 'Unconscious but stable']] },
  { id: 'leftArm', parts: ['leftArm'], pos: [.03, .33], rules: ARM },
  { id: 'legs', title: 'Legs', parts: ['leftLeg', 'rightLeg'], pos: [.03, .585], total: 20,
    rules: [[5, 'Speed −10 ft'], [10, 'Speed halved, −1 to DEX rolls'], [15, 'Speed halved and −10 ft, −1 to DEX rolls'], [20, 'Speed 0; DEX penalties become Disadvantage']] },
  { id: 'torso', parts: ['torso'], pos: [.75, .115], rules: [[8, '−1 to DEX rolls'], [16, '−2 to DEX rolls'], [20, 'Effectively dead - soul trapped']] },
  { id: 'rightArm', parts: ['rightArm'], pos: [.75, .33], rules: ARM },
  // Not in the rules doc: small house debuffs, a heavy stone tail throws off balance and drags
  { id: 'tail', parts: ['tail'], pos: [.75, .585], rules: [[3, '−1 to Acrobatics checks'], [6, 'Disadvantage on Stealth checks'], [10, 'Speed −5 ft (dead weight)']] }
];
const CARD_W = .22, IMG_BOX = { x: .18, y: .115, w: .64 }, SPREAD_AT = 6;
const dcOf = id => 6 + marble()[id]; // the CON save against a part's spread
const RULES_TEXT = [
  'A marbled part gains 1 about once an hour, and from prolonged contact with marble.',
  `At ${SPREAD_AT} or more it spreads: each adjacent part gains 1 unless you succeed on a CON save (DC 6 + that part's score).`,
  'A marbled part that is broken and then cleared of marble is lost (you feel it then).'
];

const S = () => window.sheetState;
const on = () => S().mode === 'marble';
const marble = () => {
  const m = S().marble ||= {};
  for (const id in PARTS) m[id] = Math.max(0, Math.min(PARTS[id].max, +m[id] || 0));
  m.lost ||= {};
  return m;
};
const cardScore = card => card.parts.reduce((t, id) => t + marble()[id], 0);
const cardMax = card => card.total || PARTS[card.parts[0]].max;
const spreading = () => Object.keys(PARTS).filter(id => marble()[id] >= SPREAD_AT && !marble().lost[id]);
const spreadText = id => `${PARTS[id].name} (DC ${dcOf(id)}) → ${PARTS[id].adj.map(a => PARTS[a].name).join(', ')}`;

// ---- Debuffs from the rules ----------------------------------------------------------
function marbleEffects() {
  if (!on()) return [];
  const m = marble(), out = [], DEX = { on: ['check', 'save'], ability: 'DEX' };
  const fx = (name, detail, rules, card) => out.push({ name, detail, rules, source: 'marble', focus: () => focusCard(card) });
  for (const [id, arm] of [['leftArm', 'left'], ['rightArm', 'right']]) {
    const s = m[id], n = PARTS[id].name;
    if (m.lost[id]) fx(`${n} lost`, 'Broken and cleared of marble: it is gone.', [{ on: ['attack', 'damage'], arm, unusable: true }], id);
    else if (s >= 10) fx(`${n} 10/10`, 'Fully marble: unusable.', [{ on: ['attack', 'damage'], arm, unusable: true }, { ...DEX, mod: -1 }], id);
    else if (s >= 2) {
      const pen = s >= 7 ? -3 : s >= 5 ? -2 : -1;
      fx(`${n} ${s}/10`, `${pen} to hit and damage when you attack with it${s >= 7 ? ', −1 to DEX rolls' : ''}`.replace('-', '−'),
        [{ on: ['attack', 'damage'], arm, mod: pen }, ...(s >= 7 ? [{ ...DEX, mod: -1 }] : [])], id);
    }
  }
  if (m.head >= 5) fx(`Head ${m.head}/10`, m.head >= 10 ? 'Unconscious but stable. Disadvantage on all rolls.' : 'Disadvantage on all rolls.', [{ dis: true }], 'head');
  if (m.torso >= 20) fx('Torso 20/20', 'Effectively dead: unconscious, beyond healing.', [], 'torso');
  else if (m.torso >= 8) fx(`Torso ${m.torso}/20`, `${m.torso >= 16 ? '−2' : '−1'} to DEX rolls`, [{ ...DEX, mod: m.torso >= 16 ? -2 : -1 }], 'torso');
  const legs = m.rightLeg + m.leftLeg;
  if (legs >= 20) fx('Legs 20/20', 'Speed 0. DEX penalties stop counting; DEX rolls have Disadvantage instead.',
    [{ speed: { zero: true } }, { ...DEX, dis: true, nullifyDex: true }], 'legs');
  else if (legs >= 15) fx(`Legs ${legs}/20`, 'Speed halved and −10 ft, −1 to DEX rolls', [{ speed: { half: true, add: -10 } }, { ...DEX, mod: -1 }], 'legs');
  else if (legs >= 10) fx(`Legs ${legs}/20`, 'Speed halved, −1 to DEX rolls', [{ speed: { half: true } }, { ...DEX, mod: -1 }], 'legs');
  else if (legs >= 5) fx(`Legs ${legs}/20`, 'Speed −10 ft', [{ speed: { add: -10 } }], 'legs');
  for (const id of ['leftLeg', 'rightLeg']) if (m.lost[id]) fx(`${PARTS[id].name} lost`, 'Broken and cleared of marble: it is gone.', [], 'legs');
  if (m.lost.tail) fx('Tail lost', 'Broken and cleared of marble: it is gone.', [], 'tail');
  else if (m.tail >= 3) {
    const bits = ['−1 to Acrobatics checks', m.tail >= 6 && 'Disadvantage on Stealth checks', m.tail >= 10 && 'Speed −5 ft'].filter(Boolean);
    fx(`Tail ${m.tail}/10`, bits.join(', '), [{ on: ['check'], skill: 'Acrobatics', mod: -1 },
      ...(m.tail >= 6 ? [{ on: ['check'], skill: 'Stealth', dis: true }] : []), ...(m.tail >= 10 ? [{ speed: { add: -5 } }] : [])], 'tail');
  }
  for (const id of spreading()) {
    const to = targets(id).map(a => PARTS[a].name);
    fx(`${PARTS[id].name} is spreading`, to.length ? `${to.join(', ')} gain 1 unless you succeed on a DC ${dcOf(id)} CON save.`
      : `Every part next to it has marble already: nowhere left to spread (DC ${dcOf(id)}).`, [], cardOf(id).id);
  }
  return out;
}
const cardOf = id => CARDS.find(c => c.parts.includes(id));

// ---- Spreading: one CON save against each spreading part's DC -------------------------------
// part -> { total, dc, failed, applied: [names] | null }. Kept until the next CON save; not saved in the PDF.
let verdicts = {};

document.addEventListener('test-rolled', ({ detail: r }) => {
  if (!on() || r.kind !== 'Save' || r.ability !== 'CON' || r.purpose === 'concentration') return;
  verdicts = {};
  for (const id of spreading()) verdicts[id] = { total: r.total, dc: dcOf(id), failed: r.autoFail || r.total < dcOf(id), applied: null };
  update();
});

// Where a part can spread: neighbours that are still there and have no marble yet (user's rule)
const targets = id => PARTS[id].adj.filter(a => !marble().lost[a] && !marble()[a]);

// A failed save: every neighbour without marble gains 1
function applySpread(id) {
  const m = marble(), v = verdicts[id];
  if (!v?.failed || v.applied || !targets(id).length) return;
  v.applied = targets(id).map(a => { m[a]++; return PARTS[a].name; });
  changed();
}

// ---- An hour passes: every marbled part (not lost, not full) gains 1 ----------------------------------------
// Shown first with what each part reaches; then, if a part is spreading and has an unmarbled neighbour, the CON save
// against the spread can be rolled right away (its verdicts and "Apply?" work as for any CON save). One step for Undo.
async function hourPasses() {
  const m = marble(), grow = Object.keys(PARTS).filter(id => m[id] > 0 && m[id] < PARTS[id].max && !m.lost[id]);
  const after = id => m[id] + (grow.includes(id) ? 1 : 0);
  const spreadAfter = Object.keys(PARTS).filter(id => !m.lost[id] && after(id) >= SPREAD_AT && targets(id).length);
  if (!grow.length) {
    return window.ask({ title: 'An hour passes', text: 'No part has marble that can grow (parts at 0, full or lost stay as they are), so nothing changes.' });
  }
  // the rules a card reaches this hour, e.g. "Right arm 5: −2 to hit and damage with this arm"
  const reached = CARDS.flatMap(card => {
    const was = cardScore(card), now = card.parts.reduce((t, id) => t + after(id), 0);
    return card.rules.filter(([at]) => at > was && at <= now).map(([at, text]) => `${card.title || PARTS[card.parts[0]].name} ${at}: ${text}`);
  });
  const body = h('div', { class: 'ask-body mp-hour' },
    h('ul', {}, grow.map(id => h('li', {}, h('b', {}, PARTS[id].name), ` ${m[id]} → ${m[id] + 1}`, h('small', {}, ` / ${PARTS[id].max}`)))),
    reached.length ? h('p', { class: 'mp-reach' }, 'Now: ' + reached.join('; ') + '.') : null,
    h('p', {}, spreadAfter.length ? `Then spreading: ${spreadAfter.map(id => `${PARTS[id].name} (DC ${6 + after(id)})`).join(', ')}. ` +
      'A CON save keeps it from spreading to the parts next to it that have no marble yet.' : 'Nothing is spreading into an unmarbled part, so no CON save is needed.'));
  const a = await window.ask({ title: 'An hour passes', text: 'Every part that has marble gains 1:', body,
    buttons: [{ label: 'Cancel', value: null }, { label: 'Apply', value: 'apply', primary: !spreadAfter.length },
      spreadAfter.length ? { label: 'Apply and roll CON save', value: 'roll', primary: true } : null].filter(Boolean) });
  if (!a) return;
  window.sheet.transaction('An hour passes (Killing Marble)', () => { for (const id of grow) setScore(id, m[id] + 1); });
  if (a === 'roll') window.roller?.save('CON', 'Marble spread: CON save');
}

// Spells can clear it all; lost parts stay lost
function clearAll() {
  for (const id in PARTS) marble()[id] = 0;
  verdicts = {};
  changed();
}

// ---- The page on screen -----------------------------------------------------------------
let page = null;

function layout(W, H) {
  const iw = IMG_BOX.w * W, ih = iw * IMG.height / IMG.width;
  const point = id => [IMG_BOX.x * W + PARTS[id].at[0] * iw, IMG_BOX.y * H + PARTS[id].at[1] * ih];
  return { iw, ih, point };
}

function buildPage() {
  page?.remove();
  page = null;
  const first = document.querySelector('#pages .page');
  if (!on() || !first) return;
  const W = parseFloat(first.style.width), H = parseFloat(first.style.height), L = layout(W, H);
  const stop = e => e.stopPropagation(); // these inputs aren't PDF fields: keep them away from the sheet's listeners
  page = h('div', { class: 'page marble-page', style: `width:${W}px;height:${H}px`, oninput: stop, onchange: stop },
    h('div', { class: 'mp-title' }, h('h2', {}, 'Becoming Marble'), h('p', {}, 'your personal marble tracker :)')),
    h('img', { class: 'mp-body', src: IMG.src, alt: 'Body outline', style: `left:${IMG_BOX.x * 100}%;top:${IMG_BOX.y * 100}%;width:${IMG_BOX.w * 100}%` }),
    h('svg', { class: 'mp-lines', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' }),
    Object.keys(PARTS).map(id => {
      const [x, y] = L.point(id);
      return h('span', { class: 'mp-dot', 'data-part': id, style: `left:${x}px;top:${y}px` });
    }),
    CARDS.map(card => cardView(card)),
    h('div', { class: 'mp-rules' }, h('b', {}, 'Spreading & breaking'), RULES_TEXT.map(t => h('p', {}, t)),
      h('p', { class: 'mp-spreading' }),
      h('div', { class: 'mp-actions' },
        h('button', { class: 'mp-hour', title: 'Every marbled part gains 1, then a CON save if it spreads. You see it before it happens.', onclick: hourPasses }, 'An hour passes'),
        h('button', { class: 'mp-save', onclick: () => window.roller?.save('CON', 'Marble spread: CON save') }, 'Roll CON save'),
        h('button', { class: 'mp-clear', onclick: confirmClear }, 'Clear all marble'))),
    h('div', { class: 'mp-stamp', 'aria-hidden': 'true' }, 'Story finished'));
  $('pages').appendChild(page);
  drawLines(W, H, L);
  update();
}

function cardView(card) {
  const title = card.title || PARTS[card.parts[0]].name;
  return h('section', { class: 'mp-card', id: 'mp-' + card.id, style: `left:${card.pos[0] * 100}%;top:${card.pos[1] * 100}%;width:${CARD_W * 100}%` },
    h('div', { class: 'mp-label' }, h('span', {}, title), h('em', { class: 'mp-spread' }, 'spreading'),
      card.parts.length === 1 && PARTS[card.parts[0]].lose ? loseBox(card.parts[0]) : null),
    card.parts.map(id => h('div', { class: 'mp-row' },
      card.parts.length > 1 ? h('span', { class: 'mp-side' }, PARTS[id].short) : null,
      h('button', { class: 'mp-step', 'aria-label': `Less marble on ${PARTS[id].name}`, onclick: () => setScore(id, marble()[id] - 1) }, '−'),
      h('input', { class: 'mp-input', type: 'number', min: 0, max: PARTS[id].max, 'data-part': id, 'aria-label': `${PARTS[id].name} marble score`,
        value: marble()[id], oninput: e => setScore(id, e.target.value, true) }),
      h('span', { class: 'mp-max' }, '/ ' + PARTS[id].max),
      h('button', { class: 'mp-step', 'aria-label': `More marble on ${PARTS[id].name}`, onclick: () => setScore(id, marble()[id] + 1) }, '+'),
    )),
    card.parts.length > 1 ? h('div', { class: 'mp-lostrow' }, card.parts.map(id => loseBox(id, PARTS[id].short.toLowerCase() + ' lost'))) : null,
    h('div', { class: 'mp-bar' }, h('i', {})),
    card.total ? h('div', { class: 'mp-total' }) : null,
    h('ul', { class: 'mp-checks' }, card.rules.map(([at, text]) =>
      h('li', { 'data-at': at }, h('span', { class: 'mp-box', 'aria-hidden': 'true' }), h('b', {}, at === cardMax(card) ? `${at}` : `${at}+`), ' ', text))),
    h('div', { class: 'mp-verdicts', 'aria-live': 'polite' }));
}

// Asks once more before wiping every score
function confirmClear(e) {
  const b = e.currentTarget, reset = () => { clearTimeout(b.timer); b.classList.remove('sure'); b.textContent = 'Clear all marble'; };
  if (b.classList.contains('sure')) { reset(); clearAll(); return; }
  b.classList.add('sure');
  b.textContent = 'Sure? Click again';
  b.timer = setTimeout(reset, 3000);
}

// One short line per spreading part (the legs card names which leg)
function verdictView(id) {
  const v = verdicts[id], who = PARTS[id].short ? PARTS[id].short + ': ' : '', adj = PARTS[id].adj;
  if (!v) return null;
  const roll = `${v.total} vs DC ${v.dc}`, tip = `CON save ${roll}`;
  if (!v.failed) return h('div', { class: 'mp-verdict ok', title: tip }, h('span', {}, `${who}Resisted, ${roll}`));
  if (v.applied) {
    const what = v.applied.length > 2 && v.applied.length === adj.length ? 'every part +1' : v.applied.join(', ') + ' +1';
    return h('div', { class: 'mp-verdict done', title: tip }, h('span', {}, `${who}Spread: ${what}`));
  }
  const to = targets(id);
  if (!to.length) return h('div', { class: 'mp-verdict done', title: tip }, h('span', {}, `${who}Failed, ${roll}: nowhere unmarbled to spread to`));
  return h('div', { class: 'mp-verdict fail', title: tip }, h('span', {}, `${who}Failed, ${roll}`),
    h('button', { class: 'mp-apply', title: `${to.map(a => PARTS[a].name).join(', ')} +1`, onclick: () => applySpread(id) }, 'Apply?'));
}

function loseBox(id, label = 'lost') {
  return h('label', { class: 'mp-lost', title: 'Broken and cleared of marble: the part is gone' },
    h('input', { type: 'checkbox', 'data-lost': id, onchange: e => { marble().lost[id] = e.target.checked; changed(); } }), label);
}

// Leader lines from each box to its part(s)
function drawLines(W, H, L) {
  const svg = page.querySelector('.mp-lines');
  for (const card of CARDS) {
    const left = card.pos[0] < .5, x = (left ? card.pos[0] + CARD_W : card.pos[0]) * W, y = card.pos[1] * H + 14;
    for (const id of card.parts) {
      const [px, py] = L.point(id);
      svg.append(h('line', { x1: x, y1: y, x2: px, y2: py, 'data-part': id }));
    }
  }
}

function setScore(id, value, typing) {
  const n = Math.max(0, Math.min(PARTS[id].max, Math.round(+value || 0))), was = marble()[id];
  marble()[id] = n;
  // while typing, leave the box alone unless the number had to be corrected (e.g. 14 on a 10-point part)
  const el = page?.querySelector(`.mp-input[data-part="${id}"]`);
  if (el && !(typing && (value === '' || String(n) === String(value)))) el.value = n;
  changed();
  if (id === 'head' && n >= PARTS.head.max && was < PARTS.head.max) window.effects?.askEnd('Head turned to marble', 'At head 10 you are Unconscious.');
}

function changed() {
  update();
  window.effects?.changed();
}

// Show the scores: bars, ticked rules, spreading, dots and lines
function update() {
  if (!page) return;
  const m = marble(), spread = spreading();
  for (const card of CARDS) {
    const el = page.querySelector('#mp-' + card.id), score = cardScore(card), max = cardMax(card);
    el.querySelector('.mp-bar i').style.width = (score / max * 100) + '%';
    el.classList.toggle('active', score > 0);
    const dcs = card.parts.filter(id => spread.includes(id)).map(dcOf);
    el.classList.toggle('spreading', dcs.length > 0);
    el.querySelector('.mp-spread').textContent = 'spreading · DC ' + Math.max(0, ...dcs);
    for (const id of card.parts) if (verdicts[id] && !verdicts[id].applied && !spread.includes(id)) delete verdicts[id]; // cleared meanwhile
    el.querySelector('.mp-verdicts').replaceChildren(...card.parts.map(verdictView).filter(Boolean));
    if (card.total) el.querySelector('.mp-total').textContent = `Total ${score} / ${max}`;
    for (const li of el.querySelectorAll('li')) li.classList.toggle('hit', score >= +li.dataset.at);
  }
  for (const id in PARTS) {
    const input = page.querySelector(`.mp-input[data-part="${id}"]`);
    if (document.activeElement !== input) input.value = m[id];
    const lost = page.querySelector(`[data-lost="${id}"]`);
    if (lost) lost.checked = !!m.lost[id];
    const level = m[id] / PARTS[id].max;
    for (const el of page.querySelectorAll(`[data-part="${id}"]:not(input)`)) {
      el.style.setProperty('--m', level);
      el.classList.toggle('on', m[id] > 0);
      el.classList.toggle('lost', !!m.lost[id]);
    }
  }
  page.querySelector('.mp-spreading').textContent = spread.length
    ? 'Spreading now: ' + spread.map(spreadText).join('; ') : '';
  page.classList.toggle('finished', m.torso >= 20);
}

function focusCard(id) {
  const el = document.getElementById('mp-' + id);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash');
  void el.offsetWidth;
  el.classList.add('flash');
}

// ---- Mode switch -------------------------------------------------------------------
function setMode(mode) {
  S().mode = mode;
  syncSwitch();
  buildPage();
  window.effects?.changed();
  if (mode === 'marble') page?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function syncSwitch() {
  for (const b of $('modeSwitch').querySelectorAll('button')) {
    const active = (S().mode || 'default') === b.dataset.mode;
    b.classList.toggle('on', active);
    b.setAttribute('aria-checked', String(active));
  }
}
for (const b of $('modeSwitch').querySelectorAll('button')) b.addEventListener('click', () => setMode(b.dataset.mode));
document.addEventListener('sheet-loaded', () => {
  for (const b of $('modeSwitch').querySelectorAll('button')) b.disabled = false;
  syncSwitch();
  buildPage();
});
document.addEventListener('sheet-state-change', () => { syncSwitch(); buildPage(); }); // Undo / Redo put sheetState back

// ---- The page in the downloaded PDF --------------------------------------------------
const pdfText = s => String(s).replace(/−/g, '-').replace(/→/g, '->').replace(/[^\x20-\x7E\xA0-\xFF]/g, '');
const bytesOf = dataUrl => Uint8Array.from(atob(dataUrl.split(',')[1]), c => c.charCodeAt(0));

window.pdfHooks.push(async (doc, { StandardFonts, rgb }) => {
  if (!on()) return 0;
  const { width: W, height: H } = doc.getPage(0).getSize();
  const pg = doc.addPage([W, H]), m = marble();
  const font = await doc.embedFont(StandardFonts.Helvetica), bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const italic = await doc.embedFont(StandardFonts.HelveticaOblique), img = await doc.embedJpg(bytesOf(IMG.src));
  const ink = rgb(.1, .1, .1), grey = rgb(.45, .45, .45), red = rgb(.62, .14, .1);
  const top = fy => H - fy * H; // PDF y runs upwards
  const text = (t, x, y, size, f = font, color = ink) => pg.drawText(pdfText(t), { x, y, size, font: f, color });
  // Wrapped text, one line under the other; returns how far down it went
  const para = (t, x, y, size, f, color, maxWidth) => {
    const lines = [];
    for (const word of pdfText(t).split(' ')) {
      const line = lines.length ? lines[lines.length - 1] + ' ' + word : word;
      if (lines.length && f.widthOfTextAtSize(line, size) <= maxWidth) lines[lines.length - 1] = line;
      else lines.push(word);
    }
    lines.forEach((l, i) => text(l, x, y - i * size * 1.2, size, f, color));
    return (lines.length - 1) * size * 1.2;
  };
  const iw = IMG_BOX.w * W, ih = iw * IMG.height / IMG.width, ix = IMG_BOX.x * W, iy = top(IMG_BOX.y);
  const point = id => [ix + PARTS[id].at[0] * iw, iy - PARTS[id].at[1] * ih];
  text('BECOMING MARBLE', .03 * W, top(.05), 20, bold);
  text('your personal marble tracker :)', .03 * W, top(.075), 10, italic, grey);
  pg.drawImage(img, { x: ix, y: iy - ih, width: iw, height: ih });
  for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { // cover the scan's crop marks in the corners
    pg.drawRectangle({ x: ix + cx * iw * .97, y: iy - ih + cy * ih * .97, width: iw * .03, height: ih * .03, color: rgb(1, 1, 1) });
  }
  for (const card of CARDS) {
    const x = card.pos[0] * W, y0 = top(card.pos[1]), w = CARD_W * W, score = cardScore(card), max = cardMax(card);
    let y = y0 - 14;
    text((card.title || PARTS[card.parts[0]].name).toUpperCase(), x + 6, y, 9, bold);
    const dcs = card.parts.filter(id => spreading().includes(id)).map(dcOf);
    if (dcs.length) text(`SPREADING DC ${Math.max(...dcs)}`, x + w - 76, y, 7, bold, red);
    for (const id of card.parts) {
      y -= 18;
      text(`${card.parts.length > 1 ? PARTS[id].short + ': ' : ''}${m[id]} / ${PARTS[id].max}${m.lost[id] ? '  (lost)' : ''}`, x + 6, y, 13, bold);
    }
    if (card.total) { y -= 13; text(`Total ${score} / ${max}`, x + 6, y, 8, font, grey); }
    y -= 8;
    pg.drawRectangle({ x: x + 6, y, width: w - 12, height: 4, color: rgb(.9, .9, .9) });
    if (score) pg.drawRectangle({ x: x + 6, y, width: (w - 12) * score / max, height: 4, color: rgb(.55, .55, .58) });
    for (const [at, t] of card.rules) {
      y -= 12;
      const hit = score >= at;
      pg.drawRectangle({ x: x + 6, y: y - 1, width: 7, height: 7, borderColor: ink, borderWidth: .7, color: hit ? ink : undefined });
      y -= para(`${at}${at === max ? '' : '+'}  ${t}`, x + 17, y, 7, hit ? bold : font, hit ? ink : grey, w - 24);
    }
    pg.drawRectangle({ x, y: y - 8, width: w, height: y0 - y + 8, borderColor: ink, borderWidth: 1 });
    const lx = card.pos[0] < .5 ? x + w : x;
    for (const id of card.parts) {
      const [px, py] = point(id);
      pg.drawLine({ start: { x: lx, y: y0 - 14 }, end: { x: px, y: py }, thickness: .6, color: m[id] ? red : grey });
      pg.drawCircle({ x: px, y: py, size: 3, color: m[id] ? red : grey });
    }
  }
  const ry = top(.8), rx = .03 * W + 8;
  text('SPREADING & BREAKING', rx, ry - 14, 9, bold);
  RULES_TEXT.forEach((t, i) => text(t, rx, ry - 30 - i * 13, 8.5));
  let ry2 = ry - 30 - RULES_TEXT.length * 13;
  const spread = spreading();
  if (spread.length) ry2 -= para('Spreading now: ' + spread.map(spreadText).join('; '),
    rx, ry2, 8.5, bold, red, .94 * W - 16);
  pg.drawRectangle({ x: .03 * W, y: ry2 - 10, width: .94 * W, height: ry - ry2 + 10, borderColor: ink, borderWidth: 1 });
  if (m.torso >= 20) text('STORY FINISHED', W / 2 - 110, H / 2, 32, bold, red);
  return 1;
});

window.effects.register(marbleEffects);
window.marble = { parts: PARTS, setScore: (id, v) => setScore(id, v), setMode, applySpread, clearAll, hourPasses };
})();
