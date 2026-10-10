import { describe, expect, it } from 'vitest';
import { DEMO_PUZZLE_NAME, DEMO_ROOM_CODE, isDemoRoomCode } from './demo';

describe('isDemoRoomCode', () => {
  it('reconnaît TJNGN6 sans tenir compte de la casse ni des espaces', () => {
    expect(isDemoRoomCode(DEMO_ROOM_CODE)).toBe(true);
    expect(isDemoRoomCode('tjngn6')).toBe(true);
    expect(isDemoRoomCode(' TJNGN6 ')).toBe(true);
  });

  it('refuse les autres codes', () => {
    expect(isDemoRoomCode('TEST')).toBe(false);
    expect(isDemoRoomCode(null)).toBe(false);
    expect(isDemoRoomCode('')).toBe(false);
  });

  it('porte le nom vitrine attendu', () => {
    expect(DEMO_PUZZLE_NAME).toContain('Louane');
  });
});
