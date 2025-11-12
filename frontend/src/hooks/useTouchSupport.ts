/**
 * Hook for handling touch events on mobile devices
 */

import { useEffect, useState } from 'react';

interface TouchPosition {
  x: number;
  y: number;
}

/**
 * Detect if device supports touch events
 */
export function useTouchDevice() {
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setIsTouchDevice(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        (navigator as any).msMaxTouchPoints > 0
      );
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);

    return () => {
      window.removeEventListener('resize', checkTouch);
    };
  }, []);

  return isTouchDevice;
}

/**
 * Convert touch event to mouse-like position
 */
export function getTouchPosition(event: TouchEvent): TouchPosition | null {
  if (event.touches.length === 0) return null;

  const touch = event.touches[0];
  return {
    x: touch.clientX,
    y: touch.clientY,
  };
}

/**
 * Hook for handling drag operations with both mouse and touch
 */
export function useDragSupport(
  onDragStart?: (position: TouchPosition) => void,
  onDragMove?: (position: TouchPosition) => void,
  onDragEnd?: (position: TouchPosition) => void
) {
  const isTouchDevice = useTouchDevice();

  useEffect(() => {
    if (!isTouchDevice) return;

    let isDragging = false;
    let lastPosition: TouchPosition | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const position = getTouchPosition(e);
      if (!position) return;

      isDragging = true;
      lastPosition = position;
      onDragStart?.(position);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      const position = getTouchPosition(e);
      if (!position) return;

      e.preventDefault(); // Prevent scrolling while dragging
      lastPosition = position;
      onDragMove?.(position);
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isDragging) return;

      isDragging = false;
      if (lastPosition) {
        onDragEnd?.(lastPosition);
      }
    };

    // Add touch event listeners
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [isTouchDevice, onDragStart, onDragMove, onDragEnd]);

  return {
    isTouchDevice,
    getTouchPosition,
  };
}

/**
 * Hook for detecting pinch-to-zoom gestures
 */
export function usePinchZoom(
  onZoom?: (scale: number) => void,
  minScale: number = 0.5,
  maxScale: number = 3
) {
  const isTouchDevice = useTouchDevice();

  useEffect(() => {
    if (!isTouchDevice) return;

    let initialDistance = 0;
    let currentScale = 1;

    const getDistance = (touch1: Touch, touch2: Touch): number => {
      const dx = touch1.clientX - touch2.clientX;
      const dy = touch1.clientY - touch2.clientY;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        initialDistance = getDistance(e.touches[0], e.touches[1]);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault(); // Prevent browser zoom

        const currentDistance = getDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialDistance;

        // Clamp scale to min/max
        currentScale = Math.max(minScale, Math.min(maxScale, scale));

        onZoom?.(currentScale);
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isTouchDevice, onZoom, minScale, maxScale]);

  return {
    isTouchDevice,
  };
}

/**
 * Hook for detecting long press gesture
 */
export function useLongPress(
  onLongPress?: (position: TouchPosition) => void,
  delay: number = 500
) {
  const isTouchDevice = useTouchDevice();

  useEffect(() => {
    if (!isTouchDevice) return;

    let pressTimer: NodeJS.Timeout | null = null;
    let startPosition: TouchPosition | null = null;

    const handleTouchStart = (e: TouchEvent) => {
      const position = getTouchPosition(e);
      if (!position) return;

      startPosition = position;

      pressTimer = setTimeout(() => {
        if (startPosition) {
          onLongPress?.(startPosition);
        }
      }, delay);
    };

    const handleTouchEnd = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      startPosition = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const position = getTouchPosition(e);
      if (!position || !startPosition) return;

      // Cancel long press if finger moved too much
      const dx = position.x - startPosition.x;
      const dy = position.y - startPosition.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > 10) {
        // 10px threshold
        handleTouchEnd();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);
    document.addEventListener('touchcancel', handleTouchEnd);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
      }
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [isTouchDevice, onLongPress, delay]);

  return {
    isTouchDevice,
  };
}
