import { RenderPolicy } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { buildSwimmerRenderStack } from '../buildSwimmerRenderStack';
import {
  AQUA_SPROUT_SKIN,
  GOGGLED_SKIN,
  KELP_DRIFTER_SKIN,
} from '../swimmerSkins';
import { SWIMMER_CHARACTER_IMAGE } from '@/assets/swimmerCharacters';
import {
  KELP_SWAY_EFFECT_SHADER_KEY,
  RIPPLE_EFFECT_SHADER_KEY,
} from '@/Shaders/SwimmerInternal';

describe('buildSwimmerRenderStack', () => {
  it('builds ripple composite shader with body-only child and overlay layers', () => {
    const stack = buildSwimmerRenderStack(AQUA_SPROUT_SKIN, 48, 120, {
      uPhase: 0,
      uIntensity: 0.2,
      uDebugMode: 0,
      uMeshSize: [48, 120],
    });

    expect(stack.renderPolicy).toBe(RenderPolicy.AnimatedComposite);
    expect(stack.compositeShader?.key).toBe(RIPPLE_EFFECT_SHADER_KEY);
    expect(stack.compositeShader?.childImages).toEqual([
      { imageKey: SWIMMER_CHARACTER_IMAGE.aquaSproutBody },
    ]);
    expect(stack.bodyImageKey).toBeUndefined();
    expect(stack.renderLayers).toHaveLength(2);
    expect(stack.renderLayers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutEyes);
    expect(stack.renderLayers[1].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutHair);
    expect(stack.renderLayers.every((layer) => layer.fillColor == null)).toBe(true);
  });

  it('builds body-only stack for legacy goggled skin without internal shader', () => {
    const stack = buildSwimmerRenderStack(GOGGLED_SKIN, 48, 120, {});

    expect(stack.compositeShader).toBeUndefined();
    expect(stack.bodyImageKey).toBe(SWIMMER_CHARACTER_IMAGE.floaterGoggledBody);
    expect(stack.renderPolicy).toBe(RenderPolicy.LiveGroup);
    expect(stack.renderLayers).toHaveLength(1);
    expect(stack.renderLayers[0].image).toBe(
      SWIMMER_CHARACTER_IMAGE.floaterGoggledGoggles
    );
  });

  it('builds kelp composite with separate internal strand child image', () => {
    const stack = buildSwimmerRenderStack(KELP_DRIFTER_SKIN, 48, 120, {});

    expect(stack.compositeShader?.key).toBe(KELP_SWAY_EFFECT_SHADER_KEY);
    expect(stack.compositeShader?.childImages).toEqual([
      { imageKey: SWIMMER_CHARACTER_IMAGE.kelpDrifterBody },
      { imageKey: SWIMMER_CHARACTER_IMAGE.kelpDrifterInternal },
    ]);
  });
});
