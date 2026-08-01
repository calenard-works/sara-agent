import { FileEntry } from "./types";

/**
 * Directory-aware listing for @mention folder navigation.
 *
 * When the query is empty or contains a "/", the autocomplete lists entries
 * that live directly inside the directory part of the query, filtered by the
 * last path segment (case-insensitive substring). Directories are sorted
 * first, then files, each group alphabetically.
 *
 * When inside a subdirectory a `..` entry is prepended so users can navigate
 * back to the parent with Enter/Right (same as pressing Left).
 *
 * @param query - Current @mention text after the `@` symbol (e.g. "src/uti")
 * @param entries - All scanned file entries (relative paths, dirs w/o slash)
 * @param limit - Maximum number of child entries to return (excluding "..")
 * @returns Directory entries with trailing slashes, ".." first when applicable
 */
export function listDirectory(
  query: string,
  entries: FileEntry[],
  limit: number,
): FileEntry[] {
  const lastSlash = query.lastIndexOf("/");
  const dirPart = lastSlash === -1 ? "" : query.slice(0, lastSlash + 1);
  const filter = (lastSlash === -1 ? query : query.slice(lastSlash + 1)).toLowerCase();

  const children: FileEntry[] = [];

  for (const entry of entries) {
    const rest = dirPart === "" ? entry.path : entry.path.slice(dirPart.length);

    // Skip the directory entry itself and anything that is not a direct child
    if (rest === "" || rest.includes("/")) continue;

    const name = rest.endsWith("/") ? rest.slice(0, -1) : rest;
    if (filter && !name.toLowerCase().includes(filter)) continue;

    children.push(
      entry.type === "directory" && !entry.path.endsWith("/")
        ? { ...entry, path: entry.path + "/" }
        : entry,
    );
  }

  // Directories first, then files; alphabetical within each group
  children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  const result: FileEntry[] = [];
  if (dirPart !== "") {
    result.push({ path: "..", type: "directory" });
  }
  result.push(...children.slice(0, Math.max(0, limit - result.length)));

  return result;
}
