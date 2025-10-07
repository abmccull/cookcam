import AsyncStorage from '@react-native-async-storage/async-storage';
import { analyticsService } from '../services/analyticsService';
import logger from './logger';

/**
 * Experiment Configuration
 * Define your experiments here with their variants and allocation
 */
export interface ExperimentConfig {
  enabled: boolean;
  variants: string[];
  allocation: number[]; // Must sum to 100, e.g. [50, 50] for 50/50 split
  defaultVariant: string;
}

export const EXPERIMENTS: Record<string, ExperimentConfig> = {
  // Example: Value-first onboarding flow
  value_first_onboarding: {
    enabled: false, // Set to true to enable experiment
    variants: ['control', 'demo_first'],
    allocation: [50, 50],
    defaultVariant: 'control',
  },
  
  // Example: Trial duration test
  trial_duration: {
    enabled: false,
    variants: ['three_day', 'seven_day'],
    allocation: [50, 50],
    defaultVariant: 'seven_day',
  },
  
  // Example: Free tier availability
  free_tier_option: {
    enabled: true, // Always show free tier option
    variants: ['no_free_tier', 'with_free_tier'],
    allocation: [0, 100], // 100% get free tier option
    defaultVariant: 'with_free_tier',
  },
  
  // Example: Paywall messaging
  paywall_messaging: {
    enabled: false,
    variants: ['standard', 'urgency', 'social_proof'],
    allocation: [34, 33, 33],
    defaultVariant: 'standard',
  },
};

class ExperimentService {
  private readonly STORAGE_KEY_PREFIX = '@experiment_assignment_';
  
  /**
   * Get the variant for a user in an experiment
   * @param experimentName - The name of the experiment
   * @returns The assigned variant name
   */
  async getVariant(experimentName: string): Promise<string> {
    const experiment = EXPERIMENTS[experimentName];
    
    if (!experiment) {
      logger.warn(`Experiment ${experimentName} not found`);
      return 'control';
    }
    
    // If experiment is disabled, return default variant
    if (!experiment.enabled) {
      return experiment.defaultVariant;
    }
    
    // Check if user already has an assignment
    const storageKey = `${this.STORAGE_KEY_PREFIX}${experimentName}`;
    const existingAssignment = await AsyncStorage.getItem(storageKey);
    
    if (existingAssignment) {
      return existingAssignment;
    }
    
    // Assign new variant based on allocation
    const variant = this.assignVariant(experiment);
    
    // Store assignment
    await AsyncStorage.setItem(storageKey, variant);
    
    // Track experiment exposure
    analyticsService.track('experiment_assigned', {
      experiment: experimentName,
      variant,
      timestamp: new Date().toISOString(),
    });
    
    logger.info(`User assigned to variant "${variant}" for experiment "${experimentName}"`);
    
    return variant;
  }
  
  /**
   * Assign a variant based on allocation percentages
   */
  private assignVariant(experiment: ExperimentConfig): string {
    const random = Math.random() * 100;
    let cumulative = 0;
    
    for (let i = 0; i < experiment.variants.length; i++) {
      cumulative += experiment.allocation[i];
      if (random < cumulative) {
        return experiment.variants[i];
      }
    }
    
    // Fallback to default if something goes wrong
    return experiment.defaultVariant;
  }
  
  /**
   * Track an experiment conversion event
   * @param experimentName - The name of the experiment
   * @param conversionEvent - The conversion event name (e.g., 'trial_started')
   * @param properties - Additional properties to track
   */
  async trackConversion(
    experimentName: string,
    conversionEvent: string,
    properties?: Record<string, unknown>
  ): Promise<void> {
    const variant = await this.getVariant(experimentName);
    
    analyticsService.track(conversionEvent, {
      experiment: experimentName,
      variant,
      ...properties,
    });
  }
  
  /**
   * Reset a user's experiment assignments (useful for testing)
   */
  async resetAssignments(): Promise<void> {
    const keys = await AsyncStorage.getAllKeys();
    const experimentKeys = keys.filter(key => key.startsWith(this.STORAGE_KEY_PREFIX));
    await AsyncStorage.multiRemove(experimentKeys);
    logger.info('All experiment assignments reset');
  }
  
  /**
   * Get all current experiment assignments for the user
   */
  async getAllAssignments(): Promise<Record<string, string>> {
    const assignments: Record<string, string> = {};
    
    for (const experimentName of Object.keys(EXPERIMENTS)) {
      const variant = await this.getVariant(experimentName);
      assignments[experimentName] = variant;
    }
    
    return assignments;
  }
  
  /**
   * Force assign a specific variant (useful for testing/QA)
   */
  async forceVariant(experimentName: string, variant: string): Promise<void> {
    const storageKey = `${this.STORAGE_KEY_PREFIX}${experimentName}`;
    await AsyncStorage.setItem(storageKey, variant);
    logger.info(`Forced variant "${variant}" for experiment "${experimentName}"`);
  }
}

// Export singleton instance
export const experimentService = new ExperimentService();

/**
 * React Hook for experiments
 */
import { useState, useEffect } from 'react';

export const useExperiment = (experimentName: string): string => {
  const [variant, setVariant] = useState<string>(
    EXPERIMENTS[experimentName]?.defaultVariant || 'control'
  );
  
  useEffect(() => {
    const loadVariant = async () => {
      const assignedVariant = await experimentService.getVariant(experimentName);
      setVariant(assignedVariant);
    };
    
    loadVariant();
  }, [experimentName]);
  
  return variant;
};

export default experimentService;

