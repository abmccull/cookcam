import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import {
  Camera,
  Check,
  Calendar,
  Star,
  ChefHat,
  Upload,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useGamification} from '../context/GamificationContext';
// import {launchImageLibrary} from 'react-native-image-picker';

// Mock image picker for now
const launchImageLibrary = (
  options: any,
  callback: (response: any) => void,
) => {
  // Simulate image selection
  setTimeout(() => {
    callback({
      assets: [{uri: 'mock-photo-uri'}],
      didCancel: false,
    });
  }, 500);
};

interface CheckInDay {
  date: string;
  completed: boolean;
  photoUri?: string;
}

const DailyCheckIn: React.FC = () => {
  const {addXP} = useGamification();
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [weeklyProgress, setWeeklyProgress] = useState<CheckInDay[]>([]);
  const [showSuggestion, setShowSuggestion] = useState(false);
  const [suggestedRecipe, setSuggestedRecipe] = useState<string>('');

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const checkmarkScale = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadCheckInData();
    startAnimations();
  }, []);

  const startAnimations = () => {
    // Fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Scale animation
    Animated.spring(scaleAnim, {
      toValue: 1,
      tension: 50,
      friction: 7,
      useNativeDriver: true,
    }).start();

    // Pulse animation for button
    if (!hasCheckedInToday) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  };

  const loadCheckInData = async () => {
    try {
      const today = new Date().toDateString();
      const lastCheckIn = await AsyncStorage.getItem('lastCheckIn');

      if (lastCheckIn === today) {
        setHasCheckedInToday(true);
      }

      // Load weekly progress
      const weekData = await AsyncStorage.getItem('weeklyCheckIns');
      if (weekData) {
        setWeeklyProgress(JSON.parse(weekData));
      } else {
        generateWeeklyProgress();
      }
    } catch (error) {
      console.error('Error loading check-in data:', error);
    }
  };

  const generateWeeklyProgress = () => {
    const days: CheckInDay[] = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);

      days.push({
        date: date.toDateString(),
        completed: false,
      });
    }

    setWeeklyProgress(days);
  };

  const handleCheckIn = async () => {
    if (hasCheckedInToday) {
      Alert.alert(
        'Already Checked In!',
        "You've already completed today's check-in!",
      );
      return;
    }

    ReactNativeHapticFeedback.trigger('impactMedium');

    // Launch camera/gallery
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.7,
      },
      async response => {
        if (response.didCancel || response.errorMessage) {
          return;
        }

        const photoUri = response.assets?.[0]?.uri;
        if (!photoUri) {
          return;
        }

        // Mark as checked in
        setHasCheckedInToday(true);
        const today = new Date().toDateString();
        await AsyncStorage.setItem('lastCheckIn', today);

        // Update weekly progress
        const updatedProgress = weeklyProgress.map(day =>
          day.date === today ? {...day, completed: true, photoUri} : day,
        );
        setWeeklyProgress(updatedProgress);
        await AsyncStorage.setItem(
          'weeklyCheckIns',
          JSON.stringify(updatedProgress),
        );

        // Award XP
        await addXP(5, 'DAILY_CHECK_IN');

        // Animate checkmark
        Animated.spring(checkmarkScale, {
          toValue: 1,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }).start();

        // Generate AI suggestion (mock for now)
        generateRecipeSuggestion(photoUri);

        // Check for weekly bonus
        checkWeeklyBonus(updatedProgress);
      },
    );
  };

  const generateRecipeSuggestion = (_photoUri: string) => {
    // In real app, use AI to analyze photo and suggest recipe
    const suggestions = [
      'Creamy Tomato Pasta',
      'Garden Fresh Salad',
      'Quick Stir-Fry',
      'Homemade Pizza',
      'Veggie Wrap',
    ];

    const randomSuggestion =
      suggestions[Math.floor(Math.random() * suggestions.length)];
    setSuggestedRecipe(randomSuggestion);
    setShowSuggestion(true);

    ReactNativeHapticFeedback.trigger('notificationSuccess');
  };

  const checkWeeklyBonus = async (progress: CheckInDay[]) => {
    const completedDays = progress.filter(day => day.completed).length;

    if (completedDays === 7) {
      await addXP(50, 'WEEKLY_CHECK_IN_BONUS');
      Alert.alert(
        'Weekly Bonus! 🎉',
        'You checked in every day this week! +50 XP bonus awarded!',
        [{text: 'Awesome!'}],
      );
    }
  };

  const renderWeeklyCalendar = () => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
      <View style={styles.weeklyCalendar}>
        {weeklyProgress.map((day, index) => {
          const isToday = day.date === new Date().toDateString();
          const dayOfWeek = new Date(day.date).getDay();

          return (
            <View key={index} style={styles.dayContainer}>
              <Text style={[styles.dayLabel, isToday && styles.todayLabel]}>
                {days[dayOfWeek]}
              </Text>
              <TouchableOpacity
                style={[
                  styles.dayCircle,
                  day.completed && styles.dayCompleted,
                  isToday && styles.todayCircle,
                ]}
                activeOpacity={0.8}>
                {day.completed ? (
                  <Check size={16} color="#FFFFFF" />
                ) : (
                  <Text style={styles.dayNumber}>
                    {new Date(day.date).getDate()}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {opacity: fadeAnim, transform: [{scale: scaleAnim}]},
      ]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Camera size={24} color="#FF6B35" />
          <Text style={styles.title}>Daily Check-In</Text>
        </View>
        <Text style={styles.subtitle}>What's in your fridge today?</Text>
      </View>

      {/* Weekly Progress */}
      {renderWeeklyCalendar()}

      {/* Check-In Button */}
      {!hasCheckedInToday ? (
        <Animated.View style={{transform: [{scale: pulseAnim}]}}>
          <TouchableOpacity
            style={styles.checkInButton}
            onPress={handleCheckIn}
            activeOpacity={0.8}>
            <Upload size={24} color="#FFFFFF" />
            <Text style={styles.checkInButtonText}>Upload Fridge Photo</Text>
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+5 XP</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        <View style={styles.completedContainer}>
          <Animated.View
            style={[styles.checkmark, {transform: [{scale: checkmarkScale}]}]}>
            <Check size={32} color="#4CAF50" />
          </Animated.View>
          <Text style={styles.completedText}>Today's check-in completed!</Text>
        </View>
      )}

      {/* Recipe Suggestion */}
      {showSuggestion && (
        <Animated.View style={[styles.suggestionCard, {opacity: fadeAnim}]}>
          <View style={styles.suggestionHeader}>
            <ChefHat size={20} color="#FF6B35" />
            <Text style={styles.suggestionTitle}>AI Suggestion</Text>
          </View>
          <Text style={styles.suggestionText}>
            Based on your fridge, try making:
          </Text>
          <Text style={styles.recipeName}>{suggestedRecipe}</Text>
          <TouchableOpacity style={styles.viewRecipeButton}>
            <Text style={styles.viewRecipeText}>View Recipe</Text>
            <Star size={16} color="#FF6B35" />
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Weekly Bonus Indicator */}
      <View style={styles.bonusIndicator}>
        <Calendar size={16} color="#FFB800" />
        <Text style={styles.bonusText}>
          {weeklyProgress.filter(d => d.completed).length}/7 days • Complete all
          for 50 XP bonus!
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 20,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  header: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  weeklyCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  dayContainer: {
    alignItems: 'center',
    flex: 1,
  },
  dayLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  todayLabel: {
    color: '#FF6B35',
    fontWeight: '600',
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  dayCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  todayCircle: {
    borderColor: '#FF6B35',
    borderWidth: 2,
  },
  dayNumber: {
    fontSize: 14,
    color: '#2D1B69',
  },
  checkInButton: {
    backgroundColor: '#FF6B35',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 12,
    position: 'relative',
  },
  checkInButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  xpBadge: {
    position: 'absolute',
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  xpBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  checkmark: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  completedText: {
    fontSize: 16,
    color: '#4CAF50',
    fontWeight: '600',
  },
  suggestionCard: {
    backgroundColor: '#FFF9F7',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFE5DC',
  },
  suggestionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B35',
  },
  suggestionText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  recipeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 12,
  },
  viewRecipeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B35',
  },
  viewRecipeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FF6B35',
  },
  bonusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  bonusText: {
    fontSize: 13,
    color: '#FFB800',
    fontWeight: '500',
  },
});

export default DailyCheckIn;
