export const RestartGameplayRequestType = 'RestartGameplayRequest';

export type RestartGameplayRequest = {
  type: typeof RestartGameplayRequestType;
  payload: {
    sessionEntity: number;
    sceneKey: string;
  };
};
