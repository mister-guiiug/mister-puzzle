/**
 * Hook personnalisé pour la gestion du localStorage avec typage TypeScript
 * Compatible avec tous les projets React
 */

import { useState, useCallback } from 'react';
import { createLogger } from '@mister-guiiug/dev-wpa-config/logger';

const log = createLogger('hooks');

function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: T | ((val: T) => T)) => void, () => void] {
  // Lire depuis localStorage ou utiliser initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      log.warn(`Error reading localStorage key "${key}":`, { error: error });
      return initialValue;
    }
  });

  // Mettre à jour localStorage quand la valeur change
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        log.warn(`Error setting localStorage key "${key}":`, { error: error });
      }
    },
    [key, storedValue]
  );

  // Supprimer la clé du localStorage
  const removeValue = useCallback(() => {
    try {
      setStoredValue(initialValue);
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch (error) {
      log.warn(`Error removing localStorage key "${key}":`, { error: error });
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// Exemple d'utilisation :
// const [theme, setTheme] = useLocalStorage<'light' | 'dark'>('theme', 'light')
// const [user, setUser, removeUser] = useLocalStorage<User>('user', null)
