import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';
import {
  createDeformationScale,
  updateProceduralDeformation,
} from '@/Game/characters/proceduralDeformationEngine';

/**
 * Legacy deformation-only visual pass (superseded by SwimmerEntityVisualSystem).
 */
export const SwimmerDeformationSystem: System = {
  name: 'SwimmerDeformationSystem',
  requiredComponents: [SwimmerComponentName, RenderComponentName],
  process: ({ entities, components, deltaTime }) => {
    'worklet';

    const deltaSeconds = deltaTime / 1000;
    const swimmerStore = components[SwimmerComponentName];
    const renderStore = components[RenderComponentName];

    if (!swimmerStore || !renderStore) {
      return;
    }

    for (let i = 0; i < entities.length; i++) {
      const entityId = entities[i];
      const swimmer = swimmerStore.get(entityId) as
        | SwimmerComponentData
        | undefined;
      const render = renderStore.get(entityId) as RenderComponentData | undefined;

      if (!swimmer || !render) {
        continue;
      }

      if (render.shape.type !== ShapeTypes.Rectangle) {
        continue;
      }

      const baseWidth = swimmer.meshBaseWidth ?? render.shape.width;
      const baseHeight = swimmer.meshBaseHeight ?? render.shape.height;
      const locomotion = swimmer.locomotion;
      const idlePhase = swimmer.bobbingPhase ?? 0;

      const deformation = createDeformationScale(
        locomotion.meshScaleX ?? 1,
        locomotion.meshScaleY ?? 1
      );

      const result = updateProceduralDeformation(
        deformation,
        locomotion.movementState,
        swimmer.velocityX,
        locomotion.currentTier,
        deltaSeconds,
        idlePhase
      );

      const nextWidth = baseWidth * result.scaleX;
      const nextHeight = baseHeight * result.scaleY;

      const widthChanged = Math.abs(render.shape.width - nextWidth) > 0.01;
      const heightChanged = Math.abs(render.shape.height - nextHeight) > 0.01;

      if (widthChanged || heightChanged) {
        render.shape.width = nextWidth;
        render.shape.height = nextHeight;
        render.isDirty = true;
      }

      locomotion.meshScaleX = result.scaleX;
      locomotion.meshScaleY = result.scaleY;
    }
  },
};
