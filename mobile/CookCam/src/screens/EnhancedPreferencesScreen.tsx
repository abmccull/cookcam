import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import {
  Users,
  ChefHat,
  Clock,
  Utensils,
  Flame,
  Zap,
  X,
  Check,
  ArrowRight,
} from 'lucide-react-native';
import { scale, verticalScale, moderateScale, responsive } from '../utils/responsive';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { useAuth } from '../context/AuthContext';

interface EnhancedPreferencesScreenProps {
  navigation: any;
  route: {
    params: {
      ingredients: any[];
      imageUri?: string;
    };
  };
}

interface ServingOption {
  id: string;
  label: string;
  value: number;
  icon: string;
  isCustom?: boolean;
}

interface Appliance {
  id: string;
  name: string;
  category: string;
  icon: string;
  description: string;
  selected: boolean;
}

const EnhancedPreferencesScreen: React.FC<EnhancedPreferencesScreenProps> = ({
  navigation,
  route,
}) => {
  const { ingredients, imageUri } = route.params;
  const { user } = useAuth();
  
  // Serving size options
  const [servingOptions] = useState<ServingOption[]>([
    { id: 'myself', label: 'Just me', value: 1, icon: '👤' },
    { id: 'couple', label: 'Two people', value: 2, icon: '👥' },
    { id: 'small-family', label: 'Family (4)', value: 4, icon: '👨‍👩‍👧‍👦' },
    { id: 'large-family', label: 'Large group (6)', value: 6, icon: '👨‍👩‍👧‍👧' },
    { id: 'custom', label: 'Custom amount', value: 0, icon: '✏️', isCustom: true },
  ]);
  
  // State management
  const [selectedServing, setSelectedServing] = useState<ServingOption>(servingOptions[1]);
  const [customServingAmount, setCustomServingAmount] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  
  // Meal prep options
  const [mealPrepEnabled, setMealPrepEnabled] = useState(false);
  const [mealPrepPortions, setMealPrepPortions] = useState(4);
  const [showMealPrepInput, setShowMealPrepInput] = useState(false);
  
  // Kitchen appliances - All 12 from database
  const [appliances, setAppliances] = useState<Appliance[]>([
    { id: 'oven', name: 'Oven', category: 'cooking', icon: '🔥', description: 'Standard kitchen oven', selected: true },
    { id: 'stove', name: 'Stove', category: 'cooking', icon: '🔥', description: 'Stovetop cooking', selected: true },
    { id: 'air-fryer', name: 'Air Fryer', category: 'appliance', icon: '💨', description: 'Crispy cooking', selected: false },
    { id: 'slow-cooker', name: 'Slow Cooker', category: 'appliance', icon: '🍲', description: 'Long, slow cooking', selected: false },
    { id: 'grill', name: 'Grill', category: 'outdoor', icon: '🍖', description: 'Outdoor grilling', selected: false },
    { id: 'smoker', name: 'Smoker', category: 'outdoor', icon: '🚬', description: 'Smoking meats', selected: false },
    { id: 'microwave', name: 'Microwave', category: 'appliance', icon: '📱', description: 'Quick heating', selected: true },
    { id: 'instant-pot', name: 'Instant Pot', category: 'appliance', icon: '⚡', description: 'Pressure cooking', selected: false },
    { id: 'food-processor', name: 'Food Processor', category: 'tool', icon: '🔪', description: 'Chopping and mixing', selected: false },
    { id: 'stand-mixer', name: 'Stand Mixer', category: 'tool', icon: '🥧', description: 'Baking and mixing', selected: false },
    { id: 'blender', name: 'Blender', category: 'tool', icon: '🥤', description: 'Smoothies and sauces', selected: false },
    { id: 'toaster-oven', name: 'Toaster Oven', category: 'appliance', icon: '🍞', description: 'Small countertop oven', selected: false },
  ]);
  
  // Standard preferences
  const [cookingTime, setCookingTime] = useState('medium');
  const [difficulty, setDifficulty] = useState('any');
  const [dietary, setDietary] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState<string[]>([]);

  // Load user defaults
  useEffect(() => {
    loadUserDefaults();
  }, [user]);

  const loadUserDefaults = () => {
    if (user) {
      // Load saved preferences from user profile using optional chaining
      const defaultServing = (user as any).default_serving_size || 2;
      const defaultOption = servingOptions.find(opt => opt.value === defaultServing) || servingOptions[1];
      setSelectedServing(defaultOption);
      
      setMealPrepEnabled((user as any).meal_prep_enabled || false);
      setMealPrepPortions((user as any).default_meal_prep_count || 4);
      
      // Load kitchen appliances
      const userAppliances = (user as any).kitchen_appliances;
      if (userAppliances && Array.isArray(userAppliances)) {
        setAppliances(prev => prev.map(appliance => ({
          ...appliance,
          selected: userAppliances.includes(appliance.id),
        })));
      }
    }
  };

  const handleServingSelection = (option: ServingOption) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    
    if (option.isCustom) {
      setShowCustomInput(true);
    } else {
      setSelectedServing(option);
      setShowCustomInput(false);
    }
  };

  const handleCustomServingSubmit = () => {
    const amount = parseInt(customServingAmount);
    if (amount && amount > 0 && amount <= 50) {
      setSelectedServing({
        id: 'custom',
        label: `${amount} people`,
        value: amount,
        icon: '✏️',
        isCustom: true,
      });
      setShowCustomInput(false);
      setCustomServingAmount('');
      ReactNativeHapticFeedback.trigger('notificationSuccess');
    } else {
      Alert.alert('Invalid Amount', 'Please enter a number between 1 and 50');
    }
  };

  const toggleMealPrep = () => {
    ReactNativeHapticFeedback.trigger('impactMedium');
    setMealPrepEnabled(!mealPrepEnabled);
  };

  const handleMealPrepPortions = (portions: number) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setMealPrepPortions(portions);
  };

  const toggleAppliance = (applianceId: string) => {
    ReactNativeHapticFeedback.trigger('impactLight');
    setAppliances(prev => prev.map(appliance =>
      appliance.id === applianceId
        ? { ...appliance, selected: !appliance.selected }
        : appliance
    ));
  };

  const handleContinue = () => {
    const selectedAppliances = appliances.filter(a => a.selected).map(a => a.id);
    
    if (selectedAppliances.length === 0) {
      Alert.alert('No Appliances Selected', 'Please select at least one cooking appliance to continue.');
      return;
    }

    const preferences = {
      servingSize: selectedServing.value,
      mealPrepEnabled,
      mealPrepPortions: mealPrepEnabled ? mealPrepPortions : null,
      selectedAppliances,
      cookingTime,
      difficulty,
      dietary,
      cuisine,
    };

    ReactNativeHapticFeedback.trigger('notificationSuccess');
    
    navigation.navigate('RecipeCards', {
      ingredients,
      imageUri,
      preferences,
    });
  };

  const selectedApplianceCount = appliances.filter(a => a.selected).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Cooking Preferences</Text>
        <Text style={styles.subtitle}>Tell us about your cooking setup</Text>
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Serving Size Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Users size={20} color="#2D1B69" />
            <Text style={styles.sectionTitle}>How many people are you cooking for?</Text>
          </View>
          
          <View style={styles.servingGrid}>
            {servingOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.servingOption,
                  selectedServing.id === option.id && styles.servingOptionSelected,
                ]}
                onPress={() => handleServingSelection(option)}
              >
                <Text style={styles.servingIcon}>{option.icon}</Text>
                <Text style={[
                  styles.servingLabel,
                  selectedServing.id === option.id && styles.servingLabelSelected,
                ]}>
                  {option.label}
                </Text>
                {selectedServing.id === option.id && option.isCustom && (
                  <Text style={styles.customValue}>{selectedServing.value} people</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Meal Prep Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <ChefHat size={20} color="#2D1B69" />
            <Text style={styles.sectionTitle}>Meal Prep</Text>
          </View>
          
          <TouchableOpacity
            style={[styles.mealPrepToggle, mealPrepEnabled && styles.mealPrepToggleActive]}
            onPress={toggleMealPrep}
          >
            <View style={styles.mealPrepContent}>
              <Text style={[styles.mealPrepText, mealPrepEnabled && styles.mealPrepTextActive]}>
                I want to meal prep
              </Text>
              <Text style={[styles.mealPrepSubtext, mealPrepEnabled && styles.mealPrepSubtextActive]}>
                Prepare multiple portions for the week
              </Text>
            </View>
            <View style={[styles.checkbox, mealPrepEnabled && styles.checkboxActive]}>
              {mealPrepEnabled && <Check size={16} color="#FFFFFF" />}
            </View>
          </TouchableOpacity>

          {mealPrepEnabled && (
            <View style={styles.mealPrepPortions}>
              <Text style={styles.portionsLabel}>How many meal prep portions?</Text>
              <View style={styles.portionsRow}>
                {[3, 4, 5, 6, 8, 10, 12, 14].map((portions) => (
                  <TouchableOpacity
                    key={portions}
                    style={[
                      styles.portionOption,
                      mealPrepPortions === portions && styles.portionOptionSelected,
                    ]}
                    onPress={() => handleMealPrepPortions(portions)}
                  >
                    <Text style={[
                      styles.portionText,
                      mealPrepPortions === portions && styles.portionTextSelected,
                    ]}>
                      {portions}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Kitchen Appliances Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Utensils size={20} color="#2D1B69" />
            <Text style={styles.sectionTitle}>Available Kitchen Appliances</Text>
            <Text style={styles.applianceCount}>
              {selectedApplianceCount} selected
            </Text>
          </View>
          
          <View style={styles.applianceGrid}>
            {appliances.map((appliance) => (
              <TouchableOpacity
                key={appliance.id}
                style={[
                  styles.applianceCard,
                  appliance.selected && styles.applianceCardSelected,
                ]}
                onPress={() => toggleAppliance(appliance.id)}
              >
                <Text style={styles.applianceIcon}>{appliance.icon}</Text>
                <Text style={[
                  styles.applianceName,
                  appliance.selected && styles.applianceNameSelected,
                ]}>
                  {appliance.name}
                </Text>
                <Text style={[
                  styles.applianceDescription,
                  appliance.selected && styles.applianceDescriptionSelected,
                ]}>
                  {appliance.description}
                </Text>
                {appliance.selected && (
                  <View style={styles.applianceCheckbox}>
                    <Check size={14} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
          <Text style={styles.continueButtonText}>Generate Recipes</Text>
          <ArrowRight size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Custom Serving Input Modal */}
      <Modal
        visible={showCustomInput}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCustomInput(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TouchableOpacity
              style={styles.modalClose}
              onPress={() => setShowCustomInput(false)}
            >
              <X size={24} color="#666" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Custom Serving Size</Text>
            <Text style={styles.modalSubtitle}>How many people are you cooking for?</Text>
            
            <TextInput
              style={styles.customInput}
              value={customServingAmount}
              onChangeText={setCustomServingAmount}
              placeholder="Enter number of people"
              keyboardType="numeric"
              autoFocus
              maxLength={2}
            />
            
            <TouchableOpacity
              style={styles.modalButton}
              onPress={handleCustomServingSubmit}
            >
              <Text style={styles.modalButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F8FF',
  },
  header: {
    paddingHorizontal: responsive.spacing.m,
    paddingTop: responsive.spacing.s,
    paddingBottom: responsive.spacing.m,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E7',
    alignItems: 'center',
  },
  title: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#2D1B69',
    marginBottom: verticalScale(4),
  },
  subtitle: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: responsive.spacing.m,
    marginTop: responsive.spacing.m,
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: responsive.spacing.m,
  },
  sectionTitle: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#2D1B69',
    marginLeft: scale(8),
    flex: 1,
  },
  applianceCount: {
    fontSize: responsive.fontSize.small,
    color: '#4CAF50',
    fontWeight: '600',
  },
  servingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  servingOption: {
    width: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  servingOptionSelected: {
    backgroundColor: 'rgba(45, 27, 105, 0.1)',
    borderColor: '#2D1B69',
  },
  servingIcon: {
    fontSize: moderateScale(24),
    marginBottom: verticalScale(8),
  },
  servingLabel: {
    fontSize: responsive.fontSize.regular,
    color: '#666',
    fontWeight: '500',
    textAlign: 'center',
  },
  servingLabelSelected: {
    color: '#2D1B69',
    fontWeight: '600',
  },
  customValue: {
    fontSize: responsive.fontSize.small,
    color: '#4CAF50',
    fontWeight: '600',
    marginTop: verticalScale(4),
  },
  mealPrepToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  mealPrepToggleActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  mealPrepContent: {
    flex: 1,
  },
  mealPrepText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#666',
  },
  mealPrepTextActive: {
    color: '#4CAF50',
  },
  mealPrepSubtext: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    marginTop: verticalScale(2),
  },
  mealPrepSubtextActive: {
    color: '#4CAF50',
  },
  checkbox: {
    width: moderateScale(24),
    height: moderateScale(24),
    borderRadius: moderateScale(12),
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxActive: {
    backgroundColor: '#4CAF50',
  },
  mealPrepPortions: {
    marginTop: responsive.spacing.m,
  },
  portionsLabel: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#2D1B69',
    marginBottom: responsive.spacing.s,
  },
  portionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  portionOption: {
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.small,
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(16),
    borderWidth: 2,
    borderColor: 'transparent',
  },
  portionOptionSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  portionText: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#666',
  },
  portionTextSelected: {
    color: '#4CAF50',
  },
  applianceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  applianceCard: {
    width: '45%',
    backgroundColor: '#F8F9FA',
    borderRadius: responsive.borderRadius.medium,
    padding: responsive.spacing.m,
    alignItems: 'center',
    position: 'relative',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  applianceCardSelected: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderColor: '#4CAF50',
  },
  applianceIcon: {
    fontSize: moderateScale(32),
    marginBottom: verticalScale(8),
  },
  applianceName: {
    fontSize: responsive.fontSize.regular,
    fontWeight: '600',
    color: '#2D1B69',
    textAlign: 'center',
    marginBottom: verticalScale(4),
  },
  applianceNameSelected: {
    color: '#4CAF50',
  },
  applianceDescription: {
    fontSize: responsive.fontSize.small,
    color: '#8E8E93',
    textAlign: 'center',
  },
  applianceDescriptionSelected: {
    color: '#4CAF50',
  },
  applianceCheckbox: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: moderateScale(20),
    height: moderateScale(20),
    borderRadius: moderateScale(10),
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.m,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E7',
  },
  continueButton: {
    backgroundColor: '#2D1B69',
    borderRadius: responsive.borderRadius.medium,
    paddingVertical: responsive.spacing.m,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  continueButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: responsive.borderRadius.large,
    padding: responsive.spacing.l,
    marginHorizontal: responsive.spacing.l,
    position: 'relative',
    minWidth: scale(280),
  },
  modalClose: {
    position: 'absolute',
    top: responsive.spacing.m,
    right: responsive.spacing.m,
  },
  modalTitle: {
    fontSize: responsive.fontSize.large,
    fontWeight: 'bold',
    color: '#2D1B69',
    textAlign: 'center',
    marginBottom: verticalScale(8),
  },
  modalSubtitle: {
    fontSize: responsive.fontSize.regular,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: responsive.spacing.m,
  },
  customInput: {
    borderWidth: 2,
    borderColor: '#E5E5E7',
    borderRadius: responsive.borderRadius.medium,
    paddingHorizontal: responsive.spacing.m,
    paddingVertical: responsive.spacing.s,
    fontSize: responsive.fontSize.medium,
    textAlign: 'center',
    marginBottom: responsive.spacing.m,
  },
  modalButton: {
    backgroundColor: '#2D1B69',
    borderRadius: responsive.borderRadius.medium,
    paddingVertical: responsive.spacing.m,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: responsive.fontSize.medium,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default EnhancedPreferencesScreen; 