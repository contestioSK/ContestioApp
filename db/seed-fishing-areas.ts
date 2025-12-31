import { db } from '../server/db';
import { fishingAreas } from '../shared/schema';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { sql } from 'drizzle-orm';

const __dirname = dirname(fileURLToPath(import.meta.url));

export async function seedFishingAreas() {
  console.log('[SEED] Starting fishing areas seed...');
  
  try {
    // Load fishing areas from extracted JSON file
    const jsonPath = join(__dirname, 'fishing-areas-data.json');
    const areas = JSON.parse(readFileSync(jsonPath, 'utf-8'));
    
    console.log(`[SEED] Loaded ${areas.length} fishing areas from JSON`);
    
    // Get current count before seeding
    const beforeCount = await db.select({ count: sql<number>`count(*)` }).from(fishingAreas);
    console.log(`[SEED] Current database count: ${beforeCount[0].count}`);
    
    // Insert areas in batches using ON CONFLICT DO NOTHING for idempotency
    const batchSize = 50;
    let inserted = 0;
    
    for (let i = 0; i < areas.length; i += batchSize) {
      const batch = areas.slice(i, i + batchSize);
      
      try {
        await db
          .insert(fishingAreas)
          .values(batch.map((area: any) => ({
            number: area.number,
            name: area.name,
            notes: area.notes || null,
          })))
          .onConflictDoNothing({ target: fishingAreas.number });
        
        inserted += batch.length;
        console.log(`[SEED] Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(areas.length / batchSize)} (${inserted}/${areas.length})`);
      } catch (error) {
        console.error(`[SEED] Error inserting batch starting at index ${i}:`, error);
      }
    }
    
    // Get final count after seeding
    const afterCount = await db.select({ count: sql<number>`count(*)` }).from(fishingAreas);
    console.log(`[SEED] Final database count: ${afterCount[0].count}`);
    console.log(`[SEED] Added ${Number(afterCount[0].count) - Number(beforeCount[0].count)} new fishing areas`);
    
    // Show breakdown by region
    const regionQuery = await db.execute(sql`
      SELECT 
        CASE 
          WHEN number LIKE '1-%' THEN 'Bratislavská'
          WHEN number LIKE '2-%' THEN 'Západoslovenská'
          WHEN number LIKE '3-%' THEN 'Stredoslovenská'
          WHEN number LIKE '4-%' THEN 'Východoslovenská'
        END as region,
        COUNT(*) as count
      FROM fishing_areas
      GROUP BY region
      ORDER BY region
    `);
    
    console.log('[SEED] Region breakdown in database:');
    regionQuery.rows.forEach((row: any) => {
      console.log(`  - ${row.region}: ${row.count}`);
    });
    
    console.log('[SEED] Seeding complete!');
    
  } catch (error) {
    console.error('[SEED] Error seeding fishing areas:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedFishingAreas()
    .then(() => {
      console.log('[SEED] Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[SEED] Fatal error:', error);
      process.exit(1);
    });
}
