import useRNTGEStore from '../../internal/store';

export const useCanvasDimensions = () => {
  const dimensions = useRNTGEStore((state) => state.dimensions);
  return dimensions;
};
