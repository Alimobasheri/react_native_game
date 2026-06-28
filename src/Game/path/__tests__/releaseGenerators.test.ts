import { validateSeam } from '@/Game/path/pacingDirector';
import {
  RELEASE_REST_ZONE_ROWS,
  releaseCatharticRestZoneGaps,
  releaseCatharticRestZoneRow,
  releaseRestZoneInteriorWidth,
  releaseRestZoneRowIsValid,
} from '@/Game/path/releaseGenerators';
import { rowFromGaps } from '@/Game/path/swimmerGrid';
import { TEST_COLS } from '@/Game/path/__tests__/testGrid';

describe('releaseCatharticRestZoneGaps', () => {
  it('exposes interior columns 1..columnCount-2 on production grid', () => {
    const gaps = releaseCatharticRestZoneGaps(TEST_COLS);
    const width = releaseRestZoneInteriorWidth(TEST_COLS);
    expect(gaps.length).toBe(width);
    expect(gaps[0]).toBe(1);
    expect(gaps[gaps.length - 1]).toBe(TEST_COLS - 2);
    expect(releaseRestZoneInteriorWidth(TEST_COLS)).toBe(TEST_COLS - 2);
  });

  it('produces valid layout rows for 10 consecutive strip rows', () => {
    let prev = rowFromGaps([Math.floor(TEST_COLS / 2)], TEST_COLS);
    for (let i = 0; i < RELEASE_REST_ZONE_ROWS; i++) {
      const row = releaseCatharticRestZoneRow(TEST_COLS);
      expect(releaseRestZoneRowIsValid(row, TEST_COLS)).toBe(true);
      expect(validateSeam(prev, row)).toBe(true);
      const gaps = releaseCatharticRestZoneGaps(TEST_COLS);
      expect(gaps.length).toBe(releaseRestZoneInteriorWidth(TEST_COLS));
      expect(new Set(gaps).size).toBe(gaps.length);
      prev = row;
    }
  });
});

describe('RELEASE strip stress', () => {
  it('keeps full interior open with no injected interior solids across 1000 virtual rows', () => {
    for (let k = 0; k < 1000; k++) {
      const row = releaseCatharticRestZoneRow(TEST_COLS);
      expect(releaseRestZoneRowIsValid(row, TEST_COLS)).toBe(true);
    }
  });
});
