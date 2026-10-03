/* D&D 2024 Basic Rules — weapons, weapon properties, mastery properties, attack-related gear.
   Compiled from the D&D Beyond Basic Rules (2024) Equipment chapter; descriptions are condensed paraphrases,
   numbers/names are as listed. Credits: see CREDITS.md.
   Weapon fields: category, kind, dice (damage), dmg (damage type), props, mastery, lb (weight), gp (cost in gold)
   Optional: thrown [normal,long], range [normal,long] + ammo, versatile (two-handed damage), note */
window.DND = window.DND || {};

DND.weapons = [
  // ---- Simple Melee ----
  { name: 'Club',         category: 'simple',  kind: 'melee',  dice: '1d4',  dmg: 'bludgeoning', props: ['light'], mastery: 'slow', lb: 2, gp: 0.1 },
  { name: 'Dagger',       category: 'simple',  kind: 'melee',  dice: '1d4',  dmg: 'piercing',    props: ['finesse', 'light', 'thrown'], thrown: [20, 60], mastery: 'nick', lb: 1, gp: 2 },
  { name: 'Greatclub',    category: 'simple',  kind: 'melee',  dice: '1d8',  dmg: 'bludgeoning', props: ['two-handed'], mastery: 'push', lb: 10, gp: 0.2 },
  { name: 'Handaxe',      category: 'simple',  kind: 'melee',  dice: '1d6',  dmg: 'slashing',    props: ['light', 'thrown'], thrown: [20, 60], mastery: 'vex', lb: 2, gp: 5 },
  { name: 'Javelin',      category: 'simple',  kind: 'melee',  dice: '1d6',  dmg: 'piercing',    props: ['thrown'], thrown: [30, 120], mastery: 'slow', lb: 2, gp: 0.5 },
  { name: 'Light Hammer', category: 'simple',  kind: 'melee',  dice: '1d4',  dmg: 'bludgeoning', props: ['light', 'thrown'], thrown: [20, 60], mastery: 'nick', lb: 2, gp: 2 },
  { name: 'Mace',         category: 'simple',  kind: 'melee',  dice: '1d6',  dmg: 'bludgeoning', props: [], mastery: 'sap', lb: 4, gp: 5 },
  { name: 'Quarterstaff', category: 'simple',  kind: 'melee',  dice: '1d6',  dmg: 'bludgeoning', props: ['versatile'], versatile: '1d8', mastery: 'topple', lb: 4, gp: 0.2 },
  { name: 'Sickle',       category: 'simple',  kind: 'melee',  dice: '1d4',  dmg: 'slashing',    props: ['light'], mastery: 'nick', lb: 2, gp: 1 },
  { name: 'Spear',        category: 'simple',  kind: 'melee',  dice: '1d6',  dmg: 'piercing',    props: ['thrown', 'versatile'], thrown: [20, 60], versatile: '1d8', mastery: 'sap', lb: 3, gp: 1 },
  // ---- Simple Ranged ----
  { name: 'Dart',           category: 'simple', kind: 'ranged', dice: '1d4', dmg: 'piercing',    props: ['finesse', 'thrown'], thrown: [20, 60], mastery: 'vex', lb: 0.25, gp: 0.05 },
  { name: 'Light Crossbow', category: 'simple', kind: 'ranged', dice: '1d8', dmg: 'piercing',    props: ['ammunition', 'loading', 'two-handed'], range: [80, 320], ammo: 'Bolt', mastery: 'slow', lb: 5, gp: 25 },
  { name: 'Shortbow',       category: 'simple', kind: 'ranged', dice: '1d6', dmg: 'piercing',    props: ['ammunition', 'two-handed'], range: [80, 320], ammo: 'Arrow', mastery: 'vex', lb: 2, gp: 25 },
  { name: 'Sling',          category: 'simple', kind: 'ranged', dice: '1d4', dmg: 'bludgeoning', props: ['ammunition'], range: [30, 120], ammo: 'Bullet', mastery: 'slow', lb: 0, gp: 0.1 },
  // ---- Martial Melee ----
  { name: 'Battleaxe',   category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'slashing',    props: ['versatile'], versatile: '1d10', mastery: 'topple', lb: 4, gp: 10 },
  { name: 'Flail',       category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'bludgeoning', props: [], mastery: 'sap', lb: 2, gp: 10 },
  { name: 'Glaive',      category: 'martial', kind: 'melee', dice: '1d10', dmg: 'slashing',    props: ['heavy', 'reach', 'two-handed'], mastery: 'graze', lb: 6, gp: 20 },
  { name: 'Greataxe',    category: 'martial', kind: 'melee', dice: '1d12', dmg: 'slashing',    props: ['heavy', 'two-handed'], mastery: 'cleave', lb: 7, gp: 30 },
  { name: 'Greatsword',  category: 'martial', kind: 'melee', dice: '2d6',  dmg: 'slashing',    props: ['heavy', 'two-handed'], mastery: 'graze', lb: 6, gp: 50 },
  { name: 'Halberd',     category: 'martial', kind: 'melee', dice: '1d10', dmg: 'slashing',    props: ['heavy', 'reach', 'two-handed'], mastery: 'cleave', lb: 6, gp: 20 },
  { name: 'Lance',       category: 'martial', kind: 'melee', dice: '1d10', dmg: 'piercing',    props: ['heavy', 'reach', 'two-handed'], mastery: 'topple', lb: 6, gp: 10, note: 'Not two-handed while mounted' },
  { name: 'Longsword',   category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'slashing',    props: ['versatile'], versatile: '1d10', mastery: 'sap', lb: 3, gp: 15 },
  { name: 'Maul',        category: 'martial', kind: 'melee', dice: '2d6',  dmg: 'bludgeoning', props: ['heavy', 'two-handed'], mastery: 'topple', lb: 10, gp: 10 },
  { name: 'Morningstar', category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'piercing',    props: [], mastery: 'sap', lb: 4, gp: 15 },
  { name: 'Pike',        category: 'martial', kind: 'melee', dice: '1d10', dmg: 'piercing',    props: ['heavy', 'reach', 'two-handed'], mastery: 'push', lb: 18, gp: 5 },
  { name: 'Rapier',      category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'piercing',    props: ['finesse'], mastery: 'vex', lb: 2, gp: 25 },
  { name: 'Scimitar',    category: 'martial', kind: 'melee', dice: '1d6',  dmg: 'slashing',    props: ['finesse', 'light'], mastery: 'nick', lb: 3, gp: 25 },
  { name: 'Shortsword',  category: 'martial', kind: 'melee', dice: '1d6',  dmg: 'piercing',    props: ['finesse', 'light'], mastery: 'vex', lb: 2, gp: 10 },
  { name: 'Trident',     category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'piercing',    props: ['thrown', 'versatile'], thrown: [20, 60], versatile: '1d10', mastery: 'topple', lb: 4, gp: 5 },
  { name: 'Warhammer',   category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'bludgeoning', props: ['versatile'], versatile: '1d10', mastery: 'push', lb: 5, gp: 15 },
  { name: 'War Pick',    category: 'martial', kind: 'melee', dice: '1d8',  dmg: 'piercing',    props: ['versatile'], versatile: '1d10', mastery: 'sap', lb: 2, gp: 5 },
  { name: 'Whip',        category: 'martial', kind: 'melee', dice: '1d4',  dmg: 'slashing',    props: ['finesse', 'reach'], mastery: 'slow', lb: 3, gp: 2 },
  // ---- Martial Ranged ----
  { name: 'Blowgun',        category: 'martial', kind: 'ranged', dice: '1',    dmg: 'piercing', props: ['ammunition', 'loading'], range: [25, 100], ammo: 'Needle', mastery: 'vex', lb: 1, gp: 10 },
  { name: 'Hand Crossbow',  category: 'martial', kind: 'ranged', dice: '1d6',  dmg: 'piercing', props: ['ammunition', 'light', 'loading'], range: [30, 120], ammo: 'Bolt', mastery: 'vex', lb: 3, gp: 75 },
  { name: 'Heavy Crossbow', category: 'martial', kind: 'ranged', dice: '1d10', dmg: 'piercing', props: ['ammunition', 'heavy', 'loading', 'two-handed'], range: [100, 400], ammo: 'Bolt', mastery: 'push', lb: 18, gp: 50 },
  { name: 'Longbow',        category: 'martial', kind: 'ranged', dice: '1d8',  dmg: 'piercing', props: ['ammunition', 'heavy', 'two-handed'], range: [150, 600], ammo: 'Arrow', mastery: 'slow', lb: 2, gp: 50 },
  { name: 'Musket',         category: 'martial', kind: 'ranged', dice: '1d12', dmg: 'piercing', props: ['ammunition', 'loading', 'two-handed'], range: [40, 120], ammo: 'Bullet', mastery: 'slow', lb: 10, gp: 500 },
  { name: 'Pistol',         category: 'martial', kind: 'ranged', dice: '1d10', dmg: 'piercing', props: ['ammunition', 'loading'], range: [30, 90], ammo: 'Bullet', mastery: 'vex', lb: 3, gp: 250 }
];

// Anyone can wield a weapon, but you only add your Proficiency Bonus to the attack roll if proficient.
DND.weaponProperties = {
  ammunition: 'Ranged attack needs ammo; each attack uses one piece. Drawing it is part of the attack (free hand needed to load a one-handed weapon). After a fight, 1 minute recovers half the ammo used (round down).',
  finesse:    'Use STR or DEX modifier for attack and damage (same one for both rolls).',
  heavy:      'Disadvantage on attack rolls if melee and STR < 13, or ranged and DEX < 13.',
  light:      'After attacking with a Light weapon on the Attack action, make one extra attack as a Bonus Action with a DIFFERENT Light weapon; no ability modifier added to its damage unless the modifier is negative.',
  loading:    'Only one piece of ammo fired per action/bonus action/reaction, regardless of how many attacks you normally get.',
  range:      'Two numbers: normal range / long range (ft). Beyond normal range = Disadvantage; beyond long range = cannot attack.',
  reach:      'Adds 5 ft to your reach with this weapon, including for opportunity attacks.',
  thrown:     'Can be thrown for a ranged attack (draw it as part of the attack). A thrown melee weapon uses the same ability modifier as a melee attack with it.',
  'two-handed': 'Needs two hands to attack with it.',
  versatile:  'Use one or two hands. The listed damage applies when used two-handed for a melee attack.'
};

// Mastery properties are only usable if a feature (e.g. Weapon Mastery) unlocks that weapon's property for you.
DND.masteryProperties = {
  cleave: 'On a melee hit, make a melee attack against a 2nd creature within 5 ft of the first and in your reach. On a hit it takes the weapon damage but WITHOUT your ability modifier (unless negative). Once per turn.',
  graze:  'If your attack roll misses, deal damage equal to the ability modifier you used for the attack (same damage type; only increased by raising the modifier).',
  nick:   'The extra attack of the Light property can be made as part of the Attack action instead of as a Bonus Action. Once per turn.',
  push:   'On a hit, push the target up to 10 ft straight away from you if it is Large or smaller.',
  sap:    'On a hit, the target has Disadvantage on its next attack roll before the start of your next turn.',
  slow:   'On a hit that deals damage, reduce the target Speed by 10 ft until the start of your next turn (multiple hits do not stack beyond 10 ft).',
  topple: 'On a hit, target makes a CON save (DC = 8 + ability modifier used for the attack + your Proficiency Bonus) or falls Prone.',
  vex:    'On a hit that deals damage, you have Advantage on your next attack roll against that creature before the end of your next turn.'
};

DND.ammunition = [
  { name: 'Arrows',          amount: 20, storage: 'Quiver',          lb: 1,   gp: 1 },
  { name: 'Bolts',           amount: 20, storage: 'Bolt Case',       lb: 1.5, gp: 1 },
  { name: 'Bullets, Firearm', amount: 10, storage: 'Pouch',          lb: 2,   gp: 3 },
  { name: 'Bullets, Sling',   amount: 20, storage: 'Pouch',          lb: 1.5, gp: 0.04 },
  { name: 'Needles',          amount: 50, storage: 'Pouch',          lb: 1,   gp: 1 }
];

// Items that replace one of your attacks (Attack action) or add damage. Save DC = 8 + DEX mod + Proficiency Bonus where noted.
DND.attackItems = [
  { name: 'Acid',            gp: 25,  use: 'Replace an attack: throw at creature/object within 20 ft', save: 'DEX', damage: '2d6 acid' },
  { name: "Alchemist's Fire", gp: 50, use: 'Replace an attack: throw at creature/object within 20 ft', save: 'DEX', damage: '1d4 fire + target starts burning' },
  { name: 'Holy Water',      gp: 25,  use: 'Replace an attack: throw at creature within 20 ft', save: 'DEX', damage: '2d8 radiant, only vs Fiends/Undead' },
  { name: 'Net',             gp: 1,   use: 'Replace an attack: throw at creature within 15 ft', save: 'DEX', damage: 'none; Restrained (auto-succeeds if Huge+). Escape DC 10 STR (Athletics); Net AC 10, 5 HP' },
  { name: 'Oil (thrown)',    gp: 0.1, use: 'Replace an attack: douse creature/object within 20 ft', save: 'DEX', damage: '+5 fire if it later takes fire damage within 1 min' },
  { name: 'Basic Poison',    gp: 100, use: 'Bonus Action to coat 1 weapon or up to 3 ammo; lasts 1 min or until damage dealt', save: null, damage: '+1d4 poison on piercing/slashing damage' },
  { name: 'Torch',           gp: 0.01, use: 'Attack with it as a Simple Melee weapon', save: null, damage: '1 fire on hit' },
  { name: 'Spell Scroll (Cantrip/Lvl 1)', gp: 30, use: 'Cast the scroll spell if on your class list', save: null, damage: 'If it needs a save DC = 13; attack bonus = +5' }
];

DND.coins = { cp: 0.01, sp: 0.1, ep: 0.5, gp: 1, pp: 10 }; // value in GP