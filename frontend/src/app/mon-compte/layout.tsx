import type { Metadata } from "next";
import type { ReactNode } from "react";
import ClientShell from "@/components/client/ClientShell";

export const metadata: Metadata = {
  title: "Mon Compte | ZennShop",
  description:
    "Votre espace acheteur : suivez vos commandes, vos discussions, vos points fidélité et gérez votre profil.",
};

/**
 * Coquille Espace Acheteur (/mon-compte) — Isolation logique stricte
 */
export default function MonCompteLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
