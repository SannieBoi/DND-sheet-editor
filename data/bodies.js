/* Heights, weights and lifespans for the sheet maker's Details step (placeholders, the weight buttons, the lifespan line).
   sizes: the usual height of each size, in feet (Tiny's starts at 1 ft: "under 2 ft").
   species[name]:
     heights: { Size: [min ft, max ft] } = the 2024 rules' "about X-Y feet tall" (the free-rules species and the Aasimar).
     table: [base height (in), height dice, base weight (lb), weight multiplier (dice or a number)] = the random height and
       weight table of the 2014-era books: height = base + dice; weight = base weight + (the dice rolled) x multiplier.
       Its heights are the species' own size's range when `heights` doesn't name it (Small for Small-only species, else
       Medium); its weights give the build (scaled by height squared for other heights). No table = a human build.
     age: [adult at, lives to about] in years, or a sentence.   like: another entry to copy (its fields, then this one's).
   Sources: the 2024 heights from the SRD 5.2.1; the tables and lifespans from the 2014-era books (Player's Handbook,
   Volo's Guide to Monsters, Mordenkainen's Tome of Foes, Elemental Evil Player's Companion, Eberron: Rising from the Last
   War, Guildmasters' Guide to Ravnica, Mythic Odysseys of Theros, Locathah Rising, One Grung Above, The Tortle Package);
   numbers only (see CREDITS.md). Species missing here get the plain size ranges and a human build. */
window.DND = window.DND || {};

DND.bodies = {
  sizes: { Tiny: [1, 2], Small: [2, 4], Medium: [4, 8], Large: [8, 16] },
  human: [56, '2d10', 110, '2d4'],
  species: {
    // The free rules (2024 heights) and the Player's Handbook
    Dragonborn: { heights: { Medium: [5, 7] }, table: [66, '2d8', 175, '2d6'], age: [15, 80] },
    Dwarf: { heights: { Medium: [4, 5] }, table: [46, '2d4', 122, '2d6'], age: [50, 350] }, // between the hill and mountain rows
    Elf: { heights: { Medium: [5, 6] }, table: [54, '2d10', 90, '1d4'], age: [100, 750] },
    Gnome: { heights: { Small: [3, 4] }, table: [35, '2d4', 35, 1], age: [40, 500] },
    Goliath: { heights: { Medium: [7, 8] }, table: [74, '2d10', 200, '2d6'], age: [18, 100] },
    Halfling: { heights: { Small: [2, 3] }, table: [31, '2d4', 35, 1], age: [20, 150] },
    Human: { heights: { Medium: [4, 7], Small: [2, 4] }, table: [56, '2d10', 110, '2d4'], age: [18, 100] },
    Orc: { heights: { Medium: [6, 7] }, table: [64, '2d8', 175, '2d6'], age: [12, 50] },
    Tiefling: { heights: { Medium: [4, 7], Small: [3, 4] }, table: [57, '2d8', 110, '2d4'], age: [18, 110] },
    Aasimar: { heights: { Medium: [4, 7], Small: [2, 4] }, table: [56, '2d10', 110, '2d4'], age: [18, 160] },
    // Older books' tables
    'Half-Elf': { table: [57, '2d8', 110, '2d4'], age: [20, 180] },
    'Half-Orc': { table: [58, '2d10', 140, '2d6'], age: [14, 75] },
    'Feral Tiefling': { like: 'Tiefling' },
    Khoravar: { like: 'Half-Elf' },
    Aarakocra: { table: [51, '2d8', 70, '1d4'], age: [3, 30] },
    'Air Genasi': { table: [56, '2d10', 110, '2d4'] },
    'Earth Genasi': { like: 'Air Genasi' }, 'Fire Genasi': { like: 'Air Genasi' }, 'Water Genasi': { like: 'Air Genasi' },
    Bugbear: { table: [72, '2d12', 200, '2d6'], age: [16, 80] },
    Centaur: { table: [72, '1d10', 600, '2d12'], age: [18, 100] },
    Changeling: { table: [61, '2d4', 115, '2d4'], age: 'Grows up a little faster than a human and lives about as long (a century or less).' },
    'Lorwyn Changeling': { like: 'Changeling', age: null },
    'Deep Gnome': { like: 'Gnome', age: [25, 250] },
    Duergar: { like: 'Dwarf' },
    Eladrin: { like: 'Elf', table: [54, '2d12', 90, '1d4'] },
    'Sea Elf': { like: 'Elf', table: [54, '2d8', 90, '1d4'] },
    'Shadar-kai': { like: 'Elf', table: [56, '2d8', 90, '1d4'] },
    'Astral Elf': { like: 'Elf', age: null },
    'Lorwyn-Shadowmoor Elf': { like: 'Elf', age: null },
    Firbolg: { table: [74, '2d12', 175, '2d6'], age: [30, 500] },
    Goblin: { table: [41, '2d4', 35, 1], age: [8, 60] },
    Grung: { table: [31, '2d4', 25, 1], age: [1, 50] },
    Hobgoblin: { table: [56, '2d10', 110, '2d4'], age: [18, 100] },
    Kalashtar: { table: [64, '2d6', 110, '1d6'], age: [18, 100] },
    Kenku: { table: [52, '2d8', 50, '1d6'], age: [12, 60] },
    Kobold: { table: [25, '2d4', 25, 1], age: [6, 120] },
    Leonin: { table: [66, '2d10', 180, '2d6'], age: [18, 100] },
    Lizardfolk: { table: [57, '2d10', 120, '2d6'], age: [14, 60] },
    Locathah: { age: [10, 80] },
    Loxodon: { table: [82, '2d6', 310, '2d4'], age: [18, 450] },
    Minotaur: { table: [64, '2d8', 175, '2d6'], age: [17, 150] },
    Satyr: { table: [56, '2d8', 100, '2d4'], age: [18, 100] },
    Shifter: { table: [54, '2d8', 90, '2d4'], age: [10, 70] },
    'Simic Hybrid': { table: [56, '2d10', 110, '2d4'], age: 'Ages like the species it was made from (human, elf or vedalken).' },
    Tabaxi: { table: [58, '2d10', 90, '2d4'], age: [18, 100] },
    Tortle: { table: [58, '2d8', 400, '2d4'], age: [15, 50] },
    Triton: { table: [54, '2d10', 90, '2d4'], age: [15, 200] },
    Vedalken: { table: [66, '2d8', 150, '2d4'], age: [40, 500] },
    Warforged: { table: [70, '2d6', 270, 4], age: 'Made, not born, already grown. No limit to their lifespan is known yet (the oldest are about 30).' },
    'Yuan-ti': { table: [56, '2d10', 110, '2d4'], age: [18, 100] },
  },
};
