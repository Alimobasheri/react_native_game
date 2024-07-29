import { useContext } from "react";
import { RNSGEContext } from "../context";

export const useCanvasDimensions = () => {
  const rnsgeContext = useContext(RNSGEContext);
  return rnsgeContext.dimensions;
};
