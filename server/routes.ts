import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertCompetitionSchema,
  insertCompetitionRegistrationSchema,
  insertTeamSchema,
  insertTeamMemberSchema,
  insertRefereeSchema,
  insertCatchSchema,
  insertSponsorSchema,
  createTeamStatusValidationSchema,
} from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

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
      cb(new Error("Only image files are allowed"));
    }
  },
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Create HTTP server
  const httpServer = createServer(app);

  // Create WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store active WebSocket connections
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    
    ws.on('close', () => {
      clients.delete(ws);
    });
  });

  // Helper function to broadcast updates
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      console.log('[AUTH] /api/auth/user - User ID from session:', userId);
      const user = await storage.getUser(userId);
      console.log('[AUTH] /api/auth/user - User retrieved from DB:', user ? `${user.email} (role: ${user.role})` : 'not found');
      
      if (!user) {
        console.log('[AUTH] User not found in database, this should not happen after successful login');
        return res.status(404).json({ message: "User not found in database" });
      }
      
      res.json(user);
    } catch (error) {
      console.error("[AUTH] Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

      const competitionData = insertCompetitionSchema.parse({
        ...req.body,
        organizerId: userId,
      });
      
      const competition = await storage.createCompetition(competitionData);
      res.status(201).json(competition);
    } catch (error) {
      console.error("Error creating competition:", error);
      res.status(500).json({ message: "Failed to create competition" });
    }
  });

  // Team routes
  app.get('/api/competitions/:id/teams', async (req, res) => {
    try {
      const teams = await storage.getTeamsByCompetition(req.params.id);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Failed to fetch teams" });
    }
  });

  // Get team details and their catches
  app.get('/api/teams/:id', async (req, res) => {
    try {
      const team = await storage.getTeam(req.params.id);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }

      const catches = await storage.getCatchesByTeam(req.params.id);
      res.json({ ...team, catches });
    } catch (error) {
      console.error("Error fetching team details:", error);
      res.status(500).json({ message: "Failed to fetch team details" });
    }
  });

  app.post('/api/competitions/:id/teams', async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse({
        ...req.body,
        competitionId: req.params.id,
      });
      
      const team = await storage.createTeam(teamData);
      
      // Add team members
      if (req.body.members && Array.isArray(req.body.members)) {
        for (const memberData of req.body.members) {
          const member = insertTeamMemberSchema.parse({
            ...memberData,
            teamId: team.id,
          });
          await storage.addTeamMember(member);
        }
      }
      
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
      
      if (user?.role !== 'organizer') {
        return res.status(403).json({ message: "Only organizers can update team status" });
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
      res.json({ message: "Team status updated successfully" });
    } catch (error) {
      console.error("Error updating team status:", error);
      res.status(500).json({ message: "Failed to update team status" });
    }
  });

  // Referee routes
  app.get('/api/competitions/:id/referees', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer') {
        return res.status(403).json({ message: "Only organizers can view referees" });
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
      
      if (user?.role !== 'organizer') {
        return res.status(403).json({ message: "Only organizers can create referees" });
      }

      const refereeData = insertRefereeSchema.parse({
        ...req.body,
        competitionId: req.params.id,
      });
      
      const referee = await storage.createReferee(refereeData);
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

  // Catch routes
  app.get('/api/competitions/:id/catches', async (req, res) => {
    try {
      const catches = await storage.getCatchesByCompetition(req.params.id);
      res.json(catches);
    } catch (error) {
      console.error("Error fetching catches:", error);
      res.status(500).json({ message: "Failed to fetch catches" });
    }
  });

  app.post('/api/catches', isAuthenticated, upload.single('photo'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'referee') {
        return res.status(403).json({ message: "Only referees can submit catches" });
      }

      // Get referee assignment
      const referee = await storage.getRefereeByUserAndCompetition(userId, req.body.competitionId);
      if (!referee) {
        return res.status(403).json({ message: "Referee not assigned to this competition" });
      }

      let photoUrl = null;
      if (req.file) {
        // In production, you'd upload to S3 or similar
        photoUrl = `/uploads/${req.file.filename}`;
      }

      // Use server-side referee assignment for sector (security measure)
      const catchData = insertCatchSchema.parse({
        ...req.body,
        refereeId: referee.id,
        photoUrl,
        weight: parseFloat(req.body.weight),
        sector: referee.assignedSector, // Always use referee's assigned sector
      });
      
      const newCatch = await storage.createCatch(catchData);
      
      // Update team stats
      await storage.updateTeamStats(catchData.teamId);
      
      // Broadcast real-time update
      broadcast({
        type: 'new_catch',
        catch: newCatch,
        competitionId: catchData.competitionId,
      });
      
      res.status(201).json(newCatch);
    } catch (error) {
      console.error("Error creating catch:", error);
      res.status(500).json({ message: "Failed to create catch" });
    }
  });

  // Leaderboard routes
  app.get('/api/competitions/:id/leaderboard', async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard(req.params.id);
      res.json(leaderboard);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Sector statistics route
  app.get('/api/competitions/:id/sectors/:sector/statistics', async (req, res) => {
    try {
      const { id: competitionId, sector } = req.params;
      const statistics = await storage.getSectorStatistics(competitionId, sector);
      res.json(statistics);
    } catch (error) {
      console.error("Error fetching sector statistics:", error);
      res.status(500).json({ message: "Failed to fetch sector statistics" });
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

  app.post('/api/competitions/:id/sponsors', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (user?.role !== 'organizer') {
        return res.status(403).json({ message: "Only organizers can add sponsors" });
      }

      const sponsorData = insertSponsorSchema.parse({
        ...req.body,
        competitionId: req.params.id,
      });
      
      const sponsor = await storage.createSponsor(sponsorData);
      res.status(201).json(sponsor);
    } catch (error) {
      console.error("Error creating sponsor:", error);
      res.status(500).json({ message: "Failed to create sponsor" });
    }
  });

  // Helper function for admin role check
  function isAdmin(user: any): boolean {
    return user && user.role === 'admin';
  }

  // Competition registration routes
  app.post('/api/competition-registrations', async (req, res) => {
    try {
      const registrationData = insertCompetitionRegistrationSchema.parse(req.body);
      
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

  // Serve uploaded files securely
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  return httpServer;
}
