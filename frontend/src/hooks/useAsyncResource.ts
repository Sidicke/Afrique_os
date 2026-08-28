"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook générique de chargement de données — pattern fetch → état.
 *
 * - L'effet applique les résultats en `.then()` (règle react-hooks/set-state-in-effect).
 * - `refresh` recharge avec indicateur de chargement (événement utilisateur).
 * - `setData` permet aux hooks métier de mettre à jour l'état localement
 *   (changement de statut, ajout de produit…) sans re-fetch.
 *
 * ⚠️ IMPORTANT : `fetcher` doit être mémorisé avec `useCallback` (identité stable),
 * sinon l'effet se relance à chaque rendu → boucle de rechargement infinie.
 * Passer `errorMessage` en littéral de chaîne pour la même raison.
 */
export function useAsyncResource<T>(
  fetcher: () => Promise<T>,
  errorMessage = "Impossible de charger les données."
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetcher().then(
      (result) => {
        if (!active) return;
        setData(result);
        setError(null);
        setLoading(false);
      },
      (err) => {
        if (!active) return;
        setError(errorMessage);
        setLoading(false);
        console.error("Async error:", err);
      }
    );
    return () => {
      active = false;
    };
  }, [fetcher, errorMessage]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetcher();
      setData(result);
      setError(null);
    } catch (err) {
      setError(errorMessage);
      console.error("Async error:", err);
    } finally {
      setLoading(false);
    }
  }, [fetcher, errorMessage]);

  return { data, loading, error, refresh, setData };
}
