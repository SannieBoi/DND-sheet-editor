/* Field maps of known character sheet PDFs whose field names say nothing (Text1, Check Box3, ...), so script.js can't
   match them by name. Each map was read off the PDF itself (field positions against the printed labels).
   detect: how to recognise the PDF (page count + some field names). fields: stat key (as in script.js FIELD_MAP, plus
   subclass, size, hitDiceSpent, spellMod, features2 (second Class Features column), speciesTraits, featsText (the Feats box),
   weaponProficiencies, toolProficiencies, appearance, backstory, languages) -> PDF field name.
   saves / skills: the bonus boxes; profChecks: their proficiency checkboxes ('save:STR', 'skill:Stealth').
   weapons: rows of [name, attack bonus / DC, damage & type, notes]. spellRows: 30 rows of the spell table (C / R / M checkboxes).
   slots: spell level -> { total box, expended checkboxes }. attunement: [item name, attuned checkbox]. */
window.DND = window.DND || {};

DND.sheets = [
  {
    id: "wotc-2024",
    name: "D&D 2024 character sheet (Wizards of the Coast fillable PDF)",
    source: "https://media.dndbeyond.com/compendium-images/br/ph/character-sheet.pdf",
    detect: {"pages":2,"fields":["Text1","Text106.0","Check Box252.0","Text270"],"fieldCount":411},
    fields: {"name":"Text1","background":"Text6","classLevel":"Text7","race":"Text8","subclass":"Text9","level":"Text11","xp":"Text12","ac":"Text13","hp":"Text14","hpTemp":"Text15","hpMax":"Text16","hitDice":"Text17","hitDiceSpent":"Text18","profBonus":"Text19","str":"Text64","dex":"Text66","con":"Text67","int":"Text63","wis":"Text65","cha":"Text68","strMod":"Text21","dexMod":"Text22","conMod":"Text24","intMod":"Text20","wisMod":"Text23","chaMod":"Text25","initiative":"Text26","speed":"Text27","size":"Text28","passivePerception":"Text29","features":"Text54","features2":"Text55","speciesTraits":"Text57","featsText":"Text58","weaponProficiencies":"Text59","toolProficiencies":"Text60","spellAbility":"Text111","spellMod":"Text93","spellDC":"Text94","spellAttack":"Text95","appearance":"Text96","backstory":"Text97","languages":"Text98","equipment":"Text99","alignment":"Text100","cp":"Text226","sp":"Text267","ep":"Text268","gp":"Text269","pp":"Text270"},
    saves: {"STR":"Text91","DEX":"Text87","CON":"Text86","INT":"Text69","WIS":"Text75","CHA":"Text81"},
    skills: {"Athletics":"Text92","Acrobatics":"Text88","Sleight of Hand":"Text89","Stealth":"Text90","Arcana":"Text70","History":"Text71","Investigation":"Text72","Nature":"Text73","Religion":"Text74","Animal Handling":"Text76","Insight":"Text77","Medicine":"Text78","Perception":"Text79","Survival":"Text80","Deception":"Text82","Intimidation":"Text83","Performance":"Text84","Persuasion":"Text85"},
    profChecks: {"save:STR":"Check Box37","save:DEX":"Check Box33","save:CON":"Check Box32","save:INT":"Check Box4","save:WIS":"Check Box21","save:CHA":"Check Box26","skill:Athletics":"Check Box38","skill:Acrobatics":"Check Box34","skill:Sleight of Hand":"Check Box35","skill:Stealth":"Check Box36","skill:Arcana":"Check Box16","skill:History":"Check Box17","skill:Investigation":"Check Box19","skill:Nature":"Check Box20","skill:Religion":"Check Box18","skill:Animal Handling":"Check Box22","skill:Insight":"Check Box23","skill:Medicine":"Check Box25","skill:Perception":"Check Box31","skill:Survival":"Check Box24","skill:Deception":"Check Box27","skill:Intimidation":"Check Box28","skill:Performance":"Check Box30","skill:Persuasion":"Check Box29"},
    checks: {"shield":"Check Box3","heroicInspiration":"Check Box11","deathSuccesses":["Check Box5","Check Box6","Check Box7"],"deathFailures":["Check Box8","Check Box9","Check Box10"],"armorLight":"Check Box13","armorMedium":"Check Box14","armorHeavy":"Check Box15","armorShields":"Check Box12"},
    weapons: [["Text30","Text31","Text32","Text33"],["Text34","Text35","Text36","Text37"],["Text38","Text39","Text40","Text41"],["Text42","Text43","Text44","Text45"],["Text46","Text47","Text48","Text49"],["Text50","Text51","Text52","Text53"]],
    slots: {"1":{"total":"Text112","expended":["Check Box227","Check Box228","Check Box229","Check Box230"]},"2":{"total":"Text113","expended":["Check Box231","Check Box232","Check Box233"]},"3":{"total":"Text114","expended":["Check Box234","Check Box235","Check Box236"]},"4":{"total":"Text117","expended":["Check Box237","Check Box238","Check Box239"]},"5":{"total":"Text116","expended":["Check Box240","Check Box241","Check Box242"]},"6":{"total":"Text115","expended":["Check Box243","Check Box244"]},"7":{"total":"Text118","expended":["Check Box245","Check Box246"]},"8":{"total":"Text119","expended":["Check Box247"]},"9":{"total":"Text120","expended":["Check Box248"]}},
    attunement: [["Text101","Check Box249"],["Text102","Check Box250"],["Text103","Check Box251"]],
    spellRows: [
      {"level":"Text105.0","name":"Text106.0","time":"Text107.0","range":"Text109.0","notes":"Text108","conc":"Check Box252.0","ritual":"Check Box253.0","material":"Check Box254.0.0"},
      {"level":"Text105.1","name":"Text106.1","time":"Text107.1","range":"Text109.1","notes":"Text208","conc":"Check Box252.1","ritual":"Check Box253.1","material":"Check Box254.0.1"},
      {"level":"Text105.2","name":"Text106.2","time":"Text107.2","range":"Text109.2","notes":"Text209","conc":"Check Box252.2","ritual":"Check Box253.2","material":"Check Box254.0.2"},
      {"level":"Text105.3","name":"Text106.3","time":"Text107.3","range":"Text109.3","notes":"Text210","conc":"Check Box252.3","ritual":"Check Box253.3","material":"Check Box254.0.3"},
      {"level":"Text105.4","name":"Text106.4","time":"Text107.4","range":"Text109.4","notes":"Text211","conc":"Check Box252.4","ritual":"Check Box253.4","material":"Check Box254.0.4"},
      {"level":"Text105.5","name":"Text106.5","time":"Text107.5","range":"Text109.5","notes":"Text212","conc":"Check Box252.5","ritual":"Check Box253.5","material":"Check Box254.0.5"},
      {"level":"Text105.6","name":"Text106.6","time":"Text107.6","range":"Text109.6","notes":"Text213","conc":"Check Box252.6","ritual":"Check Box253.6","material":"Check Box254.0.6"},
      {"level":"Text105.7","name":"Text106.7","time":"Text107.7","range":"Text109.7","notes":"Text214","conc":"Check Box255.0","ritual":"Check Box256.0","material":"Check Box257.0"},
      {"level":"Text105.8","name":"Text106.8","time":"Text107.8","range":"Text109.8","notes":"Text215","conc":"Check Box255.1","ritual":"Check Box256.1","material":"Check Box257.1"},
      {"level":"Text105.9","name":"Text106.9","time":"Text107.9","range":"Text109.9","notes":"Text216","conc":"Check Box255.2","ritual":"Check Box256.2","material":"Check Box257.2"},
      {"level":"Text105.10","name":"Text106.10","time":"Text107.10","range":"Text109.10","notes":"Text217","conc":"Check Box255.3","ritual":"Check Box256.3","material":"Check Box257.3"},
      {"level":"Text105.11","name":"Text106.11","time":"Text107.11","range":"Text109.11","notes":"Text218","conc":"Check Box255.4","ritual":"Check Box256.4","material":"Check Box257.4"},
      {"level":"Text105.12","name":"Text106.12","time":"Text107.12","range":"Text109.12","notes":"Text219","conc":"Check Box255.5","ritual":"Check Box256.5","material":"Check Box257.5"},
      {"level":"Text105.13","name":"Text106.13","time":"Text107.13","range":"Text109.13","notes":"Text220","conc":"Check Box255.6","ritual":"Check Box256.6","material":"Check Box257.6"},
      {"level":"Text105.14","name":"Text106.14","time":"Text107.14","range":"Text109.14","notes":"Text221","conc":"Check Box255.7","ritual":"Check Box256.7","material":"Check Box257.7"},
      {"level":"Text105.15","name":"Text106.15","time":"Text107.15","range":"Text109.15","notes":"Text222","conc":"Check Box255.8","ritual":"Check Box256.8","material":"Check Box257.8"},
      {"level":"Text105.16","name":"Text106.16","time":"Text107.16","range":"Text109.16","notes":"Text223","conc":"Check Box255.9","ritual":"Check Box256.9","material":"Check Box257.9"},
      {"level":"Text105.17","name":"Text106.17","time":"Text107.17","range":"Text109.17","notes":"Text224","conc":"Check Box255.10","ritual":"Check Box256.10","material":"Check Box257.10"},
      {"level":"Text105.18","name":"Text106.18","time":"Text107.18","range":"Text109.18","notes":"Text225","conc":"Check Box255.11","ritual":"Check Box256.11","material":"Check Box257.11"},
      {"level":"Text105.19","name":"Text106.19","time":"Text107.19","range":"Text109.19","notes":"Text227","conc":"Check Box255.12","ritual":"Check Box256.12","material":"Check Box257.12"},
      {"level":"Text105.20","name":"Text106.20","time":"Text107.20","range":"Text109.20","notes":"Text228","conc":"Check Box258.0","ritual":"Check Box259.0","material":"Check Box260.0"},
      {"level":"Text105.21","name":"Text106.21","time":"Text107.21","range":"Text109.21","notes":"Text229","conc":"Check Box258.1","ritual":"Check Box259.1","material":"Check Box260.1"},
      {"level":"Text105.22","name":"Text106.22","time":"Text107.22","range":"Text109.22","notes":"Text230","conc":"Check Box258.2","ritual":"Check Box259.2","material":"Check Box260.2"},
      {"level":"Text105.23","name":"Text106.23","time":"Text107.23","range":"Text109.23","notes":"Text244","conc":"Check Box258.3","ritual":"Check Box259.3","material":"Check Box260.3"},
      {"level":"Text105.24","name":"Text106.24","time":"Text107.24","range":"Text109.24","notes":"Text231","conc":"Check Box258.4","ritual":"Check Box259.4","material":"Check Box260.4"},
      {"level":"Text105.25","name":"Text106.25","time":"Text107.25","range":"Text109.25","notes":"Text232","conc":"Check Box258.5","ritual":"Check Box259.5","material":"Check Box260.5"},
      {"level":"Text105.26","name":"Text106.26","time":"Text107.26","range":"Text109.26","notes":"Text233","conc":"Check Box258.6","ritual":"Check Box259.6","material":"Check Box260.6"},
      {"level":"Text105.27","name":"Text106.27","time":"Text107.27","range":"Text109.27","notes":"Text234","conc":"Check Box258.7","ritual":"Check Box259.7","material":"Check Box260.7"},
      {"level":"Text105.28","name":"Text106.28","time":"Text107.28","range":"Text109.28","notes":"Text235","conc":"Check Box258.8","ritual":"Check Box259.8","material":"Check Box260.8"},
      {"level":"Text105.29","name":"Text106.29","time":"Text107.29","range":"Text109.29","notes":"Text236","conc":"Check Box258.9","ritual":"Check Box259.9","material":"Check Box260.9"}
    ]
  }
];
