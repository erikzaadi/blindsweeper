#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, "..");
const outDir = path.join(rootDir, "frontend", "public");

const STATIC_ASSET_GUARDRAIL = [
  "Standalone finished app icon artwork.",
  "No text, letters, numbers, logos, watermarks, signatures, UI, buttons, menus, borders, frames, or mockups.",
  "Single centered icon composition, clean silhouette, high contrast, readable at small sizes.",
  "Dark tactile minefield mood, subtle radar-like touch sensation, family-friendly, polished mobile app icon.",
].join(" ");

const ASSETS = [
  {
    filename: "images/app-icon.png",
    size: "1024x1024",
    purpose: "Primary installable app icon",
    prompt: "A sleek square app icon for BlindSweeper: a nearly black minefield surface with a soft glowing fingertip ripple approaching a hidden mine shape, restrained teal and amber highlights, modern game icon, tactile and mysterious, no text.",
  },
  {
    filename: "images/apple-touch-icon.png",
    size: "1024x1024",
    purpose: "Apple touch icon",
    prompt: "A clean rounded mobile app icon for BlindSweeper: black tactile field, subtle touch ripple, hidden mine suggested by a tiny warm glow under the surface, crisp silhouette, premium mobile game icon, no text.",
  },
  {
    filename: "images/game/bomb.png",
    size: "1024x1024",
    purpose: "Mine/bomb cell asset",
    prompt: "A centered stylized mine bomb game token for BlindSweeper, dark charcoal spherical shell, tiny warm fuse spark, transparent-looking plain background, readable at small size, polished mobile game asset, no text.",
  },
  {
    filename: "images/game/explosion.png",
    size: "1024x1024",
    purpose: "Explosion cell asset",
    prompt: "A centered stylized explosion burst game token for BlindSweeper, sharp amber and red burst, compact readable silhouette, transparent-looking plain background, polished mobile game asset, no text.",
  },
  {
    filename: "images/game/mark.png",
    size: "1024x1024",
    purpose: "Marked cell flag asset",
    prompt: "A centered stylized mine marker flag game token for BlindSweeper, emerald green flag on a short pin, tactile and crisp, transparent-looking plain background, polished mobile game asset, no text.",
  },
];

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required. This script is dev-only and never runs during normal build/test/deploy.");
  }

  for (const asset of ASSETS) {
    await generate(asset, apiKey);
  }

  console.log("All static assets generated.");
}

async function generate(asset, apiKey) {
  const outPath = path.join(outDir, asset.filename);
  if (fs.existsSync(outPath)) {
    console.log(`[skip] ${asset.filename} already exists`);
    return;
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  console.log(`[gen]  ${asset.filename} - ${asset.purpose}`);

  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "authorization": `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-2",
      prompt: `${STATIC_ASSET_GUARDRAIL} ${asset.prompt}`,
      size: asset.size,
      quality: "low",
      output_format: "png",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI image generation failed for ${asset.filename}: HTTP ${response.status} ${errorText}`);
  }

  const payload = await response.json();
  const b64 = payload?.data?.[0]?.b64_json;
  if (typeof b64 !== "string" || !b64) {
    throw new Error(`No b64_json returned for ${asset.filename}`);
  }

  fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
  console.log(`[done] ${asset.filename}`);
}

await main();
