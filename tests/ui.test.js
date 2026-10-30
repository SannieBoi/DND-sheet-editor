// The look and feel: our own scrollbars, the ▾ info on the sheet maker's cards (and on Level 1's class cards), what a class is
// about when multiclassing, the species search at the top of its step, a search box low in a window moving up as you type
// (with room added below it), and the sheet's suggestions opening above a box near the bottom of the window.
const out = [], pre = document.createElement('pre'); pre.id = 'out';
const log = (...a) => { out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')); pre.textContent = out.join('\n'); };
const ok = (cond, msg) => log((cond ? 'PASS ' : 'FAIL ') + msg);
const wait = ms => new Promise(r => setTimeout(r, ms));
const yieldTask = () => new Promise(r => { const c = new MessageChannel(); c.port1.onmessage = () => r(); c.port2.postMessage(0); });
const until = async (cond, n = 3e6) => { for (let i = 0; i < n && !cond(); i++) await yieldTask(); return cond(); };
const inp = n => document.querySelector('[data-field="' + n + '"]');
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const errors = [];
addEventListener('error', e => errors.push(e.message));
// headless Edge starts a smooth scroll but never finishes it: scroll at once here
const realScrollTo = Element.prototype.scrollTo;
Element.prototype.scrollTo = function (o, y) { return typeof o === 'object' ? realScrollTo.call(this, { ...o, behavior: 'auto' }) : realScrollTo.call(this, o, y); };

const W = () => document.getElementById('lvlup'), MK = () => document.getElementById('maker');
const btnIn = (root, text) => root && [...root.querySelectorAll('button')].find(b => b.textContent.trim().startsWith(text));
const body = () => W().querySelector('.lu-body');
const step = name => [...W().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const mkStep = name => [...MK().querySelectorAll('.lu-steps button')].find(b => b.textContent.endsWith(name)).click();
const cardIn = (root, t) => [...root.querySelectorAll('.lu-card')].find(b => b.querySelector('b')?.firstChild.textContent === t);
const moreOf = (root, t) => cardIn(root, t)?.parentElement.querySelector('.lu-more');
const aboutOf = (root, t) => cardIn(root, t)?.querySelector('.lu-about');
const feat = name => [...body().querySelectorAll('.lu-feat')].find(s => s.querySelector('.lu-fh b')?.textContent === name);
// in view inside a scrolling box
const inView = (el, box) => { const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(); return r.top >= b.top - 1 && r.bottom <= b.bottom + 1; };
// where an element sits in a scrolling box's content, and in what can be seen of it
const topIn = (el, box) => el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop;
const settle = async box => { let last = -1; for (let i = 0; i < 80 && box.scrollTop !== last; i++) { last = box.scrollTop; await wait(50); } };
const typeIn = (el, v) => { el.focus(); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };

async function loadSheet(o) {
  const doc = await PDFLib.PDFDocument.create(), form = doc.getForm(), page = doc.addPage([612, 792]);
  const add = (name, x, y, w, v = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (v) f.setText(v); f.addToPage(page, { x, y, width: w, height: h }); };
  add('CharacterName', 20, 750, 150, 'Ui'); add('ClassLevel', 200, 750, 160, o.cls || ''); add('Race ', 380, 750, 120, o.race);
  [['STR', 14], ['DEX', 14], ['CON', 14], ['INT', 14], ['WIS', 12], ['CHA', 12]].forEach(([ab, s], i) => {
    add(ab, 20, 700 - i * 30, 30, String(s)); add(ab === 'CHA' ? 'CHamod' : ab + 'mod', 60, 700 - i * 30, 30, '+' + Math.floor((s - 10) / 2));
  });
  add('ProfBonus', 20, 500, 30, o.cls ? '+2' : ''); add('HPMax', 60, 500, 30, o.cls ? '28' : ''); add('HPCurrent', 100, 500, 30, o.cls ? '28' : ''); add('Speed', 140, 500, 30, '30');
  add('Features and Traits', 300, 300, 250, o.features || '', true, 200);
  add('Background', 20, 30, 150, ''); // low on the page: its suggestions open above it
  const dt = new DataTransfer(); dt.items.add(new File([await doc.save()], 'ui.pdf', { type: 'application/pdf' }));
  let loaded = false;
  document.addEventListener('sheet-loaded', () => { loaded = true; }, { once: true });
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  await until(() => loaded);
  if (!loaded) throw new Error('sheet did not load');
  await wait(20);
}

(async () => { try {
  document.body.prepend(pre);
  // ---- 1. the data: a few lines about every class, background and species with rules
  const classes = Object.values(DND.classes), full = DND.species.filter(s => !s.brief);
  ok(classes.length === 14 && classes.every(c => c.summary), `every class says what it is about (${classes.filter(c => c.summary).length}/${classes.length})`);
  ok(DND.backgrounds.length === 16 && DND.backgrounds.every(b => b.summary), `every background too (${DND.backgrounds.filter(b => b.summary).length}/16)`);
  ok(full.every(s => s.summary) && DND.species.every(s => !s.brief || !s.summary), `every species with rules too (${full.filter(s => s.summary).length}/${full.length}); names-only ones don't`);

  // ---- 2. our own scrollbars: nothing switches them off (scrollbar-width / -color would, in Chromium)
  const css = [...document.styleSheets].flatMap(s => { try { return [...s.cssRules]; } catch { return []; } });
  if (css.length) ok(['::-webkit-scrollbar', '::-webkit-scrollbar-thumb', '::-webkit-scrollbar-thumb:hover'].every(sel => css.some(r => r.selectorText === sel)), 'the scrollbar rules are in the stylesheet');
  else log('NOTE the stylesheet rules could not be read here (file://)');
  const plain = el => { const cs = getComputedStyle(el); return cs.scrollbarWidth === 'auto' && cs.scrollbarColor === 'auto'; };
  ok([document.documentElement, document.getElementById('rollLog'), document.getElementById('rollPick'), document.getElementById('effects')].every(el => el && plain(el)),
    'the page, the roll log and pick list and the effects tray draw our scrollbars');

  // ---- 3. the sheet maker: a ▾ on every class card opens what the class is about, without choosing it
  document.getElementById('newSheet').click(); await wait(20);
  ok(getComputedStyle(MK().querySelector('.lu-steps')).flexShrink === '0' && plain(MK().querySelector('.lu-body')), 'the step bar never gets squeezed; the window body has our scrollbar');
  mkStep('Class');
  const wraps = MK().querySelectorAll('.lu-cardwrap');
  ok(wraps.length === 14 && [...wraps].every(w => w.querySelector(':scope > .lu-card') && w.querySelector(':scope > .lu-more')), '14 class cards, each with a ▾ button beside its title');
  moreOf(MK(), 'Cleric').click(); await wait(5);
  ok(aboutOf(MK(), 'Cleric')?.textContent.startsWith(DND.classes.cleric.summary) && /Level 1: .*Spellcasting.*\. Subclass at level 3\./.test(aboutOf(MK(), 'Cleric').textContent),
    "Cleric's ▾: what the class is about, its level 1 features and its subclass level");
  ok(!window.maker.state.cls && !cardIn(MK(), 'Cleric').classList.contains('on'), '... without choosing the Cleric');
  ok(moreOf(MK(), 'Cleric').getAttribute('aria-expanded') === 'true' && moreOf(MK(), 'Wizard').getAttribute('aria-expanded') === 'false' && !aboutOf(MK(), 'Wizard'),
    'only that card opens (aria-expanded follows)');
  cardIn(MK(), 'Cleric').click(); await wait(5);
  ok(window.maker.state.cls === 'cleric' && aboutOf(MK(), 'Cleric'), 'clicking the card itself chooses it; its info stays open');
  moreOf(MK(), 'Cleric').click(); await wait(5);
  ok(!aboutOf(MK(), 'Cleric') && cardIn(MK(), 'Cleric').classList.contains('on'), 'the ▾ again closes it; the Cleric stays chosen');
  moreOf(MK(), 'Blood Hunter').click(); await wait(5);
  ok(/Hemocraft/.test(aboutOf(MK(), 'Blood Hunter')?.textContent || ''), 'the Blood Hunter has its info too');

  mkStep('Background');
  moreOf(MK(), 'Acolyte').click(); await wait(5);
  ok(aboutOf(MK(), 'Acolyte')?.textContent.startsWith(DND.backgrounds.find(b => b.name === 'Acolyte').summary) && /Magic Initiate \(Cleric\): Learn/.test(aboutOf(MK(), 'Acolyte').textContent),
    "Acolyte's ▾: what the background is about and what its feat does");
  moreOf(MK(), 'Custom background').click(); await wait(5);
  ok(/Creating a Background.*Feat: one Origin feat\..*Equipment: worth 50 GP, unspent gold included\. No Martial weapons or armor/.test(aboutOf(MK(), 'Custom background')?.textContent || ''),
    "the custom background's ▾: the Dungeon Master's Guide's rules for one");
  mkStep('Equipment');
  moreOf(MK(), 'Option A').click(); await wait(5);
  ok(/Priest's Pack: Backpack, Blanket, Holy Water/.test(aboutOf(MK(), 'Option A')?.textContent || ''), "an equipment option's ▾ lists what is in its pack");
  ok(!cardIn(MK(), 'Option B').parentElement.classList.contains('lu-cardwrap'), 'an option without a pack has no ▾');

  // ---- 4. the species step: the search at the top, results right under it; species info with their traits
  mkStep('Species');
  const q = () => MK().querySelector('.mk-q'), mb = MK().querySelector('.lu-body');
  ok(q() && q().compareDocumentPosition(mb.querySelector('.lu-cards')) & Node.DOCUMENT_POSITION_FOLLOWING, 'the species search sits at the top, above the cards');
  moreOf(MK(), 'Elf').click(); await wait(5);
  ok(aboutOf(MK(), 'Elf')?.textContent.startsWith(DND.species.find(s => s.name === 'Elf').summary) && /Fey Ancestry: Advantage on saves/.test(aboutOf(MK(), 'Elf').textContent),
    "Elf's ▾: what the species is like and each trait");
  typeIn(q(), 'tortle'); await wait(5);
  const first = mb.querySelector('.lu-cards .lu-card');
  ok(first?.querySelector('b').firstChild.textContent === 'Tortle' && inView(q(), mb) && inView(first, mb), 'typing shows the Tortle right under the search, both in view');
  ok(document.activeElement === q() && q().value === 'tortle', 'the search keeps the focus while the step redraws');
  typeIn(q(), 'elf'); await wait(5);
  const names = [...mb.querySelectorAll('.lu-cards .lu-card')].map(c => c.querySelector('b').firstChild.textContent);
  ok(names[0] === 'Elf' && ['Sea Elf', 'Astral Elf', 'Half-Elf', 'Khoravar', 'Lorwyn-Shadowmoor Elf'].every(n => names.includes(n)) && aboutOf(MK(), 'Elf'),
    'a search finds every species, the free rules\' ones too (best match first); an open ▾ stays open');
  typeIn(q(), 'e'); await wait(5);
  ok(mb.querySelectorAll('.lu-cards .lu-card').length === 30 && /\d+ more match: type more of the name/.test(mb.textContent), 'more than 30 matches: 30 shown and a note');
  typeIn(q(), 'hobbit'); await wait(5);
  cardIn(MK(), 'Hobbit').click(); await wait(5);
  moreOf(MK(), 'Hobbit').click(); await wait(5);
  ok(/isn't on wikidot, so only the names of its traits are in the data/.test(aboutOf(MK(), 'Hobbit')?.textContent || ''), "a names-only species' ▾ says only its trait names are known");
  typeIn(q(), ''); await wait(5);
  ok(mb.querySelector('.lu-cards').querySelectorAll('.lu-card').length === 10 && mb.querySelector('.mk-chosen') && cardIn(mb.querySelector('.mk-chosen'), 'Hobbit')?.classList.contains('on'),
    'an empty search: the ten cards again, and the chosen Hobbit below them');

  // ---- 5. Level 1 from the header (no class on the sheet): the class cards have the ▾ too
  await loadSheet({ race: 'Human' });
  ok(!MK(), 'opening a sheet closes the maker');
  window.levelUp.start(); await wait(20);
  moreOf(W(), 'Wizard').click(); await wait(5);
  ok(aboutOf(W(), 'Wizard')?.textContent === DND.classes.wizard.summary && !cardIn(W(), 'Wizard').classList.contains('on'), "Level 1's class cards: the ▾ opens what the class is about");

  // ---- 6. a search low in the window moves up as you type, with room below; fewer results don't pull it back down
  cardIn(W(), 'Fighter').click(); await wait(5);
  step('Features'); await wait(5);
  const b = body(), s = () => [...b.querySelectorAll('.lu-feat .lu-search')].at(-1), sec = () => s().closest('.lu-feat');
  b.scrollTop = Math.max(0, topIn(s(), b) - b.clientHeight * .85);
  const from = topIn(s(), b) - b.scrollTop;
  typeIn(s(), 'alert'); await settle(b);
  const to = topIn(s(), b) - b.scrollTop;
  ok(from > b.clientHeight * .5 && to < b.clientHeight * .3, `a feat search low in the window moves up as you type (${Math.round(from)} -> ${Math.round(to)} px from the top of ${b.clientHeight})`);
  ok(cardIn(sec(), 'Alert') && inView(s(), b) && inView(cardIn(sec(), 'Alert'), b), 'what it found shows right under it');
  const at = b.scrollTop;
  typeIn(s(), 'alertzz'); await settle(b);
  ok(Math.abs(b.scrollTop - at) <= 1, 'fewer results (none): the window stays put');
  typeIn(s(), 'alert'); await settle(b);
  cardIn(sec(), 'Alert').click(); await wait(20);
  ok(Math.abs(b.scrollTop - at) <= 2 && cardIn(sec(), 'Alert').classList.contains('on'), 'choosing what it found redraws without a jump');
  typeIn(s(), 'tough'); await settle(b);
  moreOf(sec(), 'Tough').click(); await wait(5);
  ok(/Book: Player's Handbook \(2024\)\./.test(aboutOf(sec(), 'Tough')?.textContent || '') && cardIn(sec(), 'Tough').classList.contains('open') && !cardIn(sec(), 'Tough').classList.contains('on'),
    "a feat card's ▾: its whole summary and its book, without choosing it");
  ok(cardIn(sec(), 'Alert').classList.contains('on') && s().value === 'tough', 'the chosen feat and the search stay');
  W().querySelector('.lu-x').click(); await wait(10);
  btnIn(document.querySelector('.ask'), 'Throw away').click(); await wait(10);
  // the last spell search of a new Wizard: when it finds nothing, little is left under it, so room is added to keep it up
  window.levelUp.start({ key: 'wizard' }); await wait(20);
  step('Spells'); await wait(5);
  const b2 = body(), s2 = () => [...b2.querySelectorAll('.lu-pick .lu-search')].at(-1);
  b2.scrollTop = Math.max(0, topIn(s2(), b2) - b2.clientHeight * .85);
  const from2 = topIn(s2(), b2) - b2.scrollTop;
  typeIn(s2(), 'zzzz'); await settle(b2);
  const room2 = b2.querySelector(':scope > .lu-room')?.offsetHeight || 0, to2 = topIn(s2(), b2) - b2.scrollTop;
  ok(from2 > b2.clientHeight * .5 && to2 < b2.clientHeight * .3 && room2 > 0, `a spell search with nothing found still moves up: room added at the end (${Math.round(room2)} px)`);
  const at2 = b2.scrollTop;
  typeIn(s2(), 'magic'); await settle(b2);
  const found2 = [...s2().closest('.lu-pick').querySelectorAll('.lu-spell')][0];
  ok(Math.abs(b2.scrollTop - at2) <= 1 && found2 && inView(found2, b2), `typing on: it stays, and the spells it finds show under it (${found2?.querySelector('b').textContent})`);
  typeIn(s2(), ''); await wait(5);
  const list = s2().closest('.lu-pick').querySelector('.lu-spells'), spellNamed = n => [...list.querySelectorAll('.lu-spell')].find(x => x.querySelector('b').textContent === n);
  list.scrollTop = spellNamed('Magic Missile').getBoundingClientRect().top - list.getBoundingClientRect().top - 20; const listAt = list.scrollTop;
  spellNamed('Magic Missile').parentElement.querySelector('.lu-more').click(); await wait(5);
  const mm = spellNamed('Magic Missile');
  ok(/Casting: Action · 120 feet/.test(mm.querySelector('.lu-about')?.textContent || '') && /dart/.test(mm.querySelector('.lu-about').textContent) && !mm.classList.contains('on'),
    "a spell's ▾: casting time, range, components, duration and its text, without picking it");
  ok(Math.abs(list.scrollTop - listAt) <= 1 && listAt > 0, `the spell list stays where it was (${listAt} px down)`);
  step('Hit Points'); await wait(5);
  ok(!body().querySelector('.lu-room'), 'another step: the room is gone');
  W().querySelector('.lu-x').click(); await wait(10);
  btnIn(document.querySelector('.ask'), 'Throw away').click(); await wait(10);

  // ---- 7. multiclassing: what the new class is about under the picks
  type('ClassLevel', 'Fighter 3'); await wait(10);
  document.getElementById('levelUp').click(); await wait(10);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(20);
  cardIn(W(), 'A new class (multiclass)').click(); await wait(5);
  const pickedName = W().querySelector('.lu-opts .lu-opt.on b')?.textContent, key = Object.keys(DND.classes).find(k => DND.classes[k].name === pickedName);
  ok(key && W().querySelector('.lu-blurb')?.textContent === DND.classes[key].summary, `multiclassing into ${pickedName}: what the class is about`);
  const optWrap = n => [...W().querySelectorAll('.lu-opts .lu-cardwrap')].find(w => w.querySelector('.lu-opt b')?.textContent === n);
  optWrap('Wizard').querySelector('.lu-more').click(); await wait(5);
  ok(/Multiclassing:/.test(optWrap('Wizard').querySelector('.lu-about')?.textContent || '') && optWrap('Wizard').classList.contains('open') && pickedName === W().querySelector('.lu-opts .lu-opt.on b')?.textContent,
    "a multiclass option's ▾: the class and its multiclassing rules, without choosing it");
  ok(optWrap('Wizard').offsetWidth > optWrap('Cleric').offsetWidth * 1.5, 'an open option takes the whole row');
  moreOf(W(), 'Fighter 3 → 4').click(); await wait(5);
  ok(/Ability Score Improvement:/.test(aboutOf(W(), 'Fighter 3 → 4')?.textContent || ''), "the class card's ▾: what the next level's features do");
  W().querySelector('.lu-x').click(); await wait(10);
  btnIn(document.querySelector('.ask'), 'Throw away')?.click(); await wait(10);

  // invocations: clipped on the button, all of it (and what it needs) under the ▾
  type('ClassLevel', 'Warlock 1'); await wait(10);
  document.getElementById('levelUp').click(); await wait(10);
  btnIn(document.querySelector('.ask'), 'Level up').click(); await wait(20);
  step('Features'); await wait(5);
  const invWrap = () => [...body().querySelectorAll('.lu-cardwrap')].find(w => w.querySelector('.lu-opt b')?.textContent === 'Agonizing Blast');
  ok(invWrap() && /…$/.test(invWrap().querySelector('small.clip')?.textContent || ''), 'a long invocation text is clipped on its button');
  invWrap().querySelector('.lu-more').click(); await wait(5);
  ok(getComputedStyle(invWrap().querySelector('small.clip')).display === 'none' && /Needs: Warlock level 2\+/.test(invWrap().querySelector('.lu-about')?.textContent || '')
    && invWrap().querySelector('.lu-about').textContent.includes(DND.classes.warlock.invocations.find(i => i.name === 'Agonizing Blast').text), 'its ▾: the whole text and what it needs');
  W().querySelector('.lu-x').click(); await wait(10);
  btnIn(document.querySelector('.ask'), 'Throw away')?.click(); await wait(10);

  // ---- 8. the sheet's suggestions: under a box, or above it near the bottom of the window
  const box = document.getElementById('suggest');
  scrollTo(0, 0); scrollBy(0, inp('Race ').getBoundingClientRect().top - 120); await wait(10);
  type('Race ', 'El'); await wait(10);
  ok(!box.hidden && box.getBoundingClientRect().top >= inp('Race ').getBoundingClientRect().bottom - 1, 'suggestions open under a box near the top');
  inp('Race ').blur(); type('Race ', 'Human'); inp('Race ').blur(); await wait(5);
  const bg = inp('Background');
  scrollBy(0, bg.getBoundingClientRect().bottom - innerHeight + 30); await wait(10);
  const room = innerHeight - bg.getBoundingClientRect().bottom;
  type('Background', 's'); await wait(10);
  ok(!box.hidden && box.offsetHeight > room && box.getBoundingClientRect().bottom <= bg.getBoundingClientRect().top + 1,
    `near the bottom (${Math.round(room)} px left below it) they open above the box`);
  bg.blur();

  ok(!errors.length, 'no errors' + (errors.length ? ': ' + errors.join(' | ') : ''));
} catch (err) { log('ERROR', err.stack); }
document.title = 'DONE';
})();
