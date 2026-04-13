import { describe, it, expect, beforeEach } from 'vitest';
import { getInputMode, setInputModePreference } from './pseudo';

const memory: Record<string, string> = {};

describe('pseudo input mode prefs', () => {
  beforeEach(() => {
    for (const k of Object.keys(memory)) delete memory[k];
    const ls = {
      getItem: (k: string) => memory[k] ?? null,
      setItem: (k: string, v: string) => {
        memory[k] = v;
      },
      removeItem: (k: string) => {
        delete memory[k];
      },
      clear: () => {
        for (const k of Object.keys(memory)) delete memory[k];
      },
    };
    Object.defineProperty(globalThis, 'localStorage', { value: ls, configurable: true });
  });

  it('defaults to placed for unknown pseudo', () => {
    expect(getInputMode('')).toBe('placed');
    expect(getInputMode('newuser')).toBe('placed');
  });

  it('stores and reads per pseudo', () => {
    setInputModePreference('alice', 'remaining');
    setInputModePreference('bob', 'placed');
    expect(getInputMode('alice')).toBe('remaining');
    expect(getInputMode('bob')).toBe('placed');
  });
});
