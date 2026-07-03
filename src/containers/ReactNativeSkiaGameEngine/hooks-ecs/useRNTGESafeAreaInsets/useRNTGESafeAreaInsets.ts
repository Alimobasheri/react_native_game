import useRNTGEStore from '../../internal/store';

export const useRNTGESafeAreaInsets = () => {
  const safeAreaInsets = useRNTGEStore((state) => state.safeAreaInsets);
  return safeAreaInsets;
};
