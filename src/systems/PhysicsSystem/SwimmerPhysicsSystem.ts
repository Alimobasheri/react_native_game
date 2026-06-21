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
  tiltedAabbHalfExtents,
} from '@/Game/collision/swimmerBlockCollision';
import {
  LoadSceneRequestType,
  UnLoadSceneRequestType,
} from '@/containers/ReactNativeSkiaGameEngine/components-rntge/Scene/events';
import {
  ScoreComponentName,
} from '@/Game/ecs-components/Score';
import {
  getOrCreateRunResultEntity,
  RunResultComponentData,
  RunResultComponentName,
} from '@/Game/ecs-components/RunResult';
import { swimmerPhysicsTuning } from '@/config/swimmerTuning';
import { runOnJS } from 'react-native-reanimated';
import { logSwimmerTapDebug } from '@/Game/debug/swimmerTapDebug';
import {
  GameSessionComponentData,
  GameSessionComponentName,
} from '@/Game/ecs-components/GameSession';
import {
  getGameSession,
  getGameSessionEntity,
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
const GAME_SCENE_KEY = 'game';
const GAME_OVER_SCENE_KEY = 'gameOver';

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

      if (startReady) {
        const idleFrequency = 1.1;
        let bobbingPhase = swimmerComponent.bobbingPhase ?? 0;
        bobbingPhase += 2 * Math.PI * idleFrequency * deltaSeconds;
        if (bobbingPhase > Math.PI * 2) {
          bobbingPhase -= Math.PI * 2;
        }
        const amplitude = 6;
        const bobbingOffsetY = Math.sin(bobbingPhase) * amplitude;
        const idleAngle = (Math.sin(bobbingPhase * 0.85) * 2 * Math.PI) / 180;
        const finalX = swimmerComponent.x;
        const finalY = swimmerComponent.y + bobbingOffsetY;

        ecs.updateComponent<RenderComponentData>(
          swimmerEntity,
          RenderComponentName,
          (render) => {
            render.position = { x: finalX, y: finalY };
            render.angle = idleAngle;
          }
        );
        ecs.updateComponent<SwimmerComponentData>(
          swimmerEntity,
          SwimmerComponentName,
          (swimmer) => {
            swimmer.bobbingPhase = bobbingPhase;
            swimmer.inputX = 0;
            swimmer.pendingTapMultiplier = 1;
          }
        );
        return;
      }

      const swimmerCenterX = swimmerComponent.x;
      const swimmerCenterY = swimmerComponent.y;
      // Gentle, slow bobbing values are still tracked for potential visual use,
      // but we no longer directly force Y toward the water surface. Vertical
      // motion is now handled via a buoyancy-style velocity below.
      const waterSpeed = waterData.raisingSpeed ?? 0;
      const normalizedSpeed = Math.max(0, Math.min(waterSpeed / 120, 1)); // 0..1

      const baseAmplitude = 3; // pixels
      const extraAmplitude = 3; // at max speed
      const amplitude = baseAmplitude + extraAmplitude * normalizedSpeed;

      const baseFrequency = 0.25; // Hz (one full cycle in ~4s)
      const extraFrequency = 0.35; // a bit faster at max speed
      const frequency = baseFrequency + extraFrequency * normalizedSpeed;

      let bobbingPhase = swimmerComponent.bobbingPhase ?? 0;
      bobbingPhase += 2 * Math.PI * frequency * deltaSeconds;

      if (bobbingPhase > Math.PI * 2) {
        bobbingPhase -= Math.PI * 2;
      }

      const raw = Math.sin(bobbingPhase);
      const downwardMultiplier = 1.3;
      const upwardMultiplier = 0.5;
      const scaled =
        raw < 0 ? raw * downwardMultiplier : raw * upwardMultiplier;

      const bias = amplitude * 0.3;
      const bobbingOffsetY = scaled * amplitude - bias;

      // --- Vertical buoyancy: strong upward force when underwater ---
      // Treat container.waterSurfaceY as the surface. The deeper the center is
      // below this, and the faster the water rises, the stronger the upward
      // velocity. Obstacles remain static colliders; they block motion, but as
      // soon as the swimmer is free it rapidly rises toward the surface.
      const depth = swimmerCenterY - containerData.waterSurfaceY; // > 0 => underwater
      let buoyancySpeed = 0; // magnitude in px/s (sign encoded separately)

      const swimmerHeightForBuoyancy = Math.min(
        obstacleWidth * swimmerPhysicsTuning.SWIMMER_WIDTH_COLUMN_RATIO *
        swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
        rowHeight * 0.9
      );

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

      const swimmerWidthForBlockCheck =
        obstacleWidth * swimmerPhysicsTuning.SWIMMER_WIDTH_COLUMN_RATIO;
      const swimmerHeightForBlockCheck = Math.min(
        swimmerWidthForBlockCheck * swimmerPhysicsTuning.SWIMMER_HEIGHT_TO_WIDTH_RATIO,
        rowHeight * 0.9
      );
      const swimmerHalfHeight = swimmerHeightForBlockCheck / 2;
      const swimmerHalfWidth = swimmerWidthForBlockCheck / 2;

      const isUnderWater = depth > 0;
      const isGameOverDisabled = swimmerComponent.disableGameOver === true;
      let shouldDispatchGameOver = false;
      let swimmerVelocityX = swimmerComponent.velocityX ?? 0;
      const vxFrameStart = swimmerVelocityX;
      const currentInputX = swimmerComponent.inputX ?? 0;
      const pendingMultAtFrameStart = swimmerComponent.pendingTapMultiplier ?? 1;
      let nextInputX = currentInputX;
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

      let tapImpulseApplied = 0;
      let tapMultiplierRaw = 1;
      let tapMultiplierCapped = 1;
      let dragFactorApplied = 1;

      // Horizontal control: tap-based hyper-casual (useColumnControl) or pan-based.
      if (swimmerComponent.useColumnControl) {
        // --- TAP-BASED IMPULSE + EXPONENTIAL DRAG ---
        // We treat inputX as a one-shot tap impulse that should move the swimmer
        // about one column width (or less at high water speeds), then decay to zero.

        if (currentInputX !== 0) {
          const columnWidth =
            swimmerComponent.containerWidth / LAYOUT_CONSTANTS.COLUMNS;

          // Stronger drag (less retention) as water gets faster.
          const minRetainPerSecond = 0.05; // 5% speed left after 1s at max water speed
          const maxRetainPerSecond = 0.25; // 25% speed left after 1s at low water speed
          const retainPerSecond =
            maxRetainPerSecond -
            (maxRetainPerSecond - minRetainPerSecond) * normalizedSpeed;

          // Continuous-time decay v(t) = v0 * e^(-k t), with k = -ln(retainPerSecond).
          const k = -Math.log(Math.max(0.0001, retainPerSecond));

          // Base distance we want to travel per tap: about one column at low water,
          // and less at higher water speeds (harder to move left/right).
          const distanceScale = 1 - 0.1 * normalizedSpeed; // 1.0 .. 0.6
          const desiredDistance = (3 * columnWidth) * distanceScale;

          const tapMultiplierRawLocal = swimmerComponent.pendingTapMultiplier ?? 1;
          tapMultiplierRaw = tapMultiplierRawLocal;
          const tapMultiplier = Math.max(
            swimmerPhysicsTuning.TAP_IMPULSE_MULTIPLIER_MIN,
            Math.min(swimmerPhysicsTuning.TAP_IMPULSE_MULTIPLIER_MAX, tapMultiplierRawLocal)
          );
          tapMultiplierCapped = tapMultiplier;
          const tapImpulse = currentInputX * desiredDistance * k * tapMultiplier; // pixels/second
          tapImpulseApplied = tapImpulse;
          swimmerVelocityX += tapImpulse;

          // Consume the tap so it does not continuously accelerate.
          nextInputX = 0;
        }

        // Apply exponential drag over time. More water speed -> more drag.
        const minRetainPerSecond = 0.05;
        const maxRetainPerSecond = 0.25;
        const retainPerSecond =
          maxRetainPerSecond -
          (maxRetainPerSecond - minRetainPerSecond) * normalizedSpeed;
        const dragFactor = Math.pow(
          Math.max(0.0001, retainPerSecond),
          deltaSeconds
        );
        dragFactorApplied = dragFactor;
        swimmerVelocityX *= dragFactor;
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
      const currentResponse =
        1 - Math.exp(-swimmerPhysicsTuning.WATER_CURRENT_RESPONSE_PER_SECOND * deltaSeconds);
      const vxBeforeWaterCurrent = swimmerVelocityX;
      swimmerVelocityX +=
        (waterCurrentVelocityX - swimmerVelocityX) * currentResponse;
      // Clamp horizontal speed.
      if (swimmerVelocityX > swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
        swimmerVelocityX = swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
      } else if (swimmerVelocityX < -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED) {
        swimmerVelocityX = -swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED;
      }

      // When pinned under a ceiling block, horizontal movement is heavily damped.
      const wasPinnedFromAbove = swimmerComponent.isPinnedFromAbove === true;
      if (wasPinnedFromAbove) {
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

      if (depth > 0) {
        const maxRise = buoyancySpeed * dtSeconds;
        targetY -= maxRise;
      } else if (depth < 0 && buoyancySpeed > 0) {
        const maxFall = buoyancySpeed * dtSeconds;
        targetY += maxFall;
      }

      // Follow the same surface-curve equation used by the water shader so swimmer
      // floats on the visual surface at its current X.
      const gapCurrentStart = waterData.currentGapStartNorm ?? 1 / 6;
      const gapCurrentEnd = waterData.currentGapEndNorm ?? 5 / 6;
      const gapPrevStart = waterData.prevGapStartNorm ?? gapCurrentStart;
      const gapPrevEnd = waterData.prevGapEndNorm ?? gapCurrentEnd;
      const gapBlend = smoothstep(0, 1, clamp01(waterData.gapBlend ?? 1));
      const blendedGapStart = gapPrevStart + (gapCurrentStart - gapPrevStart) * gapBlend;
      const blendedGapEnd = gapPrevEnd + (gapCurrentEnd - gapPrevEnd) * gapBlend;
      const safeGapEnd = Math.max(blendedGapStart + 0.01, blendedGapEnd);
      const blendedGapWidth = Math.max(0.02, safeGapEnd - blendedGapStart);
      const gapFeather = Math.max(0.02, Math.min(0.09, blendedGapWidth * 0.45));
      const softGap = softGapInfluence(blendedGapStart, safeGapEnd, containerUVX, gapFeather);
      // Multi-gap weight at the final constrained X (matches shader packing).
      const blendTForGap = smoothstep(0, 1, clamp01(waterData.gapBlend ?? 1));
      const curr01ForGap = waterData.gapRangesCurr01;
      const curr23ForGap = waterData.gapRangesCurr23;
      const prev01ForGap = waterData.gapRangesPrev01;
      const prev23ForGap = waterData.gapRangesPrev23;
      const r0ForGap: [number, number] = [
        (prev01ForGap?.[0] ?? blendedGapStart) +
        ((curr01ForGap?.[0] ?? blendedGapStart) - (prev01ForGap?.[0] ?? blendedGapStart)) * blendTForGap,
        (prev01ForGap?.[1] ?? safeGapEnd) +
        ((curr01ForGap?.[1] ?? safeGapEnd) - (prev01ForGap?.[1] ?? safeGapEnd)) * blendTForGap,
      ];
      const r1ForGap: [number, number] = [
        (prev01ForGap?.[2] ?? 0) + ((curr01ForGap?.[2] ?? 0) - (prev01ForGap?.[2] ?? 0)) * blendTForGap,
        (prev01ForGap?.[3] ?? 0) + ((curr01ForGap?.[3] ?? 0) - (prev01ForGap?.[3] ?? 0)) * blendTForGap,
      ];
      const r2ForGap: [number, number] = [
        (prev23ForGap?.[0] ?? 0) + ((curr23ForGap?.[0] ?? 0) - (prev23ForGap?.[0] ?? 0)) * blendTForGap,
        (prev23ForGap?.[1] ?? 0) + ((curr23ForGap?.[1] ?? 0) - (prev23ForGap?.[1] ?? 0)) * blendTForGap,
      ];
      const r3ForGap: [number, number] = [
        (prev23ForGap?.[2] ?? 0) + ((curr23ForGap?.[2] ?? 0) - (prev23ForGap?.[2] ?? 0)) * blendTForGap,
        (prev23ForGap?.[3] ?? 0) + ((curr23ForGap?.[3] ?? 0) - (prev23ForGap?.[3] ?? 0)) * blendTForGap,
      ];
      const softGapAny = Math.max(
        Math.max(softRangeWeight(r0ForGap, containerUVX), softRangeWeight(r1ForGap, containerUVX)),
        Math.max(softRangeWeight(r2ForGap, containerUVX), softRangeWeight(r3ForGap, containerUVX))
      );
      const surfaceBandCenter = clamp01(waterData.surfaceBandCenterY ?? waterLevelNorm);
      const surfaceBandHalfHeight = Math.max(
        0.02,
        Math.min(0.2, waterData.surfaceBandHalfHeight ?? 0.08)
      );
      const activeBandMask = bandMask(waterLevelNorm, surfaceBandCenter, surfaceBandHalfHeight);
      const surgeEnergy = clamp01(
        Math.max(waterData.surgeEnergy ?? 0, waterData.surgePhase ?? 0)
      );
      const calmness = clamp01(waterData.calmness ?? 0.5);
      const flowDir = waterData.flowDirection ?? 0;
      const flowVel = waterData.flowVelocity ?? flowDir;
      const flowVelocity = Math.max(-1, Math.min(1, flowDir * 0.25 + flowVel * 0.75));
      const pressure = clamp01(
        (1 - blendedGapWidth) * 0.72 + Math.abs(flowVelocity) * 0.28
      );
      const curveMargin = Math.max(0.01, Math.min(0.08, blendedGapWidth * 0.2));
      const inertiaTravel = Math.max(0.035, blendedGapWidth * (0.16 + 0.2 * surgeEnergy));
      const unclampedCurveCenter =
        waterData.surfaceCurveCenterNorm ?? waterData.gapCenterNorm ?? 0.5;
      const curveCenter = Math.max(
        blendedGapStart + curveMargin - inertiaTravel,
        Math.min(safeGapEnd - curveMargin + inertiaTravel, unclampedCurveCenter)
      );
      const gapHalf = Math.max(blendedGapWidth * 0.5, 0.02);
      const centeredNorm = (containerUVX - curveCenter) / gapHalf;
      const curveAmp = Math.max(0, waterData.surfaceCurveAmp ?? 0.008);
      const centerCurve = Math.exp(-centeredNorm * centeredNorm * 2.8) * curveAmp;
      const curveTilt = (waterData.surfaceCurveTilt ?? 0) * Math.max(-1, Math.min(1, centeredNorm));
      const calmRippleAmp =
        (0.0005 + calmness * 0.0038) * (1 - surgeEnergy) * softGap * activeBandMask;
      const calmRippleA = Math.sin(
        containerUVX * shaderFrequency * 4.5 +
        shaderITime * shaderSpeed * (0.02 + 0.04 * Math.abs(flowVelocity))
      );
      const calmRippleB = Math.sin(
        containerUVX * shaderFrequency * 2.8 -
        shaderITime * shaderSpeed * 0.015 +
        1.2
      );
      const calmRipples = (calmRippleA * 0.65 + calmRippleB * 0.35) * calmRippleAmp;
      const curveInfluence = 0.18 + 0.82 * activeBandMask;
      const edgeBend =
        (1 - softGap) * activeBandMask * (0.003 + 0.01 * (0.4 + pressure * 0.6));
      const finalSurfaceNorm = clamp01(
        waterLevelNorm +
        (centerCurve + curveTilt) * curveInfluence +
        calmRipples -
        edgeBend
      );
      const curveSurfaceY =
        containerTop + (1 - finalSurfaceNorm) * containerData.height;
      const targetFloatCenterY =
        curveSurfaceY + swimmerHalfHeight * swimmerPhysicsTuning.SURFACE_SUBMERGENCE_RATIO + bobbingOffsetY * swimmerPhysicsTuning.SURFACE_BOB_BLEND;
      const surfaceDepth = targetY - curveSurfaceY;
      const canFollowCurve =
        !swimmerComponent.isCollidingWithObstacle &&
        !swimmerComponent.isPinnedFromAbove &&
        Math.max(softGap, softGapAny) > 0.15 &&
        surfaceDepth > -swimmerHeightForBlockCheck &&
        surfaceDepth < swimmerHeightForBlockCheck * 2.1;
      if (canFollowCurve) {
        const followStep =
          1 - Math.exp(-swimmerPhysicsTuning.SURFACE_FOLLOW_RESPONSE_PER_SECOND * dtSeconds);
        targetY += (targetFloatCenterY - targetY) * followStep;
      }

      const proposedDeltaY = targetY - swimmerCenterY;
      const fullTiltSpeed =
        swimmerPhysicsTuning.MAX_HORIZONTAL_SPEED *
        swimmerPhysicsTuning.FULL_TILT_SPEED_FRACTION;
      const tiltNormalized = Math.max(
        -1,
        Math.min(1, swimmerVelocityX / fullTiltSpeed)
      );
      const collisionAngle =
        tiltNormalized * swimmerPhysicsTuning.MAX_TILT_RADIANS;
      const tiltedHalfExtents = tiltedAabbHalfExtents(
        swimmerHalfWidth,
        swimmerHalfHeight,
        collisionAngle
      );
      const collisionHalfWidth = tiltedHalfExtents.halfWidth;
      const collisionHalfHeight = tiltedHalfExtents.halfHeight;
      const minX =
        swimmerComponent.containerCenterX -
        swimmerComponent.containerWidth / 2 +
        collisionHalfWidth;
      const maxX =
        swimmerComponent.containerCenterX +
        swimmerComponent.containerWidth / 2 -
        collisionHalfWidth;
      const nearbyRows = selectRowsNearSwimmerFromComponentStore(
        obstacleRowStore,
        swimmerCenterY,
        collisionHalfHeight,
        rowHeight
      );
      const collisionResult = resolveSwimmerAgainstRows({
        x: swimmerCenterX,
        y: swimmerCenterY,
        halfWidth: swimmerHalfWidth,
        halfHeight: swimmerHalfHeight,
        angle: collisionAngle,
        deltaX: proposedDeltaX,
        deltaY: proposedDeltaY,
        rowDeltaY: 0,
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

      const finalX = collisionResult.x;
      const finalY = collisionResult.y;
      const isBlockedFromAbove = collisionResult.isPinnedFromAbove;
      const isCollidingWithObstacle = collisionResult.isColliding;

      if (
        !isGameOverDisabled &&
        isBlockedFromAbove &&
        isUnderWater &&
        finalY > dimensions.value.height &&
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
          markGameSessionGameOver(ecs, sessionEntity);
          ecs.updateComponent<GameSessionComponentData>(
            sessionEntity,
            GameSessionComponentName,
            (s) => {
              if (finalScore > s.bestScore) {
                s.bestScore = finalScore;
              }
            }
          );
          runOnJS(saveBestScoreIfHigher)(finalScore);
        }

        eventQueue.addEvent({
          type: LoadSceneRequestType,
          payload: { sceneKey: GAME_OVER_SCENE_KEY },
        });
        eventQueue.addEvent({
          type: UnLoadSceneRequestType,
          payload: { sceneKey: GAME_SCENE_KEY },
        });
      }

      const swimmerAngle = collisionAngle;

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
          swimmer.isInInitialPhase = swimmerComponent.isInInitialPhase;
          swimmer.column = swimmerComponent.column;
          swimmer.useColumnControl = swimmerComponent.useColumnControl;
          swimmer.bobbingPhase = bobbingPhase;
          swimmer.inputX = nextInputX;
          if (currentInputX !== 0) {
            swimmer.pendingTapMultiplier = 1;
          }
          swimmer.gameOverDispatched =
            swimmerComponent.gameOverDispatched || shouldDispatchGameOver;
          swimmer.angle = swimmerAngle;
        }
      );
    });
  }
}
