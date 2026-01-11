import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore, SIDEBAR_MIN_WIDTH, SIDEBAR_MAX_WIDTH } from '@/stores/uiStore';
import { cn } from '@/lib/utils';

export function ResizeHandle() {
  const { sidebarWidth, setSidebarWidth, sidebarOpen } = useUIStore();
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = sidebarWidth;
    },
    [sidebarWidth]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;

      const delta = e.clientX - startXRef.current;
      const newWidth = startWidthRef.current + delta;

      // Clamp between min and max
      const clampedWidth = Math.min(SIDEBAR_MAX_WIDTH, Math.max(SIDEBAR_MIN_WIDTH, newWidth));
      setSidebarWidth(clampedWidth);
    },
    [isDragging, setSidebarWidth]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Global event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Don't render if sidebar is collapsed
  if (!sidebarOpen) return null;

  return (
    <div
      className={cn(
        'w-1 flex-shrink-0 cursor-col-resize relative group',
        'hover:bg-accent/20 transition-colors duration-150',
        isDragging && 'bg-accent/30'
      )}
      onMouseDown={handleMouseDown}
    >
      {/* Visual indicator on hover/drag */}
      <div
        className={cn(
          'absolute inset-y-0 -left-0.5 w-1 rounded-full transition-opacity duration-150',
          'bg-accent opacity-0 group-hover:opacity-100',
          isDragging && 'opacity-100'
        )}
      />
    </div>
  );
}
