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
import { ImageService, type ProcessedImageResult } from "./image-service";
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
    
    ws.on('close', () => {
      const connection = clients.get(ws);
      if (connection?.userId) {
        console.log(`[WS] User ${connection.userId} disconnected from WebSocket`);
      }
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('[WS] WebSocket error:', error);
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
  })();

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

  // Import competition catch to diary
  app.post('/api/diary/catches/import', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      const importSchema = z.object({
        competitionCatchId: z.string().uuid(),
        competitionId: z.string().uuid(),
        authorshipRole: z.enum(['author', 'assistant']),
        personalNote: z.string().optional(),
      });
      
      const { competitionCatchId, competitionId, authorshipRole, personalNote } = importSchema.parse(req.body);
      
      // Check if already imported
      const importedIds = await storage.getImportedCompetitionCatchIds(userId);
      if (importedIds.includes(competitionCatchId)) {
        return res.status(400).json({ message: "Tento úlovok už máte v denníku" });
      }
      
      // Import the catch
      const diaryCatch = await storage.importCompetitionCatch(
        userId, 
        competitionCatchId, 
        competitionId,
        authorshipRole, 
        personalNote
      );
      
      res.json({ 
        message: "Úlovok bol pridaný do denníka", 
        catch: diaryCatch 
      });
    } catch (error) {
      console.error("[IMPORT] Error importing competition catch:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Neplatné dáta", errors: error.errors });
      }
      res.status(500).json({ message: "Chyba pri importe úlovku" });
    }
  });

  // Profile update endpoint
  app.patch('/api/auth/profile', isAuthenticated, async (req: any, res) => {
    try {
      // Get user ID from session
      let userId: string | undefined;
      
      // New auth system
      if (req.user?.id) {
        userId = req.user.id;
      }
      // Fallback to old auth system
      else if (req.user?.claims?.sub) {
        userId = getUserId(req);
      }

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Validate request body
      const profileUpdateSchema = z.object({
        firstName: z.string().min(1, "Meno je povinné").max(50, "Meno môže mať maximálne 50 znakov").optional(),
        lastName: z.string().min(1, "Priezvisko je povinné").max(50, "Priezvisko môže mať maximálne 50 znakov").optional(),
        nickname: z.string().max(30, "Prezývka môže mať maximálne 30 znakov").optional().or(z.literal("")),
        email: z.string().email("Neplatný email").optional(),
        profileImageUrl: z.string().url("Neplatná URL").optional().or(z.literal("")),
        facebookUrl: z.string().url("Neplatná Facebook URL").optional().or(z.literal("")).nullable(),
        instagramUrl: z.string().url("Neplatná Instagram URL").optional().or(z.literal("")).nullable(),
      });

      const validatedData = profileUpdateSchema.parse(req.body);

      // Update user profile
      const updatedUser = await storage.updateUserProfile(userId, validatedData);
      
      // Remove sensitive data
      const { password: _, verificationToken: __, verificationTokenExpires: ___, ...safeUser } = updatedUser;
      res.json(safeUser);
    } catch (error) {
      console.error("[AUTH] Error updating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Neplatné dáta", errors: error.errors });
      }
      res.status(500).json({ message: "Chyba pri aktualizácii profilu" });
    }
  });

  // Profile image upload endpoint
  app.post('/api/auth/profile/avatar', isAuthenticated, upload.single('avatar'), async (req: any, res) => {
    try {
      // Get user ID from session
      let userId: string | undefined;
      
      // New auth system
      if (req.user?.id) {
        userId = req.user.id;
      }
      // Fallback to old auth system
      else if (req.user?.claims?.sub) {
        userId = getUserId(req);
      }

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Nebola nahraná žiadna fotografia" });
      }

      let imageUrl = "";
      let imageMetadata: ProcessedImageResult | null = null;

      try {
        const userDir = path.join("uploads", "users", userId);
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }

        const timestamp = Date.now();
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const outputBasePath = path.join(userDir, `profile-${timestamp}`);
        
        imageMetadata = await ImageService.processImage(
          req.file.path,
          outputBasePath,
          `profile-${timestamp}`,
          undefined, undefined, undefined,
          `user_avatars/${userId}`
        );
        
        const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 320, 'webp') ||
                            ImageService.getBestVariantForWidth(imageMetadata.variants, 320, 'jpeg') ||
                            imageMetadata.variants[0];
        
        if (bestVariant?.url) {
          imageUrl = bestVariant.url;
          await ImageService.cleanupTempFile(req.file.path);
        } else {
          const localFilename = `profile-${timestamp}${ext}`;
          const localPath = path.join(userDir, localFilename);
          fs.copyFileSync(req.file.path, localPath);
          imageUrl = `/uploads/users/${userId}/${localFilename}`;
          await ImageService.cleanupTempFile(req.file.path);
          console.log(`[AVATAR] Firebase unavailable, saved locally: ${imageUrl}`);
        }
        
        const updatedUser = await storage.updateUserProfile(userId, {
          profileImageUrl: imageUrl
        });
        
        const { password: _, verificationToken: __, verificationTokenExpires: ___, ...safeUser } = updatedUser;
        res.json(safeUser);
      } catch (error) {
        console.error("Error processing profile image:", error);
        const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg';
        const localFilename = `profile-fallback-${Date.now()}${ext}`;
        const userDir = path.join("uploads", "users", userId);
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        try {
          fs.copyFileSync(req.file.path, path.join(userDir, localFilename));
          imageUrl = `/uploads/users/${userId}/${localFilename}`;
        } catch {
          imageUrl = `/uploads/${req.file.filename}`;
        }
        await ImageService.cleanupTempFile(req.file.path);
        
        const updatedUser = await storage.updateUserProfile(userId, {
          profileImageUrl: imageUrl
        });
        
        const { password: _, verificationToken: __, verificationTokenExpires: ___, ...safeUser } = updatedUser;
        res.json(safeUser);
      }
    } catch (error) {
      console.error("[AUTH] Error uploading profile image:", error);
      // Clean up temp file on any error
      if (req.file?.path) {
        await ImageService.cleanupTempFile(req.file.path);
      }
      res.status(500).json({ message: "Chyba pri nahrávaní profilovej fotografie" });
    }
  });

  // User search endpoint (for battle invitations)
  app.get('/api/users/search', isAuthenticated, async (req: any, res) => {
    try {
      // Support both auth systems
      const userId = req.user?.id || req.user?.claims?.sub;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const query = req.query.q as string;
      const battleId = req.query.battleId as string;
      
      if (!query || query.trim().length < 2) {
        return res.json([]);
      }

      let users = await storage.searchUsers(query.trim(), userId);
      
      // If battleId is provided, exclude already invited users
      if (battleId) {
        const invitedUserIds = await storage.getInvitedUsersForBattle(battleId);
        users = users.filter(user => !invitedUserIds.includes(user.id));
      }
      
      // Return only safe user data (exclude sensitive fields)
      const safeUsers = users.map(user => ({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      }));
      
      res.json(safeUsers);
    } catch (error) {
      console.error("[USER_SEARCH] Error searching users:", error);
      res.status(500).json({ message: "Chyba pri vyhľadávaní používateľov" });
    }
  });

  // User referee assignments endpoint
  app.get('/api/users/referee-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const assignments = await storage.getRefereeAssignmentsForUser(userId);
      res.json(assignments);
    } catch (error) {
      console.error("[REFEREE] Error fetching referee assignments:", error);
      res.status(500).json({ message: "Chyba pri načítaní priradení rozhodcu" });
    }
  });

  // User favorites endpoints
  app.get('/api/users/favorites/competitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const favorites = await storage.getUserFavoriteCompetitions(userId);
      res.json(favorites);
    } catch (error) {
      console.error("[FAVORITES] Error fetching favorite competitions:", error);
      res.status(500).json({ message: "Chyba pri načítaní obľúbených súťaží" });
    }
  });

  app.post('/api/users/favorites/competitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertFavoriteCompetitionSchema.parse({ 
        ...req.body, 
        userId 
      });
      
      const favorite = await storage.addFavoriteCompetition(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("[FAVORITES] Error adding favorite competition:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Neplatné dáta", errors: error.errors });
      }
      res.status(500).json({ message: "Chyba pri pridávaní obľúbenej súťaže" });
    }
  });

  app.delete('/api/users/favorites/competitions/:competitionId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { competitionId } = req.params;
      
      await storage.removeFavoriteCompetition(userId, competitionId);
      res.status(204).send();
    } catch (error) {
      console.error("[FAVORITES] Error removing favorite competition:", error);
      res.status(500).json({ message: "Chyba pri odstraňovaní obľúbenej súťaže" });
    }
  });

  app.get('/api/users/favorites/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const favorites = await storage.getUserFavoriteTeams(userId);
      res.json(favorites);
    } catch (error) {
      console.error("[FAVORITES] Error fetching favorite teams:", error);
      res.status(500).json({ message: "Chyba pri načítaní obľúbených tímov" });
    }
  });

  app.post('/api/users/favorites/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertFavoriteTeamSchema.parse({ 
        ...req.body, 
        userId 
      });
      
      const favorite = await storage.addFavoriteTeam(validatedData);
      res.status(201).json(favorite);
    } catch (error) {
      console.error("[FAVORITES] Error adding favorite team:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Neplatné dáta", errors: error.errors });
      }
      res.status(500).json({ message: "Chyba pri pridávaní obľúbeného tímu" });
    }
  });

  app.delete('/api/users/favorites/teams/:teamId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { teamId } = req.params;
      
      await storage.removeFavoriteTeam(userId, teamId);
      res.status(204).send();
    } catch (error) {
      console.error("[FAVORITES] Error removing favorite team:", error);
      res.status(500).json({ message: "Chyba pri odstraňovaní obľúbeného tímu" });
    }
  });

  // User preferences endpoints (onboarding)
  const userPreferencesSchema = z.object({
    fishingStyle: z.enum(["carp", "spinning", "feeder", "fly", "catfish"]).optional(),
    mainGoal: z.enum(["battles", "diary", "statistics"]).optional(),
    visualPreference: z.enum(["lists", "charts"]).optional(),
    onboardingCompleted: z.boolean().optional(),
    allowHistoricalCatches: z.boolean().optional()
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = userPreferencesSchema.parse(req.body);
      
      const preferences = {
        fishingStyle: validatedData.fishingStyle,
        mainGoal: validatedData.mainGoal,
        visualPreference: validatedData.visualPreference,
        onboardingCompleted: validatedData.onboardingCompleted,
        allowHistoricalCatches: validatedData.allowHistoricalCatches
      };
      
      await db.update(users).set({ preferences }).where(eq(users.id, userId));
      
      res.json({ success: true, preferences });
    } catch (error) {
      console.error("[PREFERENCES] Error updating user preferences:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Neplatné dáta", errors: error.errors });
      }
      res.status(500).json({ message: "Chyba pri aktualizácii preferencií" });
    }
  });

  // Notification preferences endpoints
  app.get('/api/users/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const preferences = await storage.getUserNotificationPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("[NOTIFICATIONS] Error fetching notification preferences:", error);
      res.status(500).json({ message: "Chyba pri načítaní nastavení notifikácií" });
    }
  });

  app.put('/api/users/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = updateNotificationPreferencesSchema.parse(req.body);
      
      const preferences = await storage.updateUserNotificationPreferences(userId, validatedData);
      res.json(preferences);
    } catch (error) {
      console.error("[NOTIFICATIONS] Error updating notification preferences:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Neplatné dáta", errors: error.errors });
      }
      res.status(500).json({ message: "Chyba pri aktualizácii nastavení notifikácií" });
    }
  });

  // Push notification subscription endpoints
  app.post('/api/push/subscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { subscription } = req.body;
      
      if (!subscription || !subscription.endpoint || !subscription.keys) {
        return res.status(400).json({ message: "Neplatná subscription data" });
      }
      
      await storage.savePushSubscription(userId, subscription);
      console.log(`[PUSH] User ${userId} subscribed to push notifications`);
      
      res.json({ success: true, message: "Push subscription uložená" });
    } catch (error) {
      console.error("[PUSH] Error saving push subscription:", error);
      res.status(500).json({ message: "Chyba pri ukladaní push subscription" });
    }
  });

  app.post('/api/push/unsubscribe', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      await storage.removePushSubscription(userId);
      console.log(`[PUSH] User ${userId} unsubscribed from push notifications`);
      
      res.json({ success: true, message: "Push subscription odstránená" });
    } catch (error) {
      console.error("[PUSH] Error removing push subscription:", error);
      res.status(500).json({ message: "Chyba pri odstraňovaní push subscription" });
    }
  });

  // Announcement routes
  app.get('/api/announcements', async (req, res) => {
    try {
      const { competitionId, limit } = req.query;
      
      const announcements = await storage.getPublishedAnnouncements({
        competitionId: competitionId as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });
      
      res.json(announcements);
    } catch (error) {
      console.error("Error fetching announcements:", error);
      res.status(500).json({ message: "Failed to fetch announcements" });
    }
  });

  app.get('/api/announcements/:id', async (req: any, res) => {
    try {
      const announcement = await storage.getAnnouncement(req.params.id);
      
      if (!announcement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      // Check if announcement is live (published and publishAt <= now)
      const isLive = announcement.published && (!announcement.publishAt || new Date(announcement.publishAt) <= new Date());
      
      // If not live, require authentication and proper authorization
      if (!isLive) {
        try {
          await new Promise<void>((resolve, reject) => {
            isAuthenticated(req, res, (err?: any) => {
              if (err) reject(err);
              else resolve();
            });
          });
          
          const userId = getUserId(req);
          const user = await storage.getUser(userId);
          
          if (!user) {
            return res.status(404).json({ message: "Announcement not found" });
          }
          
          // Allow access if user is admin, or organizer who owns the announcement, or organizer of the related competition
          const canAccess = user.role === 'admin' || 
                           announcement.authorId === userId ||
                           (user.role === 'organizer' && announcement.competitionId && 
                            (await storage.getCompetition(announcement.competitionId))?.organizerId === userId);
          
          if (!canAccess) {
            return res.status(404).json({ message: "Announcement not found" });
          }
        } catch (authError) {
          return res.status(404).json({ message: "Announcement not found" });
        }
      }
      
      res.json(announcement);
    } catch (error) {
      console.error("Error fetching announcement:", error);
      res.status(500).json({ message: "Failed to fetch announcement" });
    }
  });

  app.post('/api/announcements', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can create announcements" });
      }

      // Validate request body
      const announcementData = insertAnnouncementSchema.parse({
        ...req.body,
        authorId: userId,
      });
      
      // For organizers (non-admins), they can only create announcements for their own competitions
      if (user?.role === 'organizer' && announcementData.competitionId) {
        const competition = await storage.getCompetition(announcementData.competitionId);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only create announcements for your own competitions" });
        }
      }
      
      const announcement = await storage.createAnnouncement(announcementData);
      
      // Broadcast announcement creation in real-time
      broadcast({ 
        type: 'announcement_created', 
        announcementId: announcement.id,
        competitionId: announcement.competitionId || null,
        payload: announcement 
      });
      
      // Check if announcement is now live (published and publishAt <= now or null)
      const isNowLive = announcement.published && (!announcement.publishAt || new Date(announcement.publishAt) <= new Date());
      
      // Send notifications if announcement is live (for newly created announcements, always send if live)
      if (isNowLive) {
        try {
          await notificationService.notifyOfficialAnnouncement(
            announcement.title,
            announcement.content,
            announcement.competitionId || undefined
          );
          // Mark as notified after successful notification
          await storage.markAnnouncementNotified(announcement.id);
        } catch (notificationError) {
          console.error("Error sending announcement notifications:", notificationError);
          // Don't fail the request if notifications fail
        }
      }
      
      res.status(201).json(announcement);
    } catch (error) {
      console.error("Error creating announcement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create announcement" });
    }
  });

  app.put('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update announcements" });
      }

      // Get existing announcement
      const existingAnnouncement = await storage.getAnnouncement(req.params.id);
      if (!existingAnnouncement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      // Check ownership for non-admin users
      if (user?.role === 'organizer' && existingAnnouncement.authorId !== userId) {
        return res.status(403).json({ message: "You can only update your own announcements" });
      }
      
      // For organizers, verify competition ownership if changing competition
      if (user?.role === 'organizer' && req.body.competitionId && req.body.competitionId !== existingAnnouncement.competitionId) {
        const competition = await storage.getCompetition(req.body.competitionId);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only assign announcements to your own competitions" });
        }
      }

      // Validate request body
      const updateData = updateAnnouncementSchema.parse(req.body);
      
      const updatedAnnouncement = await storage.updateAnnouncement(req.params.id, updateData);
      
      // Broadcast announcement update
      broadcast({ 
        type: 'announcement_updated', 
        announcementId: req.params.id,
        competitionId: updatedAnnouncement.competitionId || null,
        payload: updatedAnnouncement 
      });
      
      // Check if announcement just became live (was not live before, but is live now)
      const wasLive = existingAnnouncement.published && (!existingAnnouncement.publishAt || new Date(existingAnnouncement.publishAt) <= new Date());
      const isNowLive = updatedAnnouncement.published && (!updatedAnnouncement.publishAt || new Date(updatedAnnouncement.publishAt) <= new Date());
      
      // Send notifications if announcement just became live or is being published for first time
      if (isNowLive && (!wasLive || !existingAnnouncement.published)) {
        try {
          await notificationService.notifyOfficialAnnouncement(
            updatedAnnouncement.title,
            updatedAnnouncement.content,
            updatedAnnouncement.competitionId || undefined
          );
          // Mark as notified after successful notification
          await storage.markAnnouncementNotified(updatedAnnouncement.id);
        } catch (notificationError) {
          console.error("Error sending announcement notifications:", notificationError);
          // Don't fail the request if notifications fail
        }
      }
      
      res.json(updatedAnnouncement);
    } catch (error) {
      console.error("Error updating announcement:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update announcement" });
    }
  });

  app.delete('/api/announcements/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can delete announcements" });
      }

      // Get existing announcement
      const existingAnnouncement = await storage.getAnnouncement(req.params.id);
      if (!existingAnnouncement) {
        return res.status(404).json({ message: "Announcement not found" });
      }
      
      // Check ownership for non-admin users
      if (user?.role === 'organizer' && existingAnnouncement.authorId !== userId) {
        return res.status(403).json({ message: "You can only delete your own announcements" });
      }
      
      await storage.deleteAnnouncement(req.params.id);
      
      // Broadcast announcement deletion
      broadcast({ 
        type: 'announcement_deleted', 
        announcementId: req.params.id,
        competitionId: existingAnnouncement.competitionId || null,
        payload: { id: req.params.id } 
      });
      
      res.json({ message: "Announcement deleted successfully" });
    } catch (error) {
      console.error("Error deleting announcement:", error);
      res.status(500).json({ message: "Failed to delete announcement" });
    }
  });

  // Competition routes
  app.get('/api/competitions', async (req, res) => {
    try {
      const competitions = await storage.getCompetitions();
      res.json(competitions);
    } catch (error) {
      console.error("Error fetching competitions:", error);
      res.status(500).json({ message: "Failed to fetch competitions" });
    }
  });

  // Get competitions where user is organizer (by organizerId or organizerEmail)
  app.get('/api/organizer/competitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const allCompetitions = await storage.getCompetitions();
      
      // Filter competitions where:
      // 1. User is the organizerId
      // 2. OR user's email matches competition's organizerEmail (set during approval)
      const organizerCompetitions = allCompetitions.filter(comp => 
        comp.organizerId === userId ||
        (user.email && comp.organizerEmail === user.email)
      );

      // Disable HTTP caching to ensure fresh data after competition creation
      res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.set('Pragma', 'no-cache');
      res.set('Expires', '0');
      res.json(organizerCompetitions);
    } catch (error) {
      console.error("Error fetching organizer competitions:", error);
      res.status(500).json({ message: "Failed to fetch organizer competitions" });
    }
  });

  app.get('/api/competitions/:id', async (req, res) => {
    try {
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      res.json(competition);
    } catch (error) {
      console.error("Error fetching competition:", error);
      res.status(500).json({ message: "Failed to fetch competition" });
    }
  });

  app.post('/api/competitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(403).json({ message: "User not found" });
      }

      // If user is not an organizer or admin, upgrade them to organizer when creating a competition
      if (user.role !== 'organizer' && user.role !== 'admin') {
        await storage.updateUser(userId, { role: 'organizer' });
      }

      // Ensure sideCompetitions is properly typed
      const sideCompetitions: string[] = Array.isArray(req.body.sideCompetitions) 
        ? [...req.body.sideCompetitions] 
        : (req.body.sideCompetitions ? [req.body.sideCompetitions] : []);

      // Validate plan constraints before creating competition
      const planTier = (req.body.planTier || 'pro') as PlanTier;
      const planValidation = validatePlanConstraints(planTier, {
        teamCount: req.body.maxTeams ? parseInt(req.body.maxTeams) : undefined,
        hasSectors: req.body.hasSectors || false,
        sideCompetitions: sideCompetitions.length > 0 ? sideCompetitions : undefined,
      });
      
      if (!planValidation.valid) {
        return res.status(400).json({ 
          message: "Nastavenia presahujú limity zvoleného balíka", 
          errors: planValidation.errors 
        });
      }

      const { sideCompetitions: _, branding: __, ...bodyData } = req.body;
      const competitionData = insertCompetitionSchema.parse({
        ...bodyData,
        sideCompetitions: sideCompetitions.length > 0 ? sideCompetitions : null,
        organizerId: userId,
        minWeight: req.body.minWeight ? req.body.minWeight.toString() : "2.00",
      });
      
      const competition = await storage.createCompetition(competitionData);
      
      // Broadcast competition creation
      broadcast({ 
        type: 'competition_created', 
        competitionId: competition.id, 
        payload: competition 
      });
      
      res.status(201).json(competition);
    } catch (error) {
      console.error("Error creating competition:", error);
      res.status(500).json({ message: "Failed to create competition" });
    }
  });

  app.put('/api/competitions/:id', isAuthenticated, upload.single('competitionImage'), async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update competitions" });
      }

      // Verify competition exists
      const existingCompetition = await storage.getCompetition(req.params.id);
      if (!existingCompetition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && existingCompetition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only update your own competitions" });
      }

      // Handle uploaded image with optimization
      let imageUrl = req.body.imageUrl;
      
      if (req.file) {
        try {
          const competitionDir = path.join('uploads', 'competitions', req.params.id);
          const outputBasePath = path.join(competitionDir, 'logo');
          if (!fs.existsSync(competitionDir)) {
            fs.mkdirSync(competitionDir, { recursive: true });
          }
          const imageMetadata = await ImageService.processImage(
            req.file.path,
            outputBasePath,
            `logo-${Date.now()}`,
            undefined, undefined, undefined,
            `competition_photos/${req.params.id}`
          );
          const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'webp') ||
                              ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'jpeg') ||
                              imageMetadata.variants[0];
          imageUrl = bestVariant?.url ?? null;
          await ImageService.cleanupTempFile(req.file.path);
        } catch (error) {
          console.error("[CompetitionImage] Processing failed:", error);
          try { await ImageService.cleanupTempFile(req.file.path); } catch {}
          return res.status(400).json({ message: "Nepodarilo sa spracovať obrázok súťaže. Skúste iný súbor." });
        }
      }

      // When file is uploaded, FormData sends everything as strings - need to parse
      const parsedData = { ...req.body };
      
      // Parse numbers and booleans when coming from FormData
      if (req.file) {
        if (parsedData.maxTeams) parsedData.maxTeams = parseInt(parsedData.maxTeams);
        if (parsedData.maxReferees) parsedData.maxReferees = parseInt(parsedData.maxReferees);
        if (parsedData.minWeight) parsedData.minWeight = parseFloat(parsedData.minWeight);
        if (parsedData.hasSectors !== undefined) parsedData.hasSectors = parsedData.hasSectors === 'true';
        if (parsedData.mediaAccess !== undefined) parsedData.mediaAccess = parsedData.mediaAccess === 'true';
        if (parsedData.prioritySupport !== undefined) parsedData.prioritySupport = parsedData.prioritySupport === 'true';
        
        // Parse JSON arrays
        if (parsedData.sectorPlaces && typeof parsedData.sectorPlaces === 'string') {
          try {
            parsedData.sectorPlaces = JSON.parse(parsedData.sectorPlaces);
          } catch (e) {
            parsedData.sectorPlaces = [];
          }
        }
        if (parsedData.sideCompetitions && typeof parsedData.sideCompetitions === 'string') {
          try {
            parsedData.sideCompetitions = JSON.parse(parsedData.sideCompetitions);
          } catch (e) {
            parsedData.sideCompetitions = [];
          }
        }
        
        // Parse dates
        if (parsedData.startDate && typeof parsedData.startDate === 'string') {
          parsedData.startDate = new Date(parsedData.startDate);
        }
        if (parsedData.endDate && typeof parsedData.endDate === 'string') {
          parsedData.endDate = new Date(parsedData.endDate);
        }
      }

      // Ensure sideCompetitions is properly typed from parsed data
      const sideCompetitions: string[] = Array.isArray(parsedData.sideCompetitions) 
        ? [...parsedData.sideCompetitions] 
        : (parsedData.sideCompetitions ? [parsedData.sideCompetitions] : []);

      // Parse and validate the update data using the same schema as creation
      const { sideCompetitions: _, organizerId: __, selectedPlan, branding: ___, ...bodyData } = parsedData;
      const updateData = insertCompetitionSchema.partial().parse({
        ...bodyData,
        imageUrl,
        sideCompetitions: sideCompetitions.length > 0 ? sideCompetitions : null,
        planTier: selectedPlan, // Map selectedPlan to planTier for competitions table
      });
      
      const updatedCompetition = await storage.updateCompetition(req.params.id, updateData as Parameters<typeof storage.updateCompetition>[1]);
      
      // Broadcast competition update
      broadcast({ 
        type: 'competition_updated', 
        competitionId: req.params.id, 
        payload: updatedCompetition 
      });
      
      res.json(updatedCompetition);
    } catch (error) {
      console.error("Error updating competition:", error);
      res.status(500).json({ message: "Failed to update competition" });
    }
  });

  // DELETE competition endpoint
  app.delete('/api/competitions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can delete competitions" });
      }

      // Verify competition exists
      const existingCompetition = await storage.getCompetition(req.params.id);
      if (!existingCompetition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && existingCompetition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own competitions" });
      }

      await storage.deleteCompetition(req.params.id);
      
      // Broadcast competition deletion
      broadcast({ 
        type: 'competition_deleted', 
        competitionId: req.params.id, 
        payload: { id: req.params.id } 
      });
      
      res.json({ message: "Competition deleted successfully" });
    } catch (error) {
      console.error("Error deleting competition:", error);
      res.status(500).json({ message: "Failed to delete competition" });
    }
  });

  // PATCH competition details endpoint (for wizard auto-save)
  app.patch('/api/competitions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update competitions" });
      }

      const existingCompetition = await storage.getCompetition(req.params.id);
      if (!existingCompetition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      if (user?.role === 'organizer' && existingCompetition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only update your own competitions" });
      }

      // Validate plan constraints before updating
      const planTier = (req.body.planTier || existingCompetition.planTier || 'pro') as PlanTier;
      const sideComps = Array.isArray(req.body.sideCompetitions) ? req.body.sideCompetitions : 
                        (existingCompetition.sideCompetitions || []);
      const planValidation = validatePlanConstraints(planTier, {
        teamCount: req.body.maxTeams !== undefined ? parseInt(req.body.maxTeams) : 
                   (existingCompetition.maxTeams ?? undefined),
        hasSectors: req.body.hasSectors !== undefined ? req.body.hasSectors : 
                    existingCompetition.hasSectors,
        sideCompetitions: sideComps.length > 0 ? sideComps : undefined,
      });
      
      if (!planValidation.valid) {
        return res.status(400).json({ 
          message: "Nastavenia presahujú limity zvoleného balíka", 
          errors: planValidation.errors 
        });
      }

      // Build update data from request body
      const updateData: Record<string, any> = {};
      
      // Allowed fields for all organizers
      const allowedFields = [
        'name', 'description', 'rules', 'location', 'startDate', 'endDate',
        'firstPlacePrize', 'secondPlacePrize', 'thirdPlacePrize', 'registrationFee',
        'maxTeams', 'hasSectors', 'sectorPlaces', 'sideCompetitions', 'scoringType',
        'minWeight', 'planTier', 'contactEmail', 'contactPhone', 'resultBlocking'
      ];
      
      // SECURITY: paymentStatus can ONLY be updated by admin or Stripe webhook
      // Organizers cannot directly set paymentStatus - this must go through payment processing
      const adminOnlyFields = ['paymentStatus'];
      if (user?.role === 'admin') {
        allowedFields.push(...adminOnlyFields);
      } else if (req.body.paymentStatus !== undefined) {
        // Block non-admin users from setting paymentStatus
        console.log(`[SECURITY] Blocked attempt by organizer ${userId} to set paymentStatus directly`);
      }

      for (const field of allowedFields) {
        if (req.body[field] !== undefined) {
          if (field === 'minWeight') {
            updateData[field] = req.body[field].toString();
          } else if (field === 'startDate' || field === 'endDate') {
            updateData[field] = new Date(req.body[field]);
          } else {
            updateData[field] = req.body[field];
          }
        }
      }

      const updatedCompetition = await storage.updateCompetition(req.params.id, updateData);
      
      broadcast({ 
        type: 'competition_updated', 
        competitionId: req.params.id, 
        payload: updatedCompetition 
      });
      
      res.json(updatedCompetition);
    } catch (error) {
      console.error("Error updating competition:", error);
      res.status(500).json({ message: "Failed to update competition" });
    }
  });

  // POST competition payment - initiates payment and marks as paid (placeholder for Stripe)
  // In production, this should create a Stripe checkout session and return the session URL
  // The paymentStatus should only be set to 'paid' via Stripe webhook after successful payment
  app.post('/api/competitions/:id/pay', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can initiate payment" });
      }

      const existingCompetition = await storage.getCompetition(req.params.id);
      if (!existingCompetition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      if (user?.role === 'organizer' && existingCompetition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only pay for your own competitions" });
      }

      // Validate plan tier
      const planSchema = z.object({
        planTier: z.enum(['basic', 'pro', 'premium', 'enterprise'])
      });
      
      const validationResult = planSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid plan tier",
          errors: validationResult.error.errors 
        });
      }

      const { planTier } = validationResult.data;

      // Competition must be in 'draft' or 'ready' status to initiate payment
      if (existingCompetition.status !== 'draft' && existingCompetition.status !== 'ready') {
        return res.status(400).json({ 
          message: "Súťaž musí byť v stave 'draft' alebo 'ready' pred platbou",
          currentStatus: existingCompetition.status
        });
      }

      // Already paid check
      if (existingCompetition.paymentStatus === 'paid') {
        return res.status(400).json({ 
          message: "Súťaž je už zaplatená"
        });
      }

      // Check if Stripe is configured
      if (!stripe) {
        // Fallback for development - directly mark as paid
        console.log(`[DEV PAYMENT] Competition ${req.params.id} payment initiated for plan: ${planTier}`);
        
        const updatedCompetition = await storage.updateCompetition(req.params.id, {
          planTier,
          paymentStatus: 'paid',
          status: 'ready'
        });
        
        broadcast({ 
          type: 'competition_updated', 
          competitionId: req.params.id, 
          payload: updatedCompetition 
        });

        return res.json({ 
          message: "Platba úspešná (dev mode)",
          competition: updatedCompetition,
        });
      }

      // Get plan price
      const planPrice = PLAN_PRICES[planTier];
      if (!planPrice) {
        return res.status(400).json({ 
          message: "Neplatný cenový plán. Pre Enterprise kontaktujte podporu."
        });
      }

      // Build success/cancel URLs
      const appOrigin = process.env.APP_ORIGIN || 
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
        'https://contestio.sk'));

      // Create Stripe Checkout Session
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            price_data: {
              currency: 'eur',
              product_data: {
                name: `Contestio ${planPrice.name}`,
                description: `Súťaž: ${existingCompetition.name}`,
              },
              unit_amount: planPrice.amount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${appOrigin}/organizer/competition/${req.params.id}?payment=success`,
        cancel_url: `${appOrigin}/organizer/competition/${req.params.id}/checkout?plan=${planTier}`,
        metadata: { 
          competitionId: req.params.id, 
          planTier,
          userId: userId
        },
        customer_email: existingCompetition.contactEmail || undefined,
      });

      console.log(`[Stripe] Checkout session created for competition ${req.params.id}, plan: ${planTier}, url: ${session.url ? 'present' : 'missing'}`);
      
      if (!session.url) {
        console.error('[Stripe] Checkout session created but URL is missing');
        return res.status(500).json({ message: "Chyba pri vytváraní platobnej stránky" });
      }
      
      res.json({ 
        checkoutUrl: session.url
      });
    } catch (error) {
      console.error("Error processing competition payment:", error);
      res.status(500).json({ message: "Failed to process payment" });
    }
  });

  // Diary Premium Subscription Checkout endpoint
  app.post('/api/diary/subscribe', isAuthenticated, async (req: any, res) => {
    console.log('[Stripe Subscribe] Endpoint called, body:', JSON.stringify(req.body));
    try {
      if (!stripe) {
        console.error('[Stripe Subscribe] Stripe not configured');
        return res.status(400).json({ message: "Platby nie sú nakonfigurované" });
      }

      const userId = getUserId(req);
      console.log('[Stripe Subscribe] User ID:', userId);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(401).json({ message: "Používateľ neexistuje" });
      }

      // Validate billing interval
      const subscribeSchema = z.object({
        billingInterval: z.enum(['monthly', 'yearly'])
      });
      
      const validationResult = subscribeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Neplatný fakturačný interval",
          errors: validationResult.error.errors 
        });
      }

      const { billingInterval } = validationResult.data;
      console.log('[Stripe Subscribe] Billing interval:', billingInterval);
      console.log('[Stripe Subscribe] Available prices:', JSON.stringify(DIARY_SUBSCRIPTION_PRICES));
      
      const priceId = billingInterval === 'yearly' 
        ? DIARY_SUBSCRIPTION_PRICES.yearly 
        : DIARY_SUBSCRIPTION_PRICES.monthly;
      
      console.log('[Stripe Subscribe] Selected price ID:', priceId);

      if (!priceId) {
        console.error(`[Stripe Subscribe] Missing price ID for ${billingInterval} subscription`);
        return res.status(500).json({ message: "Cenová konfigurácia nie je dostupná" });
      }

      // Check if user already has an active subscription
      const existingSubscription = await storage.getUserSubscription(userId, "diary_premium");
      if (existingSubscription?.status === 'active') {
        return res.status(400).json({ 
          message: "Už máte aktívne predplatné. Správa predplatného je dostupná v profile." 
        });
      }

      // Get or create Stripe customer
      let stripeCustomerId = existingSubscription?.stripeCustomerId;
      
      // Verify existing customer ID is valid in current Stripe mode
      if (stripeCustomerId) {
        try {
          await stripe.customers.retrieve(stripeCustomerId);
          console.log(`[Stripe Subscribe] Existing customer ${stripeCustomerId} verified`);
        } catch (customerError: any) {
          // Customer doesn't exist in current mode (test vs live mismatch)
          console.log(`[Stripe Subscribe] Customer ${stripeCustomerId} not found in current mode, will create new`);
          stripeCustomerId = null;
        }
      }
      
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.firstName && user.lastName 
            ? `${user.firstName} ${user.lastName}` 
            : user.nickname || undefined,
          metadata: {
            userId: userId
          }
        });
        stripeCustomerId = customer.id;
        console.log(`[Stripe Subscribe] Created new customer ${stripeCustomerId} for user ${userId}`);
      }

      // Determine app origin for redirect URLs
      const appOrigin = process.env.APP_ORIGIN || 
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
        'https://contestio.sk'));

      // Create Stripe Checkout Session for subscription
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        allow_promotion_codes: true,
        success_url: `${appOrigin}/diary?subscription=success`,
        cancel_url: `${appOrigin}/pricing?tab=diary`,
        metadata: { 
          userId: userId,
          product: 'diary_premium',
          billingInterval: billingInterval
        },
        subscription_data: {
          metadata: {
            userId: userId,
            product: 'diary_premium',
            billingInterval: billingInterval
          }
        }
      });

      console.log(`[Stripe] Subscription checkout session created for user ${userId}, interval: ${billingInterval}`);
      
      if (!session.url) {
        console.error('[Stripe] Subscription checkout session created but URL is missing');
        return res.status(500).json({ message: "Chyba pri vytváraní platobnej stránky" });
      }

      // Store checkout session ID for later reference
      await storage.createOrUpdateSubscription({
        userId: userId,
        product: 'diary_premium',
        status: 'none',
        checkoutSessionId: session.id,
        stripeCustomerId: stripeCustomerId,
        billingInterval: billingInterval
      });
      
      res.json({ 
        checkoutUrl: session.url
      });
    } catch (error: any) {
      console.error("[Stripe Subscribe] Error creating subscription checkout:", error);
      console.error("[Stripe Subscribe] Error type:", error?.type);
      console.error("[Stripe Subscribe] Error code:", error?.code);
      console.error("[Stripe Subscribe] Error message:", error?.message);
      console.error("[Stripe Subscribe] Raw error:", error?.raw?.message);
      
      // Return more specific error message for debugging
      const errorMessage = error?.message || "Nepodarilo sa vytvoriť predplatné";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Customer Portal endpoint for subscription management
  app.post('/api/diary/subscription/portal', isAuthenticated, async (req: any, res) => {
    try {
      if (!stripe) {
        return res.status(400).json({ message: "Platby nie sú nakonfigurované" });
      }

      const userId = getUserId(req);
      const subscription = await storage.getUserSubscription(userId, "diary_premium");
      
      if (!subscription?.stripeCustomerId) {
        return res.status(400).json({ message: "Nemáte aktívne predplatné" });
      }

      const appOrigin = process.env.APP_ORIGIN || 
        (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 
        (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 
        'https://contestio.sk'));

      const portalSession = await stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${appOrigin}/diary/profile`,
      });

      res.json({ portalUrl: portalSession.url });
    } catch (error) {
      console.error("Error creating billing portal session:", error);
      res.status(500).json({ message: "Nepodarilo sa otvoriť správu predplatného" });
    }
  });

  // Get current user subscription status
  app.get('/api/diary/subscription', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const subscription = await storage.getUserSubscription(userId, "diary_premium");
      
      if (!subscription) {
        return res.json({ 
          status: 'none',
          isPremium: false
        });
      }

      res.json({
        status: subscription.status,
        isPremium: subscription.status === 'active',
        billingInterval: subscription.billingInterval,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd
      });
    } catch (error) {
      console.error("Error fetching subscription status:", error);
      res.status(500).json({ message: "Nepodarilo sa načítať stav predplatného" });
    }
  });

  // Stripe Webhook endpoint - handles successful payments
  // IMPORTANT: This must use express.raw() body parser, not express.json()
  app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
    if (!stripe) {
      console.warn('[Stripe Webhook] Stripe not configured');
      return res.status(400).send('Stripe not configured');
    }

    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    // SECURITY: Always require webhook secret for signature verification
    if (!webhookSecret) {
      console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured - rejecting webhook');
      return res.status(500).send('Webhook secret not configured');
    }
    
    if (!sig) {
      console.error('[Stripe Webhook] Missing stripe-signature header');
      return res.status(400).send('Missing signature');
    }
    
    let event: Stripe.Event;

    try {
      // Verify webhook signature for security
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('[Stripe Webhook] Signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // SECURITY: In production, silently ignore test-mode events (livemode=false)
    // Stripe would retry if we return an error, so we return 200 OK
    if (process.env.NODE_ENV === 'production' && !event.livemode) {
      console.warn(`[Stripe Webhook] Ignoring test-mode event ${event.id} in production`);
      return res.json({ received: true, skipped: 'test_mode' });
    }

    // IDEMPOTENCY: Wrap all processing in a DB transaction that starts by
    // inserting the event ID. If the ID already exists (PK conflict), the catch
    // block returns 200 OK immediately — preventing any double-processing.
    try {
      await db.transaction(async (tx) => {
        // This INSERT will throw on PK conflict if event was already processed
        await tx.insert(processedStripeEvents).values({
          eventId: event.id,
          eventType: event.type,
          livemode: event.livemode,
        });

        // ── Process event inside the same transaction ──────────────────────────

        if (event.type === 'checkout.session.completed') {
          const session = event.data.object as Stripe.Checkout.Session;

          if (session.mode === 'subscription' && session.metadata?.product === 'diary_premium') {
            const userId = session.metadata?.userId;
            const billingInterval = session.metadata?.billingInterval;
            const subscriptionId = session.subscription as string;

            if (!userId) {
              console.error('[Stripe Webhook] Missing userId in subscription session:', session.id);
              throw new Error('Missing userId');
            }

            console.log(`[Stripe Webhook] Subscription checkout completed for user ${userId}, interval: ${billingInterval}`);

            const subscription = await stripe.subscriptions.retrieve(subscriptionId) as any;

            await storage.createOrUpdateSubscription({
              userId,
              product: 'diary_premium',
              status: 'active',
              stripeSubscriptionId: subscriptionId,
              stripeCustomerId: session.customer as string,
              billingInterval: billingInterval as 'monthly' | 'yearly',
              currentPeriodEnd: new Date((subscription.current_period_end as number) * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            }, tx as any);

            await tx.update(users).set({
              isPremium: true,
              userTier: 'PREMIUM',
              premiumExpiresAt: new Date((subscription.current_period_end as number) * 1000),
            }).where(eq(users.id, userId));

            console.log(`[Stripe Webhook] User ${userId} subscription activated successfully`);
          } else if (session.mode === 'payment') {
            const competitionId = session.metadata?.competitionId;
            const planTier = session.metadata?.planTier;

            if (!competitionId || !planTier) {
              console.error('[Stripe Webhook] Missing metadata in session:', session.id);
              throw new Error('Missing metadata');
            }

            console.log(`[Stripe Webhook] Payment completed for competition ${competitionId}, plan: ${planTier}`);

            const existingCompetition = await storage.getCompetition(competitionId);
            const updatedCompetition = await storage.updateCompetition(competitionId, {
              planTier: planTier as any,
              paymentStatus: 'paid',
              status: 'registration',
            });

            broadcast({ type: 'competition_updated', competitionId, payload: updatedCompetition });

            const contactEmail = updatedCompetition?.contactEmail || existingCompetition?.contactEmail;
            if (contactEmail) {
              const planNames: Record<string, string> = { basic: 'Basic', pro: 'Pro', premium: 'Premium', enterprise: 'Enterprise' };
              const planDisplayName = planNames[planTier] || planTier;
              const competitionName = updatedCompetition?.name || existingCompetition?.name || 'Súťaž';
              const appOrigin = process.env.APP_ORIGIN ||
                (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` :
                (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` :
                'https://contestio.sk'));
              const dashboardUrl = `${appOrigin}/organizer/competition/${competitionId}`;
              emailService.sendPaymentConfirmationEmail(contactEmail, competitionName, planDisplayName, dashboardUrl)
                .then(ok => ok
                  ? console.log(`[Email] Payment confirmation sent to ${contactEmail}`)
                  : console.error(`[Email] Failed to send payment confirmation to ${contactEmail}`))
                .catch(err => console.error('[Email] Error sending payment confirmation:', err));
            }

            console.log(`[Stripe Webhook] Competition ${competitionId} updated successfully`);
          }
        }

        if (event.type === 'customer.subscription.updated') {
          const subscription = event.data.object as any;
          const userId = subscription.metadata?.userId;

          if (userId && subscription.metadata?.product === 'diary_premium') {
            console.log(`[Stripe Webhook] Subscription updated for user ${userId}, status: ${subscription.status}`);

            const status = subscription.status === 'active' ? 'active'
              : subscription.status === 'past_due' ? 'past_due'
              : subscription.status === 'canceled' ? 'canceled'
              : 'none';

            await storage.createOrUpdateSubscription({
              userId,
              product: 'diary_premium',
              status,
              stripeSubscriptionId: subscription.id,
              currentPeriodEnd: new Date((subscription.current_period_end as number) * 1000),
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
            }, tx as any);

            const isPremium = status === 'active';
            await tx.update(users).set({
              isPremium,
              userTier: isPremium ? 'PREMIUM' : 'FREE',
              premiumExpiresAt: isPremium ? new Date((subscription.current_period_end as number) * 1000) : null,
            }).where(eq(users.id, userId));

            console.log(`[Stripe Webhook] User ${userId} subscription updated to ${status}`);
          }
        }

        if (event.type === 'customer.subscription.deleted') {
          const subscription = event.data.object as any;
          const userId = subscription.metadata?.userId;

          if (userId && subscription.metadata?.product === 'diary_premium') {
            console.log(`[Stripe Webhook] Subscription deleted for user ${userId}`);

            await storage.createOrUpdateSubscription({
              userId,
              product: 'diary_premium',
              status: 'canceled',
              stripeSubscriptionId: subscription.id,
              cancelAtPeriodEnd: false,
            }, tx as any);

            await tx.update(users).set({
              isPremium: false,
              userTier: 'FREE',
              premiumExpiresAt: null,
            }).where(eq(users.id, userId));

            console.log(`[Stripe Webhook] User ${userId} subscription canceled and downgraded to FREE`);
          }
        }

        if (event.type === 'invoice.payment_failed') {
          const invoice = event.data.object as any;
          const subscriptionId = invoice.subscription as string;

          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
            const userId = subscription.metadata?.userId;

            if (userId && subscription.metadata?.product === 'diary_premium') {
              console.log(`[Stripe Webhook] Payment failed for user ${userId}`);
              await storage.createOrUpdateSubscription({ userId, product: 'diary_premium', status: 'past_due' }, tx as any);
            }
          }
        }
      });
    } catch (err: any) {
      // PK conflict = already processed — return 200 so Stripe doesn't retry
      if (err?.code === '23505' || err?.message?.includes('duplicate key')) {
        console.log(`[Stripe Webhook] Duplicate event ${event.id} — already processed, ignoring`);
        return res.json({ received: true, skipped: 'duplicate' });
      }
      console.error('[Stripe Webhook] Error processing webhook event:', err);
      return res.status(500).send('Error processing webhook');
    }

    res.json({ received: true });
  });

  // PATCH competition status endpoint
  app.patch('/api/competitions/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update competition status" });
      }

      // Verify competition exists
      const existingCompetition = await storage.getCompetition(req.params.id);
      if (!existingCompetition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && existingCompetition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only update status of your own competitions" });
      }

      // Validate status transitions using Zod
      const statusSchema = z.object({
        status: z.enum(['draft', 'ready', 'registration', 'live', 'finished'])
      });
      
      const validationResult = statusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status. Must be: draft, ready, registration, live, or finished",
          errors: validationResult.error.errors 
        });
      }

      const { status } = validationResult.data;

      // Validate status transition logic
      const validTransitions: Record<string, string[]> = {
        'draft': ['ready'],
        'ready': ['live'],
        'registration': ['live'],
        'live': ['finished'],
        'finished': []
      };

      const allowedNextStates = validTransitions[existingCompetition.status] || [];
      if (!allowedNextStates.includes(status)) {
        return res.status(409).json({ 
          message: `Invalid status transition from ${existingCompetition.status} to ${status}`,
          currentStatus: existingCompetition.status,
          allowedTransitions: allowedNextStates
        });
      }

      // Validate required fields before allowing transition to 'ready'
      if (status === 'ready') {
        const missingFields: string[] = [];
        
        if (!existingCompetition.name || existingCompetition.name.trim() === '') {
          missingFields.push('Názov súťaže');
        }
        if (!existingCompetition.location || existingCompetition.location.trim() === '') {
          missingFields.push('Miesto konania');
        }
        if (!existingCompetition.startDate) {
          missingFields.push('Dátum začiatku');
        }
        if (!existingCompetition.endDate) {
          missingFields.push('Dátum konca');
        }
        if (!existingCompetition.scoringType) {
          missingFields.push('Typ bodovania');
        }
        if (!existingCompetition.contactEmail || existingCompetition.contactEmail.trim() === '') {
          missingFields.push('Kontaktný email');
        }
        if (!existingCompetition.contactPhone || existingCompetition.contactPhone.trim() === '') {
          missingFields.push('Kontaktný telefón');
        }
        
        // Validate date order
        if (existingCompetition.startDate && existingCompetition.endDate) {
          const start = new Date(existingCompetition.startDate);
          const end = new Date(existingCompetition.endDate);
          if (end < start) {
            missingFields.push('Dátum konca musí byť po dátume začiatku');
          }
        }
        
        // Check sectors if enabled
        if (existingCompetition.hasSectors && 
            (!existingCompetition.sectorPlaces || existingCompetition.sectorPlaces.length === 0)) {
          missingFields.push('Definujte aspoň jeden sektor');
        }
        
        if (missingFields.length > 0) {
          return res.status(400).json({ 
            message: "Chýbajúce údaje",
            missingFields
          });
        }
      }

      // Check payment status before allowing transition to live
      if (status === 'live' && existingCompetition.paymentStatus !== 'paid') {
        return res.status(400).json({ 
          message: "Súťaž musí byť zaplatená pred spustením",
          paymentStatus: existingCompetition.paymentStatus
        });
      }

      // Date validation for status transitions (admins can override)
      const isAdmin = user?.role === 'admin';
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // For transition to 'live': must be on the start date (day comparison only)
      if (status === 'live' && !isAdmin && existingCompetition.startDate) {
        const startDate = new Date(existingCompetition.startDate);
        startDate.setHours(0, 0, 0, 0);
        
        if (today.getTime() !== startDate.getTime()) {
          return res.status(400).json({ 
            message: "Súťaž je možné spustiť len v deň začiatku. Kontaktujte administrátora.",
            startDate: existingCompetition.startDate,
            today: today.toISOString()
          });
        }
      }

      // For transition to 'finished': must be on the end date (day comparison only)
      if (status === 'finished' && !isAdmin && existingCompetition.endDate) {
        const endDate = new Date(existingCompetition.endDate);
        endDate.setHours(0, 0, 0, 0);
        
        if (today.getTime() !== endDate.getTime()) {
          return res.status(400).json({ 
            message: "Súťaž je možné ukončiť len v deň ukončenia. Kontaktujte administrátora.",
            endDate: existingCompetition.endDate,
            today: today.toISOString()
          });
        }
      }

      await storage.updateCompetitionStatus(req.params.id, status);
      
      // Broadcast status update
      broadcast({ 
        type: 'competition_status_updated', 
        competitionId: req.params.id, 
        payload: { id: req.params.id, status } 
      });
      
      res.json({ message: "Competition status updated successfully", status });
    } catch (error) {
      console.error("Error updating competition status:", error);
      res.status(500).json({ message: "Failed to update competition status" });
    }
  });

  // DELETE all catches for competition (reset catches)
  app.delete('/api/competitions/:id/catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can reset catches" });
      }

      // Verify competition exists
      const existingCompetition = await storage.getCompetition(req.params.id);
      if (!existingCompetition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && existingCompetition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only reset catches for your own competitions" });
      }

      await storage.resetCompetitionCatches(req.params.id);
      
      // Invalidate cache after catches reset
      cache.invalidateCompetition(req.params.id);
      
      // Broadcast catches reset
      broadcast({ 
        type: 'catches_reset', 
        competitionId: req.params.id, 
        payload: { competitionId: req.params.id } 
      });
      
      res.json({ message: "Competition catches reset successfully" });
    } catch (error) {
      console.error("Error resetting catches:", error);
      res.status(500).json({ message: "Failed to reset catches" });
    }
  });

  // Competition statistics endpoint
  app.get('/api/competitions/:id/stats', checkPartialResultBlocking, async (req, res) => {
    try {
      const competitionId = req.params.id;
      
      // Verify competition exists
      const competition = await storage.getCompetition(competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      const catches = await storage.getCatchesByCompetition(competitionId);
      const teams = await storage.getTeamsByCompetition(competitionId);
      
      // Weight categories analysis
      const weightCategories = [
        { category: '< 5 kg', commonCarp: 0, mirrorCarp: 0, total: 0 },
        { category: '5-10 kg', commonCarp: 0, mirrorCarp: 0, total: 0 },
        { category: '10-15 kg', commonCarp: 0, mirrorCarp: 0, total: 0 },
        { category: '15-20 kg', commonCarp: 0, mirrorCarp: 0, total: 0 },
        { category: '20-25 kg', commonCarp: 0, mirrorCarp: 0, total: 0 },
        { category: '25-30 kg', commonCarp: 0, mirrorCarp: 0, total: 0 },
        { category: '30+ kg', commonCarp: 0, mirrorCarp: 0, total: 0 },
      ];

      catches.forEach(catch_ => {
        let categoryIndex = 0;
        const weight = Number(catch_.weight);
        
        if (weight >= 30) categoryIndex = 6;
        else if (weight >= 25) categoryIndex = 5;
        else if (weight >= 20) categoryIndex = 4;
        else if (weight >= 15) categoryIndex = 3;
        else if (weight >= 10) categoryIndex = 2;
        else if (weight >= 5) categoryIndex = 1;
        else categoryIndex = 0;

        const category = weightCategories[categoryIndex];
        category.total += 1;
        
        if (catch_.fishType === 'scaly') {
          category.commonCarp += 1;
        } else if (catch_.fishType === 'mirror') {
          category.mirrorCarp += 1;
        }
      });

      // Timeline data (daily aggregation for entire competition duration)
      const timeline = [];
      const competitionStart = new Date(competition.startDate);
      const competitionEnd = new Date(competition.endDate);
      const currentDate = new Date();
      
      // Group catches by day (only for days that have already passed)
      const catchesByDay = catches.reduce((acc, catch_) => {
        if (!catch_.submittedAt) return acc;
        const catchDate = new Date(catch_.submittedAt);
        const daysSinceStart = Math.floor((catchDate.getTime() - competitionStart.getTime()) / (1000 * 60 * 60 * 24));
        const dayKey = Math.max(0, daysSinceStart); // Ensure non-negative
        
        if (!acc[dayKey]) {
          acc[dayKey] = { weight: 0, count: 0 };
        }
        acc[dayKey].weight += Number(catch_.weight);
        acc[dayKey].count += 1;
        return acc;
      }, {} as Record<number, { weight: number; count: number }>);

      // Create cumulative timeline for ALL days of competition (including future days)
      let cumulativeWeight = 0;
      let cumulativeCount = 0;
      const totalCompetitionDays = Math.ceil((competitionEnd.getTime() - competitionStart.getTime()) / (1000 * 60 * 60 * 24));
      
      for (let day = 0; day < Math.max(1, totalCompetitionDays); day++) {
        const dayDate = new Date(competitionStart);
        dayDate.setDate(dayDate.getDate() + day);
        
        // Only add catches for days that have already passed
        const isFutureDay = dayDate > currentDate;
        const dayData = isFutureDay ? { weight: 0, count: 0 } : (catchesByDay[day] || { weight: 0, count: 0 });
        
        // Only accumulate data for past/current days
        if (!isFutureDay) {
          cumulativeWeight += dayData.weight;
          cumulativeCount += dayData.count;
        }
        
        timeline.push({
          time: dayDate.toISOString(),
          totalWeight: Math.round(cumulativeWeight * 10) / 10,
          totalCount: cumulativeCount,
          dayIndex: day,
          date: dayDate.toISOString().split('T')[0] // YYYY-MM-DD format
        });
      }

      // Team performance
      const teamPerformance = teams.map(team => ({
        teamId: team.id,
        teamName: team.name,
        totalCount: team.fishCount || 0,
        totalWeight: team.totalWeight || 0
      }));

      // Fish type distribution
      const fishTypes = { scaly: 0, mirror: 0 };
      catches.forEach(catch_ => {
        if (catch_.fishType === 'scaly') fishTypes.scaly += 1;
        else if (catch_.fishType === 'mirror') fishTypes.mirror += 1;
      });

      const totalFish = fishTypes.scaly + fishTypes.mirror;
      const fishTypeDistribution = [
        {
          type: 'Common Carp' as const,
          weight: Math.round(catches.filter(c => c.fishType === 'scaly').reduce((sum, c) => sum + Number(c.weight), 0) * 10) / 10,
          count: fishTypes.scaly,
          percentage: totalFish > 0 ? Math.round((fishTypes.scaly / totalFish) * 100) : 0
        },
        {
          type: 'Mirror Carp' as const,
          weight: Math.round(catches.filter(c => c.fishType === 'mirror').reduce((sum, c) => sum + Number(c.weight), 0) * 10) / 10,
          count: fishTypes.mirror,
          percentage: totalFish > 0 ? Math.round((fishTypes.mirror / totalFish) * 100) : 0
        }
      ].filter(item => item.count > 0 || item.weight > 0); // Only return types that have data

      // Top fish
      const topFish = catches
        .sort((a, b) => Number(b.weight) - Number(a.weight))
        .slice(0, 5)
        .map(catch_ => {
          const team = teams.find(t => t.id === catch_.teamId);
          return {
            teamName: team?.name || 'Unknown Team',
            weight: Number(catch_.weight),
            fishType: catch_.fishType === 'scaly' ? 'Common Carp' as const : 'Mirror Carp' as const,
            catchTime: catch_.submittedAt
          };
        });

      // Team Top 3 and Top 5 average weights
      const teamTop3Average = teams.map(team => {
        const teamCatches = catches
          .filter(catch_ => catch_.teamId === team.id)
          .sort((a, b) => Number(b.weight) - Number(a.weight))
          .slice(0, 3);
        
        const averageWeight = teamCatches.length > 0 
          ? Math.round((teamCatches.reduce((sum, catch_) => sum + Number(catch_.weight), 0) / teamCatches.length) * 10) / 10
          : 0;
        
        return {
          teamId: team.id,
          teamName: team.name,
          averageWeight,
          fishCount: teamCatches.length,
          maxFish: 3
        };
      }).filter(team => team.fishCount > 0).sort((a, b) => b.averageWeight - a.averageWeight).slice(0, 5);

      const teamTop5Average = teams.map(team => {
        const teamCatches = catches
          .filter(catch_ => catch_.teamId === team.id)
          .sort((a, b) => Number(b.weight) - Number(a.weight))
          .slice(0, 5);
        
        const averageWeight = teamCatches.length > 0 
          ? Math.round((teamCatches.reduce((sum, catch_) => sum + Number(catch_.weight), 0) / teamCatches.length) * 10) / 10
          : 0;
        
        return {
          teamId: team.id,
          teamName: team.name,
          averageWeight,
          fishCount: teamCatches.length,
          maxFish: 5
        };
      }).filter(team => team.fishCount > 0).sort((a, b) => b.averageWeight - a.averageWeight).slice(0, 5);

      // Get all unique sectors from teams only (teams define valid sectors)
      const allSectors = new Set<string>();
      teams.forEach(team => {
        if (team.sector) allSectors.add(team.sector);
      });

      // Sector Performance (overall stats per sector)
      const sectorPerformance = Array.from(allSectors).map(sector => {
        const sectorCatches = catches.filter(catch_ => catch_.sector === sector);
        const totalWeight = sectorCatches.reduce((sum, catch_) => sum + Number(catch_.weight), 0);
        const totalCount = sectorCatches.length;
        const averageWeight = totalCount > 0 ? Math.round((totalWeight / totalCount) * 10) / 10 : 0;
        
        return {
          sector: `Sektor ${sector}`,
          totalWeight: Math.round(totalWeight * 10) / 10,
          totalCount,
          averageWeight
        };
      }).filter(s => s.totalCount > 0).sort((a, b) => b.totalWeight - a.totalWeight);

      // Sector Timeline (daily aggregation by sector)
      const sectorTimeline: Record<string, Array<{ time: string; totalWeight: number; totalCount: number; dayIndex: number; date: string; sector: string }>> = {};
      
      Array.from(allSectors).forEach(sector => {
        const sectorCatches = catches.filter(catch_ => catch_.sector === sector);
        
        // Group sector catches by day
        const sectorCatchesByDay = sectorCatches.reduce((acc, catch_) => {
          if (!catch_.submittedAt) return acc;
          const catchDate = new Date(catch_.submittedAt);
          const daysSinceStart = Math.floor((catchDate.getTime() - competitionStart.getTime()) / (1000 * 60 * 60 * 24));
          const dayKey = Math.max(0, daysSinceStart);
          
          if (!acc[dayKey]) {
            acc[dayKey] = { weight: 0, count: 0 };
          }
          acc[dayKey].weight += Number(catch_.weight);
          acc[dayKey].count += 1;
          return acc;
        }, {} as Record<number, { weight: number; count: number }>);

        // Create timeline for this sector
        let cumulativeWeight = 0;
        let cumulativeCount = 0;
        const sectorTimelineData = [];
        
        for (let day = 0; day < Math.max(1, totalCompetitionDays); day++) {
          const dayDate = new Date(competitionStart);
          dayDate.setDate(dayDate.getDate() + day);
          
          const isFutureDay = dayDate > currentDate;
          const dayData = isFutureDay ? { weight: 0, count: 0 } : (sectorCatchesByDay[day] || { weight: 0, count: 0 });
          
          if (!isFutureDay) {
            cumulativeWeight += dayData.weight;
            cumulativeCount += dayData.count;
          }
          
          sectorTimelineData.push({
            time: dayDate.toISOString(),
            totalWeight: Math.round(cumulativeWeight * 10) / 10,
            totalCount: cumulativeCount,
            dayIndex: day,
            date: dayDate.toISOString().split('T')[0],
            sector: `Sektor ${sector}`
          });
        }
        
        sectorTimeline[sector] = sectorTimelineData;
      });

      // Sector Fish Type Distribution
      const sectorFishTypes: Record<string, { sector: string; scaly: number; mirror: number; scalyWeight: number; mirrorWeight: number }> = {};
      
      Array.from(allSectors).forEach(sector => {
        const sectorCatches = catches.filter(catch_ => catch_.sector === sector);
        const scalyCatches = sectorCatches.filter(c => c.fishType === 'scaly');
        const mirrorCatches = sectorCatches.filter(c => c.fishType === 'mirror');
        
        sectorFishTypes[sector] = {
          sector: `Sektor ${sector}`,
          scaly: scalyCatches.length,
          mirror: mirrorCatches.length,
          scalyWeight: Math.round(scalyCatches.reduce((sum, c) => sum + Number(c.weight), 0) * 10) / 10,
          mirrorWeight: Math.round(mirrorCatches.reduce((sum, c) => sum + Number(c.weight), 0) * 10) / 10
        };
      });

      // Hourly Distribution (catches by hour of day)
      const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
        const hourCatches = catches.filter(catch_ => {
          if (!catch_.submittedAt) return false;
          const catchHour = new Date(catch_.submittedAt).getHours();
          return catchHour === hour;
        });
        
        return {
          hour,
          hourLabel: `${hour.toString().padStart(2, '0')}:00`,
          count: hourCatches.length,
          totalWeight: Math.round(hourCatches.reduce((sum, c) => sum + Number(c.weight), 0) * 10) / 10
        };
      });

      const stats = {
        timeline,
        weightCategories: weightCategories.filter(cat => cat.total > 0),
        topFish,
        teamPerformance,
        fishTypeDistribution,
        sectorPerformance,
        averageWeights: [],
        teamTop3Average,
        teamTop5Average,
        // New sector data
        sectorTimeline,
        sectorFishTypes: Object.values(sectorFishTypes).filter(s => s.scaly > 0 || s.mirror > 0),
        // New hourly data
        hourlyDistribution,
        specialMilestones: [],
        dailyBigFish: [],
        recordProgression: [],
        weightMilestones: [],
        specialCompetitions: [],
        teamEfficiency: []
      };

      res.json(stats);
    } catch (error) {
      console.error("Error fetching competition stats:", error);
      res.status(500).json({ message: "Failed to fetch competition stats" });
    }
  });

  // Team routes
  app.get('/api/competitions/:id/teams', checkPartialResultBlocking, async (req, res) => {
    try {
      const teams = await storage.getTeamsByCompetition(req.params.id);
      
      // Apply partial blocking filter if active
      if ((req as any).partialBlocking) {
        console.log(`[ResultBlocking] Applying partial blocking to teams data`);
        
        // Return sanitized team data - show basic info but hide scores/statistics
        const sanitizedTeams = teams.map(team => ({
          id: team.id,
          name: team.name,
          competitionId: team.competitionId,
          status: team.status,
          sector: team.sector,
          sectorName: team.sectorName,
          placeName: team.placeName,
          photoUrl: team.photoUrl,
          country: team.country,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          // Explicitly hide scoring/ranking fields during blocking
          totalWeight: null,
          fishCount: null,
          position: null
        }));
        
        res.json(sanitizedTeams);
      } else {
        res.json(teams);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Get team details and their catches
  app.get('/api/teams/:id', checkPartialResultBlockingByTeam, async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const catches = await storage.getCatchesByTeam(req.params.id);
      
      // Apply partial blocking filter if active
      if ((req as any).partialBlocking) {
        console.log(`[ResultBlocking] Applying partial blocking to team detail data`);
        
        // Return sanitized team and catch data
        const sanitizedTeam = {
          id: team.id,
          name: team.name,
          competitionId: team.competitionId,
          status: team.status,
          sector: team.sector,
          sectorName: team.sectorName,
          placeName: team.placeName,
          photoUrl: team.photoUrl,
          country: team.country,
          createdAt: team.createdAt,
          updatedAt: team.updatedAt,
          // Hide scores/statistics during blocking
          totalWeight: null,
          fishCount: null,
          position: null
        };
        
        // Hide detailed catch information during blocking - just show count
        const sanitizedCatches = catches.map(catch_ => ({
          id: catch_.id,
          submittedAt: catch_.submittedAt,
          // Hide detailed catch data during blocking
          fishType: null,
          weight: null,
          length: null,
          photoUrl: null
        }));
        
        res.json({ ...sanitizedTeam, catches: sanitizedCatches });
      } else {
        res.json({ ...team, catches });
      }
    } catch (error) {
      console.error("Error fetching team details:", error);
      res.status(500).json({ message: "Failed to fetch team details" });
    }
  });

  app.post('/api/competitions/:id/teams', upload.fields([
    { name: 'teamPhoto', maxCount: 1 },
    { name: 'memberPhoto_0', maxCount: 1 },
    { name: 'memberPhoto_1', maxCount: 1 },
    { name: 'memberPhoto_2', maxCount: 1 },
    { name: 'memberPhoto_3', maxCount: 1 },
    { name: 'memberPhoto_4', maxCount: 1 },
    { name: 'memberPhoto_5', maxCount: 1 },
  ]), async (req: any, res) => {
    try {
      let teamPhotoUrl = null;
      if (req.files && req.files.teamPhoto && req.files.teamPhoto[0]) {
        try {
          const file = req.files.teamPhoto[0];
          const photoId = `team-${Date.now()}`;
          const imageMetadata = await ImageService.processImage(
            file.path,
            path.join('uploads', 'teams', photoId),
            photoId,
            undefined, undefined, undefined,
            `competition_photos/${req.params.id}/teams`
          );
          const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 400, 'webp') ||
                              ImageService.getBestVariantForWidth(imageMetadata.variants, 400, 'jpeg') ||
                              imageMetadata.variants[0];
          teamPhotoUrl = bestVariant?.url ?? null;
          await ImageService.cleanupTempFile(file.path);
        } catch (error) {
          console.error("[TeamPhoto] Processing failed:", error);
          try { await ImageService.cleanupTempFile(file.path); } catch {}
          teamPhotoUrl = null; // optional — team created without photo
        }
      }

      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      const maxMembers = competition.teamSize ?? 1;
      const membersArray = req.body.members && Array.isArray(req.body.members) ? req.body.members : [];
      if (membersArray.length > maxMembers) {
        return res.status(400).json({ message: `Tím môže mať maximálne ${maxMembers} ${maxMembers === 1 ? 'člena' : 'členov'}` });
      }

      const teamData = insertTeamSchema.parse({
        ...req.body,
        competitionId: req.params.id,
        photoUrl: teamPhotoUrl,
      });
      
      const team = await storage.createTeam(teamData);
      
      if (req.body.members && Array.isArray(req.body.members)) {
        for (let index = 0; index < req.body.members.length; index++) {
          const memberData = req.body.members[index];
          
          let memberPhotoUrl = null;
          if (req.files && req.files[`memberPhoto_${index}`] && req.files[`memberPhoto_${index}`][0]) {
            try {
              const file = req.files[`memberPhoto_${index}`][0];
              const photoId = `member-${index}-${Date.now()}`;
              const imageMetadata = await ImageService.processImage(
                file.path,
                path.join('uploads', 'members', photoId),
                photoId,
                undefined, undefined, undefined,
                `competition_photos/${req.params.id}/members`
              );
              const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 200, 'webp') ||
                                  ImageService.getBestVariantForWidth(imageMetadata.variants, 200, 'jpeg') ||
                                  imageMetadata.variants[0];
              memberPhotoUrl = bestVariant?.url ?? null;
              await ImageService.cleanupTempFile(file.path);
            } catch (error) {
              console.error("[MemberPhoto] Processing failed:", error);
              try { await ImageService.cleanupTempFile(file.path); } catch {}
              memberPhotoUrl = null; // optional — member created without photo
            }
          }
          
          const member = insertTeamMemberSchema.parse({
            ...memberData,
            teamId: team.id,
            photoUrl: memberPhotoUrl,
          });
          await storage.addTeamMember(member);
        }
      }
      
      // Broadcast team creation
      broadcast({ 
        type: 'team_created', 
        teamId: team.id, 
        competitionId: req.params.id, 
        payload: team 
      });
      
      res.status(201).json(team);
    } catch (error) {
      console.error("Error creating team:", error);
      res.status(500).json({ message: "Failed to create team" });
    }
  });

  app.patch('/api/teams/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update team status" });
      }

      // Get the team to find which competition it belongs to
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get the competition to validate sector places
      const competition = await storage.getCompetition(team.competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && competition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only update teams in your own competitions" });
      }

      // Validate the request data using competition-specific schema
      const validationSchema = createTeamStatusValidationSchema(competition);
      const validationResult = validationSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Invalid request data";
        return res.status(400).json({ 
          message: errorMessage,
          errors: validationResult.error.errors 
        });
      }

      const { status, sector, sectorName, placeName } = validationResult.data;

      // Check uniqueness if sector place assignment is being made and status is approved
      if (status === "approved" && sectorName && placeName) {
        const isAvailable = await storage.checkSectorPlaceAvailability(
          team.competitionId,
          sectorName,
          placeName,
          req.params.id // Exclude current team from check
        );

        if (!isAvailable) {
          return res.status(409).json({ 
            message: `Miesto "${placeName}" v sektore "${sectorName}" je už obsadené iným tímom`,
            conflictType: "sector_place_taken"
          });
        }
      }

      // Update team status
      await storage.updateTeamStatus(req.params.id, status, sector, sectorName, placeName);
      
      // Broadcast team status update
      broadcast({ 
        type: 'team_status_updated', 
        teamId: req.params.id, 
        competitionId: team.competitionId, 
        payload: { id: req.params.id, status, sector, sectorName, placeName } 
      });
      
      res.json({ message: "Team status updated successfully" });
    } catch (error) {
      console.error("Error updating team status:", error);
      res.status(500).json({ message: "Failed to update team status" });
    }
  });

  app.delete('/api/teams/:teamId/members/:memberId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);

      // Dual-layer auth: captain of this team OR organizer of the competition (with audit log + reason)
      const auth = await assertTeamCaptainOrOrganizer(userId, req.params.teamId, res, user ?? null, {
        auditAction: 'REMOVE_MEMBER',
        auditReason: req.body?.reason,
        targetMemberId: req.params.memberId,
      });
      if (!auth) return;

      const { team } = auth;

      const member = team.members?.find(m => m.id === req.params.memberId);
      if (!member) {
        return res.status(404).json({ message: "Člen tímu nebol nájdený" });
      }

      if (team.members && team.members.length <= 1) {
        return res.status(400).json({ message: "Tím musí mať aspoň jedného člena" });
      }

      // If removing captain, promote next member automatically
      if (member.role === 'captain' && team.members && team.members.length > 1) {
        const nextMember = team.members.find(m => m.id !== req.params.memberId);
        if (nextMember) {
          await storage.updateTeamMemberRole(nextMember.id, 'captain');
        }
      }

      await storage.deleteTeamMember(req.params.memberId);

      broadcast({
        type: 'team_updated',
        teamId: req.params.teamId,
        competitionId: team.competitionId,
        payload: { action: 'member_removed', memberId: req.params.memberId }
      });

      res.json({ message: "Člen tímu bol odstránený" });
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Nepodarilo sa odstrániť člena tímu" });
    }
  });

  app.patch('/api/teams/:teamId/members/:memberId/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);

      // Dual-layer auth: captain of this team OR organizer of the competition (with audit log + reason)
      const auth = await assertTeamCaptainOrOrganizer(userId, req.params.teamId, res, user ?? null, {
        auditAction: 'CHANGE_ROLE',
        auditReason: req.body?.reason,
        targetMemberId: req.params.memberId,
      });
      if (!auth) return;

      const { team } = auth;

      const member = team.members?.find(m => m.id === req.params.memberId);
      if (!member) {
        return res.status(404).json({ message: "Člen tímu nebol nájdený" });
      }

      const { role } = req.body;
      if (!role || !['captain', 'member'].includes(role)) {
        return res.status(400).json({ message: "Neplatná rola" });
      }

      // Ensure only one captain per team
      if (role === 'captain') {
        const currentCaptain = team.members?.find(m => m.role === 'captain');
        if (currentCaptain) {
          await storage.updateTeamMemberRole(currentCaptain.id, 'member');
        }
      }

      await storage.updateTeamMemberRole(req.params.memberId, role);

      broadcast({
        type: 'team_updated',
        teamId: req.params.teamId,
        competitionId: team.competitionId,
        payload: { action: 'role_changed', memberId: req.params.memberId, role }
      });

      res.json({ message: "Rola člena tímu bola zmenená" });
    } catch (error) {
      console.error("Error updating team member role:", error);
      res.status(500).json({ message: "Nepodarilo sa zmeniť rolu člena tímu" });
    }
  });

  // Update team details
  app.patch('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update team details" });
      }

      // Get the team to find which competition it belongs to
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      // Get the competition to validate sector places
      const competition = await storage.getCompetition(team.competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && competition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only update teams in your own competitions" });
      }

      // Validate the request data
      const validationResult = updateTeamSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        const errorMessage = validationResult.error.errors[0]?.message || "Invalid request data";
        return res.status(400).json({ 
          message: errorMessage,
          errors: validationResult.error.errors 
        });
      }

      const updateData = validationResult.data;

      // Check sector/place availability if they are being updated
      if (updateData.sectorName && updateData.placeName) {
        const isAvailable = await storage.checkSectorPlaceAvailability(
          team.competitionId,
          updateData.sectorName,
          updateData.placeName,
          req.params.id // Exclude current team from check
        );

        if (!isAvailable) {
          return res.status(409).json({ 
            message: `Miesto "${updateData.placeName}" v sektore "${updateData.sectorName}" je už obsadené iným tímom`,
            conflictType: "sector_place_taken"
          });
        }
      }

      // Update team
      const updatedTeam = await storage.updateTeam(req.params.id, updateData);
      
      // Broadcast team update
      broadcast({ 
        type: 'team_updated', 
        teamId: req.params.id, 
        competitionId: updatedTeam.competitionId, 
        payload: updatedTeam 
      });
      
      res.json(updatedTeam);
    } catch (error) {
      console.error("Error updating team:", error);
      res.status(500).json({ message: "Failed to update team" });
    }
  });

  // Referee routes
  app.get('/api/competitions/:id/referees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can view referees" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only view referees from your own competitions" });
        }
      }

      const referees = await storage.getRefereesByCompetition(req.params.id);
      res.json(referees);
    } catch (error) {
      console.error("Error fetching referees:", error);
      res.status(500).json({ message: "Failed to fetch referees" });
    }
  });

  app.post('/api/competitions/:id/referees', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = getUserId(req);
      const currentUser = await storage.getUser(currentUserId);
      
      if (currentUser?.role !== 'organizer' && currentUser?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can create referees" });
      }

      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (currentUser?.role === 'organizer' && competition.organizerId !== currentUserId) {
        return res.status(403).json({ message: "You can only create referees for your own competitions" });
      }

      const { userId, email, assignedSector = 'all' } = req.body;
      let refereeUserId = userId;

      // If email provided instead of userId, try to find the user
      if (!refereeUserId && email) {
        const existingUser = await storage.getUserByEmail(email);
        if (existingUser) {
          refereeUserId = existingUser.id;
        } else {
          // User not found - send email invitation
          const organizerName = currentUser?.firstName && currentUser?.lastName 
            ? `${currentUser.firstName} ${currentUser.lastName}` 
            : currentUser?.email || 'Organizátor';
          
          const baseUrl = process.env.APP_ORIGIN || 
            (process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}` : 'http://localhost:5000');
          const registerUrl = `${baseUrl}/register`;
          
          const emailSent = await emailService.sendRefereeInvitationEmail(
            email,
            competition.name,
            organizerName,
            registerUrl
          );
          
          if (emailSent) {
            return res.status(200).json({ 
              message: "Pozvánka bola odoslaná na email. Po registrácii ho budete môcť pridať ako rozhodcu.",
              invitationSent: true,
              email: email
            });
          } else {
            return res.status(500).json({ 
              message: "Nepodarilo sa odoslať pozvánku. Skúste to prosím neskôr."
            });
          }
        }
      }

      if (!refereeUserId) {
        return res.status(400).json({ message: "userId alebo email je povinný" });
      }

      // Check if user is already a referee for this competition
      const existingReferee = await storage.getRefereeByUserAndCompetition(refereeUserId, req.params.id);
      if (existingReferee) {
        return res.status(400).json({ message: "Tento používateľ je už rozhodcom tejto súťaže" });
      }

      // Update user role to referee if not already
      const refereeUser = await storage.getUser(refereeUserId);
      if (refereeUser && refereeUser.role === 'public') {
        await storage.updateUserRole(refereeUserId, 'referee');
      }

      const refereeData = insertRefereeSchema.parse({
        userId: refereeUserId,
        competitionId: req.params.id,
        assignedSector: assignedSector,
      });
      
      const referee = await storage.createReferee(refereeData);
      
      // Broadcast referee creation
      broadcast({ 
        type: 'referee_created', 
        competitionId: req.params.id, 
        payload: referee 
      });
      
      res.status(201).json(referee);
    } catch (error) {
      console.error("Error creating referee:", error);
      res.status(500).json({ message: "Failed to create referee" });
    }
  });

  // Get referee assignment for current user and competition
  app.get('/api/competitions/:id/referees/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      // Only allow referees to get their own assignment or organizers to get any assignment
      if (user?.role !== 'referee' && user?.role !== 'organizer') {
        return res.status(403).json({ message: "Access denied" });
      }

      // Referees can only get their own assignment
      if (user?.role === 'referee' && userId !== req.params.userId) {
        return res.status(403).json({ message: "Referees can only view their own assignment" });
      }

      const referee = await storage.getRefereeByUserAndCompetition(req.params.userId, req.params.id);
      if (!referee) {
        return res.status(404).json({ message: "Referee assignment not found" });
      }
      
      res.json(referee);
    } catch (error) {
      console.error("Error fetching referee assignment:", error);
      res.status(500).json({ message: "Failed to fetch referee assignment" });
    }
  });

  // PATCH referee endpoint (update referee)
  app.patch('/api/competitions/:id/referees/:refereeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update referees" });
      }

      // Verify competition exists and ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only update referees in your own competitions" });
        }
      }

      // Validate the request data using partial referee schema
      const updateSchema = insertRefereeSchema.partial();
      const validationResult = updateSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid request data",
          errors: validationResult.error.errors 
        });
      }

      const updatedReferee = await storage.updateReferee(req.params.refereeId, validationResult.data);
      
      // Broadcast referee update
      broadcast({ 
        type: 'referee_updated', 
        competitionId: req.params.id, 
        payload: updatedReferee 
      });
      
      res.json(updatedReferee);
    } catch (error) {
      console.error("Error updating referee:", error);
      if (error instanceof Error && error.message.includes('not found')) {
        return res.status(404).json({ message: "Referee not found" });
      }
      res.status(500).json({ message: "Failed to update referee" });
    }
  });

  // DELETE referee endpoint
  app.delete('/api/competitions/:id/referees/:refereeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can delete referees" });
      }

      // Verify competition exists and ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only delete referees from your own competitions" });
        }
      }

      await storage.deleteReferee(req.params.refereeId);
      
      // Broadcast referee deletion
      broadcast({ 
        type: 'referee_deleted', 
        competitionId: req.params.id, 
        payload: { id: req.params.refereeId } 
      });
      
      res.json({ message: "Referee deleted successfully" });
    } catch (error) {
      console.error("Error deleting referee:", error);
      res.status(500).json({ message: "Failed to delete referee" });
    }
  });

  // Catch routes
  // Catches list - CACHED for performance (3s TTL - referee needs faster updates)
  app.get('/api/competitions/:id/catches', checkResultBlocking, async (req, res) => {
    try {
      const competitionId = req.params.id;
      const cacheKey = CacheKeys.catches(competitionId);
      
      const catches = await cache.getOrFetch(
        cacheKey,
        CacheTTL.CATCHES_LIST,
        () => storage.getCatchesByCompetition(competitionId)
      );
      
      res.json(catches);
    } catch (error) {
      console.error("Error fetching catches:", error);
      res.status(500).json({ message: "Failed to fetch catches" });
    }
  });

  app.post('/api/catches', (req: any, res, next) => {
    // Custom multer middleware with error handling
    upload.single('photo')(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            message: "Fotka je príliš veľká. Maximálna veľkosť je 10MB." 
          });
        }
        if (err.message === "Only image files are allowed" || err.message === "Povolené sú len obrázkové súbory (JPEG, PNG, GIF)") {
          return res.status(400).json({ 
            message: "Povolené sú len obrázkové súbory (JPEG, PNG, GIF)" 
          });
        }
        return res.status(400).json({ 
          message: "Chyba pri nahrávaní fotky" 
        });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      // Check if competition is in live status before allowing catch submission
      const competition = await storage.getCompetition(req.body.competitionId);
      if (!competition) {
        return res.status(404).json({ message: "Súťaž nebola nájdená" });
      }
      
      if (competition.status !== 'live') {
        return res.status(400).json({ 
          message: `Úlovky sa dajú pridávať len do prebehajúcich súťaží. Súťaž "${competition.name}" je v štádiu: ${competition.status}` 
        });
      }

      // Check authentication - requires login
      const userId = getUserId(req);
      if (!userId) {
        return res.status(401).json({ message: "Pre odoslanie úlovku sa musíte prihlásiť" });
      }
      
      // Get referee assignment for this competition
      const referee = await storage.getRefereeByUserAndCompetition(userId, req.body.competitionId);
      if (!referee) {
        return res.status(403).json({ message: "Nie ste priradený ako rozhodca k tejto súťaži" });
      }

      let photoUrl = null;
      if (req.file) {
        // Sanitize first — referee's phone has GPS enabled by default
        const sanitizedPath = `${req.file.path}-sanitized.jpg`;
        try {
          await ImageService.sanitizeToFile(req.file.path, sanitizedPath);
          await fsPromises.unlink(req.file.path); // delete raw temp immediately
        } catch (sanitizeErr) {
          console.error("[CatchPhoto] Sanitize failed:", sanitizeErr);
          try { await fsPromises.unlink(req.file.path); } catch {}
          return res.status(400).json({ message: "Neplatný obrázkový súbor. Skúste iný." });
        }
        try {
          const photoId = `catch-${Date.now()}`;
          const imageMetadata = await ImageService.processImage(
            sanitizedPath,
            path.join('uploads', 'catches', photoId),
            photoId,
            undefined, undefined, undefined,
            `competition_photos/${req.body.competitionId}/catches`
          );
          const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'webp') ||
                              ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'jpeg') ||
                              imageMetadata.variants[0];
          photoUrl = bestVariant?.url ?? null;
          await ImageService.cleanupTempFile(sanitizedPath);
        } catch (error) {
          console.error("[CatchPhoto] Processing failed:", error);
          try { await ImageService.cleanupTempFile(sanitizedPath); } catch {}
          return res.status(400).json({ message: "Nepodarilo sa spracovať fotku. Skúste iný súbor." });
        }
      }

      // Use server-side referee assignment for sector (security measure)
      // Dynamic validation based on competition's minimum weight
      const catchValidationSchema = createCatchValidationSchema(competition);
      const catchData = catchValidationSchema.parse({
        ...req.body,
        refereeId: referee.id,
        photoUrl,
        weight: req.body.weight, // Frontend already sends weight in kg
        sector: referee.assignedSector, // Always use referee's assigned sector
      });
      
      const newCatch = await storage.createCatch(catchData);
      
      // Invalidate leaderboard cache for this competition
      cache.invalidateCompetition(competition.id);
      
      // Update team stats
      await storage.updateTeamStats(catchData.teamId);
      
      // Get team and competition data for targeted notifications
      const team = await storage.getTeam(catchData.teamId);
      
      if (team) {
        // Send targeted catch notification to users based on preferences and favorites
        await notificationService.notifyCatchCreated(newCatch, team, competition);
        
        // Check if this is a potential biggest fish record (arbitrary threshold of 20kg)
        const weightKg = parseFloat(newCatch.weight);
        if (weightKg >= 20) {
          await notificationService.notifyBiggestFish(newCatch, team, competition, false);
        }
      }
      
      // Keep global broadcast for immediate UI updates (non-targeted real-time sync)
      broadcast({
        type: 'new_catch',
        catch: newCatch,
        competitionId: catchData.competitionId,
      });
      
      res.status(201).json(newCatch);
    } catch (error) {
      console.error("Error creating catch:", error);
      if (error instanceof Error && error.message.includes('validation')) {
        return res.status(400).json({ message: "Neplatné údaje formulára" });
      }
      res.status(500).json({ message: "Nepodarilo sa odoslať záber" });
    }
  });

  // Leaderboard routes - CACHED for performance (5s TTL)
  // One DB calculation serves thousands of viewers
  app.get('/api/competitions/:id/leaderboard', checkResultBlocking, async (req, res) => {
    try {
      const competitionId = req.params.id;
      const cacheKey = CacheKeys.leaderboard(competitionId);
      
      const leaderboard = await cache.getOrFetch(
        cacheKey,
        CacheTTL.LEADERBOARD,
        () => storage.getLeaderboard(competitionId)
      );
      
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Sector statistics route - CACHED for performance (5s TTL)
  app.get('/api/competitions/:id/sectors/:sector/statistics', checkResultBlocking, async (req, res) => {
    try {
      const { id: competitionId, sector } = req.params;
      const cacheKey = CacheKeys.sectorStats(competitionId, sector);
      
      const statistics = await cache.getOrFetch(
        cacheKey,
        CacheTTL.SECTOR_STATS,
        () => storage.getSectorStatistics(competitionId, sector)
      );
      
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching sector statistics:", error);
      res.status(500).json({ message: "Failed to fetch sector statistics" });
    }
  });

  // Sector leaderboards route - CACHED for performance (5s TTL)
  app.get('/api/competitions/:id/sectors/leaderboards', isAuthenticated, checkResultBlocking, async (req, res) => {
    try {
      const { id: competitionId } = req.params;
      
      // Validate limit parameter
      const limitSchema = z.object({
        limit: z.string().optional().transform((val) => {
          if (!val) return 3;
          const parsed = parseInt(val, 10);
          if (isNaN(parsed) || parsed < 1 || parsed > 10) {
            throw new Error('Limit must be a number between 1 and 10');
          }
          return parsed;
        })
      });

      const { limit } = limitSchema.parse(req.query);
      const cacheKey = CacheKeys.sectorLeaderboards(competitionId, limit);
      
      const leaderboards = await cache.getOrFetch(
        cacheKey,
        CacheTTL.LEADERBOARD,
        () => storage.getSectorLeaderboards(competitionId, limit)
      );
      
      res.json(leaderboards);
    } catch (error) {
      console.error("Error fetching sector leaderboards:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid limit parameter" });
      }
      res.status(500).json({ message: "Failed to fetch sector leaderboards" });
    }
  });

  // Sponsor routes
  app.get('/api/competitions/:id/sponsors', async (req, res) => {
    try {
      const sponsors = await storage.getSponsorsByCompetition(req.params.id);
      res.json(sponsors);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
      res.status(500).json({ message: "Failed to fetch sponsors" });
    }
  });

  // Upload sponsor logo
  app.post('/api/sponsors/upload-logo', isAuthenticated, (req: any, res, next) => {
    upload.single('logo')(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            message: "Logo je príliš veľké. Maximálna veľkosť je 10MB." 
          });
        }
        if (err.message === "Only image files are allowed" || err.message === "Povolené sú len obrázkové súbory (JPEG, PNG, GIF)") {
          return res.status(400).json({ 
            message: "Povolené sú len obrázkové súbory (JPEG, PNG, GIF)" 
          });
        }
        return res.status(400).json({ 
          message: "Chyba pri nahrávaní loga" 
        });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      // Check authorization
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can upload sponsor logos" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Žiaden súbor nebol nahratý" });
      }

      let logoUrl: string | null = null;
      try {
        const photoId = `sponsor-logo-${Date.now()}`;
        const imageMetadata = await ImageService.processImage(
          req.file.path,
          path.join('uploads', 'sponsors', photoId),
          photoId,
          undefined, undefined, undefined,
          'sponsor_logos'
        );
        const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 400, 'webp') ||
                            ImageService.getBestVariantForWidth(imageMetadata.variants, 400, 'jpeg') ||
                            imageMetadata.variants[0];
        logoUrl = bestVariant?.url ?? null;
        if (!logoUrl) throw new Error("No variants produced");
        await ImageService.cleanupTempFile(req.file.path);
      } catch (error) {
        console.error("[SponsorLogo] Processing failed:", error);
        try { await ImageService.cleanupTempFile(req.file.path); } catch {}
        return res.status(400).json({ message: "Nepodarilo sa spracovať logo. Skúste iný súbor." });
      }
      res.json({ logoUrl });
    } catch (error) {
      console.error("Error uploading sponsor logo:", error);
      res.status(500).json({ message: "Chyba pri nahrávaní loga" });
    }
  });

  app.post('/api/competitions/:id/sponsors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can add sponsors" });
      }

      // Get competition to check plan tier and ownership
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && competition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only add sponsors to your own competitions" });
      }

      // Check if plan supports sponsors
      if (!competition.planTier || !['pro', 'premium', 'enterprise'].includes(competition.planTier)) {
        return res.status(403).json({ message: "Sponsor functionality is only available in Pro, Premium, and Enterprise plans" });
      }

      const sponsorData = insertSponsorSchema.parse({
        ...req.body,
        competitionId: req.params.id,
      });
      
      const sponsor = await storage.createSponsor(sponsorData);
      
      // Broadcast sponsor creation
      broadcast({ 
        type: 'sponsor_created', 
        competitionId: req.params.id, 
        payload: sponsor 
      });
      
      res.status(201).json(sponsor);
    } catch (error) {
      console.error("Error creating sponsor:", error);
      res.status(500).json({ message: "Failed to create sponsor" });
    }
  });

  // Update sponsor
  app.patch('/api/competitions/:id/sponsors/:sponsorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update sponsors" });
      }

      // Get competition to check plan tier and ownership
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer' && competition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only update sponsors for your own competitions" });
      }

      // Check if plan supports sponsors
      if (!competition.planTier || !['pro', 'premium', 'enterprise'].includes(competition.planTier)) {
        return res.status(403).json({ message: "Sponsor functionality is only available in Pro, Premium, and Enterprise plans" });
      }

      // Verify the sponsor belongs to this competition
      const sponsors = await storage.getSponsorsByCompetition(req.params.id);
      const targetSponsor = sponsors.find(s => s.id === req.params.sponsorId);
      if (!targetSponsor) {
        return res.status(404).json({ message: "Sponsor not found in this competition" });
      }

      // Parse and validate sponsor data (excluding competitionId to prevent tampering)
      const sponsorData = insertSponsorSchema.omit({ competitionId: true }).parse(req.body);
      
      const sponsor = await storage.updateSponsor(req.params.sponsorId, sponsorData);
      
      // Broadcast sponsor update
      broadcast({ 
        type: 'sponsor_updated', 
        competitionId: req.params.id, 
        payload: sponsor 
      });
      
      res.json(sponsor);
    } catch (error) {
      console.error("Error updating sponsor:", error);
      res.status(500).json({ message: "Failed to update sponsor" });
    }
  });

  // Update sponsor
  app.put('/api/competitions/:id/sponsors/:sponsorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update sponsors" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only update sponsors in your own competitions" });
        }
      }

      // Validate request body with partial sponsor schema
      const updateSchema = insertSponsorSchema.partial().omit({ competitionId: true });
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid sponsor data", errors: validation.error.errors });
      }

      // Verify the sponsor belongs to this competition (prevent IDOR)
      const sponsors = await storage.getSponsorsByCompetition(req.params.id);
      const targetSponsor = sponsors.find(s => s.id === req.params.sponsorId);
      if (!targetSponsor) {
        return res.status(404).json({ message: "Sponsor not found in this competition" });
      }

      const sponsor = await storage.updateSponsor(req.params.sponsorId, validation.data);
      
      // Broadcast sponsor update
      broadcast({ 
        type: 'sponsor_updated', 
        competitionId: req.params.id, 
        payload: sponsor 
      });
      
      res.json(sponsor);
    } catch (error) {
      console.error("Error updating sponsor:", error);
      res.status(500).json({ message: "Failed to update sponsor" });
    }
  });

  // Delete sponsor
  app.delete('/api/competitions/:id/sponsors/:sponsorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can delete sponsors" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only delete sponsors from your own competitions" });
        }
      }

      // Verify the sponsor belongs to this competition (prevent IDOR)
      const sponsors = await storage.getSponsorsByCompetition(req.params.id);
      const targetSponsor = sponsors.find(s => s.id === req.params.sponsorId);
      if (!targetSponsor) {
        return res.status(404).json({ message: "Sponsor not found in this competition" });
      }

      await storage.deleteSponsor(req.params.sponsorId);
      
      // Broadcast sponsor deletion
      broadcast({ 
        type: 'sponsor_deleted', 
        competitionId: req.params.id, 
        payload: { id: req.params.sponsorId } 
      });
      
      res.json({ message: "Sponsor deleted successfully" });
    } catch (error) {
      console.error("Error deleting sponsor:", error);
      res.status(500).json({ message: "Failed to delete sponsor" });
    }
  });

  // Export teams
  app.get('/api/competitions/:id/export/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can export data" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only export data from your own competitions" });
        }
      }

      const teams = await storage.getTeamsByCompetition(req.params.id);
      
      // Convert to CSV format
      const csvHeader = 'ID,Name,Captain,Members,Status,Registration Date\n';
      const csvData = teams.map(team => {
        const members = team.members?.map(m => `${m.name} (${m.email})`).join('; ') || '';
        const captainName = team.members?.find(m => m.role === 'captain')?.name || 'N/A';
        return `${team.id},"${team.name}","${captainName}","${members}",${team.status},${team.updatedAt || team.createdAt || 'N/A'}`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="teams-${req.params.id}.csv"`);
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error("Error exporting teams:", error);
      res.status(500).json({ message: "Failed to export teams" });
    }
  });

  // Export catches
  app.get('/api/competitions/:id/export/catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can export data" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only export data from your own competitions" });
        }
      }

      const catches = await storage.getCatchesByCompetition(req.params.id);
      
      // Convert to CSV format
      const csvHeader = 'ID,Team,Fish Species,Weight,Length,Points,Catch Time,Verified\n';
      const csvData = catches.map(c => {
        return `${c.id},"${c.team?.name || 'Unknown'}","${c.fishType}",${c.weight},,${c.weight},${c.submittedAt || 'N/A'},${c.isVerified ? 'Yes' : 'No'}`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="catches-${req.params.id}.csv"`);
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error("Error exporting catches:", error);
      res.status(500).json({ message: "Failed to export catches" });
    }
  });

  // Export results
  app.get('/api/competitions/:id/export/results', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can export data" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only export data from your own competitions" });
        }
      }

      const teams = await storage.getTeamsByCompetition(req.params.id);
      
      // Sort by total weight descending
      const sortedTeams = teams.sort((a, b) => (parseFloat(b.totalWeight || '0') || 0) - (parseFloat(a.totalWeight || '0') || 0));
      
      // Convert to CSV format
      const csvHeader = 'Position,Team Name,Captain,Total Points,Total Weight,Fish Count\n';
      const csvData = sortedTeams.map((team, index) => {
        const captainName = team.members?.find(m => m.role === 'captain')?.name || 'N/A';
        return `${index + 1},"${team.name}","${captainName}",${team.totalWeight || 0},${team.totalWeight || 0},${team.fishCount || 0}`;
      }).join('\n');
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="results-${req.params.id}.csv"`);
      res.send(csvHeader + csvData);
    } catch (error) {
      console.error("Error exporting results:", error);
      res.status(500).json({ message: "Failed to export results" });
    }
  });

  // QR Code for competition - generates QR linking to competition detail page
  app.get('/api/competitions/:id/qr', async (req, res) => {
    try {
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      // Get the base URL from request headers or use default
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      const competitionUrl = `${baseUrl}/competition/${req.params.id}`;

      // Generate QR code as PNG buffer
      const qrBuffer = await QRCode.toBuffer(competitionUrl, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qr-competition-${req.params.id}.png"`);
      res.send(qrBuffer);
    } catch (error) {
      console.error("Error generating competition QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // QR Code data URL for competition (for embedding in UI)
  app.get('/api/competitions/:id/qr/data', async (req, res) => {
    try {
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      const competitionUrl = `${baseUrl}/competition/${req.params.id}`;

      const qrDataUrl = await QRCode.toDataURL(competitionUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      res.json({ 
        qrDataUrl, 
        url: competitionUrl,
        competitionName: competition.name 
      });
    } catch (error) {
      console.error("Error generating competition QR data:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Helper function for admin role check
  function isAdmin(user: any): boolean {
    return user && user.role === 'admin';
  }

  // Admin dashboard endpoint
  app.get('/api/admin/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can access dashboard" });
      }

      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Admin activity feed - all recent catches
  app.get('/api/admin/activity-catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can access activity feed" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const catches = await storage.getAllRecentCatches(Math.min(limit, 100));
      res.json(catches);
    } catch (error) {
      console.error("Error fetching activity catches:", error);
      res.status(500).json({ message: "Failed to fetch activity catches" });
    }
  });

  // Admin registrations management endpoints
  app.get('/api/admin/registrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can manage registrations" });
      }

      const status = req.query.status as string | undefined;
      const registrations = await storage.getCompetitionRegistrations(status);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.get('/api/admin/registrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can view registration details" });
      }

      const registration = await storage.getCompetitionRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }
      
      res.json(registration);
    } catch (error) {
      console.error("Error fetching registration:", error);
      res.status(500).json({ message: "Failed to fetch registration" });
    }
  });

  app.patch('/api/admin/registrations/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can approve registrations" });
      }

      const result = await storage.approveCompetitionRegistration(req.params.id, userId);
      
      // Send registration confirmation email to organizer
      const appOrigin = process.env.APP_ORIGIN || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const setupUrl = `${appOrigin}/organizer/competition/${result.competition.id}`;
      
      emailService.sendRegistrationConfirmationEmail(
        result.registration.contactEmail,
        result.competition.name,
        setupUrl
      ).catch(err => {
        console.error('[Email] Failed to send registration confirmation email:', err);
      });
      
      res.json({ 
        message: "Registration approved and competition created successfully",
        registration: result.registration,
        competition: result.competition
      });
    } catch (error) {
      console.error("Error approving registration:", error);
      const message = error instanceof Error ? error.message : "Failed to approve registration";
      res.status(400).json({ message });
    }
  });

  app.patch('/api/admin/registrations/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can decline registrations" });
      }

      const registration = await storage.declineCompetitionRegistration(req.params.id);
      res.json({ 
        message: "Registration declined successfully",
        registration
      });
    } catch (error) {
      console.error("Error declining registration:", error);
      const message = error instanceof Error ? error.message : "Failed to decline registration";
      res.status(400).json({ message });
    }
  });

  // Admin user management endpoints
  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can manage users" });
      }

      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.put('/api/admin/users/:userId/role', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can update user roles" });
      }

      // Zod validation for role
      const roleSchema = z.object({
        role: z.enum(['public', 'organizer', 'referee', 'admin'])
      });
      
      const validation = roleSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid role. Must be one of: public, organizer, referee, admin" });
      }

      const { role } = validation.data;
      const targetUserId = req.params.userId;

      const updatedUser = await storage.updateUserRole(targetUserId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  app.put('/api/admin/users/:userId/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can update user status" });
      }

      // Zod validation for status
      const statusSchema = z.object({
        active: z.boolean()
      });
      
      const validation = statusSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid status. Active must be boolean" });
      }

      const { active } = validation.data;
      const targetUserId = req.params.userId;

      const updatedUser = await storage.updateUserStatus(targetUserId, active);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({ message: "Failed to update user status" });
    }
  });

  app.put('/api/admin/users/:userId/premium', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can update premium status" });
      }

      // Zod validation for premium status
      const premiumSchema = z.object({
        isPremium: z.boolean()
      });
      
      const validation = premiumSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid premium status. isPremium must be boolean" });
      }

      const { isPremium } = validation.data;
      const targetUserId = req.params.userId;

      const updatedUser = await storage.updateUserPremiumStatus(targetUserId, isPremium);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating premium status:", error);
      res.status(500).json({ message: "Failed to update premium status" });
    }
  });

  // Get user detail for admin panel
  app.get('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can view user details" });
      }

      const targetUser = await storage.getUser(req.params.userId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Remove password from response
      const { password: _, ...userWithoutPassword } = targetUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user detail:", error);
      res.status(500).json({ message: "Failed to fetch user detail" });
    }
  });

  // Get complete user profile for admin (read-only, invisible to user)
  app.get('/api/admin/users/:userId/profile', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = getUserId(req);
      const adminUser = await storage.getUser(adminUserId);
      
      if (!isAdmin(adminUser)) {
        return res.status(403).json({ message: "Only admins can view user profiles" });
      }

      const targetUserId = req.params.userId;
      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      // Fetch all related user data in parallel
      const [
        userTeams,
        favoriteCompetitions,
        favoriteTeams,
        diaryCatches,
        diaryTrips,
        battles,
        friends,
        seasonGoals,
        subscription,
        notificationPreferences
      ] = await Promise.all([
        storage.getTeamMembershipsByUser(targetUserId),
        storage.getUserFavoriteCompetitions(targetUserId),
        storage.getUserFavoriteTeams(targetUserId),
        storage.getAllUserCatches(targetUserId),
        storage.getDiaryTrips(targetUserId),
        storage.getAllUserBattles(targetUserId),
        storage.getUserFriends(targetUserId),
        storage.getUserSeasonGoals(targetUserId),
        storage.getUserSubscription(targetUserId),
        storage.getUserNotificationPreferences(targetUserId)
      ]);

      // Remove sensitive data from response
      const { password: _, verificationToken: __, ...userWithoutSensitive } = targetUser;

      // Build comprehensive profile response
      const profile = {
        user: userWithoutSensitive,
        teams: userTeams || [],
        favoriteCompetitions: favoriteCompetitions || [],
        favoriteTeams: favoriteTeams || [],
        diaryCatches: diaryCatches || [],
        diaryTrips: diaryTrips || [],
        battles: battles || [],
        friends: (friends || []).map((f: any) => {
          const { password: _, ...friendWithoutPassword } = f;
          return friendWithoutPassword;
        }),
        seasonGoals: seasonGoals || [],
        subscription: subscription || null,
        notificationPreferences: notificationPreferences || null,
        statistics: {
          totalTeams: userTeams?.length || 0,
          totalDiaryCatches: diaryCatches?.length || 0,
          totalTrips: diaryTrips?.length || 0,
          totalBattles: battles?.length || 0,
          totalFriends: friends?.length || 0
        }
      };

      res.json(profile);
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update user profile (admin)
  app.put('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can update users" });
      }

      // Zod validation for user update
      const updateSchema = z.object({
        email: z.string().email().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        nickname: z.string().optional(),
        role: z.enum(['public', 'organizer', 'referee', 'admin']).optional(),
        active: z.boolean().optional(),
      });
      
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid update data", errors: validation.error.errors });
      }

      const targetUserId = req.params.userId;
      const updatedUser = await storage.updateUser(targetUserId, validation.data);
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Delete user (admin)
  app.delete('/api/admin/users/:userId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can delete users" });
      }

      const targetUserId = req.params.userId;
      
      // Prevent admin from deleting themselves
      if (targetUserId === userId) {
        return res.status(400).json({ message: "You cannot delete your own account" });
      }

      const targetUser = await storage.getUser(targetUserId);
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await storage.deleteUser(targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Reset user password (admin) - sends password reset email
  app.post('/api/admin/users/:userId/reset-password', isAuthenticated, passwordResetLimiter, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can reset passwords" });
      }

      const targetUserId = req.params.userId;
      const targetUser = await storage.getUser(targetUserId);
      
      if (!targetUser) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!targetUser.email) {
        return res.status(400).json({ message: "User has no email address" });
      }

      // Generate password reset token
      const resetToken = generateVerificationToken();
      const resetTokenExpires = generateTokenExpiration();
      
      // Save reset token to database
      await storage.setPasswordResetToken(targetUserId, resetToken, resetTokenExpires);

      // Send password reset email
      const emailSent = await emailService.sendPasswordResetEmail(
        targetUser.email,
        targetUser.firstName || 'User',
        resetToken
      );

      if (!emailSent) {
        return res.status(500).json({ message: "Failed to send password reset email" });
      }

      res.json({ 
        message: "Password reset email sent successfully",
        email: targetUser.email
      });
    } catch (error) {
      console.error("Error sending password reset email:", error);
      res.status(500).json({ message: "Failed to send password reset email" });
    }
  });

  // Manually set premium with expiry date (admin)
  app.put('/api/admin/users/:userId/premium-manual', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can manage premium manually" });
      }

      // Zod validation for manual premium management
      const premiumManualSchema = z.object({
        isPremium: z.boolean(),
        expiresAt: z.string().nullable().optional(), // ISO date string or null for no expiry
      });
      
      const validation = premiumManualSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid premium data", errors: validation.error.errors });
      }

      const { isPremium, expiresAt } = validation.data;
      const targetUserId = req.params.userId;

      const updatedUser = await storage.updateUserPremiumManual(
        targetUserId, 
        isPremium, 
        expiresAt ? new Date(expiresAt) : null
      );
      
      // Remove password from response
      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating premium manually:", error);
      res.status(500).json({ message: "Failed to update premium" });
    }
  });

  // ============ PROMO CODES ADMIN ROUTES ============

  // Get all promo codes
  app.get('/api/admin/promo-codes', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const promoCodes = await storage.getPromoCodes();
      res.json(promoCodes);
    } catch (error) {
      console.error("Error fetching promo codes:", error);
      res.status(500).json({ message: "Failed to fetch promo codes" });
    }
  });

  // Create new promo code
  app.post('/api/admin/promo-codes', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const promoCodeSchema = z.object({
        code: z.string().min(3).max(50).transform(s => s.toUpperCase()),
        name: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        scope: z.enum(["diary", "competition", "all"]).optional().default("diary"),
        type: z.enum(["percent", "days"]),
        value: z.number().min(1).max(365),
        competitionId: z.string().uuid().optional().nullable(),
        validFrom: z.string(),
        validUntil: z.string(),
        maxUsages: z.number().min(1).optional().nullable(),
        isActive: z.boolean().optional().default(true),
      });

      const validation = promoCodeSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid promo code data", errors: validation.error.errors });
      }

      // Additional business rule validation
      const { type, value, validFrom, validUntil } = validation.data;
      
      // Validate value range based on type
      if (type === 'percent' && (value < 1 || value > 100)) {
        return res.status(400).json({ message: "Percentuálna zľava musí byť medzi 1 a 100" });
      }
      if (type === 'days' && (value < 1 || value > 365)) {
        return res.status(400).json({ message: "Počet dní musí byť medzi 1 a 365" });
      }

      // Validate date range
      const fromDate = new Date(validFrom);
      const untilDate = new Date(validUntil);
      if (fromDate >= untilDate) {
        return res.status(400).json({ message: "Dátum ukončenia musí byť po dátume začiatku" });
      }

      const promoCode = await storage.createPromoCode({
        ...validation.data,
        validFrom: fromDate,
        validUntil: untilDate,
        createdById: req.user.id,
      });

      res.status(201).json(promoCode);
    } catch (error: any) {
      console.error("Error creating promo code:", error);
      if (error.code === '23505') { // Unique constraint violation
        return res.status(400).json({ message: "Promo code already exists" });
      }
      res.status(500).json({ message: "Failed to create promo code" });
    }
  });

  // Update promo code
  app.put('/api/admin/promo-codes/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const promoCodeId = parseInt(req.params.id, 10);
      if (isNaN(promoCodeId)) {
        return res.status(400).json({ message: "Invalid promo code ID" });
      }

      const updateSchema = z.object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        scope: z.enum(["diary", "competition", "all"]).optional(),
        type: z.enum(["percent", "days"]).optional(),
        value: z.number().min(1).max(365).optional(),
        competitionId: z.string().uuid().optional().nullable(),
        validFrom: z.string().optional(),
        validUntil: z.string().optional(),
        maxUsages: z.number().optional().nullable(),
        isActive: z.boolean().optional(),
      });

      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid update data", errors: validation.error.errors });
      }

      const { validFrom, validUntil, type, value, ...rest } = validation.data;
      
      // Validate type/value combination if both are provided
      if (type && value !== undefined) {
        if (type === 'percent' && (value < 1 || value > 100)) {
          return res.status(400).json({ message: "Percentuálna zľava musí byť medzi 1 a 100" });
        }
        if (type === 'days' && (value < 1 || value > 365)) {
          return res.status(400).json({ message: "Počet dní musí byť medzi 1 a 365" });
        }
      }

      // Validate date range if both dates are provided
      if (validFrom && validUntil) {
        const fromDate = new Date(validFrom);
        const untilDate = new Date(validUntil);
        if (fromDate >= untilDate) {
          return res.status(400).json({ message: "Dátum ukončenia musí byť po dátume začiatku" });
        }
      }

      const updateData: Record<string, any> = { ...rest };
      if (type) updateData.type = type;
      if (value !== undefined) updateData.value = value;
      if (validFrom) updateData.validFrom = new Date(validFrom);
      if (validUntil) updateData.validUntil = new Date(validUntil);

      const updatedPromoCode = await storage.updatePromoCode(promoCodeId, updateData);
      res.json(updatedPromoCode);
    } catch (error) {
      console.error("Error updating promo code:", error);
      res.status(500).json({ message: "Failed to update promo code" });
    }
  });

  // Delete promo code
  app.delete('/api/admin/promo-codes/:id', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const promoCodeId = parseInt(req.params.id, 10);
      if (isNaN(promoCodeId)) {
        return res.status(400).json({ message: "Invalid promo code ID" });
      }

      await storage.deletePromoCode(promoCodeId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting promo code:", error);
      res.status(500).json({ message: "Failed to delete promo code" });
    }
  });

  // Toggle promo code active status
  app.patch('/api/admin/promo-codes/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const promoCodeId = parseInt(req.params.id, 10);
      if (isNaN(promoCodeId)) {
        return res.status(400).json({ message: "Invalid promo code ID" });
      }

      const updatedPromoCode = await storage.togglePromoCodeStatus(promoCodeId);
      res.json(updatedPromoCode);
    } catch (error) {
      console.error("Error toggling promo code:", error);
      res.status(500).json({ message: "Failed to toggle promo code" });
    }
  });

  // Apply promo to all users (bulk action)
  app.post('/api/admin/promo-codes/apply-to-all', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const bulkPromoSchema = z.object({
        type: z.enum(["percent", "days"]),
        value: z.number().min(1).max(365),
        description: z.string().optional(),
      });

      const validation = bulkPromoSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid bulk promo data", errors: validation.error.errors });
      }

      const { type, value, description } = validation.data;
      
      if (type === "days") {
        // Add free premium days to all active users
        const result = await storage.applyFreeDaysToAllUsers(value, description || `Bulk promo: ${value} days`);
        res.json({ success: true, affectedUsers: result.affectedUsers });
      } else {
        // For percent discounts, we just create a promo code that users can apply
        res.status(400).json({ message: "Percent discounts require a promo code - cannot be applied directly to all users" });
      }
    } catch (error) {
      console.error("Error applying bulk promo:", error);
      res.status(500).json({ message: "Failed to apply bulk promo" });
    }
  });

  // Get promo code usage statistics
  app.get('/api/admin/promo-codes/:id/stats', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const promoCodeId = parseInt(req.params.id, 10);
      if (isNaN(promoCodeId)) {
        return res.status(400).json({ message: "Invalid promo code ID" });
      }

      const stats = await storage.getPromoCodeStats(promoCodeId);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching promo code stats:", error);
      res.status(500).json({ message: "Failed to fetch promo code stats" });
    }
  });

  // Export promo code users as CSV
  app.get('/api/admin/promo-codes/:id/export', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }

      const promoCodeId = parseInt(req.params.id, 10);
      if (isNaN(promoCodeId)) {
        return res.status(400).json({ message: "Invalid promo code ID" });
      }

      // Get promo code info for filename
      const promoCodes = await storage.getPromoCodes();
      const promoCode = promoCodes.find(p => p.id === promoCodeId);
      if (!promoCode) {
        return res.status(404).json({ message: "Promo code not found" });
      }

      // Parse date filters
      const dateFrom = req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined;
      const dateTo = req.query.dateTo ? new Date(req.query.dateTo as string) : undefined;
      
      // Adjust dateTo to end of day
      if (dateTo) {
        dateTo.setHours(23, 59, 59, 999);
      }

      const users = await storage.getPromoCodeUsersForExport(promoCodeId, dateFrom, dateTo);

      // CSV escape function - handles quotes and formula injection
      const escapeCSV = (value: string): string => {
        if (!value) return '';
        // Escape double quotes by doubling them
        let escaped = value.replace(/"/g, '""');
        // Prevent formula injection by prefixing with single quote if starts with dangerous chars
        if (/^[=+\-@\t\r]/.test(escaped)) {
          escaped = "'" + escaped;
        }
        return `"${escaped}"`;
      };

      // Generate CSV content
      const csvHeader = 'Meno,Priezvisko,Email,Dátum použitia\n';
      const csvRows = users.map(u => 
        `${escapeCSV(u.firstName)},${escapeCSV(u.lastName)},${escapeCSV(u.email)},${escapeCSV(new Date(u.appliedAt).toLocaleDateString('sk-SK'))}`
      ).join('\n');
      const csvContent = csvHeader + csvRows;

      // Set headers for file download
      const filename = `promo_${promoCode.code}_export_${new Date().toISOString().split('T')[0]}.csv`;
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      
      // Add BOM for Excel UTF-8 compatibility
      res.send('\uFEFF' + csvContent);
    } catch (error) {
      console.error("Error exporting promo code users:", error);
      res.status(500).json({ message: "Failed to export promo code users" });
    }
  });

  // Get user's promo code usages
  app.get('/api/admin/users/:id/promo-usages', isAuthenticated, async (req: any, res) => {
    try {
      if (req.user?.role !== 'admin') {
        return res.status(403).json({ message: "Admin access required" });
      }
      const usages = await storage.getUserPromoUsages(req.params.id);
      res.json(usages);
    } catch (error) {
      console.error("Error fetching user promo usages:", error);
      res.status(500).json({ message: "Failed to fetch promo usages" });
    }
  });

  // Competition registration routes
  app.post('/api/competition-registrations', upload.single('competitionLogo'), async (req: any, res) => {
    try {
      let imageUrl = null;
      if (req.file) {
        try {
          const photoId = `comp-logo-${Date.now()}`;
          const imageMetadata = await ImageService.processImage(
            req.file.path,
            path.join('uploads', 'competition-logos', photoId),
            photoId,
            undefined, undefined, undefined,
            'competition_logos'
          );
          const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'webp') ||
                              ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'jpeg') ||
                              imageMetadata.variants[0];
          imageUrl = bestVariant?.url ?? null;
          await ImageService.cleanupTempFile(req.file.path);
        } catch (error) {
          console.error("[RegistrationLogo] Processing failed:", error);
          try { await ImageService.cleanupTempFile(req.file.path); } catch {}
          imageUrl = null; // optional — registration continues without logo
        }
      }

      // Parse complex fields
      let sectorPlaces: Array<{ sectorName: string; places: string[] }> = [];
      let sideCompetitions: string[] = [];
      let branding = null;
      
      if (req.body.sectorPlaces) {
        try {
          sectorPlaces = JSON.parse(req.body.sectorPlaces) as Array<{ sectorName: string; places: string[] }>;
        } catch (e) {
          console.error('Error parsing sectorPlaces:', e);
        }
      }
      
      if (req.body.sideCompetitions) {
        try {
          sideCompetitions = JSON.parse(req.body.sideCompetitions) as string[];
        } catch (e) {
          console.error('Error parsing sideCompetitions:', e);
        }
      }
      
      if (req.body.branding) {
        try {
          branding = JSON.parse(req.body.branding);
        } catch (e) {
          console.error('Error parsing branding:', e);
        }
      }

      // Validate plan capabilities - SECURITY: Ensure features match selected plan
      const validPlans = ['basic', 'pro', 'premium', 'enterprise'] as const;
      const rawPlan = req.body.selectedPlan;
      const selectedPlan = validPlans.includes(rawPlan) ? rawPlan : 'basic';
      const hasSectors = req.body.hasSectors === 'true';
      const hasSubdomain = req.body.requestedSubdomain && req.body.requestedSubdomain.trim() !== '';
      
      // Validate sectors feature
      if (hasSectors && !canUseFeature(selectedPlan, 'sectors')) {
        return res.status(400).json({ 
          message: "Sectors feature not available in selected plan",
          selectedPlan,
          feature: 'sectors'
        });
      }
      
      // Validate side competitions feature
      if (sideCompetitions.length > 0 && !canUseFeature(selectedPlan, 'sideCompetitions')) {
        return res.status(400).json({ 
          message: "Side competitions feature not available in selected plan",
          selectedPlan,
          feature: 'sideCompetitions'
        });
      }
      
      // Validate branding feature
      if ((branding || hasSubdomain) && !canUseFeature(selectedPlan, 'branding')) {
        return res.status(400).json({ 
          message: "Branding features not available in selected plan",
          selectedPlan,
          feature: 'branding'
        });
      }

      // Debug: Log the data before validation
      const dataToValidate = {
        ...req.body,
        imageUrl,
        startDate: new Date(req.body.startDate),
        endDate: new Date(req.body.endDate),
        maxTeams: req.body.maxTeams ? parseInt(req.body.maxTeams) : null,
        minWeight: req.body.minWeight ? req.body.minWeight.toString() : "2.00",
        hasSectors: req.body.hasSectors === 'true',
        sectorPlaces,
        sideCompetitions,
        selectedPlan,
        requestedSubdomain: req.body.requestedSubdomain || undefined,
        branding: branding || undefined,
      };
      console.log('Data to validate:', JSON.stringify({
        minWeight: dataToValidate.minWeight,
        minWeightType: typeof dataToValidate.minWeight,
        requestedSubdomain: dataToValidate.requestedSubdomain,
        branding: dataToValidate.branding,
        selectedPlan: dataToValidate.selectedPlan
      }, null, 2));
      
      const { sideCompetitions: _sideComps, sectorPlaces: _sectorPlaces, ...validationData } = dataToValidate;
      const registrationData = insertCompetitionRegistrationSchema.parse({
        ...validationData,
        sideCompetitions: sideCompetitions.length > 0 ? [...sideCompetitions] : null,
        sectorPlaces,
      });
      
      const registration = await storage.createCompetitionRegistration(registrationData);
      
      // Generate stateful single-use setup token (SHA-256 hashed, 48h expiry, stored in DB)
      const setupToken = await storage.createCompetitionSetupToken(registration.id);
      
      // Send confirmation email to organizer
      const appOrigin = process.env.APP_ORIGIN || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const setupUrl = `${appOrigin}/competition/${registration.id}/setup?plan=${registration.selectedPlan}&token=${setupToken}`;
      
      emailService.sendRegistrationConfirmationEmail(
        registration.contactEmail,
        registration.name,
        setupUrl
      ).catch(err => {
        console.error('[Email] Failed to send registration confirmation email:', err);
      });
      
      res.status(201).json({
        ...registration,
        setupToken, // Include token for setup wizard authorization
      });
    } catch (error: any) {
      console.error("Error creating competition registration:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ 
          message: "Invalid registration data", 
          details: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create competition registration" });
    }
  });

  app.get('/api/competition-registrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can view competition registrations" });
      }

      const status = req.query.status as string | undefined;
      const registrations = await storage.getCompetitionRegistrations(status);
      res.json(registrations);
    } catch (error) {
      console.error("Error fetching competition registrations:", error);
      res.status(500).json({ message: "Failed to fetch competition registrations" });
    }
  });

  app.get('/api/competition-registrations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      const registration = await storage.getCompetitionRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Competition registration not found" });
      }
      
      // Allow access to admins OR the registration owner (by email)
      const isOwner = registration.contactEmail === user?.email;
      if (!isAdmin(user) && !isOwner) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(registration);
    } catch (error) {
      console.error("Error fetching competition registration:", error);
      res.status(500).json({ message: "Failed to fetch competition registration" });
    }
  });

  app.patch('/api/competition-registrations/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can approve competition registrations" });
      }

      const result = await storage.approveCompetitionRegistration(req.params.id, userId);
      
      // Send registration confirmation email to organizer
      const appOrigin = process.env.APP_ORIGIN || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
      const setupUrl = `${appOrigin}/organizer/competition/${result.competition.id}`;
      
      emailService.sendRegistrationConfirmationEmail(
        result.registration.contactEmail,
        result.competition.name,
        setupUrl
      ).catch(err => {
        console.error('[Email] Failed to send registration confirmation email:', err);
      });
      
      res.json({
        message: "Competition registration approved and competition created",
        registration: result.registration,
        competition: result.competition
      });
    } catch (error: any) {
      console.error("Error approving competition registration:", error);
      res.status(400).json({ message: error.message || "Failed to approve competition registration" });
    }
  });

  // Update competition registration data (for setup wizard)
  // Authorization: registration owner (by email) or admin can update
  app.patch('/api/competition-registrations/:id', async (req: any, res) => {
    try {
      const { id } = req.params;
      const registration = await storage.getCompetitionRegistration(id);
      
      if (!registration) {
        return res.status(404).json({ message: "Registration not found" });
      }

      // Allow update only for submitted registrations (not yet approved/declined)
      if (registration.status !== "submitted") {
        return res.status(400).json({ message: "Cannot update approved or declined registrations" });
      }

      // Authorization check
      const userIsAuthenticated = req.isAuthenticated && req.isAuthenticated();
      let authorized = false;
      
      if (userIsAuthenticated) {
        // For authenticated users: check if admin or owner by email
        const userId = getUserId(req);
        const user = await storage.getUser(userId);
        const isOwner = user?.email === registration.contactEmail;
        const userIsAdmin = isAdmin(user);
        authorized = isOwner || userIsAdmin;
      }
      
      // For unauthenticated users OR if authenticated user is not owner/admin:
      // Require valid stateful single-use setup token (DB-backed, SHA-256 hashed, 48h expiry)
      if (!authorized) {
        const { setupToken } = req.body;
        if (!setupToken) {
          return res.status(403).json({ message: "Chýba overovací token" });
        }
        const tokenResult = await storage.validateAndConsumeSetupToken(setupToken, id);
        if (tokenResult === 'expired') {
          return res.status(403).json({ message: "Odkaz na nastavenie vypršal (platný 48 hodín). Kontaktujte support pre nový odkaz." });
        }
        if (tokenResult === 'used') {
          return res.status(403).json({ message: "Tento odkaz bol už použitý. Prihláste sa na úpravu nastavení." });
        }
        if (tokenResult === 'invalid') {
          return res.status(403).json({ message: "Neplatný alebo poškodený odkaz." });
        }
        // tokenResult === 'valid' — token consumed atomically
        authorized = true;
      }
      
      if (!authorized) {
        return res.status(403).json({ message: "You are not authorized to update this registration" });
      }

      // Extract updatable fields from request body
      const {
        description,
        rules,
        scoringType,
        minWeight,
        hasSectors,
        sectorPlaces,
        sideCompetitions,
        firstPlacePrize,
        secondPlacePrize,
        thirdPlacePrize,
        registrationFee,
        teamSize,
        maxTeams,
        branding
      } = req.body;

      const updateData: any = { updatedAt: new Date() };
      
      if (description !== undefined) updateData.description = description;
      if (rules !== undefined) updateData.rules = rules;
      if (scoringType !== undefined) updateData.scoringType = scoringType;
      if (minWeight !== undefined) updateData.minWeight = minWeight;
      if (hasSectors !== undefined) updateData.hasSectors = hasSectors;
      if (sectorPlaces !== undefined) updateData.sectorPlaces = sectorPlaces;
      if (sideCompetitions !== undefined) updateData.sideCompetitions = sideCompetitions;
      if (firstPlacePrize !== undefined) updateData.firstPlacePrize = firstPlacePrize;
      if (secondPlacePrize !== undefined) updateData.secondPlacePrize = secondPlacePrize;
      if (thirdPlacePrize !== undefined) updateData.thirdPlacePrize = thirdPlacePrize;
      if (registrationFee !== undefined) updateData.registrationFee = registrationFee;
      if (teamSize !== undefined) updateData.teamSize = teamSize;
      if (maxTeams !== undefined) updateData.maxTeams = maxTeams;
      if (branding !== undefined) updateData.branding = branding;

      const updatedRegistration = await storage.updateCompetitionRegistration(id, updateData);
      
      res.json({
        message: "Registration updated successfully",
        registration: updatedRegistration
      });
    } catch (error: any) {
      console.error("Error updating competition registration:", error);
      res.status(400).json({ message: error.message || "Failed to update registration" });
    }
  });

  app.patch('/api/competition-registrations/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can decline competition registrations" });
      }

      const registration = await storage.declineCompetitionRegistration(req.params.id);
      
      res.json({
        message: "Competition registration declined",
        registration
      });
    } catch (error: any) {
      console.error("Error declining competition registration:", error);
      res.status(400).json({ message: error.message || "Failed to decline competition registration" });
    }
  });

  // Helper function to generate realistic catch data
  function generateRealisticCatches(count: number, teams: any[], referees: any[], competition: any) {
    const catches = [];
    const fishTypes = ['scaly', 'mirror'];
    const currentTime = new Date();
    const competitionStart = competition.startDate ? new Date(competition.startDate) : new Date(currentTime.getTime() - 6 * 60 * 60 * 1000);
    const competitionEnd = competition.endDate ? new Date(competition.endDate) : new Date(currentTime.getTime() + 2 * 60 * 60 * 1000);
    
    // Weight distribution as specified by architect
    const weightRanges = [
      { min: 20, max: 27, count: 5 }, // Trophy fish 20-27kg
      { min: 15, max: 20, count: 10 }, // Large fish 15-20kg
      { min: 10, max: 15, count: 15 }, // Medium fish 10-15kg
      { min: 3, max: 10, count: 10 },  // Smaller fish 3-10kg
    ];
    
    let catchIndex = 0;
    
    for (const range of weightRanges) {
      for (let i = 0; i < range.count && catchIndex < count; i++) {
        // Generate weight within range
        const weight = (Math.random() * (range.max - range.min) + range.min).toFixed(2);
        
        // Round-robin team assignment
        const team = teams[catchIndex % teams.length];
        
        // Find referee for this team's sector
        const referee = referees.find(r => r.assignedSector === team.sector) || referees[0];
        
        // Random fish type (65% scaly, 35% mirror)
        const fishType = Math.random() < 0.65 ? 'scaly' : 'mirror';
        
        // Random time within competition period
        const timeRange = competitionEnd.getTime() - competitionStart.getTime();
        const randomTime = new Date(competitionStart.getTime() + Math.random() * timeRange);
        
        catches.push({
          teamId: team.id,
          competitionId: competition.id,
          refereeId: referee.id,
          weight: parseFloat(weight),
          fishType: fishType,
          sector: team.sector,
          submittedAt: randomTime.toISOString(),
          isVerified: true
        });
        
        catchIndex++;
      }
    }
    
    // Shuffle the catches to make timing more realistic
    for (let i = catches.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [catches[i], catches[j]] = [catches[j], catches[i]];
    }
    
    return catches;
  }

  // Dev-only role management endpoint for testing
  if (process.env.NODE_ENV === 'development') {
    app.post('/api/dev/promote-role', isAuthenticated, async (req: any, res) => {
      try {
        const userId = getUserId(req);
        const { role } = req.body;
        
        if (!['organizer', 'referee', 'public'].includes(role)) {
          return res.status(400).json({ message: "Invalid role. Must be 'organizer', 'referee', or 'public'" });
        }
        
        // Update the user's role in the database
        await storage.upsertUser({
          id: userId,
          email: req.user.claims.email,
          firstName: req.user.claims.first_name,
          lastName: req.user.claims.last_name,
          profileImageUrl: req.user.claims.profile_image_url,
          role: role,
        });
        
        res.json({ message: `Successfully promoted user to ${role}`, userId, newRole: role });
      } catch (error) {
        console.error("Error promoting user role:", error);
        res.status(500).json({ message: "Failed to promote user role" });
      }
    });

    // Dev-only endpoint to seed realistic catch data
    app.post('/api/dev/seed-catches', isAuthenticated, async (req: any, res) => {
      try {
        const userId = getUserId(req);
        const user = await storage.getUser(userId);
        
        if (user?.role !== 'organizer') {
          return res.status(403).json({ message: "Only organizers can seed catch data" });
        }

        const { competitionId, count = 40 } = req.body;
        
        if (!competitionId) {
          return res.status(400).json({ message: "competitionId is required" });
        }

        // Get competition, teams, and referees
        const competition = await storage.getCompetition(competitionId);
        if (!competition) {
          return res.status(404).json({ message: "Competition not found" });
        }

        const teams = await storage.getTeamsByCompetition(competitionId);
        const referees = await storage.getRefereesByCompetition(competitionId);

        if (teams.length === 0) {
          return res.status(400).json({ message: "No teams found for this competition" });
        }

        if (referees.length === 0) {
          return res.status(400).json({ message: "No referees found for this competition" });
        }

        // Generate realistic catch data
        const catchData = generateRealisticCatches(count, teams, referees, competition);
        
        const results = {
          inserted: 0,
          byTeam: {} as Record<string, number>,
          bySector: {} as Record<string, number>,
          weights: { over20: 0, over15: 0, over10: 0 }
        };

        // Insert catches one by one with validation
        for (const catchInfo of catchData) {
          try {
            // Validate catch data using schema
            const validatedCatch = insertCatchSchema.parse(catchInfo);
            const newCatch = await storage.createCatch(validatedCatch);
            await storage.updateTeamStats(catchInfo.teamId);
            
            results.inserted++;
            results.byTeam[catchInfo.teamId] = (results.byTeam[catchInfo.teamId] || 0) + 1;
            results.bySector[catchInfo.sector] = (results.bySector[catchInfo.sector] || 0) + 1;
            
            const weight = catchInfo.weight;
            if (weight >= 20) results.weights.over20++;
            else if (weight >= 15) results.weights.over15++;
            else if (weight >= 10) results.weights.over10++;

            // Broadcast the new catch
            broadcast({
              type: 'new_catch',
              catch: newCatch,
              competitionId
            });
          } catch (error) {
            console.error("Error creating catch:", error);
          }
        }
        
        // Invalidate cache once after all catches imported
        cache.invalidateCompetition(competitionId);

        res.json({
          message: `Successfully seeded ${results.inserted} catches`,
          ...results
        });
      } catch (error) {
        console.error("Error seeding catches:", error);
        res.status(500).json({ message: "Failed to seed catches" });
      }
    });
  }

  // Diary Battle endpoints
  
  // Get all user battles
  app.get('/api/diary/battles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const battles = await storage.getAllUserBattles(userId);
      res.json(battles);
    } catch (error) {
      console.error("Error fetching user battles:", error);
      res.status(500).json({ message: "Failed to fetch battles" });
    }
  });

  // Get archived (finished) battles with calculated stats
  app.get('/api/diary/battles/archive', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Get all user battles
      const allBattles = await storage.getAllUserBattles(userId);
      
      // Filter for finished battles only
      const finishedBattles = allBattles.filter(battle => battle.status === 'finished');
      
      // Transform to archive format with additional stats
      const archivedBattles = finishedBattles.map(battle => {
        const results = battle.results || [];
        const winner = results.length > 0 ? results[0] : null;
        const userResult = results.find(r => r.participant.userId === userId);
        
        return {
          id: battle.id,
          name: battle.name,
          mode: battle.rules.mode,
          status: battle.status,
          startAt: battle.startAt,
          endAt: battle.endAt,
          participantCount: battle.participants.length,
          winner: winner ? winner.participant.name : 'N/A',
          userPosition: userResult ? userResult.position : null,
          userScore: userResult ? userResult.score : 0,
          totalScore: winner ? winner.score : 0,
          participants: battle.participants.map(p => p.name),
          results: battle.results
        };
      });
      
      // Sort by end date descending (most recent first)
      archivedBattles.sort((a, b) => new Date(b.endAt).getTime() - new Date(a.endAt).getTime());
      
      console.log(`[BATTLE ARCHIVE] Returning ${archivedBattles.length} archived battles for user ${userId}`);
      if (archivedBattles.length > 0) {
        console.log(`[BATTLE ARCHIVE] First battle:`, JSON.stringify(archivedBattles[0], null, 2));
      }
      
      res.json(archivedBattles);
    } catch (error) {
      console.error("Error fetching archived battles:", error);
      res.status(500).json({ message: "Failed to fetch archived battles" });
    }
  });

  // Get user's battle invitations (must come before :id route)
  app.get('/api/diary/battles/invitations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      // Default to 'pending' if no status is specified
      const status = req.query.status as string | undefined || 'pending';
      
      const invitations = await storage.getUserBattleInvitations(userId, status);
      res.json(invitations);
    } catch (error) {
      console.error("Error fetching battle invitations:", error);
      res.status(500).json({ message: "Nepodarilo sa načítať pozvánky" });
    }
  });

  // Get active battles for current user (must come before :id route)
  app.get('/api/diary/battles/active', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Get user info for participant matching
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const userName = user.firstName && user.lastName 
        ? `${user.firstName} ${user.lastName}`
        : user.firstName || user.email || "Unknown";
      
      // Get all battles where user owns the trip (only if premium)
      let ownedBattles: any[] = [];
      try {
        ownedBattles = await storage.getAllUserBattles(userId);
      } catch (error: any) {
        // If user is not premium, they can't own battles, but can still be participants
        console.log(`User ${userId} cannot access owned battles:`, error.message);
      }
      
      // Get all battles where user is a participant (no premium check needed)
      const allBattles = await db
        .select()
        .from(diaryBattles)
        .where(eq(diaryBattles.status, 'active'));
      
      const participantBattles = allBattles.filter(battle => {
        // Check if user is in participants array
        return battle.participants.some((p: any) => {
          if (p.userId) {
            return p.userId === userId;
          }
          if (typeof p.name === 'string') {
            return p.name.toLowerCase() === userName.toLowerCase();
          }
          return false;
        });
      });
      
      // Combine and deduplicate battles (by id)
      const allUserBattles = [...ownedBattles, ...participantBattles];
      const uniqueBattles = Array.from(new Map(allUserBattles.map(b => [b.id, b])).values());
      
      const now = new Date();
      
      // Filter for active battles only (started but not finished)
      const activeBattles = uniqueBattles.filter(battle => {
        const startAt = new Date(battle.startAt);
        const endAt = new Date(battle.endAt);
        
        // Battle is active if it has started and not yet ended
        return startAt <= now && endAt >= now;
      });
      
      res.json(activeBattles);
    } catch (error) {
      console.error("Error fetching active battles:", error);
      res.status(500).json({ message: "Failed to fetch active battles" });
    }
  });

  // Get catches for specific battle
  app.get('/api/diary/battles/:id/catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id } = req.params;
      
      // First verify user has access to this battle
      const battle = await storage.getDiaryBattle(id, userId);
      if (!battle) {
        return res.status(404).json({ message: "Battle sa nenašiel" });
      }
      
      // Get all catches for this battle using battleId column
      const battleCatches = await storage.getBattleCatches(id);
      
      res.json(battleCatches);
    } catch (error) {
      console.error("Error fetching battle catches:", error);
      res.status(500).json({ message: "Failed to fetch battle catches" });
    }
  });

  // Get victory stats for a finished battle (for victory modal)
  app.get('/api/diary/battles/:id/victory-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Get battle (bypassing ownership checks for participants)
      const [battle] = await db
        .select()
        .from(diaryBattles)
        .where(eq(diaryBattles.id, id));
      
      if (!battle) {
        return res.status(404).json({ message: "Battle sa nenašiel" });
      }
      
      // Battle must be finished
      if (battle.status !== 'finished') {
        return res.status(400).json({ message: "Battle ešte neskončil" });
      }
      
      // Get winner from results
      const results = battle.results || [];
      const winner = results.length > 0 ? results[0] : null;
      
      if (!winner) {
        return res.status(400).json({ message: "Víťaz nebol určený" });
      }
      
      // Get all catches for this battle
      const battleCatches = await storage.getBattleCatches(id);
      
      // Filter catches by winner
      const winnerCatches = battleCatches.filter(c => 
        c.angler.userId === winner.participant.userId || 
        c.angler.name === winner.participant.name
      );
      
      // Calculate stats
      const totalWeight = winnerCatches.reduce((sum, c) => sum + parseFloat(c.weight), 0);
      const fishCount = winnerCatches.length;
      
      // Find biggest catch
      const biggestCatch = winnerCatches.length > 0 
        ? winnerCatches.reduce((max, c) => parseFloat(c.weight) > parseFloat(max.weight) ? c : max)
        : null;
      
      // Get winner user info for avatar
      let winnerAvatar = "";
      if (winner.participant.userId) {
        const winnerUser = await storage.getUser(winner.participant.userId);
        winnerAvatar = winnerUser?.profileImageUrl || "";
      }
      
      // Check if current user is the winner
      const isWinner = winner.participant.userId === userId;
      
      // Check if user is premium
      const user = await storage.getUser(userId);
      const isPremium = user?.isPremium === true;
      
      // Check if user has already seen this victory (stored in localStorage on client)
      
      res.json({
        isWinner,
        rank: 1,
        totalWeight: Math.round(totalWeight * 10) / 10,
        fishCount,
        bigFishWeight: biggestCatch ? parseFloat(biggestCatch.weight) : null,
        bigFishSpecies: biggestCatch?.fishType || null,
        battleName: battle.name,
        participantCount: battle.participants.length,
        winnerName: winner.participant.name,
        winnerAvatar,
        isPremium
      });
    } catch (error) {
      console.error("Error fetching victory stats:", error);
      res.status(500).json({ message: "Failed to fetch victory stats" });
    }
  });

  // QR Code for battle - generates QR linking to battle join/detail page
  app.get('/api/diary/battles/:id/qr', async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get battle without auth check - we just need to verify it exists
      const battle = await db.select().from(diaryBattles).where(eq(diaryBattles.id, id)).limit(1);
      if (!battle || battle.length === 0) {
        return res.status(404).json({ message: "Battle not found" });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      const battleUrl = `${baseUrl}/diary/battles/${id}`;

      const qrBuffer = await QRCode.toBuffer(battleUrl, {
        type: 'png',
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `inline; filename="qr-battle-${id}.png"`);
      res.send(qrBuffer);
    } catch (error) {
      console.error("Error generating battle QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // QR Code data URL for battle (for embedding in UI)
  app.get('/api/diary/battles/:id/qr/data', async (req, res) => {
    try {
      const { id } = req.params;
      
      const battle = await db.select().from(diaryBattles).where(eq(diaryBattles.id, id)).limit(1);
      if (!battle || battle.length === 0) {
        return res.status(404).json({ message: "Battle not found" });
      }

      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const host = req.headers.host || 'localhost:5000';
      const baseUrl = `${protocol}://${host}`;
      const battleUrl = `${baseUrl}/diary/battles/${id}`;

      const qrDataUrl = await QRCode.toDataURL(battleUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      res.json({ 
        qrDataUrl, 
        url: battleUrl,
        battleName: battle[0].name 
      });
    } catch (error) {
      console.error("Error generating battle QR data:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  // Get single battle by ID
  app.get('/api/diary/battles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id } = req.params;
      
      const battle = await storage.getDiaryBattle(id, userId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle sa nenašiel" });
      }
      
      // Check if user is the trip owner (for UI permissions)
      const isOwner = await storage.checkTripOwnership(battle.tripId, userId);
      
      res.json({ ...battle, isOwner });
    } catch (error) {
      console.error("Error fetching battle:", error);
      res.status(500).json({ message: "Failed to fetch battle" });
    }
  });

  // Update battle
  app.put('/api/diary/battles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id } = req.params;
      
      // Check if user has access to battle features (PREMIUM gating)
      const canAccessBattles = await storage.canAccessBattleFeatures(userId);
      if (!canAccessBattles) {
        return res.status(403).json({ 
          message: "Battle functionality is only available for Premium users",
          code: "PREMIUM_REQUIRED"
        });
      }

      // Validate request data
      const updateSchema = z.object({
        name: z.string().min(1).max(255).optional(),
        rules: z.object({
          mode: z.enum(["most_fish", "total_weight", "biggest_fish", "best_3_fish", "best_5_fish"]),
          minWeightKg: z.number().optional(),
          includeOnlyVerified: z.boolean().optional()
        }).optional(),
        participants: z.array(z.object({
          userId: z.string().optional(),
          name: z.string().min(1)
        })).optional(),
        startAt: z.string().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val)).optional(),
        endAt: z.string().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val)).optional(),
        status: z.enum(["active", "finished", "canceled"]).optional()
      });

      const updateData = updateSchema.parse(req.body);
      
      let updatedBattle = await storage.updateDiaryBattle(id, updateData, userId);
      
      // Calculate final results and send notifications when battle is manually finished
      if (updateData.status === 'finished') {
        updatedBattle = await storage.calculateBattleResults(id, userId);
        
        // Send push notifications to all participants
        const participantUserIds = updatedBattle.participants
          .map(p => p.userId)
          .filter((id): id is string => !!id);
        
        if (participantUserIds.length > 0) {
          const winnerName = updatedBattle.results && updatedBattle.results.length > 0
            ? updatedBattle.results[0].participant.name
            : 'Nikto';
          const winnerScore = updatedBattle.results && updatedBattle.results.length > 0
            ? updatedBattle.results[0].score
            : 0;
          
          // Send battle finished notification in background
          setTimeout(async () => {
            try {
              await notificationService.notifyBattleFinished(
                updatedBattle.id,
                updatedBattle.name,
                participantUserIds,
                winnerName,
                winnerScore,
                updatedBattle.results?.map(r => ({
                  userId: r.participant.userId,
                  name: r.participant.name,
                  score: r.score,
                  position: r.position
                }))
              );
            } catch (notifError) {
              console.error('[BG] Error sending battle finished notification:', notifError);
            }
          }, 0);
        }
      }
      
      // Handle new invitations
      const invitedUserIds = req.body.invitedUserIds || [];
      if (invitedUserIds.length > 0) {
        for (const invitedUserId of invitedUserIds) {
          try {
            const invitation = await storage.createBattleInvitation(id, invitedUserId, userId);
            
            // Send push notification to invited user
            await notificationService.sendBattleInvitation(invitedUserId, {
              battleId: id,
              battleName: updatedBattle.name,
              invitedByUserId: userId
            });
            
            // Broadcast invitation via WebSocket
            broadcastToUsers([invitedUserId], {
              type: 'battle_invitation',
              invitationId: invitation.id,
              payload: { ...invitation, battle: updatedBattle }
            });
          } catch (error) {
            console.error(`Failed to invite user ${invitedUserId} to battle ${id}:`, error);
          }
        }
      }
      
      // Broadcast update to all participants
      broadcastToUsers([userId], {
        type: 'diary_battle_updated',
        battleId: id,
        payload: updatedBattle
      });
      
      res.json(updatedBattle);
    } catch (error) {
      console.error("Error updating battle:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid update data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update battle" });
    }
  });
  
  // Create battle with auto-created trip (recommended flow)
  app.post('/api/diary/battles-with-trip', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Check if user has access to battle features (PREMIUM gating)
      const canAccessBattles = await storage.canAccessBattleFeatures(userId);
      if (!canAccessBattles) {
        return res.status(403).json({ 
          message: "Battle functionality is only available for Premium users",
          code: "PREMIUM_REQUIRED"
        });
      }

      // Validate battle data (without tripId)
      const battleSchema = z.object({
        name: z.string().min(1, "Názov battle je povinný").max(255),
        location: z.string().optional().default(""),
        rules: z.object({
          mode: z.enum(["most_fish", "total_weight", "biggest_fish", "best_3_fish", "best_5_fish"]),
          minWeightKg: z.number().optional(),
          includeOnlyVerified: z.boolean().optional()
        }),
        participants: z.array(z.object({
          name: z.string().min(1)
        })).optional().default([]),
        startAt: z.string().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val)),
        endAt: z.string().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val))
      });

      const battleData = battleSchema.parse(req.body);
      
      // Get creator info to add them as participant
      const creator = await storage.getUser(userId);
      if (!creator) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get creator display name (firstName + lastName, or firstName, or email)
      const creatorName = creator.firstName && creator.lastName 
        ? `${creator.firstName} ${creator.lastName}`
        : creator.firstName || creator.email || "Unknown";
      
      // Remove creator from existing participants if they're already there (deduplication)
      const filteredParticipants = (battleData.participants || []).filter((p: any) => {
        // Filter by userId if available
        if (p.userId) {
          return p.userId !== creator.id;
        }
        // Otherwise filter by name (case-insensitive) - skip entries without name
        if (typeof p.name === 'string') {
          return p.name.toLowerCase() !== creatorName.toLowerCase();
        }
        return true; // Keep malformed entries
      });
      
      // Add creator to participants automatically at the beginning
      const allParticipants = [
        { name: creatorName, userId: creator.id },
        ...filteredParticipants
      ];
      
      // Create trip automatically with same name and dates as battle
      const tripData = {
        name: battleData.name,
        location: battleData.location || "",
        startDate: battleData.startAt,
        endDate: battleData.endAt,
        ownerUserId: userId,
        visibility: "private" as const,
        notes: `Automaticky vytvorené pre battle: ${battleData.name}`,
        participants: allParticipants.map(p => ({ name: p.name }))
      };
      
      const trip = await storage.createDiaryTrip(tripData, userId);
      
      // Now create battle with reference to the new trip (include creator in participants)
      const battleDataWithTrip = {
        status: "active" as const,
        name: battleData.name,
        rules: battleData.rules,
        participants: allParticipants,
        tripId: trip.id,
        startAt: battleData.startAt,
        endAt: battleData.endAt
      };
      
      const battle = await storage.createDiaryBattle(battleDataWithTrip, userId);
      
      // Create invitations for selected users
      const invitedUserIds = req.body.invitedUserIds || [];
      if (invitedUserIds.length > 0) {
        for (const invitedUserId of invitedUserIds) {
          try {
            const invitation = await storage.createBattleInvitation(battle.id, invitedUserId, userId);
            
            // Send push notification to invited user
            await notificationService.sendBattleInvitation(invitedUserId, {
              battleId: battle.id,
              battleName: battle.name,
              invitedByUserId: userId
            });
            
            // Broadcast invitation via WebSocket
            broadcastToUsers([invitedUserId], {
              type: 'battle_invitation',
              invitationId: invitation.id,
              payload: { ...invitation, battle }
            });
          } catch (error) {
            console.error(`Failed to invite user ${invitedUserId} to battle ${battle.id}:`, error);
          }
        }
      }
      
      // Broadcast both trip and battle creation
      broadcastToUsers([userId], {
        type: 'diary_trip_created',
        tripId: trip.id,
        payload: trip
      });
      
      broadcastToUsers([userId], {
        type: 'diary_battle_created',
        battleId: battle.id,
        payload: battle
      });
      
      res.status(201).json({ battle, trip });
    } catch (error) {
      console.error("Error creating battle with trip:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid battle data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create battle" });
    }
  });

  // Create battle with existing trip (advanced flow)
  app.post('/api/diary/battles', isAuthenticated, battleCreationLimiter, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Check if user has access to battle features (PREMIUM gating)
      const canAccessBattles = await storage.canAccessBattleFeatures(userId);
      if (!canAccessBattles) {
        return res.status(403).json({ 
          message: "Battle functionality is only available for Premium users",
          code: "PREMIUM_REQUIRED"
        });
      }

      // Validate and parse request data (Zod automatically transforms dates)
      const battleData = insertDiaryBattleSchema.parse(req.body);
      const invitedUserIds = req.body.invitedUserIds || [];
      
      // Get creator info to add them as participant
      const creator = await storage.getUser(userId);
      if (!creator) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get creator display name (firstName + lastName, or firstName, or email)
      const creatorName = creator.firstName && creator.lastName 
        ? `${creator.firstName} ${creator.lastName}`
        : creator.firstName || creator.email || "Unknown";
      
      // Remove creator from existing participants if they're already there (deduplication)
      const filteredParticipants = (battleData.participants || []).filter((p: any) => {
        // Filter by userId if available
        if (p.userId) {
          return p.userId !== creator.id;
        }
        // Otherwise filter by name (case-insensitive) - skip entries without name
        if (typeof p.name === 'string') {
          return p.name.toLowerCase() !== creatorName.toLowerCase();
        }
        return true; // Keep malformed entries
      });
      
      // Add creator to participants automatically at the beginning
      const allParticipants = [
        { name: creatorName, userId: creator.id },
        ...filteredParticipants
      ];
      
      // Ensure dates are Date objects (double-check Zod transformation)
      const processedBattleData = {
        ...battleData,
        participants: allParticipants,
        startAt: battleData.startAt instanceof Date ? battleData.startAt : new Date(battleData.startAt),
        endAt: battleData.endAt instanceof Date ? battleData.endAt : new Date(battleData.endAt),
      };
      
      // Create battle in database
      const battle = await storage.createDiaryBattle(processedBattleData, userId);
      
      // Create invitations for selected users
      if (invitedUserIds.length > 0) {
        for (const invitedUserId of invitedUserIds) {
          try {
            const invitation = await storage.createBattleInvitation(battle.id, invitedUserId, userId);
            
            // Send push notification to invited user
            await notificationService.sendBattleInvitation(invitedUserId, {
              battleId: battle.id,
              battleName: battle.name,
              invitedByUserId: userId
            });
            
            // Broadcast invitation via WebSocket
            broadcastToUsers([invitedUserId], {
              type: 'battle_invitation',
              invitationId: invitation.id,
              payload: { ...invitation, battle }
            });
          } catch (error) {
            console.error(`Failed to invite user ${invitedUserId} to battle ${battle.id}:`, error);
          }
        }
      }
      
      // Broadcast battle creation to owner for real-time updates
      broadcastToUsers([userId], {
        type: 'diary_battle_created',
        battleId: battle.id,
        payload: battle
      });
      
      res.status(201).json(battle);
    } catch (error) {
      console.error("Error creating diary battle:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid battle data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create battle" });
    }
  });

  // Accept battle invitation
  app.post('/api/diary/battles/invitations/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id: invitationId } = req.params;
      
      // Get invitation
      const invitation = await storage.getBattleInvitation(invitationId);
      if (!invitation) {
        return res.status(404).json({ message: "Pozvánka nebola nájdená" });
      }
      
      // Verify ownership
      if (invitation.invitedUserId !== userId) {
        return res.status(403).json({ message: "Nemáte oprávnenie" });
      }
      
      // Check status
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Pozvánka už bola spracovaná" });
      }
      
      // Get battle directly from DB (without ownership checks)
      const [battle] = await db
        .select()
        .from(diaryBattles)
        .where(eq(diaryBattles.id, invitation.battleId));
      
      if (!battle) {
        return res.status(404).json({ message: "Battle nebolo nájdené" });
      }
      
      // Get invited user info to add as participant
      const invitedUser = await storage.getUser(userId);
      if (!invitedUser) {
        return res.status(404).json({ message: "Používateľ nebol nájdený" });
      }
      
      // Build participant name (firstName + lastName, or firstName, or email)
      const participantName = invitedUser.firstName && invitedUser.lastName 
        ? `${invitedUser.firstName} ${invitedUser.lastName}`
        : invitedUser.firstName || invitedUser.email || "Unknown";
      
      // Check if user is already a participant (by userId or name)
      const isAlreadyParticipant = battle.participants.some((p: any) => {
        if (p.userId) {
          return p.userId === userId;
        }
        if (typeof p.name === 'string') {
          return p.name.toLowerCase() === participantName.toLowerCase();
        }
        return false;
      });
      
      // Add participant to battle if not already there
      if (!isAlreadyParticipant) {
        const updatedParticipants = [
          ...battle.participants,
          { userId, name: participantName }
        ];
        
        // Update battle directly in DB (bypass storage layer ownership checks)
        await db
          .update(diaryBattles)
          .set({ 
            participants: updatedParticipants,
            updatedAt: new Date() 
          })
          .where(eq(diaryBattles.id, invitation.battleId));
      }
      
      // Update invitation status
      const updated = await storage.updateInvitationStatus(invitationId, "accepted");
      
      res.json(updated);
    } catch (error) {
      console.error("Accept invitation error:", error);
      res.status(500).json({ message: "Chyba servera" });
    }
  });

  // Reject battle invitation
  app.post('/api/diary/battles/invitations/:id/reject', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { id: invitationId } = req.params;
      
      // Get the invitation first
      const invitation = await storage.getBattleInvitation(invitationId);
      
      if (!invitation) {
        return res.status(404).json({ message: "Pozvánka nebola nájdená" });
      }
      
      if (invitation.invitedUserId !== userId) {
        return res.status(403).json({ message: "Nemáte oprávnenie odmietnuť túto pozvánku" });
      }
      
      if (invitation.status !== "pending") {
        return res.status(400).json({ message: "Pozvánka už bola spracovaná" });
      }
      
      // Update invitation status
      const updatedInvitation = await storage.updateInvitationStatus(invitationId, "rejected");
      
      // Broadcast to invited user to update their UI
      broadcastToUsers([userId], {
        type: 'battle_invitation_updated',
        invitationId,
        payload: updatedInvitation
      });
      
      res.json(updatedInvitation);
    } catch (error) {
      console.error("Error rejecting battle invitation:", error);
      res.status(500).json({ message: "Nepodarilo sa odmietnuť pozvánku" });
    }
  });

  // Helper function to safely move file with fallback to copy+delete
  async function safeFileMoveWithRetry(sourcePath: string, destPath: string, maxRetries = 3): Promise<boolean> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        // First try rename (fastest, works on same filesystem)
        await fsPromises.rename(sourcePath, destPath);
        console.log(`[PhotoUpload] File moved successfully via rename: ${sourcePath} -> ${destPath}`);
        return true;
      } catch (renameError: any) {
        console.log(`[PhotoUpload] Rename failed (attempt ${attempt}/${maxRetries}), trying copy+delete: ${renameError.code || renameError.message}`);
        
        try {
          // Fallback: copy file then delete original
          await fsPromises.copyFile(sourcePath, destPath);
          
          // Verify the copy was successful by checking file exists and has size
          const destStats = await fsPromises.stat(destPath);
          const sourceStats = await fsPromises.stat(sourcePath);
          
          if (destStats.size === sourceStats.size) {
            // Delete original only after successful copy verification
            await fsPromises.unlink(sourcePath);
            console.log(`[PhotoUpload] File moved successfully via copy+delete: ${sourcePath} -> ${destPath} (${destStats.size} bytes)`);
            return true;
          } else {
            console.error(`[PhotoUpload] Size mismatch after copy: source=${sourceStats.size}, dest=${destStats.size}`);
            // Clean up failed copy
            try { await fsPromises.unlink(destPath); } catch {}
          }
        } catch (copyError: any) {
          console.error(`[PhotoUpload] Copy+delete failed (attempt ${attempt}/${maxRetries}):`, copyError.message);
        }
      }
      
      // Wait before retry
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 100 * attempt));
      }
    }
    
    return false;
  }

  // Diary Photo Upload endpoint - FAST upload with background processing
  app.post('/api/diary/photos/upload', isAuthenticated, (req: any, res, next) => {
    // Handle multiple file upload (max 5 photos)
    upload.array('photos', 5)(req, res, (err: any) => {
      if (err) {
        console.error("[PhotoUpload] Multer error:", err);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ 
            message: "Jeden alebo viac súborov je príliš veľkých. Maximálna veľkosť je 5MB." 
          });
        }
        if (err.message === "Too many files" || err.code === 'LIMIT_UNEXPECTED_FILE') {
          return res.status(400).json({ 
            message: "Príliš veľa súborov. Maximálne 5 fotografií naraz." 
          });
        }
        if (err.message === "Only image files are allowed" || err.message === "Povolené sú len obrázkové súbory (JPEG, PNG, GIF)") {
          return res.status(400).json({ 
            message: "Povolené sú len obrázkové súbory (JPEG, PNG, GIF)" 
          });
        }
        return res.status(400).json({ 
          message: "Chyba pri nahrávaní fotografií" 
        });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const catchId = req.body.catchId; // Optional: for queuing jobs with catch context
      
      console.log(`[PhotoUpload] Starting upload for user: ${userId}, files: ${req.files?.length || 0}`);
      
      if (!req.files || req.files.length === 0) {
        console.log(`[PhotoUpload] No files received for user: ${userId}`);
        return res.status(400).json({ message: "Žiadne súbory neboli nahrané" });
      }

      // Create diary photos directory with explicit verification
      const diaryPhotosDir = path.join('attached_assets', 'diary_photos', userId);
      
      try {
        await fsPromises.mkdir(diaryPhotosDir, { recursive: true });
        console.log(`[PhotoUpload] Directory created/verified: ${diaryPhotosDir}`);
      } catch (mkdirError: any) {
        console.error(`[PhotoUpload] Failed to create directory ${diaryPhotosDir}:`, mkdirError);
        return res.status(500).json({ message: "Nepodarilo sa vytvoriť priečinok pre fotografie" });
      }
      
      // Double-check directory exists
      if (!existsSync(diaryPhotosDir)) {
        console.error(`[PhotoUpload] Directory still doesn't exist after creation: ${diaryPhotosDir}`);
        return res.status(500).json({ message: "Priečinok pre fotografie neexistuje" });
      }

      // Quickly save photos and return immediately - processing happens in background
      const photos = [];
      const failedPhotos = [];
      
      for (const file of req.files as any[]) {
        const photoId = randomUUID();
        const baseFilename = `${photoId}`;

        // Sanitized original — always .jpg regardless of input format (HEIC/PNG → JPEG).
        // EXIF/GPS strip happens HERE, before anything is saved to disk or returned to client.
        const sanitizedFilename = `${baseFilename}-original.jpg`;
        const sanitizedPath = path.join(diaryPhotosDir, sanitizedFilename);

        console.log(`[PhotoUpload] Processing file: ${file.originalname} (${file.size} bytes), temp: ${file.path}`);

        // Check if Multer temp file exists
        if (!existsSync(file.path)) {
          console.error(`[PhotoUpload] Source file doesn't exist: ${file.path}`);
          failedPhotos.push(file.originalname);
          continue;
        }

        // Strip EXIF/GPS and re-encode to JPEG — must complete before any disk write or response
        try {
          await ImageService.sanitizeToFile(file.path, sanitizedPath);
          console.log(`[PhotoUpload] Sanitized (EXIF-stripped): ${file.originalname} -> ${sanitizedFilename}`);
        } catch (sanitizeErr) {
          console.error(`[PhotoUpload] Sanitize failed for ${file.originalname}:`, sanitizeErr);
          failedPhotos.push(file.originalname);
          try { await fsPromises.unlink(file.path); } catch {}
          continue;
        }

        // Delete RAW Multer temp — must never remain on disk
        try { await fsPromises.unlink(file.path); } catch {}

        // Verify sanitized file exists
        if (!existsSync(sanitizedPath)) {
          console.error(`[PhotoUpload] Sanitized file missing after write: ${sanitizedPath}`);
          failedPhotos.push(file.originalname);
          continue;
        }

        const destStats = await fsPromises.stat(sanitizedPath);
        console.log(`[PhotoUpload] Sanitized file saved: ${sanitizedPath} (${destStats.size} bytes)`);

        // originalUrl now always points to the EXIF-stripped version — never raw
        const originalUrl = `/attached_assets/diary_photos/${userId}/${sanitizedFilename}`;

        photos.push({
          id: photoId,
          url: originalUrl,
          status: 'processing' as const,
          originalUrl,
          processingStartedAt: new Date().toISOString(),
          _processingInfo: {
            userId,
            originalPath: sanitizedPath,
            originalFilename: sanitizedFilename,
            outputBasePath: path.join(diaryPhotosDir, baseFilename)
          }
        });
      }

      if (photos.length === 0) {
        console.error(`[PhotoUpload] All photos failed to upload for user: ${userId}`);
        return res.status(500).json({ 
          message: "Nepodarilo sa uložiť žiadnu fotografiu. Skúste to prosím znova.",
          failedPhotos 
        });
      }
      
      if (failedPhotos.length > 0) {
        console.warn(`[PhotoUpload] Some photos failed: ${failedPhotos.join(', ')}`);
      }

      console.log(`[PhotoUpload] Upload complete for user ${userId}: ${photos.length} successful, ${failedPhotos.length} failed`);
      
      res.json({ 
        photos,
        message: `Nahraných ${photos.length} fotiek, optimalizácia prebieha na pozadí...`,
        failedPhotos: failedPhotos.length > 0 ? failedPhotos : undefined
      });
      
    } catch (error) {
      console.error("[PhotoUpload] Unexpected error:", error);
      res.status(500).json({ message: "Chyba pri nahrávaní fotografií" });
    }
  });

  // Diary Trips endpoints
  app.get('/api/diary/trips/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const tripId = req.params.id;
      
      const trip = await storage.getDiaryTrip(tripId, userId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      res.json(trip);
    } catch (error) {
      console.error("Error fetching diary trip:", error);
      res.status(500).json({ message: "Failed to fetch trip" });
    }
  });

  app.get('/api/diary/trips', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const trips = await storage.getDiaryTrips(userId);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching diary trips:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.post('/api/diary/trips', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      // Check freemium limits
      const tripLimit = await storage.checkDiaryTripLimit(userId);
      if (!tripLimit.canCreate) {
        return res.status(403).json({ 
          message: "Dosiahli ste limit výprav. Prejdite na PREMIUM pre neobmedzené výpravy.",
          code: "LIMIT_REACHED"
        });
      }
      
      // Validate date fields
      if (!req.body.startDate || !req.body.endDate) {
        return res.status(400).json({ 
          message: "Dátumy začiatku a konca sú povinné" 
        });
      }
      
      // Server controls ownerUserId from session
      // Convert date strings to Date objects for Drizzle
      const startDate = new Date(req.body.startDate);
      const endDate = new Date(req.body.endDate);
      
      // Validate dates are valid
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ 
          message: "Neplatný formát dátumu" 
        });
      }
      
      const tripData = {
        ...req.body,
        startDate,
        endDate,
        ownerUserId: userId,
        participants: req.body.participants || []
      };
      
      const newTrip = await storage.createDiaryTrip(tripData, userId);
      
      // Update seasonal goals progress after trip creation
      await storage.updateAllUserGoalsProgress(userId);
      
      res.status(201).json(newTrip);
    } catch (error) {
      console.error("Error creating diary trip:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid trip data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create trip" });
    }
  });

  app.put('/api/diary/trips/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const tripId = req.params.id;
      
      // Check if user owns this trip
      const trip = await storage.getDiaryTrip(tripId, userId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Convert date strings to Date objects if present
      const updateData = { ...req.body };
      if (req.body.startDate) {
        const startDate = new Date(req.body.startDate);
        if (isNaN(startDate.getTime())) {
          return res.status(400).json({ message: "Neplatný formát dátumu začiatku" });
        }
        updateData.startDate = startDate;
      }
      if (req.body.endDate) {
        const endDate = new Date(req.body.endDate);
        if (isNaN(endDate.getTime())) {
          return res.status(400).json({ message: "Neplatný formát dátumu konca" });
        }
        updateData.endDate = endDate;
      }
      
      const updatedTrip = await storage.updateDiaryTrip(tripId, updateData, userId);
      
      // Update seasonal goals progress after trip update
      await storage.updateAllUserGoalsProgress(userId);
      
      res.json(updatedTrip);
    } catch (error) {
      console.error("Error updating diary trip:", error);
      res.status(500).json({ message: "Failed to update trip" });
    }
  });

  app.delete('/api/diary/trips/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const tripId = req.params.id;
      
      // Check if user owns this trip
      const trip = await storage.getDiaryTrip(tripId, userId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      await storage.deleteDiaryTrip(tripId, userId);
      
      // Update seasonal goals progress after trip deletion
      await storage.updateAllUserGoalsProgress(userId);
      
      res.json({ message: "Trip deleted successfully" });
    } catch (error) {
      console.error("Error deleting diary trip:", error);
      res.status(500).json({ message: "Failed to delete trip" });
    }
  });

  app.patch('/api/diary/trips/:id/end', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const tripId = req.params.id;
      
      // Check if user owns this trip
      const trip = await storage.getDiaryTrip(tripId, userId);
      if (!trip) {
        return res.status(404).json({ message: "Trip not found" });
      }
      
      // Set end date to today
      const today = new Date();
      today.setHours(23, 59, 59, 999); // Set to end of day
      
      const updatedTrip = await storage.updateDiaryTrip(tripId, { endDate: today }, userId);
      
      // Update seasonal goals progress after trip end
      await storage.updateAllUserGoalsProgress(userId);
      
      res.json(updatedTrip);
    } catch (error) {
      console.error("Error ending diary trip:", error);
      res.status(500).json({ message: "Failed to end trip" });
    }
  });

  // Trip Cover Image Upload endpoint
  app.post('/api/diary/trips/upload-cover', isAuthenticated, upload.single('coverImage'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file uploaded" });
      }

      const userId = getUserId(req);
      let coverImageUrl = `/uploads/${req.file.filename}`;
      try {
        const photoId = `trip-cover-${Date.now()}`;
        const imageMetadata = await ImageService.processImage(
          req.file.path,
          path.join('uploads', 'trip-covers', photoId),
          photoId,
          undefined, undefined, undefined,
          `diary_photos/${userId}/trip_covers`
        );
        const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'webp') ||
                            ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'jpeg') ||
                            imageMetadata.variants[0];
        coverImageUrl = bestVariant?.url || coverImageUrl;
        await ImageService.cleanupTempFile(req.file.path);
      } catch (error) {
        console.error("Error processing trip cover image:", error);
      }
      res.json({ coverImageUrl });
    } catch (error) {
      console.error("Error uploading trip cover image:", error);
      res.status(500).json({ message: "Failed to upload cover image" });
    }
  });

  // Diary Search endpoint - searches user's personal diary data only
  app.get('/api/diary/search', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      const { q } = req.query;
      
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        return res.json({ catches: [], trips: [], areas: [] });
      }
      
      const query = q.trim().toLowerCase();
      
      // Get all user's catches
      const allCatches = await storage.getAllUserCatches(userId);
      
      // Get all user's trips
      const allTrips = await storage.getDiaryTrips(userId);
      
      // Search in catches (fish type, bait, spot, notes)
      const matchedCatches = allCatches.filter(c => {
        const fishType = (c.fishType || '').toLowerCase();
        const bait = (c.bait || '').toLowerCase();
        const spot = (c.spot || '').toLowerCase();
        const notes = (c.notes || '').toLowerCase();
        return fishType.includes(query) || bait.includes(query) || 
               spot.includes(query) || notes.includes(query);
      }).slice(0, 5); // Limit to 5 results
      
      // Search in trips (name, location, notes)
      const matchedTrips = allTrips.filter(t => {
        const name = (t.name || '').toLowerCase();
        const location = (t.location || '').toLowerCase();
        const notes = (t.notes || '').toLowerCase();
        return name.includes(query) || location.includes(query) || notes.includes(query);
      }).slice(0, 5); // Limit to 5 results
      
      // Extract unique fishing areas from user's catches (spots/locations they've used)
      const areaSet = new Map<string, { name: string; count: number }>();
      allCatches.forEach(c => {
        if (c.spot && c.spot.toLowerCase().includes(query)) {
          const key = c.spot.toLowerCase();
          const existing = areaSet.get(key);
          if (existing) {
            existing.count++;
          } else {
            areaSet.set(key, { name: c.spot, count: 1 });
          }
        }
      });
      allTrips.forEach(t => {
        if (t.location && t.location.toLowerCase().includes(query)) {
          const key = t.location.toLowerCase();
          const existing = areaSet.get(key);
          if (existing) {
            existing.count++;
          } else {
            areaSet.set(key, { name: t.location, count: 1 });
          }
        }
      });
      
      const matchedAreas = Array.from(areaSet.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      res.json({
        catches: matchedCatches.map(c => ({
          id: c.id,
          fishType: c.fishType,
          weight: c.weight,
          spot: c.spot,
          capturedAt: c.capturedAt,
        })),
        trips: matchedTrips.map(t => ({
          id: t.id,
          name: t.name,
          location: t.location,
          startDate: t.startDate,
        })),
        areas: matchedAreas,
      });
    } catch (error) {
      console.error("Error searching diary:", error);
      res.status(500).json({ message: "Failed to search diary" });
    }
  });

  // Bait Statistics endpoint
  app.get('/api/diary/bait-stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;

      const allCatches = await db
        .select({
          id: diaryCatches.id,
          bait: diaryCatches.bait,
          weight: diaryCatches.weight,
          fishType: diaryCatches.fishType,
          capturedAt: diaryCatches.capturedAt,
          nickname: diaryCatches.nickname,
          isHistorical: diaryCatches.isHistorical,
        })
        .from(diaryCatches)
        .where(
          and(
            sql`${diaryCatches.angler}->>'userId' = ${userId}`,
            isNotNull(diaryCatches.bait),
            sql`${diaryCatches.bait} != ''`,
            eq(diaryCatches.isHistorical, false),
            ...(year ? [sql`EXTRACT(YEAR FROM ${diaryCatches.capturedAt}) = ${year}`] : [])
          )
        )
        .orderBy(desc(diaryCatches.capturedAt));

      const baitMap = new Map<string, {
        bait: string;
        catchCount: number;
        totalWeight: number;
        maxWeight: number;
        maxWeightFish: string | null;
        maxWeightDate: Date | null;
        maxWeightNickname: string | null;
        fishTypes: Record<string, number>;
        lastUsed: Date | null;
        catches: Array<{
          id: string;
          weight: number;
          fishType: string;
          capturedAt: Date;
          nickname: string | null;
        }>;
        monthlyUsage: Record<number, number>;
      }>();

      for (const c of allCatches) {
        const baitName = c.bait!.trim();
        const weight = parseFloat(c.weight);
        const month = c.capturedAt.getMonth();

        if (!baitMap.has(baitName)) {
          baitMap.set(baitName, {
            bait: baitName,
            catchCount: 0,
            totalWeight: 0,
            maxWeight: 0,
            maxWeightFish: null,
            maxWeightDate: null,
            maxWeightNickname: null,
            fishTypes: {},
            lastUsed: null,
            catches: [],
            monthlyUsage: {},
          });
        }

        const stats = baitMap.get(baitName)!;
        stats.catchCount++;
        stats.totalWeight += weight;

        if (weight > stats.maxWeight) {
          stats.maxWeight = weight;
          stats.maxWeightFish = c.fishType;
          stats.maxWeightDate = c.capturedAt;
          stats.maxWeightNickname = c.nickname;
        }

        stats.fishTypes[c.fishType] = (stats.fishTypes[c.fishType] || 0) + 1;

        if (!stats.lastUsed || c.capturedAt > stats.lastUsed) {
          stats.lastUsed = c.capturedAt;
        }

        stats.catches.push({
          id: c.id,
          weight,
          fishType: c.fishType,
          capturedAt: c.capturedAt,
          nickname: c.nickname,
        });

        stats.monthlyUsage[month] = (stats.monthlyUsage[month] || 0) + 1;
      }

      const result = Array.from(baitMap.values()).map(s => {
        const topFishType = Object.entries(s.fishTypes).sort((a, b) => b[1] - a[1])[0];
        return {
          bait: s.bait,
          catchCount: s.catchCount,
          totalWeight: Math.round(s.totalWeight * 100) / 100,
          averageWeight: Math.round((s.totalWeight / s.catchCount) * 100) / 100,
          maxWeight: s.maxWeight,
          maxWeightFish: s.maxWeightFish,
          maxWeightDate: s.maxWeightDate,
          maxWeightNickname: s.maxWeightNickname,
          topFishType: topFishType ? { fishType: topFishType[0], count: topFishType[1] } : null,
          lastUsed: s.lastUsed,
          catches: s.catches,
          monthlyUsage: s.monthlyUsage,
        };
      }).sort((a, b) => b.catchCount - a.catchCount);

      res.json(result);
    } catch (error) {
      console.error("[BAIT-STATS] Error fetching bait statistics:", error);
      res.status(500).json({ message: "Failed to fetch bait statistics" });
    }
  });

  // Diary Catches endpoints
  // NOTE: Order matters! Specific routes (like /all) must come before param routes (like /:id)
  
  app.get('/api/diary/catches/all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const catches = await storage.getAllUserCatches(userId);
      res.json(catches);
    } catch (error) {
      console.error("Error fetching all diary catches:", error);
      res.status(500).json({ message: "Failed to fetch catches" });
    }
  });

  app.get('/api/diary/catches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const catch_ = await storage.getDiaryCatch(req.params.id, userId);
      
      if (!catch_) {
        return res.status(404).json({ message: "Úlovok sa nenašiel" });
      }
      
      res.json(catch_);
    } catch (error) {
      console.error("Error fetching diary catch:", error);
      if (error instanceof Error && error.message.includes('oprávnenie')) {
        return res.status(403).json({ message: error.message });
      }
      res.status(500).json({ message: "Failed to fetch catch" });
    }
  });

  // Create share link for a catch
  app.post('/api/diary/catches/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const catchId = req.params.id;
      
      // Verify user owns this catch
      const catch_ = await storage.getDiaryCatch(catchId, userId);
      if (!catch_) {
        return res.status(404).json({ message: "Úlovok sa nenašiel" });
      }
      
      // Get privacy settings from request body or use defaults
      const privacySettings = {
        hideGps: req.body.hideGps ?? true,
        hideBait: req.body.hideBait ?? true,
        hideSpot: req.body.hideSpot ?? false,
      };
      
      const result = await storage.createCatchShare(catchId, userId, privacySettings);
      
      res.json({
        shareToken: result.shareToken,
        shareUrl: result.shareUrl,
        fullUrl: `${req.protocol}://${req.get('host')}${result.shareUrl}`,
      });
    } catch (error) {
      console.error("Error creating share link:", error);
      res.status(500).json({ message: "Nepodarilo sa vytvoriť link na zdieľanie" });
    }
  });

  // Public endpoint - get shared catch (no authentication required)
  app.get('/api/public/catches/:shareToken', async (req, res) => {
    try {
      const { shareToken } = req.params;
      
      const catch_ = await storage.getCatchByShareToken(shareToken);
      
      if (!catch_) {
        return res.status(404).json({ message: "Zdieľaný úlovok sa nenašiel alebo expiroval" });
      }
      
      // Increment view count
      await storage.incrementShareViewCount(shareToken);
      
      res.json(catch_);
    } catch (error) {
      console.error("Error fetching shared catch:", error);
      res.status(500).json({ message: "Nepodarilo sa načítať zdieľaný úlovok" });
    }
  });

  app.get('/api/diary/catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const { tripId } = req.query;
      
      let catches;
      if (tripId) {
        catches = await storage.getDiaryCatches(tripId as string, userId);
      } else {
        // Get all user's trips and their catches
        const trips = await storage.getDiaryTrips(userId);
        catches = [];
        for (const trip of trips) {
          const tripCatches = await storage.getDiaryCatches(trip.id, userId);
          catches.push(...tripCatches);
        }
        // Sort by capture date (newest first)
        catches.sort((a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime());
      }
      
      res.json(catches);
    } catch (error) {
      console.error("Error fetching diary catches:", error);
      res.status(500).json({ message: "Failed to fetch catches" });
    }
  });

  // Helper function to check and award badges after catch creation
  async function checkAndAwardBadges(userId: string): Promise<Array<{ badgeType: string; tier: string; badgeName: string; icon: string }>> {
    const newBadges: Array<{ badgeType: string; tier: string; badgeName: string; icon: string }> = [];
    
    try {
      // Get existing badges for this user only
      const existingBadges = await db.query.userBadges.findMany({
        where: (badges: any) => eq(badges.userId, userId),
      });
      const existingBadgeSet = new Set(existingBadges.map(b => `${b.badgeType}_${b.tier}`));
      
      // Get user trips (only this user's trips)
      const userTrips = await db.query.diaryTrips.findMany({
        where: (trips: any) => eq(trips.ownerUserId, userId),
      });
      const tripIds = userTrips.map(t => t.id);
      
      // Get user catches - only catches from this user's trips or where user is angler
      // Use storage layer pattern to get catches efficiently
      let userCatches: any[] = [];
      for (const tripId of tripIds) {
        const tripCatches = await storage.getDiaryCatches(tripId, userId);
        userCatches.push(...tripCatches);
      }
      
      // Also get catches where user is angler but trip might belong to someone else (battle catches)
      const allUserCatches = await db.query.diaryCatches.findMany({
        where: (c: any) => sql`${c.angler}->>'userId' = ${userId}`,
      });
      
      // Merge and deduplicate
      const catchIds = new Set(userCatches.map(c => c.id));
      for (const c of allUserCatches) {
        if (!catchIds.has(c.id)) {
          userCatches.push(c);
        }
      }
      
      // Filter out historical catches - they don't count towards badges
      userCatches = userCatches.filter((c: any) => !c.isHistorical);
      
      // Calculate progress for each badge type
      const progress: Record<string, number> = {};
      
      // fishing_fanatic: Count unique days with trips (fix Date mutation bug)
      const uniqueTripDays = new Set<string>();
      userTrips.forEach(trip => {
        const startTime = new Date(trip.startDate).getTime();
        const endTime = new Date(trip.endDate).getTime();
        for (let time = startTime; time <= endTime; time += 86400000) {
          uniqueTripDays.add(new Date(time).toISOString().split('T')[0]);
        }
      });
      progress.fishing_fanatic = uniqueTripDays.size;
      
      // predator_threat: Count predator fish (stuka, zubac, sumec)
      const predatorTypes = ['stuka', 'zubac', 'sumec', 'zubac_zubatovity'];
      progress.predator_threat = userCatches.filter(c => predatorTypes.includes(c.fishType)).length;
      
      // big_mama_hunter: Biggest carp weight
      const carpTypes = ['kapor_supinac', 'kapor_lysec'];
      const carpCatches = userCatches.filter(c => carpTypes.includes(c.fishType));
      progress.big_mama_hunter = carpCatches.length > 0 
        ? Math.max(...carpCatches.map(c => parseFloat(c.weight) || 0))
        : 0;
      
      // carp_master: Count carps
      progress.carp_master = carpCatches.length;
      
      // species_collector: Unique fish types
      const uniqueSpecies = new Set(userCatches.map(c => c.fishType));
      progress.species_collector = uniqueSpecies.size;
      
      // night_hunter: Catches between 22:00-04:00
      progress.night_hunter = userCatches.filter(c => {
        if (!c.capturedAt) return false;
        const hour = new Date(c.capturedAt).getHours();
        return hour >= 22 || hour < 4;
      }).length;
      
      // detail_keeper: Catches with photo, bait, and weather
      progress.detail_keeper = userCatches.filter(c => {
        const hasPhoto = c.photos && Array.isArray(c.photos) && c.photos.length > 0;
        const hasBait = !!c.bait;
        const hasWeather = c.airTemp || c.waterTemp || c.windSpeed || c.airPressure;
        return hasPhoto && hasBait && hasWeather;
      }).length;
      
      // season_warrior: Unique seasons with catches
      const seasons = new Set<string>();
      userCatches.forEach(c => {
        if (!c.capturedAt) return;
        const month = new Date(c.capturedAt).getMonth();
        if (month >= 2 && month <= 4) seasons.add('spring');
        else if (month >= 5 && month <= 7) seasons.add('summer');
        else if (month >= 8 && month <= 10) seasons.add('autumn');
        else seasons.add('winter');
      });
      progress.season_warrior = seasons.size;
      
      // Check each badge type and tier for new achievements
      for (const [badgeId, badgeDef] of Object.entries(BADGE_DEFINITIONS)) {
        const currentValue = progress[badgeId] || 0;
        
        for (const tier of ['bronze', 'silver', 'gold'] as const) {
          const badgeKey = `${badgeId}_${tier}`;
          
          // Skip if already unlocked
          if (existingBadgeSet.has(badgeKey)) continue;
          
          const threshold = badgeDef.tiers[tier].threshold;
          
          // Check if threshold is met
          if (currentValue >= threshold) {
            // Award the badge
            await db.insert(userBadges).values({
              userId,
              badgeType: badgeId,
              tier,
            });
            
            newBadges.push({
              badgeType: badgeId,
              tier,
              badgeName: badgeDef.name,
              icon: badgeDef.icon
            });
            
            console.log(`[BADGES] Awarded ${badgeDef.name} (${tier}) to user ${userId}`);
          }
        }
      }
    } catch (error) {
      console.error('[BADGES] Error in checkAndAwardBadges:', error);
    }
    
    return newBadges;
  }

  app.post('/api/diary/catches', isAuthenticated, catchCreationLimiter, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      // Check freemium limits (optimized - skips count query for premium users)
      const catchLimit = await storage.checkDiaryCatchLimit(userId);
      if (!catchLimit.canCreate) {
        return res.status(403).json({ 
          message: "Dosiahli ste limit úlovkov. Prejdite na PREMIUM pre neobmedzené úlovky.",
          code: "LIMIT_REACHED"
        });
      }
      
      // Auto-assign active trip if tripId not provided
      let tripId = req.body.tripId;
      
      if (!tripId) {
        // Find active trip for this user
        const userTrips = await storage.getDiaryTrips(userId);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to midnight for accurate date comparison
        
        const activeTrip = userTrips.find((trip: any) => {
          const startDate = new Date(trip.startDate);
          const endDate = new Date(trip.endDate);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          
          return startDate <= today && today <= endDate;
        });
        
        if (activeTrip) {
          tripId = activeTrip.id;
        }
      }
      
      // Verify trip belongs to user (only if tripId is set)
      let trip = null;
      if (tripId) {
        trip = await storage.getDiaryTrip(tripId, userId);
        if (!trip) {
          return res.status(403).json({ message: "Invalid trip" });
        }
      }
      
      // Auto-assign active battle if battleId not provided
      let battleId = req.body.battleId;
      
      if (!battleId) {
        const today = new Date();
        
        // First, try to find battles where user is invited
        const acceptedInvitations = await storage.getUserBattleInvitations(userId, 'accepted');
        const activeBattleInvitation = acceptedInvitations.find((inv: any) => {
          if (!inv.battle) return false;
          
          const startDate = new Date(inv.battle.startAt);
          const endDate = new Date(inv.battle.endAt);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          
          return startDate <= today && today <= endDate;
        });
        
        if (activeBattleInvitation?.battle) {
          battleId = activeBattleInvitation.battle.id;
        } else if (tripId) {
          // If no invited battle found, check if trip has an active battle (user is trip owner)
          const tripBattles = await storage.getDiaryBattles(tripId, userId);
          const activeTripBattle = tripBattles.find((battle: any) => {
            const startDate = new Date(battle.startAt);
            const endDate = new Date(battle.endAt);
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(23, 59, 59, 999);
            
            return startDate <= today && today <= endDate && battle.status === 'active';
          });
          
          if (activeTripBattle) {
            battleId = activeTripBattle.id;
          }
        }
      }
      
      // Auto-verify catches created during active battles (user's own catches with photos)
      let verified = false;
      if (battleId) {
        // Catch is being created during an active battle - auto-verify it
        verified = true;
      }
      
      // Server controls angler.userId, tripId (auto-assigned), battleId (auto-assigned), and verified status
      const catchData = {
        ...req.body,
        tripId: tripId || undefined, // Use auto-assigned tripId or undefined if no active trip
        battleId: battleId || undefined, // Use auto-assigned battleId or undefined if no active battle
        angler: {
          ...req.body.angler,
          userId: userId
        },
        verified, // Auto-verified if created during active battle
        photos: req.body.photos || [], // Photos will be uploaded separately
        capturedAt: new Date(req.body.capturedAt) // Convert string date to Date object
      };
      
      const newCatch = await storage.createDiaryCatch(catchData, userId);
      
      // Send battle catch notification if catch was created during active battle
      if (battleId) {
        setTimeout(async () => {
          try {
            const battle = await storage.getDiaryBattleById(battleId);
            if (battle && battle.status === 'active') {
              const participantUserIds = battle.participants
                .map(p => p.userId)
                .filter((id): id is string => !!id);
              
              await notificationService.notifyBattleCatchAdded(
                battle.id,
                battle.name,
                parseFloat(newCatch.weight),
                newCatch.fishType,
                newCatch.angler.name,
                userId,
                participantUserIds
              );
            }
          } catch (notifError) {
            console.error('[BG] Error sending battle catch notification:', notifError);
          }
        }, 0);
      }
      
      // Update seasonal goals progress in background (non-blocking)
      setTimeout(() => {
        storage.updateAllUserGoalsProgress(userId).catch(error => {
          console.error('[BG] Error updating goals progress:', error);
        });
      }, 0);
      
      // Check and award badges synchronously (user needs to see them for confetti)
      let newBadges: Array<{ badgeType: string; tier: string; badgeName: string; icon: string }> = [];
      try {
        newBadges = await checkAndAwardBadges(userId);
      } catch (badgeError) {
        console.error('[BADGES] Error checking/awarding badges:', badgeError);
      }
      
      res.status(201).json({ ...newCatch, newBadges });
    } catch (error) {
      console.error("Error creating diary catch:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid catch data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create catch" });
    }
  });

  // Create historical catch - for old catches that don't count towards stats/badges
  app.post('/api/diary/catches/historical', isAuthenticated, upload.array('photos', 5), async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      const { capturedAt, weight, fishType, spot, lengthCm, notes } = req.body;
      
      // Validate required fields
      if (!capturedAt || !weight || !fishType || !spot) {
        return res.status(400).json({ 
          message: "Chýbajú povinné polia (dátum, váha, druh ryby, revír)" 
        });
      }
      
      // Validate date is in the past
      const catchDate = new Date(capturedAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (catchDate >= today) {
        return res.status(400).json({ 
          message: "Historický úlovok musí byť z minulosti" 
        });
      }
      
      // Validate weight is positive
      const weightNum = parseFloat(weight);
      if (isNaN(weightNum) || weightNum <= 0) {
        return res.status(400).json({ 
          message: "Váha musí byť väčšia ako 0" 
        });
      }
      
      const photos: Array<{ id: string; url: string; status: 'ready' }> = [];
      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files as any[]) {
          const photoId = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          let photoUrl = `/uploads/${file.filename}`;
          try {
            const imageMetadata = await ImageService.processImage(
              file.path,
              path.join('uploads', 'historical', photoId),
              photoId,
              undefined, undefined, undefined,
              `diary_photos/${userId}/historical`
            );
            const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'webp') ||
                                ImageService.getBestVariantForWidth(imageMetadata.variants, 800, 'jpeg') ||
                                imageMetadata.variants[0];
            photoUrl = bestVariant?.url || photoUrl;
            await ImageService.cleanupTempFile(file.path);
          } catch (error) {
            console.error("Error processing historical catch photo:", error);
          }
          photos.push({
            id: photoId,
            url: photoUrl,
            status: 'ready' as const
          });
        }
      }
      
      // Get user info for angler field
      const user = await storage.getUser(userId);
      const anglerName = user?.firstName && user?.lastName 
        ? `${user.firstName} ${user.lastName}` 
        : user?.email?.split('@')[0] || 'Unknown';
      
      // Create historical catch data - explicitly marked as historical
      const catchData = {
        capturedAt: catchDate,
        weight: weight.toString(),
        fishType,
        spot,
        lengthCm: lengthCm ? parseInt(lengthCm) : undefined,
        notes: notes || undefined,
        photos,
        angler: {
          userId,
          name: anglerName
        },
        isHistorical: true, // CRITICAL: Mark as historical - won't count in stats/badges
        verified: false,
        tripId: undefined,
        battleId: undefined
      };
      
      const newCatch = await storage.createDiaryCatch(catchData as any, userId);
      
      console.log(`[HISTORICAL] Created historical catch for user ${userId}: ${fishType} ${weight}kg`);
      
      res.status(201).json(newCatch);
    } catch (error) {
      console.error("Error creating historical catch:", error);
      res.status(500).json({ message: "Nepodarilo sa uložiť historický úlovok" });
    }
  });

  app.put('/api/diary/catches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const catchId = req.params.id;
      
      // Check if user owns this catch through trip ownership
      const catch_ = await storage.getDiaryCatch(catchId, userId);
      if (!catch_) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      // Convert capturedAt string to Date object if present
      const updateData = { ...req.body };
      if (updateData.capturedAt) {
        updateData.capturedAt = new Date(updateData.capturedAt);
      }
      
      const updatedCatch = await storage.updateDiaryCatch(catchId, updateData, userId);
      
      // Update seasonal goals progress in background (non-blocking)
      setTimeout(() => {
        storage.updateAllUserGoalsProgress(userId).catch(error => {
          console.error('[BG] Error updating goals progress:', error);
        });
      }, 0);
      
      res.json(updatedCatch);
    } catch (error) {
      console.error("Error updating diary catch:", error);
      res.status(500).json({ message: "Failed to update catch" });
    }
  });

  app.delete('/api/diary/catches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const catchId = req.params.id;
      
      // Check if user owns this catch through trip ownership
      const catch_ = await storage.getDiaryCatch(catchId, userId);
      if (!catch_) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      await storage.deleteDiaryCatch(catchId, userId);
      
      // Update seasonal goals progress in background (non-blocking)
      setTimeout(() => {
        storage.updateAllUserGoalsProgress(userId).catch(error => {
          console.error('[BG] Error updating goals progress:', error);
        });
      }, 0);
      
      res.json({ message: "Catch deleted successfully" });
    } catch (error) {
      console.error("Error deleting diary catch:", error);
      res.status(500).json({ message: "Failed to delete catch" });
    }
  });

  // Add photos to existing catch (background upload after instant save)
  app.patch('/api/diary/catches/:id/photos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const catchId = req.params.id;
      
      // Check if user owns this catch
      const catch_ = await storage.getDiaryCatch(catchId, userId);
      if (!catch_) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      // Get existing photos and new photos from request
      const existingPhotos = catch_.photos || [];
      const newPhotos = req.body.photos || [];
      
      // Merge photos (remove _processingInfo from stored data)
      const cleanPhotos = newPhotos.map((photo: any) => {
        const { _processingInfo, ...cleanPhoto } = photo;
        return cleanPhoto;
      });
      const allPhotos = [...existingPhotos, ...cleanPhotos];
      
      // Update catch with new photos
      const updatedCatch = await storage.updateDiaryCatch(catchId, { photos: allPhotos }, userId);
      
      // NOW queue background processing jobs for new photos
      // This happens AFTER photos are attached to catch, preventing race condition
      const { photoJobQueue } = await import('./photo-job-queue');
      for (const photo of newPhotos) {
        if (photo._processingInfo && photo.status === 'processing') {
          photoJobQueue.addJob({
            catchId,
            photoId: photo.id,
            userId: photo._processingInfo.userId,
            originalPath: photo._processingInfo.originalPath,
            originalFilename: photo._processingInfo.originalFilename,
            outputBasePath: photo._processingInfo.outputBasePath,
            priority: 5,
            maxAttempts: 3
          });
          console.log(`[PhotoQueue] Queued processing for photo ${photo.id} in catch ${catchId}`);
        }
      }
      
      res.json(updatedCatch);
    } catch (error) {
      console.error("Error adding photos to catch:", error);
      res.status(500).json({ message: "Failed to add photos" });
    }
  });

  // Diary Limits endpoints
  app.get('/api/diary/trip-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const limits = await storage.checkDiaryTripLimit(userId);
      res.json(limits);
    } catch (error) {
      console.error("Error fetching diary trip limits:", error);
      res.status(500).json({ message: "Failed to fetch trip limits" });
    }
  });

  app.get('/api/diary/catch-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const limits = await storage.checkDiaryCatchLimit(userId);
      res.json(limits);
    } catch (error) {
      console.error("Error fetching diary catch limits:", error);
      res.status(500).json({ message: "Failed to fetch catch limits" });
    }
  });

  // Get user badges
  app.get('/api/diary/badges', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      const badges = await db.query.userBadges.findMany({
        where: (badges: any) => eq(badges.userId, userId),
      });
      res.json(badges || []);
    } catch (error) {
      console.error("Error fetching user badges:", error);
      res.status(500).json({ message: "Failed to fetch badges" });
    }
  });

  // Get badge progress - current values for each badge type
  app.get('/api/diary/badges/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.id || req.user?.claims?.sub;
      
      // Get all user trips (using ownerUserId column)
      const userTrips = await db.query.diaryTrips.findMany({
        where: (trips: any) => eq(trips.ownerUserId, userId),
      });
      
      // Get trip IDs to fetch related catches
      const tripIds = userTrips.map(t => t.id);
      
      // Get catches from user's trips OR catches where user is the angler
      const allCatches = await db.query.diaryCatches.findMany();
      
      // Filter catches: either from user's trips or user is the angler
      const userCatches = allCatches.filter(c => {
        const isFromUserTrip = c.tripId && tripIds.includes(c.tripId);
        const isUserAngler = c.angler?.userId === userId;
        return isFromUserTrip || isUserAngler;
      });
      
      // Calculate progress for each badge type
      const progress: Record<string, number> = {};
      
      // fishing_fanatic: Count unique days with trips
      const uniqueDays = new Set(userTrips.map(t => {
        if (!t.startDate) return null;
        return new Date(t.startDate).toISOString().split('T')[0];
      }).filter(Boolean));
      progress.fishing_fanatic = uniqueDays.size;
      
      // predator_threat: Count predator fish (Šťuka, Zubáč, Sumec)
      const predatorTypes = ['šťuka', 'stuka', 'zubáč', 'zubac', 'sumec'];
      progress.predator_threat = userCatches.filter(c => 
        predatorTypes.some(p => c.fishType?.toLowerCase().includes(p))
      ).length;
      
      // big_mama_hunter: Max weight of carp in kg
      const carpCatches = userCatches.filter(c => 
        c.fishType?.toLowerCase().includes('kapor') || c.fishType?.toLowerCase().includes('carp')
      );
      progress.big_mama_hunter = Math.max(0, ...carpCatches.map(c => parseFloat(c.weight || '0')));
      
      // carp_master: Count carp catches
      progress.carp_master = carpCatches.length;
      
      // species_collector: Count unique species
      const uniqueSpecies = new Set(userCatches.map(c => c.fishType?.toLowerCase()).filter(Boolean));
      progress.species_collector = uniqueSpecies.size;
      
      // night_hunter: Count catches between 22:00-04:00
      progress.night_hunter = userCatches.filter(c => {
        if (!c.capturedAt) return false;
        const hour = new Date(c.capturedAt).getHours();
        return hour >= 22 || hour < 4;
      }).length;
      
      // detail_keeper: Count catches with photo, bait, and weather info
      progress.detail_keeper = userCatches.filter(c => {
        const hasPhoto = c.photos && Array.isArray(c.photos) && c.photos.length > 0;
        const hasBait = !!c.bait;
        const hasWeather = c.airTemp || c.waterTemp || c.windSpeed || c.airPressure;
        return hasPhoto && hasBait && hasWeather;
      }).length;
      
      // season_warrior: Count unique seasons with catches
      const seasons = new Set<string>();
      userCatches.forEach(c => {
        if (!c.capturedAt) return;
        const month = new Date(c.capturedAt).getMonth();
        if (month >= 2 && month <= 4) seasons.add('spring');
        else if (month >= 5 && month <= 7) seasons.add('summer');
        else if (month >= 8 && month <= 10) seasons.add('autumn');
        else seasons.add('winter');
      });
      progress.season_warrior = seasons.size;
      
      res.json(progress);
    } catch (error) {
      console.error("Error fetching badge progress:", error);
      res.status(500).json({ message: "Failed to fetch badge progress" });
    }
  });

  // Helper to normalize diacritics for search (ľščťžýáíéúäôň -> lsctzyaieuaon)
  const removeDiacritics = (str: string): string => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };
  
  // Fishing areas endpoint - Get all fishing areas with optional search
  app.get('/api/fishing-areas', async (req, res) => {
    try {
      const { search = '' } = req.query;
      
      let areas = await db.select().from(fishingAreas);
      
      if (search && typeof search === 'string') {
        const searchNormalized = removeDiacritics(search.toLowerCase());
        areas = areas.filter(area => {
          const numberNorm = removeDiacritics(area.number.toLowerCase());
          const nameNorm = removeDiacritics(area.name.toLowerCase());
          const notesNorm = area.notes ? removeDiacritics(area.notes.toLowerCase()) : '';
          return numberNorm.includes(searchNormalized) || 
                 nameNorm.includes(searchNormalized) ||
                 notesNorm.includes(searchNormalized);
        });
      }
      
      // Sort by number, limit to 100 results
      areas = areas
        .sort((a, b) => a.number.localeCompare(b.number))
        .slice(0, 100);
      
      res.json(areas);
    } catch (error) {
      console.error("Error fetching fishing areas:", error);
      res.status(500).json({ message: "Failed to fetch fishing areas" });
    }
  });

  // Premium status endpoint - uses consistent isUserPremium() check
  app.get('/api/auth/premium-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const isPremium = await storage.isUserPremium(userId);
      res.json({ isPremium });
    } catch (error) {
      console.error("Error checking premium status:", error);
      res.status(500).json({ message: "Failed to check premium status" });
    }
  });

  // Serve uploaded files securely
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  // Serve diary photos with proper cache headers
  app.use('/attached_assets', (req, res, next) => {
    // Set cache headers for images
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
      'Expires': new Date(Date.now() + 31536000000).toUTCString(), // 1 year from now
    });
    next();
  }, express.static(path.join(process.cwd(), 'attached_assets')));

  // Helper function to derive unit from goal type
  function getUnitForGoalType(goalType: string): string {
    const unitMap: Record<string, string> = {
      'total_weight': 'kg',
      'fish_count': 'ks',
      'trips_count': 'výjazdov',
      'biggest_fish': 'kg',
      'personal_best': 'kg',
      'species_variety': 'druhov',
      'min_size_catch_count': 'ks',
      'min_weight_catch_count': 'ks',
      'spot_catch_count': 'ks',
      'bait_catch_count': 'ks',
      'night_trips_count': 'nočných',
    };
    return unitMap[goalType] || '';
  }

  // Transform goal to include derived unit field
  function transformGoalWithUnit(goal: any) {
    return {
      ...goal,
      unit: getUnitForGoalType(goal.goalType),
    };
  }

  // Seasonal Goals API endpoints
  // Get all seasons
  app.get('/api/seasons', async (req, res) => {
    try {
      const seasons = await storage.getSeasons();
      res.json(seasons);
    } catch (error) {
      console.error("[SEASONS] Error fetching seasons:", error);
      res.status(500).json({ message: "Failed to fetch seasons" });
    }
  });

  // Get current season
  app.get('/api/seasons/current', async (req, res) => {
    try {
      const currentSeason = await storage.getCurrentSeason();
      res.json(currentSeason);
    } catch (error) {
      console.error("[SEASONS] Error fetching current season:", error);
      res.status(500).json({ message: "Failed to fetch current season" });
    }
  });

  // Get user seasonal goals for current season
  app.get('/api/seasonal-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const goals = await storage.getUserSeasonGoals(userId);
      // Transform goals to include derived unit field
      const goalsWithUnit = goals.map(transformGoalWithUnit);
      res.json(goalsWithUnit);
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error fetching user goals:", error);
      res.status(500).json({ message: "Failed to fetch seasonal goals" });
    }
  });

  // Get goal limit status for current season
  app.get('/api/seasonal-goals/limit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(400).json({ message: "No active season found" });
      }
      const limitCheck = await storage.checkSeasonGoalLimit(userId, currentSeason.id);
      res.json(limitCheck);
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error fetching goal limit:", error);
      res.status(500).json({ message: "Failed to fetch goal limit" });
    }
  });

  // Create new seasonal goal
  app.post('/api/seasonal-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      // Check if user can create goal (freemium limits)
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(400).json({ message: "No active season found" });
      }
      
      const limitCheck = await storage.checkSeasonGoalLimit(userId, currentSeason.id);
      if (!limitCheck.canCreate) {
        return res.status(403).json({ 
          message: `Dosiahol si maximálny počet cieľov pre FREE účet (${limitCheck.currentCount} / ${limitCheck.limit}). Pre neobmedzené ciele prejdi na PREMIUM.`,
          limitReached: true,
          currentCount: limitCheck.currentCount,
          limit: limitCheck.limit
        });
      }

      const validatedData = insertSeasonGoalSchema.parse({ 
        ...req.body, 
        userId 
      });
      
      const goal = await storage.createSeasonGoal(validatedData, userId);
      
      // Initialize progress tracking
      await storage.updateGoalProgress(goal.id, 'initialization', 0);
      
      // Return goal with derived unit field
      res.status(201).json(transformGoalWithUnit(goal));
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error creating goal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create seasonal goal" });
    }
  });

  // Update seasonal goal
  app.put('/api/seasonal-goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify ownership
      const existingGoal = await storage.getSeasonGoal(id, userId);
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      const validatedData = updateSeasonGoalSchema.parse(req.body);
      const updatedGoal = await storage.updateSeasonGoal(id, validatedData, userId);
      
      // Recalculate progress if target changed
      if (validatedData.targetValue !== undefined) {
        await storage.updateGoalProgress(id, 'recalculation', 0);
      }
      
      // Return goal with derived unit field
      res.json(transformGoalWithUnit(updatedGoal));
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error updating goal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update seasonal goal" });
    }
  });

  // Delete seasonal goal
  app.delete('/api/seasonal-goals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify ownership
      const existingGoal = await storage.getSeasonGoal(id, userId);
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      await storage.deleteSeasonGoal(id, userId);
      res.status(204).send();
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error deleting goal:", error);
      res.status(500).json({ message: "Failed to delete seasonal goal" });
    }
  });

  // Set goal as main goal
  app.post('/api/seasonal-goals/:id/main', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { id } = req.params;
      
      // Verify ownership
      const existingGoal = await storage.getSeasonGoal(id, userId);
      if (!existingGoal || existingGoal.userId !== userId) {
        return res.status(404).json({ message: "Goal not found" });
      }

      await storage.setMainGoal(userId, id);
      res.json({ message: "Main goal updated successfully" });
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error setting main goal:", error);
      res.status(500).json({ message: "Failed to set main goal" });
    }
  });

  // Get seasonal goals progress for user
  app.get('/api/seasonal-goals/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      // Get user goals and their progress
      const goals = await storage.getUserSeasonGoals(userId);
      const progress = await Promise.all(
        goals.map(async (goal) => {
          const goalProgress = await storage.getGoalProgress(goal.id, userId);
          return { goal: transformGoalWithUnit(goal), progress: goalProgress };
        })
      );
      res.json(progress);
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch seasonal goals progress" });
    }
  });

  // Update all user goals progress (called after diary changes)
  app.post('/api/seasonal-goals/update-progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      await storage.updateAllUserGoalsProgress(userId);
      res.json({ message: "Progress updated successfully" });
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  // Get weather data from WeatherAPI.com
  app.get('/api/weather', isAuthenticated, async (req: any, res) => {
    try {
      const { lat, lon, datetime } = req.query;

      if (!lat || !lon || !datetime) {
        return res.status(400).json({ 
          message: "Missing required parameters: lat, lon, datetime" 
        });
      }

      // Parse and validate datetime
      const date = new Date(datetime as string);
      if (isNaN(date.getTime())) {
        return res.status(400).json({ 
          message: "Invalid datetime format" 
        });
      }

      // Use Unix timestamp for timezone-independent date querying
      const unixTimestamp = Math.floor(date.getTime() / 1000);

      // Call WeatherAPI History API (HTTPS for security)
      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        console.error("[WEATHER] WEATHER_API_KEY not configured");
        return res.status(500).json({ message: "Weather API not configured" });
      }

      const apiUrl = `https://api.weatherapi.com/v1/history.json?key=${apiKey}&q=${lat},${lon}&unixdt=${unixTimestamp}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`[WEATHER] API error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          message: "Failed to fetch weather data" 
        });
      }

      const data = await response.json();

      // Find closest hourly data by comparing Unix timestamps
      const requestedTimestamp = date.getTime() / 1000;
      let closestHourData = null;
      let minTimeDiff = Infinity;

      for (const h of data.forecast?.forecastday?.[0]?.hour || []) {
        const hourTimestamp = h.time_epoch;
        const timeDiff = Math.abs(hourTimestamp - requestedTimestamp);
        
        if (timeDiff < minTimeDiff) {
          minTimeDiff = timeDiff;
          closestHourData = h;
        }
      }

      const hourData = closestHourData;

      if (!hourData) {
        // Fallback to day average if hour not found
        const dayData = data.forecast?.forecastday?.[0]?.day;
        return res.json({
          temperature: dayData?.avgtemp_c || null,
          windSpeed: dayData?.maxwind_kph || null,
          pressure: null, // Day data doesn't have pressure
        });
      }

      // Return weather data
      res.json({
        temperature: hourData.temp_c,
        windSpeed: hourData.wind_kph,
        pressure: hourData.pressure_mb,
      });

    } catch (error) {
      console.error("[WEATHER] Error fetching weather:", error);
      res.status(500).json({ message: "Failed to fetch weather data" });
    }
  });

  // Search/Autocomplete for locations from WeatherAPI.com
  app.get('/api/weather/search', isAuthenticated, async (req: any, res) => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.json([]);
      }

      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        console.error("[WEATHER] WEATHER_API_KEY not configured");
        return res.status(500).json({ message: "Weather API not configured" });
      }

      // Call WeatherAPI Search/Autocomplete API
      const apiUrl = `https://api.weatherapi.com/v1/search.json?key=${apiKey}&q=${encodeURIComponent(q)}`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`[WEATHER] Search API error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          message: "Failed to search locations" 
        });
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("[WEATHER] Error searching locations:", error);
      res.status(500).json({ message: "Failed to search weather locations" });
    }
  });

  // Get weather forecast from WeatherAPI.com
  app.get('/api/weather/forecast', isAuthenticated, async (req: any, res) => {
    try {
      const { lat, lon, q } = req.query;

      // Support both lat/lon and location query - strict validation
      const hasCoordinates = lat && lon;
      const hasLocationQuery = q && typeof q === 'string';
      
      if (!hasCoordinates && !hasLocationQuery) {
        return res.status(400).json({ 
          message: "Missing required parameters: either both lat and lon, or q" 
        });
      }

      const apiKey = process.env.WEATHER_API_KEY;
      if (!apiKey) {
        console.error("[WEATHER] WEATHER_API_KEY not configured");
        return res.status(500).json({ message: "Weather API not configured" });
      }

      // Build query parameter - either coordinates or location name
      const queryParam = hasLocationQuery ? encodeURIComponent(q as string) : `${lat},${lon}`;
      
      // Call WeatherAPI Forecast API for 3 days with hourly data
      const apiUrl = `https://api.weatherapi.com/v1/forecast.json?key=${apiKey}&q=${queryParam}&days=3&lang=sk`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        console.error(`[WEATHER] Forecast API error: ${response.status} ${response.statusText}`);
        return res.status(response.status).json({ 
          message: "Failed to fetch weather forecast" 
        });
      }

      const data = await response.json();
      res.json(data);

    } catch (error) {
      console.error("[WEATHER] Error fetching forecast:", error);
      res.status(500).json({ message: "Failed to fetch weather forecast" });
    }
  });

  // Bait (Nástrahy) API endpoints
  app.get('/api/baits/manufacturers', isAuthenticated, async (req: any, res) => {
    try {
      const manufacturers = await db.select().from(baitManufacturers).orderBy(baitManufacturers.name);
      res.json(manufacturers);
    } catch (error) {
      console.error("[BAITS] Error fetching manufacturers:", error);
      res.status(500).json({ message: "Failed to fetch bait manufacturers" });
    }
  });

  app.get('/api/baits/product-lines', isAuthenticated, async (req: any, res) => {
    try {
      const { manufacturerId } = req.query;
      
      if (!manufacturerId) {
        return res.status(400).json({ message: "manufacturerId is required" });
      }

      const productLines = await db
        .select()
        .from(baitProductLines)
        .where(eq(baitProductLines.manufacturerId, parseInt(manufacturerId as string)))
        .orderBy(baitProductLines.name);
        
      res.json(productLines);
    } catch (error) {
      console.error("[BAITS] Error fetching product lines:", error);
      res.status(500).json({ message: "Failed to fetch product lines" });
    }
  });

  app.get('/api/baits/flavors', isAuthenticated, async (req: any, res) => {
    try {
      const { productLineId } = req.query;
      
      if (!productLineId) {
        return res.status(400).json({ message: "productLineId is required" });
      }

      const flavors = await db
        .select()
        .from(baitFlavors)
        .where(eq(baitFlavors.productLineId, parseInt(productLineId as string)))
        .orderBy(baitFlavors.name);
        
      res.json(flavors);
    } catch (error) {
      console.error("[BAITS] Error fetching flavors:", error);
      res.status(500).json({ message: "Failed to fetch flavors" });
    }
  });

  // Combined manufacturer search endpoint for bait combobox
  app.get('/api/baits/manufacturers/search', isAuthenticated, async (req: any, res) => {
    try {
      const results = await db
        .select({
          manufacturerId: baitManufacturers.id,
          manufacturerName: baitManufacturers.name,
          productLineId: baitProductLines.id,
          productLineName: baitProductLines.name,
          flavorId: baitFlavors.id,
          flavorName: baitFlavors.name,
        })
        .from(baitManufacturers)
        .leftJoin(baitProductLines, eq(baitProductLines.manufacturerId, baitManufacturers.id))
        .leftJoin(baitFlavors, eq(baitFlavors.productLineId, baitProductLines.id))
        .orderBy(baitManufacturers.name, baitProductLines.name, baitFlavors.name);

      const grouped: Record<number, {
        id: number;
        name: string;
        flavors: Array<{ id: number; name: string; productLine: string; productLineId: number | null }>;
      }> = {};

      for (const row of results) {
        if (!grouped[row.manufacturerId]) {
          grouped[row.manufacturerId] = {
            id: row.manufacturerId,
            name: row.manufacturerName,
            flavors: [],
          };
        }
        if (row.flavorId && row.flavorName) {
          grouped[row.manufacturerId].flavors.push({
            id: row.flavorId,
            name: row.flavorName,
            productLine: row.productLineName || "",
            productLineId: row.productLineId || null,
          });
        }
      }

      res.json(Object.values(grouped));
    } catch (error) {
      console.error("[BAITS] Error searching manufacturers:", error);
      res.status(500).json({ message: "Failed to search manufacturers" });
    }
  });

  // User Arsenal Baits endpoints
  app.get('/api/diary/arsenal/baits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      
      const arsenalBaits = await db
        .select({
          id: userArsenalBaits.id,
          diameter: userArsenalBaits.diameter,
          notes: userArsenalBaits.notes,
          isFavorite: userArsenalBaits.isFavorite,
          createdAt: userArsenalBaits.createdAt,
          manufacturer: {
            id: baitManufacturers.id,
            name: baitManufacturers.name,
          },
          productLine: {
            id: baitProductLines.id,
            name: baitProductLines.name,
          },
          flavor: {
            id: baitFlavors.id,
            name: baitFlavors.name,
          },
        })
        .from(userArsenalBaits)
        .leftJoin(baitManufacturers, eq(userArsenalBaits.manufacturerId, baitManufacturers.id))
        .leftJoin(baitProductLines, eq(userArsenalBaits.productLineId, baitProductLines.id))
        .leftJoin(baitFlavors, eq(userArsenalBaits.flavorId, baitFlavors.id))
        .where(eq(userArsenalBaits.userId, userId))
        .orderBy(desc(userArsenalBaits.createdAt));
      
      res.json(arsenalBaits);
    } catch (error) {
      console.error("[ARSENAL] Error fetching user arsenal baits:", error);
      res.status(500).json({ message: "Failed to fetch arsenal baits" });
    }
  });

  app.get('/api/diary/arsenal/baits/favorites', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);

      const favoriteBaits = await db
        .select({
          id: userArsenalBaits.id,
          diameter: userArsenalBaits.diameter,
          manufacturer: {
            id: baitManufacturers.id,
            name: baitManufacturers.name,
          },
          productLine: {
            id: baitProductLines.id,
            name: baitProductLines.name,
          },
          flavor: {
            id: baitFlavors.id,
            name: baitFlavors.name,
          },
        })
        .from(userArsenalBaits)
        .leftJoin(baitManufacturers, eq(userArsenalBaits.manufacturerId, baitManufacturers.id))
        .leftJoin(baitProductLines, eq(userArsenalBaits.productLineId, baitProductLines.id))
        .leftJoin(baitFlavors, eq(userArsenalBaits.flavorId, baitFlavors.id))
        .where(and(
          eq(userArsenalBaits.userId, userId),
          eq(userArsenalBaits.isFavorite, true)
        ))
        .orderBy(baitManufacturers.name, baitProductLines.name, baitFlavors.name);

      res.json(favoriteBaits);
    } catch (error) {
      console.error("[ARSENAL] Error fetching favorite baits:", error);
      res.status(500).json({ message: "Failed to fetch favorite baits" });
    }
  });

  app.post('/api/diary/arsenal/baits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertUserArsenalBaitSchema.parse({
        ...req.body,
        userId,
      });

      const [newBait] = await db
        .insert(userArsenalBaits)
        .values(validatedData as any)
        .returning();

      res.status(201).json(newBait);
    } catch (error) {
      console.error("[ARSENAL] Error adding bait to arsenal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add bait to arsenal" });
    }
  });

  app.post('/api/diary/arsenal/baits/bulk', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const { manufacturerId, productLineId, diameter, notes } = req.body;

      if (!manufacturerId || !productLineId) {
        return res.status(400).json({ message: "manufacturerId and productLineId are required" });
      }

      // Get all flavors for this product line
      const flavors = await db
        .select()
        .from(baitFlavors)
        .where(eq(baitFlavors.productLineId, parseInt(productLineId as string)));

      if (flavors.length === 0) {
        return res.status(404).json({ message: "No flavors found for this product line" });
      }

      // Get existing baits for this user and product line to avoid duplicates
      const existingBaits = await db
        .select({ flavorId: userArsenalBaits.flavorId })
        .from(userArsenalBaits)
        .where(
          and(
            eq(userArsenalBaits.userId, userId),
            eq(userArsenalBaits.productLineId, parseInt(productLineId as string))
          )
        );

      const existingFlavorIds = new Set(existingBaits.map(b => b.flavorId));
      
      // Filter out flavors that already exist
      const newFlavors = flavors.filter(flavor => !existingFlavorIds.has(flavor.id));
      const skippedCount = flavors.length - newFlavors.length;

      if (newFlavors.length === 0) {
        return res.status(200).json({ 
          count: 0, 
          skipped: flavors.length,
          message: "All flavors from this product line are already in your arsenal" 
        });
      }

      // Create bulk insert values for new flavors only
      const bulkValues = newFlavors.map(flavor => ({
        userId,
        manufacturerId: parseInt(manufacturerId as string),
        productLineId: parseInt(productLineId as string),
        flavorId: flavor.id,
        diameter: diameter || null,
        notes: notes || null,
        isFavorite: false,
      }));

      // Insert all new baits at once
      const insertedBaits = await db
        .insert(userArsenalBaits)
        .values(bulkValues)
        .returning();

      res.status(201).json({ 
        count: insertedBaits.length,
        skipped: skippedCount,
        message: `Successfully added ${insertedBaits.length} baits to arsenal${skippedCount > 0 ? ` (${skippedCount} already existed)` : ''}` 
      });
    } catch (error) {
      console.error("[ARSENAL] Error bulk adding baits to arsenal:", error);
      res.status(500).json({ message: "Failed to bulk add baits to arsenal" });
    }
  });

  app.patch('/api/diary/arsenal/baits/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const baitId = parseInt(req.params.id);

      if (isNaN(baitId)) {
        return res.status(400).json({ message: "Invalid bait ID" });
      }

      // Get current bait to verify ownership and get current favorite status
      const [bait] = await db
        .select()
        .from(userArsenalBaits)
        .where(
          and(
            eq(userArsenalBaits.id, baitId),
            eq(userArsenalBaits.userId, userId)
          )
        );

      if (!bait) {
        return res.status(404).json({ message: "Bait not found or does not belong to you" });
      }

      // Toggle favorite status
      const [updatedBait] = await db
        .update(userArsenalBaits)
        .set({ isFavorite: !bait.isFavorite })
        .where(eq(userArsenalBaits.id, baitId))
        .returning();

      res.json(updatedBait);
    } catch (error) {
      console.error("[ARSENAL] Error toggling favorite bait:", error);
      res.status(500).json({ message: "Failed to toggle favorite bait" });
    }
  });

  app.delete('/api/diary/arsenal/baits/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const baitId = parseInt(req.params.id);

      if (isNaN(baitId)) {
        return res.status(400).json({ message: "Invalid bait ID" });
      }

      const [deletedBait] = await db
        .delete(userArsenalBaits)
        .where(and(
          eq(userArsenalBaits.id, baitId),
          eq(userArsenalBaits.userId, userId)
        ))
        .returning();

      if (!deletedBait) {
        return res.status(404).json({ message: "Bait not found in arsenal" });
      }

      res.json({ message: "Bait removed from arsenal" });
    } catch (error) {
      console.error("[ARSENAL] Error deleting bait from arsenal:", error);
      res.status(500).json({ message: "Failed to delete bait from arsenal" });
    }
  });

  // ==========================================
  // Simple Bait Management (MVP) API endpoints
  // ==========================================

  app.get('/api/diary/baits/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const brands = await db.query.userBaitBrands.findMany({
        where: eq(userBaitBrands.userId, userId),
        with: { flavors: true },
        orderBy: [userBaitBrands.name],
      });
      res.json(brands);
    } catch (error) {
      console.error("[BAITS-MVP] Error fetching brands:", error);
      res.status(500).json({ message: "Failed to fetch bait brands" });
    }
  });

  app.post('/api/diary/baits/brands', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const normalizedName = (req.body.name || "").trim().replace(/\s+/g, ' ');
      if (!normalizedName) return res.status(400).json({ message: "Názov značky je povinný" });
      const existing = await db.query.userBaitBrands.findFirst({
        where: and(
          eq(userBaitBrands.userId, userId),
          sql`lower(${userBaitBrands.name}) = lower(${normalizedName})`
        ),
        with: { flavors: true },
      });
      if (existing) return res.json(existing);
      try {
        const [brand] = await db.insert(userBaitBrands).values({ userId, name: normalizedName }).returning();
        const brandWithFlavors = { ...brand, flavors: [] };
        res.status(201).json(brandWithFlavors);
      } catch (insertError: any) {
        if (insertError?.code === '23505') {
          const fallback = await db.query.userBaitBrands.findFirst({
            where: and(eq(userBaitBrands.userId, userId), sql`lower(${userBaitBrands.name}) = lower(${normalizedName})`),
            with: { flavors: true },
          });
          return res.json(fallback);
        }
        throw insertError;
      }
    } catch (error) {
      console.error("[BAITS-MVP] Error creating brand:", error);
      res.status(500).json({ message: "Failed to create bait brand" });
    }
  });

  app.delete('/api/diary/baits/brands/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const brandId = parseInt(req.params.id);
      if (isNaN(brandId)) return res.status(400).json({ message: "Invalid brand ID" });
      const [deleted] = await db.delete(userBaitBrands)
        .where(and(eq(userBaitBrands.id, brandId), eq(userBaitBrands.userId, userId)))
        .returning();
      if (!deleted) return res.status(404).json({ message: "Brand not found" });
      res.json({ message: "Brand deleted" });
    } catch (error) {
      console.error("[BAITS-MVP] Error deleting brand:", error);
      res.status(500).json({ message: "Failed to delete brand" });
    }
  });

  app.post('/api/diary/baits/flavors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const brandId = parseInt(req.body.brandId);
      if (isNaN(brandId)) return res.status(400).json({ message: "Invalid brand ID" });
      const normalizedName = (req.body.name || "").trim().replace(/\s+/g, ' ');
      if (!normalizedName) return res.status(400).json({ message: "Názov príchute je povinný" });
      const brand = await db.query.userBaitBrands.findFirst({
        where: and(eq(userBaitBrands.id, brandId), eq(userBaitBrands.userId, userId)),
      });
      if (!brand) return res.status(404).json({ message: "Brand not found" });
      const existing = await db.query.userBaitFlavors.findFirst({
        where: and(
          eq(userBaitFlavors.brandId, brandId),
          sql`lower(${userBaitFlavors.name}) = lower(${normalizedName})`
        ),
      });
      if (existing) return res.json(existing);
      try {
        const [flavor] = await db.insert(userBaitFlavors).values({ brandId, name: normalizedName }).returning();
        res.status(201).json(flavor);
      } catch (insertError: any) {
        if (insertError?.code === '23505') {
          const fallback = await db.query.userBaitFlavors.findFirst({
            where: and(eq(userBaitFlavors.brandId, brandId), sql`lower(${userBaitFlavors.name}) = lower(${normalizedName})`),
          });
          return res.json(fallback);
        }
        throw insertError;
      }
    } catch (error) {
      console.error("[BAITS-MVP] Error creating flavor:", error);
      res.status(500).json({ message: "Failed to create bait flavor" });
    }
  });

  app.delete('/api/diary/baits/flavors/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const flavorId = parseInt(req.params.id);
      if (isNaN(flavorId)) return res.status(400).json({ message: "Invalid flavor ID" });
      const flavor = await db.query.userBaitFlavors.findFirst({
        where: eq(userBaitFlavors.id, flavorId),
        with: { brand: true },
      });
      if (!flavor || (flavor.brand as any)?.userId !== userId) {
        return res.status(404).json({ message: "Flavor not found" });
      }
      await db.delete(userBaitFlavors).where(eq(userBaitFlavors.id, flavorId));
      res.json({ message: "Flavor deleted" });
    } catch (error) {
      console.error("[BAITS-MVP] Error deleting flavor:", error);
      res.status(500).json({ message: "Failed to delete flavor" });
    }
  });

  // Recent baits - last unique baits used by user
  app.get('/api/diary/baits/recent', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const limit = Math.min(parseInt(req.query.limit as string) || 5, 10);
      const recentCatches = await db.select({
        bait: diaryCatches.bait,
        baitBrandSource: diaryCatches.baitBrandSource,
        baitBrandId: diaryCatches.baitBrandId,
        baitFlavorId: diaryCatches.baitFlavorId,
        baitDiameterMm: diaryCatches.baitDiameterMm,
        capturedAt: diaryCatches.capturedAt,
      })
        .from(diaryCatches)
        .where(and(
          sql`${diaryCatches.angler}->>'userId' = ${userId}`,
          isNotNull(diaryCatches.bait),
          sql`${diaryCatches.bait} != ''`
        ))
        .orderBy(desc(diaryCatches.capturedAt))
        .limit(50);

      const seen = new Set<string>();
      const items: Array<{
        source: string | null;
        brandId: number | null;
        flavorId: number | null;
        diameterMm: number | null;
        label: string;
      }> = [];

      for (const c of recentCatches) {
        if (items.length >= limit) break;
        const key = `${c.baitBrandSource || 'text'}_${c.baitBrandId || 0}_${c.baitFlavorId || 0}_${c.baitDiameterMm || 0}_${(c.bait || '').toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          source: c.baitBrandSource,
          brandId: c.baitBrandId,
          flavorId: c.baitFlavorId,
          diameterMm: c.baitDiameterMm,
          label: c.bait || '',
        });
      }

      res.json({ items });
    } catch (error) {
      console.error("[BAITS-MVP] Error fetching recent baits:", error);
      res.status(500).json({ message: "Failed to fetch recent baits" });
    }
  });

  // ==========================================
  // Equipment (Rybárske vybavenie) API endpoints
  // ==========================================

  // Get all equipment manufacturers
  app.get('/api/equipment/manufacturers', async (req, res) => {
    try {
      const manufacturers = await db
        .select()
        .from(equipmentManufacturers)
        .orderBy(equipmentManufacturers.name);
      res.json(manufacturers);
    } catch (error) {
      console.error("[EQUIPMENT] Error fetching manufacturers:", error);
      res.status(500).json({ message: "Failed to fetch manufacturers" });
    }
  });

  // Get all equipment categories
  app.get('/api/equipment/categories', async (req, res) => {
    try {
      const categories = await db
        .select()
        .from(equipmentCategories)
        .orderBy(equipmentCategories.name);
      res.json(categories);
    } catch (error) {
      console.error("[EQUIPMENT] Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Get equipment products with optional filters
  app.get('/api/equipment/products', async (req, res) => {
    try {
      const { manufacturerId, categoryId, search, limit = 50, offset = 0 } = req.query;

      let query = db
        .select({
          id: equipmentProducts.id,
          name: equipmentProducts.name,
          manufacturer: {
            id: equipmentManufacturers.id,
            name: equipmentManufacturers.name,
          },
          category: {
            id: equipmentCategories.id,
            name: equipmentCategories.name,
            slug: equipmentCategories.slug,
          },
        })
        .from(equipmentProducts)
        .leftJoin(equipmentManufacturers, eq(equipmentProducts.manufacturerId, equipmentManufacturers.id))
        .leftJoin(equipmentCategories, eq(equipmentProducts.categoryId, equipmentCategories.id))
        .orderBy(equipmentProducts.name)
        .limit(parseInt(limit as string))
        .offset(parseInt(offset as string));

      // Apply filters
      const conditions = [];
      if (manufacturerId) {
        conditions.push(eq(equipmentProducts.manufacturerId, parseInt(manufacturerId as string)));
      }
      if (categoryId) {
        conditions.push(eq(equipmentProducts.categoryId, parseInt(categoryId as string)));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const products = await query;
      res.json(products);
    } catch (error) {
      console.error("[EQUIPMENT] Error fetching products:", error);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Search equipment products
  app.get('/api/equipment/search', async (req, res) => {
    try {
      const { q, limit = 20 } = req.query;

      if (!q || (q as string).length < 2) {
        return res.json([]);
      }

      const searchTerm = `%${(q as string).toLowerCase()}%`;

      const products = await db
        .select({
          id: equipmentProducts.id,
          name: equipmentProducts.name,
          manufacturer: {
            id: equipmentManufacturers.id,
            name: equipmentManufacturers.name,
          },
          category: {
            id: equipmentCategories.id,
            name: equipmentCategories.name,
            slug: equipmentCategories.slug,
          },
        })
        .from(equipmentProducts)
        .leftJoin(equipmentManufacturers, eq(equipmentProducts.manufacturerId, equipmentManufacturers.id))
        .leftJoin(equipmentCategories, eq(equipmentProducts.categoryId, equipmentCategories.id))
        .where(
          or(
            sql`LOWER(${equipmentProducts.name}) LIKE ${searchTerm}`,
            sql`LOWER(${equipmentManufacturers.name}) LIKE ${searchTerm}`
          )
        )
        .orderBy(equipmentProducts.name)
        .limit(parseInt(limit as string));

      res.json(products);
    } catch (error) {
      console.error("[EQUIPMENT] Error searching products:", error);
      res.status(500).json({ message: "Failed to search products" });
    }
  });

  // User Arsenal Equipment endpoints
  app.get('/api/diary/arsenal/equipment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);

      const arsenalEquipment = await db
        .select({
          id: userArsenalEquipment.id,
          quantity: userArsenalEquipment.quantity,
          notes: userArsenalEquipment.notes,
          isFavorite: userArsenalEquipment.isFavorite,
          createdAt: userArsenalEquipment.createdAt,
          product: {
            id: equipmentProducts.id,
            name: equipmentProducts.name,
          },
          manufacturer: {
            id: equipmentManufacturers.id,
            name: equipmentManufacturers.name,
          },
          category: {
            id: equipmentCategories.id,
            name: equipmentCategories.name,
            slug: equipmentCategories.slug,
          },
        })
        .from(userArsenalEquipment)
        .leftJoin(equipmentProducts, eq(userArsenalEquipment.productId, equipmentProducts.id))
        .leftJoin(equipmentManufacturers, eq(equipmentProducts.manufacturerId, equipmentManufacturers.id))
        .leftJoin(equipmentCategories, eq(equipmentProducts.categoryId, equipmentCategories.id))
        .where(eq(userArsenalEquipment.userId, userId))
        .orderBy(desc(userArsenalEquipment.createdAt));

      res.json(arsenalEquipment);
    } catch (error) {
      console.error("[ARSENAL] Error fetching user arsenal equipment:", error);
      res.status(500).json({ message: "Failed to fetch arsenal equipment" });
    }
  });

  app.post('/api/diary/arsenal/equipment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const validatedData = insertUserArsenalEquipmentSchema.parse({
        ...req.body,
        userId,
      });

      const [newEquipment] = await db
        .insert(userArsenalEquipment)
        .values(validatedData as any)
        .returning();

      res.status(201).json(newEquipment);
    } catch (error) {
      console.error("[ARSENAL] Error adding equipment to arsenal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add equipment to arsenal" });
    }
  });

  app.patch('/api/diary/arsenal/equipment/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const equipmentId = parseInt(req.params.id);

      if (isNaN(equipmentId)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }

      const [item] = await db
        .select()
        .from(userArsenalEquipment)
        .where(
          and(
            eq(userArsenalEquipment.id, equipmentId),
            eq(userArsenalEquipment.userId, userId)
          )
        );

      if (!item) {
        return res.status(404).json({ message: "Equipment not found or does not belong to you" });
      }

      const [updated] = await db
        .update(userArsenalEquipment)
        .set({ isFavorite: !item.isFavorite })
        .where(eq(userArsenalEquipment.id, equipmentId))
        .returning();

      res.json(updated);
    } catch (error) {
      console.error("[ARSENAL] Error toggling favorite equipment:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  app.delete('/api/diary/arsenal/equipment/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = getUserId(req);
      const equipmentId = parseInt(req.params.id);

      if (isNaN(equipmentId)) {
        return res.status(400).json({ message: "Invalid equipment ID" });
      }

      const [deleted] = await db
        .delete(userArsenalEquipment)
        .where(and(
          eq(userArsenalEquipment.id, equipmentId),
          eq(userArsenalEquipment.userId, userId)
        ))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Equipment not found in arsenal" });
      }

      res.json({ message: "Equipment removed from arsenal" });
    } catch (error) {
      console.error("[ARSENAL] Error deleting equipment from arsenal:", error);
      res.status(500).json({ message: "Failed to delete equipment from arsenal" });
    }
  });

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
