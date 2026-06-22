import {
  getObstacleBlockDimensions,
  getObstacleRowPitch,
} from '@/assets/swimmerBlocks';
import {
  CaveAtmosphereComponentName,
  CaveAtmosphereComponentData,
} from '@/Game/ecs-components/CaveAtmosphere';
import {
  ContainerComponentData,
  ContainerComponentName,
} from '@/Game/ecs-components/Container';
import {
  ObstacleRowComponentName,
} from '@/Game/ecs-components/ObstacleRowComponent';
import {
  countVisibleObstacleBlocks,
  estimateMaxVisibleObstacleBlocks,
  vignetteStrengthFromVisibleBlockCount,
} from '@/Game/visual/obstacleDensityVignette';
import {
  CAVE_VIGNETTE_STRENGTH,
  CAVE_VIGNETTE_STRENGTH_MIN,
} from '@/config/swimmerCaveLightingTuning';
import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import { firstDataFromStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';

/**
 * Drives edge-vignette strength from how many obstacle blocks are on screen.
 * Updates only when the visible block count changes (e.g. a row scrolls off).
 */
export const ObstacleDensityVignetteSystem: System = {
  name: 'obstacleDensityVignetteSystem',
  requiredComponents: [CaveAtmosphereComponentName],
  process: ({ entities, components, ecs }) => {
    'worklet';

    const containerData = firstDataFromStore(
      components[ContainerComponentName]
    ) as ContainerComponentData | undefined;
    if (!containerData) {
      return;
    }

    const rowStore = components[ObstacleRowComponentName];
    const blockHeight = getObstacleBlockDimensions(containerData.width).height;
    const rowPitch = getObstacleRowPitch(blockHeight);
    const viewportTop = containerData.centerY - containerData.height * 0.5;
    const viewportBottom = containerData.centerY + containerData.height * 0.5;
    const visibleBlockCount = countVisibleObstacleBlocks(
      rowStore,
      viewportTop,
      viewportBottom,
      blockHeight
    );
    const maxVisibleBlocks = estimateMaxVisibleObstacleBlocks(
      containerData.height,
      rowPitch
    );
    const targetStrength = vignetteStrengthFromVisibleBlockCount(
      visibleBlockCount,
      maxVisibleBlocks,
      CAVE_VIGNETTE_STRENGTH_MIN,
      CAVE_VIGNETTE_STRENGTH
    );

    for (let i = 0; i < entities.length; i++) {
      const entityId = entities[i];
      const atmosphere = components[CaveAtmosphereComponentName]?.get(
        entityId
      ) as CaveAtmosphereComponentData | undefined;

      if (!atmosphere || atmosphere.role !== 'edgeVignette') {
        continue;
      }

      if (atmosphere.visibleBlockCount === visibleBlockCount) {
        continue;
      }

      ecs.updateComponent<CaveAtmosphereComponentData>(
        entityId,
        CaveAtmosphereComponentName,
        (data) => {
          'worklet';
          data.visibleBlockCount = visibleBlockCount;
          data.vignetteStrength = targetStrength;
        }
      );
    }
  },
};
