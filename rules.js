/* D&D 2024 Basic Rules - general numbers and formulas for attack/damage rolls (condensed; (c) Wizards of the Coast).
   Skills come from the SRD 5.2.1 data (CC-BY-4.0). Formulas are written in plain language for use in code. */
window.DND = window.DND || {};

DND.rules = {
  abilities: { STR: 'Strength', DEX: 'Dexterity', CON: 'Constitution', INT: 'Intelligence', WIS: 'Wisdom', CHA: 'Charisma' },
  abilityModifier: 'floor((score - 10) / 2)',
  proficiencyBonusByLevel: [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 6, 6, 6, 6], // index 0 = level 1
  damageTypes: ['Acid', 'Bludgeoning', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Piercing', 'Poison', 'Psychic', 'Radiant', 'Slashing', 'Thunder'],
  skills: [{"name":"Acrobatics","ability":"DEX"},{"name":"Animal Handling","ability":"WIS"},{"name":"Arcana","ability":"INT"},{"name":"Athletics","ability":"STR"},{"name":"Deception","ability":"CHA"},{"name":"History","ability":"INT"},{"name":"Insight","ability":"WIS"},{"name":"Intimidation","ability":"CHA"},{"name":"Investigation","ability":"INT"},{"name":"Medicine","ability":"WIS"},{"name":"Nature","ability":"INT"},{"name":"Perception","ability":"WIS"},{"name":"Performance","ability":"CHA"},{"name":"Persuasion","ability":"CHA"},{"name":"Religion","ability":"INT"},{"name":"Sleight of Hand","ability":"DEX"},{"name":"Stealth","ability":"DEX"},{"name":"Survival","ability":"WIS"}],
  weaponAttack: {
    toHit: 'd20 + ability modifier + Proficiency Bonus (only if proficient with the weapon) + other bonuses (e.g. Archery +2)',
    damage: 'weapon damage dice + the same ability modifier used for the attack (+ extras such as Rage Damage, Sneak Attack, Divine Smite)',
    abilityUsed: 'Melee = STR, Ranged = DEX. Finesse weapons: STR or DEX (your choice, same for attack and damage). A thrown Melee weapon uses the same ability as in melee (STR, or DEX if Finesse).',
    noModifierOnDamage: 'The extra attack from the Light property (unless negative, or you have Two Weapon Fighting) and the second hit from Cleave do not add the ability modifier to damage.'
  },
  spellAttack: { toHit: 'd20 + spellcasting ability modifier + Proficiency Bonus', saveDC: '8 + spellcasting ability modifier + Proficiency Bonus' },
  // From the general rules (2024) rather than the pages fetched for this file; double-check against the Rules Glossary if it matters.
  unarmedStrike: { name: 'Unarmed Strike', kind: 'melee', damage: '1 + STR modifier', dmg: 'bludgeoning', proficient: 'always', note: 'Monks replace the damage with the Martial Arts die; Rage Damage applies to Strength-based unarmed strikes.' },
  cantripScaling: { damageDiceAtLevel: [[1, 1], [5, 2], [11, 3], [17, 4]], note: 'Damage cantrips roll 1 / 2 / 3 / 4 dice at character level 1 / 5 / 11 / 17.' },

  // ---- Level advancement ("Creating a Character" chapter) ----
  // XP needed to reach each level (index 0 = level 1). Level is by total character level, also when multiclassing.
  xpByLevel: [0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000, 85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000],
  bonusFeatXp: { after: 355000, every: 30000, note: 'Optional (DM): at level 20, one feat (Epic Boons suit best) per 30,000 XP above 355,000.' },
  hitPoints: {
    level1: 'Hit Die maximum + CON modifier (only when your total character level is 1; a new class later uses the per-level rule)',
    // Each new level: roll the class Hit Die + CON modifier (minimum 1), or take the fixed value. Fixed value by Hit Die size:
    fixedByDie: { 6: 4, 8: 5, 10: 6, 12: 7 },
    minimumGain: 1,
    conChange: 'When the CON modifier changes, the Hit Point maximum changes by that amount for every character level.',
    hitDice: 'One Hit Die per level, of the class\'s die size; different sizes are tracked separately when multiclassing.'
  },
  levelUpSteps: [
    'Choose a class: the same one, or a new one using the multiclassing rules.',
    'Hit Points: roll the class Hit Die + CON modifier (min 1) or take the fixed value; gain one Hit Die.',
    'Record the new class features for your new level in that class and make any choices they offer.',
    'Proficiency Bonus: update everything that uses it when it rises (levels 5, 9, 13, 17).',
    'Ability scores: if a feat raises a score to an even number, update everything that uses that modifier.'
  ],
  multiclass: {
    minScore: 13, // in the primary ability of the new class AND of every class you already have (classes.js multiclass.requires)
    proficiencies: 'Only some of the new class\'s starting proficiencies (classes.js multiclass); no saving throws.',
    proficiencyBonus: 'By total character level.',
    extraAttack: 'Extra Attack from more than one class does not stack (only Fighter features such as Two Extra Attacks go past two attacks).',
    armorClass: 'Only one alternative AC calculation (Unarmored Defense, Draconic Resilience...) at a time.',
    cantrips: 'Cantrip damage scales with total character level.',
    preparedSpells: 'Each class prepares spells on its own, as if single-classed; each spell uses its class\'s spellcasting ability.',
    // Spell slots when you have Spellcasting from 2+ classes: add up the caster levels, then read slotsByCasterLevel.
    casterLevel: { full: 1, half: 0.5, halfRounding: 'up', third: 1 / 3, thirdRounding: 'down', note: 'Full: Bard, Cleric, Druid, Sorcerer, Wizard. Half (round up): Paladin, Ranger. Third (round down): Eldritch Knight / Arcane Trickster (not in the free rules). Warlock Pact Magic slots stay separate but can cast either class\'s spells.' },
    slotsByCasterLevel: [ // index 0 = caster level 1; slots for spell levels 1-9
      [2, 0, 0, 0, 0, 0, 0, 0, 0], [3, 0, 0, 0, 0, 0, 0, 0, 0], [4, 2, 0, 0, 0, 0, 0, 0, 0], [4, 3, 0, 0, 0, 0, 0, 0, 0], [4, 3, 2, 0, 0, 0, 0, 0, 0],
      [4, 3, 3, 0, 0, 0, 0, 0, 0], [4, 3, 3, 1, 0, 0, 0, 0, 0], [4, 3, 3, 2, 0, 0, 0, 0, 0], [4, 3, 3, 3, 1, 0, 0, 0, 0], [4, 3, 3, 3, 2, 0, 0, 0, 0],
      [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 0, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 0, 0], [4, 3, 3, 3, 2, 1, 1, 1, 0],
      [4, 3, 3, 3, 2, 1, 1, 1, 0], [4, 3, 3, 3, 2, 1, 1, 1, 1], [4, 3, 3, 3, 3, 1, 1, 1, 1], [4, 3, 3, 3, 3, 2, 1, 1, 1], [4, 3, 3, 3, 3, 2, 2, 1, 1]
    ]
  },
  // Background ability scores: +2/+1 or +1/+1/+1 among the background's three, none above 20.
  backgroundAbilityIncrease: { options: [[2, 1], [1, 1, 1]], max: 20 }
};