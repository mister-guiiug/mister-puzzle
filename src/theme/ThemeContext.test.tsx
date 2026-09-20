import { beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './ThemeContext';

/**
 * CE QUE CES TESTS TIENNENT — le CONTRAT qu'`index.html` et `index.css`
 * attendent, pas la mécanique du socle.
 *
 * - La clé `mister_puzzle_theme` : c'est celle que l'IIFE anti-FOUC lit avant
 *   tout rendu. En changer sans elle ferait clignoter chaque ouverture en
 *   sombre, et perdrait le choix déjà enregistré.
 * - La CLASSE `dark` sur `<html>`, pas `data-theme` : les jetons d'`index.css`
 *   et la variante `dark` de Tailwind sont définis dessus.
 * - Un seul état pour tous les consommateurs : `Navbar` en change, le reste
 *   l'affiche.
 */
const KEY = 'mister_puzzle_theme';

function Lecteur({ nom }: { nom: string }) {
  const { theme, resolved } = useTheme();
  return <output data-testid={nom}>{`${theme}/${resolved}`}</output>;
}

function Choix({ valeur }: { valeur: 'light' | 'dark' | 'system' }) {
  const { setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme(valeur)}>
      {valeur}
    </button>
  );
}

function monter() {
  return render(
    <ThemeProvider>
      <Lecteur nom="a" />
      <Lecteur nom="b" />
      <Choix valeur="dark" />
      <Choix valeur="light" />
    </ThemeProvider>
  );
}

const html = () => document.documentElement;

describe('<ThemeProvider /> — le thème vient du socle', () => {
  beforeEach(() => {
    cleanup();
    localStorage.clear();
    html().classList.remove('dark');
    html().style.colorScheme = '';
  });

  it('honore la préférence déjà enregistrée sous la clé de l’app', () => {
    localStorage.setItem(KEY, 'dark');
    monter();
    expect(screen.getByTestId('a')).toHaveTextContent('dark/dark');
    expect(html().classList.contains('dark')).toBe(true);
    expect(html().style.colorScheme).toBe('dark');
  });

  it('part sur « system » quand rien n’est stocké', () => {
    monter();
    // `matchMedia` du setup partagé rend `matches: false` → clair.
    expect(screen.getByTestId('a')).toHaveTextContent('system/light');
    expect(html().classList.contains('dark')).toBe(false);
    expect(html().style.colorScheme).toBe('light');
  });

  it('partage un état unique : tous les lecteurs changent ensemble', () => {
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'dark' }));
    expect(screen.getByTestId('a')).toHaveTextContent('dark/dark');
    expect(screen.getByTestId('b')).toHaveTextContent('dark/dark');
    expect(html().classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'light' }));
    expect(screen.getByTestId('b')).toHaveTextContent('light/light');
    expect(html().classList.contains('dark')).toBe(false);
    expect(html().style.colorScheme).toBe('light');
  });

  it('persiste le choix sous la même clé', () => {
    monter();
    fireEvent.click(screen.getByRole('button', { name: 'dark' }));
    expect(localStorage.getItem(KEY)).toBe('dark');
  });

  it('refuse d’être utilisé hors de son fournisseur', () => {
    expect(() => render(<Lecteur nom="seul" />)).toThrow(/ThemeProvider/);
  });
});
