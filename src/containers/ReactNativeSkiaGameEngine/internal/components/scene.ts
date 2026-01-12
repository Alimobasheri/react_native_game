export const SceneComponentName = 'scene';

export type SceneObjectsMap = {
  assets: {
    images: string[];
    shaders: string[];
    fonts: string[];
    atlases: string[];
    clips: string[];
  };
  entities: number[];
  matterBodies: number[];
  systems: number[];
};

export type SceneComponentData = {
  sceneKey: string;
  parentSceneKey?: string;
  isActive: boolean;
  isPaused: boolean;
  isPreloading: boolean;
  zIndex: number;
  objects: SceneObjectsMap;
};
