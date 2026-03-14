import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

const ADMIN_USERS = [
  {
    id: 'd946e3b7-5693-4633-b40a-bb12796d73d9',
    email: 'drbaits.sk@gmail.com',
    firstName: 'Ľubomír',
    lastName: 'Šulek',
    role: 'admin' as const,
    isPremium: true,
    userTier: 'PREMIUM' as const,
    password: '$2b$10$lvchAmaZ.HBYGDx3Ty5plu2CC7OThgJTS/WNndeCTpx3akerNkB/m',
    nickname: 'Šuľo',
    preferences: {
      mainGoal: 'diary',
      fishingStyle: 'spinning',
      visualPreference: 'lists',
      onboardingCompleted: true,
      allowHistoricalCatches: false,
    },
    active: true,
    emailVerified: true,
    isNewsletterSubscribed: false,
  },
];

export async function seedAdminUsers() {
  console.log('[SEED] Checking admin users...');
  try {
    for (const adminUser of ADMIN_USERS) {
      const [existing] = await db.select({ id: users.id }).from(users).where(eq(users.email, adminUser.email));
      if (existing) {
        console.log(`[SEED] Admin user already exists: ${adminUser.email}`);
        continue;
      }
      await db.insert(users).values({
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role,
        isPremium: adminUser.isPremium,
        userTier: adminUser.userTier,
        password: adminUser.password,
        nickname: adminUser.nickname,
        preferences: adminUser.preferences,
        active: adminUser.active,
        emailVerified: adminUser.emailVerified,
        isNewsletterSubscribed: adminUser.isNewsletterSubscribed,
      });
      console.log(`[SEED] Admin user created: ${adminUser.email}`);
    }
  } catch (error) {
    console.error('[SEED] Error seeding admin users:', error);
  }
}
