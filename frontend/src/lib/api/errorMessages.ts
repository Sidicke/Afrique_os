import { ApiError } from "./http";

/**
 * Traduit les erreurs API brutes en messages professionnels et actionnables :
 * un titre court (ce qui s'est passé) + un message (quoi faire maintenant).
 */

export interface FriendlyError {
  title: string;
  message: string;
}

/** Détecte la mention e-mail / téléphone / code dans le message serveur */
function mentions(
  message: string,
  what: "email" | "phone" | "code",
): boolean {
  const m = message.toLowerCase();
  if (what === "email") return m.includes("e-mail") || m.includes("email");
  if (what === "phone") return m.includes("téléphone") || m.includes("telephone") || m.includes("numéro");
  return m.includes("code");
}

/**
 * Convertit une erreur inconnue en message pro.
 * À utiliser partout dans les formulaires auth à la place de `err.message`.
 */
export function friendlyAuthError(err: unknown): FriendlyError {
  // ===== Erreur API structurée (backend) =====
  if (err instanceof ApiError) {
    const status = err.status ?? 0;
    const serverMessage = err.message ?? "";

    switch (status) {
      case 409: // Conflit — compte existant
        if (mentions(serverMessage, "phone")) {
          return {
            title: "Numéro déjà utilisé",
            message:
              "Un compte existe déjà avec ce numéro de téléphone. Connectez-vous avec ce numéro, ou utilisez-en un autre.",
          };
        }
        return {
          title: "Adresse déjà utilisée",
          message:
            "Un compte existe déjà avec cette adresse e-mail. Connectez-vous plutôt, ou choisissez une autre adresse.",
        };

      case 429: // Trop de requêtes
        return {
          title: "Trop de tentatives",
          message:
            "Par mesure de sécurité, veuillez patienter quelques instants avant de réessayer.",
        };

      case 401: // Identifiants invalides
        return {
          title: "Identifiants incorrects",
          message:
            "L'e-mail (ou le téléphone), le mot de passe ou le code saisi est incorrect. Vérifiez puis réessayez.",
        };

      case 400: // Validation / code invalide
        if (
          mentions(serverMessage, "code") ||
          serverMessage.toLowerCase().includes("tentatives")
        ) {
          if (serverMessage.toLowerCase().includes("expir")) {
            return {
              title: "Code expiré",
              message:
                "Ce code n'est plus valable (10 minutes maximum). Cliquez sur « Renvoyer le code » pour en recevoir un nouveau.",
            };
          }
          if (serverMessage.toLowerCase().includes("trop de tentatives")) {
            return {
              title: "Trop d'essais",
              message:
                "Par sécurité, ce code est bloqué. Demandez un nouveau code pour continuer.",
            };
          }
          return {
            title: "Code incorrect",
            message:
              "Le code saisi ne correspond pas à celui envoyé par e-mail. Vérifiez les 6 chiffres et corrigez si besoin.",
          };
        }
        if (mentions(serverMessage, "email") && serverMessage.toLowerCase().includes("invalide")) {
          return {
            title: "Adresse e-mail invalide",
            message:
              "Vérifiez la saisie : il manque peut-être un « @ » ou le domaine (ex. awa@exemple.com).",
          };
        }
        return {
          title: "Informations incomplètes",
          message:
            "Certains champs sont invalides. Vérifiez chaque information puis réessayez.",
        };
    }

    // Erreur serveur connue mais non spécifique → on remonte le message s'il est propre
    if (status >= 500) {
      return {
        title: "Service momentanément indisponible",
        message:
          "Nos serveurs rencontrent un souci. Réessayez dans quelques instants : vos données restent en sécurité.",
      };
    }
    if (serverMessage) {
      return { title: "Action impossible", message: serverMessage };
    }
  }

  // ===== Pas de connexion au serveur =====
  if (err instanceof TypeError) {
    return {
      title: "Connexion impossible",
      message:
        "Vérifiez votre connexion internet puis réessayez. Si le problème persiste, nos services sont peut-être en maintenance.",
    };
  }

  // ===== Filet de sécurité =====
  return {
    title: "Une erreur est survenue",
    message:
      "Quelque chose s'est mal passé de notre côté. Réessayez ou contactez le support si besoin.",
  };
}
