/**
 * Locomotion-side ECS events emitted by SwimmerPhysicsSystem.
 * Consumed by a future VFX/renderer system — no consumer in Prompt 3.
 */

export const SwimmerPivotSplashEventType = 'SwimmerPivotSplashEvent';

export type SwimmerPivotSplashPayload = {
  entityId: number;
  prefabKey: string;
  impactSpeed: number;
  x: number;
  y: number;
};

export type SwimmerPivotSplashEvent = {
  type: typeof SwimmerPivotSplashEventType;
  payload: SwimmerPivotSplashPayload;
};
