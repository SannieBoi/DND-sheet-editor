/* More feats, beyond the 17 in the free rules (feats.js): the rest of the 2024 Player's Handbook, and the 2024 books
   Eberron: Forge of the Artificer, Forgotten Realms: Heroes of Faerûn and Lorwyn: First Light. Same shape as feats.js, plus:
   source: the book.  brief: true = only what D&D Beyond's public feat list shows (name, category, ability increase, the
   names of its parts); the rules themselves are in the book, so the summary says so instead of guessing.
   prerequisite also takes: armor ('Light' | 'Medium' | 'Heavy' | 'Shields' training), text (shown, not checked).  abilityIncrease.choose 'noSaveProf' = an ability whose save you aren't
   proficient in (Resilient: grants.saveForIncrease gives that save).  unsure: the list doesn't say which scores.
   choice types (levelup.js): tools {count, kind}, featSpells {fixed, count ('pb' = Proficiency Bonus), levels, schools,
   ritual}, skillOrExpertise {count, from} (proficiency, or Expertise if you have it), skillExpert, allSkills,
   damageType {count, from}, weaponMastery {count}.  grants: hpPerLevel, hpMax, speed, armor, weapons, tools.
   unless: text that contains the name but isn't the feat (e.g. "Blessed Healer"), ignored when reading the sheet.
   Player's Handbook summaries are short plain-language notes in our own words (see CREDITS.md). */
window.DND = window.DND || {};

(() => {
const PHB = "Player's Handbook (2024)", FOTA = 'Eberron: Forge of the Artificer', HOF = 'Forgotten Realms: Heroes of Faerûn', LORWYN = 'Lorwyn: First Light';
const L4 = { minimum_level: 4 }, L19 = { minimum_level: 19 };
const one = (choose, max = 20) => ({ amount: 1, choose, max });
const MENTAL = ['INT', 'WIS', 'CHA'], STRDEX = ['STR', 'DEX'];

const phb = [
  // Origin feats
  {"name":"Crafter","type":"origin","summary":"Proficiency with three Artisan's Tools. 20% off nonmagical items you buy. After a Long Rest you can make one simple piece of gear (e.g. a Ladder or Torch) with tools you're proficient with; it lasts until your next Long Rest.","choice":{"type":"tools","count":3,"kind":"Artisan's Tools"}},
  {"name":"Healer","type":"origin","unless":"Blessed Healer|Healer's Kit","summary":"Battle Medic: with a Healer's Kit, use the Utilize action to let a creature within 5 ft spend one Hit Point Die; it regains the roll + your Proficiency Bonus. Healing Rerolls: when you roll healing for a spell or Battle Medic, reroll any 1s."},
  {"name":"Lucky","type":"origin","summary":"Luck Points equal to your Proficiency Bonus (back after a Long Rest). Spend one to give yourself Advantage on a D20 Test, or to give Disadvantage to an attack roll against you."},
  {"name":"Musician","type":"origin","summary":"Proficiency with three musical instruments. After a Short or Long Rest, play a song: up to your Proficiency Bonus allies who hear it gain Heroic Inspiration.","choice":{"type":"tools","count":3,"kind":"musical instruments"}},
  {"name":"Tavern Brawler","type":"origin","attackRelevant":true,"summary":"Unarmed Strikes deal 1d4 + STR modifier Bludgeoning, and you reroll 1s on their damage dice. Proficiency with improvised weapons. Once per turn, an Unarmed Strike hit from the Attack action can also push the target 5 ft."},
  {"name":"Tough","type":"origin","summary":"Your Hit Point maximum goes up by twice your character level, and by 2 more every level after.","grants":{"hpPerLevel":2}},

  // Fighting Style feats
  {"name":"Blind Fighting","type":"fighting-style","prerequisite":{"feature_named":"Fighting Style"},"summary":"Blindsight 10 ft."},
  {"name":"Dueling","type":"fighting-style","prerequisite":{"feature_named":"Fighting Style"},"attackRelevant":true,"summary":"+2 damage with a Melee weapon held in one hand while you hold no other weapons."},
  {"name":"Interception","type":"fighting-style","prerequisite":{"feature_named":"Fighting Style"},"summary":"When a creature you can see hits someone else within 5 ft of you, use your Reaction to cut the damage by 1d10 + your Proficiency Bonus (needs a Shield or a Simple or Martial weapon in hand)."},
  {"name":"Protection","type":"fighting-style","prerequisite":{"feature_named":"Fighting Style"},"unless":"Protection from|Aura of Protection|Smite of Protection","summary":"While holding a Shield, use your Reaction when a creature attacks someone else within 5 ft of you: that attack, and other attacks against them until your next turn, have Disadvantage while you stay within 5 ft."},
  {"name":"Thrown Weapon Fighting","type":"fighting-style","prerequisite":{"feature_named":"Fighting Style"},"attackRelevant":true,"summary":"+2 damage when you hit with a ranged attack using a weapon that has the Thrown property."},
  {"name":"Unarmed Fighting","type":"fighting-style","prerequisite":{"feature_named":"Fighting Style"},"attackRelevant":true,"summary":"Unarmed Strikes deal 1d6 + STR modifier (1d8 if you hold no weapons or Shield). At the start of each of your turns, deal 1d4 Bludgeoning to one creature you're grappling."},

  // General feats (level 4+)
  {"name":"Actor","type":"general","prerequisite":{...L4,"ability":{"CHA":13}},"abilityIncrease":one(['CHA']),"summary":"+1 CHA. Advantage on Deception and Performance checks to pass as someone you're disguised as. You can mimic voices and sounds; telling them apart takes a Wisdom (Insight) check against DC 8 + CHA modifier + Proficiency Bonus."},
  {"name":"Athlete","unless":"Remarkable Athlete","type":"general","prerequisite":{...L4,"ability":{"STR":13,"DEX":13,"any":true}},"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. Climb Speed equal to your Speed. Standing up from Prone costs only 5 ft of movement. A running jump needs only 5 ft of run-up."},
  {"name":"Charger","type":"general","prerequisite":{...L4,"ability":{"STR":13,"DEX":13,"any":true}},"attackRelevant":true,"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. Your Speed goes up 10 ft when you Dash. Once per turn, if you move 10+ ft straight toward a target right before hitting it with a melee attack (Attack action), add 1d8 damage or push it 10 ft."},
  {"name":"Chef","type":"general","prerequisite":L4,"abilityIncrease":one(['CON','WIS']),"grants":{"tools":["Cook's Utensils"]},"summary":"+1 CON or WIS. Proficiency with Cook's Utensils. Cook during a Short Rest: up to 4 + Proficiency Bonus creatures regain an extra 1d8 HP when they spend Hit Point Dice. Make Proficiency Bonus treats (1 hour or a Long Rest); eating one (Bonus Action) gives Temporary HP equal to your Proficiency Bonus."},
  {"name":"Crossbow Expert","type":"general","prerequisite":{...L4,"ability":{"DEX":13}},"attackRelevant":true,"abilityIncrease":one(['DEX']),"summary":"+1 DEX. Ignore the Loading property of crossbows. No Disadvantage for firing a crossbow with an enemy within 5 ft. The Light property's extra attack with a crossbow adds your ability modifier to its damage."},
  {"name":"Crusher","type":"general","prerequisite":{...L4,"ability":{"STR":13,"CON":13,"any":true}},"attackRelevant":true,"abilityIncrease":one(['STR','CON']),"summary":"+1 STR or CON. Once per turn when you hit with Bludgeoning damage, push the target 5 ft (if it is no more than one size larger). On a Critical Hit with Bludgeoning damage, attacks against the target have Advantage until your next turn."},
  {"name":"Defensive Duelist","type":"general","prerequisite":{...L4,"ability":{"DEX":13}},"abilityIncrease":one(['DEX']),"summary":"+1 DEX. While holding a Finesse weapon, when a melee attack hits you, use your Reaction to add your Proficiency Bonus to your AC against it and other melee attacks until your next turn."},
  {"name":"Dual Wielder","type":"general","prerequisite":{...L4,"ability":{"STR":13,"DEX":13,"any":true}},"attackRelevant":true,"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. When you attack with a Light weapon (Attack action), you can make the Bonus Action extra attack with a different melee weapon that isn't Two-Handed, even if it isn't Light (no ability modifier to its damage unless negative). Draw or stow two weapons at once."},
  {"name":"Durable","type":"general","prerequisite":L4,"abilityIncrease":one(['CON']),"unless":"Speedy Recovery","summary":"+1 CON. Advantage on Death Saving Throws. Bonus Action: spend one Hit Point Die, roll it and regain that many HP."},
  {"name":"Elemental Adept","type":"general","prerequisite":{...L4,"feature_named":"Spellcasting"},"repeatable":true,"attackRelevant":true,"abilityIncrease":one(MENTAL),"choice":{"type":"damageType","count":1,"from":["Acid","Cold","Fire","Lightning","Thunder"]},"summary":"+1 INT, WIS or CHA. Pick Acid, Cold, Fire, Lightning or Thunder: your spells ignore Resistance to it, and 1s on its damage dice count as 2. Repeatable with another type."},
  {"name":"Fey Touched","type":"general","prerequisite":L4,"abilityIncrease":one(MENTAL),"choice":{"type":"featSpells","fixed":["Misty Step"],"count":1,"levels":[1],"schools":["Divination","Enchantment"]},"summary":"+1 INT, WIS or CHA (your spellcasting ability for these spells). Misty Step and one level 1 Divination or Enchantment spell are always prepared; each can be cast once per Long Rest without a slot, or with slots."},
  {"name":"Great Weapon Master","type":"general","prerequisite":{...L4,"ability":{"STR":13}},"attackRelevant":true,"abilityIncrease":one(['STR']),"summary":"+1 STR. When you hit with a Heavy weapon as part of the Attack action, add your Proficiency Bonus to the damage. Right after a Critical Hit or dropping a creature to 0 HP with a melee weapon, make one attack with it as a Bonus Action."},
  {"name":"Heavily Armored","type":"general","prerequisite":{...L4,"armor":"Medium"},"abilityIncrease":one(['CON','STR']),"grants":{"armor":["Heavy"]},"summary":"+1 CON or STR. Heavy armor training."},
  {"name":"Heavy Armor Master","type":"general","prerequisite":{...L4,"armor":"Heavy"},"abilityIncrease":one(['CON','STR']),"summary":"+1 CON or STR. While wearing Heavy armor, Bludgeoning, Piercing and Slashing damage from an attack that hits you is reduced by your Proficiency Bonus."},
  {"name":"Inspiring Leader","type":"general","prerequisite":{...L4,"ability":{"WIS":13,"CHA":13,"any":true}},"abilityIncrease":one(['WIS','CHA']),"summary":"+1 WIS or CHA. After a Short or Long Rest, inspire up to six allies (you can be one) within 30 ft: each gains Temporary HP equal to your character level + the modifier of the score you raised."},
  {"name":"Keen Mind","type":"general","prerequisite":{...L4,"ability":{"INT":13}},"abilityIncrease":one(['INT']),"choice":{"type":"skillOrExpertise","count":1,"from":["Arcana","History","Investigation","Nature","Religion"]},"summary":"+1 INT. Proficiency in Arcana, History, Investigation, Nature or Religion (Expertise if you already have it). Study as a Bonus Action."},
  {"name":"Lightly Armored","type":"general","prerequisite":L4,"abilityIncrease":one(STRDEX),"grants":{"armor":["Light","Shields"]},"summary":"+1 STR or DEX. Light armor and Shield training."},
  {"name":"Mage Slayer","type":"general","prerequisite":L4,"attackRelevant":true,"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. A creature you damage while it concentrates has Disadvantage on the save to keep it. Once per Short or Long Rest, turn a failed INT, WIS or CHA save into a success."},
  {"name":"Martial Weapon Training","type":"general","prerequisite":L4,"abilityIncrease":one(STRDEX),"grants":{"weapons":["Martial"]},"summary":"+1 STR or DEX. Proficiency with Martial weapons."},
  {"name":"Medium Armor Master","type":"general","prerequisite":{...L4,"armor":"Medium"},"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. In Medium armor you can add up to +3 DEX to your AC (instead of +2) if your DEX is 16 or more."},
  {"name":"Moderately Armored","type":"general","prerequisite":{...L4,"armor":"Light"},"abilityIncrease":one(STRDEX),"grants":{"armor":["Medium","Shields"]},"summary":"+1 STR or DEX. Medium armor and Shield training."},
  {"name":"Mounted Combatant","type":"general","prerequisite":L4,"abilityIncrease":one(['STR','DEX','WIS']),"summary":"+1 STR, DEX or WIS. While mounted, Advantage on attacks against unmounted creatures within 5 ft of your mount that are smaller than it. Your mount takes no damage on a successful DEX save for half (half on a failure). You can make an attack that hits your mount hit you instead."},
  {"name":"Observant","type":"general","prerequisite":{...L4,"ability":{"INT":13,"WIS":13,"any":true}},"abilityIncrease":one(['INT','WIS']),"choice":{"type":"skillOrExpertise","count":1,"from":["Insight","Investigation","Perception"]},"summary":"+1 INT or WIS. Proficiency in Insight, Investigation or Perception (Expertise if you already have it). Search as a Bonus Action."},
  {"name":"Piercer","type":"general","prerequisite":{...L4,"ability":{"STR":13,"DEX":13,"any":true}},"attackRelevant":true,"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. Once per turn when you hit with Piercing damage, reroll one of its damage dice and use either roll. A Critical Hit with Piercing damage rolls one more damage die."},
  {"name":"Poisoner","type":"general","prerequisite":L4,"attackRelevant":true,"abilityIncrease":one(['DEX','INT']),"unless":"Poisoner's Kit","grants":{"tools":["Poisoner's Kit"]},"summary":"+1 DEX or INT. Your Poison damage ignores Resistance. Proficiency with the Poisoner's Kit: in 1 hour with 50 GP of materials, brew Proficiency Bonus doses; coat a weapon or 3 ammunition as a Bonus Action. A hit forces a CON save (DC 8 + the raised score's modifier + Proficiency Bonus) or 2d8 Poison and Poisoned until the end of your next turn."},
  {"name":"Polearm Master","type":"general","prerequisite":{...L4,"ability":{"STR":13,"DEX":13,"any":true}},"attackRelevant":true,"abilityIncrease":one(['DEX','STR']),"summary":"+1 DEX or STR. After the Attack action with a Quarterstaff, Spear or a Heavy Reach weapon, make a Bonus Action attack with the other end (1d4 Bludgeoning). With such a weapon, your Reaction attacks a creature that enters your reach."},
  {"name":"Resilient","type":"general","prerequisite":L4,"abilityIncrease":one('noSaveProf'),"grants":{"saveForIncrease":true},"summary":"+1 to an ability whose saving throw you aren't proficient in, and you gain proficiency in that saving throw."},
  {"name":"Ritual Caster","type":"general","prerequisite":{...L4,"ability":{"INT":13,"WIS":13,"CHA":13,"any":true}},"abilityIncrease":one(MENTAL),"choice":{"type":"featSpells","fixed":[],"count":"pb","levels":[1],"ritual":true},"summary":"+1 INT, WIS or CHA. Level 1 Ritual spells (as many as your Proficiency Bonus, one more each time it rises) are always prepared and can be cast with slots. Once per Long Rest, cast one of them as a Ritual in its normal casting time."},
  {"name":"Sentinel","type":"general","prerequisite":{...L4,"ability":{"STR":13,"DEX":13,"any":true}},"attackRelevant":true,"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. Make an Opportunity Attack when a creature within 5 ft Disengages or hits someone other than you. A creature you hit with an Opportunity Attack has Speed 0 for the rest of the turn."},
  {"name":"Shadow Touched","type":"general","prerequisite":L4,"abilityIncrease":one(MENTAL),"choice":{"type":"featSpells","fixed":["Invisibility"],"count":1,"levels":[1],"schools":["Illusion","Necromancy"]},"summary":"+1 INT, WIS or CHA (your spellcasting ability for these spells). Invisibility and one level 1 Illusion or Necromancy spell are always prepared; each can be cast once per Long Rest without a slot, or with slots."},
  {"name":"Sharpshooter","type":"general","prerequisite":{...L4,"ability":{"DEX":13}},"attackRelevant":true,"abilityIncrease":one(['DEX']),"summary":"+1 DEX. Your ranged weapon attacks ignore Half and Three-Quarters Cover, and have no Disadvantage for an enemy within 5 ft or for long range."},
  {"name":"Shield Master","type":"general","prerequisite":{...L4,"armor":"Shields"},"attackRelevant":true,"abilityIncrease":one(['STR']),"summary":"+1 STR. Once per turn, after hitting a creature within 5 ft with a melee weapon (Attack action), bash it with your Shield: STR save (DC 8 + STR modifier + Proficiency Bonus) or it is pushed 5 ft or knocked Prone. Holding a Shield, use your Reaction to take no damage on a successful DEX save for half."},
  {"name":"Skill Expert","type":"general","prerequisite":L4,"abilityIncrease":one('any'),"choice":{"type":"skillExpert"},"summary":"+1 to any score. Proficiency in one skill, and Expertise in one skill you're proficient in."},
  {"name":"Skulker","type":"general","prerequisite":{...L4,"ability":{"DEX":13}},"attackRelevant":true,"abilityIncrease":one(['DEX']),"summary":"+1 DEX. Blindsight 10 ft. Advantage on Stealth checks to Hide during combat. Missing with an attack while hidden doesn't give away where you are."},
  {"name":"Slasher","type":"general","prerequisite":{...L4,"ability":{"STR":13,"DEX":13,"any":true}},"attackRelevant":true,"abilityIncrease":one(STRDEX),"summary":"+1 STR or DEX. Once per turn when you hit with Slashing damage, the target's Speed drops 10 ft until your next turn. A Critical Hit with Slashing damage gives the target Disadvantage on attacks until your next turn."},
  {"name":"Speedy","type":"general","prerequisite":{...L4,"ability":{"DEX":13,"CON":13,"any":true}},"abilityIncrease":one(['DEX','CON']),"grants":{"speed":10},"summary":"+1 DEX or CON. Speed +10 ft. When you Dash, Difficult Terrain costs no extra movement that turn. Opportunity Attacks against you have Disadvantage."},
  {"name":"Spell Sniper","type":"general","prerequisite":{...L4,"feature_named":"Spellcasting"},"attackRelevant":true,"abilityIncrease":one(MENTAL),"summary":"+1 INT, WIS or CHA. Spell attacks ignore Half and Three-Quarters Cover and have no Disadvantage for an enemy within 5 ft. Spells with an attack roll and a range of 10+ ft reach 60 ft further."},
  {"name":"Telekinetic","type":"general","prerequisite":L4,"abilityIncrease":one(MENTAL),"choice":{"type":"featSpells","fixed":["Mage Hand"],"count":0,"levels":[]},"summary":"+1 INT, WIS or CHA. You know Mage Hand (cast without Verbal or Somatic components, the hand can be invisible; +30 ft range if you knew it). Bonus Action: a creature within 30 ft makes a STR save (DC 8 + the raised score's modifier + Proficiency Bonus) or you move it 5 ft."},
  {"name":"Telepathic","type":"general","prerequisite":L4,"abilityIncrease":one(MENTAL),"choice":{"type":"featSpells","fixed":["Detect Thoughts"],"count":0,"levels":[]},"summary":"+1 INT, WIS or CHA. Speak telepathically to a creature within 60 ft that shares a language with you. Detect Thoughts is always prepared; once per Long Rest cast it without a slot or components, or with slots."},
  {"name":"War Caster","type":"general","prerequisite":{...L4,"feature_named":"Spellcasting"},"abilityIncrease":one(MENTAL),"summary":"+1 INT, WIS or CHA. Advantage on Constitution saves to keep Concentration. When a creature provokes an Opportunity Attack from you, you can cast a one-action spell at it instead. You can do Somatic components with weapons or a Shield in your hands."},
  {"name":"Weapon Master","type":"general","prerequisite":L4,"abilityIncrease":one(STRDEX),"choice":{"type":"weaponMastery","count":1},"summary":"+1 STR or DEX. Use the mastery property of one kind of Simple or Martial weapon you're proficient with (change it after a Long Rest)."},

  // Epic Boon feats (level 19+)
  {"name":"Boon of Energy Resistance","type":"epic-boon","prerequisite":L19,"abilityIncrease":one('any',30),"choice":{"type":"damageType","count":2,"from":["Acid","Cold","Fire","Lightning","Necrotic","Poison","Psychic","Radiant","Thunder"]},"summary":"+1 to any score (max 30). Resistance to two of Acid, Cold, Fire, Lightning, Necrotic, Poison, Psychic, Radiant, Thunder (change after a Long Rest). When you take damage of one of them, your Reaction makes a creature within 60 ft take 2d12 + CON modifier of it (DEX save, DC 8 + CON modifier + Proficiency Bonus)."},
  {"name":"Boon of Fortitude","type":"epic-boon","prerequisite":L19,"abilityIncrease":one('any',30),"grants":{"hpMax":40},"summary":"+1 to any score (max 30). Hit Point maximum +40. Once per turn when you regain HP, regain your CON modifier more."},
  {"name":"Boon of Recovery","type":"epic-boon","prerequisite":L19,"abilityIncrease":one('any',30),"summary":"+1 to any score (max 30). Once per Long Rest, when you would drop to 0 HP, drop to 1 and regain half your Hit Point maximum. A pool of ten d10s: as a Bonus Action spend any of them and regain the total (all back after a Long Rest)."},
  {"name":"Boon of Skill","type":"epic-boon","prerequisite":L19,"abilityIncrease":one('any',30),"choice":{"type":"allSkills"},"summary":"+1 to any score (max 30). Proficiency in every skill, and Expertise in one."},
  {"name":"Boon of Speed","type":"epic-boon","prerequisite":L19,"abilityIncrease":one('any',30),"grants":{"speed":30},"summary":"+1 to any score (max 30). Speed +30 ft. Bonus Action: Disengage, which also ends the Grappled condition on you."}
];

// From the public feat list only (see the header): the parts' names and the ability increase it lists
const see = (book, parts) => `${parts}. Details: see ${book}.`;
const brief = (book, type, name, prerequisite, abilityIncrease, parts) => ({ name, type, source: book, brief: true, prerequisite,
  ...abilityIncrease ? { abilityIncrease } : {},
  summary: (prerequisite?.text ? `Needs ${prerequisite.text}. ` : '') + (abilityIncrease ? scoreText(abilityIncrease) + '. ' : '') + see(book, parts) });
const scoreText = ai => ai.unsure ? `Ability Score Increase (+${ai.amount}; check which scores the book allows)` :
  `+${ai.amount} ${ai.choose === 'any' ? 'to any score' : ai.choose.join(' or ')}${ai.max > 20 ? ` (max ${ai.max})` : ''}`;
const unsure = (max = 20) => ({ amount: 1, choose: 'any', max, unsure: true });

const hof = [
  ['origin', 'Cult of the Dragon Initiate', null, null, "Dragon's Tongue, Dragon's Terror, Inspired by Fear"],
  ['origin', 'Emerald Enclave Fledgling', null, null, 'Speak with Animals, Tag Team'],
  ['origin', 'Harper Agent', null, null, "Thieves' Cant, Instrument Training, Distracting Melody"],
  ['origin', "Lords' Alliance Agent", null, null, 'Inspiring Strike, Reassert Honor'],
  ['origin', 'Purple Dragon Rook', null, null, 'Entreat, Rallying Cry'],
  ['origin', 'Spellfire Spark', null, null, 'Magic Absorption, Spellfire Flame'],
  ['origin', 'Tyro of the Gauntlet', null, null, 'Stand as One, Vigilant'],
  ['origin', 'Zhentarim Ruffian', null, null, 'Exploit Opening, Family First'],
  ['general', 'Cold Caster', L4, one(MENTAL), 'Ray of Frost, Frostbite'],
  ['general', 'Dragonscarred', L4, one(['CON', 'CHA']), 'Damage Resistance, Fearsome Power'],
  ['general', 'Enclave Magic', L4, one(MENTAL), 'Friend to Animals, Two Hearts, One Mind'],
  ['general', 'Fairy Trickster', L4, unsure(), 'Faerie Trod Trotter, Flustering Strike'],
  ['general', 'Genie Magic', L4, one(MENTAL), 'Wish Magic'],
  ['general', 'Harper Teamwork', L4, unsure(), 'Withering Wordplay, Inspiring Willpower'],
  ['general', 'Lordly Resolve', L4, one(['STR', 'CHA']), 'Standard Bearer'],
  ['general', 'Mythal Touched', L4, unsure(), 'Mythal Ward'],
  ['general', "Order's Resilience", L4, one(['STR', 'WIS', 'CHA']), 'Resurge, Stronger Together'],
  ['general', 'Purple Dragon Commandant', L4, one(STRDEX), 'Encourage Ally, Last Stand'],
  ['general', 'Spellfire Adept', L4, unsure(), 'Fueled Spellfire, Searing Spellfire'],
  ['general', 'Street Justice', L4, one(STRDEX), 'Headlock, Sturdy Knot, Tough Talk'],
  ['general', 'Zhentarim Tactics', L4, unsure(), 'Retaliate, Versatile Merc'],
  ['epic-boon', 'Boon of Bloodshed', L19, one('any', 30), "Killer's Fortune, Power from Pain"],
  ['epic-boon', 'Boon of Bountiful Health', L19, one('any', 30), 'Extra Temporary Hit Points and regeneration'],
  ['epic-boon', 'Boon of Communication', L19, one(MENTAL, 30), 'Cunning Speaker, Gifted Interpreter, telepathy'],
  ['epic-boon', 'Boon of Desperate Resilience', L19, one(['STR', 'CON'], 30), 'Resistance to all damage except Force while Bloodied'],
  ['epic-boon', 'Boon of Exquisite Radiance', L19, one('any', 30), 'Eternal Rest, Powerful Radiance'],
  ['epic-boon', 'Boon of Fluid Forms', L19, one(MENTAL, 30), 'Shapechanger, Hardy Transformation'],
  ["epic-boon", "Boon of Fortune's Favor", L19, one('any', 30), 'Saving Throw Reroll'],
  ['epic-boon', 'Boon of Poison Mastery', L19, one('any', 30), 'Antitoxic, Perfect Poisoner'],
  ['epic-boon', 'Boon of Revelry', L19, unsure(30), 'Inspire Dance, Sing Out'],
  ['epic-boon', 'Boon of Terror', L19, one(['CHA'], 30), 'Immune to Frightened, Intimidation proficiency, Flee, Fools!'],
  ['epic-boon', 'Boon of the Bright Sun', L19, one(['CON', 'WIS', 'CHA'], 30), 'Daylight Presence, Fortifying Light'],
  ['epic-boon', 'Boon of the Furious Storm', L19, one(MENTAL, 30), "Eye of the Storm, Storm's Strength"],
  ['epic-boon', 'Boon of the Soul Drinker', L19, one('any', 30), 'Cold and Necrotic Resistance, Siphon Life']
].map(([type, name, pre, ai, parts]) => brief(HOF, type, name, pre, ai, parts));

// Dragonmarks: the Mark feats, then the Greater Marks (each needs its Mark)
const MARKS = [
  ['Detection', 'Deductive Intuition, Magical Detection, Mark of Detection Spells', 'Improved Intuition, Shared Detection'],
  ['Finding', "Hunter's Intuition, Finder's Magic, Mark of Finding Spells", 'Improved Intuition, Improved Finding'],
  ['Handling', 'Wild Intuition, Primal Connection, Monstrous Connections, Mark of Handling Spells', 'Improved Intuition, Improved Handling, Subdue Animal'],
  ['Healing', 'Medical Intuition, Healing Touch, Mark of Healing Spells', 'Improved Intuition, Improved Healing'],
  ['Hospitality', "Ever Hospitable, Innkeeper's Magic, Mark of Hospitality Spells", 'Improved Intuition, Improved Hospitality'],
  ['Making', "Artisan's Intuition, Spellsmith, Mark of Making Spells", 'Improved Intuition, Improved Making'],
  ['Passage', "Courier's Speed, Intuitive Motion, Magical Passage, Mark of Passage Spells", 'Improved Intuition, Improved Passage'],
  ['Scribing', "Gifted Scribe, Scribe's Insight, Mark of Scribing Spells", 'Improved Intuition, Inspired Scribing'],
  ['Sentinel', "Sentinel's Intuition, Guardian's Shield, Vigilant Guardian, Mark of Sentinel Spells", 'Improved Intuition, Improved Sentinel'],
  ['Shadow', 'Cunning Intuition, Shape Shadows, Mark of Shadow Spells', 'Improved Intuition, Improved Shadow'],
  ['Storm', "Windwright's Intuition, Storm's Boon, Storm Magic, Mark of Storm Spells", 'Improved Intuition'],
  ['Warding', "Warder's Intuition, Wards and Seals, Mark of Warding Spells", 'Improved Intuition, Improved Warding']
];
// The list shows no prerequisites beyond the category's level; that a Greater Mark builds on its Mark is a guess from
// the name, so it is only said (prerequisite.text), not checked.
const needs = (lvl, text) => ({ ...lvl, text: `probably ${text} (check the book)` });
const fota = [
  ...MARKS.map(([m, parts]) => brief(FOTA, 'dragonmark', 'Mark of ' + m, null, null, parts)),
  brief(FOTA, 'dragonmark', 'Aberrant Dragonmark', null, null, 'Aberrant Fortitude, Aberrant Magic, Aberrant Surge'),
  ...MARKS.map(([m, , parts]) => brief(FOTA, 'dragonmark', 'Greater Mark of ' + m, needs(L4, 'Mark of ' + m), unsure(), parts)),
  brief(FOTA, 'dragonmark', 'Greater Aberrant Mark', needs(L4, 'Aberrant Dragonmark'), one(['CON']), 'Improved Fortitude, Mark of Inspiration'),
  brief(FOTA, 'dragonmark', 'Potent Dragonmark', needs(L4, 'a Dragonmark feat'), unsure(), 'Dragonmark Preparation, Dragonmark Spellcasting'),
  brief(FOTA, 'epic-boon', 'Boon of Siberys (Dragonmark Spell)', needs(L19, 'a Dragonmark feat'), unsure(30), 'Aberrant Magic, Dragonmark spells'),
  brief(FOTA, 'epic-boon', 'Boon of Siberys (Sorcerer Spell)', needs(L19, 'a Dragonmark feat'), unsure(30), 'Aberrant Magic, Sorcerer spells')
];

const lorwyn = [
  brief(LORWYN, 'origin', 'Child of the Sun', null, null, 'Eyes of Eirdu, Faerie Fire spell'),
  brief(LORWYN, 'origin', 'Shadowmoor Hexer', null, null, 'Hex spell, Curse Magic')
];

for (const f of phb) { f.source = PHB; f.prerequisite ??= null; f.attackRelevant ??= false; }
DND.feats.push(...phb, ...hof, ...fota, ...lorwyn);
})();
