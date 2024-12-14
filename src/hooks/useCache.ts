import { useState, useEffect } from 'react';

interface CacheOptions {
  key: string;
  ttl?: number; // Time to live in milliseconds
}

export const useCache = <T>(
  key: string,
  initialData: T,
  options: CacheOptions = { key: 'cache', ttl: 5 * 60 * 1000 } // 5 minutes default TTL
) => {
  const [data, setData] = useState<T>(() => {
    const cached = localStorage.getItem(key);
    if (cached) {
      const { value, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < (options.ttl || 0)) {
        return value;
      }
    }
    return initialData;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify({
      value: data,
      timestamp: Date.now()
    }));
  }, [data, key]);

  const clearCache = () => {
    localStorage.removeItem(key);
    setData(initialData);
  };

  return [data, setData, clearCache] as const;
};