import { cn } from "@/lib/utils";

interface SectionProps {
  children: React.ReactNode;
  className?: string;
  id?: string;
  tone?: "dark" | "light" | "ivory";
}

const tones = {
  dark: "bg-midnight-950 text-ivory-50",
  light: "bg-ivory-50 text-midnight-950",
  ivory: "bg-ivory-100 text-midnight-950",
};

/** Halo de lumière en haut de section — subtil, décliné selon le ton */
const veils = {
  dark: "bg-[radial-gradient(70%_50%_at_50%_0%,rgba(216,205,184,0.07)_0%,transparent_100%)]",
  light: "bg-[radial-gradient(70%_50%_at_50%_0%,rgba(168,147,111,0.06)_0%,transparent_100%)]",
  ivory: "bg-[radial-gradient(70%_50%_at_50%_0%,rgba(168,147,111,0.06)_0%,transparent_100%)]",
};

export default function Section({ children, className, id, tone = "dark" }: SectionProps) {
  return (
    <section id={id} className={cn("relative overflow-hidden py-20 sm:py-28", tones[tone], className)}>
      {/* La lumière entre en haut de chaque section */}
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-x-0 top-0 h-56", veils[tone])}
      />
      {children}
    </section>
  );
}
