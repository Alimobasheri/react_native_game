import { deathCopyTuning } from '@/config/deathCopy';
import type { DeathContext } from '@/Game/path/runBlueprint';
import { formatDeathLine } from '../deathCopyLine';

describe('formatDeathLine', () => {
  const ctx = (generator: string): DeathContext => ({
    phase: 'tension',
    generator,
    score: 100,
  });

  it('returns fallback when ctx is undefined', () => {
    expect(formatDeathLine(undefined)).toBe(deathCopyTuning.FALLBACK);
  });

  it('includes generator suffix for chute', () => {
    expect(formatDeathLine(ctx('chute'))).toBe(
      'Pinned under rock · narrow chute'
    );
  });

  it('maps pinball and signature to pinball lane', () => {
    expect(formatDeathLine(ctx('pinball'))).toContain('pinball lane');
    expect(formatDeathLine(ctx('signature'))).toContain('pinball lane');
  });

  it('omits suffix for unknown generator', () => {
    expect(formatDeathLine(ctx('unknown'))).toBe('Pinned under rock');
  });

  it('omits suffix for release', () => {
    expect(formatDeathLine(ctx('release'))).toBe('Pinned under rock');
  });
});

describe('formatDeathLine with suffix disabled', () => {
  it('shows cause only when showSuffix is false', () => {
    expect(
      formatDeathLine(
        { phase: 'flow', generator: 'chute', score: 50 },
        false
      )
    ).toBe('Pinned under rock');
  });
});
