# Complete USDA Database Seeding Guide

This guide explains how to populate your CookCam ingredients database with the complete USDA Food Data Central database (~600,000+ ingredients).

## 🚀 Quick Start

### 1. Start the Complete Seeding Process

```bash
npm run seed-usda:complete
```

This will begin downloading and processing the entire USDA Food Data Central database, including:
- **Foundation Foods** (~2,000 items) - Core reference foods
- **SR Legacy** (~8,000 items) - Standard Reference Legacy foods  
- **Survey (FNDDS)** (~7,000 items) - Food and Nutrient Database for Dietary Studies
- **Branded Foods** (~600,000 items) - Commercial food products

### 2. Monitor Progress (Optional)

In a separate terminal, run the real-time monitor:

```bash
npm run monitor-usda
```

This provides a live dashboard showing:
- Progress percentage and items processed
- Current processing rate (items/hour)
- Estimated completion time
- Current data type and page being processed
- Recent errors (if any)

### 3. Resume if Interrupted

If the process is interrupted (network issues, server restart, etc.), simply resume:

```bash
npm run seed-usda:complete:resume
```

The script automatically saves progress every 100 items and can resume from exactly where it left off.

## 📊 Monitoring Commands

| Command | Description |
|---------|-------------|
| `npm run monitor-usda` | Real-time monitoring dashboard (updates every 10 seconds) |
| `npm run monitor-usda:quick` | One-time status check |
| `npm run seed-usda:complete:status` | Detailed JSON status output |

## ⚙️ Configuration

The seeding process is optimized for your API key with these settings:

- **Rate Limit**: 3,500 requests/hour (conservative for production API keys)
- **Page Size**: 200 items per request (maximum allowed)
- **Batch Insert**: 50 ingredients per database insert
- **Auto-Save**: Progress saved every 100 processed items
- **Retry Logic**: 3 retries with exponential backoff

## 📈 Expected Performance

Based on your API key limits:

- **Processing Rate**: ~3,000-4,000 items per hour
- **Total Items**: ~617,000 ingredients
- **Estimated Duration**: 150-200 hours (6-8 days)
- **Database Size**: ~2-3 GB for complete dataset

## 🎯 What Gets Processed

For each USDA food item, the script extracts and stores:

### Basic Information
- Name and description
- USDA FDC ID for reference
- Food category mapping
- Data type (Foundation, SR Legacy, Survey, Branded)

### Nutritional Data (per 100g)
- Calories
- Protein (g)
- Carbohydrates (g)
- Total Fat (g)
- Fiber (g)
- Sugar (g)
- Sodium (mg)
- Calcium (mg)
- Iron (mg)
- Vitamin C (mg)

### Enhanced Features
- **Searchable Text**: Optimized for ingredient scanning
- **Dietary Flags**: Automatic detection (vegan, vegetarian, gluten-free, etc.)
- **Tags**: Category-based and brand tags for filtering
- **Scientific Names**: For botanical accuracy

## 🔧 Advanced Usage

### Check Current Status
```bash
npm run seed-usda:complete:status
```

### View Progress File
```bash
cat backend/api/complete-usda-seeding-progress.json
```

### Resume from Specific Point
The progress file tracks:
- Current data type being processed
- Current page within that data type
- Total items processed
- Success/error counts
- Batch buffer state

### Handling Rate Limits
If you hit rate limits:
1. The script automatically waits (up to 2 hours)
2. For longer waits, it stops gracefully
3. Simply resume with: `npm run seed-usda:complete:resume`

## 🛠️ Troubleshooting

### "Rate Limited" Errors
```
🚫 Rate Limited! Waiting X minutes...
```
**Solution**: Wait for the specified time or resume later. Your progress is automatically saved.

### Network/Connection Issues
```
❌ Request failed, retrying in 30 seconds...
```
**Solution**: The script retries automatically. If persistent, check your internet connection.

### Database Errors
```
❌ Batch insert error: ...
```
**Solution**: Check your Supabase connection and ensure the ingredients table exists with proper schema.

### Out of Memory
```
💥 Batch insert exception: ...
```
**Solution**: Restart the process. The batch size is optimized to prevent memory issues.

## 📊 Progress Tracking

The system tracks comprehensive metrics:

```json
{
  "totalItems": 617000,
  "processedItems": 45230,
  "currentPage": 123,
  "currentDataType": "Branded",
  "currentDataTypeIndex": 3,
  "successfulInserts": 44890,
  "errors": [],
  "estimatedCompletion": "2024-01-15T14:30:00.000Z"
}
```

## 🎉 Completion

When seeding completes, you'll see:

```
🎉 Complete USDA database seeding finished!

📊 Progress Report:
   🔄 617,000/617,000 (100.00%)
   ✅ Success: 616,543
   ❌ Errors: 12
   ⏱️  Time elapsed: 156.3h
```

Your database will contain the complete USDA Food Data Central database, optimized for:
- Fast ingredient scanning and recognition
- Accurate nutritional calculations
- Recipe generation with precise nutrition data
- Dietary restriction filtering

## 🔄 Legacy Seeding (Previous Method)

If you need to use the older search-based method:

```bash
npm run seed-usda:legacy
```

This uses the previous implementation that processes via search queries rather than the more efficient list endpoint.

## 📞 Support

If you encounter issues:

1. Check the progress file for errors: `npm run seed-usda:complete:status`
2. Review recent error logs
3. Ensure your USDA API key is valid and active
4. Verify Supabase connection and database schema

The seeding process is designed to be robust and resumable, handling most common issues automatically. 