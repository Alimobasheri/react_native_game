import { useContext } from 'react';
import { RNSGEContext } from '../context';

export const useCanvasDimensions = () => {
  const rnsgeContext = useContext(RNSGEContext);
  if (!rnsgeContext) {
    throw new Error('useCanvasDimensions must be used within a RNSGEContext');
  }
  return rnsgeContext.dimensions;
};
