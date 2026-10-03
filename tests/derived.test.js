
const out = []; const log = (...a) => out.push(a.map(x => typeof x === 'string' ? x : JSON.stringify(x)).join(' '));
const wait = ms => new Promise(r => setTimeout(r, ms));
const inp = n => document.querySelector('[data-field="' + n + '"]');
const val = n => inp(n).type === 'checkbox' ? inp(n).checked : inp(n).value;
const type = (n, v) => { const el = inp(n); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); };
const tick = (n, on) => { const el = inp(n); el.checked = on; el.dispatchEvent(new Event('change', { bubbles: true })); };
const expect = (label, want) => {
  const bad = Object.entries(want).filter(([n, v]) => val(n) !== v).map(([n, v]) => `${n.trim()}=${JSON.stringify(val(n))} (want ${JSON.stringify(v)})`);
  log((bad.length ? 'FAIL ' : 'PASS ') + label + (bad.length ? ': ' + bad.join(', ') : ''));
};
(async () => { try {
  const doc = await PDFLib.PDFDocument.create(), page = doc.addPage([612, 792]), form = doc.getForm();
  const add = (name, x, y, w, val = '', multi = false, h = 16) => { const f = form.createTextField(name); if (multi) f.enableMultiline(); if (val) f.setText(val); f.addToPage(page, { x, y, width: w, height: h }); };
  const box = (name, x, y, on) => { const f = form.createCheckBox(name); f.addToPage(page, { x, y: y + 3, width: 10, height: 10 }); if (on) f.check(); };
  add('ClassLevel', 200, 750, 120, 'Rogue 4'); add('Race ', 340, 750, 100, 'Human');
  add('STR', 20, 700, 30, '10'); add('STRmod', 60, 700, 30);
  add('DEX', 20, 670, 30, '14'); add('DEXmod', 60, 670, 30, '+2');
  add('CON', 20, 640, 30, '14'); add('CONmod', 60, 640, 30, '+2');
  add('INT', 20, 610, 30, '10'); add('INTmod', 60, 610, 30, '+0');
  add('WIS', 20, 580, 30, '10'); add('WISmod', 60, 580, 30, '+0');
  add('ProfBonus', 20, 540, 30, '+2'); add('Initiative', 60, 540, 30, '+2'); add('Passive', 100, 540, 30, '12');
  add('AC', 140, 540, 30, '15'); add('HPMax', 180, 540, 30, '31');
  const rows = [['Stealth ', true, '+6'], ['Acrobatics', false, '+2'], ['SleightofHand', true, '+4'], ['Perception ', true, '+2'], ['ST Dexterity', true, '+4']];
  rows.forEach(([n, on, v], i) => { box('Check Box ' + (11 + i), 80, 480 - i * 20, on); add(n, 95, 480 - i * 20, 30, v); });
  add('Insight', 95, 370, 30, '+0'); add('Investigation ', 95, 350, 30, '+4'); add('Athletics', 95, 330, 30);
  add('Wpn Name', 200, 480, 120, 'Rapier'); add('Wpn1 AtkBonus', 330, 480, 40, '+4'); add('Wpn1 Damage', 380, 480, 120, '1d8+2 piercing');
  add('Wpn Name 2', 200, 458, 120, 'Shortbow'); add('Wpn2 AtkBonus ', 330, 458, 40); add('Wpn2 Damage ', 380, 458, 120);
  add('Equipment', 300, 200, 200, 'Leather Armor, Shield, thieves\' tools', true, 80);
  const file = new File([await doc.save()], 't.pdf', { type: 'application/pdf' });
  const dt = new DataTransfer(); dt.items.add(file);
  dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true }));
  for (let i = 0; i < 100 && !(character.weapons && character.weapons.length); i++) await wait(50);

  expect('loading changes nothing', { 'DEXmod': '+2', 'Stealth ': '+6', 'AC': '15', 'Wpn1 AtkBonus': '+4' });
  type('DEX', '16');
  expect('DEX 14 -> 16', { 'DEXmod': '+3', 'Stealth ': '+7', 'Acrobatics': '+3', 'SleightofHand': '+5', 'ST Dexterity': '+5',
    'Initiative': '+3', 'AC': '16', 'Passive': '12', 'Wpn1 AtkBonus': '+5', 'Wpn1 Damage': '1d8+3 piercing',
    'Wpn2 AtkBonus ': '+5', 'Wpn2 Damage ': '1d6+3 piercing' });
  type('ClassLevel', 'Rogue 5');
  expect('Rogue 4 -> 5 (PB +2 -> +3)', { 'ProfBonus': '+3', 'Stealth ': '+9', 'SleightofHand': '+6', 'Acrobatics': '+3', 'ST Dexterity': '+6',
    'Perception ': '+3', 'Passive': '13', 'Investigation ': '+6', 'Insight': '+0', 'Initiative': '+3', 'Wpn1 AtkBonus': '+6', 'HPMax': '31' });
  tick('Check Box 12', true);
  expect('tick Acrobatics proficiency', { 'Acrobatics': '+6' });
  tick('Check Box 11', false);
  expect('untick Stealth (had Expertise)', { 'Stealth ': '+3' });
  tick('Check Box 11', true);
  expect('tick Stealth again', { 'Stealth ': '+6' });
  type('CON', '16');
  expect('CON 14 -> 16: HP max + 1 per level', { 'CONmod': '+3', 'HPMax': '36' });
  type('DEXmod', '+1');
  expect('DEX modifier typed directly (+3 -> +1)', { 'DEX': '16', 'Stealth ': '+4', 'AC': '14', 'Initiative': '+1', 'Wpn1 AtkBonus': '+4', 'Wpn1 Damage': '1d8+1 piercing' });
  type('Stealth ', '+5');  // user adds a +1 item; next DEX change keeps it
  type('DEX', '18');
  expect('custom +1 in Stealth kept after DEX 18', { 'DEXmod': '+4', 'Stealth ': '+8', 'AC': '17' });
  type('STR', '14');
  expect('empty boxes get filled', { 'STRmod': '+2', 'Athletics': '+2' });
  type('WIS', '');
  type('WIS', '12');
  expect('clearing then retyping a score', { 'WISmod': '+1', 'Perception ': '+4', 'Passive': '14' });
  // typing a level digit by digit: "Rogue 1" then "Rogue 11"
  type('ClassLevel', 'Rogue 1'); type('ClassLevel', 'Rogue 11');
  expect('Rogue 5 -> 1 -> 11 while typing', { 'ProfBonus': '+4', 'Acrobatics': '+8', 'Insight': '+1' });
  log('character AC rule armor check: AC=' + val('AC'));
} catch (err) { log('ERROR', err.stack); }
const pre = document.createElement('pre'); pre.id = 'out'; pre.textContent = out.join('\n'); document.body.prepend(pre);
document.title = 'DONE';
})();
