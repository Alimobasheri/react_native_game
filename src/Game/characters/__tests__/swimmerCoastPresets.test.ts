import {
  getActiveCoastPreset,
  swimmerCoastPreset,
  swimmerCoastPresets,
} from '@/config/swimmerTuning';

describe('swimmerCoastPresets', () => {
  it('getActiveCoastPreset resolves the selected preset table', () => {
    const active = getActiveCoastPreset();
    expect(active).toBe(swimmerCoastPresets[swimmerCoastPreset]);
  });

  it('snappy preset retains less velocity per second than floaty', () => {
    const snappy = swimmerCoastPresets.snappy;
    const floaty = swimmerCoastPresets.floaty;
    expect(snappy.MIN_RETAIN_PER_SECOND).toBeLessThan(floaty.MIN_RETAIN_PER_SECOND);
    expect(snappy.MAX_RETAIN_PER_SECOND).toBeLessThan(floaty.MAX_RETAIN_PER_SECOND);
  });

  it('all presets expose the full editable coast table', () => {
    for (const name of ['snappy', 'balanced', 'floaty'] as const) {
      const preset = swimmerCoastPresets[name];
      expect(preset.TAP_TRAVEL_COLUMN_MULTIPLIER).toBeGreaterThan(0);
      expect(preset.MIN_RETAIN_PER_SECOND).toBeGreaterThan(0);
      expect(preset.MAX_RETAIN_PER_SECOND).toBeGreaterThan(preset.MIN_RETAIN_PER_SECOND);
      expect(preset.VELOCITY_LEAN_SMOOTH_PER_SEC).toBeGreaterThan(0);
    }
  });
});
