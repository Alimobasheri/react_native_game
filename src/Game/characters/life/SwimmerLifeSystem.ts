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
import {
  computeKinematicSway,
  syncSwayStageTransition,
  updateSwayDirectionLag,
} from './swimmerKinematicSway';
import { mapLifeToCompositeUniforms } from './swimmerLifeUniforms';
import {
  createInternalLifeState,
} from './swimmerLifeTypes';
import { resolveInternalMotionProfile } from './resolveInternalMotionProfile';
import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';

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
      const profile = resolveInternalMotionProfile(skin.internalMotion);
      const locomotion = swimmer.locomotion;
      const meshScaleY = locomotion.meshScaleY ?? 1;
      const meshW = render.shape.width;
      const meshH = render.shape.height;

      if (!locomotion.internalLifeState) {
        locomotion.internalLifeState = createInternalLifeState();
      }

      syncBreathStageTransition(locomotion);
      syncSwayStageTransition(locomotion);

      if (profile === 'kelpSway') {
        updateSwayDirectionLag(locomotion, swimmer.velocityX, deltaSeconds);
      }

      const kinematicBreath =
        profile === 'ripple'
          ? computeKinematicBreath(
              locomotion,
              locomotion.internalLifeState.phase
            )
          : null;

      const kinematicSway =
        profile === 'kelpSway' ? computeKinematicSway(locomotion) : null;

      const phaseSpeedScale =
        kinematicBreath?.phaseSpeedScale ??
        kinematicSway?.speedScale ??
        locomotion.breathSpeedScale ??
        1;

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
        undefined,
        strengthScale,
        breathOverride
      );

      if (profile === 'ripple') {
        locomotion.breathEnvelope = breathMotion.breath;
        locomotion.breathFillLevel = breathMotion.breath;
      }

      if (profile === 'kelpSway' && kinematicSway) {
        locomotion.swayAmplitudeLevel = kinematicSway.amplitudeScale;
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
        breathMotion.glow,
        kinematicSway ?? undefined
      );

      const composite = render.compositeShader;
      composite.uniforms = uniforms;
      render.isDirty = true;
    }
  },
};
