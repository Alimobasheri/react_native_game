export const SurferComponentName = 'Surfer';

export type SurferArcadeState =
  | 'STABLE_SURFING'
  | 'WAVE_LAUNCH'
  | 'AIR_ROTATION'
  | 'LANDING'
  | 'RECOVERY';

export type SurferStateData = {
  state: SurferArcadeState;
  timeInStateMs: number;
  rotationsCompleted: number;
  currentRotationRad: number;
  launchPower: number;
  targetRotations: number | null;
  lastLandingWasPerfect: boolean;
  scorePending: number;
};

export type SurferComponentData = {
  direction: 'left' | 'right';
  isPhysicsInitialized: boolean;
  initialX: number;
  stateData?: SurferStateData;
};

export const createSurferComponent = (
  data: Omit<SurferComponentData, 'isPhysicsInitialized'>
) => {
  'worklet';
  return {
    name: SurferComponentName,
    data: {
      ...data,
      isPhysicsInitialized: false,
    },
  };
};
