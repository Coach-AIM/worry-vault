/**
 * Safe client-side storage utility with robust try/catch fallbacks
 * to prevent crashes in private / incognito browsing modes or restricted environments.
 * Includes user-isolation and clean-state initialization helpers for multi-user safety.
 */

export const DEFAULT_CLEAN_HABITS = [
  { id: "meditate", title: "Meditate", completed: false, duration: "10m", difficulty: "Low" },
  { id: "read", title: "Read", completed: false, duration: "15m", difficulty: "Low" },
  { id: "walk", title: "Walk", completed: false, duration: "15m", difficulty: "Low" },
];

export const USER_SCOPED_STORAGE_KEYS = [
  "momentum_journal_draft",
  "momentum_pending_reframe",
  "momentum_journal_entries",
  "momentum_today_focus_actions",
  "momentum_actions",
  "momentum_task_meta",
  "momentum_actual_reliefs",
  "momentum_daily_completions",
  "momentum_habit_mood_logs",
  "momentum_closed_loops_count",
  "momentum_resilience_points",
  "momentum_triangle_transfer",
  "momentum_therapy_export_used",
  "momentum_pin_hash",
  "pinLockEnabled",
  "momentum_pin_lock_enabled",
  "momentum_pin_session_unlocked",
  "momentum_disclaimer_accepted",
  "momentum_disclaimer_accepted_at",
  "momentum_profile",
  "momentum_user_profile",
] as const;

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

export function getActiveUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const direct = window.localStorage.getItem('momentum_active_user');
    if (direct) return direct.trim().toLowerCase();
    const profileRaw = window.localStorage.getItem('momentum_profile');
    if (profileRaw) {
      const parsed = JSON.parse(profileRaw);
      if (parsed?.username) return String(parsed.username).trim().toLowerCase();
    }
  } catch (_) {}
  return null;
}

/**
 * Safely archive current user's data into their private vault in localStorage
 * so that reflections and drafts are isolated and not lost on logout/account switch.
 */
export function archiveUserStorage(username?: string): void {
  if (typeof window === 'undefined') return;
  const targetUser = username?.trim().toLowerCase() || getActiveUsername();
  if (!targetUser) return;

  try {
    const snapshot: Record<string, any> = {};
    for (const key of USER_SCOPED_STORAGE_KEYS) {
      const val = window.localStorage.getItem(key);
      if (val !== null) {
        snapshot[key] = val;
      }
    }
    window.localStorage.setItem(`momentum_user_vault_${targetUser}`, JSON.stringify(snapshot));
  } catch (err) {
    console.warn(`[storage] Failed to archive data for user "${targetUser}":`, err);
  }
}

/**
 * Restores a user's isolated data vault from localStorage.
 */
export function restoreUserStorage(username: string): boolean {
  if (typeof window === 'undefined') return false;
  const targetUser = username.trim().toLowerCase();
  try {
    const rawVault = window.localStorage.getItem(`momentum_user_vault_${targetUser}`);
    if (!rawVault) return false;
    const snapshot = JSON.parse(rawVault);
    if (!snapshot || typeof snapshot !== 'object') return false;

    for (const key of USER_SCOPED_STORAGE_KEYS) {
      if (key in snapshot && snapshot[key] !== null) {
        window.localStorage.setItem(key, snapshot[key]);
      } else {
        window.localStorage.removeItem(key);
      }
    }
    window.localStorage.setItem('momentum_active_user', targetUser);
    dispatchStateSyncEvents();
    return true;
  } catch (err) {
    console.warn(`[storage] Failed to restore data for user "${targetUser}":`, err);
    return false;
  }
}

/**
 * Initialize a completely clean, isolated state for a new user registration.
 * Ensures:
 *  - Prior session keys are archived and cleared (no stale data leak).
 *  - Empty journal drafts & empty reflection history.
 *  - Fresh uncompleted daily focus habits.
 *  - Default starting metrics (0 points, 0 closed loops).
 */
export function initializeCleanUserState(
  username: string,
  options?: { disclaimerAccepted?: boolean }
): void {
  if (typeof window === 'undefined') return;
  const cleanUsername = username.trim().toLowerCase();

  // 1. Archive prior user's session data if one was active
  const priorUser = getActiveUsername();
  if (priorUser && priorUser !== cleanUsername) {
    archiveUserStorage(priorUser);
  }

  try {
    // 2. Clear all sensitive user drafts, reflections, tasks, and security keys
    for (const key of USER_SCOPED_STORAGE_KEYS) {
      window.localStorage.removeItem(key);
    }
    window.sessionStorage.removeItem('momentum_pin_session_unlocked');

    // 3. Set clean initial state with zeroed metrics and uncompleted habits
    const timestamp = new Date().toISOString();
    window.localStorage.setItem('momentum_active_user', cleanUsername);
    window.localStorage.setItem('momentum_resilience_points', '0');
    window.localStorage.setItem('momentum_closed_loops_count', '0');
    window.localStorage.setItem('momentum_journal_entries', '[]');
    window.localStorage.setItem('momentum_today_focus_actions', JSON.stringify(DEFAULT_CLEAN_HABITS));
    window.localStorage.setItem('momentum_actions', '[]');
    window.localStorage.setItem('momentum_task_meta', '{}');
    window.localStorage.setItem('momentum_actual_reliefs', '{}');
    window.localStorage.setItem('momentum_daily_completions', '{}');
    window.localStorage.setItem('momentum_habit_mood_logs', '[]');
    window.localStorage.setItem('pinLockEnabled', 'false');
    window.localStorage.setItem('momentum_pin_lock_enabled', 'false');

    if (options?.disclaimerAccepted) {
      window.localStorage.setItem('momentum_disclaimer_accepted', 'true');
      window.localStorage.setItem('momentum_disclaimer_accepted_at', timestamp);
    } else {
      window.localStorage.removeItem('momentum_disclaimer_accepted');
      window.localStorage.removeItem('momentum_disclaimer_accepted_at');
    }

    const profileData = {
      username: cleanUsername,
      disclaimerAccepted: Boolean(options?.disclaimerAccepted),
      disclaimerAcceptedAt: options?.disclaimerAccepted ? timestamp : undefined,
      registeredAt: timestamp,
    };
    window.localStorage.setItem('momentum_profile', JSON.stringify(profileData));
    window.localStorage.setItem('momentum_user_profile', JSON.stringify(profileData));

    // Archive initial snapshot in user vault
    archiveUserStorage(cleanUsername);

    // 4. Dispatch events to immediately refresh UI metrics, habits, and stats
    dispatchStateSyncEvents();
  } catch (err) {
    console.warn(`[storage] Failed to initialize clean state for user "${cleanUsername}":`, err);
  }
}

/**
 * Switch active user during login: archives current user, and restores or initializes clean state for new user.
 */
export function switchActiveUser(newUsername: string): void {
  if (typeof window === 'undefined') return;
  const cleanUsername = newUsername.trim().toLowerCase();
  const current = getActiveUsername();

  if (current === cleanUsername) return;

  if (current) {
    archiveUserStorage(current);
  }

  const restored = restoreUserStorage(cleanUsername);
  if (!restored) {
    initializeCleanUserState(cleanUsername, { disclaimerAccepted: false });
  } else {
    window.localStorage.setItem('momentum_active_user', cleanUsername);
    dispatchStateSyncEvents();
  }
}

export function dispatchStateSyncEvents(): void {
  if (typeof window === 'undefined') return;
  try {
    const rawPoints = window.localStorage.getItem('momentum_resilience_points');
    const pointsNum = rawPoints ? parseInt(rawPoints, 10) || 0 : 0;
    window.dispatchEvent(new CustomEvent('momentum_points_updated', { detail: pointsNum }));
    window.dispatchEvent(new Event('momentum:stats'));
    window.dispatchEvent(new Event('momentum:pin-updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (_) {}
}
