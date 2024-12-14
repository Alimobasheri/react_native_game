import { useContext } from 'react';
import { RNSGEContext } from '../context/RNSGEContext';
import { GameEvent } from '../types';

export const useDispatchEvent = () => {
  const { dispatcher } = useContext(RNSGEContext);

  const dispatchEvent = (event: GameEvent) => {
    dispatcher.current.emitEvent(event);
  };

  return dispatchEvent;
};
