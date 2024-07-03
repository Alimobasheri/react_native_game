import { create } from "zustand";

/**
 * Reperesents global game state.
 * @interface IGameState
 * @property {boolean} isGameRunning - Is game running and frames and engine updating?
 * @property {boolean} isUsingCanvas - Used to switch between skia and react-native rendering
 */
interface IGameState {
  isGameRunning: boolean;
  isUsingCanvas: boolean;
}

/**
 * Zustand store for managing global UX states.
 * @function useGameState
 * @returns {object} Zustand store with global state and actions.
 */
export const useGameState = create<IGameState>((set) => ({
  isGameRunning: false,
  isUsingCanvas: true,
  /**
   * Set isGameRunning to true.
   * @function
   * @returns {void}
   */
  startGame: (): void => set((state) => ({ isGameRunning: true })),
  /**
   * Set isGameRunning to false.
   * @function
   * @returns {void}
   */
  stopGame: (): void => set((state) => ({ isGameRunning: false })),
}));
