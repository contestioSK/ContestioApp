import { storage } from './storage';
import { type Competition, type Team, type Catch } from '@shared/schema';
import webpush from 'web-push';

// Configure web-push with VAPID keys from environment variables (REQUIRED)
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  console.error('[SECURITY] VAPID keys are required! Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY environment variables.');
  console.error('[SECURITY] Generate keys with: npx web-push generate-vapid-keys');
  console.error('[SETUP] For development, create a .env file or set environment variables:');
  console.error('[SETUP] export VAPID_PUBLIC_KEY="your-public-key"');
  console.error('[SETUP] export VAPID_PRIVATE_KEY="your-private-key"');
  
  // Exit only after logging helpful setup instructions
  process.exit(1);
}

try {
  webpush.setVapidDetails(
    'mailto:admin@contestio.app',
    vapidPublicKey,
    vapidPrivateKey
  );
  console.log('[NotificationService] VAPID keys configured successfully');
} catch (error) {
  console.error('[SECURITY] Invalid VAPID keys format! Please regenerate keys with: npx web-push generate-vapid-keys --json');
  console.error('[SECURITY] Current public key length:', vapidPublicKey?.length || 0);
  console.error('[SECURITY] Current private key length:', vapidPrivateKey?.length || 0);
  console.error('[SECURITY] Error details:', error);
  
  console.error('[SECURITY] Please generate new VAPID keys with: npx web-push generate-vapid-keys --json');
  console.error('[SECURITY] Then set both VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your environment variables');
  
  process.exit(1);
}
interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
  data?: any;
}

// WebSocket broadcaster interface (to be imported from routes.ts later)
interface NotificationBroadcaster {
  broadcastToUsers(userIds: string[], data: any): void;
  broadcastToAuthenticated(data: any): void;
}

export class NotificationService {
  private broadcaster?: NotificationBroadcaster;
  
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

  constructor(broadcaster?: NotificationBroadcaster) {
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

  // Send push notifications to specific users
  private async sendPushNotifications(userIds: string[], payload: PushPayload): Promise<void> {
    try {
      if (userIds.length === 0) return;

      // Get push subscriptions for targeted users
      const subscriptions = await storage.getUserPushSubscriptions(userIds);
      
      if (subscriptions.length === 0) {
        console.log(`[NotificationService] No push subscriptions found for ${userIds.length} users`);
        return;
      }

      console.log(`[NotificationService] Sending push to ${subscriptions.length} subscriptions`);

      // Send push notifications using web-push library
      for (const { userId, subscription } of subscriptions) {
        try {
          await webpush.sendNotification(subscription, JSON.stringify(payload));
          console.log(`[NotificationService] Push sent to user ${userId}:`, payload.title);
        } catch (error: any) {
          console.error(`[NotificationService] Push failed for user ${userId}:`, error);
          
          // Handle invalid subscriptions (410 Gone, 404 Not Found)
          if (error.statusCode === 410 || error.statusCode === 404) {
            console.log(`[NotificationService] Removing invalid push subscription for user ${userId}`);
            await storage.removePushSubscription(userId);
          }
        }
      }
    } catch (error) {
      console.error('[NotificationService] Error sending push notifications:', error);
    }
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

  // Result blocking check - filters users based on result blocking status and their roles
  private async filterUsersForResultBlocking(
    competitionId: string, 
    userIds: string[]
  ): Promise<string[]> {
    try {
      // Check if results are blocked for this competition
      const isBlocked = await storage.isResultBlocked(competitionId);
      
      if (!isBlocked) {
        return userIds; // No blocking, return all users
      }
      
      console.log(`[NotificationService] Result blocking active for competition ${competitionId}, filtering users`);
      
      // Filter users - only allow organizers, referees, and admins during blocking
      const filteredUsers: string[] = [];
      
      for (const userId of userIds) {
        const user = await storage.getUser(userId);
        
        if (user && ['organizer', 'referee', 'admin'].includes(user.role)) {
          filteredUsers.push(userId);
          console.log(`[NotificationService] Allowing notification for ${user.role}: ${user.email}`);
        } else {
          console.log(`[NotificationService] Blocking notification for public user: ${userId}`);
        }
      }
      
      return filteredUsers;
    } catch (error) {
      console.error('[NotificationService] Error filtering users for result blocking:', error);
      // On error, return all users (fail open for better UX)
      return userIds;
    }
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

      // Apply result blocking filter
      const filteredUsers = await this.filterUsersForResultBlocking(
        competition.id, 
        usersToNotify
      );

      if (filteredUsers.length > 0) {
        // Emit targeted notification via WebSocket (if broadcaster available)
        if (this.broadcaster) {
          this.broadcaster.broadcastToUsers(filteredUsers, {
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
        }
        
        console.log(`[NotificationService] Sent catch notification to ${filteredUsers.length} users (filtered for result blocking)`);
        
        // Send push notifications to users who have push notifications enabled
        await this.sendPushNotifications(filteredUsers, {
          title: `🎣 Nový úlovok v ${competition.name}!`,
          body: `${team.name} chytil ${catch_.weight}kg ${catch_.fishType}`,
          icon: '/favicon.ico',
          tag: `catch-${catch_.id}`,
          url: `/competitions/${competition.id}`,
          data: {
            type: 'catch',
            competitionId: competition.id,
            teamId: team.id,
            catchId: catch_.id
          }
        });
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

      // Apply result blocking filter
      const filteredUsers = await this.filterUsersForResultBlocking(
        competition.id, 
        usersToNotify
      );

      if (filteredUsers.length > 0) {
        // Emit targeted notification via WebSocket (if broadcaster available)
        if (this.broadcaster) {
          this.broadcaster.broadcastToUsers(filteredUsers, {
            type: 'targeted_leaderboard_change',
            competitionId: competition.id,
            competitionName: competition.name,
            teamId: team.id,
            teamName: team.name,
            position: newPosition,
            previousPosition,
            timestamp: new Date()
          });
        }
        
        console.log(`[NotificationService] Sent leaderboard change to ${filteredUsers.length} users (filtered for result blocking)`);
        
        // Send push notifications for leaderboard changes
        await this.sendPushNotifications(filteredUsers, {
          title: `📊 Zmena v rebríčku - ${competition.name}`,
          body: `${team.name} sa posunul na ${newPosition}. miesto`,
          icon: '/favicon.ico',
          tag: `leaderboard-${competition.id}-${team.id}`,
          url: `/competitions/${competition.id}`,
          data: {
            type: 'leaderboard',
            competitionId: competition.id,
            teamId: team.id,
            position: newPosition
          }
        });
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

      // Apply result blocking filter
      const filteredUsers = await this.filterUsersForResultBlocking(
        competition.id, 
        usersToNotify
      );

      if (filteredUsers.length > 0) {
        // Emit targeted notification via WebSocket (if broadcaster available)
        if (this.broadcaster) {
          this.broadcaster.broadcastToUsers(filteredUsers, {
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
        }
        
        console.log(`[NotificationService] Sent biggest fish notification to ${filteredUsers.length} users (filtered for result blocking)`);
        
        // Send push notifications for biggest fish
        await this.sendPushNotifications(filteredUsers, {
          title: `🏆 ${isNewRecord ? 'Nový rekord!' : 'Veľká ryba!'}`,
          body: `${team.name} chytil ${catch_.weight}kg ${catch_.fishType} v ${competition.name}`,
          icon: '/favicon.ico',
          tag: `biggest-fish-${catch_.id}`,
          url: `/competitions/${competition.id}`,
          data: {
            type: 'biggest_fish',
            competitionId: competition.id,
            teamId: team.id,
            catchId: catch_.id,
            isNewRecord
          }
        });
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
        // Emit targeted notification via WebSocket (if broadcaster available)
        if (this.broadcaster) {
          this.broadcaster.broadcastToUsers(usersToNotify, {
            type: 'targeted_official_announcement',
            title,
            message,
            competitionId,
            timestamp: new Date()
          });
          console.log(`[NotificationService] Sent WebSocket announcement to ${usersToNotify.length} users`);
        } else {
          console.log(`[NotificationService] Skipping WebSocket broadcast (no broadcaster available)`);
        }
        
        console.log(`[NotificationService] Processing push notifications for official announcement to ${usersToNotify.length} users`);
        
        // Send push notifications for official announcements
        await this.sendPushNotifications(usersToNotify, {
          title: `📢 ${title}`,
          body: message,
          icon: '/favicon.ico',
          tag: `announcement-${Date.now()}`,
          url: competitionId ? `/competitions/${competitionId}` : '/',
          data: {
            type: 'announcement',
            competitionId,
            title,
            message
          }
        });
      } else {
        console.log(`[NotificationService] No users to notify for official announcement`);
      }
    } catch (error) {
      console.error('[NotificationService] Error sending official announcement:', error);
    }
  }

  // Send battle invitation notification
  async sendBattleInvitation(
    invitedUserId: string,
    data: { battleId: string; battleName: string; invitedByUserId: string }
  ): Promise<void> {
    try {
      console.log(`[NotificationService] Sending battle invitation to user ${invitedUserId}`);
      
      // Get inviting user details
      const invitingUser = await storage.getUser(data.invitedByUserId);
      const inviterName = invitingUser 
        ? `${invitingUser.firstName || invitingUser.email} ${invitingUser.lastName || ''}`.trim()
        : 'Používateľ';
      
      // Send push notification
      await this.sendPushNotifications([invitedUserId], {
        title: '🎣 Nová výzva!',
        body: `${inviterName} vás pozval do battle: ${data.battleName}`,
        icon: '/favicon.ico',
        tag: `battle-invitation-${data.battleId}`,
        url: `/diary`,
        data: {
          type: 'battle_invitation',
          battleId: data.battleId,
          invitedByUserId: data.invitedByUserId
        }
      });
      
      console.log(`[NotificationService] Battle invitation sent to user ${invitedUserId}`);
    } catch (error) {
      console.error('[NotificationService] Error sending battle invitation:', error);
    }
  }
}