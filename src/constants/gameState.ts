import { IGameState, IVanillaGameState } from '@/Game/Entities/State/State';

export const InitialGameState: IVanillaGameState = {
  isRunning: false,
  isGameOver: false,
  isPaused: false,
  isGamePlayExited: false,
  isHomeScene: true,
};
