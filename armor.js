/* D&D 2024 Basic Rules — armor and shield (Equipment chapter). Condensed; game content (c) Wizards of the Coast.
   Fields: category, ac (base AC), dex ('full' = add Dex mod, 'max2' = add Dex mod up to +2, 'none'), minStr (speed -10 ft if lower),
   stealthDisadv, lb, gp */
window.DND = window.DND || {};

DND.armor = [
  { name: 'Padded Armor',          category: 'light',  ac: 11, dex: 'full', minStr: 0,  stealthDisadv: true,  lb: 8,  gp: 5 },
  { name: 'Leather Armor',         category: 'light',  ac: 11, dex: 'full', minStr: 0,  stealthDisadv: false, lb: 10, gp: 10 },
  { name: 'Studded Leather Armor', category: 'light',  ac: 12, dex: 'full', minStr: 0,  stealthDisadv: false, lb: 13, gp: 45 },
  { name: 'Hide Armor',            category: 'medium', ac: 12, dex: 'max2', minStr: 0,  stealthDisadv: false, lb: 12, gp: 10 },
  { name: 'Chain Shirt',           category: 'medium', ac: 13, dex: 'max2', minStr: 0,  stealthDisadv: false, lb: 20, gp: 50 },
  { name: 'Scale Mail',            category: 'medium', ac: 14, dex: 'max2', minStr: 0,  stealthDisadv: true,  lb: 45, gp: 50 },
  { name: 'Breastplate',           category: 'medium', ac: 14, dex: 'max2', minStr: 0,  stealthDisadv: false, lb: 20, gp: 400 },
  { name: 'Half Plate Armor',      category: 'medium', ac: 15, dex: 'max2', minStr: 0,  stealthDisadv: true,  lb: 40, gp: 750 },
  { name: 'Ring Mail',             category: 'heavy',  ac: 14, dex: 'none', minStr: 0,  stealthDisadv: true,  lb: 40, gp: 30 },
  { name: 'Chain Mail',            category: 'heavy',  ac: 16, dex: 'none', minStr: 13, stealthDisadv: true,  lb: 55, gp: 75 },
  { name: 'Splint Armor',          category: 'heavy',  ac: 17, dex: 'none', minStr: 15, stealthDisadv: true,  lb: 60, gp: 200 },
  { name: 'Plate Armor',           category: 'heavy',  ac: 18, dex: 'none', minStr: 15, stealthDisadv: true,  lb: 65, gp: 1500 }
];

DND.shield = { name: 'Shield', acBonus: 2, lb: 6, gp: 10, donDoff: 'Utilize action' };

DND.armorRules = {
  donDoff: { light: '1 minute to don, 1 minute to doff', medium: '5 minutes to don, 1 minute to doff', heavy: '10 minutes to don, 5 minutes to doff' },
  training: 'Wearing armor without training: Disadvantage on every D20 Test that uses STR or DEX, and you cannot cast spells. A Shield only gives its AC bonus if you have training with it.',
  oneAtATime: 'Only one suit of armor and one Shield at a time.',
  unarmoredAc: '10 + DEX modifier (class features like Barbarian/Monk Unarmored Defense replace this)'
};