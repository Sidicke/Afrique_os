"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { messagingApi } from "@/lib/api";
import { getSessionUser } from "@/lib/api/session";
import { formatFcfa } from "@/lib/utils";
import { IconChat, IconAlert, IconStore } from "@/components/client/icons";

/**
 * Démarre une conversation avec un CONTEXTE COMMERCIAL : la messagerie
 * comprend le commerce. Deux cas :
 *  - `orderId` + `orderReference` → fil lié à une commande (« Discuter de
 *    cette commande » depuis Mes commandes).
 *  - `productId` + `name` + `price` → fil lié à un produit (vitrine).
 * Le fil existant est réutilisé (pas de doublon), puis redirection vers la
 * conversation.
 */
export default function NouvelleDiscussionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const startedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);

  const boutiqueId = searchParams.get("boutique");
  const orderId = searchParams.get("orderId");
  const orderReference = searchParams.get("orderReference");
  const productId = searchParams.get("productId");
  const productName = searchParams.get("name");
  const productPrice = searchParams.get("price");
  const productDescription = searchParams.get("desc");
  const productImage = searchParams.get("img");

  useEffect(() => {
    if (startedRef.current || !boutiqueId) return;
    startedRef.current = true;

    const user = getSessionUser();
    const suggestedMessage = orderReference
      ? `Bonjour, j'ai une question sur ma commande ${orderReference} : `
      : productName
        ? `Bonjour, je suis intéressé(e) par votre article « ${productName} »${
            productPrice ? ` (${formatFcfa(Number(productPrice))})` : ""
          }. Est-il disponible ?`
        : "Bonjour, je souhaite avoir plus de renseignements sur votre boutique.";

    messagingApi
      .startConversation(boutiqueId, {
        clientName: user?.name ?? "",
        clientPhone: user?.phone ?? undefined,
        // Le message n'est pas envoyé automatiquement : il est proposé au client dans le champ de saisie
        ...(orderId && orderReference
          ? { orderId, orderReference }
          : productId
            ? {
                productId,
                productName: productName ?? undefined,
                productPrice: productPrice ?? undefined,
                productDescription: productDescription ?? undefined,
                productImage: productImage ?? undefined,
              }
            : {}),
      })
      .then((conversation) => {
        setShopName(conversation.boutique?.name ?? null);
        const promptParam = encodeURIComponent(suggestedMessage);
        router.replace(`/espace-client/discussions/${conversation.id}?prompt=${promptParam}`);
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error ? err.message : "Impossible d'ouvrir la discussion pour le moment.",
        );
      });
  }, [
    boutiqueId,
    orderId,
    orderReference,
    productId,
    productName,
    productPrice,
    productDescription,
    productImage,
    router,
  ]);

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-4 text-center">
      {!boutiqueId || error ? (
        <>
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50 text-red-500">
            <IconAlert className="h-6 w-6" />
          </span>
          <p className="max-w-sm text-sm text-red-600">
            {error ?? "Impossible d'ouvrir la discussion : boutique inconnue."}
          </p>
          <Link
            href="/espace-client/discussions"
            className="rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
          >
            Mes discussions
          </Link>
        </>
      ) : (
        <>
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-gold-400 border-t-midnight-950" />
          <p className="text-sm text-midnight-950/50">
            {shopName ? (
              <span className="flex items-center gap-2">
                <IconStore className="h-4 w-4 text-gold-600" />
                Ouverture de la discussion avec {shopName}…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <IconChat className="h-4 w-4 text-gold-600" />
                Ouverture de la discussion…
              </span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
