import { useCallback, useContext, useEffect } from "react";
import { RNSGEContext } from "../context/RNSGEContext";
import { GestureType } from "react-native-gesture-handler";

export const useTouchHandler = (gesture?: GestureType) => {
  const { touchService } = useContext(RNSGEContext);

  useEffect(() => {
    if (gesture) touchService.addGesture(gesture);
  }, [gesture]);

  const addGesture = useCallback((gesture: GestureType) => {
    touchService.addGesture(gesture);
  }, []);
  return { addGesture };
};
