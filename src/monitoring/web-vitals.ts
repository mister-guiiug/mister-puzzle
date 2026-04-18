/**
 * Monitoring des Web Vitals pour tous les projets
 * Installer : npm install web-vitals
 */

import type { Metric } from 'web-vitals'
import { onCLS, onFID, onFCP, onLCP, onTTFB } from 'web-vitals'

// Global declaration for gtag
declare global {
  interface Window {
    gtag?: (command: string, targetId: string, config?: Record<string, unknown>) => void
  }
}

interface MetricWithRating {
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB'
  value: number
  id: string
  navigationType: 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore' | undefined
  rating: 'good' | 'needs-improvement' | 'poor'
}

/**
 * Évaluer la performance d'une métrique
 */
function getRating(metric: Metric): 'good' | 'needs-improvement' | 'poor' {
  switch (metric.name) {
    case 'CLS':
      if (metric.value <= 0.1) return 'good'
      if (metric.value <= 0.25) return 'needs-improvement'
      return 'poor'
    case 'FID':
      if (metric.value <= 100) return 'good'
      if (metric.value <= 300) return 'needs-improvement'
      return 'poor'
    case 'FCP':
      if (metric.value <= 1800) return 'good'
      if (metric.value <= 3000) return 'needs-improvement'
      return 'poor'
    case 'LCP':
      if (metric.value <= 2500) return 'good'
      if (metric.value <= 4000) return 'needs-improvement'
      return 'poor'
    case 'TTFB':
      if (metric.value <= 800) return 'good'
      if (metric.value <= 1800) return 'needs-improvement'
      return 'poor'
    default:
      return 'poor'
  }
}

/**
 * Logger pour les Web Vitals
 */
function logMetric(metric: MetricWithRating): void {
  const rating = metric.rating ?? getRating(metric as Metric)

  // Console logging en développement
  if (import.meta.env.DEV) {
    console.log('[Web Vitals]', { ...metric, rating })
  }

  // Envoyer à Google Analytics
  if (typeof window.gtag !== 'undefined') {
    window.gtag('event', metric.name, {
      event_category: 'Web Vitals',
      event_label: metric.id,
      value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
      non_interaction: true,
      custom_map: { metric_rating: rating },
    })
  }

  // Envoyer à un endpoint personnalisé
  if (import.meta.env.PROD && rating !== 'good') {
    sendToAnalytics({ ...metric, rating })
  }
}

/**
 * Envoyer les métriques à un endpoint d'analyse
 */
async function sendToAnalytics(metric: MetricWithRating): Promise<void> {
  const endpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT

  if (!endpoint) return

  try {
    await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(metric),
    })
  } catch (error) {
    console.warn('Failed to send analytics:', error)
  }
}

/**
 * Initialiser le monitoring des Web Vitals
 */
export function initWebVitals(): void {
  if (typeof window === 'undefined') return

  onCLS(logMetric)
  onFID(logMetric)
  onFCP(logMetric)
  onLCP(logMetric)
  onTTFB(logMetric)
}

/**
 * Hook React pour mesurer des métriques personnalisées
 */
export function useCustomMetric(name: string) {
  const start = performance.now()

  return () => {
    const duration = performance.now() - start
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined

    // Map from NavigationTimingType to web-vitals NavigationType
    const navigationTypeMap: Record<string, 'navigate' | 'reload' | 'back-forward' | 'back-forward-cache' | 'prerender' | 'restore'> = {
      navigate: 'navigate',
      reload: 'reload',
      back_forward: 'back-forward',
      back_forward_cache: 'back-forward-cache',
      prerender: 'prerender',
      restore: 'restore',
    }
    const navigationType = navEntry ? navigationTypeMap[navEntry.type] ?? 'navigate' : 'navigate'

    const metric: MetricWithRating = {
      name: name as 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB',
      value: duration,
      id: `custom-${Date.now()}`,
      rating: 'poor',
      navigationType,
    }

    logMetric(metric)
  }
}

/**
 * Mesurer le temps de chargement d'un composant
 */
export function measureComponentRender(
  componentName: string,
  enabled = import.meta.env.DEV
) {
  if (!enabled) return () => {}

  const start = performance.now()

  return () => {
    const duration = performance.now() - start

    if (duration > 100) {
      console.warn(
        `[Performance] ${componentName} took ${duration.toFixed(2)}ms to render`
      )
    }

    if (typeof window.gtag !== 'undefined') {
      window.gtag('event', 'component_render', {
        event_category: 'Performance',
        event_label: componentName,
        value: Math.round(duration),
      })
    }
  }
}

/**
 * Mesurer la taille du bundle
 */
export function measureBundleSize(): void {
  if (!window.performance) return

  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]

  const jsSize = resources
    .filter(r => r.name.endsWith('.js'))
    .reduce((acc, r) => acc + r.transferSize, 0)

  const cssSize = resources
    .filter(r => r.name.endsWith('.css'))
    .reduce((acc, r) => acc + r.transferSize, 0)

  console.log(`[Bundle Size] JS: ${(jsSize / 1024).toFixed(2)}KB, CSS: ${(cssSize / 1024).toFixed(2)}KB`)
}

/**
 * Hook React pour mesurer les performances d'un effet
 */
export function useEffectPerformance(effectName: string) {
  return (effect: () => void | (() => void)) => {
    const start = performance.now()

    const cleanup = effect()

    const duration = performance.now() - start

    if (duration > 50) {
      console.warn(
        `[Effect Performance] ${effectName} took ${duration.toFixed(2)}ms`
      )
    }

    return cleanup
  }
}