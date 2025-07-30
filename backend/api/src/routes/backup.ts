import { Router, Request, Response } from 'express';
import { backupService } from '../services/backup';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// All backup routes require authentication and admin role
const requireAdmin = (req: any, res: Response, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

/**
 * @swagger
 * tags:
 *   name: Backup
 *   description: Database backup and restore operations
 */

/**
 * @swagger
 * /backup/start:
 *   post:
 *     summary: Start a backup job
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [full, incremental]
 *                 default: full
 *     responses:
 *       200:
 *         description: Backup job started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 backupId:
 *                   type: string
 *                 message:
 *                   type: string
 *       403:
 *         description: Admin access required
 *       500:
 *         description: Failed to start backup
 */
router.post('/start', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { type = 'full' } = req.body;
    
    if (!['full', 'incremental'].includes(type)) {
      return res.status(400).json({ error: 'Invalid backup type' });
    }

    const backupId = await backupService.startBackup(type);
    
    logger.info('Backup started via API', { 
      backupId, 
      type, 
      userId: (req as any).user?.id 
    });

    res.json({
      backupId,
      message: `${type} backup started successfully`
    });
  } catch (error) {
    logger.error('Failed to start backup via API', { error });
    res.status(500).json({
      error: 'Failed to start backup',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /backup/status/{backupId}:
 *   get:
 *     summary: Get backup job status
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: backupId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Backup status retrieved successfully
 *       404:
 *         description: Backup not found
 *       403:
 *         description: Admin access required
 */
router.get('/status/:backupId', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { backupId } = req.params;
    
    if (!backupId) {
      res.status(400).json({ error: 'Backup ID is required' });
      return;
    }
    
    const status = await backupService.getBackupStatus(backupId);
    
    if (!status) {
      return res.status(404).json({ error: 'Backup not found' });
    }

    res.json(status);
  } catch (error) {
    logger.error('Failed to get backup status', { error });
    res.status(500).json({
      error: 'Failed to get backup status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /backup/list:
 *   get:
 *     summary: List recent backups
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of recent backups
 *       403:
 *         description: Admin access required
 */
router.get('/list', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const backups = await backupService.listRecentBackups(limit);
    
    res.json({
      backups,
      count: backups.length
    });
  } catch (error) {
    logger.error('Failed to list backups', { error });
    res.status(500).json({
      error: 'Failed to list backups',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /backup/restore:
 *   post:
 *     summary: Restore from backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - backupId
 *             properties:
 *               backupId:
 *                 type: string
 *               tables:
 *                 type: array
 *                 items:
 *                   type: string
 *               dryRun:
 *                 type: boolean
 *                 default: false
 *     responses:
 *       200:
 *         description: Restore completed successfully
 *       400:
 *         description: Invalid request
 *       403:
 *         description: Admin access required
 */
router.post('/restore', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { backupId, tables, dryRun = false } = req.body;
    
    if (!backupId) {
      return res.status(400).json({ error: 'Backup ID is required' });
    }

    const result = await backupService.restoreFromBackup(backupId, { tables, dryRun });
    
    logger.info('Restore operation completed', { 
      backupId, 
      result, 
      userId: (req as any).user?.id 
    });

    res.json(result);
  } catch (error) {
    logger.error('Failed to restore from backup', { error });
    res.status(500).json({
      error: 'Failed to restore from backup',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /backup/config:
 *   get:
 *     summary: Get backup configuration
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup configuration
 *       403:
 *         description: Admin access required
 */
router.get('/config', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const config = backupService.getConfig();
    res.json(config);
  } catch (error) {
    logger.error('Failed to get backup config', { error });
    res.status(500).json({
      error: 'Failed to get backup configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /backup/config:
 *   put:
 *     summary: Update backup configuration
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               enabled:
 *                 type: boolean
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *               retention:
 *                 type: integer
 *               tables:
 *                 type: array
 *                 items:
 *                   type: string
 *               incremental:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Configuration updated successfully
 *       403:
 *         description: Admin access required
 */
router.put('/config', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const updates = req.body;
    backupService.updateConfig(updates);
    
    logger.info('Backup configuration updated', { 
      updates, 
      userId: (req as any).user?.id 
    });

    res.json({
      message: 'Configuration updated successfully',
      config: backupService.getConfig()
    });
  } catch (error) {
    logger.error('Failed to update backup config', { error });
    res.status(500).json({
      error: 'Failed to update backup configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * @swagger
 * /backup/test:
 *   post:
 *     summary: Test backup system
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Backup test results
 *       403:
 *         description: Admin access required
 */
router.post('/test', authenticateUser, requireAdmin, async (req: Request, res: Response) => {
  try {
    const testResults = await backupService.testBackup();
    
    const statusCode = testResults.success ? 200 : 500;
    res.status(statusCode).json(testResults);
  } catch (error) {
    logger.error('Failed to test backup system', { error });
    res.status(500).json({
      error: 'Failed to test backup system',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;