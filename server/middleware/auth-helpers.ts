import { Response } from "express";
import { storage } from "../storage";
import type { User, Team, TeamMember, Competition } from "@shared/schema";

/**
 * Overí, že prihlásený user je organizer alebo admin danej competition.
 * Ak nie, pošle 403/404 a vráti null.
 *
 * Použitie:
 *   const competition = await assertCompetitionOrganizer(userId, competitionId, res, user);
 *   if (!competition) return;
 */
export async function assertCompetitionOrganizer(
  userId: string,
  competitionId: string,
  res: Response,
  user: User | null | undefined
): Promise<Competition | null> {
  const competition = await storage.getCompetition(competitionId);
  if (!competition) {
    res.status(404).json({ message: "Súťaž nebola nájdená" });
    return null;
  }

  const isAdmin = user?.role === "admin";
  const isOwner = competition.organizerId === userId;

  if (!isAdmin && !isOwner) {
    res.status(403).json({ message: "Nemáš oprávnenie spravovať túto súťaž" });
    return null;
  }

  return competition;
}

/**
 * Dual-layer autorizácia pre správu tímu:
 *   – Primary authority: Captain spravuje vlastný tím
 *   – Administrative override: Organizer môže zasiahnuť do tímu v rámci svojej súťaže
 *
 * Pri organizer override je povinný `auditReason` a každá akcia je zapísaná do audit logu.
 * Vráti { team, member, accessType } alebo null (s 403/404 odpoveďou).
 *
 * Použitie:
 *   const auth = await assertTeamCaptainOrOrganizer(userId, teamId, res, user, {
 *     auditAction: 'REMOVE_MEMBER',
 *     auditReason: req.body.reason,
 *   });
 *   if (!auth) return;
 */
export async function assertTeamCaptainOrOrganizer(
  userId: string,
  teamId: string,
  res: Response,
  user: User | null | undefined,
  options?: {
    auditAction?: string;
    auditReason?: string;
  }
): Promise<{
  team: Team & { members: TeamMember[] };
  member: TeamMember | null;
  accessType: "captain" | "organizer" | "admin";
} | null> {
  const team = await storage.getTeam(teamId);
  if (!team) {
    res.status(404).json({ message: "Tím nebol nájdený" });
    return null;
  }

  const isAdmin = user?.role === "admin";

  // Check if user is captain of this team (via linked userId)
  const captainMember = team.members?.find(
    (m) => m.userId === userId && m.role === "captain"
  ) ?? null;
  const isCaptain = !!captainMember;

  if (isAdmin) {
    writeAuditLog(userId, teamId, options?.auditAction ?? "ADMIN_ACTION", options?.auditReason ?? "Admin override", "admin");
    return { team: team as Team & { members: TeamMember[] }, member: captainMember, accessType: "admin" };
  }

  if (isCaptain) {
    return { team: team as Team & { members: TeamMember[] }, member: captainMember, accessType: "captain" };
  }

  // Check organizer override
  if (user?.role === "organizer") {
    const competition = await storage.getCompetition(team.competitionId);
    if (!competition) {
      res.status(404).json({ message: "Súťaž nebola nájdená" });
      return null;
    }

    if (competition.organizerId !== userId) {
      res.status(403).json({ message: "Môžeš spravovať len tímy vo vlastných súťažiach" });
      return null;
    }

    // Organizer override — reason is mandatory
    if (!options?.auditReason || options.auditReason.trim().length < 3) {
      res.status(400).json({
        message: "Pre adminský zásah do tímu je povinný dôvod (reason) — min. 3 znaky",
      });
      return null;
    }

    writeAuditLog(userId, teamId, options?.auditAction ?? "ORGANIZER_OVERRIDE", options.auditReason, "organizer");
    return { team: team as Team & { members: TeamMember[] }, member: null, accessType: "organizer" };
  }

  res.status(403).json({
    message: "Len kapitán tímu alebo organizátor súťaže môže vykonávať túto akciu",
  });
  return null;
}

// ─── Internal audit logger ────────────────────────────────────────────────────

function writeAuditLog(
  userId: string,
  targetTeamId: string,
  action: string,
  reason: string,
  role: "captain" | "organizer" | "admin"
) {
  console.log(
    "[AUDIT]",
    JSON.stringify({
      userId,
      targetTeamId,
      action,
      reason,
      role,
      timestamp: new Date().toISOString(),
    })
  );
}
