import { useState, useEffect, useCallback, useRef } from 'react';
import { database } from '../firebaseConfig';

export default function useFirebaseSync<T>(path: string, defaultValue: T) {
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const pathRef = useRef(path);
  pathRef.current = path;

  useEffect(() => {
    const ref = database.ref(path);
    
    const listener = ref.on('value', (snapshot) => {
      const val = snapshot.val();
      if (val !== null && val !== undefined) {
        if (typeof val === 'object') {
          setData(Array.isArray(val) ? ([...val] as unknown as T) : ({ ...val } as T));
        } else {
          setData(val);
        }
      } else {
        setData(defaultValue);
      }
      setIsLoading(false);
    });

    return () => {
      ref.off('value', listener);
    };
  }, [path]);

  const setSyncedData = useCallback((valOrFn: T | ((prev: T) => T)) => {
    setData((prev) => {
      const nextVal = typeof valOrFn === 'function' ? (valOrFn as (prev: T) => T)(prev) : valOrFn;
      // Persist to automated server database & local storage
      database.ref(pathRef.current).set(nextVal);
      return nextVal;
    });
  }, []);

  return { data, setData: setSyncedData, isLoading };
}