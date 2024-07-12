import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from "react";
import { StyleSheet, useWindowDimensions } from "react-native";
import { GameEngine } from "react-native-game-engine";
import { Canvas, Rect, Skia, TileMode } from "@shopify/react-native-skia";
import { LinearGradient, vec } from "@shopify/react-native-skia";
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
import { ScreenTopUI } from "@/Game/Entities/ScreenTopUI/ScreenTopUI";
import { UISystem } from "@/systems/UISystem/UISystem";
import { GAME_STATE } from "@/systems/GameLoopSystem/types";
import { useGameState } from "@/store/useGameState";
import { MountainBackground } from "@/Game/Entities/MountainBackground/MountainBackground";
import { SeaGroupRenderer } from "@/components/SeaGroupRenderer";

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
    const paint = Skia.Paint();

    // Colors for the gradient
    // const colors = [
    //   "#0000FF", // Blue
    //   "#0044FF",
    //   "#0088FF",
    //   "#00CCFF",
    //   "#00FFFF",
    //   "#00FFCC",
    //   "#00FF88",
    //   "#00FF44",
    //   "#00FF00", // Very bright green
    // ];

    // const colors = [
    //   "#87CEEB", // Light blue
    //   "#ADD8E6",
    //   "#B0E0E6",
    //   "#AFEEEE",
    //   "#E0FFFF",
    //   "#E0FFD1",
    //   "#F0E68C",
    //   "#FFFFE0",
    //   "#FFFFF0", // Very light green/yellow
    // ];

    const colors = [
      "#0A0A23",
      "#0B0B2A",
      "#0D0E34",
      "#10113D",
      "#131448",
      "#171955",
      "#1A1D62",
      "#1E226F",
      "#22277D",
      "#262C8C",
      "#2A319B",
      "#2E36AB",
      "#323BBA",
      "#3741CA",
      "#3C46DA",
      "#414BEB",
      "#4650FC",
    ];

    // Define the positions for each color
    const positions = colors.map((_, index) => index / (colors.length - 1));

    // Create the linear gradient
    const gradient = Skia.Shader.MakeLinearGradient(
      { x: 0, y: 0 },
      { x: 0, y: screen.height * 0.7 },
      colors.map((col) => Skia.Color(col)),
      positions,
      TileMode.Clamp
    );

    // Apply the gradient to the paint
    paint.setShader(gradient);
    return (
      <Rect
        x={0}
        y={0}
        width={screen.width}
        height={screen.height}
        paint={paint}
      ></Rect>
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

const Game = forwardRef((props, ref) => {
  const { isGameRunning } = useGameState();
  const gameEngineRef = useRef<GameEngine | null>();
  useImperativeHandle(ref, () => ({
    gameEngineRef,
  }));
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();

  const gameLoopSystem = new GameLoopSystem(GAME_STATE.PREVIEW);

  const screenTopUI = new ScreenTopUI(0, 0);

  const sea = new Sea(getSeaConfigDefaults(windowWidth, windowHeight));
  const waterSurfaceY = sea.getOriginalWaterSurfaceY();

  const uiSystem = new UISystem();
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

  const moutnainBackground = new MountainBackground();

  const shipFactory = new ShipFactory({ windowWidth });
  const ship = shipFactory.create({
    type: SHIP_BUILDS.WAR_SHIP,
    x: windowWidth / 2,
    y: waterSurfaceY - (windowWidth * 0.1) / 2,
  });
  if (ship?.body) physicsSystem.addBodyToWorld(ship.body);

  const seaGroup = { entities: { sea, ship }, renderer: SeaGroupRenderer };
  return (
    <GameEngine
      ref={(ref) => (gameEngineRef.current = ref)}
      systems={[
        gameLoopSystem.systemManger,
        uiSystem.systemManger,
        touchSystem.systemManger,
        seaSystem.systemManger,
        collisionsSystem.systemManger,
        physicsSystem.systemManger,
        shipSystem.systemManger,
        boatSystem.systemManger,
      ]}
      renderer={renderer}
      entities={{
        [ENTITIES_KEYS.MOUNTAIN_BACKGROUND]: moutnainBackground,
        [ENTITIES_KEYS.SEA_GROUP]: seaGroup,
        [ENTITIES_KEYS.UI_SYSTEM_INSTANCE]: uiSystem,
        [ENTITIES_KEYS.GAME_LOOP_SYSTEM]: gameLoopSystem,
        [ENTITIES_KEYS.TOUCH_SYSTEM_INSTANCE]: touchSystem,
        [ENTITIES_KEYS.SHIP_SYSTEM_INSTANCE]: shipSystem,
        [ENTITIES_KEYS.BOAT_SYSTEM_INSTANCE]: boatSystem,
        [ENTITIES_KEYS.COLLISIONS_SYSTEM_INSTANCE]: collisionsSystem,
        [ENTITIES_KEYS.PHYSICS_SYSTEM_INSTANCE]: physicsSystem,
        [ENTITIES_KEYS.SEA_SYSTEM_INSTANCE]: seaSystem,
        [ENTITIES_KEYS.SCREEN_TOP_UI]: screenTopUI,
      }}
      style={styles.container}
    />
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "blue",
  },
});

export default Game;
