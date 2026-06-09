import { validateSeam } from '@/Game/path/pacingDirector';
import {
  RELEASE_REST_ZONE_ROWS,
  releaseCatharticRestZoneGaps,
  releaseCatharticRestZoneRow,
  releaseRestZoneInteriorWidth,
  releaseRestZoneRowIsValid,
} from '@/Game/path/releaseGenerators';
import { rowFromGaps } from '@/Game/path/swimmerGrid';

const COLS = 15;

describe('releaseCatharticRestZoneGaps', () => {
  it('exposes exactly interior columns 1..13 for 15-wide grid', () => {
    const gaps = releaseCatharticRestZoneGaps(COLS);
    expect(gaps.length).toBe(13);
    expect(gaps[0]).toBe(1);
    expect(gaps[12]).toBe(13);
    expect(releaseRestZoneInteriorWidth(COLS)).toBe(13);
  });

  it('produces valid layout rows for 10 consecutive strip rows', () => {
    let prev = rowFromGaps([7], COLS);
    for (let i = 0; i < RELEASE_REST_ZONE_ROWS; i++) {
      const row = releaseCatharticRestZoneRow(COLS);
      expect(releaseRestZoneRowIsValid(row, COLS)).toBe(true);
      expect(validateSeam(prev, row)).toBe(true);
      const gaps = releaseCatharticRestZoneGaps(COLS);
      expect(gaps.length).toBe(releaseRestZoneInteriorWidth(COLS));
      expect(new Set(gaps).size).toBe(gaps.length);
      prev = row;
    }
  });
});

describe('RELEASE strip stress', () => {
  it('keeps 13-wide interior with no injected interior solids across 1000 virtual rows', () => {
    for (let k = 0; k < 1000; k++) {
      const row = releaseCatharticRestZoneRow(COLS);
      expect(releaseRestZoneRowIsValid(row, COLS)).toBe(true);
    }
  });
});
