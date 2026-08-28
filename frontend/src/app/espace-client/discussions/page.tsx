"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { messagingApi } from "@/lib/api";
import type { ApiConversation } from "@/lib/api/types";
import { EmptyState } from "@/components/client/ui/EmptyState";
import { ListSkeleton } from "@/components/client/ui/Skeleton";
import { ConversationItem } from "@/components/client/ui/ConversationItem";
import { Tabs, type TabItem } from "@/components/client/ui/Tabs";
import { IconAlert, IconChat, IconSearch, IconX } from "@/components/client/icons";
import { cn } from "@/lib/utils";

type ConversationFilter = "all" | "unread" | "products" | "orders";

/** Normalise pour la recherche : minuscules, sans accents (é → e). */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/** Une conversation correspond-elle à la recherche ? (boutique, produit, commande, message) */
function matchesSearch(conversation: ApiConversation, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const haystack = [
    conversation.boutique.name,
    conversation.productName ?? "",
    conversation.orderReference ?? "",
    conversation.lastMessage ?? "",
  ]
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return haystack.includes(q);
}

/**
 * 💬 Mes discussions — la vraie messagerie : chaque conversation est liée à
 * une boutique (et éventuellement à un produit ou une commande). Recherche
 * rapide + filtres (non lues, produits, commandes) — compteur de non-lus et
 * aperçu du dernier message viennent du backend.
 */
export default function MesDiscussionsPage() {
  const [conversations, setConversations] = useState<ApiConversation[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ConversationFilter>("all");

  const load = useCallback(() => {
    setError(null);
    messagingApi
      .conversations()
      .then(setConversations)
      .catch(() => setError("Impossible de charger vos discussions pour le moment."));
  }, []);

  // Chargement différé (setTimeout) : aucun setState synchrone dans l'effet
  useEffect(() => {
    const t = window.setTimeout(() => load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const unreadTotal = (conversations ?? []).reduce(
    (sum, c) => sum + (c.unreadCount ?? 0),
    0,
  );

  // Compteurs par filtre (affichés sur les onglets)
  const counts = useMemo(() => {
    const list = conversations ?? [];
    return {
      all: list.length,
      unread: list.filter((c) => (c.unreadCount ?? 0) > 0).length,
      products: list.filter((c) => Boolean(c.productName)).length,
      orders: list.filter((c) => Boolean(c.orderReference)).length,
    };
  }, [conversations]);

  const TABS: TabItem<ConversationFilter>[] = useMemo(
    () => [
      { value: "all", label: "Toutes", count: counts.all },
      { value: "unread", label: "Non lues", count: counts.unread },
      { value: "products", label: "Produits", count: counts.products },
      { value: "orders", label: "Commandes", count: counts.orders },
    ],
    [counts],
  );

  // Filtres combinés : recherche + onglet
  const filtered = useMemo(() => {
    const list = conversations ?? [];
    const byTab = list.filter((c) => {
      switch (filter) {
        case "unread":
          return (c.unreadCount ?? 0) > 0;
        case "products":
          return Boolean(c.productName);
        case "orders":
          return Boolean(c.orderReference);
        default:
          return true;
      }
    });
    return byTab.filter((c) => matchesSearch(c, query.trim()));
  }, [conversations, filter, query]);

  const hasAny = (conversations?.length ?? 0) > 0;

  return (
    <div className="flex flex-col gap-6">
      {/* En-tête compact — la recherche et les filtres font le travail */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight text-midnight-950 sm:text-3xl">
          Mes discussions
        </h1>
        {hasAny && (
          <span
            className={cn(
              "rounded-full px-3.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]",
              unreadTotal > 0
                ? "bg-gold-400/15 text-gold-700"
                : "bg-midnight-950/5 text-midnight-950/40",
            )}
          >
            {unreadTotal > 0
              ? `${unreadTotal} non lu${unreadTotal > 1 ? "s" : ""}`
              : "Tout est à jour"}
          </span>
        )}
      </div>

      {/* Recherche + filtres rapides */}
      {hasAny && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-midnight-950/35" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher une discussion (boutique, produit, commande…)"
              aria-label="Rechercher une discussion"
              className="h-11 w-full rounded-2xl border border-midnight-950/10 bg-white pl-10 pr-10 text-sm text-midnight-950 placeholder:text-midnight-950/35 focus:border-gold-400 focus:outline-none focus:ring-2 focus:ring-gold-400/25"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Effacer la recherche"
                className="absolute right-2.5 top-1/2 flex h-7 w-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-midnight-950/40 transition-colors hover:bg-midnight-950/5 hover:text-midnight-950"
              >
                <IconX className="h-4 w-4" />
              </button>
            )}
          </div>
          <Tabs tabs={TABS} value={filter} onChange={setFilter} />
        </div>
      )}

      {error ? (
        <EmptyState
          icon={<IconAlert className="h-6 w-6" />}
          title="Impossible de charger vos discussions"
          description="Vérifiez votre connexion puis réessayez."
          action={
            <button
              type="button"
              onClick={load}
              className="rounded-full bg-midnight-950 px-5 py-2.5 text-sm font-bold text-gold-300 transition-all hover:bg-midnight-800"
            >
              Réessayer
            </button>
          }
        />
      ) : conversations === null ? (
        <ListSkeleton rows={4} />
      ) : conversations.length === 0 ? (
        <EmptyState
          icon={<IconChat className="h-6 w-6" />}
          title="Aucune discussion pour le moment"
          description="Depuis une vitrine ou un produit, cliquez sur « Discuter » pour contacter le vendeur. Vos messages apparaîtront ici."
          action={
            <Link
              href="/espace-client/boutiques"
              className="rounded-full bg-midnight-950 px-6 py-2.5 text-sm font-bold text-gold-300 transition-all hover:-translate-y-0.5 hover:bg-midnight-800"
            >
              Découvrir les boutiques
            </Link>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<IconSearch className="h-6 w-6" />}
          title={query.trim() ? "Aucune discussion trouvée" : "Aucune discussion dans ce filtre"}
          description={
            query.trim()
              ? `Aucune discussion ne correspond à « ${query.trim()} ». Essayez un autre terme.`
              : "Essayez un autre filtre pour retrouver vos discussions."
          }
          action={
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setFilter("all");
              }}
              className="rounded-full border border-midnight-950/15 px-5 py-2.5 text-sm font-semibold text-midnight-950/70 transition-colors hover:border-gold-400/60"
            >
              Voir toutes les discussions
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {filtered.map((conversation) => (
            <li key={conversation.id}>
              <ConversationItem
                id={conversation.id}
                shopName={conversation.boutique.name}
                shopLogo={conversation.boutique.logoImage}
                lastMessage={conversation.lastMessage ?? null}
                lastMessageAt={conversation.lastMessageAt ?? ""}
                unreadCount={conversation.unreadCount ?? 0}
                isMine={conversation.lastMessageFrom === "client"}
                productName={conversation.productName ?? null}
                productPrice={conversation.productPrice ?? null}
                productImage={conversation.productImage ?? null}
                orderReference={conversation.orderReference ?? null}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
