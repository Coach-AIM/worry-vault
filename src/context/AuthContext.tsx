'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { signOut } from 'next-auth/react';
import { usePathname } from 'next/navigation';
import PinLockModal from '@/components/PinLockModal';
import WelcomeModal from '@/components/WelcomeModal';
import {
  initializeCleanUserState,
  switchActiveUser,
  archiveUserStorage,
  restoreUserStorage,
  getActiveUsername,
} from '@/utils/storage';

export {
  initializeCleanUserState,
  switchActiveUser,
  archiveUserStorage,
  restoreUserStorage,
  getActiveUsername,
};

export type PinModalMode = 'unlock' | 'setup' | 'change' | 'disable' | null;

interface AuthContextValue {
  pinLockEnabled: boolean;
  isLocked: boolean;
  modalMode: PinModalMode;
  activeUsername: string | null;
  isWelcomeModalOpen: boolean;
  lockNow: () => void;
  unlockWithPin: (pin: string) => Promise<boolean>;
  enablePinLock: (pin: string) => Promise<void>;
  disablePinLock: (currentPin: string) => Promise<boolean>;
  changePin: (currentPin: string, newPin: string) => Promise<boolean>;
  openPinModal: (mode: Exclude<PinModalMode, null>) => void;
  closePinModal: () => void;
  acceptDisclaimer: () => void;
  handleSignOut: () => Promise<void>;
  initializeNewUser: (username: string, options?: { disclaimerAccepted?: boolean }) => void;
  switchUser: (username: string) => void;
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
  const [activeUsername, setActiveUsername] = useState<string | null>(null);
  const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

  const checkDisclaimerStatus = useCallback(() => {
    try {
      const direct = localStorage.getItem('momentum_disclaimer_accepted');
      if (direct === 'true') return true;
      const profileRaw = localStorage.getItem('momentum_profile') || localStorage.getItem('momentum_user_profile');
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        if (p?.disclaimerAccepted === true) return true;
      }
      return false;
    } catch (_) {
      return false;
    }
  }, []);

  const syncWelcomeModalState = useCallback(() => {
    const isAuthRoute =
      pathname === '/login' ||
      pathname === '/login/' ||
      pathname === '/register' ||
      pathname === '/register/';

    if (isAuthRoute) {
      setIsWelcomeModalOpen(false);
      return;
    }

    const accepted = checkDisclaimerStatus();
    setIsWelcomeModalOpen(!accepted);
  }, [pathname, checkDisclaimerStatus]);

  const syncPinStateFromStorage = useCallback(() => {
    try {
      setActiveUsername(getActiveUsername());
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
    syncWelcomeModalState();

    const handleStorage = () => {
      syncPinStateFromStorage();
      syncWelcomeModalState();
    };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('momentum:pin-updated', handleStorage);
    window.addEventListener('momentum:disclaimer-accepted', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('momentum:pin-updated', handleStorage);
      window.removeEventListener('momentum:disclaimer-accepted', handleStorage);
    };
  }, [syncPinStateFromStorage, syncWelcomeModalState]);

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

  const acceptDisclaimer = useCallback(() => {
    try {
      const timestamp = new Date().toISOString();
      localStorage.setItem('momentum_disclaimer_accepted', 'true');
      localStorage.setItem('momentum_disclaimer_accepted_at', timestamp);
      const profileRaw = localStorage.getItem('momentum_profile') || localStorage.getItem('momentum_user_profile');
      if (profileRaw) {
        const p = JSON.parse(profileRaw);
        p.disclaimerAccepted = true;
        p.disclaimerAcceptedAt = timestamp;
        localStorage.setItem('momentum_profile', JSON.stringify(p));
        localStorage.setItem('momentum_user_profile', JSON.stringify(p));
      }
      archiveUserStorage();
      setIsWelcomeModalOpen(false);
      window.dispatchEvent(new Event('momentum:disclaimer-accepted'));
      window.dispatchEvent(new Event('storage'));
    } catch (_) {
      setIsWelcomeModalOpen(false);
    }
  }, []);

  const initializeNewUser = useCallback((username: string, options?: { disclaimerAccepted?: boolean }) => {
    initializeCleanUserState(username, options);
    setActiveUsername(username.trim().toLowerCase());
    syncPinStateFromStorage();
    syncWelcomeModalState();
  }, [syncPinStateFromStorage, syncWelcomeModalState]);

  const switchUser = useCallback((username: string) => {
    switchActiveUser(username);
    setActiveUsername(username.trim().toLowerCase());
    syncPinStateFromStorage();
    syncWelcomeModalState();
  }, [syncPinStateFromStorage, syncWelcomeModalState]);

  const handleSignOut = useCallback(async () => {
    try {
      // Archive current user's state to preserve personal reflections and drafts safely in their vault
      archiveUserStorage();
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
        activeUsername,
        isWelcomeModalOpen,
        lockNow,
        unlockWithPin,
        enablePinLock,
        disablePinLock,
        changePin,
        openPinModal,
        closePinModal,
        acceptDisclaimer,
        handleSignOut,
        initializeNewUser,
        switchUser,
      }}
    >
      {children}
      <PinLockModal />
      <WelcomeModal />
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
