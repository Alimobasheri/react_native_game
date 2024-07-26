import { useRef } from "react";
import { EventDispatcher } from "../services";

export const useDispatcher = () => {
  const dispatcherRef = useRef<EventDispatcher>(new EventDispatcher());
  return dispatcherRef;
};
