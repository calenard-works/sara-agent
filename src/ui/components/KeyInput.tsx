import { useState, useRef, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import chalk from "chalk";

import { getCurrentTheme } from "../theme";

interface KeyInputProps {
  providerName: string;
  onSubmit: (apiKey: string) => void;
  onCancel: () => void;
}

export function KeyInput({ providerName, onSubmit, onCancel }: KeyInputProps) {
  const [value, setValue] = useState("");
  const cursorRef = useRef(0);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }

    if (key.return) {
      if (value.trim().length > 0) {
        onSubmit(value.trim());
      }
      return;
    }

    if (key.backspace || key.delete) {
      if (cursorRef.current > 0) {
        const newValue =
          value.slice(0, cursorRef.current - 1) +
          value.slice(cursorRef.current);
        cursorRef.current--;
        setValue(newValue);
      }
      return;
    }

    if (key.leftArrow) {
      cursorRef.current = Math.max(0, cursorRef.current - 1);
      return;
    }

    if (key.rightArrow) {
      cursorRef.current = Math.min(value.length, cursorRef.current + 1);
      return;
    }

    // Regular character input
    if (input && !key.ctrl && !key.meta) {
      const newValue =
        value.slice(0, cursorRef.current) +
        input +
        value.slice(cursorRef.current);
      cursorRef.current += input.length;
      setValue(newValue);
    }
  });

  // Render with cursor — mask all characters
  const renderedValue =
    value.length === 0
      ? chalk.inverse(" ")
      : (() => {
          let result = "";
          for (let i = 0; i < value.length; i++) {
            const maskChar = "*";
            if (i === cursorRef.current) {
              result += chalk.inverse(maskChar);
            } else {
              result += maskChar;
            }
          }
          if (cursorRef.current >= value.length) {
            result += chalk.inverse(" ");
          }
          return result;
        })();

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text color={getCurrentTheme().brand} bold>
        Enter API key for {providerName}:
      </Text>
      <Text dimColor>(key is masked for security; paste and press Enter)</Text>
      <Box
        marginTop={1}
        borderStyle="round"
        borderColor={getCurrentTheme().secondary}
        paddingX={1}
      >
        <Text>{renderedValue}</Text>
      </Box>
      <Box marginTop={1}>
        <Text color={getCurrentTheme().secondary} dimColor>
          Enter confirm Esc cancel
        </Text>
      </Box>
    </Box>
  );
}
