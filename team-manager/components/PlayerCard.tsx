'use client';

import { useRef, useState } from 'react';
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
  attending: boolean;
  busy: boolean;
  isAdmin?: boolean;
  onToggle: (id: string, attending: boolean) => void;
}

export default function PlayerCard({
  id, name, position, cougar, photoUrl, rating, busy, attending, isAdmin, onToggle,
}: PlayerCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState<{ x: number; y: number } | null>(null);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setSpot({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setSpot(null)}
      onClick={() => !busy && !attending && onToggle(id, true)}
      role="button"
      tabIndex={busy ? -1 : 0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); !busy && !attending && onToggle(id, true); }}}
      className="relative select-none cursor-pointer group active:opacity-90"
      style={{
        width: '144px',
        border: '2px solid rgba(255,255,255,0.10)',
        borderRadius: '2px',
        boxShadow: spot
          ? '0 10px 30px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.5)'
          : '0 4px 16px rgba(0,0,0,0.6)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        transform: spot ? 'scale(1.03)' : 'scale(1)',
      }}
    >
      <div className="overflow-hidden flex flex-col" style={{ height: '198px' }}>

        {/* ── Photo ────────────────────────────────────── */}
        <div className="relative flex-1">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} fill sizes="144px" className="object-cover object-top" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
              <span className="text-5xl font-bold text-zinc-600 select-none">{name[0]?.toUpperCase()}</span>
            </div>
          )}

          {/* Fade into nameplate */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(10,10,14,1) 0%, rgba(10,10,14,0.3) 28%, transparent 55%)' }}
          />

          {/* Gloss shimmer follows cursor */}
          {spot && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(110px circle at ${spot.x}px ${spot.y}px, rgba(255,255,255,0.12), transparent 70%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Top-left badges: rating (admin) + cougar paw */}
          <div className="absolute top-1.5 left-1.5 flex gap-1">
            {isAdmin && rating != null && rating > 0 && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-[8px] font-bold ring-1 ring-inset bg-black/60 text-green ring-green/40 backdrop-blur-sm tabular-nums">
                {rating}
              </span>
            )}
            {cougar && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm text-[8px] font-bold ring-1 ring-inset bg-black/60 text-primary ring-primary/40 backdrop-blur-sm">
                <FaPaw className="w-2.5 h-2.5" />
              </span>
            )}
          </div>

          {/* Admin: edit in Airtable */}
          {isAdmin && (
            <a
              href={airtablePlayerUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Edit in Airtable"
              className="absolute top-1.5 right-9 w-6 h-6 flex items-center justify-center rounded-sm bg-black/55 text-zinc-300 hover:text-white hover:bg-black/75 ring-1 ring-inset ring-white/10 opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-sm"
            >
              <FiExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Remove from session */}
          {attending && (
            <button
              onClick={(e) => { e.stopPropagation(); !busy && onToggle(id, false); }}
              aria-label="Remove from session"
              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-sm bg-black/55 text-zinc-300 hover:text-white hover:bg-red-500/70 ring-1 ring-inset ring-white/10 opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-sm text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Nameplate ─────────────────────────────────── */}
        <div className="shrink-0" style={{ background: '#0A0A0E' }}>
          {/* Team-colour rule with slight side padding */}
          <div className="mx-2 h-[2px]" style={{ background: '#CF375A' }} />
          <p className="px-2 pb-2.5 pt-1.5 text-[10.5px] font-extrabold text-white uppercase tracking-widest leading-tight truncate text-center">{name}</p>
        </div>

      </div>
    </div>
  );
}
