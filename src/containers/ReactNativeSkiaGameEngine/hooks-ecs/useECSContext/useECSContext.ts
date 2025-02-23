import { useContext } from 'react';
import { ECSContext } from '../../contexts-rntge/ECSContext/ECSContext';

export const useECSContext = () => {
  const ecsContext = useContext(ECSContext);

  if (!ecsContext) {
    throw new Error('Not a child of ECSProvider');
  }

  return ecsContext;
};
