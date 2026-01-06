/**
 * Custom Hooks for Memory Leak Prevention
 * مجموعة من hooks لمنع تسرب الذاكرة في React
 */

import { useRef, useEffect, useCallback, useState, DependencyList } from 'react';

/**
 * Hook للتحقق من أن المكون لا يزال mounted قبل تحديث الحالة
 */
export function useIsMounted(): () => boolean {
  const isMounted = useRef(false);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  return useCallback(() => isMounted.current, []);
}

/**
 * Hook آمن للحالة - يمنع تحديث الحالة بعد unmount
 */
export function useSafeState<T>(initialState: T | (() => T)): [T, (value: T | ((prev: T) => T)) => void] {
  const [state, setState] = useState(initialState);
  const isMounted = useIsMounted();

  const setSafeState = useCallback((value: T | ((prev: T) => T)) => {
    if (isMounted()) {
      setState(value);
    }
  }, [isMounted]);

  return [state, setSafeState];
}

/**
 * Hook لإلغاء الطلبات عند unmount
 */
export function useAbortController(): AbortController {
  const controllerRef = useRef<AbortController>(new AbortController());

  useEffect(() => {
    // إنشاء controller جديد عند mount
    controllerRef.current = new AbortController();

    return () => {
      // إلغاء الطلبات عند unmount
      controllerRef.current.abort();
    };
  }, []);

  return controllerRef.current;
}

/**
 * Hook آمن للـ async operations
 */
export function useAsyncEffect(
  effect: (signal: AbortSignal) => Promise<void | (() => void)>,
  deps: DependencyList
): void {
  useEffect(() => {
    const controller = new AbortController();
    let cleanup: void | (() => void);

    const runEffect = async () => {
      try {
        cleanup = await effect(controller.signal);
      } catch (error) {
        // تجاهل أخطاء الإلغاء
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        throw error;
      }
    };

    runEffect();

    return () => {
      controller.abort();
      if (typeof cleanup === 'function') {
        cleanup();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

/**
 * Hook آمن لتحميل البيانات
 */
export function useSafeFetch<T>(
  fetchFn: (signal: AbortSignal) => Promise<T>,
  deps: DependencyList = []
): {
  data: T | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
} {
  const [data, setData] = useSafeState<T | null>(null);
  const [loading, setLoading] = useSafeState(true);
  const [error, setError] = useSafeState<Error | null>(null);
  const isMounted = useIsMounted();

  const fetchData = useCallback(async (signal: AbortSignal) => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(signal);
      if (isMounted()) {
        setData(result);
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      if (isMounted()) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      }
    } finally {
      if (isMounted()) {
        setLoading(false);
      }
    }
  }, [fetchFn, isMounted, setData, setLoading, setError]);

  useAsyncEffect((signal) => {
    return fetchData(signal);
  }, [...deps, fetchData]);

  const refetch = useCallback(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    // ملاحظة: هذا لن يلغى تلقائياً - استخدم فقط عند الحاجة
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Hook للـ interval الآمن
 */
export function useSafeInterval(callback: () => void, delay: number | null): void {
  const savedCallback = useRef(callback);

  // تحديث الـ callback المحفوظ
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // إعداد الـ interval
  useEffect(() => {
    if (delay === null) {
      return;
    }

    const tick = () => {
      savedCallback.current();
    };

    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}

/**
 * Hook للـ timeout الآمن
 */
export function useSafeTimeout(): (callback: () => void, delay: number) => void {
  const timeoutIds = useRef<Set<NodeJS.Timeout>>(new Set());
  const isMounted = useIsMounted();

  // تنظيف جميع timeouts عند unmount
  useEffect(() => {
    return () => {
      timeoutIds.current.forEach(id => clearTimeout(id));
      timeoutIds.current.clear();
    };
  }, []);

  return useCallback((callback: () => void, delay: number) => {
    const id = setTimeout(() => {
      timeoutIds.current.delete(id);
      if (isMounted()) {
        callback();
      }
    }, delay);
    
    timeoutIds.current.add(id);
  }, [isMounted]);
}

/**
 * Hook للـ debounce الآمن
 */
export function useSafeDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const callbackRef = useRef(callback);
  const isMounted = useIsMounted();

  // تحديث callback ref
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // تنظيف عند unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      if (isMounted()) {
        callbackRef.current(...args);
      }
    }, delay);
  }, [delay, isMounted]) as T;
}

/**
 * Hook للـ throttle الآمن
 */
export function useSafeThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const lastRun = useRef(Date.now());
  const callbackRef = useRef(callback);
  const isMounted = useIsMounted();

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback((...args: Parameters<T>) => {
    if (!isMounted()) return;
    
    if (Date.now() - lastRun.current >= delay) {
      callbackRef.current(...args);
      lastRun.current = Date.now();
    }
  }, [delay, isMounted]) as T;
}

/**
 * Hook للـ subscriptions الآمنة (مثل Supabase realtime)
 */
export function useSubscription<T>(
  subscribe: (onData: (data: T) => void) => () => void,
  onData: (data: T) => void,
  deps: DependencyList = []
): void {
  const isMounted = useIsMounted();

  useEffect(() => {
    const safeOnData = (data: T) => {
      if (isMounted()) {
        onData(data);
      }
    };

    const unsubscribe = subscribe(safeOnData);

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, isMounted]);
}

/**
 * Hook للـ event listeners الآمنة
 */
export function useSafeEventListener<K extends keyof WindowEventMap>(
  eventName: K,
  handler: (event: WindowEventMap[K]) => void,
  element: Window | HTMLElement | null = typeof window !== 'undefined' ? window : null
): void {
  const savedHandler = useRef(handler);
  const isMounted = useIsMounted();

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => {
      if (isMounted()) {
        savedHandler.current(event as WindowEventMap[K]);
      }
    };

    element.addEventListener(eventName, eventListener);

    return () => {
      element.removeEventListener(eventName, eventListener);
    };
  }, [eventName, element, isMounted]);
}
