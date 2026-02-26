import { registerDiaryRoutes } from "./routes/diary";
import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID, createHmac } from "crypto";
import { assertCompetitionOrganizer, assertTeamCaptainOrOrganizer } from "./middleware/auth-helpers";
import { storage } from "./storage";
import { db } from "./db";
import { eq, and, gt, desc, or, inArray, sql, isNotNull } from "drizzle-orm";
import { diaryBattles, diaryCatches, users, baitManufacturers, baitProductLines, baitFlavors, userArsenalBaits, userBadges, fishingAreas, friendships, equipmentManufacturers, equipmentCategories, equipmentProducts, userArsenalEquipment, insertUserArsenalEquipmentSchema, userBaitBrands, userBaitFlavors, insertUserBaitBrandSchema, insertUserBaitFlavorSchema, processedStripeEvents } from "@shared/schema";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { hashPassword, validatePassword, generateVerificationToken, generateTokenExpiration } from "./utils/auth";
import { emailService } from "./utils/email";
import {
  insertCompetitionSchema,
  insertCompetitionRegistrationSchema,
  insertTeamSchema,
  updateTeamSchema,
  insertTeamMemberSchema,
  insertRefereeSchema,
  insertCatchSchema,
  insertSponsorSchema,
  createTeamStatusValidationSchema,
  createCatchValidationSchema,
  insertFavoriteCompetitionSchema,
  insertFavoriteTeamSchema,
  insertNotificationPreferencesSchema,
  updateNotificationPreferencesSchema,
  insertAnnouncementSchema,
  updateAnnouncementSchema,
  insertDiaryBattleSchema,
  insertSeasonSchema,
  insertSeasonGoalSchema,
  updateSeasonGoalSchema,
  insertSeasonGoalProgressSchema,
  insertUserArsenalBaitSchema,
  insertFriendshipSchema,
} from "@shared/schema";
import { z } from "zod";
import { canUseFeature, validatePlanConstraints, getMaxTeams, type PlanTier } from "@shared/plan-capabilities";
import { BADGE_DEFINITIONS, type BadgeTier } from "@shared/badges";
import { NotificationService } from "./notification-service";
import { checkResultBlocking, checkPartialResultBlocking, checkPartialResultBlockingByTeam } from "./middleware/result-blocking";
import {
  authLimiter,
  passwordResetLimiter,
  publicEndpointLimiter,
  catchCreationLimiter,
  battleCreationLimiter,
  authenticatedApiLimiter
} from "./middleware/rate-limiting";
import multer from "multer";
import path from "path";
import fs, { existsSync } from "fs";
import { promises as fsPromises } from "fs";
import { ImageService } from "./image-service";
import QRCode from "qrcode";
import Stripe from "stripe";
import { cache, CacheKeys, CacheTTL } from "./cache";

// Initialize Stripe
const stripe = process.env.STRIPE_SECRET_KEY 
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-03-31.basil' as any })
  : null;

if (!stripe) {
  console.warn('[Stripe] STRIPE_SECRET_KEY not configured - payment features will be disabled');
} else {
  console.log('[Stripe] Initialized successfully');
}

// Plan prices in EUR cents for competitions
const PLAN_PRICES: Record<string, { amount: number; name: string }> = {
  basic: { amount: 6900, name: 'Basic Plan' },
  pro: { amount: 19900, name: 'Pro Plan' },
  premium: { amount: 59900, name: 'Premium Plan' },
};

// Diary subscription price IDs from Stripe
const DIARY_SUBSCRIPTION_PRICES = {
  monthly: process.env.STRIPE_PRICE_MONTHLY || '',
  yearly: process.env.STRIPE_PRICE_YEARLY || '',
};

// Setup token generation and verification for competition registration
// Uses HMAC with a secret derived from SESSION_SECRET
// SESSION_SECRET is required for security - if not set, tokens won't work properly
const SETUP_TOKEN_SECRET = process.env.SESSION_SECRET;
if (!SETUP_TOKEN_SECRET) {
  console.warn('[SECURITY WARNING] SESSION_SECRET is not set. Setup tokens will not be secure.');
}

function generateSetupToken(registrationId: string): string {
  if (!SETUP_TOKEN_SECRET) {
    throw new Error('SESSION_SECRET environment variable is required for setup tokens');
  }
  const hmac = createHmac('sha256', SETUP_TOKEN_SECRET);
  hmac.update(registrationId);
  return hmac.digest('hex').substring(0, 32);
}

function verifySetupToken(registrationId: string, token: string): boolean {
  if (!SETUP_TOKEN_SECRET) {
    return false; // Reject all tokens if secret is not configured
  }
  const expectedToken = generateSetupToken(registrationId);
  // Constant-time comparison to prevent timing attacks
  if (token.length !== expectedToken.length) return false;
  let result = 0;
  for (let i = 0; i < token.length; i++) {
    result |= token.charCodeAt(i) ^ expectedToken.charCodeAt(i);
  }
  return result === 0;
}

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const mime = file.mimetype.toLowerCase();

    // Block SVG explicitly — can contain arbitrary JavaScript
    if (ext === '.svg' || mime === 'image/svg+xml') {
      return cb(new Error("SVG súbory nie sú povolené z bezpečnostných dôvodov"));
    }

    const allowedExtensions = /\.(jpeg|jpg|png|gif|heic|heif)$/;
    const allowedMimetypes = /^image\/(jpeg|png|gif|heic|heif)$/;

    const extOk = allowedExtensions.test(ext);
    const mimeOk = allowedMimetypes.test(mime);

    if (extOk && mimeOk) {
      return cb(null, true);
    } else {
      cb(new Error("Povolené sú len obrázkové súbory (JPEG, PNG, GIF, HEIC)"));
    }
  },
});

// Utility function to safely get userId from request (supports both old and new auth)
function getUserId(req: any): string {
  return req.user?.id || req.user?.claims?.sub;
}

export async function registerRoutes(app: Express): Promise<{ server: Server; broadcastToUsers: (userIds: string[], data: any) => void }> {
  // Serve uploads directory with proper cache headers.
  // Root-level files (/uploads/randomhash) are Multer temp files — never serve them.
  // Organized variants live in subdirectories (/uploads/teams/..., /uploads/catches/...).
  app.use('/uploads', (req, res, next) => {
    const pathParts = req.path.split('/').filter(Boolean);
    if (pathParts.length < 2) {
      // Root-level file — Multer temp or unknown. Block access entirely.
      return res.status(404).end();
    }
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Expires': new Date(Date.now() + 31536000000).toUTCString(),
    });
    next();
  }, express.static('uploads'));

  // Auth middleware
  await setupAuth(app);
  
  // Load new auth system after setupAuth to override serialize/deserialize functions
  const passportModule = await import("./utils/passport");
  const passport = passportModule.default;

  // Apply global rate limiting for authenticated API traffic (2000 req/15min per user)
  // This runs AFTER auth middleware so req.user is available
  // Skips: webhooks, auth endpoints (have their own limits), unauthenticated requests
  app.use('/api', authenticatedApiLimiter);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections with user information
  // WebSocket is ONLY for referee/organizer roles - viewers use polling + cache
  interface ClientConnection {
    ws: WebSocket;
    userId?: string;
    userRole?: string;
    sessionId?: string;
    connectedAt: Date;
  }
  
  const clients = new Map<WebSocket, ClientConnection>();

  // One socket per user — kick old socket when same user reconnects
  const activeSocketByUser = new Map<string, WebSocket>();
  
  // Roles allowed to use WebSocket (viewers use polling + cache instead)
  const WS_ALLOWED_ROLES = ['referee', 'organizer', 'admin'];
  
  wss.on('connection', async (ws, req) => {
    // Initialize connection
    const connection: ClientConnection = {
      ws,
      connectedAt: new Date(),
    };
    clients.set(ws, connection);
    
    console.log('[WS] New WebSocket connection established');
    
    // Server-side authentication using cookies from request headers
    try {
      const cookieHeader = req.headers.cookie;
      if (cookieHeader) {
        // Parse connect.sid cookie
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const sessionCookie = cookies.find(c => c.startsWith('connect.sid='));
        
        if (sessionCookie) {
          // Extract session ID from cookie - format: connect.sid=s%3A{sessionId}.{signature}
          const cookieValue = sessionCookie.split('=')[1];
          const decodedValue = decodeURIComponent(cookieValue);
          // After decoding, format becomes s:{sessionId}.{signature}
          const sessionId = decodedValue.replace(/^s:/, '').split('.')[0];
          
          // Authenticate user from session
          const userSession = await storage.getUserFromSession(sessionId);
          if (userSession) {
            // Check if user has allowed role for WebSocket
            const userRole = userSession.role || 'user';
            if (!WS_ALLOWED_ROLES.includes(userRole)) {
              console.log(`[WS] User ${userSession.email} (role: ${userRole}) not allowed - using polling instead`);
              ws.send(JSON.stringify({
                type: 'auth_error',
                message: 'WebSocket not available for viewers - use polling',
                usePolling: true
              }));
              ws.close(1000, 'Role not allowed');
              clients.delete(ws);
              return;
            }
            
            connection.userId = userSession.id;
            connection.userRole = userRole;
            connection.sessionId = sessionId;

            // Kick previous socket for same user (handles stale connections from reconnect loops)
            const existingWs = activeSocketByUser.get(userSession.id);
            if (existingWs && existingWs !== ws && existingWs.readyState === WebSocket.OPEN) {
              console.log(`[WS] Closing stale socket for user ${userSession.id}`);
              try { existingWs.close(1000, 'replaced by new connection'); } catch {}
            }
            activeSocketByUser.set(userSession.id, ws);

            console.log(`[WS] User ${userSession.email} (role: ${userRole}) authenticated on WebSocket`);
            
            // Send authentication success
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: userSession.id,
              email: userSession.email,
              role: userRole
            }));
          } else {
            console.log(`[WS] Authentication failed for sessionId: ${sessionId}`);
            ws.send(JSON.stringify({
              type: 'auth_error',
              message: 'Unauthenticated'
            }));
          }
        }
      }
    } catch (error) {
      console.error('[WS] Automatic authentication error:', error);
    }
    
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle other message types (keep for potential future use)
        console.log('[WS] Received message:', data.type);
      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });
    
    ws.on('close', (code, reason) => {
      const conn = clients.get(ws);
      console.log(`[WS] closed code=${code} reason="${reason?.toString() || ''}" user=${conn?.userId || 'unauthenticated'}`);
      if (conn?.userId && activeSocketByUser.get(conn.userId) === ws) {
        activeSocketByUser.delete(conn.userId);
      }
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
      const conn = clients.get(ws);
      if (conn?.userId && activeSocketByUser.get(conn.userId) === ws) {
        activeSocketByUser.delete(conn.userId);
      }
      clients.delete(ws);
    });
  });

  // Helper functions for broadcasting
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach((connection, ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  }

  // Targeted broadcast to specific users
  function broadcastToUsers(userIds: string[], data: any) {
    const message = JSON.stringify(data);
    clients.forEach((connection, ws) => {
      if (ws.readyState === WebSocket.OPEN && 
          connection.userId && 
          userIds.includes(connection.userId)) {
        ws.send(message);
      }
    });
  }

  // Broadcast to authenticated users only
  function broadcastToAuthenticated(data: any) {
    const message = JSON.stringify(data);
    clients.forEach((connection, ws) => {
      if (ws.readyState === WebSocket.OPEN && connection.userId) {
        ws.send(message);
      }
    });
  }

  // Create NotificationService instance with WebSocket broadcaster
  const notificationService = new NotificationService({
    broadcastToUsers,
    broadcastToAuthenticated
  });

  // Initialize Photo Job Queue with WebSocket notifications
  (async () => {
    const { photoJobQueue } = await import('./photo-job-queue');
    
    // Listen for photo processing completion
    photoJobQueue.on('photoProcessed', async (result: any) => {
      console.log(`[PhotoQueue] Photo processed, broadcasting update for photo ${result.photoId}`);
      
      try {
        // Find catch that contains this photo by photoId (not by catchId)
        const db = (await import('./db')).db;
        const { diaryCatches } = await import('@shared/schema');
        const { sql } = await import('drizzle-orm');
        
        // Search for catch containing this photoId
        const catches = await db
          .select()
          .from(diaryCatches)
          .where(sql`photos::jsonb @> ${JSON.stringify([{id: result.photoId}])}::jsonb`)
          .limit(1);
        
        if (catches.length > 0) {
          const currentCatch = catches[0];
          
          if (currentCatch.photos) {
            // Parse photos array
            const photos = Array.isArray(currentCatch.photos) 
              ? currentCatch.photos 
              : JSON.parse(currentCatch.photos as any);
            
            // Update the specific photo
            const updatedPhotos = photos.map((photo: any) => {
              if (typeof photo === 'object' && photo.id === result.photoId) {
                return {
                  ...photo,
                  status: result.status,
                  url: result.url || photo.url,
                  originalUrl: result.originalUrl || photo.originalUrl,
                  variants: result.variants || photo.variants,
                  placeholder: result.placeholder || photo.placeholder,
                  error: result.error
                };
              }
              return photo;
            });
            
            // Save back to database
            await db
              .update(diaryCatches)
              .set({ 
                photos: sql`${JSON.stringify(updatedPhotos)}::jsonb`,
                updatedAt: new Date()
              })
              .where(sql`id = ${currentCatch.id}`);
            
            console.log(`[PhotoQueue] Updated photo ${result.photoId} in catch ${currentCatch.id} with status ${result.status}`);
            
            // Update broadcast with actual catchId
            result.catchId = currentCatch.id;
          }
        } else {
          console.warn(`[PhotoQueue] No catch found containing photo ${result.photoId}`);
        }
      } catch (error) {
        console.error(`[PhotoQueue] Failed to update photo in database:`, error);
      }
      
      // Broadcast photo processing result to the user
      broadcastToAuthenticated({
        type: 'diary_photo_processed',
        photoId: result.photoId,
        catchId: result.catchId,
        status: result.status,
        url: result.url,
        variants: result.variants,
        placeholder: result.placeholder,
        error: result.error
      });
    });
    
    console.log('[PhotoQueue] Background photo processing initialized');
  })().catch(err => {
    console.error("[PhotoQueue] Initialization failed:", err);
  });

  // Get all connected user IDs
  function getConnectedUsers(): string[] {
    const userIds: string[] = [];
    clients.forEach((connection) => {
      if (connection.userId) {
        userIds.push(connection.userId);
      }
    });
    return userIds;
  }

  // New auth middleware for the new auth system
  const isNewAuthAuthenticated = (req: any, res: any, next: any) => {
    if (req.isAuthenticated() && req.user?.id) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  };

  // New auth endpoints for email/password + Google OAuth
  app.post('/api/auth/register', authLimiter, async (req, res) => {
    try {
      const { email, firstName, lastName, password, isNewsletterSubscribed } = req.body;

      // Validate required fields
      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ 
          message: 'All fields are required' 
        });
      }

      // Validate password requirements
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: passwordValidation.error 
        });
      }

      // Normalize email and check if user already exists
      const normalizedEmail = email.toLowerCase().trim();
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(400).send('Užívateľ s touto emailovou adresou už existuje.');
      }

      // Hash password and generate verification token
      const hashedPassword = await hashPassword(password);
      const verificationToken = generateVerificationToken();
      const verificationTokenExpires = generateTokenExpiration();

      // Create user
      const newUser = await storage.createEmailUser({
        email: normalizedEmail,
        firstName,
        lastName,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpires,
        isNewsletterSubscribed: isNewsletterSubscribed === true,
      });

      // Send verification email
      const emailSent = await emailService.sendVerificationEmail(
        email,
        firstName,
        verificationToken
      );

      if (!emailSent) {
        console.error('[AUTH] Failed to send verification email for user:', email);
        // Note: We still create the user but inform them about email issue
      }

      res.status(201).json({
        message: 'Account created successfully. Please check your email to verify your account.',
        emailSent,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          emailVerified: newUser.emailVerified
        }
      });

    } catch (error) {
      console.error('[AUTH] Registration error:', error);
      res.status(500).json({ message: 'Registration failed. Please try again.' });
    }
  });

  app.post('/api/auth/login', authLimiter, (req, res, next) => {
    passport.authenticate('local', (err: any, user: any, info: any) => {
      if (err) {
        console.error('[AUTH] Login error:', err);
        return res.status(500).json({ message: 'Login failed. Please try again.' });
      }

      if (!user) {
        return res.status(401).json({ 
          message: info?.message || 'Invalid credentials' 
        });
      }

      // Log the user in
      req.logIn(user, (err: any) => {
        if (err) {
          console.error('[AUTH] Session error:', err);
          return res.status(500).json({ message: 'Login failed. Please try again.' });
        }

        res.json({
          message: 'Login successful',
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.role,
            emailVerified: user.emailVerified
          }
        });
      });
    })(req, res, next);
  });

  app.get('/api/auth/verify-email', async (req, res) => {
    try {
      const { token } = req.query;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          message: 'Verification token is required' 
        });
      }

      const verifiedUser = await storage.verifyUserEmail(token);

      if (!verifiedUser) {
        return res.status(400).json({ 
          message: 'Invalid or expired verification token' 
        });
      }

      res.json({
        message: 'Email verified successfully. You can now sign in.',
        user: {
          id: verifiedUser.id,
          email: verifiedUser.email,
          firstName: verifiedUser.firstName,
          lastName: verifiedUser.lastName,
          emailVerified: verifiedUser.emailVerified
        }
      });

    } catch (error) {
      console.error('[AUTH] Email verification error:', error);
      res.status(500).json({ message: 'Email verification failed. Please try again.' });
    }
  });

  app.post('/api/auth/resend-verification', passwordResetLimiter, async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(200).json({ message: 'Ak je tvoj email v systéme, nový odkaz je na ceste.' });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const user = await storage.getUserByEmail(normalizedEmail);

      if (!user || user.emailVerified) {
        return res.status(200).json({ message: 'Ak je tvoj email v systéme, nový odkaz je na ceste.' });
      }

      const newToken = generateVerificationToken();
      const newExpires = generateTokenExpiration();

      await db.update(users).set({
        verificationToken: newToken,
        verificationTokenExpires: newExpires,
      }).where(eq(users.id, user.id));

      await emailService.sendVerificationEmail(
        user.email!,
        user.firstName || '',
        newToken
      );

      res.status(200).json({ message: 'Ak je tvoj email v systéme, nový odkaz je na ceste.' });
    } catch (error) {
      console.error('[AUTH] Resend verification error:', error);
      res.status(200).json({ message: 'Ak je tvoj email v systéme, nový odkaz je na ceste.' });
    }
  });

  // Reset password with token endpoint
  app.post('/api/auth/reset-password', passwordResetLimiter, async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || typeof token !== 'string') {
        return res.status(400).json({ 
          message: 'Reset token is required' 
        });
      }

      if (!password || typeof password !== 'string') {
        return res.status(400).json({ 
          message: 'New password is required' 
        });
      }

      // Validate password
      const passwordValidation = validatePassword(password);
      if (!passwordValidation.isValid) {
        return res.status(400).json({ 
          message: passwordValidation.error 
        });
      }

      // Find user by token and check expiration
      const [user] = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.verificationToken, token),
            gt(users.verificationTokenExpires, new Date())
          )
        );

      if (!user) {
        return res.status(400).json({ 
          message: 'Invalid or expired reset token' 
        });
      }

      // Hash new password
      const hashedPassword = await hashPassword(password);

      // Update password and clear reset token
      const [updatedUser] = await db
        .update(users)
        .set({
          password: hashedPassword,
          verificationToken: null,
          verificationTokenExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      if (!updatedUser) {
        return res.status(500).json({ 
          message: 'Failed to reset password' 
        });
      }

      res.json({
        message: 'Password reset successfully. You can now sign in with your new password.',
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName
        }
      });

    } catch (error) {
      console.error('[AUTH] Password reset error:', error);
      res.status(500).json({ message: 'Password reset failed. Please try again.' });
    }
  });

  // Google OAuth routes
  app.get('/api/auth/google', passport.authenticate('google', {
    scope: ['profile', 'email']
  }));

  app.get('/api/auth/google/callback', 
    passport.authenticate('google', { failureRedirect: '/auth/login?error=google_auth_failed' }),
    (req, res) => {
      // Successful authentication, redirect to dashboard or home
      res.redirect('/');
    }
  );

  // Logout endpoint
  app.post('/api/auth/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('[AUTH] Logout error:', err);
        return res.status(500).json({ message: 'Logout failed' });
      }
      res.json({ message: 'Logged out successfully' });
    });
  });

  // Newsletter subscription endpoint (public - no auth required)
  app.post('/api/newsletter/subscribe', publicEndpointLimiter, async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: 'Email je povinný' });
      }
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Neplatný formát emailu' });
      }
      
      // Check if email already exists in users table
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Update existing user's newsletter preference
        await db.update(users)
          .set({ isNewsletterSubscribed: true })
          .where(eq(users.id, existingUser.id));
        return res.json({ message: 'Úspešne ste sa prihlásili na odber noviniek!' });
      }
      
      // For non-registered users, we'll just log the subscription
      // In production, you'd store this in a separate newsletter_subscribers table
      console.log('[NEWSLETTER] New subscription:', email);
      
      res.json({ message: 'Úspešne ste sa prihlásili na odber noviniek!' });
    } catch (error) {
      console.error('[NEWSLETTER] Subscription error:', error);
      res.status(500).json({ message: 'Nastala chyba pri prihlásení. Skúste to znova.' });
    }
  });

  // Auth routes - Updated to support both auth systems
  app.get('/api/auth/user', async (req: any, res) => {
    try {
      let userId: string | undefined;

      // Try new auth system first
      if (req.isAuthenticated() && req.user?.id) {
        userId = req.user.id;
        console.log('[AUTH] /api/auth/user - User ID from new auth:', userId);
      }
      // Fallback to old auth system
      else if (req.user?.claims?.sub) {
        userId = getUserId(req);
        console.log('[AUTH] /api/auth/user - User ID from old auth:', userId);
      }

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      console.log('[AUTH] /api/auth/user - User retrieved from DB:', user ? `${user.email} (role: ${user.role})` : 'not found');
      
      if (!user) {
        console.log('[AUTH] User not found in database');
        return res.status(404).json({ message: "User not found in database" });
      }
      
      // Remove sensitive data
      const { password: _, verificationToken: __, verificationTokenExpires: ___, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error("[AUTH] Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Optimized auth init endpoint - combines user, premium status, and limits
  app.get('/api/auth/init', async (req: any, res) => {
    try {
      let userId: string | undefined;

      // Try new auth system first
      if (req.isAuthenticated() && req.user?.id) {
        userId = req.user.id;
      }
      // Fallback to old auth system
      else if (req.user?.claims?.sub) {
        userId = getUserId(req);
      }

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Fetch all data in parallel for better performance
      const [user, tripLimits, catchLimits] = await Promise.all([
        storage.getUser(userId),
        storage.checkDiaryTripLimit(userId),
        storage.checkDiaryCatchLimit(userId),
      ]);
      
      if (!user) {
        return res.status(404).json({ message: "User not found in database" });
      }
      
      // Remove sensitive data
      const { password: _, verificationToken: __, verificationTokenExpires: ___, ...safeUser } = user;
      
      res.json({
        user: safeUser,
        isPremium: user.isPremium ?? false,
        tripLimits,
        catchLimits,
      });
    } catch (error) {
      console.error("[AUTH] Error in auth init:", error);
      res.status(500).json({ message: "Failed to initialize auth" });
    }
  });

  // Set active mode in session
  app.post('/api/me/mode', isAuthenticated, async (req: any, res) => {
    try {
      const { mode, competitionId } = req.body;
      
      if (!['user', 'referee', 'organizer'].includes(mode)) {
        return res.status(400).json({ message: "Invalid mode" });
      }
      
      const userId = getUserId(req);
      const now = new Date();
      
      // Validate mode permissions
      if (mode === 'referee' && competitionId) {
        const refereeAssignments = await storage.getRefereeAssignmentsForUser(userId);
        const validAssignment = refereeAssignments.find(r => {
          const startDate = new Date(r.competition.startDate);
          const endDate = new Date(r.competition.endDate);
          return r.competitionId === competitionId && 
                 r.competition.status === 'live' && 
                 now >= startDate && 
                 now <= endDate;
        });
        if (!validAssignment) {
          return res.status(403).json({ message: "Not authorized as referee for this competition or competition is not active" });
        }
      }
      
      if (mode === 'organizer' && competitionId) {
        const competition = await storage.getCompetition(competitionId);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "Not authorized as organizer for this competition" });
        }
      }
      
      // Store in session
      req.session.activeMode = mode;
      req.session.activeCompetitionId = competitionId || null;
      
      res.json({ 
        activeMode: mode, 
        activeCompetitionId: competitionId || null 
      });
    } catch (error) {
      console.error("[MODE] Error setting active mode:", error);
      res.status(500).json({ message: "Failed to set active mode" });
    }
  });

  // User context endpoint - returns available roles and active competitions
  app.get('/api/me/context', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const now = new Date();

      // Get referee assignments for active competitions (status = 'live' AND within time range)
      const refereeAssignments = await storage.getRefereeAssignmentsForUser(userId);
      const activeRefereeCompetitions = refereeAssignments
        .filter(r => {
          const startDate = new Date(r.competition.startDate);
          const endDate = new Date(r.competition.endDate);
          return r.competition.status === 'live' && now >= startDate && now <= endDate;
        })
        .map(r => ({
          id: r.competition.id,
          name: r.competition.name,
          assignedSector: r.assignedSector,
          startDate: r.competition.startDate,
          endDate: r.competition.endDate,
        }));

      // Get ONLY competitions where this user is the organizer (security fix)
      const allCompetitions = await storage.getCompetitions();
      const organizerCompetitions = allCompetitions
        .filter(c => c.organizerId === userId)
        .map(c => ({
          id: c.id,
          name: c.name,
          status: c.status,
          startDate: c.startDate,
          endDate: c.endDate,
        }));
      
      // Active organizer competitions (live status and within time range)
      const activeOrganizerCompetitions = organizerCompetitions.filter(c => {
        const startDate = new Date(c.startDate);
        const endDate = new Date(c.endDate);
        return c.status === 'live' && now >= startDate && now <= endDate;
      });
      // Completed competitions (for read-only access)
      const completedOrganizerCompetitions = organizerCompetitions.filter(c => c.status === 'completed');

      // Determine available roles
      const availableRoles: string[] = ['user']; // Everyone has user role
      if (activeRefereeCompetitions.length > 0) {
        availableRoles.push('referee');
      }
      if (organizerCompetitions.length > 0) {
        availableRoles.push('organizer');
      }

      // Determine if role selection is needed
      const needsRoleSelection = availableRoles.length > 1;

      // Include session-stored mode if available
      const sessionMode = req.session?.activeMode || null;
      const sessionCompetitionId = req.session?.activeCompetitionId || null;

      res.json({
        userId,
        email: user.email,
        availableRoles,
        needsRoleSelection,
        refereeCompetitions: activeRefereeCompetitions,
        organizerCompetitions: {
          active: activeOrganizerCompetitions,
          completed: completedOrganizerCompetitions,
        },
        sessionMode,
        sessionCompetitionId,
      });
    } catch (error) {
      console.error("[CONTEXT] Error fetching user context:", error);
      res.status(500).json({ message: "Failed to fetch user context" });
    }
  });

  // Competition history endpoint - returns competitions where user was a team member
  app.get('/api/me/competition-history', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Get all team memberships for this user
      const memberships = await storage.getTeamMembershipsByUser(userId);
      
      // Transform to competition history format with biggest catch
      const competitionHistory = await Promise.all(memberships.map(async m => {
        const competition = m.team.competition;
        
        // Get team catches to find biggest one
        const teamCatches = await storage.getCatchesByTeam(m.team.id);
        const biggestCatch = teamCatches.length > 0 
          ? teamCatches.reduce((max, c) => 
              parseFloat(c.weight) > parseFloat(max.weight) ? c : max
            )
          : null;
        
        return {
          id: competition.id,
          name: competition.name,
          startDate: competition.startDate,
          endDate: competition.endDate,
          location: competition.location,
          status: competition.status,
          teamId: m.team.id,
          teamName: m.team.name,
          teamPosition: m.team.position,
          teamTotalWeight: m.team.totalWeight,
          teamFishCount: m.team.fishCount,
          memberRole: m.role,
          biggestCatch: biggestCatch ? {
            weight: biggestCatch.weight,
            fishType: biggestCatch.fishType,
          } : null,
        };
      }));
      
      // Sort by startDate descending (most recent first)
      competitionHistory.sort((a, b) => 
        new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
      );
      
      res.json(competitionHistory);
    } catch (error) {
      console.error("[HISTORY] Error fetching competition history:", error);
      res.status(500).json({ message: "Failed to fetch competition history" });
    }
  });

  // Competition catches endpoint - returns all catches from competitions where user was a team member
  app.get('/api/me/competition-catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Get all team memberships for this user
      const memberships = await storage.getTeamMembershipsByUser(userId);
      
      // Get catches for each team and flatten, with competition/team context
      const allCatches = await Promise.all(memberships.map(async m => {
        const competition = m.team.competition;
        const teamCatches = await storage.getCatchesByTeam(m.team.id);
        
        return teamCatches.map(c => ({
          id: c.id,
          weight: c.weight,
          fishType: c.fishType,
          photoUrl: c.photoUrl,
          sector: c.sector,
          submittedAt: c.submittedAt,
          isVerified: c.isVerified,
          competitionId: competition.id,
          competitionName: competition.name,
          competitionStatus: competition.status,
          competitionStartDate: competition.startDate,
          teamId: m.team.id,
          teamName: m.team.name,
          memberRole: m.role,
        }));
      }));
      
      // Flatten and sort by date descending
      const flatCatches = allCatches.flat().sort((a, b) => 
        new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime()
      );
      
      // Check which catches are already imported to diary
      const importedCatchIds = await storage.getImportedCompetitionCatchIds(userId);
      const catchesWithImportStatus = flatCatches.map(c => ({
        ...c,
        isImportedToDiary: importedCatchIds.includes(c.id),
      }));
      
      res.json(catchesWithImportStatus);
    } catch (error) {
      console.error("[CATCHES] Error fetching competition catches:", error);
      res.status(500).json({ message: "Failed to fetch competition catches" });
    }
  });
  // Diary routes extracted to server/routes/diary.ts for memory efficiency
  registerDiaryRoutes(app, { upload, getUserId, broadcastToUsers, notificationService });


  // Friends API endpoints
  app.get('/api/friends', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const friends = await storage.getUserFriends(userId);
      res.json(friends);
    } catch (error) {
      console.error('[FRIENDS] Error fetching friends:', error);
      res.status(500).json({ message: 'Chyba pri načítaní priateľov' });
    }
  });

  app.get('/api/friend-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const requests = await storage.getFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error('[FRIENDS] Error fetching friend requests:', error);
      res.status(500).json({ message: 'Chyba pri načítaní žiadostí' });
    }
  });

  app.get('/api/friend-requests/sent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const requests = await storage.getSentFriendRequests(userId);
      res.json(requests);
    } catch (error) {
      console.error('[FRIENDS] Error fetching sent friend requests:', error);
      res.status(500).json({ message: 'Chyba pri načítaní odoslaných žiadostí' });
    }
  });

  app.post('/api/friend-requests', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { recipientId } = req.body;
      
      if (!recipientId) {
        return res.status(400).json({ message: 'Chýba recipientId' });
      }
      
      const friendship = await storage.sendFriendRequest(userId, recipientId);
      res.status(201).json(friendship);
    } catch (error: any) {
      console.error('[FRIENDS] Error sending friend request:', error);
      res.status(400).json({ message: error.message || 'Chyba pri odoslaní žiadosti' });
    }
  });

  app.put('/api/friend-requests/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const friendshipId = req.params.id;
      
      const [friendship] = await db.select().from(friendships).where(eq(friendships.id, friendshipId));
      
      if (!friendship || friendship.recipientId !== getUserId(req)) {
        return res.status(403).json({ message: 'Nemáte oprávnenie' });
      }
      
      const updated = await storage.acceptFriendRequest(friendshipId);
      res.json(updated);
    } catch (error) {
      console.error('[FRIENDS] Error accepting friend request:', error);
      res.status(500).json({ message: 'Chyba pri prijatí žiadosti' });
    }
  });

  app.put('/api/friend-requests/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const friendshipId = req.params.id;
      
      const [friendship] = await db.select().from(friendships).where(eq(friendships.id, friendshipId));
      
      if (!friendship || friendship.recipientId !== getUserId(req)) {
        return res.status(403).json({ message: 'Nemáte oprávnenie' });
      }
      
      await storage.rejectFriendRequest(friendshipId);
      res.json({ message: 'Žiadosť odmenená' });
    } catch (error) {
      console.error('[FRIENDS] Error rejecting friend request:', error);
      res.status(500).json({ message: 'Chyba pri odmietnutí žiadosti' });
    }
  });

  app.delete('/api/friends/:friendId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const friendId = req.params.friendId;
      
      await storage.removeFriend(userId, friendId);
      res.json({ message: 'Priateľ odobraný' });
    } catch (error) {
      console.error('[FRIENDS] Error removing friend:', error);
      res.status(500).json({ message: 'Chyba pri odstránení priateľa' });
    }
  });

  return { server: httpServer, broadcastToUsers };
}
