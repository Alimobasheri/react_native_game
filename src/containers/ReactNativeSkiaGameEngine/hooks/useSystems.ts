import { useRef } from "react";
import { Systems } from "../services/Systems";

export const useSystems = () => {
  const systemsRef = useRef<Systems>(new Systems());
  return systemsRef;
};
