'use client';

import { Suspense } from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import useSWR from 'swr';
import Image from 'next/image';
import { FaUserPlus, FaCopy } from 'react-icons/fa';
import { FiEye, FiEyeOff, FiZap } from 'react-icons/fi';
import SplashLoader from '@/components/SplashLoader';
import AppLogin from '@/components/AppLogin';
import AdminButton from '@/components/AdminButton';
import SessionSelect from '@/components/SessionSelect';
import PlayerCard from '@/components/PlayerCard';
import TeamsView from '@/components/TeamsView';
import RosterPanel from '@/components/RosterPanel';
import type { Player, Session, StoredTeam } from '@/lib/airtable';
import type { SolverTeam } from '@/lib/solver';

const fetcher = (url: string) => fetch(url).then((r) => r.json());
const DEBOUNCE_MS = 600;

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Restore session from URL on mount
  useEffect(() => {
    const sessionIdFromUrl = searchParams.get('sessionId');
    if (sessionIdFromUrl) {
      setSelectedSessionId(sessionIdFromUrl);
    }
  }, [searchParams]);

  // Stable "today" reference — used both for session date grouping and isPast.
  const today = useMemo(() => { const d = new Date(); d.setHours(0,0,0,0); return d; }, []);
  const [localAttending,    setLocalAttending]    = useState<Record<string, Set<string>>>({});
  const [isSaving,          setIsSaving]          = useState(false);
  const [saveError,         setSaveError]         = useState<string | null>(null);
  const [teams,             setTeams]             = useState<SolverTeam[] | null>(null);
  const [solveKey,          setSolveKey]          = useState(0);
  const teamsRef = useRef<HTMLDivElement>(null);
  const [generating,        setGenerating]        = useState(false);
  const [genError,          setGenError]          = useState<string | null>(null);
  const [panelOpen,         setPanelOpen]         = useState(false);
  const [showAllMode,       setShowAllMode]       = useState(false);
  const [isAdmin,           setIsAdmin]           = useState(false);
  const [isAuthenticated,   setIsAuthenticated]   = useState(false);
  const [authChecked,       setAuthChecked]       = useState(false);
  const { data: sessions, error: sessionsError } = useSWR<Session[]>(authChecked && isAuthenticated ? '/api/sessions' : null, fetcher);
  const { data: players,  error: playersError  } = useSWR<Player[]>(authChecked && isAuthenticated ? '/api/players'  : null, fetcher);
  const [splashExiting,     setSplashExiting]     = useState(false);
  const [splashGone,        setSplashGone]        = useState(false);

  // Debounce refs — hold the latest pending flush without triggering re-renders
  const debounceTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingFlush   = useRef<{ sessionId: string; ids: Set<string> } | null>(null);

  // Flush the pending attending set to Airtable
  async function flush() {
    const pending = pendingFlush.current;
    if (!pending) return;
    pendingFlush.current = null;
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: pending.sessionId, attendingIds: [...pending.ids] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
      // Optimistic local state is already correct — don't overwrite it with the
      // server echo, which would race with any click made during the network round-trip.
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  }

  // Schedule a debounced flush with the latest attending set
  function scheduleFlush(sessionId: string, newIds: Set<string>) {
    pendingFlush.current = { sessionId, ids: new Set(newIds) };
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(flush, DEBOUNCE_MS);
  }

  // Restore auth state from /api/me (reads HttpOnly cookies server-side)
  useEffect(() => {
    fetch('/api/me').then((r) => r.json()).then(({ isAuthenticated, isAdmin }) => {
      if (isAuthenticated) { setIsAuthenticated(true); setIsAdmin(!!isAdmin); }
      setAuthChecked(true);
    });
  }, []);

  // Start exiting the splash when auth is confirmed and either not authenticated, or data is loaded.
  useEffect(() => {
    if (authChecked && (!isAuthenticated || (sessions && players))) {
      setSplashExiting(true);
    }
  }, [authChecked, isAuthenticated, sessions, players]);

  // Once splash starts exiting, schedule its removal after the CSS transition (300ms).
  // Kept separate so the cleanup here doesn't cancel the timer when splashExiting flips.
  useEffect(() => {
    if (!splashExiting) return;
    const t = setTimeout(() => setSplashGone(true), 300);
    return () => clearTimeout(t);
  }, [splashExiting]);

  // Flush immediately when the session changes so pending writes aren't lost;
  // also clear any locally-generated teams so we show the session's stored teams.
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      flush();
    }
    setTeams(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSessionId]);

  // ── Session grouping ─────────────────────────────────────────────────────
  const { upcoming, past } = useMemo(() => {
    if (!sessions) return { upcoming: [], past: [] };
    const upcoming: Session[] = [], past: Session[] = [];
    for (const s of sessions) {
      (s.date && new Date(s.date) < today ? past : upcoming).push(s);
    }
    const byDate = (a: Session, b: Session) => {
      if (!a.date) return 1; if (!b.date) return -1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    };
    return { upcoming: upcoming.sort(byDate), past: past.sort(byDate) };
  }, [sessions, today]);

  const session: Session | null = useMemo(() => {
    const all = [...upcoming, ...past];
    if (!selectedSessionId) return upcoming[0] ?? past[0] ?? null;
    return all.find((s) => s.id === selectedSessionId) ?? upcoming[0] ?? null;
  }, [selectedSessionId, upcoming, past]);

  // Most recent session before the current one that has at least one player
  const previousSession: Session | null = useMemo(() => {
    if (!session) return null;
    const sessionDate = session.date ? new Date(session.date).getTime() : Infinity;
    const all = [...upcoming, ...past]
      .filter((s) => s.id !== session.id && s.attendingIds.length > 0)
      .filter((s) => s.date && new Date(s.date).getTime() < sessionDate)
      .sort((a, b) => new Date(b.date!).getTime() - new Date(a.date!).getTime());
    return all[0] ?? null;
  }, [session, upcoming, past]);

  const attendingIds: Set<string> = useMemo(() => {
    if (!session) return new Set();
    return localAttending[session.id] ?? new Set(session.attendingIds);
  }, [session, localAttending]);

  const isPast = useMemo(() => {
    if (!session?.date) return false;
    return new Date(session.date) < today;
  }, [session, today]);

  const isReadonly = isPast && !isAdmin;

  const hideUnselected = searchParams.get('selectedOnly') === '1';

  function setHideUnselected(val: boolean | ((prev: boolean) => boolean)) {
    const next = typeof val === 'function' ? val(hideUnselected) : val;
    const params = new URLSearchParams(searchParams.toString());
    if (next) { params.set('selectedOnly', '1'); } else { params.delete('selectedOnly'); }
    router.replace(`?${params.toString()}`, { scroll: false });
  }

  // Update URL to reflect the current session (on auto-selection or manual change)
  useEffect(() => {
    if (session) {
      const currentSessionId = searchParams.get('sessionId');
      if (currentSessionId !== session.id) {
        router.replace(`?sessionId=${session.id}`, { scroll: false });
      }
    }
  }, [session, searchParams, router]);

  // ── Airtable teams for this session ─────────────────────────────────────────
  const { data: storedTeamsData, mutate: mutateStoredTeams } = useSWR<{ teams: StoredTeam[] }>(
    session ? `/api/teams?sessionId=${session.id}` : null,
    fetcher,
  );

  const airtableTeams: SolverTeam[] | null = useMemo(() => {
    if (!storedTeamsData?.teams?.length || !players) return null;
    return storedTeamsData.teams.map((t) => {
      const teamPlayers = (t.playerIds ?? [])
        .map((id) => players.find((p) => p.id === id))
        .filter((p): p is Player => !!p)
        .map((p) => ({ id: p.id, name: p.name, position: p.position, rating: p.rating, cougar: p.cougar }));
      return {
        name: t.name,
        players: teamPlayers,
        totalRating: teamPlayers.reduce((s, p) => s + p.rating, 0),
      };
    });
  }, [storedTeamsData, players]);

  function copyFromPrevious() {
    if (!session || !previousSession) return;
    const ids = new Set(previousSession.attendingIds);
    setTeams(null);
    mutateStoredTeams({ teams: [] }, false);
    fetch(`/api/teams?sessionId=${session.id}`, { method: 'DELETE' }).catch(() => {});
    setLocalAttending((prev) => ({ ...prev, [session.id]: ids }));
    scheduleFlush(session.id, ids);
  }

  // ── Toggle single player ─────────────────────────────────────────────────
  function handleToggle(playerId: string, nowAttending: boolean) {
    if (!session || isReadonly) return;
    // Clear local + backend teams immediately — roster change invalidates them
    setTeams(null);
    mutateStoredTeams({ teams: [] }, false);
    fetch(`/api/teams?sessionId=${session.id}`, { method: 'DELETE' }).catch(() => {});
    // Build the new set on top of whatever is already pending (handles rapid
    // clicks before a re-render without losing intermediate toggles).
    const base =
      pendingFlush.current?.sessionId === session.id
        ? pendingFlush.current.ids
        : localAttending[session.id] ?? new Set(session.attendingIds);
    const next = new Set(base);
    nowAttending ? next.add(playerId) : next.delete(playerId);
    // Pure state update — no side effects inside the updater.
    setLocalAttending((prev) => ({ ...prev, [session.id]: next }));
    scheduleFlush(session.id, next);
  }

  // ── Generate teams ───────────────────────────────────────────────────────
  async function handleGenerate() {
    if (!players || !session) return;
    if (attendingIds.size < 6) {
      setGenError('At least 6 players are required to generate teams.');
      return;
    }
    // Flush any pending saves first so teams reflect final attendance
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
      await flush();
    }
    const attending = players.filter((p) => attendingIds.has(p.id));
    if (!attending.length) return;
    setGenerating(true); setGenError(null);
    // Yield two animation frames so the browser can paint the overlay before the fetch starts
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? `HTTP ${res.status}`); }
      const data = await res.json();
      setTeams(data.teams);
      setSolveKey((k) => k + 1);
      mutateStoredTeams();
      setTimeout(() => teamsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setGenerating(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────
  const canGenerate = !!(sessions && players && attendingIds.size > 0 && !generating && !isReadonly);
  const showReadyPulse = canGenerate && !(teams ?? airtableTeams);

  return (
    <>
      {/* Background image */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/cougars_background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.3,
        }}
      />

      {/* Splash — visible until auth confirmed + (not authenticated, or data loaded) */}
      {!splashGone && <SplashLoader isExiting={splashExiting} />}

      {/* Login — shown once splash exits and user is not authenticated */}
      {splashGone && !isAuthenticated && (
        <AppLogin onAuth={(adminMode) => {
          setIsAuthenticated(true);
          if (adminMode) setIsAdmin(true);
          // Bring splash back while app data loads
          setSplashGone(false);
          setSplashExiting(false);
        }} />
      )}

      {/* Error — only reachable when authenticated and SWR has fired */}
      {(sessionsError || playersError) && (
        <div className="min-h-screen bg-base flex items-center justify-center text-red-400 text-sm">
          Failed to load data — check AIRTABLE_API env var.
        </div>
      )}

      {/* Main app — authenticated, splash gone, data loaded */}
      {splashGone && isAuthenticated && sessions && players && (
      <div className="min-h-screen bg-base/0">
      {/* Generating overlay */}
      <AnimatePresence>
        {generating && (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/80 pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            <div className="three-body" role="status" aria-label="Generating teams">
              <div className="three-body__dot" />
              <div className="three-body__dot" />
              <div className="three-body__dot" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page header — full-bleed fixed bar */}
      <header className="fixed top-0 inset-x-0 z-30 h-16 sm:h-[96px] border-b border-zinc-700/60 bg-base/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-4 sm:px-8 flex items-center justify-between h-full">
          <div className="hidden sm:flex items-center gap-2 sm:gap-3 h-full py-5">
            <Image src="/cougars.avif" alt="Cougars" width={56} height={56} className="flex-shrink-0 w-10 sm:w-14 h-10 sm:h-14" />
            <h1 className="text-xs sm:text-sm font-semibold text-zinc-100 tracking-tight">Session Manager</h1>
          </div>

          <div className="flex-1 sm:flex-none flex items-center h-full py-2 sm:py-5 gap-2 sm:gap-2 lg:gap-4">
            {/* Session picker */}
            <div className="flex-1 sm:flex-none flex items-center gap-1 min-w-0">
              <label className="text-xs font-medium text-zinc-500 hidden md:inline">Session</label>
              <SessionSelect
                className="flex-1 sm:flex-none"
                upcoming={upcoming}
                past={past}
                value={session?.id ?? ''}
                onChange={(id) => { setSelectedSessionId(id); setTeams(null); }}
              />
            </div>

            {/* Add Players — same size as Admin button: w-8 h-8 circle */}
            <button
              onClick={() => setPanelOpen(true)}
              title="Add players"
              className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-800 text-zinc-300 ring-1 ring-inset ring-white/10 hover:bg-zinc-700 hover:text-white active:bg-zinc-600 active:text-white transition-colors flex-shrink-0"
            >
              <FaUserPlus className="w-3.5 h-3.5" />
            </button>

            {/* Generate — desktop header only */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={[
                'hidden sm:flex h-8 items-center justify-center rounded-full px-5 text-sm font-semibold transition-colors',
                canGenerate
                  ? `bg-primary text-white hover:bg-primary-dk active:brightness-90${showReadyPulse ? ' btn-ready-pulse' : ''}`
                  : 'bg-zinc-800 text-zinc-600 ring-1 ring-inset ring-white/5 cursor-not-allowed',
              ].join(' ')}
            >
              {generating ? 'Solving…' : 'Generate Teams'}
            </button>

            {/* Admin — stays normal size */}
            <AdminButton isAdmin={isAdmin} onAdminChange={(v) => {
              setIsAdmin(v);
              if (!v) fetch('/api/admin-auth', { method: 'DELETE' });
            }} />
          </div>
        </div>
      </header>

      {/* Main content — padded to clear fixed header */}
      <main className="mx-auto max-w-5xl px-4 sm:px-8 pt-20 sm:pt-32 pb-8 relative z-10">

        <AnimatePresence mode="wait">
        <motion.div
          key={session?.id ?? ''}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
        >
        {attendingIds.size === 0 && !showAllMode ? (
          <div className="flex items-start justify-center py-20 text-center gap-12">
            {previousSession && !isReadonly && (
              <div className="flex flex-col items-center cursor-pointer group" onClick={copyFromPrevious}>
                <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center mb-3 transition-colors">
                  <FaCopy className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
                </div>
                <p className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">Copy previous session</p>
                <p className="text-xs text-zinc-600 group-hover:text-zinc-500 mt-1 transition-colors">
                  {previousSession.attendingIds.length} players from {previousSession.date
                    ? new Date(previousSession.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
                    : 'last session'}
                </p>
              </div>
            )}
            <div className="flex flex-col items-center cursor-pointer group" onClick={() => { setShowAllMode(true); setHideUnselected(false); }}>
              <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center mb-3 transition-colors">
                <FiEye className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
              </div>
              <p className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">Show All Available</p>
              <p className="text-xs text-zinc-600 group-hover:text-zinc-500 mt-1 transition-colors">Pick who&apos;s attending</p>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400 whitespace-nowrap">
                {attendingIds.size}/{players?.length ?? 0} Players
              </span>
              <div className="flex-1 h-px bg-zinc-700/50" />
              <button
                onClick={() => setHideUnselected((v) => !v)}
                title={hideUnselected ? 'Show all players' : 'Selected only'}
                className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ring-1 ring-inset transition-all ${
                  hideUnselected
                    ? 'bg-zinc-700/60 text-zinc-300 ring-white/10'
                    : 'text-zinc-600 hover:text-zinc-300 ring-transparent hover:bg-zinc-800/60 hover:ring-white/10'
                }`}
              >
                {hideUnselected ? <FiEyeOff className="w-3 h-3" /> : <FiEye className="w-3 h-3" />}
                <span className="hidden sm:inline">{hideUnselected ? 'Show all' : 'Selected only'}</span>
              </button>
              {!isReadonly && attendingIds.size > 0 && (
                <button
                  onClick={() => {
                    if (!session) return;
                    setTeams(null);
                    mutateStoredTeams({ teams: [] }, false);
                    fetch(`/api/teams?sessionId=${session.id}`, { method: 'DELETE' }).catch(() => {});
                    const empty = new Set<string>();
                    setLocalAttending((prev) => ({ ...prev, [session.id]: empty }));
                    scheduleFlush(session.id, empty);
                    setShowAllMode(false);
                  }}
                  className="text-xs text-zinc-600 hover:text-zinc-300 rounded-full px-2 py-0.5 hover:bg-zinc-800/60 ring-1 ring-inset ring-transparent hover:ring-white/10 transition-all"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-y-3 sm:gap-y-4 [&>*]:-mr-2 sm:[&>*]:-mr-3">
              <AnimatePresence mode="popLayout">
                {(players ?? []).filter((p) => !hideUnselected || attendingIds.has(p.id)).map((p, i) => (
                  <motion.div
                    key={p.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    style={{ zIndex: i, perspective: '600px' }}
                  >
                    <PlayerCard
                      id={p.id}
                      name={p.name}
                      position={p.position}
                      cougar={p.cougar}
                      photoUrl={p.photoUrl}
                      rating={p.rating}
                      showRating={isAdmin}
                      selected={attendingIds.has(p.id)}
                      onToggle={handleToggle}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
        </motion.div>
        </AnimatePresence>

        <div ref={teamsRef}>
          {(teams ?? airtableTeams)
            ? <TeamsView
                key={solveKey}
                teams={(teams ?? airtableTeams)!}
                isAdmin={isAdmin}
                onTeamsChange={(updated) => {
                  if (!session) return;
                  fetch('/api/teams', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      sessionId: session.id,
                      teams: updated.map((t) => ({
                        name: t.name,
                        playerIds: t.players.map((p) => p.id),
                      })),
                    }),
                  }).catch(() => {});
                }}
              />
            : attendingIds.size > 0 && (
              <div className="mt-16 flex flex-col items-center py-10 text-center">
                <p className="text-sm font-semibold text-zinc-500 mb-1.5">Teams not generated yet</p>
                <p className="text-xs text-zinc-600">Use <span className="text-zinc-400 font-medium">Generate Teams</span> when the roster is ready</p>
              </div>
            )
          }
        </div>
      </main>

      {/* Floating Generate button — mobile only */}
      {canGenerate && (
        <button
          onClick={handleGenerate}
          className={[
            'fixed bottom-6 right-5 z-30 sm:hidden flex items-center gap-2 h-12 rounded-full px-5 text-sm font-semibold shadow-lg shadow-black/50 transition-colors',
            `bg-primary text-white active:brightness-90${showReadyPulse ? ' btn-ready-pulse' : ''}`,
          ].join(' ')}
        >
          {generating ? 'Solving…' : <FiZap className="w-5 h-5" />}
        </button>
      )}

      {panelOpen && (
        <RosterPanel
          players={players}
          attendingIds={attendingIds}
          onToggle={handleToggle}
          onClose={() => setPanelOpen(false)}
          isAdmin={isAdmin}
        />
      )}

      {/* Error toast — fixed top, slides down into position */}
      {(genError || saveError) && (
        <div className="fixed inset-x-0 top-6 w-full flex justify-center z-50 pointer-events-none">
          <div className="toast-slide-up pointer-events-auto flex items-start gap-3 rounded-xl border border-red-500/40 bg-zinc-900 shadow-2xl px-5 py-4 max-w-lg w-[calc(100%-3rem)]">
            <span className="text-red-400 text-sm leading-snug flex-1">{genError ?? saveError}</span>
            <button
              onClick={() => { setGenError(null); setSaveError(null); }}
              className="flex-shrink-0 text-zinc-500 hover:text-zinc-200 transition-colors text-base leading-none mt-0.5"
              aria-label="Dismiss error"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<SplashLoader isExiting={false} />}>
      <HomeContent />
    </Suspense>
  );
}
