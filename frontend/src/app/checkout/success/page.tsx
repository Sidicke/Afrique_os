"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ordersApi, ApiError } from "@/lib/api";

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const orderId = searchParams.get("paydunya_order") ?? searchParams.get("orderId") ?? undefined;
  const boutiqueId = searchParams.get("boutique");

  const [status, setStatus] = useState<"verifying" | "confirmed" | "pending" | "error">(
    token ? "verifying" : "confirmed",
  );
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | undefined>(orderId);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus("confirmed");
      return;
    }

    let cancelled = false;
    void ordersApi
      .confirmPayDunyaTransaction(token)
      .then((res) => {
        if (cancelled) return;
        if (res.orderId) setConfirmedOrderId(res.orderId);
        if (res.paydunyaStatus === "completed" || res.settlementStatus === "settled") {
          setStatus("confirmed");
        } else {
          setStatus("pending");
        }
      })
      .catch((err) => {
        if (cancelled) return;
        // Correctif C2 — la confirmation directe exige une session authentifiée.
        // Un visiteur invité ne peut donc pas la déclencher : le règlement est
        // alors assuré par la notification IPN de PayDunya. On affiche l'état
        // « en attente » plutôt qu'une erreur, qui serait trompeuse.
        if (err instanceof ApiError && err.status === 401) {
          setStatus("pending");
          return;
        }
        setStatus("error");
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "La vérification automatique du paiement n'a pas pu aboutir.",
        );
      });

    return () => {
      cancelled = true;
    };
  }, [token, orderId]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-midnight-950/10 bg-white p-8 text-center shadow-xl">
        {status === "verifying" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold-400/15">
              <span className="h-7 w-7 animate-spin rounded-full border-3 border-gold-500/30 border-t-gold-600" />
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-gold-600">
              Vérification PayDunya en cours
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-midnight-950">
              Validation de votre paiement…
            </h1>
            <p className="mt-2 text-sm text-midnight-950/60">
              Nous confirmons votre transaction auprès de PayDunya et générons votre suivi de livraison.
            </p>
          </>
        )}

        {status === "confirmed" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-600">
              Paiement PayDunya confirmé
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-midnight-950">
              Merci pour votre commande !
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-midnight-950/65">
              Votre règlement a été validé avec succès. La boutique prépare votre colis et votre code secret de remise à 6 chiffres est disponible dans votre espace client.
            </p>
            {confirmedOrderId && (
              <p className="mt-3 inline-block rounded-full border border-midnight-950/10 bg-ivory-50 px-3.5 py-1 font-mono text-xs text-midnight-950/75">
                Commande : {confirmedOrderId}
              </p>
            )}
          </>
        )}

        {status === "pending" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-600">
              Paiement en attente de validation
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-midnight-950">
              Transaction en cours de traitement
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-midnight-950/65">
              PayDunya traite actuellement votre paiement. Votre commande passera automatiquement au statut « Payée » dès confirmation.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-500/15 text-red-600">
              <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z" />
              </svg>
            </div>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-red-600">
              Vérification du paiement
            </p>
            <h1 className="mt-2 font-display text-2xl font-bold text-midnight-950">
              Vérification différée
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-midnight-950/65">
              {errorMessage}
            </p>
          </>
        )}

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href="/espace-client/commandes"
            className="flex w-full items-center justify-center rounded-xl bg-midnight-950 px-6 py-3.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-midnight-800"
          >
            Suivre ma commande et voir mon code de livraison
          </Link>
          <Link
            href="/livraisons"
            className="flex w-full items-center justify-center rounded-xl border border-gold-400/40 bg-gold-400/10 px-6 py-3 text-xs font-semibold text-midnight-950 transition-colors hover:bg-gold-400/20"
          >
            Suivi d&apos;expédition en direct
          </Link>
          <Link
            href={boutiqueId ? `/boutique/${boutiqueId}` : "/espace-client"}
            className="mt-1 text-xs font-medium text-midnight-950/55 transition-colors hover:text-midnight-950"
          >
            ← Retourner à la boutique
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-ivory-50 px-4">
          <p className="text-sm text-midnight-950/60">Chargement de la confirmation…</p>
        </main>
      }
    >
      <CheckoutSuccessContent />
    </Suspense>
  );
}
