import { resolvePendulumHeadStrike } from '@/Game/swimmerPhysics/react/pendulumStrike';
import { pendulumHazardTuning } from '@/config/pendulumHazardTuning';
import type { PendulumHeadSolid } from '@/Game/collision/swimmerBlockCollision';

describe('pendulumStrike', () => {
  const halfW = 20;
  const halfH = 24;

  const solidAt = (cx: number, cy: number, vx = 400, vy = 200): PendulumHeadSolid => ({
    aabb: {
      minX: cx - 24,
      maxX: cx + 24,
      minY: cy - 20,
      maxY: cy + 20,
    },
    velocityX: vx,
    velocityY: vy,
    leadEntityId: 1,
    strikeProfile: 'plunge_kill',
  });

  it('plunge_kill applies directional impulse in swing direction', () => {
    const strike = resolvePendulumHeadStrike(
      100,
      100,
      halfW,
      halfH,
      [solidAt(100, 100, 500, 100)],
      1 / 60
    );
    expect(strike.struck).toBe(true);
    expect(strike.impulseVelocityX).toBeGreaterThan(0);
    expect(strike.impulseVelocityY).toBeGreaterThan(0);
    expect(strike.triggerGameOverOnHit).toBe(true);
    expect(strike.knockbackDeltaX).not.toBe(0);
  });

  it('knockback_only does not trigger game over', () => {
    const strike = resolvePendulumHeadStrike(
      100,
      100,
      halfW,
      halfH,
      [{ ...solidAt(100, 100), strikeProfile: 'knockback_only' }],
      1 / 60
    );
    expect(strike.struck).toBe(true);
    expect(strike.triggerGameOverOnHit).toBe(false);
    expect(strike.impulseVelocityX).toBeGreaterThan(0);
  });

  it('no overlap returns no strike', () => {
    const strike = resolvePendulumHeadStrike(
      100,
      100,
      halfW,
      halfH,
      [solidAt(300, 300)],
      1 / 60
    );
    expect(strike.struck).toBe(false);
  });
});
