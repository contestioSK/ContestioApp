import { storage } from './storage';
import { type Competition, type Team, type Catch } from '@shared/schema';

// WebSocket broadcaster interface (to be imported from routes.ts later)
interface NotificationBroadcaster {
  broadcastToUsers(userIds: string[], data: any): void;
  broadcastToAuthenticated(data: any): void;
}

export class NotificationService {
  private broadcaster: NotificationBroadcaster;
  
  // Rate limiting and spam protection
  private readonly catchNotificationCache = new Map<string, number>(); // competitionId:teamId -> lastNotification timestamp
  private readonly leaderboardCache = new Map<string, { position: number; timestamp: number }>(); // competitionId:teamId -> last position + timestamp
  private readonly biggestFishCache = new Map<string, number>(); // Global biggest fish -> last notification timestamp
  private readonly announcementCache = new Map<string, number>(); // Per-announcement hash -> timestamp
  
  // Rate limiting windows (in milliseconds)
  private readonly CATCH_RATE_LIMIT = 30 * 1000; // 30 seconds per team-competition
  private readonly LEADERBOARD_RATE_LIMIT = 60 * 1000; // 1 minute per team-competition
  private readonly BIGGEST_FISH_RATE_LIMIT = 120 * 1000; // 2 minutes global
  private readonly ANNOUNCEMENT_RATE_LIMIT = 300 * 1000; // 5 minutes per announcement
  
  // Cache cleanup interval (24 hours)
  private readonly CACHE_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000;

  constructor(broadcaster: NotificationBroadcaster) {
    this.broadcaster = broadcaster;
    
    // Setup periodic cache cleanup
    setInterval(() => {
      this.cleanupCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  // Cache cleanup method
  private cleanupCache(): void {
    const now = Date.now();
    
    // Cleanup catch cache - remove entries older than rate limit window
    for (const [key, timestamp] of Array.from(this.catchNotificationCache.entries())) {
      if (now - timestamp > this.CATCH_RATE_LIMIT) {
        this.catchNotificationCache.delete(key);
      }
    }
    
    // Cleanup leaderboard cache
    for (const [key, entry] of Array.from(this.leaderboardCache.entries())) {
      if (now - entry.timestamp > this.LEADERBOARD_RATE_LIMIT) {
        this.leaderboardCache.delete(key);
      }
    }
    
    // Cleanup biggest fish cache
    for (const [key, timestamp] of Array.from(this.biggestFishCache.entries())) {
      if (now - timestamp > this.BIGGEST_FISH_RATE_LIMIT) {
        this.biggestFishCache.delete(key);
      }
    }
    
    // Cleanup announcement cache
    for (const [key, timestamp] of Array.from(this.announcementCache.entries())) {
      if (now - timestamp > this.ANNOUNCEMENT_RATE_LIMIT) {
        this.announcementCache.delete(key);
      }
    }
    
    console.log('[NotificationService] Cache cleanup completed');
  }

  // Rate limiting check for catches
  private canSendCatchNotification(competitionId: string, teamId: string): boolean {
    const key = `${competitionId}:${teamId}`;
    const lastNotification = this.catchNotificationCache.get(key);
    const now = Date.now();
    
    if (lastNotification && (now - lastNotification < this.CATCH_RATE_LIMIT)) {
      return false; // Rate limited
    }
    
    this.catchNotificationCache.set(key, now);
    return true;
  }

  // Rate limiting check for leaderboard changes
  private canSendLeaderboardNotification(competitionId: string, teamId: string, newPosition: number): boolean {
    const key = `${competitionId}:${teamId}`;
    const lastEntry = this.leaderboardCache.get(key);
    const now = Date.now();
    
    // Allow if no previous entry or rate limit window passed
    if (!lastEntry || (now - lastEntry.timestamp > this.LEADERBOARD_RATE_LIMIT)) {
      this.leaderboardCache.set(key, { position: newPosition, timestamp: now });
      return true;
    }
    
    // Allow only if position changed significantly (more than 1 position)
    const positionChange = Math.abs(newPosition - lastEntry.position);
    if (positionChange > 1) {
      this.leaderboardCache.set(key, { position: newPosition, timestamp: now });
      return true;
    }
    
    return false; // Rate limited or insignificant change
  }

  // Rate limiting check for biggest fish
  private canSendBiggestFishNotification(): boolean {
    const lastNotification = this.biggestFishCache.get('global');
    const now = Date.now();
    
    if (lastNotification && (now - lastNotification < this.BIGGEST_FISH_RATE_LIMIT)) {
      return false; // Rate limited
    }
    
    this.biggestFishCache.set('global', now);
    return true;
  }

  // Rate limiting check for official announcements
  private canSendAnnouncementNotification(title: string, message: string): boolean {
    // Create hash of announcement content to avoid duplicate notifications
    const contentHash = `${title}:${message}`.substring(0, 50);
    const lastNotification = this.announcementCache.get(contentHash);
    const now = Date.now();
    
    if (lastNotification && (now - lastNotification < this.ANNOUNCEMENT_RATE_LIMIT)) {
      return false; // Rate limited
    }
    
    this.announcementCache.set(contentHash, now);
    return true;
  }

  // Emit targeted catch notification
  async notifyCatchCreated(
    catch_: Catch, 
    team: Team, 
    competition: Competition
  ): Promise<void> {
    try {
      // Rate limiting check
      if (!this.canSendCatchNotification(competition.id, team.id)) {
        console.log(`[NotificationService] Rate limited: catch notification for ${team.name} in ${competition.name}`);
        return;
      }
      
      console.log(`[NotificationService] Processing catch notification for ${team.name} in ${competition.name}`);
      
      // Get users to notify based on preferences and favorites
      const usersToNotify = await storage.getUsersToNotifyForCatch(
        competition.id, 
        team.id
      );

      if (usersToNotify.length > 0) {
        // Emit targeted notification
        this.broadcaster.broadcastToUsers(usersToNotify, {
          type: 'targeted_catch_notification',
          competitionId: competition.id,
          competitionName: competition.name,
          teamId: team.id,
          teamName: team.name,
          catchId: catch_.id,
          species: catch_.fishType,
          weight: catch_.weight,
          timestamp: catch_.submittedAt
        });
        
        console.log(`[NotificationService] Sent catch notification to ${usersToNotify.length} users`);
      } else {
        console.log(`[NotificationService] No users to notify for catch in ${competition.name}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error sending catch notification:', error);
    }
  }

  // Emit targeted leaderboard change notification
  async notifyLeaderboardChange(
    competition: Competition,
    team: Team,
    newPosition: number,
    previousPosition?: number
  ): Promise<void> {
    try {
      // Rate limiting check with position change detection
      if (!this.canSendLeaderboardNotification(competition.id, team.id, newPosition)) {
        console.log(`[NotificationService] Rate limited: leaderboard change for ${team.name} in ${competition.name}`);
        return;
      }
      
      console.log(`[NotificationService] Processing leaderboard change for ${team.name} in ${competition.name}`);
      
      // Get users to notify for leaderboard changes
      const usersToNotify = await storage.getUsersToNotifyForLeaderboardChange(
        competition.id
      );

      if (usersToNotify.length > 0) {
        // Emit targeted notification
        this.broadcaster.broadcastToUsers(usersToNotify, {
          type: 'targeted_leaderboard_change',
          competitionId: competition.id,
          competitionName: competition.name,
          teamId: team.id,
          teamName: team.name,
          position: newPosition,
          previousPosition,
          timestamp: new Date()
        });
        
        console.log(`[NotificationService] Sent leaderboard change to ${usersToNotify.length} users`);
      } else {
        console.log(`[NotificationService] No users to notify for leaderboard change in ${competition.name}`);
      }
    } catch (error) {
      console.error('[NotificationService] Error sending leaderboard notification:', error);
    }
  }

  // Emit biggest fish notification
  async notifyBiggestFish(
    catch_: Catch,
    team: Team,
    competition: Competition,
    isNewRecord: boolean = false
  ): Promise<void> {
    try {
      // Rate limiting check
      if (!this.canSendBiggestFishNotification()) {
        console.log(`[NotificationService] Rate limited: biggest fish notification - ${catch_.weight}kg ${catch_.fishType}`);
        return;
      }
      
      console.log(`[NotificationService] Processing biggest fish notification - ${catch_.weight}kg ${catch_.fishType}`);
      
      // Get users to notify for biggest fish records
      const usersToNotify = await storage.getUsersToNotifyForBiggestFish();

      if (usersToNotify.length > 0) {
        // Emit targeted notification
        this.broadcaster.broadcastToUsers(usersToNotify, {
          type: 'targeted_biggest_fish',
          competitionId: competition.id,
          competitionName: competition.name,
          teamId: team.id,
          teamName: team.name,
          catchId: catch_.id,
          species: catch_.fishType,
          weight: catch_.weight,
          isNewRecord,
          timestamp: catch_.submittedAt
        });
        
        console.log(`[NotificationService] Sent biggest fish notification to ${usersToNotify.length} users`);
      } else {
        console.log(`[NotificationService] No users to notify for biggest fish record`);
      }
    } catch (error) {
      console.error('[NotificationService] Error sending biggest fish notification:', error);
    }
  }

  // Emit official announcement
  async notifyOfficialAnnouncement(
    title: string,
    message: string,
    competitionId?: string
  ): Promise<void> {
    try {
      // Rate limiting check
      if (!this.canSendAnnouncementNotification(title, message)) {
        console.log(`[NotificationService] Rate limited: official announcement - ${title}`);
        return;
      }
      
      console.log(`[NotificationService] Processing official announcement: ${title}`);
      
      // Get users to notify for official announcements
      const usersToNotify = await storage.getUsersToNotifyForOfficialAnnouncement();

      if (usersToNotify.length > 0) {
        // Emit targeted notification
        this.broadcaster.broadcastToUsers(usersToNotify, {
          type: 'targeted_official_announcement',
          title,
          message,
          competitionId,
          timestamp: new Date()
        });
        
        console.log(`[NotificationService] Sent official announcement to ${usersToNotify.length} users`);
      } else {
        console.log(`[NotificationService] No users to notify for official announcement`);
      }
    } catch (error) {
      console.error('[NotificationService] Error sending official announcement:', error);
    }
  }
}