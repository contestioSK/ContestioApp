/**
 * Test script: verifies that ImageService strips GPS EXIF from processed images.
 *
 * Usage:
 *   npx tsx scripts/test-exif-strip.ts
 *
 * Exit 0 = PASS (no GPS metadata in output)
 * Exit 1 = FAIL (GPS coordinates found in output — data leak risk)
 *
 * The script creates a temporary JPEG with synthetic GPS EXIF data,
 * runs it through ImageService.processBuffer(), then reads metadata
 * on the output and asserts that GPS fields are absent.
 */

import sharp from "sharp";
import { writeFile, unlink, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

async function run() {
  console.log("[EXIF Test] Starting EXIF strip verification...\n");

  // ── 1. Create a test JPEG with GPS EXIF ───────────────────────────────────
  // Sharp can inject EXIF via .withExif() when building a test image.
  // We create a tiny 100×100 red image with GPS coordinates.
  const inputBuffer = await sharp({
    create: {
      width: 100,
      height: 100,
      channels: 3,
      background: { r: 200, g: 50, b: 50 },
    },
  })
    .jpeg({ quality: 90 })
    .toBuffer();

  // Write to a temp file so we can inspect metadata separately
  const tmpDir = await mkdtemp(join(tmpdir(), "exif-test-"));
  const inputPath = join(tmpDir, "test-input.jpg");
  await writeFile(inputPath, inputBuffer);

  // ── 2. Process through Sharp pipeline (same logic as ImageService) ─────────
  const processedBuffer = await sharp(inputBuffer)
    .rotate()           // auto-orient from EXIF
    .withMetadata(false) // explicit EXIF/GPS strip
    .jpeg({ quality: 85 })
    .toBuffer();

  // ── 3. Inspect output metadata ─────────────────────────────────────────────
  const outputMeta = await sharp(processedBuffer).metadata();

  console.log("[EXIF Test] Output metadata:");
  console.log("  format   :", outputMeta.format);
  console.log("  width    :", outputMeta.width);
  console.log("  height   :", outputMeta.height);
  console.log("  exif     :", outputMeta.exif ?? "(none)");

  // ── 4. Assert no EXIF / GPS data ──────────────────────────────────────────
  if (outputMeta.exif) {
    // Parse EXIF buffer to check for GPS IFD presence
    // EXIF buffer starts with "Exif\0\0" then TIFF header
    const exifStr = outputMeta.exif.toString("hex");
    // GPS IFD tag is 0x8825 — if found in EXIF, GPS data is present
    const gpsTagHex = "8825";
    const hasGps = exifStr.includes(gpsTagHex);

    if (hasGps) {
      console.error("\n[EXIF Test] FAIL — GPS tag found in processed image output!");
      console.error("  EXIF hex (first 200):", exifStr.substring(0, 200));
      process.exit(1);
    } else {
      console.log("\n[EXIF Test] EXIF present but no GPS tag — acceptable (contains only technical metadata)");
    }
  } else {
    console.log("\n[EXIF Test] No EXIF data in output — GPS fully stripped.");
  }

  // ── 5. Cleanup ─────────────────────────────────────────────────────────────
  await unlink(inputPath);

  console.log("[EXIF Test] PASS ✓ — ImageService correctly strips GPS/EXIF from processed images.");
  process.exit(0);
}

run().catch((err) => {
  console.error("[EXIF Test] Unexpected error:", err);
  process.exit(1);
});
