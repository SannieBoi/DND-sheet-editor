D&D CHARACTER SHEET EDITOR
==============================
Short tutorial information:

To begin, just run the index.html file.
Load a character sheet (.pdf) to view it and make changes. Note that you will need to save your changes using the "Download with changes" button at the top

If the tool cannot read your stats, try spelling it differently.

Attack rolls, spells, checks, saves, initiative, and dice rolls can be used from the Roll tab on the right.

Effects and concentrations can be added from the effects tab at the bottom left.
==============================
Short Killing Marble information:

The Killing Marble tab is a mechanic for my own campaign, so not much detail will be given on how to use it.
==============================


FULL GUIDE
==============================

1. GETTING STARTED
------------------------------
- Open index.html in your browser (double-click it). No install and no internet needed; everything runs on your computer.
- Click "Upload PDF" or drop a PDF onto the page.
- The sheet must be a fillable PDF (one with boxes you can type in). Two kinds work:
  - The official D&D 2024 character sheet from Wizards of the Coast. The tool recognises it and the status line at the
    top says so.
  - Other fillable sheets whose boxes have sensible names (e.g. "STR", "ClassLevel", "Wpn Name").
- Nothing is saved until you press "Download with changes". That gives you a new copy of the PDF with your edits.
  Open that copy next time to carry on where you left off.
- While you have changes that aren't in a downloaded PDF yet, the Download button shows a gold dot, and closing the tab
  asks first.

2. EDITING THE SHEET
------------------------------
- Click any box on the sheet and type.
- Suggestions: typing in a weapon, spell, class, species or background box shows a list. Picking a weapon fills in its
  attack bonus and damage. On the official sheet, picking a spell also fills in its level, casting time, range and the
  Concentration / Ritual / Material boxes.
- Boxes follow each other. Change a score and its modifier, skills, saves, initiative, passive Perception, spell attack and
  save DC, AC, max HP and attack lines move with it. Change your level and the proficiency bonus (and everything you're
  proficient in) follows. Boxes move by the change, so expertise, magic items and other extras you added are kept.
- Proficiency: tick the box in front of a skill or save and it gains your proficiency bonus.
- Numbers on the sheet win. If a box already holds a number (for example a +1 weapon), the roller uses it.
- "+ Add text", then click anywhere on the sheet to write a note there.
- Undo / Redo: Ctrl+Z and Ctrl+Y (or Ctrl+Shift+Z), or the two arrow buttons in the header. One undo takes back one thing
  you did, together with every box that followed it: change STR and its modifier, skills and attack lines all go back
  with it. A level up, a rest, a spell slot, an effect you added or a marble score count as one step each.
- Zoom with the slider on the right, or Ctrl + mouse wheel. Click the % button to go back to 100%.

3. LEVEL UP (gold button in the header)
------------------------------
It asks if you're sure, then opens a window you can drag around by its title bar, so you can still see the sheet.
1. Class: level up a class you have, or pick a new one (multiclassing). If you don't meet the 13+ requirement it warns
   you but still lets you (your DM may allow it).
2. Hit Points: the fixed value for your Hit Die is picked; press Roll to roll instead (as often as you like). Your
   Constitution modifier is added, and Dwarven Toughness / Draconic Resilience too. You also gain a Hit Die.
3. Features: every new feature with a short description, and any choices it needs: subclass, Ability Score Improvement
   or a feat, Fighting Style, skills, Expertise, Weapon Mastery, Eldritch Invocations, Metamagic, and so on.
   Feats come from the free rules, the Player's Handbook (2024), Forge of the Artificer (Dragonmarks), Heroes of Faerûn and
   Lorwyn. Search them or filter by book. Feats you can't take yet are greyed out with the reason (level, ability score,
   armor training, Spellcasting). A feat's own choices appear under it: ability score, tools, spells (Fey Touched, Shadow
   Touched, Ritual Caster), skills or Expertise, damage type, weapon mastery. Tough and Boon of Fortitude raise your Max HP,
   Speedy your Speed, Resilient adds the saving throw, armor feats tick your armor training.
4. Spells (spellcasters only): new cantrips and prepared spells (Wizards: spellbook spells too), an optional swap of one
   cantrip and one spell, always-prepared spells, and the new spell slots.
5. Review: every change with a tick box. Untick anything you don't want. Nothing touches the sheet until you press
   "Apply to sheet"; Cancel throws it all away. After applying, the window stays open as a list of what changed until you
   close it. Choices you skipped are listed under "Still to choose".

4. ROLLING (the Roll tab on the right)
------------------------------
Click "Roll" on the right edge to open or close the panel. Pick a tab, pick what to roll, then Roll, Advantage or
Disadvantage. There's no limit: roll as often as you like.
- Attack: your weapon lines and attack spells. Rolls the attack, then damage (crits double the dice). Includes things
  like Rage, Sneak Attack, Great Weapon Fighting, smites and Hunter's Mark.
  Weapon Mastery (classes that have it, or the Weapon Master feat): a "Mastery" switch on the card. If your sheet lists
  your mastered weapons on a line with "Mastery" in it (level up writes one), weapons not on that list start switched
  off. The log then says what the mastery does: Graze (the damage on a miss), Topple (the save DC), Sap, Slow, Push, Nick.
  Vex has an "It hit" button: your next attack roll gets Advantage. Cleave has a button that rolls the attack against a
  second creature (its damage leaves out your ability modifier).
- Spell: your spells as cards with their text, and your spell slots as a row of dots above the list. Cast at any slot
  level (upcasting adds dice); healing spells add your bonuses (e.g. Life Domain's Disciple of Life).
  Casting doesn't use a slot by itself: the log line has a "Use a level 3 slot" button (and an Undo). If you have no
  slot of that level left, it asks first: Cancel or "Cast anyway" (for a Ritual, or a free cast from a feat or species).
  Smites use a slot each time you roll their extra damage; Hex, Hunter's Mark and Divine Favor when you press Cast.
- Check: any ability or skill check.
- Save: any saving throw.
- Initiative.
- Dice: any dice you like, e.g. 2d6+3 or 4d6kh3 (roll 4d6, keep the highest 3).
- Rest: see "Rests, spell slots and class features" below.
Feats on your sheet join in by themselves: Great Weapon Master (+Proficiency Bonus with Heavy weapons), Dueling (+2),
Thrown Weapon Fighting, Charger (+1d8 when you charge), Unarmed Fighting and Tavern Brawler (bigger Unarmed Strike die),
Piercer (one more die on a crit), Elemental Adept (1s count as 2 for your type), War Caster (Advantage on concentration
saves). Each shows as a switch on the attack card, so you can turn it off. Sharpshooter, Crossbow Expert, Slasher, Crusher,
Polearm Master and Shield Master show a short reminder on the card.
Every roll goes into the log below with Again / Advantage / Disadvantage buttons. "Clear" empties the log.
Times in the log are in 24-hour format. "Again" is a reroll: it never uses another spell slot.

5. RESTS, SPELL SLOTS AND CLASS FEATURES (the Rest tab, and the Rest button in the header)
------------------------------
The Rest tab in the roller shows, as dots: your spell slots, class features with limited uses (Rage, Second Wind,
Action Surge, Channel Divinity, Wild Shape, Bardic Inspiration, Focus Points, Sorcery Points, Lay On Hands, Luck Points
from the Lucky feat ...) and your Hit Point Dice. Click a full dot to use one, an empty dot to get it back. Big pools
(Lay On Hands) have a number box with − and +.
- Slots: the total for each level is the number in your sheet's slots box (else your class table). Used slots go where
  your sheet keeps them: the "Slots Expended" box (the classic sheet; type in it and the tool follows), the "expended"
  checkboxes on the official 2024 sheet, or, on a sheet with neither, inside the PDF.
- Hit Point Dice: the same idea. On the classic sheet the big Hit Dice box (under "Total") holds the dice you have left,
  e.g. "3d8"; on the official 2024 sheet the "spent" box holds how many you spent. Type in them and the tool follows; a
  rest writes them for you.
- Short Rest (1 hour) or Long Rest (8 hours): from the Rest tab or the "Rest" button in the header. A window you can drag
  opens; nothing changes until you press Apply.
  - Short Rest: roll Hit Point Dice to heal (each heals the die + your CON modifier, at least 1; roll as many as you
    want, × takes a roll back). Features that come back on a Short Rest return (Action Surge, Focus Points, one Rage, one
    Channel Divinity ...), Warlock Pact Magic slots too. Arcane Recovery and Sorcerous Restoration are offered unticked:
    tick them to use them.
  - Long Rest: full HP, Temporary HP gone, all Hit Point Dice and spell slots back, every feature back, Exhaustion goes
    down by 1, Death Saving Throws are cleared, and it offers to end concentration (ticked if the spell would have run
    out during 8 hours).
  - Every change is listed with a tick box: untick what you don't want. After Apply the window stays open as a list of
    what changed until you close it. One Undo (Ctrl+Z) takes the whole rest back.

6. EFFECTS AND CONCENTRATION (bottom left)
------------------------------
The Effects tray lists everything that changes your rolls. The roller applies them for you.
- "+ Add": a condition (Poisoned, Prone, Exhaustion 2 ...), your own buff or debuff (advantage, disadvantage, a bonus, a
  penalty, a speed change, or just a reminder), or a spell you're concentrating on. × removes an effect.
- Concentration shows first, with a gold ring. Casting a concentration spell from a spell card starts it (the log line has
  an Undo).
- The tool never blocks you and never ends concentration on its own; it asks first. You're asked when you:
  - cast another concentration spell (switch, or keep the old one),
  - add Incapacitated, Paralyzed, Petrified, Stunned or Unconscious,
  - turn Rage on,
  - lower your Current or Temp HP on the sheet: it offers the Constitution save (DC 10 or half the damage). You can
    correct the damage first. If the save fails, it asks whether to end concentration.
  - drop to 0 HP.
- Effects and concentration are saved inside the downloaded PDF.

7. KILLING MARBLE
------------------------------
Switch the header from "Default" to "Killing Marble" to add the Becoming Marble page after the sheet. Set each body
part's marble score there; its penalties show in the Effects tray and the roller applies them. After a CON save, parts
that are spreading show whether they resisted, and a failed one offers "Apply?". "Clear all marble" (click twice) resets
the scores. The page is part of every download while the switch is on.
"An hour passes": every part that has marble gains 1 (parts at 0, full or lost stay). It shows the changes first, with
what each part reaches, then Apply, or "Apply and roll CON save" when a part spreads into a part without marble.
A rest doesn't change the marble: use "An hour passes" for each hour.

8. TIPS
------------------------------
- If a stat isn't picked up, check the box's spelling (e.g. "Longsword +1" works, "L.sword" doesn't).
- If something looks old after an update, reload the page (F5).
- The Google font loads from the internet when you're online; offline the page uses a fallback font and works the same.

9. NOT INCLUDED YET
------------------------------
- Species: all 172 on D&D Beyond (one per name) are recognised and suggested, but only the free-rules ones and the Aasimar
  come with their rules. The others have their book and trait names only (that is all D&D Beyond shows without the
  book); add what they do to your sheet yourself.
- Feats from Forge of the Artificer, Heroes of Faerûn and Lorwyn come with their names, ability increases and the names
  of their parts only. Their summaries say "see the book".
- Spells and subclasses that are only in the Player's Handbook (e.g. Toll the Dead, subclasses beyond the one per class in
  the free rules). Level up lets you add their features yourself.
- Monsters, equipment other than weapons and armor, Warlock invocation effects in the roller (except Agonizing Blast),
  Bard instrument choices.


CREDITS AND LICENCES
==============================
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
