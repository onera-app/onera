import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * useScrollToBottom - Smooth scroll handling for streaming chat
 *
 * Key behaviors:
 * 1. When streaming starts: user message anchors near the top
 * 2. As content streams: viewport follows with smooth, continuous scrolling
 * 3. User scroll: respects manual scrolling, pauses auto-scroll
 * 4. No jarring jumps: uses lerp-based animation for fluid motion
 */
export function useScrollToBottom() {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  // Track scroll state
  const [isAtBottom, setIsAtBottom] = useState(true);

  // Refs for scroll tracking
  const isAtBottomRef = useRef(true);
  const isUserScrollingRef = useRef(false);
  const userScrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Smooth scroll animation refs
  const animationFrameRef = useRef<number | null>(null);
  const lastScrollHeightRef = useRef(0);
  const isAutoScrollingRef = useRef(false);
  const currentScrollRef = useRef(0);
  
  // Debounce ref for mutation observer
  const mutationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingMutationRef = useRef(false);

  // Configuration
  const SCROLL_THRESHOLD = 200; // Generous threshold for "at bottom" detection
  const USER_SCROLL_DEBOUNCE = 400; // Time before resuming auto-scroll after user scrolls
  const SCROLL_LERP = 0.12; // Smooth lerp factor (lower = smoother but slower)
  const MIN_SCROLL_DELTA = 0.5; // Minimum pixels to scroll per frame
  const MUTATION_DEBOUNCE = 16; // ~1 frame debounce for mutation observer

  // Check if container is scrolled to bottom
  const checkIsAtBottom = useCallback(() => {
    const container = containerRef.current;
    if (!container) return true;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    return distanceFromBottom <= SCROLL_THRESHOLD;
  }, []);

  // Smooth scroll animation loop
  const animateScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container || isUserScrollingRef.current) {
      animationFrameRef.current = null;
      isAutoScrollingRef.current = false;
      return;
    }

    const targetScroll = container.scrollHeight - container.clientHeight;
    const currentScroll = currentScrollRef.current;
    const diff = targetScroll - currentScroll;

    // If we're close enough, snap to target and stop
    if (Math.abs(diff) < MIN_SCROLL_DELTA) {
      container.scrollTop = targetScroll;
      currentScrollRef.current = targetScroll;
      animationFrameRef.current = null;
      isAutoScrollingRef.current = false;
      return;
    }

    // Lerp towards target for smooth motion
    const step = diff * SCROLL_LERP;
    const newScroll = currentScroll + Math.max(MIN_SCROLL_DELTA, Math.abs(step)) * Math.sign(step);
    
    container.scrollTop = newScroll;
    currentScrollRef.current = newScroll;

    // Continue animation
    animationFrameRef.current = requestAnimationFrame(animateScroll);
  }, []);

  // Start or update smooth scroll animation
  const startSmoothScroll = useCallback(() => {
    if (isUserScrollingRef.current) return;
    
    const container = containerRef.current;
    if (!container) return;

    // Initialize current scroll position if not animating
    if (!isAutoScrollingRef.current) {
      currentScrollRef.current = container.scrollTop;
    }

    isAutoScrollingRef.current = true;

    // Start animation if not already running
    if (!animationFrameRef.current) {
      animationFrameRef.current = requestAnimationFrame(animateScroll);
    }
  }, [animateScroll]);

  // Manual scroll to bottom
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    const container = containerRef.current;
    if (!container) return;

    const targetScroll = container.scrollHeight - container.clientHeight;

    if (behavior === 'instant') {
      container.scrollTop = targetScroll;
      currentScrollRef.current = targetScroll;
      return;
    }

    // Use smooth animation
    currentScrollRef.current = container.scrollTop;
    startSmoothScroll();
  }, [startSmoothScroll]);

  // Handle user scroll events
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    let scrollRafId: number | null = null;

    const handleScroll = () => {
      // Throttle scroll handling to once per frame to avoid layout thrashing
      if (scrollRafId) return;
      
      scrollRafId = requestAnimationFrame(() => {
        scrollRafId = null;
        
        const atBottom = checkIsAtBottom();

        // Update state and ref
        isAtBottomRef.current = atBottom;
        setIsAtBottom(atBottom);

        // Track current scroll position
        if (!isAutoScrollingRef.current) {
          currentScrollRef.current = container.scrollTop;
        }

        // Detect user scrolling (not auto-scroll)
        if (!isAutoScrollingRef.current) {
          isUserScrollingRef.current = true;

          // Cancel any ongoing auto-scroll
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
          }

          // Clear existing timeout
          if (userScrollTimeoutRef.current) {
            clearTimeout(userScrollTimeoutRef.current);
          }

          // Resume auto-scroll after debounce if user scrolled to bottom
          userScrollTimeoutRef.current = setTimeout(() => {
            isUserScrollingRef.current = false;
            // If user scrolled to bottom, resume following
            if (isAtBottomRef.current) {
              startSmoothScroll();
            }
          }, USER_SCROLL_DEBOUNCE);
        }
      });
    };

    container.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollRafId) {
        cancelAnimationFrame(scrollRafId);
      }
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [checkIsAtBottom, startSmoothScroll]);

  // Auto-scroll on content changes during streaming
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleContentChange = () => {
      const currentScrollHeight = container.scrollHeight;
      const heightDelta = currentScrollHeight - lastScrollHeightRef.current;
      lastScrollHeightRef.current = currentScrollHeight;

      // Only auto-scroll if:
      // 1. User was at/near bottom before the change
      // 2. Not currently manually scrolling
      // 3. Content grew (positive delta)
      if (isAtBottomRef.current && !isUserScrollingRef.current && heightDelta > 0) {
        startSmoothScroll();
      }
    };
    
    // Debounced handler for mutations - coalesces rapid changes into one check
    const debouncedContentChange = () => {
      pendingMutationRef.current = true;
      
      if (mutationDebounceRef.current) return; // Already scheduled
      
      mutationDebounceRef.current = setTimeout(() => {
        mutationDebounceRef.current = null;
        if (pendingMutationRef.current) {
          pendingMutationRef.current = false;
          handleContentChange();
        }
      }, MUTATION_DEBOUNCE);
    };

    // Initialize
    lastScrollHeightRef.current = container.scrollHeight;
    currentScrollRef.current = container.scrollTop;

    // MutationObserver for DOM changes - only watch structural changes, not character data
    // Character data changes are too frequent during streaming and cause performance issues
    const mutationObserver = new MutationObserver(debouncedContentChange);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
      // Removed characterData: true - it fires too frequently during streaming
    });

    // ResizeObserver for size changes (already throttled by browser)
    const resizeObserver = new ResizeObserver(handleContentChange);
    resizeObserver.observe(container);

    return () => {
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      if (mutationDebounceRef.current) {
        clearTimeout(mutationDebounceRef.current);
      }
    };
  }, [startSmoothScroll]);

  return {
    containerRef,
    endRef,
    isAtBottom,
    scrollToBottom,
  };
}
