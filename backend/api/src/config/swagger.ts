import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CookCam API',
      version,
      description: 'API documentation for CookCam - AI-powered cooking assistant',
      contact: {
        name: 'CookCam Support',
        email: 'support@cookcam.ai',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.cookcam.ai/api/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'Enter the token returned from /auth/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'string',
              description: 'Error code',
            },
            message: {
              type: 'string',
              description: 'Error message',
            },
            code: {
              type: 'string',
              description: 'Error code constant',
            },
            statusCode: {
              type: 'number',
              description: 'HTTP status code',
            },
            requestId: {
              type: 'string',
              description: 'Request ID for tracking',
            },
            timestamp: {
              type: 'string',
              format: 'date-time',
              description: 'Error timestamp',
            },
            path: {
              type: 'string',
              description: 'Request path',
            },
          },
        },
        User: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            email: {
              type: 'string',
              format: 'email',
            },
            username: {
              type: 'string',
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Recipe: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            description: {
              type: 'string',
            },
            ingredients: {
              type: 'array',
              items: {
                $ref: '#/components/schemas/Ingredient',
              },
            },
            instructions: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
            prep_time: {
              type: 'integer',
              description: 'Preparation time in minutes',
            },
            cook_time: {
              type: 'integer',
              description: 'Cooking time in minutes',
            },
            servings: {
              type: 'integer',
            },
            difficulty: {
              type: 'string',
              enum: ['easy', 'medium', 'hard'],
            },
            created_at: {
              type: 'string',
              format: 'date-time',
            },
            updated_at: {
              type: 'string',
              format: 'date-time',
            },
          },
        },
        Ingredient: {
          type: 'object',
          properties: {
            id: {
              type: 'string',
              format: 'uuid',
            },
            name: {
              type: 'string',
            },
            quantity: {
              type: 'number',
            },
            unit: {
              type: 'string',
            },
            nutrition: {
              $ref: '#/components/schemas/Nutrition',
            },
          },
        },
        Nutrition: {
          type: 'object',
          properties: {
            calories: {
              type: 'number',
            },
            protein: {
              type: 'number',
              description: 'Protein in grams',
            },
            carbs: {
              type: 'number',
              description: 'Carbohydrates in grams',
            },
            fat: {
              type: 'number',
              description: 'Fat in grams',
            },
            fiber: {
              type: 'number',
              description: 'Fiber in grams',
            },
            sugar: {
              type: 'number',
              description: 'Sugar in grams',
            },
            sodium: {
              type: 'number',
              description: 'Sodium in milligrams',
            },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);