import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Alert,
  Animated,
  Share,
  Modal,
  TextInput,
  ActivityIndicator,
  SafeAreaView,
  FlatList,
} from 'react-native';
import {
  User,
  Settings,
  Award,
  Star,
  ChevronRight,
  LogOut,
  Camera,
  Bell,
  Shield,
  HelpCircle,
  Heart,
  Zap,
  Trophy,
  Flame,
  TrendingUp,
  BarChart3,
  Share2,
  Target,
  Medal,
  Trash2,
  AlertTriangle,
  X,
  ChefHat,
  Crown,
  Calendar,
  Gift,
} from 'lucide-react-native';
import {useAuth} from '../context/AuthContext';
import {useGamification} from '../context/GamificationContext';
import {
  scale,
  verticalScale,
  moderateScale,
  responsive,
  isSmallScreen,
} from '../utils/responsive';
import ChefBadge from '../components/ChefBadge';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import StreakCalendar from '../components/StreakCalendar';
import {cookCamApi} from '../services/cookCamApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {gamificationService} from '../services/api';

const ProfileScreen = ({navigation}: {navigation: any}) => {
  const {user, logout} = useAuth();
  const {level, xp, streak, badges} = useGamification();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<any | null>(null);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const statScale = useRef(new Animated.Value(0.9)).current;
  const achievementScale = useRef(new Animated.Value(0)).current;

  // Mock creator data - in real app would come from user object
  const isCreator = user?.isCreator || false;
  const creatorTier = 2; // This would come from API based on subscriber count

  // Calculate XP progress to next level
  const currentLevelXP = (level - 1) * 100;
  const nextLevelXP = level * 100;
  const progressXP = xp - currentLevelXP;
  const requiredXP = nextLevelXP - currentLevelXP;
  const progressPercentage = (progressXP / requiredXP) * 100;

  // Debug function to test gamification API
  const testGamificationAPI = async () => {
    console.log('🧪 Testing gamification API...');
    try {
      const token = await AsyncStorage.getItem('@cookcam_token');
      console.log('🔍 Debug - Token check:', {
        hasToken: !!token,
        tokenLength: token?.length,
        tokenPrefix: token?.substring(0, 30),
        userState: user,
        isAuthenticated: user,
      });

      // Test the Supabase function directly
      const response = await gamificationService.addXP(1, 'TEST_DEBUG');
      console.log('🧪 Test Supabase function response:', response);

      if (!response.success) {
        Alert.alert('API Test Failed', `Error: ${response.error}`);
      } else {
        Alert.alert('API Test Success', 'Gamification API is working!');
      }
    } catch (error) {
      console.error('🧪 Test failed:', error);
      Alert.alert('API Test Error', `Exception: ${error}`);
    }
  };

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
      Animated.spring(statScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Delayed achievement animation
    setTimeout(() => {
      Animated.spring(achievementScale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }).start();
    }, 400);
  }, []);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Logout', style: 'destructive', onPress: () => logout(navigation)},
    ]);
  };

  const handleShareStats = async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');

    try {
      await Share.share({
        message: `🎉 My CookCam Stats!\n\n🔥 Level ${level} Chef\n⚡ ${xp} XP Earned\n🔥 ${streak} Day Streak\n🏆 ${badges.length} Badges Unlocked\n\nJoin me on CookCam and start your cooking journey! 🍳`,
        title: 'My CookCam Stats',
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleBadgePress = (badge: any) => {
    ReactNativeHapticFeedback.trigger('impactLight');

    const unlockedText = badge.unlockedAt
      ? `Unlocked on: ${badge.unlockedAt.toLocaleDateString()}`
      : 'Badge earned!';

    Alert.alert(badge.name, `${badge.description}\n\n${unlockedText}`, [
      {text: 'OK'},
    ]);
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim()) {
      Alert.alert(
        'Error',
        'Please enter your password to confirm account deletion.',
      );
      return;
    }

    try {
      setIsDeleting(true);
      await cookCamApi.deleteAccount(deletePassword);
      Alert.alert(
        'Account Deleted',
        'Your account and all associated data have been permanently deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowDeleteModal(false);
              logout(navigation);
            },
          },
        ],
      );
    } catch (error) {
      setIsDeleting(false);
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data. This action cannot be undone.\n\nAre you sure you want to continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => setShowDeleteModal(true),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Your Profile 👤</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.shareButton}
              onPress={handleShareStats}>
              <Share2 size={20} color="#FF6B35" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton}>
              <Settings size={20} color="#2D1B69" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card */}
        <Animated.View
          style={[
            styles.profileCard,
            {opacity: fadeAnim, transform: [{translateY: slideAnim}]},
          ]}>
          <TouchableOpacity style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.cameraIcon}>
              <Camera size={16} color="#F8F8FF" />
            </View>
          </TouchableOpacity>

          <Text style={styles.userName}>{user?.name || 'Chef'}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>

          {isCreator && (
            <View style={styles.creatorSection}>
              <ChefBadge
                tier={creatorTier as 1 | 2 | 3 | 4 | 5}
                size="medium"
                showLabel={true}
              />
              <TouchableOpacity
                style={styles.creatorDashboardButton}
                onPress={() => navigation.navigate('Creator')}>
                <Text style={styles.creatorDashboardText}>
                  View Creator Dashboard
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>

        {/* Stats Overview */}
        <Animated.View
          style={[styles.statsContainer, {transform: [{scale: statScale}]}]}>
          <TouchableOpacity
            style={styles.statBox}
            onPress={() => setShowAnalytics(!showAnalytics)}
            activeOpacity={0.8}>
            <Zap size={24} color="#FF6B35" />
            <Text style={styles.statValue}>{xp}</Text>
            <Text style={styles.statLabel}>Total XP</Text>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <Trophy size={24} color="#FFB800" />
            <Text style={styles.statValue}>{level}</Text>
            <Text style={styles.statLabel}>Level</Text>
          </View>
          <View style={styles.statBox}>
            <Flame size={24} color="#E91E63" />
            <Text style={styles.statValue}>{streak}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </Animated.View>

        {/* Debug Test Button */}
        <TouchableOpacity
          style={styles.debugButton}
          onPress={testGamificationAPI}>
          <Text style={styles.debugButtonText}>🧪 Test Gamification API</Text>
        </TouchableOpacity>

        {/* Streak Calendar */}
        <View style={styles.streakCalendarContainer}>
          <StreakCalendar />
        </View>

        {/* Comparative Analytics */}
        {showAnalytics && (
          <Animated.View
            style={[styles.analyticsContainer, {opacity: fadeAnim}]}>
            <View style={styles.analyticsHeader}>
              <BarChart3 size={20} color="#2D1B69" />
              <Text style={styles.analyticsTitle}>How You Compare</Text>
            </View>
            {/* Comparative analytics content will be dynamically generated */}
          </Animated.View>
        )}

        {/* Level Progress */}
        <View style={styles.progressContainer}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Level {level}</Text>
            <Text style={styles.progressText}>
              {progressXP} / {requiredXP} XP
            </Text>
          </View>
          <View style={styles.progressBar}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: `${progressPercentage}%`,
                  transform: [{scaleX: fadeAnim}],
                },
              ]}
            />
          </View>
          <Text style={styles.nextLevelText}>
            {requiredXP - progressXP} XP to Level {level + 1} 🎯
          </Text>
        </View>

        {/* Enhanced Badges Section */}
        <View style={styles.badgesContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Achievements 🏆</Text>
            <Text style={styles.achievementCount}>{badges.length}/12</Text>
          </View>
          <View style={styles.badgesGrid}>
            {badges.map((badge, index) => (
              <Animated.View
                key={badge.id}
                style={[
                  {transform: [{scale: achievementScale}]},
                  {
                    opacity: achievementScale.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 1],
                    }),
                  },
                ]}>
                <TouchableOpacity
                  style={styles.badgeCard}
                  onPress={() => handleBadgePress(badge)}
                  activeOpacity={0.8}>
                  <Text style={styles.badgeIcon}>{badge.icon}</Text>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  {badge.unlockedAt && (
                    <Text style={styles.badgeUnlockedText}>
                      Unlocked: {badge.unlockedAt.toLocaleDateString()}
                    </Text>
                  )}
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Settings ⚙️</Text>
          {/* settingsOptions.map((option, index) => {
            const Icon = option.icon;
            return (
              <TouchableOpacity
                key={index}
                style={styles.settingItem}
                onPress={option.onPress}>
                <View style={styles.settingLeft}>
                  <View style={styles.settingIconContainer}>
                    <Icon size={20} color="#666" />
                  </View>
                  <Text style={styles.settingLabel}>{option.label}</Text>
                </View>
                {option.hasToggle ? (
                  <Switch
                    value={notificationsEnabled}
                    onValueChange={setNotificationsEnabled}
                    trackColor={{false: '#E5E5E7', true: '#FF6B35'}}
                    thumbColor="#FFFFFF"
                  />
                ) : (
                  <ChevronRight size={20} color="#8E8E93" />
                )}
              </TouchableOpacity>
            );
          })} */}

          {/* Basic settings options */}
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Privacy')}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <Shield size={20} color="#666" />
              </View>
              <Text style={styles.settingLabel}>Privacy</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => navigation.navigate('Support')}>
            <View style={styles.settingLeft}>
              <View style={styles.settingIconContainer}>
                <HelpCircle size={20} color="#666" />
              </View>
              <Text style={styles.settingLabel}>Help & Support</Text>
            </View>
            <ChevronRight size={20} color="#8E8E93" />
          </TouchableOpacity>

          {/* Account Deletion */}
          <TouchableOpacity
            style={[styles.settingItem, styles.dangerItem]}
            onPress={confirmDeleteAccount}>
            <View style={styles.settingLeft}>
              <View
                style={[
                  styles.settingIconContainer,
                  styles.dangerIconContainer,
                ]}>
                <Trash2 size={20} color="#FF3B30" />
              </View>
              <Text style={[styles.settingLabel, styles.dangerLabel]}>
                Delete Account
              </Text>
            </View>
            <ChevronRight size={20} color="#FF3B30" />
          </TouchableOpacity>
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.versionText}>CookCam v1.0.0</Text>

        {/* Delete Account Modal */}
        <Modal
          visible={showDeleteModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => !isDeleting && setShowDeleteModal(false)}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <AlertTriangle size={24} color="#FF3B30" />
                  <Text style={styles.modalTitle}>Delete Account</Text>
                </View>
                {!isDeleting && (
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowDeleteModal(false)}>
                    <X size={20} color="#666" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.modalMessage}>
                This will permanently delete your account and all your data:
              </Text>

              <View style={styles.deletionList}>
                <Text style={styles.deletionItem}>
                  • All your recipes and favorites
                </Text>
                <Text style={styles.deletionItem}>
                  • Scan history and ingredient data
                </Text>
                <Text style={styles.deletionItem}>
                  • XP, achievements, and badges
                </Text>
                <Text style={styles.deletionItem}>
                  • Subscription and payment history
                </Text>
                <Text style={styles.deletionItem}>
                  • Creator earnings and analytics
                </Text>
              </View>

              <Text style={styles.warningText}>
                This action cannot be undone.
              </Text>

              <View style={styles.passwordContainer}>
                <Text style={styles.passwordLabel}>
                  Enter your password to confirm:
                </Text>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Your password"
                  value={deletePassword}
                  onChangeText={setDeletePassword}
                  secureTextEntry
                  editable={!isDeleting}
                  autoCapitalize="none"
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[
                    styles.cancelButton,
                    isDeleting && styles.disabledButton,
                  ]}
                  onPress={() => setShowDeleteModal(false)}
                  disabled={isDeleting}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteButton,
                    isDeleting && styles.disabledButton,
                  ]}
                  onPress={handleDeleteAccount}
                  disabled={isDeleting}>
                  {isDeleting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.deleteButtonText}>Delete Forever</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.l,
    paddingTop: responsive.spacing.l,
    paddingBottom: responsive.spacing.m,
  },
  headerTitle: {
    fontSize: responsive.fontSize.xxlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  headerActions: {
    flexDirection: 'row',
    gap: scale(12),
  },
  shareButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  settingsButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  profileCard: {
    alignItems: 'center',
    paddingVertical: responsive.spacing.l,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: responsive.spacing.m,
  },
  avatar: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    backgroundColor: '#FF6B35',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 6,
  },
  avatarText: {
    fontSize: responsive.fontSize.xxxlarge + scale(8),
    fontWeight: 'bold',
    color: '#F8F8FF',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: moderateScale(32),
    height: moderateScale(32),
    borderRadius: moderateScale(16),
    backgroundColor: '#2D1B69',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#F8F8FF',
  },
  userName: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  userEmail: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
    marginBottom: verticalScale(12),
  },
  creatorSection: {
    alignItems: 'center',
    marginTop: responsive.spacing.m,
    gap: scale(12),
  },
  creatorDashboardButton: {
    backgroundColor: 'rgba(255, 107, 53, 0.1)',
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.s,
    borderRadius: responsive.borderRadius.large,
  },
  creatorDashboardText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#FF6B35',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.l,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    padding: responsive.spacing.m,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    marginHorizontal: scale(6),
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  statValue: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginTop: verticalScale(8),
    marginBottom: verticalScale(4),
  },
  statLabel: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
  },
  analyticsContainer: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.l,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  analyticsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: responsive.spacing.m,
  },
  analyticsTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: '600',
    color: '#2D1B69',
  },
  comparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: responsive.spacing.s,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  comparisonInfo: {
    flex: 1,
  },
  comparisonLabel: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
    marginBottom: verticalScale(4),
  },
  comparisonValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  userValue: {
    fontSize: responsive.fontSize.medium,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  vsText: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
  },
  avgValue: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
  },
  percentileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#F5F5F5',
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: responsive.borderRadius.small,
  },
  percentileText: {
    fontSize: responsive.fontSize.small,
    fontWeight: '600',
  },
  progressContainer: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.xl,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(12),
  },
  progressTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
  },
  progressText: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
  },
  progressBar: {
    height: verticalScale(8),
    backgroundColor: '#E5E5E7',
    borderRadius: responsive.borderRadius.small / 2,
    overflow: 'hidden',
    marginBottom: verticalScale(8),
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FF6B35',
    borderRadius: responsive.borderRadius.small / 2,
  },
  nextLevelText: {
    fontSize: responsive.fontSize.small,
    color: '#666',
    textAlign: 'center',
  },
  badgesContainer: {
    marginBottom: responsive.spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
  },
  sectionTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: '700',
    color: '#2D1B69',
  },
  achievementCount: {
    fontSize: responsive.fontSize.medium,
    color: '#FF6B35',
    fontWeight: '600',
  },
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(14),
    justifyContent: 'space-between',
  },
  badgeCard: {
    width: isSmallScreen() ? '31%' : '30%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    marginBottom: scale(12),
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
  },
  badgeIcon: {
    fontSize: responsive.fontSize.xxxlarge,
    marginBottom: verticalScale(8),
  },
  badgeName: {
    fontSize: responsive.fontSize.small,
    fontWeight: '600',
    color: '#2D1B69',
    textAlign: 'center',
    paddingHorizontal: scale(4),
  },
  badgeUnlockedText: {
    fontSize: responsive.fontSize.tiny,
    color: '#8E8E93',
    textAlign: 'center',
  },
  settingsContainer: {
    marginBottom: responsive.spacing.xl,
    paddingHorizontal: responsive.spacing.m,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginBottom: verticalScale(12),
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: moderateScale(36),
    height: moderateScale(36),
    borderRadius: moderateScale(18),
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  settingLabel: {
    fontSize: responsive.fontSize.medium,
    color: '#2D1B69',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
    padding: responsive.spacing.m,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: responsive.borderRadius.medium,
    gap: scale(8),
  },
  logoutText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FF3B30',
  },
  versionText: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: responsive.spacing.xl,
  },
  streakCalendarContainer: {
    marginBottom: responsive.spacing.xl,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    padding: responsive.spacing.l,
    borderRadius: responsive.borderRadius.large,
    width: '80%',
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: responsive.spacing.m,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  modalTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  closeButton: {
    padding: responsive.spacing.s,
  },
  modalMessage: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
    textAlign: 'center',
    marginBottom: responsive.spacing.m,
  },
  deletionList: {
    marginBottom: responsive.spacing.m,
  },
  deletionItem: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
    marginBottom: verticalScale(4),
  },
  warningText: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    textAlign: 'center',
  },
  passwordContainer: {
    marginBottom: responsive.spacing.m,
  },
  passwordLabel: {
    fontSize: responsive.fontSize.medium,
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  passwordInput: {
    width: '100%',
    padding: responsive.spacing.m,
    borderWidth: 1,
    borderColor: '#E5E5E7',
    borderRadius: responsive.borderRadius.medium,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: scale(12),
  },
  cancelButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
  },
  cancelButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FF3B30',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
  },
  deleteButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  dangerItem: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  dangerIconContainer: {
    backgroundColor: '#FF3B30',
  },
  dangerLabel: {
    color: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: '#E5E5E7',
  },
  debugButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
    padding: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    alignItems: 'center',
  },
  debugButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default ProfileScreen;
