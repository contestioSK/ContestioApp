import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { NotificationService } from "./notification-service";
import { emailService } from "./utils/email";
import { FEATURES } from "./features";
import helmet from "helmet";
import cors from "cors";
import { authenticatedApiLimiter } from "./middleware/rate-limiting";
import fs from "fs";
import path from "path";
import { seedFishingAreas } from "../db/seed-fishing-areas";
import { seedAdminUsers } from "../db/seed-admin-users";

const app = express();

// Security: Helmet middleware for security headers
const isDevelopment = process.env.NODE_ENV === 'development';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      // In development: allow inline scripts/eval for Vite HMR
      // In production: strict policy (no inline/eval)
      scriptSrc: isDevelopment 
        ? ["'self'", "'unsafe-inline'", "'unsafe-eval'"]
        : ["'self'"],
      styleSrc: isDevelopment
        ? ["'self'", "'unsafe-inline'"]
        : ["'self'", "'unsafe-inline'"], // Keep unsafe-inline for Tailwind runtime styles
      imgSrc: ["'self'", "data:", "blob:", "https:"],
      // Allow connections to self, WebSockets, and third-party APIs
      connectSrc: [
        "'self'", 
        "wss:", 
        "ws:",
        "https://api.openweathermap.org", // Weather API
        "https://*.privode.eu", // Own domains
        "https://*.replit.app", // Replit production domains
        "https://*.replit.dev", // Replit dev domains
      ],
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for development compatibility
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true,
  },
}));

// Security: CORS configuration
const allowedOrigins = [
  'https://privode.eu', 
  'https://www.privode.eu',
  'https://privode.replit.app',
  'http://localhost:5000', 
  'http://127.0.0.1:5000'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Allow Replit domains (both dev and production)
    if (origin.includes('.replit.dev') || origin.includes('.replit.app')) {
      return callback(null, true);
    }
    
    if (allowedOrigins.some(allowed => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// T002: Hard fail if SESSION_SECRET is missing in production
if (process.env.NODE_ENV === 'production' && !process.env.SESSION_SECRET) {
  console.error('[SECURITY] SESSION_SECRET is not set in production. Refusing to start.');
  process.exit(1);
}

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// T004: Soft global rate limiter for all authenticated API traffic (2000 req/15min per userId)
// Endpoint-specific harder limits are applied in routes.ts for write operations
app.use('/api', authenticatedApiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Background scheduler for announcement notifications
async function startAnnouncementScheduler() {
  const SCHEDULE_INTERVAL = 60000; // 60 seconds
  
  // Create NotificationService instance (scheduler doesn't need WebSocket broadcasting)
  const notificationService = new NotificationService();
  
  async function checkForUnnotifiedAnnouncements() {
    try {
      const unnotifiedAnnouncements = await storage.getUnnotifiedLiveAnnouncements();
      
      if (unnotifiedAnnouncements.length > 0) {
        log(`[SCHEDULER] Found ${unnotifiedAnnouncements.length} unnotified live announcements`);
        
        for (const announcement of unnotifiedAnnouncements) {
          // Skip competition-linked announcements when competitions are disabled
          if (!FEATURES.competitions && announcement.competitionId) {
            await storage.markAnnouncementNotified(announcement.id);
            log(`[SCHEDULER] Skipped competition announcement (competitions disabled): ${announcement.title}`);
            continue;
          }

          try {
            await notificationService.notifyOfficialAnnouncement(
              announcement.title,
              announcement.content,
              announcement.competitionId || undefined
            );
            
            // Mark as notified after successful notification
            await storage.markAnnouncementNotified(announcement.id);
            log(`[SCHEDULER] Notified announcement: ${announcement.title}`);
            
          } catch (notificationError) {
            console.error(`[SCHEDULER] Error sending notification for announcement ${announcement.id}:`, notificationError);
          }
        }
      }
    } catch (schedulerError) {
      console.error('[SCHEDULER] Error in announcement scheduler:', schedulerError);
    }
  }
  
  // Run immediately on startup
  await checkForUnnotifiedAnnouncements();
  
  // Then run every 60 seconds
  setInterval(checkForUnnotifiedAnnouncements, SCHEDULE_INTERVAL);
  log('[SCHEDULER] Announcement notification scheduler started (60s intervals)');
}

// Background scheduler for auto-finishing expired battles
async function startBattleScheduler(broadcastToUsers: (userIds: string[], data: any) => void) {
  const SCHEDULE_INTERVAL = 60000; // 60 seconds
  
  // Create NotificationService instance
  const notificationService = new NotificationService();
  
  async function checkAndFinishExpiredBattles() {
    try {
      const expiredBattles = await storage.getExpiredActiveBattles();
      
      if (expiredBattles.length > 0) {
        log(`[SCHEDULER] Found ${expiredBattles.length} expired battles to finish`);
        
        for (const battle of expiredBattles) {
          try {
            // Get trip owner to use as userId for permission check
            const trip = await storage.getDiaryTripById(battle.tripId);
            if (!trip) {
              console.error(`[SCHEDULER] Trip not found for battle ${battle.id}`);
              continue;
            }
            
            // Calculate final results (skip premium check for automated finish)
            const finishedBattle = await storage.calculateBattleResults(battle.id, trip.ownerUserId, true);
            
            log(`[SCHEDULER] Auto-finished battle: ${battle.name} (${battle.id})`);
            
            // Notify all participants via WebSocket
            const participantUserIds = battle.participants
              .map(p => p.userId)
              .filter((id): id is string => !!id);
            
            if (participantUserIds.length > 0) {
              broadcastToUsers(participantUserIds, {
                type: 'battle_finished',
                battleId: battle.id,
                payload: finishedBattle
              });
              
              // Send push notifications with results
              const winnerName = finishedBattle.results && finishedBattle.results.length > 0
                ? finishedBattle.results[0].participant.name
                : 'Nikto';
              const winnerScore = finishedBattle.results && finishedBattle.results.length > 0
                ? finishedBattle.results[0].score
                : 0;
              
              await notificationService.notifyBattleFinished(
                finishedBattle.id,
                finishedBattle.name,
                participantUserIds,
                winnerName,
                winnerScore,
                finishedBattle.results?.map(r => ({
                  userId: r.participant.userId,
                  name: r.participant.name,
                  score: r.score,
                  position: r.position
                }))
              );
            }
            
          } catch (error) {
            console.error(`[SCHEDULER] Error finishing battle ${battle.id}:`, error);
          }
        }
      }
    } catch (schedulerError) {
      console.error('[SCHEDULER] Error in battle scheduler:', schedulerError);
    }
  }
  
  // Run immediately on startup
  await checkAndFinishExpiredBattles();
  
  // Then run every 60 seconds
  setInterval(checkAndFinishExpiredBattles, SCHEDULE_INTERVAL);
  log('[SCHEDULER] Battle auto-finish scheduler started (60s intervals)');
}

// Background scheduler for referee status cleanup
async function startRefereeCleanupScheduler() {
  const SCHEDULE_INTERVAL = 3600000; // 60 minutes (1 hour)
  
  async function cleanupExpiredReferees() {
    try {
      const expiredReferees = await storage.getRefereesWithExpiredCompetitions();
      
      if (expiredReferees.length > 0) {
        log(`[SCHEDULER] Found ${expiredReferees.length} referee(s) with ALL competitions expired (>24h finished)`);
        
        // Group by user to process once per user
        const userIds = Array.from(new Set(expiredReferees.map(r => r.userId)));
        
        for (const userId of userIds) {
          const userReferees = expiredReferees.filter(r => r.userId === userId);
          const userEmail = userReferees[0].user.email;
          
          try {
            // Change user role from 'referee' to 'public'
            await storage.updateUserRole(userId, 'public');
            
            // Deactivate all expired referee assignments for this user
            for (const referee of userReferees) {
              await storage.updateReferee(referee.id, { isActive: false });
            }
            
            log(`[SCHEDULER] Changed referee ${userEmail} to public role (${userReferees.length} assignment(s) deactivated)`);
          } catch (error) {
            console.error(`[SCHEDULER] Error updating referee ${userId}:`, error);
          }
        }
      }
    } catch (schedulerError) {
      console.error('[SCHEDULER] Error in referee cleanup scheduler:', schedulerError);
    }
  }
  
  // Run immediately on startup
  await cleanupExpiredReferees();
  
  // Then run every hour
  setInterval(cleanupExpiredReferees, SCHEDULE_INTERVAL);
  log('[SCHEDULER] Referee status cleanup scheduler started (60min intervals)');
}

// Background scheduler for battle notifications (starting/ending)
async function startBattleNotificationScheduler() {
  const SCHEDULE_INTERVAL = 60000; // 60 seconds
  
  // Create NotificationService instance (scheduler doesn't need WebSocket broadcasting)
  const notificationService = new NotificationService();
  
  async function checkBattleNotifications() {
    try {
      // Check for battles starting soon (15 minutes before)
      const battlesStarting = await storage.getBattlesStartingSoon();
      
      if (battlesStarting.length > 0) {
        log(`[SCHEDULER] Found ${battlesStarting.length} battles starting soon`);
        
        for (const battle of battlesStarting) {
          try {
            const participantUserIds = battle.participants
              .map(p => p.userId)
              .filter((id): id is string => !!id);
            
            if (participantUserIds.length > 0) {
              await notificationService.notifyBattleStarting(
                battle.id,
                battle.name,
                participantUserIds
              );
              log(`[SCHEDULER] Sent starting notification for battle: ${battle.name}`);
            }
          } catch (error) {
            console.error(`[SCHEDULER] Error sending battle starting notification for ${battle.id}:`, error);
          }
        }
      }
      
      // Check for battles ending soon (30 minutes before)
      const battlesEnding = await storage.getBattlesEndingSoon();
      
      if (battlesEnding.length > 0) {
        log(`[SCHEDULER] Found ${battlesEnding.length} battles ending soon`);
        
        for (const battle of battlesEnding) {
          try {
            const participantUserIds = battle.participants
              .map(p => p.userId)
              .filter((id): id is string => !!id);
            
            if (participantUserIds.length > 0) {
              // Get current leader from results
              const currentLeader = battle.results && battle.results.length > 0
                ? {
                    name: battle.results[0].participant.name,
                    score: battle.results[0].score
                  }
                : undefined;
              
              await notificationService.notifyBattleEnding(
                battle.id,
                battle.name,
                participantUserIds,
                currentLeader
              );
              log(`[SCHEDULER] Sent ending notification for battle: ${battle.name}`);
            }
          } catch (error) {
            console.error(`[SCHEDULER] Error sending battle ending notification for ${battle.id}:`, error);
          }
        }
      }
    } catch (schedulerError) {
      console.error('[SCHEDULER] Error in battle notification scheduler:', schedulerError);
    }
  }
  
  // Run immediately on startup
  await checkBattleNotifications();
  
  // Then run every 60 seconds
  setInterval(checkBattleNotifications, SCHEDULE_INTERVAL);
  log('[SCHEDULER] Battle notification scheduler started (60s intervals)');
}

// Competition reminder scheduler - sends 24h reminder emails to organizers
async function startCompetitionReminderScheduler() {
  const REMINDER_INTERVAL = 60 * 60 * 1000; // Check every hour
  const REMINDER_DELAY_MS = 24 * 60 * 60 * 1000; // 24 hours after approval
  
  async function checkCompetitionReminders() {
    try {
      const competitions = await storage.getCompetitions();
      const now = new Date();
      
      for (const competition of competitions) {
        // Skip if no approvedAt, already sent reminder, or competition is finished
        if (!competition.approvedAt || competition.reminderSentAt || competition.status === 'finished') {
          continue;
        }
        
        const approvedTime = new Date(competition.approvedAt).getTime();
        const timeSinceApproval = now.getTime() - approvedTime;
        
        // Send reminder if 24+ hours have passed since approval
        if (timeSinceApproval >= REMINDER_DELAY_MS) {
          try {
            const appOrigin = process.env.APP_ORIGIN || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
            const dashboardUrl = `${appOrigin}/organizer/competition/${competition.id}`;
            
            // Get organizer email
            const organizerEmail = competition.organizerEmail;
            if (!organizerEmail) {
              console.log(`[SCHEDULER] No organizer email for competition ${competition.id}, skipping reminder`);
              continue;
            }
            
            // Send reminder email
            await emailService.sendCompetitionReminderEmail(
              organizerEmail,
              competition.name,
              dashboardUrl
            );
            
            // Mark reminder as sent
            await storage.updateCompetition(competition.id, { reminderSentAt: new Date() });
            
            log(`[SCHEDULER] Sent 24h reminder for competition: ${competition.name} to ${organizerEmail}`);
          } catch (error) {
            console.error(`[SCHEDULER] Error sending reminder for competition ${competition.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[SCHEDULER] Error in competition reminder scheduler:', error);
    }
  }
  
  // Run immediately on startup
  await checkCompetitionReminders();
  
  // Then run every hour
  setInterval(checkCompetitionReminders, REMINDER_INTERVAL);
  log('[SCHEDULER] Competition reminder scheduler started (60min intervals)');
}

// Day-before competition email scheduler - sends reminder email day before competition starts
async function startDayBeforeCompetitionScheduler() {
  const SCHEDULER_INTERVAL = 60 * 60 * 1000; // Check every hour
  
  async function checkDayBeforeEmails() {
    try {
      const competitions = await storage.getCompetitions();
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      for (const competition of competitions) {
        // Skip if already sent day-before reminder, or competition is finished/live
        if (competition.dayBeforeReminderSentAt || competition.status === 'finished' || competition.status === 'live') {
          continue;
        }
        
        // Check if competition starts tomorrow
        const startDate = new Date(competition.startDate);
        const isStartingTomorrow = 
          startDate.getFullYear() === tomorrow.getFullYear() &&
          startDate.getMonth() === tomorrow.getMonth() &&
          startDate.getDate() === tomorrow.getDate();
        
        if (isStartingTomorrow) {
          try {
            const appOrigin = process.env.APP_ORIGIN || `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`;
            const dashboardUrl = `${appOrigin}/organizer/competition/${competition.id}`;
            
            const organizerEmail = competition.organizerEmail;
            if (!organizerEmail) {
              console.log(`[SCHEDULER] No organizer email for competition ${competition.id}, skipping day-before reminder`);
              continue;
            }
            
            // Send day-before email
            await emailService.sendDayBeforeCompetitionEmail(
              organizerEmail,
              competition.name,
              dashboardUrl
            );
            
            // Mark as sent
            await storage.updateCompetition(competition.id, { dayBeforeReminderSentAt: new Date() });
            
            log(`[SCHEDULER] Sent day-before email for competition: ${competition.name} to ${organizerEmail}`);
          } catch (error) {
            console.error(`[SCHEDULER] Error sending day-before email for competition ${competition.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[SCHEDULER] Error in day-before competition scheduler:', error);
    }
  }
  
  // Run immediately on startup
  await checkDayBeforeEmails();
  
  // Then run every hour
  setInterval(checkDayBeforeEmails, SCHEDULER_INTERVAL);
  log('[SCHEDULER] Day-before competition scheduler started (60min intervals)');
}

// Competition auto-finish scheduler - automatically ends competitions when end_date passes
async function startCompetitionAutoFinishScheduler() {
  const SCHEDULER_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  
  async function checkAndFinishExpiredCompetitions() {
    try {
      const expiredCompetitions = await storage.getExpiredLiveCompetitions();
      
      if (expiredCompetitions.length > 0) {
        log(`[SCHEDULER] Found ${expiredCompetitions.length} expired competitions to finish`);
        
        for (const competition of expiredCompetitions) {
          try {
            await storage.updateCompetitionStatus(competition.id, 'finished');
            log(`[SCHEDULER] Competition "${competition.name}" (${competition.id}) auto-finished`);
          } catch (err) {
            console.error(`[SCHEDULER] Error finishing competition ${competition.id}:`, err);
          }
        }
      }
    } catch (error) {
      console.error('[SCHEDULER] Error checking expired competitions:', error);
    }
  }
  
  // Run immediately on startup
  await checkAndFinishExpiredCompetitions();
  
  // Then run every 5 minutes
  setInterval(checkAndFinishExpiredCompetitions, SCHEDULER_INTERVAL);
  log('[SCHEDULER] Competition auto-finish scheduler started (5min intervals)');
}

// Photo processing cleanup scheduler - fixes stuck photos
async function startPhotoCleanupScheduler() {
  const SCHEDULER_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
  const STUCK_THRESHOLD_MS = 5 * 60 * 1000; // Consider stuck after 5 minutes
  
  async function cleanupStuckPhotos() {
    try {
      const { photoJobQueue } = await import('./photo-job-queue');
      const { db } = await import('./db');
      const { diaryCatches } = await import('@shared/schema');
      const { sql } = await import('drizzle-orm');
      
      // Query only catches that have photos with 'processing' status
      const catchesWithProcessingPhotos = await db
        .select()
        .from(diaryCatches)
        .where(sql`photos::text LIKE '%"status": "processing"%'`);
      
      if (catchesWithProcessingPhotos.length === 0) {
        return; // No stuck photos to process
      }
      
      const now = Date.now();
      let fixedCount = 0;
      
      for (const catch_ of catchesWithProcessingPhotos) {
        if (!catch_.photos || !Array.isArray(catch_.photos)) continue;
        
        const photos = catch_.photos as any[];
        let needsUpdate = false;
        
        const updatedPhotos = photos.map((photo: any) => {
          if (typeof photo !== 'object') return photo;
          
          // Check if photo is stuck in processing
          if (photo.status === 'processing') {
            // Skip if there's an active job for this photo
            if (photo.id && photoJobQueue.hasActiveJobForPhoto(photo.id)) {
              return photo;
            }
            
            let isStuck = false;
            
            // Check timestamp - only consider stuck if processing started more than threshold ago
            if (photo.processingStartedAt) {
              const startedAt = new Date(photo.processingStartedAt).getTime();
              const elapsed = now - startedAt;
              isStuck = elapsed > STUCK_THRESHOLD_MS;
              
              if (!isStuck) {
                // Photo is still within normal processing time
                return photo;
              }
            } else {
              // No timestamp means legacy photo - assume stuck
              isStuck = true;
            }
            
            if (isStuck) {
              // Mark as failed — NEVER fallback to originalUrl (could be raw/EXIF file)
              needsUpdate = true;
              fixedCount++;
              const elapsedMinutes = photo.processingStartedAt 
                ? Math.round((now - new Date(photo.processingStartedAt).getTime()) / 60000)
                : 'unknown';
              console.log(`[PHOTO_CLEANUP] Marking stuck photo ${photo.id} as failed - processing for ${elapsedMinutes} min`);
              return {
                ...photo,
                status: 'failed',
                _failedAt: new Date().toISOString(),
                _wasStuck: true
              };
            }
          }
          
          return photo;
        });
        
        if (needsUpdate) {
          await db
            .update(diaryCatches)
            .set({ 
              photos: sql`${JSON.stringify(updatedPhotos)}::jsonb`,
              updatedAt: new Date()
            })
            .where(sql`id = ${catch_.id}`);
          
          console.log(`[PHOTO_CLEANUP] Updated catch ${catch_.id} with fixed photos`);
        }
      }
      
      if (fixedCount > 0) {
        log(`[SCHEDULER] Photo cleanup: Fixed ${fixedCount} stuck photo(s)`);
      }
    } catch (error) {
      console.error('[SCHEDULER] Error in photo cleanup scheduler:', error);
    }
  }
  
  // Don't run immediately on startup - let processing queue handle fresh uploads first
  // Start cleanup after initial delay
  setTimeout(async () => {
    await cleanupStuckPhotos();
    // Then run every 5 minutes
    setInterval(cleanupStuckPhotos, SCHEDULER_INTERVAL);
    log('[SCHEDULER] Photo cleanup scheduler started (5min intervals)');
  }, SCHEDULER_INTERVAL); // Wait 5 minutes before first cleanup run
}

(async () => {
  const { server, broadcastToUsers } = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  // Use NODE_ENV for production detection - it's set by npm scripts
  const isProduction = process.env.NODE_ENV === 'production';
  const publicPath = path.resolve(import.meta.dirname, "public");
  const hasPublicFolder = fs.existsSync(publicPath);
  
  console.log(`[Server] Environment detection: NODE_ENV=${process.env.NODE_ENV}, hasPublicFolder=${hasPublicFolder}, isProduction=${isProduction}`);
  
  if (!isProduction) {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Seed fishing areas if needed (idempotent - safe to run every startup)
  try {
    await seedFishingAreas();
  } catch (error) {
    console.error('[Server] Error seeding fishing areas:', error);
  }

  // Seed admin users if needed (idempotent - safe to run every startup)
  try {
    await seedAdminUsers();
  } catch (error) {
    console.error('[Server] Error seeding admin users:', error);
  }
  
  // Start background schedulers
  startAnnouncementScheduler();
  startBattleScheduler(broadcastToUsers);
  startBattleNotificationScheduler();
  startPhotoCleanupScheduler();

  // Competition-only schedulers — only start when competitions are enabled
  if (FEATURES.competitions) {
    startRefereeCleanupScheduler();
    startCompetitionReminderScheduler();
    startDayBeforeCompetitionScheduler();
    startCompetitionAutoFinishScheduler();
    log('[SCHEDULER] Competition schedulers started');
  } else {
    log('[SCHEDULER] Competition schedulers SKIPPED (FEATURES.competitions = false)');
  }

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
