/**
 * Search Client
 * Handles search execution with provider selection and result formatting
 */

import { getSearchProvider, searchProviders } from './providers';
import type {
  SearchResult,
  SearchProviderType,
  SearchOptions,
  SearchExecutionResult,
} from './types';
import { useToolsStore, getPreferredSearchProvider } from '@/stores/toolsStore';

/**
 * Execute a search query
 */
export async function executeSearch(
  query: string,
  providerId?: SearchProviderType,
  options?: SearchOptions
): Promise<SearchExecutionResult> {
  const store = useToolsStore.getState();

  // Determine which provider to use
  let targetProvider: SearchProviderType | undefined = providerId;

  if (!targetProvider) {
    // Auto-select: use default or first configured
    const preferred = getPreferredSearchProvider();
    targetProvider = preferred ?? undefined;
  }

  if (!targetProvider) {
    throw new Error('No search provider configured');
  }

  // Get the provider implementation
  const provider = getSearchProvider(targetProvider);
  if (!provider) {
    throw new Error(`Unknown search provider: ${targetProvider}`);
  }

  // Get the API key
  const apiKey = store.getProviderApiKey(targetProvider);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider.name}`);
  }

  // Execute the search
  const results = await provider.search(query, apiKey, options);

  return {
    provider: targetProvider,
    query,
    results,
    timestamp: Date.now(),
  };
}

/**
 * Auto-detect if a query would benefit from web search
 * Uses simple heuristics - can be enhanced with AI detection
 */
export function shouldAutoSearch(query: string): boolean {
  const lowerQuery = query.toLowerCase();

  // Keywords that suggest need for current information
  const currentInfoKeywords = [
    'latest',
    'recent',
    'today',
    'yesterday',
    'this week',
    'this month',
    'this year',
    'current',
    'now',
    'new',
    'update',
    'news',
    '2024',
    '2025',
    '2026',
  ];

  // Keywords that suggest research/lookup
  const researchKeywords = [
    'what is',
    'who is',
    'how to',
    'why does',
    'when did',
    'where is',
    'explain',
    'define',
    'meaning of',
    'difference between',
  ];

  // Keywords that suggest factual queries
  const factualKeywords = [
    'price',
    'cost',
    'weather',
    'stock',
    'score',
    'result',
    'winner',
    'release date',
    'schedule',
    'hours',
    'address',
    'phone',
    'contact',
  ];

  // Check for matches
  const hasCurrentInfo = currentInfoKeywords.some((k) =>
    lowerQuery.includes(k)
  );
  const hasResearch = researchKeywords.some((k) => lowerQuery.includes(k));
  const hasFactual = factualKeywords.some((k) => lowerQuery.includes(k));

  // Also check for URLs or domains
  const hasUrl = /https?:\/\/|www\./i.test(query);

  return hasCurrentInfo || hasResearch || hasFactual || hasUrl;
}

/**
 * Format search results for injection into LLM context
 */
export function formatSearchResultsForContext(
  results: SearchResult[],
  query: string
): string {
  if (results.length === 0) {
    return '';
  }

  const formattedResults = results
    .map((r, i) => {
      let result = `[${i + 1}] ${r.title}\nURL: ${r.url}`;
      if (r.snippet) {
        result += `\n${r.snippet}`;
      }
      if (r.content) {
        // Include truncated content if available
        const content =
          r.content.length > 500 ? r.content.substring(0, 500) + '...' : r.content;
        result += `\n\nContent:\n${content}`;
      }
      return result;
    })
    .join('\n\n---\n\n');

  return `<search_results query="${query}">
${formattedResults}
</search_results>`;
}

/**
 * Get list of available (configured) providers
 */
export function getAvailableProviders(): Array<{
  id: SearchProviderType;
  name: string;
  isDefault: boolean;
}> {
  const store = useToolsStore.getState();
  const configured = store.getConfiguredProviders();
  const defaultProvider = store.defaultSearchProvider;

  return configured.map((id) => ({
    id,
    name: searchProviders[id]?.name || id,
    isDefault: id === defaultProvider,
  }));
}

/**
 * Check if any search provider is configured
 */
export function hasSearchCapability(): boolean {
  const store = useToolsStore.getState();
  return store.getConfiguredProviders().length > 0;
}
