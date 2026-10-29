/* A small question in the middle of the screen, shared by every script (window.ask):
     await ask({ title, text, body (extra element), buttons: [{ label, value, primary }] })
   resolves to the clicked button's value, or null when closed with Escape or a click outside. With one button it is
   just a message. The buttons only answer; the caller decides what happens, so nothing changes behind the user's back. */
(() => {
'use strict';
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

window.ask = ({ title, text, body = null, buttons = [{ label: 'OK', value: true, primary: true }] }) => new Promise(resolve => {
  const back = h('div', { class: 'ask-back' });
  const done = value => { back.remove(); removeEventListener('keydown', key, true); resolve(value); };
  const key = e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } };
  back.append(h('div', { class: 'ask', role: 'alertdialog', 'aria-modal': 'true', 'aria-label': title },
    h('h3', {}, title), text ? h('p', {}, text) : null, body,
    h('div', { class: 'ask-row' }, buttons.map(b => h('button', { class: 'btn' + (b.primary ? ' primary' : ''), onclick: () => done(b.value) }, b.label)))));
  back.addEventListener('mousedown', e => { if (e.target === back) done(null); });
  addEventListener('keydown', key, true);
  document.body.append(back);
  (back.querySelector('.btn.primary') || back.querySelector('.btn')).focus();
});

/* A window that is not modal and can be dragged by its title bar (level up, rests): window.draggable(win, handle)
   returns place(x, y), which keeps at least the bar on screen. Offsets are used, not the bounding box: that one moves
   while the window pops in. place() with no numbers = where windows open: centred, as high as it goes (12px, the
   margin the CSS max-height leaves), so a tall window's buttons at the bottom are on screen too. */
window.draggable = (win, handle) => {
  const place = win.place = (x = (innerWidth - win.offsetWidth) / 2, y = 12) => {
    win.style.left = Math.max(120 - win.offsetWidth, Math.min(innerWidth - 120, x)) + 'px';
    win.style.top = Math.max(0, Math.min(innerHeight - 44, y)) + 'px';
  };
  handle.addEventListener('pointerdown', e => {
    if (e.button !== 0 || e.target.closest('button')) return;
    const dx = e.clientX - win.offsetLeft, dy = e.clientY - win.offsetTop;
    try { handle.setPointerCapture(e.pointerId); } catch { /* not a real pointer */ }
    win.classList.add('dragging');
    const move = ev => place(ev.clientX - dx, ev.clientY - dy);
    const up = () => { win.classList.remove('dragging'); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); handle.removeEventListener('pointercancel', up); };
    handle.addEventListener('pointermove', move);
    handle.addEventListener('pointerup', up);
    handle.addEventListener('pointercancel', up);
    e.preventDefault();
  });
  return place;
};
addEventListener('resize', () => { for (const w of document.querySelectorAll('.lu')) w.place?.(w.offsetLeft, w.offsetTop); });

/* A choice card (a .lu-card button) with a round ▾ button on the right of its title that drops down a few lines about the
   thing (window.aboutCard): aboutCard(card, { open, label, info: [strings or elements], toggle }) returns the card in a
   wrapper (a button can't hold another button). The lines go at the end of the card, so its usual text stays where it was.
   The caller keeps which cards are open and redraws in toggle(). */
let opened = null; // the card that just opened: only its lines slide in (a redraw doesn't replay that)
window.aboutCard = (card, { open, label, info, toggle }) => {
  const lines = (info || []).filter(Boolean);
  if (!lines.length) return card;
  if (open) {
    card.classList.add('open');
    card.append(h('span', { class: 'lu-about' + (opened === label ? ' fresh' : '') }, lines.map(x => typeof x === 'string' ? h('span', {}, x) : x)));
    if (opened === label) opened = null;
  }
  return h('div', { class: 'lu-cardwrap' + (open ? ' open' : '') }, card,
    h('button', { class: 'lu-more', 'aria-expanded': String(!!open), 'aria-label': `About ${label}`, title: open ? 'Hide' : `About ${label}`,
      onclick: () => { opened = open ? null : label; toggle(); } }, '▾'));
};

/* A search box low in a window: as you type, the window scrolls it up near its top, so what it finds shows right under it.
   When the window is too short to scroll that far, empty room is added at its end (.lu-room; a redraw of the same step
   keeps it, see render() in levelup.js / maker.js). Fewer results don't pull the window back down either: the room grows
   to keep the place. */
const SEARCH = '.lu-body input[type=search]';
let before = null, goal = null; // goal: where the last move takes that window (the smooth scroll takes a moment)
document.addEventListener('input', e => { // capture: before the box's own handler changes the list
  before = e.target.matches?.(SEARCH) ? e.target.closest('.lu-body').scrollTop : null;
}, true);
document.addEventListener('input', e => {
  if (before == null) return;
  const q = e.target.isConnected ? e.target : document.activeElement; // the maker redraws the whole step on each key
  const body = q?.matches(SEARCH) && q.closest('.lu-body');
  if (!body) return;
  let room = body.querySelector(':scope > .lu-room');
  if (!room) { room = body.appendChild(h('div', { class: 'lu-room', 'aria-hidden': 'true' })); goal = null; } // another step
  const content = body.scrollHeight - room.offsetHeight, top = el => el.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop;
  const near = q.closest('.lu-pick, .lu-feat'), anchor = near && top(q) - top(near) < Math.min(140, body.clientHeight / 4) ? near : q; // its heading too, when close
  const low = top(q) - before > body.clientHeight * .4;
  if (low) goal = { body, top: Math.max(0, top(anchor) - 8) };
  const keep = Math.max(before, goal?.body === body ? goal.top : 0);
  room.style.height = Math.max(0, keep + body.clientHeight - content) + 'px';
  if (low) body.scrollTo({ top: goal.top, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  else if (body.scrollTop < before) body.scrollTop = before; // the list got shorter: stay where you were
});
})();
