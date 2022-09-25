import { Dimensions } from "react-native";

export const MAX_WIDTH = Dimensions.get("screen").width;
export const MAX_HEIGHT = Dimensions.get("screen").height;
export const CELL_SIZE = 20;
export const GRID_SIZE = Math.floor(MAX_WIDTH / CELL_SIZE);
export const GRID_WIDTH = Math.floor(MAX_WIDTH / CELL_SIZE);
export const GRID_HEIGHT = Math.floor(MAX_HEIGHT / CELL_SIZE);
