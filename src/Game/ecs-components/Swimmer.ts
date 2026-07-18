import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { MovementState } from '@/Game/characters/characterMovementStates';
import type { SecondaryItemPersistedState } from '@/Game/characters/secondaryItemTypes';
import type { FeatureBlinkState } from '@/Game/characters/swimmerFeatureBlink';
import type { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';
import type {
  InternalLifeState,
  SwayBiasSpringState,
  SwimmerLifeDebugMode,
} from '@/Game/characters/life/swimmerLifeTypes';

export const SwimmerComponentName = 'Swimmer';

export const SWIMMER_BODY_LAYER_INDEX = 0;
/** @deprecated Use getSwimmerAccessoryLayerIndex(skin) — index varies when feature layer present. */
export const SWIMMER_ACCESSORY_LAYER_INDEX = 1;
export const SWIMMER_FEATURE_LAYER_INDEX = 1;
export const SWIMMER_ACCESSORY_LAYER_INDEX_WITH_FEATURE = 2;

export type SpeedTier = 1 | 2 | 3;

export type SwimmerLocomotionData = {
  profileId: string;
  movementState: MovementState;
  currentTier: SpeedTier;
  /** Seconds remaining in the combo tap window. */
  comboTimer: number;
  /** Seconds remaining in the pre-strike anticipation phase. */
  anticipationTimer?: number;
  /** Seconds remaining in the post-strike drag phase. */
  dragTimer?: number;
  currentAngleDeg: number;
  targetAngleDeg: number;
  /** Render-only lean (clearance-clamped); collision core stays upright. */
  visualAngleDeg?: number;
  /** Smoothed 0..1 clearance factor for angle tucking. */
  clearance01?: number;
  /** Visual stroke phase — continues after physics enters GLIDE. */
  visualPhase?: VisualStrokePhase;
  visualAnticipationTimer?: number;
  visualStrokeTimer?: number;
  visualGlideSettleTimer?: number;
  visualRecoveryTimer?: number;
  visualPivotTimer?: number;
  visualStrokeDirection?: -1 | 1;
  visualStrokeTier?: SpeedTier;
  /** Seconds since last wake streak spawn. */
  wakeSpawnTimer?: number;
  /** Seconds since leaving water — drives collar global fade-out. */
  collarDrainAge?: number;
  /** Ease-in timer after re-entry from pin / drain (before full collar strength). */
  collarRegrowAge?: number;
  /** True once regrow ease finished — allows bob-tolerant collar maintenance. */
  collarRegrowComplete?: boolean;
  /** After pin / dry exit — regrow only once float depth is reached (prevents flash). */
  collarAwaitingRegrow?: boolean;
  /** Latched when center reaches float depth during slide-out from pin. */
  collarFloatDepthReached?: boolean;
  /** Frozen collarFoamAge when contact with water is lost (pinned dry). */
  collarFreezeAge?: number;
  /** Ephemeral foam collar render entity (waterline separation). */
  foamCollarEntityId?: number;
  /** Seconds elapsed for collar outward-loop animation. */
  collarFoamAge?: number;
  facingDirection: 1 | -1;
  /** Seconds remaining in pivot input lockout. */
  pivotLockoutTimer: number;
  /** Queued facing direction for post-brake tier-1 strike. */
  pivotTargetDirection?: -1 | 1 | 0;
  /** One-shot tap direction consumed by physics each frame. */
  pendingTapDirection?: -1 | 1 | 0;
  /** Epoch ms of the most recent tap (rapid-tap streak). */
  lastTapTimeMs?: number;
  /** Direction of the most recent tap (-1 left, 1 right). */
  lastTapDirection?: -1 | 1;
  /** Consecutive rapid same-direction taps within streak window. */
  rapidTapStreak?: number;
  /** One-shot streak multiplier consumed when physics applies tap impulse. */
  pendingTapMultiplier?: number;
  /** Current procedural mesh scale X (volume-conserved with meshScaleY). */
  meshScaleX?: number;
  /** Current procedural mesh scale Y (volume-conserved with meshScaleX). */
  meshScaleY?: number;
  /** Prior frame movement state for pivot edge detection. */
  previousMovementState?: MovementState;
  /** Persisted secondary attachment simulation state. */
  accessoryState?: SecondaryItemPersistedState;
  /** Randomized tiny-feature blink timer state. */
  featureBlinkState?: FeatureBlinkState;
  /** Internal body life phase (composite shader). */
  internalLifeState?: InternalLifeState;
  /** Storybook / debug gate for composite shader (G0–G3). */
  lifeDebugMode?: SwimmerLifeDebugMode;
  /** Optional intensity override (Storybook). */
  internalIntensity?: number;
  /** Bottom-up fill amount 0–1 (future: overridden per kinematic stage). */
  breathEnvelope?: number;
  /** Future: kinematic-driven fill speed multiplier. */
  breathSpeedScale?: number;
  /** Future: kinematic-driven glow strength multiplier. */
  breathStrengthScale?: number;
  /** Persisted internal fill 0–1 across kinematic stages. */
  breathFillLevel?: number;
  /** Fill level latched when the current visual phase began. */
  breathStageStartFill?: number;
  /** Tracks visual phase for breath stage transitions. */
  breathTrackedVisualPhase?: VisualStrokePhase;
  /** Persisted kelp sway amplitude scale 0–1+ across kinematic stages. */
  swayAmplitudeLevel?: number;
  /** Amplitude latched when the current visual phase began. */
  swayStageStartAmplitude?: number;
  /** Tracks visual phase for kelp sway stage transitions. */
  swayTrackedVisualPhase?: VisualStrokePhase;
  /** Prior frame visual stroke phase for pivot edge detection. */
  previousVisualPhase?: VisualStrokePhase;
  /** Lagging spring for horizontal strand bias (-1..1). */
  swayBiasState?: SwayBiasSpringState;
  /** Render-only squash after hard wall bump (seconds). */
  wallBumpSquashTimer?: number;
  /** Debounce wall bump VFX (epoch ms). */
  lastWallBumpMs?: number;
};

export type SwimmerComponentData = {
  /** World-space center X (pixels). */
  x: number;
  /** World-space center Y (pixels). */
  y: number;
  velocityX: number;
  /** Profile-driven locomotion state for tap tiers and tilt targets. */
  locomotion: SwimmerLocomotionData;
  waterSurfaceY: number;
  containerWidth: number;
  containerCenterX: number;
  containerCenterY: number;
  isInInitialPhase: boolean;
  isCollidingWithObstacle: boolean;
  isPinnedFromAbove?: boolean;
  /** True when underside brush contact occurred this frame without pin. */
  ceilingBrushThisFrame?: boolean;
  /** Ceiling column bounds while pinned — stable slide-out reference across frames. */
  pinnedCeilingMinX?: number;
  pinnedCeilingMaxX?: number;
  /** True when horizontal motion was blocked by a side solid this frame. */
  isSideBlocked?: boolean;
  /** True when tap/motion intent was stopped by a side solid this frame. */
  movementBlockedThisFrame?: boolean;
  /** Direction blocked when side-blocked (-1 left, 1 right). */
  sideBlockedDirection?: -1 | 0 | 1;
  fallingVelocityY: number;
  /** Frames remaining to skip buoyancy/surface snap after pendulum strike. */
  plungeOverrideFramesRemaining?: number;
  /** Active pendulum knockback — die when launched off-screen or into walls. */
  pendulumKnockbackActive?: boolean;
  /** Visual tilt direction during pendulum knockback. */
  pendulumForceAngleRad?: number;
  /**
   * Piston hazard id currently latched after a bounce.
   * Cleared only after full AABB separation so one contact = one bounce.
   */
  pistonContactHazardId?: string;
  /** Seconds remaining of piston bounce recovery (time-based, not frame-based). */
  pistonBounceRecoverySecRemaining?: number;
  useColumnControl?: boolean;
  column?: number;
  bobbingPhase?: number;
  /** Visual tilt angle in radians (kinematics-driven for column control). */
  angle?: number;
  /** Unscaled render mesh width for procedural deformation. */
  meshBaseWidth?: number;
  /** Unscaled render mesh height for procedural deformation. */
  meshBaseHeight?: number;
  /** Visual skin id (body + accessory art). */
  skinId?: string;
  gameOverDispatched?: boolean;
  disableGameOver?: boolean;
};

export const createSwimmerComponent = (
  data: SwimmerComponentData
): Component<SwimmerComponentData> => {
  'worklet';
  return {
    name: SwimmerComponentName,
    data,
  };
};
