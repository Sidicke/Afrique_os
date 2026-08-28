'use client';

import { useState } from 'react';
import { newsletterSubscribe } from '@/services/newsletterService';
import { useCatalogueStore } from '@/lib/useCatalogueStore';
import { useShopConfig } from '@/lib/useShopConfig';

type Status = 'idle' | 'loading' | 'success' | 'error';

export function Newsletter() {
  const config = useShopConfig();
  const catalogue = useCatalogueStore();
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');

  const slug = catalogue.boutiqueSlug ?? 'aziz-tech';

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setStatus('error');
      setError('Merci d’indiquer une adresse email valide.');
      return;
    }
    setStatus('loading');
    setError('');
    try {
      await newsletterSubscribe(slug, email.trim());
      setStatus('success');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setError(
        err instanceof Error ? err.message : 'Inscription impossible pour le moment.'
      );
    }
  };

  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="bg-[#1a1a1a] rounded-3xl p-6 sm:p-10 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12">
          <div className="w-full md:w-1/2">
            <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-8 leading-tight">
              Prêt à découvrir<br />nos nouveautés ?
            </h2>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Votre adresse e-mail"
                className="flex-1 bg-white/10 text-white placeholder-gray-400 rounded-full px-6 py-4 focus:outline-none focus:ring-2 focus:ring-white/20"
              />
              <button
                type="submit"
                disabled={status === 'loading'}
                className="bg-terracotta text-white font-semibold rounded-full px-8 py-4 hover:bg-terracotta/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'loading' ? 'Envoi…' : 'Envoyer'}
              </button>
            </form>
            {status === 'success' && (
              <p role="status" className="mt-3 text-sm font-medium text-emerald-400">
                Merci ! Vous êtes bien inscrit(e) à la newsletter.
              </p>
            )}
            {status === 'error' && (
              <p role="alert" className="mt-3 text-sm font-medium text-red-400">
                {error}
              </p>
            )}
          </div>

          <div className="w-full md:w-1/2 md:pl-12">
            <h3 className="text-2xl font-bold text-white mb-4">
              {config.name}
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Inscrivez-vous pour recevoir nos nouveautés, promotions exclusives et conseils tech directement dans votre boîte mail.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
