import { describe, it, expect } from 'vitest';
import { resizeImageToJpegDataUrl } from './resizeJpegImage';

describe('resizeImageToJpegDataUrl', () => {
  it('rejette un fichier trop lourd', async () => {
    const f = new File([new Uint8Array(20 * 1024 * 1024)], 'x.jpg', {
      type: 'image/jpeg',
    });
    await expect(resizeImageToJpegDataUrl(f)).rejects.toMatchObject({
      message: 'size',
    });
  });

  it('rejette un fichier qui n’est pas une image reconnue', async () => {
    const f = new File([new Uint8Array(8)], 'facture.pdf', {
      type: 'application/pdf',
    });
    await expect(resizeImageToJpegDataUrl(f)).rejects.toMatchObject({
      message: 'type',
    });
  });

  it('accepte une photo HEIC d’iPhone', async () => {
    // Refusée par la liste par défaut du socle : le contrôle doit s’arrêter
    // avant le décodage (indisponible sous jsdom), d’où l’erreur attendue.
    const f = new File([new Uint8Array(8)], 'IMG_0001.heic', {
      type: 'image/heic',
    });
    await expect(resizeImageToJpegDataUrl(f)).rejects.not.toMatchObject({
      message: 'type',
    });
  });
});
