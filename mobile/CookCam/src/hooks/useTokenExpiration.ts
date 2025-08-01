import { useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import TokenManager from "../services/tokenManager";
import logger from "../utils/logger";
import { Alert } from "react-native";

/**
 * Hook to handle token expiration and automatic refresh
 */
export const useTokenExpiration = () => {
  const { logout } = useAuth();
  const navigation = useNavigation();
  const tokenManager = TokenManager.getInstance();

  const handleTokenExpired = useCallback(async () => {
    logger.warn("Token expired, user needs to re-authenticate");

    Alert.alert(
      "Session Expired",
      "Your session has expired. Please log in again.",
      [
        {
          text: "OK",
          onPress: async () => {
            await logout(navigation);
          },
        },
      ],
      { cancelable: false },
    );
  }, [logout, navigation]);

  const checkTokenValidity = useCallback(async () => {
    try {
      const isExpired = await tokenManager.isTokenExpired();

      if (isExpired) {
        // Try to refresh
        const newToken = await tokenManager.refreshToken();

        if (!newToken) {
          // Refresh failed, need to re-authenticate
          handleTokenExpired();
        }
      }
    } catch (error) {
      logger.error("Token validity check failed", { error });
    }
  }, [tokenManager, handleTokenExpired]);

  useEffect(() => {
    // Check token validity on mount
    checkTokenValidity();

    // Set up periodic check (every 5 minutes)
    const interval = setInterval(
      () => {
        checkTokenValidity();
      },
      5 * 60 * 1000,
    );

    return () => {
      clearInterval(interval);
    };
  }, [checkTokenValidity]);

  return {
    checkTokenValidity,
    refreshToken: () => tokenManager.forceRefresh(),
  };
};
