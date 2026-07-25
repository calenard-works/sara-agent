import chalk from "chalk";

import { ConfigManager } from "../config";

/**
 * Color palette definitions for dark and light themes.
 *
 * `darkColors` / `lightColors` are the semantic `ColorPalette` consumed by
 * every UI component. Each token holds its hex value directly.
 */
export interface ColorPalette {
  // ── Brand ──
  /** Dominant interactive/brand colour: links & inline code, the selected item
   *  in nearly every dialog, the focused editor border, plan/"running" badges,
   *  spinners. */
  primary: string;
  /** Secondary highlight: approval "▶" prefix, device-code box, image
   *  placeholder, BTW / queue panes. */
  accent: string;

  // ── Text ──
  /** Default body text: dialog bodies, todo titles, footer model label,
   *  markdown headings, tool/read output, and assistant-side message bullets. */
  text: string;
  /** Emphasised / bold text: input dialogs, status messages. */
  textStrong: string;
  /** Secondary, dimmed text: thinking blocks, hints, descriptions, completed
   *  todos, markdown quotes, and the footer status bar (cwd path, git badge). */
  textDim: string;
  /** Faintest text: counters, scroll info, descriptions, markdown link URLs,
   *  code-block borders. */
  textMuted: string;

  // ── Surface ──
  /** Borders: pane & editor borders, markdown horizontal rule. */
  border: string;
  /** Focus / attention border. */
  borderFocus: string;

  // ── State ──
  /** Success: ✓ marks, "enabled", completed states. */
  success: string;
  /** Warning: auto/yolo badges, stale markers, plan-mode hint. */
  warning: string;
  /** Error: error messages, failed tool output. */
  error: string;

  // ── Diff ──
  /** Added lines. */
  diffAdded: string;
  /** Removed lines. */
  diffRemoved: string;
  /** Added lines — intra-line changed words (bold). */
  diffAddedStrong: string;
  /** Removed lines — intra-line changed words (bold). */
  diffRemovedStrong: string;
  /** Line-number gutter. */
  diffGutter: string;
  /** Meta / hunk headers. */
  diffMeta: string;

  // ── Roles ──
  /** User message: bullet & text. */
  roleUser: string;

  // ── Shell mode ──
  /** Shell mode (`!`): the `!` prompt symbol, bash-mode editor border, and the
   *  echoed `$ command` line. Its own hue (violet). */
  shellMode: string;
}

export const darkColors: ColorPalette = {
  primary: "#4FA8FF",
  accent: "#5BC0BE",

  text: "#E0E0E0",
  textStrong: "#F5F5F5",
  textDim: "#888888",
  textMuted: "#6B6B6B",

  border: "#5A5A5A",
  borderFocus: "#E8A838",

  success: "#4EC87E",
  warning: "#E8A838",
  error: "#E85454",

  diffAdded: "#4EC87E",
  diffRemoved: "#E85454",
  diffAddedStrong: "#7AD99B",
  diffRemovedStrong: "#F08585",
  diffGutter: "#6B6B6B",
  diffMeta: "#888888",

  roleUser: "#FFCB6B",
  shellMode: "#BD93F9",
};

export const lightColors: ColorPalette = {
  primary: "#1565C0",
  accent: "#00838F",

  text: "#1A1A1A",
  textStrong: "#1A1A1A",
  textDim: "#454545",
  textMuted: "#5F5F5F",

  border: "#737373",
  borderFocus: "#92660A",

  success: "#0E7A38",
  warning: "#92660A",
  error: "#B91C1C",

  diffAdded: "#0E7A38",
  diffRemoved: "#B91C1C",
  diffAddedStrong: "#0E7A38",
  diffRemovedStrong: "#B91C1C",
  diffGutter: "#737373",
  diffMeta: "#5F5F5F",

  roleUser: "#9A4A00",
  shellMode: "#7C3AED",
};

export type ResolvedTheme = "dark" | "light";

/** Synchronous palette lookup for built-in themes only. */
export function getBuiltInPalette(resolved: ResolvedTheme): ColorPalette {
  return resolved === "dark" ? darkColors : lightColors;
}

export type ColorToken = keyof ColorPalette;

/**
 * Theme class with foreground/background helpers.
 * Components import `currentTheme` and call methods like
 * `currentTheme.fg('primary', text)` at render time.
 */
export class Theme {
  private _palette: ColorPalette;

  constructor(palette: ColorPalette) {
    this._palette = palette;
  }

  get palette(): ColorPalette {
    return this._palette;
  }

  setPalette(palette: ColorPalette): void {
    this._palette = palette;
  }

  color(token: ColorToken): string {
    return this._palette[token];
  }

  /* ── Foreground helpers ── */

  fg(token: ColorToken, text: string): string {
    return chalk.hex(this._palette[token])(text);
  }

  boldFg(token: ColorToken, text: string): string {
    return chalk.hex(this._palette[token]).bold(text);
  }

  dimFg(token: ColorToken, text: string): string {
    return chalk.hex(this._palette[token]).dim(text);
  }

  italicFg(token: ColorToken, text: string): string {
    return chalk.hex(this._palette[token]).italic(text);
  }

  underlineFg(token: ColorToken, text: string): string {
    return chalk.hex(this._palette[token]).underline(text);
  }

  strikethroughFg(token: ColorToken, text: string): string {
    return chalk.hex(this._palette[token]).strikethrough(text);
  }

  /* ── Background helpers ── */

  bg(token: ColorToken, text: string): string {
    return chalk.bgHex(this._palette[token])(text);
  }

  /* ── Standalone style helpers ── */

  bold(text: string): string {
    return chalk.bold(text);
  }

  dim(text: string): string {
    return chalk.dim(text);
  }

  italic(text: string): string {
    return chalk.italic(text);
  }

  underline(text: string): string {
    return chalk.underline(text);
  }

  strikethrough(text: string): string {
    return chalk.strikethrough(text);
  }
}

/** Global singleton. Initialise with dark palette. */
export const currentTheme = new Theme(darkColors);

/**
 * Backward-compatible theme type that includes legacy property names
 * (`brand`, `secondary`, `diff`) alongside the new semantic tokens.
 */
export type ThemeColors = ColorPalette & {
  brand: string;
  secondary: string;
  diff: { added: string; removed: string };
};

/**
 * Build a ThemeColors object from a ColorPalette, adding legacy aliases.
 */
function buildThemeColors(palette: ColorPalette): ThemeColors {
  return {
    ...palette,
    brand: palette.primary,
    secondary: palette.textDim,
    diff: {
      added: palette.diffAdded,
      removed: palette.diffRemoved,
    },
  };
}

/**
 * Get current theme palette based on global configuration.
 * Returns a ThemeColors object so components can access both
 * `getCurrentTheme().primary` and legacy `getCurrentTheme().brand`.
 *
 * Results are cached — the config is only re-read when `invalidateThemeCache()`
 * is called (e.g. after a config change via /config or /reload-tui).
 */
let themeCache: ThemeColors | null = null;

export function getCurrentTheme(): ThemeColors {
  if (themeCache !== null) return themeCache;
  const config = ConfigManager.load();
  const resolved: ResolvedTheme = config.theme === "light" ? "light" : "dark";
  const palette = getBuiltInPalette(resolved);
  currentTheme.setPalette(palette);
  themeCache = buildThemeColors(palette);
  return themeCache;
}

/** Invalidate the theme cache so the next `getCurrentTheme()` call re-reads config. */
export function invalidateThemeCache(): void {
  themeCache = null;
}
