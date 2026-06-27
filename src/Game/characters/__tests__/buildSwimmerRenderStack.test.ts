import { RenderPolicy } from '@/containers/ReactNativeSkiaGameEngine/internal/components/render';
import { buildSwimmerRenderStack } from '../buildSwimmerRenderStack';
import {
  AQUA_SPROUT_SKIN,
  GOGGLED_SKIN,
  KELP_DRIFTER_SKIN,
} from '../swimmerSkins';
import { SWIMMER_CHARACTER_IMAGE } from '@/assets/swimmerCharacters';

describe('buildSwimmerRenderStack', () => {
  it('builds composite shader with body child and overlay layers without fillColor', () => {
    const stack = buildSwimmerRenderStack(AQUA_SPROUT_SKIN, 48, 120, {
      uPhase: 0,
      uIntensity: 0.2,
      uDebugMode: 0,
      uMeshSize: [48, 120],
      uMotionKind: 0,
    });

    expect(stack.renderPolicy).toBe(RenderPolicy.AnimatedComposite);
    expect(stack.compositeShader.key).toBe('swimmerInternal');
    expect(stack.compositeShader.childImages).toEqual([
      { imageKey: SWIMMER_CHARACTER_IMAGE.aquaSproutBody },
      { imageKey: SWIMMER_CHARACTER_IMAGE.aquaSproutBody },
    ]);
    expect(stack.renderLayers).toHaveLength(2);
    expect(stack.renderLayers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutEyes);
    expect(stack.renderLayers[1].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutHair);
    expect(stack.renderLayers.every((layer) => layer.fillColor == null)).toBe(true);
  });

  it('builds goggles-only overlay for goggled skin', () => {
    const stack = buildSwimmerRenderStack(GOGGLED_SKIN, 48, 120, {
      uIntensity: 0,
    });

    expect(stack.renderLayers).toHaveLength(1);
    expect(stack.renderLayers[0].image).toBe(
      SWIMMER_CHARACTER_IMAGE.floaterGoggledGoggles
    );
    expect(stack.compositeShader.childImages[0].imageKey).toBe(
      SWIMMER_CHARACTER_IMAGE.floaterGoggledBody
    );
    expect(stack.compositeShader.childImages[1].imageKey).toBe(
      SWIMMER_CHARACTER_IMAGE.floaterGoggledBody
    );
  });

  it('builds kelp composite with separate internal strand child image', () => {
    const stack = buildSwimmerRenderStack(KELP_DRIFTER_SKIN, 48, 120, {
      uMotionKind: 1,
    });

    expect(stack.compositeShader.childImages).toEqual([
      { imageKey: SWIMMER_CHARACTER_IMAGE.kelpDrifterBody },
      { imageKey: SWIMMER_CHARACTER_IMAGE.kelpDrifterInternal },
    ]);
  });
});
