import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const html = readFileSync(join(__dirname, "index.html"), "utf8");

// P0-08: everything the app runs on is bundled, so it works on a slow or
// patchy connection once loaded (fonts may still come from Google)
describe("index.html", () => {
  it("loads no scripts from other sites", () => {
    const external = [...html.matchAll(/<script[^>]*src="(https?:[^"]+)"/g)];

    expect(external.map(([, src]) => src)).toEqual([]);
  });

  it("has no import map or runtime Tailwind config", () => {
    expect(html).not.toMatch(/importmap/);
    expect(html).not.toMatch(/tailwind\.config/);
    expect(html).not.toMatch(/cdn\.tailwindcss\.com/);
  });
});
