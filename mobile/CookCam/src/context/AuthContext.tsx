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

      // Optionally reset navigation to Auth/Login screen
      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        });
      }
    } catch (error) {
      logger.error("Logout error:", error);
      setUser(null);
      // Ensure data is cleared even if logout fails
      await secureStorage.clearAllSecureData();
      await secureStorage.removeItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
      await secureStorage.removeItem(STORAGE_KEYS.LAST_CHECK_IN);

      if (navigation) {
        navigation.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        });
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
