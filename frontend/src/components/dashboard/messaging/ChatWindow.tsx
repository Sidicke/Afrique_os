"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/dashboard/ui/Avatar";
import { Icon } from "@/components/dashboard/icons";
import { messagingApi } from "@/lib/api";
import { MessageBubble } from "./MessageBubble";
import { conversationName } from "./ConversationList";
import { formatDay } from "./format";
import type { ApiConversation, ApiMessage } from "@/lib/api";
import type { SocketStatus } from "@/hooks/useMessaging";

interface ChatWindowProps {
  conversation: ApiConversation;
  messages: ApiMessage[];
  loading: boolean;
  socketStatus: SocketStatus;
  typingUserId: string | null;
  onSend: (content: string) => Promise<void>;
  onSetTyping: (isTyping: boolean) => void;
  /** Retour à la liste (mobile uniquement) */
  onBack?: () => void;
}

const STATUS_LABEL: Record<SocketStatus, { label: string; dot: string; text: string }> = {
  connected: { label: "En ligne", dot: "bg-green-500", text: "text-green-700" },
  connecting: { label: "Connexion…", dot: "bg-amber-400 animate-pulse", text: "text-amber-600" },
  offline: { label: "Hors ligne", dot: "bg-red-400", text: "text-red-500" },
};

/**
 * Fenêtre de chat — en-tête (client + boutique + statut socket), historique
 * défilant avec séparateurs de jour, indicateur de frappe, et composer avec
 * envoi au clavier (Entrée) + indicateur de frappe diffusé.
 */
export function ChatWindow({
  conversation,
  messages,
  loading,
  socketStatus,
  typingUserId,
  onSend,
  onSetTyping,
  onBack,
}: ChatWindowProps) {
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [discountPrice, setDiscountPrice] = useState("");
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Reste-t-on « collé » en bas ? (faux si l'utilisateur remonte lire) */
  const stickRef = useRef(true);

  const name = conversationName(conversation);
  const status = STATUS_LABEL[socketStatus];

  // Défilement automatique : seulement si l'utilisateur est déjà en bas — on
  // ne l'arrache jamais à sa lecture d'historique. (Au premier chargement,
  // stickRef part à true → on ouvre bien sur le dernier message.)
  useEffect(() => {
    const el = listRef.current;
    if (el && stickRef.current) el.scrollTop = el.scrollHeight;
  }, [messages, typingUserId, loading]);

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    stickRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  // Nettoyage de l'indicateur de frappe au démontage
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
      onSetTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Frappe : émission différée de l'indicateur (extinction après 1,5 s) */
  const handleChange = (value: string) => {
    setDraft(value);
    if (value.trim()) {
      onSetTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => onSetTyping(false), 1500);
    } else {
      onSetTyping(false);
    }
  };

  
  const handleApplyDiscount = async () => {
    const price = parseInt(discountPrice.replace(/\D/g, ""), 10);
    if (!price || applyingDiscount) return;
    setApplyingDiscount(true);
    try {
      await messagingApi.applyDiscount(conversation.id, price);
      setDiscountPrice("");
      // Force reload by faking a message or letting polling pick it up
    } catch (err) {
      alert("Erreur lors de l'application de la réduction: " + err);
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handleSend = async () => {
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    setSendError(null);
    onSetTyping(false);
    try {
      await onSend(content);
      setDraft("");
      // Le message confirmé doit être visible : on se recale en bas
      stickRef.current = true;
    } catch (err) {
      setSendError(
        err instanceof Error ? err.message : "Envoi impossible, réessayez."
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-sm shadow-ink-950/[0.03]">
      {/* En-tête */}
      <div className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-950 lg:hidden"
            aria-label="Retour à la liste"
          >
            <Icon name="chevronLeft" size={18} />
          </button>
        )}
        <Avatar name={name} src={conversation.user?.avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink-950">{name}</p>
          <p className="flex items-center gap-1.5 truncate text-xs text-ink-500">
            <span className="truncate">{conversation.clientPhone}</span>
            <span aria-hidden="true">·</span>
            <span className="truncate text-gold-strong">{conversation.boutique.name}</span>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[10px] font-semibold",
            status.text
          )}
          title={socketStatus === "offline" ? "Repli REST actif" : undefined}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", status.dot)} />
          {status.label}
        </span>
      </div>

      
      {conversation.productId && !conversation.orderId && (
        <div className="flex items-center justify-between border-b border-line bg-gold-400/10 px-4 py-2 text-sm">
          <div>
            <span className="font-semibold text-gold-600">Offre spéciale</span>
            <p className="text-xs text-ink-600">Négociation pour: {conversation.productName}</p>
            {conversation.agreedPrice && <p className="text-xs font-bold text-green-600 mt-0.5">Prix convenu: {conversation.agreedPrice} FCFA</p>}
          </div>
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              placeholder="Nouveau prix (FCFA)" 
              value={discountPrice}
              onChange={(e) => setDiscountPrice(e.target.value.replace(/\D/g, ""))}
              className="w-32 rounded-lg border border-line px-2 py-1 text-xs"
              disabled={applyingDiscount}
            />
            <button
              onClick={handleApplyDiscount}
              disabled={applyingDiscount || !discountPrice}
              className="rounded-lg bg-midnight-950 px-3 py-1 text-xs font-semibold text-gold-300 disabled:opacity-50"
            >
              Proposer
            </button>
          </div>
        </div>
      )}

      {/* Historique */}
      <div
        ref={listRef}
        onScroll={handleScroll}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain bg-ink-50/60 p-4"
      >
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}
              >
                <div className="h-9 w-1/2 animate-pulse rounded-2xl bg-ink-100" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-dashed border-gold-soft bg-gold-wash/60 text-gold-mid">
              <Icon name="message" size={22} strokeWidth={1.5} />
            </span>
            <p className="font-display text-sm font-semibold text-ink-950">
              Aucun message
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-ink-500">
              Écrivez votre premier message pour prendre contact avec ce client.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message, i) => {
              const isOwn = message.senderRole === "VENDEUR";
              const dayChanged =
                i === 0 ||
                new Date(message.createdAt).toDateString() !==
                  new Date(messages[i - 1].createdAt).toDateString();
              return (
                <div key={message.id}>
                  {dayChanged && (
                    <div className="my-3 flex justify-center">
                      <span className="rounded-full border border-line bg-white px-2.5 py-1 font-mono text-[10px] font-medium text-ink-400">
                        {formatDay(message.createdAt)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={message}
                    isOwn={isOwn}
                    boutiqueLogo={conversation.boutique.logoImage}
                    clientAvatar={conversation.user?.avatarUrl}
                  />
                </div>
              );
            })}
            {typingUserId && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl rounded-bl-md border border-line bg-white px-3.5 py-2.5 text-ink-400">
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-300" />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-300" style={{ animationDelay: "0.15s" }} />
                  <span className="typing-dot h-1.5 w-1.5 rounded-full bg-ink-300" style={{ animationDelay: "0.3s" }} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-line bg-surface p-3">
        {sendError && (
          <p className="mb-2 flex items-center gap-1.5 text-xs text-red-600">
            <Icon name="alert" size={13} /> {sendError}
          </p>
        )}
        {socketStatus === "offline" && (
          <p className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-400">
            <Icon name="clock" size={12} /> Hors ligne : votre message sera envoyé par requête HTTP.
          </p>
        )}
        <div className="flex items-end gap-2">
          <textarea
            value={draft}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSend();
              }
            }}
            rows={1}
            placeholder="Écrivez votre message… (Entrée pour envoyer)"
            className="max-h-32 min-h-[42px] flex-1 resize-y rounded-xl border border-line bg-white px-3.5 py-2.5 text-sm text-ink-950 placeholder-ink-400 transition-colors focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
          />
          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!draft.trim() || sending}
            className="flex h-[42px] shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-blue-700 px-4 text-sm font-semibold text-white shadow-md shadow-blue-700/25 transition-all hover:bg-blue-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
            aria-label="Envoyer le message"
          >
            <Icon name="send" size={15} strokeWidth={2} />
            <span className="hidden sm:inline">{sending ? "Envoi…" : "Envoyer"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
