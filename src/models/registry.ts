/**
 * Model Registry
 *
 * Providers fetched online from models.dev/api.json with local caching.
 * Fallback baseURLs for major providers that don't have them in API data.
 */

import fs from "fs";
import path from "path";
import os from "os";

export interface ModelEntry {
  id: string;
  name: string;
}

export interface ProviderEntry {
  id: string;
  name: string;
  baseURL: string;
  envKeys: string[];
}

/**
 * Fallback baseURLs for providers that don't have them in models.dev API
 */
const FALLBACK_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  anthropic: "https://api.anthropic.com/v1",
  google: "https://generativelanguage.googleapis.com/v1beta/openai",
  groq: "https://api.groq.com/openai/v1",
  mistral: "https://api.mistral.ai/v1",
  xai: "https://api.x.ai/v1",
  deepseek: "https://api.deepseek.com/v1",
};

/**
 * Embedded fallback providers — used when models.dev is unreachable
 * and no cache exists. Covers the most common providers so the app
 * remains functional without network access to the model registry.
 */
const EMBEDDED_FALLBACK: Record<string, any> = {
  openai: {
    name: "OpenAI",
    api: FALLBACK_BASE_URLS.openai,
    env: ["OPENAI_API_KEY"],
    models: {
      "gpt-4o": { id: "gpt-4o", name: "GPT-4o" },
      "gpt-4o-mini": { id: "gpt-4o-mini", name: "GPT-4o Mini" },
    },
  },
  anthropic: {
    name: "Anthropic",
    api: FALLBACK_BASE_URLS.anthropic,
    env: ["ANTHROPIC_API_KEY"],
    models: {
      "claude-sonnet-4": { id: "claude-sonnet-4", name: "Claude Sonnet 4" },
    },
  },
  deepseek: {
    name: "DeepSeek",
    api: FALLBACK_BASE_URLS.deepseek,
    env: ["DEEPSEEK_API_KEY"],
    models: {
      "deepseek-chat": { id: "deepseek-chat", name: "DeepSeek V3" },
    },
  },
  opencode: {
    name: "OpenCode Zen",
    api: "https://opencode.ai/zen/v1",
    env: ["OPENCODE_API_KEY"],
    models: {
      "deepseek-v4-flash": {
        id: "deepseek-v4-flash",
        name: "DeepSeek V4 Flash",
      },
    },
  },
};

const MODELS_CACHE_URL = "https://models.dev/api.json";
const CACHE_DIR = path.join(os.homedir(), ".sara");
const CACHE_FILE = path.join(CACHE_DIR, "models-cache.json");
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

interface ModelsCache {
  fetchedAt: number;
  data: Record<string, any>;
}

function readCache(): ModelsCache | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    const raw = fs.readFileSync(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed.fetchedAt && parsed.data) return parsed;
    return null;
  } catch {
    return null;
  }
}

function writeCache(data: Record<string, any>): void {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    const cache: ModelsCache = { fetchedAt: Date.now(), data };
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache), "utf8");
  } catch {}
}

function isCacheValid(cache: ModelsCache): boolean {
  return Date.now() - cache.fetchedAt < CACHE_MAX_AGE_MS;
}

async function fetchAllData(): Promise<Record<string, any>> {
  const cached = readCache();
  if (cached && isCacheValid(cached)) {
    return cached.data;
  }

  try {
    const response = await fetch(MODELS_CACHE_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const data = (await response.json()) as Record<string, any>;
    writeCache(data);
    return data;
  } catch {
    // Network or parse error — use embedded fallback if cache exists,
    // otherwise use the minimal embedded fallback
    if (cached) {
      return cached.data;
    }
    return EMBEDDED_FALLBACK;
  }
}

/**
 * Parse provider entry from raw API data
 */
function parseProvider(id: string, raw: any): ProviderEntry | null {
  if (!raw || typeof raw !== "object") return null;

  const name = raw.name || id;
  // Use API baseURL, or fallback for known providers
  const baseURL = raw.api || FALLBACK_BASE_URLS[id] || "";
  const envKeys: string[] = Array.isArray(raw.env) ? raw.env : [];

  // Skip providers with no way to authenticate
  if (!baseURL && envKeys.length === 0) return null;

  return { id, name, baseURL, envKeys };
}

/**
 * Get all providers (sorted alphabetically)
 */
export async function getAllProviders(): Promise<ProviderEntry[]> {
  const data = await fetchAllData();
  const providers: ProviderEntry[] = [];

  for (const [id, raw] of Object.entries(data)) {
    const provider = parseProvider(id, raw);
    if (provider) {
      providers.push(provider);
    }
  }

  providers.sort((a, b) => a.name.localeCompare(b.name));
  return providers;
}

/**
 * Get provider by ID
 */
export async function getProvider(
  id: string,
): Promise<ProviderEntry | undefined> {
  const providers = await getAllProviders();
  return providers.find((p) => p.id === id);
}

/**
 * Fetch ALL models for a provider (no filtering)
 */
export async function fetchAllProviderModels(
  providerId: string,
): Promise<ModelEntry[]> {
  const data = await fetchAllData();
  const provider = data[providerId];
  if (!provider || !provider.models) {
    return [];
  }

  const entries = Object.values(provider.models) as any[];
  // Sort alphabetically by name
  entries.sort((a, b) => (a.name || a.id).localeCompare(b.name || b.id));

  return entries.map((m) => ({
    id: m.id,
    name: m.name || m.id,
  }));
}

/**
 * Get configured providers (those with saved API keys)
 */
export async function getConfiguredProviders(): Promise<ProviderEntry[]> {
  const { ConfigManager } = await import("../config");
  const allProviders = await getAllProviders();
  const configured: ProviderEntry[] = [];

  for (const p of allProviders) {
    const apiKey = ConfigManager.getApiKey(p.id);
    if (apiKey) {
      configured.push(p);
    }
  }

  return configured;
}
