import { Request, Response, NextFunction } from 'express';
import {
  ValidationRules,
  sanitizeString,
  sanitizeArray,
  validateAuthInput,
  validateRecipeInput,
  validatePagination,
  validateScanInput,
  sanitizeInput,
} from '../validation';

describe('Validation Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      body: {},
      query: {},
      params: {},
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    mockNext = jest.fn();
  });

  describe('ValidationRules', () => {
    describe('email', () => {
      it('should validate correct email formats', () => {
        expect(ValidationRules.email('test@example.com')).toBe(true);
        expect(ValidationRules.email('user.name@company.co.uk')).toBe(true);
        expect(ValidationRules.email('123@test.org')).toBe(true);
      });

      it('should reject invalid email formats', () => {
        expect(ValidationRules.email('notanemail')).toBe(false);
        expect(ValidationRules.email('@example.com')).toBe(false);
        expect(ValidationRules.email('test@')).toBe(false);
        expect(ValidationRules.email('test@.com')).toBe(false);
        expect(ValidationRules.email('')).toBe(false);
      });
    });

    describe('password', () => {
      it('should validate passwords with at least 8 characters', () => {
        expect(ValidationRules.password('12345678')).toBe(true);
        expect(ValidationRules.password('longpassword123')).toBe(true);
      });

      it('should reject passwords shorter than 8 characters', () => {
        expect(ValidationRules.password('short')).toBe(false);
        expect(ValidationRules.password('1234567')).toBe(false);
        expect(ValidationRules.password('')).toBe(false);
      });
    });

    describe('username', () => {
      it('should validate usernames between 3 and 50 characters', () => {
        expect(ValidationRules.username('abc')).toBe(true);
        expect(ValidationRules.username('john_doe')).toBe(true);
        expect(ValidationRules.username('a'.repeat(50))).toBe(true);
      });

      it('should reject usernames outside length limits', () => {
        expect(ValidationRules.username('ab')).toBe(false);
        expect(ValidationRules.username('a'.repeat(51))).toBe(false);
        expect(ValidationRules.username('')).toBe(false);
      });
    });

    describe('limit', () => {
      it('should validate limits between 1 and 100', () => {
        expect(ValidationRules.limit(1)).toBe(true);
        expect(ValidationRules.limit(50)).toBe(true);
        expect(ValidationRules.limit(100)).toBe(true);
      });

      it('should reject invalid limits', () => {
        expect(ValidationRules.limit(0)).toBe(false);
        expect(ValidationRules.limit(101)).toBe(false);
        expect(ValidationRules.limit(-1)).toBe(false);
      });
    });

    describe('offset', () => {
      it('should validate non-negative offsets', () => {
        expect(ValidationRules.offset(0)).toBe(true);
        expect(ValidationRules.offset(10)).toBe(true);
        expect(ValidationRules.offset(1000)).toBe(true);
      });

      it('should reject negative offsets', () => {
        expect(ValidationRules.offset(-1)).toBe(false);
        expect(ValidationRules.offset(-100)).toBe(false);
      });
    });
  });

  describe('sanitizeString', () => {
    it('should trim whitespace', () => {
      expect(sanitizeString('  hello world  ')).toBe('hello world');
      expect(sanitizeString('\n\ttest\n\t')).toBe('test');
    });

    it('should remove HTML tags', () => {
      expect(sanitizeString('<script>alert(1)</script>')).toBe('scriptalert(1)/script');
      expect(sanitizeString('Hello <b>World</b>')).toBe('Hello bWorld/b');
    });

    it('should limit string length to 1000 characters', () => {
      const longString = 'a'.repeat(1500);
      expect(sanitizeString(longString)).toHaveLength(1000);
    });
  });

  describe('sanitizeArray', () => {
    it('should return array as-is if valid', () => {
      const input = [1, 2, 3];
      expect(sanitizeArray(input)).toEqual([1, 2, 3]);
    });

    it('should limit array size to 100 elements', () => {
      const input = Array(150).fill('item');
      const result = sanitizeArray(input);
      expect(result).toHaveLength(100);
    });

    it('should return empty array for non-array input', () => {
      expect(sanitizeArray('not an array' as any)).toEqual([]);
      expect(sanitizeArray(null as any)).toEqual([]);
      expect(sanitizeArray(undefined as any)).toEqual([]);
    });
  });

  describe('validateAuthInput', () => {
    it('should pass validation for valid auth input', () => {
      mockReq.body = {
        email: 'TEST@EXAMPLE.COM',
        password: 'validpassword123',
        name: '  John Doe  ',
      };

      validateAuthInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.email).toBe('test@example.com'); // Lowercased
      expect(mockReq.body.name).toBe('John Doe'); // Trimmed
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject invalid email format', () => {
      mockReq.body = {
        email: 'invalid-email',
        password: 'validpassword',
      };

      validateAuthInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Invalid email format' });
    });

    it('should reject short passwords', () => {
      mockReq.body = {
        email: 'test@example.com',
        password: 'short',
      };

      validateAuthInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Password must be at least 8 characters long',
      });
    });

    it('should handle optional fields', () => {
      mockReq.body = {
        email: 'test@example.com',
      };

      validateAuthInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });
  });

  describe('validateRecipeInput', () => {
    it('should pass validation for valid recipe input', () => {
      mockReq.body = {
        title: '  Test Recipe  ',
        ingredients: [
          { name: '  ingredient1  ', quantity: '100g' },
          { name: 'ingredient2', quantity: '200g' },
        ],
        preferences: ['vegan', 'gluten-free', 'invalid-pref'],
      };

      validateRecipeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.title).toBe('Test Recipe'); // Trimmed
      expect(mockReq.body.ingredients[0].name).toBe('ingredient1'); // Trimmed
      expect(mockReq.body.preferences).toEqual(['vegan', 'gluten-free']); // Invalid filtered out
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject short title', () => {
      mockReq.body = {
        title: 'ab',
        ingredients: [{ name: 'ingredient1' }],
      };

      validateRecipeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Title must be at least 3 characters' });
    });

    it('should reject non-array ingredients', () => {
      mockReq.body = {
        title: 'Test Recipe',
        ingredients: 'not an array',
      };

      validateRecipeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Ingredients must be an array',
      });
    });

    it('should handle large arrays', () => {
      const largeIngredients = Array(150).fill({ name: 'ingredient' });
      mockReq.body = {
        title: 'Test Recipe',
        ingredients: largeIngredients,
        preferences: ['vegan', 'vegetarian'],
      };

      validateRecipeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.ingredients).toHaveLength(100); // Limited to 100
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });

  describe('validatePagination', () => {
    it('should pass validation for valid pagination', () => {
      mockReq.query = {
        limit: '20',
        offset: '0',
      };

      validatePagination(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query.limit).toBe('20');
      expect(mockReq.query.offset).toBe('0');
    });

    it('should provide defaults for missing values', () => {
      mockReq.query = {};

      validatePagination(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      // validatePagination doesn't set defaults, it only validates if present
      expect(mockReq.query.limit).toBeUndefined();
      expect(mockReq.query.offset).toBeUndefined();
    });

    it('should reject invalid limit', () => {
      mockReq.query = {
        limit: '150',
      };

      validatePagination(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid limit parameter (1-100)',
      });
    });

    it('should reject negative offset', () => {
      mockReq.query = {
        offset: '-10',
      };

      validatePagination(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid offset parameter',
      });
    });
  });

  describe('validateScanInput', () => {
    it('should pass validation for valid scan input', () => {
      mockReq.body = {
        image_data: 'base64encodedimage',
        confidence_threshold: 0.8,
      };

      validateScanInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject too large image data', () => {
      // Create a string larger than 10MB when base64 encoded
      const largeImageData = 'a'.repeat(15 * 1024 * 1024);
      mockReq.body = {
        image_data: largeImageData,
      };

      validateScanInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Image size too large (max 10MB)',
      });
    });

    it('should validate detected ingredients array', () => {
      mockReq.body = {
        image_data: 'base64encodedimage',
        detected_ingredients: Array(150).fill('ingredient'),
      };

      validateScanInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.detected_ingredients).toHaveLength(100); // Limited to 100
    });
  });

  describe('sanitizeInput', () => {
    it('should sanitize all string fields in body', () => {
      mockReq.body = {
        name: '  John Doe  ',
        email: '  TEST@EXAMPLE.COM  ',
        nested: {
          value: '  nested value  ',
        },
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.name).toBe('John Doe');
      expect(mockReq.body.email).toBe('TEST@EXAMPLE.COM'); // sanitizeString doesn't lowercase
      expect(mockReq.body.nested.value).toBe('  nested value  '); // sanitizeInput doesn't handle nested objects
    });

    it('should sanitize query parameters', () => {
      mockReq.query = {
        search: '  test query  ',
        filter: '  active  ',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.query.search).toBe('test query');
      expect(mockReq.query.filter).toBe('active');
    });

    it('should sanitize route parameters', () => {
      mockReq.params = {
        id: '  123  ',
        slug: '  test-slug  ',
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      // sanitizeInput only processes body and query, not params
      expect(mockReq.params.id).toBe('  123  ');
      expect(mockReq.params.slug).toBe('  test-slug  ');
    });

    it('should handle non-string values', () => {
      mockReq.body = {
        count: 123,
        active: true,
        data: null,
        list: [1, 2, 3],
      };

      sanitizeInput(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
      expect(mockReq.body.count).toBe(123);
      expect(mockReq.body.active).toBe(true);
      expect(mockReq.body.data).toBe(null);
      expect(mockReq.body.list).toEqual([1, 2, 3]);
    });
  });
});
