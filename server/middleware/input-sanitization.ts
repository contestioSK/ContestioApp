import { body, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes/escapes potentially dangerous characters
 */
function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return input;
  }
  
  // Remove script tags and their content
  let sanitized = input.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  
  // Remove event handlers (onclick, onerror, etc.)
  sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
  sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');
  
  // Remove javascript: protocol
  sanitized = sanitized.replace(/javascript:/gi, '');
  
  // Remove data: protocol (can be used for XSS)
  sanitized = sanitized.replace(/data:text\/html/gi, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  return sanitized;
}

/**
 * Recursively sanitizes all string values in an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Express middleware that sanitizes request body
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }
  
  next();
}

/**
 * Validation chain for battle names (used in battle creation/update)
 */
export const validateBattleName = [
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Battle name must be between 3 and 100 characters')
    .matches(/^[a-zA-Z0-9áäčďéěíľĺňóôŕřšťúůýžÁÄČĎÉĚÍĽĹŇÓÔŔŘŠŤÚŮÝŽ\s\-_.,!]+$/)
    .withMessage('Battle name contains invalid characters'),
];

/**
 * Validation chain for catch species/notes
 */
export const validateCatchData = [
  body('species')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Species name too long'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes too long (max 1000 characters)'),
];

/**
 * Validation chain for trip names/notes
 */
export const validateTripData = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Trip name must be between 3 and 100 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes too long (max 2000 characters)'),
];

/**
 * Middleware to check validation results and return errors
 */
export function handleValidationErrors(req: Request, res: Response, next: NextFunction) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      message: 'Validation failed',
      errors: errors.array() 
    });
  }
  next();
}
