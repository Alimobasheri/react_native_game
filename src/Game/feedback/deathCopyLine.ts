import {
  deathCopyTuning,
  DEATH_SUFFIX_BY_GENERATOR,
} from '@/config/deathCopy';
import type { DeathContext } from '@/Game/path/runBlueprint';

export const formatDeathLine = (
  ctx: DeathContext | undefined,
  showSuffix?: boolean
): string => {
  'worklet';
  showSuffix = showSuffix ?? deathCopyTuning.SHOW_GENERATOR_SUFFIX;
  if (!ctx) {
    return deathCopyTuning.FALLBACK;
  }

  const cause = deathCopyTuning.CAUSE_PINNED;

  if (!showSuffix) {
    return cause;
  }

  const suffix = DEATH_SUFFIX_BY_GENERATOR[ctx.generator];
  if (!suffix) {
    return cause;
  }

  return `${cause}${deathCopyTuning.SUFFIX_SEPARATOR}${suffix}`;
};
