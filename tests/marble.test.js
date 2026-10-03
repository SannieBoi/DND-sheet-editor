
const MODE = '__MODE__';
const out = []; const log = (...a) => out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const pick = () => document.getElementById('rollPick');
const btn = (text, root = document) => [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const last = () => document.querySelector('#rollLog .roll');
const num = el => +el.dataset.count;
const tray = () => document.getElementById('effects');
const fxNames = () => [...tray().querySelectorAll('.fx-text b')].map(b => b.textContent);
const mp = () => document.querySelector('.marble-page');
const score = (part, v) => { const el = mp().querySelector(`.mp-input[data-part="${part}"]`); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
let forced = [];
const realGRV = crypto.getRandomValues.bind(crypto);
crypto.getRandomValues = a => { if (forced.length) { a[0] = forced.shift() - 1; return a; } return realGRV(a); };
// capture downloads instead of saving them
let lastBlob = null;
const realURL = URL.createObjectURL;
URL.createObjectURL = b => { lastBlob = b; return realURL(b); };
HTMLAnchorElement.prototype.click = function () {};
const drop = async file => {
  const dt = new DataTransfer(); dt.items.add(file);
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 100; i++) { await wait(60); if (/fields found|No form fields/.test(document.getElementById('status').textContent)) break; }
  await wait(100);
};
const download = async () => { lastBlob = null; document.getElementById('download').click(); for (let i = 0; i < 100 && !lastBlob; i++) await wait(50); return lastBlob; };
const pageCount = async blob => (await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise).numPages;

(async () => { try {
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, val = '') => { const f = form.createTextField(name); if (val) f.setText(val); f.addToPage(page, { x, y, width: w, height: 16 }); };
  add('CharacterName', 20, 750, 150, 'Marble Test'); add('ClassLevel', 200, 750, 120, 'Fighter 5'); add('Speed', 340, 750, 40, '30');
  add('STR', 20, 700, 30, '16'); add('STRmod', 60, 700, 30, '+3'); add('DEX', 20, 670, 30, '14'); add('DEXmod', 60, 670, 30, '+2');
  add('CON', 20, 640, 30, '14'); add('CONmod', 60, 640, 30, '+2'); add('ProfBonus', 20, 610, 30, '+3');
  add('Acrobatics', 100, 610, 30, '+2'); add('ST Dexterity', 140, 610, 30, '+2'); add('ST Constitution', 180, 610, 30, '+5');
  add('Wpn Name', 200, 560, 120, 'Longsword'); add('Wpn1 AtkBonus', 330, 560, 40, '+6'); add('Wpn1 Damage', 380, 560, 120, '1d8+3 slashing');
  add('Wpn Name 2', 200, 538, 120, 'Greatsword'); add('Wpn2 AtkBonus ', 330, 538, 40, '+6'); add('Wpn2 Damage ', 380, 538, 120, '2d6+3 slashing');
  await drop(new File([await doc.save()], 'marble.pdf', { type: 'application/pdf' }));

  ok(!document.querySelector('#modeSwitch button').disabled, 'mode switch enabled after loading');
  btn('Killing Marble').click();
  ok(mp() && document.querySelectorAll('#pages .page').length === 2, 'Killing Marble adds the Becoming Marble page');
  if (MODE === 'shot') {
    score('rightArm', 6); score('head', 3); score('torso', 9); score('rightLeg', 4); score('leftLeg', 3); score('tail', 2);
    window.effects.active(); sheetState.effects = [{ name: 'Poisoned' }]; window.effects.changed();
    tab('attack'); pick().querySelector('.item').click(); forced = [12]; btn('Attack', pick()).click();
    tab('check'); mp().scrollIntoView();
    await wait(1500); document.title = 'DONE'; return;
  }
  const b0 = await download();
  ok(b0 && await pageCount(b0) === 2, 'switching to Killing Marble alone puts the page in the download');
  const cardLeft = id => parseFloat(mp().querySelector('#mp-' + id).style.left);
  ok(cardLeft('leftArm') < 50 && cardLeft('rightArm') > 50, 'Left arm card on the left, Right arm card on the right');
  // arms
  score('rightArm', 5);
  ok(fxNames().includes('Right arm 5/10'), 'tray lists Right arm 5/10: ' + fxNames().join(' | '));
  tab('attack'); pick().querySelector('.item').click();
  ok(/Right arm 5\/10/.test(pick().querySelector('.fxnote')?.textContent || ''), 'attack card shows the arm penalty: ' + pick().querySelector('.fxnote')?.textContent);
  forced = [10, 4];
  btn('Attack', pick()).click();
  ok(num(last().querySelector('.test .total')) === 10 + 6 - 2, 'attack 10 + 6 − 2 = ' + num(last().querySelector('.test .total')));
  ok(num(last().querySelector('.dsum .total')) === 4 + 3 - 2, 'damage 4 + 3 − 2 = ' + num(last().querySelector('.dsum .total')));
  btn('Right arm', pick()).click(); btn('Left arm', pick()).click();
  ok(!pick().querySelector('.fxnote'), 'attacking with the left arm only: no penalty');
  btn('‹ Weapons', pick()).click();
  // two-handed weapon uses both arms by default
  [...pick().querySelectorAll('.item')][1].click();
  ok(/Right arm/.test(pick().querySelector('.fxnote')?.textContent || ''), 'Greatsword (two-handed) uses both arms');
  btn('‹ Weapons', pick()).click();
  // head: disadvantage on all rolls; chosen Advantage cancels
  score('head', 5);
  [...pick().querySelectorAll('.item')][0].click();
  forced = [15, 3, 4];
  btn('Advantage', pick()).click();
  ok(last().querySelectorAll('.face').length === 1 && /cancel/.test(last().querySelector('.tag').textContent), 'Advantage + Head disadvantage cancel: ' + last().querySelector('.tag').textContent);
  forced = [15, 3, 4];
  btn('Attack', pick()).click();
  ok(last().querySelectorAll('.face').length === 2 && /Disadvantage \(Head 5\/10\)/.test(last().querySelector('.tag').textContent), 'normal attack rolls with Disadvantage from Head');
  score('head', 0);
  let flag;
  // legs + torso: speed and DEX
  score('rightLeg', 6); score('leftLeg', 4);
  ok(/30 ft.*15 ft/.test(tray().querySelector('.fx-speed')?.textContent || ''), 'legs 10/20: speed 30 → 15: ' + tray().querySelector('.fx-speed')?.textContent);
  ok(fxNames().includes('Right leg is spreading'), 'Right leg at 6 is spreading');
  score('torso', 8);
  tab('check');
  flag = name => [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith(name))?.querySelector('.fxflag')?.textContent;
  ok(flag('Acrobatics') === '-2', 'Acrobatics: −1 legs, −1 torso = ' + flag('Acrobatics'));
  ok(!flag('Athletics'), 'Athletics (STR) unaffected');
  forced = [10];
  [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith('Acrobatics')).click();
  ok(num(last().querySelector('.test .total')) === 10 + 2 - 2, 'Acrobatics roll 10 + 2 − 2 = ' + num(last().querySelector('.test .total')));
  score('rightLeg', 10); score('leftLeg', 10);
  ok(flag('Acrobatics') === 'Dis', 'legs 20/20: DEX penalties replaced by Disadvantage: ' + flag('Acrobatics'));
  ok(/0 ft/.test(tray().querySelector('.fx-speed')?.textContent || ''), 'legs 20/20: speed 0');
  score('rightLeg', 0); score('leftLeg', 0); score('torso', 0);
  // spreading: one CON save against DC 6 + score for every spreading part
  const val = id => +mp().querySelector(`.mp-input[data-part="${id}"]`).value;
  const verdict = id => mp().querySelector(`#mp-${id} .mp-verdict`);
  score('rightArm', 7); score('torso', 6);
  ok(/DC 13/.test(mp().querySelector('#mp-rightArm .mp-spread').textContent) && /DC 12/.test(mp().querySelector('#mp-torso .mp-spread').textContent),
    'spread DCs: right arm 7 → 13, torso 6 → 12');
  ok(!verdict('rightArm'), 'no Apply before a CON save');
  forced = [7];
  btn('Roll CON save', mp()).click(); // 7 + 5 = 12
  ok(num(last().querySelector('.test .total')) === 12, 'CON save 7 + 5 = 12');
  // the arm's only neighbour (the torso) has marble already, so a failed save has nowhere to spread
  ok(!btn('Apply?', verdict('rightArm')) && /Failed, 12 vs DC 13: nowhere unmarbled to spread to/.test(verdict('rightArm')?.textContent),
    'right arm: 12 vs DC 13 failed, no Apply (torso already marbled): ' + verdict('rightArm')?.textContent);
  ok(/nowhere left to spread/.test(tray().textContent), 'the tray says the arm has nowhere left to spread');
  ok(verdict('torso')?.classList.contains('ok') && !btn('Apply?', verdict('torso')), 'torso: 12 vs DC 12 resisted, no Apply');
  ok(!verdict('head') && !verdict('tail'), 'parts that are not spreading get no verdict');
  forced = [2];
  tab('save');
  [...pick().querySelectorAll('.tmain')].find(b => b.textContent.startsWith('Constitution')).click(); // CON save from the Saves tab counts too: 7
  ok(verdict('torso')?.classList.contains('fail'), 'CON save from the Saves tab: torso 7 vs DC 12 failed');
  btn('Apply?', verdict('torso')).click();
  ok(['head', 'leftArm', 'rightArm', 'leftLeg', 'rightLeg', 'tail'].map(val).join() === '1,1,7,1,1,1', 'torso spreads to every unmarbled part, not the marbled right arm');
  ok(/Spread: Head, Left arm, Left leg, Right leg, Tail \+1/.test(verdict('torso').textContent), 'applied once: ' + verdict('torso').textContent);
  // clear all (asks twice); lost parts stay lost
  mp().querySelector('[data-lost="leftLeg"]').click();
  btn('Clear all marble', mp()).click();
  ok(val('torso') === 6 && btn('Sure?', mp()), 'Clear all asks first');
  btn('Sure?', mp()).click();
  ok(Object.keys(window.marble.parts).every(id => val(id) === 0) && !verdict('torso'), 'Clear all: every part 0, verdicts gone');
  ok(mp().querySelector('[data-lost="leftLeg"]').checked, 'lost left leg stays lost');
  mp().querySelector('[data-lost="leftLeg"]').click();
  // tail debuffs
  tab('check');
  score('tail', 3);
  ok(flag('Acrobatics') === '-1' && !flag('Stealth'), 'tail 3: −1 Acrobatics only');
  score('tail', 6);
  ok(flag('Stealth') === 'Dis' && !flag('Athletics'), 'tail 6: Disadvantage on Stealth');
  score('tail', 10);
  ok(/30 ft.*25 ft/.test(tray().querySelector('.fx-speed')?.textContent || ''), 'tail 10: speed −5');
  score('tail', 0); score('rightArm', 5);
  // own effects
  btn('+ Add', tray()).click();
  const name = tray().querySelector('input[name="name"]'); name.value = 'Exhaustion'; name.dispatchEvent(new Event('input'));
  const lvl = tray().querySelector('input[name="level"]'); lvl.value = '2'; lvl.dispatchEvent(new Event('input'));
  tray().querySelector('form').requestSubmit();
  ok(fxNames().includes('Exhaustion 2') && /30 ft.*20 ft/.test(tray().querySelector('.fx-speed')?.textContent || ''), 'Exhaustion 2: listed, speed 20');
  ok(flag('Athletics') === '-4', 'Exhaustion 2: −4 on checks: ' + flag('Athletics'));
  btn('+ Add', tray()).click();
  const n2 = tray().querySelector('input[name="name"]'); n2.value = 'Cursed blade'; n2.dispatchEvent(new Event('input'));
  const kind = tray().querySelector('select[name="kind"]'); kind.value = 'mod'; kind.dispatchEvent(new Event('change'));
  const tgt = tray().querySelector('select[name="target"]'); tgt.value = 'damage'; tgt.dispatchEvent(new Event('change'));
  const amount = tray().querySelector('input[name="value"]'); amount.value = '-1'; amount.dispatchEvent(new Event('input'));
  tray().querySelector('form').requestSubmit();
  ok(/−1 to damage rolls/.test(tray().textContent), 'custom "−1 to damage rolls" added');
  // spread save button
  score('rightArm', 6);
  btn('Roll CON save', mp()).click();
  ok(last().querySelector('.rhead b').textContent === 'Marble spread: CON save' && /\+\s*5/.test(last().querySelector('.test').textContent), 'Roll CON save uses the CON save (+5)');
  score('torso', 20);
  ok(mp().classList.contains('finished') && fxNames().includes('Torso 20/20'), 'torso 20/20: story finished');
  score('torso', 3);

  // ---- saved in the PDF
  const b1 = await download();
  ok(b1 && await pageCount(b1) === 2, 'download has the sheet + Becoming Marble page');
  await drop(new File([b1], 'marble-edited.pdf', { type: 'application/pdf' }));
  ok(document.querySelectorAll('#pages .page').length === 2 && mp(), 'reopened: 1 sheet page + 1 marble page (no duplicate)');
  ok(mp().querySelector('.mp-input[data-part="rightArm"]').value === '6' && mp().querySelector('.mp-input[data-part="torso"]').value === '3', 'marble scores restored');
  ok(fxNames().includes('Exhaustion 2') && fxNames().includes('Cursed blade'), 'own effects restored: ' + fxNames().join(' | '));
  ok(document.querySelector('#modeSwitch [data-mode="marble"]').classList.contains('on'), 'mode restored');
  const b2 = await download();
  ok(await pageCount(b2) === 2, 'downloading again keeps 2 pages');
  btn('Default').click();
  ok(!mp() && !fxNames().some(n => /arm|Torso/.test(n)) && fxNames().includes('Exhaustion 2'), 'Default mode: marble page and marble effects gone, own effects stay');
  const b3 = await download();
  ok(await pageCount(b3) === 1, 'Default mode download: just the sheet');
  // zoom buttons
  btn('+', document.getElementById('zoombox')).click();
  ok(document.getElementById('zoomPct').textContent === '110%', 'zoom + → 110%');
} catch (err) { log('ERROR', err.stack); }
if (MODE === 'test') { const pre = document.createElement('pre'); pre.id = 'out'; pre.textContent = out.join('\n'); document.body.prepend(pre); }
document.title = 'DONE';
})();
