/**
 * Cron Job: Subscription Reconciliation
 * 
 * Run this file via PM2 cron or system cron to reconcile subscriptions daily
 * 
 * PM2 Usage:
 *   pm2 start cron-reconciliation.js --cron "0 2 * * *" --no-autorestart
 * 
 * System Cron (add to crontab):
 *   0 2 * * * cd /path/to/backend/api && node cron-reconciliation.js
 */

require('ts-node/register');
const { runReconciliationJob } = require('./src/jobs/subscriptionReconciliation');
const { logger } = require('./src/utils/logger');

async function main() {
  logger.info('🕐 Starting scheduled reconciliation job...');
  
  try {
    await runReconciliationJob();
    logger.info('✅ Scheduled reconciliation job completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Scheduled reconciliation job failed', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

main();

