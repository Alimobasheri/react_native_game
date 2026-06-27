import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
import {
  firstDataFromStore,
  firstEntityFromStore,
} from '@/containers/ReactNativeSkiaGameEngine/services-ecs/query';
import {
  SwimmerComponentName,
  SwimmerComponentData,
} from '@/Game/ecs-components/Swimmer';
import {
  ContainerComponentName,
  ContainerComponentData,
} from '@/Game/ecs-components/Container';
import {
  WaterComponentData,
  WaterComponentName,
} from '@/Game/ecs-components/Water';
import { ObstacleRowComponentName } from '@/Game/ecs-components/ObstacleRowComponent';
import {
  LAYOUT_CONSTANTS,
  getObstacleWidth,
  getWaterSurfaceRestY,
} from '@/Layout';
import {
  getObstacleBlockDimensions,
  getObstacleBlockHeight,
} from '@/assets/swimmerBlocks';
import {
  RenderComponentData,
  RenderComponentName,
} from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import {
  resolveSwimmerAgainstRows,
  selectRowsNearSwimmerFromComponentStore,
} from '@/Game/collision/swimmerBlockCollision';
import {
  ScoreComponentName,
} from '@/Game/ecs-components/Score';
import {
  getOrCreateRunResultEntity,
  RunResultComponentData,
  RunResultComponentName,
} from '@/Game/ecs-components/RunResult';
import { swimmerPhysicsTuning, swimmerLocomotionMode, swimmerCoastPreset, swimmerCoastPresets } from '@/config/swimmerTuning';
import { runOnJS } from 'react-native-reanimated';
import {
  degreesToRadians,
  getCharacterProfileForSwimmer,
  swimmerKinematicsOnTap,
  swimmerKinematicsUpdate,
} from '@/Game/characters/swimmerKinematicsController';
import {
  applyHyperCasualDrag,
  applyHyperCasualTap,
  buildPinnedEscapeContext,
  computeHybridSplashStrength,
  computePinnedEscapeMinSlidePx,
  updateHyperCasualLocomotionTelemetry,
} from '@/Game/characters/swimmerHyperCasualPhysics';
import { computeFinalSurfaceUv } from '@/Game/water/waterSurfaceProfile';
import {
  SwimmerAnticipationDentEventType,
  SwimmerDirectionalSplashEventType,
  SwimmerPinnedSplashEventType,
  SwimmerPivotSplashEventType,
} from '@/Game/characters/swimmerLocomotionEvents';
import { sampleHorizontalClearancePx } from '@/Game/characters/swimmerClearance';
import { updateSwimmerVisualLocomotion } from '@/Game/characters/swimmerVisualLocomotion';
import { MovementState } from '@/Game/characters/characterMovementStates';
import { getSwimmerColliderExtents } from '@/Game/characters/swimmerCollider';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';
import '@/Game/characters/characterProfiles';
import {
  getGameSession,
  getGameSessionEntity,
  isGameOverPhase,
  isStartReady,
} from '@/Game/session/gameSessionQuery';
import { markGameSessionGameOver } from '@/Game/session/beginGameplay';
import { saveBestScoreIfHigher } from '@/Game/persistence/bestScoreStorage';

/**
 * SwimmerPhysicsSystem - Handles swimmer movement and game mechanics
 *
 * Game phases:
 * 1. Initial phase: Water rises until surface reaches `getWaterSurfaceRestY` (fraction up from container bottom; see Layout)
 * 2. Platformer phase: Water stops rising, swimmer's Y is locked to water surface,
 *    obstacles move down at water speed (creating platformer effect)
 * 3. Collision phase: If swimmer collides with obstacle, swimmer falls at obstacle speed
 *
 * This system:
 * - Manages game phase transitions
 * - Updates water surface during initial phase
 * - Moves obstacles down during platformer phase
 * - Handles swimmer collision and falling states
 * - Manages horizontal swimmer movement
 */
const persistBestScoreAsync = (score: number) => {
  saveBestScoreIfHigher(score).catch(() => undefined);
};

export const SwimmerPhysicsSystem: System = {
  requiredComponents: [SwimmerComponentName],
  process: ({ entities, components, deltaTime, ecs, dimensions, eventQueue }) => {
    'worklet';

    const containerEntity = firstEntityFromStore(
      components[ContainerComponentName]
    );

    if (containerEntity === undefined) {
      return;
    }

    const containerData = components[ContainerComponentName].get(containerEntity);

    if (!containerData) {
      return;
    }

    const waterEntity = firstEntityFromStore(components[WaterComponentName]);
    if (waterEntity === undefined) {
      return;
    }

    const waterData = components[WaterComponentName].get(waterEntity) as WaterComponentData | undefined;
    const waterRenderData = components[RenderComponentName]?.get(
      waterEntity
    ) as RenderComponentData | undefined;

    if (!waterData) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const containerTop = containerData.centerY - containerData.height / 2;
    const containerBottom = containerData.centerY + containerData.height / 2;
    const waterSurfaceRestY = getWaterSurfaceRestY(
      containerData.centerY,
      containerData.height
    );
    const clamp01 = (value: number) => {
      'worklet';
      return Math.max(0, Math.min(1, value));
    };
    const smoothstep = (edge0: number, edge1: number, x: number) => {
      'worklet';
      const denom = Math.max(0.0001, edge1 - edge0);
      const t = clamp01((x - edge0) / denom);
      return t * t * (3 - 2 * t);
    };
    const softGapInfluence = (start: number, end: number, x: number, feather: number) => {
      'worklet';
      const left = smoothstep(start - feather, start + feather, x);
      const right = 1 - smoothstep(end - feather, end + feather, x);
      return clamp01(left * right);
    };
    const bandMask = (y: number, center: number, halfH: number) => {
      'worklet';
      const low = smoothstep(center - halfH - 0.02, center - halfH + 0.01, y);
      const high = 1 - smoothstep(center + halfH - 0.01, center + halfH + 0.02, y);
      return clamp01(low * high);
    };
    const shaderUniforms = waterRenderData?.shader?.uniforms;
    const shaderITime = (shaderUniforms?.iTime as number | undefined) ?? 0;
    const shaderFrequency = (shaderUniforms?.frequency as number | undefined) ?? 1;
    const shaderSpeed = (shaderUniforms?.speed as number | undefined) ?? 0.05;
    const waterLevelNorm = clamp01(
      1 - (containerData.waterSurfaceY - containerTop) / Math.max(0.0001, containerData.height)
    );

    const softRangeWeight = (range: [number, number], x: number) => {
      'worklet';
      const s = clamp01(range[0]);
      const e = clamp01(range[1]);
      if (e <= s + 0.0005) return 0;
      const w = Math.max(0.02, e - s);
      const feather = Math.max(0.02, Math.min(0.09, w * 0.45));
      return softGapInfluence(s, Math.max(s + 0.01, e), x, feather);
    };

    // Determine game phase based on first swimmer (they should all be in sync)
    let isInInitialPhase = true;
    if (entities.length > 0) {
      const firstSwimmer = components[SwimmerComponentName].get(entities[0]);
      if (firstSwimmer) {
        isInInitialPhase = firstSwimmer.isInInitialPhase;
      }
    }

    const session = getGameSession(components);
    const startReady = isStartReady(session);

    if (isGameOverPhase(session)) {
      return;
    }

    // PHASE 1: Initial water rising phase (skipped during start overlay)
    if (isInInitialPhase && !startReady) {
      // Update water level — rise (Y decreases) until surface reaches configured rest line
      const newWaterSurfaceY = containerData.waterSurfaceY - waterData.raisingSpeed * deltaSeconds;
      const constrainedWaterY = Math.max(newWaterSurfaceY, waterSurfaceRestY);

      // Check if we've reached the target height
      const hasReachedHalfHeight = constrainedWaterY <= waterSurfaceRestY;

      ecs.updateComponent<ContainerComponentData>(
        containerEntity,
        ContainerComponentName,
        (container: ContainerComponentData) => {
          container.waterSurfaceY = constrainedWaterY;
        }
      );

      // If we've reached half height, transition to platformer phase
      if (hasReachedHalfHeight) {
        entities.forEach((swimmerEntity: number) => {
          ecs.updateComponent<SwimmerComponentData>(
            swimmerEntity,
            SwimmerComponentName,
            (swimmer) => {
              swimmer.isInInitialPhase = false;
            }
          );
        });
      }
    }
    // PHASE 2 & 3: Platformer phase (water stays at half height, obstacles move down)
    else {
      // Water stays at current level (half height)
      // Obstacle movement is now handled by ObstacleSystem
    }

    const obstacleWidth = getObstacleWidth(containerData.width);
    const blockDimensions = getObstacleBlockDimensions(containerData.width);
    const blockHeight = getObstacleBlockHeight(containerData.width);
    const rowHeight = blockHeight;

    const obstacleRowStore = components[ObstacleRowComponentName];

    entities.forEach((swimmerEntity) => {
      const swimmerComponent = components[SwimmerComponentName].get(swimmerEntity) as
        | SwimmerComponentData
        | undefined;

      if (!swimmerComponent) {
        return;
      }

      const swimmerCenterX = swimmerComponent.x;
      const swimmerCenterY = swimmerComponent.y;
      const wasPinnedFromAbove = swimmerComponent.isPinnedFromAbove === true;
      const waterSpeed = waterData.raisingSpeed ?? 0;
      const normalizedSpeed = Math.max(0, Math.min(waterSpeed / 120, 1)); // 0..1

      const baseAmplitude = startReady
        ? swimmerVisualTuning.START_READY_BOB_PX
        : 3;
      const extraAmplitude = startReady ? 0 : 3;
      const amplitude = baseAmplitude + extraAmplitude * normalizedSpeed;

      const baseFrequency = startReady
        ? swimmerVisualTuning.START_READY_BOB_FREQUENCY_HZ
        : 0.25;
      const extraFrequency = startReady ? 0 : 0.35; // a bit faster at max speed
      const frequency = baseFrequency + extraFrequency * normalizedSpeed;

      let bobbingPhase = swimmerComponent.bobbingPhase ?? 0;
      bobbingPhase += 2 * Math.PI * frequency * deltaSeconds;

      if (bobbingPhase > Math.PI * 2) {
        bobbingPhase -= Math.PI * 2;
      }

      const raw = Math.sin(bobbingPhase);
      const downwardMultiplier = startReady ? 1 : 1.3;
      const upwardMultiplier = startReady ? 1 : 0.5;
      const scaled =
        raw < 0 ? raw * downwardMultiplier : raw * upwardMultiplier;

      const bias = startReady ? 0 : amplitude * 0.3;
      const bobbingOffsetY = scaled * amplitude - bias;

      // --- Vertical buoyancy: strong upward force when underwater ---
      // Treat container.waterSurfaceY as the surface. The deeper the center is
      // below this, and the faster the water rises, the stronger the upward
      // velocity. Obstacles remain static colliders; they block motion, but as
      // soon as the swimmer is free it rapidly rises toward the surface.
      const depth = swimmerCenterY - containerData.waterSurfaceY; // > 0 => underwater
      let buoyancySpeed = 0; // magnitude in px/s (sign encoded separately)

      const swimmerVisualWidth =
        swimmerComponent.meshBaseWidth ??
        (containerData.width / LAYOUT_CONSTANTS.COLUMNS) *
        swimmerVisualTuning.VISUAL_WIDTH_COLUMN_RATIO;
      const swimmerVisualHeight =
        swimmerComponent.meshBaseHeight ??
        swimmerVisualWidth * swimmerVisualTuning.VISUAL_HEIGHT_TO_WIDTH_RATIO;
      const columnWidth = containerData.width / LAYOUT_CONSTANTS.COLUMNS;
      const swimmerHeightForBuoyancy = swimmerVisualHeight;

      if (depth > 0) {
        // Normalize depth relative to swimmer size, clamp to avoid extremes.
        const depthFactor = Math.min(
          depth / (swimmerHeightForBuoyancy * 1.5),
          2
        ); // 0..2

        // Water speed amplifies buoyancy: faster rising water = stronger upward push.
        const waterFactor = 0.6 + waterSpeed / 80; // ~0.6..~2.0 for typical speeds

        // Final upward velocity magnitude (negative Y = up).
        const buoyancyStrength = 220 * waterFactor * depthFactor;
        buoyancySpeed = buoyancyStrength; // we apply sign when integrating Y
      } else {
        // Slight downward settling if a bit above the surface, so it doesn't drift away.
        const heightAbove = -depth; // > 0 => above surface
        if (heightAbove > 0) {
          const settleFactor = Math.min(
            heightAbove / (swimmerHeightForBuoyancy * 1.5),
            1.5
          );
          const settleStrength = 80 * (0.3 + normalizedSpeed) * settleFactor;
          buoyancySpeed = settleStrength;
        }
      }

      const isUnderWater = depth > 0;
      const isGameOverDisabled = swimmerComponent.disableGameOver === true;
      let shouldDispatchGameOver = false;
      let swimmerVelocityX = swimmerComponent.velocityX ?? 0;
      let locomotion = swimmerComponent.locomotion;
      let kinematicsAngleRad = 0;

      const navColliderExtents = getSwimmerColliderExtents(columnWidth, false);
      const pinnedColliderExtents = getSwimmerColliderExtents(columnWidth, true);
      const colliderExtents = wasPinnedFromAbove
        ? pinnedColliderExtents
        : navColliderExtents;
      const collisionHalfWidth = colliderExtents.halfWidth;
      const collisionHalfHeight = colliderExtents.halfHeight;

      const flowVelocityNorm = Math.max(
        -1,
        Math.min(1, waterData.flowVelocity ?? waterData.forceDirection ?? 0)
      );
      const surgeNorm = Math.max(
        0,
        Math.min(1, waterData.surgeEnergy ?? waterData.surgePhase ?? 0)
      );

      // --- Multi-gap local current sampling (hybrid; silhouette may still be single-gap) ---
      // We sample the local channel weights at the swimmer's *current* X before we apply
      // this frame's velocity integration, to avoid circular dependency.
      const containerLeftX = containerData.centerX - containerData.width / 2;
      const currentUVX = clamp01(
        (swimmerCenterX - containerLeftX) / Math.max(0.0001, containerData.width)
      );
      const blendT = smoothstep(0, 1, clamp01(waterData.gapBlend ?? 1));
      const curr01 = waterData.gapRangesCurr01;
      const curr23 = waterData.gapRangesCurr23;
      const prev01 = waterData.gapRangesPrev01;
      const prev23 = waterData.gapRangesPrev23;
      const fallbackStart = waterData.currentGapStartNorm ?? 1 / 6;
      const fallbackEnd = waterData.currentGapEndNorm ?? 5 / 6;
      const r0: [number, number] = [
        (prev01?.[0] ?? fallbackStart) + ((curr01?.[0] ?? fallbackStart) - (prev01?.[0] ?? fallbackStart)) * blendT,
        (prev01?.[1] ?? fallbackEnd) + ((curr01?.[1] ?? fallbackEnd) - (prev01?.[1] ?? fallbackEnd)) * blendT,
      ];
      const r1: [number, number] = [
        (prev01?.[2] ?? 0) + ((curr01?.[2] ?? 0) - (prev01?.[2] ?? 0)) * blendT,
        (prev01?.[3] ?? 0) + ((curr01?.[3] ?? 0) - (prev01?.[3] ?? 0)) * blendT,
      ];
      const r2: [number, number] = [
        (prev23?.[0] ?? 0) + ((curr23?.[0] ?? 0) - (prev23?.[0] ?? 0)) * blendT,
        (prev23?.[1] ?? 0) + ((curr23?.[1] ?? 0) - (prev23?.[1] ?? 0)) * blendT,
      ];
      const r3: [number, number] = [
        (prev23?.[2] ?? 0) + ((curr23?.[2] ?? 0) - (prev23?.[2] ?? 0)) * blendT,
        (prev23?.[3] ?? 0) + ((curr23?.[3] ?? 0) - (prev23?.[3] ?? 0)) * blendT,
      ];
      const w0 = softRangeWeight(r0, currentUVX);
      const w1 = softRangeWeight(r1, currentUVX);
      const w2 = softRangeWeight(r2, currentUVX);
      const w3 = softRangeWeight(r3, currentUVX);
      const wSum = w0 + w1 + w2 + w3;
      const flowSlots = waterData.flowPerRange ?? [waterData.flowVelocity ?? waterData.forceDirection ?? 0, 0, 0, 0];
      const localFlow =
        wSum > 0.0001
          ? (w0 * flowSlots[0] + w1 * flowSlots[1] + w2 * flowSlots[2] + w3 * flowSlots[3]) / wSum
          : (waterData.flowVelocity ?? waterData.forceDirection ?? 0);
      const localFlowVelocityNorm = Math.max(-1, Math.min(1, localFlow));

      const waterCurrentVelocityX =
        localFlowVelocityNorm *
        swimmerPhysicsTuning.MAX_WATER_CURRENT_SPEED *
        (1 + swimmerPhysicsTuning.WATER_CURRENT_SURGE_BOOST * surgeNorm);

      // Horizontal control: tap-based hyper-casual (useColumnControl) or pan-based.
      let tapImpulseAppliedThisFrame = false;
      let tapDirectionThisFrame: -1 | 0 | 1 = 0;
      if (swimmerComponent.useColumnControl) {
        const profile = getCharacterProfileForSwimmer(locomotion.profileId);
        const navColliderWidth = navColliderExtents.halfWidth * 2;

        const clearanceRows = selectRowsNearSwimmerFromComponentStore(
          obstacleRowStore,
          swimmerCenterY,
          collisionHalfHeight,
          rowHeight
        );
        const clearancePx = sampleHorizontalClearancePx(
          swimmerCenterX,
          clearanceRows,
          {
            centerX: containerData.centerX,
            width: containerData.width,
          }
        );

        const pendingTapDirection = locomotion.pendingTapDirection ?? 0;
        const hasPendingTap =
          pendingTapDirection === -1 || pendingTapDirection === 1;

        // Decay last frame's velocity before applying a new tap impulse.
        if (swimmerLocomotionMode === 'hybrid') {
          swimmerVelocityX = applyHyperCasualDrag(
            swimmerVelocityX,
            normalizedSpeed,
            profile,
            deltaSeconds
          );
        } else if (!hasPendingTap) {
          swimmerVelocityX = swimmerKinematicsUpdate(
            profile,
            locomotion,
            swimmerVelocityX,
            deltaSeconds
          );
        }

        if (hasPendingTap) {
          tapImpulseAppliedThisFrame = true;
          tapDirectionThisFrame = pendingTapDirection;

          if (swimmerLocomotionMode === 'hybrid') {
            const streakMultiplier = locomotion.pendingTapMultiplier ?? 1;
            const pinnedEscape = wasPinnedFromAbove
              ? buildPinnedEscapeContext(
                  swimmerCenterX,
                  columnWidth,
                  containerData.centerX,
                  containerData.width,
                  swimmerComponent.pinnedCeilingMinX,
                  swimmerComponent.pinnedCeilingMaxX
                )
              : undefined;
            const tapResult = applyHyperCasualTap(
              profile,
              locomotion,
              swimmerVelocityX,
              pendingTapDirection,
              columnWidth,
              normalizedSpeed,
              streakMultiplier,
              waterCurrentVelocityX,
              clearancePx,
              navColliderWidth,
              pinnedEscape
            );
            swimmerVelocityX = tapResult.velocityX;
            locomotion.pendingTapMultiplier = 1;

            if (tapResult.isSoftReverseTap) {
              eventQueue.addEvent({
                type: SwimmerPivotSplashEventType,
                payload: {
                  entityId: swimmerEntity,
                  prefabKey: profile.splashFxPrefabKey,
                  impactSpeed: Math.abs(swimmerVelocityX),
                  x: swimmerCenterX,
                  y: swimmerCenterY,
                  direction: pendingTapDirection,
                },
              });
            } else {
              eventQueue.addEvent({
                type: SwimmerAnticipationDentEventType,
                payload: {
                  entityId: swimmerEntity,
                  x: swimmerCenterX,
                  y: swimmerCenterY,
                  direction: pendingTapDirection,
                },
              });
              eventQueue.addEvent({
                type: SwimmerDirectionalSplashEventType,
                payload: {
                  entityId: swimmerEntity,
                  x: swimmerCenterX,
                  y: swimmerCenterY,
                  direction: pendingTapDirection,
                  tier: tapResult.visualStrokeTier,
                  strength: computeHybridSplashStrength(
                    tapResult.visualStrokeTier,
                    tapResult.streakMultiplier
                  ),
                },
              });
            }
          } else {
            const prevMovementState = locomotion.movementState;
            swimmerVelocityX = swimmerKinematicsOnTap(
              profile,
              locomotion,
              swimmerVelocityX,
              pendingTapDirection,
              (prefabKey, impactSpeed) => {
                eventQueue.addEvent({
                  type: SwimmerPivotSplashEventType,
                  payload: {
                    entityId: swimmerEntity,
                    prefabKey,
                    impactSpeed,
                    x: swimmerCenterX,
                    y: swimmerCenterY,
                    direction: pendingTapDirection,
                  },
                });
              }
            );
            if (
              locomotion.movementState === MovementState.ANTICIPATION &&
              prevMovementState !== MovementState.PIVOT_BRAKE
            ) {
              eventQueue.addEvent({
                type: SwimmerAnticipationDentEventType,
                payload: {
                  entityId: swimmerEntity,
                  x: swimmerCenterX,
                  y: swimmerCenterY,
                  direction: pendingTapDirection,
                },
              });
              eventQueue.addEvent({
                type: SwimmerDirectionalSplashEventType,
                payload: {
                  entityId: swimmerEntity,
                  x: swimmerCenterX,
                  y: swimmerCenterY,
                  direction: pendingTapDirection,
                  tier: locomotion.currentTier,
                  strength: Math.min(
                    1.35,
                    0.75 + locomotion.currentTier * 0.12
                  ),
                },
              });
            }
          }
          locomotion.pendingTapDirection = 0;
        }

        if (swimmerLocomotionMode === 'hybrid') {
          updateHyperCasualLocomotionTelemetry(locomotion, swimmerVelocityX);
        }

        updateSwimmerVisualLocomotion(
          profile,
          locomotion,
          swimmerVelocityX,
          clearancePx,
          obstacleWidth,
          deltaSeconds,
          startReady
        );
        kinematicsAngleRad = degreesToRadians(
          locomotion.visualAngleDeg ?? locomotion.currentAngleDeg
        );
      } else {
        // --- PAN-BASED CONTROL ---
        // Apply simple drag that grows with water speed (more water speed -> more drag).
        const baseDrag = 0.9;
        const extraDrag = 0.25 * normalizedSpeed; // up to +0.15 extra drag at max speed
        const drag = Math.max(0, Math.min(1, baseDrag - extraDrag));
        swimmerVelocityX *= drag;
      }

      // Water advection: treat flow as a target lateral velocity and relax toward it
      // with a frame-rate-independent response curve.
      let currentResponse =
        1 - Math.exp(-swimmerPhysicsTuning.WATER_CURRENT_RESPONSE_PER_SECOND * deltaSeconds);
      if (swimmerComponent.useColumnControl) {
        currentResponse *= swimmerCoastPresets[swimmerCoastPreset].TAP_MODE_CURRENT_RESPONSE_SCALE;
        if (wasPinnedFromAbove && tapImpulseAppliedThisFrame) {
          currentResponse *= swimmerPhysicsTuning.PINNED_TAP_WATER_CURRENT_SCALE;
        }
      }
      const vxBeforeWaterCurrent = swimmerVelocityX;
      swimmerVelocityX +=
        (waterCurrentVelocityX - swimmerVelocityX) * currentResponse;
      // Clamp horizontal speed.
      if (swimmerVelocityX > swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
        swimmerVelocityX = swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
      } else if (swimmerVelocityX < -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
        swimmerVelocityX = -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
      }

      // When pinned under a ceiling block, bleed speed — but not on a fresh tap.
      if (wasPinnedFromAbove && !tapImpulseAppliedThisFrame) {
        swimmerVelocityX *= swimmerPhysicsTuning.PINNED_VELOCITY_DAMPING;
      }

      // const shouldLogTapPhysics =
      //   swimmerComponent.useColumnControl &&
      //   (currentInputX !== 0 ||
      //     pendingMultAtFrameStart > 1.001 ||
      //     (Math.abs(vxFrameStart) > 40 && Math.abs(swimmerVelocityX) < 20));
      // if (shouldLogTapPhysics) {
      //   runOnJS(logSwimmerTapDebug)(
      //     `[SwimmerPhys] input=${currentInputX} pendingMultStart=${pendingMultAtFrameStart.toFixed(2)} multRaw=${tapMultiplierRaw.toFixed(2)} multCap=${tapMultiplierCapped.toFixed(2)} impulse=${tapImpulseApplied.toFixed(1)} vx=${vxFrameStart.toFixed(1)}->${swimmerVelocityX.toFixed(1)} drag=${dragFactorApplied.toFixed(3)} waterTarget=${waterCurrentVelocityX.toFixed(1)} waterStep=${(swimmerVelocityX - vxBeforeWaterCurrent).toFixed(1)} pinned=${wasPinnedFromAbove} streak=${swimmerComponent.rapidTapStreak ?? 0} dtMs=${Math.round(deltaSeconds * 1000)}`
      //   );
      // }

      const proposedDeltaX = swimmerVelocityX * deltaSeconds;
      const containerUVX = clamp01(
        (swimmerCenterX + proposedDeltaX - (containerData.centerX - containerData.width / 2)) /
        Math.max(0.0001, containerData.width)
      );

      // --- Integrate vertical position manually (arcade-style) ---
      let targetY = swimmerCenterY;
      const dtSeconds = deltaSeconds;
      const rowDeltaY =
        startReady || isGameOverPhase(session) ? 0 : waterSpeed * deltaSeconds;
      const maxVerticalStepPx =
        blockHeight * swimmerPhysicsTuning.MAX_VERTICAL_STEP_BLOCK_FRACTION;

      if (!startReady && !wasPinnedFromAbove) {
        if (depth > 0) {
          const maxRise = Math.min(buoyancySpeed * dtSeconds, maxVerticalStepPx);
          targetY -= maxRise;
        } else if (depth < 0 && buoyancySpeed > 0) {
          const maxFall = Math.min(buoyancySpeed * dtSeconds, maxVerticalStepPx);
          targetY += maxFall;
        }
      }

      // Follow the same surface-curve equation used by the water shader so swimmer
      // floats on the visual surface at its current X.
      const gapCurrentStart = waterData.currentGapStartNorm ?? 1 / 6;
      const gapCurrentEnd = waterData.currentGapEndNorm ?? 5 / 6;
      const gapPrevStart = waterData.prevGapStartNorm ?? gapCurrentStart;
      const gapPrevEnd = waterData.prevGapEndNorm ?? gapCurrentEnd;
      const gapBlend = smoothstep(0, 1, clamp01(waterData.gapBlend ?? 1));
      const blendedGapStart =
        gapPrevStart + (gapCurrentStart - gapPrevStart) * gapBlend;
      const blendedGapEnd = gapPrevEnd + (gapCurrentEnd - gapPrevEnd) * gapBlend;
      const safeGapEnd = Math.max(blendedGapStart + 0.01, blendedGapEnd);
      const blendedGapWidth = Math.max(0.02, safeGapEnd - blendedGapStart);
      const gapFeather = Math.max(
        0.02,
        Math.min(0.09, blendedGapWidth * 0.45)
      );
      const softGap = softGapInfluence(
        blendedGapStart,
        safeGapEnd,
        containerUVX,
        gapFeather
      );
      // Multi-gap weight at the final constrained X (matches shader packing).
      const blendTForGap = smoothstep(0, 1, clamp01(waterData.gapBlend ?? 1));
      const curr01ForGap = waterData.gapRangesCurr01;
      const curr23ForGap = waterData.gapRangesCurr23;
      const prev01ForGap = waterData.gapRangesPrev01;
      const prev23ForGap = waterData.gapRangesPrev23;
      const r0ForGap: [number, number] = [
        (prev01ForGap?.[0] ?? blendedGapStart) +
        ((curr01ForGap?.[0] ?? blendedGapStart) -
          (prev01ForGap?.[0] ?? blendedGapStart)) *
        blendTForGap,
        (prev01ForGap?.[1] ?? safeGapEnd) +
        ((curr01ForGap?.[1] ?? safeGapEnd) -
          (prev01ForGap?.[1] ?? safeGapEnd)) *
        blendTForGap,
      ];
      const r1ForGap: [number, number] = [
        (prev01ForGap?.[2] ?? 0) +
        ((curr01ForGap?.[2] ?? 0) - (prev01ForGap?.[2] ?? 0)) * blendTForGap,
        (prev01ForGap?.[3] ?? 0) +
        ((curr01ForGap?.[3] ?? 0) - (prev01ForGap?.[3] ?? 0)) * blendTForGap,
      ];
      const r2ForGap: [number, number] = [
        (prev23ForGap?.[0] ?? 0) +
        ((curr23ForGap?.[0] ?? 0) - (prev23ForGap?.[0] ?? 0)) * blendTForGap,
        (prev23ForGap?.[1] ?? 0) +
        ((curr23ForGap?.[1] ?? 0) - (prev23ForGap?.[1] ?? 0)) * blendTForGap,
      ];
      const r3ForGap: [number, number] = [
        (prev23ForGap?.[2] ?? 0) +
        ((curr23ForGap?.[2] ?? 0) - (prev23ForGap?.[2] ?? 0)) * blendTForGap,
        (prev23ForGap?.[3] ?? 0) +
        ((curr23ForGap?.[3] ?? 0) - (prev23ForGap?.[3] ?? 0)) * blendTForGap,
      ];
      const softGapAny = Math.max(
        Math.max(
          softRangeWeight(r0ForGap, containerUVX),
          softRangeWeight(r1ForGap, containerUVX)
        ),
        Math.max(
          softRangeWeight(r2ForGap, containerUVX),
          softRangeWeight(r3ForGap, containerUVX)
        )
      );
      const finalSurfaceNorm = computeFinalSurfaceUv({
        xNorm: containerUVX,
        waterLevel: waterLevelNorm,
        iTime: shaderITime,
        frequency: shaderFrequency,
        speed: shaderSpeed,
        amplitude:
          (shaderUniforms?.amplitude as number | undefined) ?? 0,
        visualIntensity: waterData.visualIntensity ?? 0,
        gapBlend: waterData.gapBlend ?? 1,
        gapCurrent: [gapCurrentStart, gapCurrentEnd],
        gapPrev: [gapPrevStart, gapPrevEnd],
        gapCurr01: waterData.gapRangesCurr01 ?? [
          gapCurrentStart,
          gapCurrentEnd,
          0,
          0,
        ],
        gapCurr23: waterData.gapRangesCurr23 ?? [0, 0, 0, 0],
        gapPrev01: waterData.gapRangesPrev01 ?? [
          gapPrevStart,
          gapPrevEnd,
          0,
          0,
        ],
        gapPrev23: waterData.gapRangesPrev23 ?? [0, 0, 0, 0],
        hybridGapMaskStrength:
          (shaderUniforms?.uHybridGapMaskStrength as number | undefined) ?? 0.9,
        curveCenter:
          waterData.surfaceCurveCenterNorm ?? waterData.gapCenterNorm ?? 0.5,
        curveAmp: waterData.surfaceCurveAmp ?? 0.008,
        curveTilt: waterData.surfaceCurveTilt ?? 0,
        calmness: waterData.calmness ?? 0.5,
        flowVelocity:
          waterData.flowVelocity ?? waterData.flowDirection ?? 0,
        surgeEnergy: Math.max(
          waterData.surgeEnergy ?? 0,
          waterData.surgePhase ?? 0
        ),
        surfaceBandCenterY: waterData.surfaceBandCenterY ?? waterLevelNorm,
        surfaceBandHalfHeight: waterData.surfaceBandHalfHeight ?? 0.08,
      });
      const curveSurfaceY =
        containerTop + (1 - finalSurfaceNorm) * containerData.height;
      const targetFloatCenterY =
        curveSurfaceY +
        swimmerVisualHeight *
        swimmerPhysicsTuning.SURFACE_SUBMERGENCE_RATIO +
        bobbingOffsetY * swimmerPhysicsTuning.SURFACE_BOB_BLEND;
      const surfaceDepth = targetY - curveSurfaceY;
      const canFollowCurve =
        !swimmerComponent.isCollidingWithObstacle &&
        !swimmerComponent.isPinnedFromAbove &&
        Math.max(softGap, softGapAny) > 0.15 &&
        surfaceDepth > -swimmerVisualHeight &&
        surfaceDepth < swimmerVisualHeight * 2.1;
      if (canFollowCurve) {
        const followStep =
          startReady
            ? 1
            : 1 -
            Math.exp(
              -swimmerPhysicsTuning.SURFACE_FOLLOW_RESPONSE_PER_SECOND *
              dtSeconds
            );
        targetY += (targetFloatCenterY - targetY) * followStep;
      }

      if (startReady) {
        const idleAngle =
          (Math.sin(bobbingPhase * 0.85) *
            swimmerVisualTuning.START_READY_ROLL_DEG *
            Math.PI) /
          180;
        ecs.updateComponent<RenderComponentData>(
          swimmerEntity,
          RenderComponentName,
          (render) => {
            render.position = { x: swimmerCenterX, y: targetY };
            render.angle = idleAngle;
          }
        );
        ecs.updateComponent<SwimmerComponentData>(
          swimmerEntity,
          SwimmerComponentName,
          (swimmer) => {
            swimmer.y = targetY;
            swimmer.waterSurfaceY = curveSurfaceY;
            swimmer.bobbingPhase = bobbingPhase;
            swimmer.locomotion.pendingTapDirection = 0;
            swimmer.angle = idleAngle;
          }
        );
        return;
      }

      const proposedDeltaY = targetY - swimmerCenterY;
      const visualAngleRad = swimmerComponent.useColumnControl
        ? kinematicsAngleRad
        : (() => {
          const fullTiltSpeed =
            swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED *
            swimmerPhysicsTuning.FULL_TILT_SPEED_FRACTION;
          const tiltNormalized = Math.max(
            -1,
            Math.min(1, swimmerVelocityX / fullTiltSpeed)
          );
          return tiltNormalized * swimmerPhysicsTuning.MAX_TILT_RADIANS;
        })();
      // Upright collider for tap steering — lean is render-only. Tilted AABB blocked 1-col gaps.
      const collisionAngleRad = swimmerComponent.useColumnControl
        ? 0
        : visualAngleRad;
      const collisionHalfWidthForBounds = collisionHalfWidth;
      const collisionHalfHeightForBounds = collisionHalfHeight;
      const verticalSweepPx =
        Math.abs(proposedDeltaY) + rowDeltaY + maxVerticalStepPx;
      const minX =
        swimmerComponent.containerCenterX -
        swimmerComponent.containerWidth / 2 +
        collisionHalfWidthForBounds;
      const maxX =
        swimmerComponent.containerCenterX +
        swimmerComponent.containerWidth / 2 -
        collisionHalfWidthForBounds;
      const nearbyRows = selectRowsNearSwimmerFromComponentStore(
        obstacleRowStore,
        swimmerCenterY,
        collisionHalfHeightForBounds,
        rowHeight,
        verticalSweepPx
      );
      const collisionReleaseHalfWidth = wasPinnedFromAbove
        ? navColliderExtents.halfWidth
        : undefined;
      const collisionReleaseHalfHeight = wasPinnedFromAbove
        ? navColliderExtents.halfHeight
        : undefined;
      const collisionResult = resolveSwimmerAgainstRows({
        x: swimmerCenterX,
        y: swimmerCenterY,
        halfWidth: collisionHalfWidth,
        halfHeight: collisionHalfHeight,
        releaseHalfWidth: collisionReleaseHalfWidth,
        releaseHalfHeight: collisionReleaseHalfHeight,
        pinAnchorX: swimmerCenterX,
        pinnedCeilingMinX: swimmerComponent.pinnedCeilingMinX,
        pinnedCeilingMaxX: swimmerComponent.pinnedCeilingMaxX,
        angle: collisionAngleRad,
        deltaX: proposedDeltaX,
        deltaY: proposedDeltaY,
        rowDeltaY,
        rows: nearbyRows,
        container: {
          centerX: containerData.centerX,
          width: containerData.width,
        },
        blockSize: {
          width: blockDimensions.width,
          height: blockDimensions.height,
        },
        minX,
        maxX,
        kinematicHorizontal: true,
      });

      let finalX = collisionResult.x;
      const finalY = collisionResult.y;
      const isBlockedFromAbove = collisionResult.isPinnedFromAbove;
      const isCollidingWithObstacle = collisionResult.isColliding;

      if (!wasPinnedFromAbove && isBlockedFromAbove) {
        eventQueue.addEvent({
          type: SwimmerPinnedSplashEventType,
          payload: {
            entityId: swimmerEntity,
            x: finalX,
            y: finalY,
            impactSpeed: Math.abs(swimmerVelocityX),
          },
        });
      }

      if (
        wasPinnedFromAbove &&
        tapImpulseAppliedThisFrame &&
        tapDirectionThisFrame !== 0
      ) {
        const tapSlideDirection = tapDirectionThisFrame;
        const pinnedEscapeBounds = buildPinnedEscapeContext(
          swimmerCenterX,
          columnWidth,
          containerData.centerX,
          containerData.width,
          swimmerComponent.pinnedCeilingMinX,
          swimmerComponent.pinnedCeilingMaxX
        );
        const minPinnedSlidePx = computePinnedEscapeMinSlidePx(
          swimmerCenterX,
          tapSlideDirection,
          pinnedEscapeBounds.ceilingMinX,
          pinnedEscapeBounds.ceilingMaxX,
          columnWidth
        );
        const appliedDxAfterCollision = finalX - swimmerCenterX;
        const needsRetry =
          Math.abs(proposedDeltaX) > 0.5 &&
          (Math.sign(appliedDxAfterCollision) !== Math.sign(proposedDeltaX) ||
            Math.abs(appliedDxAfterCollision) < minPinnedSlidePx * 0.35);
        if (needsRetry) {
          const retryResult = resolveSwimmerAgainstRows({
            x: swimmerCenterX,
            y: swimmerCenterY,
            halfWidth: navColliderExtents.halfWidth,
            halfHeight: navColliderExtents.halfHeight,
            releaseHalfWidth: navColliderExtents.halfWidth,
            releaseHalfHeight: navColliderExtents.halfHeight,
            pinAnchorX: swimmerCenterX,
            pinnedCeilingMinX: swimmerComponent.pinnedCeilingMinX,
            pinnedCeilingMaxX: swimmerComponent.pinnedCeilingMaxX,
            angle: collisionAngleRad,
            deltaX:
              tapSlideDirection *
              Math.max(Math.abs(proposedDeltaX), minPinnedSlidePx),
            deltaY: 0,
            rowDeltaY,
            rows: nearbyRows,
            container: {
              centerX: containerData.centerX,
              width: containerData.width,
            },
            blockSize: {
              width: blockDimensions.width,
              height: blockDimensions.height,
            },
            minX,
            maxX,
            kinematicHorizontal: true,
          });
          if (
            Math.abs(retryResult.x - swimmerCenterX) >
            Math.abs(appliedDxAfterCollision)
          ) {
            finalX = retryResult.x;
          }
        }

        const visibleNudgePx =
          columnWidth *
          swimmerPhysicsTuning.PINNED_TAP_VISIBLE_NUDGE_COLUMN_FRACTION;
        const appliedAfterRetry = finalX - swimmerCenterX;
        if (
          Math.abs(appliedAfterRetry) <
          Math.max(visibleNudgePx, minPinnedSlidePx * 0.2)
        ) {
          const nudgeResult = resolveSwimmerAgainstRows({
            x: swimmerCenterX,
            y: swimmerCenterY,
            halfWidth: navColliderExtents.halfWidth,
            halfHeight: navColliderExtents.halfHeight,
            releaseHalfWidth: navColliderExtents.halfWidth,
            releaseHalfHeight: navColliderExtents.halfHeight,
            pinAnchorX: swimmerCenterX,
            pinnedCeilingMinX: swimmerComponent.pinnedCeilingMinX,
            pinnedCeilingMaxX: swimmerComponent.pinnedCeilingMaxX,
            angle: 0,
            deltaX: tapSlideDirection * Math.max(visibleNudgePx, minPinnedSlidePx * 0.25),
            deltaY: 0,
            rowDeltaY,
            rows: nearbyRows,
            container: {
              centerX: containerData.centerX,
              width: containerData.width,
            },
            blockSize: {
              width: blockDimensions.width,
              height: blockDimensions.height,
            },
            minX,
            maxX,
            kinematicHorizontal: true,
          });
          if (
            Math.abs(nudgeResult.x - swimmerCenterX) >
            Math.abs(finalX - swimmerCenterX)
          ) {
            finalX = nudgeResult.x;
          }
        }
      }

      const appliedDx = finalX - swimmerCenterX;
      const escapedOrMovedFreely =
        Math.abs(proposedDeltaX) > 0.5 &&
        Math.sign(appliedDx) === Math.sign(proposedDeltaX) &&
        Math.abs(appliedDx) >= Math.abs(proposedDeltaX) * 0.25;

      if (
        !tapImpulseAppliedThisFrame &&
        !escapedOrMovedFreely &&
        collisionResult.sideBlockedDirection !== 0
      ) {
        const blockedDir = collisionResult.sideBlockedDirection;
        const movementBlocked =
          Math.sign(proposedDeltaX) === blockedDir &&
          Math.abs(appliedDx) < Math.abs(proposedDeltaX) * 0.2;
        if (
          movementBlocked &&
          Math.sign(swimmerVelocityX) === blockedDir
        ) {
          swimmerVelocityX = 0;
        }
      }

      const swimmerBottomY = finalY + navColliderExtents.halfHeight;
      const pinnedPastContainerBottom =
        isBlockedFromAbove && swimmerBottomY > containerBottom;
      const pinnedPastScreenBottom =
        isBlockedFromAbove && finalY > dimensions.value.height - 8;

      if (
        !isGameOverDisabled &&
        (pinnedPastContainerBottom || pinnedPastScreenBottom) &&
        !swimmerComponent.gameOverDispatched
      ) {
        shouldDispatchGameOver = true;
        let finalScore = 0;
        components[ScoreComponentName]?.forEach((_entity, scoreData) => {
          finalScore = Math.max(finalScore, Math.floor(scoreData.score));
        });

        const runResultEntity = getOrCreateRunResultEntity(ecs);
        ecs.updateComponent<RunResultComponentData>(
          runResultEntity,
          RunResultComponentName,
          (runResult) => {
            runResult.finalScore = finalScore;
          }
        );

        const sessionEntity = getGameSessionEntity(components);
        if (typeof sessionEntity === 'number') {
          markGameSessionGameOver(ecs, sessionEntity, finalScore);
          runOnJS(saveBestScoreIfHigher)(finalScore);
        }
      }

      const swimmerAngle = visualAngleRad;

      ecs.updateComponent<RenderComponentData>(
        swimmerEntity,
        RenderComponentName,
        (render) => {
          'worklet';
          render.position = { x: finalX, y: finalY };
          render.angle = swimmerAngle;
        }
      );

      ecs.updateComponent<SwimmerComponentData>(
        swimmerEntity,
        SwimmerComponentName,
        (swimmer) => {
          'worklet';
          swimmer.velocityX = swimmerVelocityX;
          swimmer.x = finalX;
          swimmer.y = finalY;
          swimmer.waterSurfaceY = curveSurfaceY;
          swimmer.isCollidingWithObstacle = isCollidingWithObstacle;
          swimmer.isPinnedFromAbove = isBlockedFromAbove;
          swimmer.pinnedCeilingMinX = isBlockedFromAbove
            ? collisionResult.pinnedCeilingMinX
            : undefined;
          swimmer.pinnedCeilingMaxX = isBlockedFromAbove
            ? collisionResult.pinnedCeilingMaxX
            : undefined;
          swimmer.isSideBlocked = collisionResult.isSideBlocked;
          swimmer.isInInitialPhase = swimmerComponent.isInInitialPhase;
          swimmer.column = swimmerComponent.column;
          swimmer.useColumnControl = swimmerComponent.useColumnControl;
          swimmer.bobbingPhase = bobbingPhase;
          swimmer.locomotion = locomotion;
          swimmer.gameOverDispatched =
            swimmerComponent.gameOverDispatched || shouldDispatchGameOver;
          swimmer.angle = swimmerAngle;
        }
      );
    });
  }
}
