// Feature uses written on the sheet: the official 2024 sheet's second Class Features column, the classic sheet's Attacks &
// Spellcasting box. Lines follow spending, rests, a level, a typed number, Undo / Redo, the download, and an older PDF whose
// uses were only in sheetState.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).value;
// as you type: focus, input, and on leaving the box its 'change'
const type = (n, v) => {
  const el = inp(n); el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true })); el.blur();
};
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
let lastBlob = null;
const realURL = URL.createObjectURL;
URL.createObjectURL = b => { lastBlob = b; return realURL(b); };
HTMLAnchorElement.prototype.click = function () {};
const res = id => window.resources.list().find(r => r.id === id);
const tab = t => document.querySelector(`#rollActions [data-tab="${t}"]`).click();
const resLeft = name => [...document.querySelectorAll('#rollPick .res')].find(r => r.querySelector('.rname b').textContent === name)?.querySelector('.rleft').textContent;
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const RW = () => document.getElementById('restwin');
const unsaved = () => document.getElementById('download').classList.contains('unsaved');
async function open(bytes, name) {
  const dt = new DataTransfer(); dt.items.add(new File([bytes], name, { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 2e7 && !loaded; i++) await yieldTask();
  return loaded;
}

(async () => { try {
  document.body.prepend(pre);
  const official = await new Promise((res, rej) => {
    const x = new XMLHttpRequest(); x.open('GET', '../official-2024-sheet.pdf'); x.responseType = 'arraybuffer';
    x.onload = () => res(x.response); x.onerror = () => rej(new Error('could not read the PDF')); x.send();
  });
  ok(await open(official, 'official.pdf'), 'the official sheet loads');
  ok(val('Text55') === '' && !window.sheetState.used, 'a blank sheet: nothing written');

  // ---- a Monk 5 on the official sheet: the second Class Features column
  type('Text55', 'Notes: keep the scroll');
  type('Text7', 'Monk'); type('Text11', '5');
  const lines = left => `Focus Points: ${left} left (Short Rest)\nUncanny Metabolism: 1 of 1 left (Long Rest)\n\nNotes: keep the scroll`;
  ok(val('Text55') === lines('5 of 5'), 'Monk 5: the uses at the top of the second column, the notes below: ' + JSON.stringify(val('Text55')));
  ok(val('Text54') === '', 'the first column is left alone');
  window.resources.setUsed('focus', 1);
  ok(val('Text55') === lines('4 of 5') && res('focus').left === 4 && !window.sheetState.used, 'a Focus Point spent: written on the sheet, not in the hidden data');
  tab('rest');
  ok(resLeft('Focus Points') === '4/5', 'the Rest tab shows it');

  // typed on the sheet
  type('Text55', val('Text55').replace('4 of 5 left (Short Rest)', '2'));
  ok(val('Text55') === lines('2 of 5') && res('focus').left === 2 && resLeft('Focus Points') === '2/5', '"Focus Points: 2" typed: read, and the line written out in full');
  sheet.undo();
  ok(val('Text55') === lines('4 of 5') && res('focus').left === 4, 'Undo: back to 4');
  sheet.redo();
  ok(val('Text55') === lines('2 of 5') && res('focus').left === 2, 'Redo: 2 again');

  // a level: the points spent stay spent
  type('Text11', '6');
  ok(val('Text55') === lines('3 of 6') && res('focus').used === 3, 'Monk 6: 3 of 6 left (3 still spent)');
  window.resources.use('focus', 'Flurry of Blows'); await wait(20);
  ok(val('Text55') === lines('2 of 6'), 'Flurry of Blows from the Rest tab: 2 of 6 left: ' + JSON.stringify(val('Text55')) + (document.querySelector('.ask')?.textContent || ''));
  window.resources.openRest('short'); await wait(20);
  btnIn(RW(), 'Apply Short Rest').click(); await wait(20);
  ok(val('Text55') === lines('6 of 6'), 'Short Rest: all back');
  btnIn(RW(), 'Close').click();
  window.resources.setUsed('uncannyMetabolism', 1);
  ok(/^Uncanny Metabolism: 0 of 1 left \(Long Rest\)$/m.test(val('Text55')), 'Uncanny Metabolism used: 0 of 1 left');
  ok(!document.querySelector('.ask') && !character.beyond.length, 'nothing asked, nothing beyond the rules');

  // the download holds the lines
  document.getElementById('download').click();
  for (let i = 0; i < 400 && !lastBlob; i++) await wait(50);
  ok(!!lastBlob, 'downloaded');
  const saved = await PDFLib.PDFDocument.load(await lastBlob.arrayBuffer());
  ok(/^Focus Points: 6 of 6 left \(Short Rest\)\nUncanny Metabolism: 0 of 1 left/.test(saved.getForm().getTextField('Text55').getText()), 'the downloaded PDF shows the uses');

  // an older PDF: uses only in the hidden data -> written on the sheet as it opens, without an unsaved dot
  saved.getForm().getTextField('Text55').setText('Notes: keep the scroll');
  saved.getInfoDict().set(PDFLib.PDFName.of('DndSheetViewerState'), PDFLib.PDFHexString.fromText(JSON.stringify({ used: { focus: 2, rage: 1 } })));
  ok(await open(await saved.save(), 'older.pdf'), 'an older PDF opens');
  ok(val('Text55') === 'Focus Points: 4 of 6 left (Short Rest)\nUncanny Metabolism: 1 of 1 left (Long Rest)\n\nNotes: keep the scroll',
    'its 2 spent Focus Points are on the sheet now: ' + JSON.stringify(val('Text55')));
  ok(JSON.stringify(window.sheetState.used) === '{"rage":1}' && !unsaved(), 'moved out of the hidden data (a use the sheet has no line for stays), no unsaved dot');

  // ---- the classic 2014 sheet: the Attacks & Spellcasting box
  await new Promise((r, j) => { const s = document.createElement('script'); s.src = '../../data/sheet-2014.js'; s.onload = r; s.onerror = j; document.head.append(s); });
  const classic = Uint8Array.from(atob(window.BLANK_SHEETS.classic.replace(/\s/g, '')), c => c.charCodeAt(0));
  ok(await open(classic, 'classic.pdf'), 'the classic sheet loads');
  type('AttacksSpellcasting', 'Second Wind: 1d10 + level HP');
  type('ClassLevel', 'Fighter 2');
  ok(val('AttacksSpellcasting') === 'Second Wind: 2 of 2 left (1 back per Short Rest)\nAction Surge: 1 of 1 left (Short Rest)\n\nSecond Wind: 1d10 + level HP',
    'Fighter 2: the uses in Attacks & Spellcasting ("1d10" in a line of your own is not a count): ' + JSON.stringify(val('AttacksSpellcasting')));
  window.resources.setUsed('actionSurge', 1);
  ok(/^Action Surge: 0 of 1 left \(Short Rest\)$/m.test(val('AttacksSpellcasting')) && res('actionSurge').left === 0 && !window.sheetState.used, 'Action Surge used: on the sheet');
  ok(val('Features and Traits') === '' && !document.querySelector('.ask'), 'Features & Traits left alone, nothing asked');
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
