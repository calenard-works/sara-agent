import { z } from "zod";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";

const InputSchema = z.object({
  path: z.string().describe("Path to the media file"),
}).strict();

export type ReadMediaFileInput = {
  path: string;
};

interface ImageDimensions {
  width: number;
  height: number;
}

type ReadMediaFileOutput =
  | {
      path: string;
      size: number;
      mimeType: string;
      description: string;
      dimensions?: ImageDimensions;
    }
  | ToolErrorResult;

const MIME_TYPES: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".bmp": "image/bmp",
  ".ico": "image/x-icon",
  ".tiff": "image/tiff",
  ".tif": "image/tiff",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".avi": "video/x-msvideo",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".ogg": "audio/ogg",
  ".flac": "audio/flac",
  ".pdf": "application/pdf",
};

const TEXT_EXTENSIONS = new Set([
  ".txt", ".md", ".ts", ".tsx", ".js", ".jsx", ".json", ".yml", ".yaml",
  ".toml", ".css", ".scss", ".html", ".xml", ".sh", ".bash", ".zsh",
  ".py", ".rb", ".go", ".rs", ".java", ".cpp", ".c", ".h", ".hpp",
  ".sql", ".graphql", ".env", ".conf", ".cfg", ".ini",
]);

function getImageDimensions(filePath: string): ImageDimensions | undefined {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const buffer = fs.readFileSync(filePath);

    if (ext === ".png" && buffer.length >= 24) {
      return {
        width: buffer.readUInt32BE(16),
        height: buffer.readUInt32BE(20),
      };
    }

    if (ext === ".jpg" || ext === ".jpeg") {
      let offset = 2;
      while (offset < buffer.length - 1) {
        if (buffer[offset] === 0xff && buffer[offset + 1] === 0xc0) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        offset++;
      }
    }

    if (ext === ".gif" && buffer.length >= 10) {
      return {
        width: buffer.readUInt16LE(6),
        height: buffer.readUInt16LE(8),
      };
    }

    if (ext === ".webp" && buffer.length >= 30) {
      const riff = buffer.toString("ascii", 0, 4);
      const webp = buffer.toString("ascii", 8, 12);
      if (riff === "RIFF" && webp === "WEBP") {
        const vp8 = buffer.toString("ascii", 12, 15);
        if (vp8 === "VP8 " && buffer.length >= 30) {
          return {
            width: buffer.readUInt16LE(26) & 0x3fff,
            height: buffer.readUInt16LE(28) & 0x3fff,
          };
        }
        if (vp8 === "VP8L" && buffer.length >= 25) {
          const bits = buffer.readUInt32LE(21);
          return {
            width: (bits & 0x3fff) + 1,
            height: ((bits >> 14) & 0x3fff) + 1,
          };
        }
      }
    }

    if (ext === ".bmp" && buffer.length >= 26) {
      return {
        width: buffer.readUInt32LE(18),
        height: buffer.readUInt32LE(22),
      };
    }
  } catch {
    // Silently fail to get dimensions
  }

  // Try using the `file` command as fallback
  try {
    const output = execSync(`file "${filePath}"`, { encoding: "utf8", timeout: 5000 });
    const dimMatch = output.match(/(\d+)\s*x\s*(\d+)/);
    if (dimMatch) {
      return { width: parseInt(dimMatch[1], 10), height: parseInt(dimMatch[2], 10) };
    }
  } catch {
    // Fallback failed
  }

  return undefined;
}

export const ReadMediaFileTool: Tool<ReadMediaFileInput, ReadMediaFileOutput> = {
  name: "ReadMediaFile",
  displayName: "Read Media File",
  description: `Read information about a media file (image, video, audio, PDF).

Use this tool to inspect media files and get metadata such as file size, MIME type, and dimensions (for images).

DO NOT use this tool for text files — use the Read tool instead for code, markdown, and other text content.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: ReadMediaFileInput,
    context: ToolExecutionContext,
  ): Promise<ReadMediaFileOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    const filePath = path.resolve(context.cwd, input.path);

    try {
      if (!fs.existsSync(filePath)) {
        return { isError: true, message: `File not found: ${input.path}` };
      }

      const stat = fs.statSync(filePath);
      if (!stat.isFile()) {
        return { isError: true, message: `Not a file: ${input.path}` };
      }

      if (context.signal?.aborted) {
        return { isError: true, isAborted: true, message: "Aborted" };
      }

      const ext = path.extname(filePath).toLowerCase();

      // Check if it's a text file
      if (TEXT_EXTENSIONS.has(ext)) {
        return {
          isError: true,
          message: `File '${input.path}' appears to be a text file. Use the Read tool instead.`,
        };
      }

      const mimeType = MIME_TYPES[ext] || "application/octet-stream";
      const sizeKB = Math.round(stat.size / 1024);
      const sizeMB = (stat.size / (1024 * 1024)).toFixed(1);

      let description = `${path.basename(filePath)} (${mimeType})`;
      description += ` — ${formatSize(stat.size)}`;

      const result: ReadMediaFileOutput = {
        path: input.path,
        size: stat.size,
        mimeType,
        description,
      };

      // Try to get dimensions for images
      if (mimeType.startsWith("image/")) {
        const dims = getImageDimensions(filePath);
        if (dims) {
          (result as any).dimensions = dims;
          result.description += `, ${dims.width}×${dims.height}px`;
        }
      }

      if (context.signal?.aborted) {
        return { isError: true, isAborted: true, message: "Aborted" };
      }

      return result;
    } catch (error) {
      return {
        isError: true,
        message: `Failed to read media file: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
