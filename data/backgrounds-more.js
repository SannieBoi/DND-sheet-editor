/* The other 12 backgrounds of the Player's Handbook (2024), in the same shape as backgrounds.js (push onto DND.backgrounds,
   so load this right after backgrounds.js). Names, feats and skills match D&D Beyond's public background list; ability
   scores, tools and starting equipment are from the Player's Handbook (2024) itself (the book's pages are not public).
   source = the book. See CREDITS.md. */
window.DND = window.DND || {};

DND.backgrounds.push(...[
  {"name":"Artisan","abilityScores":["STR","DEX","INT"],"feat":"Crafter","proficiencies":["Skill: Investigation","Skill: Persuasion"],"toolChoice":{"count":1,"from":["Artisan's Tools"]},"equipment":[{"items":[{"same":true},"2 Pouches","Traveler's Clothes"],"gp":32},{"gp":50}]},
  {"name":"Charlatan","abilityScores":["DEX","CON","CHA"],"feat":"Skilled","proficiencies":["Skill: Deception","Skill: Sleight of Hand","Tool: Forgery Kit"],"equipment":[{"items":["Forgery Kit","Costume","Fine Clothes"],"gp":15},{"gp":50}]},
  {"name":"Entertainer","abilityScores":["STR","DEX","CHA"],"feat":"Musician","proficiencies":["Skill: Acrobatics","Skill: Performance"],"toolChoice":{"count":1,"from":["Musical Instrument"]},"equipment":[{"items":[{"same":true},"2 Costumes","Mirror","Perfume","Traveler's Clothes"],"gp":11},{"gp":50}]},
  {"name":"Farmer","abilityScores":["STR","CON","WIS"],"feat":"Tough","proficiencies":["Skill: Animal Handling","Skill: Nature","Tool: Carpenter's Tools"],"equipment":[{"items":["Sickle","Carpenter's Tools","Healer's Kit","Iron Pot","Shovel","Traveler's Clothes"],"gp":30},{"gp":50}]},
  {"name":"Guard","abilityScores":["STR","INT","WIS"],"feat":"Alert","proficiencies":["Skill: Athletics","Skill: Perception"],"toolChoice":{"count":1,"from":["Gaming Set"]},"equipment":[{"items":["Spear","Light Crossbow","20 Bolts",{"same":true},"Hooded Lantern","Manacles","Quiver","Traveler's Clothes"],"gp":12},{"gp":50}]},
  {"name":"Guide","abilityScores":["DEX","CON","WIS"],"feat":"Magic Initiate","featList":"druid","proficiencies":["Skill: Stealth","Skill: Survival","Tool: Cartographer's Tools"],"equipment":[{"items":["Shortbow","20 Arrows","Cartographer's Tools","Bedroll","Quiver","Tent","Traveler's Clothes"],"gp":3},{"gp":50}]},
  {"name":"Hermit","abilityScores":["CON","WIS","CHA"],"feat":"Healer","proficiencies":["Skill: Medicine","Skill: Religion","Tool: Herbalism Kit"],"equipment":[{"items":["Quarterstaff","Herbalism Kit","Bedroll","Book (philosophy)","Lamp","Oil (3 flasks)","Traveler's Clothes"],"gp":16},{"gp":50}]},
  {"name":"Merchant","abilityScores":["CON","INT","CHA"],"feat":"Lucky","proficiencies":["Skill: Animal Handling","Skill: Persuasion","Tool: Navigator's Tools"],"equipment":[{"items":["Navigator's Tools","2 Pouches","Traveler's Clothes"],"gp":22},{"gp":50}]},
  {"name":"Noble","abilityScores":["STR","INT","CHA"],"feat":"Skilled","proficiencies":["Skill: History","Skill: Persuasion"],"toolChoice":{"count":1,"from":["Gaming Set"]},"equipment":[{"items":[{"same":true},"Fine Clothes","Perfume"],"gp":29},{"gp":50}]},
  {"name":"Sailor","abilityScores":["STR","DEX","WIS"],"feat":"Tavern Brawler","proficiencies":["Skill: Acrobatics","Skill: Perception","Tool: Navigator's Tools"],"equipment":[{"items":["Dagger","Navigator's Tools","Rope","Traveler's Clothes"],"gp":20},{"gp":50}]},
  {"name":"Scribe","abilityScores":["DEX","INT","WIS"],"feat":"Skilled","proficiencies":["Skill: Investigation","Skill: Perception","Tool: Calligrapher's Supplies"],"equipment":[{"items":["Calligrapher's Supplies","Fine Clothes","Lamp","Oil (3 flasks)","Parchment (12 sheets)"],"gp":23},{"gp":50}]},
  {"name":"Wayfarer","abilityScores":["DEX","WIS","CHA"],"feat":"Lucky","proficiencies":["Skill: Insight","Skill: Stealth","Tool: Thieves' Tools"],"equipment":[{"items":["2 Daggers","Thieves' Tools",{"choose":["Gaming Set"]},"Bedroll","2 Pouches","Traveler's Clothes"],"gp":16},{"gp":50}]}
].map(b => ({ ...b, source: "Player's Handbook (2024)" })));
DND.backgrounds.sort((a, b) => a.name.localeCompare(b.name));
