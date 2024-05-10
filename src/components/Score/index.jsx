import { View, StyleSheet } from "react-native";
import { Text } from "@shopify/react-native-skia";

const ScoreRenderer = ({ value, position }) => {
  return (
    <Text
      x={position.x}
      y={position.y}
      color={"purple"}
      text={`Score: ${value}`}
    />
  );
};

const styles = StyleSheet.create({
  root: {
    position: "absolute",
  },
  text: {
    fontWeight: "bold",
    fontSize: 32,
    color: "purple",
  },
});

export default function Score({ position, initialValue }) {
  return {
    value: initialValue,
    position,
    renderer: <ScoreRenderer />,
  };
}
