import rateLimit from 'express-rate-limit';

// Rate limiter for authentication endpoints (login, register)
// 20 attempts per 15 minutes per IP - protects against brute force
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Príliš veľa pokusov o prihlásenie. Skúste to prosím znova o 15 minút.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for password reset requests
// 5 attempts per hour per IP
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: 'Príliš veľa pokusov o reset hesla. Skúste to prosím znova o 1 hodinu.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for public/unauthenticated endpoints only
// 100 requests per 15 minutes per IP
export const publicEndpointLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Príliš veľa požiadaviek. Počkajte chvíľu a skúste znova.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for catch creation
// 150 catches per minute per user - allows rapid entry while preventing spam
export const catchCreationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 150,
  message: 'Príliš veľa úlovkov naraz. Počkajte chvíľu a skúste znova.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const user = (req as any).user;
    if (user?.id) {
      return `catch-${user.id}`;
    }
    if (user?.claims?.sub) {
      return `catch-${user.claims.sub}`;
    }
    return undefined as any;
  },
});

// Rate limiter for battle creation
// 60 battles per hour per user - prevents abuse while allowing normal usage
export const battleCreationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 60,
  message: 'Príliš veľa battle vytvorených. Skúste to neskôr.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    const user = (req as any).user;
    if (user?.id) {
      return `battle-${user.id}`;
    }
    if (user?.claims?.sub) {
      return `battle-${user.claims.sub}`;
    }
    return undefined as any;
  },
});

// High-ceiling rate limiter for API traffic
// 2000 requests per 15 minutes per session - allows normal SaaS usage
// Uses sessionID as key (available after express-session middleware)
export const authenticatedApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 2000,
  message: 'Príliš veľa požiadaviek. Počkajte chvíľu a skúste znova.',
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req, res) => {
    // Priority: user ID > session ID > IP
    // User ID is most reliable for authenticated requests
    const user = (req as any).user;
    if (user?.id) {
      return `user-${user.id}`;
    }
    if (user?.claims?.sub) {
      return `user-${user.claims.sub}`;
    }
    // Session ID for requests before auth middleware populates user
    const sessionId = (req as any).sessionID;
    if (sessionId) {
      return `session-${sessionId}`;
    }
    // Fall back to IP for requests without session
    return undefined as any;
  },
  skip: (req) => {
    // Skip rate limiting for webhooks - they must never be limited
    if (req.path.includes('/webhook')) {
      return true;
    }
    // Skip ONLY for auth endpoints that have their own stricter limits
    const authEndpointsWithOwnLimits = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/auth/reset-password',
      '/api/newsletter/subscribe'
    ];
    if (authEndpointsWithOwnLimits.includes(req.path)) {
      return true;
    }
    return false;
  },
});

// NOTE: Global API rate limiting was REMOVED from index.ts
// Previous 100 req/15min limit caused "too many requests" crashes in production
// with just 2 concurrent users due to dashboard/wizard/WebSocket traffic
// 
// Current approach uses endpoint-specific limits only:
// - authLimiter: login/register (20/15min) - brute force protection
// - passwordResetLimiter: reset (5/hour) - abuse protection  
// - catchCreationLimiter: catches (150/min) - spam protection
// - battleCreationLimiter: battles (60/hour) - abuse protection
// - publicEndpointLimiter: newsletter etc (100/15min)
//
// Normal authenticated API traffic (dashboards, wizards, polling) has NO limit
// Security handled by: authentication, authorization, input validation, CORS
