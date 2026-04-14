import { describe, it, expect } from 'vitest';
import { classifyFirebaseError } from './classifyFirebaseError';

describe('classifyFirebaseError', () => {
  it('détecte permission_denied', () => {
    expect(classifyFirebaseError('FirebaseError: permission_denied')).toBe('permission');
    expect(classifyFirebaseError('Permission denied')).toBe('permission');
  });

  it('détecte les erreurs réseau', () => {
    expect(classifyFirebaseError('NetworkError')).toBe('network');
    expect(classifyFirebaseError('Failed to fetch')).toBe('network');
  });

  it('retourne unknown sinon', () => {
    expect(classifyFirebaseError('')).toBe('unknown');
    expect(classifyFirebaseError(undefined)).toBe('unknown');
    expect(classifyFirebaseError('INTERNAL')).toBe('unknown');
  });
});
