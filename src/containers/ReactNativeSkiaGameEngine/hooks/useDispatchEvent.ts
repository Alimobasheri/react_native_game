import { useContext } from "react";
import { RNSGEContext } from "../context/RNSGEContext";

export const useDispatchEvent = () => {
  const { dispatcher } = useContext(RNSGEContext);

  const dispatchEvent = (event: string, data?: any) => {
    dispatcher.current.emitEvent(event, data);
  };

  return dispatchEvent;
};
