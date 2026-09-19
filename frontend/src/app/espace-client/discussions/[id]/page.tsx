"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ApiError, messagingApi } from "@/lib/api";
import type { ApiConversation, ApiMessage } from "@/lib/api/types";
import { formatCurrency, initials } from "@/lib/utils";
import { getSessionUser } from "@/lib/api/session";
import {
  IconAlert,
  IconArrowLeft,
  IconBag,
  IconChat,
  IconPackage,
  IconSend,
  IconStore,
} from "@/components/client/icons";
import { cn } from "@/lib/utils";

/** Intervalle de rafraîchissement silencieux des messages (ms) */
const POLL_INTERVAL = 3_000;

function bubbleTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Conversation en direct avec une boutique — historique paginé, envoi,
 * marquage lu (le badge de la liste repasse à zéro). Rafraîchissement
 * silencieux : les réponses du vendeur apparaissent sans recharger la page.
 */
export default function ConversationPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const conversationId = Array.isArray(params.id) ? params.id[0] : params.id;
  const initialPrompt = searchParams.get("prompt");

  const [conversation, setConversation] = useState<ApiConversation | null>(null);
  const [messages, setMessages] = useState<ApiMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const promptAppliedRef = useRef(false);
  const sessionUser = getSessionUser();
  const myId = sessionUser?.id;

  // Pré-remplit la saisie avec le message proposé sans l'envoyer directement
  useEffect(() => {
    if (!promptAppliedRef.current && initialPrompt) {
      setDraft(initialPrompt);
      promptAppliedRef.current = true;
      const timer = setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          const len = inputRef.current.value.length;
          inputRef.current.setSelectionRange(len, len);
        }
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [initialPrompt]);

  // Suggestions intelligentes contextualisées
  const suggestions = useMemo(() => {
    if (conversation?.orderReference) {
      return [
        `Bonjour, où en est la livraison de ma commande ${conversation.orderReference} ?`,
        `Bonjour, quand ma commande ${conversation.orderReference} sera-t-elle expédiée ?`,
        `Bonjour, je souhaite modifier mes coordonnées de livraison.`,
      ];
    }
    if (conversation?.productName) {
      return [
        `Bonjour, l'article « ${conversation.productName} » est-il disponible ?`,
        `Bonjour, quel est le délai et le coût de livraison pour « ${conversation.productName} » ?`,
        `Bonjour, est-il possible d'avoir plus de précisions sur cet article ?`,
      ];
    }
    return [
      "Bonjour, quels sont vos délais de livraison habituels ?",
      "Bonjour, vos produits sont-ils disponibles immédiatement ?",
      "Bonjour, acceptez-vous le paiement à la livraison ?",
    ];
  }, [conversation?.orderReference, conversation?.productName]);

  /** Charge la conversation (depuis la liste) puis l'historique */
  const load = useCallback(async () => {
    if (!conversationId) return;
    try {
      const list = await messagingApi.conversations();
      const found = list.find((c) => c.id === conversationId) ?? null;
      setConversation(found);
      const history = await messagingApi.messages(conversationId);
      setMessages(history);
      setError(null);
      // Marque comme lu dès l'ouverture (les messages du vendeur)
      await messagingApi.markRead(conversationId);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Impossible de charger la conversation pour le moment.");
      }
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Chargement différé (setTimeout) : aucun setState synchrone dans l'effet
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  /** Polling silencieux : nouveaux messages + non-lus */
  useEffect(() => {
    if (!conversationId || loading) return;
    const poll = () => {
      void messagingApi
        .messages(conversationId)
        .then((history) => {
          setMessages(history);
          void messagingApi.markRead(conversationId).catch(() => {});
        })
        .catch(() => {});
    };
    const interval = setInterval(poll, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [conversationId, loading]);

  // Défilement vers le bas à chaque nouvel envoi
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = draft.trim();
    if (!content || !conversationId || sending) return;
    setSending(true);
    try {
      const { message } = await messagingApi.send(conversationId, content);
      // Le backend renvoie les messages du plus récent au plus ancien : on
      // PRÉPEND le message envoyé pour conserver cet ordre (sinon il
      // apparaîtrait en haut après le reverse d'affichage).
      setMessages((prev) => [message, ...prev]);
      setDraft("");
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Impossible d'envoyer le message pour le moment.");
      }
    } finally {
      setSending(false);
    }
  };

  // Tri chronologique : le backend renvoie du plus récent au plus ancien
  const ordered = [...messages].reverse();

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      {/* Barre conversation */}
      <div className="flex items-center gap-3 rounded-2xl border border-midnight-950/8 bg-white p-3 shadow-sm shadow-midnight-950/[0.02]">
        <Link
          href="/espace-client/discussions"
          aria-label="Retour aux discussions"
          className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-xl text-midnight-950/50 transition-colors hover:bg-gray-100 hover:text-midnight-950"
        >
          <IconArrowLeft className="h-4 w-4" />
        </Link>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-midnight-950 font-display text-xs font-bold text-gold-300">
          {conversation?.boutique.logoImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={conversation.boutique.logoImage} alt="" className="h-full w-full object-cover" />
          ) : conversation ? (
            initials(conversation.boutique.name)
          ) : (
            <IconStore className="h-4 w-4" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-sm font-bold text-midnight-950">
            {conversation?.boutique.name ?? "Conversation"}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-midnight-950/40">
            {conversation ? "Réponse du vendeur attendue" : "Chargement…"}
          </p>
        </div>
      </div>

      {/* Contexte commercial — la messagerie comprend le commerce : le produit
          concerné est affiché avec son image, son prix et sa description */}
      {conversation && (conversation.orderReference || conversation.productName) && (
        <div className="flex items-start gap-3 rounded-2xl border border-gold-400/25 bg-gold-400/8 px-4 py-3">
          {conversation.orderReference ? (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-midnight-950 text-gold-300">
              <IconBag className="h-4 w-4" />
            </span>
          ) : conversation.productImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={conversation.productImage}
              alt=""
              className="h-12 w-12 shrink-0 rounded-xl border border-midnight-950/10 bg-white object-cover"
            />
          ) : (
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-midnight-950 text-gold-300">
              <IconPackage className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-gold-600">
              {conversation.orderReference ? "Votre commande" : "Votre question"}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-midnight-950">
              {conversation.orderReference ?? conversation.productName}
            </p>
            {conversation.productPrice && (
              <p className="text-xs font-semibold text-gold-600">
                {formatCurrency(Number(conversation.productPrice))}
              </p>
            )}
            {!conversation.orderReference && conversation.productDescription && (
              <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-midnight-950/60">
                {conversation.productDescription}
              </p>
            )}

            {conversation.agreedPrice && !conversation.orderReference && (
              <div className="mt-2 w-full pt-2 border-t border-gold-400/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-xs text-midnight-950">
                  <span className="font-bold text-green-600">Offre négociée !</span> Le vendeur vous propose ce produit à <span className="font-bold">{formatCurrency(conversation.agreedPrice)}</span>.
                </p>
                <Link
                  href={`/espace-client/boutiques/${conversation.boutique.slug}?buyNow=${conversation.productId}&price=${conversation.agreedPrice}&conv=${conversation.id}`}
                  className="shrink-0 rounded-full bg-midnight-950 px-4 py-1.5 text-xs font-bold text-gold-300 transition-colors hover:bg-midnight-800 text-center"
                >
                  Acheter à {formatCurrency(conversation.agreedPrice)}
                </Link>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Zone messages */}
      <div className="flex h-[58vh] min-h-80 flex-col rounded-2xl border border-midnight-950/8 bg-gray-50/70 p-4 sm:p-5">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-600">
            <IconAlert className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex-1 space-y-3 overflow-y-auto pb-2 pr-1">
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "h-12 animate-pulse rounded-2xl",
                    i % 2 === 0 ? "ml-auto w-2/3 bg-gold-400/20" : "w-2/3 bg-white",
                  )}
                />
              ))}
            </div>
          ) : ordered.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gold-400/30 bg-gold-400/15 text-gold-700">
                <IconChat className="h-6 w-6" />
              </span>
              <div>
                <p className="font-display text-sm font-bold text-midnight-950">
                  {conversation?.boutique.name ?? "Cette boutique"}
                </p>
                <p className="mt-1 max-w-sm text-xs text-midnight-950/60 leading-relaxed">
                  Posez votre question, négociez ou demandez des détails. Choisissez une proposition ci-dessous ou écrivez librement.
                </p>
              </div>

              {/* Propositions intégrées dans la discussion vide */}
              <div className="mt-2 flex w-full max-w-md flex-col gap-2">
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setDraft(s);
                      inputRef.current?.focus();
                    }}
                    className="flex cursor-pointer items-center justify-between rounded-xl border border-midnight-950/10 bg-white px-4 py-2.5 text-left text-xs font-medium text-midnight-950/80 shadow-2xs transition-all hover:border-gold-400 hover:bg-gold-400/8 hover:text-midnight-950 active:scale-[0.99]"
                  >
                    <span>{s}</span>
                    <span className="ml-2 font-bold text-gold-600">→</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            ordered.map((message) => {
              const mine = message.sender.id === myId;
              const avatarSrc = mine
                ? (sessionUser?.avatarUrl || message.sender.avatarUrl)
                : conversation?.boutique.logoImage;
              return (
                <div
                  key={message.id}
                  className={cn("flex items-end gap-2", mine ? "justify-end" : "justify-start")}
                >
                  {!mine && (
                    <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-midnight-950 font-display text-[10px] font-bold text-gold-300 shadow-xs">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(conversation?.boutique.name ?? "B")
                      )}
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm sm:max-w-[70%]",
                      mine
                        ? "rounded-br-md bg-midnight-950 text-ivory-50"
                        : "rounded-bl-md border border-midnight-950/8 bg-white text-midnight-950",
                    )}
                  >
                    {!mine && (
                      <p className="mb-1 font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-gold-600">
                        {conversation?.boutique.name ?? "Vendeur"}
                      </p>
                    )}
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    <p
                      className={cn(
                        "mt-1 text-right font-mono text-[9px]",
                        mine ? "text-ivory-50/50" : "text-midnight-950/35",
                      )}
                    >
                      {bubbleTime(message.createdAt)}
                    </p>
                  </div>
                  {mine && (
                    <span className="mb-0.5 flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gold-400 font-display text-[10px] font-bold text-midnight-950 shadow-xs">
                      {avatarSrc ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(sessionUser?.name ?? "C")
                      )}
                    </span>
                  )}
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {/* Propositions de messages rapides au-dessus du formulaire */}
        {suggestions.length > 0 && (
          <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]">
            <span className="shrink-0 rounded-lg bg-gold-400/15 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wider text-gold-800">
              Suggestions
            </span>
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setDraft(s);
                  inputRef.current?.focus();
                }}
                className="shrink-0 cursor-pointer rounded-full border border-midnight-950/10 bg-white/95 px-3 py-1 text-xs text-midnight-950/75 shadow-2xs transition-all hover:border-gold-400/60 hover:bg-gold-400/10 hover:text-midnight-950 active:scale-[0.98]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Saisie */}
        <form
          onSubmit={handleSend}
          className="mt-1.5 flex items-center gap-2 rounded-2xl border border-midnight-950/12 bg-white p-2 shadow-xs focus-within:border-gold-400/60"
        >
          <input
            ref={inputRef}
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Écrivez ou complétez votre message…"
            aria-label="Votre message"
            maxLength={1000}
            className="h-11 min-w-0 flex-1 bg-transparent px-2 text-sm text-midnight-950 placeholder:text-midnight-950/35 focus:outline-none"
          />
          {draft && (
            <button
              type="button"
              onClick={() => {
                setDraft("");
                inputRef.current?.focus();
              }}
              className="cursor-pointer px-1.5 text-xs text-midnight-950/40 hover:text-midnight-950"
              title="Effacer le message"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            disabled={!draft.trim() || sending}
            aria-label="Envoyer le message"
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-xl bg-midnight-950 text-gold-300 transition-all hover:bg-gold-400 hover:text-midnight-950 disabled:cursor-not-allowed disabled:opacity-40 shadow-xs"
          >
            <IconSend className="h-4 w-4" />
          </button>
        </form>
      </div>

      <p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-midnight-950/35">
        Vos échanges sont privés et conservés sur la plateforme
      </p>
    </div>
  );
}
