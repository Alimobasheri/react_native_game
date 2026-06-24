import {
  buildSwimmerSkinRenderLayers,
  getAccessoryMeshSize,
  getSwimmerSkin,
  GOGGLED_SKIN,
  GOGGLED_SKIN_ID,
} from '../swimmerSkins';
import { SWIMMER_CHARACTER_IMAGE } from '@/assets/swimmerCharacters';
import { GIGGLE_CRYSTAL_PROFILE_ID } from '../characterProfiles';

describe('swimmerSkins', () => {
  it('resolves the goggled skin by id', () => {
    expect(getSwimmerSkin(GOGGLED_SKIN_ID)).toBe(GOGGLED_SKIN);
    expect(getSwimmerSkin('unknown')).toBe(GOGGLED_SKIN);
  });

  it('maps goggled skin to giggle_crystal locomotion profile', () => {
    expect(GOGGLED_SKIN.profileId).toBe(GIGGLE_CRYSTAL_PROFILE_ID);
  });

  it('builds body and accessory render layers from skin art keys', () => {
    const layers = buildSwimmerSkinRenderLayers(GOGGLED_SKIN, 48, 120);

    expect(layers).toHaveLength(2);
    expect(layers[0].image).toBe(SWIMMER_CHARACTER_IMAGE.floaterGoggledBody);
    expect(layers[1].image).toBe(SWIMMER_CHARACTER_IMAGE.floaterGoggledGoggles);
    expect(layers[0].shape).toMatchObject({ width: 48, height: 120 });
    expect(layers[1].position?.y).toBeLessThan(0);

    const accessorySize = getAccessoryMeshSize(GOGGLED_SKIN, 48, 120);
    expect(layers[1].shape).toMatchObject(accessorySize);
  });
});
