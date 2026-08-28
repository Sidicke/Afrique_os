/**
 * Icônes SVG — réutilisées depuis `Ecommerce/Logo et choses utiles/`
 * (dossier Shopify de référence). On ne garde QUE les icônes : le design
 * de la boutique suit les captures de référence, pas le template.
 * Toutes héritent de `currentColor` — aucune ne contient d'emoji.
 */

interface IconProps {
  className?: string;
}

export function IconCart({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z" />
    </svg>
  );
}

export function IconTruck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M0 3.752c0-.277.224-.502.5-.502h10.147a.5.5 0 0 1 .5.502v9.91l-.595 1.003H7.223V13.66h2.923V4.253H1.002v9.408h1.682v1.004H.501A.5.5 0 0 1 0 14.163zm18.999 4.332-7.851-1.975V5.075l8.473 2.131a.5.5 0 0 1 .379.487v6.47a.5.5 0 0 1-.5.502h-2.193v-1.003H19zm-7.851 5.578h2.196v1.003h-2.792z" />
      <path d="M7.713 14.185a2.56 2.56 0 0 1-2.56 2.565 2.56 2.56 0 0 1-2.56-2.565 2.56 2.56 0 0 1 2.56-2.564 2.56 2.56 0 0 1 2.56 2.564m-2.56 1.562a1.56 1.56 0 0 0 1.558-1.562 1.56 1.56 0 0 0-1.559-1.56 1.56 1.56 0 0 0-1.558 1.56 1.56 1.56 0 0 0 1.558 1.562m12.368-1.562a2.56 2.56 0 0 1-2.56 2.565 2.56 2.56 0 0 1-2.56-2.565 2.56 2.56 0 0 1 2.56-2.564 2.56 2.56 0 0 1 2.56 2.564m-2.56 1.562a1.56 1.56 0 0 0 1.558-1.562 1.56 1.56 0 0 0-1.559-1.56 1.56 1.56 0 0 0-1.558 1.56 1.56 1.56 0 0 0 1.558 1.562" />
    </svg>
  );
}

export function IconChat({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path d="M5.8 10.243a1 1 0 1 1 2 0 1 1 0 0 1-2 0M9.23 10.243a1 1 0 1 1 2 0 1 1 0 0 1-2 0M12.66 10.243a1 1 0 1 1 2 0 1 1 0 0 1-2 0" />
      <path
        fillRule="evenodd"
        d="m16.645 17.204-.008-.004a19 19 0 0 1-.767-.423c-.645-.367-1.263-.72-1.442-.598a7.472 7.472 0 1 1 2.05-2.082c-.134.202.192.843.533 1.513.147.29.297.584.414.85l.006.014c.193.443.293.808.136.944-.128.136-.488.006-.922-.214m1.614.936c-.38.372-.857.345-1.046.321a2.5 2.5 0 0 1-.626-.181 11 11 0 0 1-1.081-.56l-.132-.074c-.29-.166-.538-.307-.744-.408a8.472 8.472 0 1 1 2.877-2.902l.008.02c.092.22.226.483.385.795l.084.165c.178.353.388.774.516 1.146.063.181.131.42.143.669.01.225-.02.668-.384 1.009"
      />
    </svg>
  );
}

export function IconLock({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.5 7.118h-13V19h13zm-13-1a1 1 0 0 0-1 1V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V7.118a1 1 0 0 0-1-1z"
      />
      <path d="M11.443 11.92c0 .82-.646 1.486-1.443 1.486s-1.443-.665-1.443-1.486c0-.82.646-1.486 1.443-1.486s1.443.665 1.443 1.486" />
      <path d="M10.019 11.92c.345 0 .625.28.625.625v3.152a.625.625 0 1 1-1.25 0v-3.152c0-.345.28-.625.625-.625M6.242 3.76a3.759 3.759 0 1 1 7.516 0v2.36h-1V3.76a2.759 2.759 0 1 0-5.516 0v2.36h-1z" />
    </svg>
  );
}

export function IconShield({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M10.2 1.5a.73.73 0 0 1 .512.147l4.654 3.636c.12.094.191.235.195.387l.22 4.314c.032.63-.07 1.258-.3 1.84a6.8 6.8 0 0 1-3.925 3.759l-.952.397a.73.73 0 0 1-.546 0l-.952-.397a6.8 6.8 0 0 1-3.925-3.759 5.34 5.34 0 0 1-.3-1.84l.22-4.314a.73.73 0 0 1 .195-.387L9.688 1.647A.73.73 0 0 1 10.2 1.5zm-.002 1.5-.22 4.29a.73.73 0 0 1-.195.387l-3.376 2.64.146 2.863c.01.21.078.414.2.594a5.35 5.35 0 0 0 3.087 2.957l.36.15.36-.15a5.35 5.35 0 0 0 3.087-2.957 3.89 3.89 0 0 0 .2-.594l.146-2.864-3.376-2.639a.73.73 0 0 1-.195-.387L10.198 3z"
      />
      <path d="m9.42 11.898 1.8-2.011 1.007.9-2.02 2.256a.582.582 0 0 1-.848 0l-.796-.888z" />
    </svg>
  );
}

export function IconStar({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="m10 2.626-1.46 4.71c-.192.62-.743 1.041-1.365 1.041H2.453l3.82 2.91a1.55 1.55 0 0 1 .522 1.685l-1.46 4.71 3.821-2.911a1.38 1.38 0 0 1 1.688 0l3.82 2.91-1.459-4.71c-.192-.62.019-1.3.522-1.683l3.82-2.911h-4.722c-.622 0-1.173-.42-1.366-1.04zm.455-1.78a.472.472 0 0 0-.91 0L7.63 7.027a.48.48 0 0 1-.455.347H.98c-.464 0-.657.622-.282.908l5.012 3.82a.52.52 0 0 1 .174.56l-1.914 6.18c-.143.462.361.847.736.56l5.013-3.818a.46.46 0 0 1 .562 0l5.013 3.819c.375.286.88-.099.736-.561l-1.914-6.18a.52.52 0 0 1 .174-.56l5.012-3.82c.375-.286.182-.908-.282-.908h-6.195a.48.48 0 0 1-.455-.347z"
      />
    </svg>
  );
}

export function IconBox({ className }: IconProps) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M9.695.679a1 1 0 0 1 .674.003l7.846 2.859a1 1 0 0 1 .658.94v9.948a1 1 0 0 1-.553.894l-7.847 3.924a1 1 0 0 1-.882.006l-8.137-3.929a1 1 0 0 1-.565-.9v-9.94a1 1 0 0 1 .668-.943zM6.08 3.01 2.535 4.257l7.614 3.378 3.42-1.517zm.706-.248L14.2 5.838l3.337-1.48-7.51-2.736zM1.89 14.424v-9.36l7.76 3.444v9.662zm15.984.005-7.224 3.612V8.508l7.224-3.205z"
      />
    </svg>
  );
}

export function IconPlus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 10 10" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M1 4.51a.5.5 0 0 0 0 1h3.5l.01 3.5a.5.5 0 0 0 1-.01V5.5l3.5-.01a.5.5 0 0 0-.01-1H5.5L5.49.99a.5.5 0 0 0-1 .01v3.5l-3.5.01z"
      />
    </svg>
  );
}

export function IconMinus({ className }: IconProps) {
  return (
    <svg viewBox="0 0 10 2" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M.5 1C.5.7.7.5 1 .5h8a.5.5 0 1 1 0 1H1A.5.5 0 0 1 .5 1"
      />
    </svg>
  );
}

export function IconClose({ className }: IconProps) {
  return (
    <svg viewBox="0 0 18 17" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.865 15.978a.5.5 0 0 0 .707.707l7.433-7.431 7.579 7.282a.501.501 0 0 0 .846-.37.5.5 0 0 0-.153-.351L9.712 8.546l7.417-7.416a.5.5 0 1 0-.707-.708L8.991 7.853 1.413.573a.5.5 0 1 0-.693.72l7.563 7.268z" />
    </svg>
  );
}

export function IconArrow({ className }: IconProps) {
  return (
    <svg viewBox="0 0 14 10" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8.537.808a.5.5 0 0 1 .817-.162l4 4a.5.5 0 0 1 0 .708l-4 4a.5.5 0 1 1-.708-.708L11.793 5.5H1a.5.5 0 0 1 0-1h10.793L8.646 1.354a.5.5 0 0 1-.109-.546"
      />
    </svg>
  );
}

export function IconCheck({ className }: IconProps) {
  return (
    <svg viewBox="0 0 12 9" fill="currentColor" className={className} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M11.35.643a.5.5 0 0 1 .006.707l-6.77 6.886a.5.5 0 0 1-.719-.006L.638 4.845a.5.5 0 1 1 .724-.69l2.872 3.011 6.41-6.517a.5.5 0 0 1 .707-.006z"
      />
    </svg>
  );
}

export function IconSearch({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8"/>
      <path d="m21 21-4.3-4.3"/>
    </svg>
  );
}

export function IconUser({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/>
      <circle cx="12" cy="7" r="4"/>
    </svg>
  );
}

export function IconMenu({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="4" x2="20" y1="12" y2="12"/>
      <line x1="4" x2="20" y1="6" y2="6"/>
      <line x1="4" x2="20" y1="18" y2="18"/>
    </svg>
  );
}

export function IconSound({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
    </svg>
  );
}

export function IconBattery({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="16" height="10" x="2" y="7" rx="2" ry="2"/>
      <line x1="22" x2="22" y1="11" y2="13"/>
    </svg>
  );
}

export function IconDesign({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 19l7-7 3 3-7 7-3-3z"/>
      <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
      <path d="M2 2l7.586 7.586"/>
      <circle cx="11" cy="11" r="2"/>
    </svg>
  );
}

export function IconChevronLeft({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m15 18-6-6 6-6"/>
    </svg>
  );
}

export function IconChevronRight({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="m9 18 6-6-6-6"/>
    </svg>
  );
}

export function IconFacebook({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  );
}

export function IconTwitter({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"/>
    </svg>
  );
}

export function IconLinkedin({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
      <rect width="4" height="12" x="2" y="9"/>
      <circle cx="4" cy="4" r="2"/>
    </svg>
  );
}

export function IconInstagram({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/>
    </svg>
  );
}

export function IconSend({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="22" x2="11" y1="2" y2="13"/>
      <polygon points="22 2 15 22 11 13 2 9 22 2"/>
    </svg>
  );
}

export function IconPlay({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polygon points="6 3 20 12 6 21 6 3"/>
    </svg>
  );
}

export function IconChevronDown({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function IconMail({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="20" height="16" x="2" y="4" rx="2"/>
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
    </svg>
  );
}

export function IconPackage({ className }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
      <polyline points="3.27 6.96 12 12.01 20.73 6.96"/>
      <line x1="12" y1="22.08" x2="12" y2="12"/>
    </svg>
  );
}
