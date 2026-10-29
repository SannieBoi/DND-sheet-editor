// Every subclass of every class (the free-rules ones are in sweep.test.js): pick it at its level, then level up through
// every level where it gains something (all levels for the subclasses that cast spells), filling every pick (the first
// options that can be taken), apply, and check that nothing throws and nothing written counts as beyond the rules.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const W = () => document.getElementById('lvlup');
const body = () => W().querySelector('.lu-body');
const btnIn = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const errors = [];
addEventListener('error', e => errors.push(e.message));
const realError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); realError(...a); };

// The next pick to make on the page: an unfilled list (skills, maneuvers, spells ...), else a set of option cards with
// nothing chosen (not "Another subclass" or "Other feat")
function nextPick() {
  for (const p of body().querySelectorAll('.lu-pick')) {
    const c = p.querySelector('.lu-count');
    if (!c || c.classList.contains('full')) continue;
    const b = [...p.querySelectorAll('button.lu-opt:not(.on), button.lu-spell:not(.on)')].find(x => !x.disabled);
    if (b) return b;
  }
  for (const cards of body().querySelectorAll('.lu-feat .lu-cards')) {
    if (cards.querySelector('.lu-card.on')) continue;
    const b = [...cards.querySelectorAll('.lu-card')].find(x => !x.disabled && !/^(Another subclass|Other feat)/.test(x.textContent.trim()));
    if (b) return b;
  }
  return null;
}
const fill = () => { for (let guard = 0; guard < 80; guard++) { const b = nextPick(); if (!b) return; b.click(); } };
const goTo = name => { const b = [...W().querySelectorAll('.lu-steps button')].find(x => x.textContent.endsWith(name)); if (b) { b.click(); return true; } return false; };

async function levelUp(label, sub) {
  const before = errors.length;
  document.getElementById('levelUp').click(); await wait(5);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(5);
  goTo('Features');
  if (sub) {
    const card = [...body().querySelectorAll('.lu-card')].find(b => b.querySelector('b').firstChild.textContent === sub);
    if (!card) { log(`FAIL ${label}: no card for ${sub}`); }
    else card.click();
  }
  fill();
  if (goTo('Spells')) fill();
  goTo('Review');
  W().querySelector('.lu-apply').click(); await wait(5);
  const applied = /applied/.test(body().textContent);
  if (applied) btnIn(W().querySelector('.lu-foot'), 'Close').click();
  else { W().querySelector('.lu-x').click(); await wait(5); const a = document.querySelector('.ask'); if (a) btnIn(a, 'Throw away').click(); }
  const good = errors.length === before && applied;
  if (!good) log(`FAIL ${label}: ${errors.slice(before).join(' | ') || 'not applied'}`);
  return good;
}

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 14) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  const box = (name, x, y) => { const f = form.createCheckBox(name); f.addToPage(page, { x, y: y + 2, width: 9, height: 9 }); };
  add('CharacterName', 20, 770, 120, 'Subsweep'); add('ClassLevel', 150, 770, 160, 'Fighter 2'); add('Race ', 320, 770, 80, 'Human');
  ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((ab, i) => { add(ab, 20, 740 - i * 18, 26, '16'); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 50, 740 - i * 18, 26, '+3'); });
  add('ProfBonus', 20, 620, 26, '+2'); add('HPMax', 50, 620, 26, '20'); add('HPCurrent', 80, 620, 26, '20'); add('Speed', 110, 620, 26, '30');
  DND.rules.skills.forEach((s, i) => { box('Check Box ' + (30 + i), 20, 590 - i * 15); add(s.name, 32, 590 - i * 15, 26, '+3'); });
  ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((ab, i) => { box('Check Box ' + (60 + i), 80, 590 - i * 15); add('ST ' + DND.rules.abilities[ab], 92, 590 - i * 15, 26, '+3'); });
  add('Features and Traits', 20, 20, 200, '', true, 280); add('ProficienciesLang', 230, 20, 150, '', true, 100);
  add('Wpn Name', 230, 140, 90, 'Longsword'); add('Wpn1 AtkBonus', 325, 140, 30, '+5'); add('Wpn1 Damage', 360, 140, 80, '1d8+3 slashing');
  let y = 770, n = 1014;
  for (let lvl = 0; lvl <= 9; lvl++) {
    if (lvl) { add('SlotsTotal ' + (18 + lvl), 410, y, 26); y -= 16; }
    for (let i = 0; i < 4; i++) { add('Spells ' + n++, 400, y, 150); y -= 15; }
    y -= 4;
  }
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'subsweep.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  ok(loaded, 'sheet loaded');

  let good = 0, total = 0, beyondBad = 0, subs = 0, misread = 0;
  const blank = () => { for (const f of document.querySelectorAll('[data-field^="Spells "], [data-field^="SlotsTotal"]')) if (f.value) type(f.dataset.field, ''); };
  for (const [key, c] of Object.entries(DND.classes)) {
    const at = c.features.find(f => f.choice?.type === 'subclass').lvl;
    for (const s of c.subclasses.slice(1)) {
      subs++;
      type('Features and Traits', ''); type('ProficienciesLang', ''); blank();
      type('ClassLevel', `${c.name} ${at - 1}`);
      total++; if (await levelUp(`${c.name} ${at} (${s.name})`, s.name)) good++;
      if (window.character.classes[0]?.sub?.name !== s.name) { misread++; log(`FAIL ${s.name}: read back as ${window.character.classes[0]?.sub?.name} from "${inp('ClassLevel').value}"`); }
      // the levels where it gains something: its features, its spells, its lists; every level for a subclass that casts
      const lists = Object.values(s.lists || {}).flatMap(l => Object.keys(l.known || {}));
      const levels = new Set([...s.features.map(f => f.lvl), ...Object.keys(s.spells || {}), ...lists, ...(s.spellsFrom ? [5, 7, 9] : []),
        ...(s.spellcasting || s.savant ? Array.from({ length: 20 }, (_, i) => i + 1) : [])].map(Number).filter(l => l > at));
      for (const lvl of [...levels].sort((a, b) => a - b)) {
        type('ClassLevel', `${c.name} ${lvl - 1} (${s.name})`);
        total++; if (await levelUp(`${c.name} ${lvl} (${s.name})`)) good++;
        if (window.character.beyond.length) { beyondBad++; log(`FAIL ${s.name} ${lvl}: wrote something out of reach: ${window.character.beyond.map(b => `${b.name} (${b.why})`).join('; ')}`); }
      }
    }
  }
  ok(good === total, `${subs} subclasses level up without errors (${good}/${total} level ups)`);
  ok(!misread, 'each subclass reads back from the Class box after it is picked');
  ok(!beyondBad, 'nothing a subclass level up writes counts as beyond the rules');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
