interface RNTGESafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface RNTGEStore {
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
}
