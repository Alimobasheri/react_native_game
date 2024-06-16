import { useEffect, useRef } from "react";
import generateLevelEntities from "../helpers/generateLevelEntities";
import { level1Entities } from "../../Levels/level1";
import { level2Entities } from "../../Levels/level2";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Level1GameLoop from "../../Levels/level1GameLoop";

const mapLevelToGameLoop = {
  1: Level1GameLoop,
};

export default function useLevel({
  engine,
  levelNumber,
  windowWidth,
  isUsingCanvas,
}) {
  const entities = useRef({});
  const insets = useSafeAreaInsets();

  const resetEntities = () => {
    engine.current.swap(
      generateLevelEntities({ engine, levelEntities: getLevelEntities() })
    );
  };

  const getLevelEntities = () => {
    switch (levelNumber) {
      case 1:
        return level1Entities({ insets, windowWidth, isUsingCanvas });
      case 2:
        return level2Entities();
      default:
        return;
    }
  };

  useEffect(() => {
    engine.current.swap(
      generateLevelEntities({
        engine,
        levelEntities: getLevelEntities(),
        gameLoop: mapLevelToGameLoop[levelNumber.toString()],
      })
    );
  }, [levelNumber]);

  return {
    entities: entities.current,
    resetEntities,
    gameLoop: mapLevelToGameLoop[levelNumber.toString()],
  };
}
