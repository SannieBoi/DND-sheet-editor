/* Resources and rests. The roller's Rest tab (roller.js draws resources.view()) shows spell slots, class features with
   limited uses and Hit Point Dice as pips: click a full one to use it, an empty one to get it back. Under a feature,
   buttons spend its uses on what it does (Flurry of Blows, Second Wind, Lay On Hands ...: ACTIONS), log it with an Undo
   and add attacks, Dashes or movement to this turn (the turn bar, turn.js). The Rest button in the
   header (or the tab's buttons) opens a Short or Long Rest window you can drag: roll Hit Point Dice, then every change is
   listed with a tick box, and nothing happens until Apply (one step for Undo).
   Where things are kept:
   - Spell slots: the total is the sheet's slots box for that level, else the class tables (calc.slotsFor). Used = the
     number in the sheet's "Slots Expended" box (classic sheet: "SlotsRemaining 19"), else the official sheet's
     "expended" checkboxes plus sheetState.slotsUsed[level] (on sheets with neither, all of it is there).
   - Features: sheetState.used[id] = uses spent; the most you have comes from the class table (RESOURCES) or a species trait's `uses`.
   - Hit Point Dice: the total comes from your class levels (else the sheet's Hit Dice text). Spent = the official sheet's
     "spent" box, else sheetState.hitDiceSpent ({ die: count }).
   Rules (2024): a Short Rest lets you spend Hit Point Dice (each heals the die + CON modifier, at least 1); a Long Rest
   brings back all HP, all Hit Point Dice and all spell slots, takes 1 Exhaustion level away, and Temporary HP are gone. */
(() => {
'use strict';
const D = window.DND, C = window.character, S = window.sheet, $ = id => document.getElementById(id);
const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (k === 'class') e.className = v;
    else e.setAttribute(k, v === true ? '' : v);
  }
  e.append(...kids.flat(Infinity).filter(k => k != null && k !== false));
  return e;
};
const rnd = d => crypto.getRandomValues(new Uint32Array(1))[0] % d + 1;
const sum = a => a.reduce((t, x) => t + x, 0);
const numIn = v => { const m = String(v ?? '').match(/([+-]?)\s*(\d+)/); return m ? (m[1] === '-' ? -1 : 1) * +m[2] : null; };
const fmt = window.calc.fmt;
const plural = (n, w) => `${n} ${w}${n === 1 ? '' : 's'}`;
const st = () => window.sheetState;
const changed = () => document.dispatchEvent(new CustomEvent('resources-change'));
const classLevel = key => (C.classes || []).find(c => c.key === key)?.level || 0;
const subOf = key => (C.classes || []).find(c => c.key === key)?.sub?.name; // the subclass the sheet names (script.js)
const mod = ab => C.mods?.[ab] ?? 0;
const mod1 = ab => Math.max(1, mod(ab)); // "uses = your modifier (minimum of once)"
const pb = () => C.profBonus || 2;
// A number that grows at some class levels ({ 3: 4, 7: 5 }): the one at level l
const byLevel = (map, l) => Object.entries(map).reduce((n, [k, v]) => +k <= l ? v : n, 0);
const PSI_N = { 3: 4, 5: 6, 9: 8, 13: 10, 17: 12 }, PSI_D = { 3: 6, 5: 8, 11: 10, 17: 12 }; // Psionic Energy Dice: how many, which die

// ---- Spell slots ------------------------------------------------------------------------------------
const expended = l => (S.map?.slots?.[l]?.expended || []).filter(b => S.get(b) !== undefined);
const usedBox = l => S.field('slotsExpended' + l); // the classic sheet's "Slots Expended" box (a number)
function slotTotal(l) {
  const v = C['slots' + l];
  return typeof v === 'number' ? Math.max(0, v) : window.calc.slotsFor(C.classes || [])[l - 1] || 0;
}
const slotUsed = l => usedBox(l) ? Math.max(0, numIn(S.get(usedBox(l))) ?? 0)
  : expended(l).filter(b => S.get(b)).length + (st().slotsUsed?.[l] || 0);
const slotsLeft = l => Math.max(0, slotTotal(l) - slotUsed(l));
const slots = () => Array.from({ length: 9 }, (_, i) => i + 1).map(l => ({ level: l, total: slotTotal(l), used: slotUsed(l), left: slotsLeft(l) }))
  .filter(s => s.total || s.used);
// Pact Magic (Warlock, the Blood Hunter's Profane Soul): { level, slots } (back on a Short Rest)
function pact() {
  const p = window.calc.pactOf(C.classes || []);
  return p?.slots ? { level: p.slotLevel, slots: p.slots } : null;
}

// Set how many slots of a level are used: in the sheet's "Slots Expended" box (empty for 0), else the official sheet's
// checkboxes first (in order) and the rest in sheetState
function writeSlotUsed(l, n) {
  n = Math.max(0, n);
  const box = usedBox(l), boxes = box ? [] : expended(l);
  if (box && String(S.get(box) ?? '').trim() !== (n ? String(n) : '')) S.set(box, n ? String(n) : '');
  boxes.forEach((b, i) => { if (!!S.get(b) !== i < n) S.set(b, i < n); });
  const extra = box ? 0 : n - boxes.length, u = st().slotsUsed;
  if (extra > 0) (st().slotsUsed ||= {})[l] = extra;
  else if (u && l in u) { delete u[l]; if (!Object.keys(u).length) delete st().slotsUsed; }
}
function setSlotUsed(l, n, label = `Level ${l} spell slot`) {
  n = Math.max(0, Math.min(slotTotal(l), n));
  if (n === slotUsed(l)) return false;
  S.transaction(label, () => writeSlotUsed(l, n));
  changed();
  return true;
}
const useSlot = l => slotsLeft(l) > 0 && setSlotUsed(l, slotUsed(l) + 1);
const restoreSlot = l => slotUsed(l) > 0 && setSlotUsed(l, slotUsed(l) - 1);

// ---- Class features with limited uses ------------------------------------------------------------------
// max(class level, class table row) = uses; from = the class level it starts at; back: 'short' (all back on a Short or
// Long Rest), 'short1' (one back on a Short Rest, all on a Long Rest), 'long'; pool: counted in points (Lay On Hands).
const RESOURCES = [
  { id: 'rage', cls: 'barbarian', name: 'Rage', max: (l, r) => r.rages, back: 'short1' },
  { id: 'persistentRage', cls: 'barbarian', name: 'Persistent Rage', from: 15, max: () => 1, back: 'long', note: 'all Rages back when you roll Initiative' },
  { id: 'bardicInspiration', cls: 'bard', name: 'Bardic Inspiration', max: () => Math.max(1, mod('CHA')), back: l => l >= 5 ? 'short' : 'long',
    note: (l, r) => 'd' + r.bardicInspirationDie },
  { id: 'channelCleric', cls: 'cleric', name: 'Channel Divinity', from: 2, max: (l, r) => r.channelDivinityUses, back: 'short1' },
  { id: 'divineIntervention', cls: 'cleric', name: 'Divine Intervention', from: 10, max: () => 1, back: 'long' },
  { id: 'wildShape', cls: 'druid', name: 'Wild Shape', from: 2, max: (l, r) => r.wildShapeUses, back: 'short1' },
  { id: 'secondWind', cls: 'fighter', name: 'Second Wind', max: (l, r) => r.secondWindUses, back: 'short1', note: l => `1d10 + ${l} HP` },
  { id: 'actionSurge', cls: 'fighter', name: 'Action Surge', from: 2, max: (l, r) => r.actionSurgeUses, back: 'short' },
  { id: 'indomitable', cls: 'fighter', name: 'Indomitable', from: 9, max: (l, r) => r.indomitableUses, back: 'long' },
  { id: 'focus', cls: 'monk', name: 'Focus Points', from: 2, max: (l, r) => r.focusPoints, back: 'short' },
  { id: 'uncannyMetabolism', cls: 'monk', name: 'Uncanny Metabolism', from: 2, max: () => 1, back: 'long' },
  { id: 'layOnHands', cls: 'paladin', name: 'Lay On Hands', max: l => 5 * l, back: 'long', pool: true, note: 'HP in the pool' },
  { id: 'channelPaladin', cls: 'paladin', name: 'Channel Divinity', from: 3, max: (l, r) => r.channelDivinityUses, back: 'short1' },
  { id: 'favoredEnemy', cls: 'ranger', name: 'Favored Enemy', max: (l, r) => r.favoredEnemies, back: 'long', note: "Hunter's Mark without a slot" },
  { id: 'tireless', cls: 'ranger', name: 'Tireless', from: 10, max: () => mod1('WIS'), back: 'long', note: 'Temporary HP' },
  { id: 'strokeOfLuck', cls: 'rogue', name: 'Stroke of Luck', from: 20, max: () => 1, back: 'short' },
  { id: 'innateSorcery', cls: 'sorcerer', name: 'Innate Sorcery', max: () => 2, back: 'long' },
  { id: 'sorceryPoints', cls: 'sorcerer', name: 'Sorcery Points', from: 2, max: (l, r) => r.sorceryPoints, back: 'long' },
  { id: 'sorcerousRestoration', cls: 'sorcerer', name: 'Sorcerous Restoration', from: 5, max: () => 1, back: 'long', note: 'used on a Short Rest' },
  { id: 'magicalCunning', cls: 'warlock', name: 'Magical Cunning', from: 2, max: () => 1, back: 'long', note: 'half your Pact slots back' },
  { id: 'arcaneRecovery', cls: 'wizard', name: 'Arcane Recovery', max: () => 1, back: 'long', note: 'used on a Short Rest' },
  { id: 'tinkersMagic', cls: 'artificer', name: "Tinker's Magic", max: () => mod1('INT'), back: 'long', note: 'make a simple item' },
  { id: 'flashOfGenius', cls: 'artificer', name: 'Flash of Genius', from: 7, max: () => mod1('INT'), back: l => l >= 20 ? 'short' : l >= 14 ? 'short1' : 'long',
    note: () => `+${mod1('INT')} to a failed check or save` },
  // Blood Hunter: the Hemocraft modifier is taken as INT (WIS only with the DM's permission)
  { id: 'bloodMaledict', cls: 'bloodhunter', name: 'Blood Maledict', max: (l, r) => r.bloodMaledict + (subOf('bloodhunter') === 'Order of the Ghostslayer' ? 1 : 0),
    back: 'short', note: (l, r) => `amplify: 1d${r.hemocraftDie} Necrotic to you` },
  { id: 'brandOfCastigation', cls: 'bloodhunter', name: 'Brand of Castigation', from: 6, max: () => 1, back: 'short' },
  // Subclasses (sub: the subclass the sheet names)
  { id: 'warriorOfTheGods', cls: 'barbarian', sub: 'Path of the Zealot', name: 'Warrior of the Gods', max: l => byLevel({ 3: 4, 6: 5, 12: 6, 17: 7 }, l), back: 'long', note: 'd12s to heal yourself' },
  { id: 'wardingFlare', cls: 'cleric', sub: 'Light Domain', name: 'Warding Flare', max: () => mod1('WIS'), back: l => l >= 6 ? 'short' : 'long' },
  { id: 'coronaOfLight', cls: 'cleric', sub: 'Light Domain', name: 'Corona of Light', from: 17, max: () => mod1('WIS'), back: 'long' },
  { id: 'warPriest', cls: 'cleric', sub: 'War Domain', name: 'War Priest', max: () => mod1('WIS'), back: 'short', note: 'Bonus Action attack' },
  { id: 'deathsDoor', cls: 'cleric', sub: 'Grave Domain', name: "Sentinel at Death's Door", from: 6, max: () => mod1('WIS'), back: 'long' },
  { id: 'starMap', cls: 'druid', sub: 'Circle of the Stars', name: 'Guiding Bolt (Star Map)', max: () => mod1('WIS'), back: 'long', note: 'without a slot' },
  { id: 'cosmicOmen', cls: 'druid', sub: 'Circle of the Stars', name: 'Cosmic Omen', from: 6, max: () => mod1('WIS'), back: 'long' },
  { id: 'moonlightStep', cls: 'druid', sub: 'Circle of the Moon', name: 'Moonlight Step', from: 10, max: () => mod1('WIS'), back: 'long' },
  { id: 'superiority', cls: 'fighter', sub: 'Battle Master', name: 'Superiority Dice', max: l => byLevel({ 3: 4, 7: 5, 15: 6 }, l), back: 'short', note: l => 'd' + byLevel({ 3: 8, 10: 10, 18: 12 }, l) },
  { id: 'psiFighter', cls: 'fighter', sub: 'Psi Warrior', name: 'Psionic Energy Dice', max: l => byLevel(PSI_N, l), back: 'short1', note: l => 'd' + byLevel(PSI_D, l) },
  { id: 'arcaneShot', cls: 'fighter', sub: 'Arcane Archer', name: 'Arcane Shot', max: () => mod1('INT'), back: 'short', note: l => 'd' + byLevel({ 3: 6, 10: 8, 15: 10, 18: 12 }, l) },
  { id: 'despairingStrike', cls: 'fighter', sub: 'Sorrow Knight', name: 'Despairing Strike Dice', max: l => byLevel({ 3: 3, 10: 4, 15: 5 }, l), back: 'short', note: l => 'd' + byLevel({ 3: 8, 10: 10, 15: 12 }, l) },
  { id: 'groupRecovery', cls: 'fighter', sub: 'Banneret', name: 'Group Recovery', max: () => 1, back: 'short' },
  { id: 'wholenessOfBody', cls: 'monk', sub: 'Warrior of the Open Hand', name: 'Wholeness of Body', from: 6, max: () => mod1('WIS'), back: 'long' },
  { id: 'healingHarm', cls: 'monk', sub: 'Warrior of Mercy', name: 'Flurry of Healing and Harm', from: 11, max: () => mod1('WIS'), back: 'long' },
  { id: 'gloriousDefense', cls: 'paladin', sub: 'Oath of Glory', name: 'Glorious Defense', from: 15, max: () => mod1('CHA'), back: 'long' },
  { id: 'elementalRebuke', cls: 'paladin', sub: 'Oath of the Noble Genies', name: 'Elemental Rebuke', from: 15, max: () => mod1('CHA'), back: 'long' },
  { id: 'dreadfulStrike', cls: 'ranger', sub: 'Gloom Stalker', name: 'Dreadful Strike', max: () => mod1('WIS'), back: 'long', note: l => (l >= 11 ? '2d8' : '2d6') + ' Psychic' },
  { id: 'mistyWanderer', cls: 'ranger', sub: 'Fey Wanderer', name: 'Misty Step (Misty Wanderer)', from: 15, max: () => mod1('WIS'), back: 'long', note: 'without a slot' },
  { id: 'chillingRetribution', cls: 'ranger', sub: 'Winter Walker', name: 'Chilling Retribution', from: 11, max: () => mod1('WIS'), back: 'long' },
  { id: 'psiRogue', cls: 'rogue', sub: 'Soulknife', name: 'Psionic Energy Dice', max: l => byLevel(PSI_N, l), back: 'short1', note: l => 'd' + byLevel(PSI_D, l) },
  { id: 'wails', cls: 'rogue', sub: 'Phantom', name: 'Wails from the Grave', max: () => mod1('DEX'), back: 'long' },
  { id: 'bloodthirst', cls: 'rogue', sub: 'Scion of the Three', name: 'Bloodthirst', max: () => mod1('INT'), back: l => l >= 17 ? 'short1' : 'long' },
  { id: 'restoreBalance', cls: 'sorcerer', sub: 'Clockwork Sorcery', name: 'Restore Balance', max: () => mod1('CHA'), back: 'long' },
  { id: 'favoredByTheGods', cls: 'sorcerer', sub: 'Divine Soul', name: 'Favored by the Gods', max: () => 1, back: 'short', note: '2d4 to a failed save or missed attack' },
  { id: 'unearthlyRecovery', cls: 'sorcerer', sub: 'Divine Soul', name: 'Unearthly Recovery', from: 18, max: () => 1, back: 'long', note: 'below half HP: regain half your HP maximum' },
  { id: 'tidesOfChaos',cls: 'sorcerer', sub: 'Wild Magic Sorcery', name: 'Tides of Chaos', max: () => 1, back: 'long', note: 'also back when you cast a Sorcerer spell with a slot' },
  { id: 'stepsOfTheFey', cls: 'warlock', sub: 'Archfey Patron', name: 'Misty Step (Steps of the Fey)', max: () => mod1('CHA'), back: 'long', note: 'without a slot' },
  { id: 'healingLight', cls: 'warlock', sub: 'Celestial Patron', name: 'Healing Light', max: l => 1 + l, back: 'long', note: () => `d6s, up to ${mod1('CHA')} at once` },
  { id: 'formOfDread', cls: 'warlock', sub: 'Undead Patron', name: 'Form of Dread', max: () => mod1('CHA'), back: 'long' },
  { id: 'portent', cls: 'wizard', sub: 'Diviner', name: 'Portent rolls', max: l => l >= 14 ? 3 : 2, back: 'long', note: 'd20s rolled after a Long Rest' },
  { id: 'bladesong', cls: 'wizard', sub: 'Bladesinger', name: 'Bladesong', max: () => mod1('INT'), back: 'long', note: 'one back with Arcane Recovery' },
  { id: 'benignTransposition', cls: 'wizard', sub: 'Conjurer', name: 'Benign Transposition', max: () => mod1('INT'), back: 'long' },
  { id: 'hypnoticPresence', cls: 'wizard', sub: 'Enchanter', name: 'Hypnotic Presence', max: () => mod1('INT'), back: 'long' },
  { id: 'arcaneJolt', cls: 'artificer', sub: 'Battle Smith', name: 'Arcane Jolt', from: 9, max: () => mod1('INT'), back: 'long' },
  { id: 'mappingMagic', cls: 'artificer', sub: 'Cartographer', name: 'Faerie Fire (Mapping Magic)', max: () => mod1('INT'), back: 'long', note: 'without a slot' },
  { id: 'restorativeReagents', cls: 'artificer', sub: 'Alchemist', name: 'Restorative Reagents', from: 9, max: () => mod1('INT'), back: 'long', note: 'Lesser Restoration without a slot' },
  { id: 'joltToLife', cls: 'artificer', sub: 'Reanimator', name: 'Jolt to Life', max: () => mod1('INT'), back: 'long' },
  { id: 'hybrid', cls: 'bloodhunter', sub: 'Order of the Lycan', name: 'Hybrid Transformation', max: l => l >= 18 ? 0 : l >= 11 ? 2 : 1, back: 'short' },
  { id: 'aetherWalk', cls: 'bloodhunter', sub: 'Order of the Ghostslayer', name: 'Aether Walk', from: 7, max: l => l >= 15 ? 2 : 1, back: 'short' },
  { id: 'strangeMetabolism', cls: 'bloodhunter', sub: 'Order of the Mutant', name: 'Strange Metabolism', from: 7, max: () => 1, back: 'long' },
  { id: 'exaltedMutation', cls: 'bloodhunter', sub: 'Order of the Mutant', name: 'Exalted Mutation', from: 18, max: () => mod1('INT'), back: 'long' },
  { id: 'revealedArcana', cls: 'bloodhunter', sub: 'Order of the Profane Soul', name: 'Revealed Arcana', from: 7, max: () => 1, back: 'long' },
  { id: 'unsealedArcana', cls: 'bloodhunter', sub: 'Order of the Profane Soul', name: 'Unsealed Arcana', from: 15, max: () => 1, back: 'long' },
  // the older books' subclasses (subclasses-2014.js)
  { id: 'consultSpirits', cls: 'barbarian', sub: 'Path of the Ancestral Guardian', name: 'Consult the Spirits', from: 10, max: () => 1, back: 'short', note: 'Augury or Clairvoyance without a slot' },
  { id: 'infectiousFury', cls: 'barbarian', sub: 'Path of the Beast', name: 'Infectious Fury', from: 10, max: pb, back: 'long' },
  { id: 'callTheHunt', cls: 'barbarian', sub: 'Path of the Beast', name: 'Call the Hunt', from: 14, max: pb, back: 'long' },
  { id: 'magicAwareness', cls: 'barbarian', sub: 'Path of Wild Magic', name: 'Magic Awareness', max: pb, back: 'long' },
  { id: 'bolsteringMagic', cls: 'barbarian', sub: 'Path of Wild Magic', name: 'Bolstering Magic', from: 6, max: pb, back: 'long' },
  { id: 'performanceOfCreation', cls: 'bard', sub: 'College of Creation', name: 'Performance of Creation', max: () => 1, back: 'long', note: 'or spend a level 2+ slot' },
  { id: 'animatingPerformance', cls: 'bard', sub: 'College of Creation', name: 'Animating Performance', from: 6, max: () => 1, back: 'long', note: 'or spend a level 3+ slot' },
  { id: 'universalSpeech', cls: 'bard', sub: 'College of Eloquence', name: 'Universal Speech', from: 6, max: () => 1, back: 'long', note: 'or spend a spell slot' },
  { id: 'infectiousInspiration', cls: 'bard', sub: 'College of Eloquence', name: 'Infectious Inspiration', from: 14, max: () => mod1('CHA'), back: 'long' },
  { id: 'wordsOfTerror', cls: 'bard', sub: 'College of Whispers', name: 'Words of Terror', max: () => 1, back: 'short' },
  { id: 'mantleOfWhispers', cls: 'bard', sub: 'College of Whispers', name: 'Mantle of Whispers', from: 6, max: () => 1, back: 'short' },
  { id: 'shadowLore', cls: 'bard', sub: 'College of Whispers', name: 'Shadow Lore', from: 14, max: () => 1, back: 'long' },
  { id: 'blessingOfTheForge', cls: 'cleric', sub: 'Forge Domain', name: 'Blessing of the Forge', max: () => 1, back: 'long', note: '+1 weapon or armor until your next Long Rest' },
  { id: 'embodimentOfTheLaw', cls: 'cleric', sub: 'Order Domain', name: 'Embodiment of the Law', from: 6, max: () => mod1('WIS'), back: 'long' },
  { id: 'emboldeningBond', cls: 'cleric', sub: 'Peace Domain', name: 'Emboldening Bond', max: pb, back: 'long' },
  { id: 'wrathOfTheStorm', cls: 'cleric', sub: 'Tempest Domain', name: 'Wrath of the Storm', max: () => mod1('WIS'), back: 'long' },
  { id: 'eyesOfNight', cls: 'cleric', sub: 'Twilight Domain', name: 'Eyes of Night (sharing)', max: () => 1, back: 'long', note: 'or spend a spell slot' },
  { id: 'stepsOfNight', cls: 'cleric', sub: 'Twilight Domain', name: 'Steps of Night', from: 6, max: pb, back: 'long' },
  { id: 'balmSummerCourt', cls: 'druid', sub: 'Circle of Dreams', name: 'Balm of the Summer Court', max: l => l, back: 'long', note: l => `d6s, up to ${Math.max(1, Math.floor(l / 2))} at once` },
  { id: 'hiddenPaths', cls: 'druid', sub: 'Circle of Dreams', name: 'Hidden Paths', from: 10, max: () => mod1('WIS'), back: 'long' },
  { id: 'walkerInDreams', cls: 'druid', sub: 'Circle of Dreams', name: 'Walker in Dreams', from: 14, max: () => 1, back: 'long' },
  { id: 'spiritTotem', cls: 'druid', sub: 'Circle of the Shepherd', name: 'Spirit Totem', max: () => 1, back: 'short' },
  { id: 'faithfulSummons', cls: 'druid', sub: 'Circle of the Shepherd', name: 'Faithful Summons', from: 14, max: () => 1, back: 'long' },
  { id: 'fungalInfestation', cls: 'druid', sub: 'Circle of Spores', name: 'Fungal Infestation', from: 6, max: () => mod1('WIS'), back: 'long' },
  { id: 'cauterizingFlames', cls: 'druid', sub: 'Circle of Wildfire', name: 'Cauterizing Flames', from: 10, max: pb, back: 'long' },
  { id: 'blazingRevival', cls: 'druid', sub: 'Circle of Wildfire', name: 'Blazing Revival', from: 14, max: () => 1, back: 'long' },
  { id: 'unwaveringMark', cls: 'fighter', sub: 'Cavalier', name: 'Unwavering Mark attacks', max: () => mod1('STR'), back: 'long' },
  { id: 'wardingManeuver', cls: 'fighter', sub: 'Cavalier', name: 'Warding Maneuver', from: 7, max: () => mod1('CON'), back: 'long', note: '1d8 to AC' },
  { id: 'unleashIncarnation', cls: 'fighter', sub: 'Echo Knight', name: 'Unleash Incarnation', max: () => mod1('CON'), back: 'long' },
  { id: 'shadowMartyr', cls: 'fighter', sub: 'Echo Knight', name: 'Shadow Martyr', from: 10, max: () => 1, back: 'short' },
  { id: 'reclaimPotential', cls: 'fighter', sub: 'Echo Knight', name: 'Reclaim Potential', from: 15, max: () => mod1('CON'), back: 'long' },
  { id: 'giantsMight', cls: 'fighter', sub: 'Rune Knight', name: "Giant's Might", max: pb, back: 'long' },
  { id: 'runes', cls: 'fighter', sub: 'Rune Knight', name: 'Rune invocations', max: l => byLevel({ 3: 2, 7: 3, 10: 4, 15: 5 }, l) * (l >= 15 ? 2 : 1), back: 'short',
    note: l => l >= 15 ? 'each rune twice' : 'each rune once' },
  { id: 'runicShield', cls: 'fighter', sub: 'Rune Knight', name: 'Runic Shield', from: 7, max: pb, back: 'long' },
  { id: 'fightingSpirit', cls: 'fighter', sub: 'Samurai', name: 'Fighting Spirit', max: () => 3, back: 'long', note: l => `${byLevel({ 3: 5, 10: 10, 15: 15 }, l)} Temporary HP` },
  { id: 'strengthBeforeDeath', cls: 'fighter', sub: 'Samurai', name: 'Strength Before Death', from: 18, max: () => 1, back: 'long' },
  { id: 'breathOfTheDragon', cls: 'monk', sub: 'Way of the Ascendant Dragon', name: 'Breath of the Dragon', max: pb, back: 'long', note: 'or spend 2 Focus Points' },
  { id: 'wingsUnfurled', cls: 'monk', sub: 'Way of the Ascendant Dragon', name: 'Wings Unfurled', from: 6, max: pb, back: 'long' },
  { id: 'aspectOfTheWyrm', cls: 'monk', sub: 'Way of the Ascendant Dragon', name: 'Aspect of the Wyrm', from: 11, max: () => 1, back: 'long', note: 'or spend 3 Focus Points' },
  { id: 'invincibleConqueror', cls: 'paladin', sub: 'Oath of Conquest', name: 'Invincible Conqueror', from: 20, max: () => 1, back: 'long' },
  { id: 'exaltedChampion', cls: 'paladin', sub: 'Oath of the Crown', name: 'Exalted Champion', from: 20, max: () => 1, back: 'long' },
  { id: 'mortalBulwark', cls: 'paladin', sub: 'Oath of the Watchers', name: 'Mortal Bulwark', from: 20, max: () => 1, back: 'long', note: 'or spend a level 5 slot' },
  { id: 'dreadLord', cls: 'paladin', sub: 'Oathbreaker', name: 'Dread Lord', from: 20, max: () => 1, back: 'long' },
  { id: 'drakeCompanion', cls: 'ranger', sub: 'Drakewarden', name: 'Drake Companion', max: () => 1, back: 'long', note: 'or spend a level 1+ slot' },
  { id: 'drakesBreath', cls: 'ranger', sub: 'Drakewarden', name: "Drake's Breath", from: 11, max: () => 1, back: 'long', note: 'or spend a level 3+ slot' },
  { id: 'reflexiveResistance', cls: 'ranger', sub: 'Drakewarden', name: 'Reflexive Resistance', from: 15, max: pb, back: 'long' },
  { id: 'detectPortal', cls: 'ranger', sub: 'Horizon Walker', name: 'Detect Portal', max: () => 1, back: 'short' },
  { id: 'etherealStep', cls: 'ranger', sub: 'Horizon Walker', name: 'Ethereal Step', from: 7, max: () => 1, back: 'short' },
  { id: 'huntersSense', cls: 'ranger', sub: 'Monster Slayer', name: "Hunter's Sense", max: () => mod1('WIS'), back: 'long' },
  { id: 'magicUsersNemesis', cls: 'ranger', sub: 'Monster Slayer', name: "Magic-User's Nemesis", from: 11, max: () => 1, back: 'short' },
  { id: 'writhingTide', cls: 'ranger', sub: 'Swarmkeeper', name: 'Writhing Tide', from: 7, max: pb, back: 'long' },
  { id: 'swarmingDispersal', cls: 'ranger', sub: 'Swarmkeeper', name: 'Swarming Dispersal', from: 15, max: pb, back: 'long' },
  { id: 'unerringEye', cls: 'rogue', sub: 'Inquisitive', name: 'Unerring Eye', from: 13, max: () => mod1('WIS'), back: 'long' },
  { id: 'masterDuelist', cls: 'rogue', sub: 'Swashbuckler', name: 'Master Duelist', from: 17, max: () => 1, back: 'short' },
  { id: 'lunarSpell', cls: 'sorcerer', sub: 'Lunar Sorcery', name: 'Lunar spell without a slot', max: l => l >= 6 ? 3 : 1, back: 'long', note: "a level 1 lunar spell of your phase" },
  { id: 'lunarBoons', cls: 'sorcerer', sub: 'Lunar Sorcery', name: 'Lunar Boons', from: 6, max: pb, back: 'long', note: 'Metamagic 1 point cheaper' },
  { id: 'lunarPhenomenon', cls: 'sorcerer', sub: 'Lunar Sorcery', name: 'Lunar Phenomenon', from: 18, max: () => 3, back: 'long', note: 'each phase once; or spend 5 Sorcery Points' },
  { id: 'windSoul', cls: 'sorcerer', sub: 'Storm Sorcery', name: 'Wind Soul (sharing flight)', from: 18, max: () => 1, back: 'short' },
  { id: 'tentacleOfTheDeeps', cls: 'warlock', sub: 'The Fathomless', name: 'Tentacle of the Deeps', max: pb, back: 'long' },
  { id: 'graspingTentacles', cls: 'warlock', sub: 'The Fathomless', name: "Evard's Black Tentacles (Grasping Tentacles)", from: 10, max: () => 1, back: 'long', note: 'without a slot' },
  { id: 'fathomlessPlunge', cls: 'warlock', sub: 'The Fathomless', name: 'Fathomless Plunge', from: 14, max: () => 1, back: 'short' },
  { id: 'bottledRespite', cls: 'warlock', sub: 'The Genie', name: 'Bottled Respite', max: () => 1, back: 'long' },
  { id: 'elementalGift', cls: 'warlock', sub: 'The Genie', name: 'Elemental Gift (flight)', from: 6, max: pb, back: 'long' },
  { id: 'limitedWish', cls: 'warlock', sub: 'The Genie', name: 'Limited Wish', from: 14, max: () => 1, back: 'long', note: 'back only after 1d4 Long Rests' },
  { id: 'hexbladesCurse', cls: 'warlock', sub: 'The Hexblade', name: "Hexblade's Curse", max: () => 1, back: 'short' },
  { id: 'accursedSpecter', cls: 'warlock', sub: 'The Hexblade', name: 'Accursed Specter', from: 6, max: () => 1, back: 'long' },
  { id: 'defyDeath', cls: 'warlock', sub: 'The Undying', name: 'Defy Death', from: 6, max: () => 1, back: 'long' },
  { id: 'indestructibleLife', cls: 'warlock', sub: 'The Undying', name: 'Indestructible Life', from: 14, max: () => 1, back: 'short' },
  { id: 'chronalShift', cls: 'wizard', sub: 'Chronurgy Magic', name: 'Chronal Shift', max: () => 2, back: 'long' },
  { id: 'momentaryStasis', cls: 'wizard', sub: 'Chronurgy Magic', name: 'Momentary Stasis', from: 6, max: () => mod1('INT'), back: 'long' },
  { id: 'arcaneAbeyance', cls: 'wizard', sub: 'Chronurgy Magic', name: 'Arcane Abeyance', from: 10, max: () => 1, back: 'short' },
  { id: 'violentAttraction', cls: 'wizard', sub: 'Graviturgy Magic', name: 'Violent Attraction', from: 10, max: () => mod1('INT'), back: 'long' },
  { id: 'eventHorizon', cls: 'wizard', sub: 'Graviturgy Magic', name: 'Event Horizon', from: 14, max: () => 1, back: 'long', note: 'or spend a level 3+ slot' },
  { id: 'manifestMind', cls: 'wizard', sub: 'Order of Scribes', name: 'Manifest Mind', from: 6, max: () => 1, back: 'long', note: () => `or spend a slot; cast from it ${pb()} times per Long Rest` },
  { id: 'oneWithTheWord', cls: 'wizard', sub: 'Order of Scribes', name: 'One with the Word', from: 14, max: () => 1, back: 'long' },
  { id: 'lucky', feat: 'Lucky', name: 'Luck Points', max: pb, back: 'long' }
];
const BACK = { short: 'back on a Short or Long Rest', short1: '1 back on a Short Rest, all on a Long Rest', long: 'back on a Long Rest' };

function resources() {
  const out = [], two = id => ['channelCleric', 'channelPaladin'].every(x => RESOURCES.find(r => r.id === x && classLevel(r.cls) >= r.from));
  for (const r of RESOURCES) {
    let lvl = 0, row = {};
    if (r.cls) {
      lvl = classLevel(r.cls);
      const from = r.from || (r.sub ? D.classes[r.cls].features.find(f => f.choice?.type === 'subclass').lvl : 1); // a subclass's from its level
      if (lvl < from || r.sub && subOf(r.cls) !== r.sub) continue;
      row = D.classes[r.cls].levels[lvl - 1];
    } else if (!(C.feats || []).includes(r.feat)) continue;
    const max = r.max(lvl, row);
    if (!(max > 0)) continue;
    const used = Math.min(max, st().used?.[r.id] || 0), note = typeof r.note === 'function' ? r.note(lvl, row) : r.note;
    out.push({ ...r, name: r.id.startsWith('channel') && two() ? `${r.name} (${D.classes[r.cls].name})` : r.name,
      lvl, row, max, used, left: max - used, note, back: typeof r.back === 'function' ? r.back(lvl) : r.back });
  }
  // species traits with limited uses (species.js / species-more.js features[].uses), from the trait's character level
  const sp = C.speciesData;
  for (const f of sp?.features || []) {
    if (!f.uses || f.lvl > (C.level || 1)) continue;
    const id = 'sp:' + f.name, max = f.uses.n === 'PB' ? C.profBonus || 2 : f.uses.n, used = Math.min(max, st().used?.[id] || 0);
    out.push({ id, name: f.name, species: sp.name, lvl: C.level || 1, max, used, left: max - used, note: sp.name, back: f.uses.back });
  }
  return out;
}
function writeUsed(id, n) {
  const u = st().used ||= {};
  if (n > 0) u[id] = n; else delete u[id];
  if (!Object.keys(u).length) delete st().used;
}
function setUsed(id, n) {
  const r = resources().find(x => x.id === id);
  if (!r) return false;
  n = Math.max(0, Math.min(r.max, n));
  if (n === r.used) return false;
  S.transaction(r.name, () => writeUsed(id, n));
  changed();
  return true;
}

// ---- Spending uses: the buttons under a feature in the Rest tab ---------------------------------------------------------
// ACTIONS[resource id] = what its uses can be spent on (2024 rules, in our own words). A button spends `cost` uses (default
// 1, 0 = free, below 0 = uses back) and writes an entry in the roll log with an Undo. Values may be functions of (class
// level, class table row, pick, the resource). from / sub: the class level / subclass it needs; time: when you use it;
// text: what it does (else the class or subclass feature of that name); show: the cost badge when it varies; options: a
// choice asked first ([label] or [[label, value]]); roll: dice ({ n, d, flat, type, heal, temp, label, what: what the
// total is }, or a list); dc: [ability, DC, half on a success]; attacks / dashes / feet: added to this turn (the turn bar,
// turn.js; feet 'half' = half your Speed, feetBy = the feature that gives the movement);
// state: a lasting effect shown in the tray (effects.js STATES); temp: Temporary HP you gain; refill: a resource it fills
// up; ends: why it ends concentration (asked first); cast: a concentration spell it casts; amount: you say how many
// points (Lay On Hands); slot: 'spend' (a spell slot for a use back) or Font of Magic's 'create' / 'convert'; pact:
// Magical Cunning's Pact slots; save: rolls the save again with your class level (Indomitable).
// Nothing on the sheet changes beyond the uses (and the slots, effects, concentration they name): healing and Temporary HP
// get a button in the log entry.
const spellDC = () => C.spellcasting?.dc || 8 + pb() + Math.max(mod('INT'), mod('WIS'), mod('CHA'));
const kiDC = () => 8 + mod('WIS') + pb();
const sheetText = () => Object.values(window.fields || {}).filter(v => typeof v === 'string').join('\n');
const escRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const knownOr = all => { const t = sheetText(), known = all.filter(x => new RegExp(`\\b${escRe(x.name)}\\b`, 'i').test(t)); return known.length ? known : all; };
const maneuvers = () => knownOr(D.classes.fighter.subclasses?.find(s => s.name === 'Battle Master')?.lists?.maneuvers?.items || []);
const metamagic = () => knownOr(D.classes.sorcerer.metamagic || []);
const metaOf = name => (D.classes.sorcerer.metamagic || []).find(m => m.name === name);
const die = (n, d, more) => ({ n, d, flat: 0, ...more });
const upTo = (n, d) => Array.from({ length: Math.max(1, n) }, (_, i) => [`${i + 1}d${d}`, i + 1]);
const perAction = () => window.effects?.attacks().base || 1;
const ACTIONS = {
  rage: [{ name: 'Rage', time: 'Bonus Action', state: 'Raging', ends: "While you rage you can't concentrate on spells.", feet: l => l >= 7 ? 'half' : 0, feetBy: 'Instinctive Pounce',
    text: (l, t) => `Resistance to Bludgeoning, Piercing and Slashing damage, +${t.rageDamage} damage on STR attacks, Advantage on STR checks and saves; no spells. Lasts until the end of your next turn unless you keep it going (10 minutes at most).` +
      (l >= 7 ? ' Instinctive Pounce: you can move up to half your Speed as you enter it.' : '') }],
  persistentRage: [{ name: 'All Rages back', time: 'when you roll Initiative', refill: 'rage', text: 'Persistent Rage: regain all your Rage uses.' }],
  bardicInspiration: [
    { name: 'Bardic Inspiration', time: 'Bonus Action', text: (l, t) => `A creature within 60 ft gets your d${t.bardicInspirationDie}: within an hour it can add it to a D20 Test it fails.` },
    { name: 'Cutting Words', sub: 'College of Lore', time: 'Reaction', roll: (l, t) => die(1, t.bardicInspirationDie, { what: 'off its roll' }) },
    { name: 'Peerless Skill', sub: 'College of Lore', from: 14, time: 'after failing a check or attack roll', roll: (l, t) => die(1, t.bardicInspirationDie, { what: 'added to your roll' }) },
    { name: 'One back for a slot', from: 5, cost: -1, slot: 'spend', time: 'no action', text: 'Font of Inspiration: spend a spell slot (any level) to regain one use.' }],
  channelCleric: [
    { name: 'Divine Spark', time: 'Magic action', options: ['Healing', 'Radiant', 'Necrotic'], ask: 'Heal a creature within 30 ft, or harm it?',
      roll: (l, t, p) => die(byLevel({ 2: 1, 7: 2, 13: 3, 18: 4 }, l), 8, { flat: mod('WIS'), heal: p === 'Healing', type: String(p).toLowerCase() }),
      dc: (l, t, p) => p !== 'Healing' && ['CON', spellDC(), true], text: 'Heal a creature within 30 ft, or deal Radiant or Necrotic damage to it (CON save for half).' },
    { name: 'Turn Undead', time: 'Magic action', dc: () => ['WIS', spellDC()], roll: l => l >= 5 ? die(mod1('WIS'), 8, { type: 'radiant', label: 'Sear Undead' }) : null,
      text: l => 'Undead of your choice within 30 ft make a WIS save or are Frightened and Incapacitated for 1 minute (until they take damage).' +
        (l >= 5 ? ' Sear Undead: each one that fails takes the Radiant damage.' : '') },
    { name: 'Preserve Life', sub: 'Life Domain', time: 'Magic action', text: l => `Restore up to ${5 * l} HP, split among Bloodied creatures within 30 ft (none above half its HP maximum).` },
    { name: 'Radiance of the Dawn', sub: 'Light Domain', time: 'Magic action', roll: l => die(2, 10, { flat: l, type: 'radiant' }), dc: () => ['CON', spellDC(), true] },
    { name: 'Invoke Duplicity', sub: 'Trickery Domain', time: 'Bonus Action' },
    { name: 'Guided Strike', sub: 'War Domain', time: 'after seeing the attack roll' }],
  wildShape: [
    { name: 'Wild Shape', time: 'Bonus Action', state: 'Wild Shape', temp: l => (subOf('druid') === 'Circle of the Moon' ? 3 : 1) * l,
      text: l => `Become a Beast form you know for ${Math.max(1, Math.floor(l / 2))} hours; you keep your HP and mind, and can't cast spells.` },
    { name: 'Wild Companion', time: 'Magic action' },
    { name: "Land's Aid", sub: 'Circle of the Land', time: 'Magic action', dc: () => ['CON', spellDC(), true],
      roll: l => { const n = byLevel({ 3: 2, 10: 3, 14: 4 }, l); return [die(n, 6, { type: 'necrotic', label: 'Damage' }), die(n, 6, { heal: true, label: 'One creature heals' })]; } },
    { name: "Nature's Sanctuary", sub: 'Circle of the Land', from: 14, time: 'Magic action' },
    { name: 'Starry Form', sub: 'Circle of the Stars', time: 'Bonus Action', state: 'Starry Form' },
    { name: 'Wrath of the Sea', sub: 'Circle of the Sea', time: 'Bonus Action', roll: () => die(mod1('WIS'), 6, { type: 'cold' }), dc: () => ['CON', spellDC()] }],
  secondWind: [
    { name: 'Second Wind', time: 'Bonus Action', roll: l => die(1, 10, { flat: l, heal: true }), feet: l => l >= 5 ? 'half' : 0, feetBy: 'Tactical Shift',
      text: l => `Regain 1d10 + ${l} HP.` + (l >= 5 ? ' Tactical Shift: you can also move up to half your Speed without Opportunity Attacks.' : '') },
    { name: 'Tactical Mind', from: 2, time: 'after failing an ability check', roll: () => die(1, 10, { what: 'added to the check' }),
      text: "Add 1d10 to the check. If it still fails, the use isn't spent: Undo it in the log." }],
  actionSurge: [{ name: 'Action Surge', time: 'on your turn', ask: 'What is the extra action? (Not the Magic action.)',
    options: () => [[`Attack (+${perAction()} attacks)`, 'attack'], ['Dash', 'dash'], ['Another action', 'other']],
    attacks: (l, t, p) => p === 'attack' ? perAction() : 0, dashes: (l, t, p) => p === 'dash' ? 1 : 0, text: 'One more action this turn (not the Magic action).' }],
  indomitable: [{ name: 'Indomitable', time: 'after failing a save', ask: 'Which save do you roll again?', save: true,
    options: () => Object.entries(D.rules.abilities).map(([ab, n]) => [n, ab]), text: l => `Roll the failed save again with +${l} (your Fighter level).` }],
  focus: [
    { name: 'Flurry of Blows', time: 'Bonus Action', attacks: l => l >= 10 ? 3 : 2, text: l => `${l >= 10 ? 'Three' : 'Two'} Unarmed Strikes (added to this turn's attacks).` },
    { name: 'Patient Defense', time: 'Bonus Action', state: 'Dodging', roll: (l, t) => l >= 10 ? die(2, t.martialArtsDie, { temp: true }) : null,
      text: l => 'Disengage and Dodge.' + (l >= 10 ? ' Heightened Focus: Temporary HP = two Martial Arts dice.' : '') },
    { name: 'Step of the Wind', time: 'Bonus Action', dashes: 1,
      text: l => "Disengage and Dash (your Speed is added to this turn's movement); your jump distance is doubled." + (l >= 10 ? ' You can carry a willing Large or smaller creature along.' : '') },
    { name: 'Stunning Strike', from: 5, time: 'on a hit, once per turn', dc: () => ['CON', kiDC()],
      text: 'On a failed save the target is Stunned until the start of your next turn; on a success its Speed is halved and the next attack against it has Advantage.' },
    { name: 'Deflect Attacks', from: 3, cost: 0, time: 'Reaction', roll: l => die(1, 10, { flat: mod('DEX') + l, what: 'damage taken off' }),
      text: l => `When an attack hits you${l >= 13 ? '' : ' with Bludgeoning, Piercing or Slashing damage'}, reduce the damage by 1d10 + DEX modifier + ${l}.` },
    { name: 'Redirect', from: 3, time: 'after Deflect Attacks took all the damage', roll: (l, t) => die(2, t.martialArtsDie, { flat: mod('DEX') }), dc: () => ['DEX', kiDC()],
      text: "A creature within 5 ft (60 ft for a ranged attack) makes a DEX save or takes the damage, of the attack's type." },
    { name: 'Superior Defense', from: 18, cost: 3, time: 'start of your turn', state: 'Superior Defense' },
    { name: 'Hand of Healing', sub: 'Warrior of Mercy', time: 'Magic action', roll: (l, t) => die(1, t.martialArtsDie, { flat: mod('WIS'), heal: true }) },
    { name: 'Darkness', sub: 'Warrior of Shadow', time: 'Magic action', cast: 'Darkness', text: 'Shadow Arts: cast Darkness without components; you can see in it.' },
    { name: 'Elemental Attunement', sub: 'Warrior of the Elements', time: 'start of your turn', state: 'Elemental Attunement' },
    { name: 'Quivering Palm', sub: 'Warrior of the Open Hand', from: 17, cost: 4, time: 'on an Unarmed Strike hit', roll: () => die(10, 12, { type: 'force' }), dc: () => ['CON', kiDC(), true] }],
  uncannyMetabolism: [{ name: 'Uncanny Metabolism', time: 'when you roll Initiative', refill: 'focus', roll: (l, t) => die(1, t.martialArtsDie, { flat: l, heal: true }),
    text: l => `Regain all your Focus Points and heal a Martial Arts die + ${l}.` }],
  wholenessOfBody: [{ name: 'Wholeness of Body', time: 'Bonus Action', roll: (l, t) => die(1, t.martialArtsDie, { flat: mod('WIS'), heal: true }) }],
  layOnHands: [
    { name: 'Lay On Hands', time: 'Bonus Action', amount: true, show: 'HP', text: 'Touch a creature and restore HP from the pool.' },
    { name: 'Cure Poisoned', cost: 5, time: 'Bonus Action', text: 'Spend 5 points of the pool to end the Poisoned condition on the creature you touch.' }],
  channelPaladin: [
    { name: 'Divine Sense', time: 'Bonus Action', text: 'For 10 minutes you know where Celestials, Fiends and Undead within 60 ft are, and where places or objects are consecrated or desecrated.' },
    { name: 'Sacred Weapon', sub: 'Oath of Devotion', time: 'with the Attack action', state: 'Sacred Weapon' },
    { name: 'Peerless Athlete', sub: 'Oath of Glory', time: 'Bonus Action', state: 'Peerless Athlete' },
    { name: "Nature's Wrath", sub: 'Oath of the Ancients', time: 'Magic action', dc: () => ['STR', spellDC()] },
    { name: 'Vow of Enmity', sub: 'Oath of Vengeance', time: 'with the Attack action', state: 'Vow of Enmity' }],
  favoredEnemy: [{ name: "Hunter's Mark", time: 'Bonus Action', cast: "Hunter's Mark", text: "Cast Hunter's Mark without a spell slot (you concentrate on it)." }],
  tireless: [{ name: 'Tireless', time: 'Magic action', roll: () => die(1, 8, { flat: mod1('WIS'), temp: true }) }],
  innateSorcery: [{ name: 'Innate Sorcery', time: 'Bonus Action', state: 'Innate Sorcery' }],
  sorceryPoints: [
    { name: 'Metamagic', time: 'as you cast a spell', show: 'points', ask: 'Which Metamagic option?', options: () => metamagic().map(m => [`${m.name} (${m.cost})`, m.name]),
      cost: (l, t, p) => metaOf(p)?.cost ?? 1, text: (l, t, p) => metaOf(p)?.text || 'Change a spell as you cast it; each option costs Sorcery Points.' },
    { name: 'Create a spell slot', time: 'Bonus Action', show: 'points', slot: 'create', text: 'Font of Magic: spend Sorcery Points for a spell slot (level 1: 2, 2: 3, 3: 5, 4: 6, 5: 7).' },
    { name: 'Slot to points', time: 'no action', show: '+points', slot: 'convert', text: "Font of Magic: spend a spell slot for as many Sorcery Points as the slot's level." },
    { name: 'Innate Sorcery', from: 7, cost: 2, time: 'Bonus Action', state: 'Innate Sorcery', text: 'Sorcery Incarnate: with no Innate Sorcery uses left, 2 Sorcery Points start it.' }],
  magicalCunning: [{ name: 'Magical Cunning', time: '1-minute rite', pact: true, text: () => `Regain up to ${Math.ceil((pact()?.slots || 0) / 2)} spent Pact Magic slots (half of them, round up).` }],
  warPriest: [{ name: 'Bonus Action attack', time: 'Bonus Action', attacks: 1, text: "One weapon attack or Unarmed Strike (added to this turn's attacks)." }],
  superiority: [{ name: 'Maneuver', time: 'see the maneuver', ask: 'Which maneuver?', options: () => maneuvers().map(m => m.name),
    roll: l => die(1, byLevel({ 3: 8, 10: 10, 18: 12 }, l), { what: 'Superiority Die' }),
    text: (l, t, p) => { const m = maneuvers().find(x => x.name === p), dc = 8 + Math.max(mod('STR'), mod('DEX')) + pb();
      return m ? m.text + (/\bsave\b/i.test(m.text) ? ` Save DC ${dc}.` : '') : `Spend a Superiority Die on a maneuver (save DC ${dc}).`; } }],
  psiFighter: [
    { name: 'Protective Field', time: 'Reaction', roll: l => die(1, byLevel(PSI_D, l), { flat: mod1('INT'), what: 'damage taken off' }),
      text: 'When you or a creature within 30 ft takes damage, reduce it by the roll + INT modifier.' },
    { name: 'Telekinetic Movement', time: 'Magic action', text: 'Move a Large or smaller loose object or a willing creature within 30 ft up to 30 ft (free once per rest, else a die).' }],
  psiRogue: [
    { name: 'Psi-Bolstered Knack', time: 'after failing a check you are proficient in', roll: l => die(1, byLevel(PSI_D, l), { what: 'added to the check' }),
      text: 'Add the die to the check; it is spent only if you then succeed (else Undo it in the log).' },
    { name: 'Psychic Whispers', time: 'Magic action', roll: l => die(1, byLevel(PSI_D, l), { what: 'hours of telepathy' }),
      text: () => `Telepathy with up to ${pb()} creatures you can see, for that many hours (within 1 mile).` }],
  fightingSpirit: [{ name: 'Fighting Spirit', time: 'Bonus Action', state: 'Fighting Spirit', temp: l => byLevel({ 3: 5, 10: 10, 15: 15 }, l),
    text: l => `Advantage on weapon attack rolls this turn, and ${byLevel({ 3: 5, 10: 10, 15: 15 }, l)} Temporary HP.` }],
  bladesong: [{ name: 'Bladesong', time: 'Bonus Action', state: 'Bladesong' }],
  healingLight: [{ name: 'Healing Light', time: 'Bonus Action', show: 'd6s', ask: 'How many d6s?', options: (l, t, p, r) => upTo(Math.min(mod1('CHA'), r.left || mod1('CHA')), 6),
    cost: (l, t, p) => p || 1, roll: (l, t, p) => die(p, 6, { heal: true }) }],
  warriorOfTheGods: [{ name: 'Heal', time: 'Bonus Action', show: 'd12s', ask: 'How many d12s?', options: (l, t, p, r) => upTo(r.left || r.max, 12),
    cost: (l, t, p) => p || 1, roll: (l, t, p) => die(p, 12, { heal: true }), text: 'Spend and roll any number of the dice: you regain that many HP.' }],
  balmSummerCourt: [{ name: 'Balm of the Summer Court', time: 'Bonus Action', show: 'd6s', ask: 'How many d6s?',
    options: (l, t, p, r) => upTo(Math.min(Math.max(1, Math.floor(l / 2)), r.left || l), 6), cost: (l, t, p) => p || 1, roll: (l, t, p) => die(p, 6, { heal: true }),
    text: (l, t, p) => `An ally within 120 ft regains the roll in HP, and gains ${p ? p + ' ' : '1 per die in '}Temporary HP.` }],
  // species traits (their rows are 'sp:<trait>')
  'sp:Adrenaline Rush': [{ name: 'Adrenaline Rush', time: 'Bonus Action', dashes: 1, temp: () => pb(), text: () => `Dash, and gain ${pb()} Temporary HP (your Proficiency Bonus).` }],
  'sp:Rabbit Hop': [{ name: 'Rabbit Hop', time: 'Bonus Action', feet: () => 5 * pb(),
    text: () => `Jump up to ${5 * pb()} ft without provoking Opportunity Attacks (added to this turn's movement; not while your Speed is 0).` }],
  'sp:Large Form': [{ name: 'Large Form', time: 'Bonus Action', state: 'Large Form' }]
};
const actionsOf = r => r.cls ? (ACTIONS[r.id] || []).filter(a => r.lvl >= (a.from || 0) && (!a.sub || subOf(r.cls) === a.sub)) : r.species ? ACTIONS[r.id] || [] : [];
const featureText = (r, name) => (r.species ? C.speciesData?.features || []
  : [...D.classes[r.cls]?.features || [], ...(C.classes || []).find(c => c.key === r.cls)?.sub?.features || []]).find(f => f.name === name)?.text;
const actionText = (r, a, pick) => (typeof a.text === 'function' ? a.text(r.lvl, r.row, pick, r) : a.text) || featureText(r, a.name) || '';
const badge = a => a.show || (typeof a.cost === 'function' ? null : (a.cost ?? 1) === 0 ? 'free' : a.cost < 0 ? `+${-a.cost}` : String(a.cost ?? 1));

// "Heal yourself: HP 12 → 19" / "Set your Temp HP to 8" in a log entry: the sheet changes only if you click it
function hpLine(n, temp) {
  const box = F(temp ? 'hpTemp' : 'hp');
  if (!box || !(n > 0)) return null;
  const p = h('p', { class: 'slot-line' });
  const show = () => {
    const cur = numIn(S.get(box)) ?? 0, max = hpMax(), to = temp ? n : max != null ? Math.min(max, cur + n) : cur + n;
    if (temp && cur >= n) return p.replaceChildren(`You have ${cur} Temporary HP already (they don't add up).`);
    if (!temp && to <= cur) return p.replaceChildren('Your HP are at their maximum.');
    p.replaceChildren(h('button', { class: 'use', onclick: () => {
      S.transaction(temp ? 'Temporary HP' : 'Healing', () => S.set(box, String(to)));
      p.replaceChildren(`${temp ? 'Temp HP' : 'HP'} ${cur} → ${to} on your sheet. `, h('button', { onclick: () => { S.transaction('Undo', () => S.set(box, cur ? String(cur) : '')); show(); } }, 'Undo'));
    } }, temp ? `Set your Temp HP to ${n}` : `Heal yourself: HP ${cur} → ${to}`));
  };
  show();
  return p;
}

// Use a feature: ask what is needed, spend the uses (one Undo step with whatever else it changes), add to this turn, and
// log it with an Undo. Not enough uses left asks first (use it anyway: the count stays); it never blocks.
async function useAction(r, a) {
  const fx = window.effects, of = (v, pick) => typeof v === 'function' ? v(r.lvl, r.row, pick, r) : v;
  const choose = (title, text, list) => window.ask({ title, text, buttons: [{ label: 'Cancel', value: null }, ...list.map(([label, value]) => ({ label, value }))] });
  let pick = null, label = null, slot = null, healed = 0;
  const opts = of(a.options);
  if (opts) {
    const list = opts.map(o => Array.isArray(o) ? o : [o, o]);
    pick = await choose(a.name, of(a.ask) || null, list);
    if (pick == null) return;
    label = list.find(x => x[1] === pick)[0];
  }
  let cost = of(a.cost, pick) ?? 1;
  if (a.amount) {
    const missing = Math.max(0, (hpMax() ?? 0) - (hpNow() ?? 0));
    const input = h('input', { type: 'number', min: 1, value: Math.max(1, Math.min(r.left, missing || r.left)) });
    const go = await window.ask({ title: a.name, text: `${r.left} of ${r.max} HP left in the pool.`, body: h('div', { class: 'ask-body' }, h('label', {}, 'HP to restore', input)),
      buttons: [{ label: 'Cancel', value: null }, { label: 'Restore', value: true, primary: true }] });
    if (!go) return;
    cost = healed = Math.max(1, Math.round(+input.value || 0));
    label = `${healed} HP`;
  }
  if (a.slot === 'spend' || a.slot === 'convert') {
    if (!r.used) return window.ask({ title: a.name, text: `You have all your ${r.name} already.` });
    const have = slots().filter(s => s.left > 0);
    if (!have.length) return window.ask({ title: a.name, text: 'You have no spell slots left to spend.' });
    const l = await choose(a.name, a.slot === 'convert' ? 'Which spell slot becomes Sorcery Points?' : 'Which spell slot do you spend?',
      have.map(s => [a.slot === 'convert' ? `Level ${s.level}: +${s.level} points` : `Level ${s.level} (${s.left} left)`, s.level]));
    if (l == null) return;
    slot = { level: l, n: 1 };
    if (a.slot === 'convert') cost = -l;
    label = `level ${l} slot`;
  }
  if (a.slot === 'create') {
    const font = (D.classes.sorcerer.fontOfMagic || []).filter(([, , min]) => r.lvl >= min);
    const l = await choose(a.name, 'A spell slot you create is gone after a Long Rest.', font.map(([sl, c]) => [`Level ${sl} (${c} points)`, sl]));
    if (l == null) return;
    cost = font.find(x => x[0] === l)[1];
    label = `level ${l}`;
    if (slotUsed(l) > 0) slot = { level: l, n: -1 };
    else if (!await window.ask({ title: a.name, text: `None of your level ${l} slots are spent, and a slot above your maximum can't be shown here. Spend the points anyway?`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'Spend them', value: true, primary: true }] })) return;
  }
  if (a.pact) {
    const p = pact(), n = p ? Math.min(Math.ceil(p.slots / 2), slotUsed(p.level)) : 0;
    if (n) slot = { level: p.level, n: -n };
  }
  let short = false;
  if (cost > r.left) {
    if (!await window.ask({ title: `Not enough ${r.name}`, text: `${a.name} needs ${cost} and you have ${r.left} left. Use it anyway? The count stays as it is.`,
      buttons: [{ label: 'Cancel', value: false }, { label: 'Use anyway', value: true, primary: true }] })) return;
    short = true;
  }
  if (a.ends && !await fx.interrupt(a.name, a.ends)) return;
  let keep = false;
  const cur = fx.concentration();
  if (a.cast && cur && cur.name !== a.cast) {
    const x = await fx.interrupt('Cast', `${a.cast} needs concentration too, so casting it ends ${cur.name}.`, `Cast, switch to ${a.cast}`);
    if (!x) return;
    keep = x === 'keep';
  }
  // spend (one Undo step); `back` takes it back
  const back = [], did = [];
  const uses = (id, n) => { const b = st().used?.[id] || 0; writeUsed(id, n); back.push(() => writeUsed(id, b)); };
  S.transaction(a.name, () => {
    if (cost && !short) uses(r.id, Math.max(0, Math.min(r.max, (st().used?.[r.id] || 0) + cost)));
    if (a.refill) { uses(a.refill, 0); did.push(`All your ${resources().find(x => x.id === a.refill)?.name || 'uses'} back.`); }
    if (slot) {
      const b = slotUsed(slot.level);
      writeSlotUsed(slot.level, Math.max(0, b + slot.n));
      back.push(() => writeSlotUsed(slot.level, b));
      did.push(slot.n > 0 ? `Used a level ${slot.level} spell slot.` : `${-slot.n} level ${slot.level} slot${slot.n < -1 ? 's' : ''} back.`);
    } else if (a.pact) did.push('No spent Pact Magic slots to regain.');
    if (a.state && !fx.hasState(a.state)) { fx.setState(a.state, true); back.push(() => fx.setState(a.state, false)); did.push(`${a.state} is in the Effects tray.`); }
    if (a.cast && !keep && fx.concentration()?.name !== a.cast) {
      const p = fx.concentration();
      fx.concentrate(a.cast);
      back.push(() => fx.concentrate(p?.name ?? null, p?.slot ?? null));
      did.push(`Concentrating on ${a.cast} now.`);
    }
  });
  changed();
  // this turn (turn.js): attacks, Dashes, movement; the turn bar's button can take it all back with the same Undo
  const attacks = of(a.attacks, pick) || 0, dashes = of(a.dashes, pick) || 0, feetWant = of(a.feet, pick) || 0;
  const tname = feetWant && a.feetBy ? a.feetBy : a.name;
  let undone = false, undoBtn = null, got = null;
  const undo = () => {
    if (undone) return;
    undone = true;
    S.transaction('Undo ' + a.name, () => back.reverse().forEach(f => f()));
    if (got) window.turn?.add({ name: tname, attacks: -attacks, dashes: -dashes, feet: -got.feet, id: got.id });
    changed();
    undoBtn?.replaceWith('(undone)');
  };
  if (attacks || dashes || feetWant) got = window.turn?.add({ name: tname, attacks, dashes, feet: feetWant, undo }) || null;
  const feet = got?.feet || 0;
  if (attacks) did.push(`+${attacks} attack${attacks > 1 ? 's' : ''} this turn.`);
  if (dashes) did.push("Dash: your Speed is added to this turn's movement.");
  if (feet) did.push(`${a.feetBy && a.feetBy !== a.name ? a.feetBy + ': y' : 'Y'}ou can move ${feet} ft more this turn.`);
  const now = resources().find(x => x.id === r.id);
  const spent = short ? `Not enough ${r.name} left: used anyway.` : cost > 0 ? `${r.name}: ${cost} used, ${now?.left ?? 0} of ${r.max} left.`
    : cost < 0 ? `${r.name}: ${Math.min(-cost, r.used)} back, ${now?.left ?? r.max} of ${r.max} left.` : null;
  const line = h('p', { class: 'slot-line' }, [spent, ...did].filter(Boolean).join(' ') + ' ');
  if (back.length || got) line.append(undoBtn = h('button', { onclick: undo }, 'Undo'));
  if (a.save) { // Indomitable: the save itself is the log entry
    const node = window.roller.save(pick, `${a.name}: ${D.rules.abilities[pick]} save`, null, r.lvl);
    node?.querySelector('footer').before(line);
    return;
  }
  const dc = of(a.dc, pick), temp = of(a.temp, pick), text = actionText(r, a, pick);
  const entry = again => {
    const lines = [].concat(of(a.roll, pick) || []).filter(Boolean).map(x => ({ label: x.label || null, what: x.what, heal: !!(x.heal || x.temp),
      damage: window.roller.rollDamage([{ label: a.name, n: x.n, d: x.d, flat: x.flat || 0, type: x.heal ? 'healing' : x.temp ? 'temporary HP' : x.type || '' }]), temp: x.temp }));
    const hp = [healed && hpLine(healed), temp && hpLine(temp, true), ...lines.filter(l => l.heal).map(l => hpLine(l.damage.total, l.temp))];
    return window.roller.log({ title: a.name + (label ? `: ${label}` : ''), tag: [short ? `${r.name}: none left` : cost > 0 ? `${r.name} −${cost}` : cost < 0 ? `${r.name} +${-cost}` : 'Free', a.time],
      dc: dc ? { save: dc[0], dc: dc[1], half: dc[2] } : null, lines, notes: [text, temp ? `Temporary HP: ${temp}.` : null], noTotal: true,
      extra: [...hp, again ? null : line].filter(Boolean), again: lines.length ? () => entry(true) : null });
  };
  entry(false);
}

// ---- Hit Point Dice -----------------------------------------------------------------------------------
// Where the sheet keeps them: the official sheet has a "spent" box (a count); the classic sheet has "Total" above the big
// Hit Dice box, which then holds the dice you have left ("3d8", "3d8 + 2d6" or "3"). Other sheets: sheetState only.
const diceIn = t => { const m = {}; for (const [, n, d] of String(t ?? '').matchAll(/(\d+)\s*d\s*(\d+)/gi)) m[d] = (m[d] || 0) + +n; return m; };
const leftBox = () => S.field('hitDiceTotal') && S.field('hitDice') && !S.field('hitDiceSpent') ? S.field('hitDice') : null;
// n spent dice spread over the dice types, the biggest first (the box only says how many)
const spread = (n, order, total) => { const out = {}; for (const d of order) { const k = Math.min(n, total[d]); if (k > 0) out[d] = k; n -= k; } return out; };
// The dice left as written in the classic Hit Dice box: { die: count }, or null when it doesn't say (empty, "d8", other dice)
function leftInBox(order, total) {
  const box = leftBox(), t = String(box ? S.get(box) ?? '' : '').trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) {
    const all = sum(order.map(d => total[d])), spent = spread(Math.max(0, all - +t), order, total);
    return Object.fromEntries(order.map(d => [d, total[d] - (spent[d] || 0)]));
  }
  const m = diceIn(t);
  return Object.keys(m).length && Object.keys(m).every(d => d in total) ? m : null;
}

// -> { dice: [{ die, total, spent, left }] (biggest die first), spent, box (the official sheet's spent box) }
function hitDice() {
  const total = {};
  for (const c of C.classes || []) { const d = D.classes[c.key].hitDie; total[d] = (total[d] || 0) + c.level; }
  if (!Object.keys(total).length) Object.assign(total, diceIn(C.hitDiceTotal || C.hitDice));
  const order = Object.keys(total).map(Number).sort((a, b) => b - a), box = S.field('hitDiceSpent'), inBox = leftInBox(order, total);
  let spent = { ...st().hitDiceSpent };
  if (box) { // the box holds a count; which dice were spent is kept in sheetState, else the biggest are assumed
    const n = numIn(S.get(box)) ?? 0;
    if (sum(Object.values(spent)) !== n) spent = spread(n, order, total);
  } else if (inBox) spent = Object.fromEntries(order.map(d => [d, Math.max(0, total[d] - (inBox[d] || 0))]));
  const dice = order.map(d => { const s = Math.min(total[d], spent[d] || 0); return { die: d, total: total[d], spent: s, left: total[d] - s }; });
  return { dice, spent: sum(dice.map(d => d.spent)), box };
}
function writeHitDiceSpent(map) {
  const clean = Object.fromEntries(Object.entries(map).filter(([, n]) => n > 0));
  const box = S.field('hitDiceSpent'), lb = leftBox(), hd = hitDice();
  const total = Object.fromEntries(hd.dice.map(d => [d.die, d.total])), order = hd.dice.map(d => d.die);
  if (lb && !box && (leftInBox(order, total) || !String(S.get(lb) ?? '').trim())) {
    // the classic Hit Dice box: write the dice left, in the box's own style ("3" stays a number)
    const left = order.map(d => [d, total[d] - (clean[d] || 0)]), plain = /^\d+$/.test(String(S.get(lb) ?? '').trim());
    const text = plain ? String(sum(left.map(x => x[1]))) : left.filter(x => x[1] > 0).map(([d, n]) => `${n}d${d}`).join(' + ') || `0d${order[0]}`;
    if (String(S.get(lb) ?? '').trim() !== text) S.set(lb, text);
    delete st().hitDiceSpent;
    return;
  }
  if (Object.keys(clean).length) st().hitDiceSpent = clean; else delete st().hitDiceSpent;
  if (box) {
    const n = sum(Object.values(clean)), cur = numIn(S.get(box));
    if (cur !== n && !(cur == null && n === 0)) S.set(box, String(n));
  }
}
function setHitDieLeft(die, left) {
  const hd = hitDice(), d = hd.dice.find(x => x.die === die);
  if (!d) return;
  left = Math.max(0, Math.min(d.total, left));
  if (left === d.left) return;
  S.transaction('Hit Point Dice', () => writeHitDiceSpent({ ...Object.fromEntries(hd.dice.map(x => [x.die, x.spent])), [die]: d.total - left }));
  changed();
}

// ---- The Rest tab in the roller --------------------------------------------------------------------------
// A row of pips (or a number for big pools): click a full pip to use one, an empty one to get it back
function counter(label, left, max, setLeft, sub) {
  const ctl = max <= 12
    ? h('span', { class: 'pips' }, Array.from({ length: max }, (_, i) => h('button', { class: 'pip' + (i < left ? ' on' : ''),
      title: i < left ? 'Use one' : 'Get one back', 'aria-label': `${label}: ${i < left ? 'use one' : 'get one back'}`,
      onclick: () => setLeft(i < left ? left - 1 : left + 1) })))
    : h('span', { class: 'pool' }, h('button', { class: 'pstep', 'aria-label': `${label}: one less`, onclick: () => setLeft(left - 1) }, '−'),
      h('input', { type: 'number', min: 0, max, value: left, 'aria-label': label, onchange: e => setLeft(Math.round(+e.target.value || 0)) }),
      h('button', { class: 'pstep', 'aria-label': `${label}: one more`, onclick: () => setLeft(left + 1) }, '+'));
  return h('div', { class: 'res' + (left ? '' : ' empty') }, h('span', { class: 'rname' }, h('b', {}, label), sub ? h('small', {}, sub) : null),
    ctl, h('span', { class: 'rleft' }, `${left}/${max}`));
}

function slotRows() {
  const p = pact();
  return slots().map(s => counter(`Level ${s.level}`, s.left, s.total, left => setSlotUsed(s.level, s.total - left),
    p && p.level === s.level ? `${plural(p.slots, 'Pact Magic slot')} come back on a Short Rest` : null));
}

// The spell slots in a short strip (the Spell tab shows it above the spell list)
function slotStrip() {
  const list = S.loaded ? slots() : [];
  if (!list.length) return null;
  return h('div', { class: 'slotstrip', title: 'Spell slots left: click a full one to use it, an empty one to get it back' },
    list.map(s => h('span', { class: 'ss' + (s.left ? '' : ' empty') }, h('small', {}, s.level),
      Array.from({ length: s.total }, (_, i) => h('button', { class: 'pip' + (i < s.left ? ' on' : ''), 'aria-label': `Level ${s.level} slot: ${i < s.left ? 'use one' : 'get one back'}`,
        onclick: () => setSlotUsed(s.level, s.used + (i < s.left ? 1 : -1)) })))));
}

function view() {
  if (!S.loaded) return h('p', { class: 'hint' }, 'Load a character sheet to keep track of its spell slots, class features and Hit Point Dice.');
  const sl = slotRows(), rs = resources(), hd = hitDice();
  return [
    h('div', { class: 'rollbtns two restbtns' },
      h('button', { onclick: () => openRest('short') }, h('b', {}, 'Short Rest'), h('small', {}, '1 hour')),
      h('button', { class: 'go', onclick: () => openRest('long') }, h('b', {}, 'Long Rest'), h('small', {}, '8 hours'))),
    sl.length ? [h('h4', {}, 'Spell slots'), h('div', { class: 'reslist' }, sl)] : null,
    rs.length ? [h('h4', {}, 'Features'), h('div', { class: 'reslist' }, rs.map(r => {
      // the feature's uses, then what you can spend them on (a click asks what it needs, spends them and logs it)
      const acts = actionsOf(r);
      return [counter(r.name, r.left, r.max, left => setUsed(r.id, r.max - left), [r.note, BACK[r.back]].filter(Boolean).join(' · ')),
        acts.length ? h('div', { class: 'racts' }, acts.map(a => {
          const cost = typeof a.cost === 'function' ? 1 : a.cost ?? 1, b = badge(a);
          return h('button', { class: 'ract' + (cost > r.left ? ' short' : ''), title: [a.time, actionText(r, a)].filter(Boolean).join(': '), onclick: () => useAction(r, a) },
            a.name, b ? h('small', {}, b) : null);
        })) : null];
    }))] : null,
    hd.dice.length ? [h('h4', {}, 'Hit Point Dice'), h('div', { class: 'reslist' }, hd.dice.map(d =>
      counter('d' + d.die, d.left, d.total, left => setHitDieLeft(d.die, left), 'spend them on a Short Rest')))] : null,
    !sl.length && !rs.length && !hd.dice.length ? h('p', { class: 'hint' }, 'No spell slots, limited-use class features or Hit Point Dice found. Write your class and level in the Class box.') : null
  ];
}

// ---- Short and Long Rest window ----------------------------------------------------------------------------
let R = null, win = null; // R: { kind: 'short' | 'long', rolls: [{ die, v, con, total }], off: unticked row ids, seen: row ids shown so far, applied }
const F = key => S.field(key);
const hpNow = () => numIn(S.get(F('hp'))), hpMax = () => numIn(S.get(F('hpMax')));
const own = () => st().effects || [];
const exhaustion = () => own().find(e => e.name === 'Exhaustion');
const conc = () => window.effects?.concentration();
// Hours a concentration spell lasts ("up to 10 minutes" -> 1/6), null when unknown
const hoursOf = text => { const m = String(text ?? '').match(/(\d+)\s*(minute|hour|day)/i); return m ? +m[1] * { minute: 1 / 60, hour: 1, day: 24 }[m[2].toLowerCase()] : null; };

// Arcane Recovery: spent slots worth up to half your Wizard level (rounded up), none of level 6+, the biggest first
function arcanePlan(used) {
  let budget = Math.ceil(classLevel('wizard') / 2);
  const out = [];
  for (let l = 5; l >= 1; l--) {
    for (let k = 0; k < used[l] && l <= budget; k++) { out.push(l); budget -= l; }
  }
  return out;
}

// Every change the rest makes: { group, id, label, from, to, note, apply (none = a note only), off (unticked at first) }
const GROUPS = ['Hit Points', 'Spell slots', 'Features', 'Conditions', 'Good to know'];
function changes() {
  const rows = [], add = (group, r) => rows.push({ group, ...r }), long = R.kind === 'long';
  const hp = hpNow(), max = hpMax(), hd = hitDice(), res = resources();
  const usedNow = Object.fromEntries(Array.from({ length: 9 }, (_, i) => [i + 1, slotUsed(i + 1)]));
  if (long) {
    if (max != null && (hp == null || hp < max)) add('Hit Points', { id: 'hp', label: 'Current HP', from: hp ?? '—', to: max, apply: () => S.set(F('hp'), String(hpMax())) });
    else if (max == null) add('Hit Points', { label: 'Current HP', note: 'Back to your Hit Point maximum (no Max HP on the sheet to copy).' });
    const temp = numIn(S.get(F('hpTemp')));
    if (temp) add('Hit Points', { id: 'temp', label: 'Temporary HP', from: temp, to: '—', note: 'they last until a Long Rest', apply: () => S.set(F('hpTemp'), '') });
    if (hd.spent) add('Hit Points', { id: 'hd', label: 'Hit Point Dice spent', from: hd.spent, to: 0, note: 'a Long Rest brings all of them back', apply: () => writeHitDiceSpent({}) });
    const levels = Object.entries(usedNow).filter(([, n]) => n > 0);
    if (levels.length) add('Spell slots', { id: 'slots', label: 'Spell slots', from: levels.map(([l, n]) => `level ${l} ×${n} used`).join(', '), to: 'all back',
      apply: () => { for (const [l] of levels) writeSlotUsed(+l, 0); } });
    for (const r of res) if (r.used) add('Features', { id: 'res:' + r.id, label: r.name, from: `${r.left}/${r.max}`, to: `${r.max}/${r.max}`, apply: () => writeUsed(r.id, 0) });
    const ex = exhaustion();
    if (ex) {
      const lvl = Math.max(1, Math.min(6, +ex.level || 1));
      add('Conditions', { id: 'exhaustion', label: 'Exhaustion', from: `level ${lvl}`, to: lvl > 1 ? `level ${lvl - 1}` : 'gone', note: 'a Long Rest takes one level away',
        apply: () => { const e = exhaustion(); if (!e) return; if (lvl > 1) e.level = lvl - 1; else own().splice(own().indexOf(e), 1); window.effects?.changed(); } });
    }
    const ds = S.map?.checks ? [...S.map.checks.deathSuccesses, ...S.map.checks.deathFailures].filter(b => S.get(b)) : [];
    if (ds.length) add('Conditions', { id: 'death', label: 'Death Saving Throws', from: `${ds.length} ticked`, to: 'cleared', apply: () => { for (const b of ds) S.set(b, false); } });
    const c = conc();
    if (c) {
      const hrs = hoursOf(c.duration);
      add('Conditions', { id: 'conc', label: `End concentration on ${c.name}`, off: !(hrs != null && hrs <= 8),
        note: hrs != null ? (hrs <= 8 ? `it lasts ${c.duration}, so it ran out during the rest` : `it lasts ${c.duration}: untick to keep it`) : 'untick it if the spell still lasts',
        apply: () => window.effects.concentrate(null) });
    }
    if (hp != null && hp < 1) add('Good to know', { label: 'At 0 HP', note: 'You need at least 1 Hit Point to start a Long Rest (your DM may still allow it).' });
  } else {
    const rolled = sum(R.rolls.map(r => r.total));
    if (R.rolls.length) {
      if (hp != null) add('Hit Points', { id: 'hp', label: 'Current HP', from: hp, to: max != null ? Math.min(max, hp + rolled) : hp + rolled,
        note: `+${rolled} from ${R.rolls.length} Hit Point ${R.rolls.length === 1 ? 'Die' : 'Dice'}${max != null && hp + rolled > max ? ` (capped at your maximum, ${max})` : ''}`,
        apply: () => { const n = hpNow() ?? 0, m = hpMax(); S.set(F('hp'), String(m != null ? Math.min(m, n + rolled) : n + rolled)); } });
      else add('Hit Points', { label: `+${rolled} HP`, note: 'No number in the Current HP box: add it yourself.' });
      const spend = { ...Object.fromEntries(hd.dice.map(d => [d.die, d.spent])) };
      for (const r of R.rolls) spend[r.die] = (spend[r.die] || 0) + 1;
      add('Hit Points', { id: 'hd', label: 'Hit Point Dice spent', from: hd.spent, to: hd.spent + R.rolls.length,
        note: R.rolls.map(r => 'd' + r.die).join(', '), apply: () => writeHitDiceSpent(spend) });
    }
    const p = pact(), after = { ...usedNow };
    if (p && usedNow[p.level]) {
      const back = Math.min(usedNow[p.level], p.slots);
      after[p.level] -= back;
      add('Spell slots', { id: 'pact', label: `Pact Magic slots (level ${p.level})`, from: `${slotsLeft(p.level)} left`, to: `${slotsLeft(p.level) + back} left`,
        apply: () => writeSlotUsed(p.level, slotUsed(p.level) - back) });
    }
    const ar = res.find(r => r.id === 'arcaneRecovery'), plan = ar?.left ? arcanePlan(after) : [];
    if (plan.length) {
      add('Spell slots', { id: 'arcane', label: 'Arcane Recovery', off: true, to: plan.map(l => `level ${l}`).join(', '),
        note: `once per Long Rest: slots worth up to ${Math.ceil(classLevel('wizard') / 2)} levels. Tick it to use it now.`,
        apply: () => { for (const l of plan) writeSlotUsed(l, slotUsed(l) - 1); writeUsed('arcaneRecovery', 1); } });
    }
    const sp = res.find(r => r.id === 'sorceryPoints'), sr = res.find(r => r.id === 'sorcerousRestoration');
    if (sp?.used && sr?.left) {
      const back = Math.min(sp.used, Math.floor(classLevel('sorcerer') / 2));
      add('Features', { id: 'restoration', label: 'Sorcerous Restoration', off: true, from: `${sp.left}/${sp.max} Sorcery Points`, to: `${sp.left + back}/${sp.max}`,
        note: 'once per Long Rest. Tick it to use it now.', apply: () => { writeUsed('sorceryPoints', sp.used - back); writeUsed('sorcerousRestoration', 1); } });
    }
    for (const r of res) {
      if (!r.used || r.back === 'long') continue;
      const used = r.back === 'short' ? 0 : r.used - 1;
      add('Features', { id: 'res:' + r.id, label: r.name, from: `${r.left}/${r.max}`, to: `${r.max - used}/${r.max}`, note: BACK[r.back], apply: () => writeUsed(r.id, used) });
    }
  }
  if (st().mode === 'marble') add('Good to know', { label: 'Killing Marble', note: `This rest takes ${long ? '8 hours' : '1 hour'}. The marble isn't changed here: use "An hour passes" on the Becoming Marble page for each hour.` });
  if (!rows.some(r => r.apply)) add('Good to know', { label: 'Nothing to get back', note: long ? 'You are rested already: full HP, every slot and feature.' : 'Roll Hit Point Dice above to heal; your features that come back on a Short Rest are all there.' });
  return rows;
}

// Unticked rows: the ones you unticked, and optional ones (off) until you tick them
const ticked = r => !R.off.has(r.id) && !(r.off && !R.seen.has(r.id));
function apply() {
  const rows = changes(), todo = rows.filter(r => r.apply && ticked(r));
  S.transaction(R.kind === 'long' ? 'Long Rest' : 'Short Rest', () => {
    for (const r of todo) {
      try { r.apply(); r.done = true; } catch (err) { console.error('Rest: could not apply', r.label, err); r.failed = true; }
    }
  });
  R.applied = { rows };
  changed();
  window.effects?.changed();
  render();
}

// Short Rest: roll Hit Point Dice (as many as you like and have); each one can be taken back before Apply
function diceSection() {
  const hd = hitDice(), con = mod('CON'), hp = hpNow(), max = hpMax();
  if (!hd.dice.length) return h('p', { class: 'lu-note' }, 'No Hit Point Dice found: write your class and level in the Class box.');
  const rolledOf = d => R.rolls.filter(r => r.die === d).length, healed = sum(R.rolls.map(r => r.total));
  const roll = d => { const v = rnd(d); R.rolls.push({ die: d, v, con, total: Math.max(1, v + con), fresh: true }); render(); };
  return h('div', { class: 'lu-pick rest-dice' },
    h('div', { class: 'lu-pickhead' }, h('b', {}, 'Spend Hit Point Dice'), h('span', { class: 'lu-count' }, `CON ${fmt(con)}`)),
    h('div', { class: 'rest-roll' }, hd.dice.map(d => {
      const left = d.left - rolledOf(d.die);
      return h('button', { class: 'btn', disabled: left <= 0, onclick: () => roll(d.die) }, `Roll a d${d.die}`, h('small', {}, ` ${left} left`));
    })),
    R.rolls.length ? h('div', { class: 'rest-rolls' }, R.rolls.map((r, i) => h('span', { class: 'rest-chip' },
      h('b', { class: 'lu-die mini' + (r.fresh ? ' landed' : ''), 'data-d': r.die }, r.v),
      h('span', {}, `${con ? ` ${fmt(con)}` : ''} = ${r.total}`),
      h('button', { class: 'rest-x', title: "Don't spend this one", 'aria-label': 'Take this roll back', onclick: () => { R.rolls.splice(i, 1); render(); } }, '×')))) : null,
    h('p', { class: 'lu-note' }, R.rolls.length ? `+${healed} HP` + (hp != null ? `: Current HP ${hp} → ${max != null ? Math.min(max, hp + healed) : hp + healed}${max != null ? ` of ${max}` : ''}` : '')
      : hp != null && max != null && hp >= max ? 'You are at full HP.' : 'Each die heals what it shows + your CON modifier (at least 1). Roll as many as you want to spend.'));
}

function reviewList() {
  const done = R.applied, rows = done ? done.rows : changes();
  for (const r of rows) if (r.id && !R.seen.has(r.id)) { R.seen.add(r.id); if (r.off) R.off.add(r.id); } // optional rows start unticked
  return GROUPS.map(g => {
    const list = rows.filter(r => r.group === g);
    if (!list.length) return null;
    return h('section', { class: 'lu-group' }, h('h4', {}, g), h('ul', {}, list.map(r => {
      const on = !R.off.has(r.id);
      const tick = r.apply ? done ? h('span', { class: 'lu-state ' + (r.done ? 'ok' : r.failed ? 'bad' : 'skip') }, r.done ? '✓' : r.failed ? '!' : '–')
        : h('input', { type: 'checkbox', checked: on, 'aria-label': r.label, onchange: e => { e.target.checked ? R.off.delete(r.id) : R.off.add(r.id); } })
        : h('span', { class: 'lu-state info' }, '•');
      return h('li', { class: r.apply ? '' : 'info' }, h('label', {}, tick,
        h('span', { class: 'lu-row' }, h('b', {}, r.label),
          r.from != null || r.to != null ? h('span', { class: 'lu-ft' }, r.from != null ? h('s', {}, String(r.from)) : null, r.from != null ? ' → ' : '', h('em', {}, String(r.to ?? ''))) : null,
          r.note ? h('small', { class: 'lu-n' }, r.note) : null)));
    })));
  });
}

function render() {
  if (!R || !win) return;
  const long = R.kind === 'long', body = win.querySelector('.lu-body'), keep = body.scrollTop;
  win.querySelector('.lu-title b').textContent = long ? 'Long Rest' : 'Short Rest';
  win.querySelector('.lu-sub').textContent = `${String(C.name ?? '').trim() || 'Your character'} · ${long ? '8 hours' : '1 hour'}`;
  body.replaceChildren(...[
    R.applied ? h('p', { class: 'lu-lead' }, `${long ? 'Long' : 'Short'} Rest done: the ticked changes are on the sheet (Ctrl+Z takes them back). Download the PDF to keep them.`)
      : h('p', { class: 'lu-lead' }, long ? 'Everything a Long Rest brings back. Untick anything you don\'t want, then Apply. Nothing has changed yet.'
        : 'Spend Hit Point Dice if you want to heal, check the list, then Apply. Nothing has changed yet.'),
    !long && !R.applied ? diceSection() : null,
    reviewList()
  ].flat(Infinity).filter(Boolean));
  body.scrollTop = keep;
  for (const r of R.rolls) r.fresh = false;
  win.querySelector('.lu-foot').replaceChildren(...(R.applied
    ? [h('span', { class: 'grow' }), h('button', { class: 'btn primary', onclick: close }, 'Close')]
    : [h('button', { class: 'btn', onclick: cancel }, 'Cancel'), h('span', { class: 'grow' }),
      h('button', { class: 'btn primary rest-apply', onclick: apply }, `Apply ${long ? 'Long' : 'Short'} Rest`)]));
}

function openRest(kind) {
  if (win) {
    if (R.kind === kind || R.rolls.length) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); return; }
    close();
  }
  R = { kind, rolls: [], off: new Set(), seen: new Set(), applied: null };
  win = h('section', { id: 'restwin', class: 'lu', role: 'dialog', 'aria-label': 'Rest' },
    h('div', { class: 'lu-bar', title: 'Drag to move' },
      h('span', { class: 'lu-icon rest-icon', 'aria-hidden': 'true' }, '☾'), h('div', { class: 'lu-title' }, h('b', {}), h('span', { class: 'lu-sub' })),
      h('button', { class: 'lu-x', title: 'Close', 'aria-label': 'Close', onclick: () => R.applied ? close() : cancel() }, '✕')),
    h('div', { class: 'lu-body' }), h('div', { class: 'lu-foot' }));
  document.body.append(win);
  window.draggable(win, win.querySelector('.lu-bar'))(); // centred, at the top
  render();
}
function close() { win?.remove(); win = null; R = null; }
async function cancel() {
  if (!R.rolls.length) return close();
  const yes = await window.ask({ title: 'Cancel the rest?', text: 'The Hit Point Dice you rolled are not spent and nothing on the sheet changes.',
    buttons: [{ label: 'Keep resting', value: false }, { label: 'Cancel the rest', value: true, primary: true }] });
  if (yes) close();
}

$('rest').addEventListener('click', async () => {
  if (win) { win.classList.remove('flash'); void win.offsetWidth; win.classList.add('flash'); return; }
  const a = await window.ask({ title: 'Take a rest?', text: 'A Short Rest is 1 hour: spend Hit Point Dice to heal, and some features come back. ' +
    'A Long Rest is 8 hours: HP, Hit Point Dice, spell slots and features all come back. You see every change before it happens.',
  buttons: [{ label: 'Cancel', value: null }, { label: 'Short Rest', value: 'short' }, { label: 'Long Rest', value: 'long', primary: true }] });
  if (a) openRest(a);
});
document.addEventListener('sheet-loaded', () => { close(); $('rest').disabled = false; });
// keep the window up to date when the sheet changes (not while applying, not after)
for (const ev of ['character-change', 'resources-change', 'effects-change', 'sheet-state-change']) {
  document.addEventListener(ev, () => { if (R && !R.applied && !win.contains(document.activeElement)) render(); });
}

window.resources = { slots, slotsLeft, slotTotal, useSlot, restoreSlot, list: resources, setUsed, hitDice, view, slotStrip, openRest,
  actions: id => { const r = resources().find(x => x.id === id); return r ? actionsOf(r).map(a => a.name) : []; },
  action: (id, name) => { const r = resources().find(x => x.id === id), a = r && actionsOf(r).find(x => x.name === name);
    return a ? { name: a.name, time: a.time, text: actionText(r, a), cost: badge(a), resource: r.name, left: r.left, max: r.max } : null; },
  use: (id, name) => { const r = resources().find(x => x.id === id), a = r && actionsOf(r).find(x => x.name === name); return a ? useAction(r, a) : null; } };
})();
