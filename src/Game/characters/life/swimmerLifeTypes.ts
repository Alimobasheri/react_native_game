export type InternalLifeState = {
  phase: number;
};

export type InternalMotionProfileId = 'ripple' | 'kelpSway' | 'none';

/** Debug gates G0–G3: 0=composite, 1=mask, 2=uvScroll, 3=rawBody */
export type SwimmerLifeDebugMode = 0 | 1 | 2 | 3;

export const createInternalLifeState = (): InternalLifeState => {
  'worklet';
  return { phase: 0 };
};
