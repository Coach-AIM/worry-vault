'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import PinLockModal from '@/components/PinLockModal';

export type PinModalMode = 'unlock' | 'setup' | 'change' | 'disable' | null;

interface AuthContextValue {
  pinLockEnabled: boolean;
  isLocked: boolean;
  modalMode: PinModalMode;
  lockNow: () => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  enablePinLock: (pin: string) => Promise<void>;
  disablePinLock: (currentPin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  openPinModal: (mode: Exclude<PinModalMode, null>) => void;
  closePinModal: () => void;
  handleSignOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const PIN_ENABLED_KEY = 'pinLockEnabled';
const PIN_HASH_KEY = 'momentum_pin_hash';
const SESSION_UNLOCKED_KEY = 'momentum_pin_session_unlocked';

// Sensitive view prefixes where the PIN lock overlay actively guards content
const SENSITIVE_PATH_PREFIXES = ['/journal', '/tasks', '/toolkit', '/reflect', '/insights', '/decisions'];

export async function hashPin(pin: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(`momentum_pin_salt_v1:${pin}`);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Fallback deterministic hash if SubtleCrypto is unavailable
  let h = 2166136261;
  const str = `momentum_pin_salt_v1:${pin}`;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pinLockEnabled, setPinLockEnabled] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [modalMode, setModalMode] = useState<PinModalMode>(null);

  const syncPinStateFromStorage = useCallback(() => {
    try {
      const enabled =
        localStorage.getItem(PIN_ENABLED_KEY) === 'true' ||
        localStorage.getItem('momentum_pin_lock_enabled') === 'true';
      const storedHash = localStorage.getItem(PIN_HASH_KEY);
      const active = Boolean(enabled && storedHash);
      setPinLockEnabled(active);

      if (active) {
        const unlockedInSession = sessionStorage.getItem(SESSION_UNLOCKED_KEY) === 'true';
        setIsLocked(!unlockedInSession);
      } else {
        setIsLocked(false);
      }
    } catch (_) {}
  }, []);

  useEffect(() => {
    syncPinStateFromStorage();

    const handleStorage = () => syncPinStateFromStorage();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('momentum:pin-updated', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('momentum:pin-updated', handleStorage);
    };
  }, [syncPinStateFromStorage]);

  const isSensitiveRoute = Boolean(
    pathname && SENSITIVE_PATH_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
  );

  const lockNow = useCallback(() => {
    try {
      const storedHash = localStorage.getItem(PIN_HASH_KEY);
      if (!storedHash) {
        setModalMode('setup');
        return;
      }
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
      setIsLocked(true);
      setModalMode('unlock');
    } catch (_) {
      setIsLocked(true);
      setModalMode('unlock');
    }
  }, []);

  const unlockWithPin = useCallback(async (pin: string): Promise<boolean> => {
    try {
      const storedHash = localStorage.getItem(PIN_HASH_KEY);
      if (!storedHash) {
        setIsLocked(false);
        setModalMode(null);
        return true;
      }
      const hashedInput = await hashPin(pin);
      if (hashedInput === storedHash) {
        sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
        setIsLocked(false);
        setModalMode(null);
        return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }, []);

  const enablePinLock = useCallback(async (pin: string): Promise<void> => {
    const hashed = await hashPin(pin);
    try {
      localStorage.setItem(PIN_HASH_KEY, hashed);
      localStorage.setItem(PIN_ENABLED_KEY, 'true');
      localStorage.setItem('momentum_pin_lock_enabled', 'true');
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      setPinLockEnabled(true);
      setIsLocked(false);
      setModalMode(null);
      window.dispatchEvent(new Event('momentum:pin-updated'));
    } catch (_) {}
  }, []);

  const disablePinLock = useCallback(async (currentPin: string): Promise<boolean> => {
    try {
      const storedHash = localStorage.getItem(PIN_HASH_KEY);
      if (storedHash) {
        const hashedInput = await hashPin(currentPin);
        if (hashedInput !== storedHash) {
          return false;
        }
      }
      localStorage.removeItem(PIN_HASH_KEY);
      localStorage.setItem(PIN_ENABLED_KEY, 'false');
      localStorage.setItem('momentum_pin_lock_enabled', 'false');
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
      setPinLockEnabled(false);
      setIsLocked(false);
      setModalMode(null);
      window.dispatchEvent(new Event('momentum:pin-updated'));
      return true;
    } catch (_) {
      return false;
    }
  }, []);

  const changePin = useCallback(async (currentPin: string, newPin: string): Promise<boolean> => {
    try {
      const storedHash = localStorage.getItem(PIN_HASH_KEY);
      if (storedHash) {
        const hashedCurrent = await hashPin(currentPin);
        if (hashedCurrent !== storedHash) {
          return false;
        }
      }
      const hashedNew = await hashPin(newPin);
      localStorage.setItem(PIN_HASH_KEY, hashedNew);
      localStorage.setItem(PIN_ENABLED_KEY, 'true');
      localStorage.setItem('momentum_pin_lock_enabled', 'true');
      sessionStorage.setItem(SESSION_UNLOCKED_KEY, 'true');
      setPinLockEnabled(true);
      setIsLocked(false);
      setModalMode(null);
      window.dispatchEvent(new Event('momentum:pin-updated'));
      return true;
    } catch (_) {
      return false;
    }
  }, []);

  const openPinModal = useCallback((mode: Exclude<PinModalMode, null>) => {
    setModalMode(mode);
  }, []);

  const closePinModal = useCallback(() => {
    setModalMode(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    try {
      // Clear only session/unlock flags — never touch user journal entries, tasks, or fortitude points
      sessionStorage.removeItem(SESSION_UNLOCKED_KEY);
      localStorage.removeItem('momentum_session_token');
      localStorage.removeItem('momentum_active_session');
    } catch (_) {}

    try {
      await signOut({ redirect: false });
    } catch (_) {}

    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }, []);

  // Show the PIN modal if explicitly opened (setup/change/disable/unlock) OR if PIN lock is active & locked on a sensitive route
  const activeModalMode: PinModalMode =
    modalMode !== null
      ? modalMode
      : pinLockEnabled && isLocked && isSensitiveRoute
      ? 'unlock'
      : null;

  return (
    <AuthContext.Provider
      value={{
        pinLockEnabled,
        isLocked,
        modalMode: activeModalMode,
        lockNow,
        unlockWithPin,
        enablePinLock,
        disablePinLock,
        changePin,
        openPinModal,
        closePinModal,
        handleSignOut,
      }}
    >
      {children}
      <PinLockModal />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
