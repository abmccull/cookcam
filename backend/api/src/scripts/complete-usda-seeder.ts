import { supabase } from '../db/database';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Configuration
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';
const PROGRESS_FILE = path.join(__dirname, '../../complete-usda-seeding-progress.json');

// Rate limiting configuration - Your API key allows higher limits
const REQUESTS_PER_HOUR = USDA_API_KEY === 'DEMO_KEY' ? 25 : 3500; // Conservative rate for production key
const DELAY_BETWEEN_REQUESTS = Math.ceil(3600000 / REQUESTS_PER_HOUR); // milliseconds between requests
const PAGE_SIZE = 200; // Maximum page size for USDA API
const SAVE_PROGRESS_EVERY = 100; // Save progress every N foods
const MAX_RETRY_DELAY = 2 * 60 * 60 * 1000; // 2 hours max wait
const BATCH_INSERT_SIZE = 50; // Number of ingredients to insert in one batch

// USDA Data Types to include (covers all food types)
const DATA_TYPES = ['Foundation', 'SR Legacy', 'Survey (FNDDS)', 'Branded'];

// Types based on USDA API documentation
interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  publicationDate?: string;
  brandOwner?: string;
  gtinUpc?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodCategory?: string;
  scientificName?: string;
  additionalDescriptions?: string;
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
  dataPoints?: number;
  min?: number;
  max?: number;
  median?: number;
}

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

class CompleteUSDASeeder {
  private progress: SeedingProgress;
  private startTime: number;

  constructor() {
    this.progress = {
      totalItems: 0,
      processedItems: 0,
      currentPage: 1,
      currentDataType: DATA_TYPES[0]!,
      currentDataTypeIndex: 0,
      startTime: new Date().toISOString(),
      lastUpdateTime: new Date().toISOString(),
      errors: [],
      successfulInserts: 0,
      skippedDuplicates: 0,
      batchBuffer: []
    };
    this.startTime = Date.now();
  }

  // Load or initialize progress
  async loadProgress(): Promise<void> {
    try {
      const data = await fs.readFile(PROGRESS_FILE, 'utf8');
      this.progress = JSON.parse(data);
      console.log(`📂 Resuming from: ${this.progress.processedItems}/${this.progress.totalItems} items`);
      console.log(`📄 Current: ${this.progress.currentDataType}, Page ${this.progress.currentPage}`);
    } catch {
      console.log('📝 Starting fresh complete USDA seeding process...');
      console.log('🔍 Getting total USDA item count for all data types...');
      
      let totalItems = 0;
      for (const dataType of DATA_TYPES) {
        const count = await this.getDataTypeItemCount(dataType);
        totalItems += count;
        console.log(`   ${dataType}: ${count.toLocaleString()} items`);
      }
      
      this.progress = {
        totalItems,
        processedItems: 0,
        currentPage: 1,
        currentDataType: DATA_TYPES[0]!,
        currentDataTypeIndex: 0,
        startTime: new Date().toISOString(),
        lastUpdateTime: new Date().toISOString(),
        errors: [],
        successfulInserts: 0,
        skippedDuplicates: 0,
        batchBuffer: []
      };
      
      console.log(`📊 Total USDA items found: ${totalItems.toLocaleString()}`);
      await this.saveProgress();
    }
  }

  // Save current progress
  async saveProgress(): Promise<void> {
    this.progress.lastUpdateTime = new Date().toISOString();
    
    // Calculate estimated completion
    if (this.progress.processedItems > 0) {
      const elapsedMs = Date.now() - this.startTime;
      const itemsPerMs = this.progress.processedItems / elapsedMs;
      const remainingItems = this.progress.totalItems - this.progress.processedItems;
      const estimatedRemainingMs = remainingItems / itemsPerMs;
      
      if (isFinite(estimatedRemainingMs) && estimatedRemainingMs > 0) {
        this.progress.estimatedCompletion = new Date(Date.now() + estimatedRemainingMs).toISOString();
      }
    }

    await fs.writeFile(PROGRESS_FILE, JSON.stringify(this.progress, null, 2));
  }

  // Get total count for a specific data type
  async getDataTypeItemCount(dataType: string): Promise<number> {
    try {
      const data = await this.makeAPIRequest(`${USDA_BASE_URL}/foods/list`, {
        dataType: [dataType],
        pageSize: 1
      });
      
      return data.totalPages * PAGE_SIZE || 0;
    } catch (error) {
      console.log(`⚠️ Could not get count for ${dataType}, estimating...`);
      // Fallback estimates based on known USDA data
      const estimates: { [key: string]: number } = {
        'Foundation': 2000,
        'SR Legacy': 8000,
        'Survey (FNDDS)': 7000,
        'Branded': 600000
      };
      return estimates[dataType] || 1000;
    }
  }

  // Get a page of foods using the list endpoint (more efficient than search)
  async getFoodsPage(dataType: string, page: number): Promise<USDAFood[]> {
    try {
      console.log(`📄 Fetching ${dataType} page ${page} (${PAGE_SIZE} items)...`);
      
      const data = await this.makeAPIRequest(`${USDA_BASE_URL}/foods/list`, {
        dataType: [dataType],
        pageNumber: page,
        pageSize: PAGE_SIZE,
        sortBy: 'fdcId',
        sortOrder: 'asc'
      });

      return data.foods || [];
    } catch (error) {
      console.error(`❌ Failed to fetch ${dataType} page ${page}:`, error);
      throw error;
    }
  }

  // Extract nutritional data using correct USDA nutrient IDs
  extractNutritionalData(food: USDAFood): any {
    if (!food.foodNutrients) return {};

    const nutrition: any = {};
    
    food.foodNutrients.forEach(nutrient => {
      const nutrientId = nutrient.nutrient.id;
      const amount = nutrient.amount;

      // Using correct USDA nutrient IDs from the API documentation
      switch (nutrientId) {
        case 208: // Energy (calories)
          nutrition.calories_per_100g = amount;
          break;
        case 203: // Protein
          nutrition.protein_g_per_100g = amount;
          break;
        case 205: // Carbohydrates
          nutrition.carbs_g_per_100g = amount;
          break;
        case 204: // Total fat
          nutrition.fat_g_per_100g = amount;
          break;
        case 291: // Fiber
          nutrition.fiber_g_per_100g = amount;
          break;
        case 269: // Sugars
          nutrition.sugar_g_per_100g = amount;
          break;
        case 307: // Sodium
          nutrition.sodium_mg_per_100g = amount;
          break;
        case 301: // Calcium
          nutrition.calcium_mg_per_100g = amount;
          break;
        case 303: // Iron
          nutrition.iron_mg_per_100g = amount;
          break;
        case 401: // Vitamin C
          nutrition.vitamin_c_mg_per_100g = amount;
          break;
      }
    });

    return nutrition;
  }

  // Map USDA categories to your system
  mapUSDACategory(food: USDAFood): string {
    const dataType = food.dataType;
    
    // First check if there's a specific food category
    if (food.foodCategory) {
      const lowerCategory = food.foodCategory.toLowerCase();
      
      const categoryMap: { [key: string]: string } = {
        'vegetables and vegetable products': 'Vegetables',
        'fruits and fruit juices': 'Fruits',
        'dairy and egg products': 'Dairy',
        'poultry products': 'Meat & Poultry',
        'beef products': 'Meat & Poultry', 
        'pork products': 'Meat & Poultry',
        'lamb, veal, and game products': 'Meat & Poultry',
        'finfish and shellfish products': 'Seafood',
        'legumes and legume products': 'Legumes',
        'nut and seed products': 'Nuts & Seeds',
        'cereal grains and pasta': 'Grains',
        'baked products': 'Baked Goods',
        'fats and oils': 'Oils',
        'spices and herbs': 'Seasonings',
        'beverages': 'Beverages',
        'sweets': 'Desserts',
        'snacks': 'Snacks',
        'soups, sauces, and gravies': 'Condiments',
        'meals, entrees, and side dishes': 'Prepared Foods',
        'fast foods': 'Fast Food'
      };
      
      if (categoryMap[lowerCategory]) {
        return categoryMap[lowerCategory];
      }
      
      return food.foodCategory;
    }

    // Fallback based on data type
    switch (dataType) {
      case 'Foundation': return 'Foundation Foods';
      case 'SR Legacy': return 'Standard Reference';
      case 'Survey (FNDDS)': return 'Survey Foods';
      case 'Branded': return 'Packaged Foods';
      default: return 'Other';
    }
  }

  // Generate dietary flags based on food data
  generateDietaryFlags(food: USDAFood): string[] {
    const flags: string[] = [];
    
    // Basic flags that apply to most whole foods
    if (food.dataType === 'Foundation' || food.dataType === 'SR Legacy') {
      // Foundation and SR Legacy foods are typically whole foods
      if (food.foodCategory?.includes('Vegetables')) {
        flags.push('vegan', 'vegetarian', 'gluten-free');
      } else if (food.foodCategory?.includes('Fruits')) {
        flags.push('vegan', 'vegetarian', 'gluten-free');
      } else if (food.foodCategory?.includes('Legumes')) {
        flags.push('vegan', 'vegetarian', 'high-protein');
      } else if (food.foodCategory?.includes('Nuts')) {
        flags.push('vegan', 'vegetarian', 'high-fat');
      }
    }
    
    // Check ingredients for common dietary restrictions (for branded foods)
    if (food.ingredients) {
      const ingredients = food.ingredients.toLowerCase();
      
      if (ingredients.includes('milk') || ingredients.includes('dairy') || 
          ingredients.includes('cheese') || ingredients.includes('cream')) {
        flags.push('contains-dairy');
      }
      
      if (ingredients.includes('wheat') || ingredients.includes('gluten')) {
        flags.push('contains-gluten');
      }
      
      if (ingredients.includes('soy')) {
        flags.push('contains-soy');
      }
      
      if (ingredients.includes('egg')) {
        flags.push('contains-eggs');
      }
    }
    
    return flags;
  }

  // Generate searchable tags
  generateTags(food: USDAFood): string[] {
    const tags: string[] = [];
    
    // Add data type as tag
    tags.push(food.dataType.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    
    // Add category-based tags
    if (food.foodCategory) {
      tags.push(food.foodCategory.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
    
    // Add brand for branded foods
    if (food.brandOwner) {
      tags.push('branded', food.brandOwner.toLowerCase().replace(/[^a-z0-9]/g, '-'));
    }
    
    // Add scientific name components if available
    if (food.scientificName) {
      const scientificParts = food.scientificName.toLowerCase().split(' ');
      tags.push(...scientificParts);
    }
    
    return tags.slice(0, 10); // Limit to prevent overly long arrays
  }

  // Prepare ingredient data for database insertion
  prepareIngredientData(food: USDAFood): any {
    const nutritionData = this.extractNutritionalData(food);
    const category = this.mapUSDACategory(food);
    const dietaryFlags = this.generateDietaryFlags(food);
    const tags = this.generateTags(food);
    
    // Truncate description if too long
    const name = food.description.length > 500 ? 
      food.description.substring(0, 497) + '...' : 
      food.description;
    
    // Create searchable text
    const searchableText = [
      name,
      category,
      food.brandOwner || '',
      food.scientificName || '',
      food.additionalDescriptions || '',
      tags.join(' ')
    ].join(' ').toLowerCase();

    return {
      name,
      fdc_id: food.fdcId,
      category,
      searchable_text: searchableText,
      tags: JSON.stringify(tags),
      dietary_flags: JSON.stringify(dietaryFlags),
      usda_data_type: food.dataType,
      usda_sync_date: new Date().toISOString(),
      ...nutritionData
    };
  }

  // Batch insert ingredients for better performance
  async batchInsertIngredients(ingredientsData: any[]): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('ingredients')
        .upsert(ingredientsData, { 
          onConflict: 'fdc_id',
          ignoreDuplicates: false
        })
        .select('id');

      if (error) {
        console.error('❌ Batch insert error:', error.message);
        return 0;
      }

      return data?.length || 0;
    } catch (error: any) {
      console.error('💥 Batch insert exception:', error.message);
      return 0;
    }
  }

  // Process a batch of foods
  async processBatch(foods: USDAFood[]): Promise<void> {
    console.log(`📦 Processing batch of ${foods.length} foods...`);
    
    const ingredientsToInsert: any[] = [];
    
    for (const food of foods) {
      try {
        // Prepare ingredient data
        const ingredientData = this.prepareIngredientData(food);
        ingredientsToInsert.push(ingredientData);
        
        this.progress.processedItems++;
        
        // Add to batch buffer
        this.progress.batchBuffer.push(ingredientData);
        
        // Insert when batch is full
        if (this.progress.batchBuffer.length >= BATCH_INSERT_SIZE) {
          const inserted = await this.batchInsertIngredients(this.progress.batchBuffer);
          this.progress.successfulInserts += inserted;
          this.progress.batchBuffer = [];
          
          console.log(`✅ Batch inserted ${inserted} ingredients`);
        }
        
        // Save progress periodically
        if (this.progress.processedItems % SAVE_PROGRESS_EVERY === 0) {
          await this.saveProgress();
          this.printProgress();
        }

      } catch (error) {
        this.progress.errors.push(`Error processing ${food.description}: ${(error as Error).message}`);
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
    console.log(`   📂 Current: ${this.progress.currentDataType}`);
    console.log(`   📄 Page: ${this.progress.currentPage}`);
    console.log(`   ✅ Success: ${this.progress.successfulInserts.toLocaleString()}`);
    console.log(`   ❌ Errors: ${this.progress.errors.length.toLocaleString()}`);
    console.log(`   ⏱️  Time elapsed: ${elapsedHours}h`);
    console.log(`   🔢 Buffer: ${this.progress.batchBuffer.length} items`);
    
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
      console.log('🚀 Starting complete USDA database seeding...');
      console.log(`🔑 Using API key: ${USDA_API_KEY.substring(0, 8)}...`);
      console.log(`⚡ Rate limit: ${REQUESTS_PER_HOUR} requests/hour`);
      
      await this.loadProgress();
      
      // Process each data type
      for (let typeIndex = this.progress.currentDataTypeIndex; typeIndex < DATA_TYPES.length; typeIndex++) {
        const dataType = DATA_TYPES[typeIndex]!;
        this.progress.currentDataType = dataType;
        this.progress.currentDataTypeIndex = typeIndex;
        
        console.log(`\n🎯 Processing ${dataType} foods...`);
        
        // Get total pages for this data type
        const sampleData = await this.makeAPIRequest(`${USDA_BASE_URL}/foods/list`, {
          dataType: [dataType],
          pageSize: 1
        });
        
        const totalPages = sampleData.totalPages || 1;
        console.log(`📄 Total pages for ${dataType}: ${totalPages.toLocaleString()}`);
        
        // Process pages for this data type
        const startPage = typeIndex === this.progress.currentDataTypeIndex ? this.progress.currentPage : 1;
        
        for (let page = startPage; page <= totalPages; page++) {
          try {
            this.progress.currentPage = page;
            
            // Get foods for this page
            const foods = await this.getFoodsPage(dataType, page);
            
            if (foods.length === 0) {
              console.log(`⚠️ No more foods found for ${dataType}, moving to next type...`);
              break;
            }

            // Process this page
            await this.processBatch(foods);
            await this.saveProgress();

          } catch (error) {
            console.error(`❌ Error processing ${dataType} page ${page}:`, error);
            this.progress.errors.push(`Error processing ${dataType} page ${page}: ${(error as Error).message}`);
            await this.saveProgress();
          }
        }
        
        // Reset page for next data type
        this.progress.currentPage = 1;
      }

      // Insert any remaining items in buffer
      if (this.progress.batchBuffer.length > 0) {
        const inserted = await this.batchInsertIngredients(this.progress.batchBuffer);
        this.progress.successfulInserts += inserted;
        this.progress.batchBuffer = [];
        console.log(`✅ Final batch inserted ${inserted} ingredients`);
      }

      console.log('\n🎉 Complete USDA database seeding finished!');
      this.printProgress();

    } catch (error) {
      console.error('❌ Fatal error in seeding process:', error);
      await this.saveProgress();
      throw error;
    }
  }

  // Make API request with intelligent rate limiting and retry logic
  async makeAPIRequest(url: string, params: any = {}): Promise<any> {
    const maxRetries = 3;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        // Add delay between requests to respect rate limits
        await this.delay(DELAY_BETWEEN_REQUESTS);
        
        const response = await axios.get(url, {
          params: { ...params, api_key: USDA_API_KEY },
          timeout: 30000
        });
        
        return response.data;
      } catch (error: any) {
        if (error.response?.status === 429) {
          // Rate limited
          const retryAfter = error.response.headers['retry-after'];
          const retryDelaySeconds = retryAfter ? parseInt(retryAfter) : 3600;
          const retryDelayMs = retryDelaySeconds * 1000;
          
          console.log(`\n🚫 Rate Limited! Waiting ${Math.round(retryDelaySeconds/60)} minutes...`);
          
          if (retryDelayMs > MAX_RETRY_DELAY) {
            console.log(`⏰ Rate limit too long, stopping. Resume with: npm run seed-usda:complete:resume`);
            throw new Error(`Rate limited for ${Math.round(retryDelaySeconds/3600)} hours`);
          }
          
          await this.delay(retryDelayMs);
          retryCount++;
          continue;
        }
        
        if (retryCount < maxRetries - 1) {
          console.log(`⚠️ Request failed, retrying in 30 seconds... (${retryCount + 1}/${maxRetries})`);
          await this.delay(30000);
          retryCount++;
        } else {
          throw error;
        }
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  // Resume from saved progress
  async resume(): Promise<void> {
    console.log('🔄 Resuming complete USDA seeding from saved progress...');
    await this.run();
  }

  // Get status without running
  async getStatus(): Promise<SeedingProgress> {
    await this.loadProgress();
    return this.progress;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'run';
  
  const seeder = new CompleteUSDASeeder();
  
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
      console.log('Usage: npm run seed-usda:complete [run|resume|status]');
      console.log('  run    - Start fresh complete seeding process');
      console.log('  resume - Resume from saved progress');
      console.log('  status - Check current progress');
      break;
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export { CompleteUSDASeeder }; 