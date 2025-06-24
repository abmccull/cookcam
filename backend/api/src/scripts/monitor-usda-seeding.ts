import fs from 'fs/promises';
import path from 'path';

const PROGRESS_FILE = path.join(__dirname, '../../complete-usda-seeding-progress.json');

interface SeedingProgress {
  totalItems: number;
  processedItems: number;
  currentPage: number;
  currentDataType: string;
  currentDataTypeIndex: number;
  startTime: string;
  lastUpdateTime: string;
  errors: string[];
  successfulInserts: number;
  skippedDuplicates: number;
  estimatedCompletion?: string;
  batchBuffer: any[];
}

class USDAMonitor {
  private isRunning = true;

  async monitor(): Promise<void> {
    console.log('📊 CookCam USDA Seeding Monitor');
    console.log('Press Ctrl+C to stop monitoring\n');

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n👋 Stopping monitor...');
      this.isRunning = false;
    });

    while (this.isRunning) {
      try {
        await this.displayStatus();
        await this.delay(10000); // Update every 10 seconds
      } catch (error) {
        console.error('Error monitoring:', error);
        await this.delay(30000); // Wait longer on error
      }
    }
  }

  async displayStatus(): Promise<void> {
    try {
      // Clear screen for better display
      console.clear();
      console.log('📊 CookCam USDA Seeding Monitor');
      console.log('═'.repeat(60));
      console.log(`🕐 Last updated: ${new Date().toLocaleString()}\n`);

      const data = await fs.readFile(PROGRESS_FILE, 'utf8');
      const progress: SeedingProgress = JSON.parse(data);

      // Calculate statistics
      const percentage = ((progress.processedItems / progress.totalItems) * 100).toFixed(2);
      const startTime = new Date(progress.startTime);
      const elapsedMs = Date.now() - startTime.getTime();
      const elapsedHours = (elapsedMs / (1000 * 60 * 60)).toFixed(1);
      
      // Calculate rate
      const itemsPerHour = progress.processedItems / (elapsedMs / (1000 * 60 * 60));
      const itemsPerMinute = itemsPerHour / 60;

      // Progress bar
      const barWidth = 40;
      const filledWidth = Math.round((progress.processedItems / progress.totalItems) * barWidth);
      const emptyWidth = barWidth - filledWidth;
      const progressBar = '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);

      console.log('📈 OVERALL PROGRESS');
      console.log('─'.repeat(40));
      console.log(`[${progressBar}] ${percentage}%`);
      console.log(`🔢 Items: ${progress.processedItems.toLocaleString()} / ${progress.totalItems.toLocaleString()}`);
      console.log(`✅ Successful: ${progress.successfulInserts.toLocaleString()}`);
      console.log(`❌ Errors: ${progress.errors.length.toLocaleString()}`);
      console.log(`🔢 Buffer: ${progress.batchBuffer.length} items`);
      console.log();

      console.log('⚡ PERFORMANCE METRICS');
      console.log('─'.repeat(40));
      console.log(`⏱️  Elapsed: ${elapsedHours} hours`);
      console.log(`🚀 Rate: ${itemsPerHour.toFixed(0)} items/hour`);
      console.log(`📊 Rate: ${itemsPerMinute.toFixed(1)} items/minute`);
      console.log();

      console.log('🎯 CURRENT STATUS');
      console.log('─'.repeat(40));
      console.log(`📂 Data Type: ${progress.currentDataType}`);
      console.log(`📄 Page: ${progress.currentPage}`);
      console.log(`🕐 Last Update: ${new Date(progress.lastUpdateTime).toLocaleString()}`);
      console.log();

      // ETA calculation
      if (progress.estimatedCompletion) {
        const eta = new Date(progress.estimatedCompletion);
        const timeToCompletion = eta.getTime() - Date.now();
        const hoursRemaining = (timeToCompletion / (1000 * 60 * 60)).toFixed(1);
        
        console.log('🎯 ESTIMATED COMPLETION');
        console.log('─'.repeat(40));
        console.log(`📅 ETA: ${eta.toLocaleDateString()} ${eta.toLocaleTimeString()}`);
        console.log(`⏰ Time Remaining: ~${hoursRemaining} hours`);
        console.log();
      }

      // Recent errors (last 5)
      if (progress.errors.length > 0) {
        console.log('⚠️  RECENT ERRORS');
        console.log('─'.repeat(40));
        const recentErrors = progress.errors.slice(-5);
        recentErrors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.substring(0, 50)}...`);
        });
        console.log();
      }

      console.log('💡 CONTROLS');
      console.log('─'.repeat(40));
      console.log('• Press Ctrl+C to stop monitoring');
      console.log('• Run `npm run seed-usda:complete:status` for JSON details');
      console.log('• Run `npm run seed-usda:complete:resume` to resume if stopped');

    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('📝 No seeding process found.');
        console.log('💡 Start seeding with: npm run seed-usda:complete');
      } else {
        console.log('❌ Error reading progress:', error.message);
      }
    }
  }

  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Static method for one-time status check
  static async quickStatus(): Promise<void> {
    try {
      const data = await fs.readFile(PROGRESS_FILE, 'utf8');
      const progress: SeedingProgress = JSON.parse(data);
      
      const percentage = ((progress.processedItems / progress.totalItems) * 100).toFixed(2);
      
      console.log('📊 Quick Status Check');
      console.log('════════════════════');
      console.log(`Progress: ${percentage}% (${progress.processedItems.toLocaleString()}/${progress.totalItems.toLocaleString()})`);
      console.log(`Current: ${progress.currentDataType} - Page ${progress.currentPage}`);
      console.log(`Success: ${progress.successfulInserts.toLocaleString()} | Errors: ${progress.errors.length}`);
      
      if (progress.estimatedCompletion) {
        const eta = new Date(progress.estimatedCompletion);
        console.log(`ETA: ${eta.toLocaleDateString()} ${eta.toLocaleTimeString()}`);
      }
      
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('📝 No active seeding process found.');
      } else {
        console.log('❌ Error:', error.message);
      }
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'monitor';
  
  const monitor = new USDAMonitor();
  
  switch (command) {
    case 'monitor':
      await monitor.monitor();
      break;
      
    case 'quick':
      await USDAMonitor.quickStatus();
      break;
      
    default:
      console.log('Usage: npm run monitor-usda [monitor|quick]');
      console.log('  monitor - Real-time monitoring (default)');
      console.log('  quick   - One-time status check');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { USDAMonitor }; 