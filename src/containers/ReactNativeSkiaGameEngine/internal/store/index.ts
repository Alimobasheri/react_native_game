import { create } from 'zustand';

export type RNTGESafeAreaInsets = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

export type RNTGEStore = {
  dimensions: {
    width: number;
    height: number;
  };
  safeAreaInsets: RNTGESafeAreaInsets;
  setDimensions: (width: number, height: number) => void;
  resetDimensions: () => void;
  setSafeAreaInsets: (
    top: number,
    bottom: number,
    left: number,
    right: number
  ) => void;
};

const ZERO_SAFE_AREA_INSETS: RNTGESafeAreaInsets = {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
};

const useRNTGEStore = create<RNTGEStore>((set) => ({
  dimensions: {
    width: -1,
    height: -1,
  },
  safeAreaInsets: ZERO_SAFE_AREA_INSETS,
  setDimensions: (width, height) => set({ dimensions: { width, height } }),
  resetDimensions: () => set({ dimensions: { width: 0, height: 0 } }),
  setSafeAreaInsets: (top, bottom, left, right) =>
    set({ safeAreaInsets: { top, bottom, left, right } }),
}));

export default useRNTGEStore;
