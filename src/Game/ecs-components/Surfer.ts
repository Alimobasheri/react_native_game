export const SurferComponentName = 'Surfer';

export type SurferComponentData = {
  direction: 'left' | 'right';
  isPhysicsInitialized: boolean;
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
