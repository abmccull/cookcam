import request from 'supertest';
import express from 'express';
import { backupService } from '../../services/backup';
import backupRoutes from '../backup';

// Mock the backup service
jest.mock('../../services/backup');
jest.mock('../../middleware/auth', () => ({
  authenticateUser: (req: any, res: any, next: any) => {
    req.user = { id: 'admin-user', role: 'admin' };
    next();
  }
}));

const mockBackupService = backupService as jest.Mocked<typeof backupService>;

describe('Backup Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/backup', backupRoutes);
    jest.clearAllMocks();
  });

  describe('POST /backup/start', () => {
    it('should start backup successfully for admin user', async () => {
      const mockBackupResult = {
        jobId: 'backup-123',
        status: 'started',
        timestamp: new Date().toISOString()
      };

      mockBackupService.startBackup = jest.fn().mockResolvedValue(mockBackupResult);

      const response = await request(app)
        .post('/backup/start')
        .expect(200);

      expect(response.body).toEqual(mockBackupResult);
      expect(mockBackupService.startBackup).toHaveBeenCalled();
    });

    it('should handle backup service errors', async () => {
      mockBackupService.startBackup = jest.fn().mockRejectedValue(new Error('Backup failed'));

      const response = await request(app)
        .post('/backup/start')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Middleware', () => {
    it('should require admin role', async () => {
      const appWithoutAdmin = express();
      appWithoutAdmin.use(express.json());
      
      // Mock auth middleware to return non-admin user
      jest.doMock('../../middleware/auth', () => ({
        authenticateUser: (req: any, res: any, next: any) => {
          req.user = { id: 'regular-user', role: 'user' };
          next();
        }
      }));

      appWithoutAdmin.use('/backup', backupRoutes);

      const response = await request(appWithoutAdmin)
        .post('/backup/start')
        .expect(403);

      expect(response.body).toHaveProperty('error', 'Admin access required');
    });
  });

  describe('Basic route imports', () => {
    it('should import backup routes without throwing', () => {
      expect(backupRoutes).toBeDefined();
      expect(typeof backupRoutes).toBe('function');
    });
  });
});