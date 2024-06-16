import React, { useRef, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { GameEngine } from "react-native-game-engine";
import Matter from "matter-js";
import { Canvas, Path, Rect } from "@shopify/react-native-skia";
import { LinearGradient, vec, Skia, Group } from "@shopify/react-native-skia";
import { createWaveSystem } from "../../systems/waveSystems";
import { WaveRenderer } from "../../components/Wave";
import { EntityRenderer } from "../../components/Entity";

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

const Game = () => {
  const engine = useRef(Matter.Engine.create()).current;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const waterSurfaceY = windowHeight * 0.8;

  // Create ship, sea, and initial boats
  const ship = Matter.Bodies.rectangle(
    windowWidth / 2,
    waterSurfaceY,
    windowWidth * 0.1,
    windowHeight * 0.1
  );
  const initialBoats = [];

  for (let i = 0; i < 1; i++) {
    const boat = Matter.Bodies.rectangle(
      Math.random() * windowWidth,
      waterSurfaceY,
      windowWidth * 0.075,
      windowHeight * 0.05,
      { frictionAir: 0.1 }
    );
    initialBoats.push(boat);
    Matter.World.add(engine.world, boat);
  }

  Matter.World.add(engine.world, [ship]);

  const enemiesAndWaterCollisionDetector = Matter.Detector.create({
    bodies: [...initialBoats.map((boat) => boat.body)],
  });

  return (
    <GameEngine
      systems={[createWaveSystem()]}
      renderer={renderer}
      entities={{
        physics: {
          engine,
          world: engine.world,
          enemiesAndWaterCollisionDetector,
        },
        ship: {
          body: ship,
          size: [windowWidth * 0.1, windowHeight * 0.1],
          renderer: EntityRenderer,
        },
        wave: {
          waves: [],
          renderer: (props) => (
            <WaveRenderer
              {...props}
              windowWidth={windowWidth}
              windowHeight={windowHeight}
              waterSurfaceY={waterSurfaceY}
            />
          ),
        },
        ...initialBoats.reduce((acc, boat, index) => {
          acc[`boat${index}`] = {
            body: boat,
            size: [windowWidth * 0.075, windowHeight * 0.05],
            renderer: EntityRenderer,
            isBoat: true,
          };
          return acc;
        }, {}),
        windowWidth,
        windowHeight,
      }}
      style={styles.container}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "blue",
  },
});

export default Game;
