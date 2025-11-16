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

// User storage table - supports both classic email/password and OAuth auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  nickname: varchar("nickname"),
  profileImageUrl: varchar("profile_image_url"),
  role: varchar("role").notNull().default("public"), // "public", "organizer", "referee", "admin"
  active: boolean("active").default(true).notNull(),
  isPremium: boolean("isPremium").default(false).notNull(),
  premiumExpiresAt: timestamp("premium_expires_at"), // When premium expires (null = no expiry or not premium)
  // Classic authentication fields
  password: varchar("password"), // hashed password (null for OAuth users)
  emailVerified: boolean("email_verified").default(false).notNull(),
  // OAuth fields
  googleId: varchar("google_id").unique(), // Google OAuth ID
  // Email verification fields
  verificationToken: varchar("verification_token"),
  verificationTokenExpires: timestamp("verification_token_expires"),
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
  
  // Result blocking fields
  resultBlocking: varchar("result_blocking").notNull().default("none"), // "none", "12h", "24h"
  resultBlockStartTime: timestamp("result_block_start_time"), // Automatically calculated when competition is created/updated
  resultBlockActive: boolean("result_block_active").notNull().default(false), // Cache for performance - whether blocking is currently active
  
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

// User subscriptions for diary premium features
export const userSubscriptions = pgTable("user_subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  product: varchar("product").notNull().default("diary_premium"), // "diary_premium"
  status: varchar("status").notNull().default("none"), // "none", "active", "canceled"
  checkoutSessionId: varchar("checkout_session_id"), // Stripe session ID
  currentPeriodEnd: timestamp("current_period_end"), // When current subscription ends
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => ({
  // Unique constraint to enforce 1:1 user:subscription relationship per product
  uniqueUserProduct: uniqueIndex("unique_user_subscription_product").on(table.userId, table.product),
}));

// Diary trips table
export const diaryTrips = pgTable("diary_trips", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  ownerUserId: varchar("owner_user_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  location: text("location").notNull(),
  notes: text("notes"),
  participants: jsonb("participants").$type<Array<{ userId?: string; name: string }>>().default([]), // Array of participants
  visibility: varchar("visibility").notNull().default("private"), // "private", "shared"
  coverImageUrl: text("cover_image_url"), // Cover photo for the trip
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Diary catches table (separate from competition catches)
export const diaryCatches = pgTable("diary_catches", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: uuid("trip_id").references(() => diaryTrips.id),
  battleId: varchar("battle_id").references(() => diaryBattles.id), // Optional battle reference
  angler: jsonb("angler").$type<{ userId?: string; name: string }>().notNull(), // Who caught the fish
  capturedAt: timestamp("captured_at").notNull(),
  weight: decimal("weight", { precision: 10, scale: 3 }).notNull(), // in kg
  lengthCm: integer("length_cm"), // optional length in cm
  fishType: varchar("fish_type").notNull(), // Fish species
  bait: text("bait"), // what bait was used
  spot: text("spot"), // fishing spot description
  latitude: decimal("latitude", { precision: 10, scale: 8 }), // GPS coordinates
  longitude: decimal("longitude", { precision: 11, scale: 8 }), // GPS coordinates
  photos: jsonb("photos").$type<Array<{
    id: string;
    url: string;
    status: 'processing' | 'ready' | 'failed';
    originalUrl?: string;
    variants?: Array<{width: number; format: string; url: string;}>;
    placeholder?: string;
    error?: string;
  }>>().default([]), // Array of photo objects with processing status
  notes: text("notes"),
  verified: boolean("verified").default(false).notNull(), // For battle verification
  // Weather data (optional)
  waterTemp: decimal("water_temp", { precision: 5, scale: 2 }), // Water temperature in °C
  airTemp: decimal("air_temp", { precision: 5, scale: 2 }), // Air temperature in °C (from API)
  windSpeed: decimal("wind_speed", { precision: 6, scale: 2 }), // Wind speed in km/h (from API)
  airPressure: decimal("air_pressure", { precision: 7, scale: 2 }), // Air pressure in mb/hPa (from API)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Diary battles table (fishing competitions between friends)
export const diaryBattles = pgTable("diary_battles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tripId: varchar("trip_id").notNull().references(() => diaryTrips.id),
  name: varchar("name", { length: 255 }).notNull(),
  rules: jsonb("rules").$type<{
    mode: "most_fish" | "total_weight" | "biggest_fish" | "best_3_fish" | "best_5_fish";
    minWeightKg?: number;
    includeOnlyVerified?: boolean;
  }>().notNull(),
  participants: jsonb("participants").$type<Array<{ userId?: string; name: string }>>().notNull(),
  startAt: timestamp("start_at").notNull(),
  endAt: timestamp("end_at").notNull(),
  status: varchar("status").notNull().default("active"), // "active", "finished", "canceled"
  results: jsonb("results").$type<Array<{
    participant: { userId?: string; name: string };
    score: number;
    position: number;
  }>>(), // Cached results for performance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Battle invitations table (for inviting users to battles)
export const battleInvitations = pgTable("battle_invitations", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  battleId: varchar("battle_id").notNull().references(() => diaryBattles.id),
  invitedUserId: varchar("invited_user_id").notNull().references(() => users.id),
  invitedByUserId: varchar("invited_by_user_id").notNull().references(() => users.id),
  status: varchar("status").notNull().default("pending"), // "pending", "accepted", "rejected"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Unique constraint to prevent duplicate invitations
  uniqueIndex("unique_battle_invitation").on(table.battleId, table.invitedUserId),
  // Index for efficient queries
  index("battle_invitations_invited_user_idx").on(table.invitedUserId, table.status),
]);

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
  diaryTrips: many(diaryTrips),
  subscriptions: many(userSubscriptions),
  seasonGoals: many(seasonGoals), // Add seasonal goals relation
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

// Diary relations
export const userSubscriptionsRelations = relations(userSubscriptions, ({ one }) => ({
  user: one(users, {
    fields: [userSubscriptions.userId],
    references: [users.id],
  }),
}));

export const diaryTripsRelations = relations(diaryTrips, ({ one, many }) => ({
  owner: one(users, {
    fields: [diaryTrips.ownerUserId],
    references: [users.id],
  }),
  catches: many(diaryCatches),
  battles: many(diaryBattles),
}));

export const diaryCatchesRelations = relations(diaryCatches, ({ one }) => ({
  trip: one(diaryTrips, {
    fields: [diaryCatches.tripId],
    references: [diaryTrips.id],
  }),
}));

export const diaryBattlesRelations = relations(diaryBattles, ({ one, many }) => ({
  trip: one(diaryTrips, {
    fields: [diaryBattles.tripId],
    references: [diaryTrips.id],
  }),
  invitations: many(battleInvitations),
}));

export const battleInvitationsRelations = relations(battleInvitations, ({ one }) => ({
  battle: one(diaryBattles, {
    fields: [battleInvitations.battleId],
    references: [diaryBattles.id],
  }),
  invitedUser: one(users, {
    fields: [battleInvitations.invitedUserId],
    references: [users.id],
  }),
  invitedByUser: one(users, {
    fields: [battleInvitations.invitedByUserId],
    references: [users.id],
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

// Diary insert schemas
export const insertUserSubscriptionSchema = createInsertSchema(userSubscriptions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  product: z.literal("diary_premium"),
  status: z.enum(["none", "active", "canceled"]).default("none"),
  currentPeriodEnd: z.string().or(z.date()).transform((val) => new Date(val)).optional(),
  checkoutSessionId: z.string().optional(),
});

export const insertDiaryTripSchema = createInsertSchema(diaryTrips).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
  name: z.string().min(1, "Názov výpravy je povinný").max(255, "Názov môže mať maximálne 255 znakov"),
  location: z.string().min(1, "Lokalita je povinná"),
  notes: z.string().optional(),
  participants: z.array(z.object({
    userId: z.string().optional(),
    name: z.string().min(1, "Meno účastníka je povinné")
  })).optional(),
  visibility: z.enum(["private", "shared"]).default("private"),
}).refine((data) => {
  return data.endDate >= data.startDate;
}, {
  message: "Dátum ukončenia musí byť po dátume začiatku",
  path: ["endDate"]
});

export const insertDiaryCatchSchema = createInsertSchema(diaryCatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  capturedAt: z.string().or(z.date()).transform((val) => new Date(val)),
  weight: z.string().or(z.number()).transform((val) => {
    const weight = typeof val === 'string' ? parseFloat(val) : val;
    if (isNaN(weight) || weight < 0) {
      throw new Error("Neplatná váha");
    }
    return weight.toString();
  }),
  lengthCm: z.number().positive("Dĺžka musí byť kladné číslo").optional(),
  fishType: z.enum([
    "kapor_supinac", 
    "kapor_lysec", 
    "amur", 
    "sumec", 
    "zubac", 
    "stuka", 
    "pleskac", 
    "podustva", 
    "mrena", 
    "pstruh", 
    "jalec"
  ], {
    required_error: "Typ ryby je povinný"
  }),
  angler: z.object({
    userId: z.string().optional(),
    name: z.string().min(1, "Meno rybára je povinné")
  }),
  bait: z.string().optional(),
  spot: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional(), // GPS coordinate validation
  longitude: z.number().min(-180).max(180).optional(), // GPS coordinate validation
  notes: z.string().optional(),
  photos: z.array(z.object({
    id: z.string(),
    url: z.string().url("Neplatná URL fotky"),
    status: z.enum(['processing', 'ready', 'failed']),
    originalUrl: z.string().url().optional(),
    variants: z.array(z.object({
      width: z.number(),
      format: z.string(),
      url: z.string().url()
    })).optional(),
    placeholder: z.string().optional(),
    error: z.string().optional()
  })).optional(),
  verified: z.boolean().default(false),
  // Weather data (optional)
  waterTemp: z.number().min(-50).max(50).optional(), // Water temperature in °C (-50 to 50)
  airTemp: z.number().min(-50).max(50).optional(), // Air temperature in °C (-50 to 50)
  windSpeed: z.number().min(0).max(500).optional(), // Wind speed in km/h (0 to 500)
  airPressure: z.number().min(800).max(1200).optional(), // Air pressure in mb/hPa (800 to 1200)
});

export const insertDiaryBattleSchema = createInsertSchema(diaryBattles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  results: true, // Results are calculated, not inserted
}).extend({
  startAt: z.string().or(z.date()).transform((val) => new Date(val)),
  endAt: z.string().or(z.date()).transform((val) => new Date(val)),
  name: z.string().min(1, "Názov battle je povinný").max(255, "Názov môže mať maximálne 255 znakov"),
  rules: z.object({
    mode: z.enum(["most_fish", "total_weight", "biggest_fish", "best_3_fish", "best_5_fish"], {
      required_error: "Typ battle je povinný"
    }),
    minWeightKg: z.number().positive("Minimálna váha musí byť kladné číslo").optional(),
    includeOnlyVerified: z.boolean().default(false).optional()
  }),
  participants: z.array(z.object({
    userId: z.string().optional(),
    name: z.string().min(1, "Meno účastníka je povinné")
  })).optional().default([]),
  status: z.enum(["active", "finished", "canceled"]).default("active"),
}).refine((data) => {
  return data.endAt >= data.startAt;
}, {
  message: "Čas ukončenia musí byť po čase začiatku",
  path: ["endAt"]
});

// Battle invitation insert schema
export const insertBattleInvitationSchema = createInsertSchema(battleInvitations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
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

// Seasonal Goals tables

// Seasons table - defines fishing seasons (January 15 - January 14)
export const seasons = pgTable("seasons", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(), // "2024/2025", "2025/2026"
  startDate: timestamp("start_date").notNull(), // January 15, 2024
  endDate: timestamp("end_date").notNull(), // January 14, 2025
  isActive: boolean("is_active").notNull().default(false), // Only one season can be active
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure only one active season at a time
  uniqueIndex("unique_active_season").on(table.isActive).where(sql`${table.isActive} = true`),
  // Prevent duplicate seasons for the same date range (race condition protection)
  uniqueIndex("unique_season_dates").on(table.startDate, table.endDate),
]);

// Season goals table - user goals for specific seasons
export const seasonGoals = pgTable("season_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  seasonId: varchar("season_id").notNull().references(() => seasons.id),
  goalType: varchar("goal_type").notNull(), // "total_weight", "fish_count", "trips_count", "biggest_fish", "personal_best"
  targetValue: decimal("target_value", { precision: 10, scale: 3 }).notNull(), // Target value (weight in kg, count as number)
  currentValue: decimal("current_value", { precision: 10, scale: 3 }).notNull().default("0"), // Current progress
  title: varchar("title", { length: 255 }).notNull(), // Custom goal title
  description: text("description"), // Optional description
  isCompleted: boolean("is_completed").notNull().default(false), // Whether goal is completed
  completedAt: timestamp("completed_at"), // When goal was completed
  isMainGoal: boolean("is_main_goal").notNull().default(false), // Main goal shown prominently
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Ensure only one main goal per user per season (partial unique index)
  uniqueIndex("unique_user_season_main_goal").on(table.userId, table.seasonId).where(sql`${table.isMainGoal} = true`),
]);

// Season goal progress table - tracking detailed progress 
export const seasonGoalProgress = pgTable("season_goal_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  goalId: varchar("goal_id").notNull().references(() => seasonGoals.id),
  contributionType: varchar("contribution_type").notNull(), // "catch", "trip", "species"
  contributionId: varchar("contribution_id"), // ID of diary_catch or diary_trip that contributed
  value: decimal("value", { precision: 10, scale: 3 }).notNull(), // Contribution value
  contributedAt: timestamp("contributed_at").notNull(), // When contribution was made
  details: jsonb("details").$type<{
    catchWeight?: number;
    fishSpecies?: string;
    tripLocation?: string;
    notes?: string;
  }>(), // Additional details about the contribution
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  // Index for efficient progress queries
  index("season_goal_progress_goal_idx").on(table.goalId),
  index("season_goal_progress_date_idx").on(table.contributedAt),
]);

// Seasonal Goals Relations
export const seasonsRelations = relations(seasons, ({ many }) => ({
  goals: many(seasonGoals),
}));

export const seasonGoalsRelations = relations(seasonGoals, ({ one, many }) => ({
  user: one(users, {
    fields: [seasonGoals.userId],
    references: [users.id],
  }),
  season: one(seasons, {
    fields: [seasonGoals.seasonId],
    references: [seasons.id],
  }),
  progress: many(seasonGoalProgress),
}));

export const seasonGoalProgressRelations = relations(seasonGoalProgress, ({ one }) => ({
  goal: one(seasonGoals, {
    fields: [seasonGoalProgress.goalId],
    references: [seasonGoals.id],
  }),
}));


// Season Goals Insert Schemas
export const insertSeasonSchema = createInsertSchema(seasons).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.string().or(z.date()).transform((val) => new Date(val)),
  endDate: z.string().or(z.date()).transform((val) => new Date(val)),
});

export const insertSeasonGoalSchema = createInsertSchema(seasonGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  currentValue: true,
  isCompleted: true,
  completedAt: true,
}).extend({
  goalType: z.enum(["total_weight", "fish_count", "trips_count", "biggest_fish", "personal_best"]),
  targetValue: z.union([z.string(), z.number()]).transform(val => String(val)),
  title: z.string().min(1, "Názov cieľa je povinný").max(255, "Názov môže mať maximálne 255 znakov"),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
}).refine((data) => {
  const targetValue = parseFloat(data.targetValue);
  return targetValue > 0;
}, {
  message: "Cieľová hodnota musí byť väčšia ako 0",
  path: ["targetValue"]
});

// Safe update schema for seasonal goals - omits protected fields like userId, seasonId
export const updateSeasonGoalSchema = createInsertSchema(seasonGoals).omit({
  id: true,
  userId: true, // SECURITY: Prevent changing goal ownership
  seasonId: true, // SECURITY: Prevent moving goals between seasons
  createdAt: true,
  updatedAt: true,
  currentValue: true, // Computed field, not user-editable
  isCompleted: true, // Computed field, not user-editable
  completedAt: true, // Computed field, not user-editable
}).extend({
  goalType: z.enum(["total_weight", "fish_count", "trips_count", "biggest_fish", "personal_best"]).optional(),
  targetValue: z.union([z.string(), z.number()]).transform(val => String(val)).optional(),
  title: z.string().min(1, "Názov cieľa je povinný").max(255, "Názov môže mať maximálne 255 znakov").optional(),
  description: z.string().max(500, "Popis môže mať maximálne 500 znakov").optional(),
  isMainGoal: z.boolean().optional(),
}).refine((data) => {
  if (data.targetValue !== undefined) {
    const targetValue = parseFloat(data.targetValue);
    return targetValue > 0;
  }
  return true;
}, {
  message: "Cieľová hodnota musí byť väčšia ako 0",
  path: ["targetValue"]
});

export const insertSeasonGoalProgressSchema = createInsertSchema(seasonGoalProgress).omit({
  id: true,
  createdAt: true,
}).extend({
  contributedAt: z.string().or(z.date()).transform((val) => new Date(val)),
  value: z.string().or(z.number()).transform(val => typeof val === 'string' ? val : val.toString()),
});

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

// Diary types
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type InsertUserSubscription = z.infer<typeof insertUserSubscriptionSchema>;
export type DiaryTrip = typeof diaryTrips.$inferSelect;
export type InsertDiaryTrip = z.infer<typeof insertDiaryTripSchema>;
export type DiaryCatch = typeof diaryCatches.$inferSelect;
export type InsertDiaryCatch = z.infer<typeof insertDiaryCatchSchema>;
export type DiaryBattle = typeof diaryBattles.$inferSelect;
export type InsertDiaryBattle = z.infer<typeof insertDiaryBattleSchema>;
export type BattleInvitation = typeof battleInvitations.$inferSelect;
export type InsertBattleInvitation = z.infer<typeof insertBattleInvitationSchema>;

// Seasonal Goals types
export type Season = typeof seasons.$inferSelect;
export type InsertSeason = z.infer<typeof insertSeasonSchema>;
export type SeasonGoal = typeof seasonGoals.$inferSelect;
export type InsertSeasonGoal = z.infer<typeof insertSeasonGoalSchema>;
export type SeasonGoalProgress = typeof seasonGoalProgress.$inferSelect;
export type InsertSeasonGoalProgress = z.infer<typeof insertSeasonGoalProgressSchema>;
