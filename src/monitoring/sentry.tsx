/**
 * Configuration Sentry pour le tracking d'erreurs
 * Installer : npm install @sentry/react
 */

import * as Sentry from '@sentry/react'
import type React from 'react'
import { browserTracingIntegration } from '@sentry/react'
import { replayIntegration } from '@sentry/react'

interface SentryConfig {
  dsn: string
  environment: 'development' | 'staging' | 'production'
  tracesSampleRate: number
  replaysSessionSampleRate: number
  replaysOnErrorSampleRate: number
}

export function initSentry(config: SentryConfig): void {
  if (!config.dsn) {
    console.warn('Sentry DSN not provided - skipping initialization')
    return
  }

  Sentry.init({
    dsn: config.dsn,
    environment: config.environment,

    // Performance Monitoring
    integrations: [
      browserTracingIntegration(),
      replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],

    // Set tracesSampleRate to 1.0 to capture 100%
    // of transactions for performance monitoring.
    tracesSampleRate: config.tracesSampleRate,

    // Capture Replay for 10% of all sessions,
    // plus 100% of sessions with an error
    replaysSessionSampleRate: config.replaysSessionSampleRate,
    replaysOnErrorSampleRate: config.replaysOnErrorSampleRate,

    // Filter out sensitive data
    beforeSend(event) {
      // Don't send events in development
      if (config.environment === 'development') {
        console.warn('Sentry event:', event)
        return null
      }

      // Remove sensitive data
      if (event.request) {
        delete event.request.cookies
        delete event.request.headers
      }

      return event
    },

    // Custom context
    initialScope: {
      tags: {
        project: import.meta.env.PROJECT_NAME || 'unknown',
      },
    },
  })
}

/**
 * Envoyer une erreur manuellement à Sentry
 */
export function captureException(error: Error, context?: Record<string, unknown>): void {
  Sentry.withScope((scope) => {
    if (context) {
      Object.entries(context).forEach(([key, value]) => {
        scope.setExtra(key, value)
      })
    }
    Sentry.captureException(error)
  })
}

/**
 * Envoyer un message à Sentry
 */
export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
  Sentry.captureMessage(message, level)
}

/**
 * Créer un boundary React pour capturer les erreurs
 */
export function withSentryErrorBoundary<P extends object>(
  component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; reset: () => void }>
): React.ComponentType<P> {
  return Sentry.withErrorBoundary(component, {
    fallback: ({ error, resetError }) => {
      const errorObj = error instanceof Error ? error : new Error(String(error))
      if (fallback) {
        const FallbackComponent = fallback
        return <FallbackComponent error={errorObj} reset={resetError} />
      }
      return (
        <div>
          <h2>Une erreur est survenue</h2>
          <button onClick={resetError}>Réessayer</button>
        </div>
      )
    },
  })
}

/**
 * Hook React pour utiliser Sentry dans les composants
 */
export function useSentry() {
  return {
    captureException,
    captureMessage,
    setUser: (user: { id: string; email?: string; username?: string }) => {
      Sentry.setUser(user)
    },
    setTag: (key: string, value: string) => {
      Sentry.setTag(key, value)
    },
    addBreadcrumb: (breadcrumb: Sentry.Breadcrumb) => {
      Sentry.addBreadcrumb(breadcrumb)
    },
  }
}