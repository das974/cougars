'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { FaPaw } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';
import { airtablePlayerUrl } from '@/lib/constants';

export interface PlayerCardProps {
  id: string;
  name: string;
  position: string;
  cougar: boolean;
  photoUrl: string | null;
  rating?: number;
  selected: boolean;
  isAdmin?: boolean;
  onToggle: (id: string, attending: boolean) => void;
}

export default function PlayerCard({
  id, name, position, cougar, photoUrl, rating, selected, isAdmin, onToggle,
}: PlayerCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  function dismiss() { setSheetOpen(false); }

  function handleClick() {
    if (!selected) { onToggle(id, true); return; }
    if (isAdmin && typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches) {
      setSheetOpen(true);
    } else {
      onToggle(id, false);
    }
  }

  return (
    <>
      <div
        onClick={handleClick}
        role="button"
        tabIndex={-1}
        className="relative select-none group w-full aspect-[5/7]"
        style={{
          border: '2px solid #3f3f46',
          borderRadius: '2px',
          zIndex: selected ? 1 : 0,
          filter: selected ? 'brightness(1.15)' : 'grayscale(50%) brightness(0.6)',
          boxShadow: selected
            ? '0 20px 50px rgba(0,0,0,0.95), 0 6px 14px rgba(0,0,0,0.7)'
            : '0 4px 16px rgba(0,0,0,0.6)',
          transition: 'box-shadow 0.2s ease, transform 0.2s ease, filter 0.2s ease, border-color 0.15s ease',
          transform: selected
            ? 'perspective(500px) rotateY(0deg) scale(1.03)'
            : 'perspective(500px) rotateY(3deg)',
        }}
      >
        <div className="overflow-hidden flex flex-col h-full">

          {/* ── Photo ────────────────────────────────────── */}
          <div className="relative flex-1">
            {photoUrl ? (
              <Image src={photoUrl} alt={name} fill sizes="(max-width: 640px) 34vw, 17vw" className="object-cover object-top" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                <span className={`text-2xl sm:text-5xl font-bold select-none ${selected ? 'text-zinc-300' : 'text-zinc-600'}`}>{name[0]?.toUpperCase()}</span>
              </div>
            )}

            {/* Fade into nameplate */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(10,10,14,1) 0%, rgba(10,10,14,0.3) 28%, transparent 55%)' }}
            />

            {/* Top-left badges: rating (admin) + cougar paw */}
            <div className="absolute top-1 sm:top-1.5 left-1 sm:left-1.5 flex gap-0.5 sm:gap-1">
              {isAdmin && rating != null && rating > 0 && (
                <span className="inline-flex items-center justify-center w-3 sm:w-5 h-3 sm:h-5 rounded-sm text-[6px] sm:text-[8px] font-bold ring-1 ring-inset bg-black/60 text-green ring-green/40 backdrop-blur-sm tabular-nums">
                  {rating}
                </span>
              )}
              {cougar && (
                <span className="inline-flex items-center justify-center w-3 sm:w-5 h-3 sm:h-5 rounded-sm text-[6px] sm:text-[8px] font-bold ring-1 ring-inset bg-black/60 text-primary ring-primary/40 backdrop-blur-sm">
                  <FaPaw className="w-1.5 sm:w-2 h-1.5 sm:h-2" />
                </span>
              )}
            </div>

            {/* Admin: edit in Airtable — hover-only */}
            {isAdmin && (
              <a
                href={airtablePlayerUrl(id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Edit in Airtable"
                className="hidden sm:flex absolute top-1 sm:top-1.5 right-1 sm:right-1.5 w-5 sm:w-6 h-5 sm:h-6 items-center justify-center rounded-sm bg-black/55 text-zinc-300 hover:text-white hover:bg-black/75 ring-1 ring-inset ring-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 backdrop-blur-sm"
              >
                <FiExternalLink className="w-2.5 sm:w-3 h-2.5 sm:h-3" />
              </a>
            )}
          </div>

          {/* ── Nameplate ─────────────────────────────────── */}
          <div className="shrink-0" style={{ background: '#0A0A0E' }}>
            {/* Team-colour rule with slight side padding */}
            <div className="mx-1 sm:mx-2 h-[2px]" style={{ background: selected ? '#CF375A' : '#52525b' }} />
            <p className="px-1 sm:px-2 pb-1 sm:pb-2.5 pt-0.5 sm:pt-1.5 text-[7px] sm:text-[10.5px] font-extrabold text-white uppercase tracking-widest leading-tight truncate text-center">{name}</p>
          </div>

        </div>
      </div>

      {/* Mobile bottom sheet — rendered into document.body via portal */}
      {mounted && sheetOpen && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="sm:hidden fixed inset-0 z-40 bg-black/50 backdrop-fade"
            onClick={dismiss}
          />
          {/* Sheet */}
          <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-zinc-900 rounded-t-2xl sheet-slide-up">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-600" />
            </div>
            {/* Player header */}
            <div className="flex items-center gap-3 px-5 pt-2 pb-4 border-b border-zinc-800">
              <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-zinc-800 ring-1 ring-zinc-700">
                {photoUrl
                  ? <img src={photoUrl} alt={name} className="w-full h-full object-cover object-top" />
                  : <span className="w-full h-full flex items-center justify-center text-lg font-bold text-zinc-500">{name[0]?.toUpperCase()}</span>
                }
              </div>
              <div className="min-w-0">
                <p className="font-extrabold text-white uppercase tracking-widest text-sm truncate">{name}</p>
                <p className="text-zinc-500 text-xs">{position === 'F' ? 'Forward' : position === 'D' ? 'Defence' : position}</p>
              </div>
              {cougar && <FaPaw className="ml-auto shrink-0 text-primary w-4 h-4" />}
            </div>
            {/* Actions */}
            <div className="flex flex-col gap-2 p-4">
              <a
                href={airtablePlayerUrl(id)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={dismiss}
                className="flex items-center gap-3 px-4 py-3 rounded-xl bg-zinc-800 text-zinc-200 hover:bg-zinc-700 active:bg-zinc-700 transition-colors"
              >
                <FiExternalLink className="w-4 h-4 shrink-0" />
                <span className="text-sm font-semibold">Edit in Airtable</span>
              </a>
            </div>
            {/* Safe area spacer */}
            <div className="h-safe-bottom pb-4" />
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

