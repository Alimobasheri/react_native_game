import { useRef } from 'react';
import { Entities } from '../../services/Entities';
import Animations from '../../services/Animations';

export const useAnimations = () => {
  const animationsRef = useRef<Animations>(new Animations());
  return animationsRef;
};
