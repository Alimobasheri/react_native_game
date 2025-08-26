import { create } from 'zustand';

const useRNTGEStore = create<RNTGEStore>((set) => ({
  dimensions: {
    width: -1,
    height: -1,
  },
  setDimensions: (width, height) => set({ dimensions: { width, height } }),
  resetDimensions: () => set({ dimensions: { width: 0, height: 0 } }),
}));

export default useRNTGEStore;
