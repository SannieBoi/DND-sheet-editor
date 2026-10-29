/* The Blood Hunter by Matthew Mercer (Critical Role partnered content on D&D Beyond, written for the 2014 rules) with its
   four orders. Same shape as a class in classes.js (see its header and subclasses.js), plus:
   hemocraft { ability, alt } (Hemocraft modifier: INT, or WIS with the DM's permission; save DC 8 + PB + modifier),
   levels[].hemocraftDie / bloodCurses (known) / bloodMaledict (uses) / crimsonRites (known), lists.bloodCurses / .rites
   (choice type 'list' with column = the table column that counts them), multiclass.requiresOneOf (one of these 13+ too).
   Kept as written for its own rules: Fighting Style lets you pick one of four styles, here the 2024 Fighting Style feats of
   the same names (choice.only); Ability Score Improvement allows a feat (2024 style) at 4, 8, 12, 16 and 19.
   The Order of the Profane Soul casts with Pact Magic from the Warlock list (spellcasting.type 'pact'; with Warlock levels,
   a third of the Blood Hunter levels add to the Warlock level for slots).
   Source: https://www.dndbeyond.com/classes/357975-blood-hunter (2026-10-28). Feature text is our own short summary,
   never the class's text (see CREDITS.md). */
window.DND = window.DND || {};

(() => {
const BH = 'Blood Hunter (Critical Role)';
const f = (lvl, name, text, more) => ({ lvl, name, text, ...more });
const opt = (name, text, more) => ({ name, text, ...more });
const ASI = 'Take the Ability Score Improvement feat (+2 to one score or +1 to two, max 20) or another feat you qualify for.';

// [hemocraft die, blood curses known, Blood Maledict uses, crimson rites known, features]
const TABLE = [[4, 1, 1, 0, ["Hunter's Bane", 'Blood Maledict']], [4, 1, 1, 1, ['Fighting Style', 'Crimson Rite']], [4, 1, 1, 1, ['Blood Hunter Order']],
  [4, 1, 1, 1, ['Ability Score Improvement']], [6, 1, 1, 1, ['Extra Attack']], [6, 2, 2, 1, ['Brand of Castigation', 'Blood Maledict improvement']],
  [6, 2, 2, 2, ['Blood Hunter Order', 'Crimson Rite improvement']], [6, 2, 2, 2, ['Ability Score Improvement']], [6, 2, 2, 2, ['Grim Psychometry']],
  [6, 3, 2, 2, ['Dark Augmentation']], [8, 3, 2, 2, ['Blood Hunter Order']], [8, 3, 2, 2, ['Ability Score Improvement']],
  [8, 3, 3, 2, ['Brand of Tethering', 'Blood Maledict improvement']], [8, 4, 3, 3, ['Hardened Soul', 'Crimson Rite improvement']], [8, 4, 3, 3, ['Blood Hunter Order']],
  [8, 4, 3, 3, ['Ability Score Improvement']], [10, 4, 4, 3, ['Blood Maledict improvement']], [10, 5, 4, 3, ['Blood Hunter Order']], [10, 5, 4, 3, ['Ability Score Improvement']],
  [10, 5, 4, 3, ['Sanguine Mastery']]];

// Profane Soul Pact Magic by Blood Hunter level: [spells known, slots, slot level]
const PROFANE = [[0, 0, 0], [0, 0, 0], [2, 1, 1], [2, 1, 1], [3, 1, 1], [3, 2, 1], [4, 2, 2], [4, 2, 2], [5, 2, 2], [5, 2, 2], [6, 2, 2], [6, 2, 2],
  [7, 2, 3], [7, 2, 3], [8, 2, 3], [8, 2, 3], [9, 2, 3], [9, 2, 3], [10, 2, 4], [11, 2, 4]];
const PATRONS = ['Archfey', 'Celestial', 'Fathomless', 'Fiend', 'Genie', 'Great Old One', 'Hexblade', 'Undead', 'Undying'];

const subclasses = [
  { name: 'Order of the Ghostslayer', short: 'Ghostslayer', source: BH, summary: 'Hunters of the undead: a radiant Rite of the Dawn, an extra curse that hits anything, walking through walls.', features: [
    f(3, 'Rite of the Dawn', 'A new Crimson Rite: its extra damage is Radiant; while active the weapon sheds Bright Light 20 ft, you have Resistance to Necrotic damage, and hits on Undead roll one more hemocraft die.'),
    f(3, 'Curse Specialist', 'One more Blood Maledict use, and your blood curses work on creatures without blood.'),
    f(7, 'Aether Walk', 'At the start of your turn (not Incapacitated), for Hemocraft modifier (min 1) rounds: move through creatures and objects as Difficult Terrain and see and affect the Ethereal Plane; 1d10 Force if you end a turn inside an object (ending inside one shunts you out for 2 Force per foot). Once per Short or Long Rest (twice at Blood Hunter 15).'),
    f(11, 'Brand of Sundering', 'Hits with a Crimson Rite weapon roll one more hemocraft die for the rite. A creature you branded can\'t move through creatures or objects.'),
    f(15, 'Blood Curse of the Exorcist', 'You know this curse (not counted against your curses): Bonus Action, a creature you can see within 30 ft stops being Charmed, Frightened or possessed. Amplify: whoever did it takes 3d6 Psychic and makes a WIS save or is Stunned until the end of your next turn.'),
    f(18, 'Rite Revival', 'With a Crimson Rite active, when you drop to 0 HP (not killed outright), end all your rites to drop to 1 HP instead.')] },
  { name: 'Order of the Lycan', short: 'Lycan', source: BH, summary: 'Controlled lycanthropy: a hybrid form with claws, tough hide and bloodlust; faster, then regenerating.', features: [
    f(3, 'Heightened Senses', 'Advantage on WIS (Perception) checks that rely on hearing or smell.'),
    f(3, 'Hybrid Transformation', 'Bonus Action: a hybrid form for up to 1 hour (you can speak, use gear and wear armor; revert as a Bonus Action, or when you fall unconscious or die). Once per Short or Long Rest. In the form: Advantage on STR checks and saves and +1 melee damage (+2 at Blood Hunter 11, +3 at 18); Resistance to nonmagical, non-silvered Bludgeoning, Piercing and Slashing and +1 AC without heavy armor; Crimson Rite works on your unarmed strikes, which can use DEX and deal 1d6 Bludgeoning or Slashing (1d8 at 11), and after an unarmed Attack action you can strike again as a Bonus Action. Bloodlust: starting a turn below half your HP, DC 8 WIS save or attack the nearest creature (automatic failure while concentrating or raging).'),
    f(7, "Stalker's Prowess", 'Speed +10 ft, long jumps +10 ft, high jumps +3 ft. In hybrid form: +1 to unarmed attack rolls (+2 at Blood Hunter 11, +3 at 18), and with a rite active your unarmed strikes are magical.', { grants: { speed: 10 } }),
    f(11, 'Advanced Transformation', 'Hybrid Transformation twice per Short or Long Rest. In hybrid form, at the start of each turn while below half your HP (but above 0), regain 1 + CON modifier HP (min 1) before the bloodlust save.'),
    f(15, 'Brand of the Voracious', 'Advantage on the bloodlust save in hybrid form, and in hybrid form Advantage on attacks against a creature you branded.'),
    f(18, 'Hybrid Transformation Mastery', 'Transform as often as you like; the form lasts until you revert, fall unconscious or die. You know the Blood Curse of the Howl (not counted): action, creatures of your choice within 30 ft that hear you make a WIS save or are Frightened until the end of your next turn (Stunned too if they fail by 5+); a success makes them immune for 24 hours. Amplify: 60 ft.')],
    riders: [{ name: 'Hybrid form', melee: true, flat: { 3: 1, 11: 2, 18: 3 } }] },
  { name: 'Order of the Mutant', short: 'Mutant', source: BH, summary: 'Alchemical mutagens that raise scores or grant powers, each with a drawback; poison immunity.', lists: {
    formulas: { title: 'Mutagen formulas', known: { 3: 4, 7: 5, 11: 6, 15: 7, 18: 8 }, items: [
      opt('Aether', 'Fly Speed 20 ft for 1 hour; Disadvantage on STR and DEX checks.', { lvl: 11 }),
      opt('Alluring', 'Advantage on CHA checks; Disadvantage on Initiative.'),
      opt('Celerity', 'DEX and its maximum +3 (+4 at Blood Hunter 11, +5 at 18); Disadvantage on WIS saves.'),
      opt('Conversant', 'Advantage on INT checks; Disadvantage on WIS checks.'),
      opt('Cruelty', 'When you take the Attack action, one more weapon attack as a Bonus Action; Disadvantage on INT, WIS and CHA saves.', { lvl: 11 }),
      opt('Deftness', 'Advantage on DEX checks; Disadvantage on WIS checks.'),
      opt('Embers', 'Resistance to Fire, Vulnerability to Cold.'),
      opt('Gelid', 'Resistance to Cold, Vulnerability to Fire.'),
      opt('Impermeable', 'Resistance to Piercing, Vulnerability to Slashing.'),
      opt('Mobility', 'Immunity to Grappled and Restrained (and Paralyzed at Blood Hunter 11); Disadvantage on STR checks.'),
      opt('Nighteye', 'Darkvision 60 ft (or 60 ft more); Disadvantage on attacks and sight-based Perception in direct sunlight.'),
      opt('Percipient', 'Advantage on WIS checks; Disadvantage on CHA checks.'),
      opt('Potency', 'STR and its maximum +3 (+4 at Blood Hunter 11, +5 at 18); Disadvantage on DEX saves.'),
      opt('Precision', 'Weapon attacks score a Critical Hit on 19-20; Disadvantage on STR saves.', { lvl: 11 }),
      opt('Rapidity', 'Speed +10 ft (+15 ft at Blood Hunter 15); Disadvantage on INT checks.'),
      opt('Reconstruction', 'For 1 hour, at the start of each turn while below half your HP (above 0), regain HP equal to your PB; Speed -10 ft.', { lvl: 7 }),
      opt('Sagacity', 'INT and its maximum +3 (+4 at Blood Hunter 11, +5 at 18); Disadvantage on CHA saves.'),
      opt('Shielded', 'Resistance to Slashing, Vulnerability to Bludgeoning.'),
      opt('Unbreakable', 'Resistance to Bludgeoning, Vulnerability to Piercing.'),
      opt('Vermillion', 'One more Blood Maledict use; Disadvantage on Death Saving Throws.')] } }, features: [
    f(3, 'Mutagencraft', 'Bonus Action: drink a mutagen; its effect and side effect last until you finish a Short or Long Rest (an action flushes them all). After each Short or Long Rest brew 1 mutagen (2 at Blood Hunter 7, 3 at 15); they work only for you and go inert at your next rest. You know 4 formulas (5 at 7, 6 at 11, 7 at 15, 8 at 18; swap one when you learn one).', { choice: { type: 'list', list: 'formulas' } }),
    f(7, 'Strange Metabolism', 'Immunity to Poison damage and the Poisoned condition. Bonus Action: ignore one mutagen\'s side effect for 1 minute, once per Long Rest.'),
    f(11, 'Brand of Axiom', 'Branding a creature ends illusions and invisibility on it, and it can\'t benefit from them while branded. A shape-changed creature you brand makes a WIS save or returns to its true form and is Stunned until the end of your next turn; each later attempt to change shape needs the same save.'),
    f(15, 'Blood Curse of Corrosion', 'You know this curse (not counted): Bonus Action, a creature within 30 ft is Poisoned (CON save at the end of each of its turns ends it). Amplify: 4d6 Necrotic when cursed and on each failed save.'),
    f(18, 'Exalted Mutation', 'Bonus Action: end one mutagen affecting you and take on another formula you know in its place. Uses = Hemocraft modifier (min 1) per Long Rest.')] },
  { name: 'Order of the Profane Soul', short: 'Profane Soul', source: BH, summary: 'A pact with a patron: Warlock spells and cantrips (Pact Magic), patron gifts through your Crimson Rite.',
    spellcasting: { type: 'pact', ability: 'INT', list: 'Warlock', cantrips: { 3: 2, 10: 3 }, prepared: PROFANE.map(r => r[0]), pact: PROFANE.map(r => ({ slots: r[1], slotLevel: r[2] })) },
    features: [
    f(3, 'Otherworldly Patron', 'Pick a patron; it shapes your Rite Focus, Revealed Arcana and Unsealed Arcana.', { choice: { type: 'option', options: PATRONS.map(p => opt(p, `Your patron is the ${p}.`)) } }),
    f(3, 'Pact Magic', 'Warlock spells with your Hemocraft ability (INT, or WIS): 2 cantrips (3 at Blood Hunter 10) and spells known per the Profane Soul table (2 at level 3 up to 11), of a level up to your slot level; 1 Pact slot (2 from Blood Hunter 6), level 1 rising to 4, back on a Short or Long Rest. Swap one spell each Blood Hunter level.'),
    f(3, 'Rite Focus', 'With a rite active, your weapon is a focus for your Warlock spells and gives a patron gift: Archfey (a creature you damage with it glows: no cover or invisibility until the end of your next turn), Celestial (Bonus Action and a Blood Maledict use: heal a creature within 60 ft a hemocraft die + Hemocraft modifier), Fathomless (breathe water; once per turn a rite hit cuts Speed by 10 ft), Fiend (reroll 1s and 2s on Rite of the Flame dice), Genie (Bonus Action and a Blood Maledict use: Fly 30 ft for Hemocraft modifier rounds), Great Old One (a Critical Hit frightens the target and chosen creatures within 10 ft until the end of your next turn), Hexblade (your next hit on a creature you cursed deals + PB damage), Undead (Reaction to halve Necrotic damage you take), Undying (dropping a real threat to 0 HP heals you a hemocraft die).'),
    f(7, 'Mystic Frenzy', 'When you use your action to cast a cantrip, make one weapon attack as a Bonus Action.'),
    f(7, 'Revealed Arcana', 'Once per Long Rest cast your patron\'s spell with a Pact slot: Archfey Blur, Celestial Lesser Restoration, Fathomless Gust of Wind, Fiend Scorching Ray, Genie Phantasmal Force, Great Old One Detect Thoughts, Hexblade Branding Smite, Undead Blindness/Deafness, Undying Silence.'),
    f(11, 'Brand of the Sapping Scar', 'A creature you branded has Disadvantage on saves against your Warlock spells.'),
    f(15, 'Unsealed Arcana', 'Once per Long Rest cast your patron\'s spell without a slot: Archfey Slow, Celestial Revivify, Fathomless Lightning Bolt, Fiend Fireball, Genie Protection from Energy, Great Old One Haste, Hexblade Blink, Undead Speak with Dead, Undying Bestow Curse.'),
    f(18, 'Blood Curse of the Soul Eater', 'You know this curse (not counted): Reaction when a creature that isn\'t a Construct or Undead drops to 0 HP within 30 ft: Advantage on attacks and Resistance to all damage until the end of your next turn. Amplify (once per Long Rest): also regain a Pact slot.')] }
];

DND.classes.bloodhunter = {
  name: 'Blood Hunter',
  source: BH,
  hitDie: 10,
  primaryAbility: 'Strength or Dexterity, and Intelligence',
  saves: ['DEX', 'INT'],
  skills: { choose: 3, from: ['Acrobatics', 'Arcana', 'Athletics', 'History', 'Insight', 'Investigation', 'Religion', 'Survival'] },
  armorTraining: ['Light Armor', 'Medium Armor', 'Shields'],
  weaponProficiency: { simple: true, martial: 'all' },
  tools: ["Alchemist's Supplies"],
  startingEquipment: [{ items: ['Longsword (or another Martial weapon)', 'Light Crossbow', '20 Bolts', 'Studded Leather Armor', "Explorer's Pack", "Alchemist's Supplies"] },
    { items: ['2 Handaxes (or two other Simple weapons)', 'Light Crossbow', '20 Bolts', 'Scale Mail', "Explorer's Pack", "Alchemist's Supplies"] }],
  spellcasting: null,
  hemocraft: { ability: 'INT', alt: 'WIS' },
  weaponMastery: null,
  attackFeatures: [{ lvl: 2, name: 'Crimson Rite', text: 'A rite on your weapon adds a hemocraft die of its damage type to every hit.' }],
  multiclass: { requires: ['INT'], requiresOneOf: ['STR', 'DEX'], hitDie: true, weapons: ['Simple weapons', 'Martial weapons'], armor: ['Light', 'Medium', 'Shields'],
    tools: ["Alchemist's Supplies"], text: "Hit Point Die, Simple and Martial weapons, Light and Medium armor and Shields, Alchemist's Supplies, and the level 1 features. Needs STR or DEX 13 and INT 13." },
  lists: {
    bloodCurses: { title: 'Blood curses', column: 'bloodCurses', items: [
      opt('Blood Curse of the Anxious', 'Bonus Action, a creature within 30 ft: CHA (Intimidation) checks against it have Advantage until the end of your next turn. Amplify: Disadvantage on its next WIS save.'),
      opt('Blood Curse of Binding', 'Bonus Action, a Large or smaller creature you can see within 30 ft: STR save or Speed 0 and no Reactions until the end of your next turn. Amplify: 1 minute, any size, save again each turn.'),
      opt('Blood Curse of Bloated Agony', 'Bonus Action, a creature within 30 ft: Disadvantage on STR and DEX checks until the end of your next turn, and 1d8 Necrotic if it attacks more than once on its turn. Amplify: 1 minute, CON save each turn.'),
      opt('Blood Curse of Exposure', 'Reaction when a creature within 30 ft takes damage from an attack or spell: it loses Resistance to those damage types until the end of its next turn, that damage included. Amplify: loses Immunity instead (keeping Resistance).'),
      opt('Blood Curse of the Eyeless', 'Reaction when a creature within 30 ft attacks: subtract a hemocraft die from its roll (not if it can\'t be Blinded). Amplify: every attack it makes this turn.'),
      opt('Blood Curse of the Fallen Puppet', 'Reaction when a creature within 30 ft drops to 0 HP: it makes one weapon attack against a target you choose. Amplify: it first moves half its Speed and adds your Hemocraft modifier to the attack.'),
      opt('Blood Curse of the Marked', 'Bonus Action, a creature within 30 ft: your rite damage against it rolls one more hemocraft die until the end of your turn. Amplify: Advantage on your next attack against it this turn.'),
      opt('Blood Curse of the Muddled Mind', 'Bonus Action, a creature within 30 ft that is concentrating: Disadvantage on its next Concentration save before the end of your next turn. Amplify: on all of them until then.')] },
    rites: { title: 'Crimson rites', column: 'crimsonRites', items: [
      opt('Rite of the Flame', 'Fire damage.'), opt('Rite of the Frozen', 'Cold damage.'), opt('Rite of the Storm', 'Lightning damage.'),
      opt('Rite of the Dead', 'Necrotic damage.', { lvl: 14 }), opt('Rite of the Oracle', 'Psychic damage.', { lvl: 14 }), opt('Rite of the Roar', 'Thunder damage.', { lvl: 14 })] } },
  features: [
    f(1, "Hunter's Bane", 'Advantage on WIS (Survival) checks to track Fey, Fiends or Undead and on INT checks to recall lore about them. Hemocraft save DC = 8 + PB + Hemocraft modifier (INT, or WIS with your DM\'s permission).'),
    f(1, 'Blood Maledict', 'You know 1 blood curse (one more at Blood Hunter 6, 10, 14 and 18; swap one each time). Uses: 1 per Short or Long Rest (2 at 6, 3 at 13, 4 at 17). Amplify a curse for its extra effect by taking Necrotic damage equal to a hemocraft die roll (can\'t be reduced). Creatures without blood are immune unless it is amplified.', { choice: { type: 'list', list: 'bloodCurses' } }),
    f(2, 'Fighting Style', 'Pick one: Archery (+2 to ranged attack rolls), Dueling (+2 damage with a one-handed melee weapon and no other weapon), Great Weapon Fighting (low damage dice with two-handed melee weapons improve) or Two-Weapon Fighting (your modifier on the extra attack\'s damage).', {
      choice: { type: 'feat', category: 'fighting-style', only: ['Archery', 'Dueling', 'Great Weapon Fighting', 'Two-Weapon Fighting'] } }),
    f(2, 'Crimson Rite', 'Bonus Action: wake a rite you know on a weapon you hold until you finish a Short or Long Rest, taking Necrotic damage equal to a hemocraft die roll (can\'t be reduced). Its attacks are magical and deal an extra hemocraft die of the rite\'s type; one rite per weapon. You know 1 rite (2 at Blood Hunter 7, 3 at 14): Flame (fire), Frozen (cold) or Storm (lightning); from level 14 also Dead (necrotic), Oracle (psychic) and Roar (thunder).', { choice: { type: 'list', list: 'rites' } }),
    f(3, 'Blood Hunter Order', 'Join an order: Ghostslayer, Lycan, Mutant or Profane Soul. It gives features at Blood Hunter levels 3, 7, 11, 15 and 18.', { choice: { type: 'subclass' } }),
    f(4, 'Ability Score Improvement', ASI + ' Again at Blood Hunter levels 8, 12, 16 and 19.', { choice: { type: 'feat', category: 'general' } }),
    f(5, 'Extra Attack', 'Attack twice when you take the Attack action.'),
    f(6, 'Brand of Castigation', 'When you damage a creature with a Crimson Rite weapon, brand it (until you dismiss it or brand another): you know its direction on the same plane, and whenever it damages you or a creature you can see within 5 ft of you, it takes Psychic damage equal to your Hemocraft modifier (min 1). Dispel Magic can end it (as a spell of half your Blood Hunter level). Once per Short or Long Rest.'),
    f(8, 'Ability Score Improvement', ASI, { choice: { type: 'feat', category: 'general' } }),
    f(9, 'Grim Psychometry', 'Advantage on INT (History) checks about the dark or tragic past of an object you touch or the place you are in; a high roll may bring visions.'),
    f(10, 'Dark Augmentation', 'Speed +5 ft, and add your Hemocraft modifier (min +1) to STR, DEX and CON saving throws.', { grants: { speed: 5 } }),
    f(12, 'Ability Score Improvement', ASI, { choice: { type: 'feat', category: 'general' } }),
    f(13, 'Brand of Tethering', 'Your brand deals twice your Hemocraft modifier (min 2) Psychic damage; a branded creature can\'t Dash, and when it tries to teleport or leave the plane it takes 4d6 Psychic and makes a WIS save or fails.'),
    f(14, 'Hardened Soul', 'Advantage on saves against being Charmed or Frightened.'),
    f(16, 'Ability Score Improvement', ASI, { choice: { type: 'feat', category: 'general' } }),
    f(19, 'Ability Score Improvement', ASI, { choice: { type: 'feat', category: 'general' } }),
    f(20, 'Sanguine Mastery', 'Once per turn reroll a hemocraft die a Blood Hunter feature asks for and use either roll. A Critical Hit with a Crimson Rite weapon restores one Blood Maledict use.')],
  levels: TABLE.map(([hemocraftDie, bloodCurses, bloodMaledict, crimsonRites, features], i) => ({ lvl: i + 1, pb: Math.ceil((i + 1) / 4) + 1, features,
    attacks: i >= 4 ? 2 : 1, hemocraftDie, bloodCurses, bloodMaledict, crimsonRites })),
  subclass: subclasses[0],
  subclasses
};
})();
