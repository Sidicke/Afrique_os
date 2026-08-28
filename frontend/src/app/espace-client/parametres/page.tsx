import { redirect } from "next/navigation";

/**
 * Ancienne route « Paramètres » — le compte client vit désormais dans
 * `/espace-client/compte` (profil + sécurité + session). On route vers
 * l'existant au lieu de dupliquer la page.
 */
export default function ParametresRedirect() {
  redirect("/espace-client/compte");
}
