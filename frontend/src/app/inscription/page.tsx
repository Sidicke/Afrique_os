"use client";

import { Suspense } from "react";
import InscriptionForm from "./InscriptionForm";

export default function InscriptionPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement…</div>}>
      <InscriptionForm />
    </Suspense>
  );
}