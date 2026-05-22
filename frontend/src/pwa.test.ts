/// <reference types="node" />
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const dir = dirname(fileURLToPath(import.meta.url));
const frontendRoot = resolve(dir, "..");
const publicDir = resolve(frontendRoot, "public");

describe("index.html PWA metadata", () => {
  const html = readFileSync(resolve(frontendRoot, "index.html"), "utf-8");

  it("has theme-color meta tag", () => {
    expect(html).toContain('name="theme-color"');
  });

  it("has manifest link", () => {
    expect(html).toContain("manifest.webmanifest");
  });

  it("has apple-mobile-web-app-title", () => {
    expect(html).toContain("apple-mobile-web-app-title");
  });

  it("has apple-touch-icon link", () => {
    expect(html).toContain("apple-touch-icon");
  });

  it("has viewport meta tag", () => {
    expect(html).toContain('name="viewport"');
  });
});

describe("manifest.webmanifest", () => {
  const manifest = JSON.parse(
    readFileSync(resolve(publicDir, "manifest.webmanifest"), "utf-8"),
  ) as Record<string, unknown>;

  it("has name and short_name", () => {
    expect(manifest.name).toBeTruthy();
    expect(manifest.short_name).toBeTruthy();
  });

  it("has standalone display mode", () => {
    expect(manifest.display).toBe("standalone");
  });

  it("has start_url", () => {
    expect(manifest.start_url).toBeTruthy();
  });

  it("has at least one icon", () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect((manifest.icons as unknown[]).length).toBeGreaterThan(0);
  });

  it("has theme_color and background_color", () => {
    expect(manifest.theme_color).toBeTruthy();
    expect(manifest.background_color).toBeTruthy();
  });
});

describe("static assets", () => {
  it("app-icon.png exists", () => {
    expect(existsSync(resolve(publicDir, "images/app-icon.png"))).toBe(true);
  });

  it("apple-touch-icon.png exists", () => {
    expect(existsSync(resolve(publicDir, "images/apple-touch-icon.png"))).toBe(true);
  });

  it("bomb.png exists under images/game/", () => {
    expect(existsSync(resolve(publicDir, "images/game/bomb.png"))).toBe(true);
  });

  it("explosion.png exists under images/game/", () => {
    expect(existsSync(resolve(publicDir, "images/game/explosion.png"))).toBe(true);
  });

  it("mark.png exists under images/game/", () => {
    expect(existsSync(resolve(publicDir, "images/game/mark.png"))).toBe(true);
  });
});
