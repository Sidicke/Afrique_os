"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { EmptyState } from "@/components/dashboard/ui/EmptyState";
import { Skeleton } from "@/components/dashboard/ui/Skeleton";
import { Icon } from "@/components/dashboard/icons";
import type { ApiConversation } from "@/lib/api";
import { relativeTime } from "./format";

interface ConversationListProps {
  conversations: ApiConversation[] | null;
  loading: boolean;
  activeId: string | null;
  onSelect: (id: string) => void;
}

/** Nom d'affichage d'une conversation (client ou téléphone) */
export function conversationName(c: ApiConversation): string {
  return c.clientName?.trim() || c.clientPhone?.trim() || "Client";
}

/**
 * Liste des conversations — recherche par nom/téléphone/boutique, élément
 * actif surligné, dernier message en temps relatif.
 */
export function ConversationList({
  conversations,
  loading,
  activeId,
  onSelect,
}: ConversationListProps) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    if (!conversations) return null;
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        conversationName(c).toLowerCase().includes(q) ||
        (c.clientPhone ?? "").toLowerCase().includes(q) ||
        c.boutique.name.toLowerCase().includes(q)
    );
  }, [conversations, query]);

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-surface shadow-sm shadow-ink-950/[0.03]">
      {/* Recherche */}
      <div className="border-b border-line p-3.5">
        <div className="relative">
          <Icon
            name="search"
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une conversation…"
            className="w-full rounded-xl border border-line bg-ink-50 py-2 pl-9 pr-3 text-xs text-ink-950 placeholder-ink-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
        </div>
      </div>

      {/* Liste */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
        {loading || !filtered ? (
          <div className="space-y-2 p-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2">
                <Skeleton className="h-9 w-9 rounded-xl" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-2.5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon="message"
            title={query ? "Aucun résultat" : "Aucune conversation"}
            description={
              query
                ? "Essayez un autre nom ou téléphone."
                : "Quand un client vous écrit, sa conversation apparaît ici."
            }
          />
        ) : (
          <ul className="space-y-0.5">
            {filtered.map((c) => {
              const active = c.id === activeId;
              const name = conversationName(c);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors cursor-pointer",
                      active
                        ? "bg-blue-700 text-white shadow-md shadow-blue-700/25"
                        : "text-ink-800 hover:bg-ink-50"
                    )}
                  >
                    <Avatar
                      name={name}
                      src={c.user?.avatarUrl}
                      size="md"
                      className={cn(
                        active && "border-white/20 bg-white/15 text-white"
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-semibold">
                          {name}
                        </span>
                        {c.lastMessageAt && (
                          <span
                            className={cn(
                              "shrink-0 font-mono text-[10px]",
                              active ? "text-blue-100/80" : "text-ink-400"
                            )}
                          >
                            {relativeTime(c.lastMessageAt)}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            "truncate text-xs",
                            active ? "text-blue-100/90" : "text-gold-strong"
                          )}
                        >
                          {c.boutique.name}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
