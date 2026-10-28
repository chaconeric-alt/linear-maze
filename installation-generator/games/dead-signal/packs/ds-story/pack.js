/* games/dead-signal/packs/ds-story/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 */
LM.describePack({
  name: 'Story',
  version: '0.2.0',
  description: 'Dead Signal’s story and its floors: who speaks over the intercom (Voss, ARIADNE, the building PA), ARIADNE’s twelve audit fragments, Officer Ruiz’s badge, ceiling panels a trap can switch on, the building core’s four elevators (no power until elevatorsOnline), Floor 1, Lockdown, and Floor 2, Synthid Research: the evacuation’s guide lights and signs, the PA’s announcement, Shelter B’s door panel and quarantine release, cards you carry, and DOCENT-3’s voice.',
  requires: ['linear-maze/core', 'ds-lab', 'ds-arsenal', 'ds-robots', 'ds-nightmares', 'ds-puzzles'],
  scripts: ['story.js', 'shelter.js'],
  levels: ['levels/f1-lockdown.js', 'levels/f2-synthid.js'],
});
