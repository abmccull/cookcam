import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../services/supabaseClient';

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

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.id);
        
        try {
          if (session?.user) {
            await loadUserProfile(session.user.id, session.access_token);
          } else {
            setUser(null);
            await AsyncStorage.removeItem(TOKEN_KEY).catch(console.error);
          }
        } catch (error) {
          console.error('Error handling auth state change:', error);
        } finally {
          setIsLoading(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Session check error:', error);
        setIsLoading(false);
        return;
      }

      if (session?.user) {
        await loadUserProfile(session.user.id, session.access_token);
      }
    } catch (error) {
      console.error('Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadUserProfile = async (userId: string, accessToken: string) => {
    try {
      // Store the Supabase session token
      await AsyncStorage.setItem(TOKEN_KEY, accessToken);

      // Get user profile from our users table
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);
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
          badges: userData.badges || [],
          avatarUrl: userData.avatar_url,
          creatorCode: userData.creator_code,
          favoriteCount: userData.favorite_count,
          subscriberCount: userData.subscriber_count,
        };
        setUser(formattedUser);
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
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
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const signup = async (email: string, password: string, name: string, isCreator: boolean) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name
          }
        }
      });
      
      if (error) {
        throw new Error(error.message);
      }

      // If signup is successful and user is confirmed
      if (data.user && data.session) {
        // Create user profile in our users table
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: data.user.email,
            name: name,
            is_creator: isCreator,
            level: 1,
            xp: 0,
            total_xp: 0,
            streak_current: 0,
          }]);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        await loadUserProfile(data.user.id, data.session.access_token);
      } else {
        console.log('User created, but email confirmation may be required');
      }
      
    } catch (error) {
      console.error('Signup error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
    } catch (error) {
      console.error('Logout error:', error);
      // Even if server logout fails, clear local state
      setUser(null);
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        signup,
        logout,
        updateUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
