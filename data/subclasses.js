/* Every subclass beyond the one in the free rules: the rest of the 2024 Player's Handbook and the later 2024 books
   (Forgotten Realms: Heroes of Faerûn, Ravenloft: The Horrors Within, Arcana Unleashed, D&D Beyond Drops). Sets
   DND.classes.<key>.subclasses = [the free-rules subclass, ...these]; artificer.js and blood-hunter.js bring their own.
   Same shape as classes.js `subclass`, plus:
     source (the book; none = free rules), summary (one line for the picker), short (what the Class/Subclass box may say
     instead of the full name, '|' between spellings; default: the name without "Path of the", "Domain", "Patron" ...),
     spells { classLevel: [always-prepared spells] }, spellsFrom { feature, options { optionName: [classKey, subclass] } }
     (that subclass's spells, by the option picked for the feature: Vestige Spells), savant (a Wizard school: one free
     spellbook spell of it at each new spell slot level), spellcasting (third casters such as the Eldritch Knight:
     { type: 'third', ability, list, cantrips { classLevel: known }, prepared [20], slots [20][9] by class level }),
     lists { id: { title, items [{ name, text }], known { classLevel: number known } } } for choice type 'list'.
   Feature extras: choice types 'list' { list }, 'tools' { count, kind }, 'languages' { count }, 'skills' with from: [names]
   and expertise: true; more: [choices] (more picks on the same feature, e.g. a cantrip and a skill; title names each);
   grants.skills / .tools; an option's grants.alwaysPrepared.
   Source of the facts: dnd2024.wikidot.com (the subclass pages, 2026-10-28). Feature text is our own short summary,
   never the book's text (see CREDITS.md). */
window.DND = window.DND || {};

(() => {
const PHB = "Player's Handbook (2024)", HOF = 'Forgotten Realms: Heroes of Faerûn', RAV = 'Ravenloft: The Horrors Within',
  ARC = 'Arcana Unleashed', DROP = 'D&D Beyond Drops (October 2026)';
// Eldritch Knight, Arcane Trickster and Warrior of the Mystic Arts share one table (class level 3-20)
const THIRD_PREPARED = [0, 0, 3, 4, 4, 4, 5, 6, 6, 7, 8, 8, 9, 10, 10, 11, 11, 11, 12, 13];
const THIRD_SLOTS = [[], [], [2], [3], [3], [3], [4, 2], [4, 2], [4, 2], [4, 3], [4, 3], [4, 3], [4, 3, 2], [4, 3, 2], [4, 3, 2], [4, 3, 3], [4, 3, 3], [4, 3, 3], [4, 3, 3, 1], [4, 3, 3, 1]]
  .map(s => [...s, ...Array(9 - s.length).fill(0)]);
const third = (ability, list) => ({ type: 'third', ability, list, cantrips: { 3: 2, 10: 3 }, prepared: THIRD_PREPARED, slots: THIRD_SLOTS });
const f = (lvl, name, text, more) => ({ lvl, name, text, ...more });
const opt = (name, text, grants) => grants ? { name, text, grants } : { name, text };
const pick = (options, swappable) => swappable ? { type: 'option', swappable: true, options } : { type: 'option', options };

const MORE = {
barbarian: [
  { name: 'Path of the Wild Heart', source: PHB, summary: 'Animal spirits: a beast power each Rage, animal senses and movement, rituals to talk with beasts.', features: [
    f(3, 'Animal Speaker', 'Cast Beast Sense and Speak with Animals, but only as Rituals (WIS is the spellcasting ability).'),
    f(3, 'Rage of the Wilds', 'Each time you enter Rage pick one: Bear (Resistance to every damage type but Force, Necrotic, Psychic and Radiant), Eagle (Disengage and Dash as part of entering Rage; both as one Bonus Action while raging) or Wolf (allies have Advantage on attacks against enemies within 5 ft of you).'),
    f(6, 'Aspect of the Wilds', 'Choose one; change it after a Long Rest.', { choice: pick([
      opt('Owl', 'Darkvision 60 ft (or 60 ft more if you have it).'), opt('Panther', 'Climb Speed equal to your Speed.'), opt('Salmon', 'Swim Speed equal to your Speed.')], true) }),
    f(10, 'Nature Speaker', 'Cast Commune with Nature, but only as a Ritual (WIS).'),
    f(14, 'Power of the Wilds', 'Each time you enter Rage pick one: Falcon (Fly Speed equal to your Speed while you wear no armor), Lion (enemies within 5 ft have Disadvantage on attacks against anyone but you or another Barbarian using Lion) or Ram (a melee hit knocks a Large or smaller creature Prone).')] },
  { name: 'Path of the World Tree', source: PHB, summary: 'Temporary HP for you and your allies while raging, pulls foes to you, long reach and teleports.', features: [
    f(3, 'Vitality of the Tree', 'Vitality Surge: entering Rage gives you Temporary HP equal to your Barbarian level. Life-Giving Force: at the start of each of your turns while raging, another creature within 10 ft gains Temporary HP = as many d6 as your Rage Damage (gone when the Rage ends).'),
    f(6, 'Branches of the Tree', 'Reaction while raging, when a creature you can see starts its turn within 30 ft: STR save (DC 8 + STR mod + PB) or it is teleported next to you (within 5 ft), and you can drop its Speed to 0 for the turn.'),
    f(10, 'Battering Roots', 'On your turn, Heavy or Versatile melee weapons have 10 ft more reach, and a hit with one can also use Push or Topple on top of its own mastery property.'),
    f(14, 'Travel along the Tree', 'When you enter Rage, and as a Bonus Action while raging: teleport up to 60 ft. Once per Rage the teleport can go 150 ft and bring up to six willing creatures within 10 ft of you.')] },
  { name: 'Path of the Zealot', source: PHB, summary: 'Divine Fury damage while raging, a pool of d12s to heal yourself, hard to keep down.', riders: [{ name: 'Divine Fury', dice: '1d6', level: 0.5, type: 'radiant', note: 'Radiant or Necrotic; the first creature you hit each turn while raging' }], features: [
    f(3, 'Divine Fury', 'While raging, the first creature you hit on each of your turns with a weapon or Unarmed Strike takes 1d6 + half your Barbarian level (round down) extra damage, Necrotic or Radiant (your pick each time).'),
    f(3, 'Warrior of the Gods', 'A pool of four d12s (5 at Barbarian 6, 6 at 12, 7 at 17): as a Bonus Action spend and roll any number and regain that many HP. The pool refills on a Long Rest.'),
    f(6, 'Fanatical Focus', 'Once per Rage, reroll a failed save with a bonus equal to your Rage Damage; use the new roll.'),
    f(10, 'Zealous Presence', 'Bonus Action battle cry: up to ten other creatures of your choice within 60 ft have Advantage on attack rolls and saves until the start of your next turn. Once per Long Rest, or spend a Rage use to restore it.'),
    f(14, 'Rage of the Gods', 'When you enter Rage, take a divine form for 1 minute or until you drop to 0 HP (once per Long Rest): Fly Speed equal to your Speed (can hover); Resistance to Necrotic, Psychic and Radiant; Reaction and a Rage use when a creature within 30 ft would drop to 0 HP: it goes to HP equal to your Barbarian level instead.')] }
],
bard: [
  { name: 'College of Dance', source: PHB, summary: 'Unarmored dancer: AC from DEX + CHA, Bardic Inspiration die as unarmed damage, initiative for the team.', features: [
    f(3, 'Dazzling Footwork', 'With no armor and no Shield: Advantage on CHA (Performance) checks to dance; AC = 10 + DEX + CHA modifiers; when you spend Bardic Inspiration as part of an action, Bonus Action or Reaction, you can make an Unarmed Strike as part of it; Unarmed Strikes can use DEX to hit and deal Bludgeoning damage = a roll of your Bardic Inspiration die + DEX modifier (the die is not spent).'),
    f(6, 'Inspiring Movement', 'Reaction when an enemy you can see ends its turn within 5 ft of you: spend a Bardic Inspiration to move up to half your Speed; one ally within 30 ft can use its Reaction to do the same. None of it provokes Opportunity Attacks.'),
    f(6, 'Tandem Footwork', 'When you roll Initiative (not Incapacitated), spend a Bardic Inspiration and roll it: you and allies within 30 ft who can see or hear you add the roll to Initiative.'),
    f(14, 'Leading Evasion', 'A DEX save for half damage: no damage on a success, half on a failure; creatures within 5 ft making the same save share this. Not while Incapacitated.')] },
  { name: 'College of Glamour', source: PHB, summary: 'Fey charm: temporary HP and free movement for allies, free Command, charm and frighten.', spells: { 3: ['Charm Person', 'Mirror Image'], 6: ['Command'] }, features: [
    f(3, 'Beguiling Magic', 'Charm Person and Mirror Image always prepared. Right after you cast an Enchantment or Illusion spell with a slot, a creature you can see within 60 ft makes a WIS save against your spell DC or is Charmed or Frightened (your pick) for 1 minute (save again each turn). Once per Long Rest, or spend a Bardic Inspiration to use it again.'),
    f(3, 'Mantle of Inspiration', 'Bonus Action: spend a Bardic Inspiration and roll it. Up to your CHA modifier (min 1) other creatures within 60 ft gain Temporary HP = 2 x the roll, and each can use its Reaction to move up to its Speed without Opportunity Attacks.'),
    f(6, 'Mantle of Majesty', 'Command always prepared. Bonus Action: cast Command without a slot and take an unearthly look for 1 minute (Concentration); meanwhile cast Command as a Bonus Action without a slot. Creatures Charmed by you fail its save. Once per Long Rest, or spend a level 3+ slot.'),
    f(14, 'Unbreakable Majesty', 'Bonus Action, 1 minute (ends if Incapacitated): the first time each turn a creature hits you with an attack roll, it makes a CHA save against your spell DC or the attack misses. Once per Short or Long Rest.')] },
  { name: 'College of Valor', source: PHB, summary: 'Martial weapons, Medium armor and Shields, Extra Attack; inspiration that adds damage or AC.', features: [
    f(3, 'Combat Inspiration', 'A creature holding your Bardic Inspiration die can use it to defend (Reaction when hit: add the roll to its AC against that attack) or to strike harder (right after it hits: add the roll to the damage).'),
    f(3, 'Martial Training', 'Proficiency with Martial weapons and training with Medium armor and Shields; a Simple or Martial weapon can be your Spellcasting Focus for Bard spells.', { grants: { weapons: ['Martial weapons'], armor: ['Medium', 'Shields'] } }),
    f(6, 'Extra Attack', 'Attack twice when you take the Attack action; one of the attacks can be a cantrip with a casting time of an action instead.'),
    f(14, 'Battle Magic', 'After you cast a spell with a casting time of an action, make one weapon attack as a Bonus Action.')] },
  { name: 'College of the Moon', source: HOF, summary: 'Turn invisible and teleport when you inspire, extra healing, a Druid cantrip and Moonbeam.', spells: { 6: ['Moonbeam'] }, features: [
    f(3, "Moon's Inspiration", 'Inspired Eclipse: when you give Bardic Inspiration with a Bonus Action, you can also turn Invisible and teleport up to 30 ft (until the start of your next turn, or until you attack, deal damage or cast a spell). Lunar Vitality: once per turn when your spell restores HP, spend a Bardic Inspiration die to add its roll; that creature also gets +10 ft Speed until the end of its next turn.'),
    f(3, 'Primal Lore', 'You know Druidic and one Druid cantrip (a Bard spell for you that does not count against your cantrips; swap it each Bard level), and gain one skill: Animal Handling, Insight, Medicine, Nature, Perception or Survival.', {
      choice: { type: 'skills', count: 1, from: ['Animal Handling', 'Insight', 'Medicine', 'Nature', 'Perception', 'Survival'] },
      more: [{ type: 'spell', level: 0, list: 'druid', title: 'Druid cantrip' }], grants: { languages: ['Druidic'] } }),
    f(6, 'Blessing of Moonlight', 'Moonbeam always prepared. Once per Long Rest when you cast it you can glow (Dim Light 5 ft): whenever a creature fails its save against that Moonbeam, another creature you can see within 60 ft regains 2d4 HP.'),
    f(14, "Eventide's Splendor", 'Shadow of the New Moon: with Inspired Eclipse, the inspired creature can also turn Invisible and use its Reaction to teleport 30 ft (Invisible until the start of its next turn). Vibrance of the Full Moon: Lunar Vitality can roll 1d6 instead of spending a Bardic Inspiration die.')] },
  { name: 'College of Spirits', source: RAV, summary: 'Channels spirits of the dead through Bardic Inspiration: heals, damage, teleports and curses.', spells: { 3: ['Guidance'], 6: ['Spirit Guardians'] }, features: [
    f(3, 'Channeler', 'You know Guidance (range 60 ft). You gain a Gaming Set (playing cards) and proficiency with it; it, an Arcane Focus (crystal or orb), a Candle or an Ink Pen can be your Spellcasting Focus.', { grants: { tools: ['Gaming Set (playing cards)'] } }),
    f(3, 'Spirits from Beyond', "When you give Bardic Inspiration with a Bonus Action, roll that die to channel a random spirit (or spend a use as a Bonus Action to choose one up to your die's size). It stays until you unleash it (Magic action, a creature within 30 ft; saves use your spell DC) or finish a rest. 1 Beloved: heals a die + CHA. 2 Sharpshooter: Force damage a die + CHA. 3 Avenger: whoever hits the target in melee takes a die of Force. 4 Renegade: it teleports 30 ft. 5 Fortune Teller: Advantage on D20 Tests. 6 Wayfarer: Temp HP a die + Bard level, Speed +10 ft. 7 Trickster: WIS save, 2 dice Psychic and Charmed. 8 Shade: Invisible, then CON save around it for 2 dice Necrotic. 9 Arsonist: DEX save, 4 dice Fire. 10 Coward: WIS save in 30 ft or Frightened. 11 Brute: STR save in 30 ft, 3 dice Thunder and Prone. 12 Priest: heals 2 dice and ends one condition."),
    f(6, 'Empowered Channeling', 'Power from Beyond: once per turn, a Bard spell cast with a slot that deals damage or heals adds 1d6 to one damage roll or the healing. Spiritual Manifestation: Spirit Guardians always prepared, castable once per Long Rest without a slot; when you cast it you can give you and allies inside Half Cover (once per Short or Long Rest).'),
    f(14, 'Mystical Connection', 'Roll twice on the Spirits from Beyond table and choose; on doubles, choose any spirit.')] }
],
cleric: [
  { name: 'Light Domain', source: PHB, summary: 'Radiant flashes that burn foes and dispel darkness, Disadvantage on attacks against allies, fire spells.',
    spells: { 3: ['Burning Hands', 'Faerie Fire', 'Scorching Ray', 'See Invisibility'], 5: ['Daylight', 'Fireball'], 7: ['Arcane Eye', 'Wall of Fire'], 9: ['Flame Strike', 'Scrying'] }, features: [
    f(3, 'Light Domain Spells', 'Always prepared at Cleric level 3: Burning Hands, Faerie Fire, Scorching Ray, See Invisibility; 5: Daylight, Fireball; 7: Arcane Eye, Wall of Fire; 9: Flame Strike, Scrying.'),
    f(3, 'Radiance of the Dawn', 'Magic action, one Channel Divinity: a 30-ft Emanation dispels magical Darkness, and creatures of your choice in it make a CON save: 2d10 + Cleric level Radiant damage, half on a save.'),
    f(3, 'Warding Flare', 'Reaction when a creature you can see within 30 ft makes an attack roll: it has Disadvantage. Uses = WIS modifier (min 1) per Long Rest.'),
    f(6, 'Improved Warding Flare', 'Warding Flare comes back on a Short or Long Rest, and each use can give the target of the attack 2d6 + WIS modifier Temporary HP.'),
    f(17, 'Corona of Light', 'Magic action: sunlight aura for 1 minute (Bright Light 60 ft, Dim 30 ft more); enemies in the Bright Light have Disadvantage on saves against Radiance of the Dawn and your Fire or Radiant spells. Uses = WIS modifier (min 1) per Long Rest.')] },
  { name: 'Trickery Domain', source: PHB, summary: 'Stealth blessings, an illusory double to cast from and swap places with, deception spells.',
    spells: { 3: ['Charm Person', 'Disguise Self', 'Invisibility', 'Pass without Trace'], 5: ['Hypnotic Pattern', 'Nondetection'], 7: ['Confusion', 'Dimension Door'], 9: ['Dominate Person', 'Modify Memory'] }, features: [
    f(3, 'Blessing of the Trickster', 'Magic action: you or a willing creature within 30 ft has Advantage on DEX (Stealth) checks until you finish a Long Rest or use this again.'),
    f(3, 'Trickery Domain Spells', 'Always prepared at Cleric level 3: Charm Person, Disguise Self, Invisibility, Pass without Trace; 5: Hypnotic Pattern, Nondetection; 7: Confusion, Dimension Door; 9: Dominate Person, Modify Memory.'),
    f(3, 'Invoke Duplicity', 'Bonus Action, one Channel Divinity: an intangible illusion of you within 30 ft for 1 minute (ends if you are Incapacitated). You can cast spells from its space; Advantage on attacks against a creature within 5 ft of both of you; Bonus Action: move it 30 ft (it stays within 120 ft).'),
    f(6, "Trickster's Transposition", 'When you create or move the illusion with a Bonus Action, you can swap places with it (teleport).'),
    f(17, 'Improved Duplicity', 'You and your allies have Advantage on attacks against creatures within 5 ft of the illusion; when it ends, you or a creature within 5 ft of it regains HP equal to your Cleric level.')] },
  { name: 'War Domain', source: PHB, summary: 'Bonus Action attacks, +10 to a missed attack, battle spells without Concentration.',
    spells: { 3: ['Guiding Bolt', 'Magic Weapon', 'Shield of Faith', 'Spiritual Weapon'], 5: ["Crusader's Mantle", 'Spirit Guardians'], 7: ['Fire Shield', 'Freedom of Movement'], 9: ['Hold Monster', 'Steel Wind Strike'] }, features: [
    f(3, 'Guided Strike', 'When you or a creature within 30 ft misses with an attack roll, spend a Channel Divinity to give it +10 (a Reaction when it is someone else\'s roll).'),
    f(3, 'War Domain Spells', "Always prepared at Cleric level 3: Guiding Bolt, Magic Weapon, Shield of Faith, Spiritual Weapon; 5: Crusader's Mantle, Spirit Guardians; 7: Fire Shield, Freedom of Movement; 9: Hold Monster, Steel Wind Strike."),
    f(3, 'War Priest', 'Bonus Action: one attack with a weapon or an Unarmed Strike. Uses = WIS modifier (min 1), back on a Short or Long Rest.'),
    f(6, "War God's Blessing", 'Spend a Channel Divinity to cast Shield of Faith or Spiritual Weapon without a slot; cast this way it needs no Concentration and lasts 1 minute (ends if you cast it again, are Incapacitated or die).'),
    f(17, 'Avatar of Battle', 'Resistance to Bludgeoning, Piercing and Slashing damage.')] },
  { name: 'Knowledge Domain', source: HOF, summary: 'Expertise in lore skills, free Divination spells, telepathy, Advantage on everything for an hour.',
    spells: { 3: ['Command', 'Comprehend Languages', 'Detect Magic', 'Detect Thoughts', 'Identify', 'Mind Spike'], 5: ['Dispel Magic', 'Nondetection', 'Tongues'], 7: ['Arcane Eye', 'Banishment', 'Confusion'], 9: ['Legend Lore', 'Scrying', 'Synaptic Static'] }, features: [
    f(3, 'Blessings of Knowledge', "Proficiency with one Artisan's Tools, and proficiency and Expertise in two of Arcana, History, Nature and Religion.", {
      choice: { type: 'skills', count: 2, from: ['Arcana', 'History', 'Nature', 'Religion'], expertise: true }, more: [{ type: 'tools', count: 1, kind: "Artisan's Tools" }] }),
    f(3, 'Knowledge Domain Spells', 'Always prepared at Cleric level 3: Command, Comprehend Languages, Detect Magic, Detect Thoughts, Identify, Mind Spike; 5: Dispel Magic, Nondetection, Tongues; 7: Arcane Eye, Banishment, Confusion; 9: Legend Lore, Scrying, Synaptic Static.'),
    f(3, 'Mind Magic', 'Magic action, one Channel Divinity: cast one of your prepared Divination spells from the Knowledge Domain list without a slot or Material components.'),
    f(6, 'Unfettered Mind', 'Telepathy 60 ft with up to your WIS modifier (min 1) creatures at once. Proficiency in INT saving throws (if you have it, another save you lack).', { grants: { saves: ['INT'] } }),
    f(17, 'Divine Foreknowledge', 'Bonus Action: Advantage on D20 Tests for 1 hour. Once per Long Rest, or spend a level 6+ slot.')] },
  { name: 'Grave Domain', source: RAV, summary: 'Extra Necrotic damage on the wounded, maximum healing at 0 HP, curses and halved hits.', riders: [{ name: 'Pull of Death', dice: { 3: '1d4', 11: '1d6' }, type: 'necrotic', note: 'once per turn, the target is missing HP' }],
    spells: { 3: ['Detect Evil and Good', 'False Life', 'Gentle Repose', 'Ray of Enfeeblement', 'Spare the Dying'], 5: ['Revivify', 'Vampiric Touch'], 7: ['Blight', 'Death Ward'], 9: ['Dispel Evil and Good', 'Raise Dead'] }, features: [
    f(3, 'Grave Domain Spells', 'Always prepared at Cleric level 3: Detect Evil and Good, False Life, Gentle Repose, Ray of Enfeeblement, Spare the Dying; 5: Revivify, Vampiric Touch; 7: Blight, Death Ward; 9: Dispel Evil and Good, Raise Dead.'),
    f(3, 'Circle of Mortality', 'Pull of Death: once per turn when your spell or attack roll damages a creature missing any HP, it takes 1d4 more Necrotic (1d6 at Cleric 11). Return to Life: Spare the Dying as a Bonus Action, and healing dice from your spells or Channel Divinity on a creature at 0 HP count as their maximum.'),
    f(3, 'Path to the Grave', 'Bonus Action, one Channel Divinity: curse a creature you can see within 30 ft until the start of your next turn (Disadvantage on attack rolls and saves). When you or an ally hits it with an attack roll you can end the curse to add Necrotic or Radiant damage equal to your Cleric level.'),
    f(6, "Sentinel at Death's Door", 'Reaction when you or a Bloodied creature you can see within 60 ft is hit: halve the damage (round down) and cancel Critical Hit effects. Uses = WIS modifier (min 1) per Long Rest.'),
    f(17, 'Divine Reaper', 'Enhanced Necromancy: spend a Channel Divinity to give a single-target Necromancy spell (level 5 or lower) or a Grave Domain spell a second target. Keeper of Souls: when an enemy dies within 60 ft, you or a creature you can see within 60 ft regains 2 x Cleric level HP; once per Short or Long Rest, or spend a level 6+ slot.')] },
  { name: 'Arcana Domain', source: ARC, summary: 'Wizard cantrips and high-level Wizard spells, Temporary HP or harder saves on your spells.',
    spells: { 3: ['Detect Magic', 'Magic Missile', 'Magic Weapon', "Nystul's Magic Aura"], 5: ['Counterspell', 'Dispel Magic'], 7: ['Arcane Eye', "Leomund's Secret Chest"], 9: ["Bigby's Hand", 'Teleportation Circle'] }, features: [
    f(3, 'Arcana Domain Spells', "Always prepared at Cleric level 3: Detect Magic, Magic Missile, Magic Weapon, Nystul's Magic Aura; 5: Counterspell, Dispel Magic; 7: Arcane Eye, Leomund's Secret Chest; 9: Bigby's Hand, Teleportation Circle."),
    f(3, 'Modify Magic', 'When you cast a spell, spend a Channel Divinity (no action) for one: Fortifying Spell (one target gains 2d8 + Cleric level Temporary HP) or Tenacious Spell (a creature you can see that succeeds on the spell\'s save subtracts 1d6 from that save).'),
    f(3, 'Student of Arcana', 'Proficiency in Arcana or one Cleric skill, and two Wizard cantrips (swap one each Cleric level).', {
      choice: { type: 'skills', count: 1, from: ['Arcana', 'History', 'Insight', 'Medicine', 'Persuasion', 'Religion'] },
      more: [{ type: 'spells', count: 2, levels: [0], lists: ['wizard'], title: 'Wizard cantrips' }] }),
    f(6, 'Dispelling Recovery', 'Right after you cast a spell with a slot that heals a creature or ends a condition, cast Dispel Magic as part of it without a slot. Once per Short or Long Rest, or spend a Channel Divinity.'),
    f(17, 'Magical Mastery', 'Learn one Wizard spell each of levels 6, 7, 8 and 9; always prepared (swap one for another of its level each Cleric level).', {
      choice: { type: 'spell', level: 6, list: 'wizard' }, more: [7, 8, 9].map(level => ({ type: 'spell', level, list: 'wizard' })) })] }
],
druid: [
  { name: 'Circle of the Moon', source: PHB, summary: 'Stronger Wild Shapes with AC and Temporary HP, Radiant beast attacks, moonlit teleports.',
    spells: { 3: ['Cure Wounds', 'Moonbeam', 'Starry Wisp'], 5: ['Conjure Animals'], 7: ['Fount of Moonlight'], 9: ['Mass Cure Wounds'] }, features: [
    f(3, 'Circle Forms', 'Wild Shape forms up to CR = Druid level / 3 (round down); in a form your AC is 13 + WIS modifier if that is higher than the Beast\'s, and you gain Temporary HP = 3 x Druid level.'),
    f(3, 'Circle of the Moon Spells', 'Always prepared at Druid level 3: Cure Wounds, Moonbeam, Starry Wisp; 5: Conjure Animals; 7: Fount of Moonlight; 9: Mass Cure Wounds. You can cast them in Wild Shape.'),
    f(6, 'Improved Circle Forms', 'In Wild Shape, each attack can deal Radiant damage instead of its type, and you add your WIS modifier to CON saves.'),
    f(10, 'Moonlight Step', 'Bonus Action: teleport up to 30 ft and have Advantage on your next attack roll this turn. Uses = WIS modifier (min 1) per Long Rest; spend a level 2+ slot for each extra use.'),
    f(14, 'Lunar Form', 'Once per turn, a Wild Shape attack that hits deals 2d10 extra Radiant damage. Moonlight Step can bring a willing creature within 10 ft along.')] },
  { name: 'Circle of the Sea', source: PHB, summary: 'A whirl of ocean spray that blasts foes with Cold and pushes them, swimming, then flying.',
    spells: { 3: ['Fog Cloud', 'Gust of Wind', 'Ray of Frost', 'Thunderwave'], 5: ['Lightning Bolt', 'Water Breathing'], 7: ['Control Water', 'Ice Storm'], 9: ['Conjure Elemental', 'Hold Monster'] }, features: [
    f(3, 'Circle of the Sea Spells', 'Always prepared at Druid level 3: Fog Cloud, Gust of Wind, Ray of Frost, Thunderwave; 5: Lightning Bolt, Water Breathing; 7: Control Water, Ice Storm; 9: Conjure Elemental, Hold Monster.'),
    f(3, 'Wrath of the Sea', 'Bonus Action, one Wild Shape use: a 5-ft Emanation of ocean spray for 10 minutes. When you make it and as a Bonus Action later, a creature you can see in it makes a CON save against your spell DC or takes WIS modifier d6 (min 1) Cold damage and, if Large or smaller, is pushed 15 ft.'),
    f(6, 'Aquatic Affinity', 'The Wrath of the Sea Emanation is 10 ft; Swim Speed equal to your Speed.'),
    f(10, 'Stormborn', 'While Wrath of the Sea is active: Fly Speed equal to your Speed and Resistance to Cold, Lightning and Thunder damage.'),
    f(14, 'Oceanic Gift', 'Put the Wrath of the Sea Emanation on a willing creature within 60 ft instead (it uses your DC and WIS), or on both of you for two Wild Shape uses.')] },
  { name: 'Circle of the Stars', source: PHB, summary: 'A Star Map with free Guiding Bolts, a starry form (archer, chalice or dragon), omens that add or subtract 1d6.',
    spells: { 3: ['Guidance', 'Guiding Bolt'] }, features: [
    f(3, 'Star Map', 'A Tiny star chart that is your Spellcasting Focus. While you hold it, Guidance and Guiding Bolt are prepared, and you can cast Guiding Bolt without a slot WIS modifier (min 1) times per Long Rest. A lost map is replaced by a 1-hour ceremony.'),
    f(3, 'Starry Form', 'Bonus Action, one Wild Shape use: a glowing form for 10 minutes (Bright Light 10 ft, Dim 10 ft more) with a constellation: Archer (when you take the form and as a Bonus Action later, a ranged spell attack within 60 ft for 1d8 + WIS Radiant), Chalice (when a slot spell of yours heals, you or a creature within 30 ft also regains 1d8 + WIS) or Dragon (INT and WIS checks and Concentration saves treat a 9 or lower as a 10).'),
    f(6, 'Cosmic Omen', 'After each Long Rest roll a die: even gives Weal (Reaction: add 1d6 to the D20 Test of a creature you can see within 30 ft), odd gives Woe (subtract 1d6). Uses = WIS modifier (min 1) per Long Rest.'),
    f(10, 'Twinkling Constellations', 'Archer and Chalice deal or heal 2d8; Dragon gives a Fly Speed of 20 ft (hover); you can change constellation at the start of each turn.'),
    f(14, 'Full of Stars', 'In Starry Form you have Resistance to Bludgeoning, Piercing and Slashing damage.')] }
],
fighter: [
  { name: 'Battle Master', source: PHB, summary: 'Maneuvers fuelled by Superiority Dice: trip, disarm, push, parry, riposte and more.', riders: [{ name: 'Superiority Die', dice: { 3: '1d8', 10: '1d10', 18: '1d12' }, note: 'a maneuver that adds the die to the damage' }], lists: {
    maneuvers: { title: 'Maneuvers', known: { 3: 3, 7: 5, 10: 7, 15: 9 }, items: [
      opt('Ambush', 'Add a Superiority Die to a DEX (Stealth) check or Initiative roll (not while Incapacitated).'),
      opt('Bait and Switch', 'On your turn, spend 5 ft of movement to swap places with a willing creature within 5 ft (no Opportunity Attacks); you or it adds the die to AC until your next turn.'),
      opt("Commander's Strike", 'Replace one of your attacks: a willing creature that can see or hear you uses its Reaction to attack, adding the die to the damage.'),
      opt('Commanding Presence', 'Add the die to a CHA (Intimidation, Performance or Persuasion) check.'),
      opt('Disarming Attack', 'On a hit: add the die to the damage; STR save or it drops one held object of your choice.'),
      opt('Distracting Strike', 'On a hit: add the die to the damage; the next attack against the target by someone else before your next turn has Advantage.'),
      opt('Evasive Footwork', 'Bonus Action: Disengage, and add the die to your AC until the start of your next turn.'),
      opt('Feinting Attack', 'Bonus Action: Advantage on your next attack this turn against a creature within 5 ft; on a hit add the die to the damage.'),
      opt('Goading Attack', 'On a hit: add the die to the damage; WIS save or it has Disadvantage on attacks against others than you until the end of your next turn.'),
      opt('Lunging Attack', 'Bonus Action: Dash; if you move 5+ ft straight before a melee hit this turn, add the die to its damage.'),
      opt('Maneuvering Attack', 'On a hit: add the die to the damage; an ally who can see or hear you uses its Reaction to move half its Speed without Opportunity Attacks from the target.'),
      opt('Menacing Attack', 'On a hit: add the die to the damage; WIS save or Frightened until the end of your next turn.'),
      opt('Parry', 'Reaction when a melee attack damages you: reduce the damage by the die + STR or DEX modifier.'),
      opt('Precision Attack', 'When you miss with an attack roll, add the die to it.'),
      opt('Pushing Attack', 'On a hit with a weapon or Unarmed Strike: add the die to the damage; a Large or smaller target makes a STR save or is pushed 15 ft.'),
      opt('Rally', 'Bonus Action: an ally within 30 ft who can see or hear you gains Temporary HP = the die + half your Fighter level.'),
      opt('Riposte', 'Reaction when a creature misses you in melee: make a melee attack against it, adding the die to the damage on a hit.'),
      opt('Sweeping Attack', 'On a melee hit: another creature within 5 ft of the target and in your reach takes the die in damage if the attack roll would hit it.'),
      opt('Tactical Assessment', 'Add the die to an INT (History or Investigation) or WIS (Insight) check.'),
      opt('Trip Attack', 'On a hit with a weapon or Unarmed Strike: add the die to the damage; a Large or smaller target makes a STR save or falls Prone.')] } }, features: [
    f(3, 'Combat Superiority', 'Learn 3 maneuvers (2 more at Fighter 7, 10 and 15; swap one when you learn more), one per attack. Four Superiority Dice, d8s (5 at Fighter 7, 6 at 15), all back on a Short or Long Rest. Maneuver save DC = 8 + STR or DEX modifier + PB.', { choice: { type: 'list', list: 'maneuvers' } }),
    f(3, 'Student of War', "Proficiency with one Artisan's Tools and one skill from the Fighter list.", {
      choice: { type: 'skills', count: 1, from: 'class' }, more: [{ type: 'tools', count: 1, kind: "Artisan's Tools" }] }),
    f(7, 'Know Your Enemy', 'Bonus Action: learn whether a creature you can see within 30 ft has Immunities, Resistances or Vulnerabilities, and which. Once per Long Rest, or spend a Superiority Die.'),
    f(10, 'Improved Combat Superiority', 'Superiority Dice are d10s.'),
    f(15, 'Relentless', 'Once per turn, use a maneuver with a 1d8 roll instead of spending a Superiority Die.'),
    f(18, 'Ultimate Combat Superiority', 'Superiority Dice are d12s.')] },
  { name: 'Eldritch Knight', source: PHB, summary: 'Wizard spells (a third caster, INT), a bonded weapon you can summon, cantrips and spells in place of attacks.',
    spellcasting: third('INT', 'Wizard'), features: [
    f(3, 'Spellcasting', 'Wizard spells with INT, an Arcane Focus as focus: 2 cantrips (3 at Fighter 10) and prepared level 1+ spells per the Eldritch Knight table (3 at Fighter 3 up to 13), slots up to level 4 (back on a Long Rest). Swap one cantrip and one spell each Fighter level.'),
    f(3, 'War Bond', 'A 1-hour ritual (can be a Short Rest) bonds a weapon to you (two at most): you can\'t be disarmed of it unless Incapacitated, and you can summon one to your hand as a Bonus Action from the same plane.'),
    f(7, 'War Magic', 'When you take the Attack action, one attack can be a Wizard cantrip with a casting time of an action instead.'),
    f(10, 'Eldritch Strike', 'A creature you hit with a weapon has Disadvantage on its next save against your spells before the end of your next turn.'),
    f(15, 'Arcane Charge', 'When you use Action Surge you can also teleport up to 30 ft, before or after the extra action.'),
    f(18, 'Improved War Magic', 'When you take the Attack action, two attacks can be a level 1 or 2 Wizard spell with a casting time of an action instead.')] },
  { name: 'Psi Warrior', source: PHB, summary: 'Psionic Energy Dice for Force damage on hits, shields against damage, telekinetic moves and flight.', riders: [{ name: 'Psionic Strike', dice: { 3: '1d6', 5: '1d8', 11: '1d10', 17: '1d12' }, mod: 'INT', type: 'force', note: 'once per turn, spends a Psionic Energy Die' }], spells: { 18: ['Telekinesis'] }, features: [
    f(3, 'Psionic Power', 'Psionic Energy Dice: 4d6 (6d8 at Fighter 5, 8d8 at 9, 8d10 at 11, 10d10 at 13, 12d12 at 17); one back on a Short Rest, all on a Long Rest. Protective Field: Reaction when you or a creature within 30 ft takes damage, spend a die to reduce it by the roll + INT modifier (min 1). Psionic Strike: once per turn after a weapon hit on a target within 30 ft, spend a die for roll + INT modifier Force damage. Telekinetic Movement: Magic action, move a Large or smaller loose object or a willing creature within 30 ft up to 30 ft; once per Short or Long Rest or spend a die.'),
    f(7, 'Telekinetic Adept', 'Psi-Powered Leap: Bonus Action, Fly Speed = twice your Speed this turn; once per Short or Long Rest or spend a die. Telekinetic Thrust: a Psionic Strike target makes a STR save (DC 8 + INT modifier + PB) or is knocked Prone or moved 10 ft.'),
    f(10, 'Guarded Mind', 'Resistance to Psychic damage; when you start your turn Charmed or Frightened, spend a die to end those effects.'),
    f(15, 'Bulwark of Force', 'Bonus Action: up to your INT modifier (min 1) creatures within 30 ft, you included, have Half Cover for 1 minute. Once per Long Rest or spend a die.'),
    f(18, 'Telekinetic Master', 'Telekinesis always prepared; cast it without a slot or components (INT), and while you concentrate on it make one weapon attack as a Bonus Action each turn. Once per Long Rest or spend a die.')] },
  { name: 'Banneret', source: HOF, summary: 'A knightly leader: heals allies with your Second Wind, gives them attacks with Action Surge, rerolls their saves.', features: [
    f(3, 'Knightly Envoy', 'Comprehend Languages as a Ritual only (CHA). One language (swap it after a Long Rest for one you met in the last 24 hours). One skill: Insight, Intimidation, Persuasion or Performance.', {
      choice: { type: 'skills', count: 1, from: ['Insight', 'Intimidation', 'Persuasion', 'Performance'] }, more: [{ type: 'languages', count: 1 }] }),
    f(3, 'Group Recovery', 'When Second Wind heals you, up to your CHA modifier (min 1) allies in a 30-ft Emanation regain 1d4 + Fighter level HP. Once per Short or Long Rest.'),
    f(7, 'Team Tactics', 'Allies healed by Group Recovery have Advantage on D20 Tests until the start of your next turn.'),
    f(10, 'Rallying Surge', 'When you use Action Surge, up to your CHA modifier (min 1) allies in a 30-ft Emanation can use their Reaction to attack once (weapon or Unarmed Strike) or move half their Speed without Opportunity Attacks.'),
    f(15, 'Shared Resilience', 'Reaction when an ally you can see within 60 ft fails a save: spend an Indomitable use; it rerolls with a bonus equal to your Fighter level.'),
    f(18, 'Inspiring Commander', 'Group Recovery and Rallying Surge reach a 60-ft Emanation; Immunity to Charmed and Frightened.')] },
  { name: 'Arcane Archer', source: ARC, summary: 'Magic arrows: Arcane Shots that banish, charm, explode or seek, plus curving shots.', lists: {
    arcaneShots: { title: 'Arcane Shot options', known: { 3: 2, 7: 3, 10: 4, 15: 5, 18: 6 }, items: [
      opt('Banishing Shot', 'The target takes one Arcane Shot Die of Psychic damage; CHA save or banished (Incapacitated, Speed 0) until the end of its next turn.'),
      opt('Beguiling Shot', 'Two dice of Psychic damage; WIS save or Charmed by you or an ally within 30 ft of it until the start of your next turn.'),
      opt('Bursting Shot', 'The target and each creature in a 10-ft Emanation around it take two dice of Force damage.'),
      opt('Enfeebling Shot', 'Two dice of Necrotic damage; CON save or Poisoned until the end of its next turn, and its hits deal one die less damage.'),
      opt('Grasping Shot', 'One die of Slashing damage; STR save or Restrained for 1 minute (an action and a STR (Athletics) check against your DC frees it).'),
      opt('Piercing Shot', 'No attack roll: a 30-ft Line that ignores cover; DEX save, normal damage + two dice of Piercing, half on a save.'),
      opt('Seeking Shot', 'No attack roll: a creature you saw in the last minute, around corners, ignoring Half and Three-Quarters Cover; DEX save, normal damage + two dice of Force (half on a save) and you learn where it is.'),
      opt('Shadow Shot', 'One die of Psychic damage; WIS save or Blinded until the end of its next turn.')] } }, features: [
    f(3, 'Arcane Archer Lore', 'Proficiency in Arcana and Nature (another Fighter skill for each you have already) and the Druidcraft or Prestidigitation cantrip (INT).', {
      grants: { skills: ['Arcana', 'Nature'] }, choice: pick([
        opt('Druidcraft', 'Druidcraft cantrip (INT).', { alwaysPrepared: ['Druidcraft'] }), opt('Prestidigitation', 'Prestidigitation cantrip (INT).', { alwaysPrepared: ['Prestidigitation'] })]) }),
    f(3, 'Arcane Shot', 'Learn 2 Arcane Shot options (one more at Fighter 7, 10, 15 and 18; swap one each time). Once per turn when you hit with an Ammunition weapon, apply one. Uses = INT modifier (min 1), back on a Short or Long Rest. Arcane Shot Die d6 (d8 at Fighter 10, d10 at 15, d12 at 18); save DC 8 + INT modifier + PB.', { choice: { type: 'list', list: 'arcaneShots' } }),
    f(7, 'Curving Shot', 'When you miss with an Ammunition weapon, Bonus Action: reroll the attack against another creature within range and within 60 ft of the first target.'),
    f(7, 'Magical Ammunition', 'Magic action: fire a nonmagical piece of ammunition at a surface to make Darkening (15-ft magical shadows for 1 minute, -5 to Perception), Unlocking (opens one lock or bar in 15 ft, loudly) or Vine (a 120-ft climbable vine for 10 minutes) ammunition. Once per Short or Long Rest, or spend a Second Wind use.'),
    f(10, 'Ever-Ready Shot', 'When you roll Initiative, regain one use of Arcane Shot.'),
    f(15, 'Indomitable Teleport', 'When Indomitable makes you succeed on the save, teleport up to 60 ft.'),
    f(18, 'Masterful Shots', 'Reaction when a creature you can see misses you: move half your Speed away without Opportunity Attacks, then make a ranged attack against it if it is in range.')] },
  { name: 'Sorrow Knight', source: DROP, summary: 'Despair from the Shadowfell: Psychic damage dice with fear, deafness and weariness, teleporting dread.', riders: [{ name: 'Despairing Strike', dice: { 3: '1d8', 10: '1d10', 15: '1d12' }, type: 'psychic', note: 'spends a Despairing Strike Die' }], features: [
    f(3, 'Despairing Strikes', 'Despairing Strike Dice: 3d8 (4d10 at Fighter 10, 5d12 at 15), back on a Short or Long Rest. When you hit with a weapon, spend one (one per attack): extra Psychic damage = the roll, plus Abandoned (INT save or Deafened and sees every creature as an enemy until the end of your next turn) or Dread (Disadvantage on its next save before your next turn). Save DC 8 + WIS modifier + PB.'),
    f(3, 'Solemn Gaze', 'Darkvision 60 ft (or 60 ft more). Empathetic Inquiry: Magic action, a creature you can see within 30 ft makes a WIS save or you learn an emotion that looms in its mind; uses = WIS modifier (min 1) per Long Rest.'),
    f(7, 'Dreaded Appearance', 'Tactical Shift can teleport you 30 ft instead of moving; then creatures of your choice in a 10-ft Emanation make a WIS save: a Despairing Strike die of Psychic damage and Frightened until the end of your next turn (half damage on a save). Once per Short or Long Rest.'),
    f(10, 'Unsettled Strikes', 'New Despairing Strike effects: Apathetic (WIS save or Incapacitated until your next turn), Lost (CHA save or Blinded with Speed 0 until the end of its next turn; on a save its Speed is halved) and Weary (CON save or 1 Exhaustion level, up to 2, gone at the end of your next turn).'),
    f(15, 'Grim Constitution', 'Resistance to Necrotic and Psychic damage. When something would reduce your HP maximum, a DC 15 CON save stops it (DC +5 for each later save, back to 15 after a Short or Long Rest).'),
    f(18, 'Grieving Mantle', 'When you use Action Surge, for 1 minute: Reaction when hit by an attack roll to reduce its damage to 0 (Shade Form), and Immunity to Charmed and Frightened (ending them).')] }
],
monk: [
  { name: 'Warrior of Mercy', source: PHB, summary: 'Focus Points that harm with Necrotic damage or heal with a touch, even bringing back the dead.', riders: [{ name: 'Hand of Harm', dice: 'martialArts', mod: 'WIS', type: 'necrotic', unarmed: true, note: 'once per turn, 1 Focus Point' }], features: [
    f(3, 'Hand of Harm', 'Once per turn when an Unarmed Strike hits and deals damage, spend 1 Focus Point: extra Necrotic damage = a Martial Arts die + WIS modifier.'),
    f(3, 'Hand of Healing', 'Magic action, 1 Focus Point: touch a creature, it regains a Martial Arts die + WIS modifier HP. In a Flurry of Blows, one strike can be this instead, without the Focus Point.'),
    f(3, 'Implements of Mercy', 'Proficiency in Insight and Medicine and with the Herbalism Kit.', { grants: { skills: ['Insight', 'Medicine'], tools: ['Herbalism Kit'] } }),
    f(6, "Physician's Touch", 'Hand of Harm can also make the target Poisoned until the end of your next turn; Hand of Healing can also end Blinded, Deafened, Paralyzed, Poisoned or Stunned.'),
    f(11, 'Flurry of Healing and Harm', 'In a Flurry of Blows, every strike can be a free Hand of Healing, and a damaging strike can use Hand of Harm without a Focus Point (still once per turn). Uses = WIS modifier (min 1) per Long Rest.'),
    f(17, 'Hand of Ultimate Mercy', 'Magic action, 5 Focus Points: touch a creature that died in the last 24 hours; it returns with 4d10 + WIS modifier HP, free of Blinded, Deafened, Paralyzed, Poisoned and Stunned. Once per Long Rest.')] },
  { name: 'Warrior of Shadow', source: PHB, summary: 'Darkness you can see through, Darkvision, teleports from shadow to shadow, invisibility.', spells: { 3: ['Minor Illusion'] }, features: [
    f(3, 'Shadow Arts', 'Spend 1 Focus Point to cast Darkness without components; you see in it and can move it 60 ft at the start of each turn. Darkvision 60 ft (or 60 ft more). You know Minor Illusion (WIS).'),
    f(6, 'Shadow Step', 'While in Dim Light or Darkness, Bonus Action: teleport up to 60 ft to another spot in Dim Light or Darkness, then Advantage on your next melee attack this turn.'),
    f(11, 'Improved Shadow Step', 'Spend 1 Focus Point to Shadow Step without the light limits, and make an Unarmed Strike right after the teleport as part of it.'),
    f(17, 'Cloak of Shadows', 'Magic action in Dim Light or Darkness, 3 Focus Points, 1 minute (ends if Incapacitated or you end a turn in Bright Light): Invisible, move through occupied spaces as Difficult Terrain, and Flurry of Blows costs no Focus Points.')] },
  { name: 'Warrior of the Elements', source: PHB, summary: 'Elemental strikes with 10 ft more reach, bursts of elemental damage, flight and resistances.', spells: { 3: ['Elementalism'] }, features: [
    f(3, 'Elemental Attunement', 'At the start of your turn, 1 Focus Point: for 10 minutes Unarmed Strikes reach 10 ft farther and can deal Acid, Cold, Fire, Lightning or Thunder; when they do, the target makes a STR save or you move it 10 ft toward or away from you.'),
    f(3, 'Manipulate Elements', 'You know the Elementalism cantrip (WIS).'),
    f(6, 'Elemental Burst', 'Magic action, 2 Focus Points: a 20-ft-radius Sphere within 120 ft; DEX save, three Martial Arts dice of Acid, Cold, Fire, Lightning or Thunder (half on a save).'),
    f(11, 'Stride of the Elements', 'While Elemental Attunement is active: Fly Speed and Swim Speed equal to your Speed.'),
    f(17, 'Elemental Epitome', 'While attuned: Resistance to one of Acid, Cold, Fire, Lightning or Thunder (change it each turn); Step of the Wind gives +20 ft Speed and a Martial Arts die of damage to creatures you pass within 5 ft of (once each per turn); once per turn an Unarmed Strike hit deals one more Martial Arts die.')] },
  { name: 'Warrior of the Mystic Arts', source: ARC, summary: 'Sorcerer spells (a third caster, WIS); cantrips and spells in place of strikes, slots and Focus Points traded.',
    spellcasting: third('WIS', 'Sorcerer'), features: [
    f(3, 'Spellcasting', 'Sorcerer spells with WIS, an Arcane Focus as focus: 2 cantrips (3 at Monk 10) and prepared level 1+ spells per the Mystic Arts table (3 at Monk 3 up to 13), slots up to level 4 (back on a Long Rest). Swap one cantrip and one spell each Monk level.'),
    f(6, 'Mystic Fighting Style', 'When you take the Attack action, one Unarmed Strike can be a Sorcerer cantrip with a casting time of an action instead.'),
    f(6, 'Mystic Focus', 'Spend a spell slot to regain Focus Points equal to its level. On a Short Rest or with Uncanny Metabolism, turn Focus Points into one slot: level 1 for 2 points (Monk 6), 2 for 3 (Monk 7), 3 for 5 (Monk 13), 4 for 6 (Monk 19).'),
    f(11, 'Focused Strike', 'A Stunning Strike target, whether it saves or not, has Disadvantage on saves against your spells until the start of your next turn.'),
    f(17, 'Improved Mystic Fighting Style', 'In a Flurry of Blows, two strikes can be one level 1 or 2 Sorcerer spell with a casting time of an action, cast as part of that Bonus Action.')] }
],
paladin: [
  { name: 'Oath of Glory', source: PHB, summary: 'A hero of legend: Temporary HP from smites, athletic feats, a faster aura, AC boosts that strike back.',
    spells: { 3: ['Guiding Bolt', 'Heroism'], 5: ['Enhance Ability', 'Magic Weapon'], 9: ['Haste', 'Protection from Energy'], 13: ['Compulsion', 'Freedom of Movement'], 17: ['Legend Lore', "Yolande's Regal Presence"] }, features: [
    f(3, 'Inspiring Smite', 'Right after you cast Divine Smite, one Channel Divinity: share 2d8 + Paladin level Temporary HP among creatures of your choice within 30 ft (you too).'),
    f(3, 'Oath of Glory Spells', "Always prepared at Paladin level 3: Guiding Bolt, Heroism; 5: Enhance Ability, Magic Weapon; 9: Haste, Protection from Energy; 13: Compulsion, Freedom of Movement; 17: Legend Lore, Yolande's Regal Presence."),
    f(3, 'Peerless Athlete', 'Bonus Action, one Channel Divinity: for 1 hour Advantage on STR (Athletics) and DEX (Acrobatics) checks, and your jumps go 10 ft farther.'),
    f(7, 'Aura of Alacrity', 'Speed +10 ft. An ally who enters or starts its turn in your Aura of Protection has +10 ft Speed until the end of its next turn.', { grants: { speed: 10 } }),
    f(15, 'Glorious Defense', 'Reaction when you or a creature you can see within 10 ft is hit by an attack roll: + CHA modifier (min 1) to its AC against it; if that makes it miss, attack the attacker as part of the Reaction. Uses = CHA modifier (min 1) per Long Rest.'),
    f(20, 'Living Legend', 'Bonus Action, 10 minutes: Advantage on CHA checks; Reaction to reroll a failed save; once per turn a missed weapon attack hits instead. Once per Long Rest, or spend a level 5 slot.')] },
  { name: 'Oath of the Ancients', source: PHB, summary: 'Nature\'s knight: restraining vines, Resistance to magical damage for the aura, refusing to fall.',
    spells: { 3: ['Ensnaring Strike', 'Speak with Animals'], 5: ['Misty Step', 'Moonbeam'], 9: ['Plant Growth', 'Protection from Energy'], 13: ['Ice Storm', 'Stoneskin'], 17: ['Commune with Nature', 'Tree Stride'] }, features: [
    f(3, "Nature's Wrath", 'Magic action, one Channel Divinity: creatures of your choice you can see within 15 ft make a STR save or are Restrained for 1 minute (save again each turn).'),
    f(3, 'Oath of the Ancients Spells', 'Always prepared at Paladin level 3: Ensnaring Strike, Speak with Animals; 5: Misty Step, Moonbeam; 9: Plant Growth, Protection from Energy; 13: Ice Storm, Stoneskin; 17: Commune with Nature, Tree Stride.'),
    f(7, 'Aura of Warding', 'You and allies in your Aura of Protection have Resistance to Necrotic, Psychic and Radiant damage.'),
    f(15, 'Undying Sentinel', 'When you drop to 0 HP and aren\'t killed outright, go to 1 HP and regain 3 x Paladin level HP (once per Long Rest). You no longer age, by magic or time.'),
    f(20, 'Elder Champion', 'Bonus Action, 1 minute: enemies in your aura have Disadvantage on saves against your spells and Channel Divinity; regain 10 HP at the start of each turn; spells with a casting time of an action can be cast as a Bonus Action. Once per Long Rest, or spend a level 5 slot.')] },
  { name: 'Oath of Vengeance', source: PHB, summary: 'Hunts down a sworn foe: Advantage on attacks against it, punishing attacks and pursuit.',
    spells: { 3: ['Bane', "Hunter's Mark"], 5: ['Hold Person', 'Misty Step'], 9: ['Haste', 'Protection from Energy'], 13: ['Banishment', 'Dimension Door'], 17: ['Hold Monster', 'Scrying'] }, features: [
    f(3, 'Oath of Vengeance Spells', "Always prepared at Paladin level 3: Bane, Hunter's Mark; 5: Hold Person, Misty Step; 9: Haste, Protection from Energy; 13: Banishment, Dimension Door; 17: Hold Monster, Scrying."),
    f(3, 'Vow of Enmity', 'When you take the Attack action, one Channel Divinity: Advantage on attack rolls against a creature you can see within 30 ft for 1 minute; if it drops to 0 HP, move the vow to another creature within 30 ft.'),
    f(7, 'Relentless Avenger', 'When your Opportunity Attack hits, drop the target\'s Speed to 0 this turn and move up to half your Speed as part of the Reaction (no Opportunity Attacks).'),
    f(15, 'Soul of Vengeance', 'Reaction right after the target of your Vow of Enmity hits or misses with an attack: a melee attack against it.'),
    f(20, 'Avenging Angel', 'Bonus Action, 10 minutes: Fly Speed 60 ft (hover); an enemy starting its turn in your aura makes a WIS save or is Frightened for 1 minute or until it takes damage (attacks against it have Advantage). Once per Long Rest, or spend a level 5 slot.')] },
  { name: 'Oath of the Noble Genies', source: HOF, summary: 'Elemental smites from the four genie kinds, AC from DEX + CHA without armor, elemental resistance for the aura.',
    spells: { 3: ['Chromatic Orb', 'Elementalism', 'Thunderous Smite'], 5: ['Mirror Image', 'Phantasmal Force'], 9: ['Fly', 'Gaseous Form'], 13: ['Conjure Minor Elementals', 'Summon Elemental'], 17: ['Banishing Smite', 'Contact Other Plane'] }, features: [
    f(3, 'Elemental Smite', "Right after you cast Divine Smite, one Channel Divinity for one: Dao's Crush (the target is Grappled, escape DC = your spell DC, and Restrained while grappled), Djinni's Escape (teleport 30 ft; until the end of your next turn Resistance to Bludgeoning, Piercing and Slashing and Immunity to Grappled, Prone and Restrained), Efreeti's Fury (+2d4 Fire to the target and 2d4 Fire to another creature within 30 ft) or Marid's Surge (the target and chosen creatures within 10 ft make a STR save or are pushed 15 ft and Prone)."),
    f(3, 'Genie Spells', 'Always prepared at Paladin level 3: Chromatic Orb, Elementalism, Thunderous Smite; 5: Mirror Image, Phantasmal Force; 9: Fly, Gaseous Form; 13: Conjure Minor Elementals, Summon Elemental; 17: Banishing Smite, Contact Other Plane.'),
    f(3, "Genie's Splendor", 'With no armor, AC = 10 + DEX + CHA modifiers (a Shield still counts). One skill: Acrobatics, Intimidation, Performance or Persuasion.', {
      choice: { type: 'skills', count: 1, from: ['Acrobatics', 'Intimidation', 'Performance', 'Persuasion'] } }),
    f(7, 'Aura of Elemental Shielding', 'You and allies in your Aura of Protection have Resistance to one of Acid, Cold, Fire, Lightning or Thunder (change it at the start of each of your turns).'),
    f(15, 'Elemental Rebuke', 'Reaction when an attack roll hits you: halve its damage; the attacker makes a DEX save against your spell DC or takes 2d10 + CHA modifier Acid, Cold, Fire, Lightning or Thunder damage (half on a save). Uses = CHA modifier (min 1) per Long Rest.'),
    f(20, 'Noble Scion', 'Bonus Action, 10 minutes: Fly Speed 60 ft (hover); Reaction when you or an ally in your aura fails a D20 Test: it succeeds instead. Once per Long Rest, or spend a level 5 slot.')] }
],
ranger: [
  { name: 'Beast Master', source: PHB, summary: 'A primal beast companion of land, sea or sky that fights at your command.', features: [
    f(3, 'Primal Companion', "Summon a primal beast: Beast of the Land, Sea or Sky (a new one after a Long Rest). It acts on your turn and Dodges unless you command it (Bonus Action), or you trade one of your attacks for its Beast's Strike. Dead less than an hour: Magic action and a spell slot bring it back in 1 minute. AC 13 + WIS; HP 5 + 5 x Ranger level (Sky 4 + 4 x level); it adds your PB to checks and saves. Beast's Strike uses your spell attack bonus: Land 1d8 + 2 + WIS (after a 20-ft charge +1d6 and Prone), Sea 1d6 + 2 + WIS and Grappled (escape = your spell DC), Sky 1d4 + 3 + WIS Slashing (Fly 60 ft, no Opportunity Attacks when flying away)."),
    f(7, 'Exceptional Training', 'When you command the beast with a Bonus Action, it can also Dash, Disengage, Dodge or Help with its own Bonus Action, and its hits can deal Force damage.'),
    f(11, 'Bestial Fury', "When commanded to use Beast's Strike, the beast attacks twice; its first hit each turn on your Hunter's Mark target adds the mark's extra damage as Force damage."),
    f(15, 'Share Spells', 'A spell you cast on yourself can also affect your beast if it is within 30 ft.')] },
  { name: 'Fey Wanderer', source: PHB, summary: 'Feywild magic: Psychic damage on hits, WIS added to CHA checks, charm and fear turned back, free Misty Steps.', riders: [{ name: 'Dreadful Strikes', dice: { 3: '1d4', 11: '1d6' }, type: 'psychic', on: true, note: 'once per turn per creature' }],
    spells: { 3: ['Charm Person'], 5: ['Misty Step'], 9: ['Summon Fey'], 13: ['Dimension Door'], 17: ['Mislead'] }, features: [
    f(3, 'Dreadful Strikes', 'Weapon hits deal 1d4 extra Psychic damage (a creature takes it once per turn); 1d6 at Ranger 11.'),
    f(3, 'Fey Wanderer Spells', 'Always prepared at Ranger level 3: Charm Person; 5: Misty Step; 9: Summon Fey; 13: Dimension Door; 17: Mislead. You also carry a harmless Feywild gift (butterflies, flowers in your hair ...).'),
    f(3, 'Otherworldly Glamour', 'Add your WIS modifier (min +1) to CHA checks. One skill: Deception, Performance or Persuasion.', {
      choice: { type: 'skills', count: 1, from: ['Deception', 'Performance', 'Persuasion'] } }),
    f(7, 'Beguiling Twist', 'Advantage on saves to avoid or end Charmed and Frightened. Reaction when you or a creature within 120 ft succeeds on such a save: another creature you can see within 120 ft makes a WIS save against your spell DC or is Charmed or Frightened (your pick) for 1 minute (save again each turn).'),
    f(11, 'Fey Reinforcements', 'Summon Fey needs no Material component and can be cast once per Long Rest without a slot; when you cast it you can drop its Concentration (it lasts 1 minute).'),
    f(15, 'Misty Wanderer', 'Cast Misty Step without a slot, WIS modifier (min 1) times per Long Rest, and bring one willing creature within 5 ft along.')] },
  { name: 'Gloom Stalker', source: PHB, summary: 'An ambusher in the dark: extra Psychic damage, WIS added to Initiative, invisible to Darkvision.', riders: [{ name: 'Dreadful Strike', dice: { 3: '2d6', 11: '2d8' }, type: 'psychic', note: 'once per turn; WIS modifier uses per Long Rest' }],
    spells: { 3: ['Disguise Self'], 5: ['Rope Trick'], 9: ['Fear'], 13: ['Greater Invisibility'], 17: ['Seeming'] }, features: [
    f(3, 'Dread Ambusher', "Ambusher's Leap: +10 ft Speed on your first turn of each combat. Dreadful Strike: once per turn on a weapon hit, 2d6 extra Psychic damage; uses = WIS modifier (min 1) per Long Rest. Add your WIS modifier to Initiative."),
    f(3, 'Gloom Stalker Spells', 'Always prepared at Ranger level 3: Disguise Self; 5: Rope Trick; 9: Fear; 13: Greater Invisibility; 17: Seeming.'),
    f(3, 'Umbral Sight', 'Darkvision 60 ft (or 60 ft more). While entirely in Darkness you are Invisible to creatures that see you only with Darkvision.'),
    f(7, 'Iron Mind', 'Proficiency in WIS saving throws (if you have it, INT or CHA saves instead).', { grants: { saves: ['WIS'] } }),
    f(11, "Stalker's Flurry", 'Dreadful Strike deals 2d8, and adds Sudden Strike (another attack with the same weapon against a creature within 5 ft of the target) or Mass Fear (the target and creatures within 10 ft of it make a WIS save against your spell DC or are Frightened until the start of your next turn).'),
    f(15, 'Shadowy Dodge', 'Reaction when a creature attacks you: Disadvantage on the roll; hit or miss, you can then teleport up to 30 ft.')] },
  { name: 'Hollow Warden', source: RAV, summary: 'A ghastly wild form from Favored Enemy uses: AC, a frightening aura, healing hits and refusing to fall.', riders: [{ name: 'Ominous Strikes', from: 15, mod: 'WIS', note: 'the target is Frightened' }],
    spells: { 3: ['Wrathful Smite'], 5: ['Alter Self'], 9: ['Phantom Steed'], 13: ['Dominate Beast'], 17: ['Steel Wind Strike'] }, features: [
    f(3, 'Hollow Warden Spells', 'Always prepared at Ranger level 3: Wrathful Smite; 5: Alter Self; 9: Phantom Steed; 13: Dominate Beast; 17: Steel Wind Strike.'),
    f(3, 'Wrath of the Wild', 'Bonus Action, one Favored Enemy use: a ghastly form for 1 minute (ends if Incapacitated). +1 AC (+2 at Ranger 11); right after a creature within 5 ft damages you or an ally, make an Opportunity Attack against it; when you transform and at the start of each turn, creatures of your choice in a 10-ft Emanation make a WIS save against your spell DC or are Frightened until your next turn.'),
    f(7, 'Hungering Might', 'Add your WIS modifier (min +1) to CON saves. Once per turn when you hit while transformed and Bloodied, regain 1d10 + WIS modifier HP.'),
    f(11, 'Rot and Violence', 'While transformed: a creature failing your aura\'s save also can\'t regain HP or take Reactions until your next turn; weapon hits can add Sap or Slow on top of their own mastery property.'),
    f(15, 'Ancient Might', 'Hits against Frightened creatures add your WIS modifier to the damage. While transformed, dropping to 0 HP (not killed outright) sets you to 2 x Ranger level HP instead; once per Long Rest or spend a level 4+ slot. Immunity to Exhaustion.')] },
  { name: 'Winter Walker', source: HOF, summary: 'Cold that ignores Resistance, extra Cold damage on hits, Temporary HP from Hunter\'s Mark, stunning retaliation.', riders: [{ name: 'Polar Strikes', dice: { 3: '1d4', 11: '1d6' }, type: 'cold', on: true, note: 'once per turn per creature' }],
    spells: { 3: ['Ice Knife'], 5: ['Hold Person'], 9: ['Remove Curse'], 13: ['Ice Storm'], 17: ['Cone of Cold'] }, features: [
    f(3, 'Frigid Explorer', 'Your weapon attacks, Ranger spells and Ranger features ignore Resistance to Cold. Resistance to Cold damage. Weapon hits deal 1d4 extra Cold damage (once per turn per creature; 1d6 at Ranger 11).'),
    f(3, "Hunter's Rime", "When you cast Hunter's Mark, gain 1d10 + Ranger level Temporary HP; a creature you mark can't take the Disengage action."),
    f(3, 'Winter Walker Spells', 'Always prepared at Ranger level 3: Ice Knife; 5: Hold Person; 9: Remove Curse; 13: Ice Storm; 17: Cone of Cold.'),
    f(7, 'Fortifying Soul', 'Magic action: up to your WIS modifier (min 1) creatures you can see regain 1d10 + Ranger level HP and have Advantage on saves against Frightened for 1 hour. Once per Long Rest.'),
    f(11, 'Chilling Retribution', 'Reaction when a creature hits you with an attack roll: WIS save against your spell DC or it is Stunned with Speed 0 until the end of your next turn. Uses = WIS modifier (min 1) per Long Rest.'),
    f(15, 'Frozen Haunt', "When you cast Hunter's Mark, take a ghostly snow form while it lasts (once per Long Rest, or spend a level 4+ slot): Immunity to Cold; 2d4 Cold to creatures of your choice in a 15-ft Emanation when you take it and each turn; Immunity to Grappled, Prone and Restrained; move through creatures and objects as Difficult Terrain (1d10 Force if you end a turn inside).")] }
],
rogue: [
  { name: 'Arcane Trickster', source: PHB, summary: 'Wizard spells (a third caster, INT) with an invisible Mage Hand, spells that ambush, stealing spells.',
    spellcasting: third('INT', 'Wizard'), spells: { 3: ['Mage Hand'] }, features: [
    f(3, 'Spellcasting', 'Wizard spells with INT, an Arcane Focus as focus: Mage Hand and 2 other cantrips (one more at Rogue 10), prepared level 1+ spells per the Arcane Trickster table (3 at Rogue 3 up to 13), slots up to level 4 (back on a Long Rest). Swap one cantrip (not Mage Hand) and one spell each Rogue level.'),
    f(3, 'Mage Hand Legerdemain', 'Cast Mage Hand as a Bonus Action and make the hand Invisible; control it as a Bonus Action and make DEX (Sleight of Hand) checks through it.'),
    f(9, 'Magical Ambush', 'While you are Invisible, a creature has Disadvantage on saves against a spell you cast on it that turn.'),
    f(13, 'Versatile Trickster', 'When you use the Trip option of Cunning Strike, you can also use it on another creature within 5 ft of your Mage Hand.'),
    f(17, 'Spell Thief', "Reaction right after a creature's spell targets you or includes you: INT save against your spell DC. On a failure its effect on you is negated, and if it is level 1+ and a level you can cast you have it prepared for 8 hours while the caster can't cast it. Once per Long Rest.")] },
  { name: 'Assassin', source: PHB, summary: 'Strikes first: Advantage on Initiative and early attacks, extra damage in the first round, poisons and disguises.', riders: [{ name: 'Surprising Strikes', level: 1, note: 'a Sneak Attack hit in the first round of combat' }], features: [
    f(3, 'Assassinate', "Advantage on Initiative rolls. In the first round of combat, Advantage on attacks against creatures that haven't had a turn, and a Sneak Attack hit that round adds extra damage equal to your Rogue level."),
    f(3, "Assassin's Tools", "You gain a Disguise Kit and a Poisoner's Kit, and proficiency with both.", { grants: { tools: ['Disguise Kit', "Poisoner's Kit"] } }),
    f(9, 'Infiltration Expertise', "Masterful Mimicry: after an hour of study you can copy a person's speech, handwriting or both. Roving Aim: Steady Aim doesn't drop your Speed to 0."),
    f(13, 'Envenom Weapons', 'The Poison option of Cunning Strike also deals 2d6 Poison damage on a failed save, ignoring Resistance to Poison.'),
    f(17, 'Death Strike', 'A Sneak Attack hit in the first round of combat: CON save (DC 8 + DEX modifier + PB) or the attack deals double damage.')] },
  { name: 'Soulknife', source: PHB, summary: 'Psychic blades from your mind, Psionic Energy Dice for skills and teleports, telepathy and invisibility.', features: [
    f(3, 'Psionic Power', 'Psionic Energy Dice: 4d6 (6d8 at Rogue 5, 8d8 at 9, 8d10 at 11, 10d10 at 13, 12d12 at 17); one back on a Short Rest, all on a Long Rest. Psi-Bolstered Knack: when you fail a check with a skill or tool you are proficient with, add a die (spent only if you then succeed). Psychic Whispers: Magic action, up to PB creatures you can see, roll a die: telepathy with them for that many hours (within 1 mile).'),
    f(3, 'Psychic Blades', 'On the Attack action or an Opportunity Attack, attack with a Psychic Blade from your free hand: Simple Melee, 1d6 Psychic + the ability modifier, Finesse, Thrown 60/120 ft, Vex mastery (free). Afterwards a Bonus Action attack with a second blade (1d4) if the other hand is free.'),
    f(9, 'Soul Blades', 'Homing Strikes: when a blade attack misses, add a die to the roll (spent if it then hits). Psychic Teleportation: Bonus Action, spend a die and roll it: teleport up to 10 x the roll in feet.'),
    f(13, 'Psychic Veil', 'Magic action: Invisible for 1 hour (ends when you deal damage or force a save). Once per Long Rest or spend a die.'),
    f(17, 'Rend Mind', 'When a Psychic Blade deals Sneak Attack damage: WIS save (DC 8 + DEX modifier + PB) or Stunned for 1 minute (save again each turn). Once per Long Rest or spend three dice.')] },
  { name: 'Phantom', source: RAV, summary: 'Spirits of the dead: Necrotic wails on a second target, borrowed proficiencies, soul trinkets, a ghostly form.', features: [
    f(3, 'Wails from the Grave', 'Right after you deal Sneak Attack damage on your turn, a second creature you can see within 30 ft of the first takes Necrotic damage: roll half your Sneak Attack dice (round up). Uses = DEX modifier (min 1) per Long Rest.'),
    f(3, 'Whispers of the Dead', 'After a Short or Long Rest, gain one skill or tool proficiency you lack (it lasts until you pick another).'),
    f(9, 'Tokens of the Departed', "Two soul trinkets (max 3 at Rogue 13, 4 at 17; back to 2 after a Long Rest; Reaction when a creature you can see within 30 ft dies: gain one). Death's Knell: on a Sneak Attack, destroy one for a free Wails from the Grave. Life Essence: while you have one, Advantage on Death Saving Throws and CON saves. Spirit Query: Magic action, destroy one to cast Augury (CON) or ask its spirit a question."),
    f(9, 'Voice of Death', 'Cast Speak with Dead once without a slot or components (DEX), back on a Short or Long Rest; it can target a soul trinket instead of a corpse.'),
    f(13, 'Ghost Walk', 'Bonus Action, 10 minutes: Fly Speed 10 ft (hover), attack rolls against you have Disadvantage, move through creatures and objects as Difficult Terrain (1d10 Force if you end a turn inside). Once per Long Rest or destroy a soul trinket.'),
    f(17, "Death's Friend", 'Wails from the Grave damages both creatures. When you roll Initiative with no soul trinkets, gain one.')] },
  { name: 'Scion of the Three', source: HOF, summary: 'Servant of Bane, Bhaal or Myrkul: teleport to Bloodied foes and strike, Resistance and a cantrip, terrifying strikes.', features: [
    f(3, 'Bloodthirst', 'Reaction when an enemy you can see within 30 ft takes damage and is Bloodied (not killed): teleport to a space within 5 ft of it and make one melee attack. Uses = INT modifier (min 1) per Long Rest.'),
    f(3, 'Dread Allegiance', 'Choose one of the Dead Three (change it after a Long Rest); INT casts the cantrip.', { choice: pick([
      opt('Bane', 'Resistance to Psychic damage; Minor Illusion cantrip.', { alwaysPrepared: ['Minor Illusion'] }),
      opt('Bhaal', 'Resistance to Poison damage; Blade Ward cantrip.', { alwaysPrepared: ['Blade Ward'] }),
      opt('Myrkul', 'Resistance to Necrotic damage; Chill Touch cantrip.', { alwaysPrepared: ['Chill Touch'] })], true) }),
    f(9, 'Strike Fear', 'New Cunning Strike option Terrify (cost 1d6): WIS save or Frightened for 1 minute (save again each turn); you have Advantage on attacks against it while it is.'),
    f(13, 'Aura of Malevolence', 'When Bloodthirst teleports you, creatures of your choice within 10 ft of where you left or arrived take damage equal to your INT modifier, of your Dread Allegiance type (ignores Resistance).'),
    f(17, 'Dread Incarnate', 'Regain one Bloodthirst use on a Short Rest. Sneak Attack dice treat 1s and 2s as 3s.')] }
],
sorcerer: [
  { name: 'Aberrant Sorcery', source: PHB, summary: 'Psionic spells cast with Sorcery Points, telepathy, Psychic Resistance, an alien body.',
    spells: { 3: ['Arms of Hadar', 'Calm Emotions', 'Detect Thoughts', 'Dissonant Whispers', 'Mind Sliver'], 5: ['Hunger of Hadar', 'Sending'], 7: ["Evard's Black Tentacles", 'Summon Aberration'], 9: ["Rary's Telepathic Bond", 'Telekinesis'] }, features: [
    f(3, 'Psionic Spells', "Always prepared at Sorcerer level 3: Arms of Hadar, Calm Emotions, Detect Thoughts, Dissonant Whispers, Mind Sliver; 5: Hunger of Hadar, Sending; 7: Evard's Black Tentacles, Summon Aberration; 9: Rary's Telepathic Bond, Telekinesis."),
    f(3, 'Telepathic Speech', 'Bonus Action: telepathy with a creature you can see within 30 ft for Sorcerer level minutes, while you are within CHA modifier (min 1) miles of each other (you need a shared language).'),
    f(6, 'Psionic Sorcery', 'Cast a level 1+ Psionic Spell with Sorcery Points equal to its level instead of a slot; then it needs no Verbal or Somatic components, nor Material ones unless consumed or costly.'),
    f(6, 'Psychic Defenses', 'Resistance to Psychic damage; Advantage on saves to avoid or end Charmed and Frightened.'),
    f(14, 'Revelation in Flesh', 'Bonus Action, 1+ Sorcery Points: for 10 minutes one benefit per point: Aquatic Adaptation (Swim Speed twice your Speed, breathe water), Glistening Flight (Fly Speed equal to your Speed, hover), See the Invisible (within 60 ft) or Wormlike Movement (squeeze through 1 inch; 5 ft of movement escapes a grapple or nonmagical restraints).'),
    f(18, 'Warping Implosion', 'Magic action: teleport up to 120 ft; creatures within 30 ft of where you were make a STR save against your spell DC: 3d10 Force and pulled toward that spot, half and no pull on a save. Once per Long Rest, or spend 5 Sorcery Points.')] },
  { name: 'Clockwork Sorcery', source: PHB, summary: 'The order of Mechanus: cancel Advantage and Disadvantage, wards of d8s, never roll below 10.',
    spells: { 3: ['Aid', 'Alarm', 'Lesser Restoration', 'Protection from Evil and Good'], 5: ['Dispel Magic', 'Protection from Energy'], 7: ['Freedom of Movement', 'Summon Construct'], 9: ['Greater Restoration', 'Wall of Force'] }, features: [
    f(3, 'Clockwork Spells', 'Always prepared at Sorcerer level 3: Aid, Alarm, Lesser Restoration, Protection from Evil and Good; 5: Dispel Magic, Protection from Energy; 7: Freedom of Movement, Summon Construct; 9: Greater Restoration, Wall of Force. Your casting shows a sign of order (cogwheels, clock hands ...).'),
    f(3, 'Restore Balance', 'Reaction when a creature you can see within 60 ft is about to roll a d20 with Advantage or Disadvantage: it rolls without either. Uses = CHA modifier (min 1) per Long Rest.'),
    f(6, 'Bastion of Law', 'Magic action, 1 to 5 Sorcery Points: a ward of that many d8s on you or a creature within 30 ft; when it takes damage it can roll some of the dice and reduce the damage by the total. Lasts until a Long Rest or a new ward.'),
    f(14, 'Trance of Order', "Bonus Action, 1 minute: attack rolls against you can't have Advantage, and your D20 Tests treat a 9 or lower as a 10. Once per Long Rest, or spend 5 Sorcery Points."),
    f(18, 'Clockwork Cavalcade', 'Magic action: in a 30-ft Cube heal up to 100 HP split as you like, repair damaged objects, and end spells of level 6 or lower on creatures and objects of your choice. Once per Long Rest, or spend 7 Sorcery Points.')] },
  { name: 'Wild Magic Sorcery', source: PHB, summary: 'Chaotic surges when you cast, Advantage from Tides of Chaos, bending other creatures\' luck.', features: [
    f(3, 'Wild Magic Surge', 'Once per turn right after you cast a Sorcerer spell with a slot, you can roll 1d20; on a 20, roll on the Wild Magic Surge table (a spell it creates can\'t take Metamagic).'),
    f(3, 'Tides of Chaos', 'Give yourself Advantage on one D20 Test before rolling. To use it again, cast a Sorcerer spell with a slot (which surges automatically) or finish a Long Rest.'),
    f(6, 'Bend Luck', 'Reaction right after another creature you can see rolls the d20 for a D20 Test: spend 1 Sorcery Point, roll 1d4 and add it to or subtract it from the roll.'),
    f(14, 'Controlled Chaos', 'When you roll on the Wild Magic Surge table, roll twice and use either.'),
    f(18, 'Tamed Surge', 'Right after you cast a Sorcerer spell with a slot, pick any Wild Magic Surge effect but the last row instead of rolling. Once per Long Rest.')] },
  { name: 'Shadow Sorcery', source: RAV, summary: 'Shadowfell magic: Darkvision 120 ft, cheating death, a shadow beast, shadow teleports.',
    spells: { 3: ['Bane', 'Darkness', 'Inflict Wounds', 'Pass without Trace'], 5: ['Hunger of Hadar', 'Nondetection'], 7: ['Greater Invisibility', 'Phantasmal Killer'], 9: ['Contagion', 'Creation'] }, features: [
    f(3, 'Shadow Spells', 'Always prepared at Sorcerer level 3: Bane, Darkness, Inflict Wounds, Pass without Trace; 5: Hunger of Hadar, Nondetection; 7: Greater Invisibility, Phantasmal Killer; 9: Contagion, Creation.'),
    f(3, 'Power of Shadow', 'Darkvision 120 ft and Blindsight 10 ft; you see through Darkness your spells make. Strength of the Grave: when you would drop to 0 HP (not killed outright), CHA save (DC 5 + the damage) to go to CHA modifier + Sorcerer level HP instead; after a success, not again until a Long Rest.'),
    f(6, 'Beasts of Ill Omen', 'Spend 3 Sorcery Points to cast Summon Beast as a Bonus Action without a slot, preparing it or Material components; enemies within 5 ft of the shadow beast have Disadvantage on saves against your spells. You can drop its Concentration (it lasts 1 minute).'),
    f(14, 'Shadow Walk', 'While in Dim Light or Darkness, Bonus Action: teleport up to 120 ft to a space you can see that is also in Dim Light or Darkness.'),
    f(18, 'Umbral Form', 'When you use Innate Sorcery, take a shadow form while it lasts: move through creatures and objects as Difficult Terrain (1d10 Force if you end a turn inside) and Resistance to all damage but Force and Radiant. Once per Long Rest, or spend 6 Sorcery Points.')] },
  { name: 'Spellfire Sorcery', source: HOF, summary: 'Spellfire: Temporary HP or fire bursts whenever you spend Sorcery Points, healing spells, Counterspell that refuels.',
    spells: { 3: ['Cure Wounds', 'Guiding Bolt', 'Lesser Restoration', 'Scorching Ray'], 5: ['Aura of Vitality', 'Dispel Magic'], 6: ['Counterspell'], 7: ['Fire Shield', 'Wall of Fire'], 9: ['Greater Restoration', 'Flame Strike'] }, features: [
    f(3, 'Spellfire Burst', 'Once per turn when you spend 1+ Sorcery Point as part of a Magic action or Bonus Action: Bolstering Flames (you or a creature within 30 ft gains 1d4 + CHA modifier Temporary HP) or Radiant Fire (a creature within 30 ft takes 1d4 Fire or Radiant damage).'),
    f(3, 'Spellfire Spells', 'Always prepared at Sorcerer level 3: Cure Wounds, Guiding Bolt, Lesser Restoration, Scorching Ray; 5: Aura of Vitality, Dispel Magic; 7: Fire Shield, Wall of Fire; 9: Greater Restoration, Flame Strike.'),
    f(6, 'Absorb Spells', 'Counterspell always prepared; when a target fails its save against your Counterspell, regain 1d4 Sorcery Points.'),
    f(14, 'Honed Spellfire', 'Bolstering Flames adds your Sorcerer level to the Temporary HP; Radiant Fire deals 1d8.'),
    f(18, 'Crown of Spellfire', 'When you use Innate Sorcery, while it lasts: once per turn when hit, spend up to CHA modifier (min 1) Hit Point Dice and reduce the damage by their roll; Fly Speed 60 ft (hover); a save for half damage against a spell or magic deals none on a success and half on a failure. Once per Long Rest, or spend 5 Sorcery Points.')] }
],
warlock: [
  { name: 'Archfey Patron', source: PHB, summary: 'Free Misty Steps with extra effects (Temporary HP, taunts, invisibility, Psychic damage), charm immunity.',
    spells: { 3: ['Calm Emotions', 'Faerie Fire', 'Misty Step', 'Phantasmal Force', 'Sleep'], 5: ['Blink', 'Plant Growth'], 7: ['Dominate Beast', 'Greater Invisibility'], 9: ['Dominate Person', 'Seeming'] }, features: [
    f(3, 'Archfey Spells', 'Always prepared at Warlock level 3: Calm Emotions, Faerie Fire, Misty Step, Phantasmal Force, Sleep; 5: Blink, Plant Growth; 7: Dominate Beast, Greater Invisibility; 9: Dominate Person, Seeming.'),
    f(3, 'Steps of the Fey', 'Cast Misty Step without a slot, CHA modifier (min 1) times per Long Rest. Each casting can add Refreshing Step (you or a creature within 10 ft gains 1d10 Temporary HP) or Taunting Step (creatures within 5 ft of where you left make a WIS save against your spell DC or have Disadvantage on attacks against others than you until your next turn).'),
    f(6, 'Misty Escape', 'Cast Misty Step as a Reaction when you take damage. New Steps of the Fey options: Disappearing Step (Invisible until your next turn or until you attack, deal damage or cast a spell) and Dreadful Step (creatures within 5 ft of where you left or arrive make a WIS save or take 2d10 Psychic).'),
    f(10, 'Beguiling Defenses', 'Immunity to Charmed. Reaction right after a creature you can see hits you: halve the damage, and it makes a WIS save against your spell DC or takes Psychic damage equal to what you took. Once per Long Rest, or spend a Pact Magic slot.'),
    f(14, 'Bewitching Magic', 'Right after you cast an Enchantment or Illusion spell with an action and a slot, cast Misty Step as part of that action without a slot.')] },
  { name: 'Celestial Patron', source: PHB, summary: 'A pool of healing d6s, Radiant and Fire spells hit harder, Temporary HP after rests, rescue from death.',
    spells: { 3: ['Aid', 'Cure Wounds', 'Guiding Bolt', 'Lesser Restoration', 'Light', 'Sacred Flame'], 5: ['Daylight', 'Revivify'], 7: ['Guardian of Faith', 'Wall of Fire'], 9: ['Greater Restoration', 'Summon Celestial'] }, features: [
    f(3, 'Celestial Spells', 'Always prepared at Warlock level 3: Aid, Cure Wounds, Guiding Bolt, Lesser Restoration, Light, Sacred Flame; 5: Daylight, Revivify; 7: Guardian of Faith, Wall of Fire; 9: Greater Restoration, Summon Celestial.'),
    f(3, 'Healing Light', 'A pool of d6s equal to 1 + your Warlock level. Bonus Action: heal yourself or a creature you can see within 60 ft, rolling up to your CHA modifier (min 1) dice from the pool. Refills on a Long Rest.'),
    f(6, 'Radiant Soul', 'Resistance to Radiant damage. Once per turn when your spell deals Radiant or Fire damage, add your CHA modifier to one target\'s damage.'),
    f(10, 'Celestial Resilience', 'When you use Magical Cunning or finish a Short or Long Rest, gain Temporary HP = Warlock level + CHA modifier, and up to five creatures you can see gain half your Warlock level + CHA modifier.'),
    f(14, 'Searing Vengeance', 'When you or an ally within 60 ft is about to make a Death Saving Throw: it regains half its HP maximum and can stand up; creatures of your choice within 30 ft of it take 2d8 + CHA modifier Radiant and are Blinded until the end of the turn. Once per Long Rest.')] },
  { name: 'Great Old One Patron', source: PHB, summary: 'Telepathy, Psychic damage and silent enchantments, a Hex that weakens saves, a summoned thrall.',
    spells: { 3: ['Detect Thoughts', 'Dissonant Whispers', 'Phantasmal Force', "Tasha's Hideous Laughter"], 5: ['Clairvoyance', 'Hunger of Hadar'], 7: ['Confusion', 'Summon Aberration'], 9: ['Modify Memory', 'Telekinesis'], 10: ['Hex'] }, features: [
    f(3, 'Awakened Mind', 'Bonus Action: telepathy with a creature you can see within 30 ft for Warlock level minutes, while you are within CHA modifier (min 1) miles of each other.'),
    f(3, 'Great Old One Spells', "Always prepared at Warlock level 3: Detect Thoughts, Dissonant Whispers, Phantasmal Force, Tasha's Hideous Laughter; 5: Clairvoyance, Hunger of Hadar; 7: Confusion, Summon Aberration; 9: Modify Memory, Telekinesis."),
    f(3, 'Psychic Spells', 'Your Warlock damage spells can deal Psychic damage instead; your Warlock Enchantment and Illusion spells need no Verbal or Somatic components.'),
    f(6, 'Clairvoyant Combatant', 'When you form an Awakened Mind bond, the creature makes a WIS save against your spell DC or, while the bond lasts, has Disadvantage on attacks against you and you have Advantage on attacks against it. Once per Short or Long Rest, or spend a Pact Magic slot.'),
    f(10, 'Eldritch Hex', 'Hex always prepared; its target also has Disadvantage on saves with the ability you chose.'),
    f(10, 'Thought Shield', 'Your thoughts can\'t be read unless you allow it. Resistance to Psychic damage, and a creature that deals Psychic damage to you takes as much.'),
    f(14, 'Create Thrall', "Summon Aberration can skip Concentration (it lasts 1 minute) and the Aberration gets Warlock level + CHA modifier Temporary HP; its first hit each turn on your Hex target adds Hex's damage as Psychic.")] },
  { name: 'Undead Patron', source: RAV, summary: 'A Form of Dread that frightens on hits, Necrotic damage that ignores Resistance, rising again at 0 HP.',
    spells: { 3: ['Bane', 'Blindness/Deafness', 'Phantasmal Force', 'Ray of Sickness'], 5: ['Speak with Dead', 'Summon Undead'], 7: ['Greater Invisibility', 'Phantasmal Killer'], 9: ['Antilife Shell', 'Cloudkill'] }, features: [
    f(3, 'Form of Dread', 'Bonus Action, 1 minute: 1d10 + Warlock level Temporary HP, Immunity to Frightened, and once per turn a hit with an attack roll forces a WIS save against your spell DC or Frightened until the end of your next turn. Uses = CHA modifier (min 1) per Long Rest.'),
    f(3, 'Undead Spells', 'Always prepared at Warlock level 3: Bane, Blindness/Deafness, Phantasmal Force, Ray of Sickness; 5: Speak with Dead, Summon Undead; 7: Greater Invisibility, Phantasmal Killer; 9: Antilife Shell, Cloudkill.'),
    f(6, 'Grave Touched', 'Necrotic damage from your attacks, Warlock spells and features ignores Resistance; once per turn a damage spell can deal Necrotic instead. In Form of Dread, once per turn a Necrotic hit rolls one more damage die. No Exhaustion from hunger, thirst or suffocation; you need no sleep and magic can\'t make you sleep.'),
    f(10, 'Necrotic Husk', 'Resistance to Necrotic (Immunity in Form of Dread). Unholy Resuscitation: when you drop to 0 HP (not killed outright), creatures of your choice in 30 ft make a CON save: 2d10 + CHA modifier Necrotic (half on a save); you go to 2 x Warlock level HP and gain 1 Exhaustion level. Once per Short or Long Rest.'),
    f(14, 'Superior Dread', 'In Form of Dread: Resistance to Bludgeoning, Piercing and Slashing; Fly Speed equal to your Speed (hover) and move through creatures and objects (1d10 Force if you end a turn inside); Conjuration and Necromancy Warlock spells need no components but costly or consumed ones.')] },
  { name: 'Vestige Patron', source: ARC, summary: 'A vestige of a dead god fights beside you (Celestial, Fiend or Undead) and lends you a Cleric domain\'s spells.',
    spellsFrom: { feature: 'Vestige Spells', options: { Life: ['cleric', 'Life Domain'], Light: ['cleric', 'Light Domain'], Trickery: ['cleric', 'Trickery Domain'], War: ['cleric', 'War Domain'] } }, features: [
    f(3, 'Vestige Companion', "A Small vestige (Celestial, Fiend or Undead; change it after a Long Rest) acts on your turn and Dodges unless you command it (Bonus Action) or trade an attack for its Vestige's Strike. AC 13 + CHA; HP 4 + 4 x Warlock level; hovers 30 ft; adds your PB to checks and saves. Vestige's Strike (melee 5 ft or ranged 60 ft, your spell attack bonus): 1d6 + 3 + CHA Fire, Necrotic or Radiant by its kind. Divine Power once a day: curse a creature (Undead), swap places within 60 ft (Fiend) or heal 2d8 + CHA and end Blinded, Deafened or Poisoned (Celestial). At 0 HP it vanishes; a 1-minute ceremony brings it back."),
    f(3, 'Vestige Spells', "Pick a Cleric domain: its domain spells are Warlock spells for you, always prepared at the same Warlock levels.", { choice: pick([
      opt('Life', 'Aid, Bless, Cure Wounds, Lesser Restoration; 5: Mass Healing Word, Revivify; 7: Aura of Life, Death Ward; 9: Greater Restoration, Mass Cure Wounds.'),
      opt('Light', 'Burning Hands, Faerie Fire, Scorching Ray, See Invisibility; 5: Daylight, Fireball; 7: Arcane Eye, Wall of Fire; 9: Flame Strike, Scrying.'),
      opt('Trickery', 'Charm Person, Disguise Self, Invisibility, Pass without Trace; 5: Hypnotic Pattern, Nondetection; 7: Confusion, Dimension Door; 9: Dominate Person, Modify Memory.'),
      opt('War', "Guiding Bolt, Magic Weapon, Shield of Faith, Spiritual Weapon; 5: Crusader's Mantle, Spirit Guardians; 7: Fire Shield, Freedom of Movement; 9: Hold Monster, Steel Wind Strike.")]) }),
    f(6, 'Vestige Power', 'Divine Power comes back on a Short or Long Rest or when you use Magical Cunning; within 30 ft of the vestige you share its Resistance.'),
    f(10, 'Vestige Recovery', 'Reaction when the vestige would drop to 0 HP: spend a Pact Magic slot; it goes to full HP and teleports up to 30 ft. Once per Long Rest.'),
    f(14, 'Semblance of Life', 'Magic action, vestige within 90 ft: for 1 hour it becomes a Celestial, Fiendish or Undead Spirit (Summon Celestial, Fiend or Undead stat block at half your Warlock level), keeping its HP and Divine Power, and gains the spirit\'s HP as Temporary HP (the form ends when they are gone). Once per Long Rest.')] }
],
wizard: [
  { name: 'Abjurer', short: 'Abjurer|Abjuration', source: PHB, savant: 'Abjuration', summary: 'A magical ward that soaks up damage for you or an ally, free Counterspell and Dispel Magic, spell resistance.',
    spells: { 10: ['Counterspell', 'Dispel Magic'] }, features: [
    f(3, 'Abjuration Savant', 'Add two Abjuration Wizard spells of level 2 or lower to your spellbook for free, and one free Abjuration spell whenever you gain a new level of spell slots.', { choice: { type: 'spellbook', count: 2, school: 'Abjuration', maxLevel: 2 } }),
    f(3, 'Arcane Ward', 'Once per Long Rest, when you cast an Abjuration spell with a slot, create a ward on yourself (until a Long Rest) with HP maximum 2 x Wizard level + INT modifier; it takes damage before you (after your Resistances). Abjuration spells cast with a slot restore 2 x the slot level; or as a Bonus Action spend a slot to restore 2 x its level.'),
    f(6, 'Projected Ward', 'Reaction when a creature you can see within 30 ft takes damage: your Arcane Ward absorbs it.'),
    f(10, 'Spell Breaker', "Counterspell and Dispel Magic always prepared; cast Dispel Magic as a Bonus Action and add your PB to its check. If either fails to stop a spell, the slot isn't spent."),
    f(14, 'Spell Resistance', 'Advantage on saves against spells and Resistance to the damage of spells.')] },
  { name: 'Diviner', short: 'Diviner|Divination', source: PHB, savant: 'Divination', summary: 'Portent: roll d20s after a Long Rest and swap them in for anyone\'s rolls; Divination spells refund slots.', features: [
    f(3, 'Divination Savant', 'Add two Divination Wizard spells of level 2 or lower to your spellbook for free, and one free Divination spell whenever you gain a new level of spell slots.', { choice: { type: 'spellbook', count: 2, school: 'Divination', maxLevel: 2 } }),
    f(3, 'Portent', 'After each Long Rest roll two d20s and note them. Before a D20 Test by you or a creature you can see, replace its roll with one of them (each once, one per turn); unused ones are lost at the next Long Rest.'),
    f(6, 'Expert Divination', 'When you cast a Divination spell with a level 2+ slot, regain one spent slot of a lower level (no higher than 5).'),
    f(10, 'The Third Eye', 'Bonus Action, until you start a Short or Long Rest: Darkvision 120 ft, or read any language, or cast See Invisibility without a slot. Once per Short or Long Rest.'),
    f(14, 'Greater Portent', 'Portent rolls three d20s.')] },
  { name: 'Illusionist', short: 'Illusionist|Illusion', source: PHB, savant: 'Illusion', summary: 'Silent, far-reaching illusions, illusory summons without slots, a duplicate that makes an attack miss, illusions made real.',
    spells: { 3: ['Minor Illusion'], 6: ['Summon Beast', 'Summon Fey'] }, features: [
    f(3, 'Illusion Savant', 'Add two Illusion Wizard spells of level 2 or lower to your spellbook for free, and one free Illusion spell whenever you gain a new level of spell slots.', { choice: { type: 'spellbook', count: 2, school: 'Illusion', maxLevel: 2 } }),
    f(3, 'Improved Illusions', 'Illusion spells need no Verbal components, and those with a range of 10+ ft reach 60 ft farther. You know Minor Illusion (another Wizard cantrip if you have it; not counted against your cantrips), with sound and image together, castable as a Bonus Action.'),
    f(6, 'Phantasmal Creatures', 'Summon Beast and Summon Fey always prepared; you can make them Illusion spells, and cast each once per Long Rest without a slot (the creature has half its HP).'),
    f(10, 'Illusory Self', 'Reaction when a creature hits you with an attack roll: an illusory double makes it miss. Once per Short or Long Rest, or spend a level 2+ slot.'),
    f(14, 'Illusory Reality', "When you cast an Illusion spell with a slot, make one inanimate, nonmagical object in it real for 1 minute (a Bonus Action while the spell lasts); it can't deal damage or cause conditions.")] },
  { name: 'Bladesinger', source: HOF, summary: 'Elven blade magic: the Bladesong adds INT to AC, Speed and weapon attacks; Extra Attack with cantrips.', features: [
    f(3, 'Bladesong', 'Bonus Action, no armor or Shield, 1 minute (ends if Incapacitated, if you don armor or a Shield, or attack with two hands): + INT modifier (min +1) to AC, +10 ft Speed, Advantage on DEX (Acrobatics); use INT for attack and damage rolls with weapons you are proficient with; add INT to Concentration saves. Uses = INT modifier (min 1) per Long Rest; Arcane Recovery restores one.'),
    f(3, 'Training in War and Song', "Proficiency with Melee Martial weapons that aren't Two-Handed or Heavy; a Melee weapon you're proficient with can be your Spellcasting Focus. One skill: Acrobatics, Athletics, Performance or Persuasion.", {
      grants: { weapons: ['Melee Martial weapons without Two-Handed or Heavy'] }, choice: { type: 'skills', count: 1, from: ['Acrobatics', 'Athletics', 'Performance', 'Persuasion'] } }),
    f(6, 'Extra Attack', 'Attack twice when you take the Attack action; one attack can be a Wizard cantrip with a casting time of an action instead.'),
    f(10, 'Song of Defense', 'Reaction when you take damage during the Bladesong: spend a spell slot to reduce the damage by 5 x its level.'),
    f(14, 'Song of Victory', 'After you cast a spell with a casting time of an action, make one weapon attack as a Bonus Action.')] },
  { name: 'Conjurer', short: 'Conjurer|Conjuration', source: ARC, savant: 'Conjuration', summary: 'Short teleports and place swaps, tougher summons, Concentration on conjurations that damage can\'t break.', features: [
    f(3, 'Benign Transposition', 'Bonus Action: teleport up to 30 ft, or swap places with a willing Medium or smaller creature there. Uses = INT modifier (min 1) per Long Rest.'),
    f(3, 'Conjuration Savant', 'Add two Conjuration Wizard spells of level 2 or lower to your spellbook for free, and one free Conjuration spell whenever you gain a new level of spell slots.', { choice: { type: 'spellbook', count: 2, school: 'Conjuration', maxLevel: 2 } }),
    f(6, 'Distant Transposition', 'Benign Transposition reaches 60 ft; spend a level 3+ slot to restore a use.'),
    f(6, 'Durable Summons', 'A creature you summon or create with a Conjuration spell cast with a slot gains 2 x Wizard level Temporary HP and, while it has them, Resistance to all damage but Force, Necrotic, Psychic and Radiant.'),
    f(10, 'Focused Conjuration', "Taking damage can't break your Concentration on Conjuration spells."),
    f(14, 'Splintered Summons', 'A Conjuration spell cast with a slot that summons a spirit with its own stat block (Summon Aberration ...) can summon two, each with half the HP. Once per Long Rest, or spend a level 5+ slot.')] },
  { name: 'Enchanter', short: 'Enchanter|Enchantment', source: ARC, savant: 'Enchantment', summary: 'Charming talk and a gaze that freezes a creature in place, extra targets for charms, attacks turned on others.', features: [
    f(3, 'Enchanting Conversationalist', 'One skill: Deception, Intimidation or Persuasion; add your INT modifier (min +1) to checks with it.', {
      choice: { type: 'skills', count: 1, from: ['Deception', 'Intimidation', 'Persuasion'] } }),
    f(3, 'Enchantment Savant', 'Add two Enchantment Wizard spells of level 2 or lower to your spellbook for free, and one free Enchantment spell whenever you gain a new level of spell slots.', { choice: { type: 'spellbook', count: 2, school: 'Enchantment', maxLevel: 2 } }),
    f(3, 'Hypnotic Presence', 'Magic action: a creature within 10 ft that can see or hear you makes a WIS save against your spell DC or is Charmed for 1 minute (Incapacitated, Speed 0; ends if it gets 10+ ft away, loses sight and sound of you, or takes damage). Uses = INT modifier (min 1) per Long Rest.'),
    f(6, 'Split Enchantment', 'An Enchantment spell cast with a slot that gains targets when upcast counts as one level higher. Uses = INT modifier per Long Rest.'),
    f(10, 'Instinctive Charm', 'Reaction when a creature within 30 ft hits you with an attack roll: WIS save against your spell DC or the attack misses you and hits another creature in range (your pick) with the same roll. Once per Long Rest; casting an Enchantment spell with a slot restores it.'),
    f(14, 'Alter Memories', "A creature Charmed by your slot-cast Enchantment spell doesn't notice it; once before the spell ends, Magic action: INT save or it forgets up to 1 + INT modifier hours.")] },
  { name: 'Necromancer', short: 'Necromancer|Necromancy', source: ARC, savant: 'Necromancy', summary: 'Necrotic Resistance, an undead familiar, free Animate Dead, undead servants that hit harder and explode.',
    spells: { 6: ['Animate Dead'] }, features: [
    f(3, 'Necromancy Savant', 'Add two Necromancy Wizard spells of level 2 or lower to your spellbook for free, and one free Necromancy spell whenever you gain a new level of spell slots.', { choice: { type: 'spellbook', count: 2, school: 'Necromancy', maxLevel: 2 } }),
    f(3, 'Necromancy Spellbook', 'Resistance to Necrotic damage. Find Familiar is in your spellbook, with Skeleton or Zombie forms (or any form as an Undead); you can trade one of your attacks for a familiar attack (its Reaction). When you cast a Necromancy spell with a slot, an Undead you can see within 60 ft regains slot level + Wizard level HP.'),
    f(6, 'Grave Power', 'While holding your spellbook: Arcane Recovery also removes 1 Exhaustion level, and your Wizard spells and features ignore Resistance to Necrotic damage.'),
    f(6, 'Undead Thralls', 'Animate Dead always prepared, once per Long Rest without a slot, and cast as one level higher. While holding your spellbook, Undead you create or summon get INT modifier + half Wizard level more HP, and your Undead within 60 ft deal + INT modifier (min 1) Necrotic on hits.'),
    f(10, 'Harvest Undead', 'Reaction right after you become Bloodied (not at 0 HP): drop an Undead you control that you can see to 0 HP and regain HP equal to your Wizard level.'),
    f(14, "Death's Master", 'While holding your spellbook: Bonus Action, your Necromancy-made Undead within 60 ft gain Wizard level Temporary HP (once per Long Rest). When an Undead you can see drops to 0 HP, it can explode: d6s equal to half its unspent Hit Dice (round up), DEX save in 10 ft, Necrotic damage and no Reactions, half on a save (one you don\'t control costs a Reaction and a level 5+ slot).')] },
  { name: 'Transmuter', short: 'Transmuter|Transmutation', source: ARC, savant: 'Transmutation', summary: "A Transmuter's Stone that grants benefits, free Alter Self and Polymorph, stronger buffs, healing and revival.",
    spells: { 3: ['Alter Self'], 10: ['Polymorph'] }, features: [
    f(3, 'Transmutation Savant', 'Add two Transmutation Wizard spells of level 2 or lower to your spellbook for free, and one free Transmutation spell whenever you gain a new level of spell slots.', { choice: { type: 'spellbook', count: 2, school: 'Transmutation', maxLevel: 2 } }),
    f(3, "Transmuter's Stone", 'After a Long Rest make a stone (a Spellcasting Focus) that lasts until you make another. Its bearer has CON save proficiency and one benefit: Darkvision 60 ft (or 60 ft more), Resistance to Acid, Cold, Fire, Lightning, Poison or Thunder, or +10 ft Speed. Casting a Transmutation spell with a slot can change the benefit.'),
    f(3, 'Wondrous Alteration', 'Alter Self always prepared, once per Long Rest without a slot. With it you also get: Dash as a Bonus Action underwater (Aquatic Adaptation), Advantage on CHA (Deception) (Change Appearance), or 2d6 natural weapons and Advantage on Concentration saves (Natural Weapons).'),
    f(6, 'Empowered Transmutation', 'A Transmutation spell cast with a slot that makes no attack roll and forces no save counts as one level higher. Uses = INT modifier (min 1) per Long Rest.'),
    f(10, 'Potent Stone', 'Your stone holds two benefits (Resistance twice means two damage types); new options: Mighty Build (Advantage on STR saves, carries as one size larger) and Tremorsense 30 ft.'),
    f(10, 'Shape-Shifter', 'Polymorph always prepared, once per Long Rest without a slot. Once per Long Rest, polymorphing yourself keeps your mind, INT, WIS and CHA, proficiencies, class features and feats, and lets you cast Transmutation spells without costly or consumed components.'),
    f(14, 'Master Transmuter', 'Magic action: use up the stone (a level 7+ slot keeps it) for Major Transformation (10 minutes: turn a nonmagical object up to a 10-ft Cube into another of similar size and equal or lesser value), Panacea (touch: half its HP maximum back, magical diseases and curses ended, Poisoned and Petrified ended), Restore Life (Raise Dead without a slot or components) or Restore Youth (Exhaustion to 0, 3d10 years younger).')] }
]
};

// The Evoker (free rules) also gets a free Evocation spell at each new spell slot level
DND.classes.wizard.subclass.savant = 'Evocation';
DND.classes.wizard.subclass.short = 'Evoker|Evocation';

// One line for the picker for each free-rules subclass
const FREE = {
  barbarian: 'Frenzy damage while raging recklessly, no charm or fear while raging, Retaliation, a frightening presence.',
  bard: 'Three more skills, Cutting Words against enemy rolls, spells from other lists, Peerless Skill.',
  cleric: 'Stronger healing: extra HP on every healing spell, Preserve Life, healing dice at their maximum at level 17.',
  druid: 'Spells of a land you pick each day, Land\'s Aid damage and healing, slots back on a Short Rest, resistances.',
  fighter: 'Critical Hits on 19-20 (later 18-20), athletic, a second Fighting Style, Heroic Inspiration, regeneration.',
  monk: 'Flurry of Blows that pushes, topples or stops reactions; healing yourself; Quivering Palm.',
  paladin: 'Sacred Weapon adds CHA to attacks, an aura against charm, protection when you smite, a Holy Nimbus.',
  ranger: "Colossus Slayer or Horde Breaker, defensive tactics, Hunter's Mark damage that spreads to another foe.",
  rogue: 'Fast Hands for items and tricks, climbing and long jumps, any magic item works for you, two turns in the first round.',
  sorcerer: 'More HP and natural armor, draconic spells, a damage type that hits harder, wings and a dragon companion.',
  warlock: "Temporary HP when foes drop, the Dark One's luck on checks and saves, a resistance of your choice, Hurl Through Hell.",
  wizard: 'Free Evocation spells, cantrips that still deal half damage, area spells that spare allies, Overchannel.'
};
for (const [key, list] of Object.entries(MORE)) {
  const c = DND.classes[key];
  c.subclass.summary ||= FREE[key];
  c.subclasses = [c.subclass, ...list];
}
})();
