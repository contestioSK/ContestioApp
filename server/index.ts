import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { NotificationService } from "./notification-service";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  
  // Start background schedulers
  startAnnouncementScheduler();
  startBattleScheduler(broadcastToUsers);
  startBattleNotificationScheduler();

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
