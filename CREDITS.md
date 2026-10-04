# Credits and licenses

## This project

D&D Character Sheet Editor, including the Killing Marble mode and its “Becoming Marble” rules, is by SannieBoi and released under the MIT License ([LICENSE](LICENSE)). You may use, change and share it. Every copy or changed version must keep the copyright notice and the license text.

Parts made by others keep their own licenses. They are listed below.

## D&D rules content (SRD, CC-BY-4.0)

This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Changes made to that material:

- `data/spells.js`: the SRD 5.2 spell chapter, converted to JavaScript data. Damage, saves and upcasting were added as roll data, and a few typos in the source were fixed. It was built from the Markdown version of the SRD 5.2 by springbov ([github.com/springbov/dndsrd5.2_markdown](https://github.com/springbov/dndsrd5.2_markdown), CC-BY-4.0).
- `data/classes.js`, `data/species.js`, `data/feats.js`, `data/backgrounds.js`, `data/rules.js`, `data/weapons.js`, `data/armor.js`, `data/creation.js`: the numbers and names (including the classes' and backgrounds' starting equipment, equipment packs, languages and ability score methods) come from the SRD 5.2.1 and were checked against the free D&D Beyond Basic Rules (2024). Feature descriptions are short summaries in our own words.

## More feats and species (not SRD)

`data/feats-more.js` and `data/species-more.js` go beyond the SRD:

- **Player's Handbook (2024)**, Wizards of the Coast: the feats that aren't in the SRD and the Aasimar. Names, numbers and prerequisites, with short summaries in our own words (no book text).
- `data/backgrounds-more.js`, **Player's Handbook (2024)**: the 12 backgrounds that aren't in the SRD (Artisan, Charlatan, Entertainer, Farmer, Guard, Guide, Hermit, Merchant, Noble, Sailor, Scribe, Wayfarer): their ability scores, Origin feat, skills, tool and starting equipment (names and numbers only, no book text). Feats and skills match D&D Beyond's public background list.
- **Eberron: Forge of the Artificer**, **Forgotten Realms: Heroes of Faerûn** and **Lorwyn: First Light**, Wizards of the Coast: feat and species names, categories, ability increases and the names of their parts, as shown on D&D Beyond's public feat and species lists. The rules themselves are not included.
- **Every other species on D&D Beyond's public species list**: names and trait names only, as shown on that list. From Wizards of the Coast: Mordenkainen Presents: Monsters of the Multiverse, Ravenloft: The Horrors Within, Basic Rules (2014), Spelljammer: Adventures in Space, Guildmasters' Guide to Ravnica, Mythic Odysseys of Theros, Strixhaven: A Curriculum of Chaos, Dragonlance: Shadow of the Dragon Queen, Acquisitions Incorporated, Sword Coast Adventurer's Guide, Locathah Rising, One Grung Above, D&D Beyond Drops. From other publishers (as named on D&D Beyond): Exploring Eberron (2024) and Frontiers of Eberron: Quickstone (Visionary Production and Design), Grim Hollow: Player's Guide (Grim Hollow), The Crooked Moon Part One (Avantris Entertainment), Book of Ebon Tides and Northlands Worldbook (Kobold Press), Humblewood Campaign Setting (Humblewood), The Lord of the Rings Roleplaying (Free League), Dr Dhrolin's Dictionary of Dinosaurs (Palaeo Games), Heliana's Guide to Monster Hunting Parts 1 and 2 (Loot Tavern), One-Shot Wonders: Holiday Adventure Pack (Roll & Play Press), Obojima: Tales from the Tall Grass (1985 Games), Valda's Spire of Secrets: Player Pack (Mage Hand Press), Steinhardt's Guide to the Eldritch Hunt Player Pack (MonkeyDM), The Griffon's Saddlebag Books One and Two (The Griffon), The Field Guide to Floral Dragons (Floral Dragons). These names belong to their publishers.

The Wizards of the Coast material is covered by the Fan Content Policy notice below.

## Official character sheets

- `tests/official-2024-sheet.pdf` and `data/sheet-2024.js` (the same file, as base64) are the blank fillable D&D 2024 character sheet that Wizards of the Coast offers for free on D&D Beyond (https://media.dndbeyond.com/compendium-images/br/ph/character-sheet.pdf).
- `data/sheet-2014.js` is the blank fillable D&D character sheet from 2014 that Wizards of the Coast offers for free (https://media.wizards.com/2016/dnd/downloads/5E_CharacterSheet_Fillable.pdf), as base64. Its own notice: "TM & © 2014 Wizards of the Coast LLC. Permission is granted to photocopy this document for personal use."

They are not part of the SRD and are not under CC-BY-4.0. They are included unchanged: the tests check the app against the 2024 one, and the sheet maker fills in a copy of either one.

D&D Character Sheet Editor is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

## Killing Marble

The Killing Marble mode follows “Becoming Marble”, SannieBoi’s own homebrew rules. The body outline in `marble/marble-body.js` comes from that document.

## Libraries

These files are included unmodified.

| Library | Files | Copyright | License |
|---|---|---|---|
| [PDF.js](https://github.com/mozilla/pdf.js) 3.11.174 | `lib/pdf.min.js`, `lib/pdf.worker.min.js` | Mozilla Foundation | Apache License 2.0, [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt) |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | `lib/pdf-lib.min.js` | Andrew Dillon | MIT, [licenses/pdf-lib-MIT.txt](licenses/pdf-lib-MIT.txt) |
| [pako](https://github.com/nodeca/pako) (bundled in pdf-lib) | `lib/pdf-lib.min.js` | Vitaly Puzrin and Andrei Tuputcyn | MIT, [licenses/pako-MIT.txt](licenses/pako-MIT.txt) |
| tslib (bundled in pdf-lib) | `lib/pdf-lib.min.js` | Microsoft Corporation | Apache License 2.0, [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt) |
