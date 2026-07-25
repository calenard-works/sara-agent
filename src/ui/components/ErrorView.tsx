import { Box, Text } from "ink";
import { getCurrentTheme } from "../theme";

export interface ErrorViewProps {
  message: string;
}

/**
 * Enhanced error display component with configuration-specific suggestions
 */
export function ErrorView({ message }: ErrorViewProps) {
  // Generate helpful suggestions based on common error patterns
  const getErrorSuggestion = (errorMessage: string): string[] => {
    const suggestions: string[] = [];
    const lowerMessage = errorMessage.toLowerCase();

    // API key related errors
    if (
      lowerMessage.includes("401") ||
      lowerMessage.includes("unauthorized") ||
      lowerMessage.includes("authentication")
    ) {
      suggestions.push("💡 Check your API key configuration");
      suggestions.push(
        "   • Set SARA_API_KEY environment variable (highest priority)",
      );
      suggestions.push(
        "   • Or set provider-specific: DEEPSEEK_API_KEY, GLM_API_KEY, or OPENAI_API_KEY",
      );
    }

    // Model not found errors
    if (
      lowerMessage.includes("404") ||
      lowerMessage.includes("model not found") ||
      lowerMessage.includes("not found")
    ) {
      suggestions.push("💡 Check model name and availability");
      suggestions.push("   • Verify the model exists for your API provider");
      suggestions.push(
        "   • Try: sara config set llm.model 'correct-model-name'",
      );
    }

    // Network/connection errors
    if (
      lowerMessage.includes("network") ||
      lowerMessage.includes("connection") ||
      lowerMessage.includes("timeout") ||
      lowerMessage.includes("enotfound")
    ) {
      suggestions.push("💡 Check network connectivity and base URL");
      suggestions.push("   • Verify internet connection");
      suggestions.push(
        "   • Set base URL: sara config set llm.baseURL 'https://api.example.com/v1'",
      );
    }

    // Rate limit errors
    if (
      lowerMessage.includes("429") ||
      lowerMessage.includes("rate limit") ||
      lowerMessage.includes("too many requests")
    ) {
      suggestions.push("💡 Rate limit exceeded");
      suggestions.push("   • Wait a moment before retrying");
      suggestions.push("   • Check your API quota and billing status");
    }

    return suggestions;
  };

  const suggestions = getErrorSuggestion(message);

  return (
    <Box flexDirection="column">
      <Box>
        <Text color={getCurrentTheme().error} bold>
          ⚠️ Error: {message}
        </Text>
      </Box>

      {suggestions.map((suggestion, index) => (
        <Box key={index}>
          <Text color={getCurrentTheme().secondary}>{suggestion}</Text>
        </Box>
      ))}
    </Box>
  );
}

export default ErrorView;
