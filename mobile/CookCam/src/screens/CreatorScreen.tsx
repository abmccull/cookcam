import React, {useState, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Animated,
  Share,
  Alert,
  Clipboard,
  Platform,
} from 'react-native';
import {
  TrendingUp,
  Users,
  DollarSign,
  Copy,
  Share2,
  ChefHat,
  Award,
  Lock,
  CheckCircle,
  Info,
  Star,
  Play,
  Target,
  BookOpen,
  Zap,
  Clock,
} from 'lucide-react-native';
import {useAuth} from '../context/AuthContext';
import {scale, verticalScale, moderateScale, responsive, isSmallScreen} from '../utils/responsive';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import ChefBadge from '../components/ChefBadge';
import {useGamification, XP_VALUES} from '../context/GamificationContext';

interface CreatorTier {
  id: number;
  title: string;
  emoji: string;
  minSubscribers: number;
  maxSubscribers: number | null;
  revenueShare: number;
  color: string;
  unlocked: boolean;
}

interface CreatorTip {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: 'content' | 'growth' | 'monetization';
}

const CreatorScreen = ({navigation}: {navigation: any}) => {
  const {user} = useAuth();
  const {addXP} = useGamification();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Mock creator data (would come from API)
  const [creatorStats] = useState({
    creatorCode: user?.isCreator ? 'CHEF_ALEX_2024' : null,
    totalClicks: 1250,
    signUps: 89,
    paidSubscribers: 45,
    monthlyRevenue: 225.50,
    currentTier: 1,
    totalSubscribers: 45,
  });
  
  // Recipe performance predictions
  const [recipePredictions] = useState([
    {title: 'Viral Pasta Recipe', predictedViews: '10K-15K', confidence: 92},
    {title: 'Quick Breakfast Bowl', predictedViews: '5K-8K', confidence: 87},
    {title: 'Healthy Smoothie', predictedViews: '3K-5K', confidence: 81},
  ]);
  
  // Creator tips
  const creatorTips: CreatorTip[] = [
    {
      id: '1',
      title: 'Post at Peak Times',
      description: 'Share recipes between 6-8 PM when most users are planning dinner',
      icon: Clock,
      category: 'growth',
    },
    {
      id: '2',
      title: 'Use Trending Ingredients',
      description: 'Recipes with trending ingredients get 3x more views',
      icon: TrendingUp,
      category: 'content',
    },
    {
      id: '3',
      title: 'Engage with Comments',
      description: 'Responding to comments increases follower retention by 45%',
      icon: Users,
      category: 'growth',
    },
    {
      id: '4',
      title: 'Create Recipe Series',
      description: 'Series keep viewers coming back for more',
      icon: BookOpen,
      category: 'content',
    },
  ];

  // Chef-themed tiers
  const tiers: CreatorTier[] = [
    {
      id: 1,
      title: 'Sous Chef',
      emoji: '👨‍🍳',
      minSubscribers: 0,
      maxSubscribers: 100,
      revenueShare: 10,
      color: '#4CAF50',
      unlocked: true,
    },
    {
      id: 2,
      title: 'Pastry Chef',
      emoji: '🧁',
      minSubscribers: 100,
      maxSubscribers: 1000,
      revenueShare: 15,
      color: '#2196F3',
      unlocked: creatorStats.totalSubscribers >= 100,
    },
    {
      id: 3,
      title: 'Head Chef',
      emoji: '👨‍🍳',
      minSubscribers: 1000,
      maxSubscribers: 10000,
      revenueShare: 20,
      color: '#9C27B0',
      unlocked: creatorStats.totalSubscribers >= 1000,
    },
    {
      id: 4,
      title: 'Executive Chef',
      emoji: '⭐',
      minSubscribers: 10000,
      maxSubscribers: 100000,
      revenueShare: 25,
      color: '#FF6B35',
      unlocked: creatorStats.totalSubscribers >= 10000,
    },
    {
      id: 5,
      title: 'Master Chef',
      emoji: '🏆',
      minSubscribers: 100000,
      maxSubscribers: null,
      revenueShare: 30,
      color: '#FFB800',
      unlocked: creatorStats.totalSubscribers >= 100000,
    },
  ];

  const currentTierData = tiers.find(t => t.id === creatorStats.currentTier) || tiers[0];
  const nextTier = tiers.find(t => t.id === creatorStats.currentTier + 1);
  
  // Calculate progress to next tier
  const progressToNext = nextTier 
    ? ((creatorStats.totalSubscribers - currentTierData.minSubscribers) / 
       (nextTier.minSubscribers - currentTierData.minSubscribers)) * 100
    : 100;

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
    
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
    
    // Animate progress bar
    Animated.timing(progressAnim, {
      toValue: progressToNext,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  }, [progressToNext]);

  const handleCopyCode = () => {
    if (creatorStats.creatorCode) {
      Clipboard.setString(creatorStats.creatorCode);
      ReactNativeHapticFeedback.trigger('notificationSuccess');
      Alert.alert('Copied!', 'Your creator code has been copied to clipboard');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join CookCam with my creator code: ${creatorStats.creatorCode} 🍳\n\nDiscover amazing recipes and cook like a pro!\n\nhttps://cookcam.app/join/${creatorStats.creatorCode}`,
        title: 'Join CookCam!',
      });
      ReactNativeHapticFeedback.trigger('impactLight');
    } catch (error) {
      console.error(error);
    }
  };
  
  const handleBecomeCreator = async () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    
    // Navigate to proper creator onboarding flow
    navigation.navigate('CreatorOnboarding', {
      returnToTab: 'Creator'
    });
  };

  const calculateConversionRate = () => {
    if (creatorStats.totalClicks === 0) return '0';
    return ((creatorStats.signUps / creatorStats.totalClicks) * 100).toFixed(1);
  };

  const calculatePaidRate = () => {
    if (creatorStats.signUps === 0) return '0';
    return ((creatorStats.paidSubscribers / creatorStats.signUps) * 100).toFixed(1);
  };

  // If not a creator, show the journey start
  if (!user?.isCreator) {
    return (
      <View style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Animated.View style={{opacity: fadeAnim, transform: [{translateY: slideAnim}]}}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>Become a Creator 🚀</Text>
              <Text style={styles.headerSubtitle}>
                Turn your recipes into revenue
              </Text>
            </View>
            
            {/* Hero Card */}
            <Animated.View style={[styles.heroCard, {transform: [{scale: pulseAnim}]}]}>
              <ChefHat size={moderateScale(64)} color="#FF6B35" />
              <Text style={styles.heroTitle}>Start Your Creator Journey</Text>
              <Text style={styles.heroSubtitle}>
                Share your culinary creativity and earn money doing what you love!
              </Text>
              <TouchableOpacity style={styles.startButton} onPress={handleBecomeCreator}>
                <Play size={moderateScale(20)} color="#F8F8FF" />
                <Text style={styles.startButtonText}>Become a Creator</Text>
              </TouchableOpacity>
            </Animated.View>
            
            {/* Benefits */}
            <View style={styles.benefitsSection}>
              <Text style={styles.sectionTitle}>Creator Benefits ✨</Text>
              <View style={styles.benefitsList}>
                <View style={styles.benefitItem}>
                  <DollarSign size={moderateScale(24)} color="#4CAF50" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Earn Revenue</Text>
                    <Text style={styles.benefitDescription}>
                      Get up to 30% commission on subscribers
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <Target size={moderateScale(24)} color="#FF6B35" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Performance Insights</Text>
                    <Text style={styles.benefitDescription}>
                      AI-powered predictions for your recipes
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <Zap size={moderateScale(24)} color="#FFB800" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Creator Tools</Text>
                    <Text style={styles.benefitDescription}>
                      Exclusive features to grow your audience
                    </Text>
                  </View>
                </View>
                <View style={styles.benefitItem}>
                  <Star size={moderateScale(24)} color="#9C27B0" />
                  <View style={styles.benefitText}>
                    <Text style={styles.benefitTitle}>Recognition</Text>
                    <Text style={styles.benefitDescription}>
                      Chef badges and tier progression
                    </Text>
                  </View>
                </View>
              </View>
            </View>
            
            {/* Success Stories */}
            <View style={styles.successSection}>
              <Text style={styles.sectionTitle}>Creator Success Stories 🌟</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.successCard}>
                  <Text style={styles.successQuote}>
                    "I went from 0 to 5K subscribers in 3 months!"
                  </Text>
                  <Text style={styles.successAuthor}>- Chef Sarah</Text>
                  <Text style={styles.successStats}>💰 $1,250/month</Text>
                </View>
                <View style={styles.successCard}>
                  <Text style={styles.successQuote}>
                    "My pasta recipes went viral and changed my life!"
                  </Text>
                  <Text style={styles.successAuthor}>- Chef Marco</Text>
                  <Text style={styles.successStats}>👥 15K subscribers</Text>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </ScrollView>
      </View>
    );
  }

  // Creator dashboard for existing creators
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Creator Dashboard 💚</Text>
          <Text style={styles.headerSubtitle}>
            Welcome back, Creator!
          </Text>
        </View>

        {/* Current Tier Card */}
        <Animated.View style={[styles.tierCard, {borderColor: currentTierData.color, opacity: fadeAnim}]}>
          <View style={styles.tierHeader}>
            <View style={styles.tierInfo}>
              <ChefBadge tier={creatorStats.currentTier as 1 | 2 | 3 | 4 | 5} size="large" />
              <View style={styles.tierTextInfo}>
                <Text style={styles.tierTitle}>{currentTierData.title}</Text>
                <Text style={[styles.tierRevenue, {color: currentTierData.color}]}>
                  {currentTierData.revenueShare}% Revenue Share
                </Text>
              </View>
            </View>
            <View style={styles.subscriberBadge}>
              <Users size={moderateScale(16)} color="#666" />
              <Text style={styles.subscriberCount}>{creatorStats.totalSubscribers}</Text>
            </View>
          </View>

          {/* Progress to next tier */}
          {nextTier && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>Progress to {nextTier.title}</Text>
                <Text style={styles.progressText}>
                  {creatorStats.totalSubscribers} / {nextTier.minSubscribers}
                </Text>
              </View>
              <View style={styles.progressBar}>
                <Animated.View 
                  style={[
                    styles.progressFill,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 100],
                        outputRange: ['0%', '100%'],
                      }),
                      backgroundColor: nextTier.color,
                    }
                  ]} 
                />
              </View>
              <Text style={styles.progressHint}>
                {nextTier.minSubscribers - creatorStats.totalSubscribers} more subscribers to unlock {nextTier.revenueShare}% revenue share!
              </Text>
            </View>
          )}
        </Animated.View>
        
        {/* Recipe Performance Predictions */}
        <View style={styles.predictionsSection}>
          <Text style={styles.sectionTitle}>Recipe Predictions 🔮</Text>
          <View style={styles.predictionsList}>
            {recipePredictions.map((prediction, index) => (
              <View key={index} style={styles.predictionCard}>
                <View style={styles.predictionLeft}>
                  <Text style={styles.predictionTitle}>{prediction.title}</Text>
                  <View style={styles.predictionStats}>
                    <TrendingUp size={moderateScale(14)} color="#FF6B35" />
                    <Text style={styles.predictionViews}>{prediction.predictedViews} views</Text>
                  </View>
                </View>
                <View style={styles.predictionConfidence}>
                  <Text style={styles.confidenceValue}>{prediction.confidence}%</Text>
                  <Text style={styles.confidenceLabel}>confidence</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Creator Link/Code Section */}
        <View style={styles.codeSection}>
          <Text style={styles.sectionTitle}>Your Creator Link 🔗</Text>
          <View style={styles.codeCard}>
            <Text style={styles.codeLabel}>Share this code with your audience:</Text>
            <View style={styles.codeContainer}>
              <Text style={styles.codeText}>{creatorStats.creatorCode}</Text>
              <TouchableOpacity style={styles.copyButton} onPress={handleCopyCode}>
                <Copy size={moderateScale(18)} color="#4CAF50" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
              <Share2 size={moderateScale(18)} color="#F8F8FF" />
              <Text style={styles.shareButtonText}>Share Link</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Analytics Section */}
        <View style={styles.analyticsSection}>
          <Text style={styles.sectionTitle}>Your Performance 📊</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <TrendingUp size={moderateScale(20)} color="#FF6B35" />
                <Text style={styles.statLabel}>Total Clicks</Text>
              </View>
              <Text style={styles.statValue}>{creatorStats.totalClicks.toLocaleString()}</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Users size={moderateScale(20)} color="#9C27B0" />
                <Text style={styles.statLabel}>Sign-ups</Text>
              </View>
              <Text style={styles.statValue}>{creatorStats.signUps}</Text>
              <Text style={styles.statSubtext}>{calculateConversionRate()}% conversion</Text>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statHeader}>
                <Award size={moderateScale(20)} color="#4CAF50" />
                <Text style={styles.statLabel}>Paid Subs</Text>
              </View>
              <Text style={styles.statValue}>{creatorStats.paidSubscribers}</Text>
              <Text style={styles.statSubtext}>{calculatePaidRate()}% paid</Text>
            </View>
            
            <View style={[styles.statCard, styles.revenueCard]}>
              <View style={styles.statHeader}>
                <DollarSign size={moderateScale(20)} color="#FFB800" />
                <Text style={styles.statLabel}>Monthly Revenue</Text>
              </View>
              <Text style={[styles.statValue, styles.revenueValue]}>
                ${creatorStats.monthlyRevenue.toFixed(2)}
              </Text>
              <Text style={styles.statSubtext}>This month</Text>
            </View>
          </View>
        </View>

        {/* All Tiers Section */}
        <View style={styles.tiersSection}>
          <View style={styles.tiersHeader}>
            <Text style={styles.sectionTitle}>Chef Tiers 👨‍🍳</Text>
            <TouchableOpacity onPress={() => Alert.alert('Revenue Share Program', 'Earn commission on every subscriber you bring to CookCam! The more subscribers you bring, the higher your revenue share percentage.')}>
              <Info size={moderateScale(20)} color="#8E8E93" />
            </TouchableOpacity>
          </View>
          
          {tiers.map((tier, index) => (
            <View 
              key={tier.id} 
              style={[
                styles.tierItem,
                tier.id === currentTierData.id && styles.currentTierItem,
                !tier.unlocked && styles.lockedTierItem,
              ]}
            >
              <View style={styles.tierItemLeft}>
                <ChefBadge tier={tier.id as 1 | 2 | 3 | 4 | 5} size="small" />
                <View style={styles.tierItemInfo}>
                  <Text style={styles.tierItemTitle}>{tier.title}</Text>
                  <Text style={styles.tierItemRange}>
                    {tier.minSubscribers.toLocaleString()}{tier.maxSubscribers ? `-${tier.maxSubscribers.toLocaleString()}` : '+'} subscribers
                  </Text>
                </View>
              </View>
              <View style={styles.tierItemRight}>
                <Text style={[styles.tierItemRevenue, {color: tier.color}]}>
                  {tier.revenueShare}%
                </Text>
                {tier.id === currentTierData.id ? (
                  <CheckCircle size={moderateScale(20)} color={tier.color} />
                ) : !tier.unlocked ? (
                  <Lock size={moderateScale(20)} color="#C7C7CC" />
                ) : null}
              </View>
            </View>
          ))}
        </View>

        {/* Creator Tips Section */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>Creator Tips & Best Practices 💡</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {creatorTips.map(tip => (
              <View key={tip.id} style={styles.tipCard}>
                <tip.icon size={moderateScale(24)} color="#FF6B35" />
                <Text style={styles.tipTitle}>{tip.title}</Text>
                <Text style={styles.tipDescription}>{tip.description}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
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
    paddingHorizontal: responsive.spacing.m,
    paddingTop: responsive.spacing.m,
    paddingBottom: responsive.spacing.m,
  },
  headerTitle: {
    fontSize: responsive.fontSize.xxlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  headerSubtitle: {
    fontSize: responsive.fontSize.medium,
    color: '#8E8E93',
  },
  heroCard: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.l,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.xlarge,
    padding: responsive.spacing.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  heroTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginTop: responsive.spacing.m,
    marginBottom: responsive.spacing.s,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: responsive.fontSize.medium,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: responsive.spacing.l,
    lineHeight: moderateScale(22),
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B35',
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(14),
    borderRadius: responsive.borderRadius.large,
    gap: scale(8),
    shadowColor: '#FF6B35',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#F8F8FF',
  },
  benefitsSection: {
    marginBottom: responsive.spacing.l,
  },
  sectionTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: '700',
    color: '#2D1B69',
    paddingHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
  },
  benefitsList: {
    paddingHorizontal: responsive.spacing.m,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: responsive.spacing.m,
    gap: scale(16),
  },
  benefitText: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  benefitDescription: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
    lineHeight: moderateScale(20),
  },
  successSection: {
    marginBottom: responsive.spacing.xl,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    marginLeft: responsive.spacing.m,
    marginRight: responsive.spacing.s,
    width: scale(250),
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  successQuote: {
    fontSize: responsive.fontSize.medium,
    color: '#2D1B69',
    fontStyle: 'italic',
    marginBottom: responsive.spacing.s,
    lineHeight: moderateScale(22),
  },
  successAuthor: {
    fontSize: responsive.fontSize.regular,
    color: '#FF6B35',
    fontWeight: '600',
    marginBottom: responsive.spacing.s,
  },
  successStats: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
  },
  predictionsSection: {
    marginBottom: responsive.spacing.l,
  },
  predictionsList: {
    paddingHorizontal: responsive.spacing.m,
  },
  predictionCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    marginBottom: responsive.spacing.s,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  predictionLeft: {
    flex: 1,
  },
  predictionTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  predictionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  predictionViews: {
    fontSize: responsive.fontSize.regular,
    color: '#FF6B35',
  },
  predictionConfidence: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(8),
    borderRadius: responsive.borderRadius.medium,
  },
  confidenceValue: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  confidenceLabel: {
    fontSize: responsive.fontSize.tiny,
    color: '#666',
  },
  tierCard: {
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.l,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.xlarge,
    padding: responsive.spacing.m,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  tierHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
  },
  tierTextInfo: {
    flex: 1,
  },
  tierEmoji: {
    fontSize: responsive.fontSize.xxxlarge + scale(8),
  },
  tierTitle: {
    fontSize: responsive.fontSize.xlarge,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  tierRevenue: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
  },
  subscriberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: responsive.borderRadius.large,
    gap: scale(6),
  },
  subscriberCount: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
  },
  progressSection: {
    marginTop: responsive.spacing.m,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: verticalScale(8),
  },
  progressLabel: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
  },
  progressText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#2D1B69',
  },
  progressBar: {
    height: verticalScale(8),
    backgroundColor: '#E5E5E7',
    borderRadius: responsive.borderRadius.small / 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: responsive.borderRadius.small / 2,
  },
  progressHint: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    marginTop: verticalScale(8),
    textAlign: 'center',
  },
  codeSection: {
    marginBottom: responsive.spacing.l,
  },
  codeCard: {
    marginHorizontal: responsive.spacing.m,
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
  codeLabel: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
    marginBottom: verticalScale(12),
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    marginBottom: verticalScale(12),
  },
  codeText: {
    flex: 1,
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  copyButton: {
    padding: scale(8),
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B35',
    paddingVertical: verticalScale(12),
    borderRadius: responsive.borderRadius.medium,
    gap: scale(8),
  },
  shareButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#F8F8FF',
  },
  analyticsSection: {
    marginBottom: responsive.spacing.l,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: responsive.spacing.m,
    gap: scale(12),
  },
  statCard: {
    flex: 1,
    minWidth: scale(150),
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  revenueCard: {
    minWidth: scale(312),
    backgroundColor: '#FFF9F7',
    borderWidth: 1,
    borderColor: '#FFE5DC',
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  statLabel: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
  },
  statValue: {
    fontSize: responsive.fontSize.xlarge + scale(4),
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  revenueValue: {
    color: '#FF6B35',
  },
  statSubtext: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    marginTop: verticalScale(4),
  },
  tiersSection: {
    marginBottom: responsive.spacing.l,
  },
  tiersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.m,
  },
  tierItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: responsive.spacing.m,
    marginBottom: responsive.spacing.s,
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  currentTierItem: {
    borderColor: '#FF6B35',
    borderWidth: 2,
    backgroundColor: '#FFF9F7',
  },
  lockedTierItem: {
    opacity: 0.6,
  },
  tierItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(16),
  },
  tierItemInfo: {
    flex: 1,
  },
  tierItemTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
  },
  tierItemRange: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    marginTop: verticalScale(2),
  },
  tierItemRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  tierItemRevenue: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
  },
  tipsSection: {
    paddingHorizontal: responsive.spacing.m,
    paddingBottom: verticalScale(100),
  },
  tipCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.m,
    marginRight: responsive.spacing.s,
    width: scale(200),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  tipTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
    marginTop: responsive.spacing.s,
    marginBottom: responsive.spacing.xs,
    textAlign: 'center',
  },
  tipDescription: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
});

export default CreatorScreen; 