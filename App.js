import { useRef, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import {
  TouchableOpacity,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { GameEngine } from "react-native-game-engine";
import {
  GRID_SIZE,
  GRID_WIDTH,
  GRID_HEIGHT,
  CELL_SIZE,
} from "./src/constants/game";
import Head from "./src/components/Head";
import Food from "./src/components/Food";
import Tail from "./src/components/Tail";
import randomPosition from "./src/core/helpers/randomPosition";
import GameLoop from "./src/systems/GameLoop";

const defaultEntities = {
  head: {
    position: [0, 0],
    size: CELL_SIZE,
    updateFrequency: 10,
    nextMove: 10,
    xspeed: 1,
    yspeed: 0,
    renderer: <Head />,
  },
  food: {
    position: [
      randomPosition(0, GRID_WIDTH - 1),
      randomPosition(0, GRID_HEIGHT - 1),
    ],
    size: CELL_SIZE,
    renderer: <Food />,
  },
  tail: {
    size: CELL_SIZE,
    elements: [],
    renderer: <Tail />,
  },
};

export default function App() {
  const boardSize = GRID_SIZE * CELL_SIZE;
  const engine = useRef();
  const [isGameRunning, setIsGameRunning] = useState(true);
  const resetGame = () => {
    engine.current.swap({
      head: {
        position: [0, 0],
        size: CELL_SIZE,
        updateFrequency: 10,
        nextMove: 10,
        xspeed: 1,
        yspeed: 0,
        renderer: <Head />,
      },
      food: {
        position: [
          randomPosition(0, GRID_WIDTH - 1),
          randomPosition(0, GRID_HEIGHT - 1),
        ],
        size: CELL_SIZE,
        renderer: <Food />,
      },
      tail: {
        size: CELL_SIZE,
        elements: [],
        renderer: <Tail />,
      },
    });
    setIsGameRunning(true);
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <StatusBar style="auto" />
          <GameEngine
            ref={engine}
            style={{
              width: GRID_WIDTH * CELL_SIZE,
              height: GRID_HEIGHT * CELL_SIZE,
              flex: null,
              backgroundColor: "yellow",
            }}
            entities={defaultEntities}
            systems={[GameLoop]}
            running={isGameRunning}
            onEvent={(e) => {
              switch (e) {
                case "game-over":
                  alert("Game Over!");
                  setIsGameRunning(false);
                  return;
              }
            }}
          />
          <View style={styles.controlContainer}>
            <View style={styles.controllerRow}>
              <TouchableOpacity
                onPress={() => engine.current.dispatch("move-up")}
              >
                <View style={styles.controlBtn} />
              </TouchableOpacity>
            </View>
            <View style={styles.controllerRow}>
              <TouchableOpacity
                onPress={() => engine.current.dispatch("move-left")}
              >
                <View style={styles.controlBtn} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => engine.current.dispatch("move-down")}
              >
                <View style={styles.controlBtn} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => engine.current.dispatch("move-right")}
              >
                <View style={styles.controlBtn} />
              </TouchableOpacity>
            </View>
            {/* <View style={styles.controllerRow}>
              <TouchableOpacity
                onPress={() => engine.current.dispatch("move-down")}
              >
                <View style={styles.controlBtn} />
              </TouchableOpacity>
            </View> */}
            {!isGameRunning && (
              <View style={styles.controllerRow}>
                <TouchableOpacity style={{ width: 200 }} onPress={resetGame}>
                  <Text
                    style={{
                      color: "white",
                      marginTop: 15,
                      fontSize: 22,
                      padding: 10,
                      backgroundColor: "grey",
                      borderRadius: 10,
                    }}
                  >
                    Start New Game
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  controlContainer: {
    marginTop: 10,
    position: "absolute",
    width: GRID_WIDTH,
    bottom: 20,
    paddingHorizontal: GRID_WIDTH / 4,
  },
  controllerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  controlBtn: {
    backgroundColor: "#33333309",
    width: 100,
    height: 100,
    marginLeft: 20,
    marginTop: 20,
  },
});
