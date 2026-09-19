"use client";

import Link from "next/link";
import { useState } from "react";
import { 
  ArrowLeft, Check, CircleAlert, Eye, EyeOff, Info, Lock,
  ShoppingCart, MessageSquare, ShieldCheck,
  Package, Tag,
  Store, LayoutDashboard, Banknote
} from "lucide-react";

interface AuthShellProps {
  eyebrow: string;
  title: React.ReactNode;
  subtitle: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Bandeau d'information sous le logo (ex. boutique fermée) */
  notice?: React.ReactNode;
  /** Le parcours choisi pour adapter le panneau marque */
  intent?: "general" | "acheter" | "vendre";
}

/**
 * Champ de saisie avec icône optionnelle — surface claire premium
 * (design system Papier & Or). Police agrandie (16px) pour le confort
 * de saisie et éviter le zoom auto sur mobile.
 *
 * L'icône est alignée verticalement, discrète au repos et prend la
 * couleur dorée quand le champ a le focus.
 */
export function AuthInput({
  icon,
  action,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  /** Icône lucide affichée à gauche du champ */
  icon?: React.ReactNode;
  /** Action à droite (ex. œil afficher/masquer) */
  action?: React.ReactNode;
}) {
  const input = (
    <input
      {...props}
      className={`peer w-full rounded-xl border border-line bg-surface py-3.5 text-base text-ink-950 placeholder-ink-300 shadow-sm transition-colors focus:border-gold-mid focus:outline-none focus:ring-2 focus:ring-gold-soft/50 disabled:bg-paper ${
        icon ? "pl-11" : "pl-4"
      } ${action ? "pr-12" : "pr-4"}`}
    />
  );

  if (!icon && !action) return input;

  return (
    <div className="relative">
      {/* L'icône suit l'input dans le DOM pour hériter de peer-focus */}
      {input}
      {icon && (
        <span
          className="pointer-events-none absolute left-4 top-1/2 flex -translate-y-1/2 items-center justify-center text-ink-300 transition-colors duration-200 peer-focus:text-gold-mid [&_svg]:h-[18px] [&_svg]:w-[18px]"
          aria-hidden="true"
        >
          {icon}
        </span>
      )}
      {action && (
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">{action}</span>
      )}
    </div>
  );
}

/**
 * Champ mot de passe avec bascule afficher/masquer (icône œil) —
 * réduit les erreurs de saisie sans nuire à la sécurité.
 */
export function AuthPasswordInput(
  props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">,
) {
  const [visible, setVisible] = useState(false);
  return (
    <AuthInput
      {...props}
      type={visible ? "text" : "password"}
      icon={<Lock aria-hidden="true" />}
      action={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          tabIndex={-1}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-gold-wash hover:text-ink-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-mid"
        >
          {visible ? (
            <EyeOff className="h-[18px] w-[18px]" aria-hidden="true" />
          ) : (
            <Eye className="h-[18px] w-[18px]" aria-hidden="true" />
          )}
        </button>
      }
    />
  );
}

/** Libellé au-dessus des champs — lisible et confortable */
export function AuthLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block font-mono text-xs font-semibold uppercase tracking-[0.15em] text-ink-600"
    >
      {children}
    </label>
  );
}

/**
 * Alerte de formulaire — professionnelle et illustrée : icône contextuelle,
 * titre en gras, message explicite avec la marche à suivre.
 */
const ALERT_VARIANTS = {
  error: {
    wrap: "border-red-200 bg-red-50",
    iconWrap: "bg-red-100 text-red-600",
    title: "text-red-700",
    text: "text-red-600/90",
  },
  info: {
    wrap: "border-blue-200 bg-blue-50",
    iconWrap: "bg-blue-100 text-blue-600",
    title: "text-blue-700",
    text: "text-blue-600/90",
  },
  success: {
    wrap: "border-green-200 bg-green-50",
    iconWrap: "bg-green-100 text-green-700",
    title: "text-green-800",
    text: "text-green-700/90",
  },
} as const;

export function AuthError({
  message,
  title = "Une erreur est survenue",
  variant = "error",
}: {
  /** Message explicite : ce qui s'est passé + quoi faire */
  message: string;
  /** Titre court du problème */
  title?: string;
  /** Style de l'alerte */
  variant?: keyof typeof ALERT_VARIANTS;
}) {
  const v = ALERT_VARIANTS[variant];
  return (
    <div role="alert" className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${v.wrap}`}>
      <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${v.iconWrap}`}>
        {variant === "success" ? (
          <Check className="h-[18px] w-[18px]" aria-hidden="true" />
        ) : variant === "info" ? (
          <Info className="h-[18px] w-[18px]" aria-hidden="true" />
        ) : (
          <CircleAlert className="h-[18px] w-[18px]" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0">
        <p className={`text-sm font-bold ${v.title}`}>{title}</p>
        <p className={`mt-0.5 text-sm leading-relaxed ${v.text}`}>{message}</p>
      </div>
    </div>
  );
}

/**
 * Case d'acceptation des conditions — obligatoire avant l'inscription.
 * Erreur inline (rouge) quand on tente de soumettre sans cocher.
 */
export function AuthCheckbox({
  checked,
  onChange,
  error,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: boolean;
}) {
  return (
    <div>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={error || undefined}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 cursor-pointer rounded border-line bg-surface accent-gold-mid focus:outline-none focus:ring-2 focus:ring-gold-soft"
        />
        <span className="text-sm leading-relaxed text-ink-600">
          J&apos;accepte les{" "}
          <span className="font-medium text-gold-strong underline underline-offset-4">
            conditions d&apos;utilisation
          </span>{" "}
          et la{" "}
          <span className="font-medium text-gold-strong underline underline-offset-4">
            politique de confidentialité
          </span>
          .
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-1 text-sm font-medium text-red-600">
          Veuillez accepter les conditions pour continuer.
        </p>
      )}
    </div>
  );
}

/** Indicateur de progression des étapes — fil conducteur visuel du parcours */
export function AuthStepper({
  steps,
  current,
}: {
  /** Libellés des étapes, dans l'ordre */
  steps: string[];
  /** Index de l'étape courante (0-based) */
  current: number;
}) {
  return (
    <ol className="mb-7 flex items-center gap-2" aria-label={`Étape ${current + 1} sur ${steps.length}`}>
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2 last:flex-none">
            <div className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs font-bold transition-colors ${
                  done
                    ? "bg-gold-strong text-midnight-950"
                    : active
                      ? "bg-midnight-950 text-ivory-50 ring-4 ring-gold-wash"
                      : "border border-line bg-surface text-ink-400"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`hidden font-mono text-[10px] uppercase tracking-[0.14em] sm:inline ${
                  active ? "text-ink-950 font-bold" : done ? "text-gold-strong" : "text-ink-400"
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <span
                className={`h-px flex-1 ${done ? "bg-gold-strong" : "bg-line"}`}
                aria-hidden="true"
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Panneau marque de l'authentification (desktop uniquement) : logo, headline
 * et points forts — dynamique selon l'intention de l'utilisateur.
 * Sur mobile, seul le formulaire est affiché (split désactivé).
 */
function AuthBrandPanel({ intent = "general" }: { intent?: "general" | "acheter" | "vendre" }) {
  const content = {
    general: {
      headline: "Le commerce africain,",
      highlight: "sans friction.",
      desc: "Achetez en quelques clics auprès de boutiques vérifiées, discutez directement avec les vendeurs et suivez vos commandes en temps réel.",
      points: [
        {
          title: "Achetez sans compte",
          desc: "Commandez et payez en quelques clics, sans inscription obligatoire.",
          icon: <ShoppingCart className="h-4 w-4" />
        },
        {
          title: "Discutez avec les boutiques",
          desc: "Messagerie intégrée, réponses directes des vendeurs.",
          icon: <MessageSquare className="h-4 w-4" />
        },
        {
          title: "Boutiques vérifiées",
          desc: "Le badge ✓ vous garantit des commerces de confiance.",
          icon: <ShieldCheck className="h-4 w-4" />
        }
      ],
      quote: "« Une expérience aussi simple qu'une boutique, avec la profondeur d'un vrai marché. »"
    },
    acheter: {
      headline: "Trouvez tout",
      highlight: "simplement.",
      desc: "Accédez à des centaines de commerces locaux, regroupez vos achats et profitez d'une expérience d'achat fluide et sécurisée.",
      points: [
        {
          title: "Paiement sécurisé",
          desc: "Vos transactions sont protégées, payez comme vous voulez.",
          icon: <Lock className="h-4 w-4" />
        },
        {
          title: "Suivi en temps réel",
          desc: "De la préparation à la livraison, vous savez toujours où en est votre colis.",
          icon: <Package className="h-4 w-4" />
        },
        {
          title: "Promotions exclusives",
          desc: "Profitez des meilleures offres directement depuis les boutiques.",
          icon: <Tag className="h-4 w-4" />
        }
      ],
      quote: "« Je trouve exactement ce dont j'ai besoin, et je discute avec le vendeur avant d'acheter. »"
    },
    vendre: {
      headline: "Votre commerce,",
      highlight: "propulsé.",
      desc: "Créez votre boutique en 3 minutes, ajoutez vos produits et commencez à recevoir des commandes immédiatement.",
      points: [
        {
          title: "Vitrine professionnelle",
          desc: "Un espace optimisé pour vendre, adapté à votre image de marque.",
          icon: <Store className="h-4 w-4" />
        },
        {
          title: "Gestion centralisée",
          desc: "Commandes, stocks, clients : tout est dans votre tableau de bord.",
          icon: <LayoutDashboard className="h-4 w-4" />
        },
        {
          title: "Paiements sans délai",
          desc: "Vous recevez votre argent directement, sans intermédiaire complexe.",
          icon: <Banknote className="h-4 w-4" />
        }
      ],
      quote: "« Depuis que j'ai ma vitrine ici, la gestion de mes commandes est devenue un jeu d'enfant. »"
    }
  };

  const current = content[intent];

  return (
    <aside
      className="relative hidden flex-col justify-between overflow-hidden border-r border-line p-8 lg:flex xl:p-12"
      style={{ background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)" }}
    >
      {/* Texture dorée discrète */}
      <div className="pointer-events-none absolute inset-0 gold-grid opacity-25" aria-hidden="true" />

      <div className="relative">
        {/* Logo */}
        <Link href="/" className="inline-flex items-center gap-3" aria-label="ZennShop (accueil)">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-400/40 bg-gold-400/10 font-display text-base font-bold text-gold-300">
            ZS
          </span>
          <span className="font-display text-xl font-bold tracking-tight text-white">
            Zenn<span className="text-gold-400">Shop</span>
          </span>
        </Link>

        {/* Message clé */}
        <h2 className="mt-10 font-display text-3xl font-bold leading-tight xl:text-4xl text-white">
          {current.headline}
          <br />
          <span className="text-gold-strong">{current.highlight}</span>
        </h2>
        <p className="mt-4 max-w-sm text-base leading-relaxed text-ink-300">
          {current.desc}
        </p>

        {/* Points forts */}
        <ul className="mt-10 space-y-5">
          {current.points.map((point, i) => (
            <li key={i} className="flex items-start gap-3.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gold-wash text-gold-strong ring-1 ring-gold-soft">
                {point.icon}
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{point.title}</p>
                <p className="text-sm text-ink-400">{point.desc}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Citation */}
      <figure className="relative mt-10 rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
        <blockquote className="text-base italic leading-relaxed text-ink-200">
          {current.quote}
        </blockquote>
        <figcaption className="mt-3 font-mono text-[10px] uppercase tracking-[0.18em] text-gold-strong">
          ZennShop
        </figcaption>
      </figure>
    </aside>
  );
}

/** Coquille premium claire des pages Connexion / Inscription / Onboarding */
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  notice,
  intent = "general",
}: AuthShellProps) {
  return (
    <main id="main-content" className="relative flex min-h-screen items-center justify-center overflow-hidden bg-paper px-4 py-10 sm:px-6">
      {/* Halo or très doux */}
      <div
        className="pointer-events-none absolute -top-32 left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full opacity-60 blur-[120px]"
        style={{ background: "radial-gradient(ellipse at center, rgba(196,182,151,0.18) 0%, transparent 70%)" }}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-[2rem] border border-line bg-surface shadow-xl shadow-ink-950/5 lg:grid-cols-2">
          {/* Panneau marque (desktop) */}
          <AuthBrandPanel intent={intent} />

          {/* Formulaire */}
          <div className="relative px-6 py-10 sm:px-10 lg:py-14">
            {/* Logo mobile (le panneau marque est masqué sur <lg) */}
            <Link
              href="/"
              className="mb-8 flex items-center gap-3 lg:hidden"
              aria-label="ZennShop (accueil)"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold-400/40 bg-midnight-950 font-display text-sm font-bold text-gold-300">
                ZS
              </span>
              <span className="font-display text-lg font-bold tracking-tight text-ink-950">
                Zenn<span className="text-gold-600">Shop</span>
              </span>
            </Link>

            {notice && <div className="mb-5">{notice}</div>}

            <p className="font-mono text-xs uppercase tracking-[0.22em] text-gold-strong">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold leading-tight text-ink-950 sm:text-[2rem]">
              {title}
            </h1>
            <p className="mt-2 text-base leading-relaxed text-ink-600">{subtitle}</p>
            <div className="mt-7">{children}</div>
            {footer && <div className="mt-6 text-center text-base text-ink-600">{footer}</div>}
          </div>
        </div>
      </div>
    </main>
  );
}

/** Bouton de soumission principal — bleu nuit (identité), pleine largeur */
export function AuthSubmit({
  children,
  busy,
}: {
  children: React.ReactNode;
  busy?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="inline-flex min-h-[52px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-midnight-950 px-6 py-3.5 text-base font-semibold text-ivory-50 shadow-lg shadow-ink-950/15 transition-all duration-300 hover:-translate-y-0.5 hover:bg-midnight-900 hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {busy ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-ivory-50/30 border-t-ivory-50" />
          Un instant…
        </>
      ) : (
        children
      )}
    </button>
  );
}

/** Bouton secondaire contour (retour, étapes…) */
export function AuthBackButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-700 transition-all hover:-translate-y-0.5 hover:border-gold-soft hover:bg-gold-wash hover:text-ink-950 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Retour
    </button>
  );
}
