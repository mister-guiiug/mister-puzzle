import { describe, it, expect } from 'vitest';
import { normRoom, validateCreate } from './validation';

describe('normRoom', () => {
  it('accepte un code valide', () => {
    expect(normRoom('  ab12  ')).toBe('AB12');
    expect(normRoom('ABCDEF123456')).toBe('ABCDEF123456');
  });
  it('refuse invalide', () => {
    expect(normRoom('abc')).toBeNull();
    expect(normRoom('ab-cd')).toBeNull();
    expect(normRoom(1)).toBeNull();
  });
});

describe('validateCreate', () => {
  it('valide un objet correct', () => {
    expect(validateCreate({ name: 'Test', totalPieces: 100 })).toEqual({
      name: 'Test',
      totalPieces: 100,
    });
  });
  it('refuse les entrées invalides', () => {
    expect(validateCreate(null)).toBeNull();
    expect(validateCreate({ name: '', totalPieces: 10 })).toBeNull();
    expect(validateCreate({ name: 'x', totalPieces: 0 })).toBeNull();
  });
});
