import rateLimit from 'express-rate-limit';

// Rate limiter for authentication endpoints (login, register)
// 5 attempts per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Max 5 requests per windowMs
  message: 'Príliš veľa pokusov o prihlásenie. Skúste to prosím znova o 15 minút.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store is in-memory by default, which works for single server
  // For multi-server setup, use redis or similar
});

// Rate limiter for catch creation
// 30 catches per minute per user
export const catchCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  message: 'Príliš veľa úlovkov naraz. Počkajte chvíľu a skúste znova.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Rate limit by user ID if authenticated, otherwise by IP
    const user = (req as any).user;
    if (user?.id) {
      return `user-${user.id}`;
    }
    // Let express-rate-limit handle IP extraction properly for IPv6
    return undefined as any; // undefined triggers default IP-based key
  },
});

// Rate limiter for battle creation
// 10 battles per hour per user
export const battleCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Príliš veľa battle vytvorených. Môžete vytvoriť maximálne 10 battles za hodinu.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const user = (req as any).user;
    if (user?.id) {
      return `user-${user.id}`;
    }
    return undefined as any;
  },
});

// General API rate limiter
// 100 requests per 15 minutes per IP/user
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Príliš veľa požiadaviek. Počkajte chvíľu a skúste znova.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const user = (req as any).user;
    if (user?.id) {
      return `user-${user.id}`;
    }
    return undefined as any;
  },
  // Skip rate limiting for certain paths
  skip: (req) => {
    // Don't rate limit health checks or static assets
    return req.path === '/health' || req.path.startsWith('/uploads/');
  },
});

// Strict rate limiter for password reset requests
// 3 attempts per hour per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3,
  message: 'Príliš veľa pokusov o reset hesla. Skúste to prosím znova o 1 hodinu.',
  standardHeaders: true,
  legacyHeaders: false,
});
