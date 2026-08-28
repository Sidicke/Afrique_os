import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  tone?: "gold" | "green" | "terracotta" | "neutral";
  className?: string;
}

const tones = {
  gold: "bg-gold-400/15 text-gold-300 border-gold-400/30",
  green: "bg-african-green/15 text-[#7fb89a] border-african-green/30",
  terracotta: "bg-terracotta/15 text-[#e0a286] border-terracotta/30",
  neutral: "bg-white/10 text-ivory-50/80 border-white/15",
};

export default function Badge({ children, tone = "gold", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium tracking-wide",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}
