/* Subclasses from the older (2014-rules) books that D&D Beyond lists and the 2024 books haven't replaced, used with the
   2024 classes as the 2024 Player's Handbook allows: a feature of a level below the 2024 subclass level (3) comes at
   level 3; a subclass the 2024 books reprinted or updated (Totem Warrior, Shadow Magic, Bladesinging, Purple Dragon
   Knight, Arcana Domain, College of Spirits, The Undead ...) is left out, as the newer one replaces it; a Cleric domain's
   level 8 Divine Strike or Potent Spellcasting is the 2024 Cleric's Blessed Strikes instead, so it isn't repeated here.
   Loads after spells.js (it adds name-only spells) and pushes onto DND.classes.<key>.subclasses (subclasses.js).
   Same shape as subclasses.js, plus:
     legacy: true, or a note for the ▾ of the subclass card (what the 2024 rules do differently),
     expanded [spell names]: a 2014 Warlock patron's Expanded Spell List: spells added to the Warlock list for this
       character, offered by Level up's spell picks (not prepared by themselves); an option's grants.expanded too (the
       Genie's kind),
     spellLists [class names]: more lists the class's new spells may come from (the Divine Soul's Cleric spells),
     a feature's keepText: its line on the sheet keeps its text before the option picked (Storm Aura: "... Desert: ...").
   Choice extras: 'spells' with lists: 'any' and school (Reaper); grants.expertise [skills]. Rider extra: pb (adds your
   Proficiency Bonus: Hexblade's Curse, Genie's Wrath).
   Source of the facts: dnd5e.wikidot.com (the subclass pages, 2026-10-31); which subclasses: the tables of contents
   of the D&D Beyond source pages. Feature text is our own short summary, never the book's text (see CREDITS.md). */
window.DND = window.DND || {};

(() => {
const PHB14 = "Player's Handbook (2014)", DMG14 = "Dungeon Master's Guide (2014)", SCAG = "Sword Coast Adventurer's Guide",
  XGE = "Xanathar's Guide to Everything", TCE = "Tasha's Cauldron of Everything", EGW = "Explorer's Guide to Wildemount",
  FTD = "Fizban's Treasury of Dragons", DSQ = 'Dragonlance: Shadow of the Dragon Queen', BGG = 'Bigby Presents: Glory of the Giants';
const f = (lvl, name, text, more) => ({ lvl, name, text, ...more });
const opt = (name, text, grants) => grants ? { name, text, grants } : { name, text };
const pick = (options, swappable) => swappable ? { type: 'option', swappable: true, options } : { type: 'option', options };
const skills = (from, count = 1) => ({ type: 'skills', count, from });
const strike = type => `Its level 8 Divine Strike (${type}) is the 2024 Cleric's Blessed Strikes (level 7) instead.`;

const LEGACY = {
barbarian: [
  { name: 'Path of the Ancestral Guardian', source: XGE, summary: 'Ancestor spirits hinder the foe you hit, shield your allies from damage and strike back at attackers.', features: [
    f(3, 'Ancestral Protectors', 'While raging, the first creature you hit with an attack on your turn is hindered by spectral warriors until the start of your next turn: Disadvantage on attack rolls against anyone but you, and anyone else it hits has Resistance to that damage. Ends early if your Rage ends.'),
    f(6, 'Spirit Shield', 'While raging, Reaction when a creature you can see within 30 ft takes damage: reduce that damage by 2d6 (3d6 at Barbarian 10, 4d6 at 14).'),
    f(10, 'Consult the Spirits', 'Cast Augury or Clairvoyance without a slot or Material components (WIS is the spellcasting ability; Clairvoyance sends an invisible ancestral spirit instead of a sensor). Once per Short or Long Rest.'),
    f(14, 'Vengeful Ancestors', 'When Spirit Shield reduces the damage of an attack, the attacker takes Force damage equal to the damage prevented.')] },
  { name: 'Path of the Battlerager', source: SCAG, summary: 'Dwarven fury in spiked armor: Bonus Action spike attacks, Temporary HP from Reckless Attack, a Bonus Action Dash.', features: [
    f(3, 'Battlerager Armor', 'While raging in spiked armor: Bonus Action melee attack with the spikes against a creature within 5 ft (1d4 Piercing, STR to hit and damage); a creature you grapple takes 3 Piercing damage. (The book allows this path to dwarves only, unless your DM lifts that.)'),
    f(6, 'Reckless Abandon', 'When you use Reckless Attack while raging, gain Temporary HP equal to your CON modifier (min 1); any left vanish when the Rage ends.'),
    f(10, 'Battlerager Charge', 'While raging, take the Dash action as a Bonus Action.'),
    f(14, 'Spiked Retribution', 'While raging in spiked armor and not Incapacitated, a creature within 5 ft that hits you with a melee attack takes 3 Piercing damage.')] },
  { name: 'Path of the Beast', source: TCE, summary: 'A natural weapon each Rage (a bite that heals, extra claw attacks or a tail that blocks), adaptations, rabid curses.', features: [
    f(3, 'Form of the Beast', 'When you enter Rage, grow a natural weapon until it ends (a Simple melee weapon for you; STR to hit and damage). Choose each time: Bite (1d8 Piercing; once per turn, if you are below half your HP, regain HP equal to your PB when it deals damage), Claws (1d6 Slashing per empty hand; once per turn when you attack with one in the Attack action, make one more claw attack) or Tail (1d8 Piercing, Reach; Reaction when a creature within 10 ft hits you: roll 1d8 and add it to your AC against that attack).'),
    f(6, 'Bestial Soul', 'Your natural weapons count as magical. After each Short or Long Rest choose one until the next: a Swim Speed equal to your Speed and water breathing; a Climb Speed equal to your Speed (even upside down, no checks); or, once per turn when you jump, a STR (Athletics) check adds its total in feet to the jump.'),
    f(10, 'Infectious Fury', 'When you hit with a natural weapon while raging, the target makes a WIS save (DC 8 + CON modifier + PB) or, your choice, uses its Reaction to make a melee attack against another creature you can see, or takes 2d12 Psychic damage. PB times per Long Rest.'),
    f(14, 'Call the Hunt', 'When you enter Rage, up to your CON modifier (min 1) willing creatures within 30 ft join the hunt: you gain 5 Temporary HP for each, and until the Rage ends each of them adds 1d6 to the damage of one attack roll that hits on each of its turns. PB times per Long Rest.')] },
  { name: 'Path of the Giant', source: BGG, summary: 'Giant strength: Large while raging, an elemental weapon that returns when thrown, hurling creatures.',
    riders: [{ name: 'Elemental Cleaver', from: 6, dice: { 6: '1d6', 14: '2d6' }, note: 'the infused weapon while raging: Acid, Cold, Fire, Lightning or Thunder' }], features: [
    f(3, "Giant's Power", 'You learn Giant (or another language if you know it) and one of two cantrips (WIS is its spellcasting ability).', { keepText: true, grants: { languages: ['Giant'] }, choice: pick([
      opt('Druidcraft', 'Druidcraft cantrip.', { alwaysPrepared: ['Druidcraft'] }), opt('Thaumaturgy', 'Thaumaturgy cantrip.', { alwaysPrepared: ['Thaumaturgy'] })]) }),
    f(3, "Giant's Havoc", 'While raging: Crushing Throw (a hit with a thrown weapon using STR adds your Rage Damage) and Giant Stature (reach +5 ft; if you are smaller than Large, you become Large with your gear, when there is room).'),
    f(6, 'Elemental Cleaver', 'When you enter Rage, infuse a weapon you hold with Acid, Cold, Fire, Lightning or Thunder until the Rage ends: its damage becomes that type, it deals 1d6 extra damage of that type, and it gains the Thrown property (20/60 ft; it returns to your hand right after the attack). Bonus Action while raging: change the type. It does nothing for anyone else.'),
    f(10, 'Mighty Impel', 'Bonus Action while raging: move a Medium or smaller creature within your reach to an unoccupied space you can see within 30 ft of you (an unwilling one makes a STR save, DC 8 + STR modifier + PB). If it ends up in the air, it falls and lands Prone.'),
    f(14, 'Demiurgic Colossus', 'While raging your reach increases by 10 ft instead, you can become Large or Huge, Mighty Impel moves Large or smaller creatures, and Elemental Cleaver deals 2d6 extra damage.')] },
  { name: 'Path of the Storm Herald', source: XGE, summary: 'A storm aura while raging: fire damage, lightning bolts or Temporary HP for allies; resistances to share.', features: [
    f(3, 'Storm Aura', 'While raging you have a 10-ft aura (not through Total Cover); its effect happens when you enter Rage and again as a Bonus Action on each of your turns (save DC 8 + CON modifier + PB). You choose an environment, and may change it whenever you gain a Barbarian level.', { keepText: true, choice: pick([
      opt('Desert', 'Every other creature in the aura takes 2 Fire damage (3 at Barbarian 5, 4 at 10, 5 at 15, 6 at 20).'),
      opt('Sea', 'One other creature you can see in the aura makes a DEX save: 1d6 Lightning damage, half on a success (2d6 at Barbarian 10, 3d6 at 15, 4d6 at 20).'),
      opt('Tundra', 'Creatures of your choice in the aura gain 2 Temporary HP (3 at Barbarian 5, 4 at 10, 5 at 15, 6 at 20).')], true) }),
    f(6, 'Storm Soul', 'By your environment, even without the aura. Desert: Resistance to Fire, no ill effects from extreme heat, and as an action set an unattended flammable object alight by touch. Sea: Resistance to Lightning, water breathing, Swim Speed 30 ft. Tundra: Resistance to Cold, no ill effects from extreme cold, and as an action freeze a 5-ft Cube of water for 1 minute (not with a creature in it).'),
    f(10, 'Shielding Storm', 'Creatures of your choice in your Storm Aura have your Storm Soul Resistance.'),
    f(14, 'Raging Storm', 'Desert: Reaction right after a creature in the aura hits you: DEX save or it takes Fire damage equal to half your Barbarian level. Sea: Reaction when you hit a creature in the aura: STR save or it falls Prone. Tundra: each time the aura activates, a creature you can see in it makes a STR save or has Speed 0 until the start of your next turn.')] },
  { name: 'Path of Wild Magic', short: 'Wild Magic', source: TCE, summary: 'Wild surges each Rage (a d8 table), sensing magic, and luck or a spell slot for a companion.', features: [
    f(3, 'Magic Awareness', 'As an action, learn until the end of your next turn where any spell or magic item within 60 ft is (not behind Total Cover), and the school of each spell. PB times per Long Rest.'),
    f(3, 'Wild Surge', 'When you enter Rage, roll 1d8 for an effect that lasts until the Rage ends (save DC 8 + CON modifier + PB). 1: creatures of your choice within 30 ft make a CON save or take 1d12 Necrotic, and you gain 1d12 Temporary HP. 2: teleport up to 30 ft (again as a Bonus Action each turn). 3: a spirit appears next to a creature within 30 ft and explodes at the end of the turn: DEX save or 1d6 Force to each creature within 5 ft of it (a new one as a Bonus Action each turn). 4: a weapon you hold deals Force damage and gains Light and Thrown (20/60 ft), returning to your hand at the end of the turn. 5: a creature that hits you with an attack roll takes 1d6 Force. 6: +1 AC for you and allies within 10 ft. 7: the ground within 15 ft is Difficult Terrain for your enemies. 8: a creature within 30 ft makes a CON save or takes 1d6 Radiant and is Blinded until the start of your next turn (again as a Bonus Action each turn).'),
    f(6, 'Bolstering Magic', 'As an action, touch a creature (you too) and give it one: for 10 minutes it adds 1d3 to its attack rolls and ability checks; or it regains one spent spell slot of a level up to a 1d3 roll (once per creature per Long Rest). PB times per Long Rest.'),
    f(10, 'Unstable Backlash', 'Reaction right after you take damage or fail a save while raging: roll on the Wild Surge table; the new effect replaces the current one.'),
    f(14, 'Controlled Surge', 'Roll twice on the Wild Surge table and choose; on doubles, choose any effect.')] }
],
bard: [
  { name: 'College of Creation', source: TCE, summary: 'The Song of Creation: motes that add to Bardic Inspiration, conjured items, an animated dancing item.', features: [
    f(3, 'Mote of Potential', 'When you give Bardic Inspiration, a Tiny mote orbits the creature until it uses the die. Ability check: roll the die twice and use either. Attack roll: right after the roll, the target and creatures of your choice within 5 ft of it make a CON save against your spell DC or take Thunder damage equal to the die. Saving throw: the creature gains Temporary HP equal to the die + your CHA modifier (min 1).'),
    f(3, 'Performance of Creation', 'As an action, create a nonmagical item worth up to 20 x your Bard level GP in a space within 10 ft (Medium or smaller; Large at Bard 6, Huge at 14). It lasts PB hours, one at a time. Once per Long Rest, or spend a level 2+ slot.'),
    f(6, 'Animating Performance', 'As an action, animate a Large or smaller nonmagical item within 30 ft that no one wears or carries, for 1 hour. Dancing Item: AC 16, HP 10 + 5 x Bard level, Speed 30 ft and Fly 30 ft (hover), immune to Poison and Psychic damage; Irrepressible Dance (a creature starting its turn within 10 ft gets +10 or -10 ft Speed); Force-Empowered Slam (your spell attack bonus, 1d10 + PB Force). It acts after you and only Dodges unless you command it with a Bonus Action (also as part of giving Bardic Inspiration). Once per Long Rest, or spend a level 3+ slot.'),
    f(14, 'Creative Crescendo', 'Performance of Creation makes up to your CHA modifier (min 2) items at once (only one of the largest size, the rest Small or Tiny), with no GP limit.')] },
  { name: 'College of Eloquence', source: TCE, summary: 'A master speaker: Persuasion and Deception never below 10, words that weaken saves, inspiration not lost on a failure.', features: [
    f(3, 'Silver Tongue', 'On CHA (Persuasion) and CHA (Deception) checks, treat a d20 roll of 9 or lower as a 10.'),
    f(3, 'Unsettling Words', 'Bonus Action: spend a Bardic Inspiration and roll its die; a creature you can see within 60 ft subtracts the roll from its next saving throw before the start of your next turn.'),
    f(6, 'Unfailing Inspiration', 'A creature that adds your Bardic Inspiration die to a D20 Test and still fails keeps the die.'),
    f(6, 'Universal Speech', 'As an action, up to your CHA modifier (min 1) creatures within 60 ft understand you for 1 hour, whatever language you speak. Once per Long Rest, or spend a spell slot.'),
    f(14, 'Infectious Inspiration', 'Reaction when a creature within 60 ft succeeds on a roll with your Bardic Inspiration die: give another creature within 60 ft that can hear you a Bardic Inspiration die for free. CHA modifier (min 1) times per Long Rest.')] },
  { name: 'College of Swords', source: XGE, summary: 'A blade-juggling performer: Medium armor and scimitars, a Fighting Style, flourishes on hits, Extra Attack.', features: [
    f(3, 'Bonus Proficiencies', 'Training with Medium armor and proficiency with the Scimitar; a Simple or Martial melee weapon you are proficient with can be your Spellcasting Focus for Bard spells.', { grants: { armor: ['Medium'], weapons: ['Scimitar'] } }),
    f(3, 'Fighting Style', 'Pick one of two styles (as their Fighting Style feats): Dueling (+2 damage with a one-handed melee weapon and no other weapon) or Two-Weapon Fighting (your modifier on the extra attack\'s damage).', { choice: { type: 'feat', category: 'fighting-style', only: ['Dueling', 'Two-Weapon Fighting'] } }),
    f(3, 'Blade Flourish', 'When you take the Attack action your Speed increases by 10 ft until the end of the turn, and once per turn when a weapon attack of that action hits, you can spend a Bardic Inspiration die and add its roll to the damage, with one flourish: Defensive (also add the roll to your AC until the start of your next turn), Slashing (the roll also damages creatures of your choice within 5 ft of you) or Mobile (push the target 5 ft + the roll, then use your Reaction to move up to your Speed to a space within 5 ft of it).'),
    f(6, 'Extra Attack', 'Attack twice when you take the Attack action.'),
    f(14, "Master's Flourish", 'You can roll a d6 for a Blade Flourish instead of spending a Bardic Inspiration die.')] },
  { name: 'College of Whispers', source: XGE, summary: 'A spy who frightens and blackmails: Psychic damage on weapon hits, fear sown in talk, stolen faces.',
    riders: [{ name: 'Psychic Blades', dice: { 3: '2d6', 5: '3d6', 10: '5d6', 15: '8d6' }, type: 'psychic', note: 'spend a Bardic Inspiration; once per round, on your turn' }], features: [
    f(3, 'Psychic Blades', 'Once per round on your turn, when you hit a creature with a weapon, spend a Bardic Inspiration to deal 2d6 extra Psychic damage (3d6 at Bard 5, 5d6 at 10, 8d6 at 15).'),
    f(3, 'Words of Terror', 'After talking with a Humanoid alone for at least 1 minute: it makes a WIS save against your spell DC or is Frightened of you or another creature of your choice for 1 hour (ends if it is attacked or damaged, or sees its allies attacked or damaged); on a success it has no hint you tried. Once per Short or Long Rest.'),
    f(6, 'Mantle of Whispers', 'Reaction when a Humanoid dies within 30 ft: capture its shadow (once per Short or Long Rest; kept until a Long Rest). As an action, use it to look like that person, alive and well, for 1 hour (end it as a Bonus Action), knowing what it would tell a casual acquaintance. To see through it: WIS (Insight) against your CHA (Deception) + 5.'),
    f(14, 'Shadow Lore', 'As an action, whisper to a creature within 30 ft that shares a language with you and can hear you: WIS save against your spell DC or it is Charmed by you for 8 hours (until you or your allies attack or damage it), sure you know its worst secret; it obeys you but won\'t risk its life or fight for you. Once per Long Rest.')] }
],
cleric: [
  { name: 'Death Domain', source: DMG14, legacy: strike('Necrotic') + ' The book offers this domain for villains: check with your DM.', summary: 'A domain of death: Martial weapons, two-target necromancy, extra Necrotic damage that ignores Resistance.',
    spells: { 3: ['False Life', 'Ray of Sickness', 'Blindness/Deafness', 'Ray of Enfeeblement'], 5: ['Animate Dead', 'Vampiric Touch'], 7: ['Blight', 'Death Ward'], 9: ['Antilife Shell', 'Cloudkill'] },
    riders: [{ name: 'Touch of Death', level: 2, flat: 5, type: 'necrotic', melee: true, note: 'spend a Channel Divinity on a melee hit' }], features: [
    f(3, 'Death Domain Spells', 'Always prepared at Cleric level 3: False Life, Ray of Sickness, Blindness/Deafness, Ray of Enfeeblement; 5: Animate Dead, Vampiric Touch; 7: Blight, Death Ward; 9: Antilife Shell, Cloudkill.'),
    f(3, 'Bonus Proficiency', 'Proficiency with Martial weapons.', { grants: { weapons: ['Martial weapons'] } }),
    f(3, 'Reaper', 'You learn one Necromancy cantrip from any class\'s list. A Necromancy cantrip that targets only one creature can target two within range that are within 5 ft of each other.', { choice: { type: 'spells', count: 1, levels: [0], lists: 'any', school: 'Necromancy' } }),
    f(3, 'Touch of Death', 'Channel Divinity: when you hit a creature with a melee attack, deal extra Necrotic damage equal to 5 + twice your Cleric level.'),
    f(6, 'Inescapable Destruction', 'Necrotic damage from your Cleric spells and Channel Divinity ignores Resistance to Necrotic damage.'),
    f(17, 'Improved Reaper', 'A level 1-5 Necromancy spell that targets only one creature can target two within range that are within 5 ft of each other (provide consumed Material components for each).')] },
  { name: 'Forge Domain', source: XGE, legacy: strike('Fire'), summary: 'A smith priest: Heavy armor, a +1 weapon or armor each day, metal items crafted by ritual, Fire Resistance.',
    spells: { 3: ['Identify', 'Searing Smite', 'Heat Metal', 'Magic Weapon'], 5: ['Elemental Weapon', 'Protection from Energy'], 7: ['Fabricate', 'Wall of Fire'], 9: ['Animate Objects', 'Creation'] }, features: [
    f(3, 'Forge Domain Spells', 'Always prepared at Cleric level 3: Identify, Searing Smite, Heat Metal, Magic Weapon; 5: Elemental Weapon, Protection from Energy; 7: Fabricate, Wall of Fire; 9: Animate Objects, Creation.'),
    f(3, 'Bonus Proficiencies', "Training with Heavy armor and proficiency with Smith's Tools.", { grants: { armor: ['Heavy'], tools: ["Smith's Tools"] } }),
    f(3, 'Blessing of the Forge', 'At the end of a Long Rest, touch a nonmagical suit of armor or Simple or Martial weapon: until the end of your next Long Rest it is magic, +1 to AC (armor) or +1 to attack and damage rolls (weapon). Once per Long Rest.'),
    f(3, "Artisan's Blessing", 'Channel Divinity: in an hour-long ritual, metal (coins too) of equal value becomes a nonmagical item with some metal in it worth up to 100 GP, within 5 ft: a Simple or Martial weapon, armor, ten pieces of ammunition, a set of tools or another metal object; or a copy of a metal item you hold, such as a key.'),
    f(6, 'Soul of the Forge', 'Resistance to Fire damage; +1 AC while you wear Heavy armor.'),
    f(17, 'Saint of Forge and Fire', 'Immunity to Fire damage; while you wear Heavy armor, Resistance to Bludgeoning, Piercing and Slashing damage from nonmagical attacks.')] },
  { name: 'Nature Domain', source: PHB14, legacy: strike('Cold, Fire or Lightning'), summary: 'A priest of the wild: a Druid cantrip, Heavy armor, charmed beasts and plants, protection from the elements.',
    spells: { 3: ['Animal Friendship', 'Speak with Animals', 'Barkskin', 'Spike Growth'], 5: ['Plant Growth', 'Wind Wall'], 7: ['Dominate Beast', 'Grasping Vine'], 9: ['Insect Plague', 'Tree Stride'] }, features: [
    f(3, 'Nature Domain Spells', 'Always prepared at Cleric level 3: Animal Friendship, Speak with Animals, Barkskin, Spike Growth; 5: Plant Growth, Wind Wall; 7: Dominate Beast, Grasping Vine; 9: Insect Plague, Tree Stride.'),
    f(3, 'Acolyte of Nature', 'Learn one Druid cantrip (a Cleric cantrip for you that doesn\'t count against your cantrips) and gain proficiency in Animal Handling, Nature or Survival.', {
      choice: skills(['Animal Handling', 'Nature', 'Survival']), more: [{ type: 'spell', level: 0, list: 'druid', title: 'Druid cantrip' }] }),
    f(3, 'Bonus Proficiency', 'Training with Heavy armor.', { grants: { armor: ['Heavy'] } }),
    f(3, 'Charm Animals and Plants', 'Channel Divinity, as an action: each Beast or Plant within 30 ft that can see you makes a WIS save or is Charmed by you for 1 minute or until it takes damage (friendly to you and those you name).'),
    f(6, 'Dampen Elements', 'Reaction when you or a creature within 30 ft takes Acid, Cold, Fire, Lightning or Thunder damage: it has Resistance to that instance.'),
    f(17, 'Master of Nature', 'Bonus Action: command what each creature Charmed by your Charm Animals and Plants does on its next turn.')] },
  { name: 'Order Domain', source: TCE, legacy: strike('Psychic') + " Order's Wrath works with the Divine Strike of Blessed Strikes.", summary: 'Law and command: Heavy armor, allies attack when your spells target them, enchantments as Bonus Actions.',
    spells: { 3: ['Command', 'Heroism', 'Hold Person', 'Zone of Truth'], 5: ['Mass Healing Word', 'Slow'], 7: ['Compulsion', 'Locate Creature'], 9: ['Commune', 'Dominate Person'] }, features: [
    f(3, 'Order Domain Spells', 'Always prepared at Cleric level 3: Command, Heroism, Hold Person, Zone of Truth; 5: Mass Healing Word, Slow; 7: Compulsion, Locate Creature; 9: Commune, Dominate Person.'),
    f(3, 'Bonus Proficiencies', 'Training with Heavy armor, and proficiency in Intimidation or Persuasion.', { grants: { armor: ['Heavy'] }, choice: skills(['Intimidation', 'Persuasion']) }),
    f(3, 'Voice of Authority', 'When you cast a spell with a level 1+ slot that targets an ally, one targeted ally can use its Reaction right after it to make one weapon attack against a creature of your choice that you can see.'),
    f(3, "Order's Demand", 'Channel Divinity, as an action: creatures of your choice within 30 ft that can see or hear you make a WIS save or are Charmed by you until the end of your next turn or until they take damage; any of them can be made to drop what they hold.'),
    f(6, 'Embodiment of the Law', 'When you cast an Enchantment spell with a level 1+ slot and a casting time of an action, you can cast it as a Bonus Action. WIS modifier (min 1) times per Long Rest.'),
    f(17, "Order's Wrath", 'Once per turn, when your Divine Strike damages a creature on your turn, curse it until the start of your next turn: the next ally to hit it deals 2d8 extra Psychic damage, ending the curse.')] },
  { name: 'Peace Domain', source: TCE, legacy: "Its level 8 Potent Spellcasting is the 2024 Cleric's Blessed Strikes (level 7) instead.", summary: 'Bonds between allies: a d4 to their rolls, healing as you move among them, taking hits for each other.',
    spells: { 3: ['Heroism', 'Sanctuary', 'Aid', 'Warding Bond'], 5: ['Beacon of Hope', 'Sending'], 7: ['Aura of Purity', "Otiluke's Resilient Sphere"], 9: ['Greater Restoration', "Rary's Telepathic Bond"] }, features: [
    f(3, 'Peace Domain Spells', "Always prepared at Cleric level 3: Heroism, Sanctuary, Aid, Warding Bond; 5: Beacon of Hope, Sending; 7: Aura of Purity, Otiluke's Resilient Sphere; 9: Greater Restoration, Rary's Telepathic Bond."),
    f(3, 'Implement of Peace', 'Proficiency in Insight, Performance or Persuasion.', { choice: skills(['Insight', 'Performance', 'Persuasion']) }),
    f(3, 'Emboldening Bond', 'As an action, bond up to PB willing creatures within 30 ft (you can be one) for 10 minutes or until you use it again: while within 30 ft of another bonded creature, each can add 1d4 to an attack roll, ability check or save, once per turn. PB times per Long Rest.'),
    f(3, 'Balm of Peace', 'Channel Divinity, as an action: move up to your Speed without provoking Opportunity Attacks; each other creature you come within 5 ft of regains 2d6 + WIS modifier HP (min 1), once each.'),
    f(6, 'Protective Bond', 'When a bonded creature is about to take damage, another bonded creature within 30 ft of it can use its Reaction to teleport next to it and take all that damage instead.'),
    f(17, 'Expansive Bond', 'Emboldening Bond and Protective Bond work at 60 ft, and a creature taking damage through Protective Bond has Resistance to it.')] },
  { name: 'Tempest Domain', source: PHB14, legacy: strike('Thunder'), summary: 'A storm priest: Martial weapons and Heavy armor, a thunderous rebuke, maximum lightning and thunder damage, flight.',
    spells: { 3: ['Fog Cloud', 'Thunderwave', 'Gust of Wind', 'Shatter'], 5: ['Call Lightning', 'Sleet Storm'], 7: ['Control Water', 'Ice Storm'], 9: ['Destructive Wave', 'Insect Plague'] }, features: [
    f(3, 'Tempest Domain Spells', 'Always prepared at Cleric level 3: Fog Cloud, Thunderwave, Gust of Wind, Shatter; 5: Call Lightning, Sleet Storm; 7: Control Water, Ice Storm; 9: Destructive Wave, Insect Plague.'),
    f(3, 'Bonus Proficiencies', 'Proficiency with Martial weapons and training with Heavy armor.', { grants: { weapons: ['Martial weapons'], armor: ['Heavy'] } }),
    f(3, 'Wrath of the Storm', 'Reaction when a creature you can see within 5 ft hits you with an attack: it makes a DEX save, taking 2d8 Lightning or Thunder damage (your choice), half on a success. WIS modifier (min 1) times per Long Rest.'),
    f(3, 'Destructive Wrath', 'Channel Divinity: when you roll Lightning or Thunder damage, deal the maximum instead of rolling.'),
    f(6, 'Thunderous Strike', 'When you deal Lightning damage to a Large or smaller creature, you can push it up to 10 ft away.'),
    f(17, 'Stormborn', 'A Fly Speed equal to your Speed whenever you are not underground or indoors.')] },
  { name: 'Twilight Domain', source: TCE, legacy: strike('Radiant'), summary: 'A guardian of the night: Darkvision 300 ft to share, Advantage on Initiative, Temporary HP in a sphere of twilight, flight.',
    spells: { 3: ['Faerie Fire', 'Sleep', 'Moonbeam', 'See Invisibility'], 5: ['Aura of Vitality', "Leomund's Tiny Hut"], 7: ['Aura of Life', 'Greater Invisibility'], 9: ['Circle of Power', 'Mislead'] }, features: [
    f(3, 'Twilight Domain Spells', "Always prepared at Cleric level 3: Faerie Fire, Sleep, Moonbeam, See Invisibility; 5: Aura of Vitality, Leomund's Tiny Hut; 7: Aura of Life, Greater Invisibility; 9: Circle of Power, Mislead."),
    f(3, 'Bonus Proficiencies', 'Proficiency with Martial weapons and training with Heavy armor.', { grants: { weapons: ['Martial weapons'], armor: ['Heavy'] } }),
    f(3, 'Eyes of Night', 'Darkvision 300 ft (in it, Dim Light is Bright Light and Darkness is Dim Light for you). As an action, share it for 1 hour with up to your WIS modifier (min 1) willing creatures within 10 ft; once per Long Rest, or spend a spell slot.'),
    f(3, 'Vigilant Blessing', 'As an action, a creature you touch (you too) has Advantage on its next Initiative roll (ends after that roll, or when you use this again).'),
    f(3, 'Twilight Sanctuary', 'Channel Divinity, as an action: a 30-ft-radius sphere of Dim Light around you for 1 minute (ends if you are Incapacitated). Whenever a creature (you too) ends its turn in it, give it 1d6 + your Cleric level Temporary HP, or end one effect making it Charmed or Frightened.'),
    f(6, 'Steps of Night', 'Bonus Action while in Dim Light or Darkness: a Fly Speed equal to your Speed for 1 minute. PB times per Long Rest.'),
    f(17, 'Twilight Shroud', 'You and your allies have Half Cover while in your Twilight Sanctuary.')] }
],
druid: [
  { name: 'Circle of Dreams', source: XGE, summary: 'Touched by the Summer Court: a pool of d6s to heal allies at range, a hidden camp, fey teleports.', features: [
    f(3, 'Balm of the Summer Court', 'A pool of d6s equal to your Druid level. Bonus Action: an ally you can see within 120 ft regains HP equal to a roll of up to half your Druid level of these dice, plus 1 Temporary HP per die. The pool refills on a Long Rest.'),
    f(6, 'Hearth of Moonlight and Shadow', 'At the start of a Short or Long Rest, touch a point: an invisible 30-ft-radius sphere (blocked by Total Cover) gives you and allies in it +5 to DEX (Stealth) and WIS (Perception) checks, and flames inside can\'t be seen from outside. It ends with the rest or when you leave it.'),
    f(10, 'Hidden Paths', 'Bonus Action: teleport up to 60 ft to a space you can see; or, as an action, teleport a willing creature you touch up to 30 ft. WIS modifier (min 1) times per Long Rest.'),
    f(14, 'Walker in Dreams', 'When you finish a Short Rest, cast Dream (you as the messenger), Scrying or Teleportation Circle without a slot or Material components; this Teleportation Circle opens to where you last finished a Long Rest on this plane. Once per Long Rest.')] },
  { name: 'Circle of the Shepherd', source: XGE, summary: 'Talks with beasts and fey, calls bear, hawk and unicorn spirits, and makes summoned creatures hardier.', features: [
    f(3, 'Speech of the Woods', 'You learn Sylvan, and Beasts understand you and you them (as far as they can tell).', { grants: { languages: ['Sylvan'] } }),
    f(3, 'Spirit Totem', 'Bonus Action: summon an incorporeal spirit to a point within 60 ft for 1 minute, with a 30-ft aura (move it 60 ft as a Bonus Action). Bear: creatures of your choice in the aura when it appears gain 5 + Druid level Temporary HP; you and allies have Advantage on STR checks and saves in it. Hawk: Reaction to give Advantage to an attack roll against a target in the aura; you and allies have Advantage on WIS (Perception) checks in it. Unicorn: you and allies have Advantage on checks to detect creatures in the aura; when you cast a spell with a slot that restores HP, creatures of your choice in the aura regain HP equal to your Druid level. Once per Short or Long Rest.'),
    f(6, 'Mighty Summoner', 'Beasts and Fey you summon or create with a spell have 2 extra HP per Hit Die, and their natural weapons count as magical.'),
    f(10, 'Guardian Spirit', 'A Beast or Fey you summoned or created with a spell regains HP equal to half your Druid level when it ends its turn in your Spirit Totem aura.'),
    f(14, 'Faithful Summons', 'When you drop to 0 HP or are Incapacitated against your will, four Beasts of your choice of CR 2 or lower appear within 20 ft, protect you and attack your foes for 1 hour (no Concentration). Once per Long Rest.')] },
  { name: 'Circle of Spores', source: TCE, summary: 'Fungal decay: a damaging halo, Wild Shape spent on Temporary HP and Necrotic hits, zombies from the fallen.',
    spells: { 3: ['Chill Touch', 'Blindness/Deafness', 'Gentle Repose'], 5: ['Animate Dead', 'Gaseous Form'], 7: ['Blight', 'Confusion'], 9: ['Cloudkill', 'Contagion'] },
    riders: [{ name: 'Symbiotic Entity', dice: '1d6', type: 'necrotic', melee: true, note: 'while Symbiotic Entity is active' }], features: [
    f(3, 'Circle of Spores Spells', 'Always prepared at Druid level 3: Chill Touch, Blindness/Deafness, Gentle Repose; 5: Animate Dead, Gaseous Form; 7: Blight, Confusion; 9: Cloudkill, Contagion.'),
    f(3, 'Halo of Spores', 'Reaction when a creature you can see moves within 10 ft of you or starts its turn there: it makes a CON save against your spell DC or takes 1d4 Necrotic damage (1d6 at Druid 6, 1d8 at 10, 1d10 at 14).'),
    f(3, 'Symbiotic Entity', 'As an action, spend a Wild Shape use to wake your spores instead of transforming: gain 4 Temporary HP per Druid level; for 10 minutes (or until those Temporary HP are gone or you Wild Shape again) Halo of Spores rolls its die twice, and your melee weapon attacks deal 1d6 extra Necrotic damage.'),
    f(6, 'Fungal Infestation', 'Reaction when a Small or Medium Beast or Humanoid dies within 10 ft: it rises as a Zombie with 1 HP for 1 hour, acting right after you and only taking the Attack action (one melee attack) as you command. WIS modifier (min 1) times per Long Rest.'),
    f(10, 'Spreading Spores', 'Bonus Action while Symbiotic Entity is active: fill a 10-ft Cube up to 30 ft away with spores for 1 minute (ends if you do it again, dismiss it as a Bonus Action or Symbiotic Entity ends); a creature that enters it or starts its turn there makes a CON save or takes your Halo of Spores damage (once per turn). No Halo of Spores meanwhile.'),
    f(14, 'Fungal Body', "You can't be Blinded, Deafened, Frightened or Poisoned, and a Critical Hit against you counts as a normal hit unless you are Incapacitated.")] },
  { name: 'Circle of Wildfire', source: TCE, summary: 'Bonded to a wildfire spirit: summon it with Wild Shape, fire and healing spells that do more, a second life.',
    spells: { 3: ['Burning Hands', 'Cure Wounds', 'Flaming Sphere', 'Scorching Ray'], 5: ['Plant Growth', 'Revivify'], 7: ['Aura of Life', 'Fire Shield'], 9: ['Flame Strike', 'Mass Cure Wounds'] }, features: [
    f(3, 'Circle of Wildfire Spells', 'Always prepared at Druid level 3: Burning Hands, Cure Wounds, Flaming Sphere, Scorching Ray; 5: Plant Growth, Revivify; 7: Aura of Life, Fire Shield; 9: Flame Strike, Mass Cure Wounds.'),
    f(3, 'Summon Wildfire Spirit', 'As an action, spend a Wild Shape use to summon your wildfire spirit within 30 ft for 1 hour; creatures within 10 ft of it when it appears make a DEX save against your spell DC or take 2d6 Fire. Small Elemental: AC 13, HP 5 + 5 x Druid level, Speed 30 ft and Fly 30 ft (hover), immune to Fire; Flame Seed (your spell attack bonus, range 60 ft, 1d6 + PB Fire); Fiery Teleportation (it and willing creatures within 5 ft teleport up to 15 ft, then creatures within 5 ft of where it left make a DEX save or take 1d6 + PB Fire). It acts after you and only Dodges unless you command it with a Bonus Action.'),
    f(6, 'Enhanced Bond', 'While your spirit is summoned, a spell you cast that deals Fire damage or restores HP adds 1d8 to one damage or healing roll, and your spells with a range other than Self can start from the spirit.'),
    f(10, 'Cauterizing Flames', 'When a Small or larger creature dies within 30 ft of you or your spirit, a spectral flame stays in its space for 1 minute. Reaction when a creature you can see enters that space: put out the flame to heal it or deal Fire damage to it, 2d10 + WIS modifier. PB times per Long Rest.'),
    f(14, 'Blazing Revival', 'When you drop to 0 HP and fall Unconscious while your spirit is within 120 ft, the spirit drops to 0 HP and you regain half your HP maximum and stand up. Once per Long Rest.')] }
],
fighter: [
  { name: 'Cavalier', source: XGE, summary: 'A mounted defender: marked foes that must deal with you, a d8 ward for allies, enemies stopped in their tracks.',
    riders: [{ name: 'Unwavering Mark', level: 0.5, melee: true, note: 'the Bonus Action attack (with Advantage) against your marked creature that hurt someone else' }], features: [
    f(3, 'Bonus Proficiency', 'Proficiency in Animal Handling, History, Insight, Performance or Persuasion (or learn a language instead).', { choice: skills(['Animal Handling', 'History', 'Insight', 'Performance', 'Persuasion']) }),
    f(3, 'Born to the Saddle', 'Advantage on saves to avoid falling off your mount; if you fall 10 ft or less from it, you can land on your feet (not while Incapacitated). Mounting or dismounting costs you only 5 ft of movement.'),
    f(3, 'Unwavering Mark', 'When you hit a creature with a melee weapon attack, mark it until the end of your next turn: while within 5 ft of you it has Disadvantage on attack rolls against anyone else. If it damages someone else, on your next turn make a Bonus Action melee weapon attack against it with Advantage that deals extra damage equal to half your Fighter level. STR modifier (min 1) of these attacks per Long Rest.'),
    f(7, 'Warding Maneuver', "Reaction while you wield a melee weapon or a Shield, when you or a creature you can see within 5 ft is hit by an attack: roll 1d8 and add it to the target's AC against that attack; if it still hits, the target has Resistance to its damage. CON modifier (min 1) times per Long Rest."),
    f(10, 'Hold the Line', 'Creatures provoke an Opportunity Attack from you when they move 5 ft or more within your reach, and a creature you hit with an Opportunity Attack has Speed 0 until the end of the turn.'),
    f(15, 'Ferocious Charger', 'Once per turn, if you move at least 10 ft in a straight line right before hitting a creature with an attack, it makes a STR save (DC 8 + STR modifier + PB) or falls Prone.'),
    f(18, 'Vigilant Defender', "A special Reaction once on every other creature's turn, only for an Opportunity Attack, and not on a turn you use your normal Reaction.")] },
  { name: 'Echo Knight', source: EGW, summary: 'Fights through an echo of itself: attacks from its space, swaps places with it, extra attacks, two echoes.', features: [
    f(3, 'Manifest Echo', 'Bonus Action: a translucent echo of you in a space within 15 ft (AC 14 + PB, 1 HP, immune to all conditions, your save bonuses). It lasts until destroyed or dismissed (Bonus Action), you make another, or you are Incapacitated; it is destroyed if it is more than 30 ft away at the end of your turn. On your turn move it up to 30 ft (no action). Bonus Action: swap places with it (costs 15 ft of movement). Attacks of the Attack action can come from its space; Reaction: an Opportunity Attack as if from its space when a creature moves 5 ft away from it.'),
    f(3, 'Unleash Incarnation', "When you take the Attack action, make one more melee attack from the echo's space. CON modifier (min 1) times per Long Rest."),
    f(7, 'Echo Avatar', 'As an action, see and hear through your echo for up to 10 minutes (you are Blinded and Deafened meanwhile); it can be up to 1,000 ft away.'),
    f(10, 'Shadow Martyr', 'Reaction before an attack roll against a creature you can see: teleport your echo within 5 ft of it; the attack targets the echo instead. Once per Short or Long Rest.'),
    f(15, 'Reclaim Potential', 'When your echo is destroyed by damage and you have no Temporary HP, gain 2d6 + CON modifier Temporary HP. CON modifier (min 1) times per Long Rest.'),
    f(18, 'Legion of One', "Manifest Echo can make two echoes at once (a third destroys both); what you can do from one's space works from the other's. When you roll Initiative with no Unleash Incarnation uses left, regain one.")] },
  { name: 'Rune Knight', source: TCE, summary: 'Giant runes on your gear, each with a lasting boon and a power once per rest; growing Large; rerolled hits on allies.',
    riders: [{ name: "Giant's Might", dice: { 3: '1d6', 10: '1d8', 18: '1d10' }, note: "while Giant's Might lasts; once per turn" }], lists: {
    runes: { title: 'Runes', known: { 3: 2, 7: 3, 10: 4, 15: 5 }, items: [
      opt('Cloud Rune', 'Carried: Advantage on DEX (Sleight of Hand) and CHA (Deception) checks. Invoke (Reaction) when you or a creature you can see within 30 ft is hit by an attack roll: another creature within 30 ft (not the attacker) becomes the target, with the same roll.'),
      opt('Fire Rune', 'Carried: your PB is doubled on ability checks that use your proficiency with a tool. Invoke when you hit with a weapon: 2d6 extra Fire damage, and the target makes a STR save or is Restrained for 1 minute, taking 2d6 Fire at the start of each of its turns (save again at the end of each turn).'),
      opt('Frost Rune', 'Carried: Advantage on WIS (Animal Handling) and CHA (Intimidation) checks. Invoke (Bonus Action): +2 to STR and CON checks and saves for 10 minutes.'),
      opt('Stone Rune', 'Carried: Advantage on WIS (Insight) checks and Darkvision 120 ft. Invoke (Reaction) when a creature you can see ends its turn within 30 ft: WIS save or it is Charmed by you for 1 minute, with Speed 0 and Incapacitated (save again at the end of each turn).'),
      { ...opt('Hill Rune', 'Carried: Advantage on saves against being Poisoned and Resistance to Poison damage. Invoke (Bonus Action): Resistance to Bludgeoning, Piercing and Slashing damage for 1 minute.'), lvl: 7 },
      { ...opt('Storm Rune', "Carried: Advantage on INT (Arcana) checks, and you can't be Surprised unless Incapacitated. Invoke (Bonus Action): for 1 minute, Reaction when you or a creature you can see within 60 ft makes a D20 Test: give it Advantage or Disadvantage."), lvl: 7 }] } },
    features: [
    f(3, 'Bonus Proficiencies', "Proficiency with Smith's Tools; you learn Giant.", { grants: { tools: ["Smith's Tools"], languages: ['Giant'] } }),
    f(3, 'Rune Carver', 'You know runes (2 at Fighter 3, 3 at 7, 4 at 10, 5 at 15; swap one each Fighter level). After a Long Rest, inscribe each on a different object you wear or hold (weapon, armor, Shield, jewelry ...) until your next Long Rest. Each gives a benefit while you carry it and can be invoked once per Short or Long Rest; save DC 8 + CON modifier + PB.', { choice: { type: 'list', list: 'runes' } }),
    f(3, "Giant's Might", 'Bonus Action, 1 minute: you become Large (with your gear, when there is room), have Advantage on STR checks and saves, and once per turn one weapon or Unarmed Strike hit deals 1d6 extra damage. PB times per Long Rest.'),
    f(7, 'Runic Shield', 'Reaction when another creature you can see within 60 ft is hit by an attack roll: the attacker rerolls the d20 and uses the new roll. PB times per Long Rest.'),
    f(10, 'Great Stature', "You grow 3d4 inches taller, and Giant's Might deals 1d8 extra damage."),
    f(15, 'Master of Runes', 'Invoke each rune twice per Short or Long Rest instead of once.'),
    f(18, 'Runic Juggernaut', "Giant's Might deals 1d10 extra damage and can make you Huge, with 5 ft more reach while you are.")] },
  { name: 'Samurai', source: XGE, summary: 'Fighting spirit: Advantage and Temporary HP on demand, courtly poise, a WIS save, an extra turn at death\'s door.', features: [
    f(3, 'Bonus Proficiency', 'Proficiency in History, Insight, Performance or Persuasion (or learn a language instead).', { choice: skills(['History', 'Insight', 'Performance', 'Persuasion']) }),
    f(3, 'Fighting Spirit', 'Bonus Action: Advantage on weapon attack rolls until the end of the turn and 5 Temporary HP (10 at Fighter 10, 15 at 15). Three times per Long Rest.'),
    f(7, 'Elegant Courtier', 'Add your WIS modifier to CHA (Persuasion) checks. You gain proficiency in WIS saves, or in INT or CHA saves if you already have it.', { keepText: true, choice: pick([
      opt('Wisdom saves', 'Proficiency in WIS saves.', { saves: ['WIS'] }),
      opt('Intelligence saves', 'Proficiency in INT saves (you have WIS already).', { saves: ['INT'] }),
      opt('Charisma saves', 'Proficiency in CHA saves (you have WIS already).', { saves: ['CHA'] })]) }),
    f(10, 'Tireless Spirit', 'When you roll Initiative with no Fighting Spirit uses left, regain one.'),
    f(15, 'Rapid Strike', 'Once per turn, when you take the Attack action and have Advantage on an attack roll, give up the Advantage for that roll to make one more weapon attack against that target as part of the action.'),
    f(18, 'Strength Before Death', 'Reaction when damage drops you to 0 HP: put off falling Unconscious and take an extra turn right away (damage at 0 HP still causes Death Saving Throw failures); then you fall Unconscious if still at 0 HP. Once per Long Rest.')] }
],
monk: [
  { name: 'Way of the Ascendant Dragon', source: FTD, summary: 'Draconic ki: elemental Unarmed Strikes, a breath weapon in place of an attack, spectral wings, a dragon\'s aura.', features: [
    f(3, 'Draconic Disciple', 'Draconic Presence: Reaction to reroll a failed CHA (Intimidation) or CHA (Persuasion) check (once it turns a failure into a success, not again until a Long Rest). Draconic Strike: your Unarmed Strikes can deal Acid, Cold, Fire, Lightning or Poison damage. Tongue of Dragons: you learn Draconic (or another language if you know it).', { grants: { languages: ['Draconic'] } }),
    f(3, 'Breath of the Dragon', 'Replace one attack of the Attack action with an exhalation: a 20-ft Cone or a 30-ft Line 5 ft wide, Acid, Cold, Fire, Lightning or Poison; DEX save (DC 8 + WIS modifier + PB), two rolls of your Martial Arts die (three at Monk 11), half on a success. PB times per Long Rest; with none left, spend 2 Focus Points.'),
    f(6, 'Wings Unfurled', 'When you use Step of the Wind, spectral wings give you a Fly Speed equal to your Speed until the end of the turn. PB times per Long Rest.'),
    f(11, 'Aspect of the Wyrm', 'Bonus Action: a 10-ft aura for 1 minute with one effect: Frightful Presence (when you create it and as a Bonus Action later, a creature in it makes a WIS save or is Frightened of you for 1 minute, saving again at the end of each turn) or Resistance (you and allies in it resist Acid, Cold, Fire, Lightning or Poison, your pick). Once per Long Rest, or spend 3 Focus Points.'),
    f(17, 'Ascendant Aspect', 'Augment Breath: spend 1 Focus Point to make Breath of the Dragon a 60-ft Cone or a 90-ft Line dealing four Martial Arts dice. Blindsight 10 ft. Explosive Fury: when you start Aspect of the Wyrm, creatures of your choice in the aura make a DEX save or take 3d10 Acid, Cold, Fire, Lightning or Poison damage.')] },
  { name: 'Way of the Astral Self', source: TCE, summary: 'Summons spectral arms, a visage and a body: WIS-powered Force strikes with reach, sight in darkness, deflected energy.',
    riders: [{ name: 'Empowered Arms', from: 11, dice: 'martialArts', unarmed: true, note: 'once per turn, a hit with the astral arms while the body is out' }], features: [
    f(3, 'Arms of the Astral Self', 'Bonus Action, 1 Focus Point: spectral arms for 10 minutes (gone if you are Incapacitated); creatures of your choice within 10 ft make a DEX save or take Force damage equal to two rolls of your Martial Arts die. While they are out: use WIS instead of STR for STR checks and saves; Unarmed Strikes with the arms have 5 ft more reach on your turn, can use WIS for attack and damage rolls and deal Force damage.'),
    f(6, 'Visage of the Astral Self', 'Bonus Action (or with the arms), 1 Focus Point: a spectral mask for 10 minutes: you see normally in magical and nonmagical Darkness within 120 ft; Advantage on WIS (Insight) and CHA (Intimidation) checks; speak so that only one creature within 60 ft hears you, or be heard 600 ft away.'),
    f(11, 'Body of the Astral Self', 'With arms and visage both out, the body appears: Reaction when you take Acid, Cold, Fire, Force, Lightning or Thunder damage: reduce it by 1d10 + WIS modifier (min 1). Once per turn when the arms hit, deal extra damage equal to a roll of your Martial Arts die.'),
    f(17, 'Awakened Astral Self', 'Bonus Action, 5 Focus Points: arms, visage and body for 10 minutes: +2 AC, and three attacks instead of two with Extra Attack if all of them use the astral arms.')] },
  { name: 'Way of the Drunken Master', source: XGE, summary: 'A swaying, staggering style: Disengage with Flurry of Blows, misses turned on others, more Flurry attacks.', features: [
    f(3, 'Bonus Proficiencies', "Proficiency in Performance and with Brewer's Supplies.", { grants: { skills: ['Performance'], tools: ["Brewer's Supplies"] } }),
    f(3, 'Drunken Technique', 'When you use Flurry of Blows, you also gain the benefit of the Disengage action and +10 ft Speed until the end of the turn.'),
    f(6, 'Tipsy Sway', 'Leap to Your Feet: standing up from Prone costs only 5 ft of movement. Redirect Attack: Reaction and 1 Focus Point when a creature misses you with a melee attack roll: the attack hits a creature of your choice (not the attacker) that you can see within 5 ft of you.'),
    f(11, "Drunkard's Luck", 'When you make a D20 Test with Disadvantage, spend 2 Focus Points to cancel the Disadvantage.'),
    f(17, 'Intoxicated Frenzy', 'Flurry of Blows can make up to three more attacks, if each of its attacks targets a different creature this turn.')] },
  { name: 'Way of the Kensei', source: XGE, summary: 'A weapon master monk: chosen weapons that count as Monk weapons, a parry, deadlier shots, ki-sharpened blades.',
    riders: [{ name: "Kensei's Shot", dice: '1d4', note: 'ranged attacks with a kensei weapon, after a Bonus Action' }, { name: 'Deft Strike', from: 6, dice: 'martialArts', note: 'a kensei weapon hit, 1 Focus Point, once per turn' }], features: [
    f(3, 'Path of the Kensei', "Kensei Weapons: one melee and one ranged weapon kind (Simple or Martial without the Heavy property; the Longbow counts): you are proficient with them and they are Monk weapons for you (one more kind at Monk 6, 11 and 17). Agile Parry: when you make an Unarmed Strike in the Attack action while holding a melee kensei weapon, +2 AC until the start of your next turn. Kensei's Shot: Bonus Action: your ranged kensei weapon hits deal 1d4 extra damage until the end of the turn. Way of the Brush: proficiency with one of two artisan's tools.", { keepText: true, choice: pick([
      opt("Calligrapher's Supplies", "Proficiency with Calligrapher's Supplies.", { tools: ["Calligrapher's Supplies"] }),
      opt("Painter's Supplies", "Proficiency with Painter's Supplies.", { tools: ["Painter's Supplies"] })]) }),
    f(6, 'One with the Blade', 'Your kensei weapon attacks count as magical. Deft Strike: once per turn when you hit with a kensei weapon, spend 1 Focus Point to deal extra damage equal to a roll of your Martial Arts die.'),
    f(11, 'Sharpen the Blade', 'Bonus Action, up to 3 Focus Points: a kensei weapon you touch gets that bonus to attack and damage rolls for 1 minute (not a magic weapon that already has a bonus).'),
    f(17, 'Unerring Accuracy', 'Once per turn, reroll a missed attack roll with a Monk weapon.')] },
  { name: 'Way of the Long Death', source: SCAG, summary: 'A student of death: Temporary HP from foes you drop, mass fear, death put off with Focus Points.', features: [
    f(3, 'Touch of Death', 'When you reduce a creature within 5 ft to 0 HP, gain Temporary HP equal to your WIS modifier + Monk level (min 1).'),
    f(6, 'Hour of Reaping', 'As an action, each creature within 30 ft that can see you makes a WIS save (DC 8 + WIS modifier + PB) or is Frightened of you until the end of your next turn.'),
    f(11, 'Mastery of Death', 'When you drop to 0 HP, spend 1 Focus Point (no action) to go to 1 HP instead.'),
    f(17, 'Touch of the Long Death', 'As an action, touch a creature within 5 ft and spend 1 to 10 Focus Points: it makes a CON save (DC 8 + WIS modifier + PB), taking 2d10 Necrotic per point, half on a success.')] },
  { name: 'Way of the Sun Soul', source: XGE, summary: 'Radiant ki: a ranged Radiant attack in place of strikes, Burning Hands from Focus Points, an exploding sunburst.', features: [
    f(3, 'Radiant Sun Bolt', 'A ranged spell attack you can make with the Attack action: range 30 ft, proficient, DEX to hit and damage, Radiant damage of your Martial Arts die. It can replace any attack of the action; when you use it in the Attack action, spend 1 Focus Point to make it twice more as a Bonus Action.'),
    f(6, 'Searing Arc Strike', 'Right after the Attack action, spend 2 Focus Points to cast Burning Hands as a Bonus Action; each extra point raises its level by 1 (at most half your Monk level in points).'),
    f(11, 'Searing Sunburst', 'As an action, an orb bursts at a point within 150 ft: creatures in a 20-ft-radius Sphere make a CON save (DC 8 + WIS modifier + PB; none behind opaque Total Cover) or take 2d6 Radiant; spend up to 3 Focus Points for 2d6 more each.'),
    f(17, 'Sun Shield', 'You shed Bright Light 30 ft and Dim Light 30 ft more (switch it as a Bonus Action). Reaction when a creature hits you with a melee attack while it shines: it takes 5 + WIS modifier Radiant damage.')] }
],
paladin: [
  { name: 'Oath of Conquest', source: XGE, summary: 'Conquest through fear: frightened crowds, +10 to an attack roll, an aura that roots and hurts the Frightened.',
    spells: { 3: ['Armor of Agathys', 'Command'], 5: ['Hold Person', 'Spiritual Weapon'], 9: ['Bestow Curse', 'Fear'], 13: ['Dominate Beast', 'Stoneskin'], 17: ['Cloudkill', 'Dominate Person'] }, features: [
    f(3, 'Oath of Conquest Spells', 'Always prepared at Paladin level 3: Armor of Agathys, Command; 5: Hold Person, Spiritual Weapon; 9: Bestow Curse, Fear; 13: Dominate Beast, Stoneskin; 17: Cloudkill, Dominate Person.'),
    f(3, 'Conquering Presence', 'Channel Divinity, as an action: creatures of your choice you can see within 30 ft make a WIS save or are Frightened of you for 1 minute (save again at the end of each turn).'),
    f(3, 'Guided Strike', 'Channel Divinity: after you see an attack roll of yours, before you know whether it hits, add 10 to it.'),
    f(7, 'Aura of Conquest', "While you aren't Incapacitated, a 10-ft aura (30 ft at Paladin 18): a creature Frightened of you has Speed 0 in it and takes Psychic damage equal to half your Paladin level when it starts its turn there."),
    f(15, 'Scornful Rebuke', 'A creature that hits you with an attack takes Psychic damage equal to your CHA modifier (min 1), unless you are Incapacitated.'),
    f(20, 'Invincible Conqueror', 'As an action, for 1 minute: Resistance to all damage, one extra attack when you take the Attack action, and your melee weapon attacks score a Critical Hit on 19-20. Once per Long Rest.')] },
  { name: 'Oath of the Crown', source: SCAG, summary: 'Sworn to a sovereign: challenges that hold foes near, a burst of healing for the wounded, damage taken for allies.',
    spells: { 3: ['Command', 'Compelled Duel'], 5: ['Warding Bond', 'Zone of Truth'], 9: ['Aura of Vitality', 'Spirit Guardians'], 13: ['Banishment', 'Guardian of Faith'], 17: ['Circle of Power', 'Geas'] }, features: [
    f(3, 'Oath of the Crown Spells', 'Always prepared at Paladin level 3: Command, Compelled Duel; 5: Warding Bond, Zone of Truth; 9: Aura of Vitality, Spirit Guardians; 13: Banishment, Guardian of Faith; 17: Circle of Power, Geas.'),
    f(3, 'Champion Challenge', "Channel Divinity, Bonus Action: creatures of your choice you can see within 30 ft make a WIS save or can't willingly move more than 30 ft away from you (ends if you are Incapacitated or die, or it is more than 30 ft away)."),
    f(3, 'Turn the Tide', 'Channel Divinity, Bonus Action: each creature of your choice within 30 ft that can hear you and has no more than half its HP regains 1d6 + CHA modifier HP (min 1).'),
    f(7, 'Divine Allegiance', "Reaction when a creature within 5 ft takes damage: you take that damage instead (it can't be reduced or prevented)."),
    f(15, 'Unyielding Saint', 'Advantage on saves to avoid being Paralyzed or Stunned.'),
    f(20, 'Exalted Champion', 'As an action, for 1 hour (ends if you are Incapacitated or die): Resistance to Bludgeoning, Piercing and Slashing damage from nonmagical weapons; allies within 30 ft have Advantage on Death Saving Throws; you and allies within 30 ft have Advantage on WIS saves. Once per Long Rest.')] },
  { name: 'Oath of Redemption', source: XGE, summary: 'Peace first: a persuasive presence, rebukes for the violent, hits taken for allies, healing when hurt.',
    spells: { 3: ['Sanctuary', 'Sleep'], 5: ['Calm Emotions', 'Hold Person'], 9: ['Counterspell', 'Hypnotic Pattern'], 13: ["Otiluke's Resilient Sphere", 'Stoneskin'], 17: ['Hold Monster', 'Wall of Force'] }, features: [
    f(3, 'Oath of Redemption Spells', "Always prepared at Paladin level 3: Sanctuary, Sleep; 5: Calm Emotions, Hold Person; 9: Counterspell, Hypnotic Pattern; 13: Otiluke's Resilient Sphere, Stoneskin; 17: Hold Monster, Wall of Force."),
    f(3, 'Emissary of Peace', 'Channel Divinity, Bonus Action: +5 to CHA (Persuasion) checks for 10 minutes.'),
    f(3, 'Rebuke the Violent', 'Channel Divinity, Reaction right after an attacker within 30 ft damages a creature other than you with an attack: WIS save, Radiant damage equal to what it dealt, half on a success.'),
    f(7, 'Aura of the Guardian', "Reaction when a creature within 10 ft (30 ft at Paladin 18) takes damage: you take that damage instead (only the damage; it can't be reduced)."),
    f(15, 'Protective Spirit', "At the end of your turn in combat, if you have less than half your HP and aren't Incapacitated, regain 1d6 + half your Paladin level HP."),
    f(20, 'Emissary of Redemption', 'Resistance to all damage other creatures deal, and a creature that hits you with an attack takes Radiant damage equal to half the damage you take. Neither works against a creature you attack, cast a spell on or damage (until your next Long Rest).')] },
  { name: 'Oath of the Watchers', source: TCE, summary: 'A guard against other planes: Advantage on mental saves, turned extraplanar creatures, an Initiative aura.',
    spells: { 3: ['Alarm', 'Detect Magic'], 5: ['Moonbeam', 'See Invisibility'], 9: ['Counterspell', 'Nondetection'], 13: ['Aura of Purity', 'Banishment'], 17: ['Hold Monster', 'Scrying'] }, features: [
    f(3, 'Oath of the Watchers Spells', 'Always prepared at Paladin level 3: Alarm, Detect Magic; 5: Moonbeam, See Invisibility; 9: Counterspell, Nondetection; 13: Aura of Purity, Banishment; 17: Hold Monster, Scrying.'),
    f(3, "Watcher's Will", 'Channel Divinity, as an action: you and up to your CHA modifier (min 1) creatures you can see within 30 ft have Advantage on INT, WIS and CHA saves for 1 minute.'),
    f(3, 'Abjure the Extraplanar', "Channel Divinity, as an action: each Aberration, Celestial, Elemental, Fey or Fiend within 30 ft that can hear you makes a WIS save or is Turned for 1 minute or until it takes damage (it moves as far from you as it can, can't end its move within 30 ft of you, and only Dashes, tries to escape what holds it, or Dodges)."),
    f(7, 'Aura of the Sentinel', "While you aren't Incapacitated, you and creatures of your choice within 10 ft (30 ft at Paladin 18) add your PB to Initiative rolls."),
    f(15, 'Vigilant Rebuke', 'Reaction when you or a creature you can see within 30 ft succeeds on an INT, WIS or CHA save: the creature that forced it takes 2d8 + CHA modifier Force damage.'),
    f(20, 'Mortal Bulwark', 'Bonus Action, 1 minute: Truesight 120 ft; Advantage on attack rolls against Aberrations, Celestials, Elementals, Fey and Fiends; when you hit and damage a creature, it makes a CHA save against your spell DC or is banished to its native plane (if not there; on a success, immune for 24 hours). Once per Long Rest, or spend a level 5 slot.')] },
  { name: 'Oathbreaker', source: DMG14, legacy: 'The book offers this path for villains: check with your DM.', summary: 'A fallen paladin: commands Undead, frightens foes, adds CHA to melee damage for itself and nearby fiends and undead.',
    spells: { 3: ['Hellish Rebuke', 'Inflict Wounds'], 5: ['Crown of Madness', 'Darkness'], 9: ['Animate Dead', 'Bestow Curse'], 13: ['Blight', 'Confusion'], 17: ['Contagion', 'Dominate Person'] },
    riders: [{ name: 'Aura of Hate', from: 7, mod: 'CHA', melee: true, on: true, note: 'your CHA modifier (min +1) on melee weapon damage' }], features: [
    f(3, 'Oathbreaker Spells', 'Always prepared at Paladin level 3: Hellish Rebuke, Inflict Wounds; 5: Crown of Madness, Darkness; 9: Animate Dead, Bestow Curse; 13: Blight, Confusion; 17: Contagion, Dominate Person.'),
    f(3, 'Control Undead', 'Channel Divinity, as an action: an Undead you can see within 30 ft makes a WIS save or obeys your commands for 24 hours (or until you use this again); Undead of a CR equal to or higher than your Paladin level are immune.'),
    f(3, 'Dreadful Aspect', 'Channel Divinity, as an action: creatures of your choice within 30 ft that can see you make a WIS save or are Frightened of you for 1 minute (one that ends its turn more than 30 ft away saves again).'),
    f(7, 'Aura of Hate', 'You, and Fiends and Undead within 10 ft of you (30 ft at Paladin 18), add your CHA modifier (min +1) to melee weapon damage rolls (from only one paladin at a time).'),
    f(15, 'Supernatural Resistance', 'Resistance to Bludgeoning, Piercing and Slashing damage from nonmagical weapons.'),
    f(20, 'Dread Lord', 'As an action, a 30-ft aura of gloom for 1 minute: Bright Light in it becomes Dim Light; enemies Frightened of you that start their turn in it take 4d10 Psychic; you and creatures you choose in it are wrapped in shadow (creatures that rely on sight have Disadvantage on attack rolls against them). Bonus Action: the shadows make a melee spell attack against a creature: 3d10 + CHA modifier Necrotic. Once per Long Rest.')] }
],
ranger: [
  { name: 'Drakewarden', source: FTD, summary: 'A drake companion that grows into a flying mount, adds elemental damage to allies\' strikes and breathes.', features: [
    f(3, 'Draconic Gift', 'You learn Thaumaturgy (a Ranger spell for you) and Draconic (or another language if you know it).', { grants: { cantrips: ['Thaumaturgy'], languages: ['Draconic'] } }),
    f(3, 'Drake Companion', 'As an action, summon your drake within 30 ft; it stays until it drops to 0 HP, you summon it again or you die. Once per Long Rest, or spend a level 1+ slot. Small Dragon: AC 14 + PB, HP 5 + 5 x Ranger level, Speed 40 ft, Darkvision 60 ft; Draconic Essence (choose Acid, Cold, Fire, Lightning or Poison when you summon it: its immunity and damage type); Bite (+3 + PB to hit, 1d6 + PB Piercing); Infused Strikes (Reaction when another creature within 30 ft that it can see hits with a weapon attack: 1d6 extra damage of its type). It acts after you and only Dodges unless you command it with a Bonus Action.'),
    f(7, 'Bond of Fang and Scale', "Your drake gains a Fly Speed equal to its Speed and becomes Medium; you can ride it if you are Medium or smaller (it can't fly while ridden). Its Bite deals 1d6 extra damage of its type, and you have Resistance to that type."),
    f(11, "Drake's Breath", 'As an action, you or your drake exhale a 30-ft Cone of Acid, Cold, Fire, Lightning or Poison: DEX save against your spell DC, 8d6 damage (10d6 at Ranger 15), half on a success. Once per Long Rest, or spend a level 3+ slot.'),
    f(15, 'Perfected Bond', "The drake's Bite deals 2d6 extra damage of its type, and it becomes Large and can fly while ridden. Reaction when you or the drake takes damage while within 30 ft of each other: give that one Resistance to it. PB times per Long Rest.")] },
  { name: 'Horizon Walker', source: XGE, summary: 'A guardian against other planes: Force damage on a chosen foe, brief ethereal steps, teleports between attacks.',
    spells: { 3: ['Protection from Evil and Good'], 5: ['Misty Step'], 9: ['Haste'], 13: ['Banishment'], 17: ['Teleportation Circle'] },
    riders: [{ name: 'Planar Warrior', dice: { 3: '1d8', 11: '2d8' }, type: 'force', note: 'after a Bonus Action; all of the hit\'s damage becomes Force' }], features: [
    f(3, 'Horizon Walker Magic', 'Always prepared at Ranger level 3: Protection from Evil and Good; 5: Misty Step; 9: Haste; 13: Banishment; 17: Teleportation Circle.'),
    f(3, 'Detect Portal', 'As an action, learn the distance and direction to the nearest planar portal within 1 mile. Once per Short or Long Rest.'),
    f(3, 'Planar Warrior', 'Bonus Action: choose a creature you can see within 30 ft; the next time you hit it with a weapon attack this turn, all the damage is Force and it takes 1d8 extra Force damage (2d8 at Ranger 11).'),
    f(7, 'Ethereal Step', 'Bonus Action: cast Etherealness without a slot; it ends at the end of the turn. Once per Short or Long Rest.'),
    f(11, 'Distant Strike', 'With the Attack action, teleport up to 10 ft to a space you can see before each attack; if you attack two different creatures with it, make one more attack against a third.'),
    f(15, 'Spectral Defense', "Reaction when an attack damages you: Resistance to all of that attack's damage this turn.")] },
  { name: 'Monster Slayer', source: XGE, summary: 'A hunter of the supernatural: weaknesses spotted, extra damage on chosen prey, spells and teleports foiled.',
    spells: { 3: ['Protection from Evil and Good'], 5: ['Zone of Truth'], 9: ['Magic Circle'], 13: ['Banishment'], 17: ['Hold Monster'] },
    riders: [{ name: "Slayer's Prey", dice: '1d6', note: 'your designated prey; the first hit each turn' }], features: [
    f(3, 'Monster Slayer Magic', 'Always prepared at Ranger level 3: Protection from Evil and Good; 5: Zone of Truth; 9: Magic Circle; 13: Banishment; 17: Hold Monster.'),
    f(3, "Hunter's Sense", 'As an action, learn the damage Immunities, Resistances and Vulnerabilities of a creature you can see within 60 ft (one hidden from divination seems to have none). WIS modifier (min 1) times per Long Rest.'),
    f(3, "Slayer's Prey", 'Bonus Action: designate a creature you can see within 60 ft until you finish a Short or Long Rest (or pick another); the first time each turn you hit it with a weapon attack, it takes 1d6 extra damage.'),
    f(7, 'Supernatural Defense', "Add 1d6 to saves your Slayer's Prey target forces you to make and to checks to escape its grapple."),
    f(11, "Magic-User's Nemesis", 'Reaction when you see a creature within 60 ft cast a spell or teleport: WIS save against your spell DC or the spell or teleport fails and is wasted. Once per Short or Long Rest.'),
    f(15, "Slayer's Counter", "Reaction when your Slayer's Prey target forces you to make a save: make one weapon attack against it first; if it hits, you also succeed on the save.")] },
  { name: 'Swarmkeeper', source: TCE, summary: 'Bonded to a swarm of nature spirits: extra damage or a push on hits, a short flight, scattering into the swarm.',
    spells: { 3: ['Mage Hand', 'Faerie Fire'], 5: ['Web'], 9: ['Gaseous Form'], 13: ['Arcane Eye'], 17: ['Insect Plague'] },
    riders: [{ name: 'Gathered Swarm', dice: { 3: '1d6', 11: '1d8' }, type: 'piercing', note: 'once per turn (or a push, or move yourself 5 ft)' }], features: [
    f(3, 'Gathered Swarm', 'Once on each of your turns, right after you hit a creature with an attack, your swarm: deals it 1d6 Piercing damage, or pushes it up to 15 ft horizontally (STR save against your spell DC), or moves you 5 ft horizontally.'),
    f(3, 'Swarmkeeper Magic', 'Always prepared at Ranger level 3: Mage Hand, Faerie Fire; 5: Web; 9: Gaseous Form; 13: Arcane Eye; 17: Insect Plague.'),
    f(7, 'Writhing Tide', 'Bonus Action: Fly Speed 10 ft (hover) for 1 minute or until you are Incapacitated. PB times per Long Rest.'),
    f(11, 'Mighty Swarm', 'Gathered Swarm deals 1d8; a creature that fails the save against its push can also be knocked Prone; when it moves you, you have Half Cover until the start of your next turn.'),
    f(15, 'Swarming Dispersal', 'Reaction when you take damage: Resistance to it, then teleport to a space you can see within 30 ft. PB times per Long Rest.')] }
],
rogue: [
  { name: 'Inquisitive', source: XGE, summary: 'A detective: lies and clues spotted, foes read to Sneak Attack without Advantage, illusions sensed.', features: [
    f(3, 'Ear for Deceit', 'On WIS (Insight) checks to tell whether a creature is lying, treat a d20 roll of 7 or lower as an 8.'),
    f(3, 'Eye for Detail', 'Bonus Action: a WIS (Perception) check to spot a hidden creature or object, or an INT (Investigation) check to find or decipher clues.'),
    f(3, 'Insightful Fighting', "Bonus Action: WIS (Insight) check against the CHA (Deception) of a creature you can see that isn't Incapacitated; on a success, for 1 minute (or until you succeed against another target) you can Sneak Attack it without Advantage (not with Disadvantage)."),
    f(9, 'Steady Eye', 'Advantage on WIS (Perception) and INT (Investigation) checks if you move no more than half your Speed that turn.'),
    f(13, 'Unerring Eye', 'As an action, sense illusions, shapechangers not in their true form and other magic meant to fool the senses within 30 ft (not while Blinded or Deafened), without learning what they hide. WIS modifier (min 1) times per Long Rest.'),
    f(17, 'Eye for Weakness', 'Your Sneak Attack deals 3d6 more against a creature your Insightful Fighting applies to.')] },
  { name: 'Mastermind', source: XGE, summary: 'A schemer: disguise and forgery kits, languages, Help as a Bonus Action from 30 ft, attacks turned on others.', features: [
    f(3, 'Master of Intrigue', 'Proficiency with the Disguise Kit, the Forgery Kit and one Gaming Set, and two languages. You can mimic the speech and accent of a creature you heard speak for 1 minute (in a language you know).', {
      grants: { tools: ['Disguise Kit', 'Forgery Kit'] }, choice: { type: 'languages', count: 2 }, more: [{ type: 'tools', count: 1, kind: 'Gaming Set', title: 'Gaming set' }] }),
    f(3, 'Master of Tactics', 'Help as a Bonus Action; when you Help an ally attack a creature, that creature can be within 30 ft of you instead of 5 ft, if it can see or hear you.'),
    f(9, 'Insightful Manipulator', 'After 1 minute watching or talking with a creature outside combat, the DM tells you whether it is your equal, superior or inferior in two of: INT, WIS, CHA, class levels (and maybe a bit of its history or a personality trait).'),
    f(13, 'Misdirection', 'Reaction when you are targeted by an attack while a creature within 5 ft gives you Cover against it: the attack targets that creature instead.'),
    f(17, 'Soul of Deceit', "Your thoughts can't be read unless you allow it (you can show false ones: CHA (Deception) against WIS (Insight)); magic that detects lies shows you as truthful if you wish, and magic can't make you tell the truth.")] },
  { name: 'Scout', source: XGE, summary: 'A skirmishing scout: moves off when foes close in, Expertise in Nature and Survival, Advantage on Initiative.', features: [
    f(3, 'Skirmisher', 'Reaction when an enemy ends its turn within 5 ft: move up to half your Speed without provoking Opportunity Attacks.'),
    f(3, 'Survivalist', 'Proficiency and Expertise in Nature and Survival.', { grants: { skills: ['Nature', 'Survival'], expertise: ['Nature', 'Survival'] } }),
    f(9, 'Superior Mobility', 'Your Speed increases by 10 ft (and your Climb and Swim Speeds, if you have them).', { grants: { speed: 10 } }),
    f(13, 'Ambush Master', 'Advantage on Initiative rolls. The first creature you hit in the first round of a combat: attack rolls against it have Advantage until the start of your next turn.'),
    f(17, 'Sudden Strike', 'When you take the Attack action, make one more attack as a Bonus Action; it can use Sneak Attack even if you already did this turn, but not against the same target twice in a turn.')] },
  { name: 'Swashbuckler', source: XGE, summary: 'A daring duelist: no Opportunity Attacks after you strike, CHA to Initiative, Sneak Attack one-on-one.', features: [
    f(3, 'Fancy Footwork', "On your turn, a creature you make a melee attack against can't make Opportunity Attacks against you for the rest of the turn."),
    f(3, 'Rakish Audacity', "Add your CHA modifier to Initiative rolls. You can Sneak Attack a creature within 5 ft of you without Advantage if no other creature is within 5 ft of you and you don't have Disadvantage."),
    f(9, 'Panache', "As an action, CHA (Persuasion) against the WIS (Insight) of a creature that hears you and shares a language. Hostile: for 1 minute it has Disadvantage on attack rolls against others and can't make Opportunity Attacks against others (ends if your companions attack it or affect it with a spell, or you are more than 60 ft apart). Not hostile: Charmed by you for 1 minute (ends if you or your companions harm it)."),
    f(13, 'Elegant Maneuver', 'Bonus Action: Advantage on your next DEX (Acrobatics) or STR (Athletics) check this turn.'),
    f(17, 'Master Duelist', 'When you miss with an attack roll, roll it again with Advantage. Once per Short or Long Rest.')] }
],
sorcerer: [
  // its level 1 features come at the 2024 Sorcerer's subclass level (3)
  { name: 'Divine Soul', source: XGE, summary: 'A soul touched by a god: Cleric spells too, an affinity spell, 2d4 to turn a miss or failed save, healing rerolls, wings.',
    spellLists: ['Cleric'], features: [
    f(3, 'Divine Magic', 'When you gain or replace a Sorcerer cantrip or prepared spell, you can pick it from the Cleric list as well as the Sorcerer list (it is a Sorcerer spell for you). Pick an affinity for the source of your power: its spell is always prepared and does not count against your Sorcerer spells.', { keepText: true, choice: pick([
      opt('Good', 'Cure Wounds always prepared.', { alwaysPrepared: ['Cure Wounds'] }),
      opt('Evil', 'Inflict Wounds always prepared.', { alwaysPrepared: ['Inflict Wounds'] }),
      opt('Law', 'Bless always prepared.', { alwaysPrepared: ['Bless'] }),
      opt('Chaos', 'Bane always prepared.', { alwaysPrepared: ['Bane'] }),
      opt('Neutrality', 'Protection from Evil and Good always prepared.', { alwaysPrepared: ['Protection from Evil and Good'] })]) }),
    f(3, 'Favored by the Gods', 'When you fail a saving throw or miss with an attack roll, roll 2d4 and add it to the total, which may change the outcome. Once per Short or Long Rest.'),
    f(6, 'Empowered Healing', 'When you or an ally within 5 ft rolls dice for the HP a spell restores, spend 1 Sorcery Point to reroll any number of those dice once (not while Incapacitated). Once per turn.'),
    f(14, 'Otherworldly Wings', 'Bonus Action: spectral wings give you a Fly Speed of 30 ft until you dismiss them (Bonus Action). Eagle wings for Good or Law, bat wings for Evil or Chaos, dragonfly wings for Neutrality.'),
    f(18, 'Unearthly Recovery', 'Bonus Action while you have less than half your HP maximum: regain HP equal to half your HP maximum. Once per Long Rest.')] },
  { name: 'Lunar Sorcery', source: DSQ, summary: 'Moon magic in three phases: a free spell by phase, cheaper Metamagic, phase powers that blind, curse or teleport.',
    spells: { 3: ['Sacred Flame', 'Shield', 'Ray of Sickness', 'Color Spray', 'Lesser Restoration', 'Blindness/Deafness', 'Alter Self'], 5: ['Dispel Magic', 'Vampiric Touch', 'Phantom Steed'], 7: ['Death Ward', 'Confusion', 'Hallucinatory Terrain'], 9: ["Rary's Telepathic Bond", 'Hold Monster', 'Mislead'] }, features: [
    f(3, 'Lunar Embodiment', "Always prepared at Sorcerer level 3: Shield, Ray of Sickness, Color Spray, Lesser Restoration, Blindness/Deafness, Alter Self; 5: Dispel Magic, Vampiric Touch, Phantom Steed; 7: Death Ward, Confusion, Hallucinatory Terrain; 9: Rary's Telepathic Bond, Hold Monster, Mislead. After each Long Rest choose a phase: Full Moon (the first spell of each level above), New Moon (the second) or Crescent Moon (the third); once per Long Rest cast your phase's level 1 lunar spell without a slot."),
    f(3, 'Moon Fire', 'You know Sacred Flame (not counted against your cantrips); it can target two creatures within range that are within 5 ft of each other.'),
    f(6, 'Lunar Boons', "Metamagic on a spell of your phase's schools costs 1 Sorcery Point less (min 0): Full Moon Abjuration and Divination, New Moon Enchantment and Necromancy, Crescent Moon Illusion and Transmutation. PB times per Long Rest."),
    f(6, 'Waxing and Waning', "Bonus Action, 1 Sorcery Point: change your phase. You can now cast each phase's level 1 lunar spell once per Long Rest without a slot, while in that phase."),
    f(14, 'Lunar Empowerment', 'While in a phase: Full Moon (Bonus Action: shed Bright Light 10 ft and Dim Light 10 ft more, or put it out; you and creatures of your choice have Advantage on INT (Investigation) and WIS (Perception) checks in that Bright Light), New Moon (Advantage on DEX (Stealth) checks; attack rolls against you have Disadvantage while you are entirely in Darkness) or Crescent Moon (Resistance to Necrotic and Radiant damage).'),
    f(18, 'Lunar Phenomenon', "Bonus Action (also as part of Waxing and Waning), your phase's power: Full Moon (creatures of your choice within 30 ft make a CON save or are Blinded until the end of their next turn; one creature there regains 3d8 HP), New Moon (creatures of your choice within 30 ft make a DEX save or take 3d10 Necrotic and have Speed 0 until the end of their next turn; you are Invisible until the end of your next turn or until you attack or cast) or Crescent Moon (teleport up to 60 ft with one willing creature within 5 ft; both have Resistance to all damage until the start of your next turn). Each once per Long Rest, or spend 5 Sorcery Points.")] },
  { name: 'Storm Sorcery', source: XGE, summary: 'Elemental air: a short flight when you cast, storms around your lightning and thunder spells, wind-borne flight for allies.', features: [
    f(3, 'Wind Speaker', 'You learn Primordial (and so understand Aquan, Auran, Ignan and Terran).', { grants: { languages: ['Primordial'] } }),
    f(3, 'Tempestuous Magic', 'Bonus Action right before or after you cast a level 1+ spell: fly up to 10 ft without provoking Opportunity Attacks.'),
    f(6, 'Heart of the Storm', 'Resistance to Lightning and Thunder damage. When you start casting a level 1+ spell that deals Lightning or Thunder damage, creatures of your choice you can see within 10 ft take Lightning or Thunder damage (your pick) equal to half your Sorcerer level.'),
    f(6, 'Storm Guide', "Rain: as an action, stop it falling in a 20-ft-radius Sphere around you (end it as a Bonus Action). Wind: a Bonus Action each round to choose the wind's direction in a 100-ft-radius Sphere around you until the end of your next turn."),
    f(14, "Storm's Fury", 'Reaction when a melee attack hits you: the attacker takes Lightning damage equal to your Sorcerer level and makes a STR save against your spell DC or is pushed up to 20 ft away.'),
    f(18, 'Wind Soul', 'Immunity to Lightning and Thunder damage, and a Fly Speed of 60 ft. As an action, reduce it to 30 ft for 1 hour to give 3 + CHA modifier creatures within 30 ft a Fly Speed of 30 ft for 1 hour; once per Short or Long Rest.')] }
],
warlock: [
  { name: 'The Fathomless', source: TCE, summary: 'A patron of the deep: a spectral tentacle that strikes and guards, swimming, free black tentacles, watery teleports.',
    expanded: ['Create or Destroy Water', 'Thunderwave', 'Gust of Wind', 'Silence', 'Lightning Bolt', 'Sleet Storm', 'Control Water', 'Summon Elemental', "Bigby's Hand", 'Cone of Cold'],
    spells: { 10: ["Evard's Black Tentacles"] }, features: [
    f(3, 'Expanded Spell List', 'Ten more spells join the Warlock spell list for you (Level up offers them with your Warlock spells): water, storm and cold magic of levels 1-5; one of them summons only water elementals, and its hand looks like a tentacle.'),
    f(3, 'Tentacle of the Deeps', 'Bonus Action: a 10-ft spectral tentacle at a point you can see within 60 ft for 1 minute (or until you make another); make a melee spell attack against a creature within 10 ft of it: 1d8 Cold damage (2d8 at Warlock 10), and its Speed drops by 10 ft until the start of your next turn. Bonus Action on your later turns: move it up to 30 ft and attack again. PB times per Long Rest.'),
    f(3, 'Gift of the Sea', 'Swim Speed 40 ft, and you can breathe water.'),
    f(6, 'Oceanic Soul', "Resistance to Cold damage. While fully submerged, you and other fully submerged creatures understand each other's speech."),
    f(6, 'Guardian Coil', 'Reaction when you or a creature you can see takes damage within 10 ft of your tentacle: reduce that damage by 1d8 (2d8 at Warlock 10).'),
    f(10, 'Grasping Tentacles', "Evard's Black Tentacles is always prepared; cast it once per Long Rest without a slot. When you cast it, gain Temporary HP equal to your Warlock level, and damage can't break your Concentration on it."),
    f(14, 'Fathomless Plunge', 'As an action, teleport yourself and up to five willing creatures you can see within 30 ft up to 1 mile, into or within 30 ft of a body of water you have seen (pond-sized or larger). Once per Short or Long Rest.')] },
  { name: 'The Genie', source: TCE, summary: 'A noble genie patron: a vessel to rest inside, extra elemental damage once a turn, flight, a limited wish.',
    expanded: ['Detect Evil and Good', 'Phantasmal Force', 'Create Food and Water', 'Phantasmal Killer', 'Creation', 'Wish'],
    riders: [{ name: "Genie's Wrath", pb: true, note: 'once per turn: Bludgeoning (Dao), Thunder (Djinni), Fire (Efreeti) or Cold (Marid)' }], features: [
    f(3, 'Expanded Spell List', "Spells join the Warlock spell list for you (Level up offers them with your Warlock spells): six genie spells of levels 1-5 and 9, and five of your patron's kind (levels 1-5)."),
    f(3, "Genie's Vessel", "A Tiny vessel, your Spellcasting Focus (AC = your spell save DC, HP = Warlock level + PB, immune to Poison and Psychic damage). While touching it: Bottled Respite (as an action, vanish into it for up to twice your PB in hours: a furnished cylinder 20 ft in radius and 20 ft high; you hear what happens around it; leave as a Bonus Action; once per Long Rest) and Genie's Wrath (once per turn when you hit with an attack roll, extra damage equal to your PB, of your patron's type). Lost or destroyed: a 1-hour ceremony during a rest brings a new one. Your patron's kind:", { keepText: true, choice: pick([
      opt('Dao', 'An earth genie: Bludgeoning damage; five earth spells join your list.', { expanded: ['Sanctuary', 'Spike Growth', 'Meld into Stone', 'Stone Shape', 'Wall of Stone'] }),
      opt('Djinni', 'An air genie: Thunder damage; five air spells join your list.', { expanded: ['Thunderwave', 'Gust of Wind', 'Wind Wall', 'Greater Invisibility', 'Seeming'] }),
      opt('Efreeti', 'A fire genie: Fire damage; five fire spells join your list.', { expanded: ['Burning Hands', 'Scorching Ray', 'Fireball', 'Fire Shield', 'Flame Strike'] }),
      opt('Marid', 'A water genie: Cold damage; five water spells join your list.', { expanded: ['Fog Cloud', 'Blur', 'Sleet Storm', 'Control Water', 'Cone of Cold'] })]) }),
    f(6, 'Elemental Gift', "Resistance to your patron's damage type (Dao Bludgeoning, Djinni Thunder, Efreeti Fire, Marid Cold). Bonus Action: Fly Speed 30 ft (hover) for 10 minutes, PB times per Long Rest."),
    f(10, 'Sanctuary Vessel', 'Bottled Respite can bring up to five willing creatures you can see within 30 ft (eject any as a Bonus Action). Anyone inside for at least 10 minutes gains the benefits of a Short Rest and adds your PB to the HP regained from Hit Point Dice spent there.'),
    f(14, 'Limited Wish', "As an action, ask your vessel for the effect of one spell of level 6 or lower with a casting time of an action, from any class's list, ignoring its requirements and costly components. Then not again until you finish 1d4 Long Rests.")] },
  { name: 'The Hexblade', source: XGE, summary: 'A patron in a sentient weapon: CHA for weapon attacks, armor and Martial weapons, a curse that adds damage and crits on 19.',
    expanded: ['Shield', 'Wrathful Smite', 'Blur', 'Branding Smite', 'Blink', 'Elemental Weapon', 'Phantasmal Killer', 'Staggering Smite', 'Banishing Smite', 'Cone of Cold'],
    riders: [{ name: "Hexblade's Curse", pb: true, note: 'against your cursed target (your attack rolls against it are Critical Hits on 19-20)' }], features: [
    f(3, 'Expanded Spell List', 'Ten more spells join the Warlock spell list for you (Level up offers them with your Warlock spells): weapon and battle magic of levels 1-5, smites among them.'),
    f(3, "Hexblade's Curse", 'Bonus Action: curse a creature you can see within 30 ft for 1 minute (ends if it dies, or you die or are Incapacitated): add your PB to damage rolls against it, your attack rolls against it score a Critical Hit on 19-20, and if it dies you regain Warlock level + CHA modifier HP (min 1). Once per Short or Long Rest.'),
    f(3, 'Hex Warrior', 'Training with Medium armor and Shields, and proficiency with Martial weapons. After each Long Rest, touch a weapon you are proficient with that lacks Two-Handed: until your next Long Rest you can use CHA instead of STR or DEX for its attack and damage rolls (with Pact of the Blade, every pact weapon you conjure).', { grants: { armor: ['Medium', 'Shields'], weapons: ['Martial weapons'] } }),
    f(6, 'Accursed Specter', 'When you slay a Humanoid, its spirit rises as a Specter under your command until the end of your next Long Rest, with Temporary HP equal to half your Warlock level and your CHA modifier (min +0) added to its attack rolls; it rolls its own Initiative. Once per Long Rest.'),
    f(10, 'Armor of Hexes', "Reaction when the target of your Hexblade's Curse hits you with an attack roll: roll a d6; on 4 or higher the attack misses."),
    f(14, 'Master of Hexes', "When your cursed creature dies, move the curse to another creature you can see within 30 ft (not while Incapacitated); you don't regain HP from the first one's death.")] },
  { name: 'The Undying', source: SCAG, summary: 'A patron who cheated death: Spare the Dying, Undead that hesitate to hurt you, self-healing, no need to eat or sleep.',
    expanded: ['False Life', 'Ray of Sickness', 'Blindness/Deafness', 'Silence', 'Feign Death', 'Speak with Dead', 'Aura of Life', 'Death Ward', 'Contagion', 'Legend Lore'], features: [
    f(3, 'Expanded Spell List', 'Ten more spells join the Warlock spell list for you (Level up offers them with your Warlock spells): magic of life and death of levels 1-5.'),
    f(3, 'Among the Dead', 'You learn Spare the Dying (a Warlock cantrip for you) and have Advantage on saves against disease. An Undead that targets you directly with an attack or a harmful spell makes a WIS save against your spell DC or must pick a new target or waste it (after a success, or if you target it, it is immune for 24 hours).', { grants: { cantrips: ['Spare the Dying'] } }),
    f(6, 'Defy Death', 'When you succeed on a Death Saving Throw or stabilize a creature with Spare the Dying, regain 1d8 + CON modifier HP (min 1). Once per Long Rest.'),
    f(10, 'Undying Nature', "You can hold your breath indefinitely and need no food, water or sleep (you still rest). You age one year for every ten, and magic can't age you."),
    f(14, 'Indestructible Life', 'Bonus Action: regain 1d8 + Warlock level HP, and a severed body part you hold in place reattaches. Once per Short or Long Rest.')] }
],
wizard: [
  { name: 'Chronurgy Magic', source: EGW, summary: 'Time magic (dunamancy): rerolls forced, INT to Initiative, creatures frozen in stasis, spells stored in beads.', features: [
    f(3, 'Chronal Shift', 'Reaction after you or a creature you can see within 30 ft makes a D20 Test and you see whether it succeeds: it rerolls and must use the new roll. Twice per Long Rest.'),
    f(3, 'Temporal Awareness', 'Add your INT modifier to Initiative rolls.'),
    f(6, 'Momentary Stasis', 'As an action, a Large or smaller creature you can see within 60 ft makes a CON save against your spell DC or is encased until the end of your next turn or until it takes damage: Incapacitated, with Speed 0. INT modifier (min 1) times per Long Rest.'),
    f(10, 'Arcane Abeyance', 'When you cast a spell with a level 1-4 slot, you can freeze it in a gray bead for 1 hour (Tiny, AC 15, 1 HP, immune to Poison and Psychic damage); a creature holding it can release the spell as an action (your attack bonus and DC; the releaser counts as the caster). Once per Short or Long Rest.'),
    f(14, 'Convergent Future', 'Reaction when you or a creature you can see within 60 ft makes a D20 Test: ignore the roll and decide that it is the minimum needed to succeed, or one less. You gain 1 Exhaustion level, removed only by a Long Rest.')] },
  { name: 'Graviturgy Magic', source: EGW, summary: "Gravity magic (dunamancy): weight halved or doubled, spell targets nudged, more damage from allies' hits and falls.", features: [
    f(3, 'Adjust Density', 'As an action, halve or double the weight of a Large or smaller creature or object you can see within 30 ft (Huge or smaller at Wizard 10) for up to 1 minute (Concentration, as for a spell). Halved: +10 ft Speed, jumps twice as far, Disadvantage on STR checks and saves. Doubled: -10 ft Speed, Advantage on STR checks and saves.'),
    f(6, 'Gravity Well', 'When you cast a spell on a creature, you can move it 5 ft to an unoccupied space if it is willing, the spell hits it with an attack, or it fails a save against the spell.'),
    f(10, 'Violent Attraction', "Reaction when another creature you can see within 60 ft hits with a weapon attack: the target takes 1d10 extra damage of the weapon's type; or when a creature within 60 ft takes falling damage: 2d10 more. INT modifier (min 1) times per Long Rest."),
    f(14, 'Event Horizon', 'As an action, a field of gravity for up to 1 minute (Concentration, as for a spell): a hostile creature that starts its turn within 30 ft makes a STR save against your spell DC: 2d10 Force and Speed 0 until the start of its next turn; on a success half damage, and each foot it moves this turn costs 2 extra feet. Once per Long Rest, or spend a level 3+ slot.')] },
  { name: 'Order of Scribes', source: TCE, summary: 'An awakened spellbook: damage types swapped between its spells, quick rituals, a spectral mind to cast from, better scrolls.', features: [
    f(3, 'Wizardly Quill', 'Bonus Action: a Tiny quill appears in your free hand (until you make another or die). It needs no ink, copying a spell into your spellbook with it takes 2 minutes per spell level, and you can erase what it wrote within 5 ft as a Bonus Action.'),
    f(3, 'Awakened Spellbook', 'While you hold your spellbook: it is your Spellcasting Focus; a Wizard spell cast with a slot can take the damage type of another spell in the book of that slot\'s level; once per Long Rest cast a ritual in its normal casting time. A lost book can be replaced during a Short Rest with the quill.'),
    f(6, 'Manifest Mind', "Bonus Action: the book's mind appears as a Tiny spectral object within 60 ft (Dim Light 10 ft, Darkvision 60 ft; it shares what it sees and hears); move it 30 ft as a Bonus Action. Cast Wizard spells on your turn from its space, PB times per Long Rest. It ends beyond 300 ft, when magic dispels it, if the book is destroyed, or when you dismiss it. Once per Long Rest, or spend a spell slot."),
    f(10, 'Master Scrivener', 'After each Long Rest, make a scroll of a level 1 or 2 spell from your book with a casting time of an action; it counts one level higher, only you can read it (cast it as an action), and it fades at your next Long Rest. Spell scrolls you craft with the quill take half the gold and time.'),
    f(14, 'One with the Word', 'Advantage on INT (Arcana) checks while you carry the book. Reaction when you take damage while the mind is out: dismiss it to prevent all that damage; then spells of at least 3d6 levels in all vanish from the book for 1d6 Long Rests (not enough spells: you drop to 0 HP). Once per Long Rest.')] },
  { name: 'War Magic', short: 'War Magic|War Mage', source: XGE, summary: 'A battle wizard: fends off hits and failed saves, INT to Initiative, stored surges of Force damage.', features: [
    f(3, 'Arcane Deflection', 'Reaction when you are hit by an attack or fail a save: +2 AC against that attack or +4 to that save; then you can cast only cantrips until the end of your next turn.'),
    f(3, 'Tactical Wit', 'Add your INT modifier to Initiative rolls.'),
    f(6, 'Power Surge', 'You store up to your INT modifier (min 1) power surges: one after each Long Rest; one more when you end another spell with a dispelling or countering spell, and one at the end of a Short Rest if you have none. Once per turn when your Wizard spell damages a creature or object, spend one to deal extra Force damage equal to half your Wizard level.'),
    f(10, 'Durable Magic', '+2 to AC and all saves while you are concentrating on a spell.'),
    f(14, 'Deflecting Shroud', 'When you use Arcane Deflection, up to three creatures of your choice within 60 ft take Force damage equal to half your Wizard level.')] }
]
};

// A spell these subclasses name that spells.js lacks altogether (a 2014 spell): name, level and school only
if (!DND.spellListOnly.some(s => s.name === 'Branding Smite')) DND.spellListOnly.push({ name: 'Branding Smite', level: 2, school: 'Evocation', classes: ['Paladin'], conc: true });

for (const [key, list] of Object.entries(LEGACY)) {
  const c = DND.classes[key];
  c.subclasses.push(...list.map(s => ({ legacy: true, ...s })));
}
})();
