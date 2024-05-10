import { View, StyleSheet } from "react-native";
import { Text } from "@shopify/react-native-skia";

const HealthRenderer = ({ value, position }) => {
  return (
    <Text
      x={position.x}
      y={position.y}
      text={`Health: ${value}`}
      color={"green"}
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
    color: "green",
  },
});

export default function Health({ position, initialValue }) {
  return {
    value: initialValue,
    position,
    renderer: <HealthRenderer />,
  };
}
