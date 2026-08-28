"use client";

import { cn } from "@/lib/utils";
import { Icon } from "@/components/dashboard/icons";
import type { ApiMessage } from "@/lib/api";
import { formatTime } from "./format";

import { Avatar } from "@/components/dashboard/ui/Avatar";

interface MessageBubbleProps {
  message: ApiMessage;
  /** Vrai si le message a été émis par l'utilisateur connecté (le vendeur) */
  isOwn: boolean;
  /** Logo de la boutique pour le vendeur */
  boutiqueLogo?: string | null;
  /** Photo de profil du client */
  clientAvatar?: string | null;
}

/**
 * Bulle de message — alignée à droite (vendeur avec logo boutique) ou à gauche (client avec photo profil),
 * heure locale + coche « lu » pour les messages émis.
 */
export function MessageBubble({ message, isOwn, boutiqueLogo, clientAvatar }: MessageBubbleProps) {
  const avatarUrl = isOwn ? boutiqueLogo : (message.sender.avatarUrl || clientAvatar);
  const senderName = isOwn ? "Boutique" : (message.sender.name || "Client");

  return (
    <div className={cn("flex w-full items-end gap-2", isOwn ? "justify-end" : "justify-start")}>
      {!isOwn && (
        <Avatar
          name={senderName}
          src={avatarUrl}
          size="sm"
          className="mb-0.5 shrink-0 shadow-xs"
        />
      )}

      <div
        className={cn(
          "max-w-[78%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
          isOwn
            ? "rounded-br-md bg-blue-700 text-white"
            : "rounded-bl-md border border-line bg-white text-ink-800"
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-relaxed">
          {message.content}
        </p>
        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[10px]",
            isOwn ? "text-blue-100/80" : "text-ink-400"
          )}
        >
          <span>{formatTime(message.createdAt)}</span>
          {isOwn && message.readAt && (
            <span className="inline-flex items-center gap-0.5">
              <Icon name="check" size={11} strokeWidth={2.2} /> Lu
            </span>
          )}
        </div>
      </div>

      {isOwn && (
        <Avatar
          name={senderName}
          src={avatarUrl}
          size="sm"
          className="mb-0.5 shrink-0 shadow-xs"
        />
      )}
    </div>
  );
}
