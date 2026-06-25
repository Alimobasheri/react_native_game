import {
  AQUA_SPROUT_SKIN,
  AQUA_SPROUT_SKIN_ID,
  buildSwimmerSkinRenderLayers,
  getAccessoryMeshSize,
  getFeatureMeshSize,
  getFeatureRestOffsetY,
  getPinnedCrestRestOffsetY,
  getSwimmerAccessoryLayerIndex,
  getSwimmerInternalLayerIndex,
  getSwimmerSkin,
  GOGGLED_SKIN,
  GOGGLED_SKIN_ID,
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
    expect(layers[1].fillColor).toBe('#8fe8f5');
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
