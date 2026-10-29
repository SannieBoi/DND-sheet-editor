/* The Artificer (Eberron: Forge of the Artificer, 2025) with its subclasses: the five of that book and the Reanimator
   (Ravenloft: The Horrors Within). Same shape as a class in classes.js (see its header and subclasses.js), plus:
   levels[].plansKnown / magicItems (Replicate Magic Item), lists.plans (the magic item plans: lvl = the Artificer level
   needed; choice type 'list' with column = the table column that counts how many you know).
   Also tags 'Artificer' onto the spells of the Artificer spell list that spells.js has (the SRD ones; the others are
   from books we don't hold).
   Source of the facts: dnd2024.wikidot.com (artificer:main, the subclass pages and artificer:spell-list, 2026-10-28).
   Feature text is our own short summary, never the book's text (see CREDITS.md). */
window.DND = window.DND || {};

(() => {
const FOTA = 'Eberron: Forge of the Artificer', RAV = 'Ravenloft: The Horrors Within';
const f = (lvl, name, text, more) => ({ lvl, name, text, ...more });
const opt = (name, text, grants) => grants ? { name, text, grants } : { name, text };
const ASI = 'Take the Ability Score Improvement feat (+2 to one score or +1 to two, max 20) or another feat you qualify for.';

// Artificer Features table: [plans known, magic items, cantrips, prepared spells, slots]
const TABLE = [[0, 0, 2, 2, [2]], [4, 2, 2, 3, [2]], [4, 2, 2, 4, [3]], [4, 2, 2, 5, [3]], [4, 2, 2, 6, [4, 2]], [5, 3, 2, 6, [4, 2]],
  [5, 3, 2, 7, [4, 3]], [5, 3, 2, 7, [4, 3]], [5, 3, 2, 9, [4, 3, 2]], [6, 4, 3, 9, [4, 3, 2]], [6, 4, 3, 10, [4, 3, 3]], [6, 4, 3, 10, [4, 3, 3]],
  [6, 4, 3, 11, [4, 3, 3, 1]], [7, 5, 4, 11, [4, 3, 3, 1]], [7, 5, 4, 12, [4, 3, 3, 2]], [7, 5, 4, 12, [4, 3, 3, 2]], [7, 5, 4, 14, [4, 3, 3, 3, 1]],
  [8, 6, 4, 14, [4, 3, 3, 3, 1]], [8, 6, 4, 15, [4, 3, 3, 3, 2]], [8, 6, 4, 15, [4, 3, 3, 3, 2]]];
const NAMES = [['Spellcasting', "Tinker's Magic"], ['Replicate Magic Item'], ['Artificer Subclass'], ['Ability Score Improvement'], ['Artificer Subclass'],
  ['Magic Item Tinker'], ['Flash of Genius'], ['Ability Score Improvement'], ['Artificer Subclass'], ['Magic Item Adept'], ['Spell-Storing Item'],
  ['Ability Score Improvement'], [], ['Advanced Artifice'], ['Artificer Subclass'], ['Ability Score Improvement'], [], ['Magic Item Master'], ['Epic Boon'], ['Soul of Artifice']];

// Replicate Magic Item plans by the Artificer level they need ((A) = needs Attunement)
const PLANS = { 2: ['Alchemy Jug', 'Bag of Holding', 'Cap of Water Breathing', 'Common magic item (not a Potion, Scroll or cursed)', 'Goggles of Night',
  'Manifold Tool (A)', 'Repeating Shot (A)', 'Returning Weapon', 'Rope of Climbing', 'Sending Stones', 'Shield +1', 'Wand of Magic Detection', 'Wand of Secrets',
  'Wand of the War Mage +1 (A)', 'Weapon +1', 'Wraps of Unarmed Power +1'],
  6: ['Armor +1', 'Boots of Elvenkind', 'Boots of the Winding Path (A)', 'Cloak of Elvenkind (A)', 'Cloak of the Manta Ray', 'Dazzling Weapon (A)', 'Eyes of Charming (A)',
    'Eyes of Minute Seeing', 'Gloves of Thievery', 'Helm of Awareness', 'Lantern of Revealing', 'Mind Sharpener (A)', 'Necklace of Adaptation (A)', 'Pipes of Haunting',
    'Repulsion Shield', 'Ring of Swimming', 'Ring of Water Walking', 'Sentinel Shield', 'Spell-Refueling Ring (A)', 'Wand of Magic Missiles', 'Wand of Web (A)', 'Weapon of Warning (A)'],
  10: ['Armor of Resistance (A)', 'Dagger of Venom', 'Elven Chain', 'Ring of Feather Falling (A)', 'Ring of Jumping (A)', 'Ring of Mind Shielding (A)', 'Shield +2',
    'Uncommon Wondrous Item (not cursed)', 'Wand of the War Mage +2 (A)', 'Weapon +2', 'Wraps of Unarmed Power +2'],
  14: ['Armor +2', 'Arrow-Catching Shield (A)', 'Flame Tongue (A)', 'Rare Wondrous Item (not cursed)', 'Ring of Free Action (A)', 'Ring of Protection (A)', 'Ring of the Ram (A)'] };

const subclasses = [
  { name: 'Alchemist', source: FOTA, summary: 'Experimental elixirs that heal, speed or protect, stronger healing and Acid, Fire or Poison spells.',
    spells: { 3: ['Healing Word', 'Ray of Sickness'], 5: ['Flaming Sphere', "Melf's Acid Arrow"], 9: ['Gaseous Form', 'Mass Healing Word'], 13: ['Death Ward', 'Vitriolic Sphere'], 17: ['Cloudkill', 'Raise Dead'] }, features: [
    f(3, 'Tools of the Trade', "Proficiency with Alchemist's Supplies and the Herbalism Kit (another Artisan's Tools for each you have already); potions take half the time to brew.", { grants: { tools: ["Alchemist's Supplies", 'Herbalism Kit'] } }),
    f(3, 'Alchemist Spells', "Always prepared at Artificer level 3: Healing Word, Ray of Sickness; 5: Flaming Sphere, Melf's Acid Arrow; 9: Gaseous Form, Mass Healing Word; 13: Death Ward, Vitriolic Sphere; 17: Cloudkill, Raise Dead."),
    f(3, 'Experimental Elixir', "After a Long Rest with Alchemist's Supplies, make 2 elixirs (3 at Artificer 5, 4 at 9, 5 at 15) and roll a d6 for each: 1 Healing (2d8 + INT HP; 3d8 at 9, 4d8 at 15), 2 Swiftness (+10 ft Speed for 1 hour; 15 ft at 9, 20 ft at 15), 3 Resilience (+1 AC for 10 minutes; 1 hour at 9, 8 hours at 15), 4 Boldness (+1d4 to attacks and saves for 1 minute; 10 minutes at 9, 1 hour at 15), 5 Flight (Fly 10 ft for 10 minutes; 20 ft at 9, 30 ft at 15), 6 your pick. Drinking one (or giving it to a creature within 5 ft) is a Bonus Action. Magic action and a spell slot: one more, effect of your choice. Leftovers vanish at the next Long Rest."),
    f(5, 'Alchemical Savant', "A spell cast with Alchemist's Supplies as its focus adds your INT modifier (min +1) to one healing roll or one Acid, Fire or Poison damage roll."),
    f(9, 'Restorative Reagents', "Cast Lesser Restoration without a slot or preparing it (Alchemist's Supplies as focus), INT modifier (min 1) times per Long Rest."),
    f(15, 'Chemical Mastery', "Once per turn your Artificer spell that deals Acid, Fire or Poison damage to a target also deals it 2d8 Force. Resistance to Acid and Poison, Immunity to Poisoned. Tasha's Bubbling Cauldron once per Long Rest without a slot, preparing it or Material components.")] },
  { name: 'Armorer', source: FOTA, summary: 'Arcane Armor with a built-in weapon that uses INT: a giant Dreadnaught, a Guardian or a stealthy Infiltrator.',
    spells: { 3: ['Magic Missile', 'Thunderwave'], 5: ['Mirror Image', 'Shatter'], 9: ['Hypnotic Pattern', 'Lightning Bolt'], 13: ['Fire Shield', 'Greater Invisibility'], 17: ['Passwall', 'Wall of Force'] }, features: [
    f(3, 'Tools of the Trade', "Heavy armor training and proficiency with Smith's Tools (another Artisan's Tools if you have them); armor takes half the time to craft.", { grants: { armor: ['Heavy'], tools: ["Smith's Tools"] } }),
    f(3, 'Armorer Spells', 'Always prepared at Artificer level 3: Magic Missile, Thunderwave; 5: Mirror Image, Shatter; 9: Hypnotic Pattern, Lightning Bolt; 13: Fire Shield, Greater Invisibility; 17: Passwall, Wall of Force.'),
    f(3, 'Arcane Armor', "Magic action with Smith's Tools: armor you wear becomes Arcane Armor (until you don other armor or die): no STR requirement, don or doff it as a Utilize action, it can't be taken off you against your will, and it is a Spellcasting Focus."),
    f(3, 'Armor Model', "Pick a model (change it after a Short or Long Rest with Smith's Tools); its weapon uses INT for attack and damage rolls.", { choice: { type: 'option', swappable: true, options: [
      opt('Dreadnaught', 'Force Demolisher: Simple Melee, Reach, 1d10 Force; push or pull a smaller creature 10 ft. Giant Stature: Bonus Action, 1 minute, +5 ft reach and Large; INT modifier (min 1) uses per Long Rest.'),
      opt('Guardian', 'Thunder Pulse: Simple Melee, 1d8 Thunder; the target has Disadvantage on attacks against others than you until your next turn. Defensive Field: while Bloodied, Bonus Action for Temporary HP equal to your Artificer level.'),
      opt('Infiltrator', 'Lightning Launcher: Simple Ranged 90/300 ft, 1d6 Lightning, once per turn +1d6 Lightning on a hit. Powered Steps: +5 ft Speed. Dampening Field: Advantage on DEX (Stealth) checks.')] } }),
    f(5, 'Extra Attack', 'Attack twice when you take the Attack action.'),
    f(9, 'Improved Armorer', "One more Replicate Magic Item plan and one more item, both from the Armor category; +1 to attack and damage rolls with your armor model's weapon."),
    f(15, 'Perfected Armor', "Dreadnaught: Demolisher 2d6; Giant Stature gives +10 ft reach, Large or Huge, and Advantage on STR checks and saves. Guardian: Thunder Pulse 1d10; Reaction when a Huge or smaller creature ends its turn within 30 ft: STR save or pulled 25 ft toward you (and attacked if it ends within 5 ft), INT modifier uses per Long Rest. Infiltrator: Launcher 2d6, its targets glow and have Disadvantage on attacks against you; Bonus Action Fly Speed twice your Speed this turn, INT modifier uses per Long Rest.")] },
  { name: 'Artillerist', source: FOTA, summary: 'An Eldritch Cannon that burns, blasts or shields, an Arcane Firearm that adds damage to spells.',
    spells: { 3: ['Shield', 'Thunderwave'], 5: ['Scorching Ray', 'Shatter'], 9: ['Fireball', 'Wind Wall'], 13: ['Ice Storm', 'Wall of Fire'], 17: ['Cone of Cold', 'Wall of Force'] }, features: [
    f(3, 'Tools of the Trade', "Proficiency with Martial Ranged weapons and Woodcarver's Tools (another Artisan's Tools if you have them); Wands take half the time to craft.", { grants: { weapons: ['Martial Ranged weapons'], tools: ["Woodcarver's Tools"] } }),
    f(3, 'Artillerist Spells', 'Always prepared at Artificer level 3: Shield, Thunderwave; 5: Scorching Ray, Shatter; 9: Fireball, Wind Wall; 13: Ice Storm, Wall of Fire; 17: Cone of Cold, Wall of Force.'),
    f(3, 'Eldritch Cannon', "Magic action with Smith's or Woodcarver's Tools: a Small or Tiny cannon within 5 ft for 1 hour (AC 18, HP 5 x Artificer level, Mending heals it 2d6, immune to Poison and Psychic). Once per Long Rest or spend a slot; one at a time. Bonus Action within 60 ft: it moves 15 ft and fires: Flamethrower (15-ft Cone, DEX save, 2d8 Fire, half on a save), Force Ballista (ranged spell attack, 120 ft, 2d8 Force and push 5 ft) or Protector (it and creatures of your choice within 10 ft gain 1d8 + INT Temporary HP)."),
    f(5, 'Arcane Firearm', "After a Long Rest, carve sigils into a Rod, Staff, Wand or Martial Ranged weapon with Woodcarver's Tools: it is your focus, and Artificer spells cast through it add 1d8 to one damage roll."),
    f(9, 'Explosive Cannon', 'Cannon damage and Protector Temporary HP +1d8. Reaction when your cannon takes damage (within 60 ft): detonate it, DEX save for creatures within 20 ft, 3d10 Force (half on a save).'),
    f(15, 'Fortified Position', 'Two cannons at once (one Magic action makes both; a slot for each if you need one), both fire with one Bonus Action; you and allies within 10 ft of a cannon have Half Cover.')] },
  { name: 'Battle Smith', source: FOTA, summary: 'A Steel Defender companion, Martial weapons with INT on magic weapons, Extra Attack, Arcane Jolt damage or healing.', riders: [{ name: 'Arcane Jolt', from: 9, dice: { 9: '2d6', 15: '4d6' }, type: 'force', note: 'a magic weapon, once per turn; INT modifier uses per Long Rest' }],
    spells: { 3: ['Heroism', 'Shield'], 5: ['Shining Smite', 'Warding Bond'], 9: ['Aura of Vitality', 'Conjure Barrage'], 13: ['Aura of Purity', 'Fire Shield'], 17: ['Banishing Smite', 'Mass Cure Wounds'] }, features: [
    f(3, 'Tools of the Trade', "Proficiency with Smith's Tools (another Artisan's Tools if you have them); weapons take half the time to craft.", { grants: { tools: ["Smith's Tools"] } }),
    f(3, 'Battle Smith Spells', 'Always prepared at Artificer level 3: Heroism, Shield; 5: Shining Smite, Warding Bond; 9: Aura of Vitality, Conjure Barrage; 13: Aura of Purity, Fire Shield; 17: Banishing Smite, Mass Cure Wounds.'),
    f(3, 'Battle Ready', 'Use INT for attack and damage rolls with magic weapons. Proficiency with Martial weapons; a weapon you are proficient with can be your Spellcasting Focus.', { grants: { weapons: ['Martial weapons'] } }),
    f(3, 'Steel Defender', "A Medium Construct companion (a new one after a Long Rest with Smith's Tools). It acts on your turn and Dodges unless you command it (Bonus Action). Dead less than an hour: Magic action and a slot revive it in 1 minute. AC 12 + INT, HP 5 + 5 x Artificer level, Speed 40 ft, adds your PB to checks and saves. Force-Empowered Rend: your spell attack bonus, 1d8 + 2 + INT Force. Repair (3 a day): 2d8 + INT HP to itself or a construct or object within 5 ft. Deflect Attack (Reaction): a creature within 5 ft attacking someone else has Disadvantage."),
    f(5, 'Extra Attack', "Attack twice when you take the Attack action; one attack can be your Steel Defender's Rend instead."),
    f(9, 'Arcane Jolt', 'Once per turn when your magic weapon or your Steel Defender hits: +2d6 Force damage, or 2d6 healing to a creature or object within 30 ft of the target. Uses = INT modifier (min 1) per Long Rest.'),
    f(15, 'Improved Defender', 'Arcane Jolt deals or heals 4d6; Deflect Attack deals 1d4 + INT Force to the attacker.')] },
  { name: 'Cartographer', source: FOTA, summary: 'Magic maps that link the party: Initiative, teleports to map holders, free Faerie Fire, saving holders from death.',
    spells: { 3: ['Faerie Fire', 'Guiding Bolt', 'Healing Word'], 5: ['Locate Object', 'Mind Spike'], 9: ['Call Lightning', 'Clairvoyance'], 13: ['Banishment', 'Locate Creature'], 17: ['Scrying', 'Teleportation Circle'] }, features: [
    f(3, 'Tools of the Trade', "Proficiency with Calligrapher's Supplies and Cartographer's Tools (another Artisan's Tools for each you have); Spell Scrolls take half the time to scribe.", { grants: { tools: ["Calligrapher's Supplies", "Cartographer's Tools"] } }),
    f(3, 'Cartographer Spells', 'Always prepared at Artificer level 3: Faerie Fire, Guiding Bolt, Healing Word; 5: Locate Object, Mind Spike; 9: Call Lightning, Clairvoyance; 13: Banishment, Locate Creature; 17: Scrying, Teleportation Circle.'),
    f(3, "Adventurer's Atlas", "After a Long Rest with Cartographer's Tools, give magic maps to 2 up to 1 + INT modifier creatures (you can be one). Holders add 1d4 to Initiative, know where the other holders are, and can target each other with spells and effects regardless of sight or cover (within range)."),
    f(3, 'Mapping Magic', 'Cast Faerie Fire without a slot, INT modifier (min 1) times per Long Rest. Portal Jump: on your turn spend half your Speed to teleport to a space within 10 ft, or within 5 ft of a map holder within 30 ft.'),
    f(5, 'Guided Precision', 'Once per turn add your INT modifier to one damage roll of a Cartographer spell or of an attack that hits a creature in your Faerie Fire. Damage can\'t break your Concentration on Faerie Fire.'),
    f(9, 'Ingenious Movement', 'When you use Flash of Genius, you or a willing creature you can see within 30 ft can also teleport up to 30 ft.'),
    f(15, 'Superior Atlas', 'Safe Haven: a map holder dropping to 0 HP (not killed outright) can destroy its map to go to 2 x Artificer level HP and teleport next to you or another holder. Unerring Path: as a holder, cast Find the Path once per Long Rest without a slot, preparing it or components.')] },
  { name: 'Reanimator', source: RAV, summary: 'A stitched-together undead companion with strange modifications, jolts that revive the dying.',
    spells: { 3: ['False Life', 'Spare the Dying', 'Witch Bolt'], 5: ['Blindness/Deafness', 'Enhance Ability'], 9: ['Animate Dead', 'Lightning Bolt'], 13: ['Blight', 'Death Ward'], 17: ['Antilife Shell', 'Raise Dead'] }, features: [
    f(3, 'Reanimator Spells', 'Always prepared at Artificer level 3: False Life, Spare the Dying, Witch Bolt; 5: Blindness/Deafness, Enhance Ability; 9: Animate Dead, Lightning Bolt; 13: Blight, Death Ward; 17: Antilife Shell, Raise Dead.'),
    f(3, "Reanimator's Skill Set", "Jolt to Life: Spare the Dying can revive: the target regains HP equal to your Artificer level and creatures of your choice within 10 ft of it make a DEX save, 2d4 Lightning (3d4 at Artificer 11, 4d4 at 17), half on a save; INT modifier uses per Long Rest. Proficiency with Alchemist's Supplies (another Artisan's Tools if you have them).", { grants: { tools: ["Alchemist's Supplies"] } }),
    f(3, 'Reanimated Companion', 'Magic action with Tinker\'s or Artisan\'s Tools: a Medium Undead companion until your next Long Rest (once per Long Rest or spend a slot; one at a time). It acts on your turn and Dodges unless you command it (Bonus Action). AC 10 + INT, HP 5 + 5 x Artificer level, Speed 30 ft, Blindsight 60 ft, Resistance to Necrotic and Poison, Lightning heals it. Dreadful Swipe: your spell attack bonus, 1d4 + INT Necrotic, and the target can\'t make Opportunity Attacks until its next turn. Death Burst when it dies: DEX save in 10 ft, 2d4 Necrotic (half on a save).'),
    f(5, 'Strange Modifications', 'Each companion you make gets one: Arcane Conduit (cast spells from its space; once per turn + INT to the damage of an Evocation or Necromancy Artificer spell while it is within 120 ft) or Ferocity (Dreadful Swipe deals 1d6).'),
    f(9, 'Improved Reanimation', "Death Burst deals 4d4; your companion's Necrotic damage ignores Resistance."),
    f(9, 'Macabre Modifications', 'Your companion gets two modifications, with new options: Bloated (Large, Swipe pushes 10 ft, + INT to Death Burst), Gaunt (Speed 45 ft and Climb, walks on ceilings; creatures starting their turn within 10 ft make a WIS save or are Frightened) and Moist (Swim Speed, squeezes through 1 inch, attackers within 10 ft take INT modifier Acid).'),
    f(15, 'Refined Reanimation', 'Raise Dead once per Long Rest without a slot or Material components. Life Transfer: Reaction when you or your companion takes damage, gain HP equal to its current HP; it then dies (Death Burst). Companions get three modifications.')] }
];

DND.classes.artificer = {
  name: 'Artificer',
  source: FOTA,
  hitDie: 8,
  primaryAbility: 'Intelligence',
  saves: ['CON', 'INT'],
  skills: { choose: 2, from: ['Arcana', 'History', 'Investigation', 'Medicine', 'Nature', 'Perception', 'Sleight of Hand'] },
  armorTraining: ['Light Armor', 'Medium Armor', 'Shields'],
  weaponProficiency: { simple: true, martial: null },
  tools: ["Thieves' Tools", "Tinker's Tools"],
  toolChoice: { count: 1, from: ["Artisan's Tools"] },
  startingEquipment: [{ items: ['Studded Leather Armor', 'Dagger', "Thieves' Tools", "Tinker's Tools", "Dungeoneer's Pack"], gp: 16 }, { gp: 150 }],
  spellcasting: { ability: 'INT', type: 'half' }, // multiclassing adds half the Artificer levels, rounded up (as Paladin and Ranger)
  weaponMastery: null,
  attackFeatures: [],
  multiclass: { requires: ['INT'], hitDie: true, armor: ['Light', 'Medium', 'Shields'], tools: ["Tinker's Tools"], skills: { count: 1, from: 'class' },
    text: "Hit Point Die, Tinker's Tools, one Artificer skill, Light and Medium armor and Shields training, and the level 1 features." },
  lists: { plans: { title: 'Magic item plans', column: 'plansKnown',
    items: Object.entries(PLANS).flatMap(([lvl, names]) => names.map(name => ({ name, lvl: +lvl, text: lvl > 2 ? `Artificer ${lvl}+` : '' }))) } },
  features: [
    f(1, 'Spellcasting', "Cast Artificer spells with INT, using Thieves', Tinker's or other Artisan's Tools you are proficient with as focus (in hand). Cantrips and prepared spells per the Artificer table; after a Long Rest swap one cantrip and change your prepared spells."),
    f(1, "Tinker's Magic", "You know Mending. Magic action with Tinker's Tools: create a simple item within 5 ft (Ball Bearings, Basket, Bedroll, Bell, Blanket, Block and Tackle, Bottle, Bucket, Caltrops, Candle, Crowbar, Flask, Grappling Hook, Hunting Trap, Jug, Lamp, Manacles, Net, Oil, Paper, Parchment, Pole, Pouch, Rope, Sack, Shovel, Iron Spikes, String, Tinderbox, Torch or Vial); it vanishes at your next Long Rest. Uses = INT modifier (min 1) per Long Rest.", { grants: { alwaysPrepared: ['Mending'] } }),
    f(2, 'Replicate Magic Item', "Learn 4 magic item plans (more per the Plans Known column; swap one each Artificer level). After a Long Rest with Tinker's Tools, make magic items from different plans, up to the Magic Items column; you can attune at once. Items vanish 1d4 days after your death or when you drop their plan; a Wand or Weapon made this way can be your focus.", { choice: { type: 'list', list: 'plans' } }),
    f(3, 'Artificer Subclass', 'Choose an Artificer subclass. You gain its features at the Artificer levels it lists.', { choice: { type: 'subclass' } }),
    f(4, 'Ability Score Improvement', ASI + ' Again at Artificer levels 8, 12 and 16.', { choice: { type: 'feat', category: 'general' } }),
    f(6, 'Magic Item Tinker', 'Charge Magic Item: Bonus Action, spend a slot to give a replicated item charges equal to its level. Drain Magic Item: Bonus Action, a replicated item vanishes and becomes a level 1 slot (Common) or level 2 slot (Uncommon or Rare) until your next Long Rest; once per Long Rest. Transmute Magic Item: Magic action, turn a replicated item into another you know the plan of; once per Long Rest.'),
    f(7, 'Flash of Genius', 'Reaction when you or a creature you can see within 30 ft fails an ability check or save: add your INT modifier (min +1). Uses = INT modifier (min 1) per Long Rest.'),
    f(8, 'Ability Score Improvement', ASI, { choice: { type: 'feat', category: 'general' } }),
    f(10, 'Magic Item Adept', 'You can attune to up to four magic items.'),
    f(11, 'Spell-Storing Item', "After a Long Rest store a level 1-3 Artificer spell with a casting time of an action (no consumed Material) in a weapon or focus. Whoever holds it can take a Magic action to cast it with your modifier (once per turn), up to twice your INT modifier (min 2) times."),
    f(12, 'Ability Score Improvement', ASI, { choice: { type: 'feat', category: 'general' } }),
    f(14, 'Advanced Artifice', 'You can attune to up to five magic items, and you regain one Flash of Genius use on a Short Rest.'),
    f(16, 'Ability Score Improvement', ASI, { choice: { type: 'feat', category: 'general' } }),
    f(18, 'Magic Item Master', 'You can attune to up to six magic items.'),
    f(19, 'Epic Boon', 'Take an Epic Boon feat or another feat you qualify for.', { choice: { type: 'feat', category: 'epic-boon' } }),
    f(20, 'Soul of Artifice', 'Cheat Death: when you drop to 0 HP (not killed outright), disintegrate Uncommon or Rare replicated items to go to 20 HP per item instead. Magical Guidance: a Short Rest restores all Flash of Genius uses while you are attuned to a magic item.')],
  levels: TABLE.map(([plansKnown, magicItems, cantrips, prepared, slots], i) => ({ lvl: i + 1, pb: Math.ceil((i + 1) / 4) + 1, features: NAMES[i], attacks: 1,
    plansKnown, magicItems, spells: { cantrips, prepared, slots: [...slots, ...Array(9 - slots.length).fill(0)] } })),
  subclass: subclasses[0],
  subclasses
};

// The Artificer spell list (the spells spells.js holds; Basic Rules names are matched through aliases)
const LIST = ['Acid Splash', 'Dancing Lights', 'Elementalism', 'Fire Bolt', 'Guidance', 'Light', 'Mage Hand', 'Message', 'Poison Spray', 'Prestidigitation',
  'Ray of Frost', 'Resistance', 'Shocking Grasp', 'Spare the Dying', 'Thorn Whip', 'Thunderclap', 'True Strike',
  'Alarm', 'Cure Wounds', 'Detect Magic', 'Disguise Self', 'Expeditious Retreat', 'Faerie Fire', 'False Life', 'Feather Fall', 'Grease', 'Identify', 'Jump',
  'Longstrider', 'Purify Food and Drink', 'Sanctuary',
  'Aid', 'Alter Self', 'Arcane Lock', 'Arcane Vigor', 'Blur', 'Continual Flame', 'Darkvision', "Dragon's Breath", 'Enhance Ability', 'Enlarge/Reduce', 'Heat Metal',
  'Invisibility', 'Lesser Restoration', 'Levitate', 'Magic Mouth', 'Magic Weapon', 'Protection from Poison', 'Rope Trick', 'See Invisibility', 'Spider Climb', 'Web',
  'Blink', 'Create Food and Water', 'Dispel Magic', 'Elemental Weapon', 'Fly', 'Glyph of Warding', 'Haste', 'Protection from Energy', 'Revivify', 'Water Breathing', 'Water Walk',
  'Arcane Eye', 'Fabricate', 'Freedom of Movement', "Leomund's Secret Chest", "Mordenkainen's Faithful Hound", "Mordenkainen's Private Sanctum",
  "Otiluke's Resilient Sphere", 'Stone Shape', 'Stoneskin', 'Summon Construct',
  'Animate Objects', "Bigby's Hand", 'Circle of Power', 'Creation', 'Greater Restoration', 'Wall of Stone'].map(n => n.toLowerCase());
// Summon Construct (Player's Handbook: Artificer and Wizard lists, Clockwork Sorcery) isn't in spells.js: name only
DND.spellListOnly.push({ name: 'Summon Construct', level: 4, school: 'Conjuration', classes: ['Artificer', 'Wizard'], conc: true, material: true });
for (const s of [...DND.spells, ...DND.spellListOnly || []]) {
  if ([s.name, ...s.aliases || []].some(n => LIST.includes(n.toLowerCase())) && !s.classes.includes('Artificer')) s.classes = [...s.classes, 'Artificer'].sort();
}
})();
