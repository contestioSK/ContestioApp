import { sql } from 'drizzle-orm';
import {
  index,
  uniqueIndex,
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
  active: boolean("active").default(true).notNull(),
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
  minWeight: decimal("min_weight", { precision: 10, scale: 2 }).notNull().default("2.00"), // minimum weight for scoring in kg
  
  // Plan-related fields  
  planTier: varchar("plan_tier").notNull().default("basic"), // "basic", "pro", "premium", "enterprise"
  maxReferees: integer("max_referees"), // 2 for basic, 5 for pro, null for unlimited (premium/enterprise)
  branding: jsonb("branding").$type<{primaryColor?: string; secondaryColor?: string; subdomain?: string}>(),
  mediaAccess: boolean("media_access").notNull().default(false), // Premium/Enterprise feature
  prioritySupport: boolean("priority_support").notNull().default(false), // Premium/Enterprise feature
  
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
  minWeight: decimal("min_weight", { precision: 10, scale: 2 }).notNull().default("2.00"), // minimum weight for scoring in kg
  
  // Contact information
  contactName: varchar("contact_name", { length: 255 }).notNull(),
  contactEmail: varchar("contact_email", { length: 255 }).notNull(),
  contactPhone: varchar("contact_phone", { length: 50 }),
  organizationName: varchar("organization_name", { length: 255 }),
  imageUrl: varchar("image_url"), // Competition logo/image
  
  // Registration status
  status: varchar("status").notNull().default("submitted"), // "submitted", "approved", "declined"
  
  // Plan-related fields
  selectedPlan: varchar("selected_plan").notNull().default("basic"), // "basic", "pro", "premium", "enterprise"
  paymentStatus: varchar("payment_status").notNull().default("unpaid"), // "unpaid", "paid", "waived"
  checkoutSessionId: varchar("checkout_session_id"), // For Stripe integration later
  requestedSubdomain: varchar("requested_subdomain"), // For premium/enterprise branding
  branding: jsonb("branding").$type<{primaryColor?: string; secondaryColor?: string; logoUrl?: string}>(),
  
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
  country: varchar("country", { length: 2 }).default("SK"), // ISO country code (SK, CZ, HU, etc.)
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
  sponsorshipLevel: varchar("sponsorship_level").notNull(), // "main", "regular", "media"
  createdAt: timestamp("created_at").defaultNow(),
});

// User favorite competitions table
export const favoriteCompetitions = pgTable("favorite_competitions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  competitionId: uuid("competition_id").notNull().references(() => competitions.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate favorites
  uniqueUserCompetition: uniqueIndex("unique_user_competition").on(table.userId, table.competitionId),
}));

// User favorite teams table
export const favoriteTeams = pgTable("favorite_teams", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  teamId: uuid("team_id").notNull().references(() => teams.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate favorites
  uniqueUserTeam: uniqueIndex("unique_user_team").on(table.userId, table.teamId),
}));

// User notification preferences table
export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  allCatches: boolean("all_catches").default(true), // Všetky nové úlovky
  favoriteCompetitions: boolean("favorite_competitions").default(true), // Len obľúbené súťaže
  favoriteTeams: boolean("favorite_teams").default(true), // Len obľúbené tímy
  biggestFish: boolean("biggest_fish").default(true), // Najväčšie ryby (top 3)
  officialAnnouncements: boolean("official_announcements").default(true), // Oficiálne oznamy
  leaderboardChanges: boolean("leaderboard_changes").default(false), // Zmeny v rebríčku
  pushNotifications: boolean("push_notifications").default(false), // Push notifikácie
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to enforce 1:1 user:preferences relationship
  uniqueUserId: uniqueIndex("unique_notification_user_id").on(table.userId),
}));

// Push subscriptions table for Web Push API
export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dhKey: text("p256dh_key").notNull(),
  authKey: text("auth_key").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to prevent duplicate subscriptions per user
  uniqueUserSubscription: uniqueIndex("unique_user_push_subscription").on(table.userId),
}));

// Official announcements table
export const announcements = pgTable("announcements", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  
  // Author (organizer/admin who created the announcement)
  authorId: varchar("author_id").notNull().references(() => users.id),
  
  // Competition reference (optional - null for global announcements)
  competitionId: uuid("competition_id").references(() => competitions.id),
  
  // Target audience
  targetAudience: varchar("target_audience").notNull().default("all"), // "all", "registered_teams", "spectators"
  
  // Publishing control
  publishAt: timestamp("publish_at").defaultNow(), // When to publish (for scheduling)
  published: boolean("published").default(true).notNull(), // Published status
  priority: varchar("priority").default("normal").notNull(), // "low", "normal", "high", "urgent"
  
  // File attachments
  imageUrl: varchar("image_url"), // Optional image/banner
  attachmentUrl: varchar("attachment_url"), // Optional file attachment
  attachmentName: varchar("attachment_name"), // Original file name for display
  
  // Notification tracking
  notifiedAt: timestamp("notified_at"), // When notifications were sent (for scheduled announcements)
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for efficient queries
  index("announcements_competition_idx").on(table.competitionId),
  index("announcements_published_idx").on(table.published, table.publishAt),
]);

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  organizedCompetitions: many(competitions),
  refereeAssignments: many(referees),
  favoriteCompetitions: many(favoriteCompetitions),
  favoriteTeams: many(favoriteTeams),
  notificationPreferences: one(notificationPreferences),
  announcements: many(announcements),
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
  announcements: many(announcements),
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
  favoriteByUsers: many(favoriteTeams),
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

export const favoriteCompetitionsRelations = relations(favoriteCompetitions, ({ one }) => ({
  user: one(users, {
    fields: [favoriteCompetitions.userId],
    references: [users.id],
  }),
  competition: one(competitions, {
    fields: [favoriteCompetitions.competitionId],
    references: [competitions.id],
  }),
}));

export const favoriteTeamsRelations = relations(favoriteTeams, ({ one }) => ({
  user: one(users, {
    fields: [favoriteTeams.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [favoriteTeams.teamId],
    references: [teams.id],
  }),
}));

export const notificationPreferencesRelations = relations(notificationPreferences, ({ one }) => ({
  user: one(users, {
    fields: [notificationPreferences.userId],
    references: [users.id],
  }),
}));

export const announcementsRelations = relations(announcements, ({ one }) => ({
  author: one(users, {
    fields: [announcements.authorId],
    references: [users.id],
  }),
  competition: one(competitions, {
    fields: [announcements.competitionId],
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
  sideCompetitions: z.array(z.string()).nullable().optional().default(null),
  branding: z.object({
    primaryColor: z.string().optional(),
    secondaryColor: z.string().optional(),
    subdomain: z.string().optional(),
  }).nullable().optional(),
  minWeight: z.string().or(z.number().transform(val => val.toString())).default("2.00"),
});

export const insertCompetitionRegistrationSchema = createInsertSchema(competitionRegistrations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  status: true,
  approvedCompetitionId: true,
  paymentStatus: true,
  checkoutSessionId: true,
}).extend({
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
  rules: z.string().optional(),
  sectorPlaces: z.array(z.object({
    sectorName: z.string().min(1, "Názov sektoru je povinný"),
    places: z.array(z.string().min(1, "Názov miesta je povinný")).min(1, "Sektor musí mať aspoň jedno miesto")
  })).optional(),
  sideCompetitions: z.array(z.string()).nullable().optional().default(null),
  minWeight: z.string().or(z.number().transform(val => val.toString())).default("2.00"),
  selectedPlan: z.enum(["basic", "pro", "premium", "enterprise"]).default("basic"),
  requestedSubdomain: z.string().min(3, "Subdoména musí mať aspoň 3 znaky").max(20, "Subdoména môže mať maximálne 20 znakov").regex(/^[a-z0-9-]+$/, "Subdoména môže obsahovať len malé písmená, čísla a pomlčky").optional(),
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Neplatná farba").optional(),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Neplatná farba").optional(),
    logoUrl: z.string().url("Neplatná URL").optional(),
  }).optional(),
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
  country: z.string().length(2, "Kód krajiny musí mať presne 2 znaky").default("SK"),
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

export const updateTeamSchema = createInsertSchema(teams).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  totalWeight: true,
  fishCount: true,
  competitionId: true, // Cannot change competition
}).extend({
  name: z.string().optional(),
  status: z.string().optional(),
  sectorName: z.string().optional(),
  placeName: z.string().optional(),
  country: z.string().length(2, "Kód krajiny musí mať presne 2 znaky").optional(),
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
  message: "Ak je definovaný sektor, musí byť definované aj miesto",
  path: ["sectorName"]
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

// Function to create catch validation schema with competition-specific minimum weight
export function createCatchValidationSchema(competition: Competition) {
  const minWeight = competition.minWeight ? parseFloat(competition.minWeight) : 2;
  
  return insertCatchSchema.extend({
    weight: z.string().transform((val) => {
      const weight = parseFloat(val);
      if (isNaN(weight)) {
        throw new Error("Neplatná váha");
      }
      if (weight < minWeight) {
        throw new Error(`Váha musí byť najmenej ${minWeight} kg`);
      }
      return weight.toString();
    }),
  });
}

export const sponsorLevels = ['main', 'regular', 'media'] as const;
export type SponsorLevel = (typeof sponsorLevels)[number];

export const insertSponsorSchema = createInsertSchema(sponsors).omit({
  id: true,
  createdAt: true,
}).extend({
  sponsorshipLevel: z.enum(['main', 'regular', 'media'], {
    required_error: "Typ sponzorstva je povinný",
    invalid_type_error: "Neplatný typ sponzorstva"
  })
});

// User favorites schemas
export const insertFavoriteCompetitionSchema = createInsertSchema(favoriteCompetitions).omit({
  id: true,
  createdAt: true,
});

export const insertFavoriteTeamSchema = createInsertSchema(favoriteTeams).omit({
  id: true,
  createdAt: true,
});

export const insertNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateNotificationPreferencesSchema = createInsertSchema(notificationPreferences).omit({
  id: true,
  userId: true, // Cannot change user
  createdAt: true,
  updatedAt: true,
});

// Announcements schemas
export const insertAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Nadpis je povinný").max(255, "Nadpis môže mať maximálne 255 znakov"),
  content: z.string().min(1, "Obsah je povinný").max(5000, "Obsah môže mať maximálne 5000 znakov"),
  targetAudience: z.enum(["all", "registered_teams", "spectators"], {
    required_error: "Cieľová skupina je povinná",
    invalid_type_error: "Neplatná cieľová skupina"
  }).default("all"),
  priority: z.enum(["low", "normal", "high", "urgent"], {
    required_error: "Priorita je povinná",
    invalid_type_error: "Neplatná priorita"
  }).default("normal"),
  publishAt: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  published: z.boolean().default(true),
});

export const updateAnnouncementSchema = createInsertSchema(announcements).omit({
  id: true,
  authorId: true, // Cannot change author
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Nadpis je povinný").max(255, "Nadpis môže mať maximálne 255 znakov").optional(),
  content: z.string().min(1, "Obsah je povinný").max(5000, "Obsah môže mať maximálne 5000 znakov").optional(),
  targetAudience: z.enum(["all", "registered_teams", "spectators"]).optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  publishAt: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  published: z.boolean().optional(),
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
export type UpdateTeam = z.infer<typeof updateTeamSchema>;
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

// User preferences types
export type FavoriteCompetition = typeof favoriteCompetitions.$inferSelect;
export type InsertFavoriteCompetition = z.infer<typeof insertFavoriteCompetitionSchema>;
export type FavoriteTeam = typeof favoriteTeams.$inferSelect;
export type InsertFavoriteTeam = z.infer<typeof insertFavoriteTeamSchema>;
export type NotificationPreferences = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreferences = z.infer<typeof insertNotificationPreferencesSchema>;
export type UpdateNotificationPreferences = z.infer<typeof updateNotificationPreferencesSchema>;

// Push subscription types
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type InsertPushSubscription = typeof pushSubscriptions.$inferInsert;

// Announcement types
export type Announcement = typeof announcements.$inferSelect;
export type InsertAnnouncement = z.infer<typeof insertAnnouncementSchema>;
export type UpdateAnnouncement = z.infer<typeof updateAnnouncementSchema>;
