/** Précharge le chunk du tableau de bord (même module que `React.lazy` dans `App`). */
export function prefetchDashboardChunk(): void {
  void import('../components/Dashboard');
}
