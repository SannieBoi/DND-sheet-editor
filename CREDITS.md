# Credits and licenses

## This project

D&D Character Sheet Editor, including the Killing Marble mode and its “Becoming Marble” rules, is by SannieBoi and released under the MIT License ([LICENSE](LICENSE)). You may use, change and share it. Every copy or changed version must keep the copyright notice and the license text.

Parts made by others keep their own licenses. They are listed below.

## D&D rules content (SRD, CC-BY-4.0)

This work includes material from the System Reference Document 5.2.1 (“SRD 5.2.1”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License, available at https://creativecommons.org/licenses/by/4.0/legalcode.

Changes made to that material:

- `spells.js`: the SRD 5.2 spell chapter, converted to JavaScript data. Damage, saves and upcasting were added as roll data, and a few typos in the source were fixed. It was built from the Markdown version of the SRD 5.2 by springbov ([github.com/springbov/dndsrd5.2_markdown](https://github.com/springbov/dndsrd5.2_markdown), CC-BY-4.0).
- `classes.js`, `species.js`, `feats.js`, `backgrounds.js`, `rules.js`, `weapons.js`, `armor.js`: the numbers and names come from the SRD 5.2.1 and were checked against the free D&D Beyond Basic Rules (2024). Feature descriptions are short summaries in our own words.

## Official character sheet

`tests/official-2024-sheet.pdf` is the blank fillable D&D 2024 character sheet that Wizards of the Coast offers for free on D&D Beyond. It is not part of the SRD and is not under CC-BY-4.0. It is included unchanged so the tests can check the app against it.

D&D Character Sheet Editor is unofficial Fan Content permitted under the [Fan Content Policy](https://company.wizards.com/en/legal/fancontentpolicy). Not approved/endorsed by Wizards. Portions of the materials used are property of Wizards of the Coast. ©Wizards of the Coast LLC.

## Killing Marble

The Killing Marble mode follows “Becoming Marble”, SannieBoi’s own homebrew rules. The body outline in `marble-body.js` comes from that document.

## Libraries

These files are included unmodified.

| Library | Files | Copyright | License |
|---|---|---|---|
| [PDF.js](https://github.com/mozilla/pdf.js) 3.11.174 | `pdf.min.js`, `pdf.worker.min.js` | Mozilla Foundation | Apache License 2.0, [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt) |
| [pdf-lib](https://github.com/Hopding/pdf-lib) | `pdf-lib.min.js` | Andrew Dillon | MIT, [licenses/pdf-lib-MIT.txt](licenses/pdf-lib-MIT.txt) |
| [pako](https://github.com/nodeca/pako) (bundled in pdf-lib) | `pdf-lib.min.js` | Vitaly Puzrin and Andrei Tuputcyn | MIT, [licenses/pako-MIT.txt](licenses/pako-MIT.txt) |
| tslib (bundled in pdf-lib) | `pdf-lib.min.js` | Microsoft Corporation | Apache License 2.0, [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt) |
