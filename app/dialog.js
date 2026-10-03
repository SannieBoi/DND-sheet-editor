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
})();
