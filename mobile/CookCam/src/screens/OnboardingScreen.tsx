import React, { useState, useRef } from "react";
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ScrollView,
  Alert,
} from "react-native";
import {
  Camera,
  ChefHat,
  Trophy,
  ChevronRight,
} from "lucide-react-native";
// import Animated, {
//   useAnimatedStyle,
//   useSharedValue,
//   withSpring,
//   interpolate,
// } from 'react-native-reanimated';

interface OnboardingScreenProps {
  navigation: any; // TODO: Type with proper Navigation prop
  route: {
    params?: {
      isCreator?: boolean;
    };
  };
}

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  navigation,
  route,
}) => {
  const { isCreator } = route.params || {};
  const [currentPage, setCurrentPage] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  // const scrollX = useSharedValue(0);

  const onboardingData = [
    {
      icon: Camera,
      title: "Point",
      subtitle: "Snap a photo of your ingredients",
      description: "Our AI instantly identifies what you have",
      color: "#FF6B35",
    },
    {
      icon: ChefHat,
      title: "Cook",
      subtitle: "Get personalized recipes",
      description: "Tailored to your preferences and skill level",
      color: "#66BB6A",
    },
    {
      icon: Trophy,
      title: "Earn",
      subtitle: "Level up your cooking game",
      description: "Complete recipes to earn XP and unlock badges",
      color: "#2D1B69",
    },
  ];

  const handleScroll = (event: { nativeEvent: { contentOffset: { x: number } } }) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    setCurrentPage(page);
    // scrollX.value = offsetX;
  };

  const handleNext = () => {
    if (currentPage < onboardingData.length - 1) {
      const nextPage = currentPage + 1;
      scrollViewRef.current?.scrollTo({
        x: nextPage * SCREEN_WIDTH,
        animated: true,
      });
      setCurrentPage(nextPage);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = () => {
    // Show push notification permission prompt
    Alert.alert(
      "Stay in the Loop! 🔔",
      "Get notified about:\n• Daily streak reminders\n• New recipes\n• XP milestones\n• Special challenges",
      [
        {
          text: "Not Now",
          style: "cancel",
          onPress: () => navigateToMain(),
        },
        {
          text: "Enable Notifications",
          onPress: () => {
            // TODO: Request push notification permissions
            // PushNotification.requestPermissions();
            navigateToMain();
          },
        },
      ],
    );
  };

  const navigateToMain = () => {
    navigation.navigate("AccountGate", {
      requiredFeature: "onboarding_complete",
      onContinue: () => {
        // This will be handled by AccountGateScreen
      }
    });
  };

  const renderPage = (item: typeof onboardingData[0], index: number) => {
    const Icon = item.icon;

    // const animatedStyle = useAnimatedStyle(() => {
    //   const inputRange = [
    //     (index - 1) * SCREEN_WIDTH,
    //     index * SCREEN_WIDTH,
    //     (index + 1) * SCREEN_WIDTH,
    //   ];

    //   const scale = interpolate(
    //     scrollX.value,
    //     inputRange,
    //     [0.8, 1, 0.8],
    //   );

    //   const opacity = interpolate(
    //     scrollX.value,
    //     inputRange,
    //     [0.5, 1, 0.5],
    //   );

    //   return {
    //     transform: [{scale}],
    //     opacity,
    //   };
    // });

    return (
      <View key={index} style={styles.page}>
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: item.color }]}>
            <Icon size={60} color="#F8F8FF" />
          </View>
        </View>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    );
  };

  const renderDots = () => {
    return (
      <View style={styles.dotsContainer}>
        {onboardingData.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentPage === index && styles.activeDot]}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip Button */}
      <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>

      {/* Content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => renderPage(item, index))}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomContainer}>
        {renderDots()}

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextButtonText}>
            {currentPage === onboardingData.length - 1 ? "Get Started" : "Next"}
          </Text>
          <ChevronRight size={20} color="#F8F8FF" />
        </TouchableOpacity>
      </View>

      {/* Creator Badge */}
      {isCreator && (
        <View style={styles.creatorBadge}>
          <Text style={styles.creatorBadgeText}>🎉 Creator Account</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F8FF",
  },
  skipButton: {
    position: "absolute",
    top: 60,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    color: "#8E8E93",
  },
  scrollView: {
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 40,
  },
  iconCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#2D1B69",
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#2D1B69",
    marginBottom: 12,
    textAlign: "center",
  },
  description: {
    fontSize: 16,
    color: "#8E8E93",
    textAlign: "center",
    lineHeight: 24,
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    alignItems: "center",
  },
  dotsContainer: {
    flexDirection: "row",
    marginBottom: 30,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#E5E5E7",
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: "#FF6B35",
    width: 24,
  },
  nextButton: {
    backgroundColor: "#FF6B35",
    borderRadius: 28,
    paddingHorizontal: 32,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  nextButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#F8F8FF",
    marginRight: 8,
  },
  creatorBadge: {
    position: "absolute",
    top: 100,
    alignSelf: "center",
    backgroundColor: "#66BB6A",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  creatorBadgeText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#F8F8FF",
  },
});

export default OnboardingScreen;
