"use client";

import { useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useCart } from "@/components/store/CartProvider";
import { catalogueApi, toPublicProduct } from "@/lib/api";

export function BuyNowHandler({ boutique }: { boutique: { slug: string } }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { add, openCartAtCheckout, clear, isOpen } = useCart();
  const handled = useRef(false);

  useEffect(() => {
    const buyNow = searchParams?.get("buyNow");
    const price = searchParams?.get("price");
    const conv = searchParams?.get("conv");

    if (buyNow && price && conv && !handled.current && !isOpen) {
      handled.current = true;
      // Load the product
      catalogueApi.product(boutique.slug, buyNow).then((product) => {
        clear();
        add(toPublicProduct(product as any), undefined, parseInt(price, 10), conv);
        openCartAtCheckout();
        // Remove query params
        router.replace(`/espace-client/boutiques/${boutique.slug}`);
      }).catch(console.error);
    }
  }, [searchParams, boutique.slug, add, openCartAtCheckout, clear, router, isOpen]);

  return null;
}
