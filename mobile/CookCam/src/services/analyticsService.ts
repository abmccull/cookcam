import AsyncStorage from '@react-native-async-storage/async-storage';
import { cookCamApi } from './cookCamApi';
import { apiService } from './apiService';

// Event types
interface AnalyticsEvent {
  eventName: string;
  properties?: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  userId?: string;
}

interface SessionData {
  sessionId: string;
  startTime: Date;
  lastActivity: Date;
  events: AnalyticsEvent[];
  duration?: number;
}

// Analytics configuration
const ANALYTICS_CONFIG = {
  batchSize: 10,
  flushInterval: 30000, // 30 seconds
  maxRetries: 3,
  sessionTimeout: 30 * 60 * 1000, // 30 minutes
};

class AnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private currentSession: SessionData | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private isOnline = true;

  constructor() {
    this.initializeSession();
    this.setupPeriodicFlush();
  }

  // Initialize new session
  private async initializeSession() {
    try {
      // Check for existing session
      const storedSession = await AsyncStorage.getItem('analytics_session');
      if (storedSession) {
        const session: SessionData = JSON.parse(storedSession);
        
        // Check if session is still valid (not timed out)
        const lastActivity = new Date(session.lastActivity);
        const now = new Date();
        const timeSinceLastActivity = now.getTime() - lastActivity.getTime();
        
        if (timeSinceLastActivity < ANALYTICS_CONFIG.sessionTimeout) {
          // Resume existing session
          this.currentSession = {
            ...session,
            startTime: new Date(session.startTime), // Convert back to Date object
            lastActivity: now,
            events: [] // Don't load old events, they should have been flushed
          };
          
          this.track('session_resumed', {
            previousDuration: timeSinceLastActivity,
            totalEvents: session.events.length
          });
          
          return;
        }
      }
      
      // Create new session
      this.currentSession = {
        sessionId: this.generateSessionId(),
        startTime: new Date(),
        lastActivity: new Date(),
        events: []
      };
      
      await this.saveSession();
      this.track('session_started');
      
    } catch (error) {
      console.error('Failed to initialize analytics session:', error);
    }
  }

  // Generate unique session ID
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Save current session
  private async saveSession() {
    if (this.currentSession) {
      try {
        await AsyncStorage.setItem('analytics_session', JSON.stringify(this.currentSession));
      } catch (error) {
        console.error('Failed to save analytics session:', error);
      }
    }
  }

  // Track an event
  async track(eventName: string, properties?: Record<string, any>) {
    try {
      if (!this.currentSession) {
        await this.initializeSession();
      }

      // Double-check session exists after initialization
      if (!this.currentSession) {
        console.error('Failed to initialize analytics session');
        return;
      }

      const event: AnalyticsEvent = {
        eventName,
        properties: {
          ...properties,
          platform: 'mobile',
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
        sessionId: this.currentSession.sessionId,
        userId: await this.getUserId(),
      };

      // Add to queue and session
      this.eventQueue.push(event);
      this.currentSession.events.push(event);
      this.currentSession.lastActivity = new Date();

      // Save session periodically
      await this.saveSession();

      // Auto-flush if queue is full
      if (this.eventQueue.length >= ANALYTICS_CONFIG.batchSize) {
        this.flush();
      }

      console.log(`📊 Analytics: ${eventName}`, properties);
    } catch (error) {
      console.error('Failed to track event:', error);
    }
  }

  // Get current user ID
  private async getUserId(): Promise<string | undefined> {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (error) {
      console.error('Failed to get user ID for analytics:', error);
    }
    return undefined;
  }

  // Flush events to server
  async flush() {
    if (this.eventQueue.length === 0 || !this.isOnline) {
      return;
    }

    // Check if user is authenticated before sending events
    const isAuthenticated = await this.checkAuthentication();
    if (!isAuthenticated) {
      console.log('⚠️ User not authenticated, skipping analytics flush');
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send events in batches
      for (const event of eventsToSend) {
        await cookCamApi.trackEvent(event.eventName, event.properties);
      }

      console.log(`📤 Flushed ${eventsToSend.length} analytics events`);
    } catch (error) {
      console.error('Failed to flush analytics events:', error);
      
      // Re-add events to queue for retry (at the beginning)
      this.eventQueue.unshift(...eventsToSend);
      
      // Limit queue size to prevent memory issues
      if (this.eventQueue.length > 100) {
        this.eventQueue = this.eventQueue.slice(0, 100);
      }
    }
  }

  // Check if user is authenticated
  private async checkAuthentication(): Promise<boolean> {
    try {
      const token = await AsyncStorage.getItem('@cookcam_token');
      return !!token;
    } catch (error) {
      console.error('Failed to check authentication status:', error);
      return false;
    }
  }

  // Setup periodic flush
  private setupPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, ANALYTICS_CONFIG.flushInterval);
  }

  // Track screen view
  trackScreenView(screenName: string, properties?: Record<string, any>) {
    this.track('screen_view', {
      screen_name: screenName,
      ...properties
    }).catch(error => {
      console.error('Failed to track screen view:', error);
    });
  }

  // Track user actions
  trackUserAction(action: string, properties?: Record<string, any>) {
    this.track('user_action', {
      action,
      ...properties
    }).catch(error => {
      console.error('Failed to track user action:', error);
    });
  }

  // Track app lifecycle events
  trackAppStateChange(state: 'active' | 'background' | 'inactive') {
    this.track('app_state_change', { state }).catch(error => {
      console.error('Failed to track app state change:', error);
    });
    
    if (state === 'background') {
      this.flush(); // Flush immediately when app goes to background
    }
  }

  // Track ingredient scan
  trackIngredientScan(result: {
    ingredientCount: number;
    confidence: number;
    processingTime: number;
    imageSize?: number;
  }) {
    this.track('ingredient_scan', {
      ingredient_count: result.ingredientCount,
      average_confidence: result.confidence,
      processing_time_ms: result.processingTime,
      image_size_bytes: result.imageSize,
    }).catch(error => {
      console.error('Failed to track ingredient scan:', error);
    });
  }

  // Track recipe generation
  trackRecipeGeneration(result: {
    ingredientCount: number;
    recipeComplexity: 'simple' | 'medium' | 'complex';
    generationTime: number;
    success: boolean;
  }) {
    this.track('recipe_generation', {
      ingredient_count: result.ingredientCount,
      recipe_complexity: result.recipeComplexity,
      generation_time_ms: result.generationTime,
      success: result.success,
    }).catch(error => {
      console.error('Failed to track recipe generation:', error);
    });
  }

  // Track subscription events
  trackSubscriptionEvent(event: 'upgrade_prompt_shown' | 'upgrade_clicked' | 'subscription_started' | 'subscription_cancelled', properties?: Record<string, any>) {
    this.track('subscription_event', {
      subscription_event: event,
      ...properties
    });
  }

  // Track feature usage
  trackFeatureUsage(feature: string, properties?: Record<string, any>) {
    this.track('feature_usage', {
      feature_name: feature,
      ...properties
    });
  }

  // Track errors
  trackError(error: Error, context?: Record<string, any>) {
    this.track('error', {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      ...context
    });
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, unit: string = 'ms') {
    this.track('performance', {
      metric_name: metric,
      value,
      unit
    });
  }

  // Track engagement
  trackEngagement(action: 'recipe_saved' | 'recipe_shared' | 'tip_sent' | 'review_left', properties?: Record<string, any>) {
    this.track('engagement', {
      engagement_action: action,
      ...properties
    });
  }

  // Get session duration
  getSessionDuration(): number {
    if (!this.currentSession || !this.currentSession.startTime) return 0;
    
    // Ensure startTime is a Date object
    const startTime = this.currentSession.startTime instanceof Date 
      ? this.currentSession.startTime 
      : new Date(this.currentSession.startTime);
    
    return Date.now() - startTime.getTime();
  }

  // End current session
  async endSession() {
    if (this.currentSession) {
      const duration = this.getSessionDuration();
      
      this.track('session_ended', {
        session_duration_ms: duration,
        total_events: this.currentSession.events.length
      });
      
      // Flush remaining events
      await this.flush();
      
      // Clear session
      this.currentSession = null;
      await AsyncStorage.removeItem('analytics_session');
    }
  }

  // Set online/offline status
  setOnlineStatus(isOnline: boolean) {
    this.isOnline = isOnline;
    
    if (isOnline && this.eventQueue.length > 0) {
      // Flush queued events when coming back online
      this.flush();
    }
  }

  // Clean up
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.endSession();
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService();

// Analytics context hook (for React components)
import { useEffect } from 'react';

export function useAnalytics() {
  useEffect(() => {
    // Track when component mounts
    return () => {
      // Cleanup if needed
    };
  }, []);

  return {
    track: analyticsService.track.bind(analyticsService),
    trackScreenView: analyticsService.trackScreenView.bind(analyticsService),
    trackUserAction: analyticsService.trackUserAction.bind(analyticsService),
    trackIngredientScan: analyticsService.trackIngredientScan.bind(analyticsService),
    trackRecipeGeneration: analyticsService.trackRecipeGeneration.bind(analyticsService),
    trackSubscriptionEvent: analyticsService.trackSubscriptionEvent.bind(analyticsService),
    trackFeatureUsage: analyticsService.trackFeatureUsage.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackPerformance: analyticsService.trackPerformance.bind(analyticsService),
    trackEngagement: analyticsService.trackEngagement.bind(analyticsService),
  };
}

// Screen tracking hook
export function useScreenTracking(screenName: string, properties?: Record<string, any>) {
  useEffect(() => {
    analyticsService.trackScreenView(screenName, properties);
  }, [screenName]);
} 