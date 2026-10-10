import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
const require = createRequire(import.meta.url);
const pluginPath = require.resolve("@next/eslint-plugin-next");
const { getRootDirs } = require(
  join(dirname(pluginPath), "utils/get-root-dirs.js"),
) as {
  getRootDirs: (context: {
    cwd: string;
    settings: { next: { rootDir?: string | string[] } };
  }) => string[];
};
describe("Next lint root discovery with scoped glob replacement", () => {
  it("retains default, explicit, wildcard and array root behavior", () => {
    const root = mkdtempSync(join(tmpdir(), "rcc-lint-"));
    try {
      mkdirSync(join(root, "apps", "one"), { recursive: true });
      mkdirSync(join(root, "apps", "two"), { recursive: true });
      writeFileSync(join(root, "apps", "file.ts"), "");
      expect(getRootDirs({ cwd: root, settings: { next: {} } })).toEqual([
        root,
      ]);
      expect(
        getRootDirs({
          cwd: root,
          settings: { next: { rootDir: join(root, "apps", "one") } },
        }).map((dir) => resolve(dir)),
      ).toEqual([join(root, "apps", "one")]);
      expect(
        getRootDirs({
          cwd: root,
          settings: { next: { rootDir: join(root, "apps", "*") } },
        })
          .map((dir) => resolve(dir))
          .sort(),
      ).toEqual([join(root, "apps", "one"), join(root, "apps", "two")]);
      expect(
        getRootDirs({
          cwd: root,
          settings: {
            next: {
              rootDir: [
                join(root, "apps", "one"),
                join(root, "apps", "missing"),
              ],
            },
          },
        }).map((dir) => resolve(dir)),
      ).toEqual([join(root, "apps", "one")]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
