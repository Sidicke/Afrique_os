import { redirect } from "next/navigation";

/**
 * Ancienne route du dashboard vendeur — l'espace admin vit désormais sous
 * `/espace-admin` (symétrique avec `/espace-client`). Cette page ne fait que
 * rediriger les anciens liens/bookmarks vers la nouvelle route.
 */
export default function LegacyDashboardRedirect() {
  redirect("/espace-admin");
}
