import { BackupService, backupService } from '../backup';
import { logger } from '../../utils/logger';
import { CacheService } from '../cache';
import { createClient } from '@supabase/supabase-js';

// Mock dependencies
jest.mock('../../utils/logger');
jest.mock('../cache');
jest.mock('@supabase/supabase-js');

const mockLogger = logger as jest.Mocked<typeof logger>;
const mockCreateClient = createClient as jest.MockedFunction<typeof createClient>;

describe('BackupService', () => {
  let service: BackupService;
  let mockCacheService: jest.Mocked<CacheService>;
  let mockSupabase: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock CacheService
    mockCacheService = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      clear: jest.fn(),
      keys: jest.fn(),
    } as any;

    (CacheService as jest.MockedClass<typeof CacheService>).mockImplementation(
      () => mockCacheService
    );

    // Mock Supabase
    mockSupabase = {
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [], error: null }),
        gte: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };

    mockCreateClient.mockReturnValue(mockSupabase);

    // Set up environment variables
    process.env.SUPABASE_URL = 'https://test.supabase.co';
    process.env.SUPABASE_SERVICE_KEY = 'test-service-key';
    process.env.BACKUP_ENABLED = 'true';
    process.env.BACKUP_FREQUENCY = 'daily';
    process.env.BACKUP_RETENTION_DAYS = '30';
    process.env.BACKUP_INCREMENTAL = 'true';

    service = new BackupService();
  });

  afterEach(() => {
    delete process.env.SUPABASE_URL;
    delete process.env.SUPABASE_SERVICE_KEY;
    delete process.env.BACKUP_ENABLED;
    delete process.env.BACKUP_FREQUENCY;
    delete process.env.BACKUP_RETENTION_DAYS;
    delete process.env.BACKUP_INCREMENTAL;
  });

  describe('Initialization', () => {
    it('should initialize with correct configuration from environment variables', () => {
      const config = service.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.frequency).toBe('daily');
      expect(config.retention).toBe(30);
      expect(config.incremental).toBe(true);
      expect(config.tables).toContain('users');
      expect(config.tables).toContain('recipes');
    });

    it('should initialize with default values when environment variables are missing', () => {
      delete process.env.BACKUP_ENABLED;
      delete process.env.BACKUP_FREQUENCY;
      delete process.env.BACKUP_RETENTION_DAYS;
      delete process.env.BACKUP_INCREMENTAL;

      const serviceWithDefaults = new BackupService();
      const config = serviceWithDefaults.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.frequency).toBe('daily');
      expect(config.retention).toBe(30);
      expect(config.incremental).toBe(false);
    });

    it('should initialize Supabase client correctly', () => {
      expect(mockCreateClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key'
      );
    });
  });

  describe('Starting Backups', () => {
    it('should start a full backup successfully', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      const backupId = await service.startBackup('full');

      expect(backupId).toMatch(/^backup_\d+$/);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting backup', {
        backupId,
        type: 'full',
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `backup:status:${backupId}`,
        expect.objectContaining({
          id: backupId,
          status: 'running',
          type: 'full',
          tablesBackedUp: [],
        }),
        { ttl: 86400 }
      );
    });

    it('should start an incremental backup successfully', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      const backupId = await service.startBackup('incremental');

      expect(backupId).toMatch(/^backup_\d+$/);
      expect(mockLogger.info).toHaveBeenCalledWith('Starting backup', {
        backupId,
        type: 'incremental',
      });
    });

    it('should default to full backup when type not specified', async () => {
      mockCacheService.set.mockResolvedValue(undefined);

      const backupId = await service.startBackup();

      expect(mockLogger.info).toHaveBeenCalledWith('Starting backup', {
        backupId,
        type: 'full',
      });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          type: 'full',
        }),
        expect.any(Object)
      );
    });

    it('should throw error when backup service is disabled', async () => {
      service.updateConfig({ enabled: false });

      await expect(service.startBackup('full')).rejects.toThrow('Backup service is disabled');
    });

    it('should handle errors during backup start', async () => {
      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      await expect(service.startBackup('full')).rejects.toThrow('Failed to start backup');
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to start backup', {
        error: expect.any(Error),
      });
    });
  });

  describe('Backup Status Management', () => {
    const mockBackupId = 'backup_1234567890';
    const mockStatus = {
      id: mockBackupId,
      status: 'running' as const,
      type: 'full' as const,
      startTime: new Date(),
      tablesBackedUp: [],
    };

    it('should get backup status successfully', async () => {
      mockCacheService.get.mockResolvedValue(mockStatus);

      const status = await service.getBackupStatus(mockBackupId);

      expect(status).toEqual(mockStatus);
      expect(mockCacheService.get).toHaveBeenCalledWith(`backup:status:${mockBackupId}`);
    });

    it('should return null when backup status not found', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const status = await service.getBackupStatus(mockBackupId);

      expect(status).toBeNull();
    });

    it('should handle errors when getting backup status', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      const status = await service.getBackupStatus(mockBackupId);

      expect(status).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get backup status', {
        backupId: mockBackupId,
        error: expect.any(Error),
      });
    });
  });

  describe('Listing Recent Backups', () => {
    it('should list recent backups', async () => {
      const backups = await service.listRecentBackups(5);

      expect(Array.isArray(backups)).toBe(true);
      expect(backups).toHaveLength(0); // Empty implementation
    });

    it('should handle errors when listing backups', async () => {
      // Force an error by mocking a method that throws
      const originalMethod = service.listRecentBackups;
      (service as any).listRecentBackups = jest.fn().mockImplementation(() => {
        throw new Error('List error');
      });

      const backups = await originalMethod.call(service, 10);

      expect(backups).toEqual([]);
    });
  });

  describe('Backup Execution', () => {
    beforeEach(() => {
      // Mock successful table queries
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          gte: jest.fn().mockReturnThis(),
          then: async () => ({ data: [{ id: 1, name: 'test' }], error: null }),
        }),
      });
    });

    it('should execute full backup successfully', async () => {
      const mockStatus = {
        id: 'backup_test',
        status: 'running' as const,
        type: 'full' as const,
        startTime: new Date(),
        tablesBackedUp: [],
      };

      mockCacheService.get.mockResolvedValueOnce(mockStatus); // getBackupStatus
      mockCacheService.set.mockResolvedValue(undefined);

      // Mock table data queries
      const mockData = [{ id: 1, name: 'test record' }];
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: mockData, error: null }),
      });

      // Start backup and wait for completion
      const backupId = await service.startBackup('full');

      // Allow some time for async backup to run
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from).toHaveBeenCalledWith('recipes');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Backing up table:'),
        expect.any(Object)
      );
    });

    it('should execute incremental backup with timestamp filter', async () => {
      const mockStatus = {
        id: 'backup_test',
        status: 'running' as const,
        type: 'incremental' as const,
        startTime: new Date(),
        tablesBackedUp: [],
      };

      const lastBackupTime = new Date('2024-01-01');
      mockCacheService.get
        .mockResolvedValueOnce(mockStatus) // getBackupStatus
        .mockResolvedValueOnce(lastBackupTime); // getLastBackupTime

      const mockQuery = {
        select: jest.fn().mockReturnThis(),
        gte: jest.fn().mockResolvedValue({ data: [], error: null }),
      };

      mockSupabase.from.mockReturnValue(mockQuery);

      await service.startBackup('incremental');

      // Allow time for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockQuery.gte).toHaveBeenCalledWith('updated_at', lastBackupTime.toISOString());
    });

    it('should handle table backup errors gracefully', async () => {
      const mockStatus = {
        id: 'backup_test',
        status: 'running' as const,
        type: 'full' as const,
        startTime: new Date(),
        tablesBackedUp: [],
      };

      mockCacheService.get.mockResolvedValueOnce(mockStatus);
      mockCacheService.set.mockResolvedValue(undefined);

      // Mock one table to fail
      let callCount = 0;
      mockSupabase.from.mockImplementation((table: string) => ({
        select: jest.fn().mockResolvedValue(
          table === 'users' 
            ? { data: null, error: { message: 'Table error' } }
            : { data: [{ id: 1 }], error: null }
        ),
      }));

      await service.startBackup('full');

      // Allow time for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to backup table users',
        { error: { message: 'Table error' } }
      );
    });

    it('should update backup status to completed after successful backup', async () => {
      const mockStatus = {
        id: 'backup_test',
        status: 'running' as const,
        type: 'full' as const,
        startTime: new Date(),
        tablesBackedUp: [],
      };

      mockCacheService.get.mockResolvedValueOnce(mockStatus);
      mockCacheService.set.mockResolvedValue(undefined);

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockResolvedValue({ data: [{ id: 1 }], error: null }),
      });

      await service.startBackup('full');

      // Allow time for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check that status was updated to completed
      const completedCall = mockCacheService.set.mock.calls.find(call => 
        call[0].includes('backup:status:') && call[1].status === 'completed'
      );

      expect(completedCall).toBeDefined();
    });

    it('should handle backup execution errors', async () => {
      const mockStatus = {
        id: 'backup_test',
        status: 'running' as const,
        type: 'full' as const,
        startTime: new Date(),
        tablesBackedUp: [],
      };

      mockCacheService.get.mockResolvedValueOnce(mockStatus);
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await service.startBackup('full');

      // Allow time for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith('Backup failed', expect.any(Object));
    });
  });

  describe('Backup Restoration', () => {
    it('should perform dry run restoration', async () => {
      const result = await service.restoreFromBackup('backup_123', {
        tables: ['users', 'recipes'],
        dryRun: true,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Dry run completed successfully');
      expect(result.affectedTables).toEqual(['users', 'recipes']);
    });

    it('should perform actual restoration', async () => {
      const result = await service.restoreFromBackup('backup_123', {
        tables: ['users'],
        dryRun: false,
      });

      expect(result.success).toBe(true);
      expect(result.message).toBe('Restore completed successfully');
      expect(result.affectedTables).toEqual(['users']);
    });

    it('should use default tables when not specified', async () => {
      const result = await service.restoreFromBackup('backup_123');

      expect(result.success).toBe(true);
      expect(result.affectedTables).toEqual(service.getConfig().tables);
    });

    it('should handle restoration errors', async () => {
      // Mock logger to throw error
      mockLogger.info.mockImplementationOnce(() => {
        throw new Error('Restore error');
      });

      const result = await service.restoreFromBackup('backup_123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Restore error');
      expect(mockLogger.error).toHaveBeenCalledWith('Restore failed', expect.any(Object));
    });
  });

  describe('Configuration Management', () => {
    it('should get current configuration', () => {
      const config = service.getConfig();

      expect(config).toEqual({
        enabled: true,
        frequency: 'daily',
        retention: 30,
        tables: expect.arrayContaining(['users', 'recipes']),
        incremental: true,
      });
    });

    it('should update configuration', () => {
      service.updateConfig({
        enabled: false,
        frequency: 'weekly',
        retention: 60,
      });

      const config = service.getConfig();

      expect(config.enabled).toBe(false);
      expect(config.frequency).toBe('weekly');
      expect(config.retention).toBe(60);
      expect(config.incremental).toBe(true); // Should remain unchanged
    });

    it('should log configuration updates', () => {
      service.updateConfig({ enabled: false });

      expect(mockLogger.info).toHaveBeenCalledWith('Backup configuration updated', {
        config: expect.any(Object),
      });
    });
  });

  describe('Automatic Backup Scheduling', () => {
    it('should schedule automatic backups when enabled', async () => {
      service.updateConfig({ enabled: true });

      await service.scheduleAutomaticBackups();

      expect(mockLogger.info).toHaveBeenCalledWith('Automatic backups scheduled', {
        frequency: service.getConfig().frequency,
        retention: service.getConfig().retention,
      });
    });

    it('should skip scheduling when backups are disabled', async () => {
      service.updateConfig({ enabled: false });

      await service.scheduleAutomaticBackups();

      expect(mockLogger.info).toHaveBeenCalledWith('Automatic backups are disabled');
    });
  });

  describe('Backup System Testing', () => {
    it('should pass all backup tests when system is healthy', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.del.mockResolvedValue(undefined);
      service.updateConfig({ enabled: true });

      const result = await service.testBackup();

      expect(result.success).toBe(true);
      expect(result.message).toBe('All backup tests passed');
      expect(result.checks).toHaveLength(3);

      const dbCheck = result.checks.find(c => c.name === 'Database Connection');
      expect(dbCheck?.success).toBe(true);

      const cacheCheck = result.checks.find(c => c.name === 'Cache Connection');
      expect(cacheCheck?.success).toBe(true);

      const configCheck = result.checks.find(c => c.name === 'Backup Configuration');
      expect(configCheck?.success).toBe(true);
    });

    it('should fail when database connection fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ 
            data: null, 
            error: { message: 'Connection failed' } 
          }),
        }),
      });

      const result = await service.testBackup();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Some backup tests failed');

      const dbCheck = result.checks.find(c => c.name === 'Database Connection');
      expect(dbCheck?.success).toBe(false);
      expect(dbCheck?.message).toBe('Connection failed');
    });

    it('should fail when cache connection fails', async () => {
      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      mockCacheService.set.mockRejectedValue(new Error('Cache error'));

      const result = await service.testBackup();

      expect(result.success).toBe(false);

      const cacheCheck = result.checks.find(c => c.name === 'Cache Connection');
      expect(cacheCheck?.success).toBe(false);
      expect(cacheCheck?.message).toBe('Cache error');
    });

    it('should fail when backup is disabled', async () => {
      service.updateConfig({ enabled: false });

      mockSupabase.from.mockReturnValue({
        select: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      });

      const result = await service.testBackup();

      expect(result.success).toBe(false);

      const configCheck = result.checks.find(c => c.name === 'Backup Configuration');
      expect(configCheck?.success).toBe(false);
      expect(configCheck?.message).toBe('Backup disabled');
    });

    it('should handle test errors gracefully', async () => {
      mockSupabase.from.mockImplementation(() => {
        throw new Error('Unexpected error');
      });

      const result = await service.testBackup();

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unexpected error');
    });
  });

  describe('Private Methods', () => {
    it('should get last backup time from cache', async () => {
      const lastBackup = new Date('2024-01-01');
      mockCacheService.get.mockResolvedValue(lastBackup);

      const time = await (service as any).getLastBackupTime();

      expect(time).toEqual(new Date(lastBackup));
      expect(mockCacheService.get).toHaveBeenCalledWith('backup:last_backup');
    });

    it('should return null when no last backup time found', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const time = await (service as any).getLastBackupTime();

      expect(time).toBeNull();
    });

    it('should handle errors when getting last backup time', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));

      const time = await (service as any).getLastBackupTime();

      expect(time).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('Failed to get last backup time', {
        error: expect.any(Error),
      });
    });

    it('should perform backup cleanup', async () => {
      await (service as any).cleanupOldBackups();

      expect(mockLogger.info).toHaveBeenCalledWith('Backup cleanup completed');
    });

    it('should handle cleanup errors', async () => {
      // Force an error in cleanup
      const originalLog = mockLogger.info;
      mockLogger.info.mockImplementationOnce(() => {
        throw new Error('Cleanup error');
      });

      await (service as any).cleanupOldBackups();

      expect(mockLogger.error).toHaveBeenCalledWith('Failed to cleanup old backups', {
        error: expect.any(Error),
      });

      mockLogger.info = originalLog;
    });
  });

  describe('Module Export', () => {
    it('should export singleton backup service instance', () => {
      expect(backupService).toBeInstanceOf(BackupService);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing backup status during execution', async () => {
      mockCacheService.get.mockResolvedValue(null); // No status found

      await service.startBackup('full');

      // Allow time for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockLogger.error).toHaveBeenCalledWith('Backup failed', expect.any(Object));
    });

    it('should handle non-Error objects in catch blocks', async () => {
      const mockStatus = {
        id: 'backup_test',
        status: 'running' as const,
        type: 'full' as const,
        startTime: new Date(),
        tablesBackedUp: [],
      };

      mockCacheService.get.mockResolvedValueOnce(mockStatus);
      mockSupabase.from.mockImplementation(() => {
        throw 'String error'; // Non-Error object
      });

      await service.startBackup('full');

      // Allow time for async execution
      await new Promise(resolve => setTimeout(resolve, 100));

      // Should update status with 'Unknown error'
      const errorCall = mockCacheService.set.mock.calls.find(call => 
        call[0].includes('backup:status:') && call[1].error === 'Unknown error'
      );

      expect(errorCall).toBeDefined();
    });

    it('should handle restoration with non-Error objects', async () => {
      mockLogger.info.mockImplementationOnce(() => {
        throw 'String error';
      });

      const result = await service.restoreFromBackup('backup_123');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Unknown error');
    });
  });
});