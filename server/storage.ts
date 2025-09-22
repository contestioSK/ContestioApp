import {
  users,
  sessions,
  competitions,
  competitionRegistrations,
  teams,
  teamMembers,
  referees,
  catches,
  sponsors,
  favoriteCompetitions,
  favoriteTeams,
  notificationPreferences,
  pushSubscriptions,
  announcements,
  type User,
  type UpsertUser,
  type Competition,
  type InsertCompetition,
  type CompetitionRegistration,
  type InsertCompetitionRegistration,
  type Team,
  type InsertTeam,
  type UpdateTeam,
  type TeamMember,
  type InsertTeamMember,
  type Referee,
  type InsertReferee,
  type Catch,
  type InsertCatch,
  type Sponsor,
  type InsertSponsor,
  type FavoriteCompetition,
  type InsertFavoriteCompetition,
  type FavoriteTeam,
  type InsertFavoriteTeam,
  type NotificationPreferences,
  type InsertNotificationPreferences,
  type UpdateNotificationPreferences,
  type PushSubscription,
  type InsertPushSubscription,
  type Announcement,
  type InsertAnnouncement,
  type UpdateAnnouncement,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ne, count, gt, gte, inArray } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, newRole: string): Promise<User>;
  updateUserStatus(userId: string, active: boolean): Promise<User>;
  getUserFromSession(sessionId: string): Promise<User | null>;
  
  // Competition operations
  getCompetitions(): Promise<Competition[]>;
  getCompetition(id: string): Promise<Competition | undefined>;
  createCompetition(competition: InsertCompetition): Promise<Competition>;
  updateCompetition(id: string, competition: Partial<InsertCompetition>): Promise<Competition>;
  updateCompetitionStatus(id: string, status: string): Promise<void>;
  deleteCompetition(id: string): Promise<void>;
  resetCompetitionCatches(competitionId: string): Promise<void>;
  
  // Competition registration operations
  getCompetitionRegistrations(status?: string): Promise<CompetitionRegistration[]>;
  getCompetitionRegistration(id: string): Promise<CompetitionRegistration | undefined>;
  createCompetitionRegistration(registration: InsertCompetitionRegistration): Promise<CompetitionRegistration>;
  approveCompetitionRegistration(id: string, approverUserId: string): Promise<{ registration: CompetitionRegistration; competition: Competition }>;
  declineCompetitionRegistration(id: string): Promise<CompetitionRegistration>;
  
  // Admin dashboard operations
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalCompetitions: number;
    activeCompetitions: number;
    totalTeams: number;
    totalCatches: number;
    pendingRegistrations: number;
    recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: Date;
      user?: string;
    }>;
    newUsers: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: Date;
      user?: string;
    }>;
    newCompetitions: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: Date;
      user?: string;
    }>;
    newCatches: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: Date;
      user?: string;
    }>;
    systemChanges: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: Date;
      user?: string;
    }>;
    usersByRole: Array<{ role: string; count: number }>;
    competitionsByStatus: Array<{ status: string; count: number }>;
  }>;
  
  // Team operations
  getTeamsByCompetition(competitionId: string): Promise<(Team & { members: TeamMember[] })[]>;
  getTeam(id: string): Promise<(Team & { members: TeamMember[], catches: Catch[] }) | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
  updateTeam(id: string, data: UpdateTeam): Promise<Team>;
  updateTeamStatus(id: string, status: string, sector?: string, sectorName?: string, placeName?: string): Promise<void>;
  updateTeamStats(teamId: string): Promise<void>;
  checkSectorPlaceAvailability(competitionId: string, sectorName: string, placeName: string, excludeTeamId?: string): Promise<boolean>;
  
  // Team member operations
  addTeamMember(member: InsertTeamMember): Promise<TeamMember>;
  
  // Referee operations
  getRefereesByCompetition(competitionId: string): Promise<Referee[]>;
  getRefereeByUserAndCompetition(userId: string, competitionId: string): Promise<Referee | undefined>;
  createReferee(referee: InsertReferee): Promise<Referee>;
  updateReferee(refereeId: string, updates: Partial<InsertReferee>): Promise<Referee>;
  deleteReferee(refereeId: string): Promise<void>;
  
  // Catch operations
  getCatchesByCompetition(competitionId: string): Promise<(Catch & { team: Team; referee: Referee })[]>;
  getCatchesByTeam(teamId: string): Promise<Catch[]>;
  createCatch(catch_: InsertCatch): Promise<Catch>;
  
  // Sponsor operations
  getSponsorsByCompetition(competitionId: string): Promise<Sponsor[]>;
  createSponsor(sponsor: InsertSponsor): Promise<Sponsor>;
  updateSponsor(sponsorId: string, updates: Partial<InsertSponsor>): Promise<Sponsor>;
  deleteSponsor(sponsorId: string): Promise<void>;
  
  // Leaderboard operations
  getLeaderboard(competitionId: string): Promise<(Team & { members: TeamMember[] })[]>;
  
  // Sector statistics
  getSectorStatistics(competitionId: string, sector: string): Promise<{
    teams: (Team & { members: TeamMember[] })[];
    biggestFish: Catch | null;
    biggestScalyCarp: Catch | null;
    biggestMirrorCarp: Catch | null;
    averageWeight: number;
  }>;

  // User favorites operations
  getUserFavoriteCompetitions(userId: string): Promise<(FavoriteCompetition & { competition: Competition })[]>;
  addFavoriteCompetition(favorite: InsertFavoriteCompetition): Promise<FavoriteCompetition>;
  removeFavoriteCompetition(userId: string, competitionId: string): Promise<void>;
  
  getUserFavoriteTeams(userId: string): Promise<(FavoriteTeam & { team: Team & { competition: Competition } })[]>;
  addFavoriteTeam(favorite: InsertFavoriteTeam): Promise<FavoriteTeam>;
  removeFavoriteTeam(userId: string, teamId: string): Promise<void>;
  
  // Notification preferences operations
  getUserNotificationPreferences(userId: string): Promise<NotificationPreferences>;
  updateUserNotificationPreferences(userId: string, preferences: UpdateNotificationPreferences): Promise<NotificationPreferences>;
  
  // Notification filtering operations for targeted WebSocket broadcasts
  getUsersToNotifyForCatch(competitionId: string, teamId: string): Promise<string[]>;
  getUsersToNotifyForLeaderboardChange(competitionId: string): Promise<string[]>;
  getUsersToNotifyForBiggestFish(): Promise<string[]>;
  getUsersToNotifyForOfficialAnnouncement(): Promise<string[]>;
  
  // Push notification subscription operations
  savePushSubscription(userId: string, subscription: any): Promise<void>;
  removePushSubscription(userId: string): Promise<void>;
  getUserPushSubscriptions(userIds: string[]): Promise<Array<{ userId: string; subscription: any }>>;
  
  // Announcement operations
  getAnnouncements(options?: { competitionId?: string; published?: boolean; limit?: number }): Promise<Announcement[]>;
  getAnnouncement(id: string): Promise<Announcement | undefined>;
  createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement>;
  updateAnnouncement(id: string, announcement: UpdateAnnouncement): Promise<Announcement>;
  deleteAnnouncement(id: string): Promise<void>;
  getPublishedAnnouncements(options?: { competitionId?: string; limit?: number }): Promise<Announcement[]>;
  getUnnotifiedLiveAnnouncements(): Promise<Announcement[]>;
  markAnnouncementNotified(id: string): Promise<void>;
  
  // Result blocking operations
  isResultBlocked(competitionId: string): Promise<boolean>;
  updateResultBlockStatus(): Promise<void>;
  getActiveCompetitions(): Promise<Competition[]>;
  calculateAndUpdateResultBlockStartTime(competitionId: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First, check if a user with this ID already exists
    if (userData.id) {
      const existingById = await this.getUser(userData.id);
      if (existingById) {
        // Update existing user by ID
        const [updatedUser] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.id, userData.id))
          .returning();
        return updatedUser;
      }
    }

    // If no user by ID, check if there's a user with this email
    if (userData.email) {
      const [existingByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));

      if (existingByEmail) {
        // Update the existing user with the new ID and data
        // This handles the case where OIDC sub changed but email stayed the same
        const [updatedUser] = await db
          .update(users)
          .set({
            ...userData,
            updatedAt: new Date(),
          })
          .where(eq(users.email, userData.email!))
          .returning();
        return updatedUser;
      }
    }

    // No existing user found, create a new one
    const [newUser] = await db
      .insert(users)
      .values(userData)
      .returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, newRole: string): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        role: newRole as "public" | "organizer" | "referee" | "admin",
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("Používateľ nenájdený");
    }
    return updatedUser;
  }

  async updateUserStatus(userId: string, active: boolean): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ 
        active,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    
    if (!updatedUser) {
      throw new Error("Používateľ nenájdený");
    }
    return updatedUser;
  }

  async getUserFromSession(sessionId: string): Promise<User | null> {
    try {
      // Get session data from sessions table
      const [sessionData] = await db
        .select()
        .from(sessions)
        .where(eq(sessions.sid, sessionId));
      
      if (!sessionData) {
        return null;
      }

      // Parse session data - connect-pg-simple stores session as JSON
      const sessData = sessionData.sess as any;
      
      // Extract user ID from passport session data
      const userId = sessData?.passport?.user?.claims?.sub;
      
      if (!userId) {
        return null;
      }

      // Get the user from users table
      const user = await this.getUser(userId);
      return user || null;
    } catch (error) {
      console.error('[STORAGE] Error getting user from session:', error);
      return null;
    }
  }

  // Competition operations
  async getCompetitions(): Promise<Competition[]> {
    return await db.select().from(competitions).orderBy(desc(competitions.startDate));
  }

  async getCompetition(id: string): Promise<Competition | undefined> {
    const [competition] = await db.select().from(competitions).where(eq(competitions.id, id));
    return competition;
  }

  async createCompetition(competition: InsertCompetition): Promise<Competition> {
    const [newCompetition] = await db
      .insert(competitions)
      .values(competition as typeof competitions.$inferInsert)
      .returning();
    return newCompetition;
  }

  async updateCompetition(id: string, competition: Partial<InsertCompetition>): Promise<Competition> {
    const [updatedCompetition] = await db
      .update(competitions)
      .set({ ...competition, updatedAt: new Date() })
      .where(eq(competitions.id, id))
      .returning();
    return updatedCompetition;
  }

  async updateCompetitionStatus(id: string, status: string): Promise<void> {
    await db
      .update(competitions)
      .set({ status, updatedAt: new Date() })
      .where(eq(competitions.id, id));
  }

  async deleteCompetition(id: string): Promise<void> {
    // Delete related data first (foreign key constraints)
    await db.delete(catches).where(eq(catches.competitionId, id));
    await db.delete(teamMembers).where(
      inArray(teamMembers.teamId, 
        db.select({ id: teams.id }).from(teams).where(eq(teams.competitionId, id))
      )
    );
    await db.delete(teams).where(eq(teams.competitionId, id));
    await db.delete(referees).where(eq(referees.competitionId, id));
    await db.delete(sponsors).where(eq(sponsors.competitionId, id));
    
    // Finally delete the competition
    await db.delete(competitions).where(eq(competitions.id, id));
  }

  async resetCompetitionCatches(competitionId: string): Promise<void> {
    // Delete all catches for this competition
    await db.delete(catches).where(eq(catches.competitionId, competitionId));
    
    // Reset team statistics for all teams in this competition
    await db
      .update(teams)
      .set({ 
        totalWeight: "0", 
        fishCount: 0, 
        updatedAt: new Date() 
      })
      .where(eq(teams.competitionId, competitionId));
  }

  // Competition registration operations
  async getCompetitionRegistrations(status?: string): Promise<CompetitionRegistration[]> {
    if (status) {
      return await db.select().from(competitionRegistrations)
        .where(eq(competitionRegistrations.status, status))
        .orderBy(desc(competitionRegistrations.createdAt));
    }
    return await db.select().from(competitionRegistrations)
      .orderBy(desc(competitionRegistrations.createdAt));
  }

  async getCompetitionRegistration(id: string): Promise<CompetitionRegistration | undefined> {
    const [registration] = await db.select().from(competitionRegistrations)
      .where(eq(competitionRegistrations.id, id));
    return registration;
  }

  async createCompetitionRegistration(registration: InsertCompetitionRegistration): Promise<CompetitionRegistration> {
    const [newRegistration] = await db
      .insert(competitionRegistrations)
      .values(registration as typeof competitionRegistrations.$inferInsert)
      .returning();
    return newRegistration;
  }

  async approveCompetitionRegistration(id: string, approverUserId: string): Promise<{ registration: CompetitionRegistration; competition: Competition }> {
    const registration = await this.getCompetitionRegistration(id);
    if (!registration) {
      throw new Error("Registration not found");
    }
    if (registration.status !== "submitted") {
      throw new Error("Only submitted registrations can be approved");
    }

    // Create competition from registration
    const competitionData: InsertCompetition = {
      name: registration.name,
      description: registration.description,
      location: registration.location,
      startDate: registration.startDate,
      endDate: registration.endDate,
      firstPlacePrize: registration.firstPlacePrize,
      secondPlacePrize: registration.secondPlacePrize,
      thirdPlacePrize: registration.thirdPlacePrize,
      registrationFee: registration.registrationFee,
      maxTeams: registration.maxTeams,
      imageUrl: registration.imageUrl, // Transfer logo from registration to competition
      sectorPlaces: registration.sectorPlaces || undefined,
      sideCompetitions: registration.sideCompetitions || [],
      hasSectors: registration.hasSectors || false,
      scoringType: registration.scoringType || "total",
      organizerId: approverUserId,
    };

    const newCompetition = await this.createCompetition(competitionData);

    // Update registration status and link to created competition
    const [updatedRegistration] = await db
      .update(competitionRegistrations)
      .set({ 
        status: "approved", 
        approvedCompetitionId: newCompetition.id,
        updatedAt: new Date() 
      })
      .where(eq(competitionRegistrations.id, id))
      .returning();

    return { registration: updatedRegistration, competition: newCompetition };
  }

  async declineCompetitionRegistration(id: string): Promise<CompetitionRegistration> {
    const registration = await this.getCompetitionRegistration(id);
    if (!registration) {
      throw new Error("Registration not found");
    }
    if (registration.status !== "submitted") {
      throw new Error("Only submitted registrations can be declined");
    }

    const [updatedRegistration] = await db
      .update(competitionRegistrations)
      .set({ status: "declined", updatedAt: new Date() })
      .where(eq(competitionRegistrations.id, id))
      .returning();

    return updatedRegistration;
  }

  // Team operations
  async getTeamsByCompetition(competitionId: string): Promise<(Team & { members: TeamMember[] })[]> {
    const teamsWithMembers = await db
      .select()
      .from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teams.competitionId, competitionId));

    // Group members by team first
    const teamMap = new Map<string, Team & { members: TeamMember[] }>();
    
    for (const row of teamsWithMembers) {
      const team = row.teams;
      const member = row.team_members;
      
      if (!teamMap.has(team.id)) {
        teamMap.set(team.id, { ...team, members: [] });
      }
      
      if (member) {
        teamMap.get(team.id)!.members.push(member);
      }
    }
    
    const allTeams = Array.from(teamMap.values());

    // Calculate real-time total weights for each team from catches table
    const teamsWithRealWeights = await Promise.all(
      allTeams.map(async (team) => {
        const stats = await db
          .select({
            totalWeight: sql<number>`COALESCE(SUM(CAST(${catches.weight} AS DECIMAL)), 0)`,
            fishCount: sql<number>`COALESCE(COUNT(*), 0)`,
          })
          .from(catches)
          .where(and(eq(catches.teamId, team.id), eq(catches.isVerified, true)));

        const { totalWeight, fishCount } = stats[0];
        
        return {
          ...team,
          totalWeight: totalWeight.toString(),
          fishCount
        };
      })
    );

    // Sort teams by totalWeight descending (real-time calculated weights)
    return teamsWithRealWeights.sort((a, b) => {
      const weightA = parseFloat(a.totalWeight || '0');
      const weightB = parseFloat(b.totalWeight || '0');
      return weightB - weightA; // Descending order
    });
  }

  async getTeam(id: string): Promise<(Team & { members: TeamMember[], catches: Catch[] }) | undefined> {
    // Get team with members
    const teamWithMembers = await db
      .select()
      .from(teams)
      .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(eq(teams.id, id));

    if (teamWithMembers.length === 0) {
      return undefined;
    }

    // Get team catches
    const teamCatches = await db
      .select()
      .from(catches)
      .where(eq(catches.teamId, id));

    // Build the team object with members and catches
    const team = teamWithMembers[0].teams;
    const members = teamWithMembers
      .filter(row => row.team_members !== null)
      .map(row => row.team_members!);

    return {
      ...team,
      members,
      catches: teamCatches
    };
  }

  async createTeam(team: InsertTeam): Promise<Team> {
    const [newTeam] = await db
      .insert(teams)
      .values(team)
      .returning();
    return newTeam;
  }

  async updateTeamStatus(id: string, status: string, sector?: string, sectorName?: string, placeName?: string): Promise<void> {
    const updateData: any = { status, updatedAt: new Date() };
    
    // Set sector fields - prioritize new sectorName/placeName over legacy sector
    if (sectorName) {
      updateData.sectorName = sectorName;
      updateData.sector = sector || sectorName.split(' ')[1]; // Extract letter for backward compatibility
    } else if (sector) {
      updateData.sector = sector;
    }
    
    if (placeName) {
      updateData.placeName = placeName;
    }
    
    await db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, id));
  }

  async updateTeam(id: string, data: UpdateTeam): Promise<Team> {
    const updateData = {
      ...data,
      updatedAt: new Date()
    };

    const [updatedTeam] = await db
      .update(teams)
      .set(updateData)
      .where(eq(teams.id, id))
      .returning();

    return updatedTeam;
  }

  async updateTeamStats(teamId: string): Promise<void> {
    // First, get the team and its competition to determine scoring type
    const [team] = await db
      .select({ competitionId: teams.competitionId })
      .from(teams)
      .where(eq(teams.id, teamId));
    
    if (!team) return;

    const [competition] = await db
      .select({ scoringType: competitions.scoringType })
      .from(competitions)
      .where(eq(competitions.id, team.competitionId));

    if (!competition) return;

    const scoringType = competition.scoringType || "total";

    // Get basic stats (always needed) - only count verified catches
    const stats = await db
      .select({
        totalWeight: sql<number>`COALESCE(SUM(CAST(${catches.weight} AS DECIMAL)), 0)`,
        fishCount: sql<number>`COALESCE(COUNT(*), 0)`,
      })
      .from(catches)
      .where(and(eq(catches.teamId, teamId), eq(catches.isVerified, true)));

    const { totalWeight, fishCount } = stats[0];

    // Calculate score based on scoring type
    let score = totalWeight; // Default to total weight

    if (scoringType === "avg3" || scoringType === "avg5") {
      // Get top N catches ordered by weight (descending) - only verified catches
      const topN = scoringType === "avg3" ? 3 : 5;
      
      const topCatches = await db
        .select({ weight: catches.weight })
        .from(catches)
        .where(and(eq(catches.teamId, teamId), eq(catches.isVerified, true)))
        .orderBy(sql`CAST(${catches.weight} AS DECIMAL) DESC`)
        .limit(topN);

      if (topCatches.length > 0) {
        const totalTopWeight = topCatches.reduce((sum, catch_) => sum + parseFloat(catch_.weight), 0);
        // Always divide by the fixed N for fairness (teams with fewer catches get lower averages)
        score = totalTopWeight / topN;
      } else {
        score = 0;
      }
    }

    // Store the calculated score in totalWeight field for sorting purposes
    await db
      .update(teams)
      .set({
        totalWeight: score.toString(), // Store calculated score (not necessarily total weight)
        fishCount,
        updatedAt: new Date(),
      })
      .where(eq(teams.id, teamId));
  }

  async checkSectorPlaceAvailability(competitionId: string, sectorName: string, placeName: string, excludeTeamId?: string): Promise<boolean> {
    const whereConditions = [
      eq(teams.competitionId, competitionId),
      eq(teams.status, "approved"),
      eq(teams.sectorName, sectorName),
      eq(teams.placeName, placeName)
    ];

    if (excludeTeamId) {
      whereConditions.push(ne(teams.id, excludeTeamId));
    }

    const existingTeams = await db
      .select({ id: teams.id })
      .from(teams)
      .where(and(...whereConditions));

    return existingTeams.length === 0;
  }

  // Team member operations
  async addTeamMember(member: InsertTeamMember): Promise<TeamMember> {
    const [newMember] = await db
      .insert(teamMembers)
      .values(member)
      .returning();
    return newMember;
  }

  // Referee operations
  async getRefereesByCompetition(competitionId: string): Promise<Referee[]> {
    return await db
      .select()
      .from(referees)
      .where(eq(referees.competitionId, competitionId));
  }

  async getRefereeByUserAndCompetition(userId: string, competitionId: string): Promise<Referee | undefined> {
    const [referee] = await db
      .select()
      .from(referees)
      .where(
        and(
          eq(referees.userId, userId),
          eq(referees.competitionId, competitionId)
        )
      );
    return referee;
  }

  async createReferee(referee: InsertReferee): Promise<Referee> {
    const [newReferee] = await db
      .insert(referees)
      .values(referee)
      .returning();
    return newReferee;
  }

  async updateReferee(refereeId: string, updates: Partial<InsertReferee>): Promise<Referee> {
    const [updatedReferee] = await db
      .update(referees)
      .set({ ...updates })
      .where(eq(referees.id, refereeId))
      .returning();
    return updatedReferee;
  }

  async deleteReferee(refereeId: string): Promise<void> {
    await db
      .delete(referees)
      .where(eq(referees.id, refereeId));
  }

  // Catch operations
  async getCatchesByCompetition(competitionId: string): Promise<(Catch & { team: Team; referee: Referee })[]> {
    const catchesWithDetails = await db
      .select()
      .from(catches)
      .leftJoin(teams, eq(catches.teamId, teams.id))
      .leftJoin(referees, eq(catches.refereeId, referees.id))
      .where(eq(catches.competitionId, competitionId))
      .orderBy(desc(catches.submittedAt));

    return catchesWithDetails.map(row => ({
      ...row.catches,
      team: row.teams!,
      referee: row.referees!,
    }));
  }

  async getCatchesByTeam(teamId: string): Promise<Catch[]> {
    return await db
      .select()
      .from(catches)
      .where(eq(catches.teamId, teamId))
      .orderBy(desc(catches.submittedAt));
  }

  async createCatch(catch_: InsertCatch): Promise<Catch> {
    const [newCatch] = await db
      .insert(catches)
      .values(catch_)
      .returning();
    return newCatch;
  }

  // Sponsor operations
  async getSponsorsByCompetition(competitionId: string): Promise<Sponsor[]> {
    return await db
      .select()
      .from(sponsors)
      .where(eq(sponsors.competitionId, competitionId));
  }

  async createSponsor(sponsor: InsertSponsor): Promise<Sponsor> {
    const [newSponsor] = await db
      .insert(sponsors)
      .values(sponsor)
      .returning();
    return newSponsor;
  }

  async updateSponsor(sponsorId: string, updates: Partial<InsertSponsor>): Promise<Sponsor> {
    const [updatedSponsor] = await db
      .update(sponsors)
      .set({ ...updates })
      .where(eq(sponsors.id, sponsorId))
      .returning();
    return updatedSponsor;
  }

  async deleteSponsor(sponsorId: string): Promise<void> {
    await db
      .delete(sponsors)
      .where(eq(sponsors.id, sponsorId));
  }

  // Leaderboard operations
  async getLeaderboard(competitionId: string): Promise<(Team & { members: TeamMember[] })[]> {
    // Get all teams for this competition
    const allTeams = await this.getTeamsByCompetition(competitionId);
    
    // Filter to only approved teams
    const approvedTeams = allTeams.filter(team => team.status === 'approved');

    // Calculate real-time total weights for each team from catches table
    const teamsWithRealWeights = await Promise.all(
      approvedTeams.map(async (team) => {
        const stats = await db
          .select({
            totalWeight: sql<number>`COALESCE(SUM(CAST(${catches.weight} AS DECIMAL)), 0)`,
            fishCount: sql<number>`COALESCE(COUNT(*), 0)`,
          })
          .from(catches)
          .where(and(eq(catches.teamId, team.id), eq(catches.isVerified, true)));

        const { totalWeight, fishCount } = stats[0];
        
        return {
          ...team,
          totalWeight: totalWeight.toString(),
          fishCount
        };
      })
    );

    // Sort teams by totalWeight descending
    return teamsWithRealWeights.sort((a, b) => {
      const weightA = parseFloat(a.totalWeight || '0');
      const weightB = parseFloat(b.totalWeight || '0');
      return weightB - weightA; // Descending order
    });
  }

  // Sector statistics operations
  async getSectorStatistics(competitionId: string, sector: string): Promise<{
    teams: (Team & { members: TeamMember[] })[];
    biggestFish: Catch | null;
    biggestScalyCarp: Catch | null;
    biggestMirrorCarp: Catch | null;
    averageWeight: number;
  }> {
    // Normalize sector parameter - extract single letter if full name provided
    const sectorCode = sector.match(/[A-Z]/)?.[0] || sector.toUpperCase();
    const fullSectorName = `Sektor ${sectorCode}`;

    // Get teams in this sector - match by both legacy sector and new sectorName
    const allTeams = await this.getTeamsByCompetition(competitionId);
    const baseSectorTeams = allTeams.filter(team => 
      team.sector === sectorCode || team.sectorName === fullSectorName
    );

    // Calculate real-time total weights and fish counts for each team from catches table
    const sectorTeams = await Promise.all(
      baseSectorTeams.map(async (team) => {
        const stats = await db
          .select({
            totalWeight: sql<number>`COALESCE(SUM(CAST(${catches.weight} AS DECIMAL)), 0)`,
            fishCount: sql<number>`COALESCE(COUNT(*), 0)`,
          })
          .from(catches)
          .where(and(eq(catches.teamId, team.id), eq(catches.isVerified, true)));

        const { totalWeight, fishCount } = stats[0];
        
        return {
          ...team,
          totalWeight: totalWeight.toString(),
          fishCount
        };
      })
    );

    // Get all verified catches for this sector
    const sectorCatches = await db
      .select()
      .from(catches)
      .where(and(
        eq(catches.competitionId, competitionId),
        eq(catches.sector, sectorCode),
        eq(catches.isVerified, true)
      ))
      .orderBy(desc(catches.weight));

    if (sectorCatches.length === 0) {
      return {
        teams: sectorTeams,
        biggestFish: null,
        biggestScalyCarp: null,
        biggestMirrorCarp: null,
        averageWeight: 0,
      };
    }

    // Find biggest fish overall
    const biggestFish = sectorCatches[0] || null;

    // Find biggest scaly carp 
    const biggestScalyCarp = sectorCatches.find(catch_ => catch_.fishType === 'scaly') || null;

    // Find biggest mirror carp
    const biggestMirrorCarp = sectorCatches.find(catch_ => catch_.fishType === 'mirror') || null;

    // Calculate average weight with proper numeric handling
    const totalWeight = sectorCatches.reduce((sum, catch_) => sum + Number(catch_.weight), 0);
    const averageWeight = Number((totalWeight / sectorCatches.length).toFixed(2));

    return {
      teams: sectorTeams,
      biggestFish,
      biggestScalyCarp,
      biggestMirrorCarp,
      averageWeight,
    };
  }

  // Sector leaderboards operations
  async getSectorLeaderboards(competitionId: string, limit: number = 3): Promise<{
    sector: string;
    teamCount: number;
    topTeams: (Team & { members: TeamMember[] })[];
  }[]> {
    // Get all teams for this competition
    const allTeams = await this.getTeamsByCompetition(competitionId);
    
    // Filter to only approved teams with a sector
    const approvedTeamsWithSector = allTeams.filter(team => 
      team.status === 'approved' && (team.sector || team.sectorName)
    );

    // Calculate real-time total weights for each team from catches table
    const teamsWithRealWeights = await Promise.all(
      approvedTeamsWithSector.map(async (team) => {
        const stats = await db
          .select({
            totalWeight: sql<number>`COALESCE(SUM(CAST(${catches.weight} AS DECIMAL)), 0)`,
            fishCount: sql<number>`COALESCE(COUNT(*), 0)`,
          })
          .from(catches)
          .where(and(eq(catches.teamId, team.id), eq(catches.isVerified, true)));

        const { totalWeight, fishCount } = stats[0];
        
        return {
          ...team,
          totalWeight: totalWeight.toString(),
          fishCount
        };
      })
    );

    // Group teams by sector
    const teamsBySector: Record<string, (Team & { members: TeamMember[] })[]> = {};
    
    teamsWithRealWeights.forEach(team => {
      // Normalize sector - prefer team.sector, fallback to first letter of sectorName
      let sectorCode = team.sector;
      if (!sectorCode && team.sectorName) {
        sectorCode = team.sectorName.match(/[A-Z]/)?.[0] || '';
      }
      
      if (sectorCode) {
        if (!teamsBySector[sectorCode]) {
          teamsBySector[sectorCode] = [];
        }
        teamsBySector[sectorCode].push(team);
      }
    });

    // Sort teams within each sector by totalWeight descending and take top N
    const sectorLeaderboards = Object.entries(teamsBySector).map(([sector, teams]) => {
      const sortedTeams = teams.sort((a, b) => {
        const weightA = parseFloat(a.totalWeight || '0');
        const weightB = parseFloat(b.totalWeight || '0');
        return weightB - weightA; // Descending order
      });

      return {
        sector,
        teamCount: teams.length,
        topTeams: sortedTeams.slice(0, limit)
      };
    });

    // Sort sectors alphabetically
    return sectorLeaderboards.sort((a, b) => a.sector.localeCompare(b.sector));
  }

  // Admin dashboard operations
  async getDashboardStats() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get basic counts
    const [totalUsersResult] = await db.select({ count: count() }).from(users);
    const [totalCompetitionsResult] = await db.select({ count: count() }).from(competitions);
    const [activeCompetitionsResult] = await db.select({ count: count() }).from(competitions)
      .where(eq(competitions.status, 'live'));
    const [totalTeamsResult] = await db.select({ count: count() }).from(teams);
    const [totalCatchesResult] = await db.select({ count: count() }).from(catches);
    const [pendingRegistrationsResult] = await db.select({ count: count() }).from(competitionRegistrations)
      .where(eq(competitionRegistrations.status, 'submitted'));

    // Get users by role
    const usersByRole = await db
      .select({ role: users.role, count: count() })
      .from(users)
      .groupBy(users.role);

    // Get competitions by status  
    const competitionsByStatus = await db
      .select({ status: competitions.status, count: count() })
      .from(competitions)
      .groupBy(competitions.status);

    // Get categorized recent activity for dashboard columns
    
    // New Users (recent user registrations)
    const newUsersRaw = await db
      .select({
        id: users.id,
        type: sql<string>`'user_registration'`,
        description: sql<string>`CONCAT('Nový používateľ: ', COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, ''), ' (', ${users.email}, ')')`,
        timestamp: users.createdAt,
        user: sql<string>`CONCAT(COALESCE(${users.firstName}, ''), ' ', COALESCE(${users.lastName}, ''))`,
      })
      .from(users)
      .where(gte(users.createdAt, thirtyDaysAgo))
      .orderBy(desc(users.createdAt))
      .limit(30);
      
    const newUsers = newUsersRaw
      .filter(user => user.timestamp !== null)
      .map(user => ({
        ...user,
        timestamp: user.timestamp as Date
      }));

    // New Competitions (recent competition creations)  
    const newCompetitionsRaw = await db
      .select({
        id: competitions.id,
        type: sql<string>`'competition_creation'`,
        description: sql<string>`CONCAT('Nová súťaž: "', ${competitions.name}, '"')`,
        timestamp: competitions.createdAt,
        user: sql<string>`NULL`,
      })
      .from(competitions)
      .where(gte(competitions.createdAt, thirtyDaysAgo))
      .orderBy(desc(competitions.createdAt))
      .limit(30);
      
    const newCompetitions = newCompetitionsRaw
      .filter(comp => comp.timestamp !== null)
      .map(comp => ({
        ...comp,
        timestamp: comp.timestamp as Date
      }));
      
    // New Catches (recent catch submissions with competition info)
    const newCatchesRaw = await db
      .select({
        id: catches.id,
        type: sql<string>`'catch_submission'`,
        description: sql<string>`CONCAT('Nový úlovok: ', CAST(${catches.weight} AS TEXT), 'kg')`,
        timestamp: catches.submittedAt,
        user: competitions.name,
      })
      .from(catches)
      .innerJoin(competitions, eq(catches.competitionId, competitions.id))
      .where(gte(catches.submittedAt, thirtyDaysAgo))
      .orderBy(desc(catches.submittedAt))
      .limit(30);
      
    const newCatches = newCatchesRaw
      .filter(catch_ => catch_.timestamp !== null)
      .map(catch_ => ({
        ...catch_,
        timestamp: catch_.timestamp as Date
      }));
      
    // System Changes (team registrations, status changes, etc)
    const systemChanges = [
      // Recent team registrations
      ...(await db
        .select({
          id: teams.id,
          type: sql<string>`'team_registration'`,
          description: sql<string>`CONCAT('Tím "', ${teams.name}, '" sa zaregistroval')`,
          timestamp: teams.createdAt,
          user: sql<string>`NULL`,
        })
        .from(teams)
        .where(gte(teams.createdAt, thirtyDaysAgo))
        .orderBy(desc(teams.createdAt))
        .limit(20)
      ),
      
      // Recent competition registration requests
      ...(await db
        .select({
          id: competitionRegistrations.id,
          type: sql<string>`'competition_request'`,
          description: sql<string>`CONCAT('Žiadosť o súťaž: "', ${competitionRegistrations.name}, '"')`,
          timestamp: competitionRegistrations.createdAt,
          user: competitionRegistrations.contactName,
        })
        .from(competitionRegistrations)
        .where(gte(competitionRegistrations.createdAt, thirtyDaysAgo))
        .orderBy(desc(competitionRegistrations.createdAt))
        .limit(10)
      )
    ]
      .filter(activity => activity.timestamp !== null)
      .map(activity => ({
        ...activity,
        timestamp: activity.timestamp as Date
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 30);

    // Legacy combined activity for backward compatibility
    const recentActivity = [...newUsers, ...newCompetitions, ...newCatches, ...systemChanges]
      .filter(activity => activity.timestamp !== null)
      .map(activity => ({
        ...activity,
        timestamp: activity.timestamp as Date
      }))
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10);

    return {
      totalUsers: totalUsersResult.count,
      totalCompetitions: totalCompetitionsResult.count,
      activeCompetitions: activeCompetitionsResult.count,
      totalTeams: totalTeamsResult.count,
      totalCatches: totalCatchesResult.count,
      pendingRegistrations: pendingRegistrationsResult.count,
      recentActivity,
      newUsers,
      newCompetitions,
      newCatches,
      systemChanges,
      usersByRole,
      competitionsByStatus,
    };
  }

  // User favorites operations
  async getUserFavoriteCompetitions(userId: string): Promise<(FavoriteCompetition & { competition: Competition })[]> {
    return db
      .select()
      .from(favoriteCompetitions)
      .leftJoin(competitions, eq(favoriteCompetitions.competitionId, competitions.id))
      .where(eq(favoriteCompetitions.userId, userId))
      .then(results => 
        results.map(result => ({
          ...result.favorite_competitions,
          competition: result.competitions!
        }))
      );
  }

  async addFavoriteCompetition(favorite: InsertFavoriteCompetition): Promise<FavoriteCompetition> {
    // Use upsert to prevent race conditions - insert or do nothing if already exists
    const [result] = await db
      .insert(favoriteCompetitions)
      .values(favorite)
      .onConflictDoNothing()
      .returning();
    
    // If no result from insert (conflict), get the existing record
    if (!result) {
      const [existing] = await db
        .select()
        .from(favoriteCompetitions)
        .where(
          and(
            eq(favoriteCompetitions.userId, favorite.userId),
            eq(favoriteCompetitions.competitionId, favorite.competitionId)
          )
        );
      return existing;
    }
    
    return result;
  }

  async removeFavoriteCompetition(userId: string, competitionId: string): Promise<void> {
    await db
      .delete(favoriteCompetitions)
      .where(
        and(
          eq(favoriteCompetitions.userId, userId),
          eq(favoriteCompetitions.competitionId, competitionId)
        )
      );
  }

  async getUserFavoriteTeams(userId: string): Promise<(FavoriteTeam & { team: Team & { competition: Competition } })[]> {
    return db
      .select()
      .from(favoriteTeams)
      .leftJoin(teams, eq(favoriteTeams.teamId, teams.id))
      .leftJoin(competitions, eq(teams.competitionId, competitions.id))
      .where(eq(favoriteTeams.userId, userId))
      .then(results => 
        results.map(result => ({
          ...result.favorite_teams,
          team: {
            ...result.teams!,
            competition: result.competitions!
          }
        }))
      );
  }

  async addFavoriteTeam(favorite: InsertFavoriteTeam): Promise<FavoriteTeam> {
    // Use upsert to prevent race conditions - insert or do nothing if already exists
    const [result] = await db
      .insert(favoriteTeams)
      .values(favorite)
      .onConflictDoNothing()
      .returning();
    
    // If no result from insert (conflict), get the existing record
    if (!result) {
      const [existing] = await db
        .select()
        .from(favoriteTeams)
        .where(
          and(
            eq(favoriteTeams.userId, favorite.userId),
            eq(favoriteTeams.teamId, favorite.teamId)
          )
        );
      return existing;
    }
    
    return result;
  }

  async removeFavoriteTeam(userId: string, teamId: string): Promise<void> {
    await db
      .delete(favoriteTeams)
      .where(
        and(
          eq(favoriteTeams.userId, userId),
          eq(favoriteTeams.teamId, teamId)
        )
      );
  }

  // Notification preferences operations
  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    // Use upsert - try to insert defaults, or return existing if already exists
    const [result] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        allCatches: true,
        favoriteCompetitions: true,
        favoriteTeams: true,
        biggestFish: true,
        officialAnnouncements: true,
        leaderboardChanges: false,
        pushNotifications: false,
      })
      .onConflictDoNothing()
      .returning();
    
    if (result) {
      return result;
    }
    
    // Get existing preferences if insert was skipped due to conflict
    const [existing] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId));
    
    return existing;
  }

  async updateUserNotificationPreferences(userId: string, preferences: UpdateNotificationPreferences): Promise<NotificationPreferences> {
    // Use upsert pattern - update if exists, create with defaults + updates if doesn't exist
    const [result] = await db
      .insert(notificationPreferences)
      .values({
        userId,
        allCatches: true,
        favoriteCompetitions: true,
        favoriteTeams: true,
        biggestFish: true,
        officialAnnouncements: true,
        leaderboardChanges: false,
        pushNotifications: false,
        ...preferences,
      })
      .onConflictDoUpdate({
        target: notificationPreferences.userId,
        set: {
          ...preferences,
          updatedAt: new Date(),
        },
      })
      .returning();
    
    return result;
  }

  // Notification filtering operations for targeted WebSocket broadcasts
  async getUsersToNotifyForCatch(competitionId: string, teamId: string): Promise<string[]> {
    // Get users who should be notified about catch events
    // Based on notification preferences and favorite competitions/teams
    const result = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(
        and(
          // Either all catches enabled OR (favorite competitions enabled AND user favorited this competition) OR (favorite teams enabled AND user favorited this team)
          sql`(
            ${notificationPreferences.allCatches} = true 
            OR (
              ${notificationPreferences.favoriteCompetitions} = true 
              AND EXISTS (
                SELECT 1 FROM ${favoriteCompetitions} 
                WHERE ${favoriteCompetitions.userId} = ${notificationPreferences.userId} 
                AND ${favoriteCompetitions.competitionId} = ${competitionId}
              )
            )
            OR (
              ${notificationPreferences.favoriteTeams} = true 
              AND EXISTS (
                SELECT 1 FROM ${favoriteTeams} 
                WHERE ${favoriteTeams.userId} = ${notificationPreferences.userId} 
                AND ${favoriteTeams.teamId} = ${teamId}
              )
            )
          )`
        )
      );
    
    return result.map(r => r.userId);
  }

  async getUsersToNotifyForLeaderboardChange(competitionId: string): Promise<string[]> {
    // Get users who should be notified about leaderboard changes
    // Users with leaderboardChanges enabled AND who favorited this competition
    const result = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .leftJoin(favoriteCompetitions, eq(notificationPreferences.userId, favoriteCompetitions.userId))
      .where(
        and(
          eq(notificationPreferences.leaderboardChanges, true),
          eq(favoriteCompetitions.competitionId, competitionId)
        )
      );
    
    return result.map(r => r.userId);
  }

  async getUsersToNotifyForBiggestFish(): Promise<string[]> {
    // Get users who should be notified about biggest fish records
    // Users with biggestFish preference enabled
    const result = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.biggestFish, true));
    
    return result.map(r => r.userId);
  }

  async getUsersToNotifyForOfficialAnnouncement(): Promise<string[]> {
    // Get users who should be notified about official announcements
    // Users with officialAnnouncements preference enabled
    const result = await db
      .select({ userId: notificationPreferences.userId })
      .from(notificationPreferences)
      .where(eq(notificationPreferences.officialAnnouncements, true));
    
    return result.map(r => r.userId);
  }

  // Push notification subscription operations
  async savePushSubscription(userId: string, subscription: any): Promise<void> {
    // Use upsert pattern - update if exists, create if doesn't exist
    await db
      .insert(pushSubscriptions)
      .values({
        userId,
        endpoint: subscription.endpoint,
        p256dhKey: subscription.keys.p256dh,
        authKey: subscription.keys.auth,
      })
      .onConflictDoUpdate({
        target: pushSubscriptions.userId,
        set: {
          endpoint: subscription.endpoint,
          p256dhKey: subscription.keys.p256dh,
          authKey: subscription.keys.auth,
          updatedAt: new Date(),
        },
      });
    
    console.log(`[Storage] Push subscription saved for user ${userId}`);
  }

  async removePushSubscription(userId: string): Promise<void> {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.userId, userId));
    
    console.log(`[Storage] Push subscription removed for user ${userId}`);
  }

  async getUserPushSubscriptions(userIds: string[]): Promise<Array<{ userId: string; subscription: any }>> {
    const result = await db
      .select({
        userId: pushSubscriptions.userId,
        endpoint: pushSubscriptions.endpoint,
        p256dhKey: pushSubscriptions.p256dhKey,
        authKey: pushSubscriptions.authKey,
      })
      .from(pushSubscriptions)
      .where(inArray(pushSubscriptions.userId, userIds));
    
    return result.map(row => ({
      userId: row.userId,
      subscription: {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dhKey,
          auth: row.authKey,
        },
      },
    }));
  }

  // Announcement operations
  async getAnnouncements(options?: { competitionId?: string; published?: boolean; limit?: number }): Promise<Announcement[]> {
    const conditions = [];
    
    if (options?.competitionId) {
      conditions.push(eq(announcements.competitionId, options.competitionId));
    }
    
    if (options?.published !== undefined) {
      conditions.push(eq(announcements.published, options.published));
    }
    
    // For published announcements, only show those where publishAt <= now (or publishAt is null)
    if (options?.published === true) {
      conditions.push(sql`(${announcements.publishAt} IS NULL OR ${announcements.publishAt} <= now())`);
    }
    
    // Build query with all conditions
    const baseQuery = db
      .select()
      .from(announcements)
      .orderBy(desc(announcements.publishAt), desc(announcements.createdAt));
    
    // Apply conditions and limit in one go
    if (conditions.length > 0 && options?.limit) {
      return await baseQuery.where(and(...conditions)).limit(options.limit);
    } else if (conditions.length > 0) {
      return await baseQuery.where(and(...conditions));
    } else if (options?.limit) {
      return await baseQuery.limit(options.limit);
    } else {
      return await baseQuery;
    }
  }

  async getAnnouncement(id: string): Promise<Announcement | undefined> {
    const result = await db
      .select()
      .from(announcements)
      .where(eq(announcements.id, id))
      .limit(1);
    
    return result[0];
  }

  async createAnnouncement(announcement: InsertAnnouncement): Promise<Announcement> {
    const result = await db
      .insert(announcements)
      .values({
        ...announcement,
        // Keep published as specified by user - don't override based on publishAt
        published: announcement.published ?? true,
      })
      .returning();
    
    console.log(`[Storage] Created announcement: ${result[0].title}`);
    return result[0];
  }

  async updateAnnouncement(id: string, announcement: UpdateAnnouncement): Promise<Announcement> {
    // Don't override published based on publishAt - let user control visibility
    const result = await db
      .update(announcements)
      .set({
        ...announcement,
        updatedAt: new Date(),
      })
      .where(eq(announcements.id, id))
      .returning();
    
    if (result.length === 0) {
      throw new Error(`Announcement with ID ${id} not found`);
    }
    
    console.log(`[Storage] Updated announcement: ${result[0].title}`);
    return result[0];
  }

  async deleteAnnouncement(id: string): Promise<void> {
    const result = await db
      .delete(announcements)
      .where(eq(announcements.id, id))
      .returning({ title: announcements.title });
    
    if (result.length === 0) {
      throw new Error(`Announcement with ID ${id} not found`);
    }
    
    console.log(`[Storage] Deleted announcement: ${result[0].title}`);
  }

  // Find announcements that are live but haven't been notified yet
  async getUnnotifiedLiveAnnouncements(): Promise<Announcement[]> {
    return await db
      .select()
      .from(announcements)
      .where(
        and(
          eq(announcements.published, true), // Published
          sql`(${announcements.publishAt} IS NULL OR ${announcements.publishAt} <= now())`, // Live (publishAt is null or in the past)
          sql`${announcements.notifiedAt} IS NULL` // Not yet notified
        )
      )
      .orderBy(desc(announcements.publishAt), desc(announcements.createdAt));
  }
  
  // Mark announcement as notified
  async markAnnouncementNotified(id: string): Promise<void> {
    await db
      .update(announcements)
      .set({ notifiedAt: new Date() })
      .where(eq(announcements.id, id));
    
    console.log(`[Storage] Marked announcement ${id} as notified`);
  }

  async getPublishedAnnouncements(options?: { competitionId?: string; limit?: number }): Promise<Announcement[]> {
    return this.getAnnouncements({
      ...options,
      published: true,
    });
  }

  // Result blocking operations
  async isResultBlocked(competitionId: string): Promise<boolean> {
    const competition = await this.getCompetition(competitionId);
    
    if (!competition || competition.resultBlocking === 'none') {
      return false;
    }
    
    const now = new Date();
    const endDate = new Date(competition.endDate);
    const blockDuration = competition.resultBlocking === '12h' ? 12 : 24;
    const blockStartTime = new Date(endDate.getTime() - (blockDuration * 60 * 60 * 1000));
    
    return now >= blockStartTime && now < endDate;
  }

  async updateResultBlockStatus(): Promise<void> {
    // Get all competitions that might need status update
    const activeCompetitions = await this.getActiveCompetitions();
    
    for (const competition of activeCompetitions) {
      const isBlocked = await this.isResultBlocked(competition.id);
      
      // Update only if status changed
      if (competition.resultBlockActive !== isBlocked) {
        await db
          .update(competitions)
          .set({ 
            resultBlockActive: isBlocked,
            updatedAt: new Date() 
          })
          .where(eq(competitions.id, competition.id));
        
        console.log(`[Storage] Updated result block status for competition ${competition.name}: ${isBlocked ? 'ACTIVE' : 'INACTIVE'}`);
      }
    }
  }

  async getActiveCompetitions(): Promise<Competition[]> {
    const now = new Date();
    
    return await db
      .select()
      .from(competitions)
      .where(
        and(
          ne(competitions.resultBlocking, 'none'), // Has blocking enabled
          gte(competitions.endDate, now) // Not yet finished
        )
      );
  }

  async calculateAndUpdateResultBlockStartTime(competitionId: string): Promise<void> {
    const competition = await this.getCompetition(competitionId);
    
    if (!competition || competition.resultBlocking === 'none') {
      return;
    }
    
    const endDate = new Date(competition.endDate);
    const blockDuration = competition.resultBlocking === '12h' ? 12 : 24;
    const blockStartTime = new Date(endDate.getTime() - (blockDuration * 60 * 60 * 1000));
    
    await db
      .update(competitions)
      .set({ 
        resultBlockStartTime: blockStartTime,
        updatedAt: new Date() 
      })
      .where(eq(competitions.id, competitionId));
    
    console.log(`[Storage] Updated result block start time for competition ${competition.name}: ${blockStartTime.toISOString()}`);
  }
}

export const storage = new DatabaseStorage();
