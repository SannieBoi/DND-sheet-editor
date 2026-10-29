/* A few lines about each class, background and species (the info that drops down from a card's ▾ button in the sheet maker
   and on Level 1): what it is and how it plays. Sets `summary` on DND.classes.<key>, DND.backgrounds[] and DND.species[]
   (subclasses and feats have their own `summary`, in their files). Loads after every class, background and species file.
   Our own words, never book text. Third-party species (names only, `brief`) have none: we don't know them well enough to
   describe them. */
(() => {
'use strict';
const D = window.DND;

const CLASSES = {
  barbarian: 'A fierce warrior fuelled by primal rage. Raging makes you hit harder and shrug off blows, so you lead the charge: the most Hit Points, big weapons, no spells. Easy to play.',
  bard: 'A performer whose music and words weave magic. Inspires and heals the party, charms or confuses enemies and is good at almost every skill. Casts spells with Charisma.',
  cleric: 'A priest who draws divine power from a god or a sacred cause. The group\'s healer and protector, armored enough to stand in the front line. Casts spells with Wisdom.',
  druid: 'A keeper of nature\'s old magic who can take the shape of animals (Wild Shape). Casts spells of healing, weather, plants and beasts with Wisdom.',
  fighter: 'A master of weapons and armor, trained for every kind of battle. Attacks more often than anyone else, with a Fighting Style and Weapon Masteries. Simple to play and strong at every level.',
  monk: 'A martial artist who turns inner energy (Focus) into flurries of blows, great speed and uncanny defenses. Fights unarmed and without armor; quick and hard to pin down.',
  paladin: 'A holy warrior bound by a sacred oath. Heavy armor, punishing weapon hits with Divine Smite, healing with Lay On Hands and an aura that protects allies. Casts spells with Charisma.',
  ranger: 'A hunter and scout of the wilds. Fights with bow or blade, marks its prey with Hunter\'s Mark, tracks and explores like no one else, and casts nature spells with Wisdom.',
  rogue: 'A scoundrel who relies on stealth, skill and precision. Deals big damage with Sneak Attack, has the most skills and Expertise, and slips in and out of danger with Cunning Action.',
  sorcerer: 'A spellcaster whose magic is inborn: a bloodline, a gift or a strange event. Knows fewer spells than a wizard but bends them with Metamagic. Casts spells with Charisma.',
  warlock: 'A seeker of hidden power who made a pact with an otherworldly patron. Eldritch Invocations shape the class; few spell slots, but they all come back on a Short Rest. Casts spells with Charisma.',
  wizard: 'A scholar of arcane magic who keeps spells in a spellbook. The widest choice of spells, prepared each day, but fragile in a fight. Casts spells with Intelligence.',
  artificer: 'An inventor who channels magic through tools and the things they make. Crafts magic items and supports the party with clever spells and gadgets. Casts spells with Intelligence.',
  bloodhunter: 'A monster hunter who turns their own blood into a weapon (Hemocraft). Coats weapons in Crimson Rites and hexes foes with Blood Curses, paying in Hit Points. Hemocraft uses Intelligence.'
};

const BACKGROUNDS = {
  Acolyte: 'You served in a temple, tending its rites and studying its faith. A natural start for clerics, paladins and anyone with a holy calling.',
  Artisan: 'You learned a craft in a workshop: making goods, judging their quality and haggling over their price.',
  Charlatan: 'You made a living from lies and tricks: forged papers, false names and deals too good to be true.',
  Criminal: 'You lived outside the law, picking pockets, breaking into houses or running jobs for a gang.',
  Entertainer: 'You grew up performing on stages and street corners, singing, dancing or tumbling for coin and applause.',
  Farmer: 'You grew up working the land, tending crops and animals through hard seasons. Tough and practical.',
  Guard: 'You stood watch on a city wall or at a lord\'s gate, trained to spot trouble before it starts.',
  Guide: 'You led travellers through wild country, living off the land and reading the trail and the weather.',
  Hermit: 'You lived apart from the world in a hut or a cave, with time to think, pray, heal and study nature.',
  Merchant: 'You bought and sold goods in a shop or along trade routes, and know what everything is worth.',
  Noble: 'You were raised in a family of wealth and influence, with servants, duties and a name to live up to.',
  Sage: 'You spent your youth among books and scrolls in libraries and schools, chasing knowledge and lore.',
  Sailor: 'You lived at sea, hauling ropes, weathering storms and swapping tales in harbor taverns.',
  Scribe: 'You copied books and wrote documents in a scriptorium or an office, trained to notice every detail.',
  Soldier: 'You trained for war from a young age and served in an army or a mercenary company.',
  Wayfarer: 'You grew up poor on the streets, getting by on your wits, your luck and a few loyal friends.'
};

const SPECIES = {
  // the free rules and the Player's Handbook
  Dragonborn: 'Proud folk descended from dragons, with scaly skin and the breath weapon of their dragon ancestor. They resist its element and, from level 5, can call up spectral wings.',
  Dwarf: 'Short, sturdy folk shaped by mountains and deep mines. Hardy against poison, a few more Hit Points every level, and they see far in the dark and sense through stone.',
  Elf: 'Graceful, long-lived people touched by the magic of the Feywild. They trance instead of sleeping, resist charms and follow a lineage (drow, high elf or wood elf) with its own magic.',
  Gnome: 'Small, curious and inventive folk with a knack for magic and tinkering. Their sharp minds resist spells that test INT, WIS or CHA; a forest or rock gnome lineage adds magic.',
  Goliath: 'Towering people descended from giants. Strong and enduring, they carry a boon from their giant ancestry and, from level 5, can grow to Large size for a while.',
  Halfling: 'Small, cheerful folk who love home and comfort but are braver and luckier than their size suggests. Nimble and stealthy, and they reroll natural 1s.',
  Human: 'The most widespread and adaptable people of the worlds. A skill and an Origin feat of your choice, and Heroic Inspiration after every Long Rest.',
  Orc: 'Tall, powerful people known for their endurance and drive. They can surge forward in a rush of adrenaline, see far in the dark and refuse to fall when struck down.',
  Tiefling: 'People marked by a fiendish heritage, often with horns and a tail. Their legacy (Abyssal, Chthonic or Infernal) brings a damage resistance and spells.',
  Aasimar: 'Mortals who carry a spark of the Upper Planes inside them. They heal with a touch and, from level 3, can reveal a celestial form for a minute.',
  // Eberron: Forge of the Artificer
  Changeling: 'Shapeshifters who change their face and voice at will and live among other peoples under many guises. Skilled at reading people and fooling them.',
  Kalashtar: 'People bonded to spirits from the plane of dreams. Their dual minds resist mental attacks, they speak telepathically and normal dreams can\'t reach them.',
  Khoravar: 'Eberron\'s half-elves, a people of their own with roots in both humans and elves. Fey-touched, hard to put to sleep and quick to pick up new skills.',
  Shifter: 'Descendants of people touched by lycanthropy who can let their inner beast out for a minute: tougher hide, fangs, speed or keen senses.',
  Warforged: 'Living constructs built as soldiers for the Last War, now looking for a purpose of their own. Armored bodies (+1 AC); they don\'t sleep and shrug off hunger, thirst and suffocation.',
  // Lorwyn: First Light
  Boggart: 'Small, mischievous goblin-folk of Lorwyn, always chasing new sensations. Scrappy fighters who hit bigger foes harder and slip away in a blink.',
  Faerie: 'Small winged fey of Lorwyn (and of darker Shadowmoor), quick and mischievous. They fly and know a little nature magic.',
  Flamekin: 'Beings of living flame from Lorwyn, restless seekers of passion and purpose. They resist fire and call it up as spells.',
  'Lorwyn Changeling': 'Fey shapeshifters of Lorwyn who reshape their bodies between a two-legged and a four-legged form. Delightful mimics who move before anyone expects it.',
  'Lorwyn-Shadowmoor Elf': 'Elves of Lorwyn, devoted to beauty, and of Shadowmoor, its shadowy mirror. They trance and resist charms like other elves; their lineage brings its own magic.',
  Rimekin: 'Elemental beings of cold fire from Lorwyn. They resist cold and wield frost magic, even a blade of icy flame.',
  // Ravenloft: The Horrors Within
  Dhampir: 'Half-living, half-undead people with a vampire\'s hunger. They climb like spiders, resist necrotic damage and draw strength from their bite.',
  Hexblood: 'People changed by a hag\'s magic into fey. They make eerie tokens to send messages and spy through, and cast Disguise Self and Hex.',
  Lupin: 'Wolfish people with a werewolf\'s instincts. Their claws pounce and shove, and their howl unsettles their enemies.',
  Reborn: 'People who died and came back, through magic, science or a dark bargain. They don\'t sleep, resist the pull of death and recall fragments of past lives.',
  // D&D Beyond Drops
  Duskling: 'Fey folk with an inner magic they can shift between courage, speed and vigor. Great jumpers who see in the dark.',
  // Basic Rules (2014)
  'Half-Elf': 'Children of humans and elves, at home in both worlds and fully in neither. Versatile and skilled, with a touch of fey blood.',
  'Half-Orc': 'Children of humans and orcs, strong and fierce. They shrug off a killing blow once a day and hit extra hard with critical hits.',
  // Acquisitions Incorporated
  Verdan: 'Green-skinned, ever-changing people who grow larger as they age (Medium from level 5). Persuasive and telepathic, and their black blood heals them quickly.',
  // Dragonlance
  Kender: 'Small, fearless folk of Krynn, endlessly curious and quick to pick up handy skills. Their taunts goad enemies into mistakes.',
  // Guildmasters' Guide to Ravnica
  Loxodon: 'Elephant-like people of Ravnica: calm, patient and wise. Thick skin (natural armor), a nimble trunk and a keen sense of smell.',
  'Simic Hybrid': 'People reshaped by Ravnica\'s Simic Combine with animal grafts: gliding membranes, climbing claws or gills, and later grasping appendages, a carapace or acid spit.',
  Vedalken: 'Blue-skinned, rational people of Ravnica who strive to perfect everything. Calm minds resist magic on INT, WIS and CHA saves; precise and skilled.',
  // Monsters of the Multiverse
  Aarakocra: 'Bird-folk from the Elemental Plane of Air with feathered wings and sharp talons. They fly from level 1 and can call up a gust of wind.',
  'Air Genasi': 'People descended from the genies of the Elemental Plane of Air. Their breath never runs out, and they wield a little wind and lightning magic.',
  Bugbear: 'Big, long-armed goblinoids who move with surprising stealth. Their long limbs reach farther, and they strike hard at foes caught off guard.',
  Centaur: 'Fey with a humanoid torso on a horse\'s body, strong runners at home in the wild. They charge to trample and kick with their hooves.',
  'Deep Gnome': 'Gnomes of the Underdark, quiet and wary. They blend into stone, see far in the dark and cast Disguise Self and Nondetection.',
  Duergar: 'Grim dwarves of the Underdark, hardened by long captivity under mind flayers. They resist poison and mind magic, and can grow larger or turn invisible.',
  'Earth Genasi': 'People descended from the genies of the Elemental Plane of Earth. They stride over rough ground, harden their skin like stone and cast earth magic.',
  Eladrin: 'Elves of the Feywild whose mood follows the seasons. They teleport a short way (Fey Step) with an extra effect of their season.',
  Fairy: 'Small winged fey from the Feywild, full of mischief and wonder. They fly and know a few nature spells.',
  Firbolg: 'Gentle giant-kin who quietly guard the forests. They speak with beasts and plants, turn invisible for a moment and cast Detect Magic and Disguise Self.',
  'Fire Genasi': 'People descended from the genies of the Elemental Plane of Fire, with skin that glows like embers. They resist fire and wield flame magic.',
  Githyanki: 'Warrior people of the Astral Plane who raid from silver ships. They resist psychic damage, learn skills quickly and cast Mage Hand, Jump and Misty Step.',
  Githzerai: 'Monastic people who order the chaos of Limbo with discipline. Strong mental defenses, and they cast Mage Hand, Shield and Detect Thoughts.',
  Goblin: 'Small, scrappy goblinoids with fey blood. They hit bigger enemies harder and dart away with a quick Disengage or Hide.',
  Harengon: 'Rabbit-folk from the Feywild, quick on their feet and always ready. They add their Proficiency Bonus to Initiative and hop away in a burst.',
  Hobgoblin: 'Disciplined goblinoids with fey blood who thrive in groups. They help allies easily, and the help of others turns their failures into success.',
  Kenku: 'Feathered, flightless bird-folk who can mimic any sound they hear. Their perfect recall lets them make skill checks with Advantage.',
  Kobold: 'Small, dragon-blooded reptilian folk, clever and tenacious. Their Draconic Cry gives allies an edge, and their legacy grants craftiness, defiance or magic.',
  Lizardfolk: 'Cold-blooded reptilian people with a practical, alien outlook. Natural armor, a bite, long breath-holding and hungry jaws that heal them.',
  Minotaur: 'Bull-headed people of great strength. They gore with their horns, charge to knock enemies back and never lose their way.',
  Satyr: 'Goat-legged fey revelers who love music and mischief. They resist magic, leap far and butt enemies with their horns.',
  'Sea Elf': 'Elves who made the oceans their home. They swim, breathe water and speak with sea creatures.',
  'Shadar-kai': 'Elves bound to the Shadowfell, their joy faded to gray. They resist necrotic damage and blink through the shadows.',
  Tabaxi: 'Cat-folk driven by curiosity, roaming the world for stories and treasures. Claws for climbing and fighting, keen senses and bursts of feline speed.',
  Tortle: 'Turtle-folk who carry their home on their back. Their shell gives AC 17 (they can\'t wear armor), and they can withdraw into it for protection.',
  Triton: 'Guardians of the ocean depths who breathe water, resist cold and wield a little sea and storm magic.',
  'Water Genasi': 'People descended from the genies of the Elemental Plane of Water. They swim, breathe water, resist acid and wield water magic.',
  'Yuan-ti': 'Serpent-blooded people with a snake\'s resilience. They resist poison and magic, and cast Poison Spray, Animal Friendship and Suggestion.',
  // Mythic Odysseys of Theros
  Leonin: 'Lion-like people of the plains of Theros, proud and fierce. Claws, a daunting roar and a quick hunter\'s run.',
  // Spelljammer
  'Astral Elf': 'Elves who live in the Astral Sea and carry its starlight inside them. Starlight magic, a short teleport and a trance that teaches a new skill.',
  Autognome: 'Mechanical gnomes built by rock gnomes, now making their own way. An armored casing (AC 13 + DEX), and they don\'t eat, drink, breathe or sleep.',
  Giff: 'Hippo-headed people of the stars who love firearms and military pomp. Strong and sturdy, they add astral force to their hits.',
  Hadozee: 'Simian people with membranes between their limbs. They glide from heights, climb with hands and feet and dodge harm with quick reflexes.',
  Plasmoid: 'Ooze people with no fixed shape. They squeeze through narrow gaps, reach with pseudopods and resist acid and poison.',
  'Thri-kreen': 'Insect-like people with four arms and a chitin shell that changes color. Natural armor, telepathy and no need for sleep.',
  // Strixhaven
  Owlin: 'Owl-folk with feathered wings and silent flight. They see far in the dark and move without a sound.',
  // Sword Coast Adventurer's Guide
  'Feral Tiefling': 'A tiefling of the Sword Coast whose fiendish blood shows in a quick, agile build. Resists fire and casts infernal spells (Thaumaturgy, Hellish Rebuke, Darkness).',
  // Locathah Rising
  Locathah: 'Fish-folk of the seas who have long fought for their freedom. Scaly natural armor, they breathe water, and their will resists charms and fear.',
  // One Grung Above
  Grung: 'Small, poisonous frog-folk of tropical forests whose skin color marks their caste. Poisonous skin, great leaps, and they need to stay damp.'
};

for (const [key, text] of Object.entries(CLASSES)) if (D.classes[key]) D.classes[key].summary = text;
for (const b of D.backgrounds) if (BACKGROUNDS[b.name]) b.summary = BACKGROUNDS[b.name];
for (const s of D.species) if (SPECIES[s.name]) s.summary = SPECIES[s.name];
})();
