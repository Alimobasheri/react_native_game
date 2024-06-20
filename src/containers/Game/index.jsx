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
  console.log("🚀 ~ Game ~ waterSurfaceY:", waterSurfaceY);

  const shipRatio = 451 / 942;
  const shipSize = [windowWidth * 0.15, windowWidth * 0.15 * shipRatio];

  // Create ship, sea, and initial boats
  const ship = Matter.Bodies.rectangle(
    windowWidth / 2,
    waterSurfaceY - (windowWidth * 0.1) / 2,
    shipSize[0],
    shipSize[1],
    { label: "ship" }
  );
  const initialBoats = [];

  const boatRatio = 59.5 / 256;
  const boatSize = [windowWidth * 0.9, windowWidth * 0.9 * boatRatio];

  // for (let i = 0; i < 8; i++) {
  //   const boat = Matter.Bodies.rectangle(
  //     windowWidth + 1000,
  //     windowHeight + 1000,
  //     boatSize[0],
  //     boatSize[1],
  //     { label: `boat_${i}`, isStatic: true, isAttacking: false }
  //   );
  //   initialBoats.push(boat);
  //   Matter.World.add(engine.world, boat);
  // }

  Matter.World.add(engine.world, [ship]);

  return (
    <GameEngine
      systems={[createWaveSystem()]}
      renderer={renderer}
      entities={{
        physics: {
          engine,
          world: engine.world,
        },
        ship: {
          body: ship,
          size: shipSize,
          renderer: EntityRenderer,
          isShip: true,
          createdFrame: 1,
          trail: [],
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
        windowWidth,
        windowHeight,
        health: {
          value: 100,
        },
        waveCount: 0,
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
