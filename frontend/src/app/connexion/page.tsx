"use client";

import { Suspense } from "react";
import ConnexionForm from "./ConnexionForm";

export default function ConnexionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
      <ConnexionForm />
    </Suspense>
  );
}