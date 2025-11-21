import mammoth from 'mammoth';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function extractFishingAreas() {
  console.log('[EXTRACT] Starting extraction from DOCX file...');
  
  const docxPath = join(process.cwd(), 'attached_assets', 'Zoznam rybárskych revírov na Slovensku_1763755833989.docx');
  
  try {
    const result = await mammoth.extractRawText({ path: docxPath });
    const text = result.value;
    
    // Parse fishing areas (format: "number - name")
    const fishingAreas: Array<{ number: string; name: string; region: string }> = [];
    const lines = text.split('\n');
    
    let currentRegion = '';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Detect region headers
      if (trimmed === 'BRATISLAVSKÁ OBLASŤ') {
        currentRegion = 'Bratislavská';
      } else if (trimmed === 'ZÁPADOSLOVENSKÁ OBLASŤ') {
        currentRegion = 'Západoslovenská';
      } else if (trimmed === 'STREDOSLOVENSKÁ OBLASŤ') {
        currentRegion = 'Stredoslovenská';
      } else if (trimmed === 'VÝCHODOSLOVENSKÁ OBLASŤ') {
        currentRegion = 'Východoslovenská';
      }
      
      // Match fishing area format: "1-0020-1-1 - Name"
      const match = trimmed.match(/^(\d+-\d+-\d+-\d+)\s*-\s*(.+)$/);
      if (match) {
        const [, number, name] = match;
        fishingAreas.push({
          number: number.trim(),
          name: name.trim(),
          region: currentRegion,
        });
      }
    }
    
    console.log(`[EXTRACT] Found ${fishingAreas.length} fishing areas`);
    
    // Count by region
    const regionCounts = {
      Bratislavská: fishingAreas.filter(a => a.region === 'Bratislavská').length,
      Západoslovenská: fishingAreas.filter(a => a.region === 'Západoslovenská').length,
      Stredoslovenská: fishingAreas.filter(a => a.region === 'Stredoslovenská').length,
      Východoslovenská: fishingAreas.filter(a => a.region === 'Východoslovenská').length,
    };
    
    console.log('[EXTRACT] Region breakdown:');
    console.log(`  - Bratislavská: ${regionCounts.Bratislavská}`);
    console.log(`  - Západoslovenská: ${regionCounts.Západoslovenská}`);
    console.log(`  - Stredoslovenská: ${regionCounts.Stredoslovenská}`);
    console.log(`  - Východoslovenská: ${regionCounts.Východoslovenská}`);
    
    // Write to JSON file
    const outputPath = join(process.cwd(), 'db', 'fishing-areas-data.json');
    writeFileSync(outputPath, JSON.stringify(fishingAreas, null, 2), 'utf-8');
    
    console.log(`[EXTRACT] Data written to ${outputPath}`);
    console.log('[EXTRACT] Extraction complete!');
    
  } catch (error) {
    console.error('[EXTRACT] Error:', error);
    process.exit(1);
  }
}

extractFishingAreas();
