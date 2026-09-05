import {
  compressImageToMaxBytes,
  stripImageMetadata,
  validateImageFile,
} from '@mister-guiiug/dev-pwa-config/image';
import {
  MAX_PHOTO_DATA_URL_CHARS,
  MAX_UPLOAD_BYTES,
  PHOTO_ACCEPTED_TYPES,
  PHOTO_JPEG_QUALITY,
  PHOTO_MAX_DIMENSION,
} from '../constants/dashboard';

/**
 * Budget d’octets JPEG déduit du budget de caractères de la base : le base64
 * gonfle de 4/3, plus l’en-tête `data:image/jpeg;base64,`. On garde une marge
 * pour ne jamais frôler la règle Firebase.
 */
const DATA_URL_PREFIX = 'data:image/jpeg;base64,';
const MAX_PHOTO_JPEG_BYTES = Math.floor(
  ((MAX_PHOTO_DATA_URL_CHARS - DATA_URL_PREFIX.length) * 3) / 4 - 1024
);

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('read'));
    reader.readAsDataURL(blob);
  });
}

/**
 * Prépare une photo téléversée pour la base temps réel : contrôle, ré-encodage
 * JPEG redimensionné, puis conversion en data URL (la RTDB ne stocke que du
 * JSON, d’où la chaîne plutôt qu’un Blob).
 *
 * Le passage par canvas du socle supprime au passage EXIF / GPS : seuls les
 * pixels survivent.
 *
 * @throws Error avec message `type` si le fichier n’est pas une image
 *   reconnue, `size` s’il dépasse {@link MAX_UPLOAD_BYTES}, `read` si la
 *   lecture échoue. Les erreurs de décodage remontent telles quelles.
 */
export async function resizeImageToJpegDataUrl(file: File): Promise<string> {
  const refusal = validateImageFile(file, {
    maxBytes: MAX_UPLOAD_BYTES,
    acceptedTypes: PHOTO_ACCEPTED_TYPES,
  });
  if (refusal) throw new Error(refusal);

  const jpeg = await stripImageMetadata(file, {
    maxDimension: PHOTO_MAX_DIMENSION,
    type: 'image/jpeg',
    quality: PHOTO_JPEG_QUALITY,
  });
  const dataUrl = await blobToDataUrl(jpeg);
  if (dataUrl.length < MAX_PHOTO_DATA_URL_CHARS) return dataUrl;

  // Cas rare (panorama très allongé : une seule dimension bornée ne borne pas
  // le poids). Sans ce repli, l’écriture serait rejetée par la règle Firebase.
  const compressed = await compressImageToMaxBytes(file, MAX_PHOTO_JPEG_BYTES, {
    maxDimension: PHOTO_MAX_DIMENSION,
  });
  return await blobToDataUrl(compressed);
}
