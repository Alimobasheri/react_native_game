import {
  swimmerCoastPreset,
  swimmerCoastPresets,
  swimmerPhysicsTuning,
} from '@/config/swimmerTuning';
import {
  computePinnedVelocityDamping,
  computePinnedWaterCurrentResponse,
} from '@/Game/characters/swimmerPinnedWaterCurrent';
import type {
  HorizontalLocomotionStep,
  SwimmerSnapshot,
  WaterAdvectionStep,
} from '@/Game/swimmerPhysics/types';

/**
 * Water channel flow relaxes swimmer toward local current — drift without fighting tap.
 *
 * @see docs/game-design/swimmer-physics-flow.md#per-frame-pipeline
 */
export const applyWaterAdvection = (
  swimmer: SwimmerSnapshot,
  horizontal: HorizontalLocomotionStep,
  deltaSeconds: number
): WaterAdvectionStep => {
  'worklet';

  let swimmerVelocityX = horizontal.velocityX;
  let currentResponse =
    1 -
    Math.exp(-swimmerPhysicsTuning.WATER_CURRENT_RESPONSE_PER_SECOND * deltaSeconds);

  if (swimmer.component.useColumnControl) {
    currentResponse *=
      swimmerCoastPresets[swimmerCoastPreset].TAP_MODE_CURRENT_RESPONSE_SCALE;
  }

  currentResponse = computePinnedWaterCurrentResponse(
    swimmer.wasPinnedFromAbove,
    horizontal.tapImpulseAppliedThisFrame,
    swimmerPhysicsTuning.PINNED_BLOCK_WATER_CURRENT_ADVECTION,
    currentResponse
  );

  swimmerVelocityX +=
    (horizontal.waterCurrentVelocityX - swimmerVelocityX) * currentResponse;

  if (swimmerVelocityX > swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
    swimmerVelocityX = swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
  } else if (swimmerVelocityX < -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
    swimmerVelocityX = -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
  }

  if (swimmer.wasPinnedFromAbove && !horizontal.tapImpulseAppliedThisFrame) {
    const angleDeg =
      horizontal.locomotion.visualAngleDeg ??
      horizontal.locomotion.currentAngleDeg ??
      0;
    swimmerVelocityX *= computePinnedVelocityDamping(angleDeg);
  }

  return { velocityX: swimmerVelocityX };
};
