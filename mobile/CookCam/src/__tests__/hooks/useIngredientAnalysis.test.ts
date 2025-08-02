// Mock environment config before any imports
jest.mock('../../config/env', () => ({
  __esModule: true,
  default: () => ({
    SUPABASE_URL: "https://test.supabase.co",
    SUPABASE_ANON_KEY: "test-anon-key",
    API_BASE_URL: "https://test-api.cookcam.com",
  }),
}));

import { renderHook, act } from '@testing-library/react-hooks';
import { useIngredientAnalysis } from '../../hooks/useIngredientAnalysis';

// Mock dependencies
jest.mock('../../services/cookCamApi', () => ({
  cookCamApi: {
    searchIngredients: jest.fn(),
    detectIngredients: jest.fn(),
  },
}));

jest.mock('../../context/GamificationContext', () => ({
  useGamification: jest.fn(() => ({
    addXP: jest.fn(),
  })),
  XP_VALUES: {
    INGREDIENT_SCANNED: 10,
  },
}));

jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

jest.mock('../../data/ingredientReviewData', () => ({
  getEmojiForIngredient: jest.fn((name) => '🥬'),
  getMockIngredients: jest.fn(() => [
    { id: '1', name: 'Tomato', confidence: 0.95, emoji: '🍅' },
    { id: '2', name: 'Onion', confidence: 0.85, emoji: '🧅' },
  ]),
  getFallbackIngredients: jest.fn(() => [
    { id: 'fb1', name: 'Fallback 1', confidence: 0.5, emoji: '🥬' },
  ]),
  getSimulatedIngredients: jest.fn(() => ['Carrot', 'Potato', 'Garlic']),
}));

// Mock FileReader
global.FileReader = jest.fn().mockImplementation(() => ({
  readAsDataURL: jest.fn(),
  onload: null,
  onerror: null,
  result: 'data:image/jpeg;base64,test-base64-string',
}));

// Mock fetch
global.fetch = jest.fn();

describe('useIngredientAnalysis', () => {
  const mockUser = { id: 'user-123', name: 'Test User' };
  const mockAddXP = jest.fn();
  const mockSearchIngredients = require('../../services/cookCamApi').cookCamApi.searchIngredients;
  const mockDetectIngredients = require('../../services/cookCamApi').cookCamApi.detectIngredients;

  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      blob: jest.fn().mockResolvedValue(new Blob(['test'])),
    });
    require('../../context/GamificationContext').useGamification.mockReturnValue({
      addXP: mockAddXP,
    });
  });

  describe('Initial State', () => {
    it('should initialize with mock ingredients for simulator', () => {
      const { result } = renderHook(() =>
        useIngredientAnalysis('test-image.jpg', true, mockUser)
      );

      expect(result.current.ingredients).toHaveLength(2);
      expect(result.current.ingredients[0].name).toBe('Tomato');
      expect(result.current.loading).toBe(false);
      expect(result.current.hasAnalyzedImage).toBe(false);
    });

    it('should initialize with empty ingredients for real device', () => {
      const { result } = renderHook(() =>
        useIngredientAnalysis('test-image.jpg', false, mockUser)
      );

      expect(result.current.ingredients).toHaveLength(0);
      expect(result.current.loading).toBe(false);
      expect(result.current.hasAnalyzedImage).toBe(false);
    });

    it('should handle no image URI', () => {
      const { result } = renderHook(() =>
        useIngredientAnalysis('', false, mockUser)
      );

      expect(result.current.ingredients).toHaveLength(0);
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Image Analysis', () => {
    it('should analyze image and detect ingredients', async () => {
      mockDetectIngredients.mockResolvedValueOnce({
        success: true,
        data: [
          { id: 'api-1', name: 'Detected Tomato', confidence: 0.9 },
          { id: 'api-2', name: 'Detected Onion', confidence: 0.8 },
        ],
      });

      const { result } = renderHook(() =>
        useIngredientAnalysis('test-image.jpg', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(result.current.ingredients).toHaveLength(2);
      expect(result.current.ingredients[0].name).toBe('Detected Tomato');
      expect(result.current.hasAnalyzedImage).toBe(true);
      expect(mockAddXP).toHaveBeenCalled();
    });

    it('should use fallback ingredients when no image URI', async () => {
      mockSearchIngredients.mockImplementation((name) =>
        Promise.resolve({
          success: true,
          data: [{ id: `search-${name}`, name, confidence: 0.7 }],
        })
      );

      const { result } = renderHook(() =>
        useIngredientAnalysis('', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(mockSearchIngredients).toHaveBeenCalled();
      expect(result.current.ingredients.length).toBeGreaterThan(0);
    });

    it('should handle API error gracefully', async () => {
      mockDetectIngredients.mockRejectedValueOnce(new Error('API Error'));

      const { result } = renderHook(() =>
        useIngredientAnalysis('test-image.jpg', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(result.current.ingredients).toHaveLength(0);
      expect(result.current.loading).toBe(false);
    });

    it('should set loading state during analysis', async () => {
      let resolvePromise: any;
      const promise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      
      mockDetectIngredients.mockReturnValueOnce(promise);

      const { result } = renderHook(() =>
        useIngredientAnalysis('test-image.jpg', false, mockUser)
      );

      const analysisPromise = act(async () => {
        const promise = result.current.analyzeImageIngredients();
        expect(result.current.loading).toBe(true);
        return promise;
      });

      resolvePromise({
        success: true,
        data: [],
      });

      await analysisPromise;
      expect(result.current.loading).toBe(false);
    });
  });

  describe('Image URI Changes', () => {
    it('should reset hasAnalyzedImage when image URI changes', () => {
      const { result, rerender } = renderHook(
        ({ imageUri }) =>
          useIngredientAnalysis(imageUri, false, mockUser),
        { initialProps: { imageUri: 'image1.jpg' } }
      );

      act(() => {
        result.current.setIngredients([
          { id: '1', name: 'Test', confidence: 0.9, emoji: '🍅' },
        ]);
      });

      rerender({ imageUri: 'image2.jpg' });

      expect(result.current.hasAnalyzedImage).toBe(false);
    });

    it('should not reset if same image URI', () => {
      const { result, rerender } = renderHook(
        ({ imageUri }) =>
          useIngredientAnalysis(imageUri, false, mockUser),
        { initialProps: { imageUri: 'same-image.jpg' } }
      );

      rerender({ imageUri: 'same-image.jpg' });

      expect(result.current.hasAnalyzedImage).toBe(false);
    });
  });

  describe('Manual Ingredient Updates', () => {
    it('should allow manual ingredient updates via setIngredients', () => {
      const { result } = renderHook(() =>
        useIngredientAnalysis('test.jpg', false, mockUser)
      );

      const newIngredients = [
        { id: 'manual-1', name: 'Manual Ingredient', confidence: 0.95, emoji: '🥕' },
      ];

      act(() => {
        result.current.setIngredients(newIngredients);
      });

      expect(result.current.ingredients).toEqual(newIngredients);
    });

    it('should allow clearing ingredients', () => {
      const { result } = renderHook(() =>
        useIngredientAnalysis('test.jpg', true, mockUser)
      );

      expect(result.current.ingredients.length).toBeGreaterThan(0);

      act(() => {
        result.current.setIngredients([]);
      });

      expect(result.current.ingredients).toHaveLength(0);
    });
  });

  describe('XP Integration', () => {
    it('should add XP after successful ingredient detection', async () => {
      mockDetectIngredients.mockResolvedValueOnce({
        success: true,
        data: [{ id: '1', name: 'Ingredient', confidence: 0.9 }],
      });

      const { result } = renderHook(() =>
        useIngredientAnalysis('test.jpg', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(mockAddXP).toHaveBeenCalledWith(
        expect.any(Number),
        expect.stringContaining('ingredient')
      );
    });

    it('should not add XP on analysis failure', async () => {
      mockDetectIngredients.mockRejectedValueOnce(new Error('Failed'));

      const { result } = renderHook(() =>
        useIngredientAnalysis('test.jpg', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(mockAddXP).not.toHaveBeenCalled();
    });
  });

  describe('Base64 Conversion', () => {
    it('should convert image to base64 before API call', async () => {
      const mockBlob = new Blob(['test-image-data']);
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        blob: jest.fn().mockResolvedValue(mockBlob),
      });

      const mockFileReader = {
        readAsDataURL: jest.fn(),
        onload: null as any,
        result: 'data:image/jpeg;base64,test-base64',
      };

      (global.FileReader as any).mockImplementation(() => mockFileReader);

      mockDetectIngredients.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() =>
        useIngredientAnalysis('file://test.jpg', false, mockUser)
      );

      const analysisPromise = result.current.analyzeImageIngredients();

      // Simulate FileReader onload
      act(() => {
        if (mockFileReader.onload) {
          mockFileReader.onload();
        }
      });

      await act(async () => {
        await analysisPromise;
      });

      expect(global.fetch).toHaveBeenCalledWith('file://test.jpg');
      expect(mockDetectIngredients).toHaveBeenCalledWith(
        expect.stringContaining('base64')
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const { result } = renderHook(() =>
        useIngredientAnalysis('test.jpg', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(result.current.loading).toBe(false);
    });

    it('should handle invalid API response', async () => {
      mockDetectIngredients.mockResolvedValueOnce({
        success: false,
        error: 'Invalid request',
      });

      const { result } = renderHook(() =>
        useIngredientAnalysis('test.jpg', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(result.current.ingredients).toHaveLength(0);
      expect(result.current.hasAnalyzedImage).toBe(false);
    });

    it('should handle empty API response', async () => {
      mockDetectIngredients.mockResolvedValueOnce({
        success: true,
        data: [],
      });

      const { result } = renderHook(() =>
        useIngredientAnalysis('test.jpg', false, mockUser)
      );

      await act(async () => {
        await result.current.analyzeImageIngredients();
      });

      expect(result.current.ingredients).toHaveLength(0);
      expect(result.current.hasAnalyzedImage).toBe(true);
    });
  });
});