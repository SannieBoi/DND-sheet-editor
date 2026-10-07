/* Beyond the rules: things on the sheet the character can't have yet (script.js finds them: character.beyond, e.g. a
   level 4 feat on a level 1 sheet, or Indomitable on a Fighter 1). They do nothing until the player says the DM allowed
   them, since a DM can give anything. When one shows up (a sheet is opened, or you leave the box you typed it in) a
   question asks about it:
   - Keep it: "[DM allowed]" is written right after its name on the sheet. The DM can see it there, in the app and in the
     downloaded PDF, and the roll log names it whenever a roll uses it (roller.js), so nothing is used unnoticed.
   - Ignore it: it stays on the sheet as written but does nothing; the PDF remembers not to ask (sheetState.beyondIgnored).
   Both are one step for Undo. Closing the question without an answer (or undoing an answer) only stops it asking until
   a PDF is opened again. */
(() => {
'use strict';
const C = window.character, S = window.sheet;
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

let timer = null, asking = false;
const dismissed = new Set(); // ids closed without an answer, or brought back by Undo: not asked again until the next PDF
const ignored = () => window.sheetState.beyondIgnored || [];
const open = () => (C.beyond || []).filter(b => !b.kept && !ignored().includes(b.id) && !dismissed.has(b.id));
// typing in a sheet box: wait until you leave it, so the question never cuts into a word
const typing = () => { const a = document.activeElement; return !!a?.closest?.('#pages') && a.matches('input, textarea, select'); };
const later = (ms = 250) => { clearTimeout(timer); timer = setTimeout(check, ms); };

async function check() {
  if (asking || !S.loaded || typing()) return;
  if (document.querySelector('.ask-back')) return later(800); // another question is open: after that one
  const list = open();
  if (!list.length) return;
  asking = true;
  const a = await question(list);
  asking = false;
  if (!a) { for (const b of list) dismissed.add(b.id); return; }
  decide(a.keep, list.filter(b => !a.keep.includes(b)));
}

function question(list) {
  const one = list.length === 1, who = String(C.name ?? '').trim() || 'Your character';
  const what = C.classes.length ? `${who} (${C.classes.map(c => `${c.name} ${c.level}`).join(' / ')})` : `${who} (level ${C.level})`;
  const ticks = new Map(list.map(b => [b, h('input', { type: 'checkbox', 'aria-label': `Keep ${b.name}: my DM allowed it` })]));
  const body = h('div', { class: 'ask-body beyond-q' },
    h('ul', {}, list.map(b => h('li', {}, h('label', {}, one ? null : ticks.get(b), h('b', {}, b.name), h('small', {}, b.why))))),
    h('p', {}, `If your DM gave ${one ? 'it' : 'one'} to you, keep it: "${S.dmMark}" is written after its name on the sheet, so your DM can ` +
      'see it (in the downloaded PDF too), and every roll that uses it says so in the log. Otherwise it stays on the sheet as you wrote it, but the app ignores it.'));
  return window.ask({ title: one ? `${list[0].name}: did your DM allow it?` : 'Did your DM allow these?',
    text: `${what} can't have ${one ? 'this' : 'these'} yet by the rules:`, body,
    buttons: one ? [{ label: 'Keep it: my DM allowed it', value: 'keep' }, { label: 'Ignore it', value: 'ignore', primary: true }]
      : [{ label: 'Keep the ticked ones', value: 'keep' }, { label: 'Ignore all', value: 'ignore', primary: true }] })
    .then(v => v && { keep: v === 'keep' ? list.filter(b => one || ticks.get(b).checked) : [] });
}

// Write the mark after each kept name (from the end of each box backwards, so the places found still hold) and
// remember the ignored ones, as one Undo step
function decide(keep, ignore) {
  const label = keep.length ? `DM allowed: ${keep.map(b => b.name).join(', ')}` : `Ignored beyond the rules: ${ignore.map(b => b.name).join(', ')}`;
  const fresh = keep.map(b => (C.beyond || []).find(x => x.id === b.id && !x.kept)).filter(Boolean); // where they are now
  S.transaction(label, () => {
    for (const b of fresh.sort((x, y) => y.at - x.at)) {
      const v = String(S.get(b.field) ?? '');
      S.set(b.field, `${v.slice(0, b.at)} ${S.dmMark}${v.slice(b.at)}`);
    }
    if (ignore.length) window.sheetState.beyondIgnored = [...new Set([...ignored(), ...ignore.map(b => b.id)])];
  });
}

document.addEventListener('character-change', () => later());
document.addEventListener('focusout', e => { if (e.target.closest?.('#pages')) later(); });
// Undo / Redo brought something back: don't ask about it again right away
document.addEventListener('history-replay', () => { clearTimeout(timer); for (const b of open()) dismissed.add(b.id); });
document.addEventListener('sheet-loaded', () => { dismissed.clear(); later(); });
})();
