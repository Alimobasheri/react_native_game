import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import React, { FC, useRef } from "react";
import Game from "../Game";
import StartButton from "../../components/UI/StartButton";
import { useGameState } from "../../store/useGameState";

const Overlay: FC<{}> = () => {
  const { width, height } = useWindowDimensions();
  const { isGameRunning, startGame, stopGame } = useGameState();
  const gameRef = useRef();
  const onStartPress = () => {
    if (isGameRunning) {
      stopGame();
      gameRef.current.gameEngineRef.current.dispatch("gameOver");
    } else {
      startGame();
      gameRef.current.gameEngineRef.current.dispatch("startGame");
    }
  };
  return (
    <View
      style={[
        styles.root,
        { width, height, minWidth: width, minHeight: height },
      ]}
    >
      {!isGameRunning && (
        <View
          style={[styles.overlayRoot, { minWidth: width, minHeight: height }]}
        >
          <StartButton onPress={onStartPress} />
        </View>
      )}
      <View style={styles.gameRoot}>
        <Game ref={gameRef} />
      </View>
    </View>
  );
};

export default Overlay;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "green",
  },
  overlayRoot: {
    position: "absolute",
    backgroundColor: "transparent",
    zIndex: 2,
  },
  gameRoot: {
    position: "absolute",
    width: "100%",
    height: "100%",
    // zIndex: 4,
    top: 0,
    left: 0,
  },
});
