import { useCanvasDimensions } from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { FC, PropsWithChildren } from 'react';

export const GamePlayScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  return (
    <Scene
      defaultSceneName="gamePlayScene"
      width={width || 0}
      height={height || 0}
      defaultCameraProps={{
        scaleX: 2,
        scaleY: 2,
        translateY: (height || 0) / 7,
      }}
      isActive={true}
    >
      {children}
    </Scene>
  );
};
