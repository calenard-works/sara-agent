import fs from "fs";
import os from "os";
import path from "path";

export function createTempProject(options?: {
  bashAllowPrefixes?: string[];
  fsPermissions?: boolean;
}): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sara-proj-"));
  const sara = path.join(dir, ".sara");
  fs.mkdirSync(sara, { recursive: true });

  const grants: any[] = [];

  // Only add filesystem permissions if explicitly requested
  if (options?.fsPermissions === true) {
    grants.push({
      type: "fs",
      path: dir,
      grantedAt: new Date().toISOString(),
    });
  }

  // Add bash permissions if specified
  if (options?.bashAllowPrefixes) {
    for (const command of options.bashAllowPrefixes) {
      grants.push({
        type: "bash",
        command,
        grantedAt: new Date().toISOString(),
      });
    }
  }

  const permissions = { grants };
  fs.writeFileSync(
    path.join(sara, "permissions.json"),
    JSON.stringify(permissions, null, 2) + "\n",
    "utf8",
  );
  return dir;
}
