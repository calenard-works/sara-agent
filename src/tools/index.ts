export * from "./types";
export * from "./fileRead";
export * from "./listFiles";
export * from "./grep";
export * from "./glob";
export * from "./fileEdit";
export * from "./bash";
export * from "./architect";
export * from "./skill";
export * from "./todo";
export * from "./runner";
export * from "./openai";
export * from "./fetch";
export * from "./fetchUrl";
export * from "./webSearch";
export * from "./write";
export * from "./readMediaFile";
export * from "./selectTools";
export * from "./askUserQuestion";
export * from "./createGoal";
export * from "./getGoal";
export * from "./updateGoal";
export * from "./setGoalBudget";
export * from "./enterPlanMode";
export * from "./exitPlanMode";
export * from "./taskList";
export * from "./taskOutput";
export * from "./taskStop";

import { FileReadTool } from "./fileRead";
import { ListFilesTool } from "./listFiles";
import { GrepTool } from "./grep";
import { GlobTool } from "./glob";
import { FileEditTool } from "./fileEdit";
import { BashTool } from "./bash";
import { ArchitectTool } from "./architect";
import { SkillTool } from "./skill";
import { TodoReadTool, TodoWriteTool } from "./todo";
import { FetchTool } from "./fetch";
import { FetchUrlTool } from "./fetchUrl";
import { WebSearchTool } from "./webSearch";
import { WriteTool } from "./write";
import { ReadMediaFileTool } from "./readMediaFile";
import { SelectToolsTool } from "./selectTools";
import { AskUserQuestionTool } from "./askUserQuestion";
import { CreateGoalTool } from "./createGoal";
import { GetGoalTool } from "./getGoal";
import { UpdateGoalTool } from "./updateGoal";
import { SetGoalBudgetTool } from "./setGoalBudget";
import { EnterPlanModeTool } from "./enterPlanMode";
import { ExitPlanModeTool } from "./exitPlanMode";
import { TaskListTool } from "./taskList";
import { TaskOutputTool } from "./taskOutput";
import { TaskStopTool } from "./taskStop";
import type { Tool } from "./types";

/**
 * Registry of all available tools
 *
 * Contains all tools defined in the system, used for:
 * 1. Passing to LLM API (converted to OpenAI format)
 * 2. Tool lookup (finding tool instances by name)
 * 3. Tool list display
 */
export const ALL_TOOLS = [
  FileReadTool,
  ListFilesTool,
  GrepTool,
  GlobTool,
  FileEditTool,
  BashTool,
  WriteTool,
  ReadMediaFileTool,
  ArchitectTool,
  SkillTool,
  TodoReadTool,
  TodoWriteTool,
  FetchUrlTool,
  WebSearchTool,
  SelectToolsTool,
  AskUserQuestionTool,
  CreateGoalTool,
  GetGoalTool,
  UpdateGoalTool,
  SetGoalBudgetTool,
  EnterPlanModeTool,
  ExitPlanModeTool,
  TaskListTool,
  TaskOutputTool,
  TaskStopTool,
] as const;

/**
 * Mapping of tool names to tool instances
 *
 * Used for quickly finding corresponding tool instances by tool names returned by LLM
 */
const TOOLS_BY_NAME = {
  fileRead: FileReadTool,
  listFiles: ListFilesTool,
  grep: GrepTool,
  glob: GlobTool,
  fileEdit: FileEditTool,
  bash: BashTool,
  architect: ArchitectTool,
  Skill: SkillTool,
  todo_read: TodoReadTool,
  todo_write: TodoWriteTool,
  fetch: FetchTool,
  FetchURL: FetchUrlTool,
  WebSearch: WebSearchTool,
  Write: WriteTool,
  ReadMediaFile: ReadMediaFileTool,
  select_tools: SelectToolsTool,
  AskUserQuestion: AskUserQuestionTool,
  CreateGoal: CreateGoalTool,
  GetGoal: GetGoalTool,
  UpdateGoal: UpdateGoalTool,
  SetGoalBudget: SetGoalBudgetTool,
  EnterPlanMode: EnterPlanModeTool,
  ExitPlanMode: ExitPlanModeTool,
  TaskList: TaskListTool,
  TaskOutput: TaskOutputTool,
  TaskStop: TaskStopTool,
} as const;

/**
 * Get all tools including MCP tools
 */
let mcpTools: Tool<any, any>[] = [];

export function setMCPTools(tools: Tool<any, any>[]): void {
  mcpTools = tools;
}

export function getAllTools(): readonly Tool<any, any>[] {
  return [...ALL_TOOLS, ...mcpTools];
}

export function getToolsByName(): Record<string, Tool<any, any>> {
  const allTools = getAllTools();
  const toolsByName: Record<string, Tool<any, any>> = { ...TOOLS_BY_NAME };

  for (const tool of allTools) {
    if (!toolsByName[tool.name]) {
      toolsByName[tool.name] = tool;
    }
  }

  return toolsByName;
}
