/**
 * Couche API — Auth & Users
 */

import { apiFetch } from "./http";
import type {
  ApiAuthResponse,
  ApiMerchantProfile,
  ApiRegisterResponse,
} from "./types";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
  role?: "CLIENT" | "VENDEUR";
  shopName?: string;
  phone?: string;
}

export interface LoginInput {
  /** E-mail OU numéro de téléphone (les deux identifiants sont uniques) */
  identifier: string;
  password: string;
}

export const authApi = {
  /** Inscription — VENDEUR (défaut : crée la boutique PENDING) ou CLIENT */
  register(input: RegisterInput) {
    return apiFetch<ApiRegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Connexion (email ou téléphone) — accessToken + refresh en cookie httpOnly */
  login(input: LoginInput) {
    return apiFetch<ApiAuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /**
   * Inscription étape 2 → 3 : vérifie la disponibilité de l'e-mail/téléphone
   * puis envoie un code à 6 chiffres par e-mail.
   */
  sendRegisterCode(input: { email: string; phone?: string }) {
    return apiFetch<{ sent: boolean; expiresInMinutes: number }>(
      "/auth/register/send-code",
      { method: "POST", body: JSON.stringify(input) },
    );
  },

  /**
   * Inscription étape finale : mot de passe + code reçu par e-mail.
   * Crée le compte et ouvre directement la session.
   */
  completeRegistration(input: {
    name: string;
    email: string;
    password: string;
    code: string;
  referralCode?: string;
    role?: "CLIENT" | "VENDEUR";
    phone?: string;
  }) {
    return apiFetch<ApiAuthResponse>("/auth/register/complete", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Renouvellement de session via le cookie (utilisé par http.ts) */
  refresh() {
    return apiFetch<ApiAuthResponse>("/auth/refresh", { method: "POST" });
  },

  /** Déconnexion — révoque le refresh côté serveur */
  logout() {
    return apiFetch<{ success: boolean }>("/auth/logout", { method: "POST" });
  },

  /** Profil complet du vendeur connecté (MerchantProfile) */
  me() {
    return apiFetch<ApiMerchantProfile>("/users/me");
  },

  /** Demande d'OTP pour réinitialiser le mot de passe */
  forgotPassword(input: { email: string }) {
    return apiFetch<{ success: boolean }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Changement direct de mot de passe (utilisateur connecté) */
  changePassword(input: { currentPassword: string; newPassword: string }) {
    return apiFetch<{ success: boolean }>("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  /** Vérifie l'OTP et définit le nouveau mot de passe */
  resetPassword(input: { email: string; code: string; newPassword: string }) {
    return apiFetch<{ success: boolean }>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
};
