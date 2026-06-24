import {
  getCharacterProfile,
  hasCharacterProfile,
} from '../characterProfileRegistry';
import {
  GIGGLE_CRYSTAL_PROFILE,
  GIGGLE_CRYSTAL_PROFILE_ID,
} from '../characterProfiles';

describe('characterProfileRegistry', () => {
  it('resolves the default giggle_crystal profile', () => {
    expect(hasCharacterProfile(GIGGLE_CRYSTAL_PROFILE_ID)).toBe(true);
    expect(getCharacterProfile(GIGGLE_CRYSTAL_PROFILE_ID)).toBe(
      GIGGLE_CRYSTAL_PROFILE
    );
  });

  it('falls back to giggle_crystal for unknown profile ids', () => {
    expect(getCharacterProfile('missing_profile')).toBe(GIGGLE_CRYSTAL_PROFILE);
  });
});
