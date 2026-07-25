import { z } from "zod";
import { Tool, ToolErrorResult, ToolExecutionContext } from "./types";

const InputSchema = z.object({
  query: z.string().min(1).describe("Search query"),
  maxResults: z
    .number()
    .min(1)
    .max(20)
    .default(5)
    .describe("Maximum number of search results to return (default: 5, max: 20)"),
});

export type WebSearchInput = {
  query: string;
  maxResults?: number;
};

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

type WebSearchOutput =
  | {
      query: string;
      results: SearchResult[];
      totalResults: number;
    }
  | ToolErrorResult;

/**
 * Parse DuckDuckGo HTML search results page to extract titles, URLs and snippets.
 */
function parseDuckDuckGoResults(html: string, maxResults: number): SearchResult[] {
  const results: SearchResult[] = [];

  // DuckDuckGo HTML structure: each result is in a <div class="result"> with
  // <a class="result__a"> for the title/link and <a class="result__snippet"> for the snippet
  // or sometimes results are in <div class="results_links">
  
  // Match result blocks: look for result__a (title) followed by result__snippet (description)
  const resultBlocks = html.split('<div class="result ');
  
  // Skip first (before first result)
  for (let i = 1; i < resultBlocks.length && results.length < maxResults; i++) {
    const block = resultBlocks[i];
    
    // Extract title and URL from the anchor tag
    const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/);
    if (!titleMatch) continue;
    
    let url = titleMatch[1];
    const titleRaw = titleMatch[2].replace(/<[^>]+>/g, "").trim();
    
    // Extract snippet
    const snippetMatch = block.match(/<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const snippet = snippetMatch
      ? snippetMatch[1].replace(/<[^>]+>/g, "").trim()
      : "";
    
    // Clean up DuckDuckGo redirect URLs
    if (url.startsWith("//")) url = "https:" + url;
    
    results.push({
      title: titleRaw || url,
      url,
      snippet,
    });
  }

  // If no results found with the main class, try the alternative structure
  if (results.length === 0) {
    const altBlocks = html.split('<div class="results_links');
    for (let i = 1; i < altBlocks.length && results.length < maxResults; i++) {
      const block = altBlocks[i];
      
      const links = [...block.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)];
      for (const match of links) {
        if (results.length >= maxResults) break;
        const title = match[2].replace(/<[^>]+>/g, "").trim();
        if (title) {
          results.push({ title, url: match[1], snippet: "" });
        }
      }
      
      // Try to get snippets from the block
      const snippets = [...block.matchAll(/<span[^>]*class="[^"]*snippet[^"]*"[^>]*>([\s\S]*?)<\/span>/g)];
      for (let si = 0; si < snippets.length && si < results.length; si++) {
        results[si].snippet = snippets[si][1].replace(/<[^>]+>/g, "").trim();
      }
    }
  }

  return results;
}

export const WebSearchTool: Tool<WebSearchInput, WebSearchOutput> = {
  name: "WebSearch",
  displayName: "Web Search",
  description: `Search the web using DuckDuckGo.
Use this to find current information, news, documentation, and web pages.

The tool returns a list of search results with titles, URLs, and short snippets.
After getting the results, use FetchURL to read the full content of any interesting page.`,
  readonly: true,
  inputSchema: InputSchema,

  async execute(
    input: WebSearchInput,
    context: ToolExecutionContext,
  ): Promise<WebSearchOutput> {
    if (context.signal?.aborted) {
      return { isError: true, isAborted: true, message: "Aborted" };
    }

    const { query, maxResults = 5 } = input;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    try {
      if (context.signal) {
        context.signal.addEventListener("abort", () => controller.abort());
      }

      const response = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
        body: new URLSearchParams({ q: query }),
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; sara-agent/1.0)",
          "Content-Type": "application/x-www-form-urlencoded",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return { isError: true, message: `DuckDuckGo returned HTTP ${response.status}` };
      }

      const html = await response.text();

      if (context.signal?.aborted) {
        return { isError: true, isAborted: true, message: "Aborted" };
      }

      const results = parseDuckDuckGoResults(html, maxResults);

      return {
        query,
        results,
        totalResults: results.length,
      };
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          return { isError: true, isAborted: true, message: "Search request timed out" };
        }
      }
      return { isError: true, message: `Search failed: ${error instanceof Error ? error.message : "Unknown error"}` };
    }
  },
};
