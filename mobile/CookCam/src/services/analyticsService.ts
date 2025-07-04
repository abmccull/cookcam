import AsyncStorage from "@react-native-async-storage/async-storage";
import { cookCamApi } from "./cookCamApi";
import { apiService } from "./apiService";
import { secureStorage, SECURE_KEYS } from "./secureStorage";

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
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private isOnline = true;

  constructor() {
    this.initializeSession();
    this.setupPeriodicFlush();
  }

  // Initialize new session
  private async initializeSession() {
    try {
      // Check for existing session
      const storedSession = await AsyncStorage.getItem("analytics_session");
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
            events: [], // Don't load old events, they should have been flushed
          };

          this.track("session_resumed", {
            previousDuration: timeSinceLastActivity,
            totalEvents: session.events.length,
          });

          return;
        }
      }

      // Create new session
      const sessionId = this.generateSessionId();
      if (!sessionId) {
        throw new Error("Failed to generate session ID");
      }

      this.currentSession = {
        sessionId,
        startTime: new Date(),
        lastActivity: new Date(),
        events: [],
      };

      await this.saveSession();

      // Track session started with a separate call to avoid infinite recursion
      setTimeout(() => {
        this.track("session_started").catch(console.error);
      }, 100);
    } catch (error) {
      logger.error("Failed to initialize analytics session:", error);
      // Create a minimal fallback session to prevent null errors
      this.currentSession = {
        sessionId: `fallback_${Date.now()}`,
        startTime: new Date(),
        lastActivity: new Date(),
        events: [],
      };
    }
  }

  // Generate unique session ID
  private generateSessionId(): string {
    try {
      const timestamp = Date.now();
      const randomPart = Math.random().toString(36).substr(2, 9);
      const sessionId = `session_${timestamp}_${randomPart}`;

      // Validate session ID
      if (!sessionId || sessionId.length < 10) {
        throw new Error("Generated session ID is invalid");
      }

      return sessionId;
    } catch (error) {
      logger.error("Failed to generate session ID:", error);
      // Fallback session ID
      return `session_fallback_${Date.now()}`;
    }
  }

  // Save current session
  private async saveSession() {
    if (this.currentSession) {
      try {
        await AsyncStorage.setItem(
          "analytics_session",
          JSON.stringify(this.currentSession),
        );
      } catch (error) {
        logger.error("Failed to save analytics session:", error);
      }
    }
  }

  // Track an event
  async track(eventName: string, properties?: Record<string, any>) {
    try {
      // Limit memory usage - if queue is too large, skip tracking
      if (this.eventQueue.length > 100) {
        logger.warn(
          "⚠️ Analytics queue too large, skipping event to prevent memory issues",
        );
        return;
      }

      if (!this.currentSession) {
        await this.initializeSession();
      }

      // Double-check session exists after initialization
      if (!this.currentSession) {
        logger.error("❌ Failed to initialize analytics session");
        return;
      }

      // Final safety check for sessionId
      if (!this.currentSession.sessionId) {
        logger.error("❌ Session exists but missing sessionId");
        return;
      }

      if (!this.currentSession.events) {
        this.currentSession.events = [];
      }

      // Limit session events to prevent memory bloat
      if (this.currentSession.events.length > 200) {
        this.currentSession.events = this.currentSession.events.slice(-100); // Keep last 100
      }

      // Get userId safely to prevent freezing
      let userId: string | undefined;
      try {
        userId = await Promise.race([
          this.getUserId(),
          new Promise<undefined>((resolve) =>
            setTimeout(() => resolve(undefined), 1000),
          ), // 1 second timeout
        ]);
      } catch (error) {
        logger.warn(
          "⚠️ Failed to get user ID for analytics, continuing without it",
        );
        userId = undefined;
      }

      const event: AnalyticsEvent = {
        eventName,
        properties: {
          ...properties,
          platform: "mobile",
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date(),
        sessionId: this.currentSession?.sessionId || `emergency_${Date.now()}`,
        userId: userId,
      };

      // Add to queue and session
      this.eventQueue.push(event);
      if (this.currentSession?.events) {
        this.currentSession.events.push(event);
      }
      if (this.currentSession) {
        this.currentSession.lastActivity = new Date();
      }

      // Save session periodically
      await this.saveSession();

      // Auto-flush if queue is full
      if (this.eventQueue.length >= ANALYTICS_CONFIG.batchSize) {
        this.flush();
      }

      logger.debug(`📊 Analytics: ${eventName}`, properties);
    } catch (error) {
      logger.error("Failed to track event:", error);
    }
  }

  // Get current user ID
  private async getUserId(): Promise<string | undefined> {
    try {
      const userStr = await AsyncStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.id;
      }
    } catch (error) {
      logger.error("Failed to get user ID for analytics:", error);
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
      logger.debug("⚠️ User not authenticated, skipping analytics flush");
      return;
    }

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Send events in batches
      for (const event of eventsToSend) {
        await cookCamApi.trackEvent(event.eventName, event.properties);
      }

      logger.debug(`📤 Flushed ${eventsToSend.length} analytics events`);
    } catch (error) {
      logger.error("Failed to flush analytics events:", error);

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
      const token = await secureStorage.getSecureItem(SECURE_KEYS.ACCESS_TOKEN);
      return !!token;
    } catch (error) {
      logger.error("Failed to check authentication status:", error);
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
    this.track("screen_view", {
      screen_name: screenName,
      ...properties,
    }).catch((error) => {
      logger.error("Failed to track screen view:", error);
    });
  }

  // Track user actions
  trackUserAction(action: string, properties?: Record<string, any>) {
    this.track("user_action", {
      action,
      ...properties,
    }).catch((error) => {
      logger.error("Failed to track user action:", error);
    });
  }

  // Track app lifecycle events
  trackAppStateChange(state: "active" | "background" | "inactive") {
    this.track("app_state_change", { state }).catch((error) => {
      logger.error("Failed to track app state change:", error);
    });

    if (state === "background") {
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
    this.track("ingredient_scan", {
      ingredient_count: result.ingredientCount,
      average_confidence: result.confidence,
      processing_time_ms: result.processingTime,
      image_size_bytes: result.imageSize,
    }).catch((error) => {
      logger.error("Failed to track ingredient scan:", error);
    });
  }

  // Track recipe generation
  trackRecipeGeneration(result: {
    ingredientCount: number;
    recipeComplexity: "simple" | "medium" | "complex";
    generationTime: number;
    success: boolean;
  }) {
    this.track("recipe_generation", {
      ingredient_count: result.ingredientCount,
      recipe_complexity: result.recipeComplexity,
      generation_time_ms: result.generationTime,
      success: result.success,
    }).catch((error) => {
      logger.error("Failed to track recipe generation:", error);
    });
  }

  // Track subscription events
  trackSubscriptionEvent(
    event:
      | "upgrade_prompt_shown"
      | "upgrade_clicked"
      | "subscription_started"
      | "subscription_cancelled",
    properties?: Record<string, any>,
  ) {
    this.track("subscription_event", {
      subscription_event: event,
      ...properties,
    });
  }

  // Track feature usage
  trackFeatureUsage(feature: string, properties?: Record<string, any>) {
    this.track("feature_usage", {
      feature_name: feature,
      ...properties,
    });
  }

  // Track errors
  trackError(error: Error, context?: Record<string, any>) {
    this.track("error", {
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name,
      ...context,
    });
  }

  // Track performance metrics
  trackPerformance(metric: string, value: number, unit: string = "ms") {
    this.track("performance", {
      metric_name: metric,
      value,
      unit,
    });
  }

  // Track engagement
  trackEngagement(
    action: "recipe_saved" | "recipe_shared" | "tip_sent" | "review_left",
    properties?: Record<string, any>,
  ) {
    this.track("engagement", {
      engagement_action: action,
      ...properties,
    });
  }

  // Get session duration
  getSessionDuration(): number {
    if (!this.currentSession || !this.currentSession.startTime) {
      return 0;
    }

    // Ensure startTime is a Date object
    const startTime =
      this.currentSession.startTime instanceof Date
        ? this.currentSession.startTime
        : new Date(this.currentSession.startTime);

    return Date.now() - startTime.getTime();
  }

  // End current session
  async endSession() {
    if (this.currentSession) {
      const duration = this.getSessionDuration();

      this.track("session_ended", {
        session_duration_ms: duration,
        total_events: this.currentSession.events.length,
      });

      // Flush remaining events
      await this.flush();

      // Clear session
      this.currentSession = null;
      await AsyncStorage.removeItem("analytics_session");
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
import { useEffect } from "react";
import logger from "../utils/logger";


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
    trackIngredientScan:
      analyticsService.trackIngredientScan.bind(analyticsService),
    trackRecipeGeneration:
      analyticsService.trackRecipeGeneration.bind(analyticsService),
    trackSubscriptionEvent:
      analyticsService.trackSubscriptionEvent.bind(analyticsService),
    trackFeatureUsage:
      analyticsService.trackFeatureUsage.bind(analyticsService),
    trackError: analyticsService.trackError.bind(analyticsService),
    trackPerformance: analyticsService.trackPerformance.bind(analyticsService),
    trackEngagement: analyticsService.trackEngagement.bind(analyticsService),
  };
}

// Screen tracking hook
export function useScreenTracking(
  screenName: string,
  properties?: Record<string, any>,
) {
  useEffect(() => {
    analyticsService.trackScreenView(screenName, properties);
  }, [screenName]);
}
