import { ENTITIES_KEYS } from '@/constants/configs';
import { useAddEntity } from '@/containers/ReactNativeSkiaGameEngine';
import { State } from '@/Game/Entities/State/State';
import { FC } from 'react';

interface IStateEntityProps {
  isRunning: boolean;
}

export const StateEntity: FC<IStateEntityProps> = ({ isRunning }) => {
  useAddEntity(new State(isRunning), { label: ENTITIES_KEYS.STATE });
  return null;
};
