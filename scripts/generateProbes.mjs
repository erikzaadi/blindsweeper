#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.join(__dirname, "..", "frontend", "public", "images", "probes");

const PROBES = [
  {
    filename: "probe-failure.png",
    prompt: "Abstract dark atmospheric mood image. Near-black void background with a single sharp amber-red impact burst at center, as if something just detonated under a featureless black surface. Debris particles radiate outward, fading to nothing. The surrounding field is silent and dark. Tense, precise, the moment after catastrophe. No text, no UI, no labels. Pure mood.",
  },
  {
    filename: "probe-home-waiting.png",
    prompt: "Abstract dark atmospheric mood image. A vast near-black field with a faint emerald-tinted glowing dot or ripple at center, suggesting a fingertip touching a dark surface in a dim room. The surrounding area is pure void. The texture implies something hidden beneath. Calm before danger. Restrained, minimal, tense. No text, no UI, no labels. Pure mood.",
  },
];

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }

  fs.mkdirSync(outDir, { recursive: true });

  for (const probe of PROBES) {
    const outPath = path.join(outDir, probe.filename);
    if (fs.existsSync(outPath)) {
      console.log(`[skip] ${probe.filename} already exists`);
      continue;
    }

    console.log(`[gen]  ${probe.filename}`);
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "authorization": `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-2",
        prompt: probe.prompt,
        size: "1024x1024",
        quality: "low",
        output_format: "png",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed for ${probe.filename}: HTTP ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    const b64 = payload?.data?.[0]?.b64_json;
    if (!b64) {
      throw new Error(`No b64_json returned for ${probe.filename}`);
    }

    fs.writeFileSync(outPath, Buffer.from(b64, "base64"));
    console.log(`[done] ${probe.filename}`);
  }
}

await main();
