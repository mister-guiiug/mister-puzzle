/**
 * Puzzle figé en démo — « Louane 1 000 🧩 » (salle `TJNGN6`).
 *
 * État capturé le 10/10/2026 (922 / 1008). Les écritures sont refusées par
 * `database.rules.json` ; l'UI force la lecture seule et affiche le badge.
 */
export const DEMO_ROOM_CODE = 'TJNGN6';

export const DEMO_PUZZLE_NAME = 'Louane 1 000 🧩';

export function isDemoRoomCode(code: string | null | undefined): boolean {
  return (code ?? '').trim().toUpperCase() === DEMO_ROOM_CODE;
}
