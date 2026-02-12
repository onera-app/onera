/**
 * Search Provider Implementations
 * All providers make direct client-side API calls for E2EE compliance
 */

import type {
  SearchProviderInterface,
  SearchOptions,
  SearchResult,
  SearchProviderType,
} from './types';

const DEFAULT_MAX_RESULTS = 5;

interface ExaResult {
  title?: string;
  url: string;
  text?: string;
  highlights?: string[];
  publishedDate?: string;
  score?: number;
}

interface BraveResult {
  title?: string;
  url: string;
  description?: string;
  age?: string;
}

interface TavilyResult {
  title?: string;
  url: string;
  content?: string;
  raw_content?: string;
  score?: number;
}

interface SerperOrganicResult {
  title?: string;
  link: string;
  snippet?: string;
  date?: string;
}

interface FirecrawlResult {
  title?: string;
  url: string;
  description?: string;
  markdown?: string;
  metadata?: {
    title?: string;
    description?: string;
  };
}

/**
 * Exa Search Provider
 * https://docs.exa.ai
 */
export const exaProvider: SearchProviderInterface = {
  id: 'exa',
  name: 'Exa',

  async search(
    query: string,
    apiKey: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify({
        query,
        numResults: options?.maxResults || DEFAULT_MAX_RESULTS,
        useAutoprompt: true,
        type: 'neural',
        contents: options?.includeContent
          ? { text: { maxCharacters: 2000 } }
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Exa search failed: ${error}`);
    }

    const data = (await response.json()) as { results?: ExaResult[] };

    return (data.results || []).map((r) => ({
      title: r.title || 'Untitled',
      url: r.url,
      snippet: r.text?.substring(0, 300) || r.highlights?.[0] || '',
      content: r.text,
      publishedDate: r.publishedDate,
      score: r.score,
    }));
  },
};

/**
 * Brave Search Provider
 * https://brave.com/search/api/
 */
export const braveProvider: SearchProviderInterface = {
  id: 'brave',
  name: 'Brave Search',

  async search(
    query: string,
    apiKey: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const params = new URLSearchParams({
      q: query,
      count: String(options?.maxResults || DEFAULT_MAX_RESULTS),
    });

    const response = await fetch(
      `https://api.search.brave.com/res/v1/web/search?${params}`,
      {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Brave search failed: ${error}`);
    }

    const data = (await response.json()) as { web?: { results?: BraveResult[] } };

    return (data.web?.results || []).map((r) => ({
      title: r.title || 'Untitled',
      url: r.url,
      snippet: r.description || '',
      publishedDate: r.age,
    }));
  },
};

/**
 * Tavily Search Provider
 * https://tavily.com
 */
export const tavilyProvider: SearchProviderInterface = {
  id: 'tavily',
  name: 'Tavily',

  async search(
    query: string,
    apiKey: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: options?.maxResults || DEFAULT_MAX_RESULTS,
        include_answer: false,
        include_raw_content: options?.includeContent || false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Tavily search failed: ${error}`);
    }

    const data = (await response.json()) as { results?: TavilyResult[] };

    return (data.results || []).map((r) => ({
      title: r.title || 'Untitled',
      url: r.url,
      snippet: r.content?.substring(0, 300) || '',
      content: r.raw_content,
      score: r.score,
    }));
  },
};

/**
 * Serper Search Provider (Google Search API)
 * https://serper.dev
 */
export const serperProvider: SearchProviderInterface = {
  id: 'serper',
  name: 'Serper',

  async search(
    query: string,
    apiKey: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': apiKey,
      },
      body: JSON.stringify({
        q: query,
        num: options?.maxResults || DEFAULT_MAX_RESULTS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Serper search failed: ${error}`);
    }

    const data = (await response.json()) as { organic?: SerperOrganicResult[] };

    return (data.organic || []).map((r) => ({
      title: r.title || 'Untitled',
      url: r.link,
      snippet: r.snippet || '',
      publishedDate: r.date,
    }));
  },
};

/**
 * Firecrawl Search Provider
 * https://firecrawl.dev
 */
export const firecrawlProvider: SearchProviderInterface = {
  id: 'firecrawl',
  name: 'Firecrawl',

  async search(
    query: string,
    apiKey: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const response = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        query,
        limit: options?.maxResults || DEFAULT_MAX_RESULTS,
        scrapeOptions: options?.includeContent
          ? { formats: ['markdown'] }
          : undefined,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Firecrawl search failed: ${error}`);
    }

    const data = (await response.json()) as { data?: FirecrawlResult[] };

    return (data.data || []).map((r) => ({
      title: r.title || r.metadata?.title || 'Untitled',
      url: r.url,
      snippet: r.description || r.metadata?.description || '',
      content: r.markdown,
    }));
  },
};

/**
 * All providers registry
 */
export const searchProviders: Record<SearchProviderType, SearchProviderInterface> = {
  exa: exaProvider,
  brave: braveProvider,
  tavily: tavilyProvider,
  serper: serperProvider,
  firecrawl: firecrawlProvider,
};

/**
 * Get a provider by ID
 */
export function getSearchProvider(
  id: SearchProviderType
): SearchProviderInterface | undefined {
  return searchProviders[id];
}
