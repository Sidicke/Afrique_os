/**
 * Couche API — configuration
 * --------------------------------------------------------------------------
 * Point d'entrée unique de l'API. Les URLs sont configurables par variables
 * d'environnement Next.js (`NEXT_PUBLIC_*`, voir `.env.local`) avec repli
 * sur les valeurs de développement locales.
 *
 * Tous les modules de `lib/api/` passent par ces constantes : il n'y a
 * JAMAIS d'URL en dur dans les composants.
 */

const DEFAULT_API_URL = "http://localhost:3000/api/v1";
const DEFAULT_WS_URL = "http://localhost:3000";

/** Base REST (préfixe /api/v1 inclus) */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_API_URL
).replace(/\/+$/, "");

/** Base WebSocket Socket.IO (namespace /messaging est ajouté par le client) */
export const WS_BASE_URL = (
  process.env.NEXT_PUBLIC_WS_URL ?? DEFAULT_WS_URL
).replace(/\/+$/, "");
