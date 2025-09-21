import {
  users,
  competitions,
  competitionRegistrations,
  teams,
  teamMembers,
  referees,
  catches,
  sponsors,
  type User,
  type UpsertUser,
  type Competition,
  type InsertCompetition,
  type CompetitionRegistration,
  type InsertCompetitionRegistration,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type Referee,
  type InsertReferee,
  type Catch,
  type InsertCatch,
  type Sponsor,
  type InsertSponsor,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, ne, count, gt, gte } from "drizzle-orm";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, newRole: string): Promise<User>;
  updateUserStatus(userId: string, active: boolean): Promise<User>;
  
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
    usersByRole: Array<{ role: string; count: number }>;
    competitionsByStatus: Array<{ status: string; count: number }>;
  }>;
  
  // Team operations
  getTeamsByCompetition(competitionId: string): Promise<(Team & { members: TeamMember[] })[]>;
  getTeam(id: string): Promise<(Team & { members: TeamMember[], catches: Catch[] }) | undefined>;
  createTeam(team: InsertTeam): Promise<Team>;
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
        totalPoints: 0, 
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
      .where(eq(teams.competitionId, competitionId))
      .orderBy(desc(teams.totalWeight));

    // Group members by team
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
    
    return Array.from(teamMap.values());
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
      .set({ ...updates, updatedAt: new Date() })
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
      .set({ ...updates, updatedAt: new Date() })
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
    return this.getTeamsByCompetition(competitionId);
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
    const sectorTeams = allTeams.filter(team => 
      team.sector === sectorCode || team.sectorName === fullSectorName
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

    // Get recent activity (teams, catches, registrations in last 30 days)
    const recentActivity = [
      // Recent team registrations
      ...(await db
        .select({
          id: teams.id,
          type: sql<string>`'team_registration'`,
          description: sql<string>`CONCAT('Tím "', ${teams.name}, '" sa zaregistroval do súťaže')`,
          timestamp: teams.createdAt,
          user: sql<string>`NULL`,
        })
        .from(teams)
        .where(gte(teams.createdAt, thirtyDaysAgo))
        .orderBy(desc(teams.createdAt))
        .limit(5)
      ),
      
      // Recent catches
      ...(await db
        .select({
          id: catches.id,
          type: sql<string>`'catch_submission'`,
          description: sql<string>`CONCAT('Nový úlovok: ', CAST(${catches.weight} AS TEXT), 'kg')`,
          timestamp: catches.submittedAt,
          user: sql<string>`NULL`,
        })
        .from(catches)
        .where(gte(catches.submittedAt, thirtyDaysAgo))
        .orderBy(desc(catches.submittedAt))
        .limit(5)
      ),
      
      // Recent competition registrations
      ...(await db
        .select({
          id: competitionRegistrations.id,
          type: sql<string>`'competition_request'`,
          description: sql<string>`CONCAT('Nová žiadosť o súťaž: "', ${competitionRegistrations.name}, '"')`,
          timestamp: competitionRegistrations.createdAt,
          user: competitionRegistrations.contactName,
        })
        .from(competitionRegistrations)
        .where(gte(competitionRegistrations.createdAt, thirtyDaysAgo))
        .orderBy(desc(competitionRegistrations.createdAt))
        .limit(5)
      )
    ]
      .filter(activity => activity.timestamp) // Filter out null timestamps
      .sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      .slice(0, 10);

    return {
      totalUsers: totalUsersResult.count,
      totalCompetitions: totalCompetitionsResult.count,
      activeCompetitions: activeCompetitionsResult.count,
      totalTeams: totalTeamsResult.count,
      totalCatches: totalCatchesResult.count,
      pendingRegistrations: pendingRegistrationsResult.count,
      recentActivity,
      usersByRole,
      competitionsByStatus,
    };
  }
}

export const storage = new DatabaseStorage();
