/**
 * Service Layer — Newsletter (vitrine)
 * --------------------------------------------------------------------------
 * Point d'entrée unique pour l'inscription à la newsletter d'une boutique.
 * Délègue à la couche `lib/api/` (catalogueApi) : le composant `Newsletter`
 * ne connaît ni fetch, ni endpoint — il consomme ce service.
 */

import { catalogueApi } from "@/lib/api";

/** Inscrit un e-mail à la newsletter de la boutique identifiée par son slug */
export async function newsletterSubscribe(
  slug: string,
  email: string,
): Promise<{ success: boolean }> {
  return catalogueApi.newsletterSubscribe(slug, email);
}
