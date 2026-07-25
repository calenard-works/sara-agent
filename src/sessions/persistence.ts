import fs from "fs";
import path from "path";
import os from "os";

import type { Session } from "./types";

/**
 * Get the sessions directory path
 */
function getSessionsDir(): string {
  const configDir = path.join(os.homedir(), ".sara");
  const sessionsDir = path.join(configDir, "sessions");

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }
  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  return sessionsDir;
}

/**
 * Get the path for session JSON file
 */
function getSessionJsonPath(sessionId: string): string {
  return path.join(getSessionsDir(), `${sessionId}.json`);
}

/**
 * Save session to disk
 */
export async function saveSession(session: Session): Promise<void> {
  const file = getSessionJsonPath(session.sessionId);
  await fs.promises.writeFile(
    file,
    JSON.stringify(session, null, 2) + "\n",
    "utf8",
  );
}

/**
 * Load session from disk
 * Returns null if session not found
 */
export async function loadSession(sessionId: string): Promise<Session | null> {
  const file = getSessionJsonPath(sessionId);
  try {
    const content = await fs.promises.readFile(file, "utf8");
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * List all saved sessions, sorted by lastActivity descending
 */
export async function listSessions(): Promise<Session[]> {
  const sessionsDir = getSessionsDir();
  try {
    const files = fs.readdirSync(sessionsDir).filter((f) => f.endsWith(".json"));
    const sessions: Session[] = [];
    for (const file of files) {
      try {
        const content = fs.readFileSync(path.join(sessionsDir, file), "utf8");
        sessions.push(JSON.parse(content));
      } catch {
        // Skip corrupt session files
      }
    }
    // Sort by lastActivity descending (most recent first)
    sessions.sort((a, b) => (b.lastActivity ?? 0) - (a.lastActivity ?? 0));
    return sessions;
  } catch {
    return [];
  }
}

/**
 * Get the most recent session (for -c / continue)
 */
export async function getLastSession(): Promise<Session | null> {
  const sessions = await listSessions();
  return sessions.length > 0 ? sessions[0] : null;
}

/**
 * Delete a session from disk
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const file = getSessionJsonPath(sessionId);
  try {
    fs.unlinkSync(file);
  } catch {
    // Ignore if file doesn't exist
  }
}

/**
 * Update session metadata (title, lastActivity) on disk
 */
export async function updateSessionMeta(
  sessionId: string,
  meta: { title?: string; lastActivity?: number },
): Promise<void> {
  const session = await loadSession(sessionId);
  if (!session) return;
  if (meta.title !== undefined) session.title = meta.title;
  if (meta.lastActivity !== undefined) session.lastActivity = meta.lastActivity;
  await saveSession(session);
}
