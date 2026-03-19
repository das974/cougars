'use client';

import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';
import type { Session } from '@/lib/airtable';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

interface Props {
  upcoming: Session[];
  past: Session[];
  value: string;
  onChange: (id: string) => void;
  className?: string;
}

export default function SessionSelect({ upcoming, past, value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const allSessions = [...upcoming, ...past];
  const selected = allSessions.find((s) => s.id === value);
  const label = selected?.date ? formatDate(selected.date) : (selected?.id ?? '—');

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function pick(id: string) { onChange(id); setOpen(false); }

  function renderGroup(sessions: Session[], groupLabel: string) {
    if (!sessions.length) return null;
    return (
      <div key={groupLabel}>
        <div className="px-2 sm:px-3 pt-1.5 sm:pt-2 pb-1">
          <span className="text-[8px] sm:text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{groupLabel}</span>
        </div>
        {sessions.map((s) => {
          const isSelected = s.id === value;
          return (
            <button
              key={s.id}
              onClick={() => pick(s.id)}
              className={[
                'w-full flex items-center justify-between px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-lg transition-colors',
                isSelected
                  ? 'text-zinc-100 bg-zinc-700/60'
                  : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100',
              ].join(' ')}
            >
              <span className="truncate flex-1">{s.date ? formatDate(s.date) : s.id}</span>
              {isSelected && <FiCheck className="w-3 sm:w-3.5 h-3 sm:h-3.5 text-primary flex-shrink-0 ml-1" />}
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div ref={ref} className={`relative min-w-0 ${className ?? ''}`}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="h-8 w-full flex items-center gap-1 sm:gap-2 pl-2 sm:pl-3 pr-2 sm:pr-2.5 rounded-lg border border-zinc-700 bg-zinc-800 text-xs sm:text-sm text-zinc-200 hover:border-zinc-600 hover:bg-zinc-700/60 active:bg-zinc-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 sm:min-w-[140px]"
      >
        <span className="flex-1 text-left truncate">{label}</span>
        <FiChevronDown
          className={`w-3 sm:w-4 h-3 sm:h-4 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown — at least as wide as the trigger on mobile, fixed 208px on desktop */}
      <div
        className={[
          'absolute left-0 top-full mt-1.5 z-50 min-w-full sm:w-52 rounded-xl border border-zinc-700/80 bg-zinc-900 shadow-2xl shadow-black/50 p-1 overflow-hidden',
          'transition-all duration-150 origin-top',
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
      >
        {renderGroup(upcoming, 'Upcoming')}
        {renderGroup(past, 'Past')}
      </div>
    </div>
  );
}
