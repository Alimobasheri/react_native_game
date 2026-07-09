import type { WaterComponentData } from '@/Game/ecs-components/Water';
import type { ContainerComponentData } from '@/Game/ecs-components/Container';
import {
  buildProfileFromContainerGeometry,
  buildProfileFromShaderUniforms,
} from '@/Game/water/buildWaterSurfaceProfileParams';

const baseWater = (): WaterComponentData => ({
  raisingSpeed: 120,
  baseSpeed: 120,
  containerEntityId: 1,
  currentGapStartNorm: 0.2,
  currentGapEndNorm: 0.8,
  gapBlend: 1,
  flowVelocity: 0.5,
});

const baseContainer = (): ContainerComponentData => ({
  centerX: 200,
  centerY: 400,
  width: 300,
  height: 600,
  waterSurfaceY: 250,
  waterRiseSpeed: 120,
});

const baseUniforms = {
  waterLevel: 0.42,
  iTime: 1.5,
  frequency: 3.4,
  speed: 0.02,
  amplitude: 0.0035,
  uVisualIntensity: 1,
  uHybridGapMaskStrength: 0.9,
  uFlowVelocity: 0,
  uSurgeEnergy: 0,
  uSurfaceBandCenterY: 0.3,
  uSurfaceBandHalfHeight: 0.04,
};

describe('buildWaterSurfaceProfileParams', () => {
  it('shader builder uses uniform waterLevel', () => {
    const profile = buildProfileFromShaderUniforms(baseWater(), baseUniforms);
    expect(profile.waterLevel).toBe(0.42);
    expect(profile.gapCurrent).toEqual([0.2, 0.8]);
    expect(profile.iTime).toBe(1.5);
  });

  it('container builder derives waterLevel from geometry', () => {
    const container = baseContainer();
    const profile = buildProfileFromContainerGeometry(
      baseWater(),
      container,
      baseUniforms
    );
    const containerTop = container.centerY - container.height / 2;
    const expected = Math.max(
      0,
      Math.min(
        1,
        1 - (container.waterSurfaceY - containerTop) / container.height
      )
    );
    expect(profile.waterLevel).toBeCloseTo(expected, 5);
    expect(profile.gapCurrent).toEqual([0.2, 0.8]);
    expect(profile.surfaceBandCenterY).toBe(expected);
  });

  it('shared gap fields match between builders', () => {
    const water = baseWater();
    const shaderProfile = buildProfileFromShaderUniforms(water, baseUniforms);
    const physicsProfile = buildProfileFromContainerGeometry(
      water,
      baseContainer(),
      baseUniforms
    );
    expect(physicsProfile.gapCurr01).toEqual(shaderProfile.gapCurr01);
    expect(physicsProfile.flowVelocity).toBe(shaderProfile.flowVelocity);
    expect(physicsProfile.hybridGapMaskStrength).toBe(
      shaderProfile.hybridGapMaskStrength
    );
  });
});
