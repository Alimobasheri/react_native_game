import { ENTITIES_KEYS } from '@/constants/configs';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine';
import { IVanillaGameState, State } from './State';
import { useSharedValue } from 'react-native-reanimated';
import { useMemo } from 'react';

export const useCreateState = (initialState: IVanillaGameState) => {
  const isRunning = useSharedValue(initialState.isRunning);
  const isGameOver = useSharedValue(initialState.isGameOver);
  const isPaused = useSharedValue(initialState.isPaused);
  const isGamePlayExited = useSharedValue(initialState.isGamePlayExited);
  const isHomeScene = useSharedValue(initialState.isHomeScene);

  const initialGameState = useMemo(() => {
    return {
      isRunning,
      isGameOver,
      isPaused,
      isGamePlayExited,
      isHomeScene,
    };
  }, [isRunning, isGameOver, isPaused, isGamePlayExited, isHomeScene]);

  const stateEntityInstance = useAddEntity(new State(initialGameState), {
    label: ENTITIES_KEYS.STATE,
  });

  return stateEntityInstance;
};
