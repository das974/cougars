'use client';

import Image from 'next/image';
import { FaPaw } from 'react-icons/fa';

export interface PlayerCardProps {
  id: string;
  name: string;
  position: string;
  cougar: boolean;
  photoUrl: string | null;
  rating?: number;
  showRating?: boolean;
  selected: boolean;
  onToggle: (id: string, attending: boolean) => void;
}

export default function PlayerCard({
  id, name, position, cougar, photoUrl, rating, showRating, selected, onToggle,
}: PlayerCardProps) {
  function handleClick() {
    onToggle(id, !selected);
  }

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={-1}
      className="relative select-none w-full aspect-[5/7]"
      style={{
        borderRadius: '3px',
        border: selected ? '2px solid #52525b' : '2px solid #3f3f46',
        overflow: 'hidden',
        zIndex: selected ? 10 : 1,
        filter: selected
          ? 'brightness(1.0)'
          : photoUrl ? 'grayscale(60%) brightness(0.35)' : 'grayscale(30%) brightness(0.4)',
        boxShadow: selected
          ? '0 1px 1px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.35), 0 8px 16px rgba(0,0,0,0.25), -4px 0 8px rgba(0,0,0,0.5)'
          : '-4px 0 8px rgba(0,0,0,0.5)',
        transform: selected ? 'scale(1)' : 'scale(0.97)',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
      }}
    >
      <div className="flex flex-col h-full">

          {/* ── Photo ────────────────────────────────────── */}
          <div className="relative flex-1">
            {photoUrl ? (
              <Image src={photoUrl} alt={name} fill sizes="(max-width: 640px) 34vw, 17vw" className="object-cover object-top" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-zinc-800">
                <span className="text-2xl sm:text-5xl font-bold select-none text-white">{name[0]?.toUpperCase()}</span>
              </div>
            )}

            {/* Fade into nameplate */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: 'linear-gradient(to top, rgba(10,10,14,1) 0%, rgba(10,10,14,0.3) 28%, transparent 55%)' }}
            />

            {/* Top-left badges: rating (admin) + cougar paw */}
            <div className="absolute top-1 sm:top-1.5 left-1 sm:left-1.5 flex gap-0.5 sm:gap-1">
              {showRating && rating != null && rating > 0 && (
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


          </div>

          {/* ── Nameplate ─────────────────────────────────── */}
          <div className="shrink-0" style={{ background: '#0A0A0E' }}>
            {/* Team-colour rule with slight side padding */}
            <div className="mx-1 sm:mx-2 h-[2px]" style={{ background: selected ? '#CF375A' : '#52525b' }} />
            <p className="px-1 sm:px-2 pb-1 sm:pb-2.5 pt-0.5 sm:pt-1.5 text-[7px] sm:text-[12px] font-extrabold text-white uppercase tracking-widest leading-tight truncate text-center">{name}</p>
          </div>

        </div>
    </div>
  );
}

