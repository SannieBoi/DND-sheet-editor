/* D&D 2024 Basic Rules - character creation (the sheet maker, app/maker.js): ability score methods, languages, alignments,
   the contents of the equipment packs, the kinds of tools you can pick, and starting at a higher level.
   Source: D&D Beyond Basic Rules (2024) / SRD 5.2.1 (CC-BY-4.0, see CREDITS.md): "Creating a Character" and "Equipment",
   checked against the source on 2026-10-04. */
window.DND = window.DND || {};

DND.creation = {
  standardArray: [15, 14, 13, 12, 10, 8],
  // Standard Array by Class: STR, DEX, CON, INT, WIS, CHA
  standardArrayByClass: {
    barbarian: [15, 13, 14, 10, 12, 8], bard: [8, 14, 12, 13, 10, 15], cleric: [14, 8, 13, 10, 15, 12], druid: [8, 12, 14, 13, 15, 10],
    fighter: [15, 14, 13, 8, 10, 12], monk: [12, 15, 13, 10, 14, 8], paladin: [15, 10, 13, 8, 12, 14], ranger: [12, 15, 13, 8, 14, 10],
    rogue: [12, 15, 13, 14, 10, 8], sorcerer: [10, 13, 14, 8, 12, 15], warlock: [8, 14, 13, 12, 10, 15], wizard: [8, 12, 13, 15, 14, 10]
  },
  // Point Cost: 27 points, scores 8-15
  pointBuy: { budget: 27, cost: { 8: 0, 9: 1, 10: 2, 11: 3, 12: 4, 13: 5, 14: 7, 15: 9 } },
  // Every character knows Common plus two Standard languages; rare ones come from features (or your DM)
  languages: {
    count: 2,
    standard: ['Common Sign Language', 'Draconic', 'Dwarvish', 'Elvish', 'Giant', 'Gnomish', 'Goblin', 'Halfling', 'Orc'],
    rare: ['Abyssal', 'Celestial', 'Deep Speech', 'Druidic', 'Infernal', 'Primordial', 'Sylvan', "Thieves' Cant", 'Undercommon']
  },
  alignments: ['Lawful Good', 'Neutral Good', 'Chaotic Good', 'Lawful Neutral', 'Neutral', 'Chaotic Neutral', 'Lawful Evil', 'Neutral Evil', 'Chaotic Evil', 'Unaligned'],
  // Equipment packs and what is in them
  packs: {
    "Burglar's Pack": ['Backpack', 'Ball Bearings', 'Bell', '10 Candles', 'Crowbar', 'Hooded Lantern', '7 flasks of Oil', '5 days of Rations', 'Rope', 'Tinderbox', 'Waterskin'],
    "Diplomat's Pack": ['Chest', 'Fine Clothes', 'Ink', '5 Ink Pens', 'Lamp', '2 Map or Scroll Cases', '4 flasks of Oil', '5 sheets of Paper', '5 sheets of Parchment', 'Perfume', 'Tinderbox'],
    "Dungeoneer's Pack": ['Backpack', 'Caltrops', 'Crowbar', '2 flasks of Oil', '10 days of Rations', 'Rope', 'Tinderbox', '10 Torches', 'Waterskin'],
    "Entertainer's Pack": ['Backpack', 'Bedroll', 'Bell', 'Bullseye Lantern', '3 Costumes', 'Mirror', '8 flasks of Oil', '9 days of Rations', 'Tinderbox', 'Waterskin'],
    "Explorer's Pack": ['Backpack', 'Bedroll', '2 flasks of Oil', '10 days of Rations', 'Rope', 'Tinderbox', '10 Torches', 'Waterskin'],
    "Priest's Pack": ['Backpack', 'Blanket', 'Holy Water', 'Lamp', '7 days of Rations', 'Robe', 'Tinderbox'],
    "Scholar's Pack": ['Backpack', 'Book', 'Ink', 'Ink Pen', 'Lamp', '10 flasks of Oil', '10 sheets of Parchment', 'Tinderbox']
  },
  // "one kind of ..." tools
  toolKinds: {
    "Artisan's Tools": ["Alchemist's Supplies", "Brewer's Supplies", "Calligrapher's Supplies", "Carpenter's Tools", "Cartographer's Tools",
      "Cobbler's Tools", "Cook's Utensils", "Glassblower's Tools", "Jeweler's Tools", "Leatherworker's Tools", "Mason's Tools", "Painter's Supplies",
      "Potter's Tools", "Smith's Tools", "Tinker's Tools", "Weaver's Tools", "Woodcarver's Tools"],
    'Musical Instrument': ['Bagpipes', 'Drum', 'Dulcimer', 'Flute', 'Horn', 'Lute', 'Lyre', 'Pan Flute', 'Shawm', 'Viol'],
    'Gaming Set': ['Dice', 'Dragonchess', 'Playing Cards', 'Three-Dragon Ante']
  },
  // Starting Equipment at Higher Levels (the DM decides): from level, extra money (gp + dice × per), magic items
  higherLevels: [
    { from: 2, gp: 0, items: '1 Common' },
    { from: 5, gp: 500, dice: '1d10', per: 25, items: '1 Common, 1 Uncommon' },
    { from: 11, gp: 5000, dice: '1d10', per: 250, items: '2 Common, 3 Uncommon, 1 Rare' },
    { from: 17, gp: 20000, dice: '1d10', per: 250, items: '2 Common, 4 Uncommon, 3 Rare, 1 Very Rare' }
  ]
};
