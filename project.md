# D&D Sheet Viewer — project notes for Claude

Keep this file current: update it at the end of any change that adds files, globals, events, rules decisions or open items.
`README.txt` is the user's guide (its top "Short tutorial" and "Short Killing Marble" parts were written by the user: keep
them as they are; the user wants Killing Marble kept brief there). This file is for working on the code.

Git: github.com/SannieBoi/DND-sheet-editor, branch `main`. `.gitignore` leaves out tests/_out and __pycache__.

## What it is
An offline character-sheet tool: open `index.html` straight from disk (file://, no server, no build, no npm). Load a
fillable D&D 2024 character sheet PDF, edit its fields, roll dice from it, download the edited PDF.
Plain `<script>` tags only (no modules/fetch: file:// blocks them). Every script is an IIFE; cross-file contact is via
`window.*` globals and DOM events.

## Files (load order in index.html)
Folders (user's wish): `lib/` libraries, `data/` rules data + sheet maps, `app/` the tool's own scripts, `marble/` Killing
Marble. index.html, styles.css, README.txt, CREDITS.md, LICENSE stay in the root. Paths below are inside those folders.
`app/script.js` sets pdf.js `workerSrc = 'lib/pdf.worker.min.js'` (the worker also loads as a script tag, so pdf.js uses a fake worker).
| File | Role |
|---|---|
| lib/pdf.min.js, lib/pdf.worker.min.js (pdf.js 3.11.174), lib/pdf-lib.min.js | render PDF / write PDF. Never edit. |
| data/ rules, weapons, armor, classes, feats, species, backgrounds, spells .js | rules data -> `window.DND` (see "Rules data" below). spells.js = 339 SRD 5.2 spells, roll data hand-checked for 102 (built by a parser from github.com/springbov/dndsrd5.2_markdown). |
| data/feats-more.js, data/species-more.js | push onto `DND.feats` / `DND.species` (load right after feats.js / species.js): the rest of the 2024 PHB (58 feats, Aasimar) in full, and `brief` entries (names, category, ability increase, part names from D&D Beyond's public lists; "see the book"): feats of Forge of the Artificer, Heroes of Faerûn, Lorwyn: First Light; and EVERY species on D&D Beyond's species list (user asked for all, no duplicates; official + third-party). 140 feats, 172 species. Species dedupe rule is in the comment above `listed` (2024 > newest official > third-party; MotM-replaced names dropped; 2014 ability bonuses stripped from trait names). New fields documented in their headers (`source`, `brief`, `unless`, `aliases`, prerequisite `armor`/`text`, choice types). |
| data/backgrounds-more.js | pushes the other 12 PHB (2024) backgrounds onto `DND.backgrounds` (load right after backgrounds.js), sorted by name; `source`. Feats/skills checked against D&D Beyond's public list; ability scores, tools, equipment from the PHB (paywalled). |
| data/creation.js | `DND.creation`: standard array (+ by class), point buy, languages (standard/rare), alignments, equipment packs' contents, tool kinds (Artisan's Tools, Musical Instrument, Gaming Set), starting at higher levels. Checked against the Basic Rules 2026-10-04. Classes have `startingEquipment`, backgrounds `equipment` (options A/B(/C): `{ items, gp }`; item = text, `{ choose: [kinds], proficiency }` or `{ same: true }` = the background's tool). |
| data/sheet-2014.js, data/sheet-2024.js | the blank classic (2014, 3 pages) and official 2024 sheets as base64 (`window.BLANK_SHEETS.classic / .official2024`), loaded by maker.js with a script tag only when needed (file:// can't fetch). |
| data/sheets.js | `DND.sheets`: field maps of PDFs with meaningless field names. Holds the official WotC 2024 sheet (Text1, Check Box3...). script.js detects it (`detect`: page count + field names) and uses the map instead of `FIELD_MAP`. Its Feats box key is `featsText` (not `feats`: that name is taken by `character.feats`). |
| app/script.js | core: PDF load/render/overlay fields, field matching (`FIELD_MAP`, or the `sheetMap` from sheets.js), `character`, autocomplete, stat propagation, weapon/spell math, spell lines, zoom, download. |
| app/dialog.js | `window.ask({ title, text, body, buttons:[{label,value,primary}] })` -> Promise of the clicked value (null on Escape / click outside). The one question box for every script (`.ask` styles). Also `window.draggable(win, handle)` -> place(x, y): the non-modal windows you drag by the title bar (level up, rests; `.lu` styles). |
| app/effects.js | effects tray (bottom left): concentration, conditions, user debuffs, providers; `effects.forRoll()` used by every roll. |
| marble/marble-body.js | body outline JPEG as a data URI (`window.MARBLE_BODY`), needed for the PDF and file://. |
| marble/marble.js | "Killing Marble" mode: header switch, Becoming Marble page, marble debuffs (effects provider), PDF page hook. |
| app/rest.js | `window.resources`: spell slots (used/left), class features with limited uses (`RESOURCES` table), Hit Point Dice; draws the roller's Rest tab (`view()`) and the Spell tab's slot strip; the Short / Long Rest window (header "Rest" button or the tab). See "Rests and resources" below. |
| app/roller.js | dice roller panel (right): attack/spell/check/save/initiative/dice/rest tabs, log, animations. |
| app/levelup.js | "Level up" header button: confirm box, then a draggable window (Class / Hit Points / Features / Spells / Review). Writes only on Apply, through `window.sheet`. Also a new character's level 1 (`L.first`). See "Level up" below. |
| app/maker.js | the sheet maker: "…or create a new sheet" (#newSheet, under the drop area) -> New character window (Sheet / Class / Background / Species / Abilities / Equipment / Details / Review) -> opens a blank sheet, writes it, then `levelUp.start({ key, target, picks })`. See "Sheet maker" below. |
| styles.css | all styles; dark theme tokens `--bg --bar --ink --accent --gold --panel --card --line --muted --bone --marble`; native CSS nesting. Global element/class rules leak: `header` is styled globally (use divs inside panels), and the sheet's "+ Add text" notes are `.page .note` (the roller uses `.note` too). |
| LICENSE | MIT, "Copyright (c) 2026 SannieBoi" (the user). Covers the project's own code and the Becoming Marble rules (the user's own creation); third-party parts keep their licences (CREDITS.md). |
| CREDITS.md, licenses/ | attributions (SRD 5.2 / 5.2.1 statements, Fan Content Policy notice for the official sheet, Killing Marble doc, libraries) and the library licence texts. |
| tests/ | `python tests/run.py [name]` — headless Edge tests (400 checks). See Testing. |

## Globals and events
- `window.character` — live stats, rebuilt by `refreshCharacter()` on every edit: sheet fields by `FIELD_MAP` key, plus
  `classes, level, profBonus, mods{STR..}, feats, speciesData, lineage, backgroundData, spellcasting{ability,mod,attack,dc},
  critRange, weapons[{name,bonus,damage,weapon,spell,magic,calc,fields}], spells[{spell,from}], skills, saves, initiativeMod`.
- `window.calc` = `{ weaponAttack, spellRoll, parseDice, diceText, cantripTier, fmt, WEAPONS, slotsFor(classes) }` (script.js;
  slotsFor = slots per level of [{key, level}]: multiclass caster levels, Pact slots added at their level).
- `window.sheet` (script.js, for levelup.js / rest.js / marble.js) = `{ map (the sheets.js entry or null), loaded, field(key) -> PDF field name, get(name),
  set(name, value) (writes + refreshCharacter; checkboxes take true/false), profBox(key) ('skill:X'/'save:AB' checkbox),
  multiline(name), spellLines() -> [{field, level (0 = cantrips, null = any), row (official sheet: level/time/range/notes/conc/ritual/material)}],
  writeSpell(line, spell), spellNamed(text), transaction(label, fn) (one Undo step for every write + sheetState change in fn), undo(), redo(),
  setMany([[field, value]...]) (writes all, then one refresh), weaponRows() }`. `window.openPdf(file)` opens a PDF (resolves when loaded).
- `window.levelUp.start({ key, target, picks })` (levelup.js), `window.maker = { open, state }` (maker.js).
- `window.sheetState` — saved INSIDE the PDF (Info dict key `DndSheetViewerState`, read via pdf.js `getMetadata().info.Custom`):
  `{ mode: 'default'|'marble', marble: {head,torso,rightArm,leftArm,rightLeg,leftLeg,tail, lost:{}}, effects: [user effects], extraPages,
  concentration, slotsUsed: {level: n} (all slot use, or the overflow past the official sheet's boxes), used: {resourceId: uses spent},
  hitDiceSpent: {die: n} }`. Empty maps are deleted, not left as {}.
- `window.resources` (rest.js) = `{ slots() -> [{level,total,used,left}], slotsLeft(l), slotTotal(l), useSlot(l), restoreSlot(l) (false when
  nothing to do), list() -> class features [{id,name,max,used,left,back,note}], setUsed(id, n), hitDice() -> {dice:[{die,total,spent,left}], spent, box},
  view(), slotStrip(), openRest('short'|'long') }`. Every change goes through sheet.transaction, then fires `resources-change`.
- `window.pdfHooks` — `async (doc, PDFLib) => pagesAdded`; appended pages are hidden on reopen (`extraPages`) and rebuilt on download.
- `window.effects` = `{ forRoll({kind,ability,skill,arms}), speed(base), active(), register(provider), changed(), conditions,
  concentration() -> {name, slot, duration} | null, concentrate(name|null, slot), interrupt(doing, why, endLabel) -> 'end'|'keep'|null|'none',
  askEnd(title, why) }`. `sheetState.concentration` is saved in the PDF.
  Effect rules can target a `skill` (e.g. Stealth); the roller passes `skill` for skill checks.
- `window.roller.save(ability, title)`, `window.marble = { parts, setScore, setMode, applySpread, clearAll }`,
  `window.setStat(key, v)`, `window.getField(name)`.
- `window.marble.hourPasses()` (the page's "An hour passes" button).
- Events on `document`: `character-change`, `sheet-loaded`, `effects-change`, `resources-change` (rest.js), `sheet-state-change`
  (Undo/Redo replaced sheetState: effects, marble, rest and roller redraw),
  `test-rolled` (roller.js, every check/save/initiative incl. "Again": detail `{kind:'Check'|'Save'|'Initiative', ability, skill, title, total, autoFail, purpose}`;
  purpose 'concentration' = a concentration save, which Killing Marble ignores). `roller.save(ability, title, purpose)`.
  roller.js `log()` returns the entry's element; `castSpell()` returns it too (cast() adds the concentration line).

## How the core works (script.js)
- Fields: `FIELD_MAP` aliases matched by `norm()` (lowercase alnum). Classic-sheet extras: playerName, name2 (page 2), age/height/weight/eyes/skin/hair,
  personality/ideals/bonds/flaws, allies, backstory, treasure, spellClass ("Spellcasting Class 2"), slotsExpended1-9
  ("SlotsRemaining 19-27"), and featsText = "Feat+Traits" (Additional Features & Traits, page 2: level up writes feats there). Skills `skill:<Name>`, saves `save:<AB>` added from data,
  slot totals `slots1..9` ("SlotsTotal 19" = level 1 on the classic sheet), plus `hitDiceTotal` (HDTotal) and `subclass`.
  A PDF matching a `DND.sheets[].detect` uses that map instead (`sheetMap`): fields, saves, skills, slots, profChecks
  (pre-filled into `profBoxes`), weapons (rows), spellRows. Keys holding text that may start with a digit go in `TEXT_KEYS`.
- Weapon lines: a field named wpn/weapon/attack = name; boxes to its right on the same row = bonus/damage (by name or position).
  Spell list fields: single-line fields with "spell" in the name; `spellLines()` gives each its level = the slots box nearest
  above it in its column (none = cantrips; no slot boxes on the sheet = null). Official sheet: one table, `writeSpellLine`
  also fills level / time / range / C-R-M boxes (also when a spell is picked from the autocomplete).
  Proficiency checkboxes: nearest checkbox left of a skill/save box.
- Stat propagation (`rulesFor/takeSnapshot/propagate`): each derived box has a rule; on a stat change the box shifts by the
  rule's delta (keeps expertise/items). k (PB multiplier) comes from the checkbox or the box value; rules are frozen while
  stats change and re-read once settled. Score -> mod is set outright; empty boxes get filled; AC only if it fits armor on sheet.
- Writes from code go through `writeField()` (sets `writing` so listeners don't loop, records `edits` for download;
  checkboxes take true/false and fire 'change').
- Sheet numbers win over computed ones in the roller (magic items etc.); computed values used when boxes are empty/toggles change.
- Undo/redo (`history`, `record`, `transaction`, `replay`): the field listeners record every change (before/after). A step =
  one box you typed in until it loses focus (`focusout` closes it) or a checkbox click, plus everything code wrote while it
  was open (propagation); a code write outside a step is its own step (closed in a microtask); `transaction()` groups code
  actions and also stores sheetState JSON before/after. sheetState changes made outside a step (tray, marble, concentration)
  become their own steps via `syncState()` on `effects-change`/`resources-change` (so undoing a rest never drops a later
  effect). Replay writes the stored values with `replaying` set, then `snap = null` before refreshing, so no propagation
  runs (the stored boxes are already right). Ctrl+Z/Y only when focus is on a sheet field or nothing typed (other inputs
  keep native undo). History is cleared after a load (auto-filled boxes aren't undoable). 200 steps max.
- Unsaved changes: `stamp()` = edits that differ from the PDF + notes + sheetState; compared with the stamp at load / last
  download -> `.unsaved` dot on Download and `beforeunload` asks. (Loading another PDF does not ask; not requested.)

## Rules data (source of truth: D&D Beyond Basic Rules 2024, www.dndbeyond.com/sources/dnd/br-2024)
- Checked against the source on 2026-10-03 (scripts in the session scratchpad parsed the pages with curl + html.parser).
  All class table numbers match. Feature text is our own condensed summary (project convention), never book text.
- classes.js: `levels[]` (numbers per level, incl. actionSurgeUses, indomitableUses, metamagic, arcanum, spellbook), `features[]`
  (every feature at every level it is gained, incl. repeated ASIs, with `choice` = what the player picks and `grants` = what
  changes on the sheet), `multiclass` (requires 13+, gained proficiencies), `subclass.features` with text, `subclass.spells`
  (always prepared by class level; Druid by land type), `toolChoice`, warlock.invocations (28), sorcerer.metamagic (10),
  sorcerer.fontOfMagic, druid.wildShapeForms, wizard.spellbook. Schema documented in the file header.
- rules.js: xpByLevel, hitPoints (fixed per-level values by die), levelUpSteps, multiclass (caster level rules +
  slotsByCasterLevel), backgroundAbilityIncrease. feats.js: repeatable, abilityIncrease, prerequisite.ability, choice, aliases.
- species.js: `features[]` per species (lvl, text, choice, grants; Dwarf grants.hpPerLevel), traitLevels (Draconic Flight,
  Large Form at 5). backgrounds.js: featList (Magic Initiate list), toolChoice.
- spells.js: 17 spells have `aliases` = Basic Rules names (Tasha's Hideous Laughter...). `DND.spellListOnly` = 49 spells on the
  Basic Rules class lists but not described there (Toll the Dead, smites...): name/level/school/classes/conc/ritual/material only.
  Kept out of DND.spells on purpose (no text; "Friends" etc. would false-match sheet text).
- Source contradictions (decided): the D&D Beyond spell headers wrongly add classes to 9 spells (e.g. Tiny Hut "Cleric",
  Mind Spike "Evocation cantrip"); the class tables back our tags, so spells.js classes stay. The Wizard class table omits
  spells whose own description says Wizard (Chromatic Orb...); we keep Wizard on them.
- Attribution: Wizards asks for the exact SRD statement and no other credit to them; keep it in CREDITS.md / README.txt
  only (file headers say "see CREDITS.md"). New third-party files or data go into CREDITS.md.
- What each data file holds: weapons.js DND.weapons (38), weaponProperties, masteryProperties, ammunition, attackItems, coins;
  armor.js DND.armor (12), shield, armorRules; classes.js DND.classes.{barbarian..wizard} (hit die, saves, proficiencies,
  weaponMastery, levels[0..19], attackFeatures, subclass); feats.js DND.feats (17); species.js DND.species (9, lineages,
  attackNotes); backgrounds.js DND.backgrounds (4 SRD + 12 PHB from backgrounds-more.js); rules.js abilities, skills, PB by level, damage types, attack/damage
  formulas, unarmed strike, cantrip scaling; spells.js DND.spells (roll data keys documented in its header comment).
  Example: `DND.classes.fighter.levels[4]` = level 5 (`attacks === 2`, `weaponMastery === 4`).
- Weapons/armor were transcribed from the D&D Beyond Basic Rules Equipment chapter. The SRD JSON data we compared it with
  disagreed on 11 values (Trident damage, Mace/Pike weight, Longbow and Hand Crossbow cost ...); D&D Beyond won every time.
  That SRD data also listed Longswords for Rogues (not 2024) - fixed.
- Spell roll data fixes vs the source: Conjure Animals is a DEX save, Weird has no half damage, "Thunderwavea" typo.
  Spells without damage/healing only carry their attack type / save. A few feature summaries (Hamstring Blow -15 ft, Horde
  Breaker, Divine Smite upcasting, Obscure cost, Trip/Withdraw) come from knowledge of the 2024 rules (source text cut off).
- More feats/species (user's choice, 2026-10-03: PHB + the four 2024 books, full automation, public on GitHub). The PHB
  part is from Claude's knowledge of the 2024 PHB (D&D Beyond pages are paywalled), summaries in our own words. The other
  books' entries are `brief`: never invent their rules; only what the public list shows. Guessed prerequisites (Greater
  Mark needs its Mark) are `prerequisite.text` (shown, not checked). `unsure` ability increases let any score be picked.
- Feats on the sheet: `findFeats` (script.js) skips text that holds a feat's name without being it: longer feat names
  ("Great Weapon Master" is not "Weapon Master", "Greater Mark of X" not "Mark of X") and the feat's `unless`
  ("Blessed Healer", "Healer's Kit", "Protection from", "Poisoner's Kit", "Speedy Recovery", "Unarmored Defense"). Species match by name or `aliases`; the longest match wins.
- Basic Rules scope: 1 subclass per class, 4 backgrounds, 9 species, 17 feats. The PHB adds feats, the Aasimar and 12 backgrounds.

## Rules decisions (keep consistent)
- 2024 rules. Adv + Dis cancel. Crits double dice only. Nat 1 attack = miss, no damage. Checks/saves never crit.
- Concentration (user's rule: never block, never change it without asking; they may only be trying things out):
  one spell at a time, first in the Effects tray (gold ring; × ends it). Started by casting a concentration spell from a
  spell card (the log line has Undo; "Again" in the log never touches concentration), by typing a concentration spell in
  "+ Add", or the "A spell I concentrate on" box for other names. Before something that ends it, a question with Cancel /
  "..., keep X" / "..., end X": casting another concentration spell ("Cast, switch to Y"), adding Incapacitated /
  Paralyzed / Petrified / Stunned / Unconscious, turning Rage on. After the fact (asks End / Keep): Current or Temp HP
  lowered on the sheet (compared with the value at focus, on 'change') -> damage box (editable) + DC max(10, half), max 30
  -> "Roll CON save" (purpose 'concentration'); failure asks; the tray shows the last save. 0 HP and marble head 10
  (Unconscious) ask too.
- Feats in the roller (roller.js attackSetup): switches on the attack card, on by default where they nearly always apply:
  Great Weapon Master (+PB, Heavy weapons), Dueling (+2, one-handed melee), Thrown Weapon Fighting (+2; on for ranged-kind
  thrown weapons), Charger (+1d8, off). Unarmed die = biggest of Unarmed Fighting d6/d8 ("No weapon or Shield" switch),
  Tavern Brawler d4 (reroll 1s), Martial Arts. Piercer: crit adds one die (`critExtra`). Elemental Adept: spell damage
  of the type(s) read from the sheet text after "Elemental Adept" (up to "(" or a line end) counts 1s as 2 (`min2`).
  War Caster: concentration saves (purpose 'concentration') get Advantage via withEffects' `more`. Reminder notes
  (`s.notes`) for Sharpshooter, Crossbow Expert, GWM's Hew, Piercer, Slasher, Crusher, Polearm Master, Tavern Brawler,
  Shield Master (with its DC).
- Life Domain healing (roller.js `lifeCleric/lifeHealing`): Cleric 3+ whose sheet names "Life Domain" / "Disciple of Life"
  (or "Life" in the Class/Subclass box). Healing spells cast with a slot (not cantrips, not temp HP): Disciple of Life
  +2 + slot level as its own part (chip, on by default); Cleric 6 Blessed Healer = note (you regain 2 + slot level);
  Cleric 17 Supreme Healing = healing dice at maximum (`max` flag on a rollDamage part).
- Killing Marble (user's homebrew "Becoming marble" doc): arms 2/5/7/10 -> -1/-2/-3(+ -1 DEX)/unusable, applied to weapon
  attack+damage for the arm(s) used (two-handed = both, penalties add). Legs = combined total /20. Legs 20: speed 0, numeric
  DEX penalties dropped, DEX rolls get Disadvantage. "DEX rolls" = DEX checks (incl. initiative) + DEX saves, not attacks.
  Head 5+: Disadvantage on all d20 rolls. Torso 8/16 -> -1/-2 DEX; 20 = story finished.
  Tail (house rules, suggested by Claude, user may tweak): 3+ -1 Acrobatics, 6+ Dis on Stealth, 10 speed -5 ft; cumulative.
  Spreading at 6+ (lost parts don't spread), CON save DC = 6 + that part's score (user's rule). Any CON save in marble mode
  (page button, Save tab, log "Again") is compared with every spreading part's DC -> per-card verdict (`verdicts`, not
  saved); failed -> "Apply?" adds 1 to each adjacent part that is not lost and has no marble yet (user's rule, 2026-10-03:
  marble spreads only into unmarbled parts), once. No such neighbour -> no Apply, "nowhere unmarbled to spread to".
  Total == DC = resisted.
  Torso adjacent to everything; others adjacent to torso only. "Clear all marble" (2 clicks) zeroes scores, keeps `lost`.
- Sides are named as the viewer sees them (user asked): Left arm card/point on the viewer's left. Part ids unchanged.
- Marble page is in every download while mode is 'marble' (no edits needed); Default mode leaves it out.
- "An hour passes" (user asked, from their "Becoming marble 2" doc: "a score is given once every hour, and if spreading, a
  con save is made"): every part with marble that isn't lost or full gains 1 (read as: each infected part, not one point in
  total). The question lists each change and the rules it reaches; "Apply" or "Apply and roll CON save" (only when a part
  spreads into an unmarbled neighbour after the hour; the normal verdict / "Apply?" flow follows). One transaction (Undo).
  One hour per click; rests don't move the marble (their window says so).

## Rests and resources (rest.js) — decisions
- Spell slots (user's spec): casting never uses a slot by itself; the log entry gets "Use a level N slot (x left)" (then
  "Used ... · Undo"). No slot left at that level (or none at all, e.g. a Fighter) -> ask first: Cancel / "Cast anyway"; the
  entry then says "No level N slot left: cast anyway." Only with a sheet loaded. "Again" never offers a slot. Smites
  (`time` says "immediately after hitting") use a slot per extra-damage roll (also when toggled on an attack card); Hex,
  Hunter's Mark, Divine Favor get a Cast button that uses the slot, their damage rolls don't. Every levelled spell card shows
  slot buttons up to 9 (empty levels crossed out) and "Level N slots: x of y left".
- Totals: the sheet's slots box, else `calc.slotsFor` from the classes. Used: the `slotsExpended1..9` box when the sheet has
  one (classic WotC sheet: "SlotsRemaining 19-27" is the box PRINTED "Slots Expended", checked against the real PDF;
  read and written as a number, empty = 0, sheetState ignored for that level), else the official sheet's expended
  checkboxes (ticked in order) + `sheetState.slotsUsed` overflow, else sheetState only. The user asked for this
  (2026-10-04: typing expended slots on the sheet must be read and written).
- Class features: `RESOURCES` in rest.js (id, class, from level, max from the class table row, back: short / short1 (one
  back on a Short Rest) / long). Includes Lucky's Luck Points (PB). Nothing is spent automatically (Rage toggle, Second Wind
  etc. don't touch the counters: user rule, never change state on their behalf).
- Hit Point Dice: total from class levels (else the Hit Dice text); spent in the official sheet's box (Text18) + per-die map
  in sheetState. Classic sheet (hitDiceTotal "HDTotal" AND hitDice "HD", no spent box): HD = the dice LEFT ("3d8",
  "3d8 + 2d6" or a plain count, written back in the same style; all spent = "0d8"), as levelup.js already treats it;
  text it can't read ("d8", dice the classes don't have) falls back to sheetState. Other sheets: sheetState only.
- Sheet damage text "1d6/8 -1" or "1d6/1d8" (versatile written on one line): roller.js parseDamageText keeps the first die
  (the user's sheet had it; "/8" used to count as +8).
- Rest window = level-up window styles, draggable, tick-box review, Apply = one transaction, then a note until Close.
  Short: roll Hit Point Dice (die + CON, min 1, × to take back), short/short1 features, Pact slots; Arcane Recovery
  (biggest spent slots first, budget ceil(Wizard level / 2), none 6+) and Sorcerous Restoration are offered UNTICKED
  (optional uses: `off` rows start unticked, `R.seen`). Long (2024 rules, checked on D&D Beyond): HP to max, Temp HP cleared,
  all Hit Point Dice back, all slots, all features, Exhaustion -1, official death-save boxes cleared, "End concentration on X"
  ticked when its duration <= 8 hours; a note at 0 HP (needs 1 HP to start).
- Weapon Mastery (roller.js): switch "Mastery: X" on the attack card when a class has weaponMastery or the Weapon Master
  feat. On by default unless the sheet has a line mentioning "master" that names weapons and this one isn't among them.
  Log line per mastery: Graze (ability mod damage on a miss; "missed" on a nat 1), Topple (DC 8 + mod + PB), Sap / Slow /
  Push / Nick reminders; Vex: "It hit: Advantage next" sets `state.vex` -> the next weapon or spell attack roll gets
  Advantage (withEffects `more`), shown on cards with "Drop it"; Cleave: button rolls a second attack ("X (Cleave)") whose
  first damage part loses a positive ability modifier.

## Sheet maker (maker.js) — decisions
- User's choices (2026-10-04): offer the classic 2014 sheet (like their Arxen sheet) and the official 2024 sheet (our own
  design later, not a priority); build level 1, then Level up per level up to the starting level; 2024 starting
  equipment packages in the data; all 16 PHB backgrounds.
- The maker only does what needs no feat/feature pickers; everything with pickers is Level up's first-level mode, so both
  share one engine. Maker steps write (one `sheet.transaction('New character')`): identity, scores (classic: the MODIFIER
  goes in the big box named "STR" and the score in the oval "STRmod", as on the user's sheet; sortAbilities then swaps
  fieldOf), background name + its skill ticks, species "Elf (High Elf)", size, speed (+5 Wood Elf), AC (armor + DEX cap,
  Shield, Barbarian/Monk Unarmored Defense), equipment (packs expanded), gold, languages (+ background tool: official
  boxes, else classic Proficiencies box), details (classic boxes; official Appearance / Backstory & Personality boxes),
  attack lines (weapons found in the items, as many as the sheet's rows), and fills every save/skill/Initiative/Passive box
  still empty (a +0 doesn't propagate on a blank sheet). XP = the minimum for the starting level unless typed.
- Hands over `picks`: `'sp:<lineage feature>'` = { name, ability } (default ability = the class's casting ability),
  `'mc:tools'` = the Monk's tool chosen in the equipment step.
- Standard array starts as "Standard Array by Class"; picking a value swaps it with the ability that had it; rolls are
  placed by the class's priority; point buy starts from the class array (exactly 27). Background bonus defaults: +2/+1 to
  the class's top-priority abilities among the background's three.
- Brief species: allowed, with a warning (no size/speed/traits rules). No "Other background".
- The button lives in #pages, so it disappears once a sheet is open (F5 to make another).

## Level up (levelup.js) — decisions
- New character's level 1 (`L.first`: no class on the sheet; `start(opts)` from the maker, or the header button on a
  classless sheet): full class proficiencies (saves, armor, weapons, tools + `toolChoice` via 'mc:tools', skills via
  'mc:sk' with the class's count), HP = Hit Die max + CON (no roll), Max/Current HP and both Hit Dice boxes written, PB box
  filled, Class box "Cleric 1" (official: "Cleric" + Level box), spellcasting class box, the background's Origin feat as
  a feature ('origin', preselected), species level-1 traits incl. 'lineage' choices (lineagePick). `fixedClass` hides the
  Class step. `target`: after Apply a "Level N of T →" button starts the next Level up directly (and "Stop here").
- Button asks first (confirm box), then the window. It is not modal and can be dragged by its title bar (`window.draggable`
  in dialog.js keeps the bar on screen; uses offsetLeft/Top, not the bounding box, which moves during the pop-in animation).
  Apply runs inside `sheet.transaction`, so one Ctrl+Z takes the whole level up back.
- Nothing is written until "Apply to sheet" on Review (user's wish). Review lists every change as a tick-box row grouped
  Level / Hit Points / Ability Scores / Proficiencies / Spells / Features / Class numbers (info) / Still to choose (warnings).
  After Apply the window stays open as a note (✓ applied, – skipped) until Close; rows and steps are frozen at apply time.
- `changes()` rows: `{group, id, label, from, to, note, apply(ctx), order}`; Apply runs ticked rows by `order`: class/level (10,
  PB and everything proficient follows by propagation) -> Max HP (20) -> Hit Dice (25) -> scores (30; CON adds 1 HP/level via
  the hpMax rule) -> skills/saves (40, Expertise 41, Jack of All Trades 42) -> speed (45) -> current HP (60: +the Max HP rise)
  -> proficiency text (70) -> spells (80, swaps 81) -> slots (85) -> spellcasting boxes for a first caster class (86) -> feature lines (90).
- HP: fixed value pre-selected, Roll button (re-rollable, user prefers no limits), min 1, + Dwarven Toughness, + Draconic
  Resilience (+class level when gained, +1 later). Current HP rises with Max HP (own tick box).
- Multiclass: any class can be picked; unmet 13+ requirements show a warning but don't block (DM may allow). New class gets
  multiclass proficiencies (skills/tools pickers), its level 1 features, its Hit Die, and per-level HP (not max).
- Feat choices list General + Origin feats (2024: "any feat you qualify for"), Epic Boons at 19, "Other feat" (typed name)
  for non-SRD feats. Prerequisites grey a feat out. ASI default = +2 to the class's main ability.
- Subclass: free-rules subclass or "Another subclass" (typed name; its features become a "add it yourself" note). Found on
  the sheet by SUB_WORD in the Class/Subclass boxes or the full name in Features; if not found at a subclass level, asked.
  Without a Subclass box the name goes into the Class box: "Fighter 3 (Champion)".
- Spells: new cantrips/prepared = class table difference; max level = highest slot of that class's own table (pact level for
  Warlock); Bard 10+ also Cleric/Druid/Wizard lists; Wizard adds spellbook spells (a spell may be both in the book and newly
  prepared); one optional cantrip swap and one spell swap per level; always-prepared spells (subclass, Paladin's Smite...,
  species lineage spells) are added; Circle of the Land spells are not written (they change each Long Rest). New spells go in
  a free line of their level's block, else any free line. Slot boxes shift by the table difference (multiclass caster levels
  added, half casters round up; Pact slots added to their level's box).
- Text lines: features -> Features box ("Name (Fighter 5): text"); feats -> Feats box on the official sheet; species traits ->
  Species Traits box; weapons/tools/languages -> their official boxes, else Proficiencies; armor -> official armor checkboxes.
  A choice not made writes nothing (listed under "Still to choose"). Sheet text uses no → / ✓ (WinAnsi).
- Weapon Mastery counts come from `weaponMastery.countByLevel` (Rogue/Paladin/Ranger have no table column for it).
- Feats: FEAT_CATS lets general/epic slots take origin and dragonmark feats too. The picker has search + a book filter
  (`L.ui[f.id]`; the list refills without a full render so the search box keeps focus). Prerequisites checked: level,
  ability (`any` = one of), Spellcasting, armor training (`hasArmor`: official armor boxes, else classes' `armorTraining` /
  multiclass armor, armor feats on the sheet, Proficiencies text; no class = yes). Feat sub-picks use ids `f.id + ':sk'
  (skills) ':sx' (skill or Expertise) ':ex' (Expertise) ':dt' (damage type) ':wm' (mastery) ':tools' ':fs' (feat spells)`.
  Tough: +2 per level on the sheet, +2 x level when taken; Boon of Fortitude +40; feat `grants` go through collect().

## Testing
- `python tests/run.py` (or `run.py marble|roller|derived|levelup|official|sweep|heal|feats|concentration|rest`). Tests build their own PDF with pdf-lib, drop it in, force dice via a
  patched `crypto.getRandomValues` (`forced = [values]`), capture downloads by patching `URL.createObjectURL`.
- `tests/official-2024-sheet.pdf` = the blank official sheet (from the Basic Rules index page); official.test.js reads it with
  XHR (works with --allow-file-access-from-files), fills a Wizard 4 and levels it.
- concentration.test.js: casting/switching/Undo, conditions, tray form, damage saves (incl. Again), 0 HP, Rage, marble head 10.
  rest.test.js: slot use from the log / pips / "Cast anyway", Rest tab, Short Rest (Hit Point Dice, Arcane Recovery), Long
  Rest (slots, Exhaustion, concentration), Undo/Redo of rests and of a stat change (Ctrl+Z/Y), a later tray change as its
  own step, Fighter features, unsaved dot, classic "Slots Expended" and Hit Dice boxes read/written, "1d6/8 -1" damage. roller.test.js also covers Weapon Mastery (Graze, Vex, Cleave, mastered list);
  marble.test.js "An hour passes"; official.test.js slot boxes, Hit Dice spent box, undoing rests and the level up.
- A Fighter casting from the Spell tab now gets the "no slots, cast anyway?" question: tests answer it (`castAnyway`).
  heal.test.js: Life Domain healing. feats.test.js: feat/species data counts, reading feats/species off a sheet (incl.
  look-alike text), roller feats (GWM, Dueling, Piercer crit, Tavern Brawler, Elemental Adept, War Caster), level-up feats
  (prerequisites, search, Tough HP, Resilient, Speedy, Fey Touched spells, an `unsure` feat).
- maker.test.js: the button, both sheets with pictures, an Elf Cleric on the classic sheet (array swap, equipment/AC,
  details, every box written, Level 1 with skills, Divine Order, Magic Initiate (Wizard), lineage ability, spells) and a
  Human Monk 3 on the official sheet (PHB background + tool, size, point buy, 4d6 rolls, Monk tool -> 'mc:tools',
  Versatile feat, the Level 2 / Level 3 chain).
- levelup.test.js: named sheets (ASI, Dwarf HP, mastery, rolled HP, Wizard spells/slots/swap, multiclass Wizard and Rogue,
  cancel) + a synthetic official sheet. sweep.test.js: every class 1 -> 20 and multiclassing into every class, apply, no errors.
- Headless virtual time races ahead while the browser waits for real work (reading a dropped file, pdf.js): waiting with
  timers runs out, so wait for a PDF load by yielding with MessageChannel messages (see `loadSheet` in levelup.test.js).
  run.py retries once when the browser hands back an empty page.
- Headless gotchas: screenshots after scrolling come out blank/offset (use a tall window + `scrollTo(0,0)` or zoom out);
  focus is lost on screenshot, which closes the autocomplete list.

## Environment gotchas (Windows)
- Bash tool: heredocs containing apostrophes sometimes fail ("unexpected EOF") -> write a .py/.css file with the Write tool, then run it.
- No node/deno; Python has no PIL. Edge: `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`.
- pdf-lib text must be WinAnsi: replace − → ✓ etc. before `drawText` (see `pdfText`/`clean`).

## User preferences
- No limit on rolling; every roll repeatable with Advantage/Disadvantage. Wants it to look "cool" (keep dark red/gold style).
- Suggest simpler alternatives when a spec is complicated, but build it if it's workable.
- Never block the user or change state on their behalf: warn and ask (with a "do it anyway / keep" choice). They may
  just be trying things out while waiting for their turn.
- Times in 24-hour format (roll log uses `hourCycle: 'h23'`).
- Wants to see changes before they hit the sheet: a draggable note window listing them, with Apply / Cancel (level up).

## Open items
- Level up, not done yet: Magic Initiate's spellcasting ability isn't asked; swapping an invocation / Magic Initiate spell
  on level-up isn't offered; the classic sheet's "prepared" circles next to spell lines aren't ticked; Wizard spellbook vs
  prepared isn't told apart on the sheet.
- PHB-only spells (Toll the Dead text/rolls) and subclasses are still outside the data.
- The four other 2024 books' feats/species are names only (`brief`). If the user pastes a feat's text, fill in its
  summary/choices/automation and drop `brief`.
- Feat automation not done: Lucky,
  Mage Slayer, Sentinel, Heavy Armor Master, Poisoner, Spell Sniper range, Medium Armor Master AC.
- Marble: tail debuffs are Claude's suggestion, awaiting user feedback. Whether "An hour passes" should also run during
  rests (1 / 8 hours) is the user's call; for now rests leave the marble alone.
- Rests/resources not done: species uses (Breath Weapon, Adrenaline Rush ...), subclass uses (Wholeness of Body, Natural
  Recovery), Second Wind / Lay On Hands rolls from the counters, Magical Cunning's slot recovery, Relentless Rage DC.
- Sheet maker, not done: our own sheet design (user: later); "Other background"; brief species' size/speed; Bard's three
  instruments aren't tied to the equipment instrument; starting magic items for higher levels are a note only.
- Ideas suggested to the user and not built yet: Damage/Heal/Temp HP buttons, death saves roller, Heroic Inspiration and
  Lucky rerolls in the log, copy a roll as text, roller keyboard shortcuts, asking before loading another PDF over unsaved changes.
