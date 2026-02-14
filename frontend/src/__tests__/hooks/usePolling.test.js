import { renderHook, act } from '@testing-library/react';
import { usePolling } from '../../hooks/usePolling';

describe('usePolling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('calls fetch function immediately when enabled', () => {
    const fetchFn = vi.fn();

    renderHook(() => usePolling(fetchFn, 2000, true));

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('calls fetch at intervals', () => {
    const fetchFn = vi.fn();

    renderHook(() => usePolling(fetchFn, 2000, true));

    // Initial call
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Advance past one interval
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);

    // Advance past another interval
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(fetchFn).toHaveBeenCalledTimes(3);
  });

  it('does not call when disabled', () => {
    const fetchFn = vi.fn();

    renderHook(() => usePolling(fetchFn, 2000, false));

    expect(fetchFn).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('cleans up on unmount - no further calls happen', () => {
    const fetchFn = vi.fn();

    const { unmount } = renderHook(() => usePolling(fetchFn, 2000, true));

    // Initial call
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Unmount the hook
    unmount();

    // Advance time - should NOT trigger any more calls
    act(() => {
      vi.advanceTimersByTime(6000);
    });

    // Still only the initial call
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
