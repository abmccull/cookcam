import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/api';

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
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string, isCreator: boolean) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = '@cookcam_token';
const USER_KEY = '@cookcam_user';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({children}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on mount
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // Check if we have a stored token
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        // Try to get user profile
        const response = await authService.getProfile();
        if (response.success && response.data?.user) {
          const userData = response.data.user;
          const formattedUser: User = {
            id: userData.id,
            email: userData.email,
            name: userData.name || userData.email,
            isCreator: userData.is_creator || false,
            creatorTier: userData.creator_tier || undefined,
            level: userData.level || 1,
            xp: userData.xp || 0,
            streak: userData.streak_current || 0,
            badges: userData.badges || [],
            avatarUrl: userData.avatar_url,
            creatorCode: userData.creator_code,
          };
          setUser(formattedUser);
        } else {
          // Invalid token, clear it
          await AsyncStorage.removeItem(TOKEN_KEY);
        }
      }
    } catch (error) {
      console.error('Session check failed:', error);
      // Clear invalid token
      await AsyncStorage.removeItem(TOKEN_KEY);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await authService.signIn(email, password);
      
      if (!response.success) {
        throw new Error(response.error || 'Login failed');
      }

      if (response.data?.user) {
        const userData = response.data.user;
        const formattedUser: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name || userData.email,
          isCreator: userData.is_creator || false,
          creatorTier: userData.creator_tier || undefined,
          level: userData.level || 1,
          xp: userData.xp || 0,
          streak: userData.streak_current || 0,
          badges: userData.badges || [],
          avatarUrl: userData.avatar_url,
          creatorCode: userData.creator_code,
        };
        setUser(formattedUser);
        
        // Store tokens if available
        if (response.data.session?.access_token) {
          await AsyncStorage.setItem(TOKEN_KEY, response.data.session.access_token);
        }
        if (response.data.session?.refresh_token) {
          await AsyncStorage.setItem('@cookcam_refresh_token', response.data.session.refresh_token);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const signup = async (email: string, password: string, name: string, isCreator: boolean) => {
    try {
      const response = await authService.signUp(email, password, name);
      
      if (!response.success) {
        throw new Error(response.error || 'Signup failed');
      }

      // If signup is successful and returns user data, sign them in immediately
      if (response.data?.user && response.data?.session) {
        const userData = response.data.user;
        const formattedUser: User = {
          id: userData.id,
          email: userData.email,
          name: userData.name || name || userData.email,
          isCreator: userData.is_creator || isCreator,
          creatorTier: userData.creator_tier || undefined,
          level: userData.level || 1,
          xp: userData.xp || 0,
          streak: userData.streak_current || 0,
          badges: userData.badges || [],
          avatarUrl: userData.avatar_url,
          creatorCode: userData.creator_code,
        };
        setUser(formattedUser);
        
        // Store the session token if available
        if (response.data.session?.access_token) {
          await AsyncStorage.setItem(TOKEN_KEY, response.data.session.access_token);
        }
      } else {
        // User created successfully but may need email confirmation
        console.log('User created successfully:', response.data?.message);
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.signOut();
      setUser(null);
      // Clear all stored tokens
      await AsyncStorage.multiRemove([TOKEN_KEY, '@cookcam_refresh_token']);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local state
      setUser(null);
      await AsyncStorage.multiRemove([TOKEN_KEY, '@cookcam_refresh_token']);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({...user, ...updates});
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
