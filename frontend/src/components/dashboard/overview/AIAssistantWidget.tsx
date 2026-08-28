"use client";

import { useState } from "react";
import { DashboardCard, CardHeader } from "@/components/dashboard/ui/DashboardCard";
import { Icon } from "@/components/dashboard/icons";

export default function AIAssistantWidget() {
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; text: string }>>([
    {
      role: "assistant",
      text: "Bonjour Awa ! Vos ventes de Wax Bazin ont grimpé de 24% cette semaine à Abidjan. Souhaitez-vous générer un message de relance pour vos clients fidèles ?",
    },
  ]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    const userText = prompt;
    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setPrompt("");

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `Analyse effectuée pour "${userText}" : Voici une suggestion de message optimisé avec vos prix en FCFA prêt à être envoyé.`,
        },
      ]);
    }, 600);
  };

  return (
    <DashboardCard className="flex flex-col justify-between border-gold-soft bg-gradient-to-br from-gold-wash/70 via-surface to-ink-50 p-6 shadow-lg shadow-gold-mid/10">
      <CardHeader
        title={
          <span className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-gold-soft bg-surface font-display text-xs font-bold text-gold-strong shadow-sm">
              AI
            </span>
            <span>
              <span className="block font-display text-sm font-semibold text-ink-950">Assistant Commercial OS</span>
              <span className="block font-mono text-[10px] text-gold-strong">
                Intelligence artificielle vendeur
              </span>
            </span>
          </span>
        }
        action={
          <span className="flex h-2 w-2 animate-pulse rounded-full bg-green-700" />
        }
      />

      {/* Message Chat Window */}
      <div className="my-4 flex max-h-48 flex-col gap-3 overflow-y-auto pr-1">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`rounded-xl p-3 text-xs leading-relaxed ${
              m.role === "assistant"
                ? "border border-line bg-surface text-ink-800 shadow-sm"
                : "ml-6 bg-ink-950 font-medium text-white"
            }`}
          >
            {m.text}
          </div>
        ))}
      </div>

      {/* Input Box */}
      <form onSubmit={handleSend} className="relative mt-2">
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Poser une question à l'Assistant OS..."
          className="w-full rounded-xl border border-line bg-surface py-2.5 pl-4 pr-10 text-xs text-ink-950 placeholder-ink-400 shadow-sm focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-100"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg bg-blue-600 text-white transition-transform hover:bg-blue-700 hover:scale-105 active:scale-95"
          aria-label="Envoyer à l'assistant"
        >
          <Icon name="send" size={13} strokeWidth={2} />
        </button>
      </form>
    </DashboardCard>
  );
}
