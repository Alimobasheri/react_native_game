import { System } from '@/containers/ReactNativeSkiaGameEngine/services-ecs/system';
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
import {
  ObstacleComponentName,
} from '@/Game/ecs-components/ObstacleComponent';
import { LAYOUT_CONSTANTS, getColumnCenterX, getObstacleWidth, getRows } from '@/Layout';
import { MatterBodyComponentName } from '@/containers/ReactNativeSkiaGameEngine/internal/components/matterBody';

const SWIMMER_WIDTH_COLUMN_RATIO = 2 / 3;
const SWIMMER_HEIGHT_TO_WIDTH_RATIO = 1.8;

// Horizontal movement tuning for tap-based hyper-casual control.
const MAX_HORIZONTAL_SPEED = 150; // pixels / second
const BASE_HORIZONTAL_ACCEL = 900; // target speed for inputX = 1 before drag
const BASE_RESPONSIVENESS = 0.15; // how quickly velocity approaches target
const PINNED_VELOCITY_DAMPING = 0.7; // vx multiplier when pinned under obstacle

/**
 * SwimmerPhysicsSystem - Handles swimmer movement and game mechanics
 *
 * Game phases:
 * 1. Initial phase: Water rises to half container height, swimmer follows water surface
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
export const SwimmerPhysicsSystem: System = {
  requiredComponents: [SwimmerComponentName, MatterBodyComponentName],
  process: ({ entities, components, deltaTime, ecs }) => {
    'worklet';

    // Get container entity
    const containerEntities = ecs.getEntitiesWithComponents([
      ContainerComponentName,
    ]);

    if (containerEntities.length === 0) {
      return; // No container, nothing to do
    }

    const containerEntity = containerEntities[0];
    const containerData = components[ContainerComponentName].get(containerEntity);

    if (!containerData) {
      return;
    }

    // Get water entity and data
    const waterEntities = ecs.getEntitiesWithComponents([
      WaterComponentName,
    ]);

    if (waterEntities.length === 0) {
      return; // No water, nothing to do
    }

    const waterEntity = waterEntities[0];
    const waterData = components[WaterComponentName].get(waterEntity) as WaterComponentData | undefined;

    if (!waterData) {
      return;
    }

    const deltaSeconds = deltaTime / 1000;
    const containerTop = containerData.centerY - containerData.height / 2;
    const containerBottom = containerData.centerY + containerData.height / 2;
    const halfContainerHeight = containerData.centerY; // Half way up from bottom

    // Determine game phase based on first swimmer (they should all be in sync)
    let isInInitialPhase = true;
    if (entities.length > 0) {
      const firstSwimmer = components[SwimmerComponentName].get(entities[0]);
      if (firstSwimmer) {
        isInInitialPhase = firstSwimmer.isInInitialPhase;
      }
    }

    // PHASE 1: Initial water rising phase
    if (isInInitialPhase) {
      // Update water level - rise until half container height
      const newWaterSurfaceY = containerData.waterSurfaceY - waterData.raisingSpeed * deltaSeconds;
      const targetHeight = halfContainerHeight;
      const constrainedWaterY = Math.max(newWaterSurfaceY, targetHeight);

      // Check if we've reached the target height
      const hasReachedHalfHeight = constrainedWaterY <= targetHeight;

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

    // Update all swimmers
    // Pre-compute obstacle body ids for collision checks (resolved by Matter)
    const obstacleEntities = ecs.getEntitiesWithComponents([
      ObstacleComponentName,
      MatterBodyComponentName,
    ]);
    const obstacleBodyIds: Record<number, true> = {};
    for (let i = 0; i < obstacleEntities.length; i++) {
      const b = components[MatterBodyComponentName].get(obstacleEntities[i]);
      if (b?.id) obstacleBodyIds[b.id] = true;
    }

    const engine = global._RNTGE_?.physics?.engine;
    const pairs = engine?.pairs?.list ?? [];

    entities.forEach((swimmerEntity) => {
      const swimmerComponent = components[SwimmerComponentName].get(swimmerEntity) as
        | SwimmerComponentData
        | undefined;
      const matterBody = components[MatterBodyComponentName].get(swimmerEntity);

      if (!swimmerComponent || !matterBody) {
        return;
      }

      // Check collisions from Matter engine pairs (no custom overlap resolution)
      let isCollidingWithObstacle = false;
      for (let i = 0; i < pairs.length; i++) {
        const pair = pairs[i];
        const a = pair.bodyA;
        const b = pair.bodyB;
        if (a === matterBody && obstacleBodyIds[b.id]) {
          isCollidingWithObstacle = true;
          break;
        }
        if (b === matterBody && obstacleBodyIds[a.id]) {
          isCollidingWithObstacle = true;
          break;
        }
      }

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
      const swimmerCenterY = matterBody.position.y;
      const depth = swimmerCenterY - containerData.waterSurfaceY; // > 0 => underwater
      let buoyancySpeed = 0; // magnitude in px/s (sign encoded separately)

      const obstacleWidthForBuoyancy = getObstacleWidth(containerData.width);
      const rawRowsForBuoyancy = getRows(
        containerData.height,
        obstacleWidthForBuoyancy
      );
      const rowsForBuoyancy = rawRowsForBuoyancy > 0 ? rawRowsForBuoyancy : 1;
      const rowHeightForBuoyancy = containerData.height / rowsForBuoyancy;
      const swimmerWidthForBuoyancy =
        obstacleWidthForBuoyancy * SWIMMER_WIDTH_COLUMN_RATIO;
      const swimmerHeightForBuoyancy = Math.min(
        swimmerWidthForBuoyancy * SWIMMER_HEIGHT_TO_WIDTH_RATIO,
        rowHeightForBuoyancy * 0.9
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

      // Detect whether there is an obstacle acting as a "ceiling" directly above
      // the swimmer in its current column. This prevents buoyancy from pushing
      // the swimmer upward through blocks even if collision pairs momentarily
      // report no active contact (e.g. due to tunneling or jitter).
      const obstacleWidth = getObstacleWidth(containerData.width);
      const rawRowsForBlockCheck = getRows(containerData.height, obstacleWidth);
      const rowsForBlockCheck = rawRowsForBlockCheck > 0 ? rawRowsForBlockCheck : 1;
      const rowHeightForBlockCheck = containerData.height / rowsForBlockCheck;
      const swimmerWidthForBlockCheck =
        obstacleWidth * SWIMMER_WIDTH_COLUMN_RATIO;
      const swimmerHeightForBlockCheck = Math.min(
        swimmerWidthForBlockCheck * SWIMMER_HEIGHT_TO_WIDTH_RATIO,
        rowHeightForBlockCheck * 0.9
      );
      const swimmerHalfHeight = swimmerHeightForBlockCheck / 2;
      const swimmerHalfWidth = swimmerWidthForBlockCheck / 2;
      const obstacleHalfSize = obstacleWidth / 2;
      let isBlockedFromAbove = false;

      for (let i = 0; i < obstacleEntities.length; i++) {
        const obBody = components[MatterBodyComponentName].get(
          obstacleEntities[i]
        );
        if (!obBody?.position) continue;

        const dx = Math.abs(obBody.position.x - matterBody.position.x);
        if (dx > obstacleHalfSize + swimmerHalfWidth) {
          // Not overlapping horizontally; this obstacle is in another "column"
          continue;
        }

        const obstacleCenterY = obBody.position.y;
        const obstacleBottomY = obstacleCenterY + obstacleHalfSize;
        const swimmerTopY = swimmerCenterY - swimmerHalfHeight;

        // Swimmer center is below obstacle center and its top is at or touching
        // the obstacle bottom -> effectively pinned under this obstacle.
        if (swimmerCenterY > obstacleCenterY && swimmerTopY <= obstacleBottomY) {
          isBlockedFromAbove = true;
          break;
        }
      }

      let swimmerVelocityX = swimmerComponent.velocityX ?? 0;
      const currentInputX = swimmerComponent.inputX ?? 0;
      let nextInputX = currentInputX;

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
          const distanceScale = 1 - 0.4 * normalizedSpeed; // 1.0 .. 0.6
          const desiredDistance = columnWidth * distanceScale;

          const tapImpulse = currentInputX * desiredDistance * k; // pixels/second
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
        swimmerVelocityX *= dragFactor;

        const waterXVelocityBase = normalizedSpeed * 1.1
        const forceDirection = waterData.forceDirection ?? 0
        swimmerVelocityX += forceDirection * waterXVelocityBase
      } else {
        // --- PAN-BASED CONTROL ---
        // Apply simple drag that grows with water speed (more water speed -> more drag).
        const baseDrag = 0.9;
        const extraDrag = 0.15 * normalizedSpeed; // up to +0.15 extra drag at max speed
        const drag = Math.max(0, Math.min(1, baseDrag - extraDrag));
        swimmerVelocityX *= drag;
      }

      // Clamp horizontal speed.
      if (swimmerVelocityX > MAX_HORIZONTAL_SPEED) {
        swimmerVelocityX = MAX_HORIZONTAL_SPEED;
      } else if (swimmerVelocityX < -MAX_HORIZONTAL_SPEED) {
        swimmerVelocityX = -MAX_HORIZONTAL_SPEED;
      }

      // When pinned against/under an obstacle, horizontal movement is heavily damped.
      if (isCollidingWithObstacle) {
        swimmerVelocityX *= PINNED_VELOCITY_DAMPING;
      }

      const newX = matterBody.position.x + swimmerVelocityX * deltaSeconds;
      const minX =
        swimmerComponent.containerCenterX -
        swimmerComponent.containerWidth / 2 +
        swimmerWidthForBlockCheck / 2;
      const maxX =
        swimmerComponent.containerCenterX +
        swimmerComponent.containerWidth / 2 -
        swimmerWidthForBlockCheck / 2;
      const constrainedX = Math.max(minX, Math.min(maxX, newX));

      // --- Integrate vertical position manually (arcade-style) ---
      // We no longer rely on Matter's vertical velocity for buoyancy, to avoid
      // one-frame surges that can tunnel through obstacles. Instead, we move Y
      // explicitly by at most buoyancySpeed * dt, and freeze Y when blocked.
      let targetY = matterBody.position.y;
      const dtSeconds = deltaSeconds;

      if (depth > 0) {
        // Underwater: try to move up toward the surface, unless blocked from above.
        if (!isBlockedFromAbove && !isCollidingWithObstacle) {
          const maxRise = buoyancySpeed * dtSeconds;
          targetY -= maxRise; // negative direction = up
        }
        // If blockedFromAbove or colliding, we keep Y as-is and let collisions resolve.
      } else if (depth < 0 && buoyancySpeed > 0) {
        // Above surface: gently settle back down toward water.
        const maxFall = buoyancySpeed * dtSeconds;
        targetY += maxFall; // positive direction = down
      }

      if (typeof global.MatterReanimated !== 'undefined') {
        global.MatterReanimated.Body.setPosition(matterBody, {
          x: constrainedX,
          y: targetY,
        });
        // Visual tilt based on horizontal velocity (up to 45 degrees),
        // reaching max tilt already at 50% of MAX_HORIZONTAL_SPEED.
        const maxTiltRadians = (60 * Math.PI) / 180;
        const fullTiltSpeed = MAX_HORIZONTAL_SPEED * 0.5;
        const tiltNormalized = Math.max(
          -1,
          Math.min(1, swimmerVelocityX / fullTiltSpeed)
        );
        const tilt = tiltNormalized * maxTiltRadians;
        if (global.MatterReanimated.Body.setAngle) {
          global.MatterReanimated.Body.setAngle(matterBody, tilt);
        }
        // Keep Matter's own velocities neutral so all motion is driven by this system.
        if (global.MatterReanimated.Body.setVelocity) {
          global.MatterReanimated.Body.setVelocity(matterBody, {
            x: 0,
            y: 0,
          });
        }
        if (global.MatterReanimated.Body.setAngularVelocity) {
          global.MatterReanimated.Body.setAngularVelocity(matterBody, 0);
        }
      }

      ecs.updateComponent<SwimmerComponentData>(
        swimmerEntity,
        SwimmerComponentName,
        (swimmer) => {
          'worklet';
          swimmer.velocityX = swimmerVelocityX;
          swimmer.waterSurfaceY = containerData.waterSurfaceY;
          swimmer.isCollidingWithObstacle = isCollidingWithObstacle;
          swimmer.isInInitialPhase = swimmerComponent.isInInitialPhase;
          swimmer.column = swimmerComponent.column;
          swimmer.useColumnControl = swimmerComponent.useColumnControl;
          swimmer.bobbingPhase = bobbingPhase;
          swimmer.inputX = nextInputX;
          const fullTiltSpeedForComponent = MAX_HORIZONTAL_SPEED * 0.5;
          const tiltNormalizedForComponent = Math.max(
            -1,
            Math.min(1, swimmerVelocityX / fullTiltSpeedForComponent)
          );
          swimmer.angle =
            tiltNormalizedForComponent * ((45 * Math.PI) / 180);
        }
      );
    });
  }
}
