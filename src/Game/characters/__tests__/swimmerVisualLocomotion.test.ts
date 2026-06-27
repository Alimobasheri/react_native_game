import { VisualStrokePhase } from '../visualStrokePhase';
import { createDefaultSwimmerLocomotion } from '../swimmerLocomotionDefaults';
import {
  beginVisualStroke,
  computeVisualAnticipationDurationSec,
} from '../swimmerVisualLocomotion';
import { swimmerVisualTuning } from '@/config/swimmerVisualTuning';

describe('swimmerVisualLocomotion', () => {
  it('uses full anticipation duration at low water speed', () => {
    expect(computeVisualAnticipationDurationSec(0)).toBeCloseTo(
      swimmerVisualTuning.ANTICIPATION_DURATION_SEC,
      4
    );
    expect(
      computeVisualAnticipationDurationSec(
        swimmerVisualTuning.ANTICIPATION_WATER_SPEED_FADE_START
      )
    ).toBeCloseTo(swimmerVisualTuning.ANTICIPATION_DURATION_SEC, 4);
  });

  it('removes anticipation at high water speed', () => {
    expect(
      computeVisualAnticipationDurationSec(
        swimmerVisualTuning.ANTICIPATION_WATER_SPEED_REMOVE_AT
      )
    ).toBe(0);
    expect(computeVisualAnticipationDurationSec(1)).toBe(0);
  });

  it('beginVisualStroke skips to STROKE when anticipation is removed', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    beginVisualStroke(locomotion, 1, 2, 0.75);
    expect(locomotion.visualPhase).toBe(VisualStrokePhase.STROKE);
    expect(locomotion.visualAnticipationTimer).toBe(0);
    expect(locomotion.visualStrokeTimer).toBeCloseTo(
      swimmerVisualTuning.STROKE_DURATION_SEC,
      4
    );
  });

  it('beginVisualStroke keeps ANTICIPATION at low water speed', () => {
    const locomotion = createDefaultSwimmerLocomotion();
    beginVisualStroke(locomotion, 1, 2, 0);
    expect(locomotion.visualPhase).toBe(VisualStrokePhase.ANTICIPATION);
    expect(locomotion.visualAnticipationTimer).toBeCloseTo(
      swimmerVisualTuning.ANTICIPATION_DURATION_SEC,
      4
    );
  });
});
