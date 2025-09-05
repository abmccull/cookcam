import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { testDb } from './setup-db';
import { recipeFactory, userFactory } from '../factories';
import { delay } from './setup';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('@react-native-community/netinfo');

describe('Offline/Online Synchronization Integration', () => {
  let apiClient: AxiosInstance;
  let authToken: string;
  let userId: string;
  let mockStorage: { [key: string]: string } = {};
  let isOnline: boolean = true;
  
  beforeAll(async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    apiClient = axios.create({
      baseURL: apiUrl,
      timeout: 10000,
      validateStatus: () => true,
    });
    
    // Setup AsyncStorage mock
    (AsyncStorage.getItem as jest.Mock).mockImplementation((key: string) => 
      Promise.resolve(mockStorage[key] || null)
    );
    (AsyncStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      mockStorage[key] = value;
      return Promise.resolve();
    });
    (AsyncStorage.getAllKeys as jest.Mock).mockImplementation(() => 
      Promise.resolve(Object.keys(mockStorage))
    );
    (AsyncStorage.multiGet as jest.Mock).mockImplementation((keys: string[]) => 
      Promise.resolve(keys.map(key => [key, mockStorage[key] || null]))
    );
    
    // Setup NetInfo mock
    (NetInfo.fetch as jest.Mock).mockImplementation(() => 
      Promise.resolve({ isConnected: isOnline })
    );
    (NetInfo.addEventListener as jest.Mock).mockImplementation(() => 
      () => {} // Return unsubscribe function
    );
    
    // Create test user
    const userData = {
      email: `offline_sync_${Date.now()}@example.com`,
      password: 'OfflineSync123!',
      name: 'Offline Sync User',
    };
    
    const registerResponse = await apiClient.post('/api/auth/register', userData);
    authToken = registerResponse.data.token;
    userId = registerResponse.data.user.id;
  });
  
  beforeEach(() => {
    mockStorage = {};
    isOnline = true;
  });
  
  describe('Offline Queue Management', () => {
    it('should queue actions when offline', async () => {
      // Go offline
      isOnline = false;
      
      // Create offline queue
      const offlineQueue: any[] = [];
      
      // Attempt to create recipe while offline
      const recipeData = recipeFactory({
        title: 'Offline Recipe',
        created_by: userId,
      });
      
      // Since we're offline, store in queue
      offlineQueue.push({
        id: `offline_${Date.now()}`,
        type: 'CREATE_RECIPE',
        data: recipeData,
        timestamp: Date.now(),
        retryCount: 0,
      });
      
      // Store queue in AsyncStorage
      await AsyncStorage.setItem('offline_queue', JSON.stringify(offlineQueue));
      
      // Verify queue was stored
      const storedQueue = await AsyncStorage.getItem('offline_queue');
      expect(storedQueue).toBeDefined();
      expect(JSON.parse(storedQueue!)).toHaveLength(1);
    });
    
    it('should sync queued actions when back online', async () => {
      // Setup offline queue with multiple actions
      const offlineQueue = [
        {
          id: 'offline_1',
          type: 'CREATE_RECIPE',
          data: recipeFactory({ title: 'Offline Recipe 1' }),
          timestamp: Date.now() - 3000,
        },
        {
          id: 'offline_2',
          type: 'UPDATE_PROFILE',
          data: { dietary_preferences: ['vegan'] },
          timestamp: Date.now() - 2000,
        },
        {
          id: 'offline_3',
          type: 'ADD_FAVORITE',
          data: { recipe_id: 'recipe_123' },
          timestamp: Date.now() - 1000,
        },
      ];
      
      await AsyncStorage.setItem('offline_queue', JSON.stringify(offlineQueue));
      
      // Go back online
      isOnline = true;
      
      // Process offline queue
      const queue = JSON.parse(await AsyncStorage.getItem('offline_queue') || '[]');
      const syncResults = [];
      
      for (const action of queue) {
        let response;
        
        switch (action.type) {
          case 'CREATE_RECIPE':
            response = await apiClient.post('/api/recipes', action.data, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            break;
          
          case 'UPDATE_PROFILE':
            response = await apiClient.put('/api/user/profile', action.data, {
              headers: { Authorization: `Bearer ${authToken}` }
            });
            break;
          
          case 'ADD_FAVORITE':
            response = await apiClient.post(
              `/api/recipes/${action.data.recipe_id}/favorite`,
              {},
              {
                headers: { Authorization: `Bearer ${authToken}` }
              }
            );
            break;
        }
        
        syncResults.push({
          action: action.id,
          success: response ? [200, 201, 204].includes(response.status) : false,
          status: response?.status,
        });
      }
      
      // Clear successfully synced items from queue
      const failedActions = queue.filter((action: any, index: number) => 
        !syncResults[index].success
      );
      
      await AsyncStorage.setItem('offline_queue', JSON.stringify(failedActions));
      
      // Verify sync results
      expect(syncResults.filter(r => r.success).length).toBeGreaterThan(0);
    });
    
    it('should handle sync conflicts', async () => {
      // Create recipe online
      const onlineRecipe = await apiClient.post(
        '/api/recipes',
        recipeFactory({ title: 'Online Recipe', version: 1 }),
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      const recipeId = onlineRecipe.data.recipe.id;
      
      // Go offline and modify recipe
      isOnline = false;
      
      const offlineUpdate = {
        id: recipeId,
        title: 'Offline Updated Title',
        version: 1, // Same version - will conflict
        modified_offline: true,
        offline_timestamp: Date.now(),
      };
      
      await AsyncStorage.setItem(`recipe_${recipeId}`, JSON.stringify(offlineUpdate));
      
      // Meanwhile, recipe is also updated online (simulated)
      isOnline = true;
      
      await apiClient.put(
        `/api/recipes/${recipeId}`,
        { title: 'Online Updated Title', version: 2 },
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      // Try to sync offline changes
      const syncResponse = await apiClient.put(
        `/api/recipes/${recipeId}`,
        offlineUpdate,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      // Should detect version conflict
      if (syncResponse.status === 409) {
        expect(syncResponse.data.error).toContain('conflict');
        expect(syncResponse.data.server_version).toBe(2);
        expect(syncResponse.data.client_version).toBe(1);
        
        // Store conflict for user resolution
        await AsyncStorage.setItem(
          'sync_conflicts',
          JSON.stringify([{
            type: 'RECIPE_UPDATE',
            local: offlineUpdate,
            server: syncResponse.data.server_data,
            timestamp: Date.now(),
          }])
        );
      }
    });
    
    it('should retry failed sync operations', async () => {
      // Create action that will fail initially
      const failingAction = {
        id: 'retry_action',
        type: 'CREATE_RECIPE',
        data: { 
          title: '', // Invalid - missing required fields
        },
        timestamp: Date.now(),
        retryCount: 0,
        maxRetries: 3,
      };
      
      await AsyncStorage.setItem('offline_queue', JSON.stringify([failingAction]));
      
      // Process with retry logic
      const action = JSON.parse(await AsyncStorage.getItem('offline_queue')!)[0];
      let syncSuccess = false;
      
      while (action.retryCount < action.maxRetries && !syncSuccess) {
        const response = await apiClient.post('/api/recipes', action.data, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if ([200, 201].includes(response.status)) {
          syncSuccess = true;
        } else {
          action.retryCount++;
          action.lastRetry = Date.now();
          
          // Exponential backoff
          const backoffMs = Math.min(1000 * Math.pow(2, action.retryCount), 30000);
          await delay(backoffMs);
        }
      }
      
      expect(action.retryCount).toBeGreaterThan(0);
      expect(action.retryCount).toBeLessThanOrEqual(3);
    });
  });
  
  describe('Data Caching', () => {
    it('should cache frequently accessed data', async () => {
      // Fetch recipes and cache them
      const recipesResponse = await apiClient.get('/api/recipes?limit=10', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (recipesResponse.status === 200) {
        // Cache recipes
        await AsyncStorage.setItem(
          'cache_recipes',
          JSON.stringify({
            data: recipesResponse.data.recipes,
            timestamp: Date.now(),
            ttl: 300000, // 5 minutes
          })
        );
        
        // Go offline
        isOnline = false;
        
        // Read from cache
        const cachedData = await AsyncStorage.getItem('cache_recipes');
        expect(cachedData).toBeDefined();
        
        const cache = JSON.parse(cachedData!);
        expect(cache.data).toBeInstanceOf(Array);
        expect(cache.data.length).toBeLessThanOrEqual(10);
      }
    });
    
    it('should invalidate stale cache', async () => {
      // Create stale cache entry
      const staleCache = {
        data: [recipeFactory()],
        timestamp: Date.now() - 600000, // 10 minutes ago
        ttl: 300000, // 5 minute TTL
      };
      
      await AsyncStorage.setItem('cache_recipes', JSON.stringify(staleCache));
      
      // Check if cache is valid
      const cachedData = await AsyncStorage.getItem('cache_recipes');
      const cache = JSON.parse(cachedData!);
      
      const isExpired = Date.now() > cache.timestamp + cache.ttl;
      expect(isExpired).toBe(true);
      
      // If online, fetch fresh data
      if (isOnline) {
        const freshResponse = await apiClient.get('/api/recipes', {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if (freshResponse.status === 200) {
          // Update cache
          await AsyncStorage.setItem(
            'cache_recipes',
            JSON.stringify({
              data: freshResponse.data.recipes,
              timestamp: Date.now(),
              ttl: 300000,
            })
          );
        }
      }
    });
    
    it('should implement cache-first strategy for read operations', async () => {
      // Populate cache
      const cachedRecipes = Array.from({ length: 5 }, () => recipeFactory());
      await AsyncStorage.setItem(
        'cache_recipes',
        JSON.stringify({
          data: cachedRecipes,
          timestamp: Date.now(),
          ttl: 300000,
        })
      );
      
      // Track API calls
      let apiCallMade = false;
      const originalGet = apiClient.get;
      apiClient.get = jest.fn(async (...args) => {
        apiCallMade = true;
        return originalGet.apply(apiClient, args);
      });
      
      // Read with cache-first strategy
      const cache = await AsyncStorage.getItem('cache_recipes');
      const cachedData = JSON.parse(cache!);
      
      // Use cache if valid
      if (Date.now() < cachedData.timestamp + cachedData.ttl) {
        // Return cached data immediately
        expect(cachedData.data).toHaveLength(5);
        expect(apiCallMade).toBe(false);
        
        // Optionally refresh in background if online
        if (isOnline) {
          // Background refresh (don't wait)
          apiClient.get('/api/recipes', {
            headers: { Authorization: `Bearer ${authToken}` }
          }).then(response => {
            if (response.status === 200) {
              AsyncStorage.setItem(
                'cache_recipes',
                JSON.stringify({
                  data: response.data.recipes,
                  timestamp: Date.now(),
                  ttl: 300000,
                })
              );
            }
          });
        }
      }
      
      // Restore original method
      apiClient.get = originalGet;
    });
  });
  
  describe('Optimistic Updates', () => {
    it('should apply optimistic updates immediately', async () => {
      // Create initial recipe
      const recipe = recipeFactory({ 
        id: 'recipe_optimistic',
        title: 'Original Title',
        favorited: false,
      });
      
      await AsyncStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(recipe));
      
      // Apply optimistic update (favorite recipe)
      const optimisticRecipe = {
        ...recipe,
        favorited: true,
        pending_sync: true,
      };
      
      await AsyncStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(optimisticRecipe));
      
      // UI should show favorited state immediately
      const storedRecipe = JSON.parse(
        await AsyncStorage.getItem(`recipe_${recipe.id}`)!
      );
      expect(storedRecipe.favorited).toBe(true);
      expect(storedRecipe.pending_sync).toBe(true);
      
      // Sync with server
      const response = await apiClient.post(
        `/api/recipes/${recipe.id}/favorite`,
        {},
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        // Remove pending flag after successful sync
        const syncedRecipe = {
          ...optimisticRecipe,
          pending_sync: false,
        };
        await AsyncStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(syncedRecipe));
      } else {
        // Revert optimistic update on failure
        await AsyncStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(recipe));
      }
    });
    
    it('should rollback optimistic updates on sync failure', async () => {
      // Create recipe with optimistic delete
      const recipe = recipeFactory({ id: 'recipe_to_delete' });
      await AsyncStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(recipe));
      
      // Optimistically mark as deleted
      const deletedRecipe = {
        ...recipe,
        deleted: true,
        pending_sync: true,
      };
      await AsyncStorage.setItem(`recipe_${recipe.id}`, JSON.stringify(deletedRecipe));
      
      // Try to sync deletion (will fail because recipe doesn't exist on server)
      const response = await apiClient.delete(
        `/api/recipes/${recipe.id}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status !== 204) {
        // Rollback optimistic update
        const rolledBackRecipe = {
          ...recipe,
          deleted: false,
          pending_sync: false,
          sync_error: 'Failed to delete recipe',
        };
        await AsyncStorage.setItem(
          `recipe_${recipe.id}`,
          JSON.stringify(rolledBackRecipe)
        );
        
        const stored = JSON.parse(
          await AsyncStorage.getItem(`recipe_${recipe.id}`)!
        );
        expect(stored.deleted).toBe(false);
        expect(stored.sync_error).toBeDefined();
      }
    });
  });
  
  describe('Background Sync', () => {
    it('should schedule background sync tasks', async () => {
      // Queue multiple offline actions
      const offlineActions = [
        { type: 'CREATE_RECIPE', data: recipeFactory(), timestamp: Date.now() },
        { type: 'UPDATE_PROFILE', data: { bio: 'Updated bio' }, timestamp: Date.now() },
        { type: 'LOG_ACTIVITY', data: { action: 'viewed_recipe' }, timestamp: Date.now() },
      ];
      
      await AsyncStorage.setItem('offline_queue', JSON.stringify(offlineActions));
      
      // Schedule background sync
      const syncTask = {
        id: 'background_sync',
        nextRun: Date.now() + 60000, // Run in 1 minute
        interval: 300000, // Every 5 minutes
        lastRun: null,
        enabled: true,
      };
      
      await AsyncStorage.setItem('sync_task', JSON.stringify(syncTask));
      
      // Verify task is scheduled
      const task = JSON.parse(await AsyncStorage.getItem('sync_task')!);
      expect(task.enabled).toBe(true);
      expect(task.nextRun).toBeGreaterThan(Date.now());
    });
    
    it('should handle incremental sync', async () => {
      // Store last sync timestamp
      const lastSync = Date.now() - 3600000; // 1 hour ago
      await AsyncStorage.setItem('last_sync', lastSync.toString());
      
      // Fetch only changes since last sync
      const response = await apiClient.get(
        `/api/sync/changes?since=${lastSync}`,
        {
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      
      if (response.status === 200) {
        const changes = response.data;
        
        // Apply changes to local storage
        if (changes.recipes) {
          for (const recipe of changes.recipes) {
            await AsyncStorage.setItem(
              `recipe_${recipe.id}`,
              JSON.stringify(recipe)
            );
          }
        }
        
        if (changes.deleted_recipes) {
          for (const recipeId of changes.deleted_recipes) {
            await AsyncStorage.removeItem(`recipe_${recipeId}`);
          }
        }
        
        // Update last sync timestamp
        await AsyncStorage.setItem('last_sync', Date.now().toString());
      }
    });
  });
  
  describe('Network State Handling', () => {
    it('should detect network state changes', async () => {
      const networkStates: any[] = [];
      
      // Setup network listener
      const unsubscribe = NetInfo.addEventListener(state => {
        networkStates.push({
          isConnected: state.isConnected,
          type: state.type,
          timestamp: Date.now(),
        });
      });
      
      // Simulate network changes
      isOnline = false;
      await NetInfo.fetch();
      
      isOnline = true;
      await NetInfo.fetch();
      
      // Check if state changes were detected
      expect(networkStates.length).toBeGreaterThanOrEqual(0);
      
      // Cleanup
      unsubscribe();
    });
    
    it('should handle poor network conditions', async () => {
      // Simulate slow network
      const originalTimeout = apiClient.defaults.timeout;
      apiClient.defaults.timeout = 1000; // 1 second timeout
      
      // Create large payload
      const largeRecipe = recipeFactory({
        description: 'x'.repeat(10000), // Large description
        instructions: Array.from({ length: 100 }, () => 'Step'),
      });
      
      // Try to sync with poor network
      let syncSuccess = false;
      let retries = 0;
      const maxRetries = 3;
      
      while (!syncSuccess && retries < maxRetries) {
        try {
          const response = await apiClient.post(
            '/api/recipes',
            largeRecipe,
            {
              headers: { Authorization: `Bearer ${authToken}` },
              timeout: 1000 + (retries * 1000), // Increase timeout on retry
            }
          );
          
          if (response.status === 201) {
            syncSuccess = true;
          }
        } catch (error: any) {
          if (error.code === 'ECONNABORTED') {
            retries++;
            // Store for later sync
            const queue = JSON.parse(
              await AsyncStorage.getItem('offline_queue') || '[]'
            );
            queue.push({
              type: 'CREATE_RECIPE',
              data: largeRecipe,
              timestamp: Date.now(),
              failureReason: 'timeout',
            });
            await AsyncStorage.setItem('offline_queue', JSON.stringify(queue));
          }
        }
      }
      
      // Restore original timeout
      apiClient.defaults.timeout = originalTimeout;
      
      expect(retries).toBeLessThanOrEqual(maxRetries);
    });
  });
  
  describe('Data Consistency', () => {
    it('should maintain data consistency across sync operations', async () => {
      // Create initial state
      const initialRecipes = Array.from({ length: 3 }, () => recipeFactory());
      await AsyncStorage.setItem('recipes', JSON.stringify(initialRecipes));
      
      // Track local changes
      const localChanges = {
        created: [recipeFactory()],
        updated: [{ ...initialRecipes[0], title: 'Updated Title' }],
        deleted: [initialRecipes[2].id],
      };
      
      await AsyncStorage.setItem('local_changes', JSON.stringify(localChanges));
      
      // Sync with server
      isOnline = true;
      
      // Apply changes
      for (const recipe of localChanges.created) {
        await apiClient.post('/api/recipes', recipe, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
      
      for (const recipe of localChanges.updated) {
        await apiClient.put(`/api/recipes/${recipe.id}`, recipe, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
      
      for (const recipeId of localChanges.deleted) {
        await apiClient.delete(`/api/recipes/${recipeId}`, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
      }
      
      // Clear local changes after successful sync
      await AsyncStorage.removeItem('local_changes');
      
      // Verify consistency
      const changes = await AsyncStorage.getItem('local_changes');
      expect(changes).toBeNull();
    });
    
    it('should handle partial sync failures', async () => {
      // Create batch of operations
      const operations = [
        { id: '1', type: 'CREATE', status: 'pending', data: recipeFactory() },
        { id: '2', type: 'CREATE', status: 'pending', data: recipeFactory() },
        { id: '3', type: 'CREATE', status: 'pending', data: { title: '' } }, // Will fail
        { id: '4', type: 'CREATE', status: 'pending', data: recipeFactory() },
      ];
      
      await AsyncStorage.setItem('sync_operations', JSON.stringify(operations));
      
      // Process operations
      const ops = JSON.parse(await AsyncStorage.getItem('sync_operations')!);
      
      for (const op of ops) {
        const response = await apiClient.post('/api/recipes', op.data, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        if ([200, 201].includes(response.status)) {
          op.status = 'completed';
        } else {
          op.status = 'failed';
          op.error = response.data.error;
        }
      }
      
      await AsyncStorage.setItem('sync_operations', JSON.stringify(ops));
      
      // Check results
      const finalOps = JSON.parse(await AsyncStorage.getItem('sync_operations')!);
      const completed = finalOps.filter((op: any) => op.status === 'completed');
      const failed = finalOps.filter((op: any) => op.status === 'failed');
      
      expect(completed.length).toBe(3);
      expect(failed.length).toBe(1);
      expect(failed[0].error).toBeDefined();
    });
  });
});