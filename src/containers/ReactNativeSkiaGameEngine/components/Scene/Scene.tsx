import { FC, PropsWithChildren, useContext } from 'react';
import { SceneContext } from './context';
import { SceneProvider } from './provider';
import { useSceneContext } from './hooks/useSceneContext';
import { MemoizedContainer } from '../MemoizedContainer';

export interface ISceneProps {
  defaultSceneName: string;
}

export const Scene: FC<PropsWithChildren<ISceneProps>> = ({
  defaultSceneName,
  children,
}) => {
  const { isActive } = useSceneContext({ defaultSceneName });

  return isActive ? (
    <SceneProvider defaultSceneName={defaultSceneName}>
      <MemoizedContainer>{children}</MemoizedContainer>
    </SceneProvider>
  ) : null;
};
