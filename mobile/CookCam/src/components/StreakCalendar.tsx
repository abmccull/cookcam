import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Alert,
} from 'react-native';
import {Calendar, Shield, Flame, Lock, Gift, Zap} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useGamification} from '../context/GamificationContext';

interface StreakDay {
  date: string;
  cooked: boolean;
  shieldUsed?: boolean;
}

interface StreakReward {
  days: number;
  title: string;
  reward: string;
  icon: string;
  earned: boolean;
}

const StreakCalendar: React.FC = () => {
  const {streak, freezeTokens, useFreeze, addXP} = useGamification();
  const [streakDays, setStreakDays] = useState<StreakDay[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showRewards, setShowRewards] = useState(false);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const shieldScale = useRef(new Animated.Value(1)).current;
  
  const streakRewards: StreakReward[] = [
    {days: 7, title: 'Week Warrior', reward: '50 XP + Shield', icon: '🔥', earned: streak >= 7},
    {days: 30, title: 'Monthly Master', reward: 'Exclusive Recipes', icon: '💎', earned: streak >= 30},
    {days: 100, title: 'Century Chef', reward: 'Creator Features', icon: '👑', earned: streak >= 100},
  ];
  
  useEffect(() => {
    loadStreakData();
    startAnimations();
  }, []);
  
  const startAnimations = () => {
    // Fade in animation
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
    
    // Pulse animation for active streak
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };
  
  const loadStreakData = async () => {
    try {
      const data = await AsyncStorage.getItem('streakData');
      if (data) {
        setStreakDays(JSON.parse(data));
      } else {
        // Generate mock data for demonstration
        generateMockStreakData();
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
      generateMockStreakData();
    }
  };
  
  const generateMockStreakData = () => {
    const days: StreakDay[] = [];
    const today = new Date();
    
    // Generate last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(today.getDate() - i);
      
      // Mock data: random cooking pattern with current streak
      const cooked = i < streak || (Math.random() > 0.3 && i >= streak + 3);
      days.push({
        date: date.toISOString().split('T')[0],
        cooked,
        shieldUsed: !cooked && Math.random() > 0.8,
      });
    }
    
    setStreakDays(days);
  };
  
  const handleUseShield = async () => {
    if (freezeTokens <= 0) {
      Alert.alert('No Shields Available', 'Earn shields by maintaining 7-day streaks!');
      return;
    }
    
    Alert.alert(
      'Use Streak Shield? 🛡️',
      `You have ${freezeTokens} shield${freezeTokens > 1 ? 's' : ''} available. Use one to protect your streak?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Use Shield',
          onPress: async () => {
            ReactNativeHapticFeedback.trigger('notificationSuccess');
            const used = await useFreeze();
            if (used) {
              // Animate shield usage
              Animated.sequence([
                Animated.timing(shieldScale, {
                  toValue: 1.5,
                  duration: 200,
                  useNativeDriver: true,
                }),
                Animated.timing(shieldScale, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: true,
                }),
              ]).start();
              
              Alert.alert('Shield Applied! 🛡️', 'Your streak is protected for today!');
            }
          },
        },
      ],
    );
  };
  
  const handleRecoverStreak = async () => {
    Alert.alert(
      'Recover Streak? 🔥',
      'Restore your broken streak for 25 XP (within 24 hours of breaking)',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Recover (25 XP)',
          onPress: async () => {
            ReactNativeHapticFeedback.trigger('impactMedium');
            // In real app, check if user has enough XP and deduct it
            await addXP(-25, 'STREAK_RECOVERY');
            Alert.alert('Streak Recovered! 🎉', 'Your streak has been restored!');
          },
        },
      ],
    );
  };
  
  const renderCalendarGrid = () => {
    const daysInMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth() + 1,
      0
    ).getDate();
    
    const firstDayOfMonth = new Date(
      currentMonth.getFullYear(),
      currentMonth.getMonth(),
      1
    ).getDay();
    
    const days = [];
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const streakDay = streakDays.find(d => d.date === dateStr);
      const isToday = new Date().toDateString() === new Date(dateStr).toDateString();
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.calendarDay,
            streakDay?.cooked && styles.cookedDay,
            streakDay?.shieldUsed && styles.shieldedDay,
            isToday && styles.todayDay,
          ]}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.dayText,
            streakDay?.cooked && styles.cookedDayText,
          ]}>
            {day}
          </Text>
          {streakDay?.cooked && (
            <Flame size={12} color="#FF6B35" fill="#FF6B35" style={styles.dayIcon} />
          )}
          {streakDay?.shieldUsed && (
            <Shield size={12} color="#4CAF50" fill="#4CAF50" style={styles.dayIcon} />
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };
  
  return (
    <Animated.View style={[styles.container, {opacity: fadeAnim}]}>
      {/* Streak Header */}
      <View style={styles.header}>
        <Animated.View style={[styles.streakBadge, {transform: [{scale: pulseAnim}]}]}>
          <Flame size={32} color="#FF6B35" fill="#FF6B35" />
          <Text style={styles.streakNumber}>{streak}</Text>
          <Text style={styles.streakLabel}>Day Streak</Text>
        </Animated.View>
        
        <View style={styles.shieldInfo}>
          <Animated.View style={[styles.shieldBadge, {transform: [{scale: shieldScale}]}]}>
            <Shield size={24} color="#4CAF50" />
            <Text style={styles.shieldCount}>{freezeTokens}</Text>
          </Animated.View>
          <TouchableOpacity style={styles.useShieldButton} onPress={handleUseShield}>
            <Text style={styles.useShieldText}>Use Shield</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Calendar View */}
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <Text style={styles.monthText}>
            {currentMonth.toLocaleDateString('en-US', {month: 'long', year: 'numeric'})}
          </Text>
        </View>
        
        <View style={styles.weekDays}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => (
            <Text key={index} style={styles.weekDayText}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarGrid}>
          {renderCalendarGrid()}
        </View>
      </View>
      
      {/* Streak Rewards */}
      <TouchableOpacity 
        style={styles.rewardsToggle}
        onPress={() => setShowRewards(!showRewards)}
      >
        <Gift size={20} color="#FFB800" />
        <Text style={styles.rewardsToggleText}>Streak Rewards</Text>
      </TouchableOpacity>
      
      {showRewards && (
        <View style={styles.rewardsContainer}>
          {streakRewards.map((reward, index) => (
            <View 
              key={index} 
              style={[
                styles.rewardCard,
                reward.earned && styles.rewardCardEarned,
              ]}
            >
              <Text style={styles.rewardIcon}>{reward.icon}</Text>
              <View style={styles.rewardInfo}>
                <Text style={styles.rewardTitle}>{reward.title}</Text>
                <Text style={styles.rewardDays}>{reward.days} days</Text>
              </View>
              <View style={styles.rewardDetails}>
                <Text style={styles.rewardText}>{reward.reward}</Text>
                {reward.earned ? (
                  <Zap size={16} color="#4CAF50" />
                ) : (
                  <Lock size={16} color="#8E8E93" />
                )}
              </View>
            </View>
          ))}
        </View>
      )}
      
      {/* Streak Recovery */}
      {streak === 0 && (
        <TouchableOpacity style={styles.recoveryButton} onPress={handleRecoverStreak}>
          <Text style={styles.recoveryText}>Recover Streak (25 XP)</Text>
        </TouchableOpacity>
      )}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  streakBadge: {
    alignItems: 'center',
  },
  streakNumber: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B35',
    marginTop: 4,
  },
  streakLabel: {
    fontSize: 14,
    color: '#8E8E93',
  },
  shieldInfo: {
    alignItems: 'center',
  },
  shieldBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  shieldCount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  useShieldButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  useShieldText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  calendar: {
    marginBottom: 20,
  },
  calendarHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  weekDayText: {
    fontSize: 12,
    color: '#8E8E93',
    width: 40,
    textAlign: 'center',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  cookedDay: {
    backgroundColor: '#FFE5DC',
  },
  shieldedDay: {
    backgroundColor: '#E8F5E9',
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#FF6B35',
  },
  dayText: {
    fontSize: 14,
    color: '#2D1B69',
  },
  cookedDayText: {
    fontWeight: '600',
  },
  dayIcon: {
    position: 'absolute',
    bottom: 2,
    right: 2,
  },
  rewardsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    backgroundColor: '#FFF9F7',
    borderRadius: 12,
    marginBottom: 12,
  },
  rewardsToggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB800',
  },
  rewardsContainer: {
    gap: 12,
  },
  rewardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8FF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  rewardCardEarned: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  rewardIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
  },
  rewardDays: {
    fontSize: 12,
    color: '#8E8E93',
  },
  rewardDetails: {
    alignItems: 'flex-end',
  },
  rewardText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  recoveryButton: {
    backgroundColor: '#FF6B35',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  recoveryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default StreakCalendar; 