// Life Domain healing in the roller: Disciple of Life (+2 + slot level), Blessed Healer note, Supreme Healing (max dice)
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
const pick = () => document.getElementById('rollPick');
const last = () => document.querySelector('#rollLog .roll');
const total = () => +last().querySelector('.dsum .total').dataset.count;
const btn = text => [...pick().querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
function openSpell(name) {
  document.querySelector('#rollActions [data-tab="spell"]').click();
  btn('‹')?.click(); // back to the list if a spell card is open
  const search = pick().querySelector('.search'); search.value = name; search.dispatchEvent(new Event('input', { bubbles: true }));
  [...pick().querySelectorAll('.item')].find(b => b.textContent.startsWith(name)).click();
}
const slot = n => [...pick().querySelectorAll('.slotbtn')].find(b => b.textContent === String(n)).click();

(async () => { try {
  document.body.prepend(pre);
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('ClassLevel', 20, 750, 140, 'Cleric - LV 5'); add('Race ', 180, 750, 100, 'Aarakocra');
  add('WIS', 20, 700, 30, '18'); add('WISmod', 60, 700, 30, '+4'); add('ProfBonus', 20, 670, 30, '+3');
  add('Features and Traits', 20, 300, 250, 'Spellcasting\nDisciple of Life +2 +lv for heal\nPreserve Life', true, 200);
  add('Spells 1014', 300, 600, 150, 'Cure Wounds'); add('Spells 1015', 300, 580, 150, 'Healing Word');
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'arxen.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 3e6 && !loaded; i++) await yieldTask();

  openSpell('Cure Wounds'); slot(3);
  ok(/6d8\+9/.test(pick().querySelector('.num').textContent) && /\+4 WIS, \+5 Disciple of Life/.test(pick().querySelector('.num').textContent),
    'card: Cure Wounds at level 3 = 6d8+9 (+4 WIS, +5 Disciple of Life): ' + pick().querySelector('.num').textContent);
  ok(btn('Disciple of Life +5')?.classList.contains('on'), 'the Disciple of Life chip is on by default');
  forced = [4, 6, 3, 7, 4, 3]; btn('Roll healing').click(); await wait(500);
  ok(total() === 27 + 4 + 5, `Cure Wounds level 3: 27 + 4 WIS + 5 Disciple of Life = ${total()}`);
  ok(/Disciple of Life\s*\+5/.test(last().textContent), 'the log shows the Disciple of Life part');
  ok(!/Blessed Healer/.test(last().textContent), 'no Blessed Healer before Cleric 6');
  slot(1); forced = [5, 5]; btn('Roll healing').click(); await wait(500);
  ok(total() === 10 + 4 + 3, `level 1 slot: 10 + 4 + 3 = ${total()}`);
  btn('Disciple of Life').click();
  forced = [5, 5]; btn('Roll healing').click(); await wait(500);
  ok(total() === 14 && !/Disciple/.test(last().textContent), 'chip off: no bonus (14)');
  btn('Disciple of Life').click();

  type('ClassLevel', 'Cleric - LV 6');
  openSpell('Healing Word'); slot(2);
  forced = [1, 2, 3, 4]; btn('Roll healing').click(); await wait(500);
  ok(total() === 10 + 4 + 4 && /Blessed Healer: .*regain 4 HP/.test(last().textContent), `Cleric 6 Healing Word level 2: 18 and the Blessed Healer note (${total()})`);

  type('ClassLevel', 'Cleric - LV 17');
  openSpell('Cure Wounds'); slot(1);
  ok(/^Healing23\+4 WIS, \+3 Disciple of Life, dice at maximum$/.test(pick().querySelector('.num').textContent), 'Supreme Healing card: 16 + 4 + 3 = 23, dice at maximum');
  btn('Roll healing').click(); await wait(500);
  ok(total() === 16 + 4 + 3, `Supreme Healing: 2d8 count as 16, + 4 + 3 = ${total()}`);

  openSpell('False Life'); slot(1);
  ok(!btn('Disciple of Life'), 'no Disciple of Life on temporary HP');

  type('Features and Traits', 'Spellcasting'); type('ClassLevel', 'Cleric 5');
  openSpell('Cure Wounds'); slot(1);
  ok(!btn('Disciple of Life'), 'a Cleric without the Life Domain gets no bonus');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
