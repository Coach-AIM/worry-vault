'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function PinLockModal() {
  const {
    modalMode,
    unlockWithPin,
    enablePinLock,
    disablePinLock,
    changePin,
    closePinModal,
    handleSignOut,
  } = useAuth();
  const pathname = usePathname();

  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError(null);
    setIsSubmitting(false);

    if (modalMode) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus();
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [modalMode]);

  useEffect(() => {
    if (!modalMode || modalMode === 'unlock') return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closePinModal();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalMode, closePinModal]);

  if (!modalMode) return null;

  const sanitizeDigits = (val: string) => val.replace(/\D/g, '').slice(0, 4);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSubmitting) return;
    setError(null);

    if (modalMode === 'unlock') {
      if (currentPin.length !== 4) {
        setError('Please enter your 4-digit PIN.');
        return;
      }
      setIsSubmitting(true);
      const ok = await unlockWithPin(currentPin);
      setIsSubmitting(false);
      if (!ok) {
        setError('Incorrect PIN. Please try again.');
        setCurrentPin('');
        firstInputRef.current?.focus();
      }
      return;
    }

    if (modalMode === 'setup') {
      if (newPin.length !== 4) {
        setError('PIN must be exactly 4 digits.');
        return;
      }
      if (newPin !== confirmPin) {
        setError('PINs do not match. Please re-enter.');
        return;
      }
      setIsSubmitting(true);
      await enablePinLock(newPin);
      setIsSubmitting(false);
      return;
    }

    if (modalMode === 'change') {
      if (currentPin.length !== 4) {
        setError('Please enter your current 4-digit PIN.');
        return;
      }
      if (newPin.length !== 4) {
        setError('New PIN must be exactly 4 digits.');
        return;
      }
      if (newPin !== confirmPin) {
        setError('New PINs do not match.');
        return;
      }
      setIsSubmitting(true);
      const ok = await changePin(currentPin, newPin);
      setIsSubmitting(false);
      if (!ok) {
        setError('Current PIN is incorrect.');
        setCurrentPin('');
        firstInputRef.current?.focus();
      }
      return;
    }

    if (modalMode === 'disable') {
      if (currentPin.length !== 4) {
        setError('Please enter your current 4-digit PIN to disable protection.');
        return;
      }
      setIsSubmitting(true);
      const ok = await disablePinLock(currentPin);
      setIsSubmitting(false);
      if (!ok) {
        setError('Incorrect PIN. Could not disable PIN lock.');
        setCurrentPin('');
        firstInputRef.current?.focus();
      }
      return;
    }
  }

  function handleForgotPinSignOut() {
    try {
      // Reset the forgotten device PIN lock while preserving all journal entries, tasks, and fortitude points
      localStorage.removeItem('momentum_pin_hash');
      localStorage.setItem('pinLockEnabled', 'false');
      localStorage.setItem('momentum_pin_lock_enabled', 'false');
      sessionStorage.removeItem('momentum_pin_session_unlocked');
    } catch (_) {}
    handleSignOut();
  }

  const isUnlockMode = modalMode === 'unlock';

  const titleMap = {
    unlock: 'Session Locked',
    setup: 'Create 4-Digit PIN',
    change: 'Change 4-Digit PIN',
    disable: 'Disable PIN Lock',
  };

  const subtitleMap = {
    unlock: 'Enter your 4-digit PIN to unlock sensitive records for this session.',
    setup: 'Protect your journal, action planner, and toolkit with an on-device 4-digit PIN.',
    change: 'Verify your current PIN and choose a new 4-digit PIN.',
    disable: 'Enter your current 4-digit PIN to turn off on-device PIN protection.',
  };

  return (
    <div
      style={{ zIndex: 70 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/65 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pin-modal-title"
    >
      <div className="bg-white rounded-3xl shadow-2xl border border-stone-200/90 p-6 sm:p-7 max-w-sm w-full space-y-5 animate-scaleUp">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-800 shrink-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
            </div>
            <div>
              <h3 id="pin-modal-title" className="text-base sm:text-lg font-extrabold text-stone-900 leading-tight">
                {titleMap[modalMode]}
              </h3>
              <p className="text-xs text-stone-500 font-medium mt-0.5 leading-snug">
                {subtitleMap[modalMode]}
              </p>
            </div>
          </div>

          {!isUnlockMode && (
            <button
              type="button"
              onClick={closePinModal}
              className="w-7 h-7 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors text-sm font-bold cursor-pointer shrink-0"
              aria-label="Close PIN modal"
            >
              ✕
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(modalMode === 'unlock' || modalMode === 'change' || modalMode === 'disable') && (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                {modalMode === 'change' ? 'Current 4-Digit PIN' : '4-Digit PIN'}
              </label>
              <input
                ref={firstInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                autoComplete="off"
                value={currentPin}
                onChange={(e) => {
                  setCurrentPin(sanitizeDigits(e.target.value));
                  if (error) setError(null);
                }}
                placeholder="••••"
                className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
              />
            </div>
          )}

          {(modalMode === 'setup' || modalMode === 'change') && (
            <>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  {modalMode === 'change' ? 'New 4-Digit PIN' : 'Create 4-Digit PIN'}
                </label>
                <input
                  ref={modalMode === 'setup' ? firstInputRef : undefined}
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="off"
                  value={newPin}
                  onChange={(e) => {
                    setNewPin(sanitizeDigits(e.target.value));
                    if (error) setError(null);
                  }}
                  placeholder="••••"
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-600 mb-1.5">
                  Confirm 4-Digit PIN
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={4}
                  autoComplete="off"
                  value={confirmPin}
                  onChange={(e) => {
                    setConfirmPin(sanitizeDigits(e.target.value));
                    if (error) setError(null);
                  }}
                  placeholder="••••"
                  className="w-full px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold bg-stone-50 border border-stone-200 rounded-xl text-stone-900 placeholder:text-stone-300 focus:outline-none focus:ring-2 focus:ring-emerald-600/30 focus:border-emerald-600"
                />
              </div>
            </>
          )}

          {error && (
            <p
              className="text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-center animate-fadeIn"
              role="alert"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-2 pt-1">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold text-white transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                modalMode === 'disable'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-700 hover:bg-emerald-800'
              }`}
            >
              {modalMode === 'unlock' && (isSubmitting ? 'Unlocking...' : 'Unlock View')}
              {modalMode === 'setup' && (isSubmitting ? 'Saving PIN...' : 'Enable PIN Lock')}
              {modalMode === 'change' && (isSubmitting ? 'Updating PIN...' : 'Save New PIN')}
              {modalMode === 'disable' && (isSubmitting ? 'Disabling...' : 'Disable PIN Lock')}
            </button>

            {!isUnlockMode && (
              <button
                type="button"
                onClick={closePinModal}
                className="w-full py-2 text-xs font-semibold text-stone-500 hover:text-stone-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </form>

        {isUnlockMode && (
          <div className="pt-3 border-t border-stone-100 flex flex-col items-center gap-2 text-center">
            {pathname && pathname !== '/' && (
              <Link
                href="/"
                onClick={() => closePinModal()}
                className="text-xs font-semibold text-stone-600 hover:text-stone-900 no-underline transition-colors"
              >
                ← Return to Home Dashboard
              </Link>
            )}
            <button
              type="button"
              onClick={handleForgotPinSignOut}
              className="text-[11px] font-semibold text-stone-400 hover:text-rose-600 transition-colors cursor-pointer bg-transparent border-0"
            >
              Forgot PIN? Sign out to Login (keeps local records safe)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
