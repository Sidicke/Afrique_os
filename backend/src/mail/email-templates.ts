/**
 * Design system des e-mails transactionnels — « Papier & Or ».
 *
 * Un seul gabarit (layout) partagé par tous les templates : en-tête bleu nuit
 * au monogramme doré, corps clair respirant, accents or, pied de page légal.
 * Compatible clients mail modernes (tables imbriquées, styles inline, pas de
 * flexbox ni d'images externes).
 */

/** Palette de marque — alignée sur le frontend (midnight / gold / paper) */
const C = {
  midnight: '#0d1117',
  midnightSoft: '#161d27',
  gold: '#c9a44a',
  goldSoft: '#e8dfc9',
  goldWash: '#faf6ec',
  paper: '#f4f1ea',
  ink: '#1c2430',
  inkSoft: '#5b6572',
  inkMuted: '#98a1ad',
  line: '#e8e4da',
  white: '#ffffff',
  green: '#0f7b4f',
  red: '#b03a3a',
} as const;

const BRAND_NAME = 'Afrique Commerce OS';

/** Échappe le HTML pour éviter toute injection dans le corps du mail */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface BrandLayoutInput {
  /** Petit libellé au-dessus du titre (ex. "VÉRIFICATION") */
  eyebrow?: string;
  /** Titre principal du corps */
  title: string;
  /** Paragraphes HTML du corps (déjà échappés côté appelant si besoin) */
  bodyHtml: string;
  /** Mention légale personnalisée du pied de page (optionnel) */
  footerNote?: string;
}

/**
 * Gabarit de marque commun : coque sombre → carte claire centrée,
 * monogramme or, séparateurs dorés, pied de page légal.
 */
function brandLayout(input: BrandLayoutInput): string {
  const { eyebrow, title, bodyHtml, footerNote } = input;
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:${C.paper};">
  <!-- Préheader : aperçu discret dans la liste des mails -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(title)}</div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.paper};padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-radius:16px;overflow:hidden;box-shadow:0 10px 40px rgba(13,17,23,0.08);">

          <!-- ===== En-tête marque ===== -->
          <tr>
            <td style="background:${C.midnight};padding:26px 36px;" align="center">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="padding-right:14px;vertical-align:middle;">
                    <div style="width:42px;height:42px;line-height:42px;text-align:center;background:${C.gold};border-radius:12px;font-family:Georgia,'Times New Roman',serif;font-size:18px;font-weight:bold;color:${C.midnight};">AC</div>
                  </td>
                  <td style="vertical-align:middle;font-family:Arial,Helvetica,sans-serif;">
                    <div style="font-size:17px;font-weight:bold;color:${C.white};letter-spacing:0.3px;">Afrique Commerce&nbsp;<span style="color:${C.gold};">OS</span></div>
                    <div style="font-size:10px;letter-spacing:2.5px;color:#8a94a2;text-transform:uppercase;margin-top:2px;">Le commerce, sans friction</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ===== Corps ===== -->
          <tr>
            <td style="background:${C.white};padding:38px 36px 30px;font-family:Arial,Helvetica,sans-serif;">
              ${eyebrow ? `<div style="font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:${C.gold};font-weight:bold;margin-bottom:10px;">${escapeHtml(eyebrow)}</div>` : ''}
              <h1 style="margin:0 0 18px;font-family:Georgia,'Times New Roman',serif;font-size:25px;line-height:1.25;color:${C.midnight};">${escapeHtml(title)}</h1>
              ${bodyHtml}
            </td>
          </tr>

          <!-- ===== Pied de page ===== -->
          <tr>
            <td style="background:${C.goldWash};border-top:1px solid ${C.goldSoft};padding:20px 36px;text-align:center;">
              <div style="font-size:11px;color:${C.inkSoft};line-height:1.7;font-family:Arial,Helvetica,sans-serif;">
                ${footerNote ? escapeHtml(footerNote) + '<br />' : ''}
                ${escapeHtml(BRAND_NAME)} — e-mail automatique, merci de ne pas y répondre.<br />
                <span style="color:${C.inkMuted};">Vous recevez cet e-mail car un compte a été créé ou une commande passée avec cette adresse.</span>
              </div>
            </td>
          </tr>

        </table>

        <!-- Mention hors carte -->
        <div style="max-width:560px;margin:18px auto 0;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${C.inkMuted};">
          © ${new Date().getFullYear()} ${escapeHtml(BRAND_NAME)} · Tous droits réservés
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Paragraphe standard du corps */
function p(html: string): string {
  return `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:${C.inkSoft};font-family:Arial,Helvetica,sans-serif;">${html}</p>`;
}

/** Bloc encadré doré (encart d'information) */
function infoBox(html: string, accent: string = C.gold): string {
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:20px 0;background:${C.goldWash};border-left:4px solid ${accent};border-radius:0 10px 10px 0;">
    <tr><td style="padding:14px 18px;font-size:13.5px;line-height:1.6;color:${C.ink};font-family:Arial,Helvetica,sans-serif;">${html}</td></tr>
  </table>`;
}

/** Ligne clé/valeur des récapitulatifs */
function kvRow(label: string, value: string): string {
  return `
      <tr>
        <td style="padding:9px 0;font-size:13.5px;color:${C.inkSoft};font-family:Arial,Helvetica,sans-serif;">${label}</td>
        <td style="padding:9px 0;text-align:right;font-size:13.5px;color:${C.ink};font-weight:bold;font-family:Arial,Helvetica,sans-serif;">${value}</td>
      </tr>`;
}

/** Tableau des articles d'une commande */
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
        <td style="padding:12px 0;border-bottom:1px solid ${C.line};font-family:Arial,Helvetica,sans-serif;">
          <span style="font-size:14px;font-weight:bold;color:${C.ink};">${escapeHtml(i.name)}</span>
          ${i.variantLabel ? `<br /><span style="font-size:12px;color:${C.inkMuted};">${escapeHtml(i.variantLabel)}</span>` : ''}
        </td>
        <td style="padding:12px 0;border-bottom:1px solid ${C.line};text-align:center;font-size:13.5px;color:${C.inkSoft};font-family:Arial,Helvetica,sans-serif;">× ${i.quantity}</td>
        <td style="padding:12px 0;border-bottom:1px solid ${C.line};text-align:right;font-size:13.5px;color:${C.ink};font-family:Arial,Helvetica,sans-serif;">${formatPrice(i.unitPrice * i.quantity)}</td>
      </tr>`,
    )
    .join('');

  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:22px 0;border:1px solid ${C.line};border-radius:12px;border-collapse:separate;border-spacing:0;background:${C.white};">
    <tr>
      <td style="padding:18px 20px 6px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <thead>
            <tr>
              <th align="left" style="padding-bottom:8px;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Article</th>
              <th align="center" style="padding-bottom:8px;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Qté</th>
              <th align="right" style="padding-bottom:8px;font-size:10.5px;letter-spacing:2px;text-transform:uppercase;color:${C.inkMuted};font-weight:bold;font-family:Arial,Helvetica,sans-serif;">Montant</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr>
              <td style="padding:12px 0 2px;font-size:13.5px;color:${C.inkSoft};font-family:Arial,Helvetica,sans-serif;">Livraison</td>
              <td></td>
              <td style="padding:12px 0 2px;text-align:right;font-size:13.5px;color:${C.inkSoft};font-family:Arial,Helvetica,sans-serif;">${deliveryPrice === 0 ? 'Gratuite' : formatPrice(deliveryPrice)}</td>
            </tr>
            <tr>
              <td style="padding:10px 0 0;border-top:2px solid ${C.midnight};font-size:15px;font-weight:bold;color:${C.midnight};font-family:Arial,Helvetica,sans-serif;">Total</td>
              <td style="border-top:2px solid ${C.midnight};"></td>
              <td style="padding:10px 0 0;border-top:2px solid ${C.midnight};text-align:right;font-size:16px;font-weight:bold;color:${C.gold};font-family:Arial,Helvetica,sans-serif;">${formatPrice(total)}</td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  </table>`;
}

/* ============================================================ */
/* Templates                                                     */
/* ============================================================ */

/** Code de vérification (OTP) à 6 chiffres — cases élégantes */
export function buildOtpEmail(code: string): { subject: string; html: string } {
  const digits = code
    .split('')
    .map(
      (d) => `
          <td style="padding:0 5px;">
            <div style="width:52px;height:64px;line-height:64px;text-align:center;background:${C.goldWash};border:1px solid ${C.goldSoft};border-bottom:3px solid ${C.gold};border-radius:12px;font-family:'Courier New',monospace;font-size:32px;font-weight:bold;color:${C.midnight};">${escapeHtml(d)}</div>
          </td>`,
    )
    .join('');

  const bodyHtml = `
  ${p('Bonjour,')}
  ${p('Voici votre code de vérification pour finaliser la création de votre compte. Il est valable pendant <strong style="color:' + C.ink + ';">10 minutes</strong>.')}

  <table role="presentation" align="center" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 24px;">
    <tr>${digits}</tr>
  </table>

  ${infoBox(`🔐 Saisissez ce code dans la fenêtre d'inscription pour prouver que cette adresse e-mail est bien la vôtre.`)}

  ${p("Vous n'êtes pas à l'origine de cette demande ? Ignorez simplement cet e-mail — <strong style=\"color:" + C.ink + ";\">aucun compte ne sera créé</strong>.")}`;

  return {
    subject: `Votre code de vérification : ${code.slice(0, 3)} •••`,
    html: brandLayout({
      eyebrow: 'Vérification de votre adresse',
      title: 'Un dernier pas et votre compte est prêt',
      bodyHtml,
      footerNote: 'Ce code est personnel et confidentiel — ne le partagez jamais.',
    }),
  };
}

/** Données nécessaires aux e-mails liés aux commandes */
export interface OrderMailData {
  orderNumber: string;
  customerName: string;
  customerEmail?: string | null;
  boutiqueName: string;
  boutiqueEmail?: string | null;
  sellerEmail?: string | null;
  customerPhone?: string | null;
  cancellationReason?: string;
  items: { name: string; variantLabel?: string; quantity: number; unitPrice: number }[];
  deliveryPrice: number;
  total: number;
  formatPrice: (value: number) => string;
}

/** Confirmation de commande — envoyée au CLIENT quand le vendeur confirme */
export function buildOrderConfirmationEmail(data: OrderMailData): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
  ${p(`Bonjour <strong style="color:${C.ink};">${escapeHtml(data.customerName)}</strong>,`)}
  ${p(`Bonne nouvelle : votre commande <strong style="color:${C.green};">${escapeHtml(data.orderNumber)}</strong> vient d'être <strong style="color:${C.green};">confirmée</strong> par <strong style="color:${C.ink};">${escapeHtml(data.boutiqueName)}</strong>.`)}

  ${itemsTable(data.items, data.formatPrice, data.deliveryPrice, data.total)}

  ${infoBox('📞 La boutique va vous contacter sur WhatsApp ou par téléphone pour convenir du paiement et de la livraison.')}

  ${p(`Vous pouvez suivre l'évolution de votre commande à tout moment depuis votre espace client.`)}`;

  return {
    subject: `Commande ${data.orderNumber} confirmée ✓`,
    html: brandLayout({
      eyebrow: 'Commande confirmée',
      title: `Votre commande est confirmée !`,
      bodyHtml,
    }),
  };
}

/** Confirmation d'annulation — envoyée au CLIENT */
export function buildCancellationEmail(data: OrderMailData): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
  ${p(`Bonjour <strong style="color:${C.ink};">${escapeHtml(data.customerName)}</strong>,`)}
  ${p(`Votre commande <strong style="color:${C.red};">${escapeHtml(data.orderNumber)}</strong> auprès de <strong style="color:${C.ink};">${escapeHtml(data.boutiqueName)}</strong> a bien été <strong style="color:${C.red};">annulée</strong>.`)}

  ${itemsTable(data.items, data.formatPrice, data.deliveryPrice, data.total)}

  ${data.cancellationReason ? infoBox(`<strong>Motif indiqué :</strong> ${escapeHtml(data.cancellationReason)}`, C.red) : ''}
  ${infoBox(`✅ Les articles ont été remis en stock et <strong style="color:${C.green};">aucun paiement n'a été débité</strong>.`, C.green)}

  ${p(`Une question ? Répondez simplement à cet e-mail ou contactez directement la boutique.`)}`;

  return {
    subject: `Commande ${data.orderNumber} annulée`,
    html: brandLayout({
      eyebrow: "Confirmation d'annulation",
      title: 'Votre commande a été annulée',
      bodyHtml,
    }),
  };
}

/** Alerte d'annulation — envoyée au VENDEUR */
export function buildSellerCancellationEmail(data: OrderMailData): {
  subject: string;
  html: string;
} {
  const bodyHtml = `
  ${p(`Bonjour,`)}
  ${p(`La commande <strong style="color:${C.red};">${escapeHtml(data.orderNumber)}</strong> a été <strong style="color:${C.red};">annulée par le client</strong> ${escapeHtml(data.customerName)}. Les articles ont été remis en stock.`)}

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0;border:1px solid ${C.line};border-radius:12px;border-collapse:separate;border-spacing:0;">
    <tr><td style="padding:16px 20px;">
      ${kvRow('Client', escapeHtml(data.customerName))}
      ${kvRow('Téléphone', escapeHtml(data.customerPhone ?? '—'))}
      ${data.cancellationReason ? kvRow('Motif indiqué', `<em>${escapeHtml(data.cancellationReason)}</em>`) : ''}
    </td></tr>
  </table>

  ${itemsTable(data.items, data.formatPrice, data.deliveryPrice, data.total)}

  ${infoBox('💡 Contactez le client si nécessaire pour comprendre son annulation et proposer une alternative.', C.gold)}`;

  return {
    subject: `Commande ${data.orderNumber} annulée par ${data.customerName}`,
    html: brandLayout({
      eyebrow: 'Alerte boutique',
      title: 'Une commande a été annulée',
      bodyHtml,
    }),
  };
}
