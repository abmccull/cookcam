import { supabase } from '../db/database';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const PROGRESS_FILE = path.join(__dirname, '../../seeding-progress.json');

// Rate limiting configuration - DEMO_KEY has much stricter limits
const REQUESTS_PER_HOUR = USDA_API_KEY === 'DEMO_KEY' ? 25 : 950; // Conservative for demo key
const DELAY_BETWEEN_REQUESTS = Math.ceil(3600000 / REQUESTS_PER_HOUR); // milliseconds
const BATCH_SIZE = USDA_API_KEY === 'DEMO_KEY' ? 5 : 20; // Smaller batches for demo key
const PAGE_SIZE = USDA_API_KEY === 'DEMO_KEY' ? 50 : 200; // Page size for USDA API requests
const SAVE_PROGRESS_EVERY = 50; // Save progress every N foods
const MAX_RETRY_DELAY = 4 * 60 * 60 * 1000; // 4 hours max wait

// Types
interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  publishedDate?: string;
  brandOwner?: string;
  ingredients?: string;
  foodCategory?: string;
  foodCategoryId?: number;
  foodNutrients?: USDANutrient[];
}

interface USDANutrient {
  type: string;
  nutrient: {
    id: number;
    number: string;
    name: string;
    rank: number;
    unitName: string;
  };
  amount: number;
}

interface SeedingProgress {
  totalItems: number;
  processedItems: number;
  currentPage: number;
  lastProcessedId: number | null;
  startTime: string;
  lastUpdateTime: string;
  errors: string[];
  successfulInserts: number;
  skippedDuplicates: number;
  pageSize?: number;
  estimatedCompletion?: string;
}

class USDABulkSeeder {
  private progress: SeedingProgress;
  private startTime: number;

  constructor() {
    this.progress = {
      totalItems: 0,
      processedItems: 0,
      currentPage: 1,
      lastProcessedId: null,
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      errors: [],
      successfulInserts: 0,
      skippedDuplicates: 0,
      pageSize: PAGE_SIZE
    };
    this.startTime = Date.now();
  }

  // Load or initialize progress
  async loadProgress(): Promise<void> {
    try {
      const data = await fs.readFile(PROGRESS_FILE, 'utf8');
      this.progress = JSON.parse(data);
      console.log(`📂 Loaded existing progress: ${this.progress.processedItems}/${this.progress.totalItems} items`);
    } catch {
      console.log('📝 Starting fresh seeding process...');
      console.log('🔍 Getting total USDA item count...');
      
      const totalItems = await this.getTotalItemCount();
      
      this.progress = {
        totalItems,
        processedItems: 0,
        currentPage: 1,
        lastProcessedId: null,
        startTime: new Date().toISOString(),
        lastUpdateTime: new Date().toISOString(),
        errors: [],
        successfulInserts: 0,
        skippedDuplicates: 0,
        pageSize: PAGE_SIZE
      };
      
      console.log(`📊 Total USDA items found: ${totalItems.toLocaleString()}`);
      await this.saveProgress();
    }
  }

  // Save current progress
  async saveProgress(): Promise<void> {
    this.progress.lastUpdateTime = new Date().toISOString();
    
    // Calculate estimated completion (only if we have processed some items)
    if (this.progress.processedItems > 0) {
      const elapsedMs = Date.now() - this.startTime;
      const itemsPerMs = this.progress.processedItems / elapsedMs;
      const remainingItems = this.progress.totalItems - this.progress.processedItems;
      const estimatedRemainingMs = remainingItems / itemsPerMs;
      
      // Only set if the calculation results in a valid time
      if (isFinite(estimatedRemainingMs) && estimatedRemainingMs > 0) {
        this.progress.estimatedCompletion = new Date(Date.now() + estimatedRemainingMs).toISOString();
      }
    }

    await fs.writeFile(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
  }

  // Get total count of items in USDA database
  async getTotalItemCount(): Promise<number> {
    try {
      const data = await this.makeAPIRequest(`${USDA_BASE_URL}/foods/search`, {
        query: '*',
        pageSize: 1
      });
      
      return data.totalHits || 114292; // Fallback to known approximate count
    } catch {
      console.log('⚠️ Could not get exact count, using approximate: 114,292');
      return 114292; // Use known approximate count
    }
  }

  // Get a batch of foods from USDA
  async getFoodBatch(pageNumber: number, pageSize: number): Promise<USDAFood[]> {
    const data = await this.makeAPIRequest(`${USDA_BASE_URL}/foods/search`, {
      query: '*',
      pageNumber,
      pageSize
    });
    
    return data.foods || [];
  }

  // Get a page of USDA foods
  async getUSDAFoodsPage(page: number): Promise<USDAFood[]> {
    try {
      console.log(`📄 Fetching page ${page} (${this.progress.pageSize} items)...`);
      
      const response = await axios.get(`${USDA_BASE_URL}/foods/search`, {
        params: {
          query: '*',
          pageNumber: page,
          pageSize: this.progress.pageSize,
          api_key: USDA_API_KEY
        }
      });

      await this.delay(DELAY_BETWEEN_REQUESTS);
      return response.data.foods || [];
    } catch (error) {
      console.error(`❌ Failed to fetch page ${page}:`, error);
      throw error;
    }
  }

  // Get detailed food information
  async getFoodDetails(fdcId: number): Promise<USDAFood | null> {
    try {
      const response = await axios.get(`${USDA_BASE_URL}/food/${fdcId}`, {
        params: {
          api_key: USDA_API_KEY
        }
      });

      await this.delay(DELAY_BETWEEN_REQUESTS);
      return response.data;
    } catch (error) {
      console.error(`❌ Failed to get details for FDC ID ${fdcId}:`, error);
      return null;
    }
  }

  // Extract nutrition data with improved mapping
  extractNutritionalData(food: USDAFood): any {
    if (!food.foodNutrients) {return {};}

    const nutrition: any = {};
    
    food.foodNutrients.forEach(nutrient => {
      const nutrientId = nutrient.nutrient.id;
      const amount = nutrient.amount;

      switch (nutrientId) {
        case 1008: // Energy (calories)
          nutrition.calories_per_100g = amount;
          break;
        case 1003: // Protein
          nutrition.protein_g_per_100g = amount;
          break;
        case 1005: // Carbohydrates
          nutrition.carbs_g_per_100g = amount;
          break;
        case 1004: // Total fat
          nutrition.fat_g_per_100g = amount;
          break;
        case 1079: // Fiber
          nutrition.fiber_g_per_100g = amount;
          break;
        case 1063: // Sugars
          nutrition.sugar_g_per_100g = amount;
          break;
        case 1093: // Sodium
          nutrition.sodium_mg_per_100g = amount;
          break;
        case 1087: // Calcium
          nutrition.calcium_mg_per_100g = amount;
          break;
        case 1089: // Iron
          nutrition.iron_mg_per_100g = amount;
          break;
        case 1162: // Vitamin C
          nutrition.vitamin_c_mg_per_100g = amount;
          break;
      }
    });

    return nutrition;
  }

  // Store food in local database
  async storeFoodInDatabase(food: USDAFood): Promise<boolean> {
    try {
      // Extract nutrition data
      const nutritionData = this.extractNutritionalData(food);

      // Determine category mapping
      const category = this.mapUSDACategory(food.foodCategory, food.dataType);

      // Check for potential issues before inserting
      if (!food.description || food.description.trim().length === 0) {
        console.error(`❌ Empty description for FDC ID ${food.fdcId}`);
        return false;
      }

      // Truncate long names if necessary (PostgreSQL varchar limits)
      const truncatedName = food.description.length > 500 ? 
        food.description.substring(0, 497) + '...' : 
        food.description;

      // Prepare ingredient data
      const ingredientData = {
        name: truncatedName,
        fdc_id: food.fdcId,
        category: category,
        usda_data_type: food.dataType || 'Unknown',
        searchable_text: `${truncatedName} ${category}`.toLowerCase(),
        ...nutritionData
      };

      // Use upsert instead of insert to handle duplicates gracefully
      const { data, error } = await supabase
        .from('ingredients')
        .upsert(ingredientData, { 
          onConflict: 'fdc_id',  // Use fdc_id as the conflict resolution
          ignoreDuplicates: false  // We want to update if exists
        })
        .select('id');

      if (error) {
        console.error(`❌ Failed to store "${truncatedName}":`, error.message);
        
        // Log more details for debugging
        if (error.code === '23505') {
          console.error(`   Constraint violation - attempting manual check`);
          
          // Try to find existing by name or fdc_id
          const { data: existing } = await supabase
            .from('ingredients')
            .select('id, name, fdc_id')
            .or(`name.eq.${truncatedName},fdc_id.eq.${food.fdcId}`)
            .limit(1);
            
          if (existing && existing.length > 0 && existing[0]) {
            console.log(`   Found existing ingredient: ${existing[0].name} (ID: ${existing[0].id})`);
            this.progress.skippedDuplicates++;
            return true; // Count as success since it exists
          }
        }
        
        return false;
      }

      if (data && data.length > 0) {
        this.progress.successfulInserts++;
        return true;
      } else {
        console.error(`❌ No data returned for "${truncatedName}"`);
        return false;
      }

    } catch (error: any) {
      console.error(`💥 Unexpected error storing "${food.description}":`, error.message);
      return false;
    }
  }

  // Map USDA categories to our system
  mapUSDACategory(usdaCategory: string | undefined, dataType: string): string {
    if (!usdaCategory || typeof usdaCategory !== 'string') {
      // Fallback based on data type
      switch (dataType) {
        case 'Foundation': return 'Base Foods';
        case 'SR Legacy': return 'Standard Reference';
        case 'Survey (FNDDS)': return 'Survey Foods';
        case 'Branded': return 'Packaged Foods';
        default: return 'Other';
      }
    }

    // Map common USDA categories
    const categoryMap: { [key: string]: string } = {
      'vegetables and vegetable products': 'Vegetables',
      'fruits and fruit juices': 'Fruits',
      'dairy and egg products': 'Dairy',
      'poultry products': 'Meat & Poultry',
      'beef products': 'Meat & Poultry',
      'pork products': 'Meat & Poultry',
      'finfish and shellfish products': 'Seafood',
      'legumes and legume products': 'Legumes',
      'nut and seed products': 'Nuts & Seeds',
      'cereal grains and pasta': 'Grains',
      'baked products': 'Baked Goods',
      'fats and oils': 'Oils',
      'spices and herbs': 'Seasonings',
      'beverages': 'Beverages',
      'sweets': 'Desserts'
    };

    const lowerCategory = usdaCategory.toLowerCase();
    return categoryMap[lowerCategory] || usdaCategory;
  }

  // Process a batch of foods
  async processBatch(foods: USDAFood[]): Promise<void> {
    console.log(`📦 Processing batch of ${foods.length} foods...`);
    
    for (const food of foods) {
      try {
        // Get detailed information
        const detailedFood = await this.getFoodDetails(food.fdcId);
        
        if (!detailedFood) {
          this.progress.skippedDuplicates++;
          console.log(`⏭️  Skipped ${food.description} (no details)`);
          continue;
        }

        // Store in database
        const success = await this.storeFoodInDatabase(detailedFood);
        
        if (success) {
          this.progress.successfulInserts++;
          console.log(`✅ Stored: ${detailedFood.description}`);
        } else {
          this.progress.errors.push(`Failed to store ${detailedFood.description}`);
          console.log(`❌ Failed: ${detailedFood.description}`);
        }

        this.progress.processedItems++;

        // Save progress periodically
        if (this.progress.processedItems % SAVE_PROGRESS_EVERY === 0) {
          await this.saveProgress();
          this.printProgress();
        }

      } catch (error) {
        this.progress.errors.push(`Error processing ${food.description}: ${(error as Error).message || 'Unknown error'}`);
        console.error(`❌ Error processing ${food.description}:`, error);
      }
    }
  }

  // Print current progress
  printProgress(): void {
    const percentage = ((this.progress.processedItems / this.progress.totalItems) * 100).toFixed(2);
    const elapsedHours = ((Date.now() - this.startTime) / (1000 * 60 * 60)).toFixed(1);
    
    console.log(`\n📊 Progress Report:`);
    console.log(`   🔄 ${this.progress.processedItems.toLocaleString()}/${this.progress.totalItems.toLocaleString()} (${percentage}%)`);
    console.log(`   ✅ Success: ${this.progress.successfulInserts.toLocaleString()}`);
    console.log(`   ❌ Errors: ${this.progress.errors.length.toLocaleString()}`);
    console.log(`   ⏭️  Skipped: ${this.progress.skippedDuplicates.toLocaleString()}`);
    console.log(`   ⏱️  Time elapsed: ${elapsedHours}h`);
    
    if (this.progress.estimatedCompletion) {
      const eta = new Date(this.progress.estimatedCompletion);
      console.log(`   🎯 ETA: ${eta.toLocaleDateString()} ${eta.toLocaleTimeString()}`);
    }
    console.log(`\n`);
  }

  // Delay helper
  async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Main seeding process
  async run(): Promise<void> {
    try {
      console.log('🚀 Starting USDA bulk seeding process...');
      
      await this.loadProgress();
      
      // Ensure pageSize is set
      if (!this.progress.pageSize) {
        this.progress.pageSize = PAGE_SIZE;
      }
      
      // Calculate starting page
      const totalPages = Math.ceil(this.progress.totalItems / this.progress.pageSize);
      console.log(`📄 Total pages to process: ${totalPages.toLocaleString()}`);
      
      // Resume from where we left off
      for (let page = this.progress.currentPage; page <= totalPages; page++) {
        try {
          console.log(`\n🔄 Processing page ${page}/${totalPages}...`);
          
          // Get foods for this page
          const foods = await this.getUSDAFoodsPage(page);
          
          if (foods.length === 0) {
            console.log('⚠️  No more foods found, stopping...');
            break;
          }

          // Process in smaller batches
          for (let i = 0; i < foods.length; i += BATCH_SIZE) {
            const batch = foods.slice(i, i + BATCH_SIZE);
            await this.processBatch(batch);
          }

          // Update current page
          this.progress.currentPage = page + 1;
          await this.saveProgress();

        } catch (error) {
          console.error(`❌ Error processing page ${page}:`, error);
          this.progress.errors.push(`Error processing page ${page}: ${(error as Error).message || 'Unknown error'}`);
          
          // Continue to next page on error
          this.progress.currentPage = page + 1;
          await this.saveProgress();
        }
      }

      console.log('\n🎉 USDA bulk seeding completed!');
      this.printProgress();

    } catch (error) {
      console.error('❌ Fatal error in seeding process:', error);
      await this.saveProgress();
      throw error;
    }
  }

  // Resume from saved progress
  async resume(): Promise<void> {
    console.log('🔄 Resuming USDA bulk seeding from saved progress...');
    await this.run();
  }

  // Get status without running
  async getStatus(): Promise<SeedingProgress> {
    await this.loadProgress();
    return this.progress;
  }

  // Make API request with intelligent rate limiting and retry logic
  async makeAPIRequest(url: string, params: any = {}): Promise<any> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Add a small delay between ALL requests to be conservative
        await this.delay(DELAY_BETWEEN_REQUESTS);
        
        const response = await axios.get(url, {
          params: { ...params, api_key: USDA_API_KEY },
          timeout: 30000
        });
        
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 429) {
          // Rate limited - get detailed information
          const retryAfter = error.response.headers['retry-after'];
          const remaining = error.response.headers['x-ratelimit-remaining'];
          const limit = error.response.headers['x-ratelimit-limit'];
          
          const retryDelaySeconds = retryAfter ? parseInt(retryAfter) : 3600; // Default 1 hour
          const retryDelayMs = retryDelaySeconds * 1000;
          
          console.log(`\n🚫 Rate Limited!`);
          console.log(`   Limit: ${limit || 'unknown'} requests per period`);
          console.log(`   Remaining: ${remaining || '0'} requests`);
          console.log(`   Retry after: ${retryDelaySeconds} seconds (${Math.round(retryDelaySeconds/3600)} hours)`);
          
          if (retryDelayMs > MAX_RETRY_DELAY) {
            console.log(`\n⏰ Rate limit retry delay too long (${Math.round(retryDelaySeconds/3600)} hours).`);
            console.log(`💡 Recommendations:`);
            console.log(`   • Get a proper API key from USDA (much higher limits)`);
            console.log(`   • Resume later with: npm run seed-usda:resume`);
            console.log(`   • Current progress is automatically saved`);
            throw new Error(`Rate limited for ${Math.round(retryDelaySeconds/3600)} hours`);
          }
          
          console.log(`⏰ Waiting ${Math.round(retryDelaySeconds/60)} minutes before retry...`);
          console.log(`💾 Progress will be saved. You can safely interrupt (Ctrl+C) and resume later.`);
          await this.delay(retryDelayMs);
          retryCount++;
          continue;
        }
        
        // Handle other errors
        if (error.response?.status === 403) {
          console.log(`\n🔑 Authentication Error:`);
          console.log(`   Your API key may be invalid or expired`);
          console.log(`   Check your USDA_API_KEY in .env file`);
          throw new Error('Invalid API key');
        }
        
        if (retryCount < maxRetries - 1) {
          console.log(`⚠️ Request failed (${error.response?.status || 'network error'}), retrying in 30 seconds... (${retryCount + 1}/${maxRetries})`);
          await this.delay(30000);
          retryCount++;
        } else {
          console.error(`❌ Request failed after ${maxRetries} attempts:`, error.message);
          throw error;
        }
      }
    }
    
    throw new Error('Max retries exceeded');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  const seeder = new USDABulkSeeder();
  
  switch (command) {
    case 'run':
      await seeder.run();
      break;
      
    case 'resume':
      await seeder.resume();
      break;
      
    case 'status':
      const status = await seeder.getStatus();
      console.log('📊 Current Status:');
      console.log(JSON.stringify(status, null, 2));
      break;
      
    default:
      console.log('Usage: npm run seed-usda [run|resume|status]');
      console.log('  run    - Start fresh seeding process');
      console.log('  resume - Resume from saved progress');
      console.log('  status - Check current progress');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { USDABulkSeeder }; 