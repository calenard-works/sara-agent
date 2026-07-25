import React from "react";
import { Box, Text } from "ink";
import { marked, Token, Tokens } from "marked";
import { getCurrentTheme } from "../theme";

export interface InkMarkdownProps {
  children: string;
}

/**
 * Markdown renderer for Ink using marked.
 *
 * Color scheme adapted from Kimi Code's MarkdownTheme:
 * - Headings: bold + primary color (h1 also underlined)
 * - Links: primary color, underlined
 * - Inline code: primary color
 * - Code blocks: green text with textMuted borders
 * - Blockquotes: textDim color, italic with textDim border
 * - Horizontal rules: border color
 * - List bullets: text color with • for unordered lists
 * - Bold/italic/strikethrough/underline: standard text decorations
 */
export function InkMarkdown({ children }: InkMarkdownProps) {
  const tokens = marked.lexer(children);

  return (
    <Box flexDirection="column">
      {tokens.map((token, idx) =>
        renderToken(token, idx, idx === tokens.length - 1),
      )}
    </Box>
  );
}

function renderToken(
  token: Token,
  key: number,
  isLast: boolean = false,
): React.ReactNode {
  const marginBottom = isLast ? 0 : 1;
  const theme = getCurrentTheme();

  switch (token.type) {
    case "heading":
      return (
        <Box key={key} marginBottom={token.depth <= 3 ? 1 : 0}>
          <Text bold color={theme.primary}>
            {token.depth === 1 ? (
              <Text underline>{token.text}</Text>
            ) : (
              token.text
            )}
          </Text>
        </Box>
      );

    case "paragraph":
      return (
        <Box key={key} marginBottom={marginBottom}>
          <Text>{renderInlineTokens(token.tokens || [])}</Text>
        </Box>
      );

    case "code":
      return (
        <Box
          key={key}
          marginBottom={marginBottom}
          flexDirection="column"
          borderStyle="round"
          borderColor={theme.textMuted}
          paddingX={1}
        >
          <Text color={theme.success}>{token.text}</Text>
        </Box>
      );

    case "list":
      return (
        <Box key={key} marginBottom={marginBottom} flexDirection="column">
          {token.items.map((item: Tokens.ListItem, i: number) => {
            // List items can have complex nested tokens structure
            let content: React.ReactNode;

            if (
              item.tokens.length === 1 &&
              item.tokens[0].type === "text" &&
              item.tokens[0].tokens
            ) {
              content = renderInlineTokens(item.tokens[0].tokens);
            } else {
              content = renderInlineTokens(item.tokens);
            }

            return (
              <Box key={i}>
                <Text color={theme.text}>
                  {token.ordered ? `${i + 1}.` : "•"}
                </Text>
                <Text> </Text>
                <Text>{content}</Text>
              </Box>
            );
          })}
        </Box>
      );

    case "blockquote":
      return (
        <Box
          key={key}
          marginBottom={marginBottom}
          borderStyle="round"
          borderColor={theme.textDim}
          paddingX={1}
        >
          <Text color={theme.textDim} italic>{token.text}</Text>
        </Box>
      );

    case "space":
      return <Box key={key} />;

    case "hr":
      return (
        <Box key={key} marginBottom={marginBottom} width="100%">
          <Text color={theme.border}>
            {Array.from(
              { length: process.stdout.columns - 12 },
              () => "─",
            ).join("")}
          </Text>
        </Box>
      );

    default:
      if ("raw" in token) {
        return <Text key={key}>{token.raw}</Text>;
      }
      return null;
  }
}

function renderInlineTokens(tokens: Token[]): React.ReactNode {
  const theme = getCurrentTheme();

  return tokens.map((token: Token, idx: number) => {
    switch (token.type) {
      case "text":
        // Check for interruption marker and highlight it
        if (token.text.includes("[Interrupted by User]")) {
          const parts = token.text.split("[Interrupted by User]");
          return (
            <React.Fragment key={idx}>
              {parts[0]}
              <Text color={theme.error} bold>
                [Interrupted by User]
              </Text>
              {parts[1]}
            </React.Fragment>
          );
        }
        return <React.Fragment key={idx}>{token.text}</React.Fragment>;

      case "strong":
        return (
          <Text key={idx} bold>
            {renderInlineTokens(token.tokens || [])}
          </Text>
        );

      case "em":
        return (
          <Text key={idx} italic>
            {renderInlineTokens(token.tokens || [])}
          </Text>
        );

      case "codespan":
        return (
          <Text key={idx} color={theme.primary}>{token.text}</Text>
        );

      case "link":
        return (
          <Text key={idx} underline color={theme.primary}>
            {token.text}
          </Text>
        );

      case "del":
        return (
          <Text key={idx} strikethrough>
            {renderInlineTokens(token.tokens || [])}
          </Text>
        );

      case "br":
        return <React.Fragment key={idx}>{"\n"}</React.Fragment>;

      default:
        if ("raw" in token) {
          return <React.Fragment key={idx}>{token.raw}</React.Fragment>;
        }
        return null;
    }
  });
}

export default InkMarkdown;
