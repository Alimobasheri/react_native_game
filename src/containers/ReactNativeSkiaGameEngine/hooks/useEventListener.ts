import { useContext, useEffect } from "react";
import { RNSGEContext } from "../context/RNSGEContext";

export const useEventListener = (
  event: string,
  callback: (data?: any) => void
) => {
  const { dispatcher } = useContext(RNSGEContext);

  useEffect(() => {
    const listener = dispatcher.current.addListener(event, callback);

    return () => {
      listener.remove();
    };
  }, [dispatcher, event, callback]);
};
