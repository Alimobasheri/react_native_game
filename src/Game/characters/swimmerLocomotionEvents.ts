/**
 * Locomotion-side ECS events emitted by SwimmerPhysicsSystem.
 * Consumed by SwimmerWaterContactFxSystem (foam collar, splashes, wakes).
 */

export const SwimmerPivotSplashEventType = 'SwimmerPivotSplashEvent';

export type SwimmerPivotSplashPayload = {
  entityId: number;
  prefabKey: string;
  impactSpeed: number;
  x: number;
  y: number;
  /** New stroke direction after the pivot brake. */
  direction: -1 | 1;
};

export const SwimmerDirectionalSplashEventType = 'SwimmerDirectionalSplashEvent';

export type SwimmerDirectionalSplashPayload = {
  entityId: number;
  x: number;
  y: number;
  /** Tap direction — splash emits from the opposite side. */
  direction: -1 | 1;
  tier: 1 | 2 | 3;
  strength: number;
};

export const SwimmerWakeTrailEventType = 'SwimmerWakeTrailEvent';

export type SwimmerWakeTrailPayload = {
  entityId: number;
  x: number;
  y: number;
  velocityX: number;
  tier: 1 | 2 | 3;
};

export const SwimmerAnticipationDentEventType = 'SwimmerAnticipationDentEvent';

export type SwimmerAnticipationDentPayload = {
  entityId: number;
  x: number;
  y: number;
  direction: -1 | 1;
};

export type SwimmerPivotSplashEvent = {
  type: typeof SwimmerPivotSplashEventType;
  payload: SwimmerPivotSplashPayload;
};

export type SwimmerDirectionalSplashEvent = {
  type: typeof SwimmerDirectionalSplashEventType;
  payload: SwimmerDirectionalSplashPayload;
};

export type SwimmerWakeTrailEvent = {
  type: typeof SwimmerWakeTrailEventType;
  payload: SwimmerWakeTrailPayload;
};

export type SwimmerAnticipationDentEvent = {
  type: typeof SwimmerAnticipationDentEventType;
  payload: SwimmerAnticipationDentPayload;
};

export const SwimmerPinnedSplashEventType = 'SwimmerPinnedSplashEvent';

export type SwimmerPinnedSplashPayload = {
  entityId: number;
  x: number;
  y: number;
  impactSpeed: number;
};

export type SwimmerPinnedSplashEvent = {
  type: typeof SwimmerPinnedSplashEventType;
  payload: SwimmerPinnedSplashPayload;
};

/**
 * FUTURE TODO — Revive circular splash ring (deferred).
 *
 * When ad-revive or restart UX is wired, dispatch this event after the swimmer
 * Y is snapped to the water surface (see RestartGameplaySystem).
 *
 * Handler sketch in SwimmerWaterContactFxSystem:
 * - Add `reviveRing` preset to buildSwimmerContactFoamLayers
 * - Expanding ring: radius = 8 + age * 120, 12–18 blobs, maxAge ≈ 0.45s
 * - Design ref: swimmer.styles.md § Revive Animation
 *
 * @see SwimmerReviveSplashEventType
 */
export const SwimmerReviveSplashEventType = 'SwimmerReviveSplashEvent';

export type SwimmerReviveSplashPayload = {
  entityId: number;
  x: number;
  y: number;
};

export type SwimmerReviveSplashEvent = {
  type: typeof SwimmerReviveSplashEventType;
  payload: SwimmerReviveSplashPayload;
};

export const SwimmerWallBumpEventType = 'SwimmerWallBumpEvent';

export type SwimmerWallBumpPayload = {
  entityId: number;
  x: number;
  y: number;
  /** Travel direction that hit the wall. */
  direction: -1 | 1;
  impactSpeed: number;
};

export type SwimmerWallBumpEvent = {
  type: typeof SwimmerWallBumpEventType;
  payload: SwimmerWallBumpPayload;
};
