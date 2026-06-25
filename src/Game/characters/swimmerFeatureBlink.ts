import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';

export type FeatureBlinkType = 'tinyDotBlink' | 'sleepyBlink';

export type FeatureBlinkState = {
  cooldownSec: number;
  activeSec: number;
  blinkCount: number;
};

export type FeatureBlinkVisual = {
  opacity: number;
  scaleY: number;
  state: FeatureBlinkState;
};

function pickBlinkInterval(salt: number, blinkType: FeatureBlinkType): number {
  'worklet';
  const t = unitFloatFromU32(mixU32(salt, 0x0b1a7f3c, 1));
  if (blinkType === 'sleepyBlink') {
    return (
      swimmerLifeTuning.SLEEPY_BLINK_INTERVAL_MIN_SEC +
      t *
        (swimmerLifeTuning.SLEEPY_BLINK_INTERVAL_MAX_SEC -
          swimmerLifeTuning.SLEEPY_BLINK_INTERVAL_MIN_SEC)
    );
  }
  return (
    swimmerLifeTuning.BLINK_INTERVAL_MIN_SEC +
    t *
      (swimmerLifeTuning.BLINK_INTERVAL_MAX_SEC -
        swimmerLifeTuning.BLINK_INTERVAL_MIN_SEC)
  );
}

function pickBlinkDuration(salt: number, blinkType: FeatureBlinkType): number {
  'worklet';
  const t = unitFloatFromU32(mixU32(salt, 0x0c4e82d1, 2));
  if (blinkType === 'sleepyBlink') {
    return (
      swimmerLifeTuning.SLEEPY_BLINK_DURATION_MIN_SEC +
      t *
        (swimmerLifeTuning.SLEEPY_BLINK_DURATION_MAX_SEC -
          swimmerLifeTuning.SLEEPY_BLINK_DURATION_MIN_SEC)
    );
  }
  return (
    swimmerLifeTuning.BLINK_DURATION_MIN_SEC +
    t *
      (swimmerLifeTuning.BLINK_DURATION_MAX_SEC -
        swimmerLifeTuning.BLINK_DURATION_MIN_SEC)
  );
}

function getBlinkClosedVisual(
  blinkType: FeatureBlinkType,
  closed: number
): { opacity: number; scaleY: number } {
  'worklet';
  if (blinkType === 'sleepyBlink') {
    return {
      opacity:
        1 - closed * (1 - swimmerLifeTuning.SLEEPY_BLINK_CLOSED_OPACITY),
      scaleY: 1 - closed * (1 - swimmerLifeTuning.SLEEPY_BLINK_CLOSED_SCALE_Y),
    };
  }
  return {
    opacity: 1 - closed * (1 - swimmerLifeTuning.BLINK_CLOSED_OPACITY),
    scaleY: 1 - closed * (1 - swimmerLifeTuning.BLINK_CLOSED_SCALE_Y),
  };
}

export function createFeatureBlinkState(entitySalt: number): FeatureBlinkState {
  'worklet';
  return {
    cooldownSec: pickBlinkInterval(mixU32(entitySalt, 0, 1), 'tinyDotBlink'),
    activeSec: 0,
    blinkCount: 0,
  };
}

export function updateFeatureBlink(
  state: FeatureBlinkState | undefined,
  entitySalt: number,
  dt: number,
  blinkType: FeatureBlinkType = 'tinyDotBlink'
): FeatureBlinkVisual {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const next = state ?? createFeatureBlinkState(entitySalt);
  let opacity = 1;
  let scaleY = 1;

  if (next.activeSec > 0) {
    const duration = pickBlinkDuration(
      mixU32(entitySalt, next.blinkCount, 0x0d2e91a4),
      blinkType
    );
    const remaining = Math.max(0, next.activeSec - safeDt);
    const elapsed = duration - remaining;
    const phase = duration > 0 ? Math.min(1, elapsed / duration) : 1;
    const closed = Math.sin(phase * Math.PI);
    const closedVisual = getBlinkClosedVisual(blinkType, closed);
    opacity = closedVisual.opacity;
    scaleY = closedVisual.scaleY;

    if (remaining <= 0) {
      return {
        opacity: 1,
        scaleY: 1,
        state: {
          cooldownSec: pickBlinkInterval(
            mixU32(entitySalt, next.blinkCount, 0x0e7c3b19),
            blinkType
          ),
          activeSec: 0,
          blinkCount: next.blinkCount,
        },
      };
    }

    return {
      opacity,
      scaleY,
      state: {
        ...next,
        activeSec: remaining,
      },
    };
  }

  const cooldownSec = next.cooldownSec - safeDt;
  if (cooldownSec <= 0) {
    const blinkCount = next.blinkCount + 1;
    return {
      opacity,
      scaleY,
      state: {
        cooldownSec: 0,
        activeSec: pickBlinkDuration(
          mixU32(entitySalt, blinkCount, 0x0f1ac8e2),
          blinkType
        ),
        blinkCount,
      },
    };
  }

  return {
    opacity,
    scaleY,
    state: {
      ...next,
      cooldownSec,
    },
  };
}
