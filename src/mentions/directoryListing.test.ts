import { describe, expect, it } from "vitest";

import { listDirectory } from "./directoryListing";
import { FileEntry } from "./types";

const TREE: FileEntry[] = [
  { path: "src", type: "directory" },
  { path: "src/components", type: "directory" },
  { path: "src/components/Button.tsx", type: "file" },
  { path: "src/utils", type: "directory" },
  { path: "src/utils/helper.ts", type: "file" },
  { path: "src/index.ts", type: "file" },
  { path: "package.json", type: "file" },
  { path: "README.md", type: "file" },
];

describe("listDirectory", () => {
  it("lists root entries, directories first", () => {
    const result = listDirectory("", TREE, 20);
    expect(result).toEqual([
      { path: "src/", type: "directory" },
      { path: "package.json", type: "file" },
      { path: "README.md", type: "file" },
    ]);
  });

  it("prepends .. when inside a subdirectory", () => {
    const result = listDirectory("src/", TREE, 20);
    expect(result[0]).toEqual({ path: "..", type: "directory" });
    expect(result).toContainEqual({ path: "src/components/", type: "directory" });
    expect(result).toContainEqual({ path: "src/index.ts", type: "file" });
    // Nested entries are not listed
    expect(result).not.toContainEqual({ path: "src/utils/helper.ts", type: "file" });
  });

  it("filters by the last path segment", () => {
    const result = listDirectory("src/uti", TREE, 20);
    expect(result).toEqual([
      { path: "..", type: "directory" },
      { path: "src/utils/", type: "directory" },
    ]);
  });

  it("respects the limit and keeps ..", () => {
    const result = listDirectory("src/", TREE, 2);
    expect(result).toEqual([
      { path: "..", type: "directory" },
      { path: "src/components/", type: "directory" },
    ]);
  });
});
