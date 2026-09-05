import { IMAGE_ACCEPTED_TYPES } from '@mister-guiiug/dev-pwa-config/image';

/** TTL pour considérer un membre « en ligne » (heartbeat). */
export const MEMBER_TTL_MS = 5 * 60 * 1000;
export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
/**
 * Types acceptés à l’import d’une photo. La liste du socle (JPEG/PNG/WebP)
 * élargie aux formats que les navigateurs décodent aussi : sans cet
 * élargissement, un GIF ou une photo HEIC d’iPhone — acceptés jusqu’ici —
 * seraient refusés. L’`accept="image/*"` de l’input n’est qu’une suggestion :
 * ce contrôle-ci est celui qui refuse réellement un PDF renommé en `.jpg`.
 */
export const PHOTO_ACCEPTED_TYPES = [
  ...IMAGE_ACCEPTED_TYPES,
  'image/gif',
  'image/avif',
  'image/heic',
  'image/heif',
] as const;
/** Limite d’images par salle (allège la base temps réel). */
export const MAX_ROOM_PHOTOS = 32;
/**
 * Longueur maximale de la data URL stockée dans
 * `puzzles/$room/photos/$id/data`. Miroir de la règle Firebase
 * (`database.rules.json` : `val().length < 2000000`) et de
 * `MAX_PHOTO_PAYLOAD` côté `server/`. Au-delà, l’écriture est refusée.
 */
export const MAX_PHOTO_DATA_URL_CHARS = 2_000_000;
/** Côté le plus long de la photo après redimensionnement, en pixels. */
export const PHOTO_MAX_DIMENSION = 800;
/** Qualité JPEG du ré-encodage. */
export const PHOTO_JPEG_QUALITY = 0.7;
export const MILESTONE_LEVELS = [25, 50, 75, 100] as const;
/** Délai après le dernier clic sur ± / pas rapides avant envoi Firebase (évite une entrée d’historique par clic). */
export const PIECE_AUTOSAVE_DEBOUNCE_MS = 420;
