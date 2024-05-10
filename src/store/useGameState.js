import { create } from "zustand";

export const useGameState = create((set) => ({
  isGameRunning: false,
  startGame: () => set((state) => ({ isGameRunning: true })),
  stopGame: () => set((state) => ({ isGameRunning: false })),
}));
