export const AnimatorStateComponentName = 'AnimatorState';

export interface AnimatorStateComponentData {
  stateMachineId: string; // Asset key for the state machine
  currentStateId: number; // Hash of the current state
  parameters: Record<string, any>; // Parameters of the current state
}

export const createAnimatorStateComponent = (
  data: AnimatorStateComponentData
) => {
  return { name: AnimatorStateComponentName, data };
};
