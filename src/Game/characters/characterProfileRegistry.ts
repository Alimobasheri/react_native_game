import type { ICharacterProfile } from './characterProfileTypes';
import {
  GIGGLE_CRYSTAL_PROFILE,
  GIGGLE_CRYSTAL_PROFILE_ID,
} from './characterProfiles';

const characterProfilesById: Record<string, ICharacterProfile> = {
  [GIGGLE_CRYSTAL_PROFILE_ID]: GIGGLE_CRYSTAL_PROFILE,
};

export const registerCharacterProfile = (profile: ICharacterProfile): void => {
  characterProfilesById[profile.id] = profile;
};

export const hasCharacterProfile = (profileId: string): boolean => {
  'worklet';
  if (profileId === GIGGLE_CRYSTAL_PROFILE_ID) {
    return true;
  }
  const profile = characterProfilesById[profileId];
  return profile != null;
};

export const getCharacterProfile = (profileId: string): ICharacterProfile => {
  'worklet';
  if (profileId === GIGGLE_CRYSTAL_PROFILE_ID) {
    return GIGGLE_CRYSTAL_PROFILE;
  }

  const profile = characterProfilesById[profileId];
  if (profile != null) {
    return profile;
  }

  return GIGGLE_CRYSTAL_PROFILE;
};
