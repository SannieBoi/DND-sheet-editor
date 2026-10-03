// Concentration in the effects tray: casting starts it, things that would end it ask first, damage offers the CON save
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const pick = () => document.getElementById('rollPick');
const tray = () => document.getElementById('effects');
const entries = () => [...document.querySelectorAll('#rollLog .roll')];
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const dialog = () => document.querySelector('.ask');
const answer = async text => { const b = btnIn(dialog(), text); if (!b) log('FAIL no dialog button ' + text + ' in ' + (dialog()?.textContent || 'no dialog')); else b.click(); await wait(20); };
const conc = () => window.effects.concentration()?.name ?? null;
async function openSpell(name) {
  document.querySelector('#rollActions [data-tab="spell"]').click();
  btnIn(pick(), '‹')?.click();
  const search = pick().querySelector('.search'); search.value = name; search.dispatchEvent(new Event('input', { bubbles: true }));
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith(name)).click();
  await wait(10);
}
const castBtn = () => [...pick().querySelectorAll('button.go')][0];
async function addEffect(name) {
  if (!tray().querySelector('.fx-form')) btnIn(tray(), '+ Add').click();
  const n = tray().querySelector('[name="name"]'); n.value = name; n.dispatchEvent(new Event('input', { bubbles: true }));
  tray().querySelector('.fx-save').click(); await wait(20);
}
async function setHP(field, v) {
  const el = inp(field);
  el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  el.value = String(v); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true }));
  await wait(20);
}

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('ClassLevel', 20, 750, 140, 'Cleric 5'); add('STR', 20, 720, 30, '14'); add('STRmod', 60, 720, 30, '+2');
  add('CON', 20, 700, 30, '14'); add('CONmod', 60, 700, 30, '+2'); add('ST Constitution', 100, 700, 30, '+2');
  add('WIS', 20, 680, 30, '18'); add('WISmod', 60, 680, 30, '+4'); add('ProfBonus', 20, 650, 30, '+3');
  add('HPMax', 20, 620, 30, '38'); add('HPCurrent', 60, 620, 30, '30'); add('HPTemp', 100, 620, 30, '');
  add('Wpn Name', 200, 600, 120, 'Mace'); add('Wpn1 AtkBonus', 330, 600, 40, '+5'); add('Wpn1 Damage', 380, 600, 120, '1d6+2 bludgeoning');
  add('Spells 1014', 300, 500, 150, 'Bless'); add('Spells 1015', 300, 480, 150, 'Hold Person'); add('Spells 1016', 300, 460, 150, 'Cure Wounds');
  add('Spells 1017', 300, 440, 150, 'Spirit Guardians');
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'c.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();

  // casting a concentration spell starts it; Undo in the log takes it back
  await openSpell('Bless'); castBtn().click(); await wait(20);
  ok(conc() === 'Bless' && /Concentrating\s*Bless/.test(tray().querySelector('.fx.conc')?.textContent), 'casting Bless: the tray shows Concentrating Bless');
  ok(/Level 1 slot · up to 1 minute/.test(tray().querySelector('.fx.conc small').textContent), 'with its slot and duration: ' + tray().querySelector('.fx.conc small').textContent);
  btnIn(entries()[0].querySelector('.conc-line'), 'Undo').click(); await wait(10);
  ok(conc() === null && /undone/.test(entries()[0].textContent), 'Undo ends it again');
  castBtn().click(); await wait(20);
  ok(conc() === 'Bless', 'cast again: concentrating on Bless');

  // a spell without concentration doesn't touch it
  await openSpell('Cure Wounds'); btnIn(pick(), 'Roll healing').click(); await wait(20);
  ok(!dialog() && conc() === 'Bless', 'Cure Wounds (no concentration): no question, still Bless');

  // another concentration spell asks first
  await openSpell('Hold Person');
  ok(/Concentrating on Bless: casting Hold Person would end it/.test(pick().textContent), 'the Hold Person card warns about Bless');
  const n0 = entries().length;
  castBtn().click(); await wait(20);
  ok(/Hold Person needs concentration too, so casting it ends Bless/.test(dialog()?.textContent || ''), 'casting Hold Person asks first');
  await answer('Cancel');
  ok(entries().length === n0 && conc() === 'Bless', 'Cancel: nothing cast, still Bless');
  castBtn().click(); await wait(20); await answer('Cast, keep Bless');
  ok(entries().length === n0 + 1 && conc() === 'Bless' && /Still concentrating on Bless/.test(entries()[0].textContent), 'cast but keep Bless (just trying it out)');
  castBtn().click(); await wait(20); await answer('Cast, switch to Hold Person');
  ok(conc() === 'Hold Person' && window.sheetState.concentration.slot === 2, 'switch: concentrating on Hold Person (level 2 slot)');
  btnIn(entries()[0].querySelector('.conc-line'), 'Undo').click(); await wait(10);
  ok(conc() === 'Bless', 'Undo after a switch brings Bless back');

  // conditions that Incapacitate ask first
  await addEffect('Poisoned');
  ok(!dialog() && conc() === 'Bless', 'Poisoned: no question');
  await addEffect('Stunned');
  ok(/Stunned includes Incapacitated, which ends concentration/.test(dialog()?.textContent || ''), 'adding Stunned asks first');
  await answer('Add Stunned, keep Bless');
  ok(conc() === 'Bless' && window.effects.active().some(e => e.name === 'Stunned'), 'keep: Stunned added, still Bless');
  await addEffect('Unconscious'); await answer('Add Unconscious, end Bless');
  ok(conc() === null && window.effects.active().some(e => e.name === 'Unconscious'), 'end: Unconscious added, concentration over');
  window.sheetState.effects = []; window.effects.changed();

  // concentration added by hand in the tray
  await addEffect('Bless');
  ok(conc() === 'Bless', 'tray: typing Bless and Concentrate starts it');
  await addEffect('Spirit Guardians');
  ok(/starting Spirit Guardians ends Bless/.test(dialog()?.textContent || ''), 'tray: another one asks first');
  await answer('Concentrate on Spirit Guardians');
  ok(conc() === 'Spirit Guardians', 'switched to Spirit Guardians');
  btnIn(tray(), '+ Add').click();
  const nm = tray().querySelector('[name="name"]'); nm.value = 'Homebrew Aura'; nm.dispatchEvent(new Event('input', { bubbles: true }));
  const box = tray().querySelector('[name="conc"]'); box.checked = true; box.dispatchEvent(new Event('change', { bubbles: true }));
  tray().querySelector('.fx-save').click(); await wait(20); await answer('Concentrate on Homebrew Aura');
  ok(conc() === 'Homebrew Aura', 'a spell from elsewhere: the "A spell I concentrate on" box');
  tray().querySelector('.fx.conc .fx-x').click(); await wait(10);
  ok(conc() === null && !tray().querySelector('.fx.conc'), '× ends concentration');

  // damage: lowering HP offers the CON save
  window.effects.concentrate('Bless', 1);
  await setHP('HPCurrent', 6); // 24 damage
  ok(/DC 12/.test(dialog()?.textContent || ''), '24 damage: CON save DC 12 offered');
  const dmg = dialog().querySelector('input'); dmg.value = '30'; dmg.dispatchEvent(new Event('input'));
  ok(/DC 15/.test(dialog().textContent), 'changing the damage to 30: DC 15');
  forced = [5]; await answer('Roll CON save'); await wait(20);
  ok(/Concentration: Bless \(DC 15\)/.test(entries()[0].textContent), 'the save is in the log: 5 + 2 = 7');
  ok(/You rolled 7 against DC 15/.test(dialog()?.textContent || ''), 'failed: asks whether to end it');
  await answer('Keep Bless');
  ok(conc() === 'Bless' && /CON save 7 vs DC 15: failed/.test(tray().textContent), 'kept anyway; the tray shows the failed save');
  forced = [19]; btnIn(entries()[0], '↻ Again').click(); await wait(20);
  ok(!dialog() && /CON save 21 vs DC 15: kept/.test(tray().textContent), '"Again" on the save: 21, kept, no question');
  await setHP('HPCurrent', 4);
  ok(/DC 10/.test(dialog()?.textContent || ''), '2 damage: DC 10');
  await answer('Not now');
  ok(conc() === 'Bless' && !dialog(), 'Not now: nothing happens');
  await setHP('HPCurrent', 9);
  ok(!dialog(), 'healing asks nothing');
  await setHP('HPTemp', '');
  inp('HPTemp').value = '5'; inp('HPTemp').dispatchEvent(new Event('input', { bubbles: true }));
  await setHP('HPTemp', 1);
  ok(/DC 10/.test(dialog()?.textContent || ''), 'losing Temp HP counts as damage too');
  await answer('Not now');
  await setHP('HPCurrent', 0);
  ok(/At 0 Hit Points you fall Unconscious/.test(dialog()?.textContent || ''), '0 HP: asks whether to end it');
  await answer('End concentration');
  ok(conc() === null, 'ended at 0 HP');

  // Rage asks first
  inp('ClassLevel').value = 'Barbarian 2 / Cleric 3'; inp('ClassLevel').dispatchEvent(new Event('input', { bubbles: true }));
  window.effects.concentrate('Bless', 1);
  document.querySelector('#rollActions [data-tab="attack"]').click(); btnIn(pick(), '‹')?.click();
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith('Mace')).click(); await wait(10);
  btnIn(pick(), 'Rage').click(); await wait(20);
  ok(/While you rage you can't concentrate/.test(dialog()?.textContent || ''), 'turning Rage on asks first');
  await answer('Cancel');
  ok(!btnIn(pick(), 'Rage').classList.contains('on') && conc() === 'Bless', 'Cancel: no Rage');
  btnIn(pick(), 'Rage').click(); await wait(20); await answer('Rage, keep Bless');
  ok(btnIn(pick(), 'Rage').classList.contains('on') && conc() === 'Bless', 'keep: raging and still Bless');

  // Killing Marble: head 10 is Unconscious; a concentration save is not a spread save
  document.querySelector('#modeSwitch [data-mode="marble"]').click(); await wait(20);
  window.marble.setScore('rightArm', 7); await wait(10);
  await setHP('HPCurrent', 10); await setHP('HPCurrent', 3); forced = [3]; await answer('Roll CON save'); await wait(20); await answer('Keep Bless');
  ok(!document.querySelector('#mp-rightArm .mp-verdict'), 'Killing Marble ignores the concentration save');
  window.marble.setScore('head', 10); await wait(20);
  ok(/At head 10 you are Unconscious/.test(dialog()?.textContent || ''), 'marble head 10 asks about concentration');
  await answer('End concentration');
  ok(conc() === null, 'ended');
  ok('concentration' in window.sheetState, 'saved with the sheet state (inside the PDF)');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
