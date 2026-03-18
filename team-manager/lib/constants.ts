/**
 * Client-safe constants — safe to import in both server and client components.
 *
 * IMPORTANT: Do not put secrets or server-only imports in this file.
 * The canonical schema constants (BASE_ID, table/field IDs) live in lib/airtable.ts
 * which is server-side only. Mirror only what clients need here.
 */

// These values mirror BASE_ID and PLAYERS_TABLE in lib/airtable.ts.
const AIRTABLE_BASE_ID   = 'appYLV6Emy6bpluRY';
const AIRTABLE_PLAYERS_TABLE = 'tblsiauLkQkOLoesY';

/** Direct link to edit a player record in the Airtable UI. */
export function airtablePlayerUrl(playerId: string): string {
  return `https://airtable.com/${AIRTABLE_BASE_ID}/${AIRTABLE_PLAYERS_TABLE}/${playerId}`;
}
