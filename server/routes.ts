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
  createCatchValidationSchema,
} from "@shared/schema";
import { z } from "zod";
import { canUseFeature } from "@shared/plan-capabilities";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const upload = multer({
  dest: "uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit - zvýšil som z 5MB
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

      // Ensure sideCompetitions is properly typed
      const sideCompetitions: string[] = Array.isArray(req.body.sideCompetitions) 
        ? req.body.sideCompetitions 
        : (req.body.sideCompetitions ? [req.body.sideCompetitions] : []);

      const { sideCompetitions: _, ...bodyData } = req.body;
      const competitionData = insertCompetitionSchema.parse({
        ...bodyData,
        sideCompetitions,
        organizerId: userId,
        minWeight: req.body.minWeight ?? "2.00",
      });
      
      const competition = await storage.createCompetition(competitionData);
      res.status(201).json(competition);
    } catch (error) {
      console.error("Error creating competition:", error);
      res.status(500).json({ message: "Failed to create competition" });
    }
  });

  app.put('/api/competitions/:id', isAuthenticated, async (req: any, res) => {
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

      // Ensure sideCompetitions is properly typed
      const sideCompetitions: string[] = Array.isArray(req.body.sideCompetitions) 
        ? req.body.sideCompetitions 
        : (req.body.sideCompetitions ? [req.body.sideCompetitions] : []);

      // Parse and validate the update data using the same schema as creation
      const { sideCompetitions: _, organizerId: __, selectedPlan, ...bodyData } = req.body;
      const updateData = insertCompetitionSchema.partial().parse({
        ...bodyData,
        sideCompetitions,
        planTier: selectedPlan, // Map selectedPlan to planTier for competitions table
      });
      
      const updatedCompetition = await storage.updateCompetition(req.params.id, updateData);
      res.json(updatedCompetition);
    } catch (error) {
      console.error("Error updating competition:", error);
      res.status(500).json({ message: "Failed to update competition" });
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
      
      // Broadcast real-time update
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
      res.status(201).json(sponsor);
    } catch (error) {
      console.error("Error creating sponsor:", error);
      res.status(500).json({ message: "Failed to create sponsor" });
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
        minWeight: req.body.minWeight ? parseFloat(req.body.minWeight) : 2,
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
        sideCompetitions: sideCompetitions as string[],
        sectorPlaces: sectorPlaces as Array<{ sectorName: string; places: string[] }>,
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

  // Serve uploaded files securely
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  return httpServer;
}
