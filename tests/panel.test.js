// The roller panel's layout (roller.js, styles.css): the log entry's "?" (gold, centred), the grip between the buttons
// and the rolls (drag up = taller, arrow keys, double-click = default, remembered), and the column view (#logSide: the
// rolls in a column left of the buttons, the panel and the sheet's room follow, the grip on the panel's left edge sets
// the column's width), and back. A narrow window (760 px or less) has no column view: the button hides there.
// window: 1400,700
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const $ = id => document.getElementById(id);
const box = id => $(id).getBoundingClientRect();
const ptr = (type, x, y) => $('logGrip').dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, button: 0, pointerId: 7, bubbles: true }));
const key = k => $('logGrip').dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
(async () => { try {
  document.body.prepend(pre);
  // the panel slides in when it opens: measure it where it ends up
  document.head.append(Object.assign(document.createElement('style'), { textContent: '#roller, main { transition: none !important; }' }));
  window.roller.save('STR', 'Strength save');
  await wait(50);

  // ---- the "?" -----------------------------------------------------------------------------------------------------
  const q = document.querySelector('#rollLog .roll .whybtn'), cs = getComputedStyle(q);
  ok(q && cs.display === 'grid' && /Arial/.test(cs.fontFamily) && cs.color === 'rgb(255, 216, 107)' && q.offsetWidth === q.offsetHeight,
    'the "?" is a round gold button, its mark centred (grid, Arial): ' + [cs.display, cs.fontFamily, cs.color, q.offsetWidth, q.offsetHeight].join(' / '));

  // ---- the grip: resize the rolls -----------------------------------------------------------------------------------
  const grip = $('logGrip');
  ok(grip.previousElementSibling === $('rollPick') && grip.nextElementSibling === $('logHead') && grip.getAttribute('role') === 'separator' &&
    grip.getAttribute('aria-orientation') === 'horizontal' && getComputedStyle(grip).cursor === 'row-resize', 'a grip between the buttons and the rolls (row-resize)');
  const h0 = $('rollLog').offsetHeight, g = box('logGrip'), y = g.top + g.height / 2, x = g.left + g.width / 2;
  ptr('pointerdown', x, y);
  ok(grip.classList.contains('drag') && document.body.classList.contains('log-dragging'), 'dragging: the grip lights up');
  ptr('pointermove', x, y - 25); ptr('pointermove', x, y - 50); ptr('pointerup', x, y - 50);
  const h1 = $('rollLog').offsetHeight, room = $('roller').clientHeight - $('rollGuide').offsetHeight - $('rollActions').offsetHeight - $('logHead').offsetHeight - 60;
  ok(Math.abs(h1 - Math.min(h0 + 50, room)) <= 1 && $('roller').classList.contains('log-sized') && localStorage.getItem('roll-log-h') === String(h1) && !grip.classList.contains('drag'),
    `dragged up 50 px: the rolls ${h0} -> ${h1} px (room for ${room}), remembered`);
  ptr('pointerdown', x, y - 50); ptr('pointermove', x, y + 2000); ptr('pointerup', x, y + 2000);
  ok($('rollLog').offsetHeight === 80 && localStorage.getItem('roll-log-h') === '80', 'dragged far down: no smaller than 80 px (' + $('rollLog').offsetHeight + ')');
  key('ArrowUp');
  ok($('rollLog').offsetHeight === 100, 'Arrow Up: 20 px taller (' + $('rollLog').offsetHeight + ')');
  ptr('pointerdown', x, y); ptr('pointermove', x, y - 5000); ptr('pointerup', x, y - 5000);
  ok(box('rollPick').height >= 59 && box('logHead').top > box('rollActions').bottom, 'dragged far up: the buttons keep some room (' + Math.round(box('rollPick').height) + ' px)');
  grip.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
  ok(!$('roller').classList.contains('log-sized') && localStorage.getItem('roll-log-h') === '' && $('rollLog').offsetHeight === h0, 'double-click: back to the default size');

  // ---- the column view ------------------------------------------------------------------------------------------------
  const side = $('logSide'), pad0 = parseFloat(getComputedStyle(document.querySelector('main')).paddingRight);
  ok(side && side.parentElement === $('logHead') && side.nextElementSibling === $('clearLog') && side.getAttribute('aria-pressed') === 'false', 'a column button next to Clear');
  side.click();
  ok(document.body.classList.contains('roll-side') && side.getAttribute('aria-pressed') === 'true' && localStorage.getItem('roll-side') === '1' && /back under/.test(side.title),
    'pressed: the column view (remembered)');
  if (innerWidth > 760) {
    const L = box('rollLog'), P = box('rollPick'), R = box('roller');
    ok(L.right <= P.left + 1 && L.left >= R.left - 1 && Math.abs(L.top - box('rollActions').top) <= 1 && L.bottom >= P.bottom - 1,
      'the rolls are a column left of the buttons, as tall as the panel below its head');
    ok(Math.abs(box('logHead').top - box('rollGuide').top) <= 1 && Math.abs(P.width - 380) <= 2 && R.width > 600, 'the head beside the switch; the buttons keep 380 px; the panel is wider: ' + Math.round(R.width));
    const pad1 = parseFloat(getComputedStyle(document.querySelector('main')).paddingRight);
    ok(pad1 - pad0 >= L.width - 2, `the sheet makes room (${pad0} -> ${pad1} px)`);
    ok(grip.getAttribute('aria-orientation') === 'vertical' && getComputedStyle(grip).cursor === 'col-resize' && Math.abs(box('logGrip').left + 4 - box('roller').left) <= 1,
      'the grip is the panel\'s left edge (col-resize): ' + [box('logGrip').left, box('roller').left].join(' / '));
    const w0 = L.width, gx = box('logGrip').left + 4, gy = R.top + 200, want = Math.max(240, Math.min(w0 + 60, innerWidth - P.width - 280));
    ptr('pointerdown', gx, gy); ptr('pointermove', gx - 60, gy); ptr('pointerup', gx - 60, gy);
    ok(Math.abs(box('rollLog').width - want) <= 1 && localStorage.getItem('roll-log-w') === String(Math.round(want)),
      `dragged left 60 px: the column ${Math.round(w0)} -> ${Math.round(box('rollLog').width)} px (window ${innerWidth}: at most ${innerWidth - Math.round(P.width) - 280}, at least 240)`);
    grip.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
    ok(localStorage.getItem('roll-log-w') === '' && !document.documentElement.style.getPropertyValue('--log-w'), 'double-click: the default width');
  } else log('(window ' + innerWidth + ' px: narrow, the column view is off there)');
  side.click();
  ok(!document.body.classList.contains('roll-side') && localStorage.getItem('roll-side') === '0' && grip.getAttribute('aria-orientation') === 'horizontal' &&
    box('rollLog').top > box('rollPick').bottom - 1 && Math.abs(parseFloat(getComputedStyle(document.querySelector('main')).paddingRight) - pad0) < 1,
    'pressed again: the rolls back under the buttons, the sheet as before');
} catch (e) { log('ERROR ' + e.message + '\n' + e.stack); } })();
