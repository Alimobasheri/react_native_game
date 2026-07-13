import { MovementState } from '@/Game/characters/characterMovementStates';
import { computeBobbingAndBuoyancy } from '@/Game/swimmerPhysics/propose/bobbingBuoyancy';
import { applyWaterAdvection } from '@/Game/swimmerPhysics/propose/waterAdvection';
import type {
  HorizontalLocomotionStep,
  SwimmerFrameContext,
  SwimmerSnapshot,
} from '@/Game/swimmerPhysics/types';
import type { SwimmerComponentData } from '@/Game/ecs-components/Swimmer';
import type { ContainerComponentData } from '@/Game/ecs-components/Container';
import type { WaterComponentData } from '@/Game/ecs-components/Water';
import { buildProfileFromContainerGeometry } from '@/Game/water/buildWaterSurfaceProfileParams';

function makeLocomotion() {
  return {
    profileId: 'default',
    movementState: MovementState.IDLE,
    currentTier: 1 as const,
    comboTimer: 0,
    pivotLockoutTimer: 0,
    currentAngleDeg: 0,
    targetAngleDeg: 0,
    facingDirection: 1 as const,
  };
}

function makeFrame(overrides?: Partial<SwimmerFrameContext>): SwimmerFrameContext {
  const container: ContainerComponentData = {
    centerX: 200,
    centerY: 400,
    width: 360,
    height: 600,
    waterSurfaceY: 300,
    waterRiseSpeed: 120,
  };
  const water: WaterComponentData = {
    baseSpeed: 120,
    raisingSpeed: 120,
    containerEntityId: 1,
  };
  return {
    ecs: { updateComponent: () => {} } as never,
    components: {},
    deltaSeconds: 1 / 60,
    startReady: false,
    session: undefined,
    containerEntity: 1,
    container,
    containerTop: container.centerY - container.height / 2,
    containerBottom: container.centerY + container.height / 2,
    waterEntity: 2,
    water,
    waterSurfaceRestY: 250,
    waterLevelNorm: 0.5,
    profileBase: buildProfileFromContainerGeometry(water, container, {}),
    obstacleWidth: 40,
    blockDimensions: { width: 40, height: 40 },
    blockHeight: 40,
    rowHeight: 40,
    obstacleRowStore: { get: () => undefined, forEach: () => {} } as never,
    entities: [10],
    isInInitialPhase: false,
    ...overrides,
  };
}

function makeSwimmer(overrides?: Partial<SwimmerComponentData>): SwimmerSnapshot {
  const component: SwimmerComponentData = {
    x: 200,
    y: 320,
    velocityX: 0,
    locomotion: makeLocomotion(),
    waterSurfaceY: 300,
    containerWidth: 360,
    containerCenterX: 200,
    containerCenterY: 400,
    isInInitialPhase: false,
    isCollidingWithObstacle: false,
    fallingVelocityY: 0,
    column: 4,
    useColumnControl: true,
    bobbingPhase: 0,
    ...overrides,
  };
  return {
    entity: 10,
    component,
    centerX: component.x,
    centerY: component.y,
    wasPinnedFromAbove: component.isPinnedFromAbove === true,
    normalizedSpeed: 1,
    waterSpeed: 120,
  };
}

describe('swimmerPhysics frame pipeline', () => {
  it('bobbing advances phase each frame', () => {
    const frame = makeFrame({ startReady: true });
    const swimmer = makeSwimmer();
    const step = computeBobbingAndBuoyancy(frame, swimmer);
    expect(step.bobbingPhase).toBeGreaterThan(0);
    expect(step.bobbingOffsetY).toBeDefined();
  });

  it('water advection moves velocity toward current target', () => {
    const swimmer = makeSwimmer();
    const horizontal: HorizontalLocomotionStep = {
      velocityX: 0,
      locomotion: makeLocomotion(),
      kinematicsAngleRad: 0,
      tapImpulseAppliedThisFrame: false,
      tapDirectionThisFrame: 0,
      waterCurrentVelocityX: 200,
      pinnedMomentumCoast: false,
      preDragVelocityX: 0,
    };
    const advected = applyWaterAdvection(swimmer, horizontal, 1 / 60);
    expect(advected.velocityX).toBeGreaterThan(0);
    expect(advected.velocityX).toBeLessThan(200);
  });

  it('pinned swimmer skips water advection bleed when tap fires', () => {
    const swimmer = makeSwimmer({ isPinnedFromAbove: true, velocityX: 100 });
    const horizontal: HorizontalLocomotionStep = {
      velocityX: 100,
      locomotion: makeLocomotion(),
      kinematicsAngleRad: 0,
      tapImpulseAppliedThisFrame: true,
      tapDirectionThisFrame: 1,
      waterCurrentVelocityX: 0,
      pinnedMomentumCoast: false,
      preDragVelocityX: 0,
    };
    const advected = applyWaterAdvection(swimmer, horizontal, 1 / 60);
    expect(advected.velocityX).toBeGreaterThan(50);
  });

  it('pinned swimmer bleeds less velocityX at high body lean', () => {
    const swimmer = makeSwimmer({ isPinnedFromAbove: true, velocityX: 100 });
    const flatLocomotion = makeLocomotion();
    const stretchedLocomotion = {
      ...makeLocomotion(),
      visualAngleDeg: 90,
      currentAngleDeg: 90,
    };
    const flat = applyWaterAdvection(
      swimmer,
      {
        velocityX: 100,
        locomotion: flatLocomotion,
        kinematicsAngleRad: 0,
        tapImpulseAppliedThisFrame: false,
        tapDirectionThisFrame: 0,
        waterCurrentVelocityX: 0,
        pinnedMomentumCoast: false,
      preDragVelocityX: 0,
      },
      1 / 60
    );
    const stretched = applyWaterAdvection(
      swimmer,
      {
        velocityX: 100,
        locomotion: stretchedLocomotion,
        kinematicsAngleRad: Math.PI / 2,
        tapImpulseAppliedThisFrame: false,
        tapDirectionThisFrame: 0,
        waterCurrentVelocityX: 0,
        pinnedMomentumCoast: true,
        preDragVelocityX: 100,
      },
      1 / 60
    );
    expect(stretched.velocityX).toBeGreaterThan(flat.velocityX);
    expect(flat.velocityX).toBeCloseTo(70, 1);
    expect(stretched.velocityX).toBeCloseTo(93, 0);
  });
});
