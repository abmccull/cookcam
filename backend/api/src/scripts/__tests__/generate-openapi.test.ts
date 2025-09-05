import { jest } from '@jest/globals';

// Mock dependencies
jest.mock('fs');
jest.mock('path');
jest.mock('../../config/swagger');

const mockFs = {
  writeFileSync: jest.fn(),
};

const mockPath = {
  join: jest.fn(),
};

const mockSwaggerSpec = {
  openapi: '3.0.0',
  info: {
    title: 'CookCam API',
    version: '1.0.0',
  },
  paths: {
    '/test': {
      get: {
        summary: 'Test endpoint',
      },
    },
  },
};

// Mock console.log
const originalConsole = console;
beforeEach(() => {
  console.log = jest.fn();
  jest.clearAllMocks();
});

afterEach(() => {
  console.log = originalConsole.log;
});

describe('Generate OpenAPI Script', () => {
  beforeEach(() => {
    jest.doMock('fs', () => mockFs);
    jest.doMock('path', () => mockPath);
    jest.doMock('../config/swagger', () => ({
      swaggerSpec: mockSwaggerSpec,
    }));

    mockPath.join.mockReturnValue('/mock/path/openapi.json');
    jest.resetModules();
  });

  describe('OpenAPI Generation', () => {
    it('should generate OpenAPI specification file successfully', async () => {
      await import('../generate-openapi');

      expect(mockPath.join).toHaveBeenCalledWith(
        expect.any(String),
        '../../openapi.json'
      );

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/path/openapi.json',
        JSON.stringify(mockSwaggerSpec, null, 2)
      );

      expect(console.log).toHaveBeenCalledWith(
        'OpenAPI specification generated at: /mock/path/openapi.json'
      );
    });

    it('should handle complex swagger specification', async () => {
      const complexSwaggerSpec = {
        openapi: '3.0.0',
        info: {
          title: 'CookCam API',
          version: '2.0.0',
          description: 'Advanced recipe and ingredient API',
        },
        servers: [
          {
            url: 'https://api.cookcam.com',
            description: 'Production server',
          },
        ],
        paths: {
          '/recipes': {
            get: {
              summary: 'Get recipes',
              parameters: [
                {
                  name: 'limit',
                  in: 'query',
                  schema: { type: 'integer' },
                },
              ],
              responses: {
                '200': {
                  description: 'Success',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'array',
                        items: {
                          $ref: '#/components/schemas/Recipe',
                        },
                      },
                    },
                  },
                },
              },
            },
            post: {
              summary: 'Create recipe',
              requestBody: {
                required: true,
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/CreateRecipe',
                    },
                  },
                },
              },
            },
          },
          '/ingredients/{id}': {
            get: {
              summary: 'Get ingredient by ID',
              parameters: [
                {
                  name: 'id',
                  in: 'path',
                  required: true,
                  schema: { type: 'string' },
                },
              ],
            },
          },
        },
        components: {
          schemas: {
            Recipe: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                ingredients: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
            CreateRecipe: {
              type: 'object',
              required: ['name', 'ingredients'],
              properties: {
                name: { type: 'string' },
                ingredients: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
        },
        security: [
          {
            bearerAuth: [],
          },
        ],
      };

      jest.doMock('../config/swagger', () => ({
        swaggerSpec: complexSwaggerSpec,
      }));

      await import('../generate-openapi');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/path/openapi.json',
        JSON.stringify(complexSwaggerSpec, null, 2)
      );
    });

    it('should handle swagger spec with nested objects', async () => {
      const nestedSwaggerSpec = {
        openapi: '3.0.0',
        info: {
          title: 'CookCam API',
          version: '1.0.0',
        },
        paths: {
          '/complex-endpoint': {
            post: {
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        metadata: {
                          type: 'object',
                          properties: {
                            tags: {
                              type: 'array',
                              items: {
                                type: 'object',
                                properties: {
                                  name: { type: 'string' },
                                  value: { type: 'string' },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      };

      jest.doMock('../config/swagger', () => ({
        swaggerSpec: nestedSwaggerSpec,
      }));

      await import('../generate-openapi');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        '/mock/path/openapi.json',
        JSON.stringify(nestedSwaggerSpec, null, 2)
      );
    });
  });

  describe('File Operations', () => {
    it('should use correct file path construction', async () => {
      await import('../generate-openapi');

      expect(mockPath.join).toHaveBeenCalledWith(
        expect.stringContaining('scripts'),
        '../../openapi.json'
      );
    });

    it('should format JSON with proper indentation', async () => {
      await import('../generate-openapi');

      const expectedFormattedJson = JSON.stringify(mockSwaggerSpec, null, 2);

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expectedFormattedJson
      );
    });

    it('should handle writeFileSync errors gracefully', async () => {
      mockFs.writeFileSync.mockImplementation(() => {
        throw new Error('Permission denied');
      });

      await expect(async () => {
        await import('../generate-openapi');
      }).rejects.toThrow('Permission denied');
    });

    it('should handle path.join errors', async () => {
      mockPath.join.mockImplementation(() => {
        throw new Error('Path error');
      });

      await expect(async () => {
        await import('../generate-openapi');
      }).rejects.toThrow('Path error');
    });
  });

  describe('Swagger Spec Import', () => {
    it('should handle empty swagger specification', async () => {
      const emptySwaggerSpec = {};

      jest.doMock('../config/swagger', () => ({
        swaggerSpec: emptySwaggerSpec,
      }));

      await import('../generate-openapi');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(emptySwaggerSpec, null, 2)
      );
    });

    it('should handle swagger spec with only basic info', async () => {
      const basicSwaggerSpec = {
        openapi: '3.0.0',
        info: {
          title: 'Basic API',
          version: '1.0.0',
        },
      };

      jest.doMock('../config/swagger', () => ({
        swaggerSpec: basicSwaggerSpec,
      }));

      await import('../generate-openapi');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(basicSwaggerSpec, null, 2)
      );
    });

    it('should handle swagger spec import errors', async () => {
      jest.doMock('../config/swagger', () => {
        throw new Error('Swagger config not found');
      });

      await expect(async () => {
        await import('../generate-openapi');
      }).rejects.toThrow('Swagger config not found');
    });
  });

  describe('Console Output', () => {
    it('should log success message with correct path', async () => {
      mockPath.join.mockReturnValue('/custom/output/path/openapi.json');

      await import('../generate-openapi');

      expect(console.log).toHaveBeenCalledWith(
        'OpenAPI specification generated at: /custom/output/path/openapi.json'
      );
    });

    it('should log message even with different output paths', async () => {
      mockPath.join.mockReturnValue('/different/path/api-spec.json');

      await import('../generate-openapi');

      expect(console.log).toHaveBeenCalledWith(
        'OpenAPI specification generated at: /different/path/api-spec.json'
      );
    });
  });

  describe('JSON Serialization', () => {
    it('should handle circular references gracefully', async () => {
      const circularSpec: any = {
        openapi: '3.0.0',
        info: { title: 'Test', version: '1.0.0' },
      };
      circularSpec.circular = circularSpec;

      jest.doMock('../config/swagger', () => ({
        swaggerSpec: circularSpec,
      }));

      await expect(async () => {
        await import('../generate-openapi');
      }).rejects.toThrow();
    });

    it('should handle special characters in swagger spec', async () => {
      const specialCharSpec = {
        openapi: '3.0.0',
        info: {
          title: 'API with "quotes" and \\backslashes',
          version: '1.0.0',
          description: 'Contains special chars: éñtîtłes & symbols',
        },
      };

      jest.doMock('../config/swagger', () => ({
        swaggerSpec: specialCharSpec,
      }));

      await import('../generate-openapi');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(specialCharSpec, null, 2)
      );
    });

    it('should handle undefined and null values', async () => {
      const specWithNulls = {
        openapi: '3.0.0',
        info: {
          title: 'Test API',
          version: '1.0.0',
          description: null,
          contact: undefined,
        },
        paths: {
          '/test': {
            get: {
              summary: 'Test',
              deprecated: null,
              tags: undefined,
            },
          },
        },
      };

      jest.doMock('../config/swagger', () => ({
        swaggerSpec: specWithNulls,
      }));

      await import('../generate-openapi');

      expect(mockFs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        JSON.stringify(specWithNulls, null, 2)
      );
    });
  });
});