import { FC } from 'react';
import { MemoizedContainer } from '../MemoizedContainer';
import { Gesture, GestureItem } from '../../types/gestures';
import { GestureTracker } from '../GestureTracker/GestureTracker';

export interface ITouchDOMProps {
  gestures: GestureItem[];
}

const extractKey = (gesture: Gesture): string => {
  //@ts-ignore
  if (!!gesture?.gestures) {
    return gesture.toGestureArray().map(extractKey).join('-');
  } else {
    //@ts-ignore
    return `${gesture.handlerTag}`;
  }
};

export const TouchDOM: FC<ITouchDOMProps> = ({ gestures }) => {
  return (
    <MemoizedContainer>
      {gestures.map((gesture) => {
        return (
          <GestureTracker key={extractKey(gesture.gesture)} gesture={gesture} />
        );
      })}
    </MemoizedContainer>
  );
};
