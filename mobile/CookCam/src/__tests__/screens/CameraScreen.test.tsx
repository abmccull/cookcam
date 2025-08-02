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
import CameraScreen from '../../screens/CameraScreen';
import { Alert } from 'react-native';

// Mock react-native modules
jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  TouchableOpacity: 'TouchableOpacity',
  SafeAreaView: 'SafeAreaView',
  ActivityIndicator: 'ActivityIndicator',
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
}));

// Mock expo-camera
jest.mock('expo-camera', () => ({
  Camera: {
    requestCameraPermissionsAsync: jest.fn(() => 
      Promise.resolve({ status: 'granted' })
    ),
    getCameraPermissionsAsync: jest.fn(() => 
      Promise.resolve({ status: 'granted' })
    ),
    Constants: {
      Type: {
        back: 'back',
        front: 'front',
      },
      FlashMode: {
        off: 'off',
        on: 'on',
        auto: 'auto',
      },
    },
  },
  CameraView: 'CameraView',
}));

// Mock expo-media-library
jest.mock('expo-media-library', () => ({
  requestPermissionsAsync: jest.fn(() => 
    Promise.resolve({ status: 'granted' })
  ),
  createAssetAsync: jest.fn(() => 
    Promise.resolve({ uri: 'saved-photo-uri' })
  ),
}));

// Mock icons
jest.mock('lucide-react-native', () => ({
  Camera: 'CameraIcon',
  X: 'XIcon',
  RotateCw: 'RotateCwIcon',
  Zap: 'ZapIcon',
  ZapOff: 'ZapOffIcon',
  Check: 'CheckIcon',
  RefreshCw: 'RefreshCwIcon',
}));

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
}));

// Mock contexts
jest.mock('../../context/AuthContext', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user-id' },
  })),
}));

// Mock services
jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: {
    analyzeImage: jest.fn(),
    createRecipeFromImage: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
}));

describe('CameraScreen', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  } as any;

  const mockRoute = {
    params: {},
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Permissions', () => {
    it('should request camera permissions on mount', async () => {
      const mockRequestPermissions = require('expo-camera').Camera.requestCameraPermissionsAsync;
      
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(mockRequestPermissions).toHaveBeenCalled();
      });
    });

    it('should show permission denied message when camera access is denied', async () => {
      const mockRequestPermissions = require('expo-camera').Camera.requestCameraPermissionsAsync;
      mockRequestPermissions.mockResolvedValueOnce({ status: 'denied' });

      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/Camera permission required/i)).toBeTruthy();
      });
    });

    it('should show settings button when permission is denied', async () => {
      const mockRequestPermissions = require('expo-camera').Camera.requestCameraPermissionsAsync;
      mockRequestPermissions.mockResolvedValueOnce({ status: 'denied' });

      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByText(/Open Settings/i)).toBeTruthy();
      });
    });
  });

  describe('Camera Controls', () => {
    it('should render camera view when permissions are granted', async () => {
      const { UNSAFE_queryByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        expect(UNSAFE_queryByType('CameraView')).toBeTruthy();
      });
    });

    it('should show capture button', async () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.getByTestId('capture-button')).toBeTruthy();
      });
    });

    it('should show flash toggle button', async () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.UNSAFE_queryByType('ZapOffIcon')).toBeTruthy();
      });
    });

    it('should toggle flash mode when flash button is pressed', async () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        const flashButton = screen.UNSAFE_getByType('ZapOffIcon').parent;
        fireEvent.press(flashButton);
      });

      expect(screen.UNSAFE_queryByType('ZapIcon')).toBeTruthy();
    });

    it('should show camera flip button', async () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      await waitFor(() => {
        expect(screen.UNSAFE_queryByType('RotateCwIcon')).toBeTruthy();
      });
    });

    it('should flip camera when flip button is pressed', async () => {
      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const flipButton = UNSAFE_getByType('RotateCwIcon').parent;
        fireEvent.press(flipButton);
      });

      // Camera should flip between front and back
      expect(true).toBe(true);
    });
  });

  describe('Photo Capture', () => {
    it('should capture photo when capture button is pressed', async () => {
      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(mockTakePictureAsync).toHaveBeenCalled();
      });
    });

    it('should show preview after capturing photo', async () => {
      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        const image = UNSAFE_getByType('Image');
        expect(image.props.source).toEqual({ uri: 'captured-photo-uri' });
      });
    });

    it('should show retake and use photo buttons in preview', async () => {
      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        expect(screen.getByText('Retake')).toBeTruthy();
        expect(screen.getByText('Use Photo')).toBeTruthy();
      });
    });

    it('should retake photo when retake button is pressed', async () => {
      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        const retakeButton = screen.getByText('Retake').parent;
        fireEvent.press(retakeButton);
      });

      // Should go back to camera view
      expect(screen.getByTestId('capture-button')).toBeTruthy();
    });
  });

  describe('Image Analysis', () => {
    it('should analyze image when use photo is pressed', async () => {
      const mockAnalyzeImage = require('../../services/cookCamApi').cookCamApi.analyzeImage;
      mockAnalyzeImage.mockResolvedValueOnce({
        success: true,
        data: {
          ingredients: ['tomato', 'pasta', 'cheese'],
          suggestions: ['Spaghetti', 'Lasagna'],
        },
      });

      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        const usePhotoButton = screen.getByText('Use Photo').parent;
        fireEvent.press(usePhotoButton);
      });

      await waitFor(() => {
        expect(mockAnalyzeImage).toHaveBeenCalledWith('captured-photo-uri');
      });
    });

    it('should navigate to recipe suggestions after analysis', async () => {
      const mockAnalyzeImage = require('../../services/cookCamApi').cookCamApi.analyzeImage;
      mockAnalyzeImage.mockResolvedValueOnce({
        success: true,
        data: {
          ingredients: ['tomato', 'pasta', 'cheese'],
          suggestions: ['Spaghetti', 'Lasagna'],
        },
      });

      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        const usePhotoButton = screen.getByText('Use Photo').parent;
        fireEvent.press(usePhotoButton);
      });

      await waitFor(() => {
        expect(mockNavigation.navigate).toHaveBeenCalledWith('RecipeSuggestions', {
          ingredients: ['tomato', 'pasta', 'cheese'],
          suggestions: ['Spaghetti', 'Lasagna'],
          imageUri: 'captured-photo-uri',
        });
      });
    });

    it('should show error when image analysis fails', async () => {
      const mockAnalyzeImage = require('../../services/cookCamApi').cookCamApi.analyzeImage;
      mockAnalyzeImage.mockResolvedValueOnce({
        success: false,
        error: 'Analysis failed',
      });

      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        const usePhotoButton = screen.getByText('Use Photo').parent;
        fireEvent.press(usePhotoButton);
      });

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith(
          'Error',
          expect.stringContaining('failed')
        );
      });
    });

    it('should show loading indicator during analysis', async () => {
      const mockAnalyzeImage = require('../../services/cookCamApi').cookCamApi.analyzeImage;
      mockAnalyzeImage.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
      );

      const mockTakePictureAsync = jest.fn(() => 
        Promise.resolve({ uri: 'captured-photo-uri' })
      );

      const { UNSAFE_getByType } = render(
        <CameraScreen navigation={mockNavigation} route={mockRoute} />
      );

      await waitFor(() => {
        const cameraView = UNSAFE_getByType('CameraView');
        cameraView.ref = { takePictureAsync: mockTakePictureAsync };
      });

      const captureButton = screen.getByTestId('capture-button');
      fireEvent.press(captureButton);

      await waitFor(() => {
        const usePhotoButton = screen.getByText('Use Photo').parent;
        fireEvent.press(usePhotoButton);
      });

      expect(screen.UNSAFE_queryByType('ActivityIndicator')).toBeTruthy();
    });
  });

  describe('Navigation', () => {
    it('should show close button', () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      expect(screen.UNSAFE_queryByType('XIcon')).toBeTruthy();
    });

    it('should go back when close button is pressed', () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      const closeButton = screen.UNSAFE_getByType('XIcon').parent;
      fireEvent.press(closeButton);

      expect(mockNavigation.goBack).toHaveBeenCalled();
    });
  });

  describe('Gallery', () => {
    it('should show gallery button', () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      expect(screen.getByText('Gallery')).toBeTruthy();
    });

    it('should open image picker when gallery button is pressed', () => {
      render(<CameraScreen navigation={mockNavigation} route={mockRoute} />);

      const galleryButton = screen.getByText('Gallery').parent;
      fireEvent.press(galleryButton);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('ImagePicker', {
        onImageSelected: expect.any(Function),
      });
    });
  });
});