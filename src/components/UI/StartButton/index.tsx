import React, { FC, useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  GestureResponderEvent,
  useWindowDimensions,
} from "react-native";
import Animated, {
  Easing,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  withSpring,
} from "react-native-reanimated";
import { FontAwesome5 } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { AntDesign } from "@expo/vector-icons";
type StartButtonProps = {
  onPress: (event: GestureResponderEvent) => void;
};

const StartButton: FC<StartButtonProps> = ({ onPress }) => {
  const { width, height } = useWindowDimensions();
  const styles = useStyles(width);
  const scaleAnim = useSharedValue(0);
  const tapAnim = useSharedValue(1);
  const shineAnim = useSharedValue(0);

  useEffect(() => {
    scaleAnim.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 500, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    shineAnim.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.linear }),
      -1,
      false
    );
  }, [scaleAnim, shineAnim]);

  const handlePressIn = () => {
    tapAnim.value = withTiming(0.9, {
      duration: 100,
      easing: Easing.out(Easing.quad),
    });
  };

  const handlePressOut = (event: GestureResponderEvent) => {
    tapAnim.value = withSpring(1, {
      damping: 3,
      stiffness: 200,
    });
    onPress(event);
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scaleAnim.value }],
    };
  });

  const tapAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: tapAnim.value }],
    };
  });

  const shineAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: shineAnim.value * 200 - 100 }],
    };
  });

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.button}
      >
        {/* <Animated.View style={[styles.shineContainer, shineAnimatedStyle]}>
          <LinearGradient
            colors={["transparent", "rgba(255, 255, 255, 0.4)", "transparent"]}
            style={styles.shine}
            start={{ x: 0, y: 1 }}
            end={{ x: 1, y: 1 }}
          />
        </Animated.View> */}
        <Animated.Text
          style={[{ color: "white", fontWeight: "bold" }, tapAnimatedStyle]}
        >
          SWIPE UP TO PLAY
        </Animated.Text>
        <View style={{ marginLeft: 6 }}>
          <AntDesign name="up" size={20} color="white" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const useStyles = (width: number) => {
  return StyleSheet.create({
    container: {
      position: "absolute",
      alignItems: "center",
      justifyContent: "center",
      top: "90%",
      left: width / 2 - 150,
      maxWidth: 300,
      width: 300,
    },
    button: {
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      // borderRadius: 12,
      // backgroundColor: "#4a70c2",
      // padding: 12,
      // borderRightWidth: 3,
      // borderBottomWidth: 3,
      // borderRightColor: "#0a1a33",
      // borderBottomColor: "#0a1a33",
      overflow: "hidden",
    },
    shineContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },
    shine: {
      width: "200%",
      height: "100%",
    },
    image: {
      width: 50,
      height: 50,
    },
  });
};

export default StartButton;
