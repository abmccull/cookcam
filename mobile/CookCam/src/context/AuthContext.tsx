import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  secureStorage,
  SECURE_KEYS,
  STORAGE_KEYS,
} from "../services/secureStorage";
import { supabase } from "../services/supabaseClient";
import BiometricAuthService from "../services/biometricAuth";
import logger from "../utils/logger";


interface User {
  id: string;
  email: string;
  name: string;
  isCreator: boolean;
  creatorTier?: number;
  level: number;
  xp: number;
  streak: number;
  badges: string[];
  avatarUrl?: string;
  creatorCode?: string;
  favoriteCount?: number;
  subscriberCount?: number;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isCreatingProfile: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithBiometrics: (credentials: { email: string; token: string; refreshToken?: string }) => Promise<void>;
  enableBiometricLogin: (email: string, token: string) => Promise<void>;
  disableBiometricLogin: () => Promise<void>;
  signup: (
    email: string,
    password: string,
    name: string,
    isCreator: boolean,
  ) => Promise<void>;
  logout: (navigation?: any) => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = SECURE_KEYS.ACCESS_TOKEN;

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logger.debug("🔐 Auth state changed:", event, session?.user?.id);

      try {
        if (session?.user) {
          await loadUserProfile(session.user.id, session.access_token);
        } else {
          setUser(null);
          await secureStorage.removeSecureItem(TOKEN_KEY).catch(console.error);
        }
      } catch (error) {
        logger.error("Error handling auth state change:", error);
      } finally {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        logger.error("Session check error:", error);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        await loadUserProfile(session.user.id, session.access_token);
      }
    } catch (error) {
      logger.error("Session check failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string, accessToken: string) => {
    try {
      // Store the Supabase session token securely
      await secureStorage.setSecureItem(TOKEN_KEY, accessToken);

      // Get user profile from our users table
      const { data: userData, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        // If user profile doesn't exist (PGRST116), create it
        if (error.code === "PGRST116") {
          logger.debug("🔄 User profile not found, creating...");
          try {
            await createUserProfile(userId);
          } catch (createError) {
            logger.error("Failed to create user profile:", createError);
            // Set loading to false since we're done trying
            setIsLoading(false);
          }
          return;
        }
        logger.error("Error loading user profile:", error);
        return;
      }

      if (userData) {
        const formattedUser: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name || userData.email,
          isCreator: userData.is_creator || false,
          creatorTier: userData.creator_tier || undefined,
          level: userData.level || 1,
          xp: userData.total_xp || userData.xp || 0,
          streak: userData.streak_current || 0,
          badges: [], // Default to empty array since badges column doesn't exist yet
          avatarUrl: userData.avatar_url || undefined,
          creatorCode: undefined, // Field not confirmed in schema
          favoriteCount: undefined, // Field not confirmed in schema
          subscriberCount: undefined, // Field not confirmed in schema
        };
        setUser(formattedUser);
      }
    } catch (error) {
      logger.error("Failed to load user profile:", error);
    }
  };

  const createUserProfile = async (userId: string) => {
    try {
      setIsCreatingProfile(true);
      logger.debug("🔄 Creating user profile for:", userId);

      // Get the user's auth data first
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !authUser) {
        logger.error("Error getting auth user:", authError);
        throw new Error("Could not get user authentication data");
      }

      logger.debug("📝 Creating profile for user:", authUser.email);

      // Create user profile in our users table
      const { data: newUser, error: profileError } = await supabase
        .from("users")
        .insert([
          {
            id: userId,
            email: authUser.email,
            name: authUser.user_metadata?.name || authUser.email,
            is_creator: false,
            level: 1,
            xp: 0,
            total_xp: 0,
            streak_current: 0,
          },
        ])
        .select()
        .single();

      if (profileError) {
        logger.error("Profile creation error:", profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      if (newUser) {
        logger.debug("✅ User profile created successfully");
        const formattedUser: User = {
          id: newUser.id,
          email: newUser.email,
          name: newUser.name || newUser.email,
          isCreator: newUser.is_creator || false,
          creatorTier: newUser.creator_tier || undefined,
          level: newUser.level || 1,
          xp: newUser.total_xp || newUser.xp || 0,
          streak: newUser.streak_current || 0,
          badges: [], // Default to empty array since badges column doesn't exist yet
          avatarUrl: newUser.avatar_url || undefined,
          creatorCode: undefined, // Field not confirmed in schema
          favoriteCount: undefined, // Field not confirmed in schema
          subscriberCount: undefined, // Field not confirmed in schema
        };
        setUser(formattedUser);
      }
    } catch (error) {
      logger.error("Failed to create user profile:", error);
      // You might want to show an error alert here
      throw error;
    } finally {
      setIsCreatingProfile(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.session?.user) {
        await loadUserProfile(data.session.user.id, data.session.access_token);
        
        // Check if user had biometric login enabled and refresh the stored credentials
        const biometricService = BiometricAuthService.getInstance();
        const wasEnabled = await biometricService.isBiometricEnabled();
        const storedCredentials = await biometricService.getStoredCredentials();
        const hasStoredCredentials = !!storedCredentials;
        
        if (wasEnabled && hasStoredCredentials) {
          logger.debug("🔐 Refreshing biometric credentials after password login");
          try {
            // Update stored credentials with fresh tokens
            await biometricService.storeCredentialsForBiometric(
              email,
              data.session.access_token,
              data.session.refresh_token
            );
            logger.debug("✅ Biometric credentials refreshed successfully");
          } catch (biometricError) {
            logger.error("Failed to refresh biometric credentials:", biometricError);
            // Don't fail the login if biometric refresh fails
          }
        }
      }
    } catch (error) {
      logger.error("Login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithBiometrics = async (credentials: { email: string; token: string; refreshToken?: string }) => {
    try {
      setIsLoading(true);
      logger.debug("🔐 Attempting biometric login with stored credentials", {
        hasToken: !!credentials.token,
        hasRefreshToken: !!credentials.refreshToken,
        tokenLength: credentials.token?.length,
        refreshTokenLength: credentials.refreshToken?.length,
        email: credentials.email
      });

      // First, try to use the refresh token to get a new session
      if (credentials.refreshToken) {
        logger.debug("🔐 Using refresh token to get new session");
        
        const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
          access_token: credentials.token,
          refresh_token: credentials.refreshToken,
        });

        logger.debug("🔐 setSession response:", {
          hasSession: !!refreshData.session,
          hasUser: !!refreshData.session?.user,
          hasAccessToken: !!refreshData.session?.access_token,
          hasRefreshToken: !!refreshData.session?.refresh_token,
          errorMessage: refreshError?.message,
          errorCode: refreshError?.name,
        });

        if (refreshData.session && !refreshError) {
          logger.debug("✅ Successfully refreshed session with biometric credentials");
          
          // Update stored credentials with new tokens
          const biometricService = BiometricAuthService.getInstance();
          await biometricService.storeCredentialsForBiometric(
            credentials.email,
            refreshData.session.access_token,
            refreshData.session.refresh_token
          );

          // Load user profile with new session
          await loadUserProfile(refreshData.session.user.id, refreshData.session.access_token);
          logger.debug("✅ Biometric login successful with refreshed token");
          return;
        } else {
          logger.debug("🔐 Refresh token failed, tokens have expired", {
            refreshError: refreshError?.message
          });
        }
      }

      // If we get here, the stored tokens are expired (normal after logout)
      // Instead of clearing credentials, inform user they need to sign in once to refresh
      logger.debug("🔐 Stored biometric tokens have expired after logout");
      throw new Error("Your session has expired. Please sign in with your password once to refresh your biometric login.");
      
    } catch (error) {
      logger.error("Biometric login error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const enableBiometricLogin = async (email: string, token: string) => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      
      // Check if biometric authentication is available
      const capabilities = await biometricService.checkBiometricCapabilities();
      if (!capabilities.isAvailable) {
        throw new Error("Biometric authentication is not available on this device");
      }

      // Get current session to access both access and refresh tokens
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      logger.debug("🔐 enableBiometricLogin - session data:", {
        hasSession: !!session,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
        accessTokenLength: session?.access_token?.length,
        refreshTokenLength: session?.refresh_token?.length,
        sessionError: sessionError?.message,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });
      
      if (sessionError || !session) {
        throw new Error("Could not access current session for biometric setup");
      }

      // Verify the session is still valid before storing
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error("Session is no longer valid. Please log in again.");
      }

      // Store both access and refresh tokens
      await biometricService.storeCredentialsForBiometric(
        email, 
        session.access_token, 
        session.refresh_token
      );
      await biometricService.setBiometricEnabled(true);
      
      // Verify the credentials were stored correctly
      const storedCredentials = await biometricService.getStoredCredentials();
      logger.debug("🔐 enableBiometricLogin - verification:", {
        credentialsStored: !!storedCredentials,
        storedEmail: storedCredentials?.email,
        storedTokenLength: storedCredentials?.token?.length,
        storedRefreshTokenLength: storedCredentials?.refreshToken?.length,
        tokensMatch: storedCredentials?.token === session.access_token,
        refreshTokensMatch: storedCredentials?.refreshToken === session.refresh_token,
      });
      
      logger.debug("✅ Biometric login enabled successfully with refresh token");
    } catch (error) {
      logger.error("Failed to enable biometric login:", error);
      throw error;
    }
  };

  const disableBiometricLogin = async () => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      await biometricService.clearStoredCredentials();
      logger.debug("✅ Biometric login disabled successfully");
    } catch (error) {
      logger.error("Failed to disable biometric login:", error);
      throw error;
    }
  };

  const signup = async (
    email: string,
    password: string,
    name: string,
    isCreator: boolean,
  ) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name,
          },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      // If signup is successful and user is confirmed
      if (data.user && data.session) {
        // Create user profile in our users table
        const { error: profileError } = await supabase.from("users").insert([
          {
            id: data.user.id,
            email: data.user.email,
            name: name,
            is_creator: isCreator,
            level: 1,
            xp: 0,
            total_xp: 0,
            streak_current: 0,
          },
        ]);

        if (profileError) {
          logger.error("Profile creation error:", profileError);
        }

        await loadUserProfile(data.user.id, data.session.access_token);
      } else {
        logger.debug("User created, but email confirmation may be required");
      }
    } catch (error) {
      logger.error("Signup error:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (navigation?: any) => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      
      // Clear all auth-related secure data including biometric credentials
      // since logout invalidates refresh tokens on the server
      await secureStorage.removeSecureItem(TOKEN_KEY);
      
      // Clear biometric credentials since tokens are now invalid
      const biometricService = BiometricAuthService.getInstance();
      await biometricService.clearStoredCredentials();
      
      // Clear non-sensitive data
      await secureStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      await secureStorage.removeItem(STORAGE_KEYS.LAST_CHECK_IN);

      // Note: Navigation will be handled automatically by the auth state change
      // in App.tsx, so we don't need to manually reset here
      logger.debug("✅ Logout successful, all credentials cleared");
    } catch (error) {
      logger.error("Logout error:", error);
      setUser(null);
      // Ensure all data is cleared even if logout fails
      await secureStorage.removeSecureItem(TOKEN_KEY).catch(() => {});
      await secureStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED).catch(() => {});
      await secureStorage.removeItem(STORAGE_KEYS.LAST_CHECK_IN).catch(() => {});
      
      // Also clear biometric credentials on error
      try {
        const biometricService = BiometricAuthService.getInstance();
        await biometricService.clearStoredCredentials();
      } catch (biometricError) {
        logger.error("Error clearing biometric credentials:", biometricError);
      }
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      // Only update if values actually changed
      const hasChanges = Object.keys(updates).some(key => {
        return user[key as keyof User] !== updates[key as keyof Partial<User>];
      });
      
      if (hasChanges) {
        setUser({ ...user, ...updates });
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isCreatingProfile,
        login,
        loginWithBiometrics,
        enableBiometricLogin,
        disableBiometricLogin,
        signup,
        logout,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
