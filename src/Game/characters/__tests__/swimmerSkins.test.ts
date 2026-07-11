import {
  AQUA_SPROUT_SKIN,
  AQUA_SPROUT_SKIN_ID,
  buildSwimmerSkinRenderLayers,
  getAccessoryMeshSize,
  getCrestRestPosition,
  getFeatureMeshSize,
  getFeatureRestOffsetY,
  getPinnedCrestRestOffsetY,
  getSwimmerAccessoryLayerIndex,
  getSwimmerFeatureLayerIndex,
  getSwimmerInternalLayerIndex,
  getSwimmerSkin,
  GOGGLED_SKIN,
  GOGGLED_SKIN_ID,
  KELP_DRIFTER_SKIN,
  KELP_DRIFTER_SKIN_ID,
} from '../swimmerSkins';
import { buildSwimmerRenderStack } from '../buildSwimmerRenderStack';
import { SWIMMER_CHARACTER_IMAGE } from '@/assets/swimmerCharacters';
import { GIGGLE_CRYSTAL_PROFILE_ID } from '../characterProfiles';

describe('swimmerSkins', () => {
  it('resolves the goggled skin by id', () => {
    expect(getSwimmerSkin(GOGGLED_SKIN_ID)).toBe(GOGGLED_SKIN);
  });

  it('resolves the aqua-sprout skin by id', () => {
    expect(getSwimmerSkin(AQUA_SPROUT_SKIN_ID)).toBe(AQUA_SPROUT_SKIN);
  });

  it('resolves the kelp-drifter skin by id', () => {
    expect(getSwimmerSkin(KELP_DRIFTER_SKIN_ID)).toBe(KELP_DRIFTER_SKIN);
  });

  it('falls back to aqua-sprout for unknown skin ids', () => {
    expect(getSwimmerSkin('unknown')).toBe(AQUA_SPROUT_SKIN);
  });

  it('maps goggled skin to giggle_crystal locomotion profile', () => {
    expect(GOGGLED_SKIN.profileId).toBe(GIGGLE_CRYSTAL_PROFILE_ID);
  });

  it('maps aqua-sprout skin to giggle_crystal locomotion profile', () => {
    expect(AQUA_SPROUT_SKIN.profileId).toBe(GIGGLE_CRYSTAL_PROFILE_ID);
  });

  it('builds legacy overlay layers for goggled skin (no body image layer)', () => {
    const layers = buildSwimmerSkinRenderLayers(GOGGLED_SKIN, 48, 120);

    expect(layers).toHaveLength(1);
    expect(layers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.floaterGoggledGoggles);
    expect(layers[0].position?.y).toBeLessThan(0);

    const accessorySize = getAccessoryMeshSize(GOGGLED_SKIN, 48, 120);
    expect(layers[0].shape).toMatchObject(accessorySize);
    expect(getSwimmerAccessoryLayerIndex(GOGGLED_SKIN)).toBe(0);
  });

  it('builds eyes and hair overlay layers from aqua-sprout skin art keys', () => {
    const stack = buildSwimmerRenderStack(AQUA_SPROUT_SKIN, 48, 120, {});
    const layers = stack.renderLayers;

    expect(layers).toHaveLength(2);
    expect(layers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutEyes);
    expect(layers[1].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutHair);
    expect(stack.compositeShader.childImages[0].imageKey).toBe(
      SWIMMER_CHARACTER_IMAGE.aquaSproutBody
    );

    const featureSize = getFeatureMeshSize(AQUA_SPROUT_SKIN.feature!, 48);
    expect(layers[0].shape).toMatchObject(featureSize);
    expect(layers[0].position?.y).toBe(
      getFeatureRestOffsetY(AQUA_SPROUT_SKIN.feature!, 120)
    );
    expect(layers[0].position?.y).toBeLessThan(0);

    const accessorySize = getAccessoryMeshSize(AQUA_SPROUT_SKIN, 48, 120);
    expect(layers[1].shape).toMatchObject(accessorySize);
    expect(layers[1].position?.y).toBeLessThan(layers[0].position!.y!);
    expect(getSwimmerInternalLayerIndex()).toBeNull();
    expect(getSwimmerFeatureLayerIndex(AQUA_SPROUT_SKIN)).toBe(0);
    expect(getSwimmerAccessoryLayerIndex(AQUA_SPROUT_SKIN)).toBe(1);
  });

  it('builds eyes and crest overlay layers for kelp-drifter skin', () => {
    const stack = buildSwimmerRenderStack(KELP_DRIFTER_SKIN, 48, 120, {});
    const layers = stack.renderLayers;

    expect(layers).toHaveLength(2);
    expect(layers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.kelpDrifterEyes);
    expect(layers[1].image).toBe(SWIMMER_CHARACTER_IMAGE.kelpDrifterHair);
    expect(layers[1].position?.x).toBeGreaterThan(0);
    expect(stack.compositeShader.childImages[1].imageKey).toBe(
      SWIMMER_CHARACTER_IMAGE.kelpDrifterInternal
    );
    expect(getSwimmerFeatureLayerIndex(KELP_DRIFTER_SKIN)).toBe(0);
    expect(getSwimmerAccessoryLayerIndex(KELP_DRIFTER_SKIN)).toBe(1);
  });

  it('uses separate motion pivot for kelp-drifter side-fringe hair', () => {
    expect(KELP_DRIFTER_SKIN.accessoryAnchorXRatio).toBe(0.5);
    expect(KELP_DRIFTER_SKIN.accessoryAnchorYRatio).toBe(1);
    expect(KELP_DRIFTER_SKIN.accessoryMotionAnchorXRatio).toBeCloseTo(0.18, 5);
    expect(KELP_DRIFTER_SKIN.accessoryMotionAnchorYRatio).toBeCloseTo(0.48, 5);
    expect(KELP_DRIFTER_SKIN.internalMotion).toBe('kelpSway');
  });

  it('places kelp-drifter hair at aligner-tuned crest rest position', () => {
    const meshWidth = 48;
    const meshHeight = meshWidth * 1.8;
    const accessorySize = getAccessoryMeshSize(
      KELP_DRIFTER_SKIN,
      meshWidth,
      meshHeight
    );
    const rest = getCrestRestPosition(
      KELP_DRIFTER_SKIN,
      meshWidth,
      meshHeight,
      accessorySize.width,
      accessorySize.height
    );
    const overlayCenterOffsetX = rest.x / meshWidth;
    const overlayCenterOffsetY = rest.y / meshHeight;
    expect(overlayCenterOffsetX).toBeCloseTo(0.209, 3);
    expect(overlayCenterOffsetY).toBeCloseTo(-0.3897, 3);
    expect(KELP_DRIFTER_SKIN.crestAccessoryStyle).toBe('sideFringe');
    expect(accessorySize.width / meshWidth).toBeCloseTo(1.5, 5);
  });

  it('aligns pinned crest bottom to squashed body top (world top = pin contact after ceiling-anchor)', () => {
    const meshHeight = 120;
    const bodyScaleY = 0.8;
    const crestHeight = 40;
    const restY = getPinnedCrestRestOffsetY(meshHeight, bodyScaleY, crestHeight);
    const bodyTopY = -(meshHeight * bodyScaleY) / 2;
    const crestBottomY = restY + crestHeight / 2;
    expect(crestBottomY).toBeCloseTo(bodyTopY, 5);
  });
});
