import RightAngle from "../components/RightAngle";
import { ENTITY_TYPES } from "../constants/game";
import { Dimensions } from "react-native";

const { width: windowWidth, height: windowHeight } = Dimensions.get("screen");

export const level2Entities = {
  1: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 - 25,
    positionTop: windowHeight / 2 - 25,
    degree: 0,
    id: 1,
    backgroundColor: "red",
  },
  2: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 + 25,
    positionTop: windowHeight / 2 - 25,
    degree: 180,
    id: 2,
    backgroundColor: "#0487D9",
  },
  3: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 - 25,
    positionTop: windowHeight / 2 + 25,
    degree: 90,
    id: 3,
    backgroundColor: "green",
  },
  4: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 + 25,
    positionTop: windowHeight / 2 + 25,
    degree: 180,
    id: 4,
    backgroundColor: "#F29F05",
  },
  5: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 + 75,
    positionTop: windowHeight / 2 - 25,
    degree: 90,
    id: 5,
    backgroundColor: "red",
  },
  6: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 - 75,
    positionTop: windowHeight / 2 - 25,
    degree: 180,
    id: 6,
    backgroundColor: "#0487D9",
  },
  7: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 + 75,
    positionTop: windowHeight / 2 + 25,
    degree: 90,
    id: 7,
    backgroundColor: "green",
  },
  8: {
    renderer: <RightAngle />,
    type: ENTITY_TYPES.TILE,
    positionLeft: windowWidth / 2 - 75,
    positionTop: windowHeight / 2 + 25,
    degree: 180,
    id: 8,
    backgroundColor: "#F29F05",
  },
  winningBoard: {
    type: ENTITY_TYPES.WIN_BOARD,
    board: {
      1: { degree: 90 },
      2: { degree: 0 },
      3: { degree: 180 },
      4: { degree: 270 },
      5: { degree: 90 },
      6: { degree: 0 },
      7: { degree: 180 },
      8: { degree: 270 },
    },
  },
};
