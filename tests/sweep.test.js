// Every class at every level (and multiclassing into every class): open the level-up window, go through each page with
// the default picks, apply, and make sure nothing throws. A smoke test for the rules data paths in levelup.js.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const W = () => document.getElementById('lvlup');
const btnIn = (root, text) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const errors = [];
addEventListener('error', e => errors.push(e.message));
const realError = console.error;
console.error = (...a) => { errors.push(a.map(String).join(' ')); realError(...a); };

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 14) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  const box = (name, x, y) => { const f = form.createCheckBox(name); f.addToPage(page, { x, y: y + 2, width: 9, height: 9 }); };
  add('CharacterName', 20, 770, 120, 'Sweep'); add('ClassLevel', 150, 770, 120, 'Fighter 1'); add('Race ', 280, 770, 80, 'Dwarf');
  ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((ab, i) => { add(ab, 20, 740 - i * 18, 26, '14'); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 50, 740 - i * 18, 26, '+2'); });
  add('ProfBonus', 20, 620, 26, '+2'); add('HPMax', 50, 620, 26, '10'); add('HPCurrent', 80, 620, 26, '10'); add('Speed', 110, 620, 26, '30');
  add('HDTotal', 140, 620, 40, '1d10'); add('SpellcastingAbility 2', 190, 620, 40); add('SpellSaveDC  2', 240, 620, 26); add('SpellAtkBonus 2', 270, 620, 26);
  DND.rules.skills.forEach((s, i) => { box('Check Box ' + (30 + i), 20, 590 - i * 15); add(s.name, 32, 590 - i * 15, 26, '+2'); });
  ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'].forEach((ab, i) => { box('Check Box ' + (60 + i), 80, 590 - i * 15); add('ST ' + DND.rules.abilities[ab], 92, 590 - i * 15, 26, '+2'); });
  add('Features and Traits', 20, 20, 200, '', true, 280); add('ProficienciesLang', 230, 20, 150, '', true, 100);
  let y = 770, n = 1014;
  for (let lvl = 0; lvl <= 9; lvl++) {
    if (lvl) { add('SlotsTotal ' + (18 + lvl), 410, y, 26); y -= 16; }
    for (let i = 0; i < 4; i++) { add('Spells ' + n++, 400, y, 150); y -= 15; }
    y -= 4;
  }
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'sweep.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();
  ok(loaded, 'sweep sheet loaded');

  // go through every page with the defaults and apply
  const levelUp = async (setup, label) => {
    const before = errors.length;
    document.getElementById('levelUp').click(); await wait(5);
    btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(5);
    setup?.();
    for (let guard = 0; guard < 8 && W().querySelector('.lu-next'); guard++) W().querySelector('.lu-next').click();
    const rows = W().querySelectorAll('.lu-group li').length;
    W().querySelector('.lu-apply').click(); await wait(5);
    const applied = /applied/.test(W().querySelector('.lu-body').textContent);
    if (applied) btnIn(W().querySelector('.lu-foot'), 'Close').click();
    else {
      W().querySelector('.lu-x').click(); await wait(5);
      const confirm = document.querySelector('.ask');
      if (confirm) btnIn(confirm, 'Throw away').click();
    }
    if (errors.length > before || !applied || !rows) log(`FAIL ${label}: ${errors.slice(before).join(' | ') || (applied ? 'no rows' : 'not applied')}`);
    return errors.length === before && applied;
  };
  let good = 0, total = 0;
  for (const key of Object.keys(DND.classes)) {
    const name = DND.classes[key].name;
    for (let lvl = 1; lvl < 20; lvl++) {
      type('ClassLevel', `${name} ${lvl}`);
      total++; if (await levelUp(null, `${name} ${lvl} -> ${lvl + 1}`)) good++;
    }
  }
  ok(good === total, `every class from level 1 to 20 levels up without errors (${good}/${total})`);
  good = 0; total = 0;
  for (const key of Object.keys(DND.classes)) {
    for (const from of ['fighter', 'wizard']) {
      if (key === from) continue;
      type('ClassLevel', `${DND.classes[from].name} 4`);
      total++;
      if (await levelUp(() => { btnIn(W().querySelector('.lu-body'), 'A new class').click(); btnIn(W().querySelector('.lu-body'), DND.classes[key].name).click(); },
        `${from} 4 + ${key} 1`)) good++;
    }
  }
  ok(good === total, `multiclassing into every class works (${good}/${total})`);
  ok(character.classes.length === 2, 'the last one reads back as two classes: ' + inp('ClassLevel').value);
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
