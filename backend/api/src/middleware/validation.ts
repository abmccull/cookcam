import { Request, Response, NextFunction } from 'express';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Validation rules
export const ValidationRules = {
  email: (value: string) => EMAIL_REGEX.test(value),
  password: (value: string) => value.length >= 8,
  username: (value: string) => value.length >= 3 && value.length <= 50,
  limit: (value: number) => value > 0 && value <= 100,
  offset: (value: number) => value >= 0,
};

// Sanitize string input
export const sanitizeString = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .slice(0, 1000); // Limit length
};

// Sanitize array input
export const sanitizeArray = (input: unknown[]): unknown[] => {
  if (!Array.isArray(input)) {return [];}
  return input.slice(0, 100); // Limit array size
};

// Validation middleware for auth endpoints
export const validateAuthInput = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password, name } = req.body;

  // Validate email
  if (email) {
    if (!ValidationRules.email(email)) {
      res.status(400).json({ error: 'Invalid email format' });
      return;
    }
    req.body.email = sanitizeString(email.toLowerCase());
  }

  // Validate password
  if (password) {
    if (!ValidationRules.password(password)) {
      res.status(400).json({ 
        error: 'Password must be at least 8 characters long' 
      });
      return;
    }
  }

  // Sanitize name
  if (name) {
    req.body.name = sanitizeString(name);
    if (req.body.name.length < 2) {
      res.status(400).json({ error: 'Name must be at least 2 characters' });
      return;
    }
  }

  next();
};

// Validation middleware for recipe input
export const validateRecipeInput = (req: Request, res: Response, next: NextFunction): void => {
  const { title, ingredients, preferences } = req.body;

  // Validate title
  if (title) {
    req.body.title = sanitizeString(title);
    if (req.body.title.length < 3) {
      res.status(400).json({ error: 'Title must be at least 3 characters' });
      return;
    }
  }

  // Validate ingredients array
  if (ingredients) {
    if (!Array.isArray(ingredients)) {
      res.status(400).json({ error: 'Ingredients must be an array' });
      return;
    }
    req.body.ingredients = sanitizeArray(ingredients).map(ing => {
      const ingredient = ing as Record<string, unknown>;
      return {
        ...ingredient,
        name: ingredient.name && typeof ingredient.name === 'string' ? sanitizeString(ingredient.name) : ''
      };
    });
  }

  // Validate preferences
  if (preferences) {
    const validPreferences = ['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-carb', 'keto'];
    if (!Array.isArray(preferences)) {
      res.status(400).json({ error: 'Preferences must be an array' });
      return;
    }
    req.body.preferences = preferences.filter(pref => validPreferences.includes(pref));
  }

  next();
};

// Validation middleware for pagination
export const validatePagination = (req: Request, res: Response, next: NextFunction): void => {
  const { limit, offset } = req.query;

  if (limit) {
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || !ValidationRules.limit(limitNum)) {
      res.status(400).json({ error: 'Invalid limit parameter (1-100)' });
      return;
    }
    req.query.limit = limitNum.toString();
  }

  if (offset) {
    const offsetNum = parseInt(offset as string);
    if (isNaN(offsetNum) || !ValidationRules.offset(offsetNum)) {
      res.status(400).json({ error: 'Invalid offset parameter' });
      return;
    }
    req.query.offset = offsetNum.toString();
  }

  next();
};

// Validation middleware for scan input
export const validateScanInput = (req: Request, res: Response, next: NextFunction): void => {
  const { image_data, detected_ingredients } = req.body;

  // Validate image data size (limit to 10MB base64)
  if (image_data && image_data.length > 10 * 1024 * 1024 * 1.37) { // Base64 is ~37% larger
    res.status(400).json({ error: 'Image size too large (max 10MB)' });
    return;
  }

  // Validate detected ingredients if provided
  if (detected_ingredients) {
    if (!Array.isArray(detected_ingredients)) {
      res.status(400).json({ error: 'Detected ingredients must be an array' });
      return;
    }
    req.body.detected_ingredients = sanitizeArray(detected_ingredients);
  }

  next();
};

// Generic input sanitization middleware
export const sanitizeInput = (req: Request, res: Response, next: NextFunction): void => {
  // Sanitize body
  if (req.body && typeof req.body === 'object') {
    for (const key in req.body) {
      if (typeof req.body[key] === 'string') {
        req.body[key] = sanitizeString(req.body[key]);
      } else if (Array.isArray(req.body[key])) {
        req.body[key] = sanitizeArray(req.body[key]);
      }
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    for (const key in req.query) {
      if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeString(req.query[key] as string);
      }
    }
  }

  next();
}; 