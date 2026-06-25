/**
 * Locomotion-side ECS events emitted by SwimmerPhysicsSystem.
 * Consumed by SwimmerWaterContactFxSystem (placeholder sprites/particles).
 */

export const SwimmerPivotSplashEventType = 'SwimmerPivotSplashEvent';

export type SwimmerPivotSplashPayload = {
  entityId: number;
  prefabKey: string;
  impactSpeed: number;
  x: number;
  y: number;
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
