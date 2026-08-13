/**
 * Les états que la preview sait forcer.
 *
 * Dans un module neutre, pas dans le composant client : un composant serveur qui
 * importerait cette liste depuis un module `'use client'` ne recevrait pas un
 * tableau, mais une référence client — et `.includes()` échouerait à l'exécution.
 */
export const FORCEABLE_STATES = ['hover', 'focus', 'focus-visible', 'active', 'disabled'] as const;

export type ForceableState = (typeof FORCEABLE_STATES)[number];
