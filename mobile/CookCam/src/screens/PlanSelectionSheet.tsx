import React from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import {NativeStackNavigationProp} from '@react-navigation/native-stack';
import {RouteProp} from '@react-navigation/native';
import {RootStackParamList} from '../App';
import {
  ChefHat,
  DollarSign,
  Users,
  Star,
  TrendingUp,
} from 'lucide-react-native';
import {useTempData} from '../context/TempDataContext';

interface PlanSelectionSheetProps {
  navigation: NativeStackNavigationProp<RootStackParamList>;
  route: RouteProp<RootStackParamList, 'PlanSelection'>;
}

const PlanSelectionSheet: React.FC<PlanSelectionSheetProps> = ({
  navigation,
  route,
}) => {
  const {tempData, setSelectedPlan, exportTempData} = useTempData();

  const handlePlanSelection = (planType: 'consumer' | 'creator') => {
    // Store selected plan in temp context
    setSelectedPlan(planType);

    navigation.navigate('AccountGate', {
      intendedPlan: planType,
      tempData: exportTempData(),
    });
  };

  const renderConsumerPlan = () => (
    <TouchableOpacity
      style={[styles.planCard, styles.consumerCard]}
      onPress={() => handlePlanSelection('consumer')}>
      <View style={styles.planContent}>
        <View style={styles.planHeader}>
          <View style={styles.planIconContainer}>
            <ChefHat size={24} color="#FF6B35" />
          </View>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planTitle}>Get Cooking</Text>
            <Text style={styles.planSubtitle}>Free 3-day trial</Text>
            <Text style={styles.planPrice}>$3.99/mo after trial</Text>
          </View>
        </View>

        <View style={styles.planFeatures}>
          <View style={styles.featureItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.featureText}>
              Unlimited ingredient scanning
            </Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.featureText}>AI-powered recipe generation</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.featureText}>Step-by-step cook mode</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.featureText}>XP tracking & achievements</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={styles.bulletPoint} />
            <Text style={styles.featureText}>Recipe favorites & history</Text>
          </View>
        </View>
      </View>

      <View style={styles.planCTA}>
        <Text style={styles.ctaText}>Start Free Trial →</Text>
      </View>
    </TouchableOpacity>
  );

  const renderCreatorPlan = () => (
    <TouchableOpacity
      style={[styles.planCard, styles.creatorCard]}
      onPress={() => handlePlanSelection('creator')}>
      <View style={styles.planContent}>
        <View style={styles.planHeader}>
          <View style={styles.planIconContainer}>
            <Star size={24} color="#FFD700" />
          </View>
          <View style={styles.planTitleContainer}>
            <Text style={styles.planTitle}>Earn with CookCam</Text>
            <Text style={styles.planSubtitle}>Free 3-day Creator trial</Text>
            <View style={styles.revenueCallout}>
              <Text style={styles.revenueCalloutText}>30% Revenue Share</Text>
            </View>
            <Text style={styles.planPrice}>
              $9.99/mo + earn from every view
            </Text>
          </View>
        </View>

        <View style={styles.planFeatures}>
          <View style={styles.featureItem}>
            <View style={[styles.bulletPoint, styles.creatorBullet]} />
            <Text style={styles.featureText}>Everything in Get Cooking</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.bulletPoint, styles.creatorBullet]} />
            <Text style={styles.featureText}>Publish premium recipes</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.bulletPoint, styles.creatorBullet]} />
            <Text style={styles.featureText}>Creator analytics dashboard</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.bulletPoint, styles.creatorBullet]} />
            <Text style={styles.featureText}>Monetize your cooking skills</Text>
          </View>
          <View style={styles.featureItem}>
            <View style={[styles.bulletPoint, styles.creatorBullet]} />
            <Text style={styles.featureText}>Build your follower base</Text>
          </View>
        </View>
      </View>

      <View style={styles.planCTA}>
        <Text style={styles.ctaText}>Start Creator Trial →</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Choose Your Journey</Text>
        <Text style={styles.headerSubtitle}>
          Unlock the full CookCam experience with a plan that fits your goals
        </Text>
      </View>

      <View style={styles.plansContainer}>
        {renderConsumerPlan()}
        {renderCreatorPlan()}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          • Cancel anytime • No commitment • Full access during trial
        </Text>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 6,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
  plansContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  planCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 2,
    borderColor: 'transparent',
    height: 280,
    justifyContent: 'space-between',
  },
  planContent: {
    flex: 1,
  },
  consumerCard: {
    borderColor: '#FF6B35',
  },
  creatorCard: {
    borderColor: '#FFD700',
    position: 'relative',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  planIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F8F8FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planTitleContainer: {
    flex: 1,
  },
  planTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: 4,
  },
  planSubtitle: {
    fontSize: 14,
    color: '#66BB6A',
    fontWeight: '600',
    marginBottom: 2,
  },
  planPrice: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '500',
  },
  revenueCallout: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginVertical: 6,
  },
  revenueCalloutText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2D1B69',
  },
  planFeatures: {
    marginBottom: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF6B35',
    marginRight: 12,
  },
  creatorBullet: {
    backgroundColor: '#FFD700',
  },
  featureText: {
    fontSize: 14,
    color: '#2D1B69',
    flex: 1,
    lineHeight: 18,
  },
  planCTA: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});

export default PlanSelectionSheet;
