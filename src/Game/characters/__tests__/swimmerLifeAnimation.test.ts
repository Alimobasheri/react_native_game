import {
  createFeatureBlinkState,
  updateFeatureBlink,
} from '../swimmerFeatureBlink';
import { advanceInternalLifePhase } from '../life/swimmerLifeDrivers';
import { createInternalLifeState } from '../life/swimmerLifeTypes';

describe('swimmerFeatureBlink', () => {
  it('starts open and eventually blinks closed', () => {
    let state = createFeatureBlinkState(42);
    let sawClosed = false;

    for (let i = 0; i < 60 * 8; i++) {
      const result = updateFeatureBlink(state, 42, 1 / 60);
      state = result.state;
      if (result.scaleY < 0.5) {
        sawClosed = true;
        break;
      }
    }

    expect(sawClosed).toBe(true);
  });

  it('returns to open opacity after blink completes', () => {
    let state = createFeatureBlinkState(7);
    state = {
      cooldownSec: 0,
      activeSec: 0.12,
      blinkCount: 1,
    };

    for (let i = 0; i < 20; i++) {
      const result = updateFeatureBlink(state, 7, 1 / 60);
      state = result.state;
      if (state.activeSec === 0 && result.opacity === 1 && result.scaleY === 1) {
        expect(result.opacity).toBe(1);
        expect(result.scaleY).toBe(1);
        return;
      }
    }

    expect(state.activeSec).toBe(0);
  });
});

describe('swimmerLifeDrivers', () => {
  it('advances internal life phase over time', () => {
    let state = createInternalLifeState();
    const first = advanceInternalLifePhase(state, 'ripple', 1 / 60);
    const second = advanceInternalLifePhase(first, 'ripple', 1 / 60);

    expect(second.phase).toBeGreaterThan(first.phase);
  });
});
