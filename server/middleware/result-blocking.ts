import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

// Extended request type to include user information (compatible with existing auth)
interface AuthenticatedRequest extends Request {
  user?: any; // Keep it flexible to match existing auth system
}

/**
 * Middleware to check if result blocking is active for a competition
 * Allows organizers, referees, and admins to bypass blocking
 * Returns 423 (Locked) status for blocked results
 */
export const checkResultBlocking = async (
  req: Request, 
  res: Response, 
  next: NextFunction
): Promise<void> => {
  try {
    const competitionId = req.params.id;
    
    if (!competitionId) {
      return next();
    }

    // Get user information if authenticated
    let user = null;
    if ((req as any).user?.claims?.sub) {
      user = await storage.getUser((req as any).user.claims.sub);
    }

    // Check if results are blocked for this competition
    const isBlocked = await storage.isResultBlocked(competitionId);
    
    if (!isBlocked) {
      return next();
    }

    // During blackout, only admin and the competition's organizer can see results
    // Referees are excluded to prevent info leaks
    if (user?.role === 'admin') {
      console.log(`[ResultBlocking] Bypassing block for admin: ${user.email}`);
      return next();
    }

    // Check if user is the organizer of this specific competition
    if (user?.role === 'organizer') {
      const competition = await storage.getCompetition(competitionId);
      if (competition && competition.organizerId === user.id) {
        console.log(`[ResultBlocking] Bypassing block for competition organizer: ${user.email}`);
        return next();
      }
    }

    // Results are blocked for everyone else (including referees)
    
    if (isBlocked) {
      const competition = await storage.getCompetition(competitionId);
      
      console.log(`[ResultBlocking] Access denied for competition: ${competition?.name}`);
      
      res.status(423).json({
        message: "Výsledky sú aktuálne skryté. Finálny výsledok sa dozviete pri oficiálnom vyhlásení.",
        blockEndTime: competition?.endDate,
        isBlocked: true,
        error: "RESULTS_BLOCKED"
      });
      return;
    }

    // Results are not blocked, continue
    next();
    
  } catch (error) {
    console.error('[ResultBlocking] Error checking result blocking:', error);
    // On error, allow access (fail open for better UX)
    next();
  }
};

/**
 * Middleware specifically for partial blocking (e.g., teams endpoint)
 * Allows viewing team names but hides scores/statistics
 */
export const checkPartialResultBlocking = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const competitionId = req.params.id;
    
    if (!competitionId) {
      return next();
    }

    // Get user information if authenticated
    let user = null;
    if ((req as any).user?.claims?.sub) {
      user = await storage.getUser((req as any).user.claims.sub);
    }

    // Check if results are blocked
    const isBlocked = await storage.isResultBlocked(competitionId);
    
    if (!isBlocked) {
      return next();
    }

    // During blackout, only admin and the competition's organizer can see full results
    // Referees are excluded to prevent info leaks
    if (user?.role === 'admin') {
      return next();
    }

    // Check if user is the organizer of this specific competition
    if (user?.role === 'organizer') {
      const competition = await storage.getCompetition(competitionId);
      if (competition && competition.organizerId === user.id) {
        return next();
      }
    }

    // Add flag to request to indicate partial blocking for everyone else
    (req as any).partialBlocking = true;
    console.log(`[ResultBlocking] Partial blocking active for competition: ${competitionId}`);

    next();
    
  } catch (error) {
    console.error('[ResultBlocking] Error checking partial result blocking:', error);
    next();
  }
};

/**
 * Middleware for partial blocking on team-based endpoints (e.g., /api/teams/:id)
 * Looks up competitionId from teamId to apply result blocking
 */
export const checkPartialResultBlockingByTeam = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teamId = req.params.id;
    
    if (!teamId) {
      return next();
    }

    // Get team to find the competition ID
    const team = await storage.getTeam(teamId);
    if (!team) {
      console.log(`[ResultBlocking] Team not found: ${teamId}`);
      return next();
    }

    const competitionId = team.competitionId;

    // Get user information if authenticated
    let user = null;
    if ((req as any).user?.claims?.sub) {
      user = await storage.getUser((req as any).user.claims.sub);
    }

    // Check if results are blocked for this competition
    const isBlocked = await storage.isResultBlocked(competitionId);
    
    if (!isBlocked) {
      return next();
    }

    // During blackout, only admin and the competition's organizer can see full results
    // Referees are excluded to prevent info leaks
    if (user?.role === 'admin') {
      console.log(`[ResultBlocking] Bypassing partial block for admin: ${user.email}`);
      return next();
    }

    // Check if user is the organizer of this specific competition
    if (user?.role === 'organizer') {
      const competition = await storage.getCompetition(competitionId);
      if (competition && competition.organizerId === user.id) {
        console.log(`[ResultBlocking] Bypassing partial block for competition organizer: ${user.email}`);
        return next();
      }
    }

    // Set partial blocking flag for everyone else (including referees)
    console.log(`[ResultBlocking] Partial blocking active for team ${teamId} in competition ${competitionId}`);
    (req as any).partialBlocking = true;

    // Continue to route handler
    next();
    
  } catch (error) {
    console.error('[ResultBlocking] Error checking partial result blocking by team:', error);
    // On error, allow access (fail open for better UX)
    next();
  }
};