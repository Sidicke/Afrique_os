"use client";

import { useState } from "react";

export default function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("general");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) return;

    setLoading(true);
    // Simulation d'envoi propre avec feedback visuel
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  if (submitted) {
    return (
      <div className="flex h-full flex-col items-center justify-center py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-african-green/15 text-african-green">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="mt-4 font-display text-xl font-bold text-midnight-950">
          Message bien transmis !
        </h3>
        <p className="mt-2 max-w-sm text-xs sm:text-sm text-ink-600">
          Merci {name}, notre équipe a bien reçu votre demande et reviendra vers vous à l&apos;adresse <strong>{email}</strong> sous 24 heures.
        </p>
        <button
          type="button"
          onClick={() => {
            setSubmitted(false);
            setMessage("");
          }}
          className="mt-6 rounded-full border border-midnight-950/15 bg-white px-5 py-2 text-xs font-bold text-midnight-950 hover:bg-gold-50"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <h2 className="font-display text-lg font-bold text-midnight-950">
          Envoyez-nous un message
        </h2>
        <p className="mt-1 text-xs text-ink-500">
          Remplissez les champs ci-dessous et notre équipe vous recontactera.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-name" className="block text-xs font-semibold text-midnight-950">
            Votre nom complet *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex. Awa Traoré"
            className="mt-1.5 w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-midnight-950 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
          />
        </div>

        <div>
          <label htmlFor="contact-email" className="block text-xs font-semibold text-midnight-950">
            Adresse e-mail *
          </label>
          <input
            id="contact-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="awa@exemple.com"
            className="mt-1.5 w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-midnight-950 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact-subject" className="block text-xs font-semibold text-midnight-950">
          Objet de votre demande
        </label>
        <select
          id="contact-subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="mt-1.5 w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-midnight-950 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-400/20"
        >
          <option value="general">Question générale / Découverte</option>
          <option value="enterprise">Formule Entreprise &amp; Multi-boutiques</option>
          <option value="seller_support">Aide pour vendeurs</option>
          <option value="order">Suivi d&apos;une commande</option>
          <option value="partnership">Partenariat ou intégration technique</option>
        </select>
      </div>

      <div>
        <label htmlFor="contact-message" className="block text-xs font-semibold text-midnight-950">
          Votre message *
        </label>
        <textarea
          id="contact-message"
          required
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Dites-nous en plus sur vos besoins, vos questions ou votre activité..."
          className="mt-1.5 w-full rounded-xl border border-midnight-950/15 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-midnight-950 placeholder:text-ink-400 focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-400/20 resize-none"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-midnight-950 py-3 text-xs sm:text-sm font-bold text-gold-300 transition-colors hover:bg-midnight-800 disabled:opacity-50"
      >
        {loading ? "Envoi en cours..." : "Envoyer ma demande"}
      </button>

      <p className="text-[11px] text-center text-ink-400">
        Vos données restent confidentielles et ne sont jamais transmises à des tiers.
      </p>
    </form>
  );
}
