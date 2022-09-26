import { useRef, useState, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { GameEngine } from "react-native-game-engine";
import GameLoop from "./src/systems/GameLoop";
import useLevel from "./src/core/hooks/useLevel";
import LevelComplete from "./src/containers/LevelComplete";

export default function App() {
  const engine = useRef();
  const [isGameRunning, setIsGameRunning] = useState(true);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [levelNumber, setLevelNumber] = useState(1);
  const { entities, resetEntities } = useLevel({ engine, levelNumber });
  const onNextLevel = () => {
    setLevelNumber(levelNumber + 1);
    setIsGameRunning(true);
    setTimeout(() => setShowLevelComplete(false), 300);
  };
  const onReplay = () => {
    resetEntities();
    setIsGameRunning(true);
    setTimeout(() => setShowLevelComplete(false), 300);
  };
  return (
    <SafeAreaView style={{ flex: 1 }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <View style={styles.container}>
          <StatusBar style="auto" />
          <GameEngine
            ref={engine}
            style={{
              width: "100%",
              height: "100%",
              flex: null,
            }}
            entities={entities}
            systems={[GameLoop]}
            running={isGameRunning}
            onEvent={(e) => {
              switch (e) {
                case "level-success":
                  setIsGameRunning(false);
                  setTimeout(() => setShowLevelComplete(true), 300);
                  return;
              }
            }}
          />
        </View>
        {showLevelComplete && <LevelComplete {...{ onReplay, onNextLevel }} />}
      </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#68FEBA",
    justifyContent: "center",
    alignItems: "center",
  },
});
