import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import {
  insertCompetitionSchema,
  insertTeamSchema,
  insertTeamMemberSchema,
  insertRefereeSchema,
  insertCatchSchema,
  insertSponsorSchema,
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
      
      if (user?.role !== 'organizer') {
        return res.status(403).json({ message: "Only organizers can create competitions" });
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

      const { status, sector } = req.body;
      await storage.updateTeamStatus(req.params.id, status, sector);
      res.json({ message: "Team status updated" });
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
  }

  // Serve uploaded files securely
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  return httpServer;
}
