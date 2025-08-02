import { secureStorage, SECURE_KEYS, STORAGE_KEYS } from '../secureStorage';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '../../utils/logger';

// Mock dependencies
jest.mock('expo-secure-store');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../utils/logger');

const mockedSecureStore = SecureStore as jest.Mocked<typeof SecureStore>;
const mockedAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('SecureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the keychain availability cache
    (secureStorage as any).keychainAvailable = null;
  });

  describe('Secure Storage Methods', () => {
    describe('setSecureItem', () => {
      it('should store item in SecureStore', async () => {
        mockedSecureStore.setItemAsync.mockResolvedValue();

        await secureStorage.setSecureItem('test-key', 'test-value');

        expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith('test-key', 'test-value');
      });

      it('should throw error if SecureStore fails', async () => {
        mockedSecureStore.setItemAsync.mockRejectedValue(new Error('Store failed'));

        await expect(
          secureStorage.setSecureItem('test-key', 'test-value')
        ).rejects.toThrow('Failed to set secure item');

        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('getSecureItem', () => {
      it('should retrieve item from SecureStore', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('test-value');

        const result = await secureStorage.getSecureItem('test-key');

        expect(result).toBe('test-value');
        expect(mockedSecureStore.getItemAsync).toHaveBeenCalledWith('test-key');
      });

      it('should return null if item not found', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue(null);

        const result = await secureStorage.getSecureItem('non-existent');

        expect(result).toBeNull();
      });

      it('should return null and log error on failure', async () => {
        mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Get failed'));

        const result = await secureStorage.getSecureItem('test-key');

        expect(result).toBeNull();
        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('removeSecureItem', () => {
      it('should remove item from SecureStore', async () => {
        mockedSecureStore.deleteItemAsync.mockResolvedValue();

        await secureStorage.removeSecureItem('test-key');

        expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith('test-key');
      });

      it('should log error on removal failure', async () => {
        mockedSecureStore.deleteItemAsync.mockRejectedValue(new Error('Delete failed'));

        await secureStorage.removeSecureItem('test-key');

        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('clearAllSecureData', () => {
      it('should clear all secure keys', async () => {
        mockedSecureStore.deleteItemAsync.mockResolvedValue();

        await secureStorage.clearAllSecureData();

        expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_KEYS.ACCESS_TOKEN);
        expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_KEYS.REFRESH_TOKEN);
        expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_KEYS.USER_ID);
        expect(mockedLogger.debug).toHaveBeenCalledWith('All secure data cleared.');
      });

      it('should log error if clearing fails', async () => {
        mockedSecureStore.deleteItemAsync.mockRejectedValue(new Error('Clear failed'));

        await secureStorage.clearAllSecureData();

        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Token Management', () => {
    describe('setAuthTokens', () => {
      it('should store access token only', async () => {
        mockedSecureStore.setItemAsync.mockResolvedValue();

        await secureStorage.setAuthTokens('access-token');

        expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
          SECURE_KEYS.ACCESS_TOKEN,
          'access-token'
        );
        expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(1);
      });

      it('should store both access and refresh tokens', async () => {
        mockedSecureStore.setItemAsync.mockResolvedValue();

        await secureStorage.setAuthTokens('access-token', 'refresh-token');

        expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
          SECURE_KEYS.ACCESS_TOKEN,
          'access-token'
        );
        expect(mockedSecureStore.setItemAsync).toHaveBeenCalledWith(
          SECURE_KEYS.REFRESH_TOKEN,
          'refresh-token'
        );
        expect(mockedSecureStore.setItemAsync).toHaveBeenCalledTimes(2);
      });
    });

    describe('getAccessToken', () => {
      it('should retrieve access token', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('access-token');

        const token = await secureStorage.getAccessToken();

        expect(token).toBe('access-token');
        expect(mockedSecureStore.getItemAsync).toHaveBeenCalledWith(SECURE_KEYS.ACCESS_TOKEN);
      });
    });

    describe('getRefreshToken', () => {
      it('should retrieve refresh token', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('refresh-token');

        const token = await secureStorage.getRefreshToken();

        expect(token).toBe('refresh-token');
        expect(mockedSecureStore.getItemAsync).toHaveBeenCalledWith(SECURE_KEYS.REFRESH_TOKEN);
      });
    });

    describe('clearAuthTokens', () => {
      it('should clear both auth tokens', async () => {
        mockedSecureStore.deleteItemAsync.mockResolvedValue();

        await secureStorage.clearAuthTokens();

        expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_KEYS.ACCESS_TOKEN);
        expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalledWith(SECURE_KEYS.REFRESH_TOKEN);
      });
    });
  });

  describe('Regular Storage Methods', () => {
    describe('setItem', () => {
      it('should store item in AsyncStorage', async () => {
        mockedAsyncStorage.setItem.mockResolvedValue();

        await secureStorage.setItem('test-key', 'test-value');

        expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('test-key', 'test-value');
      });

      it('should log error on storage failure', async () => {
        mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage failed'));

        await secureStorage.setItem('test-key', 'test-value');

        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('setJsonItem', () => {
      it('should store JSON data as string', async () => {
        mockedAsyncStorage.setItem.mockResolvedValue();
        const data = { name: 'Test', value: 123 };

        await secureStorage.setJsonItem('json-key', data);

        expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith(
          'json-key',
          JSON.stringify(data)
        );
      });

      it('should log error on JSON storage failure', async () => {
        mockedAsyncStorage.setItem.mockRejectedValue(new Error('Storage failed'));
        
        await secureStorage.setJsonItem('json-key', { test: 'data' });
        
        expect(mockedLogger.error).toHaveBeenCalledWith(
          'Error storing JSON item json-key:',
          expect.any(Error)
        );
      });
    });

    describe('getItem', () => {
      it('should retrieve item from AsyncStorage', async () => {
        mockedAsyncStorage.getItem.mockResolvedValue('test-value');

        const result = await secureStorage.getItem('test-key');

        expect(result).toBe('test-value');
        expect(mockedAsyncStorage.getItem).toHaveBeenCalledWith('test-key');
      });

      it('should return null if item not found', async () => {
        mockedAsyncStorage.getItem.mockResolvedValue(null);

        const result = await secureStorage.getItem('non-existent');

        expect(result).toBeNull();
      });

      it('should return null and log error on failure', async () => {
        mockedAsyncStorage.getItem.mockRejectedValue(new Error('Get failed'));

        const result = await secureStorage.getItem('test-key');

        expect(result).toBeNull();
        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('getJsonItem', () => {
      it('should retrieve and parse JSON data', async () => {
        const data = { name: 'Test', value: 123 };
        mockedAsyncStorage.getItem.mockResolvedValue(JSON.stringify(data));

        const result = await secureStorage.getJsonItem('json-key');

        expect(result).toEqual(data);
      });

      it('should return null if item not found', async () => {
        mockedAsyncStorage.getItem.mockResolvedValue(null);

        const result = await secureStorage.getJsonItem('non-existent');

        expect(result).toBeNull();
      });

      it('should return null on JSON parse error', async () => {
        mockedAsyncStorage.getItem.mockResolvedValue('invalid-json');

        const result = await secureStorage.getJsonItem('json-key');

        expect(result).toBeNull();
        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('removeItem', () => {
      it('should remove item from AsyncStorage', async () => {
        mockedAsyncStorage.removeItem.mockResolvedValue();

        await secureStorage.removeItem('test-key');

        expect(mockedAsyncStorage.removeItem).toHaveBeenCalledWith('test-key');
      });

      it('should log error on removal failure', async () => {
        mockedAsyncStorage.removeItem.mockRejectedValue(new Error('Remove failed'));

        await secureStorage.removeItem('test-key');

        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('removeItems', () => {
      it('should remove multiple items', async () => {
        const keys = ['key1', 'key2', 'key3'];

        await secureStorage.removeItems(keys);

        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(keys);
      });

      it('should log error on multi-remove failure', async () => {
        (AsyncStorage.multiRemove as jest.Mock).mockRejectedValue(new Error('Multi-remove failed'));

        await secureStorage.removeItems(['key1', 'key2']);

        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('clearAllData', () => {
      it('should clear all storage keys', async () => {
        await secureStorage.clearAllData();

        expect(AsyncStorage.multiRemove).toHaveBeenCalledWith(
          Object.values(STORAGE_KEYS)
        );
      });

      it('should log error on clear failure', async () => {
        (AsyncStorage.multiRemove as jest.Mock).mockRejectedValue(new Error('Clear failed'));

        await secureStorage.clearAllData();

        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });

    describe('clearAllAppData', () => {
      it('should clear both secure and regular data', async () => {
        mockedSecureStore.deleteItemAsync.mockResolvedValue();

        await secureStorage.clearAllAppData();

        // Should clear secure data
        expect(mockedSecureStore.deleteItemAsync).toHaveBeenCalled();
        // Should clear regular data
        expect(AsyncStorage.multiRemove).toHaveBeenCalled();
      });
    });
  });

  describe('Utility Methods', () => {
    describe('isKeychainAvailable', () => {
      it('should return true if keychain is available', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue(null);

        const available = await secureStorage.isKeychainAvailable();

        expect(available).toBe(true);
      });

      it('should return false if keychain is not available', async () => {
        mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Not available'));

        const available = await secureStorage.isKeychainAvailable();

        expect(available).toBe(false);
        expect(mockedLogger.warn).toHaveBeenCalled();
      });
    });

    describe('getBiometryType', () => {
      it('should get biometry type', async () => {
        mockedSecureStore.getItemAsync.mockResolvedValue('FaceID');

        const type = await secureStorage.getBiometryType();

        expect(type).toBe('FaceID');
      });

      it('should return null on error', async () => {
        mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Error'));

        const type = await secureStorage.getBiometryType();

        expect(type).toBeNull();
        expect(mockedLogger.error).toHaveBeenCalled();
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined values', async () => {
      mockedAsyncStorage.setItem.mockResolvedValue();

      await secureStorage.setJsonItem('key', undefined);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('key', 'undefined');
    });

    it('should handle null values', async () => {
      mockedAsyncStorage.setItem.mockResolvedValue();

      await secureStorage.setJsonItem('key', null);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('key', 'null');
    });

    it('should handle empty strings', async () => {
      mockedAsyncStorage.setItem.mockResolvedValue();

      await secureStorage.setItem('key', '');

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledWith('key', '');
    });

    it('should log error on circular references in JSON', async () => {
      const obj: any = { name: 'test' };
      obj.circular = obj;

      await secureStorage.setJsonItem('key', obj);
      
      expect(mockedLogger.error).toHaveBeenCalledWith(
        'Error storing JSON item key:',
        expect.any(TypeError)
      );
    });
  });

  describe('Batch Operations', () => {
    it('should handle multiple concurrent reads', async () => {
      mockedAsyncStorage.getItem.mockResolvedValue('value');

      const results = await Promise.all([
        secureStorage.getItem('key1'),
        secureStorage.getItem('key2'),
        secureStorage.getItem('key3')
      ]);

      expect(results).toEqual(['value', 'value', 'value']);
      expect(mockedAsyncStorage.getItem).toHaveBeenCalledTimes(3);
    });

    it('should handle multiple concurrent writes', async () => {
      mockedAsyncStorage.setItem.mockResolvedValue();

      await Promise.all([
        secureStorage.setItem('key1', 'value1'),
        secureStorage.setItem('key2', 'value2'),
        secureStorage.setItem('key3', 'value3')
      ]);

      expect(mockedAsyncStorage.setItem).toHaveBeenCalledTimes(3);
    });
  });

  describe('Keychain Availability Check', () => {
    it('should cache keychain availability result', async () => {
      mockedSecureStore.getItemAsync.mockResolvedValue(null);

      // First call
      await (secureStorage as any).checkKeychainAvailability();
      // Second call should use cached result
      await (secureStorage as any).checkKeychainAvailability();

      // Should only be called once due to caching
      expect(mockedSecureStore.getItemAsync).toHaveBeenCalledTimes(1);
    });

    it('should detect keychain unavailability', async () => {
      mockedSecureStore.getItemAsync.mockRejectedValue(new Error('Keychain error'));

      const available = await (secureStorage as any).checkKeychainAvailability();

      expect(available).toBe(false);
      expect(mockedLogger.warn).toHaveBeenCalled();
    });
  });
});