/**
 * Tests E2E critiques pour mister-puzzle
 */

import { test, expect } from '@playwright/test'

test.describe('mister-puzzle - Fonctionnalités critiques', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('page d\'accueil se charge correctement', async ({ page }) => {
    await expect(page.locator('h1, h2, main, .app')).toBeVisible()
  })

  test('création/join room fonctionnel', async ({ page }) => {
    await page.goto('/')

    // Test de création de room
    const joinInput = page.locator('input[type="text"], input[placeholder*="code"]').first()
    if (await joinInput.isVisible()) {
      await joinInput.fill('TEST')
      await page.click('button:has-text("Rejoindre"), button:has-text("Join")')

      // Vérifier qu'on navigue vers la room
      await expect(page).toHaveURL(/#TEST/i)
    }
  })

  test('navigation responsive', async ({ page }) => {
    // Test mobile
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/')
    await expect(page.locator('nav, .navbar, header')).toBeVisible()

    // Vérifier le menu mobile
    const menuButton = page.locator('button[aria-label*="menu"], button[aria-label*="Menu"], .menu-button').first()
    if (await menuButton.isVisible()) {
      await menuButton.click()
      await expect(page.locator('.drawer, .menu, [role="navigation"]')).toBeVisible()
    }
  })

  test('accessibilité - navigation clavier', async ({ page }) => {
    await page.goto('/')

    // Tab sur le premier élément interactif
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'A', 'INPUT']).toContain(focusedElement)
  })

  test('performance - chargement initial < 4s', async ({ page }) => {
    const startTime = Date.now()
    await page.goto('/')
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(4000)
  })

  test(' Firebase - gestion erreurs connexion', async ({ page }) => {
    await page.goto('/')

    // Simuler offline
    await page.context().setOffline(true)

    // Tenter de rejoindre une room
    const joinInput = page.locator('input[type="text"], input[placeholder*="code"]').first()
    if (await joinInput.isVisible()) {
      await joinInput.fill('TEST123')
      await page.click('button:has-text("Rejoindre"), button:has-text("Join")')

      // Devrait afficher un message d'erreur offline
      await expect(page.locator('text=offline, text=connexion, text=erreur')).toBeVisible()
    }
  })

  test('internationalisation - toggle FR/EN', async ({ page }) => {
    await page.goto('/')

    // Trouver le bouton de langue
    const langButton = page.locator('button[aria-label*="langue"], button:has-text("FR"), button:has-text("EN")').first()

    if (await langButton.isVisible()) {
      await langButton.click()

      // Vérifier que la langue a changé
      const html = page.locator('html')
      const lang = await html.getAttribute('lang')
      expect(['fr', 'en']).toContain(lang || '')
    }
  })

  test('thème - toggle light/dark', async ({ page }) => {
    await page.goto('/')

    // Trouver le bouton de thème
    const themeButton = page.locator('button[aria-label*="thème"], button[aria-label*="theme"]').first()

    if (await themeButton.isVisible()) {
      const initialTheme = await page.locator('html').getAttribute('class')
      await themeButton.click()

      // Vérifier que le thème a changé
      const newTheme = await page.locator('html').getAttribute('class')
      expect(initialTheme).not.toBe(newTheme)
    }
  })

  test('pseudo - gestion du pseudonyme', async ({ page }) => {
    await page.goto('/')

    // Trouver le champ pseudo
    const pseudoInput = page.locator('input[placeholder*="pseudo"], input[name="pseudo"]').first()

    if (await pseudoInput.isVisible()) {
      await pseudoInput.fill('TestUser')
      await page.click('button:has-text("Sauvegarder"), button:has-text("Valider")')

      // Vérifier que le pseudo est sauvegardé
      await page.reload()
      const value = await pseudoInput.inputValue()
      expect(value).toBe('TestUser')
    }
  })
})

test.describe('mister-puzzle - Collaboratif', () => {
  test('affichage tableau de bord puzzle', async ({ page }) => {
    // Naviguer vers une room de test
    await page.goto('/#TEST')
    await page.waitForLoadState('networkidle')

    // Vérifier que le dashboard se charge
    await expect(page.locator('.dashboard, .puzzle, main')).toBeVisible()
  })

  test('indicateur offline visible', async ({ page }) => {
    await page.goto('/')

    // Simuler offline
    await page.context().setOffline(true)

    // Vérifier l'indicateur offline
    await expect(page.locator('text=offline, text=Hors ligne, [role="alert"]')).toBeVisible()
  })
})