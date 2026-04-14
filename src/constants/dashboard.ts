/** TTL pour considérer un membre « en ligne » (heartbeat). */
export const MEMBER_TTL_MS = 5 * 60 * 1000;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
/** Limite d’images par salle (allège la base temps réel). */
export const MAX_ROOM_PHOTOS = 32;
export const MILESTONE_LEVELS = [25, 50, 75, 100] as const;
/** Délai après le dernier clic sur ± / pas rapides avant envoi Firebase (évite une entrée d’historique par clic). */
export const PIECE_AUTOSAVE_DEBOUNCE_MS = 420;
