import { ENTITIES_KEYS } from '@/constants/configs';
import { InitialGameState } from '@/constants/gameState';
import { Scenes } from '@/constants/scenes';
import {
  useAddEntity,
  useCanvasDimensions,
  useEntityMemoizedValue,
} from '@/containers/ReactNativeSkiaGameEngine';
import { Scene } from '@/containers/ReactNativeSkiaGameEngine/components/Scene/Scene';
import { useEventListener } from '@/containers/ReactNativeSkiaGameEngine/hooks/useEventListener';
import { State } from '@/Game/Entities/State/State';
import { FC, PropsWithChildren, useCallback } from 'react';
import {
  BUOYANT_VEHICLE_SINKED_EVENT_TYPE,
  GAME_OVER_EVENT,
  RESTART_GAME_EVENT,
} from '@/constants/events';
import { VEHICLE_TYPE_IDENTIFIERS } from '@/constants/vehicle';
import { GameEvent } from '@/containers/ReactNativeSkiaGameEngine/types';
import { GamePlayScene } from '../../Scenes/GamePlayScene';
import { StartingScene } from '../../Scenes/StartingScene';
import { SeaGroup } from '@/components/SeaGroupRenderer/SeaGroup-rnsge';
import { SkyBackground } from '@/components/SkyBackground';
import { StarsView } from '@/components/StarsView/StarsView-rnsge';
import { Physics } from '@/components/Physics';
import { Collisions } from '@/components/Collisions';
import { Swipe } from '@/components/Swipe';
import { ActionCameraControl } from '@/components/ActionCameraControl';
import { GameOverScene } from '../../Scenes/GameOverScene';
import { useCreateState } from '@/Game/Entities/State/useCreateState';
import {
  runOnJS,
  runOnUI,
  SharedValue,
  useAnimatedReaction,
} from 'react-native-reanimated';

export const MainScene: FC<PropsWithChildren> = ({ children }) => {
  const { width, height } = useCanvasDimensions();
  const stateEntityInstance = useCreateState(InitialGameState);

  const isGamePlayExited = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isGamePlayExited'
  ) as SharedValue<boolean>;

  const isRunning = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isRunning'
  ) as SharedValue<boolean>;

  const isHomeScene = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isHomeScene'
  ) as SharedValue<boolean>;

  const isGameOver = useEntityMemoizedValue<State, SharedValue<boolean>>(
    { label: ENTITIES_KEYS.STATE },
    '_isGameOver'
  ) as SharedValue<boolean>;

  const gameOverCallback = useCallback(() => {
    'worklet';
    if (isGamePlayExited.value || !isRunning.value || isGameOver.value) return;
    isGameOver.value = true;
    isRunning.value = false;
  }, [stateEntityInstance]);

  useEventListener(GAME_OVER_EVENT.type, () => {
    runOnUI(gameOverCallback)();
  });
  // useEventListener(BUOYANT_VEHICLE_SINKED_EVENT_TYPE, (data: GameEvent) => {
  //   if (data.data.type === VEHICLE_TYPE_IDENTIFIERS.SHIP) {
  //     stateEntityInstance.data.isGameOver = true;
  //     stateEntityInstance.data.isRunning = false;
  //   }
  // });

  const restartTimeout = useCallback(() => {
    setTimeout(() => {
      isGamePlayExited.value = false;
    }, 500);
  }, []);
  const restartGameCallback = useCallback(() => {
    'worklet';
    isGameOver.value = false;
    isGamePlayExited.value = true;
    runOnJS(restartTimeout)();
  }, [isGamePlayExited, isGameOver, restartTimeout]);
  useEventListener(RESTART_GAME_EVENT.type, () => {
    runOnUI(restartGameCallback)();
  });

  useAnimatedReaction(
    () => [
      isGamePlayExited.value,
      isRunning.value,
      isGameOver.value,
      isHomeScene.value,
    ],
    (data) => {
      console.log(
        'Main Scene State',
        'isGamePlayExited',
        data[0],
        'isRunning',
        data[1],
        'isGameOver',
        data[2],
        'isHomeScene',
        data[3]
      );
    }
  );
  return (
    <Scene defaultSceneName={Scenes.Main} width={0} height={0} isActive={true}>
      <GamePlayScene></GamePlayScene>
      <StartingScene />
      <GameOverScene />
    </Scene>
  );
};
