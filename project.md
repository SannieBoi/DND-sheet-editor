# D&D Sheet Viewer — project notes for Claude

Keep this file current: update it at the end of any change that adds files, globals, events, rules decisions or open items.
`readme.txt` is the user-facing doc; this file is for working on the code.

Git: github.com/SannieBoi/DND-sheet-editor, branch `main`. `.gitignore` leaves out tests/_out and __pycache__.

## What it is
An offline character-sheet tool: open `index.html` straight from disk (file://, no server, no build, no npm). Load a
fillable D&D 2024 character sheet PDF, edit its fields, roll dice from it, download the edited PDF.
Plain `<script>` tags only (no modules/fetch: file:// blocks them). Every script is an IIFE; cross-file contact is via
`window.*` globals and DOM events.

## Files (load order in index.html)
| File | Role |
|---|---|
| pdf.min.js, pdf.worker.min.js (pdf.js 3.11.174), pdf-lib.min.js | render PDF / write PDF. Never edit. |
| rules, weapons, armor, classes, feats, species, backgrounds, spells .js | rules data -> `window.DND` (see readme.txt and "Rules data" below). spells.js = 339 SRD 5.2 spells, roll data hand-checked for 102 (built by a parser from github.com/springbov/dndsrd5.2_markdown). |
| sheets.js | `DND.sheets`: field maps of PDFs with meaningless field names. Holds the official WotC 2024 sheet (Text1, Check Box3...). script.js detects it (`detect`: page count + field names) and uses the map instead of `FIELD_MAP`. Its Feats box key is `featsText` (not `feats`: that name is taken by `character.feats`). |
| script.js | core: PDF load/render/overlay fields, field matching (`FIELD_MAP`, or the `sheetMap` from sheets.js), `character`, autocomplete, stat propagation, weapon/spell math, spell lines, zoom, download. |
| dialog.js | `window.ask({ title, text, body, buttons:[{label,value,primary}] })` -> Promise of the clicked value (null on Escape / click outside). The one question box for every script (`.ask` styles). |
| effects.js | effects tray (bottom left): concentration, conditions, user debuffs, providers; `effects.forRoll()` used by every roll. |
| marble-body.js | body outline JPEG as a data URI (`window.MARBLE_BODY`), needed for the PDF and file://. |
| marble.js | "Killing Marble" mode: header switch, Becoming Marble page, marble debuffs (effects provider), PDF page hook. |
| roller.js | dice roller panel (right): attack/spell/check/save/initiative/dice tabs, log, animations. |
| levelup.js | "Level up" header button: confirm box, then a draggable window (Class / Hit Points / Features / Spells / Review). Writes only on Apply, through `window.sheet`. See "Level up" below. |
| styles.css | all styles; dark theme tokens `--bg --bar --ink --accent --gold --panel --card --line --muted --bone --marble`; native CSS nesting. Global element/class rules leak: `header` is styled globally (use divs inside panels), and the sheet's "+ Add text" notes are `.page .note` (the roller uses `.note` too). |
| LICENSE | MIT, "Copyright (c) 2026 SannieBoi" (the user). Covers the project's own code and the Becoming Marble rules (the user's own creation); third-party parts keep their licences (CREDITS.md). |
| CREDITS.md, licenses/ | attributions (SRD 5.2 / 5.2.1 statements, Fan Content Policy notice for the official sheet, Killing Marble doc, libraries) and the library licence texts. |
| tests/ | `python tests/run.py [name]` — headless Edge tests (209 checks). See Testing. |

## Globals and events
- `window.character` — live stats, rebuilt by `refreshCharacter()` on every edit: sheet fields by `FIELD_MAP` key, plus
  `classes, level, profBonus, mods{STR..}, feats, speciesData, lineage, backgroundData, spellcasting{ability,mod,attack,dc},
  critRange, weapons[{name,bonus,damage,weapon,spell,magic,calc,fields}], spells[{spell,from}], skills, saves, initiativeMod`.
- `window.calc` = `{ weaponAttack, spellRoll, parseDice, diceText, cantripTier, fmt, WEAPONS }` (script.js).
- `window.sheet` (script.js, for levelup.js) = `{ map (the sheets.js entry or null), field(key) -> PDF field name, get(name),
  set(name, value) (writes + refreshCharacter; checkboxes take true/false), profBox(key) ('skill:X'/'save:AB' checkbox),
  multiline(name), spellLines() -> [{field, level (0 = cantrips, null = any), row (official sheet: level/time/range/notes/conc/ritual/material)}],
  writeSpell(line, spell), spellNamed(text) }`.
- `window.sheetState` — saved INSIDE the PDF (Info dict key `DndSheetViewerState`, read via pdf.js `getMetadata().info.Custom`):
  `{ mode: 'default'|'marble', marble: {head,torso,rightArm,leftArm,rightLeg,leftLeg,tail, lost:{}}, effects: [user effects], extraPages }`.
- `window.pdfHooks` — `async (doc, PDFLib) => pagesAdded`; appended pages are hidden on reopen (`extraPages`) and rebuilt on download.
- `window.effects` = `{ forRoll({kind,ability,skill,arms}), speed(base), active(), register(provider), changed(), conditions,
  concentration() -> {name, slot, duration} | null, concentrate(name|null, slot), interrupt(doing, why, endLabel) -> 'end'|'keep'|null|'none',
  askEnd(title, why) }`. `sheetState.concentration` is saved in the PDF.
  Effect rules can target a `skill` (e.g. Stealth); the roller passes `skill` for skill checks.
- `window.roller.save(ability, title)`, `window.marble = { parts, setScore, setMode, applySpread, clearAll }`,
  `window.setStat(key, v)`, `window.getField(name)`.
- Events on `document`: `character-change`, `sheet-loaded`, `effects-change`,
  `test-rolled` (roller.js, every check/save/initiative incl. "Again": detail `{kind:'Check'|'Save'|'Initiative', ability, skill, title, total, autoFail, purpose}`;
  purpose 'concentration' = a concentration save, which Killing Marble ignores). `roller.save(ability, title, purpose)`.
  roller.js `log()` returns the entry's element; `castSpell()` returns it too (cast() adds the concentration line).

## How the core works (script.js)
- Fields: `FIELD_MAP` aliases matched by `norm()` (lowercase alnum). Skills `skill:<Name>`, saves `save:<AB>` added from data,
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
- Attribution: Wizards asks for the exact SRD statement and no other credit to them; keep it in CREDITS.md / readme.txt
  only (file headers say "see CREDITS.md"). New third-party files or data go into CREDITS.md.
- Basic Rules scope: 1 subclass per class, 4 backgrounds, 9 species, 17 feats. Nothing from the full PHB.

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

## Level up (levelup.js) — decisions
- Button asks first (confirm box), then the window. It is not modal and can be dragged by its title bar (`place()` keeps the
  bar on screen; uses offsetLeft/Top, not the bounding box, which moves during the pop-in animation).
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

## Testing
- `python tests/run.py` (or `run.py marble|roller|derived|levelup|official|sweep|heal`). Tests build their own PDF with pdf-lib, drop it in, force dice via a
  patched `crypto.getRandomValues` (`forced = [values]`), capture downloads by patching `URL.createObjectURL`.
- `tests/official-2024-sheet.pdf` = the blank official sheet (from the Basic Rules index page); official.test.js reads it with
  XHR (works with --allow-file-access-from-files), fills a Wizard 4 and levels it.
- concentration.test.js: casting/switching/Undo, conditions, tray form, damage saves (incl. Again), 0 HP, Rage, marble head 10.
  heal.test.js: Life Domain healing.
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
- PHB-only content (Toll the Dead text/rolls, GWM, Sharpshooter, other subclasses) is outside the source.
- Marble: per-hour progression is not automated (manual +). Tail debuffs are Claude's suggestion, awaiting user feedback.
