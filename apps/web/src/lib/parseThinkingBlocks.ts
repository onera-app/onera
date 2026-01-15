/**
 * Thinking Block Parser
 * Parses AI model responses to extract thinking/reasoning blocks
 * Supports: <think>, <thinking>, <reason>, <reasoning> tags
 */

export interface ThinkingBlock {
  id: string;
  content: string;
  isComplete: boolean;
  duration?: number;
}

export interface ParsedContent {
  /** Content with thinking tags removed */
  displayContent: string;
  /** Extracted thinking blocks */
  thinkingBlocks: ThinkingBlock[];
  /** Whether any thinking block is still being streamed */
  isThinking: boolean;
}

// Supported thinking tags
const THINKING_TAGS = ['think', 'thinking', 'reason', 'reasoning'] as const;

// Build regex patterns
const COMPLETE_BLOCK_REGEX = new RegExp(
  `<(${THINKING_TAGS.join('|')})>([\\s\\S]*?)<\\/\\1>`,
  'gi'
);

const OPEN_TAG_REGEX = new RegExp(
  `<(${THINKING_TAGS.join('|')})>([\\s\\S]*)$`,
  'i'
);

/**
 * Parse content and extract thinking blocks
 * Handles both complete and incomplete (streaming) blocks
 */
export function parseThinkingBlocks(
  content: string,
  streamingStartTime?: number
): ParsedContent {
  if (!content) {
    return {
      displayContent: '',
      thinkingBlocks: [],
      isThinking: false,
    };
  }

  const thinkingBlocks: ThinkingBlock[] = [];
  let displayContent = content;
  let blockIndex = 0;

  // Find all complete thinking blocks
  const completeMatches = [...content.matchAll(COMPLETE_BLOCK_REGEX)];

  for (const match of completeMatches) {
    const fullMatch = match[0];
    const thinkingContent = match[2].trim();

    // Calculate duration if we have a start time
    const duration = streamingStartTime
      ? Math.round((Date.now() - streamingStartTime) / 1000)
      : undefined;

    thinkingBlocks.push({
      id: `thinking-${blockIndex++}`,
      content: thinkingContent,
      isComplete: true,
      duration,
    });

    // Remove the block from display content
    displayContent = displayContent.replace(fullMatch, '');
  }

  // Check for incomplete (still streaming) thinking block
  const openMatch = displayContent.match(OPEN_TAG_REGEX);
  let isThinking = false;

  if (openMatch) {
    const thinkingContent = openMatch[2].trim();

    thinkingBlocks.push({
      id: `thinking-${blockIndex++}`,
      content: thinkingContent,
      isComplete: false,
    });

    // Remove the incomplete block from display content
    displayContent = displayContent.replace(openMatch[0], '');
    isThinking = true;
  }

  // Clean up any extra whitespace from removed blocks
  displayContent = displayContent
    .replace(/^\s+/, '')  // Trim leading whitespace
    .replace(/\n{3,}/g, '\n\n');  // Collapse multiple newlines

  return {
    displayContent,
    thinkingBlocks,
    isThinking,
  };
}

/**
 * Format duration for display
 */
export function formatThinkingDuration(seconds: number): string {
  if (seconds < 1) {
    return 'Thought for less than a second';
  }
  if (seconds === 1) {
    return 'Thought for 1 second';
  }
  if (seconds < 60) {
    return `Thought for ${seconds} seconds`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (remainingSeconds === 0) {
    return `Thought for ${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return `Thought for ${minutes}m ${remainingSeconds}s`;
}

/**
 * Check if content contains any thinking tags (for quick check)
 */
export function hasThinkingContent(content: string): boolean {
  if (!content) return false;
  return THINKING_TAGS.some(
    (tag) => content.includes(`<${tag}>`) || content.includes(`</${tag}>`)
  );
}
