'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { FaPaw } from 'react-icons/fa';
import { FiExternalLink } from 'react-icons/fi';

const airtableUrl = (id: string) =>
  `https://airtable.com/appYLV6Emy6bpluRY/tblsiauLkQkOLoesY/${id}`;

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
      className="relative w-36 rounded-xl overflow-hidden text-left select-none group ring-1 ring-zinc-700/80 hover:ring-primary/70 transition-all duration-200 active:opacity-80 bg-zinc-800 cursor-pointer"
    >
      {/* Photo — fills the whole card */}
      <div className="relative w-full" style={{ paddingBottom: '133%' }}>
        {photoUrl ? (
          <Image
            src={photoUrl}
            alt={name}
            fill
            sizes="144px"
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
            <span className="text-5xl font-bold text-zinc-600 select-none">
              {name[0]?.toUpperCase()}
            </span>
          </div>
        )}

        {/* Bottom gradient */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.0) 60%)' }}
        />

        {/* Spotlight — follows the mouse */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={spot
            ? { background: `radial-gradient(120px circle at ${spot.x}px ${spot.y}px, color-mix(in srgb, var(--color-primary) 18%, transparent), transparent 70%)` }
            : { background: 'transparent' }
          }
        />

        {/* Admin: edit in Airtable — fades in on hover, always at right-10 */}
        {isAdmin && (
          <a
            href={airtableUrl(id)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title="Edit in Airtable"
            className="absolute top-2 right-10 w-7 h-7 flex items-center justify-center rounded-lg bg-black/55 text-zinc-300 hover:text-white hover:bg-black/75 ring-1 ring-inset ring-white/10 opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-sm"
          >
            <FiExternalLink className="w-3.5 h-3.5" />
          </a>
        )}

        {/* Remove from session — fades in on hover, always at right-2 */}
        {attending && (
          <button
            onClick={(e) => { e.stopPropagation(); !busy && onToggle(id, false); }}
            aria-label="Remove from session"
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-lg bg-black/55 text-zinc-300 hover:text-white hover:bg-red-500/70 ring-1 ring-inset ring-white/10 opacity-0 group-hover:opacity-100 transition-all duration-150 backdrop-blur-sm text-sm leading-none"
          >
            ✕
          </button>
        )}

        {/* Name + badges at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5">
          <p className="text-sm font-semibold text-white leading-tight truncate mb-1.5">{name}</p>
          <div className="flex gap-1 flex-wrap">
            {position && (
              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset uppercase tracking-wide ${
                position === 'F'
                  ? 'bg-green/20 text-green ring-green/30'
                  : position === 'D'
                  ? 'bg-zinc-400/20 text-zinc-300 ring-zinc-400/30'
                  : 'bg-zinc-400/20 text-zinc-300 ring-zinc-400/30'
              }`}>
                {position}
              </span>
            )}
            {cougar && (
              <span className="inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide bg-primary/20 text-primary ring-1 ring-inset ring-primary/35">
                <FaPaw className="w-2 h-2" />
              </span>
            )}
            {isAdmin && rating != null && rating > 0 && (
              <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold ring-1 ring-inset bg-green/10 text-green ring-green/25 tabular-nums">
                {rating}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
