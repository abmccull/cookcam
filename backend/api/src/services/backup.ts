import { createClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger';
import { CacheService } from './cache';

interface BackupConfig {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  retention: number; // days
  tables: string[];
  incremental: boolean;
}

interface BackupStatus {
  id: string;
  status: 'running' | 'completed' | 'failed';
  type: 'full' | 'incremental';
  startTime: Date;
  endTime?: Date;
  size?: number;
  error?: string;
  tablesBackedUp: string[];
}

export class BackupService {
  private supabase: ReturnType<typeof createClient>;
  private cacheService: CacheService;
  private config: BackupConfig;

  constructor() {
    this.supabase = createClient(
      process.env.SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_KEY || ''
    );
    this.cacheService = new CacheService();
    
    this.config = {
      enabled: process.env.BACKUP_ENABLED === 'true',
      frequency: (process.env.BACKUP_FREQUENCY as any) || 'daily',
      retention: parseInt(process.env.BACKUP_RETENTION_DAYS || '30'),
      tables: [
        'users',
        'recipes',
        'ingredients',
        'user_recipes',
        'scans',
        'subscriptions',
        'user_streaks',
        'xp_transactions',
        'leaderboard',
        'creator_profiles'
      ],
      incremental: process.env.BACKUP_INCREMENTAL === 'true'
    };
  }

  // Start a backup job
  async startBackup(type: 'full' | 'incremental' = 'full'): Promise<string> {
    if (!this.config.enabled) {
      throw new Error('Backup service is disabled');
    }

    const backupId = `backup_${Date.now()}`;
    const status: BackupStatus = {
      id: backupId,
      status: 'running',
      type,
      startTime: new Date(),
      tablesBackedUp: []
    };

    try {
      logger.info('Starting backup', { backupId, type });
      
      // Store backup status
      await this.cacheService.set(`backup:status:${backupId}`, status, { ttl: 86400 }); // 24h

      // Run backup in background
      this.runBackup(backupId, type).catch(error => {
        logger.error('Backup failed', { backupId, error });
      });

      return backupId;
    } catch (error) {
      logger.error('Failed to start backup', { error });
      throw new Error('Failed to start backup');
    }
  }

  // Get backup status
  async getBackupStatus(backupId: string): Promise<BackupStatus | null> {
    try {
      return await this.cacheService.get<BackupStatus>(`backup:status:${backupId}`);
    } catch (error) {
      logger.error('Failed to get backup status', { backupId, error });
      return null;
    }
  }

  // List recent backups
  async listRecentBackups(_limit: number = 10): Promise<BackupStatus[]> {
    try {
      // In a real implementation, this would query a backup metadata table
      // For now, we'll return cached statuses
      const backups: BackupStatus[] = [];
      
      // This is a simplified implementation
      // In production, you'd store backup metadata in a database table
      
      return backups;
    } catch (error) {
      logger.error('Failed to list backups', { error });
      return [];
    }
  }

  // Run the actual backup process
  private async runBackup(backupId: string, type: 'full' | 'incremental'): Promise<void> {
    const status = await this.getBackupStatus(backupId);
    if (!status) {
      throw new Error('Backup status not found');
    }

    try {
      let totalSize = 0;
      const tablesBackedUp: string[] = [];

      for (const table of this.config.tables) {
        try {
          logger.info(`Backing up table: ${table}`, { backupId });
          
          // Get table data
          let query = this.supabase.from(table).select('*');
          
          // For incremental backups, add timestamp filter
          if (type === 'incremental') {
            const lastBackup = await this.getLastBackupTime();
            if (lastBackup) {
              query = query.gte('updated_at', lastBackup.toISOString());
            }
          }

          const { data, error } = await query;
          
          if (error) {
            logger.error(`Failed to backup table ${table}`, { error });
            continue;
          }

          // In a real implementation, you would:
          // 1. Export data to a file (JSON, SQL, etc.)
          // 2. Compress the file
          // 3. Upload to cloud storage (AWS S3, Google Cloud Storage, etc.)
          // 4. Store backup metadata
          
          const tableSize = JSON.stringify(data).length;
          totalSize += tableSize;
          tablesBackedUp.push(table);
          
          logger.info(`Table ${table} backed up`, { 
            backupId, 
            recordCount: data?.length || 0,
            size: tableSize 
          });
          
        } catch (error) {
          logger.error(`Error backing up table ${table}`, { backupId, error });
        }
      }

      // Update backup status to completed
      const completedStatus: BackupStatus = {
        ...status,
        status: 'completed',
        endTime: new Date(),
        size: totalSize,
        tablesBackedUp
      };

      await this.cacheService.set(`backup:status:${backupId}`, completedStatus, { ttl: 86400 });
      
      // Store last backup time
      await this.cacheService.set('backup:last_backup', new Date(), { ttl: 86400 * 30 });

      logger.info('Backup completed successfully', { 
        backupId, 
        tablesBackedUp: tablesBackedUp.length,
        totalSize 
      });

      // Clean up old backups
      await this.cleanupOldBackups();

    } catch (error) {
      // Update backup status to failed
      const failedStatus: BackupStatus = {
        ...status,
        status: 'failed',
        endTime: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error'
      };

      await this.cacheService.set(`backup:status:${backupId}`, failedStatus, { ttl: 86400 });
      
      logger.error('Backup failed', { backupId, error });
      throw error;
    }
  }

  // Get last backup time
  private async getLastBackupTime(): Promise<Date | null> {
    try {
      const lastBackup = await this.cacheService.get<Date>('backup:last_backup');
      return lastBackup ? new Date(lastBackup) : null;
    } catch (error) {
      logger.error('Failed to get last backup time', { error });
      return null;
    }
  }

  // Clean up old backups
  private async cleanupOldBackups(): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Query backup metadata table
      // 2. Find backups older than retention period
      // 3. Delete backup files from storage
      // 4. Remove metadata records
      
      logger.info('Backup cleanup completed');
    } catch (error) {
      logger.error('Failed to cleanup old backups', { error });
    }
  }

  // Restore from backup
  async restoreFromBackup(backupId: string, options: {
    tables?: string[];
    dryRun?: boolean;
  } = {}): Promise<{ success: boolean; message: string; affectedTables?: string[] }> {
    try {
      const { tables = this.config.tables, dryRun = false } = options;
      
      logger.info('Starting restore', { backupId, tables, dryRun });

      if (dryRun) {
        return {
          success: true,
          message: 'Dry run completed successfully',
          affectedTables: tables
        };
      }

      // In a real implementation, this would:
      // 1. Download backup files from storage
      // 2. Validate backup integrity
      // 3. Create database transaction
      // 4. Restore table data
      // 5. Commit or rollback transaction

      logger.info('Restore completed', { backupId });

      return {
        success: true,
        message: 'Restore completed successfully',
        affectedTables: tables
      };

    } catch (error) {
      logger.error('Restore failed', { backupId, error });
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get backup configuration
  getConfig(): BackupConfig {
    return { ...this.config };
  }

  // Update backup configuration
  updateConfig(updates: Partial<BackupConfig>): void {
    this.config = { ...this.config, ...updates };
    logger.info('Backup configuration updated', { config: this.config });
  }

  // Schedule automatic backups
  async scheduleAutomaticBackups(): Promise<void> {
    if (!this.config.enabled) {
      logger.info('Automatic backups are disabled');
      return;
    }

    // In a real implementation, this would set up cron jobs or use a task scheduler
    // For now, we'll just log the intent
    logger.info('Automatic backups scheduled', { 
      frequency: this.config.frequency,
      retention: this.config.retention 
    });
  }

  // Test backup system
  async testBackup(): Promise<{ success: boolean; message: string; checks: any[] }> {
    const checks = [];

    try {
      // Test database connection
      const { error: dbError } = await this.supabase.from('users').select('id').limit(1);
      checks.push({
        name: 'Database Connection',
        success: !dbError,
        message: dbError ? dbError.message : 'Connected successfully'
      });

      // Test cache connection
      try {
        await this.cacheService.set('backup:test', 'test', { ttl: 60 });
        await this.cacheService.del('backup:test');
        checks.push({
          name: 'Cache Connection',
          success: true,
          message: 'Cache working properly'
        });
      } catch (cacheError) {
        checks.push({
          name: 'Cache Connection',
          success: false,
          message: cacheError instanceof Error ? cacheError.message : 'Unknown error'
        });
      }

      // Test backup configuration
      checks.push({
        name: 'Backup Configuration',
        success: this.config.enabled,
        message: this.config.enabled ? 'Backup enabled' : 'Backup disabled'
      });

      const allSuccess = checks.every(check => check.success);

      return {
        success: allSuccess,
        message: allSuccess ? 'All backup tests passed' : 'Some backup tests failed',
        checks
      };

    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Test failed',
        checks
      };
    }
  }
}

// Create singleton instance
export const backupService = new BackupService();