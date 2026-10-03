/* More species, beyond the 9 in the free rules (species.js): the Aasimar from the 2024 Player's Handbook, and every other
   species on D&D Beyond's public species list (official and third-party books), one per name. Same shape as species.js, plus:
   source: the book.  aliases: other names to recognise on a sheet.  brief: true = only what D&D Beyond's public species
   list shows (the trait names); size and speed are null when the list doesn't give them, and the rules are in the book.
   The Aasimar's text is a short summary in our own words (see CREDITS.md). */
window.DND = window.DND || {};

(() => {
const brief = (source, name, traits, more = {}) => ({ name, size: null, speed: null, traits, subspecies: [], attackNotes: [],
  features: [], source, brief: true, ...more });
const FOTA = 'Eberron: Forge of the Artificer', LORWYN = 'Lorwyn: First Light', EE = 'Exploring Eberron (2024)';

DND.species.push(
  {"name":"Aasimar","source":"Player's Handbook (2024)","size":"Medium or Small","speed":30,
   "traits":["Celestial Resistance","Darkvision (60 ft.)","Healing Hands","Light Bearer","Celestial Revelation"],"subspecies":[],
   "attackNotes":["Celestial Revelation (level 3+, while transformed): once on each of your turns, one target of your attack or spell takes extra damage equal to your Proficiency Bonus (Radiant; Necrotic with Necrotic Shroud)."],
   "traitLevels":{"Celestial Revelation":3},
   "features":[
     {"lvl":1,"name":"Celestial Resistance","text":"Resistance to Necrotic and Radiant damage."},
     {"lvl":1,"name":"Darkvision","text":"Darkvision 60 ft."},
     {"lvl":1,"name":"Healing Hands","text":"Magic action: touch a creature, roll as many d4s as your Proficiency Bonus; it regains that many HP. Once per Long Rest."},
     {"lvl":1,"name":"Light Bearer","text":"You know the Light cantrip (Charisma is its spellcasting ability).","grants":{"cantrips":["Light"]}},
     {"lvl":3,"name":"Celestial Revelation","text":"Bonus Action: transform for 1 minute, once per Long Rest. Pick each time: Heavenly Wings (Fly Speed equal to your Speed), Inner Radiance (Bright Light 10 ft; at the end of each of your turns, creatures within 10 ft take Radiant damage equal to your Proficiency Bonus) or Necrotic Shroud (creatures within 10 ft that aren't your allies make a CHA save, DC 8 + CHA modifier + Proficiency Bonus, or are Frightened of you until the end of your next turn). While transformed, once on each of your turns one target of your attack or spell takes extra damage equal to your Proficiency Bonus (Necrotic with Necrotic Shroud, else Radiant)."}]},

  brief(FOTA, 'Changeling', ['Fey', 'Changeling Instincts', 'Shape-Shifter']),
  brief(FOTA, 'Kalashtar', ['Aberration', 'Dual Mind', 'Mental Discipline', 'Mindlink', 'Severed from Dreams']),
  brief(FOTA, 'Khoravar', ['Darkvision', 'Fey Ancestry', 'Fey Gift', 'Lethargy Resilience', 'Skill Versatility'], { aliases: ['Half-Elf (Eberron)'] }),
  brief(FOTA, 'Shifter', ['Bestial Instincts', 'Darkvision', 'Shifting']),
  brief(FOTA, 'Warforged', ['Construct', 'Construct Resilience', 'Integrated Protection', "Sentry's Rest", 'Specialized Design', 'Tireless']),

  brief(LORWYN, 'Boggart', ['Goblinoid', 'Darkvision', 'Fey Ancestry', 'Fury of the Small', 'Nimble Escape'], { size: 'Small' }),
  brief(LORWYN, 'Faerie', ['Fey', 'Faerie Magic', 'Flight']),
  brief(LORWYN, 'Flamekin', ['Darkvision', 'Fire Resistance', 'Reach to the Blaze']),
  brief(LORWYN, 'Kithkin', ['Brave', 'Kithkin Nimbleness', 'Luck', 'Naturally Stealthy']),
  brief(LORWYN, 'Lorwyn Changeling', ['Shape Self', 'Darkvision', 'Delightful Imitator', 'Unpredictable Movement']),
  brief(LORWYN, 'Lorwyn-Shadowmoor Elf', ['Darkvision', 'Elven Lineage', 'Fey Ancestry', 'Keen Senses', 'Trance'], { aliases: ['Shadowmoor Elf', 'Lorwyn Elf'] }),
  brief(LORWYN, 'Rimekin', ['Cold Fire Magic', 'Cold Resistance', 'Darkvision']),

  brief(EE, 'Aasimar (Exploring Eberron)', []),
  brief(EE, "Dhakaani Ghaal'dar", ['Darkvision', 'Discipline', 'Strength in Unity', 'War and Peace'], { aliases: ["Ghaal'dar", 'Dhakaani Hobgoblin'] }),
  brief(EE, "Dhakaani Golin'dar", ['Darkvision', 'Discipline', 'Naturally Stealthy', 'Nimbleness'], { aliases: ["Golin'dar", 'Dhakaani Goblin'] }),
  brief(EE, "Dhakaani Guul'dar", ['Darkvision', 'Brave', 'Long Limbed', 'Powerful Build', 'Stand by the Strong'], { aliases: ["Guul'dar", 'Dhakaani Bugbear'] }),
  brief(EE, "Jhorgun'taal", ['Darkvision', 'Relentless Endurance', 'Versatile'], { aliases: ['Half-Orc (Eberron)'] }),
  brief(EE, 'Kalamer Landwalker', ['Darkvision', 'Amphibious', 'Blessing of the Sea', 'Karakala Lore', 'Swift Swimmer'], { aliases: ['Landwalker', 'Kalamer Merfolk'] }),
  brief(EE, 'Ruinbound', ['Darkvision', 'Personal Symbiont', 'Symbiont Mastery', 'Unnatural Resilience']),
  brief(EE, 'Sahuagin', ['Darkvision', 'Swift Swimmer', 'Blood Frenzy', 'Natural Armor', 'Limited Amphibiousness'])
);

// Every other species on D&D Beyond's species list (2026-10-03), as [book, name, trait names]. One per name: when several
// books have the same name, the 2024 version wins, then the newest official one (Monsters of the Multiverse over Volo's,
// Elemental Evil, Ravnica, Theros), then third-party (the one without old-style ability bonuses). The older names that
// Monsters of the Multiverse replaced are left out (Yuan-ti Pureblood -> Yuan-ti, Gith -> Githyanki / Githzerai,
// Genasi -> Air / Earth / Fire / Water Genasi). Ability bonuses from 2014-style trait lists are left out too (2024 rules:
// your background raises scores).
const ALIASES = { 'Yuan-ti': ['Yuan-ti Pureblood'], 'The Children of Seth': ['Children of Seth'], 'The Manyhorn': ['Manyhorn'],
  'Alfar (Hidden Elf)': ['Alfar', 'Hidden Elf'] };
const listed = [
  // Ravenloft: The Horrors Within
  ["Ravenloft: The Horrors Within", "Dhampir", ["Darkvision", "Spider Climb", "Trace of Undeath", "Vampiric Bite"]],
  ["Ravenloft: The Horrors Within", "Hexblood", ["Fey", "Darkvision", "Eerie Token", "Distant Message", "Remote Viewing"]],
  ["Ravenloft: The Horrors Within", "Lupin", ["Darkvision", "Feral Pounce", "Howl", "Werewolf Instincts"]],
  ["Ravenloft: The Horrors Within", "Reborn", ["Escaped Death", "Everlasting", "Knowledge from a Past Life", "Strange Endurance"]],
  // Basic Rules (2014)
  ["Basic Rules (2014)", "Half-Elf", ["Darkvision", "Fey Ancestry", "Skill Versatility"]],
  ["Basic Rules (2014)", "Half-Orc", ["Darkvision", "Menacing", "Relentless Endurance", "Savage Attacks"]],
  // Acquisitions Incorporated
  ["Acquisitions Incorporated", "Verdan", ["Black Blood Healing", "Limited Telepathy", "Persuasive", "Telepathic Insight"]],
  // Dragonlance: Shadow of the Dragon Queen
  ["Dragonlance: Shadow of the Dragon Queen", "Kender", ["Fearless", "Kender Aptitude", "Taunt"]],
  // Guildmasters' Guide to Ravnica
  ["Guildmasters' Guide to Ravnica", "Loxodon", ["Powerful Build", "Loxodon Serenity", "Natural Armor", "Trunk", "Keen Smell"]],
  ["Guildmasters' Guide to Ravnica", "Simic Hybrid", ["Darkvision", "Animal Enhancement"]],
  ["Guildmasters' Guide to Ravnica", "Vedalken", ["Vedalken Dispassion", "Tireless Precision", "Partially Amphibious"]],
  // Mordenkainen Presents: Monsters of the Multiverse
  ["Mordenkainen Presents: Monsters of the Multiverse", "Aarakocra", ["Flight", "Talons", "Wind Caller"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Air Genasi", ["Darkvision", "Unending Breath", "Lightning Resistance", "Mingle with the Wind"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Bugbear", ["Darkvision", "Fey Ancestry", "Long-Limbed", "Powerful Build", "Sneaky", "Surprise Attack"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Centaur", ["Fey", "Charge", "Equine Build", "Hooves", "Natural Affinity"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Deep Gnome", ["Gnome", "Darkvision", "Gift of the Svirfneblin", "Gnomish Magic Resistance", "Svirfneblin Camouflage"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Duergar", ["Dwarf", "Darkvision", "Duergar Magic", "Dwarven Resilience", "Psionic Fortitude"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Earth Genasi", ["Darkvision", "Earth Walk", "Merge with Stone"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Eladrin", ["Elf", "Darkvision", "Fey Ancestry", "Fey Step", "Keen Senses", "Trance"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Fairy", ["Fey", "Fairy Magic", "Flight"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Firbolg", ["Firbolg Magic", "Hidden Step", "Powerful Build", "Speech of Beast and Leaf"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Fire Genasi", ["Darkvision", "Fire Resistance", "Reach to the Blaze"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Githyanki", ["Astral Knowledge", "Githyanki Psionics", "Psychic Resilience"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Githzerai", ["Githzerai Psionics", "Mental Discipline", "Psychic Resilience"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Goblin", ["Goblinoid", "Darkvision", "Fey Ancestry", "Fury of the Small", "Nimble Escape"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Harengon", ["Hare-Trigger", "Leporine Senses", "Lucky Footwork", "Rabbit Hop"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Hobgoblin", ["Goblinoid", "Darkvision", "Fey Ancestry", "Fey Gift", "Fortune from the Many"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Kenku", ["Expert Duplication", "Kenku Recall", "Mimicry"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Kobold", ["Darkvision", "Draconic Cry", "Kobold Legacy"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Lizardfolk", ["Bite", "Hold Breath", "Hungry Jaws", "Natural Armor", "Nature's Intuition"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Minotaur", ["Horns", "Goring Rush", "Hammering Horns", "Labyrinthine Recall"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Satyr", ["Fey", "Ram", "Magic Resistance", "Mirthful Leaps", "Reveler"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Sea Elf", ["Elf", "Child of the Sea", "Darkvision", "Fey Ancestry", "Friend of the Sea", "Keen Senses", "Trance"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Shadar-kai", ["Elf", "Blessing of the Raven Queen", "Darkvision", "Fey Ancestry", "Keen Senses", "Necrotic Resistance", "Trance"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Tabaxi", ["Cat's Claws", "Cat's Talents", "Darkvision", "Feline Agility"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Tortle", ["Claws", "Hold Breath", "Natural Armor", "Nature's Intuition", "Shell Defense"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Triton", ["Amphibious", "Control Air and Water", "Darkvision", "Emissary of the Sea", "Guardian of the Depths"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Water Genasi", ["Acid Resistance", "Amphibious", "Call to the Wave", "Darkvision"]],
  ["Mordenkainen Presents: Monsters of the Multiverse", "Yuan-ti", ["Darkvision", "Magic Resistance", "Poison Resilience", "Serpentine Spellcasting"]],
  // Mythic Odysseys of Theros
  ["Mythic Odysseys of Theros", "Leonin", ["Darkvision", "Claws", "Hunter's Instincts", "Daunting Roar"]],
  // Spelljammer: Adventures in Space
  ["Spelljammer: Adventures in Space", "Astral Elf", ["Elf", "Astral Fire", "Darkvision", "Fey Ancestry", "Keen Senses", "Starlight Step", "Astral Trance"]],
  ["Spelljammer: Adventures in Space", "Autognome", ["Construct", "Armored Casing", "Built for Success", "Healing Machine", "Mechanical Nature", "Sentry's Rest", "Specialized Design"]],
  ["Spelljammer: Adventures in Space", "Giff", ["Astral Spark", "Firearms Mastery", "Hippo Build"]],
  ["Spelljammer: Adventures in Space", "Hadozee", ["Dexterous Feet", "Glide", "Hadozee Dodge"]],
  ["Spelljammer: Adventures in Space", "Plasmoid", ["Ooze", "Amorphous", "Darkvision", "Hold Breath", "Natural Resilience", "Shape Self"]],
  ["Spelljammer: Adventures in Space", "Thri-kreen", ["Monstrosity", "Chameleon Carapace", "Darkvision", "Secondary Arms", "Sleepless", "Thri-kreen Telepathy"]],
  // Strixhaven: A Curriculum of Chaos
  ["Strixhaven: A Curriculum of Chaos", "Owlin", ["Darkvision", "Flight", "Silent Feathers"]],
  // Sword Coast Adventurer's Guide
  ["Sword Coast Adventurer's Guide", "Feral Tiefling", ["Darkvision", "Hellish Resistance", "Infernal Legacy"]],
  // Locathah Rising
  ["Locathah Rising", "Locathah", ["Natural Armor", "Observant & Athletic", "Leviathan Will", "Limited Amphibiousness"]],
  // One Grung Above
  ["One Grung Above", "Grung", ["Arboreal Alertness", "Amphibious", "Poison Immunity", "Poisonous Skin", "Standing Leap", "Water Dependency"]],
  // Book of Ebon Tides
  ["Book of Ebon Tides", "Darakhul", ["Darkvision", "Hunger for Flesh", "Imperfect Undeath", "Powerful Jaw", "Undead Vitality"]],
  ["Book of Ebon Tides", "Erina", ["Darkvision", "Hardy", "Spines", "Keen Senses", "Digger"]],
  ["Book of Ebon Tides", "Quickstep", ["Darkvision", "Fey Ancestry", "Nimble", "Startling Speed"]],
  ["Book of Ebon Tides", "Ratatosk", ["Darkvision", "Grounded Celestial", "Sharp Tusks", "Telepathic"]],
  ["Book of Ebon Tides", "Ravenfolk", ["Sudden Attack", "Mimicry", "Trickster"]],
  ["Book of Ebon Tides", "Satarre", ["Darkvision", "A Friend to Death", "Keeper of Secrets", "Carrier of Rot"]],
  ["Book of Ebon Tides", "Shade", ["Ghostly Flesh", "Imperfect Undeath", "Life Drain", "Spectral Resilience", "Living Origin"]],
  ["Book of Ebon Tides", "Shadow Goblin", ["Darkvision", "Quick Wit", "Shadow Camouflage", "Stink Eye", "Sunlight Sensitivity", "Unseelie Blessing"]],
  ["Book of Ebon Tides", "Umbral Human", ["Darkvision", "Dark Infusion", "Fade Away"]],
  // D&D Beyond Drops
  ["D&D Beyond Drops", "Duskling", ["Fey", "Darkvision", "Enhanced Jump", "Inner Magic"]],
  // Dr Dhrolin's Dictionary of Dinosaurs
  ["Dr Dhrolin's Dictionary of Dinosaurs", "Ankylier", ["Musclebound", "Clubbed Tail", "Metalworker", "Osteoderms"]],
  ["Dr Dhrolin's Dictionary of Dinosaurs", "Jeholrak", ["Power of Persuasion", "Cutthroat Society", "Subdue Beast"]],
  ["Dr Dhrolin's Dictionary of Dinosaurs", "Limukin", ["Hunter-Gatherer", "Envenomed Weapon", "Watcher's Eyes", "Innate Toxicology"]],
  ["Dr Dhrolin's Dictionary of Dinosaurs", "Pluvenn", ["Razormaw", "Grappleclaws", "Nocturnal/Diurnal", "Pneumatised and Feathered"]],
  ["Dr Dhrolin's Dictionary of Dinosaurs", "The Children of Seth", ["Flight", "Global Migrators", "Verbal Culture", "Well-Travelled"]],
  ["Dr Dhrolin's Dictionary of Dinosaurs", "The Manyhorn", ["Musclebound", "Guild Connections", "Head Crest", "Horned Repose"]],
  // Frontiers of Eberron: Quickstone
  ["Frontiers of Eberron: Quickstone", "Gargoyle", ["Darkvision", "Elemental Resilience", "False Appearance", "Immutable Form", "Sentry's Rest", "Stoneskin", "Tireless"]],
  ["Frontiers of Eberron: Quickstone", "Gnoll", ["Darkvision", "Bite", "Hunter's Senses", "Rampage"]],
  ["Frontiers of Eberron: Quickstone", "Harpy", ["Flight", "Songbird", "Harpy's Charms", "Shadow's Magic"]],
  ["Frontiers of Eberron: Quickstone", "Medusa", ["Darkvision", "Fearsome Presence", "Serpentine", "Petrifying Gaze", "Medusa's Gift"]],
  ["Frontiers of Eberron: Quickstone", "Tiefling (Frontiers of Eberron)", ["Darkvision", "Fiendish Legacy", "Otherworldly Presence"]],
  ["Frontiers of Eberron: Quickstone", "Worg", ["Darkvision", "Keen Senses", "Bite", "For the Pack", "Natural Armor", "Quadruped"]],
  // Grim Hollow: Player's Guide
  ["Grim Hollow: Player's Guide", "Accursed", []],
  ["Grim Hollow: Player's Guide", "Arisen", ["Magical Fortification", "Tenacious", "Toughness", "Artificial Form", "Inured to the Elements", "Embrace the Past", "Magical Insight", "Unnatural Healer"]],
  ["Grim Hollow: Player's Guide", "Disembodied", ["Magical Fortification", "Master of Distraction", "Out of Phase", "Ethereal Fade", "Inured to the Elements", "Magical Insight", "Magical Savant (Feather Fall)", "Magical Savvy (Dancing Lights)"]],
  ["Grim Hollow: Player's Guide", "Downcast", ["Divine Sangromancy", "Touch of Life", "Inured to the Elements", "Meditative Rest", "Tireless", "Magical Savant (Cleric spells only)", "Magical Savvy (Thaumaturgy)", "Moved by Faith"]],
  ["Grim Hollow: Player's Guide", "Dreamer", ["Quick Initiative", "Stalwart Reserves", "Darkvision", "Helping Hand", "Power Nap", "Dreamwalking", "Improviser", "Inborn Perception"]],
  ["Grim Hollow: Player's Guide", "Grudgel", ["Battlefield Control", "Centered", "Darkvision", "Powerful Build", "Tireless", "Artisanal Focus", "Impromptu Artisan", "Magical Savvy (any cantrip)"]],
  ["Grim Hollow: Player's Guide", "Laneshi", ["Awakened Mind", "Psychic Spirit", "Amphibious", "Darkvision", "Swimmer", "Animal Friend", "Magical Savvy", "Nature's Voice"]],
  ["Grim Hollow: Player's Guide", "Ogresh", ["Enemy in Motion", "Focused Mind", "Environmental Awareness", "Natural Movement", "Powerful Build", "Calculating Listener", "Commanding Insight", "Persuasive Knack"]],
  ["Grim Hollow: Player's Guide", "Wechselkind", ["Creature Cover", "Magical Fortification", "Artificial Form", "Helping Hand", "Pass Through", "Magical Savant (Disguise Self)", "Magical Savvy (Minor Illusion)", "Intuitive Acrobat"]],
  ["Grim Hollow: Player's Guide", "Wulven", ["Hunter's Instinct", "Natural Attack (Claws)", "Pack Hunter", "Burst of Speed", "Climber", "Athlete's Spirit", "Inborn Perception", "Nature's Voice"]],
  // Heliana's Guide to Monster Hunting: Part 1
  ["Heliana's Guide to Monster Hunting: Part 1", "Cnidaran", ["Swim Speed", "Amphibious", "Nematocyst/Shimmerskin Species Option"]],
  ["Heliana's Guide to Monster Hunting: Part 1", "Cyclopian", ["Darkvision", "Knowledge Seeker", "Savant of Secrets", "Thought for Food", "Top Shelf"]],
  ["Heliana's Guide to Monster Hunting: Part 1", "Gobboc", ["Coward's Creed", "Feathered", "Gallus Domesticus", "Headless Chicken"]],
  ["Heliana's Guide to Monster Hunting: Part 1", "Golynn", ["Natural Armour", "Powerful Build", "Shovel Talons", "Drill Dervish", "Tremorsense"]],
  ["Heliana's Guide to Monster Hunting: Part 1", "Rakin", ["Darkvision", "Climb Speed", "Posskin/Tanukin/Urkin Species Options"]],
  // Heliana's Guide to Monster Hunting: Part 2
  ["Heliana's Guide to Monster Hunting: Part 2", "Lotol", ["Oblivious", "Slippery Skin", "Adaptive Polymorphism"]],
  ["Heliana's Guide to Monster Hunting: Part 2", "Mycelian", ["Symbiotic Assimilation", "Spore Spray", "Insporeation"]],
  ["Heliana's Guide to Monster Hunting: Part 2", "Ombrask", ["Darkvision", "Fade Away", "Lightbender", "Trackless", "Voice Thief"]],
  ["Heliana's Guide to Monster Hunting: Part 2", "Oozekin", ["Darkvision", "Acidic Flesh", "Reshapeable"]],
  ["Heliana's Guide to Monster Hunting: Part 2", "Opteran", ["Metamorphosis"]],
  // Humblewood Campaign Setting
  ["Humblewood Campaign Setting", "Cervan", ["Practical", "Surge of Vigor"]],
  ["Humblewood Campaign Setting", "Corvum", ["Glide", "Talons", "Learned", "Appraising Eye"]],
  ["Humblewood Campaign Setting", "Gallus", ["Glide", "Wing Flap", "Communal", "Militia Training", "Of the People"]],
  ["Humblewood Campaign Setting", "Hedge", ["Natural Burrowers", "Spiny Quills", "Curl Up", "Forest Magic", "Speak With Bugs"]],
  ["Humblewood Campaign Setting", "Jerbeen", ["Standing Leap", "Nimbleness", "Take Heart", "Team Tactics"]],
  ["Humblewood Campaign Setting", "Luma", ["Glide", "Wing Flap", "Touched", "Fated"]],
  ["Humblewood Campaign Setting", "Mapach", ["Darkvision", "Expert Climbers", "Resilience", "Scroungecraft", "Skulker"]],
  ["Humblewood Campaign Setting", "Raptor", ["Glide", "Talons", "Keen Senses", "Woodland Hunter", "Hunter's Training"]],
  ["Humblewood Campaign Setting", "Strig", ["Glide", "Talons", "Darkvision", "Patterned Feathers"]],
  ["Humblewood Campaign Setting", "Vulpin", ["Darkvision", "Bite", "Evasive", "Bewitching Guile"]],
  // Northlands Worldbook
  ["Northlands Worldbook", "Alfar (Hidden Elf)", ["Darkvision", "Elven Lineage", "Fey Ancestry", "Keen Senses", "Trance"]],
  ["Northlands Worldbook", "Baugsmidr Dwarf", ["Arcane Lore", "Darkvision", "Dwarven Resilience", "Magical Crafter", "Sense Magic"]],
  ["Northlands Worldbook", "Bearfolk", ["Apex Predator", "Wild Heart", "Thick Coat"]],
  ["Northlands Worldbook", "Beastkin", ["Animal Instinct", "Natural Weapons", "Natural Adaptation"]],
  ["Northlands Worldbook", "Fjord Dwarf", ["Darkvision", "Dwarven Toughness", "Fjord Warrior", "Wavecunning"]],
  ["Northlands Worldbook", "Giantkin", ["Catch and Throw", "Powerful Build", "Giantkin Ancestry"]],
  ["Northlands Worldbook", "Ice Elf", ["Darkvision", "Elven Lineage", "Fey Ancestry", "Keen Senses", "Trance"]],
  ["Northlands Worldbook", "Trollkin", ["Darkvision", "Natural Adaptation", "Natural Weapon", "Trollish Regeneration"]],
  ["Northlands Worldbook", "Werekin", ["Darkvision", "Predatory Prowess", "Scent", "Shift Aspect"]],
  // Obojima: Tales from the Tall Grass
  ["Obojima: Tales from the Tall Grass", "Dara", ["Awakened Skills", "Create Talisman", "Sacred Revelation", "Impart Knowledge"]],
  ["Obojima: Tales from the Tall Grass", "Nakudama", ["Swim Speed", "Amphibious", "Standing Leap", "Grasping Tongue", "Latching Tongue"]],
  // One-Shot Wonders: Holiday Adventure Pack
  ["One-Shot Wonders: Holiday Adventure Pack", "Canisar", ["Darkvision", "Hind Leg Dash", "Fanged Jaws", "Hunter Gatherer", "Ancestral Blessing"]],
  ["One-Shot Wonders: Holiday Adventure Pack", "Hederan", ["Darkvision", "Outdoor Adept", "Protected by Nature", "Friend of Fauna"]],
  ["One-Shot Wonders: Holiday Adventure Pack", "Snowborn", ["Chilled Anatomy", "Compacted Snow", "Frigid Construct"]],
  ["One-Shot Wonders: Holiday Adventure Pack", "Tarandus", ["Guiding Light", "Antler Defence", "Hooves", "Born to Navigate"]],
  // Steinhardt's Guide to the Eldritch Hunt Player Pack
  ["Steinhardt's Guide to the Eldritch Hunt Player Pack", "Manikin", ["Born to Serve", "Electric Heart", "Integrated Gold Plating", "Living Material", "Service Model"]],
  ["Steinhardt's Guide to the Eldritch Hunt Player Pack", "Scourgeborne", ["Born of Madness", "Eldritch Curse", "Feral Limbs", "Monstrous Lineage"]],
  // The Crooked Moon Part One: Player Options & Campaign Setting
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Ashborn", ["Ashen Legacy", "Darkvision", "Fiendish Fortune", "Scorpion Sting"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Azureborn", ["Azure Legacy", "Darkvision", "Glimpse Fate", "Winds of Magic"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Bogborn", ["Bog Bulk", "Darkvision", "Guiding Bond", "Keen Senses", "Regeneration"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Curseborn", ["Cursed Claws", "Darkvision", "Grey Balance", "Lupine Sense"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Deepborn", ["Amphibious", "Darkvision", "Eldritch Gibbering", "Endless Hunger"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Gnarlborn", ["Deep Roots", "Elderwood Whispers", "Grasping Branches", "Root Sense", "Towering Size"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Graveborn", ["Darkvision", "Devour Corpse", "Frozen Waste", "Infused Drakkonite"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Harvestborn", ["Culling", "Gift of the Green", "Jack-O-Lantern", "Scarecrow Nature", "Watchful Rest"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Plagueborn", ["Born in Filth", "Darkvision", "Infected Cunning", "Plague Bearer"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Relicborn", ["Dance of Death", "Eternal Party", "Moment of Remembrance", "Soul of Revelry"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Silkborn", ["Bejeweled Carapace", "Darkvision", "Silken Legacy", "Spider Climb"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Stoneborn", ["Argent Gleam", "Silver Bulwark", "Watchful Senses"]],
  ["The Crooked Moon Part One: Player Options & Campaign Setting", "Threadborn", ["Ball-jointed", "Innocent Mind", "Sewn Nature", "Soothing Heart", "You've Got a Friend"]],
  // The Field Guide to Floral Dragons
  ["The Field Guide to Floral Dragons", "Floral Dragonborn", ["Floral Legacy", "Floral Breath Weapon", "Floral Fortitude", "Draconic Blossoming"]],
  // The Griffon's Saddlebag: Book One
  ["The Griffon's Saddlebag: Book One", "Feathren", ["Darkvision", "Feathren Ancestry", "Kindred Speech", "Natural Creator", "Talons"]],
  // The Griffon's Saddlebag: Book Two
  ["The Griffon's Saddlebag: Book Two", "Etherean", ["Darkvision", "Misty Sight", "Veil Shift"]],
  ["The Griffon's Saddlebag: Book Two", "Geleton", ["Darkvision", "Limited Blindsight", "Symbiotic Fortitude", "Wakeful"]],
  // The Lord of the Rings Roleplaying
  ["The Lord of the Rings Roleplaying", "Barding", ["Archers of Dale", "Starting Virtue", "Trading People"]],
  ["The Lord of the Rings Roleplaying", "Hobbit", ["Hobbit Elusiveness", "Hobbit-sense", "Pipe-weed Lore", "Unobtrusive"]],
  ["The Lord of the Rings Roleplaying", "Man of Bree", ["Pipe-weed Lore", "See Through a Brick Wall in Time", "Starting Virtue"]],
  ["The Lord of the Rings Roleplaying", "Ranger of the North", ["Wandering Folk"]],
  // Valda's Spire of Secrets: Player Pack
  ["Valda's Spire of Secrets: Player Pack", "Geppettin", ["Darkvision", "Construct Nature", "Handcrafted Quality", "Gepettin Construction"]],
  ["Valda's Spire of Secrets: Player Pack", "Mandrake", ["Plant Nature", "Natural Connection", "Root Magic", "Entangling Vines"]],
];
for (const [book, name, traits] of listed) DND.species.push(brief(book, name, traits, ALIASES[name] ? { aliases: ALIASES[name] } : {}));
})();
