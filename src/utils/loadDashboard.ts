/**
 * Le chargeur du tableau de bord — UN seul thunk, au niveau du module.
 *
 * `lazy()` dans `App` et `usePrefetch()` dans `Home`, `NavigationDrawer` et
 * `App` reçoivent cette même fonction : même `import()`, donc même morceau.
 * La déduplication du socle repose sur l'IDENTITÉ du chargeur — un
 * `() => import(…)` écrit en ligne à chaque site changerait d'identité à
 * chaque rendu et ne dédupliquerait plus rien.
 */
export const loadDashboard = () => import('../components/Dashboard');
