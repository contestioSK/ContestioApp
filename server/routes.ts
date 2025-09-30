import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { randomUUID } from "crypto";
import { storage } from "./storage";
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
} from "@shared/schema";
import { z } from "zod";
import { canUseFeature } from "@shared/plan-capabilities";
import { NotificationService } from "./notification-service";
import { checkResultBlocking, checkPartialResultBlocking, checkPartialResultBlockingByTeam } from "./middleware/result-blocking";
import multer from "multer";
import path from "path";
import fs, { existsSync } from "fs";
import { promises as fsPromises } from "fs";
import { ImageService, type ProcessedImageResult } from "./image-service";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Povolené sú len obrázkové súbory (JPEG, PNG, GIF)"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Serve uploads directory with proper cache headers
  app.use('/uploads', (req, res, next) => {
    // Set cache headers for images
    res.set({
      'Cache-Control': 'public, max-age=31536000, immutable', // 1 year cache
      'Expires': new Date(Date.now() + 31536000000).toUTCString(), // 1 year from now
    });
    next();
  }, express.static('uploads'));

  // Auth middleware
  await setupAuth(app);
  
  // Load new auth system after setupAuth to override serialize/deserialize functions
  const passportModule = await import("./utils/passport");
  const passport = passportModule.default;

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections with user information
  interface ClientConnection {
    ws: WebSocket;
    userId?: string;
    sessionId?: string;
    connectedAt: Date;
  }
  
  const clients = new Map<WebSocket, ClientConnection>();
  
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
            connection.userId = userSession.id;
            connection.sessionId = sessionId;
            console.log(`[WS] User ${userSession.email} authenticated automatically on WebSocket`);
            
            // Send authentication success
            ws.send(JSON.stringify({
              type: 'auth_success',
              userId: userSession.id,
              email: userSession.email
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
  app.post('/api/auth/register', async (req, res) => {
    try {
      const { email, firstName, lastName, password } = req.body;

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
        return res.status(400).json({ 
          message: 'Registration failed. Please try again.' // Generic message to avoid enumeration
        });
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

  app.post('/api/auth/login', (req, res, next) => {
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
        userId = req.user.claims.sub;
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
        userId = req.user.claims.sub;
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
        userId = req.user.claims.sub;
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
        // Create user directory if it doesn't exist
        const userDir = path.join("uploads", "users", userId);
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }

        const outputBasePath = path.join(userDir, `profile-${Date.now()}`);
        
        // Process image with ImageService for optimization
        imageMetadata = await ImageService.processImage(
          req.file.path,
          outputBasePath,
          `profile-${Date.now()}`
        );
        
        // Use the best WebP variant for profile images, fall back to JPEG
        const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 320, 'webp') ||
                            ImageService.getBestVariantForWidth(imageMetadata.variants, 320, 'jpeg') ||
                            imageMetadata.variants[0];
        
        imageUrl = bestVariant?.url || `/uploads/${req.file.filename}`;
        
        // Update user profile with new image URL
        const updatedUser = await storage.updateUserProfile(userId, {
          profileImageUrl: imageUrl
        });
        
        // Clean up the original uploaded file
        await ImageService.cleanupTempFile(req.file.path);
        
        // Remove sensitive data
        const { password: _, verificationToken: __, verificationTokenExpires: ___, ...safeUser } = updatedUser;
        res.json(safeUser);
      } catch (error) {
        console.error("Error processing profile image:", error);
        // Clean up temp file on error
        if (req.file?.path) {
          await ImageService.cleanupTempFile(req.file.path);
        }
        // Fall back to original file if processing fails
        imageUrl = `/uploads/${req.file.filename}`;
        
        // Still try to update the user profile
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

  // User favorites endpoints
  app.get('/api/users/favorites/competitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavoriteCompetitions(userId);
      res.json(favorites);
    } catch (error) {
      console.error("[FAVORITES] Error fetching favorite competitions:", error);
      res.status(500).json({ message: "Chyba pri načítaní obľúbených súťaží" });
    }
  });

  app.post('/api/users/favorites/competitions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const favorites = await storage.getUserFavoriteTeams(userId);
      res.json(favorites);
    } catch (error) {
      console.error("[FAVORITES] Error fetching favorite teams:", error);
      res.status(500).json({ message: "Chyba pri načítaní obľúbených tímov" });
    }
  });

  app.post('/api/users/favorites/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const { teamId } = req.params;
      
      await storage.removeFavoriteTeam(userId, teamId);
      res.status(204).send();
    } catch (error) {
      console.error("[FAVORITES] Error removing favorite team:", error);
      res.status(500).json({ message: "Chyba pri odstraňovaní obľúbeného tímu" });
    }
  });

  // Notification preferences endpoints
  app.get('/api/users/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserNotificationPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("[NOTIFICATIONS] Error fetching notification preferences:", error);
      res.status(500).json({ message: "Chyba pri načítaní nastavení notifikácií" });
    }
  });

  app.put('/api/users/notification-preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      
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
          
          const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can create competitions" });
      }

      // Ensure sideCompetitions is properly typed
      const sideCompetitions: string[] = Array.isArray(req.body.sideCompetitions) 
        ? [...req.body.sideCompetitions] 
        : (req.body.sideCompetitions ? [req.body.sideCompetitions] : []);

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
      const userId = req.user.claims.sub;
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
      let imageMetadata: ProcessedImageResult | null = null;
      
      if (req.file) {
        try {
          // Process image with multiple sizes and formats
          const originalFilename = path.parse(req.file.originalname).name;
          const competitionDir = path.join('uploads', 'competitions', req.params.id);
          const outputBasePath = path.join(competitionDir, 'logo');
          
          // Create directory if it doesn't exist
          if (!fs.existsSync(competitionDir)) {
            fs.mkdirSync(competitionDir, { recursive: true });
          }
          
          imageMetadata = await ImageService.processImage(
            req.file.path,
            outputBasePath,
            `logo-${Date.now()}`
          );
          
          // Use the best WebP variant for the database URL, fall back to JPEG
          const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'webp') ||
                              ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'jpeg') ||
                              imageMetadata.variants[0];
          
          imageUrl = bestVariant?.url || `/uploads/${req.file.filename}`;
          
          // Clean up the original uploaded file
          await ImageService.cleanupTempFile(req.file.path);
        } catch (error) {
          console.error("Error processing competition image:", error);
          // Fall back to original file if processing fails
          imageUrl = `/uploads/${req.file.filename}`;
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
      
      const updatedCompetition = await storage.updateCompetition(req.params.id, updateData);
      
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
      const userId = req.user.claims.sub;
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

  // PATCH competition status endpoint
  app.patch('/api/competitions/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
        status: z.enum(['registration', 'live', 'finished'])
      });
      
      const validationResult = statusSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid status. Must be: registration, live, or finished",
          errors: validationResult.error.errors 
        });
      }

      const { status } = validationResult.data;

      // Validate status transition logic
      const validTransitions: Record<string, string[]> = {
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
      const userId = req.user.claims.sub;
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
      // Handle team photo upload
      let teamPhotoUrl = null;
      if (req.files && req.files.teamPhoto && req.files.teamPhoto[0]) {
        teamPhotoUrl = `/uploads/${req.files.teamPhoto[0].filename}`;
      }

      const teamData = insertTeamSchema.parse({
        ...req.body,
        competitionId: req.params.id,
        photoUrl: teamPhotoUrl,
      });
      
      const team = await storage.createTeam(teamData);
      
      // Add team members
      if (req.body.members && Array.isArray(req.body.members)) {
        for (let index = 0; index < req.body.members.length; index++) {
          const memberData = req.body.members[index];
          
          // Handle member photo upload
          let memberPhotoUrl = null;
          if (req.files && req.files[`memberPhoto_${index}`] && req.files[`memberPhoto_${index}`][0]) {
            memberPhotoUrl = `/uploads/${req.files[`memberPhoto_${index}`][0].filename}`;
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
      const userId = req.user.claims.sub;
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

  // Update team details
  app.patch('/api/teams/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can create referees" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only create referees for your own competitions" });
        }
      }

      const refereeData = insertRefereeSchema.parse({
        ...req.body,
        competitionId: req.params.id,
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
  app.get('/api/competitions/:id/catches', checkResultBlocking, async (req, res) => {
    try {
      const catches = await storage.getCatchesByCompetition(req.params.id);
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

      // DEMO MODE - Skip authentication for demo
      // const userId = req.user.claims.sub;
      // const user = await storage.getUser(userId);
      
      // if (user?.role !== 'referee') {
      //   return res.status(403).json({ message: "Only referees can submit catches" });
      // }

      // DEMO MODE - Skip referee assignment check
      // Get referee assignment
      // const referee = await storage.getRefereeByUserAndCompetition(userId, req.body.competitionId);
      // if (!referee) {
      //   return res.status(403).json({ message: "Referee not assigned to this competition" });
      // }

      // DEMO MODE - Mock referee with real UUID from database
      const referee = { id: '10a24904-20a0-4dea-b964-8b91e306ebb3', assignedSector: 'A' };

      let photoUrl = null;
      if (req.file) {
        // In production, you'd upload to S3 or similar
        photoUrl = `/uploads/${req.file.filename}`;
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

  // Leaderboard routes
  app.get('/api/competitions/:id/leaderboard', checkResultBlocking, async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard(req.params.id);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Sector statistics route
  app.get('/api/competitions/:id/sectors/:sector/statistics', checkResultBlocking, async (req, res) => {
    try {
      const { id: competitionId, sector } = req.params;
      const statistics = await storage.getSectorStatistics(competitionId, sector);
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching sector statistics:", error);
      res.status(500).json({ message: "Failed to fetch sector statistics" });
    }
  });

  // Sector leaderboards route
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
      const leaderboards = await storage.getSectorLeaderboards(competitionId, limit);
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can upload sponsor logos" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Žiaden súbor nebol nahratý" });
      }

      const logoUrl = `/uploads/${req.file.filename}`;
      res.json({ logoUrl });
    } catch (error) {
      console.error("Error uploading sponsor logo:", error);
      res.status(500).json({ message: "Chyba pri nahrávaní loga" });
    }
  });

  app.post('/api/competitions/:id/sponsors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Update referee status
  app.patch('/api/competitions/:id/referees/:refereeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update referees" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only update referees for your own competitions" });
        }
      }

      // Validate request body
      const updateSchema = z.object({
        isActive: z.boolean().optional(),
        assignedSector: z.string().optional()
      });
      
      const validation = updateSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ message: "Invalid request data", errors: validation.error.errors });
      }

      // Verify the referee belongs to this competition (prevent IDOR)
      const referees = await storage.getRefereesByCompetition(req.params.id);
      const targetReferee = referees.find(r => r.id === req.params.refereeId);
      if (!targetReferee) {
        return res.status(404).json({ message: "Referee not found in this competition" });
      }

      const { isActive, assignedSector } = validation.data;
      const referee = await storage.updateReferee(req.params.refereeId, { 
        isActive,
        assignedSector
      });
      
      res.json(referee);
    } catch (error) {
      console.error("Error updating referee:", error);
      res.status(500).json({ message: "Failed to update referee" });
    }
  });

  // Delete referee
  app.delete('/api/competitions/:id/referees/:refereeId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can delete referees" });
      }

      // Verify competition ownership for non-admin users
      if (user?.role === 'organizer') {
        const competition = await storage.getCompetition(req.params.id);
        if (!competition || competition.organizerId !== userId) {
          return res.status(403).json({ message: "You can only delete referees from your own competitions" });
        }
      }

      // Verify the referee belongs to this competition (prevent IDOR)
      const referees = await storage.getRefereesByCompetition(req.params.id);
      const targetReferee = referees.find(r => r.id === req.params.refereeId);
      if (!targetReferee) {
        return res.status(404).json({ message: "Referee not found in this competition" });
      }

      await storage.deleteReferee(req.params.refereeId);
      res.json({ message: "Referee deleted successfully" });
    } catch (error) {
      console.error("Error deleting referee:", error);
      res.status(500).json({ message: "Failed to delete referee" });
    }
  });

  // Update sponsor
  app.put('/api/competitions/:id/sponsors/:sponsorId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Delete competition
  app.delete('/api/competitions/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can delete competitions" });
      }

      // Verify competition ownership for non-admin users
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      if (user?.role === 'organizer' && competition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only delete your own competitions" });
      }

      await storage.deleteCompetition(req.params.id);
      res.json({ message: "Competition deleted successfully" });
    } catch (error) {
      console.error("Error deleting competition:", error);
      res.status(500).json({ message: "Failed to delete competition" });
    }
  });

  // Reset competition catches
  app.delete('/api/competitions/:id/catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can reset catches" });
      }

      // Verify competition ownership for non-admin users
      const competition = await storage.getCompetition(req.params.id);
      if (!competition) {
        return res.status(404).json({ message: "Competition not found" });
      }
      
      if (user?.role === 'organizer' && competition.organizerId !== userId) {
        return res.status(403).json({ message: "You can only reset catches for your own competitions" });
      }

      await storage.resetCompetitionCatches(req.params.id);
      res.json({ message: "Competition catches reset successfully" });
    } catch (error) {
      console.error("Error resetting catches:", error);
      res.status(500).json({ message: "Failed to reset catches" });
    }
  });

  // Update competition status
  app.patch('/api/competitions/:id/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer' && user?.role !== 'admin') {
        return res.status(403).json({ message: "Only organizers and admins can update competition status" });
      }

      const { status } = req.body;
      if (!['registration', 'live', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const competition = await storage.updateCompetitionStatus(req.params.id, status);
      res.json(competition);
    } catch (error) {
      console.error("Error updating competition status:", error);
      res.status(500).json({ message: "Failed to update competition status" });
    }
  });

  // Export teams
  app.get('/api/competitions/:id/export/teams', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Helper function for admin role check
  function isAdmin(user: any): boolean {
    return user && user.role === 'admin';
  }

  // Admin dashboard endpoint
  app.get('/api/admin/dashboard', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Admin registrations management endpoints
  app.get('/api/admin/registrations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can approve registrations" });
      }

      const result = await storage.approveCompetitionRegistration(req.params.id, userId);
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Competition registration routes
  app.post('/api/competition-registrations', upload.single('competitionLogo'), async (req: any, res) => {
    try {
      // Handle competition logo upload
      let imageUrl = null;
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
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
      res.status(201).json(registration);
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can view competition registrations" });
      }

      const registration = await storage.getCompetitionRegistration(req.params.id);
      if (!registration) {
        return res.status(404).json({ message: "Competition registration not found" });
      }
      
      res.json(registration);
    } catch (error) {
      console.error("Error fetching competition registration:", error);
      res.status(500).json({ message: "Failed to fetch competition registration" });
    }
  });

  app.patch('/api/competition-registrations/:id/approve', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!isAdmin(user)) {
        return res.status(403).json({ message: "Only admins can approve competition registrations" });
      }

      const result = await storage.approveCompetitionRegistration(req.params.id, userId);
      
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

  app.patch('/api/competition-registrations/:id/decline', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
        const userId = req.user.claims.sub;
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
        const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const battles = await storage.getAllUserBattles(userId);
      res.json(battles);
    } catch (error) {
      console.error("Error fetching user battles:", error);
      res.status(500).json({ message: "Failed to fetch battles" });
    }
  });

  // Get single battle by ID
  app.get('/api/diary/battles/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      const battle = await storage.getDiaryBattle(id, userId);
      
      if (!battle) {
        return res.status(404).json({ message: "Battle sa nenašiel" });
      }
      
      res.json(battle);
    } catch (error) {
      console.error("Error fetching battle:", error);
      res.status(500).json({ message: "Failed to fetch battle" });
    }
  });
  
  // Create battle with auto-created trip (recommended flow)
  app.post('/api/diary/battles-with-trip', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
        rules: z.object({
          mode: z.enum(["most_fish", "total_weight", "biggest_fish", "best_3_fish", "best_5_fish"]),
          minWeightKg: z.number().optional(),
          includeOnlyVerified: z.boolean().optional()
        }),
        participants: z.array(z.object({
          name: z.string().min(1)
        })),
        startAt: z.string().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val)),
        endAt: z.string().or(z.date()).transform((val) => val instanceof Date ? val : new Date(val))
      });

      const battleData = battleSchema.parse(req.body);
      
      // Create trip automatically with same name and dates as battle
      const tripData = {
        name: battleData.name,
        location: "", // Optional - could be added to battle form later
        startDate: battleData.startAt,
        endDate: battleData.endAt,
        ownerUserId: userId,
        visibility: "private" as const,
        notes: `Automaticky vytvorené pre battle: ${battleData.name}`,
        participants: battleData.participants.map(p => ({ name: p.name }))
      };
      
      const trip = await storage.createDiaryTrip(tripData, userId);
      
      // Now create battle with reference to the new trip
      const battleDataWithTrip = {
        status: "active" as const,
        name: battleData.name,
        rules: battleData.rules,
        participants: battleData.participants,
        tripId: trip.id,
        startAt: battleData.startAt,
        endAt: battleData.endAt
      };
      
      const battle = await storage.createDiaryBattle(battleDataWithTrip, userId);
      
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
  app.post('/api/diary/battles', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
      
      // Ensure dates are Date objects (double-check Zod transformation)
      const processedBattleData = {
        ...battleData,
        startAt: battleData.startAt instanceof Date ? battleData.startAt : new Date(battleData.startAt),
        endAt: battleData.endAt instanceof Date ? battleData.endAt : new Date(battleData.endAt),
      };
      
      // Create battle in database
      const battle = await storage.createDiaryBattle(processedBattleData, userId);
      
      // Broadcast battle creation only to the owner for real-time updates
      // TODO: Later extend to include invited participants when that feature is added
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

  // Diary Photo Upload endpoint
  app.post('/api/diary/photos/upload', isAuthenticated, (req: any, res, next) => {
    // Handle multiple file upload (max 5 photos)
    upload.array('photos', 5)(req, res, (err: any) => {
      if (err) {
        console.error("Multer error:", err);
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
      const userId = req.user.claims.sub;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ message: "Žiadne súbory neboli nahrané" });
      }

      const processedPhotos = [];
      
      // Create diary photos directory
      const diaryPhotosDir = path.join('attached_assets', 'diary_photos', userId);
      if (!existsSync(diaryPhotosDir)) {
        await fsPromises.mkdir(diaryPhotosDir, { recursive: true });
      }

      // Process each uploaded photo
      for (const file of req.files) {
        try {
          const fileExtension = path.extname(file.originalname).toLowerCase();
          const baseFilename = `${randomUUID()}`;
          const outputBasePath = path.join(diaryPhotosDir, baseFilename);
          
          // Process image with ImageService for optimization
          const imageMetadata = await ImageService.processImage(
            file.path,
            outputBasePath,
            baseFilename
          );
          
          // Get best variant for display (prefer WebP 640w for diary)
          const bestVariant = ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'webp') ||
                              ImageService.getBestVariantForWidth(imageMetadata.variants, 640, 'jpeg') ||
                              imageMetadata.variants[0];
          
          // Clean up the temporary uploaded file
          await ImageService.cleanupTempFile(file.path);
          
          processedPhotos.push({
            id: randomUUID(),
            originalName: file.originalname,
            url: bestVariant?.url || `/uploads/${file.filename}`,
            variants: imageMetadata.variants,
            placeholder: imageMetadata.placeholder,
            width: imageMetadata.originalWidth,
            height: imageMetadata.originalHeight
          });
          
        } catch (error) {
          console.error(`Error processing photo ${file.originalname}:`, error);
          // Clean up temp file on error
          await ImageService.cleanupTempFile(file.path);
          
          // Skip this file if processing failed
          console.error(`Skipping file ${file.originalname} due to processing error`);
        }
      }
      
      res.json({ 
        photos: processedPhotos,
        message: `Úspešne nahrané ${processedPhotos.length} fotografií` 
      });
      
    } catch (error) {
      console.error("Error uploading diary photos:", error);
      res.status(500).json({ message: "Chyba pri nahrávaní fotografií" });
    }
  });

  // Diary Trips endpoints
  app.get('/api/diary/trips', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const trips = await storage.getDiaryTrips(userId);
      res.json(trips);
    } catch (error) {
      console.error("Error fetching diary trips:", error);
      res.status(500).json({ message: "Failed to fetch trips" });
    }
  });

  app.post('/api/diary/trips', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Diary Catches endpoints  
  app.get('/api/diary/catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  app.get('/api/diary/catches/all', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const catches = await storage.getAllUserCatches(userId);
      res.json(catches);
    } catch (error) {
      console.error("Error fetching all diary catches:", error);
      res.status(500).json({ message: "Failed to fetch catches" });
    }
  });

  app.post('/api/diary/catches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check freemium limits
      const catchLimit = await storage.checkDiaryCatchLimit(userId);
      if (!catchLimit.canCreate) {
        return res.status(403).json({ 
          message: "Dosiahli ste limit úlovkov. Prejdite na PREMIUM pre neobmedzené úlovky.",
          code: "LIMIT_REACHED"
        });
      }
      
      // Verify trip belongs to user (only if tripId is provided)
      let trip = null;
      if (req.body.tripId) {
        trip = await storage.getDiaryTrip(req.body.tripId, userId);
        if (!trip) {
          return res.status(403).json({ message: "Invalid trip" });
        }
      }
      
      // Server controls angler.userId and verified status
      const catchData = {
        ...req.body,
        angler: {
          ...req.body.angler,
          userId: userId
        },
        verified: false, // Only server can set verified status
        photos: req.body.photos || [], // Photos will be uploaded separately
        capturedAt: new Date(req.body.capturedAt) // Convert string date to Date object
      };
      
      const newCatch = await storage.createDiaryCatch(catchData, userId);
      
      // Update seasonal goals progress after catch creation
      await storage.updateAllUserGoalsProgress(userId);
      
      res.status(201).json(newCatch);
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

  app.put('/api/diary/catches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const catchId = req.params.id;
      
      // Check if user owns this catch through trip ownership
      const catch_ = await storage.getDiaryCatch(catchId, userId);
      if (!catch_) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      const updatedCatch = await storage.updateDiaryCatch(catchId, req.body, userId);
      
      // Update seasonal goals progress after catch update
      await storage.updateAllUserGoalsProgress(userId);
      
      res.json(updatedCatch);
    } catch (error) {
      console.error("Error updating diary catch:", error);
      res.status(500).json({ message: "Failed to update catch" });
    }
  });

  app.delete('/api/diary/catches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const catchId = req.params.id;
      
      // Check if user owns this catch through trip ownership
      const catch_ = await storage.getDiaryCatch(catchId, userId);
      if (!catch_) {
        return res.status(404).json({ message: "Catch not found" });
      }
      
      await storage.deleteDiaryCatch(catchId, userId);
      
      // Update seasonal goals progress after catch deletion
      await storage.updateAllUserGoalsProgress(userId);
      
      res.json({ message: "Catch deleted successfully" });
    } catch (error) {
      console.error("Error deleting diary catch:", error);
      res.status(500).json({ message: "Failed to delete catch" });
    }
  });

  // Diary Limits endpoints
  app.get('/api/diary/trip-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limits = await storage.checkDiaryTripLimit(userId);
      res.json(limits);
    } catch (error) {
      console.error("Error fetching diary trip limits:", error);
      res.status(500).json({ message: "Failed to fetch trip limits" });
    }
  });

  app.get('/api/diary/catch-limits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limits = await storage.checkDiaryCatchLimit(userId);
      res.json(limits);
    } catch (error) {
      console.error("Error fetching diary catch limits:", error);
      res.status(500).json({ message: "Failed to fetch catch limits" });
    }
  });

  // Premium status endpoint
  app.get('/api/auth/premium-status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const subscription = await storage.getUserSubscription(userId, "diary_premium");
      const isPremium = !!subscription && subscription.status === 'active';
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

  // Seasonal Goals API endpoints
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
      const userId = req.user.claims.sub;
      const goals = await storage.getUserSeasonGoals(userId);
      res.json(goals);
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error fetching user goals:", error);
      res.status(500).json({ message: "Failed to fetch seasonal goals" });
    }
  });

  // Create new seasonal goal
  app.post('/api/seasonal-goals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Check if user can create goal (freemium limits)
      const currentSeason = await storage.getCurrentSeason();
      if (!currentSeason) {
        return res.status(400).json({ message: "No active season found" });
      }
      
      const limitCheck = await storage.checkSeasonGoalLimit(userId, currentSeason.id);
      if (!limitCheck.canCreate) {
        return res.status(403).json({ 
          message: "You have reached the goal limit for your plan. Upgrade to Premium for unlimited goals." 
        });
      }

      const validatedData = insertSeasonGoalSchema.parse({ 
        ...req.body, 
        userId 
      });
      
      const goal = await storage.createSeasonGoal(validatedData, userId);
      
      // Initialize progress tracking
      await storage.updateGoalProgress(goal.id, 'initialization', 0);
      
      res.status(201).json(goal);
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
      const userId = req.user.claims.sub;
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
      
      res.json(updatedGoal);
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      // Get user goals and their progress
      const goals = await storage.getUserSeasonGoals(userId);
      const progress = await Promise.all(
        goals.map(async (goal) => {
          const goalProgress = await storage.getGoalProgress(goal.id, userId);
          return { goal, progress: goalProgress };
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
      const userId = req.user.claims.sub;
      await storage.updateAllUserGoalsProgress(userId);
      res.json({ message: "Progress updated successfully" });
    } catch (error) {
      console.error("[SEASONAL_GOALS] Error updating progress:", error);
      res.status(500).json({ message: "Failed to update progress" });
    }
  });

  return httpServer;
}
