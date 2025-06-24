import { useState, useEffect, useCallback } from "react";
import { CreatorAnalytics, CreatorEarnings } from "../types/creator";
import logger from "../utils/logger";
import StripeConnectService from "../services/StripeConnectService";
import { cookCamApi } from "../services/cookCamApi";

export interface UseCreatorDataReturn {
  analytics: CreatorAnalytics | null;
  earnings: CreatorEarnings | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  loadCreatorData: () => Promise<void>;
  handleRefresh: () => void;
}

export const useCreatorData = (isCreator: boolean): UseCreatorDataReturn => {
  const [analytics, setAnalytics] = useState<CreatorAnalytics | null>(null);
  const [earnings, setEarnings] = useState<CreatorEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCreatorData = useCallback(async () => {
    if (!isCreator) {
      setLoading(false);
      return;
    }

    try {
      setError(null);
      logger.debug("📊 Loading creator analytics and earnings");

      // Load analytics and earnings in parallel
      const [analyticsResponse, earningsResponse] = await Promise.all([
        cookCamApi.getCreatorAnalytics(),
        StripeConnectService.getInstance().getCreatorEarnings(),
      ]);

      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
        logger.debug("✅ Creator analytics loaded", analyticsResponse.data);
      } else {
        logger.warn("⚠️ Failed to load analytics", analyticsResponse);
      }

      // Handle earnings response - StripeConnectService returns CreatorEarnings directly
      if (earningsResponse) {
        setEarnings({
          total_earnings: earningsResponse.totalEarnings,
          available_balance: earningsResponse.currentBalance,
          pending_balance: earningsResponse.pendingBalance,
          last_payout_date: earningsResponse.lastPayoutDate?.toISOString() || null,
          next_payout_date: earningsResponse.nextPayoutDate?.toISOString() || null,
        });
        logger.debug("✅ Creator earnings loaded", earningsResponse);
      }

    } catch (error) {
      logger.error("❌ Failed to load creator data:", error);
      setError("Failed to load creator data. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCreator]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCreatorData();
  }, [loadCreatorData]);

  useEffect(() => {
    loadCreatorData();
  }, [loadCreatorData]);

  return {
    analytics,
    earnings,
    loading,
    refreshing,
    error,
    loadCreatorData,
    handleRefresh,
  };
}; 