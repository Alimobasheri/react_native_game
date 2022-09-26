import { useEffect, useRef } from "react";
import generateLevelEntities from "../helpers/generateLevelEntities";
import { level1Entities } from "../../Levels/level1";
import { level2Entities } from "../../Levels/level2";

export default function useLevel({ engine, levelNumber }) {
  const entities = useRef({});

  const resetEntities = () => {
    engine.current.swap(
      generateLevelEntities({ engine, levelEntities: getLevelEntities() })
    );
  };

  const getLevelEntities = () => {
    switch (levelNumber) {
      case 1:
        return level1Entities;
      case 2:
        return level2Entities;
      default:
        return;
    }
  };

  useEffect(() => {
    engine.current.swap(
      generateLevelEntities({ engine, levelEntities: getLevelEntities() })
    );
  }, [levelNumber]);

  return {
    entities: entities.current,
    resetEntities,
  };
}
