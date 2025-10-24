import { useEffect, useState } from 'react';

/**
 * Small debounce helper for controlled inputs.
 * @param value The incoming value.
 * @param delay Delay in milliseconds.
 */
export function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handle);
  }, [value, delay]);

  return debounced;
}

export default useDebounce;
