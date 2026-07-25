import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";

const InputSchema = z.object({
  path: z.string().describe("File path to write to"),
  content: z.string().describe("Content to write to the file"),
  mode: z
    .enum(["overwrite", "append"])
    .default("overwrite")
    .describe("Write mode: overwrite (replace file) or append (add to end)"),
}).strict();

export type WriteInput = {
  path: string;
  content: string;
  mode?: "overwrite" | "append";
};

type WriteOutput =
  | {
      path: string;
      bytesWritten: number;
      mode: "overwrite" | "append";
    }
  | ToolErrorResult;

export const WriteTool: Tool<WriteInput, WriteOutput> = {
  name: "Write",
  displayName: "Write",
  description: `Create or overwrite a file with content.

USE THIS TOOL WHEN:
- You need to create a new file
- You need to overwrite an existing file entirely
- You need to append content to an existing file

PREFER fileEdit WHEN:
- You need to make surgical edits to existing files (search-and-replace)
- You need to modify specific parts of a file without rewriting everything

FEATURES:
- Automatically creates parent directories if they don't exist
- Supports overwrite and append modes
- Returns the number of bytes written`,
  readonly: false,
  inputSchema: InputSchema,

  async execute(
    input: WriteInput,
    context: ToolExecutionContext,
  ): Promise<WriteOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    const filePath = path.resolve(context.cwd, input.path);
    const writeMode = input.mode ?? "overwrite";

    try {
      // Check if path is a directory
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        return {
          isError: true,
          message: `Cannot write: '${input.path}' is a directory`,
        };
      }

      if (context.signal?.aborted) {
        return { isError: true, isAborted: true, message: "Aborted" };
      }

      // Create parent directories if needed
      const dir = path.dirname(filePath);
      fs.mkdirSync(dir, { recursive: true });

      if (context.signal?.aborted) {
        return { isError: true, isAborted: true, message: "Aborted" };
      }

      // Write content
      const encoder = new TextEncoder();
      const bytes = encoder.encode(input.content);
      const bytesWritten = bytes.length;

      if (writeMode === "append") {
        fs.appendFileSync(filePath, input.content, "utf8");
      } else {
        // Check if file exists before overwriting
        if (fs.existsSync(filePath)) {
          const stat = fs.statSync(filePath);
          if (!stat.isFile()) {
            return {
              isError: true,
              message: `'${input.path}' exists and is not a regular file`,
            };
          }
        }
        fs.writeFileSync(filePath, input.content, "utf8");
      }

      return {
        path: input.path,
        bytesWritten,
        mode: writeMode,
      };
    } catch (error) {
      return {
        isError: true,
        message: `Failed to write file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};
