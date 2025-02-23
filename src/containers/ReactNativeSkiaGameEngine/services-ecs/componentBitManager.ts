export const createComponentBitManager = () => {
  'worklet';
  const componentBitMap: Record<string, number> = {};
  let nextBit: number = 0;

  const getComponentBit = (componentName: string): number => {
    'worklet';
    if (!(componentName in componentBitMap)) {
      componentBitMap[componentName] = 1 << nextBit;
      nextBit++;
    }
    return componentBitMap[componentName];
  };

  const getBitMask = (componentName: string): number | undefined => {
    'worklet';
    return componentBitMap[componentName];
  };

  const getAllBits = () => {
    'worklet';
    return componentBitMap;
  };

  return {
    getComponentBit,
    getBitMask,
    getAllBits,
  };
};
