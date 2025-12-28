import { db } from "../server/db";
import { equipmentManufacturers, equipmentCategories, equipmentProducts } from "../shared/schema";
import { readFileSync } from "fs";

async function importEquipment() {
  console.log("[IMPORT] Starting equipment import...");
  
  const filePath = "attached_assets/Pasted-Abu-Garcia-pr-t-Abu-Garcia-Pr-t-Carabus-Delicate2-602XU_1766950782923.txt";
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter(line => line.trim());
  
  console.log(`[IMPORT] Found ${lines.length} products to import`);
  
  const manufacturerMap = new Map<string, number>();
  const categoryMap = new Map<string, number>();
  
  const manufacturers = new Set<string>();
  const categories = new Set<string>();
  const products: Array<{ manufacturer: string; category: string; name: string }> = [];
  
  for (const line of lines) {
    const parts = line.split("\t");
    if (parts.length >= 3) {
      const manufacturer = parts[0].trim();
      const category = parts[1].trim();
      const name = parts[2].trim();
      
      if (manufacturer && category && name) {
        manufacturers.add(manufacturer);
        categories.add(category);
        products.push({ manufacturer, category, name });
      }
    }
  }
  
  console.log(`[IMPORT] Unique manufacturers: ${manufacturers.size}`);
  console.log(`[IMPORT] Unique categories: ${categories.size}`);
  console.log(`[IMPORT] Total products: ${products.length}`);
  
  console.log("[IMPORT] Inserting manufacturers...");
  for (const name of manufacturers) {
    try {
      const [result] = await db
        .insert(equipmentManufacturers)
        .values({ name })
        .onConflictDoNothing()
        .returning();
      
      if (result) {
        manufacturerMap.set(name, result.id);
      } else {
        const [existing] = await db
          .select()
          .from(equipmentManufacturers)
          .where((eq as any)(equipmentManufacturers.name, name));
        if (existing) {
          manufacturerMap.set(name, existing.id);
        }
      }
    } catch (error) {
      console.error(`[IMPORT] Error inserting manufacturer ${name}:`, error);
    }
  }
  console.log(`[IMPORT] Inserted ${manufacturerMap.size} manufacturers`);
  
  console.log("[IMPORT] Inserting categories...");
  for (const name of categories) {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    
    try {
      const [result] = await db
        .insert(equipmentCategories)
        .values({ name, slug })
        .onConflictDoNothing()
        .returning();
      
      if (result) {
        categoryMap.set(name, result.id);
      } else {
        const [existing] = await db
          .select()
          .from(equipmentCategories)
          .where((eq as any)(equipmentCategories.name, name));
        if (existing) {
          categoryMap.set(name, existing.id);
        }
      }
    } catch (error) {
      console.error(`[IMPORT] Error inserting category ${name}:`, error);
    }
  }
  console.log(`[IMPORT] Inserted ${categoryMap.size} categories`);
  
  console.log("[IMPORT] Inserting products in batches...");
  const batchSize = 100;
  let insertedCount = 0;
  
  for (let i = 0; i < products.length; i += batchSize) {
    const batch = products.slice(i, i + batchSize);
    const values = batch
      .map(p => {
        const manufacturerId = manufacturerMap.get(p.manufacturer);
        const categoryId = categoryMap.get(p.category);
        
        if (!manufacturerId || !categoryId) {
          console.warn(`[IMPORT] Skipping product - missing manufacturer or category: ${p.name}`);
          return null;
        }
        
        return {
          manufacturerId,
          categoryId,
          name: p.name,
        };
      })
      .filter((v): v is NonNullable<typeof v> => v !== null);
    
    if (values.length > 0) {
      try {
        await db.insert(equipmentProducts).values(values);
        insertedCount += values.length;
        console.log(`[IMPORT] Progress: ${insertedCount}/${products.length}`);
      } catch (error) {
        console.error(`[IMPORT] Error inserting batch:`, error);
      }
    }
  }
  
  console.log(`[IMPORT] Import complete! Inserted ${insertedCount} products`);
  process.exit(0);
}

import { eq } from "drizzle-orm";
importEquipment().catch(console.error);
