/**
 * Walks the camera around the world and captures each landmark, so a change to
 * the art can be reviewed as a set rather than one frame at a time.
 */
const shots = [
  { name: '01-waking-meadow', place: [-14.2, 16.6], zoom: 14 },
  { name: '02-hollow-stump', place: [-20.5, -1.5], zoom: 15 },
  { name: '03-shelter-clearing', place: [-2.1, 22.7], zoom: 15 },
  { name: '04-meadow-dawnspire', place: [15, -2], zoom: 17 },
  { name: '05-bramble-gate', place: [24, -5], zoom: 17 },
  { name: '06-grove', place: [41, -13], zoom: 17, unlock: 'grove' },
  { name: '07-mistveil', place: [48, -26], zoom: 16, unlock: 'grove' },
  { name: '08-moonmere', place: [52, -44], zoom: 18, unlock: 'glade' },
  { name: '09-moonmere-shore', place: [59, -51], zoom: 18, unlock: 'glade' },
  { name: '10-meadow-wide', place: [0, 6], zoom: 26 },
];

console.log(
  JSON.stringify(
    shots.map((shot) => ({
      name: shot.name,
      wait: 700,
      eval: `(() => {
        const g = window.wispmere;
        const unlock = ${JSON.stringify(shot.unlock ?? '')};
        if (unlock) {
          g.state.flags.meadowLandmarkRestored = true;
          if (unlock === 'glade') g.state.flags.guardianDefeated = true;
          g.refresh();
        }
        g.camera.setZoom(${shot.zoom});
        g.teleport(${shot.place[0]}, ${shot.place[1]});
      })()`,
    })),
  ),
);
