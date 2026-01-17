import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useScrollToBottom - Vercel AI Chatbot-style scroll handling
 *
 * Uses MutationObserver + ResizeObserver for detecting DOM changes instead of
 * useEffect on messages array. This provides better performance and accuracy.
 *
 * Features:
 * - MutationObserver: detects DOM changes (new messages, content updates)
 * - ResizeObserver: detects size changes (images loading, code blocks expanding)
 * - User scroll detection: 150ms debounced flag to not interrupt manual scrolling
 * - 100px threshold: "at bottom" detection with tolerance
 * - Refs for state: avoids stale closures in callbacks
 */
export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Track scroll state
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Refs to avoid stale closures in observers
  const isAtBottomRef = useRef(true);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Threshold for "at bottom" detection (pixels from bottom)
  const SCROLL_THRESHOLD = 100;
  // Debounce time for user scroll detection (ms)
  const USER_SCROLL_DEBOUNCE = 150;

  // Check if container is scrolled to bottom
  const checkIsAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  // Scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    endRef.current?.scrollIntoView({ behavior, block: 'end' });
  }, []);

  // Handle scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const atBottom = checkIsAtBottom();

      // Update state and ref
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);

      // Mark user as scrolling (debounced)
      isUserScrollingRef.current = true;

      // Clear existing timeout
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }

      // Reset user scrolling flag after debounce period
      userScrollTimeoutRef.current = setTimeout(() => {
        isUserScrollingRef.current = false;
      }, USER_SCROLL_DEBOUNCE);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
    };
  }, [checkIsAtBottom]);

  // Auto-scroll on DOM mutations and size changes
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleDOMChange = () => {
      // Only auto-scroll if user was at bottom and not currently scrolling
      if (isAtBottomRef.current && !isUserScrollingRef.current) {
        // Use requestAnimationFrame for smooth scrolling
        requestAnimationFrame(() => {
          scrollToBottom('smooth');
        });
      }
    };

    // MutationObserver for DOM changes (new messages, content updates)
    const mutationObserver = new MutationObserver(handleDOMChange);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // ResizeObserver for size changes (images loading, code blocks expanding)
    const resizeObserver = new ResizeObserver(handleDOMChange);
    resizeObserver.observe(container);

    // Also observe the end marker for size changes
    if (endRef.current) {
      resizeObserver.observe(endRef.current);
    }

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
    };
  }, [scrollToBottom]);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
  };
}
