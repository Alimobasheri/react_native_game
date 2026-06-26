import { BlendMode } from '@shopify/react-native-skia';
import {
  AQUA_SPROUT_SKIN,
  AQUA_SPROUT_SKIN_ID,
  buildSwimmerSkinRenderLayers,
  getAccessoryMeshSize,
  getCrestRestPosition,
  getFeatureMeshSize,
  getFeatureRestOffsetY,
  getPinnedCrestRestOffsetY,
  getPinnedCrestRestPosition,
  getSwimmerAccessoryLayerIndex,
  getSwimmerInternalLayerIndex,
  getSwimmerSkin,
  GOGGLED_SKIN,
  GOGGLED_SKIN_ID,
  KELP_DRIFTER_SKIN,
  KELP_DRIFTER_SKIN_ID,
} from '../swimmerSkins';
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

  it('builds body and accessory render layers from goggled skin art keys', () => {
    const layers = buildSwimmerSkinRenderLayers(GOGGLED_SKIN, 48, 120);

    expect(layers).toHaveLength(2);
    expect(layers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.floaterGoggledBody);
    expect(layers[1].image).toBe(SWIMMER_CHARACTER_IMAGE.floaterGoggledGoggles);
    expect(layers[0].shape).toMatchObject({ width: 48, height: 120 });
    expect(layers[1].position?.y).toBeLessThan(0);

    const accessorySize = getAccessoryMeshSize(GOGGLED_SKIN, 48, 120);
    expect(layers[1].shape).toMatchObject(accessorySize);
    expect(getSwimmerAccessoryLayerIndex(GOGGLED_SKIN)).toBe(1);
  });

  it('builds body, eyes, and hair crest layers from aqua-sprout skin art keys', () => {
    const layers = buildSwimmerSkinRenderLayers(AQUA_SPROUT_SKIN, 48, 120);

    expect(layers).toHaveLength(4);
    expect(layers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutBody);
    expect(layers[1].fillColor).toBe('#c8fbff');
    expect(layers[1].blendMode).toBe(BlendMode.Screen);
    expect(layers[1].clipToGroupBounds).toBe(true);
    expect(layers[2].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutEyes);
    expect(layers[3].image).toBe(SWIMMER_CHARACTER_IMAGE.aquaSproutHair);
    expect(layers[0].shape).toMatchObject({ width: 48, height: 120 });

    const featureSize = getFeatureMeshSize(AQUA_SPROUT_SKIN.feature!, 48);
    expect(layers[2].shape).toMatchObject(featureSize);
    expect(layers[2].position?.y).toBe(
      getFeatureRestOffsetY(AQUA_SPROUT_SKIN.feature!, 120)
    );
    expect(layers[2].position?.y).toBeLessThan(0);

    const accessorySize = getAccessoryMeshSize(AQUA_SPROUT_SKIN, 48, 120);
    expect(layers[3].shape).toMatchObject(accessorySize);
    expect(layers[3].position?.y).toBeLessThan(layers[2].position!.y!);
    expect(getSwimmerInternalLayerIndex(AQUA_SPROUT_SKIN)).toBe(1);
    expect(getSwimmerAccessoryLayerIndex(AQUA_SPROUT_SKIN)).toBe(3);
  });

  it('builds body, eyes, and crest layers for kelp-drifter skin', () => {
    const layers = buildSwimmerSkinRenderLayers(KELP_DRIFTER_SKIN, 48, 120);

    expect(layers).toHaveLength(3);
    expect(layers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.kelpDrifterBody);
    expect(layers[1].image).toBe(SWIMMER_CHARACTER_IMAGE.kelpDrifterEyes);
    expect(layers[2].image).toBe(SWIMMER_CHARACTER_IMAGE.kelpDrifterHair);
    expect(layers[2].position?.x).toBeGreaterThan(0);
    expect(getSwimmerInternalLayerIndex(KELP_DRIFTER_SKIN)).toBeNull();
    expect(getSwimmerAccessoryLayerIndex(KELP_DRIFTER_SKIN)).toBe(2);
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

  it('aligns pinned crest bottom to squashed body top', () => {
    const meshHeight = 120;
    const bodyScaleY = 0.8;
    const crestHeight = 40;
    const restY = getPinnedCrestRestOffsetY(meshHeight, bodyScaleY, crestHeight);
    const bodyTopY = -(meshHeight * bodyScaleY) / 2;
    const crestBottomY = restY + crestHeight / 2;
    expect(crestBottomY).toBeCloseTo(bodyTopY, 5);
  });
});
