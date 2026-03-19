'use client';

import { useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  useDroppable,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { PlayerBadges } from '@/components/PlayerBadge';
import { BsGripVertical } from 'react-icons/bs';
import { FiCopy, FiCheck } from 'react-icons/fi';
import { SolverTeam, SolverPlayer } from '@/lib/solver';

const TEAM_CONFIG: Record<string, { header: string; rowAccent: string }> = {
  Cougars: { header: 'text-primary',    rowAccent: 'text-primary'    },
  Black:   { header: 'text-zinc-500',   rowAccent: 'text-zinc-400'   },
  White:   { header: 'text-white',      rowAccent: 'text-zinc-300'   },
  Red:     { header: 'text-red-400',    rowAccent: 'text-red-500'    },
  Gold:    { header: 'text-yellow-400', rowAccent: 'text-yellow-500' },
};

const TEAM_ORDER: Record<string, number> = { Cougars: 0, Black: 1, White: 2 };

// Unique drag id: "teamName::playerId"
function dragId(teamName: string, playerId: string) {
  return `${teamName}::${playerId}`;
}

function parseDragId(id: string): { team: string; playerId: string } | null {
  const idx = id.indexOf('::');
  if (idx === -1) return null;
  return { team: id.slice(0, idx), playerId: id.slice(idx + 2) };
}

// ── Draggable player row ──────────────────────────────────────────────────────
function DraggablePlayerRow({
  id,
  player,
  isAdmin,
  rowAccent,
  isDragOverlay = false,
}: {
  id: string;
  player: SolverPlayer;
  isAdmin?: boolean;
  rowAccent: string;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const inner = (
    <div
      className={[
        'flex items-center justify-between px-2 sm:px-4 py-1.5 sm:py-2 rounded select-none',
        isDragOverlay
          ? 'bg-zinc-700/80 shadow-lg ring-1 ring-white/10'
          : 'hover:bg-zinc-700/30 cursor-grab active:cursor-grabbing',
      ].join(' ')}
    >
      <span className="flex items-center gap-1 sm:gap-2">
        <BsGripVertical className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 text-zinc-600 flex-shrink-0" />
        <span className="text-sm text-zinc-300 font-medium truncate">{player.name}</span>
      </span>
      <span className="flex-shrink-0">
        <PlayerBadges position={player.position} cougar={player.cougar} rating={player.rating} showRating={isAdmin} reserveSpace />
      </span>
    </div>
  );

  if (isDragOverlay) return inner;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {inner}
    </div>
  );
}

// ── Team card ─────────────────────────────────────────────────────────────────
function TeamCard({
  team,
  isAdmin,
  isOver: isOverProp,
}: {
  team: SolverTeam;
  isAdmin?: boolean;
  isOver?: boolean;
}) {
  const cfg = TEAM_CONFIG[team.name] ?? { header: 'text-zinc-300', rowAccent: 'text-zinc-500' };
  const sortedPlayers = [...team.players].sort((a, b) => {
    if (a.position !== b.position) return a.position === 'F' ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const ids = sortedPlayers.map((p) => dragId(team.name, p.id));

  // Always-present droppable so empty teams can receive players
  const { setNodeRef, isOver: isOverDroppable } = useDroppable({ id: team.name });
  const isOver = isOverProp || isOverDroppable;

  return (
    <div
      ref={setNodeRef}
      className={[
        'rounded-xl border bg-zinc-700/40 overflow-hidden flex flex-col transition-colors',
        isOver ? 'border-green/40 bg-zinc-800/80' : 'border-zinc-700/60',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-3 border-b border-zinc-700/60">
        <span className={`text-xs sm:text-sm font-semibold ${cfg.header}`}>{team.name}</span>
        <span className="ml-auto text-[10px] sm:text-xs text-zinc-500">{team.players.length}</span>
      </div>

      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-zinc-700/40 flex-1 min-h-[40px]">
          {sortedPlayers.map((p) => (
            <DraggablePlayerRow
              key={p.id}
              id={dragId(team.name, p.id)}
              player={p}
              isAdmin={isAdmin}
              rowAccent={cfg.rowAccent}
            />
          ))}
        </div>
      </SortableContext>

      {isAdmin && (
        <div className="px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-900/40 border-t border-zinc-700/40 flex items-center justify-between mt-auto">
          <span className="text-[8px] sm:text-[10px] text-zinc-500 uppercase tracking-wide">Rating</span>
          <span className="text-xs sm:text-xs font-semibold text-zinc-300">
            {team.players.reduce((s, p) => s + p.rating, 0)}
          </span>
        </div>
      )}
    </div>
  );
}

// ── Main TeamsView ────────────────────────────────────────────────────────────
export default function TeamsView({
  teams: initialTeams,
  isAdmin,
  onTeamsChange,
}: {
  teams: SolverTeam[];
  isAdmin?: boolean;
  onTeamsChange?: (teams: SolverTeam[]) => void;
}) {
  const [teams, setTeams] = useState<SolverTeam[]>(() =>
    [...initialTeams].sort((a, b) => (TEAM_ORDER[a.name] ?? 9) - (TEAM_ORDER[b.name] ?? 9))
  );
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const findPlayer = useCallback((id: string): SolverPlayer | null => {
    const parsed = parseDragId(id);
    if (!parsed) return null;
    const team = teams.find((t) => t.name === parsed.team);
    return team?.players.find((p) => p.id === parsed.playerId) ?? null;
  }, [teams]);

  function onDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function onDragOver(event: DragOverEvent) {
    setOverId((event.over?.id as string) ?? null);
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const src = parseDragId(active.id as string);
    if (!src) return;

    // Destination: player drag-id (another team) or a team name container
    const destParsed = parseDragId(over.id as string);
    const destTeamName = destParsed ? destParsed.team : (over.id as string);

    if (src.team === destTeamName) return;

    setTeams((prev) => {
      const next = prev.map((t) => ({ ...t, players: [...t.players] }));
      const srcTeam = next.find((t) => t.name === src.team);
      const dstTeam = next.find((t) => t.name === destTeamName);
      if (!srcTeam || !dstTeam) return prev;

      const pIdx = srcTeam.players.findIndex((p) => p.id === src.playerId);
      if (pIdx === -1) return prev;
      const [player] = srcTeam.players.splice(pIdx, 1);
      dstTeam.players.push(player);
      onTeamsChange?.(next);
      return next;
    });
  }

  const overTeamName = overId
    ? (parseDragId(overId)?.team ?? (teams.find((t) => t.name === overId)?.name ?? null))
    : null;

  const activePlayer = activeId ? findPlayer(activeId) : null;
  const activeTeam = activeId ? (parseDragId(activeId)?.team ?? '') : '';
  const activeCfg = TEAM_CONFIG[activeTeam] ?? { rowAccent: 'text-zinc-400' };

  const [copied, setCopied] = useState(false);

  function copyToClipboard() {
    const text = teams
      .map((t) => {
        const players = [...t.players]
          .sort((a, b) => {
            if (a.position !== b.position) return a.position === 'F' ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((p) => `  • ${p.name}`)
          .join('\n');
        return `${t.name}\n${players}`;
      })
      .join('\n\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="mt-8 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-widest">Teams</h2>
          {(() => {
            const total = teams.reduce((s, t) => s + t.players.length, 0);
            const expected = initialTeams.reduce((s, t) => s + t.players.length, 0);
            const ok = total === expected;
            return (
              <span className={`text-[10px] font-semibold tabular-nums px-1.5 py-0.5 rounded ${
                ok ? 'text-green bg-green/10' : 'text-red-400 bg-red-500/10'
              }`}>
                {total}{!ok && ` / ${expected}`}
              </span>
            );
          })()}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-zinc-600 italic">Drag players between teams to reassign</span>
          <button
            onClick={copyToClipboard}
            title="Copy teams to clipboard"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 rounded-full px-2 py-0.5 hover:bg-zinc-800/60 ring-1 ring-inset ring-transparent hover:ring-white/10 transition-all"
          >
            {copied
              ? <><FiCheck className="w-3 h-3 text-green" /><span className="text-green">Copied</span></>
              : <><FiCopy className="w-3 h-3" /><span>Copy</span></>}
          </button>
        </div>
      </div>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className={`grid gap-2 sm:gap-4 ${
          teams.length === 2 ? 'grid-cols-1 sm:grid-cols-2' :
          teams.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
          'grid-cols-1 sm:grid-cols-2'
        }`}>
          {teams.map((team) => (
            <TeamCard
              key={team.name}
              team={team}
              isAdmin={isAdmin}
              isOver={overTeamName === team.name && activeTeam !== team.name}
            />
          ))}
        </div>

        <DragOverlay>
          {activePlayer && (
            <DraggablePlayerRow
              id={activeId!}
              player={activePlayer}
              isAdmin={isAdmin}
              rowAccent={activeCfg.rowAccent}
              isDragOverlay
            />
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

