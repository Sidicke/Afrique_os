import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "dark" | "light";
  className?: string;
}

export default function SectionHeading({
  eyebrow,
  title,
  description,
  align = "center",
  tone = "dark",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "relative mb-12 flex flex-col gap-4 sm:mb-16",
        align === "center" && "items-center text-center",
        className
      )}
    >
      {/* La lumière qui éclaire le titre */}
      <div
        aria-hidden="true"
        className={cn(
          "title-halo pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[min(760px,90%)] -translate-x-1/2 -translate-y-1/2",
          tone === "light" ? "opacity-60" : "opacity-90"
        )}
      />

      {eyebrow && (
        <span
          className={cn(
            "relative inline-flex items-center gap-2.5 rounded-full border px-4 py-1.5 font-mono text-xs uppercase tracking-[0.24em] backdrop-blur-sm",
            tone === "dark"
              ? "border-gold-400/30 bg-gold-400/10 text-gold-300 shadow-sm shadow-gold-400/5"
              : "border-gold-600/30 bg-gold-500/10 text-gold-600 shadow-sm"
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full animate-pulse", tone === "dark" ? "bg-gold-300" : "bg-gold-600")}
            aria-hidden="true"
          />
          {eyebrow}
        </span>
      )}

      <h2
        className={cn(
          "relative max-w-4xl font-display text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl md:text-6xl",
          tone === "dark" ? "text-ivory-50" : "text-midnight-950"
        )}
      >
        {title}
      </h2>
      {description && (
        <p
          className={cn(
            "relative max-w-2xl text-lg leading-relaxed sm:text-xl",
            align === "center" && "mx-auto",
            tone === "dark" ? "text-ivory-50/70" : "text-midnight-950/70"
          )}
        >
          {description}
        </p>
      )}
    </div>
  );
}
