'use client';

import Image from 'next/image';
import { PlayerBadges } from '@/components/PlayerBadge';

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
          borderTop: selected ? '2px solid #CF375A' : '2px solid #3f3f46',
          borderRight: '2px solid #3f3f46',
          borderBottom: '2px solid #3f3f46',
          borderLeft: '2px solid #3f3f46',
          overflow: 'hidden',
          filter: selected ? undefined : 'grayscale(100%) brightness(1)',
          boxShadow: selected
            ? '0 1px 1px rgba(0,0,0,0.4), 0 3px 6px rgba(0,0,0,0.35), 0 8px 16px rgba(0,0,0,0.25), -4px 0 8px rgba(0,0,0,0.5)'
            : '-4px 0 8px rgba(0,0,0,0.5)',
          transformStyle: 'preserve-3d' as const,
          transform: selected
            ? 'rotateY(3deg) scale(1)'
            : 'rotateY(0deg) scale(0.97)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease',
        }}
      >
        <div className="flex flex-col h-full">

            {/* ── Photo ────────────────────────────────────── */}
            <div className="relative flex-1">
              {photoUrl ? (
                <Image src={photoUrl} alt={name} fill sizes="(max-width: 640px) 34vw, 17vw" className="object-cover object-top" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'radial-gradient(ellipse at 60% 40%, #2a1a20 0%, #17171C 60%, #0D0D10 100%)' }}>
                  <span className="text-4xl sm:text-5xl font-bold select-none text-white">{name[0]?.toUpperCase()}</span>
                </div>
              )}

              {/* Brightness boost on selected via screen blend — no filter needed */}
              {selected && (
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(255, 184, 184, 0.18)', mixBlendMode: 'screen' }} />
              )}

              {/* Dark gradient at top for badge legibility */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: 'linear-gradient(to bottom, rgba(10,10,14,0.75) 0%, rgba(10,10,14,0.3) 30%, transparent 55%), linear-gradient(to top, rgba(10,10,14,1) 0%, rgba(10,10,14,0.3) 28%, transparent 55%)' }}
              />

              {/* Top-left badges */}
              <div className="absolute top-2 left-2 z-10 pointer-events-none">
                <PlayerBadges position={position} cougar={cougar} rating={rating} showRating={showRating} />
              </div>
            </div>

            {/* ── Nameplate ─────────────────────────────────── */}
            <div className="shrink-0" style={{ background: '#0A0A0E' }}>
              {/* Team-colour rule with slight side padding */}
              <div className="mx-1 sm:mx-2 h-[2px]" style={{ background: selected ? '#CF375A' : '#52525b' }} />
              <p className="px-1 sm:px-2 pb-1.5 sm:pb-2.5 pt-1 sm:pt-1.5 text-[11px] sm:text-[12px] font-extrabold text-white uppercase tracking-widest leading-tight truncate text-center">{name}</p>
            </div>

          </div>
      </div>
  );
}

