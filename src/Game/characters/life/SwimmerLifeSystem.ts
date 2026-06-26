import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  RenderComponentData,
  RenderComponentName,
  ShapeTypes,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { getSwimmerSkin } from '@/Game/characters/swimmerSkins';
import {
  SwimmerComponentData,
  SwimmerComponentName,
} from '@/Game/ecs-components/Swimmer';
import { advanceInternalLifePhase, computeBreathMotion } from './swimmerLifeDrivers';
import {
  computeKinematicBreath,
  syncBreathStageTransition,
} from './swimmerKinematicBreath';
import { mapLifeToCompositeUniforms } from './swimmerLifeUniforms';
import {
  createInternalLifeState,
  type InternalMotionProfileId,
} from './swimmerLifeTypes';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';

const resolveMotionProfile = (
  internalMotion: string | undefined
): InternalMotionProfileId => {
  'worklet';
  if (internalMotion === 'kelpSway') return 'kelpSway';
  if (internalMotion === 'ripple') return 'ripple';
  return 'none';
};

export const SwimmerLifeSystem: System = {
  name: 'SwimmerLifeSystem',
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

      if (!swimmer || !render?.compositeShader) {
        continue;
      }

      if (render.shape.type !== ShapeTypes.Rectangle) {
        continue;
      }

      const skin = getSwimmerSkin(swimmer.skinId);
      const profile = resolveMotionProfile(skin.internalMotion);
      const locomotion = swimmer.locomotion;
      const meshScaleY = locomotion.meshScaleY ?? 1;
      const meshW = render.shape.width;
      const meshH = render.shape.height;

      if (!locomotion.internalLifeState) {
        locomotion.internalLifeState = createInternalLifeState();
      }

      syncBreathStageTransition(locomotion);

      const kinematicBreath =
        profile === 'ripple'
          ? computeKinematicBreath(
              locomotion,
              locomotion.internalLifeState.phase
            )
          : null;

      const phaseSpeedScale =
        kinematicBreath?.phaseSpeedScale ?? locomotion.breathSpeedScale ?? 1;

      locomotion.internalLifeState = advanceInternalLifePhase(
        locomotion.internalLifeState,
        profile,
        deltaSeconds,
        meshScaleY,
        phaseSpeedScale
      );

      const phase = locomotion.internalLifeState.phase;
      const strengthScale =
        kinematicBreath?.strengthScale ?? locomotion.breathStrengthScale ?? 1;
      const breathOverride = kinematicBreath?.breath;
      const breathMotion = computeBreathMotion(
        phase,
        locomotion.internalIntensity,
        strengthScale,
        breathOverride
      );

      if (profile === 'ripple' || profile === 'kelpSway') {
        locomotion.breathEnvelope = breathMotion.breath;
        locomotion.breathFillLevel = breathMotion.breath;
      }

      const uniforms = mapLifeToCompositeUniforms(
        profile,
        phase,
        meshW,
        meshH,
        locomotion.lifeDebugMode ?? 0,
        locomotion.internalIntensity,
        swimmerLifeTuning.INTERNAL_JUICE_BOOST_DEFAULT,
        breathMotion.breath,
        breathMotion.glow
      );

      const composite = render.compositeShader;
      composite.uniforms = uniforms;
      render.isDirty = true;
    }
  },
};
