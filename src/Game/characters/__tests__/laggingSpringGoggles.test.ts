import {
  createLaggingSpringAccessoryState,
  notifyLaggingSpringPivotImpact,
  updateLaggingSpringAccessory,
} from '../accessories/laggingSpringGoggles';
import { secondaryItemTuning } from '@/config/secondaryItemTuning';

const noopSink = {
  setLocalTransform: () => {},
};

describe('laggingSpringGoggles', () => {
  it('converges offset toward the velocity-driven spring target', () => {
    let state = createLaggingSpringAccessoryState();

    const velocityX = 200;
    for (let i = 0; i < 180; i++) {
      state = updateLaggingSpringAccessory(
        state,
        1,
        velocityX,
        1 / 60,
        noopSink
      );
    }

    const expectedTarget =
      -velocityX * secondaryItemTuning.LAGGING_SPRING_VELOCITY_FACTOR;
    expect(state.localOffsetX).toBeCloseTo(expectedTarget, 0);
  });

  it('clamps horizontal offset to configured limits', () => {
    let state = createLaggingSpringAccessoryState();

    for (let i = 0; i < 240; i++) {
      state = updateLaggingSpringAccessory(
        state,
        1,
        1200,
        1 / 60,
        noopSink
      );
    }

    expect(Math.abs(state.localOffsetX)).toBeLessThanOrEqual(
      secondaryItemTuning.LAGGING_SPRING_OFFSET_CLAMP
    );
  });

  it('applies pivot whiplash to spring velocity', () => {
    const state = createLaggingSpringAccessoryState();
    const impactForce = 120;
    const nextState = notifyLaggingSpringPivotImpact(state, impactForce);

    expect(nextState.springVelocityX).toBe(
      -impactForce * secondaryItemTuning.LAGGING_SPRING_PIVOT_WHIPLASH
    );
  });
});
