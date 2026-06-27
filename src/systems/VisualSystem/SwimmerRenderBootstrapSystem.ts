import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  RenderPolicy,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { buildSwimmerRenderStack } from '@/Game/characters/buildSwimmerRenderStack';
import { mapLifeToCompositeUniforms } from '@/Game/characters/life/swimmerLifeUniforms';
import { createInternalLifeState } from '@/Game/characters/life/swimmerLifeTypes';
import { resolveInternalMotionProfile } from '@/Game/characters/life/resolveInternalMotionProfile';
import { getSwimmerSkin } from '@/Game/characters/swimmerSkins';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';

export const SwimmerRenderBootstrapSystem: System = {
  name: 'SwimmerRenderBootstrapSystem',
  requiredComponents: [SwimmerComponentName, RenderComponentName],
  process: ({ entities, components }) => {
    'worklet';

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

      if (!swimmer || !render || render.shape.type !== ShapeTypes.Rectangle) {
        continue;
      }

      const skin = getSwimmerSkin(swimmer.skinId);
      const profile = resolveInternalMotionProfile(skin.internalMotion);
      const hasComposite = profile !== 'none';

      if (
        !hasComposite &&
        render.image === skin.bodyImageKey &&
        render.renderPolicy === RenderPolicy.LiveGroup &&
        render.renderLayers != null
      ) {
        continue;
      }

      if (
        hasComposite &&
        render.compositeShader != null &&
        render.renderPolicy === RenderPolicy.AnimatedComposite &&
        render.renderLayers != null
      ) {
        continue;
      }

      const baseWidth = swimmer.meshBaseWidth ?? render.shape.width;
      const baseHeight = swimmer.meshBaseHeight ?? render.shape.height;
      const locomotion = swimmer.locomotion;

      if (!locomotion.internalLifeState) {
        locomotion.internalLifeState = createInternalLifeState();
      }

      const uniforms = mapLifeToCompositeUniforms(
        profile,
        locomotion.internalLifeState.phase,
        baseWidth,
        baseHeight,
        locomotion.lifeDebugMode ?? 0,
        locomotion.internalIntensity
      );

      const stack = buildSwimmerRenderStack(
        skin,
        baseWidth,
        baseHeight,
        uniforms
      );

      render.compositeShader = stack.compositeShader;
      render.image = stack.bodyImageKey;
      render.renderLayers = stack.renderLayers;
      render.renderPolicy = stack.renderPolicy;
      render.isDirty = true;
    }
  },
};
