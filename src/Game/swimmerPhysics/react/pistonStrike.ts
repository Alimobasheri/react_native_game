/**
 * Vertical piston bounce — contact-enter impulse, re-arm after separation.
 *
 * PS-TODO-009: medium haptic + muffled thud + splash SFX on bounce.
 * PS-TODO-011: foam burst particles at impact point.
 * PS-TODO-012: 3-frame swimmer squash (scaleX 0.6, scaleY 1.2) on impact.
 */

import {
  aabbOverlap,
  aabbFromCenter,
  sweptAabbTOIRelative,
  type AABB,
} from '@/Game/collision/swimmerBlockCollision';
import { pistonHazardTuning } from '@/config/pistonHazardTuning';
import type { PistonHeadSolid } from '@/Game/hazards/mergePistonHazardPass';

export type PistonStrikeStep = {
  struck: boolean;
  impulseVelocityX: number;
  impulseVelocityY: number;
  knockbackDeltaX: number;
  knockbackDeltaY: number;
  /** Seconds of control lock (refresh-rate independent). */
  bounceRecoverySec: number;
  hazardId: string;
  forceAngleRad: number;
};

const noStrike = (): PistonStrikeStep => {
  'worklet';
  return {
    struck: false,
    impulseVelocityX: 0,
    impulseVelocityY: 0,
    knockbackDeltaX: 0,
    knockbackDeltaY: 0,
    bounceRecoverySec: 0,
    hazardId: '',
    forceAngleRad: 0,
  };
};

const resolveAwaySign = (
  swimmerX: number,
  headCenterX: number,
  incomingVelocityX: number,
  safeExitSide: 'left' | 'right'
): number => {
  'worklet';
  const dx = swimmerX - headCenterX;
  if (Math.abs(dx) > 0.5) {
    return dx < 0 ? -1 : 1;
  }
  if (Math.abs(incomingVelocityX) > 1) {
    // Already moving away → keep that side; otherwise reverse into bounce-away.
    return incomingVelocityX < 0 ? -1 : 1;
  }
  return safeExitSide === 'left' ? -1 : 1;
};

const computeBounceImpulseX = (
  awaySign: number,
  incomingVelocityX: number
): number => {
  'worklet';
  const towardSpeed =
    awaySign < 0
      ? Math.max(0, incomingVelocityX)
      : Math.max(0, -incomingVelocityX);
  const raw =
    pistonHazardTuning.BOUNCE_BASE_IMPULSE_X +
    towardSpeed * pistonHazardTuning.BOUNCE_VELOCITY_MULTIPLIER;
  const capped = Math.min(pistonHazardTuning.MAX_BOUNCE_IMPULSE_X, raw);
  return awaySign * capped;
};

const depenetrateOutside = (
  swimmerX: number,
  swimmerHalfWidth: number,
  pistonAabb: AABB,
  awaySign: number
): number => {
  'worklet';
  const pad = pistonHazardTuning.BOUNCE_SEPARATION_PAD_PX;
  if (awaySign < 0) {
    return pistonAabb.minX - swimmerHalfWidth - pad;
  }
  return pistonAabb.maxX + swimmerHalfWidth + pad;
};

/**
 * True when swimmer AABB overlaps current piston OR swept path crossed the
 * moving piston this frame (handles tunnelling on large delta).
 */
export const pistonContactThisFrame = (
  swimmerStartAabb: AABB,
  swimmerDelta: { x: number; y: number },
  solid: PistonHeadSolid
): boolean => {
  'worklet';
  const endAabb: AABB = {
    minX: swimmerStartAabb.minX + swimmerDelta.x,
    maxX: swimmerStartAabb.maxX + swimmerDelta.x,
    minY: swimmerStartAabb.minY + swimmerDelta.y,
    maxY: swimmerStartAabb.maxY + swimmerDelta.y,
  };
  if (aabbOverlap(endAabb, solid.aabb)) {
    return true;
  }
  if (aabbOverlap(swimmerStartAabb, solid.aabb)) {
    return true;
  }
  // Also test previous piston pose — catches tunnels when curr misses final overlap.
  if (aabbOverlap(swimmerStartAabb, solid.prevAabb)) {
    return true;
  }
  if (aabbOverlap(endAabb, solid.prevAabb)) {
    return true;
  }
  const pistonDelta = {
    x: solid.aabb.minX - solid.prevAabb.minX,
    y: solid.aabb.minY - solid.prevAabb.minY,
  };
  const toi = sweptAabbTOIRelative(
    swimmerStartAabb,
    solid.prevAabb,
    swimmerDelta,
    pistonDelta
  );
  return toi !== null;
};

export const resolvePistonHeadStrike = (args: {
  swimmerX: number;
  swimmerY: number;
  swimmerStartX: number;
  swimmerStartY: number;
  swimmerHalfWidth: number;
  swimmerHalfHeight: number;
  velocityX: number;
  pistonSolids: readonly PistonHeadSolid[];
  /** Hazard id currently latched from a prior bounce (still overlapping). */
  activeContactHazardId: string | undefined;
  deltaSeconds: number;
}): PistonStrikeStep => {
  'worklet';
  const {
    swimmerX,
    swimmerY,
    swimmerStartX,
    swimmerStartY,
    swimmerHalfWidth,
    swimmerHalfHeight,
    velocityX,
    pistonSolids,
    activeContactHazardId,
    deltaSeconds,
  } = args;

  if (pistonSolids.length === 0) {
    return noStrike();
  }

  const startAabb = aabbFromCenter(
    swimmerStartX,
    swimmerStartY,
    swimmerHalfWidth,
    swimmerHalfHeight
  );
  const delta = {
    x: swimmerX - swimmerStartX,
    y: swimmerY - swimmerStartY,
  };

  for (let i = 0; i < pistonSolids.length; i++) {
    const solid = pistonSolids[i];
    if (!pistonContactThisFrame(startAabb, delta, solid)) {
      continue;
    }

    // Still latched to this piston after a prior bounce — wait for separation.
    if (
      activeContactHazardId != null &&
      activeContactHazardId !== '' &&
      activeContactHazardId === solid.hazardId
    ) {
      return {
        ...noStrike(),
        // Signal "still contacting" via hazardId without applying impulse.
        hazardId: solid.hazardId,
      };
    }

    const awaySign = resolveAwaySign(
      swimmerX,
      solid.headCenterX,
      velocityX,
      solid.safeExitSide
    );
    const impulseVelocityX = computeBounceImpulseX(awaySign, velocityX);
    const impulseVelocityY = Math.min(
      pistonHazardTuning.MAX_BOUNCE_IMPULSE_Y,
      Math.max(0, pistonHazardTuning.BOUNCE_IMPULSE_Y_DOWN)
    );

    const separatedX = depenetrateOutside(
      swimmerX,
      swimmerHalfWidth,
      solid.aabb,
      awaySign
    );
    const knockbackDeltaX = separatedX - swimmerX;
    // Nudge slightly downward so the body leaves the piston volume.
    const knockbackDeltaY = Math.max(
      impulseVelocityY * Math.max(0.001, deltaSeconds),
      pistonHazardTuning.BOUNCE_SEPARATION_PAD_PX
    );

    return {
      struck: true,
      impulseVelocityX,
      impulseVelocityY,
      knockbackDeltaX,
      knockbackDeltaY,
      bounceRecoverySec: pistonHazardTuning.BOUNCE_RECOVERY_SEC,
      hazardId: solid.hazardId,
      forceAngleRad: Math.atan2(impulseVelocityY, impulseVelocityX),
    };
  }

  return noStrike();
};

/** After resolution: clear latch when no longer overlapping any solid with that id. */
export const pistonStillOverlapping = (
  swimmerX: number,
  swimmerY: number,
  swimmerHalfWidth: number,
  swimmerHalfHeight: number,
  hazardId: string,
  pistonSolids: readonly PistonHeadSolid[]
): boolean => {
  'worklet';
  if (!hazardId) {
    return false;
  }
  const swimmerAabb = aabbFromCenter(
    swimmerX,
    swimmerY,
    swimmerHalfWidth,
    swimmerHalfHeight
  );
  for (let i = 0; i < pistonSolids.length; i++) {
    const solid = pistonSolids[i];
    if (solid.hazardId !== hazardId) {
      continue;
    }
    if (aabbOverlap(swimmerAabb, solid.aabb)) {
      return true;
    }
  }
  return false;
};
