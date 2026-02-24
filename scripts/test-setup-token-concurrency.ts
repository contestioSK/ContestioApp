/**
 * Concurrency test: verifies that validateAndConsumeSetupToken is atomic.
 *
 * Two simultaneous requests with the same token must produce:
 *   - Exactly 1 result = 'valid'
 *   - Exactly 1 result = 'used'
 *
 * This confirms the UPDATE-first CAS pattern (WHERE usedAt IS NULL) prevents
 * the TOCTOU race condition of the previous SELECT+UPDATE approach.
 *
 * Usage:
 *   npm run test:token-concurrency
 *   npx tsx scripts/test-setup-token-concurrency.ts
 *
 * Exit 0 = PASS
 * Exit 1 = FAIL (race condition detected or unexpected result)
 *
 * Requires: DATABASE_URL environment variable (set in Replit automatically)
 */

import { createHash } from "crypto";
import { storage } from "../server/storage";
import { db } from "../server/db";
import { competitionSetupTokens, competitionRegistrations } from "../shared/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("[Token Concurrency Test] Starting atomic token validation test...\n");

  // ── 1. Find or create a test registration for our token ──────────────────
  // We need a real registration ID (FK constraint)
  const [existingReg] = await db
    .select({ id: competitionRegistrations.id })
    .from(competitionRegistrations)
    .limit(1);

  if (!existingReg) {
    console.error("[Token Concurrency Test] SKIP — No competition registrations in DB.");
    console.error("  Create at least one registration first, then re-run this test.");
    process.exit(0); // Not a failure — just no test data
  }

  const registrationId = existingReg.id;
  console.log(`[Token Concurrency Test] Using registrationId: ${registrationId}`);

  // ── 2. Create a fresh test token ─────────────────────────────────────────
  const plainTextToken = await storage.createCompetitionSetupToken(registrationId);
  console.log(`[Token Concurrency Test] Token created (first 8 chars): ${plainTextToken.substring(0, 8)}...`);

  // ── 3. Fire two concurrent requests with the same token ──────────────────
  console.log("[Token Concurrency Test] Firing 2 concurrent validateAndConsumeSetupToken calls...");

  const [result1, result2] = await Promise.all([
    storage.validateAndConsumeSetupToken(plainTextToken, registrationId),
    storage.validateAndConsumeSetupToken(plainTextToken, registrationId),
  ]);

  console.log(`\n[Token Concurrency Test] Result 1: '${result1}'`);
  console.log(`[Token Concurrency Test] Result 2: '${result2}'`);

  // ── 4. Assert: exactly 1 valid + 1 used ──────────────────────────────────
  const results = [result1, result2];
  const validCount = results.filter(r => r === 'valid').length;
  const usedCount  = results.filter(r => r === 'used').length;

  if (validCount !== 1 || usedCount !== 1) {
    console.error(`\n[Token Concurrency Test] FAIL — Expected 1 valid + 1 used`);
    console.error(`  Got: ${validCount} valid, ${usedCount} used`);
    if (results.every(r => r === 'valid')) {
      console.error("  ⚠  Race condition detected: both requests consumed the token!");
    }
    await cleanup(plainTextToken);
    process.exit(1);
  }

  // ── 5. Verify DB state: usedAt IS NOT NULL ────────────────────────────────
  const tokenHash = createHash('sha256').update(plainTextToken).digest('hex');
  const [record] = await db
    .select()
    .from(competitionSetupTokens)
    .where(eq(competitionSetupTokens.tokenHash, tokenHash))
    .limit(1);

  if (!record?.usedAt) {
    console.error("\n[Token Concurrency Test] FAIL — DB record shows usedAt IS NULL after consumption");
    await cleanup(plainTextToken);
    process.exit(1);
  }

  console.log(`\n[Token Concurrency Test] DB usedAt: ${record.usedAt.toISOString()} ✓`);
  console.log("[Token Concurrency Test] PASS ✓ — Exactly 1 valid + 1 used. No race condition.");

  await cleanup(plainTextToken);
  process.exit(0);
}

async function cleanup(token: string) {
  try {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    await db.delete(competitionSetupTokens).where(
      eq(competitionSetupTokens.tokenHash, tokenHash)
    );
    console.log("[Token Concurrency Test] Cleanup: test token removed from DB");
  } catch {
    // Cleanup failure is non-critical
  }
}

run().catch((err) => {
  console.error("[Token Concurrency Test] Unexpected error:", err);
  process.exit(1);
});
