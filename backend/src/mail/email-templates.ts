/**
 * ZennShop — Système d'E-mails Transactionnels & d'Activité (Édition Soft & Premium 60·30·10).
 *
 * Architecture chromatique stricte 60 / 30 / 10 :
 * - 60 % Dominant (Blanc & Ivoire doux : #FFFFFF, #F7F6F2) -> Clarté, respiration, douceur visuelle.
 * - 30 % Secondaire (Encre Nuit & Ardoise : #0B1626, #475569, surface #FAF8F4) -> Lisibilité & structure.
 * - 10 % Accent (Or ZennShop : #8F7C59, #D8CCB8) -> Détails précieux (logo, sur-titre, liseré).
 *
 * Conception Mobile-First (100% compatible Gmail iOS/Android, Apple Mail, Outlook) :
 * - Styles inline calibrés pour les écrans mobiles (320px–390px) avec enrichissement desktop.
 * - Textes courts, chaleureux et directs (un seul bloc central par e-mail, zéro surcharge).
 * - En-tête et signature utilisant le logo horizontal officiel « [Z-Chariot]ennShop ».
 */

export type MailChannel = 'system' | 'activity';

const C = {
  // 60 % — Surfaces claires & respirantes
  canvas: '#F6F5F1',
  white: '#FFFFFF',
  softBox: '#FAF8F4',

  // 30 % — Typographie & structure Bleu Nuit / Ardoise
  midnight: '#0B1626',
  inkBody: '#3B4758',
  inkMuted: '#6E7C8F',
  inkLight: '#94A1B2',
  line: '#EBE8E0',

  // 10 % — Touches d'Or ZennShop & micro-accents sémantiques doux
  gold: '#8F7C59',
  goldLight: '#D5C7AE',
  goldSoftBg: '#F5F0E6',
  green: '#166548',
  greenSoftBg: '#EFF8F3',
  red: '#A83838',
  redSoftBg: '#FDF3F3',
  amber: '#8F5E08',
  amberSoftBg: '#FFF8EB',
} as const;

const FONT_SERIF = `'Cormorant Garamond',Georgia,'Times New Roman',serif`;
const FONT_SANS = `'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const FONT_MONO = `'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace`;

const BRAND_NAME = 'ZennShop';
const DEFAULT_PLATFORM_URL = process.env.FRONTEND_URL || 'http://localhost:3001';

/** Échappe le HTML pour éviter toute injection XSS dans le corps du mail */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Logo horizontal officiel « [Z-Chariot]ennShop » où le chariot forme le « Z » initial.
 * En aperçu web/tests : SVG inline + texte « ennShop ».
 * Lors de l'envoi SMTP (Gmail/Outlook) : remplacé automatiquement par l'image PNG Retina
 * officielle `zennshop-email-logo.png` en pièce jointe inline (`cid:zennshop-logo@zennshop.com`).
 */
function brandHorizontalLogo(heightPx: number, tag: 'header' | 'signature'): string {
  const symSize = Math.round(heightPx * 0.92);
  const fontSize = Math.round(heightPx * 0.82);
  const marker = tag === 'header' ? 'ZS_LOGO_HEADER' : 'ZS_LOGO_SIGNATURE';
  return `<!--${marker}_START--><span data-zs-lockup="${tag}" style="display:inline-block;vertical-align:middle;line-height:1;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-table;vertical-align:middle;">
      <tr>
        <td valign="middle" style="padding-right:1px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="${symSize}" height="${symSize}" style="display:block;border:0;">
            <path d="M 20.00 36.00 A 12.00 12.00 0 0 1 32.00 24.00 L 58.23 24.00 A 10.00 10.00 0 0 1 66.89 29.00 L 76.12 45.00 A 6.00 6.00 0 0 0 81.32 48.00 L 222.00 48.00 A 12.00 12.00 0 0 1 234.00 60.00 L 234.00 69.07 A 10.00 10.00 0 0 1 230.09 77.00 L 131.34 152.83 A 4.00 4.00 0 0 0 133.78 160.00 L 214.00 160.00 A 14.00 14.00 0 0 1 228.00 174.00 L 228.00 178.00 A 14.00 14.00 0 0 1 214.00 192.00 L 73.52 192.00 A 11.52 11.52 0 0 1 62.00 180.48 L 62.00 172.93 A 10.00 10.00 0 0 1 65.91 165.00 L 164.66 89.17 A 4.00 4.00 0 0 0 162.22 82.00 L 63.77 82.00 A 10.00 10.00 0 0 1 55.11 77.00 L 45.87 61.00 A 6.00 6.00 0 0 0 40.68 58.00 L 31.59 58.00 A 11.59 11.59 0 0 1 20.00 46.41 Z" fill="${C.midnight}"/>
            <path d="M 44.70 104.07 A 8.00 8.00 0 0 1 52.43 94.00 L 123.95 94.00 A 5.00 5.00 0 0 1 126.99 102.97 L 80.65 138.55 A 7.00 7.00 0 0 1 76.38 140.00 L 62.00 140.00 A 10.00 10.00 0 0 1 52.34 132.59 Z" fill="${C.gold}"/>
            <path d="M 79.00 216.00 A 17.00 17.00 0 1 0 113.00 216.00 A 17.00 17.00 0 1 0 79.00 216.00 Z" fill="${C.gold}"/>
            <path d="M 179.00 216.00 A 17.00 17.00 0 1 0 213.00 216.00 A 17.00 17.00 0 1 0 179.00 216.00 Z" fill="${C.gold}"/>
          </svg>
        </td>
        <td valign="middle" style="font-family:${FONT_SERIF};font-size:${fontSize}px;font-weight:700;letter-spacing:-0.4px;line-height:1;">
          <span style="display:none;mso-hide:all;">Z</span><span style="color:${C.midnight};">enn</span><span style="color:${C.gold};">Shop</span>
        </td>
      </tr>
    </table>
  </span><!--${marker}_END-->`;
}

interface BrandLayoutInput {
  channel?: MailChannel;
  eyebrow?: string;
  title: string;
  preheader?: string;
  bodyHtml: string;
  cta?: { label: string; url: string };
  warmClosing?: string;
  footerNote?: string;
}

/**
 * Gabarit maître « Soft & Premium 60·30·10 » — Mobile-First :
 * - Styles de base pensés pour un affichage mobile fluide (padding 24px 20px).
 * - Enrichissement desktop via @media (min-width: 560px).
 */
export function brandLayout(input: BrandLayoutInput): string {
  const {
    channel = 'activity',
    eyebrow,
    title,
    preheader,
    bodyHtml,
    cta,
    warmClosing = 'Avec toute notre attention,',
    footerNote,
  } = input;

  const channelBadge = channel === 'system' ? 'Sécurité' : 'Activité';
  const channelFooter =
    channel === 'system' ? 'Compte & Sécurité' : 'Activité Plateforme';

  const ctaBlock = cta
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0 6px;">
        <tr>
          <td align="left">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" class="zs-cta-table">
              <tr>
                <td align="center" style="border-radius:10px;background-color:${C.midnight};">
                  <a href="${escapeHtml(cta.url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:13px 24px;font-family:${FONT_SANS};font-size:14px;font-weight:600;color:${C.white};text-decoration:none;letter-spacing:0.15px;">
                    ${escapeHtml(cta.label)} &nbsp;<span style="color:${C.goldLight};">→</span>
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>`
    : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,600;0,700;1,600&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    @media only screen and (min-width: 560px) {
      .zs-outer { padding: 32px 16px !important; }
      .zs-header { padding: 22px 34px !important; }
      .zs-body { padding: 30px 34px 26px !important; }
      .zs-footer { padding: 18px 34px !important; }
      .zs-h1 { font-size: 25px !important; }
    }
    @media only screen and (max-width: 480px) {
      .zs-cta-table { width: 100% !important; }
      .zs-cta-table a { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:${C.canvas};-webkit-font-smoothing:antialiased;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <!-- Préheader invisible -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;font-size:1px;line-height:1px;color:${C.canvas};">
    ${escapeHtml(preheader || title)}
  </div>

  <!-- Conteneur extérieur (60% Dominant : Ivoire très doux) -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="zs-outer" style="background-color:${C.canvas};padding:14px 8px 24px;">
    <tr>
      <td align="center">

        <!-- Carte principale (60% Dominant : Blanc pur, bordure fine sablée) -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:540px;background-color:${C.white};border-radius:16px;overflow:hidden;border:1px solid ${C.line};box-shadow:0 8px 28px rgba(11,22,38,0.04);">

          <!-- Fin liseré supérieur Nuit & Or (10% Accent) -->
          <tr>
            <td style="height:3px;line-height:3px;font-size:3px;background-color:${C.gold};background-image:linear-gradient(90deg,${C.midnight} 0%,${C.gold} 60%,${C.goldLight} 100%);">&nbsp;</td>
          </tr>

          <!-- ===== EN-TÊTE CLAIR, SOFT & PREMIUM ===== -->
          <tr>
            <td class="zs-header" style="background-color:${C.white};padding:18px 20px;border-bottom:1px solid ${C.line};">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <!-- Logo horizontal officiel [Z-Chariot]ennShop -->
                  <td align="left" valign="middle">
                    <a href="${escapeHtml(DEFAULT_PLATFORM_URL)}" target="_blank" rel="noopener noreferrer" style="text-decoration:none;display:inline-block;">
                      ${brandHorizontalLogo(32, 'header')}
                    </a>
                  </td>

                  <!-- Pilule de canal sobre & compacte (ne déborde jamais sur mobile) -->
                  <td align="right" valign="middle" style="padding-left:8px;">
                    <span style="display:inline-block;padding:4px 10px;border-radius:999px;background-color:${C.softBox};border:1px solid ${C.line};font-family:${FONT_SANS};font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;color:${C.gold};white-space:nowrap;">
                      ${escapeHtml(channelBadge)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== CORPS DU MESSAGE (CONCIS & AÉRÉ) ===== -->
          <tr>
            <td class="zs-body" style="background-color:${C.white};padding:24px 20px 22px;font-family:${FONT_SANS};">
              ${
                eyebrow
                  ? `<div style="font-family:${FONT_SANS};font-size:10.5px;letter-spacing:1.8px;text-transform:uppercase;color:${C.gold};font-weight:700;margin-bottom:6px;">${escapeHtml(eyebrow)}</div>`
                  : ''
              }
              <h1 class="zs-h1" style="margin:0 0 16px;font-family:${FONT_SERIF};font-size:23px;line-height:1.25;font-weight:700;color:${C.midnight};letter-spacing:-0.2px;">
                ${escapeHtml(title)}
              </h1>

              ${bodyHtml}

              ${ctaBlock}

              <!-- ===== SIGNATURE MINIMALISTE & CHALEUREUSE ===== -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:26px;padding-top:18px;border-top:1px solid ${C.line};">
                <tr>
                  <td>
                    <p style="margin:0 0 10px;font-family:${FONT_SERIF};font-size:15.5px;line-height:1.4;color:${C.inkMuted};font-style:italic;font-weight:600;">
                      ${escapeHtml(warmClosing)}
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td valign="middle" style="padding-right:10px;">
                          ${brandHorizontalLogo(22, 'signature')}
                        </td>
                        <td valign="middle" style="border-left:1px solid ${C.line};padding-left:10px;font-family:${FONT_SANS};font-size:11.5px;color:${C.inkMuted};">
                          L’équipe <strong style="color:${C.midnight};font-weight:600;">ZennShop</strong>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- ===== PIED DE PAGE DISCRET ===== -->
          <tr>
            <td class="zs-footer" style="background-color:${C.softBox};border-top:1px solid ${C.line};padding:14px 20px;text-align:center;font-family:${FONT_SANS};font-size:11px;color:${C.inkLight};line-height:1.5;">
              ${footerNote ? `<div style="color:${C.inkMuted};margin-bottom:4px;">${escapeHtml(footerNote)}</div>` : ''}
              <div>
                <a href="${escapeHtml(DEFAULT_PLATFORM_URL)}" target="_blank" rel="noopener noreferrer" style="color:${C.inkMuted};text-decoration:none;font-weight:600;">zennshop.com</a>
                &nbsp;·&nbsp;
                <span>${escapeHtml(channelFooter)}</span>
                &nbsp;·&nbsp;
                <a href="${escapeHtml(DEFAULT_PLATFORM_URL)}/contact" target="_blank" rel="noopener noreferrer" style="color:${C.inkMuted};text-decoration:none;">Support</a>
              </div>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Paragraphe fluide et concis (30% Secondaire) */
function p(html: string): string {
  return `<p style="margin:0 0 12px;font-size:14.5px;line-height:1.62;color:${C.inkBody};font-family:${FONT_SANS};">${html}</p>`;
}

/** Note douce et compacte (sans lourdeur visuelle) */
function softNote(
  html: string,
  tone: 'gold' | 'green' | 'red' | 'amber' = 'gold',
): string {
  const palette = {
    gold: { bg: C.softBox, border: C.gold, text: C.inkBody },
    green: { bg: C.greenSoftBg, border: C.green, text: C.inkBody },
    red: { bg: C.redSoftBg, border: C.red, text: C.inkBody },
    amber: { bg: C.amberSoftBg, border: C.amber, text: C.inkBody },
  }[tone];

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0;background-color:${palette.bg};border-left:3px solid ${palette.border};border-radius:0 10px 10px 0;">
    <tr>
      <td style="padding:11px 14px;font-size:13px;line-height:1.55;color:${palette.text};font-family:${FONT_SANS};">
        ${html}
      </td>
    </tr>
  </table>`;
}

/** Ligne clé/valeur épurée */
function kvRow(label: string, value: string, isLast = false): string {
  return `
      <tr>
        <td style="padding:7px 0;${isLast ? '' : `border-bottom:1px solid ${C.line};`}font-size:13px;color:${C.inkMuted};font-family:${FONT_SANS};">${label}</td>
        <td style="padding:7px 0;${isLast ? '' : `border-bottom:1px solid ${C.line};`}text-align:right;font-size:13px;color:${C.midnight};font-weight:600;font-family:${FONT_SANS};">${value}</td>
      </tr>`;
}

/**
 * Bloc OTP Mobile-First avec copie directe :
 * - 6 tuiles visuelles de 36px (non-sélectionnables pour éviter les retours à la ligne au copier-coller)
 * - Un badge « Copie directe en 1 clic » contenant le code d'un seul tenant (`user-select: all`)
 *   pour que sur mobile et ordinateur un simple toucher/clic sélectionne les 6 chiffres d'un bloc
 *   (et active le bouton natif « Copier le code » de Gmail / iOS / Android).
 */
function otpCompactBlock(code: string): string {
  const digits = code
    .split('')
    .map(
      (d) => `
          <td style="padding:0 2px;user-select:none;-webkit-user-select:none;">
            <div style="width:36px;height:44px;line-height:44px;text-align:center;background-color:${C.white};border:1px solid ${C.goldLight};border-bottom:2px solid ${C.gold};border-radius:8px;font-family:${FONT_MONO};font-size:20px;font-weight:700;color:${C.midnight};user-select:none;-webkit-user-select:none;">${escapeHtml(d)}</div>
          </td>`,
    )
    .join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;background-color:${C.softBox};border:1px solid ${C.line};border-radius:12px;">
    <tr>
      <td align="center" style="padding:18px 10px 14px;">
        <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" aria-hidden="true">
          <tr>${digits}</tr>
        </table>
        <!-- Zone de copie directe en 1 toucher (user-select: all) -->
        <div style="margin-top:12px;">
          <span style="font-family:${FONT_SANS};font-size:11px;color:${C.inkMuted};vertical-align:middle;">Copie rapide :&nbsp;</span>
          <span title="Touchez ou cliquez pour sélectionner tout le code" onclick="if(navigator.clipboard){navigator.clipboard.writeText('${escapeHtml(code)}');this.setAttribute('data-copied','1');}" style="display:inline-block;padding:5px 12px;border-radius:6px;background-color:${C.white};border:1px dashed ${C.gold};font-family:${FONT_MONO};font-size:14px;font-weight:700;letter-spacing:2px;color:${C.midnight};user-select:all;-webkit-user-select:all;-moz-user-select:all;cursor:pointer;vertical-align:middle;">${escapeHtml(code)}</span>
        </div>
        <div style="margin-top:8px;font-family:${FONT_SANS};font-size:11px;color:${C.inkMuted};">
           Touchez le code ci-dessus pour le copier · Valable <strong style="color:${C.midnight};">10 minutes</strong>
        </div>
      </td>
    </tr>
  </table>`;
}

/** Tableau récapitulatif des articles — compact, soft et lisible sur mobile */
function itemsTable(
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[],
  formatPrice: (v: number) => string,
  deliveryPrice: number,
  total: number,
): string {
  const rows = items
    .map(
      (i) => `
      <tr>
        <td style="padding:9px 0;border-bottom:1px solid ${C.line};font-family:${FONT_SANS};">
          <div style="font-size:13.5px;font-weight:600;color:${C.midnight};">${escapeHtml(i.name)}</div>
          ${i.variantLabel ? `<div style="font-size:11.5px;color:${C.inkMuted};">${escapeHtml(i.variantLabel)}</div>` : ''}
        </td>
        <td style="padding:9px 6px;border-bottom:1px solid ${C.line};text-align:center;font-size:12.5px;color:${C.inkMuted};white-space:nowrap;font-family:${FONT_SANS};">× ${i.quantity}</td>
        <td style="padding:9px 0;border-bottom:1px solid ${C.line};text-align:right;font-size:13.5px;font-weight:600;color:${C.midnight};white-space:nowrap;font-family:${FONT_SANS};">${formatPrice(i.unitPrice * i.quantity)}</td>
      </tr>`,
    )
    .join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background-color:${C.softBox};border:1px solid ${C.line};border-radius:12px;">
    <tr>
      <td style="padding:12px 16px 14px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tbody>
            ${rows}
            <tr>
              <td style="padding:8px 0 4px;font-size:12.5px;color:${C.inkMuted};font-family:${FONT_SANS};">Livraison</td>
              <td></td>
              <td style="padding:8px 0 4px;text-align:right;font-size:12.5px;color:${deliveryPrice === 0 ? C.green : C.inkMuted};font-weight:600;font-family:${FONT_SANS};">${deliveryPrice === 0 ? 'Gratuite' : formatPrice(deliveryPrice)}</td>
            </tr>
            <tr>
              <td style="padding:8px 0 0;border-top:1px solid ${C.midnight};font-size:14px;font-weight:700;color:${C.midnight};font-family:${FONT_SANS};">Total</td>
              <td style="border-top:1px solid ${C.midnight};"></td>
              <td style="padding:8px 0 0;border-top:1px solid ${C.midnight};text-align:right;font-size:15px;font-weight:700;color:${C.gold};white-space:nowrap;font-family:${FONT_SANS};">${formatPrice(total)}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </table>`;
}

/* ========================================================================== */
/* CANAL 1 : SYSTÈME, COMPTE & SÉCURITÉ (channel = 'system')                  */
/* ========================================================================== */

/** 1. Code OTP de vérification à l'inscription */
export function buildOtpEmail(code: string): { subject: string; html: string } {
  const bodyHtml = `
  ${p(`Bonjour et bienvenue sur <strong style="color:${C.midnight};">ZennShop</strong>. Saisissez ce code de vérification pour activer votre compte :`)}

  ${otpCompactBlock(code)}

  ${p(`<span style="font-size:12.5px;color:${C.inkMuted};">Si vous n’êtes pas à l’origine de cette demande, ignorez simplement ce message — aucun compte ne sera créé.</span>`)}`;

  return {
    subject: `Votre code de vérification : ${code.slice(0, 3)} •••`,
    html: brandLayout({
      channel: 'system',
      eyebrow: 'Vérification',
      title: 'Confirmez votre adresse e-mail',
      preheader: `Votre code de vérification ZennShop est ${code} (valable 10 minutes).`,
      bodyHtml,
      warmClosing: 'Heureux de vous compter parmi nous,',
      footerNote: 'Code strictement confidentiel — ne le partagez jamais.',
    }),
  };
}

/** 2. Code OTP de réinitialisation de mot de passe */
export function buildPasswordResetOtpEmail(
  code: string,
  userName?: string | null,
): { subject: string; html: string } {
  const greeting = userName?.trim()
    ? `Bonjour <strong style="color:${C.midnight};">${escapeHtml(userName.trim())}</strong>,`
    : 'Bonjour,';

  const bodyHtml = `
  ${p(`${greeting} utilisez ce code temporaire pour choisir votre nouveau mot de passe <strong style="color:${C.midnight};">ZennShop</strong> :`)}

  ${otpCompactBlock(code)}

  ${p(`<span style="font-size:12.5px;color:${C.inkMuted};">Si vous n’avez pas demandé cette réinitialisation, votre mot de passe actuel reste inchangé.</span>`)}`;

  return {
    subject: `Réinitialisation de votre mot de passe : ${code.slice(0, 3)} •••`,
    html: brandLayout({
      channel: 'system',
      eyebrow: 'Sécurité du compte',
      title: 'Réinitialisez votre mot de passe',
      preheader: `Code de sécurité ZennShop : ${code} (valable 10 minutes).`,
      bodyHtml,
      warmClosing: 'En toute sécurité,',
    }),
  };
}

/** 3. Confirmation de modification de mot de passe */
export interface PasswordChangedMailData {
  userName?: string | null;
  userEmail: string;
}

export function buildPasswordChangedEmail(data: PasswordChangedMailData): {
  subject: string;
  html: string;
} {
  const greeting = data.userName?.trim()
    ? `Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.userName.trim())}</strong>,`
    : 'Bonjour,';

  const bodyHtml = `
  ${p(`${greeting} le mot de passe de votre compte <strong style="color:${C.midnight};">${escapeHtml(data.userEmail)}</strong> a bien été mis à jour.`)}

  ${softNote(`✓ Vos anciennes sessions actives ont été sécurisées automatiquement.`, 'green')}

  ${p(`<span style="font-size:12.5px;color:${C.inkMuted};">Si vous n’êtes pas à l’origine de cette opération, contactez immédiatement notre support.</span>`)}`;

  return {
    subject: `Votre mot de passe ZennShop a été modifié`,
    html: brandLayout({
      channel: 'system',
      eyebrow: 'Sécurité',
      title: 'Mot de passe modifié avec succès',
      preheader: 'Confirmation de la modification de votre mot de passe ZennShop.',
      bodyHtml,
      cta: {
        label: 'Accéder à mon compte',
        url: `${DEFAULT_PLATFORM_URL}/connexion`,
      },
      warmClosing: 'En toute confiance,',
    }),
  };
}

/** 4. Bienvenue après création de compte (Client ou Vendeur) */
export interface WelcomeAccountMailData {
  userName: string;
  userEmail: string;
  role: 'VENDEUR' | 'CLIENT';
  shopName?: string | null;
}

export function buildWelcomeAccountEmail(data: WelcomeAccountMailData): {
  subject: string;
  html: string;
} {
  const isSeller = data.role === 'VENDEUR';

  const bodyHtml = isSeller
    ? `
  ${p(`Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.userName)}</strong>, bienvenue sur <strong style="color:${C.midnight};">ZennShop</strong> ! Votre espace marchand${data.shopName ? ` pour <strong style="color:${C.midnight};">${escapeHtml(data.shopName)}</strong>` : ''} est prêt.`)}
  ${softNote(
    `<strong>Pour lancer vos ventes :</strong> ajoutez vos premiers articles, personnalisez votre vitrine et partagez votre lien sur WhatsApp et vos réseaux.`,
    'gold',
  )}`
    : `
  ${p(`Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.userName)}</strong>, bienvenue sur <strong style="color:${C.midnight};">ZennShop</strong> ! Votre compte membre est actif.`)}
  ${softNote(
    `<strong>Avantage fidélité :</strong> chaque commande validée vous rapporte automatiquement des points de fidélité utilisables sur vos prochains achats.`,
    'gold',
  )}`;

  return {
    subject: isSeller
      ? `Bienvenue sur ZennShop, ${data.userName} ! Votre commerce entre en pleine lumière ✨`
      : `Bienvenue sur ZennShop, ${data.userName} ! ✨`,
    html: brandLayout({
      channel: 'system',
      eyebrow: isSeller ? 'Espace Vendeur' : 'Bienvenue',
      title: isSeller
        ? 'Votre boutique est prête à rayonner'
        : 'Ravi de vous compter parmi nous',
      preheader: isSeller
        ? 'Découvrez votre tableau de bord vendeur ZennShop.'
        : 'Explorez les boutiques vérifiées du Marketplace ZennShop.',
      bodyHtml,
      cta: {
        label: isSeller ? 'Ouvrir mon Espace Vendeur' : 'Explorer le Marketplace',
        url: isSeller
          ? `${DEFAULT_PLATFORM_URL}/espace-vendeur`
          : `${DEFAULT_PLATFORM_URL}/marketplace`,
      },
      warmClosing: 'Nous sommes fiers de vous accompagner,',
    }),
  };
}

/* ========================================================================== */
/* CANAL 2 : ACTIVITÉS & VIE DE LA PLATEFORME (channel = 'activity')          */
/* ========================================================================== */

export interface OrderMailData {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  boutiqueName: string;
  boutiqueEmail?: string | null;
  sellerEmail?: string | null;
  customerPhone?: string | null;
  cancellationReason?: string;
  netAmount?: number;
  commissionRate?: number;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  formatPrice: (value: number) => string;
}

/** 5. Confirmation de commande — envoyée au CLIENT */
export function buildOrderConfirmationEmail(data: OrderMailData): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
  ${p(`Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.customerName)}</strong>, votre commande <strong style="color:${C.green};">${escapeHtml(data.orderNumber)}</strong> chez <strong style="color:${C.midnight};">${escapeHtml(data.boutiqueName)}</strong> est <strong style="color:${C.green};">confirmée</strong>.`)}

  ${itemsTable(data.items, data.formatPrice, data.deliveryPrice, data.total)}

  ${softNote(`La boutique reste en contact avec vous via la messagerie ZennShop ou WhatsApp pour coordonner votre livraison.`, 'green')}`;

  return {
    subject: `Commande ${data.orderNumber} confirmée ✓`,
    html: brandLayout({
      channel: 'activity',
      eyebrow: `Commande confirmée · ${data.boutiqueName}`,
      title: 'Merci ! Votre commande se prépare',
      preheader: `Votre commande ${data.orderNumber} chez ${data.boutiqueName} est confirmée.`,
      bodyHtml,
      cta: {
        label: 'Suivre ma commande',
        url: `${DEFAULT_PLATFORM_URL}/espace-client/commandes`,
      },
      warmClosing: 'Merci pour votre confiance,',
    }),
  };
}

/** 6. Vente validée — envoyée au VENDEUR */
export function buildSellerSaleValidatedEmail(data: OrderMailData): {
  subject: string;
  html: string;
} {
  const netDisplay =
    typeof data.netAmount === 'number'
      ? data.formatPrice(data.netAmount)
      : data.formatPrice(data.total);

  const bodyHtml = `
  ${p(`Bravo <strong style="color:${C.midnight};">${escapeHtml(data.boutiqueName)}</strong> ! La commande <strong style="color:${C.green};">${escapeHtml(data.orderNumber)}</strong> de <strong style="color:${C.midnight};">${escapeHtml(data.customerName)}</strong> est validée.`)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:14px 0;background-color:${C.softBox};border:1px solid ${C.line};border-left:3px solid ${C.gold};border-radius:10px;">
    <tr>
      <td style="padding:12px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${kvRow('Montant net crédité', `<span style="color:${C.green};">+ ${escapeHtml(netDisplay)}</span>`)}
          ${kvRow('Client', `${escapeHtml(data.customerName)} (${escapeHtml(data.customerPhone ?? '—')})`, true)}
        </table>
      </td>
    </tr>
  </table>

  ${itemsTable(data.items, data.formatPrice, data.deliveryPrice, data.total)}`;

  return {
    subject: `🎉 Nouvelle vente validée ${data.orderNumber} (${data.formatPrice(data.total)})`,
    html: brandLayout({
      channel: 'activity',
      eyebrow: 'Nouvelle vente',
      title: 'Félicitations pour cette vente !',
      preheader: `Commande ${data.orderNumber} validée (${data.formatPrice(data.total)}) pour ${data.boutiqueName}.`,
      bodyHtml,
      cta: {
        label: 'Préparer et expédier la commande',
        url: `${DEFAULT_PLATFORM_URL}/espace-vendeur/commandes`,
      },
      warmClosing: 'Excellentes ventes sur ZennShop,',
    }),
  };
}

/** 7. Confirmation d'annulation — envoyée au CLIENT */
export function buildCancellationEmail(data: OrderMailData): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
  ${p(`Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.customerName)}</strong>, votre commande <strong style="color:${C.red};">${escapeHtml(data.orderNumber)}</strong> chez <strong style="color:${C.midnight};">${escapeHtml(data.boutiqueName)}</strong> a bien été <strong style="color:${C.red};">annulée</strong>.`)}

  ${data.cancellationReason ? softNote(`<strong>Motif indiqué :</strong> ${escapeHtml(data.cancellationReason)}`, 'red') : ''}

  ${itemsTable(data.items, data.formatPrice, data.deliveryPrice, data.total)}

  ${p(`<span style="font-size:12.5px;color:${C.inkMuted};">Les articles ont été remis en stock et aucun montant ne vous a été débité.</span>`)}`;

  return {
    subject: `Commande ${data.orderNumber} annulée`,
    html: brandLayout({
      channel: 'activity',
      eyebrow: 'Annulation',
      title: 'Votre commande a été annulée',
      preheader: `Confirmation d'annulation de la commande ${data.orderNumber}.`,
      bodyHtml,
      cta: {
        label: 'Parcourir le Marketplace',
        url: `${DEFAULT_PLATFORM_URL}/marketplace`,
      },
      warmClosing: 'Au plaisir de vous revoir bientôt,',
    }),
  };
}

/** 8. Alerte d'annulation — envoyée au VENDEUR */
export function buildSellerCancellationEmail(data: OrderMailData): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
  ${p(`La commande <strong style="color:${C.red};">${escapeHtml(data.orderNumber)}</strong> a été annulée par <strong style="color:${C.midnight};">${escapeHtml(data.customerName)}</strong> (${escapeHtml(data.customerPhone ?? '—')}). Les articles ont été automatiquement <strong style="color:${C.midnight};">remis en stock</strong>.`)}

  ${data.cancellationReason ? softNote(`<strong>Motif indiqué :</strong> <em>${escapeHtml(data.cancellationReason)}</em>`, 'amber') : ''}

  ${itemsTable(data.items, data.formatPrice, data.deliveryPrice, data.total)}`;

  return {
    subject: `Commande ${data.orderNumber} annulée par ${data.customerName}`,
    html: brandLayout({
      channel: 'activity',
      eyebrow: 'Mise à jour de stock',
      title: 'Une commande a été annulée',
      preheader: `${data.customerName} a annulé la commande ${data.orderNumber}. Stock mis à jour.`,
      bodyHtml,
      cta: {
        label: 'Voir mes commandes',
        url: `${DEFAULT_PLATFORM_URL}/espace-vendeur/commandes`,
      },
      warmClosing: 'Toujours à vos côtés,',
    }),
  };
}

/** 9. Nouveau message reçu dans la messagerie ZennShop */
export interface NewMessageMailData {
  recipientName: string;
  recipientRole: 'VENDEUR' | 'CLIENT';
  senderName: string;
  boutiqueName: string;
  messagePreview: string;
  productName?: string | null;
  orderReference?: string | null;
  conversationUrl?: string;
}

export function buildNewMessageEmail(data: NewMessageMailData): {
  subject: string;
  html: string;
} {
  const contextTag = data.productName
    ? `Article : ${escapeHtml(data.productName)}`
    : data.orderReference
      ? `Commande : #${escapeHtml(data.orderReference)}`
      : `Boutique : ${escapeHtml(data.boutiqueName)}`;

  const defaultUrl =
    data.recipientRole === 'VENDEUR'
      ? `${DEFAULT_PLATFORM_URL}/espace-vendeur/messagerie`
      : `${DEFAULT_PLATFORM_URL}/espace-client/discussions`;

  const bodyHtml = `
  ${p(`Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.recipientName)}</strong>, vous avez reçu un message de <strong style="color:${C.midnight};">${escapeHtml(data.senderName)}</strong> :`)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background-color:${C.softBox};border:1px solid ${C.line};border-left:3px solid ${C.gold};border-radius:12px;">
    <tr>
      <td style="padding:14px 18px;">
        <div style="font-family:${FONT_SANS};font-size:11px;font-weight:600;color:${C.gold};margin-bottom:6px;">
          ${contextTag}
        </div>
        <div style="font-family:${FONT_SERIF};font-size:17.5px;line-height:1.5;color:${C.midnight};font-style:italic;font-weight:600;">
          « ${escapeHtml(data.messagePreview)} »
        </div>
      </td>
    </tr>
  </table>`;

  return {
    subject: `💬 Nouveau message de ${data.senderName} sur ZennShop`,
    html: brandLayout({
      channel: 'activity',
      eyebrow: 'Messagerie directe',
      title: `${data.senderName} vous a écrit`,
      preheader: `« ${data.messagePreview} »`,
      bodyHtml,
      cta: {
        label: 'Répondre au message',
        url: data.conversationUrl || defaultUrl,
      },
      warmClosing: 'Bons échanges sur ZennShop,',
    }),
  };
}

/** 10. Objectif / Palier atteint par la boutique (Milestone) */
export interface MilestoneMailData {
  sellerName: string;
  boutiqueName: string;
  milestoneTitle: string;
  milestoneBadge: string;
  customMessage?: string;
}

export function buildMilestoneReachedEmail(data: MilestoneMailData): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
  ${p(`Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.sellerName)}</strong>, votre boutique <strong style="color:${C.midnight};">${escapeHtml(data.boutiqueName)}</strong> vient de franchir un nouveau cap :`)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;background-color:${C.softBox};border:1px solid ${C.goldLight};border-radius:14px;">
    <tr>
      <td align="center" style="padding:22px 18px;">
        <div style="font-family:${FONT_SANS};font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:${C.gold};margin-bottom:6px;">
          ✦ Objectif Atteint ✦
        </div>
        <div style="font-family:${FONT_SERIF};font-size:30px;font-weight:700;color:${C.midnight};line-height:1.15;">
          ${escapeHtml(data.milestoneBadge)}
        </div>
        <div style="font-family:${FONT_SANS};font-size:13px;color:${C.inkBody};margin-top:4px;">
          ${escapeHtml(data.milestoneTitle)}
        </div>
      </td>
    </tr>
  </table>

  ${p(
    data.customMessage
      ? escapeHtml(data.customMessage)
      : `Continuez sur cette belle lancée : votre sérieux et la qualité de votre service font toute la différence.`,
  )}`;

  return {
    subject: `🏆 Félicitations ${data.boutiqueName} ! Objectif atteint : ${data.milestoneTitle}`,
    html: brandLayout({
      channel: 'activity',
      eyebrow: 'Célébration',
      title: `Bravo pour ce nouveau palier !`,
      preheader: `Votre boutique ${data.boutiqueName} a atteint le cap : ${data.milestoneTitle}.`,
      bodyHtml,
      cta: {
        label: 'Voir mes statistiques',
        url: `${DEFAULT_PLATFORM_URL}/espace-vendeur/statistiques`,
      },
      warmClosing: 'Toute l’équipe ZennShop applaudit votre succès,',
    }),
  };
}

/** 11. Rappel d'expiration proche d'une formule / abonnement */
export interface SubscriptionExpiringMailData {
  sellerName: string;
  boutiqueName: string;
  planName: string;
  daysRemaining: number;
  expiresAtFormatted: string;
  commissionRate: string;
}

export function buildSubscriptionExpiringEmail(
  data: SubscriptionExpiringMailData,
): { subject: string; html: string } {
  const dayLabel =
    data.daysRemaining <= 1
      ? 'demain'
      : `dans ${data.daysRemaining} jours`;

  const bodyHtml = `
  ${p(`Bonjour <strong style="color:${C.midnight};">${escapeHtml(data.sellerName)}</strong>, votre formule <strong style="color:${C.midnight};">ZennShop ${escapeHtml(data.planName)}</strong> pour <strong style="color:${C.midnight};">${escapeHtml(data.boutiqueName)}</strong> arrive à échéance <strong style="color:${C.amber};">${escapeHtml(dayLabel)}</strong>.`)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0;background-color:${C.softBox};border:1px solid ${C.line};border-radius:12px;">
    <tr>
      <td style="padding:12px 16px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${kvRow('Formule active', `ZennShop ${escapeHtml(data.planName)}`)}
          ${kvRow('Commission préférentielle', `${escapeHtml(data.commissionRate)} (au lieu de 5 %)`)}
          ${kvRow("Date d'échéance", escapeHtml(data.expiresAtFormatted), true)}
        </table>
      </td>
    </tr>
  </table>`;

  return {
    subject: `⏳ Votre formule ZennShop ${data.planName} expire ${dayLabel}`,
    html: brandLayout({
      channel: 'activity',
      eyebrow: 'Abonnement',
      title: `Conservez vos avantages ${data.planName}`,
      preheader: `Votre formule ZennShop ${data.planName} expire ${dayLabel} (${data.expiresAtFormatted}).`,
      bodyHtml,
      cta: {
        label: 'Renouveler ma formule',
        url: `${DEFAULT_PLATFORM_URL}/espace-vendeur/parametres/formule`,
      },
      warmClosing: 'Merci pour votre fidélité,',
    }),
  };
}
