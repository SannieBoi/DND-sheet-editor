// Every species with its rules (the free rules' and species-more.js's): a new Fighter's first level with it, then level
// ups to character levels 3 and 5, filling every pick (the first options that can be taken), apply, and check that
// nothing throws, its traits are written, its spells reach the spell lines, and nothing counts as beyond the rules.
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
// fill the open window, apply, close; false (and a FAIL line) on an error or when nothing was applied
async function finish(label) {
  const before = errors.length;
  goTo('Features'); fill();
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
async function nextLevel(label) {
  document.getElementById('levelUp').click(); await wait(5);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(5);
  return finish(label);
}

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 14) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  const box = (name, x, y) => { const f = form.createCheckBox(name); f.addToPage(page, { x, y: y + 2, width: 9, height: 9 }); };
  add('CharacterName', 20, 770, 120, 'Speciessweep'); add('ClassLevel', 150, 770, 160, ''); add('Race ', 320, 770, 120, 'Human');
  ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((ab, i) => { add(ab, 20, 740 - i * 18, 26, '14'); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 50, 740 - i * 18, 26, '+2'); });
  add('ProfBonus', 20, 620, 26, ''); add('HPMax', 50, 620, 26, ''); add('HPCurrent', 80, 620, 26, ''); add('Speed', 110, 620, 26, '30');
  DND.rules.skills.forEach((s, i) => { box('Check Box ' + (30 + i), 20, 590 - i * 15); add(s.name, 32, 590 - i * 15, 26, '+2'); });
  ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((ab, i) => { box('Check Box ' + (60 + i), 80, 590 - i * 15); add('ST ' + DND.rules.abilities[ab], 92, 590 - i * 15, 26, '+2'); });
  add('Features and Traits', 20, 20, 200, '', true, 280); add('ProficienciesLang', 230, 20, 150, '', true, 100);
  let y = 770, n = 1014;
  for (let lvl = 0; lvl <= 3; lvl++) {
    if (lvl) { add('SlotsTotal ' + (18 + lvl), 410, y, 26); y -= 16; }
    for (let i = 0; i < 4; i++) { add('Spells ' + n++, 400, y, 150); y -= 15; }
    y -= 4;
  }
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'speciessweep.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  if (!loaded) throw new Error('sheet did not load');
  await wait(20);

  const C = window.character, spellFields = [...document.querySelectorAll('[data-field^="Spells "]')].map(e => e.dataset.field);
  const all = DND.species.filter(s => !s.brief);
  let good = 0, written = 0, spells = 0, clean = 0;
  for (const sp of all) {
    // a classless sheet with this species (a lineage, when it has them), empty boxes
    type('ClassLevel', ''); type('Features and Traits', ''); type('ProficienciesLang', ''); type('HPMax', ''); type('HPCurrent', ''); type('ProfBonus', '');
    for (const f of spellFields) if (inp(f).value) type(f, '');
    for (const cb of document.querySelectorAll('input[type=checkbox][data-field]')) if (cb.checked) { cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); }
    type('Race ', sp.subspecies.length ? `${sp.name} (${sp.subspecies[0].name.split(': ').pop()})` : sp.name);
    await wait(5);
    if (C.speciesData?.name !== sp.name) { log(`FAIL ${sp.name}: read as ${C.speciesData?.name}`); continue; }
    window.levelUp.start({ key: 'fighter' }); await wait(5);
    let fine = await finish(`${sp.name} level 1`);
    // its level 1 traits are written (not the ones whose only pick is a typed tool; a feat as "Alert (Versatile, Human)")
    const text = inp('Features and Traits').value;
    const missingTraits = sp.features.filter(f => f.lvl === 1 && f.choice?.type !== 'tools'
      && !text.includes(f.choice?.type === 'feat' ? `(${f.name}, ${sp.name})` : `${f.name} (${sp.name})`)).map(f => f.name);
    if (missingTraits.length) log(`FAIL ${sp.name}: traits not written: ${missingTraits.join(', ')}`); else written++;
    type('ClassLevel', 'Fighter 2'); await wait(5);
    fine = await nextLevel(`${sp.name} level 3`) && fine;
    type('ClassLevel', 'Fighter 4'); await wait(5);
    fine = await nextLevel(`${sp.name} level 5`) && fine;
    // every spell it has by level 5 is on a spell line (its own list, or its lineage's)
    const lines = spellFields.map(f => inp(f).value).filter(Boolean);
    const want = [...Object.entries(sp.spells || {}).filter(([l]) => +l <= 5).flatMap(([, ns]) => ns),
      ...(C.lineage?.traits || []).filter(t => t.lvl <= 5).map(t => DND.spells.find(s => s.name === t.name)?.name || DND.spellListOnly.find(s => s.name === t.name)?.name).filter(Boolean),
      ...sp.features.flatMap(f => Array.isArray(f.grants?.cantrips) ? f.grants.cantrips : [])];
    const lost = want.filter(nm => !lines.includes(nm));
    if (lost.length) log(`FAIL ${sp.name}: spells not on a line: ${lost.join(', ')} (lines: ${lines.join(', ')})`); else spells++;
    if (C.beyond.length) log(`FAIL ${sp.name}: beyond the rules: ${C.beyond.map(b => `${b.name} (${b.why})`).join('; ')}`); else clean++;
    if (fine) good++;
  }
  ok(good === all.length, `every species with rules levels 1, 3 and 5 without errors (${good}/${all.length})`);
  ok(written === all.length, `their level 1 traits are written (${written}/${all.length})`);
  ok(spells === all.length, `their spells reach the spell lines (${spells}/${all.length})`);
  ok(clean === all.length, `nothing beyond the rules (${clean}/${all.length})`);
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
