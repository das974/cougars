/**
 * Airtable schema constants (discovered 2026-03-17) and API helpers.
 *
 * All Airtable access is server-side only — the API key is never sent to the
 * browser.
 */
import Airtable from 'airtable';

// ── Schema ────────────────────────────────────────────────────────────────────
export const BASE_ID = 'appYLV6Emy6bpluRY';

// Players table
export const PLAYERS_TABLE  = 'tblsiauLkQkOLoesY';
export const P_NAME         = 'fldEDVP8xSMeugCMW'; // singleLineText (primary)
export const P_POSITION     = 'fldXWqZ4rVB7y186D'; // singleSelect: F | D
export const P_RATING       = 'fldb2pXLN8qS8TS0d'; // number
export const P_COUGARS      = 'fldlFEQd6P2AvJOK8'; // checkbox
export const P_PHOTO        = 'fldLwA0M2OSd0g053'; // multipleAttachments

// Sessions table
export const SESSIONS_TABLE = 'tblpG8FZo9Mf28cuj';
export const S_DATE         = 'fldStEIsN2CbQhy19'; // date
export const S_PLAYERS      = 'fldi3O3e3e3U2x8gi'; // multipleRecordLinks → Players

// Teams table
export const TEAMS_TABLE    = 'tblPz7mqLUTAnEdAf';
export const T_NAME         = 'fldARdQWxS4SDFJZ8'; // singleLineText (primary)
export const T_SESSION      = 'fld8KExMGh6eyKzRs'; // multipleRecordLinks → Sessions
export const T_PLAYERS      = 'fldm8E0M6x6b4lrHS'; // multipleRecordLinks → Players

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Player {
  id: string;
  name: string;
  position: 'F' | 'D' | '';
  rating: number;
  cougar: boolean;
  photoUrl: string | null;
}

export interface Session {
  id: string;
  name: string;
  date: string | null; // ISO date string YYYY-MM-DD
  attendingIds: string[];
}

export interface TeamAssignment {
  team: string;
  players: Player[];
}

export interface StoredTeam {
  id: string;
  name: string;
  playerIds: string[];
}

// ── Client factory (server-side only) ────────────────────────────────────────
function getBase() {
  const apiKey = process.env.AIRTABLE_API;
  if (!apiKey) throw new Error('AIRTABLE_API env var is not set');
  return new Airtable({ apiKey }).base(BASE_ID);
}

/** Reject anything that doesn't look like an Airtable record ID to prevent injection. */
function validateRecordId(id: string, label = 'record ID'): void {
  if (!/^rec[A-Za-z0-9]{14}$/.test(id)) {
    throw new Error(`Invalid ${label}: expected an Airtable record ID, got "${id}"`);
  }
}

// ── Players ───────────────────────────────────────────────────────────────────
export async function fetchPlayers(): Promise<Player[]> {
  const base = getBase();
  const records = await base(PLAYERS_TABLE)
    .select({ returnFieldsByFieldId: true })
    .all();

  return records.map((r) => {
    const attachments = r.get(P_PHOTO) as Array<{ url: string; thumbnails?: { large?: { url: string } } }> | undefined;
    const photoUrl = attachments?.[0]?.thumbnails?.large?.url ?? attachments?.[0]?.url ?? null;
    return {
      id: r.id,
      name: (r.get(P_NAME) as string | undefined) ?? (r as unknown as { name?: string }).name ?? '',
      // singleSelect: JS SDK returns a plain string, REST API returns {id,name,color}
      position: ((): Player['position'] => {
        const raw = r.get(P_POSITION);
        if (!raw) return '';
        if (typeof raw === 'string') return raw as Player['position'];
        return ((raw as { name: string }).name ?? '') as Player['position'];
      })(),
      rating: (r.get(P_RATING) as number) ?? 0,
      cougar: Boolean(r.get(P_COUGARS)),
      photoUrl,
    };
  });
}

// ── Sessions ──────────────────────────────────────────────────────────────────
export async function fetchSessions(): Promise<Session[]> {
  const base = getBase();
  const records = await base(SESSIONS_TABLE)
    .select({ returnFieldsByFieldId: true, sort: [{ field: S_DATE, direction: 'desc' }] })
    .all();

  return records.map((r) => ({
    id: r.id,
    name: (r as unknown as { name?: string }).name ?? '',
    date: (r.get(S_DATE) as string | undefined) ?? null,
    attendingIds: (r.get(S_PLAYERS) as string[] | undefined) ?? [],
  }));
}

// ── Toggle attendance ─────────────────────────────────────────────────────────
// Accepts the full desired attending set — caller is responsible for computing it.
// Uses the REST API directly with field IDs (same approach as airtable_teams.py).
export async function setAttendance(
  sessionId: string,
  attendingIds: string[],
): Promise<string[]> {
  validateRecordId(sessionId, 'sessionId');
  const apiKey = process.env.AIRTABLE_API;
  if (!apiKey) throw new Error('AIRTABLE_API env var is not set');

  const url = `https://api.airtable.com/v0/${BASE_ID}/${SESSIONS_TABLE}/${sessionId}?returnFieldsByFieldId=true`;
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: { [S_PLAYERS]: attendingIds } }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable update failed (${res.status}): ${err}`);
  }

  return attendingIds;
}

// ── Teams ─────────────────────────────────────────────────────────────────────
export async function fetchTeams(sessionId: string): Promise<StoredTeam[]> {
  validateRecordId(sessionId, 'sessionId');
  const base = getBase();
  const records = await base(TEAMS_TABLE)
    .select({ returnFieldsByFieldId: true })
    .all();

  // Airtable formula filters on linked-record fields resolve to display names,
  // not record IDs — so we filter in JS using the actual ID arrays from the API.
  return records
    .filter((r) => {
      const linked = r.get(T_SESSION) as string[] | undefined;
      return linked?.includes(sessionId) ?? false;
    })
    .map((r) => ({
      id: r.id,
      name: (r.get(T_NAME) as string | undefined) ?? '',
      playerIds: (r.get(T_PLAYERS) as string[] | undefined) ?? [],
    }));
}

// ── Delete team records ───────────────────────────────────────────────────────
export async function deleteTeams(teamIds: string[]): Promise<void> {
  if (teamIds.length === 0) return;
  const apiKey = process.env.AIRTABLE_API;
  if (!apiKey) throw new Error('AIRTABLE_API env var is not set');
  for (let i = 0; i < teamIds.length; i += 10) {
    const batch = teamIds.slice(i, i + 10);
    const params = batch.map((id) => `records[]=${encodeURIComponent(id)}`).join('&');
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TEAMS_TABLE}?${params}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable delete teams failed (${res.status}): ${err}`);
    }
  }
}

// ── Update player lists on existing team records ─────────────────────────────
export async function updateTeamPlayers(
  updates: Array<{ id: string; playerIds: string[] }>,
): Promise<void> {
  if (updates.length === 0) return;
  updates.forEach((u) => validateRecordId(u.id, 'team ID'));
  const apiKey = process.env.AIRTABLE_API;
  if (!apiKey) throw new Error('AIRTABLE_API env var is not set');
  // Airtable allows up to 10 records per PATCH request
  for (let i = 0; i < updates.length; i += 10) {
    const batch = updates.slice(i, i + 10);
    const url = `https://api.airtable.com/v0/${BASE_ID}/${TEAMS_TABLE}`;
    const res = await fetch(url, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        records: batch.map((u) => ({
          id: u.id,
          fields: { [T_PLAYERS]: u.playerIds },
        })),
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Airtable update teams failed (${res.status}): ${err}`);
    }
  }
}

export async function saveTeams(
  sessionId: string,
  teams: Array<{ name: string; players: Array<{ id: string }> }>,
): Promise<void> {
  if (teams.length === 0) return;
  const apiKey = process.env.AIRTABLE_API;
  if (!apiKey) throw new Error('AIRTABLE_API env var is not set');
  const records = teams.map((team) => ({
    fields: {
      [T_NAME]: team.name,
      [T_SESSION]: [sessionId],
      [T_PLAYERS]: team.players.map((p) => p.id),
    },
  }));
  const url = `https://api.airtable.com/v0/${BASE_ID}/${TEAMS_TABLE}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ records }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Airtable save teams failed (${res.status}): ${err}`);
  }
}
