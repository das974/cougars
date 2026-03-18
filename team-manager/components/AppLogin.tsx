'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';

interface Props {
  onAuth: () => void;
}

export default function AppLogin({ onAuth }: Props) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/app-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        onAuth();
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

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900">
      {/* Background logo */}
      <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none select-none">
        <Image src="/cougars.avif" alt="" width={600} height={600} className="object-contain" />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 flex flex-col items-center gap-6 rounded-2xl bg-zinc-800 px-10 py-10 shadow-2xl border border-zinc-700 w-80"
      >
        <Image src="/cougars.avif" alt="Battersea Cougars" width={72} height={72} className="rounded-full" />
        <h1 className="text-white text-xl font-semibold tracking-wide">Battersea Cougars</h1>

        <div className="w-full flex flex-col gap-2">
          <input
            ref={inputRef}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            autoFocus
            autoComplete="current-password"
            className="w-full rounded-lg bg-zinc-700 border border-zinc-600 px-4 py-2.5 text-white placeholder-zinc-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {error && <p className="text-red-400 text-xs text-center">{error}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || password.length === 0}
          className="w-full rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-900 font-semibold py-2.5 text-sm transition-colors"
        >
          {loading ? 'Checking…' : 'Enter'}
        </button>
      </form>
    </div>
  );
}
