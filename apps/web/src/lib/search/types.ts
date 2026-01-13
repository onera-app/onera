/**
 * Search Provider Types
 */

import type { SearchResult, SearchProvider as SearchProviderType } from '@onera/types';

export interface SearchOptions {
  maxResults?: number;
  includeContent?: boolean;
}

export interface SearchProviderInterface {
  id: SearchProviderType;
  name: string;

  /**
   * Execute a search query
   */
  search(
    query: string,
    apiKey: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;
}

export interface SearchExecutionResult {
  provider: SearchProviderType;
  query: string;
  results: SearchResult[];
  timestamp: number;
}

export { type SearchResult, type SearchProviderType };
