import AsyncStorage from '@react-native-async-storage/async-storage';

const BEST_SCORE_KEY = '@swimmer/bestScore';

export async function loadBestScore(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(BEST_SCORE_KEY);
    if (raw == null) return 0;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  } catch {
    return 0;
  }
}

export async function saveBestScoreIfHigher(score: number): Promise<number> {
  const normalized = Math.max(0, Math.floor(score));
  try {
    const current = await loadBestScore();
    if (normalized <= current) return current;
    await AsyncStorage.setItem(BEST_SCORE_KEY, String(normalized));
    return normalized;
  } catch {
    return normalized;
  }
}
