import type { Metadata } from "next";
import type { ReactNode } from "react";
import ClientShell from "@/components/client/ClientShell";

export const metadata: Metadata = {
  title: "Mon espace client | ZennShop",
  description:
    "Votre espace client : découvrez les boutiques, suivez vos commandes, discutez avec les vendeurs et gérez votre compte.",
};

/**
 * Espace client — un compte autonome multi-boutiques :
 * Accueil (annuaire) · Mes commandes · Discussions · Paramètres.
 * La coquille exige une session CLIENT (redirection + retour automatique).
 */
export default function EspaceClientLayout({ children }: { children: ReactNode }) {
  return <ClientShell>{children}</ClientShell>;
}
