import React, {useRef, useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Image,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
// import { RNCamera } from 'react-native-camera';
import {Camera, Image as ImageIcon, X, Sparkles, ChefHat, Zap, Flame} from 'lucide-react-native';
import {
  Camera as VisionCamera,
  useCameraPermission,
  useCameraDevice,
} from 'react-native-vision-camera';
import {useGamification, XP_VALUES} from '../context/GamificationContext';
import {useAuth} from '../context/AuthContext';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DailyCheckIn from '../components/DailyCheckIn';

interface CameraScreenProps {
  navigation: any;
}

const {width: screenWidth, height: screenHeight} = Dimensions.get('window');

// Simulator detection
const isSimulator = Platform.OS === 'ios' && !Platform.isPad;

// Mock camera images for simulator testing
const MOCK_CAMERA_IMAGES = [
  'file:///Users/abmccull/Desktop/cookcam1/Public/261038-1600x1030-homemade-raw-dog-food-recipes-grain-free.jpg', // Local test image with raw meat and vegetables
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Mixed vegetables
  'https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Fresh produce
  'https://images.unsplash.com/photo-1506368249639-73a05d6f6488?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80', // Cooking ingredients
];

// 100 Fun Food Trivia Facts
const funFacts = [
  "🍯 Honey never spoils! Archaeologists have found pots of honey in ancient Egyptian tombs that are over 3,000 years old and still perfectly edible.",
  "🍌 Bananas are berries, but strawberries aren't! Botanically speaking, berries must have seeds inside their flesh.",
  "🥕 Carrots were originally purple! Orange carrots were developed in the Netherlands in the 17th century.",
  "🍅 Tomatoes were once thought to be poisonous by wealthy Europeans because they ate off pewter plates, which caused lead poisoning.",
  "🥑 Avocados are fruits, not vegetables, and they're actually large berries with a single seed.",
  "🍍 Pineapples take about 18-20 months to grow and each plant only produces one pineapple at a time.",
  "🌶️ Capsaicin, the compound that makes peppers hot, doesn't actually cause physical damage - it just tricks your brain into feeling heat.",
  "🥒 Cucumbers are 96% water, making them one of the most hydrating foods you can eat.",
  "🍎 Apples float in water because they are 25% air by volume.",
  "🧄 Garlic is a natural antibiotic and was used by ancient civilizations to treat various ailments.",
  "🥬 Lettuce is a member of the sunflower family and was originally grown for its seeds, not leaves.",
  "🍋 Lemons contain more sugar than strawberries! They just taste sour because of their high acid content.",
  "🥔 Potatoes were the first vegetable grown in space by NASA and the University of Wisconsin in 1995.",
  "🌽 Corn is grown on every continent except Antarctica and comes in many colors including blue, red, and purple.",
  "🍇 Grapes explode when you put them in the microwave due to their high water content and skin structure.",
  "🥜 Peanuts aren't actually nuts - they're legumes that grow underground, more closely related to beans and peas.",
  "🍓 Strawberries have their seeds on the outside - they're the only fruit that does this!",
  "🥥 Coconut water can be used as a substitute for blood plasma in emergency situations due to its sterile nature.",
  "🍉 Watermelons are 92% water and are technically both a fruit and a vegetable.",
  "🫐 Blueberries are one of the only foods that are truly blue in nature.",
  "🍑 Cherries are a natural source of melatonin, which helps regulate sleep cycles.",
  "🥭 Mangoes are the most consumed fruit in the world, beating out apples and oranges.",
  "🍊 Orange peels contain four times more fiber than the actual fruit inside.",
  "🥦 Broccoli contains more protein per calorie than steak.",
  "🧅 Onions were so valuable in ancient Egypt that they were used as currency to pay workers building the pyramids.",
  "🫒 Olives must be cured or processed before eating - they're naturally very bitter.",
  "🌶️ The spiciest part of a chili pepper is actually the white pith, not the seeds.",
  "🥖 Bread is the most widely consumed food in the world.",
  "🧀 Cheese is the most stolen food item in the world.",
  "🥛 It takes about 10 pounds of milk to make 1 pound of cheese.",
  "🍫 Chocolate was once used as currency by the Aztecs.",
  "☕ Coffee is the second most traded commodity in the world after oil.",
  "🍵 Tea is the most consumed beverage in the world after water.",
  "🌶️ Birds can't taste spicy food because they lack the receptors for capsaicin.",
  "🦐 Shrimp's hearts are in their heads.",
  "🐙 Octopus has three hearts and blue blood.",
  "🥕 Eating too many carrots can actually turn your skin orange due to beta-carotene.",
  "🍋 Lemon trees can produce fruit year-round.",
  "🥒 'Cool as a cucumber' is scientifically accurate - cucumbers can be up to 20 degrees cooler than air temperature.",
  "🍎 The average apple contains about 80 calories and takes more calories to digest than it contains.",
  "🥔 Potatoes are about 80% water.",
  "🍯 A single bee will only produce 1/12th of a teaspoon of honey in its entire lifetime.",
  "🍌 Bananas are naturally radioactive due to their high potassium content.",
  "🥬 Iceberg lettuce has almost no nutritional value - it's mostly water and fiber.",
  "🍅 There are over 10,000 varieties of tomatoes worldwide.",
  "🥑 Mexico produces about 45% of the world's avocados.",
  "🍍 The Philippines is the world's largest producer of pineapples.",
  "🌶️ India grows and consumes the most chilies in the world.",
  "🥒 China is the world's largest producer of cucumbers.",
  "🍎 Kazakhstan is the origin of apples - wild apples still grow there today.",
  "🧄 China produces about 80% of the world's garlic.",
  "🥔 China also produces the most potatoes, followed by India and Russia.",
  "🌽 The United States produces about 40% of the world's corn.",
  "🍇 Italy, France, and Spain are the top wine-producing countries.",
  "🥜 Georgia (the country) produces about 70% of the world's walnuts.",
  "🍓 Turkey is the world's largest producer of strawberries.",
  "🥥 Indonesia is the largest producer of coconuts.",
  "🍉 China produces about 70% of the world's watermelons.",
  "🫐 The United States produces about 90% of the world's blueberries.",
  "🍑 Turkey is also the world's largest producer of cherries.",
  "🥭 India produces about 40% of the world's mangoes.",
  "🍊 Brazil is the largest producer of oranges.",
  "🥦 China produces about 50% of the world's broccoli.",
  "🧅 China is the largest producer of onions.",
  "🫒 Spain produces about 45% of the world's olives.",
  "🥖 France consumes more bread per person than any other country.",
  "🧀 The Netherlands exports the most cheese globally.",
  "🥛 India is the world's largest milk producer.",
  "🍫 Germany consumes the most chocolate per capita.",
  "☕ Brazil produces about 35% of the world's coffee.",
  "🍵 China produces about 45% of the world's tea.",
  "🌶️ The Carolina Reaper is currently the world's hottest chili pepper.",
  "🦐 The mantis shrimp has the most complex eyes in the animal kingdom.",
  "🐙 Octopus can change color and texture to match their surroundings.",
  "🥕 Baby carrots are just regular carrots cut and shaped to look smaller.",
  "🍋 Lemons are actually a hybrid of bitter oranges and citrons.",
  "🥒 Pickles are just cucumbers that have been preserved in vinegar or brine.",
  "🍎 Red apples get their color from anthocyanins, the same compounds in red wine.",
  "🥔 Green potatoes are toxic and should not be eaten due to solanine content.",
  "🍯 Bees visit about 2 million flowers to make one pound of honey.",
  "🍌 Bananas share about 50% of their DNA with humans.",
  "🥬 Spinach loses most of its nutrients within days of being harvested.",
  "🍅 Tomatoes are 94% water.",
  "🥑 Avocados ripen faster when stored with bananas due to ethylene gas.",
  "🍍 Pineapples don't ripen after being picked.",
  "🌶️ Milk is better than water for cooling down spicy food.",
  "🥒 Cucumbers can help reduce bad breath.",
  "🍎 An apple a day may not keep the doctor away, but it does provide good fiber.",
  "🧄 Garlic can help repel mosquitoes when consumed regularly.",
  "🥔 Potato chips were invented by accident in 1853.",
  "🌽 Popcorn is about 4,000 years old and was first made by Native Americans.",
  "🍇 Wine has been made for over 7,000 years.",
  "🥜 Almonds are actually seeds, not nuts.",
  "🍓 Strawberries can help whiten your teeth naturally.",
  "🥥 Coconut milk and coconut water are two different things.",
  "🍉 Eating watermelon can help prevent muscle soreness.",
  "🫐 Blueberries can improve memory and brain function.",
  "🍑 Tart cherries can help you sleep better.",
  "🥭 Mangoes contain over 20 different vitamins and minerals.",
  "🍊 Orange juice has more sugar than Coca-Cola.",
  "🥦 Broccoli is a human invention - it doesn't exist in the wild.",
  "🧅 Crying while cutting onions is caused by sulfur compounds.",
  "🫒 Olive oil becomes toxic when heated to high temperatures.",
  "🌶️ Eating spicy food can boost your metabolism.",
  "🥖 Bread stays fresh longer when stored in the refrigerator.",
  "🧀 Blue cheese gets its color and flavor from mold.",
  "🥛 Lactose intolerance affects about 75% of the world's population.",
  "🍫 Dark chocolate contains antioxidants that are good for heart health.",
  "☕ Coffee beans are actually seeds from coffee cherries.",
  "🍵 Green tea and black tea come from the same plant.",
  "🌶️ Hot sauce can last for years without refrigeration due to its acidity.",
  "🦐 Shrimp turn pink when cooked because heat breaks down their proteins.",
];

// Responsive scaling function
const scale = (size: number) => (screenWidth / 375) * size; // 375 is iPhone X width
const verticalScale = (size: number) => (screenHeight / 812) * size; // 812 is iPhone X height
const moderateScale = (size: number, factor = 0.5) => size + (scale(size) - size) * factor;

const CameraScreen: React.FC<CameraScreenProps> = ({navigation}) => {
  const {hasPermission, requestPermission} = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<VisionCamera>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const {addXP, streak} = useGamification();
  const {user} = useAuth();
  const [hasCookedToday, setHasCookedToday] = useState(false);
  const [showDailyCheckIn, setShowDailyCheckIn] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const xpBadgeScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 30000,
        useNativeDriver: true,
      }),
    ).start();

    // Fade in content
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Animate XP badge
    Animated.spring(xpBadgeScale, {
      toValue: 1,
      tension: 50,
      friction: 7,
      delay: 500,
      useNativeDriver: true,
    }).start();

    // Cycle through fun facts every 8 seconds
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % funFacts.length);
    }, 8000);

    return () => clearInterval(tipInterval);
  }, []);

  // Take actual photo for testing
  const handleTakePhoto = async () => {
    // Simulator detection and mock functionality
    if (isSimulator || !device || !hasPermission) {
      console.log('📱 Simulator detected or no camera - using mock mode');
      
      setIsProcessing(true);
      
      // Haptic feedback when button pressed
      ReactNativeHapticFeedback.trigger('impactMedium', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      
      // Simulate photo capture delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Use the first mock image (our test image)
      const mockImageUri = MOCK_CAMERA_IMAGES[0];
      setPhotoUri(mockImageUri);
      
      ReactNativeHapticFeedback.trigger('notificationSuccess', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      
      // Auto-proceed without popup for seamless experience
      
      await addXP(XP_VALUES.SCAN_INGREDIENTS, 'SCAN_INGREDIENTS');
      
      navigation.navigate('IngredientReview', {
        imageUri: mockImageUri,
        isSimulator: false
      });
      
      setIsProcessing(false);
      return;
    }

    setIsProcessing(true);
    
    // Haptic feedback when button pressed
    ReactNativeHapticFeedback.trigger('impactMedium', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: false,
    });
    
    try {
      if (camera.current) {
        // Take actual photo
        const photo = await camera.current.takePhoto({
          qualityPrioritization: 'balanced',
          flash: 'auto',
        });
        
        console.log('Photo taken:', photo.path);
        setPhotoUri(`file://${photo.path}`);
        
        // Success haptic feedback
        ReactNativeHapticFeedback.trigger('notificationSuccess', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
        
        // Award XP for scanning ingredients
        await addXP(XP_VALUES.SCAN_INGREDIENTS, 'SCAN_INGREDIENTS');
        
        // Navigate to ingredient review with actual image
        navigation.navigate('IngredientReview', {
          imageUri: `file://${photo.path}`
        });
      } else {
        // Camera ref not available - show error
        console.error('Camera ref not available');
        ReactNativeHapticFeedback.trigger('notificationError', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
        Alert.alert(
          'Camera Error',
          'Camera is not available. Please check permissions and try again.',
          [{text: 'OK'}]
        );
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      ReactNativeHapticFeedback.trigger('notificationError', {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
      });
      
      // Show error message instead of fallback
      Alert.alert(
        'Photo Error',
        'Failed to take photo. Please try again.',
        [{text: 'OK'}]
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Calculate responsive sizes
  const cameraPreviewSize = Math.min(screenWidth * 0.8, screenHeight * 0.35);
  const isSmallDevice = screenHeight < 700;

  return (
    <View style={styles.container}>
      {/* Daily Check-In */}
      {showDailyCheckIn && (
        <View style={styles.dailyCheckInContainer}>
          <DailyCheckIn />
          <TouchableOpacity
            style={styles.closeDailyCheckIn}
            onPress={() => setShowDailyCheckIn(false)}
          >
            <X size={24} color="#666" />
          </TouchableOpacity>
        </View>
      )}
      
      {/* Background decoration */}
      <Animated.View 
        style={[
          styles.backgroundDecoration, 
          {
            transform: [{rotate: spin}],
            width: screenWidth * 0.6,
            height: screenWidth * 0.6,
          }
        ]}
      >
        <ChefHat size={screenWidth * 0.6} color="#FF6B35" />
      </Animated.View>

      <View style={styles.content}>
        {/* Header section */}
        <Animated.View 
          style={[
            styles.header,
            {
              opacity: fadeAnim,
              transform: [{translateY: slideAnim}],
            }
          ]}
        >
          <Text style={[styles.headerTitle, isSmallDevice && styles.headerTitleSmall]}>
            Ready to Cook? 🍳
          </Text>
          <Text style={[styles.headerSubtitle, isSmallDevice && styles.headerSubtitleSmall]}>
            Show me what you've got!
          </Text>
        </Animated.View>
        
        {/* Main content area */}
        <View style={styles.mainContent}>
          {/* Camera preview area */}
          <Animated.View 
            style={[
              styles.cameraContainer,
              {
                opacity: fadeAnim,
                transform: [{scale: fadeAnim}],
              }
            ]}
          >
            <View style={[styles.cameraPreview, {
              width: cameraPreviewSize,
              height: cameraPreviewSize,
            }]}>
              <View style={styles.cameraOverlay}>
                <View style={styles.cornerTL} />
                <View style={styles.cornerTR} />
                <View style={styles.cornerBL} />
                <View style={styles.cornerBR} />
                
                {/* Simulator indicator - Hidden for cleaner UI */}
                {false && isSimulator && (
                  <View style={styles.simulatorBadge}>
                    <Text style={styles.simulatorText}>📱 SIMULATOR</Text>
                  </View>
                )}
                
                <Camera size={moderateScale(48)} color="#F8F8FF" strokeWidth={1.5} />
                <Text style={styles.cameraText}>
                  Tap to detect your ingredients
                </Text>
                
                {/* Fun animated elements */}
                <Animated.View 
                  style={[
                    styles.floatingEmoji,
                    styles.emoji1,
                    {transform: [{scale: pulseAnim}]}
                  ]}
                >
                  <Text style={[styles.emojiText, isSmallDevice && styles.emojiTextSmall]}>🥕</Text>
                </Animated.View>
                <Animated.View 
                  style={[
                    styles.floatingEmoji,
                    styles.emoji2,
                    {transform: [{scale: pulseAnim}]}
                  ]}
                >
                  <Text style={[styles.emojiText, isSmallDevice && styles.emojiTextSmall]}>🧄</Text>
                </Animated.View>
              </View>
            </View>
          </Animated.View>
          
          {/* Capture button */}
          <Animated.View style={[styles.captureSection, {opacity: fadeAnim}]}>
            <View style={styles.captureRow}>
              <TouchableOpacity
                style={[styles.captureButton, isProcessing && styles.captureButtonDisabled]} 
                onPress={handleTakePhoto}
                disabled={isProcessing}
                activeOpacity={0.8}>
                {isProcessing ? (
                  <View style={styles.processingContainer}>
                    <ActivityIndicator color="#F8F8FF" />
                    <Text style={styles.processingText}>Magic happening...</Text>
                  </View>
                ) : (
                  <>
                    <View style={[styles.captureButtonOuter, {
                      width: moderateScale(72),
                      height: moderateScale(72),
                      borderRadius: moderateScale(36),
                    }]}>
                      <View style={[styles.captureButtonInner, {
                        width: moderateScale(56),
                        height: moderateScale(56),
                        borderRadius: moderateScale(28),
                      }]} />
                    </View>
                    <Text style={styles.captureText}>SNAP!</Text>
                  </>
                )}
              </TouchableOpacity>
              
              {/* XP Badge - positioned to the right of button */}
              {!isProcessing && (
                <Animated.View 
                  style={[
                    styles.xpBadge,
                    {
                      transform: [{scale: xpBadgeScale}]
                    }
                  ]}
                >
                  <Text style={styles.xpBadgeText}>+{XP_VALUES.SCAN_INGREDIENTS} XP</Text>
                </Animated.View>
              )}
            </View>
          </Animated.View>
        </View>
        
        {/* Bottom section with fun fact */}
        <View style={styles.bottomSection}>
          {/* Fun fact ticker */}
          <Animated.View 
            style={[
              styles.tipContainer,
              {transform: [{scale: pulseAnim.interpolate({
                inputRange: [1, 1.2],
                outputRange: [1, 0.98],
              })}]}
            ]}
          >
            <Zap size={moderateScale(16)} color="#FFB800" />
            <Text style={styles.tipText} numberOfLines={2}>{funFacts[currentTip]}</Text>
          </Animated.View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#2D1B69',
  },
  backgroundDecoration: {
    position: 'absolute',
    top: '30%',
    alignSelf: 'center',
    zIndex: 0,
    opacity: 0.05,
  },
  content: {
    flex: 1,
    paddingHorizontal: scale(20),
    zIndex: 1,
  },
  header: {
    alignItems: 'center',
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(20),
  },
  headerTitle: {
    fontSize: moderateScale(26),
    fontWeight: 'bold',
    color: '#F8F8FF',
    marginBottom: verticalScale(4),
  },
  headerTitleSmall: {
    fontSize: moderateScale(22),
  },
  headerSubtitle: {
    fontSize: moderateScale(15),
    color: 'rgba(248, 248, 255, 0.7)',
  },
  headerSubtitleSmall: {
    fontSize: moderateScale(13),
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(40), // Reduced padding since we have the fun facts section
  },
  cameraContainer: {
    alignItems: 'center',
  },
  cameraPreview: {
    backgroundColor: 'rgba(248, 248, 255, 0.05)',
    borderRadius: moderateScale(24),
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    width: moderateScale(30),
    height: moderateScale(30),
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FF6B35',
  },
  cornerTR: {
    position: 'absolute',
    top: '10%',
    right: '10%',
    width: moderateScale(30),
    height: moderateScale(30),
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FF6B35',
  },
  cornerBL: {
    position: 'absolute',
    bottom: '10%',
    left: '10%',
    width: moderateScale(30),
    height: moderateScale(30),
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderColor: '#FF6B35',
  },
  cornerBR: {
    position: 'absolute',
    bottom: '10%',
    right: '10%',
    width: moderateScale(30),
    height: moderateScale(30),
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderColor: '#FF6B35',
  },
  cameraText: {
    marginTop: verticalScale(16),
    fontSize: moderateScale(16),
    color: '#F8F8FF',
    opacity: 0.7,
  },
  floatingEmoji: {
    position: 'absolute',
  },
  emoji1: {
    top: '15%',
    left: '15%',
  },
  emoji2: {
    top: '15%',
    right: '15%',
  },
  emojiText: {
    fontSize: moderateScale(32),
  },
  emojiTextSmall: {
    fontSize: moderateScale(28),
  },
  captureSection: {
    alignItems: 'center',
    marginTop: verticalScale(20),
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  captureButton: {
    alignItems: 'center',
    position: 'relative',
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  captureButtonOuter: {
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF6B35',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  captureButtonInner: {
    backgroundColor: '#FF8B65',
    borderWidth: 3,
    borderColor: '#F8F8FF',
  },
  captureText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#F8F8FF',
    letterSpacing: 2,
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    marginTop: verticalScale(12),
    fontSize: moderateScale(16),
    color: '#F8F8FF',
  },
  streakReminder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 53, 0.15)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(12),
    gap: scale(8),
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 53, 0.3)',
    alignSelf: 'center',
  },
  streakText: {
    color: '#FF6B35',
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  xpBadge: {
    marginLeft: scale(20),
    backgroundColor: '#FFB800',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: moderateScale(16),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    shadowColor: '#FFB800',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    alignSelf: 'flex-start',
    marginTop: verticalScale(-10),
  },
  xpBadgeText: {
    color: '#2D1B69',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },
  dailyCheckInContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  closeDailyCheckIn: {
    position: 'absolute',
    top: verticalScale(60),
    right: scale(20),
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(20),
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  simulatorBadge: {
    position: 'absolute',
    top: '10%',
    left: '10%',
    backgroundColor: 'rgba(255, 107, 53, 0.7)',
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: moderateScale(16),
  },
  simulatorText: {
    color: '#FFFFFF',
    fontSize: moderateScale(12),
    fontWeight: 'bold',
  },
  bottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(20),
  },
  tipContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 184, 0, 0.15)',
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderRadius: moderateScale(16),
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.3)',
    shadowColor: '#FFB800',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    flex: 1,
    minHeight: verticalScale(60),
  },
  tipText: {
    marginLeft: scale(8),
    fontSize: moderateScale(13),
    color: '#FFB800',
    fontWeight: '600',
    flex: 1,
    lineHeight: moderateScale(18),
  },
});

export default CameraScreen;
