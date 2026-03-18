'use client';

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FiX } from 'react-icons/fi';

interface Props {
  title: string;
  endpoint: string;
  onSuccess: (data: Record<string, unknown>) => void;
  /** Provide to show a close/cancel button and enable Escape key */
  onClose?: () => void;
  /** Full-screen gate (AppLogin) vs overlay dialog (AdminButton) */
  fullScreen?: boolean;
  submitLabel?: string;
}

export default function AuthModal({
  title,
  endpoint,
  onSuccess,
  onClose,
  fullScreen = false,
  submitLabel = 'Enter',
}: Props) {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPassword(''); setError('');
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  useEffect(() => {
    if (!onClose) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onSuccess(await res.json());
      } else {
        setError('Wrong password');
        setPassword('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Network error — try again');
    } finally {
      setLoading(false);
    }
  }

  const card = (
    <form
      onSubmit={handleSubmit}
      className={[
        'relative z-10 flex flex-col gap-5 rounded-2xl bg-zinc-900 border border-zinc-700/60 shadow-2xl shadow-black/60',
        fullScreen ? 'items-center px-10 py-10 w-80' : 'p-6 w-full max-w-sm mx-4',
      ].join(' ')}
    >
      {/* Header */}
      {fullScreen ? (
        <>
          <Image src="/cougars.avif" alt="Battersea Cougars" width={80} height={80} className="object-contain" />
          <h1 className="text-white text-xl font-semibold tracking-wide -mt-1">{title}</h1>
        </>
      ) : (
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-100">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-full text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Input */}
      <div className={['w-full flex flex-col gap-1.5', fullScreen ? 'items-stretch' : ''].join(' ')}>
        {!fullScreen && <label className="text-xs font-medium text-zinc-400">Password</label>}
        <input
          ref={inputRef}
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={fullScreen ? 'Password' : 'Enter password'}
          autoComplete="current-password"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-colors"
        />
        {error && <p className="text-red-400 text-xs">{error}</p>}
      </div>

      {/* Actions */}
      {fullScreen ? (
        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="w-full rounded-lg bg-primary hover:bg-primary-dk disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-2.5 text-sm transition-colors"
        >
          {loading ? 'Checking…' : submitLabel}
        </button>
      ) : (
        <div className="flex gap-2">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold bg-zinc-800 text-zinc-300 hover:bg-zinc-700 ring-1 ring-inset ring-zinc-700 transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-white hover:bg-primary-dk disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
          >
            {loading ? 'Verifying…' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900">
        <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
          <Image src="/cougars.avif" alt="" width={600} height={600} className="object-contain" />
        </div>
        {card}
      </div>
    );
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      {card}
    </div>,
    document.body
  );
}
