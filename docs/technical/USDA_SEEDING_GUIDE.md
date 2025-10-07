# USDA Database Seeding System

A systematic program to gradually import all 114,292+ USDA FoodData Central ingredients into your local CookCam database over the course of several weeks.

## 📊 Overview

- **Total USDA Items**: ~114,292 food entries
- **API Rate Limit**: 1,000 requests/hour (using 950 to be safe)
- **Expected Duration**: 3-4 weeks of continuous operation
- **Progress Tracking**: Automatic save/resume functionality
- **Nutrition Data**: Complete mapping of macros, vitamins, and minerals

## 🚀 Quick Start

### 1. Database Setup
Run this SQL in your Supabase SQL Editor:
```bash
# Copy and paste the contents of:
backend/api/src/scripts/add-nutrition-columns.sql
```

### 2. Check Setup
```bash
npm run monitor:setup
```

### 3. Start Seeding
```bash
npm run seed-usda:run
```

### 4. Monitor Progress
```bash
npm run monitor:status
```

## 📋 Commands Reference

### Seeding Commands
```bash
# Start fresh seeding process
npm run seed-usda:run

# Resume from last saved progress  
npm run seed-usda:resume

# Check seeding progress only
npm run seed-usda:status
```

### Monitoring Commands
```bash
# Comprehensive status report
npm run monitor:status

# Show completion time estimates
npm run monitor:estimate

# Show setup instructions
npm run monitor:setup
```

## 🔧 System Features

### Rate Limiting
- Respects USDA API limits (950 requests/hour)
- Automatic delays between requests (3.8 seconds)
- Graceful handling of API errors

### Progress Tracking
- Saves progress every 100 items processed
- Tracks success/error/skip counts
- Estimates completion time
- Resumable from any point

### Data Quality
- Maps 10+ key nutrients per ingredient
- Categorizes foods into logical groups
- Handles duplicate entries via upsert
- Stores both basic and detailed nutrition data

### Error Handling
- Continues processing on individual failures
- Logs errors for debugging
- Skips items that can't be processed
- Maintains overall progress

## 📈 Expected Timeline

### With DEMO_KEY (1,000 requests/hour limit)
- **Items per hour**: ~950
- **Items per day**: ~22,800 (24-hour operation)
- **Total time**: ~5 days continuous
- **Realistic timeline**: 2-3 weeks (8-12 hours/day)

### Progress Milestones
- **Day 1**: ~20,000 items (17.5%)
- **Week 1**: ~100,000 items (87.5%)
- **Week 2**: Complete (~114,292 items)

## 🗃️ Data Structure

### Nutrition Fields Added
```sql
sugar_g_per_100g FLOAT
calcium_mg_per_100g FLOAT  
iron_mg_per_100g FLOAT
vitamin_c_mg_per_100g FLOAT
usda_data_type TEXT
searchable_text TEXT
```

### USDA Categories Mapped
- **Vegetables** (106,759+ items)
- **Meat & Poultry** (21,237+ items)  
- **Fruits, Dairy, Grains** (thousands each)
- **Packaged Foods** (branded items)

## 🔍 Monitoring & Status

### Progress File Location
```
backend/api/seeding-progress.json
```

### Status Reports Include
- Total items processed vs. remaining
- Success/error/skip counts
- Processing rate (items/hour)
- Estimated completion time
- Recent items added
- Category breakdowns

### Example Status Output
```
📊 Progress Report:
   🔄 45,230/114,292 (39.58%)
   ✅ Success: 44,891
   ❌ Errors: 234
   ⏭️  Skipped: 105
   ⏱️  Time elapsed: 47.2h
   🎯 ETA: Mon Jan 15 2024 3:45 PM

[████████████░░░░░░░░░░░░░░░░░░] 39.6%
```

## ⚠️ Important Notes

### API Key Considerations
- **DEMO_KEY**: 1,000 requests/hour limit
- **Registered Key**: Higher limits available
- Set in `.env` file: `USDA_API_KEY=your_key_here`

### Runtime Recommendations
- **Best Practice**: Run 8-12 hours/day during off-peak
- **Acceptable**: 24/7 continuous operation
- **Monitor**: Check for API errors daily

### Safety Features
- **Graceful Interruption**: Ctrl+C saves progress
- **Automatic Resume**: Restarts from last saved position
- **Duplicate Protection**: Upsert prevents data duplication
- **Error Recovery**: Continues processing despite individual failures

## 🛠️ Troubleshooting

### Common Issues

#### "Missing nutrition columns" Error
```bash
# Run the database migration
# Copy/paste: backend/api/src/scripts/add-nutrition-columns.sql
```

#### API Rate Limit Errors
```bash
# Check if using correct API key
# Ensure proper delays between requests
# Consider running during off-peak hours
```

#### Process Interruption
```bash
# Simply resume with:
npm run seed-usda:resume
```

#### Database Connection Issues
```bash
# Check Supabase connection
# Verify environment variables
# Test with: npm run monitor:status
```

### Debugging Commands
```bash
# Check database setup
npm run monitor:status

# View detailed progress
cat backend/api/seeding-progress.json

# Test single ingredient sync
curl -X POST http://localhost:3000/api/ingredients/1/sync-usda
```

## 📊 Post-Completion Benefits

### For Users
- **Comprehensive Search**: 114K+ ingredients available
- **Complete Nutrition**: Macros, vitamins, minerals
- **No API Delays**: All data stored locally
- **Better Categorization**: Organized food groups

### For Developers  
- **No External Dependencies**: Fully self-contained
- **Fast Queries**: Local database performance
- **Rich Nutrition Data**: 10+ nutrients per ingredient
- **Scalable**: Ready for production load

### For Recipe Analysis
- **Accurate Calculations**: USDA-verified nutrition data
- **Detailed Breakdowns**: Per-serving and per-100g values
- **Professional Quality**: Government-standard nutrition database

## 🎯 Success Metrics

When seeding is complete, you should have:
- ✅ ~114,292 ingredients in your database
- ✅ Complete nutrition profiles for all items
- ✅ Categorized and searchable food database
- ✅ Zero dependency on external nutrition APIs
- ✅ Sub-second recipe nutrition calculations

---

## 🤝 Need Help?

- Check the monitoring status: `npm run monitor:status`
- View setup guide: `npm run monitor:setup`  
- Check progress estimates: `npm run monitor:estimate`
- Resume interrupted process: `npm run seed-usda:resume`

The seeding system is designed to be robust and self-managing. Once started, it will systematically work through the entire USDA database, creating a comprehensive local nutrition database for your CookCam application. 