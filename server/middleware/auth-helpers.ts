import { Response } from "express";
import { storage } from "../storage";
import type { User, Team, TeamMember, Competition } from "@shared/schema";

/**
 * Overí, že prihlásený user je organizer alebo admin danej competition.
 * Ak nie, pošle 403/404 a vráti null.
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
 *   – Primary: captain spravuje vlastný tím (cez teamMembers.userId)
 *   – Override: organizer môže zasiahnuť do tímu v rámci svojej súťaže (s povinným reason + audit log)
 */
export async function assertTeamCaptainOrOrganizer(
  userId: string,
  teamId: string,
  res: Response,
  user: User | null | undefined,
  options?: {
    auditAction?: string;
    auditReason?: string;
    targetMemberId?: string;
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

  const isAdminRole = user?.role === "admin";

  // Captain check: linked Contestio account (teamMembers.userId is optional)
  const captainMember = team.members?.find(
    (m) => m.userId === userId && m.role === "captain"
  ) ?? null;
  const isCaptain = !!captainMember;

  if (isAdminRole) {
    writeAuditLog({
      userId,
      targetTeamId: teamId,
      competitionId: team.competitionId,
      targetMemberId: options?.targetMemberId,
      action: options?.auditAction ?? "ADMIN_ACTION",
      reason: options?.auditReason ?? "Admin override",
      role: "admin",
    });
    return { team: team as Team & { members: TeamMember[] }, member: captainMember, accessType: "admin" };
  }

  if (isCaptain) {
    // Captain actions are not audited — self-management is expected and routine
    return { team: team as Team & { members: TeamMember[] }, member: captainMember, accessType: "captain" };
  }

  // Organizer override path
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

    // reason is mandatory for organizer override — min. 3 chars
    if (!options?.auditReason || options.auditReason.trim().length < 3) {
      res.status(400).json({
        message: "Pre adminský zásah do tímu je povinný dôvod (reason) — min. 3 znaky",
      });
      return null;
    }

    writeAuditLog({
      userId,
      targetTeamId: teamId,
      competitionId: team.competitionId,
      targetMemberId: options?.targetMemberId,
      action: options?.auditAction ?? "ORGANIZER_OVERRIDE",
      reason: options.auditReason,
      role: "organizer",
    });
    return { team: team as Team & { members: TeamMember[] }, member: null, accessType: "organizer" };
  }

  res.status(403).json({
    message: "Len kapitán tímu alebo organizátor súťaže môže vykonávať túto akciu",
  });
  return null;
}

// ─── Internal audit logger ────────────────────────────────────────────────────

interface AuditLogEntry {
  userId: string;
  targetTeamId: string;
  competitionId: string;
  targetMemberId?: string;
  action: string;
  reason: string;
  role: "captain" | "organizer" | "admin";
}

function writeAuditLog(entry: AuditLogEntry) {
  console.log(
    "[AUDIT]",
    JSON.stringify({
      userId: entry.userId,
      targetTeamId: entry.targetTeamId,
      competitionId: entry.competitionId,
      targetMemberId: entry.targetMemberId ?? undefined,
      action: entry.action,
      reason: entry.reason,
      role: entry.role,
      timestamp: new Date().toISOString(),
    })
  );
}
