export const SceneComponentName = 'scene';
export type SceneComponentData = {
  sceneKey: string;
  parentSceneKey?: string;
  isActive: boolean;
  isPaused: boolean;
  isPreloading: boolean;
  zIndex: number;
};
