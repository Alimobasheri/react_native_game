import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React from "react";
import { useGameState } from "../../store/useGameState";

const StartButton = ({}) => {
  const { startGame } = useGameState();
  return (
    <TouchableOpacity onPress={startGame} style={styles.root}>
      <Text>StartButton</Text>
    </TouchableOpacity>
  );
};

export default StartButton;

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    top: "50%",
    left: "50%",
  },
});
