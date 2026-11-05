"use client";

import Link from "next/link";

export default function CheckoutCancelPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ivory-50 px-4 py-12">
      <div className="w-full max-w-lg rounded-3xl border border-midnight-950/10 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/15 text-amber-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-600">
          Paiement interrompu
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-midnight-950">
          Paiement annulé sur PayDunya
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-midnight-950/65">
          Votre commande a bien été enregistrée mais n&apos;est pas encore payée. Vous pouvez relancer le paiement PayDunya à tout moment depuis la page « Mes commandes ».
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <Link
            href="/espace-client/commandes"
            className="flex w-full items-center justify-center rounded-xl bg-midnight-950 px-6 py-3.5 text-sm font-semibold text-gold-300 transition-colors hover:bg-midnight-800"
          >
            Reprendre le paiement dans Mes commandes
          </Link>
          <Link
            href="/espace-client"
            className="mt-1 text-xs font-medium text-midnight-950/55 transition-colors hover:text-midnight-950"
          >
            ← Retourner aux boutiques
          </Link>
        </div>
      </div>
    </main>
  );
}
