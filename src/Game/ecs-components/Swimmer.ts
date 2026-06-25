import { Component } from '@/containers/ReactNativeSkiaGameEngine/services-ecs';
import { MovementState } from '@/Game/characters/characterMovementStates';
import type { SecondaryItemPersistedState } from '@/Game/characters/secondaryItemTypes';
import type { VisualStrokePhase } from '@/Game/characters/visualStrokePhase';

export const SwimmerComponentName = 'Swimmer';

export const SWIMMER_ACCESSORY_LAYER_INDEX = 1;

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
  /** Raw sampled horizontal gap width in pixels. */
  horizontalClearancePx?: number;
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
  /** Current procedural mesh scale X (volume-conserved with meshScaleY). */
  meshScaleX?: number;
  /** Current procedural mesh scale Y (volume-conserved with meshScaleX). */
  meshScaleY?: number;
  /** Prior frame movement state for pivot edge detection. */
  previousMovementState?: MovementState;
  /** Persisted secondary attachment simulation state. */
  accessoryState?: SecondaryItemPersistedState;
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
  /** Ceiling column bounds while pinned — stable slide-out reference across frames. */
  pinnedCeilingMinX?: number;
  pinnedCeilingMaxX?: number;
  /** True when horizontal motion was blocked by a side solid this frame. */
  isSideBlocked?: boolean;
  fallingVelocityY: number;
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
