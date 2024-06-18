import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import React from "react";
import Game from "../Game";
import StartButton from "../../components/StartButton";
import { useGameState } from "../../store/useGameState";

const Overlay = () => {
  const { width, height } = useWindowDimensions();
  const { isGameRunning } = useGameState();
  return (
    <View
      style={[
        styles.root,
        { width, height, minWidth: width, minHeight: height },
      ]}
    >
      {/* {!isGameRunning && (
        <View
          style={[styles.overlayRoot, { minWidth: width, minHeight: height }]}
        >
          <StartButton />
        </View>
      )} */}
      <View style={styles.gameRoot}>
        <Game />
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
    backgroundColor: "red",
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
