/* More species, beyond the 9 in the free rules (species.js), one per name. Same shape as species.js, plus:
   source: the book.  aliases: other names to recognise on a sheet.
   Full entries: the Aasimar (Player's Handbook 2024), the species of the 2024-era books on dnd2024.wikidot.com (Forge of
   the Artificer, Lorwyn: First Light, Ravenloft: The Horrors Within, D&D Beyond Drops) and the older official species on
   dnd5e.wikidot.com (Monsters of the Multiverse, Spelljammer, Ravnica ...), facts looked up 2026-10-28. Feature text is a
   short summary in our own words (see CREDITS.md). Older species follow the 2024 rules: their Ability Score Increase, Age,
   Alignment and Languages are left out (your background raises scores; everyone knows Common and two more languages).
   A non-Humanoid creature type (or "also counts as a goblinoid") is a trait of its own, as on D&D Beyond's list.
   Extra fields:  spells: { characterLevel: [spell names] } = always prepared from that level (level up writes them).
     features[].uses: { n: 'PB' | number, back: 'long' | 'short' } = limited uses shown on the Rest tab (from its lvl).
     features[].choice type 'ability': { from: [abilities], label } = the ability its spells or DC use (default: your
     casting ability); a choice's `more` parts may have `if: '<option name>'` (only asked when that option is picked).
     ac: natural armor { base, ability, withArmor (use it when it beats worn armor), noArmor (can't wear armor), name };
     acBonus: + AC always.  unarmed: { die, type } = the Unarmed Strike's natural weapon (roller).  riders: damage
     switches on the attack card ({ name, dice, pb (+ Proficiency Bonus), type, weapon (weapons only), melee, from,
     lineage, on, note }).  critExtraMelee: more dice on a melee weapon Critical Hit.
   brief: true = only what D&D Beyond's public species list shows (the trait names); size and speed are null when the
   list doesn't give them, and the rules are in the book. Those are third-party books (not on wikidot) and Kithkin. */
window.DND = window.DND || {};

(() => {
const brief = (source, name, traits, more = {}) => ({ name, size: null, speed: null, traits, subspecies: [], attackNotes: [],
  features: [], source, brief: true, ...more });
const full = (source, name, size, speed, features, more = {}) => ({ name, source, size, speed, traits: features.map(x => x.name),
  subspecies: [], attackNotes: [], features, ...more });
const f = (lvl, name, text, more) => ({ lvl, name, text, ...more });
const PB = { uses: { n: 'PB', back: 'long' } }, ONCE = { uses: { n: 1, back: 'long' } };
const CAST = { type: 'ability', from: ['INT', 'WIS', 'CHA'] }, DC = { ...CAST, label: 'save DC ability' };
const skills = (count, from) => ({ type: 'skills', count, from });
const options = list => ({ type: 'option', options: list.map(([name, text]) => ({ name, text })) });
const tool = (count = 1, kind = 'Tools') => ({ type: 'tools', count, kind, title: count > 1 ? `${count} tools` : 'A tool' });
const dv = (ft = 60) => f(1, 'Darkvision', `Darkvision ${ft} ft.`);
const feyAncestry = () => f(1, 'Fey Ancestry', 'Advantage on saves to avoid or end Charmed.');
const notHumanoid = type => f(1, type, `Your creature type is ${type}, not Humanoid.`);
const countsAs = (name, what) => f(1, name, `You are a Humanoid that also counts as ${what} for anything that needs one.`);
const moves = (kind, how = 'equal to your Speed') => f(1, `${kind} Speed`, `${kind} Speed ${how}.`);
const flight = () => f(1, 'Flight', 'Fly Speed equal to your Speed, but not while you wear Medium or Heavy armor.');
const natural = (name, die, type, part = name.toLowerCase()) =>
  f(1, name, `Your Unarmed Strikes can use your ${part}: 1d${die} + STR ${type} damage on a hit.`);
const trance = more => f(1, 'Trance', `You don't sleep and magic can't put you to sleep; a Long Rest takes 4 hours of trance.${more ? ' ' + more : ''}`);
const elfMemory = 'After each trance you gain two weapon or tool proficiencies of your choice until your next Long Rest.';
const keenPerception = () => f(1, 'Keen Senses', 'Proficiency in Perception.', { grants: { skills: ['Perception'] } });
const resist = (name, type) => f(1, name, `Resistance to ${type} damage.`);
const holdBreath = time => f(1, 'Hold Breath', `You can hold your breath for up to ${time}.`);
const powerfulBuild = () => f(1, 'Powerful Build', 'You count as one size larger for carrying capacity and the weight you can push, drag or lift.');
const furyOfTheSmall = () => f(1, 'Fury of the Small', 'When you damage a creature larger than you with an attack or a spell, add damage equal to your PB (once per turn). Uses = PB per Long Rest.', PB);
const nimbleEscape = () => f(1, 'Nimble Escape', 'Disengage or Hide as a Bonus Action on each of your turns.');
const teleport30 = 'Bonus Action: teleport up to 30 ft to an unoccupied space you can see. Uses = PB per Long Rest.';
const furyRider = { name: 'Fury of the Small', pb: true, note: 'the target is larger than you; once per turn' };
const REACH_TO_THE_BLAZE = 'You know Produce Flame. From character level 3 you can cast Burning Hands, and from level 5 Flame Blade (no material component), each once per Long Rest without a spell slot (or with slots).';
const blaze = { 1: ['Produce Flame'], 3: ['Burning Hands'], 5: ['Flame Blade'] };
const NATURE = ['Animal Handling', 'Medicine', 'Nature', 'Perception', 'Stealth', 'Survival'];
const HYBRID_1 = [
  ['Manta Glide', 'Ray-like fins: when you fall and aren\'t Incapacitated, take the fall as up to 100 ft shorter, and glide 2 ft sideways for every 1 ft you fall.'],
  ['Nimble Climber', 'Climb Speed equal to your Speed.'],
  ['Underwater Adaptation', 'You breathe air and water, and have a Swim Speed equal to your Speed.']];
const FOTA = 'Eberron: Forge of the Artificer', LORWYN = 'Lorwyn: First Light', RAV = 'Ravenloft: The Horrors Within',
  MOTM = 'Mordenkainen Presents: Monsters of the Multiverse', SJ = 'Spelljammer: Adventures in Space', GGR = "Guildmasters' Guide to Ravnica",
  EE = 'Exploring Eberron (2024)';

DND.species.push(
  {"name":"Aasimar","source":"Player's Handbook (2024)","size":"Medium or Small","speed":30,
   "traits":["Celestial Resistance","Darkvision (60 ft.)","Healing Hands","Light Bearer","Celestial Revelation"],"subspecies":[],
   "attackNotes":["Celestial Revelation (level 3+, while transformed): once on each of your turns, one target of your attack or spell takes extra damage equal to your Proficiency Bonus (Radiant; Necrotic with Necrotic Shroud)."],
   "traitLevels":{"Celestial Revelation":3},
   "riders":[{ name: 'Celestial Revelation', pb: true, type: 'radiant', from: 3, note: 'while transformed, once per turn (Necrotic with Necrotic Shroud)' }],
   "features":[
     {"lvl":1,"name":"Celestial Resistance","text":"Resistance to Necrotic and Radiant damage."},
     {"lvl":1,"name":"Darkvision","text":"Darkvision 60 ft."},
     {"lvl":1,"name":"Healing Hands","text":"Magic action: touch a creature, roll as many d4s as your Proficiency Bonus; it regains that many HP. Once per Long Rest.", ...ONCE},
     {"lvl":1,"name":"Light Bearer","text":"You know the Light cantrip (Charisma is its spellcasting ability).","grants":{"cantrips":["Light"]}},
     {"lvl":3,"name":"Celestial Revelation","text":"Bonus Action: transform for 1 minute, once per Long Rest. Pick each time: Heavenly Wings (Fly Speed equal to your Speed), Inner Radiance (Bright Light 10 ft; at the end of each of your turns, creatures within 10 ft take Radiant damage equal to your Proficiency Bonus) or Necrotic Shroud (creatures within 10 ft that aren't your allies make a CHA save, DC 8 + CHA modifier + Proficiency Bonus, or are Frightened of you until the end of your next turn). While transformed, once on each of your turns one target of your attack or spell takes extra damage equal to your Proficiency Bonus (Necrotic with Necrotic Shroud, else Radiant).", ...ONCE}]},

  // ---- Eberron: Forge of the Artificer (dnd2024.wikidot.com) ----
  full(FOTA, 'Changeling', 'Medium or Small', 30, [
    notHumanoid('Fey'),
    f(1, 'Changeling Instincts', 'Proficiency in two of Deception, Insight, Intimidation, Performance and Persuasion.',
      { choice: skills(2, ['Deception', 'Insight', 'Intimidation', 'Performance', 'Persuasion']) }),
    f(1, 'Shape-Shifter', 'Action: change your look and voice (coloring, hair, sex, height, weight, Medium or Small, even another playable species; your game statistics stay the same). Not someone you have never seen, and you keep your arrangement of limbs; clothes and gear don\'t change. While shape-shifted you have Advantage on CHA checks. Another action brings back your true form.')]),
  full(FOTA, 'Kalashtar', 'Medium', 30, [
    notHumanoid('Aberration'),
    f(1, 'Dual Mind', 'Advantage on WIS and CHA saving throws.'),
    resist('Mental Discipline', 'Psychic'),
    f(1, 'Mind Link', 'Telepathy out to 10 × your character level in feet. While you speak to a creature this way, a Magic action lets it answer you telepathically for 1 hour (another Magic action ends it).'),
    f(1, 'Severed from Dreams', 'The Dream spell can\'t target you. After each Long Rest you gain proficiency in one skill of your choice until your next Long Rest.')]),
  full(FOTA, 'Khoravar', 'Medium or Small', 30, [
    dv(), feyAncestry(),
    f(1, 'Fey Gift', 'You know Friends; after a Long Rest you can swap it for another Cleric, Druid or Wizard cantrip.', { choice: CAST }),
    f(1, 'Lethargy Resilience', 'When you fail a save to avoid or end Unconscious, you can succeed instead; then not again until you finish 1d4 Long Rests.'),
    f(1, 'Skill Versatility', 'Proficiency in one skill (or one tool) of your choice; you can swap it for another after a Long Rest.', { choice: skills(1, 'any') })],
    { spells: { 1: ['Friends'] }, aliases: ['Half-Elf (Eberron)'] }),
  full(FOTA, 'Shifter', 'Medium or Small', 30, [
    f(1, 'Bestial Instincts', 'Proficiency in Acrobatics, Athletics, Intimidation or Survival.', { choice: skills(1, ['Acrobatics', 'Athletics', 'Intimidation', 'Survival']) }),
    dv(),
    f(1, 'Shifting', 'Bonus Action: take a more bestial look for 1 minute (a Bonus Action ends it early) and gain Temporary HP = 2 × PB. Uses = PB per Long Rest. Each shift also gives the option you chose.', {
      ...PB, choice: options([
        ['Beasthide', '1d6 more Temporary HP when you shift, and +1 AC while shifted.'],
        ['Longtooth', 'When you shift, and as a Bonus Action on later turns while shifted, bite with an Unarmed Strike: 1d6 + STR Piercing damage on a hit.'],
        ['Swiftstride', 'Speed +10 ft while shifted, and a Reaction to move up to 10 ft (no Opportunity Attacks) when a creature ends its turn within 5 ft of you.'],
        ['Wildhunt', 'Advantage on WIS checks while shifted, and no creature within 30 ft can have Advantage on attack rolls against you unless you are Incapacitated.']]) })]),
  full(FOTA, 'Warforged', 'Medium or Small', 30, [
    notHumanoid('Construct'),
    f(1, 'Construct Resilience', 'Resistance to Poison damage; Advantage on saves to avoid or end Poisoned.'),
    f(1, 'Integrated Protection', '+1 bonus to AC, and armor you wear can\'t be removed against your will while you live.'),
    f(1, "Sentry's Rest", 'You don\'t sleep and magic can\'t put you to sleep; a Long Rest takes 6 hours of motionless inactivity, during which you look inert but stay conscious.'),
    f(1, 'Specialized Design', 'Proficiency in one skill and with one tool of your choice.', { choice: skills(1, 'any'), more: [tool()] }),
    f(1, 'Tireless', 'You don\'t gain Exhaustion from dehydration, malnutrition or suffocation.')],
    { acBonus: 1 }),

  // ---- Lorwyn: First Light (dnd2024.wikidot.com) ----
  full(LORWYN, 'Boggart', 'Small', 30, [countsAs('Goblinoid', 'a goblinoid'), dv(), feyAncestry(), furyOfTheSmall(), nimbleEscape()],
    { riders: [furyRider] }),
  full(LORWYN, 'Faerie', 'Small', 30, [
    notHumanoid('Fey'),
    f(1, 'Faerie Magic', 'You know Druidcraft. From character level 3 you can cast Faerie Fire, and from level 5 Enlarge/Reduce, each once per Long Rest without a spell slot (or with slots).', { choice: CAST }),
    flight(),
    f(1, 'Shadowmoor Faerie', 'Faeries from Shadowmoor also have Darkvision 120 ft.')],
    { spells: { 1: ['Druidcraft'], 3: ['Faerie Fire'], 5: ['Enlarge/Reduce'] } }),
  full(LORWYN, 'Flamekin', 'Medium or Small', 30, [dv(), resist('Fire Resistance', 'Fire'), f(1, 'Reach to the Blaze', REACH_TO_THE_BLAZE, { choice: CAST })],
    { spells: blaze }),
  full(LORWYN, 'Lorwyn Changeling', 'Medium or Small', 30, [
    notHumanoid('Fey'),
    f(1, 'Shape Self', 'Action: reshape your body into a two-legged Humanoid shape or a four-legged Beast shape; in Humanoid shape you can wear clothing and armor made for your size.'),
    dv(120),
    f(1, 'Delightful Imitator', 'Proficiency in Deception or Performance.', { choice: skills(1, ['Deception', 'Performance']) }),
    f(1, 'Unpredictable Movement', 'When you roll Initiative without Disadvantage, you can move up to half your Speed right away.')]),
  {"name":"Lorwyn-Shadowmoor Elf","source":LORWYN,"aliases":["Shadowmoor Elf","Lorwyn Elf"],"size":"Medium","speed":30,
   "traits":["Darkvision","Elven Lineage","Fey Ancestry","Keen Senses","Trance"],
   "subspecies":[{"name":"Elven Lineage: Lorwyn Elf","traits":[{"name":"Thorn Whip","lvl":1},{"name":"Command","lvl":3},{"name":"Silence","lvl":5}]},
     {"name":"Elven Lineage: Shadowmoor Elf","traits":[{"name":"Darkvision (120 ft.)","lvl":1},{"name":"Starry Wisp","lvl":1},{"name":"Heroism","lvl":3},{"name":"Gentle Repose","lvl":5}]}],
   "attackNotes":[],
   "features":[dv(),
     f(1, 'Elven Lineage', 'Choose Lorwyn Elf (Thorn Whip, swappable for another Druid cantrip after a Long Rest; Command at 3, Silence at 5) or Shadowmoor Elf (Darkvision 120 ft, Starry Wisp; Heroism at 3, Gentle Repose at 5). INT, WIS or CHA is the spellcasting ability (chosen with the lineage). Level 3 and 5 spells are always prepared and castable once per Long Rest without a slot (or with slots).',
       { choice: { type: 'lineage', ability: ['INT', 'WIS', 'CHA'] } }),
     feyAncestry(),
     f(1, 'Keen Senses', 'Proficiency in Insight, Perception or Survival.', { choice: skills(1, ['Insight', 'Perception', 'Survival']) }),
     trance()]},
  full(LORWYN, 'Rimekin', 'Medium or Small', 30, [
    f(1, 'Cold Fire Magic', 'You know Ray of Frost, and learn Ice Knife at character level 3 and Flame Blade at 5: always prepared, each once per Long Rest without a spell slot (or with slots). Your Flame Blade deals Cold damage instead of Fire.', { choice: CAST }),
    resist('Cold Resistance', 'Cold'), dv()],
    { spells: { 1: ['Ray of Frost'], 3: ['Ice Knife'], 5: ['Flame Blade'] } }),

  // ---- Ravenloft: The Horrors Within (dnd2024.wikidot.com) ----
  full(RAV, 'Dhampir', 'Medium or Small', 35, [
    dv(),
    f(1, 'Spider Climb', 'Climb Speed equal to your Speed. From character level 3 you can also move up, down and across walls and along ceilings with your hands free.'),
    resist('Trace of Undeath', 'Necrotic'),
    f(1, 'Vampiric Bite', 'When your Unarmed Strike deals damage you can bite instead: 1d4 + CON Piercing damage. Against a creature that isn\'t a Construct or Undead you can then empower yourself (uses = PB per Long Rest): regain HP equal to that damage, or add it as a bonus to your next ability check or attack roll within 1 minute.', PB)]),
  full(RAV, 'Hexblood', 'Medium or Small', 30, [
    notHumanoid('Fey'), dv(),
    f(1, 'Eerie Token', 'Bonus Action, once per Long Rest: make a magical token (a lock of hair, a nail ...). Until your next Long Rest, within 10 miles of it you can take a Magic action to send a message of up to 25 words to whoever carries it, or to see and hear through it for 1 minute (the token then crumbles).', ONCE),
    f(1, 'Hex Magic', 'Disguise Self and Hex are always prepared; each once per Long Rest without a spell slot (or with slots).', { choice: CAST })],
    { spells: { 1: ['Disguise Self', 'Hex'] } }),
  full(RAV, 'Lupin', 'Medium or Small', 30, [
    dv(),
    f(1, 'Feral Pounce', 'Your Unarmed Strikes deal Slashing damage. Once per turn, when one hits as part of the Attack action, you can both deal its damage and Shove.'),
    f(1, 'Howl', 'Bonus Action: creatures of your choice within 15 ft make a WIS save (DC 8 + CON modifier + PB) or have Disadvantage on attack rolls and saves until the start of your next turn. Uses = PB per Long Rest.', PB),
    f(1, 'Werewolf Instincts', 'Proficiency in Perception, Stealth or Survival.', { choice: skills(1, ['Perception', 'Stealth', 'Survival']) })],
    { unarmed: { type: 'slashing' } }),
  full(RAV, 'Reborn', 'Medium or Small', 30, [
    f(1, 'Escaped Death', 'Advantage on Death Saving Throws.'),
    f(1, 'Everlasting', 'No Exhaustion from dehydration, malnutrition or suffocation. You don\'t sleep and magic can\'t put you to sleep; a Long Rest takes 4 hours of motionless rest while you stay conscious.'),
    f(1, 'Knowledge from a Past Life', 'Proficiency in one skill of your choice. When you fail an ability check, you can add 1d6 to the roll (uses = PB per Long Rest).', { choice: skills(1, 'any'), ...PB }),
    f(1, 'Strange Endurance', 'Resistance to one damage type of your choice: Cold, Necrotic or Poison.', { choice: options([['Cold', ''], ['Necrotic', ''], ['Poison', '']]) })]),

  // ---- D&D Beyond Drops (dnd2024.wikidot.com) ----
  full('D&D Beyond Drops', 'Duskling', 'Medium', 30, [
    notHumanoid('Fey'), dv(),
    f(1, 'Enhanced Jump', '+2 ft to your running High Jumps and +10 ft to your running Long Jumps.'),
    f(1, 'Inner Magic', 'After each Long Rest choose a benefit; it lasts until you change it, and a Bonus Action switches it (uses = PB per Long Rest). Ardor: Advantage on CHA checks and on saves to avoid or end Frightened. Mobility: Speed +10 ft, and climbing and swimming cost no extra movement. Vigor: Temporary HP = PB, and Advantage on STR (Athletics) and DEX (Acrobatics) checks.', PB)]),

  // ---- Older official books (dnd5e.wikidot.com), 2024 rules ----
  full('Basic Rules (2014)', 'Half-Elf', 'Medium', 30, [
    dv(),
    f(1, 'Fey Ancestry', 'Advantage on saves against being Charmed, and magic can\'t put you to sleep.'),
    f(1, 'Skill Versatility', 'Proficiency in two skills of your choice.', { choice: skills(2, 'any') })]),
  full('Basic Rules (2014)', 'Half-Orc', 'Medium', 30, [
    dv(),
    f(1, 'Menacing', 'Proficiency in Intimidation.', { grants: { skills: ['Intimidation'] } }),
    f(1, 'Relentless Endurance', 'When you drop to 0 HP but aren\'t killed outright, you can drop to 1 HP instead. Once per Long Rest.', ONCE),
    f(1, 'Savage Attacks', 'When you score a Critical Hit with a melee weapon attack, roll one of the weapon\'s damage dice once more and add it to the extra damage.')],
    { critExtraMelee: 1 }),
  full('Acquisitions Incorporated', 'Verdan', 'Small', 30, [
    f(1, 'Black Blood Healing', 'When you roll a 1 or 2 on a Hit Point Die you spend at the end of a Short Rest, reroll it and use the new roll.'),
    f(1, 'Limited Telepathy', 'You can telepathically share simple ideas with a creature you can see within 30 ft that understands a language (it needn\'t share yours).'),
    f(1, 'Persuasive', 'Proficiency in Persuasion.', { grants: { skills: ['Persuasion'] } }),
    f(1, 'Telepathic Insight', 'Advantage on WIS and CHA saving throws.'),
    f(5, 'Medium Size', 'Your growth spurt: from character level 5 you are Medium (Small before).')]),
  full('Dragonlance: Shadow of the Dragon Queen', 'Kender', 'Small', 30, [
    f(1, 'Fearless', 'Advantage on saves to avoid or end Frightened; once per Long Rest, when you fail one, you can succeed instead.', ONCE),
    f(1, 'Kender Aptitude', 'Proficiency in Insight, Investigation, Sleight of Hand, Stealth or Survival.',
      { choice: skills(1, ['Insight', 'Investigation', 'Sleight of Hand', 'Stealth', 'Survival']) }),
    f(1, 'Taunt', 'Bonus Action: a creature within 60 ft that can hear and understand you makes a WIS save (DC 8 + PB + the ability you chose) or has Disadvantage on attack rolls against anyone but you until the start of your next turn. Uses = PB per Long Rest.', { choice: DC, ...PB })]),
  full(GGR, 'Loxodon', 'Medium', 30, [
    powerfulBuild(),
    f(1, 'Loxodon Serenity', 'Advantage on saves against being Charmed or Frightened.'),
    f(1, 'Natural Armor', 'Without armor your AC is 12 + CON modifier, and you can use that instead of worn armor that gives less. Shields work as normal.'),
    f(1, 'Trunk', 'Your trunk (reach 5 ft) lifts 5 × STR pounds, works as a snorkel and does simple tasks: lift, drop, hold, push or pull things, open or close doors and containers, grapple, or make an Unarmed Strike. It can\'t wield weapons or shields, use tools or magic items, or do somatic components.'),
    f(1, 'Keen Smell', 'Advantage on WIS (Perception), WIS (Survival) and INT (Investigation) checks that involve smell.')],
    { ac: { base: 12, ability: 'CON', withArmor: true, name: 'Natural Armor' } }),
  full(GGR, 'Simic Hybrid', 'Medium', 30, [
    dv(),
    f(1, 'Animal Enhancement', 'Choose one enhancement now; you gain a second at character level 5.', { choice: options(HYBRID_1) }),
    f(5, 'Second Animal Enhancement', 'Choose another enhancement: a level 1 one you don\'t have, or one of these.', { choice: options([...HYBRID_1,
      ['Grappling Appendages', 'Two claws or tentacles beside your arms. Action: grapple with one. Each is a natural weapon for Unarmed Strikes (1d6 + STR Bludgeoning damage), and right after a hit you can try to grapple the target as a Bonus Action. They can\'t use weapons or other equipment.'],
      ['Carapace', '+1 AC while you aren\'t wearing Heavy armor.'],
      ['Acid Spit', 'Action: a creature or object you can see within 30 ft makes a DEX save (DC 8 + PB + CON modifier) or takes 2d10 Acid damage (3d10 at character level 11, 4d10 at 17). Uses = CON modifier per Long Rest.']]) })]),
  full(GGR, 'Vedalken', 'Medium', 30, [
    f(1, 'Vedalken Dispassion', 'Advantage on INT, WIS and CHA saving throws.'),
    f(1, 'Tireless Precision', 'Proficiency in one of Arcana, History, Investigation, Medicine, Performance and Sleight of Hand, and with one tool of your choice. Your checks with that skill or tool add 1d4.',
      { choice: skills(1, ['Arcana', 'History', 'Investigation', 'Medicine', 'Performance', 'Sleight of Hand']), more: [tool()] }),
    f(1, 'Partially Amphibious', 'You can breathe underwater for up to 1 hour, then not again until you finish a Long Rest.')]),

  full(MOTM, 'Aarakocra', 'Medium', 30, [
    flight(), natural('Talons', 6, 'Slashing'),
    f(1, 'Wind Caller', 'From character level 3 you can cast Gust of Wind (no material component) once per Long Rest without a spell slot, or with slots.', { choice: CAST })],
    { spells: { 3: ['Gust of Wind'] }, unarmed: { die: 6, type: 'slashing' } }),
  full(MOTM, 'Air Genasi', 'Medium or Small', 35, [
    dv(),
    f(1, 'Unending Breath', 'You can hold your breath for as long as you like while you aren\'t Incapacitated.'),
    resist('Lightning Resistance', 'Lightning'),
    f(1, 'Mingle with the Wind', 'You know Shocking Grasp. From character level 3 you can cast Feather Fall, and from level 5 Levitate, without material components, each once per Long Rest without a spell slot (or with slots).', { choice: CAST })],
    { spells: { 1: ['Shocking Grasp'], 3: ['Feather Fall'], 5: ['Levitate'] } }),
  full(MOTM, 'Bugbear', 'Medium', 30, [
    countsAs('Goblinoid', 'a goblinoid'), dv(), feyAncestry(),
    f(1, 'Long-Limbed', 'Your melee attacks on your turn have 5 ft more reach.'),
    powerfulBuild(),
    f(1, 'Sneaky', 'Proficiency in Stealth, and you can move through and stop in a space big enough for a Small creature without squeezing.', { grants: { skills: ['Stealth'] } }),
    f(1, 'Surprise Attack', 'When you hit a creature that hasn\'t taken a turn yet in this combat, it takes an extra 2d6 damage.')],
    { riders: [{ name: 'Surprise Attack', dice: '2d6', note: 'the target hasn\'t taken a turn yet in this combat' }] }),
  full(MOTM, 'Centaur', 'Medium', 40, [
    notHumanoid('Fey'),
    f(1, 'Charge', 'If you move at least 30 ft straight toward a target and hit it with a melee weapon attack on that turn, you can attack it with your Hooves as a Bonus Action.'),
    f(1, 'Equine Build', 'You count as one size larger for carrying capacity and the weight you can push or drag. A climb that needs hands and feet costs you 4 extra feet per foot.'),
    natural('Hooves', 6, 'Bludgeoning'),
    f(1, 'Natural Affinity', 'Proficiency in Animal Handling, Medicine, Nature or Survival.', { choice: skills(1, ['Animal Handling', 'Medicine', 'Nature', 'Survival']) })],
    { unarmed: { die: 6, type: 'bludgeoning' } }),
  full(MOTM, 'Deep Gnome', 'Small', 30, [
    countsAs('Gnome', 'a gnome'), dv(120),
    f(1, 'Gift of the Svirfneblin', 'From character level 3 you can cast Disguise Self, and from level 5 Nondetection (no material component), each once per Long Rest without a spell slot (or with slots).', { choice: CAST }),
    f(1, 'Gnomish Magic Resistance', 'Advantage on INT, WIS and CHA saves against spells.'),
    f(1, 'Svirfneblin Camouflage', 'Give yourself Advantage on a DEX (Stealth) check. Uses = PB per Long Rest.', PB)],
    { spells: { 3: ['Disguise Self'], 5: ['Nondetection'] } }),
  full(MOTM, 'Duergar', 'Medium', 30, [
    countsAs('Dwarf', 'a dwarf'), dv(120),
    f(1, 'Duergar Magic', 'From character level 3 you can cast Enlarge/Reduce on yourself, and from level 5 Invisibility on yourself, without material components, each once per Long Rest without a spell slot (or with slots).', { choice: CAST }),
    f(1, 'Dwarven Resilience', 'Advantage on saves to avoid or end Poisoned, and Resistance to Poison damage.'),
    f(1, 'Psionic Fortitude', 'Advantage on saves to avoid or end Charmed or Stunned.')],
    { spells: { 3: ['Enlarge/Reduce'], 5: ['Invisibility'] } }),
  full(MOTM, 'Earth Genasi', 'Medium or Small', 30, [
    dv(),
    f(1, 'Earth Walk', 'Difficult terrain costs you no extra movement when you walk on the ground or a floor.'),
    f(1, 'Merge with Stone', 'You know Blade Ward and can cast it as a Bonus Action (uses = PB per Long Rest). From character level 5 you can cast Pass without Trace (no material component) once per Long Rest without a spell slot, or with slots.', { choice: CAST, ...PB })],
    { spells: { 1: ['Blade Ward'], 5: ['Pass without Trace'] } }),
  full(MOTM, 'Eladrin', 'Medium', 30, [
    countsAs('Elf', 'an elf'), dv(), feyAncestry(),
    f(1, 'Fey Step', `${teleport30} From character level 3 it also has your season's effect (save DC 8 + PB + the ability you chose). Autumn: up to two creatures within 10 ft make a WIS save or are Charmed for 1 minute (until you or your allies damage them). Winter: a creature within 5 ft before you teleport makes a WIS save or is Frightened until the end of your next turn. Spring: a willing creature within 5 ft teleports instead of you. Summer: creatures of your choice within 5 ft take Fire damage equal to your PB.`, { choice: DC, ...PB }),
    keenPerception(),
    trance(`After each trance you can change your season and gain two weapon or tool proficiencies of your choice until your next Long Rest.`)]),
  full(MOTM, 'Fairy', 'Small', 30, [
    notHumanoid('Fey'),
    f(1, 'Fairy Magic', 'You know Druidcraft. From character level 3 you can cast Faerie Fire, and from level 5 Enlarge/Reduce, each once per Long Rest without a spell slot (or with slots).', { choice: CAST }),
    flight()],
    { spells: { 1: ['Druidcraft'], 3: ['Faerie Fire'], 5: ['Enlarge/Reduce'] } }),
  full(MOTM, 'Firbolg', 'Medium', 30, [
    f(1, 'Firbolg Magic', 'You can cast Detect Magic and Disguise Self (seeming up to 3 ft shorter or taller), each once per Long Rest without a spell slot (or with slots).', { choice: CAST }),
    f(1, 'Hidden Step', 'Bonus Action: turn Invisible until the start of your next turn, or until you attack, roll damage or force a save. Uses = PB per Long Rest.', PB),
    powerfulBuild(),
    f(1, 'Speech of Beast and Leaf', 'Beasts and Plants understand the meaning of your words (you don\'t understand them), and you have Advantage on CHA checks to influence them.')],
    { spells: { 1: ['Detect Magic', 'Disguise Self'] } }),
  full(MOTM, 'Fire Genasi', 'Medium or Small', 30, [dv(), resist('Fire Resistance', 'Fire'), f(1, 'Reach to the Blaze', REACH_TO_THE_BLAZE, { choice: CAST })],
    { spells: blaze }),
  full(MOTM, 'Githyanki', 'Medium', 30, [
    f(1, 'Astral Knowledge', 'After each Long Rest you gain proficiency in one skill and with one weapon or tool of your choice until your next Long Rest.'),
    f(1, 'Githyanki Psionics', 'You know Mage Hand (the hand is invisible). From character level 3 you can cast Jump, and from level 5 Misty Step, each once per Long Rest without a spell slot (or with slots). Cast with this trait, these spells need no components.', { choice: CAST }),
    resist('Psychic Resilience', 'Psychic')],
    { spells: { 1: ['Mage Hand'], 3: ['Jump'], 5: ['Misty Step'] } }),
  full(MOTM, 'Githzerai', 'Medium', 30, [
    f(1, 'Githzerai Psionics', 'You know Mage Hand (the hand is invisible). From character level 3 you can cast Shield, and from level 5 Detect Thoughts, each once per Long Rest without a spell slot (or with slots). Cast with this trait, these spells need no components.', { choice: CAST }),
    f(1, 'Mental Discipline', 'Advantage on saves to avoid or end Charmed and Frightened.'),
    resist('Psychic Resilience', 'Psychic')],
    { spells: { 1: ['Mage Hand'], 3: ['Shield'], 5: ['Detect Thoughts'] } }),
  full(MOTM, 'Goblin', 'Small', 30, [countsAs('Goblinoid', 'a goblinoid'), dv(), feyAncestry(), furyOfTheSmall(), nimbleEscape()],
    { riders: [furyRider] }),
  full(MOTM, 'Harengon', 'Medium or Small', 30, [
    f(1, 'Hare-Trigger', 'Add your PB to your Initiative rolls.', { grants: { initiativeBonus: 'PB' } }),
    f(1, 'Leporine Senses', 'Proficiency in Perception.', { grants: { skills: ['Perception'] } }),
    f(1, 'Lucky Footwork', 'When you fail a DEX save, Reaction: add 1d4 to it (not while Prone or at Speed 0).'),
    f(1, 'Rabbit Hop', 'Bonus Action: jump 5 × PB feet without provoking Opportunity Attacks (only while your Speed is above 0). Uses = PB per Long Rest.', PB)]),
  full(MOTM, 'Hobgoblin', 'Medium', 30, [
    countsAs('Goblinoid', 'a goblinoid'), dv(), feyAncestry(),
    f(1, 'Fey Gift', 'Take the Help action as a Bonus Action (uses = PB per Long Rest). From character level 3 each such Help also gives one option. Hospitality: you and the creature you help gain 1d6 + PB Temporary HP. Passage: you both gain +10 ft Speed until the start of your next turn. Spite: the first target the helped creature hits before the start of your next turn has Disadvantage on its next attack roll within 1 minute.', PB),
    f(1, 'Fortune from the Many', 'When you miss with an attack roll or fail an ability check or a save, add +1 for each ally you can see within 30 ft (at most +3). Uses = PB per Long Rest.', PB)]),
  full(MOTM, 'Kenku', 'Medium or Small', 30, [
    f(1, 'Expert Duplication', 'Advantage on checks to make an exact copy of writing or craftwork.'),
    f(1, 'Kenku Recall', 'Proficiency in two skills of your choice. Before rolling a check with a skill you are proficient in, you can give yourself Advantage (uses = PB per Long Rest).', { choice: skills(2, 'any'), ...PB }),
    f(1, 'Mimicry', 'You can copy sounds and voices you have heard; telling them from the real thing takes a WIS (Insight) check against DC 8 + PB + CHA modifier.')]),
  full(MOTM, 'Kobold', 'Small', 30, [
    dv(),
    f(1, 'Draconic Cry', 'Bonus Action: until the start of your next turn, you and your allies have Advantage on attack rolls against enemies within 10 ft that could hear it. Uses = PB per Long Rest.', PB),
    f(1, 'Kobold Legacy', 'Choose one legacy.', {
      choice: options([
        ['Craftiness', 'Proficiency in Arcana, Investigation, Medicine, Sleight of Hand or Survival.'],
        ['Defiance', 'Advantage on saves to avoid or end Frightened.'],
        ['Draconic Sorcery', 'You know a Sorcerer cantrip of your choice; INT, WIS or CHA is its spellcasting ability.']]),
      more: [{ ...skills(1, ['Arcana', 'Investigation', 'Medicine', 'Sleight of Hand', 'Survival']), if: 'Craftiness', title: 'Craftiness skill' },
        { type: 'spell', level: 0, list: 'sorcerer', if: 'Draconic Sorcery', title: 'Sorcerer cantrip' },
        { ...CAST, if: 'Draconic Sorcery' }] })]),
  full(MOTM, 'Lizardfolk', 'Medium', 30, [
    natural('Bite', 6, 'Slashing', 'fanged bite'),
    holdBreath('15 minutes'),
    f(1, 'Hungry Jaws', 'Bonus Action: a special Bite attack; on a hit it deals its normal damage and you gain Temporary HP = PB. Uses = PB per Long Rest.', PB),
    f(1, 'Natural Armor', 'Without armor your AC is 13 + DEX modifier, and you can use that instead of worn armor that gives less. Shields work as normal.'),
    f(1, "Nature's Intuition", 'Proficiency in two of Animal Handling, Medicine, Nature, Perception, Stealth and Survival.', { choice: skills(2, NATURE) }),
    moves('Swim')],
    { ac: { base: 13, ability: 'DEX', withArmor: true, name: 'Natural Armor' }, unarmed: { die: 6, type: 'slashing' } }),
  full(MOTM, 'Minotaur', 'Medium', 30, [
    natural('Horns', 6, 'Piercing'),
    f(1, 'Goring Rush', 'Right after you take the Dash action and move at least 20 ft on your turn, you can make one melee attack with your Horns as a Bonus Action.'),
    f(1, 'Hammering Horns', 'Right after you hit with a melee attack as part of the Attack action, Bonus Action: push the target (within 5 ft, at most one size larger) up to 10 ft away unless it makes a STR save (DC 8 + PB + STR modifier).'),
    f(1, 'Labyrinthine Recall', 'You always know which way is north, and you have Advantage on WIS (Survival) checks to navigate or track.')],
    { unarmed: { die: 6, type: 'piercing' } }),
  full(MOTM, 'Satyr', 'Medium', 35, [
    notHumanoid('Fey'),
    natural('Ram', 6, 'Bludgeoning', 'head and horns'),
    f(1, 'Magic Resistance', 'Advantage on saves against spells.'),
    f(1, 'Mirthful Leaps', 'When you make a Long or High Jump (even a standing one), add 1d8 feet; it costs movement as normal.'),
    f(1, 'Reveler', 'Proficiency in Performance and Persuasion, and with one musical instrument of your choice.',
      { grants: { skills: ['Performance', 'Persuasion'] }, choice: { type: 'tools', count: 1, kind: 'Musical Instrument' } })],
    { unarmed: { die: 6, type: 'bludgeoning' } }),
  full(MOTM, 'Sea Elf', 'Medium', 30, [
    countsAs('Elf', 'an elf'),
    f(1, 'Child of the Sea', 'You breathe air and water, and have Resistance to Cold damage.'),
    dv(), feyAncestry(),
    f(1, 'Friend of the Sea', 'You can share simple ideas with any Beast that has a Swim Speed; it understands you, but you don\'t understand it.'),
    keenPerception(), trance(elfMemory), moves('Swim')]),
  full(MOTM, 'Shadar-kai', 'Medium', 30, [
    countsAs('Elf', 'an elf'),
    f(1, 'Blessing of the Raven Queen', `${teleport30} From character level 3 you also have Resistance to all damage until the start of your next turn when you teleport this way.`, PB),
    dv(), feyAncestry(), keenPerception(), resist('Necrotic Resistance', 'Necrotic'), trance(elfMemory)]),
  full(MOTM, 'Tabaxi', 'Medium or Small', 30, [
    natural("Cat's Claws", 6, 'Slashing', 'claws'),
    f(1, "Cat's Talent", 'Proficiency in Perception and Stealth.', { grants: { skills: ['Perception', 'Stealth'] } }),
    dv(),
    f(1, 'Feline Agility', 'When you move on your turn in combat, you can double your Speed until the end of the turn; then not again until you move 0 ft on one of your turns.'),
    moves('Climb')],
    { unarmed: { die: 6, type: 'slashing' } }),
  full(MOTM, 'Tortle', 'Medium or Small', 30, [
    natural('Claws', 6, 'Slashing'),
    holdBreath('1 hour'),
    f(1, 'Natural Armor', 'Your shell gives you AC 17 (your DEX modifier doesn\'t change it). You can\'t wear armor, but a Shield works as normal.'),
    f(1, "Nature's Intuition", 'Proficiency in one of Animal Handling, Medicine, Nature, Perception, Stealth and Survival.', { choice: skills(1, NATURE) }),
    f(1, 'Shell Defense', 'Action: withdraw into your shell for +4 AC and Advantage on STR and CON saves. Meanwhile you are Prone, your Speed is 0, you have Disadvantage on DEX saves, you can\'t take Reactions, and your only action is a Bonus Action to come out.')],
    { ac: { base: 17, noArmor: true, name: 'Natural Armor' }, unarmed: { die: 6, type: 'slashing' } }),
  full(MOTM, 'Triton', 'Medium', 30, [
    f(1, 'Amphibious', 'You breathe air and water.'),
    f(1, 'Control Air and Water', 'You can cast Fog Cloud; from character level 3 Gust of Wind, and from level 5 Water Walk. Each once per Long Rest without a spell slot (or with slots).', { choice: CAST }),
    dv(),
    f(1, 'Emissary of the Sea', 'You can share simple ideas with any Beast, Elemental or Monstrosity that has a Swim Speed; it understands you, but you don\'t understand it.'),
    resist('Guardian of the Depths', 'Cold'),
    moves('Swim', '30 ft')],
    { spells: { 1: ['Fog Cloud'], 3: ['Gust of Wind'], 5: ['Water Walk'] } }),
  full(MOTM, 'Water Genasi', 'Medium or Small', 30, [
    resist('Acid Resistance', 'Acid'),
    f(1, 'Amphibious', 'You breathe air and water.'),
    f(1, 'Call to the Wave', 'You know Acid Splash. From character level 3 you can cast Create or Destroy Water, and from level 5 Water Walk (no material component), each once per Long Rest without a spell slot (or with slots).', { choice: CAST }),
    dv(), moves('Swim')],
    { spells: { 1: ['Acid Splash'], 3: ['Create or Destroy Water'], 5: ['Water Walk'] } }),
  full(MOTM, 'Yuan-ti', 'Medium or Small', 30, [
    dv(),
    f(1, 'Magic Resistance', 'Advantage on saves against spells.'),
    f(1, 'Poison Resilience', 'Advantage on saves to avoid or end Poisoned, and Resistance to Poison damage.'),
    f(1, 'Serpentine Spellcasting', 'You know Poison Spray, and you can cast Animal Friendship on snakes as often as you like. From character level 3 you can cast Suggestion once per Long Rest without a spell slot, or with slots.', { choice: CAST })],
    { spells: { 1: ['Poison Spray', 'Animal Friendship'], 3: ['Suggestion'] }, aliases: ['Yuan-ti Pureblood'] }),

  full('Mythic Odysseys of Theros', 'Leonin', 'Medium', 35, [
    dv(), natural('Claws', 4, 'Slashing'),
    f(1, "Hunter's Instincts", 'Proficiency in Athletics, Intimidation, Perception or Survival.', { choice: skills(1, ['Athletics', 'Intimidation', 'Perception', 'Survival']) }),
    f(1, 'Daunting Roar', 'Bonus Action: creatures of your choice within 10 ft that can hear you make a WIS save (DC 8 + PB + CON modifier) or are Frightened of you until the end of your next turn. Once per Short or Long Rest.', { uses: { n: 1, back: 'short' } })],
    { unarmed: { die: 4, type: 'slashing' } }),

  full(SJ, 'Astral Elf', 'Medium', 30, [
    countsAs('Elf', 'an elf'),
    f(1, 'Astral Fire', 'You know one cantrip of your choice: Dancing Lights, Light or Sacred Flame.', {
      choice: { type: 'option', options: ['Dancing Lights', 'Light', 'Sacred Flame'].map(n => ({ name: n, text: 'cantrip', grants: { alwaysPrepared: [n] } })) },
      more: [CAST] }),
    dv(), feyAncestry(), keenPerception(),
    f(1, 'Starlight Step', teleport30, PB),
    f(1, 'Astral Trance', 'You don\'t sleep and magic can\'t put you to sleep; a Long Rest takes 4 hours of trance. After it you gain proficiency in one skill and with one weapon or tool of your choice until your next Long Rest.')]),
  full(SJ, 'Autognome', 'Small', 30, [
    notHumanoid('Construct'),
    f(1, 'Armored Casing', 'Without armor your base AC is 13 + DEX modifier.'),
    f(1, 'Built for Success', 'Add 1d4 to an attack roll, ability check or save after seeing the d20 (before the result). Uses = PB per Long Rest.', PB),
    f(1, 'Healing Machine', 'If Mending is cast on you, you can spend a Hit Point Die and regain its roll + CON modifier HP (at least 1). Cure Wounds, Healing Word, Mass Cure Wounds, Mass Healing Word and Spare the Dying work on you.'),
    f(1, 'Mechanical Nature', 'Resistance to Poison damage and immunity to disease; Advantage on saves against being Paralyzed or Poisoned; you don\'t need to eat, drink or breathe.'),
    f(1, "Sentry's Rest", 'A Long Rest is 6 hours of motionless inactivity instead of sleep; you look inert but stay conscious.'),
    f(1, 'Specialized Design', 'Proficiency with two tools of your choice.', { choice: tool(2) })],
    { ac: { base: 13, ability: 'DEX', name: 'Armored Casing' } }),
  full(SJ, 'Giff', 'Medium', 30, [
    f(1, 'Astral Spark', 'When you hit with a Simple or Martial weapon, you can add Force damage equal to your PB (once per turn). Uses = PB per Long Rest.', PB),
    f(1, 'Firearms Mastery', 'Proficiency with all firearms; you ignore their Loading property, and long range gives you no Disadvantage with them.', { grants: { weapons: ['Firearms'] } }),
    f(1, 'Hippo Build', 'Advantage on STR checks and STR saves, and you count as one size larger for carrying capacity and the weight you can push, drag or lift.'),
    moves('Swim')],
    { riders: [{ name: 'Astral Spark', pb: true, type: 'force', weapon: true, note: 'once per turn; uses = PB per Long Rest' }] }),
  full(SJ, 'Hadozee', 'Medium or Small', 30, [
    f(1, 'Dexterous Feet', 'Bonus Action: use your feet to handle an object, open or close a door or container, or pick up or set down a Tiny object.'),
    f(1, 'Glide', 'When you fall at least 10 ft, Reaction: glide sideways up to your Speed and take no falling damage.'),
    f(1, 'Hadozee Dodge', 'When you take damage, Reaction: reduce it by 1d6 + PB. Uses = PB per Long Rest.', PB),
    moves('Climb')]),
  full(SJ, 'Plasmoid', 'Medium or Small', 30, [
    notHumanoid('Ooze'),
    f(1, 'Amorphous', 'You can squeeze through a 1-inch gap if you wear and carry nothing, and you have Advantage on checks to start or escape a grapple.'),
    dv(), holdBreath('1 hour'),
    f(1, 'Natural Resilience', 'Resistance to Acid and Poison damage, and Advantage on saves against being Poisoned.'),
    f(1, 'Shape Self', 'Action: grow a head, arms, legs and makeshift hands and feet (then you can wear clothing and armor made for your size), or become a limbless blob. Bonus Action: push out or pull back a 10-ft pseudopod that can handle an object, a door or container, or a Tiny object (it can\'t attack, use magic items or lift more than 10 lb).')]),
  full(SJ, 'Thri-kreen', 'Medium or Small', 30, [
    notHumanoid('Monstrosity'),
    f(1, 'Chameleon Carapace', 'Without armor your base AC is 13 + DEX modifier. Action: change your color to match your surroundings, for Advantage on DEX (Stealth) checks to hide there.'),
    dv(),
    f(1, 'Secondary Arms', 'Two smaller extra arms can handle an object, a door or container, a Tiny object, or wield a weapon with the Light property.'),
    f(1, 'Sleepless', 'You don\'t need sleep and can stay conscious during a Long Rest (still no strenuous activity).'),
    f(1, 'Thri-kreen Telepathy', 'Without magic you can\'t speak non-thri-kreen languages; instead you send your thoughts to willing creatures within 120 ft that understand a language. The link breaks beyond 120 ft, if either of you is Incapacitated, or when either of you ends it.')],
    { ac: { base: 13, ability: 'DEX', name: 'Chameleon Carapace' } }),
  full('Strixhaven: A Curriculum of Chaos', 'Owlin', 'Medium or Small', 30, [
    dv(120), flight(),
    f(1, 'Silent Feathers', 'Proficiency in Stealth.', { grants: { skills: ['Stealth'] } })]),
  full("Sword Coast Adventurer's Guide", 'Feral Tiefling', 'Medium', 30, [
    dv(), resist('Hellish Resistance', 'Fire'),
    f(1, 'Infernal Legacy', 'You know Thaumaturgy; from character level 3 you can cast Hellish Rebuke as a level 2 spell, and from level 5 Darkness, each once per Long Rest. CHA is your spellcasting ability. (Your DM may allow a variant instead: Devil\'s Tongue, Hellfire or Winged; write it yourself.)')],
    { spells: { 1: ['Thaumaturgy'], 3: ['Hellish Rebuke'], 5: ['Darkness'] } }),
  full('Locathah Rising', 'Locathah', 'Medium', 30, [
    f(1, 'Natural Armor', 'Without armor your AC is 12 + DEX modifier, and you can use that instead of worn armor that gives less. Shields work as normal.'),
    f(1, 'Observant and Athletic', 'Proficiency in Athletics and Perception.', { grants: { skills: ['Athletics', 'Perception'] } }),
    f(1, 'Leviathan Will', 'Advantage on saves against being Charmed, Frightened, Paralyzed, Poisoned, Stunned or put to sleep.'),
    f(1, 'Limited Amphibiousness', 'You breathe air and water, but must be underwater at least once every 4 hours or begin to suffocate.'),
    moves('Swim', '30 ft')],
    { ac: { base: 12, ability: 'DEX', withArmor: true, name: 'Natural Armor' } }),
  full('One Grung Above', 'Grung', 'Small', 25, [
    f(1, 'Arboreal Alertness', 'Proficiency in Perception.', { grants: { skills: ['Perception'] } }),
    f(1, 'Amphibious', 'You breathe air and water.'),
    f(1, 'Poison Immunity', 'Immunity to Poison damage and the Poisoned condition.'),
    f(1, 'Poisonous Skin', 'A creature that grapples you or touches your skin makes a DC 12 CON save or is Poisoned for 1 minute (it saves again at the end of each of its turns once it isn\'t touching you). You can also coat a piercing weapon as part of an attack: on a hit the target makes a DC 12 CON save or takes 2d4 Poison damage.'),
    f(1, 'Standing Leap', 'Your Long Jump is up to 25 ft and your High Jump up to 15 ft, with or without a running start.'),
    f(1, 'Water Dependency', 'If you don\'t spend at least 1 hour in water during a day, you gain 1 Exhaustion level at its end; only magic or an hour in water removes it.'),
    moves('Climb', '25 ft')]),

  // ---- Names only: not on wikidot ----
  brief(LORWYN, 'Kithkin', ['Brave', 'Kithkin Nimbleness', 'Luck', 'Naturally Stealthy']),
  brief(EE, 'Aasimar (Exploring Eberron)', []),
  brief(EE, "Dhakaani Ghaal'dar", ['Darkvision', 'Discipline', 'Strength in Unity', 'War and Peace'], { aliases: ["Ghaal'dar", 'Dhakaani Hobgoblin'] }),
  brief(EE, "Dhakaani Golin'dar", ['Darkvision', 'Discipline', 'Naturally Stealthy', 'Nimbleness'], { aliases: ["Golin'dar", 'Dhakaani Goblin'] }),
  brief(EE, "Dhakaani Guul'dar", ['Darkvision', 'Brave', 'Long Limbed', 'Powerful Build', 'Stand by the Strong'], { aliases: ["Guul'dar", 'Dhakaani Bugbear'] }),
  brief(EE, "Jhorgun'taal", ['Darkvision', 'Relentless Endurance', 'Versatile'], { aliases: ['Half-Orc (Eberron)'] }),
  brief(EE, 'Kalamer Landwalker', ['Darkvision', 'Amphibious', 'Blessing of the Sea', 'Karakala Lore', 'Swift Swimmer'], { aliases: ['Landwalker', 'Kalamer Merfolk'] }),
  brief(EE, 'Ruinbound', ['Darkvision', 'Personal Symbiont', 'Symbiont Mastery', 'Unnatural Resilience']),
  brief(EE, 'Sahuagin', ['Darkvision', 'Swift Swimmer', 'Blood Frenzy', 'Natural Armor', 'Limited Amphibiousness'])
);

// The other species on D&D Beyond's species list (2026-10-03), from third-party books, as [book, name, trait names]. One per
// name: when several books have the same name, the 2024 version wins, then the newest official one (Monsters of the
// Multiverse over Volo's, Elemental Evil, Ravnica, Theros), then third-party (the one without old-style ability bonuses).
// The older names that Monsters of the Multiverse replaced are left out (Yuan-ti Pureblood -> Yuan-ti, Gith -> Githyanki /
// Githzerai, Genasi -> Air / Earth / Fire / Water Genasi). Ability bonuses from 2014-style trait lists are left out too.
const ALIASES = { 'The Children of Seth': ['Children of Seth'], 'The Manyhorn': ['Manyhorn'], 'Alfar (Hidden Elf)': ['Alfar', 'Hidden Elf'] };
const listed = [
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
