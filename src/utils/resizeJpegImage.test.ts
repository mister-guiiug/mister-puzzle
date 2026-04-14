import { describe, it, expect } from 'vitest';
import { resizeImageToJpegDataUrl } from './resizeJpegImage';

describe('resizeImageToJpegDataUrl', () => {
  it('rejette un fichier trop lourd', async () => {
    const f = new File([new Uint8Array(20 * 1024 * 1024)], 'x.jpg', { type: 'image/jpeg' });
    await expect(resizeImageToJpegDataUrl(f)).rejects.toMatchObject({ message: 'size' });
  });
});
