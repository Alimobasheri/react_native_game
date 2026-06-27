import type { SwimmerInternalMotionType } from '@/Game/characters/swimmerSkins';
import type { InternalMotionProfileId } from './swimmerLifeTypes';

export const resolveInternalMotionProfile = (
  internalMotion?: SwimmerInternalMotionType
): InternalMotionProfileId => {
  'worklet';
  if (internalMotion === 'kelpSway') return 'kelpSway';
  if (internalMotion === 'ripple') return 'ripple';
  return 'none';
};
