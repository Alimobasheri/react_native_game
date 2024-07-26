import { useContext } from "react";
import { system } from "../services/Systems";
import { RNSGEContext } from "../context/RNSGEContext";

export function useSystem(system: system) {
  const systems = useContext(RNSGEContext).systems;

  systems.current.addSystem(system);
}
