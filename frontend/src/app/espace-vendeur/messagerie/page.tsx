"use client";

import { cn } from "@/lib/utils";
import { useMessaging } from "@/hooks/useMessaging";
import { PageHeader } from "@/components/dashboard/ui/PageHeader";
import { ConversationList } from "@/components/dashboard/messaging/ConversationList";
import { ChatWindow } from "@/components/dashboard/messaging/ChatWindow";
import { Icon } from "@/components/dashboard/icons";

/**
 * Messagerie vendeur — deux panneaux :
 *  - Desktop  : liste (colonne) + fenêtre de chat (zone principale)
 *  - Mobile   : liste OU chat selon qu'une conversation est ouverte
 */
export default function MessageriePage() {
  const messaging = useMessaging();
  const {
    conversations,
    loading,
    error,
    refresh,
    activeConversation,
    selectConversation,
    clearSelection,
    messages,
    messagesLoading,
    socketStatus,
    typingUserId,
    sendMessage,
    setTyping,
  } = messaging;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Ventes · Messagerie"
        title="Messagerie"
        description="Discutez en temps réel avec vos clients. Chaque demande de devis ou question depuis la vitrine arrive ici."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-ink-600 shadow-sm transition-colors hover:border-gold-mid hover:text-gold-strong"
          >
            <Icon name="refresh" size={13} /> Actualiser
          </button>
        }
      />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-100/60 px-4 py-3 text-sm text-red-600">
          <Icon name="alert" size={15} /> {error}
          <button
            type="button"
            onClick={() => void refresh()}
            className="ml-auto cursor-pointer font-semibold underline underline-offset-2"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Zone principale : liste + chat */}
      <div className="h-[calc(100dvh-15rem)] min-h-[460px]">
        <div className="grid h-full grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* Liste des conversations */}
          <div className={cn("min-h-0", activeConversation && "hidden lg:block")}>
            <ConversationList
              conversations={conversations}
              loading={loading}
              activeId={activeConversation?.id ?? null}
              onSelect={(id) => void selectConversation(id)}
            />
          </div>

          {/* Fenêtre de chat */}
          <div className={cn("min-h-0", !activeConversation && "hidden lg:block")}>
            {activeConversation ? (
              <ChatWindow
                key={activeConversation.id}
                conversation={activeConversation}
                messages={messages}
                loading={messagesLoading}
                socketStatus={socketStatus}
                typingUserId={typingUserId}
                onSend={sendMessage}
                onSetTyping={setTyping}
                onBack={clearSelection}
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line bg-surface/60 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-gold-soft bg-gold-wash/60 text-gold-mid">
                  <Icon name="message" size={28} strokeWidth={1.5} />
                </span>
                <div>
                  <p className="font-display text-base font-semibold text-ink-950">
                    Sélectionnez une conversation
                  </p>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-ink-500">
                    Les messages de vos clients s&apos;afficheront ici en temps réel.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
