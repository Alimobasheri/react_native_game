import { swimmerLifeTuning } from '@/config/swimmerLifeTuning';
import { mixU32, unitFloatFromU32 } from '@/Game/path/deterministicMix';

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

const pickBlinkInterval = (salt: number): number => {
  'worklet';
  const t = unitFloatFromU32(mixU32(salt, 0x0b1a7f3c, 1));
  return (
    swimmerLifeTuning.BLINK_INTERVAL_MIN_SEC +
    t *
      (swimmerLifeTuning.BLINK_INTERVAL_MAX_SEC -
        swimmerLifeTuning.BLINK_INTERVAL_MIN_SEC)
  );
};

const pickBlinkDuration = (salt: number): number => {
  'worklet';
  const t = unitFloatFromU32(mixU32(salt, 0x0c4e82d1, 2));
  return (
    swimmerLifeTuning.BLINK_DURATION_MIN_SEC +
    t *
      (swimmerLifeTuning.BLINK_DURATION_MAX_SEC -
        swimmerLifeTuning.BLINK_DURATION_MIN_SEC)
  );
};

export const createFeatureBlinkState = (entitySalt: number): FeatureBlinkState => {
  'worklet';
  return {
    cooldownSec: pickBlinkInterval(mixU32(entitySalt, 0, 1)),
    activeSec: 0,
    blinkCount: 0,
  };
};

export const updateFeatureBlink = (
  state: FeatureBlinkState | undefined,
  entitySalt: number,
  dt: number
): FeatureBlinkVisual => {
  'worklet';
  const safeDt = dt > 0 ? dt : 0;
  const next = state ?? createFeatureBlinkState(entitySalt);
  let opacity = 1;
  let scaleY = 1;

  if (next.activeSec > 0) {
    const duration = pickBlinkDuration(
      mixU32(entitySalt, next.blinkCount, 0x0d2e91a4)
    );
    const remaining = Math.max(0, next.activeSec - safeDt);
    const elapsed = duration - remaining;
    const phase = duration > 0 ? Math.min(1, elapsed / duration) : 1;
    const closed = Math.sin(phase * Math.PI);
    opacity =
      1 - closed * (1 - swimmerLifeTuning.BLINK_CLOSED_OPACITY);
    scaleY = 1 - closed * (1 - swimmerLifeTuning.BLINK_CLOSED_SCALE_Y);

    if (remaining <= 0) {
      return {
        opacity: 1,
        scaleY: 1,
        state: {
          cooldownSec: pickBlinkInterval(
            mixU32(entitySalt, next.blinkCount, 0x0e7c3b19)
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
          mixU32(entitySalt, blinkCount, 0x0f1ac8e2)
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
};
