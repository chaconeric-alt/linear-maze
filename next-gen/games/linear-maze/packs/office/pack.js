/* games/linear-maze/packs/office/pack.js
 * What this pack is, what it needs, and the files it loads, in order (see engine/manifest.js).
 * scripts are its assets; levels are its floors (a game can load a pack with levels: false).
 */
LM.describePack({
  name: 'Office',
  version: '0.1.0',
  description: 'Meridian Group, 14th floor: the office tile set (carpet tile, terrazzo, glass walls and doors, partitions), every piece of office furniture, 24 coworkers with conversations, the phone gadget (F), and the prologue floor where a door that wasn’t there before opens into the maze.',
  requires: ['core'],
  scripts: ['environment.js', 'furniture.js', 'npcs.js', 'phone.js'],
  levels: ['levels/00-meridian-fourteen.js'],
});
