import { useRef, useState, useMemo, memo } from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { GameEngine } from "react-native-game-engine";
import GameLoop from "../../systems/GameLoop";
import { touches } from "../../systems/touches";
import useLevel from "../../core/hooks/useLevel";
import LevelComplete from "../LevelComplete";
import { useGameState } from "../../store/useGameState";
import { Canvas, LinearGradient, vec, Rect } from "@shopify/react-native-skia";

const RenderEntity = ({ entity, screen, layout }) => {
  if (typeof entity.renderer === "object")
    return <entity.renderer.type screen={screen} layout={layout} {...entity} />;
  else if (typeof entity.renderer === "function")
    return <entity.renderer screen={screen} layout={layout} {...entity} />;
};

const Render = ({ entities, screen, layout }) => {
  const canvasStyle = useMemo(
    () => ({
      width: screen.width,
      height: screen.height,
      position: "absolute",
      top: 0,
      left: 0,
    }),
    [screen.width, screen.height]
  );

  const background = useMemo(() => {
    return (
      <Rect x={0} y={0} width={screen.width} height={screen.height}>
        <LinearGradient
          start={vec(0, screen.height)}
          end={vec(screen.width, 0)}
          colors={["#62cff4", "#2c67f2"]}
          transform={[{ rotate: 90 }]}
          origin={{ x: screen.width / 2, y: screen.height / 2 }}
        />
      </Rect>
    );
  }, [screen.width, screen.height]);
  return (
    <Canvas style={canvasStyle}>
      {background}
      {Object.keys(entities)
        .filter((key) => entities[key].renderer)
        .map((key) => {
          let entity = entities[key];
          return (
            <RenderEntity
              key={key}
              entity={entity}
              screen={screen}
              layout={layout}
            />
          );
        })}
    </Canvas>
  );
};

const renderer = (entities, screen, layout) => {
  if (!entities || !screen || !layout) return null;
  return <Render entities={entities} screen={screen} layout={layout} />;
};

export default function Game() {
  const { isGameRunning, stopGame, startGame } = useGameState();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const engine = useRef();
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [levelNumber, setLevelNumber] = useState(1);
  const { entities, resetEntities, gameLoop } = useLevel({
    engine,
    levelNumber,
    windowWidth,
    windowHeight,
  });
  const onNextLevel = () => {
    setLevelNumber(levelNumber + 1);
    startGame();
    setTimeout(() => setShowLevelComplete(false), 300);
  };
  const onReplay = () => {
    resetEntities();
    startGame();
    setTimeout(() => setShowLevelComplete(false), 300);
  };
  return (
    <View style={styles.container}>
      <GameEngine
        ref={engine}
        style={{
          width: "100%",
          height: "100%",
          flex: null,
        }}
        entities={entities}
        systems={[gameLoop, touches]}
        running={isGameRunning}
        // onEvent={(e) => {
        //   switch (e) {
        //     case "level-success":
        //       stopGame();
        //       setTimeout(() => setShowLevelComplete(true), 300);
        //       return;
        //     case "game_over":
        //       stopGame();
        //       setTimeout(() => onReplay(), 3000);
        //       return;
        //   }
        // }}
        renderer={renderer}
      />
      {showLevelComplete && <LevelComplete {...{ onReplay, onNextLevel }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "",
  },
});
