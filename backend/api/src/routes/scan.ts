import { Router, Request, Response } from 'express';
import { supabase } from '../index';
import { authenticateUser } from '../middleware/auth';
import express from 'express';
import sharp from 'sharp';
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { validateScanInput } from '../middleware/validation';
import { logger } from '../utils/logger';

// Test CI/CD pipeline deployment
// Testing CI/CD pipeline second time
const router = Router();

// Interface for detected ingredients
interface DetectedIngredient {
  name: string;
  variety: string;
  quantity: string;
  unit: string;
  confidence: number;
  category: string;
}

// Lazy-load OpenAI client to avoid initialization errors
let openai: OpenAI | null = null;

const getOpenAIClient = (): OpenAI => {
  if (!openai) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is not set');
    }
    openai = new OpenAI({
      apiKey: apiKey,
    });
  }
  return openai;
};

// Replace multer with express.raw() for file handling
const upload = express.raw({
  type: ['image/jpeg', 'image/png', 'image/webp'],
  limit: '10mb'
});

// Real ingredient detection using OpenAI Vision
async function detectIngredients(imageBuffer: Buffer): Promise<DetectedIngredient[]> {
  try {
    console.log('🔍 Starting OpenAI Vision analysis...');
    console.log('🔑 OpenAI API Key present', { hasKey: !!process.env.OPENAI_API_KEY });
    console.log('🔑 OpenAI API Key preview', { keyPreview: process.env.OPENAI_API_KEY?.substring(0, 15) + '...' });
    
    // Check if OpenAI API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured - cannot perform ingredient detection');
    }
    
    console.log('🖼️ Image buffer size:', imageBuffer.length, 'bytes');
    
    // Convert image buffer to base64
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;
    
    console.log('📤 Sending request to OpenAI...');
    
    const response = await getOpenAIClient().chat.completions.create({
      model: 'gpt-4o-mini', // Using the cost-effective model
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image and identify all visible food ingredients with maximum specificity and estimated quantities. Return a JSON array with the format:
[{"name": "specific_ingredient_name", "variety": "type/brand/cut", "quantity": "estimated_amount", "unit": "cups|tbsp|tsp|oz|lbs|pieces|slices|whole", "confidence": 0.95, "category": "vegetable|fruit|protein|dairy|grain|herb|spice|oil|condiment|other"}]

SPECIFICITY REQUIREMENTS:
- Cheese: Identify type (cheddar, mozzarella, parmesan, goat cheese, etc.)
- Meat: Specify cut and type (chicken breast, ground beef, salmon fillet, etc.)
- Vegetables: Be specific (red onion, roma tomato, baby spinach, etc.)
- Fruits: Include variety when visible (granny smith apple, naval orange, etc.)
- Herbs/Spices: Identify specific types (fresh basil, dried oregano, etc.)

QUANTITY ESTIMATION:
- Use cooking measurements (cups, tablespoons, ounces, pieces)
- Estimate based on visual size relative to common objects
- For whole items, count pieces (2 tomatoes, 1 avocado, etc.)
- For chopped/prepared items, estimate volume (1/2 cup diced onion)

RULES:
- Only identify actual food ingredients (not utensils, plates, or surfaces)  
- Be as specific as possible with ingredient names and varieties
- Provide realistic quantity estimates for cooking
- Confidence should reflect both identification AND quantity accuracy (0.5-0.99)
- Include maximum 10 ingredients to focus on main components
- Prioritize ingredients that would be used in recipes`
            },
            {
              type: 'image_url',
              image_url: {
                'url': dataUrl
              }
            }
          ]
        }
      ],
      max_tokens: 500, // Increased for more detailed responses
      temperature: 0.2, // Lower temperature for more consistent, specific results
    });

    console.log('📥 OpenAI response received');
    const analysisResult = response.choices[0]?.message?.content;
    
    if (!analysisResult) {
      throw new Error('No analysis result from OpenAI - empty response');
    }

    console.log('Raw OpenAI response', { response: analysisResult });

    // Parse the JSON response
    let detectedIngredients: DetectedIngredient[] = [];
    try {
      // First try direct JSON parsing
      const parsed = JSON.parse(analysisResult) as unknown[];
      detectedIngredients = parsed.map(item => {
        const ingredient = item as Record<string, unknown>;
        return {
          name: String(ingredient.name || ''),
          variety: String(ingredient.variety || ''),
          quantity: String(ingredient.quantity || ''),
          unit: String(ingredient.unit || ''),
          confidence: Number(ingredient.confidence || 0.8),
          category: String(ingredient.category || 'other')
        };
      });
    } catch {
      console.log('🔄 Trying intelligent text extraction...');
      
      // Smarter fallback: try to extract JSON from markdown or find ingredient patterns
      let cleanedResult = analysisResult;
      
      // Remove markdown code blocks if present
      if (cleanedResult.includes('```json')) {
        const jsonMatch = cleanedResult.match(/```json\s*(\[.*?\])\s*```/s);
        if (jsonMatch && jsonMatch[1]) {
          cleanedResult = jsonMatch[1];
        }
      } else if (cleanedResult.includes('```')) {
        const codeMatch = cleanedResult.match(/```\s*(\[.*?\])\s*```/s);
        if (codeMatch && codeMatch[1]) {
          cleanedResult = codeMatch[1];
        }
      }
      
      // Try parsing the cleaned result
      try {
        const parsed = JSON.parse(cleanedResult) as unknown[];
        detectedIngredients = parsed.map(item => {
          const ingredient = item as Record<string, unknown>;
          return {
            name: String(ingredient.name || ''),
            variety: String(ingredient.variety || ''),
            quantity: String(ingredient.quantity || ''),
            unit: String(ingredient.unit || ''),
            confidence: Number(ingredient.confidence || 0.8),
            category: String(ingredient.category || 'other')
          };
        });
        console.log('✅ Successfully parsed cleaned JSON');
      } catch {
        console.log('🔄 Trying intelligent text extraction...');
        
        // Look for ingredient patterns in the text
        const lines = analysisResult.split('\n').filter(line => line.trim());
        
        detectedIngredients = [];
        
        for (const line of lines) {
          // Try patterns for the new detailed format
          let match = line.match(/name[":]\s*"([^"]+)".*variety[":]\s*"([^"]*)".*quantity[":]\s*"([^"]*)".*unit[":]\s*"([^"]*)".*confidence[":]\s*([0-9.]+).*category[":]\s*"([^"]+)"/i);
          if (match && match[1] && match[5] && match[6]) {
            detectedIngredients.push({
              name: match[1].toLowerCase().trim(),
              variety: match[2] || '',
              quantity: match[3] || '',
              unit: match[4] || '',
              confidence: parseFloat(match[5]),
              category: match[6].toLowerCase()
            });
            continue;
          }
          
          // Try basic pattern with name, confidence, category
          match = line.match(/name[":]\s*"([^"]+)".*confidence[":]\s*([0-9.]+).*category[":]\s*"([^"]+)"/i);
          if (match && match[1] && match[2] && match[3]) {
            detectedIngredients.push({
              name: match[1].toLowerCase().trim(),
              variety: '',
              quantity: '',
              unit: '',
              confidence: parseFloat(match[2]),
              category: match[3].toLowerCase()
            });
            continue;
          }
          
          // Look for simple ingredient names
          match = line.match(/"([a-zA-Z][a-zA-Z\s]{2,20})"/);
          if (match && match[1] && !match[1].includes('name') && !match[1].includes('confidence')) {
            detectedIngredients.push({
              name: match[1].toLowerCase().trim(),
              variety: '',
              quantity: '',
              unit: '',
              confidence: 0.8,
              category: 'other'
            });
          }
        }
        
        // If we still don't have anything, create from obvious food words
        if (detectedIngredients.length === 0) {
          const foodWords = analysisResult.match(/\b(tomato|potato|onion|garlic|carrot|pepper|chicken|beef|fish|salmon|cheese|bread|rice|pasta|apple|banana|orange|lettuce|spinach|broccoli|mushroom|egg|milk|flour|oil|salt|sugar|lemon|lime|avocado|cucumber|corn|bean|pea|herb|spice|pancake|syrup|mint|basil|oregano|cheddar|mozzarella|parmesan)\b/gi);
          if (foodWords) {
            const uniqueWords = [...new Set(foodWords.map(w => w.toLowerCase()))];
            detectedIngredients = uniqueWords.slice(0, 6).map((word, index) => ({
              name: word,
              variety: '',
              quantity: '',
              unit: '',
              confidence: 0.8 - (index * 0.05),
              category: 'other'
            }));
          }
        }
        
        // If we still have nothing, throw an error
        if (detectedIngredients.length === 0) {
          throw new Error('Could not extract any ingredients from OpenAI response. Raw response: ' + analysisResult.substring(0, 200));
        }
      }
    }

    // Validate and clean the results
    const validIngredients = detectedIngredients
      .filter(ing => ing.name && typeof ing.name === 'string' && ing.name.length > 2)
      .slice(0, 10) // Increased limit to 10 ingredients for more detailed analysis
      .map(ing => ({
        name: ing.name.toLowerCase().trim(),
        variety: ing.variety ? ing.variety.trim() : '',
        quantity: ing.quantity ? ing.quantity.trim() : '',
        unit: ing.unit ? ing.unit.toLowerCase().trim() : '',
        confidence: Math.max(0.5, Math.min(0.99, ing.confidence || 0.8)),
        category: ing.category || 'other'
      }));

    if (validIngredients.length === 0) {
      throw new Error('No valid ingredients detected in the image');
    }

    console.log(`✅ Detected ${validIngredients.length} ingredients:`, validIngredients);
    
    return validIngredients;
    
  } catch (error) {
    console.error('❌ OpenAI Vision analysis error:', error);
    
    // Re-throw the error instead of falling back to mock data
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// TEST ENDPOINT: Test OpenAI Vision with your downloaded image (DEVELOPMENT ONLY)
// Remove this endpoint in production or protect it properly
if (process.env.NODE_ENV === 'development') {
  router.get('/test-vision', async (req: Request, res: Response) => {
    try {
      console.log('🧪 Testing OpenAI Vision with downloaded image...');
      
      // Path to your downloaded image
      const imagePath = path.join(process.cwd(), '..', '..', 'Public', '225832837.jpg');
      
      console.log('📁 Looking for image at:', imagePath);
      
      // Check if file exists
      if (!fs.existsSync(imagePath)) {
        return res.status(404).json({ 
          error: 'Test image not found',
          suggestion: 'Make sure test image is in the Public folder'
        });
      }
      
      // Read the image file
      const imageBuffer = fs.readFileSync(imagePath);
      console.log('📷 Loaded image:', imageBuffer.length, 'bytes');
      
      // Process the image through our vision detection
      const startTime = Date.now();
      let detectedIngredients: DetectedIngredient[];
      
      try {
        detectedIngredients = await detectIngredients(imageBuffer);
        const processingTime = Date.now() - startTime;
        
        console.log('✅ Vision analysis completed in', processingTime, 'ms');
        
        res.json({
          success: true,
          image_size_bytes: imageBuffer.length,
          processing_time_ms: processingTime,
          ingredients_detected: detectedIngredients.length,
          ingredients: detectedIngredients,
          message: 'OpenAI Vision test completed successfully!'
        });
        
      } catch (visionError) {
        console.error('❌ Vision analysis failed:', visionError);
        
        res.status(422).json({
          success: false,
          error: 'Vision analysis failed',
          details: visionError instanceof Error ? visionError.message : 'Unknown error',
          processing_time_ms: Date.now() - startTime
        });
      }
      
    } catch (error) {
      console.error('❌ Test endpoint error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

// Scan image for ingredients
router.post('/ingredients', authenticateUser, upload, async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Scan ingredient request received');

    // Check if file data exists in request body
    if (!req.body || !Buffer.isBuffer(req.body)) {
      console.log('❌ No file data found in request');
      return res.status(400).json({ 
        error: 'No image file provided',
        details: 'Please provide an image file in the request body'
      });
    }

    console.log(`📷 Processing image, size: ${req.body.length} bytes`);

    // Process the image using sharp
    const processedImage = await sharp(req.body)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Detect ingredients - this will now throw errors instead of returning mock data
    let detectedIngredients: DetectedIngredient[];
    try {
      detectedIngredients = await detectIngredients(processedImage);
    } catch (analysisError) {
      console.error('Image analysis failed:', analysisError);
      return res.status(422).json({ 
        error: 'Failed to analyze image',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown analysis error',
        code: 'ANALYSIS_FAILED'
      });
    }

    // Store scan result
    const { data: scanResult, error: scanError } = await supabase
      .from('ingredient_scans')
      .insert([{
        user_id: (req as any).user.id,
        detected_ingredients: detectedIngredients,
        image_url: null, // Would store actual image URL after uploading to storage
        confidence_score: detectedIngredients.reduce((acc, ing) => acc + ing.confidence, 0) / detectedIngredients.length,
        scan_metadata: {
          image_size: req.body.length,
          processing_time: 1000
        }
      }])
      .select()
      .single();

    if (scanError) {
      console.error('Scan storage error:', scanError);
      return res.status(500).json({ error: 'Failed to store scan result' });
    }

    // Award XP for scanning
    await supabase.rpc('add_user_xp', {
      p_user_id: (req as any).user.id,
      p_xp_amount: 10,
      p_action: 'ingredient_scan',
      p_metadata: { scan_id: scanResult.id, ingredients_count: detectedIngredients.length }
    });

    res.json({
      scan_id: scanResult.id,
      ingredients: detectedIngredients,
      confidence_score: scanResult.confidence_score,
      xp_awarded: 10
    });
  } catch (error) {
    console.error('Scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get scan history
router.get('/history', authenticateUser, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const { limit = 20, offset = 0 } = req.query;

    const { data: scans, error } = await supabase
      .from('ingredient_scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(parseInt(offset as string), parseInt(offset as string) + parseInt(limit as string) - 1);

    if (error) {
      return res.status(500).json({ error: 'Failed to fetch scan history' });
    }

    res.json({ scans: scans || [] });
  } catch (error) {
    console.error('Get scan history error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific scan details
router.get('/:scanId', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;
    const userId = (req as any).user.id;

    const { data: scan, error } = await supabase
      .from('ingredient_scans')
      .select('*')
      .eq('id', scanId)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    res.json({ scan });
  } catch (error) {
    console.error('Get scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update scan ingredients (user corrections)
router.put('/:scanId/ingredients', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { scanId } = req.params;
    const userId = (req as any).user.id;
    const { ingredients } = req.body;

    if (!ingredients || !Array.isArray(ingredients)) {
      return res.status(400).json({ error: 'Valid ingredients array is required' });
    }

    const { data: scan, error: updateError } = await supabase
      .from('ingredient_scans')
      .update({
        detected_ingredients: ingredients,
        updated_at: new Date().toISOString()
      })
      .eq('id', scanId)
      .eq('user_id', userId)
      .select()
      .single();

    if (updateError) {
      return res.status(404).json({ error: 'Scan not found or update failed' });
    }

    res.json({
      scan,
      message: 'Ingredients updated successfully'
    });
  } catch (error) {
    console.error('Update scan error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Also add a new endpoint specifically for mobile app image analysis
router.post('/analyze', authenticateUser, validateScanInput, async (req: express.Request, res: express.Response) => {
  try {
    console.log('🔍 Analyzing image for ingredients...');

    // Check if image data exists in request body
    if (!req.body || !req.body.image_data) {
      console.log('❌ No image data found in request');
      return res.status(400).json({ 
        error: 'No image data provided',
        details: 'Please provide base64 image data in the image_data field'
      });
    }

    // Convert base64 to buffer
    const base64Data = req.body.image_data.includes('base64,') 
      ? req.body.image_data.split('base64,')[1] 
      : req.body.image_data;
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    console.log(`📷 Processing image, size: ${imageBuffer.length} bytes`);

    // Process the image using sharp
    const processedImage = await sharp(imageBuffer)
      .resize(800, 800, { 
        fit: 'inside',
        withoutEnlargement: true 
      })
      .jpeg({ quality: 85 })
      .toBuffer();

    // Analyze the image - this will now throw errors instead of returning mock data
    let detectedIngredients: DetectedIngredient[];
    try {
      detectedIngredients = await detectIngredients(processedImage);
    } catch (analysisError) {
      console.error('Image analysis failed:', analysisError);
      return res.status(422).json({ 
        success: false,
        error: 'Failed to analyze image',
        details: analysisError instanceof Error ? analysisError.message : 'Unknown analysis error',
        code: 'ANALYSIS_FAILED'
      });
    }

    // Store scan result
    const { data: scanResult, error: scanError } = await supabase
      .from('ingredient_scans')
      .insert([{
        user_id: (req as any).user.id,
        detected_ingredients: detectedIngredients,
        image_url: null, // Not storing image for privacy
        confidence_score: detectedIngredients.reduce((acc, ing) => acc + ing.confidence, 0) / detectedIngredients.length,
        scan_metadata: {
          ingredients_count: detectedIngredients.length,
          processing_time: Date.now()
        }
      }])
      .select()
      .single();

    if (scanError) {
      console.error('Scan storage error:', scanError);
      // Continue even if storage fails
    }

    // Award XP for scanning
    try {
      await supabase.rpc('add_user_xp', {
        p_user_id: (req as any).user.id,
        p_xp_amount: 15,
        p_action: 'image_scan_analysis',
        p_metadata: { 
          scan_id: scanResult?.id, 
          ingredients_count: detectedIngredients.length 
        }
      });
    } catch (xpError) {
      console.error('XP award error:', xpError);
    }

    res.json({
      success: true,
      scan_id: scanResult?.id,
      ingredients: detectedIngredients,
      confidence_score: scanResult?.confidence_score || 0.8,
      xp_awarded: 15
    });

  } catch (error) {
    console.error('Image analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to analyze image',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router; 