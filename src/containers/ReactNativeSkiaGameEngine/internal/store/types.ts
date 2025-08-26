interface RNTGEStore {
  dimensions: {
    width: number;
    height: number;
  };
  setDimensions: (width: number, height: number) => void;
  resetDimensions: () => void;
}
