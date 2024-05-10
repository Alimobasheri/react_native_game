import { useRef, useEffect } from "react";
import {
  View,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
} from "react-native";

export default function RightAngle({
  id,
  degree,
  positionLeft,
  positionTop,
  backgroundColor,
  engine,
}) {
  const animatedDegree = useRef(new Animated.Value(degree)).current;

  const rotation = animatedDegree.interpolate({
    inputRange: [0, 360],
    outputRange: ["0deg", "360deg"],
  });
  useEffect(() => {
    Animated.timing(animatedDegree, {
      toValue: degree,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [degree]);

  const handleOnPress = () => {
    typeof engine?.current?.dispatch === "function" &&
      engine.current.dispatch({ type: "tile-touch", payload: id });
  };
  return (
    <Animated.View
      style={[
        styles.root,
        {
          position: "absolute",
          left: positionLeft,
          top: positionTop,
          backgroundColor,
          transform: [{ rotate: rotation }],
        },
      ]}
    >
      <TouchableWithoutFeedback onPress={handleOnPress}>
        <View style={[styles.shape]} />
      </TouchableWithoutFeedback>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: 50,
    height: 50,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  shape: {
    position: "relative",
    width: 35,
    height: 35,
    borderLeftWidth: 7,
    borderLeftColor: "white",
    borderTopWidth: 7,
    borderTopColor: "white",
  },
});
