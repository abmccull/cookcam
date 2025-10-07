/**
 * Feature Flags Configuration
 * Simple feature flag system for enabling/disabling features
 */

export interface FeatureFlag {
  enabled: boolean;
  description: string;
  rolloutPercentage?: number; // 0-100, if undefined = 100%
}

export const FEATURE_FLAGS: Record<string, FeatureFlag> = {
  // Onboarding features
  demo_onboarding: {
    enabled: true,
    description: 'Enable demo onboarding flow (camera scan before auth)',
    rolloutPercentage: 100,
  },
  
  camera_permission_primer: {
    enabled: true,
    description: 'Show custom primer before requesting camera permission',
    rolloutPercentage: 100,
  },
  
  // Paywall features
  annual_billing_option: {
    enabled: true,
    description: 'Show annual billing toggle on paywall',
    rolloutPercentage: 100,
  },
  
  free_tier_option: {
    enabled: true,
    description: 'Show "Maybe later" free tier option',
    rolloutPercentage: 100,
  },
  
  restore_purchases: {
    enabled: true,
    description: 'Enable restore purchases functionality',
    rolloutPercentage: 100,
  },
  
  // Social proof
  social_proof_testimonials: {
    enabled: true,
    description: 'Show testimonials and social proof on paywall',
    rolloutPercentage: 100,
  },
  
  trust_badges: {
    enabled: true,
    description: 'Show trust badges (rating, user count) on plan selection',
    rolloutPercentage: 100,
  },
  
  // Future features (disabled by default)
  recipe_ai_enhancement: {
    enabled: false,
    description: 'Enhanced AI recipe generation with better quality',
    rolloutPercentage: 0,
  },
  
  voice_input: {
    enabled: false,
    description: 'Voice input for ingredient entry',
    rolloutPercentage: 0,
  },
  
  collaborative_cooking: {
    enabled: false,
    description: 'Share recipes with friends in real-time',
    rolloutPercentage: 0,
  },
};

class FeatureFlagService {
  /**
   * Check if a feature is enabled
   * @param featureName - The name of the feature flag
   * @returns true if feature is enabled for the user
   */
  isEnabled(featureName: string): boolean {
    const flag = FEATURE_FLAGS[featureName];
    
    if (!flag) {
      console.warn(`Feature flag ${featureName} not found, defaulting to false`);
      return false;
    }
    
    // If feature is globally disabled, return false
    if (!flag.enabled) {
      return false;
    }
    
    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined && flag.rolloutPercentage < 100) {
      // Simple percentage check (not user-stable, just random)
      // For production, you'd want this to be consistent per user
      const random = Math.random() * 100;
      return random < flag.rolloutPercentage;
    }
    
    return true;
  }
  
  /**
   * Get all enabled features
   */
  getEnabledFeatures(): string[] {
    return Object.entries(FEATURE_FLAGS)
      .filter(([_, flag]) => flag.enabled)
      .map(([name]) => name);
  }
  
  /**
   * Get flag details
   */
  getFlag(featureName: string): FeatureFlag | undefined {
    return FEATURE_FLAGS[featureName];
  }
}

// Export singleton instance
export const featureFlagService = new FeatureFlagService();

/**
 * React Hook for feature flags
 */
import { useMemo } from 'react';

export const useFeatureFlag = (featureName: string): boolean => {
  return useMemo(() => featureFlagService.isEnabled(featureName), [featureName]);
};

export default featureFlagService;

