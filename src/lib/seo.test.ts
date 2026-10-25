import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Technical SEO & Launch Verification", () => {
  const rootDir = path.resolve(__dirname, "../../");

  it("public/robots.txt exists and protects sensitive health routes", () => {
    const robotsPath = path.join(rootDir, "public/robots.txt");
    expect(fs.existsSync(robotsPath)).toBe(true);

    const content = fs.readFileSync(robotsPath, "utf-8");

    // Critical privacy checks: ensure sensitive patient paths are disallowed
    expect(content).toContain("Disallow: /dashboard");
    expect(content).toContain("Disallow: /assessment");
    expect(content).toContain("Disallow: /chat");
    expect(content).toContain("Disallow: /checkin");
    expect(content).toContain("Disallow: /trends");
    expect(content).toContain("Disallow: /profile");
    expect(content).toContain("Disallow: /reports/");
    expect(content).toContain("Disallow: /shared/");
    expect(content).toContain("Disallow: /auth");

    // Sitemap declaration
    expect(content).toMatch(/Sitemap:\s+https:\/\/[^\s]+\/sitemap\.xml/);
  });

  it("public/sitemap.xml exists, is valid XML, and exposes only canonical public routes", () => {
    const sitemapPath = path.join(rootDir, "public/sitemap.xml");
    expect(fs.existsSync(sitemapPath)).toBe(true);

    const content = fs.readFileSync(sitemapPath, "utf-8");

    // Valid XML format
    expect(content.trim().startsWith("<?xml")).toBe(true);
    expect(content).toContain("<urlset");
    expect(content).toContain("</urlset>");

    // Canonical public landing
    expect(content).toContain("<loc>https://afiyatai.com/</loc>");

    // Privacy guard: Ensure private user views and doctor share links are NEVER in the sitemap
    expect(content).not.toContain("/dashboard");
    expect(content).not.toContain("/assessment");
    expect(content).not.toContain("/chat");
    expect(content).not.toContain("/shared/");
  });

  it("index.html contains valid Schema.org JSON-LD structured data and medical disclaimers", () => {
    const indexPath = path.join(rootDir, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");

    // Extract JSON-LD block
    const jsonLdMatch = content.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    );
    expect(jsonLdMatch).not.toBeNull();

    const jsonLdRaw = jsonLdMatch![1].trim();
    let parsed: Record<string, unknown> | null = null;
    expect(() => {
      parsed = JSON.parse(jsonLdRaw);
    }).not.toThrow();

    expect(parsed).not.toBeNull();
    expect((parsed as unknown as { "@context": string })["@context"]).toBe("https://schema.org");

    // Check Open Graph & Twitter meta tags
    expect(content).toContain('property="og:title"');
    expect(content).toContain('property="og:description"');
    expect(content).toContain('property="og:image"');
    expect(content).toContain('name="twitter:card"');
    expect(content).toContain('rel="canonical"');

    // Medical safety non-diagnostic awareness
    expect(content.toLowerCase()).toContain("non-diagnostic");
  });
});
