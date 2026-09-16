'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/lib/api/auth';
import { setSession } from '@/lib/api/session';

interface SocialAuthButtonsProps {
  mode?: 'login' | 'register';
  role?: 'CLIENT' | 'VENDEUR';
  shopName?: string;
  phone?: string;
  referralCode?: string;
  next?: string | null;
  onError?: (err: { title: string; message: string }) => void;
}

function destinationFor(role: string): string {
  switch (role) {
    case 'ADMIN':
      return '/admin';
    case 'VENDEUR':
      return '/dashboard';
    default:
      return '/espace-client';
  }
}

/**
 * Valide que la destination est un chemin relatif interne.
 * Empêche les open redirects vers des domaines tiers
 * (ex: ?next=https://evil.com).
 */
function safeDest(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  // Rejette les URLs absolues, les protocoles et les doubles slashes
  if (next.startsWith('//') || next.includes('://') || next.includes('\\')) {
    return fallback;
  }
  // N'accepte que les chemins relatifs commençant par /
  if (next.startsWith('/')) return next;
  return fallback;
}

export default function SocialAuthButtons({
  mode = 'login',
  role = 'CLIENT',
  shopName,
  phone,
  referralCode,
  next,
  onError,
}: SocialAuthButtonsProps) {
  const router = useRouter();
  const [busyProvider, setBusyProvider] = useState<'google' | 'facebook' | null>(null);

  const handleGoogleLogin = async () => {
    setBusyProvider('google');
    try {
      // Vérifie si le SDK Google Identity Services est déjà chargé
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const google = (window as any).google;
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

        if (clientId) {
          google.accounts.id.initialize({
            client_id: clientId,
            callback: async (response: { credential: string }) => {
              try {
                const auth = await authApi.googleAuth({
                  idToken: response.credential,
                  mode,
                  role,
                  shopName,
                  phone,
                  referralCode,
                });
                setSession({ accessToken: auth.accessToken, user: auth.user });
                router.push(safeDest(next, destinationFor(auth.user.role)));
              } catch (err: any) {
                onError?.({
                  title: 'Échec de connexion Google',
                  message: err.message || 'Impossible de se connecter avec Google.',
                });
                setBusyProvider(null);
              }
            },
          });
          google.accounts.id.prompt();
          return;
        }
      }

      // SDK Google non disponible — message d'erreur propre
      // (en développement uniquement, un prompt interactif peut être utile)
      if (process.env.NODE_ENV === 'development') {
        const mockToken = prompt(
          'DEV ONLY — Saisissez un ID Token Google ou appuyez sur OK pour simuler :',
          'demo_google_id_token'
        );
        if (!mockToken) {
          setBusyProvider(null);
          return;
        }
        const auth = await authApi.googleAuth({
          idToken: mockToken,
          mode,
          role,
          shopName,
          phone,
          referralCode,
        });
        setSession({ accessToken: auth.accessToken, user: auth.user });
        router.push(safeDest(next, destinationFor(auth.user.role)));
      } else {
        onError?.({
          title: 'Google indisponible',
          message: 'Le service de connexion Google n\'est pas disponible actuellement. Veuillez réessayer ou utiliser un autre moyen de connexion.',
        });
        setBusyProvider(null);
      }
    } catch (err: any) {
      onError?.({
        title: 'Connexion Google',
        message:
          err.message ||
          'Une erreur est survenue lors de la connexion avec votre compte Google.',
      });
      setBusyProvider(null);
    }
  };

  const handleFacebookLogin = async () => {
    setBusyProvider('facebook');
    try {
      if (typeof window !== 'undefined' && (window as any).FB) {
        const FB = (window as any).FB;
        const fbAppId = process.env.NEXT_PUBLIC_FACEBOOK_APP_ID || '';

        if (fbAppId) {
          // Initialisation sécurisée une seule fois
          if (!(window as any).__fbInitialized) {
            FB.init({
              appId: fbAppId,
              cookie: true,
              xfbml: false,
              version: 'v20.0',
            });
            (window as any).__fbInitialized = true;
          }

          FB.login(
            async (response: any) => {
              if (response.authResponse?.accessToken) {
                try {
                  const auth = await authApi.facebookAuth({
                    accessToken: response.authResponse.accessToken,
                    mode,
                    role,
                    shopName,
                    phone,
                    referralCode,
                  });
                  setSession({ accessToken: auth.accessToken, user: auth.user });
                  router.push(safeDest(next, destinationFor(auth.user.role)));
                } catch (err: any) {
                  onError?.({
                    title: 'Échec de connexion Facebook',
                    message: err.message || 'Impossible de se connecter avec Facebook.',
                  });
                  setBusyProvider(null);
                }
              } else {
                setBusyProvider(null);
              }
            },
            { scope: 'public_profile,email' }
          );
          return;
        }
      }

      // SDK Facebook non disponible — message d'erreur propre
      if (process.env.NODE_ENV === 'development') {
        const mockToken = prompt(
          'DEV ONLY — Saisissez un Access Token Facebook ou appuyez sur OK pour simuler :',
          'demo_facebook_access_token'
        );
        if (!mockToken) {
          setBusyProvider(null);
          return;
        }
        const auth = await authApi.facebookAuth({
          accessToken: mockToken,
          mode,
          role,
          shopName,
          phone,
          referralCode,
        });
        setSession({ accessToken: auth.accessToken, user: auth.user });
        router.push(safeDest(next, destinationFor(auth.user.role)));
      } else {
        onError?.({
          title: 'Facebook indisponible',
          message: 'Le service de connexion Facebook n\'est pas disponible actuellement. Veuillez réessayer ou utiliser un autre moyen de connexion.',
        });
        setBusyProvider(null);
      }
    } catch (err: any) {
      onError?.({
        title: 'Connexion Facebook',
        message:
          err.message ||
          'Une erreur est survenue lors de la connexion avec votre compte Facebook.',
      });
      setBusyProvider(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center" aria-hidden="true">
          <div className="w-full border-t border-line" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-surface px-4 text-[11px] font-semibold uppercase tracking-widest text-ink-400">
            Ou continuer avec
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={busyProvider !== null}
          className="relative flex h-12 w-full items-center justify-center rounded-xl border border-line bg-paper px-4 text-sm font-medium text-ink-800 shadow-sm transition-all hover:border-gold-soft hover:bg-gold-wash hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="absolute left-4 h-5 w-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3s.7 5.6 1.9 8l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span className="truncate">
            {busyProvider === 'google' ? 'Connexion en cours…' : 'Continuer avec Google'}
          </span>
        </button>

        <button
          type="button"
          onClick={handleFacebookLogin}
          disabled={busyProvider !== null}
          className="relative flex h-12 w-full items-center justify-center rounded-xl border border-line bg-paper px-4 text-sm font-medium text-ink-800 shadow-sm transition-all hover:border-[#1877F2]/30 hover:bg-[#1877F2]/5 hover:text-[#1877F2] hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
        >
          <svg className="absolute left-4 h-5 w-5 fill-[#1877F2]" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          <span className="truncate">
            {busyProvider === 'facebook' ? 'Connexion en cours…' : 'Continuer avec Facebook'}
          </span>
        </button>
      </div>
    </div>
  );
}
