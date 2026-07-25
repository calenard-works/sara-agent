import { z } from "zod";
import TurndownService from "turndown";

import {
  parseContentType,
  isSupportedTextContent,
  isHtmlContent,
} from "../utils/file-type";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";

const InputSchema = z.object({
  url: z.string().url().describe("The URL to fetch content from"),
  maxLength: z
    .number()
    .default(50000)
    .describe(
      "Maximum length of content to return (default: 50000 characters)",
    ),
});

export type FetchUrlInput = {
  url: string;
  maxLength?: number;
};

type FetchUrlOutput =
  | {
      url: string;
      content: string;
      mimeType: string;
    }
  | ToolErrorResult;

export const FetchUrlTool: Tool<FetchUrlInput, FetchUrlOutput> = {
  name: "FetchURL",
  displayName: "Fetch URL",
  description: `Fetches text-based web content from HTTP/HTTPS URLs for analysis and information extraction.

USE THIS TOOL WHEN:
- You need to read and analyze web page content
- You need to extract information from websites
- You need to get text content from documentation, articles, or forums

FEATURES:
- Supports only HTTP and HTTPS protocols
- Fetches HTML, text, JSON, XML, and markdown content
- Automatically converts HTML to markdown for better readability
- Returns raw text content with MIME type information`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: FetchUrlInput,
    context: ToolExecutionContext,
  ): Promise<FetchUrlOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    const { url, maxLength = 50000 } = input;

    // Validate URL scheme
    const urlObj = new URL(url);
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isError: true, message: "Only HTTP and HTTPS URLs are supported" };
    }

    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    let isTimeout = false;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        isTimeout = true;
        controller.abort();
      }, 30000);

      if (context.signal) {
        context.signal.addEventListener("abort", () => {
          if (!isTimeout) controller.abort();
        });
      }

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { "User-Agent": "sara/1.0 (https://github.com/calenard-works/sara-agent)" },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { isError: true, message: `HTTP ${response.status}: ${response.statusText}` };
      }

      if (context.signal?.aborted) {
        return { isError: true, isAborted: true, message: "Aborted" };
      }

      const contentType = response.headers.get("content-type") || "";
      const mimeType = parseContentType(contentType);

      if (!isSupportedTextContent(contentType)) {
        return { isError: true, message: `Content type ${mimeType || "unknown"} is not supported. Only text-based content can be fetched.` };
      }

      const content = await response.text();

      if (context.signal?.aborted) {
        return { isError: true, isAborted: true, message: "Aborted" };
      }

      let processedContent = content;
      let finalMimeType = mimeType;

      if (isHtmlContent(contentType)) {
        try {
          const turndownService = new TurndownService({
            headingStyle: "atx",
            bulletListMarker: "-",
            codeBlockStyle: "fenced",
            fence: "```",
          });
          turndownService.remove(["script", "style", "iframe", "img", "video", "audio", "noscript", "canvas"]);
          processedContent = turndownService.turndown(content);
          finalMimeType = "text/markdown";
        } catch (error) {
          return { isError: true, message: `Failed to convert HTML to markdown: ${error instanceof Error ? error.message : "Unknown error"}` };
        }
      }

      let finalContent = processedContent;
      if (maxLength && finalContent.length > maxLength) {
        finalContent = finalContent.substring(0, maxLength) + "\n\n[Content truncated due to length limit]";
      }

      return { url: input.url, content: finalContent, mimeType: finalMimeType };
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return { isError: true, isAborted: true, message: isTimeout ? "Request timed out after 30 seconds" : "Aborted" };
        }
      }
      return { isError: true, message: `Failed to fetch URL: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};
