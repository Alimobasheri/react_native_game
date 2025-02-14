import { useContext } from 'react';
import { RNSGEContext } from '../context/RNSGEContext';
import { GameEvent } from '../types';

export const useDispatchEvent = () => {
  const rnsgeContext = useContext(RNSGEContext);

  if (!rnsgeContext) {
    throw new Error('useDispatchEvent must be used within a RNSGEContext');
  }

  const dispatcher = rnsgeContext.dispatcher;

  const dispatchEvent = (event: GameEvent) => {
    dispatcher.current.emitEvent(event);
  };

  return dispatchEvent;
};
