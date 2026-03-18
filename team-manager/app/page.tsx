'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import useSWR from 'swr';
import Image from 'next/image';
import { FaUserPlus } from 'react-icons/fa';
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

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  return document.cookie.split('; ').find((r) => r.startsWith(name + '='))?.split('=')[1];
}
function setCookie(name: string, value: string, days = 30) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Strict`;
}
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Strict`;
}

export default function Home() {
  const { data: sessions, error: sessionsError } = useSWR<Session[]>('/api/sessions', fetcher);
  const { data: players,  error: playersError  } = useSWR<Player[]>('/api/players',  fetcher);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

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
  const [isAdmin,           setIsAdmin]           = useState(false);
  const [isAuthenticated,   setIsAuthenticated]   = useState(false);
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

  // Restore auth state from cookies
  useEffect(() => {
    if (getCookie('app_auth') === '1') {
      setIsAuthenticated(true);
      if (getCookie('admin_auth') === '1') setIsAdmin(true);
    }
  }, []);

  // Fade out the splash when data is ready
  useEffect(() => {
    if (sessions && players && !splashExiting) {
      setSplashExiting(true);
      const t = setTimeout(() => setSplashGone(true), 500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessions, players]);

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

  const attendingIds: Set<string> = useMemo(() => {
    if (!session) return new Set();
    return localAttending[session.id] ?? new Set(session.attendingIds);
  }, [session, localAttending]);

  const attendingPlayers = useMemo(() => {
    if (!players) return [];
    return players
      .filter((p) => attendingIds.has(p.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [players, attendingIds]);

  const isPast = useMemo(() => {
    if (!session?.date) return false;
    return new Date(session.date) < today;
  }, [session, today]);

  const isReadonly = isPast && !isAdmin;

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

  const groupedAttending = useMemo(() => ({
    forwards: attendingPlayers.filter((p) => p.position === 'F'),
    defence:  attendingPlayers.filter((p) => p.position === 'D'),
    other:    attendingPlayers.filter((p) => p.position !== 'F' && p.position !== 'D'),
  }), [attendingPlayers]);

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
    try {
      const res = await fetch('/api/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ players: attending, sessionId: session.id }),
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
  if (sessionsError || playersError) {
    return (
      <div className="min-h-screen bg-base flex items-center justify-center text-red-400 text-sm">
        Failed to load data — check AIRTABLE_API env var.
      </div>
    );
  }
  if (!sessions || !players) return <SplashLoader isExiting={false} />;

  const canGenerate = attendingIds.size > 0 && !generating && !isReadonly;

  return (
    <>
      {!splashGone && <SplashLoader isExiting={splashExiting} />}
      {splashGone && !isAuthenticated && (
        <AppLogin onAuth={(adminMode) => {
          setIsAuthenticated(true);
          setCookie('app_auth', '1');
          if (adminMode) { setIsAdmin(true); setCookie('admin_auth', '1'); }
        }} />
      )}
      <div className={`min-h-screen bg-base transition-opacity duration-500 ${splashExiting && isAuthenticated ? 'opacity-100' : 'opacity-0'}`}>
      {/* Generating overlay */}
      {generating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-zinc-900/60 backdrop-blur-sm pointer-events-none">
          <div className="three-body" role="status" aria-label="Generating teams">
            <div className="three-body__dot" />
            <div className="three-body__dot" />
            <div className="three-body__dot" />
          </div>
        </div>
      )}
      {/* Background image — more visible on dark */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: 'url(/cougars_background.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.22,
        }}
      />

      {/* Page header — full-bleed sticky bar */}
      <header className="sticky top-0 z-30 border-b border-zinc-700/60 bg-base/95 backdrop-blur-md">
        <div className="mx-auto max-w-5xl px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/cougars.avif" alt="Cougars" width={56} height={56} className="flex-shrink-0" />
            <h1 className="text-sm font-semibold text-zinc-100 tracking-tight">Cougars Session Team Manager</h1>
          </div>

          <div className="flex items-center gap-4">
            {/* Session picker */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-zinc-500">Session</label>
              <SessionSelect
                upcoming={upcoming}
                past={past}
                value={session?.id ?? ''}
                onChange={(id) => { setSelectedSessionId(id); setTeams(null); }}
              />
            </div>

            {/* Add Players */}
            <button
              onClick={() => setPanelOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800 px-3.5 py-1.5 text-sm font-medium text-zinc-300 ring-1 ring-inset ring-white/10 hover:bg-zinc-700 hover:text-white transition-colors"
            >
              <FaUserPlus className="w-3.5 h-3.5" />
              Add Players
            </button>

            {/* Generate */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={[
                'relative inline-flex items-center justify-center rounded-full px-5 py-1.5 text-sm font-semibold transition-colors',
                canGenerate
                  ? 'bg-primary text-white hover:bg-primary-dk'
                  : 'bg-zinc-800 text-zinc-600 ring-1 ring-inset ring-white/5 cursor-not-allowed',
              ].join(' ')}
            >
              {/* Invisible spacer always sized to the longer label */}
              <span className="invisible whitespace-nowrap">Generate Teams</span>
              {/* Visible label absolutely centred — never affects layout */}
              <span className="absolute inset-0 flex items-center justify-center whitespace-nowrap">
                {generating ? 'Solving…' : 'Generate Teams'}
              </span>
            </button>

            {/* Admin */}
            <AdminButton isAdmin={isAdmin} onAdminChange={(v) => {
              setIsAdmin(v);
              if (v) setCookie('admin_auth', '1');
              else deleteCookie('admin_auth');
            }} />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-5xl px-8 py-8 relative z-10">

        {/* Player groups */}
        {attendingPlayers.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 text-center cursor-pointer group"
            onClick={() => setPanelOpen(true)}
          >
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-zinc-700 group-hover:border-zinc-500 flex items-center justify-center mb-3 transition-colors">
              <FaUserPlus className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
            </div>
            <p className="text-sm font-medium text-zinc-500 group-hover:text-zinc-300 transition-colors">No players yet</p>
            <p className="text-xs text-zinc-600 group-hover:text-zinc-500 mt-1 transition-colors">Click Add Players in the header to start</p>
          </div>
        ) : (
          <div className="space-y-8">
            {([['Forwards', groupedAttending.forwards], ['Defence', groupedAttending.defence], ['Other', groupedAttending.other]] as [string, typeof attendingPlayers][]).map(([label, group]) =>
              group.length === 0 ? null : (
                <div key={label}>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs font-semibold text-zinc-300 uppercase tracking-widest whitespace-nowrap">
                      {group.length} {label}
                    </span>
                    <div className="flex-1 h-px bg-zinc-700/50" />
                    {label === 'Forwards' && attendingIds.size > 0 && (
                      <button
                        onClick={() => {
                          if (!session) return;
                          setTeams(null);
                          mutateStoredTeams({ teams: [] }, false);
                          fetch(`/api/teams?sessionId=${session.id}`, { method: 'DELETE' }).catch(() => {});
                          const empty = new Set<string>();
                          setLocalAttending((prev) => ({ ...prev, [session.id]: empty }));
                          scheduleFlush(session.id, empty);
                        }}
                        className="text-xs text-zinc-600 hover:text-zinc-300 rounded-full px-2 py-0.5 hover:bg-zinc-800/60 ring-1 ring-inset ring-transparent hover:ring-white/10 transition-all"
                      >
                        Clear all
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-4">
                    {group.map((p) => (
                      <PlayerCard
                        key={p.id}
                        id={p.id}
                        name={p.name}
                        position={p.position}
                        cougar={p.cougar}
                        photoUrl={p.photoUrl}
                        rating={p.rating}
                        attending={true}
                        busy={false}
                        isAdmin={isAdmin}
                        onToggle={handleToggle}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {attendingPlayers.length > 0 && (
          <div className="mt-8 flex items-center gap-3">
            <span className="text-xl font-bold text-primary whitespace-nowrap">{attendingIds.size} Total</span>
            {!(teams ?? airtableTeams) && <div className="flex-1 h-px bg-zinc-700/50" />}
            {isSaving && <span className="text-zinc-500 animate-pulse text-xs">Saving…</span>}
          </div>
        )}

        <div ref={teamsRef}>
          {(teams ?? airtableTeams)
            ? <TeamsView key={solveKey} teams={(teams ?? airtableTeams)!} isAdmin={isAdmin} />
            : attendingPlayers.length > 0 && (
              <div className="mt-10 flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-zinc-700/50 bg-zinc-900/30">
                <p className="text-sm font-semibold text-zinc-400 mb-1">No teams generated yet</p>
                <p className="text-xs text-zinc-600">Click <span className="text-zinc-400 font-medium">Generate Teams</span> when the roster is ready</p>
              </div>
            )
          }
        </div>
      </main>

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
    </>
  );
}
