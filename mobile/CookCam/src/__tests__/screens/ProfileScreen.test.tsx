// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react-native';
import ProfileScreen from '../../screens/ProfileScreen';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  ScrollView: 'ScrollView',
  ActivityIndicator: 'ActivityIndicator',
  TextInput: 'TextInput',
  Image: 'Image',
  Alert: {
    alert: jest.fn(),
  },
  Platform: {
    OS: 'ios',
    select: jest.fn((config) => config.ios || config.default),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 390, height: 844 })),
  },
  StyleSheet: {
    create: (styles: any) => styles,
    flatten: (style: any) => style,
  },
  Animated: {
    Value: jest.fn().mockImplementation((initialValue) => ({
      setValue: jest.fn(),
      _value: initialValue,
    })),
    timing: jest.fn(() => ({
      start: jest.fn((callback) => callback && callback()),
    })),
    View: 'AnimatedView',
    createAnimatedComponent: jest.fn((component) => component),
  },
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  User: 'UserIcon',
  Settings: 'SettingsIcon',
  Edit: 'EditIcon',
  Camera: 'CameraIcon',
  Trophy: 'TrophyIcon',
  ChefHat: 'ChefHatIcon',
  Star: 'StarIcon',
  LogOut: 'LogOutIcon',
  ChevronRight: 'ChevronRightIcon',
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

// Mock contexts
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      name: 'Test User',
      avatar_url: 'https://example.com/avatar.jpg',
    },
    logout: jest.fn(),
    updateUser: jest.fn(),
  })),
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    userStats: {
      level: 10,
      xp: 4500,
      nextLevelXp: 5000,
      streakDays: 15,
      totalRecipesCooked: 45,
      achievements: [
        { id: '1', name: 'First Recipe', unlocked: true },
        { id: '2', name: 'Week Streak', unlocked: true },
      ],
    },
    refreshUserStats: jest.fn(),
  })),
}));

// Mock services
jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: {
    updateUserProfile: jest.fn(),
    uploadAvatar: jest.fn(),
    getUserRecipes: jest.fn(),
    getUserStats: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe('ProfileScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render user information', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Test User')).toBeTruthy();
      expect(screen.getByText('test@example.com')).toBeTruthy();
    });

    it('should render user avatar', () => {
      const { UNSAFE_getByType } = render(<ProfileScreen navigation={mockNavigation} />);
      
      const image = UNSAFE_getByType('Image');
      expect(image.props.source).toEqual({ uri: 'https://example.com/avatar.jpg' });
    });

    it('should render user stats', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText(/Level 10/)).toBeTruthy();
      expect(screen.getByText(/4,500.*XP/)).toBeTruthy();
      expect(screen.getByText(/15.*day streak/i)).toBeTruthy();
      expect(screen.getByText(/45.*recipes/i)).toBeTruthy();
    });

    it('should render achievements section', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Achievements')).toBeTruthy();
      expect(screen.getByText('First Recipe')).toBeTruthy();
      expect(screen.getByText('Week Streak')).toBeTruthy();
    });

    it('should render menu options', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.getByText('Edit Profile')).toBeTruthy();
      expect(screen.getByText('Settings')).toBeTruthy();
      expect(screen.getByText('My Recipes')).toBeTruthy();
      expect(screen.getByText('Logout')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should navigate to settings when settings button is pressed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const settingsButton = screen.getByText('Settings').parent;
      fireEvent.press(settingsButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('Settings');
    });

    it('should navigate to edit profile when edit button is pressed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const editButton = screen.getByText('Edit Profile').parent;
      fireEvent.press(editButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');
    });

    it('should navigate to my recipes when recipes button is pressed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const recipesButton = screen.getByText('My Recipes').parent;
      fireEvent.press(recipesButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('MyRecipes');
    });
  });

  describe('Logout', () => {
    it('should show confirmation alert when logout is pressed', () => {
      const mockAlert = require('react-native').Alert.alert;
      render(<ProfileScreen navigation={mockNavigation} />);

      const logoutButton = screen.getByText('Logout').parent;
      fireEvent.press(logoutButton);

      expect(mockAlert).toHaveBeenCalledWith(
        'Logout',
        'Are you sure you want to logout?',
        expect.any(Array)
      );
    });

    it('should call logout when confirmed', async () => {
      const mockLogout = jest.fn();
      const mockUseAuth = require('../../context/AuthContext').useAuth;
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', email: 'test@example.com' },
        logout: mockLogout,
        updateUser: jest.fn(),
      });

      const mockAlert = require('react-native').Alert.alert;
      mockAlert.mockImplementation((title, message, buttons) => {
        // Simulate pressing "Yes" button
        if (buttons && buttons[1] && buttons[1].onPress) {
          buttons[1].onPress();
        }
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      const logoutButton = screen.getByText('Logout').parent;
      fireEvent.press(logoutButton);

      await waitFor(() => {
        expect(mockLogout).toHaveBeenCalled();
      });
    });
  });

  describe('Profile Picture', () => {
    it('should allow changing profile picture', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      // Find camera/edit icon on avatar
      const avatarEditButton = screen.UNSAFE_getByType('CameraIcon').parent;
      fireEvent.press(avatarEditButton);

      // Should trigger image picker
      expect(mockNavigation.navigate).toHaveBeenCalledWith('ImagePicker', {
        onImageSelected: expect.any(Function),
      });
    });
  });

  describe('Stats Display', () => {
    it('should show XP progress bar', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      // Should show current and next level XP
      expect(screen.getByText(/4,500.*\/.*5,000/)).toBeTruthy();
    });

    it('should show correct level badge', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      // Should show level 10 with appropriate styling
      const levelBadge = screen.getByText('Level 10');
      expect(levelBadge).toBeTruthy();
    });

    it('should handle user without stats', () => {
      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        userStats: null,
        refreshUserStats: jest.fn(),
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      // Should show default values or placeholders
      expect(screen.getByText(/Level 1/)).toBeTruthy();
    });
  });

  describe('Edit Mode', () => {
    it('should enable edit mode when edit button is pressed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const editButton = screen.getByText('Edit Profile').parent;
      fireEvent.press(editButton);

      // Should show save and cancel buttons
      expect(screen.getByText('Save')).toBeTruthy();
      expect(screen.getByText('Cancel')).toBeTruthy();
    });

    it('should allow editing user name', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const editButton = screen.getByText('Edit Profile').parent;
      fireEvent.press(editButton);

      const nameInput = screen.getByDisplayValue('Test User');
      fireEvent.changeText(nameInput, 'Updated Name');

      expect(nameInput.props.value).toBe('Updated Name');
    });

    it('should save changes when save button is pressed', async () => {
      const mockUpdateUser = jest.fn();
      const mockUseAuth = require('../../context/AuthContext').useAuth;
      mockUseAuth.mockReturnValue({
        user: { id: 'test-user-id', name: 'Test User' },
        updateUser: mockUpdateUser,
        logout: jest.fn(),
      });

      const mockUpdateProfile = require('../../services/cookCamApi').cookCamApi.updateUserProfile;
      mockUpdateProfile.mockResolvedValueOnce({ success: true });

      render(<ProfileScreen navigation={mockNavigation} />);

      // Enter edit mode
      const editButton = screen.getByText('Edit Profile').parent;
      fireEvent.press(editButton);

      // Change name
      const nameInput = screen.getByDisplayValue('Test User');
      fireEvent.changeText(nameInput, 'Updated Name');

      // Save changes
      const saveButton = screen.getByText('Save').parent;
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockUpdateProfile).toHaveBeenCalledWith('test-user-id', {
          name: 'Updated Name',
        });
        expect(mockUpdateUser).toHaveBeenCalled();
      });
    });

    it('should cancel edit mode when cancel button is pressed', () => {
      render(<ProfileScreen navigation={mockNavigation} />);

      const editButton = screen.getByText('Edit Profile').parent;
      fireEvent.press(editButton);

      const cancelButton = screen.getByText('Cancel').parent;
      fireEvent.press(cancelButton);

      // Should exit edit mode
      expect(screen.queryByText('Save')).toBeFalsy();
      expect(screen.queryByText('Cancel')).toBeFalsy();
    });
  });

  describe('Loading States', () => {
    it('should show loading indicator while fetching data', () => {
      const mockUseGamification = require('../../context/GamificationContext').useGamification;
      mockUseGamification.mockReturnValue({
        userStats: null,
        refreshUserStats: jest.fn(),
        loading: true,
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      expect(screen.UNSAFE_queryByType('ActivityIndicator')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should show error message when profile update fails', async () => {
      const mockAlert = require('react-native').Alert.alert;
      const mockUpdateProfile = require('../../services/cookCamApi').cookCamApi.updateUserProfile;
      mockUpdateProfile.mockResolvedValueOnce({ 
        success: false, 
        error: 'Update failed' 
      });

      render(<ProfileScreen navigation={mockNavigation} />);

      // Enter edit mode and save
      const editButton = screen.getByText('Edit Profile').parent;
      fireEvent.press(editButton);

      const saveButton = screen.getByText('Save').parent;
      fireEvent.press(saveButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('failed')
        );
      });
    });
  });
});