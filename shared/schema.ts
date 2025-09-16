import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  text,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("public"), // "public", "organizer", "referee", "admin"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Competitions table
export const competitions = pgTable("competitions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  rules: text("rules"),
  location: varchar("location", { length: 255 }).notNull(),
  status: varchar("status").notNull().default("registration"), // "registration", "live", "finished"
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  firstPlacePrize: decimal("first_place_prize", { precision: 10, scale: 2 }),
  secondPlacePrize: decimal("second_place_prize", { precision: 10, scale: 2 }),
  thirdPlacePrize: decimal("third_place_prize", { precision: 10, scale: 2 }),
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }),
  maxTeams: integer("max_teams"),
  organizerId: varchar("organizer_id").notNull().references(() => users.id),
  imageUrl: varchar("image_url"),
  sectorPlaces: jsonb("sector_places").$type<Array<{ sectorName: string; places: string[] }>>(), // Array of {sectorName: string, places: string[]}
  sideCompetitions: jsonb("side_competitions").$type<string[]>().default([]), // Array of side competition names
  hasSectors: boolean("has_sectors").notNull().default(false), // Whether competition is divided into sectors
  scoringType: varchar("scoring_type").notNull().default("total"), // "total", "avg3", "avg5"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Competition registrations table (for public registration requests)
export const competitionRegistrations = pgTable("competition_registrations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  rules: text("rules"),
  location: varchar("location", { length: 255 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  firstPlacePrize: decimal("first_place_prize", { precision: 10, scale: 2 }),
  secondPlacePrize: decimal("second_place_prize", { precision: 10, scale: 2 }),
  thirdPlacePrize: decimal("third_place_prize", { precision: 10, scale: 2 }),
  registrationFee: decimal("registration_fee", { precision: 10, scale: 2 }),
  maxTeams: integer("max_teams"),
  sectorPlaces: jsonb("sector_places").$type<Array<{ sectorName: string; places: string[] }>>(),
  sideCompetitions: jsonb("side_competitions").$type<string[]>().default([]), // Array of side competition names
  hasSectors: boolean("has_sectors").notNull().default(false), // Whether competition is divided into sectors
  scoringType: varchar("scoring_type").notNull().default("total"), // "total", "avg3", "avg5"
  
  // Contact information
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  organizationName: varchar("organization_name", { length: 255 }),
  imageUrl: varchar("image_url"), // Competition logo/image
  
  // Registration status
  status: varchar("status").notNull().default("submitted"), // "submitted", "approved", "declined"
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  
  // Reference to created competition (set when approved)
  approvedCompetitionId: uuid("approved_competition_id").references(() => competitions.id),
});

// Teams table
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id),
  status: varchar("status").notNull().default("pending"), // "pending", "approved", "rejected"
  sector: varchar("sector"), // "A", "B", "C", etc. - kept for backward compatibility
  sectorName: varchar("sector_name"), // "Sektor A", "Sektor B", etc.
  placeName: varchar("place_name"), // "Place 1", "Place 2", etc.
  position: integer("position"),
  totalWeight: decimal("total_weight", { precision: 10, scale: 3 }).default("0"),
  fishCount: integer("fish_count").default(0),
  photoUrl: varchar("photo_url"), // Team logo/photo
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Team members table
export const teamMembers = pgTable("team_members", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email"),
  phone: varchar("phone"),
  role: varchar("role").default("member"), // "captain", "member"
  createdAt: timestamp("created_at").defaultNow(),
});

// Referees table
export const referees = pgTable("referees", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id),
  assignedSector: varchar("assigned_sector").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Catches table
export const catches = pgTable("catches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id),
  refereeId: uuid("referee_id").notNull().references(() => referees.id),
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // in kg
  fishType: varchar("fish_type").notNull(), // "scaly", "mirror"
  photoUrl: varchar("photo_url"),
  sector: varchar("sector").notNull(),
  isVerified: boolean("is_verified").default(false),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

// Sponsors table
export const sponsors = pgTable("sponsors", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url"),
  websiteUrl: varchar("website_url"),
  sponsorshipLevel: varchar("sponsorship_level"), // "gold", "silver", "bronze"
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  organizedCompetitions: many(competitions),
  refereeAssignments: many(referees),
}));

export const competitionsRelations = relations(competitions, ({ one, many }) => ({
  organizer: one(users, {
    fields: [competitions.organizerId],
    references: [users.id],
  }),
  teams: many(teams),
  referees: many(referees),
  catches: many(catches),
  sponsors: many(sponsors),
}));

export const competitionRegistrationsRelations = relations(competitionRegistrations, ({ one }) => ({
  approvedCompetition: one(competitions, {
    fields: [competitionRegistrations.approvedCompetitionId],
    references: [competitions.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  competition: one(competitions, {
    fields: [teams.competitionId],
    references: [competitions.id],
  }),
  members: many(teamMembers),
  catches: many(catches),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const refereesRelations = relations(referees, ({ one, many }) => ({
  user: one(users, {
    fields: [referees.userId],
    references: [users.id],
  }),
  competition: one(competitions, {
    fields: [referees.competitionId],
    references: [competitions.id],
  }),
  catches: many(catches),
}));

export const catchesRelations = relations(catches, ({ one }) => ({
  team: one(teams, {
    fields: [catches.teamId],
    references: [teams.id],
  }),
  competition: one(competitions, {
    fields: [catches.competitionId],
    references: [competitions.id],
  }),
  referee: one(referees, {
    fields: [catches.refereeId],
    references: [referees.id],
  }),
}));

export const sponsorsRelations = relations(sponsors, ({ one }) => ({
  competition: one(competitions, {
    fields: [sponsors.competitionId],
    references: [competitions.id],
  }),
}));

// Insert schemas
export const insertCompetitionSchema = createInsertSchema(competitions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
  rules: z.string().optional(),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })).optional(),
});

export const insertCompetitionRegistrationSchema = createInsertSchema(competitionRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  approvedCompetitionId: true,
}).extend({
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
  rules: z.string().optional(),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })).optional(),
});

export const insertTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalWeight: true,
  fishCount: true,
}).extend({
  sectorName: z.string().optional(),
  placeName: z.string().optional(),
}).refine((data) => {
  // If sectorName is provided, placeName must also be provided
  if (data.sectorName && !data.placeName) {
    return false;
  }
  if (data.placeName && !data.sectorName) {
    return false;
  }
  return true;
}, {
  message: "Ak je definovaný sektor, musí byť definované aj miesto"
});

export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({
  id: true,
  createdAt: true,
});

export const insertRefereeSchema = createInsertSchema(referees).omit({
  id: true,
  createdAt: true,
});

export const insertCatchSchema = createInsertSchema(catches).omit({
  id: true,
  submittedAt: true,
});

export const insertSponsorSchema = createInsertSchema(sponsors).omit({
  id: true,
  createdAt: true,
});

// Team status update schema
export const updateTeamStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"], {
    required_error: "Status je povinný",
    invalid_type_error: "Neplatný status"
  }),
  sector: z.string().optional(), // Legacy field for backward compatibility
  sectorName: z.string().optional(),
  placeName: z.string().optional(),
}).refine((data) => {
  // If sectorName is provided, placeName must also be provided
  if (data.sectorName && !data.placeName) {
    return false;
  }
  if (data.placeName && !data.sectorName) {
    return false;
  }
  return true;
}, {
  message: "Ak je definovaný sektor, musí byť definované aj miesto"
});

// Function to create validation schema with competition-specific sector places
export function createTeamStatusValidationSchema(competition: Competition) {
  return updateTeamStatusSchema.refine((data) => {
    // Skip validation if no sector assignment is being made
    if (!data.sectorName || !data.placeName) {
      return true;
    }

    // If competition has no sectorPlaces configuration, allow any assignment
    if (!competition.sectorPlaces || !Array.isArray(competition.sectorPlaces)) {
      return true;
    }

    // Find the sector in competition configuration
    const sector = competition.sectorPlaces.find(s => s.sectorName === data.sectorName);
    if (!sector) {
      return false;
    }

    // Check if the place exists in this sector
    return sector.places.includes(data.placeName);
  }, {
    message: "Zadaný sektor alebo miesto neexistuje v konfigurácii súťaže",
    path: ["sectorName"]
  });
}

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Competition = typeof competitions.$inferSelect;
export type InsertCompetition = typeof competitions.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Referee = typeof referees.$inferSelect;
export type InsertReferee = z.infer<typeof insertRefereeSchema>;
export type Catch = typeof catches.$inferSelect;
export type InsertCatch = z.infer<typeof insertCatchSchema>;
export type Sponsor = typeof sponsors.$inferSelect;
export type InsertSponsor = z.infer<typeof insertSponsorSchema>;
export type UpdateTeamStatus = z.infer<typeof updateTeamStatusSchema>;
export type CompetitionRegistration = typeof competitionRegistrations.$inferSelect;
export type InsertCompetitionRegistration = typeof competitionRegistrations.$inferInsert;
