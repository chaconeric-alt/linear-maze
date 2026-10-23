/* games/dead-signal/packs/ds-story/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Story',
  version: '0.4.0',
  description: 'Dead Signal’s story and its floors: who speaks over the intercom (Voss, ARIADNE, the building PA), ARIADNE’s twelve audit fragments, Officer Ruiz’s badge, ceiling panels a trap can switch on, the building core’s four elevators (no power until elevatorsOnline), Floor 1, Lockdown, and Floor 2, Synthid Research: the evacuation’s guide lights and signs, the PA’s announcement, Shelter B’s door panel and quarantine release, cards you carry, and DOCENT-3’s voice. Floor 3, Gestation: Voss steering you past the labs, and his case on the stairs. Floor 4, the Proving Grounds: the trial’s announcer, and the contestants who made it to the Box.',
  requires: ['linear-maze/core', 'ds-lab', 'ds-arsenal', 'ds-robots', 'ds-nightmares', 'ds-puzzles'],
  scripts: ['story.js', 'shelter.js', 'proving.js'],
  levels: ['levels/f1-lockdown.js', 'levels/f2-synthid.js', 'levels/f3-gestation.js', 'levels/f4-proving.js'],
});
