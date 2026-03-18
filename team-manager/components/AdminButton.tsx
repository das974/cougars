'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiLock, FiUnlock, FiX } from 'react-icons/fi';

interface Props {
  isAdmin: boolean;
  onAdminChange: (v: boolean) => void;
}

export default function AdminButton({ isAdmin, onAdminChange }: Props) {
  const [modalOpen, setModalOpen]   = useState(false);
  const [password,  setPassword]    = useState('');
  const [error,     setError]       = useState('');
  const [loading,   setLoading]     = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (modalOpen) { setPassword(''); setError(''); setTimeout(() => inputRef.current?.focus(), 50); }
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setModalOpen(false); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [modalOpen]);

  function handleToggle() {
    if (isAdmin) { onAdminChange(false); }
    else { setModalOpen(true); }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/admin-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { onAdminChange(true); setModalOpen(false); }
      else { setError('Incorrect password'); inputRef.current?.select(); }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  }

  return (
    <>
      <button
        onClick={handleToggle}
        title={isAdmin ? 'Exit admin mode' : 'Admin login'}
        className={[
          'w-8 h-8 flex items-center justify-center rounded-full transition-colors',
          isAdmin
            ? 'text-green bg-green/10 ring-1 ring-inset ring-green/30'
            : 'text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800',
        ].join(' ')}
      >
        {isAdmin ? <FiUnlock className="w-4 h-4" /> : <FiLock className="w-4 h-4" />}
      </button>

      {modalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm backdrop-fade"
            onClick={() => setModalOpen(false)}
          />
          {/* Modal */}
          <div className="modal-pop relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl shadow-black/60 p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-green/10 flex items-center justify-center">
                  <FiLock className="w-3.5 h-3.5 text-green" />
                </div>
                <h2 className="text-sm font-semibold text-zinc-100">Admin Access</h2>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5">Password</label>
                <input
                  ref={inputRef}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter admin password"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-700 bg-zinc-800 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-green/40 focus:border-green/50 transition-colors"
                />
                {error && <p className="mt-1.5 text-xs text-red-400">{error}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all bg-zinc-800 text-zinc-300 hover:bg-zinc-700 ring-1 ring-inset ring-zinc-700 active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !password}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all bg-primary text-white hover:bg-primary-dk active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verifying…' : 'Unlock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </>
  );
}
