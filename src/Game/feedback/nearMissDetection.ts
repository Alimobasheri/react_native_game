/**
 * @deprecated Clearance-band near-miss ignition removed — see skillFeedback detectors.
 * Retained: bonus roll helper used by legacy imports.
 */
export { rollBonusInRange as rollNearMissBonus } from '@/Game/feedback/praiseBonus';

export type NearMissState = {
  wasNearPin: boolean;
  lastFireMs: number;
  firesThisRun: number;
};

export const createDefaultNearMissState = (): NearMissState => {
  'worklet';
  return {
    wasNearPin: false,
    lastFireMs: 0,
    firesThisRun: 0,
  };
};
