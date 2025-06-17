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
      logger.debug("🔐 Attempting biometric login with stored credentials");

      // First try to validate the current access token
      const { data: userData, error: userError } = await supabase.auth.getUser(credentials.token);

      if (userError || !userData.user) {
        logger.debug("🔐 Access token invalid, trying refresh token...");
        
        // If we have a refresh token, try to refresh the session
        if (credentials.refreshToken) {
          const { data: refreshData, error: refreshError } = await supabase.auth.setSession({
            access_token: credentials.token,
            refresh_token: credentials.refreshToken,
          });

          if (refreshError || !refreshData.session) {
            logger.debug("🔐 Refresh token also invalid, clearing credentials");
            const biometricService = BiometricAuthService.getInstance();
            await biometricService.clearStoredCredentials();
            throw new Error("Stored credentials are no longer valid. Please log in again to re-enable biometric authentication.");
          }

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
          logger.debug("🔐 No refresh token available, clearing credentials");
          const biometricService = BiometricAuthService.getInstance();
          await biometricService.clearStoredCredentials();
          throw new Error("Stored credentials are no longer valid. Please log in again to re-enable biometric authentication.");
        }
      }

      // Access token is still valid, set the session
      const { error: sessionError } = await supabase.auth.setSession({
        access_token: credentials.token,
        refresh_token: credentials.refreshToken || credentials.token,
      });

      if (sessionError) {
        logger.debug("🔐 Session setting failed, clearing credentials");
        const biometricService = BiometricAuthService.getInstance();
        await biometricService.clearStoredCredentials();
        throw new Error("Could not restore session. Please log in again.");
      }

      // Load user profile
      await loadUserProfile(userData.user.id, credentials.token);
      logger.debug("✅ Biometric login successful with existing token");
      
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
      
      if (sessionError || !session) {
        throw new Error("Could not access current session for biometric setup");
      }

      // Store both access and refresh tokens
      await biometricService.storeCredentialsForBiometric(
        email, 
        session.access_token, 
        session.refresh_token
      );
      await biometricService.setBiometricEnabled(true);
      
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
      // Clear sensitive data securely and non-sensitive separately
      await secureStorage.clearAllSecureData();
      await secureStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      await secureStorage.removeItem(STORAGE_KEYS.LAST_CHECK_IN);

      // Note: Navigation will be handled automatically by the auth state change
      // in App.tsx, so we don't need to manually reset here
      logger.debug("✅ Logout successful, auth state will handle navigation");
    } catch (error) {
      logger.error("Logout error:", error);
      setUser(null);
      // Ensure data is cleared even if logout fails
      await secureStorage.clearAllSecureData();
      await secureStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      await secureStorage.removeItem(STORAGE_KEYS.LAST_CHECK_IN);
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
