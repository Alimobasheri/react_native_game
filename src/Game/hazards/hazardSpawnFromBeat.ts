export { maybeSpawnHazardBandsForRow, type HazardSpawnFromBeatArgs } from '@/Game/hazards/hazardBandSpawn';

import { maybeSpawnHazardBandsForRow, type HazardSpawnFromBeatArgs } from '@/Game/hazards/hazardBandSpawn';

/** Spawns row-integrated hazard bands when the composed beat band is complete. */
export const maybeSpawnMovingHazardsForRow = (args: HazardSpawnFromBeatArgs): void => {
  'worklet';
  maybeSpawnHazardBandsForRow(args);
};
