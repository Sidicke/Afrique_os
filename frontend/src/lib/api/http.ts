/**
 * Couche API — client HTTP
 * --------------------------------------------------------------------------
 * Wrapper fetch unique utilisé par TOUS les modules `lib/api/` :
 *  - JSON automatique (requête + réponse)
 *  - `Authorization: Bearer <accessToken>` injecté depuis la session
 *  - `credentials: 'include'` → le cookie httpOnly du refresh part avec les
 *    requêtes (nécessaire au renouvellement de session)
 *  - sur 401 : refresh silencieux (cookie) puis nouvelle tentative UNE fois
 *  - erreurs normalisées en `ApiError` avec le message du backend
 */

import { API_BASE_URL } from "./config";
import {
  clearSession,
  getAccessToken,
  setSession,
  getSessionUser,
} from "./session";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly payload?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Message humain extrait du corps d'erreur NestJS */
async function parseError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as {
      message?: string | string[];
      error?: string;
    };
    const msg = Array.isArray(body.message)
      ? body.message[0]
      : body.message ?? body.error;
    if (typeof msg === "string" && msg.length > 0) return msg;
    return `Erreur ${res.status}`;
  } catch {
    return `Erreur ${res.status}`;
  }
}

/**
 * Renouvellement de session : single-flight (une seule requête de refresh
 * à la fois, les autres 401 attendent le même résultat).
 */
let refreshing: Promise<string | null> | null = null;

function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          clearSession();
          return null;
        }
        const data = (await res.json()) as {
          accessToken: string;
          user: import("./types").ApiUser;
        };
        const currentUser = getSessionUser();
        if (currentUser) {
          data.user.boutiqueId = currentUser.boutiqueId;
          data.user.boutiqueSlug = currentUser.boutiqueSlug;
          (data.user as any).boutiqueName = (currentUser as any).boutiqueName;
        }
        setSession({ accessToken: data.accessToken, user: data.user });
        return data.accessToken;
      } catch {
        clearSession();
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  });

  // Access token expiré → refresh via cookie puis nouvelle tentative
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) return apiFetch<T>(path, options, false);
    throw new ApiError(401, "Session expirée, reconnectez-vous.");
  }

  if (!res.ok) {
    throw new ApiError(res.status, await parseError(res));
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
