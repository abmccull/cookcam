import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useFeatureGate, useSubscription } from '../context/SubscriptionContext';

interface FeatureGateProps {
  feature: string;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

// Main feature gate component
export function FeatureGate({ 
  feature, 
  children, 
  fallback, 
  showUpgradePrompt = true 
}: FeatureGateProps) {
  const { hasAccess, checkAndPrompt } = useFeatureGate(feature);

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showUpgradePrompt) {
    return <UpgradePrompt feature={feature} />;
  }

  return null;
}

// Usage limit component
interface UsageLimitProps {
  feature: string;
  children: ReactNode;
  warningThreshold?: number; // Show warning when this percentage of limit is reached
}

export function UsageLimit({ 
  feature, 
  children, 
  warningThreshold = 0.8 
}: UsageLimitProps) {
  const { hasAccess, usage, remaining } = useFeatureGate(feature);

  if (!hasAccess) {
    return <UpgradePrompt feature={feature} />;
  }

  const showWarning = usage && remaining !== null && 
    remaining / usage.limit <= (1 - warningThreshold);

  return (
    <View style={styles.usageContainer}>
      {showWarning && (
        <View style={styles.warningBanner}>
          <Text style={styles.warningText}>
            ⚠️ {remaining} {feature} remaining this month
          </Text>
        </View>
      )}
      {children}
    </View>
  );
}

// Upgrade prompt component
interface UpgradePromptProps {
  feature: string;
  compact?: boolean;
}

function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  const { showUpgradePrompt } = useSubscription();

  const handleUpgrade = () => {
    showUpgradePrompt(feature);
  };

  if (compact) {
    return (
      <TouchableOpacity style={styles.compactPrompt} onPress={handleUpgrade}>
        <Text style={styles.compactPromptText}>🔒 Upgrade to unlock</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.upgradePrompt}>
      <View style={styles.lockIcon}>
        <Text style={styles.lockEmoji}>🔒</Text>
      </View>
      <Text style={styles.upgradeTitle}>Premium Feature</Text>
      <Text style={styles.upgradeMessage}>
        Upgrade to unlock {getFeatureDisplayName(feature)} and more!
      </Text>
      <TouchableOpacity style={styles.upgradeButton} onPress={handleUpgrade}>
        <Text style={styles.upgradeButtonText}>View Plans</Text>
      </TouchableOpacity>
    </View>
  );
}

// Specific feature gates for common features
export function UnlimitedScansGate({ children }: { children: ReactNode }) {
  return (
    <FeatureGate 
      feature="unlimited_scans" 
      fallback={
        <View style={styles.limitReached}>
          <Text style={styles.limitTitle}>Daily Scan Limit Reached</Text>
          <Text style={styles.limitMessage}>
            Upgrade to scan unlimited ingredients every day!
          </Text>
        </View>
      }
    >
      {children}
    </FeatureGate>
  );
}

export function PremiumRecipesGate({ children }: { children: ReactNode }) {
  return (
    <FeatureGate 
      feature="premium_recipes" 
      fallback={
        <View style={styles.limitReached}>
          <Text style={styles.limitTitle}>Premium Recipe</Text>
          <Text style={styles.limitMessage}>
            This advanced recipe requires a premium subscription
          </Text>
        </View>
      }
    >
      {children}
    </FeatureGate>
  );
}

export function CreatorToolsGate({ children }: { children: ReactNode }) {
  return (
    <FeatureGate 
      feature="creator_tools" 
      fallback={
        <View style={styles.limitReached}>
          <Text style={styles.limitTitle}>Creator Tools</Text>
          <Text style={styles.limitMessage}>
            Upgrade to Creator tier to access monetization tools
          </Text>
        </View>
      }
    >
      {children}
    </FeatureGate>
  );
}

// Helper function to get display names for features
function getFeatureDisplayName(feature: string): string {
  const displayNames: Record<string, string> = {
    unlimited_scans: 'unlimited scanning',
    premium_recipes: 'premium recipes',
    ad_free_experience: 'ad-free experience',
    advanced_nutrition: 'detailed nutrition analysis',
    meal_planning: 'meal planning',
    recipe_collections: 'recipe collections',
    creator_tools: 'creator monetization',
    priority_support: 'priority support',
    beta_features: 'beta features',
  };
  
  return displayNames[feature] || feature.replace(/_/g, ' ');
}

const styles = StyleSheet.create({
  usageContainer: {
    flex: 1,
  },
  warningBanner: {
    backgroundColor: '#FFF3CD',
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
  },
  warningText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '500',
  },
  upgradePrompt: {
    backgroundColor: '#F8F9FA',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  lockIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#6C757D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  lockEmoji: {
    fontSize: 24,
  },
  upgradeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 8,
  },
  upgradeMessage: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  upgradeButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  compactPrompt: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DEE2E6',
    alignItems: 'center',
  },
  compactPromptText: {
    color: '#6C757D',
    fontSize: 14,
    fontWeight: '500',
  },
  limitReached: {
    backgroundColor: '#F8F9FA',
    padding: 20,
    borderRadius: 8,
    alignItems: 'center',
    margin: 8,
  },
  limitTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#343A40',
    marginBottom: 8,
  },
  limitMessage: {
    fontSize: 14,
    color: '#6C757D',
    textAlign: 'center',
    lineHeight: 18,
  },
}); 