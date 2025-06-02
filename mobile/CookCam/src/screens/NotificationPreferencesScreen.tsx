import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Platform,
} from 'react-native';
import {
  Bell,
  Flame,
  Trophy,
  Users,
  ChefHat,
  Target,
  Clock,
  Info,
  ChevronLeft,
} from 'lucide-react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SmartNotificationService from '../services/SmartNotificationService';

interface NotificationCategory {
  id: string;
  title: string;
  description: string;
  icon: any;
  enabled: boolean;
  color: string;
}

const NotificationPreferencesScreen: React.FC<{navigation: any}> = ({navigation}) => {
  const [masterEnabled, setMasterEnabled] = useState(true);
  const [categories, setCategories] = useState<NotificationCategory[]>([
    {
      id: 'streaks',
      title: 'Streak Reminders',
      description: 'Daily reminders to maintain your cooking streak',
      icon: Flame,
      enabled: true,
      color: '#FF6B35',
    },
    {
      id: 'achievements',
      title: 'Achievement Alerts',
      description: 'Notifications when you\'re close to earning badges',
      icon: Trophy,
      enabled: true,
      color: '#FFB800',
    },
    {
      id: 'social',
      title: 'Social Updates',
      description: 'When friends are cooking or beat your records',
      icon: Users,
      enabled: true,
      color: '#9C27B0',
    },
    {
      id: 'recipes',
      title: 'Recipe Suggestions',
      description: 'Personalized recipe recommendations',
      icon: ChefHat,
      enabled: true,
      color: '#4CAF50',
    },
    {
      id: 'challenges',
      title: 'Challenge Reminders',
      description: 'Updates about weekly challenges and competitions',
      icon: Target,
      enabled: true,
      color: '#2196F3',
    },
    {
      id: 'reminders',
      title: 'Cooking Reminders',
      description: 'Smart reminders based on your cooking patterns',
      icon: Clock,
      enabled: true,
      color: '#FF9800',
    },
  ]);
  
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
  });
  
  useEffect(() => {
    loadPreferences();
  }, []);
  
  const loadPreferences = async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem('notificationPreferences');
      if (savedPrefs) {
        const prefs = JSON.parse(savedPrefs);
        setMasterEnabled(prefs.masterEnabled);
        setCategories(prefs.categories || categories);
        setQuietHours(prefs.quietHours || quietHours);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };
  
  const savePreferences = async () => {
    try {
      const prefs = {
        masterEnabled,
        categories,
        quietHours,
      };
      await AsyncStorage.setItem('notificationPreferences', JSON.stringify(prefs));
      
      // Update notification service
      const categoryPrefs = categories.reduce((acc, cat) => ({
        ...acc,
        [cat.id]: cat.enabled && masterEnabled,
      }), {});
      
      await SmartNotificationService.updateNotificationPreferences(categoryPrefs);
      
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } catch (error) {
      console.error('Error saving preferences:', error);
    }
  };
  
  const toggleMaster = async (value: boolean) => {
    setMasterEnabled(value);
    ReactNativeHapticFeedback.trigger('impactLight');
    
    if (!value) {
      Alert.alert(
        'Turn Off All Notifications?',
        'You won\'t receive any notifications from CookCam. You can turn them back on anytime.',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Turn Off',
            style: 'destructive',
            onPress: async () => {
              await savePreferences();
            },
          },
        ],
      );
    } else {
      await savePreferences();
    }
  };
  
  const toggleCategory = async (categoryId: string) => {
    ReactNativeHapticFeedback.trigger('selection');
    
    setCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId ? {...cat, enabled: !cat.enabled} : cat
      )
    );
    
    // Save immediately
    setTimeout(savePreferences, 100);
  };
  
  const showInfo = (category: NotificationCategory) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    
    const examples = {
      streaks: 'Example: "🔥 Keep Your Streak Alive! Cook something today to maintain your 7-day streak!"',
      achievements: 'Example: "🏆 So Close to a Badge! Just 2 more recipes for Master Chef badge!"',
      social: 'Example: "👥 3 friends just claimed the viral Pasta recipe!"',
      recipes: 'Example: "🍝 Perfect for Tonight! Your favorite Creamy Pasta takes just 30 min"',
      challenges: 'Example: "⏰ Challenge Ending Soon! Complete 2 more recipes to finish!"',
      reminders: 'Example: "👨‍🍳 Time to Cook! You usually start cooking around this time"',
    };
    
    Alert.alert(
      category.title,
      `${category.description}\n\n${examples[category.id as keyof typeof examples]}`,
      [{text: 'Got it!'}]
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <ChevronLeft size={24} color="#2D1B69" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
      </View>
      
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Master Toggle */}
        <View style={styles.masterToggleCard}>
          <View style={styles.masterToggleContent}>
            <Bell size={24} color={masterEnabled ? '#FF6B35' : '#8E8E93'} />
            <View style={styles.masterToggleText}>
              <Text style={styles.masterToggleTitle}>All Notifications</Text>
              <Text style={styles.masterToggleSubtitle}>
                {masterEnabled ? 'Notifications are on' : 'Notifications are off'}
              </Text>
            </View>
          </View>
          <Switch
            value={masterEnabled}
            onValueChange={toggleMaster}
            trackColor={{false: '#E5E5E7', true: '#FF6B35'}}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#E5E5E7"
          />
        </View>
        
        {/* Categories */}
        <View style={[styles.section, !masterEnabled && styles.sectionDisabled]}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          {categories.map(category => {
            const Icon = category.icon;
            return (
              <View key={category.id} style={styles.categoryCard}>
                <View style={styles.categoryLeft}>
                  <View style={[styles.categoryIcon, {backgroundColor: category.color + '20'}]}>
                    <Icon size={20} color={category.color} />
                  </View>
                  <View style={styles.categoryText}>
                    <Text style={styles.categoryTitle}>{category.title}</Text>
                    <Text style={styles.categoryDescription}>{category.description}</Text>
                  </View>
                </View>
                <View style={styles.categoryRight}>
                  <TouchableOpacity
                    style={styles.infoButton}
                    onPress={() => showInfo(category)}
                    disabled={!masterEnabled}
                  >
                    <Info size={16} color="#8E8E93" />
                  </TouchableOpacity>
                  <Switch
                    value={category.enabled && masterEnabled}
                    onValueChange={() => toggleCategory(category.id)}
                    trackColor={{false: '#E5E5E7', true: category.color}}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#E5E5E7"
                    disabled={!masterEnabled}
                  />
                </View>
              </View>
            );
          })}
        </View>
        
        {/* Quiet Hours */}
        <View style={[styles.section, !masterEnabled && styles.sectionDisabled]}>
          <Text style={styles.sectionTitle}>Quiet Hours</Text>
          <View style={styles.quietHoursCard}>
            <View style={styles.quietHoursHeader}>
              <View style={styles.quietHoursLeft}>
                <Clock size={20} color="#FF9800" />
                <Text style={styles.quietHoursTitle}>Do Not Disturb</Text>
              </View>
              <Switch
                value={quietHours.enabled && masterEnabled}
                onValueChange={(value) => {
                  ReactNativeHapticFeedback.trigger('selection');
                  setQuietHours({...quietHours, enabled: value});
                  setTimeout(savePreferences, 100);
                }}
                trackColor={{false: '#E5E5E7', true: '#FF9800'}}
                thumbColor="#FFFFFF"
                ios_backgroundColor="#E5E5E7"
                disabled={!masterEnabled}
              />
            </View>
            <Text style={styles.quietHoursDescription}>
              No notifications between {quietHours.startTime} - {quietHours.endTime}
            </Text>
          </View>
        </View>
        
        {/* Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.tipsTitle}>💡 Pro Tips</Text>
          <Text style={styles.tipText}>
            • Notifications are sent based on your cooking patterns
          </Text>
          <Text style={styles.tipText}>
            • We'll never spam you - maximum 3 notifications per day
          </Text>
          <Text style={styles.tipText}>
            • Turn on social notifications to stay motivated!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D1B69',
  },
  headerSpacer: {
    width: 40,
  },
  masterToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 24,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  masterToggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  masterToggleText: {
    marginLeft: 16,
    flex: 1,
  },
  masterToggleTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 4,
  },
  masterToggleSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  section: {
    marginBottom: 24,
  },
  sectionDisabled: {
    opacity: 0.5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1B69',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryText: {
    marginLeft: 16,
    flex: 1,
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: 2,
  },
  categoryDescription: {
    fontSize: 13,
    color: '#8E8E93',
    lineHeight: 18,
  },
  categoryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoButton: {
    padding: 4,
  },
  quietHoursCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E7',
  },
  quietHoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  quietHoursLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quietHoursTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1B69',
  },
  quietHoursDescription: {
    fontSize: 14,
    color: '#8E8E93',
  },
  tipsSection: {
    backgroundColor: 'rgba(255, 184, 0, 0.1)',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 184, 0, 0.2)',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFB800',
    marginBottom: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});

export default NotificationPreferencesScreen; 