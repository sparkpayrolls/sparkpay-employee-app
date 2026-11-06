import { readdirSync, readFileSync, statSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";

const ROOT = __dirname;
const SKIP = new Set(["node_modules", "dist", ".git", "docs"]);
const SOURCE = /\.(ts|tsx|js|jsx|json|html)$/;
const LOCKFILES = new Set(["package-lock.json", "yarn.lock"]);
const THIS_FILE = "no-firebase.test.ts";

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    if (SKIP.has(name)) return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return SOURCE.test(name) && !LOCKFILES.has(name) && name !== THIS_FILE
      ? [path]
      : [];
  });

// P0-07: all data comes from the SparkPay backend, and nothing secret is
// bundled into the client
describe("no Firebase, no Gemini key", () => {
  it.each([
    ["Firebase", /firebase|firestore/i],
    ["a Gemini or API key define", /GEMINI|process\.env\.API_KEY/],
  ])("no source file mentions %s", (_, pattern) => {
    const offenders = sourceFiles(ROOT).filter((file) =>
      pattern.test(readFileSync(file, "utf8"))
    );

    expect(offenders).toEqual([]);
  });
});
