import { storage } from './storage';
import { type Competition, type Team, type Catch } from '@shared/schema';

// WebSocket broadcaster interface (to be imported from routes.ts later)
interface NotificationBroadcaster {
  broadcastToUsers(userIds: string[], data: any): void;
  broadcastToAuthenticated(data: any): void;
}

export class NotificationService {
  private broadcaster: NotificationBroadcaster;

  constructor(broadcaster: NotificationBroadcaster) {
    this.broadcaster = broadcaster;
  }

  // Emit targeted catch notification
  async notifyCatchCreated(
    catch_: Catch, 
    team: Team, 
    competition: Competition
  ): Promise<void> {
    try {
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