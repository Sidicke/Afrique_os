/**
 * Liens de la messagerie client.
 * --------------------------------------------------------------------------
 * « Discuter » passe TOUJOURS par un produit et mène à l'ESPACE CLIENT :
 * la page `/espace-client/discussions/nouvelle` crée la conversation avec la
 * boutique (ou réutilise celle qui existe), liée au produit (id + snapshots
 * nom/prix/description/image), puis redirige vers la conversation dans
 * « Mes discussions ».
 *
 * Partagé par la fiche produit, la carte produit de la vitrine et celle de
 * l'espace client — un seul point de vérité pour l'URL de discussion.
 */
export function productChatHref(options: {
  boutiqueId: string;
  id: string;
  name: string;
  price: number | string;
  description?: string;
  image?: string;
}): string {
  const { boutiqueId, id, name, price, description = "", image = "" } = options;
  return `/espace-client/discussions/nouvelle?boutique=${encodeURIComponent(
    boutiqueId
  )}&productId=${encodeURIComponent(id)}&name=${encodeURIComponent(
    name
  )}&price=${encodeURIComponent(String(price))}&desc=${encodeURIComponent(
    description
  )}&img=${encodeURIComponent(image)}`;
}
