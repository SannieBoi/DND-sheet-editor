/* D&D 2024 Basic Rules - backgrounds: three ability scores to raise (+2/+1 or +1/+1/+1), an origin feat (featList = the spell list for Magic Initiate),
   skill and tool proficiencies (toolChoice = pick one).
   Source: D&D Beyond Basic Rules (2024) / SRD 5.2.1 (CC-BY-4.0, see CREDITS.md). Numbers and names come from the
   rules data; feature text is condensed into short plain-language summaries (not the book text). */
window.DND = window.DND || {};

DND.backgrounds = [
  {"name":"Acolyte","abilityScores":["INT","WIS","CHA"],"feat":"Magic Initiate","featList":"cleric","proficiencies":["Skill: Insight","Skill: Religion","Tool: Calligrapher's Supplies"]},
  {"name":"Criminal","abilityScores":["DEX","CON","INT"],"feat":"Alert","proficiencies":["Skill: Sleight of Hand","Skill: Stealth","Tool: Thieves' Tools"]},
  {"name":"Sage","abilityScores":["CON","INT","WIS"],"feat":"Magic Initiate","featList":"wizard","proficiencies":["Skill: Arcana","Skill: History","Tool: Calligrapher's Supplies"]},
  {"name":"Soldier","abilityScores":["STR","DEX","CON"],"feat":"Savage Attacker","proficiencies":["Skill: Athletics","Skill: Intimidation"],"toolChoice":{"count":1,"from":["Gaming Set"]}}
];