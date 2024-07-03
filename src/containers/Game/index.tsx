import React, { useRef, useMemo } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { GameEngine } from "react-native-game-engine";
import Matter from "matter-js";
import { Canvas, Path, Rect } from "@shopify/react-native-skia";
import { LinearGradient, vec, Skia, Group } from "@shopify/react-native-skia";
import { createWaveSystem } from "../../systems/waveSystems";
import { WaveRenderer } from "../../components/Wave";
import { EntityRenderer } from "../../components/Entity";
import { Sea } from "@/Game/Entities/Sea/Sea";
import { ENTITIES_KEYS, getSeaConfigDefaults } from "@/constants/configs";
import { TouchSystem } from "@/systems/TouchSystem/TouchSystem";
import { SeaSystem } from "@/systems/SeaSystem/SeaSystem";
import { ShipFactory } from "@/Game/Factories/ShipFactory/ShipFactory";
import { SHIP_BUILDS } from "@/constants/ships";
import { PhysicsSystem } from "@/systems/PhysicsSystem/PhysicsSystem";
import { BoatSystem } from "@/systems/BoatSystem/BoatSystem";
import { GameLoopSystem } from "@/systems/GameLoopSystem/GameLoopSystem";
import { ShipSystem } from "@/systems/ShipSystem/ShipSystem";
import { CollisionsSystem } from "@/systems/CollisionsSystem/CollisionsSystem";

const RenderEntity = ({ entity, screen, layout }) => {
  if (typeof entity.renderer === "object")
    return <entity.renderer.type screen={screen} layout={layout} {...entity} />;
  else if (typeof entity.renderer === "function")
    return <entity.renderer screen={screen} layout={layout} entity={entity} />;
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
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const gameLoopSystem = new GameLoopSystem();

  const sea = new Sea(getSeaConfigDefaults(windowWidth, windowHeight));
  const waterSurfaceY = sea.getOriginalWaterSurfaceY();

  const touchSystem = new TouchSystem();
  const seaSystem = new SeaSystem();
  const collisionsSystem = new CollisionsSystem();
  const physicsSystem = new PhysicsSystem();
  const shipSystem = new ShipSystem();
  const boatSystem = new BoatSystem({
    windowWidth,
    windowHeight,
    originalWaterSUrfaceY: waterSurfaceY,
  });

  const shipFactory = new ShipFactory({ windowWidth });
  const ship = shipFactory.create({
    type: SHIP_BUILDS.WAR_SHIP,
    x: windowWidth / 2,
    y: waterSurfaceY - (windowWidth * 0.1) / 2,
  });
  if (ship?.body) physicsSystem.addBodyToWorld(ship.body);

  return (
    <GameEngine
      systems={[
        gameLoopSystem.systemManger,
        touchSystem.systemManger,
        seaSystem.systemManger,
        collisionsSystem.systemManger,
        physicsSystem.systemManger,
        shipSystem.systemManger,
        boatSystem.systemManger,
      ]}
      renderer={renderer}
      entities={{
        [ENTITIES_KEYS.SHIP]: ship,
        [ENTITIES_KEYS.SEA]: sea,
        [ENTITIES_KEYS.GAME_LOOP_SYSTEM]: gameLoopSystem,
        [ENTITIES_KEYS.TOUCH_SYSTEM_INSTANCE]: touchSystem,
        [ENTITIES_KEYS.SHIP_SYSTEM_INSTANCE]: shipSystem,
        [ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE]: boatSystem,
        [ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE]: collisionsSystem,
        [ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE]: physicsSystem,
        [ENTITIES_KEYS.SEA_SYSTEM_INSTANCE]: seaSystem,
        // health: {
        //   value: 100,
        // },
        // waveCount: 0,
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
