import swaggerJsdoc from 'swagger-jsdoc';
import { swaggerSpec } from '../swagger';

// Mock dependencies
jest.mock('swagger-jsdoc');
jest.mock('../../../package.json', () => ({
  version: '1.0.0',
}));

const mockSwaggerJsdoc = swaggerJsdoc as jest.MockedFunction<typeof swaggerJsdoc>;

describe('Swagger Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create swagger specification with correct configuration', () => {
    const mockSpec = {
      openapi: '3.0.0',
      info: { title: 'CookCam API', version: '1.0.0' },
      paths: {},
    };

    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    // Import the spec to trigger the function call
    const spec = swaggerSpec;

    expect(mockSwaggerJsdoc).toHaveBeenCalledWith({
      definition: {
        openapi: '3.0.0',
        info: {
          title: 'CookCam API',
          version: '1.0.0',
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
          schemas: expect.objectContaining({
            Error: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                error: expect.objectContaining({ type: 'string' }),
                message: expect.objectContaining({ type: 'string' }),
                code: expect.objectContaining({ type: 'string' }),
                statusCode: expect.objectContaining({ type: 'number' }),
                requestId: expect.objectContaining({ type: 'string' }),
                timestamp: expect.objectContaining({ 
                  type: 'string',
                  format: 'date-time'
                }),
                path: expect.objectContaining({ type: 'string' }),
              }),
            }),
            User: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                id: expect.objectContaining({ 
                  type: 'string',
                  format: 'uuid'
                }),
                email: expect.objectContaining({ 
                  type: 'string',
                  format: 'email'
                }),
                username: expect.objectContaining({ type: 'string' }),
                created_at: expect.objectContaining({ 
                  type: 'string',
                  format: 'date-time'
                }),
                updated_at: expect.objectContaining({ 
                  type: 'string',
                  format: 'date-time'
                }),
              }),
            }),
            Recipe: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                id: expect.objectContaining({ 
                  type: 'string',
                  format: 'uuid'
                }),
                name: expect.objectContaining({ type: 'string' }),
                description: expect.objectContaining({ type: 'string' }),
                ingredients: expect.objectContaining({
                  type: 'array',
                  items: expect.objectContaining({
                    $ref: '#/components/schemas/Ingredient',
                  }),
                }),
                instructions: expect.objectContaining({
                  type: 'array',
                  items: expect.objectContaining({ type: 'string' }),
                }),
                prep_time: expect.objectContaining({ 
                  type: 'integer',
                  description: 'Preparation time in minutes'
                }),
                cook_time: expect.objectContaining({ 
                  type: 'integer',
                  description: 'Cooking time in minutes'
                }),
                servings: expect.objectContaining({ type: 'integer' }),
                difficulty: expect.objectContaining({
                  type: 'string',
                  enum: ['easy', 'medium', 'hard'],
                }),
                created_at: expect.objectContaining({ 
                  type: 'string',
                  format: 'date-time'
                }),
                updated_at: expect.objectContaining({ 
                  type: 'string',
                  format: 'date-time'
                }),
              }),
            }),
            Ingredient: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                id: expect.objectContaining({ 
                  type: 'string',
                  format: 'uuid'
                }),
                name: expect.objectContaining({ type: 'string' }),
                quantity: expect.objectContaining({ type: 'number' }),
                unit: expect.objectContaining({ type: 'string' }),
                nutrition: expect.objectContaining({
                  $ref: '#/components/schemas/Nutrition',
                }),
              }),
            }),
            Nutrition: expect.objectContaining({
              type: 'object',
              properties: expect.objectContaining({
                calories: expect.objectContaining({ type: 'number' }),
                protein: expect.objectContaining({ 
                  type: 'number',
                  description: 'Protein in grams'
                }),
                carbs: expect.objectContaining({ 
                  type: 'number',
                  description: 'Carbohydrates in grams'
                }),
                fat: expect.objectContaining({ 
                  type: 'number',
                  description: 'Fat in grams'
                }),
                fiber: expect.objectContaining({ 
                  type: 'number',
                  description: 'Fiber in grams'
                }),
                sugar: expect.objectContaining({ 
                  type: 'number',
                  description: 'Sugar in grams'
                }),
                sodium: expect.objectContaining({ 
                  type: 'number',
                  description: 'Sodium in milligrams'
                }),
              }),
            }),
          }),
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      },
      apis: ['./src/routes/*.ts', './src/routes/*.js'],
    });

    expect(spec).toBe(mockSpec);
  });

  it('should include correct API info configuration', () => {
    const mockSpec = { info: { title: 'Test', version: '1.0.0' } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.info).toEqual({
      title: 'CookCam API',
      version: '1.0.0',
      description: 'API documentation for CookCam - AI-powered cooking assistant',
      contact: {
        name: 'CookCam Support',
        email: 'support@cookcam.ai',
      },
    });
  });

  it('should include correct server configurations', () => {
    const mockSpec = { servers: [] };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.servers).toEqual([
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.cookcam.ai/api/v1',
        description: 'Production server',
      },
    ]);
  });

  it('should include bearer authentication security scheme', () => {
    const mockSpec = { components: { securitySchemes: {} } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.components.securitySchemes.bearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: 'Enter the token returned from /auth/login',
    });
  });

  it('should include global security requirement', () => {
    const mockSpec = { security: [] };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.security).toEqual([
      {
        bearerAuth: [],
      },
    ]);
  });

  it('should include Error schema with all required properties', () => {
    const mockSpec = { components: { schemas: {} } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    const errorSchema = callArgs.definition.components.schemas.Error;

    expect(errorSchema.type).toBe('object');
    expect(errorSchema.properties.error.type).toBe('string');
    expect(errorSchema.properties.message.type).toBe('string');
    expect(errorSchema.properties.code.type).toBe('string');
    expect(errorSchema.properties.statusCode.type).toBe('number');
    expect(errorSchema.properties.requestId.type).toBe('string');
    expect(errorSchema.properties.timestamp.type).toBe('string');
    expect(errorSchema.properties.timestamp.format).toBe('date-time');
    expect(errorSchema.properties.path.type).toBe('string');
  });

  it('should include User schema with correct properties and formats', () => {
    const mockSpec = { components: { schemas: {} } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    const userSchema = callArgs.definition.components.schemas.User;

    expect(userSchema.type).toBe('object');
    expect(userSchema.properties.id.type).toBe('string');
    expect(userSchema.properties.id.format).toBe('uuid');
    expect(userSchema.properties.email.type).toBe('string');
    expect(userSchema.properties.email.format).toBe('email');
    expect(userSchema.properties.username.type).toBe('string');
    expect(userSchema.properties.created_at.type).toBe('string');
    expect(userSchema.properties.created_at.format).toBe('date-time');
    expect(userSchema.properties.updated_at.type).toBe('string');
    expect(userSchema.properties.updated_at.format).toBe('date-time');
  });

  it('should include Recipe schema with correct structure', () => {
    const mockSpec = { components: { schemas: {} } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    const recipeSchema = callArgs.definition.components.schemas.Recipe;

    expect(recipeSchema.type).toBe('object');
    expect(recipeSchema.properties.id.type).toBe('string');
    expect(recipeSchema.properties.id.format).toBe('uuid');
    expect(recipeSchema.properties.name.type).toBe('string');
    expect(recipeSchema.properties.description.type).toBe('string');
    expect(recipeSchema.properties.ingredients.type).toBe('array');
    expect(recipeSchema.properties.ingredients.items.$ref).toBe('#/components/schemas/Ingredient');
    expect(recipeSchema.properties.instructions.type).toBe('array');
    expect(recipeSchema.properties.instructions.items.type).toBe('string');
    expect(recipeSchema.properties.prep_time.type).toBe('integer');
    expect(recipeSchema.properties.prep_time.description).toBe('Preparation time in minutes');
    expect(recipeSchema.properties.cook_time.type).toBe('integer');
    expect(recipeSchema.properties.cook_time.description).toBe('Cooking time in minutes');
    expect(recipeSchema.properties.servings.type).toBe('integer');
    expect(recipeSchema.properties.difficulty.type).toBe('string');
    expect(recipeSchema.properties.difficulty.enum).toEqual(['easy', 'medium', 'hard']);
  });

  it('should include Ingredient schema with nutrition reference', () => {
    const mockSpec = { components: { schemas: {} } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    const ingredientSchema = callArgs.definition.components.schemas.Ingredient;

    expect(ingredientSchema.type).toBe('object');
    expect(ingredientSchema.properties.id.type).toBe('string');
    expect(ingredientSchema.properties.id.format).toBe('uuid');
    expect(ingredientSchema.properties.name.type).toBe('string');
    expect(ingredientSchema.properties.quantity.type).toBe('number');
    expect(ingredientSchema.properties.unit.type).toBe('string');
    expect(ingredientSchema.properties.nutrition.$ref).toBe('#/components/schemas/Nutrition');
  });

  it('should include Nutrition schema with detailed nutritional properties', () => {
    const mockSpec = { components: { schemas: {} } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    const nutritionSchema = callArgs.definition.components.schemas.Nutrition;

    expect(nutritionSchema.type).toBe('object');
    expect(nutritionSchema.properties.calories.type).toBe('number');
    expect(nutritionSchema.properties.protein.type).toBe('number');
    expect(nutritionSchema.properties.protein.description).toBe('Protein in grams');
    expect(nutritionSchema.properties.carbs.type).toBe('number');
    expect(nutritionSchema.properties.carbs.description).toBe('Carbohydrates in grams');
    expect(nutritionSchema.properties.fat.type).toBe('number');
    expect(nutritionSchema.properties.fat.description).toBe('Fat in grams');
    expect(nutritionSchema.properties.fiber.type).toBe('number');
    expect(nutritionSchema.properties.fiber.description).toBe('Fiber in grams');
    expect(nutritionSchema.properties.sugar.type).toBe('number');
    expect(nutritionSchema.properties.sugar.description).toBe('Sugar in grams');
    expect(nutritionSchema.properties.sodium.type).toBe('number');
    expect(nutritionSchema.properties.sodium.description).toBe('Sodium in milligrams');
  });

  it('should include correct API file paths for documentation generation', () => {
    const mockSpec = { apis: [] };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.apis).toEqual(['./src/routes/*.ts', './src/routes/*.js']);
  });

  it('should export the swagger specification', () => {
    const mockSpec = { 
      openapi: '3.0.0', 
      info: { title: 'CookCam API', version: '1.0.0' },
      paths: {}
    };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    expect(swaggerSpec).toBe(mockSpec);
  });

  it('should use version from package.json', () => {
    const mockSpec = { info: { version: '1.0.0' } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.info.version).toBe('1.0.0');
  });

  it('should have correct OpenAPI version', () => {
    const mockSpec = { openapi: '3.0.0' };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.openapi).toBe('3.0.0');
  });

  it('should include contact information', () => {
    const mockSpec = { info: { contact: {} } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.info.contact).toEqual({
      name: 'CookCam Support',
      email: 'support@cookcam.ai',
    });
  });

  it('should have correct API description', () => {
    const mockSpec = { info: { description: '' } };
    mockSwaggerJsdoc.mockReturnValue(mockSpec);

    swaggerSpec; // Trigger the call

    const callArgs = mockSwaggerJsdoc.mock.calls[0][0];
    expect(callArgs.definition.info.description).toBe('API documentation for CookCam - AI-powered cooking assistant');
  });
});