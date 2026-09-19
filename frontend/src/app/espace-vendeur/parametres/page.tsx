import { redirect } from "next/navigation";

/** La racine des paramètres mène au premier sous-paramètre : Ma boutique → Général */
export default function ParametresIndexPage() {
  redirect("/espace-vendeur/parametres/boutique");
}
