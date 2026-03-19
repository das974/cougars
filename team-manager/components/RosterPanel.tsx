'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import { FaPaw } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import type { Player } from '@/lib/airtable';
import { airtablePlayerUrl } from '@/lib/constants';

interface Props {
  players: Player[];
  attendingIds: Set<string>;
  onToggle: (id: string, attending: boolean) => void;
  onClose: () => void;
  isAdmin?: boolean;
}

export default function RosterPanel({ players, attendingIds, onToggle, onClose, isAdmin }: Props) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Trigger the slide-in on mount
  useEffect(() => { requestAnimationFrame(() => setOpen(true)); }, []);

  function handleClose() {
    setOpen(false);
    // Wait for the slide-out to finish before unmounting
    setTimeout(onClose, 300);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const bySearch = q ? players.filter((p) => p.name.toLowerCase().includes(q)) : players;
    return showAll ? bySearch : bySearch.filter((p) => !attendingIds.has(p.id));
  }, [players, search, showAll, attendingIds]);

  // Alphabetical only
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.name.localeCompare(b.name)),
    [filtered],
  );

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/25 z-40 transition-opacity duration-300"
        style={{ opacity: open ? 1 : 0 }}
        onClick={handleClose}
      />

      {/* Slide-in panel from left */}
      <div
        className="fixed left-0 top-0 h-full w-full sm:w-[420px] bg-zinc-900 shadow-2xl shadow-black/60 z-50 flex flex-col transition-transform duration-300 ease-out border-r border-zinc-700/60"
        style={{ transform: open ? 'translateX(0)' : 'translateX(-100%)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-zinc-700/60">
          <div>
            <h2 className="text-xs sm:text-sm font-semibold text-zinc-100">Full Roster</h2>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-[10px] sm:text-xs text-zinc-500">
                {attendingIds.size} attending · {players.length} total
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowAll(false)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset transition-colors ${
                    !showAll
                      ? 'bg-green/20 text-green ring-green/30'
                      : 'text-zinc-500 ring-zinc-700/60 hover:text-zinc-300'
                  }`}
                >
                  Available
                </button>
                <button
                  onClick={() => setShowAll(true)}
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ring-1 ring-inset transition-colors ${
                    showAll
                      ? 'bg-zinc-600/50 text-zinc-200 ring-zinc-500/40'
                      : 'text-zinc-500 ring-zinc-700/60 hover:text-zinc-300'
                  }`}
                >
                  All
                </button>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Search */}
        <div className="px-3 sm:px-4 pt-2 sm:pt-3 pb-1.5 sm:pb-2">
          <input
            type="search"
            placeholder="Search players…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 rounded-md border border-zinc-700 bg-zinc-800 text-xs sm:text-sm text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-green/40"
          />
        </div>

        {/* Player list */}
        <div className="flex-1 overflow-y-auto px-1.5 sm:px-2 pb-3 sm:pb-4 panel-scroll">
          {sorted.length === 0 ? (
            <p className="text-center text-xs text-zinc-500 pt-8">No players match &quot;{search}&quot;</p>
          ) : (
            sorted.map((p) => {
              const attending = attendingIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => onToggle(p.id, !attending)}
                  className="roster-row w-full flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-lg text-left"
                >
                  {/* Photo / initial */}
                  <div className="relative flex-none w-7 sm:w-9 h-7 sm:h-9 rounded-full overflow-hidden bg-zinc-900 ring-1 ring-inset ring-zinc-700/60">
                    {p.photoUrl ? (
                      <Image
                        src={p.photoUrl}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 28px, 36px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs sm:text-sm font-semibold text-zinc-500">
                        {p.name[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Name + badges */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] sm:text-xs font-semibold truncate text-zinc-200">
                      {p.name}
                    </p>
                    <div className="flex gap-0.5 sm:gap-1 mt-0.5 h-4 sm:h-[18px] items-center">
                      <span
                        className={`inline-flex items-center rounded-md px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold ring-1 ring-inset uppercase tracking-wide ${
                          p.position === 'F'
                            ? 'bg-green/20 text-green ring-green/30'
                            : p.position === 'D'
                            ? 'bg-zinc-400/20 text-zinc-300 ring-zinc-400/30'
                            : 'bg-zinc-400/20 text-zinc-400 ring-zinc-400/30'
                        }`}
                      >
                        {p.position || '—'}
                      </span>
                      {p.cougar && (
                        <span className="inline-flex items-center gap-0.5 rounded-md px-1 sm:px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold uppercase tracking-wide bg-primary/20 text-primary ring-1 ring-inset ring-primary/35">
                          <FaPaw className="w-1.5 sm:w-2 h-1.5 sm:h-2" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Admin: Airtable link */}
                  {isAdmin && (
                    <a
                      href={airtablePlayerUrl(p.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex-none w-5 sm:w-6 h-5 sm:h-6 flex items-center justify-center rounded-md text-zinc-600 hover:text-green hover:bg-zinc-800 transition-colors"
                      title="Edit in Airtable"
                    >
                      <FiExternalLink className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                    </a>
                  )}

                  {/* Check indicator — only shown in "All" view */}
                  {showAll && (
                    <div
                      className={[
                        'flex-none w-4 sm:w-5 h-4 sm:h-5 rounded-full flex items-center justify-center text-[8px] sm:text-[10px] transition-colors',
                        attending
                          ? 'bg-green/25 text-green/80 ring-1 ring-inset ring-green/30'
                          : 'border border-zinc-700',
                      ].join(' ')}
                    >
                      {attending && '✓'}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
