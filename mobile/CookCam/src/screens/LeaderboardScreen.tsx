import React, {useState, useEffect, useRef} from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Animated,
  Alert,
} from 'react-native';
import {Trophy, Crown, Medal, Award, TrendingUp, Clock, Users, Target, Info, Zap} from 'lucide-react-native';
import {useAuth} from '../context/AuthContext';
import {gamificationService} from '../services/api';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

interface LeaderboardUser {
  id: string;
  name: string;
  avatarUrl?: string;
  xp: number;
  level: number;
  rank: number;
  xpGained?: number; // XP gained in current period
  recipesCooked?: number;
}

type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'allTime';
type LeaderboardType = 'global' | 'friends';

const LeaderboardScreen: React.FC = () => {
  const {user} = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('weekly');
  const [leaderboardType, setLeaderboardType] = useState<LeaderboardType>('global');
  const [loading, setLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  const timePeriods: {key: TimePeriod; label: string}[] = [
    {key: 'daily', label: 'Today'},
    {key: 'weekly', label: 'Week'},
    {key: 'monthly', label: 'Month'},
    {key: 'yearly', label: 'Year'},
    {key: 'allTime', label: 'All Time'},
  ];

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 40,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
    
    // Pulse animation for challenges
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  useEffect(() => {
    loadLeaderboard();
  }, [selectedPeriod, leaderboardType]);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log(`📊 Loading leaderboard: ${leaderboardType} - ${selectedPeriod}`);
      
      // Call actual API endpoint
      const response = await gamificationService.getLeaderboard(leaderboardType, selectedPeriod);
      
      if (response.success && response.data) {
        console.log('✅ Leaderboard data received:', response.data);
        
        // Transform API response to our format
        const leaderboardData = response.data.leaderboard || [];
        
        if (leaderboardData.length === 0) {
          setError('No leaderboard data found. Be the first to start cooking!');
          return;
        }
        
        const transformedData: LeaderboardUser[] = leaderboardData.map((entry: any, index: number) => ({
          id: entry.users?.id || `user-${index}`,
          name: entry.users?.name || `User ${index + 1}`,
          avatarUrl: entry.users?.avatar_url,
          xp: entry.xp_total || 0,
          level: entry.users?.level || 1,
          rank: entry.rank || (index + 1),
          xpGained: entry.xp_gained || 0,
          recipesCooked: entry.recipes_cooked || 0,
        }));
        
        setLeaderboard(transformedData);
        
        // Check if current user is in the response
        if (user) {
          const userEntry = transformedData.find(entry => entry.id === user.id);
          if (userEntry) {
            setUserRank(userEntry.rank);
          } else {
            // User not in top results - get actual rank from API response
            setUserRank(response.data.userRank || null);
          }
        }
      } else {
        console.error('❌ Failed to load leaderboard:', response.error);
        setError(response.error || 'Failed to load leaderboard. Please try again.');
      }
    } catch (error) {
      console.error('❌ Error loading leaderboard:', error);
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const showErrorAlert = () => {
    Alert.alert(
      'Error',
      error || 'Failed to load leaderboard',
      [
        { text: 'Try Again', onPress: loadLeaderboard },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown size={24} color="#FFD700" />;
      case 2:
        return <Medal size={24} color="#C0C0C0" />;
      case 3:
        return <Award size={24} color="#CD7F32" />;
      default:
        return <Text style={styles.rankText}>#{rank}</Text>;
    }
  };

  const renderUserCard = (leaderboardUser: LeaderboardUser, index: number) => {
    const isCurrentUser = leaderboardUser.id === user?.id || leaderboardUser.id === `current-user-${user?.id}`;
    const isTopThree = leaderboardUser.rank <= 3;
    
    return (
      <Animated.View
        key={leaderboardUser.id}
        style={[
          styles.userCard,
          isCurrentUser && styles.currentUserCard,
          isTopThree && styles.topThreeCard,
          index > 9 && styles.separatedCard,
          {
            opacity: fadeAnim,
            transform: [{translateX: slideAnim}],
          }
        ]}>
        <View style={styles.rankContainer}>
          {getRankIcon(leaderboardUser.rank)}
        </View>
        
        <View style={styles.userInfo}>
          <View style={styles.avatar}>
            {leaderboardUser.avatarUrl ? (
              <Image source={{uri: leaderboardUser.avatarUrl}} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {leaderboardUser.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.userName, isCurrentUser && styles.currentUserName]}>
                {leaderboardUser.name}
              </Text>
              {isCurrentUser && <Text style={styles.youText}> (You)</Text>}
            </View>
            <Text style={styles.userLevel}>Level {leaderboardUser.level}</Text>
          </View>
        </View>
        
        <View style={styles.xpContainer}>
          <Text style={[styles.xpText, isTopThree && styles.topThreeXP]}>
            {leaderboardUser.xp.toLocaleString()}
          </Text>
          <Text style={styles.xpLabel}>XP</Text>
          {leaderboardUser.xpGained && (
            <Text style={styles.xpGained}>+{leaderboardUser.xpGained} this week</Text>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerLeft}>
            <Text style={styles.headerTitle}>Compete & Win! 🏆</Text>
            <Text style={styles.headerSubtitle}>See who's cooking up a storm</Text>
            
            {/* Compact User Rank - Integrated into header */}
            {userRank && userRank > 10 && (
              <View style={styles.compactRankBadge}>
                <TrendingUp size={14} color="#66BB6A" />
                <Text style={styles.compactRankText}>
                  #{userRank} this {selectedPeriod === 'allTime' ? 'all time' : selectedPeriod}
                </Text>
              </View>
            )}
          </View>
        </View>
        
        {/* Leaderboard Type Selector */}
        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[styles.typeButton, leaderboardType === 'global' && styles.typeButtonActive]}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('selection');
              setLeaderboardType('global');
            }}
          >
            <Trophy size={16} color={leaderboardType === 'global' ? '#F8F8FF' : '#8E8E93'} />
            <Text style={[styles.typeText, leaderboardType === 'global' && styles.typeTextActive]}>
              Global
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeButton, leaderboardType === 'friends' && styles.typeButtonActive]}
            onPress={() => {
              ReactNativeHapticFeedback.trigger('selection');
              setLeaderboardType('friends');
            }}
          >
            <Users size={16} color={leaderboardType === 'friends' ? '#F8F8FF' : '#8E8E93'} />
            <Text style={[styles.typeText, leaderboardType === 'friends' && styles.typeTextActive]}>
              Friends
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Period Selector */}
      <View style={styles.periodSelector}>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'daily' && styles.periodButtonActive]}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('selection');
            setSelectedPeriod('daily');
          }}>
          <Clock size={16} color={selectedPeriod === 'daily' ? '#F8F8FF' : '#666'} />
          <Text style={[styles.periodText, selectedPeriod === 'daily' && styles.periodTextActive]}>
            Daily
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'weekly' && styles.periodButtonActive]}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('selection');
            setSelectedPeriod('weekly');
          }}>
          <TrendingUp size={16} color={selectedPeriod === 'weekly' ? '#F8F8FF' : '#666'} />
          <Text style={[styles.periodText, selectedPeriod === 'weekly' && styles.periodTextActive]}>
            Weekly
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.periodButton, selectedPeriod === 'allTime' && styles.periodButtonActive]}
          onPress={() => {
            ReactNativeHapticFeedback.trigger('selection');
            setSelectedPeriod('allTime');
          }}>
          <Trophy size={16} color={selectedPeriod === 'allTime' ? '#F8F8FF' : '#666'} />
          <Text style={[styles.periodText, selectedPeriod === 'allTime' && styles.periodTextActive]}>
            All Time
          </Text>
        </TouchableOpacity>
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadLeaderboard}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Leaderboard List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B35" />
          <Text style={styles.loadingText}>Loading leaderboard...</Text>
        </View>
      ) : error ? (
        <TouchableOpacity style={styles.errorRetryContainer} onPress={showErrorAlert}>
          <Text style={styles.errorRetryText}>Tap to retry loading leaderboard</Text>
        </TouchableOpacity>
      ) : (
        <ScrollView
          style={styles.leaderboardList}
          contentContainerStyle={styles.leaderboardContent}
          showsVerticalScrollIndicator={false}>
          {leaderboard.map((leaderboardUser, index) => 
            renderUserCard(leaderboardUser, index)
          )}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#F8F8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    gap: 6,
  },
  typeButtonActive: {
    backgroundColor: '#2D1B69',
    borderColor: '#2D1B69',
  },
  typeText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  typeTextActive: {
    color: '#F8F8FF',
  },
  periodSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  periodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5E7',
    gap: 6,
  },
  periodButtonActive: {
    backgroundColor: '#FF6B35',
    borderColor: '#FF6B35',
  },
  periodText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  periodTextActive: {
    color: '#F8F8FF',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  leaderboardList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  leaderboardContent: {
    paddingBottom: 180, // Increased padding to account for both tab bar and rank card
  },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  currentUserCard: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    backgroundColor: '#FFF9F7',
  },
  topThreeCard: {
    backgroundColor: '#FFFEF5',
  },
  separatedCard: {
    marginTop: 20,
  },
  rankContainer: {
    width: 40,
    alignItems: 'center',
  },
  rankText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#8E8E93',
  },
  userInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF6B35',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#F8F8FF',
  },
  nameContainer: {
    marginLeft: 12,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
  },
  currentUserName: {
    color: '#FF6B35',
  },
  youText: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '500',
  },
  userLevel: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  xpContainer: {
    alignItems: 'flex-end',
    minWidth: 70,
  },
  xpText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  topThreeXP: {
    color: '#FF6B35',
  },
  xpLabel: {
    fontSize: 12,
    color: '#8E8E93',
  },
  xpGained: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 2,
  },
  compactRankBadge: {
    backgroundColor: 'rgba(102, 187, 106, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(102, 187, 106, 0.2)',
  },
  compactRankText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#66BB6A',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#FFF9F7',
    borderRadius: 12,
    marginBottom: 12,
  },
  errorText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
  retryButton: {
    padding: 12,
    backgroundColor: '#FF6B35',
    borderRadius: 20,
  },
  retryButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
  errorRetryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  errorRetryText: {
    fontSize: 16,
    color: '#FF6B35',
    fontWeight: '600',
  },
});

export default LeaderboardScreen; 