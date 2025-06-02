import { Router, Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { logger } from '../utils/logger';

const router = Router();

// Debug endpoint to check environment variables
router.get('/env', authenticateUser, (req: Request, res: Response) => {
  const envCheck = {
    openai_key_present: !!process.env.OPENAI_API_KEY,
    openai_key_prefix: process.env.OPENAI_API_KEY?.substring(0, 15) + '...',
    usda_key_present: !!process.env.USDA_API_KEY,
    node_env: process.env.NODE_ENV,
    port: process.env.PORT,
  };
  
  logger.info('🐛 Debug - Environment check:', envCheck);
  
  res.json({
    success: true,
    environment: envCheck,
    timestamp: new Date().toISOString()
  });
});

// Test OpenAI connection without image
router.post('/test-openai', authenticateUser, async (req: Request, res: Response) => {
  try {
    logger.info('🧪 Testing OpenAI connection...');
    logger.info('API Key present', { hasKey: !!process.env.OPENAI_API_KEY });
    
    if (!process.env.OPENAI_API_KEY) {
      return res.json({
        success: false,
        error: 'OpenAI API key not found in environment variables',
        key_present: false
      });
    }

    // Import OpenAI here to avoid import issues
    const OpenAI = require('openai');
    
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    logger.info('📤 Making test call to OpenAI...');
    
    // Simple test call
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: 'Say hello in JSON format: {"message": "hello"}'
        }
      ],
      max_tokens: 50,
      temperature: 0.1,
    });

    logger.info('📥 OpenAI test response received');
    
    const result = response.choices[0]?.message?.content;
    
    res.json({
      success: true,
      openai_connected: true,
      response: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('❌ OpenAI test error:', error);
    
    res.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

export default router; 