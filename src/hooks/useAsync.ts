import { useState, useCallback } from 'react';

type AsyncFunction<T, P extends any[]> = (...args: P) => Promise<T>;

export const useAsync = <T, P extends any[]>(
  asyncFunction: AsyncFunction<T, P>,
  immediate = false
) => {
  const [status, setStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);

  // The execute function wraps asyncFunction and
  // handles setting state for pending, value, and error.
  // useCallback ensures the below useEffect is not called
  // on every render, but only if asyncFunction changes.
  const execute = useCallback(
    async (...args: P) => {
      setStatus('pending');
      setData(null);
      setError(null);

      try {
        const response = await asyncFunction(...args);
        setData(response);
        setStatus('success');
        return response;
      } catch (err: any) {
        setError(err);
        setStatus('error');
        throw err;
      }
    },
    [asyncFunction]
  );

  return { execute, status, data, error, loading: status === 'pending' };
};
