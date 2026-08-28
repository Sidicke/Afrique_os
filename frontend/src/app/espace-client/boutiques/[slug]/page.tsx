import { redirect } from "next/navigation";

/**
 * Ancienne fiche boutique de l'espace client — la boutique s'ouvre désormais
 * dans la VRAIE vitrine `/boutique/[slug]` (StoreHero, ProductGrid, panier,
 * discussion…). On route vers l'existant au lieu de dupliquer une page.
 */
export default async function ClientBoutiqueRedirect({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  redirect(`/boutique/${slug}`);
}
