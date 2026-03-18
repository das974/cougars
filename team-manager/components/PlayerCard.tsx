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

const POS_STYLE: Record<string, string> = {
  F: 'bg-green/20 text-green ring-green/30',
  D: 'bg-zinc-400/20 text-zinc-300 ring-zinc-400/30',
};

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

  // Border shifts from team red → gold highlight at the cursor position
  const borderGradient = spot
    ? `radial-gradient(ellipse at ${spot.x}px ${spot.y}px, #F0C060 0%, #CF375A 40%, #2A0810 75%, #CF375A 100%)`
    : 'linear-gradient(160deg, #CF375A 0%, #3A0E1A 50%, #CF375A 100%)';

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
        /* Gradient border via background-clip trick */
        border: '2px solid transparent',
        backgroundImage: `linear-gradient(#17171C, #17171C), ${borderGradient}`,
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box',
        borderRadius: '11px',
        boxShadow: spot
          ? '0 8px 28px rgba(207,55,90,0.30), 0 2px 8px rgba(0,0,0,0.6)'
          : '0 3px 14px rgba(0,0,0,0.65)',
        transition: 'box-shadow 0.2s ease',
      }}
    >
      {/* Inner card — rounds content to match border */}
      <div className="rounded-[9px] overflow-hidden flex flex-col" style={{ height: '200px' }}>

        {/* ── Header strip ─────────────────────────────── */}
        <div
          className="flex items-center justify-center gap-1.5 py-[3px] shrink-0"
          style={{ background: 'linear-gradient(90deg, #1A0810, #2D1020, #1A0810)' }}
        >
          <FaPaw className="w-2 h-2 text-primary/60" />
          <span className="text-[7px] font-bold tracking-[0.2em] uppercase text-primary/75">Battersea Cougars</span>
          <FaPaw className="w-2 h-2 text-primary/60" />
        </div>

        {/* ── Photo ────────────────────────────────────── */}
        <div className="relative flex-1">
          {photoUrl ? (
            <Image src={photoUrl} alt={name} fill sizes="144px" className="object-cover" unoptimized />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
              <span className="text-5xl font-bold text-zinc-600 select-none">{name[0]?.toUpperCase()}</span>
            </div>
          )}

          {/* Gradient into nameplate */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(8,3,6,0.88) 0%, transparent 50%)' }}
          />

          {/* Holographic shimmer follows cursor */}
          {spot && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(100px circle at ${spot.x}px ${spot.y - 14}px, rgba(255,255,255,0.11), transparent 65%)`,
                mixBlendMode: 'screen',
              }}
            />
          )}

          {/* Admin: edit in Airtable — fades in on hover, always at right-9 */}
          {isAdmin && (
            <a
              href={airtablePlayerUrl(id)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Edit in Airtable"
              className="absolute top-1.5 right-9 w-6 h-6 flex items-center justify-center rounded-md bg-black/55 text-zinc-300 hover:text-white hover:bg-black/75 ring-1 ring-inset ring-white/10 opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-sm"
            >
              <FiExternalLink className="w-3 h-3" />
            </a>
          )}

          {/* Remove from session — fades in on hover, always at right-1.5 */}
          {attending && (
            <button
              onClick={(e) => { e.stopPropagation(); !busy && onToggle(id, false); }}
              aria-label="Remove from session"
              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-md bg-black/55 text-zinc-300 hover:text-white hover:bg-red-500/70 ring-1 ring-inset ring-white/10 opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-sm text-xs leading-none"
            >
              ✕
            </button>
          )}
        </div>

        {/* ── Nameplate ─────────────────────────────────── */}
        <div
          className="shrink-0 px-2.5 pt-1.5 pb-2"
          style={{ background: 'linear-gradient(180deg, #110508 0%, #17171C 100%)' }}
        >
          {/* Team-colour accent rule */}
          <div className="w-full h-px mb-1.5" style={{ background: 'linear-gradient(90deg, transparent, #CF375A80, transparent)' }} />
          <p className="text-[11px] font-extrabold text-white uppercase tracking-wider leading-tight truncate">{name}</p>
          <div className="flex gap-1 mt-1.5 flex-wrap items-center">
            {position && (
              <span className={`inline-flex items-center rounded px-1 py-0.5 text-[8px] font-bold ring-1 ring-inset uppercase tracking-wide ${POS_STYLE[position] ?? 'bg-zinc-400/20 text-zinc-300 ring-zinc-400/30'}`}>
                {position}
              </span>
            )}
            {cougar && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[8px] font-bold uppercase ring-1 ring-inset bg-primary/20 text-primary ring-primary/35">
                <FaPaw className="w-2 h-2" />
              </span>
            )}
            {isAdmin && rating != null && rating > 0 && (
              <span className="inline-flex items-center rounded px-1 py-0.5 text-[8px] font-bold ring-1 ring-inset bg-green/10 text-green ring-green/25 tabular-nums ml-auto">
                {rating}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
