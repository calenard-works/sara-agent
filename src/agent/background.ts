/**
 * Simple in-memory background task manager for Sara.
 *
 * Manages background tasks with status tracking and output storage.
 */

export interface BackgroundTaskInfo {
  taskId: string;
  description: string;
  status: "running" | "completed" | "failed" | "timed_out" | "stopped" | "lost";
  command?: string;
  pid?: number;
  exitCode?: number | null;
  agentId?: string;
  subagentType?: string;
  startedAt: number;
  endedAt: number | null;
  stopReason?: string;
  output?: string;
}

const tasks = new Map<string, BackgroundTaskInfo>();

let taskCounter = 0;

/**
 * Register a new background task.
 */
export function registerTask(
  description: string,
  options?: {
    command?: string;
    pid?: number;
    agentId?: string;
    subagentType?: string;
  },
): string {
  taskCounter++;
  const taskId = options?.agentId
    ? `${generateId()}_${options.agentId}`
    : `task_${taskCounter}_${Date.now().toString(36)}`;

  const task: BackgroundTaskInfo = {
    taskId,
    description,
    status: "running",
    command: options?.command,
    pid: options?.pid,
    agentId: options?.agentId,
    subagentType: options?.subagentType,
    startedAt: Date.now(),
    endedAt: null,
  };

  tasks.set(taskId, task);
  return taskId;
}

/**
 * Complete a task with success.
 */
export function completeTask(taskId: string, output?: string): boolean {
  const task = tasks.get(taskId);
  if (!task) return false;

  task.status = "completed";
  task.endedAt = Date.now();
  if (output !== undefined) {
    task.output = output;
  }
  return true;
}

/**
 * Fail a task with an error.
 */
export function failTask(taskId: string, reason: string): boolean {
  const task = tasks.get(taskId);
  if (!task) return false;

  task.status = "failed";
  task.endedAt = Date.now();
  task.stopReason = reason;
  return true;
}

/**
 * Stop a task.
 */
export function stopTask(taskId: string, reason?: string): BackgroundTaskInfo | null {
  const task = tasks.get(taskId);
  if (!task) return null;

  task.status = "stopped";
  task.endedAt = Date.now();
  task.stopReason = reason || "Stopped by TaskStop";
  return { ...task };
}

/**
 * Get task info.
 */
export function getTask(taskId: string): BackgroundTaskInfo | undefined {
  return tasks.get(taskId);
}

/**
 * Get output snapshot for a task.
 */
export function getTaskOutput(taskId: string): BackgroundTaskInfo | undefined {
  return tasks.get(taskId);
}

/**
 * List all tasks, optionally filtered to active only.
 */
export function listTasks(activeOnly: boolean, limit: number): BackgroundTaskInfo[] {
  let result: BackgroundTaskInfo[] = [];

  for (const task of tasks.values()) {
    if (activeOnly && task.status !== "running") continue;
    result.push(task);
  }

  // Sort by startedAt descending (newest first)
  result.sort((a, b) => b.startedAt - a.startedAt);

  if (limit > 0) {
    result = result.slice(0, limit);
  }

  return result;
}

function generateId(): string {
  const chars = "abcdef0123456789";
  let id = "";
  for (let i = 0; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}
