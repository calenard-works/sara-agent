import { Box, Text } from "ink";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResultViewProps {
  result: {
    query: string;
    results: SearchResult[];
    totalResults: number;
  };
}

export function WebSearchResultView({ result }: WebSearchResultViewProps) {
  const { query, results, totalResults } = result;

  if (results.length === 0) {
    return (
      <Box flexDirection="column">
        <Box marginBottom={1}>
          <Text bold>Search: </Text>
          <Text>{query}</Text>
        </Box>
        <Text dimColor>No results found</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold>Search: </Text>
        <Text>{query}</Text>
        <Text dimColor> ({totalResults} results)</Text>
      </Box>
      {results.map((r, idx) => (
        <Box key={idx} flexDirection="column" marginBottom={1}>
          <Text>
            <Text bold color="cyan">
              {idx + 1}.
            </Text>
            {' '}
            <Text bold>{r.title}</Text>
          </Text>
          <Text dimColor>{r.url}</Text>
          {r.snippet && (
            <Text color="gray">{r.snippet}</Text>
          )}
        </Box>
      ))}
    </Box>
  );
}

export default WebSearchResultView;
