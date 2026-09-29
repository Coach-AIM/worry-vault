/**
 * Safe client-side storage utility with robust try/catch fallbacks
 * to prevent crashes in private / incognito browsing modes or restricted environments.
 */

export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (err) {
    console.warn(`[storage] Failed to get key "${key}":`, err);
    return null;
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`[storage] Failed to parse JSON for key "${key}":`, err);
    return fallback;
  }
}

export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to set key "${key}":`, err);
    return false;
  }
}

export function safeSetJSON<T>(key: string, value: T): boolean {
  try {
    return safeSetItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[storage] Failed to stringify JSON for key "${key}":`, err);
    return false;
  }
}

export function safeRemoveItem(key: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.removeItem(key);
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to remove key "${key}":`, err);
    return false;
  }
}

export function safeGetAllItems(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const result: Record<string, string> = {};
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key) {
        const val = window.localStorage.getItem(key);
        if (val !== null) {
          result[key] = val;
        }
      }
    }
  } catch (err) {
    console.warn('[storage] Failed to iterate localStorage:', err);
  }
  return result;
}
