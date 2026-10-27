/* games/dead-signal/packs/ds-story/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Story',
  version: '0.7.0',
  description: 'Dead Signal’s story and its floors. The prologue (prologue.js, levels/f0-prologue.js): the ground floor at 01:41 before the lockdown, the night staff alive and talking about the board, ARIADNE’s work orders, the PA calling people up, and the lockdown itself. Then: who speaks over the intercom (Voss, ARIADNE, the building PA), ARIADNE’s twelve audit fragments, Officer Ruiz’s badge, ceiling panels a trap can switch on, the building core’s four elevators (no power until elevatorsOnline; on Floor 4 ARIADNE parks the freight car with the AEGIS field in it), Floor 1, Lockdown, and Floor 2, Synthid Research: the evacuation’s guide lights and signs, the PA’s announcement, Shelter B’s door panel and quarantine release, cards you carry, and DOCENT-3’s voice. Floor 3, Gestation: Voss steering you past the labs, and his case on the stairs. Floor 4, the Proving Grounds: the trial’s announcer, and the contestants who made it to the Box. Floors 5 and 5a: the Concierge, the office keys, the Director’s bookcase, the mainframe console. The last act: the board in their boardroom (people: they fight nobody, and die like anyone), Voss’s case and what ARIADNE records of it, and the endings.',
  requires: ['linear-maze/core', 'ds-lab', 'ds-arsenal', 'ds-robots', 'ds-nightmares', 'ds-puzzles', 'ds-executive', 'ds-tartarus'],
  scripts: ['story.js', 'shelter.js', 'proving.js', 'executive.js', 'tartarus.js', 'prologue.js'],
  levels: ['levels/f0-prologue.js', 'levels/f1-lockdown.js', 'levels/f2-synthid.js', 'levels/f3-gestation.js', 'levels/f4-proving.js', 'levels/f5-executive.js', 'levels/f5a-private.js', 'levels/b1-sublevel.js'],
});
