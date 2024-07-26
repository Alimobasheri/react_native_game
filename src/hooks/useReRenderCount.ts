import { useEffect, useRef } from "react";

export const useReRenderCount = () => {
  const reRenderCount = useRef<number>(0);
  useEffect(() => {
    reRenderCount.current++;
  });
  return reRenderCount;
};
