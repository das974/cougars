'use client';

import { FaPaw } from 'react-icons/fa';

/**
 * Shared badge component used across PlayerCard (overlay), TeamsView, and RosterPanel.
 *
 * overlay=false (default) — inline row badge: rounded-sm, 20×20px, 10px text
 * overlay=true            — photo overlay badge: same size but adds backdrop-blur + black bg
 */

const BASE =
  'inline-flex items-center justify-center w-5 h-5 rounded-sm text-[10px] font-bold ring-1 ring-inset';

const OVERLAY_EXTRA = 'bg-black/60 backdrop-blur-sm';

const COLORS = {
  forward:  'bg-zinc-900/80 text-zinc-100 ring-zinc-500/50',
  defender: 'bg-zinc-900/80 text-zinc-100 ring-zinc-500/50',
  cougar:   'bg-primary-dk text-white ring-[#8B1F35]',
  rating:   'bg-violet-400/20 text-violet-300 ring-violet-400/40',
};

interface Props {
  type: 'position' | 'cougar' | 'rating';
  position?: string;
  rating?: number;
  overlay?: boolean;
}

export default function PlayerBadge({ type, position, rating, overlay = false }: Props) {
  const extra = overlay ? OVERLAY_EXTRA : '';

  if (type === 'cougar') {
    return (
      <span className={`${BASE} ${COLORS.cougar} ${extra}`}>
        <FaPaw className="w-2 h-2" />
      </span>
    );
  }

  if (type === 'position' && position) {
    const color = overlay
      ? 'bg-zinc-900/80 text-zinc-200 ring-zinc-400/50'
      : (position === 'F' ? COLORS.forward : COLORS.defender);
    return (
      <span className={`${BASE} ${color} ${overlay ? 'backdrop-blur-sm' : ''}`} title={position === 'F' ? 'Forward' : 'Defender'}>
        {position}
      </span>
    );
  }

  if (type === 'rating' && rating != null && rating > 0) {
    return (
      <span className={`${BASE} ${COLORS.rating} ${extra} tabular-nums`}>
        {rating}
      </span>
    );
  }

  return null;
}

// ── Canonical badge group — use this everywhere instead of individual badges ──
interface GroupProps {
  position: string;
  cougar: boolean;
  rating?: number;
  showRating?: boolean;
  overlay?: boolean;
  reserveSpace?: boolean; // always render all slots so rows align
}

export function PlayerBadges({ position, cougar, rating, showRating, overlay, reserveSpace }: GroupProps) {
  return (
    <span className="inline-flex items-center gap-1">
      {showRating && <PlayerBadge type="rating" rating={rating} overlay={overlay} />}
      <PlayerBadge type="position" position={position} overlay={overlay} />
      {cougar
        ? <PlayerBadge type="cougar" overlay={overlay} />
        : reserveSpace && <span className="inline-flex w-5 h-5" aria-hidden />}
    </span>
  );
}
