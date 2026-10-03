D&D 2024 DATA FOR ATTACK ROLLS
==============================
Load the files with plain <script> tags (they work offline, straight from disk, unlike .json which browsers block on file://).
Each file adds to one global object, window.DND:

  weapons.js      DND.weapons (38), DND.weaponProperties, DND.masteryProperties, DND.ammunition, DND.attackItems, DND.coins
  armor.js        DND.armor (12), DND.shield, DND.armorRules
  classes.js      DND.classes.{barbarian ... wizard}: hit die, saves, armor/weapon proficiency, weaponMastery counts,
                  levels[0..19] (proficiency bonus, features, attacks per Attack action, rage/martial arts/sneak attack numbers,
                  spell slots), attackFeatures (plain-language summaries), subclass (the one in the free rules)
  feats.js        DND.feats (17): origin, general, fighting style, epic boon
  species.js      DND.species (9) with lineages/ancestries and attackNotes
  backgrounds.js  DND.backgrounds (4)
  rules.js        abilities, skills, proficiency bonus by level, damage types, attack/damage formulas, unarmed strike, cantrip scaling
  spells.js       DND.spells (339, the whole SRD 5.2 list): level, school, classes, casting time, range, duration, full text,
                  and roll data (atk / save / half / dmg / up / count / heal / rider ...; see the comment at the top of the file)

Example:  const lvl5 = DND.classes.fighter.levels[4];   // lvl5.attacks === 2, lvl5.weaponMastery === 4

WHAT script.js READS FROM THE SHEET (window.character, refreshed on every edit)
- Sheet fields from FIELD_MAP (or the official sheet's map in sheets.js): name, classLevel, race, background, abilities +
  modifiers, profBonus, spell DC/attack, features, proficiencies, equipment, Hit Dice, spell slots, ...
- classes [{key, name, level}] and level, parsed from text like "Fighter 5" or "Rogue 3 / Wizard 2"
- feats: feat names from DND.feats found anywhere in the sheet's text (e.g. "Archery" adds +2 to ranged attacks)
- speciesData / lineage / backgroundData: the matching DND entries
- weapons [{name, bonus, damage, weapon, magic, calc}]: one per weapon line. "Longsword +1" or "Crossbow, light" still match
  a DND weapon; calc = {ability, proficient, toHit, damage, type, versatile} worked out from the rules.
  Weapon lines are found by field name (wpn/weapon/attack) and the attack/damage boxes to the right on the same line.
- spellcasting {class, ability, attack, dc}: the sheet's spell attack / DC boxes win, otherwise worked out from the class
- spells [{spell, from}]: spell names found in the sheet's text, plus species spells (e.g. Infernal Tiefling: Fire Bolt)
- skills / saves [{name, ability, mod, fromSheet}], initiativeMod, mods {STR: 3, ...}, critRange (19 for Champions)
Typing in a weapon, spell, class, species or background field shows suggestions; picking a weapon (or an attack cantrip on a
weapon line) fills its attack bonus and damage.

STATS UPDATE THE BOXES THAT DEPEND ON THEM
Change a stat and every box worked out from it follows: score -> modifier; modifier -> skills, saves, initiative, passive
Perception, spell attack/DC, AC (armor named on the sheet, or Unarmored Defense), HP max (CON x level), weapon lines;
level -> proficiency bonus -> everything proficient. Boxes move by the change, so expertise, magic items and other extras
already in them are kept. Proficiency comes from the checkbox in front of a skill/save (ticking it adds PB) or, without one,
from the number in the box. Empty boxes are filled in. AC is only touched when its number fits the armor on the sheet.

THE OFFICIAL 2024 SHEET
The fillable WotC 2024 sheet names its boxes Text1, Text2 ... so they can't be matched by name. sheets.js holds a map of
that PDF; when you load it the app recognises it (the status line says so) and reads stats, skills, proficiency boxes,
the six attack lines, the spell table and the slot boxes from the map. Picking a spell in its spell table also fills in
the level, casting time, range and the C / R / M boxes.

LEVEL UP (levelup.js, the gold "Level up" button in the header)
It asks first, then opens a window you can drag around by its title bar while you look at the sheet:
1. Class: the class you have (or classes), or a new class (multiclassing; a warning if you miss the 13+ requirement).
2. Hit Points: the fixed value for your Hit Die (picked by default) or Roll (roll again as often as you like); + CON
   modifier, at least 1, + Dwarven Toughness / Draconic Resilience. Max and current HP go up, and you gain a Hit Die.
3. Features: every feature of the new level with its text, and the choices it asks for: subclass, Ability Score Improvement
   or a feat (prerequisites checked, or type in a feat from another book), Fighting Style, skills, Expertise, languages,
   Weapon Mastery, Eldritch Invocations, Metamagic, Mystic Arcanum, options such as Divine Order. A new class also gets its
   multiclass proficiencies.
4. Spells (spellcasters): new cantrips and prepared spells (Wizards: spellbook spells too), a swap of one cantrip and one
   spell if you like, spells that are always prepared, and the new spell slots.
5. Review: every change, each with a tick box. Nothing is written to the sheet before you press "Apply to sheet" (Cancel
   throws it all away). Then the level, HP, Hit Dice, scores, proficiencies, speed, spells, slots and feature lines are
   written, and the boxes that follow them move too (proficiency bonus, skills, saves, attacks, spell DC, HP from CON).
   The window stays open as a note of what changed until you close it. Choices you skipped are listed under "Still to
   choose" and nothing is written for them.

THE ROLL PANEL (roller.js, right side of the screen)
Attack, Spell, Check, Save, Initiative and Dice. Pick what you roll with, then Roll / Advantage / Disadvantage as often as
you like; every roll in the log has Again / Advantage / Disadvantage buttons too. Handles crits (doubled dice, Champion
19-20), Rage, Sneak Attack, smites and other rider spells, Bless, Guidance, Great Weapon Fighting, Savage Attacker, True Strike,
Shillelagh, Agonizing Blast, Life Domain healing (Disciple of Life, Blessed Healer, Supreme Healing), upcasting,
extra beams/rays/darts and free dice like 4d6kh3.

CONCENTRATION (in the Effects tray)
- Casting a concentration spell from a spell card starts concentrating on it (the roll log has an Undo); you can also type
  a concentration spell in "+ Add" (or tick "A spell I concentrate on" for one from another book). × ends it.
- Nothing is blocked and nothing ends behind your back. Before something that would end it you are asked: casting another
  concentration spell (switch, or cast and keep the old one), adding Incapacitated / Paralyzed / Petrified / Stunned /
  Unconscious, turning Rage on. Lowering Current or Temp HP on the sheet offers the Constitution save (DC 10 or half the
  damage; you can correct the damage first); a failed save, 0 HP or a marble head at 10 asks whether to end it.

EFFECTS TRAY (bottom left) AND KILLING MARBLE
- The Effects tray lists everything that changes your rolls: conditions (2024 rules, e.g. Poisoned, Exhaustion 2), your own
  debuffs or buffs ("+ Add": disadvantage / advantage / bonus / penalty / speed change, or just a reminder) and Killing Marble.
  The roller applies them automatically; Advantage and Disadvantage cancel as in the rules. Speed changes show at the bottom.
- The header switch "Default / Killing Marble" adds the Becoming Marble page after the sheet: marble scores for head, torso,
  arms, legs and tail with the debuff thresholds ticked as they are reached, "lost" boxes for broken parts, and a CON save
  button for spreading. In Killing Marble mode attack cards ask which arm you attack with. Left/Right are as you look at the
  page (the Left arm box is on your left).
- Spreading: a part at 6+ spreads (DC 6 + its score). After any CON save in Killing Marble mode (the page's button, the Save
  tab, or "Again" in the log), every spreading part shows Resisted or Failed against its own DC; a failed one gets "Apply?",
  which adds 1 to each adjacent part that has no marble yet (lost parts are skipped). A part whose neighbours are all
  marbled already has nowhere to spread, so it gets no "Apply?". Concentration saves don't count as spread saves.
- Tail (house rules, not in the doc): 3+ -1 Acrobatics, 6+ Disadvantage on Stealth, 10 speed -5 ft.
- "Clear all marble" (click twice) sets every part to 0, e.g. after a spell; lost parts stay lost.
- Mode, marble scores and your own effects are saved inside the downloaded PDF. While Killing Marble is on, the Becoming
  Marble page is always part of the download (no other edits needed); switch back to Default and it is left out.

SOURCES AND CHECKS
- Weapons/armor: transcribed from the D&D Beyond Basic Rules (2024) Equipment chapter.
- Classes/feats/species/backgrounds: SRD 5.2.1 rules data (the open-licence version of the same rules).
- I compared the weapon table with the SRD data: they disagreed on 11 values (Trident damage, Mace/Pike weight, Longbow and
  Hand Crossbow cost, ...). The D&D Beyond table was used in every case, so the SRD data has errors. Class progression numbers
  were sanity-checked against the 2024 rules. The SRD data also listed Longswords for Rogues (not allowed in 2024) - fixed.
- Spells: parsed from the SRD 5.2 spell chapter (github.com/springbov/dndsrd5.2_markdown). Roll data for the 102 spells that
  roll damage or healing was checked by hand against each spell's text (fixes: Conjure Animals is a DEX save, Weird has no
  half damage, the source's "Thunderwavea" typo). Other spells only carry their attack type / save from the text.
- Feature text is condensed into short summaries, not copied. A few details in the summaries (Hamstring Blow -15 ft, Horde Breaker,
  Divine Smite upcasting, Obscure cost, Trip/Withdraw) come from knowledge of the 2024 rules because the source text was cut off.

NOT INCLUDED YET
- Spells outside the SRD (e.g. Toll the Dead, Booming Blade), PHB-only feats (Great Weapon Master, Sharpshooter ...),
  subclasses other than the one per class in the free rules (level up asks you to add their features yourself),
  monsters, the effects of Warlock invocations in the roller (except Agonizing Blast),
  Bard instrument choices, equipment other than weapons/armor, the glossary (improvised weapons, grapple/shove).

CREDITS AND LICENCES
D&D Character Sheet Editor, including Killing Marble and its "Becoming Marble" rules, is by SannieBoi, MIT License (see
LICENSE): use it, change it, share it, but keep the copyright notice and licence text in every copy.
This work includes material from the System Reference Document 5.2.1 ("SRD 5.2.1") by Wizards of the Coast LLC, available
at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License,
available at https://creativecommons.org/licenses/by/4.0/legalcode.
This work includes material from the System Reference Document 5.2 ("SRD 5.2") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License,
available at https://creativecommons.org/licenses/by/4.0/legalcode.
CREDITS.md lists what was changed, the official character sheet in tests/ (Fan Content Policy notice), the Killing Marble
material and the libraries (PDF.js, pdf-lib); their licence texts are in licenses/.