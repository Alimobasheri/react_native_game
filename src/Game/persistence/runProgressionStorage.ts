import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_SCORE_KEY = '@swimmer/bestScore';
const LIFETIME_RUN_COUNT_KEY = '@swimmer/lifetimeRunCount';

export type RunProgressionPersistedStats = {
  bestScore: number;
  lifetimeRunCount: number;
};

export async function loadRunProgressionStats(): Promise<RunProgressionPersistedStats> {
  try {
    const [bestRaw, runsRaw] = await Promise.all([
      AsyncStorage.getItem(BEST_SCORE_KEY),
      AsyncStorage.getItem(LIFETIME_RUN_COUNT_KEY),
    ]);
    let bestScore = 0;
    if (bestRaw != null) {
      const parsed = Number.parseInt(bestRaw, 10);
      bestScore = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    let lifetimeRunCount = 0;
    if (runsRaw != null) {
      const parsed = Number.parseInt(runsRaw, 10);
      lifetimeRunCount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
    }
    return { bestScore, lifetimeRunCount };
  } catch {
    return { bestScore: 0, lifetimeRunCount: 0 };
  }
}

/** @deprecated Prefer loadRunProgressionStats — kept for callers outside Phase 5. */
export async function loadBestScore(): Promise<number> {
  const stats = await loadRunProgressionStats();
  return stats.bestScore;
}

export async function persistRunFinishedRun(args: {
  finalScore: number;
  isNewBest: boolean;
}): Promise<RunProgressionPersistedStats> {
  const finalScore = Math.max(0, Math.floor(args.finalScore));
  try {
    const current = await loadRunProgressionStats();
    const lifetimeRunCount = current.lifetimeRunCount + 1;
    const bestScore =
      args.isNewBest && finalScore > current.bestScore ? finalScore : current.bestScore;
    await Promise.all([
      AsyncStorage.setItem(LIFETIME_RUN_COUNT_KEY, String(lifetimeRunCount)),
      args.isNewBest && finalScore > current.bestScore
        ? AsyncStorage.setItem(BEST_SCORE_KEY, String(bestScore))
        : Promise.resolve(),
    ]);
    return { bestScore, lifetimeRunCount };
  } catch {
    return {
      bestScore: args.isNewBest ? finalScore : 0,
      lifetimeRunCount: 1,
    };
  }
}

export async function saveBestScoreIfHigher(score: number): Promise<number> {
  const normalized = Math.max(0, Math.floor(score));
  try {
    const current = await loadRunProgressionStats();
    if (normalized <= current.bestScore) return current.bestScore;
    await AsyncStorage.setItem(BEST_SCORE_KEY, String(normalized));
    return normalized;
  } catch {
    return normalized;
  }
}
