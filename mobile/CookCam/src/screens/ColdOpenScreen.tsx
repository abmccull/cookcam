import React, { useEffect, useRef } from "react";
import { View, StyleSheet, SafeAreaView, Animated } from "react-native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../App";
import AIChefIcon from "../components/AIChefIcon";

interface ColdOpenScreenProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
}

const ColdOpenScreen: React.FC<ColdOpenScreenProps> = ({ navigation }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Start logo pulse animation
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    );

    pulseAnimation.start();

    // Navigate to welcome screen after splash animation
    const timer = setTimeout(() => {
      navigation.replace("Welcome");
    }, 1500);

    return () => {
      pulseAnimation.stop();
      clearTimeout(timer);
    };
  }, [navigation, pulseAnim]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.logoContainer,
            {
              transform: [{ scale: pulseAnim }],
            },
          ]}
        >
          <AIChefIcon size={120} />
        </Animated.View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2D1B69",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
});

export default ColdOpenScreen;
