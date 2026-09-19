import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ boutiqueSlug: string; productSlug: string }>;
}

/**
 * Redirection de transition : les anciens liens /b/:boutiqueSlug/p/:productSlug
 * sont redirigés vers le format officiel /b/:boutiqueSlug/produit/:productSlug
 */
export default async function LegacyProductRedirect({ params }: Props) {
  const { boutiqueSlug, productSlug } = await params;
  redirect(`/b/${encodeURIComponent(boutiqueSlug)}/produit/${encodeURIComponent(productSlug)}`);
}
