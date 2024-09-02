import { FC, PropsWithChildren } from 'react';
import { SceneContext } from '../context';
import { ISceneProviderProps } from './types';
import { useSceneProvider } from './useSceneProvider';

export const SceneProvider: FC<PropsWithChildren<ISceneProviderProps>> = ({
  children,
  defaultSceneName,
}) => {
  const value = useSceneProvider({ defaultSceneName });
  return (
    <SceneContext.Provider value={value}>{children}</SceneContext.Provider>
  );
};
