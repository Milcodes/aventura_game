/**
 * Performance Profiler wrapper for monitoring component render performance
 */

import React, { Profiler, ProfilerOnRenderCallback } from 'react';

interface PerformanceProfilerProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Wrapper component that uses React Profiler API to measure performance
 *
 * Usage:
 * <PerformanceProfiler id="TimelineEditor">
 *   <TimelineEditor />
 * </PerformanceProfiler>
 */
export default function PerformanceProfiler({
  id,
  children,
  enabled = process.env.NODE_ENV === 'development',
}: PerformanceProfilerProps) {
  const onRender: ProfilerOnRenderCallback = (
    id,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime
  ) => {
    if (!enabled) return;

    // Log performance metrics in development
    if (actualDuration > 16) {
      // Longer than 1 frame (16ms at 60fps)
      console.warn(
        `⚠️ Performance Warning [${id}]`,
        `\n  Phase: ${phase}`,
        `\n  Actual: ${actualDuration.toFixed(2)}ms`,
        `\n  Base: ${baseDuration.toFixed(2)}ms`,
        `\n  Start: ${startTime.toFixed(2)}ms`,
        `\n  Commit: ${commitTime.toFixed(2)}ms`
      );
    } else {
      console.log(
        `✅ Performance OK [${id}]`,
        `\n  Phase: ${phase}`,
        `\n  Duration: ${actualDuration.toFixed(2)}ms`
      );
    }

    // Store metrics for analysis (in development)
    if (typeof window !== 'undefined' && (window as any).__REACT_PROFILER__) {
      const metrics = (window as any).__REACT_PROFILER__;
      if (!metrics[id]) metrics[id] = [];

      metrics[id].push({
        phase,
        actualDuration,
        baseDuration,
        startTime,
        commitTime,
        timestamp: Date.now(),
      });

      // Keep only last 100 measurements
      if (metrics[id].length > 100) {
        metrics[id].shift();
      }
    }
  };

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRender}>
      {children}
    </Profiler>
  );
}

/**
 * Hook to get performance metrics for a specific component
 */
export function usePerformanceMetrics(id: string) {
  if (typeof window === 'undefined') return null;

  const metrics = (window as any).__REACT_PROFILER__?.[id] || [];

  if (metrics.length === 0) return null;

  const avgActual = metrics.reduce((sum: number, m: any) => sum + m.actualDuration, 0) / metrics.length;
  const maxActual = Math.max(...metrics.map((m: any) => m.actualDuration));
  const minActual = Math.min(...metrics.map((m: any) => m.actualDuration));

  return {
    count: metrics.length,
    avgDuration: avgActual,
    maxDuration: maxActual,
    minDuration: minActual,
    metrics,
  };
}

// Initialize global metrics storage
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).__REACT_PROFILER__ = (window as any).__REACT_PROFILER__ || {};
}
