import { supabase } from '../db/database';
import fs from 'fs/promises';
import path from 'path';

interface SeederStats {
  totalExpected: number;
  currentCount: number;
  percentageComplete: number;
  estimatedTimeRemaining: string;
  dailyProgressAverage: number;
  recentErrors: string[];
}

class SeedingMonitor {
  private progressFile: string;

  constructor() {
    this.progressFile = path.join(__dirname, '../../seeding-progress.json');
  }

  // Check database setup
  async checkDatabaseSetup(): Promise<boolean> {
    try {
      console.log('🔍 Checking database setup...');

      // Check if nutrition columns exist
      const { error } = await supabase
        .from('ingredients')
        .select('sugar_g_per_100g, calcium_mg_per_100g, iron_mg_per_100g, vitamin_c_mg_per_100g, usda_data_type')
        .limit(1);

      if (error && error.message.includes('column')) {
        console.log('❌ Missing nutrition columns in ingredients table');
        console.log('📝 Please run the SQL script: backend/api/src/scripts/add-nutrition-columns.sql');
        return false;
      }

      console.log('✅ Database setup looks good');
      return true;
    } catch (dbError: unknown) {
      console.error('❌ Database check failed:', dbError);
      return false;
    }
  }

  // Get current database statistics
  async getDatabaseStats(): Promise<any> {
    try {
      const { data: totalCount } = await supabase
        .from('ingredients')
        .select('id', { count: 'exact' });

      const { data: usdaSyncedCount } = await supabase
        .from('ingredients')
        .select('id', { count: 'exact' })
        .not('fdc_id', 'is', null);

      const { data: recentlyAdded } = await supabase
        .from('ingredients')
        .select('name, usda_sync_date')
        .not('usda_sync_date', 'is', null)
        .order('usda_sync_date', { ascending: false })
        .limit(5);

      const { data: categories } = await supabase
        .from('ingredients')
        .select('category')
        .not('fdc_id', 'is', null);

      const categoryCounts = categories?.reduce((acc: any, item: any) => {
        acc[item.category] = (acc[item.category] || 0) + 1;
        return acc;
      }, {}) || {};

      return {
        totalIngredients: totalCount?.length || 0,
        usdaSynced: usdaSyncedCount?.length || 0,
        recentlyAdded: recentlyAdded || [],
        categoryCounts
      };
    } catch (error) {
      console.error('❌ Failed to get database stats:', error);
      return null;
    }
  }

  // Get seeding progress
  async getSeederStats(): Promise<SeederStats | null> {
    try {
      const data = await fs.readFile(this.progressFile, 'utf-8');
      const progress = JSON.parse(data);

      const percentage = (progress.processedItems / progress.totalItems) * 100;
      
      const startedAt = new Date(progress.startTime);
      const now = new Date();
      const elapsedHours = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
      const itemsPerHour = progress.processedItems / elapsedHours;
      const remainingItems = progress.totalItems - progress.processedItems;
      const hoursRemaining = remainingItems / itemsPerHour;

      let timeRemainingStr = '';
      if (hoursRemaining < 24) {
        timeRemainingStr = `${hoursRemaining.toFixed(1)} hours`;
      } else {
        const daysRemaining = hoursRemaining / 24;
        timeRemainingStr = `${daysRemaining.toFixed(1)} days`;
      }

      return {
        totalExpected: progress.totalItems,
        currentCount: progress.processedItems,
        percentageComplete: percentage,
        estimatedTimeRemaining: timeRemainingStr,
        dailyProgressAverage: itemsPerHour * 24,
        recentErrors: [] // Could be enhanced to track recent errors
      };
    } catch {
      return null;
    }
  }

  // Print comprehensive status
  async printStatus(): Promise<void> {
    console.log('\n🔍 CookCam USDA Database Seeding Status\n');
    console.log('═'.repeat(50));

    // Database setup check
    const dbSetup = await this.checkDatabaseSetup();
    if (!dbSetup) {
      console.log('\n❌ Database setup incomplete. Please run the migration first.');
      return;
    }

    // Database statistics
    console.log('\n📊 Current Database Status:');
    const dbStats = await this.getDatabaseStats();
    if (dbStats) {
      console.log(`   Total ingredients: ${dbStats.totalIngredients.toLocaleString()}`);
      console.log(`   USDA synced: ${dbStats.usdaSynced.toLocaleString()}`);
      console.log(`   Local only: ${(dbStats.totalIngredients - dbStats.usdaSynced).toLocaleString()}`);
      
      if (Object.keys(dbStats.categoryCounts).length > 0) {
        console.log('\n   Top categories:');
        const sortedCategories = Object.entries(dbStats.categoryCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))
          .slice(0, 5);
        
        sortedCategories.forEach(([category, count]) => {
          console.log(`     • ${category}: ${count}`);
        });
      }

      if (dbStats.recentlyAdded.length > 0) {
        console.log('\n   Recently added:');
        dbStats.recentlyAdded.forEach((item: any) => {
          const date = new Date(item.usda_sync_date).toLocaleDateString();
          console.log(`     • ${item.name} (${date})`);
        });
      }
    }

    // Seeder progress
    console.log('\n🚀 Seeding Progress:');
    const seederStats = await this.getSeederStats();
    if (seederStats) {
      console.log(`   Progress: ${seederStats.currentCount.toLocaleString()}/${seederStats.totalExpected.toLocaleString()} (${seederStats.percentageComplete.toFixed(2)}%)`);
      console.log(`   Estimated time remaining: ${seederStats.estimatedTimeRemaining}`);
      console.log(`   Daily average: ${seederStats.dailyProgressAverage.toLocaleString()} items/day`);
      
      const progressBar = this.createProgressBar(seederStats.percentageComplete);
      console.log(`   ${progressBar}`);
    } else {
      console.log('   No seeding process has been started yet.');
      console.log('   Run: npm run seed-usda:run');
    }

    console.log('\n═'.repeat(50));
  }

  // Create a visual progress bar
  createProgressBar(percentage: number, width: number = 30): string {
    const filled = Math.round((percentage / 100) * width);
    const empty = width - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${percentage.toFixed(1)}%`;
  }

  // Estimate completion time
  async estimateCompletion(): Promise<void> {
    const seederStats = await this.getSeederStats();
    if (!seederStats) {
      console.log('❌ No seeding progress found');
      return;
    }

    console.log('\n📅 Completion Estimates:');
    console.log('─'.repeat(30));

    const rates = {
      current: seederStats.dailyProgressAverage,
      conservative: seederStats.dailyProgressAverage * 0.8, // Account for rate limits, errors
      optimistic: seederStats.dailyProgressAverage * 1.2    // If we get fewer errors
    };

    Object.entries(rates).forEach(([scenario, rate]) => {
      const remainingItems = seederStats.totalExpected - seederStats.currentCount;
      const daysRemaining = remainingItems / rate;
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + daysRemaining);
      
      console.log(`   ${scenario.padEnd(12)}: ${completionDate.toDateString()}`);
    });

    console.log('\n💡 Tips for optimal seeding:');
    console.log('   • Run during off-peak hours');
    console.log('   • Monitor for API rate limit errors');
    console.log('   • Use "resume" command if interrupted');
    console.log('   • Check status daily with: npm run seed-usda:status');
  }

  // Setup instructions
  printSetupInstructions(): void {
    console.log('\n🚀 USDA Seeding Setup Instructions\n');
    console.log('═'.repeat(50));

    console.log('\n1️⃣  Database Setup:');
    console.log('   Run this SQL in Supabase SQL Editor:');
    console.log('   📄 backend/api/src/scripts/add-nutrition-columns.sql');

    console.log('\n2️⃣  Environment Setup:');
    console.log('   Ensure USDA_API_KEY is set in .env file');
    console.log('   (DEMO_KEY works but has stricter limits)');

    console.log('\n3️⃣  Start Seeding:');
    console.log('   npm run seed-usda:run    # Start fresh');
    console.log('   npm run seed-usda:resume # Resume from interruption');

    console.log('\n4️⃣  Monitor Progress:');
    console.log('   npm run seed-usda:status # Check current status');

    console.log('\n5️⃣  Expected Timeline:');
    console.log('   • Total items: ~114,292');
    console.log('   • Rate limit: 950 requests/hour');
    console.log('   • Estimated time: 3-4 weeks continuous');
    console.log('   • Recommended: Run daily for 8-12 hours');

    console.log('\n⚠️  Important Notes:');
    console.log('   • Process can be stopped/resumed safely');
    console.log('   • Progress is automatically saved');
    console.log('   • API rate limits are respected');
    console.log('   • Duplicate entries are handled via upsert');

    console.log('\n═'.repeat(50));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  const monitor = new SeedingMonitor();
  
  switch (command) {
    case 'status':
      await monitor.printStatus();
      break;
      
    case 'estimate':
      await monitor.estimateCompletion();
      break;
      
    case 'setup':
      monitor.printSetupInstructions();
      break;
      
    default:
      console.log('Usage: npm run monitor [status|estimate|setup]');
      console.log('  status   - Show current database and seeding status');
      console.log('  estimate - Show completion time estimates');
      console.log('  setup    - Show setup instructions');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { SeedingMonitor }; 