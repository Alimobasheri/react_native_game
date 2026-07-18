import type { ComponentStore } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/component';
import {
  aabbOverlap,
  aabbFromCenter,
  type PendulumHeadSolid,
} from '@/Game/collision/swimmerBlockCollision';
import {
  pendulumHazardTuning,
  resolvePendulumStrikeConfig,
  type PendulumStrikeProfile,
} from '@/config/pendulumHazardTuning';

export type PendulumStrikeStep = {
  struck: boolean;
  impulseVelocityX: number;
  impulseVelocityY: number;
  knockbackDeltaX: number;
  knockbackDeltaY: number;
  knockbackOverrideFrames: number;
  bypassPinState: boolean;
  triggerGameOverOnHit: boolean;
  forceAngleRad: number;
};

const normalize2 = (x: number, y: number): { x: number; y: number; len: number } => {
  'worklet';
  const len = Math.sqrt(x * x + y * y);
  if (len < 0.001) {
    return { x: 0, y: 1, len: 1 };
  }
  return { x: x / len, y: y / len, len };
};

export const resolvePendulumHeadStrike = (
  swimmerX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  pendulumSolids: readonly PendulumHeadSolid[],
  deltaSeconds: number
): PendulumStrikeStep => {
  'worklet';

  const noStrike: PendulumStrikeStep = {
    struck: false,
    impulseVelocityX: 0,
    impulseVelocityY: 0,
    knockbackDeltaX: 0,
    knockbackDeltaY: 0,
    knockbackOverrideFrames: 0,
    bypassPinState: false,
    triggerGameOverOnHit: false,
    forceAngleRad: 0,
  };

  if (!pendulumHazardTuning.STRIKE_ENABLED || pendulumSolids.length === 0) {
    return noStrike;
  }

  const swimmerAabb = aabbFromCenter(
    swimmerX,
    swimmerY,
    swimmerHalfWidth,
    swimmerHalfHeight
  );

  for (let i = 0; i < pendulumSolids.length; i++) {
    const solid = pendulumSolids[i];
    if (!aabbOverlap(swimmerAabb, solid.aabb)) {
      continue;
    }

    const profile = resolvePendulumStrikeConfig(
      solid.strikeProfile as PendulumStrikeProfile | undefined
    );

    const headDir = normalize2(solid.velocityX, solid.velocityY);
    const blend = profile.velocityBlendFromHead;
    const dirX = headDir.x * blend;
    const dirY = headDir.y * blend + (1 - blend);
    const launchDir = normalize2(dirX, dirY);

    const impulseVelocityX = launchDir.x * profile.impulseSpeed;
    const impulseVelocityY = launchDir.y * profile.impulseSpeed;

    return {
      struck: true,
      impulseVelocityX,
      impulseVelocityY,
      knockbackDeltaX: impulseVelocityX * deltaSeconds,
      knockbackDeltaY: impulseVelocityY * deltaSeconds,
      knockbackOverrideFrames: profile.knockbackOverrideFrames,
      bypassPinState: profile.bypassPinState,
      triggerGameOverOnHit: profile.triggerGameOverOnHit,
      forceAngleRad: Math.atan2(impulseVelocityY, impulseVelocityX),
    };
  }

  return noStrike;
};
